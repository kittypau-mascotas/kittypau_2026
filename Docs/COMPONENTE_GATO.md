# Componente "Gato" (Kittypau) - Detalle Extremo

Este documento describe el gato estilo cartoon usado en el login (y su variante del cuadro de dialogo tipo RPG) con detalle de:
- estructura HTML/DOM,
- CSS (variables, selectores, estados, animaciones),
- logica JS/TS (interacciones, seguimiento del mouse, timers),
- SVG (partes, IDs, grupos, colores y como se "re-skinea").

## Archivos fuente (canon)

1. Login (gato del panel + gato del cuadro de dialogo de Demo App)
- [page.tsx](D:/Escritorio/Proyectos/KittyPaw/kittypau_2026_hivemq/kittypau_app/src/app/(public)/login/page.tsx)

2. Demo (cuadro RPG dentro de `/demo` con "gato despierto" cargado desde SVG externo)
- [page.tsx](D:/Escritorio/Proyectos/KittyPaw/kittypau_2026_hivemq/kittypau_app/src/app/(public)/demo/page.tsx)
- [cat_awake_copy.svg](D:/Escritorio/Proyectos/KittyPaw/kittypau_2026_hivemq/kittypau_app/public/illustrations/cat_awake_copy.svg)

3. CSS global (incluye el skin Nebelung + ojos + sombras + respiracion + cuadro RPG)
- [globals.css](D:/Escritorio/Proyectos/KittyPaw/kittypau_2026_hivemq/kittypau_app/src/app/globals.css)

## Resumen mental del sistema (1 pagina)

El gato es un SVG inline insertado en el DOM (via `dangerouslySetInnerHTML`) dentro de un wrapper con clase `kp-trial-cat`.

El comportamiento se arma asi:
- Estado "dormido": parpados visibles (`#lefteyelid`, `#righteyelid`), `#eyesdown` oculto, y aparecen `Z` animadas.
- Estado "despierto": el wrapper agrega clase `.is-awake`. Esa clase:
  - oculta los parpados,
  - muestra `#eyesdown` (ojos abiertos),
  - habilita el movimiento sutil de pupila y brillo usando CSS vars `--cat-eye-x` / `--cat-eye-y`.
- El seguimiento del mouse se hace en TS, escuchando `pointermove` y calculando un offset clamped. Luego se inyecta como inline style:
  - `style={{ "--cat-eye-x": "...px", "--cat-eye-y": "...px" }}`
- "Respiracion" (mientras duerme): se anima el cuerpo (`svg`) + barriga (`#path5`) + cabeza (`#head`) + cola (`#tail` y `#longtail`) con keyframes de baja amplitud.

## Paleta/variables (CSS)

En [globals.css](D:/Escritorio/Proyectos/KittyPaw/kittypau_2026_hivemq/kittypau_app/src/app/globals.css) se definen variables en `:root`:

```css
:root {
  /* pelaje Nebelung */
  --fur-dark: #3F474F;
  --fur-shadow: #363E45;
  --fur-light: #465058;
  --fur-main: #5A646E;
  --fur-highlight: #8C97A3;

  /* ojos */
  --eye-gold: #C9A227;
  --eye-highlight: #E1C542;
  --pupil: #000000;
}
```

Notas:
- En el gato de login se usa principalmente `--fur-dark`, `--fur-shadow`, `--fur-light`.
- Para ojos despiertos se fuerza dorado + pupila negra + brillo blanco por selectores (ver seccion "Ojos").

## HTML/DOM: estructura exacta del gato (login)

El gato vive como un "bloque" dentro del panel de login. El wrapper principal:
- recibe refs para calcular su caja (`getBoundingClientRect()`),
- recibe `style` con `--cat-eye-x/y`,
- alterna clase `is-awake`.

Estructura (simplificada, pero real):

```tsx
<div
  className={`kp-trial-cat login-panel-cat mouse-detector ...${isTrialCatAwake ? " is-awake" : ""}`}
  ref={trialCatRef}
  onMouseEnter={wakeTrialCat}
  onMouseLeave={sleepTrialCat}
  style={{ "--cat-eye-x": "...px", "--cat-eye-y": "...px" } as CSSProperties}
>
  <div className="cat">
    <div className="sleep-symbol" aria-hidden="true">
      <span className="z z1">Z</span>
      <span className="z z2">z</span>
      <span className="z z3">Z</span>
    </div>
    <div
      className="thecat"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: trialCatSvg }}
    />
  </div>
</div>
```

