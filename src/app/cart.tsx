import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
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
import { KoreanCardPaymentModal } from '@/components/KoreanCardPaymentModal';
import { BankAccountInfo, getRandomBankAccount } from '@/data/mockData';
import { KoreanCardPaymentDetails, OrderItem, BankTransferSettings } from '@/types';
import { verifyAndCreateKoreanCardOrder } from '@/services/api';
import {
  getBankTransferSettings,
  subscribeBankTransferSettings,
  DEFAULT_BANK_SETTINGS,
} from '@/services/bankSettingsService';

const KOREAN_CARD_LOGOS = [
  { name: '신한', color: '#0046FF' },
  { name: 'KB국민', color: '#6A5B44' },
  { name: '삼성', color: '#0C4DA2' },
  { name: '현대', color: '#111111' },
  { name: '롯데', color: '#ED1C24' },
  { name: '하나', color: '#008485' },
  { name: '우리', color: '#0080FF' },
  { name: 'NH농협', color: '#009944' },
  { name: '카카오', color: '#FEE500', textColor: '#191919' },
  { name: '토스', color: '#0064FF' },
];

type CheckoutStep = 'CART' | 'ADDRESS' | 'PAYMENT' | 'SUBMITTED';

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
    appliedCoupon,
    createOrder,
    formatPrice,
    user,
    t,
    isDarkMode,
    addKoreanAddress,
  } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // ─── CHECKOUT STEP STATE ────────────────────────────────────────────────────
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('CART');

  // Dynamic Bank Transfer Settings
  const [bankSettings, setBankSettings] = useState<BankTransferSettings>(DEFAULT_BANK_SETTINGS);

  React.useEffect(() => {
    getBankTransferSettings().then(setBankSettings);
    const unsubscribe = subscribeBankTransferSettings(setBankSettings);
    return () => unsubscribe();
  }, []);

  // Delivery Address State
  const koreanAddresses = user.savedAddresses?.filter((a) => a.country === 'South Korea') || [];
  const [selectedAddressId, setSelectedAddressId] = useState(
    koreanAddresses[0]?.id || user.savedAddresses?.[0]?.id || ''
  );

  const defaultRecipient = koreanAddresses.find((a) => a.id === selectedAddressId) || koreanAddresses[0];
  const [recipientName, setRecipientName] = useState(defaultRecipient?.recipientName || user.name || '');
  const [recipientPhone, setRecipientPhone] = useState(
    defaultRecipient?.phone || defaultRecipient?.phoneNumber || user.phone || '010-'
  );
  const [postalCode, setPostalCode] = useState(defaultRecipient?.postalCode || '');
  const [streetAddress, setStreetAddress] = useState(
    defaultRecipient?.streetAddress || defaultRecipient?.fullAddress || ''
  );
  const [detailAddress, setDetailAddress] = useState(defaultRecipient?.detailAddress || '');
  const [deliveryNote, setDeliveryNote] = useState('문 앞에 놓아주세요 (Leave at front door)');
  const [city, setCity] = useState('Seoul');

  // Payment State
  const [paymentMethodType, setPaymentMethodType] = useState<'KOREAN_CARD' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [selectedBank, setSelectedBank] = useState<BankAccountInfo>(() => getRandomBankAccount());
  const [senderName, setSenderName] = useState(user?.name || '');
  const [transferredAmount, setTransferredAmount] = useState<string>('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isSubmittingBankOrder, setIsSubmittingBankOrder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  React.useEffect(() => {
    if (cartTotalKRW > 0 && !transferredAmount) {
      setTransferredAmount(String(cartTotalKRW));
    }
  }, [cartTotalKRW]);

  // Modals & Card PG
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const [isSubmittingCardOrder, setIsSubmittingCardOrder] = useState(false);

  // Order created in Step 3 (before payment)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [createdOrderData, setCreatedOrderData] = useState<OrderItem | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [cardReceipt, setCardReceipt] = useState<KoreanCardPaymentDetails | null>(null);

  const handleSelectSavedAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    const target = koreanAddresses.find((a) => a.id === addrId);
    if (target) {
      setRecipientName(target.recipientName || user.name || '');
      setRecipientPhone(target.phone || target.phoneNumber || user.phone || '');
      setPostalCode(target.postalCode || '');
      setStreetAddress(target.streetAddress || target.fullAddress || '');
      setDetailAddress(target.detailAddress || '');
    }
  };

  // ─── STEP 1 → STEP 2 ────────────────────────────────────────────────────────
  const handleContinueToAddress = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before proceeding.');
      return;
    }
    for (const item of cart) {
      const stock = item.product.stock ?? 100;
      if (stock <= 0) {
        Alert.alert('Out of Stock', `"${item.product.name}" is out of stock. Please remove it from your cart.`);
        return;
      }
    }
    setCheckoutStep('ADDRESS');
  };

  // ─── STEP 2 → STEP 3 ────────────────────────────────────────────────────────
  const handleConfirmAddressAndPay = async () => {
    if (!recipientName.trim()) {
      Alert.alert('Recipient Name Required', 'Please enter the delivery recipient name.');
      return;
    }
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      Alert.alert('Valid Phone Required', 'Please enter a valid South Korean contact phone number (e.g. 010-1234-5678).');
      return;
    }
    if (!streetAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your South Korean street address.');
      return;
    }
    if (!postalCode.trim()) {
      Alert.alert('Postal Code Required', 'Please enter your postal code (우편번호).');
      return;
    }

    // Save address to user profile (non-blocking)
    try {
      const addrId = `addr_${Date.now()}`;
      await addKoreanAddress({
        id: addrId,
        recipientName: recipientName.trim(),
        phoneNumber: recipientPhone.trim(),
        postalCode: postalCode.trim(),
        address: streetAddress.trim(),
        detailAddress: detailAddress.trim(),
        deliveryInstructions: deliveryNote.trim(),
        country: 'South Korea',
        label: 'Home',
        isDefault: true,
      });
    } catch (_) {}

    // Create order in Firestore
    setIsCreatingOrder(true);
    try {
      const itemsPayload = cart.map((it) => ({
        productId: it.product.id,
        name: it.product.name,
        quantity: it.quantity,
        price: it.product.oldPriceKRW || it.product.priceKRW,
        discount: it.product.discountPercent ?? 0,
        subtotal: (it.product.finalPrice ?? it.product.priceKRW) * it.quantity,
        imageUrl: it.product.image || (it.product.images && it.product.images[0]) || '',
      }));

      const fullAddress = `${streetAddress.trim()} ${detailAddress.trim()}`.trim();

      const { createBankTransferOrder } = await import('@/services/firestorePaymentService');
      const result = await createBankTransferOrder({
        userId: user?.id || 'guest',
        customer: {
          name: recipientName.trim(),
          email: user?.email || '',
          phone: recipientPhone.trim(),
          address: fullAddress,
        },
        deliveryAddress: {
          recipientName: recipientName.trim(),
          phone: recipientPhone.trim(),
          fullAddress: streetAddress.trim(),
          detailAddress: detailAddress.trim(),
          postalCode: postalCode.trim(),
          city: city.trim() || 'Seoul',
          country: 'South Korea',
          deliveryInstructions: deliveryNote.trim(),
        },
        items: itemsPayload,
        subtotal: cartSubtotalKRW,
        shippingFee: cartShippingFeeKRW,
        discount: cartDiscountKRW,
        totalAmount: cartTotalKRW,
        bankAccount: {
          bankName: bankSettings.bankName,
          accountNumber: bankSettings.accountNumber,
          accountHolder: bankSettings.accountHolder,
        },
        destinationCity: city.trim() || 'Seoul',
        shippingMethod: 'Standard',
      });

      setCreatedOrderId(result.orderId);
      setCreatedOrderNumber(result.orderNumber);
      setCreatedOrderData(result.order);
      setIsCreatingOrder(false);
      clearCart();
      setCheckoutStep('PAYMENT');
    } catch (err: any) {
      setIsCreatingOrder(false);
      Alert.alert('Order Creation Failed', err.message || 'Error creating order. Please try again.');
    }
  };

  // ─── STEP 3: Submit Payment ──────────────────────────────────────────────────
  const handleSubmitPayment = async () => {
    if (!paymentScreenshot) {
      Alert.alert(
        'Payment Screenshot Required / 입금 확인증 필요',
        'Please upload your payment screenshot before submitting.'
      );
      return;
    }

    const numericTransferred = Number(transferredAmount.replace(/[^0-9]/g, '')) || cartTotalKRW;
    if (numericTransferred <= 0) {
      Alert.alert('Transferred Amount Required', 'Please enter the transferred amount in Korean Won (₩).');
      return;
    }

    if (!createdOrderId) {
      Alert.alert('Error', 'No order found. Please go back and try again.');
      return;
    }

    setIsSubmittingBankOrder(true);
    setUploadProgress(10);

    try {
      const { submitPaymentForOrder } = await import('@/services/firestorePaymentService');
      await submitPaymentForOrder({
        orderId: createdOrderId,
        userId: user?.id || 'guest',
        screenshotUri: paymentScreenshot,
        transferredAmount: numericTransferred,
        senderName: senderName.trim() || recipientName.trim(),
        onUploadProgress: (p) => setUploadProgress(p.percentage),
      });

      setIsSubmittingBankOrder(false);
      setCardReceipt(null);
      setCheckoutStep('SUBMITTED');
    } catch (err: any) {
      setIsSubmittingBankOrder(false);
      Alert.alert('Payment Submission Failed', err.message || 'Error submitting payment proof.');
    }
  };

  // Handle Korean Card Payment
  const handleKoreanCardPaymentSuccess = async (paymentDetails: KoreanCardPaymentDetails) => {
    setIsCardModalVisible(false);
    setIsSubmittingCardOrder(true);

    const deliveryAddressSnapshot = {
      recipientName: recipientName.trim(),
      phoneNumber: recipientPhone.trim(),
      postalCode: postalCode.trim(),
      address: streetAddress.trim(),
      detailAddress: detailAddress.trim(),
      deliveryInstructions: deliveryNote.trim(),
      country: 'South Korea' as const,
    };

    const customerSnapshot = {
      name: recipientName.trim(),
      email: user?.email || '',
      phoneNumber: recipientPhone.trim(),
    };

    const itemsPayload = cart.map((it) => ({
      productId: it.product.id,
      name: it.product.name,
      imageUrl: it.product.image || (it.product.images && it.product.images[0]) || '',
      quantity: it.quantity,
      originalPrice: it.product.oldPriceKRW || it.product.priceKRW,
      discount: it.product.discountPercent ?? 0,
      finalPrice: it.product.finalPrice ?? it.product.priceKRW,
      subtotal: (it.product.finalPrice ?? it.product.priceKRW) * it.quantity,
      weightKg: it.product.weightKg,
    }));

    try {
      const backendResult = await verifyAndCreateKoreanCardOrder({
        paymentDetails,
        customer: customerSnapshot,
        deliveryAddress: deliveryAddressSnapshot,
        items: itemsPayload,
        subtotal: cartSubtotalKRW,
        totalDiscount: cartDiscountKRW,
        deliveryFee: cartShippingFeeKRW,
        totalAmount: cartTotalKRW,
        userId: user?.id || 'guest',
        originHub: 'Seoul Main Hub',
        destinationCity: 'Seoul',
        shippingMethod: 'Standard',
      });

      let finalOrder: OrderItem;
      if (backendResult?.success && backendResult?.order && backendResult?.order?.firestorePersisted) {
        finalOrder = backendResult.order;
      } else {
        const { createOrderWithStockSafety } = await import('@/services/orderService');
        finalOrder = await createOrderWithStockSafety({
          userId: user?.id || 'guest',
          customer: customerSnapshot,
          deliveryAddress: deliveryAddressSnapshot,
          items: itemsPayload,
          subtotal: cartSubtotalKRW,
          totalDiscount: cartDiscountKRW,
          deliveryFee: cartShippingFeeKRW,
          totalAmount: cartTotalKRW,
          paymentMethod: `Credit/Debit Card 🇰🇷 (${paymentDetails.cardCompany})`,
          paymentStatus: 'paid',
          paymentDetails,
          originHub: 'Seoul Main Hub',
          destinationCity: 'Seoul',
          shippingMethod: 'Standard',
        });
      }

      clearCart();
      setCreatedOrderData(finalOrder);
      setCardReceipt(paymentDetails);
      setIsSubmittingCardOrder(false);
      setCheckoutStep('SUBMITTED');
    } catch (err: any) {
      setIsSubmittingCardOrder(false);
      Alert.alert('Payment Confirmation Notice', err.message || 'Error completing payment verification.');
    }
  };

  // Free shipping threshold
  const freeShippingThreshold = 43000;
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotalKRW);
  const progressRatio = Math.min(1, cartSubtotalKRW / freeShippingThreshold);

  // Step indicator
  const STEPS = [
    { key: 'CART', label: 'Cart', icon: '🛒' },
    { key: 'ADDRESS', label: 'Address', icon: '📍' },
    { key: 'PAYMENT', label: 'Payment', icon: '💳' },
    { key: 'SUBMITTED', label: 'Done', icon: '✓' },
  ];
  const currentStepIndex = STEPS.findIndex((s) => s.key === checkoutStep);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {STEPS.map((step, i) => {
        const isActive = i === currentStepIndex;
        const isCompleted = i < currentStepIndex;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && <View style={[styles.stepLine, isCompleted && styles.stepLineActive]} />}
            <View style={[styles.stepDot, isActive && styles.stepDotActive, isCompleted && styles.stepDotCompleted]}>
              <Text style={[styles.stepDotText, (isActive || isCompleted) && styles.stepDotTextActive]}>
                {isCompleted ? '✓' : step.icon}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );

  // Bill summary (shared)
  const orderTotalForDisplay = createdOrderData?.totalKRW || createdOrderData?.totalAmount || cartTotalKRW;
  const orderSubtotalForDisplay = createdOrderData?.subtotalKRW || createdOrderData?.subtotal || cartSubtotalKRW;
  const orderShippingForDisplay = createdOrderData?.shippingFeeKRW || createdOrderData?.deliveryFee || cartShippingFeeKRW;
  const orderDiscountForDisplay = createdOrderData?.discountKRW || createdOrderData?.totalDiscount || cartDiscountKRW;

  const renderBillSummary = () => (
    <View style={styles.billCard}>
      <Text style={styles.billTitle}>{t('billSummary')}</Text>
      <View style={styles.billRow}>
        <Text style={styles.billLabel}>{t('subtotal')}</Text>
        <Text style={styles.billValue}>{formatPrice(checkoutStep === 'CART' ? cartSubtotalKRW : orderSubtotalForDisplay)}</Text>
      </View>
      <View style={styles.billRow}>
        <Text style={styles.billLabel}>{t('shippingFee')}</Text>
        <Text style={styles.billValue}>
          {(checkoutStep === 'CART' ? cartShippingFeeKRW : orderShippingForDisplay) === 0
            ? 'FREE' : formatPrice(checkoutStep === 'CART' ? cartShippingFeeKRW : orderShippingForDisplay)}
        </Text>
      </View>
      {(checkoutStep === 'CART' ? cartDiscountKRW : orderDiscountForDisplay) > 0 && (
        <View style={styles.billRow}>
          <Text style={styles.discountLabel}>{t('discount')}</Text>
          <Text style={styles.discountValue}>−{formatPrice(checkoutStep === 'CART' ? cartDiscountKRW : orderDiscountForDisplay)}</Text>
        </View>
      )}
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>{t('totalAmount')}</Text>
          <Text style={styles.taxInclusive}>Incl. VAT & delivery fee</Text>
        </View>
        <Text style={styles.totalAmount}>{formatPrice(checkoutStep === 'CART' ? cartTotalKRW : orderTotalForDisplay)}</Text>
      </View>
    </View>
  );

  return (
    <>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#121212' : '#F8F7F3'} />
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (checkoutStep === 'CART') router.replace('/');
              else if (checkoutStep === 'ADDRESS') setCheckoutStep('CART');
              else if (checkoutStep === 'PAYMENT') {
                Alert.alert('Go Back?', 'Your order has been created. You can submit payment later from the Orders page.', [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Go Back', onPress: () => setCheckoutStep('ADDRESS') },
                ]);
              } else if (checkoutStep === 'SUBMITTED') router.replace('/orders');
            }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>
              {checkoutStep === 'CART' && `${t('cartTitle')} & Checkout`}
              {checkoutStep === 'ADDRESS' && 'Confirm Delivery Address'}
              {checkoutStep === 'PAYMENT' && 'Payment'}
              {checkoutStep === 'SUBMITTED' && 'Payment Submitted'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {checkoutStep === 'CART' && `${cartCount} ${cartCount === 1 ? 'item' : 'items'} • ${cartTotalWeightKg} kg total`}
              {checkoutStep === 'ADDRESS' && '배송지 확인'}
              {checkoutStep === 'PAYMENT' && (createdOrderNumber ? `Order ${createdOrderNumber}` : '결제')}
              {checkoutStep === 'SUBMITTED' && '입금 확인 대기 중'}
            </Text>
          </View>
          {checkoutStep === 'CART' && cart.length > 0 && (
            <TouchableOpacity onPress={() => Alert.alert('Clear Cart', 'Remove all items from your cart?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: clearCart },
            ])}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderStepIndicator()}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ═══ STEP 1: CART ═══ */}
          {checkoutStep === 'CART' && (
            <>
              <View style={styles.freeShippingCard}>
                <View style={styles.freeShippingHeader}>
                  <Text style={styles.freeShippingTitle}>
                    {amountNeededForFreeShipping === 0 || appliedCoupon?.code === 'FREESHIP'
                      ? '🎉 You unlocked FREE Korean Domestic Delivery!'
                      : `Add ${formatPrice(amountNeededForFreeShipping)} more for FREE Delivery`}
                  </Text>
                  <Text style={styles.freeShippingIcon}>🚚</Text>
                </View>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: appliedCoupon?.code === 'FREESHIP' ? '100%' : `${progressRatio * 100}%` }]} />
                </View>
              </View>

              {cart.length === 0 ? (
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyIcon}>🛒</Text>
                  <Text style={styles.emptyTitle}>{t('cartEmpty')}</Text>
                  <Text style={styles.emptySubtitle}>Add authentic groceries, spices & parcel items to order across South Korea.</Text>
                  <TouchableOpacity style={styles.browseButton} activeOpacity={0.85} onPress={() => router.replace('/')}>
                    <Text style={styles.browseButtonText}>{t('startShopping')} →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionHeading}>Shipment Items ({cart.length})</Text>
                    {cart.map(({ product, quantity }) => (
                      <View key={product.id} style={styles.cartItemCard}>
                        <Image source={{ uri: product.image }} style={styles.itemImage} />
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName} numberOfLines={2}>{product.name}</Text>
                          <Text style={styles.itemMeta}>{product.size} • {product.weightKg} kg/unit • {product.origin}</Text>
                          <Text style={styles.itemPrice}>{formatPrice((product.finalPrice ?? product.priceKRW) * quantity)}</Text>
                          {product.stock !== undefined && product.stock <= 0 && (
                            <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800', marginTop: 2 }}>⚠️ Out of Stock</Text>
                          )}
                        </View>
                        <View style={styles.quantityContainer}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQuantity(product.id, quantity - 1)}>
                            <Text style={styles.qtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{quantity}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQuantity(product.id, quantity + 1)}>
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => removeFromCart(product.id)}>
                            <Text style={styles.deleteBtnText}>🗑</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                  {renderBillSummary()}
                  <TouchableOpacity style={styles.checkoutBtn} onPress={handleContinueToAddress} activeOpacity={0.88}>
                    <View style={styles.btnContentRow}>
                      <Text style={styles.checkoutBtnText}>Continue to Delivery Address →</Text>
                      <Text style={styles.checkoutBtnAmount}>{formatPrice(cartTotalKRW)}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* ═══ STEP 2: ADDRESS ═══ */}
          {checkoutStep === 'ADDRESS' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>📍 Delivery Address 🇰🇷 (대한민국 배송지)</Text>
                {koreanAddresses.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addressChipsScroll}>
                    {koreanAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <TouchableOpacity key={addr.id} style={[styles.addressChip, isSelected && styles.addressChipActive]} onPress={() => handleSelectSavedAddress(addr.id)}>
                          <Text style={[styles.addressChipText, isSelected && styles.addressChipTextActive]}>📍 {addr.label || addr.title || 'Address'} ({addr.recipientName})</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                <View style={styles.addressCard}>
                  <View style={styles.addressForm}>
                    <View style={styles.formRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.formLabel}>받는 분 성함 (Name) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <TextInput style={styles.formInput} value={recipientName} onChangeText={setRecipientName} placeholder="Full Name" placeholderTextColor="#999" />
                      </View>
                      <View style={{ flex: 1.2, marginLeft: 8 }}>
                        <Text style={styles.formLabel}>연락처 (Phone) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <TextInput style={styles.formInput} value={recipientPhone} onChangeText={setRecipientPhone} placeholder="010-XXXX-XXXX" placeholderTextColor="#999" keyboardType="phone-pad" />
                      </View>
                    </View>
                    <View>
                      <Text style={styles.formLabel}>도로명 주소 (Full Address) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                      <TextInput style={styles.formInput} value={streetAddress} onChangeText={setStreetAddress} placeholder="Street / Road name address" placeholderTextColor="#999" />
                    </View>
                    <View>
                      <Text style={styles.formLabel}>상세 주소 (Apartment / Unit / Floor)</Text>
                      <TextInput style={styles.formInput} value={detailAddress} onChangeText={setDetailAddress} placeholder="e.g. 101동 202호" placeholderTextColor="#999" />
                    </View>
                    <View style={styles.formRow}>
                      <View style={{ width: 120, marginRight: 8 }}>
                        <Text style={styles.formLabel}>우편번호 (Zip) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <TextInput style={styles.formInput} value={postalCode} onChangeText={setPostalCode} placeholder="06000" placeholderTextColor="#999" keyboardType="numeric" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.formLabel}>도시 (City)</Text>
                        <TextInput style={styles.formInput} value={city} onChangeText={setCity} placeholder="Seoul" placeholderTextColor="#999" />
                      </View>
                    </View>
                    <View>
                      <Text style={styles.formLabel}>국가 (Country)</Text>
                      <View style={[styles.formInput, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F3F4F6' }]}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#CCC' : '#555' }}>🇰🇷 South Korea</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={styles.formLabel}>배송 요청사항 (Delivery Notes)</Text>
                      <TextInput style={styles.formInput} value={deliveryNote} onChangeText={setDeliveryNote} placeholder="e.g. 문 앞에 놓아주세요" placeholderTextColor="#999" />
                    </View>
                  </View>
                </View>
              </View>

              {recipientName.trim() && streetAddress.trim() && (
                <View style={[styles.addressCard, { marginBottom: 16 }]}>
                  <View style={styles.addressHeaderRow}>
                    <View style={styles.koreaBadge}><Text style={styles.koreaBadgeText}>🇰🇷 CJ대한통운 직배송</Text></View>
                    <Text style={styles.addressZip}>우편번호: {postalCode}</Text>
                  </View>
                  <Text style={styles.addressRecipientName}>{recipientName} • 📞 {recipientPhone}</Text>
                  <Text style={styles.addressFullText}>{streetAddress}{detailAddress ? `, ${detailAddress}` : ''}</Text>
                  {deliveryNote ? (
                    <View style={styles.deliveryNoteRow}>
                      <Text style={styles.deliveryNoteTag}>요청사항:</Text>
                      <Text style={styles.deliveryNoteText}>{deliveryNote}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {renderBillSummary()}

              <TouchableOpacity style={[styles.checkoutBtn, isCreatingOrder && styles.checkoutBtnDisabled]} onPress={handleConfirmAddressAndPay} disabled={isCreatingOrder} activeOpacity={0.88}>
                {isCreatingOrder ? (
                  <View style={styles.loadingBtnRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.checkoutBtnText}>Creating Order...</Text>
                  </View>
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.checkoutBtnText}>Confirm Address & Continue to Payment →</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ═══ STEP 3: PAYMENT ═══ */}
          {checkoutStep === 'PAYMENT' && (
            <>
              <View style={[styles.addressCard, { marginBottom: 16 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.sectionHeading, { marginBottom: 0 }]}>Order {createdOrderNumber}</Text>
                  <View style={styles.pendingPill}><Text style={styles.pendingPillText}>⏳ Awaiting Payment</Text></View>
                </View>
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? '#A0A0A0' : '#8A857A', marginBottom: 4 }}>Delivery Address (배송지)</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#FFF' : '#212121' }}>{recipientName} • 📞 {recipientPhone}</Text>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#A0A0A0' : '#666', marginTop: 2 }}>{streetAddress}{detailAddress ? `, ${detailAddress}` : ''} ({postalCode})</Text>
                </View>
                <View style={styles.divider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#FFF' : '#212121' }}>Amount to Pay</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: isDarkMode ? '#D4AF37' : '#C88D2B' }}>{formatPrice(orderTotalForDisplay)}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Payment Method (결제 수단)</Text>
                <TouchableOpacity style={[styles.paymentMethodCard, paymentMethodType === 'KOREAN_CARD' && styles.paymentMethodCardActive]} onPress={() => setPaymentMethodType('KOREAN_CARD')} activeOpacity={0.88}>
                  <View style={styles.pmHeaderRow}>
                    <View style={styles.pmRadio}>{paymentMethodType === 'KOREAN_CARD' && <View style={styles.pmRadioInner} />}</View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pmTitleRow}>
                        <Text style={styles.pmTitle}>Credit/Debit Card 🇰🇷 (신용/체크카드)</Text>
                        <View style={styles.fastBadge}><Text style={styles.fastBadgeText}>⚡️ INSTANT</Text></View>
                      </View>
                      <Text style={styles.pmSubtitle}>신한, 국민, 삼성, 현대, 롯데, 하나, 우리, 농협 등</Text>
                    </View>
                  </View>
                  {paymentMethodType === 'KOREAN_CARD' && (
                    <>
                      <View style={styles.cardLogosRow}>
                        {KOREAN_CARD_LOGOS.map((c) => (
                          <View key={c.name} style={[styles.cardLogoPill, { backgroundColor: isDarkMode ? '#2D2D30' : '#F1F3F5' }]}>
                            <View style={[styles.cardLogoDot, { backgroundColor: c.color }]} />
                            <Text style={[styles.cardLogoText, { color: isDarkMode ? '#E0E0E0' : '#333333' }]}>{c.name}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.pmBenefitBox}><Text style={styles.pmBenefitText}>🔒 256-bit SSL 보안결제 • 무이자 할부 지원</Text></View>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.paymentMethodCard, paymentMethodType === 'BANK_TRANSFER' && styles.paymentMethodCardActive, { marginTop: 10 }]} onPress={() => setPaymentMethodType('BANK_TRANSFER')} activeOpacity={0.88}>
                  <View style={styles.pmHeaderRow}>
                    <View style={styles.pmRadio}>{paymentMethodType === 'BANK_TRANSFER' && <View style={styles.pmRadioInner} />}</View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pmTitle}>Direct Bank Transfer (계좌이체)</Text>
                      <Text style={styles.pmSubtitle}>Transfer from any Korean bank account</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {paymentMethodType === 'BANK_TRANSFER' && (
                  <View style={{ marginTop: 12 }}>
                    <BankTransferCard
                      orderAmountKRW={orderTotalForDisplay}
                      orderIdPreview={createdOrderNumber || 'NM-PREVIEW'}
                      senderName={senderName}
                      onChangeSenderName={setSenderName}
                      transferredAmount={transferredAmount}
                      onChangeTransferredAmount={setTransferredAmount}
                      paymentScreenshot={paymentScreenshot}
                      onSelectScreenshot={setPaymentScreenshot}
                      isDarkMode={isDarkMode}
                      bankSettings={bankSettings}
                      isUploading={isSubmittingBankOrder}
                      uploadProgress={uploadProgress}
                    />
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, paymentMethodType === 'KOREAN_CARD' && styles.checkoutBtnCard, (isSubmittingCardOrder || isSubmittingBankOrder) && styles.checkoutBtnDisabled]}
                onPress={() => { if (paymentMethodType === 'KOREAN_CARD') setIsCardModalVisible(true); else handleSubmitPayment(); }}
                disabled={isSubmittingCardOrder || isSubmittingBankOrder}
                activeOpacity={0.88}
              >
                {isSubmittingCardOrder || isSubmittingBankOrder ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Text style={styles.checkoutBtnText}>
                      {paymentMethodType === 'KOREAN_CARD' ? '💳 Pay with Korean Card' : 'Submit Payment Proof (입금 확인증 제출)'}
                    </Text>
                    <Text style={styles.checkoutBtnAmount}>{formatPrice(orderTotalForDisplay)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* ═══ STEP 4: SUBMITTED ═══ */}
          {checkoutStep === 'SUBMITTED' && (
            <View style={{ alignItems: 'center', paddingTop: 20 }}>
              <View style={styles.modalSuccessBadge}>
                <Text style={styles.modalSuccessIcon}>{cardReceipt ? '🎉' : '⏳'}</Text>
              </View>
              <Text style={styles.modalTitle}>
                {cardReceipt ? 'Order Placed Successfully!' : '✓ Payment Submitted'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {cardReceipt
                  ? 'Your order has been confirmed and registered for CJ Logistics dispatch.'
                  : 'Your payment is being verified.\nYour order will be confirmed after payment verification.'}
              </Text>

              <View style={styles.modalOrderDetails}>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Order Number:</Text>
                  <Text style={styles.modalDetailValueBold}>{createdOrderNumber || createdOrderData?.orderNumber}</Text>
                </View>
                {createdOrderData?.trackingNumber && (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Tracking Airway Bill:</Text>
                    <Text style={styles.modalTrackingCode}>{createdOrderData.trackingNumber}</Text>
                  </View>
                )}

                {cardReceipt && (
                  <View style={styles.cardReceiptBox}>
                    <View style={styles.receiptHeaderRow}>
                      <Text style={styles.receiptHeaderTitle}>💳 카드 결제 영수증 (PAID)</Text>
                      <View style={styles.paidPill}><Text style={styles.paidPillText}>결제완료 (PAID)</Text></View>
                    </View>
                    <View style={styles.receiptDivider} />
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>결제 카드사:</Text><Text style={styles.receiptValue}>{cardReceipt.cardCompany}</Text></View>
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>카드 번호:</Text><Text style={styles.receiptValue}>{cardReceipt.cardNumberMasked}</Text></View>
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>승인 번호:</Text><Text style={styles.receiptValueBold}>{cardReceipt.approvalNumber}</Text></View>
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>결제 금액:</Text><Text style={styles.receiptValueAmount}>₩{cardReceipt.paidAmount.toLocaleString()}</Text></View>
                  </View>
                )}

                {!cardReceipt && (
                  <View style={styles.bankPendingReceiptBox}>
                    <View style={styles.receiptHeaderRow}>
                      <Text style={styles.bankPendingHeaderTitle}>🏦 계좌이체 (Bank Transfer)</Text>
                      <View style={styles.pendingPill}><Text style={styles.pendingPillText}>🟡 Pending Verification</Text></View>
                    </View>
                    <View style={styles.receiptDivider} />
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>입금 은행:</Text><Text style={styles.receiptValue}>{bankSettings.bankName}</Text></View>
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>입금 계좌번호:</Text><Text style={styles.receiptValueBold}>{bankSettings.accountNumber}</Text></View>
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>예금주 / 입금자명:</Text><Text style={styles.receiptValue}>{bankSettings.accountHolder} / {senderName || recipientName}</Text></View>
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>입금 금액:</Text><Text style={styles.receiptValueAmount}>₩{orderTotalForDisplay.toLocaleString()}</Text></View>
                    <View style={styles.receiptRow}><Text style={styles.receiptLabel}>입금 확인 상태:</Text><Text style={styles.pendingStatusText}>🟡 입금 확인 대기 중</Text></View>
                    <Text style={styles.pendingDescriptionText}>
                      We have received your payment proof. Your order will be confirmed after admin verification.
                    </Text>
                  </View>
                )}

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Delivery Address:</Text>
                  <Text style={styles.modalDetailValue}>{recipientName}, {streetAddress}{detailAddress ? `, ${detailAddress}` : ''}</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Estimated Delivery:</Text>
                  <Text style={styles.modalDetailValue}>1-2 Days (CJ Logistics Direct)</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.modalTrackBtn} onPress={() => router.replace('/orders')}>
                <Text style={styles.modalTrackBtnText}>VIEW IN ORDERS & TRACK →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalHomeBtn} onPress={() => router.replace('/')}>
                <Text style={styles.modalHomeBtnText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* KOREAN CARD PG PAYMENT WINDOW MODAL */}
        <KoreanCardPaymentModal
          visible={isCardModalVisible}
          amountKRW={orderTotalForDisplay}
          orderNumber={createdOrderNumber || `NM-${new Date().getFullYear()}-PREVIEW`}
          customerName={recipientName}
          itemsSummary={`${cart[0]?.product.name || createdOrderData?.items?.[0]?.name || 'Order Items'}${(cart.length || createdOrderData?.items?.length || 1) > 1 ? ` 외 ${(cart.length || createdOrderData?.items?.length || 1) - 1}건` : ''}`}
          onSuccess={handleKoreanCardPaymentSuccess}
          onCancel={() => setIsCardModalVisible(false)}
          isDarkMode={isDarkMode}
        />

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
  const brandBlue = '#0064FF';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, backgroundColor: cardBg, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: border },
    backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? '#2D271E' : '#F5EEDC', justifyContent: 'center', alignItems: 'center' },
    backArrow: { fontSize: 18, color: textMain, fontWeight: '800' },
    headerTitle: { fontSize: 17, fontWeight: '800', color: textMain },
    headerSubtitle: { fontSize: 11, color: textSub, marginTop: 2 },
    clearText: { fontSize: 13, fontWeight: '700', color: '#E53935' },

    // Step Indicator
    stepIndicatorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, backgroundColor: cardBg, borderBottomWidth: 1, borderBottomColor: border },
    stepLine: { flex: 1, height: 2, backgroundColor: isDark ? '#333' : '#E0E0E0', marginHorizontal: 4, borderRadius: 1 },
    stepLineActive: { backgroundColor: accent },
    stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#262626' : '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: isDark ? '#444' : '#D1D5DB' },
    stepDotActive: { backgroundColor: isDark ? '#2D271E' : '#FFF9ED', borderColor: accent },
    stepDotCompleted: { backgroundColor: accent, borderColor: accent },
    stepDotText: { fontSize: 12, fontWeight: '800', color: textSub },
    stepDotTextActive: { color: '#FFF' },

    scrollContent: { padding: 16, paddingBottom: 20 },
    freeShippingCard: { backgroundColor: isDark ? '#2D271E' : '#FFF9ED', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#4D3B18' : '#F3E1BA' },
    freeShippingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    freeShippingTitle: { fontSize: 12, fontWeight: '800', color: accent, flex: 1 },
    freeShippingIcon: { fontSize: 18, marginLeft: 8 },
    progressBarBackground: { height: 6, backgroundColor: isDark ? '#262626' : '#EFEBE4', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: accent, borderRadius: 3 },
    emptyCart: { padding: 40, alignItems: 'center', backgroundColor: cardBg, borderRadius: 20, marginTop: 20, borderWidth: isDark ? 1 : 0, borderColor: border },
    emptyIcon: { fontSize: 54, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: textMain },
    emptySubtitle: { fontSize: 12, color: textSub, textAlign: 'center', marginTop: 6, lineHeight: 18, marginBottom: 20 },
    browseButton: { backgroundColor: accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    browseButtonText: { color: isDark ? '#121212' : '#FFFFFF', fontSize: 12, fontWeight: '800' },
    section: { marginBottom: 20 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionHeading: { fontSize: 14, fontWeight: '800', color: textMain, marginBottom: 8, letterSpacing: 0.3 },
    toggleEditBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: isDark ? '#2D271E' : '#F5EEDC' },
    toggleEditText: { fontSize: 11, fontWeight: '700', color: accent },
    cartItemCard: { backgroundColor: cardBg, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.3 : 0.04, shadowRadius: 4, elevation: 1, borderWidth: isDark ? 1 : 0, borderColor: border },
    itemImage: { width: 65, height: 65, borderRadius: 10, backgroundColor: cardBgElevated },
    itemInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
    itemName: { fontSize: 13, fontWeight: '700', color: textMain, lineHeight: 17 },
    itemMeta: { fontSize: 10, color: textSub, marginTop: 3 },
    itemPrice: { fontSize: 13, fontWeight: '800', color: accent, marginTop: 4 },
    quantityContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#262626' : '#F8F7F3', borderRadius: 10, padding: 3 },
    qtyBtn: { width: 26, height: 26, backgroundColor: cardBg, borderRadius: 6, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.3 : 0.05, shadowRadius: 2, borderWidth: isDark ? 1 : 0, borderColor: border },
    qtyBtnText: { fontSize: 14, fontWeight: '800', color: textMain },
    qtyText: { fontSize: 12, fontWeight: '800', color: textMain, marginHorizontal: 8 },
    deleteBtn: { marginLeft: 6, padding: 4 },
    deleteBtnText: { fontSize: 14 },

    // Address
    addressChipsScroll: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    addressChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: cardBg, borderWidth: 1, borderColor: border },
    addressChipActive: { borderColor: accent, backgroundColor: isDark ? '#2D271E' : '#FFF9ED' },
    addressChipText: { fontSize: 11, color: textSub, fontWeight: '600' },
    addressChipTextActive: { color: accent, fontWeight: '800' },
    addressCard: { backgroundColor: cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.2 : 0.03, shadowRadius: 4, elevation: 1 },
    addressDisplay: { gap: 4 },
    addressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    koreaBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    koreaBadgeText: { fontSize: 10, fontWeight: '800', color: '#2E7D32' },
    addressZip: { fontSize: 11, fontWeight: '700', color: textSub },
    addressRecipientName: { fontSize: 14, fontWeight: '800', color: textMain },
    addressFullText: { fontSize: 12, color: textSub, lineHeight: 17, marginTop: 2 },
    deliveryNoteRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: border },
    deliveryNoteTag: { fontSize: 10, fontWeight: '800', color: accent, marginRight: 4 },
    deliveryNoteText: { fontSize: 11, color: textSub, fontStyle: 'italic' },
    addressForm: { gap: 8 },
    formRow: { flexDirection: 'row' },
    formLabel: { fontSize: 10, fontWeight: '700', color: textSub, marginBottom: 4 },
    formInput: { backgroundColor: isDark ? '#262626' : '#F9FAFB', borderWidth: 1, borderColor: border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, fontWeight: '700', color: textMain },

    // Payment
    paymentMethodCard: { backgroundColor: cardBg, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: border },
    paymentMethodCardActive: { borderColor: brandBlue, backgroundColor: isDark ? '#142033' : '#F5F9FF' },
    pmHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
    pmRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: brandBlue, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2 },
    pmRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: brandBlue },
    pmTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    pmTitle: { fontSize: 14, fontWeight: '800', color: textMain },
    fastBadge: { backgroundColor: '#0064FF', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
    fastBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
    pmSubtitle: { fontSize: 11, color: textSub, marginTop: 3, lineHeight: 15 },
    cardLogosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: border },
    cardLogoPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
    cardLogoDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 4 },
    cardLogoText: { fontSize: 9, fontWeight: '700' },
    pmBenefitBox: { marginTop: 8, backgroundColor: isDark ? '#1C2E4A' : '#EAF2FF', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
    pmBenefitText: { fontSize: 10, fontWeight: '700', color: '#0064FF' },

    // Bill
    billCard: { backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: border },
    billTitle: { fontSize: 14, fontWeight: '800', color: textMain, marginBottom: 12 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    billLabel: { fontSize: 12, color: textSub },
    billValue: { fontSize: 12, fontWeight: '700', color: textMain },
    discountLabel: { fontSize: 12, color: '#10B981', fontWeight: '700' },
    discountValue: { fontSize: 12, fontWeight: '800', color: '#10B981' },
    divider: { height: 1, backgroundColor: border, marginVertical: 10 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    totalLabel: { fontSize: 14, fontWeight: '800', color: textMain },
    taxInclusive: { fontSize: 10, color: textSub, marginTop: 1 },
    totalAmount: { fontSize: 18, fontWeight: '900', color: accent },

    // Buttons
    checkoutBtn: { backgroundColor: accent, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    checkoutBtnCard: { backgroundColor: '#0064FF', shadowColor: '#0064FF' },
    btnContentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    loadingBtnRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    checkoutBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    checkoutBtnDisabled: { opacity: 0.5 },
    checkoutBtnAmount: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },

    // Success
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: cardBg, borderRadius: 24, padding: 24, width: '100%', maxWidth: 500, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    modalSuccessBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: isDark ? '#1C2E4A' : '#E8F2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    modalSuccessIcon: { fontSize: 30 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: textMain, textAlign: 'center' },
    modalSubtitle: { fontSize: 12, color: textSub, textAlign: 'center', marginTop: 4, lineHeight: 16, marginBottom: 16 },
    modalOrderDetails: { backgroundColor: isDark ? '#262626' : '#F9FAFB', borderRadius: 16, padding: 14, width: '100%', borderWidth: 1, borderColor: border, marginBottom: 16, gap: 8 },
    modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    modalDetailLabel: { fontSize: 11, color: textSub, fontWeight: '600' },
    modalDetailValue: { fontSize: 11, fontWeight: '700', color: textMain, flex: 1, textAlign: 'right', marginLeft: 8 },
    modalDetailValueBold: { fontSize: 13, fontWeight: '900', color: accent },
    modalTrackingCode: { fontSize: 12, fontWeight: '900', color: '#0064FF', fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }) },
    cardReceiptBox: { backgroundColor: isDark ? '#14243B' : '#EBF4FF', borderRadius: 12, padding: 10, marginVertical: 4, borderWidth: 1, borderColor: '#0064FF', gap: 4 },
    receiptHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    receiptHeaderTitle: { fontSize: 11, fontWeight: '800', color: '#0064FF' },
    paidPill: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    paidPillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
    receiptDivider: { height: 1, backgroundColor: isDark ? '#1F385C' : '#D0E3FF', marginVertical: 4 },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    receiptLabel: { fontSize: 10, color: isDark ? '#93C5FD' : '#4B6B94', fontWeight: '600' },
    receiptValue: { fontSize: 10, color: textMain, fontWeight: '700' },
    receiptValueBold: { fontSize: 11, color: '#0064FF', fontWeight: '800' },
    receiptValueMono: { fontSize: 9, color: textSub, fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }) },
    receiptValueAmount: { fontSize: 12, fontWeight: '900', color: '#0064FF' },
    bankPendingReceiptBox: { backgroundColor: isDark ? '#2D271E' : '#FFFBEB', borderRadius: 12, padding: 12, marginVertical: 4, borderWidth: 1, borderColor: isDark ? '#554124' : '#FDE68A', gap: 4 },
    bankPendingHeaderTitle: { fontSize: 11, fontWeight: '800', color: isDark ? '#FDE68A' : '#92400E' },
    pendingPill: { backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    pendingPillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
    pendingStatusText: { fontSize: 10, fontWeight: '800', color: isDark ? '#FDE68A' : '#D97706' },
    pendingDescriptionText: { fontSize: 10, lineHeight: 14, color: isDark ? '#E5E7EB' : '#4B5563', marginTop: 4, fontStyle: 'italic' },
    modalTrackBtn: { backgroundColor: '#0064FF', borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
    modalTrackBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    modalHomeBtn: { paddingVertical: 10, width: '100%', alignItems: 'center' },
    modalHomeBtnText: { color: textSub, fontSize: 13, fontWeight: '700' },
  });
};
