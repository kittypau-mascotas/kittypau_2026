# Plan paso a paso - Chatbot de Admin de Kittypau

## Objetivo

Construir un chatbot interno de administracion, simple y liviano, ubicado en el hero de admin, que permita a Javo, Mauro y administradores consultar la totalidad del proyecto de Kittypau sin mezclarse con el gato visible para cliente.

Este plan parte desde el estado actual:

- existe un chatbot del gato visible para `login`, `demo` e `inicio`;
- existe una separacion formal entre experiencia cliente y alcance interno;
- la documentacion viva ya esta organizada en `INDEX.md` y `README.md`;
- el chatbot de admin ya tiene su especificacion canonica en `chatbot/CHATBOT_ADMIN_KITTYPAU.md`.

## Estado del plan

- Paso 1: especificacion integral del chatbot de admin creada.
- Paso 2: separacion de alcance entre gato visible y chatbot interno documentada.
- Paso 3: chatbot de admin reducido a un hero interno simple.
- Siguiente paso real: definir un primer cuadro de preguntas y respuestas internas para el hero de admin.

## Principios del plan

1. El chatbot de admin tiene alcance total del proyecto.
2. El chatbot de admin no reemplaza al gato visible.
3. La documentacion viva es la fuente principal.
4. Los archivos historicos solo sirven de apoyo.
5. Las respuestas deben ser claras, verificables y estructuradas.
6. No exponer secretos, tokens ni configuraciones sensibles.
7. La experiencia debe sentirse simple y ligera dentro del hero de admin.

## Fase 0 - Base documental del admin

### Objetivo

Dejar completamente estable la base documental que el chatbot de admin va a consultar.

### Tareas

1. Confirmar que `chatbot/CHATBOT_ADMIN_KITTYPAU.md` define el alcance total del chatbot.
2. Mantener `INDEX.md` como entrada principal a la documentacion.
3. Mantener `README.md` como puerta de entrada humana.
4. Asegurar que el chatbot de admin distinga documentos vivos de historicos.
5. Marcar explicitamente los docs canonicos por area.

### Criterio de salida

- El chatbot de admin puede ubicar la doc correcta por tema.
- No mezcla docs viejos con docs vivos.
- La jerarquia de lectura esta clara.

### Entregable de este paso

- `chatbot/CHATBOT_ADMIN_KITTYPAU.md` como especificacion integral.
- `INDEX.md` como mapa global.
- `README.md` como entrada humana.

## Fase 1 - Hero interno simple

### Objetivo

Definir el hero de admin como superficie simple de consulta interna.

### Tareas

1. Diseñar un bloque visual pequeño y claro dentro del admin.
2. Preparar una entrada de preguntas internas.
3. Mantener la interfaz ligera y no invasiva.
4. Mostrar respuestas breves con posibilidad de ampliar.

### Criterio de salida

- El chatbot vive en un hero simple.
- La interfaz no domina la pantalla.
- La experiencia sigue siendo limpia para el admin.

## Fase 2 - Capa de contexto documental

### Objetivo

Definir como el chatbot de admin va a leer y resumir la documentacion del proyecto.

### Tareas

1. Definir un esquema de temas:
   - producto;
   - arquitectura;
   - UI;
   - datos;
   - bridge;
   - finanzas;
   - despliegue;
   - chatbot cliente;
   - roadmap.
2. Asociar cada tema a sus documentos fuente.
3. Definir prioridad entre docs vivos y docs historicos.
4. Diseñar un indice de contexto para respuestas rapidas.

### Criterio de salida

- El chatbot sabe de donde sacar cada respuesta.
- La consulta se apoya en documentos reales.
- El contexto queda estructurado por tema.

### Entregable de este paso

- `src/lib/chatbot-admin/` como capa de contexto futura.
- mapa documental de temas y fuentes.

## Fase 3 - Recuperacion de conocimiento

### Objetivo

Permitir que el chatbot de admin consulte fragmentos relevantes de la documentacion segun la pregunta.

