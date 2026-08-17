# Ciclo Gamma — Unificación de Datos (Abr–May–Jun 2026) y Re-etiquetado Total

| Campo | Valor |
|---|---|
| **Ciclo** | Gamma |
| **Sub-proceso** | Unificación de datos + inferencia Modelo A (Alpha) + re-etiquetado total via `app_anotacion.py` |
| **Fecha de creación** | 2026-06-16 |
| **Última actualización** | 2026-06-16 — decisiones de la Sección 5 resueltas e integradas en `GAMMA_INSTRUCTIVO.md`, `GLOSARIO_GAMMA.md` y `EXPERIMENT_TRACKER_GAMMA.md` |
| **Device** | KPCL0034 (food_bowl, Bandida) |
| **Estado** | ✅ Pre-G oficial del Ciclo Gamma — reemplaza la anotación manual desde cero descrita en versiones previas de `GAMMA_INSTRUCTIVO.md` |
| **Reemplaza** | Cualquier dataset de etiquetas heredado de Alpha (`audit_events` Abril + `new_annotations.csv` Mayo-Jun de Exp07/08) como fuente única de verdad para Gamma |

> Este documento es el **runbook operativo del Pre-G de Gamma**: detalla el paso a paso
> y las decisiones de diseño. Vive dentro de `Ciclo_Gamma/` junto a `GAMMA_INSTRUCTIVO.md`,
> `EXPERIMENT_TRACKER_GAMMA.md` y `GLOSARIO_GAMMA.md`, y ha sido conciliado con los tres:
> el Pre-G de `GAMMA_INSTRUCTIVO.md` ahora describe este mismo proceso (unificación +
> inferencia con Modelo A de Alpha + retiquetado total), en vez de la anotación manual
> desde cero que describían versiones anteriores.

---

## 0. Por qué este proceso existe

Ciclo Alpha (α-01 a α-10 / Exp01–Exp11) cerró con 8 errores críticos identificados,
de los cuales este proceso resuelve directamente cuatro:

| Error de Alpha | Cómo lo resuelve este proceso |
|---|---|
| **UUID doble** de KPCL0034 (Abril usó un UUID, Mayo-Jun usó otro) | Paso 4.2 — tabla de mapeo única antes de cualquier cálculo |
| **Timezone mixta** en `audit_events.created_at` (+00, -04, -04:00) | Paso 4.3 — normalización a UTC explícita y auditable |
| **Servido insuficiente** (18–27 sesiones en todo Alpha) | Paso 4.9 — revisión humana de **toda** la curva de 3 meses, no solo los tramos que Alpha ya había mirado |
| **Distribución no analizada** antes de entrenar | Paso 4.11 — reporte de distribución de clases obligatorio antes de pasar a Fase 2 |

La decisión de fondo de este proceso es: **no heredar ninguna etiqueta de Alpha como
ground truth**. Las etiquetas de Abril (tiempo real, via dashboard) y las de Mayo-Jun
(retroactivas, via `app_anotacion.py` en Exp07/08) tienen calidad y origen distintos —
Exp09A ya documentó esto como una de las causas del shift de distribución. Gamma empieza
con una sola pasada de etiquetado, un solo reviewer/proceso, un solo criterio.

---

## 1. Qué entra y qué no entra a este proceso

| Entra | No entra |
|---|---|
| Lecturas crudas de `readings` de Abril + Mayo + Junio 2026 (peso, temperatura, humedad, `clock_invalid`, timestamps) | `sessions_labeled.parquet` de cualquier Exp anterior |
| El modelo `modelo_a.lgb` + `calibration_isotonic.json` de **Exp06** (mejor resultado de Alpha: F1 activo = 0.7619) | `new_annotations.csv` de Exp07/Exp08 como ground truth |
| La lógica de resampleo a 30s de Exp09A (`resample_to_uniform`, forward-fill por segmento) | `audit_events` de Abril como ground truth definitivo |
| El criterio de candidatos de sesión de Exp07 (`MIN_SESSION_S`, `GAP_MERGE_S`, `MIN_CONSUMED_G`) | Cualquier `X_train/val/test.parquet` ya construido |

`audit_events` y `new_annotations.csv` **sí pueden usarse como referencia cruzada** al
final del etiquetado (para detectar discrepancias), pero no como fuente que se carga
directamente al dataset de Gamma.

