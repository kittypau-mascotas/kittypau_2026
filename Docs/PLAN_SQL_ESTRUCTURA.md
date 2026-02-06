# Plan Paso a Paso: Estructura SQL (Kittypau)

## Principio guia
Antes de escribir codigo, definimos **datos, formularios, relaciones, reglas y eventos**. El SQL debe reflejar exactamente lo que la app necesita.

---

## Paso 1: Definir la data que necesitamos (inventario)
### A. Registro de usuario (flujo visual)
**Principio visual**
- Cada eleccion es una tarjeta con fotografia.
- El usuario casi no lee: reconoce y toca.
- Texto solo como etiqueta corta.

**Orden de pantallas**
1. Metodo de acceso
2. Nombre del usuario
3. Eres el dueno de la mascota
4. Evaluacion de cuidado
5. Canales de notificacion
6. Ubicacion aproximada
7. Confirmacion -> registrar mascota

**Campos clave**
- auth_provider (google / apple / email)
- user_name
- is_owner
- owner_name (si no es dueno)
- care_rating (1-10)
- notification_channel (app | whatsapp | email | whatsapp_email)
- phone_number (si incluye WhatsApp)
- city
- country
- user_onboarding_step

**Modelo de datos final (users/profiles)**
- id
- email
- auth_provider
- user_name
- is_owner
- owner_name
- care_rating
- phone_number
- notification_channel
- city
- country
- user_onboarding_step
- created_at

**Origen**: flujo de registro visual.

### B. Registro de mascota (flujo visual)
**Principio visual**
- Cada opcion es una tarjeta con fotografia real.
- El usuario elige tocando imagenes; texto solo como etiqueta corta.

**Orden de pantallas**
1. Tipo de mascota
2. Nombre + Foto
3. Origen
4. Esterilizado
5. Vive en
6. Tamano + Edad
7. Raza (multiseleccion)
8. Peso
9. Actividad
10. Tiempo solo
11. Enfermedades
12. Confirmacion
13. Registro veterinario (opcional)

**Modelo de datos final (pets)**
- id
- user_id
- name
- type
- origin
- is_neutered
- has_neuter_tattoo
- has_microchip
- living_environment
- size
- age_range
- weight_kg
- activity_level
- alone_time
- has_health_condition
- health_notes
- photo_url
- pet_onboarding_step
- created_at

**Modelo de datos final (breeds)**
- id
- name
- species
- is_mixed
- is_unknown

**Relacion**
- pet_breeds: pet_id, breed_id (max 3)

**Origen**: formulario "Registro de mascota".

### C. Registro de dispositivo (Kittypau)
**Principio visual**
- Solo 2 opciones, siempre con foto.
- El usuario toca la imagen, no lee.

**Opciones**
1. Kittypau Comida -> foto del plato de comida.
2. Kittypau Agua -> foto del plato de agua.

**Paso esencial**
- Escaneo de QR en la parte inferior del plato.
- El QR entrega el `device_code`.
- El dispositivo se asocia a una mascota para activar envio de datos.

**Datos mínimos**
- id
- owner_id (usuario)
- pet_id (obligatorio)
- device_code (ej: KPCL0001)
- tipo (food_bowl / water_bowl)
- estado (active / inactive / maintenance)
- device_state (factory / claimed / linked / offline / lost / error)
- bateria (opcional)
- last_seen
- fecha de creacion

**Origen**: formulario "Registro de Kittypau".

### D. Lecturas (streaming)
**Datos mínimos**
- id
- device_id
- pet_id (opcional)
- weight_grams (si es plato comida)
- water_ml (si es plato agua)
- flow_rate (opcional)
- temperature (opcional)
- humidity (opcional)
- battery_level (opcional)
- recorded_at

**Origen**: webhook MQTT desde HiveMQ.

---

## Paso 2: Formularios y sus campos (input real)
### Registro/Login (usuario)
- auth_provider (google / apple / email)
- user_name
- is_owner
- owner_name (opcional)
- care_rating
- notification_channel
- phone_number (opcional)
- city
- country

### Perfil
- nombre completo
- telefono (opcional)

### Registro de mascota (flujo visual)
- type (cat/dog)
- name
- photo_url
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

### Registro de Kittypau
- device_type (food_bowl / water_bowl)
- device_code
- asignar mascota (opcional)
- escanear QR (obligatorio)

---

## Paso 3: Definir relaciones
1. Usuario **1:N** Mascotas
2. Usuario **1:N** Dispositivos
3. Mascota **1:N** Dispositivos (obligatorio)
4. Dispositivo **1:N** Lecturas

---

## Paso 4: Definir reglas de negocio (constraints)
1. `device_code` debe ser unico.
2. Un usuario solo puede ver/editar su data.
3. Lecturas solo se insertan via webhook autenticado.
4. Dispositivo debe estar asignado a mascota.

---

## Paso 5: Eventos y actualizaciones
1. Insercion de `readings`:
   - Actualiza `devices.last_seen`
   - Actualiza `devices.battery_level`

---

## Paso 6: Diseno de tablas (borrador SQL)
### `profiles` (o `users`)
- `id` uuid PK (auth.user.id)
- `email` text
- `auth_provider` text
- `user_name` text
- `is_owner` boolean
- `owner_name` text
- `care_rating` int
- `phone_number` text
- `notification_channel` text
- `city` text
- `country` text
- `user_onboarding_step` text
- `created_at` timestamp

### `pets`
- `id` uuid PK
- `user_id` uuid FK -> profiles.id
- `name` text
- `type` text (cat/dog)
- `origin` text
- `is_neutered` boolean
- `has_neuter_tattoo` boolean
- `has_microchip` boolean
- `living_environment` text
- `size` text
- `age_range` text
- `weight_kg` numeric
- `activity_level` text
- `alone_time` text
- `has_health_condition` boolean
- `health_notes` text
- `photo_url` text
- `pet_onboarding_step` text
- `created_at` timestamp

### `breeds`
- `id` uuid PK
- `name` text
- `species` text
- `is_mixed` boolean
- `is_unknown` boolean

### `pet_breeds`
- `pet_id` uuid FK -> pets.id
- `breed_id` uuid FK -> breeds.id

### `devices`
- `id` uuid PK
- `owner_id` uuid FK -> profiles.id
- `pet_id` uuid FK -> pets.id (nullable)
- `pet_id` uuid FK -> pets.id (not null)
- `device_code` text UNIQUE
- `device_type` text
- `status` text
- `battery_level` int
- `last_seen` timestamp
- `created_at` timestamp

### `readings`
- `id` uuid PK
- `device_id` uuid FK -> devices.id
- `pet_id` uuid FK -> pets.id (nullable)
- `weight_grams` int
- `water_ml` int
- `temperature` numeric
- `humidity` numeric
- `flow_rate` numeric
- `battery_level` int
- `recorded_at` timestamp (default now())

---

## Paso 7: RLS (seguridad)
### Principios
- Cada usuario solo accede a sus datos.
- API server puede insertar lecturas con service role.

### Ejemplo de politicas
- `pets`: `user_id = auth.uid()`
- `devices`: `owner_id = auth.uid()`
- `readings`: join por `devices.owner_id = auth.uid()`

---

## Paso 8: Checklist final antes de crear SQL real
- [ ] Campos del formulario definidos
- [ ] Relaciones confirmadas
- [ ] Reglas de negocio confirmadas
- [ ] Eventos (last_seen, battery) definidos
- [ ] OK para crear script SQL

---

## Proximo paso
Cuando confirmes este plan, generamos el **script SQL final** y lo guardamos en `Docs/SQL_SCHEMA.sql` antes de tocar codigo.

