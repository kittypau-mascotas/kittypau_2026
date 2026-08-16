# Contrato: API de mascotas (extensión, no ruta nueva)

Las 3 rutas ya existen (`kittypau_app/src/app/api/pets/route.ts`,
`kittypau_app/src/app/api/pets/[id]/route.ts`). Este documento cubre solo lo que cambia.

## `GET /api/pets` — sin cambio de código

`select("*")` (línea 54 de `route.ts`) ya trae cualquier columna nueva de la tabla
automáticamente en cuanto la migración se aplica — no requiere tocar el handler. La respuesta
para cada mascota pasa a incluir `sex`, `microchip_number`, `birth_date`, `intake_date`,
`health_profile`, `feeding_profile`, `health_profile_completed_at`,
`feeding_profile_completed_at`.

## `POST /api/pets` — payload extendido (Registro Básico, paso Mascota)

Se agregan al objeto `payload` (línea 117 de `route.ts`), mismo patrón que los campos ya
existentes (`?? null` + `normalizeString` donde aplica):

| Campo | Tipo | Validación nueva |
|---|---|---|
| `sex` | `"macho" \| "hembra" \| "no_estoy_seguro" \| null` | Enum de aplicación — `ALLOWED_SEX` set, mismo patrón que `ALLOWED_TYPE`. |
| `origin` | `string \| null` (ya existe) | Enum de aplicación ampliado a 6 valores (`ALLOWED_ORIGIN` set nuevo) — antes sin validación server-side, se agrega. |
| `microchip_number` | `string \| null` | Solo `normalizeString`, nunca requerido aunque `has_microchip = true` (FR-018). |
| `birth_date` / `intake_date` | `string (ISO date) \| null` | Validar formato de fecha si viene; no forzar mutua exclusión en el server (la UI ya solo muestra un campo a la vez según Origen). |

`pet_state` default ya es `"device_pending"` — sin cambio.

## `PATCH /api/pets/[id]` — 2 usos nuevos, mismo endpoint

**Uso 1 — completar Registro Básico o editar campos existentes**: sin cambio de mecánica,
solo se agregan `sex`, `microchip_number`, `birth_date`, `intake_date` a `allowedFields`
(línea 132 de `[id]/route.ts`), con la misma validación de enum/fecha que en `POST`.

**Uso 2 — guardar una sección de la Ficha Detallada** (nuevo, desde `/pet`, User Story 6):

- Guardar Salud: `PATCH { health_profile: {...}, health_profile_completed_at: "<ISO now>" }`
- Guardar Alimentación: `PATCH { feeding_profile: {...}, feeding_profile_completed_at: "<ISO now>" }`

El timestamp lo genera el **cliente** en el momento del clic en "Guardar sección de Salud" /
"Guardar sección de Alimentación" (no un trigger de DB) — así, si la persona vuelve a guardar
la misma sección más tarde con cambios, el timestamp se actualiza y sigue siendo "completa"
(nunca vuelve a `null` salvo que se borre explícitamente, lo cual no está en alcance de este
spec). `health_profile`/`feeding_profile` se agregan a `allowedFields`; los 2 `_completed_at`
también, validando que sean fecha ISO válida si vienen.

**No se valida el contenido interno de `health_profile`/`feeding_profile` campo por campo en el
servidor** — es `jsonb` de forma libre (ver `data-model.md`); la validación de tipos vive en el
formulario del cliente, consistente con que ningún campo de la Ficha Detallada bloquea nada
(FR-016).

## Contexto de la app (`app-context.tsx`) — expone el dato para el círculo rojo

`AppDataProvider` ya hace `fetch("/api/pets?limit=20")` (línea 73) y guarda `pets` en una
variable local que hoy solo se usa para `petName` (línea 141). Se agrega al tipo `AppData`
(línea 31-38) un campo derivado:

```ts
petDetailPending: boolean; // true si pets[0]?.health_profile_completed_at o
                            // feeding_profile_completed_at es null/ausente (FR-027).
                            // Multi-mascota fuera de alcance (spec § Edge Cases) — se usa
                            // siempre pets[0], igual que ya hace petName hoy.
```

Calculado en el mismo `.then()` donde ya se arma `pets` (línea 117-121), sin fetch adicional.

`app-nav.tsx` lee `useAppData().petDetailPending` y, si es `true`, renderiza el círculo rojo
sobre el ítem `{ href: "/pet", label: "Mascota" }` de `navItems` (línea 22 y 29 de
`app-nav.tsx`) — un `<span>` absoluto con `bg-rose-500 rounded-full`, mismo patrón visual que ya
usa el indicador verde/gris de "dispositivo en línea" (`app-nav.tsx:271-293`, reutilizable como
referencia de estilo).
