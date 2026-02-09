# Migracion de esquema para compatibilidad Raspberry (plan previo)

## Objetivo
Unificar el esquema de la Raspberry (bridge) con Kittypau sin borrar datos existentes.
Se permite **renombrar columnas** y **agregar columnas/vistas** para compatibilidad.
No se ejecuta nada hasta aprobar este plan.

---

## Alcance
1. Alinear nombres entre bridge y Kittypau.
2. Agregar columnas usadas por el bridge.
3. Crear vistas requeridas por el bridge (`latest_readings`, `device_summary`).
4. Ajustar API y UI para nuevos nombres.
5. Mantener compatibilidad temporal (aliases) hasta migracion final.

---

## Diferencias detectadas (bridge vs Kittypau)
Bridge usa:
- `devices.device_id` (string KPCLxxxx)
- `device_summary` con columnas: `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`
- vista `latest_readings`
- columnas nuevas: `notes`, `ip_history`, `retired_at`

Kittypau actual:
- `devices.device_id` (string KPCLxxxx, único)
- `devices.id` (UUID, PK)
- no tiene `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`
- no tiene `latest_readings` ni `device_summary`

---

## Estrategia propuesta (sin perder datos)
### Fase 1 (compatibilidad)
1. **Agregar columnas** a `devices`:
   - `notes` TEXT
   - `ip_history` JSONB default '[]'
   - `retired_at` TIMESTAMPTZ
   - `wifi_status` TEXT
   - `wifi_ssid` TEXT
   - `wifi_ip` TEXT
   - `sensor_health` TEXT
2. **Crear vista `latest_readings`** en base a `readings` (por `devices.id` y `devices.device_id`).
3. **Crear vista `device_summary`** usando `device_id` (KPCL) como clave humana.
4. **Mantener `device_id`** como fuente de verdad para el bridge.
5. **Actualizar bridge** para enviar `device_id` (KPCL) y opcional `device_uuid` (devices.id).

---

## Cambios requeridos en API/UI
- API: `devices` CRUD debe leer/escribir `device_id` (KPCL).
- Webhook: acepta `device_id` (KPCL) y opcional `device_uuid` (UUID).
- UI: mostrar `device_id` (KPCL) como identificador humano.
- Realtime: filtros por `devices.id` (UUID) se mantienen.

---

## Riesgos y mitigaciones
- **Riesgo**: romper UI/API si renombramos sin migracion.
  Mitigacion: fase 1 con compatibilidad y alias.
- **Riesgo**: datos duplicados si bridge manda `device_id` distinto.
  Mitigacion: normalizar device_id (KPCL) y validar formato.
- **Riesgo**: vistas referencian columnas inexistentes.
  Mitigacion: agregar columnas antes de crear vistas.

---

## Checklist previo a ejecutar cambios
1. Confirmar que bridge envía `device_id` (KPCL).
2. Confirmar si bridge puede enviar `device_uuid` (opcional).
3. Ejecutar migracion en staging (Supabase).
4. Validar API `/api/devices` y `/api/readings`.
5. Validar bridge con MQTT CLI + webhook.

---

## Recomendacion
Aplicar Fase 1 y mantener `device_id` como identificador humano compatible con bridge.


