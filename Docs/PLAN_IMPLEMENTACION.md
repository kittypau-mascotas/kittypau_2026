# Plan de Implementación (Solo Documentación)

## Objetivo
Definir las tareas de implementación para cerrar el MVP sin tocar código.

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
Documento fuente: `Docs/estilos y diseños.md`

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
- Suscripción a `readings` por `device_uuid`.
- Actualizar UI sin refresh.
- Fallback a polling.

---

## 5) Bridge 24/7 (Raspberry)
Documento fuente: `Docs/RASPBERRY_BRIDGE.md`

Tareas:
- Crear servicio systemd.
- Auto-restart y logs.
- Validar reconexión MQTT.

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
- Confirmar variables en Vercel (ver Docs/CHECKLIST_DEPLOY.md).
- Deploy en Vercel desde kittypau_app.
- Validar endpoints mínimos.
- Si falla, promover el deployment anterior en Vercel.


---

## Plan de trabajo para mañana (acordado)
1. Front: /bowl y /settings (polish visual + empty/error states).
2. Front: /story cards (densidad, variaciones, filtro por día) y CTA de exploración.
3. Front: onboarding final (copys, micro-UX, validación y guía de siguiente paso).
4. Docs: actualizar Docs/VISTAS_APP.md y Docs/ESTADO_AVANCE.md con avances.
5. Verificación: smoke test UI + endpoints críticos.


---

## Cierre del dia (2026-02-09)
- SMTP y reset password configurados.
- RPC onboarding y schema cache revisados.
- Bridge env example documentado.
- Docs actualizados y enviados a git.

