---
id: pendientes_por_pc
title: Pendientes por PC — Javier / Mauro
type: knowledge
status: active
owner: Mauro
created: 2026-08-14
updated: 2026-08-15
tags:
  - devops
  - colaboracion
  - tracker
  - javier
  - mauro
related:
  - [[00_HOME]]
  - [[19_DevOps/README_DevOps]]
  - [[29_Specs/README_Specs]]
  - [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]]
---

# Pendientes por PC — Javier / Mauro

> **Archivo vivo, no histórico.** Se actualiza en cada sesión de Claude Code que hace
> `pull`/`push` — mover un ítem a "✅ Completado" cuando se cierra, agregar uno nuevo cuando
> aparece, nunca dejar que quede desactualizado respecto al estado real de
> `Knowledge/29_Specs/`. Este archivo es el resumen ejecutivo de "quién hace qué"; el detalle
> técnico de cada ítem vive en su spec — acá solo el estado y el link.
>
> **Protocolo de actualización** (parte de [[19_DevOps/README_DevOps]] § "Trabajo en 2
> PCs"): al arrancar sesión, después del `pull`, leer este archivo antes que nada — te dice
> qué te toca a vos específicamente, sin tener que releer los 12 specs enteros. Al terminar,
> antes del `push`, actualizarlo: tachar lo que se hizo, sumar lo que se descubrió.

---

## 💻 Pendientes en la PC de Javier

Ejecutable con la red/acceso que tiene la PC de Javier (misma subred que la Raspberry del
bridge, `192.168.100.x`) — no requiere estar en la red de Mauro.

| # | Tarea | Spec | Esfuerzo |
|---|---|---|---|
| 1 | `SPEC_09 §3.1` — quitar `rejectUnauthorized: false` de la conexión TLS del bridge a HiveMQ, confirmar que sigue conectando | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] | S |
| 2 | `SPEC_09 §4` — persistir `deviceState`/`petBaseline` del bridge a disco (se pierden en cada restart) | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] | M |
| 3 | `SPEC_09 §5` — decidir sobre `DEVICE_TYPE_MAP` (código muerto en `bridge/src/index.js`) ahora que ya existe `DEVICE_TYPE_MANUAL_OVERRIDE` — usarlo de verdad o borrarlo | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] | XS |
| 4 | Evaluar convertir `/home/kittypau/kittypau-bridge` en un clone real de git (hoy es deploy manual por `.bak`) | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §-1 | M |
| 5 | Bug nuevo (encontrado 2026-08-14 al verificar el fix de `device_type`): el bridge falla al insertar en `sensor_readings` — `Could not find the 'battery_level' column of 'sensor_readings' in the schema cache`. No bloquea `readings` (la tabla que sí importa), pero es ruido constante en los logs. Sin documentar en ningún spec todavía — evaluar si `sensor_readings` necesita la columna o si directamente hay que sacarle esa escritura al bridge | *(sin spec — anotar en SPEC_05 o crear uno nuevo si se decide encarar)* | S |

---

## 🏠 Pendientes en la PC de Mauro

Requieren la red/ubicación física de Mauro (WiFi `VTR-2736410_2g`, donde vive KPCL0035) — no
ejecutables desde la PC de Javier.

| # | Tarea | Spec | Esfuerzo |
|---|---|---|---|
| 1 | `SPEC_09 §1.2` — reflashear firmware de KPCL0035 (guard de `DEVICE_TYPE` en `config.h` + `build_flags` en `platformio.ini` + OTA real). **Re-confirmar la IP contra `devices.wifi_ip` en Supabase el mismo día** antes de subir — ya cambió una vez. No urgente: `§1.1` (ya hecho) corrige el dato en Supabase igual, esto es la corrección de raíz definitiva | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §1.2 | M |
| 2 | `SPEC_09 §3.2` — decisión sobre las credenciales WiFi hardcodeadas en el firmware (`wifi_manager.cpp`, incluye redes personales) — mantener o mover a `build_flags`/env | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] | Decisión, no bloqueante |

