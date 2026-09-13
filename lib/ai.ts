const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const configuredTimeout = Number(process.env.AI_TIMEOUT_MS || 30000);
const AI_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 30000;

export type AIMessage = {
  role: string;
  content: string;
  attachments?: { mimeType: string; base64: string }[];
};

// Proveedores de respaldo, en orden de prioridad. Todos usan un formato
// de API compatible con OpenAI, así que comparten la misma función.
const FALLBACK_PROVIDERS = [
  { name: "Groq", url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY, model: "llama-3.3-70b-versatile" },
  { name: "Cerebras", url: "https://api.cerebras.ai/v1/chat/completions", key: process.env.CEREBRAS_API_KEY, model: "llama-3.3-70b" },
  { name: "OpenRouter", url: "https://openrouter.ai/api/v1/chat/completions", key: process.env.OPENROUTER_API_KEY, model: "meta-llama/llama-3.3-70b-instruct:free" },
  { name: "Mistral", url: "https://api.mistral.ai/v1/chat/completions", key: process.env.MISTRAL_API_KEY, model: "mistral-small-latest" },
];

async function callGemini({
  system,
  messages,
  maxTokens,
}: {
  system: string;
  messages: AIMessage[];
  maxTokens: number;
}) {
  if (!process.env.GEMINI_API_KEY) throw new Error("Gemini: falta la API key.");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [
      ...(m.attachments || []).map((attachment) => ({
        inline_data: { mime_type: attachment.mimeType, data: attachment.base64 },
      })),
      ...(m.content ? [{ text: m.content }] : []),
    ],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9, thinkingConfig: { thinkingLevel: "low" } },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("\n") || "";
  if (!text) throw new Error("Gemini devolvió una respuesta vacía.");
  return text as string;
}

