import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const ATTACHMENTS_BUCKET = "yama-attachments";
export const MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export const SUPPORTED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/html",
  "application/xml",
]);

export type AttachmentRecord = {
  path: string;
  name: string;
  mimeType: string;
  size: number;
};

function getAdminClient() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url) throw new Error("Falta SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL en el entorno del servidor.");
  if (!serviceRoleKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.");
  if (!/^https:\/\/[^\s/]+/.test(url)) throw new Error("SUPABASE_URL no tiene un formato válido.");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeFileName(name: string) {
  const normalized = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 100);
  return normalized || "archivo";
}

export async function createAttachmentUpload(userId: string, name: string) {
  const path = `${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeFileName(name)}`;
  const { data, error } = await getAdminClient().storage.from(ATTACHMENTS_BUCKET).createSignedUploadUrl(path);
  if (error || !data?.token) throw new Error(error?.message || "No se pudo preparar la subida.");
  return { path, token: data.token };
}

export async function downloadAttachment(userId: string, attachment: AttachmentRecord) {
  if (!attachment.path.startsWith(`${userId}/`)) throw new Error("Adjunto no autorizado.");
  const { data, error } = await getAdminClient().storage.from(ATTACHMENTS_BUCKET).download(attachment.path);
  if (error || !data) throw new Error(error?.message || "No se pudo leer el adjunto.");
  const bytes = Buffer.from(await data.arrayBuffer());
  return { bytes, mimeType: attachment.mimeType, name: attachment.name };
}

export async function deleteAttachments(userId: string, attachments: AttachmentRecord[]) {
  const paths = attachments.filter((a) => a.path.startsWith(`${userId}/`)).map((a) => a.path);
  if (!paths.length) return;
  const { error } = await getAdminClient().storage.from(ATTACHMENTS_BUCKET).remove(paths);
  if (error) console.error("YAMA AI — no se pudieron limpiar adjuntos:", error);
}
