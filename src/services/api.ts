/**
 * NamasteMart API Service
 * Server calls for WhatsApp notifications and Korean card payment.
 * Auth and database calls are handled directly by Supabase client.
 */

import { supabase } from '@/config/supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5050/api';

// ─── HELPER: Build auth headers ─────────────────────────────────────────────
const authHeaders = (idToken?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  return headers;
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return authHeaders(session.access_token);
  } catch {}
  return { 'Content-Type': 'application/json' };
};

// ─── WHATSAPP ORDER NOTIFICATIONS ──────────────────────────────────────────
export const notifyWhatsAppOrderBackend = async (orderId: string, orderData?: any) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/orders/notify-whatsapp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId, orderData }),
    });
    const result = await response.json();
    return result;
  } catch (error: any) {
    console.warn('WhatsApp notification API notice:', error.message);
    return {
      success: false,
      message: 'Backend notice (order saved successfully in Supabase)',
    };
  }
};

export const retryWhatsAppOrderBackend = async (orderId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/orders/retry-whatsapp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId }),
    });
    const result = await response.json();
    return result;
  } catch (error: any) {
    console.warn('WhatsApp retry API notice:', error.message);
    return {
      success: false,
      message: error.message || 'Retry failed',
    };
  }
};

// ─── KOREAN CARD PAYMENT & ORDER CREATION ────────────────────────────────────
export interface VerifyAndCreateCardOrderPayload {
  paymentDetails: import('@/types').KoreanCardPaymentDetails;
  customer: import('@/types').CustomerSnapshot;
  deliveryAddress: import('@/types').DeliveryAddressSnapshot;
  items: {
    productId: string;
    name: string;
    imageUrl: string;
    quantity: number;
    originalPrice: number;
    discount: number;
    finalPrice: number;
    subtotal: number;
    weightKg?: number;
  }[];
  subtotal: number;
  totalDiscount: number;
  deliveryFee: number;
  totalAmount: number;
  userId: string;
  originHub?: string;
  destinationCity?: string;
  shippingMethod?: 'Standard' | 'Express';
}

export const verifyAndCreateKoreanCardOrder = async (payload: VerifyAndCreateCardOrderPayload) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/payments/verify-and-create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.warn('Backend payment verification notice:', error.message);
    return {
      success: false,
      message: error.message || 'Network error communicating with backend',
    };
  }
};

export const verifyPaymentBackend = async (transactionId: string, paidAmount: number, cardCompany?: string, orderId?: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/payments/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transactionId, paidAmount, cardCompany, orderId }),
    });
    return await response.json();
  } catch (error: any) {
    console.warn('Backend payment verify check notice:', error.message);
    return {
      success: false,
      verified: false,
      transactionId,
      paidAmount,
      status: 'FAILED',
      message: error.message || 'Network error during verification',
    };
  }
};

// ─── SUPABASE OTP WRAPPERS (for onboarding compatibility) ─────────────────────
export interface SendOtpResponse {
  success: boolean;
  message: string;
  email?: string;
  expiresInMinutes?: number;
  cooldownSeconds?: number;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  uid?: string;
  email?: string;
  emailVerified?: boolean;
}

export const sendOtp = async (email: string, _idToken?: string): Promise<SendOtpResponse> => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });

    if (error) throw error;

    return {
      success: true,
      message: `Verification code sent to ${email}`,
      email: email.trim().toLowerCase(),
      expiresInMinutes: 10,
      cooldownSeconds: 45,
    };
  } catch (error: any) {
    console.warn('Supabase OTP send notice:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to send verification code',
      email: email.trim().toLowerCase(),
    };
  }
};

export const verifyOtp = async (email: string, code: string, _idToken?: string): Promise<VerifyOtpResponse> => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });

    if (error) throw error;

    return {
      success: true,
      message: 'Email verified successfully',
      uid: data.user?.id,
      email: data.user?.email,
      emailVerified: true,
    };
  } catch (error: any) {
    console.warn('Supabase OTP verify notice:', error.message);
    return { success: false, message: error.message || 'Invalid verification code' };
  }
};

export const saveUserProfile = async (
  data: {
    phoneCountryCode: string;
    phoneNumber: string;
    address?: any;
  },
  _accessToken?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fullPhone = `${data.phoneCountryCode || ''}${data.phoneNumber}`.trim();
    const { error } = await supabase
      .from('profiles')
      .update({ phone: fullPhone, profile_setup_complete: true, updated_at: Date.now() })
      .eq('id', user.id);

    if (error) throw error;

    return { success: true, message: 'Profile saved successfully' };
  } catch (error: any) {
    console.warn('Save profile notice:', error.message);
    return { success: false, message: error.message || 'Failed to save profile' };
  }
};
