# Escena Unica del Cuadro del Gato

## Regla Canonica

El cuadro del gato es una sola escena reutilizable.

La aplicacion no debe reinterpretar su geometria en cada pagina.
Cada pantalla puede cambiar:

- el texto;
- el contexto;
- las acciones;
- el momento en que aparece.

Pero no debe cambiar:

- la forma del cuadro;
- su posicion base;
- la relacion entre texto, controles y panel del gato;
- la personalidad global;
- la estructura interna del componente.

## Fuente de verdad

### 1. Contenedor visual del cuadro
- `kittypau_app/src/chatbot-gato/trial-rpg-dialog.tsx`

Este archivo define el cuadro como objeto visual reutilizable.

### 2. Posicion compartida
- `kittypau_app/src/chatbot-gato/trial-rpg-dialog-dock.tsx`

Este archivo define el lugar comun donde aparece el cuadro.

### 3. Contexto por pagina
- `kittypau_app/src/app/(public)/login/page.tsx`
- `kittypau_app/src/app/(public)/demo/page.tsx`
- `kittypau_app/src/app/(app)/inicio/page.tsx`

Estas paginas solo entregan contenido y estado.

### 4. Geometria y estetica
- `kittypau_app/src/app/globals.css`

Define el tamano, el layout interno y la aparicion visual.

## Regla de trabajo

Cuando se trabaje en el cuadro del gato:

1. no se debe crear otro cuadro;
2. no se debe cambiar la posicion base por pagina;
3. no se debe mover el cuadro desde cada vista;
4. no se debe mezclar el popup de login con la caja del gato;
5. cualquier cambio debe pasar por la escena compartida y no por una reinterpretacion local.

## Objetivo

Mantener una experiencia consistente:

- mismo objeto visual;
- misma posicion base;
- mismo personaje;
- distinto contexto segun la pagina.
