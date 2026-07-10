# Proyección Financiera — Escenario Base
## Kittypau — IOT CHILE SpA — Residencia startuplab.01 (Ago 2026 – Jul 2027)

---

## Supuestos base

| Parámetro | Valor | Fuente |
|---|---|---|
| Tipo de cambio operativo | 1 USD = 950 CLP | Referencia interna |
| Costo de construcción por unidad (NodeMCU v3) | USD 21.50 | KPCL_CATALOGO_COMPONENTES_Y_COSTOS |
| Precio de venta hardware al cliente | USD 50 | MODELO_FINANCIERO legacy |
| Margen bruto hardware | USD 28.50 / unidad (57%) | Calculado |
| Suscripción plan premium | USD 8 / mes | MODELO_FINANCIERO legacy |
| OPEX mensual por dispositivo activo | USD 1.40 | KPCL_CATALOGO (maintenance + power) |
| OPEX cloud mensual (Supabase + Vercel + HiveMQ) | USD 30–80 según escala | Estimado |
| CAC estimado (marketing digital) | USD 15 | Estimado |
| Churn mensual estimado (etapa inicial) | 5% | Estimado conservador |

---

## Estructura de costos unitaria

### Hardware (NodeMCU v3) — por unidad producida

| Componente | USD |
|---|---:|
| MCU NodeMCU v3 CP2102 | 4.90 |
| Celda de carga + HX711 | 3.30 |
| Sensor temp/hum AHT10 | 1.10 |
| PCB regulación | 2.20 |
| Fuente plug 5V | 2.30 |
| Cables, conectores, tornillos | 1.00 |
| Packaging | 0.90 |
| **Subtotal BOM** | **15.70** |
| Cuerpo impreso 3D | 2.40 |
| Ensamblaje | 1.80 |
| Postproceso | 0.70 |
| QA + calibración | 0.90 |
| **Subtotal manufactura** | **5.80** |
| **Costo total construcción** | **21.50** |

**Precio de venta:** USD 50 → **margen USD 28.50 (57%)**

### OPEX mensual por dispositivo activo

| Ítem | USD/mes |
|---|---:|
| Mantenimiento | 0.85 |
| Consumo energético | 0.55 |
| **Total OPEX dispositivo** | **1.40** |

---

## Modelo de ingresos

| Fuente | Descripción | Ingreso |
|---|---|---|
| **Hardware** | Venta única del dispositivo KPCL | USD 50 por unidad |
| **Suscripción premium** | Dashboard avanzado, historial 1 año, alertas personalizadas | USD 8 / mes |
| **Plan gratuito** | Historial 3 días, métricas básicas | Sin cargo |

---

## Proyección trimestral — Escenario Base

### Trimestre 1 — Ago a Oct 2026: Piloto controlado
*Objetivo: validar el sistema con 8–10 dispositivos activos en hogares reales durante la residencia.*

| Ítem | Valor |
|---|---:|
| Unidades vendidas | 0 (piloto sin pago) |
| Dispositivos activos | 8 |
| Suscripciones premium | 0 |
| **Ingresos** | **USD 0** |
| OPEX cloud (3 meses × $30) | USD 90 |
| OPEX dispositivos (8 × $1.40 × 3) | USD 33.60 |
| **Resultado del trimestre** | **–USD 123.60** |
| MRR al cierre | USD 0 |

---

### Trimestre 2 — Nov 2026 a Ene 2027: Primeras ventas
*Objetivo: activar las primeras ventas directas B2C y conversión de pilotos a suscripción.*

| Ítem | Valor |
|---|---:|
| Unidades vendidas | 10 |
| Ingresos hardware (10 × $28.50 margen) | USD 285 |
| Dispositivos activos acumulados | 18 |
| Suscripciones premium promedio periodo | 4 usuarios |
| Ingresos suscripción (4 × $8 × 3 meses) | USD 96 |
| **Ingresos totales** | **USD 381** |
| OPEX cloud (3 × $40) | USD 120 |
| OPEX dispositivos (18 × $1.40 × 3) | USD 75.60 |
| **Resultado del trimestre** | **+USD 185.40** |
| MRR al cierre | USD 64 |

---

