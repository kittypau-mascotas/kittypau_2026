# Quickstart: Validar la calibración por tara del plato

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

## Escenario 3 — Alternativa manual (User Story 3)

1. Repetir el paso 1-2 de arriba, pero elegir explícitamente no hacer la
   prueba automática (o agotar los reintentos del Escenario 2).
2. **Esperado**: aparece la opción de ingresar el peso del plato a mano,
   igual que el comportamiento previo a este feature — el registro se
   completa sin tara.
3. Confirmar en `/today` o `/bowl` que el contenido se calcula restando ese
   valor manual del peso bruto (comportamiento ya existente, sin cambios).

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
