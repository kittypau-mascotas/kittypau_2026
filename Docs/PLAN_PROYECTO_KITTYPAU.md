# Plan de Proyecto: Kittypau IoT (MVP $0)

## Objetivo MVP
Un usuario se registra, agrega una mascota, registra un dispositivo (plato inteligente de comida o de agua) y ve datos en vivo desde la app web (y base lista para movil).

## Estado actual del repo (2026-02-03)
- Next.js creado en `kittypau_app/` con TypeScript y App Router.
- Archivos anteriores movidos a `kittypau_app/legacy/`.
- `Docs/` se mantiene en la raiz para documentacion.
- Endpoint webhook y cliente Supabase ya existen.
- Prueba local del webhook exitosa.

## Arquitectura propuesta (costo $0)
1. **Frontend + API**: Next.js (Vercel Free)
2. **DB + Auth + Realtime**: Supabase Free
3. **MQTT**: HiveMQ Cloud Free
4. **Flujo**:
   - ESP32 -> HiveMQ (MQTT)
   - HiveMQ -> Webhook -> Next.js API
   - API guarda en Supabase
   - Frontend escucha Supabase Realtime

## Estructura del proyecto (propuesta)
```
/kittypau_app
|-- src/
|   |-- app/                  # Next.js App Router
|   |   |-- (public)/
|   |   |-- (protected)/
|   |   |-- api/
|   |   |   |-- mqtt/
|   |   |   |   `-- webhook/route.ts
|   |   |   |-- pets/route.ts
|   |   |   |-- devices/route.ts
|   |   |   `-- readings/route.ts
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   |-- lib/
|   |   |-- supabase/
|   |   |   |-- client.ts
|   |   |   `-- server.ts
|   |   `-- auth.ts
|   `-- styles/
`-- .env.local
```

## Modelo de datos (Supabase / PostgreSQL)
### Tablas principales
1. **profiles**
   - `id` (uuid, PK, = auth.user.id)
   - `full_name`
   - `phone`
   - `created_at`

2. **pets**
   - `id` (uuid, PK)
   - `owner_id` (uuid, FK -> profiles.id)
   - `name`
   - `species` (cat/dog/other)
   - `birth_date` (date, nullable)
   - `created_at`

3. **devices**
   - `id` (uuid, PK)
   - `owner_id` (uuid, FK -> profiles.id)
   - `pet_id` (uuid, FK -> pets.id, nullable)
   - `device_code` (string, unique, ej: KPCL0001)
   - `device_type` (enum: food_bowl | water_bowl)
   - `status` (active | inactive)
   - `battery_level` (int)
   - `last_seen` (timestamp)
   - `created_at`

4. **readings**
   - `id` (uuid, PK)
   - `device_id` (uuid, FK -> devices.id)
   - `pet_id` (uuid, FK -> pets.id, nullable)
   - `weight_grams` (int, nullable)  # comida
   - `water_ml` (int, nullable)      # agua
   - `temperature` (float, nullable)
   - `humidity` (float, nullable)
   - `battery_level` (int, nullable)
   - `recorded_at` (timestamp, default now())

### Reglas RLS (resumen)
- `profiles`: cada usuario solo ve su perfil.
- `pets`: `owner_id = auth.uid()`
- `devices`: `owner_id = auth.uid()`
- `readings`: se validan via join a devices/pets del usuario.

## API endpoints minimos (Next.js)
1. **POST `/api/mqtt/webhook`**
   - Recibe datos desde HiveMQ.
   - Valida `x-webhook-token`.
   - Inserta en `readings` y actualiza `devices.last_seen`.

2. **GET/POST `/api/pets`**
   - Lista mascotas del usuario.
   - Crea nueva mascota.

3. **GET/POST `/api/devices`**
   - Lista dispositivos.
   - Registra dispositivo (device_code, tipo, mascota opcional).

4. **GET `/api/readings?device_id=...`**
   - Devuelve lecturas recientes para graficos.

## Vistas del MVP
1. **Login/Registro**
2. **Onboarding**: completar perfil
3. **Mascotas**: crear y listar
4. **Dispositivos**: registrar con QR y asignar mascota
5. **Dashboard**: graficos + estado en vivo (Realtime)

## UX clave (registro)
- Registro en pop-up (web y movil).
- Barra de progreso con 3 hitos: Usuario -> Mascota -> Dispositivo.
- Progreso persistente si se cierra.

## Streaming en tiempo real
- Supabase Realtime sobre `readings`.
- Frontend se suscribe por `device_id` y actualiza graficos.
- Alternativa: polling cada X segundos (fallback si Realtime falla).

## Paso a paso (implementacion)
1. Crear proyecto Supabase y configurar Auth + DB.
2. Crear esquema SQL y RLS.
3. Inicializar Next.js (App Router).
4. Configurar cliente Supabase (server/client).
5. Crear endpoints `/api/*`.
6. Crear UI base y flujo de onboarding.
7. Integrar Realtime en Dashboard.
8. Configurar HiveMQ webhook -> `/api/mqtt/webhook`.
9. Deploy en Vercel con variables de entorno.

## Nota sobre el deploy
En este proyecto el deploy en **Vercel incluye frontend + API + backend ligero** (routes `/api/*`).
No existe un backend separado: la base de datos esta en Supabase.

## Variables de entorno (ejemplo)
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo server
MQTT_WEBHOOK_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Criterio de exito del MVP
- Usuario crea cuenta
- Registra mascota
- Registra dispositivo
- Recibe lecturas en vivo en la app

---

## Proximos pasos inmediatos
- Implementar login y registro en UI.
- Implementar CRUD de mascotas y dispositivos.
- Habilitar Realtime en dashboard.
- Deploy en Vercel y configurar webhook HiveMQ.

## Documento maestro de dominio
- Ver `Docs/DOC_MAESTRO_DOMINIO.md` antes de codificar.

## Notas de implementacion
- Ver `Docs/NOTAS_IMPLEMENTACION.md` antes de comenzar UI y API.

## Contratos por vista
- Ver `Docs/CONTRATOS_POR_VISTA.md`.

## Estilos y diseno
- Ver `Docs/estilos y diseños.md`.

## Enums y reglas
- Ver `Docs/ENUMS_OFICIALES.md`.
- Ver `Docs/REGLAS_INTERPRETACION_IOT.md`.

## Migracion SQL
- Ver `Docs/GUIA_MIGRACION_SQL.md`.
