# Documento Maestro de Dominio (Kittypau)

## Proposito
Definir reglas, estados, contratos y validaciones antes de implementar UI o backend.

---

## 1. Reglas de negocio (critico)
### Usuario
- Un usuario puede tener multiples mascotas.
- Una mascota tiene un solo propietario por ahora (cuidadores en fase futura).
- Puede existir mascota sin dispositivo: **si**.
- Puede existir dispositivo sin mascota: **si, temporalmente** (fase de instalacion).

### Mascota
- `name` editable.
- `type` **no editable** (define el flujo de razas y peso).
- `breeds` editable (max 3).
- `photo_url` reemplazable (se sobreescribe).
- Eliminar mascota = **soft delete**.

### Dispositivo
- Un solo dispositivo activo por mascota.
- Reasignar dispositivo libera el anterior.
- Si se elimina mascota -> dispositivo queda huerfano.

---

## 2. Estados del sistema
### Mascota (`pet_state`)
- `created`
- `completed_profile`
- `device_pending`
- `device_linked`
- `inactive`

### Dispositivo (`device_state`)
- `factory`
- `claimed`
- `linked`
- `offline`
- `lost`

---

## 3. Contratos de API (estructura de respuesta)
### Login
```json
{
  "user": { "id": "uuid", "name": "Ana" },
  "has_pets": true,
  "next_step": "pet_onboarding"
}
```

### Crear mascota
```json
{
  "pet_id": "uuid",
  "profile_completion": 0.72,
  "needs_device_link": true
}
```

### Vincular dispositivo
```json
{
  "device_id": "uuid",
  "device_state": "linked",
  "pet_state": "device_linked"
}
```

---

## 4. Validaciones obligatorias
### Usuario
- `email` unico.
- `phone_number` unico (opcional).
- `care_rating` entre 1 y 10.

### Mascota
- `weight_kg` en rango por especie.
- max 3 razas.
- `quiltro` excluyente (no se combina).

---

## 5. Enumeraciones oficiales (fuente de verdad)
- `pet_type`
- `origin`
- `activity_level`
- `living_environment`
- `notification_channel`
- `device_state`
- `pet_state`

El frontend no inventa valores.

---

## 6. Estrategia de fotos
- Almacenamiento: Supabase Storage.
- Tamano max: 5MB.
- Compresion: cliente (web/mobile).
- Reemplazo: overwrite.
- Foto por defecto: placeholder por especie.

---

## 7. Permisos y seguridad
- Usuario solo ve sus mascotas y dispositivos.
- Usuario solo ve lecturas de sus dispositivos.
- Tokens expiran segun Supabase (renovacion automatica).
- Fase futura: cuidadores con permisos limitados.

---

## 8. Eventos del sistema (para IoT y analytics)
- `pet_created`
- `pet_updated`
- `device_linked`
- `device_unlinked`
- `activity_received`
- `alert_generated`

---

## 9. Flujo de onboarding (estado global)
- Guardar:
  - `user_onboarding_step`
  - `pet_onboarding_step`
- Si el usuario sale, puede retomar.
- El registro ocurre en un **pop-up** con barra de progreso:
  - Usuario -> Mascota -> Dispositivo
- El pop-up no se cierra hasta finalizar.

## 11. Modo guia (primer ingreso)
- Mostrar popup con fondo difuminado en primer ingreso.
- Guardar flag `first_time_guide_seen`.
- Reabrible desde Settings.

---

## 10. Errores UX definidos
- Sin internet.
- Foto falla.
- Dispositivo ya vinculado.
- Email existente.
- Sesion expirada.

---

## Resultado esperado
Con este documento cerrado, se puede iniciar la implementacion sin refactors mayores.
