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
├── Ciclo_Alpha_v1/          ← ciclo anterior, ARCHIVADO (ver _MOC.md), tiene venv/ propio
│   └── fase_4_visualizacion/  ← app React/Vite vieja, tiene node_modules/
├── Ciclo_Alpha_v2/       ← EL VIGENTE (confirmado por comentario ya existente en
│   │                        .gitignore: "Ciclo_Alpha_v2/ es la vigente")
│   ├── fase_0_ruido/     ← "donde está la gran parte de la investigación y los
│   │                        resultados" (palabras de Mauro) — contiene
│   │                        app_anotacion_av2.py, shape_features_v2.py (Motor
│   │                        Matemático v2), supabase_client.py, tests/, data/, config/
│   └── experiments/, Exploracion_Gamma_Delta_2026/
└── PowerBI_Supabase/
```

`fase_0_ruido/` es, tal como dijo Mauro, la carpeta con más peso real: contiene
`app_anotacion_av2.py` (la app de anotación Streamlit, Tab 5 del proyecto según
[[13_Features/README_ShapeFeatures]]), `shape_features_v2.py` (Motor Matemático v2 — 102
features en 15 familias + Evidence Engine, ver memoria del proyecto), `supabase_client.py`
(sync incremental), scripts de pipeline (`01_genera_candidatos.py`,
`02_auditar_discrepancias.py`, `03_recalibrar_umbrales.py`), `tests/` (16 tests), y los
resultados/datos de trabajo (`data/`, `data_agua/`, `config/`, `benchmark_data_*`).

**Veredicto de la revisión**: todo lo de `Ciclo_Alpha_v2/` (incluida `fase_0_ruido/`) está
vigente y en uso activo — es la base de [[29_Specs/SPEC_07_Investigacion_Hidratacion]] (en
ejecución) y de los specs de features (`shape_features_v2.py` alimenta
[[11_ModelosIA/MODEL_EvidenceEngine]] y Tab 5 de la app real). `Ciclo_Alpha_v1/` (sin "v2") ya
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

`Docs/09_Investigacion/Ciclo_Alpha_v1/fase_4_visualizacion/node_modules/` — Windows negó el
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

Todo ejecutado contra `09_Investigacion/Ciclo_Alpha_v2/fase_0_ruido/` (la ubicación
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
`PowerBI_Supabase`, docs sueltos) — el pedido de Mauro priorizaba explícitamente
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
- El contenido de `Ciclo Alpha`, `Ciclo Alpha v2`, `PowerBI_Supabase` — se movió tal cual,
  nada se editó salvo las rutas listadas en §2 y §5.
- `.gitignore` — las reglas viejas (`Docs/09_Investigacion/**/*.csv`,
  `Docs/11_Data/**/*.csv`, etc.) quedaron apuntando a rutas que ya no existen — no se
  limpiaron (gitignore ya-innecesario no rompe nada, solo queda obsoleto; limpiarlo es
  una tarea aparte, de bajo riesgo, no crítica). Las reglas nuevas si se agregaron (§8).

---

## 7. Siguiente sesión / seguimiento

- Decidir qué hacer con el `node_modules` huérfano en
  `Docs/09_Investigacion/Ciclo_Alpha_v1/fase_4_visualizacion/node_modules/` (§3) — sigue
  ahí, sin resolver.
- Confirmar con Mauro que `Docs/` (ahora solo `00_Inicio`–`08_Equipo`, `.obsidian/`, y
  las 2 carpetas vacías `09_Investigacion/Ciclo_Alpha_v1/...` y `Postulaciones Fondos/`) ya
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
de archivos reales (`09_Investigacion/Ciclo_Alpha_v1/fase_4_visualizacion/node_modules/`
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
3. `Ciclo_Alpha_v1/`, `Ciclo_Alpha_v2/` y `PowerBI_Supabase/` no se tocan — ya son unidades
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
   `Docs/investigacion/Ciclo_Alpha_v1/inferencia_*.py` (rutas viejas, ya stale antes de esta
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

`Ciclo_Alpha_v1/`, `Ciclo_Alpha_v2/` (salvo el rename del padre), `PowerBI_Supabase/`,
`Postulaciones_Fondos/2025|2026/` — mismo contenido interno, sin reestructurar.

## 10. Tercer addendum (2026-08-16) — Reorganización centrada en `app_anotacion_av2.py`

> Pedido de Mauro: "revisa la totalidad de investigacion, su contenido, recuerda que el
> archivo mas importante es app_anotacion_av2, es el centro de la investigacion, organiza
> todo en relacion a eso, cambia nombres si es necesario, mueve archivos. el objetivo es
> reordenar todo investigacion para que quede profesional."

### Decisión: qué se renombró/movió y qué no, y por qué

Se auditó el árbol completo de `Investigacion/` (~530 archivos, excluyendo `venv/`,
`node_modules/`, `__pycache__/`). Conclusión: **la estructura física ya es correcta**
(`Ciclo_Alpha_v1/` = cerrado, `Ciclo_Alpha_v2/fase_0_ruido/` = donde vive
`app_anotacion_av2.py`, con fases futuras `fase_2_segmentacion`/`fase_5_modelos` ya
anticipadas en la convención `fase_N_*` — confirmado en
`Ciclo_Alpha_v2/experiments/README.md`). Renombrar `Ciclo Alpha`, `Ciclo Alpha v2` o
`fase_0_ruido` para "verse más profesional" habría roto la convención de fases ya
documentada y forzado otra ronda de fixes de rutas relativas en decenas de docs, por una
ganancia puramente cosmética — **no se hizo**. Tampoco se renombró `PowerBI_Supabase/`:
su propósito sigue sin confirmar desde SPEC_07 §8 pregunta 5 (sin README propio), no se
puede nombrar bien algo que no se sabe si sigue en uso.

Lo que sí estaba roto y se corrigió — **9 rutas obsoletas dentro de la documentación del
propio `app_anotacion_av2.py`**, arrastradas desde antes de esta sesión y nunca barridas en
las 2 rondas anteriores (que solo tocaron `Knowledge/` y los docs de nivel raíz de
`Investigacion/`, no los docs internos de `Ciclo_Alpha_v2/`):

- `Ciclo_Alpha_v2/fase_0_ruido/README.md` y `ARQUITECTURA_APP.md`: el comando `cd` para
  lanzar la app apuntaba a `Docs\09_Investigacion\Ciclo_Alpha_v2\fase_0_ruido` — una ruta
  que no existe desde la primera mudanza de este spec. Corregido a
  `Investigacion\Ciclo_Alpha_v2\fase_0_ruido`.
- `README.md` (×2), `ACTUALIZACION_DATA.md`, `HISTORIAL_RESULTADOS.md`,
  `requirements_check.py`, `01_genera_candidatos.py`, `02_DISPOSITIVO_Y_DATOS.md`,
  `07_RESULTADOS_304_ANOTACIONES.md`: referencias a `Docs/11_Data/2026/` (ruta pre-§8,
  cuando `11_Data` todavía vivía bajo `Docs/`) corregidas a `11_Data/2026/`.
- `05_ANALISIS_COLAB_KPCL0034_07052026.md`: link roto a una carpeta `Data Science/` que
  nunca existió en esta ubicación — el script real vive en
  `Ciclo_Alpha_v1/colab_analisis_kpcl0034_07052026.py`, corregido.

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

**Dentro de `Ciclo_Alpha_v2/fase_0_ruido/`** (separar docs y resultados de los scripts
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
  en `Ciclo_Alpha_v1/`) → `Ciclo_Alpha_v1/`.
- `02_REGLAS_EVENTOS_ALIMENTACION.md`, `04_OPERATIVIZACION_SESIONES_SUPABASE.md`,
  `08_REGISTRO_EVENTOS_2026-04-16.md` — **quedan en la raíz**: son reglas canónicas de
  eventos que aplican cross-cycle (Alpha y Alpha v2 ambas las usan), moverlas a un ciclo
  específico las habría representado mal.

### Bugs encontrados y corregidos de paso (pre-existentes, no causados por este addendum)

- **12 links rotos sistémicos en `README.md`**: el texto visible decía `Ciclo_Alpha_v1/...`
  pero el href seguía apuntando a `Data Science/...` — una carpeta que no existe desde
  antes de esta sesión (aparente rename histórico donde se actualizó el texto pero nunca
  el href). Corregido con reemplazo mecánico `Data%20Science/` → `Ciclo_Alpha_v1/` en los
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
  `Ciclo_Alpha_v1/fase_4_visualizacion/` — problema de contenido preexistente, distinto al
  de esta reorganización.

### Referencias actualizadas

`Investigacion/README.md` (múltiples secciones), `fase_0_ruido/README.md`,
`shape_features_v2.py` (2 comentarios), los 3 docs movidos a `Dashboard_KPCL/`, los 2
movidos a `Ciclo_Alpha_v1/`, y en `Knowledge/`: `RESULT_AlphaV2_Snapshots.md` (link real),
`ESTADO_ACTUAL.md`, `MOC_Experimentos.md`, `MOC_Resultados.md` (menciones de ruta).

Verificado: `py_compile` de los 6 scripts de `fase_0_ruido/`, `streamlit run --headless`
→ HTTP 200 + `/_stcore/health` → `ok`, `pytest tests/` → 16/16.

## 12. Quinto addendum (2026-08-16) — rename completo, sin excepciones de nombre

> Pedido de Mauro: "renombra todo, edita todo, y reorganiza, necesito que quede
> ordenado" — anula la reserva de §10/§11 sobre no renombrar `Ciclo Alpha`/
> `Ciclo Alpha v2`/`Power Bi_Supabase` por costo/beneficio; Mauro decide que el costo
> vale la pena.

### Renombres físicos ejecutados

| Antes | Después |
|---|---|
| `Ciclo Alpha/` | `Ciclo_Alpha_v1/` (versión explícita, simétrica con v2) |
| `Ciclo Alpha v2/` | `Ciclo_Alpha_v2/` |
| `Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Gamma/` | `.../Ciclo_Gamma/` |
| `Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Delta/` | `.../Ciclo_Delta/` |
| `Power Bi_Supabase/` | `PowerBI_Supabase/` |

Todas vía `Rename-Item` de PowerShell (sin problemas de lock esta vez — el
`node_modules/` huérfano que bloqueó un movimiento en §3 ya no existe), seguido de
`git add -A` con pathspec explícito para que git detecte los 274 renames.

**`fase_0_ruido/` NO se renombró** — sigue siendo la única excepción deliberada. Motivo
técnico, no solo de costo: `Ciclo_Alpha_v2/experiments/README.md` ya documenta un
roadmap de fases futuras (`fase_2_segmentacion`, `fase_5_modelos`) que continúan la
misma convención de nombre. Renombrar `fase_0_ruido` ahora rompería esa secuencia
documentada antes de que existan las fases siguientes.

### Sweep de referencias

Un script Python con regex recorrió `Investigacion/` + `Knowledge/` (`.md`, `.py`,
`.ps1`, `.json`, `.html`) reemplazando únicamente ocurrencias **path-like** de los 5
nombres viejos — el patrón exige que el nombre esté seguido de `/`, `\`, o `%20` (URL
encoding), para no tocar menciones sueltas en prosa (`"el Ciclo Alpha fue cerrado en
junio"` sigue diciendo "Ciclo Alpha" como nombre del ciclo, no como ruta — no se tocó
la prosa, solo las rutas reales). 45 archivos modificados. Verificado con `git status`
que `Knowledge/.obsidian/graph.json`/`workspace.json` quedaron fuera del `git add`
(un `git add -A -- Investigacion/ Knowledge/` inicial los había agarrado por error —
detectado antes del commit, revertido con `git restore --staged`).

