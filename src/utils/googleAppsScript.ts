import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const APPS_SCRIPT_STORAGE_KEY = 'malabbiri_gas_webhook_url_v1';
const SETTING_DOC_ID = 'google_drive_integration';

// In-memory cache
let cachedScriptUrl: string | null = null;

export const DEFAULT_SCRIPT_TEMPLATE = `/**
 * WEBHOOK GOOGLE DRIVE & GOOGLE SHEET MALA'BIRI BIMAS ISLAM KEMENAG GOWA
 * 1. Menerima unggahan berkas asli pemohon dan menyimpannya ke Google Drive Kantor (100% Gratis).
 * 2. Merekam otomatis seluruh data identitas pemohon ke Google Sheets Kantor secara realtime.
 */

// 1. ID Spreadsheet dari link URL Google Sheet Anda (Sesuai file Google Sheet Anda)
var SPREADSHEET_ID = "1sLzphCK2Zhp6k0aHTY-YnOiECaGMmpkBZAUtSmqyu0Q";

// 2. Nama File & Folder Cadangan (jika SPREADSHEET_ID tidak sengaja dikosongkan)
var SPREADSHEET_NAME = "DATA_PERMOHONAN_MALABIRI_BIMAS_ISLAM_GOWA";
var DRIVE_FOLDER_NAME = "ARSIP_MALABIRI_BIMAS_ISLAM_GOWA";

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "";
  if (action === "get_submissions") {
    var result = getSubmissionsFromSheet();
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "MALA'BIRI Google Drive & Sheet Webhook",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);

    // ACTION 0: TARIK DATA PERMOHONAN DARI GOOGLE SHEETS KE WEB
    if (data.action === "get_submissions") {
      var fetchResult = getSubmissionsFromSheet();
      return ContentService.createTextOutput(JSON.stringify(fetchResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION 1: SIMPAN DATA IDENTITAS PEMOHON KE GOOGLE SHEETS
    if (data.action === "record_submission" || data.applicantName) {
      var sheetResult = recordSubmissionToSheet(data);
      return ContentService.createTextOutput(JSON.stringify(sheetResult))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ACTION 2: UNGGAH BERKAS KE GOOGLE DRIVE
    var fileName = data.fileName || ("berkas_" + new Date().getTime() + ".pdf");
    var mimeType = data.mimeType || "application/pdf";
    var base64Data = data.base64;

    if (!base64Data) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Data berkas base64 kosong"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Bersihkan prefix base64 jika ada
    if (base64Data.indexOf(';base64,') > -1) {
      base64Data = base64Data.split(';base64,')[1];
    }

    var decodedBytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    // Folder Utama
    var rootFolders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    var targetFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);

    // Subfolder per Nomor Tiket / ID Permohonan
    if (data.submissionId) {
      var subFolders = targetFolder.getFoldersByName(data.submissionId);
      targetFolder = subFolders.hasNext() ? subFolders.next() : targetFolder.createFolder(data.submissionId);
    }

    // Simpan berkas
    var file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
    var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: fileId,
      viewUrl: viewUrl,
      downloadUrl: downloadUrl,
      fileName: fileName
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Membuka Google Sheet secara presisi melalui ID atau nama file
 */
function getTargetSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (e) {
      Logger.log("openById gagal, mencari berdasarkan nama: " + e.toString());
    }
  }

  var files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  } else {
    return SpreadsheetApp.create(SPREADSHEET_NAME);
  }
}

/**
 * Fungsi pembantu untuk mencatat baris data pemohon ke Google Sheets
 */
function recordSubmissionToSheet(data) {
  try {
    var spreadsheet = getTargetSpreadsheet();
    var sheet = spreadsheet.getSheetByName("Data Permohonan") || spreadsheet.getSheets()[0];
    
    if (sheet.getName() !== "Data Permohonan") {
      sheet.setName("Data Permohonan");
    }

    // Jika sheet masih baru (kosong), buat baris judul (Header Kolom)
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Waktu Pengajuan",
        "Nomor Tiket (ID)",
        "Nama Layanan",
        "Nama Pemohon",
        "No. WhatsApp / HP",
        "Email",
        "Kecamatan",
        "Alamat Lengkap",
        "Nama Lembaga / Masjid / KUA",
        "Status Permohonan",
        "Jumlah Berkas Terunggah",
        "Tautan Berkas Google Drive",
        "Keterangan / Catatan Tambahan"
      ];
      sheet.appendRow(headers);

      // Format baris judul agar rapi & tebal
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#0f4c75");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // Susun baris data pemohon
    var submittedAt = data.submittedAt ? new Date(data.submittedAt).toLocaleString("id-ID", { timeZone: "Asia/Makassar" }) : new Date().toLocaleString("id-ID", { timeZone: "Asia/Makassar" });
    var fileLinks = "";
    if (data.fileUrls && Array.isArray(data.fileUrls)) {
      fileLinks = data.fileUrls.join("\\n");
    } else if (data.filesCount) {
      fileLinks = data.filesCount + " berkas di Google Drive";
    }

    var newRow = [
      submittedAt,
      data.id || "-",
      data.serviceTitle || "-",
      data.applicantName || "-",
      data.phone ? ("'" + data.phone) : "-", // tanda petik agar awalan 08 tidak hilang
      data.email || "-",
      data.district || "-",
      data.address || "-",
      data.institutionName || "-",
      data.status || "SUBMITTED",
      data.filesCount || (data.files ? data.files.length : 0),
      fileLinks,
      data.notes || (data.formData ? JSON.stringify(data.formData) : "-")
    ];

    sheet.appendRow(newRow);

    return {
      status: "success",
      message: "Data pemohon berhasil direkam ke Google Sheets",
      spreadsheetUrl: spreadsheet.getUrl(),
      rowNumber: sheet.getLastRow()
    };
  } catch (err) {
    return {
      status: "error",
      message: "Gagal mencatat ke sheet: " + err.toString()
    };
  }
}

/**
 * Membaca seluruh data permohonan dari Google Sheets untuk ditarik ke aplikasi web
 */
function getSubmissionsFromSheet() {
  try {
    var spreadsheet = getTargetSpreadsheet();
    var sheet = spreadsheet.getSheetByName("Data Permohonan") || spreadsheet.getSheets()[0];
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow <= 1) {
      return { status: "success", count: 0, submissions: [], spreadsheetUrl: spreadsheet.getUrl() };
    }

    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headers = values[0].map(function(h) { return (h || "").toString().trim().toLowerCase(); });

    var idxTime = headers.findIndex(function(h) { return h.indexOf("waktu") > -1 || h.indexOf("timestamp") > -1 || h.indexOf("tanggal") > -1; });
    var idxId = headers.findIndex(function(h) { return h.indexOf("tiket") > -1 || (h.indexOf("id") > -1 && h.indexOf("masjid") === -1); });
    var idxService = headers.findIndex(function(h) { return h.indexOf("layanan") > -1; });
    var idxName = headers.findIndex(function(h) { return h.indexOf("pemohon") > -1 || h.indexOf("nama") > -1; });
    var idxPhone = headers.findIndex(function(h) { return h.indexOf("wa") > -1 || h.indexOf("hp") > -1 || h.indexOf("telepon") > -1 || h.indexOf("kontak") > -1; });
    var idxEmail = headers.findIndex(function(h) { return h.indexOf("email") > -1; });
    var idxDistrict = headers.findIndex(function(h) { return h.indexOf("kecamatan") > -1; });
    var idxAddress = headers.findIndex(function(h) { return h.indexOf("alamat") > -1; });
    var idxInst = headers.findIndex(function(h) { return h.indexOf("lembaga") > -1 || h.indexOf("masjid") > -1 || h.indexOf("kua") > -1; });
    var idxStatus = headers.findIndex(function(h) { return h.indexOf("status") > -1; });
    var idxFiles = headers.findIndex(function(h) { return h.indexOf("tautan") > -1 || h.indexOf("berkas") > -1 || h.indexOf("drive") > -1 || h.indexOf("link") > -1; });
    var idxNotes = headers.findIndex(function(h) { return h.indexOf("catatan") > -1 || h.indexOf("keterangan") > -1; });

    var list = [];
    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var name = idxName > -1 ? (row[idxName] || "").toString().trim() : "";
      var service = idxService > -1 ? (row[idxService] || "").toString().trim() : "";
      if (!name && !service) continue;

      var rawPhone = idxPhone > -1 ? (row[idxPhone] || "").toString().trim().replace(/^'/, "") : "";
      var rawTime = idxTime > -1 ? row[idxTime] : "";
      var timeIso = "";
      try {
        timeIso = rawTime instanceof Date ? rawTime.toISOString() : (rawTime ? new Date(rawTime).toISOString() : new Date().toISOString());
      } catch (err) {
        timeIso = new Date().toISOString();
      }

      list.push({
        id: idxId > -1 && row[idxId] ? (row[idxId] || "").toString().trim() : "",
        submittedAt: timeIso,
        serviceTitle: service || "Pelayanan Administrasi Bimas Islam",
        applicantName: name || "Pemohon Layanan",
        phone: rawPhone || "081234567890",
        email: idxEmail > -1 ? (row[idxEmail] || "").toString().trim() : "",
        district: idxDistrict > -1 ? (row[idxDistrict] || "").toString().trim() : "",
        address: idxAddress > -1 ? (row[idxAddress] || "").toString().trim() : "",
        institutionName: idxInst > -1 ? (row[idxInst] || "").toString().trim() : "",
        status: idxStatus > -1 ? (row[idxStatus] || "SUBMITTED").toString().trim() : "SUBMITTED",
        fileUrls: idxFiles > -1 ? (row[idxFiles] || "").toString().trim() : "",
        notes: idxNotes > -1 ? (row[idxNotes] || "").toString().trim() : ""
      });
    }

    return {
      status: "success",
      count: list.length,
      submissions: list,
      spreadsheetUrl: spreadsheet.getUrl()
    };
  } catch (err) {
    return {
      status: "error",
      message: "Gagal membaca baris Google Sheet: " + err.toString()
    };
  }
}

/**
 * FUNGSI UJI COBA LANGSUNG DARI GOOGLE APPS SCRIPT
 * Anda bisa memilih fungsi 'testWriteToSheet' di dropdown atas editor Google Script lalu klik 'Run' (Jalankan)
 * untuk menguji dan mengizinkan (authorize) akses ke Google Sheets Anda secara langsung!
 */
function testWriteToSheet() {
  var testData = {
    action: "record_submission",
    id: "TEST-" + Math.floor(1000 + Math.random() * 9000),
    serviceTitle: "Uji Coba Integrasi Google Sheets",
    applicantName: "Petugas Bimas Islam Kemenag Gowa",
    phone: "081234567890",
    email: "bimasislamgowa@kemenag.go.id",
    district: "Somba Opu",
    address: "Jl. Masjid Raya No. 1 Sungguminasa",
    institutionName: "Kemenag Gowa",
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
    filesCount: 1,
    fileUrls: ["Uji coba link berkas Google Drive"]
  };
  var res = recordSubmissionToSheet(testData);
  Logger.log(res);
  return res;
}
`;

