import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { SubmissionRecord, SurveyRecord, ApplicationStatus, UploadedFileInfo } from '../types';
import { INITIAL_SUBMISSIONS, INITIAL_SURVEYS } from '../data/initialData';
import { generateFileKey, storeFileInDb } from './indexedDbStorage';
import { resolveAutoKuaName, cleanAndTidyNotes } from './notesHelper';

const SUBMISSIONS_KEY = 'malabbiri_submissions_v3';
const SURVEYS_KEY = 'malabbiri_surveys_v3';

export function isTimestampOrDateString(str?: string): boolean {
  if (!str) return false;
  const s = str.trim();
  if (/\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(s)) return true;
  if (/\d{1,2}:\d{1,2}/.test(s) || /\d{1,2}\.\d{1,2}\.\d{1,2}/.test(s)) return true;
  if (/wita|wib|wit|pukul|am|pm/i.test(s)) return true;
  return false;
}

export function isLooksLikeServiceName(str?: string, serviceTitle?: string): boolean {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  if (serviceTitle && s === serviceTitle.trim().toLowerCase()) return true;
  if (s.startsWith('laporan bulanan') || s.startsWith('layanan') || s.startsWith('permohonan') || s.startsWith('rekomendasi')) return true;
  return false;
}

/**
 * Memeriksa apakah berkas merupakan berkas fisik/unggahan asli dari pemohon,
 * bukan dokumen digital seperti Google Sheets, Formulir Google, Google Docs non-file, atau Google Drive folder.
 */
export function isPureUploadedFile(f: any): boolean {
  if (!f) return false;
  const rawUrl = (
    f.googleDriveViewUrl || 
    f.googleDriveDownloadUrl || 
    f.cloudStorageUrl || 
    f.url || 
    (typeof f === 'string' ? f : '')
  ).toLowerCase();
  
  // Dokumen digital yang BUKAN berkas upload pemohon -> langsung dihapus
  if (
    rawUrl.includes('docs.google.com/spreadsheets') ||
    rawUrl.includes('docs.google.com/forms') ||
    rawUrl.includes('docs.google.com/document') ||
    rawUrl.includes('docs.google.com/presentation') ||
    rawUrl.includes('/folders/')
  ) {
    return false;
  }

  // Nama file atau label yang mengindikasikan spreadsheet / dokumen digital / arsip digital
  const name = (f.fileName || f.label || '').toLowerCase();
  if (
    name.includes('spreadsheet') ||
    name.includes('formulir tanggapan') ||
    name.includes('dokumen digital') ||
    name.includes('arsip digital') ||
    name.includes('arsip berkas digital') ||
    name.includes('form responses') ||
    name.includes('dokumen bawaan')
  ) {
    return false;
  }

  return true;
}

export function repairSubmissionFields(sub: SubmissionRecord): SubmissionRecord {
  let changed = false;
  let applicantName = sub.applicantName;
  let phone = sub.phone;

  // Resolve district
  let district = sub.district || sub.formData?.district || sub.formData?.['Tempat Tugas (Kecamatan)'] || sub.formData?.kecamatan;
  if (district) {
    district = district.replace(/^Kec\.?\s*/i, '').trim();
    if (district !== sub.district) {
      changed = true;
    }
  }

  // Auto-fill KUA institutionName automatically ("yang tanda centang buat otomatis tertulis nama KUA nya")
  let institutionName = resolveAutoKuaName(district, sub.institutionName);
  if (institutionName !== sub.institutionName) {
    changed = true;
  }

  // Check if applicantName looks like a service title or is generic ("yang tanda dalam kotak dihapus")
  if (isLooksLikeServiceName(applicantName, sub.serviceTitle) || !applicantName || applicantName === 'Pemohon Layanan') {
    const candidate = (
      sub.formData?.applicantName ||
      sub.formData?.['Nama Lengkap Penyuluh'] ||
      sub.formData?.['Nama Lengkap'] ||
      sub.formData?.['Nama Pemohon'] ||
      sub.formData?.nama ||
      sub.formData?.['Nama Pengirim / Kepala KUA / Petugas'] ||
      sub.formData?.penyuluhName ||
      sub.formData?.name
    );
    if (candidate && !isLooksLikeServiceName(candidate, sub.serviceTitle) && candidate.trim() !== '-') {
      applicantName = candidate.trim();
      changed = true;
    } else {
      // Hapus teks judul layanan yang salah masuk ke kotak nama pemohon
      applicantName = '-';
      changed = true;
    }
  }

  // Check if phone has no digits or looks like date/timestamp or equals applicantName
  const hasDigits = /\d/.test(phone || '');
  if (!hasDigits || isTimestampOrDateString(phone) || (applicantName && phone.trim().toLowerCase() === applicantName.trim().toLowerCase())) {
    const candidatePhone = (
      sub.formData?.phone ||
      sub.formData?.['No WhatsApp Aktif'] ||
      sub.formData?.['No. WhatsApp / HP'] ||
      sub.formData?.['No WhatsApp'] ||
      sub.formData?.['No HP / WhatsApp Petugas KUA'] ||
      sub.formData?.whatsapp ||
      sub.formData?.noHp
    );
    if (candidatePhone && /\d/.test(candidatePhone) && !isTimestampOrDateString(candidatePhone)) {
      phone = candidatePhone.trim();
      changed = true;
    } else {
      phone = '-';
      changed = true;
    }
  }

  // Kosongkan catatan admin yang akan terkirim ke WA pemohon ("bukan dirapikan tapi kosongkan untuk catatan admin yang akan terkirim ke WA pemohon")
  let officerNotes = '';
  if (sub.officerNotes) {
    officerNotes = '';
    changed = true;
  }

  // HANYA simpan berkas yang diupload oleh pemohon (bukan berkas dokumen digital/spreadsheet/folder)
  // Berkas dari dokumen digital langsung dihapus secara otomatis tanpa perlu manual
  const originalFiles = Array.isArray(sub.files) ? sub.files : [];
  const files = originalFiles.filter(isPureUploadedFile);
  if (files.length !== originalFiles.length) {
    changed = true;
  }

  if (!changed) return sub;
  return {
    ...sub,
    applicantName,
    phone,
    district: district || sub.district,
    institutionName,
    officerNotes,
    files
  };
}

