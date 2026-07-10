# Experimento 07 — Inferencia sobre datos Mayo–Junio 2026 (sin etiquetar)

- Fecha: `2026-06-14`
- Hora: `—`
- Proyecto: `Kittypau`
- Base: `Experimento 06`
- Alcance: Aplicar los modelos de Fase 3 sobre `readings_rows.csv`
  (Mayo–Junio 2026) para detectar sesiones sin etiquetas manuales previas.
- Estado: `completado — 2026-06-14`

---

## 0. Propósito del experimento

Este experimento tiene un objetivo distinto a todos los anteriores (Exp 01–06).

En los experimentos anteriores el flujo era:
> datos etiquetados → entrenar modelos → evaluar en validación

En el Experimento 07 el flujo es:
> modelos ya entrenados (Exp 06) → datos **sin etiquetar** → inferencia → sesiones detectadas

El archivo `readings_rows.csv` cubre el período **2026-05-23 → 2026-06-14** y **no contiene etiquetas manuales de alimentación ni servido**. Esto lo convierte en el primer conjunto de datos genuinamente nuevo sobre el que los modelos del Exp 06 pueden demostrar su capacidad de generalización real.

### Referencias a experimentos anteriores

- Los modelos usados en este experimento son los producidos en `exp_06_colab_dataset.md`.
- La arquitectura de features es la definida desde `exp_03_mejor_base.md` (12 features activas, invariantes desde entonces).
- Las reglas de etiquetado y fuente de verdad están en `02_REGLAS_EVENTOS_ALIMENTACION.md`.
- El pipeline de inferencia de referencia es `inferencia_kpcl0034.py` documentado en el `README.md` de Data Science.

---

## 1. Fuente de datos

### Archivo

```
D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\
  Docs\investigacion\Data_2026\Mayo_2026\
    readings_rows.csv
```

### Resumen del análisis exploratorio (ejecutado 2026-06-14)

| Métrica | Valor |
|---|---|
| Filas totales | 121,764 |
| Columnas | 20 |
| Tamaño en memoria | 89.98 MB |
| Rango temporal (`recorded_at`) | 2026-05-23 20:55 UTC → 2026-06-14 04:07 UTC |
| Rango temporal (`ingested_at`) | 2026-05-23 20:55 UTC → 2026-06-14 04:07 UTC |
| Duración total | 21 días, 7 horas |
| Cadencia mediana | 12.1 s |
| Cadencia media | 14.6 s |
| Gaps > 5 minutos | 11 |

### Alerta crítica: clock_invalid al 100%

A diferencia del dump de abril (donde `clock_invalid = True` era ~50%), en este CSV
**el 100% de las filas tienen `clock_invalid = True`**.

**Consecuencia directa para el pipeline:**
- No usar `recorded_at` en ningún paso.
- Usar `ingested_at` como timestamp canónico en todo el experimento.
- Ajustar el script `03_extract_readings.py` para forzar `ingested_at` sin condición.

Esta diferencia debe documentarse y no ignorarse. Ver `02_REGLAS_EVENTOS_ALIMENTACION.md`
sección "Fuente 1" para el tratamiento canónico de `clock_invalid`.

### Devices presentes en el CSV

| device_id (UUID) | Filas | % | Device conocido |
|---|---|---|---|
| `3a460074-e7c3-41bf-ae5a-a011445f927a` | 57,154 | 46.9% | **KPCL0034** (food_bowl — pipeline activo) |
| `0dc601c0-1533-40c5-b606-6d89eb2d4042` | 57,036 | 46.8% | **KPCL0035** (comedero — device nuevo) |
| `418565e7-6683-440c-80e6-666363574cec` | 7,574 | 6.2% | Desconocido — no aparece en tabla `devices` |

**Regla de filtrado:**
El pipeline ML activo trabaja exclusivamente sobre KPCL0034.
Filtrar por `device_id = '3a460074-e7c3-41bf-ae5a-a011445f927a'` antes de cualquier
procesamiento de features. Ver `README.md` de Data Science — "El alcance vigente es
investigación supervisada sobre alimento; KPCL0036 e hidratación quedan fuera del
modelo activo."

### KPCL0035 — observaciones

