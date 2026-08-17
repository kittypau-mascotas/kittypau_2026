import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compressPhoto,
  fitWithinDimension,
  toJpegName,
} from "./photo-compress";

// El proyecto no tiene jsdom instalado (sin rasterizador de canvas real de todos
// modos — ver Knowledge/29_Specs/003-compresion-foto-mascota/research.md § Testing).
// En vez de agregar una dependencia nueva, se stubean a mano los globals de
// navegador que compressPhoto() toca (Image, canvas, URL.createObjectURL) para
// probar la lógica de control (reintentos de calidad, umbral, error de borde) sin
// necesitar rasterización real — eso se valida a mano vía quickstart.md.

function fakeFile(sizeBytes: number, name = "foto.png"): File {
  return new File([new Uint8Array(sizeBytes)], name, { type: "image/png" });
}

function stubBrowserGlobals(opts: {
  naturalWidth?: number;
  naturalHeight?: number;
  failDecode?: boolean;
  blobSizesByQuality: number[]; // tamaño del blob devuelto en cada llamada sucesiva a toBlob
}) {
  let toBlobCall = 0;

  class FakeImage {
    naturalWidth = opts.naturalWidth ?? 2000;
    naturalHeight = opts.naturalHeight ?? 1500;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) {
      queueMicrotask(() => {
        if (opts.failDecode) this.onerror?.();
        else this.onload?.();
      });
    }
  }

  const fakeCtx = { drawImage: vi.fn() };
  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => fakeCtx),
    toBlob: vi.fn((cb: (b: Blob | null) => void) => {
      const size =
        opts.blobSizesByQuality[toBlobCall] ??
        opts.blobSizesByQuality.at(-1) ??
        0;
      toBlobCall += 1;
      cb(new Blob([new Uint8Array(size)], { type: "image/jpeg" }));
    }),
  };

  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:fake"),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal("document", {
    createElement: vi.fn(() => fakeCanvas),
  });

  return { fakeCanvas, fakeCtx };
}

describe("fitWithinDimension", () => {
  it("no cambia las dimensiones si ya entran dentro del máximo", () => {
    expect(fitWithinDimension(800, 600, 1600)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("escala proporcionalmente cuando el lado más largo supera el máximo", () => {
    expect(fitWithinDimension(4000, 3000, 2000)).toEqual({
      width: 2000,
      height: 1500,
    });
  });

  it("usa la altura como lado más largo cuando corresponde", () => {
    expect(fitWithinDimension(1200, 4800, 1600)).toEqual({
      width: 400,
      height: 1600,
    });
  });
});

describe("toJpegName", () => {
  it("reemplaza la extensión original por .jpg", () => {
    expect(toJpegName("mascota.png")).toBe("mascota.jpg");
    expect(toJpegName("IMG_0001.HEIC")).toBe("IMG_0001.jpg");
  });

  it("agrega .jpg si el archivo no tenía extensión", () => {
    expect(toJpegName("mascota")).toBe("mascota.jpg");
  });
});

describe("compressPhoto", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve el archivo sin tocar si ya pesa menos que el límite", async () => {
    const file = fakeFile(1024, "liviana.jpg");
    const result = await compressPhoto(file, { maxBytes: 5 * 1024 * 1024 });
    expect(result).toBe(file);
  });

  it("reduce un archivo pesado hasta entrar bajo el límite", async () => {
    const maxBytes = 1000;
    stubBrowserGlobals({ blobSizesByQuality: [5000, 3000, 800] }); // 1er y 2do intento siguen pesados, 3ro entra
    const file = fakeFile(10_000, "celular.jpg");

    const result = await compressPhoto(file, { maxBytes });

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("celular.jpg");
    expect(result.size).toBeLessThanOrEqual(maxBytes);
  });

  it("lanza un error accionable si ningún nivel de calidad entra bajo el límite", async () => {
    const maxBytes = 100;
    stubBrowserGlobals({ blobSizesByQuality: [5000, 4000, 3000, 2000] }); // todos sobre el límite
    const file = fakeFile(10_000, "detalle_extremo.jpg");

    await expect(compressPhoto(file, { maxBytes })).rejects.toThrow(
      /demasiado pesada/i,
    );
  });

  it("lanza un error legible si la foto no se puede decodificar", async () => {
    stubBrowserGlobals({ failDecode: true, blobSizesByQuality: [] });
    const file = fakeFile(10_000, "formato_raro.heic");

    await expect(compressPhoto(file, { maxBytes: 1000 })).rejects.toThrow(
      /no se pudo leer/i,
    );
  });
});
