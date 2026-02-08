"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getAccessToken } from "@/lib/auth/token";

type OnboardingStatus = {
  userStep: string | null;
  hasPet: boolean;
  hasDevice: boolean;
  petCount: number;
  deviceCount: number;
};

type Pet = {
  id: string;
  name: string;
  type: string;
};

const defaultStatus: OnboardingStatus = {
  userStep: null,
  hasPet: false,
  hasDevice: false,
  petCount: 0,
  deviceCount: 0,
};

export default function OnboardingPage() {
  const [status, setStatus] = useState<OnboardingStatus>(defaultStatus);
  const [pets, setPets] = useState<Pet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [isSavingDevice, setIsSavingDevice] = useState(false);

  const [profileForm, setProfileForm] = useState({
    user_name: "",
    city: "",
    country: "",
    notification_channel: "email",
  });

  const [petForm, setPetForm] = useState({
    name: "",
    type: "cat",
    origin: "rescatado",
  });

  const [deviceForm, setDeviceForm] = useState({
    pet_id: "",
    device_code: "",
    device_type: "food_bowl",
  });

  const token = useMemo(() => getAccessToken(), []);

  const loadStatus = async () => {
    if (!token) {
      setError("Necesitas iniciar sesión para completar el onboarding.");
      setIsLoading(false);
      return;
    }

    try {
      const [statusRes, petsRes] = await Promise.all([
        fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/pets", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!statusRes.ok) {
        throw new Error("No se pudo cargar el estado de onboarding.");
      }
      if (!petsRes.ok) {
        throw new Error("No se pudieron cargar las mascotas.");
      }

      const statusData = (await statusRes.json()) as OnboardingStatus;
      const petsData = (await petsRes.json()) as Pet[];

      setStatus(statusData);
      setPets(petsData ?? []);
      setDeviceForm((prev) => ({
        ...prev,
        pet_id: prev.pet_id || petsData?.[0]?.id || "",
      }));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el onboarding."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const saveProfile = async () => {
    if (!token) return;
    setIsSavingProfile(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profileForm,
          user_onboarding_step: "pet_profile",
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudo guardar el perfil.");
      }

      await loadStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el perfil."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePet = async () => {
    if (!token) return;
    setIsSavingPet(true);
    setError(null);
    try {
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...petForm,
          pet_onboarding_step: "pet_profile",
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudo crear la mascota.");
      }

      const newPet = (await res.json()) as Pet;
      setDeviceForm((prev) => ({ ...prev, pet_id: newPet.id }));
      await loadStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la mascota."
      );
    } finally {
      setIsSavingPet(false);
    }
  };

  const saveDevice = async () => {
    if (!token) return;
    setIsSavingDevice(true);
    setError(null);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...deviceForm,
          status: "active",
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudo registrar el dispositivo.");
      }

      await fetch("/api/profiles", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_onboarding_step: "completed" }),
      });

      await loadStatus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar el dispositivo."
      );
    } finally {
      setIsSavingDevice(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white px-6 py-12 text-sm text-slate-500">
        Cargando onboarding...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.7),_rgba(248,250,252,1))] px-6 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Onboarding rápido
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
              Configura tu cuenta en 3 pasos
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Link
              href="/today"
              className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Volver al feed
            </Link>
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
        </header>

        {error ? (
          <div className="surface-card border border-rose-200/70 bg-rose-50/80 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="surface-card px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                1. Perfil de usuario
              </h2>
              <p className="text-sm text-slate-500">
                Completa lo básico para personalizar la experiencia.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {status.userStep === "completed" ||
              status.userStep === "pet_profile" ||
              status.userStep === "device_link"
                ? "Listo"
                : "Pendiente"}
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              placeholder="Nombre"
              value={profileForm.user_name}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  user_name: event.target.value,
                }))
              }
            />
            <input
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              placeholder="Ciudad"
              value={profileForm.city}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  city: event.target.value,
                }))
              }
            />
            <input
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              placeholder="País"
              value={profileForm.country}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  country: event.target.value,
                }))
              }
            />
            <select
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              value={profileForm.notification_channel}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  notification_channel: event.target.value,
                }))
              }
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={isSavingProfile}
            className="mt-4 h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            {isSavingProfile ? "Guardando..." : "Guardar perfil"}
          </button>
        </section>

        <section className="surface-card px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                2. Mascota
              </h2>
              <p className="text-sm text-slate-500">
                Registra a tu mascota para asociar el plato.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {status.hasPet ? "Listo" : "Pendiente"}
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              placeholder="Nombre"
              value={petForm.name}
              onChange={(event) =>
                setPetForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <select
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              value={petForm.type}
              onChange={(event) =>
                setPetForm((prev) => ({ ...prev, type: event.target.value }))
              }
            >
              <option value="cat">Gato</option>
              <option value="dog">Perro</option>
            </select>
            <input
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              placeholder="Origen (rescatado, casa, etc.)"
              value={petForm.origin}
              onChange={(event) =>
                setPetForm((prev) => ({ ...prev, origin: event.target.value }))
              }
            />
          </div>
          <button
            type="button"
            onClick={savePet}
            disabled={isSavingPet}
            className="mt-4 h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            {isSavingPet ? "Guardando..." : "Crear mascota"}
          </button>
        </section>

        <section className="surface-card px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                3. Dispositivo
              </h2>
              <p className="text-sm text-slate-500">
                Vincula el dispositivo con tu mascota.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {status.hasDevice ? "Listo" : "Pendiente"}
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <select
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              value={deviceForm.pet_id}
              onChange={(event) =>
                setDeviceForm((prev) => ({
                  ...prev,
                  pet_id: event.target.value,
                }))
              }
            >
              <option value="">Selecciona mascota</option>
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.type})
                </option>
              ))}
            </select>
            <input
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              placeholder="Código KPCL0000"
              value={deviceForm.device_code}
              onChange={(event) =>
                setDeviceForm((prev) => ({
                  ...prev,
                  device_code: event.target.value.toUpperCase(),
                }))
              }
            />
            <select
              className="h-11 rounded-[var(--radius)] border border-border bg-white/90 px-4 text-sm text-slate-900"
              value={deviceForm.device_type}
              onChange={(event) =>
                setDeviceForm((prev) => ({
                  ...prev,
                  device_type: event.target.value,
                }))
              }
            >
              <option value="food_bowl">Food bowl</option>
              <option value="water_bowl">Water bowl</option>
            </select>
          </div>
          <button
            type="button"
            onClick={saveDevice}
            disabled={isSavingDevice}
            className="mt-4 h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            {isSavingDevice ? "Guardando..." : "Registrar dispositivo"}
          </button>
        </section>

        <div className="text-xs text-slate-500">
          Estado: {status.petCount} mascotas · {status.deviceCount} dispositivos.
        </div>
      </div>
    </div>
  );
}
