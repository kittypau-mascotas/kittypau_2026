# Narrativa tecnocreativa para CRTIC LAB Ñuñoa

> Deriva de `../documento_2026/01_NARRATIVA_UNIFICADA_2026.md` (problema/solución/
> diferenciador ya validados) — acá solo el reframe de lenguaje, no una historia nueva.
> Insight original de esta reformulación: conversación con Mauro, 2026-09-15.

## Por qué el pitch de CORFO no sirve tal cual acá

La narrativa madre dice: *"Kittypau integra hardware IoT, backend y aplicación para
monitorear consumo y contexto, detectar desvíos y habilitar decisiones tempranas de
cuidado."* Es correcta y funciona para CORFO/ANID — pero en la rúbrica de CRTIC
(`02_MAPEO_RUBRICA_EVALUACION.md`) el 25% del puntaje es "pertinencia y calidad de la
propuesta" medida por **integración entre creatividad y tecnología**, no por
viabilidad de negocio. Presentado como "plato inteligente con IA para salud" suena a
producto healthtech genérico — exactamente lo que la rúbrica no premia.

## El reframe

**Mensaje corto (reemplaza al de la narrativa madre para este fondo)**:

> Kittypau convierte los datos invisibles del día a día de una mascota —cuánto come,
> cuánto bebe, a qué hora, con qué regularidad— en una experiencia visual e
> interactiva que un dueño puede sentir, no solo leer en una tabla.

**La cadena tecnocreativa** (mismo dato de siempre, otro lenguaje):

```
Mascota → sensores (plato + bebedero) → datos crudos → IA (detección de eventos,
Investigacion_v2) → interpretación → visualización/interacción → experiencia del
tutor → vínculo humano-mascota
```

## El diferencial real que hay que subrayar

La mayoría de proyectos tecnocreativos parten de una idea o una narrativa y recién
después buscan la tecnología (XR, proyección, Unreal Engine). Kittypau parte al
revés: **ya existe un objeto físico funcionando** (el comedero/bebedero KPCL, con
firmware real, en producción, con mascotas reales monitoreadas desde abril) — eso es
un punto de partida que casi ningún postulante tecnocreativo tiene. La residencia no
sería "construir el sensor", sería "construir la capa experiencial sobre datos reales
que ya existen" — reduce el riesgo de que el prototipo de la residencia no llegue a
funcionar a tiempo (criterio "factibilidad técnica y operativa", 20% del puntaje).

## Qué construiría el equipo durante la residencia (el "prototipo experiencial")

No un dashboard más. Ideas a validar con el equipo antes de escribir el formulario
(elegir UNA, no las tres — la rúbrica pide claridad, no ambición):

1. **Visualización generativa del estado de la mascota** — una pieza visual (pantalla
   o proyección) que traduce el patrón de comida/agua del día en una forma/color/
   movimiento que cambia en vivo, pensada para mostrarse en el Demo Day.
2. **Instalación interactiva** — el visitante del Demo Day "alimenta" una mascota
   virtual y ve, con datos reales de una mascota real, cómo se vería su día.
3. **Experiencia sonora/ambiental** — el estado de la mascota (bienestar/alerta)
   traducido a un paisaje sonoro simple (encaja con el workshop de "Sonido
   inmersivo" que ya trae el programa, ver bases §9.3).

La opción 1 es la más barata de construir con el equipo actual (Mauro ya tiene
Data Science + Next.js/React; no requiere aprender Unreal Engine ni motion capture
desde cero) y es la que mejor aprovecha los workshops del programa en vez de competir
con ellos.

## Ángulo de "retribución a la comuna" (10% del puntaje, criterio 7)

Bases §9.2, criterio 7: acción de impacto/transferencia en Ñuñoa. Opciones reales a
evaluar con Mauro (no inventar una sin confirmar viabilidad):
- Sesión abierta o demo en el Hub Ñuñoa mostrando cómo leer los datos de bienestar de
  una mascota — dirigido a dueños de mascotas de la comuna.
- Vínculo con alguna organización/refugio de Ñuñoa (si existe una relación real o se
  puede armar a tiempo) — igual que la idea de "SMART Vitacura" ya anotada en el
  radar de fondos (`../10_ACTUALIZACION_FECHAS_2026-09.md` §3).

## Lo que NO cambia

- El motor de detección (Investigacion_v2), los datos reales de KPCL0034/KPCL0035, y
  el equipo son los mismos que en cualquier otra postulación — esto es un reframe de
  presentación, no un pivot de producto.
- No se toca ningún componente del código de producción (`barras-sims-card.tsx` sigue
  protegido, no aplica acá de todos modos — esto es narrativa de postulación, no una
  tarea de ingeniería).
