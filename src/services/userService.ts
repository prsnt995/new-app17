/**
 * NamasteMart User Profile Service (Supabase)
 * Manages profiles table in Supabase PostgreSQL.
 */

import { supabase, TABLES } from '@/config/supabase';
import { FirestoreUser, KoreanAddress } from '@/types';

/**
 * Ensures a user profile exists in Supabase.
 * If new: creates with name, email, empty addresses.
 * If existing: updates name/email/avatar if changed, but NEVER overwrites phone or addresses.
 */
export const ensureUserDoc = async (
  uid: string,
  data: {
    name: string;
    email: string;
    phoneNumber?: string;
    avatar?: string;
    role?: string;
    emailVerified?: boolean;
  }
): Promise<FirestoreUser> => {
  const fallbackUser: FirestoreUser = {
    uid,
    name: data.name || 'User',
    email: data.email || '',
    phoneNumber: data.phoneNumber || '',
    avatar: data.avatar || '',
    addresses: [],
    role: data.role || 'customer',
    emailVerified: data.emailVerified || false,
    profileSetupComplete: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    // Try to fetch existing profile
    const { data: existing, error: fetchError } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', uid)
      .single();

    if (fetchError || !existing) {
      // Profile doesn't exist — create it
      const { error: insertError } = await supabase
        .from(TABLES.PROFILES)
        .insert({
          id: uid,
          name: data.name || 'User',
          email: data.email || '',
          phone: data.phoneNumber || '',
          avatar: data.avatar || '',
          role: data.role || 'customer',
          email_verified: data.emailVerified || false,
          profile_setup_complete: false,
          addresses: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        });

      if (insertError) {
        console.log('Notice creating profile:', insertError.message);
      }
      return fallbackUser;
    }

    // Profile exists — update only changed fields, never overwrite phone or addresses
    const updates: Record<string, any> = { updated_at: Date.now() };
    if (data.name && data.name !== existing.name) updates.name = data.name;
    if (data.email && data.email !== existing.email) updates.email = data.email;
    if (data.avatar) updates.avatar = data.avatar;
    if (data.phoneNumber && !existing.phone) updates.phone = data.phoneNumber;
    if (data.emailVerified !== undefined) updates.email_verified = data.emailVerified;

    if (Object.keys(updates).length > 1) {
      const { error: updateError } = await supabase
        .from(TABLES.PROFILES)
        .update(updates)
        .eq('id', uid);

      if (updateError) {
        console.log('Notice updating profile:', updateError.message);
      }
    }

    return {
      uid: existing.id,
      name: updates.name ?? existing.name,
      email: updates.email ?? existing.email,
      phoneNumber: (updates.phone ?? existing.phone) || '',
      avatar: (updates.avatar ?? existing.avatar) || '',
      addresses: existing.addresses || [],
      role: existing.role || 'customer',
      emailVerified: (updates.email_verified ?? existing.email_verified) || false,
      profileSetupComplete: existing.profile_setup_complete || false,
      createdAt: existing.created_at || Date.now(),
      updatedAt: Date.now(),
    };
  } catch (err: any) {
    console.log('ensureUserDoc resilient fallback:', err.message);
    return fallbackUser;
  }
};

/**
 * Fetch a user profile by UID.
 */
export const getUserDoc = async (uid: string): Promise<FirestoreUser | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', uid)
      .single();

    if (error || !data) return null;

    return {
      uid: data.id,
      name: data.name || '',
      email: data.email || '',
      phoneNumber: data.phone || '',
      avatar: data.avatar || '',
      addresses: data.addresses || [],
      role: data.role || 'customer',
      emailVerified: data.email_verified || false,
      profileSetupComplete: data.profile_setup_complete || false,
      createdAt: data.created_at || Date.now(),
      updatedAt: data.updated_at || Date.now(),
    };
  } catch (err: any) {
    console.log('Error getting user doc:', err.message);
    return null;
  }
};

/**
 * Subscribe to real-time user profile updates via Supabase Realtime.
 */
