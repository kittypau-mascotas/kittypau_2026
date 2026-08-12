---
id: spec_03_objetivos_monitoreo
title: SPEC 03 — Objetivos como app de monitoreo de alimentación e hidratación
type: spec
status: draft
owner: Mauro
created: 2026-08-11
updated: 2026-08-12
tags:
  - spec
  - producto
  - alimentacion
  - hidratacion
  - roadmap
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[01_Proyecto/DOC_MAESTRO_DOMINIO]]
  - [[05_API/SPEC_HungerBar_Alimentacion]]
  - [[05_API/SPEC_HungerBar_Alertas]]
  - [[10_Datasets/README_Datasets]]
---

# SPEC 03 — Objetivos como app de monitoreo de alimentación e hidratación

> Pilar 2 (hidratación) verificado en código: la card de `/today` (`buildWellnessState()`)
> ya usa copy honesto basado en `audit_events`, no un número inventado. Pilar 1 y Pilar 4:
> se intentó sumar métricas al panel "Barras Sims" y **se revirtió a pedido de Mauro** — ver
> [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] antes de volver a proponer algo ahí.

> Kittypau se vende como monitoreo de alimentación **e hidratación**. Este spec mide, pilar
> por pilar, qué tan cierto es eso hoy — con evidencia (código + investigación), no
> aspiración. El principio es el mismo que ya rige `hunger-bar.ts`: **ninguna métrica o
> promesa de producto se sostiene sin datos reales detrás** ([[05_API/SPEC_HungerBar_Alimentacion]] §0).

---

## Marco: 4 pilares de un producto de monitoreo

Un producto de monitoreo de mascotas — no un dashboard de sensores — tiene que responder 4
preguntas para el dueño, en este orden de importancia:

1. **¿Está comiendo/bebiendo lo que debería?** (detección + comparación contra lo normal)
2. **¿Debería preocuparme ahora mismo?** (alertas, umbrales, urgencia)
3. **¿Cómo ha sido su patrón en el tiempo?** (historial, tendencias, contexto)
4. **¿Puedo confiar en lo que estoy viendo?** (salud del sensor, frescura de datos, honestidad del "sin datos")

---

## Pilar 1 — Alimentación: 🟢 cobertura real, con huecos conocidos

**Lo que existe y está respaldado por datos:**
- Hunger Bar v1 en producción (`/today`, `/pet`) — detección de comidas por reglas
  calibradas contra 254+ comidas anotadas reales de KPCL0034, mediana de intervalo real
  (5.78h), clamps de display en percentiles reales (P10/P90). Ver
  [[05_API/SPEC_HungerBar_Alimentacion]].
- Alerta visual ≥2h de atraso + color continuo de la barra (v1.1). Ver
  [[05_API/SPEC_HungerBar_Alertas]].
