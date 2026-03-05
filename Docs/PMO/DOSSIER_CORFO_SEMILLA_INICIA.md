# Dossier de Postulacion — CORFO Semilla Inicia
**Fondo**: CORFO Semilla Inicia
**Monto solicitado**: $17.000.000 CLP
**Cofinanciamiento**: 75% CORFO / 25% emprendedor ($4.250.000 CLP)
**Fecha limite**: 16 de marzo 2026
**Estado**: Listo para postular

> INSTRUCCIONES DE USO:
> Cada seccion indica el campo del formulario CORFO al que corresponde.
> Los textos entre [CORCHETES] son datos a confirmar o completar.
> Los textos entre (parentesis) son instrucciones internas — eliminar antes de pegar.

---

## DATOS DEL EMPRENDEDOR

**Nombre completo**: Mauricio Cristian Carcamo Diaz
**RUT**: 17.402.237-2
**Edad**: [EDAD — verificar, ~36 anos si nacio en 1989]
**Email**: mauro.carcamo89@gmail.com
**Telefono**: [TELEFONO]
**Region de postulacion**: Region Metropolitana
**Nivel educacional**: [NIVEL — ej: Universitario completo / Tecnico / En curso]
**Situacion laboral**: Independiente / Otro

**Empresa**: IOT CHILE SpA
**RUT empresa**: [RUT SpA — verificar en SII]
**Fecha constitucion**: 10 de julio de 2025
**Rol en empresa**: Representante legal / Gerente General

**Co-emprendedor**:
**Nombre**: Javier Suarez
**RUT**: [RUT JAVIER — pendiente]
**Email**: javomauro.contacto@gmail.com
**Rol**: Co-fundador, Director Tecnico (firmware IoT, hardware, sistemas embebidos)

---

## CAMPO 1: NOMBRE DEL PROYECTO
*(max ~100 caracteres)*

```
Kittypau IoT — Plataforma de monitoreo inteligente para mascotas
```

---

## CAMPO 2: DESCRIPCION BREVE DEL PROYECTO
*(max ~300 caracteres — para el resumen de postulacion)*

```
Kittypau es un sistema IoT que permite a los duenos de mascotas monitorear
en tiempo real cuanto come y bebe su animal mediante platos inteligentes
fabricados en Chile, conectados a una app web que detecta anomalias y
alerta al dueno antes de que un problema de salud se agrave.
```

---

## CAMPO 3: DESCRIPCION DEL PROBLEMA
*(max ~1.000-1.500 caracteres segun formulario)*

```
El 66% de los hogares chilenos tiene al menos una mascota, con una
poblacion estimada de mas de 10 millones de gatos y perros. Sin embargo,
los duenos no tienen forma de saber cuanto come o bebe su animal cuando
no estan presentes.

Esta falta de visibilidad tiene consecuencias concretas:
- El 60% de los gatos y perros en Chile presenta sobrepeso (Colegio
  Medico Veterinario de Chile), muchas veces por sobrealimentacion
  no detectada a tiempo.
- La deshidratacion cronica es la principal causa de insuficiencia renal
  felina, una enfermedad silenciosa que solo se detecta cuando ya hay
  dano organico.
- Las consultas veterinarias de emergencia por causas relacionadas con
  alimentacion cuestan entre $50.000 y $200.000 CLP y en muchos casos
  son evitables si el dueno hubiera notado el cambio de comportamiento
  antes.

El mercado de tecnologia para mascotas en Chile no cuenta con un producto
local que combine hardware accesible, conectividad en tiempo real y
analisis de comportamiento en una sola solucion. Los productos importados
disponibles cuestan entre $80.000 y $200.000 CLP y no tienen soporte local.
```

---

## CAMPO 4: DESCRIPCION DE LA SOLUCION
*(max ~1.000-1.500 caracteres)*

```
Kittypau es una plataforma IoT compuesta por tres elementos integrados:

1. HARDWARE PROPIO (fabricado en Chile):
Platos inteligentes con sensor de peso (precision ±2 gramos), sensor de
temperatura y humedad, y opcionalmente camara. Fabricados con carcasa
impresa en 3D y electronica de bajo costo (microcontrolador ESP8266/
ESP32). Precio unitario de construccion: ~$21.500 CLP.

2. CONECTIVIDAD EN TIEMPO REAL:
Los dispositivos se conectan a WiFi del hogar y envian datos cada 5
segundos al sistema en la nube mediante protocolo MQTT cifrado. Un
servidor puente (Raspberry Pi) procesa y almacena los datos 24/7.

3. APLICACION WEB (en operacion desde enero 2026):
Dashboard en tiempo real donde el dueno ve cuanto comio y bebio su
mascota, con historico de 90 dias, alertas configurables y analisis de
patrones de comportamiento.

El sistema ya esta funcionando: contamos con 8 dispositivos activos
enviando datos en tiempo real. La app esta deployada en internet y
accesible desde cualquier dispositivo con navegador.

Diferenciador clave: somos el unico sistema IoT veterinario fabricado
en Chile, con un costo de hardware 5 veces menor que los competidores
importados y soporte local.
```

