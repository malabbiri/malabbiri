import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (installed)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Check if dismissed previously in current session
    const dismissed = sessionStorage.getItem('malabbiri_pwa_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    // Check if device is iOS (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSInstructions(true);
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('malabbiri_pwa_dismissed', 'true');
  };

  if (isStandalone || isDismissed) {
    if (justInstalled) {
      return (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 p-3.5 bg-emerald-800 text-white rounded-xl shadow-xl flex items-center gap-3 border border-emerald-600 animate-in slide-in-from-bottom duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" />
          <span className="text-xs font-semibold">Aplikasi MALA'BIRI berhasil dipasang di layar utama HP Anda!</span>
        </div>
      );
    }
    return null;
  }

  // If prompt is available or iOS device
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      {/* Sleek Floating Install Banner */}
      <aside 
        aria-label="Pemasangan Aplikasi MALA'BIRI" 
        className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-white border border-emerald-300 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-900 p-1 flex-shrink-0 flex items-center justify-center shadow-sm">
            <img 
              src="/pwa-192x192.png" 
              alt="MALA'BIRI Logo" 
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                // fallback to smartphone icon
                e.currentTarget.style.display = 'none';
              }}
            />
            <Smartphone className="w-6 h-6 text-white hidden" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Pasang MALA'BIRI di HP
              </h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-0.5 line-clamp-2">
              Akses cepat panel permohonan langsung dari layar utama HP Anda, ringan dan tanpa unduh Play Store.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span>Pasang di Layar Utama HP</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* iOS Safari Instruction Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Cara Pasang di iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSInstructions(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="space-y-3 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                <span>Buka aplikasi ini di browser <strong>Safari</strong> iPhone.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  Ketuk tombol <strong>Bagikan (Share)</strong> <Share2 className="w-3.5 h-3.5 inline text-blue-600" /> di bagian bawah layar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                <span className="inline-flex items-center gap-1 flex-wrap">
                  Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-700" />.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
