import React from 'react';

interface OfficialLetterheadProps {
  className?: string;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({ className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Letterhead Header with Logo and Text */}
      <div className="flex items-center gap-4 sm:gap-6 pb-2">
        {/* Official Kemenag Logo on the left */}
        <div className="w-20 sm:w-24 flex-shrink-0 flex items-center justify-center">
          <img 
            src="/logokemenag.svg" 
            alt="Logo Kementerian Agama Republik Indonesia" 
            className="w-20 h-20 sm:w-22 sm:h-22 object-contain"
          />
        </div>

        {/* Official Letterhead Typography */}
        <div className="flex-1 text-center font-serif text-slate-900 pr-2 sm:pr-4">
          <h2 className="text-[14px] sm:text-[16px] font-semibold tracking-[0.05em] uppercase text-slate-900 leading-tight">
            KEMENTERIAN AGAMA REPUBLIK INDONESIA
          </h2>
          <h1 className="text-[16px] sm:text-[18px] font-bold tracking-[0.02em] uppercase text-slate-950 mt-1 leading-snug">
            KANTOR KEMENTERIAN AGAMA KABUPATEN GOWA
          </h1>
          <p className="text-[11px] sm:text-[12px] font-normal text-slate-800 mt-1.5 leading-tight">
            Jalan H. Agussalim No. 3 Sungguminasa, 92111 Telp (0411) 865195, Fax (0411) 867354
          </p>
          <p className="text-[10.5px] sm:text-[11.5px] font-normal text-slate-800 mt-0.5 leading-tight">
            Pos-el: <span className="underline font-medium">kab.gowa@kemenag.go.id</span>&nbsp;&nbsp;&nbsp;&nbsp;Laman: <span className="underline font-medium">https://gowa.kemenag.go.id/</span>
          </p>
        </div>
      </div>

      {/* Official Indonesian Government Double Border: Thick top rule (3px) + thin bottom rule (1px) */}
      <div className="w-full mt-2" aria-hidden="true">
        <div className="w-full border-b-[3px] border-slate-950" />
        <div className="w-full border-b-[1px] border-slate-950 mt-[2px]" />
      </div>
    </div>
  );
};
