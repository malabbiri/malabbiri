import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut, 
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { UploadedFileInfo } from '../types';
import { downloadFile, dataURLtoBlob } from '../utils/fileHelper';
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
        // 0. Check if file has Firebase Cloud Storage URL (direct permanent raw file)
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
            let drivePreviewUrl = file.googleDriveViewUrl;
            const match = file.googleDriveViewUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || file.googleDriveViewUrl.match(/id=([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              drivePreviewUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
            } else if (file.googleDriveFileId) {
              drivePreviewUrl = `https://drive.google.com/file/d/${file.googleDriveFileId}/preview`;
            }
            setActiveUrl(drivePreviewUrl);
            setIsLoading(false);
          }
          return;
        }

        let rawUrl = file.dataUrl;

        // 1. Check Chunked Firestore
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

        // 2. Check IndexedDB if missing in memory
        if (!rawUrl && submissionId) {
          const key = generateFileKey(submissionId, file.fileName, file.fieldName);
          const fromDb = await getFileFromDb(key);
          if (fromDb) {
            rawUrl = fromDb;
          }
        }

        // 3. Convert dataUrl to native Blob URL for reliable viewer
        if (rawUrl && rawUrl.startsWith('data:')) {
          const blob = dataURLtoBlob(rawUrl);
          createdBlobUrl = URL.createObjectURL(blob);
          rawUrl = createdBlobUrl;
        }

        if (isMounted) {
          setActiveUrl(rawUrl || null);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Error resolving preview URL:', err);
        if (isMounted) {
          setActiveUrl(null);
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
    } else if (file.googleDriveViewUrl) {
      window.open(file.googleDriveViewUrl, '_blank');
    } else if (file.cloudStorageUrl) {
      window.open(file.cloudStorageUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between flex-shrink-0 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white">
              <FileText className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white max-w-md truncate">
                  {file.fileName}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-600 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                  {file.googleDriveViewUrl ? 'Google Drive Kantor' : file.cloudStorageUrl ? 'Cloud Storage' : 'Berkas Pemohon'}
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
              className="px-3.5 py-1.5 rounded-lg bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Unduh File Asli ke Perangkat"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span className="hidden sm:inline">Unduh Berkas</span>
            </button>

            {(activeUrl || file.googleDriveViewUrl || file.cloudStorageUrl) && (
              <button
                onClick={handleOpenInNewTab}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
                title="Buka di Tab Baru"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-100 px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Pemeriksaan Berkas Unggahan Pemohon</span>
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-slate-600 font-mono">
              Ukuran: {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
            </span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-slate-600">
              Diunggah: {new Date(file.uploadedAt).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
              className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-emerald-800 font-bold w-12 text-center">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(200, prev + 15))}
              className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-[10px] text-slate-700 border border-slate-200 font-medium cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50 flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
              <p className="text-sm text-slate-600">Menyiapkan pratinjau berkas...</p>
            </div>
          ) : activeUrl && activeUrl.includes('drive.google.com') ? (
            <div className="w-full h-[560px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs relative">
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
                className="max-w-full rounded-lg shadow-md border border-slate-200 transition-transform duration-200"
              />
            </div>
          ) : isPdf && activeUrl ? (
            <div className="w-full h-[550px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs">
              <object
                data={activeUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3 bg-white">
                  <FileText className="w-12 h-12 text-emerald-700" />
                  <p className="text-slate-800 font-semibold">Pratinjau PDF Siap</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold text-xs cursor-pointer hover:bg-emerald-800 transition-colors"
                  >
                    Unduh Dokumen PDF
                  </button>
                </div>
              </object>
            </div>
          ) : (
            /* Detailed File Metadata & Verification Info */
            <div 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-xl bg-white text-slate-900 rounded-xl p-6 sm:p-8 shadow-sm border border-slate-200 transition-transform duration-200"
            >
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {file.fileName}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Kategori Syarat: <span className="text-emerald-800 font-semibold">{file.label}</span>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nomor Registrasi:</span>
                  <strong className="font-mono text-emerald-800 font-bold">{submissionId || '-'}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Pemohon / Lembaga:</span>
                  <strong className="text-slate-800">{applicantName || 'Pemohon Layanan'}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Ukuran & Format:</span>
                  <span className="font-mono text-slate-700 font-medium">
                    {(file.fileSize / (1024 * 1024)).toFixed(2)} MB • {file.fileType || 'Dokumen'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Waktu Pengunggahan:</span>
                  <span className="text-slate-700 font-medium">{new Date(file.uploadedAt).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Lokasi Penyimpanan:</span>
                  <span className="text-emerald-700 font-semibold">
                    {file.googleDriveViewUrl ? 'Google Drive Kantor' : file.cloudStorageUrl ? 'Firebase Storage' : 'Sistem Unggahan MALA\'BIRI'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-slate-700 space-y-1 mb-5">
                <p className="font-semibold text-emerald-900">Informasi Pemeriksaan Berkas:</p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Berkas ini merupakan berkas fisik asli yang diunggah oleh pemohon melalui formulir layanan MALA'BIRI. Petugas dapat mengunduh berkas langsung ke komputer atau membukanya di Google Drive untuk memeriksa kelengkapan persyaratan.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {file.googleDriveViewUrl && (
                  <a
                    href={file.googleDriveViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka File di Drive</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Berkas Ini</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Dokumen asli dapat langsung disimpan ke harddisk/komputer verifikator</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File ({file.fileName})</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
