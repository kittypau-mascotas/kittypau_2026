# Indice de Documentacion (Kittypau)

> Entrada rpida:
> - [README.md](README.md) - puerta de entrada para humanos y agentes
> - [ESTADO_PROYECTO_ACTUAL.md](ESTADO_PROYECTO_ACTUAL.md) - foto viva del estado del proyecto

> Fuentes maestras:
> - [FUENTE_DE_VERDAD.md](FUENTE_DE_VERDAD.md) - mapa canonico de activos, legacy, tablas y flujos
> - [PLAN_MAESTRO.md](PLAN_MAESTRO.md) - gua maestra viva de producto, arquitectura y estrategia
> - [SQL_MAESTRO.md](SQL_MAESTRO.md) - base de datos (orden de ejecucion)
> - [GITHUB_MAESTRO.md](GITHUB_MAESTRO.md) - flujo de trabajo y colaboracion

---

## Investigación / Data Science

### Documentos maestros de investigación
- [09_Investigacion/README.md](../09_Investigacion/README.md) - entrada operativa completa del ecosistema de investigación
- [09_Investigacion/GLOSARIO.md](../09_Investigacion/GLOSARIO.md) - devices, features, clases, parámetros globales
- [09_Investigacion/EXPERIMENT_TRACKER.md](../09_Investigacion/EXPERIMENT_TRACKER.md) - tabla de todos los experimentos (Exp01–11)
- [09_Investigacion/ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md](../09_Investigacion/ESTADO_PROYECTO_Y_NUEVA_DIRECCION.md) - por qué se archivaron Alpha/Gamma/Delta y nació Alpha v2

### Ciclo Alpha v2 — Detección por segmentos (ACTIVO)
- [Ciclo Alpha v2 / Índice](../09_Investigacion/Ciclo%20Alpha%20v2/00_INDICE_AV2.md) - ⭐ MOC principal del Ciclo Alpha v2
- [Ciclo Alpha v2 / Arquitectura del pipeline](../09_Investigacion/Ciclo%20Alpha%20v2/01_ARQUITECTURA_PIPELINE.md) - fases Fase 0A→0C→1→2 y tecnologías
- [Ciclo Alpha v2 / Dispositivo y datos](../09_Investigacion/Ciclo%20Alpha%20v2/02_DISPOSITIVO_Y_DATOS.md) - KPCL0034, ambos UUIDs, 246k lecturas procesadas
- [Ciclo Alpha v2 / Detección de segmentos](../09_Investigacion/Ciclo%20Alpha%20v2/03_DETECCION_SEGMENTOS.md) - algoritmo `01_genera_candidatos.py` paso a paso
- [Ciclo Alpha v2 / Matemática shape features](../09_Investigacion/Ciclo%20Alpha%20v2/04_MATEMATICA_SHAPE_FEATURES.md) - ⭐ fórmulas, código, monotonía / R² / ZCR / coseno
- [Ciclo Alpha v2 / Anotación y categorías](../09_Investigacion/Ciclo%20Alpha%20v2/05_ANOTACION_Y_CATEGORIAS.md) - 3 categorías, workflow, 304 eventos
- [Ciclo Alpha v2 / Umbrales y reglas](../09_Investigacion/Ciclo%20Alpha%20v2/06_UMBRALES_Y_REGLAS.md) - `umbrales.json` v1.2, orden de evaluación
- [Ciclo Alpha v2 / Resultados 304 anotaciones](../09_Investigacion/Ciclo%20Alpha%20v2/07_RESULTADOS_304_ANOTACIONES.md) - estadísticas completas, separación en σ
- [Ciclo Alpha v2 / App de anotación](../09_Investigacion/Ciclo%20Alpha%20v2/08_APP_ANOTACION_AV2.md) - 6 tabs Streamlit, dark theme, correcciones aplicadas

