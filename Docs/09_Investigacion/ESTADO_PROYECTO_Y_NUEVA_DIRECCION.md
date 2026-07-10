# Estado del Proyecto ML Kittypau — Nueva Dirección

**Fecha:** 2026-06-23  
**Dispositivo:** KPCL0034 (Bandida)  
**Autor:** Mauro Curcuma

---

## 1. Qué hicimos y por qué esto importa

Kittypau es un sistema IoT que monitorea el plato de comida de Bandida (una gata)
con una celda de carga. El plato registra el peso en gramos cada ~15 segundos.
El objetivo científico es detectar automáticamente dos tipos de eventos:

- **Alimentación:** Bandida come. El peso baja gradualmente, luego se estabiliza.
- **Servido:** Un humano agrega comida al plato. El peso sube bruscamente, luego estabiliza.

Entre eventos, el sensor fluctúa ±1-3g por ruido eléctrico. Distinguir esta fluctuación
del movimiento real es parte del problema.

Para resolverlo, exploramos tres ciclos de Machine Learning entre Abril y Junio 2026.

---

## 2. Los tres ciclos explorados

### Ciclo Alpha (Abril–Junio 2026) — supervisado LightGBM

El primer ciclo. 10 experimentos iterativos con LightGBM.

**Mejor resultado (Exp 06):**
- F1-activo = 0.7619 (detectar si hay movimiento vs reposo)
- F1-alimentacion = 0.7606
- F1-servido = 0.1395 (casi sin capacidad de detectar servidos)

**El problema real de Alpha no fue técnico — fue de datos.**
Alpha empezó con solo 14–27 sesiones de servido etiquetadas. Eso es insuficiente
para entrenar cualquier modelo de clasificación. La decisión correcta habría sido
pausar y resolver el problema de datos primero. En cambio, el ciclo siguió agregando
10 experimentos sobre la misma base rota. El F1-servido en 0.14 era una señal grave
que se aplazó en lugar de resolverse.

**Limitación arquitectural identificada al final:** el modelo clasifica cada lectura
individual en `alimentacion / servido / reposo`. Pero el sensor tiene ruido ±1-3g,
y un punto aislado no tiene suficiente información para saber si es el inicio de un
evento real o simplemente ruido. La arquitectura per-reading es el problema de fondo.

### Ciclo Gamma (Junio 2026) — supervisado multi-modelo

Segunda generación. Corrigió 8 errores de Alpha (timezone, UUID doble del dispositivo,
augmentación de datos servido, resampleo a 30s, etc.) y probó múltiples familias de
modelos (LightGBM, RandomForest, ExtraTrees, NN).

**Mejor resultado (G-01 LightGBM):**
- F1-activo = 0.8139
- F1-alimentacion = 0.7598  
- F1-servido = 0.2656 (mejoró pero sigue siendo bajo)

**Limitación confirmada:** Con más datos y mejores correcciones, F1-servido apenas
subió de 0.14 a 0.27. Ningún modelo lo resolvió: ni LightGBM, ni Random Forest,
ni ExtraTrees. G-06 (redes neuronales) quedó bloqueado porque se necesitaban 80
sesiones reales de servido para entrenar, y solo había 63 reales + 17 sintéticas.

La razón no es solo falta de datos (aunque ayudaría tener más), sino que clasificar
puntos individuales no puede capturar la forma de la curva completa. Un evento servido
tiene una FORMA — ascenso rápido en segundos — que un clasificador per-reading no
puede ver porque solo mira cada punto en el tiempo.

### Ciclo Delta (Junio 2026) — no supervisado (clustering + anomalías)

Exploración no supervisada con K-Means, DBSCAN, HDBSCAN, GMM, Isolation Forest y LOF.
Sin etiquetas para entrenar — buscaba estructura natural en los datos.

**Resultado aparentemente impresionante:**
- K-Means k=2: Silhouette = 0.8165

