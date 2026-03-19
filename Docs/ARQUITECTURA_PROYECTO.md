# Arquitectura del Proyecto Kittypau (MVP $0)

## Objetivo
Tener un MVP funcional donde el usuario:
1. Se registra e inicia sesión.
2. Agrega una mascota.
3. Registra un dispositivo (plato comida/agua).
4. Ve datos en vivo desde la app web.

---

## Componentes
1. **Frontend + API**: Next.js (App Router) en Vercel.
2. **DB/Auth/Realtime**: Supabase.
3. **MQTT**: HiveMQ Cloud.
4. **Bridge 24/7**: Raspberry Pi Zero 2 W (MQTT -> API).
   - El código fuente vive en el repo (`/bridge`).
   - El runtime real está fuera del repo (Raspberry).

---

## Registro en pop-up (UX global)
- El flujo de registro ocurre en un pop-up (web y movil).
- Barra de progreso con 3 hitos: Usuario -> Mascota -> Dispositivo.
- El progreso se guarda si el usuario cierra.

## Diagrama de alto nivel
```
ESP32 -> HiveMQ -> Raspberry Bridge -> /api/mqtt/webhook -> Supabase (DB)
                                                    \-> Realtime -> App Web
```

---

## Regla de conexion (importante)
- **La app web NO se conecta a HiveMQ**.
- **La Raspberry (bridge) SI se conecta a HiveMQ** y reenvía a Vercel.
- **La app web solo consume Supabase** (Auth + DB + Realtime).

Esto evita exponer credenciales MQTT en frontend y mantiene el flujo seguro.

---

## Flujo de datos (telemetría)
1. ESP32 publica MQTT en HiveMQ.
2. Raspberry Bridge escucha MQTT y reenvía a Vercel.
3. API valida el token y guarda lectura en Supabase.
4. Supabase Realtime actualiza el dashboard.

### Transformaciones analíticas (recomendado)
- En ingestión server-side (después de validar y antes de persistir): aplicar `log10(x + 1)` a variables skewed (ej. `weight_grams`, `water_ml`, intervalos).
- Guardar ambos: raw + transformado (ej. `weight_grams` y `weight_grams_log`).
- Fourier/FFT **no va** en el bridge/webhook: va en un worker/servicio analítico (batch o microservicio).

Referencia: `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`

## Registro de dispositivo (paso esencial)
- El usuario escanea el QR en la parte inferior del plato.
- El QR entrega el `device_id`.
- El dispositivo se asocia a una mascota para activar envio de datos.

---

## Diagramas detallados
### Local (desarrollo)
```
ESP32 (LAN) -> HiveMQ Cloud
                 |
          Webhook -> http://localhost:3000/api/mqtt/webhook
                 |
             Supabase (DB + Realtime)
                 |
             App Web (localhost:3000)
```

### Produccion (Vercel)
```
ESP32 -> HiveMQ Cloud
           |
     https://tu-app.vercel.app/api/mqtt/webhook
           |
       Supabase (DB + Realtime)
           |
       App Web (Vercel)
```

---

## Estructura del repositorio
```
/Docs
/kittypau_app
  /src
    /app
      /(app)
        /layout.tsx          ? wrappea con AppDataProvider
        /_components
          /app-nav.tsx       ? consume useAppData(), sin fetches propios
        /today /bowl /pet /story /settings
      /api
        /profiles /pets /devices /account /readings
                             ? runtime="edge" + Cache-Control en GETs
    /lib
      /auth                  ? token.ts, auth-fetch.ts
      /charts
        /index.tsx           ? ChartJS.register + buildSeries<T> + ChartCard (shared)
      /context
        /app-context.tsx     ? AppDataProvider + useAppData()
      /supabase              ? browser.ts, server.ts
      /ui
    /components
  /scripts
  /public
    /illustrations           ? pink_food_full.png, green_water_full.png, etc.
    /audio                   ? sonido_marca.mp3, comer_*.mp3
```

