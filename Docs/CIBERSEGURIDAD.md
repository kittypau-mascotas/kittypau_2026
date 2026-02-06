# Ciberseguridad (Kittypau)

## Objetivo
Definir controles mínimos para proteger datos, API, MQTT y credenciales.

---

## 1) Superficie de ataque
- API pública en Vercel (`/api/*`).
- Webhook MQTT expuesto.
- Tokens de Supabase (anon y service role).
- Raspberry Bridge 24/7.
- Datos personales (email, ubicación, hábitos).

---

## 2) Controles mínimos (obligatorios)
1. **RLS en Supabase**
   - `profiles`, `pets`, `devices`, `readings` con RLS activo.
2. **Secrets aislados**
   - `SUPABASE_SERVICE_ROLE_KEY` solo en backend.
   - Nunca en frontend ni repositorio.
3. **Webhook protegido**
   - Validar `x-webhook-token`.
4. **Credenciales MQTT**
   - Usuario y password únicos.
   - Rotación trimestral.
5. **Rate limiting (mínimo)**
   - Limitar requests por IP en `/api/mqtt/webhook`.
6. **Logs**
   - No loguear tokens ni credenciales.
7. **Tokens**
   - `access_token` expira ~1h.
   - Regenerar para pruebas largas.

---

## 3) Checklist hardening (Vercel)
- [ ] Variables en Vercel solo como *Environment Variables*.
- [ ] Bloquear acceso público a logs sensibles.
- [ ] Deshabilitar previews si exponen data real.

## 4) Checklist hardening (Supabase)
- [ ] RLS activo en todas las tablas.
- [ ] Policies revisadas.
- [ ] Auth email/password con confirmación.
- [ ] Limitar service role solo en backend.

## 5) Checklist hardening (Raspberry)
- [ ] Usuario no root.
- [ ] SSH con llave, sin password.
- [ ] Firewall habilitado (ufw).
- [ ] Bridge como systemd con restart.
- [ ] `.env` local, no en repo.

---

## 6) Manejo de credenciales
- Guardar secretos en Vercel / Supabase / Raspberry `.env`.
- Rotar `MQTT_WEBHOOK_SECRET` si se filtra.
- Rotar `SUPABASE_SERVICE_ROLE_KEY` si hay incidente.
- Rotar credenciales MQTT en calendario fijo (trimestral recomendado).
- Responsable: equipo backend/infra.

---

## 7) Respuesta a incidentes (básico)
1. Revocar tokens comprometidos.
2. Rotar secretos.
3. Revisar logs (Vercel + Supabase).
4. Avisar al equipo.
5. Documentar incidente en `Docs/ESTADO_AVANCE.md`.

