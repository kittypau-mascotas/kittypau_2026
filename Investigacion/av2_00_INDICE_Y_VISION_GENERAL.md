# Ciclo Alpha v2 — Índice y Visión General

> Fusión del índice de comida, índice de agua, README de fases/constantes y tracker de experimentos.


---


<!-- ==== fusionado desde av2_00_INDICE_Y_VISION_GENERAL.md ==== -->

---
tags: [kittypau, ciclo-alpha-v2, moc, indice]
fecha_creacion: 2026-06-26
fecha_actualizacion: 2026-08-16
estado: activo
---

# Ciclo Alpha v2 — Índice General (MOC)

> **Mapa de Contenido** del Ciclo de Investigación Alpha versión 2.
> Toda la documentación técnica de detección de eventos del comedero inteligente KPCL0034.

---

> [!success] MOTOR MATEMÁTICO v2 IMPLEMENTADO — 2026-06-26
> `shape_features_v2.py` implementa **102 features en 15 familias** + **Evidence Engine** + **Clasificador determinístico v1.3**.
> `app_anotacion_av2.py` actualizado con **Tab 5 — Motor Matemático**: cuadro comparativo empírico (814 anot., actualizado 2026-08-16), radar, templates, dinámica temporal, Feature Registry.
> Ver [[av2_04_MOTOR_MATEMATICO]] para el detalle completo y [[av2_07_RESULTADOS_Y_BENCHMARKS]] snapshot v2.5 para el último refresh de datos.

## ¿Qué es el Ciclo Alpha v2?

El **Ciclo Alpha v2** es el sistema de detección y clasificación de eventos de comportamiento del comedero inteligente de Bandida (KPCL0034). A diferencia del [[Ciclo Alpha]] anterior (que usaba LightGBM con features manuales), esta versión:

- Usa **solo matemática** — sin ML supervisado
- Opera sobre **candidatos detectados automáticamente** del stream de peso
- Clasifica mediante **102 features de forma de curva** (15 familias: derivadas, curvatura, entropías, fractales, templates canónicos, dinámica temporal, etc.)
- Se alimenta de **814 anotaciones manuales** (alim=356, ruido=374, serv=84) para calibrar estadísticas y umbrales

**Estado actual:** Fase 0 completada — detección + **814 anotaciones** + Motor Matemático v2. Fase 1 (clasificador automático) pendiente. `umbrales.json` (v1.3) sigue calibrado contra n=496 (2026-08-11) — pendiente recalibrar contra las 814 actuales, ver [[av2_06_UMBRALES_Y_REGLAS]].

---

## Documentos del Ciclo Alpha v2

### Fundamentos
- [[av2_01_ARQUITECTURA_Y_PIPELINE]] — Visión general del pipeline, fases y flujo de datos
- [[av2_02_DISPOSITIVO_Y_DATOS]] — KPCL0034, UUIDs, fuentes de datos, período cubierto

### Fase 0 — Detección y Anotación
- [[av2_03_DETECCION_SEGMENTOS]] — Cómo `01_genera_candidatos.py` detecta segmentos (ahora con features v2)
- [[av2_04_MOTOR_MATEMATICO]] — Features clásicas F00: monotonía, R², ZCR, similitud coseno
- [[av2_04_MOTOR_MATEMATICO]] — Motor v2: 105 features en 15 familias + Evidence Engine ✅ Implementado
- [[av2_05_ANOTACION_Y_CATEGORIAS]] — Workflow de anotación manual y categorías
- [[av2_08_APP_ANOTACION]] — La app Streamlit de anotación (7 pestañas)

### Clasificación y Resultados
- [[av2_06_UMBRALES_Y_REGLAS]] — `umbrales.json` v1.3 (desactualizado, ver nota arriba), reglas del detector
- [[av2_07_RESULTADOS_Y_BENCHMARKS]] — Estadísticas completas de las 814 anotaciones

