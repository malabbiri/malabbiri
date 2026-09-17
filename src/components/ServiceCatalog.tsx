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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Katalog Layanan Digital</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pilih Layanan Bimas Islam
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Semua permohonan diproses secara transparan dengan verifikasi berkas daring dan tanda terima resmi.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jenis layanan..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Category Pills (Clean flat style) */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 pb-3">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Services Grid (9 services) in Solid Card Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredServices.map((service) => {
          return (
            <div
              key={service.id}
              className="bg-white text-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 hover:border-slate-300 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                    {getServiceIcon(service.iconName)}
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    #{service.code}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1.5">
                  {service.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {service.description}
                </p>

                {service.legalBasis && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 mb-3">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600" />
                    <span className="line-clamp-2 text-[11px] leading-snug">{service.legalBasis}</span>
                  </div>
                )}

                {service.requirementsChecklist && (
                  <div className="mb-3 space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Syarat Utama:</p>
                    {service.requirementsChecklist.slice(0, 3).map((req, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{req}</span>
                      </div>
                    ))}
                    {service.requirementsChecklist.length > 3 && (
                      <p className="text-[11px] text-emerald-700 font-semibold pl-5">
                        +{service.requirementsChecklist.length - 3} dokumen pendukung lainnya
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 mt-2">
                <button
                  onClick={() => onSelectService(service)}
                  className="w-full py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>Ajukan Layanan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServices.length === 0 && (
        <div className="bg-white border border-slate-200 p-10 rounded-xl text-center space-y-3 shadow-sm">
          <p className="text-slate-600 text-xs font-medium">Layanan tidak ditemukan untuk kata kunci "{searchQuery}".</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 text-white cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      )}
    </section>
  );
};
