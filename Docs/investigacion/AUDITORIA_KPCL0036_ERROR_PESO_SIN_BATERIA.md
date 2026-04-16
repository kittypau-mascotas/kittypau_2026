# Auditoria KPCL0036 - error de peso sin bateria

> Documento canonico de auditoria tecnica para el archivo `Docs/investigacion/kpcl0036_error_peso_sinbateria.csv`.
> Este informe se conserva como evidencia operativa del comportamiento de peso del dispositivo `KPCL0036`.

## 1) Alcance

Se reviso el archivo:

- `Docs/investigacion/kpcl0036_error_peso_sinbateria.csv`

Objetivo de la auditoria:

- validar si el comportamiento observado corresponde a un problema de bateria, de tara, de firmware o de calculo en la capa de datos;
- conservar una referencia clara para futuras revisiones de funcionamiento.

## 2) Resumen ejecutivo

La evidencia apunta a un problema de **tara / sincronizacion de tara**, no a un fallo directo de lectura del HX711.

Hallazgos principales:

- el CSV contiene `144460` filas;
- rango temporal observado:
  - primera lectura: `2026-03-11 21:42:44.972858+00`
  - ultima lectura: `2026-04-06 20:49:15.762144+00`
- `plate_weight_grams` esta en `null` en el `100%` de las filas;
- `food_content_g` replica `weight_grams` en todo el archivo;
- los valores mas repetidos son `56`, `57` y `0`, lo que sugiere un peso bruto del plato o lecturas de cero, no un contenido neto descontado.

## 3) Evidencia observada en el CSV

### Estructura

Columnas presentes:

- `recorded_at`
- `weight_grams`
- `plate_weight_grams`
- `food_content_g`

### Distribucion de pesos

Top de valores observados:

- `57` -> `62616` filas
- `0` -> `41609` filas
- `56` -> `29884` filas
- `98` -> `2920` filas
- `6` -> `2348` filas
- `3` -> `1562` filas
- `178` -> `708` filas
- `8` -> `360` filas
- `5` -> `308` filas
- `18` -> `306` filas

### Lectura tecnica

La forma mas consistente de interpretar este patron es:

- existe una serie larga de lecturas crudas;
- la tara del plato no esta aplicada en el dataset exportado;
- por eso el contenido neto no puede calcularse correctamente y el archivo termina mostrando peso bruto o cero.

## 4) Revision de firmware y contrato tecnico

### 4.1 Firmware: persistencia local de tara

En el firmware ESP8266, la tara si existe y se persiste en LittleFS:

- `iot_firmware/javier_1a/firmware-esp8266/src/sensors.cpp`

El flujo relevante es:

- al iniciar, el firmware carga el factor de calibracion;
- luego intenta restaurar el offset de tara guardado en LittleFS;
- si no existe offset, hace `tare()` y guarda el offset.

Conclusiones:

- el firmware esta preparado para recordar la tara entre reinicios;
- si el offset no aparece en lectura o no se restaura, el problema probablemente esta en la persistencia, el reset del dispositivo o la sincronizacion con la base.

### 4.2 Firmware: comando remoto de tara

El comando MQTT para tarar existe y esta implementado:

- `iot_firmware/javier_1a/firmware-esp8266/src/mqtt_manager.cpp`
- contrato MQTT: `Docs/TOPICOS_MQTT.md`

Flujo:

- `CALIBRATE_WEIGHT`
- `action = tare`
- llama a `sensorsTareWeight()`
- guarda el offset en LittleFS

Conclusiones:

- el firmware si sabe tarar;
- el problema no parece ser falta de soporte, sino falta de sincronizacion o de persistencia visible en el lado de datos.

### 4.3 API web: persistencia de tara de dispositivo

La app web tambien soporta guardar la tara en la base:

- `kittypau_app/src/app/api/devices/[id]/route.ts`

Ese endpoint actualiza:

- `plate_weight_grams`

Ademas existe el endpoint para disparar tara remota:

- `kittypau_app/src/app/api/devices/[id]/tare/route.ts`

