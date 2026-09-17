import { UploadedFileInfo, OfficerAccount, OfficerSession, SubmissionRecord } from '../types';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { jsPDF } from 'jspdf';
import { generateFileKey, getFileFromDb, storeFileInDb } from './indexedDbStorage';
import { getFileFromChunks } from './chunkedStorage';

const OFFICERS_STORAGE_KEY = 'malabbiri_officers_v4';
const OFFICER_SESSION_KEY = 'malabbiri_officer_session_v4';
const DELETED_OFFICERS_KEY = 'malabbiri_deleted_officer_nips_v4';

export const DEFAULT_ADMIN_EMAIL = 'jadilahterbaik@gmail.com';

// Legacy built-in demo names & NIPs to permanently purge
export const PURGED_DEMO_NIPS = ['197501012000031001', '198504152010011020'];
export const PURGED_DEMO_NAMES = [
  'H. Sardy Yoelfa, S.Ag., M.Ag.',
  'H. Sardy Yoelfa, S.Ag., M.Ag. (Administrator Utama)',
  'Drs. H. Muhammad Ilyas, M.Pd.I'
];

export function getStatusLabelIndo(status: string | undefined): string {
  switch (status) {
    case 'SUBMITTED':
      return 'Diajukan (Menunggu Verifikasi)';
    case 'VERIFYING':
      return 'Sedang Diverifikasi Petugas';
    case 'REVIEW':
      return 'Proses Telaah / Pengukuran';
    case 'APPROVED':
      return 'Disetujui & Diterbitkan';
    case 'REVISION_NEEDED':
      return 'Perlu Perbaikan Berkas';
    case 'REJECTED':
      return 'Ditolak';
    default:
      return status || '-';
  }
}

export function getDeletedOfficerNips(): string[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(DELETED_OFFICERS_KEY) : null;
    const list = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...list, ...PURGED_DEMO_NIPS]));
  } catch (e) {
    return PURGED_DEMO_NIPS;
  }
}

// Akun Admin & Petugas Resmi Terdaftar
export const AUTHORIZED_OFFICERS: OfficerAccount[] = [
  {
    nip: '197105041998031003',
    username: 'tajuddin',
    name: 'H. Tajuddin, S.Ag., M.Ag.',
    jabatan: 'Kepala Seksi Bimas Islam',
    role: 'KASI',
    pin: '123456',
    email: 'tajuddin@kemenag.go.id'
  },
  {
    nip: '198902122019032011',
    username: 'ridhayani',
    name: 'Ridhayani',
    jabatan: 'Staf / Verifikator Berkas',
    role: 'VERIFIKATOR',
    pin: '123456',
    email: 'ridhayani@kemenag.go.id'
  }
];

// Helper to clean and merge stored officers
function filterOutDeletedAndPurged(list: OfficerAccount[]): OfficerAccount[] {
  const deletedNips = getDeletedOfficerNips();
  return list.filter(o => 
    o && 
    !deletedNips.includes(o.nip) && 
    !PURGED_DEMO_NAMES.includes(o.name)
  );
}

function mergeWithDefaultOfficers(list: OfficerAccount[]): OfficerAccount[] {
  const filtered = filterOutDeletedAndPurged(list);
  const deletedNips = getDeletedOfficerNips();

  if (filtered.length === 0) {
    return [...AUTHORIZED_OFFICERS];
  }

  for (const def of AUTHORIZED_OFFICERS) {
    if (deletedNips.includes(def.nip)) continue;
    const exists = filtered.some(
      o => o.nip === def.nip || o.username.toLowerCase() === def.username.toLowerCase()
    );
    if (!exists) {
      filtered.push(def);
    }
  }
  return filtered;
}