Residual verificado con grep dirigido: 0 referencias rotas, salvo una entrada de
histórico en `Knowledge/.obsidian/workspace.json` (caché de archivos abiertos de
Obsidian, con una ruta aún más vieja de antes de todo este spec — archivo que nunca se
toca por regla del proyecto).

Verificado tras el rename: `py_compile` (14 scripts de `fase_0_ruido/` incluyendo
`0A_`/`0B_`/`0C_`), resolución de `RAW_DATA_DIR` con `.exists() == True`, `streamlit
run --headless` → HTTP 200 + `/_stcore/health` → `ok`, `pytest tests/` → 16/16.

## 13. Sexto addendum (2026-08-16) — aplanar TODOS los .md a la raíz

> Pedido de Mauro: "revisa los docs dentro de investigacion, deben solo quedar docs en
> la ruta de investigacion, no dentro de carpetas, necesitamos actualizar todo en
> relacion a investigacion." Confirmado por pregunta explícita — alcance elegido:
> **todos** los `.md` del árbol (no solo los 8 sueltos de rondas anteriores), pese a la
> advertencia de que esto generaría colisiones de nombre y borraría la asociación de
> cada doc con su ciclo/fase.

### Qué se hizo

1. Inventario de los 89 `.md` de `Investigacion/` (excluyendo `venv/`, `node_modules/`,
   `__pycache__/`, `.pytest_cache/`). 8 ya estaban en la raíz, 80 vivían en subcarpetas,
   1 era caché de pytest (ignorado, no es un doc real).
