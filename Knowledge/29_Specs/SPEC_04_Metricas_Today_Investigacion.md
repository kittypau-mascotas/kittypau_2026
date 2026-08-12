---
id: spec_04_metricas_today_investigacion
title: SPEC 04 — Métricas de /today desde la investigación
type: spec
status: draft
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - spec
  - metricas
  - today
  - motor-matematico
  - investigacion
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[13_Features/README_ShapeFeatures]]
  - [[11_ModelosIA/MODEL_EvidenceEngine]]
  - [[05_API/SPEC_HungerBar_Alimentacion]]
  - [[29_Specs/SPEC_03_Objetivos_Monitoreo]]
---

# SPEC 04 — Métricas de /today desde la investigación

> ⚠️ **"Rutina" y "Datos frescos" ya se intentaron sumar al panel "Barras Sims" de `/today`
> y Mauro pidió revertirlo por completo, sin dar razones puntuales** (el código se sacó
> entero: backend en `hunger-bar.ts`, UI en `today/page.tsx`). Es la tercera vez que se
> revierte un cambio a ese widget específico en el historial del proyecto (ver también
> `#18`, `#20` en `git log`). **No volver a proponer cards nuevas en "Barras Sims" sin
> preguntar primero** — el resto de este spec sigue siendo guía válida para el resto de la
> app, solo ese widget puntual está fuera de límites sin confirmación explícita.

> Regla de este spec, sin excepción: **toda métrica propuesta cita de dónde sale el número**
> — qué archivo de `fase_0_ruido/`, qué fórmula, sobre cuántas anotaciones. Si no hay una
> fórmula real detrás, se marca explícitamente como "no respaldada" y no se recomienda para
> producción. Mismo estándar que ya se aplicó a `hunger-bar.ts`
> ([[05_API/SPEC_HungerBar_Alimentacion]] §0).

---

## 0. La fuente: Panel de Bienestar (Tab 8, `app_anotacion_av2.py`)

La app de investigación ya tiene un prototipo de **10 indicadores 0–100%** calculado en vivo
sobre los datos reales de Bandida (`_SIMS_BARS`, líneas ~4718-4834 de
`app_anotacion_av2.py`). Es, literalmente, el borrador de lo que este spec recomienda llevar
a `/today`. Hoy `/today` en producción solo implementa 2 de los 10 (Comida real vía Hunger
Bar; Agua como placeholder sin cálculo — ver [[29_Specs/SPEC_03_Objetivos_Monitoreo]] Pilar 2).

---

## 1. Clasificación honesta: qué se puede portar tal cual, qué necesita trabajo, qué no se debe portar

### 🟢 Grupo A — Respaldadas por datos reales, portables con ajuste menor

| Métrica | Fórmula (tal como está en Tab 8) | Fuente de calibración |
|---|---|---|
| **Hambre** | `100 − (h_desde_última_comida / mediana_intervalo × 100)`, clamped [0,100] | Ya portada como Hunger Bar v1 — [[05_API/SPEC_HungerBar_Alimentacion]] §2 |
| **Saciedad** | `comidas_hoy / (24 / mediana_intervalo)`, clamped a 100 | Misma base de datos que Hambre |
| **Energía** | Alias de Actividad (`comidas_hoy / mediana_diaria`) | Redundante con Actividad tal cual está definida hoy en Tab 8 — **no portar las dos, fusionar en una sola métrica antes de llevarla a producción** (ver §3) |

> Rutina y Datos frescos también son 🟢 Grupo A por fórmula/datos (ver historial de este
> doc), pero **ya se implementaron y se revirtieron a pedido de Mauro** — no re-proponer sin
> confirmar primero (ver nota al inicio del documento).

### 🟡 Grupo B — La idea es buena, la fórmula actual es un proxy débil que necesita más trabajo antes de producción

