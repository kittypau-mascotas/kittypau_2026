# Plan de Costos y Presupuesto — Kittypau IoT
**Proceso PMBOK**: 7.1-7.4 Planificacion, Estimacion, Presupuesto y Control de Costos
**Dominio PMBOK 7**: Planificacion / Entrega de Valor
**Version**: 1.0 | Fecha: 2026-03-05
**Tipo de cambio operativo**: 1 USD = 950 CLP

---

## 1. Costo Unitario de Produccion (BOM + Manufactura)

### Perfil A — KPCL NodeMCU v3 CP2102 (sin camara)

| Componente | Categoria | Costo USD |
|-----------|-----------|-----------|
| NodeMCU v3 CP2102 | MCU | $4,90 |
| Celda de carga 1kg | Sensor | $2,10 |
| Modulo HX711 | Sensor | $1,20 |
| Sensor temp/humedad DHT11 | Sensor | $1,10 |
| PCB regulacion + componentes | Electronica | $2,20 |
| Fuente plug 5V | Energia | $2,30 |
| Cables, conectores, tornillos | Mecanica | $1,00 |
| Packaging primario | Empaque | $0,90 |
| **Subtotal BOM** | | **$15,70** |
| Cuerpo 3D impreso (185g PLA+) | Manufactura | $2,40 |
| Ensamblaje manual | Manufactura | $1,80 |
| Postproceso y acabado | Manufactura | $0,70 |
| QA + calibracion HX711 | Manufactura | $0,90 |
| **Subtotal manufactura** | | **$5,80** |
| **COSTO UNITARIO TOTAL** | | **$21,50** |
| **Equivalente CLP** | | **$20.425** |

### Perfil B — KPCL ESP32-CAM AI-Thinker (con camara)

| Componente | Categoria | Costo USD |
|-----------|-----------|-----------|
| ESP32-CAM AI-Thinker | MCU + Camara | $7,20 |
| Celda de carga 1kg | Sensor | $2,10 |
| Modulo HX711 | Sensor | $1,20 |
| Sensor temp/humedad DHT11 | Sensor | $1,10 |
| PCB regulacion + componentes | Electronica | $2,40 |
| Fuente plug 5V | Energia | $2,30 |
| Cables, conectores, tornillos | Mecanica | $1,10 |
| Packaging primario | Empaque | $0,95 |
| **Subtotal BOM** | | **$18,35** |
| Cuerpo 3D impreso (205g PLA+) | Manufactura | $2,80 |
| Ensamblaje manual | Manufactura | $2,10 |
| Postproceso y acabado | Manufactura | $0,75 |
| QA + calibracion | Manufactura | $1,00 |
| **Subtotal manufactura** | | **$6,65** |
| **COSTO UNITARIO TOTAL** | | **$25,00** |
| **Equivalente CLP** | | **$23.750** |

### Referencia de impresion 3D

- Filamento PLA+ eSUN 1kg: CLP $16.000 (incluye envio)
- Costo por gramo: $0,0168 USD/g
- Perfil NodeMCU: 185g = $3,11 USD de filamento
- Perfil ESP32-CAM: 205g = $3,44 USD de filamento

---

## 2. Costo Operativo Mensual por Dispositivo (OPEX)

### OPEX base por dispositivo

| Concepto | NodeMCU | ESP32-CAM |
|----------|---------|-----------|
| Mantenimiento mensual | $0,85 USD | $1,05 USD |
| Costo electrico mensual | $0,55 USD | $0,70 USD |
| **OPEX base** | **$1,40 USD** | **$1,75 USD** |

### OPEX cloud (shadow-pricing a 100 dispositivos)

Ventana operativa: 28 dias
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
| NodeMCU | $1,40 | $0,154 | **$1,554 USD** |
| ESP32-CAM | $1,75 | $0,154 | **$1,904 USD** |

---

## 3. Costos Operativos Mensuales (empresa)

### Escenario actual (plan free — shadow price)

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

