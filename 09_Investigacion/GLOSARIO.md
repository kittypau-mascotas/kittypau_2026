# Glosario del Ecosistema Kittypau Investigacion

> Definiciones de todos los términos técnicos usados en esta carpeta.
> Referencia cruzada con [README.md](README.md) y [EXPERIMENT_TRACKER.md](EXPERIMENT_TRACKER.md).

---

## Dispositivos (Devices)

| ID | UUID | Descripción | Estado en ML |
|----|------|-------------|-------------|
| **KPCL0034** | `3a460074-e7c3-41bf-ae5a-a011445f927a` | Comedero de Bandida (gata principal). Device de referencia para todos los experimentos. | ✅ ACTIVO — todos los modelos entrenados con este device |
| **KPCL0035** | `0dc601c0-1533-40c5-b606-6d89eb2d4042` | Comedero nuevo, instalado ~May 2026. Sin etiquetas manuales. | ⏳ Pendiente etiquetado para Exp 10 |
| **KPCL0036** | (no en pipeline activo) | Device con anomalía de peso documentada (voltaje bajo → spikes). | ❌ EXCLUIDO — ver `07_AUDITORIA_KPCL0036_ERROR_PESO.md` |
| **Device desconocido** | `418565e7-6683-440c-80e6-666363574cec` | Aparece en dump Mayo_2026. Origen no identificado. | ❌ EXCLUIDO — investigar origen |

**Bandida** = nombre de la gata de prueba de KPCL0034.

**KPCL** = Kittypau Cat Litter (nomenclatura interna de dispositivos).

---

## Clases / Etiquetas de los Modelos

| Clase | Índice | Descripción | Criterio |
|-------|--------|-------------|---------|
| **alimentacion** | 0 | Gato comiendo activamente del plato | Delta peso negativo, Bandida presente, par inicio/termino en audit_events |
| **servido** | 1 | Humano añade comida al plato | Delta peso fuertemente positivo (>10g), evento explícito en audit_events |
| **reposo** | 2 | Sin actividad sobre el comedero | Delta peso ≈ 0, `is_plateau=1` sostenido |

**FUENTE DE VERDAD:** Siempre `public.audit_events` en Supabase (event_type = 'manual_bowl_category').
Nunca usar `detectIntakeSessions` (heurístico del cliente) como ground truth.

---

## Taxonomía de Datos

Cada dato del proyecto cae en una categoría según dos ejes independientes:
- **Eje 1 — Etiquetado manual:** ¿tiene ground truth creado por un humano?
- **Eje 2 — Uso en entrenamiento:** ¿el modelo lo vio durante el training?

### Mapa de categorías (estado Exp 06 activo)

| Categoría | Etiquetado manual | Visto por el modelo | Período | Archivos clave |
|---|:---:|:---:|---|---|
| **Train set** | ✅ Sí | ✅ Sí — usado en entrenamiento | Apr 8 – Apr 25, 2026 | `X_train.parquet` · `y_train.parquet` |
| **Val set** | ✅ Sí | ✅ Sí — usado en validación | Apr 25 – Apr 28, 2026 | `X_val.parquet` · `y_val.parquet` |
| **Test set** ⚠️ RESERVADO | ✅ Sí | ❌ NO — jamás visto por el modelo | Apr 28 – May 1, 2026 | `X_test.parquet` · `y_test.parquet` |
| **Datos de inferencia** (Exp 07) | ❌ No — pendiente retroactivo | ❌ NO — dato nuevo fuera del período de entrenamiento | May 25 – Jun 14, 2026 | `X_mayo_junio.parquet` · `sesiones_detectadas_mayo_junio.csv` |

### Reglas críticas de integridad

1. **Test set**: tiene etiquetas manuales pero el modelo **NUNCA lo ha visto**. Reservado exclusivamente para evaluación formal en Fase 4. No reentrenar con él.
2. **Datos de inferencia**: el modelo predice sesiones, pero esas predicciones **no son ground truth** — son salidas del modelo, no verdades verificadas por un humano. Sin etiquetado retroactivo no se pueden calcular F1 ni AUC.
3. **Etiquetado retroactivo** (via `app_anotacion.py` → `new_annotations.csv`): convierte los datos de inferencia en datos etiquetados, habilitando el Exp 08.

### Fuentes de etiquetas manuales

| Fuente | Cómo se genera | Cobertura temporal |
|---|---|---|
| `public.audit_events` (Supabase) | Operador etiqueta en tiempo real desde el dashboard web | Apr 8 – May 1, 2026 (dump 07-05-2026) |
| `new_annotations.csv` (local) | Operador etiqueta retroactivamente desde `app_anotacion.py` | May 25 – Jun 14, 2026 (⏳ pendiente) |
| `events_labeled.parquet` | `04_extract_events.py` fusiona ambas fuentes automáticamente | Entrada canónica de Fase 2 |

---

## Las 12 Features del Modelo

> Estas 12 features son **invariantes desde Exp 03**. Cambiarlas requiere reentrenar el pipeline completo desde Fase 1 y crear un nuevo experimento.

