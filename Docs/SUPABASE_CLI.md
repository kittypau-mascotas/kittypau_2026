# Supabase CLI (Kittypau)

## Objetivo
Gestionar schema y migraciones de la base de datos.

## Uso recomendado (npx)
```powershell
npx supabase --version
```

## Login
```powershell
npx supabase login
```

## Link al proyecto
```powershell
npx supabase link --project-ref zgwqtzazvkjkfocxnxsh
```

## Migraciones
Crear migracion:
```powershell
npx supabase migration new apply_schema
```
Pegar contenido de `Docs/SQL_SCHEMA.sql` en el archivo creado y luego:
```powershell
npx supabase db push
```

## Pull schema (referencia)
```powershell
npx supabase db pull
```

## Lint
```powershell
npx supabase db lint
```

## Buenas practicas
- Mantener migraciones en `supabase/migrations/`.
- Aplicar cambios de SQL via migraciones (no manual).