### Documentos previos relacionados
- [[02_REGLAS_EVENTOS_ALIMENTACION]] — Reglas canónicas de eventos (fuente de verdad)
- [[05_ANALISIS_COLAB_KPCL0034_07052026]] — Análisis exploratorio previo en Colab

---

## Estado por fase

| Fase | Descripción | Estado | Artefacto |
|---|---|---|---|
| **0 — Detección** | Segmentar señal de peso en candidatos | ✅ Completo | `candidatos_av2.csv` (916 cands.) |
| **0 — Anotación** | Clasificar candidatos manualmente | ✅ Completo | `anotaciones_av2.csv` (814 anots.) |
| **0 — Shape features F00** | Calcular monotonía, R², ZCR, coseno | ✅ Completo | Columnas en `candidatos_av2.csv` |
| **0 — Motor Matemático v2** | 102 features en 15 familias + Evidence Engine | ✅ Implementado | `shape_features_v2.py` |
| **0 — Estadísticas empíricas** | µ±σ por feature y categoría (814 anots.) | ✅ Completo (2026-08-16) | `features_anotaciones_v2.csv`, `comp_stats_v2.json` |
| **0 — Umbrales** | Derivar reglas desde anotaciones | ⚠️ v1.3, desactualizado (calibrado contra n=496) | `umbrales.json` |
| **1 — Clasificador** | Implementar detector automático | ⏳ Pendiente | `fase_1_extraccion/` |
| **2 — Validación** | Evaluar detector vs. anotaciones | ⏳ Pendiente | — |
| **3 — Integración** | Conectar detector al bridge/app | ⏳ Pendiente | — |

---

## Metas de anotación

| Categoría | Meta | Actual (2026-08-16) | Estado |
|---|---|---|---|
| alimentacion | 40 | 356 | ✅ 890% |
| ruido | 30 | 374 | ✅ 1247% |
| servido | 20 | 84 | ✅ 420% |
| **Total** | **90** | **814** | ✅ **904%** |

---

## Archivos del proyecto

```
fase_0_ruido/
├── 01_genera_candidatos.py       ← Detecta segmentos + calcula 102 features v2
├── app_anotacion_av2.py          ← App Streamlit de anotación (8 tabs)
├── shape_features_v2.py          ← Motor Matemático v2: 102 features + Evidence Engine
├── revisar_anotaciones_v2.py     ← Calcula features v2 para todas las anotaciones
├── requirements_check.py         ← Verificación del entorno
├── config/
│   └── umbrales.json             ← Umbrales v1.3 (reglas del detector, desactualizado)
└── data/
    ├── candidatos_av2.csv        ← 916 candidatos con shape features
    ├── anotaciones_av2.csv       ← 814 anotaciones manuales (completo, 2026-08-16)
    ├── features_anotaciones_v2.csv  ← 814 filas × 109 cols (features v2 por evento)
    └── comp_stats_v2.json        ← µ±σ por feature y categoría (814 anots.)
```

---

## Decisiones clave tomadas

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-06 | No usar ML en esta fase | Insuficientes datos etiquetados; reglas matemáticas son interpretables |
| 2026-06 | Usar similitud coseno como discriminador primario | Mejor separación entre categorías que delta/pendiente |
| 2026-06 | Umbral coseno en 0.70 | Cubre 90%+ de casos reales (p10 de cada categoría supera 0.80) |
| 2026-06 | Detectar de más y filtrar manualmente | Filosofía de la app: falso positivo es mejor que falso negativo |

---

## Referencias rápidas

- **Dispositivo:** KPCL0034 "Bandida" — comedero inteligente food_bowl
- **UUIDs activos:** `9510a455-...` (Abr 2026) · `3a460074-...` (May-Jun 2026)
- **Período de datos:** 2026-04-07 → 2026-07-22 (candidatos) · anotaciones creadas hasta 2026-08-13
- **Lecturas totales:** 322.820 de KPCL0034 (actualizado 2026-08-16)
- **Resampleo:** 30 segundos con forward-fill (máx. 2 slots)
- **Zona horaria display:** America/Santiago (UTC−3/−4)


