"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  clearTokens,
  getSupabaseSessionSafely,
  getValidAccessToken,
  setTokens,
} from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { compressPhoto, MAX_UPLOAD_BYTES } from "@/lib/utils/photo-compress";
import { isTareConfirmed } from "@/lib/utils/plate-tare-check";
import { DEVICE_ONLINE_THRESHOLD_MS } from "@/lib/device-diagnostics";
import DevicePicker from "@/app/_components/device-picker";

type RegistroStatus = {
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
  photo_url?: string | null;
  sex?: string | null;
  microchip_number?: string | null;
  birth_date?: string | null;
  intake_date?: string | null;
};

export type Comuna = {
  value: string;
  label: string;
  provincia: string;
};

type RegistroFlowProps = {
  mode?: "page" | "modal";
  onClose?: () => void;
  onProgress?: (step: number) => void;
  // Notifica qué paso (1/2/3) tiene un error activo de guardado, o null si ninguno —
  // usado por el stepper de page.tsx para mostrar un ícono de alerta en el paso.
  onStepError?: (step: number | null) => void;
  forcedStep?: number | null;
  onDeviceTypeChange?: (deviceType: "food_bowl" | "water_bowl") => void;
  // Notifica la URL de preview de la foto de mascota (o null si no hay ninguna) cada vez
  // que cambia — usado por el stepper de page.tsx para mostrarla en el círculo del paso 2
  // una vez completado (spec 004 US2).
  onPetPhotoPreviewChange?: (url: string | null) => void;
  // Nombre de mascota ya capturado en el paso 1 fusionado (Usuario) — spec 002 FR-013.
  // Precarga petForm.name para que la persona no lo vuelva a escribir.
  initialPetName?: string;
  // Convención de cuenta de prueba (Knowledge/20_Testing/README_Testing.md) — cuando es
  // true, precarga también el resto del Registro Básico de mascota con datos de prueba.
  isTestAccount?: boolean;
};

type TooltipIconProps = {
  text: string;
};

