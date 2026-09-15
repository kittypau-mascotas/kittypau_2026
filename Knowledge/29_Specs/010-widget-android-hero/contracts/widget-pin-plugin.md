# Contrato: plugin nativo `KittypauWidgetPlugin` (puente Capacitor)

**Input**: [research.md](../research.md) Decisión 2 · patrón de referencia:
`kittypau_app/src/lib/hooks/usePushTokenRegistration.ts`

Superficie mínima expuesta de Kotlin → TypeScript para que el botón de `/settings` dispare el
alta del widget sin salir de la app (objetivo explícito de Mauro).

## Interfaz TypeScript (consumida por un hook nuevo, ej. `useAddWidgetToHomeScreen.ts`)

```ts
interface KittypauWidgetPlugin {
  /**
   * Dispara AppWidgetManager.requestPinAppWidget() para el widget de
   * Kittypau. Resuelve con `{ supported: boolean }`:
   *  - supported: true  → se disparó el diálogo nativo del sistema; si el
   *    usuario acepta, Android bindea el widget y lanza automáticamente la
   *    configuration Activity (selección de mascota) — ver research.md
   *    Decisión 2. El resultado de si el usuario aceptó/rechazó no vuelve
   *    a JS (Android no lo expone) — no hay nada más que esperar acá.
   *  - supported: false → el launcher no soporta el pin directo (versión
   *    vieja o launcher no compatible). La UI debe mostrar el mensaje
   *    instructivo de fallback en vez de asumir que funcionó.
   */
  requestPin(): Promise<{ supported: boolean }>;
}
```

## Comportamiento nativo (`KittypauWidgetPlugin.kt`)

```
@CapacitorPlugin(name = "KittypauWidget")
class KittypauWidgetPlugin : Plugin() {
    @PluginMethod
    fun requestPin(call: PluginCall) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val provider = ComponentName(context, KittypauHeroWidgetReceiver::class.java)
        val supported = appWidgetManager.isRequestPinAppWidgetSupported
        if (supported) {
            appWidgetManager.requestPinAppWidget(provider, null, null)
        }
        val result = JSObject()
        result.put("supported", supported)
        call.resolve(result)
    }
}
```

- **MUST** chequear `isRequestPinAppWidgetSupported` antes de llamar `requestPinAppWidget` —
  llamarlo sin soporte lanza una excepción nativa, no un `false` silencioso.
- **MUST NOT** requerir ningún permiso nuevo en `AndroidManifest.xml` — `requestPinAppWidget`
  no requiere permisos declarados, es parte de `AppWidgetManager` estándar.
- API mínima intencional (ladder Ponytail): un solo método, sin parámetros — la selección de
  mascota vive en la configuration Activity nativa (research.md Decisión 2), no hace falta
  pasarle nada desde JS.

## Comportamiento del lado web/APK (`Capacitor.isNativePlatform()`)

Mismo guard que ya usa `usePushTokenRegistration.ts` — en la web pura (no-APK) el botón de
"Agregar widget" ni siquiera se muestra (los widgets de home screen no existen fuera de
Android nativo). Import dinámico del plugin, no-op si `!Capacitor.isNativePlatform()`.

## UI (referencia, no implementación)

Botón nuevo en `/settings` (`kittypau_app/src/app/(app)/settings/` o donde viva hoy esa
pantalla — confirmar ruta exacta en `/speckit-tasks`), visible solo en modo APK nativo
(mismo criterio que ya usa `isNativeApkMode` en `kittypau_app/src/app/_components/app-nav.tsx`):

- Estado `supported: true` tras el tap → sin mensaje adicional, el diálogo nativo ya se
  encargó (y de ahí en más, la configuration Activity nativa).
- Estado `supported: false` → mostrar el texto instructivo de fallback (mantener presionada la
  pantalla de inicio → Widgets → Kittypau), FR-001 sigue cumplido igual (el widget existe y es
  agregable), solo cambia el camino.
