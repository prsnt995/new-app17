/**
 * NamasteMart Bank Transfer Settings Service (Firestore + Fallback)
 * Fetches, saves, and listens to paymentSettings/bankTransfer in Firestore.
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
  accountNumber: '1002340390276',
  accountHolder: '박기삼',
  bankCode: '020',
  instructions: 'Please transfer the exact amount to 박기삼 (우리은행: 1002340390276) and upload your payment screenshot below.',
  paymentDeadlineHours: 24,
  enabled: true,
  currency: 'KRW',
};

const SETTINGS_COLLECTION = 'paymentSettings';
const BANK_SETTINGS_DOC = 'bankTransfer';

/**
 * Get current Bank Transfer settings from Firestore with default fallback.
 */
export const getBankTransferSettings = async (): Promise<BankTransferSettings> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, BANK_SETTINGS_DOC);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        ...DEFAULT_BANK_SETTINGS,
        ...data,
      } as BankTransferSettings;
    }

    // Initialize document in Firestore if missing
    try {
      await setDoc(docRef, {
        ...DEFAULT_BANK_SETTINGS,
        updatedAt: serverTimestamp(),
      });
    } catch {}

    return DEFAULT_BANK_SETTINGS;
  } catch (error) {
    console.warn('Notice: Using default bank transfer settings:', error);
    return DEFAULT_BANK_SETTINGS;
  }
};

/**
 * Save or update Bank Transfer settings in Firestore (Admin action).
 */
export const updateBankTransferSettings = async (
  settings: Partial<BankTransferSettings>,
  _adminUid?: string
): Promise<BankTransferSettings> => {
  const docRef = doc(db, SETTINGS_COLLECTION, BANK_SETTINGS_DOC);

  const payload: Record<string, any> = {
    ...settings,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });

  return {
    ...DEFAULT_BANK_SETTINGS,
    ...settings,
  } as BankTransferSettings;
};

/**
 * Subscribe to real-time updates for Bank Transfer settings in Firestore.
 */
export const subscribeBankTransferSettings = (
  onUpdate: (settings: BankTransferSettings) => void
): (() => void) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, BANK_SETTINGS_DOC);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          onUpdate({
            ...DEFAULT_BANK_SETTINGS,
            ...data,
          } as BankTransferSettings);
        } else {
          onUpdate(DEFAULT_BANK_SETTINGS);
        }
      },
      (error) => {
        console.warn('Bank settings subscription notice:', error.message);
        onUpdate(DEFAULT_BANK_SETTINGS);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Error setting up bank settings subscription:', err);
    onUpdate(DEFAULT_BANK_SETTINGS);
    return () => {};
  }
};