**Por qué ese resultado es engañoso:**
K-Means con k=2 sobre features que incluyen `delta_w` simplemente está separando
"lecturas donde el peso subió" de "lecturas donde el peso bajó o se mantuvo".
Eso es detectar el **signo de la primera derivada** — casi trivial con una sola
feature. El Silhouette Score mide separación geométrica interna, no utilidad real.
Por eso es tan alto: los dos grupos son geométricamente compactos, pero no reflejan
los eventos que nos importan.

La prueba real es el ARI (Adjusted Rand Index) contra etiquetas humanas conocidas:
**ARI = 0.1594**. Un ARI de 0.16 significa que los clusters y los eventos reales
casi no coinciden. Solo el 3% de las lecturas se cruzó con el ground truth de Gamma.

**Resultado concreto de Delta:** 676 anomalías detectadas (útiles para detectar
problemas de hardware) y 2 candidatos nuevos de sesiones servido (de una meta de 10).

---

## 3. El problema fundamental identificado

**Los 3 ciclos comparten el mismo error de formulación:**
clasifican lecturas individuales en lugar de detectar eventos completos.

Un evento no es un punto — es una **curva con forma temporal**:

```
Servido:
peso │          ████████ (plateau alto)
     │       ███ (ascenso rápido)
     │  ─────ˈ (baseline antes)
     └────────────────────── tiempo (segundos)

Alimentacion:
peso │  ─────ˈ (plateau alto inicial)
     │       ████ (descenso gradual)
     │           ████████ (nuevo plateau bajo)
     └────────────────────── tiempo (segundos)

Ruido:
peso │  ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈ (fluctuación ±1-3g sin forma)
     └────────────────────── tiempo (segundos)
```

Clasificar cada punto individualmente es como intentar identificar una canción
escuchando una sola nota por vez, sin saber qué notas vienen antes o después.

**La diferencia clave entre ruido y evento es la sostenibilidad de la dirección.**
El ruido del sensor fluctúa ±1–3g sin dirección: sube, baja, sin patrón. Un evento
tiene dirección sostenida: el peso baja consistentemente durante 2–10 minutos
(alimentacion) o sube en 20–60 segundos (servido). Un modelo que solo mira
`delta_w` de una lectura no puede distinguir ambos, porque la magnitud puntual
puede ser igual. Lo que los distingue es la secuencia completa.

Lo correcto es:
1. **Modelar el ruido** — caracterizar estadísticamente el baseline del sensor en reposo
2. **Segmentar** el stream detectando donde la señal diverge del modelo de ruido (change-point)
3. **Describir la forma** del segmento completo (duración, pendiente, área, cambio total)
4. **Clasificar el segmento** como alimentacion / servido / ruido

---

## 4. Por qué se archivaron Gamma y Delta

Gamma y Delta no fueron un fracaso — fueron exploración necesaria que confirmó
el diagnóstico. Sin pasar por esos ciclos no habríamos podido articular con
certeza por qué el enfoque per-reading tiene un techo.

**El costo de no cambiar el enfoque sería alto.** Gamma quedó bloqueado en dos
frentes: G-04 sin Optuna instalado, y G-06 sin las 80 sesiones reales de servido.
Delta "completó" pero aportó solo 2 candidatos nuevos de servido (de una meta de 10).
Si se continuara en esta dirección sin cambiar la formulación, un hipotético Ciclo
Epsilon tendría los mismos resultados: el problema no es la implementación, es el
enfoque. Ningún modelo per-reading puede aprender la forma de una curva.

**Lo que aprendimos en Gamma y Delta es valioso:**
- Las 13 features de Gamma son correctas como descripción local de cada punto
- La app de anotación (`app_anotacion_gamma.py`) es el workflow correcto para etiquetar
- Las constantes del pipeline (GAP_CUTOFF_S=300, PLATEAU_THRESHOLD=1.5, RESAMPLE=30s) son correctas
- El ground truth correcto es `public.audit_events` con `event_type = 'manual_bowl_category'`
- El ARI es la métrica correcta para validar clusters no supervisados, no el Silhouette aislado
- 71% de las lecturas tienen `clock_invalid=True` → siempre usar `ingested_at`

