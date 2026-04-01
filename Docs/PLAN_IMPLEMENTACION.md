# Plan de Implementacion (Solo Documentacion)

## Objetivo
> Documento de seguimiento derivado. El estado vivo resumido del proyecto vive en [`ESTADO_PROYECTO_ACTUAL.md`](ESTADO_PROYECTO_ACTUAL.md).
> Este archivo sirve como checklist tecnico y no como fuente de verdad del proyecto.

Definir las tareas de implementacion para cerrar el MVP sin tocar codigo estrategico.

Este documento complementa a [PLAN_MAESTRO.md](PLAN_MAESTRO.md) y [ARQUITECTURA_PROYECTO.md](ARQUITECTURA_PROYECTO.md).

---

## 1) Login Parallax (UI)
Documento fuente: `Docs/IMAGENES_LOGIN.md`

Tareas:
- Construir layout (grid + overlay).
- Integrar capas parallax con las imagenes.
- Ajustar blur/opacidad y contraste.
- Validar responsivo (desktop/tablet/mobile).

---

## 2) Design System Base
Documento fuente: `Docs/estilos y diseÃ±os.md`

Tareas:
- Implementar `tokens.css`.
- Crear `Button`, `Card`, `Input` base.
- Definir `Container`, `Section`, `Grid`, `Stack`.
- Construir `FormField` con error.

---

## 3) Conectar Frontend con APIs
Documento fuente: `Docs/FRONT_BACK_APIS.md`

Tareas:
- Login con Supabase Auth.
- Listar mascotas y dispositivos.
- Crear mascota y dispositivo (con `pet_id` obligatorio).
- Mostrar lecturas por `device_uuid`.

---

## 4) Realtime
Documento fuente: `Docs/PRUEBAS_E2E.md`

Tareas:
- Suscripcion a `readings` por `device_uuid`.
- Actualizar UI sin refresh.
- Fallback a polling.

---

## 5) Bridge 24/7 (Raspberry)
Documento fuente: `Docs/RASPBERRY_BRIDGE.md`

Tareas:
- Crear servicio systemd.
- Auto-restart y logs.
- Validar reconexion MQTT.

---

## 6) Checklist de deploy final
Documento fuente: `Docs/CHECKLIST_DEPLOY.md`

Tareas:
- Revisar variables de entorno.
- Re-validar endpoints.
- Confirmar webhook y bridge.

---

## 7) Playbook de deploy (backend + rollback)
Tareas:
- Confirmar variables en Vercel.
- Deploy en Vercel desde `kittypau_app`.
- Validar endpoints minimos.
- Si falla, promover el deployment anterior en Vercel.

---

## 8) Proximos avances (plan priorizado)
### P0 - Estabilidad y produccion real
1. Storage policies definitivas para `kittypau-photos`.
2. Refresh token en frontend.
3. Bridge 24/7 (`systemd` + watchdog + logging).
4. Componente Alert unificado.

### P1 - Experiencia de usuario
1. UI kit base (`Button/Input/Card/Alert`).
2. Empty states consistentes.
3. Resumen del dia personalizado.

### P2 - Backend / Operaciones
1. Auditoria completa en `audit_events`.
2. Metricas webhook + tracking de errores.
3. Backpressure: cola / reintentos.

---

## 9) Plan mejora DB actual (Supabase)
- Ver [PLAN_MEJORA_DB_ACTUAL.md](PLAN_MEJORA_DB_ACTUAL.md) para fases, SQL y checklist.

---

## 10) Tareas pendientes: Operacion y Confiabilidad IoT
1. Observabilidad: health-checks, estado vivo y metricas operativas.
2. Monitoreo de disponibilidad: deteccion de offline por timeout para bridge y platos/sensores.
3. Gestion de incidentes: registrar y cerrar incidentes de outage/recovery.
4. Auditoria de eventos: normalizar `audit_events` para cambios de estado.
5. Hardening backend: validar estados, IDs y chequeos en segundo plano.
6. Operacion DevOps/Platform: alinear Vercel + Supabase + bridge.

---

## 11) Tareas pendientes: Portal Admin
Referencia: [ADMIN_PORTAL_PLAN.md](ADMIN_PORTAL_PLAN.md)
1. Crear modelo de roles admin.
2. Implementar autorizacion server-side para `/api/admin/*`.
3. Crear vista `/admin` con vision total.
4. Implementar panel IoT operativo.
5. Agregar `audit_events` en linea.
6. Implementar auditoria obligatoria de acciones admin.

---

## 12) Nota de compatibilidad
Este documento evita repetir estrategia, economia y contexto de expansion: esas capas viven en [DOC_MAESTRO_DOMINIO.md](DOC_MAESTRO_DOMINIO.md) y [PLAN_MAESTRO.md](PLAN_MAESTRO.md).
