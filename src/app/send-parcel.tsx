import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
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
    rateDescription: 'Special customs duty + air express included (₩48,000 per phone)',
    unitPriceKRW: 48000,
    isPerPiece: true,
    defaultWeight: 0.4,
    defaultName: 'Smartphone / Mobile Device',
  },
  {
    id: 'jewelry',
    title: 'Jewelry & Ornaments',
    icon: '💎',
    badge: '₩25,000 / kg',
    rateDescription: 'Gold-plated, Kundan, Silver & traditional jewelry (Insured Air Express)',
    unitPriceKRW: 25000,
    isPerPiece: false,
    defaultWeight: 0.8,
    defaultName: 'Jewelry & Precious Accessories',
  },
  {
    id: 'sweets',
    title: 'Sweets & Mithai',
    icon: '🍬',
    badge: '₩12,000 / kg',
    rateDescription: 'Packaged Indian & Nepali festival sweets (Kaju Katli, Gulab Jamun, Lakhamari)',
    unitPriceKRW: 12000,
    isPerPiece: false,
    defaultWeight: 2.0,
    defaultName: 'Packaged Sweets & Mithai',
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
    rateDescription: 'Packaged dry foods, noodles & spices at ₩12,000/kg',
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
  const { user, formatPrice, createOrder, t, isDarkMode } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

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
  const [koreaHub, setKoreaHub] = useState('Send by Parcel');
  const [pickupLocationText, setPickupLocationText] = useState('');
  const [pickupDate, setPickupDate] = useState('Tomorrow (Aug 18)');
  const [pickupSlot, setPickupSlot] = useState('Afternoon (12:00 PM - 06:00 PM)');

  // Simplified Payment Method Options: Pay Now vs Cash on Delivery
  const [paymentOption, setPaymentOption] = useState<'PAY_NOW' | 'CASH_ON_DELIVERY'>('PAY_NOW');

  // Success Modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [bookedOrder, setBookedOrder] = useState<OrderItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

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
      originHub: koreaHub === 'Pick up location' ? `Pickup: ${pickupLocationText}` : 'Send by Parcel',
      destinationCity: recipientCity,
      destinationCountry,
      shippingMethod: 'Express',
      paymentMethod: 'Direct Bank Transfer',
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#C88D2B']}
              tintColor="#C88D2B"
              title="Updating parcel rates..."
              titleColor="#8A857A"
            />
          }
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

            {/* KOREA SEND/PICKUP OPTIONS */}
            <View style={styles.koreaHubContainer}>
              <Text style={styles.inputLabel}>How to send your parcel?</Text>
              {[
                'Send by Parcel',
                'Pick up location',
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

              {koreaHub === 'Send by Parcel' && (
                <View style={{ marginTop: 10, padding: 12, backgroundColor: '#FFF5E5', borderRadius: 8 }}>
                  <Text style={{ fontSize: 14, color: '#C88D2B', fontWeight: 'bold', marginBottom: 4 }}>Please send your parcel to:</Text>
                  <Text style={{ fontSize: 16, color: '#212121', fontWeight: 'bold' }}>경기도 남양주시 불암로 41-2 102호</Text>
                  <Text style={{ fontSize: 16, color: '#212121' }}>parshant 01083615305</Text>
                </View>
              )}

              {koreaHub === 'Pick up location' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.inputLabel}>Enter Pick up location</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type your detailed pick up address"
                    placeholderTextColor="#A2A2A2"
                    value={pickupLocationText}
                    onChangeText={setPickupLocationText}
                  />
                </View>
              )}

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

          {/* SIMPLIFIED PAYMENT CHOICE: DIRECT BANK TRANSFER */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            <View style={styles.paymentOptionsContainer}>
              <View style={[styles.paymentChoiceCard, styles.paymentChoiceCardActive]}>
                <View style={styles.paymentChoiceRadio}>
                  <View style={styles.paymentChoiceRadioDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentChoiceTitle}>
                    Direct Bank Transfer
                  </Text>
                  <Text style={styles.paymentChoiceDesc}>
                    국민/신한은행 계좌이체
                  </Text>
                </View>
                <Text style={styles.paymentChoiceCheck}>✓</Text>
              </View>
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
                    <Text style={styles.modalRowLabel}>Order ID:</Text>
                    <Text style={styles.modalRowCode}>
                      {bookedOrder.orderNumber}
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
  headerBadge: {
    backgroundColor: activeTint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#4D3B18' : '#F3E1BA',
  },
  headerBadgeText: {
    color: accent,
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
    backgroundColor: cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: border,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepBadge: {
    backgroundColor: isDark ? accent : '#212121',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepBadgeText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: textMain,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: textSub,
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
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: border,
  },
  categoryCardSelected: {
    borderColor: accent,
    backgroundColor: activeTint,
  },
  categoryIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: textMain,
    textAlign: 'center',
    minHeight: 24,
  },
  categoryTitleSelected: {
    color: accent,
  },
  rateBadge: {
    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  rateBadgeSelected: {
    backgroundColor: accent,
  },
  rateBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: textSub,
  },
  rateBadgeTextSelected: {
    color: isDark ? '#121212' : '#FFFFFF',
  },
  rateInfoBox: {
    backgroundColor: isDark ? '#2D271E' : '#FFF9ED',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: isDark ? '#4D3B18' : '#F3E1BA',
  },
  rateInfoIcon: {
    fontSize: 14,
  },
  rateInfoText: {
    fontSize: 10,
    color: accent,
    fontWeight: '600',
    flex: 1,
  },
  itemBuilderForm: {
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: border,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: textMain,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: cardBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: textMain,
    borderWidth: 1,
    borderColor: border,
    marginBottom: 10,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: border,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: textMain,
  },
  counterSub: {
    fontSize: 9,
    color: textSub,
    marginTop: 2,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: border,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  counterBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: textMain,
  },
  counterValue: {
    fontSize: 13,
    fontWeight: '800',
    color: textMain,
    marginHorizontal: 10,
  },
  weightSelectorContainer: {
    backgroundColor: cardBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: border,
  },
  weightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weightCalculatedText: {
    fontSize: 10,
    color: textMain,
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
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderWidth: 1,
    borderColor: border,
  },
  weightChipActive: {
    backgroundColor: accent,
    borderColor: accent,
  },
  weightChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: textSub,
  },
  weightChipTextActive: {
    color: isDark ? '#121212' : '#FFFFFF',
  },
  addItemBtn: {
    backgroundColor: isDark ? accent : '#212121',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addItemBtnText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  parcelBoxContainer: {
    borderTopWidth: 1,
    borderTopColor: border,
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
    color: textMain,
  },
  parcelBoxTotalWeight: {
    fontSize: 11,
    fontWeight: '800',
    color: accent,
  },
  emptyBoxText: {
    fontSize: 11,
    color: textSub,
    textAlign: 'center',
    marginVertical: 8,
  },
  parcelItemRow: {
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: border,
  },
  parcelItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: textMain,
  },
  parcelItemMeta: {
    fontSize: 9,
    color: textSub,
    marginTop: 2,
  },
  parcelItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: accent,
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
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: border,
  },
  countryPickerBtnActive: {
    backgroundColor: activeTint,
    borderColor: accent,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryPickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: textSub,
  },
  countryPickerTextActive: {
    color: accent,
    fontWeight: '800',
  },
  savedAddressesBox: {
    marginBottom: 10,
  },
  savedAddressChip: {
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: border,
  },
  savedAddressChipActive: {
    backgroundColor: activeTint,
    borderColor: accent,
  },
  savedAddressChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: textSub,
  },
  savedAddressChipTextActive: {
    color: accent,
  },
  addressForm: {
    marginTop: 4,
  },
  koreaHubContainer: {
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: border,
  },
  hubOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  hubOptionActive: {},
  hubRadio: {
    fontSize: 14,
    color: accent,
    marginRight: 8,
  },
  hubOptionText: {
    fontSize: 11,
    color: textSub,
  },
  hubOptionTextActive: {
    color: textMain,
    fontWeight: '700',
  },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  slotPicker: {
    backgroundColor: cardBg,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border,
  },
  slotPickerText: {
    fontSize: 10,
    fontWeight: '700',
    color: textMain,
  },
  paymentOptionsContainer: {
    marginTop: 6,
  },
  paymentChoiceCard: {
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: border,
  },
  paymentChoiceCardActive: {
    borderColor: accent,
    backgroundColor: activeTint,
  },
  paymentChoiceRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentChoiceRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: accent,
  },
  paymentChoiceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: textMain,
  },
  paymentChoiceDesc: {
    fontSize: 10,
    color: textSub,
    marginTop: 2,
  },
  paymentChoiceCheck: {
    fontSize: 16,
    fontWeight: '900',
    color: accent,
    marginLeft: 8,
  },
  billSummaryCard: {
    backgroundColor: cardBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: border,
  },
  billTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: textMain,
    marginBottom: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 11,
    color: textSub,
  },
  billVal: {
    fontSize: 11,
    fontWeight: '700',
    color: textMain,
  },
  billValBold: {
    fontSize: 11,
    fontWeight: '900',
    color: textMain,
  },
  billDivider: {
    height: 1,
    backgroundColor: borderLight,
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
    color: textMain,
  },
  grandTotalSub: {
    fontSize: 9,
    color: textSub,
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: accent,
  },
  bookBtn: {
    backgroundColor: accent,
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
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bookBtnPrice: {
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
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: textMain,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 11,
    color: textSub,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalDetailsBox: {
    width: '100%',
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: border,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalRowLabel: {
    fontSize: 10,
    color: textSub,
  },
  modalRowVal: {
    fontSize: 10,
    fontWeight: '700',
    color: textMain,
  },
  modalRowCode: {
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
    fontSize: 11,
    fontWeight: '800',
  },
  modalHomeBtn: {
    paddingVertical: 6,
  },
  modalHomeBtnText: {
    color: textSub,
    fontSize: 11,
    fontWeight: '700',
  },
});
};
