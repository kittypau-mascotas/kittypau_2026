# Automatizacion de Tests (Kittypau)

## Objetivo
Estandarizar pruebas repetibles para backend y flujo IoT sin tocar infraestructura ni credenciales reales en docs.

---

## Alcance
- API directa (sin Bridge): **obligatoria**.
- Bridge/MQTT: **opcional** (depende del entorno IoT).
- Realtime: validacion manual (frontend).

---

## Prerrequisitos
- Token Supabase valido (Auth).
- `MQTT_WEBHOOK_SECRET` correcto en Vercel.
- `device_code` existente para pruebas webhook.

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
$token = "<ACCESS_TOKEN>"
$webhook = "<MQTT_WEBHOOK_SECRET>"
$petId = "<PET_UUID>"

# 1) Crear device
$device = Invoke-RestMethod -Method Post `
  -Uri "https://kittypau-app.vercel.app/api/devices" `
  -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
  -Body "{\"device_code\":\"KPCL0100\",\"device_type\":\"food_bowl\",\"status\":\"active\",\"pet_id\":\"$petId\"}"

# 2) Enviar lectura
$payload = @{ deviceCode=$device.device_code; temperature=23.5; humidity=65; weight_grams=3500; battery_level=85; flow_rate=120 } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "https://kittypau-app.vercel.app/api/mqtt/webhook" `
  -Headers @{ "x-webhook-token"=$webhook; "Content-Type"="application/json" } `
  -Body $payload

# 3) Leer lecturas
Invoke-RestMethod -Method Get `
  -Uri "https://kittypau-app.vercel.app/api/readings?device_id=$($device.id)" `
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

## Limpieza (opcional)
- Eliminar `devices` de prueba.
- Mantener una mascota base para pruebas.

---

## Notas
- No registrar credenciales reales en docs.
- Si se cambia el contrato del webhook, actualizar este documento y `Docs/PRUEBAS_E2E.md`.
