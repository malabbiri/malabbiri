import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const APPS_SCRIPT_STORAGE_KEY = 'malabbiri_gas_webhook_url_v1';
const SETTING_DOC_ID = 'google_drive_integration';

// In-memory cache
let cachedScriptUrl: string | null = null;

export const DEFAULT_SCRIPT_TEMPLATE = `/**
 * WEBHOOK GOOGLE DRIVE MALA'BIRI BIMAS ISLAM KEMENAG GOWA
 * Skrip ini menerima unggahan berkas asli dari formulir aplikasi Malabbiri
 * dan menyimpannya langsung ke Google Drive Kantor tanpa biaya (100% Gratis).
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "MALA'BIRI Google Drive Webhook",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);

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
    var rootFolderName = data.rootFolderName || "ARSIP_MALABIRI_BIMAS_ISLAM_GOWA";
    var rootFolders = DriveApp.getFoldersByName(rootFolderName);
    var targetFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(rootFolderName);

    // Subfolder berdasarkan Nomor Tiket / ID Permohonan
    if (data.submissionId) {
      var subFolders = targetFolder.getFoldersByName(data.submissionId);
      targetFolder = subFolders.hasNext() ? subFolders.next() : targetFolder.createFolder(data.submissionId);
    }

    // Simpan berkas
    var file = targetFolder.createFile(blob);
    
    // Beri izin akses baca bagi siapapun yang memiliki tautan
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
