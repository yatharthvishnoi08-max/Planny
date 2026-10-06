import type { AIImageInput } from "./ai";

export const MAX_AI_IMAGE_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_AI_IMAGE_BYTES = 6 * 1024 * 1024;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateAIImage(file: File): string | null {
  if (!SUPPORTED_TYPES.includes(file.type as (typeof SUPPORTED_TYPES)[number]))
    return "Choose a JPG, PNG, or WebP image.";
  if (!file.size) return "This image is empty.";
  if (file.size > MAX_AI_IMAGE_SOURCE_BYTES)
    return "Images for AI analysis can be up to 15 MB.";
  return null;
}

const fileToDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });

export async function prepareAIImage(file: File): Promise<AIImageInput> {
  const validation = validateAIImage(file);
  if (validation) throw new Error(validation);

  let payload: Blob = file;
  let mimeType: AIImageInput["mimeType"] = file.type as AIImageInput["mimeType"];
  if (file.size > MAX_AI_IMAGE_BYTES) {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    payload = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Could not prepare this image.")),
        "image/jpeg",
        0.84,
      ),
    );
    mimeType = "image/jpeg";
  }

  if (payload.size > MAX_AI_IMAGE_BYTES)
    throw new Error("This image is still too detailed to analyze. Try a smaller crop.");
  const dataUrl = await fileToDataUrl(payload);
  const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (!data) throw new Error("Could not read this image.");
  return { data, mimeType, name: file.name };
}
