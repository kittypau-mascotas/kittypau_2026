# Storage + Policies (Supabase)

## Objetivo
Habilitar subida y lectura de fotos de usuario y mascota desde el onboarding.

## Bucket
Crear bucket **`kittypau-photos`** en Supabase Storage.

- Tipo: Publico (recomendado para simplificar el onboarding)
- Si prefieres privado, usa las politicas de abajo.

## SQL (policies)
Ejecutar en SQL Editor (rol postgres).

```sql
-- Lectura publica del bucket (si quieres mostrar fotos sin firmar)
create policy "photos_select"
on storage.objects for select
using (bucket_id = 'kittypau-photos');

-- Subida para usuarios autenticados
create policy "photos_insert_auth"
on storage.objects for insert
with check (bucket_id = 'kittypau-photos' and auth.role() = 'authenticated');
```

## Columnas requeridas

```sql
alter table public.profiles
add column if not exists photo_url text;
```

> `pets.photo_url` ya existe en el esquema actual.

## Notas
- Onboarding usa `photo_url` en `profiles` y `pets`.
- Tamaño max recomendado: 5MB por imagen.
