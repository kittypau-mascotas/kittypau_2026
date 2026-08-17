---
tags: [kittypau, ciclo-alpha-v2, deteccion, segmentos, fase-0]
fecha_creacion: 2026-06-26
estado: activo
---

# Fase 0 — Detección de Segmentos

> Ver [[av2_00_INDICE_Y_VISION_GENERAL]] para el índice completo. Ver [[04_SHAPE_FEATURES]] para las features matemáticas calculadas sobre cada segmento.

**Script:** `fase_0_ruido/01_genera_candidatos.py`
**Output:** `fase_0_ruido/data/candidatos_av2.csv` (916 candidatos, 2026-08-16)

---

## Filosofía

El generador de candidatos usa **umbrales bajos a propósito**: prefiere detectar de más (falsos positivos) antes que perder eventos reales. El operador filtra los falsos positivos en la app de anotación (ver [[av2_05_ANOTACION_Y_CATEGORIAS]]).

> "Todo segmento donde el peso se movió significativamente es un candidato. Que sea alimentación, servido o ruido es decisión del operador."

---

## Pasos del algoritmo

### Paso 1 — Carga y resampleo

Ver [[av2_02_DISPOSITIVO_Y_DATOS]] para el detalle de carga. El resultado es un DataFrame con columnas `ts` (UTC, cada 30s) y `peso_g` (float, con NaN en gaps).

### Paso 2 — Detección de actividad por ventanas rodantes

Para cada slot de 30s se calculan dos métricas en ventanas rodantes:

#### Desviación estándar rodante (`rolling_std`)

```python
ventana_std = 10 lecturas = 5 minutos
rolling_std = df["peso_g"].rolling(10, min_periods=2).std()
```

Detecta **variabilidad local** — si el peso oscila mucho en los últimos 5 min, hay actividad.

#### Rango rodante (`rolling_delta`)

```python
ventana_delta = 20 lecturas = 10 minutos
rolling_delta = (
    df["peso_g"].rolling(20).max() - df["peso_g"].rolling(20).min()
)
```

Detecta **desplazamientos netos** — si el rango de peso en 10 min supera el umbral, hay un evento.

#### Combinación

```python
activa = (rolling_std > umbral_std_g) | (rolling_delta > umbral_delta_g)
```

Un slot se marca "activo" si **cualquiera** de las dos condiciones se cumple. Los umbrales actuales (`umbrales.json`):

| Parámetro | Valor | Descripción |
|---|---|---|
| `umbral_std_g` | 1.5 g | Std. rodante mínima para considerar actividad |
| `umbral_delta_g` | 5.0 g | Rango rodante mínimo para considerar actividad |
| `ventana_std_lecturas` | 10 | Ventana de std (10 × 30s = 5 min) |
| `ventana_delta_lecturas` | 20 | Ventana de delta (20 × 30s = 10 min) |

### Paso 3 — Extensión de márgenes (±1 min)

Las ventanas rodantes "retrasan" la detección: un evento que empieza en t=0 puede no detectarse hasta t=5 min (cuando la ventana lo captura). Para compensar, la máscara activa se extiende ±1 minuto (±2 slots de 30s):

```python
n_ext = max(1, 60 // resample_s)   # = 2 slots
activa = activa.rolling(2 * n_ext + 1, center=True, min_periods=1).max().astype(bool)
```

Esto asegura capturar el inicio y fin real de cada evento.

### Paso 4 — Agrupación en segmentos

Se recorre la máscara lineal `activa` y se detectan los bordes (False→True y True→False):

```python
segmentos = []
en_seg = False
for i, es_activa in enumerate(activa):
    if pd.isna(df.loc[i, "peso_g"]):
        if en_seg:
            segmentos.append((inicio_idx, i - 1))
            en_seg = False
        continue
    if es_activa and not en_seg:
        en_seg = True; inicio_idx = i
    elif not es_activa and en_seg:
        segmentos.append((inicio_idx, i - 1))
        en_seg = False
```

Un NaN en la señal fuerza el cierre del segmento actual (gap real entre lecturas).

