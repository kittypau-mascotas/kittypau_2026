# Maquina de estados - Chatbot del gato de Kittypau

## Proposito
Definir el comportamiento conversacional del gato como una maquina de estados guiada.

Esta capa describe:
- que estados existen;
- que texto muestra cada estado;
- que acciones permite;
- que pagina los usa;
- y como se encadena todo sin romper la UI fija del dialogo.

## Alcance

La maquina de estados aplica sobre el componente compartido:
- `src/chatbot-gato/trial-rpg-dialog.tsx`

Y se integra con estas paginas:
- `src/app/(public)/login/page.tsx`
- `src/app/(public)/demo/page.tsx`
- `src/app/(app)/inicio/page.tsx`

## Regla base

El usuario no escribe texto libre en esta capa.

El usuario elige una accion.
Esa accion cambia el estado.
El estado cambia el texto.
La geometria del cuadro no cambia.

## Estados globales

### `step = 0`
Mensaje inicial.

Propiedades:
- texto breve de apertura;
- una sola accion principal o una accion muy clara;
- el gato establece tono.

### `step = 1`
Pregunta de eleccion.

Propiedades:
- al menos dos opciones A / B;
- la eleccion guarda una variable de contexto;
- el texto se adapta a la pagina.

### `step = 2`
Respuesta condicionada.

Propiedades:
- el gato responde segun la eleccion anterior;
- puede variar el texto sin cambiar la caja;
- puede ofrecer una nueva CTA.

### `step = 3`
Cierre o salida.

Propiedades:
- CTA final;
- enlace externo o accion de siguiente paso;
- fin del recorrido guiado.

## Estado minimo de UI

```tsx
const [step, setStep] = useState(0);
const [choice, setChoice] = useState<string | null>(null);
```

Opcionalmente:
- `seenIntro`
- `dismissed`
- `hasInteracted`
- `sourcePage`

## Flujo canonico de `demo`

La vista `demo` es el caso principal de la maquina de estados.

### Step 0 - apertura
Texto ejemplo:

> Oh... otro humano curioso. Intenta no romper nada.

Accion:
- `Aceptar con dignidad`

### Step 1 - eleccion A / B
Texto ejemplo:

> Dime. ?Tienes perro o gato?

Acciones:
- `Perro`
- `Gato`

### Step 2 - respuesta segun eleccion

Si `choice === "perro"`:

> Perro... ruidosos, pero aceptables. Mira esto en la demo.

Si `choice === "gato"`:

> Gato. Excelente. Claramente sabes lo que haces.

Accion:
- `Seguir viendo la demo`

### Step 3 - CTA final
Texto ejemplo:

> Suficiente. Ve a Instagram. Luego crea tu cuenta.

Acciones:
- `Ir a Instagram`
- `Probar la app`

## Flujo canonico de `login`

`login` no usa la misma profundidad A / B que `demo`, porque convive con el modal de registro.

Se divide en dos capas:

### Capa 1 - modal de prueba
Responsable de:
- capturar nombre;
- capturar mascota;
- capturar correo;
- iniciar la experiencia de prueba.

### Capa 2 - dialogo del gato
Responsable de:
- reforzar tono;
- dar bienvenida;
- guiar la demo;
- mostrar CTA narrativo;
- cerrar con referencia a Instagram cuando corresponda.

Estados recomendados:
- `login_step_0`: apertura del modo prueba.
- `login_step_1`: saludo del gato.
- `login_step_2`: recordatorio de Instagram o CTA.

## Flujo canonico de `inicio`

`inicio` puede usar una version mas corta de la maquina de estados.

Estados recomendados:
- `inicio_step_0`: bienvenida;
- `inicio_step_1`: resumen de estado;
- `inicio_step_2`: accion rapida hacia la vista operativa.

## Mapa de transiciones

| Estado | Texto | Acciones | Siguiente |
| --- | --- | --- | --- |
| `step 0` | apertura | 1 accion principal | `step 1` |
| `step 1` | pregunta | A / B | `step 2` |
| `step 2` | respuesta condicionada | CTA | `step 3` |
| `step 3` | cierre | salida | fin |

## Reglas de implementacion

1. El texto nunca debe alterar la geometria del cuadro.
2. Las acciones viven en `trial-rpg-actions`.
3. El mismo componente debe servir para `login`, `demo` e `inicio`.
4. La maquina de estados debe ser predecible.
5. La UI no debe depender de texto libre del usuario.
6. Si luego llega IA real, la IA solo reemplaza la fuente del texto, no la caja.

## Preparacion para IA futura

Cuando el chatbot se conecte a Hugging Face:
- `step 0` puede seguir siendo fijo;
- `step 1+` puede provenir de un backend;
- el historial y la eleccion del usuario pueden influir en la respuesta;
- la UI permanece igual.

## Entregable esperado

Al implementar esta maquina de estados, Kittypau tendra:
- un dialogo guiado y consistente;
- respuestas controladas por estado;
- una base real para IA futura;
- cero riesgo de romper el layout.



