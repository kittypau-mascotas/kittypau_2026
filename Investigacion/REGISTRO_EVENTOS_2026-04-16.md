# Registro de Eventos — KPCL0034 al 2026-04-16

**Dispositivo:** KPCL0034 (food_bowl)  
**Mascota:** Bandida  
**Fecha de corte:** 2026-04-16  
**Propósito:** Bitácora del backfill inicial de eventos manuales y fuente de trazabilidad del lote de 49 etiquetas usadas en la especificación ML original.

---

## Contexto del backfill

Entre el **2026-04-08** y el **2026-04-15**, se realizó el primer ciclo intensivo de categorización manual de sesiones de alimentación de Bandida. El operador revisó la curva de peso de KPCL0034 retroactivamente y registró eventos `inicio_alimentacion` / `termino_alimentacion` directamente en `public.audit_events` usando el modal del dashboard.

Este lote de 49 eventos fue el primer conjunto de etiquetas supervisadas disponibles para el proyecto y quedó como referencia en la especificación [`ML_PREDICCION_ALIMENTACION.md`](ML_PREDICCION_ALIMENTACION.md).

> **Fuente canónica:** `public.audit_events` con `event_type = 'manual_bowl_category'` y `entity_id` = UUID de KPCL0034. Este documento es una bitácora de referencia; la fuente de verdad siempre es la base de datos.

---

## Resumen del lote al 2026-04-16

| Métrica | Valor |
|---|---|
| Total eventos registrados | 49 |
| Rango temporal cubierto | 2026-04-08 → 2026-04-15 |
| Tipos de evento incluidos | `inicio_alimentacion`, `termino_alimentacion` |
| Pares completos estimados | ~20–23 sesiones cerradas |
| Sesiones incompletas conocidas | Al menos 1 (ver nota abajo) |
| Operador | Mauro Curcuma (javier.dayne@gmail.com) |

**Nota sobre sesión incompleta:**  
Se identificó al menos un evento `termino_alimentacion` sin su `inicio_alimentacion` correspondiente en el entorno del `2026-04-12 14:24:38 UTC`. Este par debe filtrarse o imputarse antes de usar el dataset en entrenamiento. Ver sección de sesiones incompletas al final de este documento.

---

## Contexto operativo del período cubierto

### Estado del device en el período 2026-04-08 al 2026-04-15

- **KPCL0034** encendido desde el `2026-04-08 02:34 UTC` (primer reading registrado).
- **Cadencia típica de lecturas:** ~14–15 segundos entre muestras.
- **`clock_invalid`:** El reloj del device quedó inválido en una porción de las lecturas del período. Se usa `ingested_at` como timestamp canónico cuando este flag está activo.
- **Batería:** `battery_level` reportaba 100% NaN durante todo el período (hardware no enviaba el dato en esta versión de firmware).

### Comportamiento alimenticio observado de Bandida

- **Frecuencia típica:** 4–6 sesiones de alimentación por día.
- **Duración típica por sesión:** 3–10 minutos (confirmado por sesiones cerradas del período).
- **Hora de mayor actividad:** Variable; los features cíclicos `hour_sin` / `hour_cos` del pipeline ML captaron el patrón.
- **Variación de peso por sesión:** Variable según cantidad de comida disponible y apetito.

---

## Taxonomía aplicada en el backfill

Todos los eventos se registraron con:
- `event_type = 'manual_bowl_category'`
- `payload = { "category": "<key_canonica>", ... }`
- `entity_id = UUID de KPCL0034`

| Key canónica | Descripción | Tipo |
|---|---|---|
| `inicio_alimentacion` | Bandida empieza a comer (peso empieza a bajar) | Apertura de intervalo |
| `termino_alimentacion` | Bandida termina de comer (peso se estabiliza) | Cierre de intervalo |

No se registraron eventos de `inicio_servido` / `termino_servido` ni eventos de setup (`tare_con_plato`, etc.) en este backfill inicial. Esos llegaron en iteraciones posteriores.

---

## Reglas aplicadas durante el backfill

1. **Identificación visual:** El operador identificaba un descenso sostenido de la curva de peso como candidato a sesión de alimentación.
2. **Criterio de inicio:** Se marcaba `inicio_alimentacion` en el punto donde el peso comenzaba a descender de forma consistente (no ruido del sensor).
3. **Criterio de término:** Se marcaba `termino_alimentacion` cuando el peso se estabilizaba en un nuevo plateau (mínimo 2–3 lecturas consecutivas estables).
4. **Exclusión de servido:** Si el peso subía (el operador rellenó el plato), ese tramo no se marcaba como sesión de alimentación.
5. **Pares obligatorios:** Cada `inicio_alimentacion` debía tener su `termino_alimentacion`. Una sesión sin cierre no se contabilizaba.

