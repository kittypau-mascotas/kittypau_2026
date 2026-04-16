# Especificación ML — Predicción de inicio y término de alimentación

**Fecha:** 2026-04-16
**Dispositivo tester:** KPCL0034 (food_bowl)
**Mascota tester:** Bandida

---

## 1. Objetivo

Entrenar un modelo supervisado que, dado el historial reciente de la curva de peso de un
food_bowl, prediga automáticamente los timestamps de:

- `inicio_alimentacion` — Bandida empieza a comer (peso empieza a descender)
- `termino_alimentacion` — Bandida termina de comer (peso se estabiliza en un nuevo plateau)

El modelo reemplazaría (o complementaría) la detección heurística actual de sesiones de
`IntakeSession` que corre en el cliente (`kittypau_app/src/app/(app)/today/page.tsx`,
función `detectIntakeSessions`).

---

## 2. Formulación del problema

### 2a. Segmentación de eventos (recomendada para MVP)

Dado un vector de lecturas de peso ordenado por tiempo, predecir para cada lectura si
pertenece a uno de 3 estados:

| Clase | Descripción |
|---|---|
| `0` — baseline | Peso estable, sin consumo activo |
| `1` — inicio_alimentacion | Descenso activo de peso (gato comiendo) |
| `2` — post_alimentacion | Nuevo plateau tras el consumo |

El inicio de la clase `1` es `inicio_alimentacion`; el fin de la clase `1` (o el inicio de
`2`) es `termino_alimentacion`.

### 2b. Alternativa: regresión de timestamp

Dado una ventana centrada en un candidato a evento, predecir la probabilidad de que ese
punto sea un `inicio_alimentacion` o `termino_alimentacion`. Más complejo pero más preciso
para timestamps exactos.

---

## 3. Dataset etiquetado disponible

### Fuente de etiquetas
- Tabla: `public.audit_events`
- `event_type = 'manual_bowl_category'`
- `payload->>'category' IN ('inicio_alimentacion', 'termino_alimentacion')`
- `entity_id` = UUID de KPCL0034

### Lote KPCL0034 (canónico al 2026-04-16)
- **49 eventos** manuales, rango `2026-04-08` a `2026-04-15`
- Trazabilidad completa en `REGISTRO_EVENTOS_KPCL0034_2026-04-16.md`
- Script de carga: `backfill_kpcl_categories_batch_2026_04_16.py`

### Distribución de sesiones de alimentación etiquetadas
- ~4-6 sesiones por día
- Duración típica: 3–10 minutos
- Descenso típico por sesión: variable (depende de cuánto comió)

### Importante: sesiones incompletas
Algunos pares inicio/término tienen un elemento faltante (ej: `2026-04-12 14:24:38`
tiene `termino_alimentacion` sin `inicio` previo). Estos deben ser filtrados o imputados
antes del entrenamiento.

---

## 4. Features disponibles

### Fuente primaria: `public.readings`
Columnas relevantes por lectura:

| Feature | Columna | Notas |
|---|---|---|
| Peso bruto | `weight_grams` | Variable principal; viene suavizado en app |
| Temperatura ambiente | `temperature` | Correlaciona con actividad del gato |
| Humedad | `humidity` | Secundaria |
| Batería | `battery_level` | Proxy de estado del dispositivo |
| Timestamp | `recorded_at` / `ingested_at` | Usar `ingested_at` si `clock_invalid = true` |
| Clock inválido | `clock_invalid` | Flag para reemplazar timestamp del device |

### Features derivadas (a calcular en pipeline)
| Feature derivada | Fórmula | Relevancia |
|---|---|---|
| Delta peso | `weight[t] - weight[t-1]` | Descenso activo = consumo |
| Delta peso suavizado | media móvil 3-5 puntos | Reduce ruido del sensor |
| Velocidad de cambio | `delta / dt` (g/s) | Detecta onset rápido |
| Peso relativo al plato | `weight - plate_weight_grams` | Peso de contenido real |
| Hora del día (sin, cos) | encodificación cíclica de `recorded_at` local | Rutinas del gato |
| Día de la semana (sin, cos) | encodificación cíclica | Rutinas semanales |
| Tiempo desde último evento | delta desde último `inicio/termino` | Gap entre sesiones |
| Plateau anterior | media del segmento estable previo | Baseline de referencia |

### Fuente secundaria: `public.audit_events`
- `device_power_event` (`kpcl_prendido` / `kpcl_apagado`) — segmenta las series continuas
- `tare_con_plato` — reseteo del baseline; reiniciar ventana de features
- `inicio_servido` / `termino_servido` — indica recarga del plato (excluir de consumo)

---

## 5. Pipeline de extracción de datos de entrenamiento

### Query SQL base

```sql
-- Lecturas de KPCL0034 con sus eventos manuales alineados
select
  r.recorded_at,
  r.ingested_at,
  r.weight_grams,
  r.temperature,
  r.humidity,
  r.battery_level,
  r.clock_invalid,
  d.plate_weight_grams,
  ae.payload ->> 'category' as evento_manual
from public.readings r
join public.devices d on d.id = r.device_id
left join public.audit_events ae
  on ae.entity_id = r.device_id
  and ae.event_type = 'manual_bowl_category'
  and abs(extract(epoch from (
    coalesce(
      case when r.clock_invalid then null else r.recorded_at end,
      r.ingested_at
    ) - ae.created_at
  ))) < 30  -- ventana de ±30s para alinear etiqueta al reading más cercano
where d.device_id = 'KPCL0034'
  and r.recorded_at >= '2026-04-08 00:00:00+00'
order by coalesce(
  case when r.clock_invalid then null else r.recorded_at end,
  r.ingested_at
);
```

