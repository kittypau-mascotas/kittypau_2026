# APK Android Studio (KittyPau)

## Objective
Generate a KittyPau APK that uses real data from `https://kittypau-app.vercel.app` without exposing server secrets inside the mobile app.

## Technical decision
- Mobile app: `Capacitor + Android WebView`.
- APK loads KittyPau production URL (`server.url`) and uses real Next/Supabase APIs.
- Server secrets stay in Vercel/Supabase, not in the APK.

## What is already configured
- `kittypau_app/capacitor.config.ts` targets `https://kittypau-app.vercel.app`.
- Android hardening:
  - `android:allowBackup="false"`
  - `android:usesCleartextTraffic="false"`
  - `network_security_config.xml` allows only KittyPau/Supabase/Upstash domains.
  - `data_extraction_rules.xml` excludes backup/device-transfer app data.
- Android branding:
  - Launcher icons and splash generated from `public/logo_carga.jpg`.
  - Share text and app short text configured in Android strings.
- APK native layout mode:
  - Dedicated Capacitor-native distribution (different from mobile web).
  - Bottom navigation layout for native APK mode.
  - Safe-area handling for Android WebView.
- `kittypau_app/.env.example` separates public vs server-only variables.

## Secrets policy (required)
1. Never put `SUPABASE_SERVICE_ROLE_KEY`, `MQTT_WEBHOOK_SECRET`, `BRIDGE_HEARTBEAT_SECRET`, `VERCEL_API_TOKEN` in client code or Capacitor config.
2. Only public values (`NEXT_PUBLIC_*`, `SUPABASE_ANON_KEY`) may be visible in client context.
3. Keep real secrets in Vercel/Supabase/CI, not in Git.
4. Rotate any secret that was exposed in commits or chats.

## Installed Android CLI tools
- Android Studio (`Google.AndroidStudio`)
  - `C:\Program Files\Android\Android Studio\bin\studio64.exe`
- Android Platform Tools (`Google.PlatformTools`)
  - `C:\Users\Usuario\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe`

Quick checks:
```powershell
"C:\Program Files\Android\Android Studio\bin\studio64.exe" --version
"C:\Users\Usuario\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe" --version
```

## Build flow (this repo)
From `kittypau_app`:
```powershell
npm install
npm run build
npm run android:assets
npx cap sync android
```

Then from `kittypau_app/android`:
```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat clean assembleDebug assembleRelease
```

## APK outputs generated
- Debug APK (installable):  
  `kittypau_app/android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK (unsigned):  
  `kittypau_app/android/app/build/outputs/apk/release/app-release-unsigned.apk`

## Current Android version
- `versionCode`: `3`
- `versionName`: `1.2.0`

## Current output size
- `app-debug.apk`: ~8.7 MB
- `app-release-unsigned.apk`: ~5.5 MB

## Sign final release APK
Use Android Studio:
1. `Build > Generate Signed Bundle / APK`
2. Select `APK`
3. Create or select `.jks` keystore
4. Build `release`

## Validate real-data behavior
1. Login works with real KittyPau account.
2. `today` view loads real readings.
3. `pet`, `bowl`, and `story` load linked device data.
4. If API fails, check Vercel env vars and Supabase status.
