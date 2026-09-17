import React, { useState, useEffect } from 'react';
import { 
  FileSearch, 
  ShieldCheck, 
  BarChart3, 
  Star, 
  Menu, 
  X, 
  MessageCircle, 
  Clock, 
  Building,
  LayoutGrid,
  Lock
} from 'lucide-react';
import { APP_INFO } from '../data/services';
import { checkOfficeOpenStatus } from '../utils/date';
import { openHotlineWhatsApp } from '../utils/whatsapp';

interface NavbarProps {
  activeTab: 'services' | 'tracking' | 'verification' | 'stats' | 'survey';
  setActiveTab: (tab: 'services' | 'tracking' | 'verification' | 'stats' | 'survey') => void;
  pendingVerificationCount: number;
  isOfficerLoggedIn?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingVerificationCount,
  isOfficerLoggedIn = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [officeStatus, setOfficeStatus] = useState(checkOfficeOpenStatus());

  useEffect(() => {
    const timer = setInterval(() => {
      setOfficeStatus(checkOfficeOpenStatus());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const navItems: Array<{
    id: 'services' | 'tracking' | 'stats' | 'survey';
    label: string;
    icon: any;
    badge?: number;
  }> = [
    { id: 'services', label: 'Layanan Online', icon: LayoutGrid },
    { id: 'tracking', label: 'Lacak Dokumen', icon: FileSearch },
    { id: 'stats', label: 'Statistik', icon: BarChart3 },
    { id: 'survey', label: 'Survey IKM', icon: Star }
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-emerald-800 text-white shadow-sm border-b border-emerald-900">
      {/* Top Banner Notice */}
      <div className="bg-emerald-900/90 py-1.5 px-4 text-xs text-emerald-100 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-800 text-emerald-200 border border-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse mr-1.5"></span>
              {officeStatus.message}
            </span>
            <span className="hidden md:inline text-emerald-600">|</span>
            <span className="hidden md:inline text-emerald-200 text-[11px]">
              Jam Layanan: Sen-Kam 07.30 - 16.00 WITA, Jum 07.30 - 16.30 WITA
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-emerald-200 text-[11px] hidden sm:inline flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-emerald-300 inline mr-1" />
              Sungguminasa, Kab. Gowa
            </span>
            <button
              onClick={() => openHotlineWhatsApp()}
              className="inline-flex items-center gap-1.5 text-emerald-100 hover:text-white transition-colors font-semibold text-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
              <span>Hotline: <strong className="text-white">{APP_INFO.phone}</strong></span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between h-16 bg-emerald-800">
          {/* Logo and Brand */}
          <div 
            onClick={() => setActiveTab('services')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-11 h-11 flex items-center justify-center flex-shrink-0">
              <img 
                src="/malabbiri_logo.png" 
                alt="Logo MALABBIRI Bimas Islam Gowa" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  MALA'BIRI
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-emerald-700 text-emerald-100">
                  Resmi
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-wider text-emerald-200 font-medium line-clamp-1">
                Bimas Islam Kemenag Kab. Gowa
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-emerald-900/50 p-1 rounded-xl border border-emerald-700/50">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-700/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-emerald-200'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-emerald-800 text-white' : 'bg-amber-400 text-slate-900'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action CTA & Mobile Menu Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Tombol Petugas - Solid White sesuai arahan */}
            <button
              onClick={() => setActiveTab('verification')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                activeTab === 'verification'
                  ? 'bg-white text-emerald-900 ring-2 ring-emerald-300'
                  : 'bg-white text-emerald-900 hover:bg-emerald-50'
              }`}
              title={isOfficerLoggedIn ? 'Dashboard Petugas' : 'Akses Admin / Verifikasi'}
            >
              {isOfficerLoggedIn ? (
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
              ) : (
                <Lock className="w-4 h-4 text-emerald-700" />
              )}
              <span className="font-bold">{isOfficerLoggedIn ? 'Petugas' : 'Petugas'}</span>
              {pendingVerificationCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {pendingVerificationCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors cursor-pointer border border-emerald-600"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-emerald-700 bg-emerald-900 px-4 pt-3 pb-5 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white text-emerald-900 font-bold shadow-sm'
                    : 'text-emerald-100 hover:bg-emerald-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-emerald-300'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2">
            <button
              onClick={() => {
                openHotlineWhatsApp();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-50 transition-colors shadow-sm cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              <span>Hubungi Hotline WA ({APP_INFO.phone})</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
