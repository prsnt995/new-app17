/**
 * NamasteMart Bank Transfer Settings Service
 * Dynamically fetches, saves, and listens to bank account configurations in Firestore.
 */

import {
  db,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from '@/config/firebase';
import { BankTransferSettings } from '@/types';

export const DEFAULT_BANK_SETTINGS: BankTransferSettings = {
  bankName: 'Woori Bank (우리은행)',
  bankNameKr: '우리은행',
  accountNumber: '1002364650197',
  accountHolder: 'PARSHANT',
  instructions: 'Please transfer the exact amount to PARSHANT (우리: 1002364650197 / 국민: 80640200121099 / 신한: 110623385560 / 토스뱅크: 1002-7078-9681) and upload your payment screenshot below.',
  paymentDeadlineHours: 24,
  enabled: true,
};

const SETTINGS_COLLECTION = 'settings';
const BANK_SETTINGS_DOC_ID = 'bankTransfer';

/**
 * Get current Bank Transfer settings from Firestore with sensible fallback.
 */
export const getBankTransferSettings = async (): Promise<BankTransferSettings> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, BANK_SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as Partial<BankTransferSettings>;
      return {
        ...DEFAULT_BANK_SETTINGS,
        ...data,
      };
    }

    // Auto-seed default settings document if non-existent
    try {
      await setDoc(docRef, {
        ...DEFAULT_BANK_SETTINGS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Non-blocking if permissions or offline
    }

    return DEFAULT_BANK_SETTINGS;
  } catch (error) {
    console.warn('Notice: Using local default bank transfer settings:', error);
    return DEFAULT_BANK_SETTINGS;
  }
};

/**
 * Save or update Bank Transfer settings in Firestore (Admin only).
 */
export const updateBankTransferSettings = async (
  settings: Partial<BankTransferSettings>,
  adminUid?: string
): Promise<BankTransferSettings> => {
  const docRef = doc(db, SETTINGS_COLLECTION, BANK_SETTINGS_DOC_ID);
  
  const payload: Partial<BankTransferSettings> = {
    ...settings,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid || 'admin',
  };

  await setDoc(docRef, payload, { merge: true });

  return {
    ...DEFAULT_BANK_SETTINGS,
    ...settings,
  } as BankTransferSettings;
};

/**
 * Subscribe to real-time updates for Bank Transfer settings.
 */
export const subscribeBankTransferSettings = (
  onUpdate: (settings: BankTransferSettings) => void
): (() => void) => {
  const docRef = doc(db, SETTINGS_COLLECTION, BANK_SETTINGS_DOC_ID);

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<BankTransferSettings>;
        onUpdate({
          ...DEFAULT_BANK_SETTINGS,
          ...data,
        });
      } else {
        onUpdate(DEFAULT_BANK_SETTINGS);
      }
    },
    (err) => {
      console.warn('Bank settings subscription notice:', err.message);
      onUpdate(DEFAULT_BANK_SETTINGS);
    }
  );

  return unsubscribe;
};
