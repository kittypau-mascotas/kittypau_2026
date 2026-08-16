"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getValidAccessToken, signOutSession } from "@/lib/auth/token";
import { chileCompactDatetime } from "@/lib/time/chile";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { syncSelectedPet } from "@/lib/runtime/selection-sync";
import Alert from "@/app/_components/alert";
import EmptyState from "@/app/_components/empty-state";
import OperationalActionsCard from "@/app/_components/operational-actions-card";
import HungerBarCard from "@/app/_components/hunger-bar-card";
import DiagnosticoRapidoCard from "@/app/_components/diagnostico-rapido-card";
import PageLoadingSkeleton from "@/app/_components/page-loading-skeleton";
import OnboardingTip from "@/app/_components/onboarding-tip";
import { scheduleHungerBarAlert } from "@/lib/hooks/useHungerBarPushAlert";
import {
  parseListResponse,
  resolveDevicePowerState,
  devicePowerStateLabel,
} from "@/lib/utils/api";
import {
  getConnectionHint,
  getActionNotes,
  getBatterySummary,
} from "@/lib/device-diagnostics";

type ApiPet = {
  id: string;
  name: string;
  type?: string | null;
  origin?: string | null;
  age_range?: string | null;
  weight_kg?: number | null;
  activity_level?: string | null;
  pet_state?: string | null;
  food_normal_min_g?: number | null;
  food_normal_max_g?: number | null;
  water_normal_min_ml?: number | null;
  water_normal_max_ml?: number | null;
  sex?: string | null;
  microchip_number?: string | null;
  birth_date?: string | null;
  intake_date?: string | null;
  health_profile?: Record<string, unknown> | null;
  feeding_profile?: Record<string, unknown> | null;
  health_profile_completed_at?: string | null;
  feeding_profile_completed_at?: string | null;
};

type ApiDevice = {
  id: string;
  pet_id: string;
  device_id: string;
  device_type: string;
  status: string;
  device_state: string | null;
  battery_level?: number | null;
  battery_voltage?: number | null;
  battery_source?: string | null;
  battery_is_estimated?: boolean | null;
  last_seen?: string | null;
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

const formatTimestamp = (value: string) => chileCompactDatetime(value);

const toRoundedSensorValue = (
  value: number | null | undefined,
): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value))
    return null;
  return Math.round(value);
};