---

## Decisiones tecnicas (tradeoffs)
1. **Next.js + API Routes**:
   - Pros: un solo deploy, costo $0, menos infraestructura.
   - Contras: serverless con limites de ejecucion y cold starts.

2. **Supabase Realtime**:
   - Pros: streaming listo sin infra propia.
   - Contras: dependes del servicio; hay limites en free tier.

3. **HiveMQ Webhook**:
   - Pros: sencillo, compatible con serverless.
   - Contras: depende de endpoint publico y token seguro.

4. **Edge Runtime en APIs clave** (`runtime = "edge"`):
   - Cold start ~0ms vs ~250ms Node.js en Vercel Hobby.
   - Compatible con `@supabase/supabase-js` (fetch nativo). No usar APIs Node.js exclusivas.
   - Aplicado a: profiles, pets, devices, account/type.

5. **AppDataContext** (`src/lib/context/app-context.tsx`):
   - Fetcha profiles/pets/devices/account **una vez** al montar `(app)/layout`.
   - `app-nav` y otras vistas consumen `useAppData()` sin hacer sus propias peticiones.
   - Cache-Control en los endpoints deduplica fetches durante navegacion del mismo TTL.

6. **Libreria de graficos compartida** (`src/lib/charts/index.tsx`):
   - `ChartJS.register(...)` ejecutado una vez; evita registros duplicados entre paginas.
   - `buildSeries<T>` acepta callback para transformaciones flexibles (e.g. peso neto).
   - `ChartCard` parametrizable: accent, unit, canvasClassName, integerDisplay.

7. **next/image**:
   - Todas las imagenes usan `<Image>` de `next/image` (lazy, WebP/AVIF, CLS zero).
   - Imagenes remotas Supabase habilitadas via `remotePatterns` en `next.config.ts`.

---

## Endpoints y contratos (MVP)
### 1) `POST /api/mqtt/webhook`
**Headers**
- `x-webhook-token: <secret>`

**Body (ejemplo)**
```json
{
  "device_id": "KPCL0001",
  "temperature": 23.5,
  "humidity": 65,
  "weight_grams": 3500,
  "battery_level": 85,
  "timestamp": "2026-02-03T18:30:00Z"
}
```
**Notas**
- La API acepta `device_id` (KPCL) o `deviceId` (camelCase) y opcional `device_uuid` (UUID).
- El `device_id` es el código humano (KPCLxxxx) y se busca en `devices`.

**Response**
```json
{ "success": true }
```

---

### 2) `GET /api/pets`
**Response**
```json
[
  { "id": "uuid", "name": "Michi", "type": "cat" }
]
```

### 3) `POST /api/pets`
**Body**
```json
{ "name": "Michi", "type": "cat", "origin": "rescatado" }
```
**Response**
```json
{ "id": "uuid" }
```

---

### 4) `GET /api/devices`
**Response**
```json
[
  { "id": "uuid", "device_id": "KPCL0001", "device_type": "food_bowl" }
]
```

### 5) `POST /api/devices`
**Body**
```json
{
  "device_id": "KPCL0001",
  "device_type": "food_bowl",
  "pet_id": "uuid"
}
```
**Response**
```json
{ "id": "uuid" }
```

---

### 6) `GET /api/readings?device_uuid=uuid` (uuid = devices.id)
**Response**
```json
[
  {
    "device_uuid": "uuid",
    "device_id": "KPCL0001",
    "weight_grams": 3500,
    "battery_level": 85,
    "recorded_at": "2026-02-03T18:30:00Z"
  }
]
```

---

## Seguridad
- Webhook protegido por `x-webhook-token`.
- RLS en Supabase para limitar datos por usuario.
- Service role solo en el backend (API routes).

---

## Deploy (Vercel)
El deploy incluye:
1. Frontend web.
2. API routes (webhook + CRUD).
3. Backend ligero serverless.

---

