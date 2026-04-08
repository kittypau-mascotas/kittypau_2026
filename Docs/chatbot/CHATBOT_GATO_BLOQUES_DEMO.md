# Bloques visuales de la demo - Chatbot del gato de Kittypau

## Proposito

Este documento traduce la pantalla `demo` en bloques visuales concretos.

La idea es que el gato no hable en abstracto.
Debe reconocer cada bloque real de la UI, explicar para que sirve y decidir si vale la pena mencionarlo.

## Regla base

El gato solo explica lo que existe en la demo real.

Si un bloque no esta visible, no debe inventarlo.
Si un bloque esta visible pero es secundario, el gato puede mencionarlo solo de forma breve.

## Bloques reales de la demo

| Bloque | Que muestra | Para que sirve | Que puede decir el gato | Que no debe decir |
| --- | --- | --- | --- | --- |
| Perfil de la mascota | Foto, nombre de la mascota y titular de la cuenta | Identifica a quien pertenece la demo | "Arriba ves el perfil. Ese nombre y esa foto representan a tu mascota." | Datos que no esten cargados |
| Panel de estado | Alimentacion, hidratacion y resumen visual | Resume el estado actual de la demo | "Ese panel central resume comida e hidratacion." | Medidas inventadas o lecturas no visibles |
| Sello de actualizacion | Fecha u hora de ultima actualizacion | Da contexto temporal | "Eso te dice cuando se actualizo por ultima vez." | Explicar un proceso tecnico que no se ve |
| Acciones rapidas | Botones hacia story, bowl, pet o settings | Lleva a otras vistas | "Desde aqui saltas a las vistas operativas." | Inventar rutas que no existen |
| Hero de la demo | Bloque principal personalizado con datos del usuario | Presenta la experiencia guiada | "Este hero usa lo que cargaste en login." | Decir que es un formulario o un dashboard real de produccion |
| CTA de salida | Instagram o volver a probar la app | Cerrar la experiencia o invitar a seguir | "Si ya viste todo, puedes seguir o salir." | Forzar una accion que no corresponde |
| Cuadro del gato | Dialogo fijo, acciones A / B, botones de sonido y cierre | Guía la experiencia | "Yo te explico la pantalla y te llevo al siguiente paso." | Decir que cambia de forma o que es libre |

## Orden recomendado de explicacion

### 1. Hero

Es lo primero que el gato debe explicar en la demo real.

Debe mencionar:
- foto de la mascota;
- nombre de la mascota;
- titular de la cuenta;
- que esos datos vienen de lo que el usuario ya cargo.

### 2. Panel de estado

Despues del hero, el gato puede explicar el panel central.

Debe mencionar:
- alimentacion;
- hidratacion;
- que es un resumen visual;
- que sirve para ver el estado rapido.

### 3. Acciones rapidas

Luego puede señalar los accesos a otras vistas.

Debe mencionar:
- `story`;
- `bowl`;
- `pet`;
- `settings`.

### 4. CTA final

Si el usuario ya entendio la pantalla, el gato cierra con una accion:
- ir a Instagram;
- volver a probar la app;
- salir de la demo.

## Relacion entre bloque y mensaje del gato

### Hero

Mensaje esperado:
- contextual;
- corto;
- enfocado en explicar de donde salen el nombre y la foto.

### Panel de estado

Mensaje esperado:
- orientado a lectura rapida;
- explica el resumen;
- evita tecnicismos.

### Acciones rapidas

Mensaje esperado:
- directo;
- indica a donde llevarse el usuario;
- no describe demasiado cada pantalla.

### CTA final

Mensaje esperado:
- de cierre;
- breve;
- con personalidad felina;
- sin presionar demasiado.

## Ejemplo de guion operativo

1. "Mira arriba. Ese es el perfil de tu mascota."
2. "Al centro tienes el estado resumido de comida e hidratacion."
3. "Abajo o a un lado estan los accesos a las vistas operativas."
4. "Si quieres seguir, entra a una seccion. Si no, ve a Instagram."

## Como se conecta con el codigo

La referencia funcional vive en:

- `kittypau_app/src/chatbot-gato/demo-context.ts`

La capa de prompts por bloque vive en:

- `kittypau_app/src/chatbot-gato/demo-block-prompts.ts`

Ese modulo define:
- el mapa semantico de la demo;
- el contexto del hero;
- el paso del flujo;
- y las acciones del gato.

## Relacion con otros documentos

- [chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md](chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md) - contexto real total del producto.
- [chatbot/CHATBOT_GATO_CONTEXTO_DEMO.md](chatbot/CHATBOT_GATO_CONTEXTO_DEMO.md) - contexto semantico de la demo.
- [chatbot/CHATBOT_GATO_PROMPTS_DEMO.md](chatbot/CHATBOT_GATO_PROMPTS_DEMO.md) - prompts concretos por bloque.
- [chatbot/CHATBOT_GATO_KITTYPAU.md](chatbot/CHATBOT_GATO_KITTYPAU.md) - especificacion integral.
- [chatbot/PLAN_CHATBOT_GATO_KITTYPAU.md](chatbot/PLAN_CHATBOT_GATO_KITTYPAU.md) - plan de construccion.

## Resultado esperado

Con esta tabla, el gato de la demo puede:

- explicar el hero real;
- guiar al usuario por la pantalla;
- hablar con datos que si existen;
- y evitar inventar elementos que no estan en la UI.



