# Notas para Implementacion (antes de codificar)

## Alcance
Este documento resume los puntos criticos para implementar sin romper el contrato de dominio.

---

## 1) Base de datos
- No aplicar `Docs/SQL_SCHEMA.sql` en el proyecto actual hasta decidir migracion.
- Si hay datos existentes, crear **script de migracion** (no destruir).
- Si es proyecto nuevo, aplicar SQL completo desde cero.

## 1.1) Puente MQTT (plan Free)
- Si HiveMQ no ofrece webhooks, usar `bridge/` para reenviar MQTT -> API.
 - Despliegue recomendado: Raspberry Pi Zero 2 W 24/7.

## 2) Registro de usuario (visual)
- Guardar `auth_provider`, `user_name`, `is_owner`, `owner_name`.
- Validar `care_rating` 1-10.
- Si `notification_channel` incluye WhatsApp, pedir `phone_number`.
- Google/Apple no activos por ahora (solo email).
- El registro se hace en pop-up con progreso persistente.

## 3) Registro de mascota (visual)
- `type` no editable despues.
- Raza: max 3, `quiltro` excluyente.
- Si `has_health_condition = true`, permitir `health_notes`.
- `photo_url` reemplazable (no versionado por ahora).

## 4) Registro de dispositivo (QR)
- QR es obligatorio para obtener `device_id`.
- Asociar siempre a una mascota para activar envio de datos.
- `device_type` solo `food_bowl` o `water_bowl`.
- `pet_id` es obligatorio (schema actual).

## 5) Estados del sistema
- Respetar `pet_state` y `device_state` definidos.
- No hardcodear estados en UI; usar enums oficiales.

## 6) Contratos de API
- Las respuestas deben seguir el contrato del documento maestro.
- Evitar datos incompletos que obliguen a hacks en frontend.

## 7) Validaciones
- `email` unico.
- `phone_number` unico (opcional).
- `weight_kg` en rango por especie.

## 8) Seguridad
- RLS activo en todas las tablas.
- Los endpoints CRUD requieren `Authorization: Bearer <access_token>`.
- El webhook usa `service_role`.

## 9) Eventos del sistema
- Registrar eventos base (`pet_created`, `device_linked`, etc.).
- Serviran para analytics y notificaciones futuras.

## 10) Errores UX
- Sin internet.
- Email existente.
- Dispositivo ya vinculado.
- Sesion expirada.

## 11) Estilo de tablero
- Aplicar paleta y tipografia definidas en `Docs/estilos y diseños.md`.

---

## Checklist antes de programar
- [ ] Aprobado `Docs/DOC_MAESTRO_DOMINIO.md`
- [ ] Revisado `Docs/PLAN_SQL_ESTRUCTURA.md`
- [ ] Decidida estrategia de migracion SQL


