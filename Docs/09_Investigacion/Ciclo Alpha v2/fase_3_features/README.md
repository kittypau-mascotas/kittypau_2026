---
fase: 3
nombre: Features de Segmento
estado: pendiente
ciclo: Alpha v2
---

# Fase 3 — Features de Segmento

> **Objetivo:** Para cada segmento detectado en Fase 2, calcular un vector de features
> que describe la **forma completa** de la curva.

Aquí está el salto conceptual central: en lugar de features por lectura,
se calculan features por **evento completo**.

---

## Input

- `../fase_2_segmentacion/data/segments.parquet` — índices de segmentos
- `../fase_1_extraccion/data/readings_raw.parquet` — datos de peso crudos

## Output esperado

| Artefacto | Descripción |
|-----------|-------------|
| `data/segments_features.parquet` | Un vector de features por segmento |

---

## Features del segmento

| Feature | Descripción | Por qué importa |
|---------|-------------|-----------------|
| `duracion_s` | Duración total en segundos | Alimentacion: 2–10 min; Servido: 20–60s |
| `delta_peso_total` | `peso_final - peso_inicial` | Negativo = alim; Positivo = servido |
| `pendiente_ascenso` | Velocidad máxima de subida (g/s) | Alta en servido, casi 0 en alim |
| `pendiente_descenso` | Velocidad de bajada (g/s) | Suave y prolongada en alim |
| `peso_inicial` | Peso bruto al inicio del segmento | Contexto de nivel |
| `peso_final` | Peso bruto al final del segmento | Contexto de nivel |
| `area_bajo_curva` | Integral de |peso - peso_inicial| dt | Volumen total de cambio |
| `tiempo_hasta_pico` | Segundos desde inicio hasta max local | Rápido = servido |
| `variabilidad_plateau` | std del peso en la fase estable post-evento | Ruido residual |
| `hora_inicio_sin` | `sin(hora_local × 2π/24)` | Bandida come a horas regulares |
| `hora_inicio_cos` | `cos(hora_local × 2π/24)` | Componente cíclica del horario |

---

## Heurística baseline (antes del modelo)

```python
# Separación casi perfecta con solo una feature:
if delta_peso_total > +5:
    categoria = "servido"
elif delta_peso_total < -5 and duracion_s > 120:
    categoria = "alimentacion"
else:
    categoria = "ruido"
```

El modelo ML de Fase 5 debe superar esta heurística para justificar su uso.

---

## Script a crear

| Script | Acción |
|--------|--------|
| `01_calcular_features.py` | Itera sobre segmentos, calcula todos los features, guarda parquet |
| `02_validar_features.py` | Distribuciones por clase, detección de outliers |
| `03_visualiza_features.py` | Scatter plots y violin plots por categoría |

---

## Criterio de éxito

- `delta_peso_total` sola discrimina servido vs. alimentacion con precisión ≥ 90%
  (si no, hay un problema en Fase 2)
- Los features de forma (`pendiente_ascenso`, `tiempo_hasta_pico`) añaden
  información complementaria visible en los gráficos
