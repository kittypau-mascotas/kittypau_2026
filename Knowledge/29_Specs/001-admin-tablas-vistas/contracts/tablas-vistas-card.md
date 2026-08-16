# Contrato: `TablasVistasCard`

Contrato de props entre `admin/page.tsx` (dueño del estado compartido) y el componente
nuevo `admin/_components/tablas-vistas-card.tsx` — mismo formato de contrato que ya aplican
los 3 componentes hermanos (props ya calculadas, sin fetch propio).

## Props

```ts
type TablasVistasCardProps = {
  infraExpanded: boolean;
  dbObjectStats: DbObjectStat[]; // ver data-model.md — tipo ya existente, no se re-declara
};
```

## Comportamiento esperado

- `infraExpanded === false` → renderiza el mensaje corto ("Infraestructura colapsada.
  Actívala desde el header para ver telemetría técnica completa."), igual que hoy.
- `infraExpanded === true` y `dbObjectStats.length === 0` → renderiza la tabla vacía con el
  mensaje "Sin datos de tamaño de tablas/vistas." en una fila `colSpan={6}`, igual que hoy.
- `infraExpanded === true` y `dbObjectStats.length > 0` → renderiza una fila por objeto,
  con las 6 columnas (Objeto, Tipo, Descripción, Rows est., Size est., Última actualización)
  exactamente como están hoy, incluyendo las clases `hidden lg:table-cell` /
  `hidden md:table-cell` responsivas ya existentes.

## No incluido en este contrato

- No expone ningún callback/`onChange` — es un componente puramente de lectura, igual que
  `infraestructura-card.tsx`.
- No recibe ni gestiona su propio estado de loading/error — eso lo sigue manejando
  `page.tsx` a nivel del fetch compartido, sin cambios.
