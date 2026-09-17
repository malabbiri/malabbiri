import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  ShieldCheck, 
  Building2, 
  ScrollText, 
  HeartHandshake, 
  Sparkles,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface IntroScreenProps {
  onComplete: () => void;
}

const HIGHLIGHT_SERVICES = [
  {
    icon: Building2,
    title: 'Kemasjidan & Sarpras',
    desc: 'Registrasi ID Masjid SIMAS, Konsultasi Kiblat, Bantuan Rumah Ibadah'
  },
  {
    icon: HeartHandshake,
    title: 'Pemberdayaan KUA',
    desc: 'Bimbingan Perkawinan, Legalisir Surat Nikah, Keluarga Sakinah'
  },
  {
    icon: ScrollText,
    title: 'Rekomendasi & Izin',
    desc: 'Rekomendasi Rohaniawan, Lembaga Keagamaan, dan Operasional Majelis'
  }
];

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Menginisialisasi sistem layanan...');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Progressive system boot sequence
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsFinished(true);
          return 100;
        }
        const next = prev + 2;
        if (next < 30) {
          setStatusText('Menyiapkan modul permohonan persuratan...');
        } else if (next < 65) {
          setStatusText('Memeriksa integrasi arsip digital & pelacakan tiket...');
        } else if (next < 95) {
          setStatusText('Menghubungkan layanan Seksi Bimas Islam Kab. Gowa...');
        } else {
          setStatusText('Sistem siap. Selamat datang di MALA\'BIRI!');
        }
        return next;
      });
    }, 45); // ~2.5 seconds total

    return () => clearInterval(interval);
  }, []);

  // Auto transition 600ms after reaching 100% if user doesn't click
  useEffect(() => {
    if (isFinished) {
      const autoTimer = setTimeout(() => {
        onComplete();
      }, 700);
      return () => clearTimeout(autoTimer);
    }
  }, [isFinished, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, y: -20 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-white overflow-y-auto px-4 py-8 sm:p-6 select-none"
    >
      {/* Background Decorative Pattern & Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-900/40 via-slate-900 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none opacity-40" />

      {/* Skip Button Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <button
          onClick={onComplete}
          className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>Lewati Intro</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center my-auto space-y-6">
        
        {/* Government Top Badge */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold tracking-wider uppercase shadow-inner"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Kementerian Agama RI • Kab. Gowa</span>
        </motion.div>

        {/* Official Brand Logos Heraldry */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 0.2 }}
          className="flex items-center justify-center gap-4 sm:gap-6 pt-1"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2.5 shadow-xl border border-emerald-400/30 flex items-center justify-center transform hover:rotate-2 transition-transform">
            <img 
              src="/logokemenag.png" 
              alt="Logo Kemenag RI" 
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to svg if png fails
                (e.target as HTMLImageElement).src = '/logokemenag.svg';
              }}
            />
          </div>

          <div className="h-10 w-px bg-white/20" />

          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-xl border border-emerald-400/30 flex items-center justify-center transform hover:-rotate-2 transition-transform">
            <img 
              src="/malabbiri_logo.png" 
              alt="Logo MALABBIRI" 
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* Title & Acronym Meaning */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
              MALA'BIRI
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider">
              Resmi
            </span>
          </div>
          
          <p className="text-sm sm:text-base text-emerald-300 font-semibold tracking-wide">
            Aplikasi Layanan Digital & Tata Persuratan Bimas Islam
          </p>

          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed pt-1">
            <em>"Mala'biri"</em> — Filosofi kearifan lokal Bugis-Makassar: melayani dengan budi pekerti luhur, berakhlak mulia, transparan, dan akuntabel.
          </p>
        </motion.div>

        {/* Three Pillar Cards Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-2"
        >
          {HIGHLIGHT_SERVICES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="bg-slate-800/70 border border-white/10 hover:border-emerald-500/40 rounded-xl p-3.5 backdrop-blur-xs transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white mb-1">{item.title}</h2>
                <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
              </div>
            );
          })}
        </motion.div>

        {/* Interactive Progress Loader & Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full max-w-md space-y-2 pt-2"
        >
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium truncate flex items-center gap-1.5">
              {isFinished ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              )}
              <span>{statusText}</span>
            </span>
            <span className="font-mono font-bold text-emerald-400">{progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/10 p-0.5">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.1 }}
            />
          </div>
        </motion.div>

        {/* Action Button to Enter App */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="pt-2"
        >
          <button
            onClick={onComplete}
            className="group px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
          >
            <span>Buka Layanan Sekarang</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 mt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pelayanan Bebas Pungli • Terbuka & Real-time</span>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};
