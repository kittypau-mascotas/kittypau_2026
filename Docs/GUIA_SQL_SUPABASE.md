# Guia: Ejecutar SQL en Supabase (Kittypau)

## Objetivo
Crear las tablas, relaciones, indices y RLS del MVP usando `Docs/SQL_SCHEMA.sql`.

## Paso a paso
1. Entra a tu proyecto en Supabase.
2. Ve a **SQL Editor**.
3. Crea un **New Query**.
4. Copia el contenido completo de `Docs/SQL_SCHEMA.sql`.
5. Pegalo en el editor.
6. Haz clic en **Run**.

## Verificacion rapida
1. Ve a **Table Editor**.
2. Confirma que existan:
   - `profiles`
   - `pets`
   - `devices`
   - `readings`
3. Crea una mascota en `pets` (necesario para `devices.pet_id`).
4. Abre `devices` y crea un registro con `device_code`, `device_type` y `pet_id`.
5. Inserta una lectura manual en `readings` para confirmar que guarda bien.

## Notas importantes
- Si ya ejecutaste un SQL anterior, primero limpia con el script de borrado.
- RLS esta habilitado: necesitaras usar el **service role** para inserciones desde el webhook.
- `devices.pet_id` es obligatorio.

## Errores comunes
- **Permisos**: revisar que las policies esten creadas correctamente.
- **UUID**: Supabase usa `auth.users.id`, no inventar ids manuales.
