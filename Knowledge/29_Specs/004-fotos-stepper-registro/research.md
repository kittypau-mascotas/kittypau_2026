# Research: Fotos en el Stepper de Registro

## Contexto de código real (leído completo antes de este research)

- `kittypau_app/src/app/(public)/login/page.tsx` (2311 líneas) — declaraciones
  de estado (líneas 60-195), `stepMeta`/`stepperContent` (605-701), invocación
  de `<RegistroFlow>` con sus callbacks actuales (2086-2103).
- `kittypau_app/src/app/(public)/login/_components/registro-flow.tsx` — props
  (`RegistroFlowProps`, líneas 40-55), los 2 `useEffect` existentes que ya
  notifican hacia arriba (`onProgress`/`onDeviceTypeChange`, líneas 510-516),
  estado de foto de mascota (`petPhotoFile`/`petPhotoPreview`, spec 003).

## Cómo exponer la foto de mascota desde `RegistroFlow` hacia `page.tsx`

- Decision: nuevo prop opcional `onPetPhotoPreviewChange?: (url: string |
  null) => void` en `RegistroFlowProps`, notificado por un `useEffect` nuevo
  que observa `petPhotoPreview` — mismo patrón exacto que ya usan
  `onProgress`/`onDeviceTypeChange`:
  ```
  useEffect(() => {
    onProgress?.(currentStep);
  }, [currentStep, onProgress]);

  useEffect(() => {
    onDeviceTypeChange?.(deviceForm.device_type);
  }, [deviceForm.device_type, onDeviceTypeChange]);
  ```
  Se agrega un tercero con la misma forma para `petPhotoPreview`.
- Rationale: Ponytail — el patrón "estado interno de `RegistroFlow` + `useEffect`
  que lo empuja hacia un callback opcional del padre" ya existe 2 veces en el
  mismo archivo para el mismo propósito general (avisar al padre de un cambio
  de estado interno). Un tercer callback igual es el diff más chico posible;
  no hace falta Context, no hace falta levantar `petPhotoFile`/`petPhotoPreview`
  completos a `page.tsx` (solo el padre necesita la URL de preview para
  pintarla en un `<img>`, no el `File` en sí — eso se queda donde ya vive,
  se sigue subiendo desde dentro de `RegistroFlow` como hoy).
- Alternatives considered: mover todo el estado de foto de mascota a
  `page.tsx` (rechazado — es un cambio mucho más grande que lo pedido,
  `RegistroFlow` sigue siendo dueño de la lógica de selección/compresión/
  recorte, spec 003, no hay motivo para moverla); Context de React para
  compartir el valor (rechazado — un solo consumidor, un callback ya
  establecido en el codebase alcanza, Context sería la abstracción no
  solicitada que Ponytail pide evitar).

## Dónde vive el nuevo estado en `page.tsx`

- Decision: `const [registerPetPhotoPreview, setRegisterPetPhotoPreview] =
  useState<string | null>(null);` junto a los demás estados de
  `register*` (línea ~84, al lado de `registerPetName`) — se pasa a
  `<RegistroFlow onPetPhotoPreviewChange={setRegisterPetPhotoPreview} .../>`.
- Rationale: mismo lugar y mismo naming (`register` + campo) que
  `registerAvatar`/`registerUserName`/`registerPetName` ya establecen.

## Renderizado del círculo del stepper

- Decision: en el `span` `login-step2-dot` de `stepperContent`, extender la
  cadena de condiciones ya existente (`hasError` → marca/logo → `completedMap`
  → número) agregando, ANTES de caer al "✓" genérico, un caso por paso:
  - Paso 1, `completedMap[1]` true y `registerAvatar` con valor → `<img
    src={registerAvatar}>` en vez de "✓".
  - Paso 2, `completedMap[2]` true y `registerPetPhotoPreview` con valor →
    `<img src={registerPetPhotoPreview}>` en vez de "✓".
  - Cualquier otro caso (incluido paso 2 completado sin foto, FR-003) → cae
    al "✓" que ya existe, sin cambios.
- Rationale: el orden de prioridad ya existente en el código
  (error > marca/logo > completado > número) ya resuelve FR-004 (error tiene
  prioridad) y FR-005 (paso 3 sin cambios) gratis, sin tocar esa parte —
  la foto solo se inserta como un caso más específico dentro de la rama
  "completado", antes del fallback "✓".
- Alternatives considered: un componente `<StepDot>` separado — rechazado,
  el `span` ya es chico (ver líneas 668-685) y agregar 2 casos más a la misma
  cadena ternaria es un diff quirúrgico; extraerlo a un componente aparte
  sería una abstracción no pedida para 15 líneas de JSX.

## Fallback si la imagen no carga (FR-003 extendido a error de carga, Assumptions)

- Decision: `onError` en el `<img>` del círculo, que marca ese paso como
  "imagen falló" en un estado nuevo `Record<number, boolean>` (mismo shape
  que `completedMap`, ej. `photoLoadFailed`) — si está marcado, el círculo
  cae al "✓" en vez de reintentar mostrar la imagen rota.
- Rationale: mismo mecanismo que cualquier `<img onError>` de fallback ya
  usa el ecosistema React/HTML — no requiere librería. El estado se resetea
  solo (nunca se marca `true` de nuevo) porque la URL que falló no cambia
  sola; si el usuario elige una foto nueva, la URL cambia y el `<img>` vuelve
  a intentar cargar esa URL nueva (React re-renderiza con `src` distinto,
  no hace falta resetear el flag a mano).
- Alternatives considered: `next/image` con su manejo de error incorporado —
  rechazado, el círculo es un ícono de 32-40px con fotos que ya son blobs
  locales (`URL.createObjectURL`) o avatares estáticos del propio dominio;
  `next/image` no aporta nada acá (no hay optimización de red relevante para
  un blob local) y ya hay precedente de `<img>` plano en el mismo stepper
  (el logo de Kittypau usa `next/image`, pero los avatares del paso 1 ya usan
  `<img>` plano en `page.tsx:1904`).

## Testing

- Decision: sin test unitario nuevo dedicado — el cambio es JSX condicional
  dentro de un componente de 2311 líneas con mucho estado de UI interdependiente
  (temporizadores, animaciones, modales), sin infraestructura de testing de
  componentes React en el proyecto hoy (Vitest está configurado para lógica
  pura, no hay `@testing-library/react` instalado — ver spec 003 research.md,
  mismo hallazgo). Verificación vía `quickstart.md` (click-through manual) +
  `tsc --noEmit`/`eslint` para errores de tipo/lint, mismo nivel de
  verificación automatizable que ya se usó en spec 003 para los cambios de UI.
- Rationale: agregar `@testing-library/react` sería una dependencia nueva
  para un solo test de un cambio visual chico — desproporcionado (Ponytail).