## Estado actual (hasta 2026-02-03)
- Next.js creado en `kittypau_app/` con TypeScript y App Router.
- Endpoint webhook creado en `src/app/api/mqtt/webhook/route.ts`.
- Cliente Supabase server creado en `src/lib/supabase/server.ts`.
- Script de prueba creado en `scripts/test-webhook.ps1`.
- `.env.local` creado en `kittypau_app/`.
- Webhook local probado con exito (respuesta `success: true`).

---

## Pendientes inmediatos
- Crear y poblar `pets` y `devices` desde la app.
- Crear UI base (login, mascotas, dispositivos, dashboard).
- Configurar deploy en Vercel.
- Configurar webhook en HiveMQ con URL publica.
- Verificar Realtime en dashboard.






## Marco AIoT / PetTech (Alineacion 2026)

### Terminologia oficial recomendada
- **AIoT (Artificial Intelligence of Things)**: termino principal para Kittypau.
- **Intelligent IoT**: variante de comunicacion comercial.
- **Edge AI + IoT**: cuando parte del analisis corre en dispositivo.
- **Smart IoT**: termino marketing, menos tecnico.

### Definicion recomendada de producto
**Kittypau is an AIoT platform that monitors pet feeding and hydration cycles to generate health insights and preventive alerts.**

### Categoria estrategica
**PetTech AIoT** = PetTech + IoT + IA.

Esto posiciona a Kittypau no como "solo hardware", sino como:
- infraestructura de datos longitudinales de salud animal,
- analitica preventiva,
- plataforma escalable con suscripcion.

### Arquitectura actual (ya compatible con AIoT)
1. Dispositivo IoT (ESP8266/ESP32).
2. Ingestion por MQTT.
3. Bridge Node.js.
4. Persistencia en PostgreSQL/Supabase.
5. Capa de analitica/IA.
6. Dashboard web para usuario/admin.

### Estrategia tipo "Fitbit de mascotas"
- Hardware = punto de entrada.
- Datos longitudinales = ventaja competitiva.
- IA = diferencial de valor.
- Suscripcion = recurrencia (modelo SaaS).

### Casos de uso preventivos (objetivo)
- Riesgo de deshidratacion por baja de consumo de agua en ventana corta.
- Cambios de conducta alimentaria (horario/frecuencia/cantidad).
- Riesgo de sobrepeso por patrones de ingesta sostenidos.

### Modelo de negocio recomendado (3 capas)
1. **Hardware**: ingreso inicial por unidad.
2. **Suscripcion**: dashboard avanzado, recomendaciones y alertas.
3. **Data insights (futuro)**: datos anonimizados para partners (veterinarias, investigacion, marcas).
## Contexto de Expansion del Ecosistema (Fuente: Docs/contexto.md)
- **Foco actual (core)**: `Kittypau` se mantiene como plataforma PetTech AIoT para alimentacion e hidratacion de mascotas.
- **Expansion en evaluacion**: `Kitty Plant` (IoT para plantas) como segunda vertical, reutilizando arquitectura y modelo de datos.
- **Vision de largo plazo**: `Senior Kitty` como posible tercera vertical para cuidados en hogar.
- **Estrategia transversal**: hardware como entrada + datos longitudinales + analitica para insights preventivos.
- **Producto y UX**: interfaz simple, menos friccion en onboarding y vista demo para explicar valor rapido.
- **Gobernanza tecnica**: conservar una base relacional coherente y contratos API estables entre web, app y dispositivos.

### Implicancias para App/Web (Kittypau)
1. `/today` y `navbar` deben mantener consistencia estricta entre mascota activa, `pet_id` y KPCL asociado.
2. Las decisiones visuales deben reforzar lectura rapida de estado real (alimentacion, hidratacion, ambiente, bateria).
3. El backlog funcional prioriza confiabilidad de datos por sobre efectos visuales.
4. Cualquier expansion de vertical (plantas/senior) debe montarse sobre componentes reutilizables del core.
