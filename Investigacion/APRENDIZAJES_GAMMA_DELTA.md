# Aprendizajes Completos — Ciclo Gamma y Ciclo Delta

**Fecha de cierre:** 2026-06-23  
**Dispositivo:** KPCL0034 (Bandida)  
**Rango temporal de datos:** 2026-04-08 → 2026-06-14  
**Total de lecturas procesadas:** 134,164

Este documento captura TODO lo aprendido en los Ciclos Gamma y Delta:
métricas exactas, errores, decisiones, por qué funcionó y por qué no funcionó.
Es la memoria institucional de estos dos ciclos antes de archivarlos.

---

## PARTE 1 — CICLO GAMMA

### 1.1 Objetivo de Gamma

Gamma corrigió los errores detectados en Alpha y amplió el framework supervisado
a múltiples familias de modelos (GBM, Classical ML, NN, Ensemble), con el objetivo
de mejorar F1-servido que en Alpha apenas llegó a 0.1395.

### 1.2 Los 8 errores de Alpha que Gamma corrigió

| # | Error Alpha | Corrección Gamma |
|---|-------------|-----------------|
| 1 | Timezone UTC en features temporales | Siempre `America/Santiago` para features de negocio |
| 2 | UUID único para KPCL0034 (solo Abril) | `KPCL0034_UUIDS` con ambos: `9510a455` (Abril) y `3a460074` (Mayo-Jun) |
| 3 | Sesiones servido insuficientes (< 80) | Augmentación: 63 reales + 17 sintéticas = 80 efectivas |
| 4 | Distribution shift: features calculadas sobre datos no resampleados | Resampleo uniforme a 30s antes de calcular cualquier feature |
| 5 | `clock_invalid=True` → usar `recorded_at` (incorrecto) | Cuando `clock_invalid=True`, usar `ingested_at` obligatoriamente |
| 6 | Test set nunca evaluado formalmente en Alpha | Split temporal sellado: Train / Val / Test con fecha de corte fija |
| 7 | NN benchmark prematuro sin suficiente data | NN como experimento G-06/G-07 condicional a tener ≥ 200 sesiones servido |
| 8 | `cadencia_s` no incluida como feature | `cadencia_s` agregada como feature 13 en Gamma |

### 1.3 Proceso Pre-G (anotación y construcción del dataset)

**Total de candidatos revisados:** 647 segmentos
**Resultado de clasificación:**
- alimentacion: 264
- reposo: 296
- servido: 63
- sin_clasificar: 24

**Problema de desbalance:**
- Ratio de desbalance: 563.7x (servido vs reposo)
- Estrategia: augmentación con 17 sesiones servido sintéticas
- Efectivas para entrenamiento: 80 sesiones servido

**Splits del dataset (sellados):**
| Split | Lecturas |
|-------|---------|
| Train | 77,676 |
| Val | 36,632 |
| Test | 20,505 (SEALED — nunca tocar) |

**Herramienta de anotación:** `app_anotacion_gamma.py` — interfaz interactiva
para revisar segmentos candidatos uno por uno y asignar categorías.
Concepto clave a preservar para Alpha v2.

### 1.4 Las 13 features de Gamma

| Feature | Descripción |
|---------|-------------|
| `peso_g` | Peso bruto del plato (gramos) |
| `delta_w` | Diferencia de peso vs lectura anterior |
| `rolling_mean_5` | Media móvil 5 lecturas del peso |
| `rolling_std_5` | Desviación estándar 5 lecturas (proxy de estabilidad) |
| `rolling_mean_30` | Media móvil 30 lecturas |
| `rolling_std_30` | Desviación estándar 30 lecturas (tendencia larga) |
| `delta_w_lag1` | delta_w de la lectura anterior |
| `delta_w_lag2` | delta_w de dos lecturas atrás |
| `is_plateau` | 1 si `rolling_std_5` < `PLATEAU_THRESHOLD` (1.5g) |
| `hour_sin` | Componente seno de la hora (ciclicidad) |
| `hour_cos` | Componente coseno de la hora (ciclicidad) |
| `day_of_week` | Día de la semana (0=lunes) |
| `cadencia_s` | Segundos entre lecturas consecutivas ← NUEVO en Gamma |

### 1.5 Constantes del pipeline Gamma