| # | Feature | Tipo | Descripción | Parámetros clave |
|---|---------|------|-------------|-----------------|
| 1 | `weight_grams` | float | Peso bruto del plato (interpolado en nulos) | — |
| 2 | `delta_w` | float | Cambio fila-a-fila: `weight[t] - weight[t-1]` | ventana = 1 |
| 3 | `delta_w_10` | float | Cambio ventana 10: `weight[t] - weight[t-10]` | ventana = 10 |
| 4 | `rolling_std_5` | float | Desviación estándar móvil | ventana = 5 lecturas |
| 5 | `rolling_std_10` | float | Desviación estándar móvil | ventana = 10 lecturas |
| 6 | `rolling_mean_5` | float | Media móvil | ventana = 5 lecturas |
| 7 | `net_weight` | float | Peso neto: `weight - baseline_w` | baseline = percentil 10, ventana 60 lecturas |
| 8 | `is_plateau` | int (0/1) | 1 si `rolling_std_5 < 1.5g` | threshold = 1.5g |
| 9 | `plateau_duration` | int | Filas consecutivas en plateau (acumulado) | — |
| 10 | `hour_sin` | float | Seno del ciclo horario: `sin(2π·hora/24)` | período = 24h |
| 11 | `hour_cos` | float | Coseno del ciclo horario: `cos(2π·hora/24)` | período = 24h |
| 12 | `clock_invalid` | int (0/1) | 1 si reloj del device no es confiable | — |

### Features Disponibles pero NO Incorporadas

| Feature | Disponible desde | Motivo de exclusión |
|---------|-----------------|---------------------|
| `light_percent` | Mayo_2026 | No presente en entrenamiento Exp 01–07; incorporar en Exp 08+ requiere reentrenamiento completo |
| `light_lux` | Mayo_2026 | Ídem |
| `light_condition` | Mayo_2026 | Ídem |
| `battery_level` | Parcial (solo KPCL0035) | No disponible de forma consistente en KPCL0034 |

---

## Parámetros Globales del Pipeline

> Estos parámetros son constantes en todo el ecosistema. Si se modifican, debe crearse un nuevo experimento.

| Parámetro | Valor | Descripción | Definido en |
|-----------|-------|-------------|------------|
| `GAP_CUTOFF_S` | 300 s (5 min) | Gap temporal que crea un nuevo segmento de inferencia | `_phase2_utils.py` |
| `PLATEAU_THRESHOLD` | 1.5 g | Umbral de `rolling_std_5` para clasificar como plateau | `_phase2_utils.py` |
| `THRESHOLD_A` | 0.20 | Threshold calibrado para Modelo A (`prob_activo ≥ 0.20` → activo) | `calibration_isotonic.json` |
| `MIN_SESSION_S` | 30 s | Duración mínima para que una sesión sea válida | `inferencia_exp07_mayo_junio.py` |
| `GAP_MERGE_S` | 60 s | Gap entre activos que se fusionan en la misma sesión | `inferencia_exp07_mayo_junio.py` |
| `MIN_CONSUMED_G` | 3.0 g | Cambio mínimo de peso para que una sesión cuente | `inferencia_exp07_mayo_junio.py` |
| `BASELINE_WINDOW` | 60 lecturas | Ventana para calcular percentil 10 de `net_weight` | `_phase2_utils.py` |

---

## Calidad de Datos

| Flag / Campo | Descripción | Impacto en pipeline | Solución |
|---|---|---|---|
| `clock_invalid = True` | Reloj interno del device no confiable | `recorded_at` no usable | Usar `ingested_at` como timestamp |
| `clock_invalid = False` | Reloj confiable | `recorded_at` es el timestamp canónico | Usar `recorded_at` |
| `battery_level = NaN` | KPCL0034 sin cargador no reporta batería | Solo informativo | Ignorar en features |
| `water_ml = 0` / `flow_rate = 0` | Columnas vestigiales vacías | Ninguno | Excluir de features |
| `weight_grams = NaN` | Lectura de peso faltante (<0.1% del tiempo) | Puede afectar rolling features | Interpolación lineal dentro de segmentos |
| `light_*` columns | Solo en dumps Mayo_2026+ | No están en los modelos Exp 01–07 | No incorporar hasta Exp 08+ |

### Regla de Timestamp (Prioridad)

```python
# Aplicar siempre al procesar cualquier dump:
if df['clock_invalid'].all():
    df['ts'] = pd.to_datetime(df['ingested_at'])   # 100% True → forzar ingested_at
else:
    df['ts'] = df.apply(
        lambda r: r['ingested_at'] if r['clock_invalid'] else r['recorded_at'],
        axis=1
    )
```

---

## Fases del Pipeline ML