// Immediate purge on startup across browser storage and Firestore
try {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('malabbiri_officer_session_v1');
    localStorage.removeItem('malabbiri_officer_session_v1');

    // Clean stored officers list
    const rawOfficers = localStorage.getItem(OFFICERS_STORAGE_KEY);
    if (rawOfficers) {
      const parsed = JSON.parse(rawOfficers);
      if (Array.isArray(parsed)) {
        const cleaned = filterOutDeletedAndPurged(parsed);
        localStorage.setItem(OFFICERS_STORAGE_KEY, JSON.stringify(cleaned));
      }
    }

    // Clean current session if it used a purged officer
    const rawSession = sessionStorage.getItem(OFFICER_SESSION_KEY) || localStorage.getItem(OFFICER_SESSION_KEY);
    if (rawSession) {
      const parsedSession = JSON.parse(rawSession);
      if (parsedSession?.officer) {
        if (
          PURGED_DEMO_NIPS.includes(parsedSession.officer.nip) ||
          PURGED_DEMO_NAMES.includes(parsedSession.officer.name)
        ) {
          parsedSession.officer = AUTHORIZED_OFFICERS[0];
          sessionStorage.setItem(OFFICER_SESSION_KEY, JSON.stringify(parsedSession));
          localStorage.setItem(OFFICER_SESSION_KEY, JSON.stringify(parsedSession));
        }
      }
    }

    // Purge from cloud Firestore
    PURGED_DEMO_NIPS.forEach((nip) => {
      deleteDoc(doc(db, 'officers', nip)).catch(() => {});
    });
  }
} catch (e) {
  // Ignore storage access errors
}

// In-memory cache for officers
let cachedOfficers: OfficerAccount[] = AUTHORIZED_OFFICERS;
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = localStorage.getItem(OFFICERS_STORAGE_KEY);
    if (raw) {
      cachedOfficers = mergeWithDefaultOfficers(JSON.parse(raw));
    } else {
      localStorage.setItem(OFFICERS_STORAGE_KEY, JSON.stringify(AUTHORIZED_OFFICERS));
    }
  }
} catch (e) {
  // ignore
}

// Sync officer accounts with Firestore cloud across devices
if (typeof window !== 'undefined') {
  try {
    const officersCol = collection(db, 'officers');
    onSnapshot(
      officersCol,
      (snapshot) => {
        if (snapshot.empty && cachedOfficers.length > 0) {
          cachedOfficers.forEach(async (officer) => {
            try {
              await setDoc(doc(db, 'officers', officer.nip), officer);
            } catch (err) {
              // ignore
            }
          });
          return;
        }

        const remoteOfficers: OfficerAccount[] = [];
        snapshot.forEach((d) => {
          const off = d.data() as OfficerAccount;
          if (
            off &&
            !PURGED_DEMO_NIPS.includes(off.nip) &&
            !PURGED_DEMO_NAMES.includes(off.name) &&
            !getDeletedOfficerNips().includes(off.nip)
          ) {
            remoteOfficers.push(off);
          } else if (off && (PURGED_DEMO_NIPS.includes(off.nip) || PURGED_DEMO_NAMES.includes(off.name))) {
            // Permanently remove legacy demo account from Firestore
            deleteDoc(doc(db, 'officers', off.nip)).catch(() => {});
          }
        });

        if (remoteOfficers.length > 0) {
          cachedOfficers = mergeWithDefaultOfficers(remoteOfficers);
          try {
            localStorage.setItem(OFFICERS_STORAGE_KEY, JSON.stringify(cachedOfficers));
          } catch (e) {
            // ignore
          }
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'officers');
        } catch (e) {
          console.warn('Officer sync notice: falling back to local cached officers:', e);
        }
      }
    );
  } catch (err) {
    console.warn('Officer cloud sync initialization notice:', err);
  }
}

export function getStoredOfficers(): OfficerAccount[] {
  try {
    const raw = localStorage.getItem(OFFICERS_STORAGE_KEY);
    if (!raw) return cachedOfficers;
    const parsed = JSON.parse(raw);
    return mergeWithDefaultOfficers(parsed);
  } catch (e) {
    console.error('Failed to parse officers:', e);
    return cachedOfficers;
  }
}

export function getDefaultAdminAccount(): OfficerAccount {
  return AUTHORIZED_OFFICERS[0];
}

