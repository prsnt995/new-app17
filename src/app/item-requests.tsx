import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { BankTransferCard } from '@/components/BankTransferCard';
import {
  subscribeCustomerItemRequests,
  submitItemRequestPaymentProof,
} from '@/services/itemRequestService';
import { ItemRequestRecord, ItemRequestStatus } from '@/types';

export default function ItemRequestsScreen() {
  const router = useRouter();
  const { user, formatPrice, isDarkMode } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const [requests, setRequests] = useState<ItemRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'PRICE_CONFIRMED' | 'DELIVERED'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<ItemRequestRecord | null>(null);

  // Bank Transfer Payment Upload Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payRequest, setPayRequest] = useState<ItemRequestRecord | null>(null);
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [senderName, setSenderName] = useState(user.name || '');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCustomerItemRequests(user.id || '', (data) => {
      setRequests(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user.id]);

  const filteredRequests = requests.filter((r) => {
    if (activeFilter === 'PENDING') {
      return r.status === 'Pending Review' || r.status === 'pending';
    }
    if (activeFilter === 'PRICE_CONFIRMED') {
      return r.status === 'Price Confirmed' || r.status === 'Payment Pending' || r.status === 'Payment Submitted';
    }
    if (activeFilter === 'DELIVERED') {
      return r.status === 'Delivered';
    }
    return true;
  });

  const getStatusConfig = (status: ItemRequestStatus) => {
    switch (status) {
      case 'Pending Review':
        return { label: 'Pending Review ⏳', bg: '#FEF3C7', text: '#B45309' };
      case 'Price Confirmed':
        return { label: 'Price Confirmed 🎉', bg: '#E0F2FE', text: '#0369A1' };
      case 'Payment Pending':
        return { label: 'Payment Pending 💳', bg: '#FFEDD5', text: '#C2410C' };
      case 'Payment Submitted':
        return { label: 'Payment Submitted 📑', bg: '#E0E7FF', text: '#4338CA' };
      case 'Purchased / Sourced':
        return { label: 'Purchased / Sourced 🛍️', bg: '#DCFCE7', text: '#15803D' };
      case 'Shipped from Origin':
      case 'Arrived in Korea':
        return { label: 'In Transit ✈️', bg: '#DBEAFE', text: '#1D4ED8' };
      case 'Delivered':
        return { label: 'Delivered ✓', bg: '#D1FAE5', text: '#047857' };
      case 'Rejected':
        return { label: 'Rejected ❌', bg: '#FEE2E2', text: '#991B1B' };
      default:
        return { label: status, bg: isDarkMode ? '#262626' : '#F3F4F6', text: isDarkMode ? '#D1D5DB' : '#4B5563' };
    }
  };

  const handlePickPaymentScreenshot = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Camera roll access is required to upload receipt screenshot.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPaymentScreenshot(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Image Error', e.message || 'Could not pick receipt image.');
    }
  };

  const handleSubmitPayment = async () => {
    if (!payRequest) return;
    if (!paymentScreenshot) {
      Alert.alert('Proof Required', 'Please attach a screenshot of your bank transfer receipt.');
      return;
    }

    try {
      setIsSubmittingPay(true);
      const amountToPay = payRequest.finalConfirmedPriceKRW || 0;
      await submitItemRequestPaymentProof({
        requestId: payRequest.requestId,
        userId: user.id || 'guest',
        screenshotUri: paymentScreenshot,
        transferredAmount: amountToPay,
        senderName: senderName.trim() || user.name,
      });

      Alert.alert('Payment Submitted', 'Your payment proof has been submitted for admin verification.');
      setIsPayModalOpen(false);
      setPaymentScreenshot(null);
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit payment proof.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#121212' : '#F8F7F3'}
      />
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>My Item Requests 🛍️</Text>
            <Text style={styles.headerSub}>Track products sourced from India & Nepal to Korea</Text>
          </View>

          <TouchableOpacity style={styles.newReqBtn} onPress={() => router.push('/request-item')} activeOpacity={0.8}>
            <Text style={styles.newReqBtnText}>+ New Request 🛍️</Text>
          </TouchableOpacity>
        </View>

        {/* FILTER TABS */}
        <View style={styles.tabBar}>
          {(['ALL', 'PENDING', 'PRICE_CONFIRMED', 'DELIVERED'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabChip, activeFilter === tab && styles.tabChipActive]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabChipText, activeFilter === tab && styles.tabChipTextActive]}>
                {tab === 'ALL'
                  ? 'All Requests'
                  : tab === 'PENDING'
                  ? 'Pending Review'
                  : tab === 'PRICE_CONFIRMED'
                  ? 'Price Confirmed'
                  : 'Delivered'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#D97706" />
              <Text style={styles.loadingText}>Loading your item requests...</Text>
            </View>
          ) : filteredRequests.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🛍️</Text>
              <Text style={styles.emptyTitle}>No Item Requests Found</Text>
              <Text style={styles.emptySub}>
                {activeFilter === 'ALL'
                  ? 'You have not submitted any item sourcing requests yet.'
                  : `No requests found for filter "${activeFilter}".`}
              </Text>
              <TouchableOpacity style={styles.requestNowBtn} onPress={() => router.push('/request-item')}>
                <Text style={styles.requestNowBtnText}>Request Item Now 🛍️</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredRequests.map((req) => {
              const statusCfg = getStatusConfig(req.status);
              const isPriceConfirmed = req.isPriceConfirmed || req.status === 'Price Confirmed';
              const confirmedPrice = req.finalConfirmedPriceKRW || 0;

              return (
                <View key={req.requestId} style={styles.reqCard}>
                  {/* Card Top Row */}
                  <View style={styles.cardHeaderRow}>
                    <View>
                      <Text style={styles.reqIdText}>{req.requestId}</Text>
                      <Text style={styles.reqDateText}>
                        {new Date(req.createdAt).toLocaleDateString()} • Source: {req.originCountry === 'India' ? 'India 🇮🇳' : 'Nepal 🇳🇵'}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
                    </View>
                  </View>

                  {/* Price Confirmed Banner Notice */}
                  {isPriceConfirmed && req.paymentStatus !== 'paid' && req.paymentStatus !== 'submitted' && (
                    <View style={styles.confirmedNoticeBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.confirmedNoticeTitle}>✨ Final Price Confirmed by Admin!</Text>
                        <Text style={styles.confirmedNoticeSub}>
                          Item Cost: ₩{(req.itemCostKRW || 0).toLocaleString()} • Shipping: ₩{(req.shippingCostKRW || 0).toLocaleString()}
                        </Text>
                        <Text style={styles.confirmedNoticeTotal}>
                          Total Amount: <Text style={{ fontWeight: '900' }}>{formatPrice(confirmedPrice)}</Text>
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.payNowBtn}
                        onPress={() => {
                          setPayRequest(req);
                          setIsPayModalOpen(true);
                        }}
                      >
                        <Text style={styles.payNowBtnText}>Pay Now 💳</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Requested items breakdown */}
                  <View style={styles.itemsSummaryWrap}>
                    <Text style={styles.itemsSummaryTitle}>Requested Items ({req.items?.length || 0}):</Text>
                    {req.items?.map((item: any, idx: number) => (
                      <Text key={idx} style={styles.itemBulletRow} numberOfLines={1}>
                        • {item.name} (Qty: {item.quantity}) {item.brand ? `• ${item.brand}` : ''} {item.sizeColor ? `• ${item.sizeColor}` : ''}
                      </Text>
                    ))}
                  </View>

                  {/* Korea Delivery Address & Tracking */}
                  <View style={styles.recipientRow}>
                    <Text style={styles.recipientText}>
                      Delivery: <Text style={{ fontWeight: '800' }}>{req.koreaDeliveryAddress?.recipientName}</Text> ({req.koreaDeliveryAddress?.city})
                    </Text>
                    <Text style={styles.trackingText}>AWB: {req.trackingNumber}</Text>
                  </View>

                  {/* Bottom Action Bar */}
                  <View style={styles.cardFooterBar}>
                    <View>
                      <Text style={styles.priceMetaLabel}>
                        {isPriceConfirmed ? 'Confirmed Sourcing Price' : 'Sourcing Price Status'}
                      </Text>
                      <Text style={styles.priceMetaValue}>
                        {isPriceConfirmed ? formatPrice(confirmedPrice) : 'Awaiting Admin Pricing'}
                      </Text>
                    </View>

                    <TouchableOpacity style={styles.viewDetailBtn} onPress={() => setSelectedRequest(req)} activeOpacity={0.8}>
                      <Text style={styles.viewDetailBtnText}>View Details 🔍</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* DETAIL MODAL */}
        <Modal visible={!!selectedRequest} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Item Request Details</Text>
                <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedRequest && (
                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalCardGroup}>
                    <Text style={styles.modalGroupTitle}>Request Reference</Text>
                    <Text style={styles.modalTextLine}>ID: {selectedRequest.requestId}</Text>
                    <Text style={styles.modalTextLine}>Tracking #: {selectedRequest.trackingNumber}</Text>
                    <Text style={styles.modalTextLine}>Source Country: {selectedRequest.originCountry}</Text>
                    <Text style={styles.modalTextLine}>Status: {selectedRequest.status}</Text>
                  </View>

                  <View style={styles.modalCardGroup}>
                    <Text style={styles.modalGroupTitle}>Korea Delivery Address</Text>
                    <Text style={styles.modalTextLine}>Recipient: {selectedRequest.koreaDeliveryAddress?.recipientName}</Text>
                    <Text style={styles.modalTextLine}>Phone: {selectedRequest.koreaDeliveryAddress?.phone}</Text>
                    <Text style={styles.modalTextLine}>
                      Address: {selectedRequest.koreaDeliveryAddress?.fullAddress}, {selectedRequest.koreaDeliveryAddress?.city}
                    </Text>
                  </View>

                  <View style={styles.modalCardGroup}>
                    <Text style={styles.modalGroupTitle}>Requested Items ({selectedRequest.items?.length || 0})</Text>
                    {selectedRequest.items?.map((item: any, i: number) => (
                      <View key={i} style={styles.detailItemRow}>
                        {item.photoUrl && <Image source={{ uri: item.photoUrl }} style={styles.detailItemThumb} />}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailItemName}>{item.name}</Text>
                          <Text style={styles.detailItemSub}>
                            Qty: {item.quantity} {item.brand ? `• Brand: ${item.brand}` : ''} {item.sizeColor ? `• ${item.sizeColor}` : ''}
                          </Text>
                          {item.productLink ? <Text style={styles.itemLinkText} numberOfLines={1}>🔗 {item.productLink}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedRequest(null)}>
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* PAYMENT SUBMISSION MODAL */}
        <Modal visible={isPayModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Submit Item Request Payment</Text>
                <TouchableOpacity onPress={() => setIsPayModalOpen(false)}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              {payRequest && (
                <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                  <BankTransferCard
                    orderAmountKRW={payRequest.finalConfirmedPriceKRW || 0}
                    orderIdPreview={payRequest.requestId}
                    senderName={senderName}
                    onChangeSenderName={setSenderName}
                    paymentScreenshot={paymentScreenshot}
                    onSelectScreenshot={setPaymentScreenshot}
                  />

                  <TouchableOpacity
                    style={[styles.submitPayBtn, isSubmittingPay && { opacity: 0.6 }]}
                    onPress={handleSubmitPayment}
                    disabled={isSubmittingPay}
                  >
                    {isSubmittingPay ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.submitPayBtnText}>Submit Payment Proof 💳</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <BottomNav currentTab="orders" />
      </SafeAreaView>
    </>
  );
}

function getStyles(isDark: boolean) {
  const bg = isDark ? '#121212' : '#F8F7F3';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textMain = isDark ? '#F3F4F6' : '#1F2937';
  const textSub = isDark ? '#9CA3AF' : '#6B7280';
  const border = isDark ? '#374151' : '#E5E7EB';
  const accent = '#D97706';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: cardBg,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#2D271E' : '#FFFBEB',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backIcon: { fontSize: 18, color: accent, fontWeight: '800' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: textMain },
    headerSub: { fontSize: 11, color: textSub, marginTop: 1 },
    newReqBtn: { backgroundColor: accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
    newReqBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
    tabBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: cardBg,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    tabChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: isDark ? '#262626' : '#F3F4F6' },
    tabChipActive: { backgroundColor: accent },
    tabChipText: { fontSize: 12, fontWeight: '700', color: textSub },
    tabChipTextActive: { color: '#FFFFFF', fontWeight: '800' },
    scrollContent: { padding: 16, gap: 14 },
    loadingWrap: { padding: 40, alignItems: 'center', gap: 10 },
    loadingText: { fontSize: 13, color: textSub, fontWeight: '600' },
    emptyWrap: {
      padding: 30,
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: border,
    },
    emptyIcon: { fontSize: 40, marginBottom: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: textMain },
    emptySub: { fontSize: 12, color: textSub, textAlign: 'center', marginTop: 4, lineHeight: 17 },
    requestNowBtn: { backgroundColor: accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 14 },
    requestNowBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    reqCard: { backgroundColor: cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: border, gap: 10 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    reqIdText: { fontSize: 15, fontWeight: '900', color: textMain },
    reqDateText: { fontSize: 11, color: textSub, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statusBadgeText: { fontSize: 11, fontWeight: '800' },
    confirmedNoticeBox: {
      flexDirection: 'row',
      backgroundColor: '#E0F2FE',
      borderRadius: 12,
      padding: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#BAE6FD',
    },
    confirmedNoticeTitle: { fontSize: 12, fontWeight: '800', color: '#0369A1' },
    confirmedNoticeSub: { fontSize: 11, color: '#0284C7', marginTop: 1 },
    confirmedNoticeTotal: { fontSize: 11, color: '#0369A1', marginTop: 2 },
    payNowBtn: { backgroundColor: '#0284C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    payNowBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    itemsSummaryWrap: { backgroundColor: isDark ? '#262626' : '#F9FAFB', borderRadius: 10, padding: 10 },
    itemsSummaryTitle: { fontSize: 11, fontWeight: '800', color: textMain, marginBottom: 4 },
    itemBulletRow: { fontSize: 11, color: textSub, marginTop: 2 },
    itemLinkText: { fontSize: 10, color: '#2563EB', marginTop: 2 },
    recipientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recipientText: { fontSize: 11, color: textMain, flex: 1 },
    trackingText: { fontSize: 10, color: textSub, fontWeight: '700' },
    cardFooterBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: border,
    },
    priceMetaLabel: { fontSize: 10, color: textSub },
    priceMetaValue: { fontSize: 15, fontWeight: '900', color: accent },
    viewDetailBtn: { backgroundColor: isDark ? '#2D271E' : '#FFFBEB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: accent },
    viewDetailBtnText: { fontSize: 11, fontWeight: '800', color: accent },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: cardBg, borderRadius: 20, padding: 20, width: '100%', maxWidth: 420 },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 17, fontWeight: '900', color: textMain },
    closeIcon: { fontSize: 20, color: textSub, fontWeight: '800' },
    modalCardGroup: { backgroundColor: isDark ? '#262626' : '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 10 },
    modalGroupTitle: { fontSize: 12, fontWeight: '800', color: accent, marginBottom: 4 },
    modalTextLine: { fontSize: 12, color: textMain, marginTop: 2 },
    detailItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    detailItemThumb: { width: 32, height: 32, borderRadius: 6 },
    detailItemName: { fontSize: 12, fontWeight: '800', color: textMain },
    detailItemSub: { fontSize: 10, color: textSub },
    modalCloseBtn: { backgroundColor: isDark ? '#374151' : '#E5E7EB', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
    modalCloseBtnText: { fontSize: 13, fontWeight: '800', color: textMain },
    submitPayBtn: { backgroundColor: accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
    submitPayBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  });
}