```python
GAP_CUTOFF_S = 300        # 5 minutos → separa sesiones independientes
PLATEAU_THRESHOLD = 1.5   # rolling_std_5 < 1.5g → lectura estable (reposo)
RESAMPLE_TARGET_S = 30    # cadencia uniforme de 30 segundos
MIN_SERVIDO = 80          # mínimo de sesiones servido para entrenar
MIN_ALIM = 200            # mínimo de sesiones alimentacion para entrenar

KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",  # Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # Mayo-Junio 2026
]

LABEL_ENCODING = {
    "alimentacion": 0,
    "servido": 1,
    "reposo": 2,
}
```

### 1.6 Resultados de los experimentos Gamma

| Exp | Descripción | F1-activo | F1-alim | F1-serv | MacroF1 | AUC | Estado |
|-----|-------------|-----------|---------|---------|---------|-----|--------|
| G-01 | LightGBM baseline (13 features) | 0.8139 | 0.7598 | 0.2656 | 0.6733 | 0.9960 | ✅ |
| G-02 | Random Forest sweep | 0.8227 | — | 0.1989 | — | — | ✅ |
| G-03 | Sin features de tiempo (sin_tiempo subset) | 0.8189 | — | — | — | — | ✅ |
| G-04 | Optuna hyperopt | — | — | — | — | — | ⛔ BLOQUEADO (pip install optuna) |
| G-05 | ExtraTrees | 0.8073 | — | 0.2408 | — | — | ✅ |
| G-06 | NN benchmark | — | — | — | — | — | ⏸ Condicional (< 200 serv) |
| G-07 | Ensemble | — | — | — | — | — | ⏸ Condicional |
| G-08 | Más data servido | — | — | — | — | — | ⏸ Condicional |

**Mejor resultado Gamma (G-01 LightGBM):**
- F1-activo = 0.8139 (lectura es alimentacion O servido)
- F1-alim = 0.7598
- F1-serv = **0.2656** (techo práctico con solo 80 sesiones servido)
- MacroF1 = 0.6733
- AUC = 0.9960

**Comparación con Alpha (mejor modelo α-06 LightGBM):**
| Métrica | Alpha | Gamma | Delta |
|---------|-------|-------|-------|
| F1-activo | 0.7619 | 0.8139 | N/A |
| F1-alim | 0.7606 | 0.7598 | N/A |
| F1-serv | 0.1395 | 0.2656 | N/A |

Gamma mejoró F1-activo (+0.052) y F1-serv (+0.1261), pero el techo fue bajo
por escasez de sesiones servido reales.

### 1.7 Por qué F1-servido nunca pasó de 0.27

Hay dos razones entrelazadas:

**Razón 1 — Datos insuficientes:** Con solo 63 sesiones reales (+ 17 sintéticas = 80),
el modelo no tiene suficiente variabilidad para generalizar. Necesitaría ≥ 200 sesiones
reales (sin augmentación) para ver mejora significativa.

**Razón 2 — Problema de formulación (más fundamental):**
La clasificación per-reading (cada lectura individual) no puede capturar la FORMA
de la curva de servido. Un evento servido tiene una curva temporal característica:
ascenso rápido (+peso) → plateau alto → eventual descenso. Clasificar cada punto
por separado ignora esta estructura temporal. El modelo ve δw positivo y no sabe si
es ruido del sensor (±1-3g) o el inicio de un servido real.

**La clasificación per-reading es el problema de formulación incorrecto.**
Lo correcto es detección de eventos (segmentos), no clasificación de puntos.

---

## PARTE 2 — CICLO DELTA

### 2.1 Objetivo de Delta

Delta exploró el espacio de datos desde una perspectiva no supervisada para:
1. Encontrar estructura sin depender de etiquetas humanas
2. Detectar anomalías de hardware
3. Generar candidatos nuevos de sesiones servido
4. Validar si los clusters coinciden con las etiquetas de Gamma

### 2.2 Las 18 features de Delta

Delta heredó las 13 de Gamma y agregó 5 nuevas:

| Feature nueva | Descripción |
|---------------|-------------|
| `delta_w_lag3` | delta_w de tres lecturas atrás |
| `rolling_max_5` | Máximo en ventana de 5 lecturas |
| `rolling_min_5` | Mínimo en ventana de 5 lecturas |
| `peso_zscore_global` | Z-score del peso respecto a la sesión completa |
| `aceleracion_w` | Segunda derivada del peso (aceleración del cambio) |

### 2.3 Fase 1 — Datos