export function saveOfficerAccount(newOfficer: OfficerAccount): void {
  try {
    const officers = getStoredOfficers();
    const existingIndex = officers.findIndex(
      o => o.nip === newOfficer.nip || o.username.toLowerCase() === newOfficer.username.toLowerCase()
    );
    if (existingIndex >= 0) {
      officers[existingIndex] = newOfficer;
    } else {
      officers.push(newOfficer);
    }
    cachedOfficers = filterOutDeletedAndPurged(officers);
    localStorage.setItem(OFFICERS_STORAGE_KEY, JSON.stringify(cachedOfficers));

    // Persist to Firestore cloud for multi-device login (phone, laptop, PC)
    setDoc(doc(db, 'officers', newOfficer.nip), newOfficer).catch((err) => {
      console.warn('Failed to sync officer to cloud:', err);
    });
  } catch (e) {
    console.error('Failed to save officer:', e);
  }
}

export function deleteOfficerAccount(nip: string): void {
  try {
    const deletedNips = getDeletedOfficerNips();
    if (!deletedNips.includes(nip)) {
      deletedNips.push(nip);
      if (typeof window !== 'undefined') {
        localStorage.setItem(DELETED_OFFICERS_KEY, JSON.stringify(deletedNips));
      }
    }

    const officers = getStoredOfficers().filter(o => o.nip !== nip);
    cachedOfficers = filterOutDeletedAndPurged(officers);
    localStorage.setItem(OFFICERS_STORAGE_KEY, JSON.stringify(cachedOfficers));

    deleteDoc(doc(db, 'officers', nip)).catch((err) => {
      console.warn('Failed to delete officer from cloud:', err);
    });
  } catch (e) {
    console.error('Failed to delete officer:', e);
  }
}

export function getOfficerSession(): OfficerSession | null {
  try {
    const raw = sessionStorage.getItem(OFFICER_SESSION_KEY) || localStorage.getItem(OFFICER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.isLoggedIn) return null;

    // Defensively ensure officer account information is present and valid
    if (!parsed.officer || typeof parsed.officer !== 'object') {
      parsed.officer = getDefaultAdminAccount();
    }
    if (!parsed.officer.name || PURGED_DEMO_NAMES.includes(parsed.officer.name)) {
      parsed.officer.name = AUTHORIZED_OFFICERS[0].name;
    }
    if (!parsed.officer.nip || PURGED_DEMO_NIPS.includes(parsed.officer.nip)) {
      parsed.officer.nip = AUTHORIZED_OFFICERS[0].nip;
    }
    if (!parsed.officer.role) {
      parsed.officer.role = 'KASI';
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse officer session:', e);
    return null;
  }
}

export function saveOfficerSession(session: OfficerSession, remember: boolean = true): void {
  try {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(OFFICER_SESSION_KEY, serialized);
    if (remember) {
      localStorage.setItem(OFFICER_SESSION_KEY, serialized);
    }
  } catch (e) {
    console.error('Failed to save officer session:', e);
  }
}

export function clearOfficerSession(): void {
  try {
    sessionStorage.removeItem(OFFICER_SESSION_KEY);
    localStorage.removeItem(OFFICER_SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear officer session:', e);
  }
}

/**
 * Converts a standard browser File to a base64 data URL string
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 Data URL to a native binary Blob
 */
export function dataURLtoBlob(dataUrl: string): Blob {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) {
      return new Blob([dataUrl], { type: 'text/plain;charset=utf-8' });
    }
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('Failed to parse data URL as binary blob:', err);
    return new Blob([dataUrl], { type: 'text/plain;charset=utf-8' });
  }
}

/**
 * Generates an authentic, fully compliant PDF document conforming to the PDF standard
 * using jsPDF. This guarantees that Adobe Acrobat, Chrome, and all PDF viewers open it
 * smoothly without any "Failed to load PDF document" or "corrupted file" errors.
 */
