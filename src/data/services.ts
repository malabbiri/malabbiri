import { ServiceDefinition, GOWA_DISTRICTS } from '../types';

export const SERVICES_LIST: ServiceDefinition[] = [
  {
    id: 1,
    code: 'SKT-MT',
    title: 'Pendaftaran Surat Keterangan Terdaftar (SKT) Majelis Taklim',
    shortTitle: 'SKT Majelis Taklim',
    category: 'LEMBAGA_MASJID',
    description: 'Penerbitan SKT bagi pengurus Majelis Taklim yang berdomisili di wilayah Kabupaten Gowa.',
    legalBasis: 'Peraturan Menteri Agama (PMA) Nomor 29 Tahun 2019 Tentang Majelis Taklim',
    iconName: 'BookOpenCheck',
    requirementsChecklist: [
      'Surat Permohonan Penerbitan SKT Majelis Taklim Ditujukan Kepada Kepala Kantor Kemenag Kab. Gowa',
      'Melampirkan Foto Copy SK Pendirian Organisasi Majelis Taklim',
      'Melampirkan Surat Rekomendasi Penerbitan SKT Majelis Taklim dari KUA Setempat',
      'Melampirkan Surat Keterangan Domisili Majelis Taklim dari Lurah/Kepala Desa',
      'Melampirkan Foto Copy KTP Pengurus dan Jamaah'
    ],
    fields: [
      { id: 'applicantName', label: 'Nama Pemohon / Ketua', type: 'text', placeholder: 'Contoh: Hj. Nurhaedah, S.Pd.I', required: true },
      { id: 'institutionName', label: 'Nama Majelis Taklim', type: 'text', placeholder: 'Contoh: Majelis Taklim Nurul Iman', required: true },
      { id: 'address', label: 'Alamat Majelis Taklim', type: 'textarea', placeholder: 'Alamat lengkap Majelis Taklim...', required: true },
      { id: 'district', label: 'Kecamatan Domisili', type: 'select', options: [...GOWA_DISTRICTS], required: true },
      { id: 'phone', label: 'Nomor HP / WhatsApp Pemohon', type: 'text', placeholder: 'Contoh: 081234567890', required: true, helperText: 'Nomor aktif yang terhubung dengan WhatsApp untuk notifikasi berkas' },
      { id: 'file_surat_permohonan', label: 'Surat Permohonan SKT Majelis Taklim', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB (PDF/DOC/JPG/PNG).' },
      { id: 'file_sk_pendirian', label: 'Foto Copy SK Pendirian Majelis Taklim', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_rekomendasi_kua', label: 'Surat Rekomendasi Permohonan SKT dari Kepala KUA Setempat', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_domisili_desa', label: 'Surat Keterangan Domisili Lembaga dari Kelurahan/Desa', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_ktp_pengurus', label: 'Foto Copy KTP Pengurus dan Jamaah Majelis Taklim', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_foto_kegiatan', label: 'Foto Kegiatan Majelis Taklim', type: 'file', required: false, maxFiles: 5, maxSizeMB: 10, helperText: 'Upload maksimum 5 file yang didukung. Maks 10 MB per file.' }
    ]
  },
  {
    id: 2,
    code: 'SKT-MASJID',
    title: 'Permohonan Surat Keterangan Terdaftar (SKT) Masjid dan Mushalla',
    shortTitle: 'SKT Masjid & Mushalla',
    category: 'LEMBAGA_MASJID',
    description: 'Pencatatan resmi dan penerbitan SKT Masjid/Mushalla di lingkungan Kemenag Kab. Gowa.',
    iconName: 'Building2',
    fields: [
      { id: 'applicantName', label: 'Nama Pemohon / Ketua Pengurus', type: 'text', placeholder: 'Nama lengkap pemohon', required: true },
      { id: 'institutionName', label: 'Nama Masjid / Mushalla', type: 'text', placeholder: 'Contoh: Masjid Besar Al-Hilal', required: true },
      { id: 'address', label: 'Alamat Masjid / Mushalla', type: 'textarea', placeholder: 'Jalan, Dusun/Lingkungan, Desa/Kelurahan...', required: true },
      { id: 'district', label: 'Kecamatan', type: 'select', options: [...GOWA_DISTRICTS], required: true },
      { id: 'phone', label: 'No HP / WhatsApp Pemohon', type: 'text', placeholder: '081234567890', required: true },
      { id: 'simasId', label: 'No ID Masjid yang Terdaftar di SIMAS Kemenag', type: 'text', placeholder: 'Contoh: 01.4.26.06.01.000001 (Isi jika sudah ada)', required: false, helperText: 'ID Sistem Informasi Masjid Kemenag (SIMAS)' },
      { id: 'file_surat_permohonan', label: 'Surat Permohonan SKT Masjid/Mushalla', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_sk_pengurus', label: 'Foto Copy SK Pengurus Masjid/Mushalla', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_kalibrasi_kiblat', label: 'Foto Copy Sertipikat Kalibrasi Arah Kiblat', type: 'file', required: true, maxSizeMB: 100, helperText: 'Upload 1 file yang didukung. Maks 100 MB.' }
    ]
  },
  {
    id: 3,
    code: 'REK-BOM',
    title: 'Penerbitan Surat Rekomendasi Bantuan Operasional Masjid dan Mushallah',
    shortTitle: 'Rekomendasi Bantuan Operasional',
    category: 'LEMBAGA_MASJID',
    description: 'Surat rekomendasi Bimas Islam untuk pengajuan bantuan operasional atau renovasi ke Kementerian/instansi.',
    iconName: 'HandCoins',
    fields: [
      { id: 'applicantName', label: 'Nama Pemohon', type: 'text', placeholder: 'Nama lengkap ketua/pengurus masjid', required: true },
      { id: 'institutionName', label: 'Nama Masjid / Mushallah', type: 'text', placeholder: 'Contoh: Masjid Nurul Jannah', required: true },
      { id: 'address', label: 'Alamat Masjid', type: 'textarea', placeholder: 'Alamat lengkap tempat ibadah...', required: true },
      { id: 'district', label: 'Kecamatan', type: 'select', options: [...GOWA_DISTRICTS], required: true },
      { id: 'phone', label: 'Nomor HP / WhatsApp Pemohon', type: 'text', placeholder: '081234567890', required: true },
      { id: 'file_sk_pengurus', label: 'Foto Copy SK Pengurus Masjid', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_kalibrasi_kiblat', label: 'Foto Copy Sertipikat Kalibrasi Arah Kiblat Masjid', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_skt_masjid', label: 'Foto Copy Surat Keterangan Terdaftar (SKT) Masjid', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' }
    ]
  },
  {
    id: 4,
    code: 'KBLT-MASJID',
    title: 'Permohonan Penerbitan Sertifikat Kalibrasi dan Pengukuran Arah Kiblat Masjid dan Mushalla',
    shortTitle: 'Pengukuran Arah Kiblat',
    category: 'LEMBAGA_MASJID',
    description: 'Layanan pengukuran falakiah dan penetapan akurasi arah kiblat oleh tim hisab rukyat Kemenag Kab. Gowa.',
    iconName: 'Compass',
    fields: [
      { id: 'applicantName', label: 'Nama Pemohon', type: 'text', placeholder: 'Nama pengurus / panitia pembangunan', required: true },
      { id: 'institutionName', label: 'Nama Masjid / Mushalla', type: 'text', placeholder: 'Contoh: Masjid Jami Babussalam', required: true },
      { id: 'address', label: 'Alamat Masjid / Mushalla', type: 'textarea', placeholder: 'Lokasi masjid yang akan diukur...', required: true },
      { id: 'district', label: 'Kecamatan', type: 'select', options: [...GOWA_DISTRICTS], required: true },
      { id: 'phone', label: 'No Hp/Wa Pengurus Masjid yang bisa dihubungi', type: 'text', placeholder: '081234567890', required: true },
      { id: 'simasId', label: 'No. ID Masjid Yang Terdaftar di SIMAS Kemenag (jika ada)', type: 'text', placeholder: 'Nomor SIMAS Kemenag (diisi apabila sudah ada)', required: false },
      { id: 'file_surat_permohonan', label: 'Surat Permohonan Kalibrasi Arah Kiblat Masjid / Mushalla', type: 'file', required: true, maxSizeMB: 100, helperText: 'Upload 1 file yang didukung. Maks 100 MB.' },
      { id: 'file_berita_acara', label: 'Berita Acara Kesepakatan Panitia Masjid untuk Kalibrasi Arah Kiblat', type: 'file', required: true, maxSizeMB: 100, helperText: 'Upload 1 file yang didukung. Maks 100 MB.' },
      { id: 'file_sk_pengurus', label: 'Foto Copy SK Pengurus Masjid / Mushalla', type: 'file', required: true, maxSizeMB: 100, helperText: 'Upload 1 file yang didukung. Maks 100 MB.' }
    ]
  },
  {
    id: 5,
    code: 'PENDIRIAN-MASJID',
    title: 'Surat Rekomendasi Pendirian Masjid / Mushalla',
    shortTitle: 'Rekomendasi Pendirian Rumah Ibadah',
    category: 'LEMBAGA_MASJID',
    description: 'Penerbitan rekomendasi pendirian tempat ibadah sesuai PBM Menteri Agama dan Mendagri.',
    iconName: 'Landmark',
    fields: [
      { id: 'applicantName', label: 'Nama Pemohon / Panitia Pendirian', type: 'text', placeholder: 'Nama lengkap ketua panitia pembangunan', required: true },
      { id: 'institutionName', label: 'Rencana Nama Masjid / Mushalla', type: 'text', placeholder: 'Contoh: Masjid As-Salam', required: true },
      { id: 'address', label: 'Alamat Lokasi Pendirian', type: 'textarea', placeholder: 'Lokasi rencana pembangunan...', required: true },
      { id: 'district', label: 'Kecamatan', type: 'select', options: [...GOWA_DISTRICTS], required: true },
      { id: 'phone', label: 'No HP / WhatsApp', type: 'text', placeholder: '081234567890', required: true },
      { id: 'file_surat_permohonan', label: 'Surat Permohonan', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_daftar_90_ktp', label: 'Daftar Nama dan KTP Pengguna Rumah Ibadah (Min 90 Orang) disahkan Lurah/Kades & Camat', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_dukungan_60_warga', label: 'Surat Dukungan Masyarakat Setempat (Min 60 Orang) disahkan Lurah/Kades & Camat', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' },
      { id: 'file_alas_hak', label: 'Alas Hak Kepemilikan (AJB / SHM / AIW / Sertipikat Wakaf)', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung. Maks 10 MB.' }
    ]
  },
  {
    id: 6,
    code: 'ROHANIAWAN',
    title: 'Permohonan Petugas Rohaniawan',
    shortTitle: 'Petugas Rohaniawan',
    category: 'PELAYANAN_UMUM',
    description: 'Penugasan rohaniawan resmi Bimas Islam Kemenag Gowa untuk pelantikan, sumpah jabatan, peradilan, dan acara kedinasan.',
    iconName: 'UserCheck',
    fields: [
      { id: 'applicantName', label: 'Nama Pemohon / Instansi', type: 'text', placeholder: 'Contoh: Pengadilan Negeri / Kantor Camat Somba Opu', required: true },
      { id: 'address', label: 'Alamat Pemohon / Lokasi Acara', type: 'textarea', placeholder: 'Alamat instansi dan tempat pelaksanaan kegiatan...', required: true },
      { id: 'phone', label: 'No HP / WhatsApp Pemohon', type: 'text', placeholder: '081234567890', required: true },
      { id: 'eventDate', label: 'Tanggal & Waktu Acara', type: 'text', placeholder: 'Contoh: Rabu, 15 Oktober 2026 - 09.00 WITA', required: true },
      { id: 'file_surat_permohonan', label: 'Surat Permohonan Rohaniawan', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file surat resmi permohonan yang didukung. Maks 10 MB.' }
    ]
  },
  {
    id: 7,
    code: 'BP4',
    title: 'Permohonan Rekomendasi BP4',
    shortTitle: 'Rekomendasi BP4 (Konseling Keluarga)',
    category: 'PELAYANAN_UMUM',
    description: 'Badan Penasihatan, Pembinaan, dan Pelestarian Perkawinan (BP4) bagi ASN/Masyarakat Kabupaten Gowa.',
    iconName: 'HeartHandshake',
    fields: [
      { id: 'applicantName', label: 'Nama Pemohon', type: 'text', placeholder: 'Nama lengkap pemohon', required: true },
      { id: 'address', label: 'Alamat Pemohon', type: 'textarea', placeholder: 'Alamat domisili tempat tinggal saat ini...', required: true },
      { id: 'workplace', label: 'Tempat Tugas / Instansi Bekerja', type: 'text', placeholder: 'Contoh: Dinas Kesehatan Kab. Gowa', required: true },
      { id: 'phone', label: 'No HP / WhatsApp Pemohon', type: 'text', placeholder: '081234567890', required: true },
      { id: 'familyIssue', label: 'Permasalahan Keluarga', type: 'textarea', placeholder: 'Uraikan secara singkat latar belakang permasalahan keluarga...', required: true },
      { id: 'file_ktp_suami', label: 'KTP Suami', type: 'file', required: true, maxSizeMB: 1, helperText: 'Upload 1 file yang didukung: PDF atau image. Maks 1 MB.' },
      { id: 'file_ktp_istri', label: 'KTP Istri', type: 'file', required: true, maxSizeMB: 1, helperText: 'Upload 1 file yang didukung: PDF atau image. Maks 1 MB.' },
      { id: 'file_sk_pns_terakhir', label: 'SK PNS Terakhir', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung: PDF. Maks 10 MB.' },
      { id: 'file_sk_tempat_tugas', label: 'SK Tempat Tugas Terakhir', type: 'file', required: true, maxSizeMB: 10, helperText: 'Upload 1 file yang didukung: PDF. Maks 10 MB.' },
      { id: 'file_surat_permohonan', label: 'Surat Permohonan', type: 'file', required: true, maxSizeMB: 1, helperText: 'Upload 1 file yang didukung: PDF. Maks 1 MB.' }
    ]
  },
  {
    id: 8,
    code: 'LAP-KUA',
    title: 'Layanan KUA Kementerian Agama Kabupaten Gowa',
    shortTitle: 'Laporan Berkala KUA',
    category: 'KUA_PENYULUH',
    description: 'Portal pelaporan resmi Kantor Urusan Agama (KUA) se-Kabupaten Gowa ke Seksi Bimas Islam.',
    iconName: 'FileSpreadsheet',
    notice: 'Mohon memilih "Yang Lain" untuk Layanan KUA yang tidak tertera pada pilihan, kemudian isi sesuai dokumen yang akan dikirim. Contoh : Laporan Data Penyembelihan Hewan Qurban, dsb.',
    fields: [
      {
        id: 'reportCategory',
        label: 'Jenis Laporan KUA',
        type: 'select',
        required: true,
        options: [
          'LAPORAN F1',
          'LAPORAN L1 DAN L2',
          'LAPORAN KONSULTASI SYARIAH',
          'LAPORAN BIMWIN',
          'LAPORAN BRUS',
          'LAPORAN PILOTING KELUARGA SAKINAH',
          'Yang lain: .........'
        ]
      },
      {
        id: 'customReportName',
        label: 'Tuliskan Nama Laporan (Jika memilih "Yang lain")',
        type: 'text',
        placeholder: 'Contoh: Laporan Data Penyembelihan Hewan Qurban 1447 H',
        required: false,
        helperText: 'Wajib diisi bila memilih jenis laporan "Yang lain"'
      },
      {
        id: 'district',
        label: 'KUA Kecamatan?',
        type: 'select',
        options: [...GOWA_DISTRICTS],
        required: true
      },
      {
        id: 'reportMonth',
        label: 'Laporan Bulan?',
        type: 'select',
        required: true,
        options: [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ]
      },
      {
        id: 'reportYear',
        label: 'Tahun?',
        type: 'select',
        required: true,
        options: ['2026', '2025', '2024']
      },
      { id: 'applicantName', label: 'Nama Pengirim / Kepala KUA / Petugas', type: 'text', placeholder: 'Nama lengkap pengirim laporan', required: true },
      { id: 'phone', label: 'No HP / WhatsApp Petugas KUA', type: 'text', placeholder: '081234567890', required: true },
      {
        id: 'file_bukti_dukung',
        label: 'Upload Dokumen / Bukti Dukung',
        type: 'file',
        required: true,
        maxSizeMB: 10,
        acceptedFormats: '.pdf,.doc,.docx,.xls,.xlsx',
        helperText: 'Mohon Nama File/Dokumen disesuaikan dengan nama Laporannya. Contoh : Laporan Bimwin Bulan Mei 2026 KUA Kecamatan Somba Opu. Upload 1 file yang didukung: PDF, document, atau spreadsheet. Maks 10 MB.'
      }
    ]
  },
  {
    id: 9,
    code: 'EPAI-PENYULUH',
    title: 'Laporan Bulanan Penyuluh Agama Islam (e-PAI)',
    shortTitle: 'Laporan Bulanan Penyuluh (e-PAI)',
    category: 'KUA_PENYULUH',
    description: 'Pengumpulan Laporan Bulanan Penyuluh Agama Islam (e-PAI) wajib bagi Penyuluh Agama Islam se-Kabupaten Gowa.',
    iconName: 'GraduationCap',
    notice: 'NOTE : Diharuskan menggunakan email masing-masing, bukan email orang lain. Bagi yang belum memiliki NIP silahkan isi dengan tanda ( - ). BATAS AKHIR PENGISIAN LAPORAN BULANAN (e-PAI) YAITU TANGGAL 29 BULAN BERJALAN!',
    fields: [
      { id: 'reportYear', label: 'Tahun', type: 'select', options: ['2026', '2025'], required: true },
      {
        id: 'reportMonth',
        label: 'Bulan Berjalan',
        type: 'select',
        required: true,
        options: [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ]
      },
      { id: 'applicantName', label: 'Nama Lengkap Penyuluh', type: 'text', placeholder: 'Nama lengkap beserta gelar', required: true },
      { id: 'email', label: 'Email Masing-masing', type: 'email', placeholder: 'penyuluh@kemenag.go.id', required: true, helperText: 'Diharuskan menggunakan email masing-masing, bukan email orang lain' },
      { id: 'phone', label: 'No WhatsApp Aktif', type: 'text', placeholder: '081234567890', required: true },
      { id: 'nik', label: 'NIK (Nomor Induk Kependudukan)', type: 'text', placeholder: '16 digit NIK...', required: true },
      { id: 'nip', label: 'NIP', type: 'text', placeholder: '18 digit NIP atau tanda ( - )', required: true, helperText: 'Bagi yang belum memiliki NIP silahkan isi dengan tanda ( - )' },
      { id: 'nipa', label: 'NIPA (Nomor Induk Penyuluh Agama)', type: 'text', placeholder: 'Nomor NIPA penyuluh', required: true },
      {
        id: 'position',
        label: 'Jabatan',
        type: 'select',
        required: true,
        options: [
          'PENYULUH PNS',
          'PENYULUH PPPK',
          'PENYULUH NON PNS'
        ]
      },
      {
        id: 'district',
        label: 'Tempat Tugas (Kecamatan)',
        type: 'select',
        required: true,
        options: [...GOWA_DISTRICTS]
      },
      {
        id: 'file_lkb',
        label: 'Upload Dokumen Laporan Bulanan Penyuluh Agama Islam (e-PAI)',
        type: 'file',
        required: true,
        maxSizeMB: 15,
        acceptedFormats: '.pdf,.doc,.docx,.xls,.xlsx',
        helperText: 'Upload berkas lengkap Laporan Bulanan (e-PAI) beserta dokumentasi kegiatan penyuluhan. Maks 15 MB.'
      }
    ]
  }
];

export const APP_INFO = {
  name: "MALA'BIRI",
  fullName: "Manajemen Layanan Bimas Islam yang Responsif",
  section: "Seksi Bimbingan Masyarakat Islam Kantor Kementerian Agama Kabupaten Gowa",
  phone: "087890446247",
  phoneRaw: "6287890446247",
  email: "bimasislamgowa2025@gmail.com",
  officeAddress: "Jl. H. Agussalim No. 3 Sungguminasa kab. Gowa",
  workingHours: [
    { days: "Senin - Kamis", hours: "07.30 - 16.00 WITA" },
    { days: "Jumat", hours: "07.30 - 16.30 WITA" },
    { days: "Sabtu - Minggu", hours: "Tutup (Pelayanan Online Tetap Menerima Berkas)" }
  ],
  socialMedia: [
    { name: "Instagram", url: "https://instagram.com/bimasislam.gowa", handle: "@bimasislam.gowa" },
    { name: "Facebook", url: "https://www.facebook.com/profile.php?id=61587892833747", handle: "Bimas Islam Gowa" },
    { name: "TikTok", url: "https://www.tiktok.com/@kemenag.gowa", handle: "@kemenag.gowa" },
    { name: "YouTube", url: "https://www.youtube.com/@KemenagGowaOfficial", handle: "Kemenag Gowa Official" },
    { name: "Portal Kemenag", url: "https://s.id/gowa.kemenag.go.id", handle: "s.id/gowa.kemenag.go.id" }
  ]
};