### Contexto operativo (KPCL0034 / KPCL0036)
- [09_Investigacion/01_GUIA_DASHBOARD_KPCL.md](../09_Investigacion/01_GUIA_DASHBOARD_KPCL.md) - guía del dashboard interactivo
- [09_Investigacion/02_REGLAS_EVENTOS_ALIMENTACION.md](../09_Investigacion/02_REGLAS_EVENTOS_ALIMENTACION.md) - reglas canónicas de eventos (fuente de verdad)
- [09_Investigacion/05_ANALISIS_COLAB_KPCL0034_07052026.md](../09_Investigacion/05_ANALISIS_COLAB_KPCL0034_07052026.md) - análisis exploratorio Colab (export Mayo 2026)

---

## Canon activo
- [ARQUITECTURA_PROYECTO.md](ARQUITECTURA_PROYECTO.md)
- [FUENTE_DE_VERDAD.md](FUENTE_DE_VERDAD.md)
- [DOC_MAESTRO_DOMINIO.md](DOC_MAESTRO_DOMINIO.md)
- [KPCL_CATALOGO_COMPONENTES_Y_COSTOS.md](KPCL_CATALOGO_COMPONENTES_Y_COSTOS.md)
- [ADMIN_FINANZAS_CONTAINER_SPEC.md](ADMIN_FINANZAS_CONTAINER_SPEC.md)
- [SQL_SCHEMA.sql](SQL_SCHEMA.sql)
- [SQL_FINANZAS_KITTYPAU.sql](SQL_FINANZAS_KITTYPAU.sql)
- [BATERIA_ESTIMADA_KPCL.md](BATERIA_ESTIMADA_KPCL.md)
- [investigacion/AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md](investigacion/AUDITORIA_KPCL0036_ERROR_PESO_SIN_BATERIA.md) - auditoria canonica del CSV de peso sin tara
- [investigacion/SQL_VALIDACION_KPCL0036_TARE_FILL.sql](investigacion/SQL_VALIDACION_KPCL0036_TARE_FILL.sql) - consulta canonica de vlidacion tare/plato/llenado
- [investigacion/SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql](investigacion/SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql) - export canonico del experimento compartido de ambos KPCL con salida separada por device
- [investigacion/AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md](investigacion/AUDITORIA_KPCL0034_KPCL0036_PRUEBA_SIN_CARGADOR.md) - auditoria canonica del CSV de prueba sin cargador y de los hitos por device
- [investigacion/README.md](investigacion/README.md) - indice de la carpeta de pruebas KPCL con exports por device y graficos separados
- [FRONT_BACK_APIS.md](FRONT_BACK_APIS.md)
- [BRIDGE_HEALTHCHECK.md](BRIDGE_HEALTHCHECK.md)
- [ESTADO_BRIDGE_ACTUAL.md](ESTADO_BRIDGE_ACTUAL.md)
- [FLUJO_REGISTRO_DISPOSITIVO.md](FLUJO_REGISTRO_DISPOSITIVO.md)
- [POPUP_REGISTRO_SPEC.md](POPUP_REGISTRO_SPEC.md)
- [PRUEBAS_E2E.md](PRUEBAS_E2E.md)
- [AUTOMATIZACION_TESTS.md](AUTOMATIZACION_TESTS.md)
- [CHECKLIST_DEPLOY.md](CHECKLIST_DEPLOY.md)
- [PIPELINE_CICD.md](PIPELINE_CICD.md)
- [RASPBERRY_BRIDGE.md](RASPBERRY_BRIDGE.md)
- [TOPICOS_MQTT.md](TOPICOS_MQTT.md)
- [TIMESTAMP_IOT.md](TIMESTAMP_IOT.md)
- [GITHUB_FLUJO_OFICIAL.md](GITHUB_FLUJO_OFICIAL.md)
- [GITHUB_GOBERNANZA_COLABORACION.md](GITHUB_GOBERNANZA_COLABORACION.md)
- [GIT_CLI.md](GIT_CLI.md)
- [VERCEL_CLI.md](VERCEL_CLI.md)
- [SUPABASE_CLI.md](SUPABASE_CLI.md)
- [CLI_ORQUESTACION_HF_SUPABASE_VERCEL.md](CLI_ORQUESTACION_HF_SUPABASE_VERCEL.md) - chatbot del gato
- [chatbot/README.md](chatbot/README.md) - archivo unico del chatbot con indicaciones de contenido al comienzo
- [HIVEMQ_MQTT_CLI.md](HIVEMQ_MQTT_CLI.md)
- [RASPBERRY_CLI.md](RASPBERRY_CLI.md)
- [KITTYPAU_DEV_TOOLKIT.md](KITTYPAU_DEV_TOOLKIT.md)

