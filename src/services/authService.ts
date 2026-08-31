/**
 * NamasteMart Authentication Service (Supabase)
 * Google OAuth + Email OTP passwordless auth via Supabase.
 */

import { supabase, TABLES } from '@/config/supabase';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { ensureUserDoc, getUserDoc } from '@/services/userService';
import { FirestoreUser } from '@/types';
import { Platform } from 'react-native';

export type AuthStateCallback = (user: User | null, session: Session | null) => void;

export interface UnifiedAuthResult {
  user: User;
  firestoreUser: FirestoreUser;
  isNewUser: boolean;
}

// ─── GOOGLE AUTHENTICATION ─────────────────────────────────────────────────

/**
 * Sign in with Google via Supabase OAuth.
 * On web: opens a popup/redirect to Google.
 * On native: uses Expo AuthSession redirect.
 */
export const signInWithGoogle = async (redirectTo?: string): Promise<void> => {
  // On web, redirect to the current origin so Supabase can handle the callback
  const redirect = redirectTo || (Platform.OS === 'web'
    ? window.location.origin
    : 'namastemart://');

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirect,
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
};

/**
 * Handle the OAuth callback URL (extracts tokens from deep link).
 */
export const handleOAuthCallback = async (url: string): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('OAuth callback notice:', error.message);
    return null;
  }
  return data.session;
};

// ─── EMAIL OTP (PASSWORDLESS) ──────────────────────────────────────────────

/**
 * Send a 6-digit OTP code to the user's email via Supabase.
 */
export const sendEmailOtp = async (email: string): Promise<{ success: boolean; message: string }> => {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true, message: 'Verification code sent to your email' };
};

/**
 * Verify the OTP code and sign in.
 */
export const verifyEmailOtp = async (
  email: string,
  token: string
): Promise<{ success: boolean; session: Session | null; error?: string }> => {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });

  if (error) {
    return { success: false, session: null, error: error.message };
  }
  return { success: true, session: data.session };
};

// ─── EMAIL + PASSWORD (LEGACY/ADMIN) ───────────────────────────────────────

export const loginWithEmail = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data.user;
};

export const registerWithEmail = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Registration failed');
  return data.user;
};

// ─── SESSION MANAGEMENT ────────────────────────────────────────────────────

/**
 * Get current session.
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('getSession notice:', error.message);
    return null;
  }
  return data.session;
};

/**
 * Get current user.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('getUser notice:', error.message);
    return null;
  }
  return data.user;
};

/**
 * Sign out.
 */
export const logoutUser = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('Sign out notice:', error.message);
  }
};

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export const subscribeToAuth = (callback: AuthStateCallback): (() => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null, session);
  });
  return () => subscription.unsubscribe();
};

// ─── USER PROFILE SYNC ─────────────────────────────────────────────────────

/**
 * Ensure a Supabase user has a corresponding profiles row in the database.
 * Creates one if it doesn't exist. Never overwrites existing data.
 */
export const ensureUserProfile = async (user: User): Promise<FirestoreUser> => {
  const uid = user.id;
  const email = user.email || '';
  const name = user.user_metadata?.name || user.user_metadata?.full_name || email.split('@')[0] || 'User';
  const avatar = user.user_metadata?.avatar || user.user_metadata?.picture || '';

  const firestoreUser = await ensureUserDoc(uid, {
    name,
    email,
    avatar,
    role: 'customer',
    emailVerified: user.email_confirmed_at ? true : false,
  });

  return firestoreUser;
};

/**
 * Complete customer registration (creates profile + saves Korean address).
 */
export const completeCustomerRegistration = async (params: {
  name: string;
  phoneNumber: string;
  email: string;
  koreanAddress: import('@/types').KoreanAddress;
  uid?: string;
}): Promise<UnifiedAuthResult> => {
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();
  const uid = params.uid || supabaseUser?.id || `email-${params.email.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const firestoreUser = await ensureUserDoc(uid, {
    name: params.name.trim(),
    email: params.email.trim().toLowerCase(),
    phoneNumber: params.phoneNumber.trim(),
    role: 'customer',
    emailVerified: true,
  });

  const { saveUserDeliveryAddress } = await import('@/services/userService');
  await saveUserDeliveryAddress(uid, params.koreanAddress);

  return {
    user: supabaseUser || { id: uid, email: params.email } as User,
    firestoreUser: {
      ...firestoreUser,
      addresses: [params.koreanAddress],
      profileSetupComplete: true,
    },
    isNewUser: false,
  };
};
