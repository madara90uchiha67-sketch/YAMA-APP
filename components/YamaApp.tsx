"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import React, { memo, useState, useEffect, useCallback, useRef } from "react";
import {
  Brain,
  Film,
  TrendingUp,
  SquarePen,
  Send,
  Mic,
  MicOff,
  Home,
  MessageCircle,
  Compass,
  LayoutGrid,
  Sparkles,
  Target,
  Lightbulb,
  Rocket,
  Volume2,
  VolumeX,
  Loader2,
  Settings,
  X,
  LogOut,
  Crown,
  Flame,
  MessageSquare,
  Paperclip,
  FileText,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const sansFont = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const serifFont = '"Iowan Old Style", "Apple Garamond", "Baskerville", serif';

const stripForSpeech = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[*_~`#>-]/g, "")
    .replace(/\[.*?\]\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const BASE_COLORS: Record<string, string> = {
  bgPrimary: "#000000",
  bgSecondary: "#0A0A0A",
  bgElevated: "#141414",
  accentPrimary: "#FFFFFF",
  accentSecondary: "#8A8A8A",
  accentWarm: "#C9C9C9",
  textPrimary: "#FFFFFF",
  textSecondary: "#B0B0B0",
  textMuted: "#7A7A7A",
  borderLight: "rgba(255,255,255,0.10)",
  borderFocus: "rgba(255,255,255,0.35)",
  shadowSoft: "0 10px 30px -5px rgba(0,0,0,0.6)",

  bg: "#000000",
  line: "rgba(255,255,255,0.12)",
  ink: "#FFFFFF",
  surface: "#141414",
  muted: "#8A8A8A",
  paper: "#000000",
  metallic: "#1C1C1C",
  gold: "#D9D9D9",
};

export const COLORS: any = new Proxy(BASE_COLORS, {
  get: (target, prop: string) => {
    if (prop in target) return target[prop];
    return "#1A1815";
  }
});

function CoreOrb({ size = 132, active = false }: { size?: number; active?: boolean }) {
  return (
    <div
      style={{
        width: size, height: size, position: "relative",
        animation: `yama-breathe ${active ? 1.4 : 4.2}s ease-in-out infinite`,
      }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes yama-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
      `}</style>
      <img
        src="/1789104090163.jpg"
        alt="YAMA"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
    </div>
  );
}

