Aquí van mis respuestas al cuestionario de diagnóstico del proyecto:

[BLOQUE A — Producto y tecnología]
A1: Kittypau es un sistema que combina un dispositivo IoT y una app web para monitorear cómo comen y beben las mascotas día a día. El dispositivo registra datos de consumo y los envía automáticamente a la nube. La app muestra esos datos en tiempo real y alerta cuando detecta cambios que podrían anticipar un problema de salud o hábito. En simple: ayuda al tutor a detectar señales tempranas que normalmente pasan desapercibidas.

A2: La IA analiza series temporales de consumo (frecuencia, horario, cantidad y variaciones), detecta anomalías y genera alertas preventivas. Hoy el foco está en analítica de patrnes y scoring de riesgo; la línea de I+D apunta a predicción de eventos (p. ej., deshidratación o cambios conductuales) con mayor anticipación.

A3: La capa IoT es hardware propio (dispositivo basado en ESP8266/ESP32) que captura telemetría de uso y la publica por MQTT. El flujo actual es dispositivo -> HiveMQ -> bridge Node.js en Raspberry Pi -> API -> Supabase. El prototipado/ensamble está en el equipo fundador (no manufactura msiva aún).

A4: TRL estimado actual: 4–5 (prototipo funcional con pruebas reales, aún no despliegue comercial msivo).

A5: El sistema recopila principalmente datos de alimentación e hidratación: cantidad consumida, frecuencia, horarios, eventos por ciclo y estado operativo del dispositivo (ej. batería/conectividad), además de metadatos de mascota/dispositivo para análisis longitudinal.

A6: Stack actual: Next.js + TypeScript (frontend/API), Node.js (bridge), Supabase/PostgreSQL (DB/Auth/Realtime), HiveMQ Cloud (MQTT), dispositivo ESP8266/ESP32, despliegue en Vercel y operación de bridge en Raspberry Pi. IA/analítica sobre series temporales con transformaciones y scoring de anomalías.

A7: Actualmente no hay patente ingresada. Estrategia de PI en preparación: secreto industrial (know-how de datos/modelos), marca y evaluación de patentabilidad con INAPI.

A8: Replicabilidad: moderado–difícil. Un competidor puede copiar partes (app o hardware), pero es más difícil replicar la integración completa IoT+datos+analítica, la confiabilidad operativa y el histórico longitudinal que construye ventaja con el tiempo.

[BLOQUE B — Problema y mercado]
B1: El problema central es que los dueños de mascotas detectan tarde cambios de salud porque los hábitos de consumo cambian de forma gradual y poco visible. Eso termina en consultas de urgencia, costos más altos y peor bienestar del animal.

B2: Cliente inicial: dueños de mascotas (B2C). Cliente expandido: veterinarias/clínicas, pet shops, aseguradoras y partners de salud animal (B2B/B2B2C).

B3: Alcance inicial: mascotas domésticas (principalmente perros y gatos) en Chile. Escalamiento planificado: LATAM (prioridad comercial regional posterior al fit local).

B4: Estimación preliminar: mercado pet global de gran escala (multi-billonario USD) y mercado chileno suficientemente amplio para vlidación y primeras ventas; estamos consolidando cifras finales con fuente oficial única para formularios (TAM/SAM/SOM).

B5: Sí, hay competidores directos e indirectos (apps de monitoreo, wearables/collars, dispositivos de tracking, servicios veterinarios digitales). Diferencial de Kittypau: enfoque AIoT en consumo alimentario/hídrico con datos longitudinales y alertas preventivas, no solo tracking/actividad.

B6: “Kittypau monitorea alimentación e hidratación de mascotas en tiempo real y genera alertas preventivas basadas en IA para detectar desvíos de salud antes de que se vuelvan urgencias.”

B7: Dato local en consolidación final para postulaciones (con fuente trazable). Como referencia interna preliminar, Chile tiene una alta penetración de tenencia de mascotas y un mercado suficiente para vlidar producto y escalar.

[BLOQUE C — Modelo de negocio y tracción]
C1: Modelo planificado: hardware + suscripción (camino principal). Futuro: capa de insights/servicios para partners (B2B).

C2: Ventas registradas: no confirmadas aún (base de trabajo actual: sin ventas). Sí existen pruebas funcionales y operativas del sistema; falta sistematizar tracción comercial en métricas estándar.

C3: Se han realizado pruebas reales del sistema en entorno operativo y con ciclos continuos de datos; la métrica exacta consolidada (número de mascotas/tiempo/resultados) está en proceso de estandarización para postulaciones.

