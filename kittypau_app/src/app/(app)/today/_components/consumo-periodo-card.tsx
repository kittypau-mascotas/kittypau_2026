"use client";

import styles from "./today-hud.module.css";

/**
 * "Cuánto come por semana/mes" en vivo -- Knowledge/29_Specs/SPEC_11_Resumen_Consumo_Today.md
 * §2.3. Antes bloqueado por el costo de una ventana larga de `readings`; Mauro confirmó
 * 2026-09-09 que vale el costo -- ver `/api/pets/:id/consumo-periodo`.
 *
 * Va debajo de `ConsumoKpisCard` en /today, mismo `.frame` -- ambas comparten un solo
 * contenedor visual (spec HUD 2026-09-11, principio "un solo momento de movimiento" +
 * "marcos en vez de tarjetas genéricas": 2 cards blancas idénticas apiladas se leían
 * como bloques repetidos sin relación). "Semana"/"mes" = últimos 7/30 días rodantes,
 * no semana/mes calendario -- mismo criterio que ya documentaba SPEC_11 §2.1.
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
    <div className={styles.periodCard}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{periodo.gramos} g</span>
      <span className={styles.sub}>
        {periodo.comidas} comidas confirmadas · {periodo.diasConDatos} de{" "}
        {periodo.diasTotales} días con dato
      </span>
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
    <div>
      <div className={styles.periodRow}>
        <Tile label="Última semana" periodo={data.semana} />
        <Tile label="Último mes" periodo={data.mes} />
      </div>
      {data.truncated ? (
        <p className={styles.periodWarn}>
          Este comedero reporta tan seguido que el mes puede quedar incompleto
          -- el número de arriba es un piso, no el total exacto.
        </p>
      ) : null}
    </div>
  );
}
