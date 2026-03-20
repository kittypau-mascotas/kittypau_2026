# Baselines estadísticos

## Principio
Antes de ML pesado: **estadística robusta** (menos falsos positivos, más explicabilidad).

## Métodos sugeridos
- Robustez: MAD-score e IQR para outliers/anomalías
- Normalidad (cuando aplique): Shapiro-Wilk para decidir z-score vs robusto
- Comparación de ventanas: Mann–Whitney U (no paramétrica)
- Rutinas: FFT/Fourier sobre series por mascota (con limpieza previa)

## Salidas
- `anomaly_score` continuo (0–1)
- insights por ventana con contexto (métricas de soporte)