Clases clave:
- `kp-trial-cat`: namespace global de estilos del gato.
- `login-panel-cat`: variante de posicion (absoluta sobre el card de login).
- `mouse-detector`: historicamente se uso para hover; hoy el "despertar" se hace con handlers TS y `.is-awake`.
- `cat`: contenedor para posicionar `sleep-symbol` y el SVG.
- `sleep-symbol`: Zzz animadas.
- `thecat`: wrapper del SVG.

## HTML/DOM: gato del cuadro RPG (login y demo)

En login, cuando se abre Demo App, existe un segundo gato dentro del dialogo RPG:
- usa la misma clase base `kp-trial-cat`,
- se monta como `trial-rpg-cat kp-trial-cat ...`,
- se controla con `isDialogCatAwake` + `dialogCatEyeOffset`.

En demo (`/demo`) el gato del dialogo:
- se monta como `trial-rpg-cat kp-trial-cat ...`,
- usa `isGuideCatAwake` + `guideCatEyeOffset`,
- y el SVG se carga desde archivo publico `/illustrations/cat_awake_copy.svg`.

## SVG: anatomia, IDs y grupos

### A) SVG inline de login (`trialCatSvg`)

En [login/page.tsx](D:/Escritorio/Proyectos/KittyPaw/kittypau_2026_hivemq/kittypau_app/src/app/(public)/login/page.tsx) existe un string `trialCatSvg` que ya incluye IDs "semanticos" agregados a mano.

Partes principales (IDs):
- Cabeza/cuerpo superior: `#head`
- Orejas: `#ear-left`, `#ear-right`
- Panza (pieza organica central): `#path5` (esta pieza es la que se anima para simular "respiracion" del abdomen)
- Patas:
  - `#paw-front-right`
  - `#paw-front-left`
  - `#paw-back`
- Cola:
  - `#tail` (cola corta / modo base)
  - `#longtail` (cola larga / usada como variante; en este proyecto se mantiene oculta para evitar recortes)

Ojos (capas logicas):
- Ojos cerrados: grupos `#lefteyelid`, `#righteyelid`
  - Dentro hay `ellipse` (parpado) + `path` (linea del ojo); el `path` trae `stroke:#ffffff` en el SVG original y se fuerza a negro via CSS.
- Ojos abiertos: grupo `#eyesdown`
  - `ellipse` 1 y 4: base/iris (se fuerza a dorado)
  - `ellipse` 2 y 5: pupilas (se fuerza a negro)
  - `ellipse` 3 y 6: brillos (se fuerza a blanco)

Bigotes (originales):
- Estan en grupos `<g>` sin id (en el SVG), con `path` con `stroke:#000000`. Se fuerzan a negro via selectores estructurales.

### B) SVG externo de demo (`cat_awake_copy.svg`)

En [cat_awake_copy.svg](D:/Escritorio/Proyectos/KittyPaw/kittypau_2026_hivemq/kittypau_app/public/illustrations/cat_awake_copy.svg) los IDs historicos son `path1`, `path2`, etc.

Implicancia:
- Los estilos que dependen de IDs semanticos (`#head`, `#paw-front-right`, etc.) NO aplican a este archivo.
- Aun asi, el skin funciona porque `globals.css` tiene reglas estructurales (por ejemplo: `.kp-trial-cat .thecat svg > g > path { fill: var(--fur-dark) }`).

Recomendacion si queremos consistencia total:
- Migrar `cat_awake_copy.svg` al mismo set de IDs semanticos que `trialCatSvg`, o
- dejarlo como "variante simple" y aceptar menos detalle de sombras por pieza.

## CSS: layout, layering y sombra

### Wrapper general
En `globals.css`:
- `.kp-trial-cat` define un `inline-flex` y posicion relativa para permitir overlays.
- `.kp-trial-cat .thecat` se posiciona `absolute` (login) para que el gato "se acueste" sobre el card.

