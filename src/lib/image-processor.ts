import { MAX_IMAGE_SIZE } from "./constants";
import type {
  AspectRatioInfo,
  ProcessedImage,
  ImageValidationResult,
} from "./types";

export type { AspectRatioInfo, ProcessedImage, ImageValidationResult };

const MAX_DIMENSION = 200;
const MAX_COMPRESSION_ITERATIONS = 15;
const QUALITY_REDUCTION_FACTOR = 0.92;
const MIN_QUALITY = 0.3;
const INITIAL_QUALITY = 0.98;
const OUTPUT_MIME_TYPE = "image/webp";

const MIN_ASPECT_RATIO = 1 / 4;
const MAX_ASPECT_RATIO = 4;

const PIXELATION_FACTOR = 1.0;
const CONTRAST_BOOST = 1.0;
const SATURATION_BOOST = 1.0;

const SUPPORTED_INPUT_FORMATS = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;

type SupportedInputFormat = (typeof SUPPORTED_INPUT_FORMATS)[number];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Error al cargar la imagen"));
    };

    img.src = url;
  });
}

function detectTransparency(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): boolean {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      return true;
    }
  }

  return false;
}

function getAspectRatioInfo(
  width: number,
  height: number,
): AspectRatioInfo | null {
  const ratio = width / height;

  if (ratio < MIN_ASPECT_RATIO || ratio > MAX_ASPECT_RATIO) {
    return null;
  }

  const label = formatRatioLabel(width, height);
  return { ratio, label };
}

function formatRatioLabel(width: number, height: number): string {
  const gcd = calculateGCD(width, height);
  const w = width / gcd;
  const h = height / gcd;

  if (w > 20 || h > 20) {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.05) return "1:1";
    if (ratio > 1) return `${ratio.toFixed(1)}:1`;
    return `1:${(1 / ratio).toFixed(1)}`;
  }

  return `${w}:${h}`;
}

function calculateGCD(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
): { width: number; height: number; wasResized: boolean } {
  const maxDimension = Math.max(originalWidth, originalHeight);

  if (maxDimension <= MAX_DIMENSION) {
    return {
      width: originalWidth,
      height: originalHeight,
      wasResized: false,
    };
  }

  const scale = MAX_DIMENSION / maxDimension;
  return {
    width: Math.round(originalWidth * scale),
    height: Math.round(originalHeight * scale),
    wasResized: true,
  };
}

function createCanvas(
  img: HTMLImageElement,
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    throw new Error("No se pudo crear el contexto del canvas");
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);

  return { canvas, ctx };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Error al convertir canvas a blob"));
        }
      },
      OUTPUT_MIME_TYPE,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error al leer blob"));
    reader.readAsDataURL(blob);
  });
}

function extractBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : "";
}

function applyPixelation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): void {
  if (PIXELATION_FACTOR >= 1.0) return;

  const { width, height } = canvas;

  const tempCanvas = document.createElement("canvas");
  const smallWidth = Math.max(1, Math.floor(width * PIXELATION_FACTOR));
  const smallHeight = Math.max(1, Math.floor(height * PIXELATION_FACTOR));
  tempCanvas.width = smallWidth;
  tempCanvas.height = smallHeight;

  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = "medium";
  tempCtx.drawImage(canvas, 0, 0, smallWidth, smallHeight);

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, width, height);
}

function applyContrastSaturation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): void {
  if (CONTRAST_BOOST === 1.0 && SATURATION_BOOST === 1.0) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const contrastR = (r - 128) * CONTRAST_BOOST + 128;
    const contrastG = (g - 128) * CONTRAST_BOOST + 128;
    const contrastB = (b - 128) * CONTRAST_BOOST + 128;

    const gray = (contrastR + contrastG + contrastB) / 3;
    const satR = gray + (contrastR - gray) * SATURATION_BOOST;
    const satG = gray + (contrastG - gray) * SATURATION_BOOST;
    const satB = gray + (contrastB - gray) * SATURATION_BOOST;

    data[i] = Math.max(0, Math.min(255, Math.round(satR)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(satG)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(satB)));
  }

  ctx.putImageData(imageData, 0, 0);
}

