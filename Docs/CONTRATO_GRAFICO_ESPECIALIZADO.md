# Contrato para Grafico Especializado (Front + Back)

## Objetivo
Definir un contrato estable para construir un grafico especializado en otro proyecto y luego integrarlo en KittyPau sin cambios de backend.

## Arquitectura actual
- Frontend: Next.js App Router (`kittypau_app`).
- Backend: API Routes en Next.js (`/api/*`).
- DB/Auth/Realtime: Supabase.
- Ingestion IoT: HiveMQ -> Bridge -> `POST /api/mqtt/webhook`.
- Lectura UI: `GET /api/readings` + Realtime sobre tabla `public.readings`.

## Librerias de graficos (actual vs anterior)
- Actual (`/bowl`):
- `chart.js`
- `react-chartjs-2`
- Anterior a `Chart.js` (implementacion interna):
- sin libreria externa de chart
- render SVG manual en React (`polyline`, `line`, `text`, `circle`)
- animaciones CSS propias en `globals.css` (clases `chart-*`)

## Paleta de colores de series
Colores activos en `bowl`:
- Peso: `#EBB7AA` (color principal Kittypau)
- Temperatura: `#D99686` (variacion oscura del principal)
- Luz entorno: `hsl(44 90% 52%)` (amarillo lectura de luz)
- Humedad: `hsl(198 70% 45%)` (azul humedad)

Notas:
- Peso y temperatura deben mantenerse en la paleta Kittypau.
- Si se crea grafico externo, exponer color por prop y respetar estos defaults.

## Endpoints de datos para graficos

### 1) GET `/api/readings`
Uso: serie temporal para graficos.

Query params:
- `device_id` (UUID de `devices.id`) requerido en frontend actual.
- `limit` opcional (default backend; UI usa 30 o 200 segun vista).
- `cursor` opcional si se usa paginacion.

Headers:
- `Authorization: Bearer <access_token>`

Respuesta esperada:
- Lista directa `ApiReading[]` o envoltorio `{ data: ApiReading[], next_cursor?: string }`.

`ApiReading` actual (front):
```ts
type ApiReading = {
  id: string;
  device_id: string; // UUID devices.id
  recorded_at: string | null; // ISO
  weight_grams: number | null;
  temperature: number | null;
  humidity: number | null;
  light_percent: number | null;
};
```

Notas:
- La UI ya tolera ambos formatos de respuesta (array o `{data}`).
- Ventana de graficos live en `bowl`: ultimos 5 minutos.

### 2) Realtime (Supabase)
Uso: streaming en vivo para actualizar grafico sin recargar.

Canal en `bowl`:
- tabla: `public.readings`
- evento: `INSERT`
- filtro: `device_id=eq.<UUID>`

Comportamiento:
- cada insercion nueva se prepend a estado local
- deduplicacion por `reading.id`
- polling fallback cada 8s

### 3) POST `/api/mqtt/webhook`
Uso: ingestion desde bridge (no lo consume el grafico directamente).

Campos relevantes de payload:
- `device_id` (KPCL)
- metricas (`weight_grams`, `temperature`, `humidity`, `battery_level`, etc.)
- `timestamp`

Resultado:
- inserta en pipeline de lecturas que termina reflejandose en `public.readings`

## Endpoints de contexto (selector de serie)

### GET `/api/devices`
Uso: obtener dispositivos del usuario para seleccionar `device_id` (UUID).

Campos usados por UI:
```ts
type ApiDevice = {
  id: string;          // UUID (usar este para /api/readings)
  device_id: string;   // KPCL visual
  pet_id: string;
  device_type: string;
  status: string;
  device_state: string | null;
  battery_level: number | null;
  last_seen: string | null;
};
```

### GET `/api/pets`
Uso: metadata para etiquetas de grafico (nombre mascota, etc.).

## Sistema Frontend donde se integra el grafico

Archivo actual de referencia:
- `kittypau_app/src/app/(app)/bowl/page.tsx`

