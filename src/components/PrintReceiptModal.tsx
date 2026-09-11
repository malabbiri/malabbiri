import React, { useEffect } from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import { SubmissionRecord } from '../types';
import { formatIndoDate } from '../utils/date';
import { OfficialLetterhead } from './OfficialLetterhead';
import { downloadOfficialReceiptPdf, getStatusLabelIndo } from '../utils/fileHelper';

interface PrintReceiptModalProps {
  submission: SubmissionRecord;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  submission,
  onClose
}) => {
  useEffect(() => {
    document.body.classList.add('receipt-modal-active');
    return () => {
      document.body.classList.remove('receipt-modal-active');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    downloadOfficialReceiptPdf(submission);
  };

  const now = new Date();
  const formattedToday = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(now);

  return (
    <div className="print-receipt-modal-root fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="printable-modal-card relative w-full max-w-3xl bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Modal Controls (Hidden when printing) */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              Pratinjau Tanda Terima Resmi Bimas Islam
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow cursor-pointer"
              title="Unduh file PDF resmi tanda terima pendaftaran"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF Resmi</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors shadow cursor-pointer"
              title="Buka dialog cetak browser (hanya mencetak dokumen resmi)"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cetak Dokumen</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div 
          id="printable-receipt-content"
          className="printable-sheet overflow-y-auto p-6 sm:p-10 font-serif text-slate-900 bg-white selection:bg-slate-200"
        >
          <div className="space-y-4 max-w-2xl mx-auto printable-content">
            {/* Kop Surat Resmi Sesuai Format Kemenag Gowa */}
            <OfficialLetterhead />

            {/* Document Title */}
            <div className="text-center py-2">
              <h2 className="text-sm font-bold uppercase tracking-wider underline font-sans text-slate-950">
                TANDA TERIMA PENDAFTARAN LAYANAN MALA'BIRI
              </h2>
              <p className="text-[11px] text-slate-700 font-mono mt-0.5">
                Nomor Registrasi: <strong>{submission.id}</strong>
              </p>
            </div>

            {/* Data Table */}
            <div className="border border-slate-400 rounded-md overflow-hidden font-sans text-xs">
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="w-44 px-3 py-2 font-semibold bg-slate-100 text-slate-800">Jenis Layanan</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{submission.serviceTitle}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 font-semibold bg-slate-100 text-slate-800">Nama Pemohon</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{submission.applicantName}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 font-semibold bg-slate-100 text-slate-800">Nomor WhatsApp / HP</td>
                    <td className="px-3 py-2 font-mono text-slate-900">{submission.phone}</td>
                  </tr>
                  {submission.institutionName && (
                    <tr className="border-b border-slate-300">
                      <td className="px-3 py-2 font-semibold bg-slate-100 text-slate-800">Nama Lembaga / Masjid</td>
                      <td className="px-3 py-2 text-slate-900 font-medium">{submission.institutionName}</td>
                    </tr>
                  )}
                  {submission.district && (
                    <tr className="border-b border-slate-300">
                      <td className="px-3 py-2 font-semibold bg-slate-100 text-slate-800">Kecamatan Domisili</td>
                      <td className="px-3 py-2 text-slate-900 font-medium">Kecamatan {submission.district}</td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 font-semibold bg-slate-100 text-slate-800">Alamat Lengkap</td>
                    <td className="px-3 py-2 text-slate-900">{submission.address}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="px-3 py-2 font-semibold bg-slate-100 text-slate-800">Waktu Pengajuan</td>
                    <td className="px-3 py-2 text-slate-900">{formatIndoDate(submission.submittedAt)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold bg-slate-100 text-slate-800">Status Permohonan</td>
                    <td className="px-3 py-2 font-bold text-emerald-800">{getStatusLabelIndo(submission.status)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Uploaded Documents List */}
            <div className="space-y-1 font-sans text-xs">
              <h5 className="font-bold text-[11px] uppercase tracking-wide text-slate-900">
                Daftar Berkas Dokumen yang Diserahkan:
              </h5>
              <ol className="list-decimal pl-5 space-y-0.5 text-slate-800 text-[11px]">
                {submission.files.map((f, idx) => (
                  <li key={idx} className="font-medium text-slate-800">
                    {f.label}
                  </li>
                ))}
              </ol>
            </div>

            {/* Security & Authentication Info */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-md font-sans text-[10px] text-slate-700 space-y-1">
              <p>
                <strong>Catatan:</strong> Lembar tanda terima ini merupakan bukti registrasi sah layanan digital MALA'BIRI Bimas Islam Kementerian Agama Kabupaten Gowa. Pemohon dapat melakukan tracking berkas setiap saat melalui aplikasi.
              </p>
              <p className="font-mono text-slate-900">
                Kode Otentikasi Digital: <strong>{submission.verificationCode}</strong> | ID: <strong>{submission.id}</strong>
              </p>
            </div>

            {/* Official Signatures */}
            <div className="pt-4 flex items-start justify-between text-center font-sans text-xs">
              <div className="space-y-12">
                <p className="font-medium text-slate-800">Pemohon,</p>
                <p className="font-bold border-t border-slate-400 pt-1 text-slate-950">
                  ( {submission.applicantName} )
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-slate-700">Sungguminasa, {formattedToday}</p>
                <p className="font-medium text-slate-800">Petugas Seksi Bimas Islam,</p>
                <div className="h-10 flex items-center justify-center">
                  <span className="text-[10px] text-emerald-800 font-bold border border-emerald-700 px-2.5 py-0.5 rounded uppercase">
                    ✓ TERVERIFIKASI MALA'BIRI
                  </span>
                </div>
                <p className="font-bold border-t border-slate-400 pt-1 text-slate-950">
                  Kemenag Kabupaten Gowa
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
