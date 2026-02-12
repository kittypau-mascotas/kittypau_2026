# Portal Admin Kittypau (Plan Profesional)

## Objetivo
Diseñar e implementar un portal administrativo para operación ejecutiva de Kittypau, con visibilidad total de negocio y plataforma:
- ingresos, compras y costos
- salud operativa IoT (bridge + dispositivos)
- incidentes y auditoría
- gestión de usuarios y permisos

## Alcance (v1)
1. Resumen ejecutivo (KPI diarios/mensuales).
2. Finanzas:
- ingresos por periodo
- compras/pedidos
- ticket promedio
- estado de pagos/reembolsos
3. Operación IoT:
- bridges online/offline
- KPCL online/offline
- incidentes activos y recuperados
4. Centro de auditoría en vivo:
- stream de `audit_events` en tiempo real dentro del dashboard admin
- eventos críticos destacados (offline, outage, cambios de estado)
- filtros por `event_type`, `entity_type`, rango de tiempo
4. Seguridad y cumplimiento:
- eventos críticos en `audit_events`
- trazabilidad de acciones admin
5. Gestión:
- usuarios, cuentas, roles y accesos

## Roles y permisos
- `owner_admin`: acceso total (finanzas + operación + seguridad).
- `ops_admin`: operación IoT + incidentes + dispositivos.
- `support_admin`: soporte de usuarios, sin acceso a datos financieros sensibles.
- `readonly_admin`: lectura de paneles, sin acciones de escritura.

Modelo recomendado:
- Tabla `admin_roles` (user_id, role, active).
- RLS y validación server-side por rol.
- Nunca exponer consultas admin en endpoints de usuario final.

## Arquitectura funcional
1. Frontend:
- Nueva ruta: `/admin`
- Vistas: `overview`, `finanzas`, `operacion`, `incidentes`, `usuarios`.
2. Backend:
- Endpoints admin dedicados (`/api/admin/*`), server-only.
- Agregaciones por vista para evitar consultas pesadas en UI.
3. Base de datos:
- Reutilizar `audit_events`, `devices`, `bridge_heartbeats`, `bridge_telemetry`, `readings`, `profiles`.
- Agregar tablas de negocio financiero (si aún no existen): `orders`, `payments`, `refunds`, `expenses`.

## KPIs mínimos (v1)
### Ejecutivos
- Ingresos MTD (month-to-date)
- Pedidos completados
- ARPU / ticket promedio
- Tasa de reembolso

### Operación IoT
- Bridges online/offline
- KPCL online/offline
- Tiempo medio de recuperación (MTTR)
- Incidentes últimos 7 días

### Auditoría en vivo
- Últimos eventos críticos (`audit_events`) en tiempo real
- Conteo por severidad/tipo en ventana de 24h
- Último evento de falla general y último evento de recuperación

### Seguridad/Auditoría
- Cambios de estado críticos
- Fallas generales detectadas/recuperadas
- Acciones admin por usuario

## Contratos API propuestos
- `GET /api/admin/overview`
- `GET /api/admin/finance/summary?from=&to=`
- `GET /api/admin/ops/status`
- `GET /api/admin/incidents?status=open|closed`
- `GET /api/admin/audit?event_type=&from=&to=`
- `GET /api/admin/audit/live?limit=50`
- `POST /api/admin/incidents/:id/close`

Todos deben:
- exigir sesión autenticada + rol admin
- registrar auditoría de acceso y acciones
- incluir `request_id` y errores estandarizados

## Seguridad y hardening
1. Autorización por rol en cada endpoint.
2. Separación estricta entre APIs usuario y admin.
3. Rate limit por endpoint admin sensible.
4. Auditoría obligatoria de acciones de escritura.
5. Secretos en Vercel/Supabase, nunca hardcodeados.

## Roadmap de implementación
### Fase 1 (Base)
- Esquema de roles admin.
- Middleware de autorización admin.
- Endpoint `GET /api/admin/overview`.
- Pantalla `/admin` con KPIs principales + KPCL online/offline + panel de `audit_events` en vivo.

### Fase 2 (Finanzas)
- Modelo financiero mínimo (`orders/payments/refunds` o integración externa).
- Panel de ingresos, compras y estados de pago.

### Fase 3 (Operación e incidentes)
- Panel de bridges/KPCL online-offline.
- Bandeja de incidentes y cierre manual.
- Métricas operativas históricas.

### Fase 4 (Gobernanza)
- Reportes descargables.
- Alertas automáticas por umbrales.
- Trazabilidad avanzada de acciones admin.

## Criterios de aceptación
1. Solo usuarios con rol admin acceden a `/admin`.
2. Dashboard muestra KPI reales y consistentes con DB.
3. Incidentes y cambios críticos quedan en `audit_events`.
4. Respuesta de APIs admin bajo carga normal < 300 ms (consultas agregadas).
5. Cobertura mínima de pruebas para auth/roles y endpoints críticos.

## Estado
- Documento de diseño: listo.
- Implementación: pendiente (prioridad alta, bloque "admin").
