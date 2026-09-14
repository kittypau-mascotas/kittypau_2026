"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bone,
  Clock,
  Droplet,
  Fish,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";
import {
  getBatteryStateLabel,
  getConnectivityLabel,
  getWellnessToneClasses,
  powerDotStyles,
  renderTrend,
} from "../_lib/today-format";

// Íconos de la sección (pedido de Mauro 2026-09-14, "que color e íconos
// podría tener esta sección"): 1 solo color verde muy claro para todos los
// íconos de #today-bowls -- ya NO el arcoíris por chip (naranja temp,
// violeta/celeste humedad, gris hora) que había antes. El borde/título de
// cada card sigue distinguiendo comida (esmeralda) de agua (celeste), pero
// los íconos en sí son un único acento, y usan siluetas de mascota (hueso,
// pescado, gota) en vez de los genéricos de antes donde aplica.
const ICON_CIRCLE_BG = "bg-emerald-50";
const ICON_COLOR = "text-emerald-600";

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
    titleIcon: Bone,
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
    illustrationFull: "/illustrations/pink_food_full.png",
    illustrationMedium: "/illustrations/pink_food_medium.png",
    illustrationEmpty: "/illustrations/pink_empty.png",
    illustrationAlt: "Kittypau comedero",
    contentTitle: "Contenido actual",
    contentIcon: Fish,
  },
  water: {
    title: "Hidratación",
    titleIcon: Droplet,
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
    illustrationFull: "/illustrations/green_water_full.png",
    illustrationMedium: "/illustrations/green_water_medium.png",
    illustrationEmpty: "/illustrations/green_water_empty.png",
    illustrationAlt: "Kittypau bebedero",
    contentTitle: "Nivel actual",
    contentIcon: Droplet,
  },
} satisfies Record<
  "food" | "water",
  {
    title: string;
    titleIcon: LucideIcon;
    accentText: string;
    accentBorder: string;
    dashedBorder: string;
    dashedBg: string;
    addButtonBorder: string;
    addButtonText: string;
    addButtonHover: string;
    emptyIllustration: string;
    emptyAlt: string;
    emptyLabel: string;
    addLabel: string;
    illustrationFull: string;
    illustrationMedium: string;
    illustrationEmpty: string;
    illustrationAlt: string;
    contentTitle: string;
    contentIcon: LucideIcon;
  }
>;

/** Badge redondo de ícono -- mismo patrón que Barras Sims/hero (ícono
 * dentro de un círculo de color), acá con 1 solo color para toda la
 * sección en vez de repetir esmeralda/celeste del hero. */
function IconBadge({
  icon: Icon,
  size = "h-6 w-6",
  iconSize = "h-3.5 w-3.5",
}: {
  icon: LucideIcon;
  size?: string;
  iconSize?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${ICON_CIRCLE_BG} ${size}`}
    >
      <Icon className={`${iconSize} ${ICON_COLOR}`} aria-hidden="true" />
    </span>
  );
}

// Umbrales de qué ilustración de plato mostrar según % de contenido -- pedido
// explícito de Mauro 2026-09-09: lleno 60-100%, medio 20-59%, vacío 0-19%.
function illustrationForFill(
  c: (typeof KIND_CONFIG)[keyof typeof KIND_CONFIG],
  fillPct: number | null,
): string {
  if (fillPct === null) return c.illustrationFull; // sin dato de contenido -- mismo default de siempre
  if (fillPct >= 60) return c.illustrationFull;
  if (fillPct >= 20) return c.illustrationMedium;
  return c.illustrationEmpty;
}

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
  maxReferenceGrams,
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
  // "100%" = peso del último "término servido" real (audit_events) -- ver
  // bowlMaxServedContentGrams/waterMaxServedContentMl en today/page.tsx.
  maxReferenceGrams: number | null;
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

  const fillPct =
    contentWeightGrams !== null &&
    maxReferenceGrams !== null &&
    maxReferenceGrams > 0
      ? Math.round(
          Math.min(
            100,
            Math.max(0, (contentWeightGrams / maxReferenceGrams) * 100),
          ),
        )
      : null;

  const illustrationSrc = illustrationForFill(c, fillPct);

  return (
    <article
      className={`today-bowl-card flex h-full flex-col rounded-[var(--radius)] border ${c.accentBorder} bg-white p-4 shadow-sm md:p-5`}
    >
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconBadge icon={c.titleIcon} />
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
              src={illustrationSrc}
              alt={c.illustrationAlt}
              width={224}
              height={164}
              className="mx-auto h-36 w-auto object-contain object-center"
            />
            {fillPct !== null ? (
              <div className="mt-1 flex w-full max-w-[140px] items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      kind === "food" ? "bg-emerald-400" : "bg-sky-400"
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold tabular-nums text-slate-400">
                  {fillPct}%
                </span>
              </div>
            ) : null}
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

        {/* Antes 4 pills de ancho variable que se envolvían de forma
            impredecible (flex-wrap) -- grid 2x2 de ancho fijo, misma
            información, más fácil de escanear. */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div
            className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600"
            title={c.contentTitle}
          >
            <IconBadge icon={c.contentIcon} size="h-5 w-5" iconSize="h-3 w-3" />
            <span className="truncate">
              {contentValueText}
              {renderTrend(contentWeightGrams, prevContentWeightGrams)}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600"
            title="Temperatura"
          >
            <IconBadge icon={Thermometer} size="h-5 w-5" iconSize="h-3 w-3" />
            <span className="truncate">{tempText}</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600"
            title="Humedad"
          >
            <IconBadge icon={Droplet} size="h-5 w-5" iconSize="h-3 w-3" />
            <span className="truncate">{humidityText}</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600"
            title="Última lectura"
          >
            <IconBadge icon={Clock} size="h-5 w-5" iconSize="h-3 w-3" />
            <span className="truncate">
              {formatTimestamp(latestReading?.recorded_at ?? null)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
