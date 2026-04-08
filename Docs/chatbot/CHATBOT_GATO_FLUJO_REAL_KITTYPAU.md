# Flujo real del gato en KittyPau

## Proposito

Este documento define el flujo que ya existe hoy y el flujo que queremos mostrarle al usuario en la experiencia del gato.

La meta es separar claramente:

- lo que pasa en `login`;
- lo que pasa en `demo`;
- lo que pasa en `inicio`;
- y lo que seria la siguiente fase conversacional.

## Flujo 1 - Ingreso a la demo desde login

### Paso a paso real

1. El usuario hace clic en `Demo App` o abre el flujo de prueba.
2. Aparece el modal de registro.
3. El usuario escribe:
   - su nombre;
   - el nombre de su mascota;
   - su correo.
4. Mientras llena esos datos, aparece el gato.
5. El gato habla con tono sarcastico y burlon.
6. El gato acompana el proceso hasta el boton `Entrar a prueba`.
7. En `login` tambien aparece el mensaje o salida narrativa que invita a seguir a Instagram.
8. Al final, el gato puede cerrar con un empuje narrativo hacia el Instagram de Kittypau.

### Lo que el gato debe decir en este flujo

- que esta en modo prueba;
- que el usuario debe completar sus datos;
- que la demo se abrira con esa informacion;
- que la experiencia es ligera, breve y guiada;
- que Instagram es la salida o cierre narrativo natural.

### Lo que el gato no debe hacer

- no debe cambiar la forma del modal;
- no debe inventar datos del usuario;
- no debe explicar toda la app de golpe;
- no debe romper el proceso de registro.
- no debe olvidar que el cierre de Instagram ya forma parte de la experiencia de login.

## Flujo 2 - Entrada a demo con hero personalizado

### Paso a paso real

1. El usuario entra a `/demo`.
2. La pantalla muestra el hero personalizado.
3. Se ve:
   - nombre del titular;
   - nombre de la mascota;
   - foto de perfil;
   - resumen de alimentacion;
   - resumen de hidratacion.
4. Aparece el gato nuevamente.
5. El gato explica la pantalla con un texto parecido al actual.
6. El gato termina con una invitacion clara:
   - seguir viendo la app;
   - ir a Instagram;
   - o seguir a la experiencia guiada.

### Lo que el gato debe decir en este flujo

- que el hero usa los datos cargados en login;
- que la foto y el nombre representan a la mascota;
- que el panel central resume el estado;
- que los accesos llevan a las vistas operativas;
- que la demo es una guia real, no un formulario.

### Lo que el gato no debe hacer

- no debe ocultar el hero;
- no debe hablar de datos que no esten visibles;
- no debe explicar como si fuera un backend tecnico;
- no debe salir del contexto de demo.

## Flujo 3 - `inicio`

### Paso a paso real

1. El usuario llega a la vista `inicio`.
2. El gato saluda.
3. El gato pregunta si quiere guia.
4. El usuario responde si o no.
5. El flujo termina rapido.

### Lo que el gato debe decir en este flujo

- que es una bienvenida breve;
- que puede orientar rapido;
- que no va a hablar demasiado;
- que puede cerrar si el usuario no quiere guia.

## Flujo 4 - Fase futura de chatbot libre

### Idea futura

Luego de la version guiada, el gato puede evolucionar a una conversacion escrita por el usuario.

En esa fase:

- el cuadro sigue siendo el mismo;
- el gato sigue con la misma personalidad;
- cambia la fuente de las respuestas;
- y aparece un cuadro de escritura abajo para preguntar cosas sobre Kittypau.

### Regla importante

Esta fase todavia no cambia la UI actual.

Solo define el destino narrativo.

## Regla de alcance del contenido

En la experiencia visible del gato para cliente:

- el contenido debe enfocarse en el uso de Kittypau;
- debe ayudar a resolver necesidades de la mascota;
- debe explicar lo que el usuario ve en la app;
- debe guiar hacia la siguiente accion util.

La explicacion de la totalidad del proyecto, la administracion y las consultas globales de la plataforma deben reservarse para el chatbot de `admin`.

Asi evitamos mezclar una experiencia de cliente con una vista interna del proyecto.

## Reglas globales del flujo

1. Un solo gato.
2. Un solo cuadro de dialogo.
3. Un solo tono.
4. No inventar contexto.
5. No cambiar la geometria del cuadro.
6. El hero personalizado solo existe en `demo`.
7. El modal de registro solo existe en `login`.
8. `inicio` debe ser breve.

## Relacion con la arquitectura actual

- `login` captura datos.
- `demo` muestra el hero real con esos datos.
- `inicio` orienta rapido.
- la futura IA se conecta despues, sin cambiar la estructura visual.

## Relacion con otros documentos

- [chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md](chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md)
- [chatbot/CHATBOT_GATO_BLOQUES_DEMO.md](chatbot/CHATBOT_GATO_BLOQUES_DEMO.md)
- [chatbot/CHATBOT_GATO_PROMPTS_DEMO.md](chatbot/CHATBOT_GATO_PROMPTS_DEMO.md)
- [chatbot/CHATBOT_GATO_BLOQUES_INICIO.md](chatbot/CHATBOT_GATO_BLOQUES_INICIO.md)
- [chatbot/CHATBOT_GATO_PROMPTS_INICIO.md](chatbot/CHATBOT_GATO_PROMPTS_INICIO.md)

## Resultado esperado

Cuando este flujo se implemente por completo, el usuario deberia sentir que:

- entra por login;
- carga su informacion;
- ve su hero en demo;
- escucha al gato explicar lo que ve;
- y finalmente puede seguir o salir hacia Instagram.


