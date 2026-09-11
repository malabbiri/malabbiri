import { SubmissionRecord, ApplicationStatus } from '../types';
import { APP_INFO } from '../data/services';
import { formatIndoDate } from './date';

export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function createWhatsAppUrl(phone: string, message: string): string {
  const normalizedPhone = normalizePhoneNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
}

export function generateSubmissionWAMessage(submission: SubmissionRecord): string {
  return `*BUKTI PENDAFTARAN LAYANAN MALA'BIRI*
_Seksi Bimas Islam Kemenag Kabupaten Gowa_
------------------------------------------
Assalamu'alaikum Wr. Wb.
Yth. Bapak/Ibu *${submission.applicantName}*,

Permohonan layanan Anda telah berhasil terdaftar dalam sistem MALA'BIRI dengan rincian berikut:

📌 *No. Tiket Registrasi:* *${submission.id}*
📋 *Layanan:* ${submission.serviceTitle}
🏛 *Instansi/Lembaga:* ${submission.institutionName || submission.formData.institutionName || '-'}
📍 *Alamat:* ${submission.address}
📅 *Waktu Pengajuan:* ${formatIndoDate(submission.submittedAt)}
🔐 *Kode Verifikasi:* \`${submission.verificationCode}\`

Status berkas saat ini: *MENUNGGU VERIFIKASI*

Anda dapat memantau status perkembangan dokumen sewaktu-waktu melalui fitur *Lacak Dokumen* dengan memasukkan Nomor Tiket *${submission.id}*.

Petugas Seksi Bimas Islam Kemenag Gowa akan memverifikasi berkas Anda. Terima kasih telah menggunakan layanan digital MALA'BIRI.

_Wassalamu'alaikum Wr. Wb._
*Seksi Bimas Islam Kantor Kemenag Kab. Gowa*
Jl. H. Agussalim No. 3 Sungguminasa`;
}

export function generateStatusUpdateWAMessage(
  submission: SubmissionRecord,
  newStatus: ApplicationStatus,
  officerNote?: string
): string {
  const statusLabels: Record<ApplicationStatus, string> = {
    SUBMITTED: 'Diterima di Sistem (Menunggu Verifikasi)',
    VERIFYING: 'Sedang Diverifikasi Petugas',
    REVIEW: 'Proses Telaah & Validasi Kasi Bimas Islam',
    APPROVED: 'DISETUJUI & SELESAI (Dokumen Diterbitkan)',
    REVISION_NEEDED: 'PERLU PERBAIKAN / REVISI BERKAS',
    REJECTED: 'DITOLAK'
  };

  let noteSection = '';
  if (officerNote) {
    noteSection = `\n📝 *Catatan Petugas:* \n"${officerNote}"\n`;
  }

  let actionAdvice = '';
  if (newStatus === 'APPROVED') {
    actionAdvice = `\n🎉 *Alhamdulillah!* Dokumen/Rekomendasi Anda telah resmi diterbitkan. Anda dapat mengunduh bukti digital melalui portal MALA'BIRI atau mengambil berkas fisik di Kantor Kemenag Kab. Gowa (Senin-Kamis 07.30-16.00 WITA, Jumat 07.30-16.30 WITA).`;
  } else if (newStatus === 'REVISION_NEEDED') {
    actionAdvice = `\n⚠️ *Perhatian:* Mohon lengkapi atau perbaiki berkas sesuai catatan petugas di atas, atau hubungi petugas kami untuk konfirmasi lebih lanjut.`;
  } else if (newStatus === 'REVIEW') {
    actionAdvice = `\nBerkas Anda telah lolos verifikasi awal dan saat ini dalam tahap penelaahan pimpinan/penjadwalan pengukuran lapangan.`;
  }

  return `*UPDATE STATUS BERKAS MALA'BIRI*
_Seksi Bimas Islam Kemenag Kab. Gowa_
------------------------------------------
Assalamu'alaikum Wr. Wb.
Yth. *${submission.applicantName}*,

Pemberitahuan perubahan status permohonan layanan:

📌 *No. Tiket:* *${submission.id}*
📋 *Layanan:* ${submission.serviceTitle}
📊 *Status Terkini:* *${statusLabels[newStatus]}*
${noteSection}${actionAdvice}

Silakan cek portal MALA'BIRI secara berkala:
https://s.id/gowa.kemenag.go.id

Kontak Seksi Bimas Islam Kemenag Gowa:
WA: ${APP_INFO.phone}
Email: ${APP_INFO.email}

Terima kasih atas kerja samanya.
_Wassalamu'alaikum Wr. Wb._`;
}

export function openWhatsAppChat(phone: string, message: string): void {
  const url = createWhatsAppUrl(phone, message);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openHotlineWhatsApp(inquiryContext?: string): void {
  const text = inquiryContext
    ? `Halo Petugas Seksi Bimas Islam Kemenag Gowa, saya ingin berkonsultasi mengenai layanan MALA'BIRI: ${inquiryContext}`
    : `Assalamu'alaikum, Halo Petugas Seksi Bimas Islam Kemenag Gowa, saya ingin bertanya seputar layanan MALA'BIRI...`;
  openWhatsAppChat(APP_INFO.phone, text);
}
