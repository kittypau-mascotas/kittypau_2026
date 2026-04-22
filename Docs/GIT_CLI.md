# Git CLI (Flujo de Equipo Kittypau)

## Objetivo
Estandarizar trabajo colaborativo (Mauro/Javier/equipo) sin romper `main`.

## Reglas base
1. No trabajar directo en `main`.
2. Todo cambio va por branch + PR.
3. PR pequeno y con evidencia de prueba.
4. Sin secretos en commits.

## 1) Setup inicial
```bash
git config user.name "<TU_NOMBRE>"
git config user.email "<TU_EMAIL>"
git remote -v
```

## 2) Sincronizar rama principal
```bash
git checkout main
git pull origin main
```

## 3) Crear rama de trabajo
```bash
git checkout -b feat/<autor>-<mdulo>
```

Ejemplos:
- `feat/javier-iot-bridge`
- `fix/mauro-admin-javo`

## 4) Commits
Revisar cambios:
```bash
git status
git diff
```

Stage:
```bash
git add <archivo1> <archivo2>
```

Commit:
```bash
git commit -m "feat(iot): mejora bridge heartbeat"
```

## 5) Subir branch
```bash
git push -u origin <tu-rama>
```

## 6) Mantener rama actualizada
```bash
git fetch origin
git rebase origin/main
```
Si prefieren merge:
```bash
git merge origin/main
```

## 7) Resolver conflictos
1. Editar archivos con conflicto.
2. Verificar que compile/pruebe.
3. Continuar:
```bash
git add .
git rebase --continue
```

## 8) Pull Request
Checklist antes de PR:
- [ ] app/bridge/firmware probados segn mdulo
- [ ] docs actualizadas si cambió contrato
- [ ] sin archivos sensibles (`.env`, secretos, dumps)
- [ ] cambios acotados al objetivo

## 9) Comandos tiles
Ultimos commits:
```bash
git log --oneline -n 20
```

Archivos cambiados vs main:
```bash
git diff --name-only origin/main...HEAD
```

Limpiar rams remotas borradas:
```bash
git fetch origin --prune
```

## 10) Convencion sugerida de mensajes
- `feat(...)`
- `fix(...)`
- `docs(...)`
- `chore(...)`
- `refactor(...)`
- `test(...)`


