"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getValidAccessToken } from "@/lib/auth/token";
import { chileCompactDatetime } from "@/lib/time/chile";
import { useHungerBarPushAlert } from "@/lib/hooks/useHungerBarPushAlert";

type HungerBarResponse = {
  status: "ok" | "sin_datos" | "sin_dispositivo";
  percentage: number | null;
  lastMealDetectedAt: string | null;
  estimatedNextMealAt: string | null;
  intervalUsedMinutes: number | null;
  usingFallback: boolean;
  sampleSize: number;
  alertActive: boolean;
  hoursOverdue: number | null;
};

function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

// v1.1 — gradiente continuo verde→amarillo→rojo. Ver
// Knowledge/05_API/SPEC_HungerBar_Alertas.md §2.
function hungerBarColor(pct: number): string {
  const hue = Math.max(0, Math.min(100, pct)) * 1.2;
  return `hsl(${hue}, 70%, 45%)`;
}

export default function HungerBarCard({
  petId,
  petName = "tu mascota",
}: {
  petId: string;
  petName?: string;
}) {
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

  useHungerBarPushAlert({
    petId,
    petName,
    status: data?.status,
    estimatedNextMealAt: data?.estimatedNextMealAt,
  });

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
        <h2 className="text-lg font-semibold text-slate-900">
          🍽️ Barra de hambre
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Todavía no detectamos comidas suficientes para estimar el patrón. Se
          actualiza sola apenas el comedero registre actividad.
        </p>
      </section>
    );
  }

  const pct = data.percentage;
  const alert = data.alertActive;

  return (
    <section
      className={`surface-card freeform-rise px-6 py-5 transition-colors ${
        alert ? "border-2 border-rose-500 animate-pulse" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          🍽️ Barra de hambre
        </h2>
        {data.usingFallback ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
            Aprendiendo sus hábitos
          </span>
        ) : null}
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: hungerBarColor(pct) }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-900">{pct}%</span>
        <span className="text-slate-500">
          {pct <= 0
            ? "Debería haber comido ya"
            : `Próxima comida estimada: ${
                data.estimatedNextMealAt
                  ? chileCompactDatetime(data.estimatedNextMealAt)
                  : "—"
              }`}
        </span>
      </div>

      {alert ? (
        <div className="mt-3 flex items-start gap-2 rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            {petName} no ha comido en más de{" "}
            {Math.floor(data.hoursOverdue ?? 0)} horas.
          </span>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-slate-400">
        Última comida detectada:{" "}
        {data.lastMealDetectedAt
          ? chileCompactDatetime(data.lastMealDetectedAt)
          : "—"}
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
