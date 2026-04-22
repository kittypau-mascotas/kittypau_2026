# Plan de Mejora Priorizado - Kittypau

Fecha de corte: 2026-04-01

Este documento resume el siguente paso real del proyecto despues de la auditoria tecnica y documental.
No reemplaza a `ESTADO_PROYECTO_ACTUAL.md`; solo traduce ese estado en una ruta de mejora ms corta y ejecutable.

## 1. Lo que ya qued resuelto

- `/today` ya sincroniza mascota y dispositivo y paso `type-check` + smoke test local.
- `kittypau_app` compila en produccion otra vez.
- La capa `analytics` dejo de ser bloqueo de build: ahora degrada a vacio cuando no existe base analitica.
- El contrato de energa ya esta compartido entre webhook y UI para no duplicar semanticas de `battery_*`.
- `KPCL0034` y `KPCL0036` quedaron registrados para anlisis de batera.
- `KPCL0036` ya tiene una observacion manual de carga completa entre `08:36` y `12:42` hora local, y ahora tambien qued registrado el inicio de autonoma en `battery_only` al desconectar el cargador a las `15:55:23` hora local, til para futuros calculos.
- La documentacin canonica ya distingue entre vivo, seguimiento e historico.

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
2. Reducir duplicacion visual entre `today`, `story`, `pet`, `bowl` y `settings` usando componentes compartidos cuando el patrn se repite.
3. Mejorar accesibilidad y microcopy de estado.
4. Terminar de limpiar los fallbacks visuales que oculten la verdad de los datos.
5. Mantener `today` como pantalla operativa con accines rpidas hacia `story`, `admin` y `registro` cuando falten datos o haya gaps.
6. Mantener `story` como vista explicativa con salidas directas a `today`, `admin` y `settings` cuando la historia sea insuficiente o este limitada.
7. Mantener `bowl` como vista operativa con accines rpidas a `today`, `story` y `admin` cuando falten datos, batera o diagnosticos claros.
8. Mantener `pet` como vista de identidad y contexto con salidas operativas a `today`, `bowl`, `story`, `registro` y `admin` cuando falten datos o historia.
9. Mantener `settings` como panel de control con acceso rapido a `pet`, `today` y `admin` cuando el perfil este incompleto o el usuario quiera volver al flujo operativo.
10. Futura versin de `today`: en el cuadro del plato, cuando el estado este verde, exponer botones de categorizacion interna/admin para `sin nada encima`, `plato con comida`, `inicio de servir comida` y `termino de servir comida`; dejar esta interaccin como apoyo operativo y no como flujo publico.

### P1 - Observabilidad y datos

1. Mantener el bridge con health-check y recuperacion minima.
2. Definir pruebas de contrato para lecturas con y sin `battery_*`.
3. Alnear el contrato de energa para distinguir claramente `charging`, `external_power` y `battery_only`.
4. Registrar alertas de gaps, lecturas anomales y saltos extremos. Ya existe auditoria de gaps de lectura en el webhook y el admin los cuenta con un panel de accines separado.
5. Consolidar el uso de:
   - `device_operation_records`
   - `device_power_sessions`
   - `device_battery_cycles`
6. Aceptar `battery_state` y `battery_source` explcitos del firmware, además de las variantes legacy, para no depender siempre de la inferencia por nivel o voltaje.
7. Mostrar en admin la cobertura de telemetra de batera reciente para cada KPCL, de modo que el back exponga cuando realmente llega energa til al sistema.

### P1 - Firmware

1. Mantener estable el contrato de payload de KPCL.
2. Priorizar timestamps y frecuencia consistentes antes que nuevos campos.
3. Solo cuando el hardware lo permita, empezar a enviar energa real:
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
- La batera real sigue sin telemetra historica en `KPCL0034`.

## 4. Regla de ejecucion

1. Primero evitar regresiones de build, lint y type-check.
2. Luego mejorar UX y observabilidad.
3. Luego cerrar firmware y telemetra real.
4. Luego limpiar legado y consolidar documentos.
5. La foto viva sigue siendo `ESTADO_PROYECTO_ACTUAL.md`.
