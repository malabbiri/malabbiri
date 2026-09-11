import React, { useState, useEffect } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  HeroBanner 
} from './components/HeroBanner';
import { 
  ServiceCatalog 
} from './components/ServiceCatalog';
import { 
  ServiceFormModal 
} from './components/ServiceFormModal';
import { 
  TrackingView 
} from './components/TrackingView';
import { 
  VerificationAdmin 
} from './components/VerificationAdmin';
import { 
  OfficerLoginGate 
} from './components/OfficerLoginGate';
import { 
  StatisticsView 
} from './components/StatisticsView';
import { 
  SatisfactionSurveyView 
} from './components/SatisfactionSurveyModal';
import { 
  ContactFooter 
} from './components/ContactFooter';
import { 
  PrintReceiptModal 
} from './components/PrintReceiptModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  ServiceDefinition, 
  SubmissionRecord, 
  SurveyRecord,
  OfficerSession
} from './types';
import { 
  getStoredSubmissions, 
  getStoredSurveys,
  subscribeToSubmissions,
  subscribeToSurveys
} from './utils/storage';
import { 
  getOfficerSession, 
  clearOfficerSession 
} from './utils/fileHelper';
import { 
  openHotlineWhatsApp 
} from './utils/whatsapp';
import { MessageCircle } from 'lucide-react';
import { APP_INFO } from './data/services';

export default function App() {
  const [activeTab, setActiveTab] = useState<'services' | 'tracking' | 'verification' | 'stats' | 'survey'>('services');
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);

  // Officer Session State (Restricted verification dashboard)
  const [officerSession, setOfficerSession] = useState<OfficerSession | null>(getOfficerSession());

  // Modal states
  const [selectedServiceForForm, setSelectedServiceForForm] = useState<ServiceDefinition | null>(null);
  const [activeReceiptSubmission, setActiveReceiptSubmission] = useState<SubmissionRecord | null>(null);
  const [searchTrackingQuery, setSearchTrackingQuery] = useState<string>('');

  // Toast notice
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadData = () => {
    setSubmissions(getStoredSubmissions());
    setSurveys(getStoredSurveys());
  };

  useEffect(() => {
    // Initial fetch
    loadData();

    // Real-time Cloud Sync across HP, Laptop, and PC
    const unsubscribeSubmissions = subscribeToSubmissions((latestSubmissions) => {
      setSubmissions(latestSubmissions);
    });

    const unsubscribeSurveys = subscribeToSurveys((latestSurveys) => {
      setSurveys(latestSurveys);
    });

    return () => {
      unsubscribeSubmissions();
      unsubscribeSurveys();
    };
  }, []);

  const handleSearchFromHero = (query: string) => {
    setSearchTrackingQuery(query);
    setActiveTab('tracking');
  };

  const handleSubmissionSuccess = (newSub: SubmissionRecord) => {
    loadData();
    showToast(`Permohonan #${newSub.id} berhasil terdaftar di sistem MALA'BIRI!`);
  };

  const handleSurveySubmitted = () => {
    loadData();
    showToast('Terima kasih! Evaluasi survey IKM Anda telah tercatat.');
  };

  const pendingCount = submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'VERIFYING').length;
  const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f4c75] via-[#087f5b] to-[#042831] text-slate-100 flex flex-col selection:bg-emerald-400 selection:text-slate-950 relative bg-islamic-pattern">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 p-4 rounded-2xl glass-modal border-emerald-400/40 text-emerald-200 text-xs font-semibold shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Glass Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingVerificationCount={pendingCount}
        isOfficerLoggedIn={!!officerSession?.isLoggedIn}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'services' && (
          <div>
            <HeroBanner
              onSearchTicket={handleSearchFromHero}
              onOpenServiceCatalog={() => {
                const element = document.getElementById('services-catalog');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              totalSubmissions={submissions.length}
              approvedCount={approvedCount}
              recentSubmissions={submissions.slice(0, 2)}
            />

            <ServiceCatalog
              onSelectService={(service) => setSelectedServiceForForm(service)}
            />
          </div>
        )}

        {activeTab === 'tracking' && (
          <TrackingView
            submissions={submissions}
            initialQuery={searchTrackingQuery}
            onOpenReceipt={(sub) => setActiveReceiptSubmission(sub)}
            onSelectServiceTab={() => setActiveTab('services')}
          />
        )}

        {activeTab === 'verification' && (
          <ErrorBoundary
            fallbackMessage="Terjadi kendala saat memuat dashboard verifikasi petugas. Silakan gunakan tombol Segarkan Sesi untuk memulihkan akun."
            onReset={() => {
              setOfficerSession(getOfficerSession());
              loadData();
            }}
          >
            {!officerSession?.isLoggedIn ? (
              <OfficerLoginGate
                onLoginSuccess={(session) => {
                  setOfficerSession(session);
                  showToast(`Selamat datang, ${session?.officer?.name || 'Petugas'}!`);
                }}
                onBackToServices={() => setActiveTab('services')}
              />
            ) : (
              <VerificationAdmin
                submissions={submissions}
                onRefreshSubmissions={loadData}
                onOpenReceipt={(sub) => setActiveReceiptSubmission(sub)}
                officerSession={officerSession}
                onLogout={() => {
                  clearOfficerSession();
                  setOfficerSession(null);
                  showToast('Sesi petugas telah dikunci & berhasil logout.');
                  setActiveTab('services');
                }}
              />
            )}
          </ErrorBoundary>
        )}

        {activeTab === 'stats' && (
          <StatisticsView
            submissions={submissions}
            surveys={surveys}
          />
        )}

        {activeTab === 'survey' && (
          <SatisfactionSurveyView
            surveys={surveys}
            onSurveySubmitted={handleSurveySubmitted}
          />
        )}
      </main>

      {/* Footer with Office Info & Socials */}
      <ContactFooter />

      {/* Floating WhatsApp Hotline Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => openHotlineWhatsApp()}
          className="p-3.5 sm:px-4 sm:py-3 rounded-full sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 border border-white/20 cursor-pointer"
          title={`Hubungi WhatsApp Bimas Islam: ${APP_INFO.phone}`}
        >
          <MessageCircle className="w-5 h-5 fill-current text-white" />
          <span className="hidden sm:inline">WhatsApp Bimas Islam</span>
        </button>
      </div>

      {/* Service Dynamic Form Modal */}
      {selectedServiceForForm && (
        <ServiceFormModal
          service={selectedServiceForForm}
          onClose={() => setSelectedServiceForForm(null)}
          onSubmissionSuccess={handleSubmissionSuccess}
          onOpenReceipt={(sub) => {
            setSelectedServiceForForm(null);
            setActiveReceiptSubmission(sub);
          }}
        />
      )}

      {/* Official Print Receipt Modal */}
      {activeReceiptSubmission && (
        <PrintReceiptModal
          submission={activeReceiptSubmission}
          onClose={() => setActiveReceiptSubmission(null)}
        />
      )}
    </div>
  );
}
