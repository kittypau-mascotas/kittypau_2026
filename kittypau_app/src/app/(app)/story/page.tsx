"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getAccessToken } from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

type ApiPet = {
  id: string;
  name: string;
};

type ApiDevice = {
  id: string;
  pet_id: string;
  device_id: string;
  device_type: string;
  status: string;
  device_state: string | null;
};

type ApiReading = {
  id: string;
  device_id: string;
  recorded_at: string;
  weight_grams: number | null;
  water_ml: number | null;
  flow_rate: number | null;
  temperature: number | null;
  humidity: number | null;
  battery_level: number | null;
};

type LoadState = {
  isLoading: boolean;
  error: string | null;
  pets: ApiPet[];
  devices: ApiDevice[];
  readings: ApiReading[];
};

const defaultState: LoadState = {
  isLoading: true,
  error: null,
  pets: [],
  devices: [],
  readings: [],
};

const apiBase = process.env.NEXT_PUBLIC_SITE_URL ?? "";

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

const buildStory = (reading: ApiReading) => {
    const facts: string[] = [];
  if (reading.flow_rate !== null) {
    facts.push(`Flujo ${Math.round(reading.flow_rate)} ml/h`);
  }
  if (reading.weight_grams !== null) {
    facts.push(`Peso ${reading.weight_grams} g`);
  }
  if (reading.temperature !== null && reading.humidity !== null) {
    facts.push(`Temp ${reading.temperature}° · Hum ${reading.humidity}%`);
  }

  let title = "Actividad registrada";
  let tone: "good" | "warn" | "info" = "info";

  if (reading.flow_rate !== null) {
    if (reading.flow_rate >= 140) {
      title = "Hidratación intensa";
      tone = "warn";
    } else if (reading.flow_rate >= 80) {
      title = "Hidratación normal";
      tone = "good";
    }
  } else if (reading.weight_grams !== null) {
    if (reading.weight_grams >= 3500) {
      title = "Consumo estable";
      tone = "good";
    } else {
      title = "Consumo liviano";
      tone = "info";
    }
  }

    const icon = tone === "good" ? "✓" : tone === "warn" ? "!" : "•";
    return {
      title,
      detail: facts.length > 0 ? facts.join(" · ") : "Sin métricas detalladas.",
      tone,
      icon,
};
  };