---

## CAMPO 5: INNOVACION Y DIFERENCIACION
*(max ~800 caracteres)*

```
La innovacion de Kittypau opera en tres dimensiones:

INNOVACION DE PRODUCTO: integramos en un solo sistema hardware IoT
fabricado localmente, conectividad en tiempo real y analisis de
comportamiento animal. Ninguna solucion existente en Chile combina
estas tres capas a este precio.

INNOVACION DE PROCESO: usamos impresion 3D y electronica accesible
(componentes < $30 USD) para producir hardware que los competidores
importan a $80-200 USD. Esto nos permite llegar a un segmento de mercado
masivo que hoy no tiene acceso a tecnologia de monitoreo.

INNOVACION DE MODELO DE NEGOCIO: el hardware es el canal de adquisicion
(margen ~45%) y la suscripcion mensual es el motor de valor recurrente
(modelo SaaS). Los datos anonimizados de comportamiento animal tienen
potencial de valor secundario para veterinarias e investigacion.

Nivel de madurez tecnologica: TRL 6 (prototipo funcionando en entorno
real, 8 dispositivos activos en hogares).
```

---

## CAMPO 6: MERCADO OBJETIVO
*(max ~800 caracteres)*

```
SEGMENTO PRIMARIO: duenos de mascotas de 25-45 anos, nivel
socioeconomico medio-alto, con conectividad WiFi en el hogar y
disposicion a pagar por tecnologia que mejore la salud de su animal.

Tamano de mercado Chile:
- Hogares con mascota: ~3,2 millones
- Segmento objetivo (NSE medio-alto + conectados): ~1,2 millones
- Dispuestos a pagar por tecnologia de monitoreo (estimado 8%): ~96.000

SEGMENTO SECUNDARIO (fase 3): clinicas veterinarias, pet hotels y
guarderias que necesitan registro automatico de alimentacion.

El mercado de productos para mascotas en Chile crece sostenidamente:
~$350 millones USD anuales, con aceleracion post-pandemia. El segmento
de tecnologia e accesorios inteligentes representa ~10% y no tiene
jugadores locales relevantes.

META ANO 1: 50 unidades vendidas, 10 suscriptores activos.
META ANO 2: 300 unidades, 60 suscriptores, MRR > $300.000 CLP.
```

---

## CAMPO 7: MODELO DE NEGOCIO
*(max ~800 caracteres)*

```
MODELO COMBINADO: hardware + suscripcion SaaS.

INGRESO INICIAL (hardware):
Venta del plato inteligente a $29.990 CLP.
Costo de construccion: ~$20.425 CLP.
Margen bruto unitario: ~$9.565 CLP (32%).

INGRESO RECURRENTE (suscripcion):
Plan premium a $4.990 CLP/mes.
Incluye: historico extendido, alertas inteligentes,
reportes veterinarios, soporte multi-mascota.

METRICAS OBJETIVO (18 meses):
- 200 usuarios activos
- 40 suscriptores premium
- MRR: $199.600 CLP (~$210 USD)
- LTV/CAC proyectado: > 6x
- Break-even: 26 suscriptores activos

Los fondos CORFO se destinan a escalar la produccion
(50 unidades), desarrollar la app movil y adquirir los
primeros 30-50 usuarios del piloto.
```

---

## CAMPO 8: EQUIPO
*(max ~600 caracteres)*

```
MAURICIO CARCAMO DIAZ — Co-fundador y Director de Producto
Desarrollador full-stack con especialidad en Next.js, TypeScript
y arquitectura de datos. Representante legal de IOT CHILE SpA.
Responsable de la aplicacion web, API REST, base de datos Supabase
y estrategia de producto y negocio.
[AGREGAR: nivel educacional, institucion, experiencia laboral previa]

JAVIER SUAREZ — Co-fundador y Director Tecnico
Especialista en sistemas embebidos, firmware IoT y hardware.
Responsable del desarrollo del dispositivo fisico: firmware en
C++ (PlatformIO), electronica, carcasa 3D y sistema de
conectividad MQTT.
[AGREGAR: nivel educacional, institucion, experiencia laboral previa]

Complementariedad total: el equipo cubre el 100% del stack tecnico
sin dependencia externa — desde el firmware del chip hasta el
frontend de la aplicacion. IOT CHILE SpA, constituida julio 2025,
es el vehiculo legal del proyecto.
```

---

