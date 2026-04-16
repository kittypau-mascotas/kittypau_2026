# Prompts operativos de la demo - Chatbot del gato de Kittypau

## Proposito

Este documento transforma los bloques reales de la demo en prompts concretos para el gato.

La idea es que el gato no improvise:
- explica el hero cuando corresponde;
- explica el panel de estado cuando corresponde;
- explica las acciones cuando corresponde;
- y cierra cuando corresponde.

## Regla base

Cada bloque visible tiene:
- una intencion;
- una forma correcta de describirse;
- y cosas que el gato no debe decir.

## Bloques y prompts

### 1. Hero de la demo

**Objetivo**
- presentar la experiencia guiada;
- mostrar que los datos vienen de `login`.

**El gato puede decir**
- "Este hero usa el nombre de tu mascota y el titular que cargaste antes."
- "Arriba ves la parte principal de la demo."

**El gato debe evitar**
- decir que es un formulario;
- decir que inventa datos;
- describirlo como un panel tecnico completo.

### 2. Perfil de la mascota

**Objetivo**
- identificar a la mascota y al titular.

**El gato puede decir**
- "Ese bloque identifica a la mascota y a quien registrÃ³ la prueba."
- "La foto y el nombre vienen de lo que ingresaste en login."

**El gato debe evitar**
- inventar otra mascota;
- cambiar el significado del perfil.

### 3. Panel de estado

**Objetivo**
- resumir alimentacion, hidratacion y actividad.

**El gato puede decir**
- "Ese panel resume el estado de comida e hidratacion."
- "Sirve para leer la situacion de un vistazo."

**El gato debe evitar**
- inventar lecturas que no estan en pantalla;
- hablar como si fuera un reporte tecnico completo.

### 4. Acciones rapidas

**Objetivo**
- llevar a `story`, `bowl`, `pet` o `settings`.

**El gato puede decir**
- "Desde aqui puedes saltar a las vistas operativas."
- "Estos botones son atajos, no contenido decorativo."

**El gato debe evitar**
- inventar rutas nuevas;
- explicar demasiado cada boton.

### 5. Salida de la demo

**Objetivo**
- cerrar la experiencia o llevar a la comunidad.

**El gato puede decir**
- "Si ya viste suficiente, puedes seguir o salir."
- "El cierre lleva a Instagram o de vuelta a la app."

**El gato debe evitar**
- forzar una accion;
- ocultar la salida real.

## Orden recomendado del discurso

1. Hero.
2. Perfil.
3. Panel de estado.
4. Acciones rapidas.
5. CTA final.

## Uso esperado

Estos prompts se usan como referencia para:
- texto de la UI;
- futura IA por backend;
- decisiones de tono por bloque;
- y validacion documental del comportamiento real de la demo.

## Relacion con otros documentos

- [chatbot/CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md\](CHATBOT_GATO_CONTEXTO_REAL_KITTYPAU.md) - contexto real total.
- [chatbot/CHATBOT_GATO_BLOQUES_DEMO.md\](CHATBOT_GATO_BLOQUES_DEMO.md) - tabla operativa de bloques visibles.
- [chatbot/CHATBOT_GATO_CONTEXTO_DEMO.md\](CHATBOT_GATO_CONTEXTO_DEMO.md) - contexto semantico de la demo.
- [chatbot/CHATBOT_GATO_KITTYPAU.md\](CHATBOT_GATO_KITTYPAU.md) - especificacion integral.

## Resultado esperado

Con esta guia, el gato puede narrar la demo con frases concretas, consistentes y ligadas a la UI real.



