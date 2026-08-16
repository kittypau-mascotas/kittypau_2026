# Data Model: Extracción de "Tablas y Vistas" en /admin

No se crea ningún tipo de dato nuevo — este batch reutiliza el tipo ya existente en
`admin/page.tsx`. Se documenta acá solo como referencia del contrato de props del
componente nuevo (ver `contracts/tablas-vistas-card.md` para la firma completa).

## `DbObjectStat` (ya existente, `page.tsx:265-274`)

Representa una fila de estadísticas de un objeto de base de datos (tabla o vista) en
Supabase — nombre, tipo, tamaño y filas estimadas, última actualización.

| Campo | Tipo | Notas |
|---|---|---|
| `schema_name` | `string` | Ej. `public` |
| `object_name` | `string` | Nombre de la tabla/vista |
| `object_type` | `"table" \| "view"` | |
| `description` | `string \| null` | `"Sin descripción"` si es `null` en el render |
| `row_estimate` | `number \| null` | `"-"` si es `null` en el render |
| `size_bytes` | `number \| null` | No se renderiza directo (se usa `size_pretty`) |
| `size_pretty` | `string \| null` | Tamaño ya formateado (ej. `"128 kB"`); `"-"` si `null` |
| `last_updated_at` | `string \| null` (ISO) | Formateado con `toLocaleString("es-CL", ...)`; `"-"` si `null` |

**Relaciones**: ninguna — es un array plano, sin relación con otras entidades del feature.

**Reglas de validación**: ninguna nueva — los valores ya vienen validados/formados desde
`GET /api/admin/overview`, el componente solo los renderiza (mismo criterio que los otros
3 componentes ya extraídos, que tampoco validan sus props).

**Transiciones de estado**: N/A — es data de solo lectura para este componente.
