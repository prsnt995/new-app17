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

export default function ParcelsScreen() {
  const router = useRouter();
  const { orders, formatPrice, isDarkMode } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const [activeTab, setActiveTab] = useState<'ALL' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');
  const [selectedParcel, setSelectedParcel] = useState<OrderItem | null>(null);

  // Filter parcel shipments (destination is India or Nepal or orderType === 'PARCEL')
  const parcelOrders = orders.filter(
    (order) =>
      order.orderType === 'PARCEL' ||
      order.destinationCountry === 'India' ||
      order.destinationCountry === 'Nepal'
  );

  const filteredParcels = parcelOrders.filter((parcel) => {
    if (activeTab === 'IN_TRANSIT') {
      return parcel.status === 'IN_TRANSIT' || parcel.status === 'ORDER_PLACED' || parcel.status === 'PICKED_UP';
    }
    if (activeTab === 'DELIVERED') {
      return parcel.status === 'DELIVERED';
    }
    return true;
  });

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

  const defaultTimeline = [
    { key: 'CREATED', label: 'Parcel Created', desc: 'Order registered & payment confirmed' },
    { key: 'PICKED_UP', label: 'Picked Up', desc: 'Package picked up by courier' },
    { key: 'SEOUL_HUB', label: 'Seoul Hub', desc: 'Air sorting & export clearance complete' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'Cargo flight in transit to destination' },
    { key: 'ARRIVED', label: 'Arrived at Destination', desc: 'Import customs clearance' },
    { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Dispatched with local courier' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Handed over to recipient' },
  ];

  const getStepStatus = (parcel: OrderItem, index: number) => {
    if (parcel.status === 'DELIVERED') {
      return 'COMPLETED';
    }
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
            onPress={() => router.push('/orders')}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>My Parcels</Text>
            <Text style={styles.headerSubtitle}>Track parcels sent to your home</Text>
          </View>

          <TouchableOpacity
            style={styles.sendParcelBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/send-parcel')}
          >
            <Text style={styles.sendParcelBtnText}>+ Send Parcel</Text>
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          {(['ALL', 'IN_TRANSIT', 'DELIVERED'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'ALL' ? 'All' : tab === 'IN_TRANSIT' ? 'In Transit' : 'Delivered'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PARCELS LIST */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filteredParcels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>No Parcels Found</Text>
              <Text style={styles.emptySubtitle}>
                You have not sent any courier parcels in this category yet.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/send-parcel')}
              >
                <Text style={styles.emptyButtonText}>+ Send Parcel Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredParcels.map((parcel) => {
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
        </ScrollView>

        {/* PARCEL TRACKING MODAL */}
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
                    {defaultTimeline.map((step, idx) => {
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
                            {idx < defaultTimeline.length - 1 && (
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
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 10,
      backgroundColor: bg,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: cardBg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    activeTabButton: {
      backgroundColor: accent,
      borderColor: accent,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: subText,
    },
    activeTabText: {
      color: '#FFFFFF',
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 90,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyEmoji: {
      fontSize: 50,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: text,
    },
    emptySubtitle: {
      fontSize: 13,
      color: subText,
      textAlign: 'center',
      marginTop: 6,
      paddingHorizontal: 30,
    },
    emptyButton: {
      marginTop: 20,
      backgroundColor: accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    emptyButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
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
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
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
  });
}
