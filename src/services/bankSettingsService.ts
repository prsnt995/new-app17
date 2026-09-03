/**
 * NamasteMart Bank Transfer Settings Service (Supabase)
 * Fetches, saves, and listens to settings with key='bankTransfer' in Supabase.
 */

import { supabase, TABLES } from '@/config/supabase';
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

const SETTINGS_KEY = 'bankTransfer';

/**
 * Get current Bank Transfer settings from Supabase with default fallback.
 * Uses supabase.from(TABLES.SETTINGS).select with key='bankTransfer', value JSONB, updated_at bigint.
 */
export const getBankTransferSettings = async (): Promise<BankTransferSettings> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .select('value, updated_at')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.value) {
      return {
        ...DEFAULT_BANK_SETTINGS,
        ...(data.value as object),
      } as BankTransferSettings;
    }

    // Initialize row in Supabase if missing
    try {
      await supabase.from(TABLES.SETTINGS).upsert(
        {
          key: SETTINGS_KEY,
          value: DEFAULT_BANK_SETTINGS as unknown as Record<string, unknown>,
          updated_at: Date.now(),
        },
        { onConflict: 'key' }
      );
    } catch {}

    return DEFAULT_BANK_SETTINGS;
  } catch (error) {
    console.warn('Notice: Using default bank transfer settings:', error);
    return DEFAULT_BANK_SETTINGS;
  }
};

/**
 * Save or update Bank Transfer settings in Supabase (Admin action).
 * Uses upsert with key='bankTransfer', value JSONB, updated_at bigint. Timestamps use Date.now().
 */
export const updateBankTransferSettings = async (
  settings: Partial<BankTransferSettings>,
  _adminUid?: string
): Promise<BankTransferSettings> => {
  const existing = await getBankTransferSettings();

  const merged: BankTransferSettings = {
    ...DEFAULT_BANK_SETTINGS,
    ...existing,
    ...settings,
  } as BankTransferSettings;

  const { error } = await supabase.from(TABLES.SETTINGS).upsert(
    {
      key: SETTINGS_KEY,
      value: merged as unknown as Record<string, unknown>,
      updated_at: Date.now(),
    },
    { onConflict: 'key' }
  );

  if (error) {
    throw error;
  }

  return merged;
};

/**
 * Subscribe to real-time updates for Bank Transfer settings in Supabase.
 * Uses supabase channel postgres_changes on TABLES.SETTINGS with filter key=eq.bankTransfer.
 */
export const subscribeBankTransferSettings = (
  onUpdate: (settings: BankTransferSettings) => void
): (() => void) => {
  try {
    // Initial fetch to emit current value
    const fetchAndEmit = async () => {
      try {
        const settings = await getBankTransferSettings();
        onUpdate(settings);
      } catch (e: any) {
        console.warn('Bank settings fetch notice:', e?.message);
        onUpdate(DEFAULT_BANK_SETTINGS);
      }
    };
    fetchAndEmit();

    const channel = supabase
      .channel('bank-transfer-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.SETTINGS,
          filter: `key=eq.${SETTINGS_KEY}`,
        },
        async (payload: any) => {
          try {
            const newValue = payload?.new?.value;
            if (newValue) {
              onUpdate({
                ...DEFAULT_BANK_SETTINGS,
                ...newValue,
              } as BankTransferSettings);
            } else if (payload.eventType === 'DELETE') {
              onUpdate(DEFAULT_BANK_SETTINGS);
            } else {
              const settings = await getBankTransferSettings();
              onUpdate(settings);
            }
          } catch (e: any) {
            console.warn('Bank settings subscription notice:', e?.message);
            onUpdate(DEFAULT_BANK_SETTINGS);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Error setting up bank settings subscription:', err);
    onUpdate(DEFAULT_BANK_SETTINGS);
    return () => {};
  }
};

// Alias per spec: subscribeToBankTransferSettings
export const subscribeToBankTransferSettings = subscribeBankTransferSettings;
