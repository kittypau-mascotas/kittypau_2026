# Enums Oficiales (Kittypau)

## Objetivo
Fuente unica de verdad para valores permitidos en frontend y backend.

---

## Usuario / Perfil
- `auth_provider`: `google` | `apple` | `email`
- `notification_channel`: `app` | `whatsapp` | `email` | `whatsapp_email`

---

## Mascota
- `type`: `cat` | `dog`
- `origin`: `comprado` | `rescatado` | `llego_solo` | `regalado`
- `living_environment`: `departamento` | `casa` | `patio` | `exterior`
- `size`: `pequeno` | `mediano` | `grande` | `gigante`
- `age_range`: `cachorro` | `adulto` | `senior`
- `activity_level`: `bajo` | `normal` | `activo` | `muy_activo`
- `alone_time`: `casi_nunca` | `algunas_horas` | `medio_dia` | `todo_el_dia`
- `pet_state`: `created` | `completed_profile` | `device_pending` | `device_linked` | `inactive` | `archived`

---

## Dispositivo
- `device_type`: `food_bowl` | `water_bowl`
- `device_state`: `factory` | `claimed` | `linked` | `offline` | `lost` | `error`
- `status`: `active` | `inactive` | `maintenance`

---

## Onboarding
- `user_onboarding_step`: `not_started` | `user_profile` | `pet_profile` | `device_link` | `completed`
- `pet_onboarding_step`: `not_started` | `pet_type` | `pet_profile` | `pet_health` | `pet_confirm`

---

## Salud
- `has_health_condition`: `true` | `false`
- `has_neuter_tattoo`: `true` | `false`
- `has_microchip`: `true` | `false`
