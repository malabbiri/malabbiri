import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Uploads any raw user file (PDF, JPG, PNG, up to 10MB+) directly to Firebase Cloud Storage.
 * Returns a permanent, publicly accessible download and preview URL.
 * Works seamlessly across all devices, browsers, and platforms without requiring Google OAuth popups.
 */
export async function uploadRawFileToCloudStorage(
  rawFileOrBlob: Blob | File,
  submissionId: string,
  fileName: string,
  fieldName: string
): Promise<string> {
  // Sanitize file path
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `submissions/${submissionId}/${fieldName}_${Date.now()}_${cleanFileName}`;
  
  const storageRef = ref(storage, path);
  
  // Set explicit content type metadata
  const contentType = (rawFileOrBlob as File).type || 'application/octet-stream';
  const metadata = {
    contentType: contentType,
    customMetadata: {
      originalName: fileName,
      submissionId: submissionId,
      uploadedAt: new Date().toISOString()
    }
  };

  const uploadResult = await uploadBytes(storageRef, rawFileOrBlob, metadata);
  const downloadUrl = await getDownloadURL(uploadResult.ref);
  return downloadUrl;
}
