---
tags: [kittypau, ciclo-alpha-v2, umbrales, clasificacion, reglas, detector]
fecha_creacion: 2026-06-26
version_actual: "1.2"
estado: activo
---

# Umbrales y Reglas del Detector

> Ver [[av2_00_INDICE_AV2]] para el índice completo. Las reglas se derivan de las [[av2_07_RESULTADOS_304_ANOTACIONES|304 anotaciones]].

> [!warning] PENDIENTE — Próxima sesión de trabajo
> El clasificador actual (3 reglas if/else con 6 condiciones) está pensado para evolucionar a un **Evidence Engine**: cada una de las ~200 features futuras aportará evidencia ponderada a las hipótesis alimentacion/servido/ruido, produciendo un score acumulado explicable en lugar de decisiones binarias tempranas. Además, el detector de candidatos se extenderá con CUSUM, PELT y Binary Segmentation para mejorar la detección de bordes.
> Ver arquitectura completa en [[av2_09_EVOLUCION_MOTOR_MATEMATICO]].

**Archivo:** `fase_0_ruido/config/umbrales.json`
**Versión actual:** 1.2 (2026-06-26)

---

## Historia de versiones

| Versión | Fecha | Anotaciones | Cambios principales |
|---|---|---|---|
| 1.0 | 2026-06 | ~50 | Umbrales iniciales estimados |
| 1.1 | 2026-06 | 186 | Primer ajuste empírico. Delta servido: 5g→25g |
| **1.2** | **2026-06-26** | **304** | Shape features como discriminador primario. Umbral coseno 0.70 |

---

## Estructura del archivo JSON

`umbrales.json` tiene tres secciones:

```json
{
  "deteccion":                { ... },   // parámetros de 01_genera_candidatos.py
  "clasificacion_referencia": { ... },   // reglas de clasificación por categoría
  "notas_detector":           { ... }    // orden de evaluación y observaciones
}
```

---

## Sección 1 — Parámetros de Detección

Usados por [[av2_03_DETECCION_SEGMENTOS|`01_genera_candidatos.py`]] para detectar candidatos:

| Parámetro | Valor | Descripción |
|---|---|---|
| `umbral_std_g` | 1.5 g | Std. rodante mínima para actividad |
| `umbral_delta_g` | 5.0 g | Rango rodante mínimo para actividad |
| `min_rango_g` | 4.0 g | Rango mínimo del segmento |
| `min_duracion_s` | 45 s | Duración mínima del segmento |
| `gap_merge_s` | 120 s | Gap máximo para fusionar segmentos |
| `resample_s` | 30 s | Frecuencia de resampleo |
| `ventana_std_lecturas` | 10 | Ventana para std rodante (5 min) |
| `ventana_delta_lecturas` | 20 | Ventana para rango rodante (10 min) |

> **Filosofía:** umbrales bajos para detectar de más. El filtrado es responsabilidad de la anotación manual.

---

## Sección 2 — Reglas de Clasificación por Categoría

### Reglas de SERVIDO

```json
"servido": {
    "direction":           "subida",
    "duracion_min_min":    0.5,
    "duracion_min_max":    15.0,
    "delta_w_min_g":       20.0,
    "rango_min_g":         25.0,
    "pendiente_min_g_min": 1.0,
    "sim_servido_min":     0.70
}
```

**Regla en lenguaje natural:**
> Un candidato es SERVIDO si: `sim_servido > 0.70` AND `Δpeso > +20g` AND `duración < 15 min`
> (Alternativa clásica: `Δpeso > +25g` AND `pendiente > +1 g/min`)

**Estadísticas de referencia (n=31):**

| Métrica | Media | Min obs. | Max obs. |
|---|---|---|---|
| Duración | 4.1 min | 1.0 | 62.0 (outlier) |
| Δpeso | +64.8 g | 0.0 | +129.0 |
| Rango | +69.6 g | 0.0 | +200.0 |
| Pendiente | +39.4 g/min | −0.02 | +126.0 |
| sim_servido | +0.875 | +0.707 | +0.942 |

---

### Reglas de ALIMENTACIÓN

```json
"alimentacion": {
    "direction":           "bajada",
    "duracion_min_min":    1.0,
    "duracion_min_max":    20.0,
    "delta_w_max_g":       -3.0,
    "rango_min_g":         5.0,
    "pendiente_max_g_min": -0.4,
    "sim_alimentacion_min": 0.70,
    "monotonicity_max":    -0.03,
    "r2_lineal_min":       0.35
}
```

**Regla en lenguaje natural:**
> Un candidato es ALIMENTACIÓN si: `sim_alimentacion > 0.70` AND `monotonicity < -0.03` AND `Δpeso < -3g` AND `duración 1-20 min`
> (Alternativa clásica: `Δpeso < -5g` AND `pendiente < -0.4 g/min` AND `r2 > 0.35`)

