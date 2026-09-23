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
  Cloud,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import { SubmissionRecord, ApplicationStatus, EpaiGrade, GOWA_DISTRICTS, OfficerSession, UploadedFileInfo, OfficerAccount } from '../types';
import { formatIndoDate } from '../utils/date';
import { updateSubmissionStatus, clearAllSubmissions, deleteSubmission } from '../utils/storage';
import { generateStatusUpdateWAMessage, openWhatsAppChat } from '../utils/whatsapp';
import { SERVICES_LIST } from '../data/services';
import { downloadFile, downloadAllFilesBatch, getStoredOfficers, saveOfficerAccount, deleteOfficerAccount, getDefaultAdminAccount } from '../utils/fileHelper';
import { getGoogleAppsScriptUrl, sendSubmissionToGoogleSheetViaScript } from '../utils/googleAppsScript';
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
  const [epaiGrade, setEpaiGrade] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  const isEpaiSubmission = (sub?: SubmissionRecord | null) => {
    if (!sub) return false;
    return (
      sub.serviceId === 9 ||
      sub.formData?.serviceCode === 'EPAI-PENYULUH' ||
      (sub.serviceTitle && (
        sub.serviceTitle.toLowerCase().includes('e-pai') ||
        sub.serviceTitle.toLowerCase().includes('penyuluh')
      ))
    );
  };

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

  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  const handleSyncSingleToGoogleSheet = async (sub: SubmissionRecord) => {
    const gasUrl = await getGoogleAppsScriptUrl();
    if (!gasUrl) {
      setIsGoogleDriveModalOpen(true);
      alert('URL Webhook Google Drive & Sheet belum dikonfigurasi. Silakan simpan URL Webhook Anda terlebih dahulu.');
      return;
    }

    const driveLinks = (sub.files || [])
      .filter(f => f.googleDriveViewUrl)
      .map(f => `${f.fileName}: ${f.googleDriveViewUrl}`);

    const res = await sendSubmissionToGoogleSheetViaScript(gasUrl, {
      id: sub.id,
      serviceTitle: sub.serviceTitle,
      applicantName: sub.applicantName,
      phone: sub.phone || '',
      email: sub.email,
      district: sub.district,
      address: sub.address || '',
      institutionName: sub.institutionName,
      status: sub.status,
      submittedAt: sub.submittedAt,
      filesCount: (sub.files || []).length,
      fileUrls: driveLinks,
      formData: sub.formData
    });

    if (res.success) {
      alert(`Berhasil! Data permohonan ${sub.id} (${sub.applicantName}) telah dikirim ke Google Sheets kantor.`);
    } else {
      alert(`Gagal mengirim ke Google Sheets: ${res.message}. Pastikan Webhook Apps Script sudah di-deploy dengan versi baru.`);
    }
  };

  const handleSyncAllToGoogleSheet = async () => {
    const gasUrl = await getGoogleAppsScriptUrl();
    if (!gasUrl) {
      setIsGoogleDriveModalOpen(true);
      alert('URL Webhook Google Drive & Sheet belum dikonfigurasi. Silakan simpan URL Webhook Anda terlebih dahulu.');
      return;
    }

    if (submissions.length === 0) {
      alert('Belum ada data permohonan untuk dikirim.');
      return;
    }

    setIsSyncingSheet(true);
    let successCount = 0;

    for (const sub of submissions) {
      const driveLinks = (sub.files || [])
        .filter(f => f.googleDriveViewUrl)
        .map(f => `${f.fileName}: ${f.googleDriveViewUrl}`);

      const res = await sendSubmissionToGoogleSheetViaScript(gasUrl, {
        id: sub.id,
        serviceTitle: sub.serviceTitle,
        applicantName: sub.applicantName,
        phone: sub.phone || '',
        email: sub.email,
        district: sub.district,
        address: sub.address || '',
        institutionName: sub.institutionName,
        status: sub.status,
        submittedAt: sub.submittedAt,
        filesCount: (sub.files || []).length,
        fileUrls: driveLinks,
        formData: sub.formData
      });

      if (res.success) successCount++;
    }

    setIsSyncingSheet(false);
    alert(`Selesai! Sebanyak ${successCount} dari ${submissions.length} data permohonan berhasil dikirim ke Google Sheets kantor.`);
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
    setEpaiGrade(sub.epaiGrade || '');
    setSaveSuccessNotice(false);
  };

  const handleStatusUpdateSubmit = (sendWA: boolean = false) => {
    if (!selectedSubmission) return;

    setIsSaving(true);
    const updated = updateSubmissionStatus(
      selectedSubmission.id,
      newStatus,
      officerNote,
      officerName,
      isEpaiSubmission(selectedSubmission) ? (epaiGrade || undefined) : undefined
    );

    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccessNotice(true);
      onRefreshSubmissions();

      if (updated) {
        setSelectedSubmission(updated);
        if (sendWA) {
          const msg = generateStatusUpdateWAMessage(
            updated, 
            newStatus, 
            officerNote,
            isEpaiSubmission(updated) ? (epaiGrade || undefined) : undefined
          );
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
  const countApproved = safeSubmissions.filter(s => s && (s.status === 'APPROVED' || s.status === 'COMPLETED')).length;
  const countRevision = safeSubmissions.filter(s => s && s.status === 'REVISION_NEEDED').length;

  const exportToCSV = () => {
    const getStatusIndonesian = (st: string) => {
      switch (st) {
        case 'SUBMITTED': return 'Diajukan / Berkas Masuk';
        case 'VERIFYING': return 'Sedang Diverifikasi';
        case 'REVIEW': return 'Proses Telaah / Pengukuran';
        case 'APPROVED': return 'Disetujui';
        case 'COMPLETED': return 'Disetujui & Dokumen Diterbitkan';
        case 'REVISION_NEEDED': return 'Perlu Perbaikan Berkas';
        case 'REJECTED': return 'Ditolak';
        default: return st;
      }
    };

    const headers = ['No Tiket', 'Tanggal', 'Layanan', 'Nama Pemohon', 'Instansi', 'Kecamatan', 'No HP', 'Status', 'Penilaian e-PAI', 'Catatan Petugas'];
    const rows = filteredList.map(s => [
      `"${s.id || ''}"`,
      `"${s.submittedAt || ''}"`,
      `"${s.serviceTitle || ''}"`,
      `"${s.applicantName || ''}"`,
      `"${s.institutionName || '-'}"`,
      `"${s.district || '-'}"`,
      `"${s.phone || ''}"`,
      `"${getStatusIndonesian(s.status || '')}"`,
      `"${s.epaiGrade || '-'}"`,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Active Officer Identity Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-base flex-shrink-0">
            <User className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                {officer.name || 'Administrator Utama'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                {officer.role === 'KASI' ? 'Kepala Seksi' : 'Verifikator Resmi'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Sesi Aktif
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {officer.role === 'KASI' ? 'Kepala Seksi Bimas Islam' : 'Verifikator Berkas Bimas Islam'} • NIP: <span className="font-mono text-slate-900 font-bold">{officer.nip || '-'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <button
            onClick={() => setIsGoogleDriveModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="Integrasi Google Drive & Google Sheets Kantor (100% Gratis Selamanya)"
          >
            <Cloud className="w-4 h-4 text-emerald-700" />
            <span>Google Drive & Sheets</span>
            {isGasConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" title="Terhubung"></span>
            ) : (
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold border border-amber-200">Setel</span>
            )}
          </button>

          <button
            onClick={handleSyncAllToGoogleSheet}
            disabled={isSyncingSheet || submissions.length === 0}
            className="px-3.5 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Kirim dan Perbarui Seluruh Data Permohonan ke Google Sheets Kantor"
          >
            <FileSpreadsheet className={`w-4 h-4 text-teal-700 ${isSyncingSheet ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheet ? 'Merekam ke Sheet...' : 'Sinkron ke Sheets'}</span>
          </button>

          <button
            onClick={handleOpenManageOfficers}
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="Kelola Daftar Akun Petugas & Verifikator Resmi"
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span>Kelola Akun Petugas</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Dashboard Verifikasi Petugas Bimas Islam</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Panel Verifikasi & Validasi Dokumen
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Pemeriksaan kelengkapan berkas, validasi status permohonan, pratinjau dokumen pemohon, dan notifikasi otomatis WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePurgeAllSubmissions}
            className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kosongkan seluruh berkas permohonan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Arsip</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onRefreshSubmissions}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block mb-1">Total Permohonan</span>
          <span className="text-2xl font-bold text-slate-900">{submissions.length}</span>
          <span className="text-[10px] text-slate-500 block mt-1 font-medium">Seluruh layanan digital</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-xs text-amber-800 font-semibold block mb-1">Menunggu / Diverifikasi</span>
          <span className="text-2xl font-bold text-amber-700">{countPending}</span>
          <span className="text-[10px] text-amber-700 block mt-1 font-medium">Perlu ditindaklanjuti</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs text-emerald-800 font-semibold block mb-1">Disetujui & Selesai</span>
          <span className="text-2xl font-bold text-emerald-700">{countApproved}</span>
          <span className="text-[10px] text-emerald-700 block mt-1 font-medium">SKT / Rekomendasi Terbit</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-xs text-rose-800 font-semibold block mb-1">Perlu Perbaikan (Revisi)</span>
          <span className="text-2xl font-bold text-rose-700">{countRevision}</span>
          <span className="text-[10px] text-rose-700 block mt-1 font-medium">Menunggu respon pemohon</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID tiket, nama, HP..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
            >
              <option value="ALL">Semua Status</option>
              <option value="SUBMITTED">Diajukan (Baru)</option>
              <option value="VERIFYING">Sedang Diverifikasi</option>
              <option value="REVIEW">Proses Telaah / Pengukuran</option>
              <option value="APPROVED">Disetujui</option>
              <option value="COMPLETED">Disetujui & Dokumen Diterbitkan</option>
              <option value="REVISION_NEEDED">Perlu Revisi</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium truncate"
            >
              <option value="ALL">Semua 9 Layanan</option>
              {SERVICES_LIST.map(svc => (
                <option key={svc.id} value={svc.id.toString()}>
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
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white font-medium"
            >
              <option value="ALL">Semua Kecamatan (18)</option>
              {GOWA_DISTRICTS.map(dist => (
                <option key={dist} value={dist}>
                  Kec. {dist}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-[11px] uppercase font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-slate-700">ID Tiket</th>
                <th className="px-4 py-3.5 text-slate-700">Tanggal</th>
                <th className="px-4 py-3.5 text-slate-700">Layanan</th>
                <th className="px-4 py-3.5 text-slate-700">Pemohon & Lembaga</th>
                <th className="px-4 py-3.5 text-slate-700">Kecamatan</th>
                <th className="px-4 py-3.5 text-slate-700">Berkas</th>
                <th className="px-4 py-3.5 text-slate-700">Status</th>
                <th className="px-4 py-3.5 text-right text-slate-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredList.map((sub) => {
                const filesCount = Array.isArray(sub.files) ? sub.files.length : 0;
                return (
                <tr key={sub.id || Math.random().toString()} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-800 whitespace-nowrap">
                    {sub.id || '-'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 text-[11px] font-medium">
                    {sub.submittedAt ? formatIndoDate(sub.submittedAt) : '-'}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-[200px] truncate">
                    {sub.serviceTitle || 'Layanan'}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900 truncate max-w-[180px]">{sub.applicantName || '-'}</div>
                    <div className="text-[11px] text-slate-500 font-mono font-medium">{sub.phone || '-'}</div>
                    {sub.institutionName && (
                      <div className="text-[11px] text-emerald-700 truncate max-w-[180px] font-medium">{sub.institutionName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 font-medium">
                    {sub.district ? `Kec. ${sub.district}` : '-'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <FileText className="w-3 h-3 text-emerald-700" />
                      {filesCount} file
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {sub.status === 'APPROVED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Disetujui
                      </span>
                    )}
                    {sub.status === 'COMPLETED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        Dokumen Terbit
                      </span>
                    )}
                    {sub.status === 'VERIFYING' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Verifikasi
                      </span>
                    )}
                    {sub.status === 'REVIEW' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        Telaah
                      </span>
                    )}
                    {sub.status === 'SUBMITTED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                        Baru
                      </span>
                    )}
                    {sub.status === 'REVISION_NEEDED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                        Perlu Revisi
                      </span>
                    )}
                    {sub.status === 'REJECTED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        Ditolak
                      </span>
                    )}

                    {sub.epaiGrade && (
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          sub.epaiGrade === 'Baik Sekali'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : sub.epaiGrade === 'Baik'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : sub.epaiGrade === 'Cukup'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}>
                          <Award className="w-3 h-3 flex-shrink-0" />
                          <span>Nilai: {sub.epaiGrade}</span>
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-right space-x-1.5">
                    <button
                      onClick={() => openVerificationModal(sub)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Periksa data dan unduh berkas pemohon"
                    >
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>Periksa Berkas</span>
                    </button>

                    <button
                      onClick={() => onOpenReceipt(sub)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 inline-flex items-center transition-colors cursor-pointer"
                      title="Cetak Tanda Terima (Kop Resmi Kemenag Gowa)"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                    </button>

                    <button
                      onClick={() => {
                        const msg = generateStatusUpdateWAMessage(sub, sub.status, sub.officerNotes);
                        openWhatsAppChat(sub.phone || '', msg);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center transition-colors cursor-pointer"
                      title="Kirim Notifikasi WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <button
                      onClick={() => handleDeleteSingleSubmission(sub.id, sub.applicantName || 'Pemohon')}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center transition-colors cursor-pointer"
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
          <div className="p-12 text-center text-slate-600 space-y-3 bg-white">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {submissions.length === 0 
                ? 'Belum Ada Berkas Permohonan Masuk' 
                : 'Tidak Ada Permohonan yang Sesuai dengan Filter'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
              {submissions.length === 0
                ? 'Seluruh data demo telah dibersihkan. Setiap berkas dan lampiran yang diajukan oleh masyarakat melalui formulir layanan online akan langsung masuk ke tabel ini untuk diperiksa dan divalidasi.'
                : 'Coba ubah kata kunci pencarian atau sesuaikan opsi filter status, layanan, atau kecamatan.'}
            </p>
          </div>
        )}
      </div>

      {/* DETAILED VERIFICATION MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xl my-6">
            {/* Modal Header */}
            <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Verifikasi Dokumen: {selectedSubmission.id}
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    {selectedSubmission.serviceTitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 text-xs bg-slate-50 text-slate-800">
              {saveSuccessNotice && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span className="font-semibold">Status dokumen berhasil diperbarui di sistem MALA'BIRI!</span>
                </div>
              )}

              {/* Applicant Info Banner */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Informasi Pemohon & Lokasi:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 font-medium block">Nama Pemohon:</span>
                    <strong className="text-slate-900 text-sm font-semibold">{selectedSubmission.applicantName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Nomor HP/WA:</span>
                    <strong className="text-emerald-700 font-mono text-sm">{selectedSubmission.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Kecamatan:</span>
                    <strong className="text-slate-900">{selectedSubmission.district || '-'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 font-medium block">Alamat:</span>
                    <p className="text-slate-800 font-medium">{selectedSubmission.address || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Kode Verifikasi:</span>
                    <span className="font-mono font-bold text-emerald-700">{selectedSubmission.verificationCode || selectedSubmission.id}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Preview & Download */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <FolderDown className="w-4 h-4 text-emerald-700" />
                      <span>Lampiran Berkas yang Diunggah ({Array.isArray(selectedSubmission.files) ? selectedSubmission.files.length : 0} File):</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Tersimpan di Basis Data MALA'BIRI • Pratinjau dokumen atau unduh file asli
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadAllFilesBatch(Array.isArray(selectedSubmission.files) ? selectedSubmission.files : [], selectedSubmission.id, selectedSubmission.applicantName)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
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
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-600 transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 flex-shrink-0 border border-emerald-200">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 truncate text-xs">{file.fileName}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{file.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-emerald-700 font-medium">
                              {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {new Date(file.uploadedAt).toLocaleDateString('id-ID')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-semibold">
                              {file.cloudStorageUrl ? 'Firebase Cloud' : 'Tersimpan Digital'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => setViewingFile({ file, submissionId: selectedSubmission.id, applicantName: selectedSubmission.applicantName })}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Lihat Pratinjau Dokumen"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>Pratinjau</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadFile(file, selectedSubmission.id, selectedSubmission.applicantName)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
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
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Ubah Status & Validasi Dokumen</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Pilih Status Dokumen:
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    >
                      <option value="SUBMITTED">Diajukan / Berkas Masuk</option>
                      <option value="VERIFYING">Sedang Diverifikasi</option>
                      <option value="REVIEW">Proses Telaah / Pengukuran</option>
                      <option value="APPROVED">Disetujui</option>
                      <option value="COMPLETED">Disetujui & Dokumen Diterbitkan</option>
                      <option value="REVISION_NEEDED">Perlu Perbaikan Berkas</option>
                      <option value="REJECTED">Ditolak</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Nama Petugas Verifikator:
                    </label>
                    <input
                      type="text"
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    />
                  </div>

                  {/* Khusus Layanan Laporan e-PAI: Penilaian Evaluasi Laporan Bulanan Penyuluh */}
                  {isEpaiSubmission(selectedSubmission) && (
                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-700" />
                          <label className="text-xs font-bold text-slate-900">
                            Penilaian Laporan Bulanan Penyuluh (e-PAI):
                          </label>
                        </div>
                        {epaiGrade && (
                          <button
                            type="button"
                            onClick={() => setEpaiGrade('')}
                            className="text-[10px] font-semibold text-slate-500 hover:text-rose-600 underline cursor-pointer"
                          >
                            Hapus Pilihan
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Pilih salah satu predikat penilaian evaluasi atas berkas laporan bulanan yang diverifikasi:
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          {
                            grade: 'Baik Sekali',
                            color: 'border-emerald-300 bg-white text-emerald-900',
                            activeClass: 'ring-2 ring-emerald-600 bg-emerald-100/90 text-emerald-950 font-extrabold shadow-xs border-emerald-500',
                            stars: '★★★★',
                            desc: 'Sangat Memuaskan'
                          },
                          {
                            grade: 'Baik',
                            color: 'border-blue-300 bg-white text-blue-900',
                            activeClass: 'ring-2 ring-blue-600 bg-blue-100/90 text-blue-950 font-extrabold shadow-xs border-blue-500',
                            stars: '★★★',
                            desc: 'Sesuai Standar'
                          },
                          {
                            grade: 'Cukup',
                            color: 'border-amber-300 bg-white text-amber-900',
                            activeClass: 'ring-2 ring-amber-600 bg-amber-100/90 text-amber-950 font-extrabold shadow-xs border-amber-500',
                            stars: '★★',
                            desc: 'Cukup Memadai'
                          },
                          {
                            grade: 'Kurang',
                            color: 'border-rose-300 bg-white text-rose-900',
                            activeClass: 'ring-2 ring-rose-600 bg-rose-100/90 text-rose-950 font-extrabold shadow-xs border-rose-500',
                            stars: '★',
                            desc: 'Perlu Peningkatan'
                          }
                        ].map((opt) => {
                          const isSelected = epaiGrade === opt.grade;
                          return (
                            <button
                              key={opt.grade}
                              type="button"
                              onClick={() => {
                                setEpaiGrade(opt.grade);
                                if (!officerNote) {
                                  setOfficerNote(`Laporan bulanan e-PAI telah diverifikasi dan memperoleh predikat: ${opt.grade}.`);
                                }
                              }}
                              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected ? opt.activeClass : `${opt.color} hover:bg-slate-50`
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{opt.grade}</span>
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold ${
                                  isSelected ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-slate-50 text-transparent'
                                }`}>
                                  ✓
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-500 tracking-widest mt-1">{opt.stars}</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>

                      {epaiGrade && (
                        <div className="text-[11px] font-semibold text-emerald-800 bg-white/90 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span>Predikat Terpilih: <strong>{epaiGrade}</strong>. Hasil penilaian ini akan tersimpan ke sistem MALA'BIRI dan dikirim ke pemohon melalui WhatsApp.</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-800">
                      Catatan / Keterangan Petugas (Ditampilkan ke Pemohon & WA):
                    </label>
                    <textarea
                      rows={3}
                      value={officerNote}
                      onChange={(e) => setOfficerNote(e.target.value)}
                      placeholder="Contoh: Berkas persyaratan lengkap dan sesuai PMA 29/2019. SKT nomor B-1204 telah diterbitkan."
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 resize-none font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Notification Preview */}
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Format Pesan WhatsApp yang akan dikirim:
                  </span>
                  <p className="font-mono text-[10px] text-slate-700 line-clamp-3">
                    {generateStatusUpdateWAMessage(
                      selectedSubmission, 
                      newStatus, 
                      officerNote,
                      isEpaiSubmission(selectedSubmission) ? (epaiGrade || undefined) : undefined
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSubmission) {
                          handleDeleteSingleSubmission(selectedSubmission.id, selectedSubmission.applicantName || 'Pemohon');
                          setSelectedSubmission(null);
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Hapus permohonan ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Permohonan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenReceipt(selectedSubmission)}
                      className="px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer border border-slate-200 transition-colors shadow-xs"
                      title="Pratinjau Tanda Terima Resmi (Kop Surat Kemenag Gowa)"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Cetak Tanda Terima</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleStatusUpdateSubmit(false)}
                      className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-xs transition-colors"
                    >
                      <span>Simpan Status</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleStatusUpdateSubmit(true)}
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xl my-6">
            <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-base font-bold text-white">Kelola Akun Petugas & Verifikator</h3>
                  <p className="text-[11px] text-emerald-100">Daftar akun berwenang Seksi Bimas Islam Kemenag Gowa</p>
                </div>
              </div>
              <button
                onClick={() => setIsManageOfficersOpen(false)}
                className="w-8 h-8 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs bg-slate-50 text-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-900 font-bold text-sm">Daftar Petugas Terdaftar</span>
                  <p className="text-slate-500 text-[11px]">Total: {officersList.length} Petugas</p>
                </div>
                <button
                  onClick={() => setShowAddOfficerForm(!showAddOfficerForm)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddOfficerForm ? 'Batal' : 'Tambah Petugas'}</span>
                </button>
              </div>

              {/* Add New Officer Form */}
              {showAddOfficerForm && (
                <form onSubmit={handleAddNewOfficer} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs">Formulir Tambah Petugas Resmi</h4>
                  
                  {officerFormError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      <span>{officerFormError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-800 font-semibold">Nama Lengkap & Gelar:</label>
                      <input
                        type="text"
                        value={newOfficerName}
                        onChange={(e) => setNewOfficerName(e.target.value)}
                        placeholder="Nama dan Gelar"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-800 font-semibold">NIP Pegawai:</label>
                      <input
                        type="text"
                        value={newOfficerNip}
                        onChange={(e) => setNewOfficerNip(e.target.value)}
                        placeholder="NIP 18 digit"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-800 font-semibold">Username:</label>
                      <input
                        type="text"
                        value={newOfficerUsername}
                        onChange={(e) => setNewOfficerUsername(e.target.value)}
                        placeholder="username"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-800 font-semibold">Peran / Hak Akses:</label>
                      <select
                        value={newOfficerRole}
                        onChange={(e) => setNewOfficerRole(e.target.value as 'KASI' | 'VERIFIKATOR')}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                      >
                        <option value="VERIFIKATOR">Verifikator Berkas Digital</option>
                        <option value="KASI">Kepala Seksi (KASI) Bimas Islam</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-800 font-semibold">PIN / Sandi Keamanan:</label>
                    <input
                      type="password"
                      value={newOfficerPin}
                      onChange={(e) => setNewOfficerPin(e.target.value)}
                      placeholder="PIN minimal 4 karakter"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
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
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{off.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                          {off.role}
                        </span>
                        {off.nip === officerSession.officer.nip && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[9px] border border-blue-200 font-medium">
                            Anda
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] font-medium">
                        NIP: <span className="font-mono text-slate-900 font-bold">{off.nip}</span> • User: <span className="font-mono text-emerald-700 font-bold">{off.username}</span>
                      </p>
                      <p className="text-slate-500 text-[11px]">{off.role === 'KASI' ? 'Kepala Seksi Bimas Islam' : 'Verifikator Berkas Bimas Islam'}</p>
                    </div>

                    <div>
                      {off.nip !== officerSession.officer.nip && (
                        <button
                          onClick={() => handleDeleteOfficer(off.nip)}
                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
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

            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsManageOfficersOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs cursor-pointer transition-colors"
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
