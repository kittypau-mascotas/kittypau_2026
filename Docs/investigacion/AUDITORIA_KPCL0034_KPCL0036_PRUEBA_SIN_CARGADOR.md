# Auditoria KPCL0034 + KPCL0036 - prueba sin cargador

> Documento canonico de auditoria tecnica para el archivo `Docs/investigacion/kpcl0034_kpcl0036_prueba_sincargador.csv`.
> Este informe conserva la foto operativa del experimento compartido de `KPCL0034` y `KPCL0036` sin cargador.

## 1) Alcance

Se reviso el archivo:

- `Docs/investigacion/kpcl0034_kpcl0036_prueba_sincargador.csv`

Este CSV corresponde al experimento compartido de ambos dispositivos con la escena operativa ya fijada en la documentacion:

- `KPCL0034`
- `KPCL0036`
- plato encima
- sin cargador

Objetivo de esta auditoria:

- conservar el tramo comun del experimento;
- evaluar si los dos devices se comportan de forma comparable bajo la misma escena;
- dejar un insumo reutilizable para futuras comparaciones de peso, tare y alimentacion.

Interpretacion canonica del experimento:

- la variacion de peso se analiza **sin gato ni interrupcion externa directa en el sensor**;
- cualquier descenso, salto o deriva debe leerse como comportamiento del sistema de medicion, del plato, de la alimentacion o de la calibracion, no como consumo real de mascota;
- este criterio aplica para ambos devices mientras se revisa el tramo compartido.

## 2) Resumen ejecutivo

La exportacion base contiene solo lecturas; la taxonomia manual de plato y alimentacion queda incorporada en la capa SQL canonica del experimento y en la vista interactiva cuando la fuente la incluye.

Hallazgos principales:

- el archivo contiene `968` filas;
- distribucion por device:
  - `KPCL0034`: `140` filas
  - `KPCL0036`: `828` filas
- rango temporal observado:
  - primera lectura: `2026-04-06 21:32:42.231893+00`
  - ultima lectura: `2026-04-06 22:07:34+00`
- rango de peso bruto observado:
  - minimo: `0 g`
  - maximo: `340 g`
- temperatura ambiente observada:
  - minimo: `24.29999924 C`
  - maximo: `25.60000038 C`
- humedad observada:
  - minimo: `30.6 %`
  - maximo: `31 %`
- filas con `clock_invalid = true`:
  - `484`

Lectura tecnica:

- el CSV es util como captura bruta del experimento;
- la mitad de las filas tienen clock invalido, por lo que la cronologia debe leerse con cuidado y, cuando sea posible, apoyarse tambien en `ingested_at`;
- `KPCL0036` concentra la mayor parte de las lecturas;
- `KPCL0034` aparece con menos filas pero con un plateau de peso mucho mas alto, que conviene contrastar luego con la secuencia de tare/servicio.

## 3) Estructura del CSV

Columnas presentes:

- `row_source`
- `device_code`
- `device_uuid`
- `event_at`
- `ingested_at`
- `event_type`
- `payload`
- `clock_invalid`
- `weight_grams`
- `food_content_g`
- `water_ml`
- `flow_rate`
- `temperature`
- `humidity`
- `battery_level`
- `plate_weight_grams_device`
- `battery_voltage`
- `battery_state`
- `battery_source`
- `device_type`
- `device_status`
- `device_state`

Observacion:

- `row_source` = `reading` en el 100% del archivo;
- no se exportaron filas de `audit_events` en este CSV;
- por tanto, el archivo funciona como snapshot puro de lecturas.

## 4) Distribucion por device

### KPCL0036

- filas: `828`
- primera lectura: `2026-04-06 21:32:42.231893+00`
- ultima lectura: `2026-04-06 22:07:33+00`
- peso minimo: `0 g`
- peso maximo: `26 g`
- pesos mas repetidos:
  - `26 g` -> `556` filas
  - `0 g` -> `184` filas
  - `10 g` -> `48` filas
  - `17 g` -> `16` filas
  - `12 g` -> `8` filas

Lectura tecnica:

- KPCL0036 muestra un comportamiento acotado en rango bajo de peso;
- el plateau de `26 g` domina gran parte del tramo;
- la presencia de `0 g` sugiere reseteos o tramos de baseline neto;
- la secuencia debe cruzarse con la fase de tare y servido para interpretar si esos valores representan contenido real, baseline o reajuste del sistema.
- al no haber gato ni interrupcion voluntaria del sensor durante el analisis, cualquier variacion se interpreta como deriva del sistema, asentamiento mecanico, alimentacion o recalibracion pendiente.

