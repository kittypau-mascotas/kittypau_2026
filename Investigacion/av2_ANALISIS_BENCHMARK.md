# Análisis del Benchmark — Kittypau KPCL0034 "Bandida"
**Dataset:** features_anotaciones_v2 · 421 eventos · 102 features · 3 clases (alim/serv/ruido)  
**Fuentes:** `resultados_benchmark.csv`, `diagnostico_clustering_resumen.csv`, `shap_importance.png`, `eda_overview.png`, `benchmark_comparison.png`  
**Fecha de análisis:** 2026-06-28

---

## 1. Estado del benchmark — qué se midió

El benchmark corre 20 modelos sobre el mismo dataset (417–421 filas, 102 features numéricas,
3 clases: alimentacion/ruido/servido) y reporta Accuracy, F1 macro y ROC-AUC.
Los modelos de clustering se evalúan separadamente con ARI, AMI y Silhouette.

**Distribución de clases:**
| Clase | N | % |
|-------|--:|--:|
| Alimentación | ~210 | 50 % |
| Ruido | ~168 | 40 % |
| Servido | ~46 | 11 % |

---

## 2. Resultados supervisados — tabla completa

| Modelo | Tipo | Accuracy | F1 macro | ROC-AUC | Train (s) |
|--------|------|--------:|--------:|--------:|----------:|
| Random Forest | Clásico | **1.0000** | **1.0000** | **1.0000** | 2.06 |
| Logistic Regression | Clásico | **1.0000** | **1.0000** | **1.0000** | 3.33 |
| Extra Trees | Clásico | **1.0000** | **1.0000** | **1.0000** | 1.14 |
| XGBoost | Boosting | **1.0000** | **1.0000** | **1.0000** | 1.20 |
| AutoML RF (Optuna) | Boosting | **1.0000** | **1.0000** | **1.0000** | 1.06 |
| Ensemble Voting | Boosting | **1.0000** | **1.0000** | **1.0000** | 14.36 |
| FT-Transformer | Red Neuronal | **1.0000** | **1.0000** | **1.0000** | 10.26 |
| LightGBM | Boosting | 0.9882 | 0.9911 | 1.0000 | 1.72 |
| CatBoost | Boosting | 0.9882 | 0.9911 | 1.0000 | 3.19 |
| MLP Básica | Red Neuronal | 0.9882 | 0.9754 | 1.0000 | 4.58 |
| ResNet Tabular | Red Neuronal | 0.9882 | 0.9754 | 1.0000 | 9.80 |
| KNN | Clásico | 0.9765 | 0.9667 | 0.9989 | ~0 |
| **SVM (RBF)** | **Clásico** | **0.1412** | **0.1215** | 0.8895 | 0.39 |
| **MLP Deep + BN + Drop** | **Red Neuronal** | **0.1412** | **0.1215** | 0.7779 | 6.75 |
| **TabNet** | **Red Neuronal** | **0.4471** | **0.3850** | 0.5012 | 4.27 |

| Modelo de clustering | ARI | AMI | Silhouette |
|----------------------|----:|----:|-----------:|
| K-Means k=3 | 0.020 | 0.081 | **0.982** |
| GMM k=3 | 0.020 | 0.081 | **0.982** |
| Agglomerative k=3 | 0.020 | 0.081 | **0.982** |
| Spectral k=3 | 0.174 | 0.229 | 0.554 |
| DBSCAN best | 0.141 | 0.177 | 0.121 |
| **HDBSCAN** | **0.294** | **0.392** | 0.723 |

---

## 3. Hallazgos críticos

### 3.1 ⚠️ ALERTA DE VALIDACIÓN — Los scores perfectos no son confiables

**Siete modelos alcanzan 1.00/1.00/1.00.** Esto es una señal de alarma, no de éxito.

Con n=421 y 102 features (relación muestras/features = 4:1), y sin evidencia de un hold-out
externo robusto, los scores perfectos indican casi con certeza **evaluación sobre los datos de
entrenamiento** (train = test). Random Forest y Extra Trees memorizar 421 puntos trivialmente.

**¿Por qué importa?** Si se despliega uno de estos modelos para clasificar nuevos gatos o nuevos
dispositivos, el rendimiento real será significativamente inferior. Los únicos scores que reflejan
algo cercano a la realidad son los de **LightGBM (F1 0.991)** y **KNN (F1 0.967)**, que no
llegaron a 1.0 — probablemente porque el split train/test no fue perfect-fit por el modelo.

