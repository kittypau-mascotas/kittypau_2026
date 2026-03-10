# KViejos — Contexto Canonico

## Resumen
KViejos es un ecosistema de monitoreo y asistencia para adultos mayores en el hogar, orientado a:
- detectar riesgos (gas/humo/agua, ausencia de movimiento, puerta abierta, etc.),
- entregar recordatorios (medicamentos, rutinas),
- alertar a familiares y cuidadores en tiempo real,
- usando como canal principal la TV (overlay/avisos) y como canal secundario la app (familiares).

Categoria: AgingTech / Smart Home / CareTech.

## Problema
En hogares con adultos mayores se repiten patrones:
- eventos de riesgo domestico (gas/humo/agua),
- caidas o ausencia prolongada de movimiento,
- olvido de medicamentos y rutinas,
- baja adopcion de apps: la TV es el canal mas estable.

## Usuarios y Clientes (quien paga vs quien usa)
- Usuario primario (beneficiario): adulto mayor.
- Usuario operacional: familiar/cuidador (app movil).
- Cliente/pagador: familia, cuidador formal, residencia/condominio (B2B2C).

## Propuesta de valor (diferenciadores)
- TV como canal de alta adherencia: avisos claros, persistentes y no invasivos.
- Alertas tempranas basadas en eventos + reglas (y luego IA).
- Setup por kit (hub + sensores) con instalacion guiada.
- Historial auditable de eventos y acciones.

## Alcance (MVP realista)
MVP enfocado en eventos discretos, sin IA pesada:
- Sensores: movimiento (PIR), apertura (reed), gas/humo, fuga de agua, boton SOS (opcional).
- Hub local: Raspberry Pi (bridge) o ESP32 + bridge.
- Transporte: MQTT (eventos) + HTTP (admin/config).
- Plataforma: Supabase (Postgres) + Next.js (web/app) + Admin.
- Notificaciones: in-app y email; push movil se evalua en fase posterior.

## Decisiones vigentes
1. Stack base: reusar al maximo el stack de Kittypau (Next.js + Supabase + Bridge/MQTT + APK Capacitor).
2. El sistema se define por "eventos y alertas" (no por telemetria continua al inicio).
3. Privacidad por defecto: camaras/vision solo bajo consentimiento explicito y con modo "solo metadatos" como opcion.
4. Siempre debe existir un modo degradado offline: el hub local puede emitir alertas locales (buzzer/TV) si la nube cae.

## Decisiones NO aprobadas (en pausa)
- Deteccion de caidas por video como feature default del MVP.
- Dependencia obligatoria de servicios pagos (se prioriza stack free tier cuando sea posible).

## Metricas iniciales (MVP)
- Tiempo a detectar evento (latencia end-to-end): objetivo < 5s en LAN/WiFi.
- Falsos positivos: objetivo < 1 por semana por hogar (por regla).
- Setup: objetivo < 30 min (instalacion basica).
- Retencion: uso semanal de familiares (apertura app + consulta estado).

## Riesgos principales
- Privacidad (datos sensibles del hogar).
- Responsabilidad legal por alertas (no prometer "prevencion total").
- Confiabilidad del hardware e instalacion (calidad de sensores y WiFi).

## Backlog derivado (alto nivel)
Ver [BACKLOG.md](BACKLOG.md).

