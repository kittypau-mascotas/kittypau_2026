---
id: readme_ui
title: UI/UX — KittyPau Frontend
type: frontend
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-08-11
tags:
  - ui
  - ux
  - componentes
  - pantallas
  - react
  - tailwind
  - accesibilidad
related:
  - [[00_HOME]]
  - [[04_Frontend/README_Frontend]]
  - [[17_Mocks/README_Mocks]]
  - [[18_UI/UX_DIAGNOSTICO_2026_06_30]]
  - [[01_Proyecto/ENUMS_OFICIALES]]
---

# UI/UX — KittyPau

> Stack: Next.js 16.1.6 + React 19.2.3 + Tailwind 4. Diagnóstico completo: [[18_UI/UX_DIAGNOSTICO_2026_06_30]]

---

## Pantallas activas (App Router — 2026-06-30)

### Rutas protegidas `(app)/`

| Ruta | Descripción | Auth | LOC |
|------|-------------|------|-----|
| `/today` | Dashboard día: D3 + Chart.js, MQTT live, audit events, analytics | Sí | **5526** ⚠️ |
| `/bowl` | Lecturas en vivo + config device + 5 gráficos multi-rango | Sí | 1784 |
| `/pet` | Perfil mascota + edición + devices asociados | Sí | 889 |
| `/settings` | Perfil usuario + notificaciones | Sí | 466 |
| `/story` | Historial sesiones clasificadas (free/premium) | Sí | ~600 |
| `/inicio` | Redirect a `/today` (renderiza `null`) ⚠️ | Sí | 14 |
| `/registro` | Redirect server a `/login?register=1` | Sí | 22 |
| `/dispositivos/nuevo` | Flujo de alta de nuevo dispositivo | Sí | — |
| `/admin` | Dashboard admin (protegido por tipo de cuenta) | Admin | — |
| `/admin/demo-ingresos` | Demo financiero para presentaciones — 🐞 `Missing Authorization header` visible en vivo | Admin | — |
| `/admin/javo` | Inventario de proyectos de Javier (bridge, firmware, docs) integrados en Kittypau | Admin | — |

> ⚠️ `/admin/alerts`, `/admin/analytics`, `/admin/devices`, `/admin/legacy`,
> `/admin/overview`, `/admin/pets`, `/admin/settings` son carpetas **vacías** (sin
> `page.tsx`) → 404 real. Verificado en vivo 2026-08-11. Ver sección de recorrido abajo.

### Rutas públicas `(public)/`

| Ruta | Descripción |
|------|-------------|
| `/login` | Login + registro (modal register=1) |
| `/register` | Registro directo |
| `/reset` | Recuperación de contraseña |
| `/demo` | Demo pública con nav demo |
| `/client-demo` | Demo para clientes |
| `/test` | Página de pruebas internas |
| `/404`, `/error` | Páginas de error |

---

## Componentes clave (src/app/_components/)

| Componente | Descripción |
|---|---|
| `app-nav.tsx` | Navegación: sidebar (tester/client) o top-bar (admin/APK) |
| `alert.tsx` | Componente de alerta con variant error/warn/info |
| `empty-state.tsx` | Estado vacío estandarizado con título + children + acciones |
| `operational-actions-card.tsx` | Card de acciones fallback cuando faltan datos |
| `social-links.tsx` | Links sociales en nav sidebar |
| `accessible-modal.tsx` | Modal con `role="dialog"`, focus trap y Escape — patrón portado de `/login`, usado en `/bowl` |

Componentes propios de cada página (no globales) se documentan por separado a medida que se
extraen — ver [[18_UI/Componentes/README_Componentes]] (empezó con `today/_components/`).

---

## Sistema de diseño (tokens CSS)

