# Plan de Costos y Presupuesto - Kittypau IoT
**Proceso PMBOK**: 7.1-7.4 Planificacion, Estimacion, Presupuesto y Control de Costos
**Dominio PMBOK 7**: Planificacion / Entrega de Valor
**Version**: 2.0 | Fecha: 2026-03-16
**Tipo de cambio operativo**: 1 USD = 950 CLP

> **v2.0 - actualizacion con datos reales:** costos de componentes actualizados con precios reales AliExpress (2023-2026), inversin acumulada real por fundadores, nuevo perfil **KPLANT** (ESP32-C3 SuperMini).

---

## 1. Costo Unitario de Produccion (BOM + Manufactura)

### Perfil A - KPCL NodeMCU v3 CP2102 (Kittypau - sin camara)

| Componente | Categoria | Estimado v1 | **Real AliExpress** |
|-----------|-----------|-------------|---------------------|
| NodeMCU v3 CP2102 | MCU | $4,90 | **$3,54** (avg May-2025 + Abr-2024) |
| Celda de carga 500g | Sensor | $2,10 | **$2,73** (avg May-2025 + Mar-2024) |
| Modulo HX711 | ADC | $1,20 | **$0,70** (Feb-2024 $3.336/5u) |
| Sensor temp/humedad DHT11 | Sensor | $1,10 | **$1,10** (confirmado) |
| PCB regulacion + componentes | Electronica | $2,20 | $2,20 (estimado) |
| Fuente plug 5V | Energia | $2,30 | $2,30 (estimado) |
| Cables, conectores, tornillos | Mecanica | $1,00 | $1,00 (estimado) |
| Packaging primario | Empaque | $0,90 | $0,90 (estimado) |
| **Subtotal BOM** | | $15,70 | **$14,47** |
| Cuerpo 3D impreso (185g PLA+) | Manufactura | $2,40 | $2,40 |
| Ensamblaje manual | Manufactura | $1,80 | $1,80 |
| Postproceso y acabado | Manufactura | $0,70 | $0,70 |
| QA + calibracion HX711 | Manufactura | $0,90 | $0,90 |
| **Subtotal manufactura** | | $5,80 | **$5,80** |
| **COSTO UNITARIO TOTAL** | | $21,50 | **$20,27** |
| **Equivalente CLP** | | $20.425 | **$19.257** |

> Precios actualizados en DB: migracion `20260316120000_update_real_component_prices.sql`

### Perfil B - KPCL ESP32-CAM AI-Thinker (Kittypau - con camara)

| Componente | Categoria | Estimado v1 | **Real AliExpress** |
|-----------|-----------|-------------|---------------------|
| ESP32-CAM AI-Thinker | MCU + Camara | $7,20 | **$5,91** (Mar-2024 $11.226/2u) |
| Celda de carga 500g | Sensor | $2,10 | **$2,73** |
| Modulo HX711 | ADC | $1,20 | **$0,70** |
| Sensor temp/humedad DHT11 | Sensor | $1,10 | **$1,10** (confirmado) |
| PCB regulacion + componentes | Electronica | $2,40 | $2,40 |
| Fuente plug 5V | Energia | $2,30 | $2,30 |
| Cables, conectores, tornillos | Mecanica | $1,10 | $1,10 |
| Packaging primario | Empaque | $0,95 | $0,95 |
| **Subtotal BOM** | | $18,35 | **$17,19** |
| Cuerpo 3D impreso (205g PLA+) | Manufactura | $2,80 | $2,80 |
| Ensamblaje manual | Manufactura | $2,10 | $2,10 |
| Postproceso y acabado | Manufactura | $0,75 | $0,75 |
| QA + calibracion | Manufactura | $1,00 | $1,00 |
| **Subtotal manufactura** | | $6,65 | **$6,65** |
| **COSTO UNITARIO TOTAL** | | $25,00 | **$23,84** |
| **Equivalente CLP** | | $23.750 | **$22.648** |

### Resumen comparativo de perfiles

| Perfil | BOM | Manufactura | **Total** | CLP |
|--------|-----|-------------|-----------|-----|
| A - NodeMCU | $14,47 | $5,80 | **$20,27** | $19.257 |
| B - ESP32-CAM | $17,19 | $6,65 | **$23,84** | $22.648 |

### Referencia de impresion 3D

- Filamento PLA+ eSUN 1kg: CLP $16.000 (incluye envio)
- Costo por gramo: $0,0168 USD/g
- Perfil A (185g): $3,11 USD filamento bruto
- Perfil B (205g): $3,44 USD filamento bruto
- Perfil C (165g): $2,77 USD filamento bruto

---

## 2. Costo Operativo Mensual por Dispositivo (OPEX)

### OPEX base por dispositivo

