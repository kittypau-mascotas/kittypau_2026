# Checklist de Deploy (Kittypau)

## 1) Supabase listo
- [ ] Proyecto creado en Supabase.
- [ ] Ejecutar `Docs/SQL_SCHEMA.sql` en SQL Editor.
- [ ] Refresh de **Schema Cache** en Supabase (API -> Schema -> Refresh cache).
- [ ] Auth habilitado (email/password).
- [ ] Obtener `SUPABASE_URL` y keys.
- [ ] Crear al menos 1 mascota en `pets`.
- [ ] Crear al menos 1 dispositivo en `devices` con `device_id` y `pet_id`.

## 2) Variables de entorno en Vercel
Agregar en **Settings -> Environment Variables**:
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `MQTT_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2.1) Verificacion cruzada de variables (Vercel + Raspberry)
- [ ] `MQTT_WEBHOOK_SECRET` es el mismo en Vercel y en la Raspberry.
- [ ] `WEBHOOK_URL` en la Raspberry apunta a `https://kittypau-app.vercel.app/api/mqtt/webhook`.
- [ ] `SUPABASE_URL` y keys correctas en Vercel (coinciden con el proyecto activo).

## 3) Deploy en Vercel
- [ ] Crear proyecto en Vercel.
- [ ] Seleccionar carpeta `kittypau_app`.
- [ ] Framework detectado: Next.js.
- [ ] Deploy exitoso.

## 4) Webhook en HiveMQ
- [ ] HiveMQ Free no ofrece webhook nativo.
- [ ] Usar Raspberry Bridge para reenviar MQTT -> API.

## 5) Prueba de extremo a extremo
- [ ] Enviar POST de prueba al webhook.
- [ ] Verificar insercion en `readings`.
- [ ] Confirmar `devices.last_seen` actualizado.
- [ ] Registrar dispositivo desde app con QR y asociarlo a una mascota.
- [ ] Nota: `access_token` de Supabase expira ~1h, regenerar durante pruebas largas.

## 6) Realtime (opcional)
- [ ] Suscripcion activa en frontend.
- [ ] Ver datos en vivo al insertar lecturas.

## 7) Rollback (si falla el deploy)
- [ ] En Vercel -> Deployments -> Promote el deploy anterior.

## Estado local (hasta 2026-02-03)
- [x] Endpoint `/api/mqtt/webhook` creado.
- [x] Script local `scripts/test-webhook.ps1` funciona.
- [x] Prueba local con `success: true`.

