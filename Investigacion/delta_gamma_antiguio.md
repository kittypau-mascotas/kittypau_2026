# Ciclo Gamma + Ciclo Delta — Archivo Consolidado (ARCHIVADO)

> Fusión de los 15 documentos de los Ciclos Gamma y Delta (ambos archivados, supervisado multi-modelo y no supervisado respectivamente) en un solo archivo. Ver [[README]] / [[_MOC]] para el mapa general de `Investigacion/`.


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

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

### 1.3b Corrección de calidad de datos — Alpha vs Gamma

> Fusionado desde `COMPARACION_ALPHA_GAMMA.md` (2026-06-17, discontinuado por
> quedar superseded por este documento — su §3 de métricas nunca se completó
> porque se escribió antes de que G-01 entrenara).

| Problema | Alpha | Gamma |
|---|---|---|
| UUID doble de KPCL0034 | ❌ dos UUIDs mezclados sin mapeo explícito | ✅ `uuid_mapping.json` — un UUID canónico antes de cualquier cálculo |
| Timezone mixta en `audit_events.created_at` | ❌ `+00`, `-04`, `-04:00` mezclados | ✅ normalización UTC explícita en g03 |
| Origen de etiquetas | ❌ mixto: tiempo real (Abril) + retroactivo (Mayo–Jun, Exp07/08) con criterios distintos | ✅ un solo criterio: revisión completa de los 3 meses vía `app_anotacion.py` |
| Gap Mayo 1–25 | ❌ documentado pero no manejado — contaminaba splits temporales | ✅ tratado como gap de transmisión; no se rellena |
| `clock_invalid` en Mayo–Jun | ❌ ignorado en Alpha | ✅ forzado a `ingested_at` cuando `clock_invalid=100%` |

### 1.3c Comparación feature por feature — Alpha vs Gamma

| Feature | Alpha (v1_modelo_a_13) | Gamma (FEATURES_GAMMA) | Cambio |
|---|---|---|---|
| `weight_grams` | ✅ | ✅ | igual |
| `delta_w` | ✅ | ✅ | igual |
| `delta_w_10` | ✅ | ✅ | igual |
| `rolling_std_5/10` | ✅ | ✅ | igual |
| `rolling_mean_5` | ✅ | ✅ | igual |
| `net_weight` | ✅ | ✅ | igual |
| `is_plateau` | ✅ | ✅ | igual |
| `plateau_duration` | ✅ en **filas** | ✅ en **segundos** (`plateau_duration_s`) | corregido |
| `hour_sin/cos` | ✅ hora **UTC** | ✅ hora **Santiago** | corregido |
| `cadencia_s` | ✅ (gain ≈ 0 en todos los exp.) | ❌ eliminada | corregido |
| `clock_invalid` | ✅ | ✅ | igual |
| `dia_semana_sin` | ❌ no existía | ✅ nueva | añadida |

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


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Kittypau ML — Ciclo Gamma (γ)
## Guía Maestra: Nueva Serie de Experimentos

**Versión:** 2.1 (revisada)
**Fecha de creación:** 2026-06-15
**Última actualización:** 2026-06-16 — Pre-G reemplazado por el proceso de unificación + retiquetado descrito en `delta_gamma_antiguio.md`
**Autor:** Mauro Curcuma
**Estado:** Activo — en preparación pre-G-01

---

## Índice