/**
 * Retrieve current Google Apps Script Web App URL from cache, localStorage, Firestore, or env
 */
export async function getGoogleAppsScriptUrl(): Promise<string | null> {
  if (cachedScriptUrl) return cachedScriptUrl;

  // 1. Check localStorage
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(APPS_SCRIPT_STORAGE_KEY);
    if (local && local.startsWith('https://script.google.com/')) {
      cachedScriptUrl = local.trim();
      return cachedScriptUrl;
    }
  }

  // 2. Check environment variable
  const envUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('https://script.google.com/')) {
    cachedScriptUrl = envUrl.trim();
    return cachedScriptUrl;
  }

  // 3. Check Firestore app_settings
  try {
    const docRef = doc(db, 'app_settings', SETTING_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.url && typeof data.url === 'string' && data.url.startsWith('https://script.google.com/')) {
        cachedScriptUrl = data.url.trim();
        if (typeof window !== 'undefined') {
          localStorage.setItem(APPS_SCRIPT_STORAGE_KEY, cachedScriptUrl);
        }
        return cachedScriptUrl;
      }
    }
  } catch (err) {
    console.warn('Could not load Google Apps Script URL from Firestore:', err);
  }

  return null;
}

/**
 * Save Google Apps Script Web App URL to localStorage and Firestore
 */
