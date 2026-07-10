# Como ejecutar Kittypau en emulador Android

## Estado operativo actual
- Servidor web local: `http://localhost:3000`
- Proyecto app: `kittypau_app`
- Emulador activo esperado: `Pixel_7`
- ADB esperado: `emulator-5554`
- APK debug actual:
  `D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app\android\app\build\outputs\apk\debug\app-debug.apk`

## Cambios recientes aplicados al login APK
Estos ajustes son solo para la distribucion nativa APK:

1. Parallax visual desactivado para APK.
2. Columna hero oculta (`.login-hero-column`).
3. Columna de autnticacion en ancho completo.
4. Gato del panel oculto (`.kp-trial-cat.login-panel-cat`).
5. Inputs compactados a `44px`.
6. Boton submit compactado a `46px`.

## Archivos modificados para este ajuste
- `kittypau_app/src/app/_components/native-apk-mode.tsx`
- `kittypau_app/src/app/globals.css`
- `Docs/android-emulator-setup.md`

## Colores visuales usados en APK
- Primary: `hsl(12 62% 79%)`
- Background: `hsl(25 70% 98%)`
- Radius base: `18px`

## Estructura del proyecto
```text
kittypau_2026_hivemq/
|-- kittypau_app/                    # App Next.js + Capacitor
|-- kittypau_app/android/            # Proyecto Android nativo
|-- kittypau_app/android/app/        # Modulo Android
`-- Docs/                            # Documentacion
```

## Requisitos previos
1. Servidor Next.js corriendo en `http://localhost:3000`
2. Android Studio instalado
3. SDK Android instalado
4. `JAVA_HOME` apuntando al JBR de Android Studio

## Rutas importantes
- Proyecto:
  `D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq`
- App:
  `D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app`
- APK debug:
  `D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app\android\app\build\outputs\apk\debug\app-debug.apk`
- SDK Android:
  `C:\Users\Usuario\AppData\Local\Android\Sdk`
- Emulator:
  `C:\Users\Usuario\AppData\Local\Android\Sdk\emulator\emulator.exe`
- ADB:
  `C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- JAVA_HOME:
  `C:\Program Files\Android\Android Studio\jbr`

## Flujo completo

### 1. Iniciar servidor web
```powershell
cd D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app
npm run dev
```

Validar que responda en:
`http://localhost:3000`

### 2. Iniciar emulador
```powershell
& "C:\Users\Usuario\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Pixel_7 -no-audio -no-window
```

### 3. Verificar ADB
```powershell
& "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
```

Debe mostrar:
`emulator-5554    device`

### 4. Sincronizar Capacitor y construir APK
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app
npx capacitor sync android
cd D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app\android
.\gradlew.bat assembleDebug
```

### 5. Instalar APK
```powershell
& "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 install -r "D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app\android\app\build\outputs\apk\debug\app-debug.apk"
```

Si aparece error por firma o paquete previo:
```powershell
& "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 uninstall com.kittypau.app
```

### 6. Abrir la app
```powershell
& "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 shell am start -n com.kittypau.app/com.kittypau.app.MainActivity
```

## Comandos tiles
```powershell
# Ver AVDs
& "C:\Users\Usuario\AppData\Local\Android\Sdk\emulator\emulator.exe" -list-avds

# Reiniciar emulador con wipe
& "C:\Users\Usuario\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Pixel_7 -wipe-data

# Logcat
& "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 logcat | findstr kittypau

# Forzar cierre
& "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 shell am force-stop com.kittypau.app
```

## Notas de red
- Desde el emulador, el host local se accede como `10.0.2.2`, no `localhost`.
- Si falla por `cleartext`, revisar configuracin Android y `network_security_config.xml`.

## Errores comunes
| Error | Solucion |
|---|---|
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Desinstalar antes de reinstalar |
| `adb: no devices/emulator found` | Esperar ms tiempo o reiniciar emulador |
| `JAVA_HOME not set` | Configurar `JAVA_HOME` al JBR de Android Studio |
| `net::ERR_cleartext_not_permitted` | Revisar configuracin de red Android |

## Resumen corto para repetir el flujo
```powershell
# Terminal 1
cd D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app
npm run dev

# Terminal 2
& "C:\Users\Usuario\AppData\Local\Android\Sdk\emulator\emulator.exe" -avd Pixel_7 -no-audio -no-window

# Terminal 3
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app
npx capacitor sync android
cd android
.\gradlew.bat assembleDebug
& "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 install -r "D:\Escritorio\Proyectos\Kittypau\kittypau_2026_hivemq\kittypau_app\android\app\build\outputs\apk\debug\app-debug.apk"
& "C:\Users\Usuario\AppData\Local\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 shell am start -n com.kittypau.app/com.kittypau.app.MainActivity
```

