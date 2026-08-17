# Research: Compresión Automática de Foto de Mascota

## Contexto de código real (leído completo antes de este research)

- `kittypau_app/src/app/(app)/pet/page.tsx` — bloque "Cambiar foto" completo
  (declaración de estado, `uploadPetPhoto`, handler del `<input type="file">`).
- `kittypau_app/src/app/(public)/login/_components/registro-flow.tsx` — bloque
  completo de foto de mascota (estado, `preparePhoto`, `uploadPhoto`,
  `openCropper`/`applyCrop`, los 2 `<input type="file">` de "Subir archivo" /
  "Tomar foto", el punto de guardado que llama `uploadPhoto`).

## Hallazgo que cambia el enfoque: el crop/compress existente es OPCIONAL, no automático

Asunción inicial (del spec, basada en una lectura parcial): "ya existe un paso
de recorte/compresión en el flujo de registro, solo corre después del gate de
5MB". Verificado con la lectura completa que **no es así**:

- `preparePhoto()` (registro-flow.tsx:518-535), llamada directo desde el
  `onChange` de los 2 `<input type="file">` (líneas 1387-1393 y 1403-1409),
  solo valida tamaño y hace `setPetPhotoFile(file)` +
  `setPetPhotoPreview(URL.createObjectURL(file))` — el archivo CRUDO queda
  guardado en estado tal cual se seleccionó.
- `applyCrop()` (líneas 577-619, el canvas 512×512 + `toBlob(...,
  "image/jpeg", 0.92)` que sí comprime) **solo se ejecuta si el usuario hace
  clic manualmente** en la miniatura de preview o en el botón "Editar foto"
  (`onClick={() => openCropper(petPhotoPreview)}`, líneas 1365 y 1427).
- Al guardar (línea 846-848): `petPhotoFile ? await uploadPhoto(petPhotoFile,
  "pets") : undefined` — sube lo que haya en `petPhotoFile` en ese momento:
  el archivo crudo si el usuario nunca abrió el editor de recorte, o el
  resultado comprimido si sí lo hizo.

**Implicación para el diseño**: no alcanza con "mover el compress antes del
gate de tamaño" — el compress hoy es un paso manual y opcional. La foto de
más de 5MB nunca llega ni siquiera a la miniatura de preview, porque
`preparePhoto()` corta con `setPhotoError(...)` y `return` antes de eso. El
fix real es que la reducción de tamaño pase a ser **automática al
seleccionar el archivo**, sin depender de que el usuario abra el editor de
recorte manual (que puede seguir existiendo como mejora opcional de encuadre,
pero no como el único camino hacia un archivo subible).

- Decision: la función de compresión nueva se ejecuta en el momento de la
  selección del archivo (dentro de/junto a `preparePhoto` en registro, y
  reemplazando el reject directo en `uploadPetPhoto` en `/pet`), no como
  reemplazo del editor de recorte manual existente (que se mantiene intacto
  para quien quiera reencuadrar la miniatura ya comprimida).
- Rationale: cumple FR-004 (reducir antes de subir) y FR-006 (sin pasos
  manuales obligatorios) sin quitarle al usuario la opción de recorte fino
  que ya tiene en registro.
- Alternatives considered: exigir que el usuario abra el editor de recorte
  para toda foto grande — rechazado, contradice FR-006 (el spec pide que
  "funcione", no que agregue un paso obligatorio nuevo).

## Dónde vive la función de compresión compartida

- Decision: nuevo módulo `kittypau_app/src/lib/utils/photo-compress.ts`
  (+ `photo-compress.test.ts` al lado), mismo patrón ya usado en
  `src/lib/utils/api.ts`/`api.test.ts` y `src/lib/hunger-bar.ts`/
  `hunger-bar.test.ts` — módulo chico, autocontenido, con su test unitario
  co-ubicado. `src/lib/utils/` ya es el lugar establecido para helpers
  transversales sin estado de React.
- Rationale: Ponytail — ya existe el patrón de carpeta en el codebase,
  reutilizarlo en vez de crear una convención nueva (`src/lib/image/`,
  `src/lib/photos/`, etc.). La función no depende de React ni de Next.js
  (solo `HTMLCanvasElement`/`Image`/`Blob`, todo Web API estándar), así que
  no necesita vivir junto a un componente.
- Alternatives considered: duplicar la lógica en cada archivo (rechazado,
  es exactamente el problema que ya existe hoy — la compresión de
  registro-flow.tsx no se reutiliza en pet/page.tsx); un hook de React
  (`usePhotoCompress`) — rechazado, no hay estado de componente involucrado,
  una función async pura alcanza (regla Ponytail: sin abstracción no
  solicitada).

## Forma de la función: downscale proporcional vs. crop cuadrado