---


<!-- ==== fusionado desde av2_00_INDICE_Y_VISION_GENERAL.md ==== -->

---
tags: [kittypau, ciclo-alpha-v2, moc, indice, hidratacion, agua]
fecha_creacion: 2026-08-13
fecha_actualizacion: 2026-08-13
estado: activo
---

# Ciclo Alpha v2 — Hidratación (Índice)

> Réplica de la línea de investigación de comida ([[av2_00_INDICE_Y_VISION_GENERAL]]) para el bebedero
> inteligente **KPCL0036**. Fuente de verdad del diseño y las decisiones:
> [[29_Specs/SPEC_07_Investigacion_Hidratacion]] — este documento es solo el mapa de
> artefactos generados, no duplica ese contenido.

---

## Qué es distinto de comida

- **Dispositivo:** KPCL0036 (bebedero), no KPCL0034 (comedero). UUID `3c1c6705-636d-4770-bdcf-21aa6f7225a5`.
- **Datos:** carpeta propia `fase_0_ruido/data_agua/`, separada 100% de `fase_0_ruido/data/` (comida). Nunca se mezclan.
- **Categorías de anotación:** `hidratacion` / `servido` / `ruido` (+ artefacto `ciclos_servido_hidratacion.csv`) — mismo esquema que comida, nombres propios.
- **Código:** el mismo `app_anotacion_av2.py` / `01_genera_candidatos.py` / `revisar_anotaciones_v2.py` de comida, parametrizados por `DEVICE_PROFILES` (ver SPEC_07 §5). No hay app duplicada.
- **Física del sensor:** dinámica de peso distinta (evaporación, lametones vs. mordidas, sin doble rampa) — ver SPEC_07 §3 para la transferibilidad del Motor Matemático v2 (clasificación 🟢🟡🔴 por familia de features).

## Estado del roadmap (ver SPEC_07 §7 para el detalle completo)

| Paso | Descripción | Estado |
|---|---|---|
| 1 | Investigación + identidad de KPCL0036 confirmada | ✅ Hecho 2026-08-13 |
| 2 | Parametrizar los 3 scripts vía `DEVICE_PROFILES` (perfil único KPCL0034, cero cambio de comportamiento) | ✅ Hecho 2026-08-13 |
| 3 | Agregar perfil KPCL0036: generar `candidatos_agua.csv` real, dejar `app_anotacion_av2.py` con el perfil agua **inerte** (no seleccionable — bloqueado por la indirección de nombres de `CATEGORIAS`, ver SPEC_07 §5.1) | 🚧 En curso 2026-08-13 |
| 4+ | Resolver indirección de `CATEGORIAS`, activar selector de perfil en la UI, anotar a mano, calibrar `umbrales_agua.json` | ⏳ Pendiente |

## Artefactos generados hasta ahora

| Archivo | Ruta | Generado por | Contenido |
|---|---|---|---|
| `candidatos_agua.csv` | `fase_0_ruido/data_agua/` | `01_genera_candidatos.py` (`KITTYPAU_DEVICE_PROFILE=KPCL0036`) | 393 candidatos (223 bajada, 159 subida, 11 mixto) |
| `umbrales_agua.json` | `fase_0_ruido/config/` | Placeholder manual | Sin calibrar — copia de `umbrales.json` (comida) como punto de partida |
| `anotaciones_agua.csv` | `fase_0_ruido/data_agua/` | App — save/delete | Aún no existe (pendiente anotación manual) |
| `features_anotaciones_agua.csv`, `comp_stats_agua.json` | `fase_0_ruido/data_agua/` | `revisar_anotaciones_v2.py` (perfil agua) | Aún no generados — requieren anotaciones primero |

---

## Ver también

