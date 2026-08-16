import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { OrderItem } from '@/types';

export default function CartScreen() {
  const router = useRouter();
  const {
    cart,
    cartCount,
    cartTotalWeightKg,
    cartSubtotalKRW,
    cartShippingFeeKRW,
    cartDiscountKRW,
    cartTotalKRW,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    appliedCoupon,
    createOrder,
    formatPrice,
    user,
    t,
  } = useApp();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'Standard' | 'Express'>('Standard');
  const [selectedHub, setSelectedHub] = useState('Seoul Gangnam Main Hub');
  const [selectedAddressId, setSelectedAddressId] = useState(
    user.savedAddresses[0]?.id || ''
  );
  const [paymentMethod, setPaymentMethod] = useState('Kakao Pay');
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<OrderItem | null>(null);

  const selectedAddress =
    user.savedAddresses.find((a) => a.id === selectedAddressId) ||
    user.savedAddresses[0];

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponError('');
      setCouponInput('');
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add products before checking out.');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Delivery Address Required', 'Please choose a delivery address.');
      return;
    }

    const order = createOrder({
      originHub: selectedHub,
      destinationCity: selectedAddress.city,
      destinationCountry: selectedAddress.country === 'Nepal' ? 'Nepal' : 'India',
      shippingMethod,
      paymentMethod,
      recipient: {
        name: selectedAddress.recipientName,
        phone: selectedAddress.phone,
        address: selectedAddress.fullAddress,
        city: selectedAddress.city,
        postalCode: selectedAddress.postalCode,
        country: selectedAddress.country,
      },
    });

    setCreatedOrderData(order);
    setIsSuccessModalVisible(true);
  };

  // Free shipping threshold calculation
  const freeShippingThreshold = 50000;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotalKRW);
  const progressRatio = Math.min(1, cartSubtotalKRW / freeShippingThreshold);

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
            <Text style={styles.headerTitle}>{t('cartTitle')}</Text>
            <Text style={styles.headerSubtitle}>
              {cartCount} {cartCount === 1 ? 'item' : 'items'} • {cartTotalWeightKg} kg total
            </Text>
          </View>

          {cart.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Clear Cart', 'Remove all items from your cart?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: clearCart },
                ]);
              }}
            >
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* FREE SHIPPING METER */}
          <View style={styles.freeShippingCard}>
            <View style={styles.freeShippingHeader}>
              <Text style={styles.freeShippingTitle}>
                {amountNeededForFreeShipping === 0 || appliedCoupon?.code === 'FREESHIP'
                  ? '🎉 You unlocked FREE International Delivery!'
                  : `Add ${formatPrice(amountNeededForFreeShipping)} more for FREE Delivery`}
              </Text>
              <Text style={styles.freeShippingIcon}>🚚</Text>
            </View>

            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width:
                      appliedCoupon?.code === 'FREESHIP'
                        ? '100%'
                        : `${progressRatio * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* EMPTY CART STATE */}
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>{t('cartEmpty')}</Text>
              <Text style={styles.emptySubtitle}>
                Add authentic groceries, spices & parcel items to ship to India & Nepal.
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                activeOpacity={0.85}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.browseButtonText}>{t('startShopping')} →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ITEM LIST */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Shipment Items ({cart.length})</Text>

                {cart.map(({ product, quantity }) => (
                  <View key={product.id} style={styles.cartItemCard}>
                    <Image source={{ uri: product.image }} style={styles.itemImage} />

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {product.name}
                      </Text>

                      <Text style={styles.itemMeta}>
                        {product.size} • {product.weightKg} kg/unit • {product.origin}
                      </Text>

                      <Text style={styles.itemPrice}>
                        {formatPrice(product.priceKRW * quantity)}
                      </Text>
                    </View>

                    {/* QUANTITY CONTROLS */}
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateCartQuantity(product.id, quantity - 1)}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>

                      <Text style={styles.qtyText}>{quantity}</Text>

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateCartQuantity(product.id, quantity + 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => removeFromCart(product.id)}
                      >
                        <Text style={styles.deleteBtnText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* LOGISTICS ROUTE (SENDER HUB -> RECIPIENT) */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Logistics & Delivery Route</Text>

                {/* Sender Hub in Korea */}
                <View style={styles.routeCard}>
                  <View style={styles.routeIconWrapper}>
                    <Text style={styles.routeFlag}>🇰🇷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>ORIGIN COLLECTION (SOUTH KOREA)</Text>
                    <Text style={styles.routeName}>{selectedHub}</Text>
                    <View style={styles.hubChipsRow}>
                      {[
                        'Seoul Gangnam Main Hub',
                        'Busan Port Hub',
                        'Incheon Airport Hub',
                      ].map((hub) => (
                        <TouchableOpacity
                          key={hub}
                          style={[
                            styles.hubChip,
                            selectedHub === hub && styles.hubChipActive,
                          ]}
                          onPress={() => setSelectedHub(hub)}
                        >
                          <Text
                            style={[
                              styles.hubChipText,
                              selectedHub === hub && styles.hubChipTextActive,
                            ]}
                          >
                            {hub.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Recipient in India/Nepal */}
                <View style={[styles.routeCard, { marginTop: 10 }]}>
                  <View style={styles.routeIconWrapper}>
                    <Text style={styles.routeFlag}>
                      {selectedAddress?.country === 'Nepal' ? '🇳🇵' : '🇮🇳'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>
                      DESTINATION ({selectedAddress?.country?.toUpperCase()})
                    </Text>
                    <Text style={styles.routeName}>{selectedAddress?.recipientName}</Text>
                    <Text style={styles.routeDetail} numberOfLines={2}>
                      {selectedAddress?.fullAddress}, {selectedAddress?.city}{' '}
                      {selectedAddress?.postalCode}
                    </Text>
                    <Text style={styles.routePhone}>📞 {selectedAddress?.phone}</Text>

                    {/* Quick address selection chips if multiple */}
                    {user.savedAddresses.length > 1 && (
                      <View style={styles.hubChipsRow}>
                        {user.savedAddresses.map((addr) => (
                          <TouchableOpacity
                            key={addr.id}
                            style={[
                              styles.hubChip,
                              selectedAddressId === addr.id && styles.hubChipActive,
                            ]}
                            onPress={() => setSelectedAddressId(addr.id)}
                          >
                            <Text
                              style={[
                                styles.hubChipText,
                                selectedAddressId === addr.id && styles.hubChipTextActive,
                              ]}
                            >
                              {addr.title}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/profile')}
                    style={styles.changeAddressBtn}
                  >
                    <Text style={styles.changeAddressText}>Manage</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SHIPPING SPEED SELECTOR */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Choose Shipping Speed</Text>

                <TouchableOpacity
                  style={[
                    styles.shippingOption,
                    shippingMethod === 'Standard' && styles.shippingOptionActive,
                  ]}
                  onPress={() => setShippingMethod('Standard')}
                >
                  <View style={styles.shippingRadio}>
                    {shippingMethod === 'Standard' && <View style={styles.shippingRadioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shippingTitle}>Standard International</Text>
                    <Text style={styles.shippingEta}>Est. 10-14 business days</Text>
                  </View>
                  <Text style={styles.shippingCost}>
                    {cartShippingFeeKRW === 0 ? 'FREE' : formatPrice(cartShippingFeeKRW)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.shippingOption,
                    shippingMethod === 'Express' && styles.shippingOptionActive,
                    { marginTop: 8 },
                  ]}
                  onPress={() => setShippingMethod('Express')}
                >
                  <View style={styles.shippingRadio}>
                    {shippingMethod === 'Express' && <View style={styles.shippingRadioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.expressTagRow}>
                      <Text style={styles.shippingTitle}>Air Express Priority</Text>
                      <View style={styles.fastBadge}>
                        <Text style={styles.fastBadgeText}>⚡ 3-5 DAYS</Text>
                      </View>
                    </View>
                    <Text style={styles.shippingEta}>Direct Incheon Flight with live GPS</Text>
                  </View>
                  <Text style={styles.shippingCost}>
                    +{formatPrice(8000)}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* COUPON & PROMO */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Coupons & Promo Code</Text>

                {appliedCoupon ? (
                  <View style={styles.appliedCouponCard}>
                    <View>
                      <Text style={styles.appliedCouponCode}>
                        🏷️ {appliedCoupon.code} APPLIED
                      </Text>
                      <Text style={styles.appliedCouponDesc}>
                        {appliedCoupon.title}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeCouponBtn}
                      onPress={removeCoupon}
                    >
                      <Text style={styles.removeCouponText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={styles.couponInputRow}>
                      <TextInput
                        style={styles.couponInput}
                        placeholder="Enter coupon (e.g. NAMASTE10)"
                        placeholderTextColor="#A2A2A2"
                        autoCapitalize="characters"
                        value={couponInput}
                        onChangeText={(t) => {
                          setCouponInput(t);
                          setCouponError('');
                        }}
                      />
                      <TouchableOpacity
                        style={styles.applyBtn}
                        onPress={handleApplyCoupon}
                      >
                        <Text style={styles.applyBtnText}>APPLY</Text>
                      </TouchableOpacity>
                    </View>

                    {couponError.length > 0 && (
                      <Text style={styles.couponErrorText}>{couponError}</Text>
                    )}

                    {/* Quick coupon chips */}
                    <View style={styles.couponChipsRow}>
                      <TouchableOpacity
                        style={styles.couponChip}
                        onPress={() => applyCoupon('NAMASTE10')}
                      >
                        <Text style={styles.couponChipText}>✨ NAMASTE10 (10% OFF)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.couponChip}
                        onPress={() => applyCoupon('FREESHIP')}
                      >
                        <Text style={styles.couponChipText}>🚚 FREESHIP</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* PAYMENT METHOD SELECTOR */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Select Payment Method</Text>

                <View style={styles.paymentGrid}>
                  {[
                    { id: 'Kakao Pay', label: 'Kakao Pay 🇰🇷', icon: '🟡' },
                    { id: 'Credit Card', label: 'Cards (Visa/MC) 💳', icon: '💳' },
                    { id: 'UPI India', label: 'UPI / GPay (India) 🇮🇳', icon: '⚡' },
                    { id: 'eSewa / Nepal', label: 'eSewa / Khalti (Nepal) 🇳🇵', icon: '🟢' },
                    { id: 'Cash on Pickup', label: 'Cash at Hub 💵', icon: '🤝' },
                  ].map((method) => {
                    const isSelected = paymentMethod === method.id;
                    return (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          styles.paymentCard,
                          isSelected && styles.paymentCardSelected,
                        ]}
                        onPress={() => setPaymentMethod(method.id)}
                      >
                        <Text style={styles.paymentIcon}>{method.icon}</Text>
                        <Text
                          style={[
                            styles.paymentLabel,
                            isSelected && styles.paymentLabelSelected,
                          ]}
                        >
                          {method.label}
                        </Text>
                        {isSelected && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* BILL SUMMARY */}
              <View style={styles.billCard}>
                <Text style={styles.billTitle}>{t('billSummary')}</Text>

                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>{t('subtotal')}</Text>
                  <Text style={styles.billValue}>{formatPrice(cartSubtotalKRW)}</Text>
                </View>

                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>{t('shippingFee')}</Text>
                  <Text style={styles.billValue}>
                    {shippingMethod === 'Express'
                      ? formatPrice(cartShippingFeeKRW + 8000)
                      : cartShippingFeeKRW === 0
                      ? 'FREE'
                      : formatPrice(cartShippingFeeKRW)}
                  </Text>
                </View>

                {cartDiscountKRW > 0 && (
                  <View style={styles.billRow}>
                    <Text style={styles.discountLabel}>
                      {t('discount')} ({appliedCoupon?.code})
                    </Text>
                    <Text style={styles.discountValue}>
                      −{formatPrice(cartDiscountKRW)}
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <View>
                    <Text style={styles.totalLabel}>{t('totalAmount')}</Text>
                    <Text style={styles.taxInclusive}>Includes all customs & taxes</Text>
                  </View>
                  <Text style={styles.totalAmount}>
                    {formatPrice(
                      shippingMethod === 'Express'
                        ? cartTotalKRW + 8000
                        : cartTotalKRW
                    )}
                  </Text>
                </View>
              </View>

              {/* CHECKOUT BUTTON */}
              <TouchableOpacity
                style={styles.checkoutBtn}
                activeOpacity={0.85}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutBtnText}>{t('proceedCheckout')}</Text>
                <Text style={styles.checkoutBtnAmount}>
                  {formatPrice(
                    shippingMethod === 'Express'
                      ? cartTotalKRW + 8000
                      : cartTotalKRW
                  )}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ORDER SUCCESS MODAL */}
        <Modal
          visible={isSuccessModalVisible}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalSuccessIcon}>🎉</Text>
              <Text style={styles.modalTitle}>Order Placed Successfully!</Text>
              <Text style={styles.modalSubtitle}>
                Your shipment has been registered with NamasteMart Logistics.
              </Text>

              {createdOrderData && (
                <View style={styles.modalOrderDetails}>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Order ID:</Text>
                    <Text style={styles.modalDetailValue}>
                      {createdOrderData.orderNumber}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Tracking Airway Bill:</Text>
                    <Text style={styles.modalTrackingCode}>
                      {createdOrderData.trackingNumber}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Route:</Text>
                    <Text style={styles.modalDetailValue}>
                      Seoul ➔ {createdOrderData.destinationCity},{' '}
                      {createdOrderData.destinationCountry}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Estimated Delivery:</Text>
                    <Text style={styles.modalDetailValue}>
                      {createdOrderData.estimatedDelivery}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.modalTrackBtn}
                onPress={() => {
                  setIsSuccessModalVisible(false);
                  router.replace('/orders');
                }}
              >
                <Text style={styles.modalTrackBtnText}>VIEW IN ORDERS & TRACK →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalHomeBtn}
                onPress={() => {
                  setIsSuccessModalVisible(false);
                  router.replace('/');
                }}
              >
                <Text style={styles.modalHomeBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BOTTOM NAV */}
        <BottomNav currentTab="cart" />
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
  clearText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E53935',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  freeShippingCard: {
    backgroundColor: '#FFF9ED',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E1BA',
  },
  freeShippingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  freeShippingTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C88D2B',
    flex: 1,
  },
  freeShippingIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#EFEBE4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C88D2B',
    borderRadius: 3,
  },
  emptyCart: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#212121',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#8A857A',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#C88D2B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  cartItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemImage: {
    width: 65,
    height: 65,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
    lineHeight: 17,
  },
  itemMeta: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 3,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C88D2B',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7F3',
    borderRadius: 10,
    padding: 3,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#212121',
    marginHorizontal: 8,
  },
  deleteBtn: {
    marginLeft: 6,
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 14,
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  routeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  routeFlag: {
    fontSize: 18,
  },
  routeLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#C88D2B',
    letterSpacing: 0.5,
  },
  routeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
    marginTop: 1,
  },
  routeDetail: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  routePhone: {
    fontSize: 10,
    color: '#666155',
    marginTop: 2,
    fontWeight: '600',
  },
  changeAddressBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F5EEDC',
    borderRadius: 8,
  },
  changeAddressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C88D2B',
  },
  hubChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  hubChip: {
    backgroundColor: '#F8F7F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  hubChipActive: {
    backgroundColor: '#FFF9ED',
    borderColor: '#C88D2B',
  },
  hubChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A857A',
  },
  hubChipTextActive: {
    color: '#C88D2B',
  },
  shippingOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFEBE4',
  },
  shippingOptionActive: {
    borderColor: '#C88D2B',
    backgroundColor: '#FFFBF3',
  },
  shippingRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C88D2B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shippingRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#C88D2B',
  },
  shippingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
  },
  expressTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fastBadge: {
    backgroundColor: '#C88D2B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fastBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  shippingEta: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  shippingCost: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212121',
  },
  appliedCouponCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  appliedCouponCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2E7D32',
  },
  appliedCouponDesc: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
  },
  removeCouponBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  removeCouponText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E53935',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  applyBtn: {
    backgroundColor: '#212121',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  couponErrorText: {
    color: '#E53935',
    fontSize: 10,
    marginTop: 4,
  },
  couponChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  couponChip: {
    backgroundColor: '#FFF9ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3E1BA',
  },
  couponChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C88D2B',
  },
  paymentGrid: {
    gap: 8,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFEBE4',
  },
  paymentCardSelected: {
    borderColor: '#C88D2B',
    backgroundColor: '#FFFBF3',
  },
  paymentIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
    flex: 1,
  },
  paymentLabelSelected: {
    color: '#C88D2B',
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C88D2B',
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  billTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 12,
    color: '#8A857A',
  },
  billValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212121',
  },
  billValueBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#212121',
  },
  discountLabel: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
  },
  discountValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2E7D32',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFEBE4',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#212121',
  },
  taxInclusive: {
    fontSize: 9,
    color: '#8A857A',
    marginTop: 1,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#C88D2B',
  },
  checkoutBtn: {
    backgroundColor: '#212121',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  checkoutBtnAmount: {
    color: '#F0BA5A',
    fontSize: 14,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalSuccessIcon: {
    fontSize: 50,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#212121',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#8A857A',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalOrderDetails: {
    width: '100%',
    backgroundColor: '#F8F7F3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalDetailLabel: {
    fontSize: 10,
    color: '#8A857A',
  },
  modalDetailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
  },
  modalTrackingCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C88D2B',
  },
  modalTrackBtn: {
    backgroundColor: '#C88D2B',
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTrackBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalHomeBtn: {
    paddingVertical: 8,
  },
  modalHomeBtnText: {
    color: '#8A857A',
    fontSize: 12,
    fontWeight: '700',
  },
});