KPCL0035 es un comedero nuevo que no formó parte de ningún experimento anterior.
Tiene `battery_level` reportando normalmente (67%, ~3.81V), a diferencia de KPCL0034
que sigue sin enviar batería. El `pet_id` es el mismo que KPCL0034, lo que sugiere
que es también el comedero de Bandida. Por ahora queda **fuera del scope del Exp 07**
pero puede ser incorporado en experimentos futuros si se etiquetan sus sesiones.

### Columnas disponibles

| # | Columna | Dtype | % lleno | Notas |
|---|---|---|---|---|
| 0 | `id` | object | 100% | UUID de lectura |
| 1 | `device_id` | object | 100% | Filtrar por KPCL0034 |
| 2 | `pet_id` | object | 99.4% | 784 nulos |
| 3 | `weight_grams` | float64 | 99.9% | Feature principal |
| 4 | `water_ml` | float64 | 0% | Vacía — ignorar |
| 5 | `flow_rate` | float64 | 0% | Vacía — ignorar |
| 6 | `temperature` | float64 | 100% | Feature disponible |
| 7 | `humidity` | float64 | 100% | Feature disponible |
| 8 | `battery_level` | float64 | 53.1% | Solo KPCL0035 y device desconocido |
| 9 | `recorded_at` | object | 100% | NO USAR (clock_invalid=True en 100%) |
| 10 | `ingested_at` | object | 100% | TIMESTAMP CANÓNICO para este experimento |
| 11 | `clock_invalid` | bool | 100% | True en el 100% de filas |
| 12 | `battery_voltage` | float64 | 53.1% | Solo KPCL0035 |
| 13 | `battery_state` | object | 53.1% | Solo KPCL0035 |
| 14 | `battery_source` | object | 53.1% | Solo KPCL0035 |
| 15 | `battery_is_estimated` | bool | 100% | False en todo el CSV |
| 16 | `light_percent` | int64 | 100% | Feature nueva — no estaba en Exp 01–06 |
| 17 | `light_lux` | float64 | 100% | Feature nueva — no estaba en Exp 01–06 |
| 18 | `light_condition` | object | 100% | dark 94.4%, dim 5.5%, normal/bright <1% |
| 19 | `battery_updated_at` | object | 53.1% | Solo KPCL0035 |

### Features nuevas: light_percent y light_lux

Estas columnas no existían en el dataset de entrenamiento de los Exp 01–06.
No deben agregarse al modelo en este experimento — los modelos del Exp 06 no las conocen.
Quedan registradas como candidatas para el Experimento 08 si se decide reentrenar.

---

## 2. Modelos disponibles (Experimento 06)

Los modelos a usar son los artefactos producidos en `exp_06_colab_dataset.md`,
entrenados con el dump 07-05-2026 (Apr 8 – May 1).

| Modelo | Artefacto | Métricas de validación (Exp 06) |
|---|---|---|
| Modelo A (binario) | `fase_3_modelos/models/modelo_a/modelo_a.lgb` | F1 activo = **0.7619**, AUC-ROC = **0.9205** |
| Modelo A calibración | `fase_3_modelos/models/modelo_a/calibration_isotonic.json` | Threshold calibrado = 0.20 |
| Modelo B (multiclase) | `fase_3_modelos/models/modelo_b/modelo_b.lgb` | F1 alimentacion = **0.7606**, Macro F1 = 0.6312 |

Ambos modelos cruzaron los umbrales de Fase 4 en validación:
- Modelo A F1 activo ≥ 0.70 ✅
- Modelo B F1 alimentacion ≥ 0.65 ✅

Este experimento es la primera aplicación real de esos modelos sobre datos fuera
del período de entrenamiento.

---

## 3. Ajustes necesarios por Fase

### Fase 1 — Extracción

**Script de referencia:** `fase_1_extraccion/scripts/03_extract_readings.py`

Ajustes requeridos para este experimento:

| Ajuste | Detalle |
|---|---|
| Fuente de datos | Leer desde `readings_rows.csv` (no desde Supabase API ni dump anterior) |
| Filtro de device | `device_id = '3a460074-e7c3-41bf-ae5a-a011445f927a'` (KPCL0034 únicamente) |
| Timestamp canónico | Usar `ingested_at` **siempre**, sin condicional `clock_invalid` (es True al 100%) |
| Encoding | `latin1` — consistente con todos los CSVs del proyecto |
| Columnas a ignorar | `water_ml`, `flow_rate` (vacías al 100%) |
| Columnas nuevas | `light_percent`, `light_lux`, `light_condition` — **no incorporar al modelo** |
| Etiquetas | Este CSV **no tiene etiquetas**. No ejecutar `04_extract_events.py` en modo normal. |

