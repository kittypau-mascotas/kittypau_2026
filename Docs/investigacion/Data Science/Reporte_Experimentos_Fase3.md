# Reporte maestro - Experimentos Fase 3

- Proyecto: `KittyPaw`
- Fase: `Fase 3 - Modelos`
- Fecha de referencia: `2026-04-26`

## Objetivo

Centralizar en un solo archivo los reportes de los cinco experimentos de Fase 3 y resumir el avance del modelo entre iteraciones.

## Visualizacion

- [Experimentos_Fase3_Resumen.svg](./Experimentos_Fase3_Resumen.svg)
- La imagen resume la evolucion de las metricas y el estado frente a Fase 4.

## Documentos disponibles

1. [Experimento 01](./Experimento_01_2026-04-26_20-29-01.md)
2. [Experimento 02](./Experimento_02_2026-04-26_20-45-13.md)
3. [Experimento 03](./Experimento_03_2026-04-26_21-04-48.md)
4. [Experimento 04](./Experimento_04_2026-04-26_21-29-55.md)
5. [Experimento 05](./Experimento_05_2026-04-26_23-33-16.md)
6. [Resumen de Experimentos](./Resumen_Experimentos_Fase3.md)
7. [Preparacion Nueva Ingesta](./Preparacion_Nueva_Ingesta_Fase3.md)

## Resumen por experimento

### Experimento 01

- Base inicial sin calibracion de threshold.
- Modelo A con `F1 = 0.0` y `AUC-ROC = 0.8098`.
- Modelo B con `Macro F1 = 0.5688`.
- Sirvio como linea base para diagnosticar desbalance y relevancia de features.

### Experimento 02

- Se ajusto el threshold del Modelo A a `0.42`.
- Se suavizo el rebalanceo del Modelo B con `weight_power = 0.25`.
- Modelo A subio a `F1 = 0.5550` y `AUC-ROC = 0.9024`.
- Modelo B subio a `Macro F1 = 0.6367`.

### Experimento 03

- Se eliminaron `delta_w_3` y `rate_gs`.
- Se ajusto el binario con mas capacidad y threshold sweep mas fino.
- Se duplico `servido` x3 en el multiclase.
- Modelo A llego a `F1 = 0.5600` y `AUC-ROC = 0.8798`.
- Modelo B subio a `Macro F1 = 0.6712`.

### Experimento 04

- Corrida ejecutada basada en el Experimento 3.
- Mantiene las mismas features y los mismos datos.
- Reemplaza la duplicacion exacta de `servido` por una implementacion local equivalente a `SMOTE`.
- Agrega calibracion isotonica al Modelo A.
- Modelo A subio levemente a `F1 = 0.5693` y `AUC-ROC = 0.8802`.
- Modelo B bajo a `Macro F1 = 0.6456`.

### Experimento 05

- Se ejecuto luego de una nueva ingesta manual de `alimentacion` y `servido`.
- Fase 1 si cambio: mas etiquetas, mas sesiones y mejor trazabilidad visual en el grafico.
- Fase 2 no cambio: mismo split, mismos conteos y misma distribucion de clases.
- Fase 3 quedo igual al Experimento 4.
- Modelo A mantuvo `F1 = 0.5693` y `AUC-ROC = 0.8802`.
- Modelo B mantuvo `Macro F1 = 0.6456`.

## Evolucion tecnica observada

| Modelo | Experimento 1 | Experimento 2 | Experimento 3 |
|---|---:|---:|---:|
| `Modelo A` F1 activo | `0.0000` | `0.5550` | `0.5600` |
| `Modelo A` AUC-ROC | `0.8098` | `0.9024` | `0.8798` |
| `Modelo B` Macro F1 | `0.5688` | `0.6367` | `0.6712` |
| `Modelo B` F1 alimentacion | `0.3984` | `0.5223` | `0.5256` |
| `Modelo B` F1 servido | `0.3333` | `0.4000` | `0.5000` |

## Evolucion con Exp 4 y Exp 5

| Modelo | Exp 1 | Exp 2 | Exp 3 | Exp 4 | Exp 5 |
|---|---:|---:|---:|---:|---:|
| `Modelo A` F1 activo | `0.0000` | `0.5550` | `0.5600` | `0.5693` | `0.5693` |
| `Modelo A` AUC-ROC | `0.8098` | `0.9024` | `0.8798` | `0.8802` | `0.8802` |
| `Modelo B` Macro F1 | `0.5688` | `0.6367` | `0.6712` | `0.6456` | `0.6456` |
| `Modelo B` F1 alimentacion | `0.3984` | `0.5223` | `0.5256` | `0.5488` | `0.5488` |
| `Modelo B` F1 servido | `0.3333` | `0.4000` | `0.5000` | `0.4000` | `0.4000` |

## Lectura global

La evolucion muestra que:

- el threshold tuning tiene un impacto mayor de lo esperado en el binario,
- la limpieza de features no rompio el rendimiento,
- la duplicacion controlada de `servido` mejora de forma clara la clase mas debil,
- la calibracion isotonica ayuda poco en el binario,
- la nueva ingesta del Experimento 5 mejoro Fase 1 pero no movio Fase 2,
- y la clase `servido` sigue siendo la principal limitacion estructural.

## Recomendacion

La siguiente corrida deberia partir del Experimento 5 con una lectura cuidadosa del costo-beneficio:

- conservar las 12 features activas,
- mantener la clase `servido` reforzada,
- revisar si la duplicacion controlada supera a `SMOTE` en este dataset,
- volver a ejecutar Fase 1 y Fase 2 solo si la nueva ingesta entra efectivamente en el dataset supervisado,
- y seguir explorando calibracion de threshold para el binario.

## Siguiente paso propuesto

El siguiente paso operativo ya queda listo para una nueva ingesta:

- recolectar mas eventos de `alimentacion` y `servido`,
- ejecutar Fase 1 y Fase 2 otra vez,
- y reabrir Fase 3 desde la mejor base disponible.
