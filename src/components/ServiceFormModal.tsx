import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  FileText, 
  Trash2, 
  Send, 
  CheckCircle2, 
  MessageCircle, 
  Printer, 
  ArrowRight,
  Sparkles,
  Info,
  Cloud,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ServiceDefinition, UploadedFileInfo, SubmissionRecord } from '../types';
import { generateSubmissionId, createNewSubmission } from '../utils/storage';
import { generateSubmissionWAMessage, openWhatsAppChat } from '../utils/whatsapp';
import { readFileAsDataURL } from '../utils/fileHelper';
import { uploadRawFileToCloudStorage } from '../utils/cloudStorage';
import { getGoogleAppsScriptUrl, uploadFileToGoogleDriveViaScript } from '../utils/googleAppsScript';
import { saveFileInChunks } from '../utils/chunkedStorage';
import { 
  requestGoogleDriveAccess, 
  getOrCreateDriveFolder, 
  uploadFileToGoogleDrive, 
  getStoredDriveToken 
} from '../utils/googleDrive';

interface ServiceFormModalProps {
  service: ServiceDefinition;
  onClose: () => void;
  onSubmissionSuccess: (submission: SubmissionRecord) => void;
  onOpenReceipt: (submission: SubmissionRecord) => void;
}

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  service,
  onClose,
  onSubmissionSuccess,
  onOpenReceipt
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({
    reportYear: '2026',
    reportMonth: 'September'
  });
  const [checkedRequirements, setCheckedRequirements] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFileInfo[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSubmission, setCompletedSubmission] = useState<SubmissionRecord | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [rawFilesMap, setRawFilesMap] = useState<Record<string, File>>({});

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (formErrors[fieldId]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  const toggleChecklist = (item: string) => {
    setCheckedRequirements(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const handleFileUpload = async (fieldId: string, label: string, maxSizeMB: number, maxFiles: number = 1, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentFiles = uploadedFiles[fieldId] || [];
    const newFilesList: UploadedFileInfo[] = [...currentFiles];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const sizeMB = file.size / (1024 * 1024);

      if (sizeMB > maxSizeMB) {
        alert(`Ukuran file "${file.name}" (${sizeMB.toFixed(2)} MB) melebihi batas maksimal ${maxSizeMB} MB.`);
        continue;
      }

      if (newFilesList.length >= maxFiles) {
        alert(`Maksimal file untuk ${label} adalah ${maxFiles} file.`);
        break;
      }

      let dataUrl: string | undefined = undefined;
      try {
        dataUrl = await readFileAsDataURL(file);
      } catch (err) {
        console.warn('Could not generate dataUrl for file:', err);
      }

      const fileKey = `${fieldId}_${file.name}_${file.size}`;
      setRawFilesMap(prev => ({ ...prev, [fileKey]: file }));

      newFilesList.push({
        fieldName: fieldId,
        label,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        dataUrl
      });
    }

    setUploadedFiles(prev => ({
      ...prev,
      [fieldId]: newFilesList
    }));

    if (formErrors[fieldId]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  const removeFile = (fieldId: string, index: number) => {
    setUploadedFiles(prev => {
      const current = prev[fieldId] || [];
      const fileToRemove = current[index];
      if (fileToRemove) {
        const fileKey = `${fieldId}_${fileToRemove.fileName}_${fileToRemove.fileSize}`;
        setRawFilesMap(rawPrev => {
          const rawCopy = { ...rawPrev };
          delete rawCopy[fileKey];
          return rawCopy;
        });
      }
      const updated = current.filter((_, idx) => idx !== index);
      return { ...prev, [fieldId]: updated };
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate requirements checklist for Service 1
    if (service.requirementsChecklist && service.requirementsChecklist.length > 0) {
      if (checkedRequirements.length < service.requirementsChecklist.length) {
        errors['checklist'] = 'Mohon beri tanda centang pada semua dokumen persyaratan yang tersedia.';
      }
    }

    // Validate fields
    service.fields.forEach(field => {
      if (field.type === 'file') {
        if (field.required && (!uploadedFiles[field.id] || uploadedFiles[field.id].length === 0)) {
          errors[field.id] = `Wajib mengunggah ${field.label}`;
        }
      } else {
        const val = formData[field.id];
        if (field.required && (!val || val.toString().trim() === '')) {
          errors[field.id] = `${field.label} wajib diisi.`;
        }
      }
    });

    // Special validation for Service 8 "Yang lain"
    if (service.id === 8 && formData['reportCategory'] === 'Yang lain: .........') {
      if (!formData['customReportName'] || formData['customReportName'].trim() === '') {
        errors['customReportName'] = 'Tuliskan nama laporan yang dimaksud.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // scroll to top of modal
      return;
    }

    setIsSubmitting(true);
    setUploadProgressText('Mempersiapkan pengiriman berkas...');

    try {
      // Compile all uploaded files into flat list
      const allFiles: UploadedFileInfo[] = [];
      Object.values(uploadedFiles).forEach((fileList: UploadedFileInfo[]) => {
        if (Array.isArray(fileList)) {
          fileList.forEach(f => allFiles.push(f));
        }
      });

      // Generate designated Submission ID first
      const submissionId = generateSubmissionId();

      // Check for office Google Drive Webhook (Google Apps Script - 100% Free)
      const gasUrl = await getGoogleAppsScriptUrl();

      // Store files across multiple resilient zero-cost cloud channels
      if (allFiles.length > 0) {
        for (let i = 0; i < allFiles.length; i++) {
          const fileInfo = allFiles[i];
          const fileKey = `${fileInfo.fieldName}_${fileInfo.fileName}_${fileInfo.fileSize}`;
          const rawFile = rawFilesMap[fileKey];

          let blobToUpload: Blob | null = null;
          if (rawFile) {
            blobToUpload = rawFile;
          } else if (fileInfo.dataUrl) {
            try {
              const res = await fetch(fileInfo.dataUrl);
              blobToUpload = await res.blob();
            } catch (bErr) {
              console.warn('Could not convert dataUrl to blob', bErr);
            }
          }

          // 1. PRIMARY (OPSI 1): Direct to Google Drive via Google Apps Script Webhook (100% Gratis)
          if (gasUrl && fileInfo.dataUrl) {
            setUploadProgressText(`Menyimpan ke Google Drive Kantor (${i + 1}/${allFiles.length}): ${fileInfo.fileName}...`);
            try {
              const gasResult = await uploadFileToGoogleDriveViaScript(
                gasUrl,
                fileInfo.dataUrl,
                fileInfo.fileName,
                fileInfo.fileType,
                submissionId,
                fileInfo.fieldName
              );
              fileInfo.googleDriveFileId = gasResult.fileId;
              fileInfo.googleDriveViewUrl = gasResult.viewUrl;
              fileInfo.googleDriveDownloadUrl = gasResult.downloadUrl;
              console.log(`Uploaded to Google Drive via Apps Script: ${fileInfo.fileName}`);
            } catch (gasErr) {
              console.warn(`Apps Script upload note for ${fileInfo.fileName}:`, gasErr);
            }
          }

          // 2. FALLBACK/BACKUP: Chunked Firestore Storage (100% Gratis di paket Spark)
          if (fileInfo.dataUrl && fileInfo.dataUrl.length > 10000) {
            try {
              setUploadProgressText(`Mengamankan arsip berkas (${i + 1}/${allFiles.length}): ${fileInfo.fileName}...`);
              const chunkId = `chk_${submissionId}_${i}`;
              const count = await saveFileInChunks(
                chunkId,
                submissionId,
                fileInfo.fileName,
                fileInfo.fileType,
                fileInfo.dataUrl
              );
              fileInfo.fileChunkId = chunkId;
              fileInfo.fileChunkCount = count;
            } catch (chunkErr) {
              console.warn(`Chunked storage notice for ${fileInfo.fileName}:`, chunkErr);
            }
          }

          // 3. OPTIONAL: If Firebase Storage is configured without Blaze restriction
          if (blobToUpload && !fileInfo.googleDriveViewUrl) {
            try {
              const cloudUrl = await uploadRawFileToCloudStorage(
                blobToUpload,
                submissionId,
                fileInfo.fileName,
                fileInfo.fieldName
              );
              fileInfo.cloudStorageUrl = cloudUrl;
            } catch (cloudStorageErr) {
              // Non-blocking: will safely use Google Drive or Chunked Firestore
            }
          }
        }
      }

      // 4. Secondary manual Google Drive OAuth (if officer is logged in and authorized)
      if (allFiles.length > 0 && !gasUrl) {
        let driveToken = getStoredDriveToken();

        if (!driveToken) {
          try {
            driveToken = await Promise.race([
              requestGoogleDriveAccess(),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
            ]);
          } catch (authErr: any) {
            console.warn('Google Drive sync skipped:', authErr);
          }
        }

        if (driveToken) {
          try {
            setUploadProgressText('Menyinkronkan salinan ke Google Drive...');
            const folderId = await getOrCreateDriveFolder(driveToken);

            for (let i = 0; i < allFiles.length; i++) {
              const fileInfo = allFiles[i];
              const fileKey = `${fileInfo.fieldName}_${fileInfo.fileName}_${fileInfo.fileSize}`;
              const rawFile = rawFilesMap[fileKey];

              let blobToUpload: Blob | null = null;
              if (rawFile) {
                blobToUpload = rawFile;
              } else if (fileInfo.dataUrl) {
                try {
                  const res = await fetch(fileInfo.dataUrl);
                  blobToUpload = await res.blob();
                } catch (bErr) {
                  // ignore
                }
              }

              if (blobToUpload) {
                try {
                  const driveResult = await uploadFileToGoogleDrive(
                    driveToken,
                    blobToUpload,
                    fileInfo.fileName,
                    folderId
                  );
                  fileInfo.googleDriveFileId = driveResult.fileId;
                  fileInfo.googleDriveViewUrl = driveResult.viewUrl;
                  fileInfo.googleDriveDownloadUrl = driveResult.downloadUrl;
                } catch (uploadErr) {
                  console.warn(`Drive notice for ${fileInfo.fileName}:`, uploadErr);
                }
              }
            }
          } catch (driveErr) {
            console.warn('Drive sync notice:', driveErr);
          }
        }
      }

      setUploadProgressText('Menerbitkan nomor registrasi dan tanda terima...');

      const applicantName = formData['applicantName'] || 'Pemohon';
      const phone = formData['phone'] || '081234567890';
      const address = formData['address'] || (formData['district'] ? `Kecamatan ${formData['district']}` : 'Kabupaten Gowa');
      const institutionName = formData['institutionName'] || (service.id === 8 ? `KUA Kec. ${formData['district']}` : undefined);
      const district = formData['district'];

      const newRecord = createNewSubmission({
        id: submissionId,
        serviceId: service.id,
        serviceTitle: service.title,
        applicantName,
        phone,
        email: formData['email'],
        address,
        institutionName,
        district,
        submittedAt: new Date().toISOString(),
        status: 'SUBMITTED',
        formData,
        files: allFiles,
        checklistConfirmed: checkedRequirements
      });

      setIsSubmitting(false);
      setUploadProgressText('');
      setCompletedSubmission(newRecord);
      onSubmissionSuccess(newRecord);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setIsSubmitting(false);
      setUploadProgressText('');
      alert('Terjadi kesalahan saat memproses permohonan. Silakan coba beberapa saat lagi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl glass-modal rounded-3xl overflow-hidden border border-white/20 shadow-2xl my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950/60 to-cyan-950/60 px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Formulir Permohonan Online</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {service.title}
            </h3>
            <p className="text-xs text-slate-300">
              Seksi Bimbingan Masyarakat Islam Kantor Kementerian Agama Kab. Gowa
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {completedSubmission ? (
            /* SUCCESS VIEW */
            <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-2xl font-extrabold text-white">
                  Permohonan Berhasil Dikirim!
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Berkas Anda telah diterima oleh sistem MALA'BIRI dan segera diverifikasi oleh petugas Bimas Islam Kemenag Kabupaten Gowa.
                </p>
              </div>

              {/* Ticket Card */}
              <div className="glass-panel p-5 rounded-2xl border-emerald-500/30 max-w-md mx-auto text-left space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs text-slate-400">Nomor Registrasi Tiket:</span>
                  <span className="text-base font-mono font-extrabold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {completedSubmission.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Nama Pemohon:</span>
                    <strong className="text-white font-semibold">{completedSubmission.applicantName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">No. HP/WA:</span>
                    <strong className="text-white font-semibold">{completedSubmission.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Status:</span>
                    <span className="inline-block text-[11px] font-bold text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
                      Menunggu Verifikasi
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Kode Verifikasi:</span>
                    <span className="font-mono text-emerald-400 font-bold">{completedSubmission.verificationCode}</span>
                  </div>
                </div>

                {/* Cloud & Files Status */}
                {completedSubmission.files && completedSubmission.files.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <span className="text-[11px] text-slate-400 block font-medium">Berkas yang Diserahkan:</span>
                    <div className="space-y-1">
                      {completedSubmission.files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-white/5">
                          <span className="truncate max-w-[200px] text-slate-300">{file.fileName}</span>
                          {file.googleDriveViewUrl ? (
                            <a 
                              href={file.googleDriveViewUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                            >
                              <Cloud className="w-3 h-3" />
                              <span>Google Drive</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">Tersimpan</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    const msg = generateSubmissionWAMessage(completedSubmission);
                    openWhatsAppChat(completedSubmission.phone, msg);
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Kirim Bukti Registrasi ke WhatsApp</span>
                </button>

                <button
                  onClick={() => onOpenReceipt(completedSubmission)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl glass-panel text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 border-white/20 hover:bg-white/10"
                >
                  <Printer className="w-4 h-4 text-cyan-300" />
                  <span>Cetak Lembar Tanda Terima</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Tutup dan Kembali ke Beranda
                </button>
              </div>
            </div>
          ) : (
            /* FORM INPUT VIEW */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Notice or Regulation Banner */}
              {service.notice && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200 leading-relaxed">
                    {service.notice}
                  </p>
                </div>
              )}

              {service.legalBasis && (
                <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center gap-2.5 text-xs text-cyan-300">
                  <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>Dasar Hukum: <strong>{service.legalBasis}</strong></span>
                </div>
              )}

              {/* PMA 29/2019 Requirements Checklist (Specific to Service 1) */}
              {service.requirementsChecklist && service.requirementsChecklist.length > 0 && (
                <div className="glass-panel p-4 rounded-2xl border-emerald-500/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Dokumen Yang Tersedia (Mohon Dicentang)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (checkedRequirements.length === service.requirementsChecklist?.length) {
                          setCheckedRequirements([]);
                        } else {
                          setCheckedRequirements([...service.requirementsChecklist!]);
                        }
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      {checkedRequirements.length === service.requirementsChecklist?.length ? 'Batal Semua' : 'Centang Semua'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    Sesuai Peraturan Menteri Agama No. 29 Tahun 2019, pastikan Anda telah menyiapkan berkas fisik atau scan berikut:
                  </p>

                  <div className="space-y-2">
                    {service.requirementsChecklist.map((item, idx) => {
                      const isChecked = checkedRequirements.includes(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleChecklist(item)}
                          className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer border transition-all text-xs ${
                            isChecked
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                              : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <span className="leading-snug">{item}</span>
                        </div>
                      );
                    })}
                  </div>

                  {formErrors['checklist'] && (
                    <p className="text-xs text-rose-400 font-medium">{formErrors['checklist']}</p>
                  )}
                </div>
              )}

              {/* Dynamic Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.fields.map(field => {
                  const isFullWidth = field.type === 'textarea' || field.type === 'file';
                  const error = formErrors[field.id];

                  if (field.type === 'file') {
                    const currentFiles = uploadedFiles[field.id] || [];
                    const maxCount = field.maxFiles || 1;
                    const maxSize = field.maxSizeMB || 10;

                    return (
                      <div key={field.id} className="md:col-span-2 space-y-1.5 glass-panel p-4 rounded-2xl border-white/15">
                        <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                          <span>
                            {field.label} {field.required && <span className="text-rose-400">*</span>}
                          </span>
                          <span className="text-[11px] font-normal text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
                            Maks {maxSize} MB {maxCount > 1 ? `(${maxCount} file)` : ''}
                          </span>
                        </label>

                        {field.helperText && (
                          <p className="text-[11px] text-slate-400">{field.helperText}</p>
                        )}

                        {/* File Dropzone */}
                        <div className="relative border-2 border-dashed border-white/20 hover:border-emerald-400/50 rounded-xl p-4 text-center bg-slate-900/40 transition-colors">
                          <input
                            type="file"
                            accept={field.acceptedFormats || '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'}
                            multiple={maxCount > 1}
                            onChange={(e) => handleFileUpload(field.id, field.label, maxSize, maxCount, e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                            <UploadCloud className="w-8 h-8 text-emerald-400" />
                            <p className="text-xs font-semibold text-slate-200">
                              Klik atau seret file ke sini untuk mengunggah
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Format: PDF, Word, Excel, Gambar (JPG, PNG)
                            </p>
                          </div>
                        </div>

                        {/* Uploaded File Badges */}
                        {currentFiles.length > 0 && (
                          <div className="space-y-1.5 pt-2">
                            {currentFiles.map((f, fIdx) => (
                              <div
                                key={fIdx}
                                className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-emerald-500/30 text-xs text-white"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                  <span className="truncate font-medium">{f.fileName}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({(f.fileSize / (1024 * 1024)).toFixed(2)} MB)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(field.id, fIdx)}
                                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {error && (
                          <p className="text-xs text-rose-400 font-medium">{error}</p>
                        )}
                      </div>
                    );
                  }

                  if (field.type === 'select') {
                    return (
                      <div key={field.id} className={isFullWidth ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
                        <label className="text-xs font-semibold text-slate-200">
                          {field.label} {field.required && <span className="text-rose-400">*</span>}
                        </label>
                        <select
                          value={formData[field.id] || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                        >
                          <option value="" className="bg-slate-900 text-slate-400">-- Pilih Opsi --</option>
                          {field.options?.map((opt, optIdx) => (
                            <option key={optIdx} value={opt} className="bg-slate-900 text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                        {field.helperText && <p className="text-[10px] text-slate-400">{field.helperText}</p>}
                        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
                      </div>
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <div key={field.id} className="md:col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-slate-200">
                          {field.label} {field.required && <span className="text-rose-400">*</span>}
                        </label>
                        <textarea
                          rows={3}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white resize-none"
                        />
                        {field.helperText && <p className="text-[10px] text-slate-400">{field.helperText}</p>}
                        {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className={isFullWidth ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
                      <label className="text-xs font-semibold text-slate-200">
                        {field.label} {field.required && <span className="text-rose-400">*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                      />
                      {field.helperText && <p className="text-[10px] text-slate-400">{field.helperText}</p>}
                      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}
                    </div>
                  );
                })}
              </div>

              {/* Bottom WhatsApp Auto-Notify Note */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-200">
                  Setelah submit, Anda akan mendapatkan <strong>Nomor Tiket Registrasi</strong> dan dapat langsung mengirimkan bukti permohonan ke WhatsApp pemohon atau hotline Bimas Islam Gowa.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-white/10">
                {uploadProgressText ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Cloud className="w-4 h-4 animate-bounce text-emerald-400" />
                    <span className="font-medium animate-pulse">{uploadProgressText}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Berkas disinkronkan otomatis ke Cloud / Google Drive</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white glass-panel disabled:opacity-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>{uploadProgressText || 'Memproses Permohonan...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Kirim Permohonan Online</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
