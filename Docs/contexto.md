# Contexto Canonico - Sesion 260703_planificacion

## Metadatos
- Fuente: transcripcion interna `260703_planificacion.m4a`.
- Participantes referenciados: equipo fundador y tecnico de Kittypau.
- Estado: documento canonico de contexto estrategico (reemplaza notas conversacionales crudas).
- Ultima actualizacion: 2026-03-09.

## Resumen Ejecutivo
La sesin define una expansin del ecosistema en tres horizontes:
1. `Kittypau` (core actual): PetTech AIoT para alimentacin e hidratacin de mascotas.
2. `Kitty Plant` (exploracion): IoT para plantas con deteccion por foto, monitoreo ambiental y analitica de riego.
3. `Senior Kitty` (vision): aplicacion futura de capacidades AIoT para cuidado en hogar.

El principio central acordado es: **hardware como puerta de entrada + datos longitudinales + analitica para decisiones preventivas**.

## Decisiones Vigentes (Aprobadas)
1. Mantener foco operativo en Kittypau (mascotas) como prioridad de producto.
2. Tratar Kitty Plant como vertical de evaluacion, sin desviar roadmap critico de la app actual.
3. Sostener el enfoque PetTech AIoT como narrativa unificada de marca y arquitectura.
4. Priorizar simplicidad UX: onboarding corto, vista demo clara, lectura rpida en `/today`.
5. Mantener consistencia entre perfiles `tester` y `cliente real` en reglas de mascota/dispositivo.

## Decisiones No Aprobadas (Descartadas o en Analisis)
1. Crear multiples cuentas Vercel por base de datos para "aprovechar tiers".
- Estado: **no aprobado**.
- Razon: aumenta complejidad operativa, riesgo de seguridad y deuda de gobernanza.

2. Incorporar mecanicas de clickbait como objetivo de producto.
- Estado: **no aprobado**.
- Razon: se permite analitica UX, pero no patrnes que degraden experiencia o confianza.

3. Cambios de branding que desplacen el core de mascotas en el corto plazo.
- Estado: **no aprobado**.
- Razon: el core actual aun tiene trabajo critico de estabilidad y coherencia.

## Implicancias Tecnicas para Kittypau (Core)
1. `/today` debe mantener coherencia estricta entre `pet_id`, `device_id` y selector visual.
2. Regla tester obligatoria: mapeo `test_#### -> KPCL####` (comida) y `KPCL####+1` (agua), con fallback por `pet_id`.
3. API `/api/readings` debe ser robusta ante diferencias de esquema entre entornos (migraciones pendientes).
4. Navbar, hero y cards deben leer la misma fuente de seleccion activa para evitar desincronizacin.
5. Las metricas de ambiente y batera deben priorizar exactitud de dato sobre efecto visual.

## Implicancias de Producto y UX
1. Sustituir etiquetas ambiguas por nomenclatura clara (ejemplo: `Unidad`, `Dia`, `Semana`, `Mes`).
2. Mantener interfaz minimal y entendible: menos ruido, mayor legibilidad de estado.
3. Demo mode debe capturar datos mnimos tiles (nombre, mascota, correo) sin mezclarlo con cuentas reales.
4. Story debe evolucionar a insights accinables, no solo visualizacion pasiva.

## Riesgos Detectados
1. Incoherencia documental por mezcla de notas crudas con definiciones canonicas.
2. Deriva de alcance por expansin simultanea (Kittypau + Kitty Plant + Senior Kitty) sin puertas de decision.
3. Contradicciones operativas entre "rapidez" y "gobernanza" (infra, despliegues, cuentas).

## Guardrails del Ecosistema
1. **Core first**: nada bloquea estabilidad de Kittypau por iniciativas de exploracion.
2. **Una fuente de verdad por dominio**: estrategia, arquitectura, contratos y roadmap.
3. **Auditoria mensual de coherencia**: score por dimension + plan correctivo.
4. **PR con trazabilidad**: cambio en UX/API/SQL debe actualizar doc canonico correspondiente.

## Backlog Derivado del Contexto
### P0
- Cerrar coherencia completa de seleccion mascota/dispositivo en `/today` + `navbar`.
- Completar migraciones de batera en DB y eliminar fallback transitorio cuando corresponda.

### P1
- Formalizar especificacion funcional de Kitty Plant (solo discovery tecnico/comercial).
- Estandarizar demo mode y capturas de analitica UX no invasiva.

### P2
- Definir criterios de gate para abrir vertical Senior Kitty (no antes de madurez core).

## Referencias Relacionadas
- `Docs/PLAN_PENDIENTES_APP_WEB_KITTYPAU.md`
- `Docs/AUDITORIA_COHERENCIA_ECOSISTEMA.md`
- `Docs/GUIA_DECISION.md`
- `Docs/DOC_MAESTRO_DOMINIO.md`
- `Docs/ARQUITECTURA_PROYECTO.md`

## Estado Operativo Actual (2026-03-09)
1. `main` actualizado con ajustes de UX APK nativa en login y `/today`.
2. Ajuste mobile APK aplicado en login:
- mantener titulo principal visible,
- ocultar texto pequeno descriptivo,
- compactar distancias verticales (plato, bloque marca, card login),
- rebalancear dimensiones para vista de telefono real.
3. Ajuste mobile APK aplicado en `/today`:
- compactacion de hero (resumen alimentacin/hidratacin + selector de periodo),
- reduccion tipografica de metricas dentro de cards de plato.
4. Despliegue productivo vigente:
- URL productiva: `https://kittypau-app.vercel.app`
- ultimo deploy confirmado: `https://kittypau-88jx7gso2-kittypaus-projects.vercel.app`

## Actualizacion de coherencia (2026-03-09, post despliegue)
1. Se consolido ajuste **APK-only** en login para primera vista:
- orden visual mantenido: `plato -> mensaje -> logo -> Kittypau -> PetTech AIoT`,
- bloque de marca centrado y agrandado en flavor nativo (`kp-native-apk` / `kp-flavor-native`),
- redes sociales + card de login conservadas como contenido de scroll.

2. Se reforzo separacion de alcance Web vs APK:
- web conserva estructura base de login (sin forzar layout de APK),
- APK aplica compactacion/centrado con reglas CSS acotadas por clase de entorno nativo.

3. Trazabilidad tecnica:
- commit principal: `daff54f` (main),
- produccion actual: `https://kittypau-app.vercel.app`,
- deploy asociado: `https://kittypau-88jx7gso2-kittypaus-projects.vercel.app`.



