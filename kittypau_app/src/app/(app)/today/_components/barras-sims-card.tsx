"use client";

import Image from "next/image";
import { MEDIANA_GRAMOS_COMIDA } from "@/lib/hunger-bar";
import {
  getBatteryStateLabel,
  getOperationalLabel,
  mealSizeInfo,
} from "../_lib/today-format";

const WELLNESS_BLOCKS = 20;

type BarKind = {
  key: string;
  title: string;
  iconSrc: string;
  filledBlocks: number;
  valueLabel: string;
  statusLabel: string;
  noteLabel: string;
  // Segundo cuadro aparte (pedido de Mauro 2026-09-09) -- "próxima comida
  // estimada" separado de "última comida" en vez de un solo cuadro con \n.
  // Agua no lo usa (queda undefined, ese cuadro no se renderiza).
  noteLabelSecondary?: string | null;
  trackClass: string;
  fillClass: string;
  fillStyle?: { backgroundColor: string };
  labelClass: string;
  badgeClass: string;
  // Gramos de la última comida CONFIRMADA -- pedido de Mauro 2026-09-09:
  // que la barra "¿comió más o menos que lo habitual?" (ya vive en
  // BowlWellnessCard) también aparezca acá. Solo se pasa para la barra de
  // Comida (Agua no tiene mediana calibrada, queda sin esto a propósito).
  mealSizeGramos?: number | null;
};

/**
 * Widget "Barras Sims" del hero de /today — hoy son 2 barras (Comida/Agua).
 *
 * ⚠️ Este widget es sensible: Mauro ya pidió revertir 3 veces (ver
 * Knowledge/29_Specs/SPEC_04_Metricas_Today_Investigacion.md) cualquier intento de
 * agregarle cards nuevas. Proponer antes de expandirlo, no asumir que hace falta más.
 *
 * Piel "RPG bar" (pedido de Mauro 2026-09-14): mismo dato, mismo cálculo,
 * mismos props -- las barras pasan de columnas líquidas verticales (estilo
 * The Sims, dos al lado de la otra) a barras horizontales apiladas, una por
 * fila, como una barra de vida/maná de RPG. Nombre "Barras Sims" se
 * mantiene igual aunque el layout ya no sea el de Sims -- es el nombre que
 * Mauro le puso al widget, no una descripción del layout.
 */
export default function BarrasSimsCard({
  deviceId,
  bars,
  powerState,
  batteryState,
  batteryLevel,
}: {
  deviceId: string | null | undefined;
  bars: [BarKind, BarKind];
  powerState: "on" | "off" | "nodata";
  batteryState: string | null | undefined;
  batteryLevel: number | null | undefined;
}) {
  const battery = getBatteryStateLabel(batteryState, batteryLevel);

  return (
    <div className="w-full rounded-[18px] border border-white/80 bg-white/80 p-3.5 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Barras Sims
        </p>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {deviceId ?? "KPCLXXXX"}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {bars.map(
          ({
            key,
            title,
            iconSrc,
            filledBlocks,
            valueLabel,
            statusLabel,
            noteLabel,
            noteLabelSecondary,
            trackClass,
            fillClass,
            fillStyle,
            labelClass,
            badgeClass,
            mealSizeGramos,
          }) => (
            <div
              key={key}
              className={`rounded-[14px] border bg-white px-3 py-2.5 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.3)] ${trackClass}`}
            >
              {/* Fila de encabezado: ícono + nombre a la izquierda, %+badge
                  a la derecha -- mismo orden que una barra de HP de RPG. */}
              <div className="flex items-center gap-2">
                <Image
                  src={iconSrc}
                  alt=""
                  aria-hidden={true}
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px] shrink-0 object-contain"
                />
                <p className={`text-[13px] font-semibold ${labelClass}`}>
                  {title}
                </p>
                <span
                  className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              {/* Barra horizontal -- mismo cálculo de llenado que antes
                  (filledBlocks/WELLNESS_BLOCKS), solo que ahora el fill
                  crece de izquierda a derecha en vez de subir. */}
              <div className="mt-1.5 h-3.5 w-full overflow-hidden rounded-full border border-slate-100 bg-slate-50">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${fillClass}`}
                  style={{
                    width: `${Math.round((filledBlocks / WELLNESS_BLOCKS) * 100)}%`,
                    ...fillStyle,
                  }}
                />
              </div>
              <p className="mt-1 text-right text-[11px] font-semibold text-slate-500">
                {valueLabel}
              </p>

              <div className="mt-1 flex flex-col gap-1">
                <p className="whitespace-pre-line text-[11px] leading-snug text-slate-500">
                  {noteLabel}
                </p>
                {mealSizeGramos != null
                  ? (() => {
                      const info = mealSizeInfo(mealSizeGramos);
                      const escalaMax = MEDIANA_GRAMOS_COMIDA * 2;
                      const pct = Math.min(
                        100,
                        Math.round((mealSizeGramos / escalaMax) * 100),
                      );
                      return (
                        <div>
                          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${info.barClass}`}
                              style={{ width: `${pct}%` }}
                            />
                            <div
                              className="absolute inset-y-0 left-1/2 w-px bg-slate-400/70"
                              aria-hidden="true"
                            />
                          </div>
                          <p
                            className={`mt-1 text-[11px] font-medium leading-snug ${info.textClass}`}
                          >
                            {info.label} — {mealSizeGramos} g (habitual:{" "}
                            {MEDIANA_GRAMOS_COMIDA} g)
                          </p>
                        </div>
                      );
                    })()
                  : null}
                {noteLabelSecondary ? (
                  <p className="whitespace-pre-line text-[11px] leading-snug text-slate-500">
                    {noteLabelSecondary}
                  </p>
                ) : null}
              </div>
            </div>
          ),
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-400">
        <span>{getOperationalLabel(powerState)}</span>
        <span>{battery.text}</span>
      </div>
    </div>
  );
}
