# Bloques visuales de inicio - Chatbot del gato de Kittypau

## Proposito

Este documento traduce la vista `inicio` en bloques concretos para que el gato la explique sin improvisar.

## Regla base

`inicio` es una guia rapida.

No debe hablar como demo ni como onboarding largo.
Debe ser breve, util y suave.

## Bloques reales de inicio

| Bloque | Que muestra | Para que sirve | Que puede decir el gato | Que no debe decir |
| --- | --- | --- | --- | --- |
| Bienvenida | Primera frase del gato | Abrir la experiencia | "Bienvenido a Kittypau." | Hacer un discurso largo |
| Pregunta de guia | Si quiere que el gato lo guie | Definir si sigue el flujo | "Â¿Quieres que sea tu guia?" | Insistir demasiado |
| Opciones | Si / No | Elegir el nivel de guia | "Si eliges si, te oriento. Si eliges no, cierro rapido." | Mostrar muchas opciones |
| Cierre | Fin de la guia | Dejar al usuario seguir | "Listo, puedes seguir tu camino." | Alargar el cierre |

## Orden recomendado

1. Bienvenida.
2. Pregunta de guia.
3. Eleccion.
4. Cierre.

## Relacion con la UI real

La vista `inicio` no tiene un hero completo como `demo`.

Lo visible hoy es:
- el cuadro del gato;
- el texto breve;
- las dos opciones de respuesta;
- y una vista de fondo simple.

## Relacion con el codigo

La referencia funcional vive en:

- `kittypau_app/src/chatbot-gato/inicio-context.ts`

La capa de prompts por bloque vive en:

- `kittypau_app/src/chatbot-gato/inicio-block-prompts.ts`

## Relacion con otros documentos

- [chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md\](CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md)
- [chatbot/CHATBOT_GATO_PROMPTS_INICIO.md\](CHATBOT_GATO_PROMPTS_INICIO.md)
- [chatbot/CHATBOT_GATO_KITTYPAU.md\](CHATBOT_GATO_KITTYPAU.md)
- [chatbot/PLAN_CHATBOT_GATO_KITTYPAU.md\](PLAN_CHATBOT_GATO_KITTYPAU.md)

## Resultado esperado

Con esta tabla, el gato de `inicio` puede:
- saludar;
- preguntar si quiere guia;
- responder rapido;
- y cerrar sin ocupar mas espacio del necesario.




