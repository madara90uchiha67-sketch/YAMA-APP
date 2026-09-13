"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COLORS = { bg: "#FAFAF8", surface: "#FFFFFF", line: "#E6E4DF", ink: "#141412", muted: "#8B8880" };
const sansFont = "'Inter', ui-sans-serif, -apple-system, sans-serif";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("Debes aceptar los Términos y la Política de Privacidad para continuar.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, agreed }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo crear la cuenta.");
      setLoading(false);
      return;
    }
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) setError("Cuenta creada, pero falló el inicio de sesión automático.");
    else router.push("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sansFont, padding: 20 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 340, background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 18, padding: 28 }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 4, color: COLORS.ink }}>YAMA AI</div>
        <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 20 }}>Crea tu cuenta gratis</div>
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: "11px 13px", marginBottom: 10, borderRadius: 10, border: `1px solid ${COLORS.line}`, fontFamily: sansFont, fontSize: 14 }} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
          style={{ width: "100%", padding: "11px 13px", marginBottom: 10, borderRadius: 10, border: `1px solid ${COLORS.line}`, fontFamily: sansFont, fontSize: 14 }} />
        <input type="password" placeholder="Contraseña (mín. 8 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} required
          style={{ width: "100%", padding: "11px 13px", marginBottom: 14, borderRadius: 10, border: `1px solid ${COLORS.line}`, fontFamily: sansFont, fontSize: 14 }} />

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14, fontSize: 12.5, color: COLORS.muted, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span>
            Acepto los{" "}
            <a href="/legal/terminos" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.ink, textDecoration: "underline" }}>
              Términos y Condiciones
            </a>{" "}
            y la{" "}
            <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.ink, textDecoration: "underline" }}>
              Política de Privacidad
            </a>
          </span>
        </label>

        {error && <div style={{ color: "#B4433A", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={loading}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: COLORS.ink, color: "#fff", fontFamily: sansFont, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: COLORS.muted }}>
          ¿Ya tienes cuenta? <Link href="/login" style={{ color: COLORS.ink }}>Inicia sesión</Link>
        </div>
      </form>
    </div>
  );
}
