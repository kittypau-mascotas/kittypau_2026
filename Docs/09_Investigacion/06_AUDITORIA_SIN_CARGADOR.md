# Auditoría — Experimento KPCL0034 + KPCL0036 sin cargador

**Devices involucrados:** KPCL0034 (food_bowl) · KPCL0036 (water_bowl)  
**Tipo de experimento:** Prueba de descarga libre de batería sin cargador conectado  
**Artefacto de datos:** [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv) (~63 MB)  
**Propósito de este documento:** Diagnóstico canónico del experimento compartido y registro de los hallazgos por device.

---

## Propósito del experimento

Este experimento se realizó para caracterizar el comportamiento de ambos devices (KPCL0034 y KPCL0036) cuando operan en modo batería sin cargador conectado. Los objetivos específicos eran:

1. **Medir la duración real de la batería** de cada device en condiciones de uso normal.
2. **Identificar si el nivel de batería afecta la cadencia de muestreo** o la calidad de los datos de peso.
3. **Detectar artefactos en la curva de peso** asociados a variaciones de voltaje de batería.
4. **Documentar el comportamiento del reloj interno** (`clock_invalid`) a medida que la batería baja.
5. **Comparar comportamiento de KPCL0034 vs. KPCL0036** en idénticas condiciones de energía.

---

## Descripción del experimento

### Setup inicial

- Ambos devices fueron **completamente cargados** antes de iniciar el experimento.
- Se desconectaron los cargadores simultáneamente.
- Ambos devices permanecieron en su posición habitual (bowl de comida y bowl de agua respectivamente).
- La mascota (Bandida) continuó usando los bowls normalmente durante el experimento.
- Se mantuvo el monitoreo activo del dashboard para registrar eventos de alimentación e hidratación.

### Condiciones

| Condición | Detalle |
|---|---|
| Carga inicial | 100% (ambos devices) |
| Cargador | Desconectado durante todo el experimento |
| Temperatura ambiente | Normal (hogar, sin condición extrema) |
| Uso habitual de la mascota | Sí — Bandida usó los bowls normalmente |
| Dashboard activo | Sí — lecturas siendo registradas en Supabase |

---

## Artefacto de datos

### [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv)

**Tamaño:** ~63 MB  
**Formato:** CSV con columna `device_code` para distinguir entre KPCL0034 y KPCL0036.

**Columnas presentes:**

| Columna | Tipo | Descripción |
|---|---|---|
| `device_code` | string | `'KPCL0034'` o `'KPCL0036'` |
| `recorded_at` | timestamp UTC | Timestamp del device (puede ser inválido) |
| `ingested_at` | timestamp UTC | Timestamp del bridge (siempre confiable) |
| `weight_grams` | float | Peso total bruto |
| `temperature` | float | Temperatura ambiente |
| `humidity` | float | Humedad relativa |
| `battery_level` | float | Nivel de batería (0–100); posiblemente NaN si hardware no lo envía |
| `clock_invalid` | bool | `True` cuando el reloj del device no es confiable |
| `evento` | string | Etiqueta de `audit_events` alineada (±30s); null si no hay evento |

**Nota:** Este es un snapshot bruto. Contiene datos de ambos devices sin filtros de calidad aplicados. Para análisis por device, usar los CSVs individuales (`kpcl0034_sin_batera_actual.csv` y `kpcl0036_sin_batera_actual.csv`).

---

## Hallazgos por device

### KPCL0034 (food_bowl)

#### Comportamiento de la batería
- El nivel de batería (`battery_level`) reportó 100% NaN durante el experimento, ya que esta versión del firmware no enviaba el dato de batería. Esto impidió medir objetivamente la curva de descarga.
- El comportamiento operativo del device (cadencia de muestreo, calidad del peso) fue **normal** durante todo el período observado.
- No se detectaron caídas súbitas de peso atribuibles a fluctuaciones de voltaje.

#### Comportamiento del reloj (`clock_invalid`)
- El flag `clock_invalid = True` se activó en aproximadamente el **50%** de las lecturas del período, consistente con el comportamiento general del device durante todo el historial.
- No se observó correlación entre el nivel de batería y la frecuencia de `clock_invalid` (aunque el dato de batería no era confiable).
- El timestamp de referencia `ingested_at` funcionó correctamente como fallback en todos los casos.

#### Calidad del dato de peso
- Cadencia mediana: ~14–15 segundos (normal).
- NaN en `weight_grams`: < 0.1% (aceptable).
- No se detectaron spikes anómalos atribuibles al experimento de batería.

#### Sesiones registradas durante el experimento
- Se registraron sesiones de alimentación de Bandida de forma normal durante el período.
- Las etiquetas manuales de `inicio_alimentacion` / `termino_alimentacion` se capturaron sin problemas.

