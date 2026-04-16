# Diagnostico de errores y registros (2026-04-07)

## Contexto
Se probaron todos los botones de categorias para KPCL0034 y KPCL0036 desde la vista Today.

## Errores observados
1) Logs con alta repeticion de `/api/devices?limit=1`.
- Origen: polling de estado critico cada 45 segundos en `AppDataProvider`.
- Impacto: ruido en consola y pequeñas latencias visibles en logs.

2) Limpieza de eventos de prueba con CLI
- El comando `npx supabase db query --linked` ejecuto la limpieza pero termino con timeout.
- Resultado devuelto: `deleted_rows: 15`.
- Impacto: la limpieza quedo aplicada, pero el CLI salio por timeout (posible latencia de red).

3) Texto de error con caracteres corruptos
- El mensaje de categoria invalida tenia codificacion rota.
- Se corrigio el texto a ASCII para evitar errores de UTF-8.

## Cambios aplicados (resumen)
1) Persistencia de snapshot de categoria
- Cada categoria guarda un snapshot con peso y timestamp del sensor.

2) Calculo automatico de peso del plato
- Cuando se registra `KPCL CON PLATO`, se busca el ultimo `KPCL SIN PLATO` del mismo dispositivo.
- Se calcula `plate_weight_grams = weight_con_plato - weight_sin_plato`.
- Se actualiza `devices.plate_weight_grams`.

3) Agua en mL
- La lectura de agua en el card se muestra en `mL` (equivalente a gramos).
4) Logica operativa en Today
- KPCL SIN PLATO -> KPCL CON PLATO calcula el peso del plato en el card.
- TARE CON PLATO pone el contenido en 0 (alimento e hidratacion).
- Refresh de datos del card cada 5 segundos.

## Limites conocidos
- Si no existe un evento previo `KPCL SIN PLATO`, no se puede calcular el peso del plato.
- La limpieza de pruebas borra solo eventos recientes (ventana de 6 horas por defecto).
- El polling de `/api/devices?limit=1` sigue activo; si molesta, se puede reducir frecuencia o centralizarlo.

## Archivos involucrados
- `kittypau_app/src/app/api/devices/[id]/category/route.ts`
- `kittypau_app/src/app/(app)/today/page.tsx`
- `Docs/investigacion/CLEANUP_MANUAL_CATEGORY_TESTS_2026-04-07.sql`

## Siguiente paso recomendado
- Confirmar en UI que el campo `plato` deje de estar en `N/D` tras registrar
  `KPCL SIN PLATO` -> `KPCL CON PLATO`.
- Si quieres, bajamos la frecuencia del polling para limpiar logs.
