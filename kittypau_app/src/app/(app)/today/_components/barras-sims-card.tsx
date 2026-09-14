"use client";

import Image from "next/image";
import { MEDIANA_GRAMOS_COMIDA } from "@/lib/hunger-bar";
import { mealSizeInfo } from "../_lib/today-format";

const WELLNESS_BLOCKS = 20;

// Tono del ícono de estado -- deriva de datos reales ya calculados por el
// caller (alertActive / hasEvidence), nunca de un match de texto sobre
// statusLabel (ese string puede cambiar de copy sin que cambie el tono).
// "ok" = confirmado/al día, "warn" = atrasada, "neutral" = sin evidencia
// todavía (no es un problema, es un estado honesto de "no sabemos aún").
type StatusTone = "ok" | "warn" | "neutral";

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
  // Color del círculo del ícono (ej. "bg-emerald-500") -- antes era la
  // pill de estado en el header, ahora el estado se lee del tono+ícono a
  // la derecha (ver StatusTone), así que este prop cambió de significado.
  badgeClass: string;
  statusTone: StatusTone;
  // Gramos de la última comida CONFIRMADA -- pedido de Mauro 2026-09-09:
  // que la barra "¿comió más o menos que lo habitual?" (ya vive en
  // BowlWellnessCard) también aparezca acá. Solo se pasa para la barra de
  // Comida (Agua no tiene mediana calibrada, queda sin esto a propósito).
  mealSizeGramos?: number | null;
};

const STATUS_ICON: Record<StatusTone, React.ReactNode> = {
  ok: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  warn: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3l10 18H2L12 3Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" />
    </svg>
  ),
  neutral: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M12 8v4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  ),
};

const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  ok: "text-emerald-600",
  warn: "text-amber-600",
  neutral: "text-slate-400",
};

/**
 * Widget "Barras Sims" del hero de /today — hoy son 2 barras (Comida/Agua).
 *
 * ⚠️ Este widget es sensible: Mauro ya pidió revertir 3 veces (ver
 * Knowledge/29_Specs/SPEC_04_Metricas_Today_Investigacion.md) cualquier intento de
 * agregarle cards nuevas. Proponer antes de expandirlo, no asumir que hace falta más.
 *
 * Piel "Character Status" (pedido de Mauro 2026-09-14, con mockup de
 * referencia): ícono en círculo de color + % grande a la derecha de la
 * barra + estado con ícono (check/alerta/sin evidencia) + última/próxima
 * apiladas. Mismo dato, mismo cálculo -- solo cambió el layout dentro de
 * cada fila. Nombre "Barras Sims" se mantiene igual aunque el layout ya no
 * sea el de Sims -- es el nombre que Mauro le puso al widget.
 */
export default function BarrasSimsCard({ bars }: { bars: [BarKind, BarKind] }) {
  return (
    <div className="w-full rounded-[18px] border border-white/80 bg-white/80 p-3.5 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        {/* Pill "Barras Sims" -- candado = widget protegido (no es solo
            decoración, es la misma regla del comentario de arriba hecha
            visible) + puntito con pulso = dato en vivo. */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="5"
              y="11"
              width="14"
              height="10"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M8 11V7a4 4 0 0 1 8 0v4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Barras Sims
          <span
            className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
            aria-hidden="true"
            title="Datos en vivo"
          />
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
            statusTone,
            mealSizeGramos,
          }) => {
            const pct = Math.round((filledBlocks / WELLNESS_BLOCKS) * 100);
            return (
              <div
                key={key}
                className={`rounded-[14px] border bg-white px-3 py-2.5 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.3)] ${trackClass}`}
              >
                {/* Grid 2 columnas: izquierda ícono+título+barra, derecha
                    %+estado+última/próxima -- mismo patrón que un stat de
                    RPG (recurso + valor grande al lado, no debajo). */}
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${badgeClass}`}
                      >
                        <Image
                          src={iconSrc}
                          alt=""
                          aria-hidden={true}
                          width={18}
                          height={18}
                          className="object-contain"
                        />
                      </span>
                      <p
                        className={`text-[13px] font-bold uppercase tracking-wide ${labelClass}`}
                      >
                        {title}
                      </p>
                    </div>
                    {/* "Líquido con onda" (pedido de Mauro 2026-09-14,
                        "otro diseño" -- elegido entre 4 opciones con
                        preview). kp-liquid-track/kp-liquid-fill son el
                        mismo truco de menisco (círculo sobre el borde,
                        globals.css) que usaba la versión vertical original
                        de este widget -- rotado 90° para el borde líquido
                        quede en el filo derecho (avance), no arriba. */}
                    <div className="kp-liquid-track mt-2 h-3.5 w-full bg-slate-100">
                      <div
                        className={`kp-liquid-fill ${fillClass}`}
                        style={{ width: `${pct}%`, ...fillStyle }}
                      />
                    </div>
                    {valueLabel ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {valueLabel}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-3xl font-extrabold leading-none ${labelClass}`}
                    >
                      {pct}%
                    </p>
                    <p
                      className={`mt-1 flex items-center justify-end gap-1 text-xs font-semibold ${STATUS_TONE_CLASS[statusTone]}`}
                    >
                      {statusLabel}
                      {STATUS_ICON[statusTone]}
                    </p>
                  </div>
                </div>

                <div className="mt-1.5 flex flex-col gap-1">
                  <p className="whitespace-pre-line text-[11px] leading-snug text-slate-500">
                    {noteLabel}
                  </p>
                  {mealSizeGramos != null
                    ? (() => {
                        const info = mealSizeInfo(mealSizeGramos);
                        const escalaMax = MEDIANA_GRAMOS_COMIDA * 2;
                        const barPct = Math.min(
                          100,
                          Math.round((mealSizeGramos / escalaMax) * 100),
                        );
                        return (
                          <div>
                            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${info.barClass}`}
                                style={{ width: `${barPct}%` }}
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
            );
          },
        )}
      </div>
    </div>
  );
}
