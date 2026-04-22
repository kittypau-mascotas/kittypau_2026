# Guia de Decision (Actual)

## Objetivo
Elegir el ambiente correcto de trabajo segn la tarea.

---

## Ambientes disponibles
1. **Local (Next.js)**: desarrollo rapido, sin depender de cloud.
2. **Produccion (Cloud)**: Vercel + Supabase + HiveMQ + Raspberry Bridge.

---

## Cuando usar cada uno

### Local (Next.js)
Usar cuando:
- Estas desarrollando UI o API routes.
- Necesitas cambios rapidos con hot reload.
- No quieres depender de servicios externos.

### Produccion (Cloud)
Usar cuando:
- Necesitas una demo accesible desde cualquier lugar.
- Vas a probar flujo IoT real (Bridge + HiveMQ).
- Quieres vlidar E2E con datos reales.

---

## Flujo de trabajo recomendado
1. Desarrolla en local (Next.js).
2. Commit + push.
3. Vercel despliega automticamente.
4. Validas en produccion con `Docs/PRUEBAS_E2E.md`.

---

## Fuente de verdad
- Arquitectura: `Docs/ARQUITECTURA_PROYECTO.md`
- Ecosistema: `Docs/MAPA_ECOSISTEMA.md`

## Marco AIoT / PetTech (Alneacion 2026)

### Terminologia oficial recomendada
- **AIoT (Artificial Intelligence of Things)**: termino principal para Kittypau.
- **Intelligent IoT**: variante de comunicacion comercial.
- **Edge AI + IoT**: cuando parte del anlisis corre en dispositivo.
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
- Riesgo de deshidratacin por baja de consumo de agua en ventana corta.
- Cambios de conducta alimentaria (horario/frecuencia/cantidad).
- Riesgo de sobrepeso por patrnes de ingesta sostenidos.

### Modelo de negocio recomendado (3 capas)
1. **Hardware**: ingreso inicial por unidad.
2. **Suscripcion**: dashboard avanzado, recomendaciones y alertas.
3. **Data insights (futuro)**: datos anonimizados para partners (veterinarias, investigacion, marcas).
## Contexto de Expansion del Ecosistema (Fuente: Docs/contexto.md)
- **Foco actual (core)**: `Kittypau` se mantiene como plataforma PetTech AIoT para alimentacin e hidratacin de mascotas.
- **Expansion en evaluacion**: `Kitty Plant` (IoT para plantas) como segnda vertical, retilizando arquitectura y modelo de datos.
- **Vision de largo plazo**: `Senior Kitty` como posible tercera vertical para cuidados en hogar.
- **Estrategia transversal**: hardware como entrada + datos longitudinales + analitica para insights preventivos.
- **Producto y UX**: interfaz simple, menos friccion en onboarding y vista demo para explicar valor rapido.
- **Gobernanza tecnica**: conservar una base relacional coherente y contratos API estables entre web, app y dispositivos.

### Implicancias para App/Web (Kittypau)
1. `/today` y `navbar` deben mantener consistencia estricta entre mascota activa, `pet_id` y KPCL asociado.
2. Las decisiones visuales deben reforzar lectura rpida de estado real (alimentacin, hidratacin, ambiente, batera).
3. El backlog funcional prioriza confiabilidad de datos por sobre efectos visuales.
4. Cualquier expansin de vertical (plantas/senior) debe montarse sobre componentes retilizables del core.

## Decisiones de Gobernanza (Actualizado)
- No se aprueba la estrategia de multiples cuentas de Vercel por base de datos.
- Se mantiene una operacin controlada por proyecto/entorno con trazabilidad de cambios.
- Cualquier experimento (ej. Kitty Plant) no puede degradar estabilidad de Kittypau core.

## Validacion ejecutada
- Base de vlidacion: [EJECUCION_GUIA_DECISION_2026-03-09.md](EJECUCION_GUIA_DECISION_2026-03-09.md)
- `npm run type-check` -> OK
- `npm run build` -> OK
- `vercel ls` -> OK
- Produccion activa -> Ready
- Riesgos abiertos:
  - migrar `middleware` a `proxy` cuando corresponda,
  - mantener control de calidad en `/today` para cuentas tester,
  - homologar migraciones de batera en todos los entornos.


