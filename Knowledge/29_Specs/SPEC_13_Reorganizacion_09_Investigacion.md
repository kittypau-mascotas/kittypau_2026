---
id: spec_13_reorganizacion_09_investigacion
title: SPEC 13 — Saca 09_Investigacion/ de Docs/ a la raíz del repo
type: spec
status: ejecutado
owner: Mauro
created: 2026-08-17
updated: 2026-08-16
confirmado_por_mauro:
  - "Destino confirmado: raíz del repo (kittypau_2026_hivemq/09_Investigacion), no una
    carpeta hermana nueva — 2026-08-17"
  - "'ok' — confirma mover los 2 bloqueantes (11_Data + PDF huérfano de Postulaciones
    Fondos) antes de borrar Docs/, mismo patrón que 09_Investigacion — 2026-08-17 (tarde)"
  - "Nombres nuevos 'Investigacion'/'Postulaciones_Fondos' (sin prefijo numérico) y
    alcance 'a fondo: reestructurar todo (dime el criterio)' — 2026-08-16. Criterio
    propuesto (agrupar toolkit KPCL en Dashboard_KPCL/) confirmado con 'Sí, procedé' —
    2026-08-16."
tags:
  - spec
  - investigacion
  - reorganizacion
  - fase_0_ruido
  - filesystem
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[29_Specs/SPEC_07_Investigacion_Hidratacion]]
  - [[14_Experimentos/EXP_AlphaV2_AppArq]]
  - [[14_Experimentos/EXP_AlphaV2_Pipeline]]
  - [[13_Features/README_ShapeFeatures]]
  - [[11_ModelosIA/MODEL_EvidenceEngine]]
  - [[05_API/SPEC_HungerBar_Alimentacion]]
---

# SPEC 13 — Saca `09_Investigacion/` de `Docs/` a la raíz del repo

> Pedido de Mauro (2026-08-17): sacar `Docs/09_Investigacion/` a la raíz del repo
> (`kittypau_2026_hivemq/09_Investigacion/`), revisando primero qué sirve — sobre todo
> `fase_0_ruido/` (donde vive la mayor parte de la investigación y los resultados) — y
> verificando que todo lo que usa `app_anotacion_av2.py` (resultados + dependencias) siga
> funcionando en la ubicación nueva.

> ⚠️ **Ampliado 2026-08-17 (tarde)**: Mauro pidió borrar `Docs/` por completo. Antes de
> eso, auditoría de todo lo que quedaba ahí encontró 2 bloqueantes reales (no
> documentación — datos/archivos que Knowledge no puede "contener") y se movieron
> también, mismo patrón: `Docs/11_Data/2026/` (299 MB, `readings.csv`/
> `readings_rows.csv`) → `11_Data/` en la raíz, y un PDF huérfano de la postulación
> CORFO → `10_Postulaciones_Fondos/`. Todo lo demás que quedaba en `Docs/` (`00_Inicio`
> a `08_Equipo`, 158 archivos) se confirmó migrado a `Knowledge/` desde el commit
> `6843104` (10-jul-2026, sin ediciones desde entonces) — ver §8 para el detalle
> completo de esta segunda ronda.

---

## 0. Qué se hizo (resumen ejecutivo)

1. Inventario de `Docs/09_Investigacion/` completo: 363 archivos trackeados por git,
   además de contenido gitignorado (`venv/`, `node_modules/`, CSVs/parquets grandes).
2. Movida la carpeta completa a la raíz del repo — **una sola excepción** (§3).
3. Corregidas las rutas relativas hacia `Docs/11_Data/2026/` (`readings.csv`/
   `readings_rows.csv`, 299 MB, la fuente de verdad histórica — **no se tocó ese archivo
   ni su ubicación**, solo la forma en que los scripts la encuentran) en los 6 scripts de
   `fase_0_ruido/` que la referencian.
4. `app_anotacion_av2.py` verificado funcionando en la ubicación nueva: `py_compile` OK,
   arranca headless (`streamlit run`) y responde `HTTP 200` + `/_stcore/health` → `ok`,
   suite `tests/` 16/16 verde (mismo resultado que el baseline histórico).
5. Actualizadas las referencias a la ruta vieja en 12 archivos de `Knowledge/` + 4 archivos
   dentro de la propia carpeta movida + `Docs/00_Inicio/PLAN_KNOWLEDGE_SYSTEM.md`.

---

## 1. Inventario previo — qué hay en `Docs/09_Investigacion/`

Estructura de alto nivel (antes de mover):

