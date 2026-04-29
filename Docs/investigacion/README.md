# Investigacion Kittypau

Carpeta canonica para consolidar dos lineas de trabajo:

- pruebas operativas y dashboard de `KPCL0034` / `KPCL0036`
- pipeline de `Data Science` para extraccion, dataset y modelos

## Contenido principal

- [`SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`](SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql) - export canonico del tramo de experimento compartido.
- [`refresh_kpcl_experimento.py`](refresh_kpcl_experimento.py) - descarga historico completo desde Supabase (inicio UTC fijo `2020-01-01`) y reescribe el CSV combinado base de la carpeta.
- [`kpcl0034_full_eventos.csv`](kpcl0034_full_eventos.csv) - export dedicado de foco operacional para `KPCL0034`, con lecturas y eventos audit.
- [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv) - snapshot bruto combinado (`KPCL0034` + `KPCL0036`), con columna `evento`.
- [`kpcl0034_sin_batera_20200101_0000utc_a_1924utc.csv`](kpcl0034_sin_batera_20200101_0000utc_a_1924utc.csv) - export filtrado por dispositivo para `KPCL0034`, generado por `plot_kpcl_experimento.py`.
- [`kpcl0036_sin_batera_20200101_0000utc_a_1924utc.csv`](kpcl0036_sin_batera_20200101_0000utc_a_1924utc.csv) - export filtrado por dispositivo para `KPCL0036`, generado por `plot_kpcl_experimento.py`.
- [`AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md`](AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md) - auditoria canonica del experimento compartido y de los hitos por device.
- [`AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md`](AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md) - auditoria canonica del historial de peso sin batera.
- [`REGISTRO_EVENTOS_KPCL0034_2026-04-16.md`](REGISTRO_EVENTOS_KPCL0034_2026-04-16.md) - bitacora completa del backfill y listado canonico de eventos manuales `KPCL0034`.
- [`SQL_VALIDACION_KPCL0036_TARE_FILL.sql`](SQL_VALIDACION_KPCL0036_TARE_FILL.sql) - vlidacion canonica de tare, plato y llenado para KPCL0036.
- [`plot_kpcl_experimento.py`](plot_kpcl_experimento.py) - abre una vista interactiva en navegador con un panel para `KPCL0034` y otro para `KPCL0036`, y exporta un CSV filtrado por device con hitos manuales incluidos cuando existen en la fuente.
- [`kpcl_pruebas_eventos.html`](kpcl_pruebas_eventos.html) - salida interactiva generada por el script.
- [`serve_kpcl_dashboard.py`](serve_kpcl_dashboard.py) - servidor local con endpoint `/refresh` para actualizar CSV + visualizacion desde la fuente oficial.
- [`GUIA_DASHBOARD_KPCL.md`](GUIA_DASHBOARD_KPCL.md) - guia operativa completa para abrir el servidor, usar el HTML y entender todas las funciones del grafico.
- [`abrir_kpcl_dashboard.ps1`](abrir_kpcl_dashboard.ps1) - lanzador de un solo comando que levanta el servidor en segundo plano con `python.exe` oculto, refresca la data si ya esta lista y abre el HTML del grafico.
- [`Data Science/README.md`](Data%20Science/README.md) - indice del pipeline de ML, fases y estructura del entrenamiento.
- [`Data Science/Reporte_Experimentos_Fase3.md`](Data%20Science/Reporte_Experimentos_Fase3.md) - reporte maestro de los cuatro experimentos de Fase 3.
- [`Data Science/Resumen_Experimentos_Fase3.md`](Data%20Science/Resumen_Experimentos_Fase3.md) - resumen ejecutivo comparativo.
- [`Data Science/Preparacion_Nueva_Ingesta_Fase3.md`](Data%20Science/Preparacion_Nueva_Ingesta_Fase3.md) - checklist para una nueva ingesta de datos.
- El arranque oficial espera `GET /health` antes de abrir `http://127.0.0.1:8765/?autoload=1` para evitar `ERR_EMPTY_RESPONSE`.

## Abrir el grafico

Para ver y marcar las curvas de `alimentacion` y `servido`, usa este flujo:

1. Abre una terminal en la raiz del repo.
2. Ejecuta `.\Docs\investigacion\abrir_kpcl_dashboard.ps1`.
3. El script levanta `serve_kpcl_dashboard.py` en segundo plano.
4. Espera a que el servidor responda `http://127.0.0.1:8765/health`.
5. El HTML se abre en `http://127.0.0.1:8765/?autoload=1`.
6. En el panel de `KPCL0034` veras la curva de peso y las bandas de `alimentacion` y `servido`.
7. Si quieres abrirlo manualmente, puedes ejecutar `python Docs/investigacion/serve_kpcl_dashboard.py` y luego entrar a `http://127.0.0.1:8765/`.

