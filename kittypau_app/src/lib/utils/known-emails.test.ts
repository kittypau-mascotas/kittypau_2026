import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getKnownEmails, rememberEmailOnThisDevice } from "./known-emails";

// Sin jsdom en el proyecto (ver photo-compress.test.ts) -- se stubea un
// localStorage mínimo en memoria en vez de agregar la dependencia.
function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
  });
}

describe("known-emails", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no recuerda nada al principio", () => {
    expect(getKnownEmails()).toEqual([]);
  });

  it("recuerda un email después de usarlo", () => {
    rememberEmailOnThisDevice("persona@example.com");
    expect(getKnownEmails()).toEqual(["persona@example.com"]);
  });

  it("pone el email más reciente primero", () => {
    rememberEmailOnThisDevice("uno@example.com");
    rememberEmailOnThisDevice("dos@example.com");
    expect(getKnownEmails()).toEqual(["dos@example.com", "uno@example.com"]);
  });

  it("no duplica un email ya recordado (case-insensitive), lo mueve al frente", () => {
    rememberEmailOnThisDevice("Persona@Example.com");
    rememberEmailOnThisDevice("otro@example.com");
    rememberEmailOnThisDevice("persona@example.com");
    expect(getKnownEmails()).toEqual([
      "persona@example.com",
      "otro@example.com",
    ]);
  });

  it("recorta la lista a los 8 más recientes", () => {
    for (let i = 0; i < 10; i++) {
      rememberEmailOnThisDevice(`persona${i}@example.com`);
    }
    const result = getKnownEmails();
    expect(result).toHaveLength(8);
    expect(result[0]).toBe("persona9@example.com");
  });

  it("ignora un email vacío o solo espacios", () => {
    rememberEmailOnThisDevice("   ");
    expect(getKnownEmails()).toEqual([]);
  });
});
