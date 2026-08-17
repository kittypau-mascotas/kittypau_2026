---
tags: [kittypau, ciclo-alpha-v2, moc, indice, hidratacion, agua]
fecha_creacion: 2026-08-13
fecha_actualizacion: 2026-08-13
estado: activo
---

# Ciclo Alpha v2 — Hidratación (Índice)

> Réplica de la línea de investigación de comida ([[av2_00_INDICE_AV2]]) para el bebedero
> inteligente **KPCL0036**. Fuente de verdad del diseño y las decisiones:
> [[29_Specs/SPEC_07_Investigacion_Hidratacion]] — este documento es solo el mapa de
> artefactos generados, no duplica ese contenido.

---

## Qué es distinto de comida

- **Dispositivo:** KPCL0036 (bebedero), no KPCL0034 (comedero). UUID `3c1c6705-636d-4770-bdcf-21aa6f7225a5`.
- **Datos:** carpeta propia `fase_0_ruido/data_agua/`, separada 100% de `fase_0_ruido/data/` (comida). Nunca se mezclan.
- **Categorías de anotación:** `hidratacion` / `servido` / `ruido` (+ artefacto `ciclos_servido_hidratacion.csv`) — mismo esquema que comida, nombres propios.
- **Código:** el mismo `app_anotacion_av2.py` / `01_genera_candidatos.py` / `revisar_anotaciones_v2.py` de comida, parametrizados por `DEVICE_PROFILES` (ver SPEC_07 §5). No hay app duplicada.
- **Física del sensor:** dinámica de peso distinta (evaporación, lametones vs. mordidas, sin doble rampa) — ver SPEC_07 §3 para la transferibilidad del Motor Matemático v2 (clasificación 🟢🟡🔴 por familia de features).

## Estado del roadmap (ver SPEC_07 §7 para el detalle completo)

| Paso | Descripción | Estado |
|---|---|---|
| 1 | Investigación + identidad de KPCL0036 confirmada | ✅ Hecho 2026-08-13 |
| 2 | Parametrizar los 3 scripts vía `DEVICE_PROFILES` (perfil único KPCL0034, cero cambio de comportamiento) | ✅ Hecho 2026-08-13 |
| 3 | Agregar perfil KPCL0036: generar `candidatos_agua.csv` real, dejar `app_anotacion_av2.py` con el perfil agua **inerte** (no seleccionable — bloqueado por la indirección de nombres de `CATEGORIAS`, ver SPEC_07 §5.1) | 🚧 En curso 2026-08-13 |
| 4+ | Resolver indirección de `CATEGORIAS`, activar selector de perfil en la UI, anotar a mano, calibrar `umbrales_agua.json` | ⏳ Pendiente |

## Artefactos generados hasta ahora

| Archivo | Ruta | Generado por | Contenido |
|---|---|---|---|
| `candidatos_agua.csv` | `fase_0_ruido/data_agua/` | `01_genera_candidatos.py` (`KITTYPAU_DEVICE_PROFILE=KPCL0036`) | 393 candidatos (223 bajada, 159 subida, 11 mixto) |
| `umbrales_agua.json` | `fase_0_ruido/config/` | Placeholder manual | Sin calibrar — copia de `umbrales.json` (comida) como punto de partida |
| `anotaciones_agua.csv` | `fase_0_ruido/data_agua/` | App — save/delete | Aún no existe (pendiente anotación manual) |
| `features_anotaciones_agua.csv`, `comp_stats_agua.json` | `fase_0_ruido/data_agua/` | `revisar_anotaciones_v2.py` (perfil agua) | Aún no generados — requieren anotaciones primero |

---

## Ver también

- [[29_Specs/SPEC_07_Investigacion_Hidratacion]] — spec completo: hallazgos, arquitectura, roadmap
- [[av2_00_INDICE_AV2]] — línea de investigación de comida (KPCL0034), no mezclar datos
- [[09_Sensores/README_Sensores]] — identidad de dispositivos
- [[10_Datasets/README_Datasets]] — datasets de comida + nota de resolución KPCL0036
