---
id: auditoria_2026_09_15
title: Auditoría KittyPau — 2026-09-15
type: auditoria
status: active
owner: Mauro
created: 2026-09-15
---

# Auditoría KittyPau — 2026-09-15

> Reemplaza a [[AUDITORIA_2026_08_11]] como snapshot vigente para todo lo que cambió desde
> entonces — esa auditoría queda como referencia histórica para las áreas que NO se tocaron
> en el período intermedio (motor matemático, firmware, panel admin, datasets). Este
> documento **no es una re-verificación desde cero de todo el proyecto** (ver Metodología) —
> es el registro de lo que cambió realmente entre el 11-ago y el 15-sep de 2026, con
> verificación directa (código + `tsc`/`eslint`/`vitest`/`next build` + Playwright en vivo
> donde aplica) de cada cambio.

---

## Metodología

| Fuente | Cómo se verificó |
|---|---|
| `git log` desde `2026-08-14` | 253 commits fuera de `Knowledge/`, 119 tocando `Knowledge/` — inventario completo revisado |
| `kittypau_app/src/app/`, `src/lib/` | `find`/`wc -l` directo sobre los archivos tocados esta sesión, no todo el árbol |
| App en vivo | `npm run dev` + Playwright, cuenta tester real (`kittypau.mascotas@gmail.com`) — verificado navbar móvil/APK, ilustraciones de comida, vista semanal del timeline |
| Widget nativo de Android | **No verificado en dispositivo real** — este entorno no tiene Android SDK/JDK (confirmado con comandos directos). Se armó `.github/workflows/build-android-apk.yml` para compilar en CI; 5 bugs reales de compilación encontrados y corregidos ahí (namespace XML, `--` en comentarios XML, JDK 17→21, plugin de Compose faltante, `android-actions/setup-android` roto) — ver historial de commits `d6c1f5a`..`bc2e7c9`. Falta: probar el APK resultante en un dispositivo/emulador real. |
| Áreas NO re-verificadas esta pasada | Motor matemático (`shape_features_v2.py`), firmware IoT, bridge, panel admin (rutas vacías), datasets (`readings.csv`) — se asume que [[AUDITORIA_2026_08_11]] sigue vigente ahí salvo que se diga lo contrario abajo |
| Supabase / GitHub MCP | No usados esta sesión — MCPs `filesystem`/`github`/`memory` fallaron por timeout de conexión en este entorno, no se reintentó |

---

## 🟢 Resuelto desde la auditoría anterior

- **Navbar móvil/APK reestructurado** (2026-09-14): bug real encontrado con Playwright —
  la tuerca de Ajustes/Editar perfil/Cerrar sesión estaba gateada a `!useSidebarNav`, así
  que las cuentas **tester/cliente (la mayoría de usuarios reales) nunca la veían**. Pasa a
  renderizar siempre, visibilidad la decide el CSS. Ver [[04_Frontend/ESTRUCTURA_src_app]] §4.
- **Ilustraciones de comida rotas** (2026-09-14): `pink_food_full.png`/`pink_food_medium.png`/
  `pink_empty.png` tenían un fondo de estudio **opaco** (no transparente) que se hizo visible
  al agrandar el box de la card de Alimentación — restauradas a estado original + archivos
  `_lg` dedicados para no volver a romper los otros 4 consumidores que comparten esos PNG
  (login, registro, admin, marcador del gráfico día/noche).
- **`GET /api/pets/:id/hunger-bar` sin objeto `water`** (bloqueaba el widget nativo, ver
  abajo): extendido 2026-09-15, portando a server el cálculo de % de agua que antes solo
  vivía client-side en `today-screen.tsx`. Ver `Knowledge/29_Specs/010-widget-android-hero/contracts/hunger-bar-water-extension.md`.

---

## 🆕 Cambios grandes de esta sesión (2026-09-14 a 2026-09-15)

### 1. Rediseño "gamificado" de `/today` — mergeado a `main`

Hero fusionado en "ficha de personaje", Barras Sims horizontal → segmentada → "líquido con
onda" (mismo dato, solo cambió el skin del track), `#today-bowls` con íconos hueso/pez/gota.
**`today-screen.tsx` pasó a ser el archivo fuente más grande de toda la app (3467 líneas),
superando a `admin/page.tsx` (3291)** — dato que corrige [[04_Frontend/ESTRUCTURA_src_app]],
que hasta ahora decía que `admin/page.tsx` era "el más grande de toda la app" sin matizar
que esa afirmación era solo sobre `page.tsx` de rutas, no sobre archivos fuente en general.

### 2. Widget nativo de Android — spec → plan → tasks → implementación completa

