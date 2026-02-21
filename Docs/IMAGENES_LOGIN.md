# Especificaciones de Imagenes (Login Parallax)

## Tamano de las imagenes
Las imagenes generadas por el sistema de imagen (DALL-E / image_gen) usan formatos estandar:
- Resolucion: 1024 x 1024 px
- Relacion de aspecto: 1:1 (cuadrada)
- Formato: PNG
- Perfil de color: RGB (sRGB)
- Peso aproximado: 1-2 MB por imagen

Aunque visualmente algunas parecen "horizontales", internamente siguen siendo 1:1 con composicion centrada.

---

## Caracteristicas visuales aplicadas (comunes a todas)

### Iluminacion
- Luz suave y difusa (tipo estudio / ventana)
- Highlights controlados (sin brillos quemados)
- Sombras levantadas para no perder detalle en pelaje

### Color
- Warmth: +10 a +20 (ambiente acogedor)
- Saturacion: levemente reducida (~ -10)
- Colores naturales, no chillones
- El plato rosado se mantiene como punto de acento

### Contraste y textura
- Contraste bajo-medio (look editorial / lifestyle)
- Detalle alto en:
- Pelaje
- Bordes del plato
- Croquetas
- Grano muy sutil (look fotografico real)

---

## Tratamiento del animal
- Postura estable (sin motion blur)
- Pelaje mas definido y ordenado
- Volumen natural (no "plastico")
- Enfoque claro en la accion: comer

---

## Tratamiento del plato
- Plato centrado o semiprotagonista
- Bordes limpios y definidos
- Color rosado consistente
- Base visible (ideal para producto IoT / smart feeder)
- No deformaciones ni reflejos extranos

---

## Fondo (segun version)
- Fondo interior, no jardin:
  - Estudio / home office
  - Cocina moderna
  - Libreros desenfocados
- Profundidad de campo suave (bokeh)
- Fondo acompana, no compite con el producto

---

## Uso recomendado
Estas imagenes funcionan muy bien para:
- Landing page de producto
- Pitch deck / presentacion a inversionistas
- Instagram / redes
- Mockups de e-commerce
- Branding de KittyPaw / Equitipau

---

## Imagenes disponibles (Login Parallax)
Directorio local:
`D:\Escritorio\Proyectos\KittyPaw\kittypau_2026_hivemq\imagenes`

Archivos:
- `gato_1.png`
- `gato_2.png`
- `perro.png`
- `perro_2.png`
- `plato_cental.png`

## Assets vigentes en frontend (public/illustrations)
Directorio de runtime:
`kittypau_app/public/illustrations`

Assets versionados actuales:
- `pink_food_full.png` (plato comida por defecto)
- `pink_food_medium.png` (estado intermedio comida)
- `pink_empty.png` (estado vacio comida)
- `green_water_full.png` (plato agua por defecto)
- `pink_water_full.png` (variante agua)
- `pink_water_medium.png` (variante agua intermedia)

Notas:
- `food.png` y `water.png` quedaron deprecados y removidos del flujo actual.
- Login hero usa `pink_food_full.png`.

---

## Uso para parallax (orden de capas recomendado)
De fondo a frente:
1. `gato_1.png` (capa profunda, movimiento sutil)
2. `perro.png` (capa media)
3. `plato_cental.png` (capa protagonista, menor movimiento que animales)
4. `gato_2.png` (capa cercana)
5. `perro_2.png` (capa mas cercana, mayor parallax)

Notas:
- Mantener el plato como punto de anclaje visual.
- El movimiento debe ser suave y lento para look premium.
- Evitar solapamientos que tapen la lectura del login.

---

## Layout Login Parallax (capas + movimiento + velocidades)
Objetivo: fondo entretenido pero legible, con efecto premium tipo Apple/Helium.

### Capas y velocidades (sugerencia inicial)
Valores pensados para scroll suave o movimiento leve en mouse:
- `gato_1.png`: profundidad alta, velocidad 0.10x
- `perro.png`: profundidad media, velocidad 0.18x
- `plato_cental.png`: ancla visual, velocidad 0.14x
- `gato_2.png`: primer plano, velocidad 0.25x
- `perro_2.png`: primer plano, velocidad 0.30x

