# Guia del dashboard KPCL

Este documento explica como abrir, usar y mantener el dashboard interactivo de
`KPCL0034` y `KPCL0036`, que vive en esta carpeta:

- [`plot_kpcl_experimento.py`](plot_kpcl_experimento.py)
- [`serve_kpcl_dashboard.py`](serve_kpcl_dashboard.py)
- [`kpcl_pruebas_eventos.html`](kpcl_pruebas_eventos.html)

## KPCL - Analisis de peso y eventos

Este es el flujo correcto para abrir el grafico y empezar a registrar o
analizar alimentacion:

1. Abre una terminal en la raiz del repo.
2. Ejecuta:

```powershell
.\Docs\investigacion\abrir_kpcl_dashboard.ps1
```

3. Espera a que el script termine y abra directamente:

```text
Docs/investigacion/kpcl_pruebas_eventos.html
```

4. En el navegador, confirma que se vea el dashboard de KPCL con los paneles
   de peso, bateria y resumen de eventos.
5. Usa el panel de `KPCL0034` para identificar la zona de alimentacion.
6. Haz click sobre un punto de la curva cuando quieras registrar un evento.
7. En el modal, guarda primero `inicio_alimentacion`.
8. Inmediatamente despues, guarda `termino_alimentacion`.
9. Verifica que la lista de eventos y el grafico se refresquen solos.
10. Repite el mismo flujo para cada nueva sesion de alimentacion.

Reglas clave:

- Un `inicio_*` nunca queda solo.
- Si registras `inicio_alimentacion`, el sistema te exige `termino_alimentacion`.
- La vista se actualiza para mostrar los datos mas recientes despues de cada
  guardado.
- Si el navegador abre el HTML antes de tiempo, el propio archivo redirige al
  servidor local cuando este ya responde.
- La fuente canonica siempre debe ser Supabase.
- El CSV local solo es un respaldo tecnico si Supabase no responde.
- La pagina muestra una tarjeta de `Estado de fuente` con la fuente usada, el
  ultimo dato cargado y la antiguedad de la informacion.
- Si la tarjeta muestra `FALLBACK`, hay que revisar la conexion antes de
  confiar en el grafico para analisis operativo.

## Incidente y prevencion

En una apertura previa aparecio `ERR_EMPTY_RESPONSE` en `127.0.0.1:8765`.
La causa fue un arranque del dashboard con una instancia anterior o aun no
lista, mientras el navegador ya intentaba abrir la pagina servida.

Prevencion aplicada:

- El lanzador ahora espera a que `GET /health` responda `200` antes de abrir
  el dashboard.
- Si el servidor no queda listo a tiempo, el script se detiene en lugar de
  abrir una pestaña vacia.
- `favicon.ico` ya responde `204 No Content`, asi que no contamina los logs.
- La pagina oficial a abrir es `http://127.0.0.1:8765/?autoload=1`.

## Objetivo

El dashboard consolida:

- la curva de peso de `KPCL0034`
- los eventos manuales de alimentacion, hidratacion y servido
- el nivel de bateria
- un resumen tabular de sesiones
- el guardado directo de categorizaciones manuales en Supabase

## Flujo recomendado

1. Abrir un terminal en la raiz del repo.
2. Iniciar el servidor local con:

```powershell
python Docs/investigacion/serve_kpcl_dashboard.py
```

3. Abrir en el navegador el archivo del grafico:

```text
Docs/investigacion/kpcl_pruebas_eventos.html
```

Ese archivo es la vista del grafico. Si lo abres cuando el servidor ya esta
activo, el HTML se redirige al dashboard local para cargar la data fresca.

4. Si prefieres entrar por URL directa del servidor:

```text
http://127.0.0.1:8765/
```

## Lanzador de un comando

Tambien existe un lanzador PowerShell:

```powershell
.\Docs\investigacion\abrir_kpcl_dashboard.ps1
```

Ese script:

- levanta el servidor en segundo plano usando `python.exe` oculto
- espera a que `GET /health` responda `200`
- refresca la data disponible
- abre `http://127.0.0.1:8765/?autoload=1`
- evita abrir una pagina vacia si el servidor aun no termino de arrancar

## Recarga de data

El dashboard tiene dos niveles de refresh:

- `GET /` sirve la vista fresca regenerada por el servidor
- `POST /refresh` vuelve a descargar la data y reescribe CSV + HTML
- Al generar la vista, el script intenta primero leer desde Supabase.
- Si la conexion a Supabase falla, cae a CSV local como respaldo tecnico.
- Al terminar, el HTML deja visible el estado real de la fuente usada.

El boton verde del HTML ejecuta `refreshDataAndCsv()`, que:

- dispara `/refresh`
- recarga la pagina con un cache-buster `v=<timestamp>`

## Sincronizacion de categorias manuales

Cuando se marca un evento manual desde el modal, el HTML lo escribe de forma
directa en `public.audit_events` de Supabase.

Al terminar:

- el guardado se confirma con un toast
- el dashboard llama a `/refresh`
- la lista de sesiones y el grafico se regeneran con la data oficial

## Como se construyen las sesiones

