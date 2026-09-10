# Phase 1 — Data Model: Demo /today en vivo

La feature es principalmente de presentación (espejo de `/today`). "Datos" acá = (1) la identidad
del visitante en `localStorage`, (2) el bundle que sirve el endpoint de demo, (3) el cambio de
schema del lead. No hay entidades de dominio nuevas persistidas salvo el lead extendido.

---

## 1. Identidad de demo (cliente — `localStorage`)

**Dónde vive**: `localStorage` del navegador del visitante. Módulo `src/lib/demo-identity.ts`
centraliza lectura/escritura/limpieza. Ya existen las claves `kittypau_demo_*` (las setea hoy
`login/page.tsx` `startTrial`); esta feature las consolida y agrega `visitor_id`.

| Clave | Tipo | Origen | Uso |
|---|---|---|---|
| `kittypau_demo_mode` | `"1"` | `startTrial` (login) | flag: hay una sesión de demo activa |
| `kittypau_demo_owner_name` | string (1–120, trim, sin vacío) | form "Personaliza tu demo" | reemplaza nombre del dueño en `<TodayScreen>` |
| `kittypau_demo_pet_name` | string (1–120, trim, sin vacío) | form | reemplaza nombre de la mascota |
| `kittypau_demo_pet_type` | `"dog" \| "cat"` | form (radio Perro/Gato, default `"dog"`) | elige el avatar-gif y el label "Tipo" |
| `kittypau_demo_visitor_id` | uuid v4 corto | generado 1a vez en el cliente | dedupe del lead sin email |
| `kittypau_demo_email` | string \| ausente | solo si el visitante lo deja en el CTA "Crear cuenta" | lead + prefill de registro |
| `kittypau_demo_source` | string | `"trial_modal"` \| `"client_demo"` \| `"test"` | trazabilidad del lead |
| `kittypau_demo_recorded_at` | ISO string | `startTrial` | primera marca de tiempo local |
| `kittypau_demo_device_id` | `"KPCL-DEMO"` (placeholder) | legado | **se deja de usar** — el device real lo resuelve el server; se limpia |
| `kittypau_demo_show_rpg` | — | legado del chatbot | **se elimina** (D3) |
| `kittypau_demo_kind` | — | legado | se elimina en la limpieza |

**Objeto en memoria** (`DemoIdentity`, derivado de las claves):

```ts
type DemoPetType = "dog" | "cat";
type DemoIdentity = {
  ownerName: string;      // trim, 1..120, requerido para entrar
  petName: string;        // trim, 1..120, requerido para entrar
  petType: DemoPetType;   // default "dog"
  avatarSrc: string;      // derivado: "/illustrations/nervous-not.gif" (dog) | "/illustrations/giphy.gif" (cat)
  visitorId: string;      // uuid; se crea si falta
  email?: string;         // opcional, solo del CTA
};
```

**Reglas de validación** (trust boundary — no se simplifican, Principio III):
- `ownerName` / `petName`: `trim()`, rechazar si `length === 0` tras trim; truncar visualmente a 120
  chars (el input ya limita); permitir emojis/acentos sin rechazar (Edge Case del spec) — el
  truncado visual lo hace CSS/`slice`, no una validación que bloquee.
- `petType`: si el valor de `localStorage` no es `"dog"` ni `"cat"` → `"dog"`.
- `avatarSrc`: mapa fijo, nunca la foto real (`primaryPet.photo_url` no se lee en `mode="demo"`).
- `visitorId`: si falta o no matchea uuid → generar `crypto.randomUUID()` y persistir.

**Ciclo de vida**:
- **Escritura**: al confirmar "Entrar a prueba" en el form (login o `/demo` si llegó directo).
- **Lectura**: `/demo/page.tsx` al montar → si falta `ownerName` o `petName`, muestra el form; si
  están, entra directo a `<TodayScreen mode="demo">`.
- **Recarga / volver más tarde** (FR-010, US2 escenario 2): persiste hasta que el navegador limpie
  `localStorage` o el visitante haga "Cancelar"/logout de demo. No expira por tiempo propio.
- **Limpieza**: botón "Cancelar" en el form y cualquier "salir de la demo" borran todas las
  `kittypau_demo_*` (helper `clearDemoIdentity()`), igual que hace hoy `login/page.tsx:1023-1031`.