- **Shape:** 134,164 filas × 25 columnas (origen Supabase)
- **Rango:** 2026-04-08 → 2026-06-14
- **clock_invalid:** 71.17% de lecturas usan `ingested_at`
  (el reloj del dispositivo estaba inválido la mayoría del tiempo)
- **NaN en features:** 0
- **PCA(2):** varianza explicada = 33.5% (21.2% + 12.3%)
- **PCA(10):** varianza explicada acumulada ≈ 84%

### 2.4 Fase 2 — Clustering

#### K-Means sweep completo

| k | Silhouette | Inercia | Calinski-Harabasz | Davies-Bouldin |
|---|-----------|---------|-------------------|----------------|
| **2** | **0.8165** ✅ | 2,080,504 | 21,567 | 1.152 |
| 3 | 0.1450 | 1,889,528 | 18,653 | 1.896 |
| 4 | 0.1635 | 1,737,255 | 17,445 | 1.657 |
| 5 | 0.1424 | 1,635,408 | 15,987 | 1.816 |
| 6 | 0.1314 | 1,505,866 | 16,198 | 1.674 |
| 7 | 0.1422 | 1,371,845 | 17,002 | 1.501 |

**Ganador: k=2, Silhouette=0.8165**

#### DBSCAN sweep

| eps | Clusters | Noise % | Silhouette |
|-----|----------|---------|-----------|
| 0.3 | 1,322 | 9.71% | 0.2418 |
| 0.5 | 941 | 6.92% | 0.1939 |
| 0.8 | 345 | 5.21% | -0.192 |

**eps óptimo = 0.3**, pero genera 1,322 micro-clusters → no útil.

#### HDBSCAN
- Clusters: 1,868 · Noise: 7.70% (10,325 pts) · Silhouette: 0.3454
- Igual que DBSCAN: miles de micro-clusters, no alineados con clases reales

#### GMM sweep (BIC mínimo)

| n | BIC |
|---|-----|
| 2 | -6,033,780 |
| 3 | -8,771,631 |
| 4 | -9,264,367 |
| 5 | -10,631,516 |
| 6 | -12,111,754 |
| **7** | **-12,337,714** ✅ |

**n=7 componentes** útil para detectar candidatos ambiguos (30 de 134,164)

#### Interpretación de los clusters K-Means

- **Cluster 0** → delta_w medio = **+4.6g** → perfil "servido" (lecturas con subida de peso)
- **Cluster 1** → delta_w negativo o neutro → perfil "alimentación/reposo"

### 2.5 Por qué Silhouette=0.816 es engañoso (lección crítica)

El Silhouette Score de 0.816 suena impresionante. **No lo es.** Esto es lo que realmente pasó:

K-Means k=2 encontró la separación más obvia en el espacio de 18 features: lecturas con
`delta_w > 0` (plato ganando peso) vs lecturas con `delta_w ≤ 0` (plato perdiendo o estable).

Esto es **trivialmente derivable** de `delta_w` solo. No requería 18 features ni K-Means.

**La prueba definitiva:** ARI (Adjusted Rand Index) entre clusters y etiquetas Gamma = **0.1594**.
Si los clusters capturaran eventos reales, el ARI sería ≥ 0.5. Un ARI de 0.16 significa
que los clusters y las etiquetas casi no coinciden → los clusters no representan los eventos.

**Comparación de métricas:**
| Métrica | Valor | Significado |
|---------|-------|-------------|
| Silhouette (K-Means k=2) | 0.8165 | Alta separación geométrica en el espacio de features |
| ARI vs etiquetas Gamma | 0.1594 | Baja coincidencia con realidad de eventos |
| NMI vs etiquetas Gamma | 0.1199 | Baja información mutua con categorías reales |

**Regla aprendida:** El Silhouette Score mide separación interna de clusters, no calidad
semántica. Solo el ARI/NMI contra ground truth confirma si los clusters capturan algo real.
Un ARI de 0.16 con Silhouette de 0.82 significa que los clusters son geométricamente
compactos pero semánticamente vacíos.

### 2.6 Fase 3 — Detección de Anomalías

#### Isolation Forest
- Anomalías: 6,709 de 134,164 (5.00%)
- Con clock_invalid: 75.65%

#### Autoencoder — ⚠️ FALLÓ
- **Error:** `OSError: [WinError 1114]` — `c10.dll` de PyTorch no inicializa en Windows
- **Causa:** incompatibilidad de Visual C++ Redistributable
- **Impacto:** consenso calculado con 2/3 detectores (IF + LOF) en lugar de 3/3