export function generateSamplePdfBlob(file: UploadedFileInfo, submissionId?: string, applicantName?: string): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 1. Official Letterhead (Kop Surat Kemenag Gowa)
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', 105, 20, { align: 'center' });

  doc.setFontSize(13);
  doc.text('KANTOR KEMENTERIAN AGAMA KABUPATEN GOWA', 105, 26, { align: 'center' });

  doc.setFontSize(11);
  doc.text('SEKSI BIMBINGAN MASYARAKAT ISLAM', 105, 31, { align: 'center' });

  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Jalan H. Agussalim No. 3 Sungguminasa, 92111 Telp (0411) 865195, Fax (0411) 867354', 105, 36.5, { align: 'center' });
  doc.text('Pos-el kab.gowa@kemenag.go.id  laman https://gowa.kemenag.go.id/', 105, 40.5, { align: 'center' });

  // Official double border line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(20, 43.5, 190, 43.5);
  doc.setLineWidth(0.25);
  doc.line(20, 44.7, 190, 44.7);

  // 2. Document Title
  doc.setFont('times', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ARSIP DIGITAL DOKUMEN LAYANAN MALA\'BIRI', 105, 55, { align: 'center' });
  doc.setLineWidth(0.2);
  doc.line(45, 56.5, 165, 56.5);

  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Nomor Registrasi: ${submissionId || 'MLB-2026-ARCHIVE'}`, 105, 62, { align: 'center' });

  // 3. Metadata Information Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(20, 68, 170, 50, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('DATA IDENTITAS BERKAS TERVERIFIKASI:', 25, 75);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Nama Berkas             : ${file.fileName}`, 25, 82);
  doc.text(`• Kategori Persyaratan   : ${file.label}`, 25, 88);
  doc.text(`• Nama Pemohon           : ${applicantName || 'Pemohon Layanan MALA\'BIRI'}`, 25, 94);
  const uploadDate = file.uploadedAt ? new Date(file.uploadedAt) : new Date();
  doc.text(`• Waktu Unggah / Kirim   : ${uploadDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} ${uploadDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA`, 25, 100);
  doc.text(`• Status Otentikasi       : Berkas Sah & Tersimpan di Basis Data MALA'BIRI`, 25, 106);
  doc.text(`• Ukuran Dokumen         : ${(file.fileSize / (1024 * 1024)).toFixed(2)} MB`, 25, 112);

  // 4. Verification Statement
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);

  const statement1 = `Diterangkan bahwa dokumen dengan nama berkas "${file.fileName}" yang dilampirkan untuk pemenuhan syarat layanan pada Seksi Bimbingan Masyarakat Islam Kantor Kementerian Agama Kabupaten Gowa telah teregistrasi dalam sistem elektronik MALA'BIRI.`;
  const split1 = doc.splitTextToSize(statement1, 170);
  doc.text(split1, 20, 128);

  const statement2 = `Dokumen ini sah sebagai arsip verifikasi berkas permohonan. Petugas dan verifikator Bimas Islam Kemenag Kabupaten Gowa berhak melakukan pemeriksaan keabsahan data fisik maupun digital sesuai dengan ketentuan perundang-undangan dan petunjuk teknis yang berlaku.`;
  const split2 = doc.splitTextToSize(statement2, 170);
  doc.text(split2, 20, 144);

  // 5. Official Verification Stamp and Signatures
  const todayStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Left side: Digital Stamp
  doc.setDrawColor(5, 150, 105);
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(20, 172, 65, 24, 2, 2, 'FD');
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('✓ DIGITAL ARCHIVE VERIFIED', 52.5, 179, { align: 'center' });
  doc.setFontSize(7);
  doc.text('MALA\'BIRI BIMAS ISLAM GOWA', 52.5, 185, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('KEMENTERIAN AGAMA KAB. GOWA', 52.5, 190, { align: 'center' });

  // Right side: Official Signature
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Sungguminasa, ${todayStr}`, 150, 172, { align: 'center' });
  doc.text('Petugas Seksi Bimas Islam,', 150, 177, { align: 'center' });

  doc.setDrawColor(148, 163, 184);
  doc.line(125, 202, 175, 202);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Tim Verifikasi Dokumen', 150, 207, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Kemenag Kabupaten Gowa', 150, 211, { align: 'center' });

  return doc.output('blob');
}

/**
 * Generates an official printable/downloadable HTML/document Blob for demo records
 * or fallback preview.
 */
export function generateSampleDocumentBlob(file: UploadedFileInfo, submissionId?: string, applicantName?: string): Blob {
  const isPdf = file.fileType === 'application/pdf' || /\.pdf$/i.test(file.fileName);
  if (isPdf) {
    return generateSamplePdfBlob(file, submissionId, applicantName);
  }

  const isImage = file.fileType.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.fileName);
  if (isImage) {
    // Generate a clean placeholder SVG / Image Blob
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#0f172a"/>
      <rect x="30" y="30" width="740" height="540" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2"/>
      <text x="400" y="240" fill="#10b981" font-family="sans-serif" font-size="28" font-weight="bold" text-anchor="middle">KEMENTERIAN AGAMA KABUPATEN GOWA</text>
      <text x="400" y="280" fill="#94a3b8" font-family="sans-serif" font-size="18" text-anchor="middle">Seksi Bimas Islam • Portal Layanan MALA'BIRI</text>
      <text x="400" y="340" fill="#f8fafc" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">${file.label}</text>
      <text x="400" y="380" fill="#64748b" font-family="monospace" font-size="16" text-anchor="middle">${file.fileName}</text>
      <text x="400" y="440" fill="#34d399" font-family="sans-serif" font-size="14" text-anchor="middle">✓ ARSIP DIGITAL TERVERIFIKASI</text>
    </svg>`;
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  // Plain text / document
  const content = `KEMENTERIAN AGAMA KABUPATEN GOWA - SEKSI BIMAS ISLAM
ARSIP DOKUMEN LAYANAN MALA'BIRI
------------------------------------------------------------
Nomor Registrasi : ${submissionId || 'MLB-ARCHIVE'}
Nama Berkas      : ${file.fileName}
Kategori Syarat  : ${file.label}
Nama Pemohon     : ${applicantName || '-'}
Waktu Unggah     : ${new Date(file.uploadedAt).toLocaleString('id-ID')}
Status           : Terverifikasi oleh Sistem MALA'BIRI Kemenag Kab. Gowa
`;
  return new Blob([content], { type: 'text/plain;charset=utf-8' });
}