**No se persiste en el servidor** más allá del lead (§3). No es una cuenta ni un perfil.

---

## 2. Bundle de datos en vivo — `GET /api/demo/today`

Sobre único que agrupa lo que `<TodayScreen>` necesita del servidor. Sub-shapes **idénticos** a los
de las rutas autenticadas (misma función productora en `lib/hunger-bar-server.ts`). Contrato
completo en [contracts/demo-today-api.md](./contracts/demo-today-api.md).

```ts
type DemoTodayBundle = {
  generatedAt: string;                    // ISO — para debug de frescura
  devices: DemoDevice[];                  // exactamente 2: comida (KPCL0034) + agua (KPCL0035), sin pet_id/pet_name
  readings: ApiReading[];                 // ventana fija para el gráfico día/noche (misma forma que /api/readings)
  auditEvents: Record<string, AuditEvent[]>; // keyed por device_id KPCL, categorías TODAY_AUDIT_CATEGORIES
  hungerBar: HungerBarResponse;           // === shape de GET /api/pets/:id/hunger-bar (incl. kpis)
  consumoPeriodo: ConsumoPeriodoResponse; // === shape de GET /api/pets/:id/consumo-periodo
};

type DemoDevice = {
  device_id: string;        // "KPCL0034" | "KPCL0035" — identificador de hardware, se muestra (FR-006)
  device_type: string | null;
  battery_level: number | null;
  battery_state: string | null;
  last_seen: string | null;
  status: string;
  // NO incluye: id (uuid interno), pet_id, pet_name, user_id, ni nada de la cuenta dueña
};
```

**Campos deliberadamente omitidos** (FR-012 / SC-005): `devices.id` (uuid), `pet_id`, `pet_name`,
`user_id`, `profiles.*`, cualquier otro device. El front usa `device_id` (KPCL) como key.

**Degradado** (FR-008 / SC-004): si `resolveDemoDevices()` no encuentra el device de comida, o
`fetchHungerBarForDevice` tira, el endpoint responde **200** con
`hungerBar: { status: "sin_dispositivo", percentage: null, … }` y `consumoPeriodo: { status:
"sin_dispositivo" }` — el mismo shape neutro que ya devuelven las rutas autenticadas. Nunca 5xx
"crudo" hacia la demo (un 5xx real se loguea server-side; el front lo trata como estado vacío).

**Cache**: `Cache-Control: public, s-maxage=30, stale-while-revalidate=120`. Sin `Vary` por
usuario (no hay usuario). El `readings` de la ventana del gráfico puede tener `s-maxage` mayor si
hace falta afinar; se decide en implementación midiendo.

**Rate limit**: `checkRateLimit(\`${getRateKeyFromRequest(req)}:demo-today\`, N, ventana)` — N y
ventana a fijar (referencia: `demo-ingreso` usa 5/10min; este se llama más seguido por el poll de
5 min, así que algo como 30/5min por IP). El poll del front respeta la misma cadencia que `/today`
(FR-007): hunger-bar cada 5 min, el resto 1 vez al montar.

---

## 3. Lead de demo — `demo_ingresos` (Supabase) — CAMBIO DE SCHEMA

**Checkpoint Principio III**: la migración se aplica solo con OK explícito de Mauro.

### Estado actual
```
demo_ingresos(
  id uuid pk, email text NOT NULL UNIQUE, owner_name text, pet_name text,
  source text default 'demo_app', first_seen_at, last_seen_at, count int default 1,
  created_at, updated_at,
  check (position('@' in email) > 1)
)
RPC record_demo_ingreso(p_email, p_owner_name, p_pet_name, p_source)  -- exception si email vacío
```

### Cambios
| Cambio | SQL | Motivo |
|---|---|---|
| email opcional | `alter column email drop not null` | FR-011: lead sin email |
| dedupe anónimo | `add column visitor_id text` + `create unique index demo_ingresos_visitor_uniq on demo_ingresos (visitor_id) where email is null` | dedupe de visitantes recurrentes sin email (FR-011, SC-007) |
| tipo de mascota | `add column pet_type text` | FR-011 / US3: el panel muestra tipo |
| check tolerante | `drop constraint demo_ingresos_email_format`, `add check (email is null or position('@' in email) > 1)` | permitir email null |
| RPC v2 | `create function record_demo_ingreso_v2(p_visitor_id text, p_email text, p_owner_name text, p_pet_name text, p_pet_type text, p_source text) returns demo_ingresos` con `set search_path = public, pg_temp` | upsert por email si hay; por visitor_id si no |