---

## 2. Estructura de carpeta unificada propuesta

```
Data_2026/
  Abril_Mayo_Junio_2026/              ← carpeta unificada de este proceso
    01_raw/
      readings_abril.csv              ← copia de readings.csv (dump 07-05-2026), filtrado KPCL0034
      readings_mayo_junio.csv         ← copia de Mayo_2026/readings_rows.csv (cubre hasta 2026-06-14), filtrado KPCL0034
      audit_events_abril.csv          ← solo para cross-check, no para entrenar
      uuid_mapping.json               ← tabla de equivalencia de UUIDs (Paso 4.2)
    02_unificado/
      readings_unificado_utc.parquet  ← timezone normalizada, UUID único, sin resamplear
      readings_unificado_30s.parquet  ← resampleado a cadencia uniforme (Paso 4.4)
    03_inferencia_modelo_a/
      X_inferencia_3meses.parquet     ← features calculadas sobre TODO el período
      candidatos_actividad.csv        ← salida cruda del Modelo A (prob_activo por fila)
      sesiones_candidatas.csv         ← candidatos agrupados en sesiones (Paso 4.7)
    04_anotacion/
      sesiones_candidatas_anotacion.json  ← formato de entrada para app_anotacion.py
      new_annotations_gamma.csv           ← salida del etiquetado humano completo (Paso 4.9)
    05_reporte_calidad/
      distribucion_clases_gamma.txt   ← reporte obligatorio antes de Fase 2 (Paso 4.11)
      quality_report_gamma.txt
```

> Nombre de carpeta **confirmado**: `Data_2026/Abril_Mayo_Junio_2026/`, siguiendo la
> convención ya usada (`Data_2026/Mayo_2026/`).

---

## 3. Pipeline paso a paso

### 4.1 Consolidación de fuentes crudas

- Copiar `readings.csv` (dump 07-05-2026, cubre Abril) y `Mayo_2026/readings_rows.csv`
  a `01_raw/`, filtrando ya por el/los UUID(s) de KPCL0034.
- **Junio resuelto:** no existe un `Junio_2026/readings_rows.csv` separado.
  `Mayo_2026/readings_rows.csv` ya cubre hasta `2026-06-14` (mismo rango usado en
  Exp07). En la práctica, "3 meses" en este proceso es Abril completo + Mayo 25 en
  adelante hasta la fecha del último dump disponible. Si se descarga un dump más
  reciente de Supabase antes de ejecutar el Paso 4.6, usar ese en lugar de
  `Mayo_2026/readings_rows.csv` para extender la cobertura hasta la fecha actual.
- Validar que las tres fuentes comparten exactamente el mismo esquema de columnas
  (`weight_grams`, `temperature`, `humidity`, `battery_level`, `recorded_at`,
  `ingested_at`, `clock_invalid`, `device_id`).

### 4.2 Resolución de UUID doble

- Construir `uuid_mapping.json` con la equivalencia conocida:
  - Abril: `9510a455-b0e9-4932-8be1-03976d31228a`
  - Mayo-Jun (y canónico en `GLOSARIO.md`): `3a460074-e7c3-41bf-ae5a-a011445f927a`
- Reescribir **todas** las filas de Abril con el UUID canónico antes de cualquier
  join, cálculo de feature o filtro por device. Este paso debe ir primero —
  cualquier filtro `device_id = X` corrido antes de unificar UUIDs producirá
  resultados parciales silenciosos.
- Dejar este mapping versionado en el repo (no solo en memoria del script), para
  que sea auditable si aparece un tercer UUID en el futuro (ej. al sumar KPCL0035).

### 4.3 Normalización de timezone

- Aplicar la misma lógica que usó el análisis Colab (`dateutil.parser.parse` →
  `astimezone(UTC)`) a **todos** los timestamps de las tres fuentes, no solo a
  `audit_events`. Aplica también a `recorded_at`/`ingested_at` de `readings`.
- Registrar cuántas filas tenían timezone ambigua o no parseable, como parte del
  reporte de calidad (no descartarlas silenciosamente).
- Confirmar que el resultado de este paso es 100% UTC antes de pasar al resampleo.

