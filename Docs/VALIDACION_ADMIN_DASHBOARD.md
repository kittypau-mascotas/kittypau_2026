# Validacion Admin Dashboard (CLI)

Fecha de validacion: 2026-02-12

## Actualización (2026-02-19)
- Caché operativo en `GET /api/admin/overview` con Upstash + invalidación por eventos críticos.
- Variables de entorno revisadas:
  - `ADMIN_OVERVIEW_CACHE_TTL_SEC` debe ser numérica (ej. `45`).
  - Si el valor no es numérico, backend usa fallback `45`.
- Admin dashboard ahora muestra catálogo de objetos (`table`/`view`) con:
  - descripción, rows/size estimado y última actualización aproximada.
- `% Supabase Utilizado` actualizado a consumo total:
  - DB (tablas) + Storage (objetos).
- Seguridad verificada:
  - `/api/admin/overview` sin `Authorization` retorna `401`.
  - `/api/bridge/health-check` sin `x-bridge-token` retorna `401`.
- Nota de operación:
  - Para forzar datos frescos en validación puntual: usar `?no_cache=1`.

## 1) Verificacion en Vercel CLI
Comando:
```bash
vercel inspect kittypau-app.vercel.app
```
Resultado validado:
- Deployment en `status: Ready`.
- Alias activo: `https://kittypau-app.vercel.app`.
- Rutas detectadas en build:
  - `GET /api/admin/overview`
  - `/admin`

Comando:
```bash
vercel env ls
```
Resultado validado (proyecto `kittypau-app`):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `BRIDGE_HEARTBEAT_SECRET`
- `CRON_SECRET`

## 2) Verificacion en Supabase CLI
Comando:
```bash
npx supabase migration list --linked
```
Resultado validado:
- Migracion admin aplicada en remoto:
  - `20260212080000_admin_roles_and_dashboard`

## 3) Verificacion funcional de ingreso admin
Prueba realizada por CLI:
1. Login con `javomauro.contacto@gmail.com`.
2. Obtener `access_token`.
3. Llamar `GET https://kittypau-app.vercel.app/api/admin/overview` con `Authorization: Bearer <token>`.

Resultado validado:
- `admin_role = owner_admin`
- `summary` presente
- `audit_events` con datos
- Sin token, mismo endpoint responde `401` (bloqueo correcto).

## 4) Verificacion web del dashboard
Comando:
```bash
Invoke-WebRequest -Method Get -Uri "https://kittypau-app.vercel.app/admin"
```
Resultado:
- `HTTP 200` (ruta disponible).

## 5) Criterios de aceptacion cubiertos
1. Usuario admin autentica y obtiene vista admin (`/admin`).
2. Endpoint admin exige autenticacion y rol.
3. Dashboard admin expone:
- KPCL online/offline
- estado de bridges
- tabla de dispositivos offline
- `audit_events` en linea (auto refresh)
- AcciÃ³n admin: ejecutar health-check manual (server-only) para forzar detecciÃ³n sin cron.

## 6) Nota operativa
- Si se cambia contraseña o rol del admin en Supabase, revalidar esta guía.
- Si el entorno Vercel cambia de proyecto enlazado, volver a ejecutar `vercel link --yes --project kittypau-app`.

## 7) Nota (CORS / "Failed to fetch")
- Los endpoints bajo `/api/*` soportan preflight `OPTIONS` y retornan headers CORS.
- Esto permite validar el dashboard/admin desde herramientas externas o desde otros orÃ­genes (p.ej. pruebas locales),
  siempre usando `Authorization: Bearer <token>` o `x-bridge-token` segÃºn corresponda.

## 8) Health-check manual (admin)
Comando (PowerShell):
```powershell
# Con access_token ya obtenido:
Invoke-RestMethod -Method Post `
  -Uri "https://kittypau-app.vercel.app/api/admin/health-check?stale_min=2&device_stale_min=10" `
  -Headers @{ Authorization = "Bearer $token" }
```
Esperado:
- `200` si se ejecuta.
- Se registra `admin_health_check_run` en `audit_events`.

## 9) Validacion nueva (catalogo KPCL y stats robustos)
Aplicar migraciones nuevas:
```bash
npx supabase db push
```

Incluye:
- `20260220001500_finance_kpcl_catalog.sql`
- `20260220003000_admin_object_stats_hardened.sql`

Checks:
1. `GET /api/admin/overview` responde con `kpcl_catalog`.
2. `GET /api/admin/finance/kpcl-catalog` responde `200`.
3. Si falla `admin_object_stats_live`, `/api/admin/overview` sigue entregando `db_object_stats` via fallback RPC.

## 10) Validacion suite de tests admin
Endpoint:
- `POST /api/admin/tests/run-all`
- `GET /api/admin/tests/run-all`

Esperado:
1. El POST retorna `status`, `failed_count`, `total_count`, `results`.
2. Si hay errores (`failed_count > 0`), se registra evento `admin_test_suite_failed` en `audit_events`.
3. El GET lista historial de errores recientes para render en dashboard.

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