/**
 * Ekstraksi komprehensif seluruh tautan Google Drive / Google Docs / Cloud dari suatu objek permohonan.
 * Memindai sub.formData (secara rekursif termasuk array & nested object), sub.fileUrls, sub.driveUrl,
 * sub.googleDriveUrl, sub.link, sub.berkas, sub.tautan, sub.laporan, sub.notes, dll.
 */
/**
 * Ekstraksi berkas yang diupload oleh pemohon untuk diperiksa oleh petugas verifikator.
 * Berkas yang dimaksud HANYA berkas yang diunggah oleh pemohon (bukan dokumen digital/spreadsheet/template).
 */
export function extractAllDriveFilesFromSubmission(sub: any): UploadedFileInfo[] {
  if (!sub) return [];
  
  // 1. Normalisasi berkas yang sudah ada di sub.files (yang diunggah pemohon)
  const existingFiles: UploadedFileInfo[] = (Array.isArray(sub.files) ? sub.files : []).filter((f: any) => {
    if (!f) return false;
    const rawUrl = f.googleDriveViewUrl || f.url || (typeof f === 'string' ? f : undefined);
    // Abaikan tautan dokumen digital seperti spreadsheet, google forms, atau google docs non-file
    if (rawUrl && (rawUrl.includes('docs.google.com/spreadsheets') || rawUrl.includes('docs.google.com/forms'))) {
      return false;
    }
    return true;
  }).map((f: any, idx: number) => {
    const rawUrl = f.googleDriveViewUrl || f.url || (typeof f === 'string' ? f : undefined);
    const isDrive = rawUrl && (rawUrl.includes('drive.google.com') || rawUrl.includes('docs.google.com'));
    const isFolder = rawUrl && rawUrl.includes('/folders/');
    
    let viewUrl = f.googleDriveViewUrl;
    let dlUrl = f.googleDriveDownloadUrl;
    if (rawUrl && !viewUrl) {
      viewUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    }
    if (viewUrl && isDrive && !isFolder && !dlUrl) {
      if (viewUrl.includes('/view')) {
        dlUrl = viewUrl.replace('/view', '/export?format=pdf');
      } else if (viewUrl.includes('open?id=')) {
        const fid = viewUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
        if (fid) dlUrl = `https://drive.google.com/uc?export=download&id=${fid}`;
      } else if (viewUrl.includes('/file/d/')) {
        const fid = viewUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
        if (fid) dlUrl = `https://drive.google.com/uc?export=download&id=${fid}`;
      }
    }

    return {
      fieldName: f.fieldName || `file_${idx + 1}`,
      label: f.label || f.fileName || `Berkas Unggahan ${idx + 1}`,
      fileName: f.fileName || `Dokumen_Upload_${idx + 1}.${isFolder ? 'zip' : 'pdf'}`,
      fileSize: (typeof f.fileSize === 'number' && !isNaN(f.fileSize) && f.fileSize > 0) ? f.fileSize : 1024 * 1024,
      fileType: f.fileType || (isFolder ? 'application/zip' : 'application/pdf'),
      uploadedAt: f.uploadedAt || sub.submittedAt || new Date().toISOString(),
      dataUrl: f.dataUrl,
      googleDriveFileId: f.googleDriveFileId,
      googleDriveViewUrl: viewUrl,
      googleDriveDownloadUrl: dlUrl,
      cloudStorageUrl: f.cloudStorageUrl
    };
  });

  const foundCandidates: { url: string; label: string; fieldName: string; originalFileName?: string }[] = [];

  const addCandidate = (rawVal: any, rawLabel?: string, rawField?: string) => {
    if (!rawVal) return;
    if (typeof rawVal !== 'string') {
      if (Array.isArray(rawVal)) {
        rawVal.forEach((item, idx) => addCandidate(item, `${rawLabel || 'Berkas'} ${idx + 1}`, rawField));
      } else if (typeof rawVal === 'object') {
        Object.entries(rawVal).forEach(([k, v]) => addCandidate(v, k, k));
      }
      return;
    }

    const text = rawVal.trim();
    if (!text) return;

    // Abaikan jika text adalah dokumen digital (spreadsheet, forms, docx/docs, slides, folder)
    if (
      text.includes('docs.google.com/spreadsheets') || 
      text.includes('docs.google.com/forms') ||
      text.includes('docs.google.com/document') ||
      text.includes('docs.google.com/presentation') ||
      text.includes('/folders/')
    ) {
      return;
    }

    // Deteksi pola standar Google Form upload: "Nama_File.pdf (https://drive.google.com/open?id=...)"
    const gFormMatch = text.match(/^(.+?)\s*\((https?:\/\/[^\)]+)\)$/);
    if (gFormMatch) {
      const explicitName = gFormMatch[1].trim();
      const explicitUrl = gFormMatch[2].trim();
      if (
        !explicitUrl.includes('spreadsheets') && 
        !explicitUrl.includes('forms') && 
        !explicitUrl.includes('document') &&
        !explicitUrl.includes('/folders/') &&
        !foundCandidates.some(c => c.url.toLowerCase() === explicitUrl.toLowerCase())
      ) {
        foundCandidates.push({
          url: explicitUrl,
          label: explicitName || rawLabel || 'Berkas Upload Pemohon',
          fieldName: rawField || 'upload_file',
          originalFileName: explicitName
        });
      }
      return;
    }

    // Ekstraksi hanya URL berkas Google Drive / Cloud yang valid
    const urlPattern = /(?:https?:\/\/|drive\.google\.com\/)[^\s,;"'<>\)\]]+/gi;
    const matches: string[] = (text.match(urlPattern) as string[] | null) || [];

    matches.forEach((u) => {
      let clean = u.replace(/[.,;:\)\]"'>]+$/, '').trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }

      // Pastikan bukan link dokumen digital, spreadsheet, form, atau folder
      if (
        clean.includes('spreadsheets') || 
        clean.includes('docs.google.com/forms') ||
        clean.includes('docs.google.com/document') ||
        clean.includes('docs.google.com/presentation') ||
        clean.includes('/folders/')
      ) {
        return;
      }

      if (!foundCandidates.some(c => c.url.toLowerCase() === clean.toLowerCase())) {
        const cleanLabel = (rawLabel || '')
          .replace(/_/g, ' ')
          .replace(/^col\s*\d+\s*/i, '')
          .replace(/^[0-9]+\.\s*/, '')
          .trim();
        foundCandidates.push({
          url: clean,
          label: cleanLabel || 'Berkas Upload Pemohon',
          fieldName: rawField || 'upload_file'
        });
      }
    });
  };

  // Pindai sub.formData, sub.fileUrls, dll untuk menemukan berkas yang diunggah
  if (sub.formData && typeof sub.formData === 'object') {
    Object.entries(sub.formData).forEach(([k, v]) => {
      addCandidate(v, k, k);
    });
  }
  if (sub.fileUrls) {
    addCandidate(sub.fileUrls, 'Berkas Upload', 'fileUrls');
  }

  // Bangun daftar berkas terverifikasi
  const resultFiles = [...existingFiles];

  foundCandidates.forEach((candidate) => {
    const u = candidate.url;
    if (!u) return; // Hanya berkas riil dengan link/data yang diupload

    const alreadyListed = resultFiles.some((ef) => {
      if (candidate.originalFileName && ef.fileName && ef.fileName.toLowerCase() === candidate.originalFileName.toLowerCase()) return true;
      if (u && ef.googleDriveViewUrl && ef.googleDriveViewUrl.toLowerCase() === u.toLowerCase()) return true;
      if (u && ef.googleDriveDownloadUrl && ef.googleDriveDownloadUrl.toLowerCase() === u.toLowerCase()) return true;
      
      const getFileId = (str?: string) => {
        if (!str) return null;
        const m = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || str.match(/id=([a-zA-Z0-9_-]+)/) || str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        return m ? m[1] : null;
      };
      const candId = getFileId(u);
      const efId = getFileId(ef.googleDriveViewUrl) || ef.googleDriveFileId;
      if (candId && efId && candId === efId) return true;
      return false;
    });

    if (!alreadyListed) {
      const isDrive = !!(u && u.includes('drive.google.com'));
      const isFolder = !!(u && u.includes('/folders/'));
      const isImage = !!(u && /\.(jpe?g|png|webp|gif)($|\?)/i.test(u)) || (candidate.originalFileName && /\.(jpe?g|png|webp|gif)$/i.test(candidate.originalFileName));

      let downloadUrl: string | undefined = undefined;
      if (isDrive && !isFolder && u) {
        if (u.includes('/view')) {
          downloadUrl = u.replace('/view', '/export?format=pdf');
        } else if (u.includes('open?id=')) {
          const fid = u.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
          if (fid) {
            downloadUrl = `https://drive.google.com/uc?export=download&id=${fid}`;
          }
        } else if (u.includes('/file/d/')) {
          const fid = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
          if (fid) {
            downloadUrl = `https://drive.google.com/uc?export=download&id=${fid}`;
          }
        }
      }

      const fileNum = resultFiles.length + 1;
      const baseLabel = candidate.label || `Berkas Upload ${fileNum}`;
      let ext = isFolder ? 'zip' : (isImage ? 'jpg' : 'pdf');
      let mimeType = isFolder ? 'application/zip' : (isImage ? 'image/jpeg' : 'application/pdf');

      const safeName = (candidate.originalFileName || baseLabel)
        .replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 40);

      resultFiles.push({
        fieldName: candidate.fieldName ? `${candidate.fieldName}_${fileNum}` : `file_${fileNum}`,
        label: baseLabel,
        fileName: candidate.originalFileName || `${safeName || 'Berkas_Upload'}_${fileNum}.${ext}`,
        fileSize: 1024 * 1024,
        fileType: mimeType,
        uploadedAt: sub.submittedAt || new Date().toISOString(),
        googleDriveViewUrl: u || undefined,
        googleDriveDownloadUrl: downloadUrl
      });
    }
  });

  return resultFiles;
}