| Concepto | NodeMCU (A) | ESP32-CAM (B) |
|----------|-------------|---------------|
| Mantenimiento mensual | $0,85 USD | $1,05 USD |
| Costo electrico mensual | $0,55 USD | $0,70 USD |
| **OPEX base** | **$1,40 USD** | **$1,75 USD** |

### OPEX cloud (shadow-pricing a 100 dispositivos)

Ventana operativa: 28 das
Supuesto: 50 KB/dispositivo/dia = 1,4 MB/mes por dispositivo

| Proveedor | Formula | Costo global (100 devs) | Por dispositivo |
|-----------|---------|------------------------|-----------------|
| HiveMQ | mb_total * 0,06 | $8,40 USD | $0,084 USD |
| Vercel | (mb*0,04)+(h*0,01) | $7,00 USD | $0,070 USD |
| Supabase | Plan Free hasta 500MB | $0 | $0 |
| **Total cloud** | | **$15,40 USD** | **$0,154 USD** |

### OPEX total por dispositivo

| Perfil | OPEX base | OPEX cloud | OPEX total/mes |
|--------|-----------|-----------|----------------|
| A - NodeMCU | $1,40 | $0,154 | **$1,554 USD** |
| B - ESP32-CAM | $1,75 | $0,154 | **$1,904 USD** |

---

## 3. Costos Operativos Mensuales (empresa)

### Escenario actual (plan free - shadow price)

| Proveedor | Plan | Costo facturado | Shadow-price/mes |
|-----------|------|----------------|-----------------|
| Supabase | Free | $0 | ~$25 USD |
| Vercel | Free | $0 | ~$10 USD |
| HiveMQ | Free | $0 | ~$8 USD |
| GitHub | Free | $0 | $0 |
| Dominio | Anual | ~$1 USD/mes | $1 USD |
| **Total** | | **$1 USD/mes** | **~$44 USD/mes** |

### Escenario con 100 usuarios activos (plan pago estimado)

| Proveedor | Plan | Costo/mes USD |
|-----------|------|--------------|
| Supabase Pro | $25/mes | $25,00 |
| Vercel Pro | $20/mes | $20,00 |
| HiveMQ Cloud | ~$0,06/MB | ~$15,00 |
| Otros (dominio, herramientas) | -- | $5,00 |
| **Total infraestructura** | | **$65,00 USD** |
| **Equivalente CLP** | | **$61.750** |

### Break-even en suscripciones

- Burn rate real actual: **$1 USD/mes** (plan free - confirmado)
- Burn rate shadow-price: **$44 USD/mes** (valor real de los servicios)
- Burn rate plan pago: **$65 USD/mes** (al escalar a 100 usuarios)
- Precio suscripcion premium: $5,00 USD/mes (~$4.750 CLP)

| Escenario | Costo/mes | Break-even |
|-----------|-----------|------------|
| Plan free actual | $1 USD | **1 suscriptor** |
| Shadow-price | $44 USD | **9 suscriptores** |
| Plan pago | $65 USD | **13 suscriptores** |
| Objetivo sostenibilidad (buffer x2) | $65 USD | **~30 suscriptores** |

---

## 4. Inversin Real Acumulada (recursos propios - actualizado v2.0)

> Datos extraidos de `03_REGISTRO_COMPRAS_JAVIER.md` y pedidos AliExpress 2023-2026.
> Fuente única verificable: cuenta AliExpress Javier Dayne (Ñuñoa/ES/CLP).
> Compras de Mauro Carcamo pendientes de registrar.

### Compras Javier Dayne - componentes Kittypau

| Periodo | CLP | USD aprox |
|---------|-----|-----------|
| Ago 2023 | $1.866 | ~$2 |
| Nov 2023 | $7.432 | ~$8 |
| Feb 2024 | $3.336 | ~$4 |
| Mar 2024 | $40.914 | ~$43 |
| Abr 2024 | $10.977 | ~$12 |
| Mar 2025 | $14.083 | ~$15 |
| Abr 2025 | $5.179 | ~$5 |
| May 2025 | $17.655 | ~$19 |
| Nov 2025 | $21.312 | ~$22 |
| Ene 2026 | $12.376 | ~$13 |
| Mar 2026 (en camino) | $106.942 | ~$113 |
| **Subtotal componentes Javier** | **$242.072** | **~$255** |

### Inversin total conocida (Javier - todos los items)

| Concepto | CLP | USD aprox |
|----------|-----|-----------|
| Componentes Kittypau + KPLANT (AliExpress) | $242.072 | ~$255 |
| RPi Zero 2W - bridge (estimado) | $19.000 | ~$20 |
| Filamento PLA+ 2kg (estimado) | $32.000 | ~$34 |
| **Total inversin Javier conocida** | **$293.072** | **~$308** |
| Compras Mauro Carcamo (pendiente registro) | - | - |
| **Total real acumulado estimado** | **~$350.000+** | **~$368+** |

