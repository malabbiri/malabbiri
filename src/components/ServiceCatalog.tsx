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
  ArrowRight, 
  CheckCircle2, 
  Info,
  Search,
  Sparkles
} from 'lucide-react';
import { SERVICES_LIST } from '../data/services';
import { ServiceDefinition } from '../types';

interface ServiceCatalogProps {
  onSelectService: (service: ServiceDefinition) => void;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({ onSelectService }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpenCheck': return <BookOpenCheck className="w-6 h-6 text-emerald-400" />;
      case 'Building2': return <Building2 className="w-6 h-6 text-cyan-400" />;
      case 'HandCoins': return <HandCoins className="w-6 h-6 text-teal-400" />;
      case 'Compass': return <Compass className="w-6 h-6 text-emerald-300" />;
      case 'Landmark': return <Landmark className="w-6 h-6 text-amber-300" />;
      case 'UserCheck': return <UserCheck className="w-6 h-6 text-cyan-300" />;
      case 'HeartHandshake': return <HeartHandshake className="w-6 h-6 text-rose-300" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="w-6 h-6 text-emerald-400" />;
      case 'GraduationCap': return <GraduationCap className="w-6 h-6 text-blue-300" />;
      default: return <BookOpenCheck className="w-6 h-6 text-emerald-400" />;
    }
  };

  const categories = [
    { id: 'ALL', label: 'Semua Layanan (9)' },
    { id: 'LEMBAGA_MASJID', label: 'Masjid & Majelis Taklim' },
    { id: 'PELAYANAN_UMUM', label: 'Rohaniawan & BP4' },
    { id: 'KUA_PENYULUH', label: 'Laporan KUA & Penyuluh' }
  ];

  const filteredServices = SERVICES_LIST.filter(service => {
    const matchesCategory = selectedCategory === 'ALL' || service.category === selectedCategory;
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          service.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="services-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2 teks-timbul">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Katalog Layanan Publik Bimas Islam</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight teks-timbul-heading">
            Pilih Layanan yang Anda Butuhkan
          </h2>
          <p className="text-sm text-emerald-100/90 mt-1 max-w-2xl teks-timbul">
            Semua permohonan diproses secara responsif, transparan, dan terintegrasi dengan verifikasi dokumen serta notifikasi langsung via WhatsApp.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-emerald-200 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jenis layanan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/15 border border-white/30 text-white placeholder:text-emerald-100/70 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 backdrop-blur-md shadow-inner"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-white/15 pb-4">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === cat.id
                ? 'bg-white text-[#0f4c75] shadow-lg shadow-black/15 scale-[1.02]'
                : 'text-white hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Services Grid (9 services) in Immersive UI White Card Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => {
          return (
            <div
              key={service.id}
              className="bg-white text-slate-900 rounded-2xl p-6 shadow-xl border-b-4 border-emerald-500 hover:border-emerald-600 group flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative card-clean"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                    {getServiceIcon(service.iconName)}
                  </div>
                  <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300">
                    Layanan #{service.id}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug mb-2 tracking-tight">
                  {service.title}
                </h3>

                <p className="text-xs text-slate-700 leading-relaxed mb-4 font-normal">
                  {service.description}
                </p>

                {service.legalBasis && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 mb-4">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <span className="line-clamp-2 font-medium text-slate-800 text-[11.5px] leading-snug">{service.legalBasis}</span>
                  </div>
                )}

                {service.requirementsChecklist && (
                  <div className="mb-4 space-y-2">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Syarat Utama:</p>
                    {service.requirementsChecklist.slice(0, 3).map((req, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-800 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{req}</span>
                      </div>
                    ))}
                    {service.requirementsChecklist.length > 3 && (
                      <p className="text-xs text-emerald-700 font-bold pl-5">
                        +{service.requirementsChecklist.length - 3} dokumen pendukung lainnya
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-2">
                <button
                  onClick={() => onSelectService(service)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <span>Ajukan Layanan Online</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
          <p className="text-slate-300 font-medium">Layanan tidak ditemukan untuk kata kunci "{searchQuery}".</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white"
          >
            Reset Pencarian
          </button>
        </div>
      )}
    </section>
  );
};