// In-memory cache for synchronous render
let cachedSubmissions: SubmissionRecord[] = [];
let cachedSurveys: SurveyRecord[] = [];

// Initialize memory cache from localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Purge deprecated v1 and v2 old cached keys immediately
    ['malabbiri_submissions_v1', 'malabbiri_submissions_v2', 'malabbiri_submissions'].forEach((oldKey) => {
      try { localStorage.removeItem(oldKey); } catch (e) { /* ignore */ }
    });

    const rawSubs = localStorage.getItem(SUBMISSIONS_KEY);
    if (rawSubs) {
      const parsed: SubmissionRecord[] = JSON.parse(rawSubs);
      cachedSubmissions = parsed.map(repairSubmissionFields);
      try {
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(cachedSubmissions));
      } catch (e) { /* ignore */ }
    } else {
      cachedSubmissions = [];
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
    }

    const rawSurveys = localStorage.getItem(SURVEYS_KEY);
    if (rawSurveys) {
      cachedSurveys = JSON.parse(rawSurveys);
    } else {
      cachedSurveys = [];
      localStorage.setItem(SURVEYS_KEY, JSON.stringify([]));
    }
  }
} catch (err) {
  console.warn('Local storage init error:', err);
}

// Event listeners for real-time reactivity
type SubmissionsListener = (submissions: SubmissionRecord[]) => void;
type SurveysListener = (surveys: SurveyRecord[]) => void;

