"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  Loader2, LogIn, UserPlus, Send, CheckCircle,
  Clock, Cpu, Shield, Zap, Mail
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Validação de CPF ─────────────────────────────────────────
function validateCPF(cpf) {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i)) * (10 - i);
  let r = (sum * 10) % 11;
  if ((r === 10 || r === 11)) r = 0;
  if (r !== parseInt(cleaned.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i)) * (11 - i);
  r = (sum * 10) % 11;
  if ((r === 10 || r === 11)) r = 0;
  return r === parseInt(cleaned.charAt(10));
}

function formatCPF(v) {
  const c = v.replace(/\D/g, '').slice(0, 11);
  if (c.length <= 3) return c;
  if (c.length <= 6) return `${c.slice(0,3)}.${c.slice(3)}`;
  if (c.length <= 9) return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6)}`;
  return `${c.slice(0,3)}.${c.slice(3,6)}.${c.slice(6,9)}-${c.slice(9)}`;
}

function validatePhone(p) {
  const c = p.replace(/\D/g, '');
  return c.length >= 10 && c.length <= 11;
}

function formatPhone(v) {
  const c = v.replace(/\D/g, '').slice(0, 11);
  if (c.length <= 2) return c;
  if (c.length <= 6) return `(${c.slice(0,2)}) ${c.slice(2)}`;
  if (c.length <= 10) return `(${c.slice(0,2)}) ${c.slice(2,6)}-${c.slice(6)}`;
  return `(${c.slice(0,2)}) ${c.slice(2,7)}-${c.slice(7)}`;
}

// ─── Partículas animadas (fundo futurista) ─────────────────────
function ParticlesBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid ciano */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00d4ff" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Círculos flutuantes */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-xl"
          style={{
            width:  Math.random() * 300 + 100,
            height: Math.random() * 300 + 100,
            left:  `${Math.random() * 100}%`,
            top:   `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Linha de scan */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
        animate={{ top: ["-5%", "105%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────
export default function Login() {
  const { signInWithEmail, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // mode: "login" | "signup" | "request-access" | "otp"
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessRequestSent, setAccessRequestSent] = useState(false);
  const [cpfError, setCpfError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleCpfChange = (v) => {
    const f = formatCPF(v);
    setCpf(f);
    if (f.replace(/\D/g, '').length === 11) {
      setCpfError(validateCPF(f) ? "" : "CPF inválido");
    } else {
      setCpfError("");
    }
  };

  const handlePhoneChange = (v) => {
    const f = formatPhone(v);
    setPhone(f);
    if (f.replace(/\D/g, '').length >= 10) {
      setPhoneError(validatePhone(f) ? "" : "Telefone inválido");
    } else {
      setPhoneError("");
    }
  };

  // ── Entrar (email → OTP) ──────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmail(email);
      setMode("otp");
    } catch (err) {
      setError(err.message || "Erro ao enviar código.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      navigate("/");
    } catch {
      setError("Código inválido ou expirado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Solicitar Acesso ──────────────────────────────────────────
  const handleRequestAccess = async (e) => {
    e.preventDefault();
    setError("");
    if (!validatePhone(phone)) { setPhoneError("Telefone inválido"); return; }
    if (!validateCPF(cpf))    { setCpfError("CPF inválido"); return; }
    setLoading(true);
    try {
      const BASE = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${BASE}/public/access-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email,
          phone: phone.replace(/\D/g, ''),
          company: company || undefined,
          position: position || undefined,
          reason
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Erro ao enviar solicitação"); }
      else          { setAccessRequestSent(true); }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // ── Tela de sucesso ───────────────────────────────────────────
  if (accessRequestSent) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden">
        <ParticlesBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-8 text-center shadow-[0_0_50px_rgba(0,212,255,0.1)]">
            <motion.div
              className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,212,255,0.4)]"
              animate={{ boxShadow: ["0 0 30px rgba(0,212,255,0.4)","0 0 50px rgba(0,212,255,0.6)","0 0 30px rgba(0,212,255,0.4)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Clock className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-3">Solicitação Enviada!</h2>
            <p className="text-slate-400 mb-6">
              Sua solicitação de acesso foi enviada ao administrador. Você receberá uma notificação quando seu acesso for aprovado.
            </p>
            <div className="bg-cyan-950/50 border border-cyan-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-cyan-400">Aguarde a aprovação</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Após aprovado, você poderá acessar o sistema com o email <strong className="text-white">{email}</strong>.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setAccessRequestSent(false);
                setMode("login");
                setEmail(""); setName(""); setPhone(""); setCpf("");
                setCompany(""); setPosition(""); setReason("");
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Voltar para o login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Tela principal ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden">
      <ParticlesBackground />

      {/* Logo gigante rotativo no centro (fundo) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <motion.div
          className="relative w-[280px] h-[280px] md:w-[400px] md:h-[400px] opacity-[0.04]"
          animate={{ rotate: [0, 360], scale: [1, 1.03, 1] }}
          transition={{
            rotate: { duration: 120, repeat: Infinity, ease: "linear" },
            scale:  { duration: 10,  repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <img
            src="https://agente.sensorseg.com/logo-sensorseg.png"
            alt=""
            className="w-full h-full object-contain grayscale"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-xl rounded-2xl border border-cyan-500/30 p-8 shadow-[0_0_50px_rgba(0,212,255,0.1)]">

          {/* Logo + Título */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              className="relative w-24 h-24 mb-4 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.3)]"
              animate={{
                filter: [
                  "drop-shadow(0 0 20px rgba(0,212,255,0.3))",
                  "drop-shadow(0 0 40px rgba(0,212,255,0.5))",
                  "drop-shadow(0 0 20px rgba(0,212,255,0.3))"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <img
                src="https://agente.sensorseg.com/logo-sensorseg.png"
                alt="Sensorseg"
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement.innerHTML =
                    '<span style="font-size:36px;font-weight:900;color:#0055cc">S</span>';
                }}
              />
            </motion.div>

            {/* Expert Paulo gradient title */}
            <div className="relative">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                EAS Expert
              </h1>
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg blur-lg"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Cpu className="w-4 h-4 text-cyan-500" />
              <p className="text-slate-400 text-sm">Assistente Inteligente Sensorseg</p>
              <Zap className="w-4 h-4 text-cyan-500" />
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* ── Solicitar Acesso ── */}
            {mode === "request-access" && (
              <motion.div
                key="request-access"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="bg-amber-950/50 border border-amber-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-amber-400">Solicitar Acesso</h3>
                  </div>
                  <p className="text-sm text-amber-200/70">
                    Seu email ainda não está autorizado. Preencha o formulário abaixo para solicitar acesso.
                  </p>
                </div>

                <form onSubmit={handleRequestAccess} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Nome completo <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Seu nome" required
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" required
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Telefone <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="tel" value={phone} onChange={e => handlePhoneChange(e.target.value)}
                      placeholder="(99) 99999-9999" required
                      className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl focus:outline-none focus:ring-2 transition-all text-white placeholder-slate-500 ${phoneError ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700 focus:ring-cyan-500/50 focus:border-cyan-500'}`}
                    />
                    {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      CPF <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="text" value={cpf} onChange={e => handleCpfChange(e.target.value)}
                      placeholder="000.000.000-00" required
                      className={`w-full px-4 py-3 bg-slate-900/50 border rounded-xl focus:outline-none focus:ring-2 transition-all text-white placeholder-slate-500 ${cpfError ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700 focus:ring-cyan-500/50 focus:border-cyan-500'}`}
                    />
                    {cpfError && <p className="text-red-400 text-xs mt-1">{cpfError}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Empresa</label>
                      <input
                        type="text" value={company} onChange={e => setCompany(e.target.value)}
                        placeholder="Sua empresa"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Cargo</label>
                      <input
                        type="text" value={position} onChange={e => setPosition(e.target.value)}
                        placeholder="Seu cargo"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Por que você precisa de acesso?
                    </label>
                    <textarea
                      value={reason} onChange={e => setReason(e.target.value)}
                      placeholder="Descreva brevemente o motivo da sua solicitação..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none text-white placeholder-slate-500"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-950/50 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || !!cpfError || !!phoneError}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
                    ) : (
                      <><Send className="w-5 h-5" /> Enviar Solicitação</>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(""); setCpfError(""); setPhoneError(""); }}
                    className="w-full text-slate-400 hover:text-slate-300 font-medium py-2 transition-colors"
                  >
                    Voltar para o login
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── OTP (código enviado) ── */}
            {mode === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="bg-cyan-950/50 border border-cyan-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-cyan-400">Código Enviado!</h3>
                  </div>
                  <p className="text-sm text-cyan-200/70">
                    Verifique seu email <strong className="text-white">{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Código de verificação
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required
                      maxLength={6}
                      autoFocus
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder-slate-500 text-center text-2xl tracking-[0.5em] font-mono"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-950/50 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</>
                    ) : (
                      <><CheckCircle className="w-5 h-5" /> Entrar</>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => { setMode("login"); setOtp(""); setError(""); }}
                    className="w-full text-slate-400 hover:text-slate-300 font-medium py-2 transition-colors"
                  >
                    ← Voltar
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Login / Cadastrar (tabs) ── */}
            {(mode === "login" || mode === "signup") && (
              <motion.div
                key="login-signup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Tabs */}
                <div className="flex bg-slate-900/50 rounded-xl p-1 mb-6 border border-slate-800">
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      mode === "login"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    <LogIn className="w-4 h-4" /> Entrar
                  </button>
                  <button
                    onClick={() => { setMode("signup"); setError(""); }}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      mode === "signup"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    <UserPlus className="w-4 h-4" /> Cadastrar
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={mode === "login" ? handleSendOtp : e => { e.preventDefault(); setMode("request-access"); }} className="space-y-4">
                  {mode === "signup" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
                      <input
                        type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder-slate-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" required
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder-slate-500"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-950/50 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
                    ) : mode === "login" ? (
                      <><LogIn className="w-5 h-5" /> Entrar</>
                    ) : (
                      <><UserPlus className="w-5 h-5" /> Solicitar Acesso</>
                    )}
                  </motion.button>

                  {mode === "signup" && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-slate-500 mb-2">
                        Apenas emails autorizados pelo administrador podem criar conta.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMode("request-access")}
                        className="text-cyan-400 hover:text-cyan-300 font-medium text-sm transition-colors"
                      >
                        Não tem autorização? Solicitar acesso →
                      </button>
                    </div>
                  )}
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Rodapé */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Sensorseg® - Todos os direitos reservados
          </p>
        </div>
      </motion.div>
    </div>
  );
}