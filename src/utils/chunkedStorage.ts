import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const CHUNK_SIZE = 500000; // ~500 KB per chunk (safely within Firestore 1MB document limit)

export interface StoredFileChunk {
  fileId: string;
  submissionId: string;
  fileName: string;
  fileType: string;
  chunkIndex: number;
  totalChunks: number;
  data: string;
  createdAt: string;
}

/**
 * Stores a large file (e.g. 3MB - 10MB) into Firestore by splitting into safe chunks.
 * Works 100% within the free Firebase Spark plan!
 */
export async function saveFileInChunks(
  fileId: string,
  submissionId: string,
  fileName: string,
  fileType: string,
  base64Data: string
): Promise<number> {
  const chunksCount = Math.ceil(base64Data.length / CHUNK_SIZE);

  for (let i = 0; i < chunksCount; i++) {
    const chunkData = base64Data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const chunkDocId = `${fileId}_part_${i}`;
    const chunkRef = doc(db, 'file_chunks', chunkDocId);

    await setDoc(chunkRef, {
      fileId,
      submissionId,
      fileName,
      fileType,
      chunkIndex: i,
      totalChunks: chunksCount,
      data: chunkData,
      createdAt: new Date().toISOString()
    });
  }

  return chunksCount;
}

/**
 * Reassembles all chunks from Firestore into the complete original base64 string
 */
export async function getFileFromChunks(fileId: string): Promise<string | null> {
  try {
    const chunksRef = collection(db, 'file_chunks');
    const q = query(chunksRef, where('fileId', '==', fileId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const chunks: StoredFileChunk[] = [];
    snapshot.forEach((d) => {
      chunks.push(d.data() as StoredFileChunk);
    });

    // Sort by chunk index to guarantee correct reassembly order
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Verify all chunks are present
    const totalChunks = chunks[0]?.totalChunks || chunks.length;
    if (chunks.length < totalChunks) {
      console.warn(`Missing chunks: received ${chunks.length} of ${totalChunks}`);
    }

    const completeBase64 = chunks.map((c) => c.data).join('');
    return completeBase64;
  } catch (err) {
    console.warn('Error reading file chunks from Firestore:', err);
    return null;
  }
}
