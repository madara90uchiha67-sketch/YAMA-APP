import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS, todayKey } from "@/lib/plans";
import { callAI, SYSTEM_BASE, buildMemoryBlock, buildToneBlock, buildPersonalityBlock, extractMemory } from "@/lib/ai";

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

  if (!content) return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 });
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
  await prisma.usageLog.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date, messageCount: 0 },
  });

  // Reserva el cupo de forma atómica para que dos solicitudes simultáneas no superen el límite.
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

    const history = [...(conversation.messages || [])]
      .reverse()
      .map((message) => ({ role: message.role, content: message.content }));
    const system =
      SYSTEM_BASE +
      `\n\nModo actual: ${MODE_LABEL[mode]}` +
      buildMemoryBlock(user) +
      buildPersonalityBlock(user.personality, user.speakingStyle) +
      buildToneBlock(user.profanityLevel);

    const reply = await callAI({
      system,
      messages: [...history, { role: "user", content }],
      maxTokens: limits.maxTokensPerReply,
    });

    await prisma.$transaction([
      prisma.message.create({ data: { conversationId: conversation.id, role: "user", content } }),
      prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } }),
    ]);

    // La extracción es deliberadamente asíncrona para no añadir latencia al primer token/respuesta.
    extractMemory(content)
      .then((fact) => {
        if (fact) return prisma.memoryNote.create({ data: { userId, content: fact } });
      })
      .catch((error) => console.error("YAMA AI — fallo guardando memoria automática:", error));

    return NextResponse.json({
      reply,
      conversationId: conversation.id,
      remaining: Math.max(0, limits.messagesPerDay - (await getUsageCount(userId, date))),
    });
  } catch (error) {
    console.error("YAMA AI /api/chat — fallo interno:", error);
    await releaseReservation(userId, date);
    return NextResponse.json({ error: "YAMA está algo saturada en este momento. Intenta de nuevo en unos segundos." }, { status: 502 });
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
