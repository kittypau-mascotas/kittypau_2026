# Automatizacion de Tests (Kittypau)

## Objetivo
Estandarizar pruebas repetibles para backend y flujo IoT sin tocar infraestructura ni credenciales reales en docs.

---

## Alcance
- API directa (sin Bridge): **obligatoria**.
- Bridge/MQTT: **opcional** (depende del entorno IoT).
- Realtime: validacion manual (frontend).

---

## Herramienta recomendada
**OpciÃ³n A (rÃ¡pida y portable): Newman + Postman Collection**
- Pros: fÃ¡cil de compartir con equipo, ejecuciÃ³n en CI.
- Contras: depende de colecciÃ³n externa.

**OpciÃ³n B (sencilla y nativa): PowerShell**
- Pros: no requiere tooling extra.
- Contras: menos reportes.

Para este proyecto, empezar con **PowerShell** y luego migrar a **Newman** si el equipo crece.

---

## Prerrequisitos
- Token Supabase valido (Auth).
- `MQTT_WEBHOOK_SECRET` correcto en Vercel.
- `device_code` existente para pruebas webhook.

Variables esperadas (no incluir valores reales en docs):
```
ACCESS_TOKEN=
MQTT_WEBHOOK_SECRET=
PET_ID=
BASE_URL=https://kittypau-app.vercel.app
```

---

## Set de datos de prueba (convencion)
- `device_code`: `KPCL01XX` (evitar colisiones).
- `pet_id`: usar mascota real del usuario test.
- `device_id`: usar el UUID retornado por `POST /api/devices`.

---

## Flujo base (API directa)
**Secuencia recomendada**
1. `GET /api/pets`
2. `POST /api/pets`
3. `PATCH /api/pets/:id`
4. `POST /api/devices`
5. `POST /api/mqtt/webhook`
6. `GET /api/readings?device_id=...`

**Salida esperada**
- `200` en todas las rutas.
- Nueva fila en `readings`.
- `devices.last_seen` actualizado.

---

## Script sugerido (PowerShell)
> Guardar en `Docs/scripts/test-api.ps1` cuando se implemente automatizacion real.

```powershell
# Variables
$baseUrl = "https://kittypau-app.vercel.app"
$token = "<ACCESS_TOKEN>"
$webhook = "<MQTT_WEBHOOK_SECRET>"
$petId = "<PET_UUID>"

# 1) Crear device
$device = Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/api/devices" `
  -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
  -Body "{\"device_code\":\"KPCL0100\",\"device_type\":\"food_bowl\",\"status\":\"active\",\"pet_id\":\"$petId\"}"

# 2) Enviar lectura
$payload = @{ deviceCode=$device.device_code; temperature=23.5; humidity=65; weight_grams=3500; battery_level=85; flow_rate=120 } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/api/mqtt/webhook" `
  -Headers @{ "x-webhook-token"=$webhook; "Content-Type"="application/json" } `
  -Body $payload

# 3) Leer lecturas
Invoke-RestMethod -Method Get `
  -Uri "$baseUrl/api/readings?device_id=$($device.id)" `
  -Headers @{Authorization="Bearer $token"}
```

---

## Casos negativos minimos
- `POST /api/mqtt/webhook` sin `deviceCode` -> `400`.
- `POST /api/mqtt/webhook` con `deviceCode` inexistente -> `404`.
- `PATCH /api/devices/:id` con `status` invalido -> `400`.
- `GET /api/readings` con `device_id` ajeno -> `403` o lista vacia.

---

## Validacion de RLS (multiusuario)
1. Usuario A crea recursos.
2. Usuario B intenta leer `devices` o `readings` de A.
3. Esperado: no accede.

---

## Reporte esperado (mÃ­nimo)
- Salida de consola con:
  - `200` para flujo base
  - `400/404/403` para casos negativos
- Si se usa Newman, exportar `junit.xml` para CI.

---

## Limpieza (opcional)
- Eliminar `devices` de prueba.
- Mantener una mascota base para pruebas.

---

## Notas
- No registrar credenciales reales en docs.
- Si se cambia el contrato del webhook, actualizar este documento y `Docs/PRUEBAS_E2E.md`.

---

## Script inmediato (PowerShell)
Archivo: `Docs/TEST_DB_API.ps1`

Que hace
- Login con usuario de prueba
- GET pets
- POST device
- POST webhook
- GET readings

Variables a completar
- TU_SUPABASE_ANON_KEY
- TU_WEBHOOK_TOKEN
- KITTYPAU_PASSWORD
- PEGA_AQUI_PET_ID

Nota
- El script genera un `device_code` unico para evitar colisiones.

Uso
```powershell
.\Docs\TEST_DB_API.ps1
```

---

## Script onboarding backend (PowerShell)
Archivo: `Docs/TEST_ONBOARDING_BACKEND.ps1`

Que hace
- Auth
- PUT /api/profiles (user onboarding step)
- POST /api/pets
- POST /api/devices
- Verifica `pet_state`

Variables a completar
- SUPABASE_ANON_KEY
- KITTYPAU_PASSWORD
- PET_NAME
- PET_TYPE

Uso
```powershell
.\Docs\TEST_ONBOARDING_BACKEND.ps1
```


## Archivo de entorno para pruebas
- Docs/.env.test.example (placeholders, no incluir secretos reales)

## Cargar entorno local (no versionado)
Si tienes `Docs/.env.test.local`, puedes cargarlo antes de ejecutar scripts:

```powershell
# Carga variables de entorno desde Docs/.env.test.local
Get-Content -Path ".\\Docs\\.env.test.local" |
  Where-Object { $_ -match "=" -and $_ -notmatch "^\s*#" } |
  ForEach-Object {
    $pair = $_ -split "=", 2
    $env:$($pair[0]) = $pair[1]
  }

# Ejecuta test inmediato
.\Docs\TEST_DB_API.ps1
```