Conclusiones:

- el producto ya tiene dos capas para resolver la tara:
  - firmware local
  - persistencia en DB
- si el CSV sigue mostrando `plate_weight_grams = null`, la tara no esta quedando disponible para el calculo neto.

## 5) Diagnostico probable

Diagnostico mas probable:

1. el dispositivo genera lecturas crudas correctas;
2. la tara del plato no esta disponible en el reporte o no quedo sincronizada con `devices.plate_weight_grams`;
3. el calculo de `food_content_g` se esta haciendo sin descontar tara;
4. por eso el CSV termina reflejando peso bruto o cero como si fuera contenido neto.

## 6) Causas posibles

Las causas mas probables, ordenadas por severidad:

1. **Export/report sin join a `devices.plate_weight_grams`**
   - el CSV pudo generarse desde una consulta que no incorporo la tara persistida.
2. **Tara persistida solo en firmware, no en DB**
   - el HX711 puede estar bien calibrado localmente, pero la capa de reportes no conoce ese valor.
3. **Reset o perdida de estado local**
   - si el device reinicio y no recupero el offset guardado, puede volver a un estado bruto o incoherente.
4. **Plato sin calibracion formal antes del export**
   - la serie puede mezclar peso del plato, plato vacio y lecturas cero sin una referencia estable.

## 7) Conclusion operativa

Este caso no parece un fallo primario de bateria.

La lectura mas honesta es:

- el problema central es de **tara y calculo neto**;
- la bateria puede influir solo de forma secundaria si produjo reinicios o perdida de estado;
- el CSV no demuestra por si solo un defecto de hardware en el HX711;
- si no se aplica la tara correcta, el sistema termina reportando peso bruto como si fuera contenido.

## 8) Accion recomendada

Para cerrar este frente de auditoria, conviene:

- asegurar que la tara del dispositivo quede persistida en `devices.plate_weight_grams`;
- confirmar que los reportes usan `weight_grams - plate_weight_grams`;
- dejar una validacion que marque `plate_weight_grams = null` como dato incompleto para analitica de alimento;
- guardar esta auditoria como referencia canonica antes de hacer nuevos calculos historicos.

## 10) Nueva secuencia manual registrada

Se agrego una secuencia operativa posterior que ayuda a interpretar el comportamiento del plato:

- `2026-04-06 20:05:12.356102+00` -> inicio de tare
- `2026-04-06 20:07:00.191354+00` -> fin de tare con plato en `0 g`
- `2026-04-06 20:06:55+00` -> inicio del llenado de comida
- `2026-04-06 20:07:10.132855+00` -> termino del llenado de comida y comienzo del descenso de peso

Interpretacion:

- la secuencia confirma que el punto de referencia estable es el tare a `0 g`;
- el llenado de comida queda acotado entre `20:06:55+00` y `20:07:10.132855+00`;
- el descenso posterior ya corresponde a consumo o redistribucion del contenido;
- esta nueva secuencia sirve como evidencia canonica para auditar futuras formulas de consumo neto.

Duraciones observadas:

- tare total: `1m 47.835252s`
- ventana de llenado de comida: `9.941501s`

Lectura operativa:

- la ventana entre tare y agregado es corta y consistente con una manipulacion directa del plato;
- si futuras formulas de consumo usan esta secuencia, deben tomar `20:06:55+00` como baseline estable de llenado y `20:07:10.132855+00` como cierre del llenado antes de medir descenso.

## 11) Consulta SQL de validacion

La secuencia queda categorizada en cuatro fases canonicas:

- `tare_record` -> registro de tare
- `plate_weight` -> peso del plato / tare completo
- `food_fill_start` -> inicio del llenado de comida
- `food_fill_end` -> termino del llenado de comida

La consulta canonica para comparar esta secuencia con futuras lecturas queda en:

- `Docs/investigacion/SQL_VALIDACION_KPCL0036_TARE_FILL.sql`

Uso recomendado:

