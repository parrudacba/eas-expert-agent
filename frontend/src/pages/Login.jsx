"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  Loader2, LogIn, UserPlus, Send, CheckCircle,
  Clock, Cpu, Shield, Zap, Mail, Lock, KeyRound,
  MessageCircle, ArrowLeft, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helpers de dispositivo ───────────────────────────────────
function getDeviceInfo() {
  const ua = navigator.userAgent
  let browser = 'Navegador'
  if (/Edg\//.test(ua))    browser = 'Edge'
  else if (/Chrome/.test(ua))   browser = 'Chrome'
  else if (/Firefox/.test(ua))  browser = 'Firefox'
  else if (/Safari/.test(ua))   browser = 'Safari'
  let os = 'dispositivo desconhecido'
  if (/Windows/.test(ua))       os = 'Windows'
  else if (/Android/.test(ua))  os = 'Android'
  else if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Mac/.test(ua))      os = 'macOS'
  else if (/Linux/.test(ua))    os = 'Linux'
  return `${browser} no ${os}`
}

function isDeviceTrusted(userId) {
  try {
    const t = JSON.parse(localStorage.getItem('eas_trusted_devices') || '{}')
    const exp = t[userId]
    return !!exp && Date.now() < exp
  } catch { return false }
}

function trustDevice(userId) {
  try {
    const t = JSON.parse(localStorage.getItem('eas_trusted_devices') || '{}')
    t[userId] = Date.now() + 90 * 24 * 60 * 60 * 1000 // 90 dias
    localStorage.setItem('eas_trusted_devices', JSON.stringify(t))
  } catch {}
}

