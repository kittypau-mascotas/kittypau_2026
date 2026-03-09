# Mapa de Ecosistema (Onboarding Rapido)

## 1) Arquitectura (que corre y donde)
- Next.js (Frontend + API) en Vercel.
- Supabase (DB + Auth + Realtime).
- HiveMQ Cloud (MQTT).
- Raspberry Pi Zero 2 W (Bridge MQTT -> API).

Docs clave:
- `Docs/ARQUITECTURA_PROYECTO.md`
- `Docs/ARQUITECTURA_COMPLETA.md`
- `Docs/DIAGRAMA_ARQUITECTURA_ACTUAL.md`

---

## 2) Base de datos y seguridad
- Esquema oficial: `Docs/SQL_SCHEMA.sql`
- RLS activo en todas las tablas.
- `devices.pet_id` obligatorio.
- Trigger: `update_device_from_reading` actualiza `last_seen`.

Docs clave:
- `Docs/GUIA_SQL_SUPABASE.md`
- `Docs/GUIA_MIGRACION_SQL.md`
- `Docs/ENUMS_OFICIALES.md`

---

## 3) APIs y contratos
Endpoints MVP:
- `POST /api/mqtt/webhook`
- `GET/POST /api/pets`
- `GET/POST /api/devices`
- `GET /api/readings?device_uuid=<UUID>`

Docs clave:
- `Docs/FRONT_BACK_APIS.md`
- `Docs/CONTRATOS_POR_VISTA.md`

---

## 4) IoT + Bridge
- Dispositivo publica a HiveMQ.
- Bridge en Raspberry reenvia a Vercel.

Docs clave:
- `Docs/RASPBERRY_BRIDGE.md`
- `Docs/REGLAS_INTERPRETACION_IOT.md`

---

## 5) Frontend + Design System
- Tokens + UI base en `Docs/estilos y diseños.md`
- Login parallax: `Docs/IMAGENES_LOGIN.md`

---

## 6) Pruebas y deploy
- Pruebas E2E: `Docs/PRUEBAS_E2E.md`
- Checklist deploy: `Docs/CHECKLIST_DEPLOY.md`

---

## 7) Ruta corta para un dev nuevo
1. Leer `Docs/MAPA_ECOSISTEMA.md`
2. Leer `Docs/ARQUITECTURA_PROYECTO.md`
3. Ejecutar `Docs/SQL_SCHEMA.sql`
4. Probar endpoints con `Docs/PRUEBAS_E2E.md`


## 8) Primer dia del dev (script rapido)
1. Clonar repo y abrir kittypau_2026_hivemq.
2. Configurar .env.local con variables de Vercel (solo frontend).
3. Verificar Docs/CHECKLIST_DEPLOY.md (envs + schema cache).
4. Generar ccess_token en Supabase Auth.
5. Ejecutar pruebas minimas en Docs/PRUEBAS_E2E.md (API directa).



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
