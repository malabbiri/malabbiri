import React from 'react';

interface OfficialLetterheadProps {
  className?: string;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({ className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Letterhead Header with Logo and Text */}
      <div className="flex items-center justify-between gap-4 pb-2">
        {/* Official Kemenag Logo on the left */}
        <div className="w-20 sm:w-24 flex-shrink-0 flex items-center justify-center">
          <img 
            src="/logokemenag.svg" 
            alt="Logo Kementerian Agama Republik Indonesia" 
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
          />
        </div>

        {/* Official Letterhead Typography */}
        <div className="flex-1 text-center font-serif text-slate-900 leading-tight">
          <h2 className="text-[14px] sm:text-[16px] font-normal tracking-[0.04em] uppercase text-slate-900">
            KEMENTERIAN AGAMA REPUBLIK INDONESIA
          </h2>
          <h1 className="text-[15px] sm:text-[17px] font-bold tracking-normal uppercase text-slate-950 mt-0.5">
            KANTOR KEMENTERIAN AGAMA KABUPATEN GOWA
          </h1>
          <p className="text-[11px] sm:text-[12px] font-normal text-slate-800 mt-1">
            Jalan H. Agussalim No. 3 Sungguminasa, 92111 Telp (0411) 865195, Fax (0411) 867354
          </p>
          <p className="text-[10px] sm:text-[11px] font-normal text-slate-800 mt-0.5">
            Pos-el <span className="underline font-medium">kab.gowa@kemenag.go.id</span>&nbsp;&nbsp;laman <span className="underline font-medium">https://gowa.kemenag.go.id/</span>
          </p>
        </div>

        {/* Balancing spacer to ensure perfect optical centering */}
        <div className="w-20 sm:w-24 flex-shrink-0" aria-hidden="true" />
      </div>

      {/* Official Indonesian Government Double Border: Thick line + thin line */}
      <div className="w-full mt-1.5" aria-hidden="true">
        <div className="w-full border-b-[2.5px] border-slate-950" />
        <div className="w-full border-b-[1px] border-slate-950 mt-[2px]" />
      </div>
    </div>
  );
};
