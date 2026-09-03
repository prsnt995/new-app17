import { supabase } from '@/config/supabase';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
}

const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 30;

export const isSupabaseStorageUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.includes('supabase.co/storage') || url.includes('/storage/v1/object/');
};

export const getSupabaseImageUri = (url?: string | null): string | undefined => {
  if (!url || !isSupabaseStorageUrl(url)) return undefined;
  return url;
};

const generateFilename = (originalName?: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName?.split('.').pop() || 'jpg';
  return `${timestamp}_${random}.${ext}`;
};

const resizeImage = async (uri: string): Promise<string> => {
  try {
    if (Platform.OS === 'web') return uri;
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri;
  }
};

const uriToBlob = async (uri: string): Promise<Blob> => {
  if (Platform.OS !== 'web' && (uri.startsWith('content://') || uri.startsWith('file://'))) {
    try {
      const b64 = await (FileSystem as any).readAsStringAsync(uri, { encoding: 'base64' });
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return new Blob([bytes], { type: 'image/jpeg' });
    } catch {}
  }
  const response = await fetch(uri);
  return response.blob();
};

export const getSignedImageUrl = async (
  storagePath: string,
  bucket: 'products' | 'payment-proofs',
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string> => {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed URL');
  return data.signedUrl;
};

export const deleteImage = async (
  storagePath: string,
  bucket: 'products' | 'payment-proofs'
): Promise<void> => {
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) throw new Error(error.message);
};

export const deleteProductImages = async (productId: string): Promise<void> => {
  for (const prefix of [productId, `products/${productId}`]) {
    const { data } = await supabase.storage.from('products').list(prefix);
    if (data?.length) {
      const paths = data.map((f) => `${prefix}/${f.name}`);
      await supabase.storage.from('products').remove(paths).catch(() => {});
    }
  }
};

export const uploadProductImage = async (
  fileUri: string,
  productId: string,
  onProgress?: (progress: UploadProgress) => void,
  filename?: string
): Promise<UploadResult> => {
  const resizedUri = await resizeImage(fileUri);
  const blob = await uriToBlob(resizedUri);
  const MAX_SIZE = 5 * 1024 * 1024;
  if (blob.size > MAX_SIZE) throw new Error('File size exceeds 5 MB after resize. Please use a smaller image.');
  const name = filename || generateFilename();
  const storagePath = `products/${productId}/${name}`;
  const { error } = await supabase.storage.from('products').upload(storagePath, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  onProgress?.({ bytesTransferred: blob.size, totalBytes: blob.size, percentage: 100 });
  const downloadUrl = await getSignedImageUrl(storagePath, 'products');
  return { downloadUrl, storagePath };
};

export const uploadMultipleProductImages = async (
  fileUris: string[],
  productId: string,
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  for (let i = 0; i < fileUris.length; i++) {
    const result = await uploadProductImage(fileUris[i], productId, (p) => onProgress?.(i, p));
    results.push(result);
  }
  return results;
};

export const uploadPaymentProofFile = async (
  fileUri: string,
  userId: string,
  orderId: string,
  onProgress?: any,
  customFilename?: any
): Promise<UploadResult> => {
  if (typeof onProgress === 'string') { customFilename = onProgress as string; onProgress = undefined; }
  const resizedUri = await resizeImage(fileUri);
  const blob = await uriToBlob(resizedUri);
  const MAX_SIZE = 5 * 1024 * 1024;
  if (blob.size > MAX_SIZE) throw new Error('File size exceeds the 5 MB limit. Please select a smaller image (JPG, PNG, WEBP).');
  const name = customFilename || generateFilename('payment-proof.jpg');
  const storagePath = `${userId}/${orderId}/${name}`;
  const { error } = await supabase.storage.from('payment-proofs').upload(storagePath, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(`Payment proof upload failed: ${error.message}`);
  onProgress?.({ bytesTransferred: blob.size, totalBytes: blob.size, percentage: 100 });
  const downloadUrl = await getSignedImageUrl(storagePath, 'payment-proofs');
  return { downloadUrl, storagePath };
};

export const uploadPaymentScreenshotFile = uploadPaymentProofFile;
export const uploadPaymentScreenshotToFirestoreStorage = uploadPaymentProofFile;
