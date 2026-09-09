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

Iteración en varios pasos, terminó bastante distinto de como arrancó:

1. **Separar el plato en Alimentación/Servido**: el dataset "Alimentación" pasó de graficar
   todas las lecturas crudas a graficar solo eventos clasificados como `alimentacion`; dataset
   nuevo "Servido" para los eventos `servido`. Ícono de Servido: primero `pointStyle: "rectRot"`
   (genérico), después reemplazado por pedido explícito con `icono_comida.png` (mismo asset que
   ya usa el widget "Comida" de Barras Sims — sin encargar un asset nuevo).
2. **1 ícono por evento, no por lectura**: filtrar lecturas crudas por ventana `[startAt,endAt]`
   dejaba varios íconos por evento (un evento típico abarca varias lecturas). Se pasó a un único
   punto representante por evento.
3. **Eje Y pasa a carriles fijos**: pedido explícito — "el eje Y no me importa, solo el tiempo".
   Alimentación/Servido/Hidratación se dibujan cada uno en su propia línea horizontal fija
   (`LANE_ALIMENTACION=3/SERVIDO=2/HIDRATACION=1`), no seguían más el peso real. El peso real se
   preserva en `valorReal` (nuevo campo de `DayNightLanePoint`) para que el tooltip lo siga
   mostrando aunque el eje Y ya no lo represente.
4. **Bug real corregido (2026-08-30)**: el paso 2 ubicaba cada evento buscando "la lectura cruda
   más cercana" en `bowlDayNightPoints` — que solo tiene lecturas del día que se está viendo
   (`hungerBar.events` viene de una ventana de 10 días). Si el día no tenía lecturas justo ahí, el
   evento no aparecía, o se enganchaba al punto disponible más cercano aunque fuera de otra hora
   — amontonando íconos mal ubicados (reportado por el usuario: "aparecen muchas alimentaciones").
   Fix: ubicar cada punto directo con la hora del propio evento (`startAt`), descartando el
   evento si cae fuera de la ventana del día actual (mismo criterio que `toDayNightPoints` ya
   usa para lecturas crudas) — verificado en vivo: antes 0 íconos en "hoy" pese a 2 eventos
   reales, después los 2 aparecen en su hora correcta.
5. **Tooltip simplificado (pedido explícito, 2026-08-30)**: la primera versión agregaba una
   sección "— Modelo (Investigacion_v2) —" con info cruzada de alimentación y servido en el mismo
   hover. Se reemplazó por lo pedido: al pasar el mouse sobre el plato, el tooltip dice
   **únicamente la hora (ya la da `title`) y cuánto comió (ya lo da `label`)** — se eliminó toda
   la lógica de auditoría/cross-referencia de ese tooltip (`bowlIntakeSessions` y
   `findSessionForTime` quedaron sin uso y se borraron). Hidratación (el bebedero, no "el plato")
   conserva su detalle de sesión auditada sin cambios.

De paso se corrigió un acoplamiento por índice posicional (`context.datasetIndex === 0`) que se
habría roto al insertar el dataset "Servido" en el medio — reemplazado por matching sobre
`dataset.label`.

## Decisión 8 — Notificación push cuando el modelo confirma "comió"/"le sirvieron" (2026-08-30)

Fuera del alcance original del spec (agregado por pedido explícito posterior). Nuevo hook
`useHungerBarEventNotifications` (mismo patrón que `useHungerBarPushAlert`, que ya existía para
el aviso de atraso): notificación push nativa (Capacitor `LocalNotifications`, no-op en web) cuando
`hunger-bar.events` trae un evento **nuevo** de alimentación/servido, `isProvisional: false`
(espera la confirmación, no avisa sobre algo que puede recategorizarse). El primer fetch al montar
el hook se toma como línea base sin notificar nada (son eventos históricos, no "acaban de pasar")
— solo se notifica lo que aparece nuevo en un fetch posterior (poll cada 5min ya existente en
`today/page.tsx`).

## Decisión 9 — Agrupar picoteo (2026-09-01)

Pendiente desde v1 (`Knowledge/05_API/SPEC_HungerBar_Alimentacion.md` §3 "Picoteo", nunca
resuelto). `motor-alimentacion/index.ts`: `fusionarPicoteo()` fusiona eventos consecutivos de la
misma categoría (alimentación o servido, no ruido) separados por menos de `GAP_FUSION_S=120s` en
uno solo (extiende `endAt`, suma `deltaG`, la confianza del evento fusionado es la del más débil
de los dos, no la del primero — conservador). Umbral reutilizado, no inventado: es
`gap_fusion_s=120` del pipeline legado (`01_genera_candidatos.py`, ver
`Knowledge/10_Datasets/README_Datasets.md`). Corre como post-procesamiento después de clasificar,
no toca segmentación ni clustering. 5 tests nuevos en `index.test.ts`.

