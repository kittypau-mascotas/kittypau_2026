# Quickstart de validación: Widget de Android — mini-hero de la mascota

**Input**: [spec.md](spec.md) User Stories · [research.md](research.md) Decisión 0 (gap de
build en este entorno)

## Prerrequisitos

- Todo lo de este feature que sea Kotlin/Gradle/XML (widget, plugin, worker) **solo se puede
  compilar y correr en una máquina con Android SDK + JDK instalados** (ver research.md,
  Decisión 0 — este entorno de Claude Code no los tiene). Ejecutar en la PC de Mauro, siguiendo
  el protocolo de 2 PCs (`Knowledge/19_DevOps/README_DevOps.md`) antes de tocar nada.
- Cuenta tester real: `kittypau.mascotas@gmail.com` (ver memoria del proyecto,
  `project_supabase_accounts.md`) con al menos una mascota con comedero **y** bebedero activos
  para ver datos reales en ambas barras.
- `FIREBASE_SERVICE_ACCOUNT_JSON` + `google-services.json` ya deben existir para que el canal
  de push del widget (research.md Decisión 5, parte opcional) funcione — mismo prerrequisito ya
  documentado en `008-push-notifications-fcm/plan.md`. Sin esto, el widget igual cumple SC-002
  solo con WorkManager (15 min < 30 min).

## Paso 1 — Validar la extensión del endpoint (sin Android, corre en este entorno)

```bash
cd kittypau_app
npm run test -- hunger-bar/route.test.ts
```

**Esperado**: los tests existentes siguen pasando + los nuevos casos de `water` (ver
`contracts/hunger-bar-water-extension.md` § Testing) pasan. Este paso SÍ es verificable acá,
antes de tocar nada de Android.

## Paso 2 — Sync del proyecto nativo (en la PC de Mauro)

```bash
cd kittypau_app
npm install            # trae @capacitor/preferences nuevo
npx cap sync android
cd android
./gradlew assembleDebug
```

**Esperado**: build verde. Si falla por versión de `androidx.work`/`androidx.glance`, revisar
compatibilidad contra `compileSdkVersion 36` (`variables.gradle`) antes de bajar versiones.

## Paso 3 — Instalar y agregar el widget desde el botón in-app (User Story 1 + objetivo de Mauro)

1. Instalar el APK debug en un dispositivo/emulador real.
2. Iniciar sesión con la cuenta tester.
3. Ir a `/today` (modo APK nativo, desplazar hasta el final del feed) → tocar "Agregar widget a tu pantalla de inicio".
4. **Esperado**: aparece el diálogo nativo de Android pidiendo confirmar el pin — sin haber
   pasado por el selector manual de widgets. Confirmar.
5. **Esperado**: se abre automáticamente la pantalla de selección de mascota
   (`WidgetPetConfigActivity`) — elegir una mascota con datos reales.
6. **Esperado**: el widget aparece en el home screen con foto, barra de comida, barra de agua,
   círculo de comida con número, círculo de agua sin número, y las dos horas en texto chico —
   comparar visualmente cada valor contra lo que muestra `/today` para esa misma mascota en ese
   momento (SC-003).

## Paso 4 — Validar refresco automático (User Story 2)

1. Con el widget ya agregado, generar un evento real de comida (o simularlo según el flujo de
   pruebas que ya use el proyecto para IoT/firmware).
2. **Esperado**: dentro de 30 minutos (SC-002) —idealmente minutos, si el canal de push del
   widget está activo— el widget refleja el cambio sin abrir la app.
3. Poner el dispositivo en modo avión, forzar un intento de refresco (o esperar el próximo
   ciclo de WorkManager).
4. **Esperado**: el widget sigue mostrando el último dato conocido, no una pantalla en blanco
   ni un error (SC-005). Sacar del modo avión → el próximo ciclo actualiza solo.

## Paso 5 — Validar el toque al widget (User Story 3)

1. Tocar el widget con sesión válida.
2. **Esperado**: la app abre directo en `/today` de esa mascota, sin login intermedio (SC-004).
3. Cerrar sesión desde la app, esperar a que el widget detecte la sesión inválida (o forzar el
   siguiente refresco).
4. **Esperado**: el widget muestra el estado neutro "Iniciá sesión para ver a tu mascota"
   (FR-014). Tocarlo en ese estado abre el login, no `/today`.

## Paso 6 — Cerrar

Actualizar `Knowledge/19_DevOps/PENDIENTES_POR_PC.md` con qué pasos de este quickstart se
corrieron de verdad (y en qué PC) vs. cuáles quedaron pendientes por falta de SDK/dispositivo —
mismo criterio ya usado para el resto de la verificación visual de la APK.