Pedido explícito de Mauro: *"mi objetivo es que en mi apk, tenga una opcion para descargar
o vincular un widget de mi app en el celu de la persona"* — no solo que el widget exista,
sino un botón dentro de la app para agregarlo. Spec completo en
[[29_Specs/010-widget-android-hero/spec]] (spec.md, plan.md, research.md, data-model.md,
contracts/, tasks.md — 27 tareas, todas cerradas salvo la verificación en dispositivo real).

Decisiones técnicas clave (detalle en `research.md` del spec):
- **Jetpack Glance**, no RemoteViews clásico — justificado contra el ladder de Ponytail.
- **`AppWidgetManager.requestPinAppWidget()`** vía plugin Capacitor propio, disparado desde
  un botón al final del feed de `/today` (se probó primero en `/settings`, Mauro pidió
  moverlo). Hallazgo de research: Android lanza la configuration Activity (selección de
  mascota) automáticamente después del bind, sea por el botón in-app o el selector manual —
  no hizo falta un flujo custom de 2 pasos.
- `GET /api/pets/:id/hunger-bar` extendido con `water` (ver arriba) en vez de reimplementar
  el cálculo en Kotlin.
- Refresco: WorkManager (piso 15 min) + trigger opcional por push data-only sobre la
  infraestructura FCM ya existente (spec 008).
- **`@capacitor/preferences` es storage plano, NO `EncryptedSharedPreferences`** — se había
  documentado mal en una primera pasada del research y se corrigió tras verificar el código
  fuente real del plugin (`ionic-team/capacitor-plugins` en GitHub). Mismas garantías que el
  `localStorage` que ya usaba `token.ts` — no es una regresión de seguridad, pero la
  documentación inicial estaba equivocada.

**Gap real, explícito, sin resolver**: nada de esto se compiló en un dispositivo real todavía
— ver Metodología arriba. `Knowledge/19_DevOps/PENDIENTES_POR_PC.md` tiene el detalle exacto
de qué falta correr en la PC de Mauro.

### 3. CI para compilar el APK sin depender de la PC de Mauro

`.github/workflows/build-android-apk.yml` (nuevo) — `workflow_dispatch` manual, corre en un
runner `ubuntu-latest` de GitHub (que sí tiene JDK/Android SDK), regenera
`android/app/debug.keystore` (gitignorado, nunca se commitea) con las credenciales estándar
de debug, y sube el APK como artifact. Requiere 2 secrets del repo (`SUPABASE_URL`,
`SUPABASE_ANON_KEY` — el anon key es seguro de exponer así, diseñado para clientes). 5
intentos de build reales corridos esta sesión, cada uno encontró y corrigió un bug de
compilación distinto (ver Metodología) — quedó pendiente confirmar que el 6º intento (o
siguiente) compila limpio, no se vio el resultado final antes de que la sesión cambiara de
tema.

### 4. Vista semanal del timeline día/noche — prototipo de prueba

`day-night-timeline-card-weekly.tsx` (nuevo, 135 líneas) — copia del componente diario,
7 filas (lunes a domingo) en vez de 3 carriles por categoría, misma convención de "ciclo
06:00 Chile" ya usada por la vista diaria extendida a una semana. Se renderiza justo debajo
del original (no lo reemplaza) — explícitamente un experimento a validar con Mauro, no un
reemplazo decidido. Pendiente sin resolver: un pedido de Mauro de hacer que la carcasa
visual sea *exactamente* igual a la del componente original (pill único en vez de
mes+rango en 2 líneas, altura 360px en vez de 560px) + agregar AM/PM a las horas + usar
íconos en los puntos en vez de círculos de color — quedó sin implementar cuando la sesión
cambió de tema a otra cosa.

---

## Aún vigente sin cambios (carry-forward de [[AUDITORIA_2026_08_11]])

No re-verificado esta pasada — documentado ahí, se asume vigente salvo aviso en contrario:
- Panel admin: 7 de 10 subcarpetas siguen sin `page.tsx` (404 reales).
- `readings.csv`/`readings_rows.csv`: conteos reales vs. documentados, device dominante
  `3c1c6705…` sin confirmar contra Supabase.
- Firmware real en `iot_firmware/javier_1a/` (no `kittypau_iot_firmware/`, vacía).
- DB de analytics (`pet_sessions`/`pet_daily_summary`) eliminada — ver [[29_Specs/SPEC_12_Recrear_Analytics_DB]].

---

## Ver también

- [[AUDITORIA_2026_08_11]] — auditoría anterior
- [[04_Frontend/ESTRUCTURA_src_app]] — estructura de `src/app` actualizada con todo lo de arriba
- [[29_Specs/010-widget-android-hero/spec]] — spec/plan/tasks completos del widget
- [[19_DevOps/README_DevOps]] — CI/CD, incluido el workflow nuevo de build del APK
- [[19_DevOps/PENDIENTES_POR_PC]] — qué falta correr en cada PC ahora mismo
