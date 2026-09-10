import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Contrato de `GET /api/demo/today` (Knowledge/29_Specs/009-demo-today-en-vivo).
// Se mockean las funciones pesadas (`buildHungerBarPayload` /
// `buildConsumoPeriodoPayload` ya tienen su propio test vía la ruta
// autenticada) y se verifica: (a) shape del bundle, (b) que NO se filtre
// identidad real (uuid interno, pet_id real, pet_name, user_id, "Bandida"),
// (c) 429 bajo rate limit, (d) 200 degradado sin device de comida.

const REAL_DEVICE_UUID = "11111111-1111-1111-1111-111111111111";
const REAL_PET_UUID = "22222222-2222-2222-2222-222222222222";
const REAL_USER_UUID = "33333333-3333-3333-3333-333333333333";

const mocks = vi.hoisted(() => ({
  devices: [] as unknown[],
  rate: { ok: true } as { ok: boolean; retryAfter?: number },
}));

function q(result: unknown) {
  const obj: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => resolve(result),
    single: () => Promise.resolve(result),
  };
  for (const m of [
    "select",
    "eq",
    "in",
    "gte",
    "lte",
    "not",
    "order",
    "limit",
    "range",
  ]) {
    obj[m] = () => obj;
  }
  return obj;
}

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: {
    from: (table: string) => {
      if (table === "devices") return q({ data: mocks.devices, error: null });
      if (table === "pets")
        return q({
          data: { food_normal_min_g: null, food_normal_max_g: null },
          error: null,
        });
      if (table === "readings") return q({ data: [], error: null });
      if (table === "audit_events") return q({ data: [], error: null });
      throw new Error(`tabla no mockeada: ${table}`);
    },
  },
}));

vi.mock("@/lib/demo/demo-config", () => ({
  getDemoDeviceCodes: () => ({ food: "KPCL0034", water: "KPCL0035" }),
}));

vi.mock("@/lib/hunger-bar-server", () => ({
  buildHungerBarPayload: vi.fn(async () => ({
    status: "ok",
    percentage: 62,
    lastMealDetectedAt: "2026-09-10T18:53:00.000Z",
    lastMealConfidence: "alta",
    lastMealIsProvisional: false,
    lastMealGramos: 11,
    estimatedNextMealAt: "2026-09-11T00:37:00.000Z",
    intervalUsedMinutes: 347,
    usingFallback: false,
    sampleSize: 214,
    alertActive: false,
    hoursOverdue: null,
    events: [],
    kpis: null,
  })),
  buildConsumoPeriodoPayload: vi.fn(async () => ({
    status: "ok",
    semana: { gramos: 812, comidas: 19, diasConDatos: 7, diasTotales: 7 },
    mes: { gramos: 3480, comidas: 82, diasConDatos: 29, diasTotales: 30 },
    ventanaDias: 32,
    truncated: false,
    diasConDatosVentana: 24,
  })),
}));

vi.mock("@/app/api/_rate-limit", () => ({
  checkRateLimit: vi.fn(async () => mocks.rate),
  getRateKeyFromRequest: () => "test-ip",
}));

// `_utils.ts` importa `user-server.ts`, que exige env de Supabase al cargar.
// La ruta de demo no usa auth, pero el import transitivo hay que cortarlo.
vi.mock("@/lib/supabase/user-server", () => ({
  createUserClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  }),
}));

const { GET } = await import("./route");

function makeRequest() {
  return new NextRequest("http://localhost/api/demo/today");
}

const FOOD_DEVICE = {
  id: REAL_DEVICE_UUID,
  pet_id: REAL_PET_UUID,
  device_id: "KPCL0034",
  device_type: "comedero",
  plate_weight_grams: 40,
  status: "active",
  device_state: "on",
  battery_level: 87,
  battery_state: "discharging",
  battery_voltage: 3.9,
  battery_source: "adc",
  battery_is_estimated: false,
  last_seen: "2026-09-10T18:52:11.000Z",
  owner_id: REAL_USER_UUID,
};
const WATER_DEVICE = {
  ...FOOD_DEVICE,
  id: "44444444-4444-4444-4444-444444444444",
  device_id: "KPCL0035",
  device_type: "bebedero",
};

beforeEach(() => {
  mocks.devices = [FOOD_DEVICE, WATER_DEVICE];
  mocks.rate = { ok: true };
});

describe("GET /api/demo/today", () => {
  it("200 con el shape del bundle", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(
      [
        "auditEvents",
        "consumoPeriodo",
        "devices",
        "generatedAt",
        "hungerBar",
        "readings",
      ].sort(),
    );
    expect(body.hungerBar.status).toBe("ok");
    expect(body.hungerBar.percentage).toBe(62);
    expect(body.consumoPeriodo.semana.gramos).toBe(812);
  });

  it("devices = solo los 2 códigos de demo, sin identidad de cuenta", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.devices).toHaveLength(2);
    expect(
      body.devices.map((d: { device_id: string }) => d.device_id).sort(),
    ).toEqual(["KPCL0034", "KPCL0035"]);
    for (const d of body.devices) {
      expect(d.id).toBe(d.device_id); // id sintético = código KPCL
      expect(d.pet_id).toBe("demo-pet");
      expect(d).not.toHaveProperty("owner_id");
    }
  });

  it("no filtra identidad real (uuid interno, pet_id real, user_id, 'Bandida')", async () => {
    const res = await GET(makeRequest());
    const raw = JSON.stringify(await res.json());
    expect(raw).not.toContain(REAL_DEVICE_UUID);
    expect(raw).not.toContain(REAL_PET_UUID);
    expect(raw).not.toContain(REAL_USER_UUID);
    expect(raw.toLowerCase()).not.toContain("bandida");
    expect(raw).not.toContain("diasConDatosVentana"); // campo diagnóstico fuera del JSON
  });

  it("429 cuando el rate limit se agota", async () => {
    mocks.rate = { ok: false, retryAfter: 30 };
    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("200 degradado (sin_dispositivo) si no hay device de comida", async () => {
    mocks.devices = [WATER_DEVICE]; // solo el bebedero
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hungerBar.status).toBe("sin_dispositivo");
    expect(body.hungerBar.percentage).toBeNull();
    expect(body.consumoPeriodo.status).toBe("sin_dispositivo");
    expect(body.readings).toEqual([]);
    expect(body.devices).toHaveLength(1);
  });
});
