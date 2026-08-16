# Phase 0 Research: Extracción de "Tablas y Vistas" en /admin

## Gap resuelto: estructura real de la sección

**Decision**: la sección vive en `kittypau_app/src/app/(app)/admin/page.tsx:2858-2942`,
dentro de un ternario gateado por `infraExpanded` — cuando es `true` renderiza la tabla,
cuando es `false` renderiza un mensaje corto ("Infraestructura colapsada...").

**Rationale**: confirmado leyendo el código fuente real, no estaba documentado en
`Knowledge/29_Specs/SPEC_02_UIUX_Mejoras.md` (que decía explícitamente "no leída todavía en
detalle") — este es exactamente el tipo de gap que la spec dejó declarado para resolver acá,
no en el spec.

**Alternatives considered**: ninguna — es un hecho verificable del código, no una decisión
de diseño con alternativas.

## Fuente de datos: `dbObjectStats`

**Decision**: el componente nuevo recibe `dbObjectStats: DbObjectStat[]` como prop. El tipo
ya existe en `page.tsx:265-274`:

```ts
type DbObjectStat = {
  schema_name: string;
  object_name: string;
  object_type: "table" | "view";
  description: string | null;
  row_estimate: number | null;
  size_bytes: number | null;
  size_pretty: string | null;
  last_updated_at: string | null;
};
```

Poblado hoy vía `setDbObjectStats((payload.db_object_stats ?? []) as DbObjectStat[])`
(línea 659), parte del fetch compartido `GET /api/admin/overview` — mismo mecanismo que
alimenta a los otros 3 componentes ya extraídos (`auditSectionStatus`, `infraSectionStatus`,
`bridges`, `kpclDevices`, etc.).

**Rationale**: mismo patrón arquitectónico ya establecido y documentado en Knowledge — "un
solo fetch grande que llena ~24 slices de estado". No hay motivo para desviarse.

**Alternatives considered**: fetch propio dentro del componente nuevo — descartado
explícitamente, es justo el patrón que el batch NO debe usar (ver FR-003 del spec y el
comentario-mapa de `page.tsx`).

## Gate `infraExpanded`

**Decision**: hoy es `const infraExpanded = true;` (línea 475) — una constante, no estado
real ni un toggle de UI conectado a nada. Ya lo señala un comentario existente dentro de
`infraestructura-card.tsx` ("infraExpanded sigue viniendo del page.tsx... hoy una const
`true`").

**Rationale**: este batch preserva el comportamiento tal cual — pasar `infraExpanded` como
prop igual que ya hace `infraestructura-card.tsx`, sin intentar convertirlo en un toggle
real (eso sería una feature nueva y distinta, fuera del alcance de "mover JSX").

**Alternatives considered**: convertir `infraExpanded` en estado real con un botón — fuera
de alcance de este spec (que es específicamente sobre extracción, no sobre agregar
funcionalidad nueva); anotado como posible mejora futura, no se ejecuta acá.

## Verificación

**Decision**: mismo estándar que los 3 batches anteriores — `tsc --noEmit`, `eslint`,
`next build`, los 3 sin errores nuevos. Verificación visual en `/admin` real si el acceso lo
permite (con el bug E2 de SPEC_01 ya resuelto, a diferencia de los 3 batches anteriores que
no pudieron verificarse visualmente).

**Rationale**: mismo criterio de "Done" ya usado y documentado en
`Knowledge/29_Specs/SPEC_02_UIUX_Mejoras.md` para los 3 batches previos.

**Alternatives considered**: agregar un test unitario nuevo para este componente —
descartado por Ponytail (Principio I): no hay tests unitarios para los 3 componentes
hermanos ya extraídos, agregar uno acá sería inconsistente y no lo pidió nadie.

---

**Todos los `NEEDS CLARIFICATION` del Technical Context quedan resueltos** — no quedan
pendientes para Phase 1.
