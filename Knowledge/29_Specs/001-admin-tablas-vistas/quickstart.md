# Quickstart: validar la extracción de "Tablas y Vistas"

## Prerrequisitos

- Repo en el estado post-implementación (componente extraído, `page.tsx` actualizado).
- Node/npm ya instalados (proyecto existente, sin dependencias nuevas).

## Validación automática (obligatoria, mismo estándar que los 3 batches anteriores)

```powershell
cd kittypau_app
npx tsc --noEmit
npx eslint "src/app/(app)/admin/page.tsx" "src/app/(app)/admin/_components/tablas-vistas-card.tsx"
npx next build
```

**Resultado esperado**: los 3 comandos terminan sin errores nuevos (warnings preexistentes
no relacionados a este cambio son aceptables, mismo criterio que batches previos).

## Validación visual (recomendada — ver Assumptions del spec)

Con `javomauro.contacto@gmail.com` (cuenta admin activa, ver
`Knowledge/29_Specs/SPEC_01_Errores_Prioritarios.md` E2, resuelto 2026-08-15):

1. Levantar el dev server (`npm run dev`), loguearse con esa cuenta.
2. Ir a `/admin`.
3. Confirmar que la sección "Tablas y Vistas (Uso Aproximado)" se ve igual que antes del
   cambio — mismas 6 columnas, mismos datos, mismo mensaje si `dbObjectStats` viene vacío.
4. Confirmar contra `data model.md`/`contracts/tablas-vistas-card.md` que no cambió el
   comportamiento del gate `infraExpanded` (hoy siempre `true`, ver `research.md`).

## Referencias

- Contrato completo de props: [contracts/tablas-vistas-card.md](./contracts/tablas-vistas-card.md)
- Estructura de datos: [data-model.md](./data-model.md)
- Decisiones técnicas y hallazgos: [research.md](./research.md)
