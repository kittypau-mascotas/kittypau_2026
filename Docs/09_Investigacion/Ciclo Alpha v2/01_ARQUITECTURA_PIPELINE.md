---
tags: [kittypau, ciclo-alpha-v2, arquitectura, pipeline]
fecha_creacion: 2026-06-26
estado: activo
---

# Ciclo Alpha v2 — Arquitectura del Pipeline

> Ver [[00_INDICE_AV2]] para el índice completo del ciclo.

---

## Filosofía de diseño

El Ciclo Alpha v2 se basa en tres principios:

1. **Sin ML supervisado en esta fase** — los datos etiquetados son insuficientes para entrenar un modelo generalizable. Las reglas matemáticas son interpretables y ajustables.
2. **Detectar de más, filtrar después** — el generador de candidatos usa umbrales bajos a propósito. Es preferible revisar un falso positivo que perder un evento real.
3. **Las anotaciones manuales son la fuente de verdad** — cada umbral en `umbrales.json` se deriva empíricamente de las anotaciones, no de suposiciones a priori.

---

## Diagrama del pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  FUENTES DE DATOS                                               │
│  readings.csv + readings_rows.csv (Supabase export)             │
│  246.130 lecturas · 2026-04-08 → 2026-06-26                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FASE 0A — DETECCIÓN DE SEGMENTOS                               │
│  01_genera_candidatos.py                                        │
│                                                                 │
│  1. Filtrar KPCL0034 por UUID                                   │
│  2. Resamplear a 30s (forward-fill máx. 2 slots)               │
│  3. Detectar actividad (rolling std + rolling delta)            │
│  4. Agrupar en segmentos contiguos                              │
│  5. Fusionar gaps < 120s                                        │
│  6. Calcular metadata + shape features por segmento             │
│                                                                 │
│  OUTPUT: candidatos_av2.csv (417 candidatos)                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FASE 0B — ANOTACIÓN MANUAL                                     │
│  app_anotacion_av2.py (Streamlit)                               │
│                                                                 │
│  Operador revisa cada candidato:                                │
│  - Gráfico interactivo del segmento                             │
│  - Métricas: duración, Δpeso, pendiente, shape features         │
│  - Asigna: alimentacion | servido | ruido                       │
│                                                                 │
│  OUTPUT: anotaciones_av2.csv (304 anotaciones)                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FASE 0C — DERIVACIÓN DE UMBRALES                               │
│  revisar_anotaciones.py + umbrales.json                         │
│                                                                 │
│  1. Calcular estadísticas por categoría desde anotaciones       │
│  2. Identificar outliers y mislabels                            │
│  3. Actualizar umbrales.json con thresholds empíricos           │
│  4. Definir reglas del detector (orden: serv → alim → ruido)    │
│                                                                 │
│  OUTPUT: umbrales.json v1.2                                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼ (PRÓXIMO)
┌─────────────────────────────────────────────────────────────────┐
│  FASE 1 — CLASIFICADOR AUTOMÁTICO                               │
│  fase_1_extraccion/ (pendiente)                                 │
│                                                                 │
│  Implementar función clasificar(candidato) → categoría          │
│  usando las reglas de umbrales.json v1.2:                       │
│  1. SERVIDO   si sim_servido > 0.70 AND delta_w > +20g          │
│  2. ALIMENT.  si sim_alim > 0.70 AND monotonicity < -0.03       │
│  3. RUIDO     en cualquier otro caso                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼ (FUTURO)
┌─────────────────────────────────────────────────────────────────┐
│  FASE 2 — VALIDACIÓN                                            │
│  Evaluar detector automático vs. anotaciones manuales           │
│  Métricas: precision / recall / F1 por categoría                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estructura de archivos

```
Docs/09_Investigacion/Ciclo Alpha v2/
│
├── 00_INDICE_AV2.md                 ← Este índice
├── 01_ARQUITECTURA_PIPELINE.md      ← Este documento
├── 02_DISPOSITIVO_Y_DATOS.md
├── 03_DETECCION_SEGMENTOS.md
├── 04_SHAPE_FEATURES.md
├── 05_ANOTACION_Y_CATEGORIAS.md
├── 06_UMBRALES_Y_REGLAS.md
├── 07_RESULTADOS_304_ANOTACIONES.md
├── 08_APP_ANOTACION_AV2.md
│
└── fase_0_ruido/                    ← Código del ciclo
    ├── 01_genera_candidatos.py
    ├── app_anotacion_av2.py
    ├── requirements_check.py
    ├── config/
    │   └── umbrales.json
    └── data/
        ├── candidatos_av2.csv
        └── anotaciones_av2.csv
```

---

## Diferencias respecto al Ciclo Alpha (v1)

| Aspecto | Ciclo Alpha v1 | Ciclo Alpha v2 |
|---|---|---|
| Método de clasificación | LightGBM supervisado | Reglas matemáticas + coseno |
| Features | Manuales (delta, pendiente) | Shape features automáticas |
| Etiquetado | `audit_events` de Supabase | App de anotación dedicada |
| Datos | Export hasta 2026-05-07 | Continuo hasta hoy (2026-06-26) |
| Interpretabilidad | Baja (modelo caja negra) | Alta (reglas explícitas) |
| Requisito de datos | Dataset etiquetado grande | Umbrales derivables con ~50 anots. |

---

## Tecnologías utilizadas

| Herramienta | Versión | Uso |
|---|---|---|
| Python | 3.11 | Lenguaje principal |
| pandas | 2.x | Procesamiento de series temporales |
| numpy | — | Cálculo de shape features |
| Streamlit | — | App de anotación |
| Plotly | — | Visualizaciones interactivas |
| zoneinfo | stdlib 3.9+ | Conversión America/Santiago |

---

## Ver también

- [[02_DISPOSITIVO_Y_DATOS]] — Fuentes de datos y UUIDs
- [[03_DETECCION_SEGMENTOS]] — Detalles de `01_genera_candidatos.py`
- [[04_SHAPE_FEATURES]] — Matemática de los features de forma
- [[06_UMBRALES_Y_REGLAS]] — Reglas de clasificación actuales
