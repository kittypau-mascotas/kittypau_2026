---
tags: [kittypau, ciclo-alpha-v2, matematica, shape-features, features, señales]
fecha_creacion: 2026-06-26
estado: activo
aliases: [Shape Features, Features de Forma, Matemática del Detector]
---

# Matemática del Detector — Shape Features

> Ver [[av2_00_INDICE_AV2]] para el índice completo.
> Estas features se calculan en [[av2_03_DETECCION_SEGMENTOS]] y se usan en [[av2_06_UMBRALES_Y_REGLAS]].

> [!success] MOTOR v2 IMPLEMENTADO — 2026-06-26
> Las 5 features F00 (monotonía, R², ZCR, sim_alim, sim_serv) documentadas aquí siguen siendo la base. El Motor Matemático v2 las extiende a **~105 features en 15 familias** implementadas en `shape_features_v2.py`.
> Ver [[av2_09_EVOLUCION_MOTOR_MATEMATICO]] para el detalle completo del motor v2.

---

## ¿Por qué features de forma?

Las métricas clásicas (Δpeso, pendiente, duración) no separan bien las categorías cuando hay variabilidad en la señal real. Por ejemplo:

- Un evento de **ruido** de 30g de rango puede confundirse con **alimentación** si solo miramos el rango
- Un **servido** muy gradual puede confundirse con **alimentación** si solo miramos la pendiente

Las **shape features** (features de forma) capturan la *geometría* de la curva de peso, no solo sus valores extremos. La pregunta que responden es: **¿a qué forma se parece este segmento?**

---

## Input: el segmento normalizado

Dado un segmento de `n` lecturas de peso `[w₀, w₁, ..., wₙ₋₁]`:

**Función de entrada en Python:**
```python
def _shape_features(valores: np.ndarray) -> dict:
    n  = len(valores)
    dy = np.diff(valores)   # derivada discreta: [w₁-w₀, w₂-w₁, ..., wₙ₋wₙ₋₁]
    ...
```

Todas las features se calculan sobre el array `valores` y su derivada `dy`.

---

## Feature 1 — Índice de Monotonía

### Definición matemática

$$\text{monotonicity} = \frac{1}{n-1} \sum_{i=0}^{n-2} \text{sign}(w_{i+1} - w_i)$$

Donde $\text{sign}(x) = \begin{cases} +1 & x > 0 \\ 0 & x = 0 \\ -1 & x < 0 \end{cases}$

### Interpretación

- **−1.0**: el peso baja en cada una de las `n-1` transiciones → bajada perfectamente monótona
- **+1.0**: el peso sube en cada transición → subida perfectamente monótona
- **0.0**: mitad de las transiciones suben, mitad bajan → oscilación pura (ruido)

El índice no mide la *magnitud* del cambio, solo si cada paso es hacia arriba o hacia abajo.

### Implementación

```python
monotonicity = float(np.mean(np.sign(dy))) if len(dy) > 0 else 0.0
```

### Valores observados (417 anotaciones)

| Categoría | Media | Std | P10 | P90 |
|---|---|---|---|---|
| alimentacion | −0.090 | 0.051 | −0.148 | −0.027 |
| servido | +0.008 | 0.061 | −0.086 | +0.045 |
| ruido | −0.008 | 0.059 | −0.091 | +0.061 |

**Por qué funciona:** La alimentación tiene bajada *consistente* aunque no perfecta (la gata come en pequeñas tandas con pausas). El ruido y el servido oscilan o suben sin consistencia. El servido sube rápido en pocos pasos grandes, pero el sensor registra muchas micro-oscilaciones entre cada subida, llevando el índice hacia 0.

**Umbral detector:** `monotonicity < −0.03` confirma bajada sostenida (filtro secundario para alimentación).

---

## Feature 2 — R² del Ajuste Lineal

### Definición matemática

Se ajusta una recta por **mínimos cuadrados** al segmento:

$$\hat{w}_i = a \cdot i + b \quad \text{donde} \quad (a, b) = \arg\min \sum_{i=0}^{n-1}(w_i - \hat{w}_i)^2$$

Luego se calcula el coeficiente de determinación:

$$R^2 = 1 - \frac{SS_{res}}{SS_{tot}}$$

