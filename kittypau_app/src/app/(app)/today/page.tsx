"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getAccessToken } from "@/lib/auth/token";

type ApiPet = {
  id: string;
  name: string;
  pet_state?: string | null;
};

type ApiDevice = {
  id: string;
  pet_id: string;
  device_code: string;
  device_type: string;
  status: string;
  device_state: string | null;
  battery_level: number | null;
  last_seen: string | null;
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
  readingsCursor: string | null;
  isLoadingMore: boolean;
};

const defaultState: LoadState = {
  isLoading: true,
  error: null,
  pets: [],
  devices: [],
  readings: [],
  readingsCursor: null,
  isLoadingMore: false,
};

function formatTimestamp(value?: string | null) {
  if (!value) return "Sin datos";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin datos";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function TodayPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const token = useMemo(() => getAccessToken(), []);

  const parseListResponse = <T,>(payload: unknown): T[] => {
    if (Array.isArray(payload)) {
      return payload as T[];
    }
    if (payload && typeof payload === "object" && "data" in payload) {
      return (payload as { data?: T[] }).data ?? [];
    }
    return [];
  };

  const parseCursor = (payload: unknown): string | null => {
    if (payload && typeof payload === "object" && "next_cursor" in payload) {
      return (payload as { next_cursor?: string | null }).next_cursor ?? null;
    }
    return null;
  };

  const loadReadings = async (deviceId: string, cursor?: string | null) => {
    if (!token) {
      return { data: [] as ApiReading[], nextCursor: null as string | null };
    }
    const params = new URLSearchParams({
      device_id: deviceId,
      limit: "50",
    });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/readings?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("No se pudieron cargar las lecturas.");
    }
    const payload = await res.json();
    return {
      data: parseListResponse<ApiReading>(payload),
      nextCursor: parseCursor(payload),
    };
  };

  useEffect(() => {
    if (!token) {
      setState({
        isLoading: false,
        error: "Necesitas iniciar sesión para ver tu feed.",
        pets: [],
        devices: [],
        readings: [],
        readingsCursor: null,
        isLoadingMore: false,
      });
      return;
    }

    const load = async () => {
      try {
        const [petsRes, devicesRes] = await Promise.all([
          fetch("/api/pets?limit=20", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/devices?limit=20", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!petsRes.ok) {
          throw new Error("No se pudieron cargar las mascotas.");
        }
        if (!devicesRes.ok) {
          throw new Error("No se pudieron cargar los dispositivos.");
        }

        const petsPayload = await petsRes.json();
        const devicesPayload = await devicesRes.json();

        const pets = parseListResponse<ApiPet>(petsPayload);
        const devices = parseListResponse<ApiDevice>(devicesPayload);

        const primaryPet = pets[0];
        const primaryDevice =
          devices.find((device) => device.pet_id === primaryPet?.id) ??
          devices[0];

        let readings: ApiReading[] = [];
        let readingsCursor: string | null = null;
        if (primaryDevice?.id) {
          const result = await loadReadings(primaryDevice.id);
          readings = result.data;
          readingsCursor = result.nextCursor;
        }

        setState({
          isLoading: false,
          error: null,
          pets,
          devices,
          readings,
          readingsCursor,
          isLoadingMore: false,
        });
      } catch (err) {
        setState({
          isLoading: false,
          error:
            err instanceof Error
              ? err.message
              : "No se pudo cargar la información.",
          pets: [],
          devices: [],
          readings: [],
          readingsCursor: null,
          isLoadingMore: false,
        });
      }
    };

    void load();
  }, []);

  const loadMoreReadings = async () => {
    const primaryDevice =
      state.devices.find((device) => device.pet_id === state.pets[0]?.id) ??
      state.devices[0];
    if (!primaryDevice?.id || !state.readingsCursor || state.isLoadingMore) {
      return;
    }
    setState((prev) => ({ ...prev, isLoadingMore: true }));
    try {
      const result = await loadReadings(primaryDevice.id, state.readingsCursor);
      setState((prev) => ({
        ...prev,
        readings: [...prev.readings, ...result.data],
        readingsCursor: result.nextCursor,
        isLoadingMore: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error
            ? err.message
            : "No se pudieron cargar más lecturas.",
        isLoadingMore: false,
      }));
    }
  };

  const primaryPet = state.pets[0];
  const primaryDevice =
    state.devices.find((device) => device.pet_id === primaryPet?.id) ??
    state.devices[0];
  const latestReading = state.readings[0] ?? null;

  const feedCards = useMemo(() => {
    if (!latestReading) return [];
    const items = [];
    if (latestReading.water_ml !== null || latestReading.flow_rate !== null) {
      items.push({
        title: "Hidratación",
        description:
          latestReading.flow_rate !== null
            ? `Flujo ${latestReading.flow_rate} ml/h en la última lectura.`
            : `Consumo registrado: ${latestReading.water_ml ?? 0} ml.`,
        tone: "info",
      });
    }
    if (latestReading.weight_grams !== null) {
      items.push({
        title: "Consumo de alimento",
        description: `Peso detectado: ${latestReading.weight_grams} g.`,
        tone: "ok",
      });
    }
    if (latestReading.temperature !== null || latestReading.humidity !== null) {
      items.push({
        title: "Ambiente",
        description: `Temp ${latestReading.temperature ?? "-"}° · Humedad ${
          latestReading.humidity ?? "-"
        }%.`,
        tone: "warning",
      });
    }
    return items.slice(0, 3);
  }, [latestReading]);

  const toneStyles: Record<string, string> = {
    ok: "border-emerald-200/60 bg-emerald-50/60 text-emerald-800",
    warning: "border-amber-200/60 bg-amber-50/70 text-amber-800",
    info: "border-sky-200/60 bg-sky-50/70 text-sky-800",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.7),_rgba(248,250,252,1))] px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Hoy en casa
              </p>
              <h1 className="display-title text-3xl font-semibold text-slate-900 md:text-4xl">
                Resumen del día
              </h1>
            </div>
            <div className="surface-card flex items-center gap-4 px-4 py-3">
              <div className="h-12 w-12 rounded-full bg-slate-200" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {primaryPet?.name ?? "Sin mascota"}
                </p>
                <p className="text-xs text-slate-500">
                  {primaryDevice
                    ? `${primaryDevice.device_type} · ${primaryDevice.device_code}`
                    : "Sin dispositivo"}
                </p>
              </div>
            </div>
          </div>
          <div className="stagger grid gap-4 md:grid-cols-3">
            <div className="surface-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Estado general
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {primaryDevice?.status ?? "Sin datos"}
              </p>
            </div>
            <div className="surface-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Última lectura
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatTimestamp(latestReading?.recorded_at)}
              </p>
            </div>
            <div className="surface-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Batería
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {primaryDevice?.battery_level !== null &&
                primaryDevice?.battery_level !== undefined
                  ? `${primaryDevice.battery_level}%`
                  : "Sin datos"}
              </p>
            </div>
          </div>
        </header>

        {state.error ? (
          <section className="surface-card px-6 py-6 text-sm text-slate-600">
            <p className="mb-3">{state.error}</p>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-[var(--radius)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Ir al login
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearTokens();
                  window.location.href = "/login";
                }}
                className="text-xs font-semibold text-slate-700"
              >
                Limpiar sesión
              </button>
            </div>
          </section>
        ) : null}

        {!state.isLoading &&
        !state.error &&
        (!primaryPet || !primaryDevice) ? (
          <section className="surface-card px-6 py-5 text-sm text-slate-600">
            <p className="mb-3">
              Aún no tienes todo el onboarding completo. Completa perfil,
              mascota y dispositivo para ver el feed.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex h-9 items-center rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              Ir al onboarding
            </Link>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="display-title text-lg font-semibold text-slate-900">
              Feed interpretado
            </h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Últimas 24h
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Las lecturas duplicadas se ignoran (idempotencia por dispositivo y
            timestamp).
          </p>
          <div className="grid gap-4">
            {state.isLoading ? (
              <div className="surface-card px-6 py-5 text-sm text-slate-500">
                Cargando lecturas...
              </div>
            ) : feedCards.length ? (
              feedCards.map((card) => (
                <article
                  key={card.title}
                  className="surface-card flex flex-col gap-3 px-6 py-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {card.title}
                    </h3>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneStyles[card.tone]}`}
                    >
                      {card.tone === "ok"
                        ? "Estable"
                        : card.tone === "warning"
                        ? "Atención"
                        : "Info"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{card.description}</p>
                </article>
              ))
            ) : (
              <div className="surface-card px-6 py-5 text-sm text-slate-500">
                Aún no hay lecturas para mostrar.
              </div>
            )}
          </div>
          {state.readingsCursor ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMoreReadings}
                disabled={state.isLoadingMore}
                className="h-9 rounded-[var(--radius)] border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700"
              >
                {state.isLoadingMore ? "Cargando..." : "Cargar más"}
              </button>
            </div>
          ) : null}
        </section>

        <section className="surface-card px-6 py-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Estado del plato
            </h3>
            <button
              type="button"
              onClick={() => {
                clearTokens();
                window.location.href = "/login";
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Cerrar sesión
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-slate-200/70 bg-slate-50/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Último check-in
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatTimestamp(primaryDevice?.last_seen)}
              </p>
            </div>
            <div className="rounded-[var(--radius)] border border-slate-200/70 bg-slate-50/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Estado técnico
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {primaryDevice?.device_state ?? "Sin datos"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