- Costo fijo mensual (shadow-price): $44 USD / real plan pago: $65 USD
- Precio suscripcion premium: $5,00 USD/mes (~$4.750 CLP)
- **Break-even**: 13 suscriptores (shadow) / 13 suscriptores (real)
- Con margen de seguridad (x2): objetivo de **26 suscriptores activos**

---

## 4. Presupuesto Total del Proyecto (18 meses)

### Inversion inicial (Fase 0 — completada con recursos propios)

| Concepto | Costo USD | CLP |
|----------|-----------|-----|
| Hardware prototipo (8 unidades) | $172,00 | $163.400 |
| Raspberry Pi Zero 2W (bridge) | $20,00 | $19.000 |
| Componentes electronicos extra | $30,00 | $28.500 |
| Filamento 3D (2kg) | $33,68 | $32.000 |
| Herramientas y utiles | $25,00 | $23.750 |
| **Total inversion propia** | **$280,68** | **$266.650** |

### Presupuesto piloto (Fase 2 — 50 unidades, 6 meses)

| Concepto | Unidades | Costo USD | CLP |
|----------|---------|-----------|-----|
| KPCL NodeMCU (35 unidades) | 35 | $752,50 | $714.875 |
| KPCL ESP32-CAM (15 unidades) | 15 | $375,00 | $356.250 |
| Filamento 3D adicional (5kg) | 1 lote | $84,00 | $79.800 |
| Envios y logistica piloto | 50 | $75,00 | $71.250 |
| **Subtotal hardware piloto** | | **$1.286,50** | **$1.222.175** |
| Desarrollo software (alertas + app movil) | 200h | $2.000,00 | $1.900.000 |
| Marketing y adquisicion piloto | -- | $500,00 | $475.000 |
| Constitucion legal empresa | -- | $700,00 | $665.000 |
| Infraestructura cloud 6 meses | -- | $390,00 | $370.500 |
| **Subtotal operacion** | | **$3.590,00** | **$3.410.500** |
| **TOTAL FASE PILOTO** | | **$4.876,50** | **$4.632.675** |

---

## 5. Presupuesto Solicitado CORFO Semilla Inicia

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

**Gastos operacionales** (validacion, legal, manufactura):
- Manufactura: $2.500.000 CLP
- Validacion: $2.000.000 CLP
- Legal: $1.500.000 CLP
- Imprevistos: $1.500.000 CLP
- Total operacional: $7.500.000 CLP (44,1%)

---

## 6. Proyeccion de Ingresos (18 meses)

### Modelo A — Hardware + Suscripcion (recomendado)

Supuestos:
- Precio venta plato: $29.990 CLP (~$31,50 USD)
- Precio suscripcion premium: $4.990 CLP/mes (~$5,25 USD)
- Costo unitario construccion: $21,50 USD (NodeMCU) = $20.425 CLP
- Margen bruto hardware: 32% aprox ($9.565 CLP por unidad)
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

### Retorno sobre inversion (ROI simple)

- Inversion total (propia + CORFO): $21.250.000 CLP
- Ingresos acumulados 18m: $5.147.600 CLP
- Ingresos proyectados 36m: ~$25.000.000 CLP
- **ROI proyectado a 36 meses**: ~18%

> Nota: El valor real del proyecto incluye valoracion SaaS por MRR, que al mes 18 seria ~$174.650/mes MRR -> valoracion referencia SaaS (~5-8x ARR) = $10.479.000 - $16.766.400 CLP

---

## 7. Curva de Costos Acumulados

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

## 8. Control de Costos (PMBOK 7.4)

### Valor Ganado (EVM) — indicadores clave

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
| COGS > $28 USD por unidad | Renegociar componentes o redisenar placa |
| CAC > $20.000 CLP | Revisar estrategia de adquisicion |

---

_Referencias: PMBOK 6ta Ed. Cap. 7 (Gestion de los Costos) | PMBOK 7ma Ed. Dominio de Planificacion_
_Documento anterior: [04_BUSINESS_CASE.md](04_BUSINESS_CASE.md) | Siguiente: [06_RISK_REGISTER.md](06_RISK_REGISTER.md)_