export default function StoryPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);

  const loadPets = async (token: string) => {
    const res = await fetch(`${apiBase}/api/pets`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar las mascotas.");
    return (await res.json()) as ApiPet[];
  };

  const loadDevices = async (token: string) => {
    const res = await fetch(`${apiBase}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar los dispositivos.");
    return (await res.json()) as ApiDevice[];
  };

  const loadReadings = async (token: string, deviceId: string) => {
    const res = await fetch(
      `${apiBase}/api/readings?device_id=${deviceId}&limit=50`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error("No se pudieron cargar las lecturas.");
    const payload = await res.json();
    return parseListResponse<ApiReading>(payload);
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const token = await getAccessToken();
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
          devices.find((device) => device.id === storedDeviceId) ??
          devices.find((device) => device.pet_id === primaryPet?.id) ??
          devices[0];
        const initialDeviceId = primaryDevice?.id ?? null;
        if (initialDeviceId && typeof window !== "undefined") {
          window.localStorage.setItem("kittypau_device_id", initialDeviceId);
        }
        setSelectedDeviceId(initialDeviceId);

        const readings = initialDeviceId
          ? await loadReadings(token, initialDeviceId)
          : [];

        if (!mounted) return;
        setState({
          isLoading: false,
          error: null,
          pets,
          devices,
          readings,
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

  useEffect(() => {
    if (!selectedDeviceId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const accessToken = getAccessToken();
    if (accessToken) {
      supabase.realtime.setAuth(accessToken);
    }

    const channel = supabase
      .channel(`readings:${selectedDeviceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "readings",
          filter: `device_id=eq.${selectedDeviceId}`,
        },
        (payload) => {
          const nextReading = payload.new as ApiReading;
          setState((prev) => {
            const exists = prev.readings.some(
              (reading) => reading.id === nextReading.id
            );
            if (exists) return prev;
            return {
              ...prev,
              readings: [nextReading, ...prev.readings].slice(0, 120),
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDeviceId]);

  const timeline = useMemo(() => {
    return state.readings.slice(0, 24).map((reading) => ({
      ...reading,
      story: buildStory(reading),
    }));
  }, [state.readings]);

  const filteredTimeline = useMemo(() => {
    if (dayOffset === 0) return timeline;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - dayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return timeline.filter((item) => {
      const ts = new Date(item.recorded_at).getTime();
      return ts >= start.getTime() && ts < end.getTime();
    });
  }, [dayOffset, timeline]);

  const selectedDevice = state.devices.find(
    (device) => device.id === selectedDeviceId
  );
  const selectedPet = state.pets.find(
    (pet) => pet.id === selectedDevice?.pet_id
  );

  const summaryCounts = useMemo(() => {
    const total = filteredTimeline.length;
    const warn = filteredTimeline.filter((item) => item.story.tone === "warn").length;
    const good = filteredTimeline.filter((item) => item.story.tone === "good").length;
    return { total, warn, good };
  }, [filteredTimeline]);

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
        <div className="alert alert-error flex flex-wrap items-center justify-between gap-3">
          <span>{state.error}</span>
          <Link
            href="/login"
            className="rounded-[var(--radius)] border border-rose-200/70 bg-white px-3 py-2 text-[11px] font-semibold text-rose-700"
          >
            Iniciar sesión
          </Link>
        </div>
      )}

      {state.isLoading ? (
        <div className="surface-card px-6 py-6">
          <div className="space-y-3">
            <div className="h-3 w-24 rounded-full bg-slate-200/70" />
            <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
            <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
            <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
          </div>
        </div>
      ) : state.devices.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">Aún no hay dispositivos vinculados.</p>
          <p className="empty-text">
            Completa el onboarding para conectar un plato y generar la historia.
          </p>
          <div className="empty-actions">
            <Link
              href="/onboarding"
              className="rounded-[var(--radius)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Ir a onboarding
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="surface-card px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
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
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Ver:</span>
                <select
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  value={dayOffset}
                  onChange={(event) => setDayOffset(Number(event.target.value))}
                >
                  <option value={0}>Hoy</option>
                  <option value={1}>Ayer</option>
                  <option value={2}>Hace 2 días</option>
                </select>
              </div>
              {state.devices.length > 1 && (
                <label className="flex flex-col text-xs text-slate-500">
                  Cambiar dispositivo
                  <select
                    className="mt-1 rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                    value={selectedDeviceId ?? ""}
                    onChange={async (event) => {
                      const nextId = event.target.value || null;
                      setSelectedDeviceId(nextId);
                      if (nextId && typeof window !== "undefined") {
                        window.localStorage.setItem(
                          "kittypau_device_id",
                          nextId
                        );
                      }
                      if (!nextId) return;
                      const token = await getAccessToken();
                      if (!token) return;
                      try {
                        const readings = await loadReadings(token, nextId);
                        setState((prev) => ({ ...prev, readings }));
                      } catch (err) {
                        setState((prev) => ({
                          ...prev,
                          error:
                            err instanceof Error
                              ? err.message
                              : "No se pudo cargar la historia.",
                        }));
                      }
                    }}
                  >
                    {state.devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.device_id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>

          <section className="surface-card px-6 py-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Eventos
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
                  Estables
                </p>
                <p className="mt-2 text-lg font-semibold text-emerald-900">
                  {summaryCounts.good}
                </p>
              </div>
            </div>
          </section>

          <section className="story-list">
            {filteredTimeline.length === 0 ? (
              <div className="empty-state">
                <p className="empty-title">Aún no hay historia para mostrar.</p>
                <p className="empty-text">
                  Cuando lleguen lecturas desde el plato aparecerán aquí.
                </p>
              </div>
            ) : (
              filteredTimeline.map((item, index) => (
                <article key={item.id} className="story-card">
                  <div className="story-time">
                    {formatTimestamp(item.recorded_at)}
                  </div>
                  <div className="story-line">
                    <div className={`story-dot tone-${item.story.tone}`} />
                    {index < filteredTimeline.length - 1 ? (
                      <span className="story-rail" />
                    ) : null}
                  </div>
                  <div className="story-content">
                    <h3>
                      <span className="story-icon">{item.story.icon}</span>{" "}
                      {item.story.title}
                    </h3>
                    <span
                      className={`story-tag story-tag-${item.story.tone}`}
                    >
                      {item.story.tone === "good"
                        ? "Estable"
                        : item.story.tone === "warn"
                        ? "Atención"
                        : "Info"}
                    </span>
                    <p>{item.story.detail}</p>
                    <div className="story-meta">
                      <span>{selectedDevice?.device_id ?? "Plato"}</span>
                      <span>·</span>
                      <span>{selectedPet?.name ?? "Mascota"}</span>
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