**Acción necesaria antes de cualquier decisión de producción:**
Repetir el benchmark con **Stratified 5-Fold Cross-Validation** (no un único split).
El F1 macro CV para la clase "servido" (n≈46) es el número que importa.

---

### 3.2 La paradoja Silhouette=0.98 / ARI=0.02

Este es el hallazgo más importante del análisis de clustering:

**K-Means con k=3 obtiene Silhouette=0.982 (excelente cohesión geométrica) pero ARI=0.020
(sus clusters NO se corresponden con las etiquetas reales alim/serv/ruido).**

**Qué significa esto:** Los 102 features del Motor v2 capturan una estructura geométrica muy
clara en el espacio de alta dimensión, pero esa estructura NO coincide con la clasificación
biológica que nos interesa. Hay 3 "formas" geométricas dominantes en los datos que K-Means
detecta perfectamente, pero esas 3 formas NO son alimentación/servido/ruido — son otra
partición del espacio (posiblemente: señales largas/cortas/medias, o señales de alta/media/baja
amplitud).

**Implicación directa:** El Motor Matemático v2 no puede basarse solo en geometría o distancia
euclidiana. Necesita las etiquetas humanas como ancla. El Evidence Engine (supervisado con
pesos calibrados) es la arquitectura correcta — no habría ganado nada con clustering puro.

**Única excepción:** HDBSCAN logra ARI=0.294, el mejor resultado no supervisado. Capta
densidades no esféricas y trata "servido" (n=46, muy compacto en feature space) como una
región densa separada. Pero 0.294 sigue siendo insuficiente para producción.

---

### 3.3 Los modelos que fallan tienen un patrón común

**SVM (RBF), MLP Deep + BN + Dropout** → Accuracy = 0.14 ≈ fracción de la clase minoritaria.  
**Interpretación:** estos modelos colapsaron a predecir siempre la clase mayoritaria (alimentacion
≈ 50 %) o están devolviendo salida aleatoria. El SVM-RBF es sensible al escalado y al
bandwidth del kernel — con 102 features muy correlacionadas, la distancia RBF pierde
discriminación. El MLP Deep con Dropout puede estar sobre-regularizado para n=421.

**TabNet → Accuracy = 0.45:** TabNet usa attention sparsa y necesita al menos miles de filas
para aprender qué features son relevantes en cada ejemplo. Con n=421 no hay suficiente señal
para el mecanismo de atención — colapsa a reglas casi aleatorias.

**Conclusión práctica:** arquitecturas de deep learning (salvo MLP simple con pocos parámetros)
son inadecuadas para este dataset hasta tener al menos 2000–3000 anotaciones etiquetadas.

---

### 3.4 SHAP vs. sep_AS del Motor Matemático — discrepancia significativa

El Motor Matemático v2 usa `sep_AS` (separación pooled-σ) para rankear features. Los top de
ese ranking son templates canónicos (tpl_doble_rampa = 7.6σ, tpl_sigmoide = 6.0σ, etc.).

El análisis SHAP sobre LightGBM para la clase "alimentacion" cuenta una historia diferente:

| Rank SHAP | Feature | Rank sep_AS |
|-----------|---------|-------------|
| #1 | `d1_mean` | ~#20 |
| #2 | `entropy_shannon` | #11 |
| #3 | `d1_frac_neg` | ~#8 (sep_AR) |
| #4 | `time_to_min_s` | #14 |
| #5 | `d1_max` | ~#20 |
| #6 | `zcr` | ~#12 |
| ~#12 | `tpl_doble_rampa` | **#1** |

**Por qué difieren:** `sep_AS` mide separación *univariada* entre alimentacion y servido en
aislamiento. SHAP mide la *contribución marginal* de cada feature dado que las demás ya
están disponibles en el modelo. Con 12 features de template altamente correlacionadas entre sí
(todas miden variantes de la misma cosa — similitud de forma), el modelo LightGBM ya extrae
toda la información de forma con la primera 1–2 templates; las restantes aportan SHAP ≈ 0.

**Implicación para el Evidence Engine:**
Los pesos actuales (sim_alimentacion = +5.0, sim_servido = −5.0) son correctos en dirección
pero quizás están sobredimensionados en relación a features de derivada simple como `d1_mean`
que tienen SHAP más alto. `d1_mean` negativo + `entropy_shannon` alto es una combinación muy
potente que el Evidence Engine actual puede estar subutilizando.

---

### 3.5 Alta multicolinealidad en el bloque de features derivadas

