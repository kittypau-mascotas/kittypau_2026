"use client";

/**
 * Identidad del visitante de la demo pública de `/today`
 * (Knowledge/29_Specs/009-demo-today-en-vivo).
 *
 * Vive SOLO en `localStorage` del navegador (claves `kittypau_demo_*`, que ya
 * usaba el modal "Personaliza tu demo" del login). No es una cuenta ni un
 * perfil real -- es lo que se superpone sobre los datos reales de la mascota
 * de demo. Sin persistencia en el servidor más allá del lead
 * (`/api/demo/ingreso`).
 *
 * Todo acceso a `localStorage` va envuelto en try/catch: en modo incógnito o
 * con almacenamiento bloqueado, `window.localStorage` puede tirar al leer o
 * escribir.
 */

export type DemoPetType = "dog" | "cat";

export type DemoIdentity = {
  ownerName: string;
  petName: string;
  petType: DemoPetType;
  /** gif por tipo -- NUNCA la foto real de la mascota de demo (SC-003). */
  avatarSrc: string;
  /** uuid del navegador -- dedupe del lead sin email (FR-011 / SC-007). */
  visitorId: string;
  email?: string;
};

export const DEMO_AVATAR_BY_TYPE: Record<DemoPetType, string> = {
  dog: "/illustrations/nervous-not.gif",
  cat: "/illustrations/giphy.gif",
};

const K = {
  mode: "kittypau_demo_mode",
  owner: "kittypau_demo_owner_name",
  pet: "kittypau_demo_pet_name",
  type: "kittypau_demo_pet_type",
  visitor: "kittypau_demo_visitor_id",
  email: "kittypau_demo_email",
  source: "kittypau_demo_source",
  recordedAt: "kittypau_demo_recorded_at",
} as const;

// Claves legado del chatbot-gato / flujos viejos (`/client-demo`, `/test`) --
// se limpian siempre que se escribe o se resetea la identidad.
const LEGACY_KEYS = [
  "kittypau_demo_show_rpg",
  "kittypau_demo_kind",
  "kittypau_demo_device_id",
];

const NAME_MAX = 120;

function ls(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function get(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function set(store: Storage, key: string, value: string) {
  try {
    store.setItem(key, value);
  } catch {
    /* incógnito / almacenamiento lleno -- se ignora */
  }
}

function del(store: Storage, key: string) {
  try {
    store.removeItem(key);
  } catch {
    /* noop */
  }
}

function normType(raw: string | null | undefined): DemoPetType {
  return raw === "cat" ? "cat" : "dog";
}

function cleanName(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, NAME_MAX);
}

function newUuid(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
  } catch {
    /* fallthrough */
  }
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Devuelve el visitor_id del navegador, creándolo y persistiéndolo si falta. */
export function ensureVisitorId(): string {
  const store = ls();
  if (!store) return newUuid();
  const existing = get(store, K.visitor);
  if (existing && existing.length >= 8) return existing;
  const id = newUuid();
  set(store, K.visitor, id);
  return id;
}

/** Identidad recordada, o `null` si falta dueño o mascota (hay que pedir el form). */
export function readDemoIdentity(): DemoIdentity | null {
  const store = ls();
  if (!store) return null;
  const ownerName = cleanName(get(store, K.owner));
  const petName = cleanName(get(store, K.pet));
  if (!ownerName || !petName) return null;
  const petType = normType(get(store, K.type));
  const email = cleanName(get(store, K.email)) || undefined;
  return {
    ownerName,
    petName,
    petType,
    avatarSrc: DEMO_AVATAR_BY_TYPE[petType],
    visitorId: ensureVisitorId(),
    email,
  };
}

export type DemoIdentityInput = {
  ownerName: string;
  petName: string;
  petType: DemoPetType;
  email?: string | null;
  source?: string;
};

/** Persiste la identidad del form "Personaliza tu demo" y la devuelve resuelta. */
export function writeDemoIdentity(input: DemoIdentityInput): DemoIdentity {
  const store = ls();
  const ownerName = cleanName(input.ownerName);
  const petName = cleanName(input.petName);
  const petType = normType(input.petType);
  const email = cleanName(input.email) || undefined;
  const visitorId = ensureVisitorId();
  if (store) {
    set(store, K.mode, "1");
    set(store, K.owner, ownerName);
    set(store, K.pet, petName);
    set(store, K.type, petType);
    set(store, K.source, input.source?.trim() || "demo_app");
    if (!get(store, K.recordedAt)) {
      set(store, K.recordedAt, new Date().toISOString());
    }
    if (email) set(store, K.email, email);
    else del(store, K.email);
    for (const legacy of LEGACY_KEYS) del(store, legacy);
  }
  return {
    ownerName,
    petName,
    petType,
    avatarSrc: DEMO_AVATAR_BY_TYPE[petType],
    visitorId,
    email,
  };
}

/** Borra toda la identidad de demo del navegador ("Cancelar" / salir de la demo). */
export function clearDemoIdentity(): void {
  const store = ls();
  if (!store) return;
  for (const key of [...Object.values(K), ...LEGACY_KEYS]) del(store, key);
}
