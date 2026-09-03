import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import {
  subscribeParcelPricing,
  createParcelBooking,
  DEFAULT_PARCEL_PRICING,
} from '@/services/parcelService';
import {
  ParcelPricingItem,
  ParcelBookingItem,
  ParcelBookingRequest,
} from '@/types';

export default function SendParcelScreen() {
  const router = useRouter();
  const { user, formatPrice, t, isDarkMode } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // Dynamic Pricing Items from DB
  const [pricingItems, setPricingItems] = useState<ParcelPricingItem[]>(DEFAULT_PARCEL_PRICING);
  const [selectedPricingId, setSelectedPricingId] = useState<string>(DEFAULT_PARCEL_PRICING[0].id);

  // Item Builder Inputs for Predefined Item
  const [itemQty, setItemQty] = useState(1);
  const [itemWeight, setItemWeight] = useState(1);
  const [itemCustomNote, setItemCustomNote] = useState('');

  // Custom "Other Item" Form Inputs
  const [otherItemName, setOtherItemName] = useState('');
  const [otherItemQty, setOtherItemQty] = useState(1);
  const [otherItemWeight, setOtherItemWeight] = useState(1);
  const [otherItemDesc, setOtherItemDesc] = useState('');
  const [otherItemPhoto, setOtherItemPhoto] = useState<string | null>(null);

  // Parcel Box Items List
  const [parcelItems, setParcelItems] = useState<ParcelBookingItem[]>([
    {
      id: 'item-phone-1',
      pricingItemId: 'price-phone',
      category: 'mobile',
      name: 'Phone (Smartphone / Mobile Device)',
      isCustom: false,
      quantity: 1,
      weightKg: 0.4,
      unitPriceKRW: 70000,
      calculatedPriceKRW: 70000,
      requiresAdminPricing: false,
    },
    {
      id: 'item-clothes-1',
      pricingItemId: 'price-clothes',
      category: 'clothes',
      name: 'Clothes (Winter Jackets & Apparel)',
      isCustom: false,
      quantity: 1,
      weightKg: 3.0,
      unitPriceKRW: 15000,
      calculatedPriceKRW: 45000,
      requiresAdminPricing: false,
    },
  ]);

  // Destination & Pickup State
  const [destinationCountry, setDestinationCountry] = useState<'India' | 'Nepal'>('India');

  // Customer Korea Info (Auto-populated)
  const defaultKoreaAddr = user.savedAddresses?.find((a) => a.country === 'South Korea') || user.savedAddresses?.[0];
  const [customerName, setCustomerName] = useState(user.name || 'PARSHANT');
  const [customerPhone, setCustomerPhone] = useState(user.phone || '+82 10-1234-5678');
  const [customerEmail, setCustomerEmail] = useState(user.email || 'customer@example.com');
  const [koreaAddress, setKoreaAddress] = useState(
    defaultKoreaAddr ? `${defaultKoreaAddr.fullAddress}, ${defaultKoreaAddr.city}` : 'Building 102, Gangnam-daero 456, Gangnam-gu, Seoul'
  );

  // Recipient Info
  const defaultRecipientAddr = user.savedAddresses?.find((a) => a.country !== 'South Korea');
  const [recipientName, setRecipientName] = useState(defaultRecipientAddr?.recipientName || 'Rahul Sharma');
  const [recipientPhone, setRecipientPhone] = useState(defaultRecipientAddr?.phone || '+91 98765 43210');
  const [recipientAddress, setRecipientAddress] = useState(defaultRecipientAddr?.fullAddress || 'Flat 402, Sunshine Heights, Sector 14, Dwarka');
  const [recipientCity, setRecipientCity] = useState(defaultRecipientAddr?.city || 'New Delhi');
  const [recipientPostal, setRecipientPostal] = useState(defaultRecipientAddr?.postalCode || '110075');

  // Customer Notes
  const [customerNotes, setCustomerNotes] = useState('');

  // Submission & Modal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedParcel, setSubmittedParcel] = useState<ParcelBookingRequest | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to Parcel Pricing from DB
  useEffect(() => {
    const unsub = subscribeParcelPricing((items) => {
      if (items && items.length > 0) {
        const activeItems = items.filter((i) => i.active !== false);
        setPricingItems(activeItems.length > 0 ? activeItems : DEFAULT_PARCEL_PRICING);
      }
    });
    return () => unsub();
  }, []);

  const activePricingConfig = pricingItems.find((p) => p.id === selectedPricingId) || pricingItems[0] || DEFAULT_PARCEL_PRICING[0];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  // Pick Custom Item Photo
  const handlePickPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Camera roll access is required to attach an item photo.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
        setOtherItemPhoto(pickerResult.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Image Error', e.message || 'Could not pick image.');
    }
  };

  // Add Predefined Item
  const handleAddPredefinedItem = () => {
    if (!activePricingConfig) return;
    const isPerPiece = activePricingConfig.pricingUnit === 'per_item';
    const qty = Math.max(1, itemQty);
    const weight = isPerPiece
      ? Number((activePricingConfig.defaultWeightKg * qty).toFixed(2))
      : Math.max(0.5, itemWeight);
    const price = isPerPiece
      ? activePricingConfig.unitPriceKRW * qty
      : Math.round(activePricingConfig.unitPriceKRW * weight);

    const newItem: ParcelBookingItem = {
      id: `item-${Date.now()}`,
      pricingItemId: activePricingConfig.id,
      category: activePricingConfig.category,
      name: `${activePricingConfig.title} (${itemCustomNote.trim() || activePricingConfig.defaultName})`,
      isCustom: false,
      quantity: qty,
      weightKg: weight,
      unitPriceKRW: activePricingConfig.unitPriceKRW,
      calculatedPriceKRW: price,
      requiresAdminPricing: false,
    };

    setParcelItems((prev) => [...prev, newItem]);
    setItemQty(1);
    setItemWeight(1);
    setItemCustomNote('');
    Alert.alert('Item Added', `${newItem.name} added to your parcel box.`);
  };

  // Add Custom "Other Item"
  const handleAddCustomItem = () => {
    if (!otherItemName.trim()) {
      Alert.alert('Item Name Required', 'Please enter a name for the custom item (e.g. Shoes, Watch, Books).');
      return;
    }

    const qty = Math.max(1, otherItemQty);
    const weight = Math.max(0.1, otherItemWeight);

    const newItem: ParcelBookingItem = {
      id: `custom-${Date.now()}`,
      name: `Other Item: ${otherItemName.trim()}`,
      isCustom: true,
      quantity: qty,
      weightKg: weight,
      unitPriceKRW: 0,
      calculatedPriceKRW: 0, // Price to be confirmed by Admin
      requiresAdminPricing: true,
      description: otherItemDesc.trim() || undefined,
      photoUrl: otherItemPhoto || undefined,
    };

    setParcelItems((prev) => [...prev, newItem]);
    setOtherItemName('');
    setOtherItemQty(1);
    setOtherItemWeight(1);
    setOtherItemDesc('');
    setOtherItemPhoto(null);
    Alert.alert('Custom Item Added', `"${newItem.name}" added to parcel box. Price will be confirmed by Admin.`);
  };

  const handleRemoveItem = (id: string) => {
    setParcelItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Totals & Pricing Checks
  const totalWeightKg = Number(parcelItems.reduce((sum, item) => sum + item.weightKg, 0).toFixed(2));
  const estimatedCargoChargeKRW = parcelItems.reduce((sum, item) => sum + item.calculatedPriceKRW, 0);
  const hasUnpricedItems = parcelItems.some((item) => item.requiresAdminPricing || item.calculatedPriceKRW <= 0);

  // Submit Parcel Booking Request
  const handleSubmitParcelRequest = async () => {
    if (parcelItems.length === 0) {
      Alert.alert('Parcel Box Empty', 'Please add at least one item to your parcel box before submitting.');
      return;
    }

    if (!recipientName.trim() || !recipientPhone.trim() || !recipientAddress.trim() || !recipientCity.trim()) {
      Alert.alert('Recipient Details Required', 'Please fill in all recipient contact and address details.');
      return;
    }

    if (!koreaAddress.trim()) {
      Alert.alert('Pickup Address Required', 'Please provide your Korea pickup address.');
      return;
    }

    try {
      setIsSubmitting(true);

      const requestPayload = {
        userId: user.id || 'guest_user',
        customer: {
          name: customerName.trim() || user.name,
          email: customerEmail.trim() || user.email,
          phone: customerPhone.trim() || user.phone,
          koreaAddress: koreaAddress.trim(),
        },
        destinationCountry,
        recipient: {
          name: recipientName.trim(),
          phone: recipientPhone.trim(),
          address: recipientAddress.trim(),
          city: recipientCity.trim(),
          postalCode: recipientPostal.trim() || '110001',
          country: destinationCountry,
        },
        items: parcelItems,
        customerNotes: customerNotes.trim(),
      };

      const result = await createParcelBooking(requestPayload);
      setSubmittedParcel(result);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      Alert.alert('Booking Error', err.message || 'Could not submit parcel request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSavedAddress = (addrId: string) => {
    const addr = user.savedAddresses?.find((a) => a.id === addrId);
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
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Send Parcel to Home ✈️</Text>
            <Text style={styles.headerSub}>Korea ➔ India & Nepal Express Air Cargo</Text>
          </View>

          <TouchableOpacity
            style={styles.myParcelsBtn}
            onPress={() => router.push('/parcels')}
            activeOpacity={0.8}
          >
            <Text style={styles.myParcelsBtnText}>My Parcels 📦</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D97706" />}
        >
          {/* BANNER CARD */}
          <View style={styles.bannerCard}>
            <View style={styles.bannerBadgeRow}>
              <View style={styles.bannerPill}>
                <Text style={styles.bannerPillText}>DIRECT EXPRESS AIR CARGO</Text>
              </View>
              <Text style={styles.deliveryDaysTag}>⚡ 3–5 Days Delivery</Text>
            </View>
            <Text style={styles.bannerTitle}>Fast, Reliable & Doorstep Shipping</Text>
            <Text style={styles.bannerDesc}>
              Send phones, laptops, clothing, sweets, gifts & custom items from Korea to India and Nepal with full tracking.
            </Text>
          </View>

          {/* STEP 1: DESTINATION & PICKUP */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepTitle}>1. Destination Country 🌍</Text>
            <Text style={styles.stepSub}>Select where you are sending the parcel from Korea</Text>

            <View style={styles.destToggleRow}>
              <TouchableOpacity
                style={[
                  styles.destCard,
                  destinationCountry === 'India' && styles.destCardActive,
                ]}
                onPress={() => setDestinationCountry('India')}
                activeOpacity={0.85}
              >
                <Text style={styles.destFlag}>🇮🇳</Text>
                <Text style={[styles.destName, destinationCountry === 'India' && styles.destNameActive]}>
                  INDIA
                </Text>
                <Text style={styles.destSubText}>All major cities & states</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.destCard,
                  destinationCountry === 'Nepal' && styles.destCardActive,
                ]}
                onPress={() => setDestinationCountry('Nepal')}
                activeOpacity={0.85}
              >
                <Text style={styles.destFlag}>🇳🇵</Text>
                <Text style={[styles.destName, destinationCountry === 'Nepal' && styles.destNameActive]}>
                  NEPAL
                </Text>
                <Text style={styles.destSubText}>Kathmandu, Pokhara & More</Text>
              </TouchableOpacity>
            </View>

            {/* Korea Pickup Address */}
            <View style={styles.koreaPickupWrap}>
              <Text style={styles.inputLabel}>Pickup Address in South Korea 🇰🇷</Text>
              <TextInput
                style={styles.textInput}
                value={koreaAddress}
                onChangeText={setKoreaAddress}
                placeholder="Enter your South Korea pickup address"
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
          </View>

          {/* STEP 2: SELECT PREDEFINED ITEMS */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepTitle}>2. Select Items to Send 📦</Text>
            <Text style={styles.stepSub}>Choose standard items or add your custom items below</Text>

            {/* Item Category Scroll Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemCategoryScroll}>
              {pricingItems.map((item) => {
                const isSelected = item.id === selectedPricingId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemCategoryChip, isSelected && styles.itemCategoryChipActive]}
                    onPress={() => {
                      setSelectedPricingId(item.id);
                      setItemQty(1);
                      setItemWeight(item.defaultWeightKg || 1);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.itemChipIcon}>{item.icon}</Text>
                    <View>
                      <Text style={[styles.itemChipTitle, isSelected && styles.itemChipTitleActive]}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemChipPrice}>
                        {formatPrice(item.unitPriceKRW)} {item.pricingUnit === 'per_kg' ? '/ kg' : '/ item'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selected Pricing Item Config Box */}
            {activePricingConfig && (
              <View style={styles.itemConfigBox}>
                <View style={styles.configHeaderRow}>
                  <Text style={styles.configHeaderIcon}>{activePricingConfig.icon}</Text>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.configHeaderTitle}>{activePricingConfig.title}</Text>
                    <Text style={styles.configHeaderRate}>{activePricingConfig.rateDescription}</Text>
                  </View>
                  <View style={styles.ratePill}>
                    <Text style={styles.ratePillText}>
                      {formatPrice(activePricingConfig.unitPriceKRW)}
                      {activePricingConfig.pricingUnit === 'per_kg' ? ' / kg' : ' / pc'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Item Details / Specific Name (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={itemCustomNote}
                  onChangeText={setItemCustomNote}
                  placeholder={`e.g. ${activePricingConfig.defaultName}`}
                  placeholderTextColor="#9CA3AF"
                />

                {/* Quantity & Weight Controls */}
                <View style={styles.qtyWeightRow}>
                  <View style={styles.qtyControlCol}>
                    <Text style={styles.inputLabel}>Quantity</Text>
                    <View style={styles.counterBox}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setItemQty((prev) => Math.max(1, prev - 1))}
                      >
                        <Text style={styles.counterBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{itemQty}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setItemQty((prev) => prev + 1)}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.qtyControlCol}>
                    <Text style={styles.inputLabel}>
                      {activePricingConfig.pricingUnit === 'per_kg' ? 'Weight (kg)' : 'Approx Weight (kg)'}
                    </Text>
                    {activePricingConfig.pricingUnit === 'per_kg' ? (
                      <View style={styles.counterBox}>
                        <TouchableOpacity
                          style={styles.counterBtn}
                          onPress={() => setItemWeight((prev) => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
                        >
                          <Text style={styles.counterBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.counterValue}>{itemWeight} kg</Text>
                        <TouchableOpacity
                          style={styles.counterBtn}
                          onPress={() => setItemWeight((prev) => Number((prev + 0.5).toFixed(1)))}
                        >
                          <Text style={styles.counterBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.weightStaticBox}>
                        <Text style={styles.weightStaticText}>
                          {(activePricingConfig.defaultWeightKg * itemQty).toFixed(1)} kg
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Subtotal preview & Add Button */}
                <View style={styles.itemAddFooterRow}>
                  <View>
                    <Text style={styles.calculatedSubLabel}>Item Total</Text>
                    <Text style={styles.calculatedSubPrice}>
                      {activePricingConfig.pricingUnit === 'per_kg'
                        ? formatPrice(Math.round(activePricingConfig.unitPriceKRW * itemWeight))
                        : formatPrice(activePricingConfig.unitPriceKRW * itemQty)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.addToListBtn}
                    onPress={handleAddPredefinedItem}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addToListBtnText}>+ Add to Parcel Box</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* STEP 3: OTHER ITEM (CUSTOM) */}
          <View style={styles.sectionCard}>
            <View style={styles.customHeaderRow}>
              <Text style={styles.stepTitle}>3. Other Item (Custom) 📦</Text>
              <View style={styles.adminReviewBadge}>
                <Text style={styles.adminReviewBadgeText}>Price Confirmed by Admin</Text>
              </View>
            </View>
            <Text style={styles.stepSub}>
              Have something else? Enter details & upload an optional photo. Admin will review and confirm the price.
            </Text>

            <View style={styles.customFormBox}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.textInput}
                value={otherItemName}
                onChangeText={setOtherItemName}
                placeholder="e.g. Leather Shoes, Traditional Jacket, Musical Instrument"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.qtyWeightRow}>
                <View style={styles.qtyControlCol}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <View style={styles.counterBox}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setOtherItemQty((prev) => Math.max(1, prev - 1))}
                    >
                      <Text style={styles.counterBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{otherItemQty}</Text>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setOtherItemQty((prev) => prev + 1)}
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.qtyControlCol}>
                  <Text style={styles.inputLabel}>Approx Weight (kg)</Text>
                  <View style={styles.counterBox}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setOtherItemWeight((prev) => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
                    >
                      <Text style={styles.counterBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{otherItemWeight} kg</Text>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => setOtherItemWeight((prev) => Number((prev + 0.5).toFixed(1)))}
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Description & Special Instructions</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                value={otherItemDesc}
                onChangeText={setOtherItemDesc}
                placeholder="e.g. Fragile item, original packaging, brand name..."
                placeholderTextColor="#9CA3AF"
                multiline
              />

              {/* Photo Upload */}
              <View style={styles.photoUploadRow}>
                <TouchableOpacity style={styles.photoPickerBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
                  <Text style={styles.photoPickerBtnIcon}>📷</Text>
                  <Text style={styles.photoPickerBtnText}>
                    {otherItemPhoto ? 'Change Photo' : 'Upload Item Photo (Optional)'}
                  </Text>
                </TouchableOpacity>

                {otherItemPhoto && (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: otherItemPhoto }} style={styles.photoPreviewImage} />
                    <TouchableOpacity style={styles.removePhotoBadge} onPress={() => setOtherItemPhoto(null)}>
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.addCustomBtn}
                onPress={handleAddCustomItem}
                activeOpacity={0.85}
              >
                <Text style={styles.addCustomBtnText}>+ Add Other Item to Parcel Box</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* STEP 4: PARCEL SUMMARY */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepTitle}>4. Parcel Box Summary 📋</Text>
            <Text style={styles.stepSub}>Review selected items and estimated charges</Text>

            {parcelItems.length === 0 ? (
              <View style={styles.emptyParcelBox}>
                <Text style={styles.emptyParcelIcon}>📦</Text>
                <Text style={styles.emptyParcelText}>Your parcel box is currently empty.</Text>
                <Text style={styles.emptyParcelSub}>Select items above to add them here.</Text>
              </View>
            ) : (
              <View style={styles.parcelBoxList}>
                {parcelItems.map((item, index) => (
                  <View key={item.id || index} style={styles.parcelItemCard}>
                    {item.photoUrl && (
                      <Image source={{ uri: item.photoUrl }} style={styles.parcelItemThumb} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.parcelItemName}>{item.name}</Text>
                      <Text style={styles.parcelItemMeta}>
                        Qty: {item.quantity}  •  Weight: {item.weightKg} kg
                      </Text>

                      {item.requiresAdminPricing || item.calculatedPriceKRW <= 0 ? (
                        <View style={styles.pendingPriceTag}>
                          <Text style={styles.pendingPriceTagText}>⚠️ Price to be confirmed by Admin</Text>
                        </View>
                      ) : (
                        <Text style={styles.parcelItemPrice}>
                          Subtotal: {formatPrice(item.calculatedPriceKRW)}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.deleteItemBtn}
                      onPress={() => handleRemoveItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteItemIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Total Summary */}
                <View style={styles.summaryTotalsBox}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Destination:</Text>
                    <Text style={styles.totalValBold}>
                      {destinationCountry === 'India' ? 'India 🇮🇳' : 'Nepal 🇳🇵'}
                    </Text>
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Items:</Text>
                    <Text style={styles.totalVal}>{parcelItems.length} item types</Text>
                  </View>

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Estimated Weight:</Text>
                    <Text style={styles.totalVal}>{totalWeightKg} kg</Text>
                  </View>

                  <View style={[styles.totalRow, styles.dividerTop]}>
                    <Text style={styles.grandTotalLabel}>Estimated Cargo Charge:</Text>
                    <Text style={styles.grandTotalPrice}>{formatPrice(estimatedCargoChargeKRW)}</Text>
                  </View>

                  {hasUnpricedItems && (
                    <View style={styles.adminWarningBox}>
                      <Text style={styles.adminWarningIcon}>💡</Text>
                      <Text style={styles.adminWarningText}>
                        <Text style={{ fontWeight: '800' }}>Note:</Text> Your parcel contains custom items.
                        Final price will be confirmed by Admin after review.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* STEP 5: CUSTOMER & RECIPIENT INFORMATION */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepTitle}>5. Customer & Recipient Details 👤</Text>
            <Text style={styles.stepSub}>Sender and destination recipient information</Text>

            {/* Saved Addresses Picker */}
            {user.savedAddresses && user.savedAddresses.length > 0 && (
              <View style={styles.savedAddrWrap}>
                <Text style={styles.inputLabel}>Autofill from Saved Recipient Addresses</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {user.savedAddresses.map((addr) => (
                    <TouchableOpacity
                      key={addr.id}
                      style={styles.savedAddrPill}
                      onPress={() => handleSelectSavedAddress(addr.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.savedAddrPillText}>
                        📍 {addr.recipientName} ({addr.country})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Sender Info (Korea) */}
            <View style={styles.subFormGroup}>
              <Text style={styles.subFormHeading}>Sender Information (Korea 🇰🇷)</Text>

              <Text style={styles.inputLabel}>Sender Name</Text>
              <TextInput style={styles.textInput} value={customerName} onChangeText={setCustomerName} />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput style={styles.textInput} value={customerPhone} onChangeText={setCustomerPhone} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput style={styles.textInput} value={customerEmail} onChangeText={setCustomerEmail} />
                </View>
              </View>
            </View>

            {/* Recipient Info (India / Nepal) */}
            <View style={[styles.subFormGroup, { marginTop: 14 }]}>
              <Text style={styles.subFormHeading}>
                Recipient Information ({destinationCountry === 'India' ? 'India 🇮🇳' : 'Nepal 🇳🇵'})
              </Text>

              <Text style={styles.inputLabel}>Recipient Full Name *</Text>
              <TextInput style={styles.textInput} value={recipientName} onChangeText={setRecipientName} />

              <Text style={styles.inputLabel}>Recipient Phone Number *</Text>
              <TextInput style={styles.textInput} value={recipientPhone} onChangeText={setRecipientPhone} />

              <Text style={styles.inputLabel}>Destination Street Address *</Text>
              <TextInput
                style={styles.textInput}
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                multiline
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City / District *</Text>
                  <TextInput style={styles.textInput} value={recipientCity} onChangeText={setRecipientCity} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Postal / Pin Code</Text>
                  <TextInput style={styles.textInput} value={recipientPostal} onChangeText={setRecipientPostal} />
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Customer Notes for Courier (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                value={customerNotes}
                onChangeText={setCustomerNotes}
                placeholder="e.g. Deliver during daytime, handle with care..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
          </View>

          {/* STEP 6: SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmitParcelRequest}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Send Parcel Request ✈️</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* SUCCESS CONFIRMATION MODAL */}
        <Modal visible={isSuccessModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalSuccessIcon}>✈️</Text>
              <Text style={styles.modalTitle}>Parcel Request Submitted!</Text>

              <View style={styles.modalIdCard}>
                <Text style={styles.modalIdLabel}>Parcel Booking ID</Text>
                <Text style={styles.modalIdText}>{submittedParcel?.parcelId}</Text>
                <Text style={styles.modalTrackingText}>Tracking #: {submittedParcel?.trackingNumber}</Text>
              </View>

              <Text style={styles.modalMessage}>
                Your parcel booking request has been created and set to{' '}
                <Text style={{ fontWeight: '800', color: '#D97706' }}>"Pending Review"</Text>.
              </Text>

              <View style={styles.modalStatusBox}>
                <Text style={styles.statusBoxIcon}>ℹ️</Text>
                <Text style={styles.statusBoxText}>
                  Our Admin team will review your parcel items and confirm the final price. You can view progress anytime in <Text style={{ fontWeight: '800' }}>My Parcels</Text>.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => {
                  setIsSuccessModalOpen(false);
                  router.push('/parcels');
                }}
              >
                <Text style={styles.modalActionBtnText}>View My Parcels 📦</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <BottomNav currentTab="home" />
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
    container: {
      flex: 1,
      backgroundColor: bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: cardBg,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#2D271E' : '#FFFBEB',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backIcon: {
      fontSize: 18,
      color: accent,
      fontWeight: '800',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: textMain,
    },
    headerSub: {
      fontSize: 11,
      color: textSub,
      marginTop: 1,
    },
    myParcelsBtn: {
      backgroundColor: isDark ? '#2D271E' : '#FEF3C7',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: accent,
    },
    myParcelsBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: accent,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
    },
    bannerCard: {
      backgroundColor: isDark ? '#2A1F13' : '#FFFBEB',
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: '#FDE68A',
    },
    bannerBadgeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    bannerPill: {
      backgroundColor: accent,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    bannerPillText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    deliveryDaysTag: {
      fontSize: 11,
      fontWeight: '800',
      color: '#B45309',
    },
    bannerTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: isDark ? '#FEF3C7' : '#92400E',
      marginBottom: 4,
    },
    bannerDesc: {
      fontSize: 12,
      color: isDark ? '#D1D5DB' : '#78350F',
      lineHeight: 17,
    },
    sectionCard: {
      backgroundColor: cardBg,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: border,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: textMain,
    },
    stepSub: {
      fontSize: 12,
      color: textSub,
      marginTop: 2,
      marginBottom: 12,
    },
    destToggleRow: {
      flexDirection: 'row',
      gap: 12,
    },
    destCard: {
      flex: 1,
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: border,
    },
    destCardActive: {
      borderColor: accent,
      backgroundColor: isDark ? '#2D271E' : '#FEF3C7',
    },
    destFlag: {
      fontSize: 28,
      marginBottom: 4,
    },
    destName: {
      fontSize: 14,
      fontWeight: '900',
      color: textMain,
    },
    destNameActive: {
      color: accent,
    },
    destSubText: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
      textAlign: 'center',
    },
    koreaPickupWrap: {
      marginTop: 14,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: textMain,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: textMain,
    },
    itemCategoryScroll: {
      gap: 10,
      marginBottom: 14,
    },
    itemCategoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#262626' : '#F3F4F6',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: border,
      gap: 8,
    },
    itemCategoryChipActive: {
      borderColor: accent,
      backgroundColor: isDark ? '#2D271E' : '#FEF3C7',
    },
    itemChipIcon: {
      fontSize: 20,
    },
    itemChipTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: textMain,
    },
    itemChipTitleActive: {
      color: accent,
    },
    itemChipPrice: {
      fontSize: 10,
      color: textSub,
      marginTop: 1,
    },
    itemConfigBox: {
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: border,
    },
    configHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    configHeaderIcon: {
      fontSize: 24,
    },
    configHeaderTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: textMain,
    },
    configHeaderRate: {
      fontSize: 11,
      color: textSub,
      marginTop: 1,
    },
    ratePill: {
      backgroundColor: accent,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    ratePillText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    qtyWeightRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },
    qtyControlCol: {
      flex: 1,
    },
    counterBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: border,
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    counterBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: isDark ? '#374151' : '#E5E7EB',
      justifyContent: 'center',
      alignItems: 'center',
    },
    counterBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: textMain,
    },
    counterValue: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    weightStaticBox: {
      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      alignItems: 'center',
    },
    weightStaticText: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    itemAddFooterRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: border,
    },
    calculatedSubLabel: {
      fontSize: 10,
      color: textSub,
      fontWeight: '700',
    },
    calculatedSubPrice: {
      fontSize: 16,
      fontWeight: '900',
      color: accent,
    },
    addToListBtn: {
      backgroundColor: accent,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
    },
    addToListBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    customHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    adminReviewBadge: {
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FDE68A',
    },
    adminReviewBadgeText: {
      color: '#B45309',
      fontSize: 9,
      fontWeight: '800',
    },
    customFormBox: {
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: border,
    },
    photoUploadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 10,
    },
    photoPickerBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: accent,
      borderRadius: 10,
      padding: 10,
      gap: 8,
    },
    photoPickerBtnIcon: {
      fontSize: 18,
    },
    photoPickerBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: accent,
    },
    photoPreviewWrap: {
      position: 'relative',
    },
    photoPreviewImage: {
      width: 44,
      height: 44,
      borderRadius: 8,
    },
    removePhotoBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#EF4444',
      width: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removePhotoText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    addCustomBtn: {
      backgroundColor: isDark ? '#374151' : '#374151',
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      marginTop: 12,
    },
    addCustomBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    emptyParcelBox: {
      alignItems: 'center',
      paddingVertical: 20,
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 12,
    },
    emptyParcelIcon: {
      fontSize: 32,
      marginBottom: 4,
    },
    emptyParcelText: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    emptyParcelSub: {
      fontSize: 11,
      color: textSub,
      marginTop: 2,
    },
    parcelBoxList: {
      gap: 10,
    },
    parcelItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      gap: 10,
    },
    parcelItemThumb: {
      width: 44,
      height: 44,
      borderRadius: 8,
    },
    parcelItemName: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    parcelItemMeta: {
      fontSize: 11,
      color: textSub,
      marginTop: 2,
    },
    pendingPriceTag: {
      backgroundColor: '#FEF3C7',
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      marginTop: 4,
    },
    pendingPriceTagText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#92400E',
    },
    parcelItemPrice: {
      fontSize: 12,
      fontWeight: '800',
      color: accent,
      marginTop: 3,
    },
    deleteItemBtn: {
      padding: 6,
    },
    deleteItemIcon: {
      fontSize: 16,
    },
    summaryTotalsBox: {
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: border,
      marginTop: 6,
      gap: 8,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    totalLabel: {
      fontSize: 12,
      color: textSub,
    },
    totalVal: {
      fontSize: 12,
      color: textMain,
      fontWeight: '700',
    },
    totalValBold: {
      fontSize: 13,
      color: textMain,
      fontWeight: '800',
    },
    dividerTop: {
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: border,
      marginTop: 4,
    },
    grandTotalLabel: {
      fontSize: 14,
      fontWeight: '900',
      color: textMain,
    },
    grandTotalPrice: {
      fontSize: 18,
      fontWeight: '900',
      color: accent,
    },
    adminWarningBox: {
      flexDirection: 'row',
      backgroundColor: '#FFFBEB',
      borderRadius: 10,
      padding: 10,
      gap: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#FDE68A',
      marginTop: 4,
    },
    adminWarningIcon: {
      fontSize: 16,
    },
    adminWarningText: {
      flex: 1,
      fontSize: 11,
      color: '#92400E',
      lineHeight: 15,
    },
    savedAddrWrap: {
      marginBottom: 12,
    },
    savedAddrPill: {
      backgroundColor: isDark ? '#262626' : '#F3F4F6',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: border,
    },
    savedAddrPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: textMain,
    },
    subFormGroup: {
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: border,
    },
    subFormHeading: {
      fontSize: 13,
      fontWeight: '800',
      color: accent,
      marginBottom: 10,
    },
    rowInputs: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    submitButton: {
      backgroundColor: accent,
      borderRadius: 16,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: cardBg,
      borderRadius: 22,
      padding: 22,
      width: '100%',
      maxWidth: 380,
      alignItems: 'center',
      borderWidth: isDark ? 1 : 0,
      borderColor: border,
    },
    modalSuccessIcon: {
      fontSize: 44,
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: textMain,
      textAlign: 'center',
    },
    modalIdCard: {
      backgroundColor: isDark ? '#2D271E' : '#FEF3C7',
      borderRadius: 12,
      padding: 12,
      width: '100%',
      alignItems: 'center',
      marginVertical: 12,
      borderWidth: 1,
      borderColor: accent,
    },
    modalIdLabel: {
      fontSize: 10,
      color: textSub,
      fontWeight: '700',
    },
    modalIdText: {
      fontSize: 16,
      fontWeight: '900',
      color: accent,
      marginTop: 2,
    },
    modalTrackingText: {
      fontSize: 11,
      color: textSub,
      marginTop: 2,
    },
    modalMessage: {
      fontSize: 12,
      color: textSub,
      textAlign: 'center',
      lineHeight: 17,
      marginBottom: 12,
    },
    modalStatusBox: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 12,
      padding: 12,
      gap: 8,
      marginBottom: 16,
    },
    statusBoxIcon: {
      fontSize: 16,
    },
    statusBoxText: {
      flex: 1,
      fontSize: 11,
      color: textMain,
      lineHeight: 16,
    },
    modalActionBtn: {
      backgroundColor: accent,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 24,
      width: '100%',
      alignItems: 'center',
    },
    modalActionBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
  });
}
