# Particiones (events) - KViejos

MVP puede correr sin particiones.

Cuando el volumen crezca, particionar `events` por mes:
- `events_2026_03`, `events_2026_04`, etc.
- Particionamiento por `recorded_at`

Objetivo:
- consultas rapidas de "ultimo dia/semana"
- retencion/archivado simple

