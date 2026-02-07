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

---

# Politica de Stack (2024-2026)

## Objetivo
Evitar librerias antiguas. Solo se aceptan tecnologias con uso real y activo en 2024-2026.

## Regla de aceptacion
- La libreria debe mostrar adopcion fuerte en 2024-2026.
- Debe tener actividad reciente (release en los ultimos 12-18 meses).
- Debe ser compatible con Next.js App Router.

## Permitidas (core UI)
- Tailwind CSS
- shadcn/ui
- Radix UI
- Headless UI
- MUI (solo si se requiere algo enterprise)

## Permitidas (motion / scroll)
- Framer Motion
- GSAP + ScrollTrigger
- Lenis

## Permitidas (marketing blocks)
- Magic UI
- Aceternity UI
- Motion Primitives

## Bloqueadas (legacy / look antiguo)
- Bootstrap
- Semantic UI / Fomantic
- React Bootstrap
- AdminLTE

## Nota de uso real (2024)
Segun State of React 2024, MUI sigue liderando en uso y shadcn/ui muestra el mayor crecimiento.

---

# Core Design System (Base obligatorio)

## 0) Design Tokens (identidad del producto)
No empezamos con CSS suelto. Empezamos con tokens.

Ruta sugerida:
`/styles/tokens.css`

Paleta operativa: esta es la fuente de verdad para UI del producto.
La paleta anterior queda como referencia de marca y narrativa.

```css
:root {
  /* Brand */
  --primary: 222 84% 56%;
  --primary-foreground: 210 40% 98%;

  /* Superficie */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;

  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;

  /* Estados */
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;

  --border: 214 32% 91%;
  --ring: 222 84% 56%;

  /* Feedback IoT */
  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --danger: 0 72% 51%;

  /* Radio moderno */
  --radius: 1.2rem;
}
```

---

## 1) Inputs & Actions
Todo lo que el usuario puede presionar o completar
- Button (primary / secondary / ghost / link)
- IconButton
- Input
- Textarea
- Select
- Switch / Toggle
- Checkbox
- RadioGroup
- Slider
- FormField (wrapper con label + error)
- Command palette (CMD+K)

Regla startup:
Los botones deben verse grandes, respirables y tactiles.

Boton base recomendado:
`components/ui/button.tsx`

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--radius)] text-sm font-medium transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow hover:opacity-90",
        secondary: "bg-muted text-foreground hover:bg-muted/80",
        ghost: "hover:bg-muted",
        outline: "border border-border hover:bg-muted",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-5",
        lg: "h-14 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

---

## 2) Feedback
Comunicacion con el usuario
- Alert
- Toast
- Badge
- Tooltip
- Popover
- Dialog / Modal
- Loading spinner
- Skeleton loader
- Progress bar

En SaaS hardware esto es critico: estado del dispositivo.

---

## 3) Layout
La estructura visual (estos no vienen listos, se crean)
- Container
- Section
- Grid
- Stack (vertical spacing)
- Divider
- Spacer

---

## 4) Surface Components
Donde vive la informacion
- Card
- Feature Card
- Stat Card
- Device Card
- Bento Grid
- Table
- Accordion

El 70% de la UI moderna son variaciones de Card.

Card base recomendado:
`components/ui/card.tsx`

```tsx
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[calc(var(--radius)+4px)] border border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow",
        className
      )}
      {...props}
    />
  );
}
```

---

## 5) Navigation
Movimiento dentro de la app
- Navbar
- Sidebar
- Tabs
- Breadcrumbs
- Pagination
- Stepper (onboarding)

---

## 6) Data Visualization (IoT)
- Metric widget
- Chart container
- Empty state
- Device status indicator

---

## Variantes por componente
Ejemplo:
- Card
- FeatureCard (landing)
- DeviceCard (dashboard)
- StatCard (metrics)
- PricingCard (marketing)

Apple / Stripe / Helium hacen esto.

---

