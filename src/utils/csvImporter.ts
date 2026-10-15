import { SubmissionRecord, ApplicationStatus, UploadedFileInfo } from '../types';
import { SERVICES_LIST } from '../data/services';
import { generateSubmissionId, isPureUploadedFile } from './storage';
import { resolveAutoKuaName, cleanAndTidyNotes } from './notesHelper';

/**
 * Robust CSV parser that handles quotes, escaped quotes, multiline values, and commas/semicolons
 */
export function parseCSV(text: string): string[][] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  // Detect separator from first non-empty line: comma or semicolon or tab
  const firstLine = clean.split('\n')[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  let separator = ',';
  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    separator = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    separator = '\t';
  }

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Matches a service title or keyword to one of the 9 official Bimas Islam services
 */
export function matchService(rawTitle: string): { id: number; title: string } {
  if (!rawTitle) {
    return { id: 1, title: SERVICES_LIST[0].title };
  }

  const lower = rawTitle.toLowerCase().trim();
  
  for (const s of SERVICES_LIST) {
    if (lower === s.title.toLowerCase()) {
      return { id: s.id, title: s.title };
    }
  }

  // Keyword matching
  if (lower.includes('masjid') || lower.includes('mushalla') || lower.includes('tipologi') || lower.includes('id masjid')) {
    return { id: 1, title: SERVICES_LIST[0].title };
  }
  if (lower.includes('arah kiblat') || lower.includes('kiblat') || lower.includes('kalibrasi')) {
    return { id: 2, title: SERVICES_LIST[1].title };
  }
  if (lower.includes('wakaf') || lower.includes('aiw') || lower.includes('nazhir') || lower.includes('tanah')) {
    return { id: 3, title: SERVICES_LIST[2].title };
  }
  if (lower.includes('rekomendasi') || lower.includes('bantuan') || lower.includes('proposal') || lower.includes('hibah')) {
    return { id: 4, title: SERVICES_LIST[3].title };
  }
  if (lower.includes('konsultasi') || lower.includes('keluarga') || lower.includes('bp4') || lower.includes('mediasi')) {
    return { id: 5, title: SERVICES_LIST[4].title };
  }
  if (lower.includes('rohaniawan') || lower.includes('sumpah') || lower.includes('pelantikan')) {
    return { id: 6, title: SERVICES_LIST[5].title };
  }
  if (lower.includes('penyelenggara zakat') || lower.includes('paz') || lower.includes('laz') || lower.includes('amil')) {
    return { id: 7, title: SERVICES_LIST[6].title };
  }
  if (lower.includes('duplikat') || lower.includes('buku nikah') || lower.includes('legalisir')) {
    return { id: 8, title: SERVICES_LIST[7].title };
  }
  if (lower.includes('laporan') || lower.includes('penyuluh') || lower.includes('epai') || lower.includes('e-pai') || lower.includes('kinerja')) {
    return { id: 9, title: SERVICES_LIST[8].title };
  }

  return { id: 1, title: rawTitle || SERVICES_LIST[0].title };
}

/**
 * Normalizes Indonesian dates or ISO dates into ISO string
 */
export function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  
  // Try standard parse
  const parsed = Date.parse(raw);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  // Handle dd/mm/yyyy or dd-mm-yyyy
  const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 10;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    return new Date(year, month, day, hour, minute).toISOString();
  }

  return new Date().toISOString();
}

/**
 * Convert parsed CSV rows into SubmissionRecord list
 */
