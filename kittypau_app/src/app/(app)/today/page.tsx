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
  reading: ApiReading | null;
};

const defaultState: LoadState = {
  isLoading: true,
  error: null,
  pets: [],
  devices: [],
  reading: null,
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

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setState({
        isLoading: false,
        error: "Necesitas iniciar sesión para ver tu feed.",
        pets: [],
        devices: [],
        reading: null,
      });
      return;
    }

    const load = async () => {
      try {
        const [petsRes, devicesRes] = await Promise.all([
          fetch("/api/pets", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/devices", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!petsRes.ok) {
          throw new Error("No se pudieron cargar las mascotas.");
        }
        if (!devicesRes.ok) {
          throw new Error("No se pudieron cargar los dispositivos.");
        }

        const pets = (await petsRes.json()) as ApiPet[];
        const devices = (await devicesRes.json()) as ApiDevice[];

        const primaryPet = pets[0];
        const primaryDevice =
          devices.find((device) => device.pet_id === primaryPet?.id) ??
          devices[0];

        let reading: ApiReading | null = null;
        if (primaryDevice?.id) {
          const readingsRes = await fetch(
            `/api/readings?device_id=${primaryDevice.id}&limit=1`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (readingsRes.ok) {
            const readings = (await readingsRes.json()) as ApiReading[];
            reading = readings[0] ?? null;
          }
        }

        setState({
          isLoading: false,
          error: null,
          pets,
          devices,
          reading,
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
          reading: null,
        });
      }
    };

    void load();
  }, []);

  const primaryPet = state.pets[0];
  const primaryDevice =
    state.devices.find((device) => device.pet_id === primaryPet?.id) ??
    state.devices[0];

  const feedCards = useMemo(() => {
    if (!state.reading) return [];
    const items = [];
    if (state.reading.water_ml !== null || state.reading.flow_rate !== null) {
      items.push({
        title: "Hidratación",
        description:
          state.reading.flow_rate !== null
            ? `Flujo ${state.reading.flow_rate} ml/h en la última lectura.`
            : `Consumo registrado: ${state.reading.water_ml ?? 0} ml.`,
        tone: "info",
      });
    }
    if (state.reading.weight_grams !== null) {
      items.push({
        title: "Consumo de alimento",
        description: `Peso detectado: ${state.reading.weight_grams} g.`,
        tone: "ok",
      });
    }
    if (state.reading.temperature !== null || state.reading.humidity !== null) {
      items.push({
        title: "Ambiente",
        description: `Temp ${state.reading.temperature ?? "-"}° · Humedad ${
          state.reading.humidity ?? "-"
        }%.`,
        tone: "warning",
      });
    }
    return items.slice(0, 3);
  }, [state.reading]);

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
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
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
          <div className="grid gap-4 md:grid-cols-3">
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
                {formatTimestamp(state.reading?.recorded_at)}
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

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Feed interpretado
            </h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Últimas 24h
            </span>
          </div>
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
