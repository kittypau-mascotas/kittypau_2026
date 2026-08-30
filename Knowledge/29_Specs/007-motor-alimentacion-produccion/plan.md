# Plan técnico: Motor de Alimentación en Producción (Investigacion_v2)

**Spec**: [spec.md](./spec.md) | **Rama de datos de origen**: `experimento-calibracion-duracion`
(Investigacion_v2) | **Rama de implementación**: `experimento-calibracion-duracion` (misma rama,
ver nota de alcance abajo)

## Resumen de la arquitectura

```
Investigacion/Investigacion_v2/                          kittypau_app/src/lib/
  07_calibracion_duracion.ipynb  ─┐                         motor-alimentacion/
  08_validacion_...ipynb         ─┤  (fuente de verdad         calibracion-kpcl0034.json  (congelado)
  data/*.csv                     ─┘   de los números)          segmentacion.ts
  exportar_calibracion_produccion.py  ──── genera ────►        clasificador.ts
                                          el JSON               index.ts
                                                                     │
                                                          kittypau_app/src/lib/hunger-bar.ts
                                                            (gateado por device_code)
                                                                     │
                                              route.ts (API) ──► page.tsx (UI: card, gráfico, barra)
```

## Decisión 1 — Cómo se congela la calibración

`Investigacion/Investigacion_v2/exportar_calibracion_produccion.py` reproduce, desde el cache
crudo (`data/lecturas_limpias.csv`), exactamente `construir_candidatos(180)` del notebook 07
(mismo τ=180s, mismo `GAP_CUTOFF_S=300`, mismo umbral MAD de `es_candidato`), y el fit de
`StandardScaler` + centroides de KMeans (post-refinamiento) del notebook 07/08. Exporta un único
JSON (`data/calibracion_kpcl0034_export.json`, copiado a
`kittypau_app/src/lib/motor-alimentacion/calibracion-kpcl0034.json`) con:

- `segmentacion`: `tau_pausa_s`, `gap_cutoff_s`, `k_margen_lecturas_estables`,
  `umbral_es_candidato_g` (filtro MAD por device).
- `features_orden` / `log1p_features` / `scaler` (mean/scale por feature).
- `clusters_kmeans_crudo`: por cada cluster crudo (0,1,2) — centroide estandarizado, categoría
  dominante medida contra `categoria_real`, pureza, y si es el cluster "mezclado".
- `refinamiento`: umbral de `delta_neto_real` (20g) y a qué categoría van cada lado del split.

**Por qué un JSON estático y no un microservicio Python**: la clasificación en sí es aritmética
trivial (distancia euclídea a 3-4 centroides fijos + un umbral) — no hay razón para correr
sklearn en producción. Ver ladder Ponytail, escalón 6 ("¿puede ser código mínimo?"). Reentrenar
significa: re-ejecutar `exportar_calibracion_produccion.py` y reemplazar el JSON — sin tocar
código TypeScript.

**Por qué se re-deriva desde el cache crudo y no desde los CSV ya filtrados**: el umbral MAD
(`umbral_es_candidato_g`) se calcula sobre la población COMPLETA de segmentos candidatos+
descartados, no solo sobre los que ya pasaron el filtro — usar el CSV ya filtrado habría dado un
umbral sesgado (confirmado durante la implementación: primera versión daba 2.98g con datos ya
filtrados, la reproducción completa desde `lecturas_limpias.csv` da 2.0g y iguala el conteo real
de 783 candidatos KPCL0034).

## Decisión 2 — Ubicación del motor: `kittypau_app/src/lib/motor-alimentacion/`

Carpeta nueva y dedicada (pedido explícito), separada de `hunger-bar.ts` y de
`shape_features_v2.py`/`comp_stats_v2.json` (no se reutiliza nada de ahí). Tres archivos:

- `segmentacion.ts` — puerto fiel de `construir_candidatos()`: state machine que consume
  `LecturaPeso[]` y devuelve `SegmentoCrudo[]`, cada uno con `isProvisional` (true = cola abierta
  al final del stream, todavía sin confirmar).
- `clasificador.ts` — centroide más cercano (distancia euclídea sobre las 5 features
  estandarizadas con el scaler congelado) + refinamiento por umbral dentro del cluster mezclado.
- `index.ts` — API pública: `clasificarEventos(readings): EventoAlimentacion[]`.

Solo válido para `device_code === "KPCL0034"` — el propio JSON lo declara (`device_code`) y
`hunger-bar.ts` lo gatea explícitamente (`MOTOR_NUEVO_DEVICE_CODE`).

## Decisión 3 — Provisorio → definitivo (~180s, en la práctica algo más)

Un segmento se cierra "de verdad" (definitivo) recién cuando: (a) se acumulan `tau_pausa_s=180s`
de estabilidad consecutiva -- lo que cierra el corte -- **y además** (b) hay `k_margen=5` lecturas
estables más allá de ese corte para calcular `nivel_despues` (mediana robusta, no el último valor
puntual). Verificado con test unitario (`segmentacion.test.ts`): con lecturas cada 10s, la
confirmación real toma ~230s, no exactamente 180s. Mientras (b) no se cumple, el segmento se
expone igual pero `isProvisional: true`, usando el último peso conocido como `nivel_despues`
aproximado (simplificación marcada `ponytail:` en el código — no hay upgrade pendiente, es
inherente a "todavía no terminó"). `computeHungerBar()` no espera a la confirmación: usa el
segmento provisorio para la barra/badge igual, marcando `lastMealIsProvisional`.

## Decisión 4 — Integración quirúrgica en `hunger-bar.ts`

