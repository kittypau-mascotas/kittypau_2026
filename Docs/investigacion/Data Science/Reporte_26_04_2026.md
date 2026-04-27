# Reporte 26_04_2026 - Experimento 5

## Resumen ejecutivo

Con base en la quinta corrida de Fase 3 del proyecto KittyPaw, se evaluo el impacto de la nueva ingesta sobre los dos modelos de Machine Learning:

- `Modelo A`: binario, `activo` vs `reposo`
- `Modelo B`: multiclase, `alimentacion` / `servido` / `reposo`

Conclusiones principales:

- La nueva ingesta si mejoro Fase 1 y la visibilidad del grafico.
- Fase 2 no cambio, por lo que el dataset de entrenamiento siguio igual.
- Fase 3 quedo identica al Experimento 4.

## Visualizacion

- [Experimentos_Fase3_Resumen.svg](./Experimentos_Fase3_Resumen.svg)
- La lamina grafica resume la progresion de los cinco experimentos y el estado frente a Fase 4.

---

## 1. Contexto de la corrida

### Datos procesados en Fase 1

- `Readings`: `96,807`
- `Etiquetas`: `202`
- `Sesiones reconstruidas`: `95`

### Distribucion de etiquetas

- `inicio_alimentacion`: `81`
- `termino_alimentacion`: `81`
- `inicio_servido`: `14`
- `termino_servido`: `14`

### Observacion clave

La nueva ingesta si aparecio en Fase 1 y en el grafico, pero no altero los archivos de Fase 2.

---

## 2. Analisis del Modelo A

### Configuracion

- Tipo: binario
- Clases: `activo` vs `reposo`
- Features activas: `12`
- Features eliminadas: `delta_w_3`, `rate_gs`
- `scale_pos_weight`: `43.21688500727802`
- `learning_rate`: `0.010`
- `max_depth`: `10`
- Iteracion optima: `105`
- Threshold calibrado: `0.22`

### Resultados de validacion

| Medida | Valor |
|---|---:|
| Accuracy | `0.9737` |
| Precision | `0.6608` |
| Recall | `0.5000` |
| F1-score | `0.5693` |
| AUC-ROC | `0.8802` |

### Matriz de confusion

```text
TN = 6226
FP = 58
FN = 113
TP = 113
```

### Diagnostico tecnico

El binario quedo estable respecto al Experimento 4. La nueva ingesta no modifico sus metricas porque Fase 2 no cambio.

---

## 3. Analisis del Modelo B

### Configuracion

- Tipo: multiclase
- Clases: `alimentacion`, `servido`, `reposo`
- `num_leaves`: `127`
- `max_depth`: `10`
- `min_child_samples`: `1`
- `feature_fraction`: `0.85`
- `bagging_fraction`: `0.85`
- `lambda_l2`: `2.0`
- `weight_power`: `0.40`
- `served_duplication_factor`: `SMOTE local equivalente`
- Iteracion optima: `105`

### Resultados de validacion

| Medida | Valor |
|---|---:|
| Accuracy | `0.9762` |
| Macro F1 | `0.6456` |
| Weighted F1 | `0.9725` |
| Best val loss | `0.109012` |

### F1 por clase

| Clase | F1 |
|---|---:|
| `alimentacion` | `0.5488` |
| `servido` | `0.4000` |
| `reposo` | `0.9879` |

### Diagnostico tecnico

El multiclase tampoco cambio respecto al Experimento 4. La clase `servido` sigue siendo la mas sensible y el nuevo volumen de eventos no llego al dataset final de entrenamiento.

---

## 4. Importancia de caracteristicas

### Variables mas influyentes

| Variable | Lectura tecnica |
|---|---|
| `rolling_std_10` | Captura variabilidad de la senal y actividad. |
| `plateau_duration` | Ayuda a identificar estados estables o reposo. |
| `hour_sin` / `hour_cos` | Introducen el patron ciclico horario. |
| `weight_grams` | Sigue siendo una base central para ambos modelos. |
| `net_weight` | Representa cambios respecto a la linea base. |

### Hallazgo importante

La nueva ingesta no altero la jerarquia de variables importantes. El modelo sigue dependiendo de las mismas senales fuertes que en la corrida anterior.

---

## 5. Comparacion contra umbrales de Fase 4

| Metricas | Valor obtenido | Umbral minimo | Estado |
|---|---:|---:|---|
| Modelo A: F1 activo | `0.5693` | `0.70` | Fallido |
| Modelo A: AUC-ROC | `0.8802` | `0.85` | OK |
| Modelo B: Macro F1 | `0.6456` | `0.60` | OK |
| Modelo B: F1 alimentacion | `0.5488` | `0.65` | Fallido |
| Modelo B: F1 servido | `0.4000` | Sin umbral | Referencia |

### Resultado

El Modelo B sigue mostrando mejor base general que el Modelo A, pero la clase `servido` y la clase `alimentacion` siguen por debajo de los umbrales de Fase 4.

---

## 6. Recomendaciones tecnicas

### Prioridad alta

1. Recolectar mas sesiones reales de `servido`.
2. Asegurar que la proxima ingesta entre al corte temporal de Fase 2.
3. Verificar nuevamente los totales de `Fase 1`, `Fase 2` y `Fase 3` en cada corrida.

### Prioridad media

4. Seguir explorando threshold tuning del `Modelo A`.
5. Mantener las 12 features activas mientras no haya nueva extraccion de datos.

---

## 7. Conclusiones

### Estado de cada modelo

- `Modelo A`: estable, pero no listo.
- `Modelo B`: estable, pero aun no listo para Fase 4.
- `Fase 4`: aun no habilitada.

### Lectura final

El Experimento 5 confirma que una nueva ingesta puede mejorar la inspeccion visual de Fase 1 sin cambiar el entrenamiento real.

### Decision sugerida

La siguiente iteracion deberia enfocarse en:

- meter mas eventos que entren al dataset supervisado,
- volver a correr Fase 1/Fase 2/Fase 3,
- y comparar contra esta corrida como nueva base de referencia.