### Posicionamiento sugerido (desktop)
- `gato_1.png`: izquierda superior, 10-15% fuera del viewport para dar aire.
- `perro.png`: derecha media, 5-10% fuera del viewport.
- `plato_cental.png`: centro-bajo, visible completo.
- `gato_2.png`: izquierda baja, recorte parcial para profundidad.
- `perro_2.png`: derecha baja, recorte parcial.

### Posicionamiento sugerido (mobile)
- Reducir a 3 capas: `gato_1.png`, `plato_cental.png`, `perro_2.png`.
- Velocidades mas bajas (0.08x, 0.12x, 0.18x).
- Evitar recortes grandes para no tapar el formulario.

### Reglas de legibilidad
- El formulario siempre sobre un fondo limpio (overlay o blur suave).
- Contraste minimo AA para textos.
- Limitar movimiento a +/- 16px si es parallax por mouse.

### Recomendacion tecnica
- Implementar con `transform: translate3d()` para rendimiento.
- Evitar reflow: usar `will-change: transform`.

---

## Overlay del formulario (blur, opacidad, borde, sombras)
Objetivo: mantener legibilidad sin apagar el parallax.

### Estilo base (desktop)
- Fondo: `rgba(255,255,255,0.72)`
- Blur: `backdrop-filter: blur(12px)`
- Borde: `1px solid rgba(255,255,255,0.55)`
- Sombra: `0 20px 60px rgba(15, 23, 42, 0.18)`
- Radio: `24px` (coherente con tokens)
- Padding interno: `32px 36px`

### Estilo base (mobile)
- Fondo: `rgba(255,255,255,0.85)`
- Blur: `backdrop-filter: blur(8px)`
- Borde: `1px solid rgba(255,255,255,0.6)`
- Sombra: `0 16px 40px rgba(15, 23, 42, 0.16)`
- Padding interno: `24px`

### Reglas de legibilidad
- Texto siempre sobre fondo claro.
- Botones con contraste alto.
- Evitar overlays muy opacos para no matar el parallax.

---

## Grid del login (posicion del formulario vs parallax)
Objetivo: composicion balanceada entre contenido y fondo.

### Desktop (>= 1024px)
- Layout 12 columnas.
- Formulario ocupa 4-5 columnas, alineado a la derecha.
- Fondo parallax ocupa el resto (7-8 columnas).
- Ancho maximo del card: `420px`.
- Margen lateral minimo: `64px`.

### Tablet (>= 768px y < 1024px)
- Layout 8 columnas.
- Formulario centrado, ocupa 5-6 columnas.
- Parallax reducido a 3 capas.
- Ancho maximo del card: `420px`.

### Mobile (< 768px)
- Una columna.
- Formulario centrado, ancho 100% con padding.
- Parallax reducido a 3 capas y menor movimiento.
- Ancho maximo del card: `360px`.

### Reglas de posicion
- El formulario nunca debe superponerse al plato.
- Evitar que capas cercanas tapen el input principal.

---

## Layout exacto del formulario (titulo, subtitulo, campos, CTA, links)
Objetivo: onboarding claro, rapido y confiable.

### Estructura (orden)
1. Logo pequeño + nombre: `KittyPau`
2. Titulo: `Bienvenido a KittyPau`
3. Subtitulo: `Monitorea la alimentacion y salud de tu mascota`
4. Campo email (placeholder: `tu@correo.com`)
5. Campo password (placeholder: `••••••••`)
6. Link secundario: `Olvidaste tu contraseña?`
7. Boton principal: `Iniciar sesion`
8. Separador: `o`
9. Boton alterno (si aplica): `Continuar con Google`
10. Link secundario inferior: `No tienes cuenta? Crear cuenta`

### Jerarquia visual
- Titulo: `text-2xl` / `font-semibold`
- Subtitulo: `text-sm` / `text-muted-foreground`
- Inputs: altura `h-11` (tactiles)
- CTA: altura `h-12` con `font-medium`

### Microcopy recomendado
- Error email: `Ingresa un correo valido`
- Error password: `Minimo 8 caracteres`
- Estado loading: `Entrando...`

### Accesibilidad
- Labels visibles o `aria-label` consistente.
- Contraste AA minimo.
