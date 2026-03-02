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

## 2026-03-02
- Rama: feat/mauro-curcuma
- Objetivo: Estructurar flujo colaborativo Mauro/Javo y base de integracion IoT.
- Cambios realizados:
  - Creacion de ramas personales remotas.
  - Integracion inicial de artefactos IoT/Firmware de Javier en ruta segura.
  - Creacion de docs de onboarding y flujo oficial de GitHub.
- Archivos principales:
  - Docs/GITHUB_FLUJO_OFICIAL.md
  - Docs/ONBOARDING_JAVIER.md
  - Docs/INTEGRACION_JAVIER_IOT.md
- PR/Commit: Pendiente de consolidacion en PR.
- Pruebas ejecutadas: Verificacion de ramas y referencias documentales.
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
