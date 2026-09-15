import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  MessageCircle, 
  Eye, 
  Download, 
  RefreshCw, 
  Send, 
  X,
  Building,
  User,
  Calendar,
  Check,
  Edit3,
  ExternalLink,
  LogOut,
  FolderDown,
  Lock,
  Database,
  Info,
  Users,
  UserPlus,
  Trash2,
  Printer,
  Cloud
} from 'lucide-react';
import { SubmissionRecord, ApplicationStatus, GOWA_DISTRICTS, OfficerSession, UploadedFileInfo, OfficerAccount } from '../types';
import { formatIndoDate } from '../utils/date';
import { updateSubmissionStatus, clearAllSubmissions, deleteSubmission } from '../utils/storage';
import { generateStatusUpdateWAMessage, openWhatsAppChat } from '../utils/whatsapp';
import { SERVICES_LIST } from '../data/services';
import { downloadFile, downloadAllFilesBatch, getStoredOfficers, saveOfficerAccount, deleteOfficerAccount, getDefaultAdminAccount } from '../utils/fileHelper';
import { getGoogleAppsScriptUrl } from '../utils/googleAppsScript';
import { DocumentViewerModal } from './DocumentViewerModal';
import { GoogleDriveIntegrationModal } from './GoogleDriveIntegrationModal';

interface VerificationAdminProps {
  submissions: SubmissionRecord[];
  onRefreshSubmissions: () => void;
  onOpenReceipt: (submission: SubmissionRecord) => void;
  officerSession: OfficerSession;
  onLogout: () => void;
}

