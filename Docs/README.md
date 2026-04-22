# Docs de Kittypau

Esta carpeta es la puerta de entrada a la documentacin viva del proyecto.

## Leer primero
1. [`INDEX.md`](INDEX.md) - mapa general de carpetas, documentos activos y piezas historicas.
2. [`ESTADO_PROYECTO_ACTUAL.md`](ESTADO_PROYECTO_ACTUAL.md) - foto viva del estado actual del producto.
3. [`FUENTE_DE_VERDAD.md`](FUENTE_DE_VERDAD.md) - reglas canonicas de activos, flujos y referencias.
4. [`PLAN_MAESTRO.md`](PLAN_MAESTRO.md) - documento maestro de producto, arquitectura y estrategia.
5. [`PLAN_MEJORA_PRIORIZADO.md`](PLAN_MEJORA_PRIORIZADO.md) - siguente paso ordenado del proyecto.
6. [`FONDOS_RASTREADOS_ACTUALES.md`](FONDOS_RASTREADOS_ACTUALES.md) - radar vivo de fondos y postulaciones.
7. [`Postulaciones Fondos/2026/00_SISTEMA_TRABAJO.md`](Postulaciones Fondos/2026/00_SISTEMA_TRABAJO.md) - sistema maestro para coordinar fondos 2026.
8. [`SQL_MAESTRO.md`](SQL_MAESTRO.md) - orden sugerido para base de datos y SQL.
9. [`CLI_ORQUESTACION_HF_SUPABASE_VERCEL.md`](CLI_ORQUESTACION_HF_SUPABASE_VERCEL.md) - gua de orquestacion tecnica del chatbot y backend IA.
10. [`chatbot/README.md`](chatbot/README.md) - archivo unico de entrada para la documentacin del chatbot.
11. [`investigacion/README.md`](investigacion/README.md) - indice vivo de pruebas KPCL y auditorias tecnicas.

## Capas de lectura
- Producto y arquitectura: `PLAN_MAESTRO.md`, `ARQUITECTURA_PROYECTO.md`, `DOC_MAESTRO_DOMINIO.md`
- Operacion y calidad: `ESTADO_PROYECTO_ACTUAL.md`, `ESTADO_AVANCE.md` (historico), `PRUEBAS_E2E.md`, `GUIA_DECISION.md`
- Empresa y finanzas: `FINANZAS/README.md`, `FINANZAS/COMPROBANTES/README.md`, `FONDOS_RASTREADOS_ACTUALES.md`
- Empresa y postulaciones: `TAREAS_PENDIENTES_ACTUALES.md`, `Postulaciones Fondos/2026/README.md`, `Postulaciones Fondos/2026/00_SISTEMA_TRABAJO.md`
- Backlog operativo vivo: `TAREAS_PENDIENTES_ACTUALES.md`
- Base de datos y bridge: `SQL_MAESTRO.md`, `SQL_SCHEMA.sql`, `RASPBERRY_BRIDGE.md`
- Postulaciones 2026: `Postulaciones Fondos/2026/README.md`
- Legacy y archivo: `archive/`, `kittypau_1a_docs_legacy/`

## Regla de uso
- Si un doc compite con otro, primero identifica cual es la pieza viva.
- Si un doc ya qued consolidado, debe apuntar al vivo y no repetir el contenido completo.
- Si haces una busqueda nueva, empieza por `INDEX.md` o por el README del subpaquete correspondiente.

## Guardrail de encoding
- El repo ya tiene un chequeo activo contra mojibake y archivos no UTF-8.
- Script canonico: `scripts/check_encoding.py`
- Validacion local rapida:
  - `python scripts/check_encoding.py`
  - `npm --prefix kittypau_app run encoding-check`
- Validacion automatica:
  - `.husky/pre-commit` corre el check antes de `lint-staged`
  - `.github/workflows/pr-quality.yml` falla la PR si vuelve a entrar mojibake