**Lógica de `record_demo_ingreso_v2`**:
```
v_email := lower(nullif(trim(p_email), ''));
if v_email is not null:
    insert ... on conflict (email) do update set
      owner_name = coalesce(excluded.owner_name, demo_ingresos.owner_name),
      pet_name   = coalesce(excluded.pet_name,   demo_ingresos.pet_name),
      pet_type   = coalesce(excluded.pet_type,   demo_ingresos.pet_type),
      visitor_id = coalesce(demo_ingresos.visitor_id, excluded.visitor_id),
      source = excluded.source, last_seen_at = now(), count = count + 1, updated_at = now()
else:
    require p_visitor_id not null;
    insert (email=null, visitor_id, ...) on conflict (visitor_id) where email is null do update set
      ... (mismos campos, last_seen_at = now(), count = count + 1)
```

**Compatibilidad**: `record_demo_ingreso` (v1) se deja intacto — nadie más que `/api/demo/ingreso`
lo llama (grep). La ruta pasa a llamar v2.

**RLS**: `demo_ingresos` sigue con RLS habilitado y `revoke all from anon, authenticated`. Solo
`supabaseServer` (service_role) escribe, vía la RPC, como hoy.

### Fallback si Mauro no aprueba el cambio de schema
`/api/demo/ingreso` sigue devolviendo `400 MISSING_EMAIL` para leads sin email (comportamiento
actual) y el lead se captura recién en el CTA "Crear cuenta" (FR-009). US1/US2 no dependen de esto;
US3 (P3) queda parcialmente cubierta (solo leads con email). Se anota como pendiente en
`PENDIENTES_POR_PC.md`.

---

## 4. Entidades del spec → dónde caen

| Key Entity (spec) | Realización técnica |
|---|---|
| **Identidad de demo (del visitante)** | §1 — `localStorage` `kittypau_demo_*` + `DemoIdentity` en memoria; sin persistencia server salvo lead |
| **Mascota de demo** | `src/lib/demo/demo-config.ts` — `DEMO_FOOD_DEVICE_CODE` / `DEMO_WATER_DEVICE_CODE` de env; el endpoint resuelve código→device al vuelo. Reconfigurable sin código (Edge Case) |
| **Datos en vivo de `/today`** | §2 — `DemoTodayBundle`; sub-shapes reusados de `hunger-bar-server.ts` sin agregar/quitar campos |
| **Lead de demo** | §3 — `demo_ingresos` extendida (email opcional, `visitor_id`, `pet_type`) + `audit_events` (sin cambios) |

---

## 5. Tipos nuevos / tocados (resumen para `/speckit-tasks`)

| Archivo | Símbolo | Nota |
|---|---|---|
| `src/lib/demo-identity.ts` | `DemoIdentity`, `DemoPetType`, `readDemoIdentity()`, `writeDemoIdentity()`, `clearDemoIdentity()`, `DEMO_AVATAR_BY_TYPE` | cliente, `localStorage` |
| `src/lib/demo/demo-config.ts` | `getDemoDeviceCodes()` | server-only, lee env |
| `src/lib/today/today-data-source.ts` | `TodayDataSource` (interface), `authedDataSource` | `authedDataSource` = las llamadas `authFetch` movidas de `page.tsx` 1:1 |
| `src/lib/demo/demo-data-source.ts` | `demoDataSource` | implementa `TodayDataSource` vía `/api/demo/today` |
| `src/lib/hunger-bar-server.ts` | `buildHungerBarPayload(pet)`, `buildConsumoPeriodoPayload(petId)` | shaping extraído de las 2 rutas; ambas rutas + el endpoint demo lo usan |
| `src/app/api/demo/today/route.ts` | `GET` | bundle |
| `src/app/(app)/today/_components/today-screen.tsx` | `TodayScreen`, `TodayScreenProps` | cuerpo movido de `page.tsx` + props `mode`/`dataSource`/`identity` |
| `supabase/migrations/2026XXXX_demo_ingresos_sin_email.sql` | — | checkpoint Principio III |