| Métrica | Qué mide hoy | Por qué no portar tal cual |
|---|---|---|
| **Sueño/reposo** | `100 − % de lecturas con variación > 1g en las últimas 8h` | Es un proxy de "el plato no se movió", no de sueño real — un plato quieto puede significar tanto "durmiendo" como "no está cerca del plato". Sin sensor de movimiento/presencia, esta métrica mide *inactividad del comedero*, no *inactividad de la mascota*. Renombrar a algo honesto como "Quietud del plato" si se porta, no "Sueño". |
| **Apetito** | `Δpeso_promedio_última_semana / Δpeso_histórico × 100` | Fórmula razonable, pero solo tiene sentido comparando semanas con cobertura de datos similar — con gaps de sensor (dispositivo offline unos días) el promedio semanal se distorsiona sin que sea una señal real de apetito. Necesita el mismo tipo de filtro de outliers que ya tiene el cálculo de intervalos (`MIN_INTERVALO_H`/`MAX_INTERVALO_H`, ver hunger bar §2). |
| **Salud general** | Media simple de Hambre+Saciedad+Actividad+Rutina+Apetito | Es un promedio sin ponderar, no una fórmula validada contra ningún resultado clínico o de comportamiento real — usar como "resumen visual" está bien, pero **no presentarlo como un score de salud real** al usuario (evitar el término "salud" sin más contexto — ver §3 sobre naming). |

### 🔴 Grupo C — No respaldadas, no portar sin investigación previa

| Métrica | Por qué no |
|---|---|
| **Hidratación** | `_sims_agua = 70.0` — literalmente un número fijo en el código, con el propio comentario `"sin datos directos — valor estimado"`. Cero investigación de hidratación existe en `fase_0_ruido/` (ver [[29_Specs/SPEC_03_Objetivos_Monitoreo]] Pilar 2). Portar esto sería mostrarle al usuario un número inventado presentado como medición — exactamente lo que las reglas del proyecto prohíben. |

---

## 2. Métricas NUEVAS que la investigación ya soporta pero que Tab 8 no expone todavía

Estas no están en el Panel Sims actual, pero sí hay features/datos reales en
`fase_0_ruido/` que las respaldan:

### M1 — "Confianza del sensor" (% de eventos que el detector descarta como ruido)

**Fuente:** de 527 anotaciones en vivo, 207 (39.3%) son categoría `ruido` — eventos
detectados por el algoritmo de candidatos que un humano confirmó que NO son ni comida ni
servido (movimiento, error de sensor). Esta tasa varía si el sensor está mal calibrado, el
entorno tiene interferencia, u otra mascota/objeto toca el plato.

**Propuesta:** exponer un indicador simple ("de las últimas N lecturas con actividad,
X% fueron descartadas como ruido") como parte del panel de "Diagnóstico rápido" (§U2 en
[[29_Specs/SPEC_02_UIUX_Mejoras]]), no como parte del bienestar de la mascota — es una
métrica de **calidad del sensor**, no de la mascota.

**Riesgo:** requiere correr el detector de candidatos (`01_genera_candidatos.py`, o su
equivalente TypeScript si se porta) sobre la ventana reciente en producción — no es gratis,
hay que decidir la misma arquitectura A/B/B'/C que ya se discutió y resolvió para Hunger Bar
(ver [[05_API/SPEC_HungerBar_Alimentacion]] §1.1). No reabrir esa decisión — reusar B'
(reglas simples en TypeScript) si esto se implementa.

### M2 — "Estilo de alimentación" (rápido vs. gradual) usando templates F12

**Fuente:** `tpl_alim_escalonada` (alimentación en escalones) vs. `tpl_alim_lenta` vs.
`tpl_serv_brusco`/rampa rápida son features ya calibradas en `shape_features_v2.py`
([[13_Features/README_ShapeFeatures]]) que distinguen la *forma* de la curva de consumo, no
solo cuánto y cuándo. Una mascota que come en escalones lentos vs. una que vacía el plato de
un tirón tiene un patrón de comportamiento distinto y potencialmente relevante (comer
ansioso/rápido es un signo que los dueños de mascotas sí monitorean).

