# Objetivos y preguntas (Análisis/ML/IA)

## Objetivo general
Convertir telemetría IoT en **métricas confiables**, **sesiones** y **insights** (alertas y patrones) con trazabilidad y versionado.

## Preguntas base (producto)
- ¿Está comiendo/bebiendo “dentro de su normal” hoy vs baseline 7d/30d?
- ¿Hay señales tempranas de cambio de rutina (frecuencia/horario)?
- ¿Hay riesgo operacional (offline, lecturas stale, sensor inestable)?

## Preguntas base (datos)
- ¿Qué porcentaje del día tiene data usable (missing rate)?
- ¿Qué tan fresco está el stream por dispositivo (SLO de frescura)?
- ¿Hay outliers/duplicados/relojes inválidos (`clock_invalid`)?

## Resultados esperados
- Resúmenes: diario/semanal por mascota.
- Alertas: severidad (`info|warning|alert`) + contexto de soporte.
- Reportes: exportables (veterinaria, seguimiento).

