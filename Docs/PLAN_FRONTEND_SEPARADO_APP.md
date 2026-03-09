# Plan Detallado - Frontend Separado para App (sin afectar Web)

## Definicion explicita (APK Android)
- En este plan, **app** significa exclusivamente: **app Android instalada por APK**.
- La app APK corre sobre `Capacitor + Android WebView`.
- **No** se refiere a la web en navegador movil.

## Glosario operativo
1. **Web publica**:
- Dominio: `https://kittypau-app.vercel.app`
- Uso: desktop + navegador movil
- Regla: no debe cambiar por ajustes visuales exclusivos de APK

2. **App APK Android**:
- Artefacto instalable: `app-debug.apk` / `app-release-unsigned.apk`
- Carpeta nativa: `kittypau_app/android`
- Regla: aqui se pueden aplicar cambios visuales exclusivos

## Objetivo
Separar la experiencia visual de la app instalada (APK/Capacitor) de la web (`kittypau-app.vercel.app`) para poder evolucionar la UI nativa sin cambiar la web desktop ni la web movil en navegador.

## Estado actual
- APK usa `server.url = https://kittypau-app.vercel.app` en `capacitor.config.ts`.
- Consecuencia: cambios visuales globales impactan web y app por igual.

## Resultado objetivo
1. Web publica sigue en `https://kittypau-app.vercel.app` (sin cambios de UX por APK).
2. App instalada consume frontend dedicado (ej: `https://app.kittypau-app.vercel.app`).
3. Ambos frontends comparten backend/API y auth, pero con capas UI desacopladas.

---

## Arquitectura propuesta

### Dominio y despliegue
- `kittypau-app.vercel.app` -> experiencia web general.
- `app.kittypau-app.vercel.app` -> experiencia frontend exclusiva APK.

### Estrategia de código
- Mantener monorepo y misma base Next.js.
- Introducir **App Flavor** por entorno:
  - `NEXT_PUBLIC_APP_FLAVOR=web` para web.
  - `NEXT_PUBLIC_APP_FLAVOR=native` para frontend APK.
- Las rutas API, DB y auth permanecen compartidas.

### Reglas de separación
1. Componentes compartidos: lógica de datos/estado.
2. Componentes de presentación: variantes por flavor (`web` vs `native`).
3. CSS por flavor: clases raíz (`app-flavor-web`, `app-flavor-native`) y tokens separados.

---

## Fases de implementación

## Fase 0 - Baseline y seguridad de cambios
1. Congelar baseline:
- `npm run type-check`
- `npm run build`
2. Registrar URL/alias actuales de Vercel y rollback disponible.
3. Crear branch de trabajo: `feat/native-frontend-split`.

Entregable:
- Baseline técnico verificado antes de tocar UI.

## Fase 1 - Infra Vercel separada
1. Crear nuevo deployment target para app:
- Proyecto nuevo en Vercel o mismo proyecto con dominio alterno y env específico.
2. Configurar dominio:
- `app.kittypau-app.vercel.app` (o equivalente de equipo).
3. Variables por entorno:
- Web: `NEXT_PUBLIC_APP_FLAVOR=web`
- App: `NEXT_PUBLIC_APP_FLAVOR=native`

Entregable:
- Dos endpoints accesibles con diferente flavor.

## Fase 2 - Selector de flavor en app
1. Crear helper único:
- `src/lib/runtime/app-flavor.ts`
- `getAppFlavor(): "web" | "native"`
2. Inyectar clase raíz en layout:
- `src/app/layout.tsx` o layout `(app)` con clase `app-flavor-*`.
3. Crear guard de uso:
- No usar `Capacitor.isNativePlatform()` como criterio de negocio; solo como fallback visual.

Entregable:
- Render condicionado por `NEXT_PUBLIC_APP_FLAVOR` sin romper rutas.

## Fase 3 - Capa visual separada (sin duplicar lógica)
1. Crear wrappers de UI por vista crítica:
- `/today`, `app-nav`, `login`, `registro`.
2. Patrón:
- `TodayViewShared` (data + lógica)
- `TodayViewWeb` (presentación web)
- `TodayViewNative` (presentación APK)
3. Mantener contratos y hooks de datos compartidos.

Entregable:
- UI APK editable en aislamiento; web intacta.

## Fase 4 - Capacitor apuntando a frontend app
1. Actualizar `capacitor.config.ts`:
- `server.url` -> `https://app.kittypau-app.vercel.app`
2. Mantener `allowNavigation` con dominios backend necesarios.
3. Sincronizar Android:
- `npx cap sync android`

Entregable:
- APK carga frontend dedicado.

## Fase 5 - QA integral y release
1. Matriz de pruebas:
- Web desktop (chrome)
- Web mobile (responsive browser)
- APK (WebView Android)
2. Smoke obligatorio:
- login/logout
- `/today` selector mascota/KPCL
- navbar/perfil
- `/api/readings`
3. Build de release:
- `npm run build`
- `npx cap sync android`
- `cd android && .\gradlew assembleDebug`

Entregable:
- release validada sin regresiones cruzadas.

---

## Archivos a modificar (objetivo)
- `kittypau_app/capacitor.config.ts`
- `kittypau_app/src/app/layout.tsx`
- `kittypau_app/src/app/(app)/today/page.tsx`
- `kittypau_app/src/app/(app)/_components/app-nav.tsx`
- `kittypau_app/src/app/globals.css`
- `kittypau_app/.env.example`
- `Docs/APK_ANDROID_STUDIO_KITTYPAU.md`
- `Docs/CHECKLIST_DEPLOY.md`

---

## CI/CD recomendado
1. Pipeline Web:
- deploy a `kittypau-app.vercel.app` con flavor `web`.
2. Pipeline App Frontend:
- deploy a `app.kittypau-app.vercel.app` con flavor `native`.
3. Gate mínimo en ambos:
- `type-check` + `build`.

---

## Riesgos y mitigación
1. Duplicación excesiva de UI.
- Mitigar con patrón shared-logic + presentational split.

2. Divergencia funcional entre web/app.
- Mitigar con tests de contrato y checklist de smoke por release.

3. Errores por configuración cruzada de entornos.
- Mitigar con tabla de envs y validación en boot.

4. Rotura de navegación en APK por dominio no permitido.
- Mitigar con revisión de `allowNavigation` y prueba en dispositivo real.

---

## Criterios de aceptación
1. Cambios visuales en APK no alteran web desktop/mobile.
2. Web y app mantienen misma lógica de datos y resultados de negocio.
3. `npm run type-check` y `npm run build` pasan.
4. APK debug abre, autentica y muestra `/today` con datos reales.
5. Rollback documentado y probado para ambos deploys.

---

## Plan de ejecución sugerido (7 días)
- Dia 1: Fase 0 + Fase 1 (infra y dominios)
- Dia 2: Fase 2 (flavor runtime)
- Dia 3-4: Fase 3 (separación visual por vista crítica)
- Dia 5: Fase 4 (Capacitor a dominio app)
- Dia 6: Fase 5 (QA y hardening)
- Dia 7: release + documentación final

---

## Verificacion tecnica ejecutada al crear este plan
- `npm run type-check`: OK
- `npm run build`: OK
- `npm run lint`: con errores preexistentes del repo (principalmente en `login`, `demo`, `admin`, warnings de hooks/img).  
  Nota: no bloquean build actual, pero deben tratarse antes de formalizar un gate de calidad estricto por lint.