**Resultado esperado de Fase 1:**
- `readings_raw.parquet` con ~57,154 filas (KPCL0034, Mayo–Junio)
- Sin `sessions_labeled.parquet` — no hay etiquetas
- Sin `events_labeled.parquet` — no hay eventos manuales en este período

### Fase 2 — Features

**Script de referencia:** `fase_2_dataset/scripts/02_build_features.py`

Las **12 features activas** definidas en `exp_03_mejor_base.md` y mantenidas en
todos los experimentos hasta el Exp 06 se calculan exactamente igual:

| # | Feature | Nota |
|---|---|---|
| 1 | `weight_grams` | Peso bruto — disponible en el CSV |
| 2 | `delta_w` | `weight[t] - weight[t-1]` |
| 3 | `delta_w_10` | Delta sobre ventana de 10 lecturas |
| 4 | `rolling_std_5` | Std últimas 5 lecturas |
| 5 | `rolling_std_10` | Std últimas 10 lecturas |
| 6 | `rolling_mean_5` | Media últimas 5 lecturas |
| 7 | `net_weight` | `weight - baseline_w` (percentil 10, ventana 60 filas) |
| 8 | `is_plateau` | 1 si `rolling_std_5 < 1.5g` |
| 9 | `plateau_duration` | Filas consecutivas en plateau |
| 10 | `hour_sin` | Componente seno del ciclo horario (basado en `ingested_at`) |
| 11 | `hour_cos` | Componente coseno del ciclo horario (basado en `ingested_at`) |
| 12 | `clock_invalid` | Constante = 1 en todo este dataset |

**Atención:** `hour_sin` y `hour_cos` deben calcularse desde `ingested_at`, no desde
`recorded_at`. Ver `_phase2_utils.py` — `GAP=300s`, `PLATEAU=1.5g`.

**No hay `y` (labels)** — este experimento solo construye `X`, no `X` e `y`.

### Fase 3 — Inferencia (no entrenamiento)

En este experimento **no se entrena ningún modelo nuevo**.

El script de referencia es `inferencia_kpcl0034.py` (documentado en `README.md`).

Flujo de inferencia:

```
readings_rows.csv (KPCL0034)
    → Fase 1: extraer y limpiar lecturas
    → Fase 2: calcular 12 features → X_mayo_junio.parquet
    → Modelo A: predecir activo/reposo por fila con threshold calibrado 0.20
    → Modelo B: predecir alimentacion/servido/reposo por fila
    → Post-proceso: agrupar filas consecutivas activas → sesiones detectadas
    → Salida: sesiones_detectadas_mayo_junio.csv + inferencia_mayo_junio.html
```

**Threshold a usar:**
- Modelo A: `threshold = 0.20` (calibrado en Exp 06, guardado en `calibration_isotonic.json`)
- Modelo B: argmax de probabilidades (sin threshold adicional)

---

## 4. Validación y anotación posterior

Este experimento no tiene ground truth previo, pero puede generarlo después.

### Opción A — Validación visual

Abrir `inferencia_mayo_junio.html` en el dashboard y comparar visualmente las bandas
detectadas por el modelo contra la curva de peso. Usar `app_anotacion.py` para confirmar
o corregir sesiones detectadas.

### Opción B — Etiquetado retroactivo

Usar `app_anotacion.py` para registrar manualmente `inicio_alimentacion` /
`termino_alimentacion` sobre el período Mayo–Junio en `new_annotations.csv`.
Esas anotaciones se fusionan en la próxima corrida de `04_extract_events.py` y
permiten calcular métricas reales del modelo en este período nuevo.

Esta es la ruta recomendada: convierte el Exp 07 en el conjunto de evaluación más
limpio disponible hasta ahora, ya que el período Mayo–Junio **nunca fue visto durante
el entrenamiento**.

### Opción C — Usar como test set formal (Fase 4 extendida)

Si se etiqueta suficiente porción del período, este CSV puede funcionar como el
test set más robusto del proyecto — con 21 días de datos nunca vistos vs. los
3-4 días del test set reservado del Exp 06.

---

## 5. Metas del experimento