| Clase / Token CSS | Descripción |
|---|---|
| `page-shell` | Contenedor raíz de cada página protegida |
| `surface-card` | Card blanca con border-radius |
| `freeform-rise` | Sombra "float" sutil en cards |
| `app-shell` | Layout raíz: nav + contenido |
| `app-content` | Área de contenido |
| `page-header` | Encabezado: eyebrow + h1 + acción secundaria |
| `eyebrow` | Texto pequeño uppercase sobre h1 |
| `ghost-link` | Enlace texto sin subrayado |
| `--radius` | CSS var: border-radius global |
| `--primary` | CSS var: color primario (violeta) |

---

## Paleta semántica (Tailwind)

| Contexto | Color |
|---|---|
| Error / crítico | `rose-*` |
| Advertencia | `amber-*` |
| Éxito / online | `emerald-*` |
| Info | `sky-*` |
| Texto principal | `slate-900` |
| Texto secundario | `slate-500` |
| Borde | `slate-200` |

---

## Estructura de navegación (AppNav)

```
AppNav
├── Modo sidebar (tester + client, no APK)
│   ├── Logo "Kittypau PetTech AIoT"
│   ├── SocialLinks
│   ├── UserSummary: avatar · nombre · pet · device · dot online
│   ├── NavLinks: [Hoy] [Story] [Mascota] [Plato]
│   ├── AccountActions: Ajustes · Editar perfil · Admin · Cerrar sesión
│   └── Footer contacto
└── Modo top-bar (admin + APK nativa)
    ├── Logo
    ├── NavLinks: idem
    └── ProfileMenu dropdown
```

**Rutas SIN nav:** `/registro`, `/admin`

---

## Flujo de autenticación

```
/ → src/app/page.tsx → redirect /today (con sesión) o /login (sin sesión)
/login → Supabase Auth → session → /today
/today → detecta accountType
  ├── "admin" → replace("/admin")
  ├── "tester" | "client" → renderiza normally
```

---

## Reglas UI activas

1. No hardcodear valores de enums en la UI — usar constantes de [[01_Proyecto/ENUMS_OFICIALES]]
2. Prioridad: **confiabilidad de datos > efectos visuales**
3. Modales usan `fixed inset-0 z-50 flex items-end sm:items-center` (bottom-sheet en móvil)
4. States de carga muestran texto plano (pendiente: migrar a skeletons — ver C2 en diagnóstico)
5. Acciones de "próximamente" NO deben aparecer en demos comerciales sin un plan de fecha

---

## Recorrido en vivo verificado (Playwright, 2026-08-11)

> Recorrido real con `npm run dev` en `localhost:3000`, sesión Playwright headless,
> login con las 2 cuentas tester (`kittypau.mascotas@gmail.com` y `javier.dayne@gmail.com`,
> credenciales de prueba conocidas del equipo — no se documentan aquí).
> `.env.local` de este entorno **no tiene** las 4 vars `NEXT_PUBLIC_MQTT_*` — todo lo
> descrito abajo es el comportamiento real de la app *degradada sin MQTT en vivo*
> (fallback a REST/histórico), no un mock.

### Sidebar / AppNav (confirmado)

Nav sidebar real observado (cuenta tester, no-APK): logo "Kittypau PetTech AIoT" + 3 iconos
sociales (LinkedIn/YouTube/Instagram) → avatar + nombre de usuario ("Jeivos - Tester") +
mascota activa y su device ("Bandida - KPCL0035") con punto verde de estado → 4 tabs
**Hoy / Story / Mascota / Plato** → separador → **⚙ Ajustes** / **👤 Editar perfil** /
**Cerrar sesión** → footer "Kittypau · IoT Chile S.A · PetTech AIoT" + email. Coincide con
lo documentado, con un detalle nuevo: el nombre visible mostrado es el `Nombre visible`
de Ajustes ("Jeivos"), no el email — y bajo él se ve `{mascota activa} - {device activo}`.

### `/today` — Hoy en casa

- Modal de onboarding **"MODO GUÍA"** al primer render: "Bienvenido a Hoy en casa" +
  2 tips + botones `Entendido` / `Completar registro`. No documentado antes en Knowledge.