**Propuesta:** no como barra 0-100%, sino como un tag descriptivo en la card de comida:
"Bandida suele comer gradual" / "Bandida suele comer rápido" — calculado sobre el template
dominante de sus últimas N comidas clasificadas. Menor prioridad que M1, pero es el tipo de
insight que **solo esta investigación puede dar** (nadie más tiene 102 features calibradas
sobre la forma de la curva de peso).

### M3 — "Comidas fuera de patrón" usando la auditoría de discrepancias

**Fuente:** `data/auditoria_discrepancias.csv` (v2.4, 88/496 = 17.7% de discrepancias motor↔
humano con ≥85% de confianza) es, en esencia, un detector de casos ambiguos/atípicos. La
misma lógica — "esta lectura no se parece a ninguna categoría con confianza alta" — es
exactamente la señal que un usuario querría ver resaltada: *"esta comida fue distinta a lo
usual, revisar"*.

**Propuesta:** de más largo plazo que M1/M2 — requiere que el clasificador en producción
tenga un modo "baja confianza" visible, no solo una clasificación binaria. Anotarlo como
research item, no como tarea de sprint.

---

## 3. Reglas de naming y presentación (para no repetir el error de "Hidratación: 70%")

1. **Nunca mostrar un número calculado sin decir de qué está hecho.** Cada barra nueva en
   `/today` debe tener un tooltip/caption con la fórmula en lenguaje simple — el propio Tab 8
   ya hace esto (`title="Tiempo desde última comida vs intervalo normal"`), es gratis
   copiarlo.
2. **No usar la palabra "Salud" para un promedio no validado.** Renombrar a algo como
   "Resumen del día" o "Vista general" si se porta la métrica compuesta del Grupo B.
3. **Fusionar Actividad y Energía antes de portar** — son la misma fórmula hoy en Tab 8,
   mostrarlas como 2 barras separadas sería redundante y no es un descuido menor: en un
   panel de solo 10 slots, cada barra redundante desplaza una que sí aportaría información
   nueva.
4. **Cualquier métrica calibrada solo sobre KPCL0034 debe decirlo** si se muestra para otro
   dispositivo, mismo caso borde que ya documenta
   [[05_API/SPEC_HungerBar_Alimentacion]] §3 ("Calibración específica de un dispositivo").

---

## 4. Qué queda pendiente de portar

Candidatos que siguen abiertos, sin implementar todavía:

| Métrica | Grupo | Nota |
|---|---|---|
| M1 — Confianza del sensor | Nuevo | Ataca directo el Pilar 4 (confianza en los datos) de [[29_Specs/SPEC_03_Objetivos_Monitoreo]], que es un gap transversal a toda la app. Requiere decidir arquitectura (reusar B', ver §2) |
| Apetito (con el fix de outliers de §1 Grupo B) | 🟡 B | Alto valor percibido, condicionado a resolver el filtro de gaps primero |

**Fuera de alcance:** Hidratación (bloqueada por Pilar 2 de SPEC 03 — no hay investigación),
Sueño/reposo (renombrar antes de mostrar, ver Grupo B), Salud general (esperar a tener más
indicadores reales), y **cualquier card nueva en el panel "Barras Sims"** sin confirmar
primero (ver nota al inicio del documento).

---

## Ver también

- [[29_Specs/SPEC_03_Objetivos_Monitoreo]] — qué gap de producto ataca cada métrica
- [[05_API/SPEC_HungerBar_Alimentacion]] — precedente exacto de este mismo proceso, ya implementado
- [[13_Features/README_ShapeFeatures]] — familias F00–F14, base de M2
- [[15_Resultados/RESULT_AlphaV2_Snapshots]] — snapshot v2.4, fuente de M3 (auditoría de discrepancias)
- `Docs/09_Investigacion/Ciclo Alpha v2/fase_0_ruido/app_anotacion_av2.py` — Tab 8 "Kittypau", líneas ~4660-4840, fuente de todas las fórmulas de este spec
