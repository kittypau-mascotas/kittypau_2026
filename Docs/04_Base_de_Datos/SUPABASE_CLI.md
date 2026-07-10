# Supabase CLI (Kittypau)

## Objetivo
Gestionar migraciones, schema y vlidaciones de base de datos.

## Prerrequisitos
- Node.js/npm
- Acceso al proyecto Supabase

## 1) Verificar CLI
```powershell
npx supabase --versin
```

## 2) Login
```powershell
npx supabase login
```

## 3) Link al proyecto
```powershell
npx supabase link --project-ref <PROJECT_REF>
```

Referencia usada en este proyecto:
- `zgwqtzazvkjkfocxnxsh`

## 4) Flujo de migraciones

Crear migracion:
```powershell
npx supabase migration new <nombre_migracion>
```

Aplicar migraciones:
```powershell
npx supabase db push
```

Traer estado remoto (solo referencia):
```powershell
npx supabase db pull
```

Lint SQL:
```powershell
npx supabase db lint
```

## 5) Reglas del proyecto
- Toda modificacion SQL debe quedar en `supabase/migrations/`.
- No aplicar cambios manuales en prod sin migracion versinada.
- Mantener migraciones idempotentes cuando sea posible.

## 6) Verificaciones despues de `db push`
- Ejecutar scripts de vlidacion:
  - `Docs/TEST_DB_API.ps1`
  - `Docs/TEST_ONBOARDING_BACKEND.ps1`
- Revisar:
  - `Docs/PRUEBAS_E2E.md`
  - `Docs/SQL_CHECK_BRIDGE_UNIQUENESS.sql`

## 7) Problems comunes
- `project not linked`: correr `npx supabase link --project-ref ...`.
- `auth failed`: repetir `npx supabase login`.
- drift entre local/remoto: revisar migraciones faltantes y orden de ejecución.