- Cards "BARRAS SIMS": Comida (barra de hambre, ej. 36%, etiqueta `Confirmado`) y Agua
  (etiqueta `Sin evidencia real` cuando no hay lecturas de bebedero). Batería visible junto
  a la card de agua.
- Cards Alimentación/Hidratación por device: cada una muestra bowl ilustrado, `device_id`,
  peso/volumen, temp, humedad, hora de última lectura. **Confirmado con la cuenta tester
  real: Bandida usa KPCL0035 como comedero (alimentación) y KPCL0034 como bebedero
  (hidratación)** — distinto del rol "food_bowl de investigación" que documenta
  [[09_Sensores/README_Sensores]] para KPCL0034; en este entorno KPCL0034 está reasignado a
  bebedero a nivel de producto.
- Franja inferior: mini-timeline ilustrado del día (amanecer/día/atardecer/noche) con
  eventos de alimentación/hidratación marcados sobre las 24h.
- Banner naranja visible cuando faltan vars MQTT: *"MQTT no configurado: faltan
  NEXT_PUBLIC_MQTT_BROKER, NEXT_PUBLIC_MQTT_PORT_WS, NEXT_PUBLIC_MQTT_USER_READONLY,
  NEXT_PUBLIC_MQTT_PASS_READONLY."* — la página **no se rompe**, degrada con aviso visible.
  Segundo banner: *"Alimentación sin evidencia auditada: solo se confirma comida desde
  KPCL0034 con categorías inicio/término."*
- Con la cuenta `javier.dayne` (admin en Supabase) el heading cambia a **"tu mascota"**
  genérico — no tiene mascota propia vinculada en este entorno.

### `/bowl` — Lecturas en vivo

Sigue funcionando **sin** MQTT en vivo: los 4 gráficos (Peso, Temperatura, Luz entorno,
Humedad) y el gráfico doble de Batería (% + Voltios) se pueblan con datos recientes vía
REST (`/api/readings/bucketed` o similar), solo pierde el push instantáneo. Header:
selector de device (`< Test_0035 >`), intervalo `30 s`, botón `↻ Escaneo`, `+ Bebedero`,
engranaje ⚙, indicador "● En tiempo real", chips de rango `5 min/15 min/1 hora/1 dia/1 semana`,
botón `⊖ Tarar` sobre la card de peso. Debajo: card "Estado técnico" (`linked`/batería/última
conexión), card **"Diagnóstico rápido"** con 3 columnas (Conexión/Energía/Firmware) +
"Acciones recomendadas" + botones deshabilitados `Calibración remota (próximamente)` /
`Reinicio remoto (próximamente)`. Con la cuenta admin (sin device propio) la página
renderiza casi vacía (solo header + nav, sin cards de lectura).

### `/pet` — Mascota (Perfil conductual)

Selector "Mascota seleccionada" + dropdown "Cambiar mascota" + botón `Editar perfil`.
Badges `Perfil incompleto · device_linked`. Card Edad/Peso/Actividad "Sin datos" con
callout amarillo "Completa estos datos" (chips Edad/Peso/Actividad + `Completar perfil`).
Card azul "Acciones rápidas" (Ver hoy/Ver plato/Ver historia/Completar registro). Card
"Platos asociados": `KPCL0035 · KPCL0034`, badges `COMEDERO: LINKED` / `BEBEDERO: OFFLINE`
— nótese la inconsistencia visual: el texto dice "Bebedero: active" pero el badge dice
`OFFLINE` (revisar lógica de estado en el componente, no se investigó la causa raíz).
Card 🍖 "Barra de hambre" con % + "Última comida detectada" + "Próxima comida estimada"
+ "N comidas detectadas" (consume [[05_API/SPEC_HungerBar_Alimentacion]]). Card "Insights
recientes" con 3 columnas (Ritmo general/Hidratación/Ambiente).

### `/story` — Historia del día

