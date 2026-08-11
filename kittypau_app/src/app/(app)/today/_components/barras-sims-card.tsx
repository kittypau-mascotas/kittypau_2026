"use client";

import Image from "next/image";
import {
  getBatteryStateLabel,
  getOperationalLabel,
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
  trackClass: string;
  fillClass: string;
  fillStyle?: { backgroundColor: string };
  labelClass: string;
  badgeClass: string;
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
    <div className="w-full rounded-[18px] border border-white/80 bg-white/80 p-3 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Barras Sims
        </p>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
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
            trackClass,
            fillClass,
            fillStyle,
            labelClass,
            badgeClass,
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
              <div className="relative flex h-36 w-10 items-end rounded-[999px] border border-slate-100 p-1 shadow-inner shadow-white/50">
                <div
                  className={`w-full rounded-[999px] transition-[height] duration-500 ease-out ${fillClass}`}
                  style={{
                    height: `${Math.round((filledBlocks / WELLNESS_BLOCKS) * 100)}%`,
                    ...fillStyle,
                  }}
                />
              </div>
              <div className="flex flex-col items-center gap-0.5 text-center">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                >
                  {statusLabel}
                </span>
                <p className={`text-[11px] font-semibold ${labelClass}`}>
                  {title} · {valueLabel}
                </p>
                <p className="text-[10px] leading-tight text-slate-400">
                  {noteLabel}
                </p>
              </div>
            </div>
          ),
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-400">
        <span>{getOperationalLabel(powerState)}</span>
        <span>{battery.text}</span>
      </div>
    </div>
  );
}
