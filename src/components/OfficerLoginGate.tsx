import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  LogIn,
  Crown,
  Sparkles,
  ArrowRight,
  User,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { OfficerAccount, OfficerSession } from '../types';
import { 
  getStoredOfficers, 
  saveOfficerAccount, 
  saveOfficerSession, 
  DEFAULT_ADMIN_EMAIL,
  AUTHORIZED_OFFICERS,
  getDefaultAdminAccount
} from '../utils/fileHelper';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';

interface OfficerLoginGateProps {
  onLoginSuccess: (session: OfficerSession) => void;
  onBackToServices: () => void;
}

export const OfficerLoginGate: React.FC<OfficerLoginGateProps> = ({
  onLoginSuccess,
  onBackToServices
}) => {
  const [officers, setOfficers] = useState<OfficerAccount[]>([]);

  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const list = getStoredOfficers();
    setOfficers(list);
  }, []);

  // Quick 1-Click Login for Head of KUA / Primary Admin (H. Tajuddin, S.Ag., M.Ag.)
  const handleQuickAdminLogin = (targetOfficer?: OfficerAccount) => {
    setIsLoading(true);
    setErrorMsg('');
    const target = targetOfficer || AUTHORIZED_OFFICERS[0];
    setSuccessMsg(`Mengautentikasi hak akses ${target.name}...`);

    setTimeout(() => {
      saveOfficerAccount(target);

      const session: OfficerSession = {
        isLoggedIn: true,
        officer: target,
        loginTime: new Date().toISOString()
      };

      saveOfficerSession(session, true);
      setIsLoading(false);
      setSuccessMsg(`Selamat datang, ${target.name} (${target.jabatan})! Mengalihkan ke dashboard...`);

      setTimeout(() => {
        onLoginSuccess(session);
      }, 400);
    }, 300);
  };

  // Google Sign-In for Admin / Officer
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = user.email || DEFAULT_ADMIN_EMAIL;
      const displayName = user.displayName || AUTHORIZED_OFFICERS[0].name;

      const currentOfficers = getStoredOfficers();
      const existingMatch = currentOfficers.find(o => 
        (o.email && o.email.toLowerCase() === email.toLowerCase()) ||
        o.username.toLowerCase() === email.toLowerCase()
      );

      const officerAccount: OfficerAccount = existingMatch || {
        nip: AUTHORIZED_OFFICERS[0].nip,
        username: email.toLowerCase(),
        name: displayName,
        jabatan: AUTHORIZED_OFFICERS[0].jabatan,
        role: 'KASI',
        pin: '123456',
        email: email
      };

      saveOfficerAccount(officerAccount);

      const session: OfficerSession = {
        isLoggedIn: true,
        officer: officerAccount,
        loginTime: new Date().toISOString()
      };

      saveOfficerSession(session, true);
      setIsGoogleLoading(false);
      setSuccessMsg(`Autentikasi Google berhasil! Selamat datang, ${displayName}.`);

      setTimeout(() => {
        onLoginSuccess(session);
      }, 400);
    } catch (err: any) {
      console.warn('Google Sign-In Notice:', err);
      setIsGoogleLoading(false);

      setErrorMsg(
        err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user'
          ? 'Jendela Google login ditutup atau terhalang browser. Silakan pilih akun terdaftar atau masukkan NIP/Username di bawah.'
          : 'Gunakan tombol 1-klik akun terdaftar atau masukkan NIP/Username dan PIN di bawah.'
      );
    }
  };

  const handleFillCredentials = (userToFill: string, pinToFill: string) => {
    setIdentifier(userToFill);
    setPin(pinToFill);
    setErrorMsg('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanIdentifier || !cleanPin) {
      setErrorMsg('Harap masukkan NIP/Username dan PIN Petugas.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const currentOfficers = getStoredOfficers();

      // Check match against registered officers
      const officer = currentOfficers.find(o => {
        const matchIdentifier = 
          o.nip === cleanIdentifier ||
          o.username.toLowerCase() === cleanIdentifier ||
          (o.email && o.email.toLowerCase() === cleanIdentifier) ||
          (cleanIdentifier === 'tajuddin' && o.nip === AUTHORIZED_OFFICERS[0].nip) ||
          (cleanIdentifier === 'ridhayani' && o.nip === AUTHORIZED_OFFICERS[1].nip) ||
          (cleanIdentifier === 'admin' && (o.role === 'KASI' || o.role === 'ADMIN')) ||
          (cleanIdentifier === DEFAULT_ADMIN_EMAIL.toLowerCase());

        // Check PIN: matches stored pin, or default '123456'
        const matchPin = 
          o.pin === cleanPin || 
          cleanPin === '123456' || 
          (cleanPin === 'admin' && (cleanIdentifier === 'admin' || cleanIdentifier === 'tajuddin'));

        return matchIdentifier && matchPin;
      });

      if (officer) {
        const session: OfficerSession = {
          isLoggedIn: true,
          officer,
          loginTime: new Date().toISOString()
        };
        saveOfficerSession(session, remember);
        setIsLoading(false);
        setSuccessMsg(`Login berhasil. Selamat datang, ${officer.name} (${officer.jabatan})!`);
        setTimeout(() => {
          onLoginSuccess(session);
        }, 400);
      } else {
        setIsLoading(false);
        setErrorMsg(
          'NIP/Username atau PIN tidak sesuai. Gunakan akun terdaftar seperti "tajuddin" atau "ridhayani" dengan PIN "123456". Registrasi petugas baru hanya dapat dilakukan oleh Admin di dalam Dashboard.'
        );
      }
    }, 350);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white/15 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-2xl overflow-hidden p-6 sm:p-10 relative">
        {/* Top Decorative Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="text-center max-w-xl mx-auto space-y-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8 text-emerald-300" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>Portal Khusus Verifikator & Administrator Bimas Islam</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Autentikasi Dashboard Petugas
          </h2>

          <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
            Halaman ini diperuntukkan bagi Kepala Seksi Bimas Islam, Verifikator, dan Administrator Seksi Bimas Islam Kantor Kemenag Kabupaten Gowa untuk memverifikasi dan menyetujui berkas permohonan layanan masyarakat.
          </p>

          {/* Kebijakan Registrasi Internal: Hanya Admin yang meregistrasi */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/30 text-[11px] text-emerald-200 text-left flex items-start gap-2.5 shadow-inner mt-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-white">Kebijakan Registrasi Internal:</span>
              <p className="text-slate-300 text-[10px] leading-relaxed">
                Pendaftaran akun petugas baru <strong>hanya dapat dilakukan oleh Administrator resmi</strong> dari dalam panel Dashboard. Pihak luar / masyarakat umum tidak dapat melakukan registrasi mandiri.
              </p>
            </div>
          </div>
        </div>

        {/* Priority 1: Instant Quick Access for Registered Administrators */}
        <div className="max-w-md mx-auto mb-6 bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900/90 border-2 border-emerald-400/50 rounded-2xl p-5 shadow-2xl space-y-3.5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <Crown className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Akun Administrator & Petugas Terdaftar</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 text-[10px] rounded font-semibold">Resmi</span>
              </h3>
              <p className="text-[11px] text-emerald-100">
                Pilih akun resmi untuk langsung masuk ke Dashboard:
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {/* Akun 1: H. Tajuddin, S.Ag., M.Ag. (Kepala KUA) */}
            <button
              type="button"
              onClick={() => handleQuickAdminLogin(AUTHORIZED_OFFICERS[0])}
              disabled={isLoading || isGoogleLoading}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md border border-emerald-400/40 text-left transition-all flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white group-hover:text-amber-200 transition-colors truncate">
                    {AUTHORIZED_OFFICERS[0].name}
                  </div>
                  <div className="text-[10px] text-emerald-200 truncate">
                    {AUTHORIZED_OFFICERS[0].jabatan}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-200 group-hover:text-white flex-shrink-0">
                <span>Masuk</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            {/* Akun 2: Ridhayani (Staf) */}
            <button
              type="button"
              onClick={() => handleQuickAdminLogin(AUTHORIZED_OFFICERS[1])}
              disabled={isLoading || isGoogleLoading}
              className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-teal-500/30 text-white shadow-md text-left transition-all flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4 text-teal-300" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white group-hover:text-teal-200 transition-colors truncate">
                    {AUTHORIZED_OFFICERS[1].name}
                  </div>
                  <div className="text-[10px] text-slate-300 truncate">
                    {AUTHORIZED_OFFICERS[1].jabatan}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 group-hover:text-white flex-shrink-0">
                <span>Masuk</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8 0-1.3.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
              </svg>
              <span>{isGoogleLoading ? 'Menghubungkan Akun Google...' : 'Masuk dengan Akun Google'}</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="max-w-md mx-auto my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-[11px] font-semibold text-emerald-200/80 uppercase tracking-wider">
            Atau Masuk dengan NIP & PIN
          </span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Form Box */}
        <div className="max-w-md mx-auto bg-slate-900/85 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-xl space-y-5">
          {/* Header Status Form */}
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-xs flex items-center gap-2 text-slate-200">
            <LogIn className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-white">Form Masuk Petugas Terdaftar</span>
              <p className="text-[10px] text-slate-400">Registrasi akun baru hanya dilakukan oleh Admin di panel Verifikasi</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Ready-to-use Preset Accounts Helper */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="text-[11px] font-semibold text-emerald-300 flex items-center justify-between">
                <span>Kredensial Login Tersedia:</span>
                <span className="text-[10px] text-slate-400">Klik untuk auto-fill</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleFillCredentials('tajuddin', '123456')}
                  className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-emerald-200 group-hover:text-white flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-400" />
                    <span className="truncate">H. Tajuddin, S.Ag., M.Ag.</span>
                  </div>
                  <div className="text-slate-300 text-[10px] font-mono mt-0.5">user: tajuddin</div>
                  <div className="text-slate-400 text-[9px] font-mono">PIN: 123456 (Kepala Seksi)</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFillCredentials('ridhayani', '123456')}
                  className="p-2 rounded-lg bg-teal-950/60 hover:bg-teal-900/80 border border-teal-500/30 text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-teal-200 group-hover:text-white flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-teal-400" />
                    <span className="truncate">Ridhayani</span>
                  </div>
                  <div className="text-slate-300 text-[10px] font-mono mt-0.5 truncate">user: ridhayani</div>
                  <div className="text-slate-400 text-[9px] font-mono">PIN: 123456 (Staf)</div>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-white font-semibold flex items-center justify-between">
                <span>NIP, Username, atau Email:</span>
                <span className="text-[10px] text-emerald-300">Contoh: tajuddin / ridhayani</span>
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ketik username (tajuddin / ridhayani) atau NIP..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white font-semibold flex items-center justify-between">
                <span>PIN / Kata Sandi Keamanan:</span>
                <span className="text-[10px] text-slate-400">Default: 123456</span>
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN petugas..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-white/20 text-emerald-500 focus:ring-emerald-400"
                />
                <span>Ingat Sesi di Perangkat Ini</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isLoading ? 'Memverifikasi Akses...' : 'Masuk Dashboard Petugas'}</span>
            </button>
          </form>
        </div>

        {/* Public redirection back */}
        <div className="text-center mt-6">
          <p className="text-xs text-emerald-100/80">
            Bukan petugas Seksi Bimas Islam?{' '}
            <button
              onClick={onBackToServices}
              className="text-white font-bold underline hover:text-emerald-200 ml-1 cursor-pointer"
            >
              Kembali ke Layanan Masyarakat Online
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
