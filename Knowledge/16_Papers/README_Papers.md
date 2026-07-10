---
id: readme_papers
title: Papers de Referencia — Kittypau
type: knowledge
status: draft
owner: Mauro
created: 2026-06-28
updated: 2026-06-28
tags:
  - papers
  - referencias
  - academia
  - iot
  - ml
  - series-temporales
related:
  - [[00_HOME]]
  - [[11_ModelosIA/MOC_ModelosIA]]
  - [[12_Matematica/README_Matematica]]
  - [[13_Features/README_ShapeFeatures]]
---

# Papers de Referencia — Kittypau

> Referencias académicas relevantes para el Motor Matemático, algoritmos de features y contexto PetTech.
> Agregar papers aquí cuando se cite o implemente algo de la literatura.

---

## Series temporales — Features

| Paper | Relevancia para Kittypau |
|---|---|
| Bandt & Pompe (2002) — "Permutation Entropy" | Base de `entropy_permutation` (F06) |
| Higuchi (1988) — "Approach to an irregular time series" | Base de `Higuchi FD` (F08) |
| Peng et al. (1994) — "Detrended Fluctuation Analysis" | Base de `DFA` (F08) |
| Lempel & Ziv (1976) — "On the Complexity of Finite Sequences" | Base de `Lempel-Ziv` (F08) |
| Sakoe & Chiba (1978) — "Dynamic programming algorithm optimization for spoken word recognition" | DTW — posible feature futura de similitud |

---

## Clasificación de series temporales

| Paper | Relevancia |
|---|---|
| Lines & Bagnall (2015) — "Time series classification with ensembles of elastic distance measures" | Contexto para clasificar alimentación/servido/ruido |
| Dempster et al. (2020) — "ROCKET: Exceptionally fast and accurate time series classification using random convolutional kernels" | Alternativa rápida a feature engineering manual |
| Wang et al. (2017) — "Time series classification from scratch with deep neural networks" | ResNet/FCN para series temporales |

---

## IoT / Sensores

| Paper | Relevancia |
|---|---|
| Raza et al. (2017) — "MQTT: A lightweight protocol for efficient IoT communications" | Justifica HiveMQ vs REST polling (ver [[23_Decisiones/ADR_001_MQTT_vs_HTTP]]) |

---

## PetTech / Salud animal

| Paper | Relevancia |
|---|---|
| (por agregar) | Monitoreo de alimentación en gatos |
| (por agregar) | Patrones circadianos de alimentación felina |
| (por agregar) | Sensor-based activity monitoring in pets |

---

## Referencias de mercado

Ver [[21_Roadmap/README_Estrategia_Mercado]] — sección "Referencias de mercado".

| Fuente | Dato clave |
|---|---|
| Subdere/UC 2021 — Encuesta Nacional Tenedores de Mascotas | 72% hogares en Santiago tienen mascota |
| Fortune Business Insights 2024 — Pet Tech Market | USD 11.4B → 40.6B (CAGR 17%) |
| Emol 2024 — Mercado mascotas Chile | CLP 700B anuales en Chile |

---

## Cómo agregar un paper

Crear archivo `TPL_PAPER.md` en esta carpeta con la plantilla:

```markdown
---
id: paper_[autor_año]
title: [Título completo]
type: knowledge
status: active
tags: [paper, tema1, tema2]
related: [[11_ModelosIA/MOC_ModelosIA]]
---

# [Título]

**Autores:** ...  **Año:** ...  **DOI/URL:** ...

## Resumen en 3 líneas

## Aplicación en Kittypau

## Features o algoritmos derivados
```

---

## Ver también

- [[12_Matematica/README_Matematica]] — fórmulas implementadas a partir de papers
- [[11_ModelosIA/MOC_ModelosIA]] — modelos que usan estas referencias
- [[23_Decisiones/ADR_003_MotorMatematico]] — decisión de numpy/scipy vs sklearn