**Resultado:** 503 segmentos antes de fusionar.

### Paso 5 — Fusión de segmentos cercanos

Segmentos separados por menos de `gap_merge_s` segundos (= 120s = 2 min) se unen en uno solo. Esto evita partir un evento de alimentación largo cuando el sensor tiene una pausa breve:

```python
for ini, fin in segmentos[1:]:
    gap_s = (df.loc[ini, "ts"] - df.loc[fusionados[-1][1], "ts"]).total_seconds()
    if gap_s < gap_merge_s:
        fusionados[-1] = (fusionados[-1][0], fin)   # extiende el anterior
    else:
        fusionados.append((ini, fin))                # nuevo segmento
```

**Resultado:** 496 segmentos tras fusionar.

### Paso 6 — Filtrado por duración y rango mínimo

Para cada segmento se verifica que cumpla los criterios mínimos:

| Criterio | Umbral | Motivo |
|---|---|---|
| `duracion >= min_duracion_s` | 45 segundos | Eliminar micro-fluctuaciones |
| `rango >= min_rango_g` | 4.0 g | Eliminar ruido estático del sensor |

**Resultado final:** 916 candidatos (actualizado 2026-08-16, ver nota de "mixto" más abajo).

### Paso 7 — Cálculo de metadata y shape features v2

Para cada segmento que pasa el filtro se calculan:

> Desde 2026-06-26, `01_genera_candidatos.py` usa `shape_features_v2.extraer_features()` en lugar de la función local `_shape_features()`. Si `shape_features_v2.py` no está disponible, hay un fallback automático a las 5 features F00 clásicas.

**Métricas clásicas:**

| Campo | Fórmula | Descripción |
|---|---|---|
| `duracion_min` | `(t_fin - t_inicio) / 60` | Duración en minutos |
| `delta_w_total` | `peso[-1] - peso[0]` | Variación neta de peso |
| `peso_inicio_g` | `peso[0]` | Peso al inicio |
| `peso_fin_g` | `peso[-1]` | Peso al final |
| `peso_max_g` | `max(peso)` | Máximo en el segmento |
| `peso_min_g` | `min(peso)` | Mínimo en el segmento |
| `rango_g` | `max - min` | Rango total |
| `n_lecturas` | `len(sub)` | Número de lecturas válidas |
| `direction` | `"bajada"/"subida"/"mixto"` | Dirección del movimiento neto |

**Direction se asigna según delta_w_total:**

```python
if delta > 3:   direction = "subida"
elif delta < -3: direction = "bajada"
else:            direction = "mixto"
```

**Shape features:** ver [[04_SHAPE_FEATURES]] para el detalle completo.

---

## Distribución de los 916 candidatos

*(Recalculado 2026-08-16)*

| Direction | Cantidad | Porcentaje |
|---|---|---|
| bajada | 515 | 56% |
| subida | 383 | 42% |
| mixto | 18 | 2% |
| **Total** | **916** | **100%** |

**Estadísticas globales:**
- Duración media: 8.7 min
- Δpeso medio: +1.0 g (balanceado, ya que mezcla bajadas y subidas)
- Rango medio: 27.8 g

> **Cambio importante respecto al snapshot anterior (n=417, mixto=23%):** "mixto"
> bajó a solo 2% del total. Esto coincide exactamente con lo que
> [[av2_07_RESULTADOS_Y_BENCHMARKS]] snapshot v2.4 (2026-08-11) describía como
> **pendiente de aplicar**: partir candidatos "mixto" por su punto de giro interno
> (`punto_split_mixto()` en `01_genera_candidatos.py`), que en el dry-run daba
> "mixto bajaría de ~23% a ~1.7%" — número casi idéntico al 2% actual. Todo indica
> que ese cambio se aplicó entre el 2026-08-11 y hoy, pero **no hay un snapshot que
> lo documente explícitamente como aplicado** — no se pudo confirmar leyendo el
> historial. Si alguien sabe cuándo se corrió, vale la pena agregar la entrada
> correspondiente a `av2_07_RESULTADOS_Y_BENCHMARKS.md`.

