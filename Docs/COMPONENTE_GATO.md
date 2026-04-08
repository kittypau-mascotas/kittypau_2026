# Componente "Gato" (Kittypau) - Detalle Extremo

Este documento describe el gato estilo cartoon usado en el login (y su variante del cuadro de dialogo tipo RPG) con detalle de:
- estructura HTML/DOM,
- CSS (variables, selectores, estados, animaciones),
- logica JS/TS (interacciones, seguimiento del mouse, timers),
- SVG (partes, IDs, grupos, colores y como se "re-skinea").

## Archivos fuente (canon)

1. Login (gato del panel + gato del cuadro de dialogo de Demo App)
- [page.tsx](D:/Escritorio/Proyectos/Kittypau/kittypau_2026_hivemq/kittypau_app/src/app/(public)/login/page.tsx)

2. Demo (cuadro RPG dentro de `/demo` con "gato despierto" cargado desde SVG externo)
- [page.tsx](D:/Escritorio/Proyectos/Kittypau/kittypau_2026_hivemq/kittypau_app/src/app/(public)/demo/page.tsx)
- [cat_awake_copy.svg](D:/Escritorio/Proyectos/Kittypau/kittypau_2026_hivemq/kittypau_app/public/illustrations/cat_awake_copy.svg)

3. CSS global (incluye el skin Nebelung + ojos + sombras + respiracion + cuadro RPG)
- [globals.css](D:/Escritorio/Proyectos/Kittypau/kittypau_2026_hivemq/kittypau_app/src/app/globals.css)

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

## Dimensiones y medidas (pixeles, offsets y cajas)

Esta seccion documenta las medidas "reales" que usamos hoy en CSS/TS. Hay 3 niveles:
- Geometria del SVG (coordenadas internas por `viewBox`)
- TamaÃ±os renderizados del wrapper (pixeles en el layout)
- Offsets animados (respiracion, ojos) y sus rangos

### 1) Geometria del SVG (interno)

El gato usa el mismo `viewBox` tanto inline (login) como en el SVG externo:

```svg
viewBox="0 0 45.952225 35.678726"
```

Relaciones:
- Ancho interno: `45.952225`
- Alto interno: `35.678726`
- Aspect ratio: `alto/ancho = 0.7764308692`

Traduccion aproximada a pixeles (segun ancho CSS del wrapper):
- Si `width: 78px` => alto aproximado `78px * 0.7764 = 60.56px`
- Si `width: 74px` => alto aproximado `57.46px`
- Si `width: 72px` => alto aproximado `55.90px`

Nota:
- El SVG declara dimensiones en `mm` (`width="45.952225mm"`), pero en el DOM lo mandamos a `width: 100%` y el tamaÃ±o final lo domina el contenedor en px.

### 2) Medidas del gato en Login (sobre el card de iniciar sesion)

Fuente: `globals.css` (bloque `.kp-trial-cat` + `.login-panel-cat`).

Wrapper de posicion (sobre el card):
- Selector: `.login-login-stack .login-panel-cat`
  - `position: absolute`
  - `right: -8px`
  - `top: -7px`
  - `z-index: 70`

SVG wrapper (caja del gato):
- Selector: `.kp-trial-cat .thecat`
  - `position: absolute`
  - `width: 78px` (alto auto)
  - `right: -6px`
  - `top: -48px`
  - `z-index: 80`
  - `overflow: visible`

Zzz (sleep-symbol):
- Selector: `.kp-trial-cat .sleep-symbol`
  - `right: 34px`
  - `top: -76px`
  - `width: 56px`
  - `height: 48px`
  - `z-index: 120`

Sombra/volumen del gato (login):
- Selector: `.kp-trial-cat .thecat svg`
  - `filter: drop-shadow(0 2px 3px rgba(15, 23, 42, 0.58)) drop-shadow(0 10px 16px rgba(15, 23, 42, 0.18))`

### 3) Medidas del gato en el cuadro RPG (dialogo, login y demo)

Fuente: `globals.css` (bloque `.trial-rpg-*`).

Caja del gato dentro del dialogo:
- Selector: `.trial-rpg-cat`
  - `flex: 0 0 74px` (base width)
  - `margin-top: 14px` (baja el gato para tocar su sombra)
  - `margin-right: -2px` (pequeÃ±o solape hacia el borde)
  - `position: relative`

SVG wrapper (RPG):
- Selector: `.trial-rpg-cat.kp-trial-cat .thecat`
  - `position: relative`
  - `width: 74px`
  - `top: 8px`
  - `filter: drop-shadow(0 6px 8px rgba(15, 23, 42, 0.16))`

Zzz (RPG):
- Selector: `.trial-rpg-cat.kp-trial-cat .sleep-symbol`
  - `right: 26px`
  - `top: -18px`
  - `width: 52px`
  - `height: 40px`

Sombra "en el piso" del dialogo (debajo del gato):
- Selector: `.trial-rpg-cat::after`
  - `left: 16px`
  - `right: 10px`
  - `bottom: -2px`
  - `height: 12px`
  - `border-radius: 999px`
  - `background: rgba(15, 23, 42, 0.55)`
  - `filter: blur(4px)`

### 4) Responsive (mobile)

