import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Use AsyncStorage on native, localStorage on web (guarded for SSR)
const isWeb = Platform.OS === 'web';
const storageAdapter = isWeb
  ? {
      getItem: async (key: string) => {
        if (typeof window === 'undefined') return null;
        try { return window.localStorage.getItem(key); } catch { return null; }
      },
      setItem: async (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        try { window.localStorage.setItem(key, value); } catch {}
      },
      removeItem: async (key: string) => {
        if (typeof window === 'undefined') return;
        try { window.localStorage.removeItem(key); } catch {}
      },
    }
  : (() => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage;
    })();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ─── TABLE NAME CONSTANTS ──────────────────────────────────────────────────
export const TABLES = {
  PROFILES: 'profiles',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CARTS: 'carts',
  WISHLISTS: 'wishlists',
  CATEGORIES: 'categories',
  BANNERS: 'banners',
  REVIEWS: 'reviews',
  ADMINS: 'admins',
  SETTINGS: 'settings',
  PAYMENT_LOGS: 'payment_verification_logs',
} as const;

// ─── STORAGE BUCKET (for Supabase Storage if needed later) ────────────────
export const BUCKETS = {
  PRODUCTS: 'products',
  PAYMENT_PROOFS: 'payment-proofs',
  USERS: 'users',
} as const;