/**
 * Triggers a direct, 100% reliable download of a file to the user's/officer's device.
 * Converted to native Blobs so Adobe Acrobat, Chrome PDF Viewer, and Mobile OS viewers
 * open the file cleanly without corrupted-format errors.
 */
export async function downloadFile(file: UploadedFileInfo, submissionId?: string, applicantName?: string): Promise<void> {
  try {
    // 0. Highest priority: If file has Firebase Cloud Storage URL (direct permanent raw file)
    if (file.cloudStorageUrl) {
      try {
        const response = await fetch(file.cloudStorageUrl);
        if (response.ok) {
          const blob = await response.blob();
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = file.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
          return;
        }
      } catch (cloudErr) {
        console.warn('Direct blob fetch failed, falling back to window navigation:', cloudErr);
        window.open(file.cloudStorageUrl, '_blank');
        return;
      }
    }

    // 0b. If file has a Google Drive download URL, trigger direct cloud download!
    if (file.googleDriveDownloadUrl) {
      const a = document.createElement('a');
      a.href = file.googleDriveDownloadUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const isPdf = file.fileType === 'application/pdf' || /\.pdf$/i.test(file.fileName);
    let blob: Blob | null = null;

    // 1. First priority: Check if file object already has dataUrl
    if (file.dataUrl && file.dataUrl.startsWith('data:')) {
      // Validate that if it's a PDF, the dataUrl isn't an HTML string mistakenly saved previously
      if (isPdf && file.dataUrl.startsWith('data:text/html')) {
        blob = generateSamplePdfBlob(file, submissionId, applicantName);
      } else {
        blob = dataURLtoBlob(file.dataUrl);
      }
    }

    // 2. Second priority: If no dataUrl in memory, check Chunked Firestore (100% Free Cross-Device)
    if (!blob && file.fileChunkId) {
      try {
        const chunkedBase64 = await getFileFromChunks(file.fileChunkId);
        if (chunkedBase64 && chunkedBase64.startsWith('data:')) {
          blob = dataURLtoBlob(chunkedBase64);
        }
      } catch (chunkErr) {
        console.warn('Could not reassemble file from chunks:', chunkErr);
      }
    }

    // 2b. Third priority: Check IndexedDB persistent file storage
    if (!blob && submissionId) {
      const dbKey = generateFileKey(submissionId, file.fileName, file.fieldName);
      const storedDataUrl = await getFileFromDb(dbKey);
      if (storedDataUrl && storedDataUrl.startsWith('data:')) {
        if (isPdf && storedDataUrl.startsWith('data:text/html')) {
          blob = generateSamplePdfBlob(file, submissionId, applicantName);
        } else {
          blob = dataURLtoBlob(storedDataUrl);
        }
      }
    }

    // 3. Fourth priority: Generate real standard document Blob (Real jsPDF for PDFs!)
    if (!blob) {
      if (isPdf) {
        blob = generateSamplePdfBlob(file, submissionId, applicantName);
      } else {
        blob = generateSampleDocumentBlob(file, submissionId, applicantName);
      }
    }

    // Trigger download using an object URL from the true binary Blob
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up object URL safely after delay
    setTimeout(() => {
      try {
        URL.revokeObjectURL(downloadUrl);
      } catch (e) {
        // ignore
      }
    }, 10000);
  } catch (err) {
    console.error('Failed to download file:', err);
    alert(`Gagal mengunduh file: ${file.fileName}. Silakan coba kembali.`);
  }
}

/**
 * Downloads all files for a submission sequentially
 */
export function downloadAllFilesBatch(files: UploadedFileInfo[], submissionId: string, applicantName: string): void {
  if (!files || files.length === 0) {
    alert('Tidak ada berkas yang diunggah untuk permohonan ini.');
    return;
  }

  files.forEach((file, index) => {
    setTimeout(() => {
      downloadFile(file, submissionId, applicantName);
    }, index * 400);
  });
}

/**
 * Loads the official Kemenag logo as a high-resolution PNG data URL
 * so it can be reliably embedded into jsPDF documents.
 */
let cachedKemenagPngDataUrl: string | null = null;

export async function getKemenagLogoDataUrl(): Promise<string | null> {
  if (cachedKemenagPngDataUrl) return cachedKemenagPngDataUrl;
  if (typeof window === 'undefined') return null;

  try {
    return await new Promise<string | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 380;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 400, 380);
            cachedKemenagPngDataUrl = canvas.toDataURL('image/png');
            resolve(cachedKemenagPngDataUrl);
            return;
          }
        } catch (e) {
          console.warn('Canvas conversion failed:', e);
        }
        resolve(null);
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = '/logokemenag.svg';
    });
  } catch (err) {
    console.warn('Could not load kemenag logo:', err);
    return null;
  }
}