## CAMPO 9: PLAN DE USO DE FONDOS
*(desglose por categoria — usar tabla del 05_COST_BUDGET.md)*

```
MONTO TOTAL: $17.000.000 CLP
APORTE CORFO (75%): $12.750.000 CLP
CONTRAPARTE PROPIA (25%): $4.250.000 CLP

DESGLOSE:
1. Hardware y componentes electronicos (50 unidades): $4.500.000 CLP
   - MCUs ESP8266/ESP32-CAM, celdas de carga, sensores HX711,
     PCBs, fuentes de poder, cables y conectores.

2. Manufactura e impresion 3D: $2.500.000 CLP
   - Filamento PLA+ (10kg), impresion de carcasas, ensamblaje
     manual, postproceso y calibracion QA por unidad.

3. Desarrollo de software: $5.000.000 CLP
   - App movil v1 (iOS/Android via React Native), sistema de
     alertas inteligentes, mejoras de UX/dashboard.

4. Validacion y piloto: $2.000.000 CLP
   - Costo de adquisicion de 30-50 primeros usuarios, materiales
     de usuario, soporte de onboarding, encuestas.

5. Legalizacion y constitucion de empresa: $1.500.000 CLP
   - Constitucion SPA, registro de marca Kittypau, dominio .cl.

6. Imprevistos (10%): $1.500.000 CLP

TOTAL: $17.000.000 CLP
```

---

## CAMPO 10: ETAPA ACTUAL DEL PROYECTO
*(seleccion + descripcion)*

```
ETAPA: Prototipo funcional

El proyecto cuenta con:
- 8 dispositivos IoT activos enviando datos en tiempo real
- Aplicacion web deployada y accesible en internet
- Sistema de base de datos con mas de [X] lecturas recolectadas
- Pipeline CI/CD automatizado (GitHub Actions + Vercel)
- Arquitectura documentada y codigo versionado en GitHub

El sistema opera de forma continua 24/7 sin intervencion manual.
Nivel de madurez tecnologica: TRL 6.
```

---

## CAMPO 11: IMPACTO ESPERADO
*(max ~600 caracteres)*

```
IMPACTO DIRECTO:
- Mejora objetiva en la salud de mascotas mediante deteccion
  temprana de cambios de comportamiento alimenticio.
- Reduccion de gastos veterinarios de emergencia para familias
  chilenas (estimado: $100.000 - $200.000 CLP por consulta evitada).
- Generacion de 2 empleos directos en el primer ano, escalables
  a 5 con el crecimiento.

IMPACTO EN EL ECOSISTEMA:
- Primer producto IoT veterinario fabricado en Chile a escala.
- Generacion de datos anonimizados de salud animal con potencial
  valor para veterinarias e investigacion cientifica.
- Modelo replicable para otros segmentos de cuidado animal.

METAS MEDIBLES (12 meses):
- 50 mascotas monitoreadas activamente
- $500.000 CLP/mes en ahorro veterinario estimado para usuarios
- 2 empleos directos creados
```

---

## CAMPO 12: CRONOGRAMA DE ACTIVIDADES
*(Carta Gantt simplificada — 12 meses post-adjudicacion)*

```
MES 1-2: Constitucion legal + compra de componentes (50 unidades)
MES 2-3: Manufactura de 50 unidades + QA por unidad
MES 3-4: Desarrollo sistema de alertas v1 (app web)
MES 4-5: Onboarding de 30 usuarios piloto
MES 5-6: Iteracion basada en feedback del piloto
MES 6:   Inicio desarrollo app movil (React Native)
MES 7-8: App movil v1 (iOS/Android)
MES 8-9: Ampliar piloto a 50 usuarios
MES 9-10: Medicion de conversion free->paid
MES 10-11: Optimizacion COGS + nuevos proveedores
MES 11-12: Cierre piloto, informe de resultados, plan escala

HITO CLAVE MES 6: 30 usuarios activos, 6 suscriptores pagos
HITO CLAVE MES 12: 50+ usuarios, MRR > $100.000 CLP, COGS < $19.000
```

---

## DOCUMENTOS ADJUNTOS A PREPARAR

### Obligatorios
- [ ] Cedula de identidad Mauricio Carcamo (vigente, ambas caras) — RUT 17.402.237-2
- [ ] Cedula de identidad Javier Suarez (vigente, ambas caras)
- [ ] Certificado de Estatuto / Escritura IOT CHILE SpA (constitucion 10-07-2025)
- [ ] CV Mauricio Carcamo (max 2 paginas — ver plantilla abajo)
- [ ] CV Javier Suarez (max 2 paginas)

### Recomendados (evidencia del prototipo)
- [ ] Video corto (1-2 min) mostrando dispositivo enviando datos + app en tiempo real
- [ ] Capturas de pantalla del dashboard con datos reales
- [ ] Foto del dispositivo fisico ensamblado
- [ ] Link al repositorio GitHub (evidencia de 50+ commits activos)

