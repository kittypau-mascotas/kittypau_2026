---
id: pendientes_por_pc
title: Pendientes por PC — Javier / Mauro
type: knowledge
status: active
owner: Mauro
created: 2026-08-14
updated: 2026-08-14
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
| 1 | `SPEC_01 E2` — insertar la fila en `admin_roles` para `javier.dayne@gmail.com` (fix ya identificado, migración lista) | [[29_Specs/SPEC_01_Errores_Prioritarios]] | Decisión — escribe en DB de producción |
| 2 | `SPEC_01 E8` — decidir `ALTER TABLE` vs `DROP`+recrear `device_bowl_sessions` (schema roto, 0 filas, bajo impacto) | [[29_Specs/SPEC_01_Errores_Prioritarios]] | Decisión + ejecución |
| 3 | `SPEC_12` — crear la cuenta Supabase nueva (regla: NO la misma cuenta que el proyecto principal) y recrear `pet_sessions`/`pet_daily_summary` | [[29_Specs/SPEC_12_Recrear_Analytics_DB]] | Decisión — implica costo/cuenta nueva |
| 4 | `SPEC_10` — reemplazar el input de texto libre por un `<select>` de dispositivos reales al vincular | [[29_Specs/SPEC_10_Vinculacion_Dispositivo_Lista_Real]] | Código puro en `kittypau_app` |
| 5 | `SPEC_11` — sección de resumen de consumo en `/today` | [[29_Specs/SPEC_11_Resumen_Consumo_Today]] | 🔴 Bloqueado por #3 (`SPEC_12`) |

---

## ✅ Completado recientemente (no borrar de una — dejar 1-2 semanas de historial visible)

| Fecha | Qué | Quién | Spec |
|---|---|---|---|
| 2026-08-14 | `SPEC_09 §1.1` — override de `device_type` deployado y verificado en el bridge de producción (backup, syntax check, restart, confirmado 2 veces contra Supabase) | PC de Javier, autorizado por Javier | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] |
| 2026-08-14 | SSH por key configurado y funcional en ambas PCs a la Raspberry del bridge | Javier + Mauro | [[29_Specs/SPEC_09_Fix_Bridge_Firmware_DeviceType]] §-1 |
| 2026-08-14 | Identidad de las 2 PCs confirmada en `00_HOME.md` (git identity, ruta, redes conocidas) | Javier + Mauro | [[00_HOME]] |
| 2026-08-14 | `.mcp.json` — patrón placeholder + `skip-worktree` para `MEMORY_FILE_PATH` (regla 9) | Javier + Mauro | [[19_DevOps/README_DevOps]] |

---

## Ver también

- [[19_DevOps/README_DevOps]] § "Trabajo en 2 PCs" — protocolo completo, prompt de sincronización
- [[00_HOME]] § "Entorno de trabajo — 2 PCs" — identidad de cada máquina, redes conocidas
- [[29_Specs/README_Specs]] — backlog vivo completo, detalle técnico de cada spec
