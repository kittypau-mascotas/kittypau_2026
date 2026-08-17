---
tags: [kittypau, ciclo-alpha-v2, anotacion, categorias, workflow]
fecha_creacion: 2026-06-26
estado: activo
---

# Anotación Manual y Categorías

> Ver [[av2_00_INDICE_AV2]] para el índice completo. Ver [[av2_08_APP_ANOTACION_AV2]] para la documentación técnica de la app.

---

## Las tres categorías de eventos

Toda la clasificación del Ciclo Alpha v2 se basa en tres categorías mutuamente excluyentes:

---

### 🍽️ Alimentación

**Descripción:** Bandida está comiendo. El peso del bowl baja de forma gradual y sostenida mientras la gata consume el alimento.

**Características físicas:**
- Bajada de peso *gradual* (la gata come en pequeñas cantidades con pausas)
- Duración típica: 1–20 minutos
- Δpeso neto negativo: entre −5g y −64g (media: −12.2g)
- Pendiente negativa sostenida: media −1.61 g/min
- La señal tiene micro-oscilaciones pero con tendencia clara hacia abajo

**Shape features características:**
- `sim_alimentacion` ≈ +0.88 (P10 = +0.80) — forma de rampa descendente
- `monotonicity` ≈ −0.09 — consistentemente negativa
- `r2_lineal` ≈ 0.57 — alta linealidad (tendencia clara)

---

### 🫙 Servido

**Descripción:** El operador está agregando comida al bowl. El peso sube rápidamente.

**Características físicas:**
- Subida de peso *rápida* (el operador vierte el alimento en segundos/minutos)
- Duración típica: 1–7 minutos (outlier 62 min: mislabel probable)
- Δpeso neto positivo: entre +13g y +129g (media: +64.8g)
- Pendiente muy positiva: media +39.4 g/min

**Shape features características:**
- `sim_servido` ≈ +0.88 (P10 = +0.83) — forma de rampa ascendente
- `monotonicity` ≈ 0 — no perfectamente monótono (el sensor oscila durante el llenado)
- `r2_lineal` ≈ 0.24 — baja linealidad (la subida es rápida, no lineal)

---

### 📶 Ruido

**Descripción:** Movimiento del bowl, perturbación del sensor, o fluctuaciones eléctricas. No corresponde a ningún evento real de alimentación o servido.

**Características físicas:**
- Sin tendencia neta: el peso oscila alrededor de un valor estable
- Δpeso neto cercano a 0 (media: +0.81g)
- Duración: puede ser larga (4–43 min) porque el sensor sigue oscilando
- Rango amplio (media 30g) causado por oscilaciones, no por movimiento real del alimento

**Shape features características:**
- `sim_alimentacion` ≈ 0 y `sim_servido` ≈ 0 — no se parece a ningún template
- `monotonicity` ≈ 0 — sin dirección consistente
- `r2_lineal` ≈ 0.23 — sin tendencia lineal

---

## Workflow de anotación

```
┌─────────────────────────────────────────────────────┐
│  1. Cargar candidatos_av2.csv en la app             │
│     916 candidatos detectados automáticamente       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  2. Seleccionar candidato (Tab 1 — Anotar)          │
│     • Por índice secuencial                         │
│     • Por filtro de dirección/fecha                 │
│     • Por ID específico                             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  3. Revisar el candidato                            │
│     • Gráfico interactivo (Plotly dark theme)       │
│     • Contexto de ±5 min alrededor del segmento     │
│     • Métricas: duración, Δpeso, rango, pendiente   │
│     • Shape features: monotonía, R², ZCR            │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  4. Asignar categoría                               │
│     ○ 🍽️ alimentacion                              │
│     ○ 🫙 servido                                    │
│     ○ 📶 ruido                                      │
│     [Notas opcionales]                              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  5. Guardar anotación                               │
│     → anotaciones_av2.csv (append)                  │
│     → Avanzar al siguiente candidato                │
└─────────────────────────────────────────────────────┘
```

---

## Estado de las anotaciones (actualizado 2026-08-16)

| Categoría | Anotaciones | Meta original | Estado |
|---|---|---|---|
| alimentacion | 356 | 40 | ✅ 890% |
| ruido | 374 | 30 | ✅ 1247% |
| servido | 84 | 20 | ✅ 420% |
| **Total** | **814** | **90** | ✅ **904%** |

Las metas se superaron ampliamente, dando mayor confianza estadística a los umbrales derivados.

---

## Estructura del CSV de anotaciones

`anotaciones_av2.csv` contiene las siguientes columnas:

| Columna | Tipo | Descripción |
|---|---|---|
| `id_anotacion` | int | ID secuencial de la anotación |
| `id_candidato` | int | ID del candidato anotado (join con `candidatos_av2.csv`) |
| `t_inicio` | timestamptz | Inicio del segmento (UTC, ISO8601) |
| `t_fin` | timestamptz | Fin del segmento (UTC, ISO8601) |
| `categoria` | str | `"alimentacion"` / `"servido"` / `"ruido"` |
| `notas` | str | Notas opcionales del operador |
| `device_code` | str | `"KPCL0034"` |
| `origen` | str | `"manual"` |
| `created_at` | timestamptz | Timestamp de la anotación |

---

## Outliers identificados durante la anotación

| Fecha | Categoría | Anomalía | Acción |
|---|---|---|---|
| 2026-05-06 20:54 | servido | Duración 62 min (mediana: 2 min) | Posible mislabel — excluir de stats |
| Varios | alimentacion | Δpeso positivo (+69g máx.) | Posible servido mal categorizado |
| Varios | ruido | Rango > 100g (9 casos) | Posible servido no detectado |

---

## Ver también

- [[av2_03_DETECCION_SEGMENTOS]] — Cómo se generan los candidatos a anotar
- [[av2_08_APP_ANOTACION_AV2]] — Documentación de la app Streamlit
- [[av2_07_RESULTADOS_ANOTACIONES]] — Estadísticas completas de las 814 anotaciones
- [[av2_06_UMBRALES_Y_REGLAS]] — Cómo las anotaciones derivan en umbrales