Todo ese conocimiento está documentado en:
[`Ciclo Alpha/Exploracion_Gamma_Delta_2026/APRENDIZAJES_GAMMA_DELTA.md`](Ciclo%20Alpha/Exploracion_Gamma_Delta_2026/APRENDIZAJES_GAMMA_DELTA.md)

Los archivos completos de Gamma y Delta (scripts, datos, modelos, reportes) están en:
[`Ciclo Alpha/Exploracion_Gamma_Delta_2026/`](Ciclo%20Alpha/Exploracion_Gamma_Delta_2026/)

---

## 5. La nueva dirección — Ciclo Alpha v2

### Objetivo

Detectar eventos completos (segmentos temporales) con su forma, no clasificar
lecturas individuales.

### Enfoque

**Paso 1 — Modelo de ruido del sensor.** Antes de detectar eventos, hay que saber
qué es "nada". Usando todas las lecturas etiquetadas como reposo, caracterizar
estadísticamente la distribución del ruido del sensor KPCL0034 en reposo:
media, std, autocorrelación, percentil 95 de `|delta_w|`. Este modelo define el
umbral que separa "fluctuación normal" de "movimiento real". Sin esto, cualquier
segmentador va a sobre-segmentar.

**Paso 2 — Segmentación:** Detectar dónde la señal de peso diverge del modelo de
ruido de manera estadísticamente significativa. El segmentador no clasifica — solo
detecta los bordes del evento (inicio y fin). Herramientas candidatas:
- PELT (Pruned Exact Linear Time) para segmentación offline sobre datos históricos
- BOCPD (Bayesian Online Change Point Detection) para detección en tiempo real

**Paso 3 — Features de segmento:** Para cada segmento detectado, calcular features
que describen su FORMA completa:

| Feature | Descripción |
|---------|-------------|
| `duracion_s` | Duración del segmento en segundos |
| `delta_peso_total` | Cambio total de peso (inicio → fin) |
| `pendiente_ascenso` | Velocidad de subida (g/s) en la fase activa |
| `pendiente_descenso` | Velocidad de bajada (g/s) |
| `peso_inicial` | Peso al inicio del segmento |
| `peso_final` | Peso al final del segmento |
| `area_bajo_curva` | Integral del cambio de peso en el tiempo |
| `tiempo_hasta_pico` | Segundos desde inicio hasta máximo local |
| `variabilidad_plateau` | std del peso en la fase estable post-evento |
| `hora_inicio_sin` / `cos` | Componente cíclica del horario |

**Paso 4 — Clasificación de segmentos:** Un modelo LightGBM (o reglas heurísticas
primero, ML después) que toma el vector de features del segmento completo y lo
clasifica como:
- `alimentacion` (descenso gradual, duración 2–10 min, pérdida de >5g total)
- `servido` (ascenso rápido, duración 20–60s, ganancia de >5g total)
- `ruido` (sin dirección sostenida, cambio total ≤3g, fluctuación aleatoria)

Este clasificador va a resolver el problema de servido que tres ciclos no pudieron
resolver, porque trabaja sobre la curva completa y no sobre cada punto individual.
Con `delta_peso_total` positivo = servido, negativo = alimento, la separación es
casi perfecta incluso con reglas simples.

### Assets disponibles para Alpha v2