## Alcance de esta entrega (ver Assumptions del spec)

Todo lo de arriba se implementó y se verificó **localmente**: `tsc --noEmit` limpio, `eslint`
limpio, suite completa de tests (`vitest run`, 52/52) y `npm run build` de producción. No se tocó
Supabase de producción ni se desplegó a Vercel — eso es la fase siguiente, fuera de este spec.

## FR-010 (recalibración semi-automática con freno de calidad) — implementado (2026-09-01)

`Investigacion/Investigacion_v2/recalibrar_con_freno.py`. Flujo real (no solo diseño):

0. Refresca `candidatos_categoria_real.csv` desde cero (re-corre las celdas de
   `08_validacion_contra_anotaciones.ipynb` extraídas a un script temporal — categoría real por
   solapamiento + promoción de veredictos manuales de `revision_sin_anotacion.csv`). **Hallazgo
   real al construirlo**: la primera versión no tenía este paso y comparaba contra ground truth
   desactualizado (18 veredictos manuales menos de los que ya existían) — corregido antes de
   dejarlo andando.
1. Guarda el JSON vigente de producción como referencia.
2. Corre `exportar_calibracion_produccion.py` → candidato nuevo.
3. Compara `guardia_alimentacion.mejora_medida.accuracy_global_con_guardia` (candidato vs.
   vigente, empate cuenta como mejora).
4. Solo copia el candidato a `kittypau_app/src/lib/motor-alimentacion/calibracion-kpcl0034.json`
   si iguala o supera; si no, descarta y dejar el vigente intacto.

Registra cada corrida en `data/historial_recalibraciones.jsonl` (fecha, versión, métrica antes/
después, decisión) — auditable. Corrido 3 veces en vivo el mismo día: 86.42%→86.82%→88.46%
(mejorando con cada tanda de veredictos manuales nuevos, nunca empeorando). Mantenido **fuera**
de Vercel (script standalone, pensado para cron/CI o correrlo a mano) — no corre dentro del
runtime de Next.js.

## Cierre de validación asistido — sin caer en validación circular (2026-09-01)

`Investigacion/Investigacion_v2/cerrar_validacion_confiable.py`. No hace "guardar todo lo que
sugiere el modelo" a ciegas (eso sería exactamente la validación circular que se discutió con
Mauro — ver advertencia agregada al README de `app_candidatos.py`). Separa por incertidumbre
(mismo cálculo que la app: distancia al cluster más cercano / al segundo más cercano):

- **Confiables** (incertidumbre < 0.4, sin ambigüedad estructural real): se auto-promueven con
  la categoría que sugiere el cluster — equivalente a lo que un humano aprobaría con solo mirar
  el número.
- **Ambiguos** (incertidumbre >= 0.4): se listan en `data/candidatos_ambiguos_pendientes.csv`,
  **no se tocan** — quedan para que Mauro los revise a mano en `app_candidatos.py`.

Resultado de la corrida real: de 94 candidatos `sin_anotacion`, 86 confiables promovidos (85
ruido, 1 servido) + 8 genuinamente ambiguos sin resolver. Encadena automáticamente con
`recalibrar_con_freno.py` al final, así el efecto llega a producción con el mismo freno de
calidad.

## Bug de "período común" en notebook 08 + sync de datos nuevos (2026-09-08)

Pedido: correr el pipeline sobre los datos llegados desde la última sincronización y dejar los
candidatos nuevos sin clasificar visibles en `app_candidatos.py`, con el circuito de "si los
clasifico, mejoran el modelo" funcionando de punta a punta.

**Datos**: `11_Data/2026/readings_rows.csv` estaba 11 días desactualizado (última fila
2026-08-28). Nuevo script `11_Data/2026/sincronizar_readings_rows.py` — solo lectura desde
Supabase, `recorded_at` estrictamente posterior a la última fila local, solo *append* (nunca
reescribe lo ya guardado, ver CLAUDE.md). Trajo 61.623 filas nuevas (30.815 KPCL0034 / 30.808
KPCL0035), verificado con `diff` que las 324.445 filas originales quedaron intactas. Repipeline
completo: `lecturas_limpias.csv` (394.942 → 456.565 filas) → `candidatos_clusters_duracion.csv`
(KPCL0034: 783 → 913 candidatos).

