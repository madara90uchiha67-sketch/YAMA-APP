import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS, todayKey } from "@/lib/plans";
import { callAI, SYSTEM_BASE, buildMemoryBlock, buildToneBlock, buildPersonalityBlock, extractMemory } from "@/lib/ai";

const MODE_LABEL: Record<string, string> = {
  idea: "Pensar una idea",
  story: "Crear una historia",
  content: "Crear contenido",
  free: "Chat con YAMA",
};

// Máximo de mensajes del historial que se mandan a la IA.
// Los más recientes son los más relevantes — los viejos igual
// están guardados en la BD para el Historial, solo no se mandan a la IA.
const MAX_HISTORY = 10;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  // Obtenemos usuario + conversación + límites de uso TODO en paralelo.
  const { conversationId, mode, content } = await req.json();
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Falta el mensaje." }, { status: 400 });
  }

  const date = todayKey();

  // Paralelizamos: usuario, uso diario y conversación al mismo tiempo.
  const [user, usage, existingConversation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { notes: { take: 10, orderBy: { createdAt: "desc" } } },
    }),
    prisma.usageLog.upsert({
      where: { userId_date: { userId, date } },
      update: {},
      create: { userId, date, messageCount: 0 },
    }),
    conversationId
      ? prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: MAX_HISTORY,
            },
          },
        })
      : Promise.resolve(null),
  ]);

  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  const limits = PLAN_LIMITS[user.plan];

  if (usage.messageCount >= limits.messagesPerDay) {
    return NextResponse.json(
      {
        error:
          user.plan === "FREE"
            ? "Llegaste al límite gratuito de mensajes de hoy. Mejora a Pro para seguir sin límites."
            : "Llegaste al límite diario de tu plan Pro.",
        limitReached: true,
      },
      { status: 429 }
    );
  }

  let conversation = existingConversation;
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId, mode: mode || "free" },
      include: { messages: true },
    });
  }

  // Los mensajes vienen en desc (más reciente primero), los invertimos.
  const history = [...(conversation.messages || [])]
    .reverse()
    .map((m) => ({ role: m.role, content: m.content }));

  const nextMessages = [...history, { role: "user", content }];

  const system =
    SYSTEM_BASE +
    `\n\nModo actual: ${MODE_LABEL[mode] || "Chat libre"}` +
    buildMemoryBlock(user) +
    buildPersonalityBlock(user.personality, user.speakingStyle) +
    buildToneBlock(user.profanityLevel);

  let reply: string;
  try {
    reply = await callAI({
      system,
      messages: nextMessages,
      maxTokens: limits.maxTokensPerReply,
    });
  } catch (e) {
    console.error("YAMA AI /api/chat — fallo interno:", e);
    return NextResponse.json(
      { error: "YAMA está algo saturada en este momento. Intenta de nuevo en unos segundos." },
      { status: 502 }
    );
  }

  // Guardamos en BD y respondemos al usuario — sin esperar extractMemory.
  prisma.$transaction([
    prisma.message.create({ data: { conversationId: conversation.id, role: "user", content } }),
    prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: reply } }),
    prisma.usageLog.update({ where: { userId_date: { userId, date } }, data: { messageCount: { increment: 1 } } }),
  ]).catch((e) => console.error("YAMA AI — fallo guardando mensajes:", e));

  // Memoria y respuesta van en paralelo — el usuario no espera a que extractMemory termine.
  extractMemory(content)
    .then((fact) => {
      if (fact) return prisma.memoryNote.create({ data: { userId, content: fact } });
    })
    .catch((e) => console.error("YAMA AI — fallo guardando memoria automática:", e));

  return NextResponse.json({
    reply,
    conversationId: conversation.id,
    remaining: limits.messagesPerDay - usage.messageCount - 1,
  });
}
