---
id: spec_02_uiux_mejoras
title: SPEC 02 — Mejoras de UI/UX
type: spec
status: draft
owner: Mauro
created: 2026-08-11
updated: 2026-08-11
tags:
  - spec
  - ux
  - ui
  - accesibilidad
related:
  - [[00_HOME]]
  - [[29_Specs/README_Specs]]
  - [[18_UI/README_UI]]
  - [[18_UI/UX_DIAGNOSTICO_2026_06_30]]
  - [[29_Specs/SPEC_01_Errores_Prioritarios]]
---

# SPEC 02 — Mejoras de UI/UX

## Estado de implementación (2026-08-11, misma sesión)

| # | Estado | Nota |
|---|---|---|
| U1 | ✅ Implementado | `<AccessibleModal>` creado y aplicado — ver SPEC_01 E5 |
| U2 | ⏸️ Diferido | Extraer `<DiagnosticoRapidoCard>` de `/bowl` y reusarla en `/today`/`/pet` es un cambio de UI más grande (requiere decidir qué datos usa cada instancia) — no se hizo en esta pasada |
| U3 | ⏸️ Diferido | Generalizar el modal de onboarding a más pantallas — mismo motivo que U2 |
| I1 | ✅ Implementado | Selector de intervalo del header de `/bowl` eliminado — queda solo en el modal (que ya tenía la explicación) |
| I2 | ⏸️ Diferido | Skeletons de carga — cambio de UI amplio, no crítico |
| I3 | ✅ Ya estaba resuelto | El botón ya decía "Acciones", no "Ajustes" — el diagnóstico de junio estaba desactualizado en este punto |
| I4 | ✅ Implementado | `/settings` y `/pet` ahora usan `<form onSubmit>` real |
| I9 | ⏸️ Diferido | Persistir WiFi en `devices` en vez de `localStorage` requiere una migración de schema — no se hizo |
| I10 | ✅ Implementado | Opción "1 semana" (604 800 000 ms) eliminada del selector de intervalo de muestreo |
| Q4 | ✅ Implementado (bonus, no estaba en la lista original) | El menú "Acciones" de `/settings` ahora cierra al hacer clic afuera, mismo patrón que `AppNav` |
| Q6/Q7 | ✅ Implementado | Botones deshabilitados ahora dicen "(en roadmap)" con `title` explicando por qué, en vez de "(próximamente)" sin contexto |
| L-C1, L-C3 | ⏸️ Diferido | Refactor XL de `/login` (1924 líneas) — fuera de alcance de esta pasada |

Validado con `npm run type-check`, `npm run lint` y `npm run build`, más recorrido Playwright en vivo.

> No repite lo que ya es un **error** (eso vive en [[29_Specs/SPEC_01_Errores_Prioritarios]]).
> Esto es sobre subir el piso de calidad de lo que ya funciona, y sobre **patrones buenos
> que ya existen en un lugar de la app y no se usaron en el resto** — el hallazgo más
> valioso del recorrido de hoy no es "esto está mal", es "esto ya está bien resuelto acá,
> cópienlo allá".

---

## 1. Patrones que ya existen y deberían generalizarse

### U1 — El modal de registro de `/login` es el patrón de accesibilidad a copiar

`role="dialog"` + `aria-modal` + `aria-labelledby` + foco inicial + Escape + Tab-trap, ya
implementado y funcionando (2026-07-01). El modal de config de `/bowl` no lo tiene (ver
[[29_Specs/SPEC_01_Errores_Prioritarios]] E5). **Antes de escribir un patrón nuevo de modal
accesible, copiar este.** Candidato a extraer como `<AccessibleModal>` compartido en
`_components/` para que el próximo modal que se escriba lo herede gratis.

### U2 — El panel "Diagnóstico rápido" de `/bowl` es el mejor patrón de confianza-en-los-datos que tiene la app

Confirmado en vivo hoy: 3 columnas (Conexión/Energía/Firmware) + "Acciones recomendadas" en
lenguaje simple ("Todo estable. Mantén el plato conectado."). Es exactamente el tipo de
comunicación que un producto de monitoreo necesita en **todas** las pantallas con datos de
sensor, no solo `/bowl`. `/today` y `/pet` muestran datos "sin evidencia real" o "N/D" sin
ese mismo nivel de explicación accionable.

**Propuesta:** extraer `<DiagnosticoRapidoCard>` reusable y mostrarlo también en `/today`
(junto a la card de Alimentación/Hidratación) y en `/pet` (junto a "Platos asociados").

### U3 — El modal "MODO GUÍA" de onboarding en `/today` es un buen patrón sin continuación

