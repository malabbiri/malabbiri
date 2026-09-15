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
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f4c75] via-[#087f5b] to-[#0f4c75] px-6 py-4.5 border-b border-white/15 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
              <Cloud className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Integrasi Google Drive & Google Sheets Kantor
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-semibold">
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
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
          {/* Status Alert */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
            isConfigured 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold text-sm text-white">
                {isConfigured ? 'Google Drive & Google Sheets Terhubung' : 'Google Drive & Sheets Belum Dikonfigurasi'}
              </div>
              <p className="text-slate-300 leading-relaxed">
                {isConfigured 
                  ? 'Setiap permohonan baru akan otomatis dicatat ke Google Sheets "DATA_PERMOHONAN_MALABIRI_BIMAS_ISLAM_GOWA" dan berkas dokumen tersimpan rapi di Google Drive pada folder "ARSIP_MALABIRI_BIMAS_ISLAM_GOWA".'
                  : 'Ikuti panduan 3 menit di bawah untuk menghubungkan Google Drive & Google Sheets kantor Anda secara gratis (tanpa perlu bayar atau kartu kredit).'}
              </p>
            </div>
          </div>

          {/* Form Input URL */}
          <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
              URL Web App Google Apps Script
            </label>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !scriptUrl.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Menguji...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Uji Koneksi</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
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
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testResult.success ? 'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30' : 'bg-red-900/50 text-red-200 border border-red-500/30'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Panduan 3 Langkah */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Panduan Pembuatan Webhook (Hanya 3 Menit)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-800/60 border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  1
                </div>
                <h5 className="font-bold text-xs text-white">Buka Apps Script</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Buka{' '}
                  <a 
                    href="https://script.google.com/home/start" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-emerald-400 font-semibold underline inline-flex items-center gap-0.5"
                  >
                    script.google.com <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  menggunakan akun Google kantor/pribadi Anda. Klik tombol <strong>"Project Baru"</strong> (+).
                </p>
              </div>

              <div className="bg-slate-800/60 border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  2
                </div>
                <h5 className="font-bold text-xs text-white">Tempelkan Skrip</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Hapus semua kode bawaan di editor, lalu klik tombol <strong>"Salin Kode Skrip"</strong> di bawah dan tempelkan ke editor Apps Script. Tekan Simpan (Ctrl+S).
                </p>
              </div>

              <div className="bg-slate-800/60 border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                  3
                </div>
                <h5 className="font-bold text-xs text-white">Deploy sebagai Web App</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Klik <strong>Deploy</strong> &gt; <strong>New deployment</strong>. Pilih tipe <strong>Web app</strong>. Atur:
                  <br />• Execute as: <strong>Me</strong>
                  <br />• Who has access: <strong>Anyone</strong>
                  <br />Klik Deploy &amp; salin URL-nya ke kotak di atas!
                </p>
              </div>
            </div>
          </div>

          {/* Kotak Kode Skrip Siap Pakai */}
          <div className="bg-slate-950 border border-white/15 rounded-2xl overflow-hidden space-y-0">
            <div className="bg-slate-800/90 px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300">
                Kode Google Apps Script (Code.gs)
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
            <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 scrollbar-thin">
              {DEFAULT_SCRIPT_TEMPLATE}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950/80 px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Gratis 15 GB kuota Google Drive standar tanpa kartu kredit</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