export async function saveGoogleAppsScriptUrl(url: string, updatedBy?: string): Promise<void> {
  const cleanUrl = url.trim();
  cachedScriptUrl = cleanUrl;
  if (typeof window !== 'undefined') {
    if (cleanUrl) {
      localStorage.setItem(APPS_SCRIPT_STORAGE_KEY, cleanUrl);
    } else {
      localStorage.removeItem(APPS_SCRIPT_STORAGE_KEY);
    }
  }

  // Sync to Firestore for all users/devices
  try {
    const docRef = doc(db, 'app_settings', SETTING_DOC_ID);
    await setDoc(docRef, {
      url: cleanUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Administrator'
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to save script URL to Firestore:', err);
  }
}

/**
 * Ping and test Google Apps Script Web App URL
 */
export async function testGoogleAppsScriptConnection(url: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('https://script.google.com/macros/s/')) {
      return { success: false, message: 'URL harus diawali dengan https://script.google.com/macros/s/...' };
    }

    const response = await fetch(cleanUrl, {
      method: 'GET',
      mode: 'cors'
    });

    if (response.ok) {
      const json = await response.json().catch(() => ({}));
      if (json.status === 'online' || json.service) {
        return { success: true, message: 'Webhook terhubung dengan baik ke Google Drive kantor!' };
      }
      return { success: true, message: 'Webhook merespons dengan status 200 OK.' };
    }

    return { success: false, message: `Server merespons dengan kode status ${response.status}` };
  } catch (err: any) {
    // If CORS prevents reading GET, we can test with POST
    try {
      const postTest = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ping: true })
      });
      if (postTest.ok) {
        return { success: true, message: 'Webhook merespons pengujian POST dengan sukses!' };
      }
    } catch (e: any) {
      // Fallback
    }
    return { success: false, message: err.message || 'Gagal menghubungi Webhook Google Apps Script.' };
  }
}

