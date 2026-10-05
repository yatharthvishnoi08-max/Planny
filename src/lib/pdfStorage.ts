import { supabase } from "./supabase";

export const PDF_BUCKET = "user-pdfs";
export const MAX_PDF_BYTES = 25 * 1024 * 1024;
const PDF_PREFIX = "planny-pdf:";

export function validatePdf(file: File): string | null {
  const looksLikePdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) return "Choose a PDF file.";
  if (!file.size) return "This PDF is empty.";
  if (file.size > MAX_PDF_BYTES) return "PDFs can be up to 25 MB.";
  return null;
}

const safeName = (name: string) =>
  name
    .replace(/\.pdf$/i, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";

export async function uploadPdf(file: File): Promise<string> {
  const validation = validatePdf(file);
  if (validation) throw new Error(validation);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in before uploading a PDF.");
  const path = `${auth.user.id}/${crypto.randomUUID()}-${safeName(file.name)}.pdf`;
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return `${PDF_PREFIX}${path}`;
}

export const isStoredPdf = (url: string | null | undefined) =>
  Boolean(url?.startsWith(PDF_PREFIX));

export const pdfPath = (url: string) =>
  url.startsWith(PDF_PREFIX) ? url.slice(PDF_PREFIX.length) : "";

export async function signedPdfUrl(url: string): Promise<string> {
  const path = pdfPath(url);
  if (!path) throw new Error("This PDF link is invalid.");
  const { data, error } = await supabase.storage
    .from(PDF_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error || !data?.signedUrl)
    throw new Error(error?.message || "Could not open this PDF.");
  return data.signedUrl;
}

export async function deletePdf(url: string): Promise<void> {
  const path = pdfPath(url);
  if (!path) return;
  const { error } = await supabase.storage.from(PDF_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export const formatFileSize = (bytes: number) => {
  const megabytes = bytes / (1024 * 1024);
  return megabytes >= 1 ? `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};