## Estructura recomendada en Next.js
components/
  ui/              <- shadcn base
  layout/
  marketing/
  dashboard/
  device/
  charts/
  feedback/

---

## Regla importante
No construyas paginas primero.
Primero construyes:
1 boton + 1 card + 1 input perfectos.
Despues todo el sitio se arma solo.

Input base recomendado:
`components/ui/input.tsx`

```tsx
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-[var(--radius)] border border-border bg-background px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
```

## Estilos de Diseño Web Mejor Evaluados (2025-2026)
1) Soft Minimalism (estandar SaaS)
- Fondos off-white / gris calido.
- Sombras muy suaves.
- Tipografia base 14-18.
- Bordes 10-18px.
- Separaciones amplias.
- Iconos finos.
- Nada grita visualmente.

2) Layered Depth (glassmorphism usable)
- Capas translucidas para jerarquia.
- Tarjetas flotantes.
- Blur suave.
- Overlays claros.
- Contraste controlado.

3) Editorial Layout (estilo revista digital)
- Titulos grandes.
- Bloques verticales.
- Fotos protagonistas.
- UI minima.

---

## Estilos Mobile Mejor Evaluados (2025-2026)
1) Single-Column Flow Apps
- Feed vertical inteligente.
- Acciones inline.
- Sin dashboards densos.

2) Card-Driven UI
- Cada accion es una tarjeta.
- Modulos reutilizables.

3) Thumb-Zone First Layout
- Acciones principales abajo.
- Nada critico arriba.

---

## Lo que evitar (mal feedback)
- Sidebars complejas.
- Dashboards con muchos widgets.
- Menus hamburguesa profundos.
- Colores saturados.
- Tipografia pequena.
- Demasiados iconos.
- Pantallas con muchas decisiones.

---

## Resumen claro
- Web: Soft minimal + tipografia editorial + capas suaves.
- Mobile: Feed vertical + tarjetas + pulgar primero.


## Cambio Grande del Mundo UI (2026)
Antes: se instalaba una libreria completa (Bootstrap/MUI) y se vivia dentro de ella.
Ahora: se construye un design system con piezas headless + copy-paste.
Stack actual: Primitivas accesibles (Radix/Aria) + estilos (Tailwind) + componentes copiados (shadcn/custom).

---

## Librerias con Mejor Diseño (Next.js 2025-2026)
**Tier S (premium)**
- shadcn/ui: estandar actual (Tailwind + Radix).
- Radix UI: primitivas accesibles sin estilos.
- React Aria / Headless UI: interacciones complejas y mobile feel.

**Tier A (bonitas pero mas "libreria")**
- HeroUI (NextUI v2).
- Mantine.
- Chakra UI.

**Tier B (paradigma antiguo)**
- Material UI (MUI).
- Ant Design.

---

## Componentes Visuales para Landing Premium
- Magic UI (hero sections premium).
- Aceternity UI (efectos modernos).
- Tremor (dashboards analiticos).
- Modern UI (alternativa shadcn).

---

## Decision por posicionamiento
- SaaS corporativo: Mantine/Chakra/MUI.
- Startup moderna: shadcn + Radix + Tailwind.
- Producto premium tipo Apple: shadcn + Radix + custom + animaciones suaves.

---

## Recomendacion KittyPau
- Usar: shadcn/ui + Radix + Tailwind + componentes custom.
- Evitar: Material UI, Ant Design.

## Set de Componentes KittyPau (Web + Mobile, 2026)

### Stack base (cerrado)
- Next.js (App Router)
- Tailwind CSS
- shadcn/ui
- Radix UI
- lucide-react (iconos)
- framer-motion (animaciones)

### Componentes core (100% necesarios)
1) Layout & Shell
- AppLayout
- Header flotante (glass suave)
- Contenido centrado (max-width)
- Mobile-first
- shadcn/Radix: Sheet (menu mobile), DropdownMenu (user menu), Separator

2) Navigation (minima)
- TopNav (desktop): Logo, estado general, avatar usuario
- BottomBar (mobile): Home, Mascotas, Dispositivo, Perfil
- Componentes: NavigationMenu, Button (icon), Avatar

