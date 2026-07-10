---
tags: [app, rutas, vistas, nextjs]
area: App
estado: activo
actualizado: 2026-06-24
---

# Vistas y Rutas de la App

Ver detalle completo en [[RUTAS_Y_PAGINAS]].

## Grupos de rutas (Next.js App Router)

### (app) — Rutas protegidas
Requieren autenticación. Layout compartido con navegación.

| Ruta | Vista |
|---|---|
| `/inicio` | Home principal del usuario |
| `/today` | Vista diaria — ciclos de alimentación y eventos |
| `/bowl` | Gestión del comedero inteligente |
| `/pet` | Perfil de la mascota |
| `/dispositivos` | Listado de dispositivos IoT registrados |
| `/dispositivos/nuevo` | Alta de nuevo dispositivo |
| `/registro` | Flujo de registro onboarding |
| `/settings` | Configuración de cuenta |
| `/story` | Historial / timeline de eventos |
| `/admin/*` | Panel de administración (ver abajo) |

### Admin (subrutas de `/admin`)

| Ruta | Vista |
|---|---|
| `/admin/overview` | Resumen general |
| `/admin/analytics` | Análisis de datos |
| `/admin/devices` | Gestión dispositivos |
| `/admin/pets` | Gestión mascotas |
| `/admin/alerts` | Alertas del sistema |
| `/admin/settings` | Configuración admin |
| `/admin/demo-ingresos` | Demo módulo ingresos |
| `/admin/javo` | Área de pruebas admin |

### (public) — Rutas públicas
No requieren autenticación.

| Ruta | Vista |
|---|---|
| `/login` | Inicio de sesión |
| `/register` | Registro de cuenta |
| `/reset` | Recuperación de contraseña |
| `/demo` | Demo pública del producto |
| `/client-demo` | Demo para clientes |
| `/test` | Página de pruebas |

## Componentes de navegación

- `src/app/(app)/_components/app-nav.tsx` — Barra de navegación principal
- `src/app/_components/route-loading-overlay.tsx` — Loading entre rutas
- `src/app/_components/parallax-root.tsx` — Wrapper raíz con parallax

## Links relacionados

- [[RUTAS_Y_PAGINAS]]
- [[CONTRATOS_POR_VISTA]]
- [[Admin/_MOC]]
- [[ESTRUCTURA_APP]]