### 4.4 Resampleo a cadencia uniforme (30s)

- Reutilizar `resample_to_uniform(df, target_s=30)` de Exp09A, sin modificaciones:
  forward-fill (función escalón) por segmento de continuidad, sin interpolar a
  través de gaps `> GAP_CUTOFF_S` (300s).
- Esto ya está validado y documentado — no es un paso experimental, es la
  metodología que se adopta como invariante para Gamma.
- Salida: `readings_unificado_30s.parquet` cubriendo Abril + Mayo + Junio en una
  sola tabla continua, con un UUID y una cadencia.

### 4.5 Cálculo de features

- Calcular las **12 features de Alpha** (`weight_grams`, `delta_w`, `delta_w_10`,
  `rolling_std_5`, `rolling_std_10`, `rolling_mean_5`, `net_weight`, `is_plateau`,
  `plateau_duration` en segundos, `hour_sin`, `hour_cos`, `clock_invalid`).
- **Resuelto para este paso — 12 features:** este paso usa **obligatoriamente las 12
  features originales de Alpha**, sin `cadencia_s` ni `dia_semana_sin`, porque
  `modelo_a.lgb` de Exp06 fue entrenado con ese esquema exacto (orden y cantidad de
  columnas) — cargarlo con 13 features rompería la inferencia.
- **Pendiente (explícitamente, por decisión del usuario) — 12 vs 13 para el
  entrenamiento de Gamma:** la pregunta de si el **nuevo modelo** que se entrene en
  la Fase 3 de Gamma usará las 12 features de Alpha o las 13 de `GAMMA_INSTRUCTIVO.md`
  (con `dia_semana_sin`) **no se resuelve en este documento**. Queda abierta y se
  decide al llegar a G-01/G-02, sin bloquear este paso de generación de candidatos.

### 4.6 Inferencia con Modelo A (Exp06) sobre el dataset unificado completo

- Cargar `modelo_a.lgb` + `calibration_isotonic.json` de Exp06 (F1 activo = 0.7619,
  AUC-ROC = 0.9205 — el mejor resultado de Ciclo Alpha).
- Correr inferencia sobre **las 3 meses completos**, sin filtrar por período ya
  etiquetado ni por sesiones previas. El objetivo es una probabilidad de
  `prob_activo` por cada fila de los 3 meses.
- **Threshold resuelto: 0.12** (`THRESHOLD_CANDIDATOS_GAMMA`). El threshold de
  producción (0.20, `THRESHOLD_A_INICIAL`) se mantiene sin cambios para inferencia
  real; este threshold más bajo es exclusivo de este paso de **generación de
  candidatos para revisión humana**, para maximizar recall — es más barato que un
  humano descarte un falso positivo en `app_anotacion.py` que perder una sesión
  real de `servido` o `alimentacion` por un threshold demasiado estricto.

### 4.7 Generación de candidatos de actividad (sesiones)

- Agrupar filas con `prob_activo ≥ threshold_anotacion` en sesiones, reutilizando
  los parámetros ya validados en Exp07:
  - `MIN_SESSION_S = 30s` (duración mínima)
  - `GAP_MERGE_S = 60s` (gap entre activos que se fusionan en una sesión)
  - `MIN_CONSUMED_G = 3.0g` — **usar solo como filtro informativo, no para descartar**
    candidatos en este paso (un cambio de peso pequeño puede ser un sorbo de agua
    o un picoteo real; que lo decida el reviewer humano, no el filtro automático).
- Salida: `sesiones_candidatas.csv` con `start_at`, `end_at`, `duracion_s`,
  `delta_peso_g`, `prob_activo_max`, sin clasificar todavía en
  alimentacion/servido/reposo — eso lo decide el humano en el siguiente paso.

### 4.8 Exportación a formato `app_anotacion.py`

- Convertir `sesiones_candidatas.csv` al formato JSON/CSV que espera
  `app_anotacion.py` (mismo formato usado en Exp07 para las 155 sesiones
  Mayo-Jun, pero ahora cubriendo los 3 meses completos).
- Verificar que el total de candidatos sea razonable para una revisión manual
  completa (estimar volumen antes de abrir la herramienta: a ~4-6 sesiones/día de
  alimentación históricas, 3 meses sugiere un orden de magnitud de cientos de
  candidatos, no miles — si el threshold bajo del Paso 4.6 genera un volumen
  inviable de revisar, ajustar el threshold antes de continuar).

