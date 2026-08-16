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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { OrderItem } from '@/types';

export default function OrdersScreen() {
  const router = useRouter();
  const { orders, reorder, formatPrice, t } = useApp();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED'>('ALL');
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<OrderItem | null>(null);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderItem | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'ACTIVE') {
      return order.status === 'IN_TRANSIT' || order.status === 'ORDER_PLACED' || order.status === 'PICKED_UP';
    }
    if (activeFilter === 'DELIVERED') {
      return order.status === 'DELIVERED';
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
        return { label: 'IN TRANSIT ✈️', bg: '#FFF3E0', text: '#E65100' };
      case 'ORDER_PLACED':
        return { label: 'ORDER PLACED 📦', bg: '#E3F2FD', text: '#1565C0' };
      case 'DELIVERED':
        return { label: 'DELIVERED ✓', bg: '#E8F5E9', text: '#2E7D32' };
      case 'CANCELLED':
        return { label: 'CANCELLED', bg: '#FFEBEE', text: '#C62828' };
      default:
        return { label: status, bg: '#F5F5F5', text: '#616161' };
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F7F3" />
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
            <Text style={styles.headerTitle}>{t('ordersTitle')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('ordersSubtitle')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newShipmentBtn}
            onPress={() => router.push('/cart')}
          >
            <Text style={styles.newShipmentText}>+ Ship</Text>
          </TouchableOpacity>
        </View>

        {/* FILTER TABS */}
        <View style={styles.filterTabsRow}>
          {[
            { id: 'ALL', label: `${t('filterAll')} (${orders.length})` },
            {
              id: 'ACTIVE',
              label: `${t('filterActive')} (${
                orders.filter(
                  (o) =>
                    o.status === 'IN_TRANSIT' ||
                    o.status === 'ORDER_PLACED' ||
                    o.status === 'PICKED_UP'
                ).length
              })`,
            },
            {
              id: 'DELIVERED',
              label: `${t('filterDelivered')} (${
                orders.filter((o) => o.status === 'DELIVERED').length
              })`,
            },
          ].map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterTab, isSelected && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab.id as any)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isSelected && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No orders in this category</Text>
              <Text style={styles.emptySubtitle}>
                You do not have any shipments matching this filter.
              </Text>
              <TouchableOpacity
                style={styles.sendParcelBtn}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.sendParcelBtnText}>CREATE SHIPMENT →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const statusBadge = getStatusBadge(order.status);
              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* CARD HEADER */}
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                      <Text style={styles.orderDate}>Placed on {order.date}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusBadge.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusBadge.text },
                        ]}
                      >
                        {statusBadge.label}
                      </Text>
                    </View>
                  </View>

                  {/* ROUTE INFO */}
                  <View style={styles.routeBox}>
                    <View style={styles.routeEndpoint}>
                      <Text style={styles.routeCity}>🇰🇷 Seoul Hub</Text>
                      <Text style={styles.routeSub}>Origin Collection</Text>
                    </View>

                    <View style={styles.routeTransit}>
                      <Text style={styles.routeArrow}>✈️ ➔</Text>
                      <Text style={styles.shippingSpeed}>
                        {order.shippingMethod} Air
                      </Text>
                    </View>

                    <View style={styles.routeEndpoint}>
                      <Text style={styles.routeCity}>
                        {order.destinationCountry === 'Nepal' ? '🇳🇵' : '🇮🇳'}{' '}
                        {order.destinationCity}
                      </Text>
                      <Text style={styles.routeSub}>
                        {order.recipient.name}
                      </Text>
                    </View>
                  </View>

                  {/* TRACKING NUMBER BAR */}
                  <View style={styles.trackingBar}>
                    <Text style={styles.trackingLabel}>Airway Bill / Tracking:</Text>
                    <Text style={styles.trackingNumber}>{order.trackingNumber}</Text>
                    <Text style={styles.etaText}>ETA: {order.estimatedDelivery}</Text>
                  </View>

                  {/* ITEMS PREVIEW */}
                  <View style={styles.itemsPreview}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {order.items.map((item, idx) => (
                        <View key={idx} style={styles.itemThumbWrapper}>
                          <Image
                            source={{ uri: item.product.image }}
                            style={styles.itemThumb}
                          />
                          <View style={styles.itemThumbQty}>
                            <Text style={styles.itemThumbQtyText}>
                              x{item.quantity}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>

                    <View style={styles.itemCountTextWrapper}>
                      <Text style={styles.itemSummaryText}>
                        {order.items.reduce((s, i) => s + i.quantity, 0)} items (
                        {order.totalWeightKg} kg)
                      </Text>
                      <Text style={styles.orderTotal}>
                        {formatPrice(order.totalKRW)}
                      </Text>
                    </View>
                  </View>

                  {/* ACTION BUTTONS */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.trackBtn}
                      activeOpacity={0.85}
                      onPress={() => setSelectedTrackingOrder(order)}
                    >
                      <Text style={styles.trackBtnText}>{t('liveTrackingBtn')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.invoiceBtn}
                      activeOpacity={0.85}
                      onPress={() => setSelectedInvoiceOrder(order)}
                    >
                      <Text style={styles.invoiceBtnText}>{t('invoiceBtn')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.reorderBtn}
                      activeOpacity={0.85}
                      onPress={() => handleReorder(order.id)}
                    >
                      <Text style={styles.reorderBtnText}>{t('reorderBtn')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* LIVE TRACKING TIMELINE MODAL */}
        <Modal
          visible={!!selectedTrackingOrder}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.trackingModalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalHeading}>Live Shipment Tracking</Text>
                  <Text style={styles.modalSubheading}>
                    Airway Bill: {selectedTrackingOrder?.trackingNumber}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setSelectedTrackingOrder(null)}
                >
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedTrackingOrder && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  {/* ROUTE BANNER */}
                  <View style={styles.modalRouteBanner}>
                    <Text style={styles.modalRouteText}>
                      🇰🇷 Seoul ➔{' '}
                      {selectedTrackingOrder.destinationCountry === 'Nepal' ? '🇳🇵' : '🇮🇳'}{' '}
                      {selectedTrackingOrder.destinationCity}
                    </Text>
                    <Text style={styles.modalEta}>
                      Est. Arrival: {selectedTrackingOrder.estimatedDelivery}
                    </Text>
                  </View>

                  {/* TIMELINE STEPS */}
                  <View style={styles.timelineContainer}>
                    {selectedTrackingOrder.timeline.map((step, index) => {
                      const isLast = index === selectedTrackingOrder.timeline.length - 1;
                      return (
                        <View key={index} style={styles.timelineStep}>
                          {/* Dot & Line */}
                          <View style={styles.timelineGraphic}>
                            <View
                              style={[
                                styles.timelineDot,
                                step.completed && styles.timelineDotCompleted,
                                step.current && styles.timelineDotCurrent,
                              ]}
                            >
                              {step.completed && (
                                <Text style={styles.timelineCheck}>✓</Text>
                              )}
                            </View>
                            {!isLast && (
                              <View
                                style={[
                                  styles.timelineLine,
                                  step.completed && styles.timelineLineCompleted,
                                ]}
                              />
                            )}
                          </View>

                          {/* Details */}
                          <View style={styles.timelineDetails}>
                            <View style={styles.timelineTitleRow}>
                              <Text
                                style={[
                                  styles.timelineTitle,
                                  step.current && styles.timelineTitleCurrent,
                                ]}
                              >
                                {step.title}
                              </Text>
                              <Text style={styles.timelineTime}>
                                {step.timestamp}
                              </Text>
                            </View>

                            <Text style={styles.timelineLocation}>
                              📍 {step.location}
                            </Text>

                            <Text style={styles.timelineDesc}>
                              {step.description}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* RECIPIENT CARD */}
                  <View style={styles.modalRecipientCard}>
                    <Text style={styles.modalRecipientTitle}>
                      Recipient Delivery Address:
                    </Text>
                    <Text style={styles.modalRecipientName}>
                      {selectedTrackingOrder.recipient.name} (
                      {selectedTrackingOrder.recipient.phone})
                    </Text>
                    <Text style={styles.modalRecipientAddress}>
                      {selectedTrackingOrder.recipient.address},{' '}
                      {selectedTrackingOrder.recipient.city}{' '}
                      {selectedTrackingOrder.recipient.postalCode},{' '}
                      {selectedTrackingOrder.recipient.country}
                    </Text>
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.doneTrackingBtn}
                onPress={() => setSelectedTrackingOrder(null)}
              >
                <Text style={styles.doneTrackingBtnText}>DONE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* INVOICE / RECEIPT MODAL */}
        <Modal
          visible={!!selectedInvoiceOrder}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.invoiceModalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalHeading}>Shipment Tax Invoice</Text>
                  <Text style={styles.modalSubheading}>
                    {selectedInvoiceOrder?.orderNumber}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setSelectedInvoiceOrder(null)}
                >
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedInvoiceOrder && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.invoiceSection}>
                    <Text style={styles.invoiceLabel}>Date:</Text>
                    <Text style={styles.invoiceValue}>{selectedInvoiceOrder.date}</Text>
                  </View>

                  <View style={styles.invoiceSection}>
                    <Text style={styles.invoiceLabel}>Payment Method:</Text>
                    <Text style={styles.invoiceValue}>
                      {selectedInvoiceOrder.paymentMethod}
                    </Text>
                  </View>

                  <View style={styles.invoiceDivider} />

                  <Text style={styles.invoiceTableTitle}>Items Breakdown:</Text>
                  {selectedInvoiceOrder.items.map((it, idx) => (
                    <View key={idx} style={styles.invoiceItemRow}>
                      <Text style={styles.invoiceItemName} numberOfLines={1}>
                        {it.product.name} (x{it.quantity})
                      </Text>
                      <Text style={styles.invoiceItemPrice}>
                        {formatPrice(it.product.priceKRW * it.quantity)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.invoiceDivider} />

                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceRowLabel}>Subtotal:</Text>
                    <Text style={styles.invoiceRowVal}>
                      {formatPrice(selectedInvoiceOrder.subtotalKRW)}
                    </Text>
                  </View>

                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceRowLabel}>Shipping Fee:</Text>
                    <Text style={styles.invoiceRowVal}>
                      {selectedInvoiceOrder.shippingFeeKRW === 0
                        ? 'FREE'
                        : formatPrice(selectedInvoiceOrder.shippingFeeKRW)}
                    </Text>
                  </View>

                  {selectedInvoiceOrder.discountKRW > 0 && (
                    <View style={styles.invoiceRow}>
                      <Text style={styles.invoiceDiscountLabel}>Discount:</Text>
                      <Text style={styles.invoiceDiscountVal}>
                        −{formatPrice(selectedInvoiceOrder.discountKRW)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.invoiceDivider} />

                  <View style={styles.invoiceTotalRow}>
                    <Text style={styles.invoiceTotalLabel}>Total Paid:</Text>
                    <Text style={styles.invoiceTotalAmount}>
                      {formatPrice(selectedInvoiceOrder.totalKRW)}
                    </Text>
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.doneTrackingBtn}
                onPress={() => setSelectedInvoiceOrder(null)}
              >
                <Text style={styles.doneTrackingBtnText}>CLOSE RECEIPT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BOTTOM NAV */}
        <BottomNav currentTab="orders" />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE4',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5EEDC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: '#212121',
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#212121',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8A857A',
    marginTop: 2,
  },
  newShipmentBtn: {
    backgroundColor: '#C88D2B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newShipmentText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8F7F3',
  },
  filterTabActive: {
    backgroundColor: '#212121',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A857A',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyOrders: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#212121',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#8A857A',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  sendParcelBtn: {
    backgroundColor: '#C88D2B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sendParcelBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#212121',
  },
  orderDate: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  routeBox: {
    backgroundColor: '#F8F7F3',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  routeEndpoint: {
    flex: 1,
  },
  routeCity: {
    fontSize: 12,
    fontWeight: '800',
    color: '#212121',
  },
  routeSub: {
    fontSize: 9,
    color: '#8A857A',
    marginTop: 2,
  },
  routeTransit: {
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  routeArrow: {
    fontSize: 14,
    color: '#C88D2B',
  },
  shippingSpeed: {
    fontSize: 8,
    fontWeight: '800',
    color: '#C88D2B',
  },
  trackingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE0',
  },
  trackingLabel: {
    fontSize: 10,
    color: '#8A857A',
  },
  trackingNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C88D2B',
  },
  etaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  itemsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  itemThumbWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  itemThumbQty: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#212121',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  itemThumbQtyText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  itemCountTextWrapper: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemSummaryText: {
    fontSize: 10,
    color: '#8A857A',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#212121',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trackBtn: {
    flex: 1.4,
    backgroundColor: '#212121',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  invoiceBtn: {
    flex: 1,
    backgroundColor: '#F5EEDC',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceBtnText: {
    color: '#C88D2B',
    fontSize: 11,
    fontWeight: '800',
  },
  reorderBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEBE4',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtnText: {
    color: '#212121',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  trackingModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  invoiceModalContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    alignSelf: 'center',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEBE4',
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#212121',
  },
  modalSubheading: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 14,
    color: '#8A857A',
    fontWeight: '800',
  },
  modalRouteBanner: {
    backgroundColor: '#FFF9ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E1BA',
  },
  modalRouteText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212121',
  },
  modalEta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C88D2B',
    marginTop: 2,
  },
  timelineContainer: {
    paddingLeft: 6,
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineGraphic: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFEBE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#C88D2B',
  },
  timelineDotCurrent: {
    backgroundColor: '#E65100',
    borderWidth: 3,
    borderColor: '#FFE0B2',
  },
  timelineCheck: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EFEBE4',
    marginTop: 2,
  },
  timelineLineCompleted: {
    backgroundColor: '#C88D2B',
  },
  timelineDetails: {
    flex: 1,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A857A',
  },
  timelineTitleCurrent: {
    color: '#E65100',
    fontWeight: '800',
  },
  timelineTime: {
    fontSize: 9,
    color: '#8A857A',
  },
  timelineLocation: {
    fontSize: 10,
    color: '#212121',
    fontWeight: '600',
    marginTop: 2,
  },
  timelineDesc: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
    lineHeight: 14,
  },
  modalRecipientCard: {
    backgroundColor: '#F8F7F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalRecipientTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A857A',
  },
  modalRecipientName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
    marginTop: 2,
  },
  modalRecipientAddress: {
    fontSize: 10,
    color: '#666155',
    marginTop: 2,
  },
  doneTrackingBtn: {
    backgroundColor: '#212121',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  doneTrackingBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  invoiceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  invoiceLabel: {
    fontSize: 11,
    color: '#8A857A',
  },
  invoiceValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#EFEBE4',
    marginVertical: 10,
  },
  invoiceTableTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#212121',
    marginBottom: 6,
  },
  invoiceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  invoiceItemName: {
    fontSize: 11,
    color: '#212121',
    flex: 1,
    marginRight: 8,
  },
  invoiceItemPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  invoiceRowLabel: {
    fontSize: 11,
    color: '#8A857A',
  },
  invoiceRowVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
  },
  invoiceDiscountLabel: {
    fontSize: 11,
    color: '#2E7D32',
  },
  invoiceDiscountVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  invoiceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  invoiceTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
  },
  invoiceTotalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#C88D2B',
  },
});
