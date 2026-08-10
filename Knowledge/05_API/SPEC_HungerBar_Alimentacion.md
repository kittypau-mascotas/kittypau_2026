---
id: spec_hunger_bar_alimentacion
title: SPEC — Hunger Bar (barra de hambre)
type: spec
status: v1-implementado
owner: Mauro
created: 2026-08-10
updated: 2026-08-10
tags:
  - feature
  - hunger-bar
  - api
  - evidence-engine
related:
  - [[00_HOME]]
  - [[05_API/README_API]]
  - [[06_BaseDatos/README_BaseDatos]]
  - [[11_ModelosIA/MOC_ModelosIA]]
  - [[11_ModelosIA/MODEL_EvidenceEngine]]
  - [[13_Features/README_ShapeFeatures]]
---

# SPEC — Hunger Bar (barra de hambre)

> v4 — post 3 rondas de discovery técnico + implementación v1 en producción.

**Estado: v1 implementada y visible en `/pet`** (2026-08-10). La decisión bloqueante de
arquitectura (§1.1) se resolvió de forma pragmática: **reglas simples en TypeScript**
(opción B liviana), no el Motor v2/Evidence Engine completo — ver §0 y §1.2.

## 0. Qué se implementó (v1) vs. qué sigue pendiente

| Pieza | Estado |
|---|---|
| `kittypau_app/src/lib/hunger-bar.ts` | ✅ Detección de segmentos + clasificación por reglas + cálculo de la barra |
| `kittypau_app/src/app/api/pets/[id]/hunger-bar/route.ts` | ✅ Endpoint, on-demand sobre `readings`, sin tabla intermedia |
| `kittypau_app/src/app/_components/hunger-bar-card.tsx` | ✅ UI, montada en `/pet` (solo si hay comedero activo) |
| Clasificación por Motor v2 / Evidence Engine real | ❌ v1 usa reglas de magnitud/dirección/duración, no las 23 features calibradas — ver §1.2 |
| Uso de `servido` como señal secundaria (§4) | ❌ se detecta pero no se usa para ajustar la predicción |
| Modelo circadiano | ❌ v1 usa solo mediana de intervalos, no franjas horarias |
| Agrupar picoteo (comidas seguidas) | ❌ no implementado — cada segmento cuenta como comida independiente |

## 0.1 Números reales usados para calibrar v1

Recalculados directamente desde `anotaciones_av2.csv` (254 eventos de alimentación,
2026-04-08 a 2026-07-10, 93 días de cobertura, 73 días con ≥1 comida registrada):

| Métrica | Valor real |
|---|---|
| Comidas/día (días con datos) | media **3.48**, mediana **4**, rango 1–6 |
| Comidas/semana (derivado) | ≈ 24–29 (media×7 ≈ 24.4; mediana×7 = 28) |
| Mediana intervalo entre comidas | **5.78 h** (constante `FALLBACK_MEDIANA_H`) |
| Media intervalo | 6.69 h |
| IQR (P75−P25) | 4.47 h (P25=3.8h, P75=8.27h) |
| P10 / P90 | **2.88 h / 12.02 h** → constantes `CLAMP_MIN_H`/`CLAMP_MAX_H` |
| Horas pico reales | 19h, 05h, 16h, 10h, 17h, 06h, 07h, 09h (más repartido de lo que decía la doc vieja de "07/13/19h" — esa cifra no se sostiene contra los datos reales) |

Estos valores viven como constantes documentadas en `hunger-bar.ts`, no hardcodeados
sin explicación.

---

## Decisión ya tomada: fuente de datos

Fuente primaria = `readings`, cálculo **on-demand** (no tabla pre-agregada). Se descartaron
las otras dos candidatas del schema real:

| Fuente | Por qué NO |
|---|---|
| `device_bowl_sessions` | Requiere marcado manual vía `audit_events`; el rebuild que la puebla no corre automático. No sirve para "se llena sola". |
| `pet_sessions` (DB analytics) | Documentada por el propio proyecto como legado/no-core (`PLAN_MEJORA_PRIORIZADO.md`); degrada a `[]` si faltan credenciales; `classify(zScore)` detecta magnitud anómala contra baseline propio, **no distingue comida real de ruido** (gata olfateando/pisando el plato); sin flag de confianza; umbral fijo (`SESSION_THRESHOLD_G=5`, `±1.5σ`) sin calibración documentada. |
| `readings` + threshold simple (portar `processor.js`) | Mismo problema que `pet_sessions`: no distingue comida de ruido, solo que sin el z-score de magnitud. |
| **`readings` + Motor v2 / Evidence Engine (elegida)** | Tabla core activa, sin dependencia externa. Detección calibrada contra 417 anotaciones reales de KPCL0034, separabilidad alta comida/servido/ruido. Ver [[11_ModelosIA/MODEL_EvidenceEngine]]. |