- [[29_Specs/SPEC_07_Investigacion_Hidratacion]] — spec completo: hallazgos, arquitectura, roadmap
- [[av2_00_INDICE_Y_VISION_GENERAL]] — línea de investigación de comida (KPCL0034), no mezclar datos
- [[09_Sensores/README_Sensores]] — identidad de dispositivos
- [[10_Datasets/README_Datasets]] — datasets de comida + nota de resolución KPCL0036


---


<!-- ==== fusionado desde av2_00_INDICE_Y_VISION_GENERAL.md ==== -->

---
area: Data Science
estado: activo
ciclo: Alpha v2
actualizado: 2026-06-25
---

# Ciclo Alpha v2 — Detección por Segmentos

> **Enfoque:** Change-point detection sobre la serie temporal de peso.  
> En lugar de clasificar lecturas individuales, se detectan los **bordes del evento**
> y se clasifica la **forma completa del segmento**.

Motivación: los 3 ciclos anteriores (Alpha, Gamma, Delta) confirmaron que el
F1-servido tiene un techo de 0.27 con arquitecturas per-reading. La forma
de la curva no es recuperable desde una sola lectura. Ver diagnóstico completo:
[`../ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md`](../ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md)

---

## Estructura — 7 fases

```
Ciclo_Alpha_v2/
├── README.md                  ← este archivo
├── experiments/
│   └── README.md              ← tracker de experimentos v2
├── fase_0_ruido/              ← PRIMERA — modelo estadístico del sensor en reposo
├── fase_1_extraccion/         ← datos raw desde Supabase (hereda de Ciclo Alpha)
├── fase_2_segmentacion/       ← PELT offline / BOCPD online
├── fase_3_features/           ← features de segmento completo
├── fase_4_dataset/            ← dataset de segmentos etiquetados
├── fase_5_modelos/            ← LightGBM sobre vectores de segmento
└── fase_6_evaluacion/         ← evaluación formal sobre test set reservado
```

---

## Secuencia de ejecución

### Fase 0 — Modelo de ruido (`fase_0_ruido/`)

Caracterizar estadísticamente el sensor KPCL0034 en reposo.
Usar lecturas etiquetadas como `reposo` de Ciclo Alpha.

Outputs:
- `media`, `std`, `autocorrelacion_lag1` del delta de peso en reposo
- `p95_abs_delta_w` — umbral que separa "fluctuación normal" de "movimiento real"
- `noise_model.json` — parámetros del modelo de ruido

> Sin este paso, cualquier segmentador va a sobre-segmentar el ruido del sensor.

---

### Fase 1 — Extracción (`fase_1_extraccion/`)

Reutiliza el pipeline de `Ciclo_Alpha_v1/fase_1_extraccion/` para descargar:
- `readings_raw.parquet` — lecturas KPCL0034 (usar `ingested_at`, clock_invalid=71%)
- `sessions_labeled.parquet` — sesiones del ground truth (`public.audit_events`)

Fuentes disponibles:
- **264 sesiones alimentacion** etiquetadas en `public.audit_events`
- **~63 sesiones servido reales** (+ 17 sintéticas — NO usar sintéticas para train)
- **134,164 lecturas** KPCL0034 Abril–Junio 2026 en `readings_delta.parquet`
  (en `Ciclo_Alpha_v1/Exploracion_Gamma_Delta_2026/Ciclo_Delta/fase_1_datos/data/processed/`)

---

### Fase 2 — Segmentación (`fase_2_segmentacion/`)

Detectar dónde la señal diverge del modelo de ruido (de Fase 0).

Herramientas candidatas:
- **PELT** (Pruned Exact Linear Time) — segmentación offline, más simple
- **BOCPD** (Bayesian Online Change Point Detection) — para producción futura

El segmentador **no clasifica** — solo devuelve inicio y fin de cada segmento.

Output: `segments.parquet` — tabla con `t_inicio`, `t_fin`, `n_lecturas` por segmento.

---

### Fase 3 — Features de segmento (`fase_3_features/`)

