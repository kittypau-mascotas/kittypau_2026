"use client";

import type { DemoIdentity } from "@/lib/demo-identity";

/**
 * Adaptador de fetch para `<TodayScreen mode="demo">`
 * (Knowledge/29_Specs/009-demo-today-en-vivo).
 *
 * `<TodayScreen>` es EL MISMO componente de `/today`: hace ~8 llamadas a
 * endpoints autenticados. En demo esas llamadas pasan por `fetchImpl`, que
 * es lo que devuelve `createDemoFetch()`: precarga `GET /api/demo/today`
 * UNA vez y responde cada ruta interna con la porción del bundle, en el
 * mismo shape que el endpoint autenticado -> el componente no distingue.
 *
 * ponytail: el "sobre" del bundle y este ruteo por path son el ÚNICO seam
 * de la demo (FR-016). Los sub-shapes (`hungerBar`, `consumoPeriodo`,
 * `readings`, `devices`, `auditEvents`) salen de las mismas funciones que
 * las rutas reales, así que no driftean. `loadReadings` con cursor es no-op
 * (sin "cargar más" histórico en la demo -- vista de vistazo).
 */

type ApiReadingLike = { device_id: string; recorded_at: string };

type DemoTodayBundle = {
  generatedAt: string;
  devices: unknown[];
  readings: ApiReadingLike[];
  auditEvents: Record<string, unknown[]>;
  hungerBar: unknown;
  consumoPeriodo: unknown;
};

const NEUTRAL_HUNGER_BAR = {
  status: "sin_dispositivo",
  percentage: null,
  lastMealDetectedAt: null,
  lastMealConfidence: null,
  lastMealIsProvisional: false,
  lastMealGramos: null,
  estimatedNextMealAt: null,
  intervalUsedMinutes: null,
  usingFallback: false,
  sampleSize: 0,
  alertActive: false,
  hoursOverdue: null,
  events: [],
  kpis: null,
};

const EMPTY_BUNDLE: DemoTodayBundle = {
  generatedAt: new Date(0).toISOString(),
  devices: [],
  readings: [],
  auditEvents: {},
  hungerBar: NEUTRAL_HUNGER_BAR,
  consumoPeriodo: { status: "sin_dispositivo" },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toUrl(input: RequestInfo | URL): URL {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  return new URL(raw, "http://demo.local");
}

export type DemoFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function createDemoFetch(identity: DemoIdentity): DemoFetch {
  // Una sola carga del bundle, compartida por todas las llamadas del render.
  let bundlePromise: Promise<DemoTodayBundle> | null = null;
  const loadBundle = (): Promise<DemoTodayBundle> => {
    if (!bundlePromise) {
      bundlePromise = fetch("/api/demo/today", { cache: "no-store" })
        .then((res) =>
          res.ok ? (res.json() as Promise<DemoTodayBundle>) : EMPTY_BUNDLE,
        )
        .catch(() => EMPTY_BUNDLE);
    }
    return bundlePromise;
  };

  const syntheticPet = {
    id: "demo-pet",
    name: identity.petName,
    type: identity.petType,
    origin: null,
    size: null,
    age_range: null,
    weight_kg: null,
    pet_state: null,
    photo_url: null,
  };

  const syntheticProfile = {
    user_name: identity.ownerName,
    owner_name: identity.ownerName,
    is_owner: true,
    photo_url: null,
    plan: "free" as const,
  };

  return async (input) => {
    const url = toUrl(input);
    const path = url.pathname;

    if (path === "/api/account/type") {
      return json({ account_type: "client" });
    }
    if (path === "/api/pets") {
      return json({ data: [syntheticPet] });
    }
    if (path === "/api/profiles") {
      return json(syntheticProfile);
    }

    const bundle = await loadBundle();

    if (path === "/api/devices") {
      return json({ data: bundle.devices });
    }
    if (path === "/api/readings") {
      const deviceId = url.searchParams.get("device_id");
      const data = deviceId
        ? bundle.readings.filter((r) => r.device_id === deviceId)
        : bundle.readings;
      return json({ data, next_cursor: null });
    }
    if (/^\/api\/pets\/[^/]+\/hunger-bar$/.test(path)) {
      return json(bundle.hungerBar);
    }
    if (/^\/api\/pets\/[^/]+\/consumo-periodo$/.test(path)) {
      return json(bundle.consumoPeriodo);
    }
    const evMatch = path.match(/^\/api\/devices\/([^/]+)\/events$/);
    if (evMatch) {
      const devId = decodeURIComponent(evMatch[1]);
      return json({ data: bundle.auditEvents[devId] ?? [] });
    }

    // Nada más debería pedirse desde <TodayScreen> en modo demo.
    return json({ error: "demo-fetch: ruta no soportada", path }, 404);
  };
}