```
Docs/09_Investigacion/
├── 01_GUIA_DASHBOARD_KPCL.md … 08_REGISTRO_EVENTOS_2026-04-16.md  (8 docs sueltos)
├── README.md, _MOC.md, GLOSARIO.md, EXPERIMENT_TRACKER.md,
│   ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md
├── kpcl00*.csv (4 archivos de prueba sueltos) + kpcl_pruebas_eventos.html
├── plot_kpcl_experimento.py, serve_kpcl_dashboard.py, abrir_kpcl_dashboard.ps1
├── Ciclo Alpha/          ← ciclo anterior, ARCHIVADO (ver _MOC.md), tiene venv/ propio
│   └── fase_4_visualizacion/  ← app React/Vite vieja, tiene node_modules/
├── Ciclo Alpha v2/       ← EL VIGENTE (confirmado por comentario ya existente en
│   │                        .gitignore: "Ciclo Alpha v2/ es la vigente")
│   ├── fase_0_ruido/     ← "donde está la gran parte de la investigación y los
│   │                        resultados" (palabras de Mauro) — contiene
│   │                        app_anotacion_av2.py, shape_features_v2.py (Motor
│   │                        Matemático v2), supabase_client.py, tests/, data/, config/
│   └── experiments/, Exploracion_Gamma_Delta_2026/
└── Power Bi_Supabase/
```

`fase_0_ruido/` es, tal como dijo Mauro, la carpeta con más peso real: contiene
`app_anotacion_av2.py` (la app de anotación Streamlit, Tab 5 del proyecto según
[[13_Features/README_ShapeFeatures]]), `shape_features_v2.py` (Motor Matemático v2 — 102
features en 15 familias + Evidence Engine, ver memoria del proyecto), `supabase_client.py`
(sync incremental), scripts de pipeline (`01_genera_candidatos.py`,
`02_auditar_discrepancias.py`, `03_recalibrar_umbrales.py`), `tests/` (16 tests), y los
resultados/datos de trabajo (`data/`, `data_agua/`, `config/`, `benchmark_data_*`).

**Veredicto de la revisión**: todo lo de `Ciclo Alpha v2/` (incluida `fase_0_ruido/`) está
vigente y en uso activo — es la base de [[29_Specs/SPEC_07_Investigacion_Hidratacion]] (en
ejecución) y de los specs de features (`shape_features_v2.py` alimenta
[[11_ModelosIA/MODEL_EvidenceEngine]] y Tab 5 de la app real). `Ciclo Alpha/` (sin "v2") ya
estaba marcado como archivado antes de este spec (`_MOC.md` interno) — se movió igual
(nada se descartó), pero no se le hizo la misma verificación funcional profunda que a
`fase_0_ruido/`.

---

## 2. La dependencia crítica: `Docs/11_Data/2026/`

`app_anotacion_av2.py` y sus scripts hermanos (`01_genera_candidatos.py`,
`requirements_check.py`, `revisar_anotaciones_v2.py`, `supabase_client.py`) leen
`readings.csv` (242 MB, **estático — fuente de verdad histórica de abril, nunca se
modifica**) y `readings_rows.csv` (70 MB, dinámico) desde `Docs/11_Data/2026/`, calculada
como una ruta relativa (`SCRIPT_DIR.parent.parent.parent`, o `_ROOT` en
`supabase_client.py`).

**`Docs/11_Data/2026/` NO se movió** — se queda exactamente donde está, por 2 motivos:

1. Es la fuente de verdad histórica (`readings.csv`) — el principio de "nunca
   truncar/mover/sobreescribir sin motivo" de este proyecto aplica igual a su ubicación.
2. La referencian también 7 archivos de `Knowledge/` fuera del alcance de este spec
   (`10_Datasets/README_Datasets.md`, `14_Experimentos/*`, `29_Specs/SPEC_07_*`, etc.) —
   moverla habría sido un cambio mucho más grande que lo pedido.

Lo que sí cambió: la carpeta `fase_0_ruido/` (y sus hermanas `0A_exploracion/`,
`0B_deteccion_inactividad/`) subieron un nivel de anidamiento al salir `09_Investigacion/`
de `Docs/` — las rutas relativas que antes hacían `SCRIPT_DIR.parent.parent.parent` (3
niveles → `Docs/`) ahora necesitan `SCRIPT_DIR.parent.parent.parent / "Docs"` explícito (3
niveles → raíz del repo, + `Docs/` de vuelta). `supabase_client.py` usaba un `_ROOT` de 4
niveles (ya apuntaba explícito a `Docs/11_Data/2026`) — pasó a 3 niveles.

Archivos corregidos (mismo patrón en los 6):

