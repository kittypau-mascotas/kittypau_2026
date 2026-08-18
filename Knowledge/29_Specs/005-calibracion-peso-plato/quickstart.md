# Quickstart: Validar la calibración por tara del plato

## ✅ Flujo ideal — confirmado end-to-end con hardware real (2026-08-18)

Validado contra producción (`kittypau-app.vercel.app`), cuenta `frentecalamari2@gmail.com`,
dispositivo físico **KPCL0036** real. Este es el flujo de referencia — **cualquier cambio
futuro al paso 3 del registro debe seguir confirmando estos mismos pasos, en este orden**:

1. Registro paso 1 (Usuario) → paso 2 (Mascota) → paso 3 (Dispositivo): elegir la mascota
   y el dispositivo de la lista (`DevicePicker`, solo dispositivos con `owner_id IS NULL`),
   elegir tipo (comida/agua).
2. "Vincular mi dispositivo" → reclama el dispositivo (`POST /api/devices`), chequea
   FR-009 (sin lecturas previas) y conectividad (`last_seen` reciente) → pasa a la
   tarjeta "Calibrar el peso de tu plato".
3. "Ya coloqué el plato" → dispara `SET_INTERVAL 1000ms` + `CALIBRATE_WEIGHT tare` →
   estado "Pesando plato......" → "Confirmando resultado...".
4. Confirmación real: **~1 segundo** desde el comando de tara hasta que "Peso en vivo"
   muestra el valor confirmado (bien dentro de los 15s de margen) — verificado con datos
   reales de Supabase, no simulado.
5. "Continuar" → pantalla de cierre animada (triángulo Kittypau/usuario/mascota) →
   "Cerrar" → navega a `/today` de la cuenta recién vinculada.

**No existe alternativa manual** (eliminada 2026-08-18, ver spec.md Assumptions) — si la
tara falla, el único camino es "Repetir prueba".

---

## Prerrequisitos

- `kittypau_app/` corriendo local (`npm run dev`), con el bridge y un
  dispositivo Kittypau real encendido y conectado a WiFi (no es simulable
  sin hardware — este feature depende del firmware real).
- Una cuenta nueva sin dispositivos vinculados todavía.
- Un plato vacío y, para verificar precisión (SC-002), idealmente un objeto
  de peso conocido para probar después de la calibración.

## Escenario 1 — Tara exitosa (User Story 1)

1. Registrar la cuenta, llegar al paso 3 (Dispositivo), elegir el
   dispositivo real y el tipo (comida o agua).
2. Vincular el dispositivo (sub-paso "Vincular" — ver `research.md`).
3. **Esperado**: inmediatamente después aparece la secuencia guiada de
   calibración, empezando por confirmar la conexión.
4. Seguir las instrucciones: confirmar conexión → colocar el plato vacío →
   confirmar → esperar la tara y su verificación.
5. **Esperado**: en menos de 15 segundos (SC-001), el sistema confirma que
   el dispositivo quedó en cero con el plato puesto.
6. Colocar sobre el plato un objeto de peso conocido y verificar en
   `/bowl` o `/today` que el peso mostrado coincide con ese objeto (no
   incluye el peso del plato) — valida SC-002 indirectamente.

## Escenario 2 — Repetir tras un fallo (User Story 2)

1. Repetir el paso 1-3 de arriba.
2. Al pedir colocar el plato, moverlo o retirarlo antes de que termine la
   verificación (o apagar el WiFi del dispositivo un momento).
3. **Esperado**: el sistema indica que la confirmación no fue válida y
   ofrece repetir la secuencia completa desde "colocar el plato" — no dice
   "listo" sobre un resultado dudoso.
4. Repetir correctamente y confirmar que sí termina en éxito.

## ~~Escenario 3 — Alternativa manual~~ (ELIMINADO 2026-08-18)

Ya no existe — ver spec.md Assumptions. Si la tara falla, el único camino es "Repetir
prueba" (Escenario 2).

## Escenario 4 — No se dispara sobre un dispositivo ya en uso

1. Con un dispositivo ya vinculado y con lecturas históricas (ej. uno usado
   en sesiones anteriores), confirmar que en ningún lugar de la app aparece
   la secuencia guiada de este feature para ese dispositivo — el botón
   "Tarar" que ya existe en `/bowl` sigue ahí sin cambios (fuera de alcance),
   pero la secuencia guiada nueva no.

## Validación automatizada

```bash
cd kittypau_app
npx tsc --noEmit
npx eslint <archivos tocados>
npm run test -- <archivo de test de la función de umbral de confirmación>
```

Sin test end-to-end contra hardware real (ver `research.md` § Testing) — los
4 escenarios de arriba, contra un dispositivo Kittypau físico, son la
validación real de este feature.
