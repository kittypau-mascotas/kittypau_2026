# Contract: `POST /api/demo/ingreso` (extendido)

Registra el ingreso a la demo como lead para `/admin/demo-ingresos`. **Extiende** el endpoint
existente (`kittypau_app/src/app/api/demo/ingreso/route.ts`) para aceptar leads **sin email**,
dedupeados por `visitor_id`, con `pet_type`.

**Método**: `POST` · **Auth**: ninguna · **Rate limit**: `:demo-ingreso` 5 / 10 min por IP (sin cambios)
**Depende de**: migración `demo_ingresos_sin_email` — **checkpoint Principio III** (aplicar solo con
OK de Mauro). Ver [../data-model.md](../data-model.md) §3.

---

## Request

`Content-Type: application/json` · Body ≤ 4096 bytes (`enforceBodySize`, sin cambios).
Se envía por `navigator.sendBeacon` con fallback a `fetch({ keepalive: true })` (como hoy).

```jsonc
{
  "visitor_id": "b3f1c2a0-…",     // NUEVO — requerido. uuid del cliente (kittypau_demo_visitor_id)
  "owner_name": "Marta",           // 1..120, trim
  "pet_name": "Pelusa",            // 1..120, trim
  "pet_type": "cat",               // NUEVO en el lead — "dog" | "cat" (antes solo iba a audit_events)
  "email": "",                     // OPCIONAL ahora — "" / ausente = lead sin email
  "source": "trial_modal"          // "trial_modal" | "client_demo" | "test" | "demo_app"
}
```

### Cambios vs. hoy
| Campo | Antes | Ahora |
|---|---|---|
| `email` | requerido → `400 MISSING_EMAIL` si falta | **opcional**; si falta, se dedupea por `visitor_id` |
| `visitor_id` | no existía | **requerido** (para poder dedupear el lead anónimo) |
| `pet_type` | solo a `audit_events.payload` | también a `demo_ingresos.pet_type` |

---

## Comportamiento

1. `enforceBodySize` + `checkRateLimit(':demo-ingreso', 5, 10min)` — sin cambios.
2. Parse + trim: `owner_name`/`pet_name` (≤120), `email` (≤254, lowercase, `null` si vacío),
   `pet_type` (≤32, lowercase, `null` si no es `dog`/`cat`), `source` (≤64, default `"demo_app"`),
   `visitor_id` (uuid; si falta o inválido → `400 MISSING_VISITOR_ID`).
3. **Sin `MISSING_EMAIL`.** Si `email` es `null`, sigue.
4. `supabaseServer.rpc("record_demo_ingreso_v2", { p_visitor_id, p_email, p_owner_name, p_pet_name,
   p_pet_type, p_source })`:
   - con email → upsert `on conflict (email)` (comportamiento actual + `pet_type`, + set
     `visitor_id` si estaba null).
   - sin email → upsert `on conflict (visitor_id) where email is null`.
5. `audit_events` insert — **sin cambios** (ya guarda `owner_name`, `pet_name`, `email`, `pet_type`,
   `source`, `user_agent`, `referer`, `forwarded_for`, `recorded_at`).
6. `200 { "ok": true }`.

---

## Responses

| Código | Cuerpo | Cuándo |
|---|---|---|
| `200` | `{ "ok": true }` | lead registrado / actualizado |
| `400` | `{ "error": { "code": "INVALID_JSON", … } }` | body no parseable |
| `400` | `{ "error": { "code": "MISSING_VISITOR_ID", … } }` | falta `visitor_id` (NUEVO; reemplaza a `MISSING_EMAIL`) |
| `429` | `{ "error": { "code": "RATE_LIMITED", … } }` + `Retry-After` | rate limit |
| `500` | `{ "error": { "code": "SUPABASE_ERROR", … } }` | fallo de RPC / insert |

---

## Dedupe (SC-007)

- **Con email**: 1 fila por email (constraint `unique(email)` existente).
- **Sin email**: 1 fila por `visitor_id` entre los leads con `email is null` (índice único parcial
  nuevo). Mismo navegador que vuelve otro día → `count++`, `last_seen_at = now()`, no fila nueva.
- Si un visitante primero entra sin email y luego deja el email en el CTA "Crear cuenta": la 2a
  llamada trae `email` → crea/mergea la fila por email; la fila anónima por `visitor_id` queda
  (aceptable; `/admin` puede filtrar por `email is null`). Mejora futura: mergear ambas.

---

## Panel `/admin/demo-ingresos` (cambio de solo lectura)

- Mostrar columnas nuevas `owner_name` y `pet_type`.
- Tolerar `email` vacío/`null` (hoy la fila asume email como identificador visible) — usar
  `pet_name` / `owner_name` como etiqueta cuando no hay email.

---

## Fallback sin migración (si Mauro no aprueba el schema ahora)

El endpoint mantiene `400 MISSING_EMAIL` para leads sin email (comportamiento actual). El front
sigue mandando el beacon igual; el lead sin email se pierde hasta que el visitante deje el email en
"Crear cuenta". Anotar en `Knowledge/19_DevOps/PENDIENTES_POR_PC.md`.
