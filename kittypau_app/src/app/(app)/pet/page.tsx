"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getValidAccessToken, signOutSession } from "@/lib/auth/token";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { syncSelectedPet } from "@/lib/runtime/selection-sync";
import Alert from "@/app/_components/alert";
import EmptyState from "@/app/_components/empty-state";
import PageLoadingSkeleton from "@/app/_components/page-loading-skeleton";
import OnboardingTip from "@/app/_components/onboarding-tip";
import { parseListResponse } from "@/lib/utils/api";

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
  size?: string | null;
  is_neutered?: boolean | null;
  has_neuter_tattoo?: boolean | null;
  has_microchip?: boolean | null;
  microchip_number?: string | null;
  birth_date?: string | null;
  intake_date?: string | null;
  living_environment?: string | null;
  health_profile?: Record<string, unknown> | null;
  feeding_profile?: Record<string, unknown> | null;
  origin_habitat_profile?: Record<string, unknown> | null;
  health_profile_completed_at?: string | null;
  feeding_profile_completed_at?: string | null;
  origin_habitat_completed_at?: string | null;
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

// Opciones de la Ficha Detallada — Origen y Hábitat (spec 002, mejora 2026-08-17).
// Origen reusa exactamente los 6 valores del register flow (registro-flow.tsx) — la
// investigación no encontró un origen real faltante: "hijo/a de otra mascota mía" ya
// existe como nacido_en_casa (registro-flow.tsx ya lo etiqueta "camada propia"), acá
// solo se deja el label más explícito. Estado al llegar y Tipo de vivienda no tienen
// un estándar oficial chileno (SAG regula tenencia responsable — Ley 21.020 "Ley
// Cholito" — pero no categoriza vivienda ni condición de ingreso); son las categorías
// reales que sí aparecen consistentemente en fichas de ingreso/adopción de refugios y
// clínicas (dogin.cl, contrato de adopción tipo SUBDERE) — ver spec.md § Assumptions.
const ORIGEN_OPTIONS = [
  { value: "comprado", label: "Comprado (criador o tienda)" },
  { value: "adoptado_refugio", label: "Adoptado en refugio o protectora" },
  { value: "rescatado_calle", label: "Rescatado de la calle" },
  { value: "regalado", label: "Regalado / donado" },
  {
    value: "nacido_en_casa",
    label: "Nació en casa (cría de otra mascota mía)",
  },
  { value: "otro", label: "Otro" },
] as const;

const ESTADO_LLEGADA_OPTIONS = [
  { value: "buen_estado", label: "Buen estado / saludable" },
  { value: "delgado_desnutrido", label: "Delgado o desnutrido" },
  { value: "herido_lesionado", label: "Herido o lesionado" },
  { value: "con_parasitos", label: "Con parásitos visibles" },
  { value: "enfermo", label: "Enfermo (necesitó atención inmediata)" },
  { value: "cria_muy_joven", label: "Cría muy joven (aún dependiente)" },
  { value: "otro", label: "Otro" },
] as const;

const VIVIENDA_OPTIONS = [
  { value: "departamento", label: "Departamento" },
  { value: "casa_con_patio", label: "Casa con patio" },
  { value: "casa_sin_patio", label: "Casa sin patio" },
  { value: "parcela_rural", label: "Parcela / sector rural" },
  { value: "otro", label: "Otro" },
] as const;

// Opciones de la Ficha Detallada — Salud (spec 002, mejora 2026-08-16). Investigadas
// contra fuentes veterinarias reales de Chile en vez de inventadas — ver research.md /
// conversación del spec 002 para las fuentes citadas.
const ALERGIA_OPTIONS = [
  { value: "ninguna", label: "Ninguna" },
  { value: "pulgas", label: "Pulgas (dermatitis alérgica)" },
  { value: "ambiental", label: "Ambiental (ácaros, pólenes, hongos)" },
  { value: "alimentaria", label: "Alimentaria" },
  { value: "contacto", label: "Contacto (aseo, plantas, etc.)" },
  { value: "otra", label: "Otra" },
] as const;

