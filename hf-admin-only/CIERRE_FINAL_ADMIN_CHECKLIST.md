# Cierre Final Admin - Checklist

## Estado actual
- Todo el trabajo de código/documentación del dashboard admin está implementado.
- Lo pendiente es operacional (externo al repo).

## Paso 1: aplicar migraciones
```bash
npx supabase db push
```

Migraciones clave:
- `20260220001500_finance_kpcl_catalog.sql`
- `20260220003000_admin_object_stats_hardened.sql`

## Paso 2: deploy
```bash
vercel --prod
```

## Paso 3: validación rápida
1. Abrir `/admin`.
2. Confirmar carga de:
- KPIs ejecutivos.
- Continuidad KPCL.
- Suite de tests admin.
3. Ejecutar botón `Correr todos los tests`.
4. Confirmar:
- resultados por test,
- historial de errores en el bloque de suite.

## Paso 4: bloqueantes externos
1. Rotar secretos:
- `SUPABASE_SERVICE_ROLE_KEY`
- `MQTT_PASSWORD`
- tokens expuestos de sesiones previas
2. Configurar costo real HiveMQ:
- `HIVEMQ_API_BASE_URL`
- `HIVEMQ_API_TOKEN`
- `HIVEMQ_CLUSTER_ID`

## Criterio de terminado
- Migraciones aplicadas.
- Deploy estable en producción.
- Suite admin ejecuta correctamente.
- Secretos rotados.
- HiveMQ real integrado (sin simulación).
