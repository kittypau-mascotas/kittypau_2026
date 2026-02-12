"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getValidAccessToken } from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

type ApiPet = {
  id: string;
  name: string;
  type?: string | null;
  origin?: string | null;
  age_range?: string | null;
  weight_kg?: number | null;
  activity_level?: string | null;
  pet_state?: string | null;
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

export default function PetPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editPayload, setEditPayload] = useState<Partial<ApiPet>>({});
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadPets = async (token: string) => {
    const res = await fetch(`/api/pets`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar las mascotas.");
    const payload = await res.json();
    return parseListResponse<ApiPet>(payload);
  };

  const savePet = async (token: string, petId: string, payload: Partial<ApiPet>) => {
    const res = await fetch(`/api/pets/${petId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("No se pudo actualizar la mascota.");
    return (await res.json()) as ApiPet;
  };

  const loadDevices = async (token: string) => {
    const res = await fetch(`/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar los dispositivos.");
    const payload = await res.json();
    return parseListResponse<ApiDevice>(payload);
  };

  const loadReadings = async (token: string, deviceId: string) => {
    const res = await fetch(
      `/api/readings?device_id=${deviceId}&limit=80`,
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
        const storedPetId =
          typeof window !== "undefined"
            ? window.localStorage.getItem("kittypau_pet_id")
            : null;
        const primaryPet = pets.find((pet) => pet.id === storedPetId) ?? pets[0];
        const initialPetId = primaryPet?.id ?? null;
        if (initialPetId && typeof window !== "undefined") {
          window.localStorage.setItem("kittypau_pet_id", initialPetId);
        }
        setSelectedPetId(initialPetId);
        setEditPayload(primaryPet ?? {});

        const primaryDevice =
          devices.find((device) => device.pet_id === initialPetId) ??
          devices[0];
        const readings =
          primaryDevice && initialPetId
            ? await loadReadings(token, primaryDevice.id)
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
              : "No se pudo cargar el perfil.",
        }));
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPetId) return;
    const device = state.devices.find((item) => item.pet_id === selectedPetId);
    if (!device) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    let active = true;
    const connect = async () => {
      const accessToken = await getValidAccessToken();
      if (!active || !accessToken) return;
      supabase.realtime.setAuth(accessToken);
    };
    void connect();

    const channel = supabase
      .channel(`readings:${device.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "readings",
          filter: `device_id=eq.${device.id}`,
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
      active = false;
      supabase.removeChannel(channel);
    };
  }, [selectedPetId, state.devices]);

  const selectedPet = state.pets.find((pet) => pet.id === selectedPetId);
  const petDevices = state.devices.filter(
    (device) => device.pet_id === selectedPetId
  );
  const latestReading = state.readings[0] ?? null;

  const insights = useMemo(() => {
    if (!latestReading) {
      return [
        {
          title: "Ritmo general",
          detail: "Sin lecturas suficientes aún.",
        },
        {
          title: "Hidratación",
          detail: "Sin datos recientes.",
        },
        {
          title: "Ambiente",
          detail: "Sin datos recientes.",
        },
      ];
    }

    const hydration =
      latestReading.flow_rate !== null
        ? `Flujo ${Math.round(latestReading.flow_rate)} ml/h en la última lectura.`
        : "Sin flujo registrado.";
    const rhythm =
      latestReading.weight_grams !== null
        ? `Peso detectado: ${latestReading.weight_grams} g.`
        : "Sin peso registrado.";
    const ambient =
      latestReading.temperature !== null && latestReading.humidity !== null
        ? `Temp ${latestReading.temperature}° · Humedad ${latestReading.humidity}%.`
        : "Sin mediciones ambientales.";

    return [
      { title: "Ritmo general", detail: rhythm },
      { title: "Hidratación", detail: hydration },
      { title: "Ambiente", detail: ambient },
    ];
  }, [latestReading]);

  const profileChecklist = useMemo(() => {
    if (!selectedPet) return [];
    const missing: string[] = [];
    if (!selectedPet.age_range) missing.push("Edad");
    if (!selectedPet.weight_kg) missing.push("Peso");
    if (!selectedPet.activity_level) missing.push("Actividad");
    if (!selectedPet.origin) missing.push("Origen");
    return missing;
  }, [selectedPet]);

  const profileStatus =
    profileChecklist.length === 0 ? "Perfil completo" : "Perfil incompleto";

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Perfil conductual</p>
          <h1>Mascota</h1>
        </div>
        <Link href="/today" className="ghost-link">
          Volver a hoy
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
        <div className="surface-card freeform-rise px-6 py-6">Cargando perfil...</div>
      ) : state.pets.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">Aún no tienes mascotas registradas.</p>
          <p className="empty-text">
            Completa el onboarding para crear la ficha de tu mascota.
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
          <section className="surface-card freeform-rise px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Mascota seleccionada</p>
                <p className="text-xl font-semibold text-slate-900">
                  {selectedPet?.name ?? "Sin mascota"}
                </p>
          <p className="text-xs text-slate-500">
            {selectedPet?.type ?? "sin tipo"} ·{" "}
            {selectedPet?.origin ?? "sin origen"}
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            <span>{profileStatus}</span>
            {selectedPet?.pet_state ? (
              <span className="text-slate-400">· {selectedPet.pet_state}</span>
            ) : null}
          </div>
        </div>
              <div className="flex flex-wrap items-center gap-3">
                {state.pets.length > 1 && (
                  <label className="flex flex-col text-xs text-slate-500">
                    Cambiar mascota
                    <select
                      className="mt-1 rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      value={selectedPetId ?? ""}
                      onChange={async (event) => {
                        const nextId = event.target.value || null;
                        setSelectedPetId(nextId);
                        if (nextId && typeof window !== "undefined") {
                          window.localStorage.setItem(
                            "kittypau_pet_id",
                            nextId
                          );
                        }
                        const nextPet = state.pets.find(
                          (pet) => pet.id === nextId
                        );
                        setEditPayload(nextPet ?? {});
                      const token = await getValidAccessToken();
                        if (!token || !nextId) return;
                        const device =
                          state.devices.find((item) => item.pet_id === nextId) ??
                          null;
                        if (!device) {
                          setState((prev) => ({ ...prev, readings: [] }));
                          return;
                        }
                        try {
                          const readings = await loadReadings(token, device.id);
                          setState((prev) => ({ ...prev, readings }));
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
                      {state.pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit((prev) => !prev);
                    setEditMessage(null);
                    setEditPayload(selectedPet ?? {});
                  }}
                  className="mt-4 rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {showEdit ? "Cerrar edición" : "Editar perfil"}
                </button>
              </div>
            </div>
          </section>

          {showEdit && selectedPet ? (
            <section className="surface-card freeform-rise px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Editar perfil
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="text-xs text-slate-500">
                  Nombre
                  <input
                    className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    value={editPayload.name ?? ""}
                    onChange={(event) =>
                      setEditPayload((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Edad
                  <input
                    className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    value={editPayload.age_range ?? ""}
                    onChange={(event) =>
                      setEditPayload((prev) => ({
                        ...prev,
                        age_range: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Peso (kg)
                  <input
                    type="number"
                    step="0.1"
                    className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    value={editPayload.weight_kg ?? ""}
                    onChange={(event) =>
                      setEditPayload((prev) => ({
                        ...prev,
                        weight_kg: Number(event.target.value) || null,
                      }))
                    }
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Actividad
                  <input
                    className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    value={editPayload.activity_level ?? ""}
                    onChange={(event) =>
                      setEditPayload((prev) => ({
                        ...prev,
                        activity_level: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-xs text-slate-500">
                  Origen
                  <input
                    className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                    value={editPayload.origin ?? ""}
                    onChange={(event) =>
                      setEditPayload((prev) => ({
                        ...prev,
                        origin: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <button
                  type="button"
                  className="rounded-[var(--radius)] border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                  disabled={isSaving}
                  onClick={async () => {
                    const token = await getValidAccessToken();
                    if (!token) return;
                    setIsSaving(true);
                    try {
                      const updated = await savePet(
                        token,
                        selectedPet.id,
                        editPayload
                      );
                      setState((prev) => ({
                        ...prev,
                        pets: prev.pets.map((pet) =>
                          pet.id === updated.id ? updated : pet
                        ),
                      }));
                      setEditMessage("Perfil actualizado.");
                      setShowEdit(false);
                    } catch (err) {
                      setEditMessage(
                        err instanceof Error
                          ? err.message
                          : "No se pudo guardar."
                      );
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </button>
                {editMessage ? <span>{editMessage}</span> : null}
              </div>
            </section>
          ) : null}

          <section className="surface-card freeform-rise px-6 py-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Edad
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedPet?.age_range ?? "Sin datos"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Peso
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedPet?.weight_kg
                    ? `${selectedPet.weight_kg} kg`
                    : "Sin datos"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Actividad
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedPet?.activity_level ?? "Sin datos"}
                </p>
              </div>
            </div>
            {profileChecklist.length ? (
              <div className="mt-4 rounded-[calc(var(--radius)-8px)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                <p className="font-semibold text-amber-800">
                  Completa estos datos para mejorar las interpretaciones
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profileChecklist.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-amber-200 bg-white px-2 py-1 text-[11px] font-semibold text-amber-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEdit(true);
                    setEditMessage(null);
                    setEditPayload(selectedPet ?? {});
                  }}
                  className="mt-3 rounded-[var(--radius)] border border-amber-200 bg-white px-3 py-2 text-[11px] font-semibold text-amber-700"
                >
                  Completar perfil
                </button>
              </div>
            ) : null}
          </section>

          <section className="surface-card freeform-rise px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Dispositivo asociado</p>
                <p className="text-lg font-semibold text-slate-900">
                  {petDevices[0]?.device_id ?? "Sin dispositivo"}
                </p>
                <p className="text-xs text-slate-500">
                  {petDevices[0]
                    ? `${petDevices[0].device_type} · ${petDevices[0].status}`
                    : "Conecta un dispositivo para completar el perfil."}
                </p>
                {petDevices[0]?.device_state ? (
                  <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {petDevices[0].device_state}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>
                  Última lectura:{" "}
                  {latestReading?.recorded_at
                    ? formatTimestamp(latestReading.recorded_at)
                    : "Sin datos"}
                </span>
                <Link
                  href="/bowl"
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700"
                >
                  Ver plato
                </Link>
                <Link
                  href="/story"
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700"
                >
                  Ver historia
                </Link>
                {!petDevices[0] ? (
                  <Link
                    href="/onboarding"
                    className="rounded-[var(--radius)] bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground"
                  >
                    Vincular dispositivo
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <section className="surface-card freeform-rise px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Insights recientes
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {insights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[calc(var(--radius)-6px)] border border-slate-200 px-4 py-3 text-sm text-slate-600"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {item.title}
                  </p>
                  <p className="mt-2 text-slate-700">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}




