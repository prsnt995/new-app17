/**
 * NamasteMart Push Notification Service
 * - Local notifications: work in Expo Go (dev)
 * - FCM push via Expo Push API: works in dev/prod builds
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── CONFIGURE HOW NOTIFICATIONS ARE PRESENTED ──────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── REQUEST PERMISSION & GET PUSH TOKEN ────────────────────────────────────
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    // Get Expo Push Token (works for Expo Go + dev builds)
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined,
      });
      return tokenData.data;
    } catch (tokenError: any) {
      console.log('Push token notice (Expo Go limitation):', tokenError.message);
      return null;
    }
  } catch (error: any) {
    console.log('Notification permission error:', error.message);
    return null;
  }
};

// ─── SEND LOCAL NOTIFICATION (WORKS IN EXPO GO) ──────────────────────────────
export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Immediately
    });
  } catch (error: any) {
    console.log('Local notification error:', error.message);
  }
};

// ─── ORDER STATUS NOTIFICATION MESSAGES ──────────────────────────────────────
export const getOrderStatusNotification = (
  orderNumber: string,
  status: string
): { title: string; body: string } => {
  const statusMessages: Record<string, { title: string; body: string }> = {
    ORDER_PLACED: {
      title: '✅ Order Confirmed!',
      body: `Your order ${orderNumber} has been received and is being processed.`,
    },
    PACKED: {
      title: '📦 Order Packed',
      body: `Your order ${orderNumber} has been packed and is ready for pickup.`,
    },
    PICKED_UP: {
      title: '🚚 Out for Collection',
      body: `Your order ${orderNumber} has been picked up by our courier.`,
    },
    IN_TRANSIT: {
      title: '✈️ In Transit',
      body: `Your order ${orderNumber} is on its way to you! Estimated: 3-5 days.`,
    },
    OUT_FOR_DELIVERY: {
      title: '🏃 Out for Delivery',
      body: `Your order ${orderNumber} is out for delivery today. Stay home!`,
    },
    DELIVERED: {
      title: '🎉 Delivered!',
      body: `Your order ${orderNumber} has been delivered. Enjoy your items!`,
    },
    CANCELLED: {
      title: '❌ Order Cancelled',
      body: `Your order ${orderNumber} has been cancelled. Contact us for refund.`,
    },
  };

  return statusMessages[status] || {
    title: '📦 Order Update',
    body: `Your order ${orderNumber} status has been updated.`,
  };
};

// ─── SEND ORDER STATUS NOTIFICATION ──────────────────────────────────────────
export const notifyOrderStatusChange = async (
  orderNumber: string,
  status: string
): Promise<void> => {
  const { title, body } = getOrderStatusNotification(orderNumber, status);
  await sendLocalNotification(title, body, { orderNumber, status });
};

// ─── SEND VIA EXPO PUSH API (SERVER-SIDE / DEV BUILDS) ───────────────────────
export const sendExpoPushNotification = async (
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> => {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
      }),
    });

    const result = await response.json();
    return result.data?.status === 'ok';
  } catch (error: any) {
    console.log('Expo push notification error:', error.message);
    return false;
  }
};
