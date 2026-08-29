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
import { OrderItem } from '@/types';

export default function OrdersScreen() {
  const router = useRouter();
  const { orders, reorder, formatPrice, isDarkMode, uploadPaymentScreenshot } = useApp();

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
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingScreenshot(true);
        const uploadedUrl = await uploadPaymentScreenshot(order.id, result.assets[0].uri);
        setIsUploadingScreenshot(false);

        if (selectedProductOrder && selectedProductOrder.id === order.id) {
          setSelectedProductOrder({
            ...selectedProductOrder,
            paymentScreenshot: uploadedUrl,
            payment: {
              screenshotUrl: uploadedUrl,
              uploaded: true,
              verified: false,
              verifiedAt: null,
              verifiedBy: null,
              status: 'uploaded',
            },
            status: 'payment_uploaded',
          });
        }

        Alert.alert('Receipt Uploaded', 'Your payment proof has been uploaded successfully. Namaste Mart admin will verify it shortly.');
      }
    } catch (e: any) {
      setIsUploadingScreenshot(false);
      Alert.alert('Upload Notice', e.message || 'Could not upload screenshot. Please try again.');
    }
  };

  // Filter Product Orders vs Parcel Shipments
  const productOrders = orders.filter(
    (o) => o.orderType === 'PRODUCT' || o.destinationCountry === 'South Korea'
  );
  const parcelOrders = orders.filter(
    (o) =>
      o.orderType === 'PARCEL' ||
      o.destinationCountry === 'India' ||
      o.destinationCountry === 'Nepal'
  );

  // Filtered lists based on active sub-tabs
  const filteredProductOrders = productOrders.filter((order) => {
    if (productFilter === 'ACTIVE') {
      return order.status === 'IN_TRANSIT' || order.status === 'ORDER_PLACED' || order.status === 'PICKED_UP';
    }
    if (productFilter === 'DELIVERED') {
      return order.status === 'DELIVERED';
    }
    return true;
  });

  const filteredParcelOrders = parcelOrders.filter((parcel) => {
    if (parcelFilter === 'IN_TRANSIT') {
      return parcel.status === 'IN_TRANSIT' || parcel.status === 'ORDER_PLACED' || parcel.status === 'PICKED_UP';
    }
    if (parcelFilter === 'DELIVERED') {
      return parcel.status === 'DELIVERED';
    }
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

  const getStepStatus = (parcel: OrderItem, index: number) => {
    if (parcel.status === 'DELIVERED') return 'COMPLETED';
    if (parcel.status === 'IN_TRANSIT') {
      if (index <= 3) return index === 3 ? 'CURRENT' : 'COMPLETED';
      return 'PENDING';
    }
    if (parcel.status === 'PICKED_UP') {
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
                    You haven't placed any grocery or shop product orders in this category yet.
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
                  const statusBadge = getStatusBadge(order.status);

                  return (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderNumberText}>{order.orderNumber}</Text>
                          <Text style={styles.orderDateText}>{order.date}</Text>
                          {(() => {
                            const pBadge = getPaymentStatusBadge(order.payment);
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
                          {order.items.map((item, idx) => (
                            <View key={idx} style={styles.productThumbWrap}>
                              <Image
                                source={{ uri: item.product.image }}
                                style={styles.productThumb}
                              />
                              <Text style={styles.productQtyBadge}>x{item.quantity}</Text>
                            </View>
                          ))}
                        </ScrollView>
                      </View>

                      {/* TOTAL PRICE & ACTIONS */}
                      <View style={styles.orderCardFooter}>
                        <View>
                          <Text style={styles.totalPriceLabel}>Total Amount</Text>
                          <Text style={styles.totalPriceVal}>
                            {formatPrice(order.totalKRW)}
                          </Text>
                        </View>

                        <View style={styles.actionBtnGroup}>
                          {(!order.payment?.uploaded || order.payment?.status === 'rejected') && (
                            <TouchableOpacity
                              style={[
                                styles.reorderBtn,
                                { backgroundColor: order.payment?.status === 'rejected' ? '#EF4444' : '#F59E0B' },
                              ]}
                              onPress={() => handleUploadScreenshotForOrder(order)}
                              disabled={isUploadingScreenshot}
                            >
                              <Text style={[styles.reorderBtnText, { color: '#FFF' }]}>
                                {isUploadingScreenshot ? '...' : '📷 Proof'}
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
                  {selectedProductOrder.items.map((item, idx) => (
                    <View key={idx} style={styles.modalItemRow}>
                      <Image source={{ uri: item.product.image }} style={styles.modalItemImg} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.modalItemTitle}>{item.product.name}</Text>
                        <Text style={styles.modalItemSub}>
                          Quantity: {item.quantity} · {formatPrice(item.product.priceKRW)} each
                        </Text>
                      </View>
                      <Text style={styles.modalItemPrice}>
                        {formatPrice(item.product.priceKRW * item.quantity)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.modalTotalRow}>
                    <Text style={styles.modalTotalLabel}>Total Amount</Text>
                    <Text style={styles.modalTotalVal}>
                      {formatPrice(selectedProductOrder.totalKRW)}
                    </Text>
                  </View>

                  {/* BANK TRANSFER & SCREENSHOT DETAILS */}
                  {(() => {
                    const pBadge = getPaymentStatusBadge(selectedProductOrder.payment);
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
                          Method: {selectedProductOrder.paymentMethod}
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
                        {selectedProductOrder.payment?.status === 'rejected' && (
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
                              ❌ Payment Receipt Rejected
                            </Text>
                            <Text style={{ fontSize: 10, color: '#991B1B', marginTop: 2 }}>
                              Reason:{' '}
                              {selectedProductOrder.payment?.rejectionReason ||
                                'Receipt was unclear or transfer could not be matched.'}
                            </Text>
                          </View>
                        )}

                        {/* SCREENSHOT DISPLAY OR UPLOAD BUTTON */}
                        {selectedProductOrder.paymentScreenshot ? (
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
                            {selectedProductOrder.payment?.status === 'rejected' && (
                              <TouchableOpacity
                                style={{
                                  marginTop: 10,
                                  paddingVertical: 8,
                                  paddingHorizontal: 12,
                                  backgroundColor: '#EA580C',
                                  borderRadius: 8,
                                  alignItems: 'center',
                                }}
                                onPress={() =>
                                  handleUploadScreenshotForOrder(selectedProductOrder)
                                }
                                disabled={isUploadingScreenshot}
                              >
                                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                                  {isUploadingScreenshot ? 'Uploading...' : '📷 Upload New Receipt'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : (
                          <View style={{ marginTop: 10 }}>
                            <Text
                              style={{
                                fontSize: 10,
                                color: '#F59E0B',
                                fontWeight: '700',
                                marginBottom: 6,
                              }}
                            >
                              ⚠️ No Payment Screenshot Uploaded Yet
                            </Text>
                            <TouchableOpacity
                              style={{
                                paddingVertical: 10,
                                paddingHorizontal: 14,
                                backgroundColor: isDarkMode ? '#D4AF37' : '#C88D2B',
                                borderRadius: 8,
                                alignItems: 'center',
                              }}
                              onPress={() =>
                                handleUploadScreenshotForOrder(selectedProductOrder)
                              }
                              disabled={isUploadingScreenshot}
                            >
                              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                                {isUploadingScreenshot
                                  ? 'Uploading...'
                                  : '📷 Upload Payment Screenshot Now'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })()}
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
