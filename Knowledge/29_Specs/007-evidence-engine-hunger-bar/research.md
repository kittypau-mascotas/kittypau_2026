# Research — Motor de Evidencia Real en la Barra de Hambre

**Feature**: [spec.md](./spec.md) | **Fecha**: 2026-08-28

Todas las incógnitas técnicas de la Technical Context de [plan.md](./plan.md) se resuelven acá
antes de diseñar. Fuente verificada esta sesión (no releída de memoria): código real de
`Investigacion/Ciclo_Alpha_v2/fase_0_ruido/` (`shape_features_v2.py`,
`app_anotacion_av2.py`, `tests/test_evidence_engine.py`) y de
`kittypau_app/src/lib/hunger-bar.ts` + su route + su test actual.

## 1. Qué recibe hoy `classifySegment()` vs. qué necesita el Evidence Engine real

**Hallazgo (grep + lectura directa de `hunger-bar.ts` y `hunger-bar.test.ts`)**: hoy
`detectSegments()` arma un `Segment` con solo `deltaG` y `durationMin` (dos escalares) — el
array crudo de pesos del segmento se descarta apenas se calcula el delta. `classifySegment()`
nunca ve las lecturas individuales.

El Evidence Engine real necesita el array crudo: `extraer_features(valores, resample_s)` opera
sobre la serie de pesos completa del segmento (deriva velocidad/aceleración, longitud de arco,
FFT, picos/valles, etc. — nada de eso es calculable desde solo delta+duración).

- **Decision**: `detectSegments()` conserva su misma máquina de estados (lag window de 8 min,
  umbral `SESSION_THRESHOLD_G`, estabilización `STABLE_COUNT`) **sin tocarla** — solo se agrega
  un campo nuevo al `Segment` (el sub-array de `ReadingPoint` entre `sessionStartIdx` e `i`) para
  que el clasificador real tenga con qué trabajar. Es un cambio aditivo, no un cambio de
  algoritmo de detección.
- **Rationale**: satisface User Story 3 al pie de la letra — la detección de segmentos (qué
  ventana de tiempo se considera candidata) es un problema distinto de la clasificación (si esa
  ventana fue comida real), y el spec solo pide reemplazar la clasificación (FR-001).
  `hunger-bar.test.ts` ya fija el comportamiento de `detectSegments` con un fixture concreto —
  agregar un campo no rompe ese test.
- **Alternativas consideradas**: recalcular el sub-array de pesos aparte, re-recorriendo
  `readings` en la función de clasificación — descartado, es trabajo duplicado y más código que
  simplemente conservar la referencia que `detectSegments` ya tiene en mano.

## 2. Resampleo a grilla fija de 30s

**Hallazgo**: `extraer_features()` asume una serie ya resampleada a paso fijo (`resample_s`,
30s en producción — `RESAMPLE_S = 30` en `app_anotacion_av2.py:153`). Las lecturas reales de
`readings` no llegan a paso perfectamente fijo (jitter de red/MQTT). El propio pipeline de
investigación resamplea con promedio por ventana + forward-fill de máximo 2 slots (60s) antes de
extraer features (documentado en el propio `app_anotacion_av2.py`, sección "Resampleo a 30s").

- **Decision**: portar ese mismo resampleo (bucketing a intervalos de 30s + promedio + ffill
  máx. 2 slots) como paso previo a `extraerFeatures()` en TS, sobre el sub-array del segmento
  (no sobre las 10 días completos de `readings` — solo la ventana candidata, que es corta:
  típicamente 1.5–15 min según los rangos ya documentados en `classifySegment`).
- **Rationale**: es el mismo preprocesamiento que generó `comp_stats_v2.json` — si el port no
  resamplea igual, los features no son comparables contra las estadísticas calibradas y el
  z-score pierde sentido.
- **Alternativas consideradas**: usar el intervalo de lectura real del dispositivo sin
  resamplear — descartado, invalidaría la comparación contra `comp_stats_v2.json` (calibrado
  sobre datos a 30s fijos).

## 3. FFT real sin librería nueva (F09 frecuencial)