| Archivo | Antes | Después |
|---|---|---|
| `app_anotacion_av2.py` | `SCRIPT_DIR.parent.parent.parent / "11_Data" / "2026"` | `... / "Docs" / "11_Data" / "2026"` |
| `01_genera_candidatos.py` | ídem | ídem |
| `requirements_check.py` | ídem | ídem |
| `revisar_anotaciones_v2.py` | ídem | ídem |
| `supabase_client.py` | `_ROOT = SCRIPT_DIR.parent.parent.parent.parent` | `_ROOT = SCRIPT_DIR.parent.parent.parent` |
| `0A_01_carga_y_cadencia.py`, `0A_02_limpieza.py`, `0B_02_valida_contra_etiquetas.py` | `ROOT / "Docs/09_Investigacion/Ciclo Alpha" / ...` | `ROOT / "09_Investigacion/Ciclo Alpha" / ...` (el `ROOT = parents[4]` ya apuntaba a la raíz del repo — antes era, sin que nadie lo hubiera notado, un off-by-one; con un nivel menos de anidamiento ahora sí es correcto) |

Verificado con Python real (no solo lectura de código): `RAW_DATA_DIR` resuelto desde la
ubicación nueva encuentra `readings.csv`/`readings_rows.csv` (`.exists() == True` para
ambos).

---

## 3. Lo único que NO se pudo mover

`Docs/09_Investigacion/Ciclo Alpha/fase_4_visualizacion/node_modules/` — Windows negó el
acceso al moverlo (probablemente por la profundidad de anidamiento típica de
`node_modules`, no un archivo en uso: todo lo demás de esa misma carpeta —`venv/` del
propio `Ciclo Alpha`, mucho más pesado, incluido— se movió sin problema).

- Es de **`Ciclo Alpha`** (el ciclo archivado, sin "v2"), no de `Ciclo Alpha v2` ni de
  `fase_0_ruido` — no tiene relación con `app_anotacion_av2.py`.
- Está gitignoreado (`node_modules/` en `.gitignore`) — nunca estuvo trackeado, no hay
  pérdida de historial.
- Es 100% regenerable con `npm install` si esa visualización vieja se retoma alguna vez.

**Queda pendiente, no resuelto por este spec**: decidir si se borra manualmente (con
`Remove-Item -Recurse -Force` una vez que Windows libere el handle, ej. tras reiniciar) o
si se deja — no se tocó sin confirmación porque no es contenido que haya creado esta
sesión. `Docs/09_Investigacion/` queda como una carpeta casi vacía con solo ese resto
adentro.

---

## 4. Verificación de `app_anotacion_av2.py` en la ubicación nueva

Todo ejecutado contra `09_Investigacion/Ciclo Alpha v2/fase_0_ruido/` (la ubicación
nueva), no la vieja:

| Check | Resultado |
|---|---|
| `python -m py_compile` sobre los 8 scripts principales de `fase_0_ruido/` (incluye `app_anotacion_av2.py`, `shape_features_v2.py`, `supabase_client.py`) | OK, sin errores de sintaxis |
| Import de dependencias de terceros (`streamlit`, `pandas`, `numpy`, `plotly`, `scipy`, `pyarrow`) | Las 6 instaladas y resuelven |
| `RAW_DATA_DIR` resuelto → `readings.csv`/`readings_rows.csv` | Ambos `.exists() == True` |
| `streamlit run app_anotacion_av2.py --server.headless true` (2 corridas independientes, puertos distintos) | Arranca sin traceback, `Uvicorn server started` |
| `curl http://localhost:PORT/` | `HTTP 200` |
| `curl http://localhost:PORT/_stcore/health` | `ok` |
| `python -m pytest tests/ -q` | **16 passed** (mismo número que el baseline histórico citado en [[29_Specs/SPEC_07_Investigacion_Hidratacion]]) |

No se verificó de la misma forma el resto de `09_Investigacion/` (`Ciclo Alpha` archivado,
`Power Bi_Supabase`, docs sueltos) — el pedido de Mauro priorizaba explícitamente
`fase_0_ruido`/`app_anotacion_av2.py`; el resto se movió íntegro (nada se descartó) pero
sin la misma batería de pruebas funcionales.

---

## 5. Referencias actualizadas fuera de la carpeta movida

12 archivos de `Knowledge/` + `Docs/00_Inicio/PLAN_KNOWLEDGE_SYSTEM.md` mencionaban rutas
literales `Docs/09_Investigacion/...` (prosa y enlaces relativos markdown) — reemplazo
mecánico `Docs/09_Investigacion` → `09_Investigacion` en los 13 archivos. Los enlaces
relativos (ej. `../../../Docs/09_Investigacion/...` desde `Knowledge/05_API/`) no
necesitaron ajustar la cantidad de `../` — `Knowledge/` no se movió, solo cambió el
subpath dentro de la raíz del repo.

