# Documento Maestro 2026 - KittyPaw

Fecha de corte: 2026-03-05
Alcance: postulacion dual 2026 a Start-Up Chile y Corfo Semilla Inicia.

## 1. Resumen ejecutivo
KittyPaw es una plataforma IoT de monitoreo de hidratacion y alimentacion para mascotas, con arquitectura cloud y analitica incremental.
El proyecto combina hardware KPCL + backend + aplicacion web para pasar de cuidado reactivo a cuidado preventivo basado en datos.

La estrategia 2026 mantiene una narrativa unica y se adapta por fondo:
- Start-Up Chile: foco en escalamiento, ejecucion y traccion.
- Semilla Inicia: foco en innovacion, validacion y plan de crecimiento.

## 2. Base tecnica consolidada (fuentes del repo)
Estado tecnico respaldado por documentacion activa:
- Arquitectura y flujo: `Docs/ARQUITECTURA_PROYECTO.md`
- Estado de implementacion: `Docs/ESTADO_AVANCE.md`
- Contratos API: `Docs/FRONT_BACK_APIS.md`
- Esquema SQL y reglas: `Docs/SQL_SCHEMA.sql`, `Docs/SQL_MAESTRO.md`
- Operacion Bridge: `Docs/RASPBERRY_BRIDGE.md`, `Docs/BRIDGE_HEALTHCHECK.md`

Sintesis tecnica util para postulacion:
1. Flujo IoT operativo: dispositivo -> MQTT -> bridge -> API -> DB.
2. CRUD de mascotas/dispositivos + lecturas + validaciones backend.
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
- Estructura de costos: BOM + manufactura + overhead + cloud + operacion.
- Indicadores de ejecucion: margen unitario, MRR, churn, CAC, break-even.

## 4. Base historica de postulaciones (2025 -> 2026)
Referencias clave de legado:
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/03_Start_Up_Chile_Build_2025/*`
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/01_CORFO_Semilla_Inicia/*`
- `Docs/kittypau_1a_docs_legacy/business/04_Postulaciones_y_Fondos/00_Estrategia_y_Material_General/*`

Elementos reutilizados:
1. Problema y propuesta de valor.
2. Bloques de mercado/competencia.
3. Estructura de anexos legales y equipo.
4. Estructura de formulario y checklist por fondo.

## 5. Estrategia de postulacion 2026
### Start-Up Chile
Objetivo: mostrar ejecucion, escalabilidad y readiness del equipo.
Eje de evidencia: prototipo funcional, flujo tecnico desplegable, pilotos y roadmap comercial.

### Semilla Inicia
Objetivo: demostrar innovacion aplicada, validacion y potencial de crecimiento.
Eje de evidencia: diferenciacion tecnica, plan de trabajo, presupuesto elegible y anexos robustos.

## 6. Riesgos de postulacion y mitigacion
1. Riesgo: narrativa dispersa entre docs tecnicos y comerciales.
Mitigacion: usar como unica fuente este paquete `documento_2026`.

2. Riesgo: arrastre de datos 2025 no vigentes.
Mitigacion: validar campos personales/legales y montos antes de envio.

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

## 8. Decision operacional
Se recomienda mantener una sola narrativa madre y derivar versiones cortas por fondo.
La carpeta `Docs/Postulaciones Fondos/2026` queda como espacio oficial de trabajo 2026.

## Marco AIoT / PetTech (Alineacion 2026)

KittyPau se posiciona oficialmente como una plataforma **AIoT** (Artificial Intelligence of Things) para salud preventiva de mascotas.

Definicion oficial:
**KittyPau is an AIoT platform that monitors pet feeding and hydration cycles to generate health insights and preventive alerts.**

Categoria estrategica:
- **PetTech AIoT** = PetTech + IoT + IA.
- Hardware como puerta de entrada; datos + analitica como motor de valor.

Implicancia para postulaciones 2026:
- El producto no se presenta como "solo comedero inteligente".
- Se presenta como **plataforma de datos longitudinales de salud animal**.
- Modelo esperado: hardware + suscripcion + analitica/alertas preventivas.

Mensajes recomendados para formularios/pitch:
- AIoT pet care platform.
- AIoT platform for preventive pet health monitoring.
- The Fitbit for pets (como analogia de mercado).
