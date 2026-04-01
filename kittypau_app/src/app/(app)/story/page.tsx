"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";
import {
  syncSelectedDevice,
  syncSelectedPet,
} from "@/lib/runtime/selection-sync";
import Alert from "@/app/_components/alert";
import EmptyState from "@/app/_components/empty-state";

type ApiPet = {
  id: string;
  name: string;
  food_normal_min_g?: number | null;
  food_normal_max_g?: number | null;
  water_normal_min_ml?: number | null;
  water_normal_max_ml?: number | null;
};

type ApiDevice = {
  id: string;
  pet_id: string;
  device_id: string;
  device_type: string;
  status: string;
  device_state: string | null;
};

// Sesión procesada por el analytics processor
type ApiSession = {
  id: string;
  device_id: string;
  session_type: "food" | "water";
  session_start: string;
  session_end: string;
  duration_sec: number | null;
  grams_consumed: number | null;
  water_ml: number | null;
  classification: "normal" | "low" | "high" | "skipped";
  anomaly_score: number | null;
  baseline_grams: number | null;
  avg_temperature: number | null;
  avg_humidity: number | null;
};

type LoadState = {
  isLoading: boolean;
  error: string | null;
  pets: ApiPet[];
  devices: ApiDevice[];
  sessions: ApiSession[];
  isPremium: boolean;
  historyDays: number;
  analyticsAvailable: boolean;
};

const defaultState: LoadState = {
  isLoading: true,
  error: null,
  pets: [],
  devices: [],
  sessions: [],
  isPremium: false,
  historyDays: 3,
  analyticsAvailable: true,
};

const formatTimestamp = (value: string) => {
  const ts = new Date(value);
  if (Number.isNaN(ts.getTime())) return value;
  return ts.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseListResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T[] }).data ?? [];
  }
  return [];
};

// Reclasifica según límites personalizados del dueño, si están configurados.
function applyCustomLimits(
  session: ApiSession,
  pet: ApiPet,
): "normal" | "low" | "high" | "skipped" {
  const isFood = session.session_type === "food";
  const amount = isFood ? session.grams_consumed : session.water_ml;
  if (amount === null) return session.classification;
  const min = isFood ? pet.food_normal_min_g : pet.water_normal_min_ml;
  const max = isFood ? pet.food_normal_max_g : pet.water_normal_max_ml;
  if (min == null && max == null) return session.classification;
  if (min != null && amount < min) return "low";
  if (max != null && amount > max) return "high";
  return "normal";
}

// Convierte la clasificación del procesador en una historia legible
const buildStory = (session: ApiSession, petName: string, pet: ApiPet) => {
  const classification = applyCustomLimits(session, pet);
  const isFood = session.session_type === "food";
  const amount = isFood ? session.grams_consumed : session.water_ml;
  const unit = isFood ? "g" : "ml";
  const durMin = session.duration_sec
    ? Math.round(session.duration_sec / 60)
    : null;

  const facts: string[] = [];
  if (amount != null) facts.push(`${Math.round(amount)} ${unit}`);
  if (durMin != null && durMin > 0) facts.push(`${durMin} min`);
  if (session.avg_temperature != null)
    facts.push(`${Math.round(session.avg_temperature)}°C`);
  if (session.anomaly_score != null)
    facts.push(`Z: ${session.anomaly_score.toFixed(1)}`);

  let title: string;
  let detail: string;
  let tone: "good" | "warn" | "info";

  switch (classification) {
    case "high":
      title = isFood ? "Consumo elevado" : "Hidratación intensa";
      detail = isFood
        ? `${petName} comió más de lo habitual.`
        : `${petName} bebió más rápido de lo habitual.`;
      tone = "warn";
      break;
    case "low":
      title = isFood ? "Consumo bajo" : "Poca hidratación";
      detail = isFood
        ? `${petName} comió menos de lo habitual.`
        : `${petName} bebió menos de lo habitual.`;
      tone = "warn";
      break;
    case "skipped":
      title = isFood ? "Sin comer" : "Sin beber";
      detail = `No se detectó actividad de ${petName} en esta ventana.`;
      tone = "warn";
      break;
    default:
      title = isFood ? "Consumo normal" : "Hidratación normal";
      detail = isFood
        ? `Buen ritmo de alimentación para ${petName}.`
        : `Buen ritmo de agua para ${petName}.`;
      tone = "good";
  }

  const icon = tone === "good" ? "✓" : tone === "warn" ? "!" : "•";
  return {
    title,
    detail: facts.length > 0 ? `${detail} · ${facts.join(" · ")}` : detail,
    tone,
    icon,
    classification,
  };
};