> **Nota:** PMO v1.0 estimaba inversin propia en $280,68 USD. Dato real de Javier solo supera esa cifra ($308 USD conocido). Total real con Mauro se estima mayor.

### Distribucion de deuda interna (acuerdo 50/50)

| Concepto | Total | Javier | Mauro |
|----------|-------|--------|-------|
| Componentes Kittypau pagados por Javier | $242.072 CLP | 50% | **debe ~$121.036 CLP (~$127 USD)** |
| Compras Mauro | pendiente | pendiente | pendiente |
| **Saldo neto estimado** | | | **Mauro debe ~$127 USD a Javier** |

---

## 5. Presupuesto Total del Proyecto (18 meses)

### Inversin inicial (Fase 0 - completada con recursos propios)

| Concepto | Costo USD | CLP |
|----------|-----------|-----|
| Componentes Kittypau - Javier (verificado AliExpress, sin lab) | $190,00 | $180.645 |
| Raspberry Pi Zero 2W (bridge) | $20,00 | $19.000 |
| Filamento 3D (2kg) | $33,68 | $32.000 |
| Aporte Mauro Carcamo (50% pre-Mar-2026, ya liquidado) | $60,00 | $57.000 |
| **Total capital invertido** | **$303,68** | **$288.645** |
| Deuda pendiente Mauro (batch Mar 2026) | $35,00 | $33.414 |
| **Total comprometido (ambos fundadores)** | **~$338,68** | **~$322.059** |

### Presupuesto piloto (Fase 2 - 50 unidades, 6 meses)

| Concepto | Unidades | Costo USD | CLP |
|----------|---------|-----------|-----|
| KPCL NodeMCU - Kittypau (35 unidades) | 35 | $709,45 | $673.978 |
| KPCL ESP32-CAM - Kittypau (15 unidades) | 15 | $357,60 | $339.720 |
| Filamento 3D adicional (5kg) | 1 lote | $84,00 | $79.800 |
| Envios y logistica piloto | 50 | $75,00 | $71.250 |
| **Subtotal hardware piloto** | | **$1.151,05** | **$1.093.578** |
| Desarrollo software (alertas + app movil) | 200h | $2.000,00 | $1.900.000 |
| Marketing y adquisicion piloto | -- | $500,00 | $475.000 |
| Constitucion legal empresa | -- | $700,00 | $665.000 |
| Infraestructura cloud 6 meses | -- | $390,00 | $370.500 |
| **Subtotal operacin** | | **$3.590,00** | **$3.410.500** |
| **TOTAL FASE PILOTO** | | **$4.741,05** | **$4.503.998** |

---

## 6. Presupuesto Solicitado CORFO Semilla Inicia

**Monto total**: $17.000.000 CLP
**Cofinanciamiento CORFO (75%)**: $12.750.000 CLP
**Contraparte emprendedor (25%)**: $4.250.000 CLP

| # | Categoria | Descripcion detallada | Monto CLP | % |
|---|-----------|----------------------|-----------|---|
| 1 | Hardware y componentes | Componentes electronicos para 50 unidades: MCUs, HX711, celdas de carga, sensores, PCBs, cables, fuentes | $4.500.000 | 26,5% |
| 2 | Manufactura e impresion 3D | Filamento PLA+ (10kg), impresion de carcasas (50 unidades), ensamblaje, postproceso, QA y calibracion | $2.500.000 | 14,7% |
| 3 | Desarrollo de software | App movil v1 (iOS/Android via React Native), sistema de alertas, mejoras UX, integracion IA basica | $5.000.000 | 29,4% |
| 4 | Validacion y piloto | CAC de primeros 30-50 usuarios, materiales de usuario, soporte onboarding, encuestas y entrevistas | $2.000.000 | 11,8% |
| 5 | Legalizacion y registro | Constitucion SPA, registro de marca Kittypau, dominio .cl, costos notariales y SII | $1.500.000 | 8,8% |
| 6 | Imprevistos (10%) | Contingencias tecnicas, componentes defectuosos, costos inesperados de envio | $1.500.000 | 8,8% |
| | **TOTAL** | | **$17.000.000** | **100%** |

### Desglose por categoria CORFO

**Gastos en activos** (equipamiento productivo):
- Hardware componentes: $4.500.000 CLP
- Total activos: $4.500.000 CLP (26,5%)

**Gastos en servicios** (honorarios, desarrollo):
- Software: $5.000.000 CLP
- Total servicios: $5.000.000 CLP (29,4%)

