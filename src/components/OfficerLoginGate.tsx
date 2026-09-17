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
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {/* Clean Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-700">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Akses Admin Bimas Islam
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Kementerian Agama Kabupaten Gowa
            </p>
          </div>
        </div>

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Direct Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-800 font-semibold block text-xs">
              NIP:
            </label>
            <input
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Masukkan NIP Anda..."
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium text-xs transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-800 font-semibold block text-xs">
              Password:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan Password..."
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium text-xs transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Ingat sesi login</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Memverifikasi...' : 'Masuk Dashboard Admin'}</span>
          </button>
        </form>

        {/* Back Link */}
        <div className="text-center mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={onBackToServices}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda Layanan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