## Orden de lectura recomendado

1. [`GUIA_DASHBOARD_KPCL.md`](GUIA_DASHBOARD_KPCL.md) para seguir el paso a paso exacto de apertura y uso del dashboard.
2. [`README.md`](README.md) para entender el proposito de la carpeta.
3. [`refresh_kpcl_experimento.py`](refresh_kpcl_experimento.py) para bajar desde Supabase el historico UTC canonico con todos los eventos manuales registrados.
4. [`SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`](SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql) para ver la misma lgica en SQL y exportar manualmente si hace falta.
5. [`kpcl0034_full_eventos.csv`](kpcl0034_full_eventos.csv) para revisar el foco completo de `KPCL0034` (lecturas + eventos).
6. [`kpcl0034_sin_batera_20200101_0000utc_a_1924utc.csv`](kpcl0034_sin_batera_20200101_0000utc_a_1924utc.csv) para revisar la corrida filtrada de `KPCL0034`.
7. [`kpcl0036_sin_batera_20200101_0000utc_a_1924utc.csv`](kpcl0036_sin_batera_20200101_0000utc_a_1924utc.csv) para revisar la corrida filtrada de `KPCL0036`.
8. [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv) para revisar la captura bruta del experimento combinado.
9. Historial bruto de peso sin tara de KPCL0036: artefacto histórico retirado del flujo vigente.
10. [`AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md`](AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md) para leer el diagnostico del experimento compartido.
11. [`AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md`](AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md) para leer el diagnostico tecnico de ese CSV historico.
12. [`REGISTRO_EVENTOS_KPCL0034_2026-04-16.md`](REGISTRO_EVENTOS_KPCL0034_2026-04-16.md) para revisar la trazabilidad completa de categorias manuales de `KPCL0034`.
13. [`SQL_VALIDACION_KPCL0036_TARE_FILL.sql`](SQL_VALIDACION_KPCL0036_TARE_FILL.sql) para vlidar la secuencia canonica de tare y llenado.
14. [`plot_kpcl_experimento.py`](plot_kpcl_experimento.py) para abrir el grafico consolidado en navegador con dos paneles separados y notas de `evento`, incluyendo las categorias manuales del plato cuando vienen en la exportacion.
15. [`Data Science/Reporte_Experimentos_Fase3.md`](Data%20Science/Reporte_Experimentos_Fase3.md) para revisar el estado consolidado del pipeline de modelos.
16. [`Data Science/Preparacion_Nueva_Ingesta_Fase3.md`](Data%20Science/Preparacion_Nueva_Ingesta_Fase3.md) para preparar la proxima ingesta de eventos.

## Ejecucion rpida (local)

1. Variables locales en `kittypau_2026/.env.local`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - opcional para acceso SQL directo: `SUPABASE_DB_URL` y/o `SUPABASE_DB_POOLER_URL`
2. Actualizar CSV canonico:
   - `python refresh_kpcl_experimento.py`
3. Generar HTML usando solo CSV local (recomendado cuando falle auth SQL):
   - `FORCE_LOCAL_CSV=1 python plot_kpcl_experimento.py` (en PowerShell: `$env:FORCE_LOCAL_CSV='1'; python plot_kpcl_experimento.py`)

## Documentos de reglas y ML

- [`REGLAS_EVENTOS_ALIMENTACION.md`](REGLAS_EVENTOS_ALIMENTACION.md) - regla maestra cannica: qu es una sesin de alimentacin, mapa de las 4 fuentes de deteccin del proyecto (audit_events, heurstico cliente, processor bridge, health-check) y cmo se unifican con el grfico hero.
- [`ML_PREDICCION_ALIMENTACION.md`](ML_PREDICCION_ALIMENTACION.md) - especificacin completa para entrenar un modelo supervisado que prediga `inicio_alimentacin` y `termino_alimentacin` desde la curva de peso. Incluye formulacin del problema, features, pipeline SQL, baseline heurstico, arquitecturas sugeridas y mtricas.
- [`OPERATIVIZACION_SESIONES_SUPABASE.md`](OPERATIVIZACION_SESIONES_SUPABASE.md) - implementacion operativa en Supabase para reconstruir sesiones auditadas (`servido`, `alimentacion`, `hidratacion`) y exponerlas a la app.

## Estado de Data Science

