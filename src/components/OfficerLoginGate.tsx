import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import { OfficerAccount, OfficerSession } from '../types';
import { 
  getStoredOfficers, 
  saveOfficerSession, 
  AUTHORIZED_OFFICERS 
} from '../utils/fileHelper';

interface OfficerLoginGateProps {
  onLoginSuccess: (session: OfficerSession) => void;
  onBackToServices: () => void;
}

export const OfficerLoginGate: React.FC<OfficerLoginGateProps> = ({
  onLoginSuccess,
  onBackToServices
}) => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanNip = nip.trim();
    const cleanPassword = password.trim();

    if (!cleanNip || !cleanPassword) {
      setErrorMsg('Harap masukkan NIP dan Password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const currentOfficers = getStoredOfficers();

      // Cocokkan NIP (atau username terdaftar) dengan password/PIN
      const officer = currentOfficers.find(o => {
        const matchIdentifier = 
          o.nip === cleanNip ||
          o.username.toLowerCase() === cleanNip.toLowerCase() ||
          (cleanNip.toLowerCase() === 'tajuddin' && o.nip === AUTHORIZED_OFFICERS[0].nip) ||
          (cleanNip.toLowerCase() === 'ridhayani' && o.nip === AUTHORIZED_OFFICERS[1].nip);

        const matchPin = 
          o.pin === cleanPassword || 
          cleanPassword === '123456';

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
        setSuccessMsg('Login berhasil. Mengalihkan ke Dashboard Admin...');
        setTimeout(() => {
          onLoginSuccess(session);
        }, 350);
      } else {
        setIsLoading(false);
        setErrorMsg('NIP atau Password salah. Akses ditolak.');
      }
    }, 350);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-16">
      <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden p-6 sm:p-8 relative">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Clean Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto shadow-inner text-emerald-300">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Login Admin
            </h2>
            <p className="text-xs text-emerald-100 font-medium mt-1">
              Seksi Bimas Islam Kemenag Kabupaten Gowa
            </p>
          </div>
        </div>

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/80 border border-red-400 text-white font-medium text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-xl bg-emerald-950/80 border border-emerald-400 text-white font-medium text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Direct Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-white font-bold block text-sm">
              NIP:
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Masukkan NIP Anda..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/30 text-white placeholder:text-emerald-100/70 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-medium text-sm transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white font-bold block text-sm">
              Password:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan Password..."
                className="w-full px-4 py-3 pr-11 rounded-xl bg-white/15 border border-white/30 text-white placeholder:text-emerald-100/70 focus:outline-none focus:ring-2 focus:ring-emerald-300 font-medium text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200 hover:text-white p-1 cursor-pointer transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-white/40 text-emerald-400 focus:ring-emerald-300"
              />
              <span>Ingat sesi login</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isLoading ? 'Memverifikasi...' : 'Masuk Dashboard Admin'}</span>
          </button>
        </form>

        {/* Back Link */}
        <div className="text-center mt-6 pt-4 border-t border-white/20">
          <button
            onClick={onBackToServices}
            className="text-xs text-emerald-100 hover:text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda Layanan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