Para cada segmento de Fase 2, calcular features que describen su **forma completa**:

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
| `hora_inicio_sin` | `sin(hora_local * 2π/24)` — componente cíclica |
| `hora_inicio_cos` | `cos(hora_local * 2π/24)` — componente cíclica |

Output: `segments_features.parquet`

---

### Fase 4 — Dataset (`fase_4_dataset/`)

Etiquetar cada segmento cruzando con `public.audit_events` (ground truth).

Regla de asignación:
- Si el segmento solapa ≥ X% con una sesión `alimentacion` → etiqueta `alimentacion`
- Si el segmento solapa ≥ X% con una sesión `servido` → etiqueta `servido`
- Si no solapa con ningún evento real → etiqueta `ruido`

Split: cronológico 70/15/15 (igual que Ciclo Alpha).

**IMPORTANTE:** No usar sintéticas de servido para train. Solo sesiones reales.

Output: `X_train.parquet`, `X_val.parquet`, `X_test.parquet` (y sus `y_*`)

---

### Fase 5 — Modelos (`fase_5_modelos/`)

LightGBM multiclase sobre vectores de segmento (no per-reading).

Clases objetivo:
- `alimentacion` — descenso gradual, duración 2–10 min, delta < -5g
- `servido` — ascenso rápido, duración 20–60s, delta > +5g
- `ruido` — sin dirección sostenida, |delta_total| ≤ 3g

Heurística baseline (antes del modelo):
- `delta_peso_total > +5g` → servido (casi trivial con esta feature)
- `delta_peso_total < -5g AND duracion_s > 120` → alimentacion

El modelo ML debe superar esta heurística para justificar su complejidad.

---

### Fase 6 — Evaluación (`fase_6_evaluacion/`)

Evaluación formal sobre `X_test` reservado.

Métricas objetivo:
- F1-alimentacion ≥ 0.85
- F1-servido ≥ 0.60 (objetivo principal — Alpha no pudo superar 0.27)
- ARI contra ground truth humano ≥ 0.50

---

## Constantes validadas del pipeline (heredadas de Gamma)

```python
GAP_CUTOFF_S        = 300     # 5 min → separa sesiones independientes
PLATEAU_THRESHOLD   = 1.5     # rolling_std_5 < 1.5g → lectura estable
RESAMPLE_TARGET_S   = 30      # SIEMPRE resamplear ANTES de calcular features
TIMEZONE_NEGOCIO    = "America/Santiago"  # NUNCA UTC para features de hora

KPCL0034_UUIDS = [
    "9510a455-b0e9-4932-8be1-03976d31228a",  # Abril 2026
    "3a460074-e7c3-41bf-ae5a-a011445f927a",  # Mayo–Junio 2026
]
```

> Cambiar estas constantes = nuevo experimento explícito. No modificar ad-hoc.

---

## Lo que este ciclo NO debe repetir

| Error | Consecuencia en ciclos anteriores |
|-------|-----------------------------------|
| Clasificar lecturas individuales como objetivo | F1-servido techo en 0.27 (Alpha, Gamma) |
| Usar Silhouette sin ARI | Delta "completó" con resultado engañoso (0.8165 Silhouette, 0.16 ARI) |
| Asumir que más modelos resuelven un problema de formulación | G-01 a G-05 con el mismo techo |
| Augmentar servido sintéticamente | 17 sintéticas inflan artificialmente N |
| Olvidar resamplear a 30s | Distribution shift documentado en Pre-G |
| No modelar ruido antes de segmentar | Sobre-segmentación garantizada |
| Seguir experimentando sin resolver el problema de datos primero | 10 experimentos Alpha sobre base rota |

---

## Assets heredados disponibles

| Asset | Dónde está |
|-------|-----------|
| `readings_delta.parquet` (134k lecturas) | `Ciclo_Alpha_v1/Exploracion_Gamma_Delta_2026/Ciclo_Delta/fase_1_datos/data/processed/` |
| Pipeline extracción Fase 1 | `Ciclo_Alpha_v1/fase_1_extraccion/` |
| `app_anotacion_gamma.py` | `Ciclo_Alpha_v1/Exploracion_Gamma_Delta_2026/Ciclo_Gamma/` |
| Aprendizajes Gamma + Delta | `delta_gamma_antiguio.md` |
| Ground truth completo | `public.audit_events` en Supabase |


