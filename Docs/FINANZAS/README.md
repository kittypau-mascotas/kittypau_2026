# Finanzas y Comprobantes - Kittypau

Registro operativo de movimientos financieros, comprobantes y respaldos del proyecto.

## Leer primero
1. [COMPROBANTES/README.md](COMPROBANTES/README.md) - carpeta canonica para boletas, transferencias y fotos de respaldo.
2. [../PLANES_Y_ACCESOS.md](../PLANES_Y_ACCESOS.md) - planes comerciales y criterios de acceso.
3. [../SQL_FINANZAS_KITTYPAU.sql](../SQL_FINANZAS_KITTYPAU.sql) - base de datos financiera y compras.

## Uso
- Cada pago, transferencia o boleta debe quedar con un registro textual.
- Las imagenes o PDFs se guardan en `FINANZAS/COMPROBANTES/adjuntos/`.
- Preferir nombres con fecha y contexto:
  - `YYYY-MM-DD_transferencia_persona_monto.ext`
  - `YYYY-MM-DD_boleta_proveedor_monto.ext`

## Estados
- `registrado`: documento agregado al indice financiero.
- `respaldado`: documento con imagen o PDF adjunto.
- `conciliado`: documento verificado contra la contabilidad o el acuerdo interno.