### Trimestre 3 — Feb a Abr 2027: Crecimiento
*Objetivo: escalar a través de marketing digital y primeras alianzas con clínicas veterinarias.*

| Ítem | Valor |
|---|---:|
| Unidades vendidas | 15 |
| Ingresos hardware (15 × $28.50) | USD 427.50 |
| Dispositivos activos acumulados | 33 |
| Suscripciones premium promedio periodo | 14 usuarios |
| Ingresos suscripción (14 × $8 × 3 meses) | USD 336 |
| **Ingresos totales** | **USD 763.50** |
| OPEX cloud (3 × $50) | USD 150 |
| OPEX dispositivos (33 × $1.40 × 3) | USD 138.60 |
| **Resultado del trimestre** | **+USD 474.90** |
| MRR al cierre | USD 160 |

---

### Trimestre 4 — May a Jul 2027: Escala temprana
*Objetivo: consolidar canal B2C y activar segmento B2B2C con clínicas veterinarias.*

| Ítem | Valor |
|---|---:|
| Unidades vendidas | 20 |
| Ingresos hardware (20 × $28.50) | USD 570 |
| Dispositivos activos acumulados | 53 |
| Suscripciones premium promedio periodo | 29 usuarios |
| Ingresos suscripción (29 × $8 × 3 meses) | USD 696 |
| **Ingresos totales** | **USD 1.266** |
| OPEX cloud (3 × $67) | USD 201 |
| OPEX dispositivos (53 × $1.40 × 3) | USD 222.60 |
| **Resultado del trimestre** | **+USD 842.40** |
| MRR al cierre | USD 304 |

---

## Resumen acumulado 12 meses

| Métrica | Valor |
|---|---:|
| Unidades vendidas | 45 |
| Ingresos hardware (margen) | USD 1.282.50 |
| Ingresos suscripción | USD 1.128 |
| **Ingresos totales acumulados** | **USD 2.410.50** |
| OPEX cloud total | USD 561 |
| OPEX dispositivos total | USD 470 |
| **Costos operativos totales** | **USD 1.031** |
| **Resultado neto estimado** | **+USD 1.379.50** |

> Los costos operativos **no incluyen** salarios fundadores (aporte no pecuniario valorizado en +600 horas de trabajo) ni inversión inicial en stock de componentes.

---

## Métricas clave al cierre (Jul 2027)

| Métrica | Valor |
|---|---:|
| Dispositivos activos en campo | 53 |
| Usuarios premium | ~38 |
| MRR | USD 304 |
| ARR proyectado | USD 3.648 |
| LTV estimado (ARPU $8 / churn 5%) | USD 160 por usuario |
| CAC estimado | USD 15 |
| LTV / CAC | 10.7x |
| Break-even operativo | **Q2 (Nov 2026)** |

---

## Inversión requerida — periodo residencia

| Ítem | Monto estimado | Descripción |
|---|---:|---|
| Stock inicial componentes (10 kits) | USD 215 | BOM para producción lote inicial |
| Herramientas dry lab | USD 150 | Multímetro, cautín, consumibles calibración |
| Marketing digital inicial | USD 200 | Campañas Instagram/TikTok Q4 2026 |
| Cloud infraestructura (12 meses) | USD 561 | Supabase + Vercel + HiveMQ |
| **Total inversión estimada** | **USD 1.126** | |

> Aporte propio acumulado a la fecha: **USD 304** en componentes y hardware desplegado.

---

## Hitos financieros del período

| Mes | Hito |
|---|---|
| Ago 2026 | Inicio residencia — 8 dispositivos en piloto |
| Nov 2026 | Primeras 10 unidades vendidas — break-even operativo |
| Ene 2027 | MRR > USD 64 — suscripción activa validada |
| Mar 2027 | 30+ dispositivos activos — primera alianza B2B2C |
| Jul 2027 | MRR USD 304 — inicio proceso levantamiento capital semilla |

---

*Documento generado para postulación startuplab.01 2026 — IOT CHILE SpA.*
*Cifras en USD salvo indicación. Tipo de cambio operativo: 1 USD = 950 CLP.*
*Fuentes internas: KPCL_CATALOGO_COMPONENTES_Y_COSTOS.md, MODELO_FINANCIERO.md, 04_MODELO_NEGOCIO_FINANZAS_2026.md*