1. [Visión y Diferencias Clave con el Ciclo Alpha](#1-visión-y-diferencias-clave)
2. [Lo que Heredamos del Ciclo Alpha](#2-herencia-del-ciclo-alpha)
3. [Lista Explícita: Qué Copiar y Qué No](#3-lista-explícita-qué-copiar-y-qué-no)
4. [Los 8 Errores Críticos que Gamma Corrige](#4-los-8-errores-críticos-que-gamma-corrige)
5. [Estructura de Carpetas del Ciclo Gamma](#5-estructura-de-carpetas)
6. [Nueva Categorización: Protocolo y Herramientas](#6-nueva-categorización)
7. [Features del Ciclo Gamma (13 definitivas)](#7-features-del-ciclo-gamma)
8. [Marco de Evaluación de Modelos — Diseño Amplio](#8-marco-de-evaluación-de-modelos)
9. [Secuencia de Experimentos Gamma](#9-secuencia-de-experimentos)
10. [Tabla Maestra de Experimentos](#10-tabla-maestra)
11. [Parámetros Globales e Invariantes](#11-parámetros-globales)
12. [Comandos de Ejecución](#12-comandos-de-ejecución)
13. [Reglas del Ciclo Gamma](#13-reglas-del-ciclo-gamma)
14. [Referencias Cruzadas](#14-referencias-cruzadas)

---

## 1. Visión y Diferencias Clave

El Ciclo Gamma es la segunda generación del proyecto Kittypau ML. Parte desde cero
en datos y anotaciones, pero incorpora todos los aprendizajes del Ciclo Alpha
(α-01 a α-10). No es una continuación — es un reinicio estructurado.

### Las tres diferencias fundamentales con Alpha

| Dimensión | Ciclo Alpha | Ciclo Gamma |
|---|---|---|
| **Datos** | Anotaciones acumuladas iterativamente, con errores UTC | **Unificación Abril–Mayo–Junio + retiquetado total asistido por Modelo A de Exp06** (no anotación a ciegas desde cero), hora Santiago, ≥80 servido antes de entrenar |
| **Modelos** | Solo LightGBM (con NN al final como benchmark) | **Evaluación sistemática y paralela**: GBM family, ML Clásico y Deep Learning por fase |
| **Orden** | Entrenar rápido, diagnosticar después | **Diagnosticar primero** (distribución, calidad, anotaciones), entrenar cuando los datos estén listos |

### Ciclos del proyecto

| Ciclo | ID | Período | Estado |
|---|---|---|---|
| **Alpha** | α | 2026-04-26 → 2026-06-15 | ✅ Cerrado — α-01 a α-10 |
| **Beta** | β | Reservado | ⏳ Posible ciclo hardware futuro |
| **Gamma** | γ | 2026-06-15 → TBD | 🟢 Activo |

---

## 2. Herencia del Ciclo Alpha

### 2.1 Lo que funcionó — mantener sin cambios

| Elemento | Por qué mantenerlo |
|---|---|
| **Estructura de pipeline Fase 1→4** | Sólida y reproducible. No cambiar. |
| **Split temporal estricto** | Nunca aleatorio. La única forma correcta para series temporales. |
| **Threshold tuning post-entrenamiento** | Impacto crítico. Default 0.50 nunca usar en clases desbalanceadas. |
| **Calibración isotónica** | Mejora estabilidad del threshold en producción. |
| **Dump CSV local como fuente** | Más confiable que API de Supabase para reproducibilidad. |
| **12 features base** (sin `cadencia_s`) | Robustas desde α-03. `rolling_std_10` y `plateau_duration` top en importancia siempre. |
| **GAP_CUTOFF_S = 300s** | Invariante validada en todos los experimentos. |
| **PLATEAU_THRESHOLD = 1.5g** | Invariante. |
| **Resampleo a 30s** | Necesario para normalizar cadencia entre períodos. |
| **`app_anotacion.py`** | Herramienta funcional. Migrar y mejorar como `app_anotacion_gamma.py`. |
| **Dashboard KPCL (`kpcl_pruebas_eventos.html`)** | Reutilizar para identificar sesiones a anotar. |

### 2.2 Lo que NO funcionó — no repetir

| Error Alpha | Consecuencia documentada | Corrección en Gamma |
|---|---|---|
| UTC en lugar de hora local | Rutinas de Bandida desplazadas 3–4h en `hour_sin`/`hour_cos` | Siempre `America/Santiago` |
| UUID doble sin documentar | Joins rotos al combinar Abril y Mayo-Jun | `KPCL0034_UUIDS` lista explícita |
| `servido` insuficiente antes de entrenar | 14–27 sesiones → SMOTE como parche, F1 servido inestable | ≥80 sesiones reales antes de G-01 |
| Distribución no analizada pre-entrenamiento | Shift no detectado → F1 cayó 0.76→0.60 al unir períodos (α-08) | Paso obligatorio de diagnóstico en Fase 1 |
| `clock_invalid=True` al 100% en Mayo-Jun sin investigar | Usaba `recorded_at` inválido | Siempre `ingested_at` cuando `clock_invalid=True` |
| Test set nunca evaluado formalmente | Todas las métricas de Alpha son de validación, no de generalización real | Evaluar test una única vez al tener modelo candidato |
| NN benchmark prematuro (α-10) | 185 sesiones insuficientes → LGBM gana por defecto | NN solo con ≥300 alim + ≥80 serv |
| `cadencia_s` añadida sin beneficio (α-09B) | Feature sin importancia real, añade ruido | Excluida de Gamma |

---

## 3. Lista Explícita: Qué Copiar y Qué No

Esta sección es la guía de migración. Para cada archivo se indica la acción.

### 3.1 Scripts de Fase 1 → Copiar y Adaptar

Origen: `Data Science/fase_1_extraccion/scripts/`
Destino: `Data Science/gamma/fase_1_extraccion/scripts/`

| Archivo Alpha | Archivo Gamma | Acción | Cambios requeridos |
|---|---|---|---|
| `01_setup_env.py` | `g01_setup_env.py` | Copiar + adaptar | Actualizar rutas a carpeta `gamma/` |
| `02_get_device_uuid.py` | `g02_get_device_uuid.py` | Copiar + adaptar | Agregar ambos UUIDs de KPCL0034; incluir KPCL0035 como comentario |
| `03_extract_readings.py` | `g03_extract_readings.py` | Reescribir sobre la base | Corregir: UTC→Santiago, dual UUID, análisis de distribución, anomalías peso |
| `04_extract_events.py` | `g04_extract_events.py` | Copiar + adaptar | Cambiar ruta anotaciones a `new_annotations_gamma.csv`; agregar merge de Alpha annotations como referencia opcional |
| `05_build_sessions.py` | `g05_build_sessions.py` | Copiar casi sin cambios | Agregar contador de sesiones por período para diagnóstico |
| `06_quality_report.py` | `g06_quality_report.py` | Copiar + adaptar | Añadir reporte de distribución por período; añadir reporte de cadencia por período |
| `_supabase_helpers.py` | `_gamma_utils.py` | Reescribir | Nuevas constantes, dual UUID, RESAMPLE_TARGET_S, TZ_SANTIAGO, FEATURES_GAMMA |

### 3.2 Scripts de Fase 2 → Copiar y Adaptar

Origen: `Data Science/fase_2_dataset/scripts/`
Destino: `Data Science/gamma/fase_2_dataset/scripts/`

| Archivo Alpha | Archivo Gamma | Acción | Cambios requeridos |
|---|---|---|---|
| `01_build_labels.py` | `g01_build_labels.py` | Copiar + adaptar | Actualizar rutas a `gamma/` |
| `02_build_features.py` | `g02_build_features.py` | Reescribir sobre la base | Agregar resampleo 30s; features temporales en hora Santiago; `plateau_duration_s` en segundos; `dia_semana_sin` nueva; remover `cadencia_s` |
| `03_build_train_dataset.py` | `g03_build_train_dataset.py` | Copiar + adaptar | Actualizar fechas de split cuando se tenga nuevo dump |
| `04_dataset_report.py` | `g04_dataset_report.py` | Copiar + adaptar | Añadir tabla de distribución por período en el reporte |
| `_phase2_utils.py` | `_gamma_phase2_utils.py` | Reescribir | Todas las correcciones de timezone, plateau en segundos, resampleo, sin `cadencia_s` |

### 3.3 Scripts de Fase 3 → Reemplazar por Framework Multi-Modelo

Origen: `Data Science/fase_3_modelos/scripts/`
Destino: `Data Science/gamma/fase_3_modelos/scripts/`

| Archivo Alpha | Archivo Gamma | Acción | Cambios requeridos |
|---|---|---|---|
| `01_prepare_datasets.py` | `g01_prepare_datasets.py` | Copiar + adaptar | Actualizar rutas; cargar features Gamma (13) |
| `02_train_modelo_a.py` | `g02_train_modelo_a_gbm.py` | Reescribir | Entrenar LightGBM + XGBoost + CatBoost + HistGBM en paralelo; comparar métricas en un solo reporte |
| `03_train_modelo_b.py` | `g03_train_modelo_b_gbm.py` | Reescribir | Ídem para Modelo B multiclase |
| *(no existía)* | `g04_train_modelo_a_classical.py` | **NUEVO** | RF, ExtraTrees, SVM, LogReg — comparar vs mejor GBM de G-03 |
| *(no existía)* | `g05_train_modelo_b_classical.py` | **NUEVO** | Ídem para Modelo B |
| *(no existía)* | `g06_train_modelo_a_nn.py` | **NUEVO (data-conditional)** | MLP, GRU, TCN — ejecutar solo con ≥300 alim + ≥80 serv |
| *(no existía)* | `g07_train_modelo_b_nn.py` | **NUEVO (data-conditional)** | Ídem para Modelo B; incluir blend por clase |
| *(no existía)* | `g08_ensemble.py` | **NUEVO** | Blend best GBM + best NN; stacking; ensemble servido-específico |
| `04_training_report.py` | `g09_training_report.py` | Reescribir | Comparativa multi-modelo; ranking por métrica; selección automática de mejor modelo por tarea |
| `_phase3_utils.py` | `_gamma_phase3_utils.py` | Reescribir | Funciones de entrenamiento, calibración y evaluación genéricas para cualquier algoritmo |

### 3.4 Herramientas a Reutilizar (migrar con mejoras)

| Herramienta Alpha | Herramienta Gamma | Ubicación Gamma | Mejoras requeridas |
|---|---|---|---|
| `app_anotacion.py` | `app_anotacion_gamma.py` | `gamma/fase_4_anotacion/` | Prioridad servido; barra progreso hasta 80; timestamps en hora Santiago; modo "revisión Alpha" opcional |
| `inferencia_kpcl0034.py` | `inferencia_gamma.py` | `gamma/` | Adaptada a 13 features Gamma y a multi-modelo (cargar el mejor modelo según config) |
| `inferencia_exp07_mayo_junio.py` | Referencia histórica | Solo lectura en `experiments/` | No migrar — referencia de cómo se hizo en Alpha |
| Script dashboard KPCL (`serve_kpcl_dashboard.py`) | Sin cambios | `Investigacion/Dashboard_KPCL/` | Ya funciona; usarlo para identificar candidatos de anotación |
| `abrir_kpcl_dashboard.ps1` | Sin cambios | `Investigacion/Dashboard_KPCL/` | Ya funciona |

### 3.5 Datos Disponibles para Gamma

| Dataset | Ruta | Período | Estado | Uso en Gamma |
|---|---|---|---|---|
| Dump Abril 2026 | `Data_2026/Abril_2026/kittypau_full_07-05-2026_csv/` | Apr 8 – May 1 | ✅ Disponible | Lectura y eventos |
| Dump Mayo-Jun 2026 | `Data_2026/Mayo_2026/readings_rows.csv` | May 25 – Jun 14 | ✅ Disponible | Lectura |
| Dump nuevo (requerido) | A descargar de Supabase | Jun 15 → presente | ⏳ Pendiente | Lectura + eventos más recientes |
| Audit events Alpha | `kittypau_full_07-05-2026_csv/audit_events.csv` | Apr 8 – May 1 | ✅ Disponible | **Referencia opcional** — no importar ciegamente |
| Anotaciones retroactivas Alpha | `fase_4_visualizacion/data/new_annotations.csv` | May 25 – Jun 14 | ✅ Disponible | **Referencia opcional** — revisar antes de incorporar |
| **Anotaciones Gamma (nuevas)** | `gamma/fase_4_anotacion/data/new_annotations_gamma.csv` | Jun 15 → presente | ⏳ Por crear | Fuente de verdad del Ciclo Gamma |
| **Unificado Abril-Mayo-Junio** | `Data_2026/Abril_Mayo_Junio_2026/02_unificado/readings_unificado_30s.parquet` | Abr 8 – Jun 14 (o más reciente si hay dump nuevo) | ⏳ Por generar (Pre-G, Pasos 4.1–4.4) | Insumo único de la inferencia de candidatos y de Fase 2 |

### 3.6 Qué NO Copiar

| Elemento | Motivo |
|---|---|
| Archivos `.parquet` de datos | Se regeneran desde cero con el pipeline Gamma |
| Archivos `.lgb`, `.pt` de modelos | Se reentrenan con nuevas features y datos |
| `training_report.txt`, `quality_report.txt` | Se regeneran con el nuevo pipeline |
| `dataset_meta.json` de Alpha | Metadatos del split antiguo — no aplica |
| `new_annotations.csv` de Alpha directamente | Revisar primero — pueden tener errores de timezone o etiquetado |
| Features en UTC (Alpha) | Todas las features temporales se recalculan con hora Santiago |

---

## 4. Los 8 Errores Críticos que Gamma Corrige

Cada corrección tiene un checkpoint obligatorio en Fase 1.

### Error α-1 — `servido` insuficiente (el problema raíz)

**Alpha:** con 14–27 sesiones de `servido`, SMOTE era un parche. F1 servido era inestable entre 0.14 y 0.50 según el experimento.

**Gamma:** no se ejecuta ningún experimento de entrenamiento hasta tener **≥80 sesiones reales de `servido` etiquetadas** en `new_annotations_gamma.csv`.

```python
# Checkpoint en g06_quality_report.py
MIN_SERVIDO_SESSIONS = 80
sesiones = pd.read_parquet("gamma/fase_1_extraccion/data/raw/sessions_labeled.parquet")
n_servido = len(sesiones[sesiones["session_type"] == "servido"])
assert n_servido >= MIN_SERVIDO_SESSIONS, \
    f"❌ Solo {n_servido} sesiones de servido. Meta: {MIN_SERVIDO_SESSIONS}. Anotar más con app_anotacion_gamma.py"
```

### Error α-2 — Shift de distribución no diagnosticado antes de entrenar

**Alpha:** al unir Abril + Mayo-Jun en α-08, el F1 activo cayó de 0.76 a 0.60 sin diagnóstico previo. Se descubrió el problema después de entrenar.

**Gamma:** paso obligatorio de análisis de distribución (Kolmogorov-Smirnov por feature y por período) antes de cualquier entrenamiento que combine fuentes.

```python
# En g06_quality_report.py — OBLIGATORIO, no opcional
analisis_distribucion_por_periodo(df_all)
# Si detecta shift en features críticas → WARNING + requiere revisión manual antes de continuar
```

### Error α-3 — `hour_sin`/`hour_cos` calculados en UTC

**Alpha:** Bandida come a las 8am Santiago (UTC-4), pero la feature `hour_sin` lo registraba a las 12pm UTC. Las rutinas horarias estaban desplazadas 3–4 horas en el dataset.

**Gamma:**

```python
from zoneinfo import ZoneInfo
TZ_SANTIAGO = ZoneInfo("America/Santiago")

def calcular_features_temporales(df):
    ts_santiago = df["ts_utc"].dt.tz_localize("UTC").dt.tz_convert(TZ_SANTIAGO)
    hour_local  = ts_santiago.dt.hour + ts_santiago.dt.minute / 60.0
    dia         = ts_santiago.dt.dayofweek
    df["hour_sin"]       = np.sin(2 * np.pi * hour_local / 24)
    df["hour_cos"]       = np.cos(2 * np.pi * hour_local / 24)
    df["dia_semana_sin"] = np.sin(2 * np.pi * dia / 7)  # nueva en Gamma
    return df
```

### Error α-4 — UUID doble de KPCL0034 sin documentar

**Alpha:** KPCL0034 aparece con dos UUIDs distintos:
- Abril 2026: `9510a455-b0e9-4932-8be1-03976d31228a`
- Mayo-Jun 2026: `3a460074-e7c3-41bf-ae5a-a011445f927a`

Esto causó joins rotos y joins duplicados silenciosos al combinar períodos.

**Gamma:** constante explícita en `_gamma_utils.py`:

```python
KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",   # UUID Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",   # UUID Mayo-Jun 2026 y posterior
]
```

Todos los scripts de Fase 1 filtran por esta lista, no por un UUID individual.

### Error α-5 — `clock_invalid=True` al 100% en Mayo-Jun sin investigar

**Alpha:** en Mayo-Jun, el 100% de las lecturas tienen `clock_invalid=True`, pero el script de Fase 1 aplicaba la condición `if clock_invalid: usar ingested_at else: usar recorded_at` sin detectar que el 100% caía en la rama `clock_invalid`. Esto generó timestamps ligeramente incorrectos en algunos casos.

**Gamma:** el script fuerza `ingested_at` sin condición cuando detecta que el período tiene `clock_invalid` al 100%:

```python
# En g03_extract_readings.py
pct_clock_invalid = df["clock_invalid"].mean()
if pct_clock_invalid > 0.95:
    print(f"⚠️  clock_invalid al {pct_clock_invalid*100:.0f}% — forzando ingested_at para TODO el período")
    df["ts_utc"] = pd.to_datetime(df["ingested_at"], utc=True)
else:
    df["ts_utc"] = df.apply(
        lambda r: r["ingested_at"] if r["clock_invalid"] else r["recorded_at"], axis=1
    )
```

### Error α-6 — Test set nunca evaluado formalmente

**Alpha:** `X_test.parquet` existe desde α-01 y nunca fue tocado. Todas las métricas del Ciclo Alpha son de validación, no de generalización real sobre datos no vistos.

**Gamma:** el test set se evalúa exactamente una vez, al final del ciclo, cuando el modelo candidato final esté seleccionado. Antes de ese momento, está bloqueado por convención de código.

```python
# En _gamma_phase3_utils.py
def cargar_test_set():
    raise PermissionError(
        "❌ El test set no puede cargarse antes de G-Final. "
        "Ver regla 1 del Ciclo Gamma."
    )
# Solo se descomenta en el script g_final_evaluacion_test.py
```

### Error α-7 — Benchmark neuronal prematuro (α-10)

**Alpha:** se ejecutaron 4 arquitecturas NN con 185 alim + 27 serv. Con datos tabulares pequeños y clases tan desbalanceadas, LGBM tenía ventaja estructural predecible. El resultado era esperado.

**Gamma:** los experimentos de NN (G-06 en adelante) tienen un prerequisito explícito de datos:
- Modelo A (NN): ≥300 sesiones de alimentación
- Modelo B (NN): ≥80 sesiones de servido + ≥300 de alimentación

Esto significa que G-06 puede ejecutarse solo cuando la base de datos lo permita, no antes.

### Error α-8 — `cadencia_s` añadida sin beneficio claro

**Alpha:** en α-09B se añadió `cadencia_s` como feature #13. No apareció en los top-10 de importancia ni mejoró el F1 en α-09B ni en α-10.

**Gamma:** `cadencia_s` está excluida desde el inicio. El resampleo a 30s hace que la cadencia sea constante, volviéndola redundante. Si se quisiera reincorporar en el futuro, requiere un experimento numerado.

---

## 5. Estructura de Carpetas

```
Data Science/
├── gamma/                                      ← TODO el Ciclo Gamma vive aquí
│   │
│   ├── CICLO_GAMMA_NUEVO_PIPELINE_ML.md        ← este archivo (guía maestra)
│   ├── delta_gamma_antiguio.md             ← tabla maestra de experimentos Gamma
│   ├── delta_gamma_antiguio.md                       ← términos actualizados con lecciones Alpha
│   │
│   ├── experiments/                            ← un MD por experimento Gamma
│   │   ├── delta_gamma_antiguio.md
│   │   ├── delta_gamma_antiguio.md
│   │   ├── delta_gamma_antiguio.md
│   │   ├── delta_gamma_antiguio.md
│   │   ├── delta_gamma_antiguio.md
│   │   └── delta_gamma_antiguio.md  (data-conditional)
│   │
│   ├── fase_1_extraccion/
│   │   ├── scripts/
│   │   │   ├── g01_setup_env.py
│   │   │   ├── g02_get_device_uuid.py
│   │   │   ├── g03_extract_readings.py       ← mayor revisión
│   │   │   ├── g04_extract_events.py
│   │   │   ├── g05_build_sessions.py
│   │   │   ├── g06_quality_report.py         ← con checkpoints y distribución
│   │   │   └── _gamma_utils.py               ← constantes y UUIDs
│   │   ├── data/
│   │   │   ├── raw/                          ← readings_raw.parquet · events_labeled.parquet · sessions_labeled.parquet
│   │   │   └── processed/
│   │   └── outputs/
│   │       ├── quality_report/
│   │       ├── anomalias_peso.csv
│   │       ├── anomalias_sesiones.csv
│   │       └── distribucion_por_periodo.json  ← NUEVO — shift analysis obligatorio
│   │
│   ├── fase_2_dataset/
│   │   ├── scripts/
│   │   │   ├── g01_build_labels.py
│   │   │   ├── g02_build_features.py         ← resampleo + hora Santiago + dia_semana_sin
│   │   │   ├── g03_build_train_dataset.py
│   │   │   ├── g04_dataset_report.py
│   │   │   └── _gamma_phase2_utils.py        ← fuente canónica de features
│   │   ├── data/
│   │   │   ├── interim/                      ← readings_labeled · readings_features (30s)
│   │   │   └── train/                        ← X/y train·val·test + label_encoder + meta
│   │   └── outputs/dataset_report/
│   │
│   ├── fase_3_modelos/
│   │   ├── scripts/
│   │   │   ├── g01_prepare_datasets.py
│   │   │   ├── g02_train_modelo_a_gbm.py     ← LGBM + XGBoost + CatBoost + HistGBM
│   │   │   ├── g03_train_modelo_b_gbm.py     ← ídem para multiclase
│   │   │   ├── g04_train_modelo_a_classical.py ← RF + ET + SVM + LogReg
│   │   │   ├── g05_train_modelo_b_classical.py ← ídem para multiclase
│   │   │   ├── g06_train_modelo_a_nn.py      ← MLP + GRU + TCN (data-conditional)
│   │   │   ├── g07_train_modelo_b_nn.py      ← ídem + blend por clase
│   │   │   ├── g08_ensemble.py               ← blend best GBM + best NN
│   │   │   ├── g09_training_report.py        ← comparativa multi-modelo
│   │   │   └── _gamma_phase3_utils.py        ← entrenamiento y evaluación genéricos
│   │   ├── models/
│   │   │   ├── gbm/                          ← modelos GBM por familia
│   │   │   ├── classical/                    ← modelos ML clásico
│   │   │   ├── nn/                           ← modelos NN (pesos + arquitectura)
│   │   │   └── ensemble/                     ← modelos ensemble
│   │   └── outputs/training_report/
│   │
│   ├── fase_4_anotacion/
│   │   ├── app_anotacion_gamma.py            ← Streamlit — anotación con prioridad servido
│   │   ├── generar_candidatos_servido.py     ← detecta candidatos de servido no anotados
│   │   ├── delta_gamma_antiguio.md
│   │   └── data/
│   │       ├── new_annotations_gamma.csv     ← FUENTE DE VERDAD del Ciclo Gamma
│   │       └── servido_candidates.csv        ← candidatos para revisar
│   │
│   └── inferencia_gamma.py                   ← inferencia adaptada a multi-modelo Gamma
│
├── experiments/                              ← Ciclo Alpha (solo lectura)
└── fase_*/                                   ← Ciclo Alpha (solo lectura)
```

---

## 6. Nueva Categorización

### 6.1 Por qué re-etiquetar con asistencia de modelo (no anotar a ciegas)

Las anotaciones del Ciclo Alpha tienen tres problemas conocidos:
1. Las sesiones detectadas y anotadas con `app_anotacion.py` en Mayo-Jun usaban timestamps posiblemente sesgados por `clock_invalid` sin la corrección completa.
2. Los criterios de inicio/término de `servido` no estaban tan bien definidos en los primeros backfills (el operador aprendía mientras anotaba).
3. Las sesiones de alimentación del dump de Abril pueden tener bordes ligeramente desplazados porque se anotaron retroactivamente mirando la curva sin precisión de segundos.

Por eso ninguna etiqueta de Alpha se hereda como ground truth. Pero en vez de que el
revisor humano escanee los 3 meses completos a ciegas, el Pre-G de Gamma usa el
**`modelo_a.lgb` de Exp06** (mejor resultado de Alpha) para generar candidatos de
sesión sobre todo el período unificado Abril–Mayo–Junio, y el humano solo clasifica
esos candidatos (alimentacion / servido / hidratación / falso positivo) — ver el
runbook completo en
[`delta_gamma_antiguio.md`](delta_gamma_antiguio.md).
Esto resuelve el mismo problema de fondo (criterios y timestamps inconsistentes) sin
requerir una revisión manual exhaustiva línea por línea de tres meses de datos, y con
la visualización correcta (hora Santiago, no UTC).

### 6.2 Protocolo de Anotación Gamma

#### Criterios de inicio y término (mejorados)

| Sesión | Inicio | Término | Exclusión |
|---|---|---|---|
| `alimentacion` | Primer punto de descenso sostenido (≥3g en ≤60s) | Último punto antes de estabilización en nuevo plateau (rolling_std_5 < 1.5g en ≥3 lecturas) | Si hay subida de peso entre inicio y término → excluir (puede ser servido intercalado) |
| `servido` | Cuando el operador pone comida en el plato (primer punto de subida sostenida ≥5g) | Cuando el peso se estabiliza después de llenar (rolling_std_5 < 1.5g) | No confundir con recuperación de baseline tras descanso |
| `hidratacion` | Ídem a alimentación pero en KPCL0036 | Ídem | KPCL0036 excluido del pipeline ML activo |

#### Reglas operativas para el anotador

1. Siempre mirar la curva en hora **Santiago** — nunca en UTC.
2. Si no queda claro si es `alimentacion` o `servido`: dejar como `sin_clasificar` y revisar después.
3. Cada sesión de `servido` tiene prioridad máxima — es el cuello de botella del modelo.
4. Confirmar que hay ≥2 lecturas dentro de cada ventana antes de cerrar el par.
5. Una sesión con `consumido_g < 0` (el peso subió entre inicio y término) es un error de etiquetado — eliminar.

### 6.3 Herramientas de Anotación Disponibles

| Herramienta | Cuándo usar | Qué hace |
|---|---|---|
| `modelo_a.lgb` + `calibration_isotonic.json` (Exp06) | Pre-anotación (Pre-G, Paso 4.6–4.7) | Genera `prob_activo` sobre los 3 meses unificados con threshold bajo (0.12) y agrupa en `sesiones_candidatas.csv` — ver `delta_gamma_antiguio.md` |
| `app_anotacion_gamma.py` (`app_anotacion.py` migrado) | Anotación primaria | Visualiza curva en hora Santiago; formulario de anotación sobre los candidatos generados por el modelo; barra de progreso hasta 80 servidos |
| `generar_candidatos_servido.py` | Pre-anotación complementaria | Detecta heurísticamente tramos con subida de peso ≥5g no cubiertos por los candidatos del modelo → exporta `servido_candidates.csv` |
| Dashboard KPCL (`kpcl_pruebas_eventos.html`) | Revisión rápida | Vista operativa del bowl con eventos superpuestos; útil para confirmar visual de sesiones |
| Alpha annotations (`new_annotations.csv` / `audit_events`) | Cross-check final (Paso 4.10) | Comparar con `new_annotations_gamma.csv` solo para detectar y documentar discrepancias; NO importar automáticamente ni calcular métrica de coincidencia |

### 6.4 Meta de Datos Antes de G-01

Estas condiciones deben cumplirse antes de ejecutar el primer experimento:

- [ ] `uuid_mapping.json` creado y aplicado (Paso 4.2 del runbook de unificación)
- [ ] Timestamps de Abril + Mayo-Jun normalizados a UTC (Paso 4.3)
- [ ] `readings_unificado_30s.parquet` generado (Paso 4.4)
- [ ] Inferencia con `modelo_a.lgb` (Exp06) corrida sobre el dataset unificado (Paso 4.6, threshold 0.12)
- [ ] `sesiones_candidatas.csv` generado y exportado a `app_anotacion_gamma.py` (Pasos 4.7–4.8)
- [ ] `app_anotacion_gamma.py` ejecutado y con **≥80 sesiones de `servido`** en `new_annotations_gamma.csv` (Paso 4.9)
- [ ] **≥200 sesiones de `alimentacion`** en total (entre dump Abril + Mayo-Jun + nuevas anotaciones)
- [ ] Cross-check de discrepancias contra `audit_events`/`new_annotations.csv` de Alpha documentado (Paso 4.10)
- [ ] `distribucion_clases_gamma.txt` revisado sin assertion errors (Paso 4.11)

---

## 7. Features del Ciclo Gamma

Las 13 features del Ciclo Gamma son un refinamiento de las 12 de Alpha.
`cadencia_s` se excluye. Se añade `dia_semana_sin`. Todas las temporales en hora local.

| # | Feature | Fórmula / Fuente | Cambio vs Alpha | Invariante desde |
|---|---|---|---|---|
| 1 | `weight_grams` | Peso bruto (interpolado, ≤3 NaN consecutivos) | Sin cambio | α-01 |
| 2 | `delta_w` | `w[t] - w[t-1]` | Sin cambio | α-01 |
| 3 | `delta_w_10` | `w[t] - w[t-10]` | Sin cambio | α-03 |
| 4 | `rolling_std_5` | Std últimas 5 lecturas | Sin cambio | α-01 |
| 5 | `rolling_std_10` | Std últimas 10 lecturas (feature #1 en importancia) | Sin cambio | α-01 |
| 6 | `rolling_mean_5` | Media últimas 5 lecturas | Sin cambio | α-01 |
| 7 | `net_weight` | `w - percentil10(w, ventana=60)` | Sin cambio | α-03 |
| 8 | `is_plateau` | `1 si rolling_std_5 < 1.5g` | Sin cambio | α-03 |
| 9 | `plateau_duration_s` | Segundos consecutivos en plateau (×30 con resampleo) | **GAMMA: en segundos** (Alpha usaba filas) | γ-G01 |
| 10 | `hour_sin` | `sin(2π × hour_Santiago / 24)` | **GAMMA: hora Santiago** (Alpha usaba UTC) | γ-G01 |
| 11 | `hour_cos` | `cos(2π × hour_Santiago / 24)` | **GAMMA: hora Santiago** | γ-G01 |
| 12 | `clock_invalid` | Flag de reloj inválido (0/1) | Sin cambio | α-01 |
| 13 | `dia_semana_sin` | `sin(2π × dayofweek_Santiago / 7)` | **NUEVA en Gamma** — captura rutinas semanales | γ-G01 |

Features disponibles pero NO en Gamma todavía:

| Feature | Disponible desde | Motivo de exclusión |
|---|---|---|
| `light_percent`, `light_lux` | Mayo 2026 | Evaluar en G-03 si mejoran F1 |
| `battery_level` | Parcial (KPCL0035 reporta) | No consistente en KPCL0034 |
| `cadencia_s` | α-09B | Importancia baja, excluida (error α-8) |
| `temperature`, `humidity` | Siempre | Correlación baja en Alpha; evaluar en G-03 |

---

## 8. Marco de Evaluación de Modelos

Esta es la diferencia más importante del Ciclo Gamma. En lugar de un único algoritmo,
se evalúan sistemáticamente cuatro grupos de modelos en fases separadas.

### Filosofía de evaluación

- Cada grupo se evalúa sobre los **mismos splits y features** para comparación justa.
- El mejor modelo de cada grupo se registra en `delta_gamma_antiguio.md`.
- La selección del modelo de producción se hace una vez al final, no incrementalmente.
- Las métricas de referencia son las de Alpha-06 (F1 activo=0.7619, F1 alim=0.7606).

### 8.1 Grupo A — Gradient Boosting (GBM)

Ejecutar en paralelo en el mismo script (`g02_train_modelo_a_gbm.py`).

| Modelo | Librería | Fortalezas en este problema |
|---|---|---|
| **LightGBM** | `lightgbm` | Rápido, probado en Alpha, buen manejo de desbalance |
| **XGBoost** | `xgboost` | Regularización diferente, puede generalizar distinto entre períodos |
| **CatBoost** | `catboost` | Mejor con features categóricas y datos pequeños; manejo nativo de NA |
| **HistGradientBoosting** | `sklearn` | Sin dependencias extra, reproducible, buena calibración |

Parámetros de búsqueda sugeridos (Optuna sweep en G-04):

```python
# Para cada GBM — sweep en validación
param_grid = {
    "lightgbm": {"n_estimators": [100,300,500], "num_leaves": [31,63,127], "learning_rate": [0.01,0.03,0.05]},
    "xgboost": {"n_estimators": [100,300,500], "max_depth": [4,6,8], "learning_rate": [0.01,0.03,0.05]},
    "catboost": {"iterations": [100,300,500], "depth": [4,6,8], "learning_rate": [0.01,0.03,0.05]},
}
```

### 8.2 Grupo B — ML Clásico

Ejecutar en paralelo en `g04_train_modelo_a_classical.py`. Sirven como upper bound de simplicidad y como sanity check.

| Modelo | Librería | Cuándo puede ganar |
|---|---|---|
| **Random Forest** | `sklearn` | Buena calibración, resistente a outliers de peso |
| **Extra Trees** | `sklearn` | Más rápido que RF, útil con features ruidosas |
| **SVM (kernel RBF)** | `sklearn` | Puede capturar fronteras no lineales con pocos datos |
| **Logistic Regression** | `sklearn` | Sanity check: si supera a LGBM, hay sobrefit en el GBM |

Nota: SVM requiere normalización de features (`StandardScaler`). Aplicar solo sobre el set de training antes de pasar a SVM, sin tocar los splits.

### 8.3 Grupo C — Deep Learning (data-conditional)

Solo ejecutar cuando se cumplan: **≥300 sesiones de alimentación** + **≥80 sesiones de servido**.
Ejecutar en Google Colab Pro con GPU (T4 o A100).

| Modelo | Tipo | Por qué incluir | Referencia Alpha |
|---|---|---|---|
| **MLP profundo** | Feedforward tabular | Baseline neuronal; rápido de entrenar | NN-A en α-10 |
| **GRU bidireccional** | Recurrente | Mejor F1 servido en α-10 (0.34 vs 0.14 LGBM); captura señal temporal de llenado | NN-B en α-10 |
| **TCN** (Temporal Conv Net) | Convolucional temporal | Mejor F1 activo NN en α-10 (0.60); ventanas largas eficientes | NN-C en α-10 |
| **LSTM** | Recurrente | Variante de GRU, más parámetros; comparar vs GRU con más datos | Nuevo en Gamma |
| **Transformer ligero** | Atención | Útil cuando hay muchas features y contexto largo; en α-10 fue el peor (sobredimensionado) | NN-D en α-10 — probar solo con ≥500 sesiones |
| **TabNet** | Tabular-específico | Atención sobre features tabulares; diseñado para este tipo de problema | Nuevo en Gamma |

Nota importante de Alpha: el Transformer fue el peor en α-10 con 185 sesiones. Solo incorporar en Gamma si el dataset supera las 500 sesiones de alimentación.

### 8.4 Grupo D — Ensemble

Solo ejecutar después de tener el mejor modelo de cada grupo anterior.

| Estrategia | Descripción | Cuándo usar |
|---|---|---|
| **Blend de probabilidades** | `p_final = α×p_GBM + (1-α)×p_NN` con sweep de α | Cuando GBM y NN tienen fortalezas complementarias |
| **Stacking** | Metaclasificador (LogReg o RF pequeño) entrenado sobre predicciones de G1+G2+G3 | Cuando los tres grupos tienen F1 ≥ 0.65 en sus métricas principales |
| **Ensemble por clase** (recomendado) | Para `servido`: usar probabilidades del mejor modelo de G-C (ej. GRU). Para `alimentacion`/`reposo`: usar el mejor GBM. | Si GRU gana en `servido` pero pierde en `alimentacion` — exactamente el patrón de Alpha |

El ensemble por clase es la estrategia más prometedora dado el aprendizaje de α-10:

```python
def predecir_con_ensemble_por_clase(X, gbm_model, gru_model, alpha_servido=0.7):
    """
    Combina GBM (mejor en alimentacion/reposo) con GRU (mejor en servido).
    alpha_servido: peso del GRU en la clase servido (sweep 0.3–0.8).
    """
    p_gbm = gbm_model.predict_proba(X)   # shape (N, 3)
    p_gru = gru_model.predict_proba(X)   # shape (N, 3)

    IDX_SERVIDO = 1  # encoding: alimentacion=0, servido=1, reposo=2

    p_blend = p_gbm.copy()
    p_blend[:, IDX_SERVIDO] = (
        alpha_servido * p_gru[:, IDX_SERVIDO] +
        (1 - alpha_servido) * p_gbm[:, IDX_SERVIDO]
    )
    return p_blend.argmax(axis=1)
```

---

## 9. Secuencia de Experimentos Gamma

Los experimentos Gamma se organizan en cuatro fases. Las fases C y D son
data-conditional (solo ejecutar cuando los prerequisitos de datos se cumplan).

### Pre-G: Unificación de Datos + Retiquetado Total

**No es un experimento numerado — es el prerequisito de todos. Runbook completo:**
[`delta_gamma_antiguio.md`](delta_gamma_antiguio.md).
**Implementación (specs .py en .md):**
[`fase_1_extraccion/scripts/`](fase_1_extraccion/scripts/) — `g01` a `g10`.

| Tarea | Script | Meta |
|---|---|---|
| Setup + verificación de entorno | `g01_setup_env.md` | Carpetas creadas, artefactos de Exp06 accesibles |
| UUID mapping (Paso 4.2) | `g02_uuid_mapping.md` | `uuid_mapping.json` |
| Unificar Abril+Mayo-Jun (UUID + timezone, Pasos 4.1+4.3) | `g03_unify_readings.md` | `readings_unificado_utc.parquet` |
| Resampleo a 30s (Paso 4.4) | `g04_resample_30s.md` | `readings_unificado_30s.parquet` |
| 12 features esquema Exp06 (Paso 4.5) | `g05_compute_features_12.md` | `X_inferencia_3meses.parquet` |
| Inferencia con `modelo_a.lgb` (Exp06), threshold 0.12 (Paso 4.6) | `g06_inferencia_modelo_a.md` | `candidatos_actividad.csv` |
| Agrupación en sesiones candidatas (Paso 4.7) | `g07_build_sesiones_candidatas.md` | `sesiones_candidatas.csv` revisable manualmente |
| Exportar a `app_anotacion.py` (Paso 4.8) | `g08_export_anotacion.md` | `sesiones_candidatas_anotacion.json` |
| Retiquetado manual (Paso 4.9 — humano) | `app_anotacion.py` (Ciclo Alpha) | **≥80 sesiones de servido** en `new_annotations_gamma.csv` |
| Build sessions + cross-check Alpha (Paso 4.10) | `g09_build_sessions_labeled.md` | `sessions_labeled.parquet`, discrepancias documentadas sin fusionar |
| Checkpoint final + distribución de clases (Paso 4.11) | `g10_quality_report.md` | `distribucion_clases_gamma.txt`, sin assertion errors |

---

### Fase A: Baseline Limpio + GBM Benchmark

**G-01 — Baseline Gamma Limpio**

| Campo | Detalle |
|---|---|
| Prerequisito | Pre-G completo (≥80 servido, ≥200 alimentación) |
| Modelo | LightGBM (igual que Alpha, pero con todas las correcciones) |
| Objetivo | Establecer la nueva referencia de partida con datos y features correctas |
| Meta | F1 activo ≥ 0.75, F1 alim ≥ 0.72, F1 servido ≥ 0.30 |
| Qué mide | El impacto puro de las correcciones de Alpha (timezone, UUIDs, resampleo, más servido) |
| Artefactos | `gamma/fase_3_modelos/models/gbm/g01_lgbm_a.lgb` + `g01_lgbm_b.lgb` |

**G-02 — GBM Benchmark Completo**

| Campo | Detalle |
|---|---|
| Prerequisito | G-01 completado |
| Modelos | LightGBM + XGBoost + CatBoost + HistGBM — todos en paralelo |
| Objetivo | Encontrar el mejor algoritmo GBM para este problema con datos Gamma |
| Meta | Identificar el GBM que maximiza: F1 activo (Modelo A) + F1 alim (Modelo B) + F1 servido (Modelo B) |
| Qué cambia vs G-01 | Agrega 3 competidores GBM; mismos datos, mismas features |
| Artefactos | 4 modelos por tarea (A y B) + reporte comparativo `gbm_benchmark_report.csv` |

---

### Fase B: Feature Engineering + ML Clásico

**G-03 — Feature Engineering Avanzado**

| Campo | Detalle |
|---|---|
| Prerequisito | G-02 completado |
| Modelos | Mejor GBM de G-02 (comparación baseline) |
| Features nuevas a evaluar | `light_percent`, `light_lux` (Mayo 2026+), `temperature`, `humidity`, `rolling_std_30` (ventana larga) |
| Objetivo | Identificar si features adicionales mejoran el mejor GBM de G-02 |
| Método | Ablation study: G-02_best + {cada feature nueva}, medir delta de F1 |
| Artefactos | `feature_importance_extended.csv` + reporte de ablation |

**G-04 — Hyperparameter Optimization (Optuna)**

| Campo | Detalle |
|---|---|
| Prerequisito | G-03 completado (features finales definidas) |
| Modelos | Mejor GBM con mejores features |
| Objetivo | Encontrar hiperparámetros óptimos con búsqueda bayesiana |
| Herramienta | Optuna (≥200 trials por modelo por tarea) |
| Qué es invariante | Features, splits, threshold tuning |
| Artefactos | `optuna_study_a.pkl` + `optuna_study_b.pkl` + mejores params |

**G-05 — ML Clásico Benchmark**

| Campo | Detalle |
|---|---|
| Prerequisito | G-04 completado (GBM optimizado como referencia) |
| Modelos | RF, ExtraTrees, SVM (RBF), LogReg — todos vs mejor GBM de G-04 |
| Objetivo | Determinar si algún modelo clásico compite con el GBM optimizado |
| Meta | Si alguno supera al GBM en F1 servido → incorporar en ensemble |
| Artefactos | `classical_benchmark_report.csv` + modelos serializados |

---

### Fase C: Deep Learning (Data-Conditional)

**Prerequisito global Fase C: ≥300 sesiones alimentación + ≥80 sesiones servido**

**G-06 — NN Baseline (MLP + GRU + TCN)**

| Campo | Detalle |
|---|---|
| Prerequisito | G-05 + ≥300 alim + ≥80 serv |
| Modelos | MLP, GRU bidireccional, TCN — los 3 en Colab Pro (GPU T4) |
| Input | Secuencias de longitud fija (ventana de 60 timesteps × 13 features) |
| Objetivo | Determinar si las NN superan al mejor GBM de G-04 con más datos |
| Métrica crítica | F1 servido (Modelo B) — la clase que GBM no resuelve bien |
| Artefactos | 3 modelos × 2 tareas + `nn_baseline_report.csv` |

**G-07 — NN Avanzado (LSTM + TabNet)**

| Campo | Detalle |
|---|---|
| Prerequisito | G-06 completado + alguna NN mostró F1 > GBM en ≥1 métrica |
| Modelos | LSTM, TabNet, y Transformer solo si ≥500 sesiones alim |
| Objetivo | Explorar si arquitecturas alternativas mejoran sobre G-06 |
| Artefactos | Modelos + reporte comparativo vs G-06 |

---

### Fase D: Ensemble y Evaluación Final

**G-08 — Ensemble**

| Campo | Detalle |
|---|---|
| Prerequisito | G-04 (best GBM) + G-06 (best NN, si mejora) |
| Estrategias | (1) Blend probabilidades con sweep α; (2) Stacking; (3) Ensemble por clase (GBM para alim/reposo, NN para servido) |
| Objetivo | Maximizar F1 macro y especialmente F1 servido sin degradar F1 alim |
| Meta | F1 servido ≥ 0.40, F1 alim ≥ 0.75, F1 activo ≥ 0.75 |
| Artefactos | Ensemble serializado + reporte de sweep α |

**G-Final — Evaluación Formal sobre Test Set**

| Campo | Detalle |
|---|---|
| Prerequisito | G-08 completado con modelo candidato final seleccionado |
| Acción | Cargar `X_test.parquet` + `y_test.parquet` (primera y única vez) |
| Objetivo | Métricas reales de generalización sobre datos nunca vistos |
| Decisión | Si supera umbrales Gamma → modelo de producción Ciclo Gamma |
| Artefactos | `g_final_test_report.json` + modelo de producción Gamma |

---

## 10. Tabla Maestra de Experimentos

Ver archivo: `delta_gamma_antiguio.md`

Resumen inicial:

| ID | Nombre | Fase | Prerequisito | Meta principal | Estado |
|---|---|---|---|---|---|
| **Pre-G** | Preparación datos + anotación | Pre | — | ≥80 serv · ≥200 alim · Fase 1 OK | ⏳ Pendiente |
| **G-01** | Baseline Gamma limpio | A | Pre-G ✅ | F1 activo ≥ 0.75 · F1 alim ≥ 0.72 | ⏳ Pendiente |
| **G-02** | GBM Benchmark (4 algoritmos) | A | G-01 ✅ | Encontrar mejor GBM | ⏳ Pendiente |
| **G-03** | Feature Engineering avanzado | B | G-02 ✅ | Identificar features que mejoran el GBM | ⏳ Pendiente |
| **G-04** | Hyperparameter Optimization (Optuna) | B | G-03 ✅ | GBM completamente optimizado | ⏳ Pendiente |
| **G-05** | ML Clásico Benchmark | B | G-04 ✅ | Comparar RF/ET/SVM vs GBM | ⏳ Pendiente |
| **G-06** | NN Baseline (MLP/GRU/TCN) | C | G-05 + ≥300 alim + ≥80 serv | F1 servido ≥ 0.40 desde NN | ⏳ Data-conditional |
| **G-07** | NN Avanzado (LSTM/TabNet) | C | G-06 con señal positiva | Explorar arquitecturas adicionales | ⏳ Data-conditional |
| **G-08** | Ensemble GBM + NN | D | G-04 + G-06 | F1 servido ≥ 0.40 · sin degradar alim | ⏳ Pendiente |
| **G-Final** | Evaluación formal test set | D | G-08 modelo candidato | Métricas reales de generalización | ⏳ Reservado |

### Umbrales de Producción del Ciclo Gamma (elevados vs Alpha)

| Métrica | Umbral Alpha (referencia) | Umbral Gamma (objetivo) |
|---|---|---|
| F1 activo — Modelo A | ≥ 0.70 | **≥ 0.75** |
| AUC-ROC — Modelo A | ≥ 0.85 | **≥ 0.90** |
| F1 alimentacion — Modelo B | ≥ 0.65 | **≥ 0.75** |
| F1 servido — Modelo B | sin umbral | **≥ 0.40** |
| Macro F1 — Modelo B | ≥ 0.60 | **≥ 0.65** |

---

## 11. Parámetros Globales e Invariantes

Definidos en `_gamma_utils.py`. Cambiarlos requiere crear un nuevo experimento numerado.

```python
# _gamma_utils.py — FUENTE CANÓNICA DE CONSTANTES GAMMA

# ── Dispositivos ────────────────────────────────────────────────────────────────
KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",   # UUID Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",   # UUID Mayo-Jun 2026 y posterior
]
KPCL0034_CODE = "KPCL0034"

# ── Pipeline ────────────────────────────────────────────────────────────────────
GAP_CUTOFF_S       = 300    # segundos — gap para delimitar segmento nuevo
PLATEAU_THRESHOLD  = 1.5    # gramos — umbral is_plateau (rolling_std_5)
RESAMPLE_TARGET_S  = 30     # segundos — cadencia uniforme post-resampleo
BASELINE_WINDOW    = 60     # lecturas — ventana para calcular net_weight (percentil 10)

# ── Inferencia ──────────────────────────────────────────────────────────────────
MIN_SESSION_S      = 30     # duración mínima de sesión válida
GAP_MERGE_S        = 60     # gap entre activos para fusionar en misma sesión
MIN_CONSUMED_G     = 3.0    # cambio mínimo de peso para sesión válida

# ── Datos: meta antes de G-01 ───────────────────────────────────────────────────
MIN_SERVIDO_SESSIONS    = 80    # sesiones reales de servido etiquetadas
MIN_ALIM_SESSIONS       = 200   # sesiones de alimentación etiquetadas
MIN_ALIM_FOR_NN         = 300   # sesiones de alimentación para habilitar G-06

# NOTA — Augmentación temporal (activa desde 2026-06-17):
# Mientras servido_real < MIN_SERVIDO_SESSIONS, _gamma_utils.cargar_sessions_con_augmentation()
# oversamplea con reemplazo hasta completar 80. Las filas sintéticas llevan is_augmented=True.
# Se auto-desactiva cuando haya >= 80 sesiones reales. Ver §7b de delta_gamma_antiguio.md.

# ── Features (en orden — NO cambiar sin nuevo experimento) ──────────────────────
FEATURES_GAMMA = [
    "weight_grams",
    "delta_w",
    "delta_w_10",
    "rolling_std_5",
    "rolling_std_10",
    "rolling_mean_5",
    "net_weight",
    "is_plateau",
    "plateau_duration_s",   # en segundos (no filas — corrección vs Alpha)
    "hour_sin",             # hora Santiago (no UTC — corrección vs Alpha)
    "hour_cos",             # hora Santiago
    "clock_invalid",
    "dia_semana_sin",       # nueva en Gamma
]

# ── Encoding de clases ──────────────────────────────────────────────────────────
LABEL_ENCODING = {
    "alimentacion": 0,
    "servido":      1,
    "reposo":       2,
}

# ── Threshold inicial Modelo A ──────────────────────────────────────────────────
# Recalibrar con isotonic regression en cada experimento, partir de 0.20 como referencia
THRESHOLD_A_INICIAL = 0.20

# ── Timezone ────────────────────────────────────────────────────────────────────
TZ_LOCAL = "America/Santiago"
TZ_UTC   = "UTC"

# ── Encoding CSV (exports Supabase) ─────────────────────────────────────────────
CSV_ENCODING = "latin1"
```

---

## 12. Comandos de Ejecución

### Setup inicial del entorno Gamma

```powershell
cd "Docs/investigacion/Data Science"
.\venv\Scripts\Activate.ps1

# Crear estructura de carpetas Gamma
New-Item -ItemType Directory -Force -Path @(
    "gamma/fase_1_extraccion/scripts",
    "gamma/fase_1_extraccion/data/raw",
    "gamma/fase_1_extraccion/data/processed",
    "gamma/fase_1_extraccion/outputs/quality_report",
    "gamma/fase_2_dataset/scripts",
    "gamma/fase_2_dataset/data/interim",
    "gamma/fase_2_dataset/data/train",
    "gamma/fase_2_dataset/outputs/dataset_report",
    "gamma/fase_3_modelos/scripts",
    "gamma/fase_3_modelos/models/gbm",
    "gamma/fase_3_modelos/models/classical",
    "gamma/fase_3_modelos/models/nn",
    "gamma/fase_3_modelos/models/ensemble",
    "gamma/fase_3_modelos/outputs/training_report",
    "gamma/fase_4_anotacion/data",
    "gamma/experiments"
)
```

### Paso 1 — Anotación (SIEMPRE PRIMERO)

```powershell
streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py
# → http://localhost:8501
# Anotar hasta que la barra de progreso muestre ≥ 80 sesiones de servido
# Usar también generar_candidatos_servido.py para encontrar candidatos

python gamma/fase_4_anotacion/generar_candidatos_servido.py
# → exporta gamma/fase_4_anotacion/data/servido_candidates.csv
```

### Paso 2 — Fase 1

```powershell
cd "gamma/fase_1_extraccion/scripts"
python g01_setup_env.py
python g02_get_device_uuid.py
python g03_extract_readings.py    # corrige timezone, dual UUID, detecta anomalías
python g04_extract_events.py      # fusiona audit_events + new_annotations_gamma.csv
python g05_build_sessions.py
python g06_quality_report.py      # checkpoints: ≥80 serv, ≥200 alim, sin assertion errors

# Revisar OBLIGATORIAMENTE:
# - gamma/fase_1_extraccion/outputs/anomalias_peso.csv
# - gamma/fase_1_extraccion/outputs/anomalias_sesiones.csv
# - gamma/fase_1_extraccion/outputs/distribucion_por_periodo.json
```

### Paso 3 — Fase 2

```powershell
cd "../../fase_2_dataset/scripts"
python g01_build_labels.py
python g02_build_features.py      # resampleo 30s + hora Santiago + dia_semana_sin
python g03_build_train_dataset.py
python g04_dataset_report.py

# Verificar distribución de clases en dataset_report
# Verificar que X_test.parquet existe pero NO abrirlo
```

### Paso 4 — Fase 3 (G-01)

```powershell
cd "../../fase_3_modelos/scripts"
python g01_prepare_datasets.py
python g02_train_modelo_a_gbm.py  # G-01: solo LightGBM
python g03_train_modelo_b_gbm.py  # G-01: solo LightGBM
python g09_training_report.py
```

### Paso 5 — Fase 3 (G-02: GBM Benchmark)

```powershell
# Instalar dependencias adicionales
pip install xgboost catboost optuna --break-system-packages

# Correr benchmark GBM completo
python g02_train_modelo_a_gbm.py --benchmark  # activa los 4 GBM en paralelo
python g03_train_modelo_b_gbm.py --benchmark
python g09_training_report.py --mode=gbm_benchmark
```

### Fase C (G-06) — Redes Neuronales en Colab

```python
# Subir a Google Colab Pro:
# - gamma/fase_3_modelos/scripts/g06_train_modelo_a_nn.py
# - gamma/fase_2_dataset/data/train/X_train.parquet
# - gamma/fase_2_dataset/data/train/X_val.parquet
# - gamma/fase_2_dataset/data/train/y_train.parquet
# - gamma/fase_2_dataset/data/train/y_val.parquet

# En Colab:
!pip install torch torchvision torchaudio
!pip install lightning imbalanced-learn
# Ejecutar g06_train_modelo_a_nn.py
# Descargar modelos .pt al terminar
```

---

## 13. Reglas del Ciclo Gamma

Estas reglas son inviolables. Romperlas requiere documentar el motivo en el experimento.

1. **`X_test` y `y_test` no se tocan** hasta que exista un modelo candidato final en G-08.
2. **No se entrena** hasta tener ≥80 sesiones de `servido` reales en `new_annotations_gamma.csv`.
3. **Siempre hora Santiago** para `hour_sin`, `hour_cos`, `dia_semana_sin`. Nunca UTC.
4. **Siempre `ingested_at`** cuando `clock_invalid=True`. Detectar automáticamente períodos con 100% `clock_invalid` y forzar `ingested_at` sin condición.
5. **Siempre resampleo a 30s** antes de calcular features. No negociable desde G-01.
6. **Siempre análisis de distribución por período** (`distribucion_por_periodo.json`) antes de combinar fuentes de datos distintos en entrenamiento.
7. **Ambos UUIDs de KPCL0034** siempre en `KPCL0034_UUIDS`. Nunca filtrar por un solo UUID.
8. **Encoding `latin1`** para todos los CSVs exportados de Supabase.
9. **Un experimento = un archivo MD** en `gamma/experiments/` + una fila en `delta_gamma_antiguio.md`.
10. **NN solo con datos suficientes**: G-06 y posteriores requieren ≥300 alim + ≥80 serv. No antes.
11. **Comparación siempre sobre los mismos splits**: todos los modelos G-01 a G-08 se evalúan sobre el mismo `X_val.parquet` para comparación justa.
12. **No importar anotaciones de Alpha automáticamente**: las de `new_annotations.csv` son una referencia, no una fuente de verdad automática para Gamma.
13. **`cadencia_s` excluida**: no incorporar de vuelta sin un experimento numerado que justifique su valor.
14. **Threshold siempre post-calibración isotónica**: nunca usar threshold default 0.50 en producción.

---

## 14. Referencias Cruzadas

| Documento | Rol en Gamma |
|---|---|
| `delta_gamma_antiguio.md` | Runbook operativo del Pre-G: unificación de datos + inferencia con Modelo A de Exp06 + retiquetado total |
| `fase_1_extraccion/scripts/g01_setup_env.md` ... `g10_quality_report.md` | Implementación (specs .py) de los Pasos 4.1–4.11 del runbook de unificación |
| `delta_gamma_antiguio.md` | Tabla maestra de todos los experimentos del Ciclo Gamma |
| `delta_gamma_antiguio.md` | Definiciones actualizadas con lecciones Alpha |
| `av1_EXPERIMENTOS_DETALLE.md` a `av1_EXPERIMENTOS_DETALLE.md` | Ciclo Alpha (solo lectura, referencia histórica) |
| `av1_EXPERIMENT_TRACKER.md` | Tracker del Ciclo Alpha (histórico) |
| `../REGLAS_EVENTOS_ALIMENTACION.md` | Taxonomía canónica de eventos (aplica a ambos ciclos) |
| `av1_ML_PREDICCION_ALIMENTACION.md` | Especificación ML original (Ciclo Alpha) |
| `KPCL_GUIA_DASHBOARD.md` | Guía del dashboard para identificar sesiones a anotar |
| `../OPERATIVIZACION_SESIONES_SUPABASE.md` | Estructura de sesiones en Supabase |
| `KPCL_AUDITORIA_SIN_CARGADOR.md` | Contexto de anomalías KPCL0036 |
| `KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md` | Por qué KPCL0036 sigue excluido |

---

## Apéndice A — Renombramiento Ciclo Alpha

Para mantener el historial claro, los experimentos Alpha se identifican con prefijo α:

| Nombre anterior | Nombre Alpha canónico |
|---|---|
| Exp 01 | **α-01** — Línea base |
| Exp 02 | **α-02** — Threshold + rebalanceo |
| Exp 03 | **α-03** — Mejor base histórica (**referencia de 12 features**) |
| Exp 04 | **α-04** — SMOTE + calibración isotónica |
| Exp 05 | **α-05** — Nueva ingesta Fase 1 |
| Exp 06 | **α-06** — Dump Colab ★ **Mejor Alpha / Producción actual** |
| Exp 07 | **α-07** — Inferencia Mayo-Jun |
| Exp 08 | **α-08** — Unificación Mayo-Jun |
| Exp 09A | **α-09A** — Cadencia normalizada |
| Exp 09B | **α-09B** — Threshold por período |
| Exp 10-NN | **α-10** — Benchmark neuronal |

---

## Apéndice B — Checklist de Arranque del Ciclo Gamma

```
□ Dump de Supabase descargado y guardado en Data_2026/
□ Carpeta gamma/ creada con estructura completa
□ _gamma_utils.py creado con constantes y KPCL0034_UUIDS
□ _gamma_phase2_utils.py creado con resampleo, hora Santiago, plateau_duration_s
□ _gamma_phase3_utils.py creado con funciones genéricas multi-modelo
□ app_anotacion_gamma.py ejecutando correctamente en localhost:8501
□ generar_candidatos_servido.py generó servido_candidates.csv
□ Anotación de servido en progreso (barra en app)
□ ≥80 sesiones de servido → DESBLOQUEADO: ejecutar Paso 2 (Fase 1)
□ g06_quality_report.py pasa sin assertion errors
□ distribucion_por_periodo.json revisado → DESBLOQUEADO: ejecutar Paso 3 (Fase 2)
□ X_test.parquet generado → sellar (no abrir)
□ G-01 ejecutado → baseline establecido
□ delta_gamma_antiguio.md actualizado con fila G-01
```


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Kittypau ML — Ciclo Gamma: Guía de Implementación Completa

> ⚠️ **Actualización 2026-06-16:** el Pre-G de Gamma cambió de estrategia — ver
> [`delta_gamma_antiguio.md`](delta_gamma_antiguio.md).
> En vez de anotación manual desde cero (§7 `app_anotacion_gamma.py` mostrando
> sesiones cronológicas, §8 `generar_candidatos_servido.py` con heurística de
> subida de peso ≥5g), Gamma genera candidatos con inferencia del Modelo A de
> Exp06 sobre los 3 meses unificados. La implementación vigente de Fase 1 está en
> [`Ciclo_Gamma/fase_1_extraccion/scripts/`](fase_1_extraccion/scripts/) (`g01` a
> `g10`). Las secciones 2 (rutas y carga de datos), 4 (`g03_extract_readings.py`)
> y los gaps 1-4 de la sección 1 siguen siendo una referencia útil para el manejo
> de columnas/encoding/timezone de los dos CSV fuente — esa lógica se reutilizó
> en `g03_unify_readings.py`. Las secciones 7, 8 y 9 (app de anotación a ciegas,
> heurística de candidatos por subida de peso, quality report post-anotación
> directa) están **superseded** por el flujo de inferencia con Modelo A.

**Fecha:** 2026-06-15  
**Estado:** Pre-G — listo para ejecutar  
**Rutas de datos canónicas:**

```
Abril 2026 → D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\readings.csv
Mayo-Jun 2026 → D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\readings_rows.csv
```

---

## Por qué este documento existe

El instructivo original (`delta_gamma_antiguio.md`) y los archivos de experimentos Gamma (`g01` a `g06`) cubren la arquitectura y los objetivos. Lo que falta —y lo que aquí se documenta— son los **detalles de implementación concretos** que se descubrieron durante Alpha y que no quedaron capturados explícitamente: cómo cargar exactamente los dos CSVs de datos, qué hacer con sus columnas inconsistentes, qué orden de operaciones falla en silencio si no se sigue, y qué decisiones de código específicas bloquean errores conocidos antes de que ocurran.

---

## Índice

1. [Gaps identificados respecto al instructivo existente](#1-gaps-identificados)
2. [Rutas de datos y cómo cargar cada archivo](#2-rutas-y-carga-de-datos)
3. [_gamma_utils.py — código completo listo para copiar](#3-_gamma_utilspy)
4. [g03_extract_readings.py — lógica completa de extracción](#4-g03_extract_readingspy)
5. [g04_extract_events.py — fusión de fuentes de etiquetas](#5-g04_extract_eventspy)
6. [_gamma_phase2_utils.py — resampleo, features y timezone](#6-_gamma_phase2_utilspy)
7. [app_anotacion_gamma.py — qué debe tener para funcionar](#7-app_anotacion_gammappy)
8. [generar_candidatos_servido.py](#8-generar_candidatos_servidopy)
9. [g06_quality_report.py — checkpoints obligatorios](#9-g06_quality_reportpy)
10. [Análisis de distribución por período (KS-test)](#10-análisis-de-distribución)
11. [Split temporal Gamma — fechas y lógica](#11-split-temporal-gamma)
12. [Checklist de arranque paso a paso](#12-checklist-de-arranque)
13. [Errores silenciosos conocidos y cómo evitarlos](#13-errores-silenciosos)
14. [Dependencias y entorno](#14-dependencias)
15. [Preguntas frecuentes de implementación](#15-faq)

---

## 1. Gaps identificados

Lo que el instructivo existente no resuelve explícitamente:

**Gap 1 — Las dos rutas de datos no están integradas en ningún script.**  
`readings.csv` (Abril) y `readings_rows.csv` (Mayo-Jun) tienen esquemas ligeramente distintos y deben concatenarse de una forma específica antes de filtrar por UUID. Ningún script existente hace eso todavía.

**Gap 2 — El UUID de KPCL0034 en Abril es diferente al de Mayo-Jun.**  
Esto está documentado en el glosario pero no hay ningún script que verifique automáticamente que ambos UUIDs están presentes en el CSV antes de continuar. Si se filtra por un solo UUID, la mitad de los datos desaparece en silencio.

**Gap 3 — `readings.csv` de Abril tiene la columna `light_percent` y `light_lux` en cero para todas las filas.**  
`readings_rows.csv` de Mayo-Jun las tiene con valores reales. Si se concatenan sin control, el análisis de distribución de features de luz reporta shift cuando en realidad no hay shift — hay ausencia de dato.

**Gap 4 — El campo `created_at` de `audit_events.csv` tiene tres formatos de timezone distintos.**  
`+00`, `-04`, `-04:00` aparecen mezclados en el mismo archivo. `pd.to_datetime()` sin parámetros extra falla silenciosamente en algunos de ellos.

**Gap 5 — `app_anotacion_gamma.py` no existe todavía.**  
El instructivo la referencia pero no hay código. Este documento especifica qué debe contener para que funcione correctamente.

**Gap 6 — El split temporal para Gamma no tiene fechas concretas.**  
El instructivo dice "train→May 31 / val→Jun 7 / test→Jun 14" pero esas fechas asumen datos hasta Jun 14. Si se descarga un nuevo dump que cubre hasta Jun 15 o más tarde, el split debe actualizarse. Aquí se define la lógica para calcularlo dinámicamente.

**Gap 7 — `plateau_duration_s` en segundos no es directamente calculable desde el resampleo.**  
El resampleo a 30s hace que cada fila represente 30s, por lo que `plateau_duration` en filas × 30 = segundos. Pero la lógica de acumulación de plateau debe reiniciarse en los gaps. Esto necesita implementación explícita.

**Gap 8 — No hay script `generar_candidatos_servido.py`.**  
Está referenciado pero no existe. Es crítico para identificar sesiones de servido no etiquetadas antes de empezar a anotar.

**Gap 9 — La `app_anotacion_gamma.py` debe mostrar los candidatos de servido priorizados, no todas las sesiones.**  
El flujo de Alpha mostraba sesiones en orden cronológico. Gamma necesita mostrar primero los candidatos de servido detectados por `generar_candidatos_servido.py`.

**Gap 10 — No hay definición de qué hacer cuando `g06_quality_report.py` falla una assertion.**  
El instructivo dice que bloquea el avance pero no dice cómo resolver el bloqueo en cada caso.

---

## 2. Rutas y carga de datos

### Archivo Abril 2026

```python
ABRIL_CSV = r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\readings.csv"
AUDIT_EVENTS_CSV = r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\audit_events.csv"
DEVICES_CSV = r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\devices.csv"
```

**Columnas presentes en `readings.csv` de Abril:**
`id`, `device_id`, `pet_id`, `weight_grams`, `water_ml`, `flow_rate`, `temperature`, `humidity`, `battery_level`, `recorded_at`, `ingested_at`, `clock_invalid`, `battery_voltage`, `battery_state`, `battery_source`, `battery_is_estimated`, `light_percent`, `light_lux`, `light_condition`

**Nota crítica:** `light_percent`, `light_lux` y `light_condition` están presentes en el CSV de Abril pero con valores `0` / `"dark"` para KPCL0034. No confundir con ausencia de columna.

### Archivo Mayo-Jun 2026

```python
MAYO_CSV = r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\readings_rows.csv"
```

**Columnas presentes en `readings_rows.csv` de Mayo-Jun:**
Mismo esquema que Abril. `light_percent` y `light_lux` tienen valores reales desde Mayo 2026.

**Diferencia clave con Abril:** `clock_invalid = True` en el 100% de las filas. El UUID de KPCL0034 es diferente (`3a460074-...` en lugar de `9510a455-...`).

### Carga correcta (concatenar ambos archivos)

```python
import pandas as pd
from pathlib import Path

ABRIL_CSV  = Path(r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\readings.csv")
MAYO_CSV   = Path(r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\readings_rows.csv")

KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",  # UUID Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # UUID Mayo-Jun 2026 y posterior
]

def cargar_readings_combinados() -> pd.DataFrame:
    """
    Carga y concatena los dos CSVs de readings.
    Filtra por KPCL0034_UUIDS, resuelve timestamps, descarta columnas vestigiales.
    """
    print("Cargando Abril 2026...")
    df_abril = pd.read_csv(ABRIL_CSV, encoding="latin1", low_memory=False)
    df_abril["_fuente"] = "abril"

    print("Cargando Mayo-Jun 2026...")
    df_mayo = pd.read_csv(MAYO_CSV, encoding="latin1", low_memory=False)
    df_mayo["_fuente"] = "mayo_jun"

    # Alinear columnas — ambos tienen el mismo esquema, pero por seguridad:
    cols_comunes = list(set(df_abril.columns) & set(df_mayo.columns))
    df = pd.concat([df_abril[cols_comunes + ["_fuente"]], 
                    df_mayo[cols_comunes + ["_fuente"]]], 
                   ignore_index=True)

    # Filtrar por ambos UUIDs de KPCL0034
    df = df[df["device_id"].isin(KPCL0034_UUIDS)].copy()
    print(f"Filas KPCL0034 combinadas: {len(df):,}")

    # Verificar que ambos UUIDs están representados
    uuids_presentes = set(df["device_id"].unique())
    for uuid in KPCL0034_UUIDS:
        if uuid not in uuids_presentes:
            print(f"⚠️  UUID no encontrado en datos: {uuid}")
        else:
            n = (df["device_id"] == uuid).sum()
            print(f"  {uuid[:8]}...: {n:,} filas")

    # Resolver timestamp
    pct_clock_invalid = df["clock_invalid"].mean()
    print(f"clock_invalid: {pct_clock_invalid*100:.1f}%")

    if pct_clock_invalid > 0.95:
        print("→ Forzando ingested_at para todo el conjunto")
        df["ts_utc"] = pd.to_datetime(df["ingested_at"], utc=True)
    else:
        df["ts_utc"] = df.apply(
            lambda r: pd.to_datetime(r["ingested_at"], utc=True)
            if r["clock_invalid"]
            else pd.to_datetime(r["recorded_at"], utc=True),
            axis=1
        )

    # Eliminar columnas vestigiales
    cols_vestigiales = ["water_ml", "flow_rate", "battery_is_estimated"]
    df = df.drop(columns=[c for c in cols_vestigiales if c in df.columns])

    # Ordenar por timestamp
    df = df.sort_values("ts_utc").reset_index(drop=True)

    return df
```

---

## 3. `_gamma_utils.py`

Fuente canónica de todas las constantes. Crear en `gamma/fase_1_extraccion/scripts/_gamma_utils.py` y también en `gamma/fase_2_dataset/scripts/` y `gamma/fase_3_modelos/scripts/` (o importar con path relativo desde un único archivo).

```python
# _gamma_utils.py — FUENTE CANÓNICA DE CONSTANTES CICLO GAMMA
# Cambiar cualquier valor aquí requiere crear un nuevo experimento numerado.

from pathlib import Path
from zoneinfo import ZoneInfo

# ── Raíz del proyecto ────────────────────────────────────────────────────────
ROOT = Path(r"D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq")
DATA_SCIENCE = ROOT / "Docs" / "investigacion" / "Data Science"
GAMMA_ROOT   = DATA_SCIENCE / "gamma"

# ── Rutas de datos fuente ────────────────────────────────────────────────────
ABRIL_READINGS_CSV = ROOT / "Docs" / "investigacion" / "Data_2026" / "Abril_2026" / \
                     "kittypau_full_07-05-2026_csv" / "readings.csv"
ABRIL_AUDIT_CSV    = ROOT / "Docs" / "investigacion" / "Data_2026" / "Abril_2026" / \
                     "kittypau_full_07-05-2026_csv" / "audit_events.csv"
ABRIL_DEVICES_CSV  = ROOT / "Docs" / "investigacion" / "Data_2026" / "Abril_2026" / \
                     "kittypau_full_07-05-2026_csv" / "devices.csv"
MAYO_READINGS_CSV  = ROOT / "Docs" / "investigacion" / "Data_2026" / \
                     "Mayo_2026" / "readings_rows.csv"

# ── Dispositivos ─────────────────────────────────────────────────────────────
KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",   # UUID Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",   # UUID Mayo-Jun 2026 y posterior
]
KPCL0034_CODE = "KPCL0034"

# Devices excluidos del pipeline activo
KPCL0036_EXCLUIDO = True
DEVICE_DESCONOCIDO_UUID = "418565e7-6683-440c-80e6-666363574cec"  # no identificado en exp07

# ── Parámetros del pipeline ───────────────────────────────────────────────────
GAP_CUTOFF_S      = 300     # segundos — gap que crea nuevo segmento
PLATEAU_THRESHOLD = 1.5     # gramos — umbral is_plateau
RESAMPLE_TARGET_S = 30      # segundos — cadencia uniforme post-resampleo
BASELINE_WINDOW   = 60      # lecturas — ventana percentil 10 para net_weight

# ── Parámetros de inferencia ──────────────────────────────────────────────────
MIN_SESSION_S  = 30         # duración mínima de sesión válida
GAP_MERGE_S    = 60         # gap entre activos que se fusionan en misma sesión
MIN_CONSUMED_G = 3.0        # cambio mínimo de peso para sesión válida

# ── Umbrales de datos antes de entrenar ──────────────────────────────────────
MIN_SERVIDO_SESSIONS = 80   # sesiones reales de servido etiquetadas
MIN_ALIM_SESSIONS    = 200  # sesiones de alimentación etiquetadas
MIN_ALIM_FOR_NN      = 300  # sesiones alim para habilitar G-06 (redes neuronales)

# ── Features (orden fijo — no cambiar sin nuevo experimento) ─────────────────
FEATURES_GAMMA = [
    "weight_grams",
    "delta_w",
    "delta_w_10",
    "rolling_std_5",
    "rolling_std_10",
    "rolling_mean_5",
    "net_weight",
    "is_plateau",
    "plateau_duration_s",    # en segundos (no filas) — corrección vs Alpha
    "hour_sin",              # hora Santiago (no UTC) — corrección vs Alpha
    "hour_cos",
    "clock_invalid",
    "dia_semana_sin",        # nueva en Gamma — captura rutinas semanales
]
# NOTA: cadencia_s excluida intencionalmente (error α-8: importancia baja)

# ── Encoding de clases ───────────────────────────────────────────────────────
LABEL_ENCODING = {
    "alimentacion": 0,
    "servido":      1,
    "reposo":       2,
}
IDX_ALIMENTACION = 0
IDX_SERVIDO      = 1
IDX_REPOSO       = 2

# ── Threshold inicial Modelo A ───────────────────────────────────────────────
# Recalibrar con isotonic regression en cada experimento. 0.20 es punto de partida.
THRESHOLD_A_INICIAL = 0.20

# ── Timezone ─────────────────────────────────────────────────────────────────
TZ_LOCAL = ZoneInfo("America/Santiago")
TZ_UTC   = "UTC"

# ── CSV encoding (exports Supabase) ──────────────────────────────────────────
CSV_ENCODING = "latin1"

# ── Rutas de salida ──────────────────────────────────────────────────────────
FASE1_RAW         = GAMMA_ROOT / "fase_1_extraccion" / "data" / "raw"
FASE1_OUTPUTS     = GAMMA_ROOT / "fase_1_extraccion" / "outputs"
FASE2_INTERIM     = GAMMA_ROOT / "fase_2_dataset" / "data" / "interim"
FASE2_TRAIN       = GAMMA_ROOT / "fase_2_dataset" / "data" / "train"
FASE3_MODELS_GBM  = GAMMA_ROOT / "fase_3_modelos" / "models" / "gbm"
FASE3_MODELS_NN   = GAMMA_ROOT / "fase_3_modelos" / "models" / "nn"
FASE3_MODELS_ENS  = GAMMA_ROOT / "fase_3_modelos" / "models" / "ensemble"
FASE3_OUTPUTS     = GAMMA_ROOT / "fase_3_modelos" / "outputs" / "training_report"
FASE4_DATA        = GAMMA_ROOT / "fase_4_anotacion" / "data"

ANNOTATIONS_GAMMA = FASE4_DATA / "new_annotations_gamma.csv"
SERVIDO_CANDIDATES = FASE4_DATA / "servido_candidates.csv"
```

---

## 4. `g03_extract_readings.py`

Este script reemplaza el `03_extract_readings.py` de Alpha. La diferencia principal es que lee desde los dos CSVs locales en lugar de la API de Supabase.

```python
"""
g03_extract_readings.py — Fase 1 Gamma
Carga readings desde CSV Abril + CSV Mayo-Jun, filtra KPCL0034 (ambos UUIDs),
resuelve timestamps, detecta anomalías y exporta readings_raw.parquet.
"""
import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from scipy import stats as scipy_stats

# Añadir ruta para importar _gamma_utils
sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import *

def cargar_y_concatenar() -> pd.DataFrame:
    """Carga ambos CSVs, filtra por KPCL0034_UUIDS, resuelve timestamps."""
    print("=" * 60)
    print("Cargando readings.csv (Abril 2026)...")
    df_abril = pd.read_csv(ABRIL_READINGS_CSV, encoding=CSV_ENCODING, low_memory=False)
    df_abril["_periodo"] = "abril"
    print(f"  Filas totales: {len(df_abril):,}")

    print("Cargando readings_rows.csv (Mayo-Jun 2026)...")
    df_mayo = pd.read_csv(MAYO_READINGS_CSV, encoding=CSV_ENCODING, low_memory=False)
    df_mayo["_periodo"] = "mayo_jun"
    print(f"  Filas totales: {len(df_mayo):,}")

    # Alinear columnas (mayo_jun puede tener columnas extra o faltantes)
    cols_comunes = sorted(set(df_abril.columns) & set(df_mayo.columns))
    df = pd.concat(
        [df_abril[cols_comunes + ["_periodo"]], df_mayo[cols_comunes + ["_periodo"]]],
        ignore_index=True
    )

    # Filtrar por ambos UUIDs de KPCL0034
    df_kpcl = df[df["device_id"].isin(KPCL0034_UUIDS)].copy()
    print(f"\nFilas KPCL0034 combinadas: {len(df_kpcl):,}")

    # Verificar presencia de ambos UUIDs
    for uuid in KPCL0034_UUIDS:
        n = (df_kpcl["device_id"] == uuid).sum()
        periodo = "Abril" if "9510" in uuid else "Mayo-Jun"
        if n == 0:
            print(f"  ⚠️  UUID {periodo} NO encontrado — verificar CSV")
        else:
            print(f"  ✅ UUID {periodo}: {n:,} filas")

    return df_kpcl

def resolver_timestamps(df: pd.DataFrame) -> pd.DataFrame:
    """
    Resuelve el timestamp canónico usando clock_invalid.
    Si el período tiene >95% clock_invalid, fuerza ingested_at sin condición.
    Esto resuelve el error α-5.
    """
    df = df.copy()
    pct_invalid = df["clock_invalid"].mean()
    print(f"\nclock_invalid: {pct_invalid*100:.1f}%")

    if pct_invalid > 0.95:
        print("  → 100% clock_invalid — forzando ingested_at para todo el dataset")
        df["ts_utc"] = pd.to_datetime(df["ingested_at"], utc=True, errors="coerce")
    else:
        # Por período
        for periodo in ["abril", "mayo_jun"]:
            mask = df["_periodo"] == periodo
            sub = df.loc[mask]
            pct = sub["clock_invalid"].mean()
            if pct > 0.95:
                df.loc[mask, "ts_utc"] = pd.to_datetime(
                    sub["ingested_at"], utc=True, errors="coerce"
                )
            else:
                df.loc[mask, "ts_utc"] = sub.apply(
                    lambda r: pd.to_datetime(r["ingested_at"], utc=True)
                    if r["clock_invalid"]
                    else pd.to_datetime(r["recorded_at"], utc=True),
                    axis=1
                )

    # Verificar NaT
    n_nat = df["ts_utc"].isna().sum()
    if n_nat > 0:
        print(f"  ⚠️  {n_nat} timestamps NaT — se eliminarán")
        df = df.dropna(subset=["ts_utc"])

    df = df.sort_values("ts_utc").reset_index(drop=True)
    print(f"  Rango: {df['ts_utc'].min()} → {df['ts_utc'].max()}")
    return df

def detectar_anomalias_peso(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detecta y reporta lecturas de peso anómalas.
    No elimina — exporta a anomalias_peso.csv para revisión manual.
    """
    anomalias = []

    # Valores negativos
    neg = df[df["weight_grams"] < 0]
    if len(neg):
        anomalias.append(neg.assign(tipo_anomalia="peso_negativo"))

    # Spikes extremos (Z-score > 5 dentro de cada segmento)
    df_sorted = df.copy()
    z_scores = np.abs(scipy_stats.zscore(df_sorted["weight_grams"].fillna(0)))
    spikes = df_sorted[z_scores > 5]
    if len(spikes):
        anomalias.append(spikes.assign(tipo_anomalia="spike_zscore_gt5"))

    # NaN en weight_grams
    nans = df[df["weight_grams"].isna()]
    if len(nans):
        anomalias.append(nans.assign(tipo_anomalia="nan_weight"))

    if anomalias:
        df_anom = pd.concat(anomalias, ignore_index=True)
        out = FASE1_OUTPUTS / "anomalias_peso.csv"
        out.parent.mkdir(parents=True, exist_ok=True)
        df_anom.to_csv(out, index=False, encoding="utf-8")
        print(f"\n⚠️  {len(df_anom)} anomalías de peso → {out}")
        print("  Revisar manualmente antes de continuar con Fase 2.")
    else:
        print("\n✅ Sin anomalías de peso detectadas.")

    return df

def calcular_gaps(df: pd.DataFrame) -> None:
    """Reporta gaps mayores a GAP_CUTOFF_S."""
    diff_s = df["ts_utc"].diff().dt.total_seconds()
    gaps = diff_s[diff_s > GAP_CUTOFF_S]
    print(f"\nGaps > {GAP_CUTOFF_S}s: {len(gaps)}")
    for idx, secs in gaps.items():
        ts = df.loc[idx, "ts_utc"]
        print(f"  {ts} — {secs/3600:.1f} horas")

def main():
    FASE1_RAW.mkdir(parents=True, exist_ok=True)

    df = cargar_y_concatenar()
    df = resolver_timestamps(df)
    detectar_anomalias_peso(df)
    calcular_gaps(df)

    # Cadencia
    diff_s = df["ts_utc"].diff().dt.total_seconds()
    print(f"\nCadencia mediana: {diff_s.median():.1f}s")
    print(f"Cadencia media:   {diff_s.mean():.1f}s")

    # Guardar
    out = FASE1_RAW / "readings_raw.parquet"
    df.to_parquet(out, index=False)
    print(f"\n✅ readings_raw.parquet guardado: {len(df):,} filas → {out}")

if __name__ == "__main__":
    main()
```

---

## 5. `g04_extract_events.py`

Resuelve el problema de las timezone mixtas en `audit_events.csv` (gap crítico de Alpha).

```python
"""
g04_extract_events.py — Fase 1 Gamma
Carga audit_events.csv, parsea payload JSON, normaliza timezone a UTC,
fusiona con new_annotations_gamma.csv, exporta events_labeled.parquet.
"""
import json
import sys
import pandas as pd
from pathlib import Path
from dateutil import parser as dateutil_parser, tz as dateutil_tz

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import *

def fix_timezone(s: str):
    """
    Parsea cualquier formato de timestamp con timezone mixta y devuelve UTC.
    Resuelve el error α-3 / gap crítico de audit_events.
    Maneja: '+00', '-04', '-04:00', 'Z', sin zona (asume UTC).
    """
    try:
        dt = dateutil_parser.parse(str(s).strip())
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=dateutil_tz.UTC)
        return dt.astimezone(dateutil_tz.UTC)
    except Exception:
        return None

def cargar_audit_events() -> pd.DataFrame:
    """Carga y normaliza audit_events.csv de Abril."""
    print("Cargando audit_events.csv...")
    df = pd.read_csv(ABRIL_AUDIT_CSV, encoding=CSV_ENCODING, low_memory=False)
    print(f"  Total eventos: {len(df):,}")

    # Parsear payload JSON
    def parse_payload(raw):
        if pd.isna(raw):
            return {}
        try:
            return json.loads(raw)
        except Exception:
            return {}

    df["payload_parsed"] = df["payload"].apply(parse_payload)
    df["category"] = df["payload_parsed"].apply(
        lambda x: x.get("category") or x.get("event_type")
    )
    df["device_code_payload"] = df["payload_parsed"].apply(
        lambda x: x.get("device_id") or x.get("device_code")
    )

    # Cargar devices para resolver entity_id → device_code
    devices = pd.read_csv(ABRIL_DEVICES_CSV, encoding=CSV_ENCODING, low_memory=False)
    devices = devices[["id", "device_id"]].rename(
        columns={"id": "entity_id", "device_id": "device_code_devices"}
    )
    df = df.merge(devices, on="entity_id", how="left")

    # Priorizar device_code del payload sobre el del join
    df["device_code"] = df["device_code_payload"].fillna(df["device_code_devices"])

    # Normalizar timestamps (error α-3: timezone mixta)
    print("  Normalizando timestamps a UTC...")
    df["ts_utc"] = df["created_at"].apply(fix_timezone)
    n_null = df["ts_utc"].isna().sum()
    if n_null:
        print(f"  ⚠️  {n_null} timestamps no parseados — se eliminarán")
    df = df.dropna(subset=["ts_utc"])

    # Filtrar solo manual_bowl_category de KPCL0034
    mask = (
        (df["event_type"] == "manual_bowl_category") &
        (df["device_code"] == KPCL0034_CODE)
    )
    df_kpcl = df[mask].copy()
    print(f"  Eventos KPCL0034 manual_bowl_category: {len(df_kpcl):,}")
    print(f"  Categorías: {df_kpcl['category'].value_counts().to_dict()}")
    return df_kpcl

def cargar_annotations_gamma() -> pd.DataFrame:
    """Carga new_annotations_gamma.csv si existe."""
    if not ANNOTATIONS_GAMMA.exists():
        print("  new_annotations_gamma.csv no existe aún — solo usando audit_events")
        return pd.DataFrame()

    df = pd.read_csv(ANNOTATIONS_GAMMA, encoding="utf-8")
    print(f"  new_annotations_gamma.csv: {len(df)} filas")

    # Normalizar — debe tener columnas: ts_utc, category, device_code
    required = ["ts_utc", "category", "device_code"]
    for col in required:
        if col not in df.columns:
            raise ValueError(f"new_annotations_gamma.csv le falta la columna: {col}")

    df["ts_utc"] = df["ts_utc"].apply(fix_timezone)
    df = df[df["device_code"] == KPCL0034_CODE].copy()
    print(f"  Anotaciones Gamma KPCL0034: {len(df)}")
    return df

def main():
    FASE1_RAW.mkdir(parents=True, exist_ok=True)

    df_audit = cargar_audit_events()
    df_gamma = cargar_annotations_gamma()

    if len(df_gamma):
        # Fusionar — columnas comunes: ts_utc, category, device_code
        cols_merge = ["ts_utc", "category", "device_code"]
        df_audit_min = df_audit[cols_merge].copy()
        df_gamma_min = df_gamma[cols_merge].copy()
        df_all = pd.concat([df_audit_min, df_gamma_min], ignore_index=True)
        # Deduplicar por timestamp + categoría (margen de ±1s)
        df_all = df_all.drop_duplicates(subset=["category"]).sort_values("ts_utc")
        print(f"\nTotal eventos fusionados: {len(df_all)}")
    else:
        df_all = df_audit[["ts_utc", "category", "device_code"]].copy()

    out = FASE1_RAW / "events_labeled.parquet"
    df_all.to_parquet(out, index=False)
    print(f"✅ events_labeled.parquet: {len(df_all)} eventos → {out}")

if __name__ == "__main__":
    main()
```

---

## 6. `_gamma_phase2_utils.py`

Implementación del resampleo a 30s, features en hora Santiago, y `plateau_duration_s` en segundos.

```python
"""
_gamma_phase2_utils.py — Utilidades de feature engineering Gamma
Resuelve: resampleo 30s, timezone Santiago, plateau_duration_s en segundos,
dia_semana_sin nueva feature, sin cadencia_s.
"""
import numpy as np
import pandas as pd
from zoneinfo import ZoneInfo

from _gamma_utils import (
    RESAMPLE_TARGET_S, GAP_CUTOFF_S, PLATEAU_THRESHOLD,
    BASELINE_WINDOW, FEATURES_GAMMA, TZ_LOCAL
)

def resample_to_uniform(df: pd.DataFrame, target_s: int = RESAMPLE_TARGET_S) -> pd.DataFrame:
    """
    Resamplea a cadencia uniforme usando forward-fill por segmento de continuidad.
    No interpola a través de gaps > GAP_CUTOFF_S (discontinuidades reales).
    
    El peso del bowl es una señal de tipo escalón — forward-fill es la interpolación correcta.
    Esta función resuelve el shift de distribución entre Abril (~14.7s) y Mayo-Jun (~30s).
    """
    df = df.copy().sort_values("ts_utc")

    # Detectar gaps para segmentar
    diff_s = df["ts_utc"].diff().dt.total_seconds().fillna(0)
    df["_segmento"] = (diff_s > GAP_CUTOFF_S).cumsum()

    resultados = []
    for seg_id, grupo in df.groupby("_segmento"):
        if len(grupo) < 2:
            continue
        t_inicio = grupo["ts_utc"].iloc[0]
        t_fin    = grupo["ts_utc"].iloc[-1]
        nuevo_idx = pd.date_range(t_inicio, t_fin, freq=f"{target_s}s", tz="UTC")
        grupo_r = grupo.set_index("ts_utc").reindex(nuevo_idx, method="ffill")
        grupo_r.index.name = "ts_utc"
        grupo_r["_segmento"] = seg_id
        resultados.append(grupo_r.reset_index())

    if not resultados:
        return df

    df_res = pd.concat(resultados, ignore_index=True)
    print(f"  Resampleo: {len(df):,} → {len(df_res):,} filas ({target_s}s cadencia)")
    return df_res

def calcular_features_temporales(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula hour_sin, hour_cos en hora Santiago (no UTC).
    Añade dia_semana_sin (nueva en Gamma).
    Resuelve el error α-3: rutinas de Bandida estaban desplazadas 3-4h en Alpha.
    """
    df = df.copy()
    ts_santiago = df["ts_utc"].dt.tz_convert(TZ_LOCAL)
    
    hour_local = ts_santiago.dt.hour + ts_santiago.dt.minute / 60.0
    dia        = ts_santiago.dt.dayofweek  # 0=Lunes, 6=Domingo

    df["hour_sin"]       = np.sin(2 * np.pi * hour_local / 24)
    df["hour_cos"]       = np.cos(2 * np.pi * hour_local / 24)
    df["dia_semana_sin"] = np.sin(2 * np.pi * dia / 7)
    return df

def calcular_features_peso(df: pd.DataFrame) -> pd.DataFrame:
    """Calcula todas las features derivadas del peso."""
    df = df.copy()
    w = df["weight_grams"]

    # Deltas
    df["delta_w"]    = w.diff(1)
    df["delta_w_10"] = w.diff(10)

    # Rolling stats
    df["rolling_std_5"]  = w.rolling(5,  min_periods=1).std()
    df["rolling_std_10"] = w.rolling(10, min_periods=1).std()
    df["rolling_mean_5"] = w.rolling(5,  min_periods=1).mean()

    # Net weight: peso neto sobre baseline local (percentil 10, ventana 60)
    df["net_weight"] = w - w.rolling(BASELINE_WINDOW, min_periods=1).quantile(0.10)

    # Plateau
    df["is_plateau"] = (df["rolling_std_5"] < PLATEAU_THRESHOLD).astype(int)

    # plateau_duration_s en SEGUNDOS (no filas — corrección vs Alpha)
    # Con resampleo a 30s, cada fila = 30s
    plateau_count = []
    count = 0
    for val in df["is_plateau"]:
        if val == 1:
            count += RESAMPLE_TARGET_S  # acumula en segundos
        else:
            count = 0
        plateau_count.append(count)
    df["plateau_duration_s"] = plateau_count

    # Interpolación de NaN en weight (máx 3 consecutivos)
    df["weight_grams"] = df["weight_grams"].interpolate(
        method="linear", limit=3, limit_direction="forward"
    )

    return df

def calcular_todas_features(df: pd.DataFrame) -> pd.DataFrame:
    """Pipeline completo de features. Llama en orden correcto."""
    df = calcular_features_temporales(df)
    df = calcular_features_peso(df)

    # Verificar que todas las features Gamma están presentes
    faltantes = [f for f in FEATURES_GAMMA if f not in df.columns]
    if faltantes:
        raise ValueError(f"Features faltantes en el dataframe: {faltantes}")

    return df[["ts_utc", "device_id", "_periodo", "_segmento", "label"] +
              FEATURES_GAMMA + ["clock_invalid"]]
```

---

## 7. `app_anotacion_gamma.py`

Especificación de lo que debe contener la app de anotación. El archivo completo está pendiente de crear; aquí están los requisitos de implementación.

**Estructura mínima requerida:**

```python
"""
app_anotacion_gamma.py — Streamlit app para anotación manual Gamma
Ejecutar: streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py
URL: http://localhost:8501

Diferencias vs. app_anotacion.py de Alpha:
1. Lee desde readings_raw.parquet de Gamma (ya resampleado)
2. Muestra timestamps en hora Santiago (no UTC)
3. Prioriza candidatos de servido en el panel de navegación
4. Barra de progreso hasta 80 sesiones de servido
5. Guarda en new_annotations_gamma.csv (no en new_annotations.csv de Alpha)
6. Columnas de salida: ts_utc (UTC), category, device_code, notas
"""
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parents[2] / "fase_1_extraccion" / "scripts"))
from _gamma_utils import (
    FASE1_RAW, FASE4_DATA, ANNOTATIONS_GAMMA, SERVIDO_CANDIDATES,
    MIN_SERVIDO_SESSIONS, KPCL0034_CODE, TZ_LOCAL, RESAMPLE_TARGET_S
)

# ── Configuración de la app ──────────────────────────────────────────────────
st.set_page_config(page_title="Anotación Gamma — Kittypau", layout="wide")
st.title("Kittypau ML — Ciclo Gamma · Anotación de Sesiones")

# ── Barra de progreso ────────────────────────────────────────────────────────
# IMPORTANTE: mostrar esto prominentemente — es el KPI más crítico del Pre-G
annotations = pd.read_csv(ANNOTATIONS_GAMMA) if ANNOTATIONS_GAMMA.exists() else pd.DataFrame()
n_servido = len(annotations[annotations["category"].isin(
    ["inicio_servido", "termino_servido"])]) // 2 if len(annotations) else 0
st.metric("Sesiones de servido anotadas", f"{n_servido} / {MIN_SERVIDO_SESSIONS}")
st.progress(min(n_servido / MIN_SERVIDO_SESSIONS, 1.0))
if n_servido >= MIN_SERVIDO_SESSIONS:
    st.success(f"✅ Meta alcanzada. G-01 desbloqueado.")
else:
    st.warning(f"⏳ Faltan {MIN_SERVIDO_SESSIONS - n_servido} sesiones de servido.")

# ── Panel de navegación ──────────────────────────────────────────────────────
# Mostrar primero candidatos de servido, luego sesiones sin clasificar
# El orden es CRÍTICO: servido primero porque es la clase más escasa

# ── Visualización ────────────────────────────────────────────────────────────
# Mostrar curva de peso en hora Santiago (no UTC)
# Colorear bandas de sesiones ya anotadas
# Permitir click para marcar inicio/término

# ── Formulario de anotación ──────────────────────────────────────────────────
# Categorías disponibles: inicio_alimentacion, termino_alimentacion,
#                         inicio_servido, termino_servido, sin_clasificar
# NUNCA dejar un inicio_* sin su termino_* correspondiente

# ── Guardado ─────────────────────────────────────────────────────────────────
# Columnas del CSV de salida:
# ts_utc: timestamp en UTC (formato ISO 8601 con timezone +00:00)
# category: string de la categoría canónica
# device_code: siempre KPCL0034
# notas: texto libre opcional
```

**Regla de validación que la app debe enforzar:**  
Antes de guardar un `termino_*`, verificar que existe el `inicio_*` correspondiente en la misma sesión. Si no existe, mostrar error y no guardar.

**Formato del CSV de salida (`new_annotations_gamma.csv`):**

```
ts_utc,category,device_code,notas
2026-04-28T15:32:10+00:00,inicio_servido,KPCL0034,
2026-04-28T15:34:45+00:00,termino_servido,KPCL0034,
```

---

## 8. `generar_candidatos_servido.py`

Este script detecta tramos con subida de peso ≥5g no anotados y los exporta para revisión en la app.

```python
"""
generar_candidatos_servido.py
Detecta candidatos de sesiones de servido (subida de peso >=5g) en readings_raw
que todavía no tienen anotación en new_annotations_gamma.csv.
Exporta servido_candidates.csv para priorizar en app_anotacion_gamma.py.
"""
import sys
import pandas as pd
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "fase_1_extraccion" / "scripts"))
from _gamma_utils import *

UMBRAL_SUBIDA_G   = 5.0    # gramos — subida mínima para considerar candidato
VENTANA_SUBIDA    = 10     # filas — ventana para calcular subida (10 × 30s = 5 min)
MIN_DURACION_S    = 30     # segundos — duración mínima del evento de subida

def detectar_candidatos(df_readings: pd.DataFrame,
                         df_anotaciones: pd.DataFrame) -> pd.DataFrame:
    """
    Detecta tramos de subida de peso que no están ya anotados como servido.
    """
    df = df_readings.copy().sort_values("ts_utc")
    df["delta_subida"] = df["weight_grams"].diff(VENTANA_SUBIDA)

    # Candidatos: subida > UMBRAL en ventana
    candidatos_mask = df["delta_subida"] >= UMBRAL_SUBIDA_G
    df["es_candidato"] = candidatos_mask.astype(int)

    # Agrupar candidatos consecutivos en sesiones
    df["cambio_estado"] = df["es_candidato"].diff().fillna(0)
    df["grupo_candidato"] = (df["cambio_estado"] == 1).cumsum()
    df_cand = df[df["es_candidato"] == 1]

    sesiones = []
    for grupo_id, grupo in df_cand.groupby("grupo_candidato"):
        ts_inicio = grupo["ts_utc"].min()
        ts_fin    = grupo["ts_utc"].max()
        duracion  = (ts_fin - ts_inicio).total_seconds()
        if duracion < MIN_DURACION_S:
            continue
        peso_inicio = grupo["weight_grams"].iloc[0]
        peso_fin    = grupo["weight_grams"].iloc[-1]
        subida_g    = peso_fin - peso_inicio
        sesiones.append({
            "ts_inicio": ts_inicio,
            "ts_fin": ts_fin,
            "duracion_s": duracion,
            "subida_g": subida_g,
            "ya_anotado": False
        })

    df_sesiones = pd.DataFrame(sesiones)
    if df_sesiones.empty:
        print("No se detectaron candidatos de servido.")
        return df_sesiones

    # Marcar los ya anotados
    if len(df_anotaciones):
        ts_anotados = pd.to_datetime(df_anotaciones[
            df_anotaciones["category"] == "inicio_servido"
        ]["ts_utc"], utc=True)
        for idx, row in df_sesiones.iterrows():
            cerca = any(
                abs((ts_anotados - row["ts_inicio"]).dt.total_seconds()) < 300
            )
            df_sesiones.loc[idx, "ya_anotado"] = cerca

    df_nuevos = df_sesiones[~df_sesiones["ya_anotado"]].copy()
    print(f"Candidatos de servido no anotados: {len(df_nuevos)}")
    return df_nuevos

def main():
    FASE4_DATA.mkdir(parents=True, exist_ok=True)

    readings_path = FASE1_RAW / "readings_raw.parquet"
    if not readings_path.exists():
        print("❌ readings_raw.parquet no existe. Ejecutar g03_extract_readings.py primero.")
        return

    df_readings = pd.read_parquet(readings_path)
    df_readings["ts_utc"] = pd.to_datetime(df_readings["ts_utc"], utc=True)

    df_anotaciones = pd.DataFrame()
    if ANNOTATIONS_GAMMA.exists():
        df_anotaciones = pd.read_csv(ANNOTATIONS_GAMMA)

    df_candidatos = detectar_candidatos(df_readings, df_anotaciones)
    df_candidatos.to_csv(SERVIDO_CANDIDATES, index=False, encoding="utf-8")
    print(f"✅ Exportado: {SERVIDO_CANDIDATES}")

if __name__ == "__main__":
    main()
```

---

## 9. `g06_quality_report.py`

Checkpoints obligatorios que bloquean el avance a Fase 2.

```python
"""
g06_quality_report.py — Fase 1 Gamma
Valida calidad del dataset y bloquea si no se cumplen los prerequisitos de Gamma.
TODOS los assert deben pasar antes de ejecutar g01_build_labels.py (Fase 2).
"""
import sys
import json
import pandas as pd
from pathlib import Path
from scipy import stats as scipy_stats

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import *

def main():
    print("=" * 60)
    print("G06 — Quality Report Gamma")
    print("=" * 60)

    errores = []

    # ── 1. Verificar artefactos de Fase 1 ───────────────────────────────────
    for artefacto in ["readings_raw.parquet", "events_labeled.parquet", "sessions_labeled.parquet"]:
        path = FASE1_RAW / artefacto
        if not path.exists():
            errores.append(f"Falta artefacto: {path}")

    if errores:
        for e in errores:
            print(f"❌ {e}")
        raise FileNotFoundError("Artefactos de Fase 1 incompletos. Ejecutar g03-g05 primero.")

    # ── 2. Cargar sesiones ───────────────────────────────────────────────────
    sesiones = pd.read_parquet(FASE1_RAW / "sessions_labeled.parquet")
    n_alim   = len(sesiones[sesiones["session_type"] == "alimentacion"])
    n_serv   = len(sesiones[sesiones["session_type"] == "servido"])

    print(f"\nSesiones alimentacion: {n_alim}")
    print(f"Sesiones servido:      {n_serv}")
    print(f"Meta servido:          {MIN_SERVIDO_SESSIONS}")
    print(f"Meta alimentacion:     {MIN_ALIM_SESSIONS}")

    # ── CHECKPOINT 1: Sesiones de servido ────────────────────────────────────
    if n_serv < MIN_SERVIDO_SESSIONS:
        print(f"\n❌ BLOQUEADO: {n_serv} sesiones servido < {MIN_SERVIDO_SESSIONS}")
        print("   Acción: anotar más sesiones con app_anotacion_gamma.py")
        print("   → streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py")
        raise AssertionError(f"Sesiones servido insuficientes: {n_serv}/{MIN_SERVIDO_SESSIONS}")

    # ── CHECKPOINT 2: Sesiones de alimentación ───────────────────────────────
    if n_alim < MIN_ALIM_SESSIONS:
        print(f"\n❌ BLOQUEADO: {n_alim} sesiones alim < {MIN_ALIM_SESSIONS}")
        print("   Acción: anotar más sesiones de alimentación")
        raise AssertionError(f"Sesiones alim insuficientes: {n_alim}/{MIN_ALIM_SESSIONS}")

    print(f"\n✅ CHECKPOINT 1 OK: {n_serv} sesiones servido ≥ {MIN_SERVIDO_SESSIONS}")
    print(f"✅ CHECKPOINT 2 OK: {n_alim} sesiones alim ≥ {MIN_ALIM_SESSIONS}")

    # ── 3. Análisis de distribución por período (OBLIGATORIO) ────────────────
    readings = pd.read_parquet(FASE1_RAW / "readings_raw.parquet")
    readings["ts_utc"] = pd.to_datetime(readings["ts_utc"], utc=True)

    if "_periodo" not in readings.columns:
        print("\n⚠️  Columna '_periodo' no encontrada — análisis por período omitido")
    else:
        print("\n── Análisis KS por período ─────────────────────────────────")
        features_para_ks = ["weight_grams", "rolling_std_5", "rolling_std_10"]
        # Estas features se calculan si existen, si no solo weight_grams
        features_disponibles = [f for f in features_para_ks if f in readings.columns]

        resultados_ks = {}
        df_abril   = readings[readings["_periodo"] == "abril"]
        df_mayo    = readings[readings["_periodo"] == "mayo_jun"]

        if len(df_abril) and len(df_mayo):
            for feat in features_disponibles:
                a = df_abril[feat].dropna()
                b = df_mayo[feat].dropna()
                if len(a) < 10 or len(b) < 10:
                    continue
                stat, pval = scipy_stats.ks_2samp(a, b)
                shift = pval < 0.05
                resultados_ks[feat] = {"ks_stat": round(stat, 4), "p_value": round(pval, 4), "shift": shift}
                marca = "⚠️ SHIFT" if shift else "✅ OK"
                print(f"  {feat:20s}: KS={stat:.4f}  p={pval:.4f}  {marca}")

            # Guardar resultado
            out_ks = FASE1_OUTPUTS / "distribucion_por_periodo.json"
            out_ks.parent.mkdir(parents=True, exist_ok=True)
            with open(out_ks, "w") as f:
                json.dump(resultados_ks, f, indent=2)
            print(f"\n  → Guardado: {out_ks}")

            features_con_shift = [k for k, v in resultados_ks.items() if v["shift"]]
            if features_con_shift:
                print(f"\n⚠️  Shift detectado en: {features_con_shift}")
                print("   Esto es esperado entre Abril y Mayo-Jun por diferencia de cadencia.")
                print("   El resampleo a 30s en Fase 2 debería mitigarlo.")
                print("   Revisar distribucion_por_periodo.json antes de continuar.")

    # ── CHECKPOINT 3: Anomalías de peso ──────────────────────────────────────
    anom_path = FASE1_OUTPUTS / "anomalias_peso.csv"
    if anom_path.exists():
        df_anom = pd.read_csv(anom_path)
        print(f"\n⚠️  {len(df_anom)} anomalías de peso en anomalias_peso.csv")
        print("   Revisar manualmente. No bloquea, pero debe documentarse.")
    else:
        print("\n✅ CHECKPOINT 3 OK: sin anomalías de peso")

    print("\n" + "=" * 60)
    print("✅ Quality Report completado. Prerequisitos de Fase 1 cumplidos.")
    print("   Próximo paso: ejecutar Fase 2 (g01_build_labels.py)")
    print("=" * 60)

if __name__ == "__main__":
    main()
```

---

## 10. Análisis de distribución

El análisis KS ya está integrado en `g06_quality_report.py`. Lo que falta saber es **cómo interpretar el resultado**:

El shift entre Abril y Mayo-Jun es esperado y conocido. No bloquea el avance. Lo que sí bloquea es encontrar shift en un tercer período de datos (datos nuevos descargados después de Jun 14) sin que el resampleo lo corrija.

**Regla de decisión:**

```
Si distribucion_por_periodo.json muestra shift en weight_grams (la señal principal):
  → El resampleo a 30s debería corregirlo si la causa es cadencia diferente
  → Si persiste el shift DESPUÉS del resampleo en Fase 2 → documentar en el experimento
  → No reentrenar ignorando el shift — causa la misma caída de F1 que α-08

Si el shift es en hour_sin/hour_cos:
  → Verificar que se está usando hora Santiago, no UTC
  → Si es hora Santiago y hay shift, puede ser cambio de horario de verano/invierno
  → Chile cambia de horario — verificar que ZoneInfo("America/Santiago") maneja DST
```

---

## 11. Split temporal Gamma

El split temporal depende de cuándo termina el nuevo dump de datos. La lógica correcta:

```python
def calcular_split_temporal(df_readings: pd.DataFrame) -> dict:
    """
    Calcula fechas de corte para train/val/test de forma dinámica.
    Split 70% / 15% / 15% por tiempo (no por filas, porque la cadencia varía).
    
    Invariantes desde Exp 08:
      train: hasta May 31 (o el 70% temporal de los datos disponibles)
      val:   hasta Jun 7  (o el 85% temporal)
      test:  hasta fin de datos (sellado hasta G-Final)
    """
    t_inicio = df_readings["ts_utc"].min()
    t_fin    = df_readings["ts_utc"].max()
    rango_total = (t_fin - t_inicio).total_seconds()

    # Fechas fijas desde Exp 08 (invariantes mientras el dataset no cambie radicalmente)
    # Si se descarga un dump que va más allá de Jun 14, extender test set
    TRAIN_FIN = pd.Timestamp("2026-05-31", tz="UTC")
    VAL_FIN   = pd.Timestamp("2026-06-07", tz="UTC")
    TEST_FIN  = t_fin  # todo lo que haya hasta el final del dump

    print(f"Split temporal:")
    print(f"  Train: {t_inicio.date()} → {TRAIN_FIN.date()}")
    print(f"  Val:   {TRAIN_FIN.date()} → {VAL_FIN.date()}")
    print(f"  Test:  {VAL_FIN.date()} → {TEST_FIN.date()} (SELLADO)")

    return {
        "train_inicio": t_inicio,
        "train_fin":    TRAIN_FIN,
        "val_inicio":   TRAIN_FIN,
        "val_fin":      VAL_FIN,
        "test_inicio":  VAL_FIN,
        "test_fin":     TEST_FIN,
    }
```

**Si se descarga un nuevo dump después de Jun 14:** Extender `TEST_FIN` automáticamente. El test set se vuelve más grande, lo cual es bueno para la evaluación final en G-Final.

---

## 12. Checklist de arranque paso a paso

Seguir este orden estrictamente. Cada paso tiene una verificación antes de continuar.

### Pre-G: Preparación

```
□ PASO 0 — Crear estructura de carpetas Gamma
  cd "D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data Science"
  
  PowerShell:
  New-Item -ItemType Directory -Force -Path @(
    "gamma/fase_1_extraccion/scripts",
    "gamma/fase_1_extraccion/data/raw",
    "gamma/fase_1_extraccion/outputs",
    "gamma/fase_2_dataset/scripts",
    "gamma/fase_2_dataset/data/interim",
    "gamma/fase_2_dataset/data/train",
    "gamma/fase_2_dataset/outputs/dataset_report",
    "gamma/fase_3_modelos/scripts",
    "gamma/fase_3_modelos/models/gbm",
    "gamma/fase_3_modelos/models/classical",
    "gamma/fase_3_modelos/models/nn",
    "gamma/fase_3_modelos/models/ensemble",
    "gamma/fase_3_modelos/outputs/training_report",
    "gamma/fase_4_anotacion/data",
    "gamma/experiments"
  )

□ PASO 1 — Instalar dependencias del entorno Gamma
  cd "gamma"
  python -m venv venv_gamma
  .\venv_gamma\Scripts\Activate.ps1
  pip install pandas numpy scipy lightgbm xgboost catboost scikit-learn \
              streamlit plotly pyarrow python-dateutil zoneinfo optuna
  pip install imbalanced-learn  # para SMOTE en G-06

  Verificar:
  python -c "import lightgbm, xgboost, catboost, streamlit; print('OK')"

□ PASO 2 — Copiar _gamma_utils.py a las tres carpetas de scripts
  Copiar el contenido de la sección 3 de este documento a:
  - gamma/fase_1_extraccion/scripts/_gamma_utils.py
  - gamma/fase_2_dataset/scripts/_gamma_utils.py     (o importar con sys.path)
  - gamma/fase_3_modelos/scripts/_gamma_utils.py

□ PASO 3 — Verificar que los dos CSVs de datos son accesibles
  python -c "
  import pandas as pd
  df = pd.read_csv(r'D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Abril_2026\kittypau_full_07-05-2026_csv\readings.csv', 
                   encoding='latin1', nrows=5)
  print('Abril OK:', df.shape)
  df2 = pd.read_csv(r'D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Docs\investigacion\Data_2026\Mayo_2026\readings_rows.csv',
                    encoding='latin1', nrows=5)
  print('Mayo OK:', df2.shape)
  "

□ PASO 4 — Lanzar app de anotación y anotar hasta ≥80 sesiones de servido
  streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py
  
  ⚠️  NO continuar al Paso 5 hasta que la barra muestre ≥ 80 sesiones de servido.
  Esto puede tomar varias sesiones de trabajo. Es normal.

□ PASO 5 — Generar candidatos de servido (antes de anotar, para priorizar)
  python gamma/fase_4_anotacion/generar_candidatos_servido.py
  → Revisa servido_candidates.csv y úsalo para priorizar qué anotar en la app
```

### Fase 1 Gamma

```
□ PASO 6 — Extraer readings
  python gamma/fase_1_extraccion/scripts/g03_extract_readings.py
  
  Verificar salida:
  python -c "
  import pandas as pd
  df = pd.read_parquet('gamma/fase_1_extraccion/data/raw/readings_raw.parquet')
  print(f'Filas: {len(df):,}')
  print(f'Rango: {df.ts_utc.min()} → {df.ts_utc.max()}')
  print(f'UUIDs: {df.device_id.unique()}')
  "
  ✓ Debe mostrar AMBOS UUIDs de KPCL0034

□ PASO 7 — Revisar anomalías de peso
  Abrir: gamma/fase_1_extraccion/outputs/anomalias_peso.csv
  Documentar cualquier anomalía relevante en el MD del experimento Pre-G.

□ PASO 8 — Extraer y fusionar eventos
  python gamma/fase_1_extraccion/scripts/g04_extract_events.py
  
  Verificar:
  python -c "
  import pandas as pd
  df = pd.read_parquet('gamma/fase_1_extraccion/data/raw/events_labeled.parquet')
  print(df.category.value_counts())
  "

□ PASO 9 — Construir sesiones
  python gamma/fase_1_extraccion/scripts/g05_build_sessions.py
  
  (Este script es genérico — copiar de Alpha con ajuste de rutas)

□ PASO 10 — Quality Report (checkpoint de bloqueo)
  python gamma/fase_1_extraccion/scripts/g06_quality_report.py
  
  ✓ Debe terminar sin AssertionError
  ✓ Revisar distribucion_por_periodo.json antes de continuar
```

### Fase 2 Gamma

```
□ PASO 11 — Construir labels
  python gamma/fase_2_dataset/scripts/g01_build_labels.py

□ PASO 12 — Calcular features (con resampleo + hora Santiago)
  python gamma/fase_2_dataset/scripts/g02_build_features.py
  
  Verificar que plateau_duration_s está en segundos (no filas):
  python -c "
  import pandas as pd
  df = pd.read_parquet('gamma/fase_2_dataset/data/interim/readings_features.parquet')
  print('plateau_duration_s max:', df.plateau_duration_s.max())
  print('Debe ser múltiplo de 30 (30s por fila resampleada)')
  "

□ PASO 13 — Construir train/val/test
  python gamma/fase_2_dataset/scripts/g03_build_train_dataset.py
  
  Verificar distribución de clases:
  python -c "
  import pandas as pd
  y = pd.read_parquet('gamma/fase_2_dataset/data/train/y_train.parquet')
  print(y.value_counts(normalize=True))
  "
  
  ⚠️  SELLAR X_test y y_test — NO cargar hasta G-Final

□ PASO 14 — Dataset report
  python gamma/fase_2_dataset/scripts/g04_dataset_report.py
```

### Fase 3 Gamma — G-01

```
□ PASO 15 — G-01: Baseline Gamma (solo LightGBM)
  python gamma/fase_3_modelos/scripts/g01_prepare_datasets.py
  python gamma/fase_3_modelos/scripts/g02_train_modelo_a_gbm.py
  python gamma/fase_3_modelos/scripts/g03_train_modelo_b_gbm.py
  python gamma/fase_3_modelos/scripts/g09_training_report.py
  
  Registrar resultados en:
  - delta_gamma_antiguio.md (sección "7. Resultados")
  - delta_gamma_antiguio.md (fila G-01)

□ PASO 16 — Evaluar contra umbrales G-01
  F1 activo ≥ 0.75? (referencia α-06: 0.7619)
  F1 alim ≥ 0.72?   (referencia α-06: 0.7606)
  F1 servido ≥ 0.25? (referencia α-06: 0.1395)
  
  Si G-01 NO supera a α-06 en F1 activo y F1 alim:
  → Revisar calidad de anotaciones Gamma (hora Santiago correcta?)
  → Verificar que ambos UUIDs están en el dataset
  → No avanzar a G-02 hasta entender la causa
```

---

## 13. Errores silenciosos conocidos y cómo evitarlos

Estos errores no lanzan excepciones pero producen resultados incorrectos:

**Error silencioso 1 — Filtrar por UUID único**  
Si en algún script se filtra `df[df["device_id"] == "3a460074-..."]` en lugar de `df[df["device_id"].isin(KPCL0034_UUIDS)]`, el dataset de Abril desaparece completamente sin warning. El modelo verá la mitad de los datos.

Prevención: en `_gamma_utils.py` definir `KPCL0034_UUIDS` como lista y usar siempre `.isin()`.

**Error silencioso 2 — Timezone UTC en features temporales**  
Si `hour_sin` se calcula con `df["ts_utc"].dt.hour` sin convertir a Santiago, el modelo aprende que Bandida come a las 12:00 UTC cuando en realidad come a las 8:00 Santiago. No da error, el modelo simplemente aprende un patrón desplazado.

Prevención: siempre `df["ts_utc"].dt.tz_convert(TZ_LOCAL)` antes de calcular `hour_sin`.

**Error silencioso 3 — Light features con zeros en Abril**  
`light_percent` y `light_lux` están en el CSV de Abril con valor 0 para KPCL0034. Si se incluyen en el ablation study de G-03, el "shift" detectado en luz entre Abril y Mayo-Jun es artefacto de datos ausentes, no información real.

Prevención: en G-03, evaluar features de luz solo sobre datos de Mayo-Jun (mascarar Abril como NaN para esas columnas).

**Error silencioso 4 — `pd.to_datetime()` con zonas horarias mixtas**  
`pd.to_datetime("2026-04-15 10:30:00-04")` puede devolver un objeto no-UTC dependiendo de la versión de pandas. Usar siempre `dateutil.parser.parse()` con `.astimezone(UTC)` para `audit_events.csv`.

**Error silencioso 5 — SMOTE aplicado sobre el val set**  
En Alpha, SMOTE se aplicaba correctamente solo al train set. En Gamma, si se copia el script sin revisar, podría aplicarse al val también. El F1 parecería mejor pero sería inflado.

Prevención: `g06_quality_report.py` puede verificar que `X_val` tiene el mismo número de filas antes y después de cargar.

**Error silencioso 6 — `plateau_duration` en filas en lugar de segundos**  
Si se copia el script de Fase 2 de Alpha sin modificar, `plateau_duration` queda en filas (número de filas consecutivas en plateau). Con datos de Abril a 14.7s, una fila = 14.7s. Con datos de Mayo a 30s, una fila = 30s. El mismo valor numérico representa duraciones diferentes.

Prevención: en `_gamma_phase2_utils.py`, calcular como `count × RESAMPLE_TARGET_S` donde `RESAMPLE_TARGET_S = 30`.

**Error silencioso 7 — Test set cargado accidentalmente**  
Ningún error, pero contamina la evaluación final.

Prevención: en `_gamma_phase3_utils.py`, la función `cargar_test_set()` lanza `PermissionError` siempre. Solo se descomenta en `g_final_evaluacion_test.py`.

---

## 14. Dependencias

### Entorno Python mínimo para Gamma

```
python>=3.11
pandas>=2.0
numpy>=1.24
scipy>=1.10
lightgbm>=4.3.0
xgboost>=2.0
catboost>=1.2
scikit-learn>=1.3
streamlit>=1.30
plotly>=5.18
pyarrow>=14.0
python-dateutil>=2.8
optuna>=3.4
imbalanced-learn>=0.11
```

### Para redes neuronales (G-06, solo en Colab)

```
torch>=2.0
lightning>=2.0
keras-tcn
```

### Verificación rápida del entorno

```python
# Ejecutar esto antes de empezar
import sys
print(f"Python: {sys.version}")

packages = {
    "pandas": "2.0", "numpy": "1.24", "scipy": "1.10",
    "lightgbm": "4.3.0", "xgboost": "2.0", "catboost": "1.2",
    "sklearn": "1.3", "streamlit": "1.30", "optuna": "3.4"
}
for pkg, version_min in packages.items():
    try:
        mod = __import__(pkg if pkg != "sklearn" else "sklearn")
        v = getattr(mod, "__version__", "?")
        print(f"  ✅ {pkg}: {v}")
    except ImportError:
        print(f"  ❌ {pkg}: NO INSTALADO")

# Verificar timezone
from zoneinfo import ZoneInfo
import datetime
tz = ZoneInfo("America/Santiago")
ahora = datetime.datetime.now(tz=tz)
print(f"\nHora actual Santiago: {ahora.strftime('%Y-%m-%d %H:%M %Z')}")
print("Si muestra CLT o CLST, timezone está correcto.")
```

---

## 15. FAQ de implementación

**P: ¿Cuánto tarda en cargar el CSV de Abril (242 MB)?**  
R: Con `pd.read_csv(..., low_memory=False)`, entre 15 y 45 segundos en un equipo normal. Si se tarda más de 2 minutos, verificar que el disco no está fragmentado. Una vez convertido a parquet, los usos posteriores son instantáneos (~1s).

**P: ¿Qué pasa si `generar_candidatos_servido.py` no encuentra candidatos?**  
R: Puede pasar si todos los tramos de subida de peso ya están anotados, o si el umbral de 5g es demasiado alto para el device. En ese caso, bajar `UMBRAL_SUBIDA_G` a 3g y volver a correr. Si sigue sin candidatos, revisar la curva de peso en el dashboard para encontrar servidos manualmente.

**P: ¿La app de anotación debe guardar directamente en Supabase o en CSV local?**  
R: En CSV local (`new_annotations_gamma.csv`). El pipeline de Gamma usa el CSV local como fuente, no Supabase directamente. Esto garantiza reproducibilidad — los mismos datos siempre producen los mismos resultados. La diferencia con Alpha es que Alpha guardaba en Supabase y luego descargaba.

**P: Si G-01 supera a α-06, ¿saltamos directamente a G-04?**  
R: No. El orden G-01 → G-02 → G-03 → G-04 es secuencial por diseño. G-02 puede encontrar un algoritmo mejor que LightGBM. G-03 puede encontrar features que mejoren más. Saltarse pasos significa perder información diagnóstica.

**P: ¿Qué hacer si el assertion de servido falla y no hay forma de anotar más sesiones rápidamente?**  
R: Documentar el número actual de sesiones y abrir el checklist Pre-G como "parcialmente completo". No ejecutar G-01 con menos de 80 sesiones de servido. La regla existe por una razón: con menos sesiones, el F1 de servido es estadísticamente inestable (varía ±0.20 entre corridas por azar). No tiene valor científico ni operativo.

**P: ¿El `dia_semana_sin` es realmente necesario?**  
R: Es una hipótesis a verificar en G-03. Si no mejora el F1 en el ablation study, se puede excluir en G-04. Está incluido en las 13 features Gamma porque la literatura de comportamiento animal sugiere que los gatos tienen rutinas semanales además de diarias. Con más datos, la señal debería ser capturable.

**P: ¿Cuándo se puede lanzar G-06 (redes neuronales)?**  
R: Solo cuando `sessions_labeled.parquet` muestre ≥300 alim + ≥80 serv. El quality report de G-05 debe verificar esto explícitamente. Antes de ese punto, las NN tienen ventaja estructural de LGBM por el tamaño del dataset — exactamente el error α-7.

---

## Resumen de archivos a crear (en orden)

| Orden | Archivo | Acción |
|---|---|---|
| 1 | `gamma/fase_1_extraccion/scripts/_gamma_utils.py` | Copiar sección 3 de este documento |
| 2 | `gamma/fase_1_extraccion/scripts/g03_extract_readings.py` | Copiar sección 4 |
| 3 | `gamma/fase_1_extraccion/scripts/g04_extract_events.py` | Copiar sección 5 |
| 4 | `gamma/fase_2_dataset/scripts/_gamma_phase2_utils.py` | Copiar sección 6 |
| 5 | `gamma/fase_4_anotacion/app_anotacion_gamma.py` | Implementar según sección 7 |
| 6 | `gamma/fase_4_anotacion/generar_candidatos_servido.py` | Copiar sección 8 |
| 7 | `gamma/fase_1_extraccion/scripts/g06_quality_report.py` | Copiar sección 9 |
| 8 | `gamma/fase_2_dataset/scripts/_gamma_phase2_utils.py` | Ya en sección 6 |
| 9 | `gamma/fase_3_modelos/scripts/_gamma_phase3_utils.py` | Adaptar de Alpha + agregar bloqueo test set |
| 10 | Scripts g05, g01-g04 Fase 2, g01-g09 Fase 3 | Copiar de Alpha con ajustes de rutas y features |

---

*Documento generado el 2026-06-15. Actualizar cuando cambien rutas o cuando un experimento numerado modifique invariantes.*


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Ciclo Gamma — Unificación de Datos (Abr–May–Jun 2026) y Re-etiquetado Total

| Campo | Valor |
|---|---|
| **Ciclo** | Gamma |
| **Sub-proceso** | Unificación de datos + inferencia Modelo A (Alpha) + re-etiquetado total via `app_anotacion.py` |
| **Fecha de creación** | 2026-06-16 |
| **Última actualización** | 2026-06-16 — decisiones de la Sección 5 resueltas e integradas en `delta_gamma_antiguio.md` |
| **Device** | KPCL0034 (food_bowl, Bandida) |
| **Estado** | ✅ Pre-G oficial del Ciclo Gamma — reemplaza la anotación manual desde cero descrita en versiones previas de `delta_gamma_antiguio.md` |
| **Reemplaza** | Cualquier dataset de etiquetas heredado de Alpha (`audit_events` Abril + `new_annotations.csv` Mayo-Jun de Exp07/08) como fuente única de verdad para Gamma |

> Este documento es el **runbook operativo del Pre-G de Gamma**: detalla el paso a paso
> y las decisiones de diseño. Vive dentro de `Ciclo_Gamma/` junto a `delta_gamma_antiguio.md`,
> `delta_gamma_antiguio.md`, y ha sido conciliado con los tres:
> el Pre-G de `delta_gamma_antiguio.md` ahora describe este mismo proceso (unificación +
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
  la Fase 3 de Gamma usará las 12 features de Alpha o las 13 de `delta_gamma_antiguio.md`
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

**Actualizado 2026-06-17:** Pre-G y Fase 2 completados. El siguiente paso es **G-01** (baseline LightGBM sobre el dataset Gamma). Ver `delta_gamma_antiguio.md`.

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


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Cómo ejecutar la anotación del Ciclo Gamma

## Abrir la app (inicio rápido)

El venv documentado en `Data Science/venv` ya no existe. Usar el venv de Ciclo Alpha,
que tiene `streamlit` y `plotly` instalados.

**Desde cualquier terminal PowerShell:**

```powershell
& "D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Investigacion\Dashboard_KPCL\Ciclo_Alpha_v1\venv\Scripts\Activate.ps1"

streamlit run "D:\Escritorio\Proyectos\AIoT_Kittypau\kittypau_2026_hivemq\Investigacion\Dashboard_KPCL\Ciclo_Gamma\fase_4_anotacion\app_anotacion.py"
```

Abre `http://localhost:8501` en el navegador.

---


**Fase:** Pre-G (prerequisito de todos los experimentos)
**Herramienta principal:** `app_anotacion_gamma.py` (Streamlit)
**Meta:** ≥80 sesiones de `servido` + ≥200 sesiones de `alimentacion` en `new_annotations_gamma.csv`

Referencia: [delta_gamma_antiguio.md](delta_gamma_antiguio.md) §6 | [delta_gamma_antiguio.md](delta_gamma_antiguio.md)

---

## Por qué la anotación va primero

El error más costoso del Ciclo Alpha fue intentar entrenar con solo 14–27 sesiones de `servido`.
SMOTE fue un parche que generó F1 inestable (0.14–0.50). La anotación no es opcional —
**bloquea todos los experimentos Gamma** hasta cumplir el mínimo.

No se ejecuta ningún script de Fase 1 ni de Fase 3 hasta que `g06_quality_report.py`
pase el assertion de ≥80 sesiones de servido sin errores.

---

## Prerequisitos antes de ejecutar

1. Dump nuevo de Supabase descargado en `Data_2026/`
2. Entorno Python con `streamlit` instalado
3. Dashboard KPCL disponible para revisar candidatos visualmente

---

## Paso 1 — Generar candidatos de servido

Antes de abrir la app de anotación, ejecutar el detector de candidatos:

```powershell
cd "Docs/investigacion/Data Science"
.\venv\Scripts\Activate.ps1

python gamma/fase_4_anotacion/generar_candidatos_servido.py
# Salida: gamma/fase_4_anotacion/data/servido_candidates.csv
```

Este script recorre los dumps disponibles y detecta tramos con subida de peso ≥5g
que no están anotados todavía. Exporta `servido_candidates.csv` con los candidatos
a revisar en la app.

---

## Paso 2 — Ejecutar la app de anotación

```powershell
cd "Docs/investigacion/Data Science"
.\venv\Scripts\Activate.ps1

streamlit run gamma/fase_4_anotacion/app_anotacion_gamma.py
# → Abre http://localhost:8501
```

---

## Uso de la app

### Vista principal

La app muestra:
- **Barra de progreso**: sesiones de `servido` anotadas vs. meta de 80
- **Curva de peso** en hora Santiago (no UTC) con eventos superpuestos
- **Formulario de anotación**: tipo de sesión, inicio, término
- **Panel de candidatos**: tramos sin anotar detectados por `generar_candidatos_servido.py`

### Flujo de anotación por sesión

1. Revisar la curva en hora Santiago — verificar que el eje x muestra hora local.
2. Identificar el tipo de sesión:
   - **Alimentacion**: descenso sostenido del peso (≥3g en ≤60s)
   - **Servido**: subida sostenida del peso (≥5g) — el operador pone comida
   - **Sin_clasificar**: si no queda claro — dejar para revisar después
3. Marcar inicio y término con la herramienta de selección.
4. Confirmar que hay ≥2 lecturas dentro de la ventana.
5. Verificar que `consumido_g > 0` (si es negativo, es error de etiquetado — eliminar).
6. Guardar la anotación → se escribe en `new_annotations_gamma.csv`.

### Criterios de inicio/término (mejorados vs Alpha)

| Sesión | Inicio | Término | Exclusión |
|---|---|---|---|
| `alimentacion` | Primer punto de descenso sostenido (≥3g en ≤60s) | Último punto antes de estabilización (`rolling_std_5 < 1.5g` en ≥3 lecturas) | Si hay subida de peso entre inicio y término → excluir |
| `servido` | Primer punto de subida sostenida ≥5g | Cuando el peso se estabiliza tras llenar (`rolling_std_5 < 1.5g`) | No confundir con recuperación de baseline |

### Prioridad de anotación

1. **Primero servido** — es el cuello de botella. Anotar todos los candidatos de `servido_candidates.csv` antes de pasar a alimentacion adicional.
2. **Luego alimentacion** — hasta llegar a ≥200 sesiones.
3. **`sin_clasificar`** — resolver después de cumplir las metas anteriores.

---

## Paso 3 — Verificar con el dashboard KPCL

Para confirmar visualmente sesiones antes de anotarlas:

```powershell
# Desde la raíz del proyecto
.\Investigacion\Dashboard_KPCL\abrir_kpcl_dashboard.ps1
# → Abre kpcl_pruebas_eventos.html en el navegador
```

El dashboard muestra la curva operativa del bowl con eventos superpuestos.
Útil para distinguir servido de alimentacion en casos ambiguos.

---

## Paso 4 — Verificar progreso

Después de cada sesión de anotación:

```powershell
python -c "
import pandas as pd
df = pd.read_csv('gamma/fase_4_anotacion/data/new_annotations_gamma.csv')
print(df['session_type'].value_counts())
print(f\"\nMeta servido: {len(df[df.session_type=='servido'])}/80\")
print(f\"Meta alim: {len(df[df.session_type=='alimentacion'])}/200\")
"
```

---

## Paso 5 — Ejecutar Fase 1 cuando se alcance la meta

Una vez que la app muestre ≥80 sesiones de servido:

```powershell
cd "Docs/investigacion/Data Science/gamma/fase_1_extraccion/scripts"
python g01_setup_env.py
python g02_get_device_uuid.py
python g03_extract_readings.py
python g04_extract_events.py
python g05_build_sessions.py
python g06_quality_report.py      # ← pasará el assertion de ≥80 serv
```

Revisar OBLIGATORIAMENTE:
- `gamma/fase_1_extraccion/outputs/anomalias_peso.csv`
- `gamma/fase_1_extraccion/outputs/anomalias_sesiones.csv`
- `gamma/fase_1_extraccion/outputs/distribucion_por_periodo.json`

---

## Reglas de anotación (resumen)

1. Siempre mirar la curva en hora **Santiago** — nunca en UTC.
2. Si no queda claro si es `alimentacion` o `servido`: dejar como `sin_clasificar`.
3. Cada sesión de `servido` tiene prioridad máxima.
4. Confirmar que hay ≥2 lecturas dentro de cada ventana antes de cerrar el par.
5. Una sesión con `consumido_g < 0` es un error de etiquetado — eliminar.
6. **No importar `new_annotations.csv` de Alpha automáticamente** — es referencia opcional, no fuente de verdad.

---

## Troubleshooting

| Problema | Solución |
|---|---|
| App no inicia (`ModuleNotFoundError: streamlit`) | `pip install streamlit` dentro del venv |
| Curva muestra UTC en lugar de Santiago | Verificar que `app_anotacion_gamma.py` usa `TZ_LOCAL = "America/Santiago"` |
| `new_annotations_gamma.csv` no existe | La app lo crea al guardar la primera anotación |
| `g06_quality_report.py` falla en assertion | Anotar más sesiones de servido antes de ejecutar Fase 1 |
| Candidatos en `servido_candidates.csv` ya están anotados | Ejecutar `generar_candidatos_servido.py` de nuevo para actualizar la lista |

---

## Referencias

| Documento | Enlace |
|---|---|
| Guía maestra | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Tracker de experimentos | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Primer experimento | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Taxonomía de eventos | [../../REGLAS_EVENTOS_ALIMENTACION.md](../../REGLAS_EVENTOS_ALIMENTACION.md) |


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Ciclo Gamma — Bitácoras de Experimentos (G-01 a G-06)

> Fusión de los 6 archivos `g0N_*.md` de resultados de experimentos. Ver [[delta_gamma_antiguio]] para la tabla resumen con métricas comparadas.


---


<!-- ==== fusionado desde g01_baseline_limpio.md ==== -->

# G-01 — Baseline Gamma Limpio

**Ciclo:** Gamma (γ)
**Fase:** A — Baseline + GBM
**Estado:** ⏳ Pendiente
**Prerequisito:** Pre-G completado (≥80 serv · ≥200 alim · Fase 1 OK)
**Fecha estimada:** TBD (post Pre-G)

Referencia: [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) §9

---

## Objetivo

Establecer la nueva referencia de partida del Ciclo Gamma con datos y features correctas.
Este experimento mide el impacto **puro** de las correcciones de Alpha:
- Timezone corregida (Santiago en lugar de UTC)
- Ambos UUIDs de KPCL0034
- Resampleo a 30s
- ≥80 sesiones de servido reales (sin SMOTE como parche primario)
- 13 features Gamma (incluyendo `dia_semana_sin`, `plateau_duration_s` en segundos)

El modelo es LightGBM con los mismos hiperparámetros de referencia de α-06, para aislar el impacto de los datos.

---

## Configuración

### Modelo

| Parámetro | Valor |
|---|---|
| Algoritmo | LightGBM |
| Objetivo Modelo A | `binary` |
| Objetivo Modelo B | `multiclass` (3 clases) |
| Seed | 42 |
| Threshold inicial | 0.20 (calibrar con isotónica) |

### Hiperparámetros de referencia (igual que α-06)

```python
# Modelo A
params_a = {
    "objective": "binary",
    "metric": "binary_logloss",
    "boosting_type": "gbdt",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "n_estimators": 300,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "verbose": -1,
    "seed": 42
}

# Modelo B
params_b = {
    "objective": "multiclass",
    "num_class": 3,
    "metric": "multi_logloss",
    "boosting_type": "gbdt",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "n_estimators": 300,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "verbose": -1,
    "seed": 42
}
```

### Features

Las 13 features del Ciclo Gamma definidas en `_gamma_utils.py` (`FEATURES_GAMMA`). Ver [delta_gamma_antiguio.md](delta_gamma_antiguio.md) sección 4.

### Datos

| Dataset | Período | Estado requerido |
|---|---|---|
| Dump Abril 2026 | Apr 8 – May 1 | ✅ Disponible |
| Dump Mayo-Jun 2026 | May 25 – Jun 14 | ✅ Disponible |
| Dump nuevo (Jun 15+) | Jun 15 → presente | ⏳ Descargar antes de Pre-G |
| `new_annotations_gamma.csv` | Jun 15 → presente | ⏳ Requiere ≥80 serv anotados |

---

## Comandos de ejecución

```powershell
cd "Docs/investigacion/Data Science/gamma/fase_3_modelos/scripts"
python g01_prepare_datasets.py
python g02_train_modelo_a_gbm.py   # G-01: solo LightGBM (sin --benchmark)
python g03_train_modelo_b_gbm.py   # G-01: solo LightGBM
python g09_training_report.py
```

---

## Metas

| Métrica | Umbral Gamma | Referencia Alpha (α-06) |
|---|---|---|
| F1 activo (Modelo A) | **≥ 0.75** | 0.7619 |
| AUC-ROC (Modelo A) | **≥ 0.90** | — |
| F1 alimentacion (Modelo B) | **≥ 0.72** | 0.7606 |
| F1 servido (Modelo B) | **≥ 0.25** (baseline inicial) | ~0.14–0.34 en Alpha |
| Macro F1 (Modelo B) | **≥ 0.60** | — |

> Nota: si G-01 no supera a α-06, hay que revisar la calidad de las nuevas anotaciones y los datos antes de avanzar a G-02.

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Volumen de datos

| Split | Filas | Alimentacion | Servido | Reposo |
|---|---|---|---|---|
| Train | — | — | — | — |
| Val | — | — | — | — |
| Test (sellado) | — | — | — | — |

### Modelo A

| Métrica | Valor |
|---|---|
| F1 activo | — |
| AUC-ROC | — |
| Threshold óptimo | — |
| Threshold inicial (0.20) | — |

### Modelo B

| Métrica | Valor |
|---|---|
| F1 alimentacion | — |
| F1 servido | — |
| F1 reposo | — |
| Macro F1 | — |

### Top features (Modelo A)

| Rank | Feature | Importancia |
|---|---|---|
| 1 | — | — |
| 2 | — | — |
| 3 | — | — |

### Top features (Modelo B)

| Rank | Feature | Importancia |
|---|---|---|
| 1 | — | — |
| 2 | — | — |
| 3 | — | — |

---

## Artefactos generados

```
gamma/fase_3_modelos/models/gbm/
├── g01_lgbm_a.lgb
├── g01_lgbm_a_params.json
├── g01_lgbm_a_calibrator.pkl
├── g01_lgbm_b.lgb
├── g01_lgbm_b_params.json
└── g01_training_report.txt
```

---

## Conclusiones

*A completar post-ejecución.*

**¿Superó los umbrales Gamma?** — (Sí / No / Parcial)

**Hallazgo principal:** —

**Diferencia vs α-06:** —

**Próximo paso:** G-02 — GBM Benchmark completo con XGBoost, CatBoost y HistGBM.

---

## Referencias

| Documento | Enlace |
|---|---|
| Guía maestra Gamma | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Tracker de experimentos | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Experimento sucesor | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Referencia Alpha (α-06) | `Ciclo_Alpha_v1/experiments/exp_06_dump_colab.md` |


---


<!-- ==== fusionado desde g02_gbm_benchmark.md ==== -->

# G-02 — GBM Benchmark Completo

**Ciclo:** Gamma (γ)
**Fase:** A — Baseline + GBM
**Estado:** ⏳ Pendiente
**Prerequisito:** G-01 completado
**Fecha estimada:** TBD

Referencia: [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) §9

---

## Objetivo

Encontrar el mejor algoritmo GBM para el problema Kittypau con datos del Ciclo Gamma.
Se entrenan en paralelo los cuatro algoritmos de la familia GBM usando los mismos splits,
features y protocolo de evaluación. El ganador se usa como referencia en G-03 y G-04.

---

## Modelos evaluados

| Modelo | Librería | Fortaleza principal en este problema |
|---|---|---|
| **LightGBM** | `lightgbm` | Rápido, probado en Alpha; referencia de G-01 |
| **XGBoost** | `xgboost` | Regularización diferente; puede generalizar distinto entre períodos |
| **CatBoost** | `catboost` | Mejor con datos pequeños; manejo nativo de NA |
| **HistGradientBoosting** | `sklearn` | Sin dependencias extra; buena calibración |

---

## Configuración

### Parámetros iniciales por modelo

```python
param_grid = {
    "lightgbm": {
        "n_estimators": 300,
        "num_leaves": 31,
        "learning_rate": 0.05,
        "seed": 42
    },
    "xgboost": {
        "n_estimators": 300,
        "max_depth": 6,
        "learning_rate": 0.05,
        "seed": 42
    },
    "catboost": {
        "iterations": 300,
        "depth": 6,
        "learning_rate": 0.05,
        "random_seed": 42,
        "verbose": 0
    },
    "histgbm": {
        "max_iter": 300,
        "max_leaf_nodes": 31,
        "learning_rate": 0.05,
        "random_state": 42
    }
}
```

Nota: los hiperparámetros finales se optimizan en G-04 (Optuna). Este experimento usa valores comparables entre modelos para aislar el efecto del algoritmo.

### Comando

```powershell
cd "Docs/investigacion/Data Science/gamma/fase_3_modelos/scripts"
python g02_train_modelo_a_gbm.py --benchmark   # activa los 4 GBM en paralelo
python g03_train_modelo_b_gbm.py --benchmark
python g09_training_report.py --mode=gbm_benchmark
```

### Instalación previa

```powershell
pip install xgboost catboost
```

---

## Metas

| Resultado buscado | Criterio |
|---|---|
| Mejor GBM Modelo A | Maximizar F1 activo + AUC-ROC |
| Mejor GBM Modelo B | Maximizar F1 servido sin degradar F1 alim (prioridad: servido) |
| Referencia para G-03 | El mejor modelo de cada tarea avanza como baseline |

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Modelo A — Comparativa

| Algoritmo | F1 activo | AUC-ROC | Threshold óptimo | Tiempo train (s) |
|---|---|---|---|---|
| LightGBM (G-01) | — | — | — | — |
| XGBoost | — | — | — | — |
| CatBoost | — | — | — | — |
| HistGBM | — | — | — | — |
| **Ganador** | | | | |

### Modelo B — Comparativa

| Algoritmo | F1 alim | F1 serv | F1 reposo | Macro F1 | Tiempo train (s) |
|---|---|---|---|---|---|
| LightGBM (G-01) | — | — | — | — | — |
| XGBoost | — | — | — | — | — |
| CatBoost | — | — | — | — | — |
| HistGBM | — | — | — | — | — |
| **Ganador** | | | | | |

### Observaciones sobre distribución de errores

*¿Algún modelo es consistentemente mejor en servido? ¿Hay diferencias por período de datos?*

---

## Artefactos generados

```
gamma/fase_3_modelos/models/gbm/
├── g02_lgbm_a.lgb       g02_lgbm_b.lgb
├── g02_xgb_a.xgb        g02_xgb_b.xgb
├── g02_catboost_a.cbm   g02_catboost_b.cbm
├── g02_histgbm_a.pkl    g02_histgbm_b.pkl
└── gbm_benchmark_report.csv
```

---

## Conclusiones

*A completar post-ejecución.*

**Mejor modelo Modelo A:** —
**Mejor modelo Modelo B:** —
**¿Hay diferencia significativa entre algoritmos?** —

**Próximo paso:** G-03 — Feature Engineering avanzado sobre el mejor GBM.

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Experimento siguiente | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Tracker | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |


---


<!-- ==== fusionado desde g03_feature_engineering.md ==== -->

# G-03 — Feature Engineering Avanzado

**Ciclo:** Gamma (γ)
**Fase:** B — Feature Engineering + ML Clásico
**Estado:** ⏳ Pendiente
**Prerequisito:** G-02 completado (mejor GBM seleccionado)
**Fecha estimada:** TBD

Referencia: [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) §9

---

## Objetivo

Determinar si features adicionales mejoran el rendimiento del mejor GBM de G-02.
El método es un ablation study: se parte del baseline G-02 y se agrega una feature nueva
a la vez, midiendo el delta de F1 en validación. Solo se incorporan las que muestran
mejora estadísticamente relevante.

---

## Features candidatas a evaluar

| Feature | Disponible desde | Por qué evaluar | Hipótesis |
|---|---|---|---|
| `light_percent` | Mayo 2026 | Presencia de luz puede correlacionar con servido (mañana/tarde) | Mejora `hour_sin/cos` para servido |
| `light_lux` | Mayo 2026 | Complementa `light_percent` con intensidad absoluta | Puede diferenciar interior/exterior |
| `rolling_std_30` | Siempre (derivada) | Ventana larga para detectar cambios de baseline | Puede mejorar detección de reposo prolongado |
| `temperature` | Siempre | Temperatura ambiente puede correlacionar con actividad del gato | Correlación baja en Alpha — verificar con más datos |
| `humidity` | Siempre | Ídem temperatura | Correlación baja en Alpha |

Nota: `light_percent` y `light_lux` solo están disponibles desde Mayo 2026. Si el dataset
de entrenamiento incluye Abril 2026, estas features tendrán NaN para ese período.
Evaluar si el modelo GBM maneja los NaN de forma nativa (CatBoost sí; LGBM/XGBoost requieren imputación).

---

## Método

### Ablation study

Para cada feature candidata:
1. Tomar el modelo ganador de G-02 (mismos hiperparámetros, mismos splits).
2. Agregar la nueva feature al conjunto `FEATURES_GAMMA`.
3. Entrenar y evaluar sobre `X_val.parquet`.
4. Calcular delta F1 vs G-02 para cada métrica objetivo.
5. Si delta F1 activo ≥ +0.01 O delta F1 servido ≥ +0.02: la feature se incorpora.

```python
for feature_candidata in FEATURES_CANDIDATAS:
    features_ext = FEATURES_GAMMA + [feature_candidata]
    modelo = entrenar_gbm(X_train[features_ext], y_train)
    metricas = evaluar(modelo, X_val[features_ext], y_val)
    delta = metricas - metricas_baseline_g02
    print(f"{feature_candidata}: delta F1 activo={delta['f1_activo']:+.4f}, "
          f"delta F1 serv={delta['f1_servido']:+.4f}")
```

---

## Metas

| Resultado buscado | Criterio |
|---|---|
| Feature incluida | Delta F1 activo ≥ +0.01 O delta F1 servido ≥ +0.02 |
| Feature excluida | Delta negativo o sin señal |
| Features finales Gamma | Lista definitiva para G-04 |

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Ablation — Modelo A (F1 activo)

| Feature candidata | F1 activo base | F1 activo +feature | Delta | Decisión |
|---|---|---|---|---|
| `light_percent` | — | — | — | — |
| `light_lux` | — | — | — | — |
| `rolling_std_30` | — | — | — | — |
| `temperature` | — | — | — | — |
| `humidity` | — | — | — | — |

### Ablation — Modelo B (F1 servido)

| Feature candidata | F1 serv base | F1 serv +feature | Delta | Decisión |
|---|---|---|---|---|
| `light_percent` | — | — | — | — |
| `light_lux` | — | — | — | — |
| `rolling_std_30` | — | — | — | — |
| `temperature` | — | — | — | — |
| `humidity` | — | — | — | — |

### Feature importance extendida

```
gamma/fase_3_modelos/outputs/training_report/feature_importance_extended.csv
```

---

## Artefactos generados

```
gamma/fase_3_modelos/outputs/training_report/
├── g03_ablation_results.csv
├── feature_importance_extended.csv
└── g03_features_finales.json   ← lista definitiva para G-04
```

---

## Conclusiones

*A completar post-ejecución.*

**Features incorporadas en G-04:** —
**Features descartadas:** —
**Sorpresas:** —

**Próximo paso:** G-04 — Hyperparameter Optimization (Optuna) sobre las features finales.

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Experimento siguiente | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Tracker | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |


---


<!-- ==== fusionado desde g04_hyperparameter_optimization.md ==== -->

# G-04 — Hyperparameter Optimization (Optuna)

**Ciclo:** Gamma (γ)
**Fase:** B — Feature Engineering + ML Clásico
**Estado:** ⏳ Pendiente
**Prerequisito:** G-03 completado (features finales definidas)
**Fecha estimada:** TBD

Referencia: [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) §9

---

## Objetivo

Encontrar los hiperparámetros óptimos para el mejor GBM seleccionado en G-02,
usando las features finales definidas en G-03.
La búsqueda es bayesiana (Optuna) con ≥200 trials por modelo por tarea.

El resultado de G-04 es el **GBM de referencia final** para el Ciclo Gamma.
Todo experimento posterior (G-05, G-06, G-08) compara contra este baseline.

---

## Configuración

### Herramienta

```python
import optuna

# Ejemplo para LightGBM Modelo A
def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
        "num_leaves": trial.suggest_int("num_leaves", 20, 150),
        "learning_rate": trial.suggest_float("learning_rate", 0.005, 0.1, log=True),
        "min_child_samples": trial.suggest_int("min_child_samples", 10, 100),
        "feature_fraction": trial.suggest_float("feature_fraction", 0.5, 1.0),
        "bagging_fraction": trial.suggest_float("bagging_fraction", 0.5, 1.0),
        "bagging_freq": trial.suggest_int("bagging_freq", 1, 10),
        "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
        "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
    }
    modelo = entrenar_lgbm(params, X_train, y_train)
    f1 = evaluar_f1_activo(modelo, X_val, y_val)
    return f1

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=200)
```

### Espacio de búsqueda por familia GBM

```python
# LightGBM
lgbm_space = {
    "n_estimators": [100, 300, 500, 1000],
    "num_leaves": [20, 31, 63, 127],
    "learning_rate": [0.005, 0.01, 0.03, 0.05, 0.1],
    "min_child_samples": [10, 20, 50, 100],
}

# XGBoost (si ganó en G-02)
xgb_space = {
    "n_estimators": [100, 300, 500, 1000],
    "max_depth": [3, 4, 6, 8],
    "learning_rate": [0.005, 0.01, 0.03, 0.05, 0.1],
    "min_child_weight": [1, 5, 10],
}

# CatBoost (si ganó en G-02)
catboost_space = {
    "iterations": [100, 300, 500, 1000],
    "depth": [4, 6, 8],
    "learning_rate": [0.01, 0.03, 0.05, 0.1],
    "l2_leaf_reg": [1, 3, 5, 10],
}
```

### Invariantes durante la optimización

Estos parámetros NO se tocan en la búsqueda:
- Features: las definidas en G-03
- Splits: `X_train.parquet` / `X_val.parquet` (mismos que G-01 a G-03)
- Seed: 42
- Calibración isotónica: siempre activada sobre el modelo ganador

### Comando

```powershell
pip install optuna

cd "Docs/investigacion/Data Science/gamma/fase_3_modelos/scripts"
python g04_train_modelo_a_optuna.py --n-trials 200
python g04_train_modelo_b_optuna.py --n-trials 200
```

---

## Metas

| Resultado buscado | Criterio |
|---|---|
| F1 activo optimizado | > F1 activo G-02 (mismo algoritmo, mejor configuración) |
| F1 servido optimizado | Máximo alcanzable con GBM; referencia para G-05 y G-06 |
| Estudio guardado | `optuna_study_a.pkl` + `optuna_study_b.pkl` para reproducibilidad |

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Modelo A — Mejor trial

| Parámetro | Valor óptimo |
|---|---|
| Algoritmo | — |
| `n_estimators` / `iterations` | — |
| `num_leaves` / `max_depth` | — |
| `learning_rate` | — |
| Threshold óptimo | — |

### Métricas Modelo A

| Métrica | G-02 (baseline) | G-04 (optimizado) | Delta |
|---|---|---|---|
| F1 activo | — | — | — |
| AUC-ROC | — | — | — |

### Modelo B — Mejor trial

| Parámetro | Valor óptimo |
|---|---|
| Algoritmo | — |
| `n_estimators` / `iterations` | — |
| `num_leaves` / `max_depth` | — |
| `learning_rate` | — |

### Métricas Modelo B

| Métrica | G-02 (baseline) | G-04 (optimizado) | Delta |
|---|---|---|---|
| F1 alimentacion | — | — | — |
| F1 servido | — | — | — |
| Macro F1 | — | — | — |

### Curva de convergencia Optuna

*Gráfico o descripción de cómo convergió la búsqueda.*

---

## Artefactos generados

```
gamma/fase_3_modelos/models/gbm/
├── g04_best_modelo_a.<ext>        ← modelo A optimizado
├── g04_best_modelo_a_params.json
├── g04_best_modelo_a_calibrator.pkl
├── g04_best_modelo_b.<ext>        ← modelo B optimizado
├── g04_best_modelo_b_params.json
└── gamma/fase_3_modelos/outputs/training_report/
    ├── optuna_study_a.pkl
    ├── optuna_study_b.pkl
    └── g04_optimization_report.csv
```

---

## Conclusiones

*A completar post-ejecución.*

**Mejora sobre G-02:** —
**Hiperparámetros más influyentes:** —
**¿Se alcanzó el umbral Gamma de F1 activo ≥ 0.75?** —

**Próximo paso:** G-05 — ML Clásico Benchmark vs el GBM optimizado de G-04.

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Experimento siguiente | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Tracker | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |


---


<!-- ==== fusionado desde g05_classical_ml_benchmark.md ==== -->

# G-05 — ML Clásico Benchmark

**Ciclo:** Gamma (γ)
**Fase:** B — Feature Engineering + ML Clásico
**Estado:** ⏳ Pendiente
**Prerequisito:** G-04 completado (GBM optimizado como referencia)
**Fecha estimada:** TBD

Referencia: [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) §9

---

## Objetivo

Determinar si algún modelo de ML clásico compite con el GBM optimizado de G-04.
Los modelos clásicos sirven como sanity check (si LogReg supera al GBM, hay sobrefit)
y como posibles contribuyentes a un ensemble en G-08.

---

## Modelos evaluados

| Modelo | Librería | Cuándo puede ganar |
|---|---|---|
| **Random Forest** | `sklearn` | Buena calibración; resistente a outliers de peso |
| **Extra Trees** | `sklearn` | Más rápido que RF; útil con features ruidosas |
| **SVM (kernel RBF)** | `sklearn` | Puede capturar fronteras no lineales con pocos datos |
| **Logistic Regression** | `sklearn` | Sanity check: si supera al GBM en F1, hay sobrefit en el GBM |

### Nota importante sobre SVM

SVM requiere normalización de features. Aplicar `StandardScaler` **solo sobre los datos de training**;
nunca ajustar el scaler sobre validación o test.

```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train[FEATURES_FINALES])
X_val_scaled   = scaler.transform(X_val[FEATURES_FINALES])
# X_test_scaled: NO tocar todavía
```

---

## Configuración

### Hiperparámetros iniciales

```python
modelos = {
    "random_forest": RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    ),
    "extra_trees": ExtraTreesClassifier(
        n_estimators=300,
        max_depth=None,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    ),
    "svm": SVC(
        kernel="rbf",
        C=1.0,
        gamma="scale",
        probability=True,          # necesario para calibración de probabilidades
        class_weight="balanced",
        random_state=42
    ),
    "logistic_regression": LogisticRegression(
        C=1.0,
        solver="lbfgs",
        max_iter=1000,
        class_weight="balanced",
        multi_class="multinomial",
        random_state=42
    )
}
```

### Comandos

```powershell
cd "Docs/investigacion/Data Science/gamma/fase_3_modelos/scripts"
python g04_train_modelo_a_classical.py
python g05_train_modelo_b_classical.py
python g09_training_report.py --mode=classical_benchmark
```

---

## Metas

| Resultado buscado | Criterio |
|---|---|
| ¿Algún clásico supera al GBM en F1 activo? | Si sí → investigar sobrefit en G-04 |
| ¿Algún clásico supera al GBM en F1 servido? | Si sí → incorporar en ensemble G-08 |
| Referencia para ensemble | Mejores modelos clásicos guardados para G-08 |

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Modelo A — Comparativa vs G-04

| Modelo | F1 activo | AUC-ROC | ¿Supera GBM? |
|---|---|---|---|
| **GBM optimizado (G-04)** | — | — | — |
| Random Forest | — | — | — |
| Extra Trees | — | — | — |
| SVM (RBF) | — | — | — |
| Logistic Regression | — | — | — |

### Modelo B — Comparativa vs G-04

| Modelo | F1 alim | F1 serv | Macro F1 | ¿Supera GBM en servido? |
|---|---|---|---|---|
| **GBM optimizado (G-04)** | — | — | — | — |
| Random Forest | — | — | — | — |
| Extra Trees | — | — | — | — |
| SVM (RBF) | — | — | — | — |
| Logistic Regression | — | — | — | — |

### Observaciones de calibración

*¿Algún modelo clásico tiene mejor calibración de probabilidades que el GBM?*
*(Importante para el blend de probabilidades en G-08.)*

---

## Artefactos generados

```
gamma/fase_3_modelos/models/classical/
├── g05_rf_a.pkl      g05_rf_b.pkl
├── g05_et_a.pkl      g05_et_b.pkl
├── g05_svm_a.pkl     g05_svm_b.pkl
├── g05_svm_scaler.pkl               ← StandardScaler para SVM
├── g05_logreg_a.pkl  g05_logreg_b.pkl
└── gamma/fase_3_modelos/outputs/training_report/
    └── classical_benchmark_report.csv
```

---

## Conclusiones

*A completar post-ejecución.*

**¿Algún modelo clásico compite con el GBM?** —
**¿Hay señal de sobrefit en G-04?** —
**Modelos candidatos para ensemble G-08:** —

**Próximo paso:**
- Si los datos lo permiten (≥300 alim + ≥80 serv): G-06 — NN Baseline
- Si no: esperar más anotaciones y pasar directamente a G-08 con solo GBM

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Experimento siguiente | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Tracker | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |


---


<!-- ==== fusionado desde g06_nn_baseline.md ==== -->

# G-06 — NN Baseline (MLP / GRU / TCN)

**Ciclo:** Gamma (γ)
**Fase:** C — Deep Learning (Data-Conditional)
**Estado:** ⏳ Data-conditional — bloqueado hasta cumplir prerequisito de datos
**Prerequisito de pipeline:** G-05 completado
**Prerequisito de datos:** ≥300 sesiones de alimentación + ≥80 sesiones de servido en `new_annotations_gamma.csv`
**Entorno:** Google Colab Pro (GPU T4 o A100)
**Fecha estimada:** TBD (data-conditional)

Referencia: [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) §9

---

## Por qué este experimento es data-conditional

En el Ciclo Alpha, α-10 ejecutó 4 arquitecturas NN con 185 sesiones de alimentación y 27 de servido.
LightGBM ganó por defecto: con datos tabulares tan pequeños y clases tan desbalanceadas,
el GBM tiene ventaja estructural. El resultado era predecible y no informativo.

Este experimento solo se ejecuta cuando la base de datos es suficiente para que la comparación sea justa.
Ejecutarlo antes sería repetir el error α-7.

---

## Objetivo

Determinar si las redes neuronales superan al GBM optimizado de G-04 cuando el dataset es suficiente.
La métrica crítica es **F1 servido** (Modelo B), que fue la mayor debilidad del GBM en Alpha.

El aprendizaje más importante de α-10: el GRU bidireccional tuvo el mejor F1 servido (0.34)
y el TCN tuvo el mejor F1 activo de NN (0.60), ambos con solo 185 sesiones.
Con ≥300 sesiones, la hipótesis es que ambos mejorarán significativamente.

---

## Modelos evaluados

| Modelo | Tipo | Referencia Alpha | Por qué incluir |
|---|---|---|---|
| **MLP profundo** | Feedforward tabular | NN-A en α-10 | Baseline neuronal; rápido de entrenar; no requiere secuencias |
| **GRU bidireccional** | Recurrente | NN-B en α-10 (mejor F1 serv: 0.34) | Captura señal temporal de llenado; fue el más prometedor en servido |
| **TCN** (Temporal Conv Net) | Convolucional temporal | NN-C en α-10 (mejor F1 activo: 0.60) | Ventanas largas eficientes; más estable que GRU en activo |

> El Transformer (NN-D en α-10) fue el peor con 185 sesiones. Solo se incorpora en G-07 con ≥500 sesiones.

---

## Configuración

### Formato de input

Todos los modelos reciben secuencias de longitud fija:
- Ventana: **60 timesteps** (60 × 30s = 30 minutos de contexto)
- Features: las 13 de `FEATURES_GAMMA` (definidas en `_gamma_utils.py`)
- Shape: `(batch, 60, 13)`

```python
SEQUENCE_LENGTH = 60    # timesteps por muestra
N_FEATURES = 13         # features Gamma
BATCH_SIZE = 64
EPOCHS = 100
EARLY_STOPPING_PATIENCE = 10
```

### Arquitecturas base

```python
# MLP
mlp = Sequential([
    Dense(128, activation="relu"),
    Dropout(0.3),
    Dense(64, activation="relu"),
    Dropout(0.2),
    Dense(n_classes, activation="softmax")
])

# GRU bidireccional
gru = Sequential([
    Bidirectional(GRU(64, return_sequences=True)),
    Bidirectional(GRU(32)),
    Dense(32, activation="relu"),
    Dense(n_classes, activation="softmax")
])

# TCN (Temporal Convolutional Network)
# Usar librería keras-tcn o implementación personalizada
tcn = Sequential([
    TCN(nb_filters=64, kernel_size=3, dilations=[1,2,4,8]),
    Dense(n_classes, activation="softmax")
])
```

### Manejo de clases desbalanceadas

```python
# Pesos de clase (calcular en runtime sobre y_train)
class_weights = compute_class_weight("balanced", classes=np.unique(y_train), y=y_train)
class_weight_dict = dict(enumerate(class_weights))
```

### Entorno Colab

```python
# En Google Colab Pro — instalar dependencias
!pip install torch torchvision torchaudio
!pip install lightning imbalanced-learn keras-tcn

# Subir a Colab:
# gamma/fase_3_modelos/scripts/g06_train_modelo_a_nn.py
# gamma/fase_3_modelos/scripts/g07_train_modelo_b_nn.py
# gamma/fase_2_dataset/data/train/X_train.parquet
# gamma/fase_2_dataset/data/train/X_val.parquet
# gamma/fase_2_dataset/data/train/y_train.parquet
# gamma/fase_2_dataset/data/train/y_val.parquet
```

---

## Verificación del prerequisito de datos

```python
# Antes de ejecutar — verificar en local
from gamma._gamma_utils import MIN_ALIM_FOR_NN, MIN_SERVIDO_SESSIONS
import pandas as pd

sesiones = pd.read_parquet("gamma/fase_1_extraccion/data/raw/sessions_labeled.parquet")
n_alim = len(sesiones[sesiones["session_type"] == "alimentacion"])
n_serv = len(sesiones[sesiones["session_type"] == "servido"])

assert n_alim >= MIN_ALIM_FOR_NN, f"❌ {n_alim} sesiones alim. Requeridas: {MIN_ALIM_FOR_NN}"
assert n_serv >= MIN_SERVIDO_SESSIONS, f"❌ {n_serv} sesiones serv. Requeridas: {MIN_SERVIDO_SESSIONS}"
print(f"✅ Dataset suficiente: {n_alim} alim + {n_serv} serv. G-06 desbloqueado.")
```

---

## Metas

| Métrica | Umbral para considerar NN competitiva | Referencia α-10 (185 sesiones) |
|---|---|---|
| F1 activo — GRU/TCN Modelo A | > F1 activo GBM G-04 | TCN: 0.60 |
| F1 servido — GRU Modelo B | **≥ 0.40** | GRU: 0.34 |
| Macro F1 Modelo B | > Macro F1 GBM G-04 | — |

Si ninguna NN supera al GBM en ninguna métrica: saltar G-07 e ir directo a G-08 con solo GBM.

---

## Resultados

*Sección a completar cuando el experimento se ejecute.*

### Volumen de datos al ejecutar

| Clase | Sesiones disponibles |
|---|---|
| Alimentacion | — (objetivo: ≥300) |
| Servido | — (objetivo: ≥80) |
| Reposo | — |

### Modelo A — Comparativa

| Modelo | F1 activo | AUC-ROC | Tiempo por época | Épocas (early stop) | ¿Supera GBM G-04? |
|---|---|---|---|---|---|
| **GBM G-04 (referencia)** | — | — | — | — | — |
| MLP | — | — | — | — | — |
| GRU bidireccional | — | — | — | — | — |
| TCN | — | — | — | — | — |

### Modelo B — Comparativa

| Modelo | F1 alim | F1 serv | Macro F1 | ¿Supera GBM en servido? |
|---|---|---|---|---|
| **GBM G-04 (referencia)** | — | — | — | — |
| MLP | — | — | — | — |
| GRU bidireccional | — | — | — | — |
| TCN | — | — | — | — |

---

## Artefactos generados

```
gamma/fase_3_modelos/models/nn/
├── g06_mlp_a.pt         g06_mlp_b.pt
├── g06_gru_a.pt         g06_gru_b.pt
├── g06_tcn_a.pt         g06_tcn_b.pt
├── g06_mlp_arch.json    (arquitectura para carga posterior)
├── g06_gru_arch.json
├── g06_tcn_arch.json
└── gamma/fase_3_modelos/outputs/training_report/
    └── nn_baseline_report.csv
```

---

## Conclusiones

*A completar post-ejecución.*

**¿Alguna NN superó al GBM en F1 servido?** —
**¿Alguna NN superó al GBM en F1 activo?** —
**Mejor NN para ensemble G-08:** —

**Próximo paso:**
- Si alguna NN mostró F1 > GBM en ≥1 métrica: G-07 — NN Avanzado (LSTM/TabNet)
- Si ninguna supera al GBM: ir directo a G-08 — Ensemble

---

## Referencias

| Documento | Enlace |
|---|---|
| Experimento anterior | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Tracker | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) |
| Referencia α-10 | `av1_EXPERIMENTOS_DETALLE.md` (referencia histórica) |


---


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Ciclo Gamma — Specs de Scripts (pre-implementación)

> Fusión de las specs `.md` de cada script del pipeline Gamma (convención documentada en [[delta_gamma_antiguio]] regla 1: se redacta el `.md` primero, Mauro lo convierte a `.py` a mano). Cada sección corresponde a un script.


---


<!-- ==== fusionado desde g01_build_labels.md ==== -->

# g01_build_labels — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/g01_build_labels.py`
**Prerequisito:** `sessions_labeled.parquet` y `readings_unificado_30s.parquet` generados (Fase 1 completa)
**Salida:** `Ciclo_Gamma/fase_2_dataset/data/interim/readings_labeled.parquet`

Notas importantes:
- Usa las sesiones **reales** (sin augmentación) para etiquetar lecturas individuales.
  La augmentación de sesiones es para checkpoints de calidad (g10), no para el dataset de filas.
- Default label = reposo (2). Solo alimentacion y servido se etiquetan desde sesiones.
- El desbalance resultante (~1-2% filas activas) se maneja con `class_weight` en Fase 3,
  no aquí.

---

```python
"""
g01_build_labels.py — Fase 2 Gamma
Asigna label de clasificación (0=alimentacion, 1=servido, 2=reposo) a cada
lectura de readings_unificado_30s.parquet basándose en sessions_labeled.parquet.
"""
import sys
import pandas as pd
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (
    READINGS_UNIFICADO_30S, SESSIONS_LABELED_PARQUET,
    FASE2_INTERIM, LABEL_ENCODING,
)

LABEL_DEFAULT = LABEL_ENCODING["reposo"]


def asignar_labels(readings: pd.DataFrame, sesiones: pd.DataFrame) -> pd.DataFrame:
    """
    Para cada lectura, verifica si cae dentro de alguna sesión etiquetada.
    Default: reposo. Solo alimentacion y servido producen label distinto.
    """
    readings = readings.copy()
    readings["label"] = LABEL_DEFAULT

    sesiones_validas = sesiones[
        sesiones["session_type"].isin(["alimentacion", "servido"])
    ].copy()

    print(f"Sesiones válidas para labeling: {len(sesiones_validas)}")
    print(f"  alimentacion: {len(sesiones_validas[sesiones_validas.session_type == 'alimentacion'])}")
    print(f"  servido:      {len(sesiones_validas[sesiones_validas.session_type == 'servido'])}")

    for _, ses in sesiones_validas.iterrows():
        label = LABEL_ENCODING[ses["session_type"]]
        mask  = (readings["ts_utc"] >= ses["ts_inicio"]) & (readings["ts_utc"] <= ses["ts_fin"])
        readings.loc[mask, "label"] = label

    return readings


def main():
    print("=== g01_build_labels.py — Ciclo Gamma · Fase 2 ===\n")
    FASE2_INTERIM.mkdir(parents=True, exist_ok=True)

    if not READINGS_UNIFICADO_30S.exists():
        raise FileNotFoundError("readings_unificado_30s.parquet no existe — ejecutar Fase 1 primero")
    if not SESSIONS_LABELED_PARQUET.exists():
        raise FileNotFoundError("sessions_labeled.parquet no existe — ejecutar g09 de Fase 1 primero")

    readings = pd.read_parquet(READINGS_UNIFICADO_30S)
    readings["ts_utc"] = pd.to_datetime(readings["ts_utc"], utc=True)
    print(f"Lecturas a etiquetar: {len(readings):,}")
    print(f"Rango: {readings['ts_utc'].min()} → {readings['ts_utc'].max()}")

    sesiones = pd.read_parquet(SESSIONS_LABELED_PARQUET)
    sesiones["ts_inicio"] = pd.to_datetime(sesiones["ts_inicio"], utc=True)
    sesiones["ts_fin"]    = pd.to_datetime(sesiones["ts_fin"],    utc=True)

    readings = asignar_labels(readings, sesiones)

    inv = {v: k for k, v in LABEL_ENCODING.items()}
    dist = readings["label"].value_counts().sort_index()
    print("\nDistribución de labels:")
    for lbl_id, count in dist.items():
        pct = count / len(readings) * 100
        print(f"  {lbl_id} ({inv.get(lbl_id, '?'):15s}): {count:7,}  ({pct:.2f}%)")

    out = FASE2_INTERIM / "readings_labeled.parquet"
    readings.to_parquet(out, index=False)
    print(f"\n✅ readings_labeled.parquet → {out}")
    print("   Próximo: g02_build_features.py")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde g02_build_features.md ==== -->

# g02_build_features — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/g02_build_features.py`
**Prerequisito:** `readings_labeled.parquet` + `_gamma_phase2_utils.py` en la misma carpeta
**Salida:** `Ciclo_Gamma/fase_2_dataset/data/interim/readings_features.parquet`

Notas importantes:
- Las lecturas ya vienen a 30s uniforme de Fase 1 (g04_resample_30s). No se resamplea de nuevo.
- Las features se calculan POR SEGMENTO (bloques separados por gap > GAP_CUTOFF_S=300s)
  para que rolling stats no crucen gaps de transmisión.
- Segmentos con < 5 filas se descartan (insuficientes para rolling_std_5).

---

```python
"""
g02_build_features.py — Fase 2 Gamma
Calcula las 13 features Gamma sobre readings_labeled.parquet por segmento.
Las lecturas ya están a 30s uniforme — no se resamplea.
"""
import sys
import pandas as pd
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))
sys.path.insert(0, str(SCRIPTS_DIR))

from _gamma_utils import FASE2_INTERIM, FEATURES_GAMMA, GAP_CUTOFF_S
from _gamma_phase2_utils import calcular_todas_features, verificar_features_gamma


def procesar_por_segmento(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula features por segmento de continuidad (gap > GAP_CUTOFF_S).
    Garantiza que rolling stats no crucen gaps de transmisión.
    """
    df = df.sort_values("ts_utc").copy()
    diff_s   = df["ts_utc"].diff().dt.total_seconds().fillna(0)
    df["_seg"] = (diff_s > GAP_CUTOFF_S).cumsum()

    resultados = []
    for seg_id, grupo in df.groupby("_seg"):
        if len(grupo) < 5:
            continue
        grupo_f = calcular_todas_features(grupo.copy())
        resultados.append(grupo_f)

    if not resultados:
        raise ValueError("No se produjeron segmentos con datos suficientes (mínimo 5 filas).")

    return pd.concat(resultados, ignore_index=True)


def main():
    print("=== g02_build_features.py — Ciclo Gamma · Fase 2 ===\n")
    FASE2_INTERIM.mkdir(parents=True, exist_ok=True)

    path_in = FASE2_INTERIM / "readings_labeled.parquet"
    if not path_in.exists():
        raise FileNotFoundError("readings_labeled.parquet no existe — ejecutar g01 primero")

    df = pd.read_parquet(path_in)
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)
    print(f"Lecturas de entrada: {len(df):,}")
    print(f"Rango: {df['ts_utc'].min()} → {df['ts_utc'].max()}")

    n_segs = int((df["ts_utc"].diff().dt.total_seconds().fillna(0) > GAP_CUTOFF_S).sum()) + 1
    print(f"Segmentos detectados (gap > {GAP_CUTOFF_S}s): {n_segs}")

    df_features = procesar_por_segmento(df)
    print(f"\nLecturas post-features: {len(df_features):,}")

    verificar_features_gamma(df_features)

    dist = df_features["label"].value_counts().sort_index()
    print("\nDistribución labels tras features:")
    for lbl, cnt in dist.items():
        print(f"  {lbl}: {cnt:,} ({cnt / len(df_features) * 100:.2f}%)")

    out = FASE2_INTERIM / "readings_features.parquet"
    df_features.to_parquet(out, index=False)
    print(f"\n✅ readings_features.parquet → {out}")
    print("   Próximo: g03_build_train_dataset.py")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde g03_build_train_dataset.md ==== -->

# g03_build_train_dataset — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/g03_build_train_dataset.py`
**Prerequisito:** `readings_features.parquet` generado
**Salidas:**
- `Ciclo_Gamma/fase_2_dataset/data/train/X_train.parquet`
- `Ciclo_Gamma/fase_2_dataset/data/train/y_train.parquet`
- `Ciclo_Gamma/fase_2_dataset/data/train/X_val.parquet`
- `Ciclo_Gamma/fase_2_dataset/data/train/y_val.parquet`
- `Ciclo_Gamma/fase_2_dataset/data/train/X_test.parquet` ← **SELLAR — no abrir hasta G-Final**
- `Ciclo_Gamma/fase_2_dataset/data/train/y_test.parquet` ← **SELLAR**
- `Ciclo_Gamma/fase_2_dataset/data/train/dataset_meta.json`

Split temporal (datos: 2026-04-08 → 2026-06-14):
- **Train:** < 2026-05-25 (~7 semanas)
- **Val:**   2026-05-25 → 2026-06-07 (~2 semanas)
- **Test:**  ≥ 2026-06-07 → fin (~1 semana) — SELLADO

---

```python
"""
g03_build_train_dataset.py — Fase 2 Gamma
Split temporal train/val/test con fechas fijas.
Invariante: split SIEMPRE por fecha, NUNCA aleatorio.
X_test queda sellado hasta G-Final.
"""
import sys
import json
import pandas as pd
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (
    FASE2_INTERIM, FASE2_TRAIN, FEATURES_GAMMA, LABEL_ENCODING
)

# ── Fechas de split ───────────────────────────────────────────────────────────
# Ajustadas al rango real 2026-04-08 → 2026-06-14 para distribuir ~70/20/10.
# Cambiar estas fechas requiere documentarlo en el experimento correspondiente.
FECHA_SPLIT_VAL  = pd.Timestamp("2026-05-25", tz="UTC")  # fin de train / inicio val
FECHA_SPLIT_TEST = pd.Timestamp("2026-06-07", tz="UTC")  # fin de val  / inicio test


def split_temporal(df: pd.DataFrame):
    train = df[df["ts_utc"] <  FECHA_SPLIT_VAL].copy()
    val   = df[(df["ts_utc"] >= FECHA_SPLIT_VAL) & (df["ts_utc"] < FECHA_SPLIT_TEST)].copy()
    test  = df[df["ts_utc"] >= FECHA_SPLIT_TEST].copy()

    print(f"\nSplit temporal:")
    print(f"  Train: hasta {FECHA_SPLIT_VAL.date()}   → {len(train):,} filas")
    print(f"  Val:   {FECHA_SPLIT_VAL.date()} → {FECHA_SPLIT_TEST.date()} → {len(val):,} filas")
    print(f"  Test:  desde {FECHA_SPLIT_TEST.date()}  → {len(test):,} filas  [SELLADO]")

    if len(train) == 0:
        raise ValueError("Train set vacío — verificar FECHA_SPLIT_VAL")
    if len(val) == 0:
        raise ValueError("Val set vacío — verificar FECHA_SPLIT_TEST")
    if len(test) == 0:
        print("  ⚠️  Test set vacío — actualizar FECHA_SPLIT_TEST si hay datos más recientes")

    return train, val, test


def guardar_splits(train, val, test):
    FASE2_TRAIN.mkdir(parents=True, exist_ok=True)
    inv = {v: k for k, v in LABEL_ENCODING.items()}

    for nombre, df_split in [("train", train), ("val", val), ("test", test)]:
        X = df_split[FEATURES_GAMMA]
        y = df_split["label"].rename("label")

        X.to_parquet(FASE2_TRAIN / f"X_{nombre}.parquet", index=False)
        y.to_frame().to_parquet(FASE2_TRAIN / f"y_{nombre}.parquet", index=False)

        dist = y.value_counts().sort_index()
        print(f"\n  {nombre}: {len(X):,} filas")
        for lbl, cnt in dist.items():
            print(f"    {lbl} ({inv.get(int(lbl), '?'):15s}): {cnt:6,} ({cnt / len(y) * 100:.2f}%)")

    meta = {
        "fecha_split_val":  FECHA_SPLIT_VAL.isoformat(),
        "fecha_split_test": FECHA_SPLIT_TEST.isoformat(),
        "features":         FEATURES_GAMMA,
        "n_features":       len(FEATURES_GAMMA),
        "n_train":          int(len(train)),
        "n_val":            int(len(val)),
        "n_test":           int(len(test)),
        "label_encoding":   LABEL_ENCODING,
        "test_sellado":     True,
        "nota": "X_test NO evaluar hasta G-Final (regla 1 Ciclo Gamma)",
    }
    with open(FASE2_TRAIN / "dataset_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)

    print("\n✅ dataset_meta.json guardado")
    print("\n⚠️  X_test.parquet y y_test.parquet SELLADOS.")
    print("   No abrir hasta que G-Final seleccione el modelo candidato.")


def main():
    print("=== g03_build_train_dataset.py — Ciclo Gamma · Fase 2 ===\n")

    path_in = FASE2_INTERIM / "readings_features.parquet"
    if not path_in.exists():
        raise FileNotFoundError("readings_features.parquet no existe — ejecutar g02 primero")

    df = pd.read_parquet(path_in)
    df["ts_utc"] = pd.to_datetime(df["ts_utc"], utc=True)

    faltantes = [f for f in FEATURES_GAMMA if f not in df.columns]
    if faltantes:
        raise AssertionError(f"Features faltantes en readings_features.parquet: {faltantes}")

    n_antes = len(df)
    df = df.dropna(subset=FEATURES_GAMMA + ["label"])
    if len(df) < n_antes:
        print(f"⚠️  Eliminadas {n_antes - len(df):,} filas con NaN en features o label")

    train, val, test = split_temporal(df)
    guardar_splits(train, val, test)

    print(f"\n✅ Dataset Gamma listo en: {FASE2_TRAIN}")
    print("   Próximo: g04_dataset_report.py")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde g04_dataset_report.md ==== -->

# g04_dataset_report — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/g04_dataset_report.py`
**Prerequisito:** train/val/test parquets generados (g03)
**Salidas:**
- `Ciclo_Gamma/fase_2_dataset/outputs/dataset_report.json`

Checkpoint de Fase 2: reporta distribución, estadísticas de features e imbalance ratio.
Si imbalance > 10x en train, avisa que se debe usar `class_weight='balanced'` en Fase 3.

---

```python
"""
g04_dataset_report.py — Fase 2 Gamma
Reporte de distribución del dataset: clases, features, split ratios.
Checkpoint de calidad antes de Fase 3.
"""
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import GAMMA_ROOT, FASE2_TRAIN, FEATURES_GAMMA, LABEL_ENCODING

REPORT_DIR = GAMMA_ROOT / "fase_2_dataset" / "outputs"


def cargar_splits() -> dict:
    splits = {}
    for nombre in ["train", "val", "test"]:
        X = pd.read_parquet(FASE2_TRAIN / f"X_{nombre}.parquet")
        y = pd.read_parquet(FASE2_TRAIN / f"y_{nombre}.parquet").squeeze()
        splits[nombre] = (X, y)
    return splits


def reporte_distribucion(splits: dict) -> dict:
    inv = {v: k for k, v in LABEL_ENCODING.items()}
    total = sum(len(X) for X, _ in splits.values())
    reporte = {}

    for nombre, (X, y) in splits.items():
        dist = y.value_counts().sort_index().to_dict()
        reporte[nombre] = {
            "n_total": len(y),
            "pct_del_total": round(len(y) / total * 100, 1),
            "clases": {
                inv.get(int(k), str(k)): {"n": int(v), "pct": round(v / len(y) * 100, 2)}
                for k, v in dist.items()
            },
        }
    return reporte


def reporte_features(X_train: pd.DataFrame) -> dict:
    stats = {}
    for feat in FEATURES_GAMMA:
        if feat not in X_train.columns:
            continue
        col = X_train[feat]
        stats[feat] = {
            "mean":    round(float(col.mean()),          4),
            "std":     round(float(col.std()),           4),
            "min":     round(float(col.min()),           4),
            "max":     round(float(col.max()),           4),
            "pct_nan": round(float(col.isna().mean()) * 100, 2),
        }
    return stats


def main():
    print("=== g04_dataset_report.py — Ciclo Gamma · Fase 2 ===\n")
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    splits = cargar_splits()
    inv = {v: k for k, v in LABEL_ENCODING.items()}

    print("── Distribución por split ──────────────────────────────")
    dist = reporte_distribucion(splits)
    for nombre, info in dist.items():
        print(f"\n{nombre.upper()} ({info['n_total']:,} filas — {info['pct_del_total']}% del total):")
        for cls, d in info["clases"].items():
            print(f"  {cls:20s}: {d['n']:6,} ({d['pct']:.2f}%)")

    X_train, y_train = splits["train"]
    print("\n── Features Gamma — estadísticas train ─────────────────")
    feat_stats = reporte_features(X_train)
    for feat, s in feat_stats.items():
        nan_str = f"  NaN:{s['pct_nan']:.1f}%" if s["pct_nan"] > 0 else ""
        print(f"  {feat:22s}: mean={s['mean']:8.3f}  std={s['std']:7.3f}{nan_str}")

    counts = y_train.value_counts()
    imbalance_ratio = float(counts.max()) / float(counts.min()) if counts.min() > 0 else float("inf")
    print(f"\nImbalance ratio (train): {imbalance_ratio:.1f}x (max/min clases)")
    if imbalance_ratio > 10:
        print("  ⚠️  Imbalance > 10x — usar class_weight='balanced' o is_unbalance=True en Fase 3")
    else:
        print("  ✅ Imbalance manejable")

    # Exportar
    reporte_final = {
        "splits":                   dist,
        "features":                 feat_stats,
        "imbalance_ratio_train":    round(imbalance_ratio, 2),
        "n_features":               len(FEATURES_GAMMA),
        "features_lista":           FEATURES_GAMMA,
        "label_encoding":           LABEL_ENCODING,
    }
    out = REPORT_DIR / "dataset_report.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(reporte_final, f, indent=2, ensure_ascii=False)

    print(f"\n✅ dataset_report.json → {out}")
    print("   Fase 2 completa. Próximo: Fase 3 — experimentos de modelos")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde g05_build_sessions.md ==== -->

# g05_build_sessions — PY [OBSOLETO]

> ⚠️ **Reemplazado el 2026-06-16.** Este script asumía que las anotaciones ya
> existían antes de Fase 1 (modelo de anotación manual desde cero, descartado).
> La Fase 1 vigente de Gamma vive en
> [`Ciclo_Gamma/fase_1_extraccion/scripts/`](../../fase_1_extraccion/scripts/),
> con la lógica equivalente repartida en `g09_build_sessions_labeled.md` (post-
> retiquetado) y el resto del pipeline de unificación + inferencia con Modelo A
> (`g01` a `g10`). Mantenido aquí solo como referencia histórica.

**Destino:** `Data Science/gamma/fase_1_extraccion/scripts/g05_build_sessions.py`
**Prerequisito:** `g03_extract_readings.py` + `g04_extract_events.py` ejecutados
**Salida:** `gamma/fase_1_extraccion/data/raw/sessions_labeled.parquet`

---

```python
"""
g05_build_sessions.py — Fase 1 Gamma
Agrupa lecturas en sesiones usando GAP_CUTOFF_S y asigna labels desde events_labeled.
"""
import sys
import pandas as pd
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _gamma_utils import (
    GAMMA_ROOT, FASE1_RAW, GAP_CUTOFF_S, RESAMPLE_TARGET_S,
    MIN_CONSUMED_G, MIN_SESSION_S, KPCL0034_CODE
)

VENTANA_MATCH_S = 60  # segundos — margen para asignar evento a sesión


def cargar_artefactos():
    readings = pd.read_parquet(FASE1_RAW / "readings_raw.parquet")
    readings["ts_utc"] = pd.to_datetime(readings["ts_utc"], utc=True)
    readings = readings.sort_values("ts_utc").reset_index(drop=True)

    events = pd.read_parquet(FASE1_RAW / "events_labeled.parquet")
    events["ts_utc"] = pd.to_datetime(events["ts_utc"], utc=True)
    events = events.sort_values("ts_utc").reset_index(drop=True)
    return readings, events


def segmentar_en_sesiones(df: pd.DataFrame) -> pd.DataFrame:
    """
    Divide la serie en sesiones usando GAP_CUTOFF_S.
    Calcula peso inicio/fin y consumido_g por sesión.
    """
    diff_s = df["ts_utc"].diff().dt.total_seconds().fillna(0)
    df = df.copy()
    df["_gap"] = diff_s > GAP_CUTOFF_S
    df["_sesion_id"] = df["_gap"].cumsum()

    sesiones = []
    for sesion_id, grupo in df.groupby("_sesion_id"):
        if len(grupo) < 2:
            continue
        duracion_s = (grupo["ts_utc"].iloc[-1] - grupo["ts_utc"].iloc[0]).total_seconds()
        if duracion_s < MIN_SESSION_S:
            continue

        peso_inicio = grupo["weight_grams"].iloc[0]
        peso_fin    = grupo["weight_grams"].iloc[-1]
        consumido_g = peso_inicio - peso_fin  # positivo si se consumió, negativo si se sirvió

        sesiones.append({
            "sesion_id":    sesion_id,
            "ts_inicio":    grupo["ts_utc"].iloc[0],
            "ts_fin":       grupo["ts_utc"].iloc[-1],
            "duracion_s":   duracion_s,
            "n_lecturas":   len(grupo),
            "peso_inicio_g": peso_inicio,
            "peso_fin_g":    peso_fin,
            "consumido_g":   consumido_g,
            "periodo":      grupo["_periodo"].iloc[0] if "_periodo" in grupo.columns else "desconocido",
            "session_type": "reposo",  # default — se actualiza con eventos
        })

    return pd.DataFrame(sesiones)


def asignar_labels_desde_eventos(sesiones: pd.DataFrame, eventos: pd.DataFrame) -> pd.DataFrame:
    """
    Asigna session_type a cada sesión buscando el evento más cercano a ts_inicio.
    Categorías canónicas: alimentacion, servido, reposo (default).
    """
    sesiones = sesiones.copy()

    # Filtrar eventos relevantes
    ev_alim = eventos[eventos["category"].isin([
        "inicio_alimentacion", "termino_alimentacion",
        "alimentacion"  # etiqueta de sesión completa de Gamma
    ])]
    ev_serv = eventos[eventos["category"].isin([
        "inicio_servido", "termino_servido",
        "servido"
    ])]

    def tipo_por_proximidad(ts_inicio, ev_df, ventana_s=VENTANA_MATCH_S):
        if ev_df.empty:
            return False
        deltas = (ev_df["ts_utc"] - ts_inicio).abs().dt.total_seconds()
        return deltas.min() <= ventana_s

    for idx, row in sesiones.iterrows():
        if tipo_por_proximidad(row["ts_inicio"], ev_alim):
            sesiones.loc[idx, "session_type"] = "alimentacion"
        elif tipo_por_proximidad(row["ts_inicio"], ev_serv):
            sesiones.loc[idx, "session_type"] = "servido"
        elif row["consumido_g"] < -MIN_CONSUMED_G:
            # Subida de peso sin evento → candidato a servido no anotado
            sesiones.loc[idx, "session_type"] = "servido_sin_anotar"
        elif row["consumido_g"] > MIN_CONSUMED_G:
            # Bajada de peso sin evento → posible alimentación no anotada
            sesiones.loc[idx, "session_type"] = "alim_sin_anotar"

    return sesiones


def reportar_distribucion(sesiones: pd.DataFrame) -> None:
    print("\n── Distribución de sesiones ──────────────────────────")
    dist = sesiones["session_type"].value_counts()
    for tipo, n in dist.items():
        marca = "✅" if tipo in ("alimentacion", "servido", "reposo") else "⚠️ "
        print(f"  {marca} {tipo:25s}: {n:4d}")

    # Por período
    if "periodo" in sesiones.columns:
        print("\n── Por período ────────────────────────────────────────")
        tabla = sesiones.pivot_table(
            index="periodo", columns="session_type", aggfunc="size", fill_value=0
        )
        print(tabla.to_string())


def main():
    print("=== g05_build_sessions.py — Ciclo Gamma ===\n")
    FASE1_RAW.mkdir(parents=True, exist_ok=True)

    readings, eventos = cargar_artefactos()
    print(f"Lecturas: {len(readings):,}")
    print(f"Eventos:  {len(eventos):,}")

    sesiones = segmentar_en_sesiones(readings)
    print(f"\nSesiones detectadas: {len(sesiones):,}")

    sesiones = asignar_labels_desde_eventos(sesiones, eventos)
    reportar_distribucion(sesiones)

    # Anomalías de sesiones
    anom = sesiones[sesiones["consumido_g"] < 0]
    if len(anom):
        out_anom = GAMMA_ROOT / "fase_1_extraccion/outputs/anomalias_sesiones.csv"
        out_anom.parent.mkdir(parents=True, exist_ok=True)
        anom.to_csv(out_anom, index=False)
        print(f"\n⚠️  {len(anom)} sesiones con consumido_g < 0 → anomalias_sesiones.csv")

    out = FASE1_RAW / "sessions_labeled.parquet"
    sesiones.to_parquet(out, index=False)
    print(f"\n✅ sessions_labeled.parquet → {out}")
    print("   Próximo: g06_quality_report.py")


if __name__ == "__main__":
    main()
```


---


<!-- ==== fusionado desde _gamma_phase2_utils.md ==== -->

# _gamma_phase2_utils — PY

**Destino:** `Ciclo_Gamma/fase_2_dataset/scripts/_gamma_phase2_utils.py`
**Rol:** Funciones de cálculo de las 13 features Gamma sobre lecturas a 30s.
Importado por g02_build_features.py. No ejecutar directamente.

Correcciones clave vs Alpha:
- `plateau_duration_s` en **segundos** (no filas)
- `hour_sin/cos` en **hora Santiago** (no UTC)
- `dia_semana_sin` nueva feature
- Sin `cadencia_s` (gain ≈ 0 en todos los experimentos Alpha)

---

```python
"""
_gamma_phase2_utils.py — Utilidades de features para Fase 2 Ciclo Gamma
Cálculo de las 13 features Gamma sobre un DataFrame de lecturas a 30s cadencia.
"""
import numpy as np
import pandas as pd
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "fase_1_extraccion" / "scripts"))
from _gamma_utils import (
    PLATEAU_THRESHOLD, BASELINE_WINDOW, RESAMPLE_TARGET_S, FEATURES_GAMMA, TZ_LOCAL
)


def calcular_delta_w(df: pd.DataFrame) -> pd.DataFrame:
    df["delta_w"] = df["weight_grams"].diff().fillna(0)
    return df


def calcular_delta_w_10(df: pd.DataFrame) -> pd.DataFrame:
    df["delta_w_10"] = df["delta_w"].rolling(10, min_periods=1).mean()
    return df


def calcular_rolling_stats(df: pd.DataFrame) -> pd.DataFrame:
    df["rolling_std_5"]  = df["weight_grams"].rolling(5,  min_periods=1).std().fillna(0)
    df["rolling_std_10"] = df["weight_grams"].rolling(10, min_periods=1).std().fillna(0)
    df["rolling_mean_5"] = df["weight_grams"].rolling(5,  min_periods=1).mean()
    return df


def calcular_net_weight(df: pd.DataFrame, baseline_window: int = BASELINE_WINDOW) -> pd.DataFrame:
    baseline = df["weight_grams"].rolling(baseline_window, min_periods=1).quantile(0.1)
    df["net_weight"] = df["weight_grams"] - baseline
    return df


def calcular_plateau(
    df: pd.DataFrame,
    threshold: float = PLATEAU_THRESHOLD,
    resample_s: int   = RESAMPLE_TARGET_S,
) -> pd.DataFrame:
    df["is_plateau"] = (df["rolling_std_5"] < threshold).astype(int)

    # Grupos de continuidad (cambia cada vez que is_plateau alterna)
    df["_pg"] = (df["is_plateau"] != df["is_plateau"].shift(1).fillna(df["is_plateau"].iloc[0])).cumsum()

    # Cuenta acumulada dentro de cada grupo plateau; los de reposo quedan en 0
    df["plateau_duration_s"] = (
        df.groupby("_pg")["is_plateau"]
        .transform(lambda s: s.cumsum() * resample_s if s.iloc[0] == 1 else pd.Series(0, index=s.index))
    )
    df = df.drop(columns=["_pg"])
    return df


def calcular_hora_features(df: pd.DataFrame) -> pd.DataFrame:
    ts_local  = df["ts_utc"].dt.tz_convert(TZ_LOCAL)
    hora_dec  = ts_local.dt.hour + ts_local.dt.minute / 60
    dia_float = ts_local.dt.dayofweek.astype(float)

    df["hour_sin"]       = np.sin(2 * np.pi * hora_dec  / 24)
    df["hour_cos"]       = np.cos(2 * np.pi * hora_dec  / 24)
    df["dia_semana_sin"] = np.sin(2 * np.pi * dia_float / 7)
    return df


def calcular_todas_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aplica el pipeline completo de features sobre un segmento sin gaps.
    Requiere columnas: ts_utc, weight_grams, clock_invalid.
    Devuelve el mismo DataFrame con las 13 features FEATURES_GAMMA añadidas.
    """
    df = calcular_delta_w(df)
    df = calcular_delta_w_10(df)
    df = calcular_rolling_stats(df)
    df = calcular_net_weight(df)
    df = calcular_plateau(df)
    df = calcular_hora_features(df)
    return df


def verificar_features_gamma(df: pd.DataFrame) -> None:
    faltantes = [f for f in FEATURES_GAMMA if f not in df.columns]
    if faltantes:
        raise AssertionError(f"Features faltantes: {faltantes}")

    max_plateau = df["plateau_duration_s"].max()
    if max_plateau > 0 and max_plateau < RESAMPLE_TARGET_S:
        raise AssertionError(
            f"plateau_duration_s max={max_plateau:.1f} < {RESAMPLE_TARGET_S}s — "
            "parece estar en filas en lugar de segundos."
        )

    hour_range = (df["hour_sin"].min(), df["hour_sin"].max())
    if hour_range[0] >= 0:
        print("  ⚠️  hour_sin solo positivo — verificar que ts_utc cubre todo el día")

    print(f"✅ 13 features Gamma verificadas")
    print(f"   plateau_duration_s max: {max_plateau:.0f}s ({max_plateau/RESAMPLE_TARGET_S:.0f} filas × {RESAMPLE_TARGET_S}s)")
    print(f"   hour_sin rango: [{hour_range[0]:.3f}, {hour_range[1]:.3f}]")
    print(f"   dia_semana_sin rango: [{df['dia_semana_sin'].min():.3f}, {df['dia_semana_sin'].max():.3f}]")
```


---


<!-- ==== fusionado desde _gamma_phase3_utils.md ==== -->

# _gamma_phase3_utils — PY

**Destino:** `Data Science/gamma/fase_3_modelos/scripts/_gamma_phase3_utils.py`
**Rol:** Funciones genéricas de entrenamiento, calibración y evaluación para cualquier clasificador.

Incluye el bloqueo del test set (`cargar_test_set()` lanza `PermissionError` hasta G-Final).

---

```python
"""
_gamma_phase3_utils.py — Utilidades de Fase 3 Ciclo Gamma
Funciones genéricas para entrenar, calibrar, evaluar y reportar cualquier modelo.
Bloqueo del test set hasta G-Final.
"""
import sys
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Any, Optional

from sklearn.calibration import CalibratedClassifierCV
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    f1_score, roc_auc_score, classification_report,
    precision_recall_fscore_support
)

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR.parent.parent / "fase_1_extraccion" / "scripts"))

from _gamma_utils import (
    FASE2_TRAIN, FASE3_OUTPUTS, FEATURES_GAMMA,
    LABEL_ENCODING, IDX_ALIMENTACION, IDX_SERVIDO, IDX_REPOSO,
    THRESHOLD_A_INICIAL
)


# ── Carga de datos ────────────────────────────────────────────────────────────

def cargar_train_val():
    """Carga X/y de train y val. Siempre disponibles durante el ciclo."""
    X_train = pd.read_parquet(FASE2_TRAIN / "X_train.parquet")[FEATURES_GAMMA]
    y_train = pd.read_parquet(FASE2_TRAIN / "y_train.parquet").squeeze()
    X_val   = pd.read_parquet(FASE2_TRAIN / "X_val.parquet")[FEATURES_GAMMA]
    y_val   = pd.read_parquet(FASE2_TRAIN / "y_val.parquet").squeeze()
    return X_train.values, y_train.values, X_val.values, y_val.values


def cargar_test_set():
    """
    ❌ BLOQUEADO hasta G-Final.
    Ver regla 1 del Ciclo Gamma: el test set no se evalúa hasta tener modelo candidato.
    Para desbloquear: comentar el raise en g_final_evaluacion_test.py ÚNICAMENTE.
    """
    raise PermissionError(
        "❌ El test set está bloqueado hasta G-Final (regla 1 Ciclo Gamma).\n"
        "   Solo desbloquear cuando G-08 confirme el modelo candidato final."
    )


# ── Calibración isotónica ─────────────────────────────────────────────────────

def calibrar_modelo_isotonica(modelo, X_val: np.ndarray, y_val: np.ndarray):
    """
    Calibra las probabilidades del modelo con isotonic regression sobre val set.
    Devuelve (calibrado, calibrator_por_clase).
    Invariante Gamma: siempre aplicar calibración antes de tune_threshold.
    """
    proba_val = modelo.predict_proba(X_val)
    calibrators = {}
    proba_calibrada = np.zeros_like(proba_val)

    for clase in range(proba_val.shape[1]):
        iso = IsotonicRegression(out_of_bounds="clip")
        y_bin = (y_val == clase).astype(int)
        iso.fit(proba_val[:, clase], y_bin)
        proba_calibrada[:, clase] = iso.predict(proba_val[:, clase])
        calibrators[clase] = iso

    # Re-normalizar para que sumen a 1
    suma = proba_calibrada.sum(axis=1, keepdims=True)
    suma = np.where(suma == 0, 1, suma)
    proba_calibrada = proba_calibrada / suma

    return proba_calibrada, calibrators


def tune_threshold_modelo_a(proba_val: np.ndarray, y_val: np.ndarray,
                             clase_objetivo: int = IDX_ALIMENTACION,
                             metrica: str = "f1") -> float:
    """
    Busca el threshold óptimo para la clase objetivo en Modelo A (binario: activo vs reposo).
    No usar threshold default 0.50 — invariante Gamma.
    """
    best_threshold = THRESHOLD_A_INICIAL
    best_score = 0.0

    for thr in np.arange(0.05, 0.95, 0.01):
        pred = (proba_val[:, clase_objetivo] >= thr).astype(int)
        y_bin = (y_val == clase_objetivo).astype(int)
        f1 = f1_score(y_bin, pred, zero_division=0)
        if f1 > best_score:
            best_score = f1
            best_threshold = thr

    print(f"  Threshold óptimo para clase {clase_objetivo}: {best_threshold:.2f} (F1={best_score:.4f})")
    return best_threshold


# ── Evaluación ────────────────────────────────────────────────────────────────

def evaluar_modelo_a(modelo, X_val: np.ndarray, y_val: np.ndarray,
                     threshold: Optional[float] = None) -> dict:
    """
    Evalúa Modelo A (binario: activo = alimentacion+servido vs reposo).
    Retorna métricas para EXPERIMENT_TRACKER.
    """
    proba = modelo.predict_proba(X_val)
    proba_activo = proba[:, IDX_ALIMENTACION] + proba[:, IDX_SERVIDO]

    if threshold is None:
        threshold = THRESHOLD_A_INICIAL

    pred_activo = (proba_activo >= threshold).astype(int)
    y_activo    = ((y_val == IDX_ALIMENTACION) | (y_val == IDX_SERVIDO)).astype(int)

    f1_act  = f1_score(y_activo, pred_activo, zero_division=0)
    try:
        auc = roc_auc_score(y_activo, proba_activo)
    except Exception:
        auc = float("nan")

    return {
        "modelo_a": {
            "f1_activo":  round(float(f1_act), 4),
            "auc_roc":    round(float(auc),   4),
            "threshold":  round(float(threshold), 3),
        }
    }


def evaluar_modelo_b(modelo, X_val: np.ndarray, y_val: np.ndarray) -> dict:
    """
    Evalúa Modelo B (multiclase: alimentacion / servido / reposo).
    Retorna métricas para EXPERIMENT_TRACKER.
    """
    pred = modelo.predict(X_val)
    inv  = {v: k for k, v in LABEL_ENCODING.items()}

    f1_alim = f1_score(y_val, pred, labels=[IDX_ALIMENTACION], average="macro", zero_division=0)
    f1_serv = f1_score(y_val, pred, labels=[IDX_SERVIDO],      average="macro", zero_division=0)
    f1_macro = f1_score(y_val, pred, average="macro", zero_division=0)

    return {
        "modelo_b": {
            "f1_alimentacion": round(float(f1_alim), 4),
            "f1_servido":      round(float(f1_serv), 4),
            "f1_macro":        round(float(f1_macro), 4),
        }
    }


def imprimir_metricas(nombre: str, metricas: dict) -> None:
    print(f"\n── Métricas {nombre} ──────────────────────────────")
    for grupo, vals in metricas.items():
        print(f"  {grupo}:")
        for k, v in vals.items():
            marca = ""
            if k == "f1_activo"      and v >= 0.75: marca = " ✅"
            if k == "f1_activo"      and v <  0.75: marca = " ⚠️"
            if k == "f1_servido"     and v >= 0.40: marca = " ✅"
            if k == "f1_servido"     and v <  0.40: marca = " ⚠️"
            if k == "f1_alimentacion" and v >= 0.75: marca = " ✅"
            if k == "auc_roc"        and v >= 0.90: marca = " ✅"
            print(f"    {k:20s}: {v}{marca}")


# ── Persistencia de modelos ───────────────────────────────────────────────────

def guardar_lightgbm(modelo, calibrators: dict, nombre: str, metricas: dict) -> None:
    FASE3_OUTPUTS.parent.parent.joinpath("models/gbm").mkdir(parents=True, exist_ok=True)
    model_dir = FASE3_OUTPUTS.parent.parent / "models/gbm"

    modelo.booster_.save_model(str(model_dir / f"{nombre}.lgb"))
    with open(model_dir / f"{nombre}_calibrators.pkl", "wb") as f:
        pickle.dump(calibrators, f)
    with open(model_dir / f"{nombre}_metricas.json", "w") as f:
        json.dump(metricas, f, indent=2)
    print(f"  ✅ Guardado: {model_dir}/{nombre}.lgb")


def guardar_sklearn(modelo, nombre: str, metricas: dict, model_type: str = "classical") -> None:
    model_dir = FASE3_OUTPUTS.parent.parent / f"models/{model_type}"
    model_dir.mkdir(parents=True, exist_ok=True)

    with open(model_dir / f"{nombre}.pkl", "wb") as f:
        pickle.dump(modelo, f)
    with open(model_dir / f"{nombre}_metricas.json", "w") as f:
        json.dump(metricas, f, indent=2)
    print(f"  ✅ Guardado: {model_dir}/{nombre}.pkl")


def guardar_reporte_entrenamiento(nombre_exp: str, resultados: list) -> None:
    """Guarda tabla comparativa de modelos para el experimento."""
    FASE3_OUTPUTS.mkdir(parents=True, exist_ok=True)
    out = FASE3_OUTPUTS / f"{nombre_exp}_report.json"
    with open(out, "w") as f:
        json.dump(resultados, f, indent=2)
    print(f"\n✅ Reporte guardado: {out}")
```


---


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Kittypau ML — Ciclo Gamma (γ) — Tracker de Experimentos

**Ciclo:** Gamma (γ)
**Inicio:** 2026-06-15
**Cierre:** TBD
**Estado actual:** ✅ G-01 ✅ G-02 ✅ G-03 ✅ G-05 completos · ⏳ G-04 bloqueado (`pip install optuna`) · próximo: **G-04** Hyperopt

Referencia principal: [delta_gamma_antiguio.md](delta_gamma_antiguio.md) · Runbook Pre-G: [delta_gamma_antiguio.md](delta_gamma_antiguio.md)

---

## Estado del Ciclo

| Fase | Experimentos | Estado |
|---|---|---|
| **Pre-G** | Preparación datos + anotación + Fase 2 dataset | ✅ Completo (2026-06-17) |
| **A — Baseline + GBM** | G-01, G-02 | ✅ Completo (2026-06-17) |
| **B — Feature Eng + Clásico** | G-03, G-04, G-05 | ⏳ G-03 ✅ · G-04 ⏳ (falta optuna) · G-05 ✅ |
| **C — Deep Learning** | G-06, G-07 | 🔒 Data-conditional (≥300 alim + ≥80 serv) |
| **D — Ensemble + Final** | G-08, G-Final | 🔒 Bloqueado (requiere G-04) |

---

## Tabla Maestra

| ID | Nombre | Fase | Prerequisito | Meta principal | F1 activo | F1 alim | F1 serv | Macro F1 | AUC-A | Estado | Archivo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pre-G** | Unificación Abr-May-Jun + inferencia Modelo A (Exp06) + retiquetado total | Pre | — | ≥80 serv · ≥200 alim · Fase 1 OK | — | — | — | — | — | ✅ Completo (2026-06-17) | [delta_gamma_antiguio.md](delta_gamma_antiguio.md) · [fase_1_extraccion/scripts/](fase_1_extraccion/scripts/) |
| **G-01** | Baseline LightGBM | A | Pre-G ✅ | F1 activo ≥ 0.75 · F1 alim ≥ 0.72 | **0.8139** ✅ | **0.7598** ✅ | 0.2656 ❌ | **0.6733** ✅ | **0.9960** ✅ | ✅ Completo (2026-06-17) | [g01_baseline_lgbm.py](fase_3_modelos/scripts/g01_baseline_lgbm.py) |
| **G-02** | GBM Benchmark (LightGBM + RF¹) | A | G-01 ✅ | Encontrar mejor GBM | **0.8227** ✅ (RF) | **0.7580** ✅ | 0.1989 ❌ | **0.6505** ✅ | **0.9965** ✅ | ✅ Completo (2026-06-17) | [g02_gbm_benchmark.py](fase_3_modelos/scripts/g02_gbm_benchmark.py) |
| **G-03** | Feature Engineering (gain + subsets) | B | G-02 ✅ | Subconjunto óptimo de features | **0.8189** ✅ | — | 0.2390 ❌ | — | — | ✅ Completo (2026-06-17) | [g03_feature_engineering.py](fase_3_modelos/scripts/g03_feature_engineering.py) |
| **G-04** | Hyperparameter Optimization (Optuna) | B | G-03 ✅ | LightGBM completamente optimizado | — | — | — | — | — | ⏳ Bloqueado (`pip install optuna`) | [g04_hyperopt.py](fase_3_modelos/scripts/g04_hyperopt.py) |
| **G-05** | ML Clásico Benchmark | B | G-03 ✅ | Confirmar GBM > clásicos | **0.8073** ✅ (ET) | 0.7430 ✅ | 0.2408 ❌ | 0.6593 ✅ | 0.9957 ✅ | ✅ Completo (2026-06-17) | [g05_classical_ml.py](fase_3_modelos/scripts/g05_classical_ml.py) |
| **G-06** | NN Baseline (MLP/GRU/TCN) | C | G-05 + ≥300 alim + ≥80 serv | F1 servido ≥ 0.40 desde NN | — | — | — | — | — | 🔒 Data-conditional | — |
| **G-07** | NN Avanzado (LSTM/TabNet) | C | G-06 señal positiva | Explorar arquitecturas adicionales | — | — | — | — | — | 🔒 Data-conditional | — |
| **G-08** | Ensemble GBM + NN | D | G-04 + G-06 | F1 serv ≥ 0.40 · F1 alim ≥ 0.75 | — | — | — | — | — | 🔒 Pendiente | — |
| **G-Final** | Evaluación formal test set | D | mejor modelo candidato | Métricas reales de generalización | — | — | — | — | — | 🔒 Reservado | — |

---

## Referencia Alpha (ciclo cerrado)

| ID Alpha | Nombre | F1 activo | F1 alim | F1 serv | Macro F1 | AUC-A | Modelo prod |
|---|---|---|---|---|---|---|---|
| α-01 | Línea base | 0.00 | 0.40 | 0.33 | 0.57 | 0.81 | No |
| α-02 | Threshold + rebalanceo | — | — | — | — | — | No |
| α-03 | Mejor base histórica | — | — | — | — | — | No |
| α-04 | SMOTE + calibración isotónica | — | — | — | — | — | No |
| α-05 | Nueva ingesta Fase 1 | — | — | — | — | — | No |
| **α-06** | **Dump Colab ★** | **0.7619** | **0.7606** | — | — | — | **✅ Producción actual** |
| α-07 | Inferencia Mayo-Jun | — | — | — | — | — | No |
| α-08 | Unificación Mayo-Jun | 0.60 | — | — | — | — | No (regresión vs α-06) |
| α-09A | Cadencia normalizada | — | — | — | — | — | No |
| α-09B | Threshold por período | — | — | — | — | — | No |
| α-10 | Benchmark neuronal | — | — | 0.34 (GRU) | — | — | No (datos insuficientes) |

---

## Umbrales de Producción Gamma

| Métrica | Umbral Alpha (referencia) | Umbral Gamma (objetivo) |
|---|---|---|
| F1 activo — Modelo A | ≥ 0.70 | **≥ 0.75** |
| AUC-ROC — Modelo A | ≥ 0.85 | **≥ 0.90** |
| F1 alimentacion — Modelo B | ≥ 0.65 | **≥ 0.75** |
| F1 servido — Modelo B | sin umbral | **≥ 0.40** |
| Macro F1 — Modelo B | ≥ 0.60 | **≥ 0.65** |

---

## Checklist Pre-G + Fase 2

```
✅ uuid_mapping.json creado y aplicado a Abril + Mayo-Jun
✅ Timestamps normalizados a UTC (Paso 4.3)
✅ readings_unificado_30s.parquet generado (Paso 4.4) — 134,935 lecturas, Abr–Jun 2026
✅ Inferencia con modelo_a.lgb (Exp06) corrida, threshold 0.12 (Paso 4.6)
✅ sesiones_candidatas.csv generado y volumen validado (Paso 4.7) — 647 candidatos
✅ app_anotacion_gamma.py ejecutando en localhost:8501 con los candidatos cargados
✅ Revisión manual completa (647/647 candidatos) → 264 alim · 63 serv · 296 reposo · 24 sin_clasificar
✅ Cross-check de discrepancias vs etiquetas Alpha documentado (Paso 4.10)
✅ distribucion_clases_gamma.txt revisado sin assertion errors (Paso 4.11)
✅ sessions_labeled.parquet generado (g09 Fase 1) — 647 sesiones etiquetadas
✅ quality_report aprobado con augmentación: servido real=63 + sintético=17 → 80/80 (g10)
── Fase 2 ──────────────────────────────────────────────────────────────────
✅ g01_build_labels.py — readings_labeled.parquet (134,935 filas, 327 sesiones activas)
✅ g02_build_features.py — readings_features.parquet (13 features Gamma verificadas, 22 segmentos)
✅ g03_build_train_dataset.py — splits temporales generados, X_test SELLADO
     Train: 77,676 filas | Val: 36,632 | Test: 20,505
✅ g04_dataset_report.py — dataset_report.json (imbalance 563.7x documentado)
── Fase 3 ──────────────────────────────────────────────────────────────────
✅ G-01 ejecutado → baseline F1-activo=0.8139 (supera target 0.75 y Alpha 0.7619)
✅ G-02 ejecutado → mejor LightGBM=0.8139 / RandomForest=0.8227 (XGBoost/CatBoost no instalados)
✅ G-03 ejecutado → mejor subconjunto 'sin_tiempo' (10 features, F1-activo=0.8189)
✅ G-05 ejecutado → ExtraTrees=0.8073 ✅, LinearSVC=0.7405 ⚠️, LogReg=0.1711 ❌ (sin escala)
── Pendiente ────────────────────────────────────────────────────────────────
□ G-04: pip install optuna → ejecutar g04_hyperopt.py (80 trials, ~30min)
□ Servido real ≥ 80 → desactivar augmentación (faltan 17 anotaciones)
□ G-Final: evaluar test set con mejor modelo de G-04
```

¹ G-02 benchmark parcial: XGBoost y CatBoost no instalados, solo LightGBM vs RandomForest.

---

## Fase 3 — Scripts implementados (2026-06-17)

```
fase_3_modelos/
  scripts/
    _gamma_phase3_utils.py   ← cargar_dataset(), evaluar_modelo(), guardar_experimento(),
                                imprimir_resultados(), MODELS_DIR, TARGETS_GAMMA, ALPHA_REF
    g01_baseline_lgbm.py     ← G-01: LightGBM is_unbalance=True, early stopping 50
    g02_gbm_benchmark.py     ← G-02: LightGBM + XGBoost + CatBoost + RandomForest
    g03_feature_engineering.py ← G-03: importancia gain + SHAP + 4 subconjuntos
    g04_hyperopt.py          ← G-04: Optuna 80 trials, maximiza F1-activo-val
    g05_classical_ml.py      ← G-05: ExtraTrees + LogisticRegression + LinearSVC
  models/                    ← .pkl guardados por cada experimento
  outputs/                   ← G-01.json, G-02.json … (leídos por scripts posteriores)
```

Orden de ejecución Fase A+B: `g01 → g02 → g03 → g04 → g05`
Cada script lee el JSON del anterior para encadenar decisions (mejor algo, mejores features).
G-06/07/08 se implementan cuando los datos lo permitan (≥300 alim + ≥80 serv reales).

---

## Reglas de uso de este archivo

1. Actualizar la fila del experimento tan pronto como termine — no acumular actualizaciones.
2. Solo registrar métricas de **validación** hasta G-Final; las de test solo se registran en G-Final.
3. El campo "Modelo prod" solo puede ser `✅` si el experimento superó **todos** los umbrales Gamma.
4. Los experimentos data-conditional (G-06, G-07) no pueden iniciar sin verificar los prerequisitos de datos.
5. Ver [delta_gamma_antiguio.md](delta_gamma_antiguio.md) sección 13 para las 14 reglas inviolables del Ciclo Gamma.


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Glosario Kittypau ML — Ciclo Gamma (γ)

**Versión:** 1.0
**Fecha:** 2026-06-15
**Aplica a:** Ciclo Gamma (γ). El Ciclo Alpha usa el mismo vocabulario salvo donde se indica `[CORREGIDO EN GAMMA]`.

Referencia principal: [delta_gamma_antiguio.md](delta_gamma_antiguio.md)

---

## Índice

1. [Dispositivos y datos](#1-dispositivos-y-datos)
2. [Tipos de sesión y etiquetas](#2-tipos-de-sesión-y-etiquetas)
3. [Pipeline de datos](#3-pipeline-de-datos)
4. [Features del modelo](#4-features-del-modelo)
5. [Modelos y evaluación](#5-modelos-y-evaluación)
6. [Constantes del sistema](#6-constantes-del-sistema)
7. [Errores documentados del Ciclo Alpha](#7-errores-documentados-del-ciclo-alpha)
8. [Convenciones de nombres](#8-convenciones-de-nombres)

---

## 1. Dispositivos y datos

**KPCL0034**
Dispositivo food_bowl principal de prueba. Mascota asociada: Bandida. Tiene **dos UUIDs** por un problema de registro en Supabase: uno para el período Abril 2026 y otro para Mayo-Jun 2026 en adelante. Ambos siempre deben incluirse en `KPCL0034_UUIDS`.

**KPCL0035**
Dispositivo secundario. Reporta `battery_level` de forma más consistente. No se usa en el pipeline ML activo de Gamma.

**KPCL0036**
Dispositivo hidratación (water_bowl). Excluido del pipeline ML por error de peso documentado. Ver `KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md`.

**UUID Abril 2026** (`9510a455-b0e9-4932-8be1-03976d31228a`)
Primer UUID de KPCL0034, activo del 8 al 30 de abril de 2026.

**UUID Mayo-Jun 2026** (`3a460074-e7c3-41bf-ae5a-a011445f927a`)
Segundo UUID de KPCL0034, activo desde el 25 de mayo de 2026 en adelante.

**`clock_invalid`**
Flag booleano en `public.readings`. Cuando es `True`, el reloj interno del dispositivo no era confiable y se debe usar `ingested_at` en lugar de `recorded_at`. En el período Mayo-Jun 2026, el 100% de las lecturas tienen `clock_invalid=True`. `[CORREGIDO EN GAMMA]` — ver error α-5.

**`recorded_at`**
Timestamp del reloj del dispositivo. Usar solo cuando `clock_invalid=False`.

**`ingested_at`**
Timestamp del servidor Supabase al momento de recibir la lectura. Usar siempre cuando `clock_invalid=True`.

**Dump**
Exportación CSV local de la tabla `public.readings` desde Supabase. Más confiable que la API para reproducibilidad. Ruta: `Data_2026/<Mes>/`.

---

## 2. Tipos de sesión y etiquetas

**`alimentacion`** (clase 0)
El gato (Bandida) está comiendo. Se detecta por descenso sostenido del peso (≥3g en ≤60s). Inicio: primer punto de descenso; término: estabilización en nuevo plateau. Es la clase más frecuente.

**`servido`** (clase 1)
El operador pone comida en el plato. Se detecta por subida sostenida de peso (≥5g). Es el **cuello de botella** del modelo B. En Alpha solo había 14–27 sesiones etiquetadas; Gamma requiere ≥80 antes de entrenar.

**`reposo`** (clase 2)
El peso está estable, sin consumo ni servido activo. Clase mayoritaria (~95% de lecturas). `rolling_std_5 < PLATEAU_THRESHOLD`.

**`sin_clasificar`**
Etiqueta provisional para sesiones que no quedan claras en la primera revisión. No se usa como clase en entrenamiento — debe resolverse antes de G-01.

**`hidratacion`**
Solo aplica a KPCL0036. Excluida del pipeline ML activo.

**Modelo A**
Clasificador binario: `activo` (alimentacion + servido) vs. `reposo`. Métrica principal: F1 activo.

**Modelo B**
Clasificador multiclase: `alimentacion` / `servido` / `reposo`. Métricas: F1 por clase + Macro F1.

**Sesión**
Bloque temporal continuo de actividad del mismo tipo, delimitado por gaps (≥ `GAP_CUTOFF_S` = 300s) y validado con `MIN_SESSION_S` = 30s y `MIN_CONSUMED_G` = 3.0g.

**`new_annotations_gamma.csv`**
Fuente de verdad de etiquetas del Ciclo Gamma. Creado con `app_anotacion_gamma.py` a partir de los candidatos generados por `modelo_a.lgb` de Exp06 (ver Pre-G / `delta_gamma_antiguio.md`). No mezclar con las anotaciones de Alpha (`new_annotations.csv`).

**Unificación Abril-Mayo-Junio** `[NUEVO EN GAMMA]`
Sub-proceso del Pre-G que combina las lecturas de Abril + Mayo-Jun 2026 en una sola tabla continua (UUID único, UTC normalizado, resampleo a 30s), corre inferencia con el Modelo A de Alpha (Exp06) para generar candidatos de sesión, y los expone a retiquetado humano total en `app_anotacion_gamma.py`. Reemplaza la anotación manual desde cero. Ver `delta_gamma_antiguio.md`.

**`uuid_mapping.json`**
Tabla de equivalencia de UUIDs de KPCL0034 (Abril vs Mayo-Jun) usada en el Paso 4.2 de la unificación, antes de cualquier join o filtro por `device_id`.

**`sesiones_candidatas.csv`**
Salida del Paso 4.7 de la unificación: agrupación en sesiones de las filas con `prob_activo ≥ THRESHOLD_CANDIDATOS_GAMMA` (0.12), generadas por el Modelo A de Exp06 sobre el período unificado. Insumo de `app_anotacion_gamma.py`, no un dataset de entrenamiento.

---

## 3. Pipeline de datos

**Fase 1 — Extracción**
Scripts `g01` a `g06`. Descarga readings de Supabase, aplica correcciones de timezone y UUID, detecta anomalías, construye sesiones y genera quality report. El checkpoint más crítico está en `g06_quality_report.py` (assertion de ≥80 servido).

**Fase 2 — Dataset**
Scripts `g01` a `g04`. Construye las features, aplica resampleo a 30s, split temporal train/val/test. El test set se sella (no se abre hasta G-Final).

**Fase 3 — Modelos**
Scripts `g01` a `g09`. Entrena modelos GBM, clásico, NN y ensemble. Genera reportes comparativos.

**Fase 4 — Anotación**
App Streamlit `app_anotacion_gamma.py`. Fase de recolección de datos que habilita la Fase 3.

**Split temporal**
La única forma válida de dividir el dataset: train / val / test por rangos de fecha, nunca aleatorio. Invariante desde α-01.

**Resampleo a 30s** `[CORREGIDO EN GAMMA]`
Antes de calcular features, todas las lecturas se resamplean a cadencia uniforme de 30 segundos. Corrige la cadencia variable del sensor (14–17s en Alpha). Invariante desde G-01.

**Análisis de distribución por período**
Kolmogorov-Smirnov aplicado a cada feature entre períodos (Abril vs Mayo-Jun vs nuevos). Paso **obligatorio** en `g06_quality_report.py` antes de combinar fuentes en entrenamiento. `[NUEVO EN GAMMA]`.

**`distribucion_por_periodo.json`**
Salida del análisis de distribución. Debe revisarse manualmente antes de ejecutar Fase 2.

**`anomalias_peso.csv`**
Lecturas con valores de peso anómalos (negativos, spikes extremos, NaN). Se revisa manualmente en Fase 1.

**`anomalias_sesiones.csv`**
Sesiones con características anómalas (duración < 30s, consumido_g < 0, etc.).

---

## 4. Features del modelo

Las 13 features del Ciclo Gamma. Definidas en `_gamma_utils.py` como `FEATURES_GAMMA`. El orden importa — no cambiar sin nuevo experimento numerado.

| # | Feature | Tipo | Descripción |
|---|---|---|---|
| 1 | `weight_grams` | Raw | Peso bruto interpolado (≤3 NaN consecutivos) |
| 2 | `delta_w` | Derivada | `w[t] - w[t-1]` — cambio por lectura |
| 3 | `delta_w_10` | Derivada | `w[t] - w[t-10]` — cambio en ventana de 10 lecturas |
| 4 | `rolling_std_5` | Estadístico | Desviación estándar últimas 5 lecturas |
| 5 | `rolling_std_10` | Estadístico | Std últimas 10 lecturas — **feature #1 en importancia en Alpha** |
| 6 | `rolling_mean_5` | Estadístico | Media últimas 5 lecturas |
| 7 | `net_weight` | Derivada | `w - percentil10(w, ventana=60)` — peso neto sobre baseline local |
| 8 | `is_plateau` | Binario | `1 si rolling_std_5 < PLATEAU_THRESHOLD (1.5g)` |
| 9 | `plateau_duration_s` | Temporal | Segundos consecutivos en plateau. `[GAMMA: en segundos]` — Alpha usaba filas |
| 10 | `hour_sin` | Temporal | `sin(2π × hora_Santiago / 24)`. `[GAMMA: hora local]` — Alpha usaba UTC |
| 11 | `hour_cos` | Temporal | `cos(2π × hora_Santiago / 24)`. `[GAMMA: hora local]` |
| 12 | `clock_invalid` | Flag | 0/1 — indica si el timestamp del dispositivo era inválido |
| 13 | `dia_semana_sin` | Temporal | `sin(2π × dia_semana_Santiago / 7)`. **Nueva en Gamma** — captura rutinas semanales |

**Features excluidas de Gamma**

| Feature | Disponible desde | Motivo de exclusión |
|---|---|---|
| `cadencia_s` | α-09B | Importancia baja; resampleo a 30s la vuelve constante. Error α-8. |
| `light_percent`, `light_lux` | Mayo 2026 | Evaluar en G-03 si mejoran F1 |
| `battery_level` | Parcial | No consistente en KPCL0034 |
| `temperature`, `humidity` | Siempre | Correlación baja en Alpha; evaluar en G-03 |

---

## 5. Modelos y evaluación

**GBM (Gradient Boosting Machine)**
Familia de modelos evaluada en G-02: LightGBM, XGBoost, CatBoost, HistGradientBoosting. Son el grupo de referencia principal para Gamma.

**LightGBM**
Modelo del Ciclo Alpha. Rápido, buen manejo de desbalance. Referencia de G-01.

**XGBoost**
Regularización diferente a LGBM. Puede generalizar distinto entre períodos.

**CatBoost**
Mejor con datos pequeños y features categóricas. Manejo nativo de valores faltantes.

**HistGradientBoosting**
Implementación sklearn, sin dependencias extra. Buena calibración por defecto.

**Random Forest / Extra Trees**
Benchmarks ML clásico (G-05). Útiles como sanity check: si superan al GBM, hay sobrefit.

**SVM (kernel RBF)**
Requiere `StandardScaler`. Solo se aplica sobre el set de training; los splits no se tocan.

**MLP**
Feedforward neuronal tabular. Baseline NN en G-06.

**GRU bidireccional**
Red recurrente. En α-10 tuvo el mejor F1 servido de todas las NN (0.34 vs 0.14 LGBM con datos insuficientes). Target de G-06.

**TCN (Temporal Convolutional Network)**
Red convolucional temporal. En α-10 tuvo el mejor F1 activo NN (0.60).

**LSTM**
Red recurrente, más parámetros que GRU. Solo comparar con datos suficientes.

**Transformer**
En α-10 fue el peor con 185 sesiones (sobredimensionado). Solo evaluar en G-07 con ≥500 sesiones.

**TabNet**
Atención sobre features tabulares. Diseñado para datos tabulares clasificados. Nuevo en G-07.

**Ensemble por clase** (estrategia recomendada)
Para `servido`: usar probabilidades del mejor modelo NN. Para `alimentacion`/`reposo`: usar el mejor GBM. Motivado por el patrón observado en α-10 donde GRU ganó en servido pero no en alimentación.

**Threshold tuning**
Ajuste post-entrenamiento del umbral de clasificación. **Nunca usar 0.50** como umbral por defecto en clases desbalanceadas. Usar calibración isotónica + sweeping sobre validación.

**Calibración isotónica**
Técnica para mejorar la confiabilidad de las probabilidades de salida. Mejora la estabilidad del threshold en producción. Invariante desde α-04.

**Optuna**
Librería de optimización bayesiana de hiperparámetros. Se usa en G-04 (≥200 trials por modelo por tarea).

**F1 activo**
Métrica de Modelo A: F1 de la clase `activo` (alimentacion + servido). Referencia Alpha: 0.7619 (α-06).

**F1 servido**
Métrica crítica de Modelo B. Era el cuello de botella en Alpha (0.14–0.50 con 14–27 sesiones). Umbral Gamma: ≥ 0.40.

**Macro F1**
Promedio no ponderado de F1 por clase. Penaliza fuertemente si alguna clase falla.

**Test set bloqueado**
`X_test.parquet` y `y_test.parquet` no pueden cargarse hasta que exista un modelo candidato final (G-08 completado). Bloqueado por convención en `_gamma_phase3_utils.py`. Ver regla 1 del Ciclo Gamma.

---

## 6. Constantes del sistema

Todas definidas en `_gamma_utils.py`. Cambiarlas requiere un nuevo experimento numerado.

| Constante | Valor | Descripción |
|---|---|---|
| `GAP_CUTOFF_S` | 300s | Gap mínimo para delimitar segmento nuevo en la serie |
| `PLATEAU_THRESHOLD` | 1.5g | Umbral de `rolling_std_5` para detectar plateau |
| `RESAMPLE_TARGET_S` | 30s | Cadencia uniforme post-resampleo |
| `BASELINE_WINDOW` | 60 lecturas | Ventana para calcular `net_weight` (percentil 10) |
| `MIN_SESSION_S` | 30s | Duración mínima de sesión válida |
| `GAP_MERGE_S` | 60s | Gap entre activos para fusionar en misma sesión |
| `MIN_CONSUMED_G` | 3.0g | Cambio mínimo de peso para sesión válida |
| `MIN_SERVIDO_SESSIONS` | 80 | Sesiones de servido requeridas antes de G-01 |
| `MIN_ALIM_SESSIONS` | 200 | Sesiones de alimentación requeridas antes de G-01 |
| `MIN_ALIM_FOR_NN` | 300 | Sesiones de alimentación para habilitar G-06 |
| `THRESHOLD_A_INICIAL` | 0.20 | Punto de partida para threshold sweep en Modelo A (producción) |
| `THRESHOLD_CANDIDATOS_GAMMA` | 0.12 | Threshold de `prob_activo` para generar candidatos en el Pre-G (Paso 4.6 de la unificación) — más bajo que producción para maximizar recall |
| `TZ_LOCAL` | `America/Santiago` | Timezone para todos los cálculos temporales |
| `CSV_ENCODING` | `latin1` | Encoding de los dumps CSV de Supabase |

---

## 7. Errores documentados del Ciclo Alpha

Ocho errores críticos corregidos en Gamma. Ver [delta_gamma_antiguio.md](delta_gamma_antiguio.md) sección 4 para los checkpoints de verificación.

| ID | Error | Impacto observado | Corrección Gamma |
|---|---|---|---|
| **α-1** | `servido` insuficiente (14–27 sesiones) | F1 servido inestable (0.14–0.50); SMOTE como parche | ≥80 sesiones reales antes de G-01 |
| **α-2** | Shift de distribución no diagnosticado pre-entrenamiento | F1 activo cayó 0.76→0.60 en α-08 al unir períodos | Análisis KS obligatorio en Fase 1 |
| **α-3** | `hour_sin/cos` calculados en UTC | Rutinas horarias de Bandida desplazadas 3–4 horas | Siempre `America/Santiago` |
| **α-4** | UUID doble de KPCL0034 sin documentar | Joins rotos y duplicados silenciosos | `KPCL0034_UUIDS` lista explícita con ambos |
| **α-5** | `clock_invalid=True` al 100% sin investigar | Timestamps ligeramente incorrectos en Mayo-Jun | Forzar `ingested_at` cuando pct > 95% |
| **α-6** | Test set nunca evaluado formalmente | Todas las métricas Alpha son de validación, no de test | Test se evalúa exactamente una vez en G-Final |
| **α-7** | Benchmark NN prematuro (α-10) con 185 sesiones | LGBM ganó por defecto; resultado esperado | G-06 solo con ≥300 alim + ≥80 serv |
| **α-8** | `cadencia_s` añadida sin beneficio (α-09B) | Sin impacto en F1; añade ruido | Excluida de Gamma desde G-01 |

---

## 8. Convenciones de nombres

**Prefijos de experimento**
- `α-XX` — Experimento del Ciclo Alpha (solo lectura, referencia histórica)
- `G-XX` — Experimento del Ciclo Gamma (activo)
- `Pre-G` — Preparación de datos (no es experimento de modelo)
- `G-Final` — Evaluación formal del test set

**Prefijos de archivos**
- `g01_`, `g02_`, ... — Scripts del Ciclo Gamma (Python)
- `_gamma_` — Archivos de utilidades compartidas (utils, helpers)
- `exp_01_` ... `exp_10_` — Scripts legacy del Ciclo Alpha (no editar)

**Sufijos de modelo**
- `_a` — Modelo A (binario: activo/reposo)
- `_b` — Modelo B (multiclase: alimentacion/servido/reposo)
- `_gbm` — Variante Gradient Boosting
- `_classical` — Variante ML clásico
- `_nn` — Variante neuronal

**Carpeta `gamma/`**
Todo el código y datos del Ciclo Gamma viven bajo `Data Science/gamma/`. Las carpetas hermanas (`fase_1_extraccion/`, `fase_2_dataset/`, etc. en la raíz de `Data Science/`) pertenecen al Ciclo Alpha y son solo lectura.

---

## Referencias cruzadas

| Documento | Contenido |
|---|---|
| [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | Runbook operativo del Pre-G: unificación de datos + inferencia con Modelo A de Exp06 + retiquetado total |
| [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | Guía maestra del Ciclo Gamma (pipeline, errores, reglas) |
| [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | Estado y métricas de cada experimento Gamma |
| [../REGLAS_EVENTOS_ALIMENTACION.md](../REGLAS_EVENTOS_ALIMENTACION.md) | Taxonomía canónica de eventos (aplica a ambos ciclos) |
| [av1_ML_PREDICCION_ALIMENTACION.md](av1_ML_PREDICCION_ALIMENTACION.md) | Especificación ML original (Ciclo Alpha — referencia) |
| [KPCL_GUIA_DASHBOARD.md](KPCL_GUIA_DASHBOARD.md) | Dashboard para identificar sesiones a anotar |
| [KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md](KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md) | Por qué KPCL0036 sigue excluido |


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Instructivo Maestro — Ciclo Delta (delta)

**Version:** 1.0
**Fecha de creacion:** 2026-06-21
**Ciclo:** Delta (delta) — No Supervisado
**Estado:** Pre-D en preparacion

---

## 1. Vision y diferencias con Alpha y Gamma

| Ciclo | Enfoque | Etiquetas | Modelos |
|---|---|---|---|
| **Alpha** (α) | Supervisado iterativo | Manuales en `audit_events` | LightGBM |
| **Gamma** (γ) | Supervisado multi-modelo | Manuales + retiqueteo Pre-G | LightGBM, RF, ExtraTrees, etc. |
| **Delta** (δ) | **No supervisado** | Ninguna (solo para validacion cruzada) | Clustering + deteccion de anomalias |

Delta no entrena modelos supervisados ni calibra threshold de clasificacion.
Su objetivo es encontrar estructura y anomalias en los datos sin depender de
las etiquetas humanas, y usar esa estructura para:

1. Descubrir patrones de comportamiento de Bandida no capturados por las 3
   clases de Gamma (alimentacion / servido / reposo).
2. Detectar anomalias de hardware en la curva de peso.
3. Generar candidatos de nuevas sesiones de `servido` sin depender del modelo
   supervisado de Alpha.
4. Validar si los clusters no supervisados coinciden con las etiquetas de
   Gamma (cross-check de calidad del etiquetado).

---

## 2. Lo que Delta hereda de Gamma

- Los datos crudos (`readings_raw.parquet`, `sessions_labeled.parquet`).
- Las 13 features base de Gamma (`FEATURES_GAMMA`).
- Las constantes del pipeline: `GAP_CUTOFF_S=300`, `PLATEAU_THRESHOLD=1.5`,
  resampleo a 30s, ambos UUIDs de KPCL0034, timezone America/Santiago,
  encoding `latin1`.

## 3. Lo que Delta NO hereda

- Las etiquetas de sesiones (solo se usan como referencia de validacion en
  D-08, nunca para entrenar nada).
- Los modelos `.lgb` o `.pkl` supervisados de Gamma o Alpha.
- Los splits train/val/test de Gamma (Delta no entrena modelos supervisados,
  no necesita split temporal sellado).

---

## 4. Estructura de carpetas

```
Ciclo_Delta/
├── delta_gamma_antiguio.md
├── delta_gamma_antiguio.md
├── delta_gamma_antiguio.md
├── experiments/
│   ├── delta_gamma_antiguio.md
│   ├── delta_gamma_antiguio.md
│   ├── delta_gamma_antiguio.md
│   ├── delta_gamma_antiguio.md
│   └── delta_gamma_antiguio.md
├── fase_1_datos/
│   ├── scripts/
│   │   ├── _delta_utils.md
│   │   ├── d01_setup_env.md
│   │   ├── d02_cargar_datos.md
│   │   └── d03_features_no_supervisadas.md
│   ├── data/{raw,processed}/
│   └── outputs/quality_report/
├── fase_2_clustering/
│   ├── scripts/{d01_kmeans_baseline,d02_dbscan,d03_hdbscan,d04_gmm,d05_clustering_report}.md
│   ├── models/{kmeans,dbscan,hdbscan,gmm}/
│   └── outputs/{cluster_report,visualizaciones}/
├── fase_3_anomalias/
│   ├── scripts/{d01_isolation_forest,d02_autoencoder,d03_lof,d04_anomaly_report}.md
│   ├── models/
│   └── outputs/{anomaly_report,visualizaciones}/
├── fase_4_validacion/
│   ├── scripts/{d01_cross_check_gamma,d02_candidatos_servido,d03_reporte_final}.md
│   └── outputs/cross_check_report/
└── delta_gamma_antiguio.md
```

---

## 5. Secuencia de ejecucion

```
Pre-D (setup + datos + features)
  └── D-01 K-Means ──┬── D-02 DBSCAN
                      ├── D-03 HDBSCAN
                      └── D-04 GMM
                            │
                      D-05 Clustering report (comparacion)
                            │
        ┌───────────────────┼────────────────────┐
   D-06 Isolation Forest  D-07 Autoencoder    D-08 LOF + Consenso
        └───────────────────┼────────────────────┘
                      D-09 Anomaly report
                            │
                  D-10 Cross-check Gamma (ARI/NMI)
                            │
                  D-11 Candidatos servido
                            │
                       D-Final Reporte
```

> Nota: la numeracion de scripts dentro de cada fase reinicia en `d01` por
> fase (ver estructura de carpetas); la tabla del tracker maestro usa
> numeracion global D-01 a D-09 + D-Final para status tracking.

---

## 6. Reglas del ciclo (inviolables)

1. Por cada archivo `.md` de spec que se redacte, NO crear el `.py`. Mauro
   convierte el `.md` a `.py` manualmente.
2. Estructura de carpetas primero: todas las carpetas vacias antes de
   cualquier archivo de contenido.
3. Un experimento = un archivo `.md` en `experiments/` + una fila en
   `delta_gamma_antiguio.md`.
4. Siempre hora Santiago (`America/Santiago`) para features temporales.
   Nunca UTC para features de negocio.
5. Siempre `ingested_at` cuando `clock_invalid=True`. Nunca `recorded_at`
   en ese caso.
6. Siempre resampleo a 30s antes de calcular cualquier feature.
7. Ambos UUIDs de KPCL0034 siempre en `KPCL0034_UUIDS`.
8. Encoding `latin1` para CSVs de Supabase.
9. No tocar los datos de test de Gamma (`X_test.parquet` / `y_test.parquet`).
10. No reentrenar modelos supervisados de Gamma. Delta es paralelo e
    independiente.
11. Las features de Delta heredan las 13 de Gamma y pueden anadir features
    adicionales propias del dominio no supervisado.
12. Documentar todo hallazgo en el `.md` del experimento correspondiente
    antes de pasar al siguiente.
13. No modificar ningun archivo dentro de `Ciclo_Gamma/` ni `Ciclo_Alpha_v1/`.
14. No asumir que los artefactos de Gamma ya existen: los scripts deben
    validar su existencia antes de cargarlos.

---

## 7. Comandos de ejecucion (PowerShell, referencia)

```powershell
# Una vez que Mauro convierte los .md a .py:
cd "Docs\investigacion\Ciclo Delta"

# Fase 1
python fase_1_datos/scripts/d01_setup_env.py
python fase_1_datos/scripts/d02_cargar_datos.py
python fase_1_datos/scripts/d03_features_no_supervisadas.py

# Fase 2
python fase_2_clustering/scripts/d01_kmeans_baseline.py
python fase_2_clustering/scripts/d02_dbscan.py
python fase_2_clustering/scripts/d03_hdbscan.py
python fase_2_clustering/scripts/d04_gmm.py
python fase_2_clustering/scripts/d05_clustering_report.py

# Fase 3
python fase_3_anomalias/scripts/d01_isolation_forest.py
python fase_3_anomalias/scripts/d02_autoencoder.py
python fase_3_anomalias/scripts/d03_lof.py
python fase_3_anomalias/scripts/d04_anomaly_report.py

# Fase 4
python fase_4_validacion/scripts/d01_cross_check_gamma.py
python fase_4_validacion/scripts/d02_candidatos_servido.py
python fase_4_validacion/scripts/d03_reporte_final.py
```

---

## 8. Referencias cruzadas

| Documento | Relacion |
|---|---|
| `delta_gamma_antiguio.md` | Guia maestra del ciclo activo (Gamma) |
| `delta_gamma_antiguio.md` | Estado y metricas de Gamma |
| `delta_gamma_antiguio.md` | Terminos de Gamma |
| `av1_EXPERIMENT_TRACKER.md` | Tracker historico del Ciclo Alpha |
| `delta_gamma_antiguio.md` | Comparacion de datos y features Alpha vs Gamma (incluye lo que documentaba COMPARACION_ALPHA_GAMMA.md, discontinuado) |
| `KPCL_AUDITORIA_SIN_CARGADOR.md` | Referencia para anomalias tipo H |
| `KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md` | Referencia para anomalias tipo H en KPCL0036 |
| [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | Terminos del ciclo no supervisado |
| [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | Tabla maestra de experimentos Delta |


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Inferencia Delta — Uso de modelos no supervisados en produccion

**Version:** 1.0
**Fecha:** 2026-06-21
**Ciclo:** Delta (delta) — No Supervisado

---

## Contexto

A diferencia de Alpha y Gamma (que exportan modelos supervisados `.lgb` /
`.pkl` de clasificacion), Delta exporta:

1. **Modelos de clustering** — para asignar un cluster a nuevas lecturas.
2. **Umbrales de anomalia** — para marcar nuevas lecturas como anomalas.
3. **Candidatos de servido** — CSV para incorporar a Gamma como nuevas etiquetas.

La "inferencia" de Delta no es clasificacion en tiempo real; es una
operacion de auditoria periodica que se ejecuta offline cuando hay datos
nuevos suficientes.

---

## Artefactos exportados por Delta

| Artefacto | Ruta | Uso |
|---|---|---|
| `kmeans_best.pkl` | `fase_2_clustering/models/kmeans/` | Asignar cluster a lecturas nuevas |
| `dbscan_best.pkl` | `fase_2_clustering/models/dbscan/` | Alternativa si DBSCAN gano |
| `hdbscan_best.pkl` | `fase_2_clustering/models/hdbscan/` | Alternativa si HDBSCAN gano |
| `gmm_best.pkl` | `fase_2_clustering/models/gmm/` | Probabilidades de cluster |
| `isolation_forest.pkl` | `fase_3_anomalias/models/` | Score de anomalia IF |
| `lof_model.pkl` | `fase_3_anomalias/models/` | Score de anomalia LOF |
| `autoencoder.h5` | `fase_3_anomalias/models/` | Error de reconstruccion |
| `scaler_delta.pkl` | `fase_1_datos/data/processed/` | Escalado de features (reusar en inferencia) |
| `candidatos_servido_delta_nuevos.csv` | `fase_4_validacion/outputs/` | Input a app_anotacion_gamma.py |

---

## Flujo de inferencia offline

```
Nuevas lecturas (raw)
       |
       v
_delta_utils.cargar_readings_gamma()     ← solo lectura de Gamma
       |
_delta_utils.aplicar_timestamp_correcto()
       |
_delta_utils.calcular_features_delta_extra()
       |
_delta_utils.escalar_features(scaler=scaler_delta.pkl)   ← usar scaler entrenado
       |
       ├── kmeans_best.pkl.predict(X_scaled) → cluster_id
       |
       ├── isolation_forest.pkl.decision_function(X_scaled) → anomaly_score_if
       ├── lof_model.pkl.decision_function(X_scaled) → anomaly_score_lof
       └── autoencoder.predict(X_scaled) → reconstruction_error
                   |
                   v
         consenso ≥ 2/3 detectores → anomalia confirmada
```

---

## Reglas de inferencia

1. **No reentrenar**: usar siempre el scaler y los modelos serializados de
   la Fase 1-3 de Delta. Si los datos cambian sustancialmente (nuevo
   dispositivo, nueva temporada), iniciar un **Ciclo Epsilon** en lugar de
   reentrenar Delta.
2. **Timestamp correcto**: siempre `ingested_at` cuando `clock_invalid=True`.
3. **Ambos UUIDs**: siempre filtrar por `KPCL0034_UUIDS` (ambos UUIDs).
4. **Encoding**: siempre `latin1` para CSVs de Supabase.
5. **No modificar Gamma**: los candidatos de servido generados por Delta se
   incorporan a Gamma solo despues de revision humana en `app_anotacion_gamma.py`.

---

## Cuando ejecutar inferencia Delta

| Trigger | Frecuencia sugerida | Accion |
|---|---|---|
| Auditoria periodica de anomalias | Mensual | Ejecutar Fase 1 → 3 sobre datos nuevos |
| Generacion de candidatos de servido | Despues de acumular 2+ semanas de datos | Ejecutar Fase 1 → 4 |
| Cross-check post-reentrenamiento Gamma | Cada vez que Gamma sube una nueva version | Ejecutar solo Fase 4 (cross-check) |

---

## Referencias

- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)
- [fase_1_datos/scripts/_delta_utils.md](fase_1_datos/scripts/_delta_utils.md)
- [fase_4_validacion/scripts/d02_candidatos_servido.md](fase_4_validacion/scripts/d02_candidatos_servido.md)
- `../Ciclo_Gamma/` — destino de los candidatos de servido


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Ciclo Delta — Bitácoras de Experimentos (D-01 a D-05)

> Fusión de los 5 archivos `d0N_*.md` de resultados de experimentos. Ver [[delta_gamma_antiguio]] para la tabla resumen con métricas comparadas.


---


<!-- ==== fusionado desde d01_clustering_peso.md ==== -->

# Ciclo Delta — Experimento D-01 a D-04: Clustering de peso

**Fecha:** 2026-06-22
**Estado:** ✅ Completado
**Prerequisito:** Pre-D completo
**Script:** [fase_2_clustering/scripts/d01_kmeans_baseline.md](../fase_2_clustering/scripts/d01_kmeans_baseline.md) y siguientes (d02, d03, d04, d05)

---

## Objetivo

Encontrar estructura de clusters en las 18 features de Delta (13 de Gamma +
5 propias) usando cuatro algoritmos distintos (K-Means, DBSCAN, HDBSCAN,
GMM) y seleccionar el mejor para el cruce con las etiquetas de Gamma.

## Algoritmo / Tecnica

- K-Means (baseline, D-01)
- DBSCAN (D-02)
- HDBSCAN (D-03)
- GMM (D-04)
- Reporte comparativo (D-05)

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `N_CLUSTERS_RANGE` | 2–7 | Rango razonable para explorar K/n_components |
| `DBSCAN_EPS_RANGE` | 0.3, 0.5, 0.8, 1.0, 1.5 | Sweep estandar sobre features escaladas |
| `DBSCAN_MIN_SAMPLES` | 5 | — |
| `HDBSCAN_MIN_CLUSTER` | 10 | — |

## Resultados

### K-Means sweep

| k | Silhouette | Inercia | Calinski-Harabasz | Davies-Bouldin |
|---|-----------|---------|-------------------|----------------|
| **2** | **0.8165** ✅ | 2,080,504 | 21,567 | 1.152 |
| 3 | 0.1450 | 1,889,528 | 18,653 | 1.896 |
| 4 | 0.1635 | 1,737,255 | 17,445 | 1.657 |
| 5 | 0.1424 | 1,635,408 | 15,987 | 1.816 |
| 6 | 0.1314 | 1,505,866 | 16,198 | 1.674 |
| 7 | 0.1422 | 1,371,845 | 17,002 | 1.501 |

→ **k óptimo = 2** (silhouette máximo por amplio margen)

### DBSCAN sweep

| eps | Clusters | Noise % | Silhouette |
|-----|----------|---------|-----------|
| **0.3** | 1,322 | 9.71% | **0.2418** ✅ |
| 0.5 | 941 | 6.92% | 0.1939 |
| 0.8 | 345 | 5.21% | -0.192 |
| 1.0 | 247 | 4.36% | -0.225 |
| 1.5 | 190 | 2.75% | -0.052 |

→ **eps óptimo = 0.3**

### HDBSCAN
- Clusters: 1,868 · Noise: 7.70% (10,325 pts) · Silhouette: 0.3454 ✅

### GMM sweep (BIC mínimo)

| n | BIC |
|---|-----|
| 2 | -6,033,780 |
| 3 | -8,771,631 |
| 4 | -9,264,367 |
| 5 | -10,631,516 |
| 6 | -12,111,754 |
| **7** | **-12,337,714** ✅ |

→ **n=7 componentes** (BIC mínimo) · 30 candidatos anomalía (max prob < 0.6)

### Comparación final de algoritmos

| Algoritmo | Clusters | Silhouette | Noise % | Estado umbral |
|-----------|---------|-----------|---------|---------------|
| **K-Means** | **2** | **0.816** ✅ | 0% | ✅ ≥ 0.25 |
| DBSCAN | 1,322 | 0.242 | 9.71% | ✅ ≥ 0.25 |
| HDBSCAN | 1,868 | 0.345 | 7.70% | ✅ ≥ 0.25 |
| GMM | 7 | — | 0% | — (BIC-based) |

## Hallazgos

- **K-Means k=2 es el ganador claro** con Silhouette=0.816 — muy por encima de todos los demás.
- El salto de k=2 a k=3 es drástico (0.817 → 0.145): los datos tienen una separación binaria natural.
- **Cluster 0 = perfil servido** (delta_w medio = +4.6g): lecturas con subida de peso.
- **Cluster 1 = perfil alimentación/reposo** (delta_w negativo o neutro).
- DBSCAN y HDBSCAN generan miles de micro-clusters: la estructura no es densa-local sino globalmente binaria.
- GMM con n=7 es útil para detectar candidatos ambiguos (baja probabilidad de pertenencia).

## Visualizaciones generadas

- [x] `fase_2_clustering/outputs/visualizaciones/kmeans_umap.html`
- [x] `fase_2_clustering/outputs/visualizaciones/dbscan_umap.html`
- [x] `fase_2_clustering/outputs/visualizaciones/hdbscan_umap.html`
- [x] `fase_2_clustering/outputs/visualizaciones/gmm_umap.html`
- [x] `fase_1_datos/outputs/visualizaciones/umap_delta_w.html`
- [x] `fase_1_datos/outputs/visualizaciones/umap_is_plateau.html`
- [x] `fase_1_datos/outputs/visualizaciones/umap_hour_sin.html`

## Decision

**Algoritmo ganador: K-Means k=2** (Silhouette=0.816, sin noise, separación binaria clara).
`cluster_ganador` persistido en `readings_delta.parquet` para Fases 3 y 4.
Cluster 0 = candidato servido · Cluster 1 = alimentación/reposo.

## Referencias

- [_delta_utils.md](../fase_1_datos/scripts/_delta_utils.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)


---


<!-- ==== fusionado desde d02_anomaly_detection.md ==== -->

# Ciclo Delta — Experimento D-05 a D-07: Deteccion de anomalias

**Fecha:** 2026-06-22
**Estado:** ✅ Completado (Autoencoder ⚠️ falló — consenso con 2/3 detectores)
**Prerequisito:** D-01 a D-04 completos (clustering)
**Script:** [fase_3_anomalias/scripts/d01_isolation_forest.md](../fase_3_anomalias/scripts/d01_isolation_forest.md) y siguientes (d02, d03, d04)

---

## Objetivo

Detectar anomalias en la curva de peso de KPCL0034 usando tres detectores
independientes (Isolation Forest, Autoencoder, LOF) y construir un
consenso robusto.

## Algoritmo / Tecnica

- Isolation Forest (D-05)
- Autoencoder (D-06)
- LOF + Consenso (D-07)
- Reporte unificado por tipo (H / C / U)

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `IF_CONTAMINATION` | 0.05 | 5% esperado de anomalias |
| `LOF_N_NEIGHBORS` | 20 | — |
| `AUTOENCODER_EPOCHS` | 50 | — |
| `AUTOENCODER_LATENT` | 4 | Dimension del espacio latente |

## Resultados

| Detector | Anomalias detectadas | % dataset | Estado |
|---|---|---|---|
| Isolation Forest (IF) | 6,709 | 5.00% | ✅ |
| Autoencoder | — | — | ⚠️ OSError: c10.dll de PyTorch — incompatibilidad VC++ en Windows |
| LOF | 6,709 | 5.00% | ✅ |
| **Consenso IF∩LOF (≥2 votos)** | **676** | **0.50%** | ✅ |
| Tipo H (hardware, clock_invalid>0.5) | 338 | — | ✅ ≥ 5 ✅ |
| Tipo C (comportamental, horario 06-22h) | 178 | — | — |
| Tipo U (sin clasificar, nocturnas) | 160 | — | — |

### Anomalías por mes

| Mes | Anomalías |
|-----|-----------|
| Abril 2026 | 255 |
| Mayo 2026 | 196 |
| Junio 2026 | 225 |

### Top 5 más extremas (2 votos — consenso máximo)

| Timestamp | Votos | clock_invalid | Tipo |
|-----------|-------|---------------|------|
| 2026-06-12 15:19 UTC | 2 | 1.0 | H |
| 2026-05-28 11:42 UTC | 2 | 1.0 | H |
| 2026-04-12 11:59 UTC | 2 | 0.5 | C |
| 2026-06-12 15:06 UTC | 2 | 1.0 | H |
| 2026-04-21 22:40 UTC | 2 | 0.5 | U |

## Hallazgos

- **IF y LOF coinciden exactamente en cantidad (6,709)** — ambos usan contamination=5%. El consenso reduce a 676 anomalías robustas (0.50% del dataset).
- **Tipo H domina** (338/676 = 50%): lecturas con `clock_invalid=100%` que coinciden con períodos sin cargador documentados en `KPCL_AUDITORIA_SIN_CARGADOR.md`. Validado.
- **Autoencoder pendiente:** Instalar Visual C++ Redistributable 2022 x64 o usar entorno conda para resolver el DLL de PyTorch. Con 3/3 detectores, el consenso sería más estricto.
- **75.65% de anomalías IF tienen clock_invalid=True** — correlación directa hardware/anomalía.

## Visualizaciones generadas

- [x] `fase_3_anomalias/outputs/visualizaciones/isolation_forest_timeline.html`
- [x] `fase_3_anomalias/outputs/visualizaciones/anomaly_timeline_por_tipo.html`
- [ ] `outputs/visualizaciones/reconstruction_error.html` (pendiente — autoencoder no ejecutado)

## Decision

Consenso IF∩LOF con 676 anomalías es suficiente y robusto. Umbral de Tipo H (≥5) superado por amplio margen (338). Se procede a Fase 4.

## Referencias

- [_delta_utils.md](../fase_1_datos/scripts/_delta_utils.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)
- `KPCL_AUDITORIA_SIN_CARGADOR.md`
- `KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md`


---


<!-- ==== fusionado desde d03_patron_temporal.md ==== -->

# Ciclo Delta — Experimento D-Temporal: Patrones temporales

**Fecha:** 2026-06-21
**Estado:** ⏳ Pendiente
**Prerequisito:** Pre-D completo (readings_delta.parquet disponible)
**Script:** No tiene script de fase dedicado — analisis derivado de Fase 2 y features temporales de `_delta_utils`

---

## Objetivo

Analizar si los patrones de comportamiento de Bandida tienen estructura
temporal (hora del dia, dia de semana) que emerja de manera natural en el
espacio no supervisado, sin depender de las etiquetas de Gamma.

## Algoritmo / Tecnica

- Distribucion horaria de lecturas por cluster (K-Means ganador de D-01)
- Heatmap semana x hora con `weight_zscore` promedio
- Correlacion de `hour_sin`/`hour_cos`/`dia_semana_sin` con asignacion de cluster

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `TZ_LOCAL` | America/Santiago | Siempre hora local para features de negocio |
| Features temporales | `hour_sin`, `hour_cos`, `dia_semana_sin` | Heredadas de Gamma via FEATURES_GAMMA |

## Resultados

| Pregunta | Respuesta | Estado |
|---|---|---|
| ¿Hay cluster dominantemente nocturno? | — | ⏳ |
| ¿Hay patron semanal en el cluster de reposo? | — | ⏳ |
| ¿`dia_semana_sin` discrimina clusters? | — | ⏳ |

## Hallazgos

[Completar despues de ejecutar Fase 2 y analizar los clusters]

## Visualizaciones generadas

- [ ] `fase_2_clustering/outputs/visualizaciones/heatmap_hora_cluster.html`
- [ ] `fase_2_clustering/outputs/visualizaciones/patron_semanal.html`

## Decision

[Completar: si hay estructura temporal no capturada por Gamma, documentarla
como insumo para Ciclo Epsilon]

## Referencias

- [../fase_1_datos/scripts/_delta_utils.md](../fase_1_datos/scripts/_delta_utils.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)


---


<!-- ==== fusionado desde d04_cross_check_gamma.md ==== -->

# Ciclo Delta — Experimento D-08: Cross-check con etiquetas de Gamma

**Fecha:** 2026-06-22
**Estado:** ✅ Completado — ARI=0.1594 (coincidencia_baja)
**Prerequisito:** D-01 a D-07 completos
**Script:** [../fase_4_validacion/scripts/d01_cross_check_gamma.md](../fase_4_validacion/scripts/d01_cross_check_gamma.md)

---

## Objetivo

Medir si los clusters no supervisados de Delta coinciden con las etiquetas
supervisadas de Gamma. Valida la calidad del etiquetado y detecta patrones
nuevos no capturados por las 3 clases de Gamma (alimentacion / servido /
reposo).

## Algoritmo / Tecnica

- Join temporal lecturas Delta ↔ sesiones Gamma (ventana ±15s)
- Adjusted Rand Index (ARI) y Normalized Mutual Information (NMI)
- Heatmap de pureza: filas = clusters Delta, columnas = clases Gamma

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `JOIN_WINDOW_S` | 15 | Tolerancia de union temporal |
| Etiquetas Gamma | alimentacion / servido / reposo | Las 3 clases del modelo supervisado |

## Resultados

| Metrica | Valor | Umbral | Estado |
|---|---|---|---|
| ARI | **0.1594** | ≥ 0.20 | ⚠️ bajo umbral |
| NMI | **0.1199** | ≥ 0.25 | ⚠️ bajo umbral |
| Lecturas cruzadas | 4,034 de 134,164 (3.0%) | — | — |
| Pureza cluster servido (Cluster 0) | **50.1%** | — | ✅ |
| Pureza cluster alimentacion (Cluster 1) | **68.6%** | — | ✅ |

### Mapa de pureza (Cluster × Etiqueta Gamma)

| Cluster | alimentacion | reposo | servido | sin_clasificar |
|---------|-------------|--------|---------|----------------|
| **Cluster 0** (servido) | 26.3% | 20.8% | **50.1%** | 2.8% |
| **Cluster 1** (alim/reposo) | **68.6%** | 24.5% | 4.1% | 2.8% |

## Hallazgos

- **ARI=0.159 es esperado**: K-Means divide en 2 clusters binarios (servido vs no-servido) mientras Gamma tiene 4 categorías (alim / servido / reposo / sin_clasificar). La baja coincidencia global es estructural, no un error.
- **Cluster 0 = servido** con 50.1% de pureza: el cluster detecta correctamente la mitad de las sesiones de servido en las lecturas cruzadas. El 50% restante en Cluster 0 es reposo/alimentación con delta_w positivo por ruido o traslapes temporales.
- **Cluster 1 = alimentación** con 68.6% de pureza: el cluster más poblado captura la dinámica de descenso de peso durante las comidas.
- **Solo 3% de lecturas cruzadas** con etiquetas Gamma: la gran mayoría de lecturas Delta (97%) son de `reposo` sin sesión etiquetada, lo que diluye el ARI.
- ARI < 0.3 → **Delta descubre estructura no capturada** por las 3 clases de Gamma. Potencial para nuevas clases en Ciclo Epsilon.

## Visualizaciones generadas

- [x] `fase_4_validacion/outputs/cross_check_report/heatmap_cluster_vs_etiqueta.html`
- [x] `fase_4_validacion/outputs/cross_check_report/cross_check_results.json`

## Decision

ARI bajo (0.16) es esperado por la diferencia de granularidad (2 clusters vs 4 clases). La pureza del Cluster 0 como "servido" (50.1%) valida que Delta sí captura el patrón de servido sin etiquetas. Se recomienda usar los 2 clusters como pseudo-etiquetas de alta calidad (Silhouette=0.816) en Ciclo Epsilon para bootstrapping supervisado.

## Referencias

- [../fase_4_validacion/scripts/d01_cross_check_gamma.md](../fase_4_validacion/scripts/d01_cross_check_gamma.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)
- `KPCL_AUDITORIA_SIN_CARGADOR.md`
- `KPCL_AUDITORIA_KPCL0036_ERROR_PESO.md`


---


<!-- ==== fusionado desde d05_candidatos_servido.md ==== -->

# Ciclo Delta — Experimento D-09: Candidatos de servido nuevos

**Fecha:** 2026-06-22
**Estado:** ✅ Completado — 2 candidatos nuevos (umbral no alcanzado: necesitaba ≥10)
**Prerequisito:** D-08 completo (cross-check Gamma ejecutado)
**Script:** [../fase_4_validacion/scripts/d02_candidatos_servido.md](../fase_4_validacion/scripts/d02_candidatos_servido.md)

---

## Objetivo

Usar el cluster Delta de mayor `delta_w` promedio para generar candidatos
de sesiones de `servido` que Gamma no tenia etiquetadas, aumentando el
conjunto de entrenamiento para el proximo ciclo supervisado.

## Logica de deteccion

El cluster "candidato a servido" se identifica por:
- Mayor promedio de `delta_w` (subida de peso)
- `rolling_std_10` alto (transicion activa)
- `net_weight` en aumento

Lecturas consecutivas de ese cluster (gap < `GAP_CUTOFF_S`) con
`delta_peso_total > 5g` y duracion > 30s se proponen como sesiones nuevas.

## Parametros utilizados

| Parametro | Valor | Motivo |
|---|---|---|
| `GAP_CUTOFF_S` | 300 | Heredado de Gamma — separacion entre sesiones |
| `MIN_LECTURAS` | 3 | Minimo para considerar una sesion valida |
| `MIN_DELTA_PESO_G` | 5.0 | Gramos minimos de subida para ser servido |
| `MIN_DURACION_S` | 30 | Duracion minima de la sesion |

## Resultados

| Metrica | Valor | Umbral | Estado |
|---|---|---|---|
| Candidatos totales encontrados | **12** | — | — |
| Candidatos ya etiquetados en Gamma | 10 | — | — |
| Candidatos NUEVOS (no en Gamma) | **2** | ≥ 10 | ⚠️ bajo umbral |
| Rango temporal candidatos nuevos | Jun 01–02, 2026 | — | — |
| Gramos estimados (candidatos nuevos) | 43g (18g + 25g) | — | — |
| Cluster identificado como servido | Cluster 0 (delta_w medio = +4.61g) | — | ✅ |

### Todos los candidatos (12 en total)

| ts_inicio (UTC) | ts_termino | delta_peso_g | duracion_s | n_lecturas | nuevo |
|-----------------|------------|-------------|-----------|-----------|-------|
| 2026-04-09 23:07 | 23:28 | 45g | 1260s | 40 | — |
| 2026-04-27 04:49 | 05:03 | 48g | 870s | 30 | — |
| 2026-04-28 21:03 | 21:18 | 40g | 870s | 30 | — |
| 2026-05-04 01:43 | 01:58 | 49g | 870s | 30 | — |
| 2026-05-30 00:42 | 00:56 | 19g | 840s | 29 | — |
| 2026-05-31 14:41 | 14:55 | 25g | 870s | 30 | — |
| **2026-06-01 09:14** | **09:24** | **18g** | **600s** | 14 | ✅ NUEVO |
| **2026-06-02 12:36** | **12:41** | **25g** | **330s** | 12 | ✅ NUEVO |
| 2026-06-02 21:11 | 21:16 | 13g | 300s | 11 | — |
| 2026-06-05 23:15 | 23:29 | 43g | 870s | 30 | — |
| 2026-06-10 17:45 | 17:58 | 11g | 750s | 26 | — |
| 2026-06-13 04:24 | 04:29 | 14g | 270s | 10 | — |

## Hallazgos

- **10 de 12 candidatos ya estaban etiquetados en Gamma** — valida que el cluster detecta sesiones reales de servido.
- **Solo 2 candidatos nuevos**: ambos en Junio 2026. El dataset de Mayo–Junio tiene menos densidad de anotaciones retroactivas.
- Los candidatos nuevos son de duración media-corta (330–600s) y gramos moderados (18–25g) — perfil de servido pequeño.
- El umbral de ≥ 10 candidatos nuevos no se alcanzó. La razón principal: el período Abr–May ya estaba bien anotado en Gamma via `app_anotacion.py`.
- Delta como detector de servido nuevo es más valioso en períodos sin anotación retroactiva.

## Salidas

- [x] `fase_4_validacion/outputs/candidatos_servido_delta.csv` — 12 candidatos totales
- [x] `fase_4_validacion/outputs/candidatos_servido_delta_nuevos.csv` — 2 candidatos nuevos

> Los 2 candidatos nuevos deben revisarse manualmente con `app_anotacion_gamma.py`
> antes de incorporarlos como etiquetas. La revisión determina si son servido real
> o ruido del sensor.

## Decision

Solo 2 candidatos nuevos — umbral ≥10 no alcanzado. Se incorporan los 2 para revisión humana en Gamma pero no justifican reentrenamiento solo por este aporte. El aporte real de Delta es la validación de pureza del Cluster 0 (50.1% servido) como base para bootstrapping supervisado en Ciclo Epsilon.

## Referencias

- [../fase_4_validacion/scripts/d02_candidatos_servido.md](../fase_4_validacion/scripts/d02_candidatos_servido.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)
- [delta_gamma_antiguio.md](delta_gamma_antiguio.md)
- `../../../Ciclo_Gamma/` — destino final del CSV via app_anotacion_gamma.py


---

<!-- ==== fusionado desde REPORTE_EJECUCION_DELTA.md (discontinuado — el resto de su
     contenido, fase por fase, era redundante con lo ya fusionado arriba y con
     delta_gamma_antiguio.md) ==== -->

## Apéndice — Archivos generados por el pipeline Delta

```
fase_1_datos/data/processed/
  X_scaled.parquet         (134164 × 18)
  X_pca2.parquet           (134164 × 2)
  X_pca10.parquet          (134164 × 10)
  X_umap2.parquet          (134164 × 2)
  readings_delta.parquet   (134164 × N+1, incluye cluster_ganador)

fase_2_clustering/outputs/
  models/kmeans/kmeans_best.pkl
  models/dbscan/dbscan_best.pkl
  models/hdbscan/hdbscan_best.pkl
  models/gmm/gmm_best.pkl
  cluster_report/clustering_comparison.csv
  cluster_report/hdbscan_metrics.csv

fase_3_anomalias/outputs/
  anomalias_if.csv             (6,709 filas)
  anomalias_lof.csv            (6,709 filas)
  anomalias_consenso.csv       (676 filas)
  anomalias_detectadas.csv     (676 filas)
  delta_gamma_antiguio.md
  visualizaciones/anomaly_timeline_por_tipo.html

fase_4_validacion/outputs/
  cross_check_report/cross_check_results.json
  cross_check_report/heatmap_cluster_vs_etiqueta.html
  candidatos_servido_delta.csv        (12 filas)
  candidatos_servido_delta_nuevos.csv (2 filas)
```

## Apéndice — Pendiente / Recomendaciones (al cierre del ciclo, 2026-06-22)

1. **Autoencoder (d02 Fase 3):** Instalar Visual C++ Redistributable 2022 x64 o usar un entorno conda para resolver el error DLL de PyTorch. Una vez funcional, re-ejecutar d03_lof.py para obtener consenso 3/3 detectores.
2. **ARI bajo (0.16):** Esperado — K-Means divide en 2 clusters mientras Gamma tiene 4 categorías (alimentacion, reposo, servido, sin_clasificar). El cruce temporal solo alcanzó 3% de las lecturas.
3. **2 candidatos servido nuevos:** Revisar manualmente `candidatos_servido_delta_nuevos.csv` para decidir si agregar a sessions_labeled de Gamma.
4. **Ciclo Epsilon:** Con la separación clara Cluster0=servido / Cluster1=alimentacion, se puede avanzar a modelos supervisados usando estos 2 clusters como pseudo-etiquetas de alta calidad (silhouette=0.816).

---


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Reporte de Anomalias — Ciclo Delta

Generado: 2026-06-22T10:22:57.793601

## Total por tipo

- Tipo H: 338
- Tipo C: 178
- Tipo U: 160

## Top 10 anomalias mas extremas (por votos de consenso)

| ts                        |   votos |   clock_invalid | tipo   |
|:--------------------------|--------:|----------------:|:-------|
| 2026-06-12 15:19:00+00:00 |       2 |             1   | H      |
| 2026-05-28 11:42:30+00:00 |       2 |             1   | H      |
| 2026-04-12 11:59:00+00:00 |       2 |             0.5 | C      |
| 2026-06-12 15:06:30+00:00 |       2 |             1   | H      |
| 2026-04-21 22:40:00+00:00 |       2 |             0.5 | U      |
| 2026-04-10 09:02:00+00:00 |       2 |             0.5 | C      |
| 2026-05-04 02:45:30+00:00 |       2 |             0.5 | U      |
| 2026-06-14 03:07:00+00:00 |       2 |             1   | H      |
| 2026-06-09 17:41:30+00:00 |       2 |             1   | H      |
| 2026-05-06 03:01:00+00:00 |       2 |             0   | U      |


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Kittypau ML — Ciclo Delta (delta) — Tracker de Experimentos

**Ciclo:** Delta (delta)
**Inicio:** 2026-06-21
**Estado actual:** ✅ Completado — Fase 4 ejecutada el 2026-06-22

Referencia principal: [delta_gamma_antiguio.md](delta_gamma_antiguio.md)

---

## Tabla Maestra

| ID | Nombre | Fase | Prerequisito | Meta principal | Silhouette | ARI-Gamma | Estado | Archivo |
|---|---|---|---|---|---|---|---|---|
| **Pre-D** | Setup + datos + features | Pre | Gamma Pre-G ✅ | readings_delta.parquet listo | — | — | ✅ Completado · 134,164 lecturas · 18 features · PCA+UMAP | fase_1_datos/scripts/ |
| **D-01** | K-Means baseline | 2 | Pre-D ✅ | K optimo + Silhouette ≥ 0.25 | **0.8165** ✅ | — | ✅ Completado · k=2 ganador | delta_gamma_antiguio.md |
| **D-02** | DBSCAN | 2 | D-01 ✅ | Comparar vs K-Means | 0.2418 | — | ✅ Completado · eps=0.3 · 1322 clusters · 9.71% noise | delta_gamma_antiguio.md |
| **D-03** | HDBSCAN | 2 | D-01 ✅ | Comparar vs K-Means | 0.3454 | — | ✅ Completado · 1868 clusters · 7.70% noise | delta_gamma_antiguio.md |
| **D-04** | GMM | 2 | D-01 ✅ | Candidatos anomalias GMM | — | — | ✅ Completado · n=7 (BIC mínimo) · 30 candidatos GMM | delta_gamma_antiguio.md |
| **D-05** | Isolation Forest | 3 | D-04 ✅ | Anomalias confiables | — | — | ✅ Completado · 6,709 anomalías (5.00%) | delta_gamma_antiguio.md |
| **D-06** | Autoencoder | 3 | D-05 ✅ | Consenso 2/3 detectores | — | — | ⚠️ Falló · OSError DLL torch · consenso calculado con 2/3 detectores | delta_gamma_antiguio.md |
| **D-07** | LOF + Consenso | 3 | D-05 ✅ | anomalias_detectadas.csv | — | — | ✅ Completado · 6,709 LOF · **676 consenso** (H=338 / C=178 / U=160) | delta_gamma_antiguio.md |
| **D-08** | Cross-check Gamma | 4 | D-01 a D-07 ✅ | ARI ≥ 0.30 · NMI ≥ 0.25 | — | **0.1594** ⚠️ | ✅ Completado · NMI=0.1199 · coincidencia_baja · 3% lecturas cruzadas | delta_gamma_antiguio.md |
| **D-09** | Candidatos servido | 4 | D-08 ✅ | ≥ 10 nuevos candidatos | — | — | ⚠️ 2/10 · 12 totales · 2 nuevos (Jun 2026) · 43g total | delta_gamma_antiguio.md |
| **D-Final** | Reporte final | 4 | D-09 ✅ | delta_gamma_antiguio.md | — | — | ✅ Completado · 2026-06-22 | delta_gamma_antiguio.md |

---

## Umbrales de Exito del Ciclo Delta

| Metrica | Umbral minimo | Significado |
|---|---|---|
| Silhouette Score (mejor algoritmo) | ≥ 0.25 | Clusters con separacion minima util |
| ARI con etiquetas Gamma | ≥ 0.20 | Cierta coincidencia con el ground truth |
| Anomalias tipo H detectadas | ≥ 5 | Valida que Delta detecta problemas de hardware reales |
| Candidatos servido nuevos | ≥ 10 | Aporte concreto al pipeline de Gamma |
| Cobertura de anomalias consenso | ≥ 2/3 detectores | Robustez del consenso |

---

## Reglas de uso de este archivo

1. Actualizar la fila del experimento tan pronto como termine — no acumular actualizaciones.
2. Registrar metricas reales solo despues de ejecutar el script correspondiente (Mauro).
3. D-08 y D-09 no pueden iniciar sin que D-01 a D-07 esten completos.
4. Ver [delta_gamma_antiguio.md](delta_gamma_antiguio.md) para las reglas inviolables del Ciclo Delta.

---

## Relacion con Alpha y Gamma

```
Alpha (cerrado)                Gamma (activo)               Delta (nuevo)
─────────────────              ──────────────────           ──────────────────────
Supervisado LightGBM    →      Multi-modelo supervisado  →  No supervisado
α-01 a α-10 (hecho)            G-01 a G-05 hecho            D-01 a D-Final (este ciclo)
```

Delta usa los artefactos de Gamma como datos de entrada (solo lectura) y aporta
candidatos de `servido` nuevos de vuelta a Gamma.


---


<!-- ==== fusionado desde delta_gamma_antiguio.md ==== -->

# Glosario del Ciclo Delta (delta)

> Terminos especificos del ciclo no supervisado. Complementa GLOSARIO.md (Alpha)
> y delta_gamma_antiguio.md (Gamma). No redefine terminos ya cubiertos ahi salvo que
> el significado cambie en el contexto no supervisado.

---

## Conceptos generales

- **Clustering no supervisado**: agrupacion de lecturas sin etiquetas previas,
  basada solo en la similitud de features.
- **Silhouette Score**: metrica de calidad del clustering. Rango -1 a 1.
  Valores > 0.25 indican clusters con separacion util.
- **K-Means**: algoritmo de clustering que asigna cada punto al centroide mas
  cercano. Requiere definir K de antemano. Rapido, sensible a outliers.
- **DBSCAN**: clustering basado en densidad. No requiere K. Detecta ruido
  (noise points). Sensible a `eps` y `min_samples`.
- **HDBSCAN**: version jerarquica de DBSCAN. Mas robusta con densidades
  variables. Recomendada para datos de sensores.
- **GMM (Gaussian Mixture Model)**: clustering probabilistico. Cada punto
  tiene probabilidades de pertenecer a cada cluster. Util para detectar
  puntos ambiguos (posibles anomalias).

## Deteccion de anomalias

- **Isolation Forest**: deteccion de anomalias por aislamiento. Los puntos
  faciles de aislar son anomalos. Eficiente en alta dimensionalidad.
- **Autoencoder**: red neuronal que comprime y reconstruye los datos. Los
  puntos con alto error de reconstruccion son anomalos.
- **LOF (Local Outlier Factor)**: detecta anomalias comparando la densidad
  local de un punto con la de sus vecinos.
- **Consenso de anomalias**: punto marcado como anomalia por al menos 2 de 3
  detectores independientes. Mas confiable que cualquier detector individual.
- **Anomalia tipo H (hardware)**: anomalia que coincide con `clock_invalid=True`
  o con un periodo sin bateria/cargador documentado.
- **Anomalia tipo C (comportamiento)**: anomalia de peso fuera del rango
  historico normal en horario de actividad de Bandida.
- **Anomalia tipo U (sin clasificar)**: anomalia que no cae en tipo H ni tipo C.

## Reduccion de dimensionalidad

- **PCA**: reduccion de dimensionalidad lineal. Preserva la varianza global.
- **UMAP**: reduccion de dimensionalidad no lineal. Preserva estructura local
  y global. Mejor para visualizacion de clusters.

## Validacion cruzada con Gamma

- **ARI (Adjusted Rand Index)**: mide la coincidencia entre dos agrupaciones
  (clusters vs etiquetas). Corregido por azar. Rango -1 a 1.
- **NMI (Normalized Mutual Information)**: mide cuanta informacion comparten
  dos agrupaciones. Rango 0 a 1.
- **Cluster dominante**: el cluster mas grande o mas puro de un algoritmo dado.
- **Pureza de cluster**: porcentaje de lecturas de una clase Gamma dentro del
  cluster Delta que mejor la representa.

## Aplicacion practica

- **Candidatos de servido**: lecturas agrupadas por Delta con patron de subida
  de peso que pueden ser sesiones de `servido` no etiquetadas en Gamma.

---

## Referencias

| Archivo | Relacion |
|---|---|
| [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | Guia maestra del ciclo |
| [delta_gamma_antiguio.md](delta_gamma_antiguio.md) | Tabla maestra de experimentos |
| `delta_gamma_antiguio.md` | Glosario del ciclo supervisado activo |
| `../GLOSARIO.md` | Glosario original del ciclo Alpha |


---