**Gastos operacinales** (vlidacion, legal, manufactura):
- Manufactura: $2.500.000 CLP
- Validacion: $2.000.000 CLP
- Legal: $1.500.000 CLP
- Imprevistos: $1.500.000 CLP
- Total operacinal: $7.500.000 CLP (44,1%)

---

## 7. Proyeccion de Ingresos (18 meses)

### Modelo A - Hardware + Suscripcion (recomendado)

Supuestos:
- Precio venta plato: $29.990 CLP (~$31,50 USD)
- Precio suscripcion premium: $4.990 CLP/mes (~$5,25 USD)
- Costo unitario construccion: $20,27 USD (NodeMCU real) = $19.257 CLP
- Margen bruto hardware: ~36% (~$10.733 CLP por unidad)
- Churn mensual estimado: 4%

| Mes | Unidades vendidas | Usuarios activos | Pagos mensuales | Ingreso hardware | Ingreso SaaS | Ingreso total |
|-----|------------------|-----------------|----------------|-----------------|--------------|---------------|
| 1-3 | 10 | 10 | 0 | $299.900 | $0 | $299.900 |
| 4 | 5 | 15 | 3 | $149.950 | $14.970 | $164.920 |
| 5 | 5 | 19 | 5 | $149.950 | $24.950 | $174.900 |
| 6 | 8 | 25 | 7 | $239.920 | $34.930 | $274.850 |
| 7-9 | 20 | 43 | 12 | $599.800 | $59.880 | $659.680 |
| 10-12 | 30 | 68 | 20 | $899.700 | $99.800 | $999.500 |
| 13-18 | 80 | 140 | 35 | $2.399.200 | $174.650 | $2.573.850 |

**Ingresos acumulados 18 meses**: ~$5.147.600 CLP (~$5.418 USD)

### Retorno sobre inversin (ROI simple)

- Inversin total (propia + CORFO): $21.250.000 CLP
- Ingresos acumulados 18m: $5.147.600 CLP
- Ingresos proyectados 36m: ~$25.000.000 CLP
- **ROI proyectado a 36 meses**: ~18%

> Nota: El valor real del proyecto incluye valoracion SaaS por MRR, que al mes 18 seria ~$174.650/mes MRR -> valoracion referencia SaaS (~5-8x ARR) = $10.479.000 - $16.766.400 CLP

---

## 8. Curva de Costos Acumulados

```
CLP (millones)
25 |                                          * Ingresos
   |                                     *
20 |                                *
   |                *          BREAK-EVEN ~mes 22
15 |           *         ___________/
   |      *      ______/
10 | * ___/____/  <- Costos acumulados
   |/
5  |
   |_________________________________________________
      M3   M6   M9  M12  M15  M18  M21  M24
```

---

## 9. Control de Costos (PMBOK 7.4)

### Valor Ganado (EVM) - indicadores clave

| Indicador | Formula | Objetivo |
|-----------|---------|---------|
| CPI (Cost Performance Index) | EV / AC | > 0,9 |
| SPI (Schedule Performance Index) | EV / PV | > 0,85 |
| VAC (Variacion al completar) | BAC - EAC | Positivo |

### Umbrales de alerta

| Condicion | Accion |
|-----------|--------|
| Gasto hardware > 30% sobre presupuesto | Revision de BOM, busqueda de proveedor alternativo |
| Gasto cloud > $100 USD/mes sin ingresos | Revisar plan y optimizar queries/frecuencia |
| COGS Kittypau > $24 USD por unidad | Renegociar componentes o redisear placa |
| CAC > $20.000 CLP | Revisar estrategia de adquisicion |

### Inventario en base de datos

| Tabla | Contenido |
|-------|-----------|
| `public.finance_kit_components` | 26+ componentes con costos reales AliExpress |
| `public.finance_kpcl_profiles` | 3 perfiles: nodemcu-v3, esp32-cam, generic-kpcl |
| `public.finance_kpcl_profile_components` | BOM con precios reales actualizados |
| `public.finance_purchases` | 30 compras reales de Javier (2023-2026) |
| `public.finance_purchases_summary` | Vista: totales por comprador y categoria |

**Migraciones a aplicar (en orden):**
1. `supabase/migrations/20260316000000_finance_purchases_v1.sql`
2. `supabase/migrations/20260316120000_update_real_component_prices.sql`

---

_Referencias: PMBOK 6ta Ed. Cap. 7 (Gestion de los Costos) | PMBOK 7ma Ed. Dominio de Planificacion_
_Datos reales: `Docs/Postulaciones Fondos/2026/EQUIPO/03_REGISTRO_COMPRAS_JAVIER.md`_
_Documento anterior: [04_BUSINESS_CASE.md](04_BUSINESS_CASE.md) | Siguente: [06_RISK_REGISTER.md](06_RISK_REGISTER.md)_



