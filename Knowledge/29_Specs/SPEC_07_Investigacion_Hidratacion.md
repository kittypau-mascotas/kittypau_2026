---
id: spec_07_investigacion_hidratacion
title: SPEC 07 — Reorganización de 09_Investigacion + roadmap para investigar hidratación
type: spec
status: draft
owner: Mauro
created: 2026-08-13
updated: 2026-08-13
confirmado_por_mauro:
  - "⚠️ SUPERADO — ver corrección abajo: KPCL0036 (device_id 3c1c6705-636d-4770-bdcf-21aa6f7225a5)
    es el bebedero — 2026-08-13 (mañana)"
  - "✅ VIGENTE — corrige lo anterior: el bebedero real de Bandida es KPCL0035 (device_id
    0dc601c0-1533-40c5-b606-6d89eb2d4042). El código \"KPCL0036\" se reasignó el 17-jul-2026
    a otra mascota (\"pasturri\", otro dueño) — confirmado contra la tabla `devices` de
    Supabase — 2026-08-13 (tarde)"
  - "Taxonomía de anotación de agua = misma que comida (hidratacion/servido/ruido +
    ciclos_servido_hidratacion), calcada 1:1 — 2026-08-13"
  - "app_anotacion_av2.py se parametriza por perfil de dispositivo (DEVICE_PROFILES) en
    vez de duplicarse — datos 100% separados por device, código/UI/métricas compartidos
    — 2026-08-13"
tags:
  - spec
  - investigacion
  - hidratacion
  - agua
  - reorganizacion
  - fase_0_ruido
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[29_Specs/SPEC_03_Objetivos_Monitoreo]]
  - [[29_Specs/SPEC_04_Metricas_Today_Investigacion]]
  - [[10_Datasets/README_Datasets]]
  - [[09_Sensores/README_Sensores]]
  - [[13_Features/README_ShapeFeatures]]
  - [[14_Experimentos/MOC_Experimentos]]
---

# SPEC 07 — Reorganización de 09_Investigacion + roadmap para investigar hidratación

> Encargo de Mauro (2026-08-13): replicar todo lo hecho para el plato de comida
> ([[29_Specs/SPEC_03_Objetivos_Monitoreo]] Pilar 2 ya lo marcaba como el gap más grande de
> producto) pero para el plato de agua — como **línea de investigación separada**, sin
> perder ni romper nada de lo ya construido, empezando específicamente desde
> `Ciclo Alpha v2/fase_0_ruido/app_anotacion_av2.py`. Ejecución en curso desde 2026-08-13
> (roadmap §7) — ver estado real por paso en la tabla de §7, no asumir que todo lo descrito
> en este spec ya está implementado.

---

## ⚠️ Corrección crítica (2026-08-13, tarde) — el bebedero es KPCL0035, no KPCL0036

Todo lo que este documento dice sobre **"KPCL0036 es el bebedero"** (§0 punto 2, §2.2,
§2.3, frontmatter) fue confirmado por Mauro **en la mañana** del 2026-08-13 y ejecutado
(pasos 2 y 3 del roadmap, §7) — pero resultó estar basado en una identidad de device que
ya no es la correcta. Se detectó y corrigió **esa misma tarde**, a partir de una pregunta
de Mauro sobre por qué el gráfico general no mostraba data nueva.

**Qué pasó:** el código legible "KPCL0036" es una etiqueta que Supabase reasigna a
distintos `device_id` (UUID) físicos a lo largo del tiempo — no es una identidad estable.
El UUID `3c1c6705-636d-4770-bdcf-21aa6f7225a5` (el que analizamos en §2.2/§2.3, con la
cadencia rápida de ~1,16s) fue en su momento el bebedero de Bandida, pero es un device
**retirado** — ya no existe en la tabla `devices` de Supabase. El código "KPCL0036" se
reasignó el **17-jul-2026** a un UUID nuevo (`7573c1d6-25bf-4ad2-89eb-7f29a1313c5a`) que
pertenece a **otra mascota, "pasturri" (perro), de otro dueño** — nada que ver con Bandida.

**La identidad real, confirmada por Mauro contra la tabla `devices` de Supabase:**

| Código | UUID actual | Dueño | Rol |
|---|---|---|---|
| KPCL0034 | `3a460074-e7c3-41bf-ae5a-a011445f927a` | 🐱 Bandida | Comedero — apagado desde 23-jul-2026 |
| **KPCL0035** | **`0dc601c0-1533-40c5-b606-6d89eb2d4042`** | 🐱 Bandida | **Bebedero — confirmado por Mauro 2026-08-13** |
| KPCL0036 | `7573c1d6-25bf-4ad2-89eb-7f29a1313c5a` | 🐕 pasturri (otro dueño) | Irrelevante para esta investigación |

KPCL0034 y KPCL0035 se crearon en Supabase el mismo minuto (25-may-2026 01:51/01:52) y se
apagaron juntos el 23-jul-2026 (30 min de diferencia) — consistente con estar en la misma
ubicación física. KPCL0035 se reconectó solo el 10-ago-2026 y sigue activo; KPCL0034 no ha
vuelto a reportar.

**Qué ya se corrigió (2026-08-13, tarde):**
- `01_genera_candidatos.py` / `revisar_anotaciones_v2.py` / `app_anotacion_av2.py`:
  perfil `"KPCL0036"` renombrado a `"KPCL0035"`, UUID actualizado.
- `supabase_client.py`: agregado `KPCL0035_UUIDS` + `BANDIDA_UUIDS`, el sync incremental
  ahora trae ambos devices de Bandida (antes solo traía KPCL0034).
- `data_agua/candidatos_agua.csv` regenerado desde cero con datos reales de KPCL0035:
  **288 candidatos** (217 bajada/75%, 69 subida/24%, 2 mixto/1%; período 25-may → 13-ago
  2026, 104.573 lecturas) — reemplaza los 393 candidatos generados por error contra
  KPCL0036 (que en realidad eran de abril-mayo, del device viejo retirado).

**Qué queda sin resolver:** el UUID retirado `3c1c6705...` — ¿es realmente el mismo
bebedero físico que luego pasó a ser KPCL0035 (reemplazo de hardware/reprovisioning), o es
un device distinto? Las fechas encajan (el viejo termina 5-may, KPCL0035 empieza 25-may),
pero no está confirmado. Mientras tanto, el perfil de agua usa **solo** el UUID de
KPCL0035 — los datos de abril-mayo del UUID retirado quedan fuera hasta confirmar la
continuidad.

El resto de este documento (§0 punto 2 en adelante, §2.2, §2.3) queda **como registro
histórico de la investigación** — se explica cómo llegamos a la conclusión errónea, útil
para no repetir el mismo error de razonamiento (confiar en el código legible en vez de
cruzar contra la tabla `devices` con el UUID). No usar esos números/UUID para trabajo
nuevo — usar siempre la tabla de arriba.

---

## 0. Resumen ejecutivo

1. **El motor matemático (`shape_features_v2.py`) y el proceso (candidatos → anotación →
   features → umbrales) son reutilizables como *infraestructura* — pero los templates de
   forma y los umbrales calibrados son 100% específicos de comida y no transfieren sin
   recalibrar.** Comer y beber son físicamente distintos en cómo afectan el peso del bowl:
   evaporación (deriva lenta y continua, no un evento discreto), lengüetazos vs. mordiscos,
   splash mecánico, dinámica de rellenado. Ver §3.
