# Contrato: extensión de `GET /api/pets/:id/hunger-bar`

**Input**: [research.md](../research.md) Decisión 3 · archivo real:
`kittypau_app/src/app/api/pets/[id]/hunger-bar/route.ts`

No es un endpoint nuevo — es un campo `water` agregado a la respuesta existente. Todo lo demás
del contrato actual (auth, ownership, códigos de error, cache headers) se mantiene sin cambios.

## Request

Sin cambios respecto al comportamiento actual:

```
GET /api/pets/:id/hunger-bar
Authorization: Bearer <access_token>
```

## Response 200 — forma actual + campo nuevo

```jsonc
{
  // --- Campos ya existentes, sin cambios ---
  "status": "ok" | "sin_dispositivo",
  "percentage": number | null,
  "lastMealDetectedAt": string | null,
  "lastMealConfidence": number | null,
  "lastMealIsProvisional": boolean,
  "estimatedNextMealAt": string | null,
  "intervalUsedMinutes": number | null,
  "usingFallback": boolean,
  "sampleSize": number,
  "alertActive": boolean,
  "hoursOverdue": number | null,
  "events": [...],
  "kpis": { "mealsToday": number, /* resto sin cambios */ } | null,

  // --- Campo nuevo (research.md Decisión 3) ---
  "water": {
    "status": "ok" | "sin_dispositivo",
    "percentage": number | null,
    "hasEvidence": boolean,
    "lastEventLabel": string | null,
    "lastEventAt": string | null
  }
}
```

### Reglas del objeto `water`

- **MUST** calcularse server-side con la misma fórmula que hoy usa `today-screen.tsx`
  (`waterContentWeightGrams / waterMaxServedContentMl`, tope en 1.0) — no una aproximación
  nueva. Ver [data-model.md](../data-model.md) §3.
- **MUST** devolver `status: "sin_dispositivo"` (con el resto de los campos de `water` en
  `null`/`false`) cuando la mascota no tiene bebedero activo vinculado — mismo criterio que ya
  usa el objeto raíz para el dispositivo de comida (líneas 57-73 del archivo actual).
- **MUST NOT** incluir un conteo de "veces que tomó agua" en ningún campo — FR-006/FR-015, no
  existe ese dato de forma confirmada (ver spec.md, Pregunta 1).
- `lastEventAt`/`lastEventLabel` **MUST** ser `null`/"sin registro" cuando no hay evento
  confirmado — nunca una hora inventada (FR-008, FR-015).

### Errores

Sin cambios — `401 AUTH_INVALID`, `403 FORBIDDEN`, `404 PET_NOT_FOUND`, `500 SUPABASE_ERROR`
se mantienen exactamente como hoy (líneas 26-42, 49-56 del archivo actual). El
`WidgetRefreshWorker` nativo distingue `401` (sesión inválida, research.md Decisión 6) de
cualquier otro fallo (sin conexión / error transitorio).

## Consumidores

| Consumidor | Cambio |
|---|---|
| `today-screen.tsx` (web/APK WebView) | Ninguno obligatorio — puede seguir calculando `water` client-side como hoy, o migrar a leer el campo nuevo en una tarea de limpieza aparte (fuera de alcance de este feature, no forzar el cambio de un componente que ya funciona — Ponytail, cambios quirúrgicos). |
| `WidgetRefreshWorker` (Kotlin, nuevo) | Único consumidor nuevo real de este campo. |

## Testing

Extiende `kittypau_app/src/app/api/pets/[id]/hunger-bar/route.test.ts` (ya existe) con casos
para `water.status: "sin_dispositivo"`, `water.hasEvidence: false` sin evento, y el caso normal
con evento confirmado — mismo patrón de tests ya usado ahí para el objeto de comida.