- Decision: la función nueva hace **downscale proporcional + reencode JPEG**
  (mantiene el aspect ratio original, reduce el lado más largo a un máximo
  configurable, ej. 1024px, y baja la calidad JPEG hasta entrar bajo el
  límite de tamaño) — **sin recorte a cuadrado**. El recorte a cuadrado
  cuadrado 512×512 de `applyCrop()` en registro-flow.tsx se mantiene como
  paso manual y opcional, separado, para quien quiera reencuadrar.
- Rationale: en `/pet/page.tsx` la foto se muestra en un círculo vía CSS
  (`rounded-full object-cover`, línea 762) — no necesita que el archivo
  fuente ya sea cuadrado, el navegador la recorta visualmente igual.
  Agregar un editor de recorte interactivo a `/pet` es una mejora de UX
  aparte, fuera del pedido explícito ("que funcione" / "bajarle la
  calidad"), ya declarado como Assumption en el spec. En registro-flow.tsx
  el editor de recorte manual sigue disponible sin cambios — ahora parte de
  una imagen ya liviana en vez de una potencialmente pesada.
- Alternatives considered: forzar crop cuadrado también en `/pet` —
  rechazado, agrega una interacción modal nueva no pedida (viola Ponytail
  "sin abstracción no solicitada" y el Assumption ya validado en el spec).

## Estrategia de reducción de tamaño (cómo bajar de 5MB de forma confiable)

- Decision: downscale + reencode iterativo simple —
  1. Decodificar el archivo en un `<canvas>` (via `createImageBitmap` o
     `Image` + `drawImage`, igual que `applyCrop()` ya hace).
  2. Si el lado más largo supera un máximo (ej. 1600px), escalar
     proporcionalmente a ese máximo antes de la primera pasada — el 90%+ de
     la reducción de tamaño en fotos de celular viene de bajar resolución,
     no de bajar calidad JPEG.
  3. Exportar con `canvas.toBlob(..., "image/jpeg", quality)` empezando en
     calidad alta (0.92, igual que `applyCrop`); si el blob resultante sigue
     sobre el límite, repetir con calidad más baja en pasos (ej. 0.8, 0.6,
     0.5) hasta entrar bajo el límite o llegar a un piso de calidad
     razonable.
  4. Si tras el piso de calidad el archivo sigue sobre el límite (imagen de
     detalle extremo, caso borde del spec), devolver un error explícito en
     vez de subir un archivo inservible — cumple FR-005.
- Rationale: mismo patrón que `applyCrop()` ya usa (`canvas.toBlob` con
  `image/jpeg` y quality numérico) — Canvas API nativa del navegador, cero
  dependencias nuevas, consistente con la restricción ya dada en el input
  del plan ("sin agregar ninguna librería nueva de compresión").
- Alternatives considered: librería de compresión de imágenes de terceros
  (`browser-image-compression`, etc.) — rechazada explícitamente por el
  usuario en el input del plan; la Canvas API nativa ya resuelve el
  problema sin dependencia nueva.

## Formatos no soportados (HEIC, etc.)

- Decision: si `createImageBitmap`/`Image.decode()` falla al intentar
  decodificar el archivo, mostrar el mensaje de FR-005 ("no se pudo procesar
  esta foto, prueba con otro archivo") en vez de un error técnico crudo. No
  se agrega decodificación de formatos no soportados nativamente por el
  navegador (ej. HEIC en navegadores sin soporte) — está fuera de alcance,
  documentado como Assumption en el spec.
- Rationale: los navegadores modernos en iOS ya convierten HEIC a JPEG al
  seleccionar desde el picker de archivos web en la mayoría de los casos;
  cubrir el resto agregaría una librería de decodificación nueva, que el
  usuario ya descartó para este pedido.

## Testing

- Decision: test unitario de la función de compresión con Vitest (ya es el
  runner del proyecto — `npm run test` → `vitest run`), verificando: (a) un
  archivo ya bajo el límite pasa sin cambios evitables de calidad
  perceptible; (b) un archivo por sobre el límite termina bajo el límite
  tras la función; (c) el caso borde de "no se puede reducir más" devuelve
  el error esperado en vez de colgarse. Verificación manual end-to-end
  (subir una foto real de celular en ambos flujos) documentada en
  `quickstart.md` — un test de Canvas/Blob en jsdom no reemplaza probar la
  subida real a Supabase Storage.
- Rationale: Vitest ya corre en Node/jsdom; `HTMLCanvasElement`/`Blob` en
  jsdom no rasterizan de verdad, así que el test unitario cubre la lógica de
  iteración de calidad/tamaño (con blobs mock de tamaño conocido), no el
  resultado visual — eso se valida a mano según `quickstart.md`.
