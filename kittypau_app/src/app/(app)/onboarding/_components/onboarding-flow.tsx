"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getValidAccessToken, setTokens } from "@/lib/auth/token";
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

const STORAGE_BUCKET = "kittypau-photos";
const MAX_PHOTO_MB = 5;
const AVATAR_OPTIONS = [
  { id: "avatar-1", label: "Avatar 1", url: "/avatar_1.png" },
  { id: "avatar-2", label: "Avatar 2", url: "/avatar_2.png" },
  { id: "avatar-3", label: "Avatar 3", url: "/avatar_3.png" },
  { id: "avatar-4", label: "Avatar 4", url: "/avatar_5.png" },
];

export default function OnboardingFlow({ mode = "page", onClose }: OnboardingFlowProps) {
  const router = useRouter();
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
  const [showProfileHints, setShowProfileHints] = useState(false);
  const [showPetHints, setShowPetHints] = useState(false);
  const [showDeviceHints, setShowDeviceHints] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(
    AVATAR_OPTIONS[0]?.url ?? null
  );
  const [petPhotoFile, setPetPhotoFile] = useState<File | null>(null);
  const [petPhotoPreview, setPetPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropTarget, setCropTarget] = useState<"pet">("pet");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeout = useRef<number | null>(null);

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

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getValidAccessToken().then((value) => {
      if (mounted) setToken(value);
    });
    return () => {
      mounted = false;
    };
  }, []);
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
    if (!selectedAvatar) issues.push("Avatar requerido.");
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

  const preparePhoto = (
    file: File | null,
    setFile: (value: File | null) => void,
    setPreview: (value: string | null) => void
  ) => {
    setPhotoError(null);
    if (!file) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`La imagen no puede superar ${MAX_PHOTO_MB}MB.`);
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    return () => {
      if (petPhotoPreview) URL.revokeObjectURL(petPhotoPreview);
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, [petPhotoPreview]);

  const uploadPhoto = async (file: File, folder: "profiles" | "pets") => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      throw new Error("Faltan variables públicas de Supabase en el entorno.");
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const random =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `${folder}/${random}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      throw new Error(error.message);
    }
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const openCropper = (previewUrl: string | null) => {
    if (!previewUrl) return;
    setCropTarget("pet");
    setCropPreview(previewUrl);
    setCropScale(1);
    setCropX(0);
    setCropY(0);
    setIsCropOpen(true);
  };

  const applyCrop = async () => {
    const activeFile = petPhotoFile;
    if (!cropPreview || !activeFile) return;
    const img = new Image();
    img.src = cropPreview;
    await img.decode();
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleBase = Math.max(size / img.width, size / img.height);
    const scale = scaleBase * cropScale;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const maxOffsetX = Math.max(0, (drawWidth - size) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - size) / 2);
    const offsetX = Math.min(
      maxOffsetX,
      Math.max(-maxOffsetX, (cropX / 100) * maxOffsetX)
    );
    const offsetY = Math.min(
      maxOffsetY,
      Math.max(-maxOffsetY, (cropY / 100) * maxOffsetY)
    );
    const dx = (size - drawWidth) / 2 + offsetX;
    const dy = (size - drawHeight) / 2 + offsetY;

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!blob) return;
    const file = new File([blob], activeFile.name, { type: "image/jpeg" });
    const newPreview = URL.createObjectURL(file);
    setPetPhotoFile(file);
    setPetPhotoPreview(newPreview);
    setIsCropOpen(false);
  };

  const showSavedToastAndRedirect = (shouldRedirect: boolean) => {
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    setToastMessage("Guardado");
    toastTimeout.current = window.setTimeout(() => {
      setToastMessage(null);
      if (shouldRedirect) {
        router.push("/today");
      }
    }, 1400);
  };

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
    setShowProfileHints(true);
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
          photo_url: selectedAvatar ?? undefined,
          user_onboarding_step: "pet_profile",
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "No se pudo guardar el perfil.");
      }

      await loadStatus();
      setShowProfileHints(false);
      showSavedToastAndRedirect(false);
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
    setShowPetHints(true);
    setError(null);
    setPetError(null);
    if (!petValidation.ok) {
      setPetError(petValidation.issues.join(" "));
      setIsSavingPet(false);
      return;
    }
    try {
      const petPhotoUrl = petPhotoFile
        ? await uploadPhoto(petPhotoFile, "pets")
        : undefined;
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...petForm,
          photo_url: petPhotoUrl,
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
      setShowPetHints(false);
      showSavedToastAndRedirect(false);
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
    setShowDeviceHints(true);
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
      setShowDeviceHints(false);
      showSavedToastAndRedirect(true);
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
      {toastMessage ? (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center">
          <div className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
            {toastMessage}
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
          <div className="rounded-[var(--radius)] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700 shadow">
            {error}
          </div>
        </div>
      ) : null}
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
            <div className="mt-4 rounded-[var(--radius)] border border-slate-200/70 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Paso 1 · Usuario (cuenta)
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Tu cuenta será el hogar de{" "}
                <span className="font-semibold text-slate-700">
                  {petForm.name?.trim() ? petForm.name : "tu mascota"}
                </span>
                .
              </p>
              <div className="mt-3 rounded-[var(--radius)] border border-slate-200/70 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Elige tu avatar
                  </p>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-600">
                    Obligatorio
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => {
                    const isActive = selectedAvatar === avatar.url;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.url)}
                        className={`h-14 w-14 overflow-hidden rounded-full border ${
                          isActive
                            ? "border-rose-300 ring-2 ring-rose-200"
                            : "border-slate-200"
                        }`}
                        aria-pressed={isActive}
                      >
                        <img
                          src={avatar.url}
                          alt={avatar.label}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Puedes cambiarlo luego en tu perfil.
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Seleccionado
                  </span>
                  <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                    {selectedAvatar ? (
                      <img
                        src={selectedAvatar}
                        alt="Avatar seleccionado"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
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
              {showProfileHints && !profileForm.user_name.trim() ? (
                <p className="text-[11px] text-rose-600">
                  Escribe tu nombre para continuar.
                </p>
              ) : null}
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
              {showProfileHints && !profileForm.city.trim() ? (
                <p className="text-[11px] text-rose-600">
                  Indica tu ciudad para personalizar alertas.
                </p>
              ) : null}
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
              {showProfileHints && !profileForm.country.trim() ? (
                <p className="text-[11px] text-rose-600">
                  Define tu país para completar el perfil.
                </p>
              ) : null}
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
                <div className="space-y-2">
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
                  {showProfileHints && !profileForm.owner_name.trim() ? (
                    <p className="text-[11px] text-rose-600">
                      Indica el nombre del dueño.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {profileForm.notification_channel === "whatsapp" ? (
                <div className="space-y-2">
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
                  {showProfileHints && !profileForm.phone_number.trim() ? (
                    <p className="text-[11px] text-rose-600">
                      Agrega un número de contacto.
                    </p>
                  ) : null}
                </div>
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
            {isSavingProfile ? (
              <p className="mt-2 text-[11px] text-slate-500">
                Guardando perfil, por favor espera...
              </p>
            ) : null}
            {!profileValidation.ok ? (
              <div
                className="mt-3 rounded-[calc(var(--radius)-8px)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700"
                role="status"
                aria-live="polite"
              >
                Falta completar: {profileValidation.issues.join(" ")}
              </div>
            ) : null}
            {profileError ? (
              <p className="mt-2 text-xs text-rose-600" role="alert">
                {profileError}
              </p>
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
            <p className="mt-3 text-xs text-slate-500">
              Necesitamos nombre y tipo para personalizar las historias.
            </p>
            <div className="mt-4 rounded-[var(--radius)] border border-slate-200/70 bg-white px-4 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {petPhotoPreview ? (
                    <img
                      src={petPhotoPreview}
                      alt="Foto de mascota"
                      className="h-full w-full object-cover"
                      onClick={() => openCropper(petPhotoPreview)}
                      role="button"
                    />
                  ) : (
                    <img
                      src="/pet_profile.jpeg"
                      alt="Placeholder de mascota"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="space-y-2 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">Foto de mascota</p>
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      Subir archivo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                          preparePhoto(
                            event.target.files?.[0] ?? null,
                            setPetPhotoFile,
                            setPetPhotoPreview
                          )
                        }
                      />
                    </label>
                    <label className="cursor-pointer rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      Tomar foto
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(event) =>
                          preparePhoto(
                            event.target.files?.[0] ?? null,
                            setPetPhotoFile,
                            setPetPhotoPreview
                          )
                        }
                      />
                    </label>
                    {petPhotoPreview ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPetPhotoFile(null);
                          setPetPhotoPreview(null);
                        }}
                        className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Quitar
                      </button>
                    ) : null}
                    {petPhotoPreview ? (
                      <button
                        type="button"
                        onClick={() => openCropper(petPhotoPreview)}
                        className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Editar foto
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    JPG/PNG · hasta {MAX_PHOTO_MB}MB.
                  </p>
                </div>
              </div>
              {photoError ? (
                <p className="mt-3 text-xs text-rose-600">{photoError}</p>
              ) : null}
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
              {showPetHints && !petForm.name.trim() ? (
                <p className="text-[11px] text-rose-600">
                  Escribe el nombre de tu mascota.
                </p>
              ) : null}
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
              {showPetHints && !petForm.type.trim() ? (
                <p className="text-[11px] text-rose-600">
                  Selecciona el tipo de mascota.
                </p>
              ) : null}
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
            {isSavingPet ? (
              <p className="mt-2 text-[11px] text-slate-500">
                Guardando mascota, por favor espera...
              </p>
            ) : null}
            {!petValidation.ok ? (
              <div
                className="mt-3 rounded-[calc(var(--radius)-8px)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700"
                role="status"
                aria-live="polite"
              >
                Falta completar: {petValidation.issues.join(" ")}
              </div>
            ) : null}
            {petError ? (
              <p className="mt-2 text-xs text-rose-600" role="alert">
                {petError}
              </p>
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
            <p className="mt-3 text-xs text-slate-500">
              Usa el código KPCL0000 impreso en el plato.
            </p>
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
              {showDeviceHints && !deviceForm.pet_id ? (
                <p className="text-[11px] text-rose-600">
                  Selecciona la mascota a vincular.
                </p>
              ) : null}
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
              {showDeviceHints &&
              (!deviceForm.device_id.trim() ||
                !/^KPCL\\d{4}$/.test(deviceForm.device_id.trim())) ? (
                <p className="text-[11px] text-rose-600">
                  Ingresa un código válido KPCL0000.
                </p>
              ) : null}
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
              {showDeviceHints && !deviceForm.device_type.trim() ? (
                <p className="text-[11px] text-rose-600">
                  Selecciona el tipo de dispositivo.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={saveDevice}
              disabled={isSavingDevice || !deviceValidation.ok}
              className="mt-4 h-10 rounded-[var(--radius)] bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              {isSavingDevice ? "Guardando..." : "Registrar dispositivo"}
            </button>
            {isSavingDevice ? (
              <p className="mt-2 text-[11px] text-slate-500">
                Guardando dispositivo, por favor espera...
              </p>
            ) : null}
            {!deviceValidation.ok ? (
              <div className="mt-3 rounded-[calc(var(--radius)-8px)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Falta completar: {deviceValidation.issues.join(" ")}
              </div>
            ) : null}
            {deviceError ? (
              <p className="mt-2 text-xs text-rose-600" role="alert">
                {deviceError}
              </p>
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
            {(profileForm.user_name || petForm.name || deviceForm.device_id) ? (
              <div className="mt-4 rounded-[var(--radius)] border border-slate-200/70 bg-white px-4 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">
                  Resumen rápido
                </p>
                <div className="mt-2 grid gap-1">
                  {profileForm.user_name ? (
                    <span>Usuario: {profileForm.user_name}</span>
                  ) : null}
                  {petForm.name ? (
                    <span>Mascota: {petForm.name}</span>
                  ) : null}
                  {deviceForm.device_id ? (
                    <span>Dispositivo: {deviceForm.device_id}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
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
      {isCropOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-[var(--radius)] border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Ajusta la foto de tu mascota
              </h3>
              <p className="text-xs text-slate-500">
                Mueve y acerca la imagen para el recorte circular.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="mx-auto flex h-56 w-56 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {cropPreview ? (
                  <img
                    src={cropPreview}
                    alt="Vista previa"
                    style={{
                      transform: `translate(${cropX}%, ${cropY}%) scale(${cropScale})`,
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Zoom</label>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.05"
                    value={cropScale}
                    onChange={(event) => setCropScale(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Horizontal</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={cropX}
                    onChange={(event) => setCropX(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Vertical</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={cropY}
                    onChange={(event) => setCropY(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 text-xs">
              <button
                type="button"
                onClick={() => setIsCropOpen(false)}
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
              >
                Salir
              </button>
              <button
                type="button"
                onClick={applyCrop}
                className="rounded-[var(--radius)] bg-primary px-3 py-2 font-semibold text-primary-foreground"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


