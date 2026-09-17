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
import { getGoogleAppsScriptUrl, uploadFileToGoogleDriveViaScript, sendSubmissionToGoogleSheetViaScript } from '../utils/googleAppsScript';
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

      // 5. AUTO-SYNC: Kirim data identitas pemohon ke Google Sheets Kantor (jika Webhook dikonfigurasi)
      if (gasUrl) {
        setUploadProgressText('Merekam data pemohon ke Google Sheets Kantor...');
        const driveLinks = allFiles
          .filter(f => f.googleDriveViewUrl)
          .map(f => `${f.fileName}: ${f.googleDriveViewUrl}`);

        try {
          await sendSubmissionToGoogleSheetViaScript(gasUrl, {
            id: submissionId,
            serviceTitle: service.title,
            applicantName,
            phone,
            email: formData['email'],
            district,
            address,
            institutionName,
            status: 'SUBMITTED',
            submittedAt: new Date().toISOString(),
            filesCount: allFiles.length,
            fileUrls: driveLinks,
            formData
          });
        } catch (sheetErr) {
          console.warn('Google Sheet auto-record notice:', sheetErr);
        }
      }

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
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xl my-6">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-800 text-emerald-100">
              <Sparkles className="w-3 h-3 text-emerald-300" />
              <span>Formulir Permohonan Online</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
              {service.title}
            </h3>
            <p className="text-[11px] text-emerald-100">
              Seksi Bimbingan Masyarakat Islam Kantor Kementerian Agama Kab. Gowa
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 bg-slate-50">
          {completedSubmission ? (
            /* SUCCESS VIEW */
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-xl font-bold text-slate-900">
                  Permohonan Berhasil Dikirim!
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Berkas Anda telah diterima oleh sistem MALA'BIRI dan segera diverifikasi oleh petugas Bimas Islam Kemenag Kabupaten Gowa.
                </p>
              </div>

              {/* Ticket Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm max-w-md mx-auto text-left space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Nomor Registrasi Tiket:</span>
                  <span className="text-sm font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    {completedSubmission.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Nama Pemohon:</span>
                    <strong className="text-slate-800 font-semibold">{completedSubmission.applicantName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">No. HP/WA:</span>
                    <strong className="text-slate-800 font-semibold">{completedSubmission.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status:</span>
                    <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Menunggu Verifikasi
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kode Verifikasi:</span>
                    <span className="font-mono text-emerald-700 font-bold">{completedSubmission.verificationCode}</span>
                  </div>
                </div>

                {/* Cloud & Files Status */}
                {completedSubmission.files && completedSubmission.files.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[11px] text-slate-500 block font-medium">Berkas yang Diserahkan:</span>
                    <div className="space-y-1">
                      {completedSubmission.files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="truncate max-w-[200px] text-slate-700">{file.fileName}</span>
                          {file.googleDriveViewUrl ? (
                            <a 
                              href={file.googleDriveViewUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[11px] text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold"
                            >
                              <Cloud className="w-3 h-3" />
                              <span>Google Drive</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-500">Tersimpan</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={() => {
                    const msg = generateSubmissionWAMessage(completedSubmission);
                    openWhatsAppChat(completedSubmission.phone, msg);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Kirim Bukti Registrasi ke WhatsApp</span>
                </button>

                <button
                  onClick={() => onOpenReceipt(completedSubmission)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-200 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Cetak Lembar Tanda Terima</span>
                </button>
              </div>

              <div className="pt-1">
                <button
                  onClick={onClose}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Tutup dan Kembali ke Beranda
                </button>
              </div>
            </div>
          ) : (
            /* FORM INPUT VIEW */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Notice or Regulation Banner */}
              {service.notice && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {service.notice}
                  </p>
                </div>
              )}

              {service.legalBasis && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                  <Info className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>Dasar Hukum: <strong>{service.legalBasis}</strong></span>
                </div>
              )}

              {/* PMA 29/2019 Requirements Checklist (Specific to Service 1) */}
              {service.requirementsChecklist && service.requirementsChecklist.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
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
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                    >
                      {checkedRequirements.length === service.requirementsChecklist?.length ? 'Batal Semua' : 'Centang Semua'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Sesuai Peraturan Menteri Agama No. 29 Tahun 2019, pastikan Anda telah menyiapkan berkas fisik atau scan berikut:
                  </p>

                  <div className="space-y-1.5">
                    {service.requirementsChecklist.map((item, idx) => {
                      const isChecked = checkedRequirements.includes(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleChecklist(item)}
                          className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer border transition-colors text-xs ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <span className="leading-snug">{item}</span>
                        </div>
                      );
                    })}
                  </div>

                  {formErrors['checklist'] && (
                    <p className="text-xs text-rose-600 font-medium">{formErrors['checklist']}</p>
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
                      <div key={field.id} className="md:col-span-2 space-y-1.5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span>
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </span>
                          <span className="text-[11px] font-normal text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Maks {maxSize} MB {maxCount > 1 ? `(${maxCount} file)` : ''}
                          </span>
                        </label>

                        {field.helperText && (
                          <p className="text-[11px] text-slate-500">{field.helperText}</p>
                        )}

                        {/* File Dropzone */}
                        <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-lg p-4 text-center bg-slate-50 transition-colors">
                          <input
                            type="file"
                            accept={field.acceptedFormats || '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'}
                            multiple={maxCount > 1}
                            onChange={(e) => handleFileUpload(field.id, field.label, maxSize, maxCount, e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center space-y-1 pointer-events-none">
                            <UploadCloud className="w-7 h-7 text-emerald-700" />
                            <p className="text-xs font-semibold text-slate-800">
                              Klik atau seret file ke sini untuk mengunggah
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Format: PDF, Word, Excel, Gambar (JPG, PNG)
                            </p>
                          </div>
                        </div>

                        {/* Uploaded File Badges */}
                        {currentFiles.length > 0 && (
                          <div className="space-y-1.5 pt-1.5">
                            {currentFiles.map((f, fIdx) => (
                              <div
                                key={fIdx}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                                  <span className="truncate font-medium">{f.fileName}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    ({(f.fileSize / (1024 * 1024)).toFixed(2)} MB)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(field.id, fIdx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {error && (
                          <p className="text-xs text-rose-600 font-medium">{error}</p>
                        )}
                      </div>
                    );
                  }

                  if (field.type === 'select') {
                    return (
                      <div key={field.id} className={isFullWidth ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
                        <label className="text-xs font-semibold text-slate-800">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <select
                          value={formData[field.id] || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        >
                          <option value="" className="text-slate-400">-- Pilih Opsi --</option>
                          {field.options?.map((opt, optIdx) => (
                            <option key={optIdx} value={opt} className="text-slate-800">
                              {opt}
                            </option>
                          ))}
                        </select>
                        {field.helperText && <p className="text-[10px] text-slate-500">{field.helperText}</p>}
                        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                      </div>
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <div key={field.id} className="md:col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-slate-800">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <textarea
                          rows={3}
                          value={formData[field.id] || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                        />
                        {field.helperText && <p className="text-[10px] text-slate-500">{field.helperText}</p>}
                        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className={isFullWidth ? 'md:col-span-2 space-y-1' : 'space-y-1'}>
                      <label className="text-xs font-semibold text-slate-800">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      {field.helperText && <p className="text-[10px] text-slate-500">{field.helperText}</p>}
                      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                    </div>
                  );
                })}
              </div>

              {/* Bottom WhatsApp Auto-Notify Note */}
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                <p className="text-xs text-emerald-800">
                  Setelah submit, Anda akan mendapatkan <strong>Nomor Tiket Registrasi</strong> dan dapat langsung mengirimkan bukti permohonan ke WhatsApp pemohon atau hotline Bimas Islam Gowa.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
                {uploadProgressText ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <Cloud className="w-4 h-4 animate-bounce text-emerald-700" />
                    <span className="font-medium animate-pulse">{uploadProgressText}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-slate-500" />
                    <span>Berkas disinkronkan otomatis ke Cloud / Google Drive</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 disabled:opacity-50 cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>{uploadProgressText || 'Memproses Permohonan...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
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
