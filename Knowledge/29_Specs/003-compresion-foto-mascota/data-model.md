# Data Model: Compresión Automática de Foto de Mascota

No se agrega ninguna tabla ni columna nueva — `photo_url` en `pets` ya existe
y no cambia de forma. Este feature es enteramente client-side, previo a la
subida; el "modelo" acá es el ciclo de vida transitorio del archivo en el
navegador, no una entidad persistida nueva.

## Entidad: Foto de mascota (transitoria, en memoria del navegador)

| Estado | Representación | Descripción |
|---|---|---|
| Seleccionada | `File` (del `<input type="file">`) | Archivo tal cual lo entrega el navegador — puede pesar cualquier tamaño, cualquier formato de imagen que el selector acepte. |
| Procesada | `File`/`Blob` (`image/jpeg`) | Resultado de la función de compresión: mismo contenido visual, downscaleado proporcionalmente si excedía la resolución máxima, reencodeado en JPEG a una calidad que entra bajo el límite de subida. Reemplaza a la "Seleccionada" en el estado del componente — la app nunca sube la versión original sin procesar. |
| Subida | URL pública de Supabase Storage | Resultado de subir la versión "Procesada" al bucket `kittypau-photos`, igual que hoy (`pets/${petId}.${ext}` en `/pet`, `pets/${random}.${ext}` en registro). |
| Rechazada | Mensaje de error (string) | Cuando la versión "Procesada" sigue sobre el límite tras la reducción, o el archivo no se pudo decodificar — no se sube nada, se conserva el estado anterior de la foto (si había una). |

## Reglas de validación

- **Límite de subida**: se evalúa sobre el archivo "Procesada", nunca sobre
  el archivo "Seleccionada" original (FR-001, FR-004).
- **Formato de salida**: siempre `image/jpeg` tras pasar por la función de
  compresión, sin importar el formato de entrada (JPEG, PNG, WebP, etc.) que
  el navegador haya podido decodificar — consistente con lo que
  `applyCrop()` ya produce hoy.
- **Resolución máxima**: el lado más largo de la imagen "Procesada" no
  supera un máximo fijo (ver `research.md` — mismo valor para ambos flujos,
  FR-002 consistencia).
- **Aspect ratio**: se preserva sin recorte en la reducción automática (el
  recorte a cuadrado en registro-flow.tsx sigue siendo un paso manual
  aparte, no parte de este ciclo).
- **Fallo de decodificación o de reducción bajo el límite**: transición
  directa a "Rechazada", nunca se intenta subir un archivo que no cumple el
  límite (FR-005).

## Sin cambios de schema

- `pets.photo_url` (Supabase) — sin cambios, sigue siendo una URL pública de
  texto.
- Bucket `kittypau-photos` — sin cambios de políticas ni estructura de
  carpetas (`pets/...`, `profiles/...`).