const submissionsListeners: Set<SubmissionsListener> = new Set();
const surveysListeners: Set<SurveysListener> = new Set();

function notifySubmissionsListeners() {
  submissionsListeners.forEach((cb) => {
    try {
      cb([...cachedSubmissions]);
    } catch (e) {
      console.error('Error in submission listener:', e);
    }
  });
}

function notifySurveysListeners() {
  surveysListeners.forEach((cb) => {
    try {
      cb([...cachedSurveys]);
    } catch (e) {
      console.error('Error in survey listener:', e);
    }
  });
}

export function subscribeToSubmissions(listener: SubmissionsListener): () => void {
  submissionsListeners.add(listener);
  // Send current cached data immediately
  listener([...cachedSubmissions]);
  return () => {
    submissionsListeners.delete(listener);
  };
}

export function subscribeToSurveys(listener: SurveysListener): () => void {
  surveysListeners.add(listener);
  listener([...cachedSurveys]);
  return () => {
    surveysListeners.delete(listener);
  };
}

/**
 * Strips undefined values and prevents huge base64 strings from exceeding Firestore 1MB limits
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (key === 'files' && Array.isArray(value)) {
      sanitized[key] = value.map((file) => {
        const copy = { ...file };
        // If dataUrl is larger than 300KB, remove it from the Firestore doc to ensure safe cloud sync
        if (copy.dataUrl && copy.dataUrl.length > 300000) {
          delete copy.dataUrl;
        }
        return copy;
      });
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForFirestore(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Start real-time synchronization with Firestore
let isSyncInitialized = false;

export function initFirestoreSync() {
  if (isSyncInitialized || typeof window === 'undefined') return;
  isSyncInitialized = true;

  const submissionsRef = collection(db, 'submissions');
  const surveysRef = collection(db, 'surveys');

  // Real-time listener for submissions across all devices (HP, Laptop, PC)
  try {
    const qSubmissions = query(submissionsRef);
    onSnapshot(
      qSubmissions,
      (snapshot) => {
        const remoteList: SubmissionRecord[] = [];
        snapshot.forEach((d) => {
          remoteList.push(d.data() as SubmissionRecord);
        });

        // Preserve local file dataUrls when remote Firestore snapshot omits them
        const existingMap = new Map(cachedSubmissions.map((s) => [s.id, s]));
        const mergedList: SubmissionRecord[] = remoteList.map((remoteSub) => {
          const repairedRemote = repairSubmissionFields(remoteSub);
          const localSub = existingMap.get(remoteSub.id);
          if (!localSub) return repairedRemote;

          const filePool = [...(repairedRemote.files || [])].filter(isPureUploadedFile);
          (localSub.files || []).filter(isPureUploadedFile).forEach((lf) => {
            const matchIndex = filePool.findIndex(
              (rf) => (rf.fileName === lf.fileName && rf.fieldName === lf.fieldName) ||
                      (rf.googleDriveViewUrl && lf.googleDriveViewUrl && rf.googleDriveViewUrl.toLowerCase() === lf.googleDriveViewUrl.toLowerCase())
            );
            if (matchIndex >= 0) {
              if (lf.dataUrl && !filePool[matchIndex].dataUrl) {
                filePool[matchIndex] = { ...filePool[matchIndex], dataUrl: lf.dataUrl };
              }
            } else {
              filePool.push(lf);
            }
          });

          return repairSubmissionFields({ ...repairedRemote, files: filePool.filter(isPureUploadedFile) });
        });

        // Sort descending by submission time
        mergedList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        cachedSubmissions = mergedList;
        try {
          localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(mergedList));
        } catch (e) {
          // If quota exceeded due to dataUrls, strip dataUrls for localStorage only
          try {
            const lightList = mergedList.map((sub) => ({
              ...sub,
              files: sub.files.map((f) => {
                const copy = { ...f };
                delete copy.dataUrl;
                return copy;
              })
            }));
            localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(lightList));
          } catch (innerErr) {
            // ignore
          }
        }
        notifySubmissionsListeners();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'submissions');
        } catch (e) {
          console.warn('Falling back to cached submissions:', e);
        }
      }
    );
  } catch (err) {
    console.error('Failed to bind submissions snapshot listener:', err);
  }

  // Real-time listener for surveys
  try {
    const qSurveys = query(surveysRef);
    onSnapshot(
      qSurveys,
      (snapshot) => {
        const remoteList: SurveyRecord[] = [];
        snapshot.forEach((d) => {
          remoteList.push(d.data() as SurveyRecord);
        });

        remoteList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        cachedSurveys = remoteList;
        try {
          localStorage.setItem(SURVEYS_KEY, JSON.stringify(remoteList));
        } catch (e) {
          // ignore
        }
        notifySurveysListeners();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'surveys');
        } catch (e) {
          console.warn('Falling back to cached surveys:', e);
        }
      }
    );
  } catch (err) {
    console.error('Failed to bind surveys snapshot listener:', err);
  }
}

// Automatically trigger sync when imported
if (typeof window !== 'undefined') {
  initFirestoreSync();
}

export function getStoredSubmissions(): SubmissionRecord[] {
  return [...cachedSubmissions];
}

export function saveSubmissions(list: SubmissionRecord[]): void {
  cachedSubmissions = list;
  try {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(list));
  } catch (err) {
    // If quota exceeded due to file dataUrls, store lightweight records in localStorage
    try {
      const lightList = list.map((sub) => ({
        ...sub,
        files: sub.files.map((f) => {
          const copy = { ...f };
          delete copy.dataUrl;
          return copy;
        })
      }));
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(lightList));
    } catch (innerErr) {
      console.warn('Could not cache submissions in localStorage:', innerErr);
    }
  }
  notifySubmissionsListeners();
}

export async function clearAllSubmissions(): Promise<void> {
  cachedSubmissions = [];
  
  // Wipe all known localStorage keys
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      ['malabbiri_submissions', 'malabbiri_submissions_v1', 'malabbiri_submissions_v2', 'malabbiri_submissions_v3'].forEach((k) => {
        try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
      });
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
    }
  } catch (err) {
    console.error('Failed to clear submissions from localStorage:', err);
  }
  
  notifySubmissionsListeners();

  // Also remove from Firestore cloud
  try {
    const snapshot = await getDocs(collection(db, 'submissions'));
    if (!snapshot.empty) {
      const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }
  } catch (err) {
    console.error('Firestore delete error:', err);
  }
}

export function generateSubmissionId(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `MLB-${year}-${randomNum}`;
}

export function createNewSubmission(
  newRecord: Omit<SubmissionRecord, 'id' | 'verificationCode' | 'statusHistory'> & { id?: string }
): SubmissionRecord {
  const id = newRecord.id || generateSubmissionId();
  const verificationCode = `VRF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const submission: SubmissionRecord = {
    ...newRecord,
    id,
    verificationCode,
    statusHistory: [
      {
        status: newRecord.status,
        timestamp: newRecord.submittedAt,
        note: 'Permohonan berhasil didaftarkan secara online ke basis data MALA\'BIRI',
        officerName: 'Sistem Cloud MALA\'BIRI'
      }
    ]
  };

  // 1. Permanently preserve original raw file payloads into IndexedDB
  if (submission.files && submission.files.length > 0) {
    submission.files.forEach((f) => {
      if (f.dataUrl) {
        storeFileInDb(generateFileKey(id, f.fileName, f.fieldName), f.dataUrl).catch((err) => {
          console.warn('IndexedDB write error for file:', err);
        });
      }
    });
  }

  // 2. Optimistically update local cache and notify immediately
  const updated = [submission, ...cachedSubmissions];
  saveSubmissions(updated);

  // 3. Persist to Firestore cloud asynchronously
  (async () => {
    try {
      const safeData = sanitizeForFirestore(submission);
      await setDoc(doc(db, 'submissions', id), safeData);
    } catch (err) {
      console.error('Failed to write submission to Firestore:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `submissions/${id}`);
      } catch (e) {
        // error logged
      }
    }
  })();

  return submission;
}

export async function deleteSubmission(id: string): Promise<boolean> {
  cachedSubmissions = cachedSubmissions.filter((item) => item.id.toUpperCase() !== id.toUpperCase());
  saveSubmissions([...cachedSubmissions]);

  // Delete from Firestore
  try {
    await deleteDoc(doc(db, 'submissions', id));
  } catch (err) {
    console.error('Failed to delete submission from Firestore:', err);
  }
  return true;
}

export function updateSubmissionStatus(
  id: string,
  newStatus: ApplicationStatus,
  note: string,
  officerName: string,
  epaiGrade?: string
): SubmissionRecord | null {
  const index = cachedSubmissions.findIndex((item) => item.id.toUpperCase() === id.toUpperCase());
  if (index === -1) return null;

  const current = cachedSubmissions[index];
  const historyNote = epaiGrade 
    ? `${note ? note + ' ' : ''}[Penilaian Laporan: ${epaiGrade}]`
    : (note || `Status diperbarui menjadi ${newStatus}`);

  const updatedHistory = [
    ...current.statusHistory,
    {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: historyNote,
      officerName: officerName || 'Petugas Bimas Islam'
    }
  ];

  const updatedRecord: SubmissionRecord = {
    ...current,
    status: newStatus,
    officerNotes: note,
    statusHistory: updatedHistory,
    ...(epaiGrade ? { epaiGrade } : {})
  };

  // 1. Update local cache
  cachedSubmissions[index] = updatedRecord;
  saveSubmissions([...cachedSubmissions]);

  // 2. Persist to Firestore cloud
  (async () => {
    try {
      const safeData = sanitizeForFirestore(updatedRecord);
      await setDoc(doc(db, 'submissions', updatedRecord.id), safeData, { merge: true });
    } catch (err) {
      console.error('Failed to update submission in Firestore:', err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `submissions/${updatedRecord.id}`);
      } catch (e) {
        // error logged
      }
    }
  })();

  return updatedRecord;
}

/**
 * Resubmits revised files for an existing submission under the same Ticket Number.
 * Changes status from REVISION_NEEDED back to VERIFYING without creating a new application.
 */
