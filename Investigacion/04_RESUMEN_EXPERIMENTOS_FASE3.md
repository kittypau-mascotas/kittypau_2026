# Resumen de Experimentos Fase 3

- Proyecto: `Kittypau`
- Fase: `Fase 3 - Modelos`
- Fecha de referencia: `2026-06-14`

## Resumen ejecutivo

Se ejecutaron 7 experimentos. Los Exp 01–05 trabajaron sobre la misma base de datos.
El Exp 06 incorporó el dump completo del 07-05-2026 y cruzó por primera vez los
umbrales de Fase 4. El Exp 07 aplicó los modelos del Exp 06 sobre datos nuevos
(Mayo–Junio 2026) sin etiquetas previas. La evolución muestra que:

- `Modelo A` mejora principalmente por calibracion de threshold y ajuste fino de probabilidad.
- `Modelo B` mejora cuando se refuerza la clase `servido`, pero sigue siendo el cuello de botella.
- El mejor balance global hasta ahora sigue siendo el `Experimento 3`.
- El `Experimento 4` mejora levemente el binario, pero empeora el multiclase frente al `Experimento 3`.
- El `Experimento 5` valida la nueva ingesta en Fase 1, pero no cambia Fase 2 ni Fase 3.
- El `Experimento 6` es el primer experimento que cruza los umbrales de Fase 4 gracias
  al dump extendido (Apr 8 – May 1) con 103 sesiones de alimentación y 18 de servido.
- El `Experimento 7` es el primer uso real de los modelos en producción sobre datos
  nunca vistos (Mayo–Junio 2026), confirmando capacidad de generalización sin métricas
  formales aún.

## Resultados por experimento

| Experimento | Modelo A F1 activo | Modelo A AUC-ROC | Modelo B Macro F1 | Modelo B F1 alimentacion | Modelo B F1 servido | Lectura |
|---|---:|---:|---:|---:|---:|---|
| Exp 1 | `0.0000` | `0.8098` | `0.5688` | `0.3984` | `0.3333` | Linea base, el binario no detectaba actividad. |
| Exp 2 | `0.5550` | `0.9024` | `0.6367` | `0.5223` | `0.4000` | Gran salto por threshold tuning y rebalanceo suave. |
| Exp 3 | `0.5600` | `0.8798` | `0.6712` | `0.5256` | `0.5000` | Mejor resultado global, especialmente en `servido`. |
| Exp 4 | `0.5693` | `0.8802` | `0.6456` | `0.5488` | `0.4000` | Leve mejora del binario, pero peor multiclase que Exp 3. |
| Exp 5 | `0.5693` | `0.8802` | `0.6456` | `0.5488` | `0.4000` | Nueva ingesta visible en Fase 1, pero sin cambio en Fase 2 ni Fase 3. |
| Exp 6 | `0.7619` | `0.9205` | `0.6312` | `0.7606` | `0.1395` ⚠️ | Primer cruce de umbrales Fase 4. F1 servido inestable (12 ejemplos en val). |
| Exp 7 | `—` | `—` | `—` | `—` | `—` | Inferencia pura Mayo–Jun 2026. 134 sesiones alim detectadas. Sin métricas formales aún. |

## Lectura tecnica

### Modelo A

- La mejora mas fuerte vino del ajuste de threshold.
- La calibracion isotonica ayudo, pero no resolvio el gap hacia Fase 4.
- El techo actual sigue por debajo del umbral `F1 activo >= 0.70`.

### Modelo B

- La clase `alimentacion` mejora de forma gradual.
- La clase `servido` sigue siendo la mas sensible al rebalanceo.
- La duplicacion controlada del Experimento 3 rindio mejor que la variante SMOTE local del Experimento 4.
- El Experimento 5 confirma que una nueva ingesta puede mejorar la trazabilidad sin cambiar el dataset supervisado final.

## Estado frente a Fase 4

| Metrica | Mejor valor logrado | Umbral Fase 4 | Estado |
|---|---:|---:|---|
| Modelo A - F1 activo | `0.7619` (Exp 06) | `0.70` | ✅ Cumple |
| Modelo A - AUC-ROC | `0.9205` (Exp 06) | `0.85` | ✅ Cumple |
| Modelo B - Macro F1 | `0.6712` (Exp 03) | `0.60` | ✅ Cumple |
| Modelo B - F1 alimentacion | `0.7606` (Exp 06) | `0.65` | ✅ Cumple |
| Modelo B - F1 servido | `0.5000` (Exp 03) / `0.1395` (Exp 06) ⚠️ | Sin umbral | Referencia — inestable |

**Fase 4 habilitada desde Exp 06 (2026-06-13).**
Pendiente: evaluar sobre X_test (Apr 28–May 1) y calcular métricas formales del Exp 07.

## Conclusion

El mejor modelo en producción es el del `Experimento 06`, que cruzó todos los umbrales
de Fase 4 y fue aplicado con éxito en el `Experimento 07` sobre 20 días de datos nuevos.
El `Experimento 03` sigue siendo la mejor referencia histórica para F1 servido estable (0.50).

## Siguiente paso recomendado

1. Etiquetar retroactivamente el período Mayo–Junio 2026 con `app_anotacion.py`.
2. Calcular métricas formales del Exp 07 con las anotaciones nuevas.
3. Ejecutar evaluación formal sobre X_test del Exp 06 (Apr 28–May 1).
4. Si F1 servido sigue por debajo de 0.30 en producción, reentrenar con
   las sesiones de servido etiquetadas en Mayo–Junio como nuevo dato supervisado.
5. Documentar resultados como Experimento 08.