En `@media (max-width: 640px)` hay ajustes duplicados (historico); el resultado efectivo queda cerca de:
- `.trial-rpg-line font-size: 13px`
- `.trial-rpg-cat flex-basis: 72px`
- `.trial-rpg-cat.kp-trial-cat .thecat width: 72px`

### 5) Rangos de movimiento (ojos)

Los ojos NO se mueven con CSS puro. Se mueven con CSS vars que seteamos desde TS:
- `--cat-eye-x`
- `--cat-eye-y`

En CSS, esas variables aplican solo a pupila + brillo:
- `#eyesdown ellipse:nth-of-type(2,3,5,6) { translate: var(--cat-eye-x) var(--cat-eye-y) }`

Rangos actuales (login panel):
- `x = clamp(dx/60, -0.95, 0.95)` => rango final: `[-0.95px, 0.95px]`
- `y = clamp(dy/70 - 0.12, -0.75, 0.45)` => rango final: `[-0.75px, 0.45px]`

Rangos actuales (demo dialog):
- `x = clamp(dx/58, -0.95, 0.95)` => `[-0.95px, 0.95px]`
- `y = clamp(dy/68 - 0.1, -0.74, 0.44)` => `[-0.74px, 0.44px]`

Nota importante:
- Los valores son intencionalmente pequenos (< 1px) para que el movimiento sea "sutil".
- Si quieres que el movimiento se note mas SIN romper el ojo, el camino seguro es multiplicar por ~1.4 en CSS:
  - `translate: calc(var(--cat-eye-x) * 1.4) calc(var(--cat-eye-y) * 1.4);`

### 6) Rangos de movimiento (respiracion)

La respiracion se hace en CSS y afecta 4 piezas:
- `svg` completo (cuerpo)
- `#path5` (panza)
- `#head` (cabeza)
- `#tail`/`#longtail` (cola)

Las amplitudes son de 1 a 3px max (segun keyframes):
- cuerpo: sube ~2.2px y escala ~1.01 (pico)
- panza: escala/translate local (muy leve)
- cabeza: micro oscilacion (para "vida")
- cola: micro rotacion / translate

### 7) Como medir en runtime (DevTools / consola)

1. Medir la caja del wrapper:
```js
document.querySelector(".kp-trial-cat .thecat")?.getBoundingClientRect()
```

2. Medir caja del SVG (render):
```js
document.querySelector(".kp-trial-cat .thecat svg")?.getBoundingClientRect()
```

3. Medir geometria interna (SVG):
```js
const svg = document.querySelector(".kp-trial-cat .thecat svg");
svg?.viewBox?.baseVal; // {x,y,width,height}
svg?.getBBox();        // bounding box del contenido
```

## Paleta/variables (CSS)

En [globals.css](D:/Escritorio/Proyectos/Kittypau/kittypau_2026_hivemq/kittypau_app/src/app/globals.css) se definen variables en `:root`:

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

En [login/page.tsx](D:/Escritorio/Proyectos/Kittypau/kittypau_2026_hivemq/kittypau_app/src/app/(public)/login/page.tsx) existe un string `trialCatSvg` que ya incluye IDs "semanticos" agregados a mano.

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

En [cat_awake_copy.svg](D:/Escritorio/Proyectos/Kittypau/kittypau_2026_hivemq/kittypau_app/public/illustrations/cat_awake_copy.svg) los IDs historicos son `path1`, `path2`, etc.

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
En [login/page.tsx](D:/Escritorio/Proyectos/Kittypau/kittypau_2026_hivemq/kittypau_app/src/app/(public)/login/page.tsx):
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
En [demo/page.tsx](D:/Escritorio/Proyectos/Kittypau/kittypau_2026_hivemq/kittypau_app/src/app/(public)/demo/page.tsx):
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

## Contrato del cuadro RPG

El dialogo RPG debe editarse siempre con la misma estructura para no romper la experiencia visual:
- un solo componente compartido: `TrialRpgDialog`
- una sola geometria base para login, demo e inicio
- altura y ancho fijos en CSS
- el texto nunca debe modificar el alto del cuadro
- el espacio de acciones debe reservarse aunque no haya botones visibles
- no agregar barras, cursores o animaciones que alteren el tamano del cuadro

Reglas de edicion:
1. Si el texto cambia, solo cambia el contenido, no el contenedor.
2. Si una pagina necesita texto distinto, debe pasarlo al mismo componente.
3. Si un caso necesita acciones distintas, debe usar el slot `actions`.
4. Si el cuadro no aparece en `/demo`, revisar primero el estado de apertura en la pagina, no crear otro componente paralelo.

Checklist rapido antes de tocar el cuadro:
- `TrialRpgDialog` sigue siendo la unica fuente visual del dialogo
- `.trial-rpg-modal` mantiene dimensiones fijas
- `.trial-rpg-line` no empuja el layout
- `.trial-rpg-actions` reserva espacio estable
- `login`, `demo` e `inicio` usan la misma pieza

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

## Estado del demo

- `/demo` debe abrir el mismo `TrialRpgDialog` aunque el usuario entre directo a la ruta.
- Si no existe una sesion demo previa, la pagina debe autosembrar valores por defecto y mostrar el cuadro.
- `kittypau_demo_show_rpg` ya no es la unica llave de apertura; sirve como marcador historico, pero el dialogo debe aparecer igual.
- Si el cuadro no aparece, el primer paso de debug es revisar `isGuideVisible` y el montaje del componente, no crear otra variante.