export const VerificationAdmin: React.FC<VerificationAdminProps> = ({
  submissions,
  onRefreshSubmissions,
  onOpenReceipt,
  officerSession,
  onLogout
}) => {
  const officer = officerSession?.officer || getDefaultAdminAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterService, setFilterService] = useState<string>('ALL');
  const [filterDistrict, setFilterDistrict] = useState<string>('ALL');

  // Active modal for detailed verification
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRecord | null>(null);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('VERIFYING');
  const [officerNote, setOfficerNote] = useState('');
  const [officerName, setOfficerName] = useState(officer.name || 'Administrator Utama');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Document preview state
  const [viewingFile, setViewingFile] = useState<{
    file: UploadedFileInfo;
    submissionId?: string;
    applicantName?: string;
  } | null>(null);

  // Google Drive integration modal state
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [isGasConfigured, setIsGasConfigured] = useState(false);

  React.useEffect(() => {
    getGoogleAppsScriptUrl().then((url) => {
      setIsGasConfigured(!!url);
    });
  }, [isGoogleDriveModalOpen]);

  // Officer accounts management modal states
  const [isManageOfficersOpen, setIsManageOfficersOpen] = useState(false);
  const [officersList, setOfficersList] = useState<OfficerAccount[]>([]);
  const [showAddOfficerForm, setShowAddOfficerForm] = useState(false);
  const [newOfficerName, setNewOfficerName] = useState('');
  const [newOfficerNip, setNewOfficerNip] = useState('');
  const [newOfficerUsername, setNewOfficerUsername] = useState('');
  const [newOfficerRole, setNewOfficerRole] = useState<'KASI' | 'VERIFIKATOR'>('VERIFIKATOR');
  const [newOfficerPin, setNewOfficerPin] = useState('');
  const [officerFormError, setOfficerFormError] = useState('');

  const handleOpenManageOfficers = () => {
    setOfficersList(getStoredOfficers());
    setIsManageOfficersOpen(true);
    setShowAddOfficerForm(false);
    setOfficerFormError('');
  };

  const handleAddNewOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    setOfficerFormError('');

    if (!newOfficerName.trim()) {
      setOfficerFormError('Nama lengkap petugas wajib diisi.');
      return;
    }
    if (!newOfficerNip.trim() || newOfficerNip.trim().length < 8) {
      setOfficerFormError('NIP resmi Kemenag wajib diisi dengan benar.');
      return;
    }
    if (!newOfficerUsername.trim()) {
      setOfficerFormError('Username petugas wajib diisi.');
      return;
    }
    if (!newOfficerPin.trim() || newOfficerPin.length < 4) {
      setOfficerFormError('PIN keamanan minimal 4 karakter.');
      return;
    }

    const currentList = getStoredOfficers();
    const isDuplicate = currentList.find(
      o => o.nip === newOfficerNip.trim() || o.username.toLowerCase() === newOfficerUsername.trim().toLowerCase()
    );
    if (isDuplicate) {
      setOfficerFormError('NIP atau Username tersebut sudah terdaftar.');
      return;
    }

    const newAcc: OfficerAccount = {
      name: newOfficerName.trim(),
      nip: newOfficerNip.trim(),
      username: newOfficerUsername.trim().toLowerCase(),
      jabatan: newOfficerRole === 'KASI' ? 'Kepala Seksi Bimas Islam' : 'Verifikator Berkas Bimas Islam',
      role: newOfficerRole,
      pin: newOfficerPin.trim()
    };

    saveOfficerAccount(newAcc);
    setOfficersList(getStoredOfficers());
    setShowAddOfficerForm(false);
    setNewOfficerName('');
    setNewOfficerNip('');
    setNewOfficerUsername('');
    setNewOfficerPin('');
    setOfficerFormError('');
  };

  const handleDeleteOfficer = (nip: string) => {
    if (nip === officer.nip) {
      alert('Perhatian: Anda tidak dapat menghapus akun petugas yang sedang digunakan pada sesi ini.');
      return;
    }
    if (window.confirm('Hapus akun petugas ini dari basis data terdaftar? Petugas tersebut tidak akan bisa masuk lagi.')) {
      deleteOfficerAccount(nip);
      setOfficersList(getStoredOfficers());
    }
  };

  const handlePurgeAllSubmissions = async () => {
    if (window.confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan SELURUH data permohonan lama di sistem? Tindakan ini akan membersihkan semua data agar Anda dapat melakukan uji coba baru.')) {
      try {
        await clearAllSubmissions();
        onRefreshSubmissions();
        // Also force wipe window storage keys
        try {
          ['malabbiri_submissions', 'malabbiri_submissions_v1', 'malabbiri_submissions_v2', 'malabbiri_submissions_v3'].forEach(k => localStorage.removeItem(k));
        } catch (e) { /* ignore */ }
        alert('Seluruh data permohonan lama telah berhasil dikosongkan!');
        onRefreshSubmissions();
      } catch (err: any) {
        console.error('Gagal mengosongkan data:', err);
        onRefreshSubmissions();
      }
    }
  };

  const handleDeleteSingleSubmission = async (id: string, name: string) => {
    if (window.confirm(`Hapus berkas permohonan ${id} atas nama "${name}"?`)) {
      try {
        await deleteSubmission(id);
        onRefreshSubmissions();
      } catch (err: any) {
        console.error('Gagal menghapus data:', err);
        onRefreshSubmissions();
      }
    }
  };

  const openVerificationModal = (sub: SubmissionRecord) => {
    setSelectedSubmission(sub);
    setNewStatus(sub.status || 'VERIFYING');
    setOfficerNote(sub.officerNotes || '');
    setSaveSuccessNotice(false);
  };

  const handleStatusUpdateSubmit = (sendWA: boolean = false) => {
    if (!selectedSubmission) return;

    setIsSaving(true);
    const updated = updateSubmissionStatus(
      selectedSubmission.id,
      newStatus,
      officerNote,
      officerName
    );

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccessNotice(true);
      onRefreshSubmissions();

      if (updated) {
        setSelectedSubmission(updated);
        if (sendWA) {
          const msg = generateStatusUpdateWAMessage(updated, newStatus, officerNote);
          openWhatsAppChat(updated.phone || '', msg);
        }
      }
    }, 400);
  };

  const safeSubmissions = Array.isArray(submissions) ? submissions : [];

  const filteredList = safeSubmissions.filter(sub => {
    if (!sub) return false;
    const id = sub.id || '';
    const applicantName = sub.applicantName || '';
    const phone = sub.phone || '';
    const institutionName = sub.institutionName || '';
    const serviceId = sub.serviceId !== undefined && sub.serviceId !== null ? sub.serviceId.toString() : '';
    const district = sub.district || '';
    const status = sub.status || 'SUBMITTED';

    const matchesSearch = id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          phone.includes(searchQuery) ||
                          institutionName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || status === filterStatus;
    const matchesService = filterService === 'ALL' || serviceId === filterService;
    const matchesDistrict = filterDistrict === 'ALL' || district === filterDistrict;

    return matchesSearch && matchesStatus && matchesService && matchesDistrict;
  });

  const countPending = safeSubmissions.filter(s => s && (s.status === 'SUBMITTED' || s.status === 'VERIFYING')).length;
  const countApproved = safeSubmissions.filter(s => s && s.status === 'APPROVED').length;
  const countRevision = safeSubmissions.filter(s => s && s.status === 'REVISION_NEEDED').length;

  const exportToCSV = () => {
    const getStatusIndonesian = (st: string) => {
      switch (st) {
        case 'SUBMITTED': return 'Diajukan / Berkas Masuk';
        case 'VERIFYING': return 'Sedang Diverifikasi';
        case 'REVIEW': return 'Proses Telaah / Pengukuran';
        case 'APPROVED': return 'Disetujui & Dokumen Diterbitkan';
        case 'REVISION_NEEDED': return 'Perlu Perbaikan Berkas';
        case 'REJECTED': return 'Ditolak';
        default: return st;
      }
    };

    const headers = ['No Tiket', 'Tanggal', 'Layanan', 'Nama Pemohon', 'Instansi', 'Kecamatan', 'No HP', 'Status', 'Catatan Petugas'];
    const rows = filteredList.map(s => [
      `"${s.id || ''}"`,
      `"${s.submittedAt || ''}"`,
      `"${s.serviceTitle || ''}"`,
      `"${s.applicantName || ''}"`,
      `"${s.institutionName || '-'}"`,
      `"${s.district || '-'}"`,
      `"${s.phone || ''}"`,
      `"${getStatusIndonesian(s.status || '')}"`,
      `"${s.officerNotes || '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_layanan_malabbiri_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Active Officer Identity Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-emerald-950/70 to-slate-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-base flex-shrink-0">
            <User className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">
                {officer.name || 'Administrator Utama'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-semibold">
                {officer.role === 'KASI' ? 'Kepala Seksi' : 'Verifikator Resmi'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sesi Aktif
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {officer.role === 'KASI' ? 'Kepala Seksi Bimas Islam' : 'Verifikator Berkas Bimas Islam'} • NIP: <span className="font-mono text-emerald-300">{officer.nip || '-'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <button
            onClick={() => setIsGoogleDriveModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 hover:text-white border border-emerald-400/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Integrasi Google Drive & Google Sheets Kantor (100% Gratis Selamanya)"
          >
            <Cloud className="w-4 h-4 text-emerald-300" />
            <span>Google Drive & Sheets</span>
            {isGasConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Terhubung"></span>
            ) : (
              <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 text-[9px] font-bold">Setel</span>
            )}
          </button>

          <button
            onClick={handleOpenManageOfficers}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white border border-white/20 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Kelola Daftar Akun Petugas & Verifikator Resmi"
          >
            <Users className="w-4 h-4 text-emerald-300" />
            <span>Kelola Akun Petugas</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-200 hover:text-white border border-red-500/30 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Keluar dan Kunci Dashboard Petugas"
          >
            <LogOut className="w-4 h-4" />
            <span>Kunci & Logout</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dashboard Verifikasi Petugas Bimas Islam</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Panel Verifikasi & Validasi Dokumen
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Pemeriksaan kelengkapan berkas, validasi status permohonan, pratinjau dokumen pemohon, dan notifikasi otomatis WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePurgeAllSubmissions}
            className="px-3 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Kosongkan seluruh berkas permohonan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Arsip</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 rounded-xl glass-panel hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-2 border-white/20"
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onRefreshSubmissions}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* Storage Location & Download Information Card */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border-white/20 bg-gradient-to-r from-white/[0.08] via-emerald-950/30 to-white/[0.05] shadow-lg">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-0.5">
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-1.5 flex-1 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span>Pusat Arsip & Penyimpanan Berkas Digital Masyarakat</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-mono">
                  Basis Data Terverifikasi
                </span>
              </h4>
            </div>
            <p className="text-slate-200 leading-relaxed">
              <strong className="text-white">Lokasi Penyimpanan:</strong> Dokumen yang diunggah oleh masyarakat tersimpan secara digital dan terenkripsi pada <em>Basis Data Digital MALA'BIRI</em> serta otomatis terarsip ke <strong className="text-emerald-300">Google Drive & Google Sheets Kantor</strong> (pada file spreadsheet <code>DATA_PERMOHONAN_MALABIRI_BIMAS_ISLAM_GOWA</code>).
            </p>
            <p className="text-slate-200 leading-relaxed">
              <strong className="text-white">Cara Mengunduh Berkas:</strong> Verifikator dapat menekan tombol <strong className="text-emerald-300">"Periksa & Unduh Berkas"</strong> pada baris pemohon di tabel bawah. Pada jendela verifikasi, Anda dapat melakukan <span className="underline decoration-emerald-400">Pratinjau visual (Preview)</span> langsung, mengunduh file asli per dokumen, atau menekan tombol <strong className="text-white">"Unduh Semua Berkas Sekaligus"</strong> untuk menyimpan seluruh lampiran ke komputer.
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border-white/15">
          <span className="text-xs text-slate-400 block mb-1">Total Permohonan</span>
          <span className="text-2xl font-extrabold text-white">{submissions.length}</span>
          <span className="text-[10px] text-slate-400 block mt-1">Seluruh layanan digital</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-amber-500/30 bg-amber-950/20">
          <span className="text-xs text-amber-300 block mb-1">Menunggu / Diverifikasi</span>
          <span className="text-2xl font-extrabold text-amber-300">{countPending}</span>
          <span className="text-[10px] text-amber-200/80 block mt-1">Perlu ditindaklanjuti</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-emerald-500/30 bg-emerald-950/20">
          <span className="text-xs text-emerald-300 block mb-1">Disetujui & Selesai</span>
          <span className="text-2xl font-extrabold text-emerald-300">{countApproved}</span>
          <span className="text-[10px] text-emerald-200/80 block mt-1">SKT / Rekomendasi Terbit</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-rose-500/30 bg-rose-950/20">
          <span className="text-xs text-rose-300 block mb-1">Perlu Perbaikan (Revisi)</span>
          <span className="text-2xl font-extrabold text-rose-300">{countRevision}</span>
          <span className="text-[10px] text-rose-200/80 block mt-1">Menunggu respon pemohon</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border-white/15 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID tiket, nama, HP..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
            >
              <option value="ALL" className="bg-slate-900">Semua Status</option>
              <option value="SUBMITTED" className="bg-slate-900">Diajukan (Baru)</option>
              <option value="VERIFYING" className="bg-slate-900">Sedang Diverifikasi</option>
              <option value="REVIEW" className="bg-slate-900">Proses Telaah / Pengukuran</option>
              <option value="APPROVED" className="bg-slate-900">Disetujui & Selesai</option>
              <option value="REVISION_NEEDED" className="bg-slate-900">Perlu Revisi</option>
              <option value="REJECTED" className="bg-slate-900">Ditolak</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white truncate"
            >
              <option value="ALL" className="bg-slate-900">Semua 9 Layanan</option>
              {SERVICES_LIST.map(svc => (
                <option key={svc.id} value={svc.id.toString()} className="bg-slate-900">
                  Layanan #{svc.id}: {svc.shortTitle}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div>
            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
            >
              <option value="ALL" className="bg-slate-900">Semua Kecamatan (18)</option>
              {GOWA_DISTRICTS.map(dist => (
                <option key={dist} value={dist} className="bg-slate-900">
                  Kec. {dist}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="glass-panel rounded-2xl border-white/15 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-white/[0.05] text-[11px] uppercase font-bold text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-3.5">ID Tiket</th>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">Layanan</th>
                <th className="px-5 py-3.5">Pemohon & Lembaga</th>
                <th className="px-5 py-3.5">Kecamatan</th>
                <th className="px-5 py-3.5">Berkas</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredList.map((sub) => {
                const filesCount = Array.isArray(sub.files) ? sub.files.length : 0;
                return (
                <tr key={sub.id || Math.random().toString()} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-white whitespace-nowrap">
                    {sub.id || '-'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-slate-400 text-[11px]">
                    {sub.submittedAt ? formatIndoDate(sub.submittedAt) : '-'}
                  </td>
                  <td className="px-5 py-4 font-semibold text-white max-w-[200px] truncate">
                    {sub.serviceTitle || 'Layanan'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white truncate max-w-[180px]">{sub.applicantName || '-'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{sub.phone || '-'}</div>
                    {sub.institutionName && (
                      <div className="text-[10px] text-emerald-300 truncate max-w-[180px]">{sub.institutionName}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-slate-300 font-medium">
                    {sub.district ? `Kec. ${sub.district}` : '-'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20">
                      <FileText className="w-3 h-3" />
                      {filesCount} file
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {sub.status === 'APPROVED' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Disetujui
                      </span>
                    )}
                    {sub.status === 'VERIFYING' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Verifikasi
                      </span>
                    )}
                    {sub.status === 'REVIEW' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Telaah
                      </span>
                    )}
                    {sub.status === 'SUBMITTED' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Baru
                      </span>
                    )}
                    {sub.status === 'REVISION_NEEDED' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Perlu Revisi
                      </span>
                    )}
                    {sub.status === 'REJECTED' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                        Ditolak
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                    <button
                      onClick={() => openVerificationModal(sub)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Periksa data dan unduh berkas pemohon"
                    >
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>Periksa & Unduh Berkas</span>
                    </button>

                    <button
                      onClick={() => onOpenReceipt(sub)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10 inline-flex items-center transition-colors cursor-pointer"
                      title="Cetak Tanda Terima (Kop Resmi Kemenag Gowa)"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        const msg = generateStatusUpdateWAMessage(sub, sub.status, sub.officerNotes);
                        openWhatsAppChat(sub.phone || '', msg);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10 inline-flex items-center transition-colors cursor-pointer"
                      title="Kirim Notifikasi WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      onClick={() => handleDeleteSingleSubmission(sub.id, sub.applicantName || 'Pemohon')}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-300 border border-red-500/20 inline-flex items-center transition-colors cursor-pointer"
                      title="Hapus Data Permohonan Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredList.length === 0 && (
          <div className="p-12 text-center text-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">
              {submissions.length === 0 
                ? 'Belum Ada Berkas Permohonan Masuk' 
                : 'Tidak Ada Permohonan yang Sesuai dengan Filter'}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {submissions.length === 0
                ? 'Seluruh data demo telah dibersihkan. Setiap berkas dan lampiran yang diajukan oleh masyarakat melalui formulir layanan online akan langsung masuk ke tabel ini untuk diperiksa dan divalidasi.'
                : 'Coba ubah kata kunci pencarian atau sesuaikan opsi filter status, layanan, atau kecamatan.'}
            </p>
          </div>
        )}
      </div>

      {/* DETAILED VERIFICATION MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl glass-modal rounded-3xl overflow-hidden border border-white/20 shadow-2xl my-6">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950/80 to-cyan-950/80 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Verifikasi Dokumen: {selectedSubmission.id}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {selectedSubmission.serviceTitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 text-xs">
              {saveSuccessNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Status dokumen berhasil diperbarui di sistem MALA'BIRI!</span>
                </div>
              )}

              {/* Applicant Info Banner */}
              <div className="glass-panel p-4 rounded-2xl border-white/15 space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Informasi Pemohon & Lokasi:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block">Nama Pemohon:</span>
                    <strong className="text-white text-sm font-semibold">{selectedSubmission.applicantName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nomor HP/WA:</span>
                    <strong className="text-emerald-300 font-mono text-sm">{selectedSubmission.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Kecamatan:</span>
                    <strong className="text-white">{selectedSubmission.district || '-'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block">Alamat:</span>
                    <p className="text-slate-200">{selectedSubmission.address || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Kode Verifikasi:</span>
                    <span className="font-mono font-bold text-emerald-400">{selectedSubmission.verificationCode || selectedSubmission.id}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Preview & Download */}
              <div className="glass-panel p-4 rounded-2xl border-white/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-white/10">
                  <div>
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FolderDown className="w-4 h-4 text-emerald-400" />
                      <span>Lampiran Berkas yang Diunggah ({Array.isArray(selectedSubmission.files) ? selectedSubmission.files.length : 0} File):</span>
                    </h4>
                    <p className="text-[10px] text-emerald-300">
                      Tersimpan di Basis Data MALA'BIRI • Pratinjau dokumen atau unduh file asli
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadAllFilesBatch(Array.isArray(selectedSubmission.files) ? selectedSubmission.files : [], selectedSubmission.id, selectedSubmission.applicantName)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-md transition-all self-start sm:self-auto cursor-pointer"
                    title="Unduh semua berkas pemohon ini sekaligus ke komputer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Semua Berkas</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {(Array.isArray(selectedSubmission.files) ? selectedSubmission.files : []).map((file, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 transition-all gap-2"
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1">
                        <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-300 flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-white truncate text-xs">{file.fileName}</p>
                          <p className="text-[10px] text-slate-300">{file.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-emerald-300">
                              {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                            </span>
                            <span className="text-[10px] text-slate-400">
                              • {new Date(file.uploadedAt).toLocaleDateString('id-ID')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold">
                              {file.cloudStorageUrl ? 'Firebase Cloud' : 'Tersimpan Digital'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => setViewingFile({ file, submissionId: selectedSubmission.id, applicantName: selectedSubmission.applicantName })}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                          title="Lihat Pratinjau Dokumen"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Pratinjau</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadFile(file, selectedSubmission.id, selectedSubmission.applicantName)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                          title="Unduh File Asli ke Komputer Verifikator"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh File</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Update Form */}
              <div className="glass-panel p-5 rounded-2xl border-emerald-500/30 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Ubah Status & Validasi Dokumen</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-200">
                      Pilih Status Dokumen:
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white font-semibold"
                    >
                      <option value="SUBMITTED" className="bg-slate-900">Diajukan / Berkas Masuk</option>
                      <option value="VERIFYING" className="bg-slate-900">Sedang Diverifikasi</option>
                      <option value="REVIEW" className="bg-slate-900">Proses Telaah / Pengukuran</option>
                      <option value="APPROVED" className="bg-slate-900">Disetujui & Dokumen Diterbitkan</option>
                      <option value="REVISION_NEEDED" className="bg-slate-900">Perlu Perbaikan Berkas</option>
                      <option value="REJECTED" className="bg-slate-900">Ditolak</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-200">
                      Nama Petugas Verifikator:
                    </label>
                    <input
                      type="text"
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-200">
                      Catatan / Keterangan Petugas (Ditampilkan ke Pemohon & WA):
                    </label>
                    <textarea
                      rows={3}
                      value={officerNote}
                      onChange={(e) => setOfficerNote(e.target.value)}
                      placeholder="Contoh: Berkas persyaratan lengkap dan sesuai PMA 29/2019. SKT nomor B-1204 telah diterbitkan."
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-white resize-none"
                    />
                  </div>
                </div>

                {/* Notification Preview */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Format Pesan WhatsApp yang akan dikirim:
                  </span>
                  <p className="font-mono text-[10px] text-emerald-300 line-clamp-3">
                    {generateStatusUpdateWAMessage(selectedSubmission, newStatus, officerNote)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSubmission) {
                          handleDeleteSingleSubmission(selectedSubmission.id, selectedSubmission.applicantName || 'Pemohon');
                          setSelectedSubmission(null);
                        }
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-red-950/30 hover:bg-red-900/50 text-red-300 border border-red-500/30 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      title="Hapus permohonan ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Permohonan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenReceipt(selectedSubmission)}
                      className="px-3.5 py-2.5 rounded-xl glass-panel hover:bg-white/10 text-slate-300 font-semibold text-xs flex items-center gap-2 cursor-pointer"
                      title="Pratinjau Tanda Terima Resmi (Kop Surat Kemenag Gowa)"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cetak Tanda Terima</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleStatusUpdateSubmit(false)}
                      className="px-4 py-2.5 rounded-xl glass-panel hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 border-white/20"
                    >
                      <span>Simpan Status</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleStatusUpdateSubmit(true)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>Simpan & Kirim WA Pemohon</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW & DOWNLOAD MODAL */}
      {viewingFile && (
        <DocumentViewerModal
          file={viewingFile.file}
          submissionId={viewingFile.submissionId}
          applicantName={viewingFile.applicantName}
          onClose={() => setViewingFile(null)}
        />
      )}

      {/* MANAGE OFFICERS MODAL */}
      {isManageOfficersOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl glass-modal rounded-3xl overflow-hidden border border-white/20 shadow-2xl my-6">
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950/80 to-cyan-950/80 px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Kelola Akun Petugas & Verifikator</h3>
                  <p className="text-[11px] text-slate-300">Daftar akun berwenang Seksi Bimas Islam Kemenag Gowa</p>
                </div>
              </div>
              <button
                onClick={() => setIsManageOfficersOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-bold text-sm">Daftar Petugas Terdaftar</span>
                  <p className="text-slate-400 text-[11px]">Total: {officersList.length} Petugas</p>
                </div>
                <button
                  onClick={() => setShowAddOfficerForm(!showAddOfficerForm)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddOfficerForm ? 'Batal' : 'Tambah Petugas'}</span>
                </button>
              </div>

              {/* Add New Officer Form */}
              {showAddOfficerForm && (
                <form onSubmit={handleAddNewOfficer} className="p-4 rounded-2xl bg-white/5 border border-emerald-500/30 space-y-3">
                  <h4 className="font-bold text-emerald-300 text-xs">Formulir Tambah Petugas Resmi</h4>
                  
                  {officerFormError && (
                    <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-200 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span>{officerFormError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300">Nama Lengkap & Gelar:</label>
                      <input
                        type="text"
                        value={newOfficerName}
                        onChange={(e) => setNewOfficerName(e.target.value)}
                        placeholder="Nama dan Gelar"
                        className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300">NIP Pegawai:</label>
                      <input
                        type="text"
                        value={newOfficerNip}
                        onChange={(e) => setNewOfficerNip(e.target.value)}
                        placeholder="NIP 18 digit"
                        className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300">Username:</label>
                      <input
                        type="text"
                        value={newOfficerUsername}
                        onChange={(e) => setNewOfficerUsername(e.target.value)}
                        placeholder="username"
                        className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300">Peran / Hak Akses:</label>
                      <select
                        value={newOfficerRole}
                        onChange={(e) => setNewOfficerRole(e.target.value as 'KASI' | 'VERIFIKATOR')}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/20 text-white text-xs"
                      >
                        <option value="VERIFIKATOR">Verifikator Berkas Digital</option>
                        <option value="KASI">Kepala Seksi (KASI) Bimas Islam</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300">PIN / Sandi Keamanan:</label>
                    <input
                      type="password"
                      value={newOfficerPin}
                      onChange={(e) => setNewOfficerPin(e.target.value)}
                      placeholder="PIN minimal 4 karakter"
                      className="w-full px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Simpan Akun Petugas
                    </button>
                  </div>
                </form>
              )}

              {/* List of registered officers */}
              <div className="space-y-2.5">
                {officersList.map((off) => (
                  <div
                    key={off.nip}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{off.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-400/30">
                          {off.role}
                        </span>
                        {off.nip === officerSession.officer.nip && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] border border-blue-400/30">
                            Anda
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        NIP: <span className="font-mono text-slate-300">{off.nip}</span> • User: <span className="font-mono text-slate-300">{off.username}</span>
                      </p>
                      <p className="text-slate-400 text-[11px]">{off.role === 'KASI' ? 'Kepala Seksi Bimas Islam' : 'Verifikator Berkas Bimas Islam'}</p>
                    </div>

                    <div>
                      {off.nip !== officerSession.officer.nip && (
                        <button
                          onClick={() => handleDeleteOfficer(off.nip)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-300 border border-red-500/20 transition-all cursor-pointer"
                          title="Hapus akun petugas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-900/90 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsManageOfficersOpen(false)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Integration Modal */}
      <GoogleDriveIntegrationModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => {
          setIsGoogleDriveModalOpen(false);
          getGoogleAppsScriptUrl().then((url) => setIsGasConfigured(!!url));
        }}
        officerName={officer.name}
      />
    </div>
  );
};
