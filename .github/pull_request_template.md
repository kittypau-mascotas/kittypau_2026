## Summary
- What changed:
- Why:
- Scope:

## Checklist (Required)
- [ ] Branch is not `main`.
- [ ] Changes are focused and limited to this objective.
- [ ] No secrets/tokens/passwords committed.
- [ ] Docs updated if contracts or behavior changed.
- [ ] Rollback approach is defined.
- [ ] Monthly merge review considered (`feat/mauro-curcuma`, `feat/javo-mauro` vs `main`).

## Validation (Required)
- [ ] `kittypau_app`: `npm run lint`
- [ ] `kittypau_app`: `npm run build`
- [ ] Relevant runtime checks completed (app/bridge/firmware)
- [ ] DB changes (if any) are only via `supabase/migrations`
- [ ] `Docs/AVANCE_PUSHES_GITHUB.md` updated after push
- [ ] Personal log updated (`Docs/GITHUB_MAURO.md` or `Docs/GITHUB_JAVO.md`)

## Area Owners Review
- [ ] IoT/Firmware owner reviewed
- [ ] Bridge owner reviewed
- [ ] App/API owner reviewed
- [ ] DB/Docs owner reviewed

## Mauro/Javo Cross-Review (Required for shared work)
- [ ] Mauro reviewed this PR
- [ ] Javo reviewed this PR
- [ ] Personal logs updated (`Docs/GITHUB_MAURO.md`, `Docs/GITHUB_JAVO.md`)

## Files Touched
- Key files:

## Risk and Rollback
- Risk level: `low` / `medium` / `high`
- Rollback steps:
  1. Revert PR commit(s)
  2. Redeploy in Vercel (`preview`/`prod` as needed)
  3. Validate critical endpoints (`/api/mqtt/webhook`, `/api/bridge/heartbeat`)

## References
- Related issue(s):
- Related docs:
  - `Docs/GITHUB_FLUJO_OFICIAL.md`
  - `Docs/PLAYBOOK_INGRESO_IOT_FIRMWARE.md`
  - `Docs/ONBOARDING_JAVIER.md`