2. **Única colisión de nombre real**: 8 archivos llamados `README.md` (uno por
   ciclo/fase). El de la raíz quedó igual; los otros 7 se renombraron con el prefijo de
   su carpeta padre (`Ciclo_Alpha_v1_README.md`,
   `Ciclo_Alpha_v2_fase_0_ruido_README.md`, etc.) — verificado que ningún otro basename
   colisionaba antes de mover nada.
3. 80 archivos movidos a la raíz de `Investigacion/` (`git mv`, todos trackeados).
   Limpiadas 7 carpetas que quedaron vacías tras el movimiento (`Ciclo_Gamma/experiments/`,
   `Ciclo_Gamma/scripts/fase_1|2|3/`, `Ciclo_Delta/experiments/`,
   `Ciclo_Alpha_v2/experiments/`, `fase_0_ruido/Documentacion/`).
4. Sweep de referencias con un script Python: para cada archivo restante (`.md`, `.py`,
   `.ps1`, `.json`, excluyendo generados >500 KB como los HTML de Plotly), calcula la
   profundidad hasta `Investigacion/` (o hasta ahí vía la raíz del repo si el archivo
   está en `Knowledge/`) y reemplaza cualquier ruta que apunte a un basename movido —
   con cualquier prefijo previo — por la referencia correcta desde ese archivo.

### 3 bugs encontrados durante el sweep y cómo se resolvieron

- **Backtracking catastrófico**: el primer patrón de prefijo `(?:[\w.\-%]+[/\\])*`
  (grupo con `+` anidado dentro de `*`) colgó el script dos veces sobre archivos
  grandes. Corregido a una sola clase de caracteres `[\w./\\%-]*` (sin grupo anidado) —
  lineal, sin riesgo de blow-up exponencial.
- **Corrupción de narrativa histórica**: el sweep tocó `SPEC_13` (este archivo) y
  `SPEC_07_Investigacion_Hidratacion.md`, insertando `../../Investigacion/` en medio de
  diagramas ASCII y citas en prosa que documentan estados *pasados* del árbol — técnicamente
  no roto (no son links funcionales, son texto narrativo), pero ilegible y
  cronológicamente incorrecto. **Revertidos por completo** ambos archivos con
  `git checkout --`, igual que 2 HTML estáticos con el mismo problema
  (`visualizacion_fase4_delta.md/v2.html` — narrativa congelada de un reporte generado).
  Consecuencia aceptada: estos 2 specs y 2 HTML quedan con referencias a rutas viejas de
  antes de este addendum — su prosa importa más que su exactitud de ruta.