export async function resubmitSubmissionRevision(
  id: string,
  updatedFiles: UploadedFileInfo[],
  applicantNote?: string
): Promise<SubmissionRecord | null> {
  const index = cachedSubmissions.findIndex((item) => item.id.toUpperCase() === id.toUpperCase());
  if (index === -1) return null;

  const current = cachedSubmissions[index];

  // 1. Store any new file dataUrls into IndexedDB permanently
  if (updatedFiles && updatedFiles.length > 0) {
    updatedFiles.forEach((f) => {
      if (f.dataUrl) {
        storeFileInDb(generateFileKey(current.id, f.fileName, f.fieldName), f.dataUrl).catch((err) => {
          console.warn('IndexedDB write error for revised file:', err);
        });
      }
    });
  }

  const revisionNoteText = applicantNote?.trim()
    ? `Pemohon telah mengunggah perbaikan berkas: "${applicantNote.trim()}". Berkas siap diverifikasi ulang.`
    : 'Pemohon telah mengunggah perbaikan berkas yang diminta. Berkas siap diverifikasi ulang.';

  const updatedHistory = [
    ...current.statusHistory,
    {
      status: 'VERIFYING' as ApplicationStatus,
      timestamp: new Date().toISOString(),
      note: revisionNoteText,
      officerName: 'Pemohon (Unggah Perbaikan)'
    }
  ];

  const updatedRecord: SubmissionRecord = {
    ...current,
    files: updatedFiles,
    status: 'VERIFYING',
    statusHistory: updatedHistory
  };

  // 2. Update local cache & localStorage
  cachedSubmissions[index] = updatedRecord;
  saveSubmissions([...cachedSubmissions]);

  // 3. Persist to Firestore cloud
  try {
    const safeData = sanitizeForFirestore(updatedRecord);
    await setDoc(doc(db, 'submissions', updatedRecord.id), safeData, { merge: true });
  } catch (err) {
    console.error('Failed to update revised submission in Firestore:', err);
    try {
      handleFirestoreError(err, OperationType.UPDATE, `submissions/${updatedRecord.id}`);
    } catch (e) {
      // error logged
    }
  }

  return updatedRecord;
}

