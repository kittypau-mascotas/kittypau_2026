# Vistas y Pages de la App (Kittypau)

## Objetivo
Definir la estructura de vistas antes de implementar UI o routing.

---

## Implementacion actual (2026-02-07)
- /login implementado con layout parallax + login real (Supabase Auth) y validaciones inline.
- /today implementado como feed vertical interpretado conectado a APIs. Incluye modo guía inicial con tips.
- /onboarding implementado en una sola vista con pasos guiados, barra de progreso y persistencia por `user_onboarding_step`.
- / redirige a /login.
- /story implementado como timeline narrativo básico.
- /pet implementado como perfil conductual básico con insights.
- /bowl implementado como estado técnico del plato.
- /settings implementado como ajustes de perfil y notificaciones.
- /register implementado como ruta pública con reenvío de confirmación y validaciones inline.
- UI tolera respuestas API en formato lista o `{ data, next_cursor }`.

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
  /onboarding
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
### /onboarding (single view)
- Flujo basico en una sola pagina con 3 pasos.
- Perfil -> Mascota -> Dispositivo.
**Datos / API**
- `PUT /api/profiles`
- `POST /api/pets`
- `POST /api/devices`

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
- Asocia mascota + device_id
**Datos / API**
- `POST /api/devices`
- Validar `device_id` unico
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
- `GET /api/readings?device_uuid=...&limit=50` (historial)
- Supabase Realtime (`readings`) integrado.
- `devices` (estado, bateria, last_seen)
- `profiles.first_time_guide_seen` (flag)

### /story
- Timeline narrativo del dia.
- Ejemplos: "07:12 desayuno tranquilo", "18:32 mucha agua".
**Datos / API**
- `GET /api/readings?device_uuid=...&limit=50`
- Interpretaciones a partir de lecturas
- Realtime `readings` integrado.

### /pet (antes /pets)
- Perfil conductual y personalidad alimentaria.
- No priorizar raza; priorizar patrones.
**Datos / API**
- `GET /api/pets`
- `GET /api/readings?device_uuid=...&limit=80`
- Realtime `readings` integrado.

### /bowl (antes /devices)
- Estado tecnico del plato.
- Bateria, conexion, calibracion, firmware.
**Datos / API**
- `GET /api/devices`
- `PATCH /api/devices/:id` (propuesto, ver `Docs/FRONT_BACK_APIS.md`)

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
- Layout general sin sidebar (app)
- Wizard de onboarding
- Card visual para opciones (tipo mascota, origen, etc.)
- Selector de QR (camara o input manual)

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

---

## Pantallas clave (detalle)

### 1) Login (public)
**Objetivo**: acceso rapido, cero friccion.
**Layout**
- Card centrada, fondo lifestyle.
- CTA principal: "Continuar".
- CTA secundario: "Crear cuenta".
**Datos / API**
- Supabase Auth (signInWithPassword / OAuth).
**Estados**
- Loading: usar loader global/route.
- Error: credenciales invalidas.

### 2) Registro (public)
**Objetivo**: activar cuenta y disparar onboarding.
**Layout**
- Pop-up con pasos: Usuario ? Mascota ? Dispositivo.
- Progreso visible.
**Datos / API**
- Supabase Auth (signUp).
- `profiles` (create/update).

### 3) Onboarding Usuario
**Objetivo**: completar perfil basico.
**Campos**: nombre, ciudad, pais, canal notificacion.
**Datos / API**
- `PUT /api/profiles`.
- `user_onboarding_step`.

### 4) Onboarding Mascota
**Objetivo**: alta de mascota.
**Campos**: nombre, tipo, edad, peso, entorno.
**Datos / API**
- `POST /api/pets`.
- `pet_onboarding_step`.

### 5) Onboarding Dispositivo
**Objetivo**: vincular `device_id` con mascota.
**Layout**
- Input de codigo + QR opcional.
**Datos / API**
- `POST /api/devices`.
- Actualiza `pet_state` a `device_linked`.

### 6) Today (home)
**Objetivo**: lectura interpretada del dia.
**Layout**
- Feed vertical, cards.
- 1 mensaje principal + 1 accion.
**Datos / API**
- `GET /api/readings?device_uuid=...&limit=50`
- Realtime `readings`.
**Estados**
- Empty: "Aun no hay lecturas".
- Error: "No se pudo cargar".

### 7) Story (timeline)
**Objetivo**: narrar eventos del dia.
**Layout**
- Timeline vertical con tarjetas.
**Datos / API**
- `GET /api/readings?device_uuid=...`
- Reglas de `Docs/REGLAS_INTERPRETACION_IOT.md`.

### 8) Pet (perfil)
**Objetivo**: perfil conductual.
**Layout**
- Card de mascota + insights.
**Datos / API**
- `GET /api/pets`.
- Lecturas recientes.

### 9) Bowl (dispositivo)
**Objetivo**: estado tecnico.
**Layout**
- Estado, bateria, ultima conexion.
**Datos / API**
- `GET /api/devices`.
- `PATCH /api/devices/:id`.

### 10) Settings
**Objetivo**: ajustes de usuario.
**Datos / API**
- `PUT /api/profiles`.

### Estados globales
- Loading: `app/loading.tsx` + overlay global.
- Empty: tarjetas con CTA.
- Error: mensaje corto y accion de reintento.

---

## Plan de implementación front (pasos)
1. **/story**: timeline narrativo del día (lecturas → interpretaciones).
2. **/pet**: perfil conductual con insights y edición básica.
3. **/bowl**: estado técnico del plato + acciones.
4. **/settings**: ajustes de usuario y notificaciones.
5. **/register**: ruta pública (además del popup) + reenvío de confirmación.






## Branding UI
- Logo presente en top nav y pantallas de login/registro.
- Loading con logo girando + texto Cargando.


## Redes sociales
- Login: iconos bajo el logo de marca.
- App: footer con redes, empresa y correo.

## Onboarding
- Paso 1: avatar por seleccion (4 opciones).

