# Quickstart — Validación de la Demo /today en vivo

Guía de verificación end-to-end. No incluye código de implementación (eso va en `tasks.md` /
`/speckit-implement`). Cada sección mapea a Success Criteria del [spec](./spec.md).

## Prerrequisitos

- `kittypau_app/` con `npm install` hecho.
- `.env.local` con: MQTT readonly (`NEXT_PUBLIC_MQTT_*_READONLY`), Supabase
  (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`), y **nuevas**:
  `DEMO_FOOD_DEVICE_CODE=KPCL0034`, `DEMO_WATER_DEVICE_CODE=KPCL0035` (agregar a `.env.example`).
- Acceso a la cuenta tester `kittypau.mascotas@gmail.com` (para la comparación lado a lado de SC-002).
- KPCL0034 con datos recientes en `readings` (device de demo).
- **Migración `demo_ingresos_sin_email`**: aplicada en Supabase **solo si Mauro dio OK** (Principio
  III). Si no, validar §4 con el fallback (lead solo con email).

```bash
cd kittypau_app
npm run dev            # http://localhost:3000
```

---

## 1. Entrada a la demo desde el login (SC-001, FR-001/002/002a)

1. Abrir `http://localhost:3000/login` en una ventana limpia (sin `localStorage`).
2. Verificar que **no aparece el gato animado / easter egg** en ningún momento (FR-018).
3. Tocar **"Demo App / No necesitas registrarte"** → abre el modal **"Personaliza tu demo"**.
4. El modal pide: tipo (Perro/Gato, con uno preseleccionado), **nombre del dueño**, **nombre de la
   mascota**, botones **Cancelar** / **Entrar a prueba**. **No** pide email.
5. Dejar el nombre de la mascota vacío → **"Entrar a prueba" deshabilitado** y se indica qué falta
   (FR-002a).
6. Completar dueño = `Marta`, mascota = `Pelusa`, tipo = `Gato` → **Entrar a prueba**.
7. **Cronometrar**: desde el login hasta ver la vista con "Pelusa" en pantalla debe ser **< 30 s**
   (SC-001).
8. **Cancelar** (probar aparte): vuelve al login y **no** deja nada en `/admin/demo-ingresos`.

**Esperado**: redirige a `/demo`, se ve la pantalla `/today` con el avatar-gif de gato
(`/illustrations/giphy.gif`), "Pelusa" como mascota y "Marta" como dueño.

---

## 2. Espejo exacto de `/today` con datos en vivo (SC-002, FR-003/004/005/006)

**Comparación lado a lado**, en el mismo minuto:

| Ventana A | Ventana B |
|---|---|
| `/demo` con identidad "Pelusa" / "Marta" | `/today` logueado como `kittypau.mascotas@gmail.com` (Bandida) |

Verificar que coinciden **al 100%** (SC-002):

- [ ] Barra de hambre — **porcentaje** idéntico.
- [ ] **"Próxima comida estimada"** — misma fecha/hora.
- [ ] Barras Sims → Comida: **"comió más/menos que lo habitual"** — mismo texto, misma barra, mismos
      gramos.
- [ ] Barras Sims → cuadros "Última comida" / "Próxima comida estimada" — mismo contenido.
- [ ] Cards **Alimentación** e **Hidratación** (`#today-bowls`) — mismos %, mismas ilustraciones,
      misma "Última lectura", misma batería/conectividad.
- [ ] **Gráfico día/noche** — misma forma, mismos eventos marcados.
- [ ] **KPIs de consumo** — mismos valores.
- [ ] **"Consumo por período"** semana / mes — mismos gramos, mismas "X de Y días con dato".
- [ ] **Códigos de dispositivo** `KPCL0034` / `KPCL0035` visibles en ambas (FR-006).
- [ ] **Hidratación** muestra "Sin modelo de detección todavía" en ambas (FR-004, no se inventa nada).

**Refresco en vivo (FR-007, US1 esc. 3)**: dejar `/demo` abierta ~5 min o forzar recarga tras un
evento nuevo de Bandida → la demo refleja el evento igual que `/today`.

---

## 3. La identidad real de Bandida nunca aparece (SC-003, FR-005)

En `/demo`, recorrer toda la vista (scroll completo, abrir todo lo desplegable) y confirmar que en
**ningún** texto, imagen, `alt`, tooltip o etiqueta aparece:

- [ ] la palabra **"Bandida"**
- [ ] el **nombre real del dueño** de la cuenta tester
- [ ] la **foto real** de la mascota (`primaryPet.photo_url`) — debe verse el gif por tipo

Además, en DevTools → Network, inspeccionar la respuesta de **`GET /api/demo/today`** (SC-005):

- [ ] `devices` tiene solo `KPCL0034` y `KPCL0035`.
- [ ] el JSON **no** contiene el uuid interno de los devices, `pet_id`, `pet_name`, `user_id`, ni
      datos de `profiles`.
- [ ] no hay forma de pedir otro device (el endpoint no toma params).
- [ ] pegar 40+ requests rápidos → `429` con `Retry-After` (FR-012).

---

## 4. Registro del lead (SC-007, FR-011, US3)

**Con migración aplicada:**
1. Entrar a la demo con una identidad nueva (dueño `Marta`, mascota `Pelusa`, tipo `gato`), sin email.
2. `/admin/demo-ingresos` → hay **una** fila con `owner_name=Marta`, `pet_name=Pelusa`,
   `pet_type=gato`, `email` vacío, marca de tiempo.
3. Volver a entrar desde el mismo navegador otro rato → **no** hay fila nueva; `count`/"último
   visto" del lead existente se actualizó.
4. Desde la demo, usar el CTA **"Crear cuenta"** y dejar un email → el flujo de registro llega con
   `Pelusa` / `Marta` / `gato` precargados (FR-009, US2 esc. 1); el lead ahora tiene email.

**Sin migración (fallback):** el lead sin email no aparece; solo se registra al dejar el email en
"Crear cuenta". Anotado en `PENDIENTES_POR_PC.md`.

---

## 5. La demo no drifta de `/today` (SC-008, FR-016) — prueba de humo del reuso

1. Hacer un cambio **temporal y visible** en `/today`: p.ej. cambiar un texto de una card en
   `today/_components/consumo-kpis-card.tsx`, o reordenar dos cards en `today-screen.tsx`.
2. Recargar **`/demo`** (sin tocar ningún archivo de demo).
3. **Esperado**: el cambio aparece igual en `/demo`.
4. Revertir el cambio temporal.

Si el cambio **no** aparece en `/demo` sin edición extra → el reuso está roto (hay un fork), no
cumple FR-016.

---

## 6. `/today` autenticado sin regresión (SC-006, FR-013)

Con la feature aplicada, logueado como tester:

- [ ] `/today` se ve y se comporta **exactamente igual** que antes (hero, Barras Sims, bowls,
      gráfico, KPIs, consumo por período, guía de onboarding, botón cerrar sesión,
      `QaTestMealNotification`, `DiagnosticoRapidoCard` para cuenta client).
- [ ] El widget **"Barras Sims"** no cambió (mismo layout, sin cards nuevas —
      `feedback_barras_sims_protegido`).
- [ ] Poll de hunger-bar cada 5 min y MQTT en vivo siguen funcionando.
- [ ] `git diff` de `today/page.tsx` = solo el wrapper de 3 líneas; la lógica movida a
      `today-screen.tsx` es 1:1 (revisar el diff de la extracción con cuidado).

---

## 7. Chatbot-gato eliminado (SC-009, FR-018)

```bash
cd kittypau_app
grep -rn "chatbot-gato\|TrialRpg\|trial-rpg\|fetchChatbotGatoResponse\|DEMO_SCREEN_CONTEXT\|LOGIN_CHATBOT_CONTEXT\|buildChatbotRuntime" src
# → 0 resultados

test -d src/chatbot-gato && echo "FALLA: carpeta sigue" || echo "OK: carpeta borrada"
test -f src/app/api/chatbot-gato/route.ts && echo "FALLA: endpoint sigue" || echo "OK: endpoint borrado"

npx tsc --noEmit && npx eslint src && npm run build
# → todo limpio
```

- [ ] `grep` = 0 resultados (SC-009).
- [ ] `src/chatbot-gato/` no existe; `src/app/api/chatbot-gato/` no existe.
- [ ] `globals.css` sin `.trial-rpg-*` ni `.login-trial-dialog-scene`; **sí** conserva
      `.login-trial-overlay/-modal/-input/-submit/-cancel` (modal "Personaliza tu demo").
- [ ] `tsc` / `eslint` / `build` limpios.
- [ ] `/login`: login normal, abrir registro, y botón "Demo App" → **todo funciona igual, sin el
      gato** (FR-018, US4 esc. 2).

---

## 8. Rutas alias (FR-019)

- [ ] `http://localhost:3000/client-demo` → redirige a `/demo` (no renderiza la demo vieja).
- [ ] `http://localhost:3000/test` → redirige a `/demo`.
- [ ] `http://localhost:3000/demo?menu=story` → ignora el `?menu`, muestra la única vista (FR-015).

---

## 9. Degradado (SC-004, FR-008)

Simular datos no disponibles (p.ej. `DEMO_FOOD_DEVICE_CODE` a un código inexistente y reiniciar dev):

- [ ] `/demo` muestra estados neutros legibles ("sin registro", "sin dispositivo", gris) — **no**
      error técnico ni pantalla en blanco.
- [ ] La identidad del visitante ("Pelusa" / "Marta") sigue visible.
- [ ] El **CTA "Crear cuenta"** sigue visible.

---

## Checklist de release (antes de `git push`)

- [ ] `tsc` + `eslint` + `vitest` + `next build` limpios.
- [ ] `route.test.ts` para `/api/demo/today` (contrato: shape + invariantes de no-exposición).
- [ ] Secciones 1–9 de esta guía ✅.
- [ ] `Knowledge/04_Frontend/ESTRUCTURA_src_app.md` actualizado (la `/demo` cambió de concepto; se
      fue el chatbot-gato).
- [ ] `Knowledge/19_DevOps/PENDIENTES_POR_PC.md` actualizado (mover a "Completado"; anotar el
      checkpoint de la migración si quedó pendiente).
- [ ] Protocolo de 2 PCs de `Knowledge/19_DevOps/README_DevOps.md` seguido (Principio VIII).
- [ ] Migración `demo_ingresos_sin_email`: aplicada **solo** con OK explícito de Mauro, o anotada
      como pendiente con el fallback activo (Principio III).