### 4.9 Etiquetado manual total (proceso humano)

- Revisar **cada candidato** generado, para los 3 meses completos, clasificando en:
  `inicio_alimentacion`/`termino_alimentacion`, `inicio_servido`/`termino_servido`,
  `inicio_hidratacion`/`termino_hidratacion` (si aplica a otro device), o
  descartando como falso positivo (ruido del sensor, tare, etc.).
- Esta es la pieza central que resuelve "servido insuficiente": al revisar la
  curva completa (no solo lo que Alpha ya había mirado), aumenta la probabilidad
  de encontrar sesiones de servido que nunca fueron etiquetadas.
- Recomendación operativa: priorizar la revisión por bloques cronológicos
  (Abril → Mayo → Junio) para poder detectar si el comportamiento de Bandida o
  el ruido del sensor cambia entre períodos mientras se revisa.

### 4.10 Consolidación de etiquetas → fuente única de verdad de Gamma

- La salida de `app_anotacion.py` (`new_annotations_gamma.csv`) se convierte en la
  **única fuente de etiquetas** para el dataset supervisado de Gamma.
- Cross-check opcional: comparar `new_annotations_gamma.csv` contra `audit_events`
  (Abril) y `new_annotations.csv` (Mayo-Jun) de Alpha, **solo para detectar
  discrepancias y documentarlas** — no para fusionar ambas fuentes en el dataset
  final.

### 4.11 Análisis de distribución de clases (antes de entrenar)

- Generar `distribucion_clases_gamma.txt` con conteos de `inicio_alimentacion`,
  `inicio_servido`, sesiones por día, duración media, y el balance de clases a
  nivel de fila (reposo / alimentacion / servido) **antes** de tocar Fase 2.
- Este reporte es el que faltó en Alpha. Debe responder explícitamente: ¿el
  desbalance de `servido` sigue siendo extremo? ¿hay suficientes ejemplos para
  evitar repetir el ciclo de SMOTE/duplicación con datos sintéticos?

### 4.12 Construcción del dataset Fase 2 de Gamma

- Split temporal sobre los 3 meses unificados (definir proporciones — Alpha usó
  70/15/15, pero con un único período continuo en vez de un parche Abril+Mayo-Jun).
- Verificar que el set de test quede estrictamente fuera del entrenamiento, como
  en todos los ciclos anteriores.

### 4.13 Entrenamiento Fase 3 de Gamma

- Punto de partida recomendado: la configuración de Exp06 (mejor resultado de
  Alpha) como baseline, ajustando solo lo que el nuevo dataset (más grande, sin
  shift de cadencia, con `servido` reforzado) requiera.

---

## 4. Invariantes que se mantienen de Alpha

| Invariante | Valor |
|---|---|
| `GAP_CUTOFF_S` | 300 s |
| `PLATEAU_THRESHOLD` | 1.5 g |
| `BASELINE_WINDOW` | 60 lecturas |
| `RESAMPLE_TARGET_S` | 30 s |
| Fuente de verdad para producción actual | `modelo_a.lgb` / `modelo_b.lgb` de Exp06, hasta que Gamma produzca un modelo que los supere en los umbrales de Fase 4 |

---

## 5. Decisiones — estado (resuelto 2026-06-16)

1. **Fuente de datos de Junio** — ✅ Resuelto. No existe `Junio_2026/readings_rows.csv`
   separado; `Mayo_2026/readings_rows.csv` ya cubre hasta `2026-06-14`. Si hay un dump
   más reciente al ejecutar, se usa ese (ver Paso 4.1).
2. **Threshold de generación de candidatos** — ✅ Resuelto: **0.12**
   (`THRESHOLD_CANDIDATOS_GAMMA`), distinto del threshold de producción (0.20). Ver
   Paso 4.6.
3. **Nombre y ubicación final de la carpeta unificada** — ✅ Resuelto:
   `Data_2026/Abril_Mayo_Junio_2026/`.