### Tareas

1. Diseñar una estrategia de busqueda por tema.
2. Definir como priorizar coincidencias.
3. Resumir documentos largos sin perder contexto.
4. Preparar salida estructurada para respuestas internas.

### Criterio de salida

- El chatbot no necesita leer todo el proyecto cada vez.
- La respuesta se arma con fragmentos utiles.
- El proceso es rapido y consistente.

## Fase 4 - Modelo de respuesta del admin

### Objetivo

Definir el formato de respuesta del chatbot de admin.

### Tareas

1. Responder siempre con:
   - estado actual;
   - doc(s) relevantes;
   - riesgos o vacios;
   - siguiente paso recomendado.
2. Establecer tono:
   - claro;
   - directo;
   - util;
   - tecnico cuando haga falta.
3. Permitir respuestas cortas o largas segun la consulta.

### Criterio de salida

- La respuesta es accionable.
- El usuario entiende el estado real del proyecto.
- La estructura se mantiene estable.

## Fase 5 - Capa de seguridad y limites

### Objetivo

Evitar que el chatbot de admin exponga informacion sensible o invente contexto.

### Tareas

1. No mostrar tokens.
2. No mostrar secretos de infraestructura.
3. No mezclar datos de cliente con datos internos.
4. No inventar decisiones que no existan en la documentacion.
5. Registrar solo trazas seguras.

### Criterio de salida

- El chatbot es util pero seguro.
- La informacion sensible queda protegida.

## Fase 6 - Integracion tecnica

### Objetivo

Conectar el chatbot de admin a una implementacion real dentro del proyecto.

### Tareas

1. Elegir el backend donde vivira.
2. Conectar el runtime de contexto.
3. Añadir soporte para respuestas estructuradas.
4. Preparar el canal de consulta interna.

### Criterio de salida

- El chatbot de admin puede responder consultas reales.
- La UI o panel interno mantiene una estructura clara.

## Fase 7 - Validacion

### Objetivo

Probar que el chatbot de admin entiende bien el proyecto y no confunde areas.

### Tareas

1. Probar consultas de producto.
2. Probar consultas de arquitectura.
3. Probar consultas de datos.
4. Probar consultas de finanzas.
5. Probar consultas de chatbot cliente.
6. Probar consultas de roadmap.

### Criterio de salida

- Las respuestas son coherentes.
- La separacion entre admin y cliente se mantiene.

## Fase 8 - Despliegue gradual

### Objetivo

Activar el chatbot de admin sin afectar el resto del ecosistema.

### Tareas

1. Publicar primero la base documental.
2. Activar luego la capa de contexto.
3. Encender despues la recuperacion de conocimiento.
4. Habilitar respuestas reales de forma gradual.

### Criterio de salida

- El chatbot de admin crece sin romper la experiencia existente.

## Orden recomendado de ejecucion

1. Cerrar base documental.
2. Definir el hero interno simple.
3. Construir capa de contexto.
4. Diseñar recuperacion de conocimiento.
5. Definir formato de respuesta.
6. Blindar seguridad.
7. Integrar tecnicamente.
8. Validar.
9. Desplegar de forma gradual.

## Relacion con la documentacion existente

- [chatbot/CHATBOT_ADMIN_KITTYPAU.md](chatbot/CHATBOT_ADMIN_KITTYPAU.md) -> especificacion integral del chatbot de admin.
- [chatbot/CHATBOT_GATO_KITTYPAU.md](chatbot/CHATBOT_GATO_KITTYPAU.md) -> especificacion integral del gato visible para cliente.
- [INDEX.md](INDEX.md) -> mapa global de la documentacion.
- [README.md](README.md) -> entrada principal a la documentacion.

## Resultado esperado

Al terminar este plan, Kittypau tendra:

- un chatbot de admin capaz de leer toda la documentacion;
- respuestas ordenadas por tema;
- separacion clara entre cliente e interno;
- base para consultas operativas y estrategicas;
- y una guia de conocimiento util para el equipo completo.


