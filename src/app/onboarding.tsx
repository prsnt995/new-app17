import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
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
import { sendOtp, verifyOtp, saveUserProfile } from '@/services/api';
import { supabase } from '@/config/supabase';



// Country codes for the picker
const COUNTRY_CODES = [
  { code: '+82', country: '🇰🇷 South Korea', shortCode: 'KR' },
  { code: '+91', country: '🇮🇳 India', shortCode: 'IN' },
  { code: '+977', country: '🇳🇵 Nepal', shortCode: 'NP' },
  { code: '+1', country: '🇺🇸 USA', shortCode: 'US' },
  { code: '+44', country: '🇬🇧 UK', shortCode: 'GB' },
  { code: '+81', country: '🇯🇵 Japan', shortCode: 'JP' },
  { code: '+86', country: '🇨🇳 China', shortCode: 'CN' },
];

const ADDRESS_COUNTRIES = [
  { label: '🇮🇳 India', value: 'India' },
  { label: '🇳🇵 Nepal', value: 'Nepal' },
  { label: '🇰🇷 South Korea', value: 'South Korea' },
];

const ADDRESS_TYPES = [
  { label: '🏠 Home', value: 'HOME' },
  { label: '🏢 Office', value: 'OFFICE' },
  { label: '👨‍👩‍👧 Family', value: 'FAMILY' },
  { label: '📍 Other', value: 'OTHER' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateUserProfile, setPhoneNumber, setEmailVerified, addAddress, addKoreanAddress, completeOnboarding, isDarkMode } = useApp();
  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // ─── STEP MANAGEMENT ──────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0); // 0=Phone, 1=Address, 2=Email Verify
  const stepAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ─── STEP 1: PHONE NUMBER ─────────────────────────────────────────────────
  const [selectedCountryCode, setSelectedCountryCode] = useState('+82');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  // ─── STEP 2: ADDRESS (STRICT SOUTH KOREA) ──────────────────────────────────
  const [addressType, setAddressType] = useState('HOME');
  const [recipientName, setRecipientName] = useState(user?.name || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [detailAddressInput, setDetailAddressInput] = useState('');
  const [cityInput, setCityInput] = useState('Seoul');
  const [stateInput, setStateInput] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressPhone, setAddressPhone] = useState('');

  // ─── STEP 3: EMAIL VERIFICATION ───────────────────────────────────────────
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [devFallbackCode, setDevFallbackCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any = null;
    if (isOtpSent && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, otpTimer]);

  // ─── STEP ANIMATION ───────────────────────────────────────────────────────
  const animateToStep = (step: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    Animated.spring(stepAnim, {
      toValue: step,
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();

    setCurrentStep(step);
  };

  // ─── STEP 1 HANDLER: VALIDATE & SAVE PHONE ────────────────────────────────
  const handlePhoneNext = () => {
    const phone = phoneInput.trim();
    if (!phone) {
      Alert.alert('Required Field', 'Please enter your phone number to continue.');
      return;
    }
    if (phone.length < 7 || phone.length > 15) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number (7-15 digits).');
      return;
    }
    if (!/^\d+$/.test(phone)) {
      Alert.alert('Invalid Format', 'Phone number should contain only digits.');
      return;
    }

    setPhoneNumber(selectedCountryCode, phone);
    setAddressPhone(`${selectedCountryCode} ${phone}`);
    animateToStep(1);
  };

  // ─── STEP 2 HANDLER: VALIDATE & SAVE KOREAN ADDRESS ───────────────────────
  const handleAddressNext = async () => {
    const phoneToUse = addressPhone.trim() || `${selectedCountryCode} ${phoneInput}`.trim();
    const addressCandidate = {
      recipientName: recipientName.trim(),
      phoneNumber: phoneToUse,
      postalCode: postalCode.trim(),
      address: streetAddress.trim(),
      detailAddress: detailAddressInput.trim(),
      country: 'South Korea' as const,
      label: addressType === 'HOME' ? 'Home' : addressType === 'OFFICE' ? 'Work' : 'Other',
      isDefault: true,
    };

    const { validateKoreanAddress } = await import('@/services/addressService');
    const validation = validateKoreanAddress(addressCandidate);
    if (!validation.valid) {
      Alert.alert('Address Incomplete', validation.error || 'Please fill in all address fields.');
      return;
    }

    // Save Korean address permanently
    await addKoreanAddress({
      id: `kr-addr-${Date.now()}`,
      ...addressCandidate,
    });

    animateToStep(2);
  };

  // ─── STEP 3 HANDLERS: OTP ─────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setIsLoading(true);
    const email = user?.email || '';

    if (!email) {
      Alert.alert('No Email', 'Please make sure you have an email associated with your account.');
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      const result = await sendOtp(email, idToken || undefined);

      if (result.success) {
        setIsOtpSent(true);
        setOtpTimer(60);
        setOtpCode('');

        Alert.alert(
          '📧 Verification Code Sent!',
          `A 6-digit verification code has been sent to:\n${email}\n\nPlease check your Gmail inbox.`,
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to send code');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not send verification code. Please try again.');
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.trim();
    if (!code || code.length < 6) {
      Alert.alert('Enter Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    const email = user?.email || '';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const idToken = session?.access_token;
      const result = await verifyOtp(email, code, idToken || undefined);

      if (result.success) {
        setEmailVerified(true);
        completeOnboarding();
        updateUserProfile({ emailVerified: true, onboardingComplete: true });

        Alert.alert(
          '✅ Email Verified!',
          'Your account is now fully activated.\nWelcome to NamasteMart!',
          [{ text: 'Start Shopping', onPress: () => router.replace('/') }]
        );
      } else {
        Alert.alert('Incorrect Code', result.message || 'The code you entered is incorrect. Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'Verification failed. Please try again.');
    }
    setIsLoading(false);
  };

  const handleSkip = () => {
    Alert.alert('Onboarding Required', 'Please complete phone, address, and email verification to continue.');
  };

  // ─── PROGRESS INDICATOR ────────────────────────────────────────────────────
  const progressWidth = stepAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['33%', '66%', '100%'],
  });

  return (
    <>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              {currentStep > 0 ? (
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => animateToStep(currentStep - 1)}
                >
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 60 }} />
              )}

              <Text style={styles.headerTitle}>
                {currentStep === 0 && '📱 Phone Number'}
                {currentStep === 1 && '📍 Delivery Address'}
                {currentStep === 2 && '📧 Verify Email'}
              </Text>

              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <View style={styles.stepIndicatorRow}>
              {['Phone', 'Address', 'Verify'].map((label, i) => (
                <View key={label} style={styles.stepDot}>
                  <View style={[styles.dot, i <= currentStep && styles.dotActive]}>
                    <Text style={[styles.dotText, i <= currentStep && styles.dotTextActive]}>
                      {i < currentStep ? '✓' : i + 1}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, i <= currentStep && styles.stepLabelActive]}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* ════════════════════════════════════════════════════════════════ */}
              {/* STEP 1: PHONE NUMBER                                            */}
              {/* ════════════════════════════════════════════════════════════════ */}
              {currentStep === 0 && (
                <View style={styles.stepCard}>
                  <View style={styles.stepIconCircle}>
                    <Text style={styles.stepIconEmoji}>📱</Text>
                  </View>
                  <Text style={styles.stepTitle}>Enter Your Phone Number</Text>
                  <Text style={styles.stepSubtitle}>
                    We need your phone number for delivery updates and account security.
                  </Text>

                  {/* Country Code Picker */}
                  <Text style={styles.fieldLabel}>Country Code *</Text>
                  <TouchableOpacity
                    style={styles.countryCodeBtn}
                    onPress={() => setShowCountryPicker(!showCountryPicker)}
                  >
                    <Text style={styles.countryCodeText}>
                      {COUNTRY_CODES.find((c) => c.code === selectedCountryCode)?.country || selectedCountryCode}
                    </Text>
                    <Text style={styles.countryCodeArrow}>
                      {showCountryPicker ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {showCountryPicker && (
                    <View style={styles.countryPickerList}>
                      {COUNTRY_CODES.map((c) => (
                        <TouchableOpacity
                          key={c.code}
                          style={[
                            styles.countryPickerItem,
                            selectedCountryCode === c.code && styles.countryPickerItemActive,
                          ]}
                          onPress={() => {
                            setSelectedCountryCode(c.code);
                            setShowCountryPicker(false);
                          }}
                        >
                          <Text style={styles.countryPickerItemText}>
                            {c.country} ({c.code})
                          </Text>
                          {selectedCountryCode === c.code && (
                            <Text style={styles.countryPickerCheck}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Phone Input */}
                  <Text style={styles.fieldLabel}>Phone Number *</Text>
                  <View style={styles.phoneInputRow}>
                    <View style={styles.phonePrefix}>
                      <Text style={styles.phonePrefixText}>{selectedCountryCode}</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInput}
                      value={phoneInput}
                      onChangeText={(v) => setPhoneInput(v.replace(/[^0-9]/g, ''))}
                      placeholder="Enter phone number"
                      placeholderTextColor={isDarkMode ? '#666' : '#999'}
                      keyboardType="phone-pad"
                      maxLength={15}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.primaryBtn}
                    activeOpacity={0.85}
                    onPress={handlePhoneNext}
                  >
                    <Text style={styles.primaryBtnText}>Continue →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ════════════════════════════════════════════════════════════════ */}
              {/* STEP 2: ADDRESS FORM                                            */}
              {/* ════════════════════════════════════════════════════════════════ */}
              {currentStep === 1 && (
                <View style={styles.stepCard}>
                  <View style={styles.stepIconCircle}>
                    <Text style={styles.stepIconEmoji}>🇰🇷</Text>
                  </View>
                  <Text style={styles.stepTitle}>Korean Delivery Address</Text>
                  <Text style={styles.stepSubtitle}>
                    A South Korean delivery address is required for all orders.
                  </Text>

                  {/* Fixed Country Badge */}
                  <Text style={styles.fieldLabel}>Country (Fixed) *</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isDarkMode ? '#222' : '#F0F9F1',
                      borderWidth: 1,
                      borderColor: '#10B981',
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 20, marginRight: 8 }}>🇰🇷</Text>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#FFF' : '#065F46' }}>
                        South Korea (대한민국)
                      </Text>
                      <Text style={{ fontSize: 10, color: isDarkMode ? '#9CA3AF' : '#047857' }}>
                        Locked to South Korea delivery only
                      </Text>
                    </View>
                  </View>

                  {/* Address Type */}
                  <Text style={styles.fieldLabel}>Address Label *</Text>
                  <View style={styles.chipRow}>
                    {[
                      { label: '🏠 Home (집)', value: 'HOME' },
                      { label: '🏢 Work (회사)', value: 'OFFICE' },
                      { label: '📍 Other (기타)', value: 'OTHER' },
                    ].map((t) => (
                      <TouchableOpacity
                        key={t.value}
                        style={[styles.chip, addressType === t.value && styles.chipActive]}
                        onPress={() => setAddressType(t.value)}
                      >
                        <Text style={[styles.chipText, addressType === t.value && styles.chipTextActive]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Recipient Name */}
                  <Text style={styles.fieldLabel}>Recipient Full Name (수령인 이름) *</Text>
                  <TextInput
                    style={styles.input}
                    value={recipientName}
                    onChangeText={setRecipientName}
                    placeholder="e.g. Parshant Kumar"
                    placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  />

                  {/* Recipient Korean Phone */}
                  <Text style={styles.fieldLabel}>Korean Phone Number (연락처) *</Text>
                  <TextInput
                    style={styles.input}
                    value={addressPhone}
                    onChangeText={setAddressPhone}
                    placeholder="e.g. 010-1234-5678"
                    placeholderTextColor={isDarkMode ? '#666' : '#999'}
                    keyboardType="phone-pad"
                  />

                  {/* Postal Code */}
                  <Text style={styles.fieldLabel}>Postal Code (우편번호 5자리) *</Text>
                  <TextInput
                    style={styles.input}
                    value={postalCode}
                    onChangeText={(v) => setPostalCode(v.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 06000"
                    placeholderTextColor={isDarkMode ? '#666' : '#999'}
                    keyboardType="number-pad"
                    maxLength={6}
                  />

                  {/* Street Address / Road Name */}
                  <Text style={styles.fieldLabel}>South Korean Address / Road Name (도로명주소) *</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={streetAddress}
                    onChangeText={setStreetAddress}
                    placeholder="e.g. 123 Teheran-ro, Gangnam-gu, Seoul"
                    placeholderTextColor={isDarkMode ? '#666' : '#999'}
                    multiline
                    numberOfLines={2}
                  />

                  {/* Detailed Address */}
                  <Text style={styles.fieldLabel}>Detailed Address (상세주소 - 동/호수, 층) *</Text>
                  <TextInput
                    style={styles.input}
                    value={detailAddressInput}
                    onChangeText={setDetailAddressInput}
                    placeholder="e.g. Apt 104, Building B, 3rd Floor"
                    placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  />

                  <TouchableOpacity
                    style={styles.primaryBtn}
                    activeOpacity={0.85}
                    onPress={handleAddressNext}
                  >
                    <Text style={styles.primaryBtnText}>Save Korean Address & Continue →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ════════════════════════════════════════════════════════════════ */}
              {/* STEP 3: EMAIL VERIFICATION                                      */}
              {/* ════════════════════════════════════════════════════════════════ */}
              {currentStep === 2 && (
                <View style={styles.stepCard}>
                  <View style={styles.stepIconCircle}>
                    <Text style={styles.stepIconEmoji}>📧</Text>
                  </View>
                  <Text style={styles.stepSubtitle}>
                    We will send a 6-digit code to activate your account.
                  </Text>

                  {/* Email Display */}
                  <View style={styles.emailDisplay}>
                    <Text style={styles.emailDisplayLabel}>Verification Email</Text>
                    <Text style={styles.emailDisplayValue}>{user?.email || 'No email set'}</Text>
                  </View>

                  {!isOtpSent ? (
                    /* Send Code Button */
                    <TouchableOpacity
                      style={styles.sendCodeBtn}
                      activeOpacity={0.85}
                      onPress={handleSendOtp}
                      disabled={isLoading}
                    >
                      <Text style={styles.sendCodeBtnText}>
                        {isLoading ? 'Sending Code...' : '📩 Send Verification Code'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    /* OTP Entry */
                    <View>
                      <View style={styles.otpSentBadge}>
                        <Text style={styles.otpSentBadgeText}>✅ Code Sent to {user?.email}</Text>
                      </View>

                      <Text style={styles.fieldLabel}>Enter 6-Digit Code *</Text>
                      <TextInput
                        style={[styles.input, styles.otpInput]}
                        value={otpCode}
                        onChangeText={(v) => setOtpCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                        placeholder="● ● ● ● ● ●"
                        placeholderTextColor={isDarkMode ? '#444' : '#ccc'}
                        keyboardType="number-pad"
                        maxLength={6}
                        textContentType="oneTimeCode"
                      />

                      <TouchableOpacity
                        style={styles.verifyBtn}
                        activeOpacity={0.85}
                        onPress={handleVerifyOtp}
                        disabled={isLoading}
                      >
                        <Text style={styles.verifyBtnText}>
                          {isLoading ? 'Verifying...' : '✓ Verify & Activate Account'}
                        </Text>
                      </TouchableOpacity>

                      {/* Resend Timer */}
                      <View style={styles.resendRow}>
                        <Text style={styles.resendTimerText}>
                          {otpTimer > 0 ? `Resend code in ${otpTimer}s` : "Didn't receive code?"}
                        </Text>
                        <TouchableOpacity
                          disabled={otpTimer > 0}
                          onPress={() => {
                            setIsOtpSent(false);
                            setOtpCode('');
                            handleSendOtp();
                          }}
                        >
                          <Text style={[styles.resendLink, otpTimer > 0 && { opacity: 0.4 }]}>
                            Resend Code
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const getStyles = (isDark: boolean) => {
  const bg = isDark ? '#0A0A0F' : '#F5F3F0';
  const cardBg = isDark ? 'rgba(22, 22, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)';
  const textMain = isDark ? '#FFFFFF' : '#1A1A2E';
  const textSub = isDark ? '#A0A0B0' : '#6B6B80';
  const border = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  const inputBg = isDark ? '#1A1A28' : '#F8F8FA';
  const accent = '#0095F6';
  const accentGreen = '#10B981';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      backgroundColor: isDark ? 'rgba(14, 14, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: textMain,
      textAlign: 'center',
    },
    backBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    backBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: accent,
    },
    skipBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    skipBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: textSub,
    },
    progressTrack: {
      height: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 12,
    },
    progressFill: {
      height: '100%',
      backgroundColor: accent,
      borderRadius: 2,
    },
    stepIndicatorRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    stepDot: {
      alignItems: 'center',
      flex: 1,
    },
    dot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    dotActive: {
      backgroundColor: accent,
    },
    dotText: {
      fontSize: 12,
      fontWeight: '800',
      color: textSub,
    },
    dotTextActive: {
      color: '#FFFFFF',
    },
    stepLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: textSub,
    },
    stepLabelActive: {
      color: accent,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 40,
    },
    stepCard: {
      backgroundColor: cardBg,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 20,
      elevation: 8,
    },
    stepIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: isDark ? 'rgba(0, 149, 246, 0.15)' : 'rgba(0, 149, 246, 0.08)',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 16,
    },
    stepIconEmoji: {
      fontSize: 30,
    },
    stepTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: textMain,
      textAlign: 'center',
      marginBottom: 6,
    },
    stepSubtitle: {
      fontSize: 13,
      color: textSub,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 18,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: textSub,
      marginBottom: 6,
      marginTop: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: textMain,
      marginBottom: 4,
    },
    inputMultiline: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    fieldRow: {
      flexDirection: 'row',
      gap: 12,
    },
    fieldHalf: {
      flex: 1,
    },
    countryCodeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 4,
    },
    countryCodeText: {
      fontSize: 15,
      fontWeight: '600',
      color: textMain,
    },
    countryCodeArrow: {
      fontSize: 10,
      color: textSub,
    },
    countryPickerList: {
      backgroundColor: isDark ? '#1E1E2E' : '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      marginBottom: 8,
      overflow: 'hidden',
    },
    countryPickerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    countryPickerItemActive: {
      backgroundColor: isDark ? 'rgba(0,149,246,0.15)' : 'rgba(0,149,246,0.06)',
    },
    countryPickerItemText: {
      fontSize: 14,
      color: textMain,
    },
    countryPickerCheck: {
      fontSize: 14,
      fontWeight: '900',
      color: accent,
    },
    phoneInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    phonePrefix: {
      backgroundColor: isDark ? 'rgba(0,149,246,0.15)' : 'rgba(0,149,246,0.08)',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: accent + '40',
    },
    phonePrefixText: {
      fontSize: 15,
      fontWeight: '800',
      color: accent,
    },
    phoneInput: {
      flex: 1,
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      fontWeight: '600',
      color: textMain,
      letterSpacing: 1,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    chipActive: {
      backgroundColor: isDark ? 'rgba(0,149,246,0.15)' : 'rgba(0,149,246,0.08)',
      borderColor: accent,
    },
    chipText: {
      fontSize: 13,
      fontWeight: '700',
      color: textSub,
    },
    chipTextActive: {
      color: accent,
    },
    primaryBtn: {
      backgroundColor: accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      shadowColor: accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
    },
    emailDisplay: {
      backgroundColor: isDark ? 'rgba(0,149,246,0.1)' : 'rgba(0,149,246,0.05)',
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: accent + '30',
      marginBottom: 16,
    },
    emailDisplayLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    emailDisplayValue: {
      fontSize: 16,
      fontWeight: '700',
      color: textMain,
    },
    sendCodeBtn: {
      backgroundColor: '#EA4335',
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#EA4335',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    sendCodeBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
    },
    otpSentBadge: {
      backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: accentGreen + '30',
    },
    otpSentBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: accentGreen,
      textAlign: 'center',
    },
    otpInput: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: 8,
      textAlign: 'center',
      paddingVertical: 18,
    },
    verifyBtn: {
      backgroundColor: accentGreen,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      shadowColor: accentGreen,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    verifyBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '900',
    },
    resendRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
    },
    resendTimerText: {
      fontSize: 12,
      color: textSub,
    },
    resendLink: {
      fontSize: 13,
      fontWeight: '800',
      color: accent,
    },
  });
};
