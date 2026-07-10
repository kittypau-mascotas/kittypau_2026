---
id: doc_maestro_dominio
title: Documento Maestro de Dominio, Estrategia y Economía
type: architecture
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - dominio
  - reglas-negocio
  - estados
  - api-contratos
  - economia
related:
  - [[00_HOME]]
  - [[01_Proyecto/README_Proyecto]]
  - [[01_Proyecto/ENUMS_OFICIALES]]
  - [[06_BaseDatos/README_BaseDatos]]
  - [[05_API/README_API]]
---

# Documento Maestro de Dominio, Estrategia y Economía

> Si algo contradice este documento, este documento gana hasta que la fuente de verdad se actualice.

---

## 1. Reglas de negocio críticas

### Usuario
- Un usuario puede tener múltiples mascotas.
- Una mascota tiene un solo propietario por ahora.
- Puede existir mascota sin dispositivo: **sí**.
- Puede existir dispositivo sin mascota: **no** (esquema actual).

### Mascota
- `name` editable.
- `type` **no editable**.
- `breeds` editable, máximo 3. `quiltro` excluyente.
- `photo_url` reemplazable (overwrite).
- `weight_kg` en rango por especie.
- Eliminar mascota = **soft delete**.
- Al crear: `pet_state = device_pending`.

### Dispositivo
- Un solo dispositivo activo por mascota.
- Reasignar dispositivo libera el anterior.
- Si se elimina mascota, el dispositivo se bloquea.
- Al vincular: `device_state = linked`.

---

## 2. Estados oficiales

### Mascota (`pet_state`)

| Estado | Descripción |
|---|---|
| `created` | Mascota creada, perfil incompleto |
| `completed_profile` | Perfil completo, sin dispositivo aún |
| `device_pending` | En proceso de vincular dispositivo |
| `device_linked` | Dispositivo vinculado y activo |
| `inactive` | Sin actividad — temporal |
| `archived` | Soft delete |

### Dispositivo (`device_state`)

| Estado | Descripción |
|---|---|
| `factory` | Recién fabricado, sin reclamar |
| `claimed` | Registrado por un usuario |
| `linked` | Vinculado a una mascota |
| `offline` | Sin comunicación |
| `lost` | Reportado como extraviado |
| `error` | Error de hardware o firmware |

---

## 3. Contratos de API clave

### Login
```json
{
  "user": { "id": "uuid", "name": "Ana" },
  "has_pets": true,
  "next_step": "pet_onboarding"
}
```

### Crear mascota
```json
{
  "pet_id": "uuid",
  "profile_completion": 0.72,
  "needs_device_link": true
}
```

### Vincular dispositivo
```json
{
  "device_uuid": "uuid",
  "device_id": "KPCL0001",
  "device_state": "linked",
  "pet_state": "device_linked"
}
```

---

## 4. Validaciones obligatorias

| Campo | Regla |
|---|---|
| `email` | Único por usuario |
| `phone_number` | Único cuando exista |
| `care_rating` | Entre 1 y 10 |
| `weight_kg` | En rango por especie |
| `breeds` | Máximo 3; `quiltro` es excluyente |

---

## 5. Eventos del sistema (`audit_events`)

### Activos
- `profile_created`
- `profile_updated`
- `pet_created`
- `device_created`
- `reading_ingested`
- `kpcl_prendido` / `kpcl_apagado` (emitidos por bridge)

### Futuros
- `pet_updated`
- `device_linked` / `device_unlinked`
- `activity_received`
- `alert_generated`

---

## 6. Onboarding y UX

**Flujo:** Usuario → Mascota → Dispositivo

- Guardar `user_onboarding_step` y `pet_onboarding_step` (progreso persistente).
- El onboarding ocurre en popup con barra de progreso.
- El progreso se conserva si el usuario cierra.
- Reabrible desde Settings.

| Step usuario | Step mascota |
|---|---|
| `not_started` | `not_started` |
| `user_profile` | `pet_type` |
| `pet_profile` | `pet_profile` |
| `device_link` | `pet_health` |
| `completed` | `pet_confirm` |

---

## 7. Estrategia de fotos

| Campo | Regla |
|---|---|
| Almacenamiento | Supabase Storage |
| Tamaño máximo | 5 MB |
| Compresión | Cliente (antes de subir) |
| Reemplazo | Overwrite (no múltiples versiones) |
| Foto por defecto | Placeholder por especie |

---

## 8. Economía del negocio

### Fórmulas clave

```
MRR = usuarios_premium × precio_mensual
ARR = MRR × 12
LTV = ARPU × (1 / churn)
LTV/CAC = LTV / CAC                  ← objetivo > 3

costo_unitario_kit = BOM + manufactura + overhead_unitario
overhead_unitario  = costos_mensuales_totales / unidades_mes
break_even         = costos_fijos_mensuales / margen_unitario
valor_saas         = ARR × multiplo_saas
```

### Regla ejecutiva
- `LTV/CAC > 3` — objetivo operacional mínimo.
- Crecimiento sano: churn bajo + retención alta.

### Fuentes de datos económicos (tablas Supabase)
- `finance_purchases` — compras reales de componentes
- `finance_kit_components` — BOM
- `finance_provider_plans` — costos cloud (Supabase, Vercel, HiveMQ)
- `finance_monthly_snapshots` — snapshot mensual
- `finance_kpcl_profiles` / `finance_kpcl_profile_components` — manufactura

---

## 9. Permisos y seguridad

- Cada usuario ve **solo** sus mascotas, dispositivos y lecturas (RLS en Supabase).
- Tokens con expiración según Supabase.
- Fase futura: cuidadores con permisos limitados.

---

## 10. Implicancias para App/Web

1. `/today` y `navbar` deben mantener consistencia entre mascota activa, `pet_id` y KPCL.
2. La UI debe reforzar lectura rápida del estado real.
3. El backlog prioriza **confiabilidad de datos sobre efectos visuales**.
4. Cualquier expansión debe reutilizar componentes del core.

---

## Ver también

- [[01_Proyecto/ENUMS_OFICIALES]] — lista completa de valores permitidos
- [[06_BaseDatos/README_BaseDatos]] — tablas donde estos estados se persisten
- [[05_API/README_API]] — endpoints que implementan estos contratos
- [[21_Roadmap/README_Estrategia_Mercado]] — modelo de negocio y KPIs comerciales
