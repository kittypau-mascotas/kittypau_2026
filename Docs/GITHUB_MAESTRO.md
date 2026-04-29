# GitHub Maestro — Kittypau

Índice de flujo de trabajo, gobernanza y colaboración en GitHub.

---

## Flujo oficial (leer primero)
- [GITHUB_FLUJO_OFICIAL.md](GITHUB_FLUJO_OFICIAL.md) — Rams, commits, PRs, reglas del repo
- [GITHUB_GOBERNANZA_COLABORACION.md](GITHUB_GOBERNANZA_COLABORACION.md) — Branch protection, CI checks, políticas

## Comandos operativos
- [GIT_CLI.md](GIT_CLI.md) — Comandos Git: rebase, merge, stash, log
- [VERCEL_CLI.md](VERCEL_CLI.md) — Deploy, variables de entorno, logs en Vercel
- [SUPABASE_CLI.md](SUPABASE_CLI.md) — Migraciones y comandos de Supabase CLI

## Onboarding (colaboradores nuevos)
- [ONBOARDING_JAVIER.md](ONBOARDING_JAVIER.md) — Setup completo: Git, Node, VS Code, PlatformIO
- [GUIA_CLONADO_JAVO_IA.md](GUIA_CLONADO_JAVO_IA.md) — Autenticación GitHub y clonado del repo

## Bitácoras personales
- [GITHUB_JAVO.md](GITHUB_JAVO.md) — Registro de actividad de Javier
- [GITHUB_MAURO.md](GITHUB_MAURO.md) — Registro de actividad de Mauro
- [AVANCE_PUSHES_GITHUB.md](AVANCE_PUSHES_GITHUB.md) — Tabla consolidada de pushes (ambos)

## Integración de rams
- [PLAN_3PRS_UNION_LIMPIA.md](PLAN_3PRS_UNION_LIMPIA.md) — Estrategia de 3 PRs para fusión limpia
- [REGISTRO_PRUEBA_FUSION_MAIN_JAVO_MAURO_2026-03-02.md](REGISTRO_PRUEBA_FUSION_MAIN_JAVO_MAURO_2026-03-02.md) — Log de prueba de fusión conjunta

## Actualizacion 2026-03-05
- Nuevo documento operativo: [KITTYPAU_DEV_TOOLKIT.md](KITTYPAU_DEV_TOOLKIT.md)
- Estado colaboracion Mauro/Javo:
  - PR #14 (feat/javo-mauro) con checks en verde y listo para merge.
  - Rama `feat/mauro-curcuma` sincronizada con `main` para continuidad de trabajo.
- Recomendacion post-merge:
  - Ambos PCs deben ejecutar `git checkout main && git pull origin main`.

## Actualizacion 2026-04-29 (Merge Hito Bandida)
- Estado: **Fusión Exitosa**.
- Descripción: Se integran las actualizaciones de telemetría real para los platos `KPCL0034` (Agua) y `KPCL0036` (Comida).
- Ramas involucradas: `feat/javo-mauro` y `feat/mauro-curcuma`.
- Próximos pasos: Monitoreo de estabilidad de sensores HX711 en ambiente real con Bandida.
