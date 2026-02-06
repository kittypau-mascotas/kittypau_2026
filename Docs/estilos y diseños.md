# Estilos y Disenos (Kittypau)

## Principio base
Kittypau no debe verse como un dashboard tecnico. Debe contar una historia.

Tres reglas de las webs premiadas de data:
1. Narran, no informan: el usuario descubre.
2. La pagina reacciona al scroll (scrollytelling).
3. Los datos se vuelven objetos vivos, no graficos.

---

## Tipos de experiencia a replicar
### 1) Data como mundo interactivo
- La actividad diaria se ve como un mapa vivo.
- Movimiento = ruta viva.
- Inactividad = zonas de descanso.
- Temperatura = aura.

### 2) Scrollytelling narrativo
- El dia se cuenta como historia:
- 06:10 despierto
- 07:20 comio
- 14:30 siesta
- 03:12 actividad nocturna

### 3) Data emocional (clave)
- No buscamos metricas veterinarias.
- Buscamos: "como fue su dia".

---

## Estructura visual ideal de Kittypau
### HOME (no dashboard)
Hero:
"Mientras trabajabas... esto paso en su mundo"
Fondo vivo con particulas segun actividad.

### Pagina DIA
No graficos.
En lugar de %:
- "madrugada tranquila"
- "explorador diurno"
- "cazador nocturno"

### Pagina HISTORIA
Timeline vertical narrativa:
- "El dia que mas te espero"
- "El dia que estuvo inquieto"
- "El dia que durmio contigo"

### ALERTAS
No tecnicas.
- Mal: "actividad irregular"
- Bien: "Hoy estuvo extrano..."

---

## Traduccion IoT -> UX (correcta)
| Dato sensor | UI tipica | UI Kittypau |
|---|---|---|
| movimiento | grafico | recorrido |
| temperatura | numero | confort |
| acelerometro | intensidad | animo |
| reposo | % | sueno |
| patrones | histograma | personalidad |

---

## Concepto visual central
Kittypau no es:
- app de monitoreo
- salud
- GPS

Kittypau es:
- un diario automatico escrito por el gato

---

## Estilo visual recomendado
Calmo + nocturno + organico + calido

No:
- veterinario
- smartwatch
- dashboard SaaS

Si:
- atmosferico
- silencioso
- intimo

---

## Decision de direccion creativa
Elegir una:
1. Landing emocional tipo producto Apple
2. Experiencia interactiva (wow, scrollytelling)

---

## Paleta base (Kittypau)
Ivory (fondo principal)
- `#F6F1E9`
- Alternativa: `#FBF8F3`

Rosewater (fondos suaves, cards, hover)
- `#F2D7D9`

Dusty Rose (secundario, botones suaves)
- `#C8A2A6`

Marsala (acento fuerte, CTA, titulos)
- `#7A2E3A`
- Alternativa: `#6B2632`

Texto principal
- Charcoal soft: `#2E2A28`

---

## Colores funcionales (avisos / estados)
Warning
- Muted Gold: `#C2A45D`

Error / Alarma
- Deep Marsala Red: `#8C2F39`
- Fondo recomendado: `#F4E1E3`

Success / OK
- Sage Soft: `#7F9C8A`
- Fondo recomendado: `#EAF2ED`

Info / Notificacion
- Dusty Blue-Grey: `#6F8597`
- Fondo recomendado: `#EDF1F5`

---

## Reglas clave de uso
- Nunca usar rojo, verde o azul puro.
- Todo debe verse ligeramente apagado.
- Texto oscuro siempre mejor que blanco puro.

---

## Ejemplo rapido de uso
- Fondo web: Ivory
- Cards: Rosewater
- Boton principal: Marsala
- Warning: Muted Gold
- Error: Deep Marsala
- Success: Sage
- Info: Dusty Blue-Grey

---

# Especificaciones - Tablero de Gestion

## Marca
- Marca: KittyPau
- Estilo: tecnico-amigable, neutro, confiable (no femenino, no relajado)

---

## Paleta final (tablero)
Colores base
- Ivory (fondo principal): `#F6F1E9`
- Ivory claro (cards/paneles): `#FBF8F3`
- Texto principal (charcoal): `#2E2A28`
- Texto secundario: `#5E5653`

Colores de marca
- Marca / Logo / H1 suave: `#EBB7AA`
- Dusty Rose (secundario): `#C8A2A6`
- Marsala (acento fuerte/CTA): `#7A2E3A`
- Marsala profundo (alertas): `#8C2F39`

Estados / Notificaciones
| Estado | Texto | Fondo |
|---|---|---|
| Exito | `#4E6B5B` | `#E6EFE9` |
| Aviso | `#8A6A2F` | `#F3E6C9` |
| Error | `#FFFFFF` | `#B24A42` |
| Info | `#4C5F6E` | `#EDF1F5` |

---

## Tipografia
Titulos / Marca
- Fuente: Titan One
- Uso: Logo, H1, CTA clave
- Peso: Bold
- Tamano:
- H1: 36-40px
- H2: 26-30px
- Color: `#EBB7AA` o `#7A2E3A`

Texto funcional
- Fuente: Inter / Poppins / Nunito
- Peso: Regular / Medium
- Tamano:
- Texto base: 15-16px
- Labels: 13-14px
- Color: `#2E2A28`

---

## Estructura del tablero
Header superior
- Altura: 72px
- Fondo: `#FBF8F3`
- Logo izquierda
- Navegacion centrada
- Usuario derecha (avatar circular 32px)

Sidebar (izquierda)
- Ancho: 240px
- Fondo: `#F1E6DE`
- Iconos monocromos
- Item activo:
- Fondo: `#EBD6CE`
- Texto: `#7A2E3A`

Hero / Bienvenida
- Fondo: degradado suave Ivory -> Rosewater
- H1 en Marsala suave
- CTA principal:
- Fondo: `#7A2E3A`
- Texto: `#FFFFFF`
- Border-radius: 10px

Cards de Resumen
- Altura: 90-110px
- Fondo: `#FBF8F3`
- Sombra: `0 8px 24px rgba(0,0,0,0.08)`
- Iconos lineales
- Numeros en Marsala / Dusty Rose

---

## Notificaciones
- Border-radius: 10px
- Padding: 16px
- Icono a la izquierda (20px)
- Texto Medium
- No animaciones agresivas
- Error siempre en bloque solido (no outline)

---

## Quick Actions
- Botones rectangulares suaves
- Fondo: `#EFE6DF`
- Hover: `#E6D1C7`
- Icono + texto alineado izquierda

---

## Reglas clave de diseno
- Nada de colores puros (rojo/verde/azul)
- Nada pastel infantil
- Todo ligeramente apagado
- Mas espacio que decoracion
- Contraste > saturacion

---

# Stack de UI y Motion (landing Apple-like)

## Filosofia
Landing moderna tipo startup hardware / Apple-like / storytelling.
No dashboard corporativo, no Material UI.

Principio:
- UI minimalista + motion fuerte + componentes simples + scroll animado
- Sin librerias pesadas

---

## Stack recomendada (Next.js)
UI base
- shadcn/ui
- tailwindcss

Estetica startup
- magicui
- aceternity-ui

Animaciones
- framer-motion
- gsap
- @studio-freight/lenis

Opcional premium
- react-three-fiber

---

## Regla de oro
- Libreria UI = estructura
- Motion = experiencia
- Scroll = storytelling
- Visual FX = percepcion de calidad
