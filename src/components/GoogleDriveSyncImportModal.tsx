import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  RefreshCw, 
  PlusCircle, 
  ExternalLink, 
  FileText, 
  Calendar, 
  User, 
  Phone, 
  HelpCircle,
  Database
} from 'lucide-react';
import { SubmissionRecord, GOWA_DISTRICTS } from '../types';
import { SERVICES_LIST } from '../data/services';
import { parseCSV, convertRowsToSubmissions } from '../utils/csvImporter';
import { getGoogleAppsScriptUrl, fetchSubmissionsFromGoogleSheetViaScript } from '../utils/googleAppsScript';
import { importOrSyncSubmissions, generateSubmissionId, createNewSubmission, isLooksLikeServiceName } from '../utils/storage';
import { resolveAutoKuaName, cleanAndTidyNotes } from '../utils/notesHelper';

interface GoogleDriveSyncImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const GoogleDriveSyncImportModal: React.FC<GoogleDriveSyncImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'webhook' | 'csv' | 'manual'>('webhook');
  
  // Tab 1: Webhook Auto-Sync state
  const [isSyncingWebhook, setIsSyncingWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{
    success: boolean;
    message: string;
    submissions?: SubmissionRecord[];
    spreadsheetUrl?: string;
  } | null>(null);

  // Tab 2: CSV Upload state
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [parsedFromCsv, setParsedFromCsv] = useState<SubmissionRecord[]>([]);
  const [csvError, setCsvError] = useState<string>('');

  // Tab 3: Manual Intake from Drive
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualServiceId, setManualServiceId] = useState<number>(1);
  const [manualDistrict, setManualDistrict] = useState<string>('Somba Opu');
  const [manualDriveUrl, setManualDriveUrl] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualError, setManualError] = useState('');

  // General processing
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Handler Tab 1: Fetch via Apps Script
  const handleFetchFromAppsScript = async () => {
    setIsSyncingWebhook(true);
    setWebhookResult(null);

    const scriptUrl = await getGoogleAppsScriptUrl();
    if (!scriptUrl) {
      setIsSyncingWebhook(false);
      setWebhookResult({
        success: false,
        message: 'URL Webhook Google Apps Script belum dikonfigurasi. Anda juga dapat menggunakan opsi Tab "Unggah CSV Google Form" di samping jika belum memasang webhook.'
      });
      return;
    }

    try {
      const res = await fetchSubmissionsFromGoogleSheetViaScript(scriptUrl);
      if (res.success && res.data) {
        // Convert sheet data rows into SubmissionRecord
        const formatted: SubmissionRecord[] = res.data.map((item: any, idx: number) => {
          const files = [];
          if (item.fileUrls) {
            const urls = (item.fileUrls || '').match(/https?:\/\/[^\s,;"'<>]+/g) || [];
            urls.forEach((u: string, uIdx: number) => {
              files.push({
                fieldName: `berkas_${uIdx + 1}`,
                label: `Berkas Pengajuan Google Drive ${uIdx + 1}`,
                fileName: `Dokumen_Drive_${uIdx + 1}.pdf`,
                fileSize: 1024 * 1024,
                fileType: 'application/pdf',
                uploadedAt: item.submittedAt || new Date().toISOString(),
                googleDriveViewUrl: u
              });
            });
          }

          const serviceObj = SERVICES_LIST.find(s => s.title.toLowerCase() === (item.serviceTitle || '').toLowerCase()) || SERVICES_LIST[0];

          return {
            id: item.id && item.id.length >= 6 ? item.id : generateSubmissionId(),
            verificationCode: `VRF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            serviceId: serviceObj.id,
            serviceTitle: item.serviceTitle || serviceObj.title,
            applicantName: (item.applicantName && !isLooksLikeServiceName(item.applicantName, item.serviceTitle) && item.applicantName !== 'Pemohon Layanan')
              ? item.applicantName
              : '-',
            phone: item.phone && item.phone !== '-' ? item.phone : '-',
            email: item.email || undefined,
            district: item.district || undefined,
            address: item.address || (item.district ? `Kecamatan ${item.district}` : 'Kabupaten Gowa'),
            institutionName: resolveAutoKuaName(item.district, item.institutionName) !== '-' ? resolveAutoKuaName(item.district, item.institutionName) : undefined,
            status: item.status || 'SUBMITTED',
            submittedAt: item.submittedAt || new Date().toISOString(),
            files,
            formData: {
              applicantName: (item.applicantName && !isLooksLikeServiceName(item.applicantName, item.serviceTitle) && item.applicantName !== 'Pemohon Layanan') ? item.applicantName : undefined,
              phone: item.phone && item.phone !== '-' ? item.phone : undefined,
              district: item.district,
              address: item.address,
              institutionName: resolveAutoKuaName(item.district, item.institutionName) !== '-' ? resolveAutoKuaName(item.district, item.institutionName) : undefined,
              serviceTitle: item.serviceTitle || serviceObj.title,
              notes: cleanAndTidyNotes(item.notes) || undefined,
              source: 'Google Apps Script Webhook Sync'
            },
            checklistConfirmed: [],
            officerNotes: '',
            statusHistory: [
              {
                status: item.status || 'SUBMITTED',
                timestamp: item.submittedAt || new Date().toISOString(),
                note: 'Disinkronkan otomatis dari Google Sheets / Google Drive Kantor',
                officerName: 'Sinkronisasi Otomatis Google Drive'
              }
            ]
          };
        });

        setWebhookResult({
          success: true,
          message: `Berhasil menemukan ${formatted.length} data permohonan dari Google Sheets kantor!`,
          submissions: formatted,
          spreadsheetUrl: res.spreadsheetUrl
        });
      } else {
        setWebhookResult({
          success: false,
          message: res.message || 'Gagal mengambil data dari Google Sheets. Anda dapat menggunakan Tab "Unggah CSV Google Form" sebagai solusi instan.'
        });
      }
    } catch (err: any) {
      setWebhookResult({
        success: false,
        message: err.message || 'Gagal menghubungi Webhook Google Apps Script.'
      });
    } finally {
      setIsSyncingWebhook(false);
    }
  };

  const handleCommitWebhookSubmissions = async () => {
    if (!webhookResult?.submissions || webhookResult.submissions.length === 0) return;
    setIsSaving(true);
    try {
      const res = await importOrSyncSubmissions(webhookResult.submissions);
      setIsSaving(false);
      onSuccess(res.added + res.updated);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      alert('Gagal menyimpan permohonan: ' + err.message);
    }
  };

  // Handler Tab 2: Upload CSV
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvError('');
    setIsProcessingCsv(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setCsvError('Berkas kosong.');
          setIsProcessingCsv(false);
          return;
        }

        const rows = parseCSV(text);
        if (rows.length < 2) {
          setCsvError('File CSV tidak memiliki baris data atau format kolom tidak sesuai.');
          setIsProcessingCsv(false);
          return;
        }

        const { records, skippedCount } = convertRowsToSubmissions(rows);
        if (records.length === 0) {
          setCsvError('Tidak ada data permohonan yang berhasil dipetakan dari file CSV tersebut.');
          setIsProcessingCsv(false);
          return;
        }

        setParsedFromCsv(records);
        setIsProcessingCsv(false);
      } catch (err: any) {
        setCsvError('Gagal memproses file CSV: ' + err.message);
        setIsProcessingCsv(false);
      }
    };

    reader.onerror = () => {
      setCsvError('Gagal membaca file dari komputer.');
      setIsProcessingCsv(false);
    };

    reader.readAsText(file);
  };

  const handleCommitCsvSubmissions = async () => {
    if (parsedFromCsv.length === 0) return;
    setIsSaving(true);
    try {
      const res = await importOrSyncSubmissions(parsedFromCsv);
      setIsSaving(false);
      onSuccess(res.added + res.updated);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      alert('Gagal mengimpor permohonan: ' + err.message);
    }
  };

  // Handler Tab 3: Manual Intake
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');

    if (!manualName.trim()) {
      setManualError('Nama pemohon wajib diisi.');
      return;
    }
    if (!manualPhone.trim() || manualPhone.trim().length < 8) {
      setManualError('Nomor WhatsApp / HP wajib diisi minimal 8 digit.');
      return;
    }

    const serviceDef = SERVICES_LIST.find(s => s.id === manualServiceId) || SERVICES_LIST[0];
    const newId = generateSubmissionId();
    const now = new Date().toISOString();

    const files = [];
    if (manualDriveUrl.trim()) {
      files.push({
        fieldName: 'berkas_drive',
        label: 'Berkas Permohonan Google Drive',
        fileName: 'Berkas_Pengajuan_Google_Drive.pdf',
        fileSize: 1024 * 1024,
        fileType: 'application/pdf',
        uploadedAt: now,
        googleDriveViewUrl: manualDriveUrl.trim()
      });
    }

    setIsSaving(true);
    try {
      createNewSubmission({
        id: newId,
        serviceId: serviceDef.id,
        serviceTitle: serviceDef.title,
        applicantName: manualName.trim(),
        phone: manualPhone.trim(),
        district: manualDistrict,
        address: `Kecamatan ${manualDistrict}, Kabupaten Gowa`,
        status: 'SUBMITTED',
        submittedAt: now,
        files,
        formData: {
          applicantName: manualName.trim(),
          phone: manualPhone.trim(),
          district: manualDistrict,
          address: `Kecamatan ${manualDistrict}, Kabupaten Gowa`,
          serviceTitle: serviceDef.title,
          googleDriveUrl: manualDriveUrl.trim(),
          source: 'Input Manual dari Google Drive oleh Petugas'
        },
        checklistConfirmed: [],
        officerNotes: ''
      });

      setIsSaving(false);
      onSuccess(1);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      setManualError('Gagal menyimpan: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-800 px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
              <Database className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Solusi Sinkronisasi & Impor Berkas Google Drive ke Panel Verifikasi
              </h3>
              <p className="text-xs text-emerald-100">
                Tarik pengajuan dan berkas yang tersimpan di Google Drive / Google Sheets sejak Oktober ke tabel verifikasi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Explanation Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3.5 flex items-start gap-3 text-amber-900 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-950">
              Penyebab Masalah & Solusi Tersedia:
            </span>
            <p className="text-amber-800 leading-relaxed">
              Berkas tersimpan di Google Drive / Sheets namun belum muncul di Panel Verifikasi biasanya terjadi karena: 
              <strong> (1)</strong> Pengajuan masuk melalui Google Form kantor terpisah, 
              <strong> (2)</strong> Webhook Drive bersifat pengiriman satu arah (belum ditarik masuk), atau 
              <strong> (3)</strong> Penulisan database cloud sempat mengalami kendala izin. 
              Gunakan salah satu dari <strong>3 solusi praktis</strong> di bawah ini untuk menampilkan seluruh data secara otomatis:
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 pt-3 gap-2 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveTab('webhook')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer flex items-center gap-2 ${
              activeTab === 'webhook'
                ? 'bg-white border-slate-200 text-emerald-800 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-700" />
            <span>1. Tarik Otomatis via Webhook (1-Klik)</span>
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer flex items-center gap-2 ${
              activeTab === 'csv'
                ? 'bg-white border-slate-200 text-emerald-800 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>2. Unggah CSV / Respon Google Form</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-t border-x cursor-pointer flex items-center gap-2 ${
              activeTab === 'manual'
                ? 'bg-white border-slate-200 text-emerald-800 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-purple-600" />
            <span>3. Input Cepat dari Berkas Drive</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 bg-slate-50">
          {/* TAB 1: WEBHOOK AUTO-SYNC */}
          {activeTab === 'webhook' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-emerald-700" />
                      <span>Sinkronisasi Data Google Sheet Kantor ke Sistem MALA'BIRI</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sistem akan membaca baris permohonan pada Google Sheet Anda, mendeteksi berkas Google Drive, dan menambahkannya ke Panel Verifikasi.
                    </p>
                  </div>

                  <button
                    onClick={handleFetchFromAppsScript}
                    disabled={isSyncingWebhook}
                    className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingWebhook ? 'animate-spin' : ''}`} />
                    <span>{isSyncingWebhook ? 'Membaca Google Sheet...' : 'Tarik Data dari Google Sheet'}</span>
                  </button>
                </div>

                {webhookResult && (
                  <div className={`p-4 rounded-xl border text-xs space-y-3 ${
                    webhookResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      {webhookResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <strong className="block text-sm font-bold">{webhookResult.message}</strong>
                        {webhookResult.spreadsheetUrl && (
                          <a 
                            href={webhookResult.spreadsheetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-800 underline font-semibold text-[11px]"
                          >
                            Buka File Google Sheet Sumber <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {webhookResult.success && webhookResult.submissions && webhookResult.submissions.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200 space-y-3">
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                          {webhookResult.submissions.map((sub, i) => (
                            <div key={i} className="bg-white p-3 rounded-lg border border-emerald-100 flex items-center justify-between shadow-2xs">
                              <div>
                                <span className="font-mono text-[10px] text-emerald-700 font-bold block">{sub.id}</span>
                                <strong className="text-slate-900 text-xs block">{sub.applicantName}</strong>
                                <span className="text-[11px] text-slate-500">{sub.serviceTitle} • {sub.phone}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">
                                  {new Date(sub.submittedAt).toLocaleDateString('id-ID')}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  {sub.files?.length || 0} Berkas Drive
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={handleCommitWebhookSubmissions}
                          disabled={isSaving}
                          className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isSaving ? 'Menyimpan ke Panel Verifikasi...' : `Simpan ${webhookResult.submissions.length} Permohonan Ini ke Panel Verifikasi`}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CSV / GOOGLE FORM EXPORT */}
          {activeTab === 'csv' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span>Impor Berkas CSV Hasil Ekspor Google Spreadsheet / Google Form</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    Solusi tercepat jika Anda mengumpulkan permohonan menggunakan Google Form atau memiliki Google Sheet sendiri sejak bulan Oktober.
                  </p>
                </div>

                {/* Steps guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-950 space-y-2">
                  <span className="font-bold flex items-center gap-1.5 text-blue-900">
                    <HelpCircle className="w-4 h-4 text-blue-700" />
                    3 Langkah Mudah Mengambil File CSV dari Google Drive:
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1 leading-relaxed">
                    <li>Buka file <strong>Google Sheet</strong> respon formulir pengajuan bulan Oktober di browser Anda.</li>
                    <li>Klik menu <strong>File</strong> &gt; <strong>Download (Unduh)</strong> &gt; pilih <strong>Comma-separated values (.csv)</strong>.</li>
                    <li>Pilih atau seret (drag-and-drop) file <code>.csv</code> tersebut ke kotak di bawah ini. Sistem otomatis mendeteksi nama, nomor HP, jenis layanan, dan tautan Google Drive pemohon!</li>
                  </ol>
                </div>

                {/* Upload box */}
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-6 text-center bg-slate-50 hover:bg-emerald-50/30 transition-colors">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFileUpload}
                    id="csv-file-input"
                    className="hidden"
                  />
                  <label htmlFor="csv-file-input" className="cursor-pointer block space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {csvFileName ? `File Terpilih: ${csvFileName}` : 'Klik untuk Memilih File CSV Google Sheet'}
                      </span>
                      <span className="text-[11px] text-slate-500">Mendukung file CSV standar dari Google Drive atau Microsoft Excel</span>
                    </div>
                  </label>
                </div>

                {csvError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{csvError}</span>
                  </div>
                )}

                {parsedFromCsv.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        Terdeteksi {parsedFromCsv.length} Permohonan Siap Diimpor:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Otomatis membuat nomor tiket resmi MALA'BIRI
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                      {parsedFromCsv.map((sub, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono text-[10px] text-slate-500 block">{sub.id}</span>
                            <strong className="text-slate-900">{sub.applicantName}</strong>
                            <p className="text-[11px] text-slate-500">{sub.serviceTitle} • Telp: {sub.phone}</p>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {sub.files?.length || 0} Link Berkas
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {new Date(sub.submittedAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleCommitCsvSubmissions}
                      disabled={isSaving}
                      className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSaving ? 'Menyimpan ke Panel Verifikasi...' : `Impor ${parsedFromCsv.length} Permohonan ke Panel Verifikasi`}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL INTAKE FROM DRIVE */}
          {activeTab === 'manual' && (
            <div className="space-y-5 animate-in fade-in">
              <form onSubmit={handleManualSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-purple-600" />
                    <span>Daftarkan Pengajuan Langsung dari Berkas Google Drive</span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    Jika ada pemohon yang mengirimkan berkas lewat Google Drive / WhatsApp sejak Oktober dan belum memiliki nomor tiket, daftarkan di sini agar masuk ke tabel verifikasi.
                  </p>
                </div>

                {manualError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{manualError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-800">Nama Lengkap Pemohon / Pemegang Berkas *</label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Contoh: H. Abd. Rasyid, S.Ag"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-800">Nomor WhatsApp / HP Pemohon *</label>
                    <input
                      type="tel"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-800">Jenis Layanan yang Diajukan *</label>
                    <select
                      value={manualServiceId}
                      onChange={(e) => setManualServiceId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                    >
                      {SERVICES_LIST.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.id}. {srv.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-800">Kecamatan Asal (Kabupaten Gowa)</label>
                    <select
                      value={manualDistrict}
                      onChange={(e) => setManualDistrict(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                    >
                      {GOWA_DISTRICTS.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-slate-800">Tautan Berkas / Folder Google Drive Pemohon</label>
                    <input
                      type="url"
                      value={manualDriveUrl}
                      onChange={(e) => setManualDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/... atau https://drive.google.com/file/d/..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                    />
                    <span className="text-[11px] text-slate-500">
                      Tempelkan URL file berkas atau link folder Drive tempat berkas pemohon disimpan
                    </span>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-slate-800">Catatan Khusus Pengajuan</label>
                    <textarea
                      rows={2}
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="Contoh: Berkas pengajuan masuk bulan Oktober 2026 melalui Google Form..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isSaving ? 'Menerbitkan Nomor Registrasi...' : 'Terbitkan Tiket & Masukkan ke Panel Verifikasi'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-shrink-0">
          <span>Sistem Pelayanan MALA'BIRI • Seksi Bimas Islam Kemenag Gowa</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
