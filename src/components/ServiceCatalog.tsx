import React, { useState } from 'react';
import { 
  BookOpenCheck, 
  Building2, 
  HandCoins, 
  Compass, 
  Landmark, 
  UserCheck, 
  HeartHandshake, 
  FileSpreadsheet, 
  GraduationCap, 
  Search,
  X,
  LayoutGrid
} from 'lucide-react';
import { SERVICES_LIST } from '../data/services';
import { ServiceDefinition } from '../types';

interface ServiceCatalogProps {
  onSelectService: (service: ServiceDefinition) => void;
}

interface ServiceTheme {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
  shortLabel: string;
}

const SERVICE_THEMES: Record<string, ServiceTheme> = {
  'SKT-MT': {
    bg: 'bg-rose-50/90 hover:bg-rose-100/90',
    border: 'border border-rose-100/80',
    text: 'text-rose-600',
    icon: <BookOpenCheck className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
    shortLabel: 'SKT Majelis Taklim'
  },
  'SKT-MASJID': {
    bg: 'bg-amber-50/90 hover:bg-amber-100/90',
    border: 'border border-amber-100/80',
    text: 'text-amber-600',
    icon: <Building2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
    shortLabel: 'SKT Masjid & Mushalla'
  },
  'REK-BOM': {
    bg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
    border: 'border border-emerald-100/80',
    text: 'text-emerald-600',
    icon: <HandCoins className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
    shortLabel: 'Bantuan Operasional'
  },
  'KBLT-MASJID': {
    bg: 'bg-purple-50/90 hover:bg-purple-100/90',
    border: 'border border-purple-100/80',
    text: 'text-purple-600',
    icon: <Compass className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
    shortLabel: 'Arah Kiblat'
  },
  'PENDIRIAN-MASJID': {
    bg: 'bg-pink-50/90 hover:bg-pink-100/90',
    border: 'border border-pink-100/80',
    text: 'text-pink-600',
    icon: <Landmark className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
    shortLabel: 'Pendirian Masjid'
  },
  'ROHANIAWAN': {
    bg: 'bg-orange-50/90 hover:bg-orange-100/90',
    border: 'border border-orange-100/80',
    text: 'text-orange-600',
    icon: <UserCheck className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
    shortLabel: 'Petugas Rohaniawan'
  },
  'BP4': {
    bg: 'bg-sky-50/90 hover:bg-sky-100/90',
    border: 'border border-sky-100/80',
    text: 'text-sky-600',
    icon: <HeartHandshake className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
    shortLabel: 'Rekomendasi BP4'
  },
  'LAP-KUA': {
    bg: 'bg-teal-50/90 hover:bg-teal-100/90',
    border: 'border border-teal-100/80',
    text: 'text-teal-600',
    icon: <FileSpreadsheet className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
    shortLabel: 'Laporan KUA'
  },
  'EPAI-PENYULUH': {
    bg: 'bg-indigo-50/90 hover:bg-indigo-100/90',
    border: 'border border-indigo-100/80',
    text: 'text-indigo-600',
    icon: <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
    shortLabel: 'Laporan e-PAI'
  }
};

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({ onSelectService }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Menampilkan semua layanan tanpa pengelompokan/kategori, dengan pencarian instan
  const filteredServices = SERVICES_LIST.filter(service => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      service.title.toLowerCase().includes(q) ||
      (service.shortTitle && service.shortTitle.toLowerCase().includes(q)) ||
      service.code.toLowerCase().includes(q) ||
      service.description.toLowerCase().includes(q)
    );
  });

  return (
    <section id="services-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Search Bar (Sesuai contoh: rounded pill dengan warna abu lembut) */}
      <div className="mb-6 max-w-3xl mx-auto">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari layanan..."
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-100/90 focus:bg-white border border-transparent focus:border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              title="Bersihkan pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container Card (Sesuai contoh screenshot: card putih dengan sudut melengkung) */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-sm">
        {/* Header Grup Layanan */}
        <div className="flex items-center gap-3.5 mb-6 sm:mb-8 pb-4 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Layanan Bimas Islam
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {filteredServices.length} layanan tersedia
            </p>
          </div>
        </div>

        {/* Grid Menu Layanan (3 kolom di mobile, 4-6 kolom di layar lebih lebar) */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-y-7 gap-x-3 sm:gap-x-6">
          {filteredServices.map((service) => {
            const theme = SERVICE_THEMES[service.code] || {
              bg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
              border: 'border border-emerald-100/80',
              text: 'text-emerald-600',
              icon: <BookOpenCheck className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />,
              shortLabel: service.shortTitle || service.title
            };

            return (
              <button
                key={service.id}
                onClick={() => onSelectService(service)}
                className="flex flex-col items-center text-center group cursor-pointer focus:outline-none"
                title={`${service.title} - Klik untuk mengajukan`}
              >
                {/* Kotak Ikon Pastel Berlekuk (Squircle) */}
                <div 
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center ${theme.bg} ${theme.border} ${theme.text} transition-all duration-200 group-hover:scale-105 group-hover:shadow-sm group-active:scale-95`}
                >
                  {theme.icon}
                </div>

                {/* Judul Layanan Ringkas */}
                <span className="text-xs sm:text-sm font-medium text-slate-800 text-center leading-tight line-clamp-2 max-w-[92px] sm:max-w-[110px] mt-2.5 group-hover:text-emerald-700 transition-colors">
                  {theme.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* State Bila Pencarian Kosong */}
        {filteredServices.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <p className="text-slate-500 text-xs sm:text-sm font-medium">
              Tidak ada layanan yang sesuai dengan kata kunci &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors"
            >
              Tampilkan Semua Layanan
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
