import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

// ─── FIREBASE CONFIGURATION (STORAGE ONLY) ───────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDECT1320x3kyOyifqNKST0B8FkfJFxfMs',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'namaste-mart-28c93.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'namaste-mart-28c93',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'namaste-mart-28c93.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1074173027938',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1074173027938:web:c8f3eb4d9e0f21d7d7d33b',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-6K4QV4MM2S',
};

// ─── INITIALIZE FIREBASE (PREVENT DUPLICATES) ────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── STORAGE ONLY ────────────────────────────────────────────────────────────
export const storage = getStorage(app);

export {
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
};

export default app;
