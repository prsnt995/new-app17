import React, { useState } from 'react';
import {
  Alert,
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

interface ParcelItem {
  id: string;
  category: string;
  name: string;
  quantity: number;
  weightKg: number;
  unitPriceKRW: number;
  calculatedPriceKRW: number;
  isPerPiece?: boolean;
}

const PARCEL_CATEGORIES = [
  {
    id: 'mobile',
    title: 'Mobile Phone',
    icon: '📱',
    badge: '₹3,000 INR / unit',
    rateDescription: 'Special customs duty + air express included (₹3,000 / ₩48,000 per phone)',
    unitPriceKRW: 48000, // ~3000 INR
    isPerPiece: true,
    defaultWeight: 0.4,
    defaultName: 'Smartphone / Mobile Device',
  },
  {
    id: 'clothes',
    title: 'Clothes & Garments',
    icon: '👕',
    badge: '₩15,000 / kg',
    rateDescription: 'Textiles, shirts, sarees, jackets & winterwear priced by weight at ₩15,000/kg',
    unitPriceKRW: 15000,
    isPerPiece: false,
    defaultWeight: 2.0,
    defaultName: 'Clothes & Apparel (KG)',
  },
  {
    id: 'laptop',
    title: 'Laptop & Electronics',
    icon: '💻',
    badge: '₹4,500 INR / unit',
    rateDescription: 'Laptops, tablets, smart watches & gadgets (₹4,500 / ₩72,000 per device)',
    unitPriceKRW: 72000, // ~4500 INR
    isPerPiece: true,
    defaultWeight: 2.2,
    defaultName: 'Laptop / Tablet Device',
  },
  {
    id: 'food',
    title: 'Dry Food & Spices',
    icon: '🍲',
    badge: '₩12,000 / kg',
    rateDescription: 'Packaged dry foods, sweets, noodles & spices at ₩12,000/kg',
    unitPriceKRW: 12000,
    isPerPiece: false,
    defaultWeight: 2.0,
    defaultName: 'Packaged Dry Food & Snacks',
  },
  {
    id: 'documents',
    title: 'Documents & Certificates',
    icon: '📚',
    badge: '₩10,000 Flat',
    rateDescription: 'Passports, degree certificates, legal papers & letters (Fast Air)',
    unitPriceKRW: 10000,
    isPerPiece: true,
    defaultWeight: 0.3,
    defaultName: 'Official Documents & Papers',
  },
  {
    id: 'cosmetics',
    title: 'Cosmetics & Gifts',
    icon: '🎁',
    badge: '₩14,000 / kg',
    rateDescription: 'Korean skincare, cosmetics, personal gifts & household items at ₩14,000/kg',
    unitPriceKRW: 14000,
    isPerPiece: false,
    defaultWeight: 1.5,
    defaultName: 'Cosmetics & Personal Gifts',
  },
];

export default function SendParcelScreen() {
  const router = useRouter();
  const { user, formatPrice, createOrder, t } = useApp();

  // Selected Category Builder State
  const [selectedCatId, setSelectedCatId] = useState('mobile');
  const [customItemName, setCustomItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemWeight, setItemWeight] = useState(1);

  // Parcel Box Items
  const [parcelItems, setParcelItems] = useState<ParcelItem[]>([
    {
      id: 'item-1',
      category: 'Mobile Phone',
      name: 'Samsung / iPhone Mobile Device',
      quantity: 1,
      weightKg: 0.4,
      unitPriceKRW: 48000, // ₹3,000 INR
      calculatedPriceKRW: 48000,
      isPerPiece: true,
    },
    {
      id: 'item-2',
      category: 'Clothes & Garments',
      name: 'Winter Jackets & Cotton Clothes',
      quantity: 1,
      weightKg: 3.0,
      unitPriceKRW: 15000, // ₩15,000/kg
      calculatedPriceKRW: 45000, // 3kg * 15,000
      isPerPiece: false,
    },
  ]);

  // Destination & Pickup State
  const [destinationCountry, setDestinationCountry] = useState<'India' | 'Nepal'>('India');
  const [selectedAddressId, setSelectedAddressId] = useState(user.savedAddresses[0]?.id || '');
  const [recipientName, setRecipientName] = useState(user.savedAddresses[0]?.recipientName || 'Rahul Sharma');
  const [recipientPhone, setRecipientPhone] = useState(user.savedAddresses[0]?.phone || '+91 98765 43210');
  const [recipientAddress, setRecipientAddress] = useState(user.savedAddresses[0]?.fullAddress || 'Flat 402, Sunshine Heights, Sector 14, Dwarka');
  const [recipientCity, setRecipientCity] = useState(user.savedAddresses[0]?.city || 'New Delhi');
  const [recipientPostal, setRecipientPostal] = useState(user.savedAddresses[0]?.postalCode || '110075');

  // Korea Origin & Scheduling
  const [koreaHub, setKoreaHub] = useState('Seoul Gangnam Main Hub');
  const [pickupDate, setPickupDate] = useState('Tomorrow (Aug 18)');
  const [pickupSlot, setPickupSlot] = useState('Afternoon (12:00 PM - 06:00 PM)');

  // Simplified Payment Method Options: Pay Now vs Cash on Delivery
  const [paymentOption, setPaymentOption] = useState<'PAY_NOW' | 'CASH_ON_DELIVERY'>('PAY_NOW');

  // Success Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [bookedOrder, setBookedOrder] = useState<OrderItem | null>(null);

  const activeCategoryConfig = PARCEL_CATEGORIES.find((c) => c.id === selectedCatId) || PARCEL_CATEGORIES[0];

  // Add Item to Parcel Box
  const handleAddItem = () => {
    const isPerPiece = activeCategoryConfig.isPerPiece;
    const qty = Math.max(1, itemQty);
    const weight = isPerPiece ? activeCategoryConfig.defaultWeight * qty : Math.max(0.5, itemWeight);
    const price = isPerPiece
      ? activeCategoryConfig.unitPriceKRW * qty
      : Math.round(activeCategoryConfig.unitPriceKRW * weight);

    const newItem: ParcelItem = {
      id: `pitem-${Date.now()}`,
      category: activeCategoryConfig.title,
      name: customItemName.trim() || activeCategoryConfig.defaultName,
      quantity: qty,
      weightKg: Number(weight.toFixed(1)),
      unitPriceKRW: activeCategoryConfig.unitPriceKRW,
      calculatedPriceKRW: price,
      isPerPiece,
    };

    setParcelItems((prev) => [...prev, newItem]);
    setCustomItemName('');
    setItemQty(1);
    setItemWeight(isPerPiece ? 1 : 2);
    Alert.alert('Item Added', `${newItem.name} added to your parcel box.`);
  };

  const handleRemoveItem = (id: string) => {
    setParcelItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculations
  const totalParcelWeightKg = Number(
    parcelItems.reduce((s, i) => s + i.weightKg, 0).toFixed(2)
  );

  const parcelSubtotalKRW = parcelItems.reduce(
    (s, i) => s + i.calculatedPriceKRW,
    0
  );

  const grandTotalKRW = parcelSubtotalKRW;

  const handleBookShipment = () => {
    if (parcelItems.length === 0) {
      Alert.alert('Parcel Box Empty', 'Please add at least one item to your parcel box.');
      return;
    }

    if (!recipientName || !recipientAddress || !recipientCity) {
      Alert.alert('Missing Address', 'Please provide recipient name, street address, and city.');
      return;
    }

    const order = createOrder({
      originHub: koreaHub,
      destinationCity: recipientCity,
      destinationCountry,
      shippingMethod: 'Express',
      paymentMethod:
        paymentOption === 'PAY_NOW'
          ? 'Payment Now (Online / Card / UPI)'
          : 'Payment After Parcel Received (Cash on Delivery)',
      recipient: {
        name: recipientName,
        phone: recipientPhone,
        address: recipientAddress,
        city: recipientCity,
        postalCode: recipientPostal,
        country: destinationCountry,
      },
    });

    setBookedOrder(order);
    setIsSuccessModalOpen(true);
  };

  const handleSelectSavedAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    const addr = user.savedAddresses.find((a) => a.id === addrId);
    if (addr) {
      setRecipientName(addr.recipientName);
      setRecipientPhone(addr.phone);
      setRecipientAddress(addr.fullAddress);
      setRecipientCity(addr.city);
      setRecipientPostal(addr.postalCode);
      setDestinationCountry(addr.country === 'Nepal' ? 'Nepal' : 'India');
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
            <Text style={styles.headerTitle}>{t('sendParcelTitle')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('sendParcelSubtitle')}
            </Text>
          </View>

          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>📦 {totalParcelWeightKg} kg</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* BANNER PROMO */}
          <View style={styles.heroBanner}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>CUSTOM PARCEL SERVICE</Text>
              </View>
              <Text style={styles.heroTitle}>Ship Directly to India & Nepal ✈️</Text>
              <Text style={styles.heroDesc}>
                Special rates: Mobile Phones @ ₹3,000 INR • Clothes @ ₩15,000/kg
              </Text>
            </View>
            <Text style={styles.heroEmoji}>🇰🇷 ➔ 🇮🇳 🇳🇵</Text>
          </View>

          {/* STEP 1: WHAT DO YOU WANT TO SEND HOME? */}
          <View style={styles.sectionCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>STEP 1</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('step1Title')}</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              {t('step1Subtitle')}
            </Text>

            {/* CATEGORIES GRID */}
            <View style={styles.categoryGrid}>
              {PARCEL_CATEGORIES.map((cat) => {
                const isSelected = selectedCatId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedCatId(cat.id);
                      setItemQty(1);
                      setItemWeight(cat.isPerPiece ? 1 : 2);
                    }}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categoryTitle,
                        isSelected && styles.categoryTitleSelected,
                      ]}
                    >
                      {cat.title}
                    </Text>
                    <View
                      style={[
                        styles.rateBadge,
                        isSelected && styles.rateBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.rateBadgeText,
                          isSelected && styles.rateBadgeTextSelected,
                        ]}
                      >
                        {cat.badge}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* SELECTED CATEGORY RATE INFO */}
            <View style={styles.rateInfoBox}>
              <Text style={styles.rateInfoIcon}>ℹ️</Text>
              <Text style={styles.rateInfoText}>
                {activeCategoryConfig.rateDescription}
              </Text>
            </View>

            {/* ITEM BUILDER FORM */}
            <View style={styles.itemBuilderForm}>
              <Text style={styles.inputLabel}>Item Description (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder={`e.g. ${activeCategoryConfig.defaultName}`}
                placeholderTextColor="#A2A2A2"
                value={customItemName}
                onChangeText={setCustomItemName}
              />

              {activeCategoryConfig.isPerPiece ? (
                /* QUANTITY FOR PER PIECE ITEMS (MOBILE, LAPTOP, DOCS) */
                <View style={styles.counterRow}>
                  <View>
                    <Text style={styles.counterLabel}>Quantity (Pieces):</Text>
                    <Text style={styles.counterSub}>
                      {activeCategoryConfig.id === 'mobile'
                        ? '₹3,000 INR (~₩48,000) per mobile'
                        : 'Fixed duty & air handling included'}
                    </Text>
                  </View>

                  <View style={styles.counterControls}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setItemQty((q) => Math.max(1, q - 1))}
                    >
                      <Text style={styles.counterBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{itemQty}</Text>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setItemQty((q) => q + 1)}
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* WEIGHT SELECTOR FOR KG ITEMS (CLOTHES, FOOD, COSMETICS) */
                <View style={styles.weightSelectorContainer}>
                  <View style={styles.weightHeaderRow}>
                    <Text style={styles.counterLabel}>Estimated Weight (KG):</Text>
                    <Text style={styles.weightCalculatedText}>
                      {itemWeight} kg × ₩{activeCategoryConfig.unitPriceKRW.toLocaleString()} ={' '}
                      <Text style={{ fontWeight: '900', color: '#C88D2B' }}>
                        {formatPrice(itemWeight * activeCategoryConfig.unitPriceKRW)}
                      </Text>
                    </Text>
                  </View>

                  {/* QUICK WEIGHT CHIPS */}
                  <View style={styles.weightChipsRow}>
                    {[1, 2, 3, 5, 10, 15, 20].map((w) => (
                      <TouchableOpacity
                        key={w}
                        style={[
                          styles.weightChip,
                          itemWeight === w && styles.weightChipActive,
                        ]}
                        onPress={() => setItemWeight(w)}
                      >
                        <Text
                          style={[
                            styles.weightChipText,
                            itemWeight === w && styles.weightChipTextActive,
                          ]}
                        >
                          {w} kg
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* ADD ITEM TO PARCEL BOX BUTTON */}
              <TouchableOpacity
                style={styles.addItemBtn}
                activeOpacity={0.85}
                onPress={handleAddItem}
              >
                <Text style={styles.addItemBtnText}>{t('addToParcelBox')}</Text>
              </TouchableOpacity>
            </View>

            {/* PARCEL BOX CONTENTS LIST */}
            <View style={styles.parcelBoxContainer}>
              <View style={styles.parcelBoxHeader}>
                <Text style={styles.parcelBoxTitle}>
                  {t('itemsInBox')} ({parcelItems.length})
                </Text>
                <Text style={styles.parcelBoxTotalWeight}>
                  {t('totalParcelWeight')}: {totalParcelWeightKg} kg
                </Text>
              </View>

              {parcelItems.length === 0 ? (
                <Text style={styles.emptyBoxText}>
                  No items added yet. Choose a category above and tap Add.
                </Text>
              ) : (
                parcelItems.map((item) => (
                  <View key={item.id} style={styles.parcelItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.parcelItemName}>{item.name}</Text>
                      <Text style={styles.parcelItemMeta}>
                        Category: {item.category} •{' '}
                        {item.isPerPiece
                          ? `${item.quantity} pc(s)`
                          : `${item.weightKg} kg`}
                      </Text>
                    </View>

                    <Text style={styles.parcelItemPrice}>
                      {formatPrice(item.calculatedPriceKRW)}
                    </Text>

                    <TouchableOpacity
                      style={styles.deleteItemBtn}
                      onPress={() => handleRemoveItem(item.id)}
                    >
                      <Text style={styles.deleteItemIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* STEP 2: WHERE TO SEND YOUR PARCEL? */}
          <View style={styles.sectionCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>STEP 2</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('step2Title')}</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              {t('step2Subtitle')}
            </Text>

            {/* DESTINATION COUNTRY TOGGLE */}
            <View style={styles.countryPickerRow}>
              <TouchableOpacity
                style={[
                  styles.countryPickerBtn,
                  destinationCountry === 'India' && styles.countryPickerBtnActive,
                ]}
                onPress={() => setDestinationCountry('India')}
              >
                <Text style={styles.countryFlag}>🇮🇳</Text>
                <Text
                  style={[
                    styles.countryPickerText,
                    destinationCountry === 'India' && styles.countryPickerTextActive,
                  ]}
                >
                  {t('deliverToIndia')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.countryPickerBtn,
                  destinationCountry === 'Nepal' && styles.countryPickerBtnActive,
                ]}
                onPress={() => setDestinationCountry('Nepal')}
              >
                <Text style={styles.countryFlag}>🇳🇵</Text>
                <Text
                  style={[
                    styles.countryPickerText,
                    destinationCountry === 'Nepal' && styles.countryPickerTextActive,
                  ]}
                >
                  {t('deliverToNepal')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* SAVED ADDRESS SELECTOR CHIPS */}
            {user.savedAddresses.length > 0 && (
              <View style={styles.savedAddressesBox}>
                <Text style={styles.inputLabel}>Quick Select Saved Address:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {user.savedAddresses.map((addr) => (
                    <TouchableOpacity
                      key={addr.id}
                      style={[
                        styles.savedAddressChip,
                        selectedAddressId === addr.id && styles.savedAddressChipActive,
                      ]}
                      onPress={() => handleSelectSavedAddress(addr.id)}
                    >
                      <Text
                        style={[
                          styles.savedAddressChipText,
                          selectedAddressId === addr.id && styles.savedAddressChipTextActive,
                        ]}
                      >
                        📍 {addr.title} ({addr.recipientName})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* RECIPIENT INPUTS */}
            <View style={styles.addressForm}>
              <Text style={styles.inputLabel}>{t('recipientNameLabel')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Full Name of Family / Contact Person"
                placeholderTextColor="#A2A2A2"
                value={recipientName}
                onChangeText={setRecipientName}
              />

              <Text style={styles.inputLabel}>{t('recipientPhoneLabel')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+91 98765 43210"
                placeholderTextColor="#A2A2A2"
                keyboardType="phone-pad"
                value={recipientPhone}
                onChangeText={setRecipientPhone}
              />

              <Text style={styles.inputLabel}>{t('streetAddressLabel')}</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                multiline
                placeholder="House/Flat No., Landmark, Colony/Sector"
                placeholderTextColor="#A2A2A2"
                value={recipientAddress}
                onChangeText={setRecipientAddress}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('cityLabel')}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Delhi, Kathmandu"
                    placeholderTextColor="#A2A2A2"
                    value={recipientCity}
                    onChangeText={setRecipientCity}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{t('postalLabel')}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 110075"
                    placeholderTextColor="#A2A2A2"
                    keyboardType="numeric"
                    value={recipientPostal}
                    onChangeText={setRecipientPostal}
                  />
                </View>
              </View>
            </View>

            {/* SOUTH KOREA PICKUP POINT */}
            <View style={styles.koreaHubContainer}>
              <Text style={styles.inputLabel}>{t('koreaPickupPoint')}</Text>
              {[
                'Seoul Gangnam Main Hub (123 Teheran-ro)',
                'Busan Seo-gu Logistics Point',
                'Incheon Airport Cargo Drop-off',
                'Doorstep Pickup anywhere in Korea (+₩5,000)',
              ].map((hub) => (
                <TouchableOpacity
                  key={hub}
                  style={[
                    styles.hubOption,
                    koreaHub === hub && styles.hubOptionActive,
                  ]}
                  onPress={() => setKoreaHub(hub)}
                >
                  <Text style={styles.hubRadio}>
                    {koreaHub === hub ? '●' : '○'}
                  </Text>
                  <Text
                    style={[
                      styles.hubOptionText,
                      koreaHub === hub && styles.hubOptionTextActive,
                    ]}
                  >
                    {hub}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.slotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Pickup Date:</Text>
                  <TouchableOpacity
                    style={styles.slotPicker}
                    onPress={() =>
                      setPickupDate(
                        pickupDate === 'Tomorrow (Aug 18)'
                          ? 'Wed, Aug 19'
                          : 'Tomorrow (Aug 18)'
                      )
                    }
                  >
                    <Text style={styles.slotPickerText}>📅 {pickupDate}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Time Window:</Text>
                  <TouchableOpacity
                    style={styles.slotPicker}
                    onPress={() =>
                      setPickupSlot(
                        pickupSlot.includes('Afternoon')
                          ? 'Evening (06:00 PM - 09:00 PM)'
                          : 'Afternoon (12:00 PM - 06:00 PM)'
                      )
                    }
                  >
                    <Text style={styles.slotPickerText}>⏰ {pickupSlot.split(' ')[0]}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* SIMPLIFIED PAYMENT CHOICE: PAYMENT NOW VS PAYMENT AFTER PARCEL RECEIVED (CASH) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('paymentOption')}</Text>

            <View style={styles.paymentOptionsContainer}>
              {/* Option 1: Payment Now */}
              <TouchableOpacity
                style={[
                  styles.paymentChoiceCard,
                  paymentOption === 'PAY_NOW' && styles.paymentChoiceCardActive,
                ]}
                activeOpacity={0.85}
                onPress={() => setPaymentOption('PAY_NOW')}
              >
                <View style={styles.paymentChoiceRadio}>
                  {paymentOption === 'PAY_NOW' && (
                    <View style={styles.paymentChoiceRadioDot} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentChoiceTitle}>
                    {t('paymentNow')}
                  </Text>
                  <Text style={styles.paymentChoiceDesc}>
                    {t('paymentNowSub')}
                  </Text>
                </View>
                {paymentOption === 'PAY_NOW' && (
                  <Text style={styles.paymentChoiceCheck}>✓</Text>
                )}
              </TouchableOpacity>

              {/* Option 2: Payment After Parcel Received (Cash) */}
              <TouchableOpacity
                style={[
                  styles.paymentChoiceCard,
                  paymentOption === 'CASH_ON_DELIVERY' && styles.paymentChoiceCardActive,
                  { marginTop: 10 },
                ]}
                activeOpacity={0.85}
                onPress={() => setPaymentOption('CASH_ON_DELIVERY')}
              >
                <View style={styles.paymentChoiceRadio}>
                  {paymentOption === 'CASH_ON_DELIVERY' && (
                    <View style={styles.paymentChoiceRadioDot} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentChoiceTitle}>
                    {t('paymentAfter')}
                  </Text>
                  <Text style={styles.paymentChoiceDesc}>
                    {t('paymentAfterSub')}
                  </Text>
                </View>
                {paymentOption === 'CASH_ON_DELIVERY' && (
                  <Text style={styles.paymentChoiceCheck}>✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* PRICE QUOTE BREAKDOWN */}
          <View style={styles.billSummaryCard}>
            <Text style={styles.billTitle}>{t('parcelQuote')}</Text>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{t('totalParcelWeight')}</Text>
              <Text style={styles.billValBold}>{totalParcelWeightKg} kg</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>
                {t('categoryFreight')} ({parcelItems.length})
              </Text>
              <Text style={styles.billVal}>{formatPrice(parcelSubtotalKRW)}</Text>
            </View>

            <View style={styles.billDivider} />

            <View style={styles.grandTotalRow}>
              <View>
                <Text style={styles.grandTotalLabel}>{t('estimatedTotal')}</Text>
                <Text style={styles.grandTotalSub}>
                  Customs & Airway Duty Included
                </Text>
              </View>
              <Text style={styles.grandTotalAmount}>
                {formatPrice(grandTotalKRW)}
              </Text>
            </View>
          </View>

          {/* BOOK SHIPMENT BUTTON */}
          <TouchableOpacity
            style={styles.bookBtn}
            activeOpacity={0.85}
            onPress={handleBookShipment}
          >
            <Text style={styles.bookBtnText}>{t('confirmAndBook')}</Text>
            <Text style={styles.bookBtnPrice}>{formatPrice(grandTotalKRW)}</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ORDER SUCCESS MODAL */}
        <Modal visible={isSuccessModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalEmoji}>🎉</Text>
              <Text style={styles.modalTitle}>Parcel Shipment Booked!</Text>
              <Text style={styles.modalDesc}>
                Your international parcel has been registered with NamasteMart Logistics.
              </Text>

              {bookedOrder && (
                <View style={styles.modalDetailsBox}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Tracking Airway Bill:</Text>
                    <Text style={styles.modalRowCode}>
                      {bookedOrder.trackingNumber}
                    </Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Route:</Text>
                    <Text style={styles.modalRowVal}>
                      Seoul ➔ {bookedOrder.destinationCity}, {bookedOrder.destinationCountry}
                    </Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Pickup Time:</Text>
                    <Text style={styles.modalRowVal}>{pickupDate} • {pickupSlot.split(' ')[0]}</Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowLabel}>Payment Mode:</Text>
                    <Text style={styles.modalRowVal}>
                      {bookedOrder.paymentMethod}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.modalTrackBtn}
                onPress={() => {
                  setIsSuccessModalOpen(false);
                  router.replace('/orders');
                }}
              >
                <Text style={styles.modalTrackBtnText}>VIEW IN ORDERS & LIVE TRACK →</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalHomeBtn}
                onPress={() => {
                  setIsSuccessModalOpen(false);
                  router.replace('/');
                }}
              >
                <Text style={styles.modalHomeBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BOTTOM NAV */}
        <BottomNav />
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
  headerBadge: {
    backgroundColor: '#FFF9ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3E1BA',
  },
  headerBadgeText: {
    color: '#C88D2B',
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  heroBanner: {
    backgroundColor: '#23201C',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBadge: {
    backgroundColor: 'rgba(200, 141, 43, 0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  heroBadgeText: {
    color: '#F0BA5A',
    fontSize: 9,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  heroDesc: {
    color: '#D4CEBF',
    fontSize: 10,
    marginTop: 4,
  },
  heroEmoji: {
    fontSize: 28,
    marginLeft: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepBadge: {
    backgroundColor: '#212121',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#8A857A',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryCard: {
    width: '31.3%',
    backgroundColor: '#F8F7F3',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFEBE4',
  },
  categoryCardSelected: {
    borderColor: '#C88D2B',
    backgroundColor: '#FFFBF3',
  },
  categoryIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#212121',
    textAlign: 'center',
    minHeight: 24,
  },
  categoryTitleSelected: {
    color: '#C88D2B',
  },
  rateBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  rateBadgeSelected: {
    backgroundColor: '#C88D2B',
  },
  rateBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8A857A',
  },
  rateBadgeTextSelected: {
    color: '#FFFFFF',
  },
  rateInfoBox: {
    backgroundColor: '#FFF9ED',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3E1BA',
  },
  rateInfoIcon: {
    fontSize: 14,
  },
  rateInfoText: {
    fontSize: 10,
    color: '#8A6218',
    fontWeight: '600',
    flex: 1,
  },
  itemBuilderForm: {
    backgroundColor: '#F8F7F3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#EFEBE4',
    marginBottom: 10,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
  },
  counterSub: {
    fontSize: 9,
    color: '#8A857A',
    marginTop: 2,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7F3',
    borderRadius: 8,
    padding: 2,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#212121',
  },
  counterValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212121',
    marginHorizontal: 10,
  },
  weightSelectorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  weightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weightCalculatedText: {
    fontSize: 10,
    color: '#212121',
  },
  weightChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  weightChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F8F7F3',
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  weightChipActive: {
    backgroundColor: '#C88D2B',
    borderColor: '#C88D2B',
  },
  weightChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A857A',
  },
  weightChipTextActive: {
    color: '#FFFFFF',
  },
  addItemBtn: {
    backgroundColor: '#212121',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addItemBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  parcelBoxContainer: {
    borderTopWidth: 1,
    borderTopColor: '#EFEBE4',
    paddingTop: 12,
  },
  parcelBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parcelBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#212121',
  },
  parcelBoxTotalWeight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C88D2B',
  },
  emptyBoxText: {
    fontSize: 11,
    color: '#8A857A',
    textAlign: 'center',
    marginVertical: 8,
  },
  parcelItemRow: {
    backgroundColor: '#F8F7F3',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  parcelItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
  },
  parcelItemMeta: {
    fontSize: 9,
    color: '#8A857A',
    marginTop: 2,
  },
  parcelItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C88D2B',
    marginRight: 8,
  },
  deleteItemBtn: {
    padding: 4,
  },
  deleteItemIcon: {
    fontSize: 12,
    color: '#E53935',
    fontWeight: '800',
  },
  countryPickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  countryPickerBtn: {
    flex: 1,
    backgroundColor: '#F8F7F3',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#EFEBE4',
  },
  countryPickerBtnActive: {
    backgroundColor: '#FFFBF3',
    borderColor: '#C88D2B',
  },
  countryFlag: {
    fontSize: 18,
  },
  countryPickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A857A',
  },
  countryPickerTextActive: {
    color: '#C88D2B',
    fontWeight: '800',
  },
  savedAddressesBox: {
    marginBottom: 10,
  },
  savedAddressChip: {
    backgroundColor: '#F8F7F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  savedAddressChipActive: {
    backgroundColor: '#FFF9ED',
    borderColor: '#C88D2B',
  },
  savedAddressChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A857A',
  },
  savedAddressChipTextActive: {
    color: '#C88D2B',
  },
  addressForm: {
    marginTop: 4,
  },
  koreaHubContainer: {
    backgroundColor: '#F8F7F3',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  hubOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  hubOptionActive: {},
  hubRadio: {
    fontSize: 14,
    color: '#C88D2B',
    marginRight: 8,
  },
  hubOptionText: {
    fontSize: 11,
    color: '#666155',
  },
  hubOptionTextActive: {
    color: '#212121',
    fontWeight: '700',
  },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  slotPicker: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  slotPickerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#212121',
  },
  paymentOptionsContainer: {
    marginTop: 6,
  },
  paymentChoiceCard: {
    backgroundColor: '#F8F7F3',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFEBE4',
  },
  paymentChoiceCardActive: {
    borderColor: '#C88D2B',
    backgroundColor: '#FFFBF3',
  },
  paymentChoiceRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C88D2B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentChoiceRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C88D2B',
  },
  paymentChoiceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212121',
  },
  paymentChoiceDesc: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  paymentChoiceCheck: {
    fontSize: 16,
    fontWeight: '900',
    color: '#C88D2B',
    marginLeft: 8,
  },
  billSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  billTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
    marginBottom: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 11,
    color: '#8A857A',
  },
  billVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
  },
  billValBold: {
    fontSize: 11,
    fontWeight: '900',
    color: '#212121',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#EFEBE4',
    marginVertical: 8,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
  },
  grandTotalSub: {
    fontSize: 9,
    color: '#8A857A',
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#C88D2B',
  },
  bookBtn: {
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
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bookBtnPrice: {
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
  modalEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#212121',
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 11,
    color: '#8A857A',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalDetailsBox: {
    width: '100%',
    backgroundColor: '#F8F7F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalRowLabel: {
    fontSize: 10,
    color: '#8A857A',
  },
  modalRowVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#212121',
  },
  modalRowCode: {
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
    fontSize: 11,
    fontWeight: '800',
  },
  modalHomeBtn: {
    paddingVertical: 6,
  },
  modalHomeBtnText: {
    color: '#8A857A',
    fontSize: 11,
    fontWeight: '700',
  },
});
