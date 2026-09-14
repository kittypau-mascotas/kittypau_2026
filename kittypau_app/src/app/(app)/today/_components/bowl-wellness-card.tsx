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
    illustrationFull: "/illustrations/pink_food_full.png",
    illustrationMedium: "/illustrations/pink_food_medium.png",
    illustrationEmpty: "/illustrations/pink_empty.png",
    illustrationAlt: "Kittypau comedero",
    contentTitle: "Contenido actual",
    // Hueso en vez de las 3 líneas genéricas de antes (pedido de Mauro
    // 2026-09-14: íconos relacionados con alimentación/hidratación de
    // mascotas, no genéricos) -- path real del ícono "Bone" de lucide-react
    // (ya es dependencia del proyecto, ver BatteryStatusIcon).
    contentIconPath:
      "M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z",
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
    illustrationFull: "/illustrations/green_water_full.png",
    illustrationMedium: "/illustrations/green_water_medium.png",
    illustrationEmpty: "/illustrations/green_water_empty.png",
    illustrationAlt: "Kittypau bebedero",
    contentTitle: "Nivel actual",
    contentIconPath: "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z",
    contentChipClass: "bg-sky-50 text-sky-700",
    humidityChipClass: "bg-violet-50 text-violet-600",
  },
} as const;

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
      <div className="flex flex-1 flex-col gap-1">
        {/* Título centrado en su propia línea, connectivity/batería debajo
            (pedido de Mauro 2026-09-14: "centra los títulos") -- antes era
            una sola fila título-izquierda/batería-derecha. */}
        <div className="flex flex-col items-center gap-1">
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

        <div className="-mt-4 grid items-center">
          <div className="flex flex-col items-center">
            {/* Caja fija (antes h-36 w-auto -- cada PNG tiene su propio
                aspect-ratio real, así que con w-auto una quedaba más
                angosta que la otra pese a compartir el alto). Ambas
                ilustraciones miden exactamente lo mismo ahora, letterboxed
                con object-contain -- pedido de Mauro 2026-09-14, "más
                grandes y deben medir lo mismo", y después "sube un poco
                los platos y agranda su tamaño" 2 veces más (sin py-1
                arriba + h-72, -mt-4 acá arriba). */}
            <Image
              src={illustrationSrc}
              alt={c.illustrationAlt}
              width={288}
              height={212}
              className="mx-auto h-72 w-72 object-contain object-center"
            />
            {fillPct !== null ? (
              <div className="mt-1 flex w-full max-w-[180px] items-center gap-2">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      kind === "food" ? "bg-emerald-400" : "bg-sky-400"
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                <span className="text-base font-semibold tabular-nums text-slate-500">
                  {fillPct}%
                </span>
              </div>
            ) : null}
            {wellness.levelLabel !== "Sin confirmación" ? (
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                {wellness.levelLabel}
              </p>
            ) : null}
            <p className="mt-0.5 text-sm font-medium uppercase tracking-[0.14em] text-slate-400">
              {device?.device_id ?? "KPCLXXXX"}
            </p>
          </div>
        </div>

        {/* Antes 4 pills de ancho variable que se envolvían de forma
            impredecible (flex-wrap) -- grid 2x2 de ancho fijo, misma
            información, más fácil de escanear. */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${c.contentChipClass}`}
            title={c.contentTitle}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d={c.contentIconPath} />
            </svg>
            <span className="truncate">
              {contentValueText}
              {renderTrend(contentWeightGrams, prevContentWeightGrams)}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1.5 text-[11px] font-medium text-orange-600"
            title="Temperatura"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
            </svg>
            <span className="truncate">{tempText}</span>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${c.humidityChipClass}`}
            title="Humedad"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
            <span className="truncate">{humidityText}</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-500"
            title="Última lectura"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="truncate">
              {formatTimestamp(latestReading?.recorded_at ?? null)}
            </span>
          </div>
        </div>

        {/* Badge "Detectado por modelo" / última comida -- movido al fondo
            de la card (pedido de Mauro 2026-09-14), antes vivía arriba
            entre el título y la ilustración. */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
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
      </div>
    </article>
  );
}