const MEDICAMENTO_OPTIONS = [
  { value: "ninguno", label: "Ninguno" },
  {
    value: "antiparasitario",
    label: "Antiparasitario (pulgas/garrapatas/gusanos)",
  },
  { value: "antibiotico", label: "Antibiótico" },
  { value: "antiinflamatorio", label: "Antiinflamatorio / analgésico" },
  { value: "antialergico", label: "Antialérgico" },
  { value: "suplemento", label: "Suplemento (vitaminas, articular, etc.)" },
  { value: "otro", label: "Otro" },
] as const;

const TRATAMIENTO_OPTIONS = [
  { value: "ninguno", label: "Ninguno" },
  { value: "dermatologico", label: "Dermatológico" },
  { value: "dental", label: "Dental" },
  { value: "fisioterapia", label: "Fisioterapia / rehabilitación" },
  { value: "oncologico", label: "Oncológico" },
  {
    value: "cronico",
    label: "Manejo de enfermedad crónica (renal, diabetes, cardíaca)",
  },
  { value: "otro", label: "Otro" },
] as const;

const CIRUGIA_OPTIONS = [
  { value: "ninguna", label: "Ninguna" },
  { value: "esterilizacion", label: "Esterilización / castración" },
  { value: "dental", label: "Extracción dental" },
  { value: "cuerpo_extrano", label: "Cuerpo extraño" },
  { value: "ortopedica", label: "Ortopédica" },
  { value: "otra", label: "Otra" },
] as const;

// Cartilla de vacunación real de Chile (Colegio Médico Veterinario) — difiere entre
// perro y gato, por eso son 2 listas y no una sola genérica.
const VACUNA_OPTIONS_PERRO = [
  { value: "ninguna", label: "Ninguna" },
  { value: "antirrabica", label: "Antirrábica (obligatoria por ley en Chile)" },
  {
    value: "sextuple_octuple",
    label:
      "Séxtuple / Óctuple (moquillo, parvovirus, hepatitis, leptospirosis...)",
  },
  { value: "tos_perreras", label: "Tos de las perreras (Bordetella)" },
  { value: "otra", label: "Otra" },
] as const;

const VACUNA_OPTIONS_GATO = [
  { value: "ninguna", label: "Ninguna" },
  { value: "antirrabica", label: "Antirrábica (obligatoria por ley en Chile)" },
  {
    value: "triple_felina",
    label: "Triple felina (panleucopenia, calicivirus, herpesvirus)",
  },
  { value: "leucemia_felina", label: "Leucemia felina (FeLV)" },
  { value: "otra", label: "Otra" },
] as const;

// Marcas de alimento vendidas en Chile (spec 002, mejora 2026-08-17) — investigadas por
// segmento (económico / premium nacional / premium-super premium / biológicamente
// apropiado), separadas por especie porque varias marcas tienen líneas de nombre
// distinto para perro y gato (Master Dog vs. Master Cat, Champion Dog vs. Champion Cat).
// Fuentes citadas en spec.md § Assumptions — no es un catálogo oficial (el SAG no
// mantiene uno público tipo AAFCO), es la lista de marcas/líneas reales que se venden
// en tiendas chilenas (Lider, Falabella, Best for Pets, Club de Perros y Gatos, etc.).
const MARCA_OPTIONS_PERRO = [
  {
    group: "Económico",
    options: ["Master Dog", "Dog Chow", "Pedigree"],
  },
  {
    group: "Premium nacional",
    options: ["Champion Dog", "Excellent"],
  },
  {
    group: "Premium / Super Premium",
    options: [
      "Purina One",
      "Pro Plan",
      "Royal Canin",
      "Hill's",
      "Eukanuba",
      "Advance",
      "Nutrience",
      "Bravery",
      "Brit Care",
    ],
  },
  {
    group: "Biológicamente apropiado (grain-free)",
    options: ["Orijen", "Acana", "Taste of the Wild"],
  },
] as const;

const MARCA_OPTIONS_GATO = [
  {
    group: "Económico",
    options: ["Master Cat", "Cat Chow", "Whiskas", "Felix"],
  },
  {
    group: "Premium nacional",
    options: ["Champion Cat", "Excellent"],
  },
  {
    group: "Premium / Super Premium",
    options: [
      "Purina One",
      "Pro Plan",
      "Royal Canin",
      "Hill's",
      "Eukanuba",
      "Advance",
      "Nutrience",
      "Bravery",
      "Brit Care",
    ],
  },
  {
    group: "Biológicamente apropiado (grain-free)",
    options: ["Orijen", "Acana"],
  },
] as const;

