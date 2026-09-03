import { BottomNav } from '@/components/BottomNav';
import { useApp } from '@/context/AppContext';
import { Address, CurrencyCode, LanguageCode } from '@/types';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
];

const FAQS = [
  {
    q: 'How does Korea to India & Nepal delivery work?',
    a: 'We collect your parcels and orders at our Seoul or Busan hub, consolidate them for scheduled international air cargo, clear export customs in Korea, and deliver directly to destination addresses across India and Nepal.',
  },
  {
    q: 'How long does customs clearance take?',
    a: 'Normal customs inspection typically takes 1 to 2 business days upon arrival at Delhi or Kathmandu airport. All required paperwork is handled automatically by our logistics team.',
  },
  {
    q: 'What is the difference between Korea and India/Nepal saved addresses?',
    a: 'Korean addresses are your primary delivery locations for products purchased inside Korea. India and Nepal addresses are saved recipient destinations for international parcel forwarding.',
  },
  {
    q: 'Can I change my default Korean delivery address?',
    a: 'Yes! Tap "Set Default" on any of your saved Korean addresses in the Saved Addresses section. The Home Page "DELIVERING TO" section will automatically update.',
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    selectedCurrency,
    setCurrency,
    language,
    setLanguage,
    updateUserProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    formatPrice,
    orders,
    t,
    isDarkMode,
    logout,
  } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // Modals state
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Edit Profile Form State
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Primary Address state inside Personal Info / Edit Profile
  const defaultAddr = user.savedAddresses.find((a) => a.isDefault) || user.savedAddresses[0];
  const [editAddressStreet, setEditAddressStreet] = useState(defaultAddr?.fullAddress || '');
  const [editAddressCity, setEditAddressCity] = useState(defaultAddr?.city || '');
  const [editAddressPostal, setEditAddressPostal] = useState(defaultAddr?.postalCode || '');

  // Address Form State (Granular fields for District, Street, Apt, Building, Detailed Address)
  const [addrTitle, setAddrTitle] = useState('');
  const [addrType, setAddrType] = useState<Address['type']>('HOME');
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrBuildingApt, setAddrBuildingApt] = useState('');
  const [addrDetailed, setAddrDetailed] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrPostal, setAddrPostal] = useState('');
  const [addrCountry, setAddrCountry] = useState<'South Korea' | 'India' | 'Nepal'>('South Korea');
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  // Notification toggles state
  const [orderUpdatesEnabled, setOrderUpdatesEnabled] = useState(true);
  const [promotionsEnabled, setPromotionsEnabled] = useState(true);
  const [deliveryAlertsEnabled, setDeliveryAlertsEnabled] = useState(true);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Dynamic Statistics
  const totalOrdersCount = orders.length;
  const totalSpentKRW = orders.reduce((sum, o) => sum + (o.totalKRW || 0), 0);
  const savedAddressesCount = user.savedAddresses.length;

  const handleOpenEditProfile = () => {
    setEditName(user.name);
    setEditPhone(user.phone);
    setEditEmail(user.email);
    setEditAvatar(user.avatar);
    setCustomAvatarUrl('');
    setEditAddressStreet(defaultAddr?.fullAddress || '');
    setEditAddressCity(defaultAddr?.city || '');
    setEditAddressPostal(defaultAddr?.postalCode || '');
    setIsEditProfileModalOpen(true);
  };

  const handleOpenPersonalInfo = () => {
    setEditName(user.name);
    setEditPhone(user.phone);
    setEditEmail(user.email);
    setEditAddressStreet(defaultAddr?.fullAddress || '');
    setEditAddressCity(defaultAddr?.city || '');
    setEditAddressPostal(defaultAddr?.postalCode || '');
    setIsPersonalInfoModalOpen(true);
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number.');
      return;
    }

    const finalAvatar = customAvatarUrl.trim() || editAvatar;

    updateUserProfile({
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      avatar: finalAvatar,
    });

    if (defaultAddr && editAddressStreet.trim()) {
      updateAddress(defaultAddr.id, {
        recipientName: editName.trim(),
        phone: editPhone.trim(),
        fullAddress: editAddressStreet.trim(),
        city: editAddressCity.trim() || defaultAddr.city,
        postalCode: editAddressPostal.trim() || defaultAddr.postalCode,
      });
    }

    setIsEditProfileModalOpen(false);
    setIsPersonalInfoModalOpen(false);
    Alert.alert('Profile Updated 🎉', 'Your profile details have been saved successfully.');
  };

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddrTitle('');
    setAddrType('HOME');
    setAddrName(user.name);
    setAddrPhone(user.phone);
    setAddrDistrict('');
    setAddrStreet('');
    setAddrBuildingApt('');
    setAddrDetailed('');
    setAddrCity('');
    setAddrPostal('');
    setAddrCountry('South Korea');
    setAddrIsDefault(user.savedAddresses.length === 0);
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: Address) => {
    setEditingAddressId(addr.id);
    setAddrTitle(addr.title);
    setAddrType(addr.type || 'HOME');
    setAddrName(addr.recipientName);
    setAddrPhone(addr.phone);
    setAddrDistrict(addr.district || '');
    setAddrStreet(addr.streetAddress || '');
    setAddrBuildingApt(addr.buildingApt || '');
    setAddrDetailed(addr.detailedAddress || '');
    setAddrCity(addr.city);
    setAddrPostal(addr.postalCode);
    setAddrCountry(addr.country);
    setAddrIsDefault(addr.isDefault);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = () => {
    if (!addrName.trim() || (!addrStreet.trim() && !addrDetailed.trim())) {
      Alert.alert('Missing Fields', 'Please fill in Recipient Name and Street Address / Building details.');
      return;
    }

    // Construct full address dynamically
    const parts = [
      addrStreet.trim(),
      addrBuildingApt.trim(),
      addrDetailed.trim(),
      addrDistrict.trim(),
    ].filter(Boolean);

    const fullAddrString = parts.length > 0 ? parts.join(', ') : (addrStreet.trim() || addrDetailed.trim());

    const titleToUse =
      addrTitle.trim() ||
      `${addrType === 'HOME' ? 'Home' : addrType === 'OFFICE' ? 'Office' : addrType === 'FAMILY' ? 'Family' : 'Address'} (${addrCountry === 'South Korea' ? 'Korea' : addrCountry})`;

    if (editingAddressId) {
      updateAddress(editingAddressId, {
        title: titleToUse,
        type: addrType,
        recipientName: addrName.trim(),
        phone: addrPhone.trim(),
        fullAddress: fullAddrString,
        city: addrCity.trim(),
        district: addrDistrict.trim(),
        streetAddress: addrStreet.trim(),
        buildingApt: addrBuildingApt.trim(),
        detailedAddress: addrDetailed.trim(),
        postalCode: addrPostal.trim(),
        country: addrCountry,
        isDefault: addrIsDefault,
      });
      if (addrIsDefault) {
        setDefaultAddress(editingAddressId);
      }
      Alert.alert('Address Updated', 'Saved address details updated.');
    } else {
      addAddress({
        title: titleToUse,
        type: addrType,
        recipientName: addrName.trim(),
        phone: addrPhone.trim(),
        fullAddress: fullAddrString,
        city: addrCity.trim(),
        district: addrDistrict.trim(),
        streetAddress: addrStreet.trim(),
        buildingApt: addrBuildingApt.trim(),
        detailedAddress: addrDetailed.trim(),
        postalCode: addrPostal.trim(),
        country: addrCountry,
        isDefault: addrIsDefault || user.savedAddresses.length === 0,
      });
      Alert.alert('Address Saved', 'New delivery address has been saved.');
    }

    setIsAddressModalOpen(false);
  };

  const handleSetDefaultAddress = (addr: Address) => {
    setDefaultAddress(addr.id);
    Alert.alert(
      'Default Delivery Address Updated',
      `"${addr.title}" is now your primary Korean shopping delivery address. The Home page delivery location has been updated automatically.`
    );
  };

  const handleDeleteAddress = (addr: Address) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to remove "${addr.title}" from saved addresses?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAddress(addr.id),
        },
      ]
    );
  };

  const handlePasswordChange = () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsSecurityModalOpen(false);
    Alert.alert('Password Updated', 'Your security password has been changed successfully.');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to log out?') : true;
      if (!confirmed) return;
      logout().catch(() => {}).finally(() => router.replace('/'));
      return;
    }
    Alert.alert('Logout?', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch {}
          router.replace('/');
        },
      },
    ]);
  };

  const getTypeIcon = (type?: Address['type']) => {
    switch (type) {
      case 'OFFICE':
        return '🏢';
      case 'FAMILY':
        return '👨‍👩‍👧';
      case 'OTHER':
        return '📍';
      case 'HOME':
      default:
        return '🏠';
    }
  };

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#121212' : '#F8F7F3'}
      />
      <SafeAreaView style={styles.container}>
        {/* 1. HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>{t('profileTitle')}</Text>
            <Text style={styles.headerSubtitle}>Manage profile, accounts, currency & shipping</Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutBtnText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. USER PROFILE CARD */}
          <View style={styles.userCard}>
            <View style={styles.userTopRow}>
              <View style={styles.avatarWrapper}>
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                <TouchableOpacity
                  style={styles.avatarEditBadge}
                  onPress={handleOpenEditProfile}
                  activeOpacity={0.8}
                >
                  <Text style={styles.avatarEditBadgeText}>📷</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.nameBadgeRow}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
                  </View>
                </View>

                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userPhone}>📞 {user.phone}</Text>

                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: isDarkMode ? '#2D271E' : '#FFF9ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}
                  onPress={() => router.push('/login')}
                >
                  <Text style={{ fontSize: 11 }}>🌐</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#D4AF37' : '#C88D2B' }}>
                    {user?.authProvider === 'google' ? 'Google Account Connected ✓' : 'Sign in with Google Account →'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.editProfileBtn}
                activeOpacity={0.85}
                onPress={handleOpenEditProfile}
              >
                <Text style={styles.editProfileBtnText}>✏️ {t('editProfile')}</Text>
              </TouchableOpacity>
            </View>

            {/* 2. DYNAMIC PROFILE STATISTICS */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{totalOrdersCount}</Text>
                <Text style={styles.metricLabel}>{t('totalOrders')}</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{formatPrice(totalSpentKRW)}</Text>
                <Text style={styles.metricLabel}>{t('totalSpent')}</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{savedAddressesCount}</Text>
                <Text style={styles.metricLabel}>{t('savedAddresses')}</Text>
              </View>
            </View>
          </View>

          {/* 3. PERSONAL INFORMATION CARD */}
          <TouchableOpacity
            style={styles.personalInfoCard}
            activeOpacity={0.85}
            onPress={handleOpenPersonalInfo}
          >
            <View style={styles.personalInfoIconWrap}>
              <Text style={{ fontSize: 20 }}>👤</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.personalInfoTitle}>Update Personal Information</Text>
              <Text style={styles.personalInfoSubtitle}>
                Change your name, phone number, email & primary address
              </Text>
            </View>
            <Text style={styles.personalInfoArrow}>Edit →</Text>
          </TouchableOpacity>

          {/* 4. APP DISPLAY CURRENCY SELECTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('displayCurrency')}</Text>
            <Text style={styles.sectionSubtitle}>
              Converts all product prices, cart, and checkout in real-time
            </Text>

            <View style={styles.currencyRow}>
              {(
                [
                  { code: 'KRW', symbol: '₩', label: 'Korean Won' },
                  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
                  { code: 'NPR', symbol: 'रू', label: 'Nepalese Rupee' },
                ] as const
              ).map((cur) => {
                const isSelected = selectedCurrency === cur.code;
                return (
                  <TouchableOpacity
                    key={cur.code}
                    style={[
                      styles.currencyCard,
                      isSelected && styles.currencyCardActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setCurrency(cur.code as CurrencyCode)}
                  >
                    <Text
                      style={[
                        styles.currencySymbol,
                        isSelected && styles.currencySymbolActive,
                      ]}
                    >
                      {cur.symbol}
                    </Text>
                    <Text
                      style={[
                        styles.currencyCode,
                        isSelected && styles.currencyCodeActive,
                      ]}
                    >
                      {cur.code}
                    </Text>
                    <Text style={styles.currencyLabelText}>{cur.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 5, 6, 7. SAVED ADDRESSES SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>{t('savedAddresses')}</Text>
                <Text style={styles.sectionSubtitle}>
                  Korean shopping delivery & international parcel destinations
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addAddressBtn}
                onPress={handleOpenAddAddress}
                activeOpacity={0.85}
              >
                <Text style={styles.addAddressBtnText}>{t('addAddress')}</Text>
              </TouchableOpacity>
            </View>

            {user.savedAddresses.map((addr) => {
              const isKorea = addr.country === 'South Korea';
              const flag = isKorea ? '🇰🇷' : addr.country === 'Nepal' ? '🇳🇵' : '🇮🇳';

              return (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={styles.addressHeader}>
                    <View style={styles.addressTitleRow}>
                      <Text style={styles.addressFlag}>{flag}</Text>
                      <Text style={styles.addressTypeIcon}>{getTypeIcon(addr.type)}</Text>
                      <Text style={styles.addressTitle}>{addr.title}</Text>

                      <View style={[styles.purposeBadge, isKorea ? styles.purposeBadgeKorea : styles.purposeBadgeGlobal]}>
                        <Text style={[styles.purposeBadgeText, isKorea ? styles.purposeBadgeTextKorea : styles.purposeBadgeTextGlobal]}>
                          {isKorea ? 'Shopping Delivery' : 'Parcel Destination'}
                        </Text>
                      </View>

                      {addr.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                        </View>
                      )}
                    </View>

                    {!addr.isDefault && isKorea && (
                      <TouchableOpacity
                        onPress={() => handleSetDefaultAddress(addr)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.setDefaultText}>Set Default</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.addressName}>{addr.recipientName}</Text>
                  <Text style={styles.addressFull}>
                    {addr.fullAddress}, {addr.city} {addr.postalCode}
                  </Text>
                  <Text style={styles.addressPhone}>📞 {addr.phone}</Text>

                  {/* Actions: Edit & Delete */}
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={styles.editAddrBtn}
                      onPress={() => handleOpenEditAddress(addr)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.editAddrText}>✏️ Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteAddrBtn}
                      onPress={() => handleDeleteAddress(addr)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.deleteAddrText}>🗑 Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ADDITIONAL PROFILE SETTINGS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings & Preferences</Text>

            {/* 🔔 Notifications */}
            <View style={styles.settingsGroupCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupIcon}>🔔</Text>
                <Text style={styles.groupTitle}>Notifications</Text>
              </View>

              <View style={styles.settingToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Order Updates</Text>
                  <Text style={styles.settingSubtext}>Status changes from confirmed to delivered</Text>
                </View>
                <Switch
                  value={orderUpdatesEnabled}
                  onValueChange={setOrderUpdatesEnabled}
                  trackColor={{ false: '#EFEBE4', true: '#C88D2B' }}
                />
              </View>

              <View style={styles.settingToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Promotions & Offers</Text>
                  <Text style={styles.settingSubtext}>Discounts on Indian & Nepali goods</Text>
                </View>
                <Switch
                  value={promotionsEnabled}
                  onValueChange={setPromotionsEnabled}
                  trackColor={{ false: '#EFEBE4', true: '#C88D2B' }}
                />
              </View>

              <View style={[styles.settingToggleRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Delivery Alerts</Text>
                  <Text style={styles.settingSubtext}>Arrival time windows & courier notes</Text>
                </View>
                <Switch
                  value={deliveryAlertsEnabled}
                  onValueChange={setDeliveryAlertsEnabled}
                  trackColor={{ false: '#EFEBE4', true: '#C88D2B' }}
                />
              </View>
            </View>

            {/* 🌐 Language Selection */}
            <TouchableOpacity
              style={styles.menuItemCard}
              onPress={() => setIsLanguageModalOpen(true)}
              activeOpacity={0.85}
            >
              <View style={styles.menuIconCircle}>
                <Text style={{ fontSize: 18 }}>🌐</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuTitle}>Language / 언어 / भाषा</Text>
                <Text style={styles.menuDesc}>
                  {language === 'KR'
                    ? '한국어 (Korean)'
                    : language === 'HI'
                      ? 'हिंदी (Hindi)'
                      : language === 'NE'
                        ? 'नेपाली (Nepali)'
                        : 'English'}
                </Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {/* 🔒 Privacy & Security */}
            <TouchableOpacity
              style={[styles.menuItemCard, { marginTop: 10 }]}
              onPress={() => setIsSecurityModalOpen(true)}
              activeOpacity={0.85}
            >
              <View style={styles.menuIconCircle}>
                <Text style={{ fontSize: 18 }}>🔒</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuTitle}>Privacy & Security</Text>
                <Text style={styles.menuDesc}>Change password and login security</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {/* ❓ Help & Support */}
            <TouchableOpacity
              style={[styles.menuItemCard, { marginTop: 10 }]}
              onPress={() => setIsSupportModalOpen(true)}
              activeOpacity={0.85}
            >
              <View style={styles.menuIconCircle}>
                <Text style={{ fontSize: 18 }}>❓</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuTitle}>Help & Support</Text>
                <Text style={styles.menuDesc}>Contact support, WhatsApp chat & FAQs</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            {/* 📄 Terms & Policies */}
            <TouchableOpacity
              style={[styles.menuItemCard, { marginTop: 10 }]}
              onPress={() => setIsPoliciesModalOpen(true)}
              activeOpacity={0.85}
            >
              <View style={styles.menuIconCircle}>
                <Text style={{ fontSize: 18 }}>📄</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuTitle}>Terms & Policies</Text>
                <Text style={styles.menuDesc}>Terms of service, privacy & refund policies</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ============================================================ */}
        {/* EDIT PROFILE MODAL                                           */}
        {/* ============================================================ */}
        <Modal visible={isEditProfileModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.editProfileModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile & Details</Text>
                <TouchableOpacity onPress={() => setIsEditProfileModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* PHOTO SELECTION */}
                <Text style={styles.inputLabel}>Profile Photo</Text>
                <View style={styles.avatarSelectionContainer}>
                  <Image
                    source={{ uri: customAvatarUrl.trim() || editAvatar }}
                    style={styles.editAvatarPreview}
                  />

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.avatarSubtext}>Select preset photo:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {PRESET_AVATARS.map((url, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.avatarThumbnailBtn,
                            editAvatar === url && styles.avatarThumbnailBtnActive,
                          ]}
                          onPress={() => {
                            setEditAvatar(url);
                            setCustomAvatarUrl('');
                          }}
                        >
                          <Image source={{ uri: url }} style={styles.avatarThumbnail} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Or Custom Image URL:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/my-photo.jpg"
                  placeholderTextColor="#A2A2A2"
                  value={customAvatarUrl}
                  onChangeText={setCustomAvatarUrl}
                />

                {/* FULL NAME */}
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your Full Name"
                  placeholderTextColor="#A2A2A2"
                  value={editName}
                  onChangeText={setEditName}
                />

                {/* PHONE NUMBER */}
                <Text style={styles.inputLabel}>Phone Number (Korean / International) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+82 10 9876 5432"
                  placeholderTextColor="#A2A2A2"
                  keyboardType="phone-pad"
                  value={editPhone}
                  onChangeText={setEditPhone}
                />

                {/* EMAIL ADDRESS */}
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#A2A2A2"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={editEmail}
                  onChangeText={setEditEmail}
                />

                {/* SAVE BUTTON */}
                <TouchableOpacity
                  style={styles.saveProfileBtn}
                  activeOpacity={0.85}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.saveProfileBtnText}>SAVE PROFILE CHANGES ✓</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ============================================================ */}
        {/* PERSONAL INFORMATION SCREEN / MODAL                         */}
        {/* ============================================================ */}
        <Modal visible={isPersonalInfoModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.editProfileModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Personal Information</Text>
                <TouchableOpacity onPress={() => setIsPersonalInfoModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.dialogSubtitle}>
                  Update your contact info and primary delivery address:
                </Text>

                {/* FULL NAME */}
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your Full Name"
                  placeholderTextColor="#A2A2A2"
                  value={editName}
                  onChangeText={setEditName}
                />

                {/* PHONE NUMBER */}
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+82 10 9876 5432"
                  placeholderTextColor="#A2A2A2"
                  keyboardType="phone-pad"
                  value={editPhone}
                  onChangeText={setEditPhone}
                />

                {/* EMAIL ADDRESS */}
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#A2A2A2"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={editEmail}
                  onChangeText={setEditEmail}
                />

                {/* PRIMARY STREET ADDRESS */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Primary Street Address</Text>
                <TextInput
                  style={[styles.input, { height: 55 }]}
                  multiline
                  placeholder="123 Teheran-ro, Gangnam-gu, Apt 804"
                  placeholderTextColor="#A2A2A2"
                  value={editAddressStreet}
                  onChangeText={setEditAddressStreet}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Seoul"
                      placeholderTextColor="#A2A2A2"
                      value={editAddressCity}
                      onChangeText={setEditAddressCity}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Postal Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="06234"
                      placeholderTextColor="#A2A2A2"
                      keyboardType="numeric"
                      value={editAddressPostal}
                      onChangeText={setEditAddressPostal}
                    />
                  </View>
                </View>

                {/* SAVE BUTTON */}
                <TouchableOpacity
                  style={styles.saveProfileBtn}
                  activeOpacity={0.85}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.saveProfileBtnText}>SAVE PERSONAL INFORMATION ✓</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ============================================================ */}
        {/* 8. ADD / EDIT ADDRESS MODAL WITH GRANULAR KOREA/INDIA/NEPAL  */}
        {/* ============================================================ */}
        <Modal visible={isAddressModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.addressModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </Text>
                <TouchableOpacity onPress={() => setIsAddressModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Country Toggle */}
                <Text style={styles.inputLabel}>Country *</Text>
                <View style={styles.countryToggleRow}>
                  {(['South Korea', 'India', 'Nepal'] as const).map((cntry) => (
                    <TouchableOpacity
                      key={cntry}
                      style={[
                        styles.countryToggleBtn,
                        addrCountry === cntry && styles.countryToggleBtnActive,
                      ]}
                      onPress={() => setAddrCountry(cntry)}
                    >
                      <Text
                        style={[
                          styles.countryToggleText,
                          addrCountry === cntry && styles.countryToggleTextActive,
                        ]}
                      >
                        {cntry === 'South Korea' ? '🇰🇷 Korea' : cntry === 'India' ? '🇮🇳 India' : '🇳🇵 Nepal'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Address Type Toggle */}
                <Text style={styles.inputLabel}>Address Type</Text>
                <View style={styles.typeToggleRow}>
                  {(['HOME', 'OFFICE', 'FAMILY', 'OTHER'] as const).map((typ) => (
                    <TouchableOpacity
                      key={typ}
                      style={[
                        styles.typeToggleBtn,
                        addrType === typ && styles.typeToggleBtnActive,
                      ]}
                      onPress={() => setAddrType(typ)}
                    >
                      <Text
                        style={[
                          styles.typeToggleText,
                          addrType === typ && styles.typeToggleTextActive,
                        ]}
                      >
                        {typ === 'HOME'
                          ? '🏠 Home'
                          : typ === 'OFFICE'
                            ? '🏢 Work'
                            : typ === 'FAMILY'
                              ? '👨‍👩‍👧 Family'
                              : '📍 Other'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Address Label / Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Home (Seoul, Korea)"
                  placeholderTextColor="#A2A2A2"
                  value={addrTitle}
                  onChangeText={setAddrTitle}
                />

                <Text style={styles.inputLabel}>Recipient Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Recipient Name"
                  placeholderTextColor="#A2A2A2"
                  value={addrName}
                  onChangeText={setAddrName}
                />

                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+82 / +91 / +977 phone number"
                  placeholderTextColor="#A2A2A2"
                  keyboardType="phone-pad"
                  value={addrPhone}
                  onChangeText={setAddrPhone}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>City *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={addrCountry === 'South Korea' ? 'Seoul' : 'Delhi'}
                      placeholderTextColor="#A2A2A2"
                      value={addrCity}
                      onChangeText={setAddrCity}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>District / Gu</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={addrCountry === 'South Korea' ? 'Gangnam-gu' : 'Sector 14'}
                      placeholderTextColor="#A2A2A2"
                      value={addrDistrict}
                      onChangeText={setAddrDistrict}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Street Address / Road Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={addrCountry === 'South Korea' ? '123 Teheran-ro' : 'Sunshine Heights'}
                  placeholderTextColor="#A2A2A2"
                  value={addrStreet}
                  onChangeText={setAddrStreet}
                />

                <Text style={styles.inputLabel}>Apartment / Building / Detailed Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Apt 804, Building B"
                  placeholderTextColor="#A2A2A2"
                  value={addrBuildingApt}
                  onChangeText={setAddrBuildingApt}
                />

                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder={addrCountry === 'South Korea' ? '06234' : '110075'}
                  placeholderTextColor="#A2A2A2"
                  keyboardType="numeric"
                  value={addrPostal}
                  onChangeText={setAddrPostal}
                />

                {/* Default Address Checkbox */}
                <TouchableOpacity
                  style={styles.defaultToggleRow}
                  activeOpacity={0.8}
                  onPress={() => setAddrIsDefault(!addrIsDefault)}
                >
                  <View style={[styles.checkbox, addrIsDefault && styles.checkboxActive]}>
                    {addrIsDefault && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.defaultToggleLabel}>
                    Set as default shopping delivery address
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveAddressBtn}
                  activeOpacity={0.85}
                  onPress={handleSaveAddress}
                >
                  <Text style={styles.saveAddressBtnText}>
                    {editingAddressId ? 'UPDATE ADDRESS' : 'SAVE ADDRESS'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* LANGUAGE MODAL */}
        <Modal visible={isLanguageModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.dialogModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🌐 Language Preference</Text>
                <TouchableOpacity onPress={() => setIsLanguageModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.dialogSubtitle}>Select your preferred language for the app:</Text>

              <View style={{ gap: 8, marginVertical: 12 }}>
                {[
                  { code: 'KR', flag: '🇰🇷', label: '한국어 (Korean)', sub: '기본 대한민국 원화 설정' },
                  { code: 'EN', flag: '🌐', label: 'English', sub: 'Global English navigation' },
                  { code: 'HI', flag: '🇮🇳', label: 'हिंदी (Hindi)', sub: 'भारतीय भाषा समर्थन' },
                  { code: 'NE', flag: '🇳🇵', label: 'नेपाली (Nepali)', sub: 'नेपाली भाषा समर्थन' },
                ].map((item) => {
                  const isSelected = language === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[styles.langOptionCard, isSelected && styles.langOptionCardActive]}
                      onPress={() => {
                        setLanguage(item.code as LanguageCode);
                        setIsLanguageModalOpen(false);
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{item.flag}</Text>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.langOptionTitle}>{item.label}</Text>
                        <Text style={styles.langOptionSub}>{item.sub}</Text>
                      </View>
                      {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>

        {/* PRIVACY & SECURITY MODAL */}
        <Modal visible={isSecurityModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.dialogModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🔒 Privacy & Security</Text>
                <TouchableOpacity onPress={() => setIsSecurityModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.dialogSubtitle}>Change Account Password</Text>

                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="Enter current password"
                  placeholderTextColor="#A2A2A2"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />

                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#A2A2A2"
                  value={newPassword}
                  onChangeText={setNewPassword}
                />

                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  secureTextEntry
                  placeholder="Re-enter new password"
                  placeholderTextColor="#A2A2A2"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />

                <TouchableOpacity
                  style={styles.saveProfileBtn}
                  activeOpacity={0.85}
                  onPress={handlePasswordChange}
                >
                  <Text style={styles.saveProfileBtnText}>UPDATE PASSWORD</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* HELP & SUPPORT + FAQ MODAL */}
        <Modal visible={isSupportModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.guideModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>24/7 Customer Support</Text>
                <TouchableOpacity onPress={() => setIsSupportModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.dialogSubtitle}>Contact our multi-lingual support team:</Text>

                <View style={styles.supportOptions}>
                  {/* WHATSAPP SUPPORT */}
                  <TouchableOpacity
                    style={styles.supportCard}
                    onPress={async () => {
                      const url = 'https://wa.me/919485713011';
                      try {
                        await Linking.openURL(url);
                      } catch (_) {
                        if (typeof window !== 'undefined') {
                          window.open(url, '_blank');
                        }
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.supportIcon}>💬</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.supportTitle}>WhatsApp Support</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#D97706', marginVertical: 2 }}>
                        +91 9485713011
                      </Text>
                      <Text style={styles.supportSub}>Chat with us on WhatsApp</Text>
                    </View>
                  </TouchableOpacity>

                  {/* BANK TRANSFER DETAILS CARD */}
                  <View
                    style={[
                      styles.supportCard,
                      {
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        backgroundColor: isDarkMode ? '#1E1912' : '#FFFBEB',
                        borderColor: '#FDE68A',
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>🏦</Text>
                      <Text style={[styles.supportTitle, { color: '#D97706', fontSize: 14 }]}>BANK TRANSFER</Text>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#FFF' : '#111', marginTop: 2 }}>
                      Bank: Woori Bank (우리은행)
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#D97706', marginTop: 2 }}>
                      Account Number: 1002340390276
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDarkMode ? '#DDD' : '#444', marginTop: 2 }}>
                      Account Holder: 박기삼
                    </Text>

                    <TouchableOpacity
                      style={{
                        marginTop: 10,
                        backgroundColor: '#D97706',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        alignSelf: 'flex-start',
                      }}
                      activeOpacity={0.8}
                      onPress={async () => {
                        const accNo = '1002340390276';
                        try {
                          if (typeof window !== 'undefined' && navigator?.clipboard) {
                            await navigator.clipboard.writeText(accNo);
                          }
                        } catch (_) {}
                        Alert.alert('Copied! ✅', 'Account number copied!');
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>
                        📋 Copy Account Number
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* EMAIL SUPPORT */}
                  <TouchableOpacity
                    style={styles.supportCard}
                    onPress={() => {
                      Alert.alert('Email Support', 'support@namastemart.com');
                    }}
                  >
                    <Text style={styles.supportIcon}>✉️</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.supportTitle}>Email Inquiries</Text>
                      <Text style={styles.supportSub}>support@namastemart.com</Text>
                    </View>
                  </TouchableOpacity>

                  {/* INSTAGRAM SUPPORT */}
                  <TouchableOpacity
                    style={styles.supportCard}
                    onPress={async () => {
                      const url = 'https://instagram.com/namastemart.kr';
                      try {
                        await Linking.openURL(url);
                      } catch (_) {
                        if (typeof window !== 'undefined') {
                          window.open(url, '_blank');
                        }
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.supportIcon}>📸</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.supportTitle}>Instagram Support</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#D97706', marginVertical: 2 }}>
                        @namastemart.kr
                      </Text>
                      <Text style={styles.supportSub}>Follow & message us on Instagram</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Frequently Asked Questions Accordion */}
                <Text style={[styles.dialogSubtitle, { marginTop: 18, marginBottom: 8 }]}>
                  Frequently Asked Questions (FAQs)
                </Text>

                {FAQS.map((faq, idx) => {
                  const isExpanded = expandedFaqIndex === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.faqCard}
                      activeOpacity={0.8}
                      onPress={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                    >
                      <View style={styles.faqHeader}>
                        <Text style={styles.faqQuestion}>{faq.q}</Text>
                        <Text style={styles.faqToggleIcon}>{isExpanded ? '−' : '+'}</Text>
                      </View>
                      {isExpanded && <Text style={styles.faqAnswer}>{faq.a}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeGuideBtn}
                onPress={() => setIsSupportModalOpen(false)}
              >
                <Text style={styles.closeGuideBtnText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* TERMS & POLICIES MODAL */}
        <Modal visible={isPoliciesModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.guideModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📄 Terms & Policies</Text>
                <TouchableOpacity onPress={() => setIsPoliciesModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.policyHeading}>1. Terms & Conditions</Text>
                <Text style={styles.policyText}>
                  By using Namaste Mart, you agree to comply with cross-border e-commerce regulations between South Korea, India, and Nepal. All orders are subject to product availability and export verification.
                </Text>

                <Text style={styles.policyHeading}>2. Privacy Policy</Text>
                <Text style={styles.policyText}>
                  We protect your personal data in accordance with Korean Personal Information Protection Act (PIPA). Your delivery addresses and phone numbers are securely transmitted only to authorized logistics partners.
                </Text>

                <Text style={styles.policyHeading}>3. Refund & Cancellation Policy</Text>
                <Text style={styles.policyText}>
                  Orders can be cancelled before dispatch from our Seoul hub. Damaged or incorrect grocery items will be refunded 100% upon photo verification within 48 hours of delivery.
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={styles.closeGuideBtn}
                onPress={() => setIsPoliciesModalOpen(false)}
              >
                <Text style={styles.closeGuideBtnText}>I UNDERSTAND</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 12. BOTTOM NAV */}
        <BottomNav currentTab="profile" />
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
    logoutBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? '#3E1F1F' : '#FFEBEE',
    },
    logoutBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#FF8A80' : '#C62828',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 20,
    },
    userCard: {
      backgroundColor: cardBg,
      borderRadius: 20,
      padding: 16,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.04,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: border,
    },
    userTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarWrapper: {
      position: 'relative',
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: cardBgElevated,
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: accent,
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: cardBg,
    },
    avatarEditBadgeText: {
      fontSize: 10,
    },
    nameBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    userName: {
      fontSize: 16,
      fontWeight: '800',
      color: textMain,
    },
    verifiedBadge: {
      backgroundColor: isDark ? '#1E2D1E' : '#E8F5E9',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? '#2E7D32' : '#C8E6C9',
    },
    verifiedBadgeText: {
      color: isDark ? '#81C784' : '#2E7D32',
      fontSize: 9,
      fontWeight: '800',
    },
    userEmail: {
      fontSize: 11,
      color: textSub,
      marginTop: 2,
    },
    userPhone: {
      fontSize: 11,
      fontWeight: '600',
      color: textMain,
      marginTop: 2,
    },
    editProfileBtn: {
      backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    editProfileBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: accent,
    },
    metricsRow: {
      flexDirection: 'row',
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: border,
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    metricItem: {
      alignItems: 'center',
      flex: 1,
    },
    metricValue: {
      fontSize: 15,
      fontWeight: '900',
      color: accent,
    },
    metricLabel: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
    },
    metricDivider: {
      width: 1,
      height: 24,
      backgroundColor: border,
    },
    personalInfoCard: {
      backgroundColor: activeTint,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isDark ? '#4D3B18' : '#F3E1BA',
    },
    personalInfoIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
      justifyContent: 'center',
      alignItems: 'center',
    },
    personalInfoTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    personalInfoSubtitle: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
    },
    personalInfoArrow: {
      fontSize: 12,
      fontWeight: '800',
      color: accent,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: textMain,
      letterSpacing: 0.3,
    },
    sectionSubtitle: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
      marginBottom: 10,
    },
    currencyRow: {
      flexDirection: 'row',
      gap: 10,
    },
    currencyCard: {
      flex: 1,
      backgroundColor: cardBg,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: border,
    },
    currencyCardActive: {
      borderColor: accent,
      backgroundColor: activeTint,
    },
    currencySymbol: {
      fontSize: 22,
      fontWeight: '900',
      color: textSub,
      marginBottom: 2,
    },
    currencySymbolActive: {
      color: accent,
    },
    currencyCode: {
      fontSize: 11,
      fontWeight: '800',
      color: textMain,
    },
    currencyCodeActive: {
      color: accent,
    },
    currencyLabelText: {
      fontSize: 9,
      color: textSub,
      marginTop: 2,
      textAlign: 'center',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    addAddressBtn: {
      backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    addAddressBtnText: {
      color: accent,
      fontSize: 11,
      fontWeight: '800',
    },
    addressCard: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: border,
    },
    addressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    addressTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    addressFlag: {
      fontSize: 16,
    },
    addressTypeIcon: {
      fontSize: 14,
    },
    addressTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    purposeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    purposeBadgeKorea: {
      backgroundColor: isDark ? '#1E2D1E' : '#E8F5E9',
    },
    purposeBadgeGlobal: {
      backgroundColor: isDark ? '#1E2838' : '#E3F2FD',
    },
    purposeBadgeText: {
      fontSize: 8,
      fontWeight: '800',
    },
    purposeBadgeTextKorea: {
      color: isDark ? '#81C784' : '#2E7D32',
    },
    purposeBadgeTextGlobal: {
      color: isDark ? '#90CAF9' : '#1565C0',
    },
    defaultBadge: {
      backgroundColor: accent,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    defaultBadgeText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 8,
      fontWeight: '800',
    },
    setDefaultText: {
      fontSize: 11,
      fontWeight: '700',
      color: accent,
    },
    addressName: {
      fontSize: 12,
      fontWeight: '700',
      color: textMain,
    },
    addressFull: {
      fontSize: 11,
      color: textSub,
      marginTop: 2,
      lineHeight: 16,
    },
    addressPhone: {
      fontSize: 10,
      color: textSub,
      marginTop: 4,
    },
    addressActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: borderLight,
    },
    editAddrBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    editAddrText: {
      fontSize: 10,
      color: accent,
      fontWeight: '700',
    },
    deleteAddrBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    deleteAddrText: {
      fontSize: 10,
      color: '#E53935',
      fontWeight: '700',
    },
    settingsGroupCard: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: border,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 6,
    },
    groupIcon: {
      fontSize: 18,
    },
    groupTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    settingToggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: borderLight,
    },
    settingLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: textMain,
    },
    settingSubtext: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
    },
    menuItemCard: {
      backgroundColor: cardBg,
      borderRadius: 14,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    menuIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: textMain,
    },
    menuDesc: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
    },
    menuArrow: {
      fontSize: 20,
      color: accent,
      fontWeight: '700',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    editProfileModalContent: {
      backgroundColor: cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '90%',
      borderWidth: isDark ? 1 : 0,
      borderColor: border,
    },
    addressModalContent: {
      backgroundColor: cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '88%',
      borderWidth: isDark ? 1 : 0,
      borderColor: border,
    },
    dialogModalContent: {
      backgroundColor: cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '80%',
      borderWidth: isDark ? 1 : 0,
      borderColor: border,
    },
    guideModalContent: {
      backgroundColor: cardBg,
      margin: 20,
      borderRadius: 20,
      padding: 20,
      maxHeight: '85%',
      alignSelf: 'center',
      width: '90%',
      borderWidth: isDark ? 1 : 0,
      borderColor: border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: textMain,
    },
    closeText: {
      fontSize: 18,
      color: textSub,
      fontWeight: '800',
    },
    dialogSubtitle: {
      fontSize: 11,
      color: textSub,
      marginBottom: 10,
    },
    avatarSelectionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 14,
      padding: 10,
    },
    editAvatarPreview: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 2,
      borderColor: accent,
    },
    avatarSubtext: {
      fontSize: 10,
      fontWeight: '700',
      color: textSub,
    },
    avatarThumbnailBtn: {
      marginRight: 8,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    avatarThumbnailBtnActive: {
      borderColor: accent,
    },
    avatarThumbnail: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: textMain,
      marginTop: 10,
      marginBottom: 4,
    },
    input: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 13,
      color: textMain,
      borderWidth: 1,
      borderColor: border,
    },
    saveProfileBtn: {
      backgroundColor: isDark ? accent : '#212121',
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 14,
    },
    saveProfileBtnText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    countryToggleRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    countryToggleBtn: {
      flex: 1,
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    countryToggleBtnActive: {
      backgroundColor: activeTint,
      borderColor: accent,
    },
    countryToggleText: {
      fontSize: 11,
      fontWeight: '700',
      color: textSub,
    },
    countryToggleTextActive: {
      color: accent,
    },
    typeToggleRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 6,
    },
    typeToggleBtn: {
      flex: 1,
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      paddingVertical: 7,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    typeToggleBtnActive: {
      backgroundColor: activeTint,
      borderColor: accent,
    },
    typeToggleText: {
      fontSize: 10,
      fontWeight: '700',
      color: textSub,
    },
    typeToggleTextActive: {
      color: accent,
    },
    defaultToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      marginBottom: 4,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#262626' : '#FFFFFF',
    },
    checkboxActive: {
      backgroundColor: accent,
      borderColor: accent,
    },
    checkboxCheck: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    defaultToggleLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: textMain,
    },
    saveAddressBtn: {
      backgroundColor: isDark ? accent : '#212121',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 18,
      marginBottom: 10,
    },
    saveAddressBtnText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
    langOptionCard: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 14,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: border,
    },
    langOptionCardActive: {
      borderColor: accent,
      backgroundColor: activeTint,
    },
    langOptionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    langOptionSub: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
    },
    checkIcon: {
      fontSize: 16,
      fontWeight: '900',
      color: accent,
      marginLeft: 8,
    },
    supportOptions: {
      gap: 10,
      marginVertical: 10,
    },
    supportCard: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    supportIcon: {
      fontSize: 22,
    },
    supportTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: textMain,
    },
    supportSub: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
    },
    faqCard: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: border,
    },
    faqHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    faqQuestion: {
      fontSize: 12,
      fontWeight: '700',
      color: textMain,
      flex: 1,
      paddingRight: 8,
    },
    faqToggleIcon: {
      fontSize: 16,
      fontWeight: '800',
      color: accent,
    },
    faqAnswer: {
      fontSize: 11,
      color: textSub,
      marginTop: 8,
      lineHeight: 16,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: border,
    },
    policyHeading: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
      marginTop: 12,
      marginBottom: 4,
    },
    policyText: {
      fontSize: 11,
      color: textSub,
      lineHeight: 17,
      marginBottom: 8,
    },
    closeGuideBtn: {
      backgroundColor: isDark ? accent : '#212121',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    closeGuideBtnText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },
  });
};
