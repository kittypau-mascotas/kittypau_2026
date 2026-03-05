# Business Case — Kittypau IoT
**Proceso PMBOK**: 4.1 (insumo al Project Charter) | PMBOK 7: Dominio de Entrega de Valor
**Version**: 1.0 | Fecha: 2026-03-05
**Adaptable para**: CORFO Semilla Inicia / StartUp Chile / ANID Startup Ciencia

---

## Resumen Ejecutivo

Kittypau es una plataforma IoT + SaaS de monitoreo inteligente de mascotas que combina hardware propio de bajo costo (platos inteligentes con sensores) con una aplicacion web en tiempo real. El sistema detecta automaticamente cambios en los patrones de alimentacion e hidratacion, generando alertas tempranas que permiten a los duenos actuar antes de que un problema de salud se agrave.

**El problema es real, el prototipo funciona y el mercado existe.**

- Prototipo operativo con 8 dispositivos activos enviando datos 24/7
- Stack tecnologico completo: firmware IoT + bridge + backend + app web
- Modelo de negocio validado conceptualmente con potencial de recurrencia SaaS
- Costo de produccion unitario estimado en < $20 USD con produccion en serie

---

## 1. El Problema

### Contexto

Chile tiene una de las tasas de tenencia de mascotas mas altas de Latinoamerica. Se estima que el 66% de los hogares tiene al menos una mascota, con una poblacion de mas de 10 millones de gatos y perros. El gasto veterinario promedio por mascota ha crecido un 40% en los ultimos 5 anos.

### Dolor especifico

Los duenos no tienen visibilidad sobre los habitos diarios de sus mascotas cuando no estan presentes:

- No saben si su mascota comio o bebio agua durante el dia
- No detectan cambios de comportamiento hasta que hay sintomas clinicos evidentes
- Las consultas veterinarias de emergencia son costosas ($50.000 - $200.000 CLP) y muchas veces evitables
- No hay herramientas digitales accesibles para el monitoreo cotidiano en Chile

### Evidencia del problema

- 60% de las mascotas en Chile presenta sobrepeso (fuente: Colegio Medico Veterinario de Chile)
- La deshidratacion es causa de insuficiencia renal en gatos, frecuentemente detectada tarde
- Los duenos son incapaces de cuantificar cuanto come o bebe su mascota sin medicion objetiva

---

## 2. La Solucion

### Que es Kittypau

Un ecosistema integrado de tres capas:

**Capa 1 — Hardware (KPCL)**
Platos inteligentes con:
- Sensor de peso (celda de carga HX711, precision ±2g)
- Sensor de temperatura y humedad (DHT11/22)
- Sensor de luz ambiental (LDR)
- Microcontrolador ESP8266 (WiFi integrado) o ESP32-CAM (con camara)
- Carcasa impresa en 3D, modular y reparable

**Capa 2 — Conectividad e Infraestructura**
- Comunicacion via MQTT (HiveMQ Cloud, cifrado TLS)
- Bridge en Raspberry Pi Zero 2W: procesa y almacena datos 24/7
- Base de datos PostgreSQL en Supabase con RLS por usuario
- API REST en Next.js deployada en Vercel (CDN global)

**Capa 3 — Aplicacion Web**
- Dashboard en tiempo real con datos de peso, temperatura y humedad
- Historico de 30/90 dias con graficos interactivos
- Registro de mascotas y dispositivos con flujo de onboarding guiado
- Panel de administracion con telemetria y finanzas operativas
- Alertas configurables (proxima version)

### Diferenciadores clave

| Atributo | Kittypau | Alternativas actuales |
|----------|----------|----------------------|
| Precio | < $30 USD (hardware) | $80-200 USD (importados) |
| Datos en tiempo real | Si | No (productos locales) |
| Historial y tendencias | Si | No |
| Fabricacion local (Chile) | Si | No |
| Camara integrada (opcional) | Si | Costoso / separado |
| Open source parcial | Si | No |

---

## 3. Mercado Objetivo

### Segmento primario (B2C)

