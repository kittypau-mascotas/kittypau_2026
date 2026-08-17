---
tags: [kittypau, ciclo-alpha-v2, moc, indice]
fecha_creacion: 2026-06-26
fecha_actualizacion: 2026-08-16
estado: activo
---

# Ciclo Alpha v2 — Índice General (MOC)

> **Mapa de Contenido** del Ciclo de Investigación Alpha versión 2.
> Toda la documentación técnica de detección de eventos del comedero inteligente KPCL0034.

---

> [!success] MOTOR MATEMÁTICO v2 IMPLEMENTADO — 2026-06-26
> `shape_features_v2.py` implementa **102 features en 15 familias** + **Evidence Engine** + **Clasificador determinístico v1.3**.
> `app_anotacion_av2.py` actualizado con **Tab 5 — Motor Matemático**: cuadro comparativo empírico (814 anot., actualizado 2026-08-16), radar, templates, dinámica temporal, Feature Registry.
> Ver [[av2_09_EVOLUCION_MOTOR_MATEMATICO]] para el detalle completo y [[av2_HISTORIAL_RESULTADOS]] snapshot v2.5 para el último refresh de datos.

## ¿Qué es el Ciclo Alpha v2?

El **Ciclo Alpha v2** es el sistema de detección y clasificación de eventos de comportamiento del comedero inteligente de Bandida (KPCL0034). A diferencia del [[Ciclo Alpha]] anterior (que usaba LightGBM con features manuales), esta versión:

- Usa **solo matemática** — sin ML supervisado
- Opera sobre **candidatos detectados automáticamente** del stream de peso
- Clasifica mediante **102 features de forma de curva** (15 familias: derivadas, curvatura, entropías, fractales, templates canónicos, dinámica temporal, etc.)
- Se alimenta de **814 anotaciones manuales** (alim=356, ruido=374, serv=84) para calibrar estadísticas y umbrales

**Estado actual:** Fase 0 completada — detección + **814 anotaciones** + Motor Matemático v2. Fase 1 (clasificador automático) pendiente. `umbrales.json` (v1.3) sigue calibrado contra n=496 (2026-08-11) — pendiente recalibrar contra las 814 actuales, ver [[av2_06_UMBRALES_Y_REGLAS]].

---

## Documentos del Ciclo Alpha v2

### Fundamentos
- [[av2_01_ARQUITECTURA_PIPELINE]] — Visión general del pipeline, fases y flujo de datos
- [[av2_02_DISPOSITIVO_Y_DATOS]] — KPCL0034, UUIDs, fuentes de datos, período cubierto

### Fase 0 — Detección y Anotación
- [[av2_03_DETECCION_SEGMENTOS]] — Cómo `01_genera_candidatos.py` detecta segmentos (ahora con features v2)
- [[av2_04_MATEMATICA_SHAPE_FEATURES]] — Features clásicas F00: monotonía, R², ZCR, similitud coseno
- [[av2_09_EVOLUCION_MOTOR_MATEMATICO]] — Motor v2: 105 features en 15 familias + Evidence Engine ✅ Implementado
- [[av2_05_ANOTACION_Y_CATEGORIAS]] — Workflow de anotación manual y categorías
- [[av2_08_APP_ANOTACION_AV2]] — La app Streamlit de anotación (7 pestañas)

### Clasificación y Resultados
- [[av2_06_UMBRALES_Y_REGLAS]] — `umbrales.json` v1.3 (desactualizado, ver nota arriba), reglas del detector
- [[av2_07_RESULTADOS_ANOTACIONES]] — Estadísticas completas de las 814 anotaciones

### Documentos previos relacionados
- [[02_REGLAS_EVENTOS_ALIMENTACION]] — Reglas canónicas de eventos (fuente de verdad)
- [[05_ANALISIS_COLAB_KPCL0034_07052026]] — Análisis exploratorio previo en Colab

---

## Estado por fase

| Fase | Descripción | Estado | Artefacto |
|---|---|---|---|
| **0 — Detección** | Segmentar señal de peso en candidatos | ✅ Completo | `candidatos_av2.csv` (916 cands.) |
| **0 — Anotación** | Clasificar candidatos manualmente | ✅ Completo | `anotaciones_av2.csv` (814 anots.) |
| **0 — Shape features F00** | Calcular monotonía, R², ZCR, coseno | ✅ Completo | Columnas en `candidatos_av2.csv` |
| **0 — Motor Matemático v2** | 102 features en 15 familias + Evidence Engine | ✅ Implementado | `shape_features_v2.py` |
| **0 — Estadísticas empíricas** | µ±σ por feature y categoría (814 anots.) | ✅ Completo (2026-08-16) | `features_anotaciones_v2.csv`, `comp_stats_v2.json` |
| **0 — Umbrales** | Derivar reglas desde anotaciones | ⚠️ v1.3, desactualizado (calibrado contra n=496) | `umbrales.json` |
| **1 — Clasificador** | Implementar detector automático | ⏳ Pendiente | `fase_1_extraccion/` |
| **2 — Validación** | Evaluar detector vs. anotaciones | ⏳ Pendiente | — |
| **3 — Integración** | Conectar detector al bridge/app | ⏳ Pendiente | — |

---

## Metas de anotación

| Categoría | Meta | Actual (2026-08-16) | Estado |
|---|---|---|---|
| alimentacion | 40 | 356 | ✅ 890% |
| ruido | 30 | 374 | ✅ 1247% |
| servido | 20 | 84 | ✅ 420% |
| **Total** | **90** | **814** | ✅ **904%** |

---

## Archivos del proyecto

```
fase_0_ruido/
├── 01_genera_candidatos.py       ← Detecta segmentos + calcula 102 features v2
├── app_anotacion_av2.py          ← App Streamlit de anotación (8 tabs)
├── shape_features_v2.py          ← Motor Matemático v2: 102 features + Evidence Engine
├── revisar_anotaciones_v2.py     ← Calcula features v2 para todas las anotaciones
├── requirements_check.py         ← Verificación del entorno
├── config/
│   └── umbrales.json             ← Umbrales v1.3 (reglas del detector, desactualizado)
└── data/
    ├── candidatos_av2.csv        ← 916 candidatos con shape features
    ├── anotaciones_av2.csv       ← 814 anotaciones manuales (completo, 2026-08-16)
    ├── features_anotaciones_v2.csv  ← 814 filas × 109 cols (features v2 por evento)
    └── comp_stats_v2.json        ← µ±σ por feature y categoría (814 anots.)
```

---

## Decisiones clave tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-06 | No usar ML en esta fase | Insuficientes datos etiquetados; reglas matemáticas son interpretables |
| 2026-06 | Usar similitud coseno como discriminador primario | Mejor separación entre categorías que delta/pendiente |
| 2026-06 | Umbral coseno en 0.70 | Cubre 90%+ de casos reales (p10 de cada categoría supera 0.80) |
| 2026-06 | Detectar de más y filtrar manualmente | Filosofía de la app: falso positivo es mejor que falso negativo |

---

## Referencias rápidas

- **Dispositivo:** KPCL0034 "Bandida" — comedero inteligente food_bowl
- **UUIDs activos:** `9510a455-...` (Abr 2026) · `3a460074-...` (May-Jun 2026)
- **Período de datos:** 2026-04-07 → 2026-07-22 (candidatos) · anotaciones creadas hasta 2026-08-13
- **Lecturas totales:** 322.820 de KPCL0034 (actualizado 2026-08-16)
- **Resampleo:** 30 segundos con forward-fill (máx. 2 slots)
- **Zona horaria display:** America/Santiago (UTC−3/−4)
