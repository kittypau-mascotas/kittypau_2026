# Data Model: Widget de Android — mini-hero de la mascota

**Input**: [spec.md](spec.md) Key Entities · [research.md](research.md) Decisiones 3, 4, 6

Este feature no crea tablas nuevas en Supabase — reusa `pets`, `readings`, `push_tokens`
(existentes) y agrega solo persistencia **local al dispositivo Android**. Las entidades de
abajo son conceptuales (spec) y su representación técnica concreta (decidida acá).

---

## 1. Configuración del widget (por instancia)

Qué mascota muestra cada widget colocado en un home screen (spec FR-013, Key Entities).

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| `appWidgetId` | `Int` | Lo asigna Android al bindear el widget | Clave primaria de facto — cada instancia colocada tiene un id distinto, incluso si son dos widgets de la misma mascota. |
| `petId` | `String` (UUID) | Elegido por el dueño en `WidgetPetConfigActivity` (Decisión 2) | Se resuelve contra `GET /api/pets` — mismas mascotas que ya lista `/today`. |
| `petName`, `petPhotoUrl` | `String` | Copiados de `GET /api/pets` al configurar | Cacheados localmente para poder pintar el widget sin depender de un fetch adicional solo para el nombre/foto. |

**Persistencia**: `SharedPreferences` estándar de Android, una entrada por `appWidgetId`
(patrón recomendado por la propia guía de `AppWidgetProvider` para configuration Activities —
no requiere una base de datos local). Se limpia en `onDeleted(appWidgetId)` del
`AppWidgetProvider`/`GlanceAppWidgetReceiver` cuando el dueño quita el widget del home screen
(Edge Case: "si lo quita y lo vuelve a agregar, debe volver a pasar por la selección" — al no
persistir nada tras `onDeleted`, un nuevo bind es una configuración nueva de cero, cumple el
edge case sin lógica extra).

**Validación**: `petId` DEBE pertenecer al usuario autenticado en el momento de configurar —
reusa el mismo chequeo de ownership que ya hace `hunger-bar/route.ts` (línea 41: `pet.user_id
!== user.id → 403`); si el fetch a `GET /api/pets` durante la configuración no devuelve esa
mascota, no se puede completar el alta.

---

## 2. Snapshot de alimentación (leído, no almacenado como fuente de verdad)

Mismo dato que ya expone `/today` — el widget lo **lee**, no lo recalcula (research.md,
Decisión 3).

| Campo | Tipo | Fuente | Regla |
|---|---|---|---|
| `percentage` | `number \| null` | `GET /api/pets/:id/hunger-bar` (ya existe) | `null` → FR-016, "sin dispositivo asignado". |
| `mealsToday` | `number \| null` | `hunger-bar.kpis.mealsToday` (ya existe) | Círculo de comida (FR-005). `0` es un valor real y honesto, no "sin dato" (Acceptance Scenario 3 de User Story 1). |
| `lastMealDetectedAt` | `string (ISO) \| null` | `hunger-bar.lastMealDetectedAt` (ya existe) | `null` → texto "sin registro hoy" (FR-007), nunca una hora inventada. |

---

## 3. Snapshot de hidratación (dato nuevo a exponer — research.md Decisión 3)

| Campo | Tipo | Fuente | Regla |
|---|---|---|---|
| `percentage` | `number \| null` | **Nuevo**: extraído de la lógica hoy client-side en `today-screen.tsx` (`waterContentWeightGrams / waterMaxServedContentMl`), portado a `hunger-bar-server.ts` | Barra de agua (FR-004). |
| `hasEvidence` | `boolean` | **Nuevo**, mismo criterio que ya usa `waterWellness.hasEvidence` en `today-screen.tsx` | Determina si el círculo de agua tiene evidencia real detrás o no — no determina un número (nunca lo hay, FR-006), pero sí puede atenuar el ícono si no hay evidencia, igual que el hero real. |
| `lastEventLabel` / `lastEventAt` | `string \| string (ISO) \| null` | **Nuevo**, mismo dato que ya calcula `waterWellness.lastEventLabel` | FR-008: texto pequeño de "última agua". `null`/"sin registro" si no hay evento confirmado — nunca inventado. |

**Nota de contrato**: estos tres campos viajan dentro de un objeto `water` nuevo agregado a la
respuesta existente de `GET /api/pets/:id/hunger-bar` (ver [contracts/](contracts/)) — no es un
endpoint nuevo.

---

## 4. Estado de sesión del widget

No es una entidad persistida — es el resultado de cada intento de refresco (research.md,
Decisión 6), consumido inmediatamente para decidir qué pintar:

| Estado | Cuándo | Efecto (FR-010 / FR-014) |
|---|---|---|
| `Autenticado` | Refresh token vigente, `hunger-bar` responde 200 | Pinta el snapshot real. |
| `SinConexión` | Timeout/sin red, o la API responde 5xx | Mantiene el último snapshot cacheado (§5) sin cambiar de estado. |
| `SesiónInválida` | El canje de refresh token falla (`invalid_grant`) | Limpia el snapshot cacheado, pinta el estado neutro "Iniciá sesión". |

---

## 5. Caché local del último snapshot conocido

Requerido por FR-010 ("seguir mostrando el último dato conocido cuando no puede refrescar").

| Campo | Tipo | Notas |
|---|---|---|
| `lastKnownSnapshot` (comida + agua, campos de §2/§3) | JSON serializado | Por `appWidgetId`, junto a la configuración (§1) — mismo mecanismo de `SharedPreferences`, no una tabla nueva. |
| `lastFetchedAt` | `String (ISO)` | Solo para telemetría/depuración local; el spec no pide mostrar "hace cuánto" (fuera de alcance, no está en los FR). |

---

## Relaciones

```
Cuenta (Supabase auth.users)
  └─ tiene 1..N Mascotas (pets)
        └─ tiene 0..1 dispositivo de comida activo (resolveFoodDevice, ya existe)
        └─ tiene 0..1 dispositivo de agua activo (resolveWaterDevice, nuevo — research.md Decisión 3)

Widget instalado (appWidgetId, gestionado por Android)
  └─ apunta a exactamente 1 Mascota (petId) — Configuración del widget, §1
  └─ cachea 0..1 Snapshot de alimentación + hidratación — §5
```

Una misma mascota puede tener 0, 1 o varios widgets apuntándola (SC-006, "un widget por cada
una"); un widget siempre apunta a exactamente una mascota, elegida al agregarlo.
