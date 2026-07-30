import { createWorker } from "tesseract.js";
import type { OcrProgress } from "../types";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_DIMENSION = 2600;

async function preprocessImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a PNG, JPEG, HEIC, or WebP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("That image is larger than 15 MB. Crop it and try again.");
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not prepare the image.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance =
      pixels[index] * 0.299 +
      pixels[index + 1] * 0.587 +
      pixels[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (luminance - 128) * 1.22 + 128));
    pixels[index] = contrasted;
    pixels[index + 1] = contrasted;
    pixels[index + 2] = contrasted;
  }
  context.putImageData(image, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image conversion failed."))),
      "image/png",
      0.95
    );
  });
}

export async function recognizeRecipeImage(
  file: File,
  onProgress: (progress: OcrProgress) => void
): Promise<string> {
  onProgress({ status: "Preparing image", progress: 0.04 });
  const image = await preprocessImage(file);
  const worker = await createWorker("eng", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/core",
    langPath: "/tesseract/lang",
    logger: (message) => {
      onProgress({
        status:
          message.status === "recognizing text"
            ? "Reading recipe"
            : message.status.replace(/\b\w/g, (character) =>
                character.toUpperCase()
              ),
        progress: Math.max(0.08, Math.min(0.98, message.progress ?? 0.08))
      });
    }
  });

  try {
    const result = await worker.recognize(image, { rotateAuto: true });
    const text = result.data.text.trim();
    if (text.length < 20) {
      throw new Error(
        "I could not find enough recipe text. Try a tighter, brighter crop."
      );
    }
    onProgress({ status: "Recipe read", progress: 1 });
    return text;
  } finally {
    await worker.terminate();
  }
}
