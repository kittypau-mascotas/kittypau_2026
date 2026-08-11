"use client";

import Image from "next/image";
import Link from "next/link";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import {
  getBatteryStateLabel,
  getConnectivityLabel,
  getWellnessToneClasses,
  powerDotStyles,
  renderTrend,
} from "../_lib/today-format";

type WellnessState = {
  stateLabel: string;
  actionLabel: string;
  levelLabel: string;
  lastEventLabel: string;
  hasEvidence: boolean;
};

type BowlDevice = {
  device_id?: string | null;
  battery_level?: number | null;
  battery_state?: string | null;
  last_seen?: string | null;
} | null;

type BowlReading = { recorded_at?: string | null } | null;

const KIND_CONFIG = {
  food: {
    title: "Alimentación",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-100",
    dashedBorder: "border-emerald-200",
    dashedBg: "bg-emerald-50/30",
    addButtonBorder: "border-emerald-300",
    addButtonText: "text-emerald-700",
    addButtonHover: "hover:bg-emerald-50",
    emptyIllustration: "/illustrations/pink_food_full.png",
    emptyAlt: "Sin comedero",
    emptyLabel: "Sin comedero asignado",
    addLabel: "Agregar comedero",
    illustration: "/illustrations/pink_food_full.png",
    illustrationAlt: "Kittypau comedero",
    contentTitle: "Contenido actual",
    contentIconPath: "M3 6h18M3 12h18M3 18h18",
    contentChipClass: "bg-emerald-50 text-emerald-700",
    humidityChipClass: "bg-sky-50 text-sky-600",
  },
  water: {
    title: "Hidratación",
    accentText: "text-sky-700",
    accentBorder: "border-sky-100",
    dashedBorder: "border-sky-200",
    dashedBg: "bg-sky-50/30",
    addButtonBorder: "border-sky-300",
    addButtonText: "text-sky-700",
    addButtonHover: "hover:bg-sky-50",
    emptyIllustration: "/illustrations/green_water_full.png",
    emptyAlt: "Sin bebedero",
    emptyLabel: "Sin bebedero asignado",
    addLabel: "Agregar bebedero",
    illustration: "/illustrations/green_water_full.png",
    illustrationAlt: "Kittypau bebedero",
    contentTitle: "Nivel actual",
    contentIconPath: "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z",
    contentChipClass: "bg-sky-50 text-sky-700",
    humidityChipClass: "bg-violet-50 text-violet-600",
  },
} as const;

/** Card de "Alimentación"/"Hidratación" del bloque #today-bowls — un solo componente
 * parametrizado por `kind` en vez de 2 bloques JSX casi idénticos duplicados. */
export default function BowlWellnessCard({
  kind,
  hasDevice,
  device,
  latestReading,
  powerState,
  wellness,
  contentValueText,
  contentWeightGrams,
  prevContentWeightGrams,
  tempText,
  humidityText,
  formatTimestamp,
}: {
  kind: "food" | "water";
  hasDevice: boolean;
  device: BowlDevice;
  latestReading: BowlReading;
  powerState: "on" | "off" | "nodata";
  wellness: WellnessState;
  contentValueText: string;
  contentWeightGrams: number | null;
  prevContentWeightGrams: number | null;
  tempText: string;
  humidityText: string;
  formatTimestamp: (value?: string | null) => string;
}) {
  const c = KIND_CONFIG[kind];

  if (!hasDevice) {
    return (
      <article
        className={`today-bowl-card flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed ${c.dashedBorder} ${c.dashedBg} p-6`}
      >
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${c.accentText}`}
        >
          {c.title}
        </p>
        <Image
          src={c.emptyIllustration}
          alt={c.emptyAlt}
          width={96}
          height={70}
          className="h-16 w-auto object-contain opacity-40"
        />
        <p className="text-center text-sm text-slate-400">{c.emptyLabel}</p>
        <Link
          href="/bowl"
          className={`mt-1 inline-flex items-center gap-1.5 rounded-full border ${c.addButtonBorder} bg-white px-3.5 py-1.5 text-xs font-semibold ${c.addButtonText} shadow-sm transition ${c.addButtonHover}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {c.addLabel}
        </Link>
      </article>
    );
  }

  const battery = getBatteryStateLabel(
    device?.battery_state,
    device?.battery_level,
  );

  return (
    <article
      className={`today-bowl-card rounded-[var(--radius)] border ${c.accentBorder} bg-white p-4 shadow-sm transition-transform duration-200 ease-out hover:scale-[1.01] md:p-5`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${c.accentText}`}
            >
              {c.title}
            </p>
            <span
              className={`inline-block h-2 w-2 rounded-full border ${powerDotStyles[powerState]}`}
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <span>
              {getConnectivityLabel(
                latestReading?.recorded_at ?? device?.last_seen ?? null,
              )}
            </span>
            <span aria-hidden="true">·</span>
            <BatteryStatusIcon
              level={device?.battery_level ?? null}
              charging={device?.battery_state === "charging"}
              charged={device?.battery_state === "charged"}
              className="h-3.5 w-3.5 text-slate-400"
            />
            <span className={battery.className}>{battery.text}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getWellnessToneClasses(
              wellness.stateLabel,
              kind,
            )}`}
          >
            {wellness.stateLabel}
          </span>
          <p className="text-sm text-slate-500">{wellness.lastEventLabel}</p>
        </div>

        <div className="grid items-center gap-3">
          <div className="flex flex-col items-center py-1">
            <Image
              src={c.illustration}
              alt={c.illustrationAlt}
              width={224}
              height={164}
              className="mx-auto h-48 w-auto object-contain object-center"
            />
            {wellness.levelLabel !== "Sin confirmación" ? (
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                {wellness.levelLabel}
              </p>
            ) : null}
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300">
              {device?.device_id ?? "KPCLXXXX"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${c.contentChipClass}`}
            title={c.contentTitle}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={c.contentIconPath} />
            </svg>
            {contentValueText}
            {renderTrend(contentWeightGrams, prevContentWeightGrams)}
          </span>
          <span
            className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-600"
            title="Temperatura"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
            </svg>
            {tempText}
          </span>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${c.humidityChipClass}`}
            title="Humedad"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
            {humidityText}
          </span>
          <span
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500"
            title="Última lectura"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatTimestamp(latestReading?.recorded_at ?? null)}
          </span>
        </div>
      </div>
    </article>
  );
}
