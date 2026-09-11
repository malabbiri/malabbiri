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
    <footer className="relative border-t border-white/15 bg-black/25 backdrop-blur-2xl text-slate-200 pt-14 pb-10 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-t from-emerald-600/15 via-[#0f4c75]/20 to-transparent blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-white/15">
          {/* Col 1: Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 drop-shadow-md">
                <img 
                  src="/malabbiri_logo.png" 
                  alt="Logo MALABBIRI" 
                  className="w-full h-full object-contain filter drop-shadow" 
                />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">
                  MALA'BIRI
                </h3>
                <p className="text-[11px] text-emerald-300 font-semibold">
                  Bimas Islam Kemenag Gowa
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Manajemen Layanan Bimas Islam yang Responsif. Pelayanan publik digital terpadu untuk Majelis Taklim, Kemasjidan, Kalibrasi Kiblat, BP4, Rohaniawan, KUA, dan Penyuluh Agama Islam se-Kabupaten Gowa.
            </p>

            <div className="pt-1">
              <button
                onClick={() => openHotlineWhatsApp()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#0f4c75] hover:bg-emerald-50 text-xs font-bold shadow-lg transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current text-[#087f5b]" />
                <span>Konsultasi Hotline WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Col 2: Office & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-300" />
              <span>Kantor & Kontak Resmi</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                <p className="text-slate-200">
                  {APP_INFO.officeAddress}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <a 
                  href={`tel:${APP_INFO.phone}`} 
                  className="text-white hover:text-emerald-300 font-mono transition-colors"
                >
                  {APP_INFO.phone}
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <a 
                  href={`mailto:${APP_INFO.email}`} 
                  className="text-white hover:text-emerald-300 transition-colors truncate"
                >
                  {APP_INFO.email}
                </a>
              </div>
            </div>
          </div>

          {/* Col 3: Operating Hours */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-300" />
              <span>Jam Operasional Layanan</span>
            </h4>

            <div className="space-y-2 text-xs">
              {APP_INFO.workingHours.map((schedule, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/10 border border-white/20">
                  <span className="font-semibold text-white block">{schedule.days}</span>
                  <span className="text-emerald-200 font-mono text-[11px]">{schedule.hours}</span>
                </div>
              ))}
              <p className="text-[10px] text-emerald-100/70 pt-1">
                *Pengajuan berkas online MALA'BIRI dapat dilakukan 24 jam setiap hari.
              </p>
            </div>
          </div>

          {/* Col 4: Official Social Media */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-300" />
              <span>Kanal Informasi Resmi</span>
            </h4>

            <div className="space-y-2 text-xs">
              {APP_INFO.socialMedia.map((media, idx) => (
                <a
                  key={idx}
                  href={media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all group"
                >
                  <span className="font-medium group-hover:text-emerald-200">{media.name}</span>
                  <span className="text-[11px] text-emerald-200/90 flex items-center gap-1 font-mono">
                    {media.handle}
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Credits Bar Matching Immersive UI Snippet */}
        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white text-xs">
          <div>© 2026 Seksi Bimbingan Masyarakat Islam — Kemenag Kabupaten Gowa</div>
          <div className="flex items-center gap-4 text-[11px] text-emerald-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Layanan Publik Responsif & Akuntabel
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
