/**
 * NamasteMart Address Service
 * Manages Korean delivery addresses for users in Supabase.
 */

import { supabase, TABLES } from '@/config/supabase';
import { KoreanAddress } from '@/types';

/**
 * Validates a South Korean phone number format.
 * Valid examples: 010-1234-5678, 01012345678, +82 10-1234-5678, 011/016/017/018/019/02/031...
 */
export const validateKoreanPhone = (phone: string): { valid: boolean; formatted: string; message?: string } => {
  const clean = phone.replace(/[^0-9+]/g, '');
  if (!clean) {
    return { valid: false, formatted: '', message: 'Phone number is required.' };
  }

  // Check if it matches typical Korean numbers:
  // Mobile starts with 010, 011, 016, 017, 018, 019 or +8210...
  const isKoreanMobile = /^(01[016789]\d{7,8}|\+8210\d{8})$/.test(clean);
  const isKoreanLandline = /^(0[2-6][1-5]?\d{6,8}|\+82[2-6]\d{7,8})$/.test(clean);

  if (!isKoreanMobile && !isKoreanLandline && clean.length < 9) {
    return {
      valid: false,
      formatted: phone,
      message: 'Please enter a valid Korean phone number (e.g. 010-1234-5678).',
    };
  }

  // Format cleanly if 11 digits starting with 010
  if (clean.length === 11 && clean.startsWith('010')) {
    const formatted = `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
    return { valid: true, formatted };
  }

  return { valid: true, formatted: phone.trim() };
};

/**
 * Validates a Korean delivery address before saving.
 */
export const validateKoreanAddress = (
  addr: Partial<KoreanAddress>
): { valid: boolean; error?: string } => {
  if (!addr.recipientName || !addr.recipientName.trim()) {
    return { valid: false, error: 'Full recipient name is required.' };
  }
  if (!addr.phoneNumber || !addr.phoneNumber.trim()) {
    return { valid: false, error: 'Korean phone number is required.' };
  }
  const phoneValidation = validateKoreanPhone(addr.phoneNumber);
  if (!phoneValidation.valid) {
    return { valid: false, error: phoneValidation.message };
  }
  if (!addr.postalCode || !addr.postalCode.trim()) {
    return { valid: false, error: 'Postal code is required.' };
  }
  if (!addr.address || !addr.address.trim()) {
    return { valid: false, error: 'South Korean street / road address is required.' };
  }
  if (!addr.detailAddress || !addr.detailAddress.trim()) {
    return { valid: false, error: 'Detailed address (apt, building, floor, room) is required.' };
  }
  if (addr.country && addr.country !== 'South Korea') {
    return { valid: false, error: 'Delivery address country must be South Korea.' };
  }

  return { valid: true };
};

/**
 * Add a new Korean delivery address to the user's profile.
 */
export const addUserKoreanAddress = async (
  uid: string,
  newAddress: Omit<KoreanAddress, 'id' | 'country'> & { id?: string }
): Promise<KoreanAddress> => {
  const { data, error: fetchError } = await supabase
    .from(TABLES.PROFILES)
    .select('addresses')
    .eq('id', uid)
    .single();

  if (fetchError) throw fetchError;

  const existingAddresses: KoreanAddress[] = data?.addresses || [];

  const addressId = newAddress.id || `kr-addr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const isFirst = existingAddresses.length === 0;

  const fullAddressObj: KoreanAddress = {
    ...newAddress,
    id: addressId,
    country: 'South Korea',
    label: newAddress.label || 'Home',
    isDefault: isFirst ? true : !!newAddress.isDefault,
  };

  // If this new address is set as default, mark previous addresses as non-default
  const updatedAddresses = fullAddressObj.isDefault
    ? existingAddresses.map((a) => ({ ...a, isDefault: false }))
    : existingAddresses;

  updatedAddresses.push(fullAddressObj);

  const { error: updateError } = await supabase
    .from(TABLES.PROFILES)
    .update({ addresses: updatedAddresses, updated_at: Date.now() })
    .eq('id', uid);

  if (updateError) throw updateError;

  return fullAddressObj;
};

/**
 * Update an existing Korean address.
 */
export const updateUserKoreanAddress = async (
  uid: string,
  addressId: string,
  updates: Partial<Omit<KoreanAddress, 'id' | 'country'>>
): Promise<void> => {
  const { data, error: fetchError } = await supabase
    .from(TABLES.PROFILES)
    .select('addresses')
    .eq('id', uid)
    .single();

  if (fetchError || !data) return;

  const existingAddresses: KoreanAddress[] = data.addresses || [];
  let updatedAddresses = existingAddresses.map((a) => {
    if (a.id === addressId) {
      return {
        ...a,
        ...updates,
        country: 'South Korea' as const,
      };
    }
    return updates.isDefault ? { ...a, isDefault: false } : a;
  });

  const { error: updateError } = await supabase
    .from(TABLES.PROFILES)
    .update({ addresses: updatedAddresses, updated_at: Date.now() })
    .eq('id', uid);

  if (updateError) throw updateError;
};

/**
 * Delete a Korean address.
 */
export const deleteUserKoreanAddress = async (
  uid: string,
  addressId: string
): Promise<void> => {
  const { data, error: fetchError } = await supabase
    .from(TABLES.PROFILES)
    .select('addresses')
    .eq('id', uid)
    .single();

  if (fetchError || !data) return;

  const existingAddresses: KoreanAddress[] = data.addresses || [];
  let updatedAddresses = existingAddresses.filter((a) => a.id !== addressId);

  // If we deleted the default address, make the first remaining address default
  if (updatedAddresses.length > 0 && !updatedAddresses.some((a) => a.isDefault)) {
    updatedAddresses[0].isDefault = true;
  }

  const { error: updateError } = await supabase
    .from(TABLES.PROFILES)
    .update({ addresses: updatedAddresses, updated_at: Date.now() })
    .eq('id', uid);

  if (updateError) throw updateError;
};

/**
 * Set an address as the default delivery address.
 */
export const setDefaultKoreanAddress = async (
  uid: string,
  addressId: string
): Promise<void> => {
  const { data, error: fetchError } = await supabase
    .from(TABLES.PROFILES)
    .select('addresses')
    .eq('id', uid)
    .single();

  if (fetchError || !data) return;

  const existingAddresses: KoreanAddress[] = data.addresses || [];
  const updatedAddresses = existingAddresses.map((a) => ({
    ...a,
    isDefault: a.id === addressId,
  }));

  const { error: updateError } = await supabase
    .from(TABLES.PROFILES)
    .update({ addresses: updatedAddresses, updated_at: Date.now() })
    .eq('id', uid);

  if (updateError) throw updateError;
};
