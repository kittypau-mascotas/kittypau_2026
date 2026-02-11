# Catalogo de graficos y estilos (Kittypau)

## Graficos disponibles (por tipo)
- `G1` Linea en vivo (streaming): ideal para peso, temperatura, humedad, luz.
- `G2` Area suave: tendencia con relleno translucido.
- `G3` Step line: telemetria discreta o cambios por evento.
- `G4` Sparkline compacta: tarjeta KPI con micro-historial.
- `G5` Barras por ventana: agregados por minuto/hora.
- `G6` Gauge semicircular: bateria, salud de sensor, conectividad.
- `G7` Donut estado: distribucion de estados (normal/alerta).
- `G8` Heat strip temporal: intensidad por tiempo (ej. luz).

## Estilos visuales (por look)
- `S1` Clean Minimal: ejes finos, linea principal, fondo neutro.
- `S2` Glass Soft: panel con blur, acentos suaves, sombra ligera.
- `S3` Editorial: tipografia marcada, labels grandes, grid tenue.
- `S4` Technical: grid visible, ticks completos, lectura precisa.
- `S5` Motion Stream: trazo que "crece" al llegar datos nuevos.
- `S6` Night Lab (no dark mode global): solo para chart card, alto contraste local.

## Variantes de ejes y lectura
- `A1` Eje X relativo: `-5m ... ahora`.
- `A2` Eje X absoluto: marcas `HH:mm:ss`.
- `A3` Eje Y auto: min/max de la ventana.
- `A4` Eje Y fijo: rango operacional (recomendado para comparar dias).
- `A5` Etiquetas grandes: prioriza lectura rapida en mobile.

## Animaciones
- `M1` Draw-on-update: redibuja solo ultimo segmento.
- `M2` Shift-left: la serie se desplaza y entra nuevo punto.
- `M3` Pulse-dot: punto vivo en ultimo valor.
- `M4` Subtle glow: brillo leve en linea activa.

## Combinaciones recomendadas para Bowl
- `B1` Peso: `G1 + S3 + A1 + A4 + M2`
- `B2` Temperatura: `G1 + S1 + A1 + A4 + M1`
- `B3` Humedad: `G1 + S1 + A1 + A4 + M1`
- `B4` Luz entorno: `G2 + S2 + A1 + A3 + M3`
- `B5` Bateria: `G6 + S4 + A4`

## Estado actual implementado
- Peso: `G1` con streaming (`M1/M3`) y eje `A1`.
- Temperatura: `G1` con streaming (`M1/M3`) y eje `A1`.
- Humedad: `G1` con streaming (`M1/M3`) y eje `A1`.
- Luz entorno: `G1` con streaming (`M1/M3`) y eje `A1`.

## Como seleccionar
Elige solo estos codigos y yo lo aplico directo:
- Formato: `Peso=B1, Temperatura=B2, Humedad=B3, Luz=B4`
- O por componentes: `Peso=G2+S2+A1+M2`
