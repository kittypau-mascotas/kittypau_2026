# Transformaciones analíticas en KittyPau: `log10` + Fourier (FFT)

Este documento define **dónde** y **cómo** aplicar dos transformaciones clave para que la analítica/ML sea estable con telemetría IoT real (skew, outliers, ruido).

---

## 1) `log10` en KittyPau (capa de ingestión / feature engineering)

### Dónde aplicarlo
En el **proceso de ingestión server-side** que finalmente escribe en DB (**webhook/API** o **Bridge** si fuera el componente que persiste):
- **Justo después** de validar el payload (ej. Zod)
- **Justo antes** de persistir en DB

En el MVP actual, donde el Bridge solo reenvía, este paso debe ejecutarse en el webhook `/api/mqtt/webhook` (o en el componente server-only que inserta en `readings`).

### Variables candidatas (críticas)
- Consumo de alimento (gramos por evento / deltas de `weight_grams`)
- Consumo de agua (ml)
- Intervalos entre eventos (segundos)
- Intensidad de actividad (si se agregan sensores)
- Señales crudas (peso continuo del plato)

### Problema real (skew/outliers)
Los datos de mascotas suelen estar **altamente skewed**:
- Un gato puede comer `5g` y otro `120g`
- Pueden existir picos falsos (golpes, vibración, error de sensor)

Eso rompe:
- modelos ML
- dashboards
- detección de anomalías

### Solución con `log10`
Transformación recomendada:

`x -> log10(x + 1)`

`+1` evita `log(0)` y mantiene `0` como `0`.

### Efecto directo
- Reduce outliers **sin eliminarlos**
- Hace distribuciones más “gaussianas”
- Mejora estabilidad de modelos
- Evita que un evento raro domine el análisis

### Ejemplo (KittyPau)
| Evento | Gramos | `log10(x+1)` |
|---|---:|---:|
| normal | 20 | 1.32 |
| alto | 100 | 2.00 |
| extremo | 500 | 2.70 |

### Regla de persistencia (guardar ambos)
Guardar **raw** y **transformado**:
- `value_raw`
- `value_log`

En tablas con columnas específicas, usar el patrón:
- `weight_grams` (raw) + `weight_grams_log`
- `water_ml` (raw) + `water_ml_log`
- `dt_seconds` (raw) + `dt_seconds_log`

---

## 2) Fourier en KittyPau (capa analítica / ML)

### Dónde aplicarlo
**No** en el Bridge.

Debe ir en:
- Worker de procesamiento (Python / ML service)
- Batch jobs (cron) o microservicio analítico

### Qué señal usar
Series temporales por mascota:
- `time vs food_intake`
- `time vs water_intake`
- `time vs visits_to_bowl`

### Qué obtienes con Fourier (FFT)
1) **Rutinas**
Frecuencia dominante => cada cuántas horas come/bebe.

2) **Cambios de comportamiento**
Si desaparece una frecuencia o cambia su potencia => cambio de hábito (early signal).

3) **Ruido vs comportamiento real**
Permite filtrar vibraciones/eventos falsos versus patrones consistentes.

### Ejemplo
Si come a las 8am y 8pm todos los días:
- FFT detecta frecuencia dominante ≈ 1 ciclo cada 12 horas

Si pasa a 1 vez al día:
- La frecuencia dominante cambia => disparar alerta por cambio de patrón

---

## Pipeline recomendado (alineado a la arquitectura)
```
[Dispositivo IoT]
        ↓
[MQTT]
        ↓
[Ingestión server-side]
    - Validación (Zod)
    - Normalización
    - `log10(x + 1)` (features)
        ↓
[DB (raw + transformed)]
        ↓
[ML Service / Worker]
    - agregaciones por mascota
    - FFT (Fourier)
    - detección de patrones
    - scoring de anomalías
        ↓
[Backend API]
        ↓
[Frontend]
    - dashboards
    - alertas
    - insights
```

---

## Features candidatas para ML (futuro)
- `mean_log_food`
- `std_log_food`
- `dominant_frequency`
- `frequency_power`

---

## Recomendación de implementación (3 fases)
1) **Fase 1 (rápida)**: `log10` en ingestión + guardar raw y log
2) **Fase 2**: agregaciones por mascota (cron) + series temporales limpias
3) **Fase 3 (diferenciación)**: servicio Python con `numpy.fft` + detección de picos + scoring

