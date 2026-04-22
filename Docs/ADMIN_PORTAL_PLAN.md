# Portal Admin Kittypau (Plan Profesional)

## Proposito
Este es el documento vivo del portal admin. Reune la estructura funcional, los KPI, la seguridad, la arquitectura operativa y la lectura ejecutiva del dashboard.

Si algo contradice este plan, primero se actualiza la fuente de verdad y luego se replica aqu.

## 1) Objetivo
Diseñar e implementar un portal administrativo para la operacin ejecutiva de Kittypau, con visibilidad total de negocio y plataforma:
- ingresos, compras y costos
- salud operativa IoT (bridge + dispositivos)
- incidentes y auditoria
- gestion de usuarios y permisos

## 2) Alcance v1
1. Resumen ejecutivo (KPI diarios / mensuales).
2. Finanzas:
- ingresos por periodo
- compras / pedidos
- ticket promedio
- estado de pagos / reembolsos
3. Operacion IoT:
- bridges online / offline
- KPCL online / offline
- incidentes activos y recuperados
4. Centro de auditoria en vivo:
- stream de `audit_events` en tiempo real
- eventos criticos destacados
- filtros por `event_type`, `entity_type`, rango de tiempo
5. Seguridad y cumplimiento:
- trazabilidad de accines admin
- logs de acceso y cambios de estado
6. Gestion:
- usuarios, cuentas, roles y accesos

## 3) Roles y permisos
- `owner_admin`: acceso total (finanzas + operacin + seguridad).
- `ops_admin`: operacin IoT + incidentes + dispositivos.
- `support_admin`: soporte de usuarios, sin acceso a datos financieros sensibles.
- `readonly_admin`: lectura de paneles, sin accines de escritura.

Reglas:
- RLS y vlidacion server-side por rol.
- Nunca exponer consultas admin en endpoints de usuario final.

## 4) Arquitectura funcional
### Frontend
- Ruta principal: `/admin`
- Vistas: `overview`, `finanzas`, `operacin`, `incidentes`, `usuarios`

### Backend
- Endpoints dedicados `/api/admin/*`
- Agregaciones por vista para evitar consultas pesadas en UI
- Auditoria obligatoria en accines sensibles

### Base de datos
Retilizar:
- `public.audit_events`
- `public.devices`
- `public.bridge_heartbeats`
- `public.bridge_telemetry`
- `public.readings`
- `public.profiles`

Agregar / mantener tablas de negocio si aplica:
- `orders`
- `payments`
- `refunds`
- `expenses`

## 5) KPI mnimos (v1)
### Ejecutivos
- Ingresos MTD
- Pedidos completados
- ARPU / ticket promedio
- Tasa de reembolso

### Operacion IoT
- Bridges online / offline
- KPCL online / offline
- MTTR
- Incidentes ultimos 7 dias

### Auditoria en vivo
- Ultimos eventos criticos en tiempo real
- Conteo por severidad / tipo en ventana de 24h
- Ultimo evento de falla y recuperacion

### Seguridad / auditoria
- Cambios de estado criticos
- Fallas generales detectadas / recuperadas
- Acciones admin por usuario

## 6) Contratos API
- `GET /api/admin/overview`
- `GET /api/admin/finance/summaryfrom=&to=`
- `GET /api/admin/ops/status`
- `GET /api/admin/incidentsstatus=open|closed`
- `GET /api/admin/auditevent_type=&from=&to=`
- `GET /api/admin/audit/livelimit=50`
- `POST /api/admin/incidents/:id/close`
- `POST /api/admin/health-check`
- `POST /api/admin/tests/run-all`

Reglas:
- autenticacion obligatoria + rol admin
- `request_id` en respuestas
- errores estandarizados
- auditoria de acceso y accines

## 7) Seguridad y hardening
1. Autorizacion por rol en cada endpoint.
2. Separacion estricta entre APIs de usuario y admin.
3. Rate limit por endpoint sensible.
4. Auditoria obligatoria de escrituras.
5. Secretos solo en Vercel / Supabase.

## 8) UX / UI
- Dashboard con header operativo fijo.
- Alertas criticas arriba.
- KPI ejecutivos en una sola fila.
- Continuidad KPCL visible.
- Finanzas y tablas pesadas debajo.
- Mobile con cards resumidas y tablas en `md+`.
- Acciones operativas siempre visibles arriba.

## 9) Incrementos ya aplicados
- Filtros basicos para `audit_events`.
- Ventana de tiempo configurable.
- Deduplicacion en backend por ventana corta.
- Catalogo de objetos / vistas con stats robustos.
- `x-admin-cache` y invlidacion por eventos criticos.

## 10) Fases de implementacion
### Fase 1 - Base
- Esquema de roles admin.
- Middleware de autorizacion.
- `GET /api/admin/overview`.
- Pantalla `/admin` con KPI principales y audit stream.

### Fase 2 - Finanzas
- Modelo mnimo de `orders/payments/refunds` o integracion externa.
- Panel de ingresos, compras y pagos.

### Fase 3 - Operacion e incidentes
- Panel de bridges / KPCL online-offline.
- Bandeja de incidentes y cierre manual.
- Metricas historicas.

### Fase 4 - Gobernanza
- Reportes descargables.
- Alertas automatizadas por umbrales.
- Trazabilidad avanzada.

## 11) Criterios de aceptacion
1. Solo admins acceden a `/admin`.
2. KPI reales y consistentes con DB.
3. Incidentes y cambios criticos quedan en `audit_events`.
4. APIs agregadas responden bajo carga normal sin degradar la UI.
5. Cobertura minima de pruebas para auth, roles y endpoints criticos.

## 12) Marco AIoT / PetTech
- **AIoT**: termino principal.
- **PetTech AIoT**: posicionamiento estrategico.
- Hardware = entrada.
- Datos longitudinales = ventaja.
- IA = diferencial.
- Suscripcion = recurrencia.

## 13) Contexto de expansin
- Core: `Kittypau`.
- Verticals en evaluacion: `Kitty Plant`, `Senior Kitty`.
- La expansin no debe degradar el core.

## 14) Referencias relacionadas
- [DOC_MAESTRO_DOMINIO.md](DOC_MAESTRO_DOMINIO.md)
- [GUIA_DECISION.md](GUIA_DECISION.md)
- [BATERIA_ESTIMADA_KPCL.md](BATERIA_ESTIMADA_KPCL.md)



