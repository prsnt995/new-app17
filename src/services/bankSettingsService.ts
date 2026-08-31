/**
 * NamasteMart Bank Transfer Settings Service
 * Dynamically fetches, saves, and listens to bank account configurations via Supabase.
 */

import { supabase, TABLES } from '@/config/supabase';
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

const BANK_SETTINGS_KEY = 'bankTransfer';

/**
 * Get current Bank Transfer settings from Supabase with sensible fallback.
 */
export const getBankTransferSettings = async (): Promise<BankTransferSettings> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SETTINGS)
      .select('*')
      .eq('key', BANK_SETTINGS_KEY)
      .single();

    if (error) {
      console.warn('Error fetching bank transfer settings:', error.message);
      // Auto-seed default settings if row doesn't exist
      try {
        await supabase.from(TABLES.SETTINGS).upsert({
          key: BANK_SETTINGS_KEY,
          ...DEFAULT_BANK_SETTINGS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Non-blocking if permissions or offline
      }
      return DEFAULT_BANK_SETTINGS;
    }

    if (data) {
      const { key: _key, created_at: _created, updated_at: _updated, ...rest } = data;
      return {
        ...DEFAULT_BANK_SETTINGS,
        ...rest,
      };
    }

    return DEFAULT_BANK_SETTINGS;
  } catch (error) {
    console.warn('Notice: Using local default bank transfer settings:', error);
    return DEFAULT_BANK_SETTINGS;
  }
};

/**
 * Save or update Bank Transfer settings in Supabase (Admin only).
 */
export const updateBankTransferSettings = async (
  settings: Partial<BankTransferSettings>,
  adminUid?: string
): Promise<BankTransferSettings> => {
  const payload = {
    key: BANK_SETTINGS_KEY,
    ...settings,
    updated_at: new Date().toISOString(),
    updatedBy: adminUid || 'admin',
  };

  const { error } = await supabase
    .from(TABLES.SETTINGS)
    .upsert(payload, { onConflict: 'key' });

  if (error) {
    console.error('Error updating bank transfer settings:', error.message);
    throw error;
  }

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
  const channel = supabase
    .channel('bank-transfer-settings')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLES.SETTINGS,
        filter: `key=eq.${BANK_SETTINGS_KEY}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          onUpdate(DEFAULT_BANK_SETTINGS);
          return;
        }
        const data = payload.new as Record<string, any>;
        const { key: _key, created_at: _created, updated_at: _updated, ...rest } = data;
        onUpdate({
          ...DEFAULT_BANK_SETTINGS,
          ...rest,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Bank settings subscription notice: Channel error');
        onUpdate(DEFAULT_BANK_SETTINGS);
      }
    });

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};
