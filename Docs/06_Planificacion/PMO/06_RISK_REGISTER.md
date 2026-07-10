# Registro de Riesgos — Kittypau IoT
**Proceso PMBOK**: 11.2-11.6 Planificacion y Respuesta a Riesgos | PMBOK 7: Dominio de Incertidumbre
**Version**: 1.0 | Fecha: 2026-03-05
**Propietario**: Director del Proyecto

---

## Escala de valoracion

| Nivel | Probabilidad | Impacto |
|-------|-------------|---------|
| 1 — Muy baja | < 10% | Minimo: no afecta hitos clave |
| 2 — Baja | 10-25% | Menor: ajuste de cronograma < 1 semana |
| 3 — Media | 25-50% | Moderado: retraso > 1 semana o costo +20% |
| 4 — Alta | 50-75% | Mayor: impacto en hitos criticos |
| 5 — Muy alta | > 75% | Critico: pone en riesgo el proyecto |

**Exposicion al riesgo** = Probabilidad x Impacto

- 1-4: Bajo (monitorear)
- 5-9: Medio (mitigar)
- 10-15: Alto (plan de accin inmediato)
- 16-25: Critico (escalar / redefinir)

---

## Registro de riesgos

### R01 — No adjudicacion de CORFO Semilla Inicia

| Campo | Valor |
|-------|-------|
| Categoria | Financiero / Fondos |
| Probabilidad | 3 (Media) |
| Impacto | 3 (Moderado) |
| Exposicion | 9 (Medio) |
| Propietario | Ambos fundadores |
| Estrategia | Mitigar + Transferir |
| Respuesta | Postular a multiples fondos en paralelo (ANID, StartUp Chile, regionales). Mantener operacin con recursos propios hasta fase piloto. Preparar dossier generico retilizable. |
| Plan de contingencia | Si se rechaza, revisar feedback y postular a convocatoria siguente o region diferente. Explorar inversionistas angel como alternativa. |
| Estado | Activo |

---

### R02 — Falla critica de componente electronico en campo

| Campo | Valor |
|-------|-------|
| Categoria | Tecnico / Hardware |
| Probabilidad | 3 (Media) |
| Impacto | 4 (Mayor) |
| Exposicion | 12 (Alto) |
| Propietario | Javier Suarez (CTO) |
| Estrategia | Mitigar |
| Respuesta | Disenio modular con piezas reemplazables. Stock mnimo de componentes criticos (HX711, ESP8266, celdas de carga). Garantia de 6 meses con reemplazo. Procedimiento de diagnostico remoto via MQTT. |
| Plan de contingencia | Envio de reemplazo express al usuario. Analisis de telemetra post-falla para mejora de diseno. |
| Estado | Activo |

---

### R03 — Baja adopcion en el piloto (churn alto)

| Campo | Valor |
|-------|-------|
| Categoria | Mercado / Producto |
| Probabilidad | 3 (Media) |
| Impacto | 4 (Mayor) |
| Exposicion | 12 (Alto) |
| Propietario | Mauro Carcamo (CPO) |
| Estrategia | Mitigar |
| Respuesta | Piloto controlado con 10 usuarios seleccionados (duenos comprometidos). Entrevistas de usuario antes de lanzar. Iteracion semanal basada en feedback. Onboarding asistido personal. |
| Plan de contingencia | Redefinir propuesta de valor si conversin < 10%. Explorar segmento veterinario como canal alternativo. |
| Estado | Activo |

---

### R04 — Escalamiento de costos cloud al crecer la base de usuarios

| Campo | Valor |
|-------|-------|
| Categoria | Financiero / Infraestructura |
| Probabilidad | 2 (Baja) |
| Impacto | 3 (Moderado) |
| Exposicion | 6 (Medio) |
| Propietario | Mauro Carcamo |
| Estrategia | Mitigar |
| Respuesta | Sistema de shadow-pricing activo en panel admin. Monitoreo continuo de MB y horas de compute por dispositivo. Plan de upgrade documentado por proveedor (Supabase, Vercel, HiveMQ). Precio de suscripcion cubre OPEX desde 38 usuarios. |
| Plan de contingencia | Activar plan pago cuando ingresos superen threshold. Optimizar queries y reducir frecuencia de polling si costos superan proyeccion. |
| Estado | Activo |

---

### R05 — Competidor lanza producto similar en Chile

| Campo | Valor |
|-------|-------|
| Categoria | Competitivo / Mercado |
| Probabilidad | 2 (Baja) |
| Impacto | 4 (Mayor) |
| Exposicion | 8 (Medio) |
| Propietario | Ambos fundadores |
| Estrategia | Mitigar + Aceptar |
| Respuesta | Acelerar vlidacion y traccin para construir base de usuarios antes de que el mercado se llene. Datos propietarios de comportamiento de mascotas como ventaja competitiva durable. Precio agresivo en hardware (barrera de entrada). Registro de marca. |
| Plan de contingencia | Si entra competidor, enfocarse en calidad de datos y features que no puede replicar facilmente (historico, IA predictiva). Explorar acuerdos de exclusividad con veterinarias. |
| Estado | Monitorear |

---

### R06 — Dependencia de un solo proveedor critico (HiveMQ, Supabase o Vercel)