Responsabilidades actuales en `bowl`:
1. Cargar device activo (`/api/devices`).
2. Cargar historial (`/api/readings`).
3. Suscribirse a Realtime (`public.readings`).
4. Renderizar 4 series: peso, temperatura, luz, humedad.

## Requisitos para componente externo (importable)

El componente externo debe aceptar props simples y no conocer Supabase:
```ts
export type LivePoint = { x: string; y: number };

export type LiveChartProps = {
  title: string;
  unit: string;
  points: LivePoint[]; // orden cronologico ascendente
  color: string;
  xLabel?: string; // default: "Ultimos 5 minutos"
  yLabel?: string; // default: unit
  minY?: number;
  maxY?: number;
};
```

Contrato de integracion:
- Entrada `points` ya limpia (sin nulls) desde app contenedora.
- Sin fetch interno.
- Sin auth interna.
- Sin dependencia de rutas de proyecto.
- Render responsive (desktop y mobile).

## Normalizacion recomendada antes de pasar al grafico

En contenedor (KittyPau):
1. filtrar nulos
2. parsear timestamp valido
3. ordenar ascendente por tiempo
4. limitar a N puntos (ej. 30)

Ejemplo:
```ts
const points = readings
  .filter((r) => r.recorded_at && typeof r.temperature === "number")
  .map((r) => ({ x: r.recorded_at as string, y: r.temperature as number }))
  .sort((a, b) => +new Date(a.x) - +new Date(b.x))
  .slice(-30);
```

## Variables de entorno implicadas
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Seguridad / Auth
- Todo endpoint de lectura para UI requiere `Bearer token`.
- Realtime usa token de sesion para `supabase.realtime.setAuth(token)`.
- El componente grafico externo no debe manejar tokens.

## Uso desde otro proyecto local (datos reales)
Si, puedes conectarte desde otro proyecto local para probar el grafico con datos reales.

Modalidad recomendada:
1. Autenticar usuario real en Supabase (`email/password`).
2. Usar token de sesion (`access_token`).
3. Consumir `GET /api/devices` y `GET /api/readings` de este proyecto (Vercel o local).
4. Suscribirte a Realtime en `public.readings` filtrando `device_id` UUID.

Alternativa directa a Supabase:
1. Configurar en el proyecto local:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Login con Supabase Auth para obtener sesion del usuario.
3. Consultar tabla `public.readings` bajo RLS del usuario autenticado.
4. Suscripcion Realtime con el mismo token.

Reglas de seguridad:
- No usar `SUPABASE_SERVICE_ROLE_KEY` en frontend/local client.
- `SERVICE_ROLE` solo en backend/server scripts.
- Si el proyecto local es frontend puro, usar siempre `ANON_KEY + sesion de usuario`.

Snippet base (cliente local):
```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const { data: authData } = await supabase.auth.signInWithPassword({
  email: "<tu-email>",
  password: "<tu-password>",
});

const user = authData.user;
if (!user) throw new Error("No auth");

const { data: readings } = await supabase
  .from("readings")
  .select("id,device_id,recorded_at,weight_grams,temperature,humidity,light_percent")
  .eq("device_id", "<DEVICE_UUID>")
  .order("recorded_at", { ascending: false })
  .limit(60);
```

## Checklist para proyecto externo
1. Implementar componente puro por props (`LiveChartProps`).
2. Entregar build importable (ideal: paquete React o modulo TSX).
3. Validar rendering con 0, 1, N puntos.
4. Validar ejes y labels largos en mobile.
5. Probar transicion de nuevos puntos cada 1-3s.
6. Sin dependencias a `window` en SSR.

## Checklist de importacion en KittyPau
1. Reemplazar render interno de chart en `bowl` por componente importado.
2. Mantener fetch/realtime locales en `bowl`.
3. Mantener contrato de datos (`ApiReading` -> `LivePoint[]`).
4. Ejecutar build (`npm --prefix kittypau_app run build`).
5. Verificar `/bowl` en web y mobile.

## Criterio de aceptacion
- Grafico muestra datos reales en vivo (insert realtime).
- Sin cambios de endpoint backend.
- Sin regresiones en `/today`, `/story`, `/pet`.
- Build de Next.js en verde.