2. **⚠️ SUPERADO — ver corrección arriba.** ~~Confirmado por Mauro (2026-08-13): KPCL0036
   es el bebedero.~~ El bebedero real es **KPCL0035**
   (`0dc601c0-1533-40c5-b606-6d89eb2d4042`). El análisis de señal de esta sección (821.785
   lecturas, cadencia 1,16s, 9,09% en 0) corresponde al UUID `3c1c6705...`, retirado — no
   se ha repetido todavía sobre KPCL0035. Ver §2.
3. **✅ Revisado (2026-08-13): `app_anotacion_av2.py` tiene un seam angosto y limpio para
   volverse multi-dispositivo.** Leído el código real: hay **un solo lugar** donde filtra
   por device (`df1[df1["device_id"].isin(KPCL0034_UUIDS)]`) y un bloque de ~10 constantes
   de módulo (rutas de archivo, UUIDs, taxonomía, metas) que hoy están hardcodeadas a
   comida. Eso cambia la propuesta: en vez de una app hermana duplicada, **una sola app
   parametrizada por perfil de dispositivo** — los **datos** quedan 100% separados por
   dispositivo (carpetas distintas, cero mezcla), pero el **código/UI/métricas** se
   comparten, así que Tab 2/4/5 (las métricas) funcionan igual para agua sin reescribir
   nada. Ver §5.

---

## 1. Mapa actual de `09_Investigacion/` (verificado en esta sesión)

```
09_Investigacion/
├── README.md, _MOC.md, GLOSARIO.md, EXPERIMENT_TRACKER.md,
│   ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md, 01–08_*.md    ← docs de la era Ciclo Alpha v1
├── plot_kpcl_experimento.py, serve_kpcl_dashboard.py,
│   abrir_kpcl_dashboard.ps1, kpcl_pruebas_eventos.html,
│   kpcl0034_full_eventos.csv, kpcl0034_sin_batera_actual.csv,
│   kpcl0036_sin_batera_actual.csv                       ← dashboard operativo + CSVs Colab
├── Power Bi_Supabase/kittypau_supabase_2026.pbix         ← sin README, propósito no documentado
├── Ciclo Alpha/                                          ← v1, CERRADO (11 exp. LightGBM)
│   ├── fase_1_extraccion … fase_4_visualizacion, fase_3_nn, experiments/
│   ├── Exploracion_Gamma_Delta_2026/                     ← Gamma+Delta, ARCHIVADO (151 archivos)
│   └── venv/                                             ← gitignored, no versionado
└── Ciclo Alpha v2/                                       ← ACTIVO — detección por segmentos
    ├── README.md, 00_INDICE_AV2.md … 09_EVOLUCION_MOTOR_MATEMATICO.md,
    │   APRENDIZAJES_CONSOLIDADOS.md
    ├── fase_0_ruido/                                      ← ★ TODO el pipeline real vive acá
    ├── fase_1_extraccion … fase_6_evaluacion/              ← solo README.md, nunca implementadas
    └── experiments/README.md
```

### 1.1 — `fase_0_ruido/` es la unidad real de trabajo, no solo "fase 0"

