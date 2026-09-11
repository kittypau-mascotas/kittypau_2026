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
      <div className="grid grid-cols-2 gap-3">
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
              className={`flex flex-col items-center gap-2 rounded-[16px] border bg-white px-3 py-3 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.25)] ${trackClass}`}
            >
              <div className="flex h-8 items-center justify-center">
                <Image
                  src={iconSrc}
                  alt=""
                  aria-hidden={true}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain opacity-90"
                />
              </div>
              <div className="kp-liquid-track h-36 w-10 border border-slate-100 bg-white">
                <div
                  className={`kp-liquid-fill ${fillClass}`}
                  style={{
                    height: `${Math.round((filledBlocks / WELLNESS_BLOCKS) * 100)}%`,
                    ...fillStyle,
                  }}
                />
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}
                >
                  {statusLabel}
                </span>
                <p className={`text-[12px] font-semibold ${labelClass}`}>
                  {title} · {valueLabel}
                </p>
                <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left">
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
                          <div className="mt-1.5">
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
                </div>
                {noteLabelSecondary ? (
                  <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left">
                    <p className="whitespace-pre-line text-[11px] leading-snug text-slate-500">
                      {noteLabelSecondary}
                    </p>
                  </div>
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