---

## 🤝 Pendientes sin PC específica (cualquiera, o requieren decisión de Mauro como owner)

No dependen de red/hardware — ejecutables desde cualquiera de las 2 PCs. Los marcados
"decisión" necesitan el ok explícito de Mauro antes de tocar producción, no una capacidad
técnica particular.

| # | Tarea | Spec | Nota |
|---|---|---|---|
| 0 | 🔴 **Nuevo (2026-08-16):** `sudo systemctl restart kittypau-bridge` en la Raspberry — el fix de `owner_id` nullable ya está aplicado en la DB (✅ ver Completado), pero el bridge cachea en memoria (`knownDevices`, `Set` en `bridge/src/index.js:57`) qué devices ya conoce y no vuelve a chequear la DB para un código ya visto. KPCL0036 (renombrado a `KPCL9036` para preservar el historial de Javier) no se va a auto-registrar como fila nueva sin dueño hasta que el proceso reinicie | [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]] | Requiere red de Javier o Mauro (misma que SPEC_09 §1.1) |
| 1 | `SPEC_12` — crear la cuenta Supabase nueva (regla: NO la misma cuenta que el proyecto principal) y recrear `pet_sessions`/`pet_daily_summary` | [[29_Specs/SPEC_12_Recrear_Analytics_DB]] | Decisión — implica costo/cuenta nueva |
| 2 | `SPEC_11` — sección de resumen de consumo en `/today` | [[29_Specs/SPEC_11_Resumen_Consumo_Today]] | 🔴 Bloqueado por #1 (`SPEC_12`) |
| 3 | **Nuevo (2026-08-16):** SMTP propio para correos de Supabase Auth (Resend/SendGrid/Postmark/SES + dominio verificado) — el servicio built-in de Supabase se saturó (`email rate limit exceeded`) en pleno testing de `002-registro-flow-unificado`, y el remitente sale como "Supabase Auth", no "Kittypau" | [[05_API/SPEC_Correos_Transaccionales]] § Pendiente | Decisión — implica cuenta/dominio nuevo |

---

## ✅ Completado recientemente (no borrar de una — dejar 1-2 semanas de historial visible)

