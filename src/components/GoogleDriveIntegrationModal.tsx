import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Loader2, 
  HelpCircle,
  FolderCheck,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { 
  getGoogleAppsScriptUrl, 
  saveGoogleAppsScriptUrl, 
  testGoogleAppsScriptConnection, 
  DEFAULT_SCRIPT_TEMPLATE 
} from '../utils/googleAppsScript';

interface GoogleDriveIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  officerName?: string;
}

export const GoogleDriveIntegrationModal: React.FC<GoogleDriveIntegrationModalProps> = ({
  isOpen,
  onClose,
  officerName
}) => {
  const [scriptUrl, setScriptUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getGoogleAppsScriptUrl().then((url) => {
        if (url) {
          setScriptUrl(url);
        }
      });
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(DEFAULT_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!scriptUrl.trim()) {
      setTestResult({ success: false, message: 'Harap masukkan URL Web App terlebih dahulu.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGoogleAppsScriptConnection(scriptUrl.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Gagal menghubungi Webhook.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveGoogleAppsScriptUrl(scriptUrl.trim(), officerName || 'Petugas Bimas Islam');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = !!scriptUrl.trim() && scriptUrl.includes('script.google.com');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between flex-shrink-0 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white">
              <Cloud className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Integrasi Google Drive & Google Sheets Kantor
                <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-600 text-[10px] font-semibold">
                  100% Gratis & Realtime
                </span>
              </h3>
              <p className="text-xs text-emerald-100">
                Penyimpanan berkas ke Google Drive & pencatatan otomatis data pemohon ke Google Sheets Kantor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-800 bg-slate-50">
          {/* Status Alert */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-xs ${
            isConfigured 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold text-sm text-slate-900">
                {isConfigured ? 'Google Drive & Google Sheets Terhubung' : 'Google Drive & Sheets Belum Dikonfigurasi'}
              </div>
              <p className="text-slate-600 leading-relaxed">
                {isConfigured 
                  ? 'Setiap permohonan baru akan otomatis dicatat ke Google Sheets "DATA_PERMOHONAN_MALABIRI_BIMAS_ISLAM_GOWA" dan berkas dokumen tersimpan rapi di Google Drive pada folder "ARSIP_MALABIRI_BIMAS_ISLAM_GOWA".'
                  : 'Ikuti panduan 3 menit di bawah untuk menghubungkan Google Drive & Google Sheets kantor Anda secara gratis (tanpa perlu bayar atau kartu kredit).'}
              </p>
            </div>
          </div>

          {/* Form Input URL */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              URL Web App Google Apps Script
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !scriptUrl.trim()}
                className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                    <span>Menguji...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Uji Koneksi</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <span>Simpan Pengaturan</span>
                )}
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span className="font-medium">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Panduan 3 Langkah */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span>Panduan Pembuatan Webhook (Hanya 3 Menit)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
                  1
                </div>
                <h5 className="font-bold text-xs text-slate-900">Buka Apps Script</h5>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Buka{' '}
                  <a 
                    href="https://script.google.com/home/start" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-emerald-700 font-semibold underline inline-flex items-center gap-0.5"
                  >
                    script.google.com <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  menggunakan akun Google kantor/pribadi Anda. Klik tombol <strong>"Project Baru"</strong> (+).
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
                  2
                </div>
                <h5 className="font-bold text-xs text-slate-900">Tempelkan Skrip</h5>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Hapus semua kode bawaan di editor, lalu klik tombol <strong>"Salin Kode Skrip"</strong> di bawah dan tempelkan ke editor Apps Script. Tekan Simpan (Ctrl+S).
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
                  3
                </div>
                <h5 className="font-bold text-xs text-slate-900">Deploy sebagai Web App</h5>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Klik <strong>Deploy</strong> &gt; <strong>New deployment</strong> (atau <em>Manage deployments &gt; Edit &gt; New version</em> jika update skrip). Atur:
                  <br />• Execute as: <strong>Me</strong>
                  <br />• Who has access: <strong>Anyone</strong>
                  <br />Klik Deploy &amp; salin URL Web App ke kotak di atas!
                </p>
              </div>
            </div>
          </div>

          {/* Kotak Kode Skrip Siap Pakai */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-700">
                Kode Google Apps Script (Code.gs)
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kode Skrip</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono text-slate-800 bg-slate-50 overflow-x-auto max-h-56 scrollbar-thin">
              {DEFAULT_SCRIPT_TEMPLATE}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Gratis 15 GB kuota Google Drive standar tanpa kartu kredit</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