| Métrica | Umbral Fase 4 | Referencia Exp 06 (val) | Meta Exp 07 |
|---|---|---|---|
| Modelo A — F1 activo | ≥ 0.70 | 0.7619 | Medir sobre anotaciones posteriores |
| Modelo A — AUC-ROC | ≥ 0.85 | 0.9205 | Medir sobre anotaciones posteriores |
| Modelo B — F1 alimentacion | ≥ 0.65 | 0.7606 | Medir sobre anotaciones posteriores |
| Modelo B — F1 servido | — | 0.1395 ⚠️ | Observar — esperamos mejora con más datos reales |
| Sesiones detectadas | — | — | Validar coherencia con curva de peso |

---

## 6. Checklist de ejecución

### Preparación
- [x] Confirmar que `readings_rows.csv` existe y tiene 121,764 filas
- [x] Confirmar que los modelos del Exp 06 existen en `fase_3_modelos/models/`
- [x] Confirmar que `calibration_isotonic.json` está presente para el Modelo A
- [x] Activar entorno virtual: `.\venv\Scripts\Activate.ps1`

### Fase 1 + 2 + Inferencia (script unificado `inferencia_exp07_mayo_junio.py`)
- [x] Leer desde `readings_rows.csv`, filtrar `device_id = KPCL0034` por UUID
- [x] Forzar `ingested_at` como timestamp (clock_invalid=True al 100%)
- [x] Calcular las 12 features invariantes (espejo exacto de `_phase2_utils.py`)
- [x] Generar `X_mayo_junio.parquet` — 57,101 filas, 12 features
- [x] Cargar Modelo A con calibración isotónica, threshold 0.20
- [x] Cargar Modelo B con argmax
- [x] Generar `sesiones_detectadas_mayo_junio.csv`
- [x] Generar `inferencia_mayo_junio.html`

### Validación
- [ ] Abrir dashboard y revisar sesiones detectadas vs. curva de peso
- [ ] Iniciar etiquetado retroactivo con `app_anotacion.py` (opcional pero recomendado)
- [ ] Documentar sesiones anómalas o períodos donde el modelo falla visiblemente

### Cierre
- [x] Completar sección "7. Resultados" de este documento
- [ ] Registrar en `04_RESUMEN_EXPERIMENTOS_FASE3.md` la fila del Exp 07

---

## 7. Resultados

*Ejecutado: 2026-06-14. Script: `inferencia_exp07_mayo_junio.py`.*

### 7.1 Sesiones detectadas por Modelo A

| Métrica | Valor |
|---|---|
| Total filas procesadas | 57,101 |
| Filas clasificadas como `activo` | 2,202 (3.9%) |
| Sesiones agrupadas detectadas | **155** |
| Duración media por sesión | 4.9 min |
| 152 sesiones descartadas (sanity filter `|consumido_g| < 3g`) | — |

### 7.2 Sesiones detectadas por Modelo B (dominancia de clase en cada sesión activa)

| Clase dominante | Sesiones |
|---|---|
| `alimentacion` | **134** |
| `servido` | 6 |
| `reposo` (activo en A, reposo en B) | 15 |

**Estadísticas alimentación:**

| Métrica | Valor |
|---|---|
| Consumo total estimado | 1,306 g en 20 días |
| Consumo medio por sesión | 9.7 g |
| Duración media | 4.9 min |

**Resumen diario (sesiones de alimentación):**

| Fecha | Sesiones | Consumo (g) | Dur. media (min) |
|---|---|---|---|
| 2026-05-25 | 5 | 11 | 7.0 |
| 2026-05-26 | 6 | 42 | 4.1 |
| 2026-05-27 | 5 | 79 | 6.9 |
| 2026-05-28 | 5 | 76 | 4.5 |
| 2026-05-29 | 6 | 49 | 4.8 |
| 2026-05-30 | 10 | 70 | 4.2 |
| 2026-05-31 | 8 | 92 | 4.1 |
| 2026-06-01 | 13 | 61 | 4.4 |
| 2026-06-02 | 9 | 89 | 4.4 |
| 2026-06-03 | 8 | 41 | 3.0 |
| 2026-06-04 | 11 | 74 | 5.5 |
| 2026-06-05 | 9 | 105 | 4.0 |
| 2026-06-06 | 3 | 41 | 6.5 |
| 2026-06-07 | 5 | 75 | 6.2 |
| 2026-06-08 | 4 | 65 | 4.1 |
| 2026-06-09 | 6 | 98 | 7.3 |
| 2026-06-10 | 9 | 64 | 4.8 |
| 2026-06-11 | 5 | 71 | 5.8 |
| 2026-06-12 | 4 | 40 | 6.5 |
| 2026-06-13 | 3 | 63 | 4.0 |

