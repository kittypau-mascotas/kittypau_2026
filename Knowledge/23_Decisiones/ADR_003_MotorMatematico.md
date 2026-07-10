---
id: adr_003_motor_matematico
title: "ADR-003: numpy/scipy en lugar de sklearn para el Motor Matemático"
type: adr
status: accepted
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - adr
  - motor-matematico
  - features
  - ia
  - numpy
related:
  - [[23_Decisiones/MOC_ADR]]
  - [[13_Features/README_ShapeFeatures]]
  - [[11_ModelosIA/MOC_ModelosIA]]
---

# ADR-003: numpy/scipy en lugar de sklearn para el Motor Matemático

**Estado:** Accepted  
**Fecha:** 2026-06-26 (Alpha v2)  
**Área:** IA / Feature Engineering

---

## Contexto

El Motor Matemático v2 extrae 102 features de cada segmento de señal de peso.
Se necesita que sea: (1) rápido en CPU, (2) fácil de inspeccionar, (3) sin dependencias
pesadas que compliquen el entorno del ESP32 / Raspberry o el deploy de Streamlit.

---

## Opciones consideradas

| Opción | Ventaja | Desventaja |
|--------|---------|------------|
| numpy + scipy (elegida) | Rápido, sin overhead de sklearn, features totalmente controladas | Más código a escribir por feature |
| sklearn `FeatureUnion` / `Pipeline` | Estándar de la industria, serializable | Overhead de objetos, features caja negra |
| tsfresh | Extracción automática de cientos de features | Muy lento (~segundos por señal), overfit riesgo |
| catch22 | 22 features específicas para time series | Menos flexibilidad para features de dominio |

---

## Decisión

Implementar 102 features en 15 familias (F00–F14) directamente en numpy/scipy dentro de
`shape_features_v2.py`. Cada familia tiene una función explícita — totalmente inspeccionable
y auditable. El motor no tiene dependencia de sklearn.

---

## Consecuencias

**Positivas:**
- `extraer_features(señal)` tarda <10 ms por segmento en CPU
- Cada feature es una función nombrada — se puede deshabilitar o modificar individualmente
- Sin problemas de versión de sklearn entre entornos
- Lempel-Ziv optimizado a O(n log n) en esta misma decisión

**Negativas / trade-offs:**
- No hay serialización automática del "modelo" — el motor es el código
- Agregar una feature nueva requiere escribirla desde cero en numpy

---

## Ver también

- [[13_Features/README_ShapeFeatures]]
- [[15_Resultados/RESULT_AlphaV2_Snapshots]]