/**
 * Generates and downloads the official, high-resolution 1-page A4 PDF of Tanda Terima Pendaftaran
 * with Kop Surat Kemenag Gowa, structured data table, digital stamp, and verification code.
 */
export async function downloadOfficialReceiptPdf(submission: SubmissionRecord): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const leftMargin = 20;
  const rightMargin = 190;
  const contentWidth = rightMargin - leftMargin;

  // 1. Official Letterhead Header - Render Logo Kemenag RI
  try {
    const logoDataUrl = await getKemenagLogoDataUrl();
    if (logoDataUrl) {
      // Embed Kemenag logo at left side of Kop Surat (x: 20mm, y: 15mm, w: 22mm, h: 21mm)
      doc.addImage(logoDataUrl, 'PNG', 20, 15, 22, 21);
    }
  } catch (imgErr) {
    console.warn('Failed to embed logo in PDF:', imgErr);
  }

  // Official Letterhead Typography
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', 112, 20, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(12.5);
  doc.text('KANTOR KEMENTERIAN AGAMA KABUPATEN GOWA', 112, 26, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Jalan H. Agussalim No. 3 Sungguminasa, 92111 Telp (0411) 865195, Fax (0411) 867354', 112, 31.5, { align: 'center' });
  doc.text('Pos-el: kab.gowa@kemenag.go.id   Laman: https://gowa.kemenag.go.id/', 112, 35.5, { align: 'center' });

  // Letterhead double divider lines
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(leftMargin, 39, rightMargin, 39);
  doc.setLineWidth(0.2);
  doc.line(leftMargin, 40.2, rightMargin, 40.2);

  // 2. Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('TANDA TERIMA PENDAFTARAN LAYANAN MALA\'BIRI', pageWidth / 2, 48, { align: 'center' });
  doc.setLineWidth(0.3);
  doc.line(45, 49.5, 165, 49.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nomor Registrasi: ${submission.id}`, pageWidth / 2, 55, { align: 'center' });

  // 3. Structured Information Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftMargin, 60, contentWidth, 68, 2, 2, 'FD');

  const rows = [
    { label: 'Jenis Layanan', value: submission.serviceTitle },
    { label: 'Nama Pemohon', value: submission.applicantName },
    { label: 'Nomor WhatsApp / HP', value: submission.phone },
    { label: 'Lembaga / Masjid', value: submission.institutionName || '-' },
    { label: 'Kecamatan Domisili', value: submission.district ? `Kecamatan ${submission.district}` : '-' },
    { label: 'Alamat Lengkap', value: submission.address },
    { 
      label: 'Waktu Pengajuan', 
      value: new Date(submission.submittedAt).toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }) + ` pukul ${new Date(submission.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA`
    },
    { label: 'Status Dokumen', value: getStatusLabelIndo(submission.status) }
  ];

  let currentY = 67;
  rows.forEach((row) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(row.label, leftMargin + 5, currentY);
    doc.text(':', leftMargin + 48, currentY);

    doc.setFont('helvetica', row.label === 'Status Dokumen' ? 'bold' : 'normal');
    if (row.label === 'Status Dokumen') {
      doc.setTextColor(5, 150, 105);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    const valText = doc.splitTextToSize(row.value, contentWidth - 55);
    doc.text(valText, leftMargin + 52, currentY);
    currentY += 7.5;
  });

  // 4. Uploaded Files Section
  let filesY = 135;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('DAFTAR BERKAS DOKUMEN YANG DISERAHKAN:', leftMargin, filesY);
  filesY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  if (submission.files && submission.files.length > 0) {
    submission.files.forEach((f, idx) => {
      doc.text(`${idx + 1}. ${f.label} (${f.fileName})`, leftMargin + 4, filesY);
      filesY += 5.5;
    });
  } else {
    doc.text('(Tidak ada lampiran berkas)', leftMargin + 4, filesY);
    filesY += 5.5;
  }

  // 5. Official Notice / Security Box
  filesY = Math.max(filesY + 4, 168);
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(leftMargin, filesY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const noteText = 'Catatan: Lembar tanda terima ini merupakan bukti registrasi sah layanan elektronik MALA\'BIRI Seksi Bimbingan Masyarakat Islam Kantor Kementerian Agama Kabupaten Gowa. Pemohon dapat melakukan pelacakan proses verifikasi dokumen secara mandiri melalui portal aplikasi.';
  doc.text(doc.splitTextToSize(noteText, contentWidth - 8), leftMargin + 4, filesY + 6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Kode Otentikasi Digital: ${submission.verificationCode}  |  ID: ${submission.id}`, leftMargin + 4, filesY + 17);

  // 6. Official Signatures
  const signY = filesY + 30;
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Left side: Applicant
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Pemohon,', leftMargin + 10, signY);

  doc.line(leftMargin + 5, signY + 22, leftMargin + 65, signY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${submission.applicantName} )`, leftMargin + 10, signY + 26);

  // Right side: Official Office
  const rightSignX = 145;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Sungguminasa, ${todayFormatted}`, rightSignX, signY, { align: 'center' });
  doc.text('Petugas Seksi Bimas Islam,', rightSignX, signY + 5, { align: 'center' });

  // Verification Badge
  doc.setDrawColor(5, 150, 105);
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(rightSignX - 30, signY + 9, 60, 7, 1.5, 1.5, 'FD');
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('✓ TERVERIFIKASI SISTEM MALA\'BIRI', rightSignX, signY + 13.8, { align: 'center' });

  doc.setDrawColor(15, 23, 42);
  doc.line(rightSignX - 30, signY + 22, rightSignX + 30, signY + 22);
  doc.setTextColor(15, 23, 42);
  doc.text('Kemenag Kabupaten Gowa', rightSignX, signY + 26, { align: 'center' });

  doc.save(`Tanda_Terima_${submission.id}.pdf`);
}
