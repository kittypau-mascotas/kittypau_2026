# Data Model: Fotos en el Stepper de Registro

Sin entidades nuevas ni cambios de schema — el avatar de usuario
(`registerAvatar` → `photo_url` del perfil) y la foto de mascota
(`petPhotoFile`/`petPhotoPreview` → `photo_url` de la mascota, spec 003) ya
existen y no cambian de forma. Este feature solo agrega un canal para que un
valor que ya existe en `RegistroFlow` (`petPhotoPreview`) se vuelva visible
también en `page.tsx`.

## Estado nuevo (client-side, transitorio, en memoria del navegador)

| Estado | Vive en | Tipo | Origen |
|---|---|---|---|
| `registerPetPhotoPreview` | `page.tsx` | `string \| null` | Espejo de `petPhotoPreview` de `RegistroFlow`, sincronizado vía el callback `onPetPhotoPreviewChange` nuevo. |
| `photoLoadFailed` (por paso) | `page.tsx` | `Record<number, boolean>` | Se marca `true` para un paso si el `<img>` de su círculo dispara `onError` — hace que ese círculo caiga al check "✓" en vez de mostrar una imagen rota. |

## Prop nuevo

| Prop | Componente | Tipo | Descripción |
|---|---|---|---|
| `onPetPhotoPreviewChange` | `RegistroFlow` (`RegistroFlowProps`) | `(url: string \| null) => void`, opcional | Notifica al padre cada vez que `petPhotoPreview` cambia, mismo patrón que `onProgress`/`onDeviceTypeChange` ya existentes. |

## Sin cambios de schema

- `profiles.photo_url` / `pets.photo_url` (Supabase) — sin cambios, este
  feature no toca cuándo ni qué se guarda, solo qué se muestra en el stepper
  mientras el registro está en curso.