---

### KPCL0036 (water_bowl)

#### Comportamiento de la batería
- Mismo problema que KPCL0034: `battery_level` reportó NaN por limitación de firmware.
- El device mantuvo conectividad estable durante todo el período observado en este CSV.

#### Comportamiento del reloj (`clock_invalid`)
- Similar a KPCL0034: ~50% de lecturas con `clock_invalid = True`.

#### Anomalías detectadas en el peso
- Se identificaron anomalías en la curva de peso de KPCL0036 relacionadas con el estado de la batería. Ver documento específico: [`AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md`](AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md).
- Estas anomalías generaron lecturas de peso que no correspondían al contenido real del bowl.

#### Eventos de conectividad
- Se detectaron duplicados en `device_offline_detected` / `device_online_detected` en `public.audit_events` durante el período, atribuibles a la race condition conocida en el health-check. Ver [`REGLAS_EVENTOS_ALIMENTACION.md`](REGLAS_EVENTOS_ALIMENTACION.md) sección Fuente 4.

---

## Comparación KPCL0034 vs. KPCL0036

| Aspecto | KPCL0034 | KPCL0036 |
|---|---|---|
| `battery_level` reportado | NaN (sin dato) | NaN (sin dato) |
| `clock_invalid` frecuencia | ~50% | ~50% |
| Calidad de datos de peso | Normal (sin anomalías detectadas) | Con anomalías (ver auditoría específica) |
| Sesiones registradas | Sí (alimentación) | Sí (hidratación) |
| Impacto en pipeline ML | Sin impacto — datos usables | Datos excluidos del pipeline activo de ML |

---

## Conclusiones del experimento

### Lo que confirmó el experimento

1. **La ausencia de cargador no degradó la calidad del dato de peso** en KPCL0034 durante el período observado.
2. **El `clock_invalid` es endémico** y no está relacionado específicamente con el estado de batería — es un comportamiento del firmware que requiere corrección separada.
3. **El fallback a `ingested_at`** funciona correctamente y permite mantener la trazabilidad temporal incluso con el reloj del device inválido.
4. **KPCL0036 presentó comportamiento anómalo** en la curva de peso durante el período sin cargador, lo que confirma que el modelo ML activo se focaliza correctamente solo en KPCL0034.

### Limitaciones del experimento

1. **No se pudo medir la curva de descarga de batería** porque el firmware no enviaba `battery_level` en esa versión.
2. **El experimento no tiene un punto de corte definido** (cuándo se reconectó el cargador) en la documentación existente.
3. **Los datos de KPCL0036 del período son problemáticos** para análisis de consumo de agua y no deben usarse en el pipeline ML hasta que se entienda y corrija la anomalía.

---

## Estado del artefacto en el flujo actual

| Uso | Estado |
|---|---|
| Dashboard interactivo | Los datos del experimento están incluidos en el histórico que muestra el dashboard. Los CSVs individuales (`_actual.csv`) cubren el período. |
| Pipeline ML de Fase 1 | **Excluido** — el pipeline de ML usa solo `readings_raw.parquet` desde Supabase, no este CSV combinado. |
| Referencia histórica | ✅ Este CSV es el artefacto canónico del experimento compartido. Se conserva para análisis y diagnóstico. |

---

## Acciones recomendadas

| Acción | Prioridad | Responsable |
|---|---|---|
| Implementar envío de `battery_level` en el firmware de los KPCLs | Media | Firmware |
| Documentar el punto exacto de reconexión del cargador para este experimento | Baja | Mauro |
| Investigar la causa raíz de las anomalías de peso en KPCL0036 sin batería | Media | Investigación |
| Corregir el bug de `clock_invalid` en el firmware | Media | Firmware |

---

## Referencias

| Documento / Archivo | Relación |
|---|---|
| [`kpcl0034_kpcl0036_prueba_sincargador.csv`](kpcl0034_kpcl0036_prueba_sincargador.csv) | Datos brutos del experimento |
| [`kpcl0034_sin_batera_actual.csv`](kpcl0034_sin_batera_actual.csv) | Export filtrado de KPCL0034 (cubre este período) |
| [`kpcl0036_sin_batera_actual.csv`](kpcl0036_sin_batera_actual.csv) | Export filtrado de KPCL0036 (cubre este período) |
| [`AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md`](AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md) | Diagnóstico específico de la anomalía de peso en KPCL0036 |
| [`REGLAS_EVENTOS_ALIMENTACION.md`](REGLAS_EVENTOS_ALIMENTACION.md) | Reglas de clasificación de eventos (Fuente 4: health-check) |
| `bridge/src/index.js` | Bridge que procesa los datos de ambos devices |
