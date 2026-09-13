import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS, todayKey } from "@/lib/plans";
import { callAI, SYSTEM_BASE, buildMemoryBlock, buildToneBlock, buildPersonalityBlock, extractMemory, type AIMessage } from "@/lib/ai";
import { downloadAttachment, MAX_TOTAL_ATTACHMENT_BYTES, SUPPORTED_ATTACHMENT_TYPES, type AttachmentRecord } from "@/lib/storage";

export const maxDuration = 60;

const MODE_LABEL: Record<string, string> = {
  idea: "Pensar una idea",
  story: "Crear una historia",
  content: "Crear contenido",
  free: "Chat con YAMA",
};
const VALID_MODES = new Set(Object.keys(MODE_LABEL));
const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 12000;

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

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const mode = typeof body.mode === "string" && VALID_MODES.has(body.mode) ? body.mode : "free";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];

  if (!content && !rawAttachments.length) return NextResponse.json({ error: "Escribe un mensaje o adjunta un archivo." }, { status: 400 });
  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "El mensaje es demasiado largo. Divide el contenido e inténtalo de nuevo." }, { status: 413 });
  }

  const date = todayKey();
  const [user, existingConversation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { notes: { take: 10, orderBy: { createdAt: "desc" } } },
    }),
    conversationId
      ? prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          include: { messages: { orderBy: { createdAt: "desc" }, take: MAX_HISTORY } },
        })
      : Promise.resolve(null),
  ]);

  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  const limits = PLAN_LIMITS[user.plan];
  let attachments: AttachmentRecord[];
  try {
    attachments = parseAttachmentRecords(rawAttachments, userId, limits.maxAttachmentBytes);
  } catch {
    return NextResponse.json({ error: "El adjunto no es válido o ya no está disponible." }, { status: 400 });
  }
  if (attachments.length > limits.attachmentsPerMessage) {
    return NextResponse.json({ error: `Tu plan permite hasta ${limits.attachmentsPerMessage} archivo(s) por mensaje.` }, { status: 413 });
  }
  if (attachments.reduce((total, attachment) => total + attachment.size, 0) > MAX_TOTAL_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "El tamaño total de los archivos no puede superar 50 MB por mensaje." }, { status: 413 });
  }

  await prisma.usageLog.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date, messageCount: 0 },
  });
  const reservation = await prisma.usageLog.updateMany({
    where: { userId, date, messageCount: { lt: limits.messagesPerDay } },
    data: { messageCount: { increment: 1 } },
  });
  if (reservation.count !== 1) {
    return NextResponse.json(
      {
        error: user.plan === "FREE"
          ? "Llegaste al límite gratuito de mensajes de hoy. Mejora a Pro para seguir."
          : "Llegaste al límite diario de tu plan Pro.",
        limitReached: true,
      },
      { status: 429 }
    );
  }

  let conversation = existingConversation;
  try {
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { userId, mode },
        include: { messages: true },
      });
    }

    const history = await hydrateHistory(conversation.messages || [], userId);
    const prompt = content || "Analiza los archivos adjuntos y dime qué encuentras.";
    const currentFiles = await Promise.all(attachments.map((attachment) => downloadAttachment(userId, attachment)));
    const userMessage: AIMessage = {
      role: "user",
      content: prompt,
      attachments: currentFiles.map((file) => ({ mimeType: file.mimeType, base64: file.bytes.toString("base64") })),
    };
    const system =
      SYSTEM_BASE +
      `\n\nModo actual: ${MODE_LABEL[mode]}` +
      (attachments.length ? "\n\nEl usuario adjuntó archivos. Analízalos con atención y distingue claramente lo que ves o lees de cualquier suposición." : "") +
      buildMemoryBlock(user) +
      buildPersonalityBlock(user.personality, user.speakingStyle) +
      buildToneBlock(user.profanityLevel);

    const reply = await callAI({
      system,
      messages: [...history, userMessage],
      maxTokens: limits.maxTokensPerReply,
    });

    await prisma.$transaction([
      prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: prompt, attachments: attachments.length ? JSON.stringify(attachments) : null } }),
      prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } }),
    ]);

    if (content) {
      extractMemory(content)
        .then((fact) => {
          if (fact) return prisma.memoryNote.create({ data: { userId, content: fact } });
        })
        .catch((error) => console.error("YAMA AI — fallo guardando memoria automática:", error));
    }

    return NextResponse.json({
      reply,
      conversationId: conversation.id,
      attachments,
      remaining: Math.max(0, limits.messagesPerDay - (await getUsageCount(userId, date))),
    });
  } catch (error) {
    console.error("YAMA AI /api/chat — fallo interno:", error);
    await releaseReservation(userId, date);
    return NextResponse.json({ error: "YAMA está algo saturada en este momento. Intenta de nuevo en unos segundos." }, { status: 502 });
  }
}

function parseAttachmentRecords(raw: any[], userId: string, maxBytes: number): AttachmentRecord[] {
  const records = raw.map((attachment) => ({
    path: typeof attachment?.path === "string" ? attachment.path : "",
    name: typeof attachment?.name === "string" ? attachment.name : "",
    mimeType: typeof attachment?.mimeType === "string" ? attachment.mimeType.toLowerCase() : "",
    size: Number(attachment?.size),
  }));
  if (records.some((attachment) =>
    !attachment.path.startsWith(`${userId}/`) ||
    !attachment.name ||
    !Number.isSafeInteger(attachment.size) ||
    attachment.size <= 0 ||
    attachment.size > maxBytes ||
    !SUPPORTED_ATTACHMENT_TYPES.has(attachment.mimeType)
  )) {
    throw new Error("Adjunto inválido o no autorizado.");
  }
  return records;
}

async function hydrateHistory(messages: { role: string; content: string; attachments: string | null }[], userId: string): Promise<AIMessage[]> {
  let historyAttachmentBytes = 0;
  const hydrated: AIMessage[] = [];
  for (const message of messages.slice().reverse()) {
    const attachments = parseStoredAttachments(message.attachments, userId);
    const usableAttachments = attachments.filter((attachment) => {
      if (historyAttachmentBytes + attachment.size > 20 * 1024 * 1024) return false;
      historyAttachmentBytes += attachment.size;
      return true;
    });
    const files = await Promise.all(usableAttachments.map((attachment) => downloadAttachment(userId, attachment)));
    hydrated.push({
      role: message.role,
      content: message.content,
      attachments: files.map((file) => ({ mimeType: file.mimeType, base64: file.bytes.toString("base64") })),
    });
  }
  return hydrated;
}

function parseStoredAttachments(value: string | null, userId: string): AttachmentRecord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return parseAttachmentRecords(Array.isArray(parsed) ? parsed : [], userId, 20 * 1024 * 1024);
  } catch {
    return [];
  }
}

async function getUsageCount(userId: string, date: string) {
  const usage = await prisma.usageLog.findUnique({ where: { userId_date: { userId, date } } });
  return usage?.messageCount ?? 0;
}

async function releaseReservation(userId: string, date: string) {
  try {
    await prisma.usageLog.updateMany({
      where: { userId, date, messageCount: { gt: 0 } },
      data: { messageCount: { decrement: 1 } },
    });
  } catch (releaseError) {
    console.error("YAMA AI — no se pudo liberar el cupo reservado:", releaseError);
  }
}
