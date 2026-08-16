import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
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
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { CurrencyCode } from '@/types';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
];

export default function ProfileScreen() {
  const router = useRouter();
  const {
    user,
    selectedCurrency,
    setCurrency,
    updateUserProfile,
    addAddress,
    deleteAddress,
    setDefaultAddress,
    formatPrice,
    orders,
    t,
  } = useApp();

  // Modals
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);
  const [isCustomsGuideOpen, setIsCustomsGuideOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Primary Address in Edit Profile
  const defaultAddr = user.savedAddresses.find((a) => a.isDefault) || user.savedAddresses[0];
  const [editAddressStreet, setEditAddressStreet] = useState(defaultAddr?.fullAddress || '');
  const [editAddressCity, setEditAddressCity] = useState(defaultAddr?.city || '');
  const [editAddressPostal, setEditAddressPostal] = useState(defaultAddr?.postalCode || '');

  // New Address Form State
  const [newAddrTitle, setNewAddrTitle] = useState('');
  const [newAddrName, setNewAddrName] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');
  const [newAddrFull, setNewAddrFull] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrPostal, setNewAddrPostal] = useState('');
  const [newAddrCountry, setNewAddrCountry] = useState<'India' | 'Nepal' | 'South Korea'>('India');

  const handleOpenEditProfile = () => {
    setEditName(user.name);
    setEditPhone(user.phone);
    setEditEmail(user.email);
    setEditAvatar(user.avatar);
    setEditAddressStreet(defaultAddr?.fullAddress || '');
    setEditAddressCity(defaultAddr?.city || '');
    setEditAddressPostal(defaultAddr?.postalCode || '');
    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert('Validation Error', 'Please enter your mobile phone number.');
      return;
    }

    const finalAvatar = customAvatarUrl.trim() || editAvatar;

    // Update user profile fields
    updateUserProfile({
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      avatar: finalAvatar,
    });

    // Update default address if changed and exists
    if (defaultAddr && editAddressStreet.trim()) {
      const updatedAddresses = user.savedAddresses.map((a) =>
        a.id === defaultAddr.id
          ? {
              ...a,
              recipientName: editName.trim(),
              phone: editPhone.trim(),
              fullAddress: editAddressStreet.trim(),
              city: editAddressCity.trim() || a.city,
              postalCode: editAddressPostal.trim() || a.postalCode,
            }
          : a
      );
      updateUserProfile({ savedAddresses: updatedAddresses });
    }

    setIsEditProfileModalOpen(false);
    Alert.alert('Profile Updated 🎉', 'Your name, mobile number, photo, and address have been saved successfully.');
  };

  const handleSaveAddress = () => {
    if (!newAddrName || !newAddrFull || !newAddrCity) {
      Alert.alert('Missing Fields', 'Please fill in Recipient Name, Address, and City.');
      return;
    }

    addAddress({
      title: newAddrTitle || `${newAddrCountry} Address`,
      type: 'HOME',
      recipientName: newAddrName,
      phone: newAddrPhone,
      fullAddress: newAddrFull,
      city: newAddrCity,
      postalCode: newAddrPostal,
      country: newAddrCountry,
      isDefault: user.savedAddresses.length === 0,
    });

    setIsAddAddressModalOpen(false);
    setNewAddrTitle('');
    setNewAddrName('');
    setNewAddrPhone('');
    setNewAddrFull('');
    setNewAddrCity('');
    setNewAddrPostal('');
    Alert.alert('Address Saved', 'New delivery address has been saved.');
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Logged Out', 'You have been logged out.');
          router.replace('/');
        },
      },
    ]);
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
            <Text style={styles.headerTitle}>{t('profileTitle')}</Text>
            <Text style={styles.headerSubtitle}>Manage profile, addresses, currency & shipping</Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* USER HERO CARD */}
          <View style={styles.userCard}>
            <View style={styles.userTopRow}>
              <View style={styles.avatarWrapper}>
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                <TouchableOpacity
                  style={styles.avatarEditBadge}
                  onPress={handleOpenEditProfile}
                >
                  <Text style={styles.avatarEditBadgeText}>📷</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.nameBadgeRow}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <View style={styles.tierBadge}>
                    <Text style={styles.tierBadgeText}>👑 {user.memberTier}</Text>
                  </View>
                </View>

                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userPhone}>📞 {user.phone}</Text>
              </View>

              <TouchableOpacity
                style={styles.editProfileBtn}
                activeOpacity={0.85}
                onPress={handleOpenEditProfile}
              >
                <Text style={styles.editProfileBtnText}>✏️ {t('editProfile')}</Text>
              </TouchableOpacity>
            </View>

            {/* METRICS ROW */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{orders.length}</Text>
                <Text style={styles.metricLabel}>{t('totalOrders')}</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{formatPrice(user.totalSavedKRW)}</Text>
                <Text style={styles.metricLabel}>{t('totalSaved')}</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{user.savedAddresses.length}</Text>
                <Text style={styles.metricLabel}>{t('savedAddresses')}</Text>
              </View>
            </View>
          </View>

          {/* EDIT PERSONAL DETAILS SHORTCUT CARD */}
          <TouchableOpacity
            style={styles.editProfileBanner}
            activeOpacity={0.85}
            onPress={handleOpenEditProfile}
          >
            <View style={styles.editProfileBannerIcon}>
              <Text style={{ fontSize: 20 }}>👤</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.editProfileBannerTitle}>
                Update Personal Information
              </Text>
              <Text style={styles.editProfileBannerDesc}>
                Change your Name, Mobile Number, Photo & Primary Address
              </Text>
            </View>
            <Text style={styles.editProfileBannerArrow}>Edit →</Text>
          </TouchableOpacity>

          {/* CURRENCY PREFERENCE SECTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('displayCurrency')}</Text>
            <Text style={styles.sectionSubtitle}>
              Converts all product prices and shipping costs in real-time
            </Text>

            <View style={styles.currencyRow}>
              {(
                [
                  { code: 'KRW', symbol: '₩', label: 'KRW (Korean Won)' },
                  { code: 'INR', symbol: '₹', label: 'INR (Indian Rupee)' },
                  { code: 'NPR', symbol: 'रू', label: 'NPR (Nepali Rupee)' },
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
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SAVED ADDRESSES SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('savedAddresses')}</Text>
              <TouchableOpacity
                style={styles.addAddressBtn}
                onPress={() => setIsAddAddressModalOpen(true)}
              >
                <Text style={styles.addAddressBtnText}>{t('addAddress')}</Text>
              </TouchableOpacity>
            </View>

            {user.savedAddresses.map((addr) => (
              <View key={addr.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressTitleRow}>
                    <Text style={styles.addressFlag}>
                      {addr.country === 'South Korea'
                        ? '🇰🇷'
                        : addr.country === 'Nepal'
                        ? '🇳🇵'
                        : '🇮🇳'}
                    </Text>
                    <Text style={styles.addressTitle}>{addr.title}</Text>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>

                  {!addr.isDefault && (
                    <TouchableOpacity onPress={() => setDefaultAddress(addr.id)}>
                      <Text style={styles.setDefaultText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.addressName}>{addr.recipientName}</Text>
                <Text style={styles.addressFull}>
                  {addr.fullAddress}, {addr.city} {addr.postalCode}
                </Text>
                <Text style={styles.addressPhone}>📞 {addr.phone}</Text>

                <View style={styles.addressActions}>
                  <TouchableOpacity
                    style={styles.deleteAddrBtn}
                    onPress={() => {
                      Alert.alert(
                        'Delete Address',
                        `Remove "${addr.title}" from saved addresses?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => deleteAddress(addr.id),
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.deleteAddrText}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* SHIPPING & CUSTOMS GUIDE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cross-Border Resources</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setIsCustomsGuideOpen(true)}
            >
              <View style={styles.menuIconCircle}>
                <Text style={{ fontSize: 18 }}>📋</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuTitle}>{t('customsGuide')}</Text>
                <Text style={styles.menuDesc}>Rules for Korea ➔ India & Nepal shipments</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { marginTop: 8 }]}
              onPress={() => setIsSupportModalOpen(true)}
            >
              <View style={styles.menuIconCircle}>
                <Text style={{ fontSize: 18 }}>💬</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuTitle}>{t('supportHelpline')}</Text>
                <Text style={styles.menuDesc}>WhatsApp, Call, or Email our support team</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* APP PREFERENCES */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences & Notifications</Text>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Shipment Status Notifications</Text>
                <Text style={styles.settingDesc}>SMS & Push updates on package milestones</Text>
              </View>
              <Switch
                value={user.notificationsEnabled}
                onValueChange={(val) => updateUserProfile({ notificationsEnabled: val })}
                trackColor={{ false: '#EFEBE4', true: '#C88D2B' }}
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ============================================================ */}
        {/* EDIT PROFILE MODAL (UPDATE NAME, MOBILE, PHOTO, ADDRESS)     */}
        {/* ============================================================ */}
        <Modal
          visible={isEditProfileModalOpen}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editProfileModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile & Details</Text>
                <TouchableOpacity onPress={() => setIsEditProfileModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* AVATAR / PHOTO SELECTION */}
                <Text style={styles.inputLabel}>Choose Profile Photo / Avatar</Text>
                <View style={styles.avatarSelectionContainer}>
                  <Image
                    source={{ uri: customAvatarUrl.trim() || editAvatar }}
                    style={styles.editAvatarPreview}
                  />

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.avatarSubtext}>Select a preset photo:</Text>
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

                <Text style={[styles.inputLabel, { marginTop: 10 }]}>Or Paste Custom Image URL:</Text>
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

                {/* MOBILE PHONE NUMBER */}
                <Text style={styles.inputLabel}>Mobile Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +82 10 9876 5432 / +91 98765 43210"
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

                {/* PRIMARY HOME / DELIVERY ADDRESS */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                  Primary Street Address
                </Text>
                <TextInput
                  style={[styles.input, { height: 55 }]}
                  multiline
                  placeholder="Flat/House No, Street, Colony, Sector"
                  placeholderTextColor="#A2A2A2"
                  value={editAddressStreet}
                  onChangeText={setEditAddressStreet}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Seoul / Delhi"
                      placeholderTextColor="#A2A2A2"
                      value={editAddressCity}
                      onChangeText={setEditAddressCity}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>PIN / Postal Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Postal Code"
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
                  <Text style={styles.saveProfileBtnText}>SAVE PROFILE CHANGES ✓</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ADD ADDRESS MODAL */}
        <Modal
          visible={isAddAddressModalOpen}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addressModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Delivery Address</Text>
                <TouchableOpacity onPress={() => setIsAddAddressModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Country Toggle */}
                <Text style={styles.inputLabel}>Destination Country</Text>
                <View style={styles.countryToggleRow}>
                  {(['India', 'Nepal', 'South Korea'] as const).map((cntry) => (
                    <TouchableOpacity
                      key={cntry}
                      style={[
                        styles.countryToggleBtn,
                        newAddrCountry === cntry && styles.countryToggleBtnActive,
                      ]}
                      onPress={() => setNewAddrCountry(cntry)}
                    >
                      <Text
                        style={[
                          styles.countryToggleText,
                          newAddrCountry === cntry && styles.countryToggleTextActive,
                        ]}
                      >
                        {cntry === 'India' ? '🇮🇳 India' : cntry === 'Nepal' ? '🇳🇵 Nepal' : '🇰🇷 Korea'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Address Label (e.g. Home, Office)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Home / Office"
                  value={newAddrTitle}
                  onChangeText={setNewAddrTitle}
                />

                <Text style={styles.inputLabel}>Recipient Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Recipient Name"
                  value={newAddrName}
                  onChangeText={setNewAddrName}
                />

                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 / +977 / +82 phone number"
                  keyboardType="phone-pad"
                  value={newAddrPhone}
                  onChangeText={setNewAddrPhone}
                />

                <Text style={styles.inputLabel}>Full Street Address *</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  multiline
                  placeholder="House/Flat number, Street name, Sector"
                  value={newAddrFull}
                  onChangeText={setNewAddrFull}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>City *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Delhi, Kathmandu"
                      value={newAddrCity}
                      onChangeText={setNewAddrCity}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Postal Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="PIN / Postal code"
                      keyboardType="numeric"
                      value={newAddrPostal}
                      onChangeText={setNewAddrPostal}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.saveAddressBtn}
                  onPress={handleSaveAddress}
                >
                  <Text style={styles.saveAddressBtnText}>SAVE ADDRESS</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* CUSTOMS & PROHIBITED ITEMS GUIDE MODAL */}
        <Modal
          visible={isCustomsGuideOpen}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.guideModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Customs & Shipping Guidelines</Text>
                <TouchableOpacity onPress={() => setIsCustomsGuideOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.guideHeading}>✅ Permitted Items:</Text>
                <Text style={styles.guideText}>
                  • Packaged Indian & Nepali dry groceries (Rice, Atta, Masala, Tea, Dal){'\n'}
                  • Traditional dry sweets and packaged snacks{'\n'}
                  • Clothing, handicrafts, and non-perishable goods
                </Text>

                <Text style={[styles.guideHeading, { color: '#E53935', marginTop: 12 }]}>
                  🚫 Prohibited / Restricted Items:
                </Text>
                <Text style={styles.guideText}>
                  • Hazardous chemicals, aerosols, or flammable liquids{'\n'}
                  • Fresh meats, raw dairy, or unpasteurized perishables{'\n'}
                  • Counterfeit currencies, bullion, or weapons
                </Text>

                <Text style={[styles.guideHeading, { marginTop: 12 }]}>
                  📦 Airway Packaging Standards:
                </Text>
                <Text style={styles.guideText}>
                  All shipments are inspected and weighed at our Seoul / Busan hub before international air dispatch. Max box weight is 30 kg.
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={styles.closeGuideBtn}
                onPress={() => setIsCustomsGuideOpen(false)}
              >
                <Text style={styles.closeGuideBtnText}>GOT IT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* HELP & SUPPORT MODAL */}
        <Modal
          visible={isSupportModalOpen}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.guideModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>24/7 Customer Support</Text>
                <TouchableOpacity onPress={() => setIsSupportModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.supportOptions}>
                <TouchableOpacity
                  style={styles.supportCard}
                  onPress={() => {
                    Alert.alert('WhatsApp Support', 'Opening WhatsApp chat with +82 10-9876-5432...');
                  }}
                >
                  <Text style={styles.supportIcon}>💬</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.supportTitle}>WhatsApp Live Chat</Text>
                    <Text style={styles.supportSub}>Instant response in English, Hindi & Nepali</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.supportCard}
                  onPress={() => {
                    Alert.alert('Call Helpline', 'Connecting to Korea Toll-free: 1588-9999...');
                  }}
                >
                  <Text style={styles.supportIcon}>📞</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.supportTitle}>Phone Helpline</Text>
                    <Text style={styles.supportSub}>Mon - Sat: 9:00 AM - 8:00 PM KST</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.supportCard}
                  onPress={() => {
                    Alert.alert('Email Support', 'support@namastemart.com');
                  }}
                >
                  <Text style={styles.supportIcon}>✉️</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.supportTitle}>Email Support</Text>
                    <Text style={styles.supportSub}>support@namastemart.com</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeGuideBtn}
                onPress={() => setIsSupportModalOpen(false)}
              >
                <Text style={styles.closeGuideBtnText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BOTTOM NAV */}
        <BottomNav currentTab="profile" />
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
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  logoutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C62828',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEBE4',
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
    backgroundColor: '#F5F5F5',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#212121',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarEditBadgeText: {
    fontSize: 10,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#212121',
  },
  tierBadge: {
    backgroundColor: '#FFF9ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F3E1BA',
  },
  tierBadgeText: {
    color: '#C88D2B',
    fontSize: 9,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 11,
    color: '#8A857A',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: '#212121',
    marginTop: 2,
  },
  editProfileBtn: {
    backgroundColor: '#F5EEDC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editProfileBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C88D2B',
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE0',
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
    color: '#C88D2B',
  },
  metricLabel: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EFEBE4',
  },
  editProfileBanner: {
    backgroundColor: '#FFF9ED',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3E1BA',
  },
  editProfileBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5EEDC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212121',
  },
  editProfileBannerDesc: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  editProfileBannerArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C88D2B',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
    marginBottom: 10,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  currencyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFEBE4',
  },
  currencyCardActive: {
    borderColor: '#C88D2B',
    backgroundColor: '#FFFBF3',
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '900',
    color: '#8A857A',
    marginBottom: 2,
  },
  currencySymbolActive: {
    color: '#C88D2B',
  },
  currencyCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
  },
  currencyCodeActive: {
    color: '#C88D2B',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addAddressBtn: {
    backgroundColor: '#F5EEDC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addAddressBtnText: {
    color: '#C88D2B',
    fontSize: 11,
    fontWeight: '800',
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEBE4',
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
  },
  addressFlag: {
    fontSize: 16,
  },
  addressTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212121',
  },
  defaultBadge: {
    backgroundColor: '#C88D2B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  setDefaultText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C88D2B',
  },
  addressName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
  },
  addressFull: {
    fontSize: 11,
    color: '#666155',
    marginTop: 2,
    lineHeight: 16,
  },
  addressPhone: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 4,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
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
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
  },
  menuDesc: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  menuArrow: {
    fontSize: 20,
    color: '#C88D2B',
    fontWeight: '700',
  },
  settingRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  settingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
  },
  settingDesc: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  editProfileModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  addressModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  guideModalContent: {
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#212121',
  },
  closeText: {
    fontSize: 18,
    color: '#8A857A',
    fontWeight: '800',
  },
  avatarSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#F8F7F3',
    borderRadius: 14,
    padding: 10,
  },
  editAvatarPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#C88D2B',
  },
  avatarSubtext: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A857A',
  },
  avatarThumbnailBtn: {
    marginRight: 8,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarThumbnailBtnActive: {
    borderColor: '#C88D2B',
  },
  avatarThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#212121',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8F7F3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  saveProfileBtn: {
    backgroundColor: '#212121',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  saveProfileBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: '#F8F7F3',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  countryToggleBtnActive: {
    backgroundColor: '#FFF9ED',
    borderColor: '#C88D2B',
  },
  countryToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A857A',
  },
  countryToggleTextActive: {
    color: '#C88D2B',
  },
  saveAddressBtn: {
    backgroundColor: '#212121',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  saveAddressBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  guideHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 4,
  },
  guideText: {
    fontSize: 11,
    color: '#666155',
    lineHeight: 18,
  },
  closeGuideBtn: {
    backgroundColor: '#212121',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeGuideBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  supportOptions: {
    gap: 10,
    marginVertical: 10,
  },
  supportCard: {
    backgroundColor: '#F8F7F3',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportIcon: {
    fontSize: 22,
  },
  supportTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#212121',
  },
  supportSub: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
});
