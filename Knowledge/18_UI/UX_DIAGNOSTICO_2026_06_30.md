---
id: ux_diagnostico_2026_06_30
title: Diagnóstico UX/UI — KittyPau App (2026-06-30)
type: audit
status: active
owner: Mauro
created: 2026-06-30
updated: 2026-07-01
tags:
  - ux
  - ui
  - diagnostico
  - accesibilidad
  - mobile
related:
  - [[00_HOME]]
  - [[04_Frontend/README_Frontend]]
  - [[20_Testing/README_Testing]]
  - [[AUDITORIA_2026_06_29]]
---

# Diagnóstico UX/UI — KittyPau App

> Análisis basado en lectura directa del código fuente de todas las páginas `(app)/` y `(public)/`, el layout principal y el componente `AppNav`. Generado el 2026-06-30. Playwright MCP disponible para sesión futura de validación visual.

---

## Resumen ejecutivo

La app tiene una arquitectura UI robusta y el sistema de diseño (tokens CSS, clases como `surface-card`, `freeform-rise`, `page-shell`) es coherente entre páginas. Sin embargo, hay **5 problemas críticos** que afectan a nuevos usuarios, **10 problemas importantes** de UX y **8 mejoras de calidad** documentadas abajo.

---

## 1. Inventario de páginas analizadas

| Ruta | Archivo | Tipo | Líneas |
|------|---------|------|--------|
| `/today` | `(app)/today/page.tsx` | Client | **5526** (monolito) |
| `/bowl` | `(app)/bowl/page.tsx` | Client | 1784 |
| `/pet` | `(app)/pet/page.tsx` | Client | 889 |
| `/settings` | `(app)/settings/page.tsx` | Client | 466 |
| `/story` | `(app)/story/page.tsx` | Client | ~600+ |
| `/registro` | `(app)/registro/page.tsx` | Server | 22 |
| `/inicio` | `(app)/inicio/page.tsx` | Client | 14 |
| Nav | `(app)/_components/app-nav.tsx` | Client | 448 |
| Layout | `(app)/layout.tsx` | Server | 15 |

---

## 2. Problemas críticos (C)

### C1 — `/inicio` renderiza `null` (pantalla en blanco)

**Archivo:** `(app)/inicio/page.tsx:1-14`

```tsx
export default function InicioClientePage() {
  const router = useRouter();
  useEffect(() => { router.replace("/today"); }, [router]);
  return null;  // ← pantalla en blanco hasta que el efecto corre
}
```

**Impacto:** Usuarios con sesiones guardadas o que llegan a `/inicio` ven una pantalla completamente blanca por ~200-400ms antes del redirect.

**Fix propuesto:** Retornar un spinner o skeleton mínimo:
```tsx
return <div className="page-shell"><div className="surface-card px-6 py-6 text-sm text-slate-400">Cargando...</div></div>;
```

---

### C2 — `/today` es un monolito de 5526 líneas

**Archivo:** `(app)/today/page.tsx`

El componente `TodayPage` contiene: lógica de auth, 9+ `useEffect`, carga de lecturas/pets/devices/audit events/analytics sessions, 2 librerías de gráficos (D3 + Chart.js), gestión de estado del ciclo día/noche, detección de sesiones de consumo y toda la UI. Consecuencias:
- Time-to-interactive muy alto (bundle grande)
- Difícil de mantener y extender
- Un error en cualquier subsistema tumba toda la página

**Fix propuesto:** Extraer en sub-componentes: `TodayHeroSection`, `TodayFoodChart`, `TodayWaterChart`, `TodayConsumptionSummary`, `TodayAuditControls`.

---

### C3 — Sin página `/dispositivos` (QA-03 documentado)

**Problema:** No existe `dispositivos/page.tsx`. Solo existe `dispositivos/nuevo/page.tsx`. El enlace "Agregar dispositivo" en `/settings` apunta a `/dispositivos/nuevo` y funciona, pero no hay lista ni gestión de dispositivos en una ruta dedicada.

**Fix propuesto:** Crear `dispositivos/page.tsx` que liste los dispositivos del usuario con botón para agregar nuevo.

---

### C4 — Config modal sin scroll en móvil (accesibilidad)

**Archivo:** `(app)/bowl/page.tsx:1408-1676`

El modal de configuración del dispositivo tiene 4 secciones apiladas (Báscula, Asignación, WiFi, Intervalo de muestreo). En pantallas pequeñas (iPhone SE, Android budget) el modal puede exceder la altura visible sin scroll interno.