## Plan y estado
- [ESTADO_PROYECTO_ACTUAL.md](ESTADO_PROYECTO_ACTUAL.md) - estado vivo y resumido del proyecto
- [PLAN_MEJORA_PRIORIZADO.md](PLAN_MEJORA_PRIORIZADO.md) - plan de mejora corto y accinable
- [TAREAS_PENDIENTES_ACTUALES.md](TAREAS_PENDIENTES_ACTUALES.md) - backlog operativo vivo por area
- [FONDOS_RASTREADOS_ACTUALES.md](FONDOS_RASTREADOS_ACTUALES.md) - radar vivo de fondos y postulaciones
- [FINANZAS/README.md](FINANZAS/README.md) - entrada al registro financiero operativo
- [FINANZAS/COMPROBANTES/README.md](FINANZAS/COMPROBANTES/README.md) - carpeta canonica de boletas, transferencias y respaldos
- [contexto.md](contexto.md)
- [AUDITORIA_COHERENCIA_ECOSISTEMA.md](AUDITORIA_COHERENCIA_ECOSISTEMA.md)
- [GUIA_DECISION.md](GUIA_DECISION.md)
- [EJECUCION_GUIA_DECISION_2026-03-09.md](EJECUCION_GUIA_DECISION_2026-03-09.md) - puntero historico consolidado en la gua de decision
- [PLAN_PENDIENTES_APP_WEB_KITTYPAU.md](PLAN_PENDIENTES_APP_WEB_KITTYPAU.md)
- [PLAN_PROYECTO_KITTYPAU.md](PLAN_PROYECTO_KITTYPAU.md) - puntero historico consolidado en el plan maestro
- [PLAN_IMPLEMENTACION.md](PLAN_IMPLEMENTACION.md)
- [PLAN_3PRS_UNION_LIMPIA.md](PLAN_3PRS_UNION_LIMPIA.md)
- [PLAN_MEJORA_DB_ACTUAL.md](PLAN_MEJORA_DB_ACTUAL.md)
- [ESTADO_AVANCE.md](ESTADO_AVANCE.md) - bitacora historica consolidada
- [NOTAS_IMPLEMENTACION.md](NOTAS_IMPLEMENTACION.md)
- [MAPA_ECOSISTEMA.md](MAPA_ECOSISTEMA.md)
- [CIBERSEGURIDAD.md](CIBERSEGURIDAD.md)
- [PLAN_FRONTEND_SEPARADO_APP.md](PLAN_FRONTEND_SEPARADO_APP.md) - puntero historico consolidado en arquitectura y plan maestro
- [ANALISIS_ECONOMICO_KITTYPAU.md](ANALISIS_ECONOMICO_KITTYPAU.md) - puntero historico consolidado en el documento maestro
- [KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md](KITTYPAU_MODELO_ESTRATEGICO_Y_METRICAS.md) - puntero historico consolidado en el documento maestro
- [Contexto_Mercado_Kittypau/README.md](Contexto_Mercado_Kittypau/README.md) - contexto de mercado y posicionamiento
- [PMO/00_PMO_INDEX.md](PMO/00_PMO_INDEX.md) - indice PMO y gestion de proyecto
- [Postulaciones Fondos/2026/README.md](Postulaciones Fondos/2026/README.md) - indice de la carpeta de postulaciones 2026
- [Postulaciones Fondos/2026/00_SISTEMA_TRABAJO.md](Postulaciones Fondos/2026/00_SISTEMA_TRABAJO.md) - sistema maestro para coordinar fondos 2026 en equipo
- [Postulaciones Fondos/2026/01_GUIA_FONDOS_CHILE_LATAM_GLOBAL.md](Postulaciones Fondos/2026/01_GUIA_FONDOS_CHILE_LATAM_GLOBAL.md) - punto de partida para armar la ruta de postulacion 2026
- [Postulaciones Fondos/2026/02_CHECKLIST_ELEGIBILIDAD_2026.md](Postulaciones Fondos/2026/02_CHECKLIST_ELEGIBILIDAD_2026.md) - checklist maestro de requisitos por fondo para 2026
- [Postulaciones Fondos/2026/documento_2026/README.md](Postulaciones Fondos/2026/documento_2026/README.md) - indice del paquete maestro 2026
- [Postulaciones Fondos/2026/CORFO_SEMILLA_INICIA_2026/README.md](Postulaciones Fondos/2026/CORFO_SEMILLA_INICIA_2026/README.md) - indice propio del paquete Semilla Inicia 2026