---

## Evolución del dataset después del 2026-04-16

Este lote de 49 eventos fue la base inicial. En sesiones de categorización posteriores el dataset creció significativamente:

| Corte temporal | Total etiquetas | inicio_alimentacion | termino_alimentacion | inicio_servido | termino_servido |
|---|---|---|---|---|---|
| 2026-04-16 (este documento) | ~49 | ~20–23 | ~20–23 | 0 | 0 |
| 2026-04-25 (Experimento 01) | 186 | 74 | 74 | 13 | 13 |
| 2026-04-27 (calidad final Fase 1) | 202 | 81 | 81 | 14 | 14 |

El crecimiento de 49 → 202 eventos refleja el proceso iterativo de etiquetado que siguió a este backfill.

---

## Sesiones incompletas identificadas

Una sesión incompleta ocurre cuando existe un evento de apertura sin su cierre correspondiente, o viceversa. El pipeline de Fase 1 (`05_build_sessions.py`) detecta y reporta estas anomalías en `public.device_bowl_session_anomalies`.

### Tipos de anomalía

| Tipo | Descripción | Acción recomendada |
|---|---|---|
| `termino_sin_inicio_correspondiente` | Hay `termino_alimentacion` pero no hay `inicio_alimentacion` previo | Filtrar del training set |
| `inicio_sin_termino_correspondiente` | Hay `inicio_alimentacion` pero la sesión nunca se cerró | Filtrar del training set |
| `inicio_duplicado_reemplazado_por_inicio_mas_reciente` | Dos `inicio_alimentacion` consecutivos sin `termino` intermedio | El segundo reemplaza al primero |

### Caso conocido al 2026-04-16

- **Timestamp afectado:** aprox. `2026-04-12 14:24:38 UTC`
- **Tipo:** `termino_sin_inicio_correspondiente`
- **Causa probable:** El operador marcó `termino_alimentacion` pero olvidó o no pudo marcar el `inicio_alimentacion` previo (por ejemplo, si la sesión ya había comenzado antes de que el operador abriera el dashboard).
- **Resolución aplicada:** Filtrado antes del entrenamiento. No se imputó un inicio artificial.

---

## Cómo consultar el estado actual de etiquetas

```sql
-- Conteo actual de etiquetas por categoría para KPCL0034
select
  payload ->> 'category' as categoria,
  count(*) as total
from public.audit_events ae
join public.devices d on d.id = ae.entity_id
where ae.event_type = 'manual_bowl_category'
  and d.device_id = 'KPCL0034'
group by payload ->> 'category'
order by total desc;
```

```sql
-- Verificar sesiones incompletas actuales para KPCL0034
select
  anomaly_type,
  count(*) as n,
  min(detected_at) as primera,
  max(detected_at) as ultima
from public.device_bowl_session_anomalies dsa
join public.devices d on d.id = dsa.device_id
where d.device_id = 'KPCL0034'
group by anomaly_type;
```

```sql
-- Ver los últimos 10 eventos registrados para KPCL0034
select
  ae.created_at,
  payload ->> 'category' as categoria,
  ae.id
from public.audit_events ae
join public.devices d on d.id = ae.entity_id
where ae.event_type = 'manual_bowl_category'
  and d.device_id = 'KPCL0034'
order by ae.created_at desc
limit 10;
```

---

## Referencias

| Documento | Relación con este registro |
|---|---|
| [`ML_PREDICCION_ALIMENTACION.md`](ML_PREDICCION_ALIMENTACION.md) | Cita este lote de 49 eventos como dataset base de la especificación ML |
| [`REGLAS_EVENTOS_ALIMENTACION.md`](REGLAS_EVENTOS_ALIMENTACION.md) | Define las reglas canónicas de categorización aplicadas en el backfill |
| [`Data Science/fase_1_extraccion/`](Data%20Science/fase_1_extraccion/) | Pipeline que descarga y reconstruye sesiones desde `audit_events` |
| [`A1_exp_01_linea_base.md`](A1_exp_01_linea_base.md) | Primera corrida ML que usó el dataset derivado de este backfill (ya con 186 eventos) |
| `kittypau_app/src/app/api/devices/[id]/category/route.ts` | API que escribió los eventos en `public.audit_events` |
