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
    <header className="sticky top-0 z-40 w-full glass-header transition-colors">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-[#0f4c75]/80 via-[#087f5b]/80 to-[#0f4c75]/80 border-b border-white/15 py-1.5 px-4 text-xs text-slate-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md bg-white/15 border-white/25 text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
              {officeStatus.message}
            </span>
            <span className="hidden md:inline text-white/30">|</span>
            <span className="hidden md:inline text-emerald-100 text-[11px]">
              Jam Layanan: Sen-Kam 07.30 - 16.00 WITA, Jum 07.30 - 16.30 WITA
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-emerald-100 text-[11px] hidden sm:inline flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-emerald-300 inline mr-1" />
              Sungguminasa, Kab. Gowa
            </span>
            <button
              onClick={() => openHotlineWhatsApp()}
              className="inline-flex items-center gap-1.5 text-emerald-200 hover:text-white transition-colors font-semibold text-xs group"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-300 group-hover:scale-110 transition-transform" />
              <span>Hotline: <strong className="text-white">{APP_INFO.phone}</strong></span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between h-20 bg-white/15 backdrop-blur-xl px-4 sm:px-6 rounded-2xl border border-white/25 shadow-xl">
          {/* Logo and Brand */}
          <div 
            onClick={() => setActiveTab('services')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0 drop-shadow-md">
              <img 
                src="/malabbiri_logo.png" 
                alt="Logo MALABBIRI Bimas Islam Gowa" 
                className="w-full h-full object-contain filter drop-shadow"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white leading-tight teks-timbul-display">
                  MALA'BIRI
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/40">
                  Responsif
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-widest text-emerald-100 font-semibold line-clamp-1">
                Bimas Islam Kemenag Kab. Gowa
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-white/10 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-[#0f4c75] shadow-lg shadow-black/15'
                      : 'text-white hover:text-white hover:bg-white/15'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#087f5b]' : 'text-emerald-300'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-[#087f5b] text-white' : 'bg-amber-400 text-slate-900'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action CTA & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden xl:flex items-center bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/20 text-white text-xs font-medium gap-3">
              <span className="flex items-center gap-1.5 text-emerald-200">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span>Cloud Sync Aktif (HP • Laptop • PC)</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('verification')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'verification'
                    ? 'bg-white text-[#0f4c75] shadow-md'
                    : isOfficerLoggedIn 
                      ? 'bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/35' 
                      : 'bg-amber-500/20 border border-amber-400/40 text-amber-200 hover:bg-amber-500/30'
                }`}
                title={isOfficerLoggedIn ? 'Dashboard Petugas' : 'Akses Admin / Verifikasi'}
              >
                {isOfficerLoggedIn ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-300" />
                )}
                <span>{isOfficerLoggedIn ? 'Petugas' : 'Akses Admin'}</span>
                {pendingVerificationCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                    {pendingVerificationCount}
                  </span>
                )}
              </button>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl px-4 pt-3 pb-5 space-y-2 animate-in fade-in slide-in-from-top-4 duration-200">
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
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-emerald-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900">
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 border border-white/20 shadow-lg"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Hubungi Hotline WA ({APP_INFO.phone})</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