export default function PetPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editPayload, setEditPayload] = useState<Partial<ApiPet>>({});
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Ficha Detallada — Salud y Alimentación (spec 002 User Story 6). Se guardan por
  // sección, cada una con su propio botón — no hay un solo "guardar todo".
  const [showHealth, setShowHealth] = useState(false);
  const [healthForm, setHealthForm] = useState<Record<string, string>>({});
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [isSavingHealth, setIsSavingHealth] = useState(false);
  const [healthMessage, setHealthMessage] = useState<string | null>(null);

  const [showFeeding, setShowFeeding] = useState(false);
  const [feedingForm, setFeedingForm] = useState<Record<string, string>>({});
  const [isSavingFeeding, setIsSavingFeeding] = useState(false);
  const [feedingMessage, setFeedingMessage] = useState<string | null>(null);

  const loadPets = async (token: string) => {
    const res = await fetch(`/api/pets`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar las mascotas.");
    const payload = await res.json();
    return parseListResponse<ApiPet>(payload);
  };

  const savePet = async (
    token: string,
    petId: string,
    payload: Partial<ApiPet>,
  ) => {
    const res = await fetch(`/api/pets/${petId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(
        errBody?.message ?? errBody?.error ?? `Error ${res.status}`,
      );
    }
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
    const res = await fetch(`/api/readings?device_id=${deviceId}&limit=80`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("No se pudieron cargar las lecturas.");
    const payload = await res.json();
    return parseListResponse<ApiReading>(payload);
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const token = await getValidAccessToken();
      if (!token) {
        await signOutSession();
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
        const primaryPet =
          pets.find((pet) => pet.id === storedPetId) ?? pets[0];
        const initialPetId = primaryPet?.id ?? null;
        if (initialPetId) {
          syncSelectedPet(initialPetId, primaryPet?.name ?? "");
        }
        setSelectedPetId(initialPetId);
        setEditPayload(primaryPet ?? {});

        const primaryDevice =
          devices.find(
            (device) =>
              device.pet_id === initialPetId &&
              (device.device_type ?? "").toLowerCase().includes("food"),
          ) ??
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
            err instanceof Error ? err.message : "No se pudo cargar el perfil.",
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
              (reading) => reading.id === nextReading.id,
            );
            if (exists) return prev;
            return {
              ...prev,
              readings: [nextReading, ...prev.readings].slice(0, 120),
            };
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [selectedPetId, state.devices]);

  const selectedPet = state.pets.find((pet) => pet.id === selectedPetId);
  const petDevices = state.devices.filter(
    (device) => device.pet_id === selectedPetId,
  );
  // device_type real en producción es "comedero"/"bebedero" (español), no solo el enum
  // legacy "food_bowl"/"water_bowl" — ver Knowledge/01_Proyecto/ENUMS_OFICIALES. Sin este
  // match, ambos caían al fallback por posición (petDevices[0]/[1]), que asigna
  // Comedero/Bebedero por orden de llegada en vez de por tipo real.
  const petFoodDevice =
    petDevices.find((device) => {
      const t = (device.device_type ?? "").toLowerCase();
      return t.includes("food") || t.includes("comedero");
    }) ??
    petDevices[0] ??
    null;
  const petWaterDevice =
    petDevices.find((device) => {
      const t = (device.device_type ?? "").toLowerCase();
      return t.includes("water") || t.includes("bebedero");
    }) ?? (petDevices.length > 1 ? petDevices[1] : null);
  const latestReading = state.readings[0] ?? null;

  // Diagnóstico rápido (SPEC_02 U2) — mismo patrón de /bowl, generalizado.
  const foodDiagnostics = {
    connectionHint: getConnectionHint(petFoodDevice?.last_seen ?? null),
    actionNotes: getActionNotes({
      batteryLevel: petFoodDevice?.battery_level ?? null,
      lastSeen: petFoodDevice?.last_seen ?? null,
    }),
    ...getBatterySummary({
      level: petFoodDevice?.battery_level ?? null,
      voltage: petFoodDevice?.battery_voltage ?? null,
      source: petFoodDevice?.battery_source ?? null,
      isEstimated: petFoodDevice?.battery_is_estimated ?? false,
    }),
  };
  const waterDiagnostics = {
    connectionHint: getConnectionHint(petWaterDevice?.last_seen ?? null),
    actionNotes: getActionNotes({
      batteryLevel: petWaterDevice?.battery_level ?? null,
      lastSeen: petWaterDevice?.last_seen ?? null,
    }),
    ...getBatterySummary({
      level: petWaterDevice?.battery_level ?? null,
      voltage: petWaterDevice?.battery_voltage ?? null,
      source: petWaterDevice?.battery_source ?? null,
      isEstimated: petWaterDevice?.battery_is_estimated ?? false,
    }),
  };

  const insights = useMemo(() => {
    if (!latestReading) {
      return [
        {
          title: "Ritmo general",
          detail:
            "Todavía no hay lecturas suficientes para describir la rutina.",
        },
        {
          title: "Hidratación",
          detail:
            "Cuando el bebedero envíe actividad, aquí verás el ritmo de agua.",
        },
        {
          title: "Ambiente",
          detail:
            "La temperatura y humedad aparecerán cuando haya lecturas recientes.",
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
        ? `Temp ${toRoundedSensorValue(latestReading.temperature)}° · Humedad ${toRoundedSensorValue(
            latestReading.humidity,
          )}%.`
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
      <OnboardingTip
        screen="pet"
        title="Perfil de tu mascota"
        intro="Acá ves su barra de hambre, el diagnóstico del sensor y los platos asociados."
        tips={[
          "Consejo: la Barra de hambre te dice cuánto falta para la próxima comida esperada.",
          "Consejo: el Diagnóstico rápido distingue si el problema es tu mascota o el sensor.",
        ]}
      />
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

      {state.isLoading ? (
        <PageLoadingSkeleton
          label="Cargando perfil y lecturas recientes... Estamos armando la ficha de tu mascota y vinculando el último historial disponible."
          lines={4}
        />
      ) : state.pets.length === 0 ? (
        <EmptyState
          title="Aún no tienes mascotas registradas."
          actions={
            <Link
              href="/registro"
              className="rounded-[var(--radius)] bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Ir a registro
            </Link>
          }
        >
          Completa el registro para crear la ficha de tu mascota.
        </EmptyState>
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
                    <span className="text-slate-400">
                      · {selectedPet.pet_state}
                    </span>
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
                        const nextPet = state.pets.find(
                          (pet) => pet.id === nextId,
                        );
                        if (nextId) {
                          syncSelectedPet(nextId, nextPet?.name ?? "");
                        }
                        setEditPayload(nextPet ?? {});
                        const token = await getValidAccessToken();
                        if (!token || !nextId) return;
                        const device =
                          state.devices.find(
                            (item) =>
                              item.pet_id === nextId &&
                              (item.device_type ?? "")
                                .toLowerCase()
                                .includes("food"),
                          ) ??
                          state.devices.find(
                            (item) => item.pet_id === nextId,
                          ) ??
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
            // <form> real (antes <section> con <input> sueltos) — Enter no guardaba
            // y los password managers no detectaban el formulario (ver SPEC_02 I4).
            <form
              className="surface-card freeform-rise px-6 py-5"
              onSubmit={async (event) => {
                event.preventDefault();
                const token = await getValidAccessToken();
                if (!token) return;
                setIsSaving(true);
                try {
                  // Excluir campos inmutables antes de enviar
                  const { type, id, pet_state, ...sendPayload } = editPayload;
                  void type;
                  void id;
                  void pet_state;
                  const updated = await savePet(
                    token,
                    selectedPet.id,
                    sendPayload,
                  );
                  setState((prev) => ({
                    ...prev,
                    pets: prev.pets.map((pet) =>
                      pet.id === updated.id ? updated : pet,
                    ),
                  }));
                  setEditMessage("Perfil actualizado.");
                  setShowEdit(false);
                } catch (err) {
                  setEditMessage(
                    err instanceof Error ? err.message : "No se pudo guardar.",
                  );
                } finally {
                  setIsSaving(false);
                }
              }}
            >
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

              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Límites de consumo normal
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Define el rango que consideras normal. Las sesiones fuera del
                  rango aparecerán como bajo o elevado en la Historia.
                </p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Comida (g)
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 text-xs text-slate-500">
                        Mínimo
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          placeholder="ej. 90"
                          className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={editPayload.food_normal_min_g ?? ""}
                          onChange={(event) =>
                            setEditPayload((prev) => ({
                              ...prev,
                              food_normal_min_g: event.target.value
                                ? Number(event.target.value)
                                : null,
                            }))
                          }
                        />
                      </label>
                      <span className="mt-5 text-slate-300">—</span>
                      <label className="flex-1 text-xs text-slate-500">
                        Máximo
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          placeholder="ej. 150"
                          className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={editPayload.food_normal_max_g ?? ""}
                          onChange={(event) =>
                            setEditPayload((prev) => ({
                              ...prev,
                              food_normal_max_g: event.target.value
                                ? Number(event.target.value)
                                : null,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                      Agua (ml)
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 text-xs text-slate-500">
                        Mínimo
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          placeholder="ej. 50"
                          className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={editPayload.water_normal_min_ml ?? ""}
                          onChange={(event) =>
                            setEditPayload((prev) => ({
                              ...prev,
                              water_normal_min_ml: event.target.value
                                ? Number(event.target.value)
                                : null,
                            }))
                          }
                        />
                      </label>
                      <span className="mt-5 text-slate-300">—</span>
                      <label className="flex-1 text-xs text-slate-500">
                        Máximo
                        <input
                          type="number"
                          min="0"
                          max="10000"
                          placeholder="ej. 200"
                          className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={editPayload.water_normal_max_ml ?? ""}
                          onChange={(event) =>
                            setEditPayload((prev) => ({
                              ...prev,
                              water_normal_max_ml: event.target.value
                                ? Number(event.target.value)
                                : null,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <button
                  type="submit"
                  className="rounded-[var(--radius)] border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </button>
                {editMessage ? <span>{editMessage}</span> : null}
              </div>
            </form>
          ) : null}

          {selectedPet ? (
            <section className="surface-card freeform-rise px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Salud
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedPet.health_profile_completed_at
                      ? "Completa — podés actualizarla cuando quieras."
                      : "Pendiente — completala cuando quieras, no bloquea nada."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHealth((prev) => !prev);
                    setHealthMessage(null);
                    const profile = (selectedPet.health_profile ??
                      {}) as Record<string, unknown>;
                    setHealthForm({
                      peso_ideal_kg: String(profile.peso_ideal_kg ?? ""),
                      condiciones_otra: String(profile.condiciones_otra ?? ""),
                      alergias: String(profile.alergias ?? ""),
                      medicamentos: String(profile.medicamentos ?? ""),
                      tratamientos: String(profile.tratamientos ?? ""),
                      cirugias: String(profile.cirugias ?? ""),
                      vacunas: String(profile.vacunas ?? ""),
                      desparasitacion_ultima_fecha: String(
                        profile.desparasitacion_ultima_fecha ?? "",
                      ),
                      historial_veterinario: String(
                        profile.historial_veterinario ?? "",
                      ),
                      ultimo_control_fecha: String(
                        profile.ultimo_control_fecha ?? "",
                      ),
                    });
                    setHealthConditions(
                      Array.isArray(profile.condiciones_diagnosticadas)
                        ? (profile.condiciones_diagnosticadas as string[])
                        : [],
                    );
                  }}
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {showHealth ? "Cerrar" : "Completar Salud"}
                </button>
              </div>

              {showHealth ? (
                <form
                  className="mt-4 space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const token = await getValidAccessToken();
                    if (!token) return;
                    setIsSavingHealth(true);
                    try {
                      const updated = await savePet(token, selectedPet.id, {
                        health_profile: {
                          ...healthForm,
                          condiciones_diagnosticadas: healthConditions,
                        },
                        health_profile_completed_at: new Date().toISOString(),
                      });
                      setState((prev) => ({
                        ...prev,
                        pets: prev.pets.map((pet) =>
                          pet.id === updated.id ? updated : pet,
                        ),
                      }));
                      setHealthMessage("Sección de Salud guardada.");
                      setShowHealth(false);
                    } catch (err) {
                      setHealthMessage(
                        err instanceof Error
                          ? err.message
                          : "No se pudo guardar.",
                      );
                    } finally {
                      setIsSavingHealth(false);
                    }
                  }}
                >
                  <label className="block text-xs text-slate-500">
                    Peso ideal (kg)
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                      value={healthForm.peso_ideal_kg ?? ""}
                      onChange={(event) =>
                        setHealthForm((prev) => ({
                          ...prev,
                          peso_ideal_kg: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div>
                    <p className="text-xs text-slate-500">
                      Condiciones de salud diagnosticadas
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {[
                        { value: "renal", label: "Renal" },
                        { value: "diabetes", label: "Diabetes" },
                        { value: "obesidad", label: "Obesidad" },
                        { value: "cardiaca", label: "Cardíaca" },
                        { value: "otra", label: "Otra" },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-1.5 text-xs text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={healthConditions.includes(option.value)}
                            onChange={(event) =>
                              setHealthConditions((prev) =>
                                event.target.checked
                                  ? [...prev, option.value]
                                  : prev.filter((v) => v !== option.value),
                              )
                            }
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    {healthConditions.includes("otra") ? (
                      <input
                        type="text"
                        placeholder="Detalle de la condición"
                        className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        value={healthForm.condiciones_otra ?? ""}
                        onChange={(event) =>
                          setHealthForm((prev) => ({
                            ...prev,
                            condiciones_otra: event.target.value,
                          }))
                        }
                      />
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {(
                      [
                        ["alergias", "Alergias"],
                        ["medicamentos", "Medicamentos"],
                        ["tratamientos", "Tratamientos"],
                        ["cirugias", "Cirugías"],
                        ["vacunas", "Vacunas"],
                        ["historial_veterinario", "Historial veterinario"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block text-xs text-slate-500">
                        {label}
                        <textarea
                          className="mt-1 min-h-[60px] w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={healthForm[key] ?? ""}
                          onChange={(event) =>
                            setHealthForm((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-xs text-slate-500">
                      Última desparasitación
                      <input
                        type="date"
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        value={healthForm.desparasitacion_ultima_fecha ?? ""}
                        onChange={(event) =>
                          setHealthForm((prev) => ({
                            ...prev,
                            desparasitacion_ultima_fecha: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs text-slate-500">
                      Último control veterinario
                      <input
                        type="date"
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        value={healthForm.ultimo_control_fecha ?? ""}
                        onChange={(event) =>
                          setHealthForm((prev) => ({
                            ...prev,
                            ultimo_control_fecha: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <button
                      type="submit"
                      disabled={isSavingHealth}
                      className="rounded-[var(--radius)] border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                    >
                      {isSavingHealth
                        ? "Guardando..."
                        : "Guardar sección de Salud"}
                    </button>
                  </div>
                </form>
              ) : null}
              {healthMessage ? (
                <p className="mt-2 text-xs text-slate-500">{healthMessage}</p>
              ) : null}
            </section>
          ) : null}

          {selectedPet ? (
            <section className="surface-card freeform-rise px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Alimentación
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedPet.feeding_profile_completed_at
                      ? "Completa — podés actualizarla cuando quieras."
                      : "Pendiente — completala cuando quieras, no bloquea nada."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowFeeding((prev) => !prev);
                    setFeedingMessage(null);
                    const profile = (selectedPet.feeding_profile ??
                      {}) as Record<string, unknown>;
                    const premios = (profile.premios ?? {}) as Record<
                      string,
                      unknown
                    >;
                    setFeedingForm({
                      tipo_alimento: String(profile.tipo_alimento ?? ""),
                      marca: String(profile.marca ?? ""),
                      formula: String(profile.formula ?? ""),
                      cantidad_diaria_g: String(
                        profile.cantidad_diaria_g ?? "",
                      ),
                      comidas_dia: String(profile.comidas_dia ?? ""),
                      horarios: String(profile.horarios ?? ""),
                      premios_aplica: premios.aplica ? "true" : "false",
                      premios_detalle: String(premios.detalle ?? ""),
                      restricciones_alimentarias: String(
                        profile.restricciones_alimentarias ?? "",
                      ),
                    });
                  }}
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {showFeeding ? "Cerrar" : "Completar Alimentación"}
                </button>
              </div>

              {showFeeding ? (
                <form
                  className="mt-4 space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const token = await getValidAccessToken();
                    if (!token) return;
                    setIsSavingFeeding(true);
                    try {
                      const {
                        premios_aplica,
                        premios_detalle,
                        ...restFeeding
                      } = feedingForm;
                      const updated = await savePet(token, selectedPet.id, {
                        feeding_profile: {
                          ...restFeeding,
                          premios: {
                            aplica: premios_aplica === "true",
                            detalle: premios_detalle ?? "",
                          },
                        },
                        feeding_profile_completed_at: new Date().toISOString(),
                      });
                      setState((prev) => ({
                        ...prev,
                        pets: prev.pets.map((pet) =>
                          pet.id === updated.id ? updated : pet,
                        ),
                      }));
                      setFeedingMessage("Sección de Alimentación guardada.");
                      setShowFeeding(false);
                    } catch (err) {
                      setFeedingMessage(
                        err instanceof Error
                          ? err.message
                          : "No se pudo guardar.",
                      );
                    } finally {
                      setIsSavingFeeding(false);
                    }
                  }}
                >
                  <label className="block text-xs text-slate-500">
                    Tipo de alimento
                    <select
                      className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                      value={feedingForm.tipo_alimento ?? ""}
                      onChange={(event) =>
                        setFeedingForm((prev) => ({
                          ...prev,
                          tipo_alimento: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecciona</option>
                      <option value="seco">Seco</option>
                      <option value="humedo">Húmedo</option>
                      <option value="mixto">Mixto</option>
                    </select>
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-xs text-slate-500">
                      Marca
                      <input
                        type="text"
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        value={feedingForm.marca ?? ""}
                        onChange={(event) =>
                          setFeedingForm((prev) => ({
                            ...prev,
                            marca: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs text-slate-500">
                      Fórmula / variedad
                      <input
                        type="text"
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        value={feedingForm.formula ?? ""}
                        onChange={(event) =>
                          setFeedingForm((prev) => ({
                            ...prev,
                            formula: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs text-slate-500">
                      Cantidad diaria (g)
                      <input
                        type="number"
                        min="0"
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        value={feedingForm.cantidad_diaria_g ?? ""}
                        onChange={(event) =>
                          setFeedingForm((prev) => ({
                            ...prev,
                            cantidad_diaria_g: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="block text-xs text-slate-500">
                      Comidas al día
                      <input
                        type="number"
                        min="0"
                        max="10"
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        value={feedingForm.comidas_dia ?? ""}
                        onChange={(event) =>
                          setFeedingForm((prev) => ({
                            ...prev,
                            comidas_dia: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="block text-xs text-slate-500">
                    Horarios habituales
                    <input
                      type="text"
                      placeholder="Ej: 8am y 8pm"
                      className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                      value={feedingForm.horarios ?? ""}
                      onChange={(event) =>
                        setFeedingForm((prev) => ({
                          ...prev,
                          horarios: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div>
                    <p className="text-xs text-slate-500">
                      ¿Recibe premios/snacks?
                    </p>
                    <div className="mt-1 flex gap-4">
                      {(["true", "false"] as const).map((value) => (
                        <label
                          key={value}
                          className="flex items-center gap-1.5 text-xs text-slate-700"
                        >
                          <input
                            type="radio"
                            name="premios-aplica"
                            checked={feedingForm.premios_aplica === value}
                            onChange={() =>
                              setFeedingForm((prev) => ({
                                ...prev,
                                premios_aplica: value,
                              }))
                            }
                          />
                          {value === "true" ? "Sí" : "No"}
                        </label>
                      ))}
                    </div>
                    {feedingForm.premios_aplica === "true" ? (
                      <input
                        type="text"
                        placeholder="Detalle de premios/snacks"
                        className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        value={feedingForm.premios_detalle ?? ""}
                        onChange={(event) =>
                          setFeedingForm((prev) => ({
                            ...prev,
                            premios_detalle: event.target.value,
                          }))
                        }
                      />
                    ) : null}
                  </div>

                  <label className="block text-xs text-slate-500">
                    Restricciones alimentarias
                    <textarea
                      className="mt-1 min-h-[60px] w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                      value={feedingForm.restricciones_alimentarias ?? ""}
                      onChange={(event) =>
                        setFeedingForm((prev) => ({
                          ...prev,
                          restricciones_alimentarias: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <button
                      type="submit"
                      disabled={isSavingFeeding}
                      className="rounded-[var(--radius)] border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                    >
                      {isSavingFeeding
                        ? "Guardando..."
                        : "Guardar sección de Alimentación"}
                    </button>
                  </div>
                </form>
              ) : null}
              {feedingMessage ? (
                <p className="mt-2 text-xs text-slate-500">{feedingMessage}</p>
              ) : null}
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

            {profileChecklist.length || !latestReading ? (
              <OperationalActionsCard
                description="Si faltan datos o contexto, sigue por la vista operativa."
                actions={[
                  { href: "/today", label: "Ver hoy" },
                  { href: "/bowl", label: "Ver plato" },
                  { href: "/story", label: "Ver historia" },
                  { href: "/registro", label: "Completar registro" },
                ]}
              />
            ) : null}
          </section>

          <section className="surface-card freeform-rise px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Platos asociados</p>
                <p className="text-lg font-semibold text-slate-900">
                  {petFoodDevice?.device_id ?? "Sin comedero"}
                  {" · "}
                  {petWaterDevice?.device_id ?? "Sin bebedero"}
                </p>
                <p className="text-xs text-slate-500">
                  {petFoodDevice || petWaterDevice
                    ? `Comedero: ${devicePowerStateLabel(resolveDevicePowerState(petFoodDevice))} · Bebedero: ${devicePowerStateLabel(resolveDevicePowerState(petWaterDevice))}`
                    : "Conecta los platos para completar el perfil."}
                </p>
                {/* Antes mostraba `status` en el texto y `device_state` en el badge por
                    separado — podían contradecirse (ver SPEC_01 E4). Ambos leen ahora
                    resolveDevicePowerState(), la misma fuente de verdad. */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {petFoodDevice ? (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Comedero:{" "}
                      {devicePowerStateLabel(
                        resolveDevicePowerState(petFoodDevice),
                      )}
                    </span>
                  ) : null}
                  {petWaterDevice ? (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Bebedero:{" "}
                      {devicePowerStateLabel(
                        resolveDevicePowerState(petWaterDevice),
                      )}
                    </span>
                  ) : null}
                </div>
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
                {!petFoodDevice && !petWaterDevice ? (
                  <Link
                    href="/registro"
                    className="rounded-[var(--radius)] bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground"
                  >
                    Vincular dispositivo
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {petFoodDevice || petWaterDevice ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {petFoodDevice ? (
                <DiagnosticoRapidoCard
                  title="Diagnóstico rápido · Comedero"
                  connectionHint={foodDiagnostics.connectionHint}
                  batterySummary={foodDiagnostics.summary}
                  batteryExtra={foodDiagnostics.extra}
                  actionNotes={foodDiagnostics.actionNotes}
                />
              ) : null}
              {petWaterDevice ? (
                <DiagnosticoRapidoCard
                  title="Diagnóstico rápido · Bebedero"
                  connectionHint={waterDiagnostics.connectionHint}
                  batterySummary={waterDiagnostics.summary}
                  batteryExtra={waterDiagnostics.extra}
                  actionNotes={waterDiagnostics.actionNotes}
                />
              ) : null}
            </div>
          ) : null}

          {petFoodDevice && selectedPet ? (
            <HungerBarCard petId={selectedPet.id} petName={selectedPet.name} />
          ) : null}

          {selectedPet ? (
            // ponytail: botón temporal de QA para probar la notificación push
            // del hunger bar en dispositivo real sin esperar el horario real
            // ni conectar por USB — BORRAR una vez confirmado con Mauro. Ver
            // Knowledge/05_API/SPEC_HungerBar_Alertas.md §6.1.
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void scheduleHungerBarAlert({
                    petId: selectedPet.id,
                    petName: selectedPet.name,
                    alertAt: new Date(Date.now() + 20_000),
                  }).then((result) => {
                    window.alert(
                      result.ok
                        ? "Notificación agendada — debería sonar en ~20s."
                        : `No se agendó: ${result.reason}`,
                    );
                  });
                }}
                className="rounded-full border border-dashed border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600"
              >
                🔔 Probar notificación (QA — borrar después)
              </button>
            </div>
          ) : null}

          {!latestReading ? (
            <section className="surface-card freeform-rise px-6 py-4">
              <p className="text-sm font-semibold text-slate-900">
                Aún no hay lecturas recientes para esta mascota.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                La ficha ya está lista; apenas el comedero o bebedero publique
                datos, esta vista mostrará comportamiento y contexto ambiental.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <Link
                  href="/today"
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
                >
                  Ver resumen en vivo
                </Link>
                <Link
                  href="/bowl"
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
                >
                  Ver plato
                </Link>
                <Link
                  href="/admin"
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
                >
                  Ver admin
                </Link>
              </div>
            </section>
          ) : null}

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
