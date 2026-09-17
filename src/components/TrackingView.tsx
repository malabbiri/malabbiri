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
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
            <span>Permohonan Diterima</span>
          </span>
        );
      case 'VERIFYING':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span>Sedang Diverifikasi Petugas</span>
          </span>
        );
      case 'REVIEW':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Proses Telaah / Pengukuran</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Selesai & Diterbitkan</span>
          </span>
        );
      case 'REVISION_NEEDED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Perlu Perbaikan Berkas</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-600" />
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Search className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pelacakan Status Berkas Daring</span>
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Lacak Perkembangan Permohonan
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
          Masukkan Nomor Tiket Registrasi (contoh: MLB-2026-XXXX), Nomor WhatsApp, atau NIK Pemohon.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleFormSubmit} className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Masukkan No. Tiket, No. HP/WA, atau NIK..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Cari Berkas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Queries (Dynamic from real submissions) */}
        {submissions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-slate-500 font-medium">
            <span>Berkas terbaru:</span>
            {submissions.slice(0, 3).map((sub) => (
              <button
                key={sub.id}
                onClick={() => {
                  setSearchQuery(sub.id);
                  performSearch(sub.id);
                }}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200 cursor-pointer shadow-xs"
              >
                {sub.id} ({sub.applicantName.split(' ')[0]})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Submission Detail View */}
      {activeSubmission ? (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {/* Top Status Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <span className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  {activeSubmission.id}
                </span>
                {getStatusBadge(activeSubmission.status)}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {activeSubmission.serviceTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Diajukan pada: <strong className="text-slate-700">{formatIndoDate(activeSubmission.submittedAt)}</strong></span>
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
                className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                title="Unduh Lembar Tanda Terima Pendaftaran dalam format PDF Resmi"
              >
                <Download className={`w-3.5 h-3.5 ${isDownloadingReceipt ? 'animate-bounce' : ''}`} />
                <span>{isDownloadingReceipt ? 'Menyiapkan PDF...' : 'Unduh Tanda Terima'}</span>
              </button>

              <button
                onClick={() => onOpenReceipt(activeSubmission)}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-xs"
                title="Pratinjau dan Cetak Lembar Tanda Terima Pendaftaran (Kop Resmi Kemenag Gowa)"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Cetak Lembar</span>
              </button>

              <button
                onClick={() => {
                  const msg = generateSubmissionWAMessage(activeSubmission);
                  openWhatsAppChat(activeSubmission.phone, msg);
                }}
                className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                <span>Notifikasi WA</span>
              </button>
            </div>
          </div>

          {/* 4-Stage Visual Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Tahapan Progres Dokumen</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {timelineStages.map((stage, idx) => {
                const stageNumber = idx + 1;
                const isCompleted = currentStageIndex > stageNumber;
                const isCurrent = currentStageIndex === stageNumber;

                return (
                  <div
                    key={stage.key}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : isCompleted
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : stageNumber}
                      </span>

                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {isCompleted ? 'Selesai' : isCurrent ? 'Diproses' : 'Menunggu'}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-900 mb-0.5">
                      {stage.title}
                    </h5>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {stage.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Officer Notes if Revision Needed */}
          {activeSubmission.officerNotes && (
            <div className={`p-4 rounded-lg border flex items-start gap-3 ${
              activeSubmission.status === 'REVISION_NEEDED'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* Applicant & Institution Info */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-700" />
                  <span>Rincian Pemohon & Lembaga</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Nama Pemohon:</span>
                    <strong className="text-slate-900 text-xs font-bold">{activeSubmission.applicantName}</strong>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">No. WhatsApp / HP:</span>
                    <strong className="text-emerald-700 font-mono text-xs">{activeSubmission.phone}</strong>
                  </div>

                  {activeSubmission.institutionName && (
                    <div>
                      <span className="text-slate-500 font-medium block">Nama Lembaga / Masjid:</span>
                      <strong className="text-slate-900 font-semibold">{activeSubmission.institutionName}</strong>
                    </div>
                  )}

                  {activeSubmission.district && (
                    <div>
                      <span className="text-slate-500 font-medium block">Kecamatan:</span>
                      <strong className="text-slate-900 font-semibold">Kec. {activeSubmission.district}</strong>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <span className="text-slate-500 font-medium block">Alamat Lengkap:</span>
                    <p className="text-slate-800 font-medium mt-0.5">{activeSubmission.address}</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span>Dokumen Persyaratan Terlampir ({activeSubmission.files.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Tersimpan di Cloud MALA'BIRI</span>
                </div>

                {activeSubmission.files.length > 0 ? (
                  <div className="space-y-2">
                    {activeSubmission.files.map((file, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-white border border-slate-200 text-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 truncate flex-1">
                          <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold text-slate-900 truncate">{file.fileName}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{file.label}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                            {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                          </span>

                          <button
                            type="button"
                            onClick={() => setViewingFile({ file, submissionId: activeSubmission.id, applicantName: activeSubmission.applicantName })}
                            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Lihat Pratinjau Dokumen"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>Lihat</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadFile(file, activeSubmission.id, activeSubmission.applicantName)}
                            className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
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
                  <p className="text-xs text-slate-500">Tidak ada berkas fisik yang terlampir.</p>
                )}
              </div>
            </div>

            {/* Verification Security Badge & Stamp */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-5 h-5" />
                </div>

                <div className="space-y-0.5">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sistem Verifikasi Digital
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    Bimas Islam Kemenag Gowa
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 inline-block mx-auto">
                  <QrCode className="w-20 h-20 text-slate-900 mx-auto" />
                  <span className="block font-mono text-[10px] text-slate-700 font-bold mt-1">
                    {activeSubmission.verificationCode}
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 leading-tight">
                  QR Code resmi memuat token verifikasi keabsahan berkas Kementerian Agama.
                </p>

                <button
                  onClick={() => openHotlineWhatsApp(`Pertanyaan mengenai berkas tiket ${activeSubmission.id}`)}
                  className="w-full py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-xs text-slate-700 font-semibold flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tanya Petugas Terkait Tiket</span>
                </button>
              </div>

              {/* History Log */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Catatan Riwayat:
                </span>
                <div className="space-y-2 text-xs">
                  {activeSubmission.statusHistory.map((hist, hIdx) => (
                    <div key={hIdx} className="border-l-2 border-emerald-600 pl-2.5 py-0.5 space-y-0.5">
                      <p className="font-semibold text-slate-800">{hist.note}</p>
                      <p className="text-[11px] text-slate-500">
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
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 max-w-lg mx-auto shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h4 className="text-base font-bold text-slate-900">Berkas Tidak Ditemukan</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tidak ada dokumen yang cocok dengan kata kunci "{searchQuery}". Pastikan Nomor Tiket atau No. HP sesuai dengan yang didaftarkan.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => { setSearchQuery(''); setHasSearched(false); }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer"
            >
              Reset Pencarian
            </button>
            <button
              onClick={onSelectServiceTab}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
            >
              Ajukan Permohonan
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2 max-w-lg mx-auto shadow-sm">
          <Search className="w-8 h-8 text-emerald-700 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">Masukkan Nomor Tiket Registrasi</h4>
          <p className="text-xs text-slate-500">
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