Parametros relevantes (login):
- `.login-login-stack .login-panel-cat { position: absolute; right: -8px; top: -7px; }`
- `.kp-trial-cat .thecat { right: -6px; top: -48px; width: 78px; z-index: 80; }`

Sombra:
- `filter: drop-shadow(...)` aplicado al `svg` para dar volumen y el efecto de "encima del cuadro".

### Cuadro RPG (sombra del gato)

Para el dialogo RPG se agrega una sombra eliptica debajo del gato:

```css
.trial-rpg-cat::after {
  position: absolute;
  bottom: -2px;
  height: 12px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.55);
  filter: blur(4px);
}
```

Eso simula la sombra del cuerpo sobre el cuadro.

## CSS: estado dormido vs despierto

### Dormido (default)
- `#eyesdown` esta en `opacity: 0`
- `#lefteyelid` y `#righteyelid` visibles
- `sleep-symbol` visible

### Despierto (con `.is-awake`)
Reglas principales:
- `.kp-trial-cat.is-awake #lefteyelid` y `#righteyelid` -> `opacity: 0` con delays (efecto "un ojo y luego el otro")
- `.kp-trial-cat.is-awake #eyesdown` -> `opacity: 1`
- `.kp-trial-cat.is-awake .sleep-symbol` -> `visibility: hidden`

Efecto "un ojo primero":
```css
.kp-trial-cat.is-awake #lefteyelid { opacity: 0; transition-delay: 0ms; }
.kp-trial-cat.is-awake #righteyelid { opacity: 0; transition-delay: 220ms; }
.kp-trial-cat.is-awake #eyesdown { opacity: 1; transition-delay: 170ms; }
```

## CSS: ojos (colores y movimiento)

Objetivo actual:
- Iris 100% dorado (sin blanco)
- Pupila negra
- Brillo blanco

Implementacion:
- Se fuerza por `nth-of-type()` dentro de `#eyesdown` (para no depender de IDs en cada ellipse).

Colores:
```css
/* Iris */
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(1),
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(4) { fill: #C9A227 !important; }

/* Pupila */
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(2),
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(5) { fill: #000000 !important; }

/* Brillo */
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(3),
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(6) { fill: #ffffff !important; }
```

Movimiento:
```css
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(2),
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(3),
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(5),
.kp-trial-cat.is-awake .thecat #eyesdown ellipse:nth-of-type(6) {
  translate: var(--cat-eye-x, 0px) var(--cat-eye-y, 0px);
  transition: translate 120ms ease-out;
}
```

Notas:
- Solo pupila y brillo se mueven; el iris queda fijo para que no "se salga" del ojo.
- `translate` (no `transform`) simplifica el override por elemento y evita afectar respiracion del `svg` completo.

## CSS: bigotes y linea del ojo cerrado

Bigotes:
- Se fuerzan negros con selectores estructurales sobre los primeros `<g>` del SVG:
```css
.kp-trial-cat .thecat svg > g > g:nth-of-type(1) path,
.kp-trial-cat .thecat svg > g > g:nth-of-type(2) path {
  stroke: #000000 !important;
}
```

Linea del ojo cerrado:
- El SVG trae lineas con `stroke:#ffffff` (por herencia del arte original).
- Se reemplaza a negro:
```css
.kp-trial-cat .thecat svg > g > g:nth-of-type(3) path[style*="stroke:#ffffff"],
.kp-trial-cat .thecat svg > g > g:nth-of-type(4) path[style*="stroke:#ffffff"] {
  stroke: #000000 !important;
}
```

## CSS: respiracion (gato dormido)

Se anima a baja amplitud y periodo ~4.8s (respiracion de gato dormido):
- `svg` completo: `kp-cat-breath-body`
- barriga `#path5`: `kp-cat-breath-belly`
- cabeza `#head`: `kp-cat-breath-head`
- cola `#tail` y `#longtail`: `kp-cat-breath-tail`

Las animaciones se aplican SIEMPRE; el cambio a despierto visualmente se basa en ojos/zzz, no en detener respiracion.
Si se quiere "respira solo dormido", se puede condicionar con `.kp-trial-cat:not(.is-awake) ...`.

## TS/JS (React): estados y eventos

Nota: no hay "Java". La logica es TypeScript dentro de componentes React.

