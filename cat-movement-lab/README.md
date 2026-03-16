# Cat Movement Lab (Standalone)

Laboratorio independiente (fuera de Kittypau) para:

- Renderizar el gato en un `localhost` separado.
- Crear/ajustar movimientos con CSS variables.
- Editar posiciones de partes por eje `X/Y`, rotación y escala.
- Cambiar colores (fill/stroke).
- Seleccionar partes clickeando en el SVG y moverlas arrastrando.
- Duplicar partes (ej: crear una nueva pata).
- Exportar el estado (JSON) y generar CSS para portarlo luego a Kittypau.

## Requisitos

- Node.js 18+.

## Correr el lab (localhost)

```powershell
cd cat-movement-lab
node server.js
```

Abre:

- `http://localhost:8844`

## Controles

- Selector de parte: elige una pieza por `id` o haz click directo en el SVG.
- Sliders: `X`, `Y`, `Rotate`, `ScaleX`, `ScaleY`, `Opacity`.
- Colores: `fill` y `stroke` (si aplica).
- Drag: activa `Drag` y arrastra la pieza seleccionada (o haz click para seleccionar y luego arrastra).
- Poses: `Sleep`, `Walking`, `Standing`, `Angry`, `Cleaning`, `Pouncing`.
- Auto: ciclo que muestra todas las poses en orden, con sleep de 0.5s entre poses.
- Velocidades: respiración y multiplicador de pose.
- Movements: botones por movimiento (cada uno tiene su propia timeline de frames). Usa `Record Frame` para ir grabando.

## Sync con el gato copia del login

El lab puede leer/guardar en el archivo real que usa el gato copia del login:

- `kittypau_app/src/app/_data/cat-copy.motion.json`

En el panel **Sync (Login Copy Cat)**:

- `Load from App`: carga `breathSeconds`, `poseMult`, `sleepGapMs`, ciclo y la pata extra `paw-back-2`.
- `Save to App`: guarda esos valores y persiste todos los movimientos bajo `authoring.movements` (y el activo en `authoring.selectedMovement`).

## Export

- `Copy JSON`: copia el estado (transform + colores) al portapapeles.
- `Download JSON`: baja un archivo `cat-lab-state.json`.
- `Copy CSS`: genera CSS (transform overrides) para pegarlo luego en tu app.