Lista completa: `00_HOME.md`, `01_Proyecto/ESTADO_ACTUAL.md`,
`05_API/SPEC_HungerBar_Alimentacion.md`, `11_ModelosIA/MODEL_EvidenceEngine.md`,
`13_Features/README_ShapeFeatures.md`, `14_Experimentos/EXP_AlphaV2_AppArq.md`,
`14_Experimentos/EXP_AlphaV2_Pipeline.md`, `15_Resultados/RESULT_AlphaV2_Snapshots.md`,
`29_Specs/README_Specs.md`, `29_Specs/SPEC_04_Metricas_Today_Investigacion.md`,
`29_Specs/SPEC_07_Investigacion_Hidratacion.md`, `AUDITORIA_2026_08_11.md`.

---

## 6. Qué NO cambió (a propósito)

- `readings.csv` / `readings_rows.csv` — mismo contenido (verificado: mismo tamaño en
  bytes antes/después), nunca editados. Sí cambiaron de carpeta contenedora en la ronda
  de §8 (`Docs/11_Data/` → `11_Data/`) — el archivo en sí, no.
- El contenido de `Ciclo Alpha`, `Ciclo Alpha v2`, `Power Bi_Supabase` — se movió tal cual,
  nada se editó salvo las rutas listadas en §2 y §5.
- `.gitignore` — las reglas viejas (`Docs/09_Investigacion/**/*.csv`,
  `Docs/11_Data/**/*.csv`, etc.) quedaron apuntando a rutas que ya no existen — no se
  limpiaron (gitignore ya-innecesario no rompe nada, solo queda obsoleto; limpiarlo es
  una tarea aparte, de bajo riesgo, no crítica). Las reglas nuevas si se agregaron (§8).

---

## 7. Siguiente sesión / seguimiento

- Decidir qué hacer con el `node_modules` huérfano en
  `Docs/09_Investigacion/Ciclo Alpha/fase_4_visualizacion/node_modules/` (§3) — sigue
  ahí, sin resolver.
- Confirmar con Mauro que `Docs/` (ahora solo `00_Inicio`–`08_Equipo`, `.obsidian/`, y
  las 2 carpetas vacías `09_Investigacion/Ciclo Alpha/...` y `Postulaciones Fondos/`) ya
  está lista para borrarse — ver §8.

---

## 8. Addendum (2026-08-17, tarde) — `11_Data/` y el PDF huérfano de Postulaciones Fondos

Mauro pidió borrar `Docs/` por completo. Antes de autorizarlo, auditoría de todo lo que
quedaba ahí (ver conversación — no repetida acá en detalle) encontró:

**🔴 Bloqueante 1 — `Docs/11_Data/2026/`** (299 MB: `readings.csv` 242 MB + 242.840.589
bytes exactos, `readings_rows.csv` 70 MB): es **dato crudo, no documentación** —
`Knowledge/10_Datasets/README_Datasets.md` *habla de* este dataset, no lo contiene. Es
además la fuente de verdad histórica (`readings.csv` = "NUNCA modificar, nunca
sobreescribir, nunca truncar", el no-negociable #1 del proyecto) y los 6 scripts de
`fase_0_ruido/` corregidos en §2 leen directo desde esta ruta.

**🔴 Bloqueante 2 — `Docs/Postulaciones Fondos/2026/CORFO_SEMILLA_INICIA_2026/
08_PROTOTIPO_RESPALDO.pdf`** (729 KB): un archivo real de la postulación CORFO,
trackeado por git, huérfano en una carpeta vieja (con espacio, sin "10_") que nunca se
migró cuando `Docs/10_Postulaciones_Fondos/` se reorganizó a `10_Postulaciones_Fondos/`
en la raíz (movido por Mauro directamente, fuera de esta sesión, antes de este
addendum).

**✅ Confirmado seguro de borrar** (no bloqueante): `Docs/00_Inicio` → `Docs/08_Equipo`
(158 archivos) — congelados desde el commit `6843104` (10-jul-2026, "Reestructuración
completa del proyecto y actualización de documentación"), sin ediciones desde entonces.
`Docs/00_Inicio/PLAN_KNOWLEDGE_SYSTEM.md` documenta la migración completa a `Knowledge/`
con checklist marcado ✅ para cada documento origen → destino.

### Qué se hizo

1. `Docs/11_Data/` → `11_Data/` (raíz del repo), mismo patrón que §0 punto 2.
   Verificado: `readings.csv` y `readings_rows.csv` con tamaño en bytes idéntico
   antes/después del movimiento.
2. El PDF huérfano → `10_Postulaciones_Fondos/2026/CORFO_SEMILLA_INICIA_2026/
   08_PROTOTIPO_RESPALDO.pdf` (la estructura que ya existía, creada por Mauro).
3. Corregidas las rutas relativas hacia `11_Data/2026/` en los mismos 6 scripts del §2 —
   segunda vuelta, un nivel de anidamiento menos otra vez (`SCRIPT_DIR.parent.parent.parent
   / "Docs" / "11_Data" / "2026"` → `SCRIPT_DIR.parent.parent.parent / "11_Data" / "2026"`,
   revirtiendo el `"Docs"` que se había agregado en §2 — ahora `11_Data/` es hermana de
   `09_Investigacion/`, no hace falta).
4. Re-verificado `app_anotacion_av2.py` en la ubicación nueva: `py_compile` OK, ruta
   resuelta con `.exists() == True` para ambos CSV, `streamlit run` headless responde
   `HTTP 200` + `/_stcore/health` → `ok`, `pytest tests/` 16/16.
5. **Gap de `.gitignore` encontrado y corregido antes de que causara daño**: las reglas
   de `.gitignore` para `*.csv`/`*.parquet` seguían apuntando a `Docs/11_Data/**` — la
   ubicación nueva `11_Data/**` no estaba cubierta, así que `readings.csv`/
   `readings_rows.csv` habrían quedado *trackeables por accidente* en el próximo
   `git add` (el mismo problema, otra vez, que ya pasó con `anotaciones_av2.csv`/
   `_cache_lecturas_30s.parquet` en §0). Agregadas reglas equivalentes para `11_Data/**`
   antes de tocar git.
6. Referencias a la ruta vieja actualizadas (reemplazo mecánico `Docs/11_Data` →
   `11_Data`) en `Knowledge/10_Datasets/README_Datasets.md`,
   `Knowledge/14_Experimentos/EXP_AlphaV2_Pipeline.md`,
   `Knowledge/15_Resultados/RESULT_AlphaV2_Snapshots.md`,
   `Knowledge/29_Specs/SPEC_07_Investigacion_Hidratacion.md`,
   `Knowledge/AUDITORIA_2026_08_11.md`. No se encontraron referencias a
   `Docs/10_Postulaciones_Fondos`/`Docs/Postulaciones Fondos` en `Knowledge/` (coincide
   con la prioridad "🟢 Baja" que le había dado `PLAN_KNOWLEDGE_SYSTEM.md`).

### Qué queda en `Docs/` después de este addendum

Solo lo confirmado seguro de borrar: `00_Inicio` → `08_Equipo` (158 archivos, migrados),
`.obsidian/` (config vieja, superada por `Knowledge/.obsidian/`), y 2 carpetas ya vacías
de archivos reales (`09_Investigacion/Ciclo Alpha/fase_4_visualizacion/node_modules/`
huérfano del §3, y `Postulaciones Fondos/` ya sin el PDF). **`Docs/` queda listo para
borrarse** en cuanto Mauro lo confirme — este spec ya no encuentra más bloqueantes.

## 9. Segundo addendum (2026-08-16) — Rename + orden a fondo

> Pedido de Mauro: "renombra estas carpeta y ordena su contenido" sobre
> `09_Investigacion/` y `10_Postulaciones_Fondos/` (ya en la raíz del repo por §0/§8).
> Confirmado vía pregunta: nombres nuevos `Investigacion`/`Postulaciones_Fondos` (sin
> prefijo numérico, igual que el resto de las carpetas raíz — `Knowledge`, `bridge`,
> `iot_firmware`, etc.) y alcance "a fondo: reestructurar todo" con el criterio a
> proponer por Claude antes de tocar nada.

### Criterio propuesto y confirmado

1. Agrupar los 9 archivos sueltos del "toolkit dashboard KPCL" en una carpeta propia
   `Dashboard_KPCL/`: `plot_kpcl_experimento.py`, `serve_kpcl_dashboard.py`,
   `abrir_kpcl_dashboard.ps1`, `kpcl_pruebas_eventos.html` y los 5 CSV
   (`kpcl0034_full_eventos.csv`, `kpcl0034_kpcl0036_prueba_sincargador.csv`,
   `kpcl0034_sin_batera_actual.csv`, `kpcl0036_sin_batera_actual.csv`,
   `kpcl0036_sin_bateria_20200101_0000utc_a_1924utc.csv`). El propio `README.md` de la
   carpeta ya los documentaba como una unidad operativa cohesiva (sección "Inventario
   completo de archivos"), así que agruparlos no inventa estructura nueva.
2. Los 8 docs numerados (`01_GUIA...` a `08_REGISTRO...`) + `README.md` / `GLOSARIO.md`
   / `EXPERIMENT_TRACKER.md` / `ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md` / `_MOC.md` quedan
   en la raíz de `Investigacion/` — son la documentación "maestra" del ecosistema, el
   README ya los trata así.
3. `Ciclo Alpha/`, `Ciclo Alpha v2/` y `Power Bi_Supabase/` no se tocan — ya son unidades
   autocontenidas (activo/archivado explícito, documentado en su propio `_MOC.md`).
4. `Postulaciones_Fondos/` no se reestructura — ya está ordenada por año (`2025/`,
   `2026/`), criterio evaluado como suficiente en §8.

### Qué se hizo

1. **Bloqueante previo encontrado y resuelto**: el primer intento de mover
   `09_Investigacion/Ciclo Alpha v2` falló por "acceso denegado" — diagnosticado
   aislando por subcarpeta (mismo patrón que el `node_modules` de §3): esta vez la causa
   fue distinta, 4 procesos `streamlit run app_anotacion_av2.py` (puertos 8595-8598)
   quedaron corriendo en segundo plano desde verificaciones de sesiones anteriores de
   este mismo hilo de trabajo, con un lock sobre `fase_0_ruido/`. Terminados con
   `Stop-Process -Force`, después el move funcionó sin problema.
2. `09_Investigacion/plot_kpcl_experimento.py`, `serve_kpcl_dashboard.py`,
   `abrir_kpcl_dashboard.ps1`, `kpcl_pruebas_eventos.html` (trackeados en git) →
   `Dashboard_KPCL/` vía `git mv`. Los 5 CSV (gitignorados, nunca trackeados) →
   `Dashboard_KPCL/` vía `mv` normal.
3. Rutas relativas en el toolkit KPCL — **no requirieron cambio de código**: al mover los
   scripts un nivel más adentro (`Investigacion/Dashboard_KPCL/`), dos rutas que ya
   estaban rotas desde antes de esta sesión (arrastradas de la era `Docs/investigacion/`,
   nunca corregidas cuando `09_Investigacion` salió de `Docs/` en §0) quedaron
   correctas por coincidencia de profundidad: `ENV_FILE = ROOT.parent.parent /
   ".env.local"` en `plot_kpcl_experimento.py` y `$repoRoot = Resolve-Path (Join-Path
   $scriptDir '..\..')` en `abrir_kpcl_dashboard.ps1` — antes apuntaban un nivel arriba
   de la raíz del repo (nunca notado, no bloqueante porque nadie corrió el refresh
   completo), ahora resuelven bien. Verificado explícitamente con `Path.resolve()`.
4. Referencias mecánicas actualizadas: links relativos `[texto](archivo)` → `[texto]
   (Dashboard_KPCL/archivo)` en `README.md`, `01_GUIA_DASHBOARD_KPCL.md`,
   `06_AUDITORIA_SIN_CARGADOR.md`, `07_AUDITORIA_KPCL0036_ERROR_PESO.md`; y el string
   embebido `Docs/investigacion/<script>.py` (impreso en consola / en el HTML generado)
   corregido a `Investigacion/Dashboard_KPCL/<script>.py` en `serve_kpcl_dashboard.py`,
   `plot_kpcl_experimento.py` (JS template) y el `kpcl_pruebas_eventos.html` ya generado.
   **Cuidado detectado y revertido**: un primer reemplazo mecánico demasiado amplio
   (`Docs/investigacion/` → `Investigacion/Dashboard_KPCL/` sin filtrar) corrompió por
   error referencias no relacionadas a `Docs/investigacion/Data Science/...` y
   `Docs/investigacion/Ciclo Alpha/inferencia_*.py` (rutas viejas, ya stale antes de esta
   sesión, fuera de alcance) en `README.md`, `instructivo.md` y
   `COMO_EJECUTAR_GAMMA.md` — detectado con `git diff` antes de commitear, revertido a la
   ruta original stale (no se "arregla" lo que no se pidió tocar).
5. `09_Investigacion/` → `Investigacion/`, `10_Postulaciones_Fondos/` →
   `Postulaciones_Fondos/` (rename a nivel raíz del repo).
6. Rutas relativas en `fase_0_ruido/` (`SCRIPT_DIR.parent.parent.parent`,
   `parents[4]`) — **no requirieron cambio**: el rename no cambia la profundidad de
   anidamiento, solo el nombre de un segmento. Verificado con `Path.resolve()` +
   `.exists() == True` sobre `RAW_DATA_DIR`.
7. `.gitignore`: agregadas reglas `Investigacion/**/*.csv|*.parquet|*.pkl` (equivalentes
   a las viejas `09_Investigacion/**/*` de §2, que quedan stale sin romper nada).
   Verificado con `git check-ignore` sobre los 5 CSV de `Dashboard_KPCL/` antes de
   cualquier `git add`. Sin reglas dedicadas para `10_Postulaciones_Fondos` (no existían).
8. Re-verificado `app_anotacion_av2.py` en `Investigacion/`: `py_compile` OK (7 scripts),
   `streamlit run` headless → `HTTP 200` + `/_stcore/health` → `ok`, `pytest tests/` →
   16/16 (mismo baseline de siempre).
9. `git add -A -- 09_Investigacion Investigacion Postulaciones_Fondos .gitignore` (con
   pathspec explícito, sin tocar el resto del working tree) → git detectó 403 renames
   limpios + 1 modificado (`.gitignore`). Confirmado con `git status` que las
   eliminaciones no relacionadas de `Docs/` (pendientes en el working tree desde antes de
   esta sesión, fuera de este spec) quedaron sin stagear.

### Qué NO cambió

`Ciclo Alpha/`, `Ciclo Alpha v2/` (salvo el rename del padre), `Power Bi_Supabase/`,
`Postulaciones_Fondos/2025|2026/` — mismo contenido interno, sin reestructurar.

## 10. Tercer addendum (2026-08-16) — Reorganización centrada en `app_anotacion_av2.py`

> Pedido de Mauro: "revisa la totalidad de investigacion, su contenido, recuerda que el
> archivo mas importante es app_anotacion_av2, es el centro de la investigacion, organiza
> todo en relacion a eso, cambia nombres si es necesario, mueve archivos. el objetivo es
> reordenar todo investigacion para que quede profesional."

### Decisión: qué se renombró/movió y qué no, y por qué

Se auditó el árbol completo de `Investigacion/` (~530 archivos, excluyendo `venv/`,
`node_modules/`, `__pycache__/`). Conclusión: **la estructura física ya es correcta**
(`Ciclo Alpha/` = cerrado, `Ciclo Alpha v2/fase_0_ruido/` = donde vive
`app_anotacion_av2.py`, con fases futuras `fase_2_segmentacion`/`fase_5_modelos` ya
anticipadas en la convención `fase_N_*` — confirmado en
`Ciclo Alpha v2/experiments/README.md`). Renombrar `Ciclo Alpha`, `Ciclo Alpha v2` o
`fase_0_ruido` para "verse más profesional" habría roto la convención de fases ya
documentada y forzado otra ronda de fixes de rutas relativas en decenas de docs, por una
ganancia puramente cosmética — **no se hizo**. Tampoco se renombró `Power Bi_Supabase/`:
su propósito sigue sin confirmar desde SPEC_07 §8 pregunta 5 (sin README propio), no se
puede nombrar bien algo que no se sabe si sigue en uso.

Lo que sí estaba roto y se corrigió — **9 rutas obsoletas dentro de la documentación del
propio `app_anotacion_av2.py`**, arrastradas desde antes de esta sesión y nunca barridas en
las 2 rondas anteriores (que solo tocaron `Knowledge/` y los docs de nivel raíz de
`Investigacion/`, no los docs internos de `Ciclo Alpha v2/`):

- `Ciclo Alpha v2/fase_0_ruido/README.md` y `ARQUITECTURA_APP.md`: el comando `cd` para
  lanzar la app apuntaba a `Docs\09_Investigacion\Ciclo Alpha v2\fase_0_ruido` — una ruta
  que no existe desde la primera mudanza de este spec. Corregido a
  `Investigacion\Ciclo Alpha v2\fase_0_ruido`.
- `README.md` (×2), `ACTUALIZACION_DATA.md`, `HISTORIAL_RESULTADOS.md`,
  `requirements_check.py`, `01_genera_candidatos.py`, `02_DISPOSITIVO_Y_DATOS.md`,
  `07_RESULTADOS_304_ANOTACIONES.md`: referencias a `Docs/11_Data/2026/` (ruta pre-§8,
  cuando `11_Data` todavía vivía bajo `Docs/`) corregidas a `11_Data/2026/`.
- `05_ANALISIS_COLAB_KPCL0034_07052026.md`: link roto a una carpeta `Data Science/` que
  nunca existió en esta ubicación — el script real vive en
  `Ciclo Alpha/colab_analisis_kpcl0034_07052026.py`, corregido.

Reforzada la navegación (sin mover archivos): `README.md` de `Investigacion/` reescrito
para abrir con `app_anotacion_av2.py` como punto de entrada explícito (antes abría con
"esta carpeta consolida dos líneas de trabajo" sin mencionar Alpha v2 en absoluto — quedó
desactualizado desde la migración a Alpha v2 en junio). El diagrama de estructura de
carpeta también estaba desactualizado (`fase_1_extraccion/…/fase_6_evaluacion/` como si
existieran, `Data_2026/[Mes_Año]/` que nunca existió con ese nombre, `Dashboard_KPCL/`
ausente) — reemplazado por el árbol real verificado. `_MOC.md` recibió un puntero de una
línea al mismo destino.

Verificado tras los cambios: `py_compile` de los 5 scripts de `fase_0_ruido/` tocados en
esta sesión + `pytest tests/` → 16/16.

## 11. Cuarto addendum (2026-08-16) — reorganización física real

> Pedido de Mauro: "aplica la reorganizacion de investigacion, como un profesional,
> ordenando todo lo relacionado con la investigacion, resultados, documentos etc." — §10
> solo había corregido documentación y rutas; este addendum mueve archivos físicamente.

### Movimientos ejecutados

**Dentro de `Ciclo Alpha v2/fase_0_ruido/`** (separar docs y resultados de los scripts
activos, sin tocar `data/`, `data_agua/`, `config/`, `tests/` ni los `.py` — todo lo que
`app_anotacion_av2.py` lee en runtime queda intacto):
- `Documentacion/` — nueva subcarpeta: `ARQUITECTURA_APP.md`, `ACTUALIZACION_DATA.md`,
  `HISTORIAL_RESULTADOS.md`, `RECOPILACION_DATOS_APP.md`. `README.md` queda en la raíz
  de `fase_0_ruido/` como puerta de entrada (no se movió — perdería su función de
  landing page del folder).
- `Resultados/` — nueva subcarpeta: `benchmark_data_abril_mayo_junio/` completa.

**En la raíz de `Investigacion/`** (los 8 docs sueltos `01`–`08` no eran un grupo
homogéneo — se enrutó cada uno a donde realmente pertenece en vez de amontonarlos en una
carpeta genérica):
- `01_GUIA_DASHBOARD_KPCL.md`, `06_AUDITORIA_SIN_CARGADOR.md`,
  `07_AUDITORIA_KPCL0036_ERROR_PESO.md` → `Dashboard_KPCL/` (documentan ese toolkit
  específicamente, ya estaban cross-linkeados hacia ahí).
- `03_ML_PREDICCION_ALIMENTACION.md` (dice literalmente "especificación original del
  Ciclo Alpha") y `05_ANALISIS_COLAB_KPCL0034_07052026.md` (documenta un script que vive
  en `Ciclo Alpha/`) → `Ciclo Alpha/`.
- `02_REGLAS_EVENTOS_ALIMENTACION.md`, `04_OPERATIVIZACION_SESIONES_SUPABASE.md`,
  `08_REGISTRO_EVENTOS_2026-04-16.md` — **quedan en la raíz**: son reglas canónicas de
  eventos que aplican cross-cycle (Alpha y Alpha v2 ambas las usan), moverlas a un ciclo
  específico las habría representado mal.

### Bugs encontrados y corregidos de paso (pre-existentes, no causados por este addendum)

- **12 links rotos sistémicos en `README.md`**: el texto visible decía `Ciclo Alpha/...`
  pero el href seguía apuntando a `Data Science/...` — una carpeta que no existe desde
  antes de esta sesión (aparente rename histórico donde se actualizó el texto pero nunca
  el href). Corregido con reemplazo mecánico `Data%20Science/` → `Ciclo%20Alpha/` en los
  12 casos, verificados contra el árbol real.
- 2 links cruzados entre `06_AUDITORIA_SIN_CARGADOR.md` y `07_AUDITORIA_KPCL0036_ERROR_PESO.md`
  usaban nombres de archivo viejos que ya no existen
  (`AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md`,
  `AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md`) — corregidos a los nombres reales
  (`07_AUDITORIA_KPCL0036_ERROR_PESO.md`, `06_AUDITORIA_SIN_CARGADOR.md`).
- 1 link a `REGLAS_EVENTOS_ALIMENTACION.md` sin el prefijo `02_` — corregido.
- **No corregidos** (fuera de alcance, ambiguos): 3 referencias a `Data Science/README.md`
  y `Data Science/fase_2_dataset/README.md` en `07_AUDITORIA_KPCL0036_ERROR_PESO.md` — no
  quedó claro a qué archivo real corresponden hoy, no se adivinó. Tampoco la extensión
  `COMO_EJECUTAR.md` vs. el archivo real `COMO_EJECUTAR.py` en
  `Ciclo Alpha/fase_4_visualizacion/` — problema de contenido preexistente, distinto al
  de esta reorganización.

### Referencias actualizadas

`Investigacion/README.md` (múltiples secciones), `fase_0_ruido/README.md`,
`shape_features_v2.py` (2 comentarios), los 3 docs movidos a `Dashboard_KPCL/`, los 2
movidos a `Ciclo Alpha/`, y en `Knowledge/`: `RESULT_AlphaV2_Snapshots.md` (link real),
`ESTADO_ACTUAL.md`, `MOC_Experimentos.md`, `MOC_Resultados.md` (menciones de ruta).

Verificado: `py_compile` de los 6 scripts de `fase_0_ruido/`, `streamlit run --headless`
→ HTTP 200 + `/_stcore/health` → `ok`, `pytest tests/` → 16/16.