export function convertRowsToSubmissions(rows: string[][]): {
  records: SubmissionRecord[];
  skippedCount: number;
} {
  if (!rows || rows.length < 2) {
    return { records: [], skippedCount: 0 };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(h => (h || '').toString().toLowerCase().trim());

  // Helper to test if a string looks like an Indonesian phone number
  const isPhonePattern = (val: string) => {
    const clean = val.replace(/[\s\-\'\.]/g, '');
    return /^(08|\+?628)\d{7,12}$/.test(clean) || (/^\d{9,14}$/.test(clean) && !val.includes('/') && !val.includes(':'));
  };

  // Helper to test if a string looks like a date/timestamp
  const isDatePattern = (val: string) => {
    return /\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(val) || /\d{1,2}:\d{1,2}/.test(val) || /\d{1,2}\.\d{1,2}\.\d{1,2}/.test(val);
  };

  // Find column indexes strictly
  const idxTimestamp = headers.findIndex(h => h.includes('waktu') || h.includes('timestamp') || h.includes('tanggal'));
  const idxId = headers.findIndex(h => h.includes('tiket') || h.includes('kode') || (h.includes('id') && !h.includes('masjid')));
  
  // Service index: must not be applicant name
  const idxService = headers.findIndex(h => (h.includes('layanan') || h.includes('jenis permohonan') || h.includes('kategori')) && !h.includes('pemohon'));
  
  // Name index: MUST NOT match "nama layanan", "nama file", "nama berkas", "nama lembaga", "nama masjid"
  let idxName = headers.findIndex(h => {
    const isExcluded = h.includes('layanan') || h.includes('file') || h.includes('berkas') || h.includes('dokumen') || h.includes('lembaga') || h.includes('masjid') || h.includes('kua');
    if (isExcluded) return false;
    return h.includes('pemohon') || h.includes('nama lengkap') || h.includes('nama penyuluh') || h.includes('nama pengirim') || h.includes('nama pendaftar') || h === 'nama';
  });
  if (idxName === -1) {
    idxName = headers.findIndex(h => h.includes('nama') && !h.includes('layanan') && !h.includes('file') && !h.includes('berkas') && !h.includes('lembaga') && !h.includes('masjid'));
  }

  // Phone index: MUST NOT match "waktu", "waktu pengajuan"
  const idxPhone = headers.findIndex(h => {
    if (h.includes('waktu') || h.includes('tanggal')) return false;
    return h.includes('whatsapp') || h.includes('telepon') || h.includes('kontak') || h.includes('hp') || /(?:^|[^a-z])wa(?:[^a-z]|$)/i.test(h);
  });

  const idxEmail = headers.findIndex(h => h.includes('email') || h.includes('pos-el'));
  const idxDistrict = headers.findIndex(h => h.includes('kecamatan') || h.includes('wilayah'));
  const idxAddress = headers.findIndex(h => h.includes('alamat') || h.includes('lokasi'));
  const idxInstitution = headers.findIndex(h => h.includes('lembaga') || h.includes('masjid') || h.includes('mushalla') || h.includes('kua') || h.includes('organisasi'));
  const idxStatus = headers.findIndex(h => h.includes('status'));
  const idxFiles = headers.findIndex(h => h.includes('drive') || h.includes('berkas') || h.includes('file') || h.includes('dokumen') || h.includes('lampiran') || h.includes('link') || h.includes('tautan'));
  const idxNotes = headers.findIndex(h => h.includes('keterangan') || h.includes('catatan') || h.includes('pesan') || h.includes('keperluan'));

  const records: SubmissionRecord[] = [];
  let skippedCount = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every(c => !c.trim())) {
      continue;
    }

    let rawName = idxName >= 0 ? (row[idxName] || '').trim() : '';
    let rawPhone = idxPhone >= 0 ? (row[idxPhone] || '').trim().replace(/^'/, '') : '';
    const rawService = idxService >= 0 ? (row[idxService] || '').trim() : '';

    // Smart row-level value repair:
    // If rawPhone looks like a timestamp/date, scan other row columns to find a true phone number
    if (isDatePattern(rawPhone)) {
      rawPhone = '';
      for (let c = 0; c < row.length; c++) {
        const cell = (row[c] || '').trim().replace(/^'/, '');
        if (isPhonePattern(cell)) {
          rawPhone = cell;
          break;
        }
      }
    }

    // If rawName looks like a service title, scan row columns to find a person's name
    if (rawName && (rawName.toLowerCase().startsWith('laporan bulanan') || rawName.toLowerCase().startsWith('layanan') || rawName.toLowerCase() === rawService.toLowerCase())) {
      for (let c = 0; c < row.length; c++) {
        if (c === idxService || c === idxTimestamp) continue;
        const cell = (row[c] || '').trim();
        // Candidate person name: 3-50 chars, letters/spaces/punctuation, not a phone/date/url
        if (
          cell.length >= 3 && 
          cell.length <= 60 && 
          !isPhonePattern(cell) && 
          !isDatePattern(cell) && 
          !cell.startsWith('http') && 
          !cell.toLowerCase().startsWith('laporan') &&
          !cell.toLowerCase().startsWith('layanan') &&
          !cell.toLowerCase().startsWith('kec.') &&
          !/^\d+$/.test(cell)
        ) {
          rawName = cell;
          break;
        }
      }
    }

    // If row has no name and no service, skip
    if (!rawName && !rawService) {
      skippedCount++;
      continue;
    }

    const serviceInfo = matchService(rawService);
    const existingId = idxId >= 0 ? (row[idxId] || '').trim() : '';
    const submissionId = existingId && existingId.length >= 6 ? existingId : generateSubmissionId();

    const rawTime = idxTimestamp >= 0 ? row[idxTimestamp] : '';
    const submittedAt = normalizeDate(rawTime);

    // Parse file drive links: Scan seluruh kolom untuk mendeteksi berkas asli yang diunggah pemohon
    const files: UploadedFileInfo[] = [];

    // Helper untuk mengecek apakah suatu URL merupakan file biner asli (bukan spreadsheet/form/doc/folder)
    const isExcludedDigitalDoc = (u: string) => {
      const lower = u.toLowerCase();
      return (
        lower.includes('spreadsheets') ||
        lower.includes('docs.google.com/forms') ||
        lower.includes('docs.google.com/document') ||
        lower.includes('docs.google.com/presentation') ||
        lower.includes('/folders/') ||
        lower.includes('drive.google.com/drive/folders')
      );
    };

    // 1. Periksa kolom spesifik idxFiles jika ada
    const rawFilesString = idxFiles >= 0 ? (row[idxFiles] || '').trim() : '';
    if (rawFilesString) {
      const driveRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*(?:drive\.google\.com|docs\.google\.com)[^\s,;"'<>\)\]]+/gi;
      const matched = rawFilesString.match(driveRegex) || rawFilesString.match(/https?:\/\/[^\s,;"'<>\)\]]+/g) || [];
      matched.forEach((rawUrl: string, uIdx: number) => {
        let url = rawUrl.replace(/[.,;:\)\]"'>]+$/, '').trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
        if (isExcludedDigitalDoc(url)) return;
        if (!files.some(f => f.googleDriveViewUrl === url)) {
          const isDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
          let dlUrl: string | undefined = undefined;
          if (isDrive) {
            if (url.includes('/view')) dlUrl = url.replace('/view', '/export?format=pdf');
            else if (url.includes('open?id=')) dlUrl = `https://drive.google.com/uc?export=download&id=${url.match(/id=([a-zA-Z0-9_-]+)/)?.[1]}`;
            else if (url.includes('/file/d/')) dlUrl = `https://drive.google.com/uc?export=download&id=${url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]}`;
          }
          const candidateFile: UploadedFileInfo = {
            fieldName: `berkas_${uIdx + 1}`,
            label: `Berkas Unggahan Pemohon ${uIdx + 1}`,
            fileName: isDrive ? `Berkas_Upload_${uIdx + 1}.pdf` : `Berkas_${uIdx + 1}.pdf`,
            fileSize: 1024 * 1024,
            fileType: 'application/pdf',
            uploadedAt: submittedAt,
            googleDriveViewUrl: url,
            googleDriveDownloadUrl: dlUrl
          };
          if (isPureUploadedFile(candidateFile)) {
            files.push(candidateFile);
          }
        }
      });
    }

    // 2. Pindai seluruh kolom pada baris untuk menemukan tautan Google Drive dari pertanyaan upload Google Form
    for (let c = 0; c < row.length; c++) {
      if (c === idxTimestamp || c === idxId || c === idxPhone || c === idxEmail) continue;
      const cell = (row[c] || '').trim();
      if (!cell) continue;

      const driveRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*(?:drive\.google\.com|docs\.google\.com)[^\s,;"'<>\)\]]+/gi;
      const matchedUrls = cell.match(driveRegex) || cell.match(/https?:\/\/[^\s,;"'<>\)\]]+/g) || [];
      if (matchedUrls && matchedUrls.length > 0) {
        const colHeader = (rawHeaders[c] || `Berkas ${c + 1}`).trim();
        matchedUrls.forEach((rawUrl: string) => {
          let url = rawUrl.replace(/[.,;:\)\]"'>]+$/, '').trim();
          if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
          if (isExcludedDigitalDoc(url)) return;
          if (!files.some(f => f.googleDriveViewUrl === url)) {
            const isDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
            const cleanLabel = colHeader.replace(/^[0-9]+\.\s*/, '').trim();
            const safeFileName = cleanLabel.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
            let dlUrl: string | undefined = undefined;
            if (isDrive) {
              if (url.includes('/view')) dlUrl = url.replace('/view', '/export?format=pdf');
              else if (url.includes('open?id=')) dlUrl = `https://drive.google.com/uc?export=download&id=${url.match(/id=([a-zA-Z0-9_-]+)/)?.[1]}`;
              else if (url.includes('/file/d/')) dlUrl = `https://drive.google.com/uc?export=download&id=${url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]}`;
            }
            const candidateFile: UploadedFileInfo = {
              fieldName: `berkas_col_${c}_${files.length + 1}`,
              label: cleanLabel || `Berkas Unggahan ${files.length + 1}`,
              fileName: isDrive ? `${safeFileName || 'Berkas_Upload'}_${files.length + 1}.pdf` : `Berkas_${files.length + 1}.pdf`,
              fileSize: 1024 * 1024,
              fileType: 'application/pdf',
              uploadedAt: submittedAt,
              googleDriveViewUrl: url,
              googleDriveDownloadUrl: dlUrl
            };
            if (isPureUploadedFile(candidateFile)) {
              files.push(candidateFile);
            }
          }
        });
      }
    }

    const cleanFiles = files.filter(isPureUploadedFile);

    const rawStatus = idxStatus >= 0 ? (row[idxStatus] || '').trim().toUpperCase() : 'SUBMITTED';
    let status: ApplicationStatus = 'SUBMITTED';
    if (rawStatus.includes('SELESAI') || rawStatus === 'COMPLETED') status = 'COMPLETED';
    else if (rawStatus.includes('SETUJU') || rawStatus === 'APPROVED') status = 'APPROVED';
    else if (rawStatus.includes('PERBAIKAN') || rawStatus === 'REVISION_NEEDED') status = 'REVISION_NEEDED';
    else if (rawStatus.includes('VERIFIKASI') || rawStatus === 'VERIFYING') status = 'VERIFYING';
    else if (rawStatus.includes('TELAAH') || rawStatus === 'REVIEW') status = 'REVIEW';
    else if (rawStatus.includes('TOLAK') || rawStatus === 'REJECTED') status = 'REJECTED';

    const cleanDistrict = idxDistrict >= 0 ? (row[idxDistrict] || '').trim().replace(/^Kec\.?\s*/i, '') : '';
    const cleanAddress = idxAddress >= 0 ? (row[idxAddress] || '').trim() : (cleanDistrict ? `Kecamatan ${cleanDistrict}` : 'Kabupaten Gowa');
    const rawInst = idxInstitution >= 0 ? (row[idxInstitution] || '').trim() : '';
    const cleanInst = resolveAutoKuaName(cleanDistrict, rawInst);
    const rawNotes = idxNotes >= 0 ? (row[idxNotes] || '').trim() : '';
    const cleanNotes = cleanAndTidyNotes(rawNotes);

    // If applicantName looks like service name or is generic, do not leave it corrupted
    const cleanApplicantName = (rawName && !rawName.toLowerCase().startsWith('laporan') && !rawName.toLowerCase().startsWith('layanan') && rawName !== serviceInfo.title)
      ? rawName
      : '-';

    const rec: SubmissionRecord = {
      id: submissionId,
      verificationCode: `VRF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      serviceId: serviceInfo.id,
      serviceTitle: serviceInfo.title,
      applicantName: cleanApplicantName,
      phone: rawPhone || '-',
      email: idxEmail >= 0 ? (row[idxEmail] || '').trim() : undefined,
      district: cleanDistrict || undefined,
      address: cleanAddress,
      institutionName: cleanInst !== '-' ? cleanInst : undefined,
      status,
      submittedAt,
      files,
      formData: {
        applicantName: cleanApplicantName !== '-' ? cleanApplicantName : undefined,
        phone: rawPhone && rawPhone !== '-' ? rawPhone : undefined,
        district: cleanDistrict,
        address: cleanAddress,
        institutionName: cleanInst !== '-' ? cleanInst : undefined,
        serviceTitle: serviceInfo.title,
        notes: cleanNotes || undefined,
        source: 'Google Drive / Google Sheet Import'
      },
      checklistConfirmed: [],
      officerNotes: '',
      statusHistory: [
        {
          status,
          timestamp: submittedAt,
          note: 'Data pengajuan disinkronkan dari arsip Google Drive & Google Sheets kantor',
          officerName: 'Sinkronisasi Google Drive MALA\'BIRI'
        }
      ]
    };

    records.push(rec);
  }

  return { records, skippedCount };
}
