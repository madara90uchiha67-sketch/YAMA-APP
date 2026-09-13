import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deleteAttachments, type AttachmentRecord } from "@/lib/storage";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { conversations: { include: { messages: { select: { attachments: true } } } } },
  });
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  const attachments = user.conversations.flatMap((conversation) =>
    conversation.messages.flatMap((message) => parseAttachments(message.attachments))
  );
  await deleteAttachments(userId, attachments);
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}

function parseAttachments(value: string | null): AttachmentRecord[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
