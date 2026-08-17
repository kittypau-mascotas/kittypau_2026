# Quickstart: Validar las fotos en el stepper de registro

## Prerrequisitos

- `kittypau_app/` corriendo local (`npm run dev`).
- Una cuenta nueva para probar el registro completo (o el flujo de "Modo
  prueba" si ya está disponible para no gastar un email real).
- Una foto de mascota de prueba (idealmente una foto real de celular, para
  probar junto con la compresión automática de spec 003).

## Escenario 1 — Avatar de usuario en el círculo del paso 1 (User Story 1)

1. Abrir el registro, quedar en el paso 1 ("Usuario").
2. Elegir un avatar distinto al primero de la grilla (para notar el cambio
   claramente) y completar nombre propio + nombre de mascota.
3. Enviar el paso 1 (crear cuenta) y avanzar al paso 2 ("Mascota").
4. **Esperado**: el círculo del paso 1 en la barra de progreso muestra el
   avatar elegido, no un número ni un check.
5. Volver a mirar el círculo tras completar el paso 2 — el avatar del paso 1
   sigue ahí (no vuelve a un número ni check).

## Escenario 2 — Foto de mascota en el círculo del paso 2 (User Story 2)

1. En el paso 2, subir o tomar una foto de mascota real.
2. Completar el paso 2 y avanzar al paso 3.
3. **Esperado**: el círculo del paso 2 muestra la foto de la mascota.
4. Repetir sin subir ninguna foto de mascota — **esperado**: el círculo del
   paso 2 muestra el check "✓" genérico (FR-003), no un espacio roto.

## Escenario 3 — Casos borde

1. Provocar un error de guardado en el paso 1 o 2 (ej. desconectar la red al
   enviar) — **esperado**: el círculo muestra el aviso "⚠", no la foto,
   mientras el error esté activo.
2. Volver atrás con la barra de progreso a un paso ya completado y cambiar la
   foto/avatar — **esperado**: el círculo se actualiza con la elección nueva.
3. Confirmar que el paso 3 (Kittypau) sigue mostrando el logo de la app sin
   cambios, con y sin haber completado los pasos 1/2.

## Validación automatizada

```bash
cd kittypau_app
npx tsc --noEmit
npx eslint "src/app/(public)/login/page.tsx" "src/app/(public)/login/_components/registro-flow.tsx"
```

Sin test unitario dedicado (ver `research.md` § Testing) — los 3 escenarios
de arriba son la validación real de este feature, puramente visual.