`detectSegments()` (reglas v1) se mantiene intacta para cualquier device que no sea KPCL0034.
Se agregó `detectSegmentsMotorNuevo()` como adaptador de `clasificarEventos()` al mismo tipo
`Segment[]` que ya consumía `computeHungerBar()` — el resto del cálculo (mediana de intervalos,
fallback, clamp P10/P90, fórmula de la barra) **no cambió una línea**. `computeHungerBar()` ahora
recibe un tercer parámetro opcional `deviceCode` y elige la fuente de segmentos según
`MOTOR_NUEVO_DEVICE_CODE`. `route.ts` pasa `device.device_id` (ya lo tenía cargado). Nuevos campos
en `HungerBarResult`: `lastMealIsProvisional`, `events` (todos los eventos clasificados en la
ventana, para el gráfico).

`lastMealConfidence` para KPCL0034 deja de ser el score triangular ad-hoc de v1 — pasa a ser la
**pureza medida contra anotaciones reales** del cluster asignado (`confianzaMedida` en
`clasificador.ts`), un número con respaldo real en vez de un proxy inventado.

## Decisión 5 — Hallazgo: dos sistemas de "evidencia" distintos en /today (no unificar sin avisar)

Al leer el código real se encontró que **card #1** (`today-bowl-card` /
`BowlWellnessCard`, badge "Confirmado"/"Sin evidencia real") se alimenta de `audit_events`
(confirmación humana/operador) vía `buildWellnessState()` — **no** de `hunger-bar.ts`. Es un
sistema de verdad distinto y deliberado (comentario en el propio código explica por qué se evita
mezclar "sin datos" con "sin modelo"). El widget **"Barras Sims" / #3** (`barras-sims-card.tsx`,
"Comida · N%") sí se alimenta directo de `hungerBar.percentage`/`usingFallback` — no necesitó
cambios de wiring, hereda el modelo nuevo automáticamente en cuanto `hunger-bar.ts` cambió.

Decisión tomada para no violar el diseño existente ni el no-negociable de "Barras Sims" (no
agregar cards, no reinterpretar sin motivo): se agregó un **tercer estado honesto** a
`buildWellnessState()` — `"Detectado por modelo"` / `"Detectado por modelo (provisorio)"` — que
solo aparece cuando NO hay evento confirmado por auditoría, es exclusivo de KPCL0034, y usa un
tono visual (ámbar) distinto de "Confirmado" (verde, solo auditoría). No reemplaza ni reinterpreta
"Confirmado" — lo complementa cuando la única evidencia disponible es la del modelo.

## Decisión 6 — Gráfico de /today (`day-night-timeline-card.tsx` + `dayNightChartData` en `page.tsx`)

El dataset "Alimentación" pasó de graficar **todas** las lecturas crudas del comedero a graficar
solo las que caen dentro de una ventana `[startAt,endAt]` de un evento clasificado como
`alimentacion` (`bowlAlimentacionPoints`). Se agregó un dataset nuevo "Servido"
(`bowlServidoPoints`) con ícono distinto (`pointStyle: "rectRot"`, color índigo — sin encargar un
asset nuevo, ver ladder Ponytail escalón 4/5) para las lecturas dentro de ventanas `servido`. Fuera
de KPCL0034 (sin `hunger-bar.events`), el dataset de Alimentación cae de vuelta al comportamiento
actual (todas las lecturas) — no rompe KPCL0035.

Tooltip (`afterLabel`): al pasar el mouse sobre cualquier punto del plato (alimentación o
servido), además de la info auditada existente se agrega una sección "— Modelo
(Investigacion_v2) —" con el evento de alimentación y de servido más cercano en el tiempo (ventana
de ±2h), cumpliendo el pedido de "mostrar info de alimentación y de servido" en el mismo hover.

Se corrigió de paso un acoplamiento por índice posicional (`context.datasetIndex === 0`) que se
habría roto al insertar el dataset "Servido" en el medio — reemplazado por matching sobre
`dataset.label`, y el lookup de sesión auditada para el plato pasó de indexar por posición
(`findSessionForPoint`, inválido una vez que el dataset se filtra) a indexar por tiempo
(`findSessionForTime`, nuevo).

## Alcance de esta entrega (ver Assumptions del spec)

Todo lo de arriba se implementó y se verificó **localmente**: `tsc --noEmit` limpio, `eslint`
limpio, suite completa de tests (`vitest run`, 52/52) y `npm run build` de producción. No se tocó
Supabase de producción ni se desplegó a Vercel — eso es la fase siguiente, fuera de este spec.

## FR-010 (recalibración semi-automática con freno de calidad) — no implementado en esta entrega

Documentado en el spec como requisito, explícitamente no bloqueante (ver Assumptions). Diseño
recomendado para cuando se retome: un job que (1) corre
`exportar_calibracion_produccion.py` con datos actualizados, (2) recalcula cobertura/pureza contra
`candidatos_categoria_real.csv` igual que `08_validacion_contra_anotaciones.ipynb`, (3) solo
sobrescribe `calibracion-kpcl0034.json` si esas métricas igualan o superan a las del JSON vigente
(el propio JSON ya trae `validacion_referencia` para comparar contra). Mantenerlo **fuera** de
Vercel (build-time o CI, no request-time) — no hay necesidad de que corra dentro de la app Next.js.

## Verificación

- `npx tsc --noEmit`: sin errores.
- `npx eslint` sobre los archivos tocados: sin errores.
- `npx vitest run`: 52/52 tests (incluye 4 tests nuevos en `motor-alimentacion/` + 6 preexistentes
  de `hunger-bar.test.ts`, sin cambios, todos verdes).
- `npm run build`: build de producción de Next.js.
- Pendiente (no bloqueante para "local"): correr `npm run dev`, iniciar sesión como
  `kittypau.mascotas@gmail.com` y confirmar visualmente `/today` con datos reales de Bandida.