**Bug real encontrado** (no documentado antes): las celdas 9 y 11 de
`08_validacion_contra_anotaciones.ipynb` calculaban `categoria_real` (y exportaban
`candidatos_categoria_real.csv`) solo para `cand_comun` — candidatos con `ts_inicio` dentro del
solapamiento `[anotaciones.min, anotaciones.max]` (abril-15 jul). Cualquier candidato fuera de
ese rango (todo agosto-septiembre, 100% de los posteriores al 28-ago) quedaba **totalmente
afuera del CSV** — no como `"sin_anotacion"`, sino ausente. `app_candidatos.py` hace un
`merge(..., how="left")` y rellena lo que no matchea con `"sin_validar"` (línea 125), categoría
que el modo "revisar sin anotación" **no** filtra (línea 506 filtra estrictamente
`categoria_real == "sin_anotacion"`) — esos candidatos eran invisibles en la app de revisión,
silenciosamente, desde que existe. Confirmado con `isna().sum()` = 212 candidatos KPCL0034
ausentes antes del fix.

Fix: en esas dos celdas, calcular/exportar sobre el `cand` completo (todos los candidatos) en
vez de `cand_comun`, dejando `anot_comun`/`_inicio_comun`/`_fin_comun` intactos donde
corresponden metodológicamente (las celdas de cobertura/pureza, que sí deben medirse solo dentro
del período anotado). Verificado con `ast.parse()` antes de correr y con conteo de filas después.

Resultado tras el fix: `candidatos_categoria_real.csv` pasa de 701 a 913 filas. De 360
`sin_anotacion` reales, 141 ya tenían veredicto manual guardado en `revision_sin_anotacion.csv`
y se promovieron automáticamente al re-exportar → quedan **219** genuinamente `sin_anotacion`
visibles ahora en `app_candidatos.py` (antes, ~212 de esos ni aparecían).

`recalibrar_con_freno.py` corrido de nuevo contra el ground truth ya corregido:
`accuracy_global_con_guardia` 88.46% → **88.47%** (n_validados total 743 → 771) — promovido
(empate/mejora, sin regresión), `calibracion-kpcl0034.json` actualizado. Verificado en runtime
(no solo lectura de código) con `streamlit.testing.v1.AppTest`: `app_candidatos.py` carga sin
excepciones y el modo "sin anotación real" muestra exactamente **"Candidato 1 de 219"**.

Con los 219 ya visibles, se corrió `cerrar_validacion_confiable.py` sobre el pool completo
(antes solo tenía 94 para trabajar): 140 confiables (incertidumbre < 0.4) auto-promovidos a
`revision_sin_anotacion.csv` (95 ruido, 37 alimentación, 8 servido) + **79 genuinamente
ambiguos** quedan en `data/candidatos_ambiguos_pendientes.csv` para revisión humana real en
`app_candidatos.py`. Encadenó automáticamente la recalibración: `accuracy_global_con_guardia`
88.47% → **90.41%**.

**Caveat honesto sobre ese salto**: gran parte de esa mejora es por construcción — los 140
casos recién promovidos son justamente los que el propio modelo clasificó con más confianza
(incertidumbre < 0.4), así que el modelo "acertándolos" contra sí mismo no es una validación
independiente fuerte para esa porción. Sigue sin ser validación circular en el sentido grave
(no se promovió nada ambiguo, y las 743 anotaciones reales originales siguen siendo la base
dura), pero el número de 90.41% hay que leerlo con esa salvedad hasta que los 79 ambiguos se
revisen a mano y/o llegue más data realmente nueva para medir en verdadero out-of-sample.

## Revisión manual completa de los 79 ambiguos + freno de calidad protege producción (2026-09-08)

Mauro revisó a mano los 79 candidatos genuinamente ambiguos que dejó
`cerrar_validacion_confiable.py` (más recientes primero, orden nuevo de
`app_candidatos.py`, guardado + avance automático al elegir veredicto).
Resultado: 358 de 360 veredictos totales confirmados (285 ruido, 54
alimentación, 19 servido) — solo **2 quedan "no está claro"**, genuinamente
indecisos, correctamente excluidos de la promoción (no se inventa una
categoría para ellos).

`recalibrar_con_freno.py` promovió los 358 a `categoria_real`
(`candidatos_categoria_real.csv`: 360→2 `sin_anotacion`, prácticamente 100%
de KPCL0034 con categoría real ahora) y volvió a recalibrar contra el
ground truth completo — pero esta vez **el freno de calidad descartó el
candidato**: `accuracy_global_con_guardia` 87.93% < 90.41% vigente. La
calibración de producción quedó sin tocar.