---

## `id_candidato` — hash de contenido, no posicional

> Cambio 2026-08-16 tras incidente de corrupción (ver
> `Knowledge/29_Specs/SPEC_13_Reorganizacion_09_Investigacion.md` §19). Antes
> era `range(len(df))`: se reasignaba entero en cada corrida, así que una
> anotación guardada contra "candidato #37" podía apuntar a un segmento
> distinto en la siguiente regeneración. Ahora es
> `sha256(f"{device_code}|{t_inicio}|{t_fin}")[:12]` — determinístico, mismos
> datos + mismos umbrales dan siempre el mismo ID. `id_candidato` de
> anotaciones guardadas **antes** de este cambio sigue siendo el esquema
> posicional viejo y no calza con IDs nuevos: para trabajo histórico, unir
> siempre por `(t_inicio, t_fin)`, nunca por `id_candidato`.

`candidatos_av2.csv` **nunca se sobreescribe in-place**: cada corrida escribe
a `candidatos_av2.staging.csv`, corre `validar_regeneracion_candidatos.py`
(compara anotaciones existentes contra los candidatos nuevos por solape de
intervalo — no por timestamp exacto, porque el operador ajusta manualmente
los límites al guardar), y solo si el solape es ≥90% (o con `--force`)
respalda el canónico anterior a `data/backups/` y promueve. Cada promoción
queda logueada en `data/CHANGELOG_candidatos.md`.

---

## Columnas del CSV resultante

`candidatos_av2.csv` contiene **~115 columnas** cuando se usa el motor v2:

```
# Metadata (14 cols)
id_candidato, t_inicio, t_fin, duracion_min, delta_w_total,
peso_inicio_g, peso_fin_g, peso_max_g, peso_min_g, rango_g,
n_lecturas, direction, hora_inicio_stgo, fecha_inicio_stgo,
etiqueta_audit_ref

# Features v2 (~100 cols) — desde shape_features_v2.extraer_features()
# F00: sim_alimentacion, sim_servido, monotonicity, r2_lineal, zcr
# F01: d1_mean, d1_std, d1_max, d1_min, d1_rms, d1_frac_neg, ...
# F02-F14: curvatura, arco, tortuosidad, energía, entropías,
#          fractal, Lempel-Ziv, frecuencial, robusta, topología,
#          12 templates canónicos, dinámica temporal, compuestos
```

Ver [[av2_04_MOTOR_MATEMATICO]] para la lista completa de features y familias.
Ver [[av2_04_MOTOR_MATEMATICO]] para el detalle de las 5 features F00 clásicas.

---

## Cómo ejecutar

```bash
cd "Investigacion/Ciclo_Alpha_v2/fase_0_ruido"
python 01_genera_candidatos.py
# Si el gate de validación no pasa (≥90% de anotaciones deben seguir
# solapando algún candidato nuevo) y el cambio de detector es intencional:
python 01_genera_candidatos.py --force
# Umbral del gate configurable:
python 01_genera_candidatos.py --umbral 0.85
```

Salida esperada:
```
=== 01_genera_candidatos.py — Alpha v2 ===
Umbrales: std>1.5g | Δ>5.0g | rango_min>4.0g | min_dur=45s | merge_gap=120s
...
916 candidatos tras filtrar
Staging guardado: candidatos_av2.staging.csv
Validando contra anotaciones ya guardadas...
  tasa_match: 1.0
Respaldo del canónico anterior: backups\candidatos_av2_backup_20260816_233940.csv
Promovido: candidatos_av2.csv (916 candidatos)
```

---

## Ver también

- [[04_SHAPE_FEATURES]] — Features matemáticas calculadas por candidato
- [[av2_05_ANOTACION_Y_CATEGORIAS]] — Siguiente paso: anotar estos candidatos
- [[av2_06_UMBRALES_Y_REGLAS]] — Parámetros de detección en `umbrales.json`
- [[av2_02_DISPOSITIVO_Y_DATOS]] — Fuente de datos de entrada
