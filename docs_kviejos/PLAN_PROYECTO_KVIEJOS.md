# Plan de Proyecto — KViejos

## Objetivo
Construir un MVP funcional y demostrable (hogar piloto) que detecte eventos de riesgo y entregue alertas y recordatorios, reutilizando la plataforma tecnica existente en Kittypau.

## Fases

### Fase 1 — Definicion (documental)
- Contexto canonico y decisiones
- Mercado, clientes, propuesta de valor
- Definicion MVP (sensores, eventos, alertas)
- Riesgos y etica (consentimiento y privacidad)

### Fase 2 — Tecnica (plataforma)
- Modelo de datos y migraciones iniciales
- API de eventos/alertas
- Bridge/hub local (Raspberry Pi) emitiendo eventos
- Admin interno para configuracion y monitoreo

### Fase 3 — Piloto (hogar real)
- Instalacion guiada (checklist)
- Observabilidad y soporte
- Ajuste de reglas y reduccion de falsos positivos

## Entregables del MVP
- App web/movil (familia) con:
  - "Estado de hoy" (eventos recientes, alertas activas)
  - historial por dia/semana
  - configuracion basica (horarios de medicamento)
- Canal TV:
  - especificacion de overlay y disparo (fase MVP: Android TV app o dispositivo intermedio)
- Bridge/hub:
  - envio de eventos MQTT -> backend
  - heartbeat de salud
- Admin:
  - tabla de hogares, sensores, contactos
  - log de eventos (auditable)

## Alcance fuera del MVP
- IA de habitos avanzada (deteccion de anomalias multi-sensor)
- Vision por camara como feature base
- Integracion con aseguradoras/sector salud

## Supuestos operativos
- 1 hogar piloto con 3-6 sensores
- WiFi estable o red dedicada
- 1-2 familiares usuarios

