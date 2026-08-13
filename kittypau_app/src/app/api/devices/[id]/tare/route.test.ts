import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock de Supabase con builder encadenable mínimo — sólo lo que esta ruta usa
// (.from().select().eq().eq().single() para "devices", .from().insert() para
// "device_commands"). Ver SPEC_05_Optimizacion_Tecnica.md — primer test de
// integración real de una API route del proyecto.
const mocks = vi.hoisted(() => ({
  deviceResult: { data: null as unknown, error: null as unknown },
  insertResult: { data: null as unknown, error: null as unknown },
  // Shape real de supabase-js: `auth.getUser()` resuelve `{ data: { user }, error }`.
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
      if (table === "devices") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve(mocks.deviceResult),
              }),
            }),
          }),
        };
      }
      if (table === "device_commands") {
        return { insert: () => Promise.resolve(mocks.insertResult) };
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

const { POST } = await import("./route");

function makeRequest(id: string, withAuth = true) {
  return new NextRequest(`http://localhost/api/devices/${id}/tare`, {
    method: "POST",
    headers: withAuth ? { authorization: "Bearer test-token" } : {},
  });
}

beforeEach(() => {
  mocks.fromCalls.length = 0;
  mocks.deviceResult = { data: null, error: null };
  mocks.insertResult = { data: null, error: null };
  mocks.authResult = { data: { user: null }, error: null };
});

describe("POST /api/devices/[id]/tare", () => {
  it("responde 401 sin header Authorization", async () => {
    const res = await POST(makeRequest("dev-1", false), {
      params: Promise.resolve({ id: "dev-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("responde 404 si el device no existe o no pertenece al usuario", async () => {
    mocks.authResult = { data: { user: { id: "user-tare-404" } }, error: null };
    mocks.deviceResult = { data: null, error: { message: "not found" } };

    const res = await POST(makeRequest("dev-1"), {
      params: Promise.resolve({ id: "dev-1" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe("DEVICE_NOT_FOUND");
  });

  it("encola CALIBRATE_WEIGHT/tare y responde 200 con el device_id real", async () => {
    mocks.authResult = { data: { user: { id: "user-tare-200" } }, error: null };
    mocks.deviceResult = {
      data: { id: "dev-1", device_id: "KPCL0099", owner_id: "user-tare-200" },
      error: null,
    };

    const res = await POST(makeRequest("dev-1"), {
      params: Promise.resolve({ id: "dev-1" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, device_id: "KPCL0099" });
    expect(mocks.fromCalls).toEqual(["devices", "device_commands"]);
  });

  it("responde 500 si falla el insert en device_commands", async () => {
    mocks.authResult = { data: { user: { id: "user-tare-500" } }, error: null };
    mocks.deviceResult = {
      data: { id: "dev-1", device_id: "KPCL0099", owner_id: "user-tare-500" },
      error: null,
    };
    mocks.insertResult = { data: null, error: { message: "boom" } };

    const res = await POST(makeRequest("dev-1"), {
      params: Promise.resolve({ id: "dev-1" }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("SUPABASE_ERROR");
  });
});
