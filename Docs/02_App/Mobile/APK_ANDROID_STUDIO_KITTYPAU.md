# APK Android Studio (Kittypau)

## Current local state
- Local web server: `http://localhost:3000`
- App project: `kittypau_app`
- Android emulator used: `Pixel_7`
- ADB target: `emulator-5554`
- Current debug APK:
  `kittypau_app/android/app/build/outputs/apk/debug/app-debug.apk`

## Objective
Generate a Kittypau APK that uses real data from `https://kittypau-app.vercel.app` without exposing server secrets inside the mobile app.

## Technical decision
- Mobile app: `Capacitor + Android WebView`.
- APK loads Kittypau production URL (`server.url`) and uses real Next/Supabase APIs.
- Server secrets stay in Vercel/Supabase, not in the APK.

## What is already configured
- `kittypau_app/capacitor.config.ts` reads `CAPACITOR_SERVER_URL`.
  - Default: `https://app.kittypau-app.vercel.app` (frontend exclusivo APK).
  - Web publica se mantiene en `https://kittypau-app.vercel.app`.
- Auth persistence:
  - Supabase browser client uses `persistSession: true`.
  - Token refresh is enabled with `autoRefreshToken: true`.
  - The app should keep the session open on the same device until the user explicitly uses `Cerrar sesin`.
  - Root `/` and `/login` now resolve authenticated users back to `/today` (or `/admin` if applicable) instead of forcing a new login.
- Android hardening:
  - `android:allowBackup="false"`
  - `android:usesCleartextTraffic="false"`
  - `network_security_config.xml` allows only Kittypau/Supabase/Upstash domains.
  - `data_extraction_rules.xml` excludes backup/device-transfer app data.
- Android branding:
  - Launcher icons and splash generated from `public/logo_carga.jpg`.
  - Share text and app short text configured in Android strings.
- APK native layout mode:
  - Dedicated Capacitor-native distribution (different from mobile web).
  - Bottom navigation layout for native APK mode.
  - Safe-area handling for Android WebView.
- `kittypau_app/.env.example` separates public vs server-only variables.
  - `NEXT_PUBLIC_APP_FLAVOR` (`web` | `native`)
  - `CAPACITOR_SERVER_URL` (URL cargada por la APK)

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
"C:\Program Files\Android\Android Studio\bin\studio64.exe" --versin
"C:\Users\Usuario\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe" --versin
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

## Current Android versin
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
1. Login works with real Kittypau account.
2. Reopening the APK on the same device should keep the session active.
3. `today` view loads real readings.
4. `pet`, `bowl`, and `story` load linked device data.
5. If API fails, check Vercel env vars and Supabase status.

## UI notes for APK native distribution (2026-03-09)
- Mobile login in native flavor (`kp-native-apk` / `kp-flavor-native`) is tuned to:
  - keep only the main hero title visible,
  - hide the small descriptive copy,
  - reduce top visual load and keep the login card higher.
- `/today` native mobile is tuned to:
  - compact hero summary cards and period selector,
  - reduce metric typography inside bowl cards for better first-screen fit.

## Latest APK-only login adjustments
- Parallax removed for APK runtime.
- Hero column hidden (`login-hero-column`).
- Auth column expanded to full width.
- Login panel cat hidden (`kp-trial-cat.login-panel-cat`).
- Login inputs reduced to `44px`.
- Submit button adjusted to `46px`.

Files touched for this APK-only tuning:
- `kittypau_app/src/app/_components/native-apk-mode.tsx`
- `kittypau_app/src/app/globals.css`
- `Docs/android-emulator-setup.md`

Visual tokens currently used:
- Primary: `hsl(12 62% 79%)`
- Background: `hsl(25 70% 98%)`
- Radius: `18px`

## Latest production deployment
- Main URL: `https://kittypau-app.vercel.app`
- Verified deploy: `https://kittypau-nxxpuju1b-kittypaus-projects.vercel.app`
- Related commits:
  - `4d55aae`
  - `6e74853`


