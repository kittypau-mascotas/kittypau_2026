---
id: spec_hunger_bar_alertas
title: SPEC — Hunger Bar v1.1 — Alerta visual + color por estado
type: spec
status: v1.1-implementado
owner: Mauro
created: 2026-08-10
updated: 2026-08-12
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
> continuo de la barra.
>
> ⚠️ **Actualización 2026-08-12:** este doc decía "sin notificaciones push, según lo
> decidido" (§5). Un día después, [[29_Specs/SPEC_03_Objetivos_Monitoreo]] (Pilar 3)
> recomendó exactamente lo contrario como el siguiente salto de valor del producto, y se
> implementó (ver §6) — push local vía Capacitor, agendada para `estimatedNextMealAt +
> ALERT_THRESHOLD_HOURS`, sin tocar la fórmula de v1. **No encontré el porqué original de
> "sin push" documentado en ningún otro lado** (ni ADR, ni acta de reunión) — si fue una
> decisión de UX/producto con una razón puntual que sigue vigente, avisar para revertir.

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

- ~~Sin notificaciones push~~ — implementado 2026-08-12, ver §6. WhatsApp/email siguen
  fuera de alcance; `notification_channel` (enum del dominio, `ENUMS_OFICIALES.md`) sigue
  sin usarse para esos dos canales.
- Sin barra de hidratación ni indicador de batería como barra — descartado por ahora.
- Sin logging a `audit_events` tipo `alert_generated` (sigue en "Futuros" en
  `DOC_MAESTRO_DOMINIO.md`) — no es necesario para una alerta puramente visual/derivada; se
  puede sumar después si se quiere historial de cuántas veces se atrasó.

---

## 6. Implementación (2026-08-10, notificación push agregada 2026-08-12)

| Pieza | Estado |
|---|---|
| `hunger-bar.ts` — `ALERT_THRESHOLD_HOURS`, `alertActive`/`hoursOverdue` en `computeHungerBar()` | ✅ |
| `hunger-bar-card.tsx` (`/pet`) — gradiente HSL, borde/ícono/texto de alerta | ✅ |
| `today/page.tsx` (`/today`, card "Comida") — gradiente HSL en el relleno + badge de atraso | ✅ (tratamiento liviano, no el borde/pulse completo — la card es compacta y comparte grilla con "Agua") |
| `lib/hooks/useHungerBarPushAlert.ts` — notificación push local (Capacitor) | ✅ (2026-08-12, SPEC_03 Pilar 3) |
| WhatsApp/email | ❌ fuera de alcance |

### 6.1 Notificación push local (2026-08-12)

> ✅ **Verificado en dispositivo real** el mismo día — celular Android de Mauro, vía un APK
> debug instalado manualmente (compilado con `gradlew assembleDebug`, transferido por
> WhatsApp). Sonido default del teléfono ✅. Ícono con el logo de Kittypau ✅ (segunda
> vuelta, ver más abajo — la primera versión del ícono salía descolorida).

- **No es polling** — usa `LocalNotifications.schedule({ at: alertAt })` de Capacitor:
  el SO dispara la notificación en el horario exacto aunque la app esté cerrada o en
  background. `alertAt = estimatedNextMealAt + ALERT_THRESHOLD_HOURS` — mismo umbral
  que la alerta visual, ningún número nuevo.
- **Solo nativo (APK):** `Capacitor.isNativePlatform()` gatea todo — no-op silencioso en
  web, mismo patrón que `native-thanks-notification.tsx` (que ya usaba este plugin).
- **Re-agenda, no acumula:** id numérico estable por `petId` (hash simple) — cada vez que
  `estimatedNextMealAt` cambia (nueva comida detectada corrió la barra), cancela la
  notificación anterior y agenda la nueva. Si el horario de alerta ya pasó al momento de
  calcularlo, no agenda nada (la barra visual ya cubre ese caso si el usuario abre la app).
- Se dispara desde 2 lugares — `today/page.tsx` y `hunger-bar-card.tsx` (`/pet`) — porque
  cada uno mantiene su propio fetch de `/api/pets/:id/hunger-bar` (ver
  [[04_Frontend/ESTRUCTURA_src_app]], no son el mismo estado). El id estable por mascota
  hace que sea seguro agendar desde ambos: el segundo simplemente reemplaza al primero si
  el `estimatedNextMealAt` es el mismo, y el `useRef` interno evita reagendar si ninguno
  cambió el valor.
- Lógica de agendado extraída a `scheduleHungerBarAlert()` (standalone, exportada de
  `useHungerBarPushAlert.ts`), no solo dentro del hook — reusada por un botón manual de QA
  en `/pet` (ver más abajo) y devuelve `{ok, reason}` en vez de boolean para poder
  diagnosticar en un dispositivo sin consola conectada.

**Lección real de esta verificación:** el primer intento en el celular de Mauro falló con
`"LocalNotifications" plugin is not implemented on android` — el APK que ya tenía instalado
(actualizado solo, hasta ahora, vía el `server.url` de Vercel) era de antes de que el plugin
nativo se agregara al proyecto. **El JS se actualiza solo; el código nativo (plugins,
recursos, permisos) no — necesita un APK nuevo compilado e instalado.** Ver también
[[29_Specs/SPEC_06_Mobile_APK_2026]], que nace de este mismo hallazgo.

#### Ícono de la notificación

Generado con Python/Pillow (script ad-hoc, no versionado) desde `resources/icon.jpg`
(el mismo source que usa `@capacitor/assets` para el ícono de la app):

- **`ic_stat_kittypau`** (`smallIcon`, barra de estado) — silueta blanca sobre transparente
  del lineart del logo, por threshold de luminancia (`<170` → blanco opaco, resto
  transparente). Android tiñe este ícono de un solo color siempre (no importa el color
  original), por eso alcanza con la silueta.
- **`ic_notification_kittypau`** (`largeIcon`, card expandida) — **la foto original tal
  cual, con su fondo blanco incluido**, solo recortada a cuadrado. Se intentó primero una
  versión con el fondo removido (transparente) para que se viera "flotando" dentro del
  círculo que arma Android — salió lavada/rosa pálido, sin los colores reales del logo.
  Mauro lo confirmó en su celular, se revirtió a la foto sin procesar.
- 5 densidades cada uno (`drawable-mdpi` a `drawable-xxxhdpi`), tamaños estándar Android
  (24dp para smallIcon, 64dp para largeIcon). `iconColor: "#ebb6a8"` (rosa de marca) como
  tint por defecto en `capacitor.config.ts` → `plugins.LocalNotifications`.
- Si el logo cambia, regenerar con el mismo enfoque (threshold de luminancia para el
  smallIcon, foto sin procesar para el largeIcon) — el script no quedó en el repo, pero el
  método sí queda documentado acá.

#### Botón de QA manual — pendiente de borrar

`/pet`, debajo de `HungerBarCard`: **"🔔 Probar notificación (QA — borrar después)"**.
Agenda un push a +20s usando `scheduleHungerBarAlert()` directo, sin esperar el umbral
real — se agregó porque no había forma de pasarle un query param de test a la app nativa
(no tiene barra de direcciones). **Confirmado funcionando en dispositivo real — borrar este
botón en la próxima sesión que toque `pet/page.tsx`**, ya cumplió su propósito.

---

## Ver también

- [[SPEC_HungerBar_Alimentacion]] — spec v1 (detección, fórmula, endpoint base)
- [[01_Proyecto/ENUMS_OFICIALES]] — `notification_channel`, por si se extiende a alertas
  push más adelante