---

## PLANTILLA CV (para cada fundador)

```
[NOMBRE COMPLETO]
[Email] | [Telefono] | [Ciudad, Chile]

PERFIL
[2-3 lineas describiendo experiencia y enfoque tecnico/comercial]

EDUCACION
[Titulo / Carrera] — [Institucion] — [Ano egreso o en curso]

EXPERIENCIA RELEVANTE
[Rol] — [Empresa o proyecto] — [Periodo]
- [Logro concreto 1]
- [Logro concreto 2]

HABILIDADES TECNICAS
[Lista de tecnologias/herramientas relevantes para el proyecto]

ROL EN KITTYPAU
[Descripcion del rol y responsabilidades especificas]
```

---

## CHECKLIST FINAL ANTES DE POSTULAR

### Contenido
- [ ] Todos los campos del formulario CORFO completados
- [ ] Presupuesto suma exactamente $17.000.000 CLP
- [ ] Contraparte propia documentada ($4.250.000 CLP)
- [ ] CVs de ambos fundadores adjuntos
- [ ] Declaracion jurada firmada
- [ ] Cedulas de identidad adjuntas
- [ ] Video o evidencia del prototipo (recomendado)

### Revision de contenido
- [ ] El texto del problema cita datos concretos (no solo opinion)
- [ ] La solucion menciona el prototipo funcional y el TRL 6
- [ ] El mercado incluye tamano estimado con fuente
- [ ] El presupuesto esta justificado por categoria
- [ ] El equipo menciona la complementariedad tecnica
- [ ] El impacto incluye al menos 2 indicadores medibles

### Logistica
- [ ] Cuenta en plataforma CORFO creada
- [ ] Region correcta seleccionada (verificar convocatoria activa)
- [ ] Postulacion enviada con al menos 24h de anticipacion al cierre
- [ ] Confirmacion de recepcion guardada

---

## PREGUNTAS FRECUENTES DEL EVALUADOR (y como responderlas)

**P: "No tienen empresa constituida. ¿Como van a ejecutar el proyecto?"**
R: Semilla Inicia permite postular como persona natural. La constitucion de empresa esta en el plan de uso de fondos (mes 1-2) y es parte del presupuesto solicitado.

**P: "¿Como saben que hay mercado para esto?"**
R: El 66% de hogares chilenos tiene mascota. El mercado de productos para mascotas crece 40% en 5 anos. Los productos equivalentes importados se venden a $80.000-200.000 CLP y tienen demanda — simplemente no hay oferta local accesible.

**P: "¿Que los diferencia de apps que ya existen?"**
R: Las apps existentes solo registran datos manualmente (el dueno escribe cuanto comio el gato). Kittypau mide automaticamente con hardware fisico. No hay que recordar, no hay error humano. Es la diferencia entre un fitbit y un diario de ejercicio en papel.

**P: "¿Por que Chile y no importar?"**
R: Fabricar localmente reduce el costo 5x, permite soporte presencial, garantia real y ajuste del producto al mercado local. El emprendimiento genera valor en Chile, no solo consume divisas.

**P: "¿Es sostenible financieramente?"**
R: Si. El modelo hardware + suscripcion permite break-even con 26 suscriptores activos (~$130.000 CLP/mes). La recurrencia SaaS hace el modelo predecible y escalable.

---

---

## DATOS PENDIENTES DE COMPLETAR

Los siguientes campos estan marcados con [CORCHETES] en el documento y requieren informacion:

| Campo | Estado | Donde aparece |
|-------|--------|--------------|
| [EDAD] Mauro | ~36 anos (inferido de email "89") — **confirmar** | DATOS DEL EMPRENDEDOR |
| [TELEFONO] Mauro | Pendiente | DATOS DEL EMPRENDEDOR |
| [RUT SpA] IOT CHILE SpA | Pendiente — verificar en SII | DATOS DEL EMPRENDEDOR |
| [NIVEL] educacional Mauro | Pendiente | DATOS DEL EMPRENDEDOR |
| [RUT JAVIER] | Pendiente | Co-emprendedor |
| Experiencia previa Mauro | Pendiente | CAMPO 8 + CV |
| Experiencia previa Javier | Pendiente | CAMPO 8 + CV |
| [X] lecturas en BD | Consultar Supabase | CAMPO 10 |

---

_Ultimo revision: 2026-03-05 | Basado en PMO documentos 01, 04, 05, 07_
_Datos personales verificados desde postulacion Sercotec 2024 (RUT 17402237-2)_
_Empresa: IOT CHILE SpA, constituida 10-07-2025_
_Deadline postulacion: 16 de marzo 2026_
