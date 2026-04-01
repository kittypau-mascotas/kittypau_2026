# Bosquejo Deck - Postulacion startuplab.01 (Kittypau)

Objetivo: preparar un deck corto, consistente con formulario y evidencia del repo.
Formato recomendado: 10-12 slides (PDF).

## Slide 1 - Portada
- Kittypau (producto: Kittypau)
- One-liner: Monitoreo predictivo IoT para bienestar de mascotas.
- Nombre del equipo y contacto.

## Slide 2 - Problema
- Falta de visibilidad continua de hidratacion/alimentacion.
- Deteccion tardia de problemas de salud.
- Cuidado reactivo, mayor costo y menor calidad de vida.

## Slide 3 - Solucion
- Ecosistema: dispositivo IoT + backend + app.
- Flujo: sensor -> MQTT -> bridge -> API -> DB -> app.
- Alertas tempranas + historial objetivo.

## Slide 4 - Tecnologia y TRL
- Estado actual: TRL 6 (prototipo funcional con datos en vivo + deploy).
- Validacion tecnica E2E documentada (IoT -> MQTT -> bridge -> API -> DB -> realtime).
- Base para evolucion predictiva con analitica/ML.
- Diferenciación analítica (feature engineering + patrones): `log10(x + 1)` en ingestión (raw + log) + Fourier/FFT en servicio analítico para rutinas/cambios de comportamiento. (ver `Docs/TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md`)

## Slide 5 - Mercado objetivo
- ICP B2C: duenos urbanos digitalizados.
- Segmento B2B2C: clinicas veterinarias y comercios pet.
- Oportunidad inicial en Chile, expansion LATAM.

## Slide 6 - Modelo de negocio
- Hardware + suscripcion (HaaS).
- Ingreso por venta inicial + ingreso recurrente premium.
- KPIs foco: activacion, retencion, conversion y churn.

## Slide 7 - Competencia y diferenciacion
- Directos: pet-tech de monitoreo basico.
- Indirectos: dispensadores y apps manuales.
- Diferenciador: capa de datos accionables y enfoque preventivo/predictivo.

## Slide 8 - Validacion y traccion
- **E2E operativo y validado**: IoT -> HiveMQ -> Bridge (Raspberry) -> `/api/mqtt/webhook` (Vercel) -> Supabase (DB + Realtime). (`Docs/PRUEBAS_E2E.md`, `Docs/ARQUITECTURA_PROYECTO.md`)
- **Produccion activa**: app + API desplegadas en Vercel (`https://kittypau-app.vercel.app`). (ver `Docs/ESTADO_AVANCE.md`)
- **Ingestion real**: webhook guarda lecturas y actualiza estado del dispositivo (`last_seen`, `battery_level`) via trigger. (ver `Docs/SQL_SCHEMA.sql` + `Docs/ESTADO_AVANCE.md`)
- **Evidencia tecnica trazable en repo**: contratos API, bridge 24/7, topicos MQTT, esquema SQL + RLS, suite de pruebas y validacion de admin. (`Docs/FRONT_BACK_APIS.md`, `Docs/RASPBERRY_BRIDGE.md`, `Docs/TOPICOS_MQTT.md`, `Docs/AUTOMATIZACION_TESTS.md`, `Docs/VALIDACION_ADMIN_DASHBOARD.md`)
- **Senal cuantitativa de datos**: BD con `387.000+` lecturas registradas (verificado `2026-03-05`). (`Docs/PMO/DOSSIER_CORFO_SEMILLA_INICIA.md`)
- **Piloto planificado (traccion temprana)**: 10 usuarios piloto (onboarding + seguimiento + metricas) planificados para `abr-jun 2026`. (`Docs/PMO/03_SCHEDULE.md`, `Docs/PMO/09_COMMUNICATIONS.md`)

## Slide 9 - Impacto climatico (alineacion postulacion)
- **Mitigacion (desperdicio)**: medicion continua de consumo para optimizar porciones/recargas y detectar cambios anomalos (reduccion de desperdicio de alimento/agua por sobre-servicio o recarga innecesaria). (campos `weight_grams`, `water_ml`, `flow_rate` en `Docs/SQL_SCHEMA.sql` + logica en `Docs/MODELO_DATOS_IA_FORMULAS_KITTYPAU.md`)
- **Monitoreo trazable**: lecturas con timestamp (`recorded_at`, `ingested_at`) y trazabilidad por dispositivo (`device_id` KPCL) para auditoria y metricas por hogar/mascota. (`Docs/SQL_SCHEMA.sql`)
- **Adaptacion/resiliencia (riesgo ambiental + continuidad)**: contexto ambiental (`temperature`, `humidity`, `light_*`) y capa operativa (deteccion bridge/dispositivo offline + `audit_events`) para alertas y continuidad de monitoreo. (`Docs/TOPICOS_MQTT.md`, `Docs/ESTADO_AVANCE.md`, `Docs/SQL_SCHEMA.sql`)

## Slide 10 - Roadmap 12 meses
- **Mes 1-3 (estabilizacion MVP/piloto)**: bridge 24/7 (systemd + watchdog), hardening de ingestion, calidad de datos y observabilidad (admin overview + health-check). (`Docs/RASPBERRY_BRIDGE.md`, `Docs/VALIDACION_ADMIN_DASHBOARD.md`)
- **Mes 4-6 (piloto medible)**: piloto de 10 usuarios + metricas (retencion, NPS, conversion free->paid) + iteracion por feedback. (`Docs/PMO/03_SCHEDULE.md`, `Docs/PMO/09_COMMUNICATIONS.md`)
- **Mes 7-9 (escala de pilotos)**: ampliar piloto a 30-50, reducir COGS y preparar canal B2B2C (clinicas/tiendas). (`Docs/PMO/03_SCHEDULE.md`, `Docs/KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md`)
- **Mes 10-12 (lanzamiento inicial)**: packaging comercial (hardware + suscripcion), readiness inversion/postulacion fondos mayores y operacion con SLAs basicos. (`Docs/KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md`, `Docs/PMO/01_PROJECT_CHARTER.md`)

## Slide 11 - Equipo
- Mauricio Carcamo: liderazgo negocio/producto, UX y estrategia comercial.
- Javier Suarez: desarrollo tecnico IoT/hardware + backend/software (MQTT, bridge, API, DB).
- Brechas: certificaciones/regulacion y manufactura (escala), data science/analitica aplicada, y escalamiento comercial B2B/B2B2C (veterinarias/retail).

## Slide 12 - Lo que buscamos en startuplab.01
- **Go-to-market medible**: diseno/ejecucion de piloto (KPIs, pricing, onboarding, retencion) y preparacion de canal (vet/retail).
- **Soporte hardware para escala**: industrializacion, QA, certificaciones/regulacion y estrategia de manufactura.
- **Conexiones**: pilotos con duenos y partners (clinicas/tiendas) + red de inversionistas para siguiente ronda.

---

## Checklist de consistencia antes de exportar PDF
1. Mismos datos que el formulario (sin contradicciones).
2. Limpiar placeholders: RUT, telefono, cap table, finanzas reales.
3. Incluir solo claims con respaldo documental.
4. Revisar ortografia y diseno visual legible.
5. Nombre final sugerido: `Deck_Kittypau_startuplab01_2026.pdf`.

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