// Controle de rate limit local — evita chamar sendDeviceOtp se email foi enviado há < 60s
const OTP_COOLDOWN_MS = 3 * 60_000 // 3 minutos — alinha com rate limit do Supabase
function getOtpCooldownRemaining(email) {
  try {
    const t = JSON.parse(localStorage.getItem('eas_otp_sent') || '{}')
    const remaining = OTP_COOLDOWN_MS - (Date.now() - (t[email] || 0))
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0
  } catch { return 0 }
}
function markOtpSent(email) {
  try {
    const t = JSON.parse(localStorage.getItem('eas_otp_sent') || '{}')
    t[email] = Date.now()
    localStorage.setItem('eas_otp_sent', JSON.stringify(t))
  } catch {}
}

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
  const { user, signInWithPassword, sendOtp, verifyOtp, updatePassword, sendDeviceOtp, signOut } = useAuth();
  const navigate = useNavigate();

  // mode: "login" | "signup" | "request-access" | "forgot-password" | "reset-password"
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpChannel, setOtpChannel] = useState("email"); // "email" | "whatsapp"
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
  // ── Verificação de dispositivo ────────────────────────────────
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const d0 = useRef(null), d1 = useRef(null), d2 = useRef(null);
  const d3 = useRef(null), d4 = useRef(null), d5 = useRef(null);
  const digitRefs = [d0, d1, d2, d3, d4, d5];
  // Ref síncrono: impede redirect automático enquanto handleLogin processa o dispositivo
  const checkingDeviceRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // Redireciona quando user é setado via magic link (clique no email) ou sessão existente
  // checkingDeviceRef bloqueia esse redirect durante o handleLogin normal
  useEffect(() => {
    if (user && !checkingDeviceRef.current) navigate('/');
  }, [user]);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => setResendCooldown(v => { if (v <= 1) { clearInterval(t); return 0; } return v - 1; }), 1000);
  };

  const handleDigitInput = (i, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...codeDigits]; next[i] = digit; setCodeDigits(next);
    if (digit && i < 5) digitRefs[i + 1].current?.focus();
  };

  const handleDigitKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !codeDigits[i] && i > 0) {
      const next = [...codeDigits]; next[i - 1] = ''; setCodeDigits(next);
      digitRefs[i - 1].current?.focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setCodeDigits(next);
    digitRefs[Math.min(pasted.length, 5)].current?.focus();
  };

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

  // ── Entrar (email + senha) ────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    checkingDeviceRef.current = true; // bloqueia redirect do useEffect durante a verificação
    try {
      const { user: loggedUser } = await signInWithPassword(email, password);
      if (loggedUser && !isDeviceTrusted(loggedUser.id)) {
        const userId = loggedUser.id;
        // Faz logout imediato — impede acesso ao dashboard se o usuário atualizar a página
        await signOut();
        setPendingEmail(email);
        setPendingUserId(userId);
        const remaining = getOtpCooldownRemaining(email);
        if (remaining > 0) {
          // Email enviado recentemente — mostra tela com cooldown restante sem chamar Supabase
          setResendCooldown(remaining);
          const t = setInterval(() => setResendCooldown(v => { if (v <= 1) { clearInterval(t); return 0; } return v - 1; }), 1000);
        } else {
          try {
            await sendDeviceOtp(email);
            markOtpSent(email);
            startResendCooldown();
          } catch (err) {
            // Rate limit do Supabase — mostra tela assim mesmo (código pode ter chegado antes)
            if (err.message?.toLowerCase().includes('rate limit') || err.status === 429) {
              const t2 = setInterval(() => setResendCooldown(v => { if (v <= 1) { clearInterval(t2); return 0; } return v - 1; }), 1000);
              setResendCooldown(180);
            } else {
              throw err;
            }
          }
        }
        setMode("verify-device");
      } else {
        checkingDeviceRef.current = false;
        navigate("/");
      }
    } catch (err) {
      checkingDeviceRef.current = false;
      setError(err.message || "Email ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verificar código do dispositivo ──────────────────────────
  const handleVerifyDevice = async (e) => {
    e.preventDefault();
    const code = codeDigits.join('');
    if (code.length < 6) return;
    setError("");
    setLoading(true);
    try {
      await verifyOtp(pendingEmail, code);
      trustDevice(pendingUserId);
      navigate("/");
    } catch {
      setError("Código inválido ou expirado. Solicite um novo código.");
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => digitRefs[0].current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResendDeviceCode = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setLoading(true);
    try {
      await sendDeviceOtp(pendingEmail);
      markOtpSent(pendingEmail);
      startResendCooldown();
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => digitRefs[0].current?.focus(), 50);
    } catch (err) {
      setError("Erro ao reenviar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Enviar código (recuperação de senha) ──────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendOtp(email);
      setMode("reset-password");
    } catch (err) {
      setError(err.message || "Erro ao enviar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Redefinir senha (OTP + nova senha) ────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      await updatePassword(newPassword);
      navigate("/");
    } catch (err) {
      setError(err.message || "Código inválido ou expirado. Tente novamente.");
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

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const inputClass = "w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder-slate-500";
  const inputErrClass = "w-full px-4 py-3 bg-slate-900/50 border border-red-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white placeholder-slate-500";

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // ── Tela de sucesso (acesso solicitado) ───────────────────────
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
                setCompany(""); setPosition(""); setReason(""); setPassword("");
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

            {/* ── Verificação de Dispositivo ── */}
            {mode === "verify-device" && (
              <motion.div
                key="verify-device"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Ícone + título */}
                <div className="text-center mb-6">
                  <motion.div
                    className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(0,212,255,0.3)]"
                    animate={{ boxShadow: ["0 0 20px rgba(0,212,255,0.3)", "0 0 40px rgba(0,212,255,0.5)", "0 0 20px rgba(0,212,255,0.3)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Shield className="w-8 h-8 text-white" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-white mb-1">Verificação de Dispositivo</h2>
                  <p className="text-slate-400 text-sm">
                    Detectamos um novo acesso de: <span className="text-white font-medium">{getDeviceInfo()}</span>
                  </p>
                </div>

                {/* Info do código enviado */}
                <div className="bg-cyan-950/50 border border-cyan-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-cyan-200/80">
                      Enviamos um código de 6 dígitos para <strong className="text-white">{pendingEmail}</strong>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleVerifyDevice} className="space-y-5">
                  {/* 6 caixas de dígito */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
                      Digite o código recebido
                    </label>
                    <div className="flex gap-2 justify-center">
                      {codeDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={digitRefs[i]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleDigitInput(i, e.target.value)}
                          onKeyDown={e => handleDigitKeyDown(i, e)}
                          onPaste={handleDigitPaste}
                          autoFocus={i === 0}
                          className={`w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-slate-900/70 text-white outline-none transition-all
                            ${digit
                              ? 'border-cyan-500 bg-cyan-950/40 shadow-[0_0_12px_rgba(0,212,255,0.25)]'
                              : 'border-slate-700 focus:border-cyan-500 focus:shadow-[0_0_12px_rgba(0,212,255,0.2)]'
                            }`}
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-950/50 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                      {error}
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || codeDigits.join('').length < 6}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                  >
                    {loading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</>
                      : <><CheckCircle className="w-5 h-5" /> Verificar Código</>
                    }
                  </motion.button>

                  {/* Reenviar */}
                  <div className="text-center">
                    <span className="text-slate-500 text-sm">Não recebeu o código? </span>
                    {resendCooldown > 0 ? (
                      <span className="text-slate-500 text-sm">Reenviar em {resendCooldown}s</span>
                    ) : (
                      <button type="button" onClick={handleResendDeviceCode}
                        className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                        Reenviar código
                      </button>
                    )}
                  </div>

                  <button type="button"
                    onClick={() => { setMode("login"); setError(""); setCodeDigits(['','','','','','']); }}
                    className="w-full text-slate-400 hover:text-slate-300 font-medium py-2 transition-colors flex items-center justify-center gap-1 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Voltar para o login
                  </button>
                </form>
              </motion.div>
            )}

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
                    Preencha o formulário abaixo para solicitar acesso ao sistema.
                  </p>
                </div>

                <form onSubmit={handleRequestAccess} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Nome completo <span className="text-cyan-400">*</span>
                    </label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Seu nome" required className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email <span className="text-cyan-400">*</span>
                    </label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" required className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Telefone <span className="text-cyan-400">*</span>
                    </label>
                    <input type="tel" value={phone} onChange={e => handlePhoneChange(e.target.value)}
                      placeholder="(99) 99999-9999" required
                      className={phoneError ? inputErrClass : inputClass} />
                    {phoneError && <p className="text-red-400 text-xs mt-1">{phoneError}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      CPF <span className="text-cyan-400">*</span>
                    </label>
                    <input type="text" value={cpf} onChange={e => handleCpfChange(e.target.value)}
                      placeholder="000.000.000-00" required
                      className={cpfError ? inputErrClass : inputClass} />
                    {cpfError && <p className="text-red-400 text-xs mt-1">{cpfError}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Empresa</label>
                      <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                        placeholder="Sua empresa" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Cargo</label>
                      <input type="text" value={position} onChange={e => setPosition(e.target.value)}
                        placeholder="Seu cargo" className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Por que você precisa de acesso?
                    </label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)}
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
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                  >
                    {loading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
                      : <><Send className="w-5 h-5" /> Enviar Solicitação</>
                    }
                  </motion.button>

                  <button type="button" onClick={() => switchMode("login")}
                    className="w-full text-slate-400 hover:text-slate-300 font-medium py-2 transition-colors flex items-center justify-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Voltar para o login
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Recuperar Senha ── */}
            {mode === "forgot-password" && (
              <motion.div
                key="forgot-password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">Recuperar Senha</h2>
                  <p className="text-slate-400 text-sm">Informe seu email para receber o código de verificação.</p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Email cadastrado</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" required autoFocus className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Receber código via</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setOtpChannel("email")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-all ${
                          otpChannel === "email"
                            ? "bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.15)]"
                            : "border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        <Mail className="w-4 h-4" /> Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpChannel("whatsapp")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-all ${
                          otpChannel === "whatsapp"
                            ? "bg-green-600/20 border-green-500 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                            : "border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                    </div>
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
                    className="w-full bg-gradient-to-r from-slate-600 to-blue-700 hover:from-slate-500 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    {loading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
                      : <><Send className="w-5 h-5" /> Enviar Código</>
                    }
                  </motion.button>

                  <button type="button" onClick={() => switchMode("login")}
                    className="w-full text-slate-400 hover:text-slate-300 font-medium py-2 transition-colors flex items-center justify-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Voltar para o login
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Redefinir Senha (OTP + nova senha) ── */}
            {mode === "reset-password" && (
              <motion.div
                key="reset-password"
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
                    Verifique seu email <strong className="text-white">{email}</strong> e insira o código abaixo.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Código de verificação</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required maxLength={6} autoFocus
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder-slate-500 text-center text-2xl tracking-[0.5em] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Nova senha</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres" required
                        className={`${inputClass} pr-11`}
                      />
                      <button type="button" onClick={() => setShowNewPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar nova senha</label>
                    <input
                      type="password"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha" required
                      className={inputClass}
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
                    {loading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</>
                      : <><KeyRound className="w-5 h-5" /> Redefinir Senha</>
                    }
                  </motion.button>

                  <button type="button" onClick={() => switchMode("forgot-password")}
                    className="w-full text-slate-400 hover:text-slate-300 font-medium py-2 transition-colors flex items-center justify-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> Voltar
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
                    onClick={() => switchMode("login")}
                    className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      mode === "login"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                        : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    <LogIn className="w-4 h-4" /> Entrar
                  </button>
                  <button
                    onClick={() => switchMode("signup")}
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
                {mode === "login" ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="seu@email.com" required className={inputClass} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password} onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••" required
                          className={`${inputClass} pr-11`}
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
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
                      {loading
                        ? <><Loader2 className="w-5 h-5 animate-spin" /> Entrando...</>
                        : <><Lock className="w-5 h-5" /> Entrar</>
                      }
                    </motion.button>

                    <div className="text-center">
                      <button type="button" onClick={() => switchMode("forgot-password")}
                        className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                        Esqueceu o acesso?
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Signup → redirect to request-access */
                  <div className="space-y-4">
                    <div className="bg-cyan-950/50 border border-cyan-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-5 h-5 text-cyan-400" />
                        <h3 className="font-semibold text-cyan-400">Acesso por convite</h3>
                      </div>
                      <p className="text-sm text-cyan-200/70">
                        Apenas usuários autorizados pelo administrador podem criar conta.
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => switchMode("request-access")}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                    >
                      <Send className="w-5 h-5" /> Solicitar Acesso
                    </motion.button>

                    <p className="text-center text-sm text-slate-500">
                      Já tem autorização?{" "}
                      <button onClick={() => switchMode("login")} className="text-cyan-400 hover:text-cyan-300 font-medium">
                        Entrar →
                      </button>
                    </p>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Rodapé */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} EAS Expert® – Sensorseg – Todos os direitos reservados
          </p>
        </div>
      </motion.div>
    </div>
  );
}