export const subscribeToUserDoc = (
  uid: string,
  callback: (user: FirestoreUser | null) => void
): (() => void) => {
  // Initial fetch
  getUserDoc(uid).then(callback);

  // Realtime subscription
  const channel = supabase
    .channel(`profile-${uid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLES.PROFILES,
        filter: `id=eq.${uid}`,
      },
      (payload) => {
        if (payload.new) {
          const d = payload.new as any;
          callback({
            uid: d.id,
            name: d.name || '',
            email: d.email || '',
            phoneNumber: d.phone || '',
            avatar: d.avatar || '',
            addresses: d.addresses || [],
            role: d.role || 'customer',
            emailVerified: d.email_verified || false,
            profileSetupComplete: d.profile_setup_complete || false,
            createdAt: d.created_at || Date.now(),
            updatedAt: d.updated_at || Date.now(),
          });
        } else {
          callback(null);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Update basic user profile fields.
 */
export const updateUserProfileDoc = async (
  uid: string,
  updates: Partial<Pick<FirestoreUser, 'name' | 'phoneNumber' | 'avatar'>>
): Promise<void> => {
  const payload: Record<string, any> = { updated_at: Date.now() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.phoneNumber !== undefined) payload.phone = updates.phoneNumber;
  if (updates.avatar !== undefined) payload.avatar = updates.avatar;

  const { error } = await supabase
    .from(TABLES.PROFILES)
    .update(payload)
    .eq('id', uid);

  if (error) {
    console.log('Notice updating profile:', error.message);
  }
};

/**
 * Subscribe to all users for Admin Customer Management.
 */
export const subscribeAllUsersAdmin = (
  callback: (users: FirestoreUser[]) => void
): (() => void) => {
  // Initial fetch
  getAllUsersAdmin().then(callback);

  // Realtime subscription
  const channel = supabase
    .channel('admin-all-users')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLES.PROFILES },
      () => {
        // Re-fetch all on any change
        getAllUsersAdmin().then(callback);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Fetch all registered users for Admin.
 */
export const getAllUsersAdmin = async (): Promise<FirestoreUser[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .limit(500)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((d) => ({
      uid: d.id,
      name: d.name || '',
      email: d.email || '',
      phoneNumber: d.phone || '',
      avatar: d.avatar || '',
      addresses: d.addresses || [],
      role: d.role || 'customer',
      emailVerified: d.email_verified || false,
      profileSetupComplete: d.profile_setup_complete || false,
      createdAt: d.created_at || Date.now(),
      updatedAt: d.updated_at || Date.now(),
    }));
  } catch (err: any) {
    console.log('Error getting all users:', err.message);
    return [];
  }
};

/**
 * Mark user email as verified.
 */
export const markEmailVerifiedInFirestore = async (uid: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.PROFILES)
    .update({ email_verified: true, updated_at: Date.now() })
    .eq('id', uid);

  if (error) {
    console.log('Notice marking email verified:', error.message);
  }
};

/**
 * Get user addresses from the profile's addresses jsonb column.
 */
export const getUserAddressesSubcollection = async (uid: string): Promise<KoreanAddress[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('addresses')
      .eq('id', uid)
      .single();

    if (error || !data) return [];
    return (data.addresses || []) as KoreanAddress[];
  } catch (err: any) {
    console.log('Error fetching user addresses:', err.message);
    return [];
  }
};

/**
 * Save delivery address to user profile and set profile setup complete.
 */
export const saveUserDeliveryAddress = async (
  uid: string,
  newAddress: KoreanAddress
): Promise<KoreanAddress[]> => {
  let addresses: KoreanAddress[] = [newAddress];

  try {
    const { data: existing } = await supabase
      .from(TABLES.PROFILES)
      .select('addresses')
      .eq('id', uid)
      .single();

    if (existing?.addresses) {
      addresses = existing.addresses;
    }

    // If set as default, unmark all others
    if (newAddress.isDefault) {
      addresses = addresses.map((a) => ({ ...a, isDefault: false }));
    }

    // Update existing or add new
    const existingIdx = addresses.findIndex((a) => a.id === newAddress.id);
    if (existingIdx >= 0) {
      addresses[existingIdx] = newAddress;
    } else {
      addresses.push(newAddress);
    }

    const { error } = await supabase
      .from(TABLES.PROFILES)
      .update({
        addresses,
        email_verified: true,
        profile_setup_complete: true,
        updated_at: Date.now(),
      })
      .eq('id', uid);

    if (error) {
      console.log('Notice saving address:', error.message);
    }
  } catch (err: any) {
    console.log('saveUserDeliveryAddress resilient fallback:', err.message);
  }

  return addresses;
};

/**
 * Update user setup complete flag.
 */
export const updateUserSetupComplete = async (uid: string, complete: boolean): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.PROFILES)
    .update({ profile_setup_complete: complete, updated_at: Date.now() })
    .eq('id', uid);

  if (error) {
    console.log('Notice updating setup complete:', error.message);
  }
};
