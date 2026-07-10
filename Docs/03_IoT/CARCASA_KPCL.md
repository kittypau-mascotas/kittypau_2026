---
tags: [carcasa, hardware, 3d, stl, kpcl]
area: IoT
estado: activo
actualizado: 2026-06-24
---

# Carcasa KPCL — Diseño 3D

Archivos de diseño e impresión 3D del comedero Kittypau.  
Ubicación en repo: `Carcasa_3a/`

## Archivos activos

| Archivo | Descripción |
|---|---|
| `Carcasa_3c.stl` | Cuerpo principal — versión actual (3c) |
| `Tapa_1b.stl` | Tapa del compartimento — versión actual (1b) |
| `Rosca_1a.stl` | Rosca/conector entre cuerpo y tapa |
| `Tuerca_1a.stl` | Tuerca complementaria a Rosca_1a |
| `Impresion_KP.3mf` | Proyecto de impresión completo (Bambu/PrusaSlicer) |
| `logo.svg` | Logo Kittypau para grabado/serigrafía |

## Versiones superadas

En `Carcasa_3a/Superados/`:
- `Carcasa_3a.stl` — primer modelo
- `Carcasa_3b.stl` — segunda iteración
- `Tapa_1a.stl` — tapa original

## Parámetros de impresión (referencia)

| Parámetro | Valor recomendado |
|---|---|
| Material | PLA o PETG |
| Relleno | 20–30% |
| Capas soporte | Según orientación del modelo |
| Archivo principal | `Impresion_KP.3mf` |

## Notas de diseño

- El diseño incluye espacio interno para la placa NodeMCU v3, celda de carga HX711 y batería LiPo
- La rosca (Rosca_1a + Tuerca_1a) permite acceso al interior sin herramientas
- El módulo TP4056 (cargador LiPo) entra por abertura lateral

## Archivos de prototipado de rosca (antiguo)

Las piezas de prueba de la rosca están en la carpeta `hardware (antiguo)/carcasa/pruebas_piezas/` — scripts OpenSCAD y Fusion 360 utilizados durante el diseño. No están en uso activo.

## Links relacionados

- [[FIRMWARE_ESP8266]]
- [[KPCL_CATALOGO_COMPONENTES_Y_COSTOS]]
- [[BATERIA_ESTIMADA_KPCL]]
