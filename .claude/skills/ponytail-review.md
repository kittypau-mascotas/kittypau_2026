---
name: ponytail-review
description: >
  Revisa el diff actual buscando over-engineering. Encuentra qué eliminar:
  stdlib reinventada, dependencias innecesarias, abstracciones especulativas,
  flexibilidad muerta. Una línea por hallazgo: ubicación, qué cortar, qué lo reemplaza.
  Usa cuando el usuario dice "revisar over-engineering", "qué podemos eliminar",
  "está sobre-ingenieriado", o invoca /ponytail-review.
---

Revisar el diff actual por complejidad innecesaria. Una línea por hallazgo.

## Formato

`L<línea>: <tag> <qué>. <reemplazo>.`
O `<archivo>:L<línea>: ...` para diffs multi-archivo.

Tags:
- `delete:` código muerto, flexibilidad no usada, feature especulativa. Reemplazo: nada.
- `stdlib:` cosa hecha a mano que ya viene en la stdlib. Nombrar la función.
- `native:` dependencia o código haciendo lo que la plataforma ya hace. Nombrar la feature.
- `yagni:` abstracción con una implementación, config que nadie setea, capa con un caller.
- `shrink:` misma lógica, menos líneas. Mostrar la forma más corta.

## Scope

Solo over-engineering y complejidad. Bugs de correctitud, seguridad y performance → review normal, no este.

Terminar con: `net: -<N> líneas posibles.`
Si no hay nada que cortar: `Ya está lean. Shipear.`
