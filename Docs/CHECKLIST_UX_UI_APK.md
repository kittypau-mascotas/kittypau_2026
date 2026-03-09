# Checklist UX/UI APK (Kittypau)

## Objetivo
Estandarizar calidad visual y de interacción en la APK Android (vista nativa), con foco en legibilidad, carga percibida y consistencia entre dispositivos.

## Alcance
- Login APK
- `/today` (hero, cards, navegación)
- Navegación inferior
- Estados de carga, vacío y error

## Resoluciones objetivo (mínimas)
- 360x800
- 393x852
- 412x915

---

## 1) Primera vista Login (P0)
- [ ] Orden visual exacto: `Plato -> mensaje -> logo -> marca -> PetTech AIoT`.
- [ ] Redes sociales y card de login aparecen al hacer scroll.
- [ ] No hay elementos cortados en primera pantalla.
- [ ] No hay saltos de layout al cargar.

## 2) Jerarquía tipográfica (P0)
- [ ] Título principal visible y dominante.
- [ ] Texto secundario solo donde aporte; evitar saturación.
- [ ] Contraste AA mínimo para texto clave.

## 3) Espaciado y proporciones (P0)
- [ ] Espaciado vertical consistente entre bloques.
- [ ] Plato/hero no desplaza demasiado el login.
- [ ] Marca y subtítulo centrados y coherentes en todas las resoluciones objetivo.

## 4) Estado de carga y sonido (P0)
- [ ] Overlay de carga aparece y desaparece sin “flash”.
- [ ] Cierre de carga estable (sin quedarse pegado).
- [ ] Sonido de marca se dispara en transición de login según diseño.
- [ ] Si el audio falla (autoplay bloqueado), la carga igual finaliza correctamente.

## 5) Interacción táctil (P1)
- [ ] Botones con área táctil >= 44px.
- [ ] Estados `hover/pressed/disabled/loading` visibles.
- [ ] Navegación inferior no tapa contenido.

## 6) `/today` hero y cards (P1)
- [ ] Hero compacto en APK: alimentación/hidratación + selector visibles y legibles.
- [ ] Cards de plato con datos legibles sin saturar.
- [ ] Indicador de actualización visible y entendible.
- [ ] Estados `N/D` consistentes (mismo copy en toda la vista).

## 7) Estados vacíos y error (P1)
- [ ] Mensajes de vacío claros y accionables.
- [ ] Error de API muestra acción de recuperación (reintentar).
- [ ] No quedan paneles “muertos” sin feedback.

## 8) Rendimiento percibido (P2)
- [ ] Primera interacción fluida (< 100ms percibido en UI crítica).
- [ ] Imágenes principales sin distorsión ni jank.
- [ ] Sin CLS visible en login y `/today`.

---

## Definition of Done UX/UI APK
- [ ] Checklist P0 completo en las 3 resoluciones objetivo.
- [ ] Al menos 1 ronda de validación en dispositivo real.
- [ ] Registro de evidencias (capturas antes/después) en PR o documento de avance.
- [ ] Sin regresiones visibles en web desktop/mobile web.

## Evidencia sugerida por release
- Captura 1: primera vista login (sin scroll)
- Captura 2: login con scroll (redes + card visible)
- Captura 3: `/today` hero completo
- Captura 4: `/today` cards de alimentación/hidratación

---

## Ejecucion reciente (2026-03-09)
- Commit aplicado: `daff54f` (main).
- Deploy validado:
  - `https://kittypau-app.vercel.app`
  - `https://kittypau-88jx7gso2-kittypaus-projects.vercel.app`
- Cambios cerrados en APK (solo flavor nativo):
  - bloque de marca centrado y agrandado (`logo + Kittypau + PetTech AIoT`),
  - mantenimiento del flujo por scroll para redes sociales + card de login.
- Verificacion tecnica:
  - `npm run type-check` OK.
- Pendiente para cierre DoD completo:
  - validar visualmente en 360x800, 393x852, 412x915 con evidencia adjunta.
