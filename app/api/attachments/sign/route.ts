import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS, todayKey } from "@/lib/plans";
import { createAttachmentUpload, MAX_TOTAL_ATTACHMENT_BYTES, SUPPORTED_ATTACHMENT_TYPES } from "@/lib/storage";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const userId = (session.user as any).id as string;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "La solicitud no es válida." }, { status: 400 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) return NextResponse.json({ error: "Selecciona al menos un archivo." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  const limits = PLAN_LIMITS[user.plan];

  if (files.length > limits.attachmentsPerMessage) {
    return NextResponse.json({ error: `Tu plan permite hasta ${limits.attachmentsPerMessage} archivo(s) por mensaje.` }, { status: 413 });
  }

  const normalized = files.map((file: any, index: number) => ({
    index,
    name: typeof file?.name === "string" ? file.name.trim() : "",
    mimeType: typeof file?.mimeType === "string" ? file.mimeType.toLowerCase() : "",
    size: Number(file?.size),
  }));
  if (normalized.some((file) => !file.name || file.name.length > 180 || !SUPPORTED_ATTACHMENT_TYPES.has(file.mimeType))) {
    return NextResponse.json({ error: "Tipo de archivo no compatible. Usa imágenes, PDF o documentos de texto." }, { status: 415 });
  }
  if (normalized.some((file) => !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > limits.maxAttachmentBytes)) {
    return NextResponse.json({ error: `Cada archivo puede pesar como máximo ${Math.round(limits.maxAttachmentBytes / 1024 / 1024)} MB en tu plan.` }, { status: 413 });
  }
  if (normalized.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "El tamaño total de los archivos no puede superar 50 MB por mensaje." }, { status: 413 });
  }

  const date = todayKey();
  await prisma.usageLog.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date, attachmentCount: 0 },
  });
  const reservation = await prisma.usageLog.updateMany({
    where: { userId, date, attachmentCount: { lte: limits.attachmentsPerDay - normalized.length } },
    data: { attachmentCount: { increment: normalized.length } },
  });
  if (reservation.count !== 1) {
    return NextResponse.json({ error: `Llegaste al límite de archivos de hoy (${limits.attachmentsPerDay}). Mejora a Pro para continuar.`, limitReached: true }, { status: 429 });
  }

  try {
    const uploads = await Promise.all(normalized.map(async (file) => {
      const signed = await createAttachmentUpload(userId, file.name);
      return { ...file, ...signed };
    }));
    return NextResponse.json({ uploads });
  } catch (error) {
    console.error("YAMA AI — no se pudieron crear URLs de subida:", error);
    await prisma.usageLog.updateMany({
      where: { userId, date, attachmentCount: { gte: normalized.length } },
      data: { attachmentCount: { decrement: normalized.length } },
    });
    return NextResponse.json({ error: "No se pudo preparar la subida. Intenta de nuevo." }, { status: 502 });
  }
}
