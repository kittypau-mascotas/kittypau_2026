# Auditoría — KPCL0036 Anomalía de peso sin batería

**Device:** KPCL0036 (water_bowl)  
**Tipo de anomalía:** Lecturas de peso anómalas durante operación sin cargador  
**Artefacto de datos histórico:** `kpcl0036_sin_bateria_20200101_0000utc_a_1924utc.csv` (artefacto retirado del flujo vigente)  
**Artefacto de datos actual:** [`kpcl0036_sin_batera_actual.csv`](kpcl0036_sin_batera_actual.csv)  
**Propósito de este documento:** Diagnóstico técnico de la anomalía, su origen probable y las decisiones tomadas para aislarla del pipeline ML.

---

## Descripción del problema

Durante el experimento sin cargador (ver [`AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md`](AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md)), KPCL0036 presentó **lecturas de peso anómalas** que no correspondían al contenido real del bowl de agua.

Las anomalías se manifestaron como:
- **Spikes de peso** con valores súbitamente altos o negativos no atribuibles al comportamiento de Bandida.
- **Deriva de la línea base** (el peso "vacío" del bowl cambió sin que el contenido real cambiara).
- **Inestabilidad en la curva** durante períodos en los que el dispositivo debería estar en reposo.

---

## Hipótesis del origen

La causa más probable es la **relación entre el voltaje de batería y la calibración de la celda de carga (load cell)** del sensor de peso.

### Explicación técnica

La mayoría de las celdas de carga son sensibles al voltaje de alimentación del circuito de amplificación (típicamente un HX711 o similar). Cuando el voltaje baja progresivamente (batería en descarga), el amplificador puede:

1. **Reportar un offset diferente** — el valor "cero" del sensor se desplaza, generando una deriva de la línea base.
2. **Amplificar el ruido electrónico** — la relación señal/ruido empeora a voltajes bajos, generando spikes.
3. **Producir lecturas inconsistentes** — en el momento de reconexión o cerca del punto de corte del regulador de voltaje.

KPCL0034 (food_bowl) no presentó este problema durante el mismo experimento, lo que sugiere que puede haber una diferencia en el hardware específico de KPCL0036 (calibración del sensor, circuito de alimentación, o el bowl en sí).

### Alternativas secundarias

- **Interferencia mecánica:** Que el bowl de agua tenga una construcción física diferente (peso del recipiente, distribución del centro de masa) que hace la celda más sensible a vibraciones.
- **Temperatura:** Si la temperatura del ambiente varió, y la celda de KPCL0036 es más sensible a temperatura que la de KPCL0034.
- **Problema de firmware:** Una versión específica del firmware que afectó la lectura del ADC de KPCL0036 pero no de KPCL0034.

---

## Evidencia del problema

### En el dashboard

Al visualizar la curva de peso de KPCL0036 en el período del experimento sin cargador, se observan:
- Tramos con peso claramente incoherente (valores fuera del rango físicamente posible dado el tamaño del bowl).
- Transiciones abruptas sin que Bandida haya interactuado con el bowl.
- Períodos de "ruido" donde la curva oscila sin estabilizarse.

### En los datos CSV

El artefacto histórico `kpcl0036_sin_bateria_20200101_0000utc_a_1924utc.csv` (nombre con timestamp `20200101` refleja la fecha de inicio UTC configurada en el script de exportación, no la fecha real) contenía estos datos anómalos. Este archivo fue retirado del flujo vigente y reemplazado por `kpcl0036_sin_batera_actual.csv`.

### Eventos de conectividad asociados

Durante el período de las anomalías, `public.audit_events` registró múltiples `device_offline_detected` y `device_online_detected` para KPCL0036, atribuibles a:
1. El device posiblemente se desconectaba cuando la batería bajaba de cierto umbral.
2. La race condition conocida del health-check generó duplicados de estos eventos (lotes de 2–3 eventos en milisegundos).

Según [`REGLAS_EVENTOS_ALIMENTACION.md`](REGLAS_EVENTOS_ALIMENTACION.md), **los 30 eventos de conectividad acumulados entre 2026-02-12 y 2026-04-10 eran parte del cleanup histórico inicial** y ya no forman parte del flujo canónico actual.

---

## Impacto en el pipeline ML

### Decisión tomada

**KPCL0036 e hidratación están explícitamente excluidos del pipeline ML activo.**

