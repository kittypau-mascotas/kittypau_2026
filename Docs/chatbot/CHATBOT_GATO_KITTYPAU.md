# Especificacion Integral - Chatbot del Gato de Kittypau

## 1. Proposito

Este documento define como funciona el chatbot del gato en Kittypau:

- su rol dentro de la experiencia;
- como se renderiza el dialogo;
- como se comporta en cada pagina;
- como se controla la conversacion;
- y como se conecta a una futura IA sin romper la UI.

Es la fuente de verdad para cualquier implementacion relacionada con el gato y el dialogo.

## 2. Principio central

Kittypau no tiene varios bots.

Tiene un solo gato conversacional que:

- cambia el texto segun la pagina;
- mantiene la misma UI;
- mantiene la misma personalidad;
- usa el mismo componente;
- y conduce al usuario mediante conversacion guiada.

## 3. Donde vive el gato

### Paginas
- `src/app/(public)/login/page.tsx`
- `src/app/(public)/demo/page.tsx`
- `src/app/(app)/inicio/page.tsx`

Las paginas no definen el cuadro.
Solo deciden:

- cuando aparece;
- que mensaje mostrar;
- que opciones ofrecer;
- el estado del gato.

### Componente unico obligatorio
- `src/chatbot-gato/trial-rpg-dialog.tsx`

Es el unico contenedor permitido del gato y del texto.

### CSS geometrico compartido
- `src/app/globals.css`

Define:

- tamano fijo del cuadro;
- layout interno;
- posicion del gato;
- comportamiento responsive.

Regla: el texto nunca modifica la geometria.

### Dock de posicion compartido
- `src/chatbot-gato/trial-rpg-dialog-dock.tsx`

Este componente fija el cuadro en una unica escena reutilizable.
Las paginas no deben reconstruir ni reubicar el cuadro por su cuenta.
Solo le entregan contexto, contenido y estado.

## 4. Estructura fija del cuadro

### Jerarquia obligatoria
- `trial-rpg-controls`
- `trial-rpg-body`
- `trial-rpg-textpane`
- `trial-rpg-copy`
- `trial-rpg-line` -> texto visible
- `trial-rpg-actions` -> opciones A / B
- `trial-rpg-catpane`
- `trial-rpg-cat`

### Regla de caja
El cuadro tiene una forma fija.
El texto entra dentro de esa forma.

No se permiten variaciones de alto por contenido.
No se permite crear otro cuadro distinto para la misma experiencia.

## 5. Personalidad del gato

El gato siempre habla con:

- sarcasmo suave;
- humor felino;
- leve mal humor;
- claridad cuando guia;
- brevedad.

Esto no cambia entre paginas.

## 6. Tipo de chatbot que usa KittyPau

No es chat libre.

Es un chat guiado por estado.

El usuario no escribe texto.
El usuario elige opciones A / B.

El gato responde segun esa eleccion.

Esto produce:

- sensacion de conversacion;
- control total del flujo;
- cero necesidad de IA al inicio;
- experiencia muy pulida.

## 7. Mecanica clave: opciones A / B

El slot `trial-rpg-actions` se usa para renderizar botones.

Ejemplo visual:

- `[ Perro ]`
- `[ Gato ]`

El usuario elige.
La eleccion cambia el estado del dialogo.

## 8. Implementacion tecnica: state machine

En cada pagina:

```tsx
const [step, setStep] = useState(0);
const [choice, setChoice] = useState<string | null>(null);
```

### Ejemplo real en demo

#### Step 0 - mensaje inicial automatico

Texto:

> Oh... otro humano curioso. Intenta no romper nada.

Acciones:

- `Aceptar con dignidad`

#### Step 1 - pregunta A / B

Texto:

> Dime. ?Tienes perro o gato?

Acciones:

- `Perro`
- `Gato`

#### Step 2 - respuesta segun eleccion

```tsx
if (choice === "perro") {
  texto = "Perro... ruidosos, pero aceptables. Mira esto en la demo.";
}

if (choice === "gato") {
  texto = "Gato. Excelente. Claramente sabes lo que haces.";
}
```

