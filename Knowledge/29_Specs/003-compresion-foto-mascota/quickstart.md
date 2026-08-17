# Quickstart: Validar la compresión automática de foto de mascota

## Prerrequisitos

- `kittypau_app/` corriendo local (`npm run dev`) con variables públicas de
  Supabase configuradas (mismas que ya usa `getSupabaseBrowser()`).
- Una sesión de usuario válida con al menos una mascota creada (para probar
  `/pet`) y acceso al flujo de registro (para probar una mascota nueva).
- 2 archivos de imagen de prueba:
  - Una foto de celular real de más de 5MB (JPEG, la mayoría de las fotos de
    celular modernas sirven).
  - Una foto ya liviana (bajo 1MB), para confirmar que no hay regresión.

## Escenario 1 — `/pet`, cambiar foto de una mascota existente (User Story 1)

1. Entrar a `/pet` con una mascota ya seleccionada.
2. Clic en "Cambiar foto", elegir la foto de más de 5MB.
3. **Esperado**: no aparece el mensaje "La foto no puede pesar más de 5 MB".
   La foto se sube, `isUploadingPhoto` vuelve a `false`, y la miniatura
   circular se actualiza con la foto nueva.
4. Repetir con la foto liviana (<1MB) — mismo resultado, sin demora
   perceptible adicional (SC-005).

## Escenario 2 — Registro, foto de mascota nueva (User Story 2)

1. Entrar al flujo de registro, llegar al paso "2. Mascota".
2. En "Foto de mascota", usar "Subir archivo" con la foto de más de 5MB.
3. **Esperado**: no aparece `photoError` de tamaño. La miniatura de preview
   se actualiza con la foto (ya reducida).
4. Opcional: clic en la miniatura o "Editar foto" para confirmar que el
   editor de recorte manual (`applyCrop`) sigue funcionando igual sobre la
   foto ya reducida.
5. Completar y guardar el paso de mascota — confirmar que `photo_url` queda
   guardado en la respuesta de `POST /api/pets` (Network tab o respuesta en
   pantalla).

## Escenario 3 — Consistencia y caso borde (User Story 3)

1. Usar la misma foto de prueba de más de 5MB en ambos escenarios (1 y 2) —
   confirmar que en los dos casos se acepta (o, si se prueba un archivo
   deliberadamente corrupto/no-imagen, se rechaza con el mismo tipo de
   mensaje en los dos flujos).
2. (Si se dispone de un archivo de prueba de detalle extremo que no logre
   bajar del límite ni al piso de calidad) confirmar que el mensaje de error
   mostrado es distinto del genérico de "más de 5MB" — debe indicar que la
   foto no se pudo procesar/reducir lo suficiente.

## Validación automatizada

```bash
cd kittypau_app
npm run test -- photo-compress
```

Cubre la lógica de downscale/reencode iterativo con blobs mock (ver
`research.md` § Testing) — no reemplaza los 3 escenarios manuales de arriba,
que son los que prueban la subida real a Supabase Storage.