Banner azul: *"Historial temporalmente limitado — la base analítica histórica no está
disponible en este entorno, por lo que la story muestra sólo lo que el core puede
reconstruir."* — confirma en vivo que `SUPABASE_ANALYTICS_URL` no está seteada en este
`.env.local` y la página degrada con mensaje explícito en vez de romperse (coincide con
[[06_BaseDatos/README_BaseDatos]]: "si no existen credenciales, degrada a `data: []`").
3 contadores (Sesiones/Atención/Normales, todos en 0 en este entorno) + card final
"La historia histórica todavía no está disponible" con accesos rápidos.

### `/settings` — Ajustes

Card "Cuenta" (email, canal preferido, link "Seguridad"). Card explicativa "Cómo se usan
estos datos" (3 columnas: Perfil/Notificaciones/Contexto). Card "Dispositivos" con botón
`Agregar dispositivo` (lleva a `/dispositivos/nuevo`). Card "Perfil principal" — formulario
Nombre visible / Nombre del dueño / Email / Teléfono, con badge `Perfil incompleto · N
pendientes` y aviso amarillo "Falta completar: X, Y". Card "Notificaciones" (canal, ciudad,
país). Footer con botón `Guardar cambios`.

### `/dispositivos/nuevo` — Agregar dispositivo

Form real: input "Código del dispositivo" (placeholder `KPCL0000`), select "Tipo de
dispositivo" (`Plato de comida` visible por default — implica también existe variante
bebedero), select "Mascota" (`Bandida (cat)` precargada). Botones `Cancelar` /
`Registrar dispositivo` (deshabilitado hasta completar el form). Card inferior "¿DÓNDE
ENCUENTRO EL CÓDIGO?" con instrucción de la etiqueta física.

### `/dispositivos` (raíz, sin `/nuevo`)

Confirmado 404 real (body de 152 caracteres, igual que una ruta inexistente) — no hay
`page.tsx`, tal como documenta [[AUDITORIA_2026_06_29]].

### `/registro`

Confirmado: redirige a `/login?register=1` y abre el modal de registro con 4 pasos
(`✓ CUENTA` `✓ USUARIO` `✓ MASCOTA` `✓ DISPOSITIVO`) — con una sesión ya autenticada y
registro completo, los 4 pasos aparecen con check ✓ (no hay forma de "reabrir" un paso ya
completado desde acá).

### `/admin` (root) — comportamiento distinto al documentado

Con **ambas** cuentas de prueba (`kittypau.mascotas`, tester; y `javier.dayne`, admin
según [[project-supabase-accounts]]), navegar a `/admin` terminó en un redirect a `/today`
en este entorno — no se pudo confirmar visualmente el dashboard de `/admin` (`page.tsx`
existe en el código, pero el gate de cuenta-admin no dejó pasar a ninguna de las 2 cuentas
de prueba tal como está configurada la DB de este entorno). **No asumir que `javier.dayne`
tiene rol admin activo en este Supabase** sin verificar `admin_roles` — puede ser que la
fila no esté seedeada en este proyecto.

### `/admin/javo` — sí accesible directamente por URL

A diferencia de `/admin` root, esta subruta cargó su contenido completo sin redirect:
"Proyectos de Javier integrados en Kittypau" — panel maestro/detalle con 5 proyectos
listados (`KPCL0036 1b (pack integrado)` EN EVALUACIÓN, `Bridge v2.4` ACTIVO*, `Firmware
ESP32-CAM` ACTIVO, `Firmware ESP8266` ACTIVO, `Kittypau App (referencia Javier)`
REFERENCIA, `Documentación Operacional Javo` EN EVALUACIÓN). Al seleccionar un proyecto
muestra badges (App vinculada/Cámara vinculada/Archivos HTML), "Avances observados",
"Siguientes pasos" y "Rutas fuente revisadas" (rutas literales bajo
`kittypau_iot_firmware/6 _KPCL0036_1b/...` — ese es el contenido legacy dentro de
`kittypau_iot_firmware (antiguo)/`, ver [[08_ESP32/README_ESP32]]).
> \*El "Bridge v2.4" de este panel es texto estático descriptivo del inventario de
> proyectos de Javier, no el estado real del bridge en producción (que es v3.2 — ver
> [[07_MQTT/README_MQTT]]). No confundir ambos números.

