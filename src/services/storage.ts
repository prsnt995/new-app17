/**
 * NamasteMart Firebase Storage Service
 * Handles product image uploads to Firebase Storage.
 */

import {
  storage,
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from '@/config/firebase';
import { Platform } from 'react-native';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Convert a local file URI to a Blob for upload.
 * Works on both web and native platforms.
 */
const uriToBlob = async (uri: string): Promise<Blob> => {
  if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http')) {
    const response = await fetch(uri);
    return response.blob();
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.log('uriToBlob XHR error:', e);
      reject(new TypeError('Network request failed'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
};

/**
 * Generate a unique filename with timestamp.
 */
const generateFilename = (originalName?: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName?.split('.').pop() || 'jpg';
  return `${timestamp}_${random}.${ext}`;
};

// ─── UPLOAD FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Upload a single product image to Firebase Storage.
 * Returns the download URL and storage path.
 */
export const uploadProductImage = async (
  fileUri: string,
  productId: string,
  onProgress?: (progress: UploadProgress) => void,
  filename?: string
): Promise<UploadResult> => {
  const blob = await uriToBlob(fileUri);
  const name = filename || generateFilename();
  const safeId = (productId || 'product').replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `products/${safeId}/${name}`;
  const fileRef = storageRef(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, blob);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percentage = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percentage,
        });
      },
      (error) => {
        console.log('Upload error:', error.message);
        reject(new Error(`Upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadUrl, storagePath });
        } catch (error: any) {
          reject(new Error(`Failed to get download URL: ${error.message}`));
        }
      }
    );
  });
};

/**
 * Upload multiple product images with progress tracking.
 */
export const uploadMultipleProductImages = async (
  fileUris: string[],
  productId: string,
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];

  for (let i = 0; i < fileUris.length; i++) {
    const result = await uploadProductImage(
      fileUris[i],
      productId,
      (progress) => onProgress?.(i, progress)
    );
    results.push(result);
  }

  return results;
};

/**
 * Upload a payment proof screenshot to Firebase Storage.
 * Path: payment-proofs/{userId}/{orderId}/{fileName}
 * Accepts JPG, JPEG, PNG, WEBP with max size of 5 MB.
 */
export const uploadPaymentProofFile = async (
  fileUri: string,
  userId: string,
  orderId: string,
  onProgress?: (progress: UploadProgress) => void,
  customFilename?: string
): Promise<UploadResult> => {
  const blob = await uriToBlob(fileUri);

  // Enforce 5MB limit
  const MAX_SIZE_BYTES = 5 * 1024 * 1024;
  if (blob.size > MAX_SIZE_BYTES) {
    throw new Error('File size exceeds the 5 MB limit. Please select a smaller image (JPG, PNG, WEBP).');
  }

  const name = customFilename || generateFilename('payment-proof.jpg');
  const storagePath = `payment-proofs/${userId}/${orderId}/${name}`;
  const fileRef = storageRef(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, blob, {
      contentType: blob.type || 'image/jpeg',
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percentage = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percentage,
        });
      },
      (error) => {
        console.log('Payment proof upload error:', error.message);
        reject(new Error(`Payment proof upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadUrl, storagePath });
        } catch (error: any) {
          reject(new Error(`Failed to get payment proof download URL: ${error.message}`));
        }
      }
    );
  });
};

/**
 * Upload a payment proof screenshot to Firebase Storage.
 * Path: payment-screenshots/{userId}/{orderId}/{paymentId}.jpg
 * Accepts JPG, JPEG, PNG, WEBP with max size of 5 MB.
 */
export const uploadPaymentScreenshotToFirestoreStorage = async (
  fileUri: string,
  userId: string,
  orderId: string,
  paymentId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const blob = await uriToBlob(fileUri);

  // Enforce 5MB limit
  const MAX_SIZE_BYTES = 5 * 1024 * 1024;
  if (blob.size > MAX_SIZE_BYTES) {
    throw new Error('File size exceeds the 5 MB limit. Please select a smaller image (JPG, PNG, WEBP).');
  }

  // Determine extension from MIME type or URI
  let ext = 'jpg';
  if (blob.type?.includes('png')) ext = 'png';
  else if (blob.type?.includes('webp')) ext = 'webp';
  else if (blob.type?.includes('jpeg') || blob.type?.includes('jpg')) ext = 'jpg';
  else if (fileUri.toLowerCase().endsWith('.png')) ext = 'png';
  else if (fileUri.toLowerCase().endsWith('.webp')) ext = 'webp';

  const storagePath = `payment-screenshots/${userId}/${orderId}/${paymentId}.${ext}`;
  const fileRef = storageRef(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, blob, {
      contentType: blob.type || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'),
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percentage = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percentage,
        });
      },
      (error) => {
        console.log('Payment screenshot upload error:', error.message);
        reject(new Error(`Payment screenshot upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadUrl, storagePath });
        } catch (error: any) {
          reject(new Error(`Failed to get payment screenshot download URL: ${error.message}`));
        }
      }
    );
  });
};

// Backward-compatible alias
export const uploadPaymentScreenshotFile = uploadPaymentProofFile;


