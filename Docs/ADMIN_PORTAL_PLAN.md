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
- Implementación: en producción parcial.
  - Portal admin operativo en `/admin`.
  - KPIs, continuidad, auditoría y costos financieros visibles.
  - Suite de tests admin integrada en dashboard.
  - Pendiente externo: rotación de claves y costos reales HiveMQ.

## Incremento aplicado (MVP Ops)
- Filtros básicos para `audit_events` (críticos/bridge/dispositivos/outages/todos).
- Ventana de tiempo configurable (15 min, 60 min, 3 h, 24 h).
- Deduplicación en backend por ventana corta (por defecto 30s) para evitar spam de eventos repetidos.

## Incremento propuesto (Finanzas v1)
- Agregar container final "Resumen de Finanzas" en `/admin`.
- Basar datos en:
  - `public.finance_kit_components`
  - `public.finance_provider_plans`
  - `public.finance_monthly_snapshots`
  - `public.finance_admin_summary`
- Mostrar:
  - costo unitario estimado,
  - costo cloud mensual,
  - costo mensual total,
  - estado de planes Supabase/Vercel/HiveMQ (free/pago + activo).

## Marco AIoT / PetTech (Alineacion 2026)

### Terminologia oficial recomendada
- **AIoT (Artificial Intelligence of Things)**: termino principal para Kittypau.
- **Intelligent IoT**: variante de comunicacion comercial.
- **Edge AI + IoT**: cuando parte del analisis corre en dispositivo.
- **Smart IoT**: termino marketing, menos tecnico.

### Definicion recomendada de producto
**Kittypau is an AIoT platform that monitors pet feeding and hydration cycles to generate health insights and preventive alerts.**

### Categoria estrategica
**PetTech AIoT** = PetTech + IoT + IA.

Esto posiciona a Kittypau no como "solo hardware", sino como:
- infraestructura de datos longitudinales de salud animal,
- analitica preventiva,
- plataforma escalable con suscripcion.

### Arquitectura actual (ya compatible con AIoT)
1. Dispositivo IoT (ESP8266/ESP32).
2. Ingestion por MQTT.
3. Bridge Node.js.
4. Persistencia en PostgreSQL/Supabase.
5. Capa de analitica/IA.
6. Dashboard web para usuario/admin.

### Estrategia tipo "Fitbit de mascotas"
- Hardware = punto de entrada.
- Datos longitudinales = ventaja competitiva.
- IA = diferencial de valor.
- Suscripcion = recurrencia (modelo SaaS).

### Casos de uso preventivos (objetivo)
- Riesgo de deshidratacion por baja de consumo de agua en ventana corta.
- Cambios de conducta alimentaria (horario/frecuencia/cantidad).
- Riesgo de sobrepeso por patrones de ingesta sostenidos.

### Modelo de negocio recomendado (3 capas)
1. **Hardware**: ingreso inicial por unidad.
2. **Suscripcion**: dashboard avanzado, recomendaciones y alertas.
3. **Data insights (futuro)**: datos anonimizados para partners (veterinarias, investigacion, marcas).
## Contexto de Expansion del Ecosistema (Fuente: Docs/contexto.md)
- **Foco actual (core)**: `Kittypau` se mantiene como plataforma PetTech AIoT para alimentacion e hidratacion de mascotas.
- **Expansion en evaluacion**: `Kitty Plant` (IoT para plantas) como segunda vertical, reutilizando arquitectura y modelo de datos.
- **Vision de largo plazo**: `Senior Kitty` como posible tercera vertical para cuidados en hogar.
- **Estrategia transversal**: hardware como entrada + datos longitudinales + analitica para insights preventivos.
- **Producto y UX**: interfaz simple, menos friccion en onboarding y vista demo para explicar valor rapido.
- **Gobernanza tecnica**: conservar una base relacional coherente y contratos API estables entre web, app y dispositivos.

### Implicancias para App/Web (Kittypau)
1. `/today` y `navbar` deben mantener consistencia estricta entre mascota activa, `pet_id` y KPCL asociado.
2. Las decisiones visuales deben reforzar lectura rapida de estado real (alimentacion, hidratacion, ambiente, bateria).
3. El backlog funcional prioriza confiabilidad de datos por sobre efectos visuales.
4. Cualquier expansion de vertical (plantas/senior) debe montarse sobre componentes reutilizables del core.
