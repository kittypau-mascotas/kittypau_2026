# GitHub - Flujo Oficial de Trabajo (Kittypau)

## Objetivo
Definir un solo procedimiento para Mauro y Javier al trabajar en GitHub.
Este documento debe ser la referencia base para cualquier asistente/IA.

## Definiciones clave
- `origin`: nombre del remoto GitHub (no es una rama).
- Rama comun de integracion: `main`.
- Rama personal Mauro: `feat/mauro-curcuma`.
- Rama personal Javo: `feat/javo-mauro`.

## Regla principal
Nadie trabaja directo en `main`.
Todo cambio pasa por rama personal + Pull Request.

## Configuracion de identidad
Mauro:
```bash
git config user.name "Mauro Curcuma"
git config user.email "mauro.carcamo89@gmail.com"
```

Javo:
```bash
git config user.name "javo"
git config user.email "javomauro.contacto@gmail.com"
```

## Inicio de trabajo diario
Mauro:
```bash
git fetch origin --prune
git checkout feat/mauro-curcuma
git pull origin feat/mauro-curcuma
git merge origin/main
```

Javo:
```bash
git fetch origin --prune
git checkout feat/javo-mauro
git pull origin feat/javo-mauro
git merge origin/main
```

## Flujo de cambios
1. Editar archivos locales.
2. Revisar cambios:
```bash
git status
git diff
```
3. Commit:
```bash
git add <archivos>
git commit -m "feat(...): descripcion"
```
4. Push:
```bash
git push origin <rama-personal>
```
5. Abrir PR hacia `main`.

## Reglas de Pull Request
- PR pequena y enfocada.
- Incluir evidencia de pruebas.
- No incluir secretos ni `.env`.
- Si hay cambios IoT/firmware, seguir:
  - `Docs/PLAYBOOK_INGRESO_IOT_FIRMWARE.md`
  - `Docs/ONBOARDING_JAVIER.md`
  - `Docs/GITHUB_JAVO.md`
  - `Docs/GITHUB_MAURO.md`
  - `Docs/AVANCE_PUSHES_GITHUB.md`

## Resolucion de conflictos
Si aparece conflicto al actualizar rama:
```bash
git fetch origin
git merge origin/main
```
Resolver conflicto en editor, luego:
```bash
git add .
git commit
git push origin <rama-personal>
```

## Que no hacer
- No hacer push a `main`.
- No borrar ramas activas del otro.
- No commitear claves, tokens o contraseñas.
- No mezclar cambios no relacionados en un mismo PR.

## Criterio de rama comun
La rama comun del proyecto es `main`.
`origin` se usa solo como remoto para sincronizar con GitHub.

## Registro obligatorio por push
Despues de cada `git push` (Mauro o Javo), actualizar:
- `Docs/AVANCE_PUSHES_GITHUB.md` (estado consolidado)
- bitácora individual correspondiente (`GITHUB_MAURO` o `GITHUB_JAVO`)

## Revision mensual obligatoria (cada 1 mes)
Objetivo:
- evaluar fusion de trabajo de Mauro y Javo a `main`,
- validar coherencia tecnica, funcional y documental.

Checklist mensual:
1. Revisar bitacoras:
   - `Docs/GITHUB_MAURO.md`
   - `Docs/GITHUB_JAVO.md`
2. Comparar cambios contra `main`:
```bash
git fetch origin --prune
git log --oneline origin/main..origin/feat/mauro-curcuma
git log --oneline origin/main..origin/feat/javo-mauro
git diff --name-only origin/main...origin/feat/mauro-curcuma
git diff --name-only origin/main...origin/feat/javo-mauro
```
3. Definir lista de PRs de fusion del mes.
4. Ejecutar pruebas minimas antes de merge.
5. Registrar resultado de la revision mensual en ambas bitacoras.