### KPCL0034

- filas: `140`
- primera lectura: `2026-04-06 21:33:03+00`
- ultima lectura: `2026-04-06 22:07:34+00`
- peso minimo: `0 g`
- peso maximo: `340 g`
- pesos mas repetidos:
  - `34 g` -> `96` filas
  - `0 g` -> `34` filas
  - `340 g` -> `10` filas

Lectura tecnica:

- KPCL0034 presenta un plateau dominante de `34 g`;
- el salto a `340 g` aparece en un tramo menor y conviene revisarlo con el contexto exacto del servido;
- este device requiere comparar con la secuencia compartida para saber si el 340 g es un punto de carga real, un pico puntual o una fase distinta del plato.
- al no haber gato ni interrupcion voluntaria del sensor durante el analisis, cualquier variacion se interpreta como deriva del sistema, asentamiento mecanico, alimentacion o recalibracion pendiente.

## 5) Calidad temporal

Puntos a considerar:

- los tiempos del archivo cubren aproximadamente `34m 52s`;
- `clock_invalid` aparece en `484` filas;
- por eso, para inspecciones finas conviene leer `event_at` junto con `ingested_at`;
- si se hace una curva de peso, hay que separar claramente:
  - cambios de peso reales
  - duplicados o lectura con clock invalido
  - tramos de tare / servido

## 6) Hipotesis de trabajo

Con este CSV, las hipotesis mas utiles para seguir analizando son:

1. KPCL0036 se comporta como un rango bajo y bastante estable, con cambios pequeños.
2. KPCL0034 presenta un plateau basal de `34 g` y un tramo aislado en `340 g` que merece validacion.
3. La mitad de las filas con clock invalido puede estar afectando la lectura cronologica, pero no invalida el CSV como evidencia.
4. Este archivo debe usarse como referencia bruta del experimento, no como fuente final de tare o de consumo.
5. Como el analisis se hace sin gato ni interrupcion externa directa del sensor, las variaciones observadas apuntan primero a medicion, alimentacion, mecánica o calibracion.

## 7) Recomendacion operativa

Para cerrar esta auditoria, conviene seguir el protocolo ya documentado:

- conservar esta exportacion como snapshot del tramo compartido;
- cruzarla con `Docs/investigacion/SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`;
- cruzarla con `Docs/BATERIA_ESTIMADA_KPCL.md`;
- cuando llegue la lectura final posterior al servido, cerrar la secuencia con la taxonomia canonica:
  - `tare_con_plato` (alias legacy: `tare_record`)
  - `inicio_servido` (alias legacy: `food_fill_start`)
  - `termino_servido` (alias legacy: `food_fill_end`)

## 8) Grafico 2 canonico

La corrida compartida del grafico 2 queda fijada con estos hitos por device:

- `KPCL0034`
  - `tare_con_plato` [legacy: `tare_record`] -> `2026-04-06 21:42:34+00:00`
  - `inicio_servido` [legacy: `food_fill_start`] -> `2026-04-06 21:43:34+00:00`
  - `termino_servido` [legacy: `food_fill_end`] -> `2026-04-06 21:44:03+00:00`
  - `manual_bowl_category` -> `2026-04-07 00:17:41+00:00` (`inicio_alimentacion`)
- `KPCL0036`
  - `tare_con_plato` [legacy: `tare_record`] -> `2026-04-06 21:42:22+00:00`
  - `inicio_servido` [legacy: `food_fill_start`] -> `2026-04-06 21:43:48+00:00`
  - `termino_servido` [legacy: `food_fill_end`] -> `2026-04-06 21:44:27+00:00`

Lectura operacional:

- el grafico 2 ya no comparte un unico hito para ambos devices;
- cada linea queda marcada con su propia secuencia de tare y servido;
- el CSV y el grafico interactivo deben reflejar esa separacion por device como referencia canonica.

## 9) Referencias

- `Docs/investigacion/kpcl0034_kpcl0036_prueba_sincargador.csv`
- `Docs/investigacion/SQL_EXPORT_KPCL0034_KPCL0036_EXPERIMENTO.sql`
- `Docs/BATERIA_ESTIMADA_KPCL.md`
- `Docs/FUENTE_DE_VERDAD.md`
- `Docs/ESTADO_PROYECTO_ACTUAL.md`