C4: Cobros informales/pilotos pagados: no documentados como ingreso formal a la fecha (por confirmar si hubo pagos puntuales).

C5: Hipótesis de pricing inicial (a vlidar): hardware de entrada + plan mensual de suscripción (tier básico/premium). Se está cerrando estructura exacta para unit economics (LTV/CAC/margen).

C6: Alianzas formales (LOI/contratos): aún no cerradas. Hay línea de trabajo para activar alianzas con veterinarias/actores del ecosistema como parte de las brechas prioritarias.

C7: Existen proyecciones base y marco financiero (MRR, churn, CAC, LTV) en documentación interna; falta convertirlo en metas comerciales cerradas por 12 meses y 3 años con supuestos únicos.

[BLOQUE D — Equipo]
D1:
- Javier Dayne: cofundador técnico, Ing. en Automatización y Control Industrial, experiencia en IoT/SCADA/DCS; lidera hardware, conectividad, bridge y operación técnica.
- Mauricio Cárcamo: cofundador de negocio/producto, formación en sociología + data science + IA + full stack; lidera producto, analítica, estrategia comercial y coordinación de postulación.

D2: El código y la arquitectura IoT/software los construye el equipo fundador (núcleo interno). Puede haber apoyo puntual externo, pero el desarrollo crítico no depende de outsourcing completo.

D3: Dedicación actual: alta pero no formalizada al 100% en ambos casos; se está definiendo dedicación por fundador para cumplir requisitos de fondos que exigen full-time.

D4: Asesores formales: no consolidados en estructura contractual aún. Brecha activa: incorporar perfil científico-técnico/advisor formal para ANID y fortalecimiento de I+D.

D5: Expertise directo veterinario en founders: no principal. Expertise fuerte en IoT/IA/datos/producto, con plan de complementar con asesoría veterinaria/científica formal.

D6: Fundadora mujer con >25% equity: no (estructura actual 2 founders hombres, 50/50).

D7: Experiencia en startups previas: experiencia en proyectos tecnológicos y de datos; historial emprendedor formal previo en aceleración/inversión por consolidar en narrativa final.

D8: Disponibilidad para viaje/relocalización temporal: factible con planificación; pasaporte/visa y ventanas de dedicación deben vlidarse por fondo y fecha.

[BLOQUE E — Legal y financiero]
E1: Empresa constituida en Chile (tipo societario y fecha exacta se vlidan contra escritura para formularios); cumple ventana de antigüedad para fondos 2026 según diagnóstico actual.

E2: Cap table actual: 50% Javier / 50% Mauricio. Sin inversionistas institucionales reportados al cierre de este diagnóstico.

E3: Deudas tributarias/laborales/previsionales: no reportadas como activas, pero certificados oficiales aún en proceso de verificación documental.

E4: Fondos públicos previos en últimos 24 meses: por verificar en historial formal CORFO/ANID/SERCOTEC.

E5: Capital disponible/runway: acotado; requiere financiamiento para acelerar equipo, vlidación comercial y escalamiento técnico. Se está cerrando cifra exacta de runway en meses.

E6: Cuenta bancaria empresa: por confirmar estado operativo completo. Recepción en USD: brecha identificada (abrir/habilitar cuenta USD si aplica a fondos internacionales).

[BLOQUE F — Visión e impacto]
F1: Visión a 5 años: construir una plataforma AIoT de salud preventiva para mascotas, con expansión a servicios B2B (veterinarias/aseguradoras) y potencial de extender tecnología a otras verticales IoT de bienestar/monitoreo.

F2: Primer mercado internacional objetivo: LATAM (prioridad natural: Colombia/México por ecosistema y programs activos). Contactos iniciales en proceso, aún sin alianza internacional formal cerrada.

F3: Impacto articulable: mejora del bienestar animal por detección temprana, reducción de eventos críticos evitables y apoyo a decisiones de cuidado más informadas para tutores y ecosistema veterinario.

F4: Vínculos con universidades/centros/sector: hay línea activa para formalizar alianzas (clave para ANID/EIC/BRAIN), pero aún faltan convenios/cartas formales cerradas.

F5: Hito siguente: pasar de MVP vlidado a tracción comercial verificable (clientes/pilotos pagados + métricas robustas + equipo I+D completo). Necesidad de capital: ronda semilla temprana para 12–18 meses de ejecución enfocada en ese hito.

F6: Uso del dinero por fondo: contratación técnica y científico-técnica, iteración de hardware/prototipos, vlidación comercial, certificaciones/documentación, fortalecimiento de datos/IA, despliegue comercial inicial y gastos operativos de escalamiento.