| Asset | Estado | Dónde está |
|-------|--------|-----------|
| 264 sesiones alimentacion etiquetadas | ✅ Disponible | `public.audit_events` (Supabase) |
| 80 sesiones servido (63 reales + 17 sintéticas) | ✅ Disponible | `public.audit_events` |
| 134,164 lecturas KPCL0034 (Abril-Junio 2026) | ✅ Disponible | `readings_delta.parquet` |
| `app_anotacion_gamma.py` (herramienta de anotación) | ✅ Disponible | `Exploracion_Gamma_Delta_2026/Ciclo Gamma/` |
| Pipeline de extracción Supabase (Fase 1 Alpha) | ✅ Disponible | `Ciclo Alpha/fase_1_extraccion/` |
| 676 anomalías H/C/U detectadas por Delta | ✅ Referencia | `Exploracion_Gamma_Delta_2026/Ciclo Delta/fase_3_anomalias/` |

### Lo que Alpha v2 NO debe repetir

1. No clasificar lecturas individuales como el objetivo primario
2. No usar Silhouette Score como validación sin ARI contra ground truth
3. No asumir que más modelos (RF, ExtraTrees, NN) resuelven un problema de formulación
4. No augmentar servido sintéticamente hasta tener ≥ 200 sesiones reales
5. No olvidar resamplear a 30s antes de cualquier feature

---

## 6. Datos actuales disponibles para Alpha v2

### Ground truth en Supabase (`public.audit_events`)

| Categoría | N sesiones |
|-----------|-----------|
| `alimentacion` | 264 |
| `servido` | ~63 reales (+ 17 sintéticas) |
| `reposo` | 296 identificados en Pre-G |

### Dataset de lecturas

- **KPCL0034 Abril–Junio 2026:** 134,164 lecturas (resampleadas a 30s)
- **clock_invalid:** 71.17% → usar `ingested_at`
- **Rango temporal:** 2026-04-08 → 2026-06-14
- **UUIDs de KPCL0034:** `9510a455` (Abril) y `3a460074` (Mayo-Junio)

---

---

## 7. Lo que Alpha v2 NO debe repetir

| Error | Consecuencia observada |
|-------|----------------------|
| Clasificar lecturas individuales como objetivo primario | F1-servido techo en 0.27 |
| Seguir experimentando sin resolver el problema de datos primero | 10 experimentos Alpha sobre base rota |
| Usar Silhouette Score sin ARI contra ground truth | Delta "completó" con resultado engañoso |
| Asumir que más modelos resuelven un problema de formulación | G-01 a G-05 con el mismo techo |
| Augmentar servido sintéticamente en lugar de anotar más sesiones reales | 17 sintéticas que inflan artificialmente N |
| Olvidar resamplear a 30s antes de cualquier feature | Distribution shift documentado en Pre-G |
| No modelar el ruido del sensor antes de segmentar | Sobre-segmentación garantizada |

---

## 8. Preguntas abiertas antes de iniciar Alpha v2

1. **¿Cuántas sesiones de servido reales hay hoy en `audit_events`?**
   Último dato conocido: 63 reales. ¿Subió con nuevas anotaciones desde Junio 14?

2. **¿Cuántos días de datos crudos no anotados hay disponibles?**
   El dataset cubre hasta 2026-06-14. ¿Hay lecturas más recientes sin etiquetar?

3. **¿La `app_anotacion_gamma.py` funciona para anotar servidos nuevos?**
   Está disponible en `Exploracion_Gamma_Delta_2026/Ciclo Gamma/`. Probarla antes
   de iniciar Alpha v2 para tener al menos 100 sesiones de servido reales.

4. **¿El cambio-punto debe ser online (BOCPD) u offline (PELT)?**
   Para Alpha v2 como investigación, offline (PELT) es suficiente y más simple.
   Online solo es necesario para producción.

---

*Para detalles técnicos completos de lo explorado en Gamma y Delta, ver:*  
*[`Ciclo Alpha/Exploracion_Gamma_Delta_2026/APRENDIZAJES_GAMMA_DELTA.md`](Ciclo%20Alpha/Exploracion_Gamma_Delta_2026/APRENDIZAJES_GAMMA_DELTA.md)*
