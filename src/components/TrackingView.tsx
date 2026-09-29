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
  Download,
  Award,
  UploadCloud,
  FileUp,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Info,
  Check,
  X
} from 'lucide-react';
import { SubmissionRecord, ApplicationStatus, UploadedFileInfo } from '../types';
import { formatIndoDate } from '../utils/date';
import { 
  generateSubmissionWAMessage, 
  generateRevisionConfirmationWAMessage,
  openWhatsAppChat, 
  openHotlineWhatsApp 
} from '../utils/whatsapp';
import { DocumentViewerModal } from './DocumentViewerModal';
import { downloadFile, downloadOfficialReceiptPdf, readFileAsDataURL } from '../utils/fileHelper';
import { resubmitSubmissionRevision } from '../utils/storage';
import { getGoogleAppsScriptUrl, uploadFileToGoogleDriveViaScript } from '../utils/googleAppsScript';
import { saveFileInChunks } from '../utils/chunkedStorage';
import { APP_INFO } from '../data/services';

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

  // States for In-Place Revision Upload (Perbaikan Berkas tanpa pendaftaran baru)
  const [replacementFiles, setReplacementFiles] = useState<Record<number, { file: File; dataUrl: string }>>({});
  const [extraFiles, setExtraFiles] = useState<Array<{ id: string; label: string; file: File; dataUrl: string }>>([]);
  const [extraDocLabelInput, setExtraDocLabelInput] = useState('');
  const [showAddExtraDoc, setShowAddExtraDoc] = useState(false);
  const [applicantRevisionNote, setApplicantRevisionNote] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [revisionProgressText, setRevisionProgressText] = useState('');
  const [revisionSuccessNotice, setRevisionSuccessNotice] = useState<string | null>(null);

  // Reset revision temporary form state when viewing a different submission
  useEffect(() => {
    setReplacementFiles({});
    setExtraFiles([]);
    setExtraDocLabelInput('');
    setShowAddExtraDoc(false);
    setApplicantRevisionNote('');
    setRevisionSuccessNotice(null);
  }, [activeSubmission?.id]);

  // Keep activeSubmission reactive to submissions array changes
  useEffect(() => {
    if (activeSubmission) {
      const refreshed = submissions.find(s => s.id.toLowerCase() === activeSubmission.id.toLowerCase());
      if (refreshed && (refreshed.status !== activeSubmission.status || refreshed.files.length !== activeSubmission.files.length || refreshed.statusHistory.length !== activeSubmission.statusHistory.length)) {
        setActiveSubmission(refreshed);
      }
    }
  }, [submissions, activeSubmission]);

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
            <span>Permohonan Disetujui</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Disetujui & Dokumen Diterbitkan</span>
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

  // 5-Stage Timeline Tracker
  const timelineStages = [
    { key: 'SUBMITTED', title: 'Permohonan Diterima', desc: 'Pendaftaran berkas online via MALA\'BIRI' },
    { key: 'VERIFYING', title: 'Verifikasi Berkas', desc: 'Pengecekan kelengkapan berkas & persyaratan' },
    { key: 'REVIEW', title: 'Telaah / Pengukuran', desc: 'Proses telaah pimpinan / falakiyah lapangan' },
    { key: 'APPROVED', title: 'Disetujui', desc: 'Berkas disetujui Seksi Bimas Islam' },
    { key: 'COMPLETED', title: 'Dokumen Diterbitkan', desc: 'Surat/SKT/Rekomendasi resmi siap digunakan' }
  ];

  const getStageIndex = (status: ApplicationStatus): number => {
    switch (status) {
      case 'SUBMITTED': return 1;
      case 'VERIFYING': return 2;
      case 'REVIEW': return 3;
      case 'APPROVED': return 4;
      case 'COMPLETED': return 5;
      case 'REVISION_NEEDED': return 2; // stops at verification
      case 'REJECTED': return 2;
      default: return 1;
    }
  };

  const currentStageIndex = activeSubmission ? getStageIndex(activeSubmission.status) : 0;

  const handleSelectReplacementFile = async (fileIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 15) {
      alert(`Ukuran file "${file.name}" (${sizeMB.toFixed(2)} MB) melebihi batas maksimal 15 MB.`);
      return;
    }

    let dataUrl = '';
    try {
      dataUrl = await readFileAsDataURL(file);
    } catch (err) {
      console.warn('Could not read file as dataUrl', err);
    }

    setReplacementFiles(prev => ({
      ...prev,
      [fileIndex]: { file, dataUrl }
    }));
  };

  const handleRemoveReplacementFile = (fileIndex: number) => {
    setReplacementFiles(prev => {
      const copy = { ...prev };
      delete copy[fileIndex];
      return copy;
    });
  };

  const handleAddExtraFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 15) {
      alert(`Ukuran file "${file.name}" (${sizeMB.toFixed(2)} MB) melebihi batas maksimal 15 MB.`);
      return;
    }

    let dataUrl = '';
    try {
      dataUrl = await readFileAsDataURL(file);
    } catch (err) {
      console.warn('Could not read file as dataUrl', err);
    }

    const label = extraDocLabelInput.trim() || `Dokumen Tambahan #${extraFiles.length + 1}`;
    setExtraFiles(prev => [
      ...prev,
      {
        id: `extra_${Date.now()}_${Math.random()}`,
        label,
        file,
        dataUrl
      }
    ]);
    setExtraDocLabelInput('');
    setShowAddExtraDoc(false);
  };

  const handleRemoveExtraFile = (id: string) => {
    setExtraFiles(prev => prev.filter(item => item.id !== id));
  };

  const handleResubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    const totalReplacements = Object.keys(replacementFiles).length;
    const totalExtras = extraFiles.length;

    if (totalReplacements === 0 && totalExtras === 0) {
      alert('Silakan pilih minimal 1 berkas perbaikan baru untuk diunggah.');
      return;
    }

    setIsSubmittingRevision(true);
    setRevisionProgressText('Mempersiapkan pengunggahan perbaikan berkas...');

    try {
      const gasUrl = await getGoogleAppsScriptUrl();
      const updatedFiles: UploadedFileInfo[] = [...activeSubmission.files];

      // 1. Process replacements
      for (const [idxStr, rep] of Object.entries(replacementFiles)) {
        const idx = parseInt(idxStr, 10);
        const originalFile = updatedFiles[idx];
        if (!originalFile) continue;

        setRevisionProgressText(`Menyimpan perbaikan (${rep.file.name})...`);

        let gasViewUrl: string | undefined = undefined;
        let gasDownloadUrl: string | undefined = undefined;
        let gasFileId: string | undefined = undefined;

        if (gasUrl && rep.dataUrl) {
          try {
            const res = await uploadFileToGoogleDriveViaScript(
              gasUrl,
              rep.dataUrl,
              rep.file.name,
              rep.file.type || 'application/pdf',
              activeSubmission.id,
              originalFile.fieldName
            );
            gasFileId = res.fileId;
            gasViewUrl = res.viewUrl;
            gasDownloadUrl = res.downloadUrl;
          } catch (gasErr) {
            console.warn('Google Drive script upload warning:', gasErr);
          }
        }

        let chunkId: string | undefined = undefined;
        let chunkCount: number | undefined = undefined;
        if (rep.dataUrl && rep.dataUrl.length > 10000) {
          try {
            const chkId = `chk_rev_${activeSubmission.id}_${idx}_${Date.now()}`;
            const c = await saveFileInChunks(
              chkId,
              activeSubmission.id,
              rep.file.name,
              rep.file.type || 'application/pdf',
              rep.dataUrl
            );
            chunkId = chkId;
            chunkCount = c;
          } catch (cErr) {
            console.warn('Chunked storage warning:', cErr);
          }
        }

        updatedFiles[idx] = {
          fieldName: originalFile.fieldName,
          label: originalFile.label,
          fileName: rep.file.name,
          fileSize: rep.file.size,
          fileType: rep.file.type || 'application/pdf',
          uploadedAt: new Date().toISOString(),
          dataUrl: rep.dataUrl,
          googleDriveFileId: gasFileId,
          googleDriveViewUrl: gasViewUrl,
          googleDriveDownloadUrl: gasDownloadUrl,
          fileChunkId: chunkId,
          fileChunkCount: chunkCount
        };
      }

      // 2. Process extra files
      for (let i = 0; i < extraFiles.length; i++) {
        const extra = extraFiles[i];
        setRevisionProgressText(`Menyimpan dokumen tambahan (${i + 1}/${extraFiles.length}): ${extra.file.name}...`);

        let gasViewUrl: string | undefined = undefined;
        let gasDownloadUrl: string | undefined = undefined;
        let gasFileId: string | undefined = undefined;

        if (gasUrl && extra.dataUrl) {
          try {
            const res = await uploadFileToGoogleDriveViaScript(
              gasUrl,
              extra.dataUrl,
              extra.file.name,
              extra.file.type || 'application/pdf',
              activeSubmission.id,
              `extra_${i + 1}`
            );
            gasFileId = res.fileId;
            gasViewUrl = res.viewUrl;
            gasDownloadUrl = res.downloadUrl;
          } catch (gasErr) {
            console.warn('Google Drive script upload warning:', gasErr);
          }
        }

        let chunkId: string | undefined = undefined;
        let chunkCount: number | undefined = undefined;
        if (extra.dataUrl && extra.dataUrl.length > 10000) {
          try {
            const chkId = `chk_extra_${activeSubmission.id}_${i}_${Date.now()}`;
            const c = await saveFileInChunks(
              chkId,
              activeSubmission.id,
              extra.file.name,
              extra.file.type || 'application/pdf',
              extra.dataUrl
            );
            chunkId = chkId;
            chunkCount = c;
          } catch (cErr) {
            console.warn('Chunked storage warning:', cErr);
          }
        }

        updatedFiles.push({
          fieldName: `extra_doc_${Date.now()}_${i}`,
          label: extra.label || 'Dokumen Tambahan',
          fileName: extra.file.name,
          fileSize: extra.file.size,
          fileType: extra.file.type || 'application/pdf',
          uploadedAt: new Date().toISOString(),
          dataUrl: extra.dataUrl,
          googleDriveFileId: gasFileId,
          googleDriveViewUrl: gasViewUrl,
          googleDriveDownloadUrl: gasDownloadUrl,
          fileChunkId: chunkId,
          fileChunkCount: chunkCount
        });
      }

      setRevisionProgressText('Menyimpan pembaruan ke basis data sistem MALA\'BIRI...');
      const result = await resubmitSubmissionRevision(
        activeSubmission.id,
        updatedFiles,
        applicantRevisionNote
      );

      if (result) {
        setActiveSubmission(result);
        setReplacementFiles({});
        setExtraFiles([]);
        setRevisionSuccessNotice(
          `Alhamdulillah! Berkas perbaikan berhasil diunggah dengan nomor tiket tetap "${result.id}". Status permohonan kini telah kembali beralih menjadi "Sedang Diverifikasi Petugas".`
        );
      }
    } catch (err: any) {
      console.error('Failed to submit revision:', err);
      alert('Terjadi kendala saat mengirimkan berkas perbaikan. Silakan periksa koneksi internet Anda dan coba lagi.');
    } finally {
      setIsSubmittingRevision(false);
      setRevisionProgressText('');
    }
  };

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

              {activeSubmission.status === 'REVISION_NEEDED' && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('panel-unggah-perbaikan');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer animate-pulse"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Unggah Perbaikan Berkas</span>
                </button>
              )}
            </div>
          </div>

          {/* 5-Stage Visual Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Tahapan Progres Dokumen</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {timelineStages.map((stage, idx) => {
                const stageNumber = idx + 1;
                const isCompleted = currentStageIndex > stageNumber;
                const isCurrent = currentStageIndex === stageNumber;

                return (
                  <div
                    key={stage.key}
                    className={`p-3.5 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/20'
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

          {/* Khusus Hasil Penilaian Evaluasi Laporan e-PAI Penyuluh */}
          {activeSubmission.epaiGrade && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Award className="w-7 h-7 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-emerald-100">
                      Evaluasi Resmi e-PAI
                    </span>
                    <span className="text-xs text-emerald-100">Seksi Bimas Islam Kemenag Kab. Gowa</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-extrabold mt-0.5">
                    Hasil Penilaian Laporan Bulanan Penyuluh Agama Islam
                  </h4>
                  <p className="text-xs text-emerald-100/90">
                    Laporan kinerja bulanan telah diverifikasi dan memperoleh predikat resmi dari verifikator.
                  </p>
                </div>
              </div>

              <div className="bg-white text-slate-900 px-5 py-3 rounded-xl shadow-md border border-emerald-100 flex flex-col items-center sm:items-end flex-shrink-0 self-stretch sm:self-auto text-center sm:text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Predikat Penilaian
                </span>
                <span className={`text-xl font-black ${
                  activeSubmission.epaiGrade === 'Baik Sekali'
                    ? 'text-emerald-700'
                    : activeSubmission.epaiGrade === 'Baik'
                    ? 'text-blue-700'
                    : activeSubmission.epaiGrade === 'Cukup'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}>
                  {activeSubmission.epaiGrade}
                </span>
                <span className="text-amber-500 text-xs tracking-widest font-mono">
                  {activeSubmission.epaiGrade === 'Baik Sekali' ? '★★★★' : activeSubmission.epaiGrade === 'Baik' ? '★★★' : activeSubmission.epaiGrade === 'Cukup' ? '★★' : '★'}
                </span>
              </div>
            </div>
          )}

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

          {/* Sukses Kirim Perbaikan Banner */}
          {revisionSuccessNotice && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-sm space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="text-sm font-bold text-emerald-900">
                    Perbaikan Berkas Berhasil Dikirim!
                  </h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    {revisionSuccessNotice}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/80">
                <button
                  type="button"
                  onClick={() => {
                    const msg = generateRevisionConfirmationWAMessage(activeSubmission, applicantRevisionNote);
                    openWhatsAppChat(APP_INFO.phone, msg);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Kirim Konfirmasi WhatsApp ke Petugas Kemenag</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRevisionSuccessNotice(null)}
                  className="px-3 py-2 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold cursor-pointer"
                >
                  Tutup Pemberitahuan
                </button>
              </div>
            </div>
          )}

          {/* Reassurance Banner jika berkas sudah pernah diperbaiki pemohon & saat ini sedang diverifikasi */}
          {activeSubmission.status === 'VERIFYING' && activeSubmission.statusHistory.some(h => h.officerName === 'Pemohon (Unggah Perbaikan)') && !revisionSuccessNotice && (
            <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-950 flex items-start gap-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-cyan-700 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-900">
                    Perbaikan Berkas Telah Berhasil Diterima
                  </span>
                  <span className="text-[10px] bg-cyan-200 text-cyan-900 px-2 py-0.5 rounded-full font-bold">
                    Tiket Tetap: {activeSubmission.id}
                  </span>
                </div>
                <p className="text-xs text-cyan-800 leading-relaxed">
                  Anda telah memperbarui dokumen permohonan ini tanpa perlu mendaftar permohonan baru. Berkas terbaru saat ini telah tersimpan di sistem MALA'BIRI dan sedang menunggu giliran pemeriksaan ulang oleh Verifikator Seksi Bimas Islam.
                </p>
              </div>
            </div>
          )}

          {/* Panel Unggah Ulang Berkas Perbaikan Khusus Status REVISION_NEEDED */}
          {activeSubmission.status === 'REVISION_NEEDED' && (
            <div id="panel-unggah-perbaikan" className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-rose-50/70 via-amber-50/40 to-white border-2 border-rose-300 shadow-sm space-y-5 animate-in fade-in">
              {/* Panel Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white">
                        Perlu Perbaikan Berkas
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-rose-200">
                        No. Tiket: {activeSubmission.id}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                      Unggah Ulang Berkas yang Memiliki Kekurangan
                    </h4>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Nomor Tiket Tetap Sama (Tanpa Daftar Baru)</span>
                </span>
              </div>

              {/* Notice Info Box */}
              <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block font-bold">Solusi Pengurusan & Petunjuk Perbaikan:</strong>
                  <p className="leading-relaxed text-[11px]">
                    Anda <strong>tidak perlu mendaftarkan permohonan baru</strong>. Cukup ganti atau unggah ulang file dokumen yang ada kekurangannya di bawah ini sesuai catatan verifikator. Setelah Anda mengklik <strong>"Kirim Berkas Perbaikan"</strong>, berkas Anda akan otomatis masuk kembali ke antrean verifikasi petugas dengan nomor tiket <strong>{activeSubmission.id}</strong>.
                  </p>
                </div>
              </div>

              {/* Existing Files Replacement Form */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>1. Pilih Dokumen yang Ingin Diganti / Diperbaiki:</span>
                  <span className="text-[11px] font-normal text-slate-500 lowercase">
                    (tersedia {activeSubmission.files.length} dokumen terlampir)
                  </span>
                </h5>

                <div className="space-y-2.5">
                  {activeSubmission.files.map((file, fIdx) => {
                    const replacement = replacementFiles[fIdx];

                    return (
                      <div
                        key={fIdx}
                        className={`p-3.5 rounded-xl border transition-all text-xs ${
                          replacement
                            ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                              {fIdx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 text-xs truncate">
                                {file.label || 'Dokumen Persyaratan'}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                                File saat ini: {file.fileName} ({(file.fileSize / (1024 * 1024)).toFixed(2)} MB)
                              </p>

                              {replacement && (
                                <div className="mt-2 p-2 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                                  <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                                  <span className="truncate">
                                    <strong>File Pengganti Terpilih:</strong> {replacement.file.name} ({(replacement.file.size / (1024 * 1024)).toFixed(2)} MB)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                            {replacement ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveReplacementFile(fIdx)}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Batal Ganti</span>
                              </button>
                            ) : (
                              <label className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                                <FileUp className="w-3.5 h-3.5" />
                                <span>Pilih File Baru</span>
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => handleSelectReplacementFile(fIdx, e)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dokumen Tambahan Tambahan (Jika verifikator meminta dokumen di luar checklist semula) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. Tambah Dokumen Tambahan (Jika Diminta Petugas):
                  </h5>
                  {!showAddExtraDoc && (
                    <button
                      type="button"
                      onClick={() => setShowAddExtraDoc(true)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Dokumen Baru</span>
                    </button>
                  )}
                </div>

                {showAddExtraDoc && (
                  <div className="p-3.5 rounded-xl bg-white border border-emerald-300 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Tambahkan Lampiran Tambahan:</span>
                      <button
                        type="button"
                        onClick={() => { setShowAddExtraDoc(false); setExtraDocLabelInput(''); }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Nama Dokumen / Keterangan (Contoh: "Surat Keterangan Domisili Tambahan"):
                      </label>
                      <input
                        type="text"
                        value={extraDocLabelInput}
                        onChange={(e) => setExtraDocLabelInput(e.target.value)}
                        placeholder="Tulis nama dokumen tambahan..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <label className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                        <FileUp className="w-3.5 h-3.5" />
                        <span>Pilih File Dokumen</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={handleAddExtraFile}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Extra files list */}
                {extraFiles.length > 0 && (
                  <div className="space-y-2">
                    {extraFiles.map((extra) => (
                      <div
                        key={extra.id}
                        className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-emerald-950 truncate">{extra.label}</p>
                            <p className="text-[11px] text-emerald-800 font-mono truncate">{extra.file.name} ({(extra.file.size / (1024 * 1024)).toFixed(2)} MB)</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraFile(extra.id)}
                          className="p-1 rounded-md text-rose-600 hover:bg-rose-100 cursor-pointer flex-shrink-0"
                          title="Hapus file tambahan ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Applicant Revision Note */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  3. Catatan / Penjelasan Pemohon untuk Verifikator (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={applicantRevisionNote}
                  onChange={(e) => setApplicantRevisionNote(e.target.value)}
                  placeholder="Contoh: Berkas formulir SKT dan KTP telah kami lengkapi dengan tanda tangan basah dan stempel kelurahan..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Submit Revision Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-rose-200">
                <div className="text-[11px] text-slate-500">
                  Total berkas baru siap dikirim: <strong>{Object.keys(replacementFiles).length + extraFiles.length} berkas</strong>
                </div>

                <button
                  type="button"
                  onClick={handleResubmitRevision}
                  disabled={isSubmittingRevision || (Object.keys(replacementFiles).length === 0 && extraFiles.length === 0)}
                  className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmittingRevision ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{revisionProgressText || 'Mengirim berkas perbaikan...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Berkas Perbaikan Sekarang (Tiket Tetap {activeSubmission.id})</span>
                    </>
                  )}
                </button>
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
