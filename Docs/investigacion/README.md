# Pruebas KPCL

Carpeta canonica para las pruebas compartidas de `KPCL0034` y `KPCL0036`.

## Contenido

- [`SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`](SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql) - export canonico del tramo de experimento compartido, desde UTC `2026-04-04 00:00` hasta el ultimo timestamp disponible.
- [`refresh_kpcl_experimento.py`](refresh_kpcl_experimento.py) - descarga el tramo canonico desde Supabase y reescribe el CSV combinado base de la carpeta.
- [`kpcl0034_sin_bateria_20260404_0000utc_a_2118utc.csv`](kpcl0034_sin_bateria_20260404_0000utc_a_2118utc.csv) - export filtrado por dispositivo para `KPCL0034`, con columna `evento`.
- [`kpcl0036_sin_bateria_20260404_0000utc_a_2118utc.csv`](kpcl0036_sin_bateria_20260404_0000utc_a_2118utc.csv) - export filtrado por dispositivo para `KPCL0036`, con columna `evento`.
- [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv) - snapshot bruto del experimento compartido, con columna `evento`.
- [`kpcl0036_error_peso_sinbateria.csv`](kpcl0036_error_peso_sinbateria.csv) - snapshot bruto historico del analisis de peso sin bateria, con columna `evento`.
- [`AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md`](AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md) - auditoria canonica del experimento compartido y de los hitos por device.
- [`AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md`](AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md) - auditoria canonica del historial de peso sin bateria.
- [`REGISTRO_EVENTOS_KPCL0034_2026-04-16.md`](REGISTRO_EVENTOS_KPCL0034_2026-04-16.md) - bitacora completa del backfill y listado canonico de eventos manuales `KPCL0034`.
- [`SQL_VALIDACION_KPCL0036_TARE_FILL.sql`](SQL_VALIDACION_KPCL0036_TARE_FILL.sql) - validacion canonica de tare, plato y llenado para KPCL0036.
- [`plot_kpcl_experimento.py`](plot_kpcl_experimento.py) - abre una vista interactiva en navegador con un panel para `KPCL0034` y otro para `KPCL0036`, y exporta un CSV filtrado por device con hitos manuales incluidos cuando existen en la fuente.
- [`kpcl_pruebas_eventos.html`](kpcl_pruebas_eventos.html) - salida interactiva generada por el script.

## Orden de lectura recomendado

1. [`README.md`](README.md) para entender el proposito de la carpeta.
2. [`refresh_kpcl_experimento.py`](refresh_kpcl_experimento.py) para bajar desde Supabase el tramo UTC canonico con todos los eventos manuales registrados.
3. [`SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`](SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql) para ver la misma logica en SQL y exportar manualmente si hace falta.
4. [`kpcl0034_sin_bateria_20260404_0000utc_a_2118utc.csv`](kpcl0034_sin_bateria_20260404_0000utc_a_2118utc.csv) para revisar la corrida filtrada de `KPCL0034`.
5. [`kpcl0036_sin_bateria_20260404_0000utc_a_2118utc.csv`](kpcl0036_sin_bateria_20260404_0000utc_a_2118utc.csv) para revisar la corrida filtrada de `KPCL0036`.
6. [`AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md`](AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md) para leer el diagnostico del experimento compartido.
7. [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv) para revisar la captura bruta del experimento sin cargador.
8. [`kpcl0036_error_peso_sinbateria.csv`](kpcl0036_error_peso_sinbateria.csv) para revisar el historial bruto de peso sin tara aplicada.
9. [`AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md`](AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md) para leer el diagnostico tecnico de ese CSV historico.
10. [`REGISTRO_EVENTOS_KPCL0034_2026-04-16.md`](REGISTRO_EVENTOS_KPCL0034_2026-04-16.md) para revisar la trazabilidad completa de categorias manuales de `KPCL0034`.
11. [`SQL_VALIDACION_KPCL0036_TARE_FILL.sql`](SQL_VALIDACION_KPCL0036_TARE_FILL.sql) para validar la secuencia canonica de tare y llenado.
12. [`plot_kpcl_experimento.py`](plot_kpcl_experimento.py) para abrir el grafico consolidado en navegador con dos paneles separados y notas de `evento`, incluyendo las categorias manuales del plato cuando vienen en la exportacion.

## Documentos de reglas y ML