// ponytail: no existe catálogo público (SAG no mantiene ficha nutricional tipo AAFCO por
// producto, ver research del usuario en spec.md § Assumptions) — en vez de inventar nombres
// exactos de línea por marca, se usan las 2 dimensiones reales que TODAS las marcas
// investigadas comparten (Royal Canin, Champion, Pro Plan, Hill's, Master Dog, Bravery,
// Acana, Orijen): etapa de vida y necesidad especial. Fuentes en spec.md § Assumptions.
const ETAPA_OPTIONS = [
  { value: "cachorro", label: "Cachorro" },
  { value: "adulto", label: "Adulto" },
  { value: "senior", label: "Senior" },
  { value: "todas_las_etapas", label: "Todas las etapas" },
] as const;

const NECESIDAD_OPTIONS_PERRO = [
  { value: "estandar", label: "Estándar / mantención" },
  { value: "control_peso", label: "Control de peso" },
  { value: "digestion_piel_sensible", label: "Digestión o piel sensible" },
  { value: "articular", label: "Articular / movilidad" },
  { value: "urinario", label: "Urinario" },
] as const;

const NECESIDAD_OPTIONS_GATO = [
  { value: "estandar", label: "Estándar / mantención" },
  { value: "control_peso", label: "Control de peso" },
  { value: "digestion_piel_sensible", label: "Digestión o piel sensible" },
  { value: "esterilizado_indoor", label: "Esterilizado / indoor" },
  { value: "urinario", label: "Urinario" },
] as const;

function CheckboxOptionGroup({
  options,
  selected,
  onToggle,
  showOtherInput,
  otherText,
  onOtherTextChange,
  otherPlaceholder = "Detalle",
}: {
  options: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  showOtherInput: boolean;
  otherText: string;
  onOtherTextChange: (text: string) => void;
  otherPlaceholder?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-1.5 text-xs text-slate-700"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {showOtherInput ? (
        <input
          type="text"
          placeholder={otherPlaceholder}
          className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
          value={otherText}
          onChange={(event) => onOtherTextChange(event.target.value)}
        />
      ) : null}
    </div>
  );
}

