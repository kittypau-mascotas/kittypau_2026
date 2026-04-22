# Guia de Clonado para Javier (ejecutable por IA)

Objetivo: asegurar que Javier está autnticado con la cuenta correcta de GitHub antes de clonar y trabajar.

Cuenta esperada:
- Email Git: `javomauro.contacto@gmail.com`
- Usuario GitHub esperado: `javo-mauro`

Repositorio a clonar:
- `https://github.com/kittypau-mascotas/kittypau_2026.git`

---

## Paso 1: Verificar identidad local de Git
Ejecutar:
```powershell
git config --global user.name
git config --global user.email
```

Esperado:
- `user.email` = `javomauro.contacto@gmail.com`

Si no coincide, corregir:
```powershell
git config --global user.name "javo"
git config --global user.email "javomauro.contacto@gmail.com"
```

---

## Paso 2: Verificar cuenta GitHub autenticada (obligatorio antes de clonar)

## Opcion A (recomendada): con GitHub CLI (`gh`)
1. Ver si existe:
```powershell
gh --versin
```
2. Login:
```powershell
gh auth login
```
3. Verificar usuario autnticado:
```powershell
gh auth status
gh api user --jq ".login"
```

Esperado:
- Login = `javo-mauro`

Si no coincide, cerrar sesión y repetir:
```powershell
gh auth logout --hostname github.com
gh auth login
```

## Opcion B: sin `gh` (Git Credential Manager)
1. Forzar re-autnticación GitHub:
```powershell
git credential-manager github logout javo-mauro --url https://github.com
```
2. Probar acceso remoto (pedirá login en navegador):
```powershell
git ls-remote https://github.com/kittypau-mascotas/kittypau_2026.git
```
3. Confirmar que no haya `403` y que liste `refs/heads/main`.

---

## Paso 3: Clonar repo en carpeta de trabajo
```powershell
cd "D:\Escritorio\Proyectos\Kittypau"
git clone https://github.com/kittypau-mascotas/kittypau_2026.git
cd kittypau_2026
```

Con carpeta destino personalizada:
```powershell
git clone https://github.com/kittypau-mascotas/kittypau_2026.git kittypau_2026_hivemq
cd kittypau_2026_hivemq
```

---

## Paso 4: Verificar remotos y rams oficiales
```powershell
git remote -v
git fetch origin --prune
git branch -a
```

Deben existir:
- `origin/main`
- `origin/feat/javo-mauro`
- `origin/feat/mauro-curcuma`

---

## Paso 5: Cambiar a rama de Javier
```powershell
git checkout -b feat/javo-mauro origin/feat/javo-mauro
git pull origin feat/javo-mauro
git branch --show-current
```

Esperado:
- rama actual = `feat/javo-mauro`

---

## Paso 6: Setup app local (sin Docker)
```powershell
cd kittypau_app
npm install
```

Crear `kittypau_app/.env.local` con variables del equipo (por canal seguro), luego:
```powershell
npm run dev
```

---

## Paso 7: Verificación final de onboarding
```powershell
git status
git config user.email
git branch --show-current
```

Esperado:
- email = `javomauro.contacto@gmail.com`
- rama = `feat/javo-mauro`
- sin errores de permisos con `origin`

---

## Registro obligatorio tras primer push
Actualizar:
- `Docs/GITHUB_JAVO.md`
- `Docs/AVANCE_PUSHES_GITHUB.md`

Seguir también:
- `Docs/ONBOARDING_JAVIER.md`
- `Docs/GITHUB_FLUJO_OFICIAL.md`

---

## Paso 8: Crear Pull Request con GitHub CLI (flujo oficial)
Login por navegador:
```powershell
gh auth login -h github.com -p https -w
```

Senales de exito esperadas:
- `Authentication complete.`
- `Logged in as javo-mauro`

Crear PR hacia `main`:
```powershell
gh pr create --base main --head feat/javo-mauro --title "feat(...): <descripcion>" --fill
```

Senales de exito esperadas:
- `Creating pull request for feat/javo-mauro into main in kittypau-mascotas/kittypau_2026`
- URL del PR: `https://github.com/kittypau-mascotas/kittypau_2026/pull/<numero>`

Nota:
- Si el usuario autnticado no es `javo-mauro`, ejecutar:
```powershell
gh auth logout --hostname github.com
gh auth login -h github.com -p https -w
gh api user --jq ".login"
```


