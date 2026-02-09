"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clearTokens, getAccessToken, setTokens } from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

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

type OnboardingFlowProps = {
  mode?: "page" | "modal";
  onClose?: () => void;
};

type TooltipIconProps = {
  text: string;
};

function TooltipIcon({ text }: TooltipIconProps) {
  return (
    <span className="relative group inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] text-slate-500">
      ⓘ
      <span className="pointer-events-none absolute left-1/2 top-7 z-10 w-56 -translate-x-1/2 rounded-[12px] border border-slate-900/10 bg-slate-900 px-3 py-2 text-[11px] text-slate-100 opacity-0 shadow-lg transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

const defaultStatus: OnboardingStatus = {
  userStep: null,
  hasPet: false,
  hasDevice: false,
  petCount: 0,
  deviceCount: 0,
};

export default function OnboardingFlow({ mode = "page", onClose }: OnboardingFlowProps) {
  const [status, setStatus] = useState<OnboardingStatus>(defaultStatus);
  const [pets, setPets] = useState<Pet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [petError, setPetError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    user_name: "",
    city: "",
    country: "",
    notification_channel: "email",
    is_owner: true,
    owner_name: "",
    phone_number: "",
  });

  const [petForm, setPetForm] = useState({
    name: "",
    type: "cat",
    origin: "rescatado",
  });

  const [deviceForm, setDeviceForm] = useState({
    pet_id: "",
    device_id: "",
    device_type: "food_bowl",
  });

  const [token, setToken] = useState<string | null>(getAccessToken());
  const completedSteps = useMemo(() => {
    return {
      profile: status.userStep === "pet_profile" || status.userStep === "completed",
      pet: status.hasPet,
      device: status.hasDevice,
    };
  }, [status]);
  const profileValidation = useMemo(() => {
    const issues: string[] = [];
    if (!profileForm.user_name.trim()) issues.push("Nombre requerido.");
    if (!profileForm.city.trim()) issues.push("Ciudad requerida.");
    if (!profileForm.country.trim()) issues.push("País requerido.");
    if (!profileForm.is_owner && !profileForm.owner_name.trim()) {
      issues.push("Nombre del dueño requerido.");
    }
    if (
      (profileForm.notification_channel === "whatsapp" ||
        profileForm.notification_channel === "sms") &&
      !profileForm.phone_number.trim()
    ) {
      issues.push("Número de contacto requerido.");
    }
    return { ok: issues.length === 0, issues };
  }, [profileForm]);

  const petValidation = useMemo(() => {
    const issues: string[] = [];
    if (!petForm.name.trim()) issues.push("Nombre de mascota requerido.");
    if (!petForm.type.trim()) issues.push("Tipo de mascota requerido.");
    return { ok: issues.length === 0, issues };
  }, [petForm]);

  const deviceValidation = useMemo(() => {
    const issues: string[] = [];
    if (!deviceForm.pet_id) issues.push("Selecciona una mascota.");
    if (!deviceForm.device_id.trim()) {
      issues.push("Código de dispositivo requerido.");
    } else if (!/^KPCL\d{4}$/.test(deviceForm.device_id.trim())) {
      issues.push("Código debe ser KPCL0000.");
    }
    if (!deviceForm.device_type.trim()) issues.push("Tipo de dispositivo requerido.");
    return { ok: issues.length === 0, issues };
  }, [deviceForm]);

  const inputClass = (hasError: boolean) =>
    `h-11 rounded-[var(--radius)] border px-4 text-sm text-slate-900 outline-none ${
      hasError
        ? "border-rose-300 bg-rose-50/40 focus:ring-2 focus:ring-rose-200"
        : "border-border bg-white/90 focus:ring-2 focus:ring-ring"
    }`;
  const currentStep = useMemo(() => {
    if (
      status.userStep !== "completed" &&
      status.userStep !== "pet_profile" &&
      status.userStep !== "device_link"
    ) {
      return 1;
    }
    if (!status.hasPet) return 2;
    if (!status.hasDevice) return 3;
    return 4;
  }, [status]);

  const nextStepHint = useMemo(() => {
    if (currentStep === 1) {
      return {
        title: "Completa tu perfil",
        detail: "Tu nombre y ciudad desbloquean las alertas.",
      };
    }
    if (currentStep === 2) {
      return {
        title: "Registra a tu mascota",
        detail: "Necesitamos el nombre y tipo para personalizar el feed.",
      };
    }
    if (currentStep === 3) {
      return {
        title: "Vincula el dispositivo",
        detail: "Usa el código KPCL0000 del plato.",
      };
    }
    return {
      title: "Onboarding completo",
      detail: "Puedes ir al feed en cualquier momento.",
    };
  }, [currentStep]);

  const loadStatus = async () => {
    if (!token) return;

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
    let isMounted = true;
    if (token) {
      setIsLoading(true);
      void loadStatus();
      return () => {
        isMounted = false;
      };
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Faltan variables públicas de Supabase en el entorno.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session?.access_token) {
        setTokens({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        });
        setToken(data.session.access_token);
      } else {
        setError("Necesitas iniciar sesión para completar el onboarding.");
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        if (session?.access_token) {
          setTokens({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
          setToken(session.access_token);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [token]);

  const saveProfile = async () => {
    if (!token) return;
    setIsSavingProfile(true);
    setError(null);
    setProfileError(null);
    if (!profileValidation.ok) {
      setProfileError(profileValidation.issues.join(" "));
      setIsSavingProfile(false);
      return;
    }
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
    setPetError(null);
    if (!petValidation.ok) {
      setPetError(petValidation.issues.join(" "));
      setIsSavingPet(false);
      return;
    }
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
    setDeviceError(null);
    if (!deviceValidation.ok) {
      setDeviceError(deviceValidation.issues.join(" "));
      setIsSavingDevice(false);
      return;
    }
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
            {mode === "page" ? (
              <Link
                href="/today"
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Volver al feed
              </Link>
            ) : null}
            {mode === "page" ? (
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
            ) : null}
            {mode === "modal" && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Cerrar
              </button>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="surface-card border border-rose-200/70 bg-rose-50/80 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="surface-card px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Siguiente paso
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                {nextStepHint.title}
              </h2>
              <p className="text-sm text-slate-500">{nextStepHint.detail}</p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {currentStep === 4 ? "Listo" : `Paso ${currentStep} de 3`}
            </span>
          </div>
        </section>

        <section className="surface-card px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Registro guiado
              </h2>
              <p className="text-sm text-slate-500">
                Completa usuario → mascota → dispositivo sin salir del flujo.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {currentStep === 4 ? "Completo" : `Paso ${currentStep}/3`}
            </span>
          </div>

          <div className="mt-4 h-2 w-full rounded-full bg-slate-200/70">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(currentStep, 3) * 33.33}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold">
                {completedSteps.profile ? "✓" : "1"}
              </span>
              Perfil de usuario
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold">
                {completedSteps.pet ? "✓" : "2"}
              </span>
              Mascota
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-semibold">
                {completedSteps.device ? "✓" : "3"}
              </span>
              Dispositivo
            </div>
          </div>
        </section>

        {currentStep === 1 && (
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
                Pendiente
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Nombre
                </label>
                <TooltipIcon text="Nombre visible en la app." />
              </div>
              <input
                className={inputClass(!profileForm.user_name.trim())}
                placeholder="Nombre"
                value={profileForm.user_name}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    user_name: event.target.value,
                  }))
                }
              />
              <p className="text-[11px] text-slate-500">
                Nombre visible en la app.
              </p>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Ciudad
                </label>
                <TooltipIcon text="Úsalo para personalizar alertas." />
              </div>
              <input
                className={inputClass(!profileForm.city.trim())}
                placeholder="Ciudad"
                value={profileForm.city}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    city: event.target.value,
                  }))
                }
              />
              <p className="text-[11px] text-slate-500">
                Úsalo para personalizar alertas.
              </p>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  País
                </label>
                <TooltipIcon text="Define tu región principal." />
              </div>
              <input
                className={inputClass(!profileForm.country.trim())}
                placeholder="País"
                value={profileForm.country}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    country: event.target.value,
                  }))
                }
              />
              <p className="text-[11px] text-slate-500">
                Define tu región principal.
              </p>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Canal
                </label>
                <TooltipIcon text="Elige cómo recibir alertas." />
              </div>
              <select
                className={inputClass(false)}
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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={profileForm.is_owner}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      is_owner: event.target.checked,
                    }))
                  }
                />
                Soy el dueño del plato
              </label>
              {!profileForm.is_owner ? (
                <input
                  className={inputClass(!profileForm.owner_name.trim())}
                  placeholder="Nombre del dueño"
                  value={profileForm.owner_name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      owner_name: event.target.value,
                    }))
                  }
                />
              ) : null}
              {profileForm.notification_channel === "whatsapp" ? (
                <input
                  className={inputClass(!profileForm.phone_number.trim())}
                  placeholder="Número WhatsApp"
                  value={profileForm.phone_number}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      phone_number: event.target.value,
                    }))
                  }
                />
              ) : null}
              {profileForm.notification_channel === "whatsapp" ? (
                <p className="text-[11px] text-slate-500">
                  Incluye prefijo de país si aplica.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={saveProfile}
              disabled={isSavingProfile || !profileValidation.ok}
              className="mt-4 h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              {isSavingProfile ? "Guardando..." : "Guardar perfil"}
            </button>
            {!profileValidation.ok ? (
              <div className="mt-3 rounded-[calc(var(--radius)-8px)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Falta completar: {profileValidation.issues.join(" ")}
              </div>
            ) : null}
            {profileError ? (
              <p className="mt-2 text-xs text-rose-600">{profileError}</p>
            ) : null}
          </section>
        )}

        {currentStep === 2 && (
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
                Pendiente
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Nombre
                </label>
                <TooltipIcon text="Nombre que verás en el feed." />
              </div>
              <input
                className={inputClass(!petForm.name.trim())}
                placeholder="Nombre"
                value={petForm.name}
                onChange={(event) =>
                  setPetForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <p className="text-[11px] text-slate-500">
                Nombre que verás en el feed.
              </p>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Tipo
                </label>
                <TooltipIcon text="Gato o perro." />
              </div>
              <select
                className={inputClass(!petForm.type.trim())}
                value={petForm.type}
                onChange={(event) =>
                  setPetForm((prev) => ({ ...prev, type: event.target.value }))
                }
              >
                <option value="cat">Gato</option>
                <option value="dog">Perro</option>
              </select>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Origen
                </label>
                <TooltipIcon text="Ayuda a personalizar los insights." />
              </div>
              <input
                className={inputClass(false)}
                placeholder="Origen (rescatado, casa, etc.)"
                value={petForm.origin}
                onChange={(event) =>
                  setPetForm((prev) => ({ ...prev, origin: event.target.value }))
                }
              />
              <p className="text-[11px] text-slate-500">
                Ayuda a personalizar los insights.
              </p>
            </div>
            <button
              type="button"
              onClick={savePet}
              disabled={isSavingPet || !petValidation.ok}
              className="mt-4 h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              {isSavingPet ? "Guardando..." : "Crear mascota"}
            </button>
            {!petValidation.ok ? (
              <div className="mt-3 rounded-[calc(var(--radius)-8px)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Falta completar: {petValidation.issues.join(" ")}
              </div>
            ) : null}
            {petError ? (
              <p className="mt-2 text-xs text-rose-600">{petError}</p>
            ) : null}
          </section>
        )}

        {currentStep === 3 && (
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
                Pendiente
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Mascota
                </label>
                <TooltipIcon text="Selecciona la mascota a vincular." />
              </div>
              <select
                className={inputClass(!deviceForm.pet_id)}
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
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Código
                </label>
                <TooltipIcon text="Formato esperado: KPCL0000." />
              </div>
              <input
                className={inputClass(
                  !deviceForm.device_id.trim() ||
                    !/^KPCL\\d{4}$/.test(deviceForm.device_id.trim())
                )}
                placeholder="Código KPCL0000"
                value={deviceForm.device_id}
                onChange={(event) =>
                  setDeviceForm((prev) => ({
                    ...prev,
                    device_id: event.target.value.toUpperCase(),
                  }))
                }
              />
              <p className="text-[11px] text-slate-500">
                Formato esperado: KPCL0000.
              </p>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Tipo de dispositivo
                </label>
                <TooltipIcon text="Food bowl o water bowl." />
              </div>
              <select
                className={inputClass(!deviceForm.device_type.trim())}
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
              disabled={isSavingDevice || !deviceValidation.ok}
              className="mt-4 h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              {isSavingDevice ? "Guardando..." : "Registrar dispositivo"}
            </button>
            {!deviceValidation.ok ? (
              <div className="mt-3 rounded-[calc(var(--radius)-8px)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Falta completar: {deviceValidation.issues.join(" ")}
              </div>
            ) : null}
            {deviceError ? (
              <p className="mt-2 text-xs text-rose-600">{deviceError}</p>
            ) : null}
          </section>
        )}

        {currentStep === 4 && (
          <section className="surface-card px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">Listo</h2>
            <p className="text-sm text-slate-500">
              Ya completaste el registro. Puedes ir al feed.
            </p>
            <div className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-3">
              <div className="rounded-[var(--radius)] border border-slate-200/70 bg-white px-3 py-3">
                Perfil: {status.userStep ?? "completado"}
              </div>
              <div className="rounded-[var(--radius)] border border-slate-200/70 bg-white px-3 py-3">
                Mascotas: {status.petCount}
              </div>
              <div className="rounded-[var(--radius)] border border-slate-200/70 bg-white px-3 py-3">
                Dispositivos: {status.deviceCount}
              </div>
            </div>
            <Link
              href="/today"
              className="mt-4 inline-flex h-10 items-center rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              Ir al feed
            </Link>
          </section>
        )}

        <div className="text-xs text-slate-500">
          Estado: {status.petCount} mascotas · {status.deviceCount} dispositivos.
        </div>
      </div>
    </div>
  );
}