- Motor Matemático v2 (102 features, Evidence Engine 78.8% accuracy held-out) existe y
  está calibrado, pero **no está portado a producción** — la barra usa un clasificador de
  reglas simples (v1, decisión B' documentada), no el motor real.

**Huecos conocidos, ya documentados en la spec de hunger bar:**
- No distingue picoteo (varias comidas cortas seguidas) de una sola comida grande.
- No usa el modelo circadiano (horas pico reales de Bandida) — solo mediana de intervalo.
- No usa `servido` (plato recién llenado) como señal secundaria de "probablemente coma
  pronto".
- Calibrado solo sobre KPCL0034 — sin validar que generaliza a los otros 8 dispositivos en
  campo (sensores/tazones distintos).

**Veredicto:** el pilar de alimentación es el único de los 4 que puede decir honestamente
"esto está midiendo lo que dice medir, con evidencia". Es el modelo a seguir para
hidratación.

---

## Pilar 2 — Hidratación: 🔴 el gap real del producto

**Lo que existe:**
- Card "Hidratación" en `/today`, con datos de un `device_type` bebedero (KPCL0034 en la
  cuenta tester actual, ver [[18_UI/README_UI]]) — muestra volumen (`water_ml`), pero
  con la etiqueta **"Sin evidencia real"** visible en producción hoy.
- Columna `water_ml` y `flow_rate` existen en el schema de `readings` (confirmado en
  [[10_Datasets/README_Datasets]] al inspeccionar las columnas reales del CSV).
- El indicador "💧 Hidratación" del Panel Sims de investigación (Tab 8) es
  **`_sims_agua = 70.0` — un valor fijo, no calculado**, con el comentario explícito en el
  propio código: `"sin datos directos — valor estimado"`.

**Lo que NO existe:**
- **Cero investigación dedicada a hidratación en `fase_0_ruido/`.** Toda la
  taxonomía/anotación/Motor Matemático (`alimentacion`/`servido`/`ruido`, 102 features, 527
  anotaciones) está construida sobre la señal de **peso** de un comedero. No hay un
  equivalente "candidatos de bebida", ni anotaciones de eventos de hidratación, ni features
  calibradas sobre `water_ml`/`flow_rate`.
- Sin ese trabajo, **no existe una "barra de hidratación" real que se pueda construir hoy**
  con el mismo rigor que la de alimentación — cualquier intento sería inventar constantes
  sin respaldo, exactamente lo que la regla del proyecto de fundamentar toda constante
  nueva contra `fase_0_ruido` antes de inventarla prohíbe.

**Veredicto:** este es el gap de producto más grande respecto a la promesa "alimentación e
hidratación". No es un bug ni una tarea de UI — es que **la investigación de hidratación
todavía no se hizo**. Recomendación concreta abajo.

### Roadmap propuesto para cerrar el gap

1. **Fase 0 (investigación, análoga a `fase_0_ruido` pero para agua):** con datos reales de
   un bebedero KPCL con sensor de flujo/nivel, repetir el proceso que ya funcionó para
   comida: candidatos → anotación manual → features → calibración. No hay atajo honesto.
2. ✅ **Hecho (2026-08-11):** la card de Hidratación en `/today` (y el bar de Agua del panel
   Barras Sims, misma fuente `buildWellnessState()`) ahora dicen explícitamente "Sin modelo
   de detección todavía" en vez de "Sin evidencia real" cuando no hay sesión confirmada —
   comida mantiene su copy original (sí tiene Hunger Bar calibrado). Mismo principio de copy
   honesto que [[29_Specs/SPEC_02_UIUX_Mejoras]] U6 recomienda para toda la app.
3. **No portar el `_sims_agua = 70.0` a producción bajo ninguna forma** — es un placeholder
   de investigación, no una métrica.

---

## Pilar 3 — Alertas / urgencia: 🟢 comida cubierta con push real, resto sigue angosto

> ✅ **Hecho (2026-08-12):** la alerta visual de comida ahora también dispara una
> notificación push local (Capacitor `LocalNotifications`, agendada para
> `estimatedNextMealAt + ALERT_THRESHOLD_HOURS`) — el usuario ya no necesita tener la app
> abierta para enterarse. Ver [[05_API/SPEC_HungerBar_Alertas]] §6.1 para el detalle técnico
> y una nota de contexto: esto revierte una exclusión explícita que tenía el doc de v1.1
> ("sin push, según lo decidido") sin que encontráramos el porqué documentado en otro lado
> — confirmar que la reversión es intencional. **No verificado en dispositivo/APK real**,
> solo en el no-op web (sin emulador Android disponible en esta sesión).

Sigue sin cubrir: hidratación (bloqueado por el gap del pilar 2 — no hay barra que
alertar) y salud del dispositivo (batería baja, offline prolongado — existe la lógica de
estado en `/bowl`, pero nada dispara push todavía; sería la misma extensión del hook
`useHungerBarPushAlert` aplicada a `device-diagnostics.ts` en vez de a `hunger-bar.ts`).

---

## Pilar 4 — Confianza en los datos: 🟡 bien resuelto en un lugar, ausente en el resto

Ver desarrollo completo en [[29_Specs/SPEC_02_UIUX_Mejoras]] U2. Resumen para este spec: el
panel "Diagnóstico rápido" de `/bowl` (Conexión/Energía/Firmware + acciones recomendadas)
es exactamente lo que un producto de monitoreo necesita para que el usuario confíe en lo
que ve — y hoy solo vive en una pantalla. `/today` y `/pet` muestran "N/D" o "Sin evidencia
real" sin ese mismo nivel de explicación. Un producto de monitoreo que no distingue entre
"tu mascota no comió" y "tu sensor no está reportando" pierde la confianza del usuario en
el primer falso negativo.

---

## Resumen ejecutivo — estado real de la promesa de producto

| Pilar | Estado | Bloqueante principal |
|---|---|---|
| Alimentación | 🟢 Real, calibrado, en producción | Falta portar el Evidence Engine completo (v2) y agrupar picoteo |
| Hidratación | 🔴 No investigado | Falta una "fase_0" de investigación de agua — no es tarea de ingeniería de producto, es de investigación primero |
| Alertas | 🟢 Comida: visual + push. Sin cubrir: hidratación, salud del dispositivo | Push de comida no verificado en APK real; hidratación bloqueada por el gap del pilar 2 |
| Confianza en los datos | 🟡 Buen patrón aislado en `/bowl` | Falta generalizar el "Diagnóstico rápido" a `/today` y `/pet` |

**La app hoy cumple su promesa de "monitoreo de alimentación" de forma razonable. No cumple
todavía su promesa de "monitoreo de hidratación" — ahí la brecha es de investigación, no
de ingeniería, y debería tratarse como tal en el roadmap (no asignarla a un sprint de
frontend esperando que "se resuelva sola" copiando la lógica de comida sobre datos de
agua sin calibrar).**

---

## Ver también

- [[05_API/SPEC_HungerBar_Alimentacion]] — el pilar que sí funciona, como plantilla de rigor
- [[05_API/SPEC_HungerBar_Alertas]] — alertas v1.1, único disparador de urgencia hoy
- [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] — qué otras métricas de la investigación de comida sí se pueden traer ya
- [[29_Specs/SPEC_02_UIUX_Mejoras]] — desarrollo de U2/U6 (diagnóstico y copy honesto)
- [[10_Datasets/README_Datasets]] — confirma que no hay dataset de hidratación anotado
