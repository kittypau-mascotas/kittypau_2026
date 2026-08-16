---
area: Data Science
ciclo: Alpha v2
tipo: referencia-maestra
actualizado: 2026-06-25
---

# Aprendizajes Consolidados — Alpha, Gamma, Delta + Exp 10-NN

> Este documento es la memoria institucional de los 4 ciclos anteriores.
> **Leer antes de escribir cualquier script de Alpha v2.**
> Cada regla tiene una razón documentada — no ignorar sin justificación explícita.

---

## 1. El problema fundamental (por qué cambia la formulación)

Los 4 ciclos (Alpha Exp 01–11, Gamma G-01–05, Delta, Exp 10-NN) confirmaron el mismo diagnóstico:

**Clasificar lecturas individuales tiene un techo en F1-servido ≈ 0.34.**
- Alpha: 0.14 (Exp 06)
- Gamma: 0.27 (G-01)
- NN/GRU: 0.34 (Exp 10)

El GRU mejoró el servido porque captura dependencias temporales (ventana de 10 timesteps),
pero sigue siendo per-reading. Alpha v2 elimina este techo cambiando la unidad de análisis:
**de lecturas individuales a segmentos completos (eventos).**

Un evento `servido` tiene forma: ascenso rápido (+peso) → plateau.
Un evento `alimentacion` tiene forma: descenso gradual → plateau bajo.
El ruido fluctúa sin dirección sostenida.
Ningún modelo per-reading puede ver estas formas — solo el segmento completo las revela.

---

## 2. Estado actual de datos (al 2026-06-25)

### Sesiones en `public.audit_events`

| Fuente | alimentacion | servido real | servido sint. | reposo | sin_clasificar |
|--------|-------------|--------------|---------------|--------|----------------|
| Gamma Pre-G (app_anotacion_gamma, 647 candidatos revisados) | **264** | **63** | — | 296 | 24 |
| Alpha dataset Exp 08 (pipeline Apr–Jun) | 185 | 27 | — | — | — |

> La diferencia 264 vs 185 (alim) y 63 vs 27 (serv) refleja distintas ventanas:
> Pre-G cubre la revisión completa de los 3 meses; Exp 08 usa lo confirmado retroactivamente
> vía app_anotacion.py sobre 155 sesiones de Exp 07.
>
> **Ground truth confiable:** `public.audit_events` en Supabase — siempre derivar de ahí.

### Dataset de lecturas disponible

| Artefacto | Filas | Columnas | Rango | Dónde |
|-----------|-------|----------|-------|-------|
| `readings_delta.parquet` | 134,164 | 25 (18 features + metadatos) | Abr–Jun 2026 | `Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Delta/fase_1_datos/data/processed/` |
| `X_scaled.parquet` | 134,164 | 18 | Abr–Jun 2026 | misma ruta |
| `readings_raw.parquet` (Alpha) | 124,682 | — | Abr 8–May 1 | `Ciclo Alpha/fase_1_extraccion/data/` |

---

## 3. Constantes validadas del pipeline (NO cambiar sin experimento)

```python
# Del Ciclo Gamma — validadas en Pre-G y G-01 a G-05
GAP_CUTOFF_S        = 300     # 5 min → separa sesiones independientes
PLATEAU_THRESHOLD   = 1.5     # rolling_std_5 < 1.5g → lectura estable (reposo)
RESAMPLE_TARGET_S   = 30      # cadencia uniforme ANTES de cualquier feature
MIN_SERVIDO_REALES  = 80      # mínimo sesiones servido para entrenar sin augmentar
MIN_ALIM            = 200     # mínimo sesiones alimentacion para entrenamiento robusto

# UUIDs del mismo device físico KPCL0034 (Bandida food_bowl)
KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",  # Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # Mayo–Junio 2026
]

LABEL_ENCODING = {
    "alimentacion": 0,
    "servido":      1,
    "reposo":       2,
}

TIMEZONE_NEGOCIO = "America/Santiago"  # NUNCA UTC para features de hora/día
```

---

## 4. Reglas críticas de datos (todas validadas con incidentes reales)