export default function StoryPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);

  const loadPets = async (token: string) => {
    const res = await fetch(`/api/pets`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar las mascotas.");
    return (await res.json()) as ApiPet[];
  };

  const loadDevices = async (token: string) => {
    const res = await fetch(`/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar los dispositivos.");
    return (await res.json()) as ApiDevice[];
  };

  const loadSessions = async (token: string, petId: string, daysBack = 7) => {
    const from = new Date(
      Date.now() - daysBack * 24 * 60 * 60 * 1000,
    ).toISOString();
    const res = await fetch(
      `/api/analytics/sessions?pet_id=${petId}&from=${from}&limit=120`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!res.ok) throw new Error("No se pudieron cargar las sesiones.");
    const payload = (await res.json()) as {
      data: ApiSession[];
      meta: {
        is_premium: boolean;
        history_days: number;
        analytics_available?: boolean;
      };
    };
    return {
      sessions: parseListResponse<ApiSession>(payload),
      isPremium: payload.meta?.is_premium ?? false,
      historyDays: payload.meta?.history_days ?? 7,
      analyticsAvailable: payload.meta?.analytics_available ?? true,
    };
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const token = await getValidAccessToken();
      if (!token) {
        clearTokens();
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Sesión no válida. Vuelve a iniciar sesión.",
          }));
        }
        return;
      }

      try {
        const [pets, devices] = await Promise.all([
          loadPets(token),
          loadDevices(token),
        ]);

        const storedDeviceId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("kittypau_device_id")
            : null;
        const primaryPet = pets[0];
        const primaryDevice =
          devices.find((d) => d.id === storedDeviceId) ??
          devices.find((d) => d.pet_id === primaryPet?.id) ??
          devices[0];

        const initialDeviceId = primaryDevice?.id ?? null;
        const initialPetId = primaryDevice?.pet_id ?? primaryPet?.id ?? null;

        if (initialDeviceId) syncSelectedDevice(initialDeviceId);
        if (initialPetId) {
          const linkedPet = pets.find((p) => p.id === initialPetId);
          if (linkedPet) syncSelectedPet(linkedPet.id, linkedPet.name ?? "");
        }

        setSelectedDeviceId(initialDeviceId);
        setSelectedPetId(initialPetId);

        const sessionResult = initialPetId
          ? await loadSessions(token, initialPetId)
          : {
              sessions: [],
              isPremium: false,
              historyDays: 7,
              analyticsAvailable: true,
            };

        if (!mounted) return;
        setState({
          isLoading: false,
          error: null,
          pets,
          devices,
          sessions: sessionResult.sessions,
          isPremium: sessionResult.isPremium,
          historyDays: sessionResult.historyDays,
          analyticsAvailable: sessionResult.analyticsAvailable,
        });
      } catch (err) {
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "No se pudo cargar la historia.",
        }));
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedDevice = state.devices.find((d) => d.id === selectedDeviceId);
  const selectedPet = state.pets.find((p) => p.id === selectedPetId);
  const petLabel = selectedPet?.name ?? "tu mascota";

  // Días disponibles según plan
  const maxDayOffset = state.isPremium ? 364 : 6;
  const dayOptions = Array.from({ length: maxDayOffset + 1 }, (_, i) => i);

  const timeline = useMemo(() => {
    const pet = selectedPet ?? { id: "", name: petLabel };
    return state.sessions.map((s) => ({
      ...s,
      story: buildStory(s, petLabel, pet),
    }));
  }, [state.sessions, petLabel, selectedPet]);

  const filteredTimeline = useMemo(() => {
    if (dayOffset === 0) return timeline;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - dayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return timeline.filter((item) => {
      const ts = new Date(item.session_start).getTime();
      return ts >= start.getTime() && ts < end.getTime();
    });
  }, [dayOffset, timeline]);

  const summaryCounts = useMemo(() => {
    const total = filteredTimeline.length;
    const warn = filteredTimeline.filter((i) => i.story.tone === "warn").length;
    const good = filteredTimeline.filter((i) => i.story.tone === "good").length;
    return { total, warn, good };
  }, [filteredTimeline]);

  const handlePetChange = async (petId: string) => {
    setSelectedPetId(petId);
    const linkedDevice = state.devices.find((d) => d.pet_id === petId);
    if (linkedDevice) {
      setSelectedDeviceId(linkedDevice.id);
      syncSelectedDevice(linkedDevice.id);
    }
    const linkedPet = state.pets.find((p) => p.id === petId);
    if (linkedPet) syncSelectedPet(linkedPet.id, linkedPet.name ?? "");

    const token = await getValidAccessToken();
    if (!token) return;
    try {
      const { sessions, isPremium, historyDays, analyticsAvailable } =
        await loadSessions(token, petId);
      setState((prev) => ({
        ...prev,
        sessions,
        isPremium,
        historyDays,
        analyticsAvailable,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error ? err.message : "No se pudo cargar la historia.",
      }));
    }
  };

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Diario automático</p>
          <h1>Historia del día</h1>
        </div>
        <Link href="/today" className="ghost-link">
          Ver resumen
        </Link>
      </div>

      {state.error && (
        <Alert
          variant="error"
          title="Error"
          actions={
            <Link
              href="/login"
              className="rounded-[var(--radius)] border border-rose-200/70 bg-white px-3 py-2 text-[11px] font-semibold text-rose-700"
            >
              Iniciar sesión
            </Link>
          }
        >
          {state.error}
        </Alert>
      )}

      {!state.isPremium && (
        <div className="rounded-[var(--radius)] border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Plan Free</span> — historial de los
          últimos {state.historyDays} días.{" "}
          <Link href="/settings" className="underline">
            Actualiza a Premium
          </Link>{" "}
          para acceder hasta 1 año de historia.
        </div>
      )}

      {!state.analyticsAvailable && (
        <div className="rounded-[var(--radius)] border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-800">
          <span className="font-semibold">
            Historial temporalmente limitado
          </span>{" "}
          — la base analítica histórica no está disponible en este entorno, por
          lo que la story muestra sólo lo que el core puede reconstruir.
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link href="/today" className="underline">
              Ver resumen en vivo
            </Link>
            <Link href="/settings" className="underline">
              Revisar plan y sincronización
            </Link>
          </div>
        </div>
      )}

      {state.isLoading ? (
        <div className="surface-card freeform-rise px-6 py-6">
          <div className="space-y-3">
            <div className="h-3 w-24 rounded-full bg-slate-200/70" />
            <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
            <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
            <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
          </div>
        </div>
      ) : state.devices.length === 0 ? (
        <EmptyState
          title="Aún no hay dispositivos vinculados."
          actions={
            <Link
              href="/registro"
              className="rounded-[var(--radius)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Ir a registro
            </Link>
          }
        >
          Completa el registro para conectar un plato y comenzar tu diario.
        </EmptyState>
      ) : (
        <>
          <section className="surface-card freeform-rise px-4 py-4 sm:px-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_auto_auto] lg:items-end">
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Mascota</p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedPet?.name ?? "Sin mascota"}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedDevice
                    ? `${selectedDevice.device_type} · ${selectedDevice.device_id}`
                    : "Sin dispositivo"}
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center gap-3 text-xs text-slate-500 sm:w-auto">
                <span>Ver:</span>
                <select
                  className="w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 sm:w-auto sm:min-w-[180px]"
                  value={dayOffset}
                  onChange={(e) => setDayOffset(Number(e.target.value))}
                >
                  {dayOptions.map((d) => (
                    <option key={d} value={d}>
                      {d === 0 ? "Hoy" : d === 1 ? "Ayer" : `Hace ${d} días`}
                    </option>
                  ))}
                </select>
              </div>

              {state.pets.length > 1 && (
                <label className="flex w-full flex-col text-xs text-slate-500 sm:w-auto">
                  Cambiar mascota
                  <select
                    className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 sm:min-w-[220px]"
                    value={selectedPetId ?? ""}
                    onChange={(e) => {
                      void handlePetChange(e.target.value);
                    }}
                  >
                    {state.pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>

          <section className="surface-card freeform-rise px-6 py-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Sesiones
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {summaryCounts.total}
                </p>
              </div>
              <div className="rounded-[calc(var(--radius)-6px)] border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
                <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
                  Atención
                </p>
                <p className="mt-2 text-lg font-semibold text-amber-900">
                  {summaryCounts.warn}
                </p>
              </div>
              <div className="rounded-[calc(var(--radius)-6px)] border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
                  Normales
                </p>
                <p className="mt-2 text-lg font-semibold text-emerald-900">
                  {summaryCounts.good}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              Sesiones detectadas para {selectedPet?.name ?? "tu mascota"} ·{" "}
              {state.historyDays}d de historial disponible.
              {state.isPremium && (
                <span
                  title="Plan Premium"
                  className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full"
                  style={{
                    background:
                      "linear-gradient(135deg, #f5c842 0%, #e0900a 100%)",
                    boxShadow: "0 1px 4px rgba(224,144,10,0.45)",
                  }}
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="white"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-[13px] w-[13px]"
                  >
                    {/* Huella — 4 dedos + almohadilla central */}
                    <ellipse cx="10" cy="13.2" rx="3.2" ry="2.2" />
                    <ellipse
                      cx="6"
                      cy="10.2"
                      rx="1.5"
                      ry="2"
                      transform="rotate(-20 6 10.2)"
                    />
                    <ellipse
                      cx="14"
                      cy="10.2"
                      rx="1.5"
                      ry="2"
                      transform="rotate(20 14 10.2)"
                    />
                    <ellipse
                      cx="8"
                      cy="7.5"
                      rx="1.3"
                      ry="1.8"
                      transform="rotate(-10 8 7.5)"
                    />
                    <ellipse
                      cx="12"
                      cy="7.5"
                      rx="1.3"
                      ry="1.8"
                      transform="rotate(10 12 7.5)"
                    />
                  </svg>
                </span>
              )}
            </p>
          </section>

          <section className="story-list">
            {filteredTimeline.length === 0 ? (
              <EmptyState
                title={
                  state.analyticsAvailable
                    ? "Aún no hay sesiones para mostrar."
                    : "La historia histórica todavía no está disponible."
                }
              >
                {state.analyticsAvailable
                  ? "Cuando el plato detecte actividad, verás la historia aquí."
                  : "La vista sigue funcionando, pero la base analítica histórica está desactivada. Puedes revisar el resumen en vivo mientras tanto."}
              </EmptyState>
            ) : (
              filteredTimeline.map((item, index) => (
                <article
                  key={item.id}
                  className={`story-card tone-${item.story.tone}`}
                >
                  <div className="story-time">
                    {formatTimestamp(item.session_start)}
                  </div>
                  <div className="story-line">
                    <div className={`story-dot tone-${item.story.tone}`} />
                    {index < filteredTimeline.length - 1 ? (
                      <span className="story-rail" />
                    ) : null}
                  </div>
                  <div className="story-content">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3>
                        <span className="story-icon">{item.story.icon}</span>{" "}
                        {item.story.title}
                      </h3>
                      <span
                        className={`story-tag story-tag-${item.story.tone}`}
                      >
                        {item.story.classification === "normal"
                          ? "Estable"
                          : item.story.classification === "high"
                            ? "Elevado"
                            : item.story.classification === "skipped"
                              ? "Sin actividad"
                              : "Bajo"}
                      </span>
                    </div>
                    <p>{item.story.detail}</p>
                    {item.story.tone === "warn" ? (
                      <p className="story-hint">
                        Sugerencia: revisa el agua y el estado del plato.
                      </p>
                    ) : (
                      <p className="story-hint">
                        Buen ritmo. Mantén la rutina de{" "}
                        {selectedPet?.name ?? "tu mascota"}.
                      </p>
                    )}
                    <div className="story-meta">
                      <span>{selectedDevice?.device_id ?? "Plato"}</span>
                      <span>·</span>
                      <span>{selectedPet?.name ?? "Mascota"}</span>
                      {item.session_type === "food" ? (
                        <span>· Comida</span>
                      ) : (
                        <span>· Agua</span>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