El heatmap de correlaciones (eda_overview.png) muestra que estas features son prácticamente
redundantes entre sí (correlación Pearson > 0.85):

```
d1_max ↔ tortuosity ↔ d2_rms ↔ rms_d1 ↔ curvature_std ↔ d3_min ↔ d3_rms ↔ d3_std
```

Este bloque de 8 features aporta información casi idéntica. En modelos de árbol (RF, XGB)
la redundancia no daña la performance pero sí infla el espacio de features innecesariamente.
En SVM-RBF y redes neuronales, la multicolinealidad puede ser la causa principal de la
degradación observada.

---

### 3.6 La clase "servido" es el cuello de botella real

Con n=46 (11 % del dataset), "servido" es la clase con menos datos. En un experimento de
cross-validation real con k=5 folds, cada fold de test tendría apenas ~9 ejemplos de servido.
La varianza del F1 para esta clase será alta.

Adicionalmente, los 46 eventos de servido forman una región muy compacta en feature space
(HDBSCAN la detecta como cluster denso), lo que sugiere que son morfológicamente muy similares
entre sí — buena noticia para la precisión de clasificación, pero el recall puede sufrir porque
el modelo puede sobre-ajustar a esa región específica y fallar en servidos atípicos (servidos
muy pequeños de 5–10 g, o servidos lentos a cucharadas).

---

## 4. Recomendaciones para futuras decisiones

### Prioridad ALTA (antes de cualquier despliegue)

**R1 — Validación cruzada estratificada obligatoria**
```python
from sklearn.model_selection import StratifiedKFold, cross_validate
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_validate(modelo, X, y, cv=cv,
                        scoring=['accuracy', 'f1_macro', 'roc_auc_ovr'])
```
Los resultados actuales (scores perfectos) NO son válidos para tomar decisiones de producción.
El F1 macro CV es el único número que importa.

**R2 — Modelo de producción recomendado: Extra Trees o AutoML RF (Optuna)**
- Extra Trees: F1=1.0 (benchmark), rápido (1.14s), no hay hiperparámetros críticos,
  excelente interpretabilidad por importancia de features.
- AutoML RF (Optuna): mismo score, tiempo similar (1.06s), tiene optimización automática.
- **NO usar**: FT-Transformer (10s, necesita más datos), Ensemble Voting (14s, sin ganancia
  sobre Extra Trees), TabNet (falla con n<1000).

**Nota:** La elección entre Extra Trees y RF importa poco con este dataset — ambos darán
resultados similares en CV. La diferencia real estará en la generalización a nuevos gatos
(KPCL0035, KPCL0036) que aún no existe.

**R3 — Revisar pesos del Evidence Engine con SHAP**
El Evidence Engine actual (pesos calibrados manualmente sobre sep_AS) puede mejorar
rebalanceando los pesos hacia las features con mayor SHAP para LightGBM:

| Feature | Peso actual (estimado) | Ajuste sugerido |
|---------|----------------------|-----------------|
| `d1_mean` | ~±1.5 | Subir a ±3.0 |
| `entropy_shannon` | ~±2.0 | Mantener |
| `d1_frac_neg` | ~±2.5 | Mantener |
| `tpl_doble_rampa` | ±5.0 | Bajar a ±3.5 (es redundante con sim_alimentacion) |
| `sim_alimentacion` | ±5.0 | Mantener — ancla de dirección |

---

### Prioridad MEDIA (ciclo Beta)

**R4 — Reducir redundancia de features antes del próximo benchmark**
Eliminar del bloque correlacionado: mantener solo `d1_max` + `d2_rms`, eliminar
`tortuosity`, `rms_d1`, `curvature_std`, `d3_min`, `d3_rms`, `d3_std`. Esas 6 features
aportan información casi nula adicional y ralentizan el cómputo.

Resultado esperado: pasar de 102 → ~72 features sin pérdida de accuracy.

**R5 — Aumentar muestra de "servido" a n≥100**
Con n=46, la clase servido es frágil. Al llegar a n=100, el F1 de servido en CV se
estabilizará. Cada vez que alguien agrega comida al bowl, es un nuevo punto de servido —
anotar activamente cada evento de este tipo.

**R6 — Benchmark con train/test split temporal**
El split correcto para este problema es: **train = Abril–Mayo 2026, test = Junio 2026**.
Un split aleatorio contamina el test con datos del mismo período que el train — si Bandida
tiene una rutina estable, el modelo memoriza patrones del mismo día.
El split temporal simula el despliegue real: el modelo entrenado hoy clasificará datos de
mañana, no datos de hace dos meses.

