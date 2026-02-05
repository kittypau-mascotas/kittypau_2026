# Flujo de Registro de Dispositivo (Kittypau)

## Objetivo
Registrar un plato Kittypau (comida o agua), escanear su QR y asociarlo a una mascota.

## Principio visual
- Solo 2 opciones con foto.
- El usuario toca imagenes, no lee textos largos.

## Paso a paso (UX)
1. **Seleccion de tipo**
   - Kittypau Comida (foto plato comida)
   - Kittypau Agua (foto plato agua)
2. **Escaneo de QR (obligatorio)**
   - El QR entrega el `device_code`.
3. **Asociar mascota**
   - Lista de mascotas existentes.
   - Seleccion unica (obligatoria para activar envio de datos).
4. **Confirmacion**
   - Mostrar resumen: tipo, mascota, device_code.

## Datos guardados
- `device_code` (QR)
- `device_type` (food_bowl / water_bowl)
- `owner_id` (usuario)
- `pet_id` (mascota asociada)

## Resultado
El dispositivo queda activo y listo para enviar datos via HiveMQ.