| Regla | Por qué | Violación en |
|-------|---------|-------------|
| Usar `ingested_at` cuando `clock_invalid=True` | 71.17% de lecturas Delta tienen reloj inválido | Alpha Exp 01–05 |
| Resamplear a 30s ANTES de calcular rolling features | Distribution shift: Apr a 14.7s, May–Jun a 30s | Alpha Exp 08 (F1 activo bajó 0.16) |
| Usar ambos UUIDs de KPCL0034 | Un solo UUID pierde datos de Abril (3a460074 ≠ 9510a455) | Alpha Exp 01–05 |
| Timezone America/Santiago para hour_sin/cos | Hora UTC no refleja patrones reales de Bandida | Alpha Exp 01–07 |
| `plateau_duration` en segundos, no en filas | Con cadencia variable, filas ≠ tiempo | Alpha (plateau_duration en filas) |
| `ingested_at` en UTC → convertir a Santiago para features | Todos los timestamps raw están en UTC | Gamma Pre-G error corregido |
| Gap Mayo 1–25: no rellenar | Datos faltantes reales de transmisión; rellenar introduce sesiones falsas | Alpha Exp 09 (documentado) |
| No usar sintéticas de servido en train cuando hay < 80 reales | Inflan artificialmente N sin mejorar variabilidad real | Gamma (17 sint. usadas temporalmente) |
| ARI siempre junto con Silhouette | Silhouette k=2 dio 0.82 con ARI=0.16 (clusters triviales de signo(delta_w)) | Delta D-08 |

---

## 5. Features consolidadas — estado final

### Features del Ciclo Gamma (13) — baseline para Alpha v2

| Feature | Descripción | Corrección vs Alpha |
|---------|-------------|---------------------|
| `peso_g` | Peso bruto (g) | — igual |
| `delta_w` | Diferencia vs lectura anterior | — igual |
| `delta_w_10` | Delta sobre ventana 10 lecturas | — igual |
| `rolling_mean_5` | Media móvil 5 lecturas | — igual |
| `rolling_std_5` | std 5 lecturas (proxy estabilidad) | — igual |
| `rolling_mean_30` | Media móvil 30 lecturas | — nueva (Gamma) |
| `rolling_std_30` | std 30 lecturas | — nueva (Gamma) |
| `delta_w_lag1` | delta_w lectura anterior | — igual |
| `delta_w_lag2` | delta_w dos lecturas atrás | — igual |
| `is_plateau` | 1 si rolling_std_5 < PLATEAU_THRESHOLD | — igual |
| `hour_sin` / `hour_cos` | Hora Santiago (no UTC) | ✅ corregido |
| `plateau_duration_s` | Segundos en plateau (no filas) | ✅ corregido |
| `dia_semana_sin` | Componente seno del día de semana | — nueva (Gamma) |

> **`cadencia_s` ELIMINADA:** Aparecía en Alpha Exp 09B–10 pero gain ≈ 0 en todos los modelos.
> No incluir en Alpha v2.

### Features adicionales de Delta (18 = 13 Gamma + 5 nuevas)

| Feature nueva | Descripción | Utilidad en Alpha v2 |
|---------------|-------------|----------------------|
| `delta_w_lag3` | delta_w tres lecturas atrás | Útil para fase_3_features (contexto de pendiente) |
| `rolling_max_5` | Máximo ventana 5 | Útil para detectar picos |
| `rolling_min_5` | Mínimo ventana 5 | Útil para detectar valles |
| `peso_zscore_global` | Z-score respecto a la sesión | Útil para normalizar por nivel de plato |
| `aceleracion_w` | Segunda derivada (cambio de velocidad) | Crítico: distingue ascenso rápido (servido) de lento (alimentacion) |

> En Alpha v2, estas features se calculan a nivel de **segmento completo** como estadísticas
> de la serie interna del segmento, no como features per-reading.

---

## 6. Features de segmento — Alpha v2 (nuevas)

Estas features no existían en ningún ciclo anterior. Son la propuesta central de Alpha v2.

| Feature | Descripción | Por qué es decisiva |
|---------|-------------|---------------------|
| `duracion_s` | Duración del segmento en segundos | Servido: 20–60s; Alim: 2–10 min |
| `delta_peso_total` | peso_final – peso_inicial | Signo separa alim (–) de servido (+) casi perfecto |
| `pendiente_ascenso` | g/s en la fase activa de subida | Alta en servido, casi 0 en alim |
| `pendiente_descenso` | g/s en la fase activa de bajada | Suave en alim, casi 0 en servido |
| `peso_inicial` | Peso al inicio del segmento | Nivel base del plato |
| `peso_final` | Peso al final del segmento | Nivel post-evento |
| `area_bajo_curva` | Integral de |Δpeso| dt | Volumen total de cambio |
| `tiempo_hasta_pico` | Segundos hasta max local | Rápido = servido; lento = alim |
| `variabilidad_plateau` | std en la fase estable post-evento | Ruido residual del sensor |
| `hora_inicio_sin/cos` | Hora Santiago del inicio del segmento | Bandida come a horas regulares |