El modal usa:
```tsx
<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
  <div className="w-full max-w-sm rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-xl sm:rounded-2xl">
```

No hay `overflow-y-auto` ni `max-h-[90vh]`.

**Fix propuesto:**
```tsx
<div className="w-full max-w-sm rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-xl sm:rounded-2xl overflow-y-auto max-h-[90vh]">
```

---

### C5 — Modal sin soporte de teclado (accesibilidad A11y)

**Archivo:** `(app)/bowl/page.tsx:1408-1416`

El modal de configuración carece de:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` (título)
- Trap de foco (focus-trap)
- Cierre por tecla Escape

```tsx
// Actualmente:
<div className="fixed inset-0 z-50 ..." onClick={() => setShowConfig(false)}>
  <div onClick={(e) => e.stopPropagation()}>
```

El mismo problema aplica al modal "Añadir Bebedero" (línea 1717).

**Fix propuesto:** Usar `@radix-ui/react-dialog` o agregar manualmente `useEffect` con listener de `Escape` y gestión de focus.

---

## 3. Problemas importantes (I)

### I1 — Selector de intervalo duplicado en `/bowl`

El selector de intervalo de escaneo aparece dos veces:
1. En el header de la sección "Lecturas en vivo" (líneas 1091-1134)
2. Dentro del modal de configuración (líneas 1628-1674)

Ambos comparten el mismo estado `selectedInterval`. Esto confunde porque el usuario no sabe cuál usar. El de la modal tiene más contexto (con explicación debajo), el del header es más accesible pero críptico.

**Fix:** Eliminar el selector del header y dejarlo solo en el modal de config, o unificar en un componente compartido.

---

### I2 — Estado de carga como texto plano

Todas las páginas muestran texto plano sin animación mientras cargan:
- `/bowl`: `<div>Cargando estado...</div>`
- `/settings`: `<div>Cargando ajustes...</div>`
- `/pet`: texto de dos líneas pero sin skeleton

**Fix:** Crear componente `<PageSkeleton />` con placeholders animados (`animate-pulse`) que representen la estructura de cada sección.

---

### I3 — `/settings` tiene botón "Ajustes" dentro de la página Ajustes

**Archivo:** `(app)/settings/page.tsx:145-185`

La página "Ajustes" tiene en su header un botón llamado "Ajustes" que abre un menú flotante. El nombre del botón es igual al título de la página. Adicionalmente, las acciones del menú (Editar perfil, Cerrar sesión) son acciones que ya están accesibles via nav.

**Fix:** Renombrar el botón a "Acciones" o reemplazarlo con un ícono de tres puntos (`...`).

---

### I4 — Formularios sin `<form>` ni submit por Enter

**Archivos:** `settings/page.tsx`, `pet/page.tsx`

Los formularios de edición usan `<input>` sueltos con `onChange`. No tienen `<form onSubmit>`, por lo que:
- Presionar Enter en un campo no guarda los cambios
- Los password managers no pueden detectar el formulario correctamente

**Fix:** Envolver en `<form onSubmit={handleSave}>` con `type="submit"` en el botón guardar.

---

### I5 — No se puede editar el tipo (especie) de la mascota

**Archivo:** `(app)/pet/page.tsx:668-671`

```tsx
const { type, id, pet_state, ...sendPayload } = editPayload;
void type; void id; void pet_state;
```

El campo `type` (gato/perro) se excluye al guardar. No hay campo en el form para editarlo. Si el usuario registró mal la especie, no puede corregirla desde esta vista.

**Fix:** Agregar `<select>` para `type` con opciones `cat`/`dog` en el formulario de edición.

---

### I6 — Sin foto de mascota ni de perfil de usuario en formularios

La API devuelve `photo_url` en mascotas y `photo_url` en perfiles, pero no hay UI para subir/editar fotos. El avatar del nav usa `/avatar_1.png` como fallback.

**Fix pendiente:** Agregar componente de upload de imagen. Requiere storage bucket en Supabase.

---

### I7 — Nav no muestra ícono de estado MQTT

El `AppNav` muestra un indicador `isDeviceOnline` (verde si last_seen < 15 min), pero no hay indicador del estado de la conexión MQTT WebSocket. Un usuario puede tener el dispositivo "online" según la DB pero el WebSocket desconectado.

**Fix:** Exponer el estado `isConnected` de `useMqttLive` en el contexto `AppDataProvider` y mostrarlo en el nav.

---

### I8 — Admin redirect puede crear loop en `/today`

**Archivo:** `(app)/today/page.tsx:1023-1030`

```tsx
if (nextType === "admin") {
  router.replace("/admin");
}
```

Si un admin accede a `/today` directamente, es redirigido a `/admin`. Pero si `/admin` también tiene una comprobación de tipo que redirige de vuelta (no verificado), hay riesgo de loop. Además, los admins no pueden ver el dashboard de usuario normal nunca.

**Fix:** Guardar la redirección en una ref para evitar re-triggering, y considerar si los admins deberían poder acceder a `/today` para debugging.

---

### I9 — Datos WiFi almacenados solo en localStorage

**Archivo:** `(app)/bowl/page.tsx:602-609`

```tsx
const stored = localStorage.getItem(`kp_wifi_${selectedDevice.device_id}`);
setKnownWifiSsids(stored ? JSON.parse(stored) : []);
```

Las redes WiFi conocidas se guardan en `localStorage` del navegador, no en la DB. Si el usuario cambia de dispositivo o borra el caché, pierde el historial de redes. En la APK Capacitor, `localStorage` puede vaciarse en actualizaciones.

**Fix:** Persistir SSIDs conocidos en la tabla `devices` (campo JSON `known_wifi_ssids`) o en una tabla `device_wifi_configs`.

---

### I10 — Rango "1 semana" en menú de intervalo (604_800_000 ms)

**Archivo:** `(app)/bowl/page.tsx:1114`

```tsx
<option value={604_800_000}>1 semana</option>
```

Un intervalo de muestreo de 1 semana para un dispositivo IoT no tiene sentido operativo (el dispositivo esperaría 7 días entre lecturas). Este valor debería estar limitado a máximo 24 horas, o deshabilitado.

---

## 4. Mejoras de calidad (Q)

### Q1 — Duplicación de `parseListResponse` y `resolveDevicePowerState`

Estas funciones utilitarias aparecen copiadas en `bowl/page.tsx` y `today/page.tsx` (y otras páginas). Deberían vivir en `lib/utils/api.ts` o similar.

### Q2 — Constante KPCL0034 hardcodeada en `today/page.tsx`

```tsx
const AUTHORITATIVE_FOOD_DEVICE_CODE = "KPCL0034";
```

Este hardcode en el frontend limita la app a un solo dispositivo "autoritativo". Debería venir de la configuración del perfil o de la tabla `devices`.

### Q3 — Loading de la página `/pet` muestra texto demasiado largo

```tsx
"Estamos armando la ficha de tu mascota y vinculando el último historial disponible."
```

Demasiado verbose para un estado transitorio. En móvil puede ocupar 3 líneas innecesariamente.

### Q4 — `menuOpen` en `/settings` no se cierra al navegar

El dropdown de "Ajustes" en `/settings/page.tsx` no tiene listener de cierre al hacer clic fuera (a diferencia del AppNav que sí lo tiene con `useRef`).

### Q5 — `dayCycleOffsetDays` sin límite de días hacia atrás

En `/today`, el usuario puede navegar hacia atrás en el tiempo sin límite. En plan free, esto solo muestra datos de la misma DB window pero puede generar confusión si se navega más allá del histórico disponible.

### Q6 — Estado "Firmware: Sincronizado (próximamente versión remota)"

**Archivo:** `(app)/bowl/page.tsx:1376`

Este placeholder debería ser una feature real o removerse — en producción/demo parece UX incompleta.

### Q7 — Botones disabled con texto genérico "próximamente"

```tsx
<button disabled>Calibración remota (próximamente)</button>
<button disabled>Reinicio remoto (próximamente)</button>
```

Los botones disabled sin un tooltip ni fecha estimada crean expectativa pero no acción. En demos generan preguntas.

### Q8 — AppNav excluye rutas `registro` y `admin` pero no `story`

```tsx
if (pathname?.startsWith("/registro") || pathname?.startsWith("/admin")) {
  return null;
}
```

La página `/story` muestra nav pero `/admin` no. Si se agregaran más rutas con nav oculto, esta lista manual crecerá indefinidamente. Debería ser una config centralizada.

---

## 5. Inventario de accesibilidad (A11y)

| Elemento | Estado | Nota |
|----------|--------|------|
| `aria-label` en botones de ciclar device (`◀ ▶`) | ✅ correcto | `aria-label="Plato anterior"` |
| `aria-hidden="true"` en SVGs decorativos | ✅ correcto | Visto en bowl page |
| Modal bowl sin `role="dialog"` | ❌ falta | Ver C5 — pendiente |
| Modal registro con `role="dialog"` + focus trap + Escape | ✅ resuelto | 2026-07-01 — ver L-C2 |
| Formularios sin `<form>` | ❌ falta | Ver I4 — pendiente |
| `aria-expanded` en menú nav | ✅ correcto | `aria-expanded={menuOpen}` |
| `aria-expanded` en botón Ajustes | ✅ correcto | |
| Contraste de colores texto | ✓ probable | Usa slate-900/slate-500 — revisar con herramienta |
| Navegación por teclado en modales | ❌ falta | |

---

## 6. Análisis de rendimiento UX

| Página | Problema | Impacto |
|--------|---------|---------|
| `/today` | 5526 líneas, D3+Chart.js dual | Bundle grande, TTI alto |
| `/bowl` | Polling cada 8s + Supabase realtime en paralelo | Carga de red duplicada |
| `/today` + `/bowl` | Supabase realtime channels sin cleanup condicional | Conexiones WS abiertas en background |
| `/pet` | Carga 80 readings en mount aunque solo muestra latest | 79 filas innecesarias |
| `/today` | Carga hasta 5000 readings por device para el chart | Puede tardar varios segundos |

---

## 7. UX Mobile / APK Capacitor

| Aspecto | Estado | Nota |
|---------|--------|------|
| Nav adaptiva (sidebar vs top-bar) | ✅ | `isNativeApkMode` detecta Capacitor |
| Modales como bottom-sheet en móvil | ✅ parcial | `items-end sm:items-center` |
| Modal sin scroll interno | ❌ | Ver C4 |
| `autoCapitalize` y `autoCorrect` en inputs | ✅ | Visto en WiFi SSID input |
| Inputs de contraseña con `autoComplete="off"` | ✅ | |
| Inputs de número con `type="number"` | ✅ parcial | Pet weight usa `type="number"` |
| Safe areas para notch/home indicator | ❓ no verificado | Necesita prueba en dispositivo |

---

## 8. Análisis de flujos de usuario

### Flujo nuevo usuario (onboarding)
1. `/login` → autenticación ✅
2. `/today` → redirección automática si hay sesión ✅
3. Empty state → botón "Ir a registro" → `/registro` → redirect a `/login?register=1` ✅
4. No hay un wizard de onboarding guiado — el usuario debe descubrir por sí mismo que tiene que ir a `/pet` para agregar mascota y a `/bowl` para agregar dispositivo.

**Gap:** No hay flujo de onboarding explícito. El empty state dice "Ir a registro" pero el registro está integrado en el login, lo que puede confundir.

### Flujo de operación diaria
1. `/today` — vista principal con gráficos de ciclo día ✅
2. `/bowl` — lecturas en vivo con selector de rango ✅
3. `/story` — historial de sesiones ✅
4. `/pet` — perfil de mascota ✅

El flujo es coherente. La navegación de 4 ítems es manejable.

### Flujo de configuración de dispositivo
1. `/bowl` → ⚙️ (config modal) → Asignación, WiFi, Intervalo ✅
2. Alternativa: `/settings` → "Agregar dispositivo" → `/dispositivos/nuevo` ✅
3. No hay lista de dispositivos en `/dispositivos` (QA-03) ❌

---

## 9. Priorización de fixes

| # | Fix | Esfuerzo | Impacto | Sprint |
|---|-----|----------|---------|--------|
| 1 | C4: Scroll en modal bowl | XS (1 clase CSS) | Alto móvil | Inmediato |
| 2 | C1: Spinner en /inicio | XS (5 líneas) | Bajo | Inmediato |
| 3 | I10: Remover intervalo "1 semana" del selector | XS | UX | Inmediato |
| 4 | Q6+Q7: Remover placeholders "próximamente" o reemplazar con roadmap | S | Demo | Inmediato |
| 5 | I3: Renombrar botón "Ajustes" → "Acciones" en settings | XS | UX | Inmediato |
| 6 | C5: Aria + escape en modales | S | A11y | Sprint 1 |
| 7 | I4: Formularios con `<form>` | S | UX | Sprint 1 |
| 8 | C3: Crear `dispositivos/page.tsx` | M | Feature | Sprint 1 |
| 9 | I1: Unificar selector de intervalo | S | UX | Sprint 1 |
| 10 | I5: Campo tipo de mascota editable | S | Feature | Sprint 1 |
| 11 | I2: Skeletons de carga | M | UX | Sprint 2 |
| 12 | I9: Persistir WiFi en DB | M | Data | Sprint 2 |
| 13 | C2: Refactorizar `today/page.tsx` | XL | Mantenibilidad | Sprint 3+ |
| 14 | I6: Upload de foto | L | Feature | Sprint 3+ |

---

---

## 11. Diagnóstico `/login` — `(public)/login/page.tsx` (2026-07-01)

> Análisis del componente login (1926 líneas). Cubre: login, registro 4-pasos, reset password, demo/trial, animación del gato, audio, parallax.

### Problemas encontrados y estado

| # | Severidad | Descripción | Estado |
|---|-----------|-------------|--------|
| L-C1 | Crítico | Monolito 1926 líneas — 30+ estados, 12+ useEffects, 6 responsabilidades | Pendiente (Sprint 3) |
| L-C2 | Crítico | Modal de registro sin `role="dialog"`, focus trap ni Escape | ✅ **Resuelto 2026-07-01** |
| L-C3 | Crítico | SVG del gato como string inline con `dangerouslySetInnerHTML` | Pendiente |
| L-C4 | Crítico | `window.confirm()` bloqueante para cerrar el registro | ✅ **Resuelto 2026-07-01** |
| L-I1 | Importante | Inputs email/contraseña del registro sin `id` ni `htmlFor` | ✅ **Resuelto 2026-07-01** |
| L-I2 | Importante | `new Audio()` creado en cada click del plato — instancias simultáneas | ✅ **Resuelto 2026-07-01** |
| L-I3 | Importante | `SHOW_TRIAL_DIALOG = false` hardcodeado + imports `TrialRpgDialogDock`/`TrialRpgDialog` muertos | ✅ **Resuelto 2026-07-01** |
| L-I4 | Importante | Login usa API route, registro usa Supabase browser directo — inconsistente | Pendiente |
| L-I5 | Importante | Social Links duplicados (columna hero + columna auth) | Pendiente |
| L-I6 | Importante | `<Parallax>` montado en árbol aunque deshabilitado en APK | Pendiente |
| L-I7 | Importante | Jerarquía CTAs: Demo App antes de "Crear cuenta" | ✅ **Resuelto 2026-07-01** |
| L-Q1 | Calidad | `bowlAudioRef` separado de `loginAudioRef` — audio plato reutiliza instancia | ✅ **Resuelto 2026-07-01** |
| L-Q2 | Calidad | Plato sin affordance de interactividad visible | ✅ **Resuelto 2026-07-01** (pulso CSS x2 al cargar) |
| L-Q3 | Calidad | Label contraseña del registro sin `htmlFor` | ✅ **Resuelto 2026-07-01** |

### Jerarquía de CTAs corregida (columna auth)

```
Antes: [Continuar] → [Demo App] → [Olvidé mi clave] [Crear cuenta]
Ahora: [Continuar] → [Olvidé mi clave] [Crear cuenta ↑bold] → [Demo App]
```

### Modal de registro — A11y implementada

```tsx
<div
  ref={registerModalRef}
  role="dialog"
  aria-modal="true"
  aria-labelledby="register-modal-title"
>
  <h2 id="register-modal-title">...</h2>
```

useEffect activo cuando `showRegister = true`:
- Foca primer elemento focusable al abrir
- Escape → `closeRegister()`
- Tab / Shift+Tab → ciclo restringido dentro del modal

### Pendientes login (próximos sprints)

- L-C1: Extraer hooks `useLoginForm`, `useRegisterFlow`, `useCatAnimation` — Sprint 3
- L-C3: Mover SVG del gato a componente `<KittypauCatSvg />` — Sprint 2
- L-I4: Unificar registro al API route igual que login — Sprint 2
- L-I5/L-I6: Eliminar Social Links duplicados, lazy load Parallax en APK — Sprint 2

---

## 10. Ver también

- [[AUDITORIA_2026_06_29]] — auditoría técnica de código vs docs
- [[04_Frontend/README_Frontend]] — estructura de componentes
- [[20_Testing/README_Testing]] — bugs QA documentados (QA-01 a QA-05)
- [[01_Proyecto/ESTADO_ACTUAL]] — estado general del proyecto
