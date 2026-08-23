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
import { BankTransferCard } from '@/components/BankTransferCard';
import { BankAccountInfo, getRandomBankAccount } from '@/data/mockData';
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
    isDarkMode,
  } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'Standard' | 'Express'>('Standard');
  const [selectedHub, setSelectedHub] = useState('Seoul Gangnam Main Hub');
  const [selectedAddressId, setSelectedAddressId] = useState(
    user.savedAddresses[0]?.id || ''
  );
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [selectedBank, setSelectedBank] = useState<BankAccountInfo>(() => getRandomBankAccount());
  const [senderName, setSenderName] = useState(user?.name || 'PARSHANT');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
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
      paymentMethod: `Direct Bank Transfer (${selectedBank.bankNameKr})`,
      bankAccount: {
        bankName: `${selectedBank.bankName} (${selectedBank.bankNameKr})`,
        accountNumber: selectedBank.accountNumber,
        accountHolder: selectedBank.accountHolder,
      },
      senderName: senderName || user.name,
      paymentScreenshot: paymentScreenshot || undefined,
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

              {/* PAYMENT METHOD SECTION - DIRECT BANK TRANSFER ONLY */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Payment Method</Text>

                <BankTransferCard
                  selectedBank={selectedBank}
                  onSelectBank={setSelectedBank}
                  senderName={senderName}
                  onChangeSenderName={setSenderName}
                  paymentScreenshot={paymentScreenshot}
                  onSelectScreenshot={setPaymentScreenshot}
                  isDarkMode={isDarkMode}
                />
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

const getStyles = (isDark: boolean) => {
  const bg = isDark ? '#121212' : '#F8F7F3';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBgElevated = isDark ? '#262626' : '#F8F7F3';
  const textMain = isDark ? '#FFFFFF' : '#212121';
  const textSub = isDark ? '#A0A0A0' : '#8A857A';
  const border = isDark ? '#333333' : '#EFEBE4';
  const accent = isDark ? '#D4AF37' : '#C88D2B';
  const activeTint = isDark ? '#2D271E' : '#FFF9ED';
  const borderLight = isDark ? '#262626' : '#F5F5F5';

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: textMain,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: textMain,
  },
  headerSubtitle: {
    fontSize: 11,
    color: textSub,
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
    backgroundColor: isDark ? '#2D271E' : '#FFF9ED',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? '#4D3B18' : '#F3E1BA',
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
    color: accent,
    flex: 1,
  },
  freeShippingIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: isDark ? '#262626' : '#EFEBE4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: accent,
    borderRadius: 3,
  },
  emptyCart: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 20,
    marginTop: 20,
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: textMain,
  },
  emptySubtitle: {
    fontSize: 12,
    color: textSub,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: textMain,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  cartItemCard: {
    backgroundColor: cardBg,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  itemImage: {
    width: 65,
    height: 65,
    borderRadius: 10,
    backgroundColor: cardBgElevated,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: textMain,
    lineHeight: 17,
  },
  itemMeta: {
    fontSize: 10,
    color: textSub,
    marginTop: 3,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: accent,
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 10,
    padding: 3,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    backgroundColor: cardBg,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 2,
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: textMain,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: textMain,
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
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: border,
  },
  routeIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
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
    color: accent,
    letterSpacing: 0.5,
  },
  routeName: {
    fontSize: 13,
    fontWeight: '700',
    color: textMain,
    marginTop: 1,
  },
  routeDetail: {
    fontSize: 10,
    color: textSub,
    marginTop: 2,
  },
  routePhone: {
    fontSize: 10,
    color: textSub,
    marginTop: 2,
    fontWeight: '600',
  },
  changeAddressBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
    borderRadius: 8,
  },
  changeAddressText: {
    fontSize: 11,
    fontWeight: '700',
    color: accent,
  },
  hubChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  hubChip: {
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: border,
  },
  hubChipActive: {
    backgroundColor: activeTint,
    borderColor: accent,
  },
  hubChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: textSub,
  },
  hubChipTextActive: {
    color: accent,
  },
  shippingOption: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: border,
  },
  shippingOptionActive: {
    borderColor: accent,
    backgroundColor: activeTint,
  },
  shippingRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shippingRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: accent,
  },
  shippingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: textMain,
  },
  expressTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fastBadge: {
    backgroundColor: accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fastBadgeText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  shippingEta: {
    fontSize: 10,
    color: textSub,
    marginTop: 2,
  },
  shippingCost: {
    fontSize: 13,
    fontWeight: '800',
    color: textMain,
  },
  appliedCouponCard: {
    backgroundColor: isDark ? '#1E2D1E' : '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDark ? '#2E4C2E' : '#C8E6C9',
  },
  appliedCouponCode: {
    fontSize: 12,
    fontWeight: '800',
    color: isDark ? '#81C784' : '#2E7D32',
  },
  appliedCouponDesc: {
    fontSize: 10,
    color: isDark ? '#A5D6A7' : '#4CAF50',
    marginTop: 2,
  },
  removeCouponBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: cardBg,
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
    backgroundColor: isDark ? '#262626' : '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: textMain,
    borderWidth: 1,
    borderColor: border,
  },
  applyBtn: {
    backgroundColor: isDark ? accent : '#212121',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  applyBtnText: {
    color: isDark ? '#121212' : '#FFFFFF',
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
    backgroundColor: activeTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#4D3B18' : '#F3E1BA',
  },
  couponChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: accent,
  },
  paymentGrid: {
    gap: 8,
  },
  paymentCard: {
    backgroundColor: cardBg,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: border,
  },
  paymentCardSelected: {
    borderColor: accent,
    backgroundColor: activeTint,
  },
  paymentIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: textMain,
    flex: 1,
  },
  paymentLabelSelected: {
    color: accent,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
    color: accent,
  },
  billCard: {
    backgroundColor: cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  billTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: textMain,
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 12,
    color: textSub,
  },
  billValue: {
    fontSize: 12,
    fontWeight: '600',
    color: textMain,
  },
  billValueBold: {
    fontSize: 12,
    fontWeight: '800',
    color: textMain,
  },
  discountLabel: {
    fontSize: 12,
    color: isDark ? '#81C784' : '#2E7D32',
    fontWeight: '700',
  },
  discountValue: {
    fontSize: 12,
    fontWeight: '800',
    color: isDark ? '#81C784' : '#2E7D32',
  },
  divider: {
    height: 1,
    backgroundColor: borderLight,
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
    color: textMain,
  },
  taxInclusive: {
    fontSize: 9,
    color: textSub,
    marginTop: 1,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: accent,
  },
  checkoutBtn: {
    backgroundColor: accent,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  checkoutBtnText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: cardBg,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 385,
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  modalSuccessIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  modalSuccessTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: textMain,
    textAlign: 'center',
  },
  modalSuccessSubtitle: {
    fontSize: 11,
    color: textSub,
    marginTop: 2,
    textAlign: 'center',
  },
  modalSuccessMsg: {
    fontSize: 10,
    color: textSub,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 14,
  },
  modalInvoiceCard: {
    width: '100%',
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: border,
  },
  modalInvoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: border,
    paddingBottom: 6,
    marginBottom: 8,
  },
  modalInvoiceTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: textMain,
  },
  modalInvoiceDate: {
    fontSize: 9,
    color: textSub,
  },
  modalInvoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalInvoiceLabel: {
    fontSize: 10,
    color: textSub,
  },
  modalInvoiceValue: {
    fontSize: 10,
    fontWeight: '700',
    color: textMain,
  },
  modalInvoiceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: border,
    paddingTop: 8,
    marginTop: 2,
  },
  modalInvoiceTotalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: textMain,
  },
  modalInvoiceTotalValue: {
    fontSize: 11,
    fontWeight: '900',
    color: accent,
  },
  modalTrackingBox: {
    width: '100%',
    backgroundColor: isDark ? '#2D271E' : '#FFF9ED',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDark ? '#4D3B18' : '#F3E1BA',
  },
  modalTrackingLabel: {
    fontSize: 10,
    color: textSub,
  },
  modalTrackingCode: {
    fontSize: 11,
    fontWeight: '800',
    color: accent,
  },
  modalTrackBtn: {
    backgroundColor: accent,
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTrackBtnText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalHomeBtn: {
    paddingVertical: 8,
  },
  modalHomeBtnText: {
    color: textSub,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOrderDetails: {
    width: '100%',
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: border,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalDetailLabel: {
    fontSize: 10,
    color: textSub,
  },
  modalDetailValue: {
    fontSize: 10,
    fontWeight: '700',
    color: textMain,
  },
  checkoutBtnAmount: {
    color: isDark ? '#121212' : '#FFFFFF',
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
    backgroundColor: cardBg,
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 385,
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: textMain,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 11,
    color: textSub,
    marginTop: 2,
    textAlign: 'center',
  },
});
};
