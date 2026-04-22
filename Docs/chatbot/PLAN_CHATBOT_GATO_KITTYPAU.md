# Plan paso a paso - Chatbot del gato de Kittypau

## Objetivo
Construir el chatbot del gato de Kittypau de forma ordenada, sin romper la UI actual del dialogo, y dejando listo el camino para una IA futura.

Este plan parte desde el estado actual:
- existe un unico componente compartido de dialogo;
- el cuadro es fijo y no debe crecer con el texto;
- `login`, `demo` e `inicio` ya conocen el gato;
- la experiencia actual puede ser guada por estado antes de ser IA real.

## Estado del plan

- Paso 1: base visual y documental cerrada.
- Paso 2: maquna de estados documentada.
- Paso 3: maquna de estados implementada en `demo`.
- Paso 4: contexto semantico de la demo conectado a codigo.
- Paso 5: contexto semantico de `login` centralizado en codigo.
- Paso 6: contexto semantico de `inicio` centralizado en codigo.
- Paso 7: capa runtime compartida del chatbot en codigo.
- Siguente paso real: extender o refinar el flujo para `login` e `inicio`.

## Principios del plan

1. Un solo gato.
2. Un solo cuadro de dialogo.
3. Un solo contrato visual.
4. Primero la estructura, luego el contenido.
5. Primero el flujo guado, luego la IA.
6. No duplicar UI ni crear variantes paralelas.

## Fase 0 - Alnear la base

### Objetivo
Dejar completamente estable la pieza visual y documental que ya existe.

### Tareas
1. Confirmar que `src/chatbot-gato/trial-rpg-dialog.tsx` sigue siendo el unico componente del dialogo.
2. Mantener fijo el tamano del cuadro en `globals.css`.
3. Mantener documentada la estructura canonica en `chatbot/CHATBOT_GATO_KITTYPAU.md`.
4. Asegurar que `login`, `demo` e `inicio` apunten al mismo contrato visual.

### Criterio de salida
- El cuadro no cambia de alto segn el texto.
- No hay dialogos duplicados.
- La documentacin maestro esta actualizada.

### Entregable de este paso
- `chatbot/CHATBOT_GATO_KITTYPAU.md` como documento canonico.
- `COMPONENTE_GATO.md` como detalle visual y tecnico.
- `src/chatbot-gato/trial-rpg-dialog.tsx` como unico componente compartido.
- `globals.css` como contrato de geometria estable.

## Fase 1 - Convertir el dialogo en estado guado

### Objetivo
Definir el chatbot como una maquna de estados con opciones A / B en lugar de texto libre.

### Tareas
1. Definir una estructura de pasos para el dialogo.
2. Mapear cada paso a:
   - texto;
   - accines;
   - siguente estado.
3. Usar `trial-rpg-actions` como slot para botones.
4. Definir un catalogo base de respuestas del gato.
5. Documentar la maquna de estados en `chatbot/CHATBOT_GATO_STATE_MACHINE.md`.
6. Centralizar el runtime compartido del gato entre `login`, `demo` e `inicio`.

### Ejemplo de pasos
- `step 0`: mensaje inicial.
- `step 1`: pregunta con opciones A / B.
- `step 2`: respuesta segn la eleccion.
- `step 3`: CTA final.

### Criterio de salida
- El usuario no escribe.
- El usuario elige.
- El flujo cambia de estado sin perder la geometria del cuadro.
- Las tres paginas leen un runtime comun.

### Entregable de este paso
- `chatbot/CHATBOT_GATO_STATE_MACHINE.md` con estados, accines y transiciones por pagina.
- `src/chatbot-gato/runtime.ts` como capa compartida de contexto.

## Fase 2 - Disear la narrativa base

### Objetivo
Definir el tono y los contenidos iniciales del gato para cada pagina.

### Tareas
1. Escribir el guion base del gato en `login`.
2. Escribir el guion de introduccion en `demo`.
3. Escribir el guion de bienvenida en `inicio`.
4. Mantener la misma personalidad en todos los casos.
5. Centralizar el contexto del modal de prueba y del dialogo de `login`.
6. Centralizar el contexto de bienvenida de `inicio`.

### Tono obligatorio
- sarcasmo suave;
- humor felino;
- leve mal humor;
- claridad;
- brevedad.

### Criterio de salida
- Los textos no se sienten improvisados.
- Cada pagina tiene una voz consistente.
- El gato suena como una sola entidad.

## Fase 3 - Implementar la lgica local de conversacion

### Objetivo
Hacer que el flujo guado funcione sin depender todavia de IA externa.

