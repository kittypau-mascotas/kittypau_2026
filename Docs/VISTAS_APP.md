# Vistas y Pages de la App (Kittypau)

## Objetivo
Definir la estructura de vistas antes de implementar UI o routing.

---

## Enfoque interpretativo (plato inteligente)
Ahora:
animal -> relacion con recursos -> comportamiento.

La app no observa al gato, observa como vive en la casa.
El backend no cambia, cambia el significado del frontend:
reemplazar mentalmente "lecturas / metricas / graficos"
por "eventos / interpretaciones / historia".

---

## Estructura general (App Router)
```
/(public)
  /login
  /register
/(onboarding)
  /user
  /pet
  /device
/(app)
  /today
  /story
  /pet
  /bowl
  /settings
```

---

## Vistas publicas
### /login
- Metodo de acceso (Google/Apple/Email)
- Nota: Google/Apple aun no estan activos (no funciona).
- Si email: formulario simple
**Datos / API**
- Supabase Auth (signInWithPassword)

### /register
- Flujo visual de registro de usuario
- Al click en registrarse se abre un **pop-up de onboarding** (web y movil).
- El pop-up muestra un **loading bar** con 3 hitos: Usuario -> Mascota -> Dispositivo.
- No se sale del pop-up hasta completar el registro.
- Si el usuario cierra, el progreso se guarda para retomar.
**Datos / API**
- Supabase Auth (signUp)
- Tabla `profiles` (crear/actualizar)

---

## Vistas de onboarding
### /onboarding/user
- Registro usuario (visual)
- Guarda `auth_provider`, `user_name`, `is_owner`, etc.
**Datos / API**
- `profiles` (update)
- Guarda `user_onboarding_step`

### /onboarding/pet
- Registro mascota (visual)
- Guarda datos completos de mascota
**Datos / API**
- `POST /api/pets`
- `pet_breeds` (insert)
- Guarda `pet_onboarding_step`

### /onboarding/device
- Registro dispositivo (QR obligatorio)
- Asocia mascota + device_code
**Datos / API**
- `POST /api/devices`
- Validar `device_code` unico
- Actualiza `pet_state` a `device_linked`

---

## Vistas principales (app)
### /today (antes /dashboard)
- Estado interpretado del dia.
- Ritmo del dia.
- Hidratacion relativa.
- Comparacion historica.
- Ultimo evento.
- No mostrar graficos inicialmente.
- Primer ingreso: mostrar **modo guia** (popup con fondo difuminado).
**Datos / API**
- `GET /api/readings?device_id=...` (historial)
- Supabase Realtime (`readings`)
- `devices` (estado, bateria, last_seen)
- `profiles.first_time_guide_seen` (flag)

### /story
- Timeline narrativo del dia.
- Ejemplos: "07:12 desayuno tranquilo", "18:32 mucha agua".
**Datos / API**
- `GET /api/readings?device_id=...`
- Interpretaciones a partir de lecturas

### /pet (antes /pets)
- Perfil conductual y personalidad alimentaria.
- No priorizar raza; priorizar patrones.
**Datos / API**
- `GET /api/pets`
- `GET /api/readings?device_id=...`

### /bowl (antes /devices)
- Estado tecnico del plato.
- Bateria, conexion, calibracion, firmware.
**Datos / API**
- `GET /api/devices`
- `PATCH /api/devices/:id` (pendiente de definir)

### /settings
- Perfil usuario
- Notificaciones
- Preferencias
**Datos / API**
- `profiles` (update)
- `notification_channel`, `phone_number`, `city`, `country`

---

## Reglas de navegacion
1. Usuario no autenticado -> siempre /login
2. Usuario autenticado sin mascotas -> /onboarding/pet
3. Usuario con mascotas sin dispositivos -> /onboarding/device
4. Usuario completo -> /today

---

## Diagrama de flujo de navegacion
```
START
  |
  v
[Auth?] -- no --> /login
  |
  yes
  v
[Tiene mascotas?] -- no --> /onboarding/pet
  |
  yes
  v
[Tiene dispositivo?] -- no --> /onboarding/device
  |
  yes
  v
/today
```

---

## Mapa de estados de onboarding
```
user_onboarding_step:
  - not_started
  - user_profile
  - pet_profile
  - device_link
  - completed

pet_onboarding_step:
  - not_started
  - pet_type
  - pet_profile
  - pet_health
  - pet_confirm
```

---

## Componentes base sugeridos
- Layout general con sidebar (app)
- Wizard de onboarding
- Card visual para opciones (tipo mascota, origen, etc.)
- Selector de QR (camera o input manual)

---

## Referencia visual del tablero
- Ver `Docs/estilos y diseños.md` (paleta final, tipografia y estructura del tablero).

---

## Home (lo mas importante)
No abrir con metricas tipo "agua: 120ml".
Debe abrir con interpretaciones:
- "Hoy estuvo tranquilo"
- "Comio mas tarde que ayer"
- "Bebio menos de lo habitual"

Los numeros existen, pero como evidencia secundaria.

---

## Inferencias con agua + comida (UX engine)
| Patron detectado | Significado UX |
|---|---|
| muchas micro ingestas | ansiedad |
| ingesta nocturna | estres o aburrimiento |
| baja hidratacion | alerta salud |
| cambio horario | cambio rutina casa |
| comer al irte | apego |
| comer al volver | confianza |
| picos de agua | actividad intensa |
| ayuno prolongado | posible problema |

---

## Redefinicion de rutas (significado)
| Ruta | Nuevo significado |
|---|---|
| /today | Hoy en casa |
| /pet | Perfil conductual |
| /bowl | Estado del plato |
| /story | Diario automatico |