- [`REGLAS_EVENTOS_ALIMENTACION.md`](REGLAS_EVENTOS_ALIMENTACION.md) — regla maestra canónica: qué es una sesión de alimentación, mapa de las 4 fuentes de detección del proyecto (audit_events, heurístico cliente, processor bridge, health-check) y cómo se unifican con el gráfico hero.
- [`ML_PREDICCION_ALIMENTACION.md`](ML_PREDICCION_ALIMENTACION.md) — especificación completa para entrenar un modelo supervisado que prediga `inicio_alimentacion` y `termino_alimentacion` desde la curva de peso. Incluye formulación del problema, features, pipeline SQL, baseline heurístico, arquitecturas sugeridas y métricas.

## Regla de uso

- Esta carpeta se usa para consolidar los artefactos de prueba y auditoria de peso/bateria de los KPCL.
- Cuando aparezca una nueva corrida, se guarda aqui con el formato `kpclXXXX_<experimento>_<fecha>.csv`.
- Si aparece un nuevo CSV o una nueva corrida compartida, se documenta aqui antes de referenciarla desde `Docs/` raiz.
- Los graficos y exportaciones se generan en UTC.

## Fuente de verdad y flujo

- Fuente real: `public.audit_events` (eventos) + `public.readings` (telemetria).
- Eventos manuales por UI: `kittypau_app/src/app/api/devices/[id]/category/route.ts`.
- Backfill de eventos manuales: `Docs/investigacion/backfill_kpcl_manual_events.py`.
- Export canonico desde Supabase: `Docs/investigacion/refresh_kpcl_experimento.py`.
- SQL canonico equivalente: `Docs/investigacion/SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`.
- Grafico y CSV por device: `Docs/investigacion/plot_kpcl_experimento.py`.

## Taxonomia canonica de categorias

Todas las categorias se registran en `public.audit_events` con `event_type`:
- `manual_bowl_category` — originadas desde la UI (botones en Today)
- `device_power_event` — originadas desde el bridge (automaticas, pendiente implementar en bridge v2.x)

### Setup de dispositivo (ambos tipos de bowl)
| Key canonica | Label UI | Comportamiento |
|---|---|---|
| `kpcl_sin_plato` | KPCL SIN PLATO | Snapshot de peso vacio del bowl |
| `kpcl_con_plato` | KPCL CON PLATO | Calcula `plate_weight_grams = con_plato - sin_plato` y actualiza `devices` |
| `tare_con_plato` | TARE CON PLATO | Tara el contenido a 0 (no altera `plate_weight_grams`) |

### Servido (ambos tipos de bowl)
| Key canonica | Label UI |
|---|---|
| `inicio_servido` | INICIO SERVIDO |
| `termino_servido` | TERMINO SERVIDO |

### Consumo — alimentacion (food_bowl / KPCL0034)
| Key canonica | Label UI |
|---|---|
| `inicio_alimentacion` | INICIO ALIMENTACION |
| `termino_alimentacion` | TERMINO ALIMENTACION |

### Consumo — hidratacion (water_bowl / KPCL0036)
| Key canonica | Label UI |
|---|---|
| `inicio_hidratacion` | INICIO HIDRATACION |
| `termino_hidratacion` | TERMINO HIDRATACION |

### Encendido/apagado de dispositivo (bridge-generated)
| Key canonica | Origen | Estado |
|---|---|---|
| `kpcl_prendido` | Bridge: primer STATUS tras ausencia | **Pendiente** — bridge aun no escribe a `audit_events` |
| `kpcl_apagado` | Bridge: heartbeat check detecta offline | **Pendiente** — bridge aun no escribe a `audit_events` |

Nota: actualmente el bridge solo actualiza `devices.last_seen` y `devices.device_state`.
El registro en `audit_events` con `event_type = 'device_power_event'` debe implementarse
en `bridge/src/index.js` (`handleStatusData` + heartbeat check).

### Aliases legacy (solo para trazabilidad historica)
Estos nombres aparecen en auditorias y CSVs anteriores a 2026-04-07. No usar en codigo nuevo.

| Alias legacy | Key canonica actual |
|---|---|
| `tare_record` | `tare_con_plato` |
| `food_fill_start` | `inicio_servido` |
| `food_fill_end` | `termino_servido` |
| `plate_weight` | campo `devices.plate_weight_grams` (no es categoria) |
| `manual_food_amount` | no implementado |
| `plate_observation` | no implementado |