#### LOF (Local Outlier Factor)
- Anomalías LOF: 6,709 de 134,164 (5.00%)

#### Consenso IF∩LOF (≥2 votos de 2)
- **Total consenso: 676 anomalías** (0.50% del dataset)

| Tipo | N | Criterio |
|------|---|---------|
| H — Hardware | 338 | clock_invalid > 0.5 en la ventana |
| C — Comportamental | 178 | Anomalía en horario activo (06:00–22:00) |
| U — Sin clasificar | 160 | Anomalía nocturna, no atribuible a clock |

### 2.7 Fase 4 — Validación cruzada con Gamma

#### Cross-check (D-08)
- Lecturas cruzadas con etiquetas Gamma: 4,034 de 134,164 (solo 3%)
- **ARI = 0.1594** → coincidencia_baja (umbral mínimo era ≥ 0.30)
- **NMI = 0.1199**

**Heatmap cluster vs etiqueta Gamma:**

| cluster_ganador | alimentacion | reposo | servido | sin_clasificar |
|----------------|-------------|--------|---------|----------------|
| 0 (servido) | 26.3% | 20.8% | **50.1%** | 2.8% |
| 1 (alim/reposo) | **68.6%** | 24.5% | 4.1% | 2.8% |

→ Cluster 0 captura servido con 50% pureza (no 100%)
→ Cluster 1 captura alimentación con 69% pureza
→ La superposición es grande → clusters no son confiables como pseudo-etiquetas

#### Candidatos servido nuevos (D-09)
- Candidatos totales identificados: 12
- **Candidatos NUEVOS (no en Gamma):** 2
- Peso total estimado servido en esos 2 eventos: 43g
- Meta original era ≥ 10 nuevos → **NO alcanzada**

### 2.8 Los 8 bugs corregidos durante la ejecución de Delta

| # | Script | Error | Fix |
|---|--------|-------|-----|
| 1 | Todos Fase 2/3/4 | `ModuleNotFoundError: _delta_utils` | `sys.path.insert(0, .../fase_1_datos/scripts)` |
| 2 | Fase 2/3 (múltiples) | Paths sin separador (`processedX_scaled`) | Migración a operador `/` de pathlib |
| 3 | Fase 4 d01/d02 | `KeyError: ts_termino` | Columna real es `ts_fin` en sessions_labeled |
| 4 | d05 Fase 2 | `cluster_ganador` nunca persistido | Agregar `_guardar_cluster_ganador()` en d05 |
| 5 | d03 Fase 2, d05 | HDBSCAN excluido por falta de metrics CSV | Export CSV en d03, lectura condicional en d05 |
| 6 | d03 Fase 3 (LOF) | `KeyError: votos` — consenso vacío | Tipos string vs Timestamp: `.astype(str)` en ambos sets; fallback si consenso vacío |
| 7 | Fase 4 d01/d02 | `KeyError: categoria` | Columna real es `session_type` en sessions_labeled |
| 8 | d04 Fase 3 | Lookup O(n×m) + ts string vs Timestamp | Merge vectorizado + `pd.to_datetime(..., utc=True)` + umbral `clock_invalid > 0.5` |

---

## PARTE 3 — CONCLUSIÓN: POR QUÉ ESTOS CICLOS NO RESOLVIERON EL PROBLEMA

### 3.1 El problema de formulación que los 3 ciclos comparten

**Alpha, Gamma y Delta clasifican lecturas individuales.** Cada punto en el tiempo
recibe una etiqueta: alimentacion / servido / reposo. Esto parece razonable pero
es incorrecto para el objetivo real.

**El objetivo real es detectar EVENTOS completos:**
- Un evento `alimentacion` es una CURVA: el gato baja al plato → el peso cae
  gradualmente durante minutos → llega a un plateau bajo → el gato se va
- Un evento `servido` es una CURVA: alguien agrega comida → el peso sube
  rápidamente en segundos → llega a un plateau alto → estabiliza
- El `reposo` (sin movimiento) tiene su propia firma: peso estable, `rolling_std_5` < 1.5g

**Por qué la clasificación per-reading falla:**
- El sensor fluctúa ±1-3g incluso en reposo perfecto (ruido eléctrico baseline)
- Un δw de +2g puede ser ruido O el inicio de un servido
- El modelo necesita ver la FORMA de los próximos N segundos para decidir
- Clasificar un punto sin ver el contexto temporal completo es como identificar
  una canción por una sola nota