Esta decisión está documentada en:
- [`Data Science/README.md`](Data%20Science/README.md): "El alcance vigente de esta carpeta es investigación supervisada sobre alimento; `KPCL0036` e hidratación quedan fuera del modelo activo por ahora."
- [`Data Science/fase_2_dataset/README.md`](Data%20Science/fase_2_dataset/README.md): "El modelo activo de esta fase es solo para alimentación y no cubre hidratación."

### Razón de la exclusión

Los datos de KPCL0036 durante el período de batería anómala **contaminarían el dataset de entrenamiento** con ejemplos donde la señal de peso no tiene relación con el comportamiento real de la mascota. Un modelo entrenado con esos datos aprendería patrones de ruido de hardware en lugar de patrones de consumo.

### Datos válidos de KPCL0036

Los datos de KPCL0036 **fuera del período problemático** son válidos y están disponibles en `kpcl0036_sin_batera_actual.csv`. Sin embargo, el pipeline ML no los usa actualmente porque:
1. No hay suficientes etiquetas de `inicio_hidratacion` / `termino_hidratacion` para construir un dataset supervisado comparable.
2. La prioridad es primero llevar el modelo de alimentación (KPCL0034) a los umbrales de Fase 4.

---

## Estado del artefacto histórico

### `kpcl0036_sin_bateria_20200101_0000utc_a_1924utc.csv`

| Campo | Estado |
|---|---|
| Existencia en disco | ✅ Presente (ver listado de carpeta) |
| Uso en flujo vigente | ❌ Retirado — no se usa en dashboard ni pipeline |
| Referenciado en README | ✅ Documentado como artefacto histórico |
| Debe eliminarse | No por ahora — es evidencia del experimento |

El dashboard actual usa exclusivamente `kpcl0036_sin_batera_actual.csv` (generado por `plot_kpcl_experimento.py` desde la fuente canónica Supabase).

---

## Soluciones propuestas

### Corto plazo (sin cambios de hardware)

1. **Filtrar automáticamente lecturas anómalas** en el pipeline de Fase 1 usando un detector de outliers (Z-score o IQR) por device.
2. **Excluir el período problemático** del análisis de hidratación mediante un filtro de fecha/hora en el query de Supabase.
3. **Documentar los períodos anómalos** con un evento de tipo `data_quality_issue` en `public.audit_events`.

### Mediano plazo (con cambios de firmware)

1. **Monitorear el voltaje de la batería** y detectar cuándo baja de un umbral seguro para la celda de carga (ej: 3.3V).
2. **Enviar `battery_level` desde el firmware** para que el pipeline pueda correlacionar anomalías de peso con nivel de batería.
3. **Implementar re-tare automático** cuando el device detecte que el voltaje de alimentación del ADC cambió significativamente.

### Largo plazo (hardware)

1. **Añadir un regulador de voltaje más estable** en el circuito de la celda de carga para aislarla de las fluctuaciones de la batería.
2. **Calibrar la celda de carga de KPCL0036** específicamente para el bowl de agua (diferentes propiedades mecánicas).

---

## Regla operativa derivada de esta auditoría

> **Si el cargador de un KPCL va a desconectarse durante más de 2 horas, se recomienda verificar la curva de peso antes y después para detectar deriva de línea base. Si se detecta deriva, ejecutar `tare_con_plato` para recalibrar.**

Esta regla no está implementada automáticamente en el sistema; depende de la supervisión manual del operador.

---

## Referencias

| Documento / Archivo | Relación |
|---|---|
| [`AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md`](AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md) | Contexto del experimento que originó esta anomalía |
| [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv) | Datos brutos del experimento (incluye período anómalo) |
| [`kpcl0036_sin_batera_actual.csv`](kpcl0036_sin_batera_actual.csv) | Export vigente de KPCL0036 (desde Supabase) |
| [`REGLAS_EVENTOS_ALIMENTACION.md`](REGLAS_EVENTOS_ALIMENTACION.md) | Bug conocido de duplicados en health-check (Fuente 4) |
| [`Data Science/README.md`](Data%20Science/README.md) | Declaración de alcance: KPCL0036 excluido del pipeline activo |
| `bridge/src/processor.js` | State machine que procesa datos de ambos devices (umbral SESSION_THRESHOLD_G = 5g) |
