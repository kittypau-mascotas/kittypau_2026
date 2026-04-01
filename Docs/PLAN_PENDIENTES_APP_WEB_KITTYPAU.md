# Plan Pendientes App + Web KittyPau (Enfoque PetTech AIoT)

## Objetivo
Ordenar el trabajo pendiente para mejorar experiencia de usuario, estabilidad operativa y valor AIoT en `web + app` sin perder la logica real `mascota <-> KPCL`.

## Criterios de prioridad
- P0: rompe flujo critico (login, hoy, datos, deploy).
- P1: afecta confianza del usuario o calidad de datos.
- P2: mejora de experiencia, escalabilidad y posicionamiento.

## P0 - Critico (resolver primero)
1. Estabilizar logica de seleccion en `/today`.
- Unificar selector de mascota para cuentas tester y cliente.
- Mantener sincronia entre `hero`, `navbar` y `platos` via `kittypau_pet_id`, `kittypau_device_id`, eventos.
- Validar regla documentada: `pet_id` + fallback `test_#### -> KPCL####` (comida) y `KPCL####+1` (agua).

2. Cerrar deuda de compatibilidad en `/api/readings`.
- Mantener fallback cuando no existan columnas nuevas de bateria.
- Aplicar migraciones pendientes en todos los entornos (local, staging, prod) para eliminar fallback temporal.

3. Endurecer flujo deploy.
- Checklist obligatorio pre-deploy: type-check, build, smoke test `/today`, `/api/readings`, `/api/mqtt/webhook`.
- Definir rollback operativo en Vercel para incidentes UI/API.

## P1 - Alto impacto (siguiente ciclo)
1. Hero operativo de `/today`.
- Finalizar estados visuales por porcentaje real de contenido (0/50/100) para comida y agua.
- Estandarizar componentes de ambiente (temp/humedad/luz) con iconografia consistente Kittypau.
- Mejorar accesibilidad (tooltips keyboard-friendly y labels claros).

2. Calidad de datos AIoT.
- Validar formulas de bateria estimada vs real y exponer fuente (`real/estimated`) en UI.
- Crear tests de contrato para lecturas con/ sin `battery_*`.
- Incorporar alertas de datos anomalos (lecturas negativas, saltos extremos, vacios prolongados).

3. Onboarding y vinculacion.
- Revisar flujo popup registro para asegurar `mascota + dispositivo` sin estados huerfanos.
- Fortalecer manejo de errores en QR / vinculo dispositivo.

## P2 - Consolidacion de producto
1. Story y narrativa.
- Convertir timeline en insights accionables (tendencias semanales/mensuales, cambios de habito).
- Alinear copy con posicionamiento PetTech AIoT.

2. App movil (Capacitor/Android).
- Definir ciclo de release (debug -> release unsigned -> signed).
- Checklist QA movil: login, today, story, offline/online, refresco de lecturas.

3. Observabilidad y operaciones.
- Dashboard de salud operativa: bridge, webhook, latencia, tasa de errores API.
- Alertas minimas: webhook caido, sin lecturas por dispositivo, KPCL offline sostenido.

## Plan por sprint (4 semanas)
### Semana 1 (P0)
- Cerrar selector `/today` y sincronia navbar/platos.
- Ejecutar migraciones y validar `/api/readings` sin fallback en entorno objetivo.
- Automatizar smoke test post-deploy.

### Semana 2 (P1)
- Completar UX hero (estados reales de plato + iconografia ambiente).
- Tests de contrato API para lecturas y bateria.

### Semana 3 (P1/P2)
- Robustecer onboarding/vinculacion.
- Mejorar story con insights semanales.

### Semana 4 (P2)
- QA movil de punta a punta.
- Observabilidad basica y alertas operativas.

## Definition of Done (DoD)
- `/today` refleja mascota y KPCL correctos en hero, navbar y tarjetas.
- API de lecturas responde sin errores 500 en escenarios con y sin columnas nuevas.
- Deploy a Vercel con checklist completo y rollback validado.
- Documentacion actualizada y consistente con comportamiento real.

## Referencias base
- `Docs/VISTAS_APP.md`
- `Docs/FRONT_BACK_APIS.md`
- `Docs/ARQUITECTURA_PROYECTO.md`
- `Docs/ESTADO_AVANCE.md`
- `Docs/PLAN_MEJORA_DB_ACTUAL.md`
- `Docs/BATERIA_ESTIMADA_KPCL.md`
## Contexto de Expansion del Ecosistema (Fuente: Docs/contexto.md)
- **Foco actual (core)**: `Kittypau` se mantiene como plataforma PetTech AIoT para alimentacion e hidratacion de mascotas.
- **Expansion en evaluacion**: `Kitty Plant` (IoT para plantas) como segunda vertical, reutilizando arquitectura y modelo de datos.
- **Vision de largo plazo**: `Senior Kitty` como posible tercera vertical para cuidados en hogar.
- **Estrategia transversal**: hardware como entrada + datos longitudinales + analitica para insights preventivos.
- **Producto y UX**: interfaz simple, menos friccion en onboarding y vista demo para explicar valor rapido.
- **Gobernanza tecnica**: conservar una base relacional coherente y contratos API estables entre web, app y dispositivos.

### Implicancias para App/Web (Kittypau)
1. `/today` y `navbar` deben mantener consistencia estricta entre mascota activa, `pet_id` y KPCL asociado.
2. Las decisiones visuales deben reforzar lectura rapida de estado real (alimentacion, hidratacion, ambiente, bateria).
3. El backlog funcional prioriza confiabilidad de datos por sobre efectos visuales.
4. Cualquier expansion de vertical (plantas/senior) debe montarse sobre componentes reutilizables del core.
