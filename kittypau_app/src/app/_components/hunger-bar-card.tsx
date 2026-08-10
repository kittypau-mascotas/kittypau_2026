"use client";

import { useEffect, useState } from "react";
import { getValidAccessToken } from "@/lib/auth/token";
import { chileCompactDatetime } from "@/lib/time/chile";

type HungerBarResponse = {
  status: "ok" | "sin_datos" | "sin_dispositivo";
  percentage: number | null;
  lastMealDetectedAt: string | null;
  estimatedNextMealAt: string | null;
  intervalUsedMinutes: number | null;
  usingFallback: boolean;
  sampleSize: number;
};

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export default function HungerBarCard({ petId }: { petId: string }) {
  const [data, setData] = useState<HungerBarResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const token = await getValidAccessToken();
      if (!token) return;
      try {
        const res = await fetch(`/api/pets/${petId}/hunger-bar`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const payload = (await res.json()) as HungerBarResponse;
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setError("No se pudo cargar la barra de hambre.");
      }
    };
    load();
    // ponytail: refresco cada 5 min — enganchar a useMqttLive() cuando el bowl
    // publique en vivo sería más reactivo, queda para v2.
    const interval = setInterval(load, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [petId]);

  if (error) {
    return (
      <section className="surface-card freeform-rise px-6 py-5">
        <p className="text-sm text-slate-500">{error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="surface-card freeform-rise px-6 py-5">
        <p className="text-sm text-slate-500">Cargando barra de hambre…</p>
      </section>
    );
  }

  if (data.status === "sin_dispositivo") {
    return null; // sin comedero vinculado, no tiene sentido mostrar la barra
  }

  if (data.status === "sin_datos" || data.percentage === null) {
    return (
      <section className="surface-card freeform-rise px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">🍽️ Barra de hambre</h2>
        <p className="mt-2 text-sm text-slate-500">
          Todavía no detectamos comidas suficientes para estimar el patrón. Se actualiza
          sola apenas el comedero registre actividad.
        </p>
      </section>
    );
  }

  const pct = data.percentage;
  const barColor = pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-400" : "bg-emerald-500";

  return (
    <section className="surface-card freeform-rise px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">🍽️ Barra de hambre</h2>
        {data.usingFallback ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
            Aprendiendo sus hábitos
          </span>
        ) : null}
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-900">{pct}%</span>
        <span className="text-slate-500">
          {pct >= 100
            ? "Debería haber comido ya"
            : `Próxima comida estimada: ${
                data.estimatedNextMealAt ? chileCompactDatetime(data.estimatedNextMealAt) : "—"
              }`}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Última comida detectada:{" "}
        {data.lastMealDetectedAt ? chileCompactDatetime(data.lastMealDetectedAt) : "—"}
        {data.intervalUsedMinutes
          ? ` · intervalo usado: ${formatHoursMinutes(data.intervalUsedMinutes)}`
          : ""}
        {` · ${data.sampleSize} comida${data.sampleSize === 1 ? "" : "s"} detectada${
          data.sampleSize === 1 ? "" : "s"
        }`}
      </p>
    </section>
  );
}