**Observaciones post-inferencia:**
- 15 sesiones con clase dominante `reposo` detectadas como activas por Modelo A sugieren que el threshold 0.20 está siendo muy sensible en algunas zonas de transición (servido o reseteo del plato).
- Algunas sesiones muestran `consumido_g` negativo (ej. -53g, -129g): son eventos de servido clasificados como alimentación — coherente con la dificultad histórica del Modelo B en discriminar servido (F1 servido=0.14 en Exp 06).
- La cadencia de 30s (vs. 14.7s en entrenamiento) puede generar ventanas rolling con menos puntos, lo que reduce levemente la resolución de `rolling_std_5` y `rolling_std_10`.

### 7.3 Métricas (pendiente de etiquetado retroactivo)

| Métrica | Valor |
|---|---|
| Modelo A — F1 activo | pendiente |
| Modelo A — AUC-ROC | pendiente |
| Modelo B — Macro F1 | pendiente |
| Modelo B — F1 alimentacion | pendiente |
| Modelo B — F1 servido | pendiente |

Para calcularlas: etiquetar retroactivamente con `app_anotacion.py` y re-ejecutar con el CSV de anotaciones.

---

## 8. Riesgos técnicos

| Riesgo | Mitigación |
|---|---|
| `clock_invalid = True` en 100% de filas | Usar `ingested_at` siempre, sin condición |
| 3 devices en el CSV | Filtrar por UUID de KPCL0034 antes de cualquier cálculo |
| Features nuevas (`light_*`) | No incorporar al modelo — los Exp 01–06 no las conocen |
| Device desconocido (`418565e7`) | Ignorar en este experimento — investigar origen en paralelo |
| KPCL0035 en mismo CSV | Excluir del pipeline — no tiene etiquetas ni historial de entrenamiento |
| Deriva de distribución Mayo–Jun vs. Apr | Esperable — es exactamente lo que este experimento mide |

---

## 9. Relación con experimentos anteriores

| Experimento | Rol en el Exp 07 |
|---|---|
| `exp_01_linea_base.md` | Línea base histórica de referencia |
| `exp_02_threshold_rebalanceo.md` | Introdujo threshold tuning — threshold 0.20 del Exp 07 viene de esta línea |
| `exp_03_mejor_base.md` | Definió las 12 features activas — invariantes en el Exp 07 |
| `exp_04_smote_calibracion.md` | Introdujo calibración isotónica — usada en Modelo A del Exp 07 |
| `exp_05_nueva_ingesta.md` | Confirmó que nueva ingesta no siempre mueve el modelo — lección aplicable aquí |
| `exp_06_colab_dataset.md` | **Fuente de los modelos** usados en el Exp 07 — F1 activo 0.76, F1 alim 0.76 |

---

## 10. Próxima ejecución

Para repetir o continuar este experimento:

1. Verificar que `readings_rows.csv` sigue en la ruta de Mayo_2026.
2. Verificar que los modelos del Exp 06 están en `fase_3_modelos/models/`.
3. Ejecutar el checklist de la sección 6 en orden.
4. Si se etiquetó retroactivamente, volver a calcular métricas con las anotaciones nuevas.
5. Guardar una nueva versión de este documento con fecha y resultados completos.


======================================================================
KITTYPAU — EXP 07 — ANÁLISIS KPCL0034 — Mayo–Junio 2026
======================================================================

Cargando: readings_rows.csv
  Filas totales: 121,764  |  Columnas: 20

  KPCL0034 aislado: 57,154 filas  (46.9% del CSV total)
  clock_invalid = True: 100.0%  → usando ingested_at siempre

──────────────────────────────────────────────────────────────────────
1. RANGO TEMPORAL Y CADENCIA — KPCL0034

