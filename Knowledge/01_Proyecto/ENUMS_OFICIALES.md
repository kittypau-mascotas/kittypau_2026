---
id: enums_oficiales
title: Enums Oficiales — Valores Permitidos
type: architecture
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - enums
  - dominio
  - frontend
  - backend
  - contrato
related:
  - [[00_HOME]]
  - [[01_Proyecto/DOC_MAESTRO_DOMINIO]]
  - [[01_Proyecto/README_Proyecto]]
  - [[06_BaseDatos/README_BaseDatos]]
---

# Enums Oficiales — Valores Permitidos

> Fuente única de verdad para valores permitidos en frontend, backend y base de datos.  
> El frontend **no debe inventar valores** fuera de estas listas.  
> Verificado contra `Docs/01_Arquitectura/ENUMS_OFICIALES.md` y `SQL_SCHEMA.sql`.

---

## Usuario / Perfil

| Enum | Valores permitidos |
|---|---|
| `auth_provider` | `google` \| `apple` \| `email` |
| `notification_channel` | `app` \| `whatsapp` \| `email` \| `whatsapp_email` |

---

## Mascota

| Enum | Valores permitidos |
|---|---|
| `type` | `cat` \| `dog` |
| `origin` | `comprado` \| `rescatado` \| `llego_solo` \| `regalado` |
| `living_environment` | `departamento` \| `casa` \| `patio` \| `exterior` |
| `size` | `pequeno` \| `mediano` \| `grande` \| `gigante` |
| `age_range` | `cachorro` \| `adulto` \| `senior` |
| `activity_level` | `bajo` \| `normal` \| `activo` \| `muy_activo` |
| `alone_time` | `casi_nunca` \| `algunas_horas` \| `medio_dia` \| `todo_el_dia` |
| `pet_state` | `created` \| `completed_profile` \| `device_pending` \| `device_linked` \| `inactive` \| `archived` |

---

## Dispositivo

| Enum | Valores permitidos |
|---|---|
| `device_type` | `food_bowl` \| `water_bowl` |
| `device_state` | `factory` \| `claimed` \| `linked` \| `offline` \| `lost` \| `error` |
| `status` | `active` \| `inactive` \| `maintenance` |
| `battery_state` | `battery_only` \| `charging` \| `charged` |

---

## Onboarding

| Enum | Valores permitidos |
|---|---|
| `user_onboarding_step` | `not_started` \| `user_profile` \| `pet_profile` \| `device_link` \| `completed` |
| `pet_onboarding_step` | `not_started` \| `pet_type` \| `pet_profile` \| `pet_health` \| `pet_confirm` |

---

## Salud de la mascota

| Enum | Valores permitidos |
|---|---|
| `has_health_condition` | `true` \| `false` |
| `has_neuter_tattoo` | `true` \| `false` |
| `has_microchip` | `true` \| `false` |

---

## Pipeline IoT / Anotación

| Enum | Valores permitidos |
|---|---|
| `categoria_anotacion` | `alimentacion` \| `servido` \| `ruido` \| `ciclo_servido_alimento` |
| `tipo_candidato` | `bajada` \| `subida` \| `mixto` |
| `sensor_health` | `OK` \| `ERR_HX711` \| `ERR_DHT` \| `Initializing` |
| `light_condition` | `dark` \| `dim` \| `normal` \| `bright` |

---

## Sesiones de bowl (analytics)

| Enum | Valores permitidos |
|---|---|
| `session_type` | `alimentacion` \| `servido` \| `hidratacion` |
| `is_valid` | `true` \| `false` |

---

## Ver también

- [[01_Proyecto/DOC_MAESTRO_DOMINIO]] — reglas de negocio que usan estos enums
- [[06_BaseDatos/README_BaseDatos]] — tablas donde se persisten
- [[24_Glosario/README_Glosario]] — definiciones del dominio
