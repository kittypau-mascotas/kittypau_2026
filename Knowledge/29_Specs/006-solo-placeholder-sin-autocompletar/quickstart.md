# Quickstart: Validar que login/registro/reset nunca se pre-llenan

## Prerrequisitos

- Un navegador con al menos una credencial YA guardada para Kittypau (o
  guardarla ahora: iniciar sesión una vez y aceptar "¿guardar contraseña?"
  si el navegador lo ofrece).
- `kittypau_app/` corriendo local o el preview del PR.

## Escenario 1 — Login no se pre-llena

1. Cerrar sesión, volver a `/login`.
2. **Esperado**: campo de email vacío (placeholder "tu@email.com"), campo
   de contraseña vacío — ninguno con el valor guardado.
3. Hacer foco en el campo de email — **esperado**: no aparece ningún
   dropdown de sugerencias (ni del navegador, ni el `<datalist>` propio que
   existía antes de este cambio).
4. Escribir a mano y confirmar que el login funciona con normalidad.

## Escenario 2 — Registro no se pre-llena (el caso que causó el bug real)

1. Ir a "Crear cuenta", llegar al paso 1 (Usuario).
2. **Esperado**: campo de email y de contraseña vacíos, sin importar que el
   navegador tenga guardada una cuenta de prueba usada momentos antes en el
   mismo navegador.
3. Repetir un registro de prueba con el mismo navegador 2 veces seguidas
   (con emails distintos) y confirmar que en la segunda vez el formulario
   sigue en blanco, no repite lo de la vez anterior.

## Escenario 3 — Recuperar contraseña no se pre-llena

1. Ir a "Olvidé mi clave".
2. **Esperado**: campo de email vacío.

## Escenario 4 — El placeholder sigue ahí

1. En cualquiera de los 3 formularios, confirmar que el campo de email
   vacío sigue mostrando el placeholder de ejemplo (ej. "tu@email.com") —
   este cambio no debe dejar los campos sin ninguna guía visual.

## Validación automatizada

```bash
cd kittypau_app
npx tsc --noEmit
npx eslint "src/app/(public)/login/page.tsx"
```

Sin test unitario dedicado (ver `research.md` § Testing) — los 4 escenarios
de arriba son la validación real, dependen de comportamiento real del
navegador con credenciales ya guardadas.
