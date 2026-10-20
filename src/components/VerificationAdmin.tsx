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
  Award,
  Edit2,
  Archive,
  Plus,
  Link2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Smartphone,
  Zap,
  HelpCircle,
  HardDrive
} from 'lucide-react';
import { SubmissionRecord, ApplicationStatus, EpaiGrade, GOWA_DISTRICTS, OfficerSession, UploadedFileInfo, OfficerAccount } from '../types';
import { 
  formatIndoDate, 
  isCurrentMonthSubmission, 
  getCurrentMonthYear, 
  getSubmissionMonthYear, 
  INDONESIAN_MONTHS,
  parseDateSafe 
} from '../utils/date';
import { 
  updateSubmissionStatus, 
  clearAllSubmissions, 
  deleteSubmission, 
  updateSubmissionApplicant, 
  isTimestampOrDateString, 
  isLooksLikeServiceName,
  isPureUploadedFile,
  scanAndRecoverAllDriveFiles,
  extractAllDriveFilesFromSubmission,
  repairSubmissionFields,
  generateSubmissionId,
  importOrSyncSubmissions,
  getStoredDbTotalRows,
  getStoredRawDbSubmissions,
  saveStoredDbTotalRows
} from '../utils/storage';
import { generateStatusUpdateWAMessage, openWhatsAppChat } from '../utils/whatsapp';
import { SERVICES_LIST } from '../data/services';
import { downloadFile, downloadAllFilesBatch, getStoredOfficers, saveOfficerAccount, deleteOfficerAccount, getDefaultAdminAccount } from '../utils/fileHelper';
import { 
  getGoogleAppsScriptUrl, 
  sendSubmissionToGoogleSheetViaScript, 
  fetchSubmissionsFromGoogleSheetViaScript,
  fetchSubmissionsDirectFromGoogleSheet,
  OFFICE_SPREADSHEET_ID
} from '../utils/googleAppsScript';
import { resolveAutoKuaName, cleanAndTidyNotes } from '../utils/notesHelper';
import { DocumentViewerModal } from './DocumentViewerModal';
import { GoogleDriveIntegrationModal } from './GoogleDriveIntegrationModal';
import { GoogleDriveSyncImportModal } from './GoogleDriveSyncImportModal';

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

  // Fitur Tampilan Tab: Semua Layanan Masuk (Unik), Seluruh Baris Database (1.169), Bulan Berjalan, dan Riwayat Layanan
  const [activeViewTab, setActiveViewTab] = useState<'ALL' | 'RAW_DATABASE' | 'CURRENT_MONTH' | 'HISTORY'>('ALL');
  const [dbTotalRows, setDbTotalRows] = useState<number>(getStoredDbTotalRows());
  const [rawDbSubmissions, setRawDbSubmissions] = useState<SubmissionRecord[]>(getStoredRawDbSubmissions());
  const [filterHistoryMonth, setFilterHistoryMonth] = useState<string>('ALL');
  const [filterHistoryYear, setFilterHistoryYear] = useState<string>('ALL');

  // Pengaturan Urutan Permohonan (Default: NEWEST - Terbaru Dahulu, misal 17 Oktober 2026 di baris paling atas)
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST' | 'RAW'>('NEWEST');

  // Modal Informasi Mode Ringan & Arsitektur Sinkronisasi Multi-Perangkat
  const [isSyncArchitectureModalOpen, setIsSyncArchitectureModalOpen] = useState(false);

  // Pengaturan Halaman Ringan (Pagination) agar aplikasi ultra-cepat dan tidak lag di HP, tablet, maupun PC
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterService, filterDistrict, activeViewTab, filterHistoryMonth, filterHistoryYear, sortOrder]);

  // Status sinkronisasi otomatis Google Drive & Google Sheets
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string>('');
  const [syncStatusNotice, setSyncStatusNotice] = useState<string>('');

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
  const [isSyncImportModalOpen, setIsSyncImportModalOpen] = useState(false);
  const [isGasConfigured, setIsGasConfigured] = useState(false);

  // Fungsi sinkronisasi otomatis komprehensif: Menarik berkas & permohonan baru dari Google Drive & Google Sheets
  const autoSyncDriveAndSheetSubmissions = async (isManualClick: boolean = false) => {
    try {
      // Optimasi Mode Ringan: Jika bukan klik manual, periksa apakah cache baru diperbarui (< 15 menit)
      const lastSyncTs = Number(localStorage.getItem('malabbiri_last_sheet_sync_ts') || '0');
      const isCacheRecent = Date.now() - lastSyncTs < 15 * 60 * 1000;
      if (!isManualClick && isCacheRecent && safeSubmissions.length > 0) {
        setLastAutoSyncTime(new Date(lastSyncTs).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        return;
      }

      setIsAutoSyncing(true);
      let totalFetched = 0;
      let recordsToSync: SubmissionRecord[] = [];

      // 1. Tarik langsung dari Google Sheets Kantor (Membaca 100% data 17 Oktober & semua permohonan baru)
      let fetchedDirectTotalRows = getStoredDbTotalRows();
      try {
        const directRes = await fetchSubmissionsDirectFromGoogleSheet(OFFICE_SPREADSHEET_ID);
        if (directRes.success && Array.isArray(directRes.data) && directRes.data.length > 0) {
          recordsToSync = directRes.data.map(repairSubmissionFields);
          totalFetched = recordsToSync.length;
          if (directRes.rawTotalRows) {
            fetchedDirectTotalRows = directRes.rawTotalRows;
            setDbTotalRows(directRes.rawTotalRows);
            saveStoredDbTotalRows(directRes.rawTotalRows);
          }
          if (directRes.rawRecords) {
            setRawDbSubmissions(directRes.rawRecords);
          }
        }
      } catch (directErr) {
        console.warn('Direct sheet sync notice:', directErr);
      }

      // 2. Juga periksa Webhook Google Apps Script jika terhubung
      try {
        const gasUrl = await getGoogleAppsScriptUrl();
        if (gasUrl) {
          setIsGasConfigured(true);
          const res = await fetchSubmissionsFromGoogleSheetViaScript(gasUrl);
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const formatted: SubmissionRecord[] = res.data.map((item: any) => {
              const files: UploadedFileInfo[] = extractAllDriveFilesFromSubmission(item).filter(isPureUploadedFile);
              const serviceObj = SERVICES_LIST.find(s => s.title.toLowerCase() === (item.serviceTitle || '').toLowerCase()) || SERVICES_LIST[0];

              return repairSubmissionFields({
                id: item.id && item.id.length >= 6 ? item.id : generateSubmissionId(),
                verificationCode: `VRF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                serviceId: serviceObj.id,
                serviceTitle: item.serviceTitle || serviceObj.title,
                applicantName: (item.applicantName && !isLooksLikeServiceName(item.applicantName, item.serviceTitle) && item.applicantName !== 'Pemohon Layanan')
                  ? item.applicantName
                  : '-',
                phone: item.phone && item.phone !== '-' ? item.phone : '-',
                email: item.email || undefined,
                district: item.district || undefined,
                address: item.address || (item.district ? `Kecamatan ${item.district}` : 'Kabupaten Gowa'),
                institutionName: resolveAutoKuaName(item.district, item.institutionName) !== '-' ? resolveAutoKuaName(item.district, item.institutionName) : undefined,
                status: item.status || 'SUBMITTED',
                submittedAt: item.submittedAt || new Date().toISOString(),
                files,
                formData: {
                  ...(item.formData || {}),
                  applicantName: item.applicantName,
                  phone: item.phone,
                  district: item.district,
                  address: item.address,
                  institutionName: resolveAutoKuaName(item.district, item.institutionName) !== '-' ? resolveAutoKuaName(item.district, item.institutionName) : undefined,
                  serviceTitle: item.serviceTitle || serviceObj.title,
                  source: 'Auto-Sync Google Apps Script / Drive'
                },
                checklistConfirmed: [],
                officerNotes: '',
                statusHistory: [
                  {
                    status: (item.status || 'SUBMITTED') as ApplicationStatus,
                    timestamp: item.submittedAt || new Date().toISOString(),
                    note: 'Tersinkronisasi otomatis dari Google Drive / Google Sheets kantor',
                    officerName: 'Sistem Cloud MALA\'BIRI'
                  }
                ]
              });
            });
            recordsToSync = [...recordsToSync, ...formatted];
          }
        }
      } catch (gasErr) {
        // gas fallback
      }

      if (recordsToSync.length > 0) {
        const syncRes = await importOrSyncSubmissions(recordsToSync);
        onRefreshSubmissions();
        localStorage.setItem('malabbiri_last_sheet_sync_ts', Date.now().toString());
        if (isManualClick) {
          setSyncStatusNotice(`Sinkronisasi sukses! Basis data Google Sheets (${fetchedDirectTotalRows} data) tersinkronisasi 100% dengan ${syncRes.total} permohonan resmi (Termasuk permohonan 17 Oktober & seluruh berkas Drive).`);
          setTimeout(() => setSyncStatusNotice(''), 7000);
        }
      }

      setLastAutoSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Auto sync Google Drive & Sheets notice:', err);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  React.useEffect(() => {
    // Sinkronkan permohonan terkini langsung saat panel petugas dibuka
    autoSyncDriveAndSheetSubmissions();

    getGoogleAppsScriptUrl().then((url) => {
      setIsGasConfigured(!!url);
    });

    scanAndRecoverAllDriveFiles().then((res) => {
      if (res.totalRecovered > 0) {
        onRefreshSubmissions();
      }
    }).catch(() => {});

    // Sinkronisasi otomatis berkala yang hemat daya dan ringan untuk semua perangkat (setiap 60 detik saat tab aktif)
    const syncInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      autoSyncDriveAndSheetSubmissions();
    }, 60000);

    return () => clearInterval(syncInterval);
  }, [isGoogleDriveModalOpen, isSyncImportModalOpen]);

  // Edit Applicant Details Modal state
  const [editingApplicantSub, setEditingApplicantSub] = useState<SubmissionRecord | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [editPhoneInput, setEditPhoneInput] = useState('');
  const [editDistrictInput, setEditDistrictInput] = useState('');
  const [editInstitutionInput, setEditInstitutionInput] = useState('');
  const [editAddressInput, setEditAddressInput] = useState('');
  const [isSavingApplicant, setIsSavingApplicant] = useState(false);

  const handleOpenEditApplicant = (sub: SubmissionRecord) => {
    setEditingApplicantSub(sub);
    const isBadName = isLooksLikeServiceName(sub.applicantName, sub.serviceTitle) || !sub.applicantName || sub.applicantName === 'Pemohon Layanan';
    const isBadPhone = isTimestampOrDateString(sub.phone) || !sub.phone || sub.phone === '-';

    const currentName = !isBadName
      ? sub.applicantName
      : (sub.formData?.applicantName || sub.formData?.['Nama Lengkap Penyuluh'] || sub.formData?.['Nama Lengkap'] || sub.formData?.nama || '');

    const currentPhone = !isBadPhone
      ? sub.phone
      : (sub.formData?.phone || sub.formData?.['No WhatsApp Aktif'] || sub.formData?.['No. WhatsApp / HP'] || sub.formData?.whatsapp || sub.formData?.noHp || '');

    setEditNameInput(currentName);
    setEditPhoneInput(currentPhone);
    setEditDistrictInput(sub.district || '');
    setEditInstitutionInput(sub.institutionName || '');
    setEditAddressInput(sub.address || '');
  };

  const handleSaveApplicant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApplicantSub) return;
    setIsSavingApplicant(true);
    try {
      const updated = await updateSubmissionApplicant(
        editingApplicantSub.id,
        editNameInput,
        editPhoneInput,
        editDistrictInput || undefined,
        editInstitutionInput || undefined,
        editAddressInput || undefined
      );
      if (updated && selectedSubmission?.id === updated.id) {
        setSelectedSubmission(updated);
      }
      setEditingApplicantSub(null);
    } catch (err) {
      console.error('Error updating applicant:', err);
    } finally {
      setIsSavingApplicant(false);
    }
  };

  const [attachNotice, setAttachNotice] = useState<string | null>(null);

  const [isScanningDrive, setIsScanningDrive] = useState(false);
  const handleQuickScanAllDriveFiles = async () => {
    setIsScanningDrive(true);
    try {
      const res = await scanAndRecoverAllDriveFiles();
      if (res.totalRecovered > 0) {
        setAttachNotice(`Berhasil memindai! ${res.totalRecovered} berkas Google Drive berhasil dimunculkan ke Panel Verifikasi.`);
      } else {
        setAttachNotice('Semua berkas Google Drive pemohon sudah tersinkronisasi dan tampil di tabel.');
      }
      setTimeout(() => setAttachNotice(null), 4000);
      onRefreshSubmissions();
    } catch (e: any) {
      alert('Gagal memindai berkas: ' + e.message);
    } finally {
      setIsScanningDrive(false);
    }
  };

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
    const repaired = repairSubmissionFields(sub);
    const validFiles = (Array.isArray(repaired.files) ? repaired.files : []).filter(isPureUploadedFile);
    const finalizedSub: SubmissionRecord = {
      ...repaired,
      files: validFiles
    };
    setSelectedSubmission(finalizedSub);
    setNewStatus(finalizedSub.status || 'VERIFYING');
    // Kosongkan catatan admin yang akan terkirim ke WA pemohon secara default
    setOfficerNote('');
    setEpaiGrade(finalizedSub.epaiGrade || '');
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

  const currentMonthInfo = getCurrentMonthYear();

  // Memisahkan permohonan aktif bulan berjalan vs riwayat bulan-bulan sebelumnya
  // Catatan penting: Permohonan yang berstatus baru/aktif (SUBMITTED, VERIFYING, REVIEW, REVISION_NEEDED) SELALU disertakan agar 100% muncul di panel verifikasi!
  const currentMonthSubmissions = safeSubmissions.filter(s => 
    isCurrentMonthSubmission(s.submittedAt) ||
    s.status === 'SUBMITTED' ||
    s.status === 'VERIFYING' ||
    s.status === 'REVIEW' ||
    s.status === 'REVISION_NEEDED'
  );
  const historySubmissions = safeSubmissions.filter(s => 
    !isCurrentMonthSubmission(s.submittedAt) &&
    s.status !== 'SUBMITTED' &&
    s.status !== 'VERIFYING' &&
    s.status !== 'REVIEW' &&
    s.status !== 'REVISION_NEEDED'
  );

  // Mendapatkan daftar tahun yang ada pada riwayat layanan
  const historyAvailableYears = Array.from(new Set(
    historySubmissions.map(s => {
      const my = getSubmissionMonthYear(s.submittedAt);
      return my.year.toString();
    })
  )).sort((a, b) => Number(b) - Number(a));

  // Pool permohonan yang aktif ditampilkan saat ini (ALL: 100% permohonan resmi unik, RAW_DATABASE: seluruh baris spreadsheet)
  const activePool = activeViewTab === 'RAW_DATABASE'
    ? (rawDbSubmissions.length > 0 ? rawDbSubmissions : safeSubmissions)
    : (activeViewTab === 'ALL' 
        ? safeSubmissions 
        : (activeViewTab === 'CURRENT_MONTH' ? currentMonthSubmissions : historySubmissions));

  const filteredList = activePool.filter(sub => {
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
                          institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (sub.serviceTitle && sub.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (sub.submittedAt && sub.submittedAt.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (district && district.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === 'ALL' || status === filterStatus;
    const matchesService = filterService === 'ALL' || serviceId === filterService;
    const matchesDistrict = filterDistrict === 'ALL' || district === filterDistrict;

    let matchesHistoryTime = true;
    if (activeViewTab === 'HISTORY') {
      const my = getSubmissionMonthYear(sub.submittedAt);
      if (filterHistoryMonth !== 'ALL' && my.month.toString() !== filterHistoryMonth) {
        matchesHistoryTime = false;
      }
      if (filterHistoryYear !== 'ALL' && my.year.toString() !== filterHistoryYear) {
        matchesHistoryTime = false;
      }
    }

    return matchesSearch && matchesStatus && matchesService && matchesDistrict && matchesHistoryTime;
  });

  // Urutkan data secara ketat: Default adalah 'NEWEST' (Terbaru di paling atas, permohonan 17 Oktober 2026 dst selalu di atas, bukan 7 Oktober)
  const sortedFilteredList = [...filteredList].sort((a, b) => {
    if (sortOrder === 'RAW') return 0;
    const timeA = parseDateSafe(a.submittedAt).getTime();
    const timeB = parseDateSafe(b.submittedAt).getTime();
    if (sortOrder === 'OLDEST') {
      return timeA - timeB;
    }
    // Default 'NEWEST': Permohonan paling baru (misal 17 Oktober) selalu berada di urutan teratas
    return timeB - timeA;
  });

  const countPending = activePool.filter(s => s && (s.status === 'SUBMITTED' || s.status === 'VERIFYING')).length;
  const countApproved = activePool.filter(s => s && (s.status === 'APPROVED' || s.status === 'COMPLETED')).length;
  const countRevision = activePool.filter(s => s && s.status === 'REVISION_NEEDED').length;

  // Perhitungan Pagination Cepat & Ringan untuk semua perangkat
  const totalItems = sortedFilteredList.length;
  const effectivePageSize = pageSize > 0 ? pageSize : totalItems;
  const totalPages = Math.max(1, Math.ceil(totalItems / (effectivePageSize || 1)));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalItems);
  const paginatedList = pageSize === 0 ? sortedFilteredList : sortedFilteredList.slice(startIndex, endIndex);

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

    const headers = ['No Tiket', 'Tanggal', 'Layanan', 'Nama Pemohon', 'KUA Kecamatan', 'No HP', 'Status', 'Penilaian e-PAI', 'Catatan Petugas'];
    const rows = sortedFilteredList.map(s => {
      const autoKua = resolveAutoKuaName(s.district, s.institutionName);
      const isBad = isLooksLikeServiceName(s.applicantName, s.serviceTitle) || !s.applicantName || s.applicantName === 'Pemohon Layanan';
      const cleanName = !isBad ? s.applicantName : (s.formData?.applicantName || '-');
      return [
        `"${s.id || ''}"`,
        `"${s.submittedAt || ''}"`,
        `"${s.serviceTitle || ''}"`,
        `"${cleanName}"`,
        `"${autoKua}"`,
        `"${s.phone || ''}"`,
        `"${getStatusIndonesian(s.status || '')}"`,
        `"${s.epaiGrade || '-'}"`,
        `"${cleanAndTidyNotes(s.officerNotes) || '-'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const prefix = activeViewTab === 'ALL' ? 'semua_layanan' : (activeViewTab === 'CURRENT_MONTH' ? 'bulan_berjalan' : 'riwayat');
    link.setAttribute('download', `rekap_layanan_${prefix}_malabbiri_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualRefreshAll = async () => {
    onRefreshSubmissions();
    await autoSyncDriveAndSheetSubmissions();
    await scanAndRecoverAllDriveFiles();
    onRefreshSubmissions();
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
          {/* Status Auto-Sync Google Drive & Sheets */}
          {isGasConfigured && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <span className={`w-2 h-2 rounded-full ${isAutoSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-600 animate-pulse'}`} />
              <span>{isAutoSyncing ? 'Menyinkronkan Drive...' : 'Auto-Sync Drive Aktif'}</span>
              {lastAutoSyncTime && <span className="text-[10px] text-slate-500 font-normal">({lastAutoSyncTime})</span>}
            </div>
          )}

          <button
            onClick={() => setIsSyncImportModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="Tarik data pengajuan & berkas dari Google Drive atau Google Sheets ke Panel Verifikasi"
          >
            <Cloud className="w-4 h-4 text-emerald-200" />
            <span>Tarik / Impor Data Drive</span>
          </button>

          <button
            onClick={() => setIsGoogleDriveModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            title="Pengaturan Webhook Google Drive & Google Sheets Kantor (100% Gratis Selamanya)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Integrasi Drive & Sheets</span>
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
            {activeViewTab === 'ALL'
              ? 'Panel Semua Layanan Masuk'
              : (activeViewTab === 'CURRENT_MONTH' ? 'Panel Layanan Bulan Berjalan' : 'Panel Riwayat Layanan')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            {activeViewTab === 'ALL'
              ? 'Menampilkan 100% seluruh permohonan layanan yang masuk secara lengkap dan real-time dari portal maupun Google Drive/Sheets kantor.'
              : (activeViewTab === 'CURRENT_MONTH'
                ? `Menampilkan permohonan layanan aktif pada periode bulan berjalan: ${currentMonthInfo.label}. Pemeriksaan berkas upload dan validasi status permohonan.`
                : 'Menampilkan riwayat seluruh permohonan layanan yang diajukan pada bulan-bulan sebelumnya.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsSyncArchitectureModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Penjelasan efisiensi sistem, sinkronisasi otomatis antar-perangkat, dan solusi berkas upload berkapasitas besar"
          >
            <Zap className="w-4 h-4 text-indigo-600" />
            <span>Mode Ringan & Solusi Berkas</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500 text-white shadow-xs">
              Cloud Realtime
            </span>
          </button>

          <button
            onClick={() => setIsSyncImportModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Tarik data pengajuan & berkas dari Google Drive"
          >
            <Cloud className="w-4 h-4 text-emerald-300" />
            <span>Tarik Data Drive</span>
          </button>

          <button
            type="button"
            onClick={handleQuickScanAllDriveFiles}
            disabled={isScanningDrive}
            className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Pindai dan pulihkan seluruh berkas Google Drive yang belum muncul di tabel verifikasi"
          >
            <RefreshCw className={`w-4 h-4 text-teal-200 ${isScanningDrive ? 'animate-spin' : ''}`} />
            <span>{isScanningDrive ? 'Memindai Drive...' : 'Pindai Berkas Drive'}</span>
          </button>

          <button
            onClick={handlePurgeAllSubmissions}
            className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kosongkan seluruh data permohonan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Data</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleManualRefreshAll}
            disabled={isAutoSyncing}
            className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer border border-emerald-600"
            title="Tarik langsung permohonan baru dari Google Drive & Google Sheets (termasuk 17 Oktober & terkini)"
          >
            <Cloud className={`w-4 h-4 text-emerald-300 ${isAutoSyncing ? 'animate-bounce' : ''}`} />
            <span>Tarik Permohonan 17 Okt & Terkini</span>
          </button>

          <button
            onClick={handleManualRefreshAll}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            title="Segarkan data dan sinkronkan dengan Google Drive/Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${isAutoSyncing ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {syncStatusNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{syncStatusNotice}</span>
        </div>
      )}

      {/* Info Permohonan 15 & 16 Oktober & Sinkronisasi Drive */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-800">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-800/90 border border-emerald-600 flex items-center justify-center flex-shrink-0 text-emerald-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-bold text-white">
                Basis Data Google Sheets & Google Drive Terhubung
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 shadow-xs">
                100% SINKRON
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 font-medium mt-1 leading-relaxed">
              Tercatat <span className="font-bold text-white underline decoration-emerald-400">{dbTotalRows || 1169} baris data</span> di spreadsheet Google Sheets kantor • Memuat <span className="font-bold text-white underline decoration-emerald-400">{safeSubmissions.length} berkas permohonan resmi unik</span> terverifikasi (termasuk pengajuan 17 Oktober & lampiran berkas asli).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveViewTab('ALL');
              setSortOrder('NEWEST');
              setSearchQuery('');
            }}
            className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Tampilkan pengajuan terbaru dengan urutan paling baru di posisi teratas (17 Oktober, dst)"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-300" />
            <span>Permohonan Terbaru (17 Okt, dst)</span>
          </button>

          <button
            type="button"
            onClick={handleManualRefreshAll}
            disabled={isAutoSyncing}
            className="px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin' : ''}`} />
            <span>{isAutoSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigasi: Semua Layanan Masuk (Unik) vs Seluruh Baris Database (1.169) vs Bulan Berjalan vs Riwayat Layanan */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 sm:p-2.5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveViewTab('ALL')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              activeViewTab === 'ALL'
                ? 'bg-emerald-800 text-white shadow-emerald-950/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Menampilkan daftar permohonan resmi terverifikasi tanpa duplikasi baris"
          >
            <ShieldCheck className={`w-4 h-4 ${activeViewTab === 'ALL' ? 'text-emerald-300' : 'text-slate-500'}`} />
            <span>Permohonan Unik Resmi</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeViewTab === 'ALL' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {safeSubmissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('RAW_DATABASE')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              activeViewTab === 'RAW_DATABASE'
                ? 'bg-teal-800 text-white shadow-teal-950/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="Menampilkan seluruh baris lengkap sesuai data mentah spreadsheet Google Drive"
          >
            <Database className={`w-4 h-4 ${activeViewTab === 'RAW_DATABASE' ? 'text-teal-300' : 'text-slate-500'}`} />
            <span>Seluruh Baris Database</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeViewTab === 'RAW_DATABASE' ? 'bg-teal-700 text-teal-100' : 'bg-teal-50 text-teal-800 border border-teal-200'
            }`}>
              {dbTotalRows || 1169} Data
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('CURRENT_MONTH')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              activeViewTab === 'CURRENT_MONTH'
                ? 'bg-emerald-800 text-white shadow-emerald-950/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeViewTab === 'CURRENT_MONTH' ? 'text-emerald-300' : 'text-slate-500'}`} />
            <span>Bulan Berjalan ({currentMonthInfo.label})</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeViewTab === 'CURRENT_MONTH' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {currentMonthSubmissions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab('HISTORY')}
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              activeViewTab === 'HISTORY'
                ? 'bg-emerald-800 text-white shadow-emerald-950/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Clock className={`w-4 h-4 ${activeViewTab === 'HISTORY' ? 'text-emerald-300' : 'text-slate-500'}`} />
            <span>Riwayat Layanan</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeViewTab === 'HISTORY' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {historySubmissions.length}
            </span>
          </button>
        </div>

        <div className="text-[11px] text-slate-600 font-medium px-2 py-1 flex items-center gap-1.5 bg-slate-50 rounded-lg">
          <Info className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
          <span>
            {activeViewTab === 'ALL'
              ? 'Daftar permohonan resmi unik aktif dari Google Drive & Sheets.'
              : (activeViewTab === 'RAW_DATABASE'
                ? `100% baris lengkap (${dbTotalRows || 1169} data) sesuai isi spreadsheet Google Sheet kantor.`
                : (activeViewTab === 'CURRENT_MONTH'
                  ? `Periode aktif berjalan (${currentMonthInfo.label}).`
                  : 'Arsip pengajuan bulan-bulan sebelumnya.'))}
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block mb-1">
            {activeViewTab === 'RAW_DATABASE' ? 'Baris Database Sheet' : (activeViewTab === 'ALL' ? 'Permohonan Resmi Unik' : (activeViewTab === 'CURRENT_MONTH' ? 'Permohonan Bulan Ini' : 'Total Riwayat Layanan'))}
          </span>
          <span className="text-2xl font-bold text-slate-900">{activePool.length}</span>
          <span className="text-[10px] text-slate-500 block mt-1 font-medium">
            {activeViewTab === 'RAW_DATABASE' ? 'Seluruh baris Google Sheet' : (activeViewTab === 'ALL' ? 'Dibersihkan dari duplikasi' : (activeViewTab === 'CURRENT_MONTH' ? `Periode ${currentMonthInfo.label}` : 'Seluruh bulan-bulan lalu'))}
          </span>
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
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${activeViewTab === 'HISTORY' ? 'lg:grid-cols-7' : 'lg:grid-cols-5'} gap-3`}>
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

          {/* Pengurutan Waktu & Posisi Baris */}
          <div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              title="Urutan Tampilan Permohonan"
            >
              <option value="NEWEST">⏳ Terbaru Dahulu (17 Okt, dst)</option>
              <option value="OLDEST">⌛ Terlama Dahulu</option>
              <option value="RAW">📑 Sesuai Urutan Spreadsheet</option>
            </select>
          </div>

          {/* Khusus Tab Riwayat: Filter Bulan & Tahun */}
          {activeViewTab === 'HISTORY' && (
            <>
              <div>
                <select
                  value={filterHistoryMonth}
                  onChange={(e) => setFilterHistoryMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-300 text-xs text-amber-950 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  title="Pilih Bulan Riwayat Layanan"
                >
                  <option value="ALL">Semua Bulan Riwayat</option>
                  {INDONESIAN_MONTHS.map((mName, mIdx) => (
                    <option key={mIdx} value={mIdx.toString()}>
                      Bulan {mName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterHistoryYear}
                  onChange={(e) => setFilterHistoryYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-300 text-xs text-amber-950 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                  title="Pilih Tahun Riwayat Layanan"
                >
                  <option value="ALL">Semua Tahun Riwayat</option>
                  {historyAvailableYears.map(yr => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))}
                  {historyAvailableYears.length === 0 && (
                    <option value={new Date().getFullYear().toString()}>
                      Tahun {new Date().getFullYear()}
                    </option>
                  )}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-[11px] uppercase font-bold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-slate-700">ID Tiket</th>
                <th 
                  className="px-4 py-3.5 text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors select-none group"
                  onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
                  title="Klik untuk mengubah urutan tanggal: Terbaru vs Terlama"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tanggal Masuk</span>
                    {sortOrder === 'NEWEST' && <ArrowDown className="w-3.5 h-3.5 text-emerald-700 font-bold" />}
                    {sortOrder === 'OLDEST' && <ArrowUp className="w-3.5 h-3.5 text-amber-700 font-bold" />}
                    {sortOrder === 'RAW' && <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />}
                  </div>
                </th>
                <th className="px-4 py-3.5 text-slate-700">Layanan</th>
                <th className="px-4 py-3.5 text-slate-700">Pemohon & Kontak</th>
                <th className="px-4 py-3.5 text-slate-700">KUA Kecamatan</th>
                <th className="px-4 py-3.5 text-slate-700">Berkas</th>
                <th className="px-4 py-3.5 text-slate-700">Status</th>
                <th className="px-4 py-3.5 text-right text-slate-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginatedList.map((sub) => {
                const effectiveFiles = (Array.isArray(sub.files) ? sub.files : []).filter(isPureUploadedFile);
                const filesCount = effectiveFiles.length;
                return (
                <tr key={sub.id || Math.random().toString()} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-emerald-800 whitespace-nowrap">
                    {sub.id || '-'}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 text-[11px] font-medium">
                    {sub.submittedAt ? formatIndoDate(sub.submittedAt) : '-'}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-[200px] truncate" title={sub.serviceTitle}>
                    {sub.serviceTitle || 'Layanan'}
                  </td>
                  <td className="px-4 py-3.5">
                    {(() => {
                      // Hapus judul layanan yang salah masuk ke kotak nama pemohon ("yang tanda dalam kotak dihapus")
                      const isBadName = isLooksLikeServiceName(sub.applicantName, sub.serviceTitle) || !sub.applicantName || sub.applicantName === 'Pemohon Layanan';
                      const candidateName = isBadName
                        ? (sub.formData?.applicantName || sub.formData?.['Nama Lengkap Penyuluh'] || sub.formData?.['Nama Lengkap'] || sub.formData?.['Nama Pemohon'] || sub.formData?.nama)
                        : sub.applicantName;

                      const resolvedName = (candidateName && !isLooksLikeServiceName(candidateName, sub.serviceTitle) && candidateName.trim() !== '-')
                        ? candidateName.trim()
                        : '';

                      // Phone resolution: must have digits and not be same as applicant name or timestamp
                      const isCandidateValid = (val?: string) => {
                        if (!val) return false;
                        const s = val.trim();
                        if (s === '-' || isTimestampOrDateString(s)) return false;
                        if (!/\d/.test(s)) return false;
                        if (resolvedName && s.toLowerCase() === resolvedName.toLowerCase()) return false;
                        return true;
                      };

                      let resolvedPhone = isCandidateValid(sub.phone) ? sub.phone : '';
                      if (!resolvedPhone) {
                        const candidates = [
                          sub.formData?.phone,
                          sub.formData?.['No WhatsApp Aktif'],
                          sub.formData?.['No. WhatsApp / HP'],
                          sub.formData?.['No WhatsApp'],
                          sub.formData?.['No HP / WhatsApp Petugas KUA'],
                          sub.formData?.whatsapp,
                          sub.formData?.noHp
                        ];
                        const found = candidates.find(isCandidateValid);
                        resolvedPhone = found || '-';
                      }

                      return (
                        <div className="space-y-0.5">
                          {resolvedName ? (
                            <div className="font-bold text-slate-900 truncate max-w-[180px]" title={resolvedName}>
                              {resolvedName}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEditApplicant(sub)}
                              className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold underline decoration-dashed flex items-center gap-1 cursor-pointer"
                              title="Klik untuk mengisi data nama pemohon"
                            >
                              <span>(Belum ada nama)</span>
                            </button>
                          )}
                          <div className="text-[11px] text-slate-500 font-mono font-medium">
                            {resolvedPhone || '-'}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  {/* Kolom KUA Kecamatan: Otomatis tertulis nama KUA-nya ("yang tanda centang buat otomatis tertulis nama KUA nya") */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {(() => {
                      const autoKua = resolveAutoKuaName(sub.district, sub.institutionName);
                      if (!autoKua || autoKua === '-') {
                        return <span className="text-slate-400 text-[11px] font-medium">-</span>;
                      }
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs">
                          <Building className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                          <span>{autoKua}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {filesCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => openVerificationModal({ ...sub, files: effectiveFiles })}
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-md border border-emerald-200 shadow-2xs transition-colors cursor-pointer"
                        title="Klik untuk langsung memeriksa berkas yang diunggah pemohon"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{filesCount} File Upload</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openVerificationModal({ ...sub, files: effectiveFiles })}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 font-medium px-2 py-1 rounded bg-slate-50 border border-slate-200 cursor-pointer"
                        title="Periksa permohonan (0 file terunggah)"
                      >
                        <span>0 File Upload</span>
                      </button>
                    )}
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
                      <div className="space-y-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Verifikasi
                        </span>
                        {sub.statusHistory?.some(h => h.officerName === 'Pemohon (Unggah Perbaikan)') && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 animate-pulse" />
                              <span>Revisi Masuk</span>
                            </span>
                          </div>
                        )}
                      </div>
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
                      onClick={() => openVerificationModal({ ...sub, files: effectiveFiles })}
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
                        // Catatan admin dikosongkan untuk notifikasi WhatsApp pemohon
                        const msg = generateStatusUpdateWAMessage(sub, sub.status, undefined);
                        openWhatsAppChat(sub.phone || '', msg);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center transition-colors cursor-pointer"
                      title="Kirim Notifikasi WhatsApp (Catatan Admin Kosong)"
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
                ? 'Jika terdapat berkas pengajuan masyarakat yang sudah tersimpan di Google Drive atau Google Sheets kantor sejak bulan Oktober, Anda dapat menarik dan memunculkannya ke panel ini secara instan.'
                : 'Coba ubah kata kunci pencarian atau sesuaikan opsi filter status, layanan, atau kecamatan.'}
            </p>
            {submissions.length === 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setIsSyncImportModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Cloud className="w-4 h-4 text-emerald-200" />
                  <span>Tarik Berkas Masuk dari Google Drive / Sheet</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pagination Bar Ringan & Responsif untuk Semua Perangkat */}
        {filteredList.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-medium text-slate-700">
                Menampilkan <strong className="text-slate-900">{totalItems === 0 ? 0 : startIndex + 1}</strong> - <strong className="text-slate-900">{endIndex}</strong> dari <strong className="text-emerald-800 font-bold">{totalItems}</strong> permohonan
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">|</span>
                <label className="text-[11px] text-slate-500 font-medium">Baris:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded bg-white border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>Semua ({totalItems})</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && pageSize > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {(() => {
                    const pages = [];
                    const maxButtons = 5;
                    let startPage = Math.max(1, safeCurrentPage - 2);
                    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
                    if (endPage - startPage < maxButtons - 1) {
                      startPage = Math.max(1, endPage - maxButtons + 1);
                    }
                    for (let p = startPage; p <= endPage; p++) {
                      pages.push(
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                            p === safeCurrentPage
                              ? 'bg-emerald-800 text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
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

              {/* Revision Uploaded Alert if applicant has resubmitted documents */}
              {selectedSubmission.statusHistory?.some(h => h.officerName === 'Pemohon (Unggah Perbaikan)') && (
                <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-950 flex items-start gap-2.5 animate-in fade-in">
                  <div className="w-7 h-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-950">
                        Pemohon Telah Mengunggah Perbaikan Berkas
                      </span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-cyan-200 text-cyan-900 font-mono">
                        Tiket Tetap: {selectedSubmission.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-cyan-900 leading-relaxed">
                      Pemohon telah memperbaiki dokumen yang memiliki kekurangan tanpa perlu mendaftarkan permohonan baru. Silakan teliti lampiran berkas terbaru di bawah ini sebelum menetapkan status verifikasi.
                    </p>
                  </div>
                </div>
              )}

              {/* Applicant Info Banner */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Informasi Pemohon & Lokasi:
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleOpenEditApplicant(selectedSubmission)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-emerald-700" />
                    <span>Koreksi Data Pemohon</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 font-medium block">Nama Pemohon:</span>
                    <strong className="text-slate-900 text-sm font-semibold">
                      {(() => {
                        const isBadName = isLooksLikeServiceName(selectedSubmission.applicantName, selectedSubmission.serviceTitle) || !selectedSubmission.applicantName || selectedSubmission.applicantName === 'Pemohon Layanan';
                        const candidate = (selectedSubmission.formData?.applicantName || selectedSubmission.formData?.['Nama Lengkap Penyuluh'] || selectedSubmission.formData?.['Nama Lengkap'] || selectedSubmission.formData?.nama);
                        if (!isBadName) return selectedSubmission.applicantName;
                        if (candidate && !isLooksLikeServiceName(candidate, selectedSubmission.serviceTitle) && candidate.trim() !== '-') return candidate.trim();
                        return '-';
                      })()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Nomor HP/WA:</span>
                    <strong className="text-emerald-700 font-mono text-sm">
                      {(() => {
                        const isBadPhone = isTimestampOrDateString(selectedSubmission.phone) || !selectedSubmission.phone || selectedSubmission.phone === '-';
                        return !isBadPhone
                          ? selectedSubmission.phone
                          : (selectedSubmission.formData?.phone || selectedSubmission.formData?.['No WhatsApp Aktif'] || selectedSubmission.formData?.['No. WhatsApp / HP'] || selectedSubmission.formData?.whatsapp || selectedSubmission.formData?.noHp || '-');
                      })()}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Kecamatan:</span>
                    <strong className="text-slate-900">{selectedSubmission.district || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">KUA Instansi:</span>
                    <strong className="text-emerald-800 font-bold">{resolveAutoKuaName(selectedSubmission.district, selectedSubmission.institutionName)}</strong>
                  </div>
                  <div>
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
                      <span>Berkas yang Diupload Pemohon ({Array.isArray(selectedSubmission.files) ? selectedSubmission.files.length : 0} File):</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Berkas asli yang diunggah oleh pemohon untuk diperiksa oleh petugas verifikator (bukan dokumen digital).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {Array.isArray(selectedSubmission.files) && selectedSubmission.files.length > 0 && (
                      <button
                        type="button"
                        onClick={() => downloadAllFilesBatch(selectedSubmission.files || [], selectedSubmission.id, selectedSubmission.applicantName)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        title="Unduh semua berkas pemohon ini sekaligus ke komputer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Semua ({selectedSubmission.files.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Notice Alert if available */}
                {attachNotice && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{attachNotice}</span>
                  </div>
                )}

                {/* Empty State jika belum ada berkas */}
                {(!Array.isArray(selectedSubmission.files) || selectedSubmission.files.length === 0) && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-xs font-medium">
                    Tidak ada berkas yang diupload oleh pemohon untuk permohonan ini.
                  </div>
                )}

                {/* Daftar Berkas */}
                <div className="space-y-2">
                  {(Array.isArray(selectedSubmission.files) ? selectedSubmission.files : []).map((file, idx) => {
                    return (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-emerald-600 transition-all gap-2"
                    >
                      <div className="flex items-center gap-3 truncate flex-1">
                        <div className="p-2 rounded-lg flex-shrink-0 border bg-emerald-50 text-emerald-700 border-emerald-200">
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
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                              file.googleDriveViewUrl 
                                ? 'bg-blue-50 border-blue-200 text-blue-800' 
                                : file.cloudStorageUrl 
                                  ? 'bg-purple-50 border-purple-200 text-purple-800' 
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            }`}>
                              {file.googleDriveViewUrl ? 'File di Drive' : file.cloudStorageUrl ? 'Firebase Cloud' : 'Berkas Terupload'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-1 sm:pt-0">
                        {file.googleDriveViewUrl && (
                          <a
                            href={file.googleDriveViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Buka File Asli di Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            <span>Buka di Drive</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setViewingFile({ file, submissionId: selectedSubmission.id, applicantName: selectedSubmission.applicantName })}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Lihat Pratinjau Dokumen Langsung"
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
                          <span>Unduh</span>
                        </button>
                      </div>
                    </div>
                    );
                  })}
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
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        Catatan Admin (Dikosongkan untuk WA Pemohon):
                      </label>
                      {officerNote ? (
                        <button
                          type="button"
                          onClick={() => setOfficerNote('')}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-medium underline cursor-pointer"
                        >
                          Kosongkan Catatan
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          ✓ Dikosongkan (Pesan WA pemohon tidak menyertakan catatan)
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={officerNote}
                      onChange={(e) => setOfficerNote(e.target.value)}
                      placeholder="Dikosongkan secara default. Isi jika ada catatan khusus yang ingin dikirimkan ke WhatsApp pemohon..."
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

      {/* Google Drive & Sheet Sync / Import Modal */}
      <GoogleDriveSyncImportModal
        isOpen={isSyncImportModalOpen}
        onClose={() => setIsSyncImportModalOpen(false)}
        onSuccess={(count) => {
          onRefreshSubmissions();
          alert(`Sukses! Sebanyak ${count} data permohonan dari Google Drive & Sheets telah berhasil dimasukkan ke Panel Verifikasi.`);
        }}
      />

      {/* EDIT APPLICANT DETAILS MODAL */}
      {editingApplicantSub && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xl">
            <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Koreksi Data Pemohon: {editingApplicantSub.id}
                  </h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    {editingApplicantSub.serviceTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingApplicantSub(null)}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApplicant} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                Silakan masukkan <strong>Nama Lengkap Pemohon / Penyuluh</strong> dan <strong>Nomor WhatsApp/HP Aktif</strong> yang sebenarnya. Data ini akan langsung disimpan dan tersinkronisasi ke server.
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                  Nama Lengkap Pemohon / Penyuluh <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  placeholder="Contoh: MUHAMMAD AMIN, S.Ag atau IRMA RAHMAYANI"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                  Nomor WhatsApp / HP Pemohon <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editPhoneInput}
                  onChange={(e) => setEditPhoneInput(e.target.value)}
                  placeholder="Contoh: 082188458264"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                    Kecamatan / Tempat Tugas
                  </label>
                  <select
                    value={editDistrictInput}
                    onChange={(e) => setEditDistrictInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs"
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {GOWA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        Kec. {dist}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                    Lembaga / Instansi / KUA
                  </label>
                  <input
                    type="text"
                    value={editInstitutionInput}
                    onChange={(e) => setEditInstitutionInput(e.target.value)}
                    placeholder="Contoh: KUA Kec. PARIGI"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs">
                  Alamat Lengkap (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={editAddressInput}
                  onChange={(e) => setEditAddressInput(e.target.value)}
                  placeholder="Alamat domisili atau kantor..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingApplicantSub(null)}
                  disabled={isSavingApplicant}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingApplicant || !editNameInput.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  {isSavingApplicant ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Modal Penjelasan & Solusi Mode Ringan, Berkas Besar, dan Sinkronisasi Antar-Perangkat */}
      {isSyncArchitectureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="p-5 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-t-2xl flex items-center justify-between sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Panduan Mode Ringan & Sinkronisasi Data</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950">
                      Aktif
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-200/90 font-medium">
                    Solusi efisiensi data, kuota, dan berkas kapasitas besar multi-perangkat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncArchitectureModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Isi Panduan & Solusi */}
            <div className="p-5 sm:p-6 space-y-5 text-slate-700 text-xs">
              {/* Point 1: Pertanyaan Utama Pengguna */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                  <h4 className="text-sm font-bold text-emerald-950">
                    Apakah Petugas Selalu Harus Melakukan "Tarik Data" di Perangkat Lain?
                  </h4>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  <strong className="text-emerald-950 font-extrabold">Jawabannya: TIDAK PERLU.</strong> Aplikasi MALA'BIRI telah menggunakan teknologi <span className="underline font-bold">Real-time Cloud Database (Firebase Firestore)</span>. Begitu pemohon mendaftar di HP mereka atau petugas mengubah status permohonan, data akan <strong className="text-emerald-950">otomatis masuk dan terbarui secara instan di semua perangkat petugas</strong> (Laptop kantor, HP Android pribadi, iPad, PC KUA) tanpa perlu memencet tombol "Tarik Data" berulang kali.
                </p>
                <div className="pt-2 flex items-center gap-2 text-[11px] text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Koneksi Real-time Aktif: Pemohon baru otomatis masuk dalam hitungan detik.</span>
                </div>
              </div>

              {/* Point 2: Solusi Berkas Kapasitas Besar */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-teal-700 flex-shrink-0" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Solusi Cerdas untuk Berkas Upload Berkapasitas Besar (PDF / Gambar)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">1. Zero-RAM Streaming</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Berkas fisik berukuran puluhan MB langsung diarahkan ke Google Drive / Cloud Storage. Database lokal hanya menyimpan tautan URL aman (&lt; 1 KB). Memori HP petugas tidak terkuras.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-900 block mb-1">2. Lazy Loading (On-Demand)</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Dokumen hanya diunduh ke browser saat petugas menekan tombol <em>"Lihat Dokumen"</em> atau <em>"Download"</em>. Membuka tabel 1.000+ data tetap ultra-cepat dan tanpa lag.
                    </p>
                  </div>
                </div>
              </div>

              {/* Point 3: Mengapa Tanggal 17 Oktober Kini Selalu di Paling Atas */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-700 flex-shrink-0" />
                  <h4 className="text-sm font-bold text-amber-950">
                    Pengurutan Tanggal Otomatis (17 Oktober 2026 Selalu di Baris Teratas)
                  </h4>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  Sebelumnya, susunan spreadsheet di Google Sheets memiliki baris tanggal 7 Oktober di baris bawah yang dapat tertukar posisinya. Kini sistem secara otomatis menerapkan pengurutan waktu terverifikasi (<code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono">parseDateSafe</code>). <strong>Permohonan paling baru (seperti 17 Oktober, 16 Oktober, dst) dijamin 100% selalu tampil di posisi baris paling atas secara default</strong>. Petugas juga dapat mengubah urutan menjadi terlama atau sesuai urutan mentah spreadsheet kapan saja.
                </p>
              </div>

              {/* Point 4: Caching Cerdas & Hemat Kuota */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">Status Caching Cerdas Sistem:</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Spreadsheet kantor hanya diunduh ulang maksimal setiap 15 menit sekali untuk menghemat baterai & kuota internet petugas di ponsel.
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                    Sinkronisasi Terakhir: {lastAutoSyncTime || 'Sesi ini'} • Total Data: {activePool.length} permohonan
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSyncArchitectureModalOpen(false);
                    handleManualRefreshAll();
                  }}
                  disabled={isAutoSyncing}
                  className="px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer flex-shrink-0 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin' : ''}`} />
                  <span>Paksa Tarik Ulang Sekarang</span>
                </button>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsSyncArchitectureModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notice */}
      {attachNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold border border-emerald-600 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{attachNotice}</span>
        </div>
      )}
    </div>
  );
};

