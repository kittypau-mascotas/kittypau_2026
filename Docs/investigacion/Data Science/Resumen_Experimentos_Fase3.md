# Resumen de Experimentos Fase 3

- Proyecto: `Kittypau`
- Fase: `Fase 3 - Modelos`
- Fecha de referencia: `2026-04-26`

## Resumen ejecutivo

Se ejecutaron 5 experimentos sobre la misma base de Fase 1 y Fase 2, con una nueva ingesta manual que solo modifico Fase 1 en el ultimo ciclo. La evolucion muestra que:

- `Modelo A` mejora principalmente por calibracion de threshold y ajuste fino de probabilidad.
- `Modelo B` mejora cuando se refuerza la clase `servido`, pero sigue siendo el cuello de botella.
- El mejor balance global hasta ahora sigue siendo el `Experimento 3`.
- El `Experimento 4` mejora levemente el binario, pero empeora el multiclase frente al `Experimento 3`.
- El `Experimento 5` valida la nueva ingesta en Fase 1, pero no cambia Fase 2 ni Fase 3.

## Resultados por experimento

| Experimento | Modelo A F1 activo | Modelo A AUC-ROC | Modelo B Macro F1 | Modelo B F1 alimentacion | Modelo B F1 servido | Lectura |
|---|---:|---:|---:|---:|---:|---|
| Exp 1 | `0.0000` | `0.8098` | `0.5688` | `0.3984` | `0.3333` | Linea base, el binario no detectaba actividad. |
| Exp 2 | `0.5550` | `0.9024` | `0.6367` | `0.5223` | `0.4000` | Gran salto por threshold tuning y rebalanceo suave. |
| Exp 3 | `0.5600` | `0.8798` | `0.6712` | `0.5256` | `0.5000` | Mejor resultado global, especialmente en `servido`. |
| Exp 4 | `0.5693` | `0.8802` | `0.6456` | `0.5488` | `0.4000` | Leve mejora del binario, pero peor multiclase que Exp 3. |
| Exp 5 | `0.5693` | `0.8802` | `0.6456` | `0.5488` | `0.4000` | Nueva ingesta visible en Fase 1, pero sin cambio en Fase 2 ni Fase 3. |

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
| Modelo A - F1 activo | `0.5693` | `0.70` | No cumple |
| Modelo A - AUC-ROC | `0.9024` | `0.85` | Cumple |
| Modelo B - Macro F1 | `0.6712` | `0.60` | Cumple |
| Modelo B - F1 alimentacion | `0.5488` | `0.65` | No cumple |
| Modelo B - F1 servido | `0.5000` | Sin umbral | Referencia |

## Conclusion

El mejor punto de partida para seguir iterando sigue siendo el `Experimento 3`, con el `Experimento 5` como verificacion de que nueva ingesta no siempre equivale a nuevo entrenamiento util.

El `Experimento 4` y el `Experimento 5` son valiosos como comparacion porque confirman que:

- el binario responde a calibracion fina,
- pero el multiclase necesita mas datos reales o una estrategia de rebalanceo distinta,
- y la clase `servido` sigue definiendo el limite del sistema.

## Siguiente paso recomendado

1. Recolectar mas eventos reales de `alimentacion` y, sobre todo, `servido`.
2. Asegurar que la nueva ingesta entre al corte temporal de Fase 2.
3. Volver a ejecutar Fase 1 con la nueva ingesta.
4. Reconstruir Fase 2 con el nuevo dataset.
5. Repetir Fase 3 a partir de la mejor base actual.

