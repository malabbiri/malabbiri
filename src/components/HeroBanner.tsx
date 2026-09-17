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
    <div className="pt-6 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Grid: Left Search Box + Right Hero Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Quick Tracker Solid Card */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-full shadow-sm space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4 text-emerald-600" />
                    <span>Lacak Permohonan</span>
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>

                <form onSubmit={handleSearchSubmit} className="relative">
                  <input 
                    type="text" 
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value)}
                    placeholder="No. Registrasi / No. WhatsApp..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-3.5 pr-11 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-xs font-medium transition-all"
                  />
                  <button 
                    type="submit" 
                    className="absolute right-1.5 top-1.5 p-2 bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-colors cursor-pointer text-white"
                    title="Cari Berkas"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Recent Submissions Track (Pastel Badges) */}
                {recentSubmissions.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Permohonan Terbaru:</p>
                    
                    {recentSubmissions.map((sub) => {
                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case 'SUBMITTED':
                            return { label: 'Diajukan', style: 'bg-cyan-50 text-cyan-700' };
                          case 'VERIFYING':
                            return { label: 'Diverifikasi', style: 'bg-amber-50 text-amber-700' };
                          case 'REVIEW':
                            return { label: 'Telaah', style: 'bg-blue-50 text-blue-700' };
                          case 'APPROVED':
                            return { label: 'Disetujui', style: 'bg-emerald-50 text-emerald-700' };
                          case 'REVISION_NEEDED':
                            return { label: 'Perlu Revisi', style: 'bg-rose-50 text-rose-700' };
                          case 'REJECTED':
                            return { label: 'Ditolak', style: 'bg-slate-100 text-slate-700' };
                          default:
                            return { label: status, style: 'bg-emerald-50 text-emerald-700' };
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
                          className="bg-slate-50 hover:bg-emerald-50/50 p-3 rounded-lg border border-slate-200 hover:border-emerald-300 cursor-pointer transition-all"
                        >
                          <div className="flex justify-between items-center text-xs text-slate-700 mb-1 font-bold">
                            <span className="font-mono text-emerald-700">{sub.id}</span> 
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.style}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-800 font-semibold truncate">{sub.serviceTitle}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pt-2 text-xs border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Sistem Terbuka & Aktif</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Ketikkan nomor tiket registrasi atau nomor telepon untuk melihat status berkas permohonan Anda.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Mini Statistics */}
              <div className="pt-3 border-t border-slate-100">
                <h2 className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2">Statistik Singkat</h2>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg py-2 border border-slate-200">
                    <div className="text-lg font-black text-slate-800">{approvedCount}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Selesai</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg py-2 border border-slate-200">
                    <div className="text-lg font-black text-slate-800">{totalSubmissions - approvedCount}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Proses Antrian</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right: Main Hero Feature Card (Solid White with Emerald Header Accent) */}
          <main className="lg:col-span-8 flex flex-col justify-between gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col justify-between flex-1">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Portal Layanan Digital Bimas Islam Kemenag Gowa</span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight">
                  Layanan Publik Modern, Responsif & Akuntabel
                </h1>

                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Seksi Bimbingan Masyarakat Islam Kantor Kementerian Agama Kabupaten Gowa memfasilitasi pengurusan izin operasional, surat keterangan, kalibrasi arah kiblat, dan permohonan persuratan secara daring, terukur, dan transparan.
                </p>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={onOpenServiceCatalog}
                    className="px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current text-white" />
                    <span>Pilih 9 Layanan</span>
                  </button>

                  <button
                    onClick={() => openHotlineWhatsApp()}
                    className="px-4 py-2.5 rounded-lg font-semibold text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Konsultasi Hotline WA</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                <div className="text-xl font-black text-slate-900">9</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Jenis Layanan</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                <div className="text-xl font-black text-slate-900">18</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">KUA Kecamatan</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                <div className="text-xl font-black text-slate-900">{totalSubmissions}</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Berkas</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
                <div className="text-xl font-black text-emerald-700">4.9/5.0</div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Indeks Kepuasan</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