Donde:
- $SS_{res} = \sum_{i=0}^{n-1}(w_i - \hat{w}_i)^2$ — suma de cuadrados de residuos (error de la recta)
- $SS_{tot} = \sum_{i=0}^{n-1}(w_i - \bar{w})^2$ — varianza total de la señal (con $\bar{w}$ = media)

### Interpretación

- **R² = 1.0**: el segmento es una recta perfecta (tendencia completamente lineal)
- **R² = 0.0**: la recta no explica nada (varianza igual a la media)
- **R² < 0**: la recta ajusta *peor* que la media (señal muy errática)

### Implementación

```python
x      = np.arange(n, dtype=float)
coef   = np.polyfit(x, valores, 1)       # [pendiente, intercepto]
fitted = np.polyval(coef, x)             # valores predichos
ss_res = float(np.sum((valores - fitted) ** 2))
ss_tot = float(np.sum((valores - valores.mean()) ** 2))
r2     = round(1.0 - ss_res / ss_tot, 3) if ss_tot > 1e-6 else 0.0
```

La condición `ss_tot > 1e-6` evita división por cero en segmentos con peso constante.

### Valores observados (417 anotaciones)

| Categoría | Media | Std | P10 | P90 |
|---|---|---|---|---|
| alimentacion | 0.570 | 0.138 | 0.391 | 0.726 |
| servido | 0.240 | 0.148 | 0.063 | 0.384 |
| ruido | 0.233 | 0.182 | 0.053 | 0.457 |

**Por qué funciona:** La alimentación sigue una tendencia lineal descendente porque la gata come de forma gradual y sostenida. El ruido y el servido no se ajustan a una recta: el ruido oscila, el servido sube rápido y luego se estabiliza (forma asintótica, no lineal).

**Umbral detector:** `r2 > 0.35` como filtro complementario para confirmar alimentación.

---

## Feature 3 — Zero-Crossing Rate (ZCR) de la Derivada

### Definición matemática

La ZCR mide con qué frecuencia la derivada cambia de signo:

$$\text{ZCR} = \frac{1}{\max(n-2, 1)} \sum_{i=0}^{n-3} \mathbb{1}\left[\text{sign}(dy_{i+1}) \neq \text{sign}(dy_i)\right]$$

Donde $dy_i = w_{i+1} - w_i$ es la derivada discreta y $\mathbb{1}[\cdot]$ es la función indicadora (1 si verdadero, 0 si falso).

En otras palabras: **¿en qué fracción de los pasos la derivada cambia de dirección?**

### Interpretación

- **ZCR = 0.0**: la derivada nunca cambia de signo → bajada o subida perfectamente monótona
- **ZCR = 1.0**: la derivada cambia de signo en cada paso → oscilación máxima (ruido puro)
- **ZCR = 0.5**: la derivada cambia de dirección en la mitad de los pasos

### Implementación

```python
zcr = round(
    float(np.sum(np.diff(np.sign(dy)) != 0) / max(len(dy), 1)), 3
) if len(dy) > 1 else 0.0
```

`np.diff(np.sign(dy))` da 0 cuando el signo no cambia, ±2 o ±1 cuando sí cambia.

### Valores observados (417 anotaciones)

| Categoría | Media | Std | Rango |
|---|---|---|---|
| alimentacion | 0.277 | 0.075 | 0.087 – 0.514 |
| servido | 0.185 | 0.109 | 0.087 – 0.458 |
| ruido | 0.208 | 0.094 | 0.087 – 0.477 |

**Observación importante:** La ZCR es un discriminador *complementario*, no primario. Las tres categorías tienen valores similares (~0.2 en promedio). Sin embargo, alimentación tiende a tener ZCR levemente mayor que servido porque la señal real tiene pequeñas oscilaciones alrededor de la tendencia descendente.

---

## Feature 4 — Similitud Coseno con Templates Ideales

### El concepto de template matching

La idea central: si un segmento de alimentación "se parece" a una bajada lineal ideal, entonces la similitud coseno entre el segmento normalizado y la rampa ideal debería ser alta. Lo mismo para servido con una subida lineal.

### Paso 1: Normalización del segmento

El segmento se normaliza de forma invariante a escala y nivel absoluto:

$$\mathbf{v}_{delta} = [w_0 - w_0,\ w_1 - w_0,\ \ldots,\ w_{n-1} - w_0] = [0, \Delta_1, \Delta_2, \ldots, \Delta_{n-1}]$$

