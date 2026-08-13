import { describe, expect, it } from "vitest";
import {
  devicePowerStateLabel,
  parseListResponse,
  resolveDevicePowerState,
} from "./api";

describe("parseListResponse", () => {
  it("devuelve el array tal cual cuando el payload ya es un array", () => {
    expect(parseListResponse([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("extrae .data cuando el payload viene envuelto en { data: [] }", () => {
    expect(parseListResponse({ data: [{ id: "a" }] })).toEqual([{ id: "a" }]);
  });

  it("devuelve [] si { data } no trae el campo data", () => {
    expect(parseListResponse({ other: 1 })).toEqual([]);
  });

  it("devuelve [] para null/undefined/valores no-objeto", () => {
    expect(parseListResponse(null)).toEqual([]);
    expect(parseListResponse(undefined)).toEqual([]);
    expect(parseListResponse("no-un-objeto")).toEqual([]);
  });
});

describe("resolveDevicePowerState", () => {
  it('devuelve "nodata" si el device es null/undefined', () => {
    expect(resolveDevicePowerState(null)).toBe("nodata");
    expect(resolveDevicePowerState(undefined)).toBe("nodata");
  });

  it('devuelve "nodata" si ninguna columna trae valor', () => {
    expect(resolveDevicePowerState({ device_state: null, status: null })).toBe(
      "nodata",
    );
  });

  it('device_state con "offline" gana aunque status diga otra cosa', () => {
    expect(
      resolveDevicePowerState({ device_state: "offline", status: "active" }),
    ).toBe("off");
  });

  it('status "inactive" también resuelve a "off"', () => {
    expect(resolveDevicePowerState({ status: "inactive" })).toBe("off");
  });

  it('device_state "linked" u "online" resuelve a "on"', () => {
    expect(resolveDevicePowerState({ device_state: "linked" })).toBe("on");
    expect(resolveDevicePowerState({ device_state: "online" })).toBe("on");
  });

  it('status "active" o "linked" resuelve a "on" sin device_state', () => {
    expect(resolveDevicePowerState({ status: "active" })).toBe("on");
    expect(resolveDevicePowerState({ status: "linked" })).toBe("on");
  });

  it('valores desconocidos en ambas columnas caen a "nodata", no a "off"', () => {
    // Caso borde real que motivó esta función: SPEC_01 E4, el badge de /pet
    // contradiciendo el texto por leer las dos columnas por separado.
    expect(
      resolveDevicePowerState({ device_state: "unknown", status: "weird" }),
    ).toBe("nodata");
  });

  it("es case-insensitive", () => {
    expect(resolveDevicePowerState({ status: "ACTIVE" })).toBe("on");
    expect(resolveDevicePowerState({ device_state: "OFFLINE" })).toBe("off");
  });
});

describe("devicePowerStateLabel", () => {
  it("traduce cada estado a su etiqueta en español", () => {
    expect(devicePowerStateLabel("on")).toBe("en línea");
    expect(devicePowerStateLabel("off")).toBe("desconectado");
    expect(devicePowerStateLabel("nodata")).toBe("sin datos");
  });
});