**Estadísticas de referencia (n=160):**

| Métrica | Media | P10 | P90 |
|---|---|---|---|
| Duración | 6.9 min | — | — |
| Δpeso | −12.2 g | −20.0 | −6.0 |
| Pendiente | −1.61 g/min | — | −0.40 |
| sim_alimentacion | +0.881 | +0.800 | +0.959 |
| monotonicity | −0.090 | −0.148 | −0.027 |
| r2_lineal | 0.570 | 0.391 | 0.726 |

---

### Reglas de RUIDO

```json
"ruido": {
    "direction":                "mixto",
    "pendiente_abs_max_g_min":  4.9,
    "_discriminador_clave":     "sim_alim < 0.70 AND sim_serv < 0.70 → RUIDO"
}
```

**Regla en lenguaje natural:**
> Un candidato es RUIDO si no cumple las condiciones de SERVIDO ni ALIMENTACIÓN.
> Es la **categoría residual** del clasificador.

**Estadísticas de referencia (n=113):**

| Métrica | Media | Min obs. | Max obs. |
|---|---|---|---|
| Duración | 12.0 min | 4.0 | 43.0 |
| Δpeso | +0.81 g | −62.0 | +89.0 |
| Pendiente | +0.02 g/min | −3.52 | +4.87 |
| sim_alimentacion | +0.021 | — | — |
| sim_servido | −0.021 | — | — |

---

## Sección 3 — Orden de Evaluación del Detector

El detector aplica las reglas **en orden** y se detiene en el primer match:

```
1. ¿sim_servido > 0.70 AND delta_w > +20g AND duracion < 15 min?
   → SÍ: clasificar como SERVIDO → parar

2. ¿sim_alim > 0.70 AND monotonicity < -0.03 AND delta_w < -3g AND duracion 1-20 min?
   → SÍ: clasificar como ALIMENTACIÓN → parar

3. En cualquier otro caso:
   → clasificar como RUIDO
```

**¿Por qué este orden?** El SERVIDO tiene los criterios más estrictos y es la categoría menos frecuente — se evalúa primero para evitar que un servido con ruido sea clasificado erróneamente como ALIMENTACIÓN.

---

## Mejores discriminadores (ranking)

Los features ordenados por poder discriminativo real, según [[av2_07_RESULTADOS_304_ANOTACIONES]]:

| Rank | Feature | Separa | Nota |
|---|---|---|---|
| 1 | `sim_servido` | Servido vs. resto | alim=−0.881, serv=+0.875, ruido=−0.021 |
| 2 | `sim_alimentacion` | Alimentación vs. resto | alim=+0.881, serv=−0.875, ruido=+0.021 |
| 3 | `monotonicity` | Alimentación (negativa) | alim=−0.090, serv=+0.008, ruido=−0.008 |
| 4 | `r2_lineal` | Alimentación (alta) | alim=0.570, serv=0.240, ruido=0.233 |
| 5 | `delta_w_total` | Servido (muy positivo) | serv=+64.8g, alim=−12.2g, ruido=+0.8g |
| 6 | `zcr` | Sin discriminación clara | Valores similares en las 3 categorías |

---

## Cambios entre v1.1 y v1.2

| Parámetro | v1.1 (186 anot.) | v1.2 (304 anot.) | Razón del cambio |
|---|---|---|---|
| Servido `delta_w_min_g` | 25.0 | 20.0 | Ampliar cobertura (P10 real = +26g) |
| Servido `rango_min_g` | 30.0 | 25.0 | Más conservador |
| Servido `pendiente_min_g_min` | 2.0 | 1.0 | Algunos servidos lentos válidos |
| Servido `duracion_min_max` | 10.0 | 15.0 | P90 real > 10 min |
| Alim. `delta_w_max_g` | −5.0 | −3.0 | Capturar sesiones cortas |
| Alim. `duracion_min_min` | 2.0 | 1.0 | Sesiones de 1 min observadas |
| **NUEVO** `sim_servido_min` | — | 0.70 | Discriminador primario |
| **NUEVO** `sim_alimentacion_min` | — | 0.70 | Discriminador primario |
| **NUEVO** `monotonicity_max` (alim) | — | −0.03 | Confirmar bajada sostenida |
| **NUEVO** `r2_lineal_min` (alim) | — | 0.35 | Confirmar tendencia lineal |

---

## Ver también

- [[av2_04_MATEMATICA_SHAPE_FEATURES]] — Cómo se calculan las shape features
- [[av2_07_RESULTADOS_304_ANOTACIONES]] — Datos empíricos que fundamentan estos umbrales
- [[av2_03_DETECCION_SEGMENTOS]] — Sección `deteccion` usada en `01_genera_candidatos.py`
- [[av2_08_APP_ANOTACION_AV2]] — Ajuste visual de umbrales en Tab 4 de la app