- El conteo de sesiones de alimentacion y servido se reconstruye desde
  `public.audit_events`.
- Una sesion existe solo cuando hay un par valido `inicio_*` -> `termino_*`.
- La curva `Peso total` es la serie principal del dispositivo.
- La curva `Comida neta` es una derivacion visual para interpretar mejor el
  contenido del plato.
- La columna `Consumido (Δpeso)` del resumen se estima sobre la serie de
  `Peso total`, no sobre `Comida neta`.
- En consecuencia:
  - `74` sesiones de alimentacion significa `74` pares
    `inicio_alimentacion`/`termino_alimentacion` en `audit_events`
  - la duracion sale de la diferencia entre ambos timestamps
  - el consumo se estima con el cambio de `Peso total` en esa ventana

## Regla de intervalos

Las categorias de tipo intervalo siempre van en pareja:

- `inicio_alimentacion` requiere `termino_alimentacion`
- `inicio_hidratacion` requiere `termino_hidratacion`
- `inicio_servido` requiere `termino_servido`

Comportamiento del dashboard:

- al guardar un `inicio_*`, el modal deja el intervalo abierto
- el siguiente evento debe ser el `termino_*` correspondiente
- mientras exista un intervalo abierto, el dashboard bloquea categorias que no lo cierran
- al guardar el `termino_*`, el intervalo se cierra y el estado pendiente se limpia

## Funciones del grafico

### Funciones visuales del panel

- `zoomToEvent(row)`:
  centra el grafico en la sesion seleccionada desde la tabla.
- `attachClicks()`:
  enlaza clicks sobre los puntos de la curva para abrir el modal de categoria.
- `add_event_bands()`:
  pinta bandas toggleables para alimentacion, hidratacion y servido.
- `add_event_markers()`:
  dibuja marcadores verticales para hitos y categorias manuales.
- `add_series_traces()`:
  agrega la serie principal de peso y la serie neta de comida cuando aplica.
- `add_battery_traces()`:
  agrega la trazabilidad de bateria por dispositivo.
- `build_device_figure()`:
  arma el panel principal de peso.
- `build_battery_figure()`:
  arma el panel de bateria.
- `build_boxplot_figure()`:
  arma la distribucion del peso por device.
- `build_stats_html()`:
  arma el resumen de sesiones y metadatos debajo de los graficos.

### Funciones interactivas del HTML

- `openModal(deviceCode, ts, weight)`:
  abre el modal para categorizar un punto.
- `closeModal()`:
  cierra el modal y limpia el estado temporal.
- `selectCat(btn, category, label)`:
  asigna la categoria elegida en el modal.
- `postJson(path, payload)`:
  helper generico de `fetch` con POST JSON.
- `saveEvent()`:
  guarda el evento manual directo en Supabase y refresca la vista.
- `showToast(msg)`:
  muestra el feedback visual inferior.
- `refreshDataAndCsv(options)`:
  refresca CSV + HTML y reordena la vista desde Supabase.
- `bootstrapDashboard()`:
  auto-bootstrapa la pagina al cargar y refresca la vista.

## Funciones del generador Python

- `load_rows()`:
  lee el CSV combinado local.
- `load_env_from_file()`:
  carga variables desde `.env.local`.
- `build_supabase_sql()`:
  arma la consulta canonica de lectura para Supabase.
- `normalize_row()`:
  normaliza tipos y valores vacios del export.
- `ensure_sslmode()`:
  fuerza `sslmode=require` en DSN de Postgres.
- `connect_supabase()`:
  conecta a Supabase por `psycopg2`.
- `load_rows_from_supabase()`:
  intenta SQL directo y cae a REST si hace falta.
- `rows_to_points()`:
  convierte filas crudas a puntos graficables.
- `export_rows()`:
  reescribe el CSV filtrado por device.
- `build_event_intervals()`:
  convierte hitos en intervalos de sesion.
- `add_event_bands()`:
  dibuja bandas de sesion.
- `add_event_markers()`:
  dibuja las marcas de eventos.
- `build_device_figure()`:
  genera el panel de KPCL0034.
- `build_battery_figure()`:
  genera el panel de bateria.
- `build_boxplot_figure()`:
  resume la distribucion de peso.
- `build_stats_html()`:
  crea el resumen textual de sesiones.
- `write_and_open()`:
  escribe el HTML interactivo.
- `generate_dashboard()`:
  coordina lectura, exportacion y render.

## Archivo de respaldo

Si quieres inspeccionar la salida generada, abre:

- [`kpcl_pruebas_eventos.html`](kpcl_pruebas_eventos.html)

Ese archivo ya incorpora:

- redireccion automatica si se abre como archivo local
- refresco inmediato de la vista

## Nota operativa

La fuente canonica de verdad para categorias manuales sigue siendo
`public.audit_events` con `event_type = 'manual_bowl_category'`.
La fuente canonica de verdad para lecturas de peso y bateria es Supabase.
El HTML solo es una interfaz para visualizar y registrar; el servidor es el
encargado de volver a materializar la vista con datos frescos.
Si la tarjeta de estado no muestra Supabase, el analisis no debe darse por
cerrado hasta corregir la conexion.