### Tareas
1. Guardar `step` y `choice` en estado local.
2. Renderizar contenido segn el paso actual.
3. Conectar botones del slot `actions` con el cambio de estado.
4. Mantener el mismo componente visual para todas las paginas.

### Criterio de salida
- El dialogo avanza por pasos.
- Las opciones modifican el texto.
- El comportamiento es predecible y estable.

## Fase 4 - Integrar persistencia y contexto

### Objetivo
Conservar contexto basico del usuario para que el gato responda de forma til.

### Tareas
1. Crear y usar el contexto semantico del demo en `src/chatbot-gato/demo-context.ts`.
2. Leer contexto desde Supabase o estado local segn la pagina.
3. Guardar progreso mnimo del dialogo si aplica.
4. Decidir si el gato recuerda la ultima eleccion del usuario.
5. Mantener la experiencia consistente en recargas.

### Criterio de salida
- El gato no pierde contexto critico al refrescar.
- El flujo puede reanudarse.
- La app sigue siendo rpida.
- La demo conoce el mapa semantico de la pantalla.

## Fase 5 - Conectar IA real

### Objetivo
Reemplazar o complementar las respuestas fijas con un backend IA.

### Tareas
1. Crear backend dedicado para el chatbot.
2. Enviar al backend:
   - paso actual;
   - eleccion;
   - contexto mnimo del usuario;
   - historial breve.
3. Llamar a Hugging Face por HTTP desde backend.
4. Exponer la ruta `src/app/api/chatbot-gato/route.ts` como punto unico de respuesta.
5. Configurar `HF_TOKEN` y `HF_MODEL` como variables server-side.
6. Mantener el mismo cuadro de dialogo.

### Criterio de salida
- La UI no cambia.
- Solo cambia la fuente del texto.
- La IA respeta el tono del gato.
- Si HF no responde, el fallback local sigue funcionando.

## Fase 6 - Seguridad, observabilidad y fallbacks

### Objetivo
Evitar que el chatbot rompa el proyecto o exponga secretos.

### Tareas
1. Mantener tokens solo en backend.
2. Registrar errores sin secretos.
3. Definir respuesta de fallback cuando la IA no responda.
4. Medir tiempos de respuesta y fallos.

### Criterio de salida
- Si falla la IA, el gato sigue respondiendo con fallback.
- No se exponen secretos.
- La experiencia no se rompe.

## Fase 7 - Pruebas y vlidacion

### Objetivo
Asegurar que el chatbot no rompa login, demo ni inicio.

### Tareas
1. Probar la apertura del cuadro en `login`.
2. Probar la apertura del cuadro en `demo`.
3. Probar la llegada del flujo en `inicio`.
4. Verificar que el cuadro mantiene tamano fijo.
5. Verificar que las accines A / B cambian de paso.
6. Verificar que la musica y el sonido se comportan bien.

### Criterio de salida
- Build limpio.
- Type-check limpio.
- UI estable.
- Conversacion til y consistente.

## Fase 8 - Despliegue gradual

### Objetivo
Publicar cambios sin romper la experiencia ya existente.

### Tareas
1. Mantener el flujo actual como baseline.
2. Activar chatbot guado primero.
3. Activar IA real despues.
4. Hacer rollout gradual si el canal lo permite.

### Criterio de salida
- El usuario siempre ve una experiencia coherente.
- No hay regresiones visuales.

## Orden recomendado de ejecucion

1. Cerrar base visual y documental.
2. Implementar estado guado A / B.
3. Escribir narrativa por pagina.
4. Conectar persistencia minima.
5. Conectar IA real.
6. Blindar seguridad y fallbacks.
7. Probar.
8. Desplegar.

## Relacion con la documentacin existente

- [chatbot/CHATBOT_GATO_KITTYPAU.md\](CHATBOT_GATO_KITTYPAU.md) -> especificacion integral.
- [COMPONENTE_GATO.md\](../COMPONENTE_GATO.md) -> detalle tecnico visual.
- [CLI_ORQUESTACION_HF_SUPABASE_VERCEL.md\](../CLI_ORQUESTACION_HF_SUPABASE_VERCEL.md) -> orquestacion CLI y backend IA.
- [POPUP_REGISTRO_SPEC.md\](../POPUP_REGISTRO_SPEC.md) -> flujo del registro donde convive el dialogo.

## Resultado esperado

Al terminar este plan, Kittypau tendra:
- un chatbot del gato coherente;
- un cuadro estable y reusable;
- una narrativa guada por estados;
- una base lista para IA futura;
- una experiencia sin ambiguedades entre login, demo e inicio.