export function getStoredSurveys(): SurveyRecord[] {
  return [...cachedSurveys];
}

export function saveSurvey(survey: Omit<SurveyRecord, 'id' | 'createdAt'>): SurveyRecord {
  const id = `IKM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const record: SurveyRecord = {
    ...survey,
    id,
    createdAt: new Date().toISOString()
  };

  // 1. Optimistic local cache
  cachedSurveys = [record, ...cachedSurveys];
  try {
    localStorage.setItem(SURVEYS_KEY, JSON.stringify(cachedSurveys));
  } catch (e) {
    console.error('Error saving survey locally', e);
  }
  notifySurveysListeners();

  // 2. Persist to Firestore
  (async () => {
    try {
      const safe = sanitizeForFirestore(record);
      await setDoc(doc(db, 'surveys', id), safe);
    } catch (err) {
      console.error('Failed to save survey to Firestore:', err);
      try {
        handleFirestoreError(err, OperationType.CREATE, `surveys/${id}`);
      } catch (e) {
        // error logged
      }
    }
  })();

  return record;
}

export function getServiceStatistics() {
  const submissions = getStoredSubmissions();
  const surveys = getStoredSurveys();

  const total = submissions.length;
  const approved = submissions.filter((s) => s.status === 'APPROVED' || s.status === 'COMPLETED').length;
  const inProcess = submissions.filter(
    (s) => s.status === 'SUBMITTED' || s.status === 'VERIFYING' || s.status === 'REVIEW'
  ).length;
  const revision = submissions.filter((s) => s.status === 'REVISION_NEEDED').length;

  const averageRating =
    surveys.length > 0
      ? (surveys.reduce((acc, curr) => acc + curr.overallRating, 0) / surveys.length).toFixed(1)
      : '5.0';

  const serviceCounts: Record<number, number> = {};
  submissions.forEach((s) => {
    serviceCounts[s.serviceId] = (serviceCounts[s.serviceId] || 0) + 1;
  });

  const districtCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    if (s.district) {
      districtCounts[s.district] = (districtCounts[s.district] || 0) + 1;
    }
  });

  return {
    total,
    approved,
    inProcess,
    revision,
    averageRating,
    surveyCount: surveys.length,
    serviceCounts,
    districtCounts
  };
}

/**
 * Menyinkronkan atau mengimpor data permohonan dari Google Drive & Google Sheets
 * Mencegah duplikasi data, menggabungkan tautan berkas, menyimpan ke Firestore, dan memperbarui cache lokal
 */
export async function importOrSyncSubmissions(
  incomingSubmissions: SubmissionRecord[]
): Promise<{ added: number; updated: number; total: number }> {
  if (!incomingSubmissions || incomingSubmissions.length === 0) {
    return { added: 0, updated: 0, total: cachedSubmissions.length };
  }

  let added = 0;
  let updated = 0;
  const currentMap = new Map<string, SubmissionRecord>();
  cachedSubmissions.forEach(s => currentMap.set(s.id.toUpperCase(), s));

  for (const rawItem of incomingSubmissions) {
    if (!rawItem.id) continue;
    const item = repairSubmissionFields(rawItem);
    let key = item.id.toUpperCase();
    let existingKey: string | null = currentMap.has(key) ? key : null;

    // Jika ID belum cocok langsung, coba cari apakah nama pemohon atau nomor HP sudah ada sebelumnya di sistem
    if (!existingKey) {
      for (const [k, s] of currentMap.entries()) {
        const itemCleanName = item.applicantName?.trim().toLowerCase();
        const existCleanName = s.applicantName?.trim().toLowerCase();
        const nameMatches = itemCleanName && existCleanName && 
          itemCleanName !== '-' && existCleanName !== '-' && 
          itemCleanName !== 'pemohon layanan' && existCleanName !== 'pemohon layanan' &&
          (itemCleanName === existCleanName || existCleanName.includes(itemCleanName) || itemCleanName.includes(existCleanName));

        const itemNum = item.phone?.replace(/[^0-9]/g, '');
        const existNum = s.phone?.replace(/[^0-9]/g, '');
        const phoneMatches = itemNum && existNum && itemNum.length >= 9 && itemNum === existNum;

        if (nameMatches || phoneMatches) {
          existingKey = k;
          break;
        }
      }
    }

    if (existingKey) {
      // Data sudah ada: perbarui tautan berkas Google Drive & perbaiki nama/telepon jika sebelumnya korup
      const existing = currentMap.get(existingKey)!;
      const mergedFiles = [...(existing.files || [])];
      (item.files || []).forEach(nf => {
        if (!mergedFiles.some(mf => mf.fileName === nf.fileName || (nf.googleDriveViewUrl && mf.googleDriveViewUrl === nf.googleDriveViewUrl))) {
          mergedFiles.push(nf);
        }
      });

      // Prioritize valid applicant name and phone
      const finalName = (!isLooksLikeServiceName(item.applicantName, item.serviceTitle) && item.applicantName && item.applicantName !== 'Pemohon Layanan')
        ? item.applicantName
        : (!isLooksLikeServiceName(existing.applicantName, existing.serviceTitle) ? existing.applicantName : item.applicantName);

      const finalPhone = (!isTimestampOrDateString(item.phone) && item.phone && item.phone !== '081234567890' && item.phone !== '-')
        ? item.phone
        : (!isTimestampOrDateString(existing.phone) && existing.phone !== '-' ? existing.phone : item.phone);

      const merged: SubmissionRecord = {
        ...existing,
        ...item,
        id: existing.id, // Pertahankan ID tiket asli yang sudah ada
        verificationCode: existing.verificationCode || item.verificationCode,
        applicantName: finalName || existing.applicantName,
        phone: finalPhone || existing.phone,
        status: existing.status || item.status, // preserve officer review status
        statusHistory: existing.statusHistory && existing.statusHistory.length > 0 ? existing.statusHistory : item.statusHistory,
        files: mergedFiles
      };
      currentMap.set(existingKey, merged);
      updated++;
      
      try {
        const safeData = sanitizeForFirestore(merged);
        await setDoc(doc(db, 'submissions', merged.id), safeData, { merge: true });
      } catch (err) {
        console.warn('Sync update doc error:', err);
      }
    } else {
      // Data baru dari Google Drive/Sheet: tambahkan ke sistem
      currentMap.set(key, item);
      added++;

      try {
        const safeData = sanitizeForFirestore(item);
        await setDoc(doc(db, 'submissions', item.id), safeData, { merge: true });
      } catch (err) {
        console.warn('Sync new doc error:', err);
      }
    }
  }

  const resultList = Array.from(currentMap.values());
  resultList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  cachedSubmissions = resultList;
  saveSubmissions(resultList);
  notifySubmissionsListeners();

  return { added, updated, total: resultList.length };
}

/**
 * Memperbarui nama pemohon dan nomor telepon langsung dari Panel Verifikasi
 */
export async function updateSubmissionApplicant(
  id: string,
  applicantName: string,
  phone: string,
  district?: string,
  institutionName?: string,
  address?: string
): Promise<SubmissionRecord | null> {
  const index = cachedSubmissions.findIndex((item) => item.id.toUpperCase() === id.toUpperCase());
  if (index === -1) return null;

  const existing = cachedSubmissions[index];
  const updated: SubmissionRecord = {
    ...existing,
    applicantName: applicantName.trim() || existing.applicantName,
    phone: phone.trim() || existing.phone,
    district: district !== undefined ? district : existing.district,
    institutionName: institutionName !== undefined ? institutionName : existing.institutionName,
    address: address !== undefined ? address : existing.address,
    formData: {
      ...(existing.formData || {}),
      applicantName: applicantName.trim() || existing.applicantName,
      phone: phone.trim() || existing.phone
    }
  };

  cachedSubmissions[index] = updated;
  saveSubmissions([...cachedSubmissions]);
  notifySubmissionsListeners();

  try {
    const safeData = sanitizeForFirestore(updated);
    await setDoc(doc(db, 'submissions', id), safeData, { merge: true });
  } catch (err) {
    console.error('Failed to update submission applicant in Firestore:', err);
  }

  return updated;
}

/**
 * Menautkan berkas atau folder Google Drive secara langsung ke permohonan yang ada di Panel Verifikasi
 */
export async function attachDriveFileToSubmission(
  submissionId: string,
  driveUrl: string,
  label?: string
): Promise<SubmissionRecord | null> {
  const index = cachedSubmissions.findIndex((item) => item.id.toUpperCase() === submissionId.toUpperCase());
  if (index === -1) return null;

  const current = cachedSubmissions[index];
  let cleanUrl = driveUrl.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  const existingFiles = Array.isArray(current.files) ? [...current.files] : [];
  const fileNum = existingFiles.length + 1;

  const isDrive = cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com');
  const isFolder = cleanUrl.includes('/folders/');
  const isSheet = cleanUrl.includes('docs.google.com/spreadsheets');
  const isDoc = cleanUrl.includes('docs.google.com/document');

  let downloadUrl: string | undefined = undefined;
  if (isDrive && !isFolder) {
    if (cleanUrl.includes('/view')) {
      downloadUrl = cleanUrl.replace('/view', '/export?format=pdf');
    } else if (cleanUrl.includes('open?id=')) {
      const fid = cleanUrl.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
      if (fid) {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fid}`;
      }
    } else if (cleanUrl.includes('/file/d/')) {
      const fid = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      if (fid) {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fid}`;
      }
    }
  }

  const cleanLabel = (label && label.trim()) || (current.serviceTitle ? `${current.serviceTitle}` : `Berkas Google Drive ${fileNum}`);
  let ext = 'pdf';
  let mimeType = 'application/pdf';
  if (isFolder) {
    ext = 'zip';
    mimeType = 'application/zip';
  } else if (isSheet) {
    ext = 'xlsx';
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (isDoc) {
    ext = 'docx';
    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  const safeName = cleanLabel
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 40);

  const newFile: UploadedFileInfo = {
    fieldName: `berkas_manual_drive_${Date.now()}_${fileNum}`,
    label: cleanLabel,
    fileName: `${safeName || 'Dokumen_Drive'}_${fileNum}.${ext}`,
    fileSize: 1024 * 1024,
    fileType: mimeType,
    uploadedAt: new Date().toISOString(),
    googleDriveViewUrl: cleanUrl,
    googleDriveDownloadUrl: downloadUrl
  };

  const updatedRecord: SubmissionRecord = {
    ...current,
    files: [...existingFiles, newFile],
    formData: {
      ...(current.formData || {}),
      googleDriveUrl: cleanUrl
    }
  };

  cachedSubmissions[index] = updatedRecord;
  saveSubmissions([...cachedSubmissions]);
  notifySubmissionsListeners();

  try {
    const safeData = sanitizeForFirestore(updatedRecord);
    await setDoc(doc(db, 'submissions', submissionId), safeData, { merge: true });
  } catch (err) {
    console.warn('Failed to update files in Firestore:', err);
  }

  return updatedRecord;
}

/**
 * Pindai seluruh data permohonan yang ada di sistem untuk memulihkan dan menautkan
 * berkas Google Drive secara instan ke Panel Verifikasi.
 */
export async function scanAndRecoverAllDriveFiles(): Promise<{ totalRecovered: number; affectedSubmissions: number }> {
  let totalRecovered = 0;
  let affectedSubmissions = 0;

  const updatedList = cachedSubmissions.map((sub) => {
    const beforeCount = Array.isArray(sub.files) ? sub.files.length : 0;
    const repaired = repairSubmissionFields(sub);
    const afterCount = Array.isArray(repaired.files) ? repaired.files.length : 0;

    if (afterCount > beforeCount) {
      totalRecovered += (afterCount - beforeCount);
      affectedSubmissions++;

      // Sync update to Firestore
      try {
        const safeData = sanitizeForFirestore(repaired);
        setDoc(doc(db, 'submissions', repaired.id), safeData, { merge: true }).catch(() => {});
      } catch (e) {
        // ignore
      }
    }
    return repaired;
  });

  if (affectedSubmissions > 0) {
    cachedSubmissions = updatedList;
    saveSubmissions(updatedList);
    notifySubmissionsListeners();
  }

  return { totalRecovered, affectedSubmissions };
}

/**
 * Menghapus satu atau banyak berkas dari permohonan secara bersih
 * (membersihkan juga dari formData & fileUrls agar tidak terangkat kembali).
 */
export async function removeFileFromSubmission(
  submissionId: string,
  fileIndex: number
): Promise<SubmissionRecord | null> {
  return removeMarkedFilesFromSubmission(submissionId, [fileIndex]);
}

/**
 * Menghapus semua berkas yang ditandai (berdasarkan daftar index)
 */
export async function removeMarkedFilesFromSubmission(
  submissionId: string,
  fileIndices: number[]
): Promise<SubmissionRecord | null> {
  const index = cachedSubmissions.findIndex((item) => item.id.toUpperCase() === submissionId.toUpperCase());
  if (index === -1) return null;

  const current = cachedSubmissions[index];
  const existingFiles = Array.isArray(current.files) ? [...current.files] : [];
  if (existingFiles.length === 0) return current;

  // Kumpulkan URL dan nama file yang dihapus untuk pembersihan referensi
  const removedFiles = fileIndices
    .filter(idx => idx >= 0 && idx < existingFiles.length)
    .map(idx => existingFiles[idx]);

  const targetUrls = new Set<string>();
  const targetNames = new Set<string>();
  removedFiles.forEach(f => {
    if (f.googleDriveViewUrl) targetUrls.add(f.googleDriveViewUrl.toLowerCase());
    if (f.googleDriveDownloadUrl) targetUrls.add(f.googleDriveDownloadUrl.toLowerCase());
    if (f.cloudStorageUrl) targetUrls.add(f.cloudStorageUrl.toLowerCase());
    if (f.fileName) targetNames.add(f.fileName.toLowerCase());
  });

  // Filter berkas yang tersisa
  const remainingFiles = existingFiles.filter((_, idx) => !fileIndices.includes(idx));

  // Bersihkan juga dari formData jika nilainya merujuk ke URL/nama file yang dihapus
  const updatedFormData = { ...(current.formData || {}) };
  Object.keys(updatedFormData).forEach(k => {
    const val = updatedFormData[k];
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      for (const u of targetUrls) {
        if (lower.includes(u)) {
          delete updatedFormData[k];
          break;
        }
      }
    }
  });

  // Bersihkan dari fileUrls jika ada
  let updatedFileUrls = current.fileUrls;
  if (typeof updatedFileUrls === 'string') {
    let lower = updatedFileUrls.toLowerCase();
    for (const u of targetUrls) {
      if (lower.includes(u)) {
        updatedFileUrls = undefined;
        break;
      }
    }
  }

  const updatedRecord: SubmissionRecord = {
    ...current,
    files: remainingFiles,
    formData: updatedFormData,
    fileUrls: updatedFileUrls
  };

  cachedSubmissions[index] = updatedRecord;
  saveSubmissions([...cachedSubmissions]);
  notifySubmissionsListeners();

  try {
    const safeData = sanitizeForFirestore(updatedRecord);
    await setDoc(doc(db, 'submissions', submissionId), safeData, { merge: true });
  } catch (err) {
    console.warn('Failed to delete files from Firestore:', err);
  }

  return updatedRecord;
}

/**
 * Menghapus seluruh berkas unggahan pada suatu permohonan
 */
export async function removeAllFilesFromSubmission(
  submissionId: string
): Promise<SubmissionRecord | null> {
  const index = cachedSubmissions.findIndex((item) => item.id.toUpperCase() === submissionId.toUpperCase());
  if (index === -1) return null;

  const current = cachedSubmissions[index];
  const allIndices = Array.isArray(current.files) ? current.files.map((_, i) => i) : [];
  return removeMarkedFilesFromSubmission(submissionId, allIndices);
}

/**
 * Menghapus banyak permohonan sekaligus (bulk delete yang ditandai)
 */
export async function deleteMultipleSubmissions(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  const upperIds = new Set(ids.map(id => id.toUpperCase()));
  cachedSubmissions = cachedSubmissions.filter((item) => !upperIds.has(item.id.toUpperCase()));
  saveSubmissions([...cachedSubmissions]);
  notifySubmissionsListeners();

  // Hapus dari Firestore
  for (const id of ids) {
    try {
      await deleteDoc(doc(db, 'submissions', id));
    } catch (err) {
      console.error('Failed to delete submission from Firestore:', err);
    }
  }
  return true;
}


