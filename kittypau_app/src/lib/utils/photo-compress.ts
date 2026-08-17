/**
 * Reducción automática de fotos de mascota antes de subirlas — antes había 2 gates
 * de "rechazar si pesa más de 5MB" duplicados (pet/page.tsx, registro-flow.tsx) sobre
 * el archivo ORIGINAL sin comprimir, así que una foto de celular típica (12-48MP,
 * rutinariamente >5MB) nunca llegaba a subirse. Ver
 * Knowledge/29_Specs/003-compresion-foto-mascota/{spec,research}.md.
 */

/** Límite final de subida — se aplica sobre el archivo YA reducido, nunca sobre el original. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Lado más largo tras el downscale — el grueso de la reducción de tamaño viene de
 * bajar resolución, no de bajar calidad JPEG (ver research.md § Estrategia de reducción). */
export const MAX_DIMENSION_PX = 1600;

// Pasos de calidad JPEG a probar en orden hasta entrar bajo el límite. Mismo mecanismo
// que ya usaba applyCrop() en registro-flow.tsx (canvas.toBlob con "image/jpeg" + quality),
// generalizado para no depender de que el usuario abra el editor de recorte manual.
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4] as const;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "No se pudo leer esta foto — el archivo puede estar dañado o en un formato no soportado.",
        ),
      );
    };
    img.src = url;
  });
}

/** Exportada para test unitario directo — el resto de compressPhoto() depende de Canvas/Image reales. */
export function fitWithinDimension(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (longSide <= maxDimension) return { width, height };
  const scale = maxDimension / longSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

/** Exportada para test unitario directo. */
export function toJpegName(originalName: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, "");
  return `${base || "foto"}.jpg`;
}

/**
 * Reduce `file` hasta que pese menos que `maxBytes`, downscaleando proporcionalmente
 * y reencodeando en JPEG con calidad decreciente. Si ya pesa menos que el límite, la
 * devuelve sin tocar (evita recomprimir fotos livianas que ya funcionan bien hoy).
 *
 * Lanza un Error con mensaje accionable si la foto no se puede decodificar, o si sigue
 * sobre el límite incluso en el paso de calidad más bajo (caso borde de detalle extremo).
 */
export async function compressPhoto(
  file: File,
  opts?: { maxBytes?: number; maxDimension?: number },
): Promise<File> {
  const maxBytes = opts?.maxBytes ?? MAX_UPLOAD_BYTES;
  const maxDimension = opts?.maxDimension ?? MAX_DIMENSION_PX;

  if (file.size <= maxBytes) {
    return file;
  }

  const img = await loadImage(file);
  const { width, height } = fitWithinDimension(
    img.naturalWidth,
    img.naturalHeight,
    maxDimension,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(
      "No se pudo procesar esta foto en este navegador. Prueba con otro archivo.",
    );
  }
  ctx.drawImage(img, 0, 0, width, height);

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size <= maxBytes) {
      return new File([blob], toJpegName(file.name), { type: "image/jpeg" });
    }
  }

  throw new Error(
    "Esta foto es demasiado pesada incluso después de reducirla. Prueba con otra foto o recórtala antes de subirla.",
  );
}
