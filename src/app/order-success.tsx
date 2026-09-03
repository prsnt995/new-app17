import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { orderId, orderNumber, amount } = useLocalSearchParams<{ orderId?: string; orderNumber?: string; amount?: string }>();
  const { isDarkMode } = useApp();
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    if (countdown <= 0) {
      router.replace('/orders');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const S = mStyles(isDarkMode);

  return (
    <SafeAreaView style={S.container}>
      <ScrollView contentContainerStyle={S.content}>
        <Text style={S.emoji}>🎉</Text>
        <Text style={S.title}>Payment Submitted!</Text>
        <Text style={S.subtitle}>Your order is being verified. You’ll see it in your Orders — tracked via CJ Logistics.</Text>

        <View style={S.card}>
          <View style={S.row}><Text style={S.label}>Order Number</Text><Text style={S.valueBold}>{orderNumber || orderId || '—'}</Text></View>
          {amount ? <View style={S.row}><Text style={S.label}>Amount</Text><Text style={S.valueAmount}>₩{Number(amount).toLocaleString()}</Text></View> : null}
          <View style={S.row}><Text style={S.label}>Next Step</Text><Text style={S.value}>Admin will verify your proof within 24h</Text></View>
        </View>

        <TouchableOpacity style={S.primaryBtn} onPress={() => router.replace('/orders')}>
          <Text style={S.primaryText}>View Orders & Track →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.secondaryBtn} onPress={() => router.replace('/')}>
          <Text style={S.secondaryText}>Continue Shopping</Text>
        </TouchableOpacity>

        <Text style={S.redirectHint}>Redirecting to Orders in {countdown}s…</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const mStyles = (isDark: boolean) => {
  const bg = isDark ? '#0A0A0F' : '#F8F7F3';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const text = isDark ? '#FFFFFF' : '#212121';
  const sub = isDark ? '#A0A0A0' : '#8A857A';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    content: { padding: 20, alignItems: 'center', paddingBottom: 40 },
    emoji: { fontSize: 48, marginBottom: 12 },
    title: { fontSize: 22, fontWeight: '900', color: text, marginBottom: 8 },
    subtitle: { fontSize: 13, color: sub, textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
    card: { width: '100%', backgroundColor: cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isDark ? '#333' : '#EFEBE4', gap: 10, marginBottom: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 11, color: sub, fontWeight: '700' },
    valueBold: { fontSize: 13, fontWeight: '900', color: text },
    value: { fontSize: 12, color: text },
    valueAmount: { fontSize: 14, fontWeight: '900', color: '#C88D2B' },
    primaryBtn: { width: '100%', backgroundColor: '#C88D2B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
    primaryText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
    secondaryBtn: { width: '100%', backgroundColor: isDark ? '#262626' : '#F8F7F3', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#333' : '#EFEBE4' },
    secondaryText: { color: text, fontWeight: '800', fontSize: 13 },
    redirectHint: { fontSize: 11, color: sub, marginTop: 12 },
  });
};