---


<!-- ==== fusionado desde av2_00_INDICE_Y_VISION_GENERAL.md ==== -->

---
area: Data Science
ciclo: Alpha v2
actualizado: 2026-06-25
---

# Tracker de Experimentos — Ciclo Alpha v2

Registro cronológico de todos los experimentos del Ciclo Alpha v2.

---

## Estado actual

| Fase activa | Próximo experimento | Estado |
|-------------|--------------------|----|
| `fase_0_ruido` | AV2-E01 — modelo de ruido baseline | ⏳ Pendiente |

---

## Tabla de experimentos

| ID | Fase | Fecha | Descripción | Resultado principal | Estado |
|----|------|-------|-------------|---------------------|--------|
| AV2-E01 | `fase_0_ruido` | — | Modelo estadístico de ruido del sensor en reposo | — | ⏳ Pendiente |
| AV2-E02 | `fase_2_segmentacion` | — | PELT con parámetros baseline | — | ⏳ Bloqueado por E01 |
| AV2-E03 | `fase_2_segmentacion` | — | Tuning del umbral de segmentación | — | ⏳ Bloqueado por E02 |
| AV2-E04 | `fase_5_modelos` | — | LightGBM baseline sobre segmentos | — | ⏳ Bloqueado por E03 |

---

## Protocolo de experimento

### Antes de iniciar un experimento

1. Verificar que los datos de entrada existen y están limpios
2. Documentar hipótesis y métrica de éxito esperada
3. Crear archivo `exp_AV2-EXX_<descripcion>.md` en esta carpeta

### Al terminar un experimento

1. Registrar resultado real vs. esperado
2. Documentar decisión (continuar / cambiar enfoque / archivar)
3. Actualizar tabla de arriba
4. Si el experimento falla, documentar POR QUÉ (no solo qué pasó)

---

## Baselines históricos de referencia

| Modelo | F1-activo | F1-alim | F1-servido | Macro F1 | Sesiones train | Ciclo |
|--------|-----------|---------|------------|----------|----------------|-------|
| LGBM Exp 06 | 0.7619 | 0.7606 | 0.1395 | 0.6312 | 103 alim · 18 serv | Alpha |
| LGBM G-01 | 0.8139 | 0.7598 | 0.2656 | 0.6733 | 264 alim · 80 serv (63+17) | Gamma |
| GRU Exp 10 | 0.5203 | 0.3613 | **0.3400** | 0.5552 | 185 alim · 27 serv | Exp 10-NN |
| Heurística (delta_peso_total) | — | — | **~0.80+** (estimado) | — | N/A | **Alpha v2 objetivo baseline** |

> El baseline de Alpha v2 es la **heurística de signo** — calcular su F1 es el primer paso.
> Si F1-servido heurístico ≥ 0.80, el modelo ML es refinamiento, no la solución principal.

---

## Métricas objetivo globales

| Métrica | Objetivo | Baseline (Ciclo Alpha Exp06) |
|---------|---------|------------------------------|
| F1-alimentacion | ≥ 0.85 | 0.7606 |
| F1-servido | ≥ 0.60 | 0.1395 (Alpha) / 0.2656 (Gamma) |
| ARI vs ground truth | ≥ 0.50 | 0.1594 (Delta, no comparable) |

---

## Preguntas abiertas

1. ¿Cuántas sesiones de servido reales hay hoy en `audit_events`? (última cuenta: 63)
2. ¿Hay lecturas más recientes que Junio 14 sin etiquetar?
3. ¿La `app_anotacion_gamma.py` funciona para anotar servidos nuevos antes de empezar?
4. ¿PELT u offline primero? (recomendación: PELT offline para investigación, BOCPD solo para producción)


---
