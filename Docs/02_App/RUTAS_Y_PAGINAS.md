---
tags: [rutas, paginas, nextjs, app-router]
area: App
estado: activo
actualizado: 2026-06-24
---

# Rutas y Páginas

## Grupo (app) — Protegidas

Prefijo: requieren sesión activa. Layout con `app-nav.tsx`.

### Rutas principales

| Ruta | Archivo | Descripción |
|---|---|---|
| `/inicio` | `(app)/inicio/page.tsx` | Home del usuario — resumen general |
| `/today` | `(app)/today/page.tsx` | Vista diaria — ciclos y eventos del día |
| `/bowl` | `(app)/bowl/page.tsx` | Comedero — estado en vivo y controles |
| `/pet` | `(app)/pet/page.tsx` | Perfil de la mascota |
| `/story` | `(app)/story/page.tsx` | Historial / timeline de eventos |
| `/settings` | `(app)/settings/page.tsx` | Configuración de cuenta usuario |

### Dispositivos

| Ruta | Descripción |
|---|---|
| `/dispositivos` | Listado de dispositivos IoT registrados del usuario |
| `/dispositivos/nuevo` | Formulario de alta de nuevo dispositivo KPCL |

### Registro (Onboarding)

| Ruta | Descripción |
|---|---|
| `/registro` | Flujo completo de onboarding — mascota + dispositivo |

Componente principal: `(app)/registro/_components/registro-flow.tsx`

### Admin

Acceso restringido a usuarios con rol admin.

| Ruta | Descripción |
|---|---|
| `/admin/overview` | Resumen general del sistema |
| `/admin/analytics` | Panel de analytics de uso |
| `/admin/devices` | Gestión global de dispositivos |
| `/admin/pets` | Gestión global de mascotas |
| `/admin/alerts` | Alertas y notificaciones del sistema |
| `/admin/settings` | Configuración global admin |
| `/admin/demo-ingresos` | Demo del módulo de ingresos |
| `/admin/javo` | Área de pruebas internas |

## Grupo (public) — Sin autenticación

| Ruta | Descripción |
|---|---|
| `/login` | Inicio de sesión con email/contraseña |
| `/register` | Creación de cuenta nueva |
| `/reset` | Recuperación de contraseña |
| `/demo` | Demo pública del producto (sin cuenta) |
| `/client-demo` | Demo para presentación a clientes |
| `/test` | Página de pruebas técnicas |

## Páginas especiales (raíz)

| Archivo | Descripción |
|---|---|
| `app/page.tsx` | Redirige a `/inicio` o `/login` según auth |
| `app/error.tsx` | Pantalla de error global |
| `app/global-error.tsx` | Error boundary raíz |
| `app/loading.tsx` | Skeleton de carga global |
| `app/not-found.tsx` | Página 404 |

## Componentes de layout

| Componente | Descripción |
|---|---|
| `_components/app-nav.tsx` | Navegación bottom/side de la app |
| `_components/route-loading-overlay.tsx` | Overlay de carga entre rutas |
| `_components/parallax-root.tsx` | Wrapper con efecto parallax |
| `_components/alert.tsx` | Sistema de alertas globales |
| `_components/empty-state.tsx` | Estado vacío reutilizable |
| `_components/kittypau-error-screen.tsx` | Pantalla de error branded |
| `_components/native-apk-mode.tsx` | Componentes exclusivos APK |

## Links relacionados

- [[VISTAS_APP]]
- [[CONTRATOS_POR_VISTA]]
- [[Admin/ADMIN_PORTAL_PLAN]]
- [[ESTRUCTURA_APP]]
