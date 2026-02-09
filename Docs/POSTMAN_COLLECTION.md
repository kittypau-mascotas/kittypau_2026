# Colección Postman/Newman (Kittypau)

## Objetivo
Tener una colección reproducible para validar el flujo API sin tocar infraestructura IoT.

---

## Variables de entorno (Postman)
Crear un Environment llamado `kittypau` con:
```
base_url = https://kittypau-app.vercel.app
access_token = <ACCESS_TOKEN>
webhook_token = <MQTT_WEBHOOK_SECRET>
pet_id = <PET_UUID>
device_uuid = <DEVICE_UUID>
device_id = KPCL0100
```

## Obtener access_token (Auth)
Endpoint (Supabase Auth):
`{{supabase_url}}/auth/v1/token?grant_type=password`

Agregar a variables de entorno:
```
supabase_url = https://<PROJECT_ID>.supabase.co
supabase_anon_key = <SUPABASE_ANON_KEY>
email = <USUARIO_EMAIL>
password = <USUARIO_PASSWORD>
```

Request:
- Method: POST
- Headers:
  - `apikey: {{supabase_anon_key}}`
  - `Content-Type: application/json`
- Body:
```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```
Tests:
```javascript
pm.test("status 200", () => pm.response.to.have.status(200));
pm.environment.set("access_token", pm.response.json().access_token);
```

---

## Colección: `Kittypau API`
Orden recomendado:
1. `POST Auth (Supabase)`
2. `GET /api/onboarding/status`
3. `PUT /api/profiles`
4. `GET /api/pets`
5. `POST /api/pets`
6. `PATCH /api/pets/:id`
7. `POST /api/devices`
8. `PATCH /api/devices/:id`
9. `POST /api/mqtt/webhook`
10. `GET /api/readings?device_uuid={{device_uuid}}`

---

## Detalle de requests

### 1) GET /api/onboarding/status
**Method:** GET  
**URL:** `{{base_url}}/api/onboarding/status`  
**Headers:**  
`Authorization: Bearer {{access_token}}`

**Tests:**
```javascript
pm.test("status 200", () => pm.response.to.have.status(200));
```

---

### 2) PUT /api/profiles
**Method:** PUT  
**URL:** `{{base_url}}/api/profiles`  
**Headers:**  
`Authorization: Bearer {{access_token}}`  
`Content-Type: application/json`

**Body (raw JSON):**
```json
{
  "user_name": "Javo",
  "city": "Lima",
  "country": "PE",
  "notification_channel": "email",
  "user_onboarding_step": "user_profile"
}
```

**Tests (Postman):**
```javascript
pm.test("status 200", () => pm.response.to.have.status(200));
```

---

### 3) GET /api/pets
**Method:** GET  
**URL:** `{{base_url}}/api/pets`  
**Headers:**  
`Authorization: Bearer {{access_token}}`

---

### 4) POST /api/pets
**Method:** POST  
**URL:** `{{base_url}}/api/pets`  
**Headers:**  
`Authorization: Bearer {{access_token}}`  
`Content-Type: application/json`

**Body (raw JSON):**
```json
{
  "name": "Mishu",
  "type": "cat",
  "origin": "rescatado",
  "pet_state": "created",
  "pet_onboarding_step": "pet_profile"
}
```

**Tests (Postman):**
```javascript
pm.test("status 201", () => pm.response.to.have.status(201));
pm.environment.set("pet_id", pm.response.json().id);
```

---

### 5) PATCH /api/pets/:id
**Method:** PATCH  
**URL:** `{{base_url}}/api/pets/{{pet_id}}`  
**Headers:**  
`Authorization: Bearer {{access_token}}`  
`Content-Type: application/json`

**Body:**
```json
{
  "pet_state": "completed_profile",
  "weight_kg": 4.7
}
```

**Tests:**
```javascript
pm.test("status 200", () => pm.response.to.have.status(200));
```

---

### 6) POST /api/devices
**Method:** POST  
**URL:** `{{base_url}}/api/devices`  
**Headers:**  
`Authorization: Bearer {{access_token}}`  
`Content-Type: application/json`

**Body:**
```json
{
  "device_id": "{{device_id}}",
  "device_type": "food_bowl",
  "status": "active",
  "pet_id": "{{pet_id}}"
}
```

**Tests:**
```javascript
pm.test("status 201", () => pm.response.to.have.status(201));
pm.environment.set("device_uuid", pm.response.json().id);
```

---

### 7) PATCH /api/devices/:id
**Method:** PATCH  
**URL:** `{{base_url}}/api/devices/{{device_uuid}}`  
**Headers:**  
`Authorization: Bearer {{access_token}}`  
`Content-Type: application/json`

**Body:**
```json
{
  "status": "maintenance",
  "device_state": "offline"
}
```

**Tests:**
```javascript
pm.test("status 200", () => pm.response.to.have.status(200));
```

---

### 8) POST /api/mqtt/webhook
**Method:** POST  
**URL:** `{{base_url}}/api/mqtt/webhook`  
**Headers:**  
`x-webhook-token: {{webhook_token}}`  
`Content-Type: application/json`

**Body:**
```json
{
  "device_id": "{{device_id}}",
  "temperature": 23.5,
  "humidity": 65,
  "weight_grams": 3500,
  "battery_level": 85,
  "flow_rate": 120
}
```

**Tests:**
```javascript
pm.test("status 200", () => pm.response.to.have.status(200));
```

---

### 9) GET /api/readings
**Method:** GET  
**URL:** `{{base_url}}/api/readings?device_uuid={{device_uuid}}`  
**Headers:**  
`Authorization: Bearer {{access_token}}`

**Tests:**
```javascript
pm.test("status 200", () => pm.response.to.have.status(200));
pm.test("has readings array", () => pm.expect(pm.response.json()).to.be.an("array"));
```

---

## Newman (CLI)
Ejemplo (una vez exportada la colección y el environment):
```bash
newman run Kittypau_API.postman_collection.json \
  -e kittypau.postman_environment.json \
  --reporters cli,junit \
  --reporter-junit-export newman-report.xml
```

---

## Notas
- No subir tokens reales al repo.
- Si cambian los contratos, actualizar esta colección.



