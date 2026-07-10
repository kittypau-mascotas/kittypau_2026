---
fase: 6
nombre: Evaluación Formal
estado: pendiente
ciclo: Alpha v2
---

# Fase 6 — Evaluación Formal

> **Objetivo:** Evaluación final sobre el test set reservado.
> Esta fase es el "juicio" definitivo del ciclo.

**No ejecutar hasta que Fases 0–5 estén cerradas.**
Abrir `X_test` antes de terminar el desarrollo invalida la evaluación.

---

## Input

- `../fase_4_dataset/data/train/X_test.parquet` — **reservado**
- `../fase_4_dataset/data/train/y_test.parquet` — **reservado**
- `../fase_5_modelos/models/modelo_av2.lgb` — modelo final

## Output esperado

| Artefacto | Descripción |
|-----------|-------------|
| `outputs/test_report.md` | Reporte completo: métricas por clase, matrices de confusión |
| `outputs/test_report.html` | Versión visual del reporte |
| `outputs/sesiones_detectadas.csv` | Sesiones que el modelo detecta sobre datos nuevos |

---

## Métricas objetivo

| Métrica | Objetivo | Consecuencia si no se alcanza |
|---------|---------|-------------------------------|
| F1-alimentacion | ≥ 0.85 | Revisar Fase 2 (segmentación mal calibrada) |
| F1-servido | ≥ 0.60 | Revisar datos (¿suficientes sesiones reales?) |
| F1-macro | ≥ 0.75 | Revisar features de Fase 3 |
| ARI vs ground truth | ≥ 0.50 | El modelo no aprende estructura real |

---

## Qué hacer si no se alcanzan los objetivos

1. **F1-servido < 0.60** → Anotar más sesiones reales antes de re-entrenar.
   No augmentar sintéticamente. La solución está en los datos, no en el modelo.

2. **F1-alimentacion < 0.85** → Revisar la segmentación (Fase 2).
   Si los segmentos de alimentacion no se detectan bien, el clasificador no puede aprenderlos.

3. **ARI < 0.50** → El modelo segmenta pero no distingue. Revisar features (Fase 3).
   Agregar `delta_peso_total` como feature si no estaba siendo usada.

---

## Reporte a generar

El reporte final debe incluir:

1. Métricas sobre test set (F1 por clase, macro, ARI)
2. Comparación con baseline heurístico de Fase 5
3. Comparación con mejores resultados de Ciclo Alpha (Exp06) y Ciclo Gamma (G-01)
4. Matriz de confusión
5. Ejemplos de aciertos y errores por clase (visualizaciones de curva)
6. Recomendación: ¿el modelo está listo para integración al bridge?

---

## Integración al bridge (post-evaluación)

Si los objetivos se alcanzan:
- El segmentador PELT puede ejecutarse sobre la ventana de los últimos N minutos
- El clasificador reemplaza a `processor.js` para categorización de sesiones
- Ver `bridge/src/processor.js` — punto de integración