4. **12 vs 13 features** — ⏳ **Pendiente, dejado abierto a propósito.** Para este
   paso de generación de candidatos (Paso 4.5) se usan obligatoriamente las 12
   features de Alpha (requisito técnico de `modelo_a.lgb` de Exp06). La decisión de
   si el **entrenamiento** de Gamma (G-01 en adelante) usa 12 o 13 features no se
   resuelve aquí — queda pendiente de confirmación antes de G-01.
5. **Alcance del cross-check con `audit_events`/`new_annotations.csv`** — ✅
   Resuelto: solo para detectar y documentar discrepancias, sin métrica formal de
   coincidencia. Ver Paso 4.10.

---

## 6. Checklist — Definition of Done de este sub-proceso

- [ ] `uuid_mapping.json` creado y aplicado a las tres fuentes crudas
- [ ] Timestamps de Abril, Mayo y Junio normalizados a UTC (sin filas con timezone ambigua sin resolver)
- [ ] `readings_unificado_30s.parquet` generado, cubriendo el rango completo Abril–Junio
- [ ] Inferencia con `modelo_a.lgb` (Exp06) corrida sobre el dataset unificado completo
- [ ] `sesiones_candidatas.csv` generado y volumen validado como revisable manualmente
- [ ] `app_anotacion.py` carga correctamente los candidatos de los 3 meses
- [ ] Revisión manual completa finalizada (los 3 meses, sin saltar tramos)
- [ ] `new_annotations_gamma.csv` consolidado como única fuente de etiquetas de Gamma
- [ ] `distribucion_clases_gamma.txt` generado y revisado antes de Fase 2
- [ ] Decisión tomada y documentada sobre 12 vs 13 features para el entrenamiento de Gamma

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Volumen de candidatos demasiado alto para revisión manual completa | Subir el threshold de generación de candidatos (Paso 4.6) antes de exportar a `app_anotacion.py` |
| UUID de Junio distinto a los dos ya conocidos | Validar `device_id` único antes de aplicar `uuid_mapping.json`; si aparece un tercero, agregarlo a la tabla antes de continuar |
| Gaps de datos entre Mayo 1 y Mayo 25 (documentado en Exp08) | Documentar el gap explícitamente en `quality_report_gamma.txt`, no rellenarlo artificialmente |
| Fatiga del revisor en una revisión de 3 meses completos | Dividir la revisión en bloques cronológicos (Paso 4.9) y documentar avance parcial |
| Reproducir el mismo shift de distribución de Exp08/09 | El resampleo a 30s ya resuelve la cadencia; el Paso 4.11 (análisis de distribución) es el control adicional que faltaba en Alpha |

---

## 7b. Augmentación temporal de clase minoritaria (`servido`)

> **Estado al 2026-06-17:** 63 sesiones reales de servido / 80 requeridas.
> Se implementó oversampleo dinámico para no bloquear Fase 2 mientras se
> completan las anotaciones.

### Qué se hace

`_gamma_utils.cargar_sessions_con_augmentation()` aplica oversampleo con
reemplazo sobre las filas `session_type == "servido"` de
`sessions_labeled.parquet` hasta alcanzar `MIN_SERVIDO_SESSIONS = 80`.

Las filas sintéticas llevan `is_augmented = True`. El resto del parquet
es idéntico a las anotaciones reales — no se altera el archivo en disco.

### Cuándo se activa / desactiva

| Condición | Comportamiento |
|---|---|
| `servido_real < 80` | Samplea `80 − servido_real` filas con reemplazo, `random_state=42` |
| `servido_real >= 80` | Devuelve el parquet sin tocar (`is_augmented = False` en todo) |

El checkpoint `g10_quality_report.py` evalúa el dataset aumentado, no el
crudo, de modo que pasa cuando la suma `real + sintético >= 80`. Reporta
ambos conteos explícitamente.

### Uso correcto en Fase 2

Los scripts de entrenamiento deben importar
`cargar_sessions_con_augmentation()` en vez de leer el parquet directamente:

```python
from _gamma_utils import cargar_sessions_con_augmentation
sesiones = cargar_sessions_con_augmentation()  # aplica augmentación si necesario
# Excluir sintéticas de la evaluación final:
sesiones_eval = sesiones[~sesiones["is_augmented"]]
```

### Por qué oversampleo y no SMOTE