Confirmado hoy: `/today` tiene un modal de bienvenida con tips + `Completar registro`. Es
justo el tipo de guía que el diagnóstico de junio (§8, "Gap: no hay flujo de onboarding
explícito") pedía — **ya se construyó**, buena señal. Pero es un modal aislado en una sola
pantalla: `/pet`, `/bowl` y `/story` no tienen su propio tip de bienvenida contextual, así
que un usuario nuevo que llega directo a `/pet` (ej. desde un link compartido) no recibe la
misma guía.

**Propuesta:** generalizar a un patrón `<OnboardingTip screen="pet|bowl|story">` con 1-2
tips específicos por pantalla, reusando el mismo componente modal de `/today`.

---

## 2. Deuda de UX aún abierta (heredada del diagnóstico de junio, re-priorizada)

Todo esto sigue en el código, sin evidencia de fix — ver metodología de verificación en
[[29_Specs/SPEC_01_Errores_Prioritarios]].

| # | Qué | Por qué importa | Esfuerzo |
|---|---|---|---|
| I1 | Selector de intervalo duplicado en `/bowl` (header + modal, mismo estado) | Confunde cuál usar | S |
| I2 | Loading en texto plano (`"Cargando estado..."`) sin skeleton en `/bowl`, `/settings`, `/pet` | Se siente más lento de lo que es | M |
| I3 | Botón "Ajustes" dentro de la página "Ajustes" en `/settings` | Nombre redundante, confuso | XS |
| I4 | Forms sin `<form onSubmit>` en `/settings` y `/pet` — Enter no guarda | Rompe expectativa básica de formulario | S |
| I9 | SSIDs de WiFi solo en `localStorage`, se pierden en reinstall de la APK | Pérdida de datos de configuración | M |
| I10 | Opción "1 semana" en selector de intervalo de muestreo IoT no tiene sentido operativo | Confunde, invita a mal-configurar el device | XS |
| Q6/Q7 | Botones "(próximamente)" sin fecha ni tooltip (Calibración remota, Reinicio remoto, Firmware sync) | Genera expectativa sin acción — mal en demos comerciales | S |
| L-C1 | `/login` sigue siendo un monolito de 1924 líneas | Mantenibilidad — no bloquea usuario final | XL |
| L-C3 | SVG del gato como string gigante inline con `dangerouslySetInnerHTML` (confirmado hoy, línea 1330) | Mantenibilidad, no seguridad (contenido estático propio) | M |

---

## 3. Hallazgos nuevos del recorrido de hoy (no estaban en el diagnóstico de junio)

### U4 — El widget "Barras Sims" en `/today` muestra 2 de 10 indicadores posibles

Confirmado en vivo: `/today` solo tiene Comida (hunger bar real) y Agua (`"Sin evidencia
real"`, sin cálculo real detrás). La app de investigación (`fase_0_ruido/app_anotacion_av2.py`
Tab 8) ya tiene **10 indicadores calculados con fórmulas reales** sobre datos de Bandida:
Hambre, Saciedad, Hidratación, Actividad, Sueño/reposo, Rutina, Apetito, Energía, Salud
general, Datos frescos. Ver desarrollo completo en
[[29_Specs/SPEC_04_Metricas_Today_Investigacion]] — este es el punto de contacto directo
entre "mejorar la UI" y "traer métricas de la investigación": mismo widget, más barras,
mejor fundamentadas.

### U5 — Inconsistencia visual de estado (mismo bug de E4, ángulo de UX)

Independiente de la causa técnica (spec 01, E4), el patrón general — **una card dice "activo"
en texto y "offline" en badge** — es un problema de diseño de información, no solo un bug
puntual: en un producto de monitoreo, cualquier ambigüedad entre dos indicadores del mismo
estado erosiona la confianza más que un solo indicador claramente negativo. Al resolver E4,
revisar si hay otras cards con doble fuente de estado sin reconciliar (ej. "Estado técnico:
linked" en `/bowl` vs. el punto verde de conexión en el sidebar — confirmar que ambos leen
la misma fuente).

### U6 — `/story` comunica bien su propia limitación, usar como plantilla de "empty state honesto"

El banner *"Historial temporalmente limitado — la base analítica histórica no está
disponible en este entorno, por lo que la story muestra sólo lo que el core puede
reconstruir"* es un ejemplo bueno de comunicar una limitación técnica sin tecnicismos ni
alarmar al usuario. Comparar con el estado "Sin evidencia real" en la card de Agua de
`/today`, que es más seco y no explica *por qué* ni ofrece una acción. Usar el tono de
`/story` como referencia de copy para todos los estados degradados de la app.

---

## 4. Priorización sugerida

| # | Fix | Esfuerzo | Impacto | Sprint |
|---|-----|----------|---------|--------|
| 1 | U1: extraer `<AccessibleModal>` desde el patrón de `/login`, aplicar a `/bowl` | S | Alto (resuelve E5 de spec 01 también) | Inmediato |
| 2 | I10: quitar "1 semana" del selector de intervalo | XS | UX | Inmediato |
| 3 | I3: renombrar botón "Ajustes" → "Acciones" | XS | UX | Inmediato |
| 4 | Q6/Q7: reemplazar "(próximamente)" por copy con fecha o quitar de demos | S | Demo | Inmediato |
| 5 | U2: extraer `<DiagnosticoRapidoCard>`, agregar a `/today` y `/pet` | M | Confianza de datos | Sprint 1 |
| 6 | I1: unificar selector de intervalo duplicado | S | UX | Sprint 1 |
| 7 | I4: envolver forms en `<form onSubmit>` | S | UX | Sprint 1 |
| 8 | U3: generalizar onboarding tip a `/pet`, `/bowl`, `/story` | M | Onboarding | Sprint 1 |
| 9 | I2: skeletons de carga | M | UX percibida | Sprint 2 |
| 10 | I9: persistir WiFi conocidas en `devices` en vez de `localStorage` | M | Retención de config | Sprint 2 |
| 11 | L-C3: extraer SVG del gato a componente propio | M | Mantenibilidad | Sprint 2 |
| 12 | L-C1: descomponer `/login` en hooks (`useLoginForm`, `useRegisterFlow`, `useCatAnimation`) | XL | Mantenibilidad | Sprint 3+ |

---

## Ver también

- [[18_UI/README_UI]] — recorrido en vivo completo pantalla por pantalla
- [[18_UI/UX_DIAGNOSTICO_2026_06_30]] — diagnóstico base, con estado de fixes actualizado en [[29_Specs/SPEC_01_Errores_Prioritarios]]
- [[29_Specs/SPEC_01_Errores_Prioritarios]] — bugs (distinto de mejoras de calidad)
- [[29_Specs/SPEC_04_Metricas_Today_Investigacion]] — desarrollo completo de U4
