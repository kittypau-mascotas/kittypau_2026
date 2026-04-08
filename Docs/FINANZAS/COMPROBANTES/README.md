# Comprobantes financieros

Carpeta canonica para guardar respaldos de:
- transferencias
- boletas
- facturas
- recibos
- otros soportes de pago

## Estructura sugerida
- `adjuntos/` - imagenes o PDFs del comprobante.
- `registros/` - notas Markdown con el resumen del movimiento.

## Convencion de nombres
- `YYYY-MM-DD_transferencia_destinatario_monto`
- `YYYY-MM-DD_boleta_proveedor_monto`
- `YYYY-MM-DD_recibo_concepto_monto`

## Regla operativa
- Si entra un comprobante nuevo, primero crear su registro Markdown.
- Luego guardar el archivo adjunto con el mismo prefijo de fecha.
- Si el comprobante corresponde a una deuda, dejarlo enlazado desde el registro de deuda o finanzas correspondiente.

## Comprobantes destacados
- [2026-04-01_transferencia_javo_40000.md](2026-04-01_transferencia_javo_40000.md)


