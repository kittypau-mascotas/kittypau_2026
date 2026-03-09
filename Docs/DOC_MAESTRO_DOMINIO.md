# Documento Maestro de Dominio (Kittypau)

## Propósito
Definir reglas, estados, contratos y validaciones antes de implementar UI o backend.

---

## 1. Reglas de negocio (crítico)
### Usuario
- Un usuario puede tener multiples mascotas.
- Una mascota tiene un solo propietario por ahora (cuidadores en fase futura).
- Puede existir mascota sin dispositivo: **si**.
- Puede existir dispositivo sin mascota: **no** (requerido por esquema).

### Mascota
- `name` editable.
- `type` **no editable** (define el flujo de razas y peso).
- `breeds` editable (max 3).
- `photo_url` reemplazable (se sobreescribe).
- Eliminar mascota = **soft delete**.
- Al crear: `pet_state = device_pending` por defecto.

### Dispositivo
- Un solo dispositivo activo por mascota.
- Reasignar dispositivo libera el anterior.
- Si se elimina mascota -> dispositivo se bloquea (FK restrict). Se recomienda `pet_state = archived`.
- Al vincular: `device_state = linked`.

---

## 2. Estados del sistema
### Mascota (`pet_state`)
- `created`
- `completed_profile`
- `device_pending`
- `device_linked`
- `inactive`
- `archived`

### Dispositivo (`device_state`)
- `factory`
- `claimed`
- `linked`
- `offline`
- `lost`
- `error`

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
  "device_uuid": "uuid",
  "device_id": "KPCL0001",
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
**Audit events actuales (server-only)**
- `profile_created`
- `profile_updated`
- `pet_created`
- `device_created`
- `reading_ingested`

**Eventos futuros**
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
