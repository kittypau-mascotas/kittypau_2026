# CLI de orquestacion: chatbot del gato de Kittypau con Hugging Face + Supabase + Vercel

## Objetivo
Documentar como encajan las CLI del proyecto cuando el chatbot del dialogo del gato de Kittypau usa:
- Supabase para backend, datos y Edge Functions.
- Vercel para frontend, deploy y observabilidad.
- Hugging Face para consumo de modelos por HTTP desde el backend.

La idea clave es esta:
- las CLI administran e implantan;
- la inferencia real se hace por API HTTP desde una funcion backend;
- no existe una CLI unica que haga todo el flujo de produccion de forma magica.

En este proyecto, el caso de uso es concreto:
- el chatbot vive dentro del dialogo del gato;
- el gato puede responder con personalidad, contexto y reglas propias;
- el frontend solo muestra texto y control de UI;
- el backend decide la respuesta final.

## Roles de cada herramienta

### Supabase CLI
Sirve para:
- crear y desplegar Edge Functions;
- gestionar migraciones y esquema;
- enlazar el proyecto local con Supabase;
- probar y versionar cambios de backend.

### Vercel CLI
Sirve para:
- enlazar el repo con el proyecto de Vercel;
- desplegar preview y production;
- revisar logs;
- gestionar variables de entorno del frontend/backend web.

### Hugging Face CLI (`hf`)
Sirve para:
- autenticar una cuenta;
- listar y gestionar modelos del Hub;
- descargar artefactos o pesos locales;
- administrar repositorios y recursos del Hub.

Importante:
- el CLI de Hugging Face es util para gestion y desarrollo;
- la inferencia de produccion se realiza por HTTP contra la Inference API o un endpoint compatible.

## Arquitectura recomendada

### Flujo general
1. El usuario abre el dialogo del gato en la app web.
2. La UI envia el mensaje o contexto a una Edge Function de Supabase o a un endpoint backend en Vercel.
3. El backend arma el prompt del gato, aplica reglas de seguridad y llama a Hugging Face por HTTP.
4. El modelo responde.
5. El backend normaliza la respuesta y la devuelve al componente del gato.

### Donde vive cada responsabilidad
- Frontend: Vercel.
- Autenticacion, datos y funciones ligeras: Supabase.
- Llamada al modelo: backend solamente.
- Secretos: variables de entorno, nunca en el cliente.

## Configuracion local

### 1) Instalar CLI
Usar el mecanismo oficial de cada herramienta en tu entorno.

Comandos de referencia:
```powershell
npx supabase --version
npx vercel --version
hf --version
```

### 2) Login
```powershell
npx supabase login
npx vercel login
hf auth login
```

### 3) Enlazar proyectos
Supabase:
```powershell
npx supabase link --project-ref <PROJECT_REF>
```

Vercel:
```powershell
npx vercel link --yes
```

## Variables de entorno

### En Vercel
Variables tipicas:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` solo si el backend realmente lo necesita
- `HUGGING_FACE_ACCESS_TOKEN`
- `HF_MODEL_ID`

### En Supabase Edge Functions
Variables tipicas:
- `HUGGING_FACE_ACCESS_TOKEN`
- `HF_MODEL_ID`
- cualquier secreto del bot o del enrutamiento interno

Reglas:
- no exponer el token de Hugging Face al frontend;
- no meter secretos en el repo;
- usar `.env.local` solo en desarrollo.

## Flujo de desarrollo recomendado

### Opcion A: Supabase Edge Function como backend de chat
1. Crear la funcion con Supabase CLI.
2. Configurar el token de Hugging Face en variables seguras.
3. Llamar a la Inference API desde la funcion.
4. Consumir esa funcion desde el dialogo del gato en la app web.

### Opcion B: Backend en Vercel
1. Crear un endpoint server-side en Next.js.
2. Desplegar con Vercel CLI.
3. Hacer la llamada a Hugging Face desde el servidor.
4. Devolver la respuesta al componente del gato.

## Ejemplo minimo de funcion backend

Ejemplo conceptual con `fetch` hacia la Inference API:

```ts
const model = Deno.env.get("HF_MODEL_ID") ?? "mistralai/Mistral-7B-Instruct-v0.2";
const token = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");

if (!token) {
  return new Response(JSON.stringify({ error: "Missing HF token" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    inputs: "Hola",
    parameters: {
      max_new_tokens: 120,
      temperature: 0.7,
    },
  }),
});
```

## Prompt y personalidad

La personalidad del gato no se define en la CLI, sino en el prompt del backend.

Buenas practicas:
- definir un system prompt fuerte y estable;
- separar personalidad, contexto y restricciones;
- mantener respuestas consistentes;
- registrar version del prompt si cambia.

### Ejemplo de personalidad
- gato sarcastico, curioso y algo gruñon;
- responde corto cuando el usuario pide ayuda rapida;
- acompaña el flujo de onboarding o demo;
- no rompe el tono del producto.

## Seguridad

### Reglas
- Nunca mandar el token de Hugging Face al cliente.
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en el frontend.
- Hacer que el backend valide autenticacion y permisos.
- Registrar errores, pero sin volcar secretos en logs.

### Recomendacion
Si el bot va a producir datos importantes:
- limitar longitud de entrada;
- filtrar contexto sensible;
- guardar trazabilidad de request y respuesta;
- mantener una ruta de fallback cuando el modelo falle.

## Comandos utiles

### Supabase
```powershell
npx supabase functions new chat
npx supabase functions deploy chat --no-verify-jwt
npx supabase db push
```

### Vercel
```powershell
npx vercel
npx vercel --prod
npx vercel logs --since 30m
```

### Hugging Face
```powershell
hf auth login
hf models ls
hf models info <model_id>
hf download <repo_id>
```

## Que no es esta arquitectura
- No es un CLI unico que lo haga todo.
- No es inferencia directa desde la terminal en produccion.
- No es seguro dejar el token del modelo visible en el frontend.

## Recomendacion para Kittypau
Para este proyecto, la combinacion mas ordenada es:
- Supabase CLI para funciones y datos;
- Vercel CLI para la app web;
- Hugging Face API para inferencia;
- prompt versionado dentro del backend.

## Siguiente paso sugerido
Crear una `Edge Function` o un `route handler` dedicado para el dialogo del gato, con:
- prompt base;
- lectura de contexto desde Supabase;
- llamada a Hugging Face;
- respuesta estructurada para la UI.