function IconButton({ children, onClick, label, active }: any) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        border: `1px solid ${COLORS.borderLight}`,
        background: active ? COLORS.accentPrimary : COLORS.bgElevated,
        color: active ? COLORS.bgElevated : COLORS.textPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function TopBar({ title, subtitle, right }: any) {
  return (
    <div style={{ padding: "22px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontFamily: sansFont, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 4 }}>YAMA AI</div>
        <div style={{ fontSize: 21, fontWeight: 500, fontFamily: serifFont, color: COLORS.ink }}>{title}</div>
        {subtitle && <div style={{ fontFamily: sansFont, fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function BottomNav({ view, setView }: any) {
  const items = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "chat", label: "Chat", icon: MessageCircle },
  ];
  return (
    <div style={{ display: "flex", borderTop: `1px solid ${COLORS.line}`, background: COLORS.surface, padding: "8px 6px calc(env(safe-area-inset-bottom, 0px) + 8px)", fontFamily: sansFont }}>
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = view === it.id;
        return (
          <button key={it.id} onClick={() => setView(it.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0 4px", background: "none", border: "none", cursor: "pointer", color: isActive ? COLORS.ink : COLORS.muted }}>
            <Icon size={19} strokeWidth={isActive ? 2.3 : 1.7} />
            <span style={{ fontSize: 10.5 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SettingsModal({ open, onClose, children }: any) {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.55)", animation: "yama-modal-backdrop-in 0.25s ease" }}
      onClick={onClose}
    >
      <style>{`
        @keyframes yama-modal-backdrop-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes yama-panel-in-right { 0% { transform: translateX(100%); } 100% { transform: translateX(0); } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0A0A0A",
          width: "min(420px, 92vw)",
          height: "100%",
          overflowY: "auto",
          animation: "yama-panel-in-right 0.3s cubic-bezier(0.16,1,0.3,1)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 30px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 14px 0" }}>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: COLORS.surface, color: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const MODE_LABEL: Record<string, string> = { idea: "Pensar una idea", story: "Crear una historia", content: "Crear contenido", free: "Chat con YAMA" };

function HistoryModal({ open, onClose, onSelectConversation }: any) {
  const [conversations, setConversations] = useState<any[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setConversations(null);
    setError("");
    (async () => {
      try {
        const res = await fetch("/api/conversations");
        const data = await res.json();
        if (!res.ok) { setError(data.error || "No se pudo cargar el historial."); return; }
        setConversations(data.conversations);
      } catch {
        setError("No se pudo conectar. Revisa tu conexión.");
      }
    })();
  }, [open]);

  if (!open) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es", { day: "numeric", month: "short" });
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", background: "rgba(0,0,0,0.55)", animation: "yama-modal-backdrop-in 0.25s ease" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#0A0A0A", width: "100%", maxHeight: "80vh", borderRadius: "24px 24px 0 0", overflowY: "auto", animation: "yama-modal-sheet-in 0.3s cubic-bezier(0.16,1,0.3,1)", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.line }} />
        </div>
        <TopBar title="Historial" subtitle="Tus conversaciones anteriores" right={
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: COLORS.surface, color: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} />
          </button>
        } />
        <div style={{ padding: "0 18px 24px" }}>
          {error && <div style={{ color: "#B4433A", fontSize: 12.5, marginBottom: 10, fontFamily: sansFont }}>{error}</div>}
          {!conversations && !error && (
            <div style={{ display: "flex", justifyContent: "center", padding: "30px 0" }}>
              <CoreOrb size={40} active />
            </div>
          )}
          {conversations && conversations.length === 0 && (
            <div style={{ textAlign: "center", color: COLORS.muted, fontFamily: sansFont, fontSize: 13, padding: "30px 0" }}>
              Todavía no tienes conversaciones guardadas.
            </div>
          )}
          {conversations && conversations.length > 0 && (
            <div style={{ background: COLORS.surface, borderRadius: 18, border: `1px solid ${COLORS.line}`, overflow: "hidden" }}>
              {conversations.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => onSelectConversation(c.id)}
                  className="yama-home-row"
                  style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4, padding: "14px 16px", background: "transparent", border: "none", borderBottom: i < conversations.length - 1 ? `1px solid ${COLORS.line}` : "none", cursor: "pointer", textAlign: "left", fontFamily: sansFont }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{MODE_LABEL[c.mode] || "Chat"}</span>
                    <span style={{ fontSize: 11, color: COLORS.muted, flexShrink: 0 }}>{formatDate(c.updatedAt)}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: COLORS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.preview}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- HOME ---------------- */
function HomeView({ setView, setChatMode, memory, plan, onUpgrade, onOpenSettings }: any) {
  const options = [
    { id: "content", icon: SquarePen, title: "Crear contenido", desc: "Guiones, ideas, edición y estrategia.", go: () => { setChatMode("content"); setView("chat"); } },
    { id: "strategy", icon: TrendingUp, title: "Estrategia", desc: "Marketing, crecimiento y negocios.", go: () => setView("strategist") },
    { id: "idea", icon: Lightbulb, title: "Ideas", desc: "Generación de oportunidades y conceptos.", go: () => { setChatMode("idea"); setView("chat"); } },
    { id: "challenge", icon: Flame, title: "Reto diario", desc: "20 sugerencias para mejorar hoy.", go: () => setView("challenges") },
  ];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: COLORS.bg, animation: "yama-home-in 0.5s ease", position: "relative" }}>
      <style>{`
        @keyframes yama-home-in {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes yama-row-in {
          0% { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .yama-home-row {
          transition: background 0.15s ease;
        }
        .yama-home-row:active {
          background: rgba(255,255,255,0.06);
        }
      `}</style>
      <button
        onClick={onOpenSettings}
        aria-label="Configuración"
        style={{
          position: "absolute", top: 18, right: 16, zIndex: 5,
          width: 38, height: 38, borderRadius: "50%",
          border: `1px solid ${COLORS.line}`, background: COLORS.surface,
          color: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Settings size={17} />
      </button>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px 30px", textAlign: "center" }}>
        <div style={{ fontFamily: sansFont, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 22 }}>{memory?.brand || "YAMA AI"}</div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: -30, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 70%)" }} />
          <CoreOrb size={120} />
        </div>
        <div style={{ fontSize: 24, marginTop: 24, fontWeight: 500, fontFamily: serifFont, color: COLORS.ink }}>¿Qué vamos a crear hoy?</div>
        <div style={{ width: 36, height: 2, borderRadius: 2, background: COLORS.metallic, marginTop: 12 }} />
        {plan === "FREE" && (
          <button onClick={onUpgrade} style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.line}`, background: COLORS.surface, borderRadius: 20, padding: "8px 16px", fontFamily: sansFont, fontSize: 12.5, cursor: "pointer", color: COLORS.ink }}>
            <Crown size={13} /> Mejorar a Pro
          </button>
        )}
      </div>
      <div style={{ flex: 1, padding: "0 18px 24px" }}>
        <div style={{ background: COLORS.surface, borderRadius: 18, border: `1px solid ${COLORS.line}`, overflow: "hidden", boxShadow: "0 4px 18px rgba(0,0,0,0.3)" }}>
          {options.map((o, i) => {
            const Icon = o.icon;
            return (
              <button
                key={o.id}
                onClick={o.go}
                className="yama-home-row"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: i < options.length - 1 ? `1px solid ${COLORS.line}` : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: sansFont,
                  animation: `yama-row-in 0.4s ease ${i * 0.07}s both`,
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: COLORS.metallic, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} strokeWidth={1.8} color="#FFFFFF" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, fontFamily: serifFont, color: COLORS.ink }}>{o.title}</div>
                  <div style={{ fontSize: 11.5, color: COLORS.muted, marginTop: 2 }}>{o.desc}</div>
                </div>
                <span style={{ color: COLORS.muted, fontSize: 18, flexShrink: 0 }}>→</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- RETO DIARIO ---------------- */
function DailyChallengesView({ onSelect }: any) {
  const [challenges, setChallenges] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/challenges");
        const data = await res.json();
        if (!res.ok) { setError(data.error || "No se pudo cargar tu reto diario."); return; }
        setChallenges(data.challenges);
      } catch {
        setError("No se pudo conectar. Revisa tu conexión.");
      }
    })();
  }, []);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: COLORS.bg }}>
      <TopBar title="Reto diario" subtitle="20 sugerencias para mejorar hoy" />
      <div style={{ padding: "0 18px 24px" }}>
        {error && <div style={{ color: "#B4433A", fontSize: 12.5, marginBottom: 10, fontFamily: sansFont }}>{error}</div>}
        {!challenges && !error && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", color: COLORS.muted, fontFamily: sansFont, fontSize: 13 }}>
            <CoreOrb size={56} active />
            <div style={{ marginTop: 14 }}>Armando tu reto de hoy…</div>
          </div>
        )}
        {challenges && (
          <div style={{ background: COLORS.surface, borderRadius: 18, border: `1px solid ${COLORS.line}`, overflow: "hidden", boxShadow: "0 4px 18px rgba(0,0,0,0.3)" }}>
            {challenges.map((c, i) => (
              <button
                key={i}
                onClick={() => onSelect(c)}
                className="yama-home-row"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: i < challenges.length - 1 ? `1px solid ${COLORS.line}` : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: sansFont,
                }}
              >
                <span style={{ fontSize: 12, color: COLORS.muted, flexShrink: 0, width: 20 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 13.5, color: COLORS.ink }}>{c}</span>
                <span style={{ color: COLORS.muted, fontSize: 16, flexShrink: 0 }}>→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- CHAT ---------------- */
type ChatAttachment = { path?: string; name: string; mimeType: string; size: number; token?: string };
type ChatMessage = { role: string; content: string; attachments?: ChatAttachment[] };

function ChatView({ chatMode, plan, initialMessage, onInitialMessageSent, loadConversationId, onConversationLoaded, onOpenHistory }: any) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState("");
  const [speakOn, setSpeakOn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const initialMessageRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, loading]);

  const speak = useCallback((text: string) => {
    if (!speakOn || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(stripForSpeech(text));
    u.lang = "es-ES";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [speakOn]);

  const uploadSelectedFiles = useCallback(async (files: File[]) => {
    if (!files.length) return [] as ChatAttachment[];
    setUploading(true);
    try {
      const signRes = await fetch("/api/attachments/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: files.map((file) => ({ name: file.name, mimeType: file.type, size: file.size })) }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || "No se pudo preparar el archivo.");
      const supabase = getSupabaseBrowserClient();
      await Promise.all(signData.uploads.map(async (upload: any) => {
        const file = files[upload.index];
        if (!file) throw new Error("No se encontró el archivo seleccionado.");
        const { error: uploadError } = await supabase.storage.from("yama-attachments").uploadToSignedUrl(upload.path, upload.token, file);
        if (uploadError) throw new Error(`No se pudo subir ${upload.name}.`);
      }));
      return signData.uploads.map((upload: any) => ({ path: upload.path, name: upload.name, mimeType: upload.mimeType, size: upload.size }));
    } finally {
      setUploading(false);
    }
  }, []);

  const send = useCallback(async (text: string, files: File[] = []) => {
    const content = text.trim();
    if ((!content && !files.length) || loading || uploading) return;
    setInput(""); setLoading(true); setError("");
    let optimisticMessageAdded = false;
    try {
      const attachments = await uploadSelectedFiles(files);
      setSelectedFiles([]);
      setMessages((m) => [...m, { role: "user", content: content || "Analiza los archivos adjuntos.", attachments }]);
      optimisticMessageAdded = true;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, mode: chatMode, content, attachments }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ocurrió un error.");
        setMessages((m) => m.slice(0, -1));
        return;
      }
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      speak(data.reply);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No pude conectarme. Revisa tu conexión.");
      if (optimisticMessageAdded) setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [conversationId, chatMode, loading, speak, uploadSelectedFiles, uploading]);

  useEffect(() => {
    if (!initialMessage) {
      initialMessageRef.current = null;
      return;
    }
    if (initialMessageRef.current !== initialMessage) {
      initialMessageRef.current = initialMessage;
      send(initialMessage);
      onInitialMessageSent?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  useEffect(() => {
    if (!loadConversationId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/conversations/${loadConversationId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "No se pudo abrir esa conversación.");
          return;
        }
        setConversationId(data.id);
        setMessages(data.messages);
      } catch {
        setError("No se pudo conectar. Revisa tu conexión.");
      } finally {
        setLoading(false);
        onConversationLoaded?.();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversationId]);

  const onFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const maxFiles = plan === "PRO" ? 5 : 1;
    const maxBytes = plan === "PRO" ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    const allowed = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain", "text/markdown", "text/csv", "application/json", "text/html", "application/xml"]);
    if (files.length > maxFiles || selectedFiles.length + files.length > maxFiles) {
      setError(`Tu plan permite hasta ${maxFiles} archivo(s) por mensaje.`);
      return;
    }
    if (files.some((file) => !allowed.has(file.type))) {
      setError("Tipo de archivo no compatible. Usa imágenes, PDF o documentos de texto.");
      return;
    }
    if (files.some((file) => file.size <= 0 || file.size > maxBytes)) {
      setError(`Cada archivo puede pesar como máximo ${Math.round(maxBytes / 1024 / 1024)} MB en tu plan.`);
      return;
    }
    setError("");
    setSelectedFiles((current) => [...current, ...files]);
  };

  const toggleListen = async () => {
    setMicError("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicError("Este navegador no soporta dictado por voz."); return; }
    if (listening) { try { recognitionRef.current?.stop(); } catch {} setListening(false); return; }
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch { setMicError("Activa el permiso de micrófono en tu navegador."); return; }
    try {
      const rec = new SR();
      rec.lang = "es-ES"; rec.interimResults = false;
      rec.onresult = (ev: any) => setInput((p) => (p ? p + " " + ev.results[0][0].transcript : ev.results[0][0].transcript));
      rec.onend = () => setListening(false);
      rec.onerror = (ev: any) => { setListening(false); setMicError(ev.error === "not-allowed" ? "Activa el permiso de micrófono." : "No se pudo usar el micrófono."); };
      recognitionRef.current = rec; rec.start(); setListening(true);
    } catch { setListening(false); setMicError("No se pudo iniciar el micrófono."); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: COLORS.bg }}>
      <style>{`
        @keyframes yama-chat-empty-in { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes yama-bubble-in { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes yama-think-dot { 0%,80%,100% { opacity: 0.25; transform: scale(0.85); } 40% { opacity: 1; transform: scale(1); } }
      `}</style>

      <div style={{ padding: "22px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: `1px solid ${COLORS.line}` }}>
        <div>
          <div style={{ fontFamily: sansFont, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 4 }}>YAMA AI</div>
          <div style={{ fontSize: 21, fontWeight: 500, fontFamily: serifFont, color: COLORS.ink }}>{MODE_LABEL[chatMode] || "Chat con YAMA"}</div>
          <div style={{ fontFamily: sansFont, fontSize: 13, color: COLORS.muted, marginTop: 2 }}>{plan === "FREE" ? "Plan gratuito" : "Plan Pro"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onOpenHistory} aria-label="Historial" style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setSpeakOn((v) => !v)} aria-label="Leer en voz alta" style={{ width: 38, height: 38, borderRadius: "50%", border: `1px solid ${COLORS.line}`, background: speakOn ? COLORS.ink : COLORS.surface, color: speakOn ? "#000000" : COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {speakOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {(micError || error) && (
        <div role="alert" aria-live="polite" style={{ margin: "10px 18px 0", padding: "9px 12px", borderRadius: 10, background: "#3A1F1A", color: "#FF9E86", fontFamily: sansFont, fontSize: 12.5 }}>{micError || error}</div>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ margin: "24px auto", textAlign: "center", color: COLORS.muted, fontFamily: sansFont, fontSize: 13, maxWidth: 320, animation: "yama-chat-empty-in 0.5s ease" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <div style={{ position: "absolute", inset: -20, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 70%)" }} />
              <CoreOrb size={64} />
            </div>
            <div style={{ marginTop: 14, marginBottom: 18 }}>Escribe o habla — YAMA piensa contigo.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {["Mejorar guion", "Crear ideas", "Hacerlo más viral", "Crear estrategia", "Crear una historia"].map((label) => (
                <button
                  key={label}
                  onClick={() => send(label)}
                  style={{ border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.ink, borderRadius: 20, padding: "8px 14px", fontFamily: sansFont, fontSize: 12.5, cursor: "pointer" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "84%",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              animation: "yama-bubble-in 0.3s ease",
            }}
          >
            {m.role === "assistant" && (
              <div style={{ flexShrink: 0, marginBottom: 2 }}>
                <CoreOrb size={26} />
              </div>
            )}
            <div
              style={{
                background: m.role === "user" ? COLORS.ink : COLORS.surface,
                color: m.role === "user" ? "#000000" : COLORS.ink,
                border: m.role === "user" ? "none" : `1px solid ${COLORS.line}`,
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "11px 14px",
                fontFamily: sansFont,
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                boxShadow: m.role === "assistant" ? "0 2px 10px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {m.attachments?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: m.content ? 8 : 0 }}>
                  {m.attachments.map((attachment) => (
                    <div key={`${attachment.name}-${attachment.size}`} style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 9, padding: "6px 8px", background: m.role === "user" ? "rgba(0,0,0,0.12)" : COLORS.metallic, fontSize: 11.5 }}>
                      {attachment.mimeType.startsWith("image/") ? <Paperclip size={13} /> : <FileText size={13} />}
                      <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, alignItems: "center" }}>
            <CoreOrb size={26} />
            <div style={{ display: "flex", gap: 4, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.muted, animation: `yama-think-dot 1.2s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 14px 0", background: COLORS.surface, width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
          {selectedFiles.map((file, index) => (
            <button key={`${file.name}-${index}`} onClick={() => setSelectedFiles((current) => current.filter((_, i) => i !== index))} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${COLORS.line}`, background: COLORS.bg, color: COLORS.ink, borderRadius: 12, padding: "6px 9px", fontFamily: sansFont, fontSize: 11.5, cursor: "pointer" }} title="Quitar archivo">
              {file.type.startsWith("image/") ? <Paperclip size={13} /> : <FileText size={13} />}
              <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span> ×
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minWidth: 0, boxSizing: "border-box", overflow: "hidden", padding: "10px 14px calc(env(safe-area-inset-bottom, 0px) + 10px)", borderTop: selectedFiles.length ? "none" : `1px solid ${COLORS.line}`, background: COLORS.surface }}>
        <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,text/html,application/xml" onChange={onFilesSelected} style={{ display: "none" }} />
        <button onClick={() => fileInputRef.current?.click()} disabled={loading || uploading} style={{ width: 42, height: 42, minWidth: 42, flex: "0 0 42px", borderRadius: "50%", border: `1px solid ${COLORS.line}`, background: COLORS.bg, color: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: loading || uploading ? 0.4 : 1 }} aria-label="Adjuntar archivo">
          <Paperclip size={17} />
        </button>
        <button onClick={toggleListen} disabled={loading || uploading} style={{ width: 42, height: 42, minWidth: 42, flex: "0 0 42px", borderRadius: "50%", border: `1px solid ${COLORS.line}`, background: listening ? COLORS.ink : COLORS.bg, color: listening ? "#000000" : COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} aria-label="Hablar">
          {listening ? <MicOff size={17} /> : <Mic size={17} />}
        </button>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input, selectedFiles)} placeholder={uploading ? "Subiendo archivo…" : "Escribe tu idea…"}
          style={{ flex: "1 1 auto", minWidth: 0, width: 0, maxWidth: "100%", border: `1px solid ${COLORS.line}`, borderRadius: 21, padding: "0 16px", fontFamily: sansFont, fontSize: 14, background: COLORS.surface, color: COLORS.ink, boxSizing: "border-box" }} />
        <button onClick={() => send(input, selectedFiles)} disabled={loading || uploading || (!input.trim() && !selectedFiles.length)} style={{ width: 42, height: 42, minWidth: 42, flex: "0 0 42px", borderRadius: "50%", border: "none", background: COLORS.ink, color: "#000000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: loading || uploading || (!input.trim() && !selectedFiles.length) ? 0.4 : 1 }} aria-label="Enviar">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- STRATEGIST ---------------- */
function StrategistView() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!input.trim() || loading) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/strategist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No se pudo completar el análisis."); return; }
      setResult(data.result);
    } catch { setError("No se pudo completar el análisis."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", background: COLORS.bg }}>
      <TopBar title="Modo estratega" subtitle="Ideas, campañas, productos, videos o marcas — analizados." />
      <div style={{ padding: "0 18px 8px" }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ej. Quiero lanzar una línea de sudaderas de edición limitada…" rows={3}
          style={{ width: "100%", border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "12px 14px", fontFamily: sansFont, fontSize: 14, resize: "none", boxSizing: "border-box", background: COLORS.surface, color: COLORS.ink }} />
        <button onClick={analyze} disabled={loading || !input.trim()} style={{ marginTop: 10, width: "100%", padding: 13, borderRadius: 14, border: "none", background: COLORS.ink, color: "#000000", fontFamily: sansFont, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading || !input.trim() ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? <><Loader2 size={15} style={{ animation: "yama-rotate 1s linear infinite" }} />Analizando…</> : <><Compass size={15} /> Analizar</>}
        </button>
        {error && <div style={{ color: "#FF9E86", fontSize: 12.5, marginTop: 8, fontFamily: sansFont }}>{error}</div>}
      </div>
      {result && (
        <div style={{ padding: "10px 18px 24px", fontFamily: sansFont }}>
          {[["Problema", result.problema, Target], ["Oportunidad", result.oportunidad, Lightbulb], ["Estrategia", result.estrategia, Compass]].map(([label, text, Icon]: any) => (
            <div key={label} style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Icon size={15} color={COLORS.ink} /><span style={{ fontSize: 12, textTransform: "uppercase", color: COLORS.muted }}>{label}</span></div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: COLORS.ink }}>{text}</div>
            </div>
          ))}
          <div style={{ background: COLORS.ink, color: "#000000", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><Rocket size={15} /><span style={{ fontSize: 12, textTransform: "uppercase", opacity: 0.7 }}>Próximos pasos</span></div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>{(result.proximos_pasos || []).map((p: string, i: number) => <li key={i}>{p}</li>)}</ol>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- PANEL / CONFIG ---------------- */
function PanelView({ memory, refreshMemory, plan, onUpgrade, onDeleteAccount, onLogout }: any) {
  const [profanityLevel, setProfanityLevel] = useState(memory?.profanityLevel || "none");
  const [personality, setPersonality] = useState(memory?.personality || "");
  const [speakingStyle, setSpeakingStyle] = useState(memory?.speakingStyle || "");
  const [userProfile, setUserProfile] = useState(memory?.userProfile || "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setProfanityLevel(memory?.profanityLevel || "none");
    setPersonality(memory?.personality || ""); setSpeakingStyle(memory?.speakingStyle || ""); setUserProfile(memory?.userProfile || "");
  }, [memory]);

  const patchSettings = async (body: any) => {
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setNotice(data.error); return; }
    setNotice("");
    refreshMemory();
  };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <TopBar title="Configuración" subtitle={memory?.brand || "Tus preferencias"} />
      <div style={{ padding: "0 18px 28px", fontFamily: sansFont }}>
        {plan === "FREE" && (
          <button onClick={onUpgrade} style={{ width: "100%", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", background: COLORS.ink, color: "#000000", borderRadius: 12, padding: "12px 16px", fontSize: 13.5, cursor: "pointer" }}>
            <Crown size={14} /> Mejorar a Pro — más mensajes y memoria
          </button>
        )}
        {notice && <div role="status" aria-live="polite" style={{ color: "#FF9E86", fontSize: 12.5, marginBottom: 10 }}>{notice}</div>}

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: serifFont, fontSize: 15, marginBottom: 10, color: COLORS.ink }}>Personalidad de YAMA</div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>¿Cómo quieres que te hable?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {[["profesional", "Profesional"], ["directa", "Directa"], ["creativa", "Creativa"], ["mentor", "Mentor"], ["casual", "Casual"]].map(([val, label]) => (
              <button key={val} onClick={() => { setPersonality(val); patchSettings({ personality: val }); }}
                style={{ border: `1px solid ${personality === val ? COLORS.ink : COLORS.line}`, background: personality === val ? COLORS.ink : COLORS.surface, color: personality === val ? "#000000" : COLORS.ink, borderRadius: 16, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>Forma de hablar</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {[['formal', 'Formal'], ['casual', 'Casual']].map(([val, label]) => (
              <button key={val} onClick={() => { setSpeakingStyle(val); patchSettings({ speakingStyle: val }); }}
                style={{ border: `1px solid ${speakingStyle === val ? COLORS.ink : COLORS.line}`, background: speakingStyle === val ? COLORS.ink : COLORS.surface, color: speakingStyle === val ? "#000000" : COLORS.ink, borderRadius: 16, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>¿Para qué usas YAMA?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[['creador', 'Creador de contenido'], ['emprendedor', 'Emprendedor'], ['marca', 'Dueño de marca'], ['freelancer', 'Freelancer'], ['estudiante', 'Estudiante']].map(([val, label]) => (
              <button key={val} onClick={() => { setUserProfile(val); patchSettings({ userProfile: val }); if (val === "estudiante") window.alert("JAJAJAJA VETE A CHATGPT AQUI SOLO EXITO"); }}
                style={{ border: `1px solid ${userProfile === val ? COLORS.ink : COLORS.line}`, background: userProfile === val ? COLORS.ink : COLORS.surface, color: userProfile === val ? "#000000" : COLORS.ink, borderRadius: 16, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, color: COLORS.ink }}>Nivel de lenguaje</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>Qué tan crudo puede hablar YAMA en ganchos y contenido.</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["none", "Ninguno"], ["soft", "Suave"], ["medium", "Medio"], ["high", "Alto"]].map(([val, label]) => (
              <button key={val} onClick={() => { setProfanityLevel(val); patchSettings({ profanityLevel: val }); }}
                style={{ flex: 1, border: `1px solid ${profanityLevel === val ? COLORS.ink : COLORS.line}`, background: profanityLevel === val ? COLORS.ink : COLORS.surface, color: profanityLevel === val ? "#000000" : COLORS.ink, borderRadius: 10, padding: "8px 6px", fontSize: 12, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <div style={{ fontFamily: serifFont, fontSize: 15, marginBottom: 10, color: COLORS.ink }}>Legal</div>
          {[
            { label: "Términos y condiciones", href: "/legal/terminos" },
            { label: "Política de privacidad", href: "/legal/privacidad" },
            { label: "Política de cookies", href: "/legal/cookies" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0", borderBottom: `1px solid ${COLORS.line}`,
                color: COLORS.ink, textDecoration: "none", fontSize: 13.5, fontFamily: sansFont,
              }}
            >
              {item.label} <span style={{ color: COLORS.muted }}>→</span>
            </a>
          ))}
        </div>

        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontFamily: serifFont, fontSize: 15, marginBottom: 10, color: COLORS.ink }}>Cuenta</div>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 12 }}>Plan actual: {plan === "FREE" ? "Gratuito" : "Pro"}</div>
          <a
            href="https://wa.me/573505643381?text=Hola%2C%20quiero%20reportar%20algo%20sobre%20YAMA%20AI%3A%20"
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: "100%", marginBottom: 10, border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.ink, borderRadius: 10, padding: "10px 12px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", boxSizing: "border-box" }}
          >
            <MessageCircle size={14} /> Enviar feedback
          </a>
          <button onClick={onLogout} style={{ width: "100%", marginBottom: 10, border: `1px solid ${COLORS.line}`, background: COLORS.surface, color: COLORS.ink, borderRadius: 10, padding: "10px 12px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <LogOut size={14} /> Cerrar sesión
          </button>
          <button onClick={onDeleteAccount} style={{ width: "100%", border: `1px solid #E0B4AC`, background: "#3A1F1A", color: "#FF9E86", borderRadius: 10, padding: "10px 12px", fontSize: 13, cursor: "pointer" }}>
            Eliminar cuenta permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ROOT ---------------- */
export default function YamaApp() {
  const { status } = useSession();
  const router = useRouter();
  const [view, setView] = useState("home");
  const [chatMode, setChatMode] = useState("free");
  const [memory, setMemory] = useState<any>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadConversationId, setLoadConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const refreshMemory = useCallback(async () => {
    const res = await fetch("/api/memory");
    if (res.ok) setMemory(await res.json());
  }, []);

  useEffect(() => { if (status === "authenticated") refreshMemory(); }, [status, refreshMemory]);

  const upgrade = async () => {
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo iniciar el pago.");
      }
      window.location.assign(data.url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo iniciar el pago. Intenta de nuevo.");
    }
  };

  const deleteAccount = async () => {
    if (!confirm("¿Seguro que quieres eliminar tu cuenta? Esta acción es permanente y no se puede deshacer.")) return;
    const res = await fetch("/api/account/delete", { method: "DELETE" });
    if (res.ok) {
      await signOut({ callbackUrl: "/login" });
    } else {
      alert("No se pudo eliminar la cuenta. Intenta de nuevo.");
    }
  };

  const goToChatWithMessage = (message: string) => {
    setChatMode("free");
    setPendingChatMessage(message);
    setView("chat");
  };

  if (status === "loading" || !memory) {
    return (
      <div style={{ minHeight: "100vh", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CoreOrb size={48} active />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: serifFont, color: COLORS.ink, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", background: "#000000" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative", zIndex: 1 }}>
        {view === "home" && (
          <HomeView
            setView={setView}
            setChatMode={setChatMode}
            memory={memory}
            plan={memory.plan}
            onUpgrade={upgrade}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        {view === "chat" && (
          <ChatView
            chatMode={chatMode}
            plan={memory.plan}
            initialMessage={pendingChatMessage}
            onInitialMessageSent={() => setPendingChatMessage(null)}
            loadConversationId={loadConversationId}
            onConversationLoaded={() => setLoadConversationId(null)}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        )}
        {view === "strategist" && <StrategistView />}
        {view === "challenges" && <DailyChallengesView onSelect={goToChatWithMessage} />}
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <BottomNav view={view} setView={setView} />
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <PanelView
          memory={memory}
          refreshMemory={refreshMemory}
          plan={memory.plan}
          onUpgrade={upgrade}
          onDeleteAccount={deleteAccount}
          onLogout={() => signOut({ callbackUrl: "/login" })}
        />
      </SettingsModal>

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectConversation={(id: string) => {
          setLoadConversationId(id);
          setHistoryOpen(false);
          setView("chat");
        }}
      />
    </div>
  );
}
