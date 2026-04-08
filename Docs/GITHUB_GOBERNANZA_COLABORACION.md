# GitHub Gobernanza de Colaboración (Checklist de Control)

## Objetivo
Checklist único para asegurar colaboración segura entre Mauro y Javo antes de fusionar a `main`.

## 1) Protección de rama `main` (obligatorio)
Configurar en GitHub:
`Settings -> Branches -> Add rule` para `main`.

Activar:
- Require a pull request before merging.
- Require approvals: mínimo 1 (ideal 2).
- Dismiss stale pull request approvals when new commits are pushed.
- Require review from Code Owners.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Include administrators.
- Restrict who can push to matching branches (nadie directo a `main`).

Checks obligatorios sugeridos:
- `App Lint + Build`
- `Repo Policy Checks`

## 2) Checks automáticos mínimos
Ya definidos en:
- `.github/workflows/pr-quality.yml`

Cobertura:
- `npm run lint` y `npm run build` en `kittypau_app`.
- Bloqueo de archivos `.env` trackeados.
- Validación básica de SQL (cambios permitidos solo en `supabase/migrations` o `Docs`).

## 3) Política de migraciones DB
- Solo migraciones versionadas en `supabase/migrations/`.
- Prohibido SQL manual en producción sin migración en repo.
- Validar post-migración:
  - `Docs/TEST_DB_API.ps1`
  - `Docs/TEST_ONBOARDING_BACKEND.ps1`

## 4) Política de secretos
- Prohibido commitear `.env`, tokens o passwords.
- Entrega de secretos solo por canal seguro.
- Rotación inicial y periódica.
- Si hay sospecha de fuga: rotar de inmediato.

## 5) Convención de ramas
- Rama común de integración: `main`.
- Ramas personales:
  - `feat/mauro-curcuma`
  - `feat/javo-mauro`
- Flujo: branch personal -> PR -> `main`.

## 6) Ownership por área
Implementado en:
- `.github/CODEOWNERS`

Mapa:
- `kittypau_app/**`: Mauro
- `bridge/**`: Javo + Mauro
- `iot_firmware/**`: Javo + Mauro
- `supabase/migrations/**`: Mauro + Javo
- `Docs/**`: Mauro + Javo

## 7) Criterio de merge (obligatorio)
Usar plantilla:
- `.github/pull_request_template.md`

No mergear sin:
- checklist completo,
- pruebas mínimas,
- docs actualizadas,
- rollback definido.

## 8) Plan de rollback
Si una fusión rompe entorno:
1. Revertir PR (GitHub o `git revert`).
2. Push del revert.
3. Redeploy en Vercel (`preview`/`prod` según impacto).
4. Validar endpoints críticos:
   - `/api/mqtt/webhook`
   - `/api/bridge/heartbeat`
5. Registrar incidente y acción en bitácoras.

## 9) Registro operativo único
Obligatorio actualizar tras cada `push`:
- `Docs/AVANCE_PUSHES_GITHUB.md` (consolidado)
- `Docs/GITHUB_MAURO.md` o `Docs/GITHUB_JAVO.md` (detalle personal)

## 10) Revisión mensual formal
Automatizada por:
- `.github/workflows/monthly-fusion-review.yml`

Acción:
- Crea issue mensual para revisar fusión de ramas personales a `main`.

## 11) Estado de implementación
- [x] PR template
- [x] CODEOWNERS
- [x] CI mínimo en PR
- [x] Revisión mensual automatizada (issue)
- [x] Documentación de flujo y bitácoras
- [ ] Configurar branch protection en GitHub UI (manual, una vez)


