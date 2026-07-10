---
area: Data Science
ciclo: Alpha v2
actualizado: 2026-06-25
---

# Tracker de Experimentos — Ciclo Alpha v2

Registro cronológico de todos los experimentos del Ciclo Alpha v2.

---

## Estado actual

| Fase activa | Próximo experimento | Estado |
|-------------|--------------------|----|
| `fase_0_ruido` | AV2-E01 — modelo de ruido baseline | ⏳ Pendiente |

---

## Tabla de experimentos

| ID | Fase | Fecha | Descripción | Resultado principal | Estado |
|----|------|-------|-------------|---------------------|--------|
| AV2-E01 | `fase_0_ruido` | — | Modelo estadístico de ruido del sensor en reposo | — | ⏳ Pendiente |
| AV2-E02 | `fase_2_segmentacion` | — | PELT con parámetros baseline | — | ⏳ Bloqueado por E01 |
| AV2-E03 | `fase_2_segmentacion` | — | Tuning del umbral de segmentación | — | ⏳ Bloqueado por E02 |
| AV2-E04 | `fase_5_modelos` | — | LightGBM baseline sobre segmentos | — | ⏳ Bloqueado por E03 |

---

## Protocolo de experimento

### Antes de iniciar un experimento

1. Verificar que los datos de entrada existen y están limpios
2. Documentar hipótesis y métrica de éxito esperada
3. Crear archivo `exp_AV2-EXX_<descripcion>.md` en esta carpeta

### Al terminar un experimento

1. Registrar resultado real vs. esperado
2. Documentar decisión (continuar / cambiar enfoque / archivar)
3. Actualizar tabla de arriba
4. Si el experimento falla, documentar POR QUÉ (no solo qué pasó)

---

## Baselines históricos de referencia

| Modelo | F1-activo | F1-alim | F1-servido | Macro F1 | Sesiones train | Ciclo |
|--------|-----------|---------|------------|----------|----------------|-------|
| LGBM Exp 06 | 0.7619 | 0.7606 | 0.1395 | 0.6312 | 103 alim · 18 serv | Alpha |
| LGBM G-01 | 0.8139 | 0.7598 | 0.2656 | 0.6733 | 264 alim · 80 serv (63+17) | Gamma |
| GRU Exp 10 | 0.5203 | 0.3613 | **0.3400** | 0.5552 | 185 alim · 27 serv | Exp 10-NN |
| Heurística (delta_peso_total) | — | — | **~0.80+** (estimado) | — | N/A | **Alpha v2 objetivo baseline** |

> El baseline de Alpha v2 es la **heurística de signo** — calcular su F1 es el primer paso.
> Si F1-servido heurístico ≥ 0.80, el modelo ML es refinamiento, no la solución principal.

---

## Métricas objetivo globales

| Métrica | Objetivo | Baseline (Ciclo Alpha Exp06) |
|---------|---------|------------------------------|
| F1-alimentacion | ≥ 0.85 | 0.7606 |
| F1-servido | ≥ 0.60 | 0.1395 (Alpha) / 0.2656 (Gamma) |
| ARI vs ground truth | ≥ 0.50 | 0.1594 (Delta, no comparable) |

---

## Preguntas abiertas

1. ¿Cuántas sesiones de servido reales hay hoy en `audit_events`? (última cuenta: 63)
2. ¿Hay lecturas más recientes que Junio 14 sin etiquetar?
3. ¿La `app_anotacion_gamma.py` funciona para anotar servidos nuevos antes de empezar?
4. ¿PELT u offline primero? (recomendación: PELT offline para investigación, BOCPD solo para producción)
