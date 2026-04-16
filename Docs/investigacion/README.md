# Pruebas KPCL

Carpeta canonica para las pruebas compartidas de `KPCL0034` y `KPCL0036`.

## Contenido

- [`SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`](SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql) - export canonico del tramo de experimento compartido.
- [`refresh_kpcl_experimento.py`](refresh_kpcl_experimento.py) - descarga historico completo desde Supabase (inicio UTC fijo `2020-01-01`) y reescribe el CSV combinado base de la carpeta.
- [`kpcl0034_full_eventos.csv`](kpcl0034_full_eventos.csv) - export dedicado de foco operacional para `KPCL0034`, con lecturas y eventos audit.
- [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv) - snapshot bruto combinado (`KPCL0034` + `KPCL0036`), con columna `evento`.
- [`kpcl0034_sin_bateria_20200101_0000utc_a_1924utc.csv`](kpcl0034_sin_bateria_20200101_0000utc_a_1924utc.csv) - export filtrado por dispositivo para `KPCL0034`, generado por `plot_kpcl_experimento.py`.
- [`kpcl0036_sin_bateria_20200101_0000utc_a_1924utc.csv`](kpcl0036_sin_bateria_20200101_0000utc_a_1924utc.csv) - export filtrado por dispositivo para `KPCL0036`, generado por `plot_kpcl_experimento.py`.
- `kpcl0036_error_peso_sinbateria.csv` (artefacto historico opcional, puede no estar versionado) - snapshot bruto del analisis de peso sin bateria.
- [`AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md`](AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md) - auditoria canonica del experimento compartido y de los hitos por device.
- [`AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md`](AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md) - auditoria canonica del historial de peso sin bateria.
- [`REGISTRO_EVENTOS_KPCL0034_2026-04-16.md`](REGISTRO_EVENTOS_KPCL0034_2026-04-16.md) - bitacora completa del backfill y listado canonico de eventos manuales `KPCL0034`.
- [`SQL_VALIDACION_KPCL0036_TARE_FILL.sql`](SQL_VALIDACION_KPCL0036_TARE_FILL.sql) - validacion canonica de tare, plato y llenado para KPCL0036.
- [`plot_kpcl_experimento.py`](plot_kpcl_experimento.py) - abre una vista interactiva en navegador con un panel para `KPCL0034` y otro para `KPCL0036`, y exporta un CSV filtrado por device con hitos manuales incluidos cuando existen en la fuente.
- [`kpcl_pruebas_eventos.html`](kpcl_pruebas_eventos.html) - salida interactiva generada por el script.

## Orden de lectura recomendado

1. [`README.md`](README.md) para entender el proposito de la carpeta.
2. [`refresh_kpcl_experimento.py`](refresh_kpcl_experimento.py) para bajar desde Supabase el historico UTC canonico con todos los eventos manuales registrados.
3. [`SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`](SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql) para ver la misma logica en SQL y exportar manualmente si hace falta.
4. [`kpcl0034_full_eventos.csv`](kpcl0034_full_eventos.csv) para revisar el foco completo de `KPCL0034` (lecturas + eventos).
5. [`kpcl0034_sin_bateria_20200101_0000utc_a_1924utc.csv`](kpcl0034_sin_bateria_20200101_0000utc_a_1924utc.csv) para revisar la corrida filtrada de `KPCL0034`.
6. [`kpcl0036_sin_bateria_20200101_0000utc_a_1924utc.csv`](kpcl0036_sin_bateria_20200101_0000utc_a_1924utc.csv) para revisar la corrida filtrada de `KPCL0036`.
7. [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv) para revisar la captura bruta del experimento combinado.
8. `kpcl0036_error_peso_sinbateria.csv` (si existe localmente) para revisar el historial bruto de peso sin tara aplicada.
9. [`AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md`](AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md) para leer el diagnostico del experimento compartido.
10. [`AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md`](AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md) para leer el diagnostico tecnico de ese CSV historico.
11. [`REGISTRO_EVENTOS_KPCL0034_2026-04-16.md`](REGISTRO_EVENTOS_KPCL0034_2026-04-16.md) para revisar la trazabilidad completa de categorias manuales de `KPCL0034`.
12. [`SQL_VALIDACION_KPCL0036_TARE_FILL.sql`](SQL_VALIDACION_KPCL0036_TARE_FILL.sql) para validar la secuencia canonica de tare y llenado.
13. [`plot_kpcl_experimento.py`](plot_kpcl_experimento.py) para abrir el grafico consolidado en navegador con dos paneles separados y notas de `evento`, incluyendo las categorias manuales del plato cuando vienen en la exportacion.

## Ejecucion rapida (local)

1. Variables locales en `kittypau_2026/.env.local`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - opcional para acceso SQL directo: `SUPABASE_DB_URL` y/o `SUPABASE_DB_POOLER_URL`
2. Actualizar CSV canonico:
   - `python refresh_kpcl_experimento.py`
3. Generar HTML usando solo CSV local (recomendado cuando falle auth SQL):
   - `FORCE_LOCAL_CSV=1 python plot_kpcl_experimento.py` (en PowerShell: `$env:FORCE_LOCAL_CSV='1'; python plot_kpcl_experimento.py`)

## Documentos de reglas y ML

- [`REGLAS_EVENTOS_ALIMENTACION.md`](REGLAS_EVENTOS_ALIMENTACION.md) â€” regla maestra canÃ³nica: quÃ© es una sesiÃ³n de alimentaciÃ³n, mapa de las 4 fuentes de detecciÃ³n del proyecto (audit_events, heurÃ­stico cliente, processor bridge, health-check) y cÃ³mo se unifican con el grÃ¡fico hero.
- [`ML_PREDICCION_ALIMENTACION.md`](ML_PREDICCION_ALIMENTACION.md) â€” especificaciÃ³n completa para entrenar un modelo supervisado que prediga `inicio_alimentacion` y `termino_alimentacion` desde la curva de peso. Incluye formulaciÃ³n del problema, features, pipeline SQL, baseline heurÃ­stico, arquitecturas sugeridas y mÃ©tricas.

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
- `manual_bowl_category` â€” originadas desde la UI (botones en Today)
- `device_power_event` â€” originadas desde el bridge (automaticas, pendiente implementar en bridge v2.x)

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

### Consumo â€” alimentacion (food_bowl / KPCL0034)
| Key canonica | Label UI |
|---|---|
| `inicio_alimentacion` | INICIO ALIMENTACION |
| `termino_alimentacion` | TERMINO ALIMENTACION |

### Consumo â€” hidratacion (water_bowl / KPCL0036)
| Key canonica | Label UI |
|---|---|
| `inicio_hidratacion` | INICIO HIDRATACION |
| `termino_hidratacion` | TERMINO HIDRATACION |

### Encendido/apagado de dispositivo (bridge-generated)
| Key canonica | Origen | Estado |
|---|---|---|
| `kpcl_prendido` | Bridge: primer STATUS tras ausencia | **Pendiente** â€” bridge aun no escribe a `audit_events` |
| `kpcl_apagado` | Bridge: heartbeat check detecta offline | **Pendiente** â€” bridge aun no escribe a `audit_events` |

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

