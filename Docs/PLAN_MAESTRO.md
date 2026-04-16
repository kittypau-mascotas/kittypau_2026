# Plan Maestro - Kittypau

Guia maestra viva para orientar el trabajo del ecosistema Kittypau.

## Como leer este documento
- Si quieres contexto estrategico y de producto, empieza aqui.
- Si necesitas la foto viva del proyecto, lee [ESTADO_PROYECTO_ACTUAL.md](ESTADO_PROYECTO_ACTUAL.md).
- Si necesitas la fuente oficial de nombres, carpetas y tablas, lee [FUENTE_DE_VERDAD.md](FUENTE_DE_VERDAD.md).
- Si buscas el detalle de implementacion o SQL, sigue los enlaces de secciones mas abajo.

## 1) Vision y estado actual
- Objetivo MVP: usuario se registra, agrega mascota, registra dispositivo y ve datos en vivo desde la app web.
- Stack activo: `kittypau_app/`, `bridge/`, `supabase/`, `iot_firmware/`, `Docs/`.
- Principio operativo: no romper el flujo `login -> mascota -> dispositivo -> datos`.

## 2) Arquitectura de producto
- Frontend + API: Next.js en Vercel.
- DB/Auth/Realtime: Supabase.
- MQTT: HiveMQ Cloud.
- Bridge 24/7: Raspberry Pi Zero 2 W.
- Fuente canonica de estructura: [ARQUITECTURA_PROYECTO.md](ARQUITECTURA_PROYECTO.md).

## 3) Modelo de datos
- Base relacional oficial: [SQL_SCHEMA.sql](SQL_SCHEMA.sql) y [SQL_MAESTRO.md](SQL_MAESTRO.md).
- Tablas operativas clave:
  - `public.profiles`
  - `public.pets`
  - `public.devices`
  - `public.readings`
  - `public.device_operation_records`
  - `public.device_power_sessions`
  - `public.device_battery_cycles`
- Mejora incremental de DB: [PLAN_MEJORA_DB_ACTUAL.md](PLAN_MEJORA_DB_ACTUAL.md).

## 4) Implementacion tecnica
- Roadmap tecnico: [PLAN_IMPLEMENTACION.md](PLAN_IMPLEMENTACION.md).
- Esquema y decisiones de DB: [PLAN_SQL_ESTRUCTURA.md](PLAN_SQL_ESTRUCTURA.md).
- Integracion Raspberry Bridge: [RASPBERRY_INTEGRATION_PLAN.md](RASPBERRY_INTEGRATION_PLAN.md).
- Flujo tecnico general: [FRONT_BACK_APIS.md](FRONT_BACK_APIS.md).

## 5) Operacion y calidad
- Estado actual del proyecto: [ESTADO_PROYECTO_ACTUAL.md](ESTADO_PROYECTO_ACTUAL.md).
- Estado de avance: [ESTADO_AVANCE.md](ESTADO_AVANCE.md).
- Pruebas E2E: [PRUEBAS_E2E.md](PRUEBAS_E2E.md).
- Auditoria de coherencia: [AUDITORIA_COHERENCIA_ECOSISTEMA.md](AUDITORIA_COHERENCIA_ECOSISTEMA.md).
- Guia de decision operativa: [GUIA_DECISION.md](GUIA_DECISION.md).
- Registro historico de ejecucion: [EJECUCION_GUIA_DECISION_2026-03-09.md](EJECUCION_GUIA_DECISION_2026-03-09.md).

## 6) Estrategia de negocio
- Documento maestro de dominio, estrategia y economia: [DOC_MAESTRO_DOMINIO.md](DOC_MAESTRO_DOMINIO.md).
- Analisis economico historico: [ANALISIS_ECONOMICO_KITTYPAU.md](ANALISIS_ECONOMICO_KITTYPAU.md).
- Modelo estrategico historico: [KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md](KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md).

## 7) Documentacion relacionada, pero especializada
- Finanzas admin: [ADMIN_FINANZAS_CONTAINER_SPEC.md](ADMIN_FINANZAS_CONTAINER_SPEC.md).
- Portal admin (vivo): [ADMIN_PORTAL_PLAN.md](ADMIN_PORTAL_PLAN.md).
- Dashboard admin historico: [ADMIN_DASHBOARD_INFORMATION_ARCHITECTURE.md](ADMIN_DASHBOARD_INFORMATION_ARCHITECTURE.md).
- Validacion historica: [VALIDACION_ADMIN_DASHBOARD.md](VALIDACION_ADMIN_DASHBOARD.md).
- Bateria y sesiones: [BATERIA_ESTIMADA_KPCL.md](BATERIA_ESTIMADA_KPCL.md).

## 8) Documento legado consolidado
- El antiguo [PLAN_PROYECTO_KITTYPAU.md](PLAN_PROYECTO_KITTYPAU.md) quedo como puntero historico.
- Su contenido util ya vive aqui y en la arquitectura, DB y docs de operacion.

## 9) Regla de coherencia
- Si algo entra en conflicto con la fuente de verdad o con este plan maestro, primero actualiza la fuente y luego replica el cambio en los docs dependientes.