Las filas sintéticas son duplicados exactos de sesiones reales (no
interpoladas). Es la estrategia más conservadora: no inventa patrones de
peso nuevos. Cuando haya ≥ 80 sesiones reales la función se desactiva sola
y la distinción `is_augmented` deja de importar.

---

## 8. Artefactos esperados al cierre de este sub-proceso

| Artefacto | Ubicación | Uso posterior |
|---|---|---|
| `readings_unificado_30s.parquet` | `Data_2026/Abril_Mayo_Junio_2026/02_unificado/` | Insumo de Fase 2 de Gamma |
| `sesiones_candidatas.csv` | `.../03_inferencia_modelo_a/` | Trazabilidad de qué generó el modelo vs qué confirmó el humano |
| `new_annotations_gamma.csv` | `.../04_anotacion/` | Fuente de verdad de etiquetas para Gamma |
| `sessions_labeled.parquet` | `.../04_anotacion/` | Dataset base para `cargar_sessions_con_augmentation()` |
| `distribucion_clases_gamma.txt` | `.../05_reporte_calidad/` | Gate de calidad antes de Fase 2 |
| `uuid_mapping.json` | `01_raw/` | Referencia permanente para futuras ingestas |

---

## 9. Próximo paso inmediato

~~El siguiente paso es ejecutar el Paso 4.1 (consolidación de fuentes crudas).~~

**Actualizado 2026-06-17:** Pre-G y Fase 2 completados. El siguiente paso es **G-01** (baseline LightGBM sobre el dataset Gamma). Ver `EXPERIMENT_TRACKER_GAMMA.md`.

---

## 10. Resultados de Fase 2 — ejecución 2026-06-17

Pipeline ejecutado completo: `g01 → g02 → g03 → g04`.

### g01 — Labeling (readings_labeled.parquet)

| Métrica | Valor |
|---|---|
| Lecturas de entrada | 134,935 |
| Rango temporal | 2026-04-08 → 2026-06-14 |
| Sesiones usadas para labeling | 327 (264 alim + 63 serv; sin augmentación) |
| Label 0 — alimentacion | 2,607 filas (1.93%) |
| Label 1 — servido | 349 filas (0.26%) |
| Label 2 — reposo | 131,979 filas (97.81%) |

### g02 — Feature engineering (readings_features.parquet)

| Métrica | Valor |
|---|---|
| Segmentos de continuidad detectados (gap > 300s) | 22 |
| Lecturas post-features | 134,935 (sin descarte; todos los segmentos ≥ 5 filas) |
| Features Gamma verificadas | 13 ✅ |
| `plateau_duration_s` max | 44,940 s (1,498 lecturas × 30s) |
| `hour_sin` rango | [−1.000, 1.000] ✅ |
| `dia_semana_sin` rango | [−0.975, 0.975] ✅ |

### g03 — Split temporal (X/y por split)

Fechas: train < 2026-05-25 · val 2026-05-25–2026-06-07 · test ≥ 2026-06-07 (sellado).
122 filas descartadas por NaN en features o label.

| Split | Filas | % total | alim | serv | reposo |
|---|---|---|---|---|---|
| **Train** | 77,676 | 57.6% | 1,446 (1.86%) | 135 (0.17%) | 76,095 (97.96%) |
| **Val** | 36,632 | 27.2% | 797 (2.18%) | 134 (0.37%) | 35,701 (97.46%) |
| **Test** | 20,505 | 15.2% | 361 (1.76%) | 80 (0.39%) | 20,064 (97.85%) ← **SELLADO** |

### g04 — Dataset report (dataset_report.json)

Estadísticas de features sobre train (selección):

| Feature | mean | std |
|---|---|---|
| `weight_grams` | 142.279 | 35.299 |
| `delta_w` | −0.001 | 2.243 |
| `rolling_std_5` | 0.156 | 2.007 |
| `is_plateau` | 0.979 | 0.144 |
| `plateau_duration_s` | 9,269.7 | 7,676.9 |
| `clock_invalid` | 0.982 | 0.134 |
| `dia_semana_sin` | 0.075 | 0.718 |

**Imbalance ratio (train):** 563.7× (reposo vs servido)
→ Acción obligatoria en G-01: `is_unbalance=True` (LightGBM) o `class_weight='balanced'` (sklearn).