$$\mathbf{v}_{norm} = \frac{\mathbf{v}_{delta}}{\max(|\mathbf{v}_{delta}|) + \epsilon}$$

donde $\epsilon = 10^{-6}$ evita división por cero.

**Resultado:** el vector normalizado siempre empieza en 0 y su valor más extremo es ±1.

### Paso 2: Templates ideales

Se crean dos rampa lineales del mismo largo `n` que el segmento:

```python
template_alimentacion = np.linspace(0.0, -1.0, n)   # baja de 0 a -1
template_servido      = np.linspace(0.0, +1.0, n)   # sube de 0 a +1
```

Ejemplo para n=5:
- Template alimentación: `[0.0, -0.25, -0.50, -0.75, -1.0]`
- Template servido: `[0.0, +0.25, +0.50, +0.75, +1.0]`

### Paso 3: Similitud coseno

$$\cos(\theta) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \cdot \|\mathbf{b}\|}$$

```python
def _cos(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 1e-9 else 0.0

sim_alim = round(_cos(v_norm, np.linspace(0.0, -1.0, n)), 3)
sim_serv = round(_cos(v_norm, np.linspace(0.0, +1.0, n)), 3)
```

### Interpretación geométrica

La similitud coseno mide el **ángulo** entre dos vectores en el espacio n-dimensional, independientemente de sus magnitudes:

- **+1.0**: los vectores apuntan exactamente en la misma dirección → el segmento tiene forma idéntica al template
- **0.0**: los vectores son ortogonales → no hay relación de forma
- **−1.0**: los vectores apuntan en dirección opuesta → el segmento es exactamente inverso al template

### La relación matemática entre sim_alim y sim_serv

Por construcción, `template_alimentacion = -template_servido`. Por la linealidad del producto punto:

$$\cos(\theta_{alim}) = \frac{\mathbf{v} \cdot \mathbf{t}_{alim}}{\|\mathbf{v}\|\|\mathbf{t}_{alim}\|} = -\frac{\mathbf{v} \cdot \mathbf{t}_{serv}}{\|\mathbf{v}\|\|\mathbf{t}_{serv}\|} = -\cos(\theta_{serv})$$

Por eso: `sim_alimentacion ≈ -sim_servido` siempre. Si un segmento se parece a una bajada, **necesariamente** no se parece a una subida.

### Valores observados (417 anotaciones)

| Categoría | sim_alim media | sim_alim P10 | sim_serv media | sim_serv P10 |
|---|---|---|---|---|
| alimentacion | +0.881 | +0.800 | −0.881 | −0.959 |
| servido | −0.875 | −0.903 | +0.875 | +0.826 |
| ruido | +0.021 | −0.893 | −0.021 | −0.886 |

**Observación clave para ruido:** Los P10 y P90 de ruido son extremos (~±0.89). Esto indica que ~10% del ruido se "parece" a alimentación y ~10% se "parece" a servido según el coseno solo. Por eso se necesitan filtros secundarios (monotonía, delta_w) para evitar falsos positivos.

---

## Mapa de discriminación 2D

La visualización más poderosa es el **scatter de sim_alim vs sim_serv**:

```
sim_servido
    +1 │                    ●●● SERVIDO
       │                ●●●
  +0.7 │··············●●············
       │          ●●●
     0 │      ×××× RUIDO ××××
       │  ×××
  -0.7 │··············×××···········
       │          ○○○
    -1 │      ○○○ ALIMENTACION
       └──────────────────────────── sim_alim
           -1    -0.7    0   +0.7  +1
```

Las tres categorías ocupan regiones distintas del plano:
- **Alimentación**: esquina inferior izquierda (sim_alim≈+0.88 → aparece a la derecha en x, sim_serv≈−0.88)
- **Servido**: esquina superior izquierda (sim_serv≈+0.88)
- **Ruido**: banda central (ambas similitudes cercanas a 0)

Las líneas punteadas en `±0.7` son los umbrales de decisión implementados en [[av2_06_UMBRALES_Y_REGLAS]].

---

## Resumen de poder discriminativo

| Feature | Mejor discrimina | Discriminación |
|---|---|---|
| sim_alimentacion | Alimentación vs. resto | ⭐⭐⭐⭐⭐ Primaria |
| sim_servido | Servido vs. resto | ⭐⭐⭐⭐⭐ Primaria |
| monotonicity | Alimentación (negativa) | ⭐⭐⭐ Secundaria |
| r2_lineal | Alimentación (alta) | ⭐⭐⭐ Secundaria |
| zcr | Ninguna clara | ⭐ Complementaria |

