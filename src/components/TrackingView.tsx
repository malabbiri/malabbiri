import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Printer, 
  MessageCircle, 
  QrCode, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Calendar,
  Building,
  User,
  Phone,
  Eye,
  Download
} from 'lucide-react';
import { SubmissionRecord, ApplicationStatus, UploadedFileInfo } from '../types';
import { formatIndoDate } from '../utils/date';
import { generateSubmissionWAMessage, openWhatsAppChat, openHotlineWhatsApp } from '../utils/whatsapp';
import { DocumentViewerModal } from './DocumentViewerModal';
import { downloadFile, downloadOfficialReceiptPdf } from '../utils/fileHelper';

interface TrackingViewProps {
  submissions: SubmissionRecord[];
  initialQuery?: string;
  onOpenReceipt: (submission: SubmissionRecord) => void;
  onSelectServiceTab: () => void;
}

export const TrackingView: React.FC<TrackingViewProps> = ({
  submissions,
  initialQuery = '',
  onOpenReceipt,
  onSelectServiceTab
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeSubmission, setActiveSubmission] = useState<SubmissionRecord | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewingFile, setViewingFile] = useState<{
    file: UploadedFileInfo;
    submissionId: string;
    applicantName: string;
  } | null>(null);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      performSearch(initialQuery);
    } else if (submissions.length > 0 && !activeSubmission) {
      // Default to first submission
      setActiveSubmission(submissions[0]);
    }
  }, [initialQuery, submissions]);

  const performSearch = (query: string) => {
    setHasSearched(true);
    const cleaned = query.trim().toLowerCase();
    if (!cleaned) return;

    const found = submissions.find(
      s => s.id.toLowerCase().includes(cleaned) ||
           s.phone.replace(/[^0-9]/g, '').includes(cleaned.replace(/[^0-9]/g, '')) ||
           s.applicantName.toLowerCase().includes(cleaned) ||
           (s.formData.nik && s.formData.nik.includes(cleaned))
    );

    setActiveSubmission(found || null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Permohonan Diterima</span>
          </span>
        );
      case 'VERIFYING':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Sedang Diverifikasi Petugas</span>
          </span>
        );
      case 'REVIEW':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Proses Telaah / Pengukuran</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Selesai & Diterbitkan</span>
          </span>
        );
      case 'REVISION_NEEDED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Perlu Perbaikan Berkas</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Permohonan Ditolak</span>
          </span>
        );
    }
  };

  // 4-Stage Timeline Tracker
  const timelineStages = [
    { key: 'SUBMITTED', title: 'Permohonan Diterima', desc: 'Pendaftaran berkas online via MALA\'BIRI' },
    { key: 'VERIFYING', title: 'Verifikasi Berkas', desc: 'Pengecekan kelengkapan berkas & persyaratan' },
    { key: 'REVIEW', title: 'Telaah & Pengukuran', desc: 'Validasi pimpinan / jadwal falakiyah lapangan' },
    { key: 'APPROVED', title: 'Dokumen Diterbitkan', desc: 'Surat/SKT/Rekomendasi resmi siap digunakan' }
  ];

  const getStageIndex = (status: ApplicationStatus): number => {
    switch (status) {
      case 'SUBMITTED': return 1;
      case 'VERIFYING': return 2;
      case 'REVIEW': return 3;
      case 'APPROVED': return 4;
      case 'REVISION_NEEDED': return 2; // stops at verification
      case 'REJECTED': return 2;
      default: return 1;
    }
  };

  const currentStageIndex = activeSubmission ? getStageIndex(activeSubmission.status) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <Search className="w-3.5 h-3.5" />
          <span>Layanan Pelacakan Status Berkas Real-Time</span>
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Lacak Perkembangan Dokumen Anda
        </h2>
        <p className="text-xs sm:text-sm text-emerald-100 font-medium max-w-xl mx-auto">
          Masukkan Nomor Tiket Registrasi (format: MLB-2026-XXXX), Nomor WhatsApp pemohon, atau Nama Pemohon.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleFormSubmit} className="glass-panel p-2 rounded-2xl border-white/20 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-emerald-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masukkan No. Tiket, No. HP/WA, atau NIK..."
              className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder:text-emerald-100/60 text-sm focus:outline-none font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Cari Berkas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Queries (Dynamic from real submissions) */}
        {submissions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-emerald-100 font-medium">
            <span>Berkas terbaru:</span>
            {submissions.slice(0, 3).map((sub) => (
              <button
                key={sub.id}
                onClick={() => {
                  setSearchQuery(sub.id);
                  performSearch(sub.id);
                }}
                className="px-2.5 py-1 rounded-lg glass-panel hover:bg-white/15 text-emerald-200 hover:text-white font-mono text-[11px] font-semibold border-white/20"
              >
                {sub.id} ({sub.applicantName.split(' ')[0]})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Submission Detail View */}
      {activeSubmission ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border-white/20 shadow-2xl space-y-8 animate-in fade-in duration-300">
          {/* Top Status Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="text-xl sm:text-2xl font-mono font-extrabold text-white bg-slate-900/80 px-3 py-1 rounded-xl border border-white/20">
                  {activeSubmission.id}
                </span>
                {getStatusBadge(activeSubmission.status)}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {activeSubmission.serviceTitle}
              </h3>
              <p className="text-xs text-emerald-100 font-medium mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                <span>Diajukan pada: <strong className="text-white">{formatIndoDate(activeSubmission.submittedAt)}</strong></span>
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={async () => {
                  try {
                    setIsDownloadingReceipt(true);
                    await downloadOfficialReceiptPdf(activeSubmission);
                  } catch (err) {
                    console.error('Download receipt error:', err);
                  } finally {
                    setIsDownloadingReceipt(false);
                  }
                }}
                disabled={isDownloadingReceipt}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
                title="Unduh Lembar Tanda Terima Pendaftaran dalam format PDF Resmi"
              >
                <Download className={`w-4 h-4 ${isDownloadingReceipt ? 'animate-bounce' : ''}`} />
                <span>{isDownloadingReceipt ? 'Menyiapkan PDF...' : 'Unduh PDF Tanda Terima'}</span>
              </button>

              <button
                onClick={() => onOpenReceipt(activeSubmission)}
                className="px-4 py-2.5 rounded-xl glass-panel hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-2 border-white/20 cursor-pointer"
                title="Pratinjau dan Cetak Lembar Tanda Terima Pendaftaran (Kop Resmi Kemenag Gowa)"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Cetak Tanda Terima</span>
              </button>

              <button
                onClick={() => {
                  const msg = generateSubmissionWAMessage(activeSubmission);
                  openWhatsAppChat(activeSubmission.phone, msg);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>WhatsApp Notif</span>
              </button>
            </div>
          </div>

          {/* 4-Stage Visual Timeline */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Tahapan Progres Dokumen</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {timelineStages.map((stage, idx) => {
                const stageNumber = idx + 1;
                const isCompleted = currentStageIndex > stageNumber;
                const isCurrent = currentStageIndex === stageNumber;
                const isPending = currentStageIndex < stageNumber;

                return (
                  <div
                    key={stage.key}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-emerald-950/60 border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                        : isCompleted
                        ? 'bg-white/[0.06] border-white/20'
                        : 'bg-white/[0.02] border-white/10 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-gradient-to-tr from-emerald-400 to-cyan-400 text-slate-900 animate-pulse'
                          : 'bg-white/15 text-white'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stageNumber}
                      </span>

                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                        {isCompleted ? 'Selesai' : isCurrent ? 'Sedang Diproses' : 'Menunggu'}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-white mb-1">
                      {stage.title}
                    </h5>
                    <p className="text-[11px] text-emerald-100 font-medium leading-snug">
                      {stage.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Officer Notes if Revision Needed */}
          {activeSubmission.officerNotes && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              activeSubmission.status === 'REVISION_NEEDED'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
            }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Catatan dari Petugas Verifikator:
                </span>
                <p className="text-xs leading-relaxed">
                  {activeSubmission.officerNotes}
                </p>
              </div>
            </div>
          )}

          {/* Data Detail & File Proof Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Applicant & Institution Info */}
            <div className="md:col-span-2 space-y-4">
              <div className="glass-panel p-5 rounded-2xl border-white/15 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>Rincian Pemohon & Tempat Tugas</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-emerald-100 font-medium block">Nama Pemohon:</span>
                    <strong className="text-white text-sm font-semibold">{activeSubmission.applicantName}</strong>
                  </div>

                  <div>
                    <span className="text-emerald-100 font-medium block">No. WhatsApp / HP:</span>
                    <strong className="text-emerald-300 font-mono text-sm">{activeSubmission.phone}</strong>
                  </div>

                  {activeSubmission.institutionName && (
                    <div>
                      <span className="text-emerald-100 font-medium block">Nama Lembaga / Masjid:</span>
                      <strong className="text-white font-semibold">{activeSubmission.institutionName}</strong>
                    </div>
                  )}

                  {activeSubmission.district && (
                    <div>
                      <span className="text-emerald-100 font-medium block">Kecamatan:</span>
                      <strong className="text-white font-semibold">Kec. {activeSubmission.district}</strong>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <span className="text-emerald-100 font-medium block">Alamat Lengkap:</span>
                    <p className="text-white font-medium mt-0.5">{activeSubmission.address}</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="glass-panel p-5 rounded-2xl border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Berkas Dokumen yang Diunggah ({activeSubmission.files.length})</span>
                  </h4>
                  <span className="text-[10px] text-emerald-300 font-mono">Tersimpan di Cloud MALA'BIRI</span>
                </div>

                {activeSubmission.files.length > 0 ? (
                  <div className="space-y-2">
                    {activeSubmission.files.map((file, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-emerald-400/40 text-xs transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2.5 truncate flex-1">
                          <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold text-white truncate">{file.fileName}</p>
                            <p className="text-[11px] text-emerald-200 font-medium">{file.label}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                            {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                          </span>

                          <button
                            type="button"
                            onClick={() => setViewingFile({ file, submissionId: activeSubmission.id, applicantName: activeSubmission.applicantName })}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                            title="Lihat Pratinjau Dokumen"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Lihat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadFile(file, activeSubmission.id, activeSubmission.applicantName)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                            title="Unduh Salinan Dokumen"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Unduh</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-100 font-medium">Tidak ada berkas fisik yang terlampir.</p>
                )}
              </div>
            </div>

            {/* Verification Security Badge & Stamp */}
            <div className="space-y-4">
              <div className="glass-panel p-5 rounded-2xl border-emerald-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                    Sistem Verifikasi Digital
                  </h5>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    Seksi Bimbingan Masyarakat Islam Kemenag Kab. Gowa
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/15 inline-block mx-auto">
                  <QrCode className="w-24 h-24 text-emerald-400 mx-auto" />
                  <span className="block font-mono text-[10px] text-white font-bold mt-1">
                    {activeSubmission.verificationCode}
                  </span>
                </div>

                <p className="text-[10px] text-emerald-100 font-medium leading-tight">
                  QR Code ini memuat token verifikasi keaslian dokumen resmi Kemenag Kab. Gowa.
                </p>

                <button
                  onClick={() => openHotlineWhatsApp(`Pertanyaan mengenai berkas tiket ${activeSubmission.id}`)}
                  className="w-full py-2 px-3 rounded-xl glass-panel hover:bg-white/15 text-[11px] text-emerald-200 hover:text-white font-semibold flex items-center justify-center gap-1.5 border-emerald-400/30 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Tanya Petugas Terkait Tiket Ini</span>
                </button>
              </div>

              {/* History Log */}
              <div className="glass-panel p-4 rounded-2xl border-white/10 space-y-2">
                <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
                  Catatan Riwayat Berkas:
                </span>
                <div className="space-y-2 text-xs">
                  {activeSubmission.statusHistory.map((hist, hIdx) => (
                    <div key={hIdx} className="border-l-2 border-emerald-400/50 pl-2.5 py-0.5 space-y-0.5">
                      <p className="font-semibold text-white">{hist.note}</p>
                      <p className="text-[11px] text-emerald-100 font-medium">
                        {formatIndoDate(hist.timestamp)} - {hist.officerName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : hasSearched ? (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-4 max-w-lg mx-auto">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h4 className="text-lg font-bold text-white">Berkas Tidak Ditemukan</h4>
          <p className="text-xs text-emerald-100 font-medium leading-relaxed">
            Tidak ada dokumen yang cocok dengan kata kunci "{searchQuery}". Pastikan Nomor Tiket atau No. HP sesuai dengan yang didaftarkan.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => { setSearchQuery(''); setHasSearched(false); }}
              className="px-4 py-2 rounded-xl text-xs font-semibold glass-panel text-white hover:bg-white/10"
            >
              Reset Pencarian
            </button>
            <button
              onClick={onSelectServiceTab}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white"
            >
              Ajukan Permohonan Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl text-center space-y-3 max-w-lg mx-auto">
          <Search className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="text-base font-bold text-white">Silakan Masukkan Nomor Tiket</h4>
          <p className="text-xs text-emerald-100 font-medium">
            Ketik nomor tiket di kolom pencarian di atas untuk melihat detail berkas dan progres verifikasi.
          </p>
        </div>
      )}

      {/* DOCUMENT PREVIEW & DOWNLOAD MODAL */}
      {viewingFile && (
        <DocumentViewerModal
          file={viewingFile.file}
          submissionId={viewingFile.submissionId}
          applicantName={viewingFile.applicantName}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
};
