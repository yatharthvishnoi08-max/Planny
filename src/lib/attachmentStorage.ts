import { supabase } from "./supabase";
import {
  deletePdf,
  isStoredPdf,
  signedPdfUrl,
  uploadPdf,
  validatePdf,
} from "./pdfStorage";

export type AttachmentKind = "pdf" | "image" | "audio";

export const ATTACHMENT_BUCKET = "user-attachments";
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ATTACHMENT_PREFIX = "planny-attachment:";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];
const AUDIO_EXTENSIONS = ["mp3", "m4a", "mp4", "wav", "ogg", "webm", "aac"];

const fileExtension = (name: string) => name.toLowerCase().split(".").pop() || "";

const hasAllowedExtension = (file: File, extensions: string[]) =>
  extensions.includes(fileExtension(file.name));

export function validateAttachment(file: File, kind: AttachmentKind): string | null {
  if (kind === "pdf") return validatePdf(file);
  if (!file.size) return `This ${kind} file is empty.`;

  if (kind === "image") {
    const validType = file.type.startsWith("image/") || hasAllowedExtension(file, IMAGE_EXTENSIONS);
    if (!validType) return "Choose a JPG, PNG, WebP, GIF, HEIC, or HEIF image.";
    if (file.size > MAX_IMAGE_BYTES) return "Images can be up to 15 MB.";
  }

  if (kind === "audio") {
    const validType = file.type.startsWith("audio/") || hasAllowedExtension(file, AUDIO_EXTENSIONS);
    if (!validType) return "Choose an MP3, M4A, WAV, OGG, WebM, or AAC audio file.";
    if (file.size > MAX_AUDIO_BYTES) return "Audio files can be up to 25 MB.";
  }

  return null;
}

const safeName = (name: string) => {
  const extension = fileExtension(name);
  const base = name.replace(/\.[^.]+$/, "");
  const cleanBase =
    base
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "attachment";
  return extension ? `${cleanBase}.${extension}` : cleanBase;
};

export async function uploadAttachment(file: File, kind: AttachmentKind): Promise<string> {
  if (kind === "pdf") return uploadPdf(file);
  const validation = validateAttachment(file, kind);
  if (validation) throw new Error(validation);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error(`Sign in before uploading ${kind} files.`);

  const path = `${auth.user.id}/${kind}/${crypto.randomUUID()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return `${ATTACHMENT_PREFIX}${kind}:${path}`;
}

export function attachmentKind(url: string | null | undefined): AttachmentKind | null {
  if (isStoredPdf(url)) return "pdf";
  if (!url?.startsWith(ATTACHMENT_PREFIX)) return null;
  const kind = url.slice(ATTACHMENT_PREFIX.length).split(":", 1)[0];
  return kind === "image" || kind === "audio" || kind === "pdf" ? kind : null;
}

export const isStoredAttachment = (url: string | null | undefined) =>
  attachmentKind(url) !== null;

const attachmentPath = (url: string) => {
  if (!url.startsWith(ATTACHMENT_PREFIX)) return "";
  const remainder = url.slice(ATTACHMENT_PREFIX.length);
  const separator = remainder.indexOf(":");
  return separator < 0 ? "" : remainder.slice(separator + 1);
};

export async function signedAttachmentUrl(url: string): Promise<string> {
  if (isStoredPdf(url)) return signedPdfUrl(url);
  const path = attachmentPath(url);
  if (!path) throw new Error("This attachment link is invalid.");
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl)
    throw new Error(error?.message || "Could not open this attachment.");
  return data.signedUrl;
}

export async function deleteAttachment(url: string): Promise<void> {
  if (isStoredPdf(url)) return deletePdf(url);
  const path = attachmentPath(url);
  if (!path) return;
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export const attachmentLabel = (kind: AttachmentKind) =>
  kind === "pdf" ? "PDF" : kind === "image" ? "Photo" : "Audio";
