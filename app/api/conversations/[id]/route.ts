import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const userId = (session.user as any).id as string;

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });

  return NextResponse.json({
    id: conversation.id,
    mode: conversation.mode,
    messages: conversation.messages.map((message) => ({
      role: message.role,
      content: message.content,
      attachments: parseAttachmentMetadata(message.attachments),
    })),
  });
}

function parseAttachmentMetadata(value: string | null) {
  if (!value) return [];
  try {
    const attachments = JSON.parse(value);
    if (!Array.isArray(attachments)) return [];
    return attachments.map((attachment) => ({
      name: typeof attachment?.name === "string" ? attachment.name : "archivo",
      mimeType: typeof attachment?.mimeType === "string" ? attachment.mimeType : "application/octet-stream",
      size: Number(attachment?.size) || 0,
    }));
  } catch {
    return [];
  }
}