**Heurística baseline (antes de entrenar cualquier modelo):**
```python
if delta_peso_total > +5:
    return "servido"     # separación casi perfecta por signo
elif delta_peso_total < -5 and duracion_s > 120:
    return "alimentacion"
else:
    return "ruido"
```
> Calcular F1 de esta heurística PRIMERO. Si F1-servido ≥ 0.80 con regla simple,
> el modelo ML es refinamiento, no la solución principal.

---

## 7. Resultados históricos por ciclo — tabla de referencia

### F1 por clase — evolución completa

| Ciclo / Exp | F1-activo | F1-alim | F1-servido | Macro F1 | Notas |
|-------------|-----------|---------|------------|----------|-------|
| Alpha Exp 06 | 0.7619 | 0.7606 | 0.1395 | 0.6312 | LGBM · 103 alim · 18 serv |
| Alpha Exp 08 | 0.6021 | 0.5778 | 0.2414 | — | LGBM · 185 alim · 27 serv · shift distribución |
| Gamma G-01 | 0.8139 | 0.7598 | 0.2656 | 0.6733 | LGBM · 264 alim · 80 serv (63+17) |
| Delta (K-Means k=2) | N/A | N/A | N/A | N/A | Silhouette=0.816 / ARI=0.16 (engañoso) |
| Exp 10 NN-B GRU | 0.5203 | 0.3613 | **0.3400** | 0.5552 | GRU bidir · mejor F1-serv histórico |
| Exp 10 NN-C TCN | **0.6016** | 0.3305 | 0.3333 | 0.5439 | TCN · mejor F1-activo NN |
| **Alpha v2 (objetivo)** | — | ≥ 0.85 | **≥ 0.60** | ≥ 0.75 | Por segmentos |

> **LGBM Exp 06 sigue en producción.** Ninguna NN lo superó en 3+ métricas (criterio de reemplazo).

---

## 8. Bugs críticos documentados en Delta (no repetir)

Estos errores costaron tiempo de debugging en Delta — evitarlos desde el inicio en Alpha v2.

| # | Problema | Fix validado |
|---|---------|-------------|
| 1 | `ModuleNotFoundError` para módulos compartidos | `sys.path.insert(0, str(BASE_DIR / "scripts"))` al inicio de cada script |
| 2 | Paths sin separador (`processedX_scaled`) | Siempre usar operador `/` de pathlib: `BASE / "processed" / "X_scaled.parquet"` |
| 3 | `KeyError: ts_termino` | La columna real es `ts_fin` en `sessions_labeled.parquet` |
| 4 | `cluster_ganador` nunca persistido | Guardar explícitamente en el parquet antes de continuar |
| 5 | Módulo excluido por falta de CSV intermedio | Exportar CSV de resultados en cada script antes de que lo lea el siguiente |
| 6 | `KeyError: votos` — consenso vacío | Manejar set vacío con fallback antes de indexar |
| 7 | `KeyError: categoria` | La columna real es `session_type` en `sessions_labeled.parquet` |
| 8 | Lookup O(n×m) en cruce temporal | Usar merge vectorizado + `pd.to_datetime(..., utc=True)` |

**Regla de implementación:** en cada script nuevo de Alpha v2, verificar los 8 puntos antes de correr.

---

## 9. Arquitecturas de NN — qué aprendimos de Exp 10

Para Alpha v2, la unidad de análisis son **segmentos** (vectores de ~10 features).
Las NN recurrentes no aplican de la misma forma que en per-reading, pero el aprendizaje sirve:

| Hallazgo | Implicancia para Alpha v2 |
|----------|--------------------------|
| GRU captura mejor patrones temporales breves (servido) | Considerar GRU sobre la serie interna del segmento en Fase 5 si LightGBM no alcanza |
| TCN con dilaciones cubre ventanas largas eficientemente | Considerar TCN para segmentos de alimentacion (más largos) |
| Transformer débil para dataset de este tamaño (~135k filas) | No usar Transformer hasta tener >1M muestras |
| Threshold LGBM=0.20 vs NN=0.60 → NN no calibradas | Aplicar calibración isotónica en Fase 5 si se usa NN |
| GRU (F1-serv=0.34) con 27 sesiones reales en train | Con 63+ sesiones reales (objetivo Alpha v2), esperar F1-serv ≥ 0.50+ incluso per-reading |

---

