import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  FileCheck, 
  Zap, 
  Building2, 
  Users2, 
  ShieldCheck,
  Clock,
  Lock
} from 'lucide-react';
import { openHotlineWhatsApp } from '../utils/whatsapp';
import { SubmissionRecord } from '../types';

interface HeroBannerProps {
  onSearchTicket: (query: string) => void;
  onOpenServiceCatalog: () => void;
  onOpenVerification?: () => void;
  totalSubmissions: number;
  approvedCount: number;
  recentSubmissions?: SubmissionRecord[];
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onSearchTicket,
  onOpenServiceCatalog,
  onOpenVerification,
  totalSubmissions,
  approvedCount,
  recentSubmissions = []
}) => {
  const [ticketInput, setTicketInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketInput.trim()) {
      onSearchTicket(ticketInput.trim());
    }
  };

  return (
    <div className="relative overflow-hidden pt-6 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Dynamic Background Light Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-[#0f4c75]/30 via-[#087f5b]/30 to-emerald-400/20 blur-[130px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Immersive Grid (2 Columns: Left Aside Quick Track + Right Main Hero) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Quick Tracker Aside */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-3xl p-6 flex flex-col justify-between h-full shadow-2xl space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <h2 className="text-white font-bold text-xs uppercase tracking-wider opacity-90 flex items-center gap-2 teks-timbul">
                    <Search className="w-4 h-4 text-emerald-300" />
                    <span>Lacak Layanan Online</span>
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>

                <form onSubmit={handleSearchSubmit} className="relative">
                  <input 
                    type="text" 
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value)}
                    placeholder="Ketik No. Registrasi / No. WhatsApp..." 
                    className="w-full bg-white/20 border border-white/40 rounded-xl py-3 pl-4 pr-12 text-white placeholder:text-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-300 text-xs shadow-inner font-medium"
                  />
                  <button 
                    type="submit" 
                    className="absolute right-2 top-2 p-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-md transition-colors cursor-pointer text-white font-bold"
                    title="Cari Berkas"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Recent Submissions Track (Dynamic) */}
                {recentSubmissions.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Berkas Terbaru:</p>
                    
                    {recentSubmissions.map((sub) => {
                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case 'SUBMITTED':
                            return { label: 'Diajukan', style: 'bg-cyan-500/30 border-cyan-400/50 text-cyan-200' };
                          case 'VERIFYING':
                            return { label: 'Sedang Diverifikasi', style: 'bg-amber-500/30 border-amber-400/50 text-amber-200' };
                          case 'REVIEW':
                            return { label: 'Proses Telaah', style: 'bg-blue-500/30 border-blue-400/50 text-blue-200' };
                          case 'APPROVED':
                            return { label: 'Disetujui', style: 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200' };
                          case 'REVISION_NEEDED':
                            return { label: 'Perlu Revisi', style: 'bg-rose-500/30 border-rose-400/50 text-rose-200' };
                          case 'REJECTED':
                            return { label: 'Ditolak', style: 'bg-slate-500/30 border-slate-400/50 text-slate-300' };
                          default:
                            return { label: status, style: 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200' };
                        }
                      };
                      const statusBadge = getStatusBadge(sub.status);

                      return (
                        <div 
                          key={sub.id}
                          onClick={() => {
                            setTicketInput(sub.id);
                            onSearchTicket(sub.id);
                          }}
                          className="bg-emerald-950/60 hover:bg-emerald-900/80 p-3 rounded-xl border border-emerald-400/40 cursor-pointer transition-all shadow-sm"
                        >
                          <div className="flex justify-between items-center text-xs text-emerald-300 mb-1 font-bold">
                            <span className="font-mono tracking-wider">{sub.id}</span> 
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusBadge.style}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <div className="text-xs text-white font-semibold truncate">{sub.serviceTitle}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pt-3 text-xs border-t border-white/20 space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                      <span className="text-emerald-200 font-bold">Layanan Siap Menerima Berkas</span>
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed font-normal">
                      Gunakan nomor tiket atau nomor WhatsApp untuk melacak status berkas permohonan yang telah Anda ajukan.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Mini Statistics */}
              <div className="pt-4 border-t border-white/15">
                <h2 className="text-white font-bold text-xs uppercase tracking-wider opacity-90 mb-3">Statistik Layanan</h2>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white/10 rounded-xl py-3 border border-white/15">
                    <div className="text-xl font-black text-white">{approvedCount}</div>
                    <div className="text-[10px] text-emerald-200 uppercase font-semibold">Total Selesai</div>
                  </div>
                  <div className="bg-white/10 rounded-xl py-3 border border-white/15">
                    <div className="text-xl font-black text-white">{totalSubmissions - approvedCount}</div>
                    <div className="text-[10px] text-emerald-200 uppercase font-semibold">Proses Antrian</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right / Main Hero Feature Card */}
          <main className="lg:col-span-8 flex flex-col justify-between gap-6">
            <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between flex-1">
              <div className="relative z-10 space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 border border-white/30 text-white text-xs font-semibold backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Portal Bimas Islam Digital Resmi Kab. Gowa</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight teks-timbul-display">
                  Layanan Responsif, Modern & Terpercaya
                </h1>

                <p className="text-emerald-50 text-sm sm:text-base leading-relaxed font-normal">
                  Seksi Bimbingan Masyarakat Islam Kantor Kementerian Agama Kabupaten Gowa menghadirkan kemudahan administrasi digital yang cepat, transparan, dan terpercaya bagi masyarakat.
                </p>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <button
                    onClick={onOpenServiceCatalog}
                    className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-[#0f4c75] bg-white hover:bg-emerald-50 transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-current text-[#087f5b]" />
                    <span>Pilih 9 Layanan</span>
                  </button>

                  <button
                    onClick={() => openHotlineWhatsApp()}
                    className="px-5 py-3 rounded-xl font-semibold text-xs text-white bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Konsultasi Hotline WA</span>
                  </button>
                </div>
              </div>

              {/* Decorative Watermark Emblem in Background */}
              <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
                <svg className="w-72 h-72 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                </svg>
              </div>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center shadow-lg">
                <div className="text-xl font-black text-white">9</div>
                <div className="text-[10px] text-emerald-100 uppercase font-semibold">Jenis Layanan</div>
              </div>

              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center shadow-lg">
                <div className="text-xl font-black text-white">18</div>
                <div className="text-[10px] text-emerald-100 uppercase font-semibold">KUA Kecamatan</div>
              </div>

              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center shadow-lg">
                <div className="text-xl font-black text-white">{totalSubmissions}</div>
                <div className="text-[10px] text-emerald-100 uppercase font-semibold">Total Berkas</div>
              </div>

              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-center shadow-lg">
                <div className="text-xl font-black text-white">4.9/5.0</div>
                <div className="text-[10px] text-emerald-100 uppercase font-semibold">Indeks IKM</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

