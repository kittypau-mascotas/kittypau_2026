# Contratos por Vista (Kittypau)

## Objetivo
Definir inputs, outputs y errores por pantalla antes de implementar UI.

---

## /login
**Input**
- email
- password

**Output**
- session (token)
- user
- next_step

**Errores**
- email no existe
- password incorrecta
- sesion expirada

---

## /register
**Input**
- auth_provider
- email
- password (solo email)

**Output**
- user_id
- session
- user_onboarding_step = user_profile

**Errores**
- email ya existe
- proveedor no disponible

---

## /onboarding/user
**Input**
- user_name
- is_owner
- owner_name (si is_owner = false)
- care_rating (1-10)
- notification_channel
- phone_number (si incluye WhatsApp)
- city
- country

**Output**
- profile actualizado
- user_onboarding_step = pet_profile

**Errores**
- care_rating fuera de rango
- phone_number requerido

---

## /onboarding/pet
**Input**
- type
- name
- origin
- is_neutered
- has_neuter_tattoo
- has_microchip
- living_environment
- size
- age_range
- breeds (max 3)
- weight_kg
- activity_level
- alone_time
- has_health_condition
- health_notes (opcional)
- photo_url

**Output**
- pet_id
- pet_onboarding_step = pet_confirm
- pet_state = device_pending

**Errores**
- breeds > 3
- weight_kg fuera de rango
- type no editable

---

## /onboarding/device
**Input**
- device_type (food_bowl / water_bowl)
- device_code (QR)
- pet_id

**Output**
- device_id
- device_state = linked
- pet_state = device_linked
- user_onboarding_step = completed

**Errores**
- device_code ya vinculado
- device_code invalido
- pet_id requerido

---

## /today
**Input**
- device_id (seleccion actual)

**Output**
- lecturas historicas
- streaming en vivo
- device_status, battery, last_seen
- first_time_guide_seen

**Errores**
- sin data
- sesion expirada

---

## /story
**Input**
- device_id (seleccion actual)

**Output**
- timeline narrativo del dia
- eventos interpretados

**Errores**
- sin data
- sesion expirada

---

## /pet
**Input**
- (listar)

**Output**
- lista de mascotas

**Errores**
- sesion expirada

---

## /bowl
**Input**
- (listar)

**Output**
- lista de dispositivos

**Errores**
- sesion expirada

---

## /settings
**Input**
- notification_channel
- phone_number
- city
- country

**Output**
- profile actualizado

**Errores**
- phone_number requerido si WhatsApp