**Hallazgo**: `_f09_frecuencial` usa `np.fft.rfft` sobre el array resampleado del segmento —
que para una ventana de comida (1.5–15 min a 30s de paso) tiene **como mucho ~30 muestras**.

- **Decision**: implementar una DFT directa (`O(n²)`) en vez de un FFT recursivo tipo
  Cooley-Tukey. Con n ≤ ~30, son ≤900 multiplicaciones — trivial en cualquier request HTTP, y
  evita la complejidad de manejar tamaños no potencia de 2 (que un FFT real exigiría o rellenar
  con padding, cambiando el espectro resultante).
- **Rationale**: Ponytail — "código mínimo que funciona" antes que "código rápido que no se
  necesita". Es la misma frecuencia/magnitud que produciría `rfft`, solo calculada de forma
  directa; el resultado numérico es idéntico salvo error de punto flotante.
- **Alternativas consideradas**: portar un FFT real (Cooley-Tukey con zero-padding a potencia de
  2) — descartado por ahora: agrega complejidad de implementación y de testing sin beneficio de
  performance medible a este tamaño de n. Queda como upgrade path documentado si en el futuro se
  amplía la ventana de análisis (ver comentario `ponytail:` a dejar en el código).

## 4. `find_peaks` con prominence/width (F11 topología)

**Hallazgo**: `_f11_topologia` usa `scipy.signal.find_peaks(..., prominence=..., width=...)` —
sin librería equivalente en TS/Node.

- **Decision**: portar a mano únicamente las dos salidas que el módulo consume (picos + su
  prominence + su width), replicando el algoritmo documentado de scipy: un punto es pico local
  si es mayor que sus vecinos inmediatos; su prominence es la altura sobre el mínimo más alto
  entre ese pico y el primer pico más alto a cada lado (o el borde de la señal); su width se mide
  por interpolación lineal al cruzar una altura de referencia (`prominence * rel_height`, rel
  _height por defecto 0.5 en scipy, igual que el default no sobreescrito en el Python original).
- **Rationale**: es el único componente de F11 sin fórmula cerrada trivial; no hay forma de
  evitarlo sin perder la familia completa de features (picos/valles), que aporta separación real
  documentada en `MODEL_EvidenceEngine.md`.
- **Alternativas consideradas**: aproximar prominence/width con una heurística más simple (ej.
  solo altura relativa sin comparar con vecinos) — descartado, cambiaría los valores de forma no
  verificable contra `comp_stats_v2.json` (calibrado con la implementación exacta de scipy).

## 5. `skew`/`kurtosis` (F10 robusta)

**Hallazgo**: `scipy.stats.skew`/`kurtosis` con los defaults de scipy (`bias=True`, momentos
poblacionales, kurtosis de Fisher —resta 3—).

- **Decision**: fórmula cerrada directa: `skew = m3 / m2^1.5`, `kurtosis = m4 / m2^2 - 3`, con
  `m_k` el k-ésimo momento central poblacional (`mean((x - mean(x))**k)`).
- **Rationale**: son 4 líneas de código, sin ambigüedad de implementación — no amerita más
  análisis.

## 6. Sample Entropy O(n²)

**Hallazgo**: `_sample_entropy` ya está acotado a 60 puntos en el propio Python (comentario en
`_f06_entropias`) precisamente porque es O(n²) y se vuelve costoso para ventanas largas.

- **Decision**: portar tal cual (mismo `m`, `r_factor`) — el límite de 60 puntos ya viene heredado
  del propio dominio (ventanas de comida son cortas) así que el costo en TS es el mismo que en
  Python: trivial.

## 7. Empaquetado de `comp_stats_v2.json` en `kittypau_app`

**Hallazgo**: el archivo vive en `Investigacion/Ciclo_Alpha_v2/fase_0_ruido/data/` (~37KB, 102
features × 3 categorías), fuera del árbol de `kittypau_app`. El deploy de la app (Vercel u
equivalente) empaqueta solo `kittypau_app/`, no el repo completo — leerlo por filesystem en
runtime desde `Investigacion/` no es viable en producción.

