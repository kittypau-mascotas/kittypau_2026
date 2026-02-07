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
device_id = <DEVICE_UUID>
device_code = KPCL0100
```

---

## Colección: `Kittypau API`
Orden recomendado:
1. `GET /api/pets`
2. `POST /api/pets`
3. `PATCH /api/pets/:id`
4. `POST /api/devices`
5. `PATCH /api/devices/:id`
6. `POST /api/mqtt/webhook`
7. `GET /api/readings?device_id={{device_id}}`

---

## Detalle de requests

### 1) GET /api/pets
**Method:** GET  
**URL:** `{{base_url}}/api/pets`  
**Headers:**  
`Authorization: Bearer {{access_token}}`

---

### 2) POST /api/pets
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

### 3) PATCH /api/pets/:id
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

### 4) POST /api/devices
**Method:** POST  
**URL:** `{{base_url}}/api/devices`  
**Headers:**  
`Authorization: Bearer {{access_token}}`  
`Content-Type: application/json`

**Body:**
```json
{
  "device_code": "{{device_code}}",
  "device_type": "food_bowl",
  "status": "active",
  "pet_id": "{{pet_id}}"
}
```

**Tests:**
```javascript
pm.test("status 201", () => pm.response.to.have.status(201));
pm.environment.set("device_id", pm.response.json().id);
```

---

### 5) PATCH /api/devices/:id
**Method:** PATCH  
**URL:** `{{base_url}}/api/devices/{{device_id}}`  
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

### 6) POST /api/mqtt/webhook
**Method:** POST  
**URL:** `{{base_url}}/api/mqtt/webhook`  
**Headers:**  
`x-webhook-token: {{webhook_token}}`  
`Content-Type: application/json`

**Body:**
```json
{
  "deviceCode": "{{device_code}}",
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

### 7) GET /api/readings
**Method:** GET  
**URL:** `{{base_url}}/api/readings?device_id={{device_id}}`  
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