| Fase | Nombre | Propósito | Scripts | Artefactos de salida |
|------|--------|-----------|---------|---------------------|
| **Fase 1** | Extracción | Obtener lecturas y eventos desde Supabase/CSV | `01_setup_env.py` → `06_quality_report.py` | `readings_raw.parquet`, `events_labeled.parquet`, `sessions_labeled.parquet` |
| **Fase 2** | Dataset | Feature engineering + splits supervisados | `01_build_labels.py` → `04_dataset_report.py` | `X_train/val/test.parquet`, `y_*.parquet`, `dataset_meta.json` |
| **Fase 3** | Modelos | Entrenar Modelo A y B con LightGBM | `01_prepare_datasets.py` → `04_training_report.py` | `modelo_a.lgb`, `modelo_b.lgb`, `calibration_isotonic.json` |
| **Fase 4** | Anotación | Etiquetar retroactivamente + evaluar en producción | `app_anotacion.py` | `new_annotations.csv`, métricas formales |

**Orden de ejecución:** Fase 1 → Fase 2 → Fase 3 → Fase 4 (siempre secuencial, nunca saltear fases).

---

## Modelos en Producción (Exp 06)

| Modelo | Tipo | Artefacto | Tarea | Threshold | Métricas val |
|--------|------|-----------|-------|-----------|-------------|
| **Modelo A** | Binario (activo vs reposo) | `modelo_a.lgb` + `calibration_isotonic.json` | Detectar si hay actividad sobre el plato | `prob_activo ≥ 0.20` | F1 activo = **0.7619** ✅ |
| **Modelo B** | Multiclase (alimentacion / servido / reposo) | `modelo_b.lgb` | Clasificar tipo de actividad cuando A detecta actividad | argmax probabilidades | F1 alim = **0.7606** ✅ · F1 serv = 0.1395 ⚠️ |

**Algoritmo:** LightGBM (gradient boosting) — versión utilizada en Exp 06.

**Split temporal del dataset:**
- Train: Apr 8 → Apr 20, 2026 (44,016 filas)
- Val: Apr 20 → Apr 28, 2026 (9,432 filas)
- Test: Apr 28 → May 1, 2026 (9,432 filas) — evaluación formal pendiente

---

## Convención de Experimentos

| Componente | Formato | Ejemplo |
|-----------|---------|---------|
| ID | `Exp NN` (dos dígitos con cero) | `Exp 07` |
| Archivo | `exp_NN_nombre_corto.md` en `experiments/` | `exp_07_inferencia_mayo_junio.md` |
| Fecha | ISO 8601 (YYYY-MM-DD) | `2026-06-14` |

### Estados de Experimento

| Estado | Ícono | Significado |
|--------|-------|-------------|
| ACTIVO | ★ | Experimento en ejecución o en producción |
| Completado | ✅ | Finalizado con métricas registradas |
| Pendiente | ⏳ | Planificado, prerequisitos no cumplidos |
| Histórico | 🗂️ | Completado y archivado (solo referencia) |
| Descartado | ❌ | Resultados descartados, no usados |

---

## Tablas en Supabase (Producción)

| Tabla | Descripción | Rol en el pipeline |
|-------|-------------|-------------------|
| `public.audit_events` | **FUENTE DE VERDAD** — eventos manuales categorizados | Origen de labels para Fase 1 |
| `public.device_bowl_sessions` | Sesiones cerradas (pares inicio/termino) | Consulta operativa |
| `public.device_bowl_session_anomalies` | Inconsistencias de etiquetado | Auditoría de calidad |
| `public.readings` | Lecturas crudas de sensores | Datos fuente de Fase 1 (alternativa al CSV) |
| `public.devices` | Metadata de dispositivos | Mapeo UUID → nombre KPCL |

**Función SQL clave:** `public.rebuild_device_bowl_sessions()` — reconstruye sesiones desde audit_events.

---

## Términos del Negocio / Dominio

| Término | Definición |
|---------|-----------|
| **Sesión de alimentación** | Período donde Bandida come activamente: desde inicio hasta termino, consumo neto > 3g |
| **Sesión de servido** | Evento donde un humano añade comida al plato (delta positivo marcado) |
| **Consumo neto** | `peso_inicio_g - peso_fin_g` de una sesión (positivo = Bandida comió) |
| **Tare** | Recalibración manual del sensor a cero (evento especial en audit_events) |
| **Backfill** | Proceso de etiquetar retroactivamente eventos históricos ya pasados |
| **Plateau** | Estado del plato donde el peso es estable (`rolling_std_5 < 1.5g`) — indica reposo |
| **Segmento** | Tramo continuo de lecturas separado del anterior por un gap > 5 min |
| **Inferencia** | Aplicar un modelo ya entrenado a datos nuevos sin reentrenar (Exp 07) |
| **Calibración isotónica** | Ajuste post-entrenamiento de las probabilidades del Modelo A para obtener threshold 0.20 |

---

## Fuentes Externas

| Fuente | URL / Acceso | Propósito |
|--------|-------------|---------|
| Supabase (producción) | Variables de entorno en `.env` | Base de datos con lecturas y eventos |
| Google Colab | Análisis exploratorio independiente | Ver `05_ANALISIS_COLAB_KPCL0034_07052026.md` |
| Google Drive | CSVs para análisis Colab | `kittypau_full_07-05-2026_csv/` subido manualmente |
