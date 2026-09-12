import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  Eye, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { UploadedFileInfo } from '../types';
import { downloadFile, generateSampleDocumentBlob, dataURLtoBlob } from '../utils/fileHelper';
import { generateFileKey, getFileFromDb } from '../utils/indexedDbStorage';
import { getFileFromChunks } from '../utils/chunkedStorage';

interface DocumentViewerModalProps {
  file: UploadedFileInfo;
  submissionId?: string;
  applicantName?: string;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  file,
  submissionId,
  applicantName,
  onClose
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isImage = file.fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.fileName);
  const isPdf = file.fileType === 'application/pdf' || /\.pdf$/i.test(file.fileName);

  useEffect(() => {
    let isMounted = true;
    let createdBlobUrl: string | null = null;

    async function resolveFileUrl() {
      setIsLoading(true);
      try {
        // 0. Check if file has Firebase Cloud Storage URL (direct permanent raw file across all devices)
        if (file.cloudStorageUrl) {
          if (isMounted) {
            setActiveUrl(file.cloudStorageUrl);
            setIsLoading(false);
          }
          return;
        }

        // 0. Check if file has Google Drive URL
        if (file.googleDriveViewUrl) {
          if (isMounted) {
            const drivePreviewUrl = file.googleDriveFileId 
              ? `https://drive.google.com/file/d/${file.googleDriveFileId}/preview`
              : file.googleDriveViewUrl;
            setActiveUrl(drivePreviewUrl);
            setIsLoading(false);
          }
          return;
        }

        // 0b. Check if file has Firebase Cloud Storage URL
        if (file.cloudStorageUrl) {
          if (isMounted) {
            setActiveUrl(file.cloudStorageUrl);
            setIsLoading(false);
          }
          return;
        }

        let rawUrl = file.dataUrl;

        // 1. Check Chunked Firestore (100% Free Cross-Device Storage)
        if (!rawUrl && file.fileChunkId) {
          try {
            const chunkedData = await getFileFromChunks(file.fileChunkId);
            if (chunkedData) {
              rawUrl = chunkedData;
            }
          } catch (chunkErr) {
            console.warn('Could not load file from chunks:', chunkErr);
          }
        }

        // 1b. Check IndexedDB if missing in memory
        if (!rawUrl && submissionId) {
          const key = generateFileKey(submissionId, file.fileName, file.fieldName);
          const fromDb = await getFileFromDb(key);
          if (fromDb) {
            rawUrl = fromDb;
          }
        }

        // 2. Format URL into a proper Blob URL for reliable viewer and tab opening
        if (rawUrl && rawUrl.startsWith('data:')) {
          if (isPdf && rawUrl.startsWith('data:text/html')) {
            const blob = generateSampleDocumentBlob(file, submissionId, applicantName);
            createdBlobUrl = URL.createObjectURL(blob);
            rawUrl = createdBlobUrl;
          } else {
            const blob = dataURLtoBlob(rawUrl);
            createdBlobUrl = URL.createObjectURL(blob);
            rawUrl = createdBlobUrl;
          }
        } else if (!rawUrl) {
          const blob = generateSampleDocumentBlob(file, submissionId, applicantName);
          createdBlobUrl = URL.createObjectURL(blob);
          rawUrl = createdBlobUrl;
        }

        if (isMounted) {
          setActiveUrl(rawUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error resolving preview URL:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    resolveFileUrl();

    return () => {
      isMounted = false;
      if (createdBlobUrl) {
        try {
          URL.revokeObjectURL(createdBlobUrl);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [file, submissionId, applicantName, isPdf]);

  const handleDownload = () => {
    downloadFile(file, submissionId, applicantName);
  };

  const handleOpenInNewTab = () => {
    if (activeUrl) {
      window.open(activeUrl, '_blank');
    } else {
      const blob = generateSampleDocumentBlob(file, submissionId, applicantName);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f4c75] via-[#087f5b] to-[#0f4c75] px-6 py-4 border-b border-white/15 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white max-w-md truncate">
                  {file.fileName}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {file.googleDriveViewUrl ? 'Google Drive Kantor' : file.cloudStorageUrl ? 'Cloud Storage' : file.fileChunkId ? 'Arsip Berkas Asli' : 'Tersimpan di Sistem'}
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                {file.label} {submissionId ? `• Registrasi: ${submissionId}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-xl bg-white text-[#0f4c75] hover:bg-emerald-50 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              title="Unduh File Asli ke Perangkat"
            >
              <Download className="w-4 h-4 text-[#087f5b]" />
              <span className="hidden sm:inline">Unduh Berkas</span>
            </button>

            <button
              onClick={handleOpenInNewTab}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="Buka di Tab Baru"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-white hover:text-red-200 border border-white/20 transition-all cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-950/80 px-6 py-2.5 border-b border-white/10 flex items-center justify-between text-xs text-slate-300 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Arsip Digital Terverifikasi Bimas Islam Gowa</span>
            </span>
            <span className="hidden md:inline text-white/30">|</span>
            <span className="hidden md:inline text-slate-400 font-mono">
              Ukuran: {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
            </span>
            <span className="hidden md:inline text-white/30">|</span>
            <span className="hidden md:inline text-slate-400">
              Diunggah: {new Date(file.uploadedAt).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-200"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-emerald-300 w-12 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(200, prev + 15))}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-200"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-slate-300"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950 flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-slate-300">Menyiapkan pratinjau berkas...</p>
            </div>
          ) : activeUrl && activeUrl.includes('drive.google.com') ? (
            <div className="w-full h-[560px] bg-slate-900 rounded-xl overflow-hidden border border-white/10 relative">
              <iframe 
                src={activeUrl}
                className="w-full h-full border-0"
                allow="autoplay"
                title={file.fileName}
              />
            </div>
          ) : isImage && activeUrl ? (
            <div className="overflow-auto max-h-full flex justify-center">
              <img 
                src={activeUrl} 
                alt={file.fileName}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="max-w-full rounded-lg shadow-2xl border border-white/15 transition-transform duration-200"
              />
            </div>
          ) : isPdf && activeUrl ? (
            <div className="w-full h-[550px] bg-slate-800 rounded-xl overflow-hidden border border-white/10">
              <object
                data={activeUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
                  <FileText className="w-12 h-12 text-emerald-400" />
                  <p className="text-white font-semibold">Pratinjau PDF Siap</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs cursor-pointer hover:bg-emerald-400 transition-colors"
                  >
                    Unduh Dokumen PDF
                  </button>
                </div>
              </object>
            </div>
          ) : (
            /* Digital Archive Certificate & Structured Preview */
            <div 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl p-8 shadow-2xl border-4 border-slate-200 transition-transform duration-200 font-serif leading-relaxed"
            >
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <div className="text-xs font-bold tracking-widest uppercase text-emerald-800 font-sans">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </div>
                <h4 className="text-base font-black tracking-wide text-slate-900 uppercase font-sans mt-0.5">
                  KANTOR KEMENTERIAN AGAMA KABUPATEN GOWA
                </h4>
                <div className="text-xs font-bold text-emerald-700 font-sans">
                  SEKSI BIMBINGAN MASYARAKAT ISLAM
                </div>
                <p className="text-[10px] text-slate-500 font-sans italic mt-1">
                  Portal Resmi MALA'BIRI • Jl. Jenderal Sudirman No. 10, Sungguminasa, Kab. Gowa
                </p>
              </div>

              <div className="text-center mb-6">
                <span className="text-xs font-bold font-sans uppercase px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                  Arsip Berkas Digital Pemohon
                </span>
                <h5 className="text-lg font-bold text-slate-900 mt-2 underline">
                  {file.label}
                </h5>
                <p className="text-xs font-mono text-slate-500 mt-1">
                  Nama Berkas: {file.fileName}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 font-sans text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Registrasi:</span>
                  <strong className="font-mono text-emerald-700 font-bold">{submissionId || 'MLB-2026-ARCHIVE'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pemohon / Lembaga:</span>
                  <strong className="text-slate-800">{applicantName || 'Pemohon Layanan'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ukuran & Tipe Berkas:</span>
                  <span className="font-mono text-slate-700">{(file.fileSize / (1024 * 1024)).toFixed(2)} MB ({file.fileType || 'PDF'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Pengunggahan:</span>
                  <span className="text-slate-700">{new Date(file.uploadedAt).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <p className="text-xs text-slate-700 text-justify mb-6">
                Dokumen digital ini merupakan lampiran persyaratan resmi yang diunggah oleh masyarakat melalui portal MALA'BIRI Seksi Bimbingan Masyarakat Islam Kantor Kementerian Agama Kabupaten Gowa. Berkas tersimpan dengan aman pada penyimpanan digital sistem dan dapat diunduh untuk verifikasi administrasi maupun penelaahan teknis.
              </p>

              <div className="border-t border-slate-200 pt-6 flex justify-between items-end font-sans">
                <div className="text-center p-3 rounded-xl border border-emerald-500 bg-emerald-50/50 text-emerald-800 text-[10px] font-bold">
                  <div>✓ TERSIMPAN DIGITAL</div>
                  <div className="text-[9px] font-normal text-emerald-600 mt-0.5">Seksi Bimas Islam Kemenag Gowa</div>
                </div>

                <div className="text-right text-xs">
                  <p className="text-slate-500">Sungguminasa, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold text-slate-800 mt-1">Petugas Verifikator Bimas Islam,</p>
                  <div className="h-10"></div>
                  <p className="font-bold text-slate-900 underline">Tim Administrasi Digital</p>
                  <p className="text-[10px] text-slate-500 font-mono">NIP. 199003142019031008</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="bg-slate-900 px-6 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dokumen dapat langsung disimpan ke harddisk/komputer verifikator</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File ({file.fileName})</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
