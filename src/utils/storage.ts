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
import { SubmissionRecord, SurveyRecord, ApplicationStatus } from '../types';
import { INITIAL_SUBMISSIONS, INITIAL_SURVEYS } from '../data/initialData';
import { generateFileKey, storeFileInDb } from './indexedDbStorage';

const SUBMISSIONS_KEY = 'malabbiri_submissions_v2';
const SURVEYS_KEY = 'malabbiri_surveys_v2';

// In-memory cache for synchronous render
let cachedSubmissions: SubmissionRecord[] = [];
let cachedSurveys: SurveyRecord[] = [];

// Initialize memory cache from localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const rawSubs = localStorage.getItem(SUBMISSIONS_KEY);
    if (rawSubs) {
      cachedSubmissions = JSON.parse(rawSubs);
    } else if (INITIAL_SUBMISSIONS.length > 0) {
      cachedSubmissions = [...INITIAL_SUBMISSIONS];
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(cachedSubmissions));
    }

    const rawSurveys = localStorage.getItem(SURVEYS_KEY);
    if (rawSurveys) {
      cachedSurveys = JSON.parse(rawSurveys);
    } else if (INITIAL_SURVEYS.length > 0) {
      cachedSurveys = [...INITIAL_SURVEYS];
      localStorage.setItem(SURVEYS_KEY, JSON.stringify(cachedSurveys));
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
          const localSub = existingMap.get(remoteSub.id);
          if (!localSub || !localSub.files) return remoteSub;

          const mergedFiles = remoteSub.files.map((rf) => {
            const localFile = localSub.files.find((lf) => lf.fileName === rf.fileName && lf.fieldName === rf.fieldName);
            if (localFile?.dataUrl && !rf.dataUrl) {
              return { ...rf, dataUrl: localFile.dataUrl };
            }
            return rf;
          });

          return { ...remoteSub, files: mergedFiles };
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
        if (snapshot.empty && cachedSurveys.length > 0) {
          cachedSurveys.forEach(async (srv) => {
            try {
              const safe = sanitizeForFirestore(srv);
              await setDoc(doc(db, 'surveys', srv.id), safe);
            } catch (e) {
              // ignore
            }
          });
          return;
        }

        const remoteList: SurveyRecord[] = [];
        snapshot.forEach((d) => {
          remoteList.push(d.data() as SurveyRecord);
        });

        const remoteIds = new Set(remoteList.map((s) => s.id));
        cachedSurveys.forEach(async (localSrv) => {
          if (!remoteIds.has(localSrv.id)) {
            try {
              await setDoc(doc(db, 'surveys', localSrv.id), sanitizeForFirestore(localSrv));
              remoteList.push(localSrv);
            } catch (e) {
              // ignore
            }
          }
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
  try {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to clear submissions:', err);
  }
  notifySubmissionsListeners();

  // Also remove from Firestore cloud
  try {
    const snapshot = await getDocs(collection(db, 'submissions'));
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'submissions');
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
  officerName: string
): SubmissionRecord | null {
  const index = cachedSubmissions.findIndex((item) => item.id.toUpperCase() === id.toUpperCase());
  if (index === -1) return null;

  const current = cachedSubmissions[index];
  const updatedHistory = [
    ...current.statusHistory,
    {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note || `Status diperbarui menjadi ${newStatus}`,
      officerName: officerName || 'Petugas Bimas Islam'
    }
  ];

  const updatedRecord: SubmissionRecord = {
    ...current,
    status: newStatus,
    officerNotes: note,
    statusHistory: updatedHistory
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
  const approved = submissions.filter((s) => s.status === 'APPROVED').length;
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