──────────────────────────────────────────────────────────────────────
  Inicio   : 2026-05-25 01:51:44.354000+00:00
  Fin      : 2026-06-14 04:06:15.895000+00:00
  Duración : 20 days 02:14:31.541000
  Filas    : 57,107

  Cadencia:
    Mediana : 30.0 s  (Exp 01–05: 14.7 s)
    Media   : 30.2 s
    Mín     : 0.0 s
    Máx     : 1328.8 s

  Gaps > 300s (delimitan segmentos): 11
    Gap 1: 172.2 min  @ 2026-05-29 17:26:35.413000+00:00
    Gap 2: 63.3 min  @ 2026-05-29 19:57:56.108000+00:00
    Gap 3: 14.1 min  @ 2026-05-30 14:49:45.353000+00:00
    Gap 4: 22.1 min  @ 2026-05-30 16:09:54.414000+00:00
    Gap 5: 6.6 min  @ 2026-06-04 14:13:58.508000+00:00
    Gap 6: 6.6 min  @ 2026-06-07 21:37:34.148000+00:00
    Gap 7: 9.1 min  @ 2026-06-08 16:03:55.508000+00:00
    Gap 8: 7.6 min  @ 2026-06-11 14:48:59.956000+00:00
    Gap 9: 18.6 min  @ 2026-06-12 13:55:44.255000+00:00
    Gap 10: 6.6 min  @ 2026-06-12 14:34:26.087000+00:00
    Gap 11: 17.0 min  @ 2026-06-12 15:03:57.851000+00:00

──────────────────────────────────────────────────────────────────────
2. CALIDAD DE SEÑAL — weight_grams

──────────────────────────────────────────────────────────────────────
  Filas válidas : 57,055  |  Nulos: 52 (0.09%)
  Min    : 0.0 g
  P5     : 90.0 g
  P25    : 107.0 g
  Mediana: 122.0 g
  Media  : 125.4 g
  P75    : 142.0 g
  P95    : 174.0 g
  Max    : 237.0 g
  Std    : 26.10 g

  Peso neto (weight - 151g plato):
    Mediana: -29.0 g
    Negativo (posible vacío/tara): 47,653 filas (83.5%)

  Outliers detectados:
    weight > 900g  : 0 filas
    weight = 0g    : 12 filas

  Peso mediano por día:
            mediana_g      std_g  n_lecturas
fecha
2026-05-25      125.0  21.545809        2700
2026-05-26      107.0  27.349324        2875
2026-05-27      179.0  12.601790        2870
2026-05-28      134.0  22.389175        2872
2026-05-29      120.0  14.940620        2387
2026-05-30      135.0  18.856575        2805
2026-05-31      102.0  27.488932        2873
2026-06-01      124.0   7.004305        2871
2026-06-02       95.0  14.200063        2872
2026-06-03      115.0   3.907542        2875
2026-06-04      114.0   7.326804        2855
2026-06-05      100.0  12.005734        2877
2026-06-06      123.0  17.627755        2870
2026-06-07      137.0  15.753532        2861
2026-06-08      123.0  16.251806        2860
2026-06-09      113.0  27.429069        2872
2026-06-10      166.0  21.821244        2869
2026-06-11      165.0  12.686581        2843
2026-06-12      128.0   9.690094        2786
2026-06-13      108.0  17.478603        2870
2026-06-14      111.0   3.291225         492

──────────────────────────────────────────────────────────────────────
3. PRE-CÁLCULO DE 12 FEATURES INVARIANTES (Exp 03–06)

──────────────────────────────────────────────────────────────────────
d:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\analisis.py:158: FutureWarning: Series.fillna with 'method' is deprecated and will raise in a future version. Use obj.ffill() or obj.bfill() instead.
  w  = df["weight_grams"].fillna(method="ffill")
  Features calculadas:
                   n_validos     mean      std    min  mediana       max
weight_grams         57055.0  125.355   26.098    0.0  122.000   237.000
delta_w              57106.0    0.000    2.670 -129.0    0.000   141.000
delta_w_10           57097.0    0.004    4.753 -129.0    0.000   141.000
rolling_std_5        57106.0    0.240    2.121    0.0    0.000    63.057
rolling_std_10       57106.0    0.392    2.439    0.0    0.000    55.356
rolling_mean_5       57106.0  125.360   26.033    0.0  122.000   195.000
net_weight           57098.0    1.260    7.459 -129.0    0.000   106.000
is_plateau           57107.0    0.967    0.178    0.0    1.000     1.000
plateau_duration     57107.0  235.908  216.170    0.0  176.000  1243.000
hour_sin             57107.0    0.014    0.705   -1.0    0.031     1.000
hour_cos             57107.0    0.008    0.709   -1.0    0.017     1.000
clock_invalid_int    57107.0    1.000    0.000    1.0    1.000     1.000

  Filas con delta_w < -2g (candidatos a consumo): 499  (0.87%)
  Filas con delta_w > +10g (candidatos a servido): 74  (0.13%)
  Filas en plateau (rolling_std_5 < 1.5g): 96.7%

