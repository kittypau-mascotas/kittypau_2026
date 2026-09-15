import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock de Supabase con builder encadenable mínimo — mismo patrón que
// devices/[id]/tare/route.test.ts (SPEC_05), extendido para las 3 tablas
// que esta ruta toca: "pets" (ownership), "devices" (elegir el comedero
// activo) y "readings" (paginado real por PAGE_SIZE, ver comentario en
// route.ts sobre el bug de paginación del 2026-08-11).
const mocks = vi.hoisted(() => ({
  petResult: { data: null as unknown, error: null as unknown },
  devicesResult: { data: null as unknown, error: null as unknown },
  readingsPages: [] as { data: unknown; error: unknown }[],
  readingsPageIndex: 0,
  // 010-widget-android-hero: mocks nuevos para `buildWaterSnapshot` --
  // ver contracts/hunger-bar-water-extension.md. `waterLatestResult` es la
  // única lectura reciente del bebedero (select→eq→order→limit(1)),
  // `waterReadingsResult` la ventana para el fallback de `termino_servido`
  // (select→eq→gte→order→limit), `auditEventsResult` la tabla `audit_events`.
  waterLatestResult: { data: [] as unknown[], error: null as unknown },
  waterReadingsResult: { data: [] as unknown[], error: null as unknown },
  auditEventsResult: { data: [] as unknown[], error: null as unknown },
  authResult: {
    data: { user: null as unknown },
    error: null as unknown,
  },
  fromCalls: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: {
    from: (table: string) => {
      mocks.fromCalls.push(table);
      if (table === "pets") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve(mocks.petResult),
            }),
          }),
        };
      }
      if (table === "devices") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => Promise.resolve(mocks.devicesResult),
              }),
            }),
          }),
        };
      }
      if (table === "readings") {
        return {
          select: () => ({
            eq: () => ({
              // Comida (fetchHungerBarForDevice): eq -> gte -> not -> order -> range
              gte: () => ({
                not: () => ({
                  order: () => ({
                    range: () => {
                      const page = mocks.readingsPages[
                        mocks.readingsPageIndex
                      ] ?? {
                        data: [],
                        error: null,
                      };
                      mocks.readingsPageIndex += 1;
                      return Promise.resolve(page);
                    },
                  }),
                }),
                // Agua, ventana para fallback de termino_servido: eq -> gte -> order -> limit
                order: () => ({
                  limit: () => Promise.resolve(mocks.waterReadingsResult),
                }),
              }),
              // Agua, última lectura: eq -> order -> limit(1)
              order: () => ({
                limit: () => Promise.resolve(mocks.waterLatestResult),
              }),
            }),
          }),
        };
      }
      if (table === "audit_events") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: () => Promise.resolve(mocks.auditEventsResult),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Tabla no mockeada en este test: ${table}`);
    },
  },
}));

vi.mock("@/lib/supabase/user-server", () => ({
  createUserClient: () => ({
    auth: { getUser: () => Promise.resolve(mocks.authResult) },
  }),
}));

const { GET } = await import("./route");

function makeRequest(petId: string, withAuth = true) {
  return new NextRequest(`http://localhost/api/pets/${petId}/hunger-bar`, {
    headers: withAuth ? { authorization: "Bearer test-token" } : {},
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const FOOD_DEVICE = {
  id: "dev-1",
  device_id: "KPCL0034",
  device_type: "comedero",
  last_seen: "2026-08-14T12:00:00Z",
};

const WATER_DEVICE = {
  id: "dev-2",
  device_id: "KPCL0035",
  device_type: "bebedero",
  plate_weight_grams: 50,
  last_seen: "2026-08-14T12:00:00Z",
};

