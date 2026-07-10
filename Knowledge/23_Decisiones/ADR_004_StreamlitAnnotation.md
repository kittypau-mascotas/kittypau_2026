---
id: adr_004_streamlit_annotation
title: "ADR-004: Streamlit para la app de anotación (offline, local)"
type: adr
status: accepted
owner: Mauro
created: 2026-06-28
updated: 2026-06-29
tags:
  - adr
  - streamlit
  - anotacion
  - herramientas
related:
  - [[23_Decisiones/MOC_ADR]]
  - [[14_Experimentos/EXP_AlphaV2_Pipeline]]
---

# ADR-004: Streamlit para la app de anotación (offline, local)

**Estado:** Accepted  
**Fecha:** 2026-06-26 (Alpha v2)  
**Área:** Herramientas de investigación

---

## Contexto

Se necesita una app para anotar manualmente ~400+ eventos de señal de peso: revisar
candidatos, etiquetarlos como alimentacion/servido/ruido, y visualizar features.
La app debe ser rápida de construir y modificar — es una herramienta interna de investigación,
no un producto de usuario final.

---

## Opciones consideradas

| Opción | Ventaja | Desventaja |
|--------|---------|------------|
| Streamlit (elegida) | Python puro, gráficos interactivos, caché nativa, sin JS | Un solo thread por sesión, no escala a múltiples usuarios |
| Jupyter + ipywidgets | Familiar para análisis | No es una app, no tiene estado persistente |
| Panel / Bokeh | Más flexible | Mayor complejidad de setup |
| Label Studio | Especializado en anotación | Overhead de configuración, no integra con nuestras features |

---

## Decisión

Streamlit con lazy loading por tab (via `st.radio()` en lugar de `st.tabs()`) y sistema de
caché en 3 capas (session_state RAM → Parquet disco → CSV PyArrow). La app es 100% offline:
solo lee Supabase cuando el usuario presiona "🔄 Actualizar Todo".

---

## Consecuencias

**Positivas:**
- 9 tabs de análisis implementados en ~5,500 líneas Python
- Caché 3 capas: cold start ~5-10s, reruns <300ms
- Motor matemático v2 integrado directamente (no API externa)
- Backups automáticos diarios en `data/backups/`

**Negativas / trade-offs:**
- No es una app deployable para múltiples usuarios simultáneos
- Reruns completos al cambiar cualquier widget (mitigado con lazy loading)
- `st.cache_data` tiene limitaciones con objetos grandes

---

## Ver también

- [[14_Experimentos/EXP_AlphaV2_Pipeline]]
- [[13_Features/README_ShapeFeatures]]
