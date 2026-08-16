# Data Model: Registro unificado

Todas las entidades ya existen (`public.profiles`, `public.pets`,
`supabase/migrations/20260208134653_apply_schema_update.sql`). Este documento solo cubre lo que
cambia: columnas nuevas (aditivas, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, nunca se elimina
ni renombra una columna existente) y las reglas de negocio que las gobiernan.

## `public.profiles` — sin cambios de schema

El paso 1 fusionado deja de **enviar** `country`, `notification_channel`, `is_owner`,
`owner_name`, `phone_number` desde el formulario (FR-011) — pero esas columnas **no se
eliminan** de la tabla: perfiles ya existentes que las tengan cargadas las conservan intactas
(Principio "nunca truncar/sobreescribir sin motivo" aplicado por analogía al Principio IV). Si
en el futuro se decide eliminarlas de la base, es una decisión aparte, fuera de este spec.

## `public.pets` — columnas nuevas (aditivas)

| Columna | Tipo | Nullable | Notas |
|---|---|---|---|
| `sex` | `text` | sí | `'macho' \| 'hembra' \| 'no_estoy_seguro'` — validado en la API, sin `CHECK` constraint en DB (mismo patrón que `origin`, que hoy es `text` libre sin `CHECK`). |
| `microchip_number` | `text` | sí | Opcional incluso si `has_microchip = true` (FR-018) — nunca `NOT NULL`. |
| `birth_date` | `date` | sí | Se usa cuando `origin` indica que la fecha de nacimiento se conoce (comprado, nació en casa — ver spec § Assumptions, lista de Origen). |
| `intake_date` | `date` | sí | Se usa cuando `origin` indica que la fecha de nacimiento exacta no se conoce (adoptado, rescatado, regalado, otro). Mutuamente excluyente con `birth_date` a nivel de UI (FR-019), no se fuerza con `CHECK` en DB — ambas quedan nullable por si en el futuro se quiere permitir ambas. |
| `health_profile` | `jsonb` | sí, default `'{}'::jsonb` | Ficha Detallada — Salud. Claves libres (ver "Forma de `health_profile`" abajo). |
| `feeding_profile` | `jsonb` | sí, default `'{}'::jsonb` | Ficha Detallada — Alimentación. Claves libres (ver "Forma de `feeding_profile`" abajo). |
| `health_profile_completed_at` | `timestamptz` | sí | `NULL` = sección Salud pendiente. Se setea al guardar explícitamente esa sección (research.md #3). |
| `feeding_profile_completed_at` | `timestamptz` | sí | `NULL` = sección Alimentación pendiente. Mismo mecanismo. |
| `origin_habitat_profile` | `jsonb` | sí, default `'{}'::jsonb` | **Nuevo 2026-08-17.** Ficha Detallada — Origen y Hábitat. Solo lo que no tiene columna propia (ver "Forma de `origin_habitat_profile`" abajo) — `origin` y `living_environment` (ambas ya existentes) se siguen escribiendo directo, no se duplican acá. |
| `origin_habitat_completed_at` | `timestamptz` | sí | `NULL` = sección Origen y Hábitat pendiente. Mismo mecanismo que Salud/Alimentación. |

**Regla derivada (no es columna, se calcula)**: `pet_detail_pending = health_profile_completed_at
IS NULL OR feeding_profile_completed_at IS NULL OR origin_habitat_completed_at IS NULL` — versión
extendida de FR-027 (círculo rojo si falta cualquiera de las 3 secciones).

**Origin (columna existente, sin cambio de tipo)**: sigue siendo `text` libre — la lista curada
de 6 valores (`comprado`, `adoptado_refugio`, `rescatado_calle`, `regalado`, `nacido_en_casa`,
`otro`) es una validación de aplicación (API + `<select>`), no un `CHECK` de DB, igual que hoy.
Investigado de nuevo 2026-08-17 a pedido del usuario buscando un origen faltante ("hijo/a de
otra mascota mía") — no hace falta un 7º valor: `nacido_en_casa` ya cubre ese caso (registro-
flow.tsx ya la etiqueta "camada propia"), solo se aclaró el label en la nueva sección de /pet.

**living_environment (columna existente, sin cambio de tipo)**: existía en el schema y en el
`allowedFields` de ambas rutas de `/api/pets` desde antes, pero **ningún formulario la
llenaba** (ni el register flow, ni "Editar perfil" en /pet) — quedaba siempre `null`. La
nueva sección Origen y Hábitat es el primer `<select>` real que la escribe (curado: `<select>`
de tipo de vivienda, no texto libre — ver Assumptions para las fuentes).

**photo_url (columna existente, sin cambio de tipo)**: mismo hueco que `living_environment`
— se pedía en el register flow (`registro-flow.tsx`, sube a Supabase Storage
`kittypau-photos/`) pero `/pet` no tenía forma de verla ni cambiarla después. 2026-08-17:
`pet/page.tsx` agrega avatar + "Cambiar foto" en "Mascota seleccionada", que sube al mismo
bucket/carpeta y guarda `photo_url` de inmediato. Ajustado para cumplir
`DOC_MAESTRO_DOMINIO.md` § 7 "Estrategia de fotos": límite de 5 MB validado antes de subir,
y path determinístico por `petId` (`pets/{petId}.{ext}`, no un nombre random) para que
`upsert:true` reemplace la foto anterior de verdad en vez de acumular archivos huérfanos
en el bucket — con cache-bust (`?v=timestamp`) para que el navegador no muestre la versión
vieja tras el reemplazo. **Gap pendiente, no implementado**: § 7 pide compresión del lado
del cliente antes de subir — esta versión sube el archivo tal cual (con el límite de 5 MB
como único control), sin el cropper que sí tiene el register flow.

### Forma de `health_profile` (claves esperadas, todas opcionales)

**Actualizado 2026-08-17**: `alergias`, `medicamentos`, `tratamientos`, `cirugias` y `vacunas`
pasaron de texto libre a **checklist de opciones investigadas contra fuentes veterinarias
reales de Chile** (cada una con un array de valores + un campo `*_otra` de texto libre para lo
que no está en la lista) — ver `Knowledge/29_Specs/002-registro-flow-unificado/spec.md` §
Assumptions para las fuentes citadas. `vacunas` depende de la especie: perro usa
`sextuple_octuple`/`tos_perreras`, gato usa `triple_felina`/`leucemia_felina` — ambos
comparten `antirrabica` (única vacuna obligatoria por ley en Chile).

**Actualizado 2026-08-17 (2)**: las 6 listas (`condiciones_diagnosticadas`, `alergias`,
`medicamentos`, `tratamientos`, `cirugias`, `vacunas`) suman `"ninguna"`/`"ninguno"` como
primera opción, excluyente con el resto (marcarla limpia las demás; marcar cualquier otra
la saca a ella) — lógica compartida en `toggleInList` (`pet/page.tsx`), no repetida por
categoría.

```json
{
  "peso_ideal_kg": 4.2,
  "condiciones_diagnosticadas": ["renal", "obesidad"],
  "condiciones_otra": "texto libre si eligió 'otra'",
  "alergias": ["ninguna"] | ["pulgas", "ambiental", "alimentaria", "contacto", "otra"],
  "alergias_otra": "texto libre si eligió 'otra'",
  "medicamentos": ["ninguno"] | ["antiparasitario", "antibiotico", "antiinflamatorio", "antialergico", "suplemento", "otro"],
  "medicamentos_otra": "texto libre si eligió 'otro'",
  "tratamientos": ["ninguno"] | ["dermatologico", "dental", "fisioterapia", "oncologico", "cronico", "otro"],
  "tratamientos_otra": "texto libre si eligió 'otro'",
  "cirugias": ["ninguna"] | ["esterilizacion", "dental", "cuerpo_extrano", "ortopedica", "otra"],
  "cirugias_otra": "texto libre si eligió 'otra'",
  "vacunas": ["ninguna"] | ["antirrabica", "sextuple_octuple", "tos_perreras"],
  "vacunas_otra": "texto libre si eligió 'otra'",
  "desparasitacion_ultima_fecha": "2026-06-01",
  "historial_veterinario": "texto libre",
  "ultimo_control_fecha": "2026-07-15"
}
```

### Forma de `feeding_profile` (claves esperadas, todas opcionales)

**Actualizado 2026-08-17**: `marca` pasa de texto libre a un `<select>` con las marcas
reales que se venden en Chile, agrupadas por segmento (económico / premium nacional /
premium-super premium / biológicamente apropiado) y **separadas por especie** (`marca`
guarda el nombre elegido tal cual, `marca_otra` el texto libre si eligió "otra") — ver
`spec.md` § Assumptions para las fuentes citadas. No es un catálogo oficial (el SAG no
mantiene una base de datos pública tipo AAFCO con fichas nutricionales por producto) — es
la lista de marcas/líneas reales confirmadas en tiendas chilenas.

**Actualizado 2026-08-17 (2)**: `formula` (texto libre) se reemplazó por `formula_etapa` +
`formula_necesidad`. No existe un catálogo público de nombres exactos de línea por marca
(mismo motivo que `marca` arriba), pero la investigación confirma que **todas** las marcas
revisadas (Royal Canin, Champion, Pro Plan, Hill's, Master Dog, Bravery, Acana, Orijen —
fuentes en `spec.md` § Assumptions) organizan sus líneas con las mismas 2 dimensiones:
etapa de vida (cachorro/adulto/senior/todas las etapas) y necesidad especial (control de
peso, digestión o piel sensible, urinario, + esterilizado/indoor específico de gato o
articular específico de perro). `formula_etapa` se precarga con el `age_range` ya declarado
de la mascota (Registro Básico) si coincide con una de las 3 etapas conocidas — evita
volver a preguntar un dato que Kittypau ya tiene (mismo principio que las cantidades/
horarios de alimentación, aunque acá sí se pregunta porque es un dato de la fórmula del
alimento, no algo que el dispositivo mida).

**Corregido 2026-08-17**: `cantidad_diaria_g`, `comidas_dia` y `horarios` se sacaron de este
objeto — no se le preguntan a la persona. Son exactamente lo que Kittypau mide con el
dispositivo real (comedero/bebedero + sensor de peso); pedirlas como dato autodeclarado
contradice el objetivo del producto. Ver `Knowledge/05_API/SPEC_HungerBar_Alimentacion.md`
para cómo ya se derivan de `readings` una vez vinculado el dispositivo.

```json
{
  "tipo_alimento": "seco | humedo | mixto",
  "marca": "Royal Canin | ... | otra",
  "marca_otra": "texto libre si eligió 'otra'",
  "formula_etapa": "cachorro | adulto | senior | todas_las_etapas",
  "formula_necesidad": "estandar | control_peso | digestion_piel_sensible | urinario | articular (perro) | esterilizado_indoor (gato)",
  "premios": { "aplica": true, "detalle": "texto libre" },
  "restricciones_alimentarias": "texto libre"
}
```

*(Estas formas son un contrato de aplicación, no un schema de DB — al ser `jsonb`, agregar una
clave nueva en el futuro no requiere migración, solo actualizar este documento y el código que
la lee/escribe.)*

### Forma de `origin_habitat_profile` (claves esperadas, todas opcionales) — nuevo 2026-08-17

Estado al llegar y Tipo de vivienda no tienen estándar oficial chileno (la Ley 21.020 "Ley
Cholito" regula tenencia responsable — microchip, registro, esterilización — pero no
categoriza vivienda ni condición de ingreso); son las categorías reales que sí aparecen
consistentemente en fichas de adopción/ingreso de refugios y clínicas — ver `spec.md` §
Assumptions para las fuentes citadas.

```json
{
  "origen_otro": "texto libre si origin='otro' (origin en sí vive en pets.origin, no acá)",
  "estado_al_llegar": "buen_estado | delgado_desnutrido | herido_lesionado | con_parasitos | enfermo | cria_muy_joven | otro",
  "estado_al_llegar_otro": "texto libre si eligió 'otro'",
  "vivienda_otro": "texto libre si living_environment='otro' (living_environment vive en pets.living_environment, no acá)",
  "convive_otras_mascotas": "true | false"
}
```

## Migración

Un solo archivo aditivo en `supabase/migrations/`, siguiendo la convención de nombre
`YYYYMMDDHHMMSS_descripcion.sql` ya usada en el repo:

```sql
alter table public.pets
  add column if not exists sex text,
  add column if not exists microchip_number text,
  add column if not exists birth_date date,
  add column if not exists intake_date date,
  add column if not exists health_profile jsonb not null default '{}'::jsonb,
  add column if not exists feeding_profile jsonb not null default '{}'::jsonb,
  add column if not exists health_profile_completed_at timestamptz,
  add column if not exists feeding_profile_completed_at timestamptz;
```

**Requiere confirmación explícita de Mauro antes de aplicarse en producción** (Principio III) —
se ejecuta como tarea de implementación aparte, no automáticamente al escribir este plan.

**Nuevo 2026-08-17** — segundo archivo aditivo, mismo patrón, para Origen y Hábitat
(`supabase/migrations/20260816140000_origen_habitat_pet_detail.sql`):

```sql
alter table public.pets
  add column if not exists origin_habitat_profile jsonb not null default '{}'::jsonb,
  add column if not exists origin_habitat_completed_at timestamptz;
```

**Escrito pero NO aplicado a producción todavía — requiere confirmación explícita de Mauro**
(Principio III), igual que la migración anterior. El código de `/pet` y las rutas de la API ya
están listos para estas 2 columnas; hasta que se aplique la migración, guardar la sección
"Origen y Hábitat" falla con un error de Supabase (columna inexistente).

## Tipos TypeScript afectados (duplicados localmente, patrón ya existente en el repo)

El tipo `Pet` está declarado localmente en varios archivos (`registro-flow.tsx`,
`pet/page.tsx`, `dispositivos/nuevo/page.tsx`, `bowl/page.tsx`, `today/page.tsx`,
`story/page.tsx`) — no hay un tipo compartido único hoy, así que este plan sigue el mismo
patrón (agregar los campos nuevos donde cada archivo los necesite) en vez de introducir una
unificación no pedida (fuera de alcance de este spec, violaría el Principio I si se hace de
paso). Los archivos que necesitan los campos nuevos para este feature: `registro-flow.tsx`
(escribir), `pet/page.tsx` (leer y escribir Ficha Detallada), `app-nav.tsx` (leer
`*_completed_at` para el círculo rojo — hoy `app-nav.tsx` no tiene tipo `Pet` propio, consume
`devices`/`petName` de `useAppData`; se necesita exponer ahí los 2 timestamps o un booleano
derivado, ver `contracts/pets-api.md`).