## 10. Anomalías de Delta útiles para Alpha v2

Las 676 anomalías detectadas por Isolation Forest + LOF tienen valor diagnóstico:

| Tipo | N | Uso en Alpha v2 |
|------|---|-----------------|
| H — Hardware | 338 | Excluir de train (clock_invalid extremo, datos corruptos) |
| C — Comportamental (06:00–22:00) | 178 | Candidatos a revisar manualmente — pueden ser servidos no anotados |
| U — Sin clasificar (nocturnas) | 160 | Ignorar o investigar separadamente |

Ruta: `Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Delta/fase_3_anomalias/outputs/anomalias_detectadas.csv`

Los **2 candidatos nuevos de servido** identificados en Delta están en:
`Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Delta/fase_4_validacion/outputs/candidatos_servido_delta_nuevos.csv`

---

## 11. Assets disponibles — inventario completo

| Asset | Estado | Ruta |
|-------|--------|------|
| `readings_delta.parquet` (134k lecturas Abr–Jun) | ✅ | `Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Delta/fase_1_datos/data/processed/` |
| `X_scaled.parquet` (18 features, escaladas) | ✅ | misma ruta |
| `sessions_labeled.parquet` (Alpha Exp 06) | ✅ | `Ciclo Alpha/fase_1_extraccion/data/` |
| `readings_raw.parquet` (Alpha Exp 06) | ✅ | `Ciclo Alpha/fase_1_extraccion/data/` |
| `app_anotacion_gamma.py` | ✅ | `Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Gamma/` |
| `anomalias_detectadas.csv` (676 H/C/U) | ✅ | `Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Delta/fase_3_anomalias/outputs/` |
| `candidatos_servido_delta_nuevos.csv` (2) | ✅ | `Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Delta/fase_4_validacion/outputs/` |
| Modelos LGBM Exp 06 (producción) | ✅ | `Ciclo Alpha/fase_3_modelos/models/` |
| Modelos LGBM Gamma G-01 a G-05 | ✅ | `Ciclo Alpha/Exploracion_Gamma_Delta_2026/Ciclo Gamma/models/` |
| Pipeline extracción Fase 1 | ✅ | `Ciclo Alpha/fase_1_extraccion/` |
| `exp_10_colab.py` + resultados NN | ✅ | `Ciclo Alpha/experiments/exp_10_colab/` |

---

## 12. Lo que Alpha v2 NO debe repetir — lista completa

| Prohibición | Ciclo origen | Consecuencia documentada |
|-------------|-------------|--------------------------|
| Clasificar lecturas individuales como objetivo primario | Alpha, Gamma, Delta, Exp10 | F1-serv techo 0.34 incluso con GRU |
| Usar Silhouette sin ARI contra ground truth | Delta | Silhouette=0.82 con ARI=0.16 — resultado engañoso |
| Asumir que más modelos/arquitecturas resuelven un problema de formulación | Gamma G-02 a G-05, Exp 10 | Mismo techo con RF, ExtraTrees, MLP, TCN, Transformer |
| Augmentar servido sintéticamente antes de tener ≥ 80 reales | Gamma | 17 sint. no reemplazan variabilidad real |
| Olvidar resamplear a 30s antes de calcular features | Alpha, Exp 08 | Distribution shift: val/test en 30s vs train en 14.7s → F1 activo baja 0.16 |
| No modelar ruido del sensor antes de segmentar | (prevención) | Sobre-segmentación garantizada |
| Seguir experimentando sin resolver el problema de datos | Alpha Exp 01–05 | 5 experimentos sobre 14 sesiones de servido |
| UUID único para KPCL0034 (solo el de Mayo–Jun) | Alpha Exp 01–05 | Pierde datos de Abril completo |
| Timezone UTC en features de hora | Alpha Exp 01–07 | Patrón horario de Bandida desalineado |
| `cadencia_s` como feature | Alpha Exp 09B–10 | Gain ≈ 0 en todos los modelos |
| `plateau_duration` en filas (no segundos) | Alpha Exp 01–07 | Métrica inconsistente con cadencia variable |
| Paths hardcodeados con concatenación de strings | Delta | `processedX_scaled` — bug clásico de concatenar sin separador |
| Merge temporal sin `pd.to_datetime(..., utc=True)` | Delta bug 8 | KeyError silencioso o lookup O(n×m) |

---

*Fuentes: APRENDIZAJES_GAMMA_DELTA.md · EXPERIMENT_TRACKER.md · ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md · COMPARACION_ALPHA_GAMMA.md · exp_10_nn_colab.md*
