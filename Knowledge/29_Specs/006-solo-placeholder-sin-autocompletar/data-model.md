# Data Model: Solo Placeholder, Nunca Autocompletar en Login/Registro

Sin entidades, columnas ni tablas — es comportamiento de UI en formularios
ya existentes. Se elimina un módulo de estado del lado del cliente que
spec 004 había introducido (`known-emails.ts`, localStorage) por quedar sin
uso tras este cambio.

## Estado nuevo (client-side, por campo)

| Estado | Ámbito | Descripción |
|---|---|---|
| `isFieldLocked` (uno por campo de email/contraseña) | Componente `LoginPage`, local a cada input | `true` al montar (campo `readOnly`), pasa a `false` en el primer foco/click de ese campo — de ahí en más el campo queda editable con normalidad. |

## Estado eliminado

| Estado/módulo | Motivo |
|---|---|
| `knownEmails` (`page.tsx`) + `src/lib/utils/known-emails.ts` + su test | Spec 006 pide cero sugerencias, ni siquiera las propias de spec 004 — sin consumidor, queda como código muerto generado por este mismo cambio (se elimina, no se deja huérfano). |

## Sin cambios de schema

No aplica — feature 100% client-side.