### 3.2 Qué sí funcionó y vale la pena preservar

| Elemento | Por qué preservar |
|----------|-------------------|
| 13 features de Gamma | Son las features correctas; falta usarlas en segmentos, no en puntos |
| `app_anotacion_gamma.py` | Concepto de revisión manual segmento-por-segmento es el workflow correcto |
| GAP_CUTOFF_S=300 | Correcto para delimitar sesiones independientes |
| PLATEAU_THRESHOLD=1.5 | Correcto para detectar estabilidad |
| RESAMPLE_TARGET_S=30s | Necesario para cadencia uniforme |
| Ambos UUIDs de KPCL0034 | Necesarios para no perder datos de Abril |
| Timezone America/Santiago | Nunca UTC para features de negocio |
| `ingested_at` cuando clock_invalid | Regla crítica validada |
| 676 anomalías H detectadas por Delta | Referencia útil de problemas de hardware |
| ARI como métrica de validación | Usar siempre en lugar de (o además de) Silhouette |

### 3.3 La nueva dirección correcta para Ciclo Alpha v2

El enfoque correcto es **detección de eventos por segmentos** (change-point detection):

1. **Segmentación temporal:** Dividir el stream de lecturas en segmentos
   usando GAP_CUTOFF_S y cambios bruscos de peso. Herramientas: PELT, BOCPD.

2. **Features por segmento (no por punto):** Calcular features que describan
   la FORMA del segmento completo: duración, pendiente de subida, pendiente de
   bajada, peso inicial, peso final, área bajo la curva, etc.

3. **Clasificación de segmentos:** Entrenar un modelo que clasifique cada
   segmento como alimentacion / servido / ruido. El modelo ve la curva completa,
   no un punto aislado.

4. **Modelo de ruido del sensor:** Caracterizar el baseline de fluctuación del
   sensor (±1-3g) para distinguirlo de movimiento real. Necesita mediciones en
   reposo garantizado.

**Técnicas candidatas para Alpha v2:**
- PELT (Pruned Exact Linear Time) para change-point detection
- BOCPD (Bayesian Online Change Point Detection) para detección en tiempo real
- Features de forma: slope, integral, peak-to-trough, rise_time, decay_time
- Clasificador supervisado sobre segmentos (LightGBM sobre features de segmento)

---

## PARTE 4 — REFERENCIA RÁPIDA: ASSETS DISPONIBLES PARA ALPHA V2

### 4.1 Datos etiquetados (sesiones_labeled en Supabase)

- 264 sesiones alimentacion
- 80 sesiones servido (63 reales + 17 sintéticas)
- 296 sesiones reposo
- 24 sin_clasificar

### 4.2 Artefactos en disco (en Exploracion_Gamma_Delta_2026/)

```
Ciclo_Gamma/
  ├── fase_*/scripts/*.md       # Specs completas de todos los scripts
  ├── datos/                    # CSVs y parquets del pipeline Gamma
  ├── models/                   # .lgb, .pkl de experimentos G-01 a G-05
  └── app_anotacion_gamma.py    # Herramienta de anotación manual

Ciclo_Delta/
  ├── fase_1_datos/data/processed/
  │   ├── X_scaled.parquet      (134,164 × 18)
  │   ├── X_pca2.parquet        (134,164 × 2)
  │   ├── X_pca10.parquet       (134,164 × 10)
  │   └── readings_delta.parquet (con cluster_ganador)
  ├── fase_2_clustering/outputs/ # Modelos kmeans/dbscan/hdbscan/gmm
  ├── fase_3_anomalias/outputs/
  │   └── anomalias_detectadas.csv (676 anomalías H/C/U)
  └── fase_4_validacion/outputs/
      └── candidatos_servido_delta_nuevos.csv (2 candidatos)
```

### 4.3 Ground truth en Supabase

- Tabla: `public.audit_events`
- Filtro: `event_type = 'manual_bowl_category'`
- Este es el único ground truth confiable. Todas las etiquetas deben ser
  trazables a esta tabla.

---

*Documento generado el 2026-06-23 al archivar Ciclo Gamma y Ciclo Delta.*  
*Ver carpeta hermana `Ciclo_Gamma/` y `Ciclo_Delta/` para todos los archivos originales.*