**Perfil**: Duenos de mascotas de 25-45 anos, NSE medio-alto, conectados digitalmente, que consideran a su mascota como parte de la familia y gastan activamente en su bienestar.

- Tamano mercado Chile: ~1,2 millones de hogares objetivo
- Dispuestos a pagar por tecnologia que mejore la salud de su mascota
- Alta penetracion de smartphones y conectividad WiFi en el hogar

### Segmento secundario (B2B — fase 3)

- Clinicas veterinarias: monitoreo remoto post-cirugia o dietetica
- Pet hotels y guarderias: registro automatico de alimentacion
- Seguros de mascotas: datos objetivos para cobertura preventiva

### Tamano de mercado (TAM/SAM/SOM)

| Nivel | Descripcion | Estimado |
|-------|-------------|---------|
| TAM | Mercado total mascotas Chile | $350M USD/ano |
| SAM | Segmento tecnologia / accesorios inteligentes | $35M USD/ano |
| SOM | Captura realista ano 1-2 (piloto + early adopters) | $50.000 USD/ano |

---

## 4. Modelo de Negocio

### Camino A — Recomendado: Hardware + Suscripcion SaaS

```
Ingreso inicial:   Venta del plato inteligente ($25.000 - $35.000 CLP)
Ingreso recurrente: Suscripcion mensual premium ($3.990 - $5.990 CLP/mes)
```

**Flujo de valor**:
El cliente compra el hardware (margen bruto ~45%) y opcionalmente paga suscripcion mensual por funcionalidades premium: historico extendido, alertas inteligentes, reportes veterinarios, multi-mascota.

### Metricas objetivo (18 meses post-launch)

| KPI | Valor objetivo |
|-----|---------------|
| Usuarios activos | 200 |
| Conversion free -> paid | > 20% |
| ARPU (promedio) | $4.990 CLP/mes |
| MRR | $199.600 CLP (~$210 USD) |
| Churn mensual | < 5% |
| LTV estimado | $99.800 CLP (~$105 USD) |
| CAC objetivo | < $15.000 CLP |
| LTV/CAC | > 6x |

### Proyeccion financiera (escenario base)

| Periodo | Unidades vendidas | MRR (USD) | Ingresos acumulados (USD) |
|---------|------------------|-----------|--------------------------|
| Mes 1-3 (piloto) | 10 | $0 | $250 (hardware) |
| Mes 4-6 | 30 | $84 | $1.100 |
| Mes 7-12 | 80 | $420 | $4.800 |
| Ano 2 | 300 | $1.680 | $22.000 |
| Ano 3 | 1.000 | $6.300 | $85.000 |

### Break-even operativo

- Costos fijos mensuales (cloud + operacion): ~$150 USD/mes (shadow-price)
- Break-even en MRR: 38 suscriptores activos
- Break-even en unidades: ~35 ventas de hardware a $30 USD c/u

---

## 5. Estado Actual del Desarrollo

### Lo que ya existe (probado y funcional)

| Componente | Estado | Evidencia |
|------------|--------|-----------|
| Firmware ESP8266 v1.0 | Funcional | 4 unidades activas (KPCL0034-0038) |
| Firmware ESP32-CAM | Funcional | 1 unidad activa (KPCL0040) |
| Bridge MQTT v2.6 | Deployado | RPi en produccion 24/7 |
| Base de datos Supabase | Activa | Schema completo, RLS, migraciones versionadas |
| App web (Next.js) | Deployada | Vercel, dashboard en tiempo real operativo |
| Panel admin | Funcional | Telemetria, finanzas, estado de dispositivos |
| Sistema CI/CD | Activo | GitHub Actions + Vercel |

### Nivel de madurez tecnologica (TRL)

**TRL 6 — Demostracion de prototipo en entorno relevante**

El sistema completo opera en condiciones reales de hogar, con datos siendo recolectados, procesados y visualizados en tiempo real. Los dispositivos han superado pruebas de conectividad, calibracion y estabilidad.

---

## 6. Equipo