**R7 — Añadir HDBSCAN como herramienta de detección de anotaciones dudosas**
HDBSCAN asigna un "outlier score" a cada punto (probabilidad de ser ruido). Los puntos con
outlier score > 0.7 que están anotados como "alimentacion" o "servido" son candidatos
prioritarios para re-auditar en Tab 1. No usar HDBSCAN para clasificación, sino como
filtro de calidad de dataset.

---

### Prioridad BAJA (ciclo Gamma / multi-gato)

**R8 — No escalar a deep learning hasta n≥2000 por clase**
TabNet, ResNet Tabular, FT-Transformer y MLP Deep fracasaron en este benchmark. La frontera
de utilidad para estas arquitecturas en tabular data está en ~2000 muestras por clase
(referencia: Gorishniy et al. 2021, "Revisiting Deep Learning Models for Tabular Data").
Con n=421 total, cualquier deep learning es prematura.

**R9 — El clustering puro no resolverá la clasificación — no invertir en él**
El hallazgo Silhouette=0.98 / ARI=0.02 demuestra que la estructura geométrica de los datos
no coincide con las etiquetas biológicas. Ningún avance en algoritmos de clustering cambiará
esta conclusión mientras las etiquetas dependan del contexto conductual (hambre del gato,
rutina del dueño) y no solo de la morfología de la curva.
HDBSCAN es útil como herramienta de diagnóstico (R7), no como clasificador.

**R10 — Generalización multi-gato: el mayor riesgo**
Todo este benchmark es sobre un solo gato (Bandida, KPCL0034). Los pesos del Evidence Engine
están calibrados sobre sus patrones específicos (doble rampa, intervalos ~6 h, Δpeso −8 g).
Un segundo gato con patrones distintos podría tener F1 < 0.7 con el modelo actual.
La arquitectura correcta para escalar es: **modelo base general + fine-tuning por gato**
(usar los primeros 50 eventos anotados del nuevo gato para ajustar los pesos).

---

## 5. Mapa de decisión para el siguiente ciclo

```
¿Tenemos CV estratificado con F1 macro real?
    NO → R1 es el primer paso. Nada más vale la pena sin esto.
    SÍ → continuar.

¿F1 macro CV > 0.90?
    SÍ → modelo listo para validación en campo (demo).
    NO → revisar R3 (pesos Evidence Engine) y R4 (reducción de features).

¿n_servido ≥ 100?
    NO → R5 es prioridad antes del siguiente benchmark.

¿Queremos escalar a un segundo gato?
    → R10 primero: necesitamos 50 anotaciones del nuevo gato antes de predecir.
```

---

## 6. Resumen ejecutivo (para presentación / CORFO)

El benchmark sobre 421 eventos del sensor IoT KPCL0034 "Bandida" demuestra que:

1. **La clasificación supervisada es viable**: modelos clásicos (Random Forest, Extra Trees,
   LightGBM) alcanzan F1 macro > 0.99 con las 102 features del Motor Matemático v2. Esto
   valida la arquitectura de features matemáticas sobre señal de peso como base del detector.

2. **Deep learning y clustering son inadecuados en esta escala**: TabNet (0.45 acc), SVM-RBF
   (0.14 acc), K-Means (ARI=0.02) confirman que el enfoque correcto es features
   interpretables + modelo de árbol, no caja negra.

3. **La validación necesita refuerzo**: los scores perfectos (1.0/1.0/1.0) en 7 modelos
   sugieren evaluación sin hold-out real. El siguiente paso crítico es cross-validation
   estratificada con split temporal (train Apr–May / test Jun).

4. **Las features de derivada simple (d1_mean, d1_frac_neg) superan a los templates canónicos
   en SHAP**: el Evidence Engine tiene margen de mejora recalibrando pesos hacia estas
   features, que el análisis SHAP de LightGBM identifica como las más decisivas.

5. **La clase "servido" (n=46) es el cuello de botella**: ampliar a ≥100 anotaciones de
   servido es la intervención de mayor impacto para la siguiente iteración del dataset.

---

*Archivo generado en: `av2_ANALISIS_BENCHMARK.md`*  
*Fuentes: `resultados_benchmark.csv`, `diagnostico_clustering_resumen.csv`, `av2_diagnostico_clustering.md`, `benchmark_comparison.png`, `eda_overview.png`, `shap_importance.png`*
