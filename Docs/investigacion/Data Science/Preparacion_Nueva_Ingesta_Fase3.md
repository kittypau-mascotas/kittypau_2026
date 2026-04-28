# Preparacion para Nueva Ingesta - Fase 3

- Proyecto: `Kittypau`
- Fase: `Fase 3 - Modelos`
- Fecha: `2026-04-26`

## Objetivo

Dejar listo el proceso para una nueva ingesta de datos y nuevos eventos de `alimentacion` y `servido`, de forma que la siguiente corrida de modelos sea comparable con los experimentos anteriores.

## Ultimo ciclo ejecutado

- `Experimento 05` valido una nueva ingesta en Fase 1.
- Fase 2 no cambio.
- Fase 3 quedo igual al Experimento 4.
- Esto confirma que para mover el modelo hace falta una ingesta que si entre al dataset supervisado final.

## Lo que necesitamos traer

### Prioridad alta

- Mas sesiones reales de `servido`.
- Mas sesiones reales de `alimentacion`.
- Eventos bien etiquetados en `public.audit_events`.

### Prioridad media

- Mejor cobertura horaria para reducir sesgo temporal.
- Mas ejemplos donde el plato cambie de estado con transiciones claras.

## Reglas que no deben romperse

- `X_test.parquet` y `y_test.parquet` no se usan en Fase 3.
- La nueva ingesta debe pasar primero por Fase 1.
- Fase 2 debe reconstruirse antes de reentrenar modelos.
- El set de validacion debe seguir siendo real, no sintetico.

## Checklist de nueva ingesta

1. Confirmar que la nueva data ya esta en `public.audit_events`.
2. Ejecutar Fase 1 y validar que las etiquetas se reconstruyen correctamente.
3. Verificar que el volumen de `alimentacion` y `servido` aumento.
4. Ejecutar Fase 2 y revisar el nuevo balance de clases.
5. Comparar el nuevo `dataset_meta.json` contra el experimento anterior.
6. Reentrenar Fase 3 desde la base mas reciente.
7. Guardar la corrida con fecha y hora en un nuevo `Experimento_XX`.

## Criterios para decidir si la nueva ingesta vale la pena

### Si aumenta `servido`

- Es buena señal.
- Deberia mejorar la estabilidad de `Modelo B`.

### Si aumenta `alimentacion`

- Ayuda a subir `F1 alimentacion`.
- Puede acercarnos al umbral de Fase 4.

### Si solo aumenta `reposo`

- El valor marginal es bajo.
- La mejora de los modelos puede seguir estancada.

## Recomendacion tecnica

La proxima iteracion deberia partir de:

- las 12 features activas del Experimento 3 y 4,
- el mejor threshold encontrado para `Modelo A`,
- y una nueva estrategia de balance solo si la ingesta trae mas muestras reales.

## Resultado esperado

Con una nueva ingesta bien dirigida, lo ideal es:

- subir `F1 activo` por encima de `0.60`,
- subir `F1 alimentacion` y `F1 servido`,
- y recuperar una version del Modelo B que supere al Experimento 3.

## Nota de control

Antes de dar por buena cualquier nueva corrida, verificar siempre:

- total de `readings` en Fase 1,
- total de etiquetas y sesiones reconstruidas,
- total de filas en Fase 2,
- y metricas finales de Fase 3.

