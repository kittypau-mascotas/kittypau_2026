"use client";

/**
 * "Cuánto come por semana/mes" en vivo -- Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md
 * §2.3. Antes bloqueado por el costo de una ventana larga de `readings`; Mauro confirmó
 * 2026-09-09 que vale el costo -- ver `/api/pets/:id/consumo-periodo`.
 *
 * Va debajo de `ConsumoKpisCard` en /today, sección propia (mismo criterio: fuera de
 * Barras Sims). "Semana"/"mes" = últimos 7/30 días rodantes, no semana/mes calendario --
 * mismo criterio que ya documentaba SPEC_11 §2.1 para el diseño original.
 */

type ConsumoPeriodo = {
  gramos: number;
  comidas: number;
  diasConDatos: number;
  diasTotales: number;
};
type ConsumoPeriodoResponse =
  | { status: "sin_dispositivo" }
  | {
      status: "ok";
      semana: ConsumoPeriodo;
      mes: ConsumoPeriodo;
      ventanaDias: number;
      truncated: boolean;
    };

function Tile({ label, periodo }: { label: string; periodo: ConsumoPeriodo }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700/80">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-800">
        {periodo.gramos} g
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
        {periodo.comidas} comidas confirmadas · {periodo.diasConDatos} de{" "}
        {periodo.diasTotales} días con dato
      </p>
    </div>
  );
}

export default function ConsumoPeriodoCard({
  data,
}: {
  data: ConsumoPeriodoResponse | null;
}) {
  if (!data || data.status !== "ok") return null;

  return (
    <section className="rounded-[calc(var(--radius)-8px)] border border-emerald-100 bg-white p-4 shadow-[0_10px_28px_-22px_rgba(16,185,129,0.5)]">
      <h3 className="text-sm font-semibold text-slate-800">
        Consumo por período
      </h3>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Últimos 7 y 30 días — suma de las comidas reales confirmadas en cada
        ventana.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile label="Última semana" periodo={data.semana} />
        <Tile label="Último mes" periodo={data.mes} />
      </div>
      {data.truncated ? (
        <p className="mt-2 text-[11px] text-amber-700">
          Este comedero reporta tan seguido que el mes puede quedar incompleto —
          el número de arriba es un piso, no el total exacto.
        </p>
      ) : null}
    </section>
  );
}