Acciones:

- `Seguir viendo la demo`

#### Step 3 - CTA final

Texto:

> Suficiente. Ve a Instagram. Luego crea tu cuenta.

Acciones:

- `Ir a Instagram`
- `Probar la app`

## 9. Codigo base del flujo

```tsx
function DemoDialog() {
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);

  function renderContent() {
    if (step === 0) {
      return {
        text: "Oh... otro humano curioso. Intenta no romper nada.",
        actions: [
          { label: "Aceptar con dignidad", next: 1 },
        ],
      };
    }

    if (step === 1) {
      return {
        text: "Dime. ?Tienes perro o gato?",
        actions: [
          { label: "Perro", next: 2, value: "perro" },
          { label: "Gato", next: 2, value: "gato" },
        ],
      };
    }

    if (step === 2) {
      const text =
        choice === "perro"
          ? "Perro... ruidosos, pero aceptables."
          : "Gato. Excelente decision.";

      return {
        text,
        actions: [
          { label: "Seguir", next: 3 },
        ],
      };
    }

    if (step === 3) {
      return {
        text: "Ve a Instagram y luego prueba la app.",
        actions: [],
      };
    }
  }
}
```

## 10. Comportamiento por pagina

| Pagina | Tipo de conversacion |
| --- | --- |
| `login` | onboarding ligero |
| `demo` | conversacion guiada A / B obligatoria |
| `inicio` | orientacion rapida |

### Login
Puede abrir automaticamente.
La musica activa mientras el dialogo vive.
El texto aparece typed.
El gato puede dormir o despertar.
La geometria permanece estable.

#### Aparicion actual en login
Cuando el flujo de prueba se abre en login, hoy la experiencia visible sigue esta secuencia:

1. `Modo prueba`
2. `Personaliza tu demo`
3. `Te mostraremos Kittypau con tus datos para una sesion de prueba.`
4. Boton `Cerrar`
5. Campos:
   - `Tu nombre`
   - `Nombre de tu mascota`
   - `Correo`
6. Acciones:
   - `Cancelar`
   - `Entrar a prueba`
7. Dialogo del gato:
   - `Ah... perfecto, humanos. Justo lo que necesita`
   - `Siguenos en Instagram`

Esta secuencia deja claro que en login conviven dos capas:

- el modal de prueba para capturar datos;
- el dialogo del gato como experiencia narrativa.

### Demo
El dialogo debe abrir incluso si el usuario entra directo.
No depende de navegacion previa.
Mantiene exactamente la misma UI.

### Inicio
Bienvenida.
Orientacion.
Acciones rapidas.
Mismo componente, mismas reglas.

## 11. Flujo de interaccion estandar

1. La pagina activa el dialogo.
2. El texto se renderiza en `trial-rpg-line`.
3. Se activan audios si corresponde.
4. El gato cambia de estado visual.
5. El usuario puede cerrar sin afectar el layout general.

## 12. Preparacion para IA futura

La UI ya esta disenada para que el texto pueda venir desde un backend IA sin cambios visuales.

### Integracion futura
- `step 0` sigue siendo fijo.
- `step 1+` puede llamar a `/api/chat`.
- el modelo recibe el historial y la eleccion del usuario.

La UI no cambia.
Solo cambia la fuente del texto.

### Objetivo
El cuadro actua como interfaz estable:

- hoy puede usar estado guiado;
- luego puede usar Hugging Face;
- siempre conserva la misma caja, tono y estructura.

## 13. Regla estricta de implementacion

Si un cambio afecta al gato o al dialogo:

1. Primero se modifica `src/chatbot-gato/trial-rpg-dialog.tsx`.
2. Luego `globals.css`.
3. Finalmente la pagina que lo usa.

### Prohibido
- crear otro cuadro distinto;
- cambiar la altura por texto;
- permitir texto libre del usuario en esta capa;
- duplicar el componente.

## 14. Resultado UX

El usuario siente que:

