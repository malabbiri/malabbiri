/**
 * Google Drive Integration Client for MALA'BIRI Bimas Islam Gowa
 * Handles OAuth 2.0 token acquisition via Google Identity Services (GSI)
 * and seamless file uploads to Google Drive with universal cross-browser links.
 */

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

import firebaseConfig from '../../firebase-applet-config.json';

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const OAUTH_CLIENT_ID = firebaseConfig.oAuthClientId || '197666210940-mts34emqulf30u2cs8lla6b6102ed4f2.apps.googleusercontent.com';
const DRIVE_TOKEN_STORAGE_KEY = 'malabbiri_gdrive_token_v1';
const DRIVE_FOLDER_NAME = 'ARSIP_MALABIRI_BIMAS_ISLAM_GOWA';

export interface DriveTokenSession {
  accessToken: string;
  expiresAt: number;
}

export interface DriveUploadResult {
  fileId: string;
  viewUrl: string;
  downloadUrl: string;
  fileName: string;
}

// In-memory token cache
let cachedTokenSession: DriveTokenSession | null = null;

export function getStoredDriveToken(): string | null {
  if (cachedTokenSession && cachedTokenSession.expiresAt > Date.now()) {
    return cachedTokenSession.accessToken;
  }
  try {
    const raw = localStorage.getItem(DRIVE_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const parsed: DriveTokenSession = JSON.parse(raw);
    if (parsed.expiresAt > Date.now()) {
      cachedTokenSession = parsed;
      return parsed.accessToken;
    }
    localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY);
  } catch (e) {
    // ignore
  }
  return null;
}

export function saveDriveToken(token: string, expiresInSeconds: number = 3600): void {
  const session: DriveTokenSession = {
    accessToken: token,
    expiresAt: Date.now() + (expiresInSeconds - 60) * 1000
  };
  cachedTokenSession = session;
  try {
    localStorage.setItem(DRIVE_TOKEN_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    // ignore
  }
}

export function clearDriveToken(): void {
  cachedTokenSession = null;
  try {
    localStorage.removeItem(DRIVE_TOKEN_STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}

/**
 * Initializes and requests token from Google Identity Services client-side
 */
export async function requestGoogleDriveAccess(): Promise<string> {
  const existingToken = getStoredDriveToken();
  if (existingToken) {
    return existingToken;
  }

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services library is not loaded.'));
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: GOOGLE_DRIVE_SCOPE,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            saveDriveToken(response.access_token, Number(response.expires_in) || 3600);
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned by Google.'));
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Gets or creates the main root folder in Google Drive for MALA'BIRI archives
 */
export async function getOrCreateDriveFolder(accessToken: string, folderName = DRIVE_FOLDER_NAME): Promise<string> {
  try {
    // Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`
    )}&fields=files(id,name)`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!createRes.ok) {
      throw new Error('Gagal membuat folder di Google Drive');
    }

    const created = await createRes.json();
    return created.id;
  } catch (err) {
    console.warn('Error in getOrCreateDriveFolder, defaulting to root:', err);
    return 'root';
  }
}

/**
 * Uploads a file (or base64 / blob) directly to Google Drive via multipart upload
 */
export async function uploadFileToGoogleDrive(
  accessToken: string,
  fileBlob: Blob,
  fileName: string,
  folderId?: string
): Promise<DriveUploadResult> {
  const metadata: any = {
    name: fileName,
    mimeType: fileBlob.type || 'application/octet-stream'
  };

  if (folderId && folderId !== 'root') {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', fileBlob);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    }
  );

  if (!uploadRes.ok) {
    const errData = await uploadRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Gagal mengunggah berkas ke Google Drive');
  }

  const uploaded = await uploadRes.json();

  // Make file viewable by anyone with link (optional for convenient cross-browser download/preview)
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch (e) {
    // non-fatal
  }

  const fileId = uploaded.id;
  const viewUrl = uploaded.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  return {
    fileId,
    viewUrl,
    downloadUrl,
    fileName
  };
}