- **Decision**: copiar el archivo dentro de `kittypau_app/src/lib/evidence-engine/comp_stats_v2.json`
  e importarlo como módulo JSON de TypeScript (`import compStats from "./comp_stats_v2.json"` —
  Next.js/TypeScript soportan `resolveJsonModule` de forma nativa, sin dependencia nueva).
  Next.js lo bundlea en build time dentro de la función serverless — cero I/O de filesystem en
  runtime, cero latencia extra por request.
- **Rationale**: satisface FR-006 (recalibración futura) de la forma más simple posible —
  "recalibrar" pasa a ser literalmente "reemplazar este archivo y hacer build de nuevo", sin
  tocar ninguna lógica (ver SC-004). Es una copia manual documentada (no un job de sync
  automático — over-engineering para algo que ocurre pocas veces al año), con el origen
  (`Investigacion/.../comp_stats_v2.json`) anotado en un comentario de cabecera del archivo
  copiado para que quien recalibre sepa de dónde traer la próxima versión.
- **Alternativas consideradas**: (a) leer el archivo por HTTP desde algún storage — over-
  engineering, agrega infra nueva para un archivo de 37KB que cambia rarísima vez; (b) guardarlo
  en una tabla de Supabase — mismo problema, más complejidad que valor; (c) symlink desde
  `Investigacion/` — no sobrevive a un `git clone`/deploy fresco en otra máquina/CI.

## 8. Validación del port contra el motor real (sin re-implementar el pipeline de anotación)

**Hallazgo clave**: `Investigacion/Ciclo_Alpha_v2/fase_0_ruido/data/features_anotaciones_v2.csv`
ya existe — 741 filas × 102 features (una por anotación real, ya extraídas con la
implementación Python de referencia) + columna `categoria`. Es el mismo dataset que usa
`tests/test_evidence_engine.py` para medir el 65%–80% de accuracy.

- **Decision**: dos capas de fixtures "golden", generadas una sola vez con un script Python
  corto (no parte del runtime de la app, vive junto a los demás scripts de investigación):
  1. **Capa de clasificación** (`evidenceScore()`): exportar directamente
     `features_anotaciones_v2.csv` + `comp_stats_v2.json` a un fixture JSON — no requiere volver
     a extraer features desde pesos crudos. Sirve para el test de regresión TS equivalente a
     `test_accuracy_held_out_sobre_el_piso` (mismo split 80/20, seed espejada, mismo piso 65%,
     y comparación SC-001 ≥75% match).
  2. **Capa de extracción** (`extraerFeatures()`): para una muestra pequeña (documentada en
     `data-model.md`) de anotaciones, extraer también el array crudo de pesos desde
     `readings.csv`/`readings_rows.csv` (por `device_code` + `t_inicio`/`t_fin`) y guardar
     `{pesos, resample_s, features_esperadas}` — valida que el port de `extraerFeatures()`
     reproduce los mismos 102 números que produjo `features_anotaciones_v2.csv` para esas
     mismas anotaciones, con una tolerancia de punto flotante razonable (ver `data-model.md`).
- **Rationale**: evita el riesgo real de "el port compila pero calcula distinto" sin tener que
  reconstruir el pipeline completo de anotación en TS ni depender de Python en el CI de
  `kittypau_app`. Los fixtures se generan una vez, se congelan como archivos de test.
- **Alternativas consideradas**: correr Python real como parte del test suite de `kittypau_app`
  (ej. subprocess) — descartado, agrega una dependencia de entorno (Python) al CI de un proyecto
  Next.js/TS que hoy no la tiene.

## 9. Test runner

**Hallazgo**: `vitest` ya está instalado y configurado (`npm run test` → `vitest run`,
`vitest.config.ts` con alias `@/*`), y ya hay tests co-ubicados (`*.test.ts` junto al código,
ej. `src/lib/hunger-bar.test.ts`). No hace falta agregar nada.

- **Decision**: seguir el mismo patrón — tests co-ubicados dentro de
  `src/lib/evidence-engine/*.test.ts`.
