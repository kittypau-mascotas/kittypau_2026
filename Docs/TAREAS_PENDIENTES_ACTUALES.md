# Tareas Pendientes Actuales - Kittypau

Fecha de corte: 2026-04-01

> Esta lista es el backlog operativo vivo derivado de `ESTADO_PROYECTO_ACTUAL.md`.
> Usa esta hoja para ejecutar trabajo. Si hay conflicto, manda el snapshot vivo.

## 1. Bloqueadores transversales

- [ ] Mantener `ESTADO_PROYECTO_ACTUAL.md` como unica foto viva del proyecto.
- [ ] Evitar que backlog, implementacion y auditorias se presenten como estado actual.
- [ ] Cerrar la coherencia de `Docs/README.md`, `Docs/INDEX.md` y `Docs/FUENTE_DE_VERDAD.md` cuando cambie algun flujo principal.
- [ ] Registrar en cada cambio si el doc es vivo, seguimiento o historico.

## 2. Front

### P0
- [ ] Corregir la coherencia de `/today` entre `hero`, `navbar`, selector de mascota y cards.
- [ ] Asegurar que los estados vacios y loading expliquen si faltan datos o si no hay dispositivo vinculado.
- [ ] Eliminar fallbacks visuales que oculten el estado real de comida, agua y ambiente.
- [ ] Mantener estable el contrato de UI con `readings` aunque no exista telemetria de bateria.

### P1
- [ ] Estandarizar iconografia y componentes de ambiente.
- [ ] Revisar accesibilidad de tooltips, labels y mensajes de estado.
- [ ] Convertir el timeline/story en insights utiles y no solo narrativa.
- [ ] Verificar consistencia visual entre web, mobile y APK.

### P2
- [ ] Refinar empty states y microcopy en `today`, `story`, `pet`, `bowl` y `settings`.
- [ ] Dejar definidos componentes UI reutilizables para futuras verticales.

## 3. Back

### P0
- [ ] Mantener estables `/api/readings`, `/api/devices` y `/api/mqtt/webhook`.
- [ ] Validar que el fallback temporal de `/api/readings` no se vuelva deuda oculta.
- [ ] Alinear el manejo de sesiones operativas:
  - `device_operation_records`
  - `device_power_sessions`
  - `device_battery_cycles`
- [ ] Mantener observabilidad minima del bridge: health-check, timeout y recovery.

### P1
- [ ] Homologar entornos local, staging y prod para migraciones de `readings`.
- [ ] Definir pruebas de contrato para lecturas con y sin `battery_*`.
- [ ] Registrar alertas de datos anomales: gaps, lecturas negativas, saltos extremos.
- [ ] Revisar la politica de reintentos y error handling para webhook y bridge.

### P2
- [ ] Consolidar auditoria de eventos en `audit_events`.
- [ ] Ordenar metrica operativa: latencia, caida del bridge, tasa de error API.
- [ ] Mantener compatibilidad API para futuras verticales.

## 4. Firmware

### P0
- [ ] Mantener estable el contrato de payload de KPCL.
- [ ] Evitar cambios de frecuencia o timestamp que rompan la inferencia de actividad.

### P1
- [ ] Si el hardware lo permite, comenzar a emitir telemetria de energia real:
  - `battery_level`
  - `battery_voltage`
  - `battery_state`
  - `battery_source`
- [ ] Confirmar que las lecturas sigan llegando con cadencia util para inferir ON/OFF.

### P2
- [ ] Documentar cualquier campo nuevo antes de activar en produccion.
- [ ] Mantener versionado de firmware por dispositivo o familia de dispositivos.

## 5. App Web / Mobile / APK

### Web P0
- [ ] Cerrar el flujo principal `login -> mascota -> dispositivo -> datos`.
- [ ] Verificar que `/today` muestre siempre la mascota y el KPCL correctos.
- [ ] Endurecer el flujo de deploy: type-check, build, smoke tests y rollback.

### Web P1
- [ ] Cerrar onboarding y vinculacion para que no existan estados huerfanos.
- [ ] Mantener consistencia entre `today`, `story`, `pet`, `bowl` y `settings`.
- [ ] Revisar estados de error y carga para que sean claros y no ambiguos.

### Mobile / APK P1
- [ ] Definir ciclo de release: debug -> unsigned -> signed.
- [ ] Ejecutar QA minimo en login, today, story, offline/online y refresco.
- [ ] Validar que la UI nativa no rompa la jerarquia visual ya definida.

### Mobile / APK P2
- [ ] Preparar checklist de publish y versionado.
- [ ] Documentar diferencias reales entre web y APK si aparecen.

## 6. Empresa / Finanzas / Postulaciones

### P0
- [ ] Tratar CORFO Semilla Inicia como replanificacion, no como convocatoria viva.
- [ ] Mantener Start-Up Chile como paquete vivo de trabajo.
- [ ] Mantener actualizado `FONDOS_RASTREADOS_ACTUALES.md` con fuentes oficiales y fechas reales de apertura/cierre.
- [ ] Re-ejecutar el web scraping de fondos y refrescar `Docs/Postulaciones Fondos/2026/FUENTES_OFICIALES_FONDOS_2026.md`.
- [ ] Definir cada semana si el foco de postulacion va a Ignite, Growth, una convocatoria CORFO vigente o un backup Sercotec.
- [ ] Completar los checklists abiertos del paquete 2026 que sigan vigentes.

### P1
- [ ] Cerrar o actualizar el presupuesto y trazabilidad de costos.
- [ ] Mantener el BOM y la relacion de componentes de bateria/energia.
- [ ] Revisar compras pendientes y deudas registradas para que el relato financiero sea real.
- [ ] Actualizar el estado de las postulaciones si cambia la region, convocatoria o prioridad.

### P2
- [ ] Unificar narrativa comercial, tecnica y financiera en un solo relato por fondo.
- [ ] Mantener lista de evidencias listas para adjuntar: demo, capturas, tablas, presupuesto y anexos.

## 7. Orden de ejecucion recomendado

1. Front P0 y Back P0.
2. Web / App P1 para cerrar experiencia y flujo real.
3. Firmware P1 si hay chance de telemetria de energia.
4. Empresa P0/P1 para no perder postulaciones ni trazabilidad financiera.
5. P2 de consolidacion cuando lo critico ya no bloquee.

## 8. Regla de uso

- Si una tarea ya se resolvio, moverla al documento historico correspondiente.
- Si una tarea genera una decision de arquitectura, reflejarla en `FUENTE_DE_VERDAD.md`.
- Si una tarea cambia la foto viva, actualizar `ESTADO_PROYECTO_ACTUAL.md`.