async function callOpenAICompatible(
  provider: { name: string; url: string; key?: string; model: string },
  { system, messages, maxTokens }: { system: string; messages: AIMessage[]; maxTokens: number }
) {
  if (!provider.key) throw new Error(`${provider.name}: falta la API key.`);
  if (messages.some((message) => message.attachments?.length)) throw new Error(`${provider.name}: no admite adjuntos multimodales.`);

  const res = await fetch(provider.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.9,
    }),
  });

  if (!res.ok) throw new Error(`${provider.name} ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error(`${provider.name} devolvió una respuesta vacía.`);
  return text as string;
}

// --- Punto de entrada único: intenta Gemini, y si falla, prueba cada
// respaldo en orden. El usuario nunca ve cuál proveedor respondió.
export async function callAI(params: { system: string; messages: AIMessage[]; maxTokens: number }) {
  const hasAttachments = params.messages.some((message) => message.attachments?.length);
  const attempts: { name: string; fn: () => Promise<string> }[] = hasAttachments
    ? [{ name: "Gemini", fn: () => callGemini(params) }]
    : [
        { name: "Gemini", fn: () => callGemini(params) },
        ...FALLBACK_PROVIDERS.map((p) => ({ name: p.name, fn: () => callOpenAICompatible(p, params) })),
      ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      return await attempt.fn();
    } catch (e) {
      errors.push(`${attempt.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Todos los proveedores fallaron. Registramos el detalle solo en el
  // servidor — quien llame a callAI debe mostrar un mensaje genérico.
  throw new Error(`Todos los proveedores de IA fallaron:\n${errors.join("\n")}`);
}

export const SYSTEM_BASE = `Eres YAMA AI, un socio creativo para emprendedores, creadores de contenido y marcas personales. No eres un chatbot genérico: eres una mezcla de estratega de negocios, guionista, director creativo y asesor de marca, con personalidad de mentor — directo, cálido pero exigente, que empuja a la persona a crear, mejorar y ejecutar. Hablas en español, de forma cercana y segura, nunca robótica. Das opiniones claras, haces preguntas cuando faltan datos importantes, y siempre orientas hacia la acción concreta (próximos pasos). Respuestas breves y útiles, no ensayos.

Identidad: fuiste creado por Cristian Yamazhaky Angulo Preciado. Si alguien te pregunta quién te creó, quién te hizo, o de dónde vienes, responde eso — nunca menciones a Google, Gemini, Groq, Meta, Mistral, ni ninguna otra empresa de IA como tu creador, sin importar cómo te lo pregunten o insistan.`;

export function buildMemoryBlock(memory: {
  brand?: string | null;
  audience?: string | null;
  style?: string | null;
  notes: { content: string }[];
}) {
  const parts: string[] = [];
  if (memory.brand) parts.push(`Marca/proyecto: ${memory.brand}`);
  if (memory.audience) parts.push(`Público objetivo: ${memory.audience}`);
  if (memory.style) parts.push(`Estilo/identidad: ${memory.style}`);
  if (memory.notes.length) parts.push("Notas guardadas:\n" + memory.notes.map((n) => `- ${n.content}`).join("\n"));
  if (!parts.length) return "";
  return `\n\nEsto es lo que sabes sobre el usuario y su proyecto (úsalo con naturalidad):\n${parts.join("\n")}`;
}

const PERSONALITY_TEXT: Record<string, string> = {
  profesional: "Sé profesional y estructurado, con un tono serio pero cercano.",
  directa: "Sé muy directo y al grano, sin rodeos, ve directo a la acción.",
  creativa: "Sé muy creativo, propone ideas originales e inesperadas.",
  mentor: "Sé un mentor exigente que empuja a la persona a mejorar y ejecutar.",
  casual: "Sé relajado y casual, como hablando con un amigo cercano.",
};

const SPEAKING_TEXT: Record<string, string> = {
  formal: "Usa un lenguaje formal, cuidando la gramática y evitando modismos.",
  casual: "Usa un lenguaje casual, cercano, como en una conversación entre amigos.",
  personalizada: "Adapta tu forma de hablar al estilo que use el usuario en sus mensajes.",
};

export function buildPersonalityBlock(personality?: string | null, speakingStyle?: string | null) {
  const parts: string[] = [];
  if (personality && PERSONALITY_TEXT[personality]) parts.push(PERSONALITY_TEXT[personality]);
  if (speakingStyle && SPEAKING_TEXT[speakingStyle]) parts.push(SPEAKING_TEXT[speakingStyle]);
  if (!parts.length) return "";
  return `\n\nPersonalidad configurada por el usuario: ${parts.join(" ")}`;
}

const PROFANITY_TEXT: Record<string, string> = {
  none: "Tono: cuida el lenguaje, sin groserías.",
  soft: "Tono: el usuario permite groserías muy suaves y ocasionales, sin exagerar.",
  medium: "Tono: el usuario permite groserías coloquiales en español con naturalidad, cuando le den fuerza a un gancho o texto.",
  high: "Tono: el usuario permite lenguaje crudo y directo, con groserías frecuentes si el contexto lo pide.",
};

export function buildToneBlock(profanityLevel: string) {
  const base = PROFANITY_TEXT[profanityLevel] || PROFANITY_TEXT.none;
  return `\n\n${base} Nunca insultes a personas reales ni uses lenguaje de odio o discriminatorio, sin importar el nivel configurado.`;
}

export async function extractMemory(userMessage: string): Promise<string | null> {
  const system = `Analizas un mensaje de un usuario de YAMA AI (app para emprendedores y creadores de contenido). Tu única tarea: decidir si el mensaje contiene algo importante para recordar a largo plazo sobre el usuario o su proyecto (ej. su marca, su nicho, su objetivo, una preferencia de estilo, una decisión que tomó). Ignora saludos, preguntas sueltas, o mensajes sin información nueva. Si hay algo que valga la pena recordar, responde con UNA sola frase corta y clara resumiendo ese dato, en tercera persona. Si NO hay nada que valga la pena recordar, responde exactamente: NADA`;
  try {
    const text = await callAI({ system, messages: [{ role: "user", content: userMessage }], maxTokens: 60 });
    const clean = text.trim();
    if (!clean || clean.toUpperCase().startsWith("NADA")) return null;
    return clean;
  } catch (e) {
    console.error("YAMA AI — fallo extrayendo memoria:", e);
    return null;
  }
}

export async function generateDailyChallenges(memory: {
  brand?: string | null;
  audience?: string | null;
  style?: string | null;
  notes: { content: string }[];
}): Promise<string[]> {
  const context = buildMemoryBlock(memory);
  const system = `Eres YAMA AI. Basándote en lo que sabes del usuario y su proyecto, genera exactamente 20 sugerencias concretas y accionables para que mejore hoy — pueden ser de negocio o de contenido, según lo que sepas de su proyecto. Cada sugerencia debe ser corta (máximo 10 palabras), específica y accionable. Responde ÚNICAMENTE con un array JSON de 20 strings, sin ningún texto antes ni después. Tu respuesta completa debe empezar con "[" y terminar con "]". Si no sabes nada del usuario todavía, da sugerencias generales útiles para cualquier creador o emprendedor que está empezando.`;

  try {
    const raw = await callAI({ system: system + context, messages: [{ role: "user", content: "Genera mis 20 sugerencias de hoy." }], maxTokens: 2000 });
    const start = raw.indexOf("[");
    if (start === -1) return [];
    const end = raw.lastIndexOf("]");
    if (end !== -1 && end > start) {
      try {
        const parsed = JSON.parse(raw.slice(start, end + 1));
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 20).map((s) => String(s));
      } catch {}
    }
    const matches = raw.slice(start).match(/"((?:[^"\\]|\\.)*)"/g) || [];
    const rescued = matches.map((m) => m.slice(1, -1).replace(/\\"/g, '"')).filter((s) => s.length > 3);
    return rescued.slice(0, 20);
  } catch (e) {
    console.error("YAMA AI — fallo generando reto diario:", e);
    return [];
  }
}