## Carpetas (decision)
- Mantener activas:
  - `chatbot/` - documentacin funcional viva del chatbot.
  - `Contexto_Mercado_Kittypau/` - base estrategica para postulaciones y mercado.
  - `FINANZAS/` - trazabilidad financiera y comprobantes.
  - `investigacion/` - pruebas KPCL y auditorias tecnicas.
  - `PMO/` - gestion de proyecto y control.
  - `Postulaciones Fondos/` - operacin de fondos y postulaciones 2026.
  - `assets/` - recursos visuales de apoyo para docs.
- Mantener como historico (solo lectura):
  - `archive/` - historial no canonico.
  - `kittypau_1a_docs_legacy/` - legado de etapas anteriores.
- Eliminar o mover fuera del repo si reaparecen:
  - carpetas experimentales no versinadas (ej. `Samsung Tizen Experiment`, `Android TV Plan`) cuando no esten conectadas al roadmap activo.

## UI / UX
- [IMAGENES_LOGIN.md](IMAGENES_LOGIN.md)
- [estilos y diseños.md](estilos y diseños.md)
- [CATALOGO_GRAFICOS.md](CATALOGO_GRAFICOS.md)
- [VISTAS_APP.md](VISTAS_APP.md)
- [APK_ANDROID_STUDIO_KITTYPAU.md](APK_ANDROID_STUDIO_KITTYPAU.md)
- [CHECKLIST_UX_UI_APK.md](CHECKLIST_UX_UI_APK.md)

## Admin / operacin
- [ADMIN_PORTAL_PLAN.md](ADMIN_PORTAL_PLAN.md)
- [ADMIN_DASHBOARD_INFORMATION_ARCHITECTURE.md](ADMIN_DASHBOARD_INFORMATION_ARCHITECTURE.md) - puntero historico consolidado en el portal admin
- [VALIDACION_ADMIN_DASHBOARD.md](VALIDACION_ADMIN_DASHBOARD.md) - puntero historico consolidado en el portal admin
- [ADMIN_TEST_SUITE.md](ADMIN_TEST_SUITE.md)
- [CIERRE_FINAL_ADMIN_CHECKLIST.md](CIERRE_FINAL_ADMIN_CHECKLIST.md)

## Archivos / legacy
- [archive/analitica/KittyPau_Arquitectura_Datos_v3.md](archive/analitica/KittyPau_Arquitectura_Datos_v3.md)
- [archive/analitica/CAPAS_DATOS_ANALITICA_ML_IA.md](archive/analitica/CAPAS_DATOS_ANALITICA_ML_IA.md)
- [TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md](TRANSFORMACIONES_ANALITICAS_LOG10_FOURIER.md)
- [notebooks/](../notebooks/)
- [Analisis_Estadistico_ML_IA/INDEX.md](../Analisis_Estadistico_ML_IA/)
- [kittypau_1a_docs_legacy/](kittypau_1a_docs_legacy/)
- [Postulaciones Fondos/2026/](Postulaciones Fondos/2026/)











