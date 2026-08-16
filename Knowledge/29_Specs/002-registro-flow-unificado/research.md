# Phase 0 Research: Registro unificado

Todas las decisiones de esta fase resuelven marcadores dejados abiertos explícitamente en
`spec.md` § Assumptions ("se resuelve en `/speckit-plan`") — ninguna reabre una decisión de
producto ya confirmada por Mauro (esas están en el spec y no se tocan acá).

## 1. Relación entre los 3 pasos de UI y los enums `user_onboarding_step` / `pet_onboarding_step`

**Decision**: No se crean enums nuevos. El paso 1 "Usuario" fusionado (cuenta + perfil) se
considera completo cuando `user_onboarding_step` pasa de `not_started`/`user_profile` a
`pet_profile` (mismo valor que hoy marca el fin del perfil de usuario). El paso 2 "Mascota" usa
`pet_onboarding_step = pet_profile` para el Registro Básico completo — el mismo valor que ya
usa `savePet()` hoy (`registro-flow.tsx:714`). El paso 3 "Kittypau" (dispositivo) sigue
derivándose de `!status.hasDevice` exactamente como hoy (`currentStep` en
`registro-flow.tsx:320-331`). Es decir: **la máquina de estados existente no cambia** — la
única diferencia real es que la UI dejó de mostrar "Cuenta" como paso propio, así que el
`stepMeta` (3 entradas) y el cálculo de `modalStep`/`realRegistroStep` en `page.tsx` se ajustan
para no contar el sub-paso de creación de cuenta como un paso completo aparte.

**Rationale**: `user_onboarding_step` ya trata "user_profile" como una unidad (confirmado en
`ENUMS_OFICIALES.md`), consistente con la fusión pedida. Reusar los enums existentes es el
paso 2 del ladder Ponytail (ya existe en el codebase) — crear un enum de "pasos de UI" aparte
duplicaría una máquina de estados que ya funciona.

**Alternatives considered**: Agregar un valor `account_pending` al enum para distinguir
"cuenta creada, perfil no" — rechazado porque el spec (FR-012) exige que la cuenta no se cree
hasta tener Nombre + Nombre de Mascota, así que ese estado intermedio nunca existe en la
práctica; agregarlo sería complejidad sin caso de uso real.

## 2. Tamaño y posición del logo/marca Kittypau en el stepper (paso 3)

**Decision**: Reutilizar el patrón `brand-logo-badge` + `<Image src="/logo_carga.jpg">` ya
usado en `login/page.tsx:1297-1312` y `:1327-1342`, pero a un tamaño reducido acorde al resto
de los círculos del stepper (hoy los círculos numerados miden ~40-48px de diámetro en el CSS
existente de `stepperContent`) — el logo se recorta dentro de un círculo del mismo tamaño que
los otros 2 pasos, sin el wordmark completo "Kittypau" (no entra legible a ese tamaño); el
wordmark de texto queda como la "etiqueta" debajo del círculo, en el mismo lugar donde hoy dice
"DISPOSITIVO", reemplazado por "KITTYPAU".

**Rationale**: Mantiene la métrica visual del stepper (3 círculos del mismo tamaño) en vez de
romper el layout con un elemento más grande. Reutiliza el asset ya optimizado
(`/logo_carga.jpg`) sin generar una variante nueva.

**Alternatives considered**: Logo grande reemplazando todo el stepper del paso 3 — rechazado,
rompe la consistencia visual de "3 círculos iguales" que hoy comunica progreso claramente.

## 3. Semántica de "Ficha Detallada completa" (Salud / Alimentación) para el círculo rojo

**Decision**: "Completa" no significa que todos los campos individuales tengan un valor — casi
todos son legítimamente opcionales campo a campo (ej. "sin alergias conocidas" es una respuesta
válida, no un campo vacío). En cambio, cada sección (Salud, Alimentación) se marca completa
mediante una acción explícita de guardado de esa sección — al hacer clic en "Guardar sección de
Salud" (o "Alimentación"), se registra `health_profile_completed_at` /
`feeding_profile_completed_at` (timestamp, no boolean, para tener trazabilidad de cuándo se
completó). El círculo rojo se enciende si cualquiera de los 2 timestamps es `null` (FR-027).

**Rationale**: Evita el problema de "¿cuántos de los 10 campos de Salud hacen falta para
contar como completo?" — que no tiene una respuesta correcta sin inventar una regla arbitraria.
Delegar la decisión de "ya terminé esta sección" a la propia persona (con un botón de guardado
explícito por sección) es la interpretación más simple y honesta del requisito, consistente con
que la Ficha Detallada nunca bloquea nada (FR-016) — es información, no un formulario con
reglas de validación cruzada.