- La Fase 1, Fase 2 y Fase 3 ya quedaron documentadas en [`Data Science/`](Data%20Science/).
- El mejor punto de referencia actual sigue siendo el `Experimento 3` de Fase 3.
- El `Experimento 4` sirve como comparacion para futuras iteraciones.
- La siguiente mejora real depende de una nueva ingesta con mas eventos de `alimentacion` y `servido`.

## Regla de uso

- Esta carpeta se usa para consolidar los artefactos de prueba y auditoria de peso/batera de los KPCL.
- Cuando aparezca una nueva corrida, se guarda aqu con el formato `kpclXXXX_<experimento>_<fecha>.csv`.
- Si aparece un nuevo CSV o una nueva corrida compartida, se documenta aqu antes de referenciarla desde `Docs/` raiz.
- Los graficos y exportaciones se generan en UTC.
- Regla de export CSV (vista KPCL): se conserva un solo archivo por device con sufijo `_actual.csv`; al regenerar, se borra automticamente cualquier CSV antiguo del patrn `kpclXXXX_sin_batera_*.csv`.
- En `kpcl_pruebas_eventos.html` existe el boton verde `Actualizar CSV + vista`.
  - Requiere abrir el dashboard desde servidor local: `python Docs/investigacion/serve_kpcl_dashboard.py`
  - URL: `http://127.0.0.1:8765/`
  - Al terminar, muestra estado `Actualizado` y recarga la vista.

## Categorizacion local (sin exponer credenciales)

1. Abre la guia [`GUIA_DASHBOARD_KPCL.md`](GUIA_DASHBOARD_KPCL.md).
2. Ejecuta `.\Docs\investigacion\abrir_kpcl_dashboard.ps1` o, si prefieres manual, `python Docs/investigacion/serve_kpcl_dashboard.py`.
3. Abre `Docs/investigacion/kpcl_pruebas_eventos.html` para ver el grafico.
4. Si quieres la URL del dashboard servido, entra a `http://127.0.0.1:8765/`.
4. El modal guarda directo en Supabase.
5. Al cerrar el guardado, la vista se refresca y el evento queda reflejado en la tabla y en el grafico.

## Fuente de verdad y flujo

- Fuente real: `public.audit_events` (eventos) + `public.readings` (telemetra).
- La vista interactiva siempre intenta leer primero desde Supabase.
- Si Supabase no responde, usa el CSV local solo como respaldo tecnico.
- El HTML muestra una tarjeta de estado con la fuente usada, el ultimo dato y
  la antiguedad para que el atraso sea visible.
- Las sesiones del resumen se reconstruyen desde pares `inicio_*`/`termino_*`
  en `public.audit_events`.
- El valor `Consumido (Δpeso)` se estima sobre la curva de `Peso total`.
- `Comida neta` es una ayuda visual derivada; no define por si sola el conteo
  de sesiones.
- La vista operativa de `KPCL0034` arranca siempre en el encendido del
  `2026-04-08` UTC para mantener el analisis alineado con el experimento.
- `favicon.ico` responde `204`, asi que el log del servidor queda limpio.
- Eventos manuales por UI: `kittypau_app/src/app/api/devices/[id]/category/route.ts`.
- La operacion normal no usa una lista local de eventos.
- Los eventos historicos deben vivir en `public.audit_events`; no se conserva una segunda lista local operativa.
- Export canonico desde Supabase: `Docs/investigacion/refresh_kpcl_experimento.py`.
- SQL canonico equivalente: `Docs/investigacion/SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`.
- Grafico y CSV por device: `Docs/investigacion/plot_kpcl_experimento.py`.

## Taxonomia canonica de categorias

Todas las categorias se registran en `public.audit_events` con `event_type`:
- `manual_bowl_category` - originadas desde la UI (botones en Today)
- `device_power_event` - originadas desde el bridge (automticas, pendiente implementar en bridge v2.x)

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

### Consumo - alimentacin (food_bowl / KPCL0034)
| Key canonica | Label UI |
|---|---|
| `inicio_alimentacin` | INICIO ALIMENTACION |
| `termino_alimentacin` | TERMINO ALIMENTACION |

### Consumo - hidratacin (water_bowl / KPCL0036)
| Key canonica | Label UI |
|---|---|
| `inicio_hidratacin` | INICIO HIDRATACION |
| `termino_hidratacin` | TERMINO HIDRATACION |

### Encendido/apagado de dispositivo (bridge-generated)
| Key canonica | Origen | Estado |
|---|---|---|
| `kpcl_prendido` | Bridge: primer STATUS tras ausencia | **Pendiente** - bridge aun no escribe a `audit_events` |
| `kpcl_apagado` | Bridge: heartbeat check detecta offline | **Pendiente** - bridge aun no escribe a `audit_events` |

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

