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
- `devices.device_id` (Kittypau usa `device_code`)
- `device_summary` con columnas: `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`
- vista `latest_readings`
- columnas nuevas: `notes`, `ip_history`, `retired_at`

Kittypau actual:
- `devices.device_code` (unique)
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
2. **Crear vista `latest_readings`** en base a `readings` (por device_code).
3. **Crear vista `device_summary`** usando `device_code`.
4. **Mantener `device_code`** como fuente de verdad.
5. **Actualizar bridge** para usar `device_code` (si es posible).

### Fase 2 (si se decide renombrar)
1. Renombrar columna `device_code` -> `device_id`.
2. Actualizar indices y constraints.
3. Ajustar APIs/UI a `device_id`.
4. Quitar aliases temporales.

---

## Cambios requeridos en API/UI
Si se renombra a `device_id`:
- API: `devices` CRUD debe leer/escribir `device_id`.
- Webhook: debe mapear `device_id`.
- UI: todas las vistas que muestran `device_code` pasan a `device_id`.
- Realtime: filtros por `device_id`.

Si se mantiene `device_code` y solo se agregan columnas:
- APIs/UI no cambian salvo exponer nuevos campos en `device_summary`.
- Bridge debe enviar `device_code`.

---

## Riesgos y mitigaciones
- **Riesgo**: romper UI/API si renombramos sin migracion.
  Mitigacion: fase 1 con compatibilidad y alias.
- **Riesgo**: datos duplicados si bridge manda `device_id` distinto.
  Mitigacion: normalizar device_id == device_code.
- **Riesgo**: vistas referencian columnas inexistentes.
  Mitigacion: agregar columnas antes de crear vistas.

---

## Checklist previo a ejecutar cambios
1. Confirmar si bridge puede enviar `device_code`.
2. Decidir: mantener `device_code` o renombrar a `device_id`.
3. Ejecutar migracion en staging (Supabase).
4. Validar API `/api/devices` y `/api/readings`.
5. Validar bridge con MQTT CLI + webhook.

---

## Recomendacion
Mantener `device_code` y **agregar compatibilidad** (Fase 1).
Renombrar solo si el bridge no puede cambiarse.

