import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  UserPlus,
  LogIn,
  BadgeCheck,
  Crown,
  Sparkles,
  ArrowRight,
  User
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
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(true);

  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regNip, setRegNip] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState<'KASI' | 'VERIFIKATOR' | 'ADMIN'>('VERIFIKATOR');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const list = getStoredOfficers();
    setOfficers(list);
    // Always default to login since default accounts are pre-seeded
    setActiveTab('login');
  }, []);

  // Quick 1-Click Login for Administrator (jadilahterbaik@gmail.com)
  const handleQuickAdminLogin = () => {
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('Mengautentikasi hak akses Administrator...');

    setTimeout(() => {
      const adminAcc: OfficerAccount = {
        nip: '199008202015031002',
        username: 'admin',
        name: 'Administrator Bimas Islam',
        jabatan: 'Kepala Seksi Bimas Islam / Administrator Utama',
        role: 'KASI',
        pin: '123456',
        email: DEFAULT_ADMIN_EMAIL
      };

      saveOfficerAccount(adminAcc);

      const session: OfficerSession = {
        isLoggedIn: true,
        officer: adminAcc,
        loginTime: new Date().toISOString()
      };

      saveOfficerSession(session, true);
      setIsLoading(false);
      setSuccessMsg(`Selamat datang, Administrator (${DEFAULT_ADMIN_EMAIL})! Mengalihkan ke dashboard...`);

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
      const displayName = user.displayName || 'Administrator Bimas Islam';

      const isDefaultAdmin = email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() || 
                             email.toLowerCase().includes('admin');

      const officerAccount: OfficerAccount = {
        nip: isDefaultAdmin ? '199008202015031002' : `nip_${Date.now()}`,
        username: email.toLowerCase(),
        name: displayName,
        jabatan: isDefaultAdmin ? 'Kepala Seksi Bimas Islam / Admin Utama' : 'Verifikator Berkas Bimas Islam',
        role: isDefaultAdmin ? 'KASI' : 'VERIFIKATOR',
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

      // If popup was blocked or failed, give a smooth message and hint for 1-click login
      setErrorMsg(
        err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user'
          ? 'Jendela Google login ditutup atau terhalang browser. Silakan gunakan tombol "Masuk Cepat Sebagai Admin" di atas.'
          : 'Autentikasi Google tidak tersedia di lingkungan pratinjau ini. Gunakan tombol "Masuk Cepat Sebagai Admin" di atas.'
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

      // Flexible check: match nip, username, email, or admin keyword
      const officer = currentOfficers.find(o => {
        const matchIdentifier = 
          o.nip === cleanIdentifier ||
          o.username.toLowerCase() === cleanIdentifier ||
          (o.email && o.email.toLowerCase() === cleanIdentifier) ||
          (cleanIdentifier === 'admin' && (o.role === 'KASI' || o.role === 'ADMIN')) ||
          (cleanIdentifier === DEFAULT_ADMIN_EMAIL.toLowerCase());

        // Check PIN: matches stored pin, or default fallback '123456' / 'admin'
        const matchPin = 
          o.pin === cleanPin || 
          cleanPin === '123456' || 
          (cleanPin === 'admin' && (cleanIdentifier === 'admin' || cleanIdentifier === DEFAULT_ADMIN_EMAIL.toLowerCase()));

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
        setSuccessMsg(`Login berhasil. Selamat datang, ${officer.name}!`);
        setTimeout(() => {
          onLoginSuccess(session);
        }, 400);
      } else {
        setIsLoading(false);
        setErrorMsg(
          'NIP/Username atau PIN tidak sesuai. Gunakan Username "admin" dengan PIN "123456", atau klik tombol "Masuk Cepat Sebagai Admin" di atas.'
        );
      }
    }, 350);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regName.trim()) {
      setErrorMsg('Nama lengkap dan gelar petugas wajib diisi.');
      return;
    }
    if (!regNip.trim() || regNip.trim().length < 8) {
      setErrorMsg('NIP resmi pegawai Kemenag wajib diisi dengan benar (minimal 8 karakter).');
      return;
    }
    if (!regUsername.trim()) {
      setErrorMsg('Username petugas wajib diisi.');
      return;
    }
    if (!regPin.trim() || regPin.length < 4) {
      setErrorMsg('PIN / Kata sandi keamanan minimal 4 karakter.');
      return;
    }
    if (regPin !== regPinConfirm) {
      setErrorMsg('Konfirmasi PIN tidak cocok dengan PIN yang dimasukkan.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const currentOfficers = getStoredOfficers();
      const duplicate = currentOfficers.find(
        o => o.nip === regNip.trim() || o.username.toLowerCase() === regUsername.trim().toLowerCase()
      );

      if (duplicate) {
        setIsLoading(false);
        setErrorMsg('Petugas dengan NIP atau Username tersebut sudah terdaftar.');
        return;
      }

      const newOfficer: OfficerAccount = {
        name: regName.trim(),
        nip: regNip.trim(),
        username: regUsername.trim().toLowerCase(),
        jabatan: regRole === 'KASI' 
          ? 'Kepala Seksi Bimas Islam' 
          : regRole === 'ADMIN' 
            ? 'Administrator Utama' 
            : 'Verifikator Berkas Bimas Islam',
        role: regRole,
        pin: regPin.trim()
      };

      saveOfficerAccount(newOfficer);
      const updatedList = getStoredOfficers();
      setOfficers(updatedList);

      const session: OfficerSession = {
        isLoggedIn: true,
        officer: newOfficer,
        loginTime: new Date().toISOString()
      };
      saveOfficerSession(session, true);

      setIsLoading(false);
      setSuccessMsg('Akun petugas resmi berhasil didaftarkan. Mengalihkan ke dashboard...');
      setTimeout(() => {
        onLoginSuccess(session);
      }, 500);
    }, 450);
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
            Halaman ini diperuntukkan bagi Pejabat, Verifikator, dan Administrator Seksi Bimas Islam Kantor Kemenag Kabupaten Gowa untuk memverifikasi dan menyetujui berkas permohonan layanan masyarakat.
          </p>
        </div>

        {/* Priority 1: Instant Quick Access for Admin */}
        <div className="max-w-md mx-auto mb-6 bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900/90 border-2 border-emerald-400/50 rounded-2xl p-5 shadow-2xl space-y-3.5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <Crown className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Akses Cepat Administrator</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 text-[10px] rounded font-semibold">Otomatis</span>
              </h3>
              <p className="text-[11px] text-emerald-100 font-mono">
                Akun: <strong className="text-white">{DEFAULT_ADMIN_EMAIL}</strong>
              </p>
            </div>
          </div>

          <p className="text-[11px] text-emerald-100/90 leading-relaxed">
            Klik tombol di bawah ini untuk langsung masuk ke Dashboard Verifikasi Berkas dengan hak akses penuh Administrator (Kepala Seksi):
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleQuickAdminLogin}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>{isLoading ? 'Mengalihkan ke Dashboard...' : 'Masuk Langsung Sebagai Admin'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
          {/* Tab Selector: Login vs Register */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white/10 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Petugas</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Akun Baru</span>
            </button>
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

          {activeTab === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              {/* Ready-to-use Preset Accounts Helper */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="text-[11px] font-semibold text-emerald-300 flex items-center justify-between">
                  <span>Kredensial Login yang Tersedia:</span>
                  <span className="text-[10px] text-slate-400">Pilih untuk auto-fill</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleFillCredentials('admin', '123456')}
                    className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-left transition-colors cursor-pointer group"
                  >
                    <div className="font-bold text-emerald-200 group-hover:text-white flex items-center gap-1">
                      <User className="w-3 h-3 text-emerald-400" />
                      <span>Administrator Utama</span>
                    </div>
                    <div className="text-slate-300 text-[10px] font-mono mt-0.5">user: admin</div>
                    <div className="text-slate-400 text-[9px] font-mono">PIN: 123456</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillCredentials(DEFAULT_ADMIN_EMAIL, '123456')}
                    className="p-2 rounded-lg bg-teal-950/60 hover:bg-teal-900/80 border border-teal-500/30 text-left transition-colors cursor-pointer group"
                  >
                    <div className="font-bold text-teal-200 group-hover:text-white flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-teal-400" />
                      <span>Email Administrator</span>
                    </div>
                    <div className="text-slate-300 text-[10px] font-mono mt-0.5 truncate">user: {DEFAULT_ADMIN_EMAIL}</div>
                    <div className="text-slate-400 text-[9px] font-mono">PIN: 123456</div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-white font-semibold flex items-center justify-between">
                  <span>NIP, Username, atau Email:</span>
                  <span className="text-[10px] text-emerald-300">Contoh: admin / jadilahterbaik@gmail.com</span>
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ketik username (admin) atau NIP..."
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
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-[11px] flex items-start gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Pendaftaran Akun Resmi Pejabat / Verifikator Seksi Bimbingan Masyarakat Islam Kantor Kemenag Kabupaten Gowa.</span>
              </div>

              <div className="space-y-1">
                <label className="text-white font-semibold">Nama Lengkap & Gelar:</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Nama lengkap dan gelar kedinasan"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white font-semibold">NIP Pegawai:</label>
                  <input
                    type="text"
                    value={regNip}
                    onChange={(e) => setRegNip(e.target.value)}
                    placeholder="18 Digit NIP resmi"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white font-semibold">Username Akun:</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Username kedinasan"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-white font-semibold">Hak Akses / Peran:</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as 'KASI' | 'VERIFIKATOR' | 'ADMIN')}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="VERIFIKATOR">Verifikator Berkas Digital</option>
                  <option value="KASI">Kepala Seksi (KASI) Bimas Islam</option>
                  <option value="ADMIN">Administrator Utama Sistem</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white font-semibold">Buat PIN / Kata Sandi:</label>
                  <input
                    type="password"
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white font-semibold">Ulangi PIN:</label>
                  <input
                    type="password"
                    value={regPinConfirm}
                    onChange={(e) => setRegPinConfirm(e.target.value)}
                    placeholder="Ketik ulang PIN"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isLoading ? 'Mendaftarkan Petugas...' : 'Daftarkan & Masuk Dashboard'}</span>
              </button>
            </form>
          )}
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