---

## 1. Detección de "comida real"

Pipeline de dos etapas sobre `readings`:

1. **Candidatos** — misma lógica de `01_genera_candidatos.py`: segmentos de actividad
   sostenida (`rolling_std_min`, `delta_g_min`, `min_duration_s`, fusionando gaps
   `gap_fusion_s < 120s`). Clasifica cada segmento en `bajada` / `subida` / `mixto` por
   dirección dominante del delta.
2. **Clasificación** — sobre cada segmento `bajada`, correr `extraer_features()` +
   `evidence_score()` de `shape_features_v2.py`:
   ```python
   score = evidence_score(señal)
   # → {"alimentacion": 0.82, "servido": 0.07, "ruido": 0.11}
   ```
   Mejor discriminador: `tpl_doble_rampa` — separación alim. vs. servido reportada en
   `[[11_ModelosIA/MODEL_EvidenceEngine]]` (verificar cifra exacta antes de citarla: la
   spec de origen decía 7.32σ, el MOC de modelos dice 7.63σ — **discrepancia sin resolver
   entre documentos, confirmar con el CSV de origen antes de publicar el número**).
   Solo cuenta como "comida real" si `alimentacion` supera el umbral de confianza de §6.2.
   `subida` (servido) y baja confianza en cualquier categoría se descartan del cálculo de
   la barra pero quedan como señal secundaria (§4).

Esto reemplaza la necesidad de portar `SESSION_THRESHOLD_G`/z-score de `processor.js`.

### 1.1 Decisión de arquitectura — resuelta para v1

`shape_features_v2.py` es Python (numpy/scipy), vive en el workspace de investigación, no
integrado en la app (`ESTADO_ACTUAL.md`: *"Modelo ML en producción: 🔴 Pendiente"*). El
backend de producto es Next.js/TypeScript.