3) Cards (corazon del diseño)
- PetCard: foto real edge-to-edge, nombre + estado, CTA sutil
- DeviceStatusCard: nivel agua/comida, ultima actividad, estado visual (ok/alerta)
- InsightCard (feed principal): mensaje humano + accion rapida
- Componentes: Card, AspectRatio, Badge, Progress, Tooltip, Alert, Button

4) Feed principal (mobile-first)
- DailyFeed: scroll vertical unico (sin dashboards)
- Componentes: Card, Separator, Skeleton

5) Estados & Feedback
- Alertas suaves (no rojas agresivas)
- Empty states premium (imagen lifestyle + texto corto + CTA unico)
- Componentes: Alert, Badge, Toast, Button, Card

6) Formularios (minimos y humanos)
- PetForm: nombre, tipo, foto
- DeviceLinkForm: codigo corto + confirmacion visual
- Componentes: Input, Select, RadioGroup, Form, Button, Dialog

7) Autenticacion (limpia y premium)
- Login/Register: card centrada, fondo lifestyle
- Componentes: Card, Input, Button, Separator

8) Profile & Settings (light)
- ProfileCard: avatar, email, logout
- Componentes: Avatar, DropdownMenu, Button

9) Charts (solo cuando aportan valor)
- Evitar dashboards complejos
- Si se usan: consumo agua 7 dias (1 grafico)
- Stack: Tremor + shadcn (AreaChart / LineChart)

### Motion & Micro-interactions
- Animaciones suaves
- Hover cards
- Transitions
- Feed loading
- framer-motion: motion.div + layout animations

### Componentes que NO usamos
- Tables
- Sidebars grandes
- Modals pesados
- Tabs infinitos
- Mega-dashboards

### Mapa final de componentes
- Layout: Card, Sheet, Separator
- Navegacion: NavigationMenu, Button
- Contenido: Card, Badge, Alert
- Inputs: Input, Select, Radio
- Feedback: Toast, Tooltip
- Visual: Progress, Skeleton
- Motion: framer-motion

### Resultado visual esperado
- Estilo Apple / Vercel
- Sensacion de calma
- Foco en mascotas, no sensores
- UX clara en 3 segundos

---

# Tokens y Componentes Base (MVP UI)

## Tokens oficiales (aplicacion)
Estos tokens son la fuente de verdad para todas las vistas (login, registro, onboarding).

Color (HSL)
```
:root {
  --background: 30 38% 97%;
  --foreground: 20 12% 18%;
  --card: 0 0% 100%;
  --card-foreground: 20 12% 18%;
  --primary: 348 45% 33%;
  --primary-foreground: 0 0% 100%;
  --muted: 24 20% 92%;
  --muted-foreground: 20 9% 40%;
  --border: 24 18% 85%;
  --ring: 348 45% 33%;
  --success: 145 22% 46%;
  --warning: 38 40% 48%;
  --danger: 350 45% 42%;
  --radius: 18px;
}
```

Tipografia
- Titulo: Manrope 600-700
- Texto: Inter 400-500
- Base: 15-16px
- Labels: 12-13px
- H1: 36-40px, H2: 26-30px

Espaciado
- Base 4px
- Secciones: 24-32px
- Cards: 16-20px padding

---

## Componentes base (obligatorios)
1. Button
   - Variantes: primary / secondary / ghost / outline
2. Input
   - Altura 44px, foco suave
3. Card
   - Borde suave + sombra ligera
4. Badge
   - Estado: ok / warning / info
5. Alert
   - Mensajes de sistema
6. Skeleton
   - Loading de feed

---

## Vistas que deben usar estos tokens
- /login: login email/password
- /register: registro usuario
- /onboarding/user: datos de usuario
- /onboarding/pet: datos de mascota
- /onboarding/device: vincular dispositivo

---

## Regla de consistencia
Si un componente no existe en esta lista, primero se agrega aqui y luego se implementa en UI.
