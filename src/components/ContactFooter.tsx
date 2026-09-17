import React from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ExternalLink, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Youtube, 
  Globe, 
  Building2,
  ShieldCheck,
  Heart
} from 'lucide-react';
import { APP_INFO } from '../data/services';
import { openHotlineWhatsApp } from '../utils/whatsapp';

export const ContactFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-700 pt-10 pb-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-slate-200">
          {/* Col 1: Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                <img 
                  src="/malabbiri_logo.png" 
                  alt="Logo MALABBIRI" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  MALA'BIRI
                </h3>
                <p className="text-[11px] text-emerald-700 font-semibold">
                  Bimas Islam Kemenag Gowa
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Manajemen Layanan Bimas Islam yang Responsif. Pelayanan publik digital terpadu untuk Majelis Taklim, Kemasjidan, Kalibrasi Kiblat, BP4, Rohaniawan, KUA, dan Penyuluh Agama Islam se-Kabupaten Gowa.
            </p>

            <div className="pt-1">
              <button
                onClick={() => openHotlineWhatsApp()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current text-white" />
                <span>Konsultasi Hotline WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Col 2: Office & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <span>Kantor & Kontak Resmi</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-slate-600">
                  {APP_INFO.officeAddress}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <a 
                  href={`tel:${APP_INFO.phone}`} 
                  className="text-slate-800 hover:text-emerald-700 font-mono transition-colors"
                >
                  {APP_INFO.phone}
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <a 
                  href={`mailto:${APP_INFO.email}`} 
                  className="text-slate-800 hover:text-emerald-700 transition-colors truncate"
                >
                  {APP_INFO.email}
                </a>
              </div>
            </div>
          </div>

          {/* Col 3: Operating Hours */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Jam Operasional Layanan</span>
            </h4>

            <div className="space-y-2 text-xs">
              {APP_INFO.workingHours.map((schedule, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-900 block">{schedule.days}</span>
                  <span className="text-emerald-700 font-mono text-[11px] font-medium">{schedule.hours}</span>
                </div>
              ))}
              <p className="text-[10px] text-slate-500 pt-1">
                *Pengajuan berkas online MALA'BIRI dapat dilakukan 24 jam setiap hari.
              </p>
            </div>
          </div>

          {/* Col 4: Official Social Media */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-700" />
              <span>Kanal Informasi Resmi</span>
            </h4>

            <div className="space-y-2 text-xs">
              {APP_INFO.socialMedia.map((media, idx) => (
                <a
                  key={idx}
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-colors group"
                >
                  <span className="font-medium group-hover:text-emerald-700">{media.name}</span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    {media.handle}
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Credits Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-xs">
          <div>© 2026 Seksi Bimbingan Masyarakat Islam — Kantor Kementerian Agama Kabupaten Gowa</div>
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Pelayanan Publik Responsif, Transparan & Akuntabel
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