| Opción | Trade-off |
|---|---|
| **(A) Microservicio Python** | Reusa el código tal cual, más rápido de tener andando. Agrega infraestructura nueva a deployar/mantener (¿Vercel? ¿Raspberry? ¿servicio aparte?). |
| **(B) Port a TypeScript** — completo (23 features + softmax calibrado) | Sin infraestructura nueva. Riesgo de diferencias sutiles vs. la versión calibrada. No implementado. |
| **(B') Port a TypeScript — reglas simples (elegida para v1)** | Magnitud + dirección + duración contra los rangos ya documentados en la taxonomía (`alimentacion`: baja 3–25g en 1.5–15min; `servido`: sube ≥15g rápido). Cero infraestructura nueva, cero riesgo de puerto de numpy. Techo conocido: no separa comida real de ruido tan bien como el Evidence Engine calibrado (~7σ de separación medida) — puede sub/sobre-contar en casos ambiguos. |
| **(C) Job batch** | Un cron/Python recalcula candidatos + scores periódicamente y escribe a una tabla Supabase nueva; la API solo lee. Menor acoplamiento en tiempo real, pero agrega latencia contra el objetivo de "barra que se llena apenas come". |

**Decisión tomada:** (B') para v1 — implementado en `kittypau_app/src/lib/hunger-bar.ts`.
Ship-now sobre esperar el port completo del Evidence Engine (que sigue bloqueado en A/B/C
si se quiere subir de nivel más adelante). Marcado explícitamente como simplificación
ponytail en el código, con el upgrade path documentado ahí mismo.

#### 1.2 Cómo detecta v1 (implementado)

Mismo espíritu que el pipeline de dos etapas de arriba, pero sin el Evidence Engine:

1. **Detección de segmento** — state machine idle/active, variante batch del algoritmo de
   `bridge/src/processor.js`, con una corrección: el ancla de comparación usa una ventana
   rezagada de **8 minutos** (no la lectura inmediatamente anterior) — necesario porque una
   bajada real es gradual (5-15g en 4-8min) y con lecturas frecuentes cada paso individual
   queda muy por debajo del umbral de apertura (5g). Comparar contra una ventana también
   promedia el ruido aleatorio del sensor en vez de perseguirlo paso a paso. Este bug se
   encontró y corrigió con un smoke test antes de mergear — ver el archivo para el detalle.
2. **Clasificación por reglas** (no Evidence Engine): dirección + magnitud + duración del
   segmento cerrado, con scoring triangular (0-1) sobre qué tan centrado está en el rango
   típico documentado. Es un *proxy* de confianza, no el score real del motor calibrado.

---

## 2. Fórmula de la barra

- **100%** = instante en que un segmento `bajada` es clasificado como `alimentacion` con
  confianza suficiente (§6.2).
- **Próxima comida estimada** = mediana de los intervalos entre las últimas *N* comidas
  clasificadas como `alimentacion` del dispositivo, filtrado por `pet_id` (no solo
  `device_id` — ver casos borde §4).

  **Valores reales medidos** (tab Predictor de `app_anotacion_av2.py`, sobre 254 comidas
  anotadas de KPCL0034 "Bandida"): **mediana = 5.78 h**, **IQR = 4.47 h**, 249 intervalos
  válidos.

  Filtro de outliers para calcular esta mediana histórica — **ya resuelto**, reusa las
  constantes de módulo corregidas en [`app_anotacion_av2.py:574-575`](../../../Docs/09_Investigacion/Ciclo%20Alpha%20v2/fase_0_ruido/app_anotacion_av2.py):
  `MIN_INTERVALO_H = 0.33` (20 min, descarta comida partida en dos) y
  `MAX_INTERVALO_H = 36.0` (descarta gaps de datos/ausencia del dueño). El endpoint de
  producción debe reusar estos mismos valores, no redefinir un clamp propio para este
  propósito.

- **Fallback** sin historial suficiente (mascota recién vinculada): usar la mediana global
  medida (**5.78h**) como default hasta acumular *N* comidas propias. **Implementado:**
  `N_MIN_MUESTRAS = 5` (`hunger-bar.ts`).
- **Clamp de display para la barra en vivo** — pregunta distinta del filtro de outliers de
  arriba: evita mostrar "próxima comida en 36h" o "en 20 min" como número creíble.
  **Implementado** con los P10/P90 reales de §0.1: `CLAMP_MIN_H = 2.88`, `CLAMP_MAX_H =
  12.02` (antes eran un rango 2h-12h adivinado — ahora son los percentiles reales).
- **Modelo circadiano** (picos horarios históricos) ya existe en `app_anotacion_av2.py` y
  es más preciso para esta gata porque su rutina sigue el horario del dueño más que un
  intervalo fijo. Decisión mediana vs. circadiano para v1: §6.8.
- **Fórmula**:
  ```
  barra(t) = 100 × (1 − (t − última_comida_detectada) / intervalo_estimado)
  ```
  clamped a [0, 100].

---

## 3. Casos borde

- **Mascota recién vinculada, sin historial**: fallback de §2 hasta acumular *N* comidas
  detectadas (§6.3).
- **Dispositivo offline**: sin `readings` nuevas, ¿la barra sigue decayendo con el último
  intervalo conocido, o se pausa/muestra "sin datos"? — §6.5.
- **Reasignación de dispositivo entre mascotas**: el historial de intervalos se filtra por
  `pet_id`, no por `device_id` — cada relink en `devices` inserta una fila nueva
  (`created_at` = timestamp de vínculo, confirmado en discovery ronda 1), así que el corte
  temporal ya es resoluble sin trabajo de schema adicional.
- **Clasificación de baja confianza** (ningún score domina, ej. 0.4/0.35/0.25): no cuenta
  como comida ni resetea la barra, se descarta igual que `ruido`. Riesgo: subestimar
  comidas reales atípicas — monitorear tasa de descarte en producción.
- **Segmento `servido` detectado**: no llena la barra, pero es señal secundaria útil (plato
  recién rellenado → probablemente coma pronto). Usar o ignorar: §6.6.
- **Picoteo** (`bajada`/`alimentacion` seguidos): ¿se agrupan como una sola comida o varias?
  Impacta la mediana de intervalos. `gap_fusion_s=120` del pipeline de candidatos ya
  resuelve esto parcialmente a nivel de segmento — confirmar si aplica igual al agrupar
  comidas para la barra: §6.7.
- **Calibración específica de un dispositivo**: las 417 anotaciones y pesos del Evidence
  Engine están calibrados sobre KPCL0034. Sin evidencia de que generalicen a los otros 8
  dispositivos en campo (KPCL0031, 33, 35–41) — variaciones de sensor/tazón podrían correr
  las distribuciones. Validar antes de asumir que la barra funciona igual para todas las
  mascotas.

---

## 4. Contrato de API (implementado)

```
GET /api/pets/:petId/hunger-bar

Response 200:
{
  "status": "ok",                  // "ok" | "sin_datos" | "sin_dispositivo"
  "percentage": 78,                // 0-100, clamped (null si status != "ok")
  "lastMealDetectedAt": "2026-08-10T14:32:00Z",
  "lastMealConfidence": 0.82,      // proxy de regla (0-1), NO el score del Evidence Engine — ver §1.2
  "estimatedNextMealAt": "2026-08-10T20:15:00Z",
  "intervalUsedMinutes": 345,      // mediana propia o fallback (5.78h), ya clampeado a P10-P90
  "usingFallback": false,          // true si sampleSize < N_MIN_MUESTRAS (5)
  "sampleSize": 5                  // comidas "alimentacion" detectadas en la ventana de 10 días
}
```

Implementado en `kittypau_app/src/app/api/pets/[id]/hunger-bar/route.ts`, siguiendo el
patrón de auth/ownership de `/api/pets/[id]` y de paginación de `/api/readings/bucketed`
(ambos en [[05_API/README_API]]). Ventana de lectura: últimos 10 días de `readings` del
comedero activo de la mascota (paginado, tope ~60k filas).

---

## 5. Preguntas que quedaron resueltas con la implementación v1

1. ~~Arquitectura de integración del Motor v2~~ → **(B') reglas simples**, ver §1.1.
2. ~~Umbral de confianza~~ → v1 no filtra por umbral de confianza mínimo (cualquier
   segmento clasificado `alimentacion` por las reglas cuenta); el campo `lastMealConfidence`
   queda solo informativo. Si se quiere exigir un piso, es un cambio de una línea en
   `computeHungerBar()`.
3. ~~N mínimo de comidas~~ → `N_MIN_MUESTRAS = 5`.
4. ~~Clamp de display~~ → `CLAMP_MIN_H`/`CLAMP_MAX_H` = P10/P90 reales (2.88h/12.02h).
5. **Comportamiento offline** — sigue sin resolver explícitamente: v1 simplemente no
   encuentra comidas nuevas y sigue devolviendo la última detectada, así que la barra
   naturalmente "decae con el último intervalo conocido" (nunca se pausa ni muestra "sin
   datos" mientras haya al menos 1 comida histórica en la ventana de 10 días). Si el
   dispositivo lleva offline más de 10 días, cae a `status: "sin_datos"`.
6. **Uso de `servido` como señal secundaria** — sigue sin implementar (v2).
7. **Picoteo** — sigue sin implementar: cada segmento `alimentacion` cuenta como comida
   independiente, sin fusionar los separados por pocos minutos.
8. **Mediana vs. circadiano** → v1 usa solo mediana (más simple de portar), circadiano
   queda para v2.

Pendientes reales para subir de v1 a v2: **#6, #7, #8**, y el port real del Evidence Engine
si la tasa de falsos positivos/negativos del clasificador por reglas resulta muy alta en
producción (monitorear `sampleSize` y `usingFallback` por mascota).

---

## Ver también

- [[11_ModelosIA/MODEL_EvidenceEngine]] — motor de clasificación usado en §1
- [[13_Features/README_ShapeFeatures]] — `shape_features_v2.py`
- [[06_BaseDatos/README_BaseDatos]] — `readings`, `devices`, `device_bowl_sessions`
- [[05_API/README_API]] — convenciones de endpoints
- `Docs/09_Investigacion/Ciclo Alpha v2/fase_0_ruido/app_anotacion_av2.py` — tab Predictor
  de Próxima Comida (fuente de la mediana 5.78h/IQR 4.47h), `NameError` de `t_starts`
  corregido 2026-08-10
