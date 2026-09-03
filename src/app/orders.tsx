import React, { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getPaymentStatusBadge } from '@/services/paymentService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { ScreenLoader } from '@/components/ScreenLoader';
import { OrderItem } from '@/types';

export default function OrdersScreen() {
  const router = useRouter();
  const { orders, reorder, formatPrice, isDarkMode, uploadPaymentScreenshot, isOrdersLoading, isLoading, user } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // Main Section Toggle: 'MY_ORDERS' (Product purchases) vs 'MY_PARCELS' (Courier shipments)
  const [activeSection, setActiveSection] = useState<'MY_ORDERS' | 'MY_PARCELS'>('MY_ORDERS');

  // Sub-filter tabs
  const [productFilter, setProductFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED'>('ALL');
  const [parcelFilter, setParcelFilter] = useState<'ALL' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');

  // Modals state
  const [selectedParcel, setSelectedParcel] = useState<OrderItem | null>(null);
  const [selectedProductOrder, setSelectedProductOrder] = useState<OrderItem | null>(null);
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

  const handleUploadScreenshotForOrder = async (order: OrderItem) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permission Needed', 'Please allow photo access to upload your payment receipt.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingScreenshot(true);
        const { resubmitPaymentScreenshot } = await import('@/services/firestorePaymentService');
        const paymentRes = await resubmitPaymentScreenshot({
          orderId: order.id,
          userId: order.userId || (user as any)?.uid || (user as any)?.id || 'guest',
          screenshotUri: result.assets[0].uri,
          transferredAmount: (order as any).total_amount || order.totalKRW || order.totalAmount || 0,
          senderName: order.senderName || order.customerName,
        });

        setIsUploadingScreenshot(false);

        if (selectedProductOrder && selectedProductOrder.id === order.id) {
          setSelectedProductOrder({
            ...selectedProductOrder,
            paymentScreenshot: paymentRes.screenshotUrl,
            paymentProofUrl: paymentRes.screenshotUrl,
            payment: {
              screenshotUrl: paymentRes.screenshotUrl,
              uploaded: true,
              verified: false,
              verifiedAt: null,
              verifiedBy: null,
              status: 'under_review' as any,
            },
            status: 'Payment Submitted',
            paymentStatus: 'under_review' as any,
            orderStatus: 'payment_verification',
          });
        }

        Alert.alert(
          'Payment Proof Submitted',
          'Your payment screenshot has been uploaded. Namaste Mart admin will verify the transfer in real time.'
        );
      }
    } catch (e: any) {
      setIsUploadingScreenshot(false);
      Alert.alert('Upload Notice', e.message || 'Could not upload screenshot. Please try again.');
    }
  };

  // Filter Product Orders vs Parcel Shipments (handle both snake_case DB + camelCase)
  const getDestCountry = (o: any) => o.destinationCountry || o.destination_country;
  const getOrderType = (o: any) => o.orderType || (getDestCountry(o) === 'South Korea' ? 'PRODUCT' : 'PARCEL');
  const productOrders = orders.filter((o) => getOrderType(o) === 'PRODUCT' || getDestCountry(o) === 'South Korea');
  const parcelOrders = orders.filter((o) => getOrderType(o) === 'PARCEL' || ['India', 'Nepal'].includes(getDestCountry(o)));

  const isDelivered = (s: string) => s?.toUpperCase() === 'DELIVERED';
  const isActive = (s: string) => ['IN_TRANSIT', 'ORDER_PLACED', 'PICKED_UP'].includes(s?.toUpperCase() || '');

  // Filtered lists based on active sub-tabs
  const filteredProductOrders = productOrders.filter((order) => {
    if (productFilter === 'ACTIVE') return isActive(order.status);
    if (productFilter === 'DELIVERED') return isDelivered(order.status);
    return true;
  });

  const filteredParcelOrders = parcelOrders.filter((parcel) => {
    if (parcelFilter === 'IN_TRANSIT') return isActive(parcel.status);
    if (parcelFilter === 'DELIVERED') return isDelivered(parcel.status);
    return true;
  });

  const handleReorder = (orderId: string) => {
    const success = reorder(orderId);
    if (success) {
      Alert.alert('Items Added to Cart', 'All items from this order have been loaded into your cart.', [
        { text: 'Go to Cart', onPress: () => router.push('/cart') },
        { text: 'Stay Here', style: 'cancel' },
      ]);
    }
  };

  const getStatusBadge = (status: OrderItem['status']) => {
    switch (status) {
      case 'PAID':
      case 'Payment Confirmed':
      case 'payment_verified':
        return {
          label: 'PAID (결제완료) 💳',
          bg: isDarkMode ? '#142E1F' : '#E8F5E9',
          text: isDarkMode ? '#81C784' : '#2E7D32',
        };
      case 'IN_TRANSIT':
      case 'PICKED_UP':
      case 'ORDER_PLACED':
        return {
          label: 'In Transit ✈️',
          bg: isDarkMode ? '#2D271E' : '#FFF3E0',
          text: isDarkMode ? '#FFB74D' : '#E65100',
        };
      case 'DELIVERED':
        return {
          label: 'Delivered ✓',
          bg: isDarkMode ? '#1E2D1E' : '#E8F5E9',
          text: isDarkMode ? '#81C784' : '#2E7D32',
        };
      case 'Payment Pending':
      case 'payment_pending':
      case 'PENDING_VERIFICATION':
      case 'pending_verification':
      case 'pending':
      case 'Payment Submitted':
        return {
          label: 'Payment Pending ⏳',
          bg: isDarkMode ? '#2D2014' : '#FFF8E1',
          text: isDarkMode ? '#FFB74D' : '#F57C00',
        };
      case 'Payment Rejected':
      case 'REJECTED':
      case 'rejected':
        return {
          label: 'Payment Rejected 🔴',
          bg: isDarkMode ? '#3A1A1A' : '#FEE2E2',
          text: isDarkMode ? '#F87171' : '#B91C1C',
        };
      default:
        return {
          label: status,
          bg: isDarkMode ? '#262626' : '#F5F5F5',
          text: isDarkMode ? '#B0B0B0' : '#616161',
        };
    }
  };

  const parcelTimelineSteps = [
    { key: 'CREATED', label: 'Parcel Created', desc: 'Order registered & payment verified' },
    { key: 'PICKED_UP', label: 'Picked Up', desc: 'Package picked up by courier' },
    { key: 'SEOUL_HUB', label: 'Seoul Hub', desc: 'Air sorting & export clearance complete' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Cargo flight in transit to destination' },
    { key: 'ARRIVED', label: 'Arrived at Destination', desc: 'Import customs clearance' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Dispatched with local courier' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Handed over to recipient' },
  ];

  const productOrderSteps = [
    { key: 'placed', label: 'Order Placed', desc: 'Order placed in store' },
    { key: 'submitted', label: 'Payment Submitted', desc: 'Customer submitted transfer proof' },
    { key: 'verification', label: 'Payment Verification', desc: 'Admin verifying bank deposit' },
    { key: 'verified', label: 'Payment Verified', desc: 'Deposit confirmed into bank account' },
    { key: 'confirmed', label: 'Order Confirmed', desc: 'Order approved for warehouse fulfillment' },
    { key: 'processing', label: 'Processing', desc: 'Items being packed at warehouse' },
    { key: 'shipped', label: 'Shipped', desc: 'Dispatched with CJ Logistics' },
    { key: 'delivered', label: 'Delivered', desc: 'Delivered to your Korean address' },
  ];

  const getProductOrderStepStatus = (order: OrderItem, stepIdx: number) => {
    const pStatus = (order.paymentStatus || order.payment?.status || '').toLowerCase();
    const oStatus = (order.orderStatus || order.status || '').toLowerCase();

    if (pStatus === 'rejected') {
      if (stepIdx <= 1) return 'COMPLETED';
      if (stepIdx === 2) return 'REJECTED';
      return 'PENDING';
    }

    let currentIdx = 0;
    if (oStatus === 'delivered' || oStatus.includes('delivered')) currentIdx = 7;
    else if (oStatus === 'shipped' || oStatus.includes('shipped') || oStatus === 'in_transit') currentIdx = 6;
    else if (oStatus === 'processing' || oStatus.includes('preparing')) currentIdx = 5;
    else if (oStatus === 'confirmed' || oStatus.includes('confirmed') || pStatus === 'paid' || pStatus === 'verified' || order.payment?.verified) currentIdx = 4;
    else if (pStatus === 'under_review' || pStatus === 'submitted' || oStatus === 'payment_verification' || order.paymentScreenshot || order.paymentProofUrl) currentIdx = 2;
    else currentIdx = 0;

    if (stepIdx < currentIdx) return 'COMPLETED';
    if (stepIdx === currentIdx) return 'CURRENT';
    return 'PENDING';
  };

  const getStepStatus = (parcel: OrderItem, index: number) => {
    const s = parcel.status?.toUpperCase() || '';
    if (s === 'DELIVERED') return 'COMPLETED';
    if (s === 'IN_TRANSIT') {
      if (index <= 3) return index === 3 ? 'CURRENT' : 'COMPLETED';
      return 'PENDING';
    }
    if (s === 'PICKED_UP') {
      if (index <= 1) return index === 1 ? 'CURRENT' : 'COMPLETED';
      return 'PENDING';
    }
    if (index === 0) return 'CURRENT';
    return 'PENDING';
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Orders</Text>
            <Text style={styles.headerSubtitle}>Manage your orders & shipments</Text>
          </View>

          {activeSection === 'MY_PARCELS' && (
            <TouchableOpacity
              style={styles.sendParcelBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/send-parcel')}
            >
              <Text style={styles.sendParcelBtnText}>+ Send Parcel</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* TOP 2 LARGE SELECTION CARDS */}
          <View style={styles.selectionCardsRow}>
            {/* MY ORDERS CARD */}
            <TouchableOpacity
              style={[
                styles.selectionCard,
                activeSection === 'MY_ORDERS' && styles.selectionCardActive,
              ]}
              activeOpacity={0.88}
              onPress={() => setActiveSection('MY_ORDERS')}
            >
              <View style={styles.selectionIconWrap}>
                <Text style={styles.selectionIcon}>🛍️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectionCardTitle}>My Orders</Text>
                <Text style={styles.selectionCardDesc}>Products you purchased</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{productOrders.length} Orders</Text>
              </View>
            </TouchableOpacity>

            {/* MY PARCELS CARD */}
            <TouchableOpacity
              style={[
                styles.selectionCard,
                activeSection === 'MY_PARCELS' && styles.selectionCardActive,
              ]}
              activeOpacity={0.88}
              onPress={() => setActiveSection('MY_PARCELS')}
            >
              <View style={styles.selectionIconWrap}>
                <Text style={styles.selectionIcon}>📦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectionCardTitle}>My Parcels</Text>
                <Text style={styles.selectionCardDesc}>Parcels you send to home</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{parcelOrders.length} Parcels</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* SECTION 1: MY ORDERS (PRODUCT PURCHASES) */}
          {activeSection === 'MY_ORDERS' && (
            <View>
              {isOrdersLoading ? (
                <ScreenLoader message="Loading your orders..." />
              ) : (
                <>
              {/* FILTER TABS FOR MY ORDERS */}
              <View style={styles.subFilterRow}>
                {(['ALL', 'ACTIVE', 'DELIVERED'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.subTabButton,
                      productFilter === tab && styles.subTabActive,
                    ]}
                    onPress={() => setProductFilter(tab)}
                  >
                    <Text
                      style={[
                        styles.subTabText,
                        productFilter === tab && styles.subTabTextActive,
                      ]}
                    >
                      {tab === 'ALL' ? 'All Orders' : tab === 'ACTIVE' ? 'Active' : 'Delivered'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* LIST OF PRODUCT ORDERS */}
              {filteredProductOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>🛍️</Text>
                  <Text style={styles.emptyTitle}>No Product Orders Found</Text>
                  <Text style={styles.emptySubtitle}>
                    You have not placed any grocery or shop product orders in this category yet.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.push('/')}
                  >
                    <Text style={styles.emptyButtonText}>Explore Products</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredProductOrders.map((order) => {
                  const isRejectedPs = String((order as any).paymentStatus || (order as any).payment_status || (order as any).payment?.status || '').toLowerCase() === 'rejected';
                  const statusBadge = isRejectedPs ? getStatusBadge('Payment Rejected' as any) : getStatusBadge(order.status);

                  return (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderNumberText}>{order.orderNumber}</Text>
                          <Text style={styles.orderDateText}>{order.date}</Text>
                          {(() => {
                            const pBadge = getPaymentStatusBadge(order.payment, order.paymentMethod, (order as any).paymentStatus || (order as any).payment_status);
                            return (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <View
                                  style={{
                                    backgroundColor: `${pBadge.color}15`,
                                    borderWidth: 1,
                                    borderColor: pBadge.color,
                                    borderRadius: 6,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Text style={{ fontSize: 9, fontWeight: '800', color: pBadge.color }}>
                                    {pBadge.emoji} {pBadge.label}
                                  </Text>
                                </View>
                              </View>
                            );
                          })()}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                            {statusBadge.label}
                          </Text>
                        </View>
                      </View>

                      {/* PRODUCTS THUMBNAIL SUMMARY */}
                      <View style={styles.productsRow}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {order.items.map((item: any, idx: number) => {
                            const imgUri = item.product?.image || item.imageUrl || item.image || '';
                            const isSupabase = imgUri.includes('supabase.co/storage');
                            return (
                              <View key={idx} style={styles.productThumbWrap}>
                                {imgUri && isSupabase ? (
                                  <Image source={{ uri: imgUri }} style={styles.productThumb} />
                                ) : (
                                  <View style={[styles.productThumb, { backgroundColor: '#F0ECE1' }]} />
                                )}
                                <Text style={styles.productQtyBadge}>x{item.quantity}</Text>
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* TOTAL PRICE & ACTIONS */}
                      <View style={styles.orderCardFooter}>
                        <View>
                          <Text style={styles.totalPriceLabel}>Total Amount</Text>
                          <Text style={styles.totalPriceVal}>
                            {formatPrice((order as any).total_amount || order.totalKRW || 0)}
                          </Text>
                        </View>

                        <View style={styles.actionBtnGroup}>
                          {(order.paymentStatus === 'REJECTED' || order.payment?.status === 'rejected' || (!order.paymentProofUrl && !order.paymentScreenshot && order.paymentMethod?.includes('BANK_TRANSFER'))) && (
                            <TouchableOpacity
                              style={[
                                styles.reorderBtn,
                                { backgroundColor: (order.paymentStatus === 'REJECTED' || order.payment?.status === 'rejected') ? '#EF4444' : '#F59E0B' },
                              ]}
                              onPress={() => handleUploadScreenshotForOrder(order)}
                              disabled={isUploadingScreenshot}
                            >
                              <Text style={[styles.reorderBtnText, { color: '#FFF' }]}>
                                {isUploadingScreenshot ? '...' : (order.paymentStatus === 'REJECTED' || order.payment?.status === 'rejected') ? '📷 Re-upload' : '📷 Proof'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={styles.reorderBtn}
                            onPress={() => handleReorder(order.id)}
                          >
                            <Text style={styles.reorderBtnText}>Reorder 🛒</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.detailsBtn}
                            onPress={() => setSelectedProductOrder(order)}
                          >
                            <Text style={styles.detailsBtnText}>View Details →</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
                </>
              )}
            </View>
          )}

          {/* SECTION 2: MY PARCELS (COURIER SHIPMENTS TO HOME) */}
          {activeSection === 'MY_PARCELS' && (
            <View>
              {/* FILTER TABS FOR MY PARCELS */}
              <View style={styles.subFilterRow}>
                {(['ALL', 'IN_TRANSIT', 'DELIVERED'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.subTabButton,
                      parcelFilter === tab && styles.subTabActive,
                    ]}
                    onPress={() => setParcelFilter(tab)}
                  >
                    <Text
                      style={[
                        styles.subTabText,
                        parcelFilter === tab && styles.subTabTextActive,
                      ]}
                    >
                      {tab === 'ALL' ? 'All Parcels' : tab === 'IN_TRANSIT' ? 'In Transit' : 'Delivered'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* LIST OF PARCELS */}
              {filteredParcelOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>📦</Text>
                  <Text style={styles.emptyTitle}>No Parcels Found</Text>
                  <Text style={styles.emptySubtitle}>
                    You have not sent any international parcels yet.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.push('/send-parcel')}
                  >
                    <Text style={styles.emptyButtonText}>Send a Parcel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredParcelOrders.map((parcel) => {
                  const statusBadge = getStatusBadge(parcel.status);
                  const isIndia = parcel.destinationCountry === 'India';
                  const destFlag = isIndia ? '🇮🇳' : '🇳🇵';
                  const destCity = parcel.destinationCity || (isIndia ? 'New Delhi' : 'Kathmandu');

                  return (
                    <View key={parcel.id} style={styles.parcelCard}>
                      {/* CARD TOP ROW */}
                      <View style={styles.parcelCardHeader}>
                        <View>
                          <Text style={styles.parcelNumber}>{parcel.orderNumber}</Text>
                          <Text style={styles.routeText}>
                            🇰🇷 Seoul → {destFlag} {destCity}
                          </Text>
                        </View>

                        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                            {statusBadge.label}
                          </Text>
                        </View>
                      </View>

                      {/* PARCEL METRICS ROW */}
                      <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>Weight & Items</Text>
                          <Text style={styles.metricValue}>
                            {parcel.totalWeightKg || 8.0} kg · {parcel.items.length} items
                          </Text>
                        </View>

                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>Shipping Method</Text>
                          <Text style={styles.metricValue}>
                            {parcel.shippingMethod === 'Express' ? 'Express Air' : 'Standard Air'}
                          </Text>
                        </View>

                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>
                            {parcel.status === 'DELIVERED' ? 'Delivered Date' : 'ETA'}
                          </Text>
                          <Text style={styles.metricValueHighlight}>
                            {parcel.status === 'DELIVERED'
                              ? `Delivered: ${parcel.estimatedDelivery || parcel.date}`
                              : `ETA: ${parcel.estimatedDelivery || 'Aug 19, 2026'}`}
                          </Text>
                        </View>
                      </View>

                      {/* ACTION BUTTON */}
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.trackButton}
                          activeOpacity={0.85}
                          onPress={() => setSelectedParcel(parcel)}
                        >
                          <Text style={styles.trackBtnText}>
                            {parcel.status === 'DELIVERED' ? 'View Details →' : 'Track Parcel →'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>

        {/* PARCEL DETAILS / TRACKING MODAL */}
        <Modal
          visible={!!selectedParcel}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedParcel(null)}
        >
          {selectedParcel && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                {/* MODAL HEADER */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Parcel {selectedParcel.orderNumber}</Text>
                    <Text style={styles.modalSubtitle}>Tracking Number: {selectedParcel.trackingNumber || 'AWB987654321'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelectedParcel(null)}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 18 }}>
                  {/* PARCEL SUMMARY GRID */}
                  <View style={styles.summaryGrid}>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>Origin</Text>
                      <Text style={styles.gridVal}>🇰🇷 {selectedParcel.originHub || 'Seoul Hub'}</Text>
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>Destination</Text>
                      <Text style={styles.gridVal}>
                        {selectedParcel.destinationCountry === 'India' ? '🇮🇳' : '🇳🇵'}{' '}
                        {selectedParcel.destinationCity}
                      </Text>
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>Recipient</Text>
                      <Text style={styles.gridVal}>{selectedParcel.recipient.name}</Text>
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>Shipping Method</Text>
                      <Text style={styles.gridVal}>
                        {selectedParcel.shippingMethod === 'Express' ? 'Express Air' : 'Standard Air'}
                      </Text>
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>Weight & Items</Text>
                      <Text style={styles.gridVal}>
                        {selectedParcel.totalWeightKg || 8.0} kg · {selectedParcel.items.length} items
                      </Text>
                    </View>
                    <View style={styles.gridCell}>
                      <Text style={styles.gridLabel}>ETA / Delivery</Text>
                      <Text style={[styles.gridVal, { color: '#C88D2B', fontWeight: '800' }]}>
                        {selectedParcel.estimatedDelivery || 'Aug 19, 2026'}
                      </Text>
                    </View>
                  </View>

                  {/* SHIPMENT TIMELINE */}
                  <Text style={styles.timelineTitle}>Shipment Progress Timeline</Text>
                  <View style={styles.timelineContainer}>
                    {parcelTimelineSteps.map((step, idx) => {
                      const status = getStepStatus(selectedParcel, idx);
                      const isCompleted = status === 'COMPLETED';
                      const isCurrent = status === 'CURRENT';

                      return (
                        <View key={step.key} style={styles.timelineRow}>
                          <View style={styles.nodeColumn}>
                            <View
                              style={[
                                styles.nodeCircle,
                                isCompleted && styles.nodeCompleted,
                                isCurrent && styles.nodeCurrent,
                              ]}
                            >
                              <Text style={styles.nodeIcon}>
                                {isCompleted ? '✓' : isCurrent ? '●' : '○'}
                              </Text>
                            </View>
                            {idx < parcelTimelineSteps.length - 1 && (
                              <View
                                style={[
                                  styles.timelineLine,
                                  isCompleted && styles.timelineLineCompleted,
                                ]}
                              />
                            )}
                          </View>

                          <View style={styles.stepInfo}>
                            <Text
                              style={[
                                styles.stepTitle,
                                (isCompleted || isCurrent) && styles.stepTitleActive,
                              ]}
                            >
                              {step.label}
                            </Text>
                            <Text style={styles.stepDesc}>{step.desc}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          )}
        </Modal>

        {/* PRODUCT ORDER DETAILS MODAL */}
        <Modal
          visible={!!selectedProductOrder}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedProductOrder(null)}
        >
          {selectedProductOrder && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Order {selectedProductOrder.orderNumber}</Text>
                    <Text style={styles.modalSubtitle}>Placed on {selectedProductOrder.date}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelectedProductOrder(null)}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 18 }}>
                  {/* DELIVERY ADDRESS DETAILS */}
                  <View
                    style={{
                      marginBottom: 14,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: isDarkMode ? '#262626' : '#F8F7F3',
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#333' : '#EFEBE4',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '900',
                        color: isDarkMode ? '#FFF' : '#212121',
                        marginBottom: 4,
                      }}
                    >
                      📍 Korean Delivery Address
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#EEE' : '#333' }}>
                      {selectedProductOrder.deliveryAddress?.recipientName ||
                        selectedProductOrder.recipient?.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: isDarkMode ? '#A0A0A0' : '#666', marginTop: 2 }}>
                      📞{' '}
                      {selectedProductOrder.deliveryAddress?.phoneNumber ||
                        selectedProductOrder.recipient?.phone}
                    </Text>
                    <Text style={{ fontSize: 10, color: isDarkMode ? '#A0A0A0' : '#666', marginTop: 2 }}>
                      {selectedProductOrder.deliveryAddress?.address ||
                        selectedProductOrder.recipient?.address}
                      {selectedProductOrder.deliveryAddress?.detailAddress
                        ? `, ${selectedProductOrder.deliveryAddress.detailAddress}`
                        : ''}
                      {selectedProductOrder.deliveryAddress?.postalCode
                        ? ` (${selectedProductOrder.deliveryAddress.postalCode})`
                        : ''}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '700', marginTop: 2 }}>
                      🇰🇷 South Korea (대한민국)
                    </Text>
                  </View>

                  {/* PURCHASED PRODUCTS */}
                  <Text style={styles.timelineTitle}>Purchased Products</Text>
                  {selectedProductOrder.items.map((item: any, idx: number) => {
                    const p = item.product || item;
                    const imgUri = p.image || p.imageUrl || item.imageUrl || item.image || '';
                    const isSupabase = imgUri.includes('supabase.co/storage');
                    const price = p.priceKRW ?? item.price ?? item.finalPrice ?? 0;
                    return (
                      <View key={idx} style={styles.modalItemRow}>
                        {isSupabase && imgUri ? (
                          <Image source={{ uri: imgUri }} style={styles.modalItemImg} />
                        ) : (
                          <View style={[styles.modalItemImg, { backgroundColor: '#F0ECE1' }]} />
                        )}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.modalItemTitle}>{p.name || item.name}</Text>
                          <Text style={styles.modalItemSub}>
                            Quantity: {item.quantity} · {formatPrice(price)} each
                          </Text>
                        </View>
                        <Text style={styles.modalItemPrice}>{formatPrice(price * item.quantity)}</Text>
                      </View>
                    );
                  })}

                  <View style={styles.modalTotalRow}>
                    <Text style={styles.modalTotalLabel}>Total Amount</Text>
                    <Text style={styles.modalTotalVal}>
                      {formatPrice((selectedProductOrder as any).total_amount || selectedProductOrder.totalKRW)}
                    </Text>
                  </View>

                  {/* BANK TRANSFER & SCREENSHOT DETAILS */}
                  {(() => {
                    const pBadge = getPaymentStatusBadge(selectedProductOrder.payment, (selectedProductOrder as any).paymentMethod || (selectedProductOrder as any).payment_method, (selectedProductOrder as any).paymentStatus || (selectedProductOrder as any).payment_status);
                    return (
                      <View
                        style={{
                          marginTop: 14,
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: isDarkMode ? '#262626' : '#F8F7F3',
                          borderWidth: 1,
                          borderColor: isDarkMode ? '#333' : '#EFEBE4',
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '900',
                              color: isDarkMode ? '#FFF' : '#212121',
                            }}
                          >
                            💳 Bank Transfer & Verification
                          </Text>
                          <View
                            style={{
                              backgroundColor: `${pBadge.color}15`,
                              borderWidth: 1,
                              borderColor: pBadge.color,
                              borderRadius: 6,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                            }}
                          >
                            <Text style={{ fontSize: 9, fontWeight: '800', color: pBadge.color }}>
                              {pBadge.emoji} {pBadge.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: isDarkMode ? '#A0A0A0' : '#706D65' }}>
                          Method: {(selectedProductOrder as any).payment_method || selectedProductOrder.paymentMethod || selectedProductOrder.payment?.paymentType || 'Bank Transfer'}
                        </Text>
                        {selectedProductOrder.bankAccount && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: isDarkMode ? '#A0A0A0' : '#706D65',
                              marginTop: 2,
                            }}
                          >
                            Bank: {selectedProductOrder.bankAccount.bankName} • Account:{' '}
                            {selectedProductOrder.bankAccount.accountNumber} (
                            {selectedProductOrder.bankAccount.accountHolder})
                          </Text>
                        )}

                        {/* REJECTION REASON NOTIFICATION */}
                        {(selectedProductOrder.paymentStatus === 'REJECTED' || selectedProductOrder.payment?.status === 'rejected') && (
                          <View
                            style={{
                              marginTop: 8,
                              padding: 10,
                              backgroundColor: '#FEE2E2',
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#F87171',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#B91C1C' }}>
                              ❌ Payment Proof Rejected (입금 반려)
                            </Text>
                            <Text style={{ fontSize: 11, color: '#991B1B', marginTop: 3, fontWeight: '600' }}>
                              Reason:{' '}
                              {selectedProductOrder.paymentRejectionReason ||
                                selectedProductOrder.payment?.rejectionReason ||
                                'Receipt was unclear or deposit was not found in bank records.'}
                            </Text>
                            <Text style={{ fontSize: 10, color: '#7F1D1D', marginTop: 2, fontStyle: 'italic' }}>
                              Please attach a clear screenshot of your bank transfer receipt below to continue processing.
                            </Text>
                          </View>
                        )}

                        {/* SCREENSHOT — show if exists; upload-new only on REJECTED */}
                        {selectedProductOrder.payment?.screenshotUrl || selectedProductOrder.paymentScreenshot ? (
                          <View style={{ marginTop: 10 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981', marginBottom: 6 }}>✓ Payment Screenshot Attached</Text>
                            <TouchableOpacity
                              onPress={() => setPreviewScreenshotUrl(selectedProductOrder.payment?.screenshotUrl || selectedProductOrder.paymentScreenshot || null)}
                              activeOpacity={0.85}
                              style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                              <Image source={{ uri: selectedProductOrder.payment?.screenshotUrl || selectedProductOrder.paymentScreenshot }} style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: isDarkMode ? '#444' : '#DDD' }} />
                              <View style={{ marginLeft: 12 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#D4AF37' : '#C88D2B' }}>🔍 Tap to expand preview</Text>
                                <Text style={{ fontSize: 9, color: isDarkMode ? '#888' : '#777', marginTop: 2 }}>Storage URL linked securely</Text>
                              </View>
                            </TouchableOpacity>
                            {(selectedProductOrder.paymentStatus === 'REJECTED' || selectedProductOrder.payment?.status === 'rejected') && (
                              <TouchableOpacity style={{ marginTop: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#DC2626', borderRadius: 8, alignItems: 'center' }} onPress={() => handleUploadScreenshotForOrder(selectedProductOrder)} disabled={isUploadingScreenshot}>
                                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>{isUploadingScreenshot ? 'Uploading New Proof...' : '📷 Upload New Payment Proof (새 영수증 업로드)'}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : (selectedProductOrder.paymentStatus === 'REJECTED' || selectedProductOrder.payment?.status === 'rejected') ? (
                          <View style={{ marginTop: 10 }}>
                            <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '700', marginBottom: 6 }}>❌ No proof after rejection — please upload new</Text>
                            <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#DC2626', borderRadius: 8, alignItems: 'center' }} onPress={() => handleUploadScreenshotForOrder(selectedProductOrder)} disabled={isUploadingScreenshot}>
                              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>{isUploadingScreenshot ? 'Uploading...' : '📷 Upload New Payment Proof'}</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                        {false && selectedProductOrder.paymentScreenshot ? (
                          <View style={{ marginTop: 10 }}>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '800',
                                color: '#10B981',
                                marginBottom: 6,
                              }}
                            >
                              ✓ Payment Screenshot Attached
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setPreviewScreenshotUrl(
                                  selectedProductOrder.paymentScreenshot || null
                                )
                              }
                              activeOpacity={0.85}
                              style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                              <Image
                                source={{ uri: selectedProductOrder.paymentScreenshot }}
                                style={{
                                  width: 80,
                                  height: 80,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: isDarkMode ? '#444' : '#DDD',
                                }}
                              />
                              <View style={{ marginLeft: 12 }}>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: isDarkMode ? '#D4AF37' : '#C88D2B',
                                  }}
                                >
                                  🔍 Tap to expand preview
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: isDarkMode ? '#888' : '#777',
                                    marginTop: 2,
                                  }}
                                >
                                  Storage URL linked securely
                                </Text>
                              </View>
                            </TouchableOpacity>

                            {/* Option to re-upload if rejected */}
                            {(selectedProductOrder.paymentStatus === 'REJECTED' || selectedProductOrder.payment?.status === 'rejected') && (
                              <TouchableOpacity
                                style={{
                                  marginTop: 10,
                                  paddingVertical: 10,
                                  paddingHorizontal: 14,
                                  backgroundColor: '#DC2626',
                                  borderRadius: 8,
                                  alignItems: 'center',
                                }}
                                onPress={() =>
                                  handleUploadScreenshotForOrder(selectedProductOrder)
                                }
                                disabled={isUploadingScreenshot}
                              >
                                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '900' }}>
                                  {isUploadingScreenshot ? 'Uploading New Proof...' : '📷 Upload New Payment Proof (새 영수증 업로드)'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : null}
                      </View>
                    );
                  })()}

                  {/* ORDER & PAYMENT LIFECYCLE TIMELINE */}
                  <Text style={[styles.timelineTitle, { marginTop: 16 }]}>Order & Payment Progress</Text>
                  <View style={styles.timelineContainer}>
                    {productOrderSteps.map((step, idx) => {
                      const status = getProductOrderStepStatus(selectedProductOrder, idx);
                      const isCompleted = status === 'COMPLETED';
                      const isCurrent = status === 'CURRENT';
                      const isRejected = status === 'REJECTED';

                      return (
                        <View key={step.key} style={styles.timelineRow}>
                          <View style={styles.nodeColumn}>
                            <View
                              style={[
                                styles.nodeCircle,
                                isCompleted && styles.nodeCompleted,
                                isCurrent && styles.nodeCurrent,
                                isRejected && { backgroundColor: '#EF4444', borderColor: '#DC2626' },
                              ]}
                            >
                              <Text style={styles.nodeIcon}>
                                {isRejected ? '✕' : isCompleted ? '✓' : isCurrent ? '●' : '○'}
                              </Text>
                            </View>
                            {idx < productOrderSteps.length - 1 && (
                              <View
                                style={[
                                  styles.timelineLine,
                                  isCompleted && styles.timelineLineCompleted,
                                  isRejected && { backgroundColor: '#EF4444' },
                                ]}
                              />
                            )}
                          </View>

                          <View style={styles.stepInfo}>
                            <Text
                              style={[
                                styles.stepTitle,
                                (isCompleted || isCurrent) && styles.stepTitleActive,
                                isRejected && { color: '#EF4444', fontWeight: '900' },
                              ]}
                            >
                              {step.label}
                            </Text>
                            <Text style={styles.stepDesc}>
                              {isRejected && (selectedProductOrder.paymentRejectionReason || (selectedProductOrder as any).payment?.rejectionReason)
                                ? `Rejected: ${selectedProductOrder.paymentRejectionReason || (selectedProductOrder as any).payment?.rejectionReason}`
                                : step.desc}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          )}
        </Modal>

        {/* FULL SCREENSHOT PREVIEW MODAL */}
        <Modal
          visible={!!previewScreenshotUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewScreenshotUrl(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
              onPress={() => setPreviewScreenshotUrl(null)}
            >
              <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
            {previewScreenshotUrl && (
              <Image
                source={{ uri: previewScreenshotUrl }}
                style={{ width: '90%', height: '80%' }}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

        <BottomNav currentTab="orders" />
      </SafeAreaView>
    </>
  );
}

function getStyles(isDarkMode: boolean) {
  const bg = isDarkMode ? '#121212' : '#F8F7F3';
  const cardBg = isDarkMode ? '#1E1E1E' : '#FFFFFF';
  const text = isDarkMode ? '#FFFFFF' : '#1A1A1A';
  const subText = isDarkMode ? '#A0A0A0' : '#666666';
  const border = isDarkMode ? '#2C2C2C' : '#EAE6DF';
  const accent = isDarkMode ? '#D4AF37' : '#C88D2B';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: cardBg,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDarkMode ? '#2A2A2A' : '#F0ECE1',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backArrow: {
      fontSize: 18,
      fontWeight: '700',
      color: text,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '900',
      color: text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: subText,
      marginTop: 2,
    },
    sendParcelBtn: {
      backgroundColor: accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    sendParcelBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 90,
    },
    selectionCardsRow: {
      flexDirection: 'column',
      gap: 12,
      marginBottom: 20,
    },
    selectionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    selectionCardActive: {
      borderColor: accent,
      backgroundColor: isDarkMode ? '#282218' : '#FFF9EE',
    },
    selectionIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDarkMode ? '#2C2A24' : '#FAF4E8',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    selectionIcon: {
      fontSize: 22,
    },
    selectionCardTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: text,
    },
    selectionCardDesc: {
      fontSize: 12,
      color: subText,
      marginTop: 2,
    },
    countBadge: {
      backgroundColor: isDarkMode ? '#383020' : '#F4ECE0',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    countBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: accent,
    },
    subFilterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    subTabButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: cardBg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    subTabActive: {
      backgroundColor: accent,
      borderColor: accent,
    },
    subTabText: {
      fontSize: 12,
      fontWeight: '700',
      color: subText,
    },
    subTabTextActive: {
      color: '#FFFFFF',
    },
    emptyCard: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 30,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    emptyEmoji: {
      fontSize: 44,
      marginBottom: 10,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: text,
    },
    emptySubtitle: {
      fontSize: 12,
      color: subText,
      textAlign: 'center',
      marginTop: 4,
      paddingHorizontal: 20,
    },
    emptyButton: {
      marginTop: 16,
      backgroundColor: accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    emptyButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    orderCard: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: border,
    },
    orderCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    orderNumberText: {
      fontSize: 15,
      fontWeight: '900',
      color: text,
    },
    orderDateText: {
      fontSize: 11,
      color: subText,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    productsRow: {
      marginVertical: 10,
    },
    productThumbWrap: {
      marginRight: 10,
      position: 'relative',
    },
    productThumb: {
      width: 50,
      height: 50,
      borderRadius: 8,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
    },
    productQtyBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: accent,
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '800',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 6,
    },
    orderCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: border,
    },
    totalPriceLabel: {
      fontSize: 10,
      color: subText,
      textTransform: 'uppercase',
      fontWeight: '600',
    },
    totalPriceVal: {
      fontSize: 15,
      fontWeight: '900',
      color: accent,
      marginTop: 2,
    },
    actionBtnGroup: {
      flexDirection: 'row',
      gap: 8,
    },
    reorderBtn: {
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F0ECE1',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    reorderBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: text,
    },
    detailsBtn: {
      backgroundColor: accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    detailsBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    parcelCard: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    parcelCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    parcelNumber: {
      fontSize: 16,
      fontWeight: '900',
      color: text,
    },
    routeText: {
      fontSize: 13,
      fontWeight: '700',
      color: accent,
      marginTop: 4,
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    metricItem: {
      flex: 1,
    },
    metricLabel: {
      fontSize: 10,
      color: subText,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    metricValue: {
      fontSize: 12,
      fontWeight: '700',
      color: text,
      marginTop: 4,
    },
    metricValueHighlight: {
      fontSize: 11,
      fontWeight: '800',
      color: accent,
      marginTop: 4,
    },
    actionRow: {
      alignItems: 'flex-end',
      paddingTop: 8,
    },
    trackButton: {
      backgroundColor: isDarkMode ? '#2D271E' : '#FFF9EE',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: accent,
    },
    trackBtnText: {
      color: accent,
      fontSize: 12,
      fontWeight: '800',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: text,
    },
    modalSubtitle: {
      fontSize: 12,
      color: subText,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F0ECE1',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeBtnText: {
      fontSize: 14,
      color: text,
      fontWeight: '800',
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: isDarkMode ? '#181818' : '#FAF8F4',
      borderRadius: 14,
      padding: 12,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: border,
    },
    gridCell: {
      width: '50%',
      marginBottom: 10,
    },
    gridLabel: {
      fontSize: 10,
      color: subText,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    gridVal: {
      fontSize: 12,
      fontWeight: '700',
      color: text,
      marginTop: 2,
    },
    timelineTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: text,
      marginBottom: 14,
    },
    timelineContainer: {
      paddingLeft: 6,
    },
    timelineRow: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    nodeColumn: {
      alignItems: 'center',
      marginRight: 14,
    },
    nodeCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#E0E0E0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    nodeCompleted: {
      backgroundColor: '#2E7D32',
    },
    nodeCurrent: {
      backgroundColor: accent,
    },
    nodeIcon: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: border,
      marginTop: 4,
    },
    timelineLineCompleted: {
      backgroundColor: '#2E7D32',
    },
    stepInfo: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: subText,
    },
    stepTitleActive: {
      color: text,
      fontWeight: '900',
    },
    stepDesc: {
      fontSize: 11,
      color: subText,
      marginTop: 2,
    },
    modalItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    modalItemImg: {
      width: 44,
      height: 44,
      borderRadius: 8,
    },
    modalItemTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: text,
    },
    modalItemSub: {
      fontSize: 11,
      color: subText,
      marginTop: 2,
    },
    modalItemPrice: {
      fontSize: 13,
      fontWeight: '800',
      color: accent,
    },
    modalTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: border,
    },
    modalTotalLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: text,
    },
    modalTotalVal: {
      fontSize: 18,
      fontWeight: '900',
      color: accent,
    },
  });
}
