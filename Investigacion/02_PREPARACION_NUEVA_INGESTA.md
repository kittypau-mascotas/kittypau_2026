# Preparacion para Experimento 06 — Ingesta Colab 07-05-2026

- Proyecto: `Kittypau`
- Fase: Estado post-Exp 07 — preparacion para Exp 08
- Fecha: `2026-06-14`
- Estado: `Exp 07 completado — pendiente etiquetado retroactivo Mayo–Junio`

---

## Situacion actual

El dump completo de Supabase al 07-05-2026 ya esta disponible localmente:

```
Docs\investigacion\Data_2026\Abril_2026\
  kittypau_full_07-05-2026_csv\    ← CSVs listos (readings 242 MB, audit_events 234 KB)
  kittypau_full_07-05-2026.dump    ← dump PostgreSQL alternativo (52 MB)
```

El analisis en Google Colab confirmo los siguientes numeros del dump:

| Metrica | Exp 05 | Exp 06 (dump 07-05-2026) | Exp 07 (Mayo–Jun 2026) |
|---|---|---|---|
| Etiquetas `manual_bowl_category` | 202 | **271** (+69) | Sin etiquetas (datos nuevos) |
| Sesiones alimentacion KPCL0034 | 95 | **103** (+8) | 134 detectadas por ML |
| Sesiones servido KPCL0034 | 14 | **18–20** (+4–6) | 6 detectadas por ML |
| Lecturas (tabla activa) | 96,807 | **1,083,737 readings** | 57,101 (KPCL0034, Mayo–Jun) |
| Cobertura temporal | Apr 8 – Apr 27 | Apr 8 – **May 1** | **May 25 – Jun 14** |

El Experimento 06 usara estos datos. El plan detallado esta en:
[`exp_06_colab_dataset.md`](exp_06_colab_dataset.md)

---

## Por qué el Exp 07 fue el primer uso en producción real

### Qué confirmó el Exp 07

- Los modelos del Exp 06 generalizan a datos nuevos: detectaron 134 sesiones de
  alimentación en 20 días sin haber visto esos datos en entrenamiento.
- El consumo medio por sesión (9.7g) y la duración media (4.9 min) son coherentes
  con el comportamiento histórico de Bandida.
- La cadencia de 30s en Mayo–Junio (vs 14.7s en entrenamiento) reduce levemente la
  resolución de las features rolling, pero no rompe el modelo.
- `clock_invalid = True` al 100% en el período Mayo–Junio: el fallback a `ingested_at`
  funciona correctamente.

### Cuello de botella actual: F1 servido en producción

- El modelo clasifica correctamente la mayoría de las sesiones de alimentación.
- Discriminar servido en producción sigue siendo difícil (F1 servido = 0.14 en val Exp 06,
  solo 6 de ~20 sesiones esperadas detectadas en Exp 07).
- Solución: etiquetar sesiones de servido de Mayo–Junio con `app_anotacion.py`
  e incorporarlas al siguiente ciclo de entrenamiento (Exp 08).

---

## Reglas que no deben romperse

- `X_test.parquet` y `y_test.parquet` NO se usan en Fase 3.
- La fuente de readings es `readings.csv` (NO `sensor_readings.csv`).
- Encoding: siempre `latin1` en `pd.read_csv()` para los CSVs del dump.
- El fallback de timestamp (`ingested_at` cuando `clock_invalid=True`) se mantiene activo.
- Fase 2 debe reconstruirse antes de reentrenar modelos.
- El set de validacion debe ser real, no sintetico.
- Los artefactos de inferencia del Exp 07 viven en `Data_2026/Mayo_2026/`.
  No moverlos a fases del pipeline — son outputs de producción, no artefactos de entrenamiento.
- `inferencia_exp07_mayo_junio.py` vive en la raíz de `Data Science/`,
  junto con `inferencia_kpcl0034.py`.

---

## Checklist para Experimento 08 (próxima iteración)

### Prerrequisito: etiquetar Mayo–Junio
1. [ ] Abrir `app_anotacion.py` y etiquetar sesiones en el período 2026-05-25 → 2026-06-14
2. [ ] Priorizar sesiones de `servido` (cuello de botella actual)
3. [ ] Verificar que `new_annotations.csv` tiene al menos 20 pares inicio/termino_servido nuevos
4. [ ] Confirmar que las anotaciones son coherentes con `inferencia_mayo_junio.html`

### Pipeline Exp 08
5. [ ] Ejecutar `04_extract_events.py` — fusionará `new_annotations.csv` + `audit_events.csv`
6. [ ] Ejecutar Fase 1 completa → validar quality_report.txt
7. [ ] Verificar: sesiones alimentacion >= 103, servido >= 38 (18 originales + 20 nuevas)
8. [ ] Ejecutar Fase 2 con cobertura extendida a Jun 14
9. [ ] Revisar distribución: `servido` en train debe superar 42 filas sin duplicación
10. [ ] Ejecutar Fase 3 desde base Exp 06
11. [ ] Comparar F1 servido en val contra Exp 06 (0.1395) — meta: superar 0.40
12. [ ] Documentar resultados en `experiments/exp_08_*.md`

---

## Criterios para habilitar el Exp 08

### Condición de entrada
- Tener al menos 20 sesiones de `servido` nuevas etiquetadas en Mayo–Junio.
- Sin ese mínimo, la iteración no va a mover la aguja en F1 servido.

### Umbrales de éxito del Exp 08
- **Si F1 servido val > 0.40**: mejora real — reducir duplicación sintética en Fase 3.
- **Si F1 alimentación val >= 0.80**: considerar Fase 4 final sobre test set completo.
- **Si ambos modelos bajan vs Exp 06**: revisar quality_report y distribución de clases
  antes de concluir — el split extendido puede tener distribución diferente.

### Prioridades para el Exp 08
1. Etiquetado retroactivo de `servido` en Mayo–Junio (prioridad máxima).
2. Incorporar `KPCL0035` al pipeline si tiene suficientes etiquetas propias.
3. Evaluar si `light_percent` / `light_lux` (presentes desde Mayo 2026) mejoran el modelo
   — requiere reentrenamiento con esas features desde Fase 2.

---

## Recomendacion tecnica para el entrenamiento

Partir de la configuracion exacta del Experimento 03:
- 12 features activas (sin `delta_w_3` ni `rate_gs`)
- Threshold sweep 0.25–0.50 en pasos de 0.02 para Modelo A
- Duplicacion de `servido` x3 en train para Modelo B (reducir a x2 si hay >= 80 muestras reales)
- Hiperparametros: `num_leaves=63`, `min_child_samples=5`, `n_estimators=200`

---

## Historial

- `2026-04-26`: Primera preparación escrita (Exp 05 fue la validación)
- `2026-06-13`: Actualizado para Exp 06 — dump 07-05-2026 disponible, Fase 4 habilitada
- `2026-06-14`: Actualizado post-Exp 07 — inferencia Mayo–Junio completada, preparación Exp 08