**Por qué el número "bajó" sin que el modelo haya empeorado en la
práctica:** el 90.41% vigente se midió contra un ground truth que todavía
no incluía los 79 casos ambiguos (por definición, los más difíciles —
cerca del límite entre clusters). Al sumarlos, el mismo pipeline se mide
contra un examen más difícil y saca una nota más baja — no es que el
modelo se haya vuelto peor, es que la medida anterior era, en parte,
optimista (ver caveat ya documentado arriba sobre la promoción de
"confiables"). El freno de calidad hizo exactamente lo que tiene que
hacer: nunca reemplazar producción por algo que mide peor con el mismo
criterio, sin importar la causa. Con esto, la revisión manual de KPCL0034
queda prácticamente cerrada (911/913 candidatos con categoría real) — el
siguiente recalibrado real tendría que venir de candidatos nuevos
(sync + repipeline), no de más revisión sobre este mismo pool.

## Base única de anotaciones + cobertura 100% de KPCL0034 (2026-09-09)

Segundo rediseño de `app_candidatos.py`, a pedido de Mauro tras terminar la
revisión del pilar anterior: pasa de explorador de clustering a editor de
la base única (`data/anotaciones_unificadas.csv`) con curva interactiva
(hover), selección por click, validación de solapamiento no bloqueante
(avisa, no impide guardar), filtro por cercanía además de solapamiento
exacto (encontró un patrón real: pares de candidatos con id distinto para
el mismo evento), botón de eliminar con confirmación, y esquema unificado
sin distinguir "anotación real" de "candidato confirmado" de cara al
usuario (columna `origen` sacada, columna `revisado` nueva).

**Bug real encontrado y corregido en el camino** (3 intentos antes de dar
con la causa): el índice posicional de `st.dataframe(selection_mode=
"single-row")` es frágil -- se corre cada vez que la tabla cambia de
tamaño (borrar una fila, cambiar un filtro), y reescribir a mano su
`session_state` no resultó confiable de un run al siguiente. Fix de fondo:
trackear la anotación elegida por su ID (texto, nunca se corre) en vez de
por posición. Separado, otro bug real: el patrón `if not flag: if
st.button(): flag = True` evalúa el `if/else` exterior antes de que el
click alcance a actualizar la bandera en la misma pasada -- fix con
`on_click` (patrón que Streamlit documenta para esto). Y un tercero: no
había forma de marcar "revisado" sin editar categoría/hora aunque el
modelo ya hubiera acertado -- 14 candidatos quedaron con `revisado=False`
pese a haber sido mirados. Fix: botón "Confirmar tal cual".

**Ciclo completo sync → repipeline → revisión → cierre, mismo día:**
sync desde Supabase (+5.636 lecturas), repipeline (KPCL0034 913→928
candidatos), 21 candidatos genuinamente nuevos sin anotación (13 se
auto-clasificaron con alta confianza vía `cerrar_validacion_confiable.py`,
8 quedaron ambiguos y se sumaron a la base con `revisado=False`), Mauro
revisó los 21 vía la app (corrigiendo los que hacía falta, confirmando el
resto con el botón nuevo). Resultado: **`candidatos_categoria_real.csv`
pasa de 372 a 0 `sin_anotacion`** — KPCL0034 queda con el 100% de sus 928
candidatos con categoría real confirmada, por primera vez en el proyecto.
`recalibrar_con_freno.py` corrido contra esto: 87.28% < 90.41% vigente,
descartado (mismo caveat de siempre -- el ground truth ahora incluye los
casos más difíciles, la medida anterior era en parte optimista, no es que
el modelo haya empeorado). Producción sin tocar.

**Actualización (mismo día) — override manual del freno de calidad.**
`probar_modelo.py` (nuevo, evalúa la calibración REALMENTE desplegada
contra el ground truth completo) confirmó en limpio: 87.28% con guardia
física, 76.62% sin ella — servido pasa de 0% precision/recall a 76-89%
gracias a la guardia. Mauro pidió explícitamente desplegar esta
calibración de todas formas, pese a que mide peor que la vigente
(90.41%) — el freno de calidad hizo su trabajo (avisó, no bloqueó
silenciosamente), la decisión de forzarlo es explícitamente humana, no
automática. `version` pasa de `2026-08-30-v2` a `2026-09-09-v3`
(`exportar_calibracion_produccion.py` actualizado para que las próximas
corridas ya generen esta versión). Registrado en
`historial_recalibraciones.jsonl` como `promovido_manual_override`, con
la nota de que la baja de accuracy es por un ground truth más completo/
difícil (743→928 candidatos, 100% con categoría real), no porque el
modelo real haya empeorado. `tsc`/`vitest` (68/68) verificados limpios
tras el despliegue.

