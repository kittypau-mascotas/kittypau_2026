---
id: spec_hunger_bar_alertas
title: SPEC — Hunger Bar v1.1 — Alerta visual + color por estado
type: spec
status: v1.1-implementado
owner: Mauro
created: 2026-08-10
updated: 2026-08-10
tags:
  - feature
  - hunger-bar
  - alertas
  - ui
related:
  - [[05_API/SPEC_HungerBar_Alimentacion]]
  - [[05_API/README_API]]
---

# SPEC — Hunger Bar v1.1 — Alerta visual + color por estado

> Addendum sobre la v1 ya implementada (`kittypau_app/src/lib/hunger-bar.ts` +
> `/api/pets/[id]/hunger-bar` + `hunger-bar-card.tsx`). No cambia la arquitectura de
> detección (§1-2 de la spec v1) — solo agrega: (a) un flag de "atrasado" y (b) el color
> continuo de la barra. **Sin notificaciones push/WhatsApp/email** — la alerta es 100%
> visual dentro de la app, según lo decidido.

---

## 1. Regla de la alerta

**Dispara cuando pasaron ≥ 2 horas desde el momento en que la barra llegó a 0%**
(es decir, 2h después de `estimatedNextMealAt`), no 2h desde la última comida.

```
ALERT_THRESHOLD_HOURS = 2

hoursOverdue = max(0, (now - estimatedNextMealAt) en horas)
alertActive  = hoursOverdue >= ALERT_THRESHOLD_HOURS
```

- Solo aplica cuando `status == "ok"`. Si `status` es `"sin_datos"` o
  `"sin_dispositivo"`, **nunca** se activa la alerta — no hay comida detectada no es lo
  mismo que "no comió" (podría ser el dispositivo offline, sin vincular, etc.). Mostrar un
  estado neutro (gris), no rojo/alerta, en esos casos.
- Se desactiva sola apenas se detecta una comida nueva (`lastMealDetectedAt` se actualiza,
  `percentage` vuelve a 100, `estimatedNextMealAt` se recalcula) — no hace falta lógica de
  reset aparte, es una consecuencia natural del cálculo on-demand.

---

## 2. Color de la barra (continuo, no por escalones)

Gradiente continuo verde → amarillo → rojo, usando HSL, tal como se pidió: 100% = verde
puro, 50% = amarillo, 0% = rojo puro.

```
hue = clamp(percentage, 0, 100) * 1.2   // 0%→hue 0 (rojo), 50%→hue 60 (amarillo), 100%→hue 120 (verde)
color = `hsl(${hue}, 70%, 45%)`         // saturación/luminosidad a gusto de diseño, mismo hue
```

- Cuando `status != "ok"` (sin datos / sin dispositivo): color neutro fijo (gris,
  `var(--muted)` o el token gris que ya use `frontend-design`), no se calcula con la
  fórmula de arriba.
- Cuando `alertActive == true`: además del rojo que ya da la fórmula en 0%, agregar un
  tratamiento visual distinto para que se note que pasó a "alerta" y no es solo "vacía":
  - borde de la card en rojo sólido (no solo la barra interna)
  - ícono de alerta (ej. `lucide-react` `AlertTriangle`) junto al texto
  - opcional: animación sutil (pulse) en el borde — evaluar si no es demasiado ruidoso en
    `/today` donde conviven otras barras del widget "Barras Sims"

---

## 3. Contrato de API — campos nuevos

Se agregan dos campos a la respuesta ya implementada de
`GET /api/pets/:petId/hunger-bar` (no se toca nada existente):

```json
{
  "status": "ok",
  "percentage": 0,
  "lastMealDetectedAt": "2026-08-10T10:00:00Z",
  "lastMealConfidence": 0.82,
  "estimatedNextMealAt": "2026-08-10T15:47:00Z",
  "intervalUsedMinutes": 345,
  "usingFallback": false,
  "sampleSize": 5,
  "alertActive": true,
  "hoursOverdue": 2.4
}
```

- `alertActive`: boolean, calculado server-side con la regla de §1 (así el frontend no
  tiene que reimplementar la comparación de fechas, y queda consistente si se consulta
  desde `/today` y `/pet` a la vez).
- `hoursOverdue`: number, `0` si no está atrasada, `null` solo si `status != "ok"`.
- El color (§2) se calcula **client-side** a partir de `percentage` — no hace falta que el
  backend devuelva un color u hue, es derivable y así el frontend puede ajustar
  saturación/luminosidad sin tocar el endpoint.

---

## 4. UI (`hunger-bar-card.tsx`)

- Barra rellena con el color de §2, recalculado en cada render/tick (mismo mecanismo que ya
  anima la barra por tiempo, sin necesidad de repetir el fetch).
- Card completa: borde/fondo normal mientras `alertActive == false`; al pasar a `true`,
  aplicar el tratamiento de alerta descrito en §2.
- Texto de apoyo cuando `alertActive == true`, ej.: *"Bandida no ha comido en más de X
  horas"* usando `hoursOverdue` + `lastMealDetectedAt` (formateado con `lib/time/chile.ts`,
  convención de facto del proyecto).
- Estado `sin_datos` / `sin_dispositivo`: mantener el texto informativo neutro que ya tiene
  v1 (no inventar copy de alerta ahí).

---

## 5. Fuera de alcance para esta iteración (confirmado explícitamente)

- Sin notificaciones push, WhatsApp o email — pese a que `notification_channel` ya existe
  como enum del dominio (`ENUMS_OFICIALES.md`), no se usa acá. Si más adelante se quiere
  sumar, es una extensión natural de `alertActive` (disparar un envío cuando pasa de
  `false` a `true`), no un rediseño.
- Sin barra de hidratación ni indicador de batería como barra — descartado por ahora.
- Sin logging a `audit_events` tipo `alert_generated` (sigue en "Futuros" en
  `DOC_MAESTRO_DOMINIO.md`) — no es necesario para una alerta puramente visual/derivada; se
  puede sumar después si se quiere historial de cuántas veces se atrasó.

---

## 6. Implementación (2026-08-10)

| Pieza | Estado |
|---|---|
| `hunger-bar.ts` — `ALERT_THRESHOLD_HOURS`, `alertActive`/`hoursOverdue` en `computeHungerBar()` | ✅ |
| `hunger-bar-card.tsx` (`/pet`) — gradiente HSL, borde/ícono/texto de alerta | ✅ |
| `today/page.tsx` (`/today`, card "Comida") — gradiente HSL en el relleno + badge de atraso | ✅ (tratamiento liviano, no el borde/pulse completo — la card es compacta y comparte grilla con "Agua") |
| Notificaciones push/WhatsApp/email | ❌ fuera de alcance, confirmado en §5 |

---

## Ver también

- [[SPEC_HungerBar_Alimentacion]] — spec v1 (detección, fórmula, endpoint base)
- [[01_Proyecto/ENUMS_OFICIALES]] — `notification_channel`, por si se extiende a alertas
  push más adelante