| Fecha | Qué | Quién | Spec |
|---|---|---|---|
| 2026-08-16 | `09_Investigacion/` → `Investigacion/`, `10_Postulaciones_Fondos/` → `Postulaciones_Fondos/` (sin prefijo numérico). Toolkit dashboard KPCL (9 archivos sueltos) agrupado en `Investigacion/Dashboard_KPCL/`. Corregidas 2 rutas relativas rotas desde la mudanza anterior. `.gitignore` + 14 docs de Knowledge actualizados, `py_compile`/`streamlit`/`pytest` (16/16) re-verificados | PC de Mauro, autorizado por Mauro | [[29_Specs/SPEC_13_Reorganizacion_09_Investigacion]] §9 |
| 2026-08-16 | Reorganización de `Investigacion/` centrada en `app_anotacion_av2.py`: 9 rutas obsoletas (`Docs/09_Investigacion`, `Docs/11_Data`) corregidas dentro de la propia documentación de `Ciclo_Alpha_v2/fase_0_ruido/` (nunca barridas en rondas anteriores), 1 link roto arreglado, `README.md`/`_MOC.md` reescritos para apuntar directo a la app como centro. `Ciclo Alpha`/`Ciclo Alpha v2`/`fase_0_ruido` NO se renombraron — convención de fases ya documentada, alto costo/bajo beneficio. `py_compile`/`pytest` (16/16) verificados | PC de Mauro, autorizado por Mauro | [[29_Specs/SPEC_13_Reorganizacion_09_Investigacion]] §10 |
| 2026-08-16 | Reorganización física real de `Investigacion/`: `fase_0_ruido/` separa `Documentacion/` (4 docs) y `Resultados/` (benchmark) de los scripts activos; los 8 docs sueltos de la raíz se enrutaron cada uno a donde pertenecen (3 a `Dashboard_KPCL/`, 2 a `Ciclo_Alpha_v1/`, 3 quedan en raíz por ser cross-cycle). De paso: 12 links rotos sistémicos en `README.md` (`Data Science/` → `Ciclo_Alpha_v1/`, bug preexistente) + 3 links con nombres de archivo viejos corregidos. `py_compile`/`streamlit`/`pytest` (16/16) re-verificados | PC de Mauro, autorizado por Mauro | [[29_Specs/SPEC_13_Reorganizacion_09_Investigacion]] §11 |
| 2026-08-16 | Rename completo de `Investigacion/` (Mauro anuló la reserva de costo/beneficio de §10-§11): `Ciclo Alpha` → `Ciclo_Alpha_v1`, `Ciclo Alpha v2` → `Ciclo_Alpha_v2`, `Ciclo Gamma`/`Ciclo Delta` → `Ciclo_Gamma`/`Ciclo_Delta`, `Power Bi_Supabase` → `PowerBI_Supabase`. Sweep con regex (45 archivos) corrigió solo referencias path-like, sin tocar menciones en prosa. `fase_0_ruido/` sigue sin renombrar — única excepción, por convención de fases futuras (`fase_2_segmentacion`/`fase_5_modelos`) ya documentada. 274 renames detectados por git. `py_compile`/`streamlit`/`pytest` (16/16) re-verificados | PC de Mauro, autorizado por Mauro | [[29_Specs/SPEC_13_Reorganizacion_09_Investigacion]] §12 |
| 2026-08-16 | **Todos** los 80 `.md` que vivían en subcarpetas de `Investigacion/` aplanados a la raíz (89 total, solo 8 ya estaban ahí). Única colisión real: 8 `README.md` (7 renombrados con prefijo de su carpeta padre). Sweep de referencias con script Python (profundidad calculada por archivo). 3 bugs encontrados y corregidos en el propio proceso: backtracking catastrófico en el regex (corregido), corrupción de narrativa histórica en `SPEC_07`/`SPEC_13`/2 HTML (revertidos, quedan con rutas viejas — su prosa importa más que su exactitud), corrupción de código en vivo en 2 scripts archivados de Ciclo_Delta que construían su propia ruta de salida con el mismo basename que un doc movido (los 9 `.py` tocados por el sweep se revirtieron; solo 2 comentarios de `shape_features_v2.py` se reaplicaron a mano, verificados). `py_compile`/`streamlit`/`pytest` (16/16) re-verificados | PC de Mauro, autorizado por Mauro | [[29_Specs/SPEC_13_Reorganizacion_09_Investigacion]] §13 |
| 2026-08-16 | `002-registro-flow-unificado` — cierra los 2 gaps preexistentes de la auditoría anterior + pedido nuevo de razas: `breeds` (máx. 3, quiltro/doméstico excluyente, investigadas contra el Registro Nacional de Mascotas 2025 para perro y notas veterinarias chilenas para gato) y `coat_length` (corto/largo/sin pelo) — nuevos en register flow + "Identificación básica" de `/pet`, mismos valores en los 2 lugares y en la API. `weight_kg` pasa de 0-50kg genérico a rango real por especie (perro 0.5-90kg, gato 0.5-15kg). Migración aditiva aplicada y verificada en producción. `tsc`/`eslint`/verificación en vivo (exclusividad quiltro, persistencia real) confirmados | PC de Mauro, autorizado por Mauro | [[29_Specs/002-registro-flow-unificado/spec]] |
|---|---|---|---|
| 2026-08-16 | `002-registro-flow-unificado` — cierre de la ronda "Identificación + foto + hero de /today": el bloque Sexo/Peso/Tamaño/Edad/Esterilizado/Microchip pasó a ser editable directo (antes solo-lectura) y luego se fusionó dentro de la misma tarjeta "Mascota seleccionada" (no una tarjeta aparte); se agregó subida/visualización de foto de mascota (`photo_url` — mismo hueco que `living_environment`, existía en el schema sin ningún formulario que lo llenara); en `/today` el hero pasó de `Gato · adoptado_refugio · mediano · adulto · 4 kg` truncado al lado de la foto a datos etiquetados y humanizados (`Origen: Adoptado en refugio`) en fila completa debajo de la foto, con foto agrandada (96→128px), nombre debajo y todo centrado. `tsc`/`eslint`/`next build` limpios de punta a punta | PC de Mauro, autorizado por Mauro | [[29_Specs/002-registro-flow-unificado/spec]] |
| 2026-08-16 | `002-registro-flow-unificado` — bug de coherencia reportado por Mauro con caso real (Bandida): mascotas con `pets.origin` en texto libre de antes del `<select>` curado (Bandida/Amanda="Adoptado", Benito="Casa", pasturri="adoptado", Michi QA="rescatado" — 5 en producción) quedaban en blanco en "Origen y Hábitat", ocultando el dato ya declarado. Fix: si no calza con las 6 opciones, cae a "Otro" preservando el texto original en `origen_otro`, sin descartar ni adivinar la categoría | PC de Mauro, autorizado por Mauro | [[29_Specs/002-registro-flow-unificado/spec]] |
|---|---|---|---|
| 2026-08-16 | `002-registro-flow-unificado` — auditoría "sin doble registro" (comparar cada campo del register flow contra `/pet`): Origen dejó de tener un `<input>` de texto libre en "Editar perfil" (triplicaba con el select del register flow y de Origen y Hábitat); "¿Tiene alguna condición de salud?" se sacó del register flow (duplicaba la sección Salud y su respuesta quedaba huérfana); sex/size/is_neutered/has_neuter_tattoo/has_microchip/microchip_number/birth_date/intake_date — pedidos al registrar y antes invisibles en `/pet` — ahora tienen un bloque "Identificación" editable en Editar perfil | PC de Mauro, autorizado por Mauro | [[29_Specs/002-registro-flow-unificado/spec]] |
| 2026-08-16 | `002-registro-flow-unificado` — sección nueva **Origen y Hábitat** en Ficha Detallada (arriba de Salud): Origen reusa los 6 valores del register flow (label de `nacido_en_casa` aclarado a "cría de otra mascota mía"), Estado al llegar y Tipo de vivienda nuevos (grounded en fichas de adopción reales, sin estándar oficial chileno), Convive con otras mascotas. `living_environment` (columna que ya existía sin ningún formulario que la llenara) por fin se escribe. Migración aditiva (`origin_habitat_profile`/`origin_habitat_completed_at`) aplicada y verificada en producción con confirmación explícita de Mauro. Además: quitado el bloque operativo duplicado de `/pet` (stats+nag Edad/Peso/Actividad, Platos asociados, Diagnóstico rápido, Barra de hambre, Insights — todo vive también en `/today`/`/bowl`/`/story`), y Edad/Peso sacados del nag de perfil incompleto (ya son obligatorios en el register flow) | PC de Mauro, autorizado por Mauro | [[29_Specs/002-registro-flow-unificado/spec]] |
| 2026-08-16 | `002-registro-flow-unificado` — polish post-cierre en Ficha Detallada/Alimentación: Salud (5 categorías con checklist investigado contra fuentes veterinarias chilenas, vacunas separadas por especie), Marca de alimento pasa a `<select>` agrupado por segmento y separado por especie (catálogo real, sin BD tipo AAFCO porque no existe), Cantidad diaria/Comidas al día/Horarios eliminados del formulario (Kittypau los mide con el dispositivo, no se autodeclaran), Fórmula/variedad pasa de texto libre a 2 `<select>` (Etapa de vida + Necesidad especial por especie) investigados contra 8 marcas reales | PC de Mauro, autorizado por Mauro | [[29_Specs/002-registro-flow-unificado/spec]] |
| 2026-08-16 | `002-registro-flow-unificado` — **las 8 fases completas** (35/35 tareas): registro fusiona cuenta+perfil+mascota en el paso 1 (3 pasos totales, antes 4), correo de confirmación personalizado vía Supabase Auth (probado end-to-end con `frentecalamari@gmail.com`), Registro Básico ampliado (sexo, origen, fecha, microchip), Ficha Detallada (Salud/Alimentación) en `/pet` + círculo rojo de recordatorio en el menú, columna única + radios sí/no + tamaños táctiles en todo el flujo, scroll de respaldo generalizado. Migración aditiva en `pets` aplicada y verificada en producción. `tsc`/`eslint`/`build` limpios. Adopción de spec-kit como herramienta (specs viven en `Knowledge/29_Specs/`, no en `specs/`) | PC de Mauro, autorizado por Mauro | [[29_Specs/002-registro-flow-unificado/spec]] |
| 2026-08-16 | `devices.owner_id` pasa a nullable (`alter table ... drop not null`) — cierra de raíz el bug que impedía el auto-registro de devices sin dueño. KPCL0036 (72K lecturas, mascota "pasturri" de Javier) renombrado a `KPCL9036` para preservar el historial y liberar el código; falta el restart del bridge (ver Pendiente #0) para que el auto-registro realmente cree la fila nueva | PC de Mauro, autorizado por Mauro | [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]] |
| 2026-08-15 | `SPEC_10` — vincular dispositivo por lista real: `claim_device_for_pet` (RPC nueva, UPDATE por UUID), `GET /api/devices/available`, `<DevicePicker>` compartido en los 3 lugares con el patrón (registro-flow.tsx, dispositivos/nuevo/page.tsx, y `bowl/page.tsx` — hallazgo nuevo, no estaba en el spec original) | PC de Mauro, autorizado por Mauro | [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]] |
| 2026-08-15 | `SPEC_01 E2` — `admin_roles`: `javomauro.contacto@gmail.com` (cuenta nueva) es `owner_admin` activo; `javier.dayne@gmail.com` desactivado (no borrado) a pedido de Mauro. 2 migraciones nuevas versionadas | PC de Mauro, autorizado por Mauro | [[29_Specs/SPEC_01_Errores_Prioritarios]] |
| 2026-08-15 | `SPEC_01 E8` — `device_bowl_sessions` recreada con el schema correcto (`DROP`+reaplicar migración completa, tabla tenía 0 filas); tabla de anomalías, 2 funciones y la vista que nunca se habían creado ya existen | PC de Mauro, autorizado por Mauro | [[29_Specs/SPEC_01_Errores_Prioritarios]] |
| 2026-08-15 | `/admin` batch 3/N — `tests-admin-card.tsx` extraído ("Suite de Tests Admin"), `page.tsx` 3555→3291 líneas. `tsc`/`eslint`/`build` limpios | PC de Mauro | [[29_Specs/SPEC_02_UIUX_Mejoras]] |
| 2026-08-14 | `SPEC_09 §1.1` — override de `device_type` deployado y verificado en el bridge de producción (backup, syntax check, restart, confirmado 2 veces contra Supabase) | PC de Javier, autorizado por Javier | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] |
| 2026-08-14 | SSH por key configurado y funcional en ambas PCs a la Raspberry del bridge | Javier + Mauro | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §-1 |
| 2026-08-14 | Identidad de las 2 PCs confirmada en `00_HOME.md` (git identity, ruta, redes conocidas) | Javier + Mauro | [[00_HOME]] |
| 2026-08-14 | `.mcp.json` — patrón placeholder + `skip-worktree` para `MEMORY_FILE_PATH` (regla 9) | Javier + Mauro | [[19_DevOps/README_DevOps]] |

---

## Ver también

- [[19_DevOps/README_DevOps]] § "Trabajo en 2 PCs" — protocolo completo, prompt de sincronización
- [[00_HOME]] § "Entorno de trabajo — 2 PCs" — identidad de cada máquina, redes conocidas
- [[29_Specs/README_Specs]] — backlog vivo completo, detalle técnico de cada spec
