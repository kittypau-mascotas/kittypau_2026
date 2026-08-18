# Research: Solo Placeholder, Nunca Autocompletar en Login/Registro

## Contexto de código real (grep en el archivo real antes de este research)

- `kittypau_app/src/app/(public)/login/page.tsx`, campos relevantes:
  líneas 1684 (email login), 1720 (password login), 1835 (email reset),
  2054 (email registro paso 1), 2078 (password registro paso 1).
- `kittypau_app/src/lib/utils/known-emails.ts` — módulo de spec 004,
  `<datalist>` propio en el email de login (línea ~1684-1690 aprox).

## Por qué `autoComplete="off"`/`"new-password"` no alcanzan (confirmado, no supuesto)

- Decision: no confiar solo en el atributo `autoComplete` — usar además el
  patrón "readonly hasta el foco".
- Rationale: en esta misma sesión se confirmó en la práctica que Chrome
  rellenó el email de registro (`autoComplete="email"`, sin protección) Y
  la contraseña de registro (`autoComplete="new-password"`, la protección
  más fuerte que existe vía atributo) con datos de un intento de prueba
  anterior. Los navegadores modernos priorizan su gestor de contraseñas
  sobre las señales de `autocomplete` de la página para campos que
  reconocen como credenciales — es un comportamiento documentado y
  ampliamente reportado, no específico de este código.
- Alternatives considered: quedarse solo con mejores valores de
  `autoComplete` (ya se descartó, insuficiente en la práctica); nombres de
  campo aleatorios por render (`name="email_x7f2a"`) — rechazado, es un
  hack fragile que además puede confundir a lectores de pantalla y gestores
  de contraseñas legítimos que sí quiere usar la persona en otros contextos.

## Técnica elegida: `readOnly` hasta el primer foco

- Decision: cada campo de email/contraseña de los 3 formularios nace con
  `readOnly` (y sin `autoComplete` favorable, dejando `autoComplete="off"`
  como refuerzo) — al primer `onFocus` (o `onMouseDown`, para cubrir el
  caso de un click que ya cuenta como intención de escribir), un `useState`
  local pasa `readOnly` a `false` y el campo queda editable con normalidad
  para el resto de la sesión de esa página.
- Rationale: es una técnica nativa de HTML (sin librería nueva, ladder
  Ponytail paso 4 — feature de la plataforma), y los navegadores no ofrecen
  autocompletar ni pre-llenar un campo marcado `readOnly` en el momento en
  que la página carga — al quitarse el `readOnly` recién cuando la persona
  ya interactuó (foco/click), el navegador ya no tiene la oportunidad de
  "adelantarse" con una sugerencia o un valor pre-cargado antes de esa
  interacción. El tipeo normal, pegar texto, y el submit del formulario no
  se ven afectados una vez que el campo pasa a editable.
- Alternatives considered: inputs ocultos "señuelo" antes del campo real
  (otro truco citado para absorber el autocompletado del navegador) —
  rechazado, más frágil y menos legible que alternar un solo atributo
  ya nativo del campo real; requiere manejar accesibilidad del campo oculto
  con cuidado extra que no aporta nada acá.
- Riesgo conocido y aceptado (ver spec Assumptions): ningún navegador
  garantiza al 100% que un gestor de contraseñas muy agresivo no intente
  ofrecer algo de todos modos (ej. un ícono de llave dentro del campo que
  la persona podría clickear voluntariamente) — este pedido reduce el
  pre-llenado automático al mínimo posible con HTML estándar, no promete
  bloquear cada mecanismo de cada navegador para siempre.

## Qué pasa con el `<datalist>` propio de spec 004 (email de login)

- Decision: se elimina el `list="login-known-emails"` del input de email de
  login y el `<datalist>` asociado — spec 006 pide "jamás se rellenen ni
  sugieran", más estricto que el alcance de spec 004. El módulo
  `known-emails.ts` (guardar/leer emails usados en este dispositivo) puede
  eliminarse también si no queda ningún consumidor, o dejarse sin uso si
  se prevé reutilizarlo — se elimina el archivo y su test, ya que dejar
  código sin llamar es código muerto que generan los propios cambios de
  esta tarea (Ponytail: "borrar el código muerto que los propios cambios
  generaron").
- Rationale: cumple FR-001/FR-003 (ninguna sugerencia, ni siquiera propia) y
  evita mantener un módulo que ya no se usa en ningún lado tras este cambio.

## Testing

- Decision: sin test unitario nuevo — el cambio es comportamiento de
  atributos HTML + un `useState` booleano por campo dentro de un componente
  de más de 2000 líneas sin infraestructura de testing de componentes React
  (mismo hallazgo que specs 003/004/005). Verificación vía `tsc`/`eslint` +
  validación manual documentada en `quickstart.md` (probar con credenciales
  reales ya guardadas en el navegador, que es justamente el escenario que
  hay que confirmar que ya no se dispara).
- Rationale: coherente con el nivel de testing ya establecido para cambios
  de UI en este archivo en esta misma sesión.
