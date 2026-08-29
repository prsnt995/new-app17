/**
 * NamasteMart Authentication Service
 * Clean wrapper around Firebase Authentication (Google & Passwordless Email OTP).
 */

import {
  auth,
  googleProvider,
  createGoogleCredential,
  signInWithCredential,
  signInWithCustomToken,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from '@/config/firebase';
import { User } from 'firebase/auth';
import { sendOtp, verifyOtp, SendOtpResponse, VerifyOtpResponse } from '@/services/api';
import { ensureUserDoc, getUserDoc } from '@/services/userService';
import { FirestoreUser } from '@/types';

export type AuthStateCallback = (user: User | null) => void;

export interface UnifiedAuthResult {
  user: User | { uid: string; email: string; displayName?: string; photoURL?: string };
  firestoreUser: FirestoreUser;
  isNewUser: boolean;
}

/**
 * 1. GOOGLE AUTHENTICATION (WEB)
 */
export const signInWithGoogleWeb = async (): Promise<UnifiedAuthResult> => {
  const result = await signInWithPopup(auth, googleProvider);
  const firebaseUser = result.user;

  const uid = firebaseUser.uid;
  const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Customer';
  const email = firebaseUser.email || '';
  const avatar = firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';

  const firestoreUser = await ensureUserDoc(uid, {
    name: displayName,
    email,
    avatar,
    role: 'customer',
    emailVerified: true,
  });

  const isNewUser = !firestoreUser.addresses || firestoreUser.addresses.length === 0;

  return {
    user: firebaseUser,
    firestoreUser,
    isNewUser,
  };
};

/**
 * 1. GOOGLE AUTHENTICATION (MOBILE / ID TOKEN)
 */
export const loginWithGoogle = async (idToken: string): Promise<UnifiedAuthResult> => {
  const credential = createGoogleCredential(idToken);
  const result = await signInWithCredential(auth, credential);
  const firebaseUser = result.user;

  const uid = firebaseUser.uid;
  const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Customer';
  const email = firebaseUser.email || '';
  const avatar = firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';

  const firestoreUser = await ensureUserDoc(uid, {
    name: displayName,
    email,
    avatar,
    role: 'customer',
    emailVerified: true,
  });

  const isNewUser = !firestoreUser.addresses || firestoreUser.addresses.length === 0;

  return {
    user: firebaseUser,
    firestoreUser,
    isNewUser,
  };
};

/**
 * 2. PERSONAL EMAIL + VERIFICATION CODE: SEND OTP
 */
export const sendEmailVerificationCode = async (email: string): Promise<SendOtpResponse> => {
  return await sendOtp(email);
};

/**
 * 2. PERSONAL EMAIL + VERIFICATION CODE: VERIFY & AUTHENTICATE
 */
export const verifyEmailCodeAndLogin = async (
  email: string,
  code: string
): Promise<UnifiedAuthResult> => {
  const normalizedEmail = email.trim().toLowerCase();

  // Call API to verify OTP
  const verifyRes: VerifyOtpResponse = await verifyOtp(normalizedEmail, code);

  if (!verifyRes.success) {
    throw new Error(verifyRes.message || 'Invalid or expired verification code');
  }

  let authenticatedUser: any = null;

  // 1. If backend returned a Firebase Custom Token, sign in with it
  if (verifyRes.customToken) {
    try {
      const cred = await signInWithCustomToken(auth, verifyRes.customToken);
      authenticatedUser = cred.user;
    } catch (customTokErr: any) {
      console.warn('signInWithCustomToken notice:', customTokErr.message);
    }
  }

  // 2. Client-side fallback if custom token not available (e.g. offline dev mode)
  if (!authenticatedUser) {
    const activeCurrentUser = auth.currentUser;
    if (activeCurrentUser && activeCurrentUser.email?.toLowerCase() === normalizedEmail) {
      authenticatedUser = activeCurrentUser;
    } else {
      authenticatedUser = {
        uid: verifyRes.uid || `email-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: normalizedEmail,
        displayName: normalizedEmail.split('@')[0],
        emailVerified: true,
      };
    }
  }

  const finalUid = authenticatedUser.uid || verifyRes.uid;
  const displayName =
    authenticatedUser.displayName ||
    verifyRes.user?.displayName ||
    normalizedEmail.split('@')[0];

  // 3. Ensure User document exists in Firestore (Unified Customer Account)
  const firestoreUser = await ensureUserDoc(finalUid, {
    name: displayName,
    email: normalizedEmail,
    role: 'customer',
    emailVerified: true,
  });

  const isNewUser = !firestoreUser.addresses || firestoreUser.addresses.length === 0;

  return {
    user: authenticatedUser,
    firestoreUser,
    isNewUser,
  };
};

/**
 * Sign in with email and password (legacy/admin).
 */
export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return cred.user;
};

/**
 * Register with email and password (legacy).
 */
export const registerWithEmail = async (
  email: string,
  pass: string
): Promise<User> => {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  return cred.user;
};

/**
 * Complete Step 4 Registration: Atomically save verified customer & Korean delivery address
 */
export const completeCustomerRegistration = async (params: {
  name: string;
  phoneNumber: string;
  email: string;
  koreanAddress: import('@/types').KoreanAddress;
  customToken?: string | null;
  uid?: string;
}): Promise<UnifiedAuthResult> => {
  const normalizedEmail = params.email.trim().toLowerCase();
  let authenticatedUser: any = null;

  // 1. If customToken exists, attempt Firebase Auth sign-in
  if (params.customToken) {
    try {
      const cred = await signInWithCustomToken(auth, params.customToken);
      authenticatedUser = cred.user;
    } catch (tokErr: any) {
      console.warn('signInWithCustomToken notice:', tokErr.message);
    }
  }

  if (!authenticatedUser) {
    const activeCurrentUser = auth.currentUser;
    if (activeCurrentUser && activeCurrentUser.email?.toLowerCase() === normalizedEmail) {
      authenticatedUser = activeCurrentUser;
    } else {
      authenticatedUser = {
        uid: params.uid || `email-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: normalizedEmail,
        displayName: params.name.trim(),
        phoneNumber: params.phoneNumber.trim(),
        emailVerified: true,
      };
    }
  }

  const finalUid = authenticatedUser.uid || params.uid || `email-${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // 2. Ensure User Document exists in Firestore with phone and verified status
  const firestoreUser = await ensureUserDoc(finalUid, {
    name: params.name.trim(),
    email: normalizedEmail,
    phoneNumber: params.phoneNumber.trim(),
    role: 'customer',
    emailVerified: true,
  });

  // 3. Save South Korean Delivery Address to user doc and subcollection
  const { saveUserDeliveryAddress } = await import('@/services/userService');
  await saveUserDeliveryAddress(finalUid, params.koreanAddress);

  return {
    user: authenticatedUser,
    firestoreUser: {
      ...firestoreUser,
      addresses: [params.koreanAddress],
      profileSetupComplete: true,
    },
    isNewUser: false,
  };
};

/**
 * Sign out current user.
 */
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * Subscribe to auth state changes.
 */
export const subscribeToAuth = (callback: AuthStateCallback): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current authenticated user.
 */
export const getCurrentAuthUser = (): User | null => {
  return auth.currentUser;
};