function calculateBase64Size(base64: string): number {
  let padding = 0;
  if (base64.endsWith("==")) padding = 2;
  else if (base64.endsWith("=")) padding = 1;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function validateImage(
  file: File,
): Promise<ImageValidationResult> {
  try {
    const img = await loadImage(file);
    const { width, height } = img;
    const detectedRatio = width / height;

    const aspectRatio = getAspectRatioInfo(width, height);

    if (!aspectRatio) {
      return {
        valid: false,
        originalWidth: width,
        originalHeight: height,
        detectedRatio,
        error: `Proporción no válida (${detectedRatio.toFixed(2)}). La imagen es demasiado alargada. Máximo 4:1 o 1:4.`,
      };
    }

    return {
      valid: true,
      aspectRatio,
      originalWidth: width,
      originalHeight: height,
      detectedRatio,
    };
  } catch (error) {
    return {
      valid: false,
      originalWidth: 0,
      originalHeight: 0,
      detectedRatio: 0,
      error: error instanceof Error ? error.message : "Error al validar imagen",
    };
  }
}

export async function processImage(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const originalWidth = img.width;
  const originalHeight = img.height;
  const detectedRatio = originalWidth / originalHeight;

  const aspectRatio = getAspectRatioInfo(originalWidth, originalHeight);

  if (!aspectRatio) {
    throw new Error(
      `Proporción no válida (${detectedRatio.toFixed(2)}). La imagen es demasiado alargada. Máximo 4:1 o 1:4.`,
    );
  }

  const { width, height, wasResized } = calculateDimensions(
    originalWidth,
    originalHeight,
  );
  const { canvas, ctx } = createCanvas(img, width, height);

  applyPixelation(canvas, ctx);
  applyContrastSaturation(canvas, ctx);

  const hasTransparency = detectTransparency(canvas, ctx);

  let quality = INITIAL_QUALITY;
  let blob: Blob;
  let dataUrl: string;
  let base64Data: string;
  let base64Size: number;
  let iterations = 0;

  do {
    blob = await canvasToBlob(canvas, quality);
    dataUrl = await blobToDataUrl(blob);
    base64Data = extractBase64(dataUrl);
    base64Size = calculateBase64Size(base64Data);

    if (base64Size <= MAX_IMAGE_SIZE) {
      break;
    }

    quality *= QUALITY_REDUCTION_FACTOR;
    iterations++;
  } while (quality >= MIN_QUALITY && iterations < MAX_COMPRESSION_ITERATIONS);

  if (base64Size > MAX_IMAGE_SIZE) {
    throw new Error(
      `No se pudo comprimir la imagen a menos de ${formatBytes(MAX_IMAGE_SIZE)} (actual: ${formatBytes(base64Size)}). ` +
        `Intenta con una imagen más simple o con menos colores.`,
    );
  }

  return {
    blob,
    dataUrl,
    width,
    height,
    originalWidth,
    originalHeight,
    wasResized,
    aspectRatio,
    base64Data,
    base64Size,
    hasTransparency,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function getAllowedAspectRatiosDescription(): string {
  return `Cualquier proporción entre 1:${Math.round(1 / MIN_ASPECT_RATIO)} y ${MAX_ASPECT_RATIO}:1`;
}

export function isValidFormat(mimeType: string): boolean {
  return SUPPORTED_INPUT_FORMATS.includes(mimeType as SupportedInputFormat);
}

export function getSupportedFormats(): string[] {
  return [...SUPPORTED_INPUT_FORMATS];
}

export const ACCEPT_INPUT_FORMATS = "image/png,image/jpeg,image/webp";