- **Corrupción de código en vivo (el más grave)**: 2 scripts archivados de `Ciclo_Delta`
  (`d03_reporte_final.py`, `d04_anomaly_report.py`) construyen en runtime la ruta de sus
  propios archivos de salida vía `pathlib` (`FASE3_OUTPUTS / "anomaly_report" /
  "anomaly_report.md"`) — el basename coincide por casualidad con un doc que también se
  movió, y el sweep reescribió la expresión de código como si fuera una referencia de
  documentación, dejando una ruta sin sentido. Causa raíz: mover un `.md` que es
  **salida generada por un pipeline** (no solo documentación de autor) a un lugar plano
  rompe la ruta que el pipeline espera escribir. **Los 9 `.py` tocados por el sweep se
  revirtieron por completo** (`git checkout --`) por seguridad — no se podía garantizar
  caso por caso cuál era comentario seguro y cuál código real sin revisar los 9 a mano.
  Se reaplicaron a mano, con `Edit`, solo los 2 comentarios de `shape_features_v2.py`
  (verificados 1 por 1 como seguros — son comentarios puros, no construyen rutas).
  Los otros 8 scripts (todos en `Ciclo_Gamma`/`Ciclo_Delta`, ambos ciclos archivados)
  quedan con comentarios apuntando a la ubicación vieja de sus docs — aceptable: son
  scripts que casi seguro no se vuelven a correr, y un comentario desactualizado no
  rompe nada si igual no se ejecuta.
- **Prefijo con espacio no capturado**: la clase de caracteres `[\w./\\%-]*` no incluye
  el espacio, así que el bug preexistente `Data Science/experiments/X.md` (texto visible
  ya corregido a `Ciclo_Alpha_v1/...` en una ronda anterior, pero el href seguía roto en
  3 archivos que esa ronda no tocó: `EXPERIMENT_TRACKER.md`,
  `07_AUDITORIA_KPCL0036_ERROR_PESO.md`, `08_REGISTRO_EVENTOS_2026-04-16.md`) dejó un
  `"Data "` residual pegado antes del nombre nuevo (ej. `Data exp_01_linea_base.md`).
  Detectado con grep dirigido tras el sweep, corregido con un segundo patrón acotado
  (`\bData (\S+\.(?:md|py))\b` → solo el grupo capturado). Verificado con grep que no
  queda ningún href con espacio salvo una fila de plantilla en
  `EXPERIMENT_TRACKER.md:205` (`exp_0N_nombre.md`, no es un archivo real).

### Verificación final

`py_compile` de los 8 scripts de `fase_0_ruido/` (incluye `shape_features_v2.py`
editado a mano), `streamlit run --headless` → HTTP 200 + `/_stcore/health` → `ok`,
`pytest tests/` → 16/16. Grep dirigido confirmó 0 hrefs rotos residuales (excepto la
fila de plantilla ya mencionada).

## 14. Séptimo addendum (2026-08-16) — renombrar por lógica de ciclo + fusionar/descartar redundancia

> Pedido de Mauro: "renombra los .md para que tengan una logica ... me refiero al
> orden [de] todos los .md que estan en investigacion, algunos pueden unirse, otros
> desecharse. ordena logicamente." Sobre los 88 `.md` ya aplanados en §13.

### Diagnóstico

El problema real no era falta de organización interna de cada doc (varios, como
`GLOSARIO.md`/`GLOSARIO_GAMMA.md`/`GLOSARIO_DELTA.md`, ya estaban diseñados como
capas complementarias que se declaran explícitamente "no redefine términos ya
cubiertos" — leídos antes de tocar nada, confirmado que NO son redundantes, se
dejaron intactos). El problema real era **colisión de prefijos numéricos entre
ciclos no relacionados**: Alpha v1 (`01_REFERENCIAS`, `02_PREPARACION_NUEVA_INGESTA`,
`03_ML_PREDICCION_ALIMENTACION`...) y Alpha v2 (`00_INDICE_AV2` a
`09_EVOLUCION_MOTOR_MATEMATICO`) usaban el mismo rango `00`–`09` para documentos sin
relación, mezclados alfabéticamente en la carpeta plana sin ninguna señal visual de
a qué ciclo pertenece cada uno. Auditado leyendo `ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md`,
`APRENDIZAJES_GAMMA_DELTA.md`, `COMPARACION_ALPHA_GAMMA.md` y los headers de
`GLOSARIO_GAMMA.md`/`GLOSARIO_DELTA.md`/`g01_baseline_limpio.md`/`g01_build_labels.md`
antes de decidir qué renombrar, fusionar o descartar.

### Descartado (1 archivo)

`COMPARACION_ALPHA_GAMMA.md` (2026-06-17) — snapshot intermedio de Gamma escrito
**antes** de que G-01 entrenara ("ningún modelo entrenado aún", métricas "pendiente").
Completamente superseded por `APRENDIZAJES_GAMMA_DELTA.md` (2026-06-23, "documento
generado al archivar Ciclo Gamma y Ciclo Delta" — memoria institucional completa con
las mismas métricas ya resueltas). Sus 2 tablas con valor único que no estaban en
el doc final (§1.3 correcciones de calidad de datos, §2 comparación feature-por-
feature Alpha vs Gamma) se fusionaron primero como §1.3b/§1.3c de
`APRENDIZAJES_GAMMA_DELTA.md`, con nota de dónde vinieron. 3 referencias cruzadas
actualizadas (`APRENDIZAJES_CONSOLIDADOS.md`, `instructivo_delta.md`) antes de
`git rm`.