| Nombre | Rol | Competencias clave |
|--------|-----|-------------------|
| Javier Suarez | Co-fundador / CTO | Firmware IoT, hardware, PlatformIO, C++, sistemas embebidos |
| Mauro Carcamo | Co-fundador / CPO | Full-stack (Next.js/TypeScript), SQL, arquitectura de producto, UX |

**Complementariedad**: El equipo cubre el 100% del stack sin dependencia externa — desde el firmware del microcontrolador hasta el frontend de la aplicacion web.

---

## 7. Plan de Uso de Fondos (CORFO Semilla Inicia — referencia)

Monto solicitado: **$17.000.000 CLP** (75% CORFO + 25% contraparte propia)

| Categoria | Monto CLP | % | Descripcion |
|-----------|-----------|---|-------------|
| Hardware y componentes (escala piloto) | $4.500.000 | 26% | Componentes para 50 unidades, celdas de carga, PCBs, ESP8266/ESP32 |
| Manufactura e impresion 3D | $2.500.000 | 15% | Carcasas, ensamblaje, postproceso |
| Desarrollo de software (horas) | $5.000.000 | 29% | App movil (v1), mejoras app web, sistema de alertas |
| Validacion y piloto | $2.000.000 | 12% | Costo de adquisicion primeros 30 usuarios, marketing digital |
| Legalizacion y constitucion empresa | $1.500.000 | 9% | Notaria, SII, dominio, marca |
| Imprevistos (10%) | $1.500.000 | 9% | Contingencias tecnicas y operativas |
| **Total** | **$17.000.000** | **100%** | |

---

## 8. Impacto Esperado

### Impacto directo

- Mejora objetiva en la salud de mascotas mediante deteccion temprana de anomalias
- Reduccion de gastos veterinarios de emergencia para las familias usuarias
- Generacion de empleo local en manufactura de hardware y desarrollo de software

### Impacto en el ecosistema de innovacion

- Primer producto IoT veterinario fabricado en Chile a escala
- Modelo replicable para otros segmentos de cuidado animal (ganado, animales de servicio)
- Generacion de datos anonimizados de salud animal con valor cientifico potencial

### Metas de impacto medibles

| Indicador | Meta a 12 meses | Meta a 24 meses |
|-----------|-----------------|-----------------|
| Usuarios activos con datos en vivo | 50 | 300 |
| Mascotas monitoreadas | 80 | 500 |
| Empleos generados (directos) | 2 | 5 |
| Alertas de salud generadas | 500/mes | 5.000/mes |
| Ahorro estimado en veterinaria | $500.000 CLP/mes | $5.000.000 CLP/mes |

---

## 9. Riesgos y Mitigaciones (resumen)

| Riesgo | Mitigacion |
|--------|-----------|
| Bajo adoption rate inicial | Piloto controlado con 10 usuarios, iteracion rapida |
| Falla de hardware en campo | Garantia 6 meses, stock de repuestos, disenio modular |
| Escalabilidad cloud | Shadow-pricing activo, planes de upgrade documentados |
| Copia del producto | Velocidad de ejecucion + datos propietarios como moat |

> Ver detalle completo en [06_RISK_REGISTER.md](06_RISK_REGISTER.md)

---

## 10. Proximos Pasos Inmediatos

1. **[Urgente]** Postular a CORFO Semilla Inicia antes del 16 de marzo 2026
2. Completar documentacion PMO restante (alcance, cronograma, riesgos)
3. Constituir empresa formal (paralelamente al fondo)
4. Iniciar piloto con primeros 10 usuarios externos
5. Desarrollar sistema de alertas (funcionalidad premium prioritaria)

---

_Referencias: PMBOK 6ta Ed. Seccion 4.1 (Business Case como insumo) | PMBOK 7ma Ed. Principio de Enfoque en el Valor_
_Documento anterior: [01_PROJECT_CHARTER.md](01_PROJECT_CHARTER.md) | Siguiente: [05_COST_BUDGET.md](05_COST_BUDGET.md)_
