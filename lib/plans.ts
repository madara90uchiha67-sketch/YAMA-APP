// Límites de uso por plan. Los adjuntos se almacenan de forma privada y se
// envían a Gemini solo durante el análisis solicitado por el usuario.
export const PLAN_LIMITS = {
  FREE: {
    messagesPerDay: 15,
    maxTokensPerReply: 900,
    memoryNotesLimit: 5,
    strategistPerDay: 2,
    attachmentsPerMessage: 1,
    attachmentsPerDay: 5,
    maxAttachmentBytes: 5 * 1024 * 1024,
  },
  PRO: {
    messagesPerDay: 300,
    maxTokensPerReply: 1800,
    memoryNotesLimit: 200,
    strategistPerDay: 50,
    attachmentsPerMessage: 5,
    attachmentsPerDay: 100,
    maxAttachmentBytes: 20 * 1024 * 1024,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}