### Renombrado — 36 archivos, convención por prefijo de ciclo

| Prefijo | Ciclo | Archivos |
|---|---|---|
| *(sin prefijo, `00`–`09`)* | Alpha v2 — ACTIVO | sin cambio, ya no colisiona tras renombrar Alpha v1 |
| `A1_` | Alpha v1 — CERRADO | 24 (7 numerados + `EXPERIMENT_TRACKER` + 12 `exp_NN` + 4 `README` de subcarpetas) |
| `KPCL_` | Toolkit Dashboard KPCL | 3 (`01_GUIA_DASHBOARD_KPCL`, `06_AUDITORIA_SIN_CARGADOR`, `07_AUDITORIA_KPCL0036_ERROR_PESO`) |
| *(sin número)* | Canónicos cross-cycle | 3 (`02_REGLAS_EVENTOS_ALIMENTACION` → `REGLAS_EVENTOS_ALIMENTACION`, etc. — el número `02`/`04`/`08` no significaba secuencia, era heredado del viejo esquema `Docs/09_Investigacion/`) |
| `GAMMA_` | Gamma — nombres ambiguos | 2 (`instructivo.md`, `implementacion.md` — sin esto, indistinguibles de cualquier otro doc genérico) |
| `DELTA_` | Delta — nombre ambiguo | 1 (`anomaly_report.md`) |
| `AV2_` | Alpha v2 — consistencia con el resto de prefijos | 3 `README` de subcarpetas (`Ciclo_Alpha_v2_README.md` → `AV2_README.md`, etc.) |

**No renombrado, y por qué**: los `g0N_*.md`/`d0N_*.md` (17 archivos) ya llevan un
identificador de ciclo implícito vía el prefijo de letra (`g`=Gamma, `d`=Delta) —
agregar `GAMMA_`/`DELTA_` a estos 17 más habría sido riesgo sin beneficio real
(ya son inequívocos en contexto). Los glosarios/trackers con sufijo
`_GAMMA`/`_DELTA` ya se autoidentifican, tampoco se tocaron.

### Sweep de referencias — sin regex esta vez

Reemplazo global de string exacto (basename viejo → nuevo), sin regex ni cálculo de
profundidad — todos los archivos ya estaban al mismo nivel (raíz de
`Investigacion/`) antes y después del rename, así que no había riesgo del bug de
backtracking ni de corrupción de ruta de §13. **Deliberadamente excluidos los
`.py`** de este sweep — la lección de §13 (un script de `Ciclo_Delta` corrompido
porque su propio nombre de archivo de salida coincidía por casualidad con un doc
movido) aplica igual acá: más vale un comentario desactualizado en un script
archivado que arriesgar romper código en vivo por segunda vez.

### `_MOC.md` y `README.md` reescritos como índice completo

`_MOC.md` estaba incompleto desde antes de esta sesión — no mencionaba Gamma ni
Delta en absoluto, y varios links usaban los nombres viejos. Reescrito de cero
como índice completo de los 88 `.md`, agrupados por ciclo con el prefijo nuevo,
incluyendo una sección "Memoria consolidada de Gamma + Delta" que no existía.
`README.md`: agregada una tabla de convención de nombres al inicio, corregido un
bug de contenido preexistente (línea que describía el tracker de experimentos de
Alpha v2 pero enlazaba al de Alpha v1 — arrastrado desde antes de esta sesión),
y el diagrama de estructura reescrito para reflejar los archivos planos + carpetas
de código.

### Verificación final

`py_compile` (6 scripts core de `fase_0_ruido/`), `streamlit run --headless` →
HTTP 200 + `/_stcore/health` → `ok`, `pytest tests/` → 16/16. Grep dirigido:
0 referencias rotas a los 33 nombres viejos en toda `Investigacion/`.

## 15. Octavo addendum (2026-08-16) — fusionar y descartar para reducir el conteo

> Pedido de Mauro: "unamos y fusionemos algunos .md, si es necesario renombra o
> elimina algunas, necesitamos reducir este numero. son muchos .md" — sobre los
> 88 `.md` de §14.

### Fusiones ejecutadas (30 archivos → 4)

Concatenación con separador `---` y comentario HTML de procedencia
(`<!-- ==== fusionado desde X.md ==== -->`) por cada archivo origen, preservando
el 100% del contenido — nada se resumió ni se recortó:

| Archivo nuevo | Fusiona | Motivo |
|---|---|---|
| `A1_EXPERIMENTOS_DETALLE.md` | 12 × `A1_exp_NN_*.md` | Bitácora cronológica de un ciclo cerrado — mismo patrón que un lab notebook acumulativo. `A1_EXPERIMENT_TRACKER.md` ya indexa cada uno con link, no se perdió navegabilidad |
| `GAMMA_EXPERIMENTOS_DETALLE.md` | 6 × `g0N_*.md` (resultados G-01 a G-06) | Ídem, indexado por `EXPERIMENT_TRACKER_GAMMA.md` |
| `GAMMA_SCRIPTS_SPECS.md` | 7 archivos (`g01_build_labels.md`...`g05_build_sessions.md` + `_gamma_phase2_utils.md`/`_gamma_phase3_utils.md`) | Specs pre-implementación de scripts (convención `— PY` documentada en `GAMMA_INSTRUCTIVO.md` regla 1) — una unidad temática, no experimentos separados |
| `DELTA_EXPERIMENTOS_DETALLE.md` | 5 × `d0N_*.md` (D-01 a D-05) | Ídem, indexado por `EXPERIMENT_TRACKER_DELTA.md` |