**Alternatives considered**: (a) Marcar completo cuando al menos 1 campo de la sección tiene
valor — rechazado, permitiría "completar" con un solo dato trivial, vaciando de sentido al
recordatorio. (b) Exigir todos los campos — rechazado, varios campos no aplican a todas las
mascotas (ej. cirugías, medicamentos) y forzarlos generaría datos falsos solo para apagar el
círculo rojo.

## 4. Envío del correo personalizado — orden de datos vs. `signUp`

**Decision**: No hace falta ningún mecanismo adicional (Auth Hooks, Edge Functions). El nombre
de usuario y el nombre de la mascota ya se capturan en el mismo formulario del paso 1, ANTES de
que se dispare `supabase.auth.signUp()` (FR-012 ya lo exige) — así que `options.data: {
user_name, pet_name }` en la misma llamada a `signUp` es suficiente; Supabase adjunta esos
valores a `auth.users.user_metadata` en el momento de la creación, que es exactamente cuando se
dispara el correo de confirmación.

**Rationale**: Confirmado contra la documentación oficial de Supabase Auth
(`supabase.com/docs/guides/auth/auth-email-templates`, ya citado en el spec) — `{{ .Data.campo
}}` lee `user_metadata` tal como queda al momento del signup, no requiere un paso posterior.

**Alternatives considered**: Guardar nombre/mascota primero en una tabla temporal y disparar el
correo por separado vía Edge Function — rechazado, agrega infraestructura nueva para resolver
algo que el mecanismo nativo ya cubre (viola el ladder Ponytail, paso "¿lo resuelve una
dependencia ya instalada?").

**Asunto y cuerpo exactos, listos para aplicar en el dashboard**: ver
`Knowledge/05_API/SPEC_Correos_Transaccionales.md` — catálogo permanente de correos
transaccionales del proyecto (no solo de este spec), con el asunto/HTML final ya adaptado a la
marca Kittypau.

## 5. Layout de columna única (US5) + ajuste a pantalla (US3)

**Decision**: El CSS existente de `.login-register-body-registro` (hoy `overflow-y: hidden`
fuera de `max-width:640px`) pasa a `overflow-y: auto` sin condición de ancho — igual que ya
está resuelto para mobile, se generaliza a todos los tamaños. Pasar los grids `sm:grid-cols-*`
a una sola columna (`grid-cols-1` o quitar el `grid` y usar `flex-col`/`space-y-3`) reduce el
ancho de contenido pero aumenta el alto — el mecanismo de scroll de respaldo ya cubre ese caso
(confirmado empíricamente en Phase 0 de la investigación del spec: scroll funcionando hoy sin
cortar contenido, incluso en 320px de ancho).

**Rationale**: Reutiliza el mecanismo de scroll que ya existe y ya se verificó funcionando
(evidencia en `spec.md` § User Story 3) en vez de diseñar un sistema de clamps/breakpoints
nuevo — el diff más corto que cumple ambos requisitos a la vez.

**Alternatives considered**: `clamp()` de padding/tamaños de fuente para "encoger" el contenido
en vez de dejar que scrollee — rechazado para el caso de columna única porque encoger texto por
debajo de 16px violaría directamente FR-023 (tamaño mínimo de fuente); scroll es la única
opción que no compite con el propio requisito de accesibilidad de la misma User Story 5.

## 6. Almacenamiento de la Ficha Detallada — columnas sueltas vs. `jsonb`

**Decision**: Dos columnas nuevas `jsonb` en `public.pets`: `health_profile` y
`feeding_profile`, cada una con una forma libre de claves (peso_ideal, condiciones,
alergias, medicamentos, tratamientos, cirugías, vacunas, desparasitación, historial_vet,
ultimo_control / tipo_alimento, marca, formula, cantidad_diaria_g, comidas_dia, horarios,
premios, restricciones) — ver `data-model.md`. Más 2 columnas `timestamptz` para el timestamp
de completitud por sección (decisión #3).

**Rationale**: ~18 campos opcionales que van a "crecer con más temas en iteraciones futuras"
(palabras de Mauro en el spec) son el caso de uso de manual del libro para `jsonb` en Postgres
— evita una migración nueva cada vez que se agregue un campo, y evita ~18 columnas sueltas casi
todas `null` en la mayoría de las filas. Postgres/Supabase soportan `jsonb` nativamente, sin
dependencia nueva.

**Alternatives considered**: Tabla `pet_health_profile` / `pet_feeding_profile` aparte (1:1 con
`pets`) — rechazado por ahora: son 2 objetos por mascota, no una colección con su propio ciclo
de vida (no hay "muchas fichas de salud" por mascota) — una tabla aparte sería la abstracción
no solicitada que el Principio I prohíbe. Si en el futuro se necesita versionar historial
(ej. "vacunas" como lista con fechas), ese campo específico puede migrar a su propia tabla en
ese momento — no antes.
