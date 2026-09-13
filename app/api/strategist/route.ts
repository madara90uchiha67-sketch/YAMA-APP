import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS, todayKey } from "@/lib/plans";
import { callAI, SYSTEM_BASE, buildMemoryBlock, buildToneBlock } from "@/lib/ai";

export const maxDuration = 60;
const MAX_INPUT_LENGTH = 12000;

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

  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (!input) return NextResponse.json({ error: "Falta la idea a analizar." }, { status: 400 });
  if (input.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: "El contenido es demasiado largo. Divide el material e inténtalo de nuevo." }, { status: 413 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { notes: true } });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  const limits = PLAN_LIMITS[user.plan];
  const date = todayKey();
  await prisma.usageLog.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date, strategistCount: 0 },
  });

  const reservation = await prisma.usageLog.updateMany({
    where: { userId, date, strategistCount: { lt: limits.strategistPerDay } },
    data: { strategistCount: { increment: 1 } },
  });
  if (reservation.count !== 1) {
    return NextResponse.json(
      { error: `Llegaste al límite de análisis de hoy (${limits.strategistPerDay}). Mejora a Pro para continuar.`, limitReached: true },
      { status: 429 }
    );
  }

  const system =
    SYSTEM_BASE +
    buildMemoryBlock(user) +
    buildToneBlock(user.profanityLevel) +
    `\n\nEstás en Modo Estratega. Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, con esta forma exacta:\n{"problema": "...", "oportunidad": "...", "estrategia": "...", "proximos_pasos": ["...", "...", "..."]}`;

  try {
    const raw = await callAI({
      system,
      messages: [{ role: "user", content: input }],
      maxTokens: 900,
    });
    const result = parseResult(raw);
    if (!result) throw new Error("Respuesta del estratega no válida.");
    return NextResponse.json({ result });
  } catch (error) {
    console.error("YAMA AI /api/strategist — fallo interno:", error);
    await releaseReservation(userId, date);
    return NextResponse.json({ error: "No se pudo completar el análisis. Intenta de nuevo." }, { status: 502 });
  }
}

function parseResult(raw: string) {
  const clean = raw.replace(/```(?:json)?/gi, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(clean.slice(start, end + 1));
    if (
      typeof parsed?.problema !== "string" ||
      typeof parsed?.oportunidad !== "string" ||
      typeof parsed?.estrategia !== "string" ||
      !Array.isArray(parsed?.proximos_pasos)
    ) return null;
    return {
      problema: parsed.problema,
      oportunidad: parsed.oportunidad,
      estrategia: parsed.estrategia,
      proximos_pasos: parsed.proximos_pasos.map(String).slice(0, 8),
    };
  } catch {
    return null;
  }
}

async function releaseReservation(userId: string, date: string) {
  try {
    await prisma.usageLog.updateMany({
      where: { userId, date, strategistCount: { gt: 0 } },
      data: { strategistCount: { decrement: 1 } },
    });
  } catch (releaseError) {
    console.error("YAMA AI — no se pudo liberar el análisis reservado:", releaseError);
  }
}
