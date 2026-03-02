# Avance de Pushes GitHub (Mauro + Javo)

## Objetivo
Concentrar en un solo documento el avance real de trabajo de ambos colaboradores
segun los `push` en GitHub, para reducir errores de coordinación.

## Regla operativa
Cada vez que Mauro o Javo haga `git push` a su rama personal:
1. Registrar una nueva fila en este documento.
2. Actualizar su bitácora individual:
   - `Docs/GITHUB_MAURO.md`
   - `Docs/GITHUB_JAVO.md`
3. Si corresponde, agregar enlace de PR.

## Ramas oficiales monitoreadas
- `origin/feat/mauro-curcuma`
- `origin/feat/javo-mauro`
- Rama común de integración: `origin/main`

## Plantilla de registro
```md
| Fecha | Colaborador | Rama | Commit (hash corto) | Mensaje commit | PR | Estado |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | Mauro/Javo | feat/... | abc1234 | feat(...): ... | #123 o pendiente | push realizado / mergeado a main |
```

## Registro de avances
| Fecha | Colaborador | Rama | Commit (hash corto) | Mensaje commit | PR | Estado |
|---|---|---|---|---|---|---|
| 2026-03-02 | Mauro | feat/mauro-curcuma | e9913af | feat(login): implement 6-step food/water bowl cycle with randomized sound groups | pendiente | rama creada y sincronizada con `main` |
| 2026-03-02 | Javo | feat/javo-mauro | e9913af | feat(login): implement 6-step food/water bowl cycle with randomized sound groups | pendiente | rama creada y sincronizada con `main` |
| 2026-03-02 | Mauro | feat/mauro-curcuma | 928bda7 | chore(github): enforce collaboration guardrails and merge governance | pendiente | push realizado (PR 1 infra de colaboración listo) |

## Comandos de verificación rápida
```bash
git fetch origin --prune
git log --oneline -n 5 origin/feat/mauro-curcuma
git log --oneline -n 5 origin/feat/javo-mauro
git log --oneline -n 5 origin/main
```

## Criterio de orden y coherencia
1. Este documento muestra "estado de pushes" consolidado.
2. `GITHUB_MAURO.md` y `GITHUB_JAVO.md` guardan detalle narrativo por jornada.
3. La revisión mensual obligatoria usa este documento como fuente primaria.