**Verificado antes de fusionar** que no eran material distinto: `g01_baseline_limpio.md`
(bitácora de resultado del experimento G-01) vs. `g01_build_labels.md` (spec del
script `g01_build_labels.py`) — mismo número, contenido y propósito distintos,
confirmado leyendo ambos headers antes de decidir el agrupamiento correcto.

### Descartes (3 archivos)

- **`COMPARACION_ALPHA_GAMMA.md`** (ya en §14) — reconfirmado en este addendum al
  auditar el resto de la carpeta.
- **`reporte_final_delta.md`** — archivo 100% generado automáticamente por
  `d03_reporte_final.py` (confirmado en el código, ver §13 sobre por qué esos
  scripts no se tocan). Su contenido íntegro (K-Means, anomalías, ARI, candidatos)
  ya estaba en `APRENDIZAJES_GAMMA_DELTA.md` con más detalle, incluso incrustaba
  el texto completo de `DELTA_ANOMALY_REPORT.md` verbatim.
- **`REPORTE_EJECUCION_DELTA.md`** — reporte fase-por-fase con la misma
  información que `APRENDIZAJES_GAMMA_DELTA.md` §2.4–2.8 y los `d0N_*.md` recién
  fusionados. Sus 2 secciones sin duplicar en otro lado (árbol de "Archivos
  generados" y "Pendiente/Recomendaciones" del cierre del ciclo) se fusionaron
  como apéndice de `DELTA_EXPERIMENTOS_DETALLE.md` antes de descartarlo.

### Explícitamente NO fusionado, y por qué

`GLOSARIO.md` / `GLOSARIO_GAMMA.md` / `GLOSARIO_DELTA.md` — leídos los 3 headers
antes de decidir: ya están diseñados como capas complementarias explícitas
("El Ciclo Alpha usa el mismo vocabulario salvo donde se indica `[CORREGIDO EN
GAMMA]`", "Complementa GLOSARIO.md... No redefine términos ya cubiertos ahí").
Fusionarlos habría sido peor que dejarlos — se perdería esa estructura de diff
ya pensada por quien los escribió. Mismo criterio para los 3
`EXPERIMENT_TRACKER*.md` (tablas resumen por ciclo, cada una alimenta el detalle
fusionado de su propio ciclo — fusionarlas mezclaría métricas de 3 ciclos con
columnas distintas en una sola tabla ilegible).

### Referencias

Mismo patrón sin regex que §14 (reemplazo de string exacto, `.py` excluidos del
sweep). Efecto secundario detectado y corregido: el propio comentario HTML de
procedencia que insertó el script de fusión (`<!-- ==== fusionado desde X.md
==== -->`) se autocorrompió en los 4 archivos nuevos porque el sweep de
referencias corrió después y reemplazó el nombre del archivo origen dentro del
comentario por el nombre del archivo fusionado (contenía el string buscado) —
detectado con grep, corregido restaurando el nombre de procedencia original en
cada uno de los 30 comentarios.

`EXPERIMENT_TRACKER_DELTA.md`: la columna "Archivo" de las 10 filas D-01 a
D-Final actualizada para apuntar a `DELTA_EXPERIMENTOS_DETALLE.md`/
`APRENDIZAJES_GAMMA_DELTA.md` en vez de los `d0N_*.md` ya fusionados.

### Resultado

88 → 59 `.md` en la raíz de `Investigacion/` (33% menos), sin perder contenido —
solo consolidado y con la redundancia genuina eliminada. `_MOC.md` actualizado
con los 4 nuevos índices y la nota de los 2 descartes.

Verificado: `py_compile` (6 scripts core), `streamlit run --headless` → HTTP 200
+ `/_stcore/health` → `ok`, `pytest tests/` → 16/16. Grep dirigido: 0 referencias
rotas a los 32 nombres eliminados.

## 16. Noveno addendum (2026-08-16) — prefijo uniforme `av1_`/`av2_`

> Pedido de Mauro: "ahora necesito que los documentos tengan el prefijo av1_ y
> av2_ dependiendo de a que ciclo hacen referencia."

Alpha v1 usaba `A1_` (mayúscula) y Alpha v2 tenía naming inconsistente: 3 docs
con `AV2_` y 18 sin ningún prefijo (los 11 numerados `00`–`09` + 7 docs internos
de `fase_0_ruido/`/benchmark). Uniformado todo a minúscula `av1_`/`av2_` — 34
archivos renombrados (13 `A1_*` → `av1_*`, 3 `AV2_*` → `av2_*`, 18 sin prefijo →
`av2_*`). Los docs cross-cycle (`README`, `GLOSARIO`, `REGLAS_EVENTOS_*`, etc.),
Gamma (`GAMMA_`/`EXPERIMENT_TRACKER_GAMMA`/`GLOSARIO_GAMMA`), Delta (`DELTA_`/
`EXPERIMENT_TRACKER_DELTA`/`GLOSARIO_DELTA`) y KPCL (`KPCL_`) no se tocaron —
no son específicos de Alpha v1 o v2.

### Gotcha de Windows: rename case-only

3 renames (`AV2_README.md`→`av2_README.md` y 2 más) fallaron en el primer
intento con "DST YA EXISTE" — NTFS en Windows es case-insensitive por
default, así que `pathlib.Path.exists()` (y `git mv` directo) ven
`av2_README.md` como el mismo archivo que `AV2_README.md`, no uno nuevo.
Resuelto con el patrón estándar de dos pasos: `git mv X.md X_tmp.md` y
después `git mv X_tmp.md x.md`.

### Sweep de referencias — 2 pasadas

1. Reemplazo de string exacto sobre nombres con `.md` (mismo patrón que §14/§15,
   ordenado por longitud descendente para evitar que un nombre corto se aplique
   parcialmente antes de que le toque turno a uno más largo que lo contiene).
2. **Pasada nueva para wikilinks** (`[[nombre]]` sin extensión `.md`) — la
   primera pasada no las tocaba porque busca el string con `.md` y los
   wikilinks no lo llevan. Encontrada en 12 archivos, sobre todo los propios
   `av2_0N_*.md` que se referencian mucho entre sí (son el MOC del ciclo activo).
   Detectado con grep dirigido después de la primera pasada, no antes —
   lección para la próxima vez: siempre revisar wikilinks aparte cuando hay
   `.md` con estilo Obsidian en el árbol.

`_MOC.md` reescrito con los 34 nombres nuevos (era el archivo con más
wikilinks stale, se corrigió a mano en vez de confiar en el sweep automático
para ese caso específico).

Verificado: `py_compile`, `streamlit run --headless` → HTTP 200 + `/_stcore/health`
→ `ok`, `pytest tests/` → 16/16. Grep dirigido (ambos estilos, `.md` y wikilink):
0 referencias rotas.

## 17. Décimo addendum (2026-08-16) — fusión total de Gamma + Delta

> Pedido de Mauro: "ahora fusiona en 1 documento, todo lo qeu tenga relacion
> con el ciclo gamma y delta, llamado delta_gamma_antiguio.md" — nombre de
> archivo literal pedido por Mauro, no corregido (probable typo de "antiguo").

A diferencia de §15 (que fusionó solo los experimentos y specs de scripts,
dejando separados instructivo/glosario/tracker/memoria por ciclo), acá se
fusionan **los 15 documentos completos** de Gamma y Delta en 1 solo archivo
(305 KB), incluyendo lo que en §15 se decidió explícitamente NO fusionar
(`GLOSARIO_GAMMA.md`/`GLOSARIO_DELTA.md`, `EXPERIMENT_TRACKER_GAMMA.md`/
`EXPERIMENT_TRACKER_DELTA.md`). Se ejecuta igual porque es un pedido nuevo y
explícito de Mauro que anula el criterio de §15 para este caso puntual — la
razón de §15 (perder la estructura de "capas complementarias") sigue siendo
válida como advertencia, pero Mauro decide que para Gamma/Delta —ambos
archivados, sin desarrollo futuro— vale más tener un solo archivo que
navegar 15.

Orden de fusión (lógico, no alfabético): memoria consolidada primero
(`APRENDIZAJES_GAMMA_DELTA.md`), después todo Gamma completo (instructivo →
implementación → runbook → cómo ejecutar → experimentos → specs de scripts →
tracker → glosario), después todo Delta completo (instructivo → inferencia →
experimentos → reporte de anomalías → tracker → glosario).

### Efecto esperado: colapso de referencias cruzadas internas

Los 15 archivos originales se citaban extensamente entre sí (ej.
`GAMMA_INSTRUCTIVO.md` cita a `EXPERIMENT_TRACKER_GAMMA.md`, que cita a
`GLOSARIO_GAMMA.md`, etc. — típico de una carpeta de investigación con
convención de referencias cruzadas). Al fusionar los 15 en 1, todas esas
citas ahora apuntan al mismo archivo — el sweep de referencias las reescribe
correctamente (no quedan rotas), pero el resultado es ruido visible: texto
como `"...integradas en `delta_gamma_antiguio.md`, `delta_gamma_antiguio.md`
y `delta_gamma_antiguio.md`"` donde antes había 3 nombres distintos.
Detectado con grep dirigido después de la fusión. Se limpiaron
mecánicamente las repeticiones consecutivas del mismo nombre unidas por coma
o "y" (3 casos). El resto de las menciones sueltas (decenas, esparcidas en
el archivo) se dejaron como están — son autorreferencias correctas dentro
del mismo documento, no rotas, solo redundantes; restaurar cada nombre
original habría requerido investigar la cita original de cada una de las
~30 ocurrencias por un beneficio cosmético menor en un archivo ya archivado.

`_MOC.md`: las secciones separadas "Ciclo Gamma" y "Ciclo Delta" (con 8+6
bullets cada una) se colapsaron en una sola sección "Ciclo Gamma + Ciclo
Delta" con 1 bullet apuntando al archivo fusionado — el sweep automático
había dejado 12 bullets duplicados idénticos (`[[delta_gamma_antiguio]]`
repetido), reescrito a mano.

### Resultado

59 → 45 `.md` en la raíz de `Investigacion/`. Verificado: `py_compile`,
`streamlit run --headless` → HTTP 200 + `/_stcore/health` → `ok`,
`pytest tests/` → 16/16. Grep dirigido (`.md` + wikilink): 0 referencias
rotas a los 15 nombres eliminados, en `Investigacion/` y `Knowledge/`.

## 18. Undécimo addendum (2026-08-16) — datos frescos + Alpha v2 en 10 documentos

### 18.1 Verificación de que `av2_` reflejaba resultados reales

> Pedido de Mauro: "todo lo de av2_ esta actualizado en relacion a los
> resultados que hemos obtenido con app_anotacion_av2? si no es asi, actualiza
> todo el contenido de av2 en funcion de los nuevos resultados."

No estaba actualizado. `anotaciones_av2.csv` había crecido de 496 (último
snapshot documentado, 2026-08-11) a 814 sin que nadie regenerara
`features_anotaciones_v2.csv`/`comp_stats_v2.json` ni actualizara el
historial. Se ejecutó `revisar_anotaciones_v2.py` sobre el estado real
(nuevo snapshot v2.5 en el historial), y se recalcularon con scripts —no a
mano— las métricas clásicas (duración/Δpeso/rango/pendiente por categoría,
con percentiles) directamente desde las lecturas crudas, misma metodología
que el doc original usaba. Hallazgo real no trivial: "mixto" en
`candidatos_av2.csv` bajó de 23% a 2% — coincide casi exacto con un dry-run
que el historial describía como "pendiente de aplicar" (`punto_split_mixto`);
todo indica que se aplicó sin dejar registro, se documentó como hallazgo, no
se inventó. `umbrales.json` (v1.3) sigue calibrado contra n=496 —
deliberadamente **no recalibrado**: es una decisión de Motor Matemático que
cambia comportamiento de detección en vivo, se dejó como pendiente explícito
en vez de tocarla sin confirmación.

### 18.2 Fusión de los 21 documentos `av2_` en exactamente 10

> Pedido de Mauro: "fusiona toda la informacion de av2_ en 10 documentos .md,
> si es necesario, renombra, re enumera, pero manten av2_. ordenalo como un
> profesional, la info debe quedar muy ordenada, sin perder nada."

21 → 10, numerados `av2_00` a `av2_09`, por tema (no por origen):

| # | Documento | Fusiona |
|---|---|---|
| 00 | `av2_00_INDICE_Y_VISION_GENERAL.md` | índice comida + índice agua + README de fases/constantes + tracker de experimentos (4→1) |
| 01 | `av2_01_ARQUITECTURA_Y_PIPELINE.md` | arquitectura del pipeline + arquitectura técnica de la app + cómo lanzarla + rutas críticas de datos (4→1) |
| 02 | `av2_02_DISPOSITIVO_Y_DATOS.md` | sin cambio (ya era 1 doc enfocado) |
| 03 | `av2_03_DETECCION_SEGMENTOS.md` | sin cambio |
| 04 | `av2_04_MOTOR_MATEMATICO.md` | features F00 clásicas + evolución 102 features/15 familias + recopilación técnica detallada — el más grande, 88 KB (3→1) |
| 05 | `av2_05_ANOTACION_Y_CATEGORIAS.md` | sin cambio |
| 06 | `av2_06_UMBRALES_Y_REGLAS.md` | sin cambio |
| 07 | `av2_07_RESULTADOS_Y_BENCHMARKS.md` | estadísticas de anotaciones + historial de snapshots + benchmark 20 modelos + diagnóstico de clustering (4→1) |
| 08 | `av2_08_APP_ANOTACION.md` | sin cambio (solo renombrado, quita el `_AV2` redundante) |
| 09 | `av2_09_APRENDIZAJES_CONSOLIDADOS.md` | sin cambio (solo renombrado con número) |

Criterio de agrupación: por tema/audiencia, no por tamaño ni por origen — ej.
`av2_04` junta 3 documentos que responden la misma pregunta ("cómo funciona
el motor matemático") a 3 niveles de profundidad distintos (fórmulas F00 →
evolución a 102 features → recopilación técnica completa), en vez de
mezclarlos con documentos de tema no relacionado solo para balancear tamaños.

Mismo patrón de ejecución que las fusiones anteriores (§15, §17): script
Python concatena con comentario de procedencia por archivo origen, `git rm`
de los originales, sweep de referencias en 2 pasadas (`.md` + wikilink, sin
tocar `.py`). Detectado y corregido: `README.md` tenía 2 bullets idénticos
tras el sweep (`av2_FASE_0_RUIDO_README.md` y `av2_ARQUITECTURA_APP.md`
colapsaron al mismo `av2_01_ARQUITECTURA_Y_PIPELINE.md`) — consolidados a
mano en 1 bullet. `_MOC.md` reescrito con una tabla de los 10 documentos y
qué fusiona cada uno, en vez de la lista plana anterior.

De paso, encontradas y corregidas 4 rutas `09_Investigacion/` (prefijo previo
a toda esta sesión, ninguna de las barridas anteriores las agarró por no ser
nombre de archivo sino prefijo de ruta).

### 18.3 Verificación final

`py_compile`, `streamlit run --headless` → HTTP 200 + `/_stcore/health` →
`ok`, `pytest tests/` → 16/16 (con los datos regenerados de §18.1). Grep
dirigido (`.md` + wikilink) en `Investigacion/` y `Knowledge/`: 0 referencias
rotas a los 21 nombres viejos. 34 `.md` en la raíz de `Investigacion/`
(45 → 34, tras fusionar los 21 `av2_` en 10).
