"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getAccessToken } from "@/lib/auth/token";

type ApiPet = {
  id: string;
  name: string;
};

type ApiDevice = {
  id: string;
  pet_id: string;
  device_code: string;
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

  return {
    title,
    detail: facts.length > 0 ? facts.join(" · ") : "Sin métricas detalladas.",
    tone,
  };
};

export default function StoryPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

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
      `${apiBase}/api/readings?device_id=${deviceId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error("No se pudieron cargar las lecturas.");
    return (await res.json()) as ApiReading[];
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

  const timeline = useMemo(() => {
    return state.readings.slice(0, 24).map((reading) => ({
      ...reading,
      story: buildStory(reading),
    }));
  }, [state.readings]);

  const selectedDevice = state.devices.find(
    (device) => device.id === selectedDeviceId
  );
  const selectedPet = state.pets.find(
    (pet) => pet.id === selectedDevice?.pet_id
  );

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
        <div className="alert alert-error">{state.error}</div>
      )}

      {state.isLoading ? (
        <div className="surface-card px-6 py-6">Cargando historia...</div>
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
                    ? `${selectedDevice.device_type} · ${selectedDevice.device_code}`
                    : "Sin dispositivo"}
                </p>
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
                        {device.device_code}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>

          <section className="story-list">
            {timeline.length === 0 ? (
              <div className="surface-card px-6 py-6 text-sm text-slate-500">
                Aún no hay historia para mostrar.
              </div>
            ) : (
              timeline.map((item) => (
                <article key={item.id} className="story-card">
                  <div className="story-time">
                    {formatTimestamp(item.recorded_at)}
                  </div>
                  <div className={`story-dot tone-${item.story.tone}`} />
                  <div className="story-content">
                    <h3>{item.story.title}</h3>
                    <p>{item.story.detail}</p>
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
