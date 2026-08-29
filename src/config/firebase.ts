import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithCustomToken,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  increment,
  runTransaction,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

// ─── FIREBASE CONFIGURATION ──────────────────────────────────────────────────
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

// ─── SERVICE INSTANCES ────────────────────────────────────────────────────────
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Safe Analytics Initialization for Web / Supported Environments
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Ignore unsupported platform errors silently
    });
}
export { analytics };

// ─── GOOGLE AUTH PROVIDER ────────────────────────────────────────────────────
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// ─── GOOGLE CREDENTIAL HELPER (FOR EXPO-AUTH-SESSION) ───────────────────────
export const createGoogleCredential = (idToken: string) => {
  return GoogleAuthProvider.credential(idToken);
};

// ─── FIRESTORE COLLECTION REFS ────────────────────────────────────────────────
export const COLLECTIONS = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CATEGORIES: 'categories',
  BANNERS: 'banners',
  REVIEWS: 'reviews',
  USERS: 'users',
  ADMINS: 'admins',
  ANALYTICS: 'analytics',
  CARTS: 'carts',
  WISHLISTS: 'wishlists',
} as const;

// ─── EXPORTS ─────────────────────────────────────────────────────────────────
export {
  // Auth
  signInWithCredential,
  signInWithCustomToken,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  // Firestore
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  increment,
  runTransaction,
  Timestamp,
  writeBatch,
  // Storage
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
};

export default app;
