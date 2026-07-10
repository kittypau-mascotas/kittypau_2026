---
id: readme_ui
title: UI/UX — KittyPau Frontend
type: frontend
status: active
owner: Mauro
created: 2026-06-28
updated: 2026-06-30
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
| `/admin/demo-ingresos` | Demo financiero para presentaciones | Admin | — |
| `/admin/javo` | Dashboard Javo (interno) | Admin | — |

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