### Script de referencia
`Docs/investigacion/refresh_kpcl_experimento.py` — baja la serie completa desde Supabase.
Extender este script para incluir el JOIN con `audit_events` y exportar el dataset de
entrenamiento en formato CSV con columna `label` (`0`, `1`, `2` según estado).

---

## 6. Baseline heurístico existente (punto de comparación)

La app ya implementa detección de sesiones de consumo en el cliente:

**Archivo:** `kittypau_app/src/app/(app)/today/page.tsx`
**Función:** `detectIntakeSessions(points, minDrop, windowMs)`

**Lógica:**
1. Ordena lecturas por timestamp.
2. Busca pares donde `weight[t+n] < weight[t] - minDrop` dentro de una ventana `windowMs`.
3. Calcula `consumed = weight_start - weight_end` y `durationMinutes`.
4. Retorna sesiones con `startIndex`, `endIndex`, `consumed`.

**Limitaciones del heurístico:**
- No usa contexto histórico del gato (no aprende rutinas).
- Sensible a ruido del sensor (spikes falsos positivos).
- No distingue entre consumo real y servido/tare.
- Umbral `minDrop` fijo, no adaptativo por individuo.

El modelo supervisado debe superar este baseline en F1 sobre el dataset etiquetado.

---

## 7. Arquitectura sugerida para MVP

### Opción A — Gradient Boosting sobre features tabulares (recomendada)
- **Modelo:** XGBoost o LightGBM
- **Input:** ventana deslizante de N lecturas (ej: 10 min = ~120 lecturas a 5s)
- **Output:** clase `{0, 1, 2}` por lectura, o probabilidad de evento
- **Ventaja:** interpretable, entrena con pocos datos, rápido de iterar
- **Referencia transformación:** `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`
  (`log10(x + 1)` en delta peso para manejar outliers)

### Opción B — LSTM / GRU sobre serie temporal
- **Modelo:** secuencia → secuencia (seq2seq) o clasificación por ventana
- **Input:** serie temporal raw de peso + features ambientales
- **Ventaja:** captura dependencias temporales largas
- **Desventaja:** requiere más datos etiquetados (~200+ sesiones)

### Opción C — Cambio de régimen (ruptura estructural)
- **Modelo:** PELT (Pruned Exact Linear Time) o BOCPD
- **Output:** timestamps de cambio de régimen en la curva de peso
- **Ventaja:** no requiere etiquetas, es semi-supervisado
- **Uso:** generar candidatos de `inicio/termino`, validar contra etiquetas manuales

---

## 8. Métricas de evaluación

| Métrica | Descripción | Umbral sugerido MVP |
|---|---|---|
| F1 macro | Balance entre precisión y recall para las 3 clases | ≥ 0.75 |
| Precisión `inicio_alimentacion` | Falsos positivos costosos en UX | ≥ 0.80 |
| Error de timestamp | MAE en segundos vs. etiqueta manual | ≤ 60s |
| Comparación vs. heurístico | F1 del modelo > F1 del `detectIntakeSessions` | +5 puntos mínimo |

---

## 9. Consideraciones de datos

- **clock_invalid:** usar `ingested_at` cuando `clock_invalid = true`. Documentado en
  `Docs/ALGORITMOS_INTERPRETACION.md`.
- **Servido vs. consumo:** excluir tramos entre `inicio_servido` y `termino_servido`
  del target de predicción (el peso cambia por llenado, no por consumo).
- **Tare:** resetear el baseline de peso relativo tras cada `tare_con_plato`.
- **Gap por apagado:** segmentar la serie en `kpcl_apagado` → `kpcl_prendido`;
  no interpolar entre sesiones de encendido distintas.
- **Sesiones incompletas:** filtrar pares donde falta inicio o término antes de
  entrenar; documentar en `REGISTRO_EVENTOS_KPCL0034_2026-04-16.md`.

---

## 10. Referencias

| Archivo | Uso |
|---|---|
| `Docs/investigacion/README.md` | Taxonomía canónica de categorías y eventos |
| `Docs/investigacion/REGISTRO_EVENTOS_KPCL0034_2026-04-16.md` | Dataset etiquetado KPCL0034 |
| `Docs/investigacion/refresh_kpcl_experimento.py` | Descarga serie desde Supabase |
| `Docs/investigacion/plot_kpcl_experimento.py` | Visualización interactiva con eventos |
| `Docs/investigacion/SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql` | SQL canónico de exportación |
| `Docs/ALGORITMOS_INTERPRETACION.md` | Reglas heurísticas actuales + guardrails |
| `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md` | Transformaciones recomendadas |
| `kittypau_app/src/app/(app)/today/page.tsx` | Heurístico baseline (`detectIntakeSessions`) |
| `kittypau_app/src/app/api/devices/[id]/category/route.ts` | API de registro de categorías |
| `bridge/src/index.js` | Fuente de `kpcl_prendido` / `kpcl_apagado` (v3.1) |
