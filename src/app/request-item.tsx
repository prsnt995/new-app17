import React, { useCallback, useState } from 'react';
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
import { createItemRequest } from '@/services/itemRequestService';
import { RequestedItem, ItemRequestRecord } from '@/types';

export default function RequestItemScreen() {
  const router = useRouter();
  const { user, t, isDarkMode } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // Step 1: Origin Country (India or Nepal)
  const [originCountry, setOriginCountry] = useState<'India' | 'Nepal'>('India');

  // Step 2: Delivery Address in South Korea
  const defaultKoreaAddr = user.savedAddresses?.find((a) => a.country === 'South Korea') || user.savedAddresses?.[0];
  const [recipientName, setRecipientName] = useState(defaultKoreaAddr?.recipientName || user.name || 'PARSHANT');
  const [recipientPhone, setRecipientPhone] = useState(defaultKoreaAddr?.phone || user.phone || '+82 10-1234-5678');
  const [koreaAddress, setKoreaAddress] = useState(defaultKoreaAddr?.fullAddress || 'Building 102, Gangnam-daero 456, Gangnam-gu');
  const [koreaCity, setKoreaCity] = useState(defaultKoreaAddr?.city || 'Seoul');
  const [koreaPostal, setKoreaPostal] = useState(defaultKoreaAddr?.postalCode || '06000');

  // Step 3: Item Builder Form
  const [itemName, setItemName] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemSizeColor, setItemSizeColor] = useState('');
  const [itemLink, setItemLink] = useState('');
  const [itemPhoto, setItemPhoto] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState('');

  // Requested Items List
  const [requestedItems, setRequestedItems] = useState<RequestedItem[]>([
    {
      id: 'item-req-1',
      name: 'Authentic Indian Sweets / Mithai Box',
      brand: 'Haldiram / Bikanervala',
      quantity: 2,
      sizeColor: '1 kg Box',
      productLink: 'https://example.com/sweets',
      notes: 'Please ensure fresh batch with long expiry date.',
    },
  ]);

  // Submission & Modal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<ItemRequestRecord | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  // Image Picker for Item Photo
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
        setItemPhoto(pickerResult.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Image Error', e.message || 'Could not pick image.');
    }
  };

  // Add Item to Requested Items List
  const handleAddRequestedItem = () => {
    if (!itemName.trim()) {
      Alert.alert('Item Name Required', 'Please enter a name for the requested product (e.g. Saree, Snacks, Spices, Herbal Tea).');
      return;
    }

    const newItem: RequestedItem = {
      id: `req-item-${Date.now()}`,
      name: itemName.trim(),
      brand: itemBrand.trim() || undefined,
      quantity: Math.max(1, itemQty),
      sizeColor: itemSizeColor.trim() || undefined,
      productLink: itemLink.trim() || undefined,
      photoUrl: itemPhoto || undefined,
      notes: itemNotes.trim() || undefined,
    };

    setRequestedItems((prev) => [...prev, newItem]);
    setItemName('');
    setItemBrand('');
    setItemQty(1);
    setItemSizeColor('');
    setItemLink('');
    setItemPhoto(null);
    setItemNotes('');
    Alert.alert('Item Added', `"${newItem.name}" added to your request list.`);
  };

  const handleRemoveItem = (id: string) => {
    setRequestedItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Submit Request
  const handleSubmitRequest = async () => {
    if (requestedItems.length === 0) {
      Alert.alert('Item List Empty', 'Please add at least one requested item before submitting.');
      return;
    }

    if (!recipientName.trim() || !recipientPhone.trim() || !koreaAddress.trim() || !koreaCity.trim()) {
      Alert.alert('Delivery Address Required', 'Please complete your Korea delivery address details.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        userId: user.id || 'guest_user',
        customer: {
          name: user.name || recipientName.trim(),
          email: user.email || 'customer@example.com',
          phone: user.phone || recipientPhone.trim(),
        },
        originCountry,
        koreaDeliveryAddress: {
          recipientName: recipientName.trim(),
          phone: recipientPhone.trim(),
          fullAddress: koreaAddress.trim(),
          city: koreaCity.trim(),
          postalCode: koreaPostal.trim() || '06000',
        },
        items: requestedItems,
      };

      const result = await createItemRequest(payload);
      setSubmittedRequest(result);
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      Alert.alert('Request Error', err.message || 'Could not submit item request. Please try again.');
    } finally {
      setIsSubmitting(false);
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Request Items to Korea 🛍️</Text>
            <Text style={styles.headerSub}>India / Nepal ➔ South Korea Authentic Sourcing</Text>
          </View>

          <TouchableOpacity style={styles.myReqBtn} onPress={() => router.push('/item-requests')} activeOpacity={0.8}>
            <Text style={styles.myReqBtnText}>My Requests 📋</Text>
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
                <Text style={styles.bannerPillText}>AUTHENTIC SOURCING SERVICE</Text>
              </View>
              <Text style={styles.deliveryDaysTag}>🌟 India & Nepal ➔ Korea</Text>
            </View>
            <Text style={styles.bannerTitle}>Want Products from Home to Korea?</Text>
            <Text style={styles.bannerDesc}>
              Tell us what items you need from India or Nepal (sweets, traditional clothes, books, snacks, cosmetics, utensils). Our team will source them and deliver straight to your South Korea address!
            </Text>
          </View>

          {/* STEP 1: SOURCE COUNTRY */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepTitle}>1. Source Country 🌍</Text>
            <Text style={styles.stepSub}>Where should we buy/source your items from?</Text>

            <View style={styles.destToggleRow}>
              <TouchableOpacity
                style={[
                  styles.destCard,
                  originCountry === 'India' && styles.destCardActive,
                ]}
                onPress={() => setOriginCountry('India')}
                activeOpacity={0.85}
              >
                <Text style={styles.destFlag}>🇮🇳</Text>
                <Text style={[styles.destName, originCountry === 'India' && styles.destNameActive]}>
                  INDIA
                </Text>
                <Text style={styles.destSubText}>Source from India</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.destCard,
                  originCountry === 'Nepal' && styles.destCardActive,
                ]}
                onPress={() => setOriginCountry('Nepal')}
                activeOpacity={0.85}
              >
                <Text style={styles.destFlag}>🇳🇵</Text>
                <Text style={[styles.destName, originCountry === 'Nepal' && styles.destNameActive]}>
                  NEPAL
                </Text>
                <Text style={styles.destSubText}>Source from Nepal</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* STEP 2: KOREA DELIVERY ADDRESS */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepTitle}>2. Delivery Address in South Korea 🇰🇷</Text>
            <Text style={styles.stepSub}>Where should we deliver your sourced items in Korea?</Text>

            <Text style={styles.inputLabel}>Recipient Full Name *</Text>
            <TextInput style={styles.textInput} value={recipientName} onChangeText={setRecipientName} placeholder="e.g. PARSHANT" />

            <Text style={styles.inputLabel}>Recipient Phone Number in Korea *</Text>
            <TextInput style={styles.textInput} value={recipientPhone} onChangeText={setRecipientPhone} placeholder="+82 10-1234-5678" />

            <Text style={styles.inputLabel}>South Korea Street Address *</Text>
            <TextInput
              style={styles.textInput}
              value={koreaAddress}
              onChangeText={setKoreaAddress}
              placeholder="Building, street address & unit number"
              multiline
            />

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>City / Province *</Text>
                <TextInput style={styles.textInput} value={koreaCity} onChangeText={setKoreaCity} placeholder="Seoul / Incheon / Suwon" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput style={styles.textInput} value={koreaPostal} onChangeText={setKoreaPostal} placeholder="06000" />
              </View>
            </View>
          </View>

          {/* STEP 3: ADD REQUESTED ITEMS */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepTitle}>3. Add Requested Items 🛍️</Text>
            <Text style={styles.stepSub}>Enter product details, brand, reference links or photos</Text>

            <View style={styles.customFormBox}>
              <Text style={styles.inputLabel}>Item / Product Name *</Text>
              <TextInput
                style={styles.textInput}
                value={itemName}
                onChangeText={setItemName}
                placeholder="e.g. Kurti, Sweets Box, Spices, Traditional Book"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Brand / Store (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={itemBrand}
                    onChangeText={setItemBrand}
                    placeholder="e.g. Haldiram, Manyavar"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <View style={styles.counterBox}>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => setItemQty((prev) => Math.max(1, prev - 1))}>
                      <Text style={styles.counterBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{itemQty}</Text>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => setItemQty((prev) => prev + 1)}>
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>Size / Color / Variant (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={itemSizeColor}
                onChangeText={setItemSizeColor}
                placeholder="e.g. Size L, Blue Color, 500g Pack"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>Product Reference Link (Optional URL)</Text>
              <TextInput
                style={styles.textInput}
                value={itemLink}
                onChangeText={setItemLink}
                placeholder="e.g. https://amazon.in/dp/example"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>Special Notes or Instructions (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                value={itemNotes}
                onChangeText={setItemNotes}
                placeholder="Specific flavor, store location, packaging preference..."
                placeholderTextColor="#9CA3AF"
                multiline
              />

              {/* Photo Upload */}
              <View style={styles.photoUploadRow}>
                <TouchableOpacity style={styles.photoPickerBtn} onPress={handlePickPhoto} activeOpacity={0.8}>
                  <Text style={styles.photoPickerBtnIcon}>📷</Text>
                  <Text style={styles.photoPickerBtnText}>
                    {itemPhoto ? 'Change Product Photo' : 'Upload Product Photo (Optional)'}
                  </Text>
                </TouchableOpacity>

                {itemPhoto && (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: itemPhoto }} style={styles.photoPreviewImage} />
                    <TouchableOpacity style={styles.removePhotoBadge} onPress={() => setItemPhoto(null)}>
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.addToListBtn} onPress={handleAddRequestedItem} activeOpacity={0.85}>
                <Text style={styles.addToListBtnText}>+ Add Item to Request List</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* STEP 4: REQUEST SUMMARY & ADMIN NOTICE */}
          <View style={styles.sectionCard}>
            <Text style={styles.stepTitle}>4. Request Summary 📋</Text>
            <Text style={styles.stepSub}>Review your requested items list before submitting</Text>

            {requestedItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🛍️</Text>
                <Text style={styles.emptyText}>No requested items added yet.</Text>
                <Text style={styles.emptySub}>Fill out the form above to add items to your request.</Text>
              </View>
            ) : (
              <View style={styles.itemListWrap}>
                {requestedItems.map((item, index) => (
                  <View key={item.id || index} style={styles.itemCard}>
                    {item.photoUrl && <Image source={{ uri: item.photoUrl }} style={styles.itemThumb} />}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemMeta}>
                        Qty: {item.quantity} {item.brand ? `• Brand: ${item.brand}` : ''} {item.sizeColor ? `• ${item.sizeColor}` : ''}
                      </Text>
                      {item.productLink ? <Text style={styles.itemLinkText} numberOfLines={1}>🔗 {item.productLink}</Text> : null}
                      {item.notes ? <Text style={styles.itemNotesText}>"{item.notes}"</Text> : null}
                    </View>

                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemoveItem(item.id)} activeOpacity={0.7}>
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Summary Alert Notice */}
                <View style={styles.summaryNoticeBox}>
                  <Text style={styles.noticeIcon}>💡</Text>
                  <Text style={styles.noticeText}>
                    <Text style={{ fontWeight: '900' }}>Admin Price Confirmation:</Text> Final price, shipping cost, and availability will be confirmed by the admin before payment.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* STEP 5: SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmitRequest}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Item Request 🛍️</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* SUCCESS CONFIRMATION MODAL */}
        <Modal visible={isSuccessModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalSuccessIcon}>🛍️</Text>
              <Text style={styles.modalTitle}>Item Request Submitted!</Text>

              <View style={styles.modalIdCard}>
                <Text style={styles.modalIdLabel}>Request Reference ID</Text>
                <Text style={styles.modalIdText}>{submittedRequest?.requestId}</Text>
                <Text style={styles.modalTrackingText}>Source: {submittedRequest?.originCountry === 'India' ? 'India 🇮🇳' : 'Nepal 🇳🇵'}</Text>
              </View>

              <Text style={styles.modalMessage}>
                Your item request has been received and set to{' '}
                <Text style={{ fontWeight: '800', color: '#D97706' }}>"Pending Review"</Text>.
              </Text>

              <View style={styles.modalStatusBox}>
                <Text style={styles.statusBoxIcon}>ℹ️</Text>
                <Text style={styles.statusBoxText}>
                  Our sourcing team will verify product availability, calculate final price & shipping fee, and notify you in <Text style={{ fontWeight: '800' }}>My Requests</Text>.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => {
                  setIsSuccessModalOpen(false);
                  router.push('/item-requests');
                }}
              >
                <Text style={styles.modalActionBtnText}>View My Requests 📋</Text>
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
    container: { flex: 1, backgroundColor: bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: cardBg,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#2D271E' : '#FFFBEB',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backIcon: { fontSize: 18, color: accent, fontWeight: '800' },
    headerTitle: { fontSize: 17, fontWeight: '900', color: textMain },
    headerSub: { fontSize: 11, color: textSub, marginTop: 1 },
    myReqBtn: {
      backgroundColor: isDark ? '#2D271E' : '#FEF3C7',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: accent,
    },
    myReqBtnText: { fontSize: 11, fontWeight: '800', color: accent },
    scrollContent: { padding: 16, gap: 16 },
    bannerCard: {
      backgroundColor: isDark ? '#2A1F13' : '#FFFBEB',
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: '#FDE68A',
    },
    bannerBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    bannerPill: { backgroundColor: accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    bannerPillText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    deliveryDaysTag: { fontSize: 11, fontWeight: '800', color: '#B45309' },
    bannerTitle: { fontSize: 18, fontWeight: '900', color: isDark ? '#FEF3C7' : '#92400E', marginBottom: 4 },
    bannerDesc: { fontSize: 12, color: isDark ? '#D1D5DB' : '#78350F', lineHeight: 17 },
    sectionCard: { backgroundColor: cardBg, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: border },
    stepTitle: { fontSize: 16, fontWeight: '900', color: textMain },
    stepSub: { fontSize: 12, color: textSub, marginTop: 2, marginBottom: 12 },
    destToggleRow: { flexDirection: 'row', gap: 12 },
    destCard: {
      flex: 1,
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: border,
    },
    destCardActive: { borderColor: accent, backgroundColor: isDark ? '#2D271E' : '#FEF3C7' },
    destFlag: { fontSize: 28, marginBottom: 4 },
    destName: { fontSize: 14, fontWeight: '900', color: textMain },
    destNameActive: { color: accent },
    destSubText: { fontSize: 10, color: textSub, marginTop: 2, textAlign: 'center' },
    inputLabel: { fontSize: 12, fontWeight: '800', color: textMain, marginBottom: 6 },
    textInput: {
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: textMain,
      marginBottom: 8,
    },
    rowInputs: { flexDirection: 'row', gap: 10, marginTop: 4 },
    customFormBox: { backgroundColor: isDark ? '#262626' : '#F9FAFB', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: border },
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
    counterBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: isDark ? '#374151' : '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
    counterBtnText: { fontSize: 16, fontWeight: '800', color: textMain },
    counterValue: { fontSize: 13, fontWeight: '800', color: textMain },
    photoUploadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, marginBottom: 12 },
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
    photoPickerBtnIcon: { fontSize: 18 },
    photoPickerBtnText: { fontSize: 11, fontWeight: '700', color: accent },
    photoPreviewWrap: { position: 'relative' },
    photoPreviewImage: { width: 44, height: 44, borderRadius: 8 },
    removePhotoBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    removePhotoText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
    addToListBtn: { backgroundColor: accent, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
    addToListBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    emptyBox: { alignItems: 'center', paddingVertical: 20, backgroundColor: isDark ? '#262626' : '#F9FAFB', borderRadius: 12 },
    emptyIcon: { fontSize: 32, marginBottom: 4 },
    emptyText: { fontSize: 13, fontWeight: '800', color: textMain },
    emptySub: { fontSize: 11, color: textSub, marginTop: 2 },
    itemListWrap: { gap: 10 },
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      gap: 10,
    },
    itemThumb: { width: 44, height: 44, borderRadius: 8 },
    itemName: { fontSize: 13, fontWeight: '800', color: textMain },
    itemMeta: { fontSize: 11, color: textSub, marginTop: 2 },
    itemLinkText: { fontSize: 10, color: '#2563EB', marginTop: 2 },
    itemNotesText: { fontSize: 10, color: textSub, fontStyle: 'italic', marginTop: 2 },
    deleteBtn: { padding: 6 },
    deleteIcon: { fontSize: 16 },
    summaryNoticeBox: {
      flexDirection: 'row',
      backgroundColor: '#FFFBEB',
      borderRadius: 12,
      padding: 12,
      gap: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#FDE68A',
      marginTop: 6,
    },
    noticeIcon: { fontSize: 16 },
    noticeText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },
    submitBtn: {
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
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: cardBg, borderRadius: 22, padding: 22, width: '100%', maxWidth: 380, alignItems: 'center', borderWidth: isDark ? 1 : 0, borderColor: border },
    modalSuccessIcon: { fontSize: 44, marginBottom: 8 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: textMain, textAlign: 'center' },
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
    modalIdLabel: { fontSize: 10, color: textSub, fontWeight: '700' },
    modalIdText: { fontSize: 16, fontWeight: '900', color: accent, marginTop: 2 },
    modalTrackingText: { fontSize: 11, color: textSub, marginTop: 2 },
    modalMessage: { fontSize: 12, color: textSub, textAlign: 'center', lineHeight: 17, marginBottom: 12 },
    modalStatusBox: { flexDirection: 'row', backgroundColor: isDark ? '#262626' : '#F9FAFB', borderRadius: 12, padding: 12, gap: 8, marginBottom: 16 },
    statusBoxIcon: { fontSize: 16 },
    statusBoxText: { flex: 1, fontSize: 11, color: textMain, lineHeight: 16 },
    modalActionBtn: { backgroundColor: accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, width: '100%', alignItems: 'center' },
    modalActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  });
}