| Campo | Valor |
|-------|-------|
| Categoria | Tecnico / Infraestructura |
| Probabilidad | 2 (Baja) |
| Impacto | 5 (Critico) |
| Exposicion | 10 (Alto) |
| Propietario | Javier Suarez |
| Estrategia | Mitigar |
| Respuesta | Arquitectura disenada con capas desacopladas. Bridge puede cambiar de broker MQTT sin refactoring mayor. Base de datos con migraciones versinadas (portabilidad a otro proveedor Postgres). Variables de entorno centralizadas para cambio rapido de endpoint. |
| Plan de contingencia | Plan de migracion documentado por proveedor: Supabase->Neon, HiveMQ->AWS IoT, Vercel->Railway. Estimado de migracion: 1-2 semanas por proveedor. |
| Estado | Activo |

---

### R07 — Retraso en constitucion legal de la empresa

| Campo | Valor |
|-------|-------|
| Categoria | Legal / Administrativo |
| Probabilidad | 3 (Media) |
| Impacto | 3 (Moderado) |
| Exposicion | 9 (Medio) |
| Propietario | Mauro Carcamo |
| Estrategia | Mitigar |
| Respuesta | Iniciar tramites de constitucion en paralelo a postulacion CORFO. CORFO Semilla Inicia permite postular como persona natural en etapa temprana. ANID requiere empresa constituida — deadline real es agosto 2026. |
| Plan de contingencia | Si hay retrasos notariales, usar plataforma de empresas en un dia (MINECON). Priorizar SPA (Sociedad por Acciones) para simplicidad. |
| Estado | Activo |

---

### R08 — Equipo part-time — riesgo de disponibilidad

| Campo | Valor |
|-------|-------|
| Categoria | Recursos / Equipo |
| Probabilidad | 4 (Alta) |
| Impacto | 3 (Moderado) |
| Exposicion | 12 (Alto) |
| Propietario | Ambos fundadores |
| Estrategia | Aceptar + Mitigar |
| Respuesta | Cronograma con buffers reales. Priorizar entregables criticos (postulacion CORFO). Comunicacion asincrona documentada (GitHub, documentos). Acuerdo de dedicacion minima: 20h/semana por fundador. |
| Plan de contingencia | Si uno queda no disponible por periodo > 2 semanas, el otro puede cubrir areas criticas (stack unico compartido). Documentacion continua como seguro. |
| Estado | Activo |

---

### R09 — Conectividad WiFi inestable en hogares de usuarios

| Campo | Valor |
|-------|-------|
| Categoria | Tecnico / Producto |
| Probabilidad | 3 (Media) |
| Impacto | 2 (Menor) |
| Exposicion | 6 (Medio) |
| Propietario | Javier Suarez |
| Estrategia | Mitigar |
| Respuesta | Firmware con reconexin automtica MQTT y WiFi. Buffer local en caso de desconexin transitoria. Dashboard muestra estado de conectividad del dispositivo. Instrucciones de instalacion cerca del router. |
| Plan de contingencia | Si persiste, ofrecer gua de configuracin de red y soporte tecnico basico en onboarding. |
| Estado | Activo |

---

### R10 — Precio de componentes electronicos sube > 20%

| Campo | Valor |
|-------|-------|
| Categoria | Financiero / Supply chain |
| Probabilidad | 2 (Baja) |
| Impacto | 3 (Moderado) |
| Exposicion | 6 (Medio) |
| Propietario | Javier Suarez |
| Estrategia | Mitigar |
| Respuesta | Compra de stock mnimo de componentes criticos (20 unidades) antes de escalar. Proveedores alternativos identificados (AliExpress, Electronica Embajador Chile, MCI). Modelo de costos con margen de 20% para absorber alzas. |
| Plan de contingencia | Redisenar BOM con componentes alternativos compatibles (cambio de MCU si necesario). Ajustar precio de venta en caso de alza sostenida. |
| Estado | Monitorear |

---

## Resumen de exposicion

| ID | Riesgo | Exposicion | Prioridad |
|----|--------|-----------|-----------|
| R02 | Falla electronico en campo | 12 | Alta |
| R03 | Baja adopcion piloto | 12 | Alta |
| R08 | Equipo part-time | 12 | Alta |
| R06 | Dependencia proveedor critico | 10 | Alta |
| R01 | No adjudicacion CORFO | 9 | Media |
| R07 | Retraso constitucion legal | 9 | Media |
| R05 | Competidor lanza similar | 8 | Media |
| R04 | Escalamiento costos cloud | 6 | Baja |
| R09 | WiFi inestable usuarios | 6 | Baja |
| R10 | Alza componentes | 6 | Baja |

---

## Oportunidades identificadas

| ID | Oportunidad | Probabilidad | Impacto |
|----|------------|-------------|---------|
| O1 | Adjudicar CORFO + acelerar produccion | Media | Alto |
| O2 | Dato anonimizado vendible a veterinarias o seguros | Alta | Alto |
| O3 | Canal B2B con veterinarias como distribuidores | Media | Alto |
| O4 | Reduccion COGS via produccion en serie (> 100 unidades) | Alta | Medio |
| O5 | Hardware open-source como comunidad y traccin | Baja | Medio |

---

_Referencias: PMBOK 6ta Ed. Cap. 11 (Gestion de Riesgos) | PMBOK 7ma Ed. Dominio de Incertidumbre_
_Documento anterior: [05_COST_BUDGET.md](05_COST_BUDGET.md) | Siguente: [07_STAKEHOLDERS.md](07_STAKEHOLDERS.md)_


