# Planes y Accesos (Plan A / Plan B / Plan C)

## Objetivo
Estandarizar una forma unica de identificar **que plan comercial tiene cada usuario** (cliente real o tester),
y desde eso habilitar reglas de acceso (features, limites y servicios).

> Nota: esto es **independiente** del `account_type` (admin/tester/client).

---

## Modelo de datos (fuente de verdad)
Tabla: `public.profiles`

Campo:
- `profiles.account_plan` (text, NOT NULL)
  - valores permitidos: `plan_a` | `plan_b` | `plan_c`
  - default: `plan_a`

Migracion:
- `supabase/migrations/20260317120000_add_account_plan_to_profiles.sql`

---

## API (para el frontend)
Endpoint existente:
- `GET /api/account/type`

Respuesta (resumen):
- `account_type`: `admin` | `tester` | `client`
- `account_plan`: `plan_a` | `plan_b` | `plan_c`

Uso:
- `account_type` define **rol** (admin/tester).
- `account_plan` define **entitlements comerciales** (Plan A/B/C).

---

## Como asignar el plan a un usuario (operacin)
En Supabase SQL Editor (server-only / admin):

```sql
-- Asignar Plan A
update public.profiles
set account_plan = 'plan_a'
where id = '<USER_ID_UUID>';

-- Asignar Plan B
update public.profiles
set account_plan = 'plan_b'
where id = '<USER_ID_UUID>';

-- Asignar Plan C
update public.profiles
set account_plan = 'plan_c'
where id = '<USER_ID_UUID>';
```

Recomendacion operativa:
- Mantener un listado interno de usuarios testers por email (ver `TESTER_EMAILS`) y **usar `account_plan` solo para plan**.

---

## Definicion Plan A (baseline actual)
Codigo: `plan_a`

Proposito:
- Plan base para **piloto** y **clientes iniciales** (incluye testers si no se decide lo contrario).

Valor (que compra el usuario):
- Visibilidad objetiva (no manual) de alimentacin/hidratacin.
- Datos en vivo + historial para detectar cambios de habito temprano.
- Estado operativo del dispositivo (online/offline, batera, ultima lectura).

Acceso incluido (alneado al MVP actual):
- Login + onboarding (Cuenta -> Usuario -> Mascota -> Dispositivo).
- CRUD de `pets` y `devices` (registro por QR / `device_id` KPCL).
- Dashboard con lecturas y estado vivo via Supabase Realtime.
- Historial de lecturas (lectura desde `readings`).
- Soporte basico (feedback/bugs durante piloto).

Reglas sugeridas (para implementar en backend/UI cuando corresponda):
- Limites por cuenta (ej. mascotas/dispositivos) y features premium deben depender de `account_plan`.
- Precio: definir en documento comercial (este repo lo trata como parmetro externo; durante piloto puede ser $0 o descuento por cohorts).

---

## Plan B / Plan C (placeholder)
Mantener los codigos:
- `plan_b`
- `plan_c`

Definir detalles cuando esten claros:
- limites (mascotas/dispositivos/historial),
- alertas avanzadas,
- integraciones B2B2C,
- SLA/soporte.