──────────────────────────────────────────────────────────────────────
4. ZONAS CANDIDATAS A SESIONES DE ALIMENTACIÓN

──────────────────────────────────────────────────────────────────────
  (Heurístico pre-modelo: caída sostenida > 5g en < 30 min)

  Sesiones candidatas detectadas: 115
  Consumo total estimado     : 2096.0 g
  Consumo medio por sesión   : 18.2 g
  Duración media             : 5.2 min

  Detalle (primeras 20):
                          inicio                              fin  duracion_min  consumo_g  peso_inicio  peso_fin
2026-05-25 12:18:55.217000+00:00 2026-05-25 12:25:55.527000+00:00           7.0       20.0        153.0     133.0
2026-05-25 15:17:03.670000+00:00 2026-05-25 15:23:33.724000+00:00           6.5       12.0        137.0     125.0
2026-05-25 21:05:34.984000+00:00 2026-05-25 21:10:34.896000+00:00           5.0       11.0        121.0     110.0
2026-05-25 23:06:35.815000+00:00 2026-05-25 23:13:05.788000+00:00           6.5       21.0        116.0      95.0
2026-05-26 07:22:08.353000+00:00 2026-05-26 07:24:38.472000+00:00           2.5        6.0        134.0     128.0
2026-05-26 07:52:38.568000+00:00 2026-05-26 07:57:38.560000+00:00           5.0       11.0        133.0     122.0
2026-05-26 11:08:39.697000+00:00 2026-05-26 11:16:09.799000+00:00           7.5       15.0        122.0     107.0
2026-05-26 11:37:39.856000+00:00 2026-05-26 11:42:39.821000+00:00           5.0       10.0        111.0     101.0
2026-05-26 16:13:41.151000+00:00 2026-05-26 16:16:11.159000+00:00           2.5        6.0         99.0      93.0
2026-05-26 21:37:42.162000+00:00 2026-05-26 21:42:42.014000+00:00           5.0       11.0        198.0     187.0
2026-05-27 00:08:42.727000+00:00 2026-05-27 00:13:12.905000+00:00           4.5       11.0        190.0     179.0
2026-05-27 09:35:18.691000+00:00 2026-05-27 09:37:48.633000+00:00           2.5        6.0        185.0     179.0
2026-05-27 13:44:50.118000+00:00 2026-05-27 13:50:20.136000+00:00           5.5       14.0        192.0     178.0
2026-05-27 15:11:20.637000+00:00 2026-05-27 15:13:50.856000+00:00           2.5        9.0        180.0     171.0
2026-05-27 19:51:52.641000+00:00 2026-05-27 19:59:52.789000+00:00           8.0       36.0        179.0     143.0
2026-05-27 23:59:55.415000+00:00 2026-05-28 00:08:25.534000+00:00           8.5       21.0        155.0     134.0
2026-05-28 04:59:04.257000+00:00 2026-05-28 05:04:04.353000+00:00           5.0       13.0        137.0     124.0
2026-05-28 09:48:35.479000+00:00 2026-05-28 09:53:05.439000+00:00           4.5       11.0        124.0     113.0
2026-05-28 09:53:35.495000+00:00 2026-05-28 09:56:05.654000+00:00           2.5        7.0        113.0     106.0
2026-05-28 11:38:36.201000+00:00 2026-05-28 11:41:06.177000+00:00           2.5       55.0        106.0      51.0

  Resumen diario:
            n_sesiones  consumo_total_g  duracion_media_min
fecha
2026-05-25           4             64.0                 6.2
2026-05-26           6             59.0                 4.6
2026-05-27           6             97.0                 5.2
2026-05-28           7            143.0                 3.9
2026-05-29           4             57.0                 5.3
2026-05-30           7             97.0                 4.6
2026-05-31           7            120.0                 4.9
2026-06-01           7            125.0                 5.7
2026-06-02           8             95.0                 4.6
2026-06-03           4             98.0                 4.0
2026-06-04          10            179.0                 5.2
2026-06-05           9            163.0                 4.1
2026-06-06           3             46.0                 6.5
2026-06-07           6            183.0                 5.6
2026-06-08           5             91.0                 6.3
2026-06-09           5            110.0                 8.1
2026-06-10           6             96.0                 5.2
2026-06-11           6            119.0                 5.3
2026-06-12           4             81.0                 6.0
2026-06-13           1             73.0                 7.0