beforeEach(() => {
  mocks.fromCalls.length = 0;
  mocks.petResult = { data: null, error: null };
  mocks.devicesResult = { data: null, error: null };
  mocks.readingsPages = [];
  mocks.readingsPageIndex = 0;
  mocks.waterLatestResult = { data: [], error: null };
  mocks.waterReadingsResult = { data: [], error: null };
  mocks.auditEventsResult = { data: [], error: null };
  mocks.authResult = { data: { user: null }, error: null };
});

describe("GET /api/pets/[id]/hunger-bar", () => {
  it("responde 401 sin header Authorization", async () => {
    const res = await GET(makeRequest("pet-1", false), makeParams("pet-1"));
    expect(res.status).toBe(401);
  });

  it("responde 404 si el pet no existe", async () => {
    mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
    mocks.petResult = { data: null, error: { message: "not found" } };

    const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("PET_NOT_FOUND");
  });

  it("responde 403 si el pet no pertenece al usuario autenticado", async () => {
    mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
    mocks.petResult = {
      data: { id: "pet-1", user_id: "otro-usuario" },
      error: null,
    };

    const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  it("responde 200 sin_dispositivo si el pet no tiene comedero activo", async () => {
    mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
    mocks.petResult = { data: { id: "pet-1", user_id: "user-1" }, error: null };
    // Solo un bebedero activo — isFoodDeviceRole real lo descarta.
    mocks.devicesResult = {
      data: [
        {
          id: "dev-2",
          device_id: "KPCL0035",
          device_type: "comedero",
          last_seen: null,
        },
      ],
      error: null,
    };

    const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("sin_dispositivo");
    expect(body.percentage).toBeNull();
    // Sin device de comida, no debería ni consultar "readings".
    expect(mocks.fromCalls).toEqual(["pets", "devices"]);
  });

  it("responde 500 si falla la query de devices", async () => {
    mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
    mocks.petResult = { data: { id: "pet-1", user_id: "user-1" }, error: null };
    mocks.devicesResult = { data: null, error: { message: "boom" } };

    const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("SUPABASE_ERROR");
  });

  it("responde 500 si falla la query de readings", async () => {
    mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
    mocks.petResult = { data: { id: "pet-1", user_id: "user-1" }, error: null };
    mocks.devicesResult = { data: [FOOD_DEVICE], error: null };
    mocks.readingsPages = [{ data: null, error: { message: "boom" } }];

    const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("SUPABASE_ERROR");
  });

  it("con lecturas planas (sin comida detectada) corre computeHungerBar real y devuelve sin_datos", async () => {
    mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
    mocks.petResult = { data: { id: "pet-1", user_id: "user-1" }, error: null };
    mocks.devicesResult = { data: [FOOD_DEVICE], error: null };
    mocks.readingsPages = [
      {
        data: [
          { recorded_at: "2026-08-14T08:00:00Z", weight_grams: 200 },
          { recorded_at: "2026-08-14T08:10:00Z", weight_grams: 200 },
        ],
        error: null,
      },
    ];

    const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("sin_datos");
    expect(body.percentage).toBeNull();
  });

  it("pagina readings por el tamaño REAL de página devuelto (regresión 2026-08-11: no cortar en 1000 asumido)", async () => {
    mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
    mocks.petResult = { data: { id: "pet-1", user_id: "user-1" }, error: null };
    mocks.devicesResult = { data: [FOOD_DEVICE], error: null };

    const fullPage = Array.from({ length: 1000 }, (_, i) => ({
      recorded_at: new Date(Date.UTC(2026, 7, 10, 0, i)).toISOString(),
      weight_grams: 200,
    }));
    const lastPage = [
      { recorded_at: "2026-08-14T09:00:00Z", weight_grams: 200 },
    ];
    mocks.readingsPages = [
      { data: fullPage, error: null },
      { data: lastPage, error: null },
    ];

    const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

    expect(res.status).toBe(200);
    // Se pidieron ambas páginas — si se hubiera cortado en la primera
    // (asumiendo que 1000 == "no hay más"), readingsPageIndex quedaría en 1.
    expect(mocks.readingsPageIndex).toBe(2);
  });

  // 010-widget-android-hero: contracts/hunger-bar-water-extension.md
  describe("objeto `water` (010-widget-android-hero)", () => {
    it("water.status sin_dispositivo si la mascota no tiene bebedero activo", async () => {
      mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
      mocks.petResult = {
        data: { id: "pet-1", user_id: "user-1" },
        error: null,
      };
      // Solo el comedero -- sin otro device activo, el fallback de
      // resolveWaterDevice tampoco encuentra nada.
      mocks.devicesResult = { data: [FOOD_DEVICE], error: null };
      mocks.readingsPages = [
        {
          data: [{ recorded_at: "2026-08-14T08:00:00Z", weight_grams: 200 }],
          error: null,
        },
      ];

      const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.water).toEqual({
        status: "sin_dispositivo",
        percentage: null,
        hasEvidence: false,
        lastEventAt: null,
      });
    });

    it("con bebedero activo pero sin evento de hidratación confirmado: hasEvidence false, sin hora inventada", async () => {
      mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
      mocks.petResult = {
        data: { id: "pet-1", user_id: "user-1" },
        error: null,
      };
      mocks.devicesResult = { data: [FOOD_DEVICE, WATER_DEVICE], error: null };
      mocks.readingsPages = [
        {
          data: [{ recorded_at: "2026-08-14T08:00:00Z", weight_grams: 200 }],
          error: null,
        },
      ];
      mocks.waterLatestResult = {
        data: [
          {
            recorded_at: "2026-08-14T09:00:00Z",
            weight_grams: 150,
            water_ml: null,
          },
        ],
        error: null,
      };
      // Sin audit_events -- ni termino_servido (percentage) ni el par
      // inicio/termino_hidratacion (hasEvidence).

      const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.water.status).toBe("ok");
      expect(body.water.percentage).toBeNull();
      expect(body.water.hasEvidence).toBe(false);
      expect(body.water.lastEventAt).toBeNull();
    });

    it("con termino_servido confirmado y un par inicio/término de hidratación: percentage y lastEventAt reales", async () => {
      mocks.authResult = { data: { user: { id: "user-1" } }, error: null };
      mocks.petResult = {
        data: { id: "pet-1", user_id: "user-1" },
        error: null,
      };
      mocks.devicesResult = { data: [FOOD_DEVICE, WATER_DEVICE], error: null };
      mocks.readingsPages = [
        {
          data: [{ recorded_at: "2026-08-14T08:00:00Z", weight_grams: 200 }],
          error: null,
        },
      ];
      // Contenido actual: 150 - 50 (tara) = 100 g/mL.
      mocks.waterLatestResult = {
        data: [
          {
            recorded_at: "2026-08-14T09:00:00Z",
            weight_grams: 150,
            water_ml: null,
          },
        ],
        error: null,
      };
      mocks.auditEventsResult = {
        data: [
          {
            created_at: "2026-08-14T07:00:00Z",
            payload: {
              category: "termino_servido",
              snapshot: { content_weight_grams: 200 },
            },
          },
          {
            created_at: "2026-08-14T08:00:00Z",
            payload: { category: "inicio_hidratacion" },
          },
          {
            created_at: "2026-08-14T08:05:00Z",
            payload: { category: "termino_hidratacion" },
          },
        ],
        error: null,
      };

      const res = await GET(makeRequest("pet-1"), makeParams("pet-1"));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.water.status).toBe("ok");
      // 100 / 200 * 100 = 50%
      expect(body.water.percentage).toBe(50);
      expect(body.water.hasEvidence).toBe(true);
      expect(body.water.lastEventAt).toBe("2026-08-14T08:05:00Z");
      // Nunca un conteo de "veces que tomó agua" -- FR-006/FR-015.
      expect(body.water).not.toHaveProperty("timesToday");
    });
  });
});