El README de `Ciclo Alpha v2/` planificó 7 fases separadas. En la práctica, **todo el
pipeline que funciona hoy vive dentro de `fase_0_ruido/`** — candidatos, anotación,
features, umbrales, tests — y `fase_1_extraccion/` … `fase_6_evaluacion/` siguen siendo
placeholders `estado: pendiente` sin un solo script. Esto no es un error a corregir, es
cómo evolucionó el proyecto (confirmado en `fase_0_ruido/README.md`: *"la fase evolucionó
en una app completa de anotación + análisis"*). **Implicación para agua:** replicar
`fase_0_ruido/` completo es replicar el 100% del valor; no hace falta poblar
`fase_1..6_*/` para tener un pipeline funcional — de hecho no se hizo ni para comida.

**Contenido de `fase_0_ruido/` (51 archivos trackeados, no tocar ninguno):**

| Pieza | Archivo | Rol |
|---|---|---|
| Detección de candidatos | `01_genera_candidatos.py` | Segmenta la serie de peso en eventos (`bajada`/`subida`/`mixto`) |
| Auditoría | `02_auditar_discrepancias.py` | Detecta desacuerdos motor↔humano |
| Recalibración | `03_recalibrar_umbrales.py` | Deriva `umbrales.json` desde anotaciones reales |
| App de anotación | `app_anotacion_av2.py` | Streamlit, 9 tabs (0–8), lazy loading por tab |
| Motor Matemático | `shape_features_v2.py` | 102 features en 15 familias (F00–F14) + Evidence Engine |
| Extracción de features por anotación | `revisar_anotaciones_v2.py` | Genera `features_anotaciones_v2.csv` + `comp_stats_v2.json` |
| Sync incremental | `supabase_client.py` | Descarga nuevas lecturas desde Supabase |
| Config | `config/umbrales.json` | Umbrales del detector, editables desde Tab 4 |
| Datos | `data/*.csv`, `data/backups/` | Candidatos, anotaciones (CRÍTICO), backups diarios automáticos |
| Exploración histórica | `0A_exploracion/`, `0B_deteccion_inactividad/`, `0C_modelo_ruido/` | Ya marcados como "no en pipeline activo, referencia metodológica" en su propio README — no ejecutan en producción |
| Tests | `tests/test_candidatos.py`, `test_evidence_engine.py`, `test_split_mixto.py` | Cobertura del pipeline |

### 1.2 — Qué está versionado vs. qué es basura de disco local

`Ciclo Alpha/venv/` (entorno Python completo) y `Ciclo Alpha/fase_4_visualizacion/node_modules/`+`dist/`
**ya están en `.gitignore`** (`**/venv/`, `node_modules/`) — no son deuda de git, son
basura de disco regenerable. Bajo riesgo, baja prioridad, no forman parte de este spec más
allá de mencionarlo como candidato de limpieza local si Mauro quiere liberar espacio.

---

## 2. El hallazgo crítico — hay data cruda real de agua, pero no está limpia

### 2.1 — El schema ya soporta agua end-to-end; los datos no

- `devices_device_type_check` (constraint SQL) ya incluye `water_bowl` y `bebedero` desde
  2026-03-04 — el producto siempre planeó soportar bebederos.
- `public.audit_events` ya tiene taxonomía para hidratación: `inicio_hidratacion` /
  `termino_hidratacion`, y `inicio_servido`/`termino_servido` es compartido entre ambos
  tipos de bowl (rellenar el bebedero es "servido" igual que rellenar el comedero).
- `readings.csv`/`readings_rows.csv` tienen columnas `water_ml` y `flow_rate` en el schema.

**Pero, verificado fila por fila en esta sesión sobre los 1.355.890 registros combinados
de `readings.csv` (1.085.889 filas, 5 devices) y `readings_rows.csv` (270.001 filas, 3
devices): `water_ml` y `flow_rate` están en NULL en el 100% de las filas, sin excepción.**
Ningún device de los 8 UUIDs presentes en estos dos archivos ha reportado jamás un valor
en esas columnas.

### 2.2 — [⚠️ registro histórico, superado] "KPCL0036 es el bebedero" — y tiene más data que el comedero

> **Esta sección quedó desactualizada la tarde del mismo día en que se escribió** — ver la
> corrección al inicio del documento. El UUID `3c1c6705...` analizado acá es un device
> retirado; el código "KPCL0036" hoy pertenece a otra mascota. El bebedero real de Bandida
> es **KPCL0035** (`0dc601c0-1533-40c5-b606-6d89eb2d4042`). Se conserva el análisis debajo
> como registro de cómo se llegó a la conclusión errónea (basada en volumen de datos +
> `device_type`, sin cruzar contra la tabla `devices` por UUID).

Resuelve una pregunta abierta sin cerrar en [[10_Datasets/README_Datasets]] ("Mauro
debería confirmar contra Supabase qué es exactamente ese device dominante", refiriéndose
al UUID `3c1c6705-636d-4770-bdcf-21aa6f7225a5`, que domina `readings.csv`).

**Ranking de devices por volumen de datos, `readings.csv` + `readings_rows.csv`
combinados (verificado fila por fila en esta sesión):**

| # | device_id | `readings.csv` | `readings_rows.csv` | Total | Identidad |
|---|---|---:|---:|---:|---|
| 1 | `3c1c6705-636d-4770-bdcf-21aa6f7225a5` | 821.785 | 0 | **821.785** | **KPCL0036 — bebedero ✅ confirmado** |
| 2 | `3a460074…` + `9510a455…` (mismo device, 2 UUIDs) | 154.857 | 167.959 | **322.816** | **KPCL0034 "Bandida" — comedero, confirmado** |
| 3 | `67aaaf28-2db4-49c0-a141-4b38ed68cbac` | 108.587 | 0 | 108.587 | Sin documentar en ningún archivo del repo |
| 4 | `0dc601c0-1533-40c5-b606-6d89eb2d4042` | 0 | 94.468 | 94.468 | KPCL0035 — `food_bowl` (DHT11 en vez de AHT10) |
| 5 | `418565e7-6683-440c-80e6-666363574cec` | 0 | 7.574 | 7.574 | "Device desconocido" (literal, en `GLOSARIO.md`) |
| 6 | `efdb7dd1-3a6d-496d-a51b-cad4a17326e1` | 532 | 0 | 532 | Sin documentar |
| 7 | `216b14dc-187f-4e9b-b84e-1f5c421f7ac7` | 128 | 0 | 128 | Sin documentar |

**El bebedero tiene 2,5× más lecturas que el comedero de referencia de todo el proyecto**
— contraintuitivo, pero consistente con el dato físico de que su `weight_grams`/
`food_content_g` llegan hasta ~1000g (vs. el rango 80–200g documentado para el comedero de
Bandida), coherente con un reservorio de agua más grande que un plato de comida.

**Por qué la documentación se contradice a sí misma en el tiempo (para quien retome esto
después):**

| Fuente | Qué dice de KPCL0036 |
|---|---|
| `07_AUDITORIA_KPCL0036_ERROR_PESO.md` (abril/mayo 2026) | *"Device: KPCL0036 (water_bowl)"* — con una anomalía de peso (spikes, deriva de línea base) atribuida a voltaje bajo afectando la celda de carga |
| `README.md` raíz (actualizado 2026-06-14) | *"KPCL0036 \| water_bowl \| Fuente de agua \| Peso del agua en gramos"* |
| `GLOSARIO_GAMMA.md` (Ciclo Gamma) | *"KPCL0036 — Dispositivo hidratación (water_bowl). Excluido del pipeline ML por error de peso"* |
| `kpcl0036_sin_batera_actual.csv` (dump actual) — verificado en esta sesión | `device_type = "comedero"` en el 100% de sus 821.803 filas — pero es un *join* contra el estado **actual** de la tabla `devices`, no histórico |
| [[09_Sensores/README_Sensores]] (2026-06-29, la más reciente) | *"KPCL0036 \| food_bowl \| Activo — usado en pruebas comparativas"* |

Tres fuentes independientes de distintas épocas (abril, junio, Ciclo Gamma) documentan
KPCL0036 como bebedero. La única señal en contrario es el `device_type` del export actual,
que refleja una reclasificación posterior (probablemente cuando se reutilizó el hardware
para pruebas comparativas de comedero, después de que la anomalía de voltaje lo hiciera
poco confiable como bebedero) — no borra su rol original ni sus ~800K lecturas históricas.

**Lo que sigue sin resolver — la anomalía de hardware, no la identidad:**
1. Spikes y deriva de baseline documentados, atribuidos a voltaje de batería bajo — sin
   resolver, sin saber qué fracción del período está contaminada.
2. No se puede aislar el tramo "genuinamente bebedero" por `device_type` en el export
   (siempre dice "comedero") — hay que aislarlo por rango de fecha + UUID y cruzar con
   `public.audit_events` para confirmar cuándo se reclasificó.
3. Nunca se usó `water_ml`/`flow_rate` — todo lo que hay es `weight_grams`, igual que
   comida, así que el pipeline de comida (pensado para peso) es directamente aplicable en
   forma de datos de entrada, aunque no en templates/umbrales (§3).

**Recomendación actualizada:** esto ya no es "esperar a tener datos" — es auditar los que
hay. El diagnóstico de calidad de señal que el paso 4 de §7 proponía como primer paso
técnico **se adelantó parcialmente en esta sesión** — ver §2.3.

### 2.3 — [⚠️ registro histórico, superado] Diagnóstico de señal del UUID retirado `3c1c6705...`

> Igual que §2.2: este diagnóstico es del device retirado, no de KPCL0035 (el bebedero
> real). Sirve como referencia de metodología (cómo se audita cadencia/% en cero) para
> repetir sobre KPCL0035 cuando corresponda — pero los números concretos de abajo no
> describen el bebedero actual.


Corrido sobre las 821.785 filas de `kpcl0036_sin_batera_actual.csv` (`row_source=reading`).
Todavía es solo diagnóstico — no se generó ningún candidato ni se tocó `fase_0_ruido/`.

**Cobertura temporal — mucho más corta de lo que sugiere el volumen de filas:**

| Métrica | Valor |
|---|---|
| Rango de fechas | `2026-04-08` → `2026-05-05` (**27 días**, no meses) |
| Filas por día | ~26.000–34.000/día, estable (excepto 2 días parciales: 02-may con 3.846, 05-may con 15.735 — probablemente inicio/fin de ventana) |
| **Cadencia mediana entre lecturas** | **1,16 segundos** — p10=0,25s, p90=4,78s |

**La cadencia es el hallazgo más importante de este diagnóstico.** KPCL0034 reporta
nominalmente cada ~30s ([[09_Sensores/README_Sensores]]). KPCL0036 reportó, durante estas
4 semanas, **~15–25× más rápido** — eso es lo que explica que 27 días de agua tengan más
filas que ~80 días de comida (821.785 vs. 322.816), no que el bebedero se haya usado más.
**No se sabe todavía si esto es diseño intencional (un sensor de agua necesitaría más
resolución para capturar lengüetazos cortos) o un síntoma más de la anomalía de hardware ya
documentada (un dispositivo con voltaje inestable reportando en loop).** Hay que resolverlo
antes de decidir si `RESAMPLE_TARGET_S=30` (constante heredada de comida) sigue siendo la
elección correcta para agua — con esta cadencia, cada bucket de 30s promedia ~26 lecturas
crudas, lo cual en principio suaviza bien el ruido, pero vale la pena confirmarlo con datos
en vez de asumirlo.

**Distribución de `weight_grams` — señal real, con dos artefactos claros en los extremos:**

| Métrica | Valor |
|---|---|
| Percentiles (p5/p10/p25/p50/p75/p90/p95) | 0 / 94 / 230 / **313** / 376 / 405 / 424 g |
| Media / desvío estándar | 285,3 g / 121,4 g |
| Lecturas en exactamente `0` | **74.592 (9,09%)** |
| Lecturas en exactamente `1000` (tope del rango) | 326 (0,04%) |
| Saltos entre lecturas consecutivas con `\|Δ\|>20g` | 252 de 820.668 (0,03%) — pero el salto máximo registrado toca ±1000g |

El grueso de la señal (entre p10 y p95, ~94–424g) tiene forma de distribución real, no de
sensor trabado — coherente con un reservorio de agua cuyo nivel varía. Pero **9 de cada 100
lecturas caen exactamente en 0** — mucho más que ruido de sensor normal. Candidatos a
explicarlo, en orden de probabilidad, ninguno confirmado: (a) el bowl efectivamente vacío
o retirado en tramos reales (coincide con los eventos `kpcl_sin_plato`/`kpcl_con_plato` de
calibración vistos en `audit_events`, aunque esos son solo 8 eventos puntuales, no 74.592
lecturas), (b) dropout del sensor devolviendo `0` como valor por defecto en vez de `null`,
(c) la misma anomalía de voltaje bajo documentada en `07_AUDITORIA_KPCL0036_ERROR_PESO.md`
manifestándose como caída a cero en vez de spike hacia arriba. **No se puede saber cuál sin
graficar la serie temporal completa** (candidato natural para la Tab 0 "Vista Global" de
una app de anotación de agua, ver §5.1).

**Ground truth manual: prácticamente inexistente.** De 18 `audit_events` totales asociados
a este device en todo el período, solo **1 par** es `inicio_hidratacion`/`termino_hidratacion`
— una sola sesión de bebida jamás etiquetada más que esa. Comida arrancó su Fase 0 con
metas de 40 anotaciones por categoría y terminó con 400+; agua hoy tiene **1**. Esto no
cambia por tener 821K lecturas crudas — cambia solo con trabajo de anotación manual nuevo,
exactamente como el roadmap de §7 ya planteaba (pasos 5–6), y confirma que "hay datos
crudos" y "hay dataset anotado" siguen siendo cosas completamente distintas acá.

---

## 3. Por qué esto no es un copy-paste — diferencias físicas comida vs. agua

El pipeline de comida fue diseñado y calibrado 100% sobre la física de **morder sólido**:
el peso baja en rampas con plateaus definidos, cada mordisco es un evento discreto. Beber
agua es un problema de señal distinto:

| Fenómeno | Comida (KPCL0034) | Agua (hipótesis a validar con datos reales) |
|---|---|---|
| Pérdida de masa sin interacción | Ninguna — el plato no pierde peso sin que la mascota coma | **Evaporación** — deriva lenta y continua, sin evento discreto. Puede generar falsos "candidatos" de tipo `bajada` que no son consumo. |
| Magnitud del evento | Mordiscos de varios gramos, sesión completa ~12g promedio | Lengüetazos probablemente de fracciones de gramo por lengüetazo — el delta por evento individual puede acercarse al ruido del sensor, no estar claramente separado como en comida |
| Ruido mecánico | Vibración mínima, ruido principalmente eléctrico (HX711 + voltaje) | Posible **splash** al beber — ruido mecánico de naturaleza distinta al ruido eléctrico ya caracterizado |
| Relleno | "Servido" — evento humano, ascenso brusco | Puede ser manual (igual que servido) o mediante bebederos con reservorio/flujo continuo — dinámica de ascenso potencialmente distinta |
| Forma de consumo sostenido | Rampas con plateaus (`tpl_doble_rampa`, `tpl_alim_escalonada` — los templates F12 más discriminativos) | Sin evidencia todavía — **no asumir que los mismos templates aplican** |

### 3.1 — Qué del Motor Matemático es transferible tal cual, qué no

`shape_features_v2.py` tiene 15 familias (F00–F14, ver [[13_Features/README_ShapeFeatures]]).
Clasificación honesta, mismo estándar que ya exige el proyecto para toda constante nueva
(justificarla contra datos reales, no inventarla):

**🟢 Transferibles como infraestructura (son genéricas de cualquier señal de peso
resampleada, no específicas de la forma de comer):**
F00 (estadísticas básicas), F01–F02 (derivadas), F03 (energía), F05 (temporales), F06
(entropía), F07 (frecuencial), F08 (complejidad), F09 (autocorrelación), F10 (percentiles).
El código de `extraer_features()` no necesita reescribirse — se re-ejecuta igual sobre
señal de agua.

**🟡 Necesitan reconsiderar parámetros, no la fórmula:**
F04 (geometría de la curva — straightness/convexidad puede comportarse distinto con
deriva por evaporación de fondo), F11 (cambios de régimen — depende de cuán "ruidosa" es
la señal de agua vs. comida).

**🔴 No transferibles — deben recalibrarse desde cero con anotaciones reales de agua:**
F12 (templates canónicos — `tpl_doble_rampa`, `tpl_sigmoide`, etc. son formas
específicas de comer y servir comida, no hay ninguna razón para asumir que beber tiene la
misma forma), F13 (similitudes contra esos templates), F14 (Evidence Engine — sus pesos
se derivan de `comp_stats_v2.json`, que es 100% estadística de las 496+ anotaciones de
comida; para agua hace falta su propio `comp_stats` desde anotaciones de agua).
**`umbrales.json` tampoco transfiere** — es la regla del proyecto (ya aplicada a
`hunger-bar.ts`, ver [[05_API/SPEC_HungerBar_Alimentacion]] §0) y aplica igual acá: ningún
umbral se inventa sin datos reales detrás.

---

## 4. Qué se preserva intacto — no negociable

> **Revisado 2026-08-13:** el punto 1 se actualiza a la luz de §5 — ahora el plan
> explícitamente sí toca `app_anotacion_av2.py` (a pedido de Mauro). "No tocar" se
> reformula como "no romper", con una condición verificable en vez de una prohibición
> absoluta.

- **`app_anotacion_av2.py` puede editarse, pero solo de forma aditiva y verificable:**
  cualquier cambio debe (a) dejar el comportamiento de comida bit-a-bit idéntico cuando el
  perfil activo es `KPCL0034` (mismos archivos leídos/escritos, mismos resultados en los 9
  tabs), y (b) pasar los 3 tests existentes de `tests/` antes y después del cambio. Esto
  reemplaza al "cero archivos movidos, renombrados ni editados" que este documento tenía
  originalmente — ver §5 para el detalle de qué cambia y por qué es seguro.
- El resto de `fase_0_ruido/` (scripts, `config/umbrales.json`, `data/*.csv` de comida)
  sigue intacto salvo que §5 lo liste explícitamente. Es la fuente de verdad de
  `hunger-bar.ts` en producción (ver [[05_API/SPEC_HungerBar_Alimentacion]] y
  [[29_Specs/SPEC_01_Errores_Prioritarios]] nota permanente sobre `readings.csv`).
- `Docs/11_Data/2026/readings.csv` (estático, NUNCA modificar) y `readings_rows.csv`
  (append-only) — regla ya vigente en `CLAUDE.md` y en `fase_0_ruido/README.md`. Estos dos
  archivos son compartidos y ya contienen las lecturas de agua (filtradas por otro UUID) —
  no hace falta ni se debe duplicarlos.
- El resto de `Ciclo Alpha v2/` (docs 00–09, `APRENDIZAJES_CONSOLIDADOS.md`) — quedan como
  documentación específica del ciclo de comida.
- `Ciclo Alpha/` (v1) y `Exploracion_Gamma_Delta_2026/` (Gamma+Delta) — contenido
  archivado, no se edita ni se borra nada; ver §6 para el único cambio propuesto (reforzar
  la señal de "archivado", no mover ni renombrar la carpeta).

---

## 5. Propuesta — datos separados por dispositivo, app compartida por perfil

> **Revisa este pivote respecto a la versión anterior de este documento:** la primera
> propuesta era una app hermana + carpeta hermana completa (`Ciclo Alpha v2 Agua/`). Tras
> leer el código real de `app_anotacion_av2.py`, esa duplicación ya no es necesaria — el
> archivo tiene un seam angosto (§5.1) que hace segura y barata la parametrización.
> **Los datos siguen 100% separados por dispositivo** (eso no cambió); lo que cambia es que
> el código/UI ya no se duplica.

```
09_Investigacion/Ciclo Alpha v2/fase_0_ruido/
├── app_anotacion_av2.py          ← MISMO archivo, parametrizado por perfil (§5.1)
├── 01_genera_candidatos.py       ← ídem — recibe perfil de dispositivo
├── revisar_anotaciones_v2.py     ← ídem
├── shape_features_v2.py          ← SIN CAMBIOS — el motor ya es genérico (§3.1); se importa igual
├── supabase_client.py            ← SIN CAMBIOS — ya es genérico, filtra por UUID el caller
├── config/
│   ├── umbrales.json             ← SIN CAMBIOS — comida
│   └── umbrales_agua.json        ← NUEVO — mismo shape, valores propios de agua
├── data/                         ← SIN CAMBIOS — comida (candidatos_av2.csv, anotaciones_av2.csv, …)
└── data_agua/                    ← NUEVO — misma estructura que data/, cero mezcla
    ├── candidatos_agua.csv
    ├── anotaciones_agua.csv       ← CRÍTICO, igual que su par de comida
    ├── ciclos_servido_hidratacion.csv
    ├── comp_stats_agua.json
    ├── _cache_lecturas_agua_30s.parquet
    └── backups/
```

Documentación (fuera de `fase_0_ruido/`, sin riesgo de tocar código):

```
09_Investigacion/Ciclo Alpha v2/
├── 00_INDICE_AV2.md              ← SIN CAMBIOS — sigue siendo 100% comida
└── 00_INDICE_AV2_AGUA.md         ← NUEVO — MOC propio para hidratación, no se mezcla con el de comida
```

**Por qué esto sí cumple "separar las líneas investigativas, son materiales distintos"
sin duplicar código:** los *datos* (lo que realmente diferencia una línea de
investigación de otra — candidatos, anotaciones, umbrales, estadísticas calibradas) viven
en carpetas totalmente separadas, con nombres de archivo distintos, sin ningún riesgo de
que un script lea o escriba en el archivo equivocado. El *código* (la UI de Streamlit, la
lógica de caché, los cálculos de métricas) es infraestructura reusable — mantenerlo
separado no protege nada, solo duplica ~4.800 líneas y el trabajo de mantenerlas
sincronizadas cada vez que se corrija un bug en una copia y no en la otra.

### 5.1 — ✅ Decisión tomada (2026-08-13): parametrizar `app_anotacion_av2.py` por perfil de dispositivo

Código real leído (no solo documentación) para confirmar que esto es seguro. El archivo
tiene exactamente **un bloque de constantes de módulo** (líneas ~72–137) y **una sola
línea** donde filtra por dispositivo:

```python
# líneas 250–253 — el único lugar donde se filtra por device en todo el archivo
df = pd.concat(
    [df1[df1["device_id"].isin(KPCL0034_UUIDS)],
     df2[df2["device_id"].isin(KPCL0034_UUIDS)]],
    ignore_index=True,
)
```

Todo lo demás (los 9 tabs, `calcular_metricas()`, `build_chart()`, el Evidence Engine)
opera sobre los DataFrames ya cargados (`df_lec`, `df_cand`, `df_anot`, `cs_dict`) sin
saber ni importarle de qué dispositivo vinieron — **por eso las mismas métricas de comida
(Tab 2 Analizar Curva, Tab 4 Panel de Features, Tab 5 Motor Matemático) funcionan para
agua automáticamente, sin reescribir un solo tab**, una vez que el bloque de constantes
lee de un perfil en vez de estar hardcodeado.

**Diseño propuesto — `DEVICE_PROFILES`:**

```python
DEVICE_PROFILES = {
    "KPCL0034": {                                   # comida — valores actuales, sin cambio
        "device_code": "KPCL0034",
        "rol": "alimentacion",
        "uuids": {"9510a455-...", "3a460074-..."},
        "data_dir": DATA_DIR,                        # data/ (ya existente)
        "candidatos_csv": "candidatos_av2.csv",
        "anotaciones_csv": "anotaciones_av2.csv",
        "ciclos_csv": "ciclos_servido_alimento.csv",
        "comp_stats_json": "comp_stats_v2.json",
        "umbrales_json": CONFIG_DIR / "umbrales.json",
        "cache_parquet": "_cache_lecturas_30s.parquet",
        "categorias": CATEGORIAS_COMIDA,              # dict actual, renombrado
        "metas": {"alimentacion": 40, "servido": 20, "ruido": 30},
    },
    "KPCL0035": {                                   # agua — nuevo (corregido 2026-08-13, ver banner arriba)
        "device_code": "KPCL0035",
        "rol": "hidratacion",
        "uuids": {"0dc601c0-1533-40c5-b606-6d89eb2d4042"},
        "data_dir": DATA_DIR_AGUA,                    # data_agua/ (nuevo)
        "candidatos_csv": "candidatos_agua.csv",
        "anotaciones_csv": "anotaciones_agua.csv",
        "ciclos_csv": "ciclos_servido_hidratacion.csv",
        "comp_stats_json": "comp_stats_agua.json",
        "umbrales_json": CONFIG_DIR / "umbrales_agua.json",
        "cache_parquet": "_cache_lecturas_agua_30s.parquet",
        "categorias": CATEGORIAS_AGUA,                # nuevo, con las descripciones de §5.2
        "metas": {"hidratacion": 40, "servido": 20, "ruido": 30},
    },
}
```

Un selector arriba de la app (`st.sidebar.selectbox("Dispositivo", DEVICE_PROFILES)`)
define `ACTIVE = DEVICE_PROFILES[seleccionado]`; el bloque de constantes actual
(`CANDIDATOS_CSV`, `ANOTACIONES_CSV`, `UMBRALES_JSON`, `COMP_STATS_JSON`, `CICLOS_CSV`,
`_LECTURAS_CACHE_PARQUET`, `KPCL0034_UUIDS`, `DEVICE_CODE`, `CATEGORIAS`, `METAS_AV2`) pasa
a derivarse de `ACTIVE[...]` en vez de ser literales. `RAW_DATA_DIR`/`READINGS_CSV`/
`READINGS_ROWS_CSV` **no cambian** — son compartidos, ya contienen ambos devices, el
filtro de la línea 250-253 pasa a usar `ACTIVE["uuids"]`.

**Un detalle real que sí exige juicio, no solo mecánica:** las descripciones dentro de
`CATEGORIAS` traen números calibrados de comida hardcodeados en el texto (ej. *"peso baja
5–15 g en 4–8 min... Monotonía ≈ −0.20... ZCR ≈ 0.67"*). `CATEGORIAS_AGUA` no puede
copiar esos números — hay que dejarlos en blanco o genéricos ("por determinar, calibrar
tras las primeras N anotaciones") hasta que existan suficientes anotaciones de agua para
calcularlos de verdad, mismo principio de §3 aplicado a la UI: ningún número se inventa.

**Riesgo y mitigación:** este cambio toca un archivo que sostiene la investigación activa
de comida. Mitigación concreta, no solo "tener cuidado": (1) el perfil `KPCL0034` debe
producir exactamente los mismos paths/UUIDs que hoy — un diff de comportamiento, no de
código, es la prueba real; (2) correr `tests/test_candidatos.py`,
`tests/test_evidence_engine.py`, `tests/test_split_mixto.py` antes y después; (3) probar
la app en vivo con el perfil comida seleccionado y confirmar visualmente que los 9 tabs
se ven igual antes de tocar nada del perfil agua.

**⚠️ Corrección importante (2026-08-13, encontrada al revisar el código antes de tocarlo):**
la frase "un solo lugar filtra por device" de más arriba es exacta para el filtro de
UUID/device_id (1 línea), pero **no** para los *nombres* de categoría. Contadas en el
archivo real: **30 apariciones literales de `"alimentacion"` y 23 de
`"ciclo_servido_alimento"`** como string — mezcla de lookups a `CATEGORIAS["alimentacion"]`
(dict) y comparaciones de datos (`df_anot["categoria"] == "alimentacion"`). Esto **no
afecta el paso 2 del roadmap** (perfil único `KPCL0034`, la clave no cambia de nombre, cero
riesgo) — pero si el perfil de agua usa literalmente `"hidratacion"` como nombre de
categoría (§5.2), hace falta resolver esas ~50 apariciones antes de activar ese perfil, no
antes. Dos caminos, a decidir en el paso 3 del roadmap (§7), no ahora:
- **(a) Indirección quirúrgica:** introducir `CAT_PRINCIPAL = ACTIVE["rol"]` (`"alimentacion"`
  o `"hidratacion"`) y `CAT_CICLO = ACTIVE["cat_ciclo"]`, reemplazar cada aparición real de
  `CATEGORIAS["alimentacion"]`/`"ciclo_servido_alimento"` (dict lookups y comparaciones de
  dato) por la variable — correcto de verdad, pero ~50 sitios a revisar uno por uno, no un
  reemplazo global de texto (el string "alimentacion" también aparece en contextos que no
  deben tocarse, como docstrings).
- **(b) Clave interna universal:** el perfil de agua usa `"alimentacion"` como *clave interna*
  de Python/CSV también (por consistencia de código), y `"Hidratación"` queda solo como
  *label visible* en `CATEGORIAS["alimentacion"][0]`. Cero líneas nuevas que tocar, pero
  rompe la promesa de §5.2 de que la columna `categoria` de `anotaciones_agua.csv` diga
  literalmente `hidratacion` — quedaría diciendo `alimentacion` con una etiqueta de UI que
  dice "Hidratación". Inconsistente para quien lea el CSV crudo.

No se resuelve acá — es una decisión real con trade-offs, se toma en el paso 3 de §7 cuando
se agregue el perfil de agua, no en el paso 2 (que no la necesita).

**Estado 2026-08-13 (cierre del paso 3, corregido esa misma tarde):** el perfil
`KPCL0035` (renombrado desde `KPCL0036` — ver banner de corrección al inicio) ya está en
`DEVICE_PROFILES` (paso 3, §7) pero **inerte** en `app_anotacion_av2.py` —
`_ACTIVE_PROFILE` sigue hardcodeado a `"KPCL0034"` precisamente por esto. **Paso 3b,
estipulado y pendiente** (pausado a pedido de Mauro para primero hacer una pasada de
calidad general sobre `app_anotacion_av2.py` — ver §7 tabla, fila 3b, y la sección nueva
"Pausa: calidad de `app_anotacion_av2.py`" si existe):

- **Alcance:** reemplazar las ~53 apariciones literales de `"alimentacion"` /
  `"ciclo_servido_alimento"` como llave/comparación (no las de docstrings/comentarios) por
  `CAT_PRINCIPAL` / `CAT_CICLO` derivados de `ACTIVE["rol"]` / `ACTIVE["cat_ciclo"]`.
- **Camino recomendado:** **(a) indirección quirúrgica** — es el fix de causa raíz (Ponytail:
  "fix de bug = causa raíz, no síntoma"; un guard en la fuente, no un parche). La opción (b)
  ahorra el trabajo pero deja `anotaciones_agua.csv` diciendo `alimentacion` en la columna
  `categoria` con una etiqueta de UI que dice "Hidratación" — inconsistente para cualquiera
  que lea el CSV crudo, viola la promesa de §5.2. Se descarta.
- **Método:** no es un reemplazo global de texto — cada uno de los ~53 sitios se revisa
  individualmente (algunos son docstrings o nombres de variable genéricos que no deben
  tocarse). Mismo patrón de verificación ya usado en el paso 2/3: `py_compile` + `AppTest`
  headless + comparación SHA-256 del perfil `KPCL0034` contra el baseline antes/después
  (cero cambio de comportamiento para comida) + `tests/` 16/16.
- **Al completarlo:** recién ahí activar el selector de perfil en la UI (`st.sidebar.selectbox`
  propuesto arriba) y habilitar `_ACTIVE_PROFILE = "KPCL0035"` como opción real, no volver a
  dejarlo hardcodeado.

### 5.2 — Taxonomía de anotación para agua — ✅ confirmada por Mauro (2026-08-13)

Mismas categorías que comida, calcadas 1:1. Verificado contra los datos reales de comida
(no contra la documentación, que en un punto listaba una 4ª categoría —
`ciclo_servido_alimento`— que **no existe** como valor dentro de `anotaciones_av2.csv`;
es un artefacto aparte, ver abajo):

**`anotaciones_agua.csv`** — mismo schema que `anotaciones_av2.csv`
(`id_anotacion, id_candidato, t_inicio, t_fin, categoria, notas, device_code, origen,
created_at`), con `categoria` restringida a:

| Categoría en comida (real, verificado) | Equivalente en agua | Qué marca |
|---|---|---|
| `alimentacion` (262 anotaciones hoy) | **`hidratacion`** | Sesión real de consumo — Bandida bebiendo, peso baja |
| `servido` (58) | **`servido`** | Relleno del bebedero — humano o automático, peso sube. Mismo nombre que comida: `audit_events` ya trata "servido" como compartido entre ambos tipos de bowl (§2.1) |
| `ruido` (207) | **`ruido`** | Candidato detectado que no es ni consumo ni relleno — fluctuación del sensor |

**`ciclos_servido_hidratacion.csv`** — mismo schema que `ciclos_servido_alimento.csv`
(`id_ciclo, t_inicio, t_fin, notas`, 23 ciclos registrados hoy para comida): marca el
período completo entre un relleno y el siguiente, no una categoría dentro de
`anotaciones_agua.csv` — es un artefacto separado, usado en comida para Tab 7 ("Próxima
Comida", predictor de intervalos) y Tab 8 ("Kittypau", dashboard de bienestar). Se replica
igual para agua si/cuando esos tabs se porten (fuera del alcance de la Fase 0 mínima, ver
§7 paso 6).

**Implicación para `01_genera_candidatos.py` adaptado (paso 5 de §7):** el `tipo` de
candidato (`bajada`/`subida`/`mixto`, en `candidatos_av2.csv`) no cambia — sigue
describiendo la dirección cruda del segmento antes de anotar. Lo que cambia es solo el
vocabulario de las 3 categorías de destino en la anotación manual.

---

## 6. Reorganización del resto de la carpeta — legacy vs. activo

| Ítem | Propuesta | Riesgo | Nota |
|---|---|---|---|
| `Ciclo Alpha/` (carpeta completa) | **No renombrar.** Reforzar el README interno con un banner de estado archivado si no lo tiene ya tan explícito como `_MOC.md` | Bajo si solo se edita el README; Alto si se renombra la carpeta (rompe rutas relativas literales usadas en `09_Investigacion/README.md`, `_MOC.md` y varios docs de Knowledge) | Verificar primero cuántos enlaces relativos apuntan a `Ciclo Alpha/...` antes de tocar nada estructural |
| Docs sueltos de raíz (`README.md`, `GLOSARIO.md`, `EXPERIMENT_TRACKER.md`, `ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md`, `01_`–`08_*.md`) | Mover a una subcarpeta explícita tipo `_legacy_ciclo_alpha_v1/` y dejar en la raíz un `README.md` corto y nuevo que apunte a `Ciclo Alpha v2/` (comida) y `Ciclo Alpha v2/00_INDICE_AV2_AGUA.md` (agua) como los índices activos | Medio — son referenciados desde varios lados (`_MOC.md`, posiblemente Knowledge/) | Requiere grep completo de referencias antes de mover, y actualizarlas todas en el mismo cambio — no es un renombre suelto |
| `plot_kpcl_experimento.py`, `serve_kpcl_dashboard.py`, `abrir_kpcl_dashboard.ps1`, `kpcl_pruebas_eventos.html`, `kpcl0034_*.csv`, `kpcl0036_*.csv` | **No mover sin confirmar con Mauro si el dashboard sigue en uso** — no hay evidencia de que esté deprecado, solo que su documentación vive en el README "legacy" | — | Ver §8 pregunta 3 |
| `Power Bi_Supabase/kittypau_supabase_2026.pbix` | Sin cambios hasta confirmar propósito — no tiene README propio | — | Ver §8 pregunta 5 |
| `Ciclo Alpha v2/fase_1_extraccion/` … `fase_6_evaluacion/` | Sin cambios — son placeholders de trabajo futuro legítimo (clasificador automático, validación, integración), no basura | Ninguno | Mencionado acá solo porque el pedido original incluía "detectar carpetas no usadas"; estas están "no usadas" pero no son candidatas a borrar |
| `Ciclo Alpha/venv/`, `fase_4_visualizacion/node_modules`+`dist/` | Limpieza de disco opcional (ya gitignored, regenerables) | Ninguno para git | No es parte del alcance de este spec, solo se documenta el hallazgo |

**Principio general para todo lo anterior:** ningún movimiento de carpeta/archivo se hace
en el mismo paso que se decide — primero grep de referencias entrantes, después mover,
después actualizar enlaces, después verificar. Igual disciplina que ya se usó para migrar
`Ciclo Alpha` → `Ciclo Alpha` (sic, ver nota en `README.md` línea 433: *"la carpeta... fue
renombrada... en Junio 2026"* — hay precedente de que un renombre sin actualizar todas las
referencias deja rutas rotas documentadas).

---

## 7. Roadmap de ejecución

> Estado: **paso 3 hecho y verificado (2026-08-13)**, en el sub-alcance seguro descrito abajo
> — **corregido esa misma tarde**: el device de agua era `KPCL0036` por error, es
> `KPCL0035` (ver banner de corrección al inicio del documento; `candidatos_agua.csv`
> regenerado con el device correcto, 288 candidatos reales).
> **Roadmap pausado a pedido de Mauro (2026-08-13)** — antes de seguir con el paso 3b
> (indirección de categorías, ver §5.1) se hace una pasada de calidad general sobre
> `app_anotacion_av2.py` (documentación en línea, gráficos de resultados, eliminar
> redundancia) que no toca la lógica de datos. Ver
> [[14_Experimentos/EXP_AlphaV2_AppArq]] para esa iniciativa una vez documentada. Pasos 3b+
> de este spec siguen sin ejecutar.

| # | Paso | Depende de |
|---|---|---|
| 1 | ~~Confirmar con Mauro las preguntas restantes de §8~~ — preguntas 1 y 4 resueltas; 2, 3, 5 no bloquean el paso 2 | — |
| 2 | ✅ **Hecho 2026-08-13.** `DEVICE_PROFILES` introducido en `app_anotacion_av2.py`, `01_genera_candidatos.py` y `revisar_anotaciones_v2.py` (§5.1), solo perfil `KPCL0034`. Verificación real, no solo "corrí los tests": (a) `python -m py_compile` en los 3 archivos — OK; (b) `streamlit.testing.v1.AppTest` — la app corre headless sin excepciones; (c) las 8 rutas/UUIDs derivadas del perfil son byte-idénticas a las literales de antes; (d) **ambos scripts corridos end-to-end, código original vs. refactorizado, sobre los mismos datos — `candidatos_av2.csv`, `comp_stats_v2.json` y `features_anotaciones_v2.csv` salieron con SHA-256 idéntico**; (e) `tests/` 16/16 passed antes y después. Los archivos de datos regenerados durante la prueba se restauraron a su estado exacto previo (no se dejó nada regenerado de más — `anotaciones_av2.csv`, que tenía anotación en curso sin commitear, no se tocó en ningún momento). Encontrado y documentado en el camino: la app tiene **53 apariciones literales** de `"alimentacion"`/`"ciclo_servido_alimento"` como nombre de categoría (no solo rutas) — no afecta este paso (una sola clave, no cambia), pero sí al paso 3, ver nota en §5.1. | 1 |
| 3 | ✅ **Hecho 2026-08-13, corregido esa misma tarde (ver banner al inicio).** Perfil de agua agregado a `DEVICE_PROFILES` en los 3 archivos — inicialmente como `"KPCL0036"` (error, corregido a **`"KPCL0035"`**, el bebedero real). En `01_genera_candidatos.py` y `revisar_anotaciones_v2.py` — que no tienen el problema de §5.1, solo filtran por UUID — el perfil agua es **funcional**: corridos vía `KITTYPAU_DEVICE_PROFILE=KPCL0035`, generaron `data_agua/candidatos_agua.csv` real (104.573 filas KPCL0035 leídas, período 25-may→13-ago-2026 → **288 candidatos**: 217 bajada/75%, 69 subida/24%, 2 mixto/1%) — reemplaza los 393 candidatos generados por error contra KPCL0036 esa mañana. En `app_anotacion_av2.py` el perfil queda **inerte** — registrado en el dict pero `_ACTIVE_PROFILE` sigue hardcodeado a `"KPCL0034"` — porque activarlo hoy dispara `KeyError` en las ~50 líneas que buscan `CATEGORIAS["alimentacion"]` literal (§5.1); esa indirección es un paso propio, no resuelto todavía. También creados: `data_agua/backups/`, `config/umbrales_agua.json` (placeholder sin calibrar) y `09_Investigacion/Ciclo Alpha v2/00_INDICE_AV2_AGUA.md`. `supabase_client.py` ampliado (`BANDIDA_UUIDS`) para que el sync incremental traiga KPCL0035 además de KPCL0034. Misma verificación rigurosa que el paso 2 en los 3 archivos: `py_compile` OK, `AppTest` headless sin excepciones, `revisar_anotaciones_v2.py` con perfil comida SHA-256 idéntico al baseline, `tests/` 16/16. | 2 |
| 3b | Resolver la indirección de nombres de categoría en `app_anotacion_av2.py` (§5.1) para poder activar `_ACTIVE_PROFILE="KPCL0035"` sin romper — bloqueante para poder *ver* los datos de agua en la UI, no para seguir generando candidatos por script | 3 |
| 4 | Diagnóstico de calidad de señal de KPCL0035 (cadencia, % en cero, rango de peso — mismo método usado en §2.3 sobre el UUID retirado, repetir sobre el device correcto) + decidir si el UUID retirado `3c1c6705...` es el mismo bebedero físico (continuidad histórica, sin confirmar — ver banner de corrección) | 3b |
| 5 | ~~Con el perfil de agua seleccionable en la app: adaptar `01_genera_candidatos.py` para generar `candidatos_agua.csv`~~ — **adelantado al paso 3**: el script ya genera `candidatos_agua.csv` real vía env var, sin necesitar selector de UI. Queda pendiente **validar** que `RESAMPLE_TARGET_S=30`/`GAP_CUTOFF_S=300` (heredados de comida) sean correctos para agua antes de darlos por buenos (ver §3) | 3b |
| 6 | Anotar manualmente en `hidratacion`/`servido`/`ruido` desde la misma app (taxonomía confirmada, §5.2) — meta mínima análoga a comida: no arrancar clasificación automática con menos anotaciones de las que exige el propio historial del proyecto por categoría (Alpha v2 partió con metas de 40/30/20, terminó con 400+; agua parte de 1 anotación real hoy, ver §2.3) | 5 |
| 7 | `shape_features_v2.py` — **sin cambios**, se importa tal cual; correr `revisar_anotaciones_v2.py` (ya parametrizado en el paso 2) sobre el perfil agua → genera `comp_stats_agua.json`. Familias 🟢/🟡 quedan calibradas automáticamente; F12–F14 quedan débiles hasta tener suficientes anotaciones — normal, no bloqueante | 6 |
| 8 | Calibrar `umbrales_agua.json` (mismo mecanismo que `03_recalibrar_umbrales.py`, parametrizado) | 7 |
| 9 | Tests nuevos específicos de agua (mismo patrón que `tests/test_candidatos.py` etc., parametrizados o duplicados según convenga en ese momento) | 8 |
| 10 | Recién acá: evaluar si vale la pena portar algo a producción (`kittypau_app`) — mismo criterio que ya aplicó SPEC_03 Pilar 2: la investigación primero, el producto después, nunca copiar la lógica de comida sobre datos de agua sin calibrar |

---

## 8. Preguntas abiertas — necesitan decisión de Mauro antes de ejecutar

1. ~~¿Existe un device `water_bowl`/`bebedero` real con datos?~~ **✅ Resuelto
   2026-08-13 — sí: KPCL0035 (`0dc601c0…`), 104.573 lecturas (25-may→13-ago-2026).**
   (Primero se identificó mal como KPCL0036 esa misma mañana — corregido esa tarde, ver
   banner al inicio del documento.) Era la pregunta que más cambiaba el plan; el roadmap
   de §7 ya la asume resuelta con el device correcto.
2. **Con el diagnóstico de §2.3 ya hecho: ¿arrancar la anotación manual igual, o primero
   resolver las dos anomalías sin explicar (cadencia de 1,16s y el 9,09% de lecturas en
   `0`)?** No son bloqueantes técnicos — se puede anotar igual sobre la señal cruda — pero
   sí cambian cuánto hay que confiar en cualquier candidato que el detector proponga en
   esos tramos. Graficar la serie completa (Tab 0 "Vista Global", ya disponible una vez
   parametrizada la app con el perfil agua — §5.1 — o con `plot_kpcl_experimento.py` si
   sigue en uso, ver pregunta 3) antes de anotar a ciegas es probablemente el paso más
   barato para resolver esto.
3. **¿El dashboard operativo (`plot_kpcl_experimento.py` + `serve_kpcl_dashboard.py` +
   `abrir_kpcl_dashboard.ps1`) sigue en uso?** Si sí, no se toca; si no, es candidato a
   `_legacy_ciclo_alpha_v1/` junto con los docs sueltos de raíz.
4. ~~¿App de anotación hermana o modo nuevo en `app_anotacion_av2.py`?~~ **✅ Resuelto
   2026-08-13 — modo nuevo, vía `DEVICE_PROFILES` en la misma app** (Mauro pidió
   explícitamente que quedara separado por dispositivo dentro de la misma herramienta, con
   las mismas métricas que comida). Diseño completo en §5.1.
5. **¿Qué es `Power Bi_Supabase/kittypau_supabase_2026.pbix` y sigue en uso?** No tiene
   documentación propia en la carpeta.

---

## Ver también

- [[29_Specs/SPEC_03_Objetivos_Monitoreo]] — Pilar 2 (Hidratación), donde se identificó
  primero este gap y se propuso el roadmap de alto nivel que este spec desarrolla en detalle
- [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] — por qué `_sims_agua = 70.0` nunca debe
  portarse a producción tal cual
- [[10_Datasets/README_Datasets]] — de donde sale la pregunta abierta sobre el device
  dominante `3c1c6705…`, identidad histórica corregida por el banner al inicio de este documento
- [[09_Sensores/README_Sensores]] — roster de devices, actualizado 2026-08-13 con la
  identidad real (KPCL0035 = bebedero, KPCL0036 = otra mascota)
- [[13_Features/README_ShapeFeatures]] — las 15 familias del Motor Matemático de comida
- `09_Investigacion/Ciclo Alpha v2/fase_0_ruido/` — el pipeline a parametrizar por
  dispositivo (§5), no a duplicar
- `09_Investigacion/07_AUDITORIA_KPCL0036_ERROR_PESO.md` — diagnóstico histórico de
  abril/mayo 2026, sobre el UUID retirado `3c1c6705…` que en ese momento tenía el código
  "KPCL0036" — no confundir con el KPCL0036 actual (otra mascota, ver banner al inicio)