──────────────────────────────────────────────────────────────────────
5. DERIVA DE DISTRIBUCIÓN vs. DATOS DE ENTRENAMIENTO (Exp 06)

──────────────────────────────────────────────────────────────────────
  weight_grams — comparación:
    Este CSV  → mediana: 122.0g  |  std: 26.1g
    Exp 06    → mediana en train no documentada explícitamente
    Plate weight referencia: 151g

  temperature:
    Mediana: 19.5°C  |  Rango: 15.0–22.0°C

  humidity:
    Mediana: 40.1%  |  Rango: 29.4–49.8%

  Distribución horaria de lecturas (UTC):
    00h:  2,398  ████
    01h:  2,460  ████
    02h:  2,514  █████
    03h:  2,515  █████
    04h:  2,407  ████
    05h:  2,399  ████
    06h:  2,398  ████
    07h:  2,396  ████
    08h:  2,396  ████
    09h:  2,399  ████
    10h:  2,398  ████
    11h:  2,396  ████
    12h:  2,393  ████
    13h:  2,355  ████
    14h:  2,250  ████
    15h:  2,231  ████
    16h:  2,243  ████
    17h:  2,343  ████
    18h:  2,383  ████
    19h:  2,276  ████
    20h:  2,383  ████
    21h:  2,387  ████
    22h:  2,393  ████
    23h:  2,394  ████

  Features nuevas (NO incorporar al modelo actual):
    light_percent → mediana: 1.0%
    light_lux     → mediana: 13.69 lux
    light_condition distribución:
      dark      :  56,773  (99.4%)
      dim       :     334  (0.6%)

──────────────────────────────────────────────────────────────────────
6. VERIFICACIÓN DE COMPATIBILIDAD CON MODELOS EXP 06

──────────────────────────────────────────────────────────────────────

  Check                          Criterio                                 Estado Detalle
  ────────────────────────────── ──────────────────────────────────────── ───── ────────────────────
  weight_grams                   columna requerida                        ✅
  temperature                    columna requerida                        ✅
  humidity                       columna requerida                        ✅
  ingested_at                    columna requerida                        ✅
  clock_invalid                  columna requerida                        ✅
  weight_grams                   cobertura > 98%                          ✅     99.9%
  clock_invalid                  100% True → usar ingested_at             ✅     100% True
  weight_grams                   rango 0–1100g                            ✅     0–237g
  12 features                    calculables desde columnas disponibles   ✅
  water_ml / flow_rate           vacías — ignorar                         ✅     ['water_ml', 'flow_rate']

  Modelo A (binario)   → threshold calibrado a usar: 0.20
  Modelo B (multiclase)→ argmax de probabilidades
  Artefactos esperados:
    fase_3_modelos/models/modelo_a/modelo_a.lgb
    fase_3_modelos/models/modelo_a/calibration_isotonic.json
    fase_3_modelos/models/modelo_b/modelo_b.lgb

──────────────────────────────────────────────────────────────────────
7. RESUMEN EJECUTIVO — LISTO PARA EXP 07

──────────────────────────────────────────────────────────────────────

  Dataset  : readings_rows.csv — KPCL0034 aislado
  Período  : 2026-05-25 → 2026-06-14 (20 días)
  Filas    : 57,107
  Cadencia : 30.0 s mediana
  Peso     : 122.0g mediana  |  26.1g std
  Gaps     : 11 gaps > 5 min

  ALERTAS CRÍTICAS:
    ⚠️  clock_invalid = True en 100% → usar ingested_at siempre
    ⚠️  3 devices en CSV → solo KPCL0034 filtrado aquí
    ⚠️  light_percent / light_lux presentes → NO incorporar al modelo
    ⚠️  Sin etiquetas → inferencia pura, no evaluación

  SIGUIENTE PASO:
    1. Ejecutar 03_extract_readings.py con ingested_at forzado
    2. Ejecutar 02_build_features.py → X_mayo_junio.parquet
    3. Ejecutar inferencia_kpcl0034.py con modelos del Exp 06
    4. Abrir inferencia_mayo_junio.html y validar visualmente
    5. Etiquetar sesiones retroactivamente con app_anotacion.py

======================================================================
FIN DEL ANÁLISIS
======================================================================