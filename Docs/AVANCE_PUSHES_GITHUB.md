# Avance de Pushes GitHub (Mauro + Javo)

## Objetivo
Concentrar en un solo documento el avance real de trabajo de ambos colaboradores
segn los `push` en GitHub, para reducir errores de coordinación.

## Regla operativa
Cada vez que Mauro o Javo haga `git push` a su rama personal:
1. Registrar una nueva fila en este documento.
2. Actualizar su bitácora individual:
   - `Docs/GITHUB_MAURO.md`
   - `Docs/GITHUB_JAVO.md`
3. Si corresponde, agregar enlace de PR.

## Rams oficiales monitoreadas
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
| 2026-03-02 | Mauro | test/fusion-main-javo-mauro-2026-03-02 | 7768c57 | test: merge mauro branch into main test | pendiente | prueba de fusion publicada para evaluación (sin tocar `main`) |
| 2026-03-04 | Javo | feat/javo-mauro | 915530b | feat(iot): KPCL0036 firmware calibration mode + bridge v2.6 readings sync | #14 | push realizado, PR abierto, CI parcial (Policy OK / Lint fail pre-existente) |
| 2026-03-04 | Javo | feat/javo-mauro | 904db38 | fix(ci): exclude .example files from tracked .env policy check | #14 | push realizado, Repo Policy Checks ahora PASS |

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

## Actualizacion 2026-03-05
| Fecha | Colaborador | Rama | Commit (hash corto) | Mensaje commit | PR | Estado |
|---|---|---|---|---|---|---|
| 2026-03-04 | Mauro | main | 633130b | merge: integrate feat/mauro-curcuma into main | n/a | merge manual completado en rama comun |
| 2026-03-05 | Mauro | main | a3a51fa | chore(devx): add kittypau dev toolkit scripts and pre-commit hook | n/a | toolkit dev agregado y publicado en main |
| 2026-03-05 | Javo | feat/javo-mauro | 738c07d | fix(ci): resolve all App Lint + Build errors blocking PR #14 | #14 | push para destrabar CI del PR |
| 2026-03-05 | Javo | feat/javo-mauro | e41f98e | fix(ci): use valid supabase placeholders for CI build | #14 | checks en verde (lint/build + policy + vercel) |
| 2026-03-05 | Mauro | feat/mauro-curcuma | 92e0d95 | merge origin/main into feat/mauro-curcuma | n/a | rama de trabajo mauro sincronizada con main |
| 2026-03-09 | Mauro | main | daff54f | feat(apk): center and enlarge login brand block without web regressions | n/a | push realizado + deploy productivo en Vercel |