function TooltipIcon({ text }: TooltipIconProps) {
  return (
    <span className="relative group inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] text-slate-500">
      ?
      <span className="pointer-events-none absolute left-1/2 top-7 z-10 w-56 -translate-x-1/2 rounded-[12px] border border-slate-900/10 bg-slate-900 px-3 py-2 text-[11px] text-slate-100 opacity-0 shadow-lg transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

function RequiredAsterisk() {
  return (
    <span className="ml-1 align-top text-rose-600" aria-hidden="true">
      *
    </span>
  );
}

type FieldCardProps = {
  label: string;
  tooltip?: string;
  required?: boolean;
  help?: string;
  error?: string | null;
  children: ReactNode;
};

function FieldCard({
  label,
  tooltip,
  required = false,
  help,
  error,
  children,
}: FieldCardProps) {
  return (
    <div className="rounded-[calc(var(--radius)-8px)] border border-slate-200/70 bg-white/80 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          {label}
          {required ? <RequiredAsterisk /> : null}
        </span>
        {tooltip ? <TooltipIcon text={tooltip} /> : null}
      </div>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-2 text-[11px] text-rose-600">{error}</p> : null}
      {help ? <p className="mt-2 text-[11px] text-slate-500">{help}</p> : null}
    </div>
  );
}

type YesNoFieldProps = {
  label: string;
  tooltip?: string;
  name: string;
  value: "" | "true" | "false";
  onChange: (value: "true" | "false") => void;
  showHint: boolean;
};

// Radio Sí/No reutilizado 4 veces en el paso Mascota (US5: reemplaza los <select> de
// 2 opciones — más rápido de leer y de tocar que un desplegable, ver spec 002 FR-021).
function YesNoField({
  label,
  tooltip,
  name,
  value,
  onChange,
  showHint,
}: YesNoFieldProps) {
  return (
    <FieldCard
      label={label}
      tooltip={tooltip}
      required
      error={showHint && !value ? "Selecciona una opción." : null}
    >
      <div className="flex gap-4">
        {(["true", "false"] as const).map((option) => (
          <label
            key={option}
            className="flex items-center gap-1.5 text-sm text-slate-700"
          >
            <input
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {option === "true" ? "Sí" : "No"}
          </label>
        ))}
      </div>
    </FieldCard>
  );
}

const defaultStatus: RegistroStatus = {
  userStep: null,
  hasPet: false,
  hasDevice: false,
  petCount: 0,
  deviceCount: 0,
};

const STORAGE_BUCKET = "kittypau-photos";
// Derivado de MAX_UPLOAD_BYTES (photo-compress.ts) en vez de un número propio — antes
// este archivo y pet/page.tsx tenían cada uno su propia constante de 5MB, que podían
// desincronizarse. Solo para el texto de ayuda visible; el límite real que se aplica
// es el de compressPhoto(). Ver spec 003 US3.
const MAX_PHOTO_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

// Spec 005 — calibración del plato por tara real.
// Intervalo normal de SENSORS documentado en Knowledge/07_MQTT/README_MQTT.md (default
// del firmware). Se acelera durante la prueba para que la confirmación llegue rápido
// (SC-001, bajo 15s) y se restaura a este valor al terminar, con éxito o no.
const DEFAULT_SENSOR_INTERVAL_MS = 30_000;
// 1000 (no 2000) -- /api/devices/[id]/interval valida contra un allowlist fijo
// (VALID_INTERVALS_MS) que no incluye 2000; pedir un valor fuera de esa lista devuelve
// 400 y la prueba de tara nunca se acelera, causando el timeout de confirmación (bug
// real encontrado en producción: la tara SÍ llegaba al hardware, pero la siguiente
// lectura tardaba hasta 30s en publicarse, más que TARE_CONFIRM_TIMEOUT_MS).
const TARE_FAST_INTERVAL_MS = 1_000;
const TARE_CONFIRM_TIMEOUT_MS = 15_000;
export const AVATAR_OPTIONS = [
  { id: "avatar-1", label: "Avatar 1", url: "/avatar_1.png" },
  { id: "avatar-2", label: "Avatar 2", url: "/avatar_2.png" },
  { id: "avatar-3", label: "Avatar 3", url: "/avatar_3.png" },
  { id: "avatar-4", label: "Avatar 4", url: "/avatar_5.png" },
];

// Razas más comunes en Chile — Registro Nacional de Mascotas 2025 (fuentes: CuidaPet,
// BioBioChile, T13, Meganoticias) para perro; notas veterinarias chilenas (Meganoticias,
// vetparquevespucio, supergatunos) para gato. Ver spec 002 § Assumptions.
// mestizo_quiltro/domestico_pelo_corto/domestico_pelo_largo son la opción "sin raza
// definida" — excluyente con el resto (DOC_MAESTRO_DOMINIO.md § 1: "quiltro
// excluyente"), máximo 3 en total. El pelo del gato doméstico va en la raza misma
// (corto/largo — "Domestic Shorthair/Longhair" es categorización estándar en registros
// felinos) en vez de un campo "Pelo" aparte — corregido 2026-08-17, era redundante.
const BREED_OPTIONS_DOG = [
  { value: "mestizo_quiltro", label: "Mestizo / quiltro" },
  { value: "poodle", label: "Poodle / caniche" },
  { value: "yorkshire_terrier", label: "Yorkshire Terrier" },
  { value: "dachshund", label: "Dachshund (salchicha)" },
  { value: "pastor_aleman", label: "Pastor alemán" },
  { value: "chihuahua", label: "Chihuahua" },
  { value: "fox_terrier", label: "Fox Terrier" },
  { value: "bulldog_frances", label: "Bulldog francés" },
  { value: "pug", label: "Pug" },
  { value: "pitbull_terrier_americano", label: "Pit Bull Terrier americano" },
  { value: "otra", label: "Otra" },
] as const;

const BREED_OPTIONS_CAT = [
  { value: "domestico_pelo_corto", label: "Doméstico de pelo corto (mestizo)" },
  { value: "domestico_pelo_largo", label: "Doméstico de pelo largo (mestizo)" },
  { value: "persa", label: "Persa" },
  { value: "siames", label: "Siamés" },
  { value: "maine_coon", label: "Maine Coon" },
  { value: "bengali", label: "Bengalí" },
  { value: "exotico_pelo_corto", label: "Exótico de pelo corto" },
  { value: "british_shorthair", label: "British Shorthair" },
  { value: "esfinge", label: "Esfinge" },
  { value: "otra", label: "Otra" },
] as const;

const MIXED_BREED_VALUES = new Set([
  "mestizo_quiltro",
  "domestico_pelo_corto",
  "domestico_pelo_largo",
]);
const MAX_BREEDS = 3;

// Mismo rango que valida la API (/api/pets, /api/pets/[id]) — antes era 0-50kg genérico
// para ambas especies, dejaba pasar ej. un gato de 45kg.
function weightRangeFor(type: string): [number, number] {
  if (type === "dog") return [0.5, 90];
  if (type === "cat") return [0.5, 15];
  return [0, 50];
}

export const PROVINCIA_SANTIAGO: Comuna[] = [
  { value: "cerrillos", label: "Cerrillos", provincia: "Santiago" },
  { value: "cerro_navia", label: "Cerro Navia", provincia: "Santiago" },
  { value: "conchali", label: "Conchalí", provincia: "Santiago" },
  { value: "el_bosque", label: "El Bosque", provincia: "Santiago" },
  {
    value: "estacion_central",
    label: "Estación Central",
    provincia: "Santiago",
  },
  { value: "huechuraba", label: "Huechuraba", provincia: "Santiago" },
  { value: "independencia", label: "Independencia", provincia: "Santiago" },
  { value: "la_cisterna", label: "La Cisterna", provincia: "Santiago" },
  { value: "la_florida", label: "La Florida", provincia: "Santiago" },
  { value: "la_granja", label: "La Granja", provincia: "Santiago" },
  { value: "la_pintana", label: "La Pintana", provincia: "Santiago" },
  { value: "la_reina", label: "La Reina", provincia: "Santiago" },
  { value: "las_condes", label: "Las Condes", provincia: "Santiago" },
  { value: "lo_barnechea", label: "Lo Barnechea", provincia: "Santiago" },
  { value: "lo_espejo", label: "Lo Espejo", provincia: "Santiago" },
  { value: "lo_prado", label: "Lo Prado", provincia: "Santiago" },
  { value: "macul", label: "Macul", provincia: "Santiago" },
  { value: "maipu", label: "Maipú", provincia: "Santiago" },
  { value: "nunoa", label: "Ñuñoa", provincia: "Santiago" },
  {
    value: "pedro_aguirre_cerda",
    label: "Pedro Aguirre Cerda",
    provincia: "Santiago",
  },
  { value: "penalolen", label: "Peñalolén", provincia: "Santiago" },
  { value: "providencia", label: "Providencia", provincia: "Santiago" },
  { value: "pudahuel", label: "Pudahuel", provincia: "Santiago" },
  { value: "quilicura", label: "Quilicura", provincia: "Santiago" },
  { value: "quinta_normal", label: "Quinta Normal", provincia: "Santiago" },
  { value: "recoleta", label: "Recoleta", provincia: "Santiago" },
  { value: "renca", label: "Renca", provincia: "Santiago" },
  { value: "san_joaquin", label: "San Joaquín", provincia: "Santiago" },
  { value: "san_miguel", label: "San Miguel", provincia: "Santiago" },
  { value: "san_ramon", label: "San Ramón", provincia: "Santiago" },
  { value: "santiago", label: "Santiago", provincia: "Santiago" },
  { value: "vitacura", label: "Vitacura", provincia: "Santiago" },
];

export default function RegistroFlow({
  mode = "page",
  onClose,
  onProgress,
  forcedStep = null,
  onDeviceTypeChange,
  onStepError,
  onPetPhotoPreviewChange,
  initialPetName,
  isTestAccount = false,
}: RegistroFlowProps) {
  const isModal = mode === "modal";
  const router = useRouter();
  const [status, setStatus] = useState<RegistroStatus>(defaultStatus);
  const [pets, setPets] = useState<Pet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [petError, setPetError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  useEffect(() => {
    onStepError?.(profileError ? 1 : petError ? 2 : deviceError ? 3 : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileError, petError, deviceError]);
  const [showProfileHints, setShowProfileHints] = useState(false);
  const [showPetHints, setShowPetHints] = useState(false);
  const [showDeviceHints, setShowDeviceHints] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(
    AVATAR_OPTIONS[0]?.url ?? null,
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
    country: "Chile",
    notification_channel: "email",
    is_owner: true,
    owner_name: "",
    phone_number: "",
  });

  const [petForm, setPetForm] = useState({
    name: initialPetName ?? "",
    type: "cat",
    origin: "rescatado_calle",
    // Perfil extendido (opcional) — respaldado 1:1 por columnas ya existentes
    // en `pets` y ya validadas por POST /api/pets; solo faltaba pedirlas acá.
    weight_kg: "",
    size: "",
    age_range: "",
    is_neutered: "" as "" | "true" | "false",
    has_neuter_tattoo: "" as "" | "true" | "false",
    has_microchip: "" as "" | "true" | "false",
    // Registro Básico ampliado (spec 002 User Story 4)
    sex: "" as "" | "macho" | "hembra" | "no_estoy_seguro",
    microchip_number: "",
    birth_date: "",
    intake_date: "",
  });
  // Razas (2026-08-17) — opcional, no bloquea el registro. El pelo del gato doméstico
  // vive en la raza misma (ver BREED_OPTIONS_CAT), no en un campo aparte.
  const [petBreeds, setPetBreeds] = useState<string[]>([]);
  const toggleBreed = (value: string) => {
    setPetBreeds((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      // mestizo_quiltro/domestico_pelo_corto es excluyente con el resto (raza no
      // definida) — marcarla limpia las demás, y marcar cualquier raza específica
      // la saca a ella. Máximo 3 en total, mismo patrón que "ninguna" en /pet.
      if (MIXED_BREED_VALUES.has(value)) return [value];
      const next = [...prev.filter((v) => !MIXED_BREED_VALUES.has(v)), value];
      return next.slice(0, MAX_BREEDS);
    });
  };

  useEffect(() => {
    if (!isTestAccount) return;
    // Convención de cuenta de prueba (Knowledge/20_Testing/README_Testing.md) — precarga
    // el resto del Registro Básico para poder probar el flujo sin tipear nada. Valores
    // fijos elegidos como "razonables para una mascota de prueba", documentados ahí mismo.
    setPetForm((prev) => ({
      ...prev,
      type: "cat",
      origin: "rescatado_calle",
      weight_kg: "4",
      size: "mediano",
      age_range: "adulto",
      is_neutered: "true",
      has_neuter_tattoo: "false",
      has_microchip: "false",
      sex: "hembra",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTestAccount]);

  const [deviceForm, setDeviceForm] = useState({
    pet_id: "",
    device_uuid: "",
    device_id: "", // solo display (código legible del device elegido, ver DevicePicker)
    device_type: "food_bowl" as "food_bowl" | "water_bowl",
    plate_weight_grams: "",
  });

  // Spec 005: calibración del plato por tara real, en vez de escribir el peso a mano.
  // `linkedDeviceId` (id interno de `devices`) se llena recién cuando el dispositivo ya
  // fue vinculado (POST /api/devices) — la tara necesita que el dispositivo ya exista
  // (ver research.md § Orden real de los pasos), así que "Vincular" y "Calibrar" pasan
  // a ser 2 sub-pasos en vez de 1 solo submit atómico como antes.
  const [linkedDeviceId, setLinkedDeviceId] = useState<string | null>(null);
  type TareSequenceState =
    | "esperando_conexion"
    | "listo_para_plato"
    | "tarando"
    | "confirmando"
    | "exitoso"
    | "fallido"
    | "manual";
  const [tareState, setTareState] =
    useState<TareSequenceState>("esperando_conexion");
  const [tareMessage, setTareMessage] = useState<string | null>(null);
  // US3: la persona puede pedir el camino manual desde "listo_para_plato" o desde
  // "fallido" — un booleano aparte evita mezclar esa elección con los 7 estados de la
  // máquina de la tara en sí.
  const [showManualPlateInput, setShowManualPlateInput] = useState(false);
  const tareSequenceActiveRef = useRef(false);
  const tareTimeoutRef = useRef<number | null>(null);
  // Pantalla de cierre de vinculación (pedido explícito): reemplaza el toast+redirect
  // automático de antes por una pantalla que la persona cierra a mano.
  const [showLinkCelebration, setShowLinkCelebration] = useState(false);
  // Peso en vivo del plato vinculado (pedido explícito) -- refleja cada lectura nueva
  // que llega por Realtime mientras el dispositivo está vinculado, no solo durante la
  // prueba de tara.
  const [liveWeightGrams, setLiveWeightGrams] = useState<number | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [entryPath, setEntryPath] = useState<string>("/inicio");
  const [profileSummary, setProfileSummary] = useState<{
    user_name?: string | null;
    city?: string | null;
    country?: string | null;
    notification_channel?: string | null;
    photo_url?: string | null;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    getValidAccessToken().then((value) => {
      if (mounted) setToken(value);
    });
    return () => {
      mounted = false;
    };
  }, []);
  const profileValidation = useMemo(() => {
    const issues: string[] = [];
    if (!profileForm.user_name.trim()) issues.push("Nombre requerido.");
    if (!profileForm.city.trim()) issues.push("Comuna requerida.");
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
    if (!petForm.sex) issues.push("Indica el sexo de tu mascota.");
    const weight = Number(petForm.weight_kg);
    const [minWeight, maxWeight] = weightRangeFor(petForm.type);
    if (!petForm.weight_kg.trim()) {
      issues.push("Peso requerido.");
    } else if (
      !Number.isFinite(weight) ||
      weight <= 0 ||
      weight < minWeight ||
      weight > maxWeight
    ) {
      issues.push(`Peso debe estar entre ${minWeight} y ${maxWeight} kg.`);
    }
    if (!petForm.size) issues.push("Tamaño requerido.");
    if (!petForm.age_range) issues.push("Edad requerida.");
    if (!petForm.is_neutered) issues.push("Indica si está esterilizado/a.");
    if (!petForm.has_neuter_tattoo)
      issues.push("Indica si tiene tatuaje de esterilización.");
    if (!petForm.has_microchip) issues.push("Indica si tiene microchip.");
    return { ok: issues.length === 0, issues };
  }, [petForm]);

  // Spec 005: ya no exige el peso del plato para vincular — eso pasó al
  // sub-paso de calibración (tara automática, o el input manual como
  // respaldo). Vincular solo necesita mascota + dispositivo + tipo.
  const deviceValidation = useMemo(() => {
    const issues: string[] = [];
    if (!deviceForm.pet_id) issues.push("Selecciona una mascota.");
    if (!deviceForm.device_uuid) {
      issues.push("Selecciona un dispositivo de la lista.");
    }
    if (!deviceForm.device_type.trim())
      issues.push("Tipo de dispositivo requerido.");
    return { ok: issues.length === 0, issues };
  }, [deviceForm]);

  // Spec 005 US3: validación del respaldo manual — solo se evalúa si la persona
  // elige ese camino, nunca bloquea la tara automática.
  const manualPlateValidation = useMemo(() => {
    const issues: string[] = [];
    const tare = Number(deviceForm.plate_weight_grams);
    if (!deviceForm.plate_weight_grams.trim()) {
      issues.push("Peso del plato requerido.");
    } else if (!Number.isFinite(tare) || tare <= 0 || tare > 5000) {
      issues.push("Peso del plato debe estar entre 1 y 5000 g.");
    }
    return { ok: issues.length === 0, issues };
  }, [deviceForm.plate_weight_grams]);

  // h-12/text-base (spec 002 FR-022/FR-023): 44px/14px quedaban justo debajo de los
  // mínimos táctil (48px) y tipográfico (16px, evita además el auto-zoom de iOS en
  // inputs). Las etiquetas en mayúscula chica de FieldCard quedan igual a propósito —
  // es un patrón de "eyebrow label" deliberado y ya establecido en toda la app, no el
  // texto que la guía busca agrandar (ese es el valor que la persona escribe/lee).
  const inputClass = (hasError: boolean) =>
    `h-12 rounded-[var(--radius)] border px-4 text-base text-slate-900 outline-none ${
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
  const displayStep = forcedStep ?? currentStep;
  const sessionExpired = useMemo(() => {
    if (!error) return false;
    return (
      /sesi[oó]n expir[oó]/i.test(error) || /iniciar sesi[oó]n/i.test(error)
    );
  }, [error]);

  const sectionClass = isModal
    ? "kp-scroll h-[min(62dvh,560px)] overflow-y-auto overscroll-contain rounded-[var(--radius)] border border-slate-200/70 bg-white px-5 py-4 shadow-none"
    : "{sectionClass}";

  const errorCardClass = isModal
    ? "rounded-[var(--radius)] border border-rose-200/70 bg-rose-50/80 px-5 py-4 text-sm text-rose-700"
    : "{errorCardClass}";

  const sessionCardClass = isModal
    ? "rounded-[var(--radius)] border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-800"
    : "{sessionCardClass}";

  useEffect(() => {
    onProgress?.(currentStep);
  }, [currentStep, onProgress]);

  useEffect(() => {
    onDeviceTypeChange?.(deviceForm.device_type);
  }, [deviceForm.device_type, onDeviceTypeChange]);

  // Spec 004 US2: mismo patrón que los 2 useEffect de arriba, para que page.tsx pueda
  // mostrar la foto de mascota en el círculo del stepper una vez completado el paso 2.
  useEffect(() => {
    onPetPhotoPreviewChange?.(petPhotoPreview);
  }, [petPhotoPreview, onPetPhotoPreviewChange]);

  // Antes rechazaba de plano cualquier archivo >MAX_PHOTO_MB antes de llegar al editor
  // de recorte (applyCrop, más abajo) que ya comprimía — pero ese editor es manual y
  // opcional (el usuario tiene que abrirlo a mano), así que una foto de celular pesada
  // nunca llegaba a comprimirse. Ahora compressPhoto() reduce automáticamente al
  // seleccionar el archivo; el editor de recorte sigue disponible aparte, ahora sobre
  // una foto ya liviana. Ver spec 003.
  const preparePhoto = async (
    file: File | null,
    setFile: (value: File | null) => void,
    setPreview: (value: string | null) => void,
  ) => {
    setPhotoError(null);
    if (!file) {
      setFile(null);
      setPreview(null);
      return;
    }
    try {
      const compressed = await compressPhoto(file);
      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch (err) {
      setPhotoError(
        err instanceof Error ? err.message : "No se pudo procesar la foto.",
      );
    }
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
      Math.max(-maxOffsetX, (cropX / 100) * maxOffsetX),
    );
    const offsetY = Math.min(
      maxOffsetY,
      Math.max(-maxOffsetY, (cropY / 100) * maxOffsetY),
    );
    const dx = (size - drawWidth) / 2 + offsetX;
    const dy = (size - drawHeight) / 2 + offsetY;

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92),
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
        router.push(entryPath);
      }
    }, 1400);
  };

  const loadStatus = async (accessToken = token, allowRetry = true) => {
    if (!accessToken) return;

    try {
      const [statusRes, petsRes, profileRes, accountRes] = await Promise.all([
        fetch("/api/registro/status", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch("/api/pets", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch("/api/profiles", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch("/api/account/type", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (
        (statusRes.status === 401 ||
          petsRes.status === 401 ||
          profileRes.status === 401 ||
          accountRes.status === 401) &&
        allowRetry
      ) {
        const supabase = getSupabaseBrowser();
        if (!supabase) {
          throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
        }
        const session = await getSupabaseSessionSafely();
        const nextToken = session?.access_token ?? null;
        if (nextToken && nextToken !== accessToken) {
          setTokens({
            accessToken: nextToken,
            refreshToken: session?.refresh_token,
          });
          setToken(nextToken);
          await loadStatus(nextToken, false);
          return;
        }
        throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
      }

      if (!statusRes.ok) {
        throw new Error("No se pudo cargar el estado del registro.");
      }
      if (!petsRes.ok) {
        throw new Error("No se pudieron cargar las mascotas.");
      }
      if (!profileRes.ok) {
        throw new Error("No se pudo cargar el perfil.");
      }

      const statusData = (await statusRes.json()) as RegistroStatus;
      const petsData = (await petsRes.json()) as Pet[];
      const profileDataRaw = await profileRes.json();
      const accountPayload = accountRes.ok
        ? await accountRes.json().catch(() => null)
        : null;
      const profileData = (profileDataRaw?.profile ?? profileDataRaw) as {
        user_name?: string | null;
        city?: string | null;
        country?: string | null;
        notification_channel?: string | null;
        photo_url?: string | null;
        email?: string | null;
      } | null;

      setStatus(statusData);
      setPets(petsData ?? []);
      setProfileSummary(profileData ?? null);
      setAccountEmail((prev) => profileData?.email ?? prev);
      setEntryPath(
        accountPayload?.account_type === "admin" ||
          accountPayload?.account_type === "tester"
          ? "/today"
          : "/inicio",
      );
      setDeviceForm((prev) => ({
        ...prev,
        pet_id: prev.pet_id || petsData?.[0]?.id || "",
      }));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el registro.",
      );
    } finally {
      setIsLoading(false);
    }
  };
  const retryLoadStatus = async () => {
    setIsLoading(true);
    const nextToken = (await getValidAccessToken()) ?? token;
    if (!nextToken) {
      setIsLoading(false);
      setError("Tu sesión expiró. Inicia sesión nuevamente.");
      return;
    }
    setToken(nextToken);
    await loadStatus(nextToken, false);
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

    getSupabaseSessionSafely().then((session) => {
      if (!isMounted) return;
      if (session?.access_token) {
        setAccountEmail(session.user?.email ?? null);
        setTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        });
        setToken(session.access_token);
      } else {
        setError("Necesitas iniciar sesión para completar el registro.");
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        if (session?.access_token) {
          setAccountEmail(session.user?.email ?? null);
          setTokens({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
          setToken(session.access_token);
        }
      },
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
        err instanceof Error ? err.message : "No se pudo guardar el perfil.",
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
      const toBool = (v: "" | "true" | "false") =>
        v === "" ? null : v === "true";
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: petForm.name,
          type: petForm.type,
          origin: petForm.origin,
          weight_kg: petForm.weight_kg.trim()
            ? Number(petForm.weight_kg)
            : null,
          size: petForm.size || null,
          age_range: petForm.age_range || null,
          is_neutered: toBool(petForm.is_neutered),
          has_neuter_tattoo: toBool(petForm.has_neuter_tattoo),
          has_microchip: toBool(petForm.has_microchip),
          photo_url: petPhotoUrl,
          pet_onboarding_step: "pet_profile",
          sex: petForm.sex || null,
          microchip_number: petForm.microchip_number.trim() || null,
          birth_date: petForm.birth_date || null,
          intake_date: petForm.intake_date || null,
          breeds: petBreeds,
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
        err instanceof Error ? err.message : "No se pudo crear la mascota.",
      );
    } finally {
      setIsSavingPet(false);
    }
  };

  // Spec 005: antes este único submit creaba el dispositivo Y terminaba el registro. Ahora
  // solo vincula (sin plate_weight_grams -- queda null, listo para tara) y deja paso a la
  // secuencia de calibración; finishDeviceStep() hace lo que antes hacía el final de esta
  // función (marcar onboarding completo + redirigir).
  const linkDevice = async () => {
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
          pet_id: deviceForm.pet_id,
          device_uuid: deviceForm.device_uuid,
          device_type: deviceForm.device_type,
          status: "active",
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          payload?.error ?? "No se pudo registrar el dispositivo.",
        );
      }

      const data = (await res.json()) as {
        id: string;
        last_seen?: string | null;
      };
      setLinkedDeviceId(data.id);

      // FR-009 (no-negociable): resguardo extra -- la tara solo se ofrece si este
      // dispositivo recién vinculado no tiene ninguna lectura propia todavía. En el
      // flujo normal esto siempre es así (la vinculación acaba de crear la fila), pero
      // es una comprobación barata que lo deja explícito en vez de asumido.
      let hasPriorReadings = false;
      try {
        const readingsRes = await fetch(
          `/api/readings?device_id=${data.id}&limit=1`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (readingsRes.ok) {
          const rows = (await readingsRes.json()) as unknown[];
          hasPriorReadings = Array.isArray(rows) && rows.length > 0;
        }
      } catch {
        // Si el chequeo falla, no bloqueamos el flujo -- se sigue con la calibración
        // normal; es un resguardo adicional, no la única defensa (ver research.md).
      }

      if (hasPriorReadings) {
        setTareState("fallido");
        setTareMessage(
          "Este dispositivo ya tiene lecturas registradas — la calibración automática no está disponible acá. Usá el ingreso manual, o recalibralo desde la configuración del dispositivo.",
        );
        setShowManualPlateInput(true);
        return;
      }

      const isOnline =
        data.last_seen != null &&
        Date.now() - new Date(data.last_seen).getTime() <=
          DEVICE_ONLINE_THRESHOLD_MS;
      setTareState(isOnline ? "listo_para_plato" : "fallido");
      if (!isOnline) {
        setTareMessage(
          "No detectamos conexión reciente con tu dispositivo. Verifica que esté encendido y conectado a WiFi.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar el dispositivo.",
      );
    } finally {
      setIsSavingDevice(false);
    }
  };

  const restoreNormalInterval = async () => {
    if (!linkedDeviceId || !token) return;
    try {
      await fetch(`/api/devices/${linkedDeviceId}/interval`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value_ms: DEFAULT_SENSOR_INTERVAL_MS }),
      });
    } catch {
      // Best-effort: no bloquear el flujo de registro si esto falla. El intervalo
      // acelerado es transitorio y de bajo riesgo aunque quede sin restaurar un rato.
    }
  };

  const handleTareReading = (weightGrams: number) => {
    if (!tareSequenceActiveRef.current) return; // ignora lecturas fuera de esta prueba
    tareSequenceActiveRef.current = false;
    if (tareTimeoutRef.current !== null) {
      window.clearTimeout(tareTimeoutRef.current);
      tareTimeoutRef.current = null;
    }
    if (isTareConfirmed(weightGrams)) {
      setTareState("exitoso");
      setTareMessage("Listo — ahora tenemos el peso de tu plato.");
    } else {
      setTareState("fallido");
      setTareMessage(
        `La lectura no confirmó el cero (dio ${Math.round(weightGrams)} g). Probemos de nuevo.`,
      );
    }
    void restoreNormalInterval();
  };

  // US1 FR-002/FR-004: conexión → colocar plato → tara → confirmación, en ese orden.
  const startTareSequence = async () => {
    if (!linkedDeviceId || !token) return;
    setTareState("tarando");
    setTareMessage(null);
    try {
      const intervalRes = await fetch(
        `/api/devices/${linkedDeviceId}/interval`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value_ms: TARE_FAST_INTERVAL_MS }),
        },
      );
      if (!intervalRes.ok) {
        // No seguir a la tara si esto falla: sin el intervalo rápido, la confirmación
        // puede tardar hasta 30s (el intervalo normal) y siempre daría timeout falso.
        throw new Error(
          "No se pudo acelerar la lectura del dispositivo para confirmar la tara.",
        );
      }
      const tareRes = await fetch(`/api/devices/${linkedDeviceId}/tare`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!tareRes.ok) {
        throw new Error("No se pudo enviar el comando de tara.");
      }
      tareSequenceActiveRef.current = true;
      // US2 FR-005: si no llega confirmación a tiempo, se da la prueba por fallida
      // (no colgada) y se ofrece repetir.
      tareTimeoutRef.current = window.setTimeout(() => {
        if (!tareSequenceActiveRef.current) return;
        tareSequenceActiveRef.current = false;
        setTareState("fallido");
        setTareMessage(
          "No llegó una lectura de confirmación a tiempo. Probemos de nuevo.",
        );
        void restoreNormalInterval();
      }, TARE_CONFIRM_TIMEOUT_MS);
    } catch (err) {
      setTareState("fallido");
      setTareMessage(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar la calibración.",
      );
      void restoreNormalInterval();
    }
  };

  const retryTareSequence = () => {
    setTareMessage(null);
    setTareState("listo_para_plato");
  };

  // US3: respaldo si la prueba automática no es viable ahora — mismo camino que existía
  // antes de este feature (PATCH del peso escrito a mano), sin ejecutar ninguna tara.
  const submitManualPlateWeight = async () => {
    if (!linkedDeviceId || !token) return;
    setShowDeviceHints(true);
    if (!manualPlateValidation.ok) {
      setTareMessage(manualPlateValidation.issues.join(" "));
      return;
    }
    setIsSavingDevice(true);
    try {
      const res = await fetch(`/api/devices/${linkedDeviceId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plate_weight_grams: Number(deviceForm.plate_weight_grams),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          payload?.error ?? "No se pudo guardar el peso del plato.",
        );
      }
      setTareState("manual");
      setTareMessage(null);
    } catch (err) {
      setTareMessage(
        err instanceof Error
          ? err.message
          : "No se pudo guardar el peso del plato.",
      );
    } finally {
      setIsSavingDevice(false);
    }
  };

  const finishDeviceStep = async () => {
    if (!token) return;
    try {
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
      // Vinculación ya guardada en el backend acá arriba -- la celebración de abajo es
      // solo la confirmación visual, "Cerrar" navega recién cuando la persona lo pide.
      setShowLinkCelebration(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo completar el registro.",
      );
    }
  };

  const closeLinkCelebration = () => {
    setShowLinkCelebration(false);
    onClose?.();
    router.push(entryPath);
  };

  // Confirmación en vivo (US1 FR-004): Realtime sobre `readings`, mismo patrón que ya usa
  // bowl/page.tsx. ponytail: sin fallback de polling explícito acá (a diferencia del que
  // sí existe en bowl/page.tsx) -- Realtime es el mecanismo primario y ya cubre el caso
  // real; si en producción se ve que Realtime no conecta lo suficiente, agregar el mismo
  // polling de /api/readings que research.md ya documenta como alternativa.
  useEffect(() => {
    if (!linkedDeviceId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const connect = async () => {
      const accessToken = await getValidAccessToken();
      if (!active || !accessToken) return;
      supabase.realtime.setAuth(accessToken);
      channel = supabase
        .channel(`tare-calibration:${linkedDeviceId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "readings",
            filter: `device_id=eq.${linkedDeviceId}`,
          },
          (payload) => {
            const reading = payload.new as { weight_grams?: number | null };
            if (typeof reading.weight_grams === "number") {
              setLiveWeightGrams(reading.weight_grams);
              handleTareReading(reading.weight_grams);
            }
          },
        )
        .subscribe();
    };

    void connect();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedDeviceId]);

  // Salvaguarda: si la persona navega fuera a mitad de la calibración, restaurar el
  // intervalo normal en vez de dejarlo acelerado (ver research.md § riesgo a mitigar).
  useEffect(() => {
    return () => {
      if (tareTimeoutRef.current !== null) {
        window.clearTimeout(tareTimeoutRef.current);
      }
      if (tareSequenceActiveRef.current) {
        tareSequenceActiveRef.current = false;
        void restoreNormalInterval();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    // Skeleton screen en vez de texto plano (rescate #5 de la guía de barras de
    // progreso) — misma forma aproximada del formulario que está por aparecer, mejor
    // percepción de velocidad que "Cargando registro...".
    return (
      <div
        className={isModal ? "px-2 py-4" : "min-h-screen bg-white px-6 py-12"}
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Cargando registro...</span>
        <div className="animate-pulse space-y-4" aria-hidden="true">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="h-11 w-full rounded-[var(--radius)] bg-slate-100" />
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-11 w-full rounded-[var(--radius)] bg-slate-100" />
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="h-11 w-full rounded-[var(--radius)] bg-slate-100" />
          <div className="h-11 w-full rounded-[var(--radius)] bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isModal
          ? "w-full"
          : "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,232,240,0.7),_rgba(248,250,252,1))] px-6 py-10"
      }
    >
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
      <div
        className={
          isModal
            ? "mx-auto flex w-full max-w-4xl flex-col gap-5"
            : "mx-auto flex w-full max-w-4xl flex-col gap-8"
        }
      >
        {!isModal ? (
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Registro Kittypau
              </p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                Registro Kittypau
              </h1>
              <p className="kp-pettech-tagline mt-1">PetTech AIoT</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <Link
                href={entryPath}
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Volver al feed
              </Link>
            </div>
          </header>
        ) : null}

        {error ? <div className={errorCardClass}>{error}</div> : null}
        {sessionExpired ? (
          <section className={sessionCardClass}>
            <p className="font-semibold">Tu sesión necesita revalidación.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void retryLoadStatus();
                }}
                className="rounded-[var(--radius)] border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => {
                  clearTokens();
                  router.push("/login?register=1");
                }}
                className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Volver a login
              </button>
              {!isModal ? (
                <Link
                  href="/login?register=1"
                  className="text-xs font-semibold text-slate-700 underline"
                >
                  Abrir login
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        {displayStep === 1 && (
          <section className={sectionClass}>
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
                    Elige tu avatar <span className="text-rose-600">*</span>
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => {
                    const isActive = selectedAvatar === avatar.url;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.url)}
                        className={`h-[72px] w-[72px] overflow-hidden rounded-full border ${
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
                  <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FieldCard
                label="Nombre"
                tooltip="Nombre visible en la app."
                required
                help="Nombre visible en la app."
                error={
                  showProfileHints && !profileForm.user_name.trim()
                    ? "Escribe tu nombre para continuar."
                    : null
                }
              >
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
              </FieldCard>

              <FieldCard
                label="Comuna"
                tooltip="Usaremos tu comuna para pilotos, soporte y futuras alertas locales."
                required
                help="Provincia de Santiago."
                error={
                  showProfileHints && !profileForm.city.trim()
                    ? "Selecciona tu comuna."
                    : null
                }
              >
                <select
                  className={inputClass(!profileForm.city.trim())}
                  value={profileForm.city}
                  onChange={(event) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      city: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona comuna</option>
                  {PROVINCIA_SANTIAGO.map((comuna) => (
                    <option key={comuna.value} value={comuna.value}>
                      {comuna.label}
                    </option>
                  ))}
                </select>
              </FieldCard>

              <FieldCard
                label="País"
                tooltip="Define tu región principal."
                required
                help="Define tu región principal."
                error={
                  showProfileHints && !profileForm.country.trim()
                    ? "Define tu país para completar el perfil."
                    : null
                }
              >
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
              </FieldCard>

              <FieldCard label="Canal" tooltip="Elige cómo recibir alertas.">
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
              </FieldCard>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[calc(var(--radius)-8px)] border border-slate-200/70 bg-white/80 px-4 py-3">
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
                <p className="mt-2 text-[11px] text-slate-500">
                  Si no eres el dueño, agrega el nombre del responsable.
                </p>
              </div>

              {!profileForm.is_owner ? (
                <FieldCard
                  label="Nombre del dueño"
                  required
                  error={
                    showProfileHints && !profileForm.owner_name.trim()
                      ? "Indica el nombre del dueño."
                      : null
                  }
                >
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
                </FieldCard>
              ) : null}

              {profileForm.notification_channel === "whatsapp" ? (
                <FieldCard
                  label="Número WhatsApp"
                  required
                  help="Incluye prefijo de país si aplica."
                  error={
                    showProfileHints && !profileForm.phone_number.trim()
                      ? "Agrega un número de contacto."
                      : null
                  }
                >
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
                </FieldCard>
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

        {displayStep === 2 && (
          <section className={sectionClass}>
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
              Completa el perfil completo de tu mascota — nos ayuda a
              personalizar las historias y a entender mejor su alimentación e
              hidratación.
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
                  <p className="font-semibold text-slate-700">
                    Foto de mascota
                  </p>
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
                            setPetPhotoPreview,
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
                            setPetPhotoPreview,
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
            <div className="mt-4 flex flex-col gap-3">
              <FieldCard
                label="Nombre"
                tooltip="Nombre que verás en el feed."
                required
                help="Nombre que verás en el feed."
                error={
                  showPetHints && !petForm.name.trim()
                    ? "Escribe el nombre de tu mascota."
                    : null
                }
              >
                <input
                  className={inputClass(!petForm.name.trim())}
                  placeholder="Nombre"
                  value={petForm.name}
                  onChange={(event) =>
                    setPetForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </FieldCard>

              <FieldCard
                label="Especie"
                tooltip="Gato o perro."
                required
                error={
                  showPetHints && !petForm.type.trim()
                    ? "Selecciona la especie."
                    : null
                }
              >
                <select
                  className={inputClass(!petForm.type.trim())}
                  value={petForm.type}
                  onChange={(event) =>
                    setPetForm((prev) => ({
                      ...prev,
                      type: event.target.value,
                    }))
                  }
                >
                  <option value="cat">Gato</option>
                  <option value="dog">Perro</option>
                </select>
              </FieldCard>

              <FieldCard
                label="Sexo"
                required
                error={
                  showPetHints && !petForm.sex
                    ? "Indica el sexo de tu mascota."
                    : null
                }
              >
                <div className="flex flex-col gap-2">
                  {(
                    [
                      { value: "macho", label: "Macho" },
                      { value: "hembra", label: "Hembra" },
                      { value: "no_estoy_seguro", label: "No estoy seguro" },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="pet-sex"
                        value={option.value}
                        checked={petForm.sex === option.value}
                        onChange={() =>
                          setPetForm((prev) => ({
                            ...prev,
                            sex: option.value,
                          }))
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </FieldCard>

              <div className="sm:col-span-2">
                <FieldCard
                  label={`Razas (hasta ${MAX_BREEDS})`}
                  tooltip="Ayuda a personalizar cuidados. Opcional."
                  help="Opcional."
                >
                  <div className="flex flex-wrap gap-3">
                    {(petForm.type === "dog"
                      ? BREED_OPTIONS_DOG
                      : BREED_OPTIONS_CAT
                    ).map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-1.5 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={petBreeds.includes(option.value)}
                          disabled={
                            !petBreeds.includes(option.value) &&
                            (petBreeds.length >= MAX_BREEDS ||
                              (petBreeds.some((v) =>
                                MIXED_BREED_VALUES.has(v),
                              ) &&
                                !MIXED_BREED_VALUES.has(option.value)))
                          }
                          onChange={() => toggleBreed(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </FieldCard>
              </div>

              <div className="sm:col-span-2">
                <FieldCard
                  label="Origen"
                  tooltip="Ayuda a personalizar los insights."
                  help="Ayuda a personalizar los insights."
                >
                  <select
                    className={inputClass(false)}
                    value={petForm.origin}
                    onChange={(event) =>
                      setPetForm((prev) => ({
                        ...prev,
                        origin: event.target.value,
                        // Limpia la fecha ya ingresada si cambia el tipo de fecha
                        // esperada (FR-019) — evita guardar una fecha en el campo
                        // equivocado si la persona cambia de opinión sobre el Origen.
                        birth_date: "",
                        intake_date: "",
                      }))
                    }
                  >
                    <option value="comprado">
                      Comprado (criador o tienda)
                    </option>
                    <option value="adoptado_refugio">
                      Adoptado en refugio o protectora
                    </option>
                    <option value="rescatado_calle">
                      Rescatado de la calle
                    </option>
                    <option value="regalado">Regalado / donado</option>
                    <option value="nacido_en_casa">
                      Nació en casa (camada propia)
                    </option>
                    <option value="otro">Otro</option>
                  </select>
                </FieldCard>
              </div>

              <div className="sm:col-span-2">
                <FieldCard
                  label={
                    petForm.origin === "comprado" ||
                    petForm.origin === "nacido_en_casa"
                      ? "Fecha de nacimiento"
                      : "Fecha de llegada / adopción"
                  }
                  tooltip="Opcional — se conserva la que corresponda según el Origen elegido."
                  help="Opcional."
                >
                  {petForm.origin === "comprado" ||
                  petForm.origin === "nacido_en_casa" ? (
                    <input
                      type="date"
                      className={inputClass(false)}
                      value={petForm.birth_date}
                      onChange={(event) =>
                        setPetForm((prev) => ({
                          ...prev,
                          birth_date: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <input
                      type="date"
                      className={inputClass(false)}
                      value={petForm.intake_date}
                      onChange={(event) =>
                        setPetForm((prev) => ({
                          ...prev,
                          intake_date: event.target.value,
                        }))
                      }
                    />
                  )}
                </FieldCard>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Físico
                </p>
                <div className="mt-2 flex flex-col gap-3">
                  <FieldCard
                    label="Peso (kg)"
                    tooltip="Ayuda a calibrar porciones normales."
                    required
                    error={
                      showPetHints && !petForm.weight_kg.trim()
                        ? "Ingresa el peso."
                        : null
                    }
                  >
                    <input
                      type="number"
                      min={weightRangeFor(petForm.type)[0]}
                      max={weightRangeFor(petForm.type)[1]}
                      step="0.1"
                      className={inputClass(!petForm.weight_kg.trim())}
                      placeholder="Ej: 4.5"
                      value={petForm.weight_kg}
                      onChange={(event) =>
                        setPetForm((prev) => ({
                          ...prev,
                          weight_kg: event.target.value,
                        }))
                      }
                    />
                  </FieldCard>
                  <FieldCard
                    label="Tamaño"
                    required
                    error={
                      showPetHints && !petForm.size
                        ? "Selecciona el tamaño."
                        : null
                    }
                  >
                    <select
                      className={inputClass(!petForm.size)}
                      value={petForm.size}
                      onChange={(event) =>
                        setPetForm((prev) => ({
                          ...prev,
                          size: event.target.value,
                        }))
                      }
                    >
                      <option value="" disabled>
                        Selecciona
                      </option>
                      <option value="pequeno">Pequeño</option>
                      <option value="mediano">Mediano</option>
                      <option value="grande">Grande</option>
                      <option value="gigante">Gigante</option>
                    </select>
                  </FieldCard>
                  <FieldCard
                    label="Edad"
                    required
                    error={
                      showPetHints && !petForm.age_range
                        ? "Selecciona la edad."
                        : null
                    }
                  >
                    <select
                      className={inputClass(!petForm.age_range)}
                      value={petForm.age_range}
                      onChange={(event) =>
                        setPetForm((prev) => ({
                          ...prev,
                          age_range: event.target.value,
                        }))
                      }
                    >
                      <option value="" disabled>
                        Selecciona
                      </option>
                      <option value="cachorro">Cachorro</option>
                      <option value="adulto">Adulto</option>
                      <option value="senior">Senior</option>
                    </select>
                  </FieldCard>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Salud
                </p>
                <div className="flex flex-col gap-3">
                  <YesNoField
                    label="¿Esterilizado/a?"
                    name="pet-is-neutered"
                    value={petForm.is_neutered}
                    showHint={showPetHints}
                    onChange={(value) =>
                      setPetForm((prev) => ({ ...prev, is_neutered: value }))
                    }
                  />
                  <YesNoField
                    label="¿Tatuaje de esterilización?"
                    name="pet-neuter-tattoo"
                    value={petForm.has_neuter_tattoo}
                    showHint={showPetHints}
                    onChange={(value) =>
                      setPetForm((prev) => ({
                        ...prev,
                        has_neuter_tattoo: value,
                      }))
                    }
                  />
                  <YesNoField
                    label="¿Tiene microchip?"
                    name="pet-has-microchip"
                    value={petForm.has_microchip}
                    showHint={showPetHints}
                    onChange={(value) =>
                      setPetForm((prev) => ({ ...prev, has_microchip: value }))
                    }
                  />
                </div>
                {petForm.has_microchip === "true" ? (
                  <div className="mt-3">
                    <FieldCard
                      label="Número de microchip"
                      tooltip="Opcional — agrégalo si lo tenés a mano."
                      help="Opcional, nunca bloquea el registro (FR-018)."
                    >
                      <input
                        className={inputClass(false)}
                        placeholder="Ej: 981000012345678"
                        value={petForm.microchip_number}
                        onChange={(event) =>
                          setPetForm((prev) => ({
                            ...prev,
                            microchip_number: event.target.value,
                          }))
                        }
                      />
                    </FieldCard>
                  </div>
                ) : null}
                {/* ponytail: "¿Tiene alguna condición de salud?" se sacó de acá
                    (corregido 2026-08-17, a pedido del usuario) — la sección Salud de
                    la Ficha Detallada (/pet) la reemplaza con checkboxes reales
                    investigados (condiciones/alergias/medicamentos/etc.), no un Sí/No
                    + texto libre genérico. Preguntarla acá también era un doble
                    registro cuya respuesta ni siquiera se mostraba después en /pet. */}
              </div>
            </div>

            <div className="mt-4 rounded-[calc(var(--radius)-8px)] border border-slate-200/70 bg-white/80 px-4 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">
                Después de esto: Salud y Alimentación
              </p>
              <p className="mt-1">
                Con esto ya podés seguir — el detalle de salud y alimentación de{" "}
                {petForm.name.trim() || "tu mascota"} se completa cuando quieras
                desde el menú &quot;Mascota&quot;. Te lo vamos a recordar hasta
                que lo completes.
              </p>
            </div>

            <button
              type="button"
              onClick={savePet}
              disabled={isSavingPet || !petValidation.ok}
              className="mt-4 h-12 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {isSavingPet ? "Guardando..." : "Registrar a mi mascota"}
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

        {displayStep === 3 && (
          <section className={sectionClass}>
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
              Elegí el dispositivo de la lista de equipos ya conectados y sin
              dueño todavía.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <FieldCard
                label="Mascota"
                tooltip="Selecciona la mascota a vincular."
                required
                error={
                  showDeviceHints && !deviceForm.pet_id
                    ? "Selecciona la mascota a vincular."
                    : null
                }
              >
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
              </FieldCard>

              <FieldCard
                label="Dispositivo"
                tooltip="Dispositivos ya conectados a internet, sin dueño todavía."
                required
                help="Dispositivos ya conectados a internet, sin dueño todavía."
                error={
                  showDeviceHints && !deviceForm.device_uuid
                    ? "Selecciona un dispositivo de la lista."
                    : null
                }
              >
                <DevicePicker
                  value={deviceForm.device_uuid}
                  onChange={(id, device) =>
                    setDeviceForm((prev) => ({
                      ...prev,
                      device_uuid: id,
                      device_id: device?.device_id ?? "",
                    }))
                  }
                  className={inputClass(!deviceForm.device_uuid)}
                />
              </FieldCard>

              <div className="sm:col-span-2">
                <FieldCard
                  label="Tipo de dispositivo"
                  tooltip="Food bowl o water bowl."
                  required
                  error={
                    showDeviceHints && !deviceForm.device_type.trim()
                      ? "Selecciona el tipo de dispositivo."
                      : null
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDeviceForm((prev) => ({
                          ...prev,
                          device_type: "food_bowl",
                        }))
                      }
                      className={`rounded-[var(--radius)] border px-3 py-3 text-left transition ${
                        deviceForm.device_type === "food_bowl"
                          ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <img
                        src="/illustrations/pink_food_full.png"
                        alt="Plato de comida"
                        className="mx-auto h-20 w-auto object-contain"
                      />
                      <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                        Comida
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeviceForm((prev) => ({
                          ...prev,
                          device_type: "water_bowl",
                        }))
                      }
                      className={`rounded-[var(--radius)] border px-3 py-3 text-left transition ${
                        deviceForm.device_type === "water_bowl"
                          ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <img
                        src="/illustrations/green_water_full.png"
                        alt="Plato de agua"
                        className="mx-auto h-20 w-auto object-contain"
                      />
                      <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                        Agua
                      </p>
                    </button>
                  </div>
                </FieldCard>
              </div>
            </div>

            {/* Spec 005: "Peso del plato" ya no se pide acá arriba -- pasa a la secuencia
                de calibración de abajo, disponible recién cuando el dispositivo ya está
                vinculado (la tara necesita un dispositivo real, ver research.md). */}

            {!linkedDeviceId ? (
              <>
                <button
                  type="button"
                  onClick={linkDevice}
                  disabled={isSavingDevice || !deviceValidation.ok}
                  className="mt-4 h-12 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  {isSavingDevice ? "Vinculando..." : "Vincular mi dispositivo"}
                </button>
                {isSavingDevice ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Vinculando dispositivo, por favor espera...
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
              </>
            ) : (
              <div className="mt-4 rounded-[var(--radius)] border border-slate-200/70 bg-white px-4 py-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Calibrar el peso de tu plato
                </h3>
                <p className="mt-1 text-[11px] text-slate-400">
                  Kittypau pesa el plato vacío directamente — así sabemos el
                  peso exacto de lo que sirvas después, sin que tengas que
                  escribir nada.
                </p>

                <div className="mt-3 flex items-center justify-between rounded-[calc(var(--radius)-8px)] border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    Peso en vivo
                  </span>
                  <span
                    className="text-sm font-semibold text-slate-900"
                    aria-live="polite"
                  >
                    {liveWeightGrams !== null
                      ? `${Math.round(liveWeightGrams)} g`
                      : "esperando lectura..."}
                  </span>
                </div>

                {tareState === "esperando_conexion" ? (
                  <p className="mt-3 text-xs text-slate-500" aria-live="polite">
                    Verificando conexión con tu dispositivo...
                  </p>
                ) : null}

                {tareState === "listo_para_plato" && !showManualPlateInput ? (
                  <>
                    <p className="mt-3 text-xs text-slate-600">
                      Kittypau listo. Agrega el plato vacío donde irá comida o
                      agua, y confirmá cuando esté puesto.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={startTareSequence}
                        className="h-12 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground"
                      >
                        Ya coloqué el plato
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualPlateInput(true)}
                        className="h-12 rounded-[var(--radius)] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                      >
                        Prefiero ingresarlo a mano
                      </button>
                    </div>
                  </>
                ) : null}

                {tareState === "tarando" ? (
                  <p className="mt-3 text-xs text-slate-600" aria-live="polite">
                    Pesando plato......
                  </p>
                ) : null}

                {tareState === "confirmando" ? (
                  <p className="mt-3 text-xs text-slate-600" aria-live="polite">
                    Confirmando resultado...
                  </p>
                ) : null}

                {tareState === "exitoso" ? (
                  <>
                    <p className="mt-3 text-xs text-emerald-700" role="status">
                      {tareMessage}
                    </p>
                    <button
                      type="button"
                      onClick={finishDeviceStep}
                      className="mt-3 h-12 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    >
                      Continuar
                    </button>
                  </>
                ) : null}

                {tareState === "fallido" && !showManualPlateInput ? (
                  <>
                    <p className="mt-3 text-xs text-rose-600" role="alert">
                      {tareMessage ?? "Algo salió mal con la calibración."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={retryTareSequence}
                        className="h-12 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground"
                      >
                        Repetir prueba
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualPlateInput(true)}
                        className="h-12 rounded-[var(--radius)] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                      >
                        Ingresarlo a mano
                      </button>
                    </div>
                  </>
                ) : null}

                {showManualPlateInput ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <FieldCard
                      label="Peso del plato (g)"
                      tooltip="Peso del plato auxiliar vacío que va sobre Kittypau. Esto permite calcular contenido exacto."
                      required
                      help="Alternativa manual — el camino recomendado es la calibración automática de arriba."
                      error={
                        showDeviceHints && !manualPlateValidation.ok
                          ? manualPlateValidation.issues.join(" ")
                          : null
                      }
                    >
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        className={inputClass(
                          showDeviceHints && !manualPlateValidation.ok,
                        )}
                        placeholder="Ej: 320"
                        value={deviceForm.plate_weight_grams}
                        onChange={(event) =>
                          setDeviceForm((prev) => ({
                            ...prev,
                            plate_weight_grams: event.target.value,
                          }))
                        }
                      />
                    </FieldCard>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={submitManualPlateWeight}
                        disabled={isSavingDevice}
                        className="h-12 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground"
                      >
                        {isSavingDevice ? "Guardando..." : "Guardar peso"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualPlateInput(false)}
                        className="h-12 rounded-[var(--radius)] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                      >
                        Volver a la prueba automática
                      </button>
                    </div>
                    {tareMessage ? (
                      <p className="mt-2 text-xs text-rose-600" role="alert">
                        {tareMessage}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {tareState === "manual" ? (
                  <>
                    <p className="mt-3 text-xs text-slate-600">
                      Peso del plato guardado: {deviceForm.plate_weight_grams}{" "}
                      g.
                    </p>
                    <button
                      type="button"
                      onClick={finishDeviceStep}
                      className="mt-3 h-12 rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground"
                    >
                      Continuar
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </section>
        )}

        {displayStep === 4 && (
          <section className={sectionClass}>
            <h2 className="text-lg font-semibold text-slate-900">
              Bienvenido a Kittypau
            </h2>
            <p className="kp-pettech-tagline mt-1">PetTech AIoT</p>
            <p className="text-sm text-slate-500">
              Registro completado. Este es el resumen de tu configuración.
            </p>
            <div className="mt-4 grid gap-3 text-xs text-slate-600 md:grid-cols-4">
              <div className="rounded-[var(--radius)] border border-slate-200/70 bg-white px-3 py-3">
                Cuenta: {accountEmail ?? "confirmada"}
              </div>
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
            {profileForm.user_name || petForm.name || deviceForm.device_id ? (
              <div className="mt-4 rounded-[var(--radius)] border border-slate-200/70 bg-white px-4 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Resumen rápido</p>
                <div className="mt-2 grid gap-1">
                  {profileSummary?.photo_url || selectedAvatar ? (
                    <div className="mb-1 flex items-center gap-2">
                      <img
                        src={profileSummary?.photo_url ?? selectedAvatar ?? ""}
                        alt="Foto de perfil"
                        className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                      />
                      <span>Foto de perfil</span>
                    </div>
                  ) : null}
                  {(pets.find((pet) => pet.id === deviceForm.pet_id)
                    ?.photo_url ?? petPhotoPreview) ? (
                    <div className="mb-1 flex items-center gap-2">
                      <img
                        src={
                          pets.find((pet) => pet.id === deviceForm.pet_id)
                            ?.photo_url ??
                          petPhotoPreview ??
                          ""
                        }
                        alt="Foto de mascota"
                        className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                      />
                      <span>Foto de mascota</span>
                    </div>
                  ) : null}
                  {profileForm.user_name ? (
                    <span>Usuario: {profileForm.user_name}</span>
                  ) : null}
                  {petForm.name ? <span>Mascota: {petForm.name}</span> : null}
                  {deviceForm.device_id ? (
                    <span>Dispositivo: {deviceForm.device_id}</span>
                  ) : null}
                  <span>
                    Tipo:{" "}
                    {deviceForm.device_type === "water_bowl"
                      ? "Agua"
                      : "Comida"}
                  </span>
                </div>
              </div>
            ) : null}
            <Link
              href={entryPath}
              className="mt-4 inline-flex h-12 items-center rounded-[var(--radius)] bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Continuar al dashboard
            </Link>
          </section>
        )}

        {displayStep === 4 ? (
          <div className="text-xs text-slate-500">
            Estado: {status.petCount} mascotas · {status.deviceCount}{" "}
            dispositivos.
          </div>
        ) : null}
      </div>
      {showLinkCelebration ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md rounded-[var(--radius)] border border-slate-200 bg-white px-6 py-8 text-center shadow-xl"
          >
            <svg
              viewBox="0 0 200 160"
              className="mx-auto h-40 w-full max-w-xs"
              aria-hidden="true"
            >
              <motion.path
                d="M 100 20 L 30 130 L 170 130 Z"
                fill="none"
                stroke="var(--primary, #f0a998)"
                strokeWidth={2}
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              {/* Punta: Kittypau (el dispositivo vinculado) */}
              <motion.g
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <image
                  href="/logo_carga.jpg"
                  x={82}
                  y={2}
                  width={36}
                  height={36}
                  style={{ clipPath: "circle(18px at 18px 18px)" }}
                />
              </motion.g>
              {/* Base izquierda: quién vinculó */}
              <motion.g
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <image
                  href={profileSummary?.photo_url ?? selectedAvatar ?? ""}
                  x={10}
                  y={112}
                  width={36}
                  height={36}
                  style={{ clipPath: "circle(18px at 18px 18px)" }}
                />
              </motion.g>
              {/* Base derecha: la mascota vinculada */}
              <motion.g
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <image
                  href={
                    pets.find((pet) => pet.id === deviceForm.pet_id)
                      ?.photo_url ??
                    petPhotoPreview ??
                    ""
                  }
                  x={154}
                  y={112}
                  width={36}
                  height={36}
                  style={{ clipPath: "circle(18px at 18px 18px)" }}
                />
              </motion.g>
            </svg>
            <div className="mt-1 flex items-center justify-between px-2 text-xs font-semibold text-slate-600">
              <span>{profileForm.user_name || "Vos"}</span>
              <span>{petForm.name || "tu mascota"}</span>
            </div>
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              className="mt-4 text-lg font-bold text-slate-900"
            >
              ¡Terminaste la vinculación!
            </motion.h3>
            <p className="mt-1 text-xs text-slate-500">
              {deviceForm.device_id} ya quedó vinculado a{" "}
              {petForm.name || "tu mascota"}.
            </p>
            <button
              type="button"
              onClick={closeLinkCelebration}
              className="mt-5 h-12 w-full rounded-[var(--radius)] bg-primary text-sm font-semibold text-primary-foreground"
            >
              Cerrar
            </button>
          </motion.div>
        </div>
      ) : null}
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
                    onChange={(event) =>
                      setCropScale(Number(event.target.value))
                    }
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Horizontal
                  </label>
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
                  <label className="font-semibold text-slate-700">
                    Vertical
                  </label>
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
