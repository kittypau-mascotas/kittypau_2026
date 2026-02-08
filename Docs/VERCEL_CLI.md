# Vercel CLI (Kittypau)

## Objetivo
Administrar deployments, vincular el repo y revisar logs del proyecto.

## Instalacion
Recomendado usar `npx` (sin instalacion global):
```powershell
npx vercel --version
```

## Login
```powershell
npx vercel login
```

## Link del proyecto
```powershell
npx vercel link --yes
```
Nota: puede sobrescribir `.env.local` local con variables del proyecto.

## Listar deployments
```powershell
npx vercel ls
```

## Ver logs
```powershell
npx vercel logs
```

## Variables de entorno
```powershell
npx vercel env ls
```

## Buenas practicas
- No subir `.env.local` con secretos al repo.
- Validar que el proyecto vinculado sea el correcto antes de deploy.