---

## Código completo de la función

```python
def _shape_features(valores: np.ndarray) -> dict:
    """Monotonía, R² lineal, ZCR y similitud coseno con templates ideales."""
    n  = len(valores)
    dy = np.diff(valores)

    # Feature 1: Índice de monotonía
    monotonicity = float(np.mean(np.sign(dy))) if len(dy) > 0 else 0.0

    # Feature 2: R² del ajuste lineal
    x      = np.arange(n, dtype=float)
    coef   = np.polyfit(x, valores, 1)
    fitted = np.polyval(coef, x)
    ss_res = float(np.sum((valores - fitted) ** 2))
    ss_tot = float(np.sum((valores - valores.mean()) ** 2))
    r2     = round(1.0 - ss_res / ss_tot, 3) if ss_tot > 1e-6 else 0.0

    # Feature 3: ZCR de la derivada
    zcr = round(
        float(np.sum(np.diff(np.sign(dy)) != 0) / max(len(dy), 1)), 3
    ) if len(dy) > 1 else 0.0

    # Feature 4: Similitud coseno con templates
    v_delta   = valores - valores[0]          # señal relativa al inicio
    v_abs_max = float(np.max(np.abs(v_delta))) + 1e-6
    v_norm    = v_delta / v_abs_max           # normalización [-1, 1]

    def _cos(a: np.ndarray, b: np.ndarray) -> float:
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        return float(np.dot(a, b) / denom) if denom > 1e-9 else 0.0

    sim_alim = round(_cos(v_norm, np.linspace(0.0, -1.0, n)), 3)
    sim_serv = round(_cos(v_norm, np.linspace(0.0, +1.0, n)), 3)

    return {
        "monotonicity":     round(monotonicity, 3),
        "r2_lineal":        r2,
        "zcr":              zcr,
        "sim_alimentacion": sim_alim,
        "sim_servido":      sim_serv,
    }
```

---

## Consideraciones y limitaciones

### Sensibilidad al largo del segmento

Las features son **invariantes a la escala temporal** (no dependen de cuántos puntos tiene el segmento) porque:
- La similitud coseno normaliza por la norma de cada vector
- La monotonía es un promedio de signos (no de magnitudes)
- El R² compara residuos contra varianza total (ratio)

Sin embargo, segmentos muy cortos (< 5 lecturas) tienen features inestables por alta varianza muestral.

### Limitación del template lineal

La alimentación real no es perfectamente lineal: la gata hace pausas, vuelve al bowl, etc. En la práctica, sim_alim ≈ +0.88 (no +1.0) porque la señal real tiene zigzags alrededor de la tendencia.

El servido tampoco es lineal: el operador vierte comida en unos segundos y el sensor demora en estabilizarse. Por eso sim_serv ≈ +0.88 también.

### Templates canónicos — implementados en Motor v2

El Motor v2 incluye **12 templates canónicos** en la familia F12 (similitud coseno):
`tpl_ramp_down`, `tpl_exp_decay`, `tpl_alim_lenta`, `tpl_alim_escalonada`,
`tpl_ramp_up`, `tpl_exp_rise`, `tpl_sigmoide`, `tpl_serv_brusco`,
`tpl_plateau`, `tpl_triangular`, `tpl_parabola_down`, `tpl_doble_rampa`.

`tpl_doble_rampa` resultó ser el mejor discriminador de toda la suite (5.76σ A/S), superando a `sim_alimentacion`. Ver [[av2_09_EVOLUCION_MOTOR_MATEMATICO]] para el detalle.

---

## Ver también

- [[av2_03_DETECCION_SEGMENTOS]] — Dónde se calculan estas features (función `_shape_features`)
- [[av2_06_UMBRALES_Y_REGLAS]] — Cómo se usan los umbrales de estas features en el detector
- [[av2_07_RESULTADOS_ANOTACIONES]] — Estadísticas completas de las 417 anotaciones (F00 + top features v2)
- [[av2_09_EVOLUCION_MOTOR_MATEMATICO]] — Motor v2: 105 features en 15 familias + Evidence Engine
- [[av2_08_APP_ANOTACION_AV2]] — Visualización en la app (Tab 4 Umbrales + Tab 5 Motor Matemático)