export default function PetPage() {
  const [state, setState] = useState<LoadState>(defaultState);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editPayload, setEditPayload] = useState<Partial<ApiPet>>({});
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Ficha Detallada — Origen y Hábitat (spec 002, mejora 2026-08-17). Origen y
  // living_environment son columnas ya existentes (Origen ya se pedía en el register
  // flow; living_environment existía en el schema/API pero sin ningún <select> que lo
  // llenara) — esta sección es la primera UI real para ambas, más el jsonb nuevo para
  // lo que no tenía columna propia (estado al llegar, convivencia).
  const [showOriginHabitat, setShowOriginHabitat] = useState(false);
  const [originHabitatForm, setOriginHabitatForm] = useState<
    Record<string, string>
  >({});
  const [isSavingOriginHabitat, setIsSavingOriginHabitat] = useState(false);
  const [originHabitatMessage, setOriginHabitatMessage] = useState<
    string | null
  >(null);

  // Ficha Detallada — Salud y Alimentación (spec 002 User Story 6). Se guardan por
  // sección, cada una con su propio botón — no hay un solo "guardar todo".
  const [showHealth, setShowHealth] = useState(false);
  const [healthForm, setHealthForm] = useState<Record<string, string>>({});
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [healthAllergies, setHealthAllergies] = useState<string[]>([]);
  const [healthMedications, setHealthMedications] = useState<string[]>([]);
  const [healthTreatments, setHealthTreatments] = useState<string[]>([]);
  const [healthSurgeries, setHealthSurgeries] = useState<string[]>([]);
  const [healthVaccines, setHealthVaccines] = useState<string[]>([]);
  const [isSavingHealth, setIsSavingHealth] = useState(false);
  const [healthMessage, setHealthMessage] = useState<string | null>(null);

  const toggleInList = (
    list: string[],
    value: string,
    setList: (next: string[]) => void,
  ) => {
    if (list.includes(value)) {
      setList(list.filter((v) => v !== value));
      return;
    }
    // "ninguna"/"ninguno" es excluyente con el resto: marcarla limpia las demás
    // opciones, y marcar cualquier otra opción la saca a ella.
    if (value === "ninguna" || value === "ninguno") {
      setList([value]);
    } else {
      setList([
        ...list.filter((v) => v !== "ninguna" && v !== "ninguno"),
        value,
      ]);
    }
  };

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

  const profileChecklist = useMemo(() => {
    if (!selectedPet) return [];
    const missing: string[] = [];
    // ponytail: Edad y Peso NO van acá — el register flow ya los pide como
    // obligatorios (registro-flow.tsx), así que si faltan es una anomalía de datos,
    // no algo que haya que "completar" de nuevo en /pet (corregido 2026-08-17, a
    // pedido del usuario).
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
                {/* Lo básico que ya se preguntó en el register flow, visible acá sin
                    tener que abrir "Editar perfil" (pedido explícito del usuario
                    2026-08-17) — solo lectura, se edita desde "Editar perfil". */}
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-3">
                  <span>
                    Sexo:{" "}
                    <span className="text-slate-700">
                      {selectedPet?.sex ?? "sin datos"}
                    </span>
                  </span>
                  <span>
                    Peso:{" "}
                    <span className="text-slate-700">
                      {selectedPet?.weight_kg
                        ? `${selectedPet.weight_kg} kg`
                        : "sin datos"}
                    </span>
                  </span>
                  <span>
                    Tamaño:{" "}
                    <span className="text-slate-700">
                      {selectedPet?.size ?? "sin datos"}
                    </span>
                  </span>
                  <span>
                    Edad:{" "}
                    <span className="text-slate-700">
                      {selectedPet?.age_range ?? "sin datos"}
                    </span>
                  </span>
                  <span>
                    Esterilizado/a:{" "}
                    <span className="text-slate-700">
                      {selectedPet?.is_neutered === true
                        ? "Sí"
                        : selectedPet?.is_neutered === false
                          ? "No"
                          : "sin datos"}
                    </span>
                  </span>
                  <span>
                    Microchip:{" "}
                    <span className="text-slate-700">
                      {selectedPet?.has_microchip === true
                        ? (selectedPet.microchip_number ?? "Sí")
                        : selectedPet?.has_microchip === false
                          ? "No"
                          : "sin datos"}
                    </span>
                  </span>
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
              </div>
              {/* ponytail: Origen se sacó de acá (corregido 2026-08-17) — era un
                  <input> de texto libre que podía romper el valor curado que espera
                  la sección "Origen y Hábitat" (select con las 6 opciones reales).
                  Origen se edita solo desde ahí ahora; editPayload.origin sigue
                  viajando sin cambios en el submit (no se pierde nada). */}

              {/* Nuevo 2026-08-17: sexo/tamaño/esterilización/microchip/fecha se piden
                  en el register flow pero no aparecían en ningún lado de /pet después
                  — quedaban invisibles. Este bloque los hace visibles y editables,
                  mismo patrón que "Límites de consumo normal" de abajo. */}
              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Identificación
                </p>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <label className="text-xs text-slate-500">
                    Sexo
                    <select
                      className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                      value={editPayload.sex ?? ""}
                      onChange={(event) =>
                        setEditPayload((prev) => ({
                          ...prev,
                          sex: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecciona</option>
                      <option value="macho">Macho</option>
                      <option value="hembra">Hembra</option>
                      <option value="no_estoy_seguro">No estoy seguro</option>
                    </select>
                  </label>
                  <label className="text-xs text-slate-500">
                    Tamaño
                    <select
                      className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                      value={editPayload.size ?? ""}
                      onChange={(event) =>
                        setEditPayload((prev) => ({
                          ...prev,
                          size: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecciona</option>
                      <option value="pequeno">Pequeño</option>
                      <option value="mediano">Mediano</option>
                      <option value="grande">Grande</option>
                    </select>
                  </label>
                  <label className="text-xs text-slate-500">
                    {editPayload.origin === "comprado" ||
                    editPayload.origin === "nacido_en_casa"
                      ? "Fecha de nacimiento"
                      : "Fecha de llegada / adopción"}
                    <input
                      type="date"
                      className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                      value={
                        (editPayload.origin === "comprado" ||
                        editPayload.origin === "nacido_en_casa"
                          ? editPayload.birth_date
                          : editPayload.intake_date) ?? ""
                      }
                      onChange={(event) =>
                        setEditPayload((prev) =>
                          prev.origin === "comprado" ||
                          prev.origin === "nacido_en_casa"
                            ? { ...prev, birth_date: event.target.value }
                            : { ...prev, intake_date: event.target.value },
                        )
                      }
                    />
                  </label>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">¿Esterilizado/a?</p>
                    <div className="mt-2 flex gap-4 text-xs text-slate-700">
                      {[
                        { value: true, label: "Sí" },
                        { value: false, label: "No" },
                      ].map((opt) => (
                        <label
                          key={String(opt.value)}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="radio"
                            name="edit-is-neutered"
                            checked={editPayload.is_neutered === opt.value}
                            onChange={() =>
                              setEditPayload((prev) => ({
                                ...prev,
                                is_neutered: opt.value,
                              }))
                            }
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">
                      ¿Tatuaje de esterilización?
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-slate-700">
                      {[
                        { value: true, label: "Sí" },
                        { value: false, label: "No" },
                      ].map((opt) => (
                        <label
                          key={String(opt.value)}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="radio"
                            name="edit-has-neuter-tattoo"
                            checked={
                              editPayload.has_neuter_tattoo === opt.value
                            }
                            onChange={() =>
                              setEditPayload((prev) => ({
                                ...prev,
                                has_neuter_tattoo: opt.value,
                              }))
                            }
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">¿Tiene microchip?</p>
                    <div className="mt-2 flex gap-4 text-xs text-slate-700">
                      {[
                        { value: true, label: "Sí" },
                        { value: false, label: "No" },
                      ].map((opt) => (
                        <label
                          key={String(opt.value)}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            type="radio"
                            name="edit-has-microchip"
                            checked={editPayload.has_microchip === opt.value}
                            onChange={() =>
                              setEditPayload((prev) => ({
                                ...prev,
                                has_microchip: opt.value,
                              }))
                            }
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                    {editPayload.has_microchip ? (
                      <input
                        type="text"
                        placeholder="Número de microchip"
                        className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        value={editPayload.microchip_number ?? ""}
                        onChange={(event) =>
                          setEditPayload((prev) => ({
                            ...prev,
                            microchip_number: event.target.value,
                          }))
                        }
                      />
                    ) : null}
                  </div>
                </div>
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
                    Origen y Hábitat
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedPet.origin_habitat_completed_at
                      ? "Completa — podés actualizarla cuando quieras."
                      : "Pendiente — completala cuando quieras, no bloquea nada."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOriginHabitat((prev) => !prev);
                    setOriginHabitatMessage(null);
                    const profile = (selectedPet.origin_habitat_profile ??
                      {}) as Record<string, unknown>;
                    // Mascotas registradas antes de que Origen fuera un <select>
                    // curado (ej. "Adoptado", "Casa") tienen valores libres en
                    // pets.origin que no calzan con ninguna opción — sin este guard,
                    // el <select> los mostraba en blanco y la persona perdía de vista
                    // lo que ya había declarado (bug real, ver Bandida/Amanda/Benito/
                    // pasturri en producción). Se cae a "otro" preservando el texto
                    // original en origen_otro, nunca se descarta.
                    const rawOrigin = selectedPet.origin ?? "";
                    const knownOrigin = ORIGEN_OPTIONS.some(
                      (opt) => opt.value === rawOrigin,
                    );
                    setOriginHabitatForm({
                      origen: knownOrigin ? rawOrigin : rawOrigin ? "otro" : "",
                      origen_otro: knownOrigin
                        ? String(profile.origen_otro ?? "")
                        : rawOrigin || String(profile.origen_otro ?? ""),
                      estado_al_llegar: String(profile.estado_al_llegar ?? ""),
                      estado_al_llegar_otro: String(
                        profile.estado_al_llegar_otro ?? "",
                      ),
                      vivienda: selectedPet.living_environment ?? "",
                      vivienda_otro: String(profile.vivienda_otro ?? ""),
                      convive_otras_mascotas: String(
                        profile.convive_otras_mascotas ?? "",
                      ),
                    });
                  }}
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {showOriginHabitat ? "Cerrar ▴" : "Completar ▾"}
                </button>
              </div>

              {showOriginHabitat ? (
                <form
                  className="mt-4 space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const token = await getValidAccessToken();
                    if (!token) return;
                    setIsSavingOriginHabitat(true);
                    try {
                      const {
                        origen,
                        origen_otro,
                        vivienda,
                        vivienda_otro,
                        ...restProfile
                      } = originHabitatForm;
                      const updated = await savePet(token, selectedPet.id, {
                        origin: origen || null,
                        living_environment: vivienda || null,
                        origin_habitat_profile: {
                          ...restProfile,
                          origen_otro,
                          vivienda_otro,
                        },
                        origin_habitat_completed_at: new Date().toISOString(),
                      });
                      setState((prev) => ({
                        ...prev,
                        pets: prev.pets.map((pet) =>
                          pet.id === updated.id ? updated : pet,
                        ),
                      }));
                      setOriginHabitatMessage(
                        "Sección de Origen y Hábitat guardada.",
                      );
                      setShowOriginHabitat(false);
                    } catch (err) {
                      setOriginHabitatMessage(
                        err instanceof Error
                          ? err.message
                          : "No se pudo guardar.",
                      );
                    } finally {
                      setIsSavingOriginHabitat(false);
                    }
                  }}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-xs text-slate-500">
                      Origen
                      <select
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                        value={originHabitatForm.origen ?? ""}
                        onChange={(event) =>
                          setOriginHabitatForm((prev) => ({
                            ...prev,
                            origen: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecciona</option>
                        {ORIGEN_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {originHabitatForm.origen === "otro" ? (
                        <input
                          type="text"
                          placeholder="¿Cuál?"
                          className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={originHabitatForm.origen_otro ?? ""}
                          onChange={(event) =>
                            setOriginHabitatForm((prev) => ({
                              ...prev,
                              origen_otro: event.target.value,
                            }))
                          }
                        />
                      ) : null}
                    </label>
                    <label className="block text-xs text-slate-500">
                      Estado al llegar
                      <select
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                        value={originHabitatForm.estado_al_llegar ?? ""}
                        onChange={(event) =>
                          setOriginHabitatForm((prev) => ({
                            ...prev,
                            estado_al_llegar: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecciona</option>
                        {ESTADO_LLEGADA_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {originHabitatForm.estado_al_llegar === "otro" ? (
                        <input
                          type="text"
                          placeholder="¿Cuál?"
                          className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={originHabitatForm.estado_al_llegar_otro ?? ""}
                          onChange={(event) =>
                            setOriginHabitatForm((prev) => ({
                              ...prev,
                              estado_al_llegar_otro: event.target.value,
                            }))
                          }
                        />
                      ) : null}
                    </label>
                    <label className="block text-xs text-slate-500">
                      Tipo de vivienda
                      <select
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                        value={originHabitatForm.vivienda ?? ""}
                        onChange={(event) =>
                          setOriginHabitatForm((prev) => ({
                            ...prev,
                            vivienda: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecciona</option>
                        {VIVIENDA_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {originHabitatForm.vivienda === "otro" ? (
                        <input
                          type="text"
                          placeholder="¿Cuál?"
                          className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={originHabitatForm.vivienda_otro ?? ""}
                          onChange={(event) =>
                            setOriginHabitatForm((prev) => ({
                              ...prev,
                              vivienda_otro: event.target.value,
                            }))
                          }
                        />
                      ) : null}
                    </label>
                    <div>
                      <p className="text-xs text-slate-500">
                        ¿Convive con otras mascotas?
                      </p>
                      <div className="mt-1 flex gap-4 text-xs text-slate-700">
                        {[
                          { value: "true", label: "Sí" },
                          { value: "false", label: "No" },
                        ].map((opt) => (
                          <label
                            key={opt.value}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="radio"
                              name="convive-otras-mascotas"
                              checked={
                                originHabitatForm.convive_otras_mascotas ===
                                opt.value
                              }
                              onChange={() =>
                                setOriginHabitatForm((prev) => ({
                                  ...prev,
                                  convive_otras_mascotas: opt.value,
                                }))
                              }
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <button
                      type="submit"
                      disabled={isSavingOriginHabitat}
                      className="rounded-[var(--radius)] border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                    >
                      {isSavingOriginHabitat
                        ? "Guardando..."
                        : "Guardar sección de Origen y Hábitat"}
                    </button>
                  </div>
                </form>
              ) : null}
              {originHabitatMessage ? (
                <p className="mt-2 text-xs text-slate-500">
                  {originHabitatMessage}
                </p>
              ) : null}
            </section>
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
                      alergias_otra: String(profile.alergias_otra ?? ""),
                      medicamentos_otra: String(
                        profile.medicamentos_otra ?? "",
                      ),
                      tratamientos_otra: String(
                        profile.tratamientos_otra ?? "",
                      ),
                      cirugias_otra: String(profile.cirugias_otra ?? ""),
                      vacunas_otra: String(profile.vacunas_otra ?? ""),
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
                    const asList = (value: unknown): string[] =>
                      Array.isArray(value) ? (value as string[]) : [];
                    setHealthConditions(
                      asList(profile.condiciones_diagnosticadas),
                    );
                    setHealthAllergies(asList(profile.alergias));
                    setHealthMedications(asList(profile.medicamentos));
                    setHealthTreatments(asList(profile.tratamientos));
                    setHealthSurgeries(asList(profile.cirugias));
                    setHealthVaccines(asList(profile.vacunas));
                  }}
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {showHealth ? "Cerrar ▴" : "Completar ▾"}
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
                          alergias: healthAllergies,
                          medicamentos: healthMedications,
                          tratamientos: healthTreatments,
                          cirugias: healthSurgeries,
                          vacunas: healthVaccines,
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
                    <p className="text-sm font-medium text-slate-700">
                      Condiciones de salud diagnosticadas
                    </p>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {[
                        { value: "ninguna", label: "Ninguna" },
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
                            onChange={() =>
                              toggleInList(
                                healthConditions,
                                option.value,
                                setHealthConditions,
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

                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Alergias
                    </p>
                    <div className="mt-1">
                      <CheckboxOptionGroup
                        options={ALERGIA_OPTIONS}
                        selected={healthAllergies}
                        onToggle={(value) =>
                          toggleInList(
                            healthAllergies,
                            value,
                            setHealthAllergies,
                          )
                        }
                        showOtherInput={healthAllergies.includes("otra")}
                        otherText={healthForm.alergias_otra ?? ""}
                        onOtherTextChange={(text) =>
                          setHealthForm((prev) => ({
                            ...prev,
                            alergias_otra: text,
                          }))
                        }
                        otherPlaceholder="Detalle de la alergia"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Medicamentos
                    </p>
                    <div className="mt-1">
                      <CheckboxOptionGroup
                        options={MEDICAMENTO_OPTIONS}
                        selected={healthMedications}
                        onToggle={(value) =>
                          toggleInList(
                            healthMedications,
                            value,
                            setHealthMedications,
                          )
                        }
                        showOtherInput={healthMedications.includes("otro")}
                        otherText={healthForm.medicamentos_otra ?? ""}
                        onOtherTextChange={(text) =>
                          setHealthForm((prev) => ({
                            ...prev,
                            medicamentos_otra: text,
                          }))
                        }
                        otherPlaceholder="Detalle del medicamento"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Tratamientos
                    </p>
                    <div className="mt-1">
                      <CheckboxOptionGroup
                        options={TRATAMIENTO_OPTIONS}
                        selected={healthTreatments}
                        onToggle={(value) =>
                          toggleInList(
                            healthTreatments,
                            value,
                            setHealthTreatments,
                          )
                        }
                        showOtherInput={healthTreatments.includes("otro")}
                        otherText={healthForm.tratamientos_otra ?? ""}
                        onOtherTextChange={(text) =>
                          setHealthForm((prev) => ({
                            ...prev,
                            tratamientos_otra: text,
                          }))
                        }
                        otherPlaceholder="Detalle del tratamiento"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Cirugías
                    </p>
                    <div className="mt-1">
                      <CheckboxOptionGroup
                        options={CIRUGIA_OPTIONS}
                        selected={healthSurgeries}
                        onToggle={(value) =>
                          toggleInList(
                            healthSurgeries,
                            value,
                            setHealthSurgeries,
                          )
                        }
                        showOtherInput={healthSurgeries.includes("otra")}
                        otherText={healthForm.cirugias_otra ?? ""}
                        onOtherTextChange={(text) =>
                          setHealthForm((prev) => ({
                            ...prev,
                            cirugias_otra: text,
                          }))
                        }
                        otherPlaceholder="Detalle de la cirugía"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Vacunas
                    </p>
                    <div className="mt-1">
                      <CheckboxOptionGroup
                        options={
                          selectedPet.type === "dog"
                            ? VACUNA_OPTIONS_PERRO
                            : VACUNA_OPTIONS_GATO
                        }
                        selected={healthVaccines}
                        onToggle={(value) =>
                          toggleInList(healthVaccines, value, setHealthVaccines)
                        }
                        showOtherInput={healthVaccines.includes("otra")}
                        otherText={healthForm.vacunas_otra ?? ""}
                        onOtherTextChange={(text) =>
                          setHealthForm((prev) => ({
                            ...prev,
                            vacunas_otra: text,
                          }))
                        }
                        otherPlaceholder="Detalle de la vacuna"
                      />
                    </div>
                  </div>

                  <label className="block text-xs text-slate-500">
                    Historial veterinario
                    <textarea
                      className="mt-1 min-h-[60px] w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                      value={healthForm.historial_veterinario ?? ""}
                      onChange={(event) =>
                        setHealthForm((prev) => ({
                          ...prev,
                          historial_veterinario: event.target.value,
                        }))
                      }
                    />
                  </label>

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
                    const defaultEtapa =
                      selectedPet.age_range === "cachorro" ||
                      selectedPet.age_range === "adulto" ||
                      selectedPet.age_range === "senior"
                        ? selectedPet.age_range
                        : "";
                    setFeedingForm({
                      tipo_alimento: String(profile.tipo_alimento ?? ""),
                      marca: String(profile.marca ?? ""),
                      marca_otra: String(profile.marca_otra ?? ""),
                      formula_etapa: String(
                        profile.formula_etapa ?? defaultEtapa,
                      ),
                      formula_necesidad: String(
                        profile.formula_necesidad ?? "estandar",
                      ),
                      // ponytail: cantidad_diaria_g/comidas_dia/horarios NO se preguntan
                      // (corregido 2026-08-17) — Kittypau los mide con el dispositivo real,
                      // no se le pide a la persona que los autodeclare. Ver data-model.md.
                      premios_aplica: premios.aplica ? "true" : "false",
                      premios_detalle: String(premios.detalle ?? ""),
                      restricciones_alimentarias: String(
                        profile.restricciones_alimentarias ?? "",
                      ),
                    });
                  }}
                  className="rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {showFeeding ? "Cerrar ▴" : "Completar ▾"}
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
                      Marca — vendidas en Chile
                      <select
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                        value={feedingForm.marca ?? ""}
                        onChange={(event) =>
                          setFeedingForm((prev) => ({
                            ...prev,
                            marca: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecciona</option>
                        {(selectedPet.type === "dog"
                          ? MARCA_OPTIONS_PERRO
                          : MARCA_OPTIONS_GATO
                        ).map((group) => (
                          <optgroup key={group.group} label={group.group}>
                            {group.options.map((marca) => (
                              <option key={marca} value={marca}>
                                {marca}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        <option value="otra">Otra</option>
                      </select>
                      {feedingForm.marca === "otra" ? (
                        <input
                          type="text"
                          placeholder="¿Cuál?"
                          className="mt-2 w-full rounded-[var(--radius)] border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          value={feedingForm.marca_otra ?? ""}
                          onChange={(event) =>
                            setFeedingForm((prev) => ({
                              ...prev,
                              marca_otra: event.target.value,
                            }))
                          }
                        />
                      ) : null}
                    </label>
                    <label className="block text-xs text-slate-500">
                      Etapa de vida (fórmula)
                      <select
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                        value={feedingForm.formula_etapa ?? ""}
                        onChange={(event) =>
                          setFeedingForm((prev) => ({
                            ...prev,
                            formula_etapa: event.target.value,
                          }))
                        }
                      >
                        <option value="">Selecciona</option>
                        {ETAPA_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs text-slate-500">
                      Necesidad especial (fórmula)
                      <select
                        className="mt-1 w-full rounded-[var(--radius)] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                        value={feedingForm.formula_necesidad ?? "estandar"}
                        onChange={(event) =>
                          setFeedingForm((prev) => ({
                            ...prev,
                            formula_necesidad: event.target.value,
                          }))
                        }
                      >
                        {(selectedPet.type === "dog"
                          ? NECESIDAD_OPTIONS_PERRO
                          : NECESIDAD_OPTIONS_GATO
                        ).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

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
        </>
      )}
    </main>
  );
}