- el gato le habla;
- el gato reacciona a lo que elige;
- el gato guia el recorrido;
- la app tiene personalidad real.

Sin IA al inicio.
Sin costo extra.
Sin complejidad innecesaria.

Y listo para volverse inteligente cuando quieras.

## 15. Regla de alcance y separacion

Este chatbot del gato tiene dos alcances distintos y no deben mezclarse:

### Alcance visible para cliente
El gato que aparece en `login`, `demo` e `inicio` debe hablar solo de:

- el funcionamiento real de KittyPau para el usuario;
- lo que la mascota necesita;
- las soluciones y acciones que la app puede ofrecer;
- lo que se ve en la interfaz;
- la orientacion para avanzar dentro del flujo.

El gato de cliente no debe salir a explicar arquitectura interna, estrategia de producto, estructura administrativa o decisiones del proyecto completo.

### Alcance total del proyecto
La lectura completa del proyecto, incluyendo:

- administracion;
- estructura general;
- decisiones internas;
- roadmap amplio;
- y consultas globales sobre KittyPau;

queda reservada para el futuro chatbot o panel de `admin`.

La especificacion de ese alcance total vive en:

- [chatbot/CHATBOT_ADMIN_KITTYPAU.md](chatbot/CHATBOT_ADMIN_KITTYPAU.md)

### Regla operativa
Cuando el usuario este en la experiencia del gato visible:

- responde desde el rol de asistente de producto para mascotas;
- enfocate en problemas concretos del cliente;
- da soluciones y orientacion sobre la mascota y la app;
- no mezcles la vista cliente con la vista admin.

## 16. Documentos complementarios

- [COMPONENTE_GATO.md](COMPONENTE_GATO.md) - detalle visual y tecnico del SVG, estados y animaciones.
- [CLI_ORQUESTACION_HF_SUPABASE_VERCEL.md](CLI_ORQUESTACION_HF_SUPABASE_VERCEL.md) - backend IA y orquestacion con CLI.
- [chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md](chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md) - contexto real total del producto.
- [chatbot/CHATBOT_GATO_PERSONALIDAD_CANONICA.md](chatbot/CHATBOT_GATO_PERSONALIDAD_CANONICA.md) - personalidad canonica, ejemplos y reglas duras.
- [chatbot/CHATBOT_GATO_BLOQUES_DEMO.md](chatbot/CHATBOT_GATO_BLOQUES_DEMO.md) - bloques visuales reales de la demo.
- [chatbot/CHATBOT_GATO_PROMPTS_DEMO.md](chatbot/CHATBOT_GATO_PROMPTS_DEMO.md) - prompts concretos por bloque visual de la demo.
- [chatbot/CHATBOT_GATO_BLOQUES_INICIO.md](chatbot/CHATBOT_GATO_BLOQUES_INICIO.md) - bloques visuales reales de inicio.
- [chatbot/CHATBOT_GATO_PROMPTS_INICIO.md](chatbot/CHATBOT_GATO_PROMPTS_INICIO.md) - prompts concretos por bloque visual de inicio.
- [chatbot/CHATBOT_GATO_FLUJO_REAL_KITTYPAU.md](chatbot/CHATBOT_GATO_FLUJO_REAL_KITTYPAU.md) - flujo real y futuro del gato en la experiencia.
- [chatbot/CHATBOT_GATO_STATE_MACHINE.md](chatbot/CHATBOT_GATO_STATE_MACHINE.md) - maquina de estados del chatbot.
- [chatbot/CHATBOT_GATO_CONTEXTO_DEMO.md](chatbot/CHATBOT_GATO_CONTEXTO_DEMO.md) - contexto semantico de la demo.
- [chatbot/PLAN_CHATBOT_GATO_KITTYPAU.md](chatbot/PLAN_CHATBOT_GATO_KITTYPAU.md) - plan paso a paso para construir el chatbot.
- [POPUP_REGISTRO_SPEC.md](POPUP_REGISTRO_SPEC.md) - flujo del registro y su modal principal.