- tomar la secuencia como referencia para validar eventos historicos;
- agregar nuevas lecturas a la ventana y revisar si la transicion de `food_fill_start` a `food_fill_end` sigue siendo coherente;
- usar `food_fill_start` como baseline estable de llenado y `food_fill_end` como cierre antes del descenso;
- usar `plate_weight` como baseline estable para todo calculo neto posterior.

## 12) Hallazgo sobre el descenso de peso

Al revisar el tramo posterior al llenado se observo este comportamiento:

- `2026-04-06 20:07:10.132855+00` -> `36 g`
- hasta aproximadamente `2026-04-06 20:08:40+00` el peso se mantuvo estable en `36 g`
- `2026-04-06 20:08:45.633709+00` -> baja a `34 g`
- `2026-04-06 20:10:16.38975+00` -> baja a `32 g`

Interpretacion tecnica:

- no se ve una deriva continua inmediata;
- primero hay estabilidad posterior al llenado;
- despues aparecen descensos por escalones;
- eso es mas consistente con consumo real, redistribucion del contenido o microajustes mecanicos del plato que con un error puro de bateria.

Lectura diagnostica:

- la bateria no explica por si sola este patron;
- el problema original del CSV sigue siendo la tara ausente;
- pero el tramo de descenso posterior si parece representar un cambio real de contenido, no un simple ruido aleatorio.

## 13) Protocolo de prueba controlada con cargador conectado

Para seguir aislando la causa, se define una prueba controlada de comparacion:

- dispositivos: `KPCL0034` y `KPCL0036`
- energia: **con cargador conectado**
- condicion mecanica: **sin objeto encima al inicio**
- objetivo: comparar estabilidad del peso frente a la misma secuencia ya observada en bateria sola, usando la misma escena y el mismo criterio de registro para ambos devices

Secuencia de la prueba:

1. `tare_record`
2. `food_fill_start`
3. `plate_weight`
4. `food_fill_end`

Regla de lectura:

- `food_fill_start` marca el inicio del servido y `plate_weight` marca el cierre del tare;
- el cambio posterior se interpreta siempre desde esa secuencia y no desde un valor aislado;
- si el peso baja aun con cargador conectado y sin animal, se refuerza la sospecha de problema de alimentacion, deriva mecanica o sensor/calibracion;
- si el patron cambia respecto a bateria sola, la diferencia entre ambas pruebas nos va a ayudar a aislar si la fuente de energia esta influyendo;
- la misma secuencia debe repetirse en `KPCL0034` y `KPCL0036` para que la comparacion entre devices sea valida.

Formato esperado de los proximos registros:

- timestamp exacto;
- peso bruto observado;
- nota de estado mecanico;
- fase de la secuencia;
- si el cargador estaba conectado;
- si hubo lectura estable o salto abrupto.

Cuando me envíes las nuevas mediciones, las incorporo a esta misma auditoria y a la taxonomia de secuencia sin redefinir el criterio cada vez.

## 14) Estado actual compartido de la prueba

Observacion de estado al `2026-04-06 17:40:13-04:00`:

- `KPCL0034` esta con plato encima, con el plato activo y sin cargador.
- `KPCL0036` esta con plato encima, con el plato activo y sin cargador.
- ambos dispositivos permanecen listos para ejecutar la misma secuencia de referencia en condiciones comparables.

Este estado no reemplaza la auditoria historica del CSV, pero si fija el punto de partida de la comparacion controlada comun entre ambos devices.

## 9) Referencias

- `Docs/FUENTE_DE_VERDAD.md`
- `Docs/BATERIA_ESTIMADA_KPCL.md`
- `Docs/MODELO_DATOS_IA_FORMULAS_KITTYPAU.md`
- `Docs/TOPICOS_MQTT.md`
- `iot_firmware/javier_1a/firmware-esp8266/src/sensors.cpp`
- `iot_firmware/javier_1a/firmware-esp8266/src/mqtt_manager.cpp`
- `kittypau_app/src/app/api/devices/[id]/route.ts`
- `kittypau_app/src/app/api/devices/[id]/tare/route.ts`
