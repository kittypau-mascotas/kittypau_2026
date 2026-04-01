# Plan de Mejora Priorizado - Kittypau

Fecha de corte: 2026-04-01

Este documento resume el siguiente paso real del proyecto despues de la auditoria tecnica y documental.
No reemplaza a `ESTADO_PROYECTO_ACTUAL.md`; solo traduce ese estado en una ruta de mejora mas corta y ejecutable.

## 1. Lo que ya quedo resuelto

- `/today` ya sincroniza mascota y dispositivo y paso `type-check` + smoke test local.
- `kittypau_app` compila en produccion otra vez.
- La capa `analytics` dejo de ser bloqueo de build: ahora degrada a vacio cuando no existe base analitica.
- El contrato de energia ya esta compartido entre webhook y UI para no duplicar semanticas de `battery_*`.
- `KPCL0034` y `KPCL0036` quedaron registrados para analisis de bateria.
- La documentacion canonica ya distingue entre vivo, seguimiento e historico.

## 2. Prioridades inmediatas

### P0 - Dejar el core estable

1. Mantener `/api/readings`, `/api/devices` y `/api/mqtt/webhook` sin romper compatibilidad.
2. Mantener la degradacion elegante de `analytics`:
   - si la base analitica no existe, devolver `data: []`
   - no romper `story` ni `today`
3. Cerrar cualquier warning o deuda que vuelva a romper build, lint o type-check.
4. Mantener la ruta `login -> mascota -> dispositivo -> datos` como unica experiencia critica.

### P1 - Calidad de experiencia

1. Consolidar empty states, loading y errores para que el usuario entienda cuando faltan datos.
2. Reducir duplicacion visual entre `today`, `story`, `pet`, `bowl` y `settings`.
3. Mejorar accesibilidad y microcopy de estado.
4. Terminar de limpiar los fallbacks visuales que oculten la verdad de los datos.

### P1 - Observabilidad y datos

1. Mantener el bridge con health-check y recuperacion minima.
2. Definir pruebas de contrato para lecturas con y sin `battery_*`.
3. Alinear el contrato de energia para distinguir claramente `charging`, `external_power` y `battery_only`.
4. Registrar alertas de gaps, lecturas anomales y saltos extremos.
5. Consolidar el uso de:
   - `device_operation_records`
   - `device_power_sessions`
   - `device_battery_cycles`

### P1 - Firmware

1. Mantener estable el contrato de payload de KPCL.
2. Priorizar timestamps y frecuencia consistentes antes que nuevos campos.
3. Solo cuando el hardware lo permita, empezar a enviar energia real:
   - `battery_level`
   - `battery_voltage`
   - `battery_state`
   - `battery_source`

### P1 - Empresa

1. Mantener `FONDOS_RASTREADOS_ACTUALES.md` como radar oficial.
2. Re-ejecutar el web scraping de fondos y refrescar las fuentes oficiales.
3. Tratar CORFO Semilla Inicia como replanificacion, no como convocatoria viva.
4. Mantener Start-Up Chile como paquete vivo de trabajo.
5. Cerrar o replanificar los checklists que sigan abiertos.

## 3. Deuda que no debe volver a ser "oculta"

- `SUPABASE_ANALYTICS_URL` ya no puede bloquear el build.
- `proxy` ya reemplazo la convencion antigua de `middleware`.
- `supabase-analytics` se conserva solo como legado/compatibilidad, no como fuente activa del core.
- La bateria real sigue sin telemetria historica en `KPCL0034`.

## 4. Regla de ejecucion

1. Primero evitar regresiones de build, lint y type-check.
2. Luego mejorar UX y observabilidad.
3. Luego cerrar firmware y telemetria real.
4. Luego limpiar legado y consolidar documentos.
5. La foto viva sigue siendo `ESTADO_PROYECTO_ACTUAL.md`.