### `/admin/demo-ingresos` — 🐞 bug confirmado en vivo

La página carga (`Demo Ingresos` + tabla vacía con columnas EMAIL/TITULAR/MASCOTA/SOURCE/
COUNT/FIRST/LAST) pero muestra el error **`Missing Authorization header`** en rojo antes de
la tabla — el fetch client-side a `/api/admin/demo-ingresos` no está adjuntando el JWT
(o se dispara antes de que `auth-fetch.ts` tenga el token listo). Confirmar si es una
condición de carrera en el mount o falta el wrapper de auth-fetch en ese componente.

### 7 subrutas de `/admin/*` sin contenido — confirmado 404 real

`/admin/alerts`, `/admin/analytics`, `/admin/devices`, `/admin/legacy`, `/admin/overview`,
`/admin/pets`, `/admin/settings` — las 7 carpetas existen bajo
`kittypau_app/src/app/(app)/admin/` pero están **completamente vacías** (0 archivos, ni
siquiera un `_components/`). Next.js no genera ruta ahí → 404 real idéntico al de una URL
inventada. Son restos de una planificación de admin más granular que nunca se implementó;
hoy toda la superficie admin real son las 3 rutas de arriba.

### `/login`, `/register`, `/reset` (públicas)

`/login`: split-screen con ilustración + copy marketing ("Descubre lo que tu mascota
intenta decirte. Recibe alertas tempranas de salud.") a la izquierda, card de login a la
derecha (email/contraseña, checkbox "Mostrar contraseña", `Continuar`, `Olvidé mi clave`,
`Crear cuenta`, banner verde `DEMO APP · Pruébala ahora · No Necesitas Registrarte !!`).
`/register` y `/reset` son formularios simples de una card, sin la ilustración lateral.

### `/demo`, `/client-demo`, `/test` — las 3 resuelven al mismo demo sin login

Verificado con Playwright: `/client-demo` y `/test` redirigen/renderizan exactamente
`/demo?menu=today` — mismo contenido de demostración sin registro ("Tu mascota" — perro
demo genérico, "Titular: Invitado", banner "Vista de demostración — explora Kittypau sin
registrarte." con accesos: Perfil de la mascota / Panel de estado / Botones de acción /
Salir de prueba). `/demo` sin query params muestra un nav más corto (sin Ajustes/Editar
perfil) que `/demo?menu=today` — variación menor, no investigada a fondo.

---

## Diagnóstico UX/UI (2026-06-30)

Ver [[18_UI/UX_DIAGNOSTICO_2026_06_30]] para el análisis completo.

**Resumen:**
- **C1** `/inicio` renderiza `null` (pantalla en blanco)
- **C2** `/today` es un monolito de 5526 líneas
- **C3** Falta `dispositivos/page.tsx` (lista de devices)
- **C4** Modal config bowl sin scroll en móvil
- **C5** Modales sin `role="dialog"`, sin Escape, sin focus trap

**Fixes XS (< 30 min):**

```tsx
// C4 — una clase CSS:
<div className="... overflow-y-auto max-h-[90vh]">
// C1 — 1 línea:
return <div className="page-shell"><div className="surface-card px-6 py-6 text-sm text-slate-400">Cargando...</div></div>;
```

---

## Ver también

- [[18_UI/UX_DIAGNOSTICO_2026_06_30]] — diagnóstico completo
- [[04_Frontend/README_Frontend]] — arquitectura frontend
- [[20_Testing/README_Testing]] — bugs QA (QA-01 a QA-05)
- [[05_API/README_API]] — contratos que consume la UI
