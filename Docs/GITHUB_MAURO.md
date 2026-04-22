# GitHub_Mauro - Bitacora de Cambios

## Uso
Documento operativo para registrar el trabajo de Mauro en GitHub.
Actualizar en cada jornada y en cada PR relevante.

## Plantilla de entrada
```md
## <YYYY-MM-DD>
- Rama: feat/mauro-curcuma
- Objetivo:
- Cambios realizados:
- Archivos principales:
- PR/Commit:
- Pruebas ejecutadas:
- Riesgos/Pendientes:
```

## Registro

## 2026-04-07
- Rama: feat/mauro-curcuma
- Objetivo: Hito operativo de platos (KPCL0034/KPCL0036) con data real para Bandida.
- Cambios realizados:
  - Se dejaron ambos platos funcionando en Today con datos reales.
  - Inicio de recoleccion de data de Bandida (tester).
- Archivos principales:
  - Docs/investigacion/HITO_2026-04-07_PLATOS_BANDIDA.md
  - Docs/investigacion/DIAGNOSTICO_ERRORES_Y_REGISTROS_2026-04-07.md
- PR/Commit: Pendiente.
- Pruebas ejecutadas:
  - Validacion de funcionamiento en Today.
- Riesgos/Pendientes:
  - Seguir capturando data y revisar estabilidad de sensores.

## 2026-03-02
- Rama: feat/mauro-curcuma
- Objetivo: Estructurar flujo colaborativo Mauro/Javo y base de integracion IoT.
- Cambios realizados:
  - Creacion de rams personales remotas.
  - Integracion inicial de artefactos IoT/Firmware de Javier en ruta segura.
  - Creacion de docs de onboarding y flujo oficial de GitHub.
- Archivos principales:
  - Docs/GITHUB_FLUJO_OFICIAL.md
  - Docs/ONBOARDING_JAVIER.md
  - Docs/INTEGRACION_JAVIER_IOT.md
- PR/Commit: Pendiente de consolidacion en PR.
- Pruebas ejecutadas: Verificacion de rams y referencias documentales.
- Riesgos/Pendientes:
  - Consolidar merge mensual controlado hacia `main`.
  - Mantener bitacora actualizada por cada PR.

## 2026-03-02 (push infra colaboracion)
- Rama: feat/mauro-curcuma
- Objetivo: Implementar guardrails de colaboración y gobernanza para unión limpia.
- Cambios realizados:
  - Creación de `.github/CODEOWNERS`.
  - Creación de `pull_request_template.md`.
  - Workflow CI `pr-quality.yml` (lint/build + políticas).
  - Workflow mensual `monthly-fusion-review.yml`.
  - Documentación de gobernanza, flujo oficial, onboarding y plan de 3 PRs.
  - Ajuste `.gitignore` para excluir carpetas locales de referencia.
- Archivos principales:
  - `.github/workflows/pr-quality.yml`
  - `.github/workflows/monthly-fusion-review.yml`
  - `Docs/GITHUB_GOBERNANZA_COLABORACION.md`
  - `Docs/PLAN_3PRS_UNION_LIMPIA.md`
  - `Docs/AVANCE_PUSHES_GITHUB.md`
- PR/Commit:
  - Commit: `928bda7`
  - PR: pendiente de apertura desde `feat/mauro-curcuma` hacia `main`
- Pruebas ejecutadas:
  - `npm run build` en `kittypau_app`: OK
  - `npm run lint` en `kittypau_app`: FALLA por errores preexistentes del repositorio (fuera del alcance de este PR de infraestructura)
- Riesgos/Pendientes:
  - Activar protección de rama `main` en GitHub UI (paso manual).
  - Abrir y mergear PR 1 (infra).
  - Luego ejecutar PR 2 (iot_firmware) y PR 3 (bridge/app).

## 2026-03-02 (prueba de fusion a main)
- Rama: test/fusion-main-javo-mauro-2026-03-02
- Objetivo: Simular fusion conjunta Mauro/Javo a `main` sin tocar `main` real.
- Cambios realizados:
  - Rama test creada desde `origin/main`.
  - Merge de `origin/feat/javo-mauro` (sin cambios adicionales).
  - Merge de `origin/feat/mauro-curcuma` (guardrails y docs integradas).
  - Publicación de rama test en remoto.
  - Verificación de retorno a rams `feat/javo-mauro` y `feat/mauro-curcuma`.
- Archivos principales:
  - `Docs/REGISTRO_PRUEBA_FUSION_MAIN_JAVO_MAURO_2026-03-02.md`
  - `Docs/AVANCE_PUSHES_GITHUB.md`
- PR/Commit:
  - Commit merge test: `7768c57`
  - Rama remota: `origin/test/fusion-main-javo-mauro-2026-03-02`
- Pruebas ejecutadas:
  - Simulación de merge conjunta en rama de test: OK
  - Retorno a rams personales: OK
- Riesgos/Pendientes:
  - Repetir prueba cuando Javo tenga cambios nuevos sobre `feat/javo-mauro`.

## 2026-03-05
- Rama: feat/mauro-curcuma
- Objetivo: Sincronizar rama de trabajo de Mauro con main y dejar trazabilidad operativa.
- Cambios realizados:
  - Merge de origin/main en feat/mauro-curcuma (incluye UI today/nav y toolkit dev).
  - Soporte operativo para destrabar PR #14 de Javo (seguimiento de checks y CI).
  - Registro documental consolidado en avance maestro y bitcoras.
- Archivos principales:
  - Docs/AVANCE_PUSHES_GITHUB.md
  - Docs/GITHUB_MAURO.md
  - Docs/GITHUB_MAESTRO.md
  - Docs/INDEX.md
  - Docs/KITTYPAU_DEV_TOOLKIT.md
- PR/Commit:
  - Merge en rama Mauro: `92e0d95`
  - Main con toolkit: `a3a51fa`
- Pruebas ejecutadas:
  - PR #14: checks en verde (App Lint + Build, Repo Policy, Vercel).
  - Validacion local en kittypau_app: lint sin errores bloqueantes y build OK.
- Riesgos/Pendientes:
  - Hacer merge final del PR #14 a main.
  - Ejecutar pull de main en ambos PCs tras el merge.


