import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
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
} from 'firebase/firestore';

// ─── FIREBASE CONFIGURATION ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDemoFirebaseKeyForNamasteMartApp2026',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'namaste-mart-28c93.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'namaste-mart-28c93',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'namaste-mart-28c93.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '109876543210',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:109876543210:web:namastemartapp',
};

// ─── INITIALIZE FIREBASE (PREVENT DUPLICATES) ────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ─── SERVICE INSTANCES ────────────────────────────────────────────────────────
export const auth = getAuth(app);
export const db = getFirestore(app);

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
} as const;

// ─── EXPORTS ─────────────────────────────────────────────────────────────────
export {
  // Auth
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  // Firestore
  collection,
  doc,
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
};

export default app;