/**
 * Uploads a file base64 data to Google Drive via Google Apps Script Web App
 */
export async function uploadFileToGoogleDriveViaScript(
  scriptUrl: string,
  base64Data: string,
  fileName: string,
  mimeType: string,
  submissionId: string,
  fieldName?: string
): Promise<{ fileId: string; viewUrl: string; downloadUrl: string }> {
  const payload = {
    submissionId,
    fileName,
    fieldName: fieldName || 'dokumen',
    mimeType: mimeType || 'application/pdf',
    base64: base64Data
  };

  // Use text/plain to prevent CORS preflight OPTIONS request
  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script merespons dengan status HTTP ${response.status}`);
  }

  const result = await response.json();
  if (result.status !== 'success' || !result.fileId) {
    throw new Error(result.message || 'Gagal menyimpan berkas ke Google Drive');
  }

  return {
    fileId: result.fileId,
    viewUrl: result.viewUrl,
    downloadUrl: result.downloadUrl
  };
}

/**
 * Merekam data pemohon lengkap ke Google Sheets Kantor via Webhook Apps Script
 */
export async function sendSubmissionToGoogleSheetViaScript(
  scriptUrl: string,
  submission: {
    id: string;
    serviceTitle: string;
    applicantName: string;
    phone: string;
    email?: string;
    district?: string;
    address: string;
    institutionName?: string;
    status: string;
    submittedAt: string;
    filesCount: number;
    fileUrls?: string[];
    formData?: Record<string, any>;
  }
): Promise<{ success: boolean; message: string; spreadsheetUrl?: string }> {
  const payload = {
    action: 'record_submission',
    ...submission
  };
  const bodyString = JSON.stringify(payload);

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: bodyString
    });

    if (response.ok) {
      try {
        const result = await response.json();
        return {
          success: result.status === 'success',
          message: result.message || 'Tercatat',
          spreadsheetUrl: result.spreadsheetUrl
        };
      } catch (e) {
        return { success: true, message: 'Data berhasil direkam ke Google Sheets' };
      }
    }
    return { success: false, message: `Status HTTP ${response.status}` };
  } catch (err: any) {
    // If standard fetch failed (e.g. browser CORS intercept on 302 redirect), use no-cors to guarantee delivery to Google server
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: bodyString
      });
      return { success: true, message: 'Data berhasil terkirim ke Google Sheets' };
    } catch (fallbackErr: any) {
      console.warn('Gagal mencatat ke Google Sheet otomatis:', fallbackErr);
      return { success: false, message: fallbackErr.message || 'Jaringan gagal' };
    }
  }
}

/**
 * Tarik data permohonan dari Google Sheets kantor via Webhook Apps Script
 */
export async function fetchSubmissionsFromGoogleSheetViaScript(scriptUrl: string): Promise<{
  success: boolean;
  message: string;
  data?: any[];
  spreadsheetUrl?: string;
}> {
  const cleanUrl = scriptUrl.trim();
  if (!cleanUrl) {
    return { success: false, message: 'URL Webhook Google Apps Script belum diisi.' };
  }

  try {
    const targetUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=get_submissions`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      mode: 'cors'
    });

    if (response.ok) {
      const json = await response.json().catch(() => null);
      if (json && json.status === 'success') {
        return {
          success: true,
          message: `Berhasil mengambil ${json.count ?? (json.submissions ? json.submissions.length : 0)} data dari Google Sheet`,
          data: json.submissions || [],
          spreadsheetUrl: json.spreadsheetUrl
        };
      }
      if (json && json.message) {
        return { success: false, message: json.message };
      }
    }

    // Try POST if GET didn't succeed
    const postRes = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'get_submissions' })
    });

    if (postRes.ok) {
      const json = await postRes.json().catch(() => null);
      if (json && json.status === 'success') {
        return {
          success: true,
          message: `Berhasil mengambil ${json.count ?? (json.submissions ? json.submissions.length : 0)} data dari Google Sheet`,
          data: json.submissions || [],
          spreadsheetUrl: json.spreadsheetUrl
        };
      }
    }

    return { success: false, message: `Server Webhook merespons dengan status HTTP ${response.status}. Pastikan Apps Script telah di-deploy dengan versi terbaru.` };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal menghubungi Webhook Google Apps Script.'
    };
  }
}
