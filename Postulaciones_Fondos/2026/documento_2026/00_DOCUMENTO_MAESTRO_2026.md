# Documento Maestro 2026 - Kittypau

Fecha de corte: 2026-03-05
Alcance: postulacion dual 2026 a Start-Up Chile y Corfo Semilla Inicia.

## 1. Resumen ejecutivo
Kittypau es una plataforma IoT de monitoreo de hidratacin y alimentacin para mascotas, con arquitectura cloud y analitica incremental.
El proyecto combina hardware KPCL + backend + aplicacion web para pasar de cuidado reactivo a cuidado preventivo basado en datos.

La estrategia 2026 mantiene una narrativa unica y se adapta por fondo:
- Start-Up Chile: foco en escalamiento, ejecucion y traccin.
- Semilla Inicia: foco en innovacion, vlidacion y plan de crecimiento.

## 2. Base tecnica consolidada (fuentes del repo)
Estado tecnico respaldado por documentacin activa:
- Arquitectura y flujo: `Docs/ARQUITECTURA_PROYECTO.md`
- Estado de implementacion: `Docs/ESTADO_AVANCE.md`
- Contratos API: `Docs/FRONT_BACK_APIS.md`
- Esquema SQL y reglas: `Docs/SQL_SCHEMA.sql`, `Docs/SQL_MAESTRO.md`
- Operacion Bridge: `Docs/RASPBERRY_BRIDGE.md`, `Docs/BRIDGE_HEALTHCHECK.md`

Sintesis tecnica til para postulacion:
1. Flujo IoT operativo: dispositivo -> MQTT -> bridge -> API -> DB.
2. CRUD de mascotas/dispositivos + lecturas + vlidaciones backend.
3. Hardening API (rate limit, idempotencia webhook, audit logs).
4. Base para admin dashboard y monitoreo operativo.

## 3. Base de negocio y finanzas (fuentes del repo)
Referencias principales:
- `Docs/ANALISIS_ECONOMICO_KITTYPAU.md`
- `Docs/KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md`
- `Docs/KPCL_CATALOGO_COMPONENTES_Y_COSTOS.md`

Narrativa financiera 2026:
- Modelo recomendado: hardware + suscripcion (Camino A).
- KPI central: `LTV/CAC > 3`.
- Estructura de costos: BOM + manufactura + overhead + cloud + operacin.
- Indicadores de ejecucion: margen unitario, MRR, churn, CAC, break-even.

## 4. Base historica de postulaciones (2025 -> 2026)
Referencias clave de legado:
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/03_Start_Up_Chile_Build_2025/*`
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/01_CORFO_CORFO_SEMILLA_INICIA_2026/*`
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/00_Estrategia_y_Material_General/*`

Elementos retilizados:
1. Problema y propuesta de valor.
2. Bloques de mercado/competencia.
3. Estructura de anexos legales y equipo.
4. Estructura de formulario y checklist por fondo.

## 5. Estrategia de postulacion 2026
### Start-Up Chile
Objetivo: mostrar ejecucion, escalabilidad y readiness del equipo.
Eje de evidencia: prototipo funcional, flujo tecnico desplegable, pilotos y roadmap comercial.

### Semilla Inicia
Objetivo: demostrar innovacion aplicada, vlidacion y potencial de crecimiento.
Eje de evidencia: diferenciacion tecnica, plan de trabajo, presupuesto elegible y anexos robustos.

## 6. Riesgos de postulacion y mitigacion
1. Riesgo: narrativa dispersa entre docs tecnicos y comerciales.
Mitigacion: usar como unica fuente este paquete `documento_2026`.

2. Riesgo: arrastre de datos 2025 no vigentes.
Mitigacion: vlidar campos personales/legales y montos antes de envio.

3. Riesgo: claims sin respaldo documental.
Mitigacion: cada afirmacion del formulario debe mapear a anexo verificable.

## 7. Salidas documentales 2026 (este paquete)
- `documento_2026/01_NARRATIVA_UNIFICADA_2026.md`
- `documento_2026/02_PROPUESTA_VALOR_MERCADO_2026.md`
- `documento_2026/03_BASE_TECNICA_EVIDENCIA_2026.md`
- `documento_2026/04_MODELO_NEGOCIO_FINANZAS_2026.md`
- `documento_2026/05_PLAN_POSTULACION_DUAL_2026.md`
- `documento_2026/06_MATRIZ_EVIDENCIA_Y_ANEXOS_2026.md`
- `documento_2026/07_CHECKLIST_FINAL_ENVIO_2026.md`

## 8. Decision operacinal
Se recomienda mantener una sola narrativa madre y derivar versines cortas por fondo.
La carpeta `Docs/Postulaciones Fondos/2026` queda como espacio oficial de trabajo 2026.

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