### 1) Estados del gato (login)
En [login/page.tsx](D:/Escritorio/Proyectos/KittyPaw/kittypau_2026_hivemq/kittypau_app/src/app/(public)/login/page.tsx):
- `isTrialCatAwake`: controla el gato del panel de login
- `catEyeOffset`: `{x,y}` para pupila/brillo
- `trialCatRef`: ref al wrapper para bounding box

Funciones:
- `wakeTrialCat()` -> `setIsTrialCatAwake(true)`
- `sleepTrialCat()` -> `setIsTrialCatAwake(false)` + reset offsets

### 2) Seguimiento del mouse (login)
La funcion core:
- `updateCatEyesFromPoint(clientX, clientY)`
  - obtiene `rect` del wrapper
  - calcula un centro "ajustado" (0.46 de ancho/alto)
  - calcula `dx/dy`
  - aplica clamp en rango seguro
  - asigna `catEyeOffset`

Rangos (login):
- `x: clamp(dx / 60, -0.95, 0.95)`
- `y: clamp(dy / 70 - 0.12, -0.75, 0.45)`

Fuentes de evento:
- `onMouseMove` sobre `.login-login-stack` (panel)
- `window.addEventListener("pointermove", ...)` mientras el gato esta despierto

### 3) Gato del cuadro RPG en login
Estados equivalentes:
- `isDialogCatAwake`
- `dialogCatEyeOffset`
- `trialDialogCatRef`

El tracking es el mismo patron: `pointermove` + clamp + setState.

### 4) Gato del cuadro RPG en `/demo`
En [demo/page.tsx](D:/Escritorio/Proyectos/KittyPaw/kittypau_2026_hivemq/kittypau_app/src/app/(public)/demo/page.tsx):
- `isGuideCatAwake`: el gato se mantiene despierto siguiendo el mouse, pero "duerme 1s" aleatoriamente
- Timers:
  - cada ~`5200..8800ms` se duerme (`setIsGuideCatAwake(false)`)
  - luego de `1000ms` vuelve a `true`
- Tracking:
  - solo si `isGuideVisible && isGuideCatAwake` se aplica el handler `pointermove`
  - clamp similar: `x: dx/58`, `y: dy/68 - 0.1`

## Audio del dialogo RPG (relacion con el gato)

El sonido no es del gato en si, sino del "typing" del cuadro RPG:
- Login: usa `trialDialogAudioRef` (se reproduce en loop mientras tipeo; se corta al terminar)
- Demo: usa `guideAudioRef` con `audio.volume = 0.4`

El mute vive en los botones del cuadro:
- `setIsTrialDialogMuted` (login)
- `setIsGuideMuted` (demo)

## Accesibilidad (a11y) y control por teclado

El cuadro RPG es un "button-like container":
- `role="button"`
- `tabIndex={0}`
- `onKeyDown`: avanza con `Enter` o `Space`

Los botones X y mute:
- usan `event.stopPropagation()` para evitar que el click avance el dialogo.

## Checklist rapido de debug (cuando "no funciona")

1. Ojos no se mueven:
- verificar que el wrapper tenga clase `.is-awake`
- verificar inline style `--cat-eye-x/y` aplicado al wrapper
- verificar que `pointermove` este activo (el estado awake debe ser true)

2. Ojos quedan blancos:
- revisar CSS de `.is-awake .thecat #eyesdown ...` (orden y especificidad)
- confirmar que `#eyesdown` existe en el SVG inyectado

3. El gato se recorta:
- revisar que contenedor tenga `overflow: visible`
- revisar `z-index` y `drop-shadow` del svg

4. Zzz en mala posicion:
- ajustar `.sleep-symbol` (top/right) en `globals.css`

## Cambios recomendados (si queremos modularizar)

Hoy el gato vive como:
- SVG string dentro de `login/page.tsx`
- CSS en `globals.css`

Si queremos ordenarlo, el siguiente refactor "limpio" seria:
1. mover el SVG a `kittypau_app/src/app/_assets/cat_sleeping.svg.ts` (export string)
2. crear componente `kittypau_app/src/app/_components/cat-sleepy.tsx`
3. dejar en `globals.css` solo variables/animaciones, y el resto en un css module del componente

