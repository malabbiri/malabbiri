export type ApplicationStatus =
  | 'SUBMITTED'       // Diajukan (Menunggu Verifikasi)
  | 'VERIFYING'       // Sedang Diverifikasi Berkas
  | 'REVIEW'          // Proses Telaah Bimas Islam
  | 'REVISION_NEEDED' // Perlu Perbaikan Berkas
  | 'APPROVED'        // Disetujui & Dokumen Diterbitkan
  | 'REJECTED';       // Ditolak

export interface StatusHistoryItem {
  status: ApplicationStatus;
  timestamp: string;
  note: string;
  officerName: string;
}

export interface UploadedFileInfo {
  fieldName: string;
  label: string;
  fileName: string;
  fileSize: number; // in bytes
  fileType: string;
  uploadedAt: string;
  dataUrl?: string; // Base64 or Blob URL for viewing and downloading
  googleDriveFileId?: string; // Google Drive file ID
  googleDriveViewUrl?: string; // Google Drive web preview URL
  googleDriveDownloadUrl?: string; // Direct Google Drive download URL
}

export interface OfficerAccount {
  nip: string;
  username: string;
  name: string;
  jabatan?: string;
  role: 'KASI' | 'VERIFIKATOR' | 'ADMIN';
  pin: string;
  email?: string;
}

export interface OfficerSession {
  isLoggedIn: boolean;
  officer: OfficerAccount;
  loginTime: string;
}

export interface SubmissionRecord {
  id: string; // e.g. MLB-2026-0812
  serviceId: number;
  serviceTitle: string;
  applicantName: string;
  phone: string;
  email?: string;
  address: string;
  institutionName?: string;
  district?: string;
  submittedAt: string;
  status: ApplicationStatus;
  statusHistory: StatusHistoryItem[];
  formData: Record<string, any>;
  files: UploadedFileInfo[];
  checklistConfirmed?: string[];
  officerNotes?: string;
  verificationCode: string;
}

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'select' | 'radio' | 'file' | 'date';
  placeholder?: string;
  required?: boolean;
  options?: string[];
  helperText?: string;
  maxFiles?: number;
  maxSizeMB?: number; // in MB
  acceptedFormats?: string;
}

export interface ServiceDefinition {
  id: number;
  code: string;
  title: string;
  shortTitle: string;
  category: 'LEMBAGA_MASJID' | 'PELAYANAN_UMUM' | 'KUA_PENYULUH';
  description: string;
  legalBasis?: string;
  iconName: string;
  requirementsChecklist?: string[];
  fields: FormFieldDefinition[];
  notice?: string;
}

export interface SurveyRecord {
  id: string;
  submissionId?: string;
  applicantName: string;
  serviceTitle: string;
  overallRating: number; // 1 to 5
  ratings: {
    requirementClarity: number;   // Kejelasan Persyaratan
    speedOfService: number;       // Kecepatan Pelayanan
    processEase: number;          // Kemudahan Prosedur
    staffResponsiveness: number;  // Keramahan & Responsivitas Petugas
    serviceQuality: number;       // Kualitas Hasil Layanan
  };
  feedback: string;
  createdAt: string;
}

export const GOWA_DISTRICTS = [
  'BAJENG',
  'BAJENG BARAT',
  'BAROMBONG',
  'BIRINGBULU',
  'BONTOLEMPANGAN',
  'BONTOMARANNU',
  'BONTONOMPO',
  'BONTONOMPO SELATAN',
  'BUNGAYA',
  'MANUJU',
  'PALLANGGA',
  'PARANGLOE',
  'PARIGI',
  'PATTALLASSANG',
  'SOMBA OPU',
  'TINGGIMONCONG',
  'TOMBOLO PAO',
  'TOMPOBULU',
] as const;

export type GowaDistrict = typeof GOWA_DISTRICTS[number];
