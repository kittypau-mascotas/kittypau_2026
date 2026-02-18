"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";
import { authFetch } from "@/lib/auth/auth-fetch";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import BatteryStatusIcon from "@/lib/ui/battery-status-icon";

type ApiPet = {
  id: string;
  name: string;
  pet_state?: string | null;
};

type ApiProfile = {
  user_name?: string | null;
  owner_name?: string | null;
  is_owner?: boolean | null;
  photo_url?: string | null;
};

type ApiDevice = {
  id: string;
  pet_id: string;
  device_id: string;
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

type StatCard = {
  label: string;
  value: string;
  icon?: string;
};

type LoadState = {
  isLoading: boolean;
  error: string | null;
  pets: ApiPet[];
  devices: ApiDevice[];
  profile: ApiProfile | null;
  readings: ApiReading[];
  readingsCursor: string | null;
  isLoadingMore: boolean;
};

const defaultState: LoadState = {
  isLoading: true,
  error: null,
  pets: [],
  devices: [],
  profile: null,
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
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    getValidAccessToken().then((value) => {
      if (mounted) setIsAuthed(Boolean(value));
    });
    return () => {
      mounted = false;
    };
  }, []);

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

  const parseProfile = (payload: unknown): ApiProfile | null => {
    if (!payload || typeof payload !== "object") return null;
    if (Array.isArray(payload)) {
      return (payload[0] as ApiProfile) ?? null;
    }
    return payload as ApiProfile;
  };

  const loadReadings = async (deviceId: string, cursor?: string | null) => {
    const params = new URLSearchParams({
      device_id: deviceId,
      limit: "50",
    });
    if (cursor) params.set("cursor", cursor);
    const res = await authFetch(`/api/readings?${params.toString()}`);
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
    if (isAuthed === false) {
      setState({
        isLoading: false,
        error: "Necesitas iniciar sesión para ver tu feed.",
        pets: [],
        devices: [],
        profile: null,
        readings: [],
        readingsCursor: null,
        isLoadingMore: false,
      });
      return;
    }

    if (isAuthed === null) return;

    const load = async () => {
      try {
        const [petsRes, devicesRes, profileRes] = await Promise.all([
          authFetch("/api/pets?limit=20"),
          authFetch("/api/devices?limit=20"),
          authFetch("/api/profiles"),
        ]);

        if (!petsRes.ok) {
          throw new Error("No se pudieron cargar las mascotas.");
        }
        if (!devicesRes.ok) {
          throw new Error("No se pudieron cargar los dispositivos.");
        }
        if (!profileRes.ok) {
          throw new Error("No se pudo cargar el perfil.");
        }

        const petsPayload = await petsRes.json();
        const devicesPayload = await devicesRes.json();
        const profilePayload = await profileRes.json();

        const pets = parseListResponse<ApiPet>(petsPayload);
        const devices = parseListResponse<ApiDevice>(devicesPayload);
        const profile = parseProfile(profilePayload);

        const primaryPet = pets[0];
        const storedDeviceId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("kittypau_device_id")
            : null;
        const primaryDevice =
          devices.find((device) => device.id === storedDeviceId) ??
          devices.find((device) => device.pet_id === primaryPet?.id) ??
          devices[0];

        let readings: ApiReading[] = [];
        let readingsCursor: string | null = null;
        const initialDeviceId = primaryDevice?.id ?? null;
        setSelectedDeviceId(initialDeviceId);
        if (initialDeviceId && typeof window !== "undefined") {
          window.localStorage.setItem("kittypau_device_id", initialDeviceId);
        }
        if (initialDeviceId) {
          const result = await loadReadings(initialDeviceId);
          readings = result.data;
          readingsCursor = result.nextCursor;
          setLastRefreshAt(new Date().toISOString());
        }

        setState({
          isLoading: false,
          error: null,
          pets,
          devices,
          profile,
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
          profile: null,
          readings: [],
          readingsCursor: null,
          isLoadingMore: false,
        });
      }
    };

    void load();
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed || typeof window === "undefined") return;
    const seen = window.localStorage.getItem("kittypau_guide_seen");
    if (!seen) {
      setShowGuide(true);
    }
  }, [isAuthed]);

  useEffect(() => {
    if (!selectedDeviceId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const connect = async () => {
      const accessToken = await getValidAccessToken();
      if (!active || !accessToken) return;
      supabase.realtime.setAuth(accessToken);

      channel = supabase
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
            setLastRefreshAt(new Date().toISOString());
            setRefreshError(null);
          }
        )
        .subscribe();
    };

    void connect();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedDeviceId]);

  const loadMoreReadings = async () => {
    const deviceId = selectedDeviceId;
    if (!deviceId || !state.readingsCursor || state.isLoadingMore) {
      return;
    }
    setState((prev) => ({ ...prev, isLoadingMore: true }));
    try {
      const result = await loadReadings(deviceId, state.readingsCursor);
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
  const ownerLabel =
    state.profile?.owner_name ||
    state.profile?.user_name ||
    "tu";
  const petLabel = primaryPet?.name ?? "tu mascota";
  const primaryDevice =
    state.devices.find((device) => device.id === selectedDeviceId) ??
    state.devices.find((device) => device.pet_id === primaryPet?.id) ??
    state.devices[0];
  const latestReading = state.readings[0] ?? null;
  const freshnessLabel = useMemo(() => {
    if (!latestReading?.recorded_at) return "Sin datos";
    const ts = new Date(latestReading.recorded_at).getTime();
    if (Number.isNaN(ts)) return "Sin datos";
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin <= 2) return "Muy reciente";
    if (diffMin <= 10) return "Reciente";
    if (diffMin <= 30) return "Moderado";
    return "Desactualizado";
  }, [latestReading?.recorded_at]);

  const summaryText = useMemo(() => {
    if (!latestReading) {
      return `Aún no hay lecturas para ${petLabel}. Revisa el plato y vuelve aquí.`;
    }
    if (latestReading.flow_rate !== null && latestReading.flow_rate >= 140) {
      return `Hidratación elevada detectada hoy en ${petLabel}.`;
    }
    if (latestReading.weight_grams !== null && latestReading.weight_grams >= 3500) {
      return `Consumo estable en el último registro de ${petLabel}.`;
    }
    if (latestReading.temperature !== null && latestReading.temperature >= 26) {
      return `Ambiente cálido, atento a la hidratación de ${petLabel}.`;
    }
    return "Ritmo dentro de lo esperado.";
  }, [latestReading, petLabel]);

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
        icon: "/illustrations/water.png",
      });
    }
    if (latestReading.weight_grams !== null) {
      items.push({
        title: "Consumo de alimento",
        description: `Peso detectado: ${latestReading.weight_grams} g.`,
        tone: "ok",
        icon: "/illustrations/food.png",
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

  const quickStats = useMemo(() => {
    if (!latestReading) {
      return [
        { label: "Hidratación", value: "Sin datos", icon: "/illustrations/water.png" },
        { label: "Alimento", value: "Sin datos", icon: "/illustrations/food.png" },
        { label: "Ambiente", value: "Sin datos" },
      ] as StatCard[];
    }
    const hydration =
      latestReading.flow_rate !== null
        ? `${Math.round(latestReading.flow_rate)} ml/h`
        : "Sin flujo";
    const food =
      latestReading.weight_grams !== null
        ? `${latestReading.weight_grams} g`
        : "Sin peso";
    const ambient =
      latestReading.temperature !== null && latestReading.humidity !== null
        ? `${latestReading.temperature}° · ${latestReading.humidity}%`
        : "Sin ambiente";
    return [
      { label: "Hidratación", value: hydration, icon: "/illustrations/water.png" },
      { label: "Alimento", value: food, icon: "/illustrations/food.png" },
      { label: "Ambiente", value: ambient },
    ] as StatCard[];
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
              <p className="mt-1 text-sm text-slate-500">
                Hola {ownerLabel}, aquí tienes el resumen de {petLabel}.
              </p>
              <p className="mt-2 text-sm text-slate-500">{summaryText}</p>
            </div>
            <div className="surface-card freeform-rise flex items-center gap-4 px-4 py-3">
              <img
                src={state.profile?.photo_url || "/avatar_1.png"}
                alt="Avatar"
                className="h-12 w-12 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {state.profile?.owner_name ||
                    state.profile?.user_name ||
                    "Tu cuenta"}
                </p>
                <p className="text-xs text-slate-500">
                  {primaryPet?.name ?? "Sin mascota"}
                  {primaryDevice ? ` · ${primaryDevice.device_id}` : ""}
                </p>
                {state.devices.length > 1 ? (
                  <select
                    className="mt-2 h-8 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-2 text-[11px] text-slate-600"
                    value={primaryDevice?.id ?? ""}
                    onChange={async (event) => {
                      const nextId = event.target.value || null;
                      setSelectedDeviceId(nextId);
                      if (nextId && typeof window !== "undefined") {
                        window.localStorage.setItem("kittypau_device_id", nextId);
                      }
                      if (!nextId) return;
                      try {
                        const result = await loadReadings(nextId);
                        setState((prev) => ({
                          ...prev,
                          readings: result.data,
                          readingsCursor: result.nextCursor,
                        }));
                        setLastRefreshAt(new Date().toISOString());
                        setRefreshError(null);
                      } catch (err) {
                        setState((prev) => ({
                          ...prev,
                          error:
                            err instanceof Error
                              ? err.message
                              : "No se pudieron cargar las lecturas.",
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
                ) : null}
              </div>
            </div>
          </div>
          <div className="stagger grid gap-4 md:grid-cols-3">
            <div className="surface-card freeform-rise px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Estado general
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {primaryDevice?.status ?? "Sin datos"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {primaryDevice?.device_state ?? "Sin estado técnico"}
              </p>
            </div>
            <div className="surface-card freeform-rise px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Última lectura
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatTimestamp(latestReading?.recorded_at)}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {freshnessLabel}
              </p>
            </div>
            <div className="surface-card freeform-rise px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Batería
              </p>
              <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <BatteryStatusIcon level={primaryDevice?.battery_level} className="h-5 w-5" />
                {primaryDevice?.battery_level !== null &&
                primaryDevice?.battery_level !== undefined
                  ? `${primaryDevice.battery_level}%`
                  : "Sin datos"}
              </p>
            </div>
          </div>
        </header>

        <section className="surface-card freeform-rise px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Insight principal
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {summaryText}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Frescura: {freshnessLabel}
              </p>
            </div>
            <Link
              href="/story"
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Abrir diario
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
            <Link
              href="/pet"
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
            >
              Ver perfil mascota
            </Link>
            <Link
              href="/bowl"
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
            >
              Estado del plato
            </Link>
            <Link
              href="/settings"
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
            >
              Ajustes
            </Link>
          </div>
        </section>

        <section className="surface-card freeform-rise px-6 py-5">
          <div className="grid gap-4 md:grid-cols-3">
            {quickStats.map((stat) => (
              <div
                key={stat.label}
                className="relative rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 pr-20 text-sm text-slate-600 md:pr-24"
              >
                {stat.icon ? (
                  <div className="absolute inset-y-3 right-4 flex w-16 items-center justify-center md:w-20">
                    <img
                      src={stat.icon}
                      alt=""
                      aria-hidden="true"
                      className="max-h-full max-w-full object-contain opacity-95"
                    />
                  </div>
                ) : null}
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card freeform-rise px-6 py-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Última actualización:{" "}
              {lastRefreshAt ? formatTimestamp(lastRefreshAt) : "Sin datos"}
            </span>
            <button
              type="button"
              onClick={async () => {
                if (!selectedDeviceId) return;
                setIsRefreshing(true);
                try {
                  const result = await loadReadings(selectedDeviceId);
                  setState((prev) => ({
                    ...prev,
                    readings: result.data,
                    readingsCursor: result.nextCursor,
                  }));
                  setLastRefreshAt(new Date().toISOString());
                  setRefreshError(null);
                } catch (err) {
                  setRefreshError(
                    err instanceof Error
                      ? err.message
                      : "No se pudieron cargar las lecturas."
                  );
                } finally {
                  setIsRefreshing(false);
                }
              }}
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {isRefreshing ? "Actualizando..." : "Actualizar lecturas"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
              Frescura: {freshnessLabel}
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600">
              Últimas 24h
            </span>
          </div>
          {refreshError ? (
            <p className="mt-2 text-xs text-rose-600">{refreshError}</p>
          ) : null}
        </section>

        {state.error ? (
          <section className="surface-card freeform-rise px-6 py-6 text-sm text-slate-600">
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
          <section className="surface-card freeform-rise px-6 py-5 text-sm text-slate-600">
            <p className="mb-3">
              Aún no tienes todo el registro completo. Completa perfil,
              mascota y dispositivo para ver el feed. 
            </p> 
            <Link 
              href="/registro" 
              className="inline-flex h-9 items-center rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground" 
            > 
              Ir al registro 
            </Link> 
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="display-title text-lg font-semibold text-slate-900">
              Feed interpretado
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Últimas 24h
              </span>
              <Link
                href="/story"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Ver diario
              </Link>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Las lecturas duplicadas se ignoran (idempotencia por dispositivo y
            timestamp).
          </p>
          <div className="grid gap-4">
            {state.isLoading ? (
              <div className="surface-card freeform-rise px-6 py-5">
                <div className="space-y-3">
                  <div className="h-3 w-24 rounded-full bg-slate-200/70" />
                  <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
                  <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
                  <div className="h-10 w-full rounded-[var(--radius)] bg-slate-100" />
                </div>
              </div>
            ) : feedCards.length ? (
              feedCards.map((card) => (
                <article
                  key={card.title}
                  className="surface-card freeform-rise flex flex-col gap-3 px-6 py-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {card.icon ? (
                        <img
                          src={card.icon}
                          alt=""
                          aria-hidden="true"
                          className="h-9 w-9 rounded-[14px] border border-slate-200 bg-white object-contain p-1"
                        />
                      ) : null}
                      <h3 className="text-lg font-semibold text-slate-900">
                        {card.title}
                      </h3>
                    </div>
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
              <div className="surface-card freeform-rise px-6 py-5 text-sm text-slate-500">
                Aún no hay lecturas para mostrar.
                <span className="mt-2 block text-xs text-slate-400">
                  Cuando el plato envíe datos, aquí verás un resumen claro.
                </span>
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

        <section className="surface-card freeform-rise px-6 py-5">
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
      {showGuide ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-10">
          <div className="surface-card freeform-rise w-full max-w-lg px-6 py-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Modo guía
            </p>
            <h2 className="display-title mt-2 text-2xl font-semibold text-slate-900">
              Bienvenido a Hoy en casa
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Aquí verás cuánto come {petLabel}. También verás el estado del
              plato y comentarios personalizados para {ownerLabel}.
            </p>
            <div className="mt-5 grid gap-3 text-xs text-slate-600">
              <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2">
                Consejo: usa “Ver diario” para ver eventos del día.
              </div>
              <div className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2">
                Consejo: revisa “Perfil conductual” para ajustes de mascota.
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("kittypau_guide_seen", "1");
                  }
                  setShowGuide(false);
                }}
                className="h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
              >
                Entendido
              </button>
              <Link
                href="/registro"
                className="h-10 rounded-[var(--radius)] border border-slate-200 px-4 text-xs font-semibold text-slate-700" 
                onClick={() => { 
                  if (typeof window !== "undefined") { 
                    window.localStorage.setItem("kittypau_guide_seen", "1"); 
                  } 
                  setShowGuide(false); 
                }} 
              > 
                Completar registro 
              </Link> 
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