## Notificación QA sin esperar un evento real (2026-09-01)

`src/app/_components/qa-test-meal-notification.tsx` — botón que dispara
`notifyMealEvent()` directo (mismo código de producción), solo visible en plataforma nativa
(Capacitor), para poder probar la notificación de "comió"/"le sirvieron" sin esperar horas a
que aparezca un evento real. Montado en `today/page.tsx`.

**Verificación en dispositivo real — parcial**: se armó un AVD (`Pixel_7`), se compiló el APK
(`gradlew assembleDebug`, JDK 21 embebido de Android Studio) y se instaló/lanzó correctamente
contra el dev server local (`CAPACITOR_SERVER_URL=http://10.0.2.2:3000`). Log confirmado:
Capacitor conecta al server, registra los plugins (incluido `LocalNotifications`), la actividad
se muestra y queda en foreground sin crashear. **No se pudo confirmar visualmente el banner de
notificación ni completar el login** — el emulador (con y sin ventana, con software rendering)
se volvió gráficamente inestable en este entorno (ANR de System UI, framebuffer en negro) — es
una limitación del entorno de este agente (sin aceleración gráfica real para el emulador), no
un defecto de la app. Pendiente: correr el botón de QA en un dispositivo real o un emulador con
GPU en la máquina de Mauro/Javier.

## Decisión 7 — Guardia física post-hoc: "alimentación" exige peso bajando (2026-08-30)

Encontrado en producción (no hipotético): revisando eventos reales de KPCL0034 apareció un
candidato con `delta_neto_real = +22g` (el peso **subió**) clasificado como `alimentacion`. Comer
nunca sube el peso del plato — es una contradicción física que la distancia-a-centroide no puede
detectar por sí sola (mira las 5 features en conjunto, no fuerza el signo de una en particular).

Se verificó contra los datos reales (`candidatos_clusters_duracion.csv` + `categoria_real.csv`,
KPCL0034): **~11% de los candidatos** que caen en el cluster de alimentación por distancia tienen
`delta_neto_real >= 0`. Se agregó una guardia en `clasificador.ts`: si la categoría asignada por
distancia es `alimentacion` pero `delta_neto_real >= 0`, redirigir con el **mismo umbral ya
calibrado** del refinamiento (20g) — sin inventar un número nuevo, reutilizando la calibración
existente (`calibracion.guardia_alimentacion`).

**Mejora medida contra las 743+37 anotaciones reales** (antes → después de la guardia; estos
números se **recalculan siempre desde los datos actuales**, nunca hardcodeados — bug corregido
el mismo día: la primera versión del script sí los tenía pegados como constantes, quedaban
desactualizados cada vez que se promovían más veredictos manuales):

| Métrica | Sin guardia | Con guardia |
|---|---|---|
| Accuracy global | 81.0% | **86.4%** |
| Pureza cluster alimentación | 75.3% | **85.9%** |
| Recall servido | 67.4% | **91.8%** |
| Recall ruido | 71.0% | **79.6%** |

Verificado en vivo (servidor local, cuenta `kittypau.mascotas`): el evento real del 30-ago 02:53
(`+22g`) pasó de `alimentacion` a `servido` (categoría real confirmada: servido) sin afectar
ningún otro evento. Calibración regenerada vía `exportar_calibracion_produccion.py`
(`version: 2026-08-30-v2`), tests nuevos en `clasificador.test.ts` con 2 exemplares reales del
conjunto redirigido. Los centroides/umbrales no cambian al promover más veredictos (clustering es
no supervisado, no depende de las etiquetas) — solo las métricas de confianza reportadas.

## Verificación

- `npx tsc --noEmit`: sin errores.
- `npx eslint` sobre los archivos tocados: sin errores.
- `npx vitest run`: 54/54 tests (motor-alimentacion/ + hunger-bar.test.ts preexistentes, todos
  verdes en cada iteración).
- `npm run build`: build de producción de Next.js.
- Verificado en vivo con `npm run dev` + Playwright, logueado como `kittypau.mascotas@gmail.com`
  (Bandida, datos reales): card "Detectado por modelo", Barras Sims con última/próxima comida,
  gráfico con carriles fijos e íconos en su hora correcta, tooltip simplificado, sin errores de
  consola. Ya no pendiente — hecho en varias rondas a medida que se fueron encontrando y
  corrigiendo bugs reales (ver Decisión 6, punto 4).
