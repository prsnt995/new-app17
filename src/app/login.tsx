import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
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
import { supabase } from '@/config/supabase';
import {
  signInWithGoogle,
  sendEmailOtp,
  verifyEmailOtp,
  completeCustomerRegistration,
  ensureUserProfile,
} from '@/services/authService';
import { ensureUserDoc, saveUserDeliveryAddress } from '@/services/userService';
import { Address, KoreanAddress } from '@/types';

// Supabase Google OAuth redirect is handled by signInWithGoogle()

// ─── POPULAR SOUTH KOREA ADDRESS HUBS FOR QUICK POSTAL SEARCH ────────────────
interface KoreanAddressPreset {
  postalCode: string;
  province: string;
  city: string;
  district: string;
  streetAddress: string;
  buildingName: string;
  areaLabel: string;
}

const KOREAN_ADDRESS_PRESETS: KoreanAddressPreset[] = [
  {
    postalCode: '06000',
    province: 'Seoul',
    city: 'Seoul',
    district: 'Gangnam-gu',
    streetAddress: 'Gangnam-daero 396',
    buildingName: 'Gangnam Tower',
    areaLabel: 'Seoul · Gangnam Station',
  },
  {
    postalCode: '06164',
    province: 'Seoul',
    city: 'Seoul',
    district: 'Gangnam-gu',
    streetAddress: 'Teheran-ro 521',
    buildingName: 'COEX Grand Mall',
    areaLabel: 'Seoul · Samseong / COEX',
  },
  {
    postalCode: '04352',
    province: 'Seoul',
    city: 'Seoul',
    district: 'Yongsan-gu',
    streetAddress: 'Itaewon-ro 240',
    buildingName: 'Itaewon Center Plaza',
    areaLabel: 'Seoul · Itaewon / Yongsan',
  },
  {
    postalCode: '04043',
    province: 'Seoul',
    city: 'Seoul',
    district: 'Mapo-gu',
    streetAddress: 'Yanghwa-ro 160',
    buildingName: 'Hongdae Central Square',
    areaLabel: 'Seoul · Hongdae / Mapo',
  },
  {
    postalCode: '07333',
    province: 'Seoul',
    city: 'Seoul',
    district: 'Yeongdeungpo-gu',
    streetAddress: 'Yeouinaru-ro 56',
    buildingName: 'Yeouido Financial Plaza',
    areaLabel: 'Seoul · Yeouido Hub',
  },
  {
    postalCode: '05551',
    province: 'Seoul',
    city: 'Seoul',
    district: 'Songpa-gu',
    streetAddress: 'Olympic-ro 300',
    buildingName: 'Lotte World Tower',
    areaLabel: 'Seoul · Jamsil / Songpa',
  },
  {
    postalCode: '13494',
    province: 'Gyeonggi-do',
    city: 'Seongnam-si',
    district: 'Bundang-gu',
    streetAddress: 'Pangyoyeok-ro 146',
    buildingName: 'Pangyo Techno Valley Hub',
    areaLabel: 'Gyeonggi · Pangyo / Bundang',
  },
  {
    postalCode: '16499',
    province: 'Gyeonggi-do',
    city: 'Suwon-si',
    district: 'Yeongtong-gu',
    streetAddress: 'Gwanggyojungang-ro 140',
    buildingName: 'Gwanggyo Center Mall',
    areaLabel: 'Gyeonggi · Suwon / Gwanggyo',
  },
  {
    postalCode: '21998',
    province: 'Incheon',
    city: 'Incheon',
    district: 'Yeonsu-gu',
    streetAddress: 'Songdogukje-daero 123',
    buildingName: 'Songdo International Tower',
    areaLabel: 'Incheon · Songdo City',
  },
  {
    postalCode: '48099',
    province: 'Busan',
    city: 'Busan',
    district: 'Haeundae-gu',
    streetAddress: 'Haeundaehaebyeon-ro 280',
    buildingName: 'Haeundae Ocean View Apt',
    areaLabel: 'Busan · Haeundae',
  },
  {
    postalCode: '41911',
    province: 'Daegu',
    city: 'Daegu',
    district: 'Jung-gu',
    streetAddress: 'Dongseong-ro 30',
    buildingName: 'Dongseong Commercial Tower',
    areaLabel: 'Daegu · Dongseong-ro',
  },
  {
    postalCode: '35242',
    province: 'Daejeon',
    city: 'Daejeon',
    district: 'Seo-gu',
    streetAddress: 'Dunsan-ro 100',
    buildingName: 'Dunsan Central Plaza',
    areaLabel: 'Daejeon · Dunsan-dong',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const { user, updateUserProfile, isDarkMode } = useApp();
  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // AUTH TABS / MODES
  // 'REGISTER_STEP1' | 'REGISTER_STEP2_OTP' | 'REGISTER_STEP3_ADDRESS' | 'RETURNING_LOGIN' | 'RETURNING_LOGIN_OTP'
  const [authTab, setAuthTab] = useState<'REGISTER' | 'LOGIN'>('REGISTER');
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);

  // STEP 1: CUSTOMER INFORMATION FORM STATES
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');

  // STEP 2: EMAIL VERIFICATION OTP STATES
  const [otpInput, setOtpInput] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedUid, setVerifiedUid] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);

  // STEP 3: KOREAN DELIVERY ADDRESS STATES
  const [addrRecipientName, setAddrRecipientName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrPostalCode, setAddrPostalCode] = useState('06000');
  const [addrProvince, setAddrProvince] = useState('Seoul');
  const [addrCity, setAddrCity] = useState('Seoul');
  const [addrDistrict, setAddrDistrict] = useState('Gangnam-gu');
  const [addrStreetAddress, setAddrStreetAddress] = useState('');
  const [addrBuildingName, setAddrBuildingName] = useState('');
  const [addrUnitNumber, setAddrUnitNumber] = useState('');
  const [addrDeliveryInstructions, setAddrDeliveryInstructions] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(true);

  // KOREAN ADDRESS SEARCH MODAL HELPER
  const [showAddressSearchModal, setShowAddressSearchModal] = useState(false);
  const [searchAddressQuery, setSearchAddressQuery] = useState('');

  // RETURNING CUSTOMER LOGIN FORM STATES
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [isLoginOtpSent, setIsLoginOtpSent] = useState(false);

  // ADMIN OVERRIDE
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // LOADING STATES
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // ─── COOLDOWN TIMER ──────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (cooldownSeconds > 0) {
      timer = setInterval(() => {
        setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownSeconds]);

  // ─── EXPIRY TIMER ────────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (registerStep === 2 && expirySeconds > 0) {
      timer = setInterval(() => {
        setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [registerStep, expirySeconds]);

  // Redirect is handled by AuthGate in _layout.tsx (respects pendingRoute)

  // Auth is handled centrally in AppContext; login screen only triggers signInWithGoogle

  // ═════════════════════════════════════════════════════════════════════════════
  // GOOGLE LOGIN HANDLER (Supabase OAuth)
  // ═════════════════════════════════════════════════════════════════════════════
  const handleContinueWithGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChange will handle the rest after redirect
    } catch (err: any) {
      setIsGoogleLoading(false);
      Alert.alert('Google Sign-In Notice', err.message || 'Could not initiate Google sign-in.');
    }
  };

  const finalizeSupabaseUser = async (supabaseUser: any) => {
    try {
      const uid = supabaseUser.id;
      const finalEmail = (supabaseUser.email || '').toLowerCase();
      const finalName =
        supabaseUser.user_metadata?.name ||
        supabaseUser.user_metadata?.full_name ||
        finalEmail.split('@')[0].charAt(0).toUpperCase() + finalEmail.split('@')[0].slice(1);
      const finalAvatar =
        supabaseUser.user_metadata?.avatar ||
        supabaseUser.user_metadata?.picture ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';

      const uDoc = await ensureUserDoc(uid, {
        name: finalName,
        email: finalEmail,
        avatar: finalAvatar,
        role: 'customer',
        emailVerified: true,
      });

      const hasAddress = uDoc.addresses && uDoc.addresses.length > 0;

      const mappedAddrs: Address[] = (uDoc.addresses || []).map((a: any) => ({
        id: a.id || `addr-${Date.now()}`,
        title: a.label || 'Home',
        type: 'HOME',
        recipientName: a.recipientName || finalName,
        phone: a.phoneNumber || a.phone || '',
        phoneNumber: a.phoneNumber || a.phone || '',
        fullAddress: `${a.address || a.streetAddress}, ${a.detailAddress || ''} (${a.postalCode})`,
        province: a.province || 'Seoul',
        city: a.city || 'Seoul',
        district: a.district || 'Gangnam-gu',
        streetAddress: a.streetAddress || a.address || '',
        buildingName: a.buildingName || '',
        unitNumber: a.unitNumber || '',
        detailAddress: a.detailAddress || '',
        deliveryInstructions: a.deliveryInstructions || '',
        postalCode: a.postalCode || '06000',
        country: 'South Korea',
        isDefault: !!a.isDefault,
        label: a.label || 'Home',
      }));

      updateUserProfile({
        id: uid,
        name: uDoc.name || finalName,
        email: uDoc.email || finalEmail,
        phone: uDoc.phoneNumber || '',
        phoneNumber: uDoc.phoneNumber || '',
        avatar: uDoc.avatar || finalAvatar,
        isLoggedIn: true,
        emailVerified: true,
        profileSetupComplete: hasAddress,
        savedAddresses: mappedAddrs,
        authProvider: 'google',
      });

      setIsGoogleLoading(false);

      if (hasAddress) {
        router.replace('/');
      } else {
        setVerifiedEmail(finalEmail);
        setVerifiedUid(uid);
        setAddrRecipientName(finalName);
        setAddrPhone(uDoc.phoneNumber || '010-');
        setAuthTab('REGISTER');
        setRegisterStep(3);
        Alert.alert(
          'Google Account Connected! 🇰🇷',
          'Please enter your South Korean delivery address to complete your account setup.'
        );
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      Alert.alert('Google Sync Error', err.message || 'Could not sync Google account.');
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // REGISTRATION STEP 1: VALIDATE CUSTOMER INFO & TRIGGER OTP (DO NOT CREATE ACCOUNT YET)
  // ═════════════════════════════════════════════════════════════════════════════
  const handleProceedFromStep1ToStep2 = async () => {
    const name = regName.trim();
    const phone = regPhone.trim();
    const email = regEmail.trim().toLowerCase();

    if (!name || name.length < 2) {
      Alert.alert('Missing Name', 'Please enter your full name (at least 2 characters).');
      return;
    }

    if (!phone || phone.length < 9) {
      Alert.alert(
        'Invalid Korean Phone',
        'Please enter a valid Korean phone number (e.g. 010-1234-5678 or 01012345678).'
      );
      return;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }

    if (cooldownSeconds > 0) {
      Alert.alert('Please Wait', `You can request another verification code in ${cooldownSeconds} seconds.`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendEmailOtp(email);

      setIsLoading(false);
      setVerifiedEmail(email);
      setOtpInput('');
      setAttemptsRemaining(5);
      setExpirySeconds(600); // 10 minutes
      setCooldownSeconds(45);

      // Pre-fill Step 3 address fields
      setAddrRecipientName(name);
      setAddrPhone(phone);

      // Transition to Step 2 (Email Verification)
      setRegisterStep(2);

      Alert.alert(
        'Verification Code Sent! ✉️',
        `A 6-digit one-time verification code has been sent to your Gmail inbox:\n${email}\n\nPlease check your inbox to proceed.`
      );
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Could Not Send Code', err.message || 'Failed to send verification code. Please try again.');
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // REGISTRATION STEP 2: VERIFY EMAIL OTP (MUST SUCCEED BEFORE PROCEEDING TO STEP 3)
  // ═════════════════════════════════════════════════════════════════════════════
  const handleVerifyEmailStep2 = async () => {
    const code = otpInput.trim();

    if (!code) {
      Alert.alert('Enter Code', 'Please enter the 6-digit verification code sent to your email.');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Invalid Code Format', 'The verification code must be exactly 6 digits.');
      return;
    }

    if (expirySeconds <= 0) {
      Alert.alert('Code Expired', 'The verification code has expired. Please tap Resend Code.');
      return;
    }

    setIsLoading(true);
    try {
      const verifyRes = await verifyEmailOtp(verifiedEmail, code);

      if (!verifyRes.success) {
        setIsLoading(false);
        setAttemptsRemaining((prev) => Math.max(0, prev - 1));
        Alert.alert(
          'Verification Failed',
          verifyRes.error || 'Incorrect verification code. Please check your inbox and try again.'
        );
        return;
      }

      // Get user from session
      const { data: userData } = await supabase.auth.getUser();
      setVerifiedUid(userData.user?.id || null);
      setIsLoading(false);

      // Transition to Step 3: Korean Delivery Address
      setRegisterStep(3);

      Alert.alert(
        '✅ Email Verified Successfully!',
        'Your email address has been verified. Now, please enter your South Korean delivery address to complete registration.'
      );
    } catch (err: any) {
      setIsLoading(false);
      setAttemptsRemaining((prev) => Math.max(0, prev - 1));
      Alert.alert('Verification Error', err.message || 'Could not verify code. Please try again.');
    }
  };

  const handleResendStep2Code = async () => {
    if (cooldownSeconds > 0) {
      Alert.alert('Please Wait', `You can request another verification code in ${cooldownSeconds} seconds.`);
      return;
    }

    setIsLoading(true);
    try {
      await sendEmailOtp(verifiedEmail);
      setIsLoading(false);
      setOtpInput('');
      setAttemptsRemaining(5);
      setExpirySeconds(600);
      setCooldownSeconds(45);

      Alert.alert(
        'New Code Sent',
        `A fresh 6-digit verification code has been sent to your inbox (${verifiedEmail}).`
      );
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Resend Error', err.message || 'Could not resend verification code.');
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // REGISTRATION STEP 3 ➔ STEP 4 & 5: COMPLETE REGISTRATION & ATOMIC ACCOUNT CREATION
  // ═════════════════════════════════════════════════════════════════════════════
  const handleCompleteRegistration = async () => {
    // 1. Resolve user and address fields with smart fallbacks
    const name = regName.trim() || addrRecipientName.trim() || 'Customer';
    const phone = regPhone.trim() || addrPhone.trim() || '010-1234-5678';
    const email = (verifiedEmail.trim() || regEmail.trim() || 'customer@namastemart.com').toLowerCase();
    const postal = addrPostalCode.trim() || '06000';
    const province = addrProvince.trim() || 'Seoul';
    const city = addrCity.trim() || 'Seoul';
    const district = addrDistrict.trim() || 'Gangnam-gu';
    const street = addrStreetAddress.trim() || 'Gangnam-daero 396';
    const building = addrBuildingName.trim();
    const unit = addrUnitNumber.trim();
    const detail = `${building} ${unit}`.trim() || 'Unit 1';
    const instructions = addrDeliveryInstructions.trim();

    if (!name || name.length < 2) {
      Alert.alert('Missing Name', 'Please enter full recipient name.');
      return;
    }
    if (!phone || phone.length < 8) {
      Alert.alert('Missing Phone', 'Please enter a valid Korean phone number (e.g. 010-1234-5678).');
      return;
    }
    if (!street) {
      Alert.alert('Missing Street Address', 'Please enter your road name / street address in South Korea.');
      return;
    }

    setIsLoading(true);

    try {
      const newKoreanAddress: KoreanAddress = {
        id: `addr-${Date.now()}`,
        recipientName: name,
        phoneNumber: phone,
        phone,
        postalCode: postal,
        province,
        city,
        district,
        address: street,
        streetAddress: street,
        buildingName: building,
        unitNumber: unit,
        detailAddress: detail,
        deliveryInstructions: instructions,
        country: 'South Korea',
        label: 'Home',
        isDefault: addrIsDefault,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // STEP 4: ATOMIC ACCOUNT CREATION (Saves Name, Phone, Verified Email, UID, Address)
      const authResult = await completeCustomerRegistration({
        name,
        phoneNumber: phone,
        email,
        koreanAddress: newKoreanAddress,
        uid: verifiedUid || undefined,
      });

      const convertedAddress: Address = {
        id: newKoreanAddress.id,
        title: 'Home',
        type: 'HOME',
        recipientName: newKoreanAddress.recipientName,
        phone: newKoreanAddress.phoneNumber,
        phoneNumber: newKoreanAddress.phoneNumber,
        fullAddress: `${newKoreanAddress.address}, ${newKoreanAddress.detailAddress} (${newKoreanAddress.postalCode})`,
        province: newKoreanAddress.province,
        city: newKoreanAddress.city || 'Seoul',
        district: newKoreanAddress.district,
        streetAddress: newKoreanAddress.streetAddress,
        buildingName: newKoreanAddress.buildingName,
        unitNumber: newKoreanAddress.unitNumber,
        detailAddress: newKoreanAddress.detailAddress,
        deliveryInstructions: newKoreanAddress.deliveryInstructions,
        postalCode: newKoreanAddress.postalCode,
        country: 'South Korea',
        isDefault: newKoreanAddress.isDefault,
        label: 'Home',
      };

      // STEP 5: AUTOMATIC LOGIN (Establishes session & AppContext state)
      updateUserProfile({
        id: authResult.user.id,
        name,
        email,
        phone,
        phoneNumber: phone,
        avatar:
          (authResult.user as any).photoURL ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        isLoggedIn: true,
        emailVerified: true,
        profileSetupComplete: true,
        savedAddresses: [convertedAddress],
        authProvider: 'email',
      });

      setIsLoading(false);

      // Seamless redirect to Shopping Home on all platforms
      if (Platform.OS === 'web') {
        router.replace('/');
      } else {
        Alert.alert(
          '🎉 Registration Complete!',
          `Welcome to Namaste Mart, ${name}! Your account is now active.`,
          [
            {
              text: 'Start Shopping 🛍️',
              onPress: () => router.replace('/'),
            },
          ]
        );
        setTimeout(() => {
          router.replace('/');
        }, 1200);
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Registration Failed', err.message || 'Could not complete registration. Please try again.');
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // RETURNING CUSTOMER LOGIN FLOW
  // ═════════════════════════════════════════════════════════════════════════════
  const handleSendLoginOtp = async () => {
    const email = loginEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      await sendEmailOtp(email);
      setIsLoading(false);
      setIsLoginOtpSent(true);
      setCooldownSeconds(45);
      Alert.alert(
        'Verification Code Sent!',
        `We sent a 6-digit login code to your inbox (${email}).`
      );
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Could Not Send Code', err.message || 'Failed to send login code.');
    }
  };

  const handleVerifyLoginOtp = async () => {
    const email = loginEmail.trim().toLowerCase();
    const code = loginOtp.trim();

    if (!code || code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code received in your inbox.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyEmailOtp(email, code);
      if (res.success && res.session?.user) {
        await finalizeSupabaseUser(res.session.user);
      } else {
        setIsLoading(false);
        Alert.alert('Login Failed', res.error || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Login Failed', err.message || 'Invalid or expired verification code.');
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // KOREAN ADDRESS PRESET SELECTOR
  // ═════════════════════════════════════════════════════════════════════════════
  const handleSelectAddressPreset = (preset: KoreanAddressPreset) => {
    setAddrPostalCode(preset.postalCode);
    setAddrProvince(preset.province);
    setAddrCity(preset.city);
    setAddrDistrict(preset.district);
    setAddrStreetAddress(preset.streetAddress);
    setAddrBuildingName(preset.buildingName);
    setShowAddressSearchModal(false);
  };

  const filteredPresets = KOREAN_ADDRESS_PRESETS.filter((p) => {
    if (!searchAddressQuery.trim()) return true;
    const q = searchAddressQuery.toLowerCase();
    return (
      p.areaLabel.toLowerCase().includes(q) ||
      p.streetAddress.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q) ||
      p.postalCode.includes(q)
    );
  });

  const handleAdminLogin = () => {
    Alert.alert('Admin Login', 'Please sign in via Google with an admin-authorized email account.');
  };

  const handleGuestLogin = () => {
    updateUserProfile({
      isLoggedIn: false,
      authProvider: 'guest',
    });
    router.replace('/');
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1400',
        }}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.darkOverlay}>
          <SafeAreaView style={styles.container}>
            {/* TOP BAR */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.topBtnPill}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGuestLogin} style={styles.topBtnPill}>
                <Text style={styles.guestText}>Skip / Guest</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.centeredScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* MAIN AUTH CARD */}
              <View style={styles.authCard}>

                {/* BRAND HEADER */}
                <View style={styles.brandContainer}>
                  <Image
                    source={require('../../assets/images/namaste-mart-logo.png')}
                    style={styles.brandLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.brandSubText}>
                    Korea ⇄ India & Nepal Express Logistics & Groceries
                  </Text>
                </View>

                {/* PRIMARY GOOGLE LOGIN (AVAILABLE ACROSS SCREENS) */}
                {!showAdminLogin && (
                  <>
                    <TouchableOpacity
                      style={styles.googleButton}
                      activeOpacity={0.85}
                      onPress={handleContinueWithGoogle}
                      disabled={isGoogleLoading || isLoading}
                    >
                      <View style={styles.googleIconBadge}>
                        <Text style={styles.googleIconLetter}>G</Text>
                      </View>
                      <Text style={styles.googleButtonText}>
                        {isGoogleLoading ? 'Connecting Google...' : 'Continue with Google'}
                      </Text>
                    </TouchableOpacity>

                    {/* Other login methods temporarily hidden - only Google login active */}
                    {false && (
                      <View style={styles.orDividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.orText}>OR</Text>
                        <View style={styles.dividerLine} />
                      </View>
                    )}

                    {false && (
                      <View style={styles.authTabRow}>
                        <TouchableOpacity
                          style={[
                            styles.authTabBtn,
                            authTab === 'REGISTER' && styles.authTabBtnActive,
                          ]}
                          onPress={() => {
                            setAuthTab('REGISTER');
                            setRegisterStep(1);
                          }}
                        >
                          <Text
                            style={[
                              styles.authTabBtnText,
                              authTab === 'REGISTER' && styles.authTabBtnTextActive,
                            ]}
                          >
                            ✨ Create Account
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.authTabBtn,
                            authTab === 'LOGIN' && styles.authTabBtnActive,
                          ]}
                          onPress={() => {
                            setAuthTab('LOGIN');
                            setIsLoginOtpSent(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.authTabBtnText,
                              authTab === 'LOGIN' && styles.authTabBtnTextActive,
                            ]}
                          >
                            📱 Log In
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                {/* Other auth flows temporarily disabled - only Google login active */}
                {false && authTab === 'REGISTER' && !showAdminLogin && (
                  <View style={styles.formContainer}>
                    {/* STEP PROGRESS INDICATOR */}
                    <View style={styles.wizardProgressRow}>
                      <View
                        style={[
                          styles.wizardStepDot,
                          registerStep >= 1 && styles.wizardStepDotActive,
                        ]}
                      >
                        <Text style={styles.wizardStepDotNum}>1</Text>
                      </View>
                      <View
                        style={[
                          styles.wizardStepLine,
                          registerStep >= 2 && styles.wizardStepLineActive,
                        ]}
                      />
                      <View
                        style={[
                          styles.wizardStepDot,
                          registerStep >= 2 && styles.wizardStepDotActive,
                        ]}
                      >
                        <Text style={styles.wizardStepDotNum}>2</Text>
                      </View>
                      <View
                        style={[
                          styles.wizardStepLine,
                          registerStep >= 3 && styles.wizardStepLineActive,
                        ]}
                      />
                      <View
                        style={[
                          styles.wizardStepDot,
                          registerStep >= 3 && styles.wizardStepDotActive,
                        ]}
                      >
                        <Text style={styles.wizardStepDotNum}>3</Text>
                      </View>
                    </View>

                    {/* ───────────────────────────────────────────────────────── */}
                    {/* STEP 1: CUSTOMER INFORMATION                              */}
                    {/* ───────────────────────────────────────────────────────── */}
                    {registerStep === 1 && (
                      <View>
                        <View style={styles.stepBadge}>
                          <Text style={styles.stepBadgeText}>STEP 1 OF 3 · CUSTOMER INFORMATION</Text>
                        </View>
                        <Text style={styles.screenTitle}>Create Customer Account</Text>
                        <Text style={styles.screenSubtitle}>
                          Enter your details to begin registration. Account is created after address verification.
                        </Text>

                        <Text style={styles.inputLabel}>Full Name *</Text>
                        <View style={styles.inputFieldBox}>
                          <Text style={styles.inputPrefixIcon}>👤</Text>
                          <TextInput
                            style={styles.textInput}
                            value={regName}
                            onChangeText={setRegName}
                            placeholder="Full Name (e.g. Rohan Sharma)"
                            placeholderTextColor="#8E8E93"
                            autoCapitalize="words"
                          />
                        </View>

                        <Text style={styles.inputLabel}>Korean Phone Number *</Text>
                        <View style={styles.inputFieldBox}>
                          <Text style={styles.inputPrefixIcon}>🇰🇷</Text>
                          <TextInput
                            style={styles.textInput}
                            value={regPhone}
                            onChangeText={setRegPhone}
                            placeholder="Korean Mobile (e.g. 010-1234-5678)"
                            placeholderTextColor="#8E8E93"
                            keyboardType="phone-pad"
                          />
                        </View>

                        <Text style={styles.inputLabel}>Personal Email Address *</Text>
                        <View style={styles.inputFieldBox}>
                          <Text style={styles.inputPrefixIcon}>✉️</Text>
                          <TextInput
                            style={styles.textInput}
                            value={regEmail}
                            onChangeText={setRegEmail}
                            placeholder="Email Address (e.g. name@gmail.com)"
                            placeholderTextColor="#8E8E93"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.primaryActionButton}
                          activeOpacity={0.85}
                          onPress={handleProceedFromStep1ToStep2}
                          disabled={isLoading}
                        >
                          <Text style={styles.primaryActionText}>
                            {isLoading ? 'Sending Code...' : 'Continue to Email Verification ➔'}
                          </Text>
                        </TouchableOpacity>

                        <Text style={styles.passwordlessNotice}>
                          🔒 Zero passwords required. We will send a 6-digit verification code to your email.
                        </Text>
                      </View>
                    )}

                    {/* ───────────────────────────────────────────────────────── */}
                    {/* STEP 2: EMAIL VERIFICATION (OTP)                          */}
                    {/* ───────────────────────────────────────────────────────── */}
                    {registerStep === 2 && (
                      <View>
                        <View style={styles.stepBadge}>
                          <Text style={styles.stepBadgeText}>STEP 2 OF 3 · EMAIL VERIFICATION</Text>
                        </View>
                        <Text style={styles.screenTitle}>Enter Verification Code</Text>
                        <Text style={styles.screenSubtitle}>
                          Enter the 6-digit verification code sent to your email:
                        </Text>

                        {/* TARGET EMAIL PILL */}
                        <View style={styles.emailPillBox}>
                          <Text style={styles.emailPillText}>{verifiedEmail}</Text>
                          <TouchableOpacity
                            onPress={() => setRegisterStep(1)}
                            style={styles.changeEmailBtn}
                          >
                            <Text style={styles.changeEmailText}>Edit</Text>
                          </TouchableOpacity>
                        </View>

                        {/* 6-DIGIT OTP INPUT */}
                        <View style={styles.otpInputContainer}>
                          <TextInput
                            style={styles.otpInput}
                            value={otpInput}
                            onChangeText={setOtpInput}
                            placeholder="000000"
                            placeholderTextColor="#999999"
                            keyboardType="numeric"
                            maxLength={6}
                            autoFocus={true}
                          />
                        </View>

                        {/* EXPIRY & ATTEMPTS */}
                        <View style={styles.expiryInfoRow}>
                          <Text style={styles.expiryText}>
                            ⏱️ Code expires in:{' '}
                            <Text
                              style={{
                                fontWeight: '800',
                                color: expirySeconds < 60 ? '#EF4444' : '#10B981',
                              }}
                            >
                              {formatTime(expirySeconds)}
                            </Text>
                          </Text>
                          {attemptsRemaining < 5 && (
                            <Text style={styles.attemptsText}>
                              ({attemptsRemaining} attempts left)
                            </Text>
                          )}
                        </View>

                        {/* GMAIL INBOX NOTICE */}
                        <View style={styles.inboxNoticeCard}>
                          <Text style={styles.inboxNoticeIcon}>📬</Text>
                          <Text style={styles.inboxNoticeText}>
                            Please check your Gmail inbox (or spam folder) for the 6-digit code.
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.primaryActionButton}
                          activeOpacity={0.85}
                          onPress={handleVerifyEmailStep2}
                          disabled={isLoading}
                        >
                          <Text style={styles.primaryActionText}>
                            {isLoading ? 'Verifying...' : 'Verify Email ➔'}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.resendRow}>
                          <TouchableOpacity
                            onPress={handleResendStep2Code}
                            disabled={cooldownSeconds > 0 || isLoading}
                            style={[
                              styles.resendButton,
                              cooldownSeconds > 0 && styles.resendButtonDisabled,
                            ]}
                          >
                            <Text style={styles.resendButtonText}>
                              {cooldownSeconds > 0
                                ? `Resend Code (${cooldownSeconds}s)`
                                : '📩 Resend Code'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => setRegisterStep(1)}
                            style={styles.backToLoginBtn}
                          >
                            <Text style={styles.backToLoginText}>← Back to Step 1</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* ───────────────────────────────────────────────────────── */}
                    {/* STEP 3: KOREAN DELIVERY ADDRESS                           */}
                    {/* ───────────────────────────────────────────────────────── */}
                    {registerStep === 3 && (
                      <View>
                        <View style={styles.stepBadge}>
                          <Text style={styles.stepBadgeText}>STEP 3 OF 3 · KOREAN DELIVERY ADDRESS</Text>
                        </View>
                        <Text style={styles.screenTitle}>🇰🇷 Korean Delivery Address</Text>
                        <Text style={styles.screenSubtitle}>
                          Enter your South Korean delivery address to complete registration.
                        </Text>

                        {/* SEARCH KOREAN ADDRESS BUTTON */}
                        <TouchableOpacity
                          style={styles.searchAddressTriggerBtn}
                          onPress={() => setShowAddressSearchModal(true)}
                        >
                          <Text style={styles.searchAddressTriggerText}>
                            🔍 Search Korean Address / Postal Code
                          </Text>
                        </TouchableOpacity>

                        <Text style={styles.inputLabel}>Recipient Full Name *</Text>
                        <View style={styles.inputFieldBox}>
                          <TextInput
                            style={styles.textInput}
                            value={addrRecipientName}
                            onChangeText={setAddrRecipientName}
                            placeholder="Recipient Name"
                            placeholderTextColor="#8E8E93"
                          />
                        </View>

                        <Text style={styles.inputLabel}>Korean Phone Number *</Text>
                        <View style={styles.inputFieldBox}>
                          <TextInput
                            style={styles.textInput}
                            value={addrPhone}
                            onChangeText={setAddrPhone}
                            placeholder="Phone (e.g. 010-1234-5678)"
                            placeholderTextColor="#8E8E93"
                            keyboardType="phone-pad"
                          />
                        </View>

                        <Text style={styles.inputLabel}>5-digit Korean Postal Code *</Text>
                        <View style={styles.inputFieldBox}>
                          <TextInput
                            style={styles.textInput}
                            value={addrPostalCode}
                            onChangeText={setAddrPostalCode}
                            placeholder="Postal Code (e.g. 06000)"
                            placeholderTextColor="#8E8E93"
                            keyboardType="numeric"
                          />
                        </View>

                        <View style={styles.inputRow}>
                          <View style={{ flex: 1, marginRight: 6 }}>
                            <Text style={styles.inputLabel}>Province / City *</Text>
                            <View style={styles.inputFieldBox}>
                              <TextInput
                                style={styles.textInput}
                                value={addrProvince}
                                onChangeText={setAddrProvince}
                                placeholder="e.g. Seoul"
                                placeholderTextColor="#8E8E93"
                              />
                            </View>
                          </View>
                          <View style={{ flex: 1, marginLeft: 6 }}>
                            <Text style={styles.inputLabel}>District / Gu *</Text>
                            <View style={styles.inputFieldBox}>
                              <TextInput
                                style={styles.textInput}
                                value={addrDistrict}
                                onChangeText={setAddrDistrict}
                                placeholder="e.g. Gangnam-gu"
                                placeholderTextColor="#8E8E93"
                              />
                            </View>
                          </View>
                        </View>

                        <Text style={styles.inputLabel}>Street Address (Road Name / 지번주소) *</Text>
                        <View style={styles.inputFieldBox}>
                          <TextInput
                            style={styles.textInput}
                            value={addrStreetAddress}
                            onChangeText={setAddrStreetAddress}
                            placeholder="Street Address (e.g. Gangnam-daero 396)"
                            placeholderTextColor="#8E8E93"
                          />
                        </View>

                        <View style={styles.inputRow}>
                          <View style={{ flex: 1, marginRight: 6 }}>
                            <Text style={styles.inputLabel}>Building / Apt</Text>
                            <View style={styles.inputFieldBox}>
                              <TextInput
                                style={styles.textInput}
                                value={addrBuildingName}
                                onChangeText={setAddrBuildingName}
                                placeholder="Building / Apt Name"
                                placeholderTextColor="#8E8E93"
                              />
                            </View>
                          </View>
                          <View style={{ flex: 1, marginLeft: 6 }}>
                            <Text style={styles.inputLabel}>Unit / Room #</Text>
                            <View style={styles.inputFieldBox}>
                              <TextInput
                                style={styles.textInput}
                                value={addrUnitNumber}
                                onChangeText={setAddrUnitNumber}
                                placeholder="Unit / Room #"
                                placeholderTextColor="#8E8E93"
                              />
                            </View>
                          </View>
                        </View>

                        <Text style={styles.inputLabel}>Delivery Instructions (Optional)</Text>
                        <View style={styles.inputFieldBox}>
                          <TextInput
                            style={styles.textInput}
                            value={addrDeliveryInstructions}
                            onChangeText={setAddrDeliveryInstructions}
                            placeholder="e.g. Leave at front door / Security office"
                            placeholderTextColor="#8E8E93"
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.checkboxRow}
                          onPress={() => setAddrIsDefault(!addrIsDefault)}
                        >
                          <Text style={{ fontSize: 18, marginRight: 8 }}>
                            {addrIsDefault ? '☑️' : '⏹️'}
                          </Text>
                          <Text style={styles.checkboxText}>
                            Set this as my primary South Korean delivery address
                          </Text>
                        </TouchableOpacity>

                        {/* COMPLETE REGISTRATION BUTTON (TRIGGERS STEP 4 & 5) */}
                        <TouchableOpacity
                          style={styles.completeRegButton}
                          activeOpacity={0.85}
                          onPress={handleCompleteRegistration}
                          disabled={isLoading}
                        >
                          <Text style={styles.completeRegButtonText}>
                            {isLoading ? 'Creating Account...' : 'Complete Registration ➔'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* FLOW 2: RETURNING CUSTOMER LOG IN                          */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {false && authTab === 'LOGIN' && !showAdminLogin && (
                  <View style={styles.formContainer}>
                    <Text style={styles.screenTitle}>Returning Customer Log In</Text>
                    <Text style={styles.screenSubtitle}>
                      Sign in to access your orders, cart, and delivery addresses.
                    </Text>

                    {!isLoginOtpSent ? (
                      <View>
                        <Text style={styles.inputLabel}>Your Registered Email Address</Text>
                        <View style={styles.inputFieldBox}>
                          <Text style={styles.inputPrefixIcon}>✉️</Text>
                          <TextInput
                            style={styles.textInput}
                            value={loginEmail}
                            onChangeText={setLoginEmail}
                            placeholder="name@example.com"
                            placeholderTextColor="#8E8E93"
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.primaryActionButton}
                          activeOpacity={0.85}
                          onPress={handleSendLoginOtp}
                          disabled={isLoading}
                        >
                          <Text style={styles.primaryActionText}>
                            {isLoading ? 'Sending Code...' : 'Send Login Code ➔'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <View style={styles.emailPillBox}>
                          <Text style={styles.emailPillText}>{loginEmail}</Text>
                          <TouchableOpacity
                            onPress={() => setIsLoginOtpSent(false)}
                            style={styles.changeEmailBtn}
                          >
                            <Text style={styles.changeEmailText}>Change</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                        <View style={styles.otpInputContainer}>
                          <TextInput
                            style={styles.otpInput}
                            value={loginOtp}
                            onChangeText={setLoginOtp}
                            placeholder="000000"
                            placeholderTextColor="#999999"
                            keyboardType="numeric"
                            maxLength={6}
                            autoFocus={true}
                          />
                        </View>

                        <View style={styles.inboxNoticeCard}>
                          <Text style={styles.inboxNoticeIcon}>📬</Text>
                          <Text style={styles.inboxNoticeText}>
                            Please enter the 6-digit code received in your Gmail inbox.
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.primaryActionButton}
                          activeOpacity={0.85}
                          onPress={handleVerifyLoginOtp}
                          disabled={isLoading}
                        >
                          <Text style={styles.primaryActionText}>
                            {isLoading ? 'Signing In...' : 'Verify & Log In ➔'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={() => setIsLoginOtpSent(false)}
                        >
                          <Text style={styles.secondaryButtonText}>← Re-enter Email</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ADMIN TOGGLE */}
                    <TouchableOpacity
                      style={styles.adminToggleRow}
                      onPress={() => setShowAdminLogin(true)}
                    >
                      <Text style={styles.adminToggleText}>🔑 Store Admin Login</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* FLOW 3: ADMIN LOGIN OVERRIDE                               */}
                {/* ═══════════════════════════════════════════════════════════ */}
                {false && showAdminLogin && (
                  <View style={styles.formContainer}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>ADMINISTRATOR PORTAL</Text>
                    </View>
                    <Text style={styles.screenTitle}>Store Admin Sign In</Text>
                    <Text style={styles.screenSubtitle}>
                      Manage orders, inventory, and cargo logistics
                    </Text>

                    <View style={styles.inputFieldBox}>
                      <TextInput
                        style={styles.textInput}
                        value={adminUsername}
                        onChangeText={setAdminUsername}
                        placeholder="Admin Username (e.g. admin)"
                        placeholderTextColor="#8E8E93"
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={styles.inputFieldBox}>
                      <TextInput
                        style={styles.textInput}
                        value={adminPassword}
                        onChangeText={setAdminPassword}
                        placeholder="Admin Password"
                        placeholderTextColor="#8E8E93"
                        secureTextEntry={true}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.primaryActionButton}
                      activeOpacity={0.85}
                      onPress={handleAdminLogin}
                    >
                      <Text style={styles.primaryActionText}>Log in to Admin Dashboard ➔</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => setShowAdminLogin(false)}
                    >
                      <Text style={styles.secondaryButtonText}>← Back to Customer Login</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* FOOTER BRANDING */}
              <View style={styles.footerBranding}>
                <Text style={styles.footerBrandText}>
                  NAMASTEMART · EXPRESS AIR CARGO & LOGISTICS 🇰🇷 🇮🇳 🇳🇵
                </Text>
              </View>
            </ScrollView>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* KOREAN ADDRESS SEARCH MODAL HELPER                         */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <Modal
              visible={showAddressSearchModal}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowAddressSearchModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.addressModalCard}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitleText}>🇰🇷 Search Korean Address</Text>
                    <TouchableOpacity
                      onPress={() => setShowAddressSearchModal(false)}
                      style={styles.modalCloseBtn}
                    >
                      <Text style={styles.modalCloseBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalSubText}>
                    Search by road name, district, or area (e.g. Gangnam, Mapo, Teheran-ro, Pangyo, Incheon, Busan):
                  </Text>

                  <View style={styles.modalSearchBox}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
                    <TextInput
                      style={styles.modalSearchInput}
                      value={searchAddressQuery}
                      onChangeText={setSearchAddressQuery}
                      placeholder="Type district or road name..."
                      placeholderTextColor="#8E8E93"
                      autoFocus={true}
                    />
                  </View>

                  <ScrollView style={{ maxHeight: 300 }}>
                    {filteredPresets.map((preset, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.presetItemCard}
                        onPress={() => handleSelectAddressPreset(preset)}
                      >
                        <View style={styles.presetBadge}>
                          <Text style={styles.presetPostalText}>{preset.postalCode}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.presetAreaText}>{preset.areaLabel}</Text>
                          <Text style={styles.presetStreetText}>
                            {preset.province} {preset.district} {preset.streetAddress}
                          </Text>
                          <Text style={styles.presetBuildingText}>({preset.buildingName})</Text>
                        </View>
                        <Text style={styles.presetSelectArrow}>➔</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setShowAddressSearchModal(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Close Search</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </SafeAreaView>
        </View>
      </ImageBackground>
    </>
  );
}

const getStyles = (isDark: boolean) => {
  const cardBg = isDark ? 'rgba(18, 20, 24, 0.97)' : 'rgba(255, 255, 255, 0.98)';
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? '#9CA3AF' : '#4B5563';
  const border = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(229, 231, 235, 1)';
  const primaryGreen = '#008060';
  const accentBlue = '#0095F6';

  return StyleSheet.create({
    bgImage: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    darkOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.58)',
    },
    container: {
      flex: 1,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    topBtnPill: {
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.35)',
    },
    backText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    guestText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    centeredScrollContent: {
      paddingHorizontal: 18,
      paddingVertical: 20,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '88%',
    },
    authCard: {
      width: '100%',
      maxWidth: 470,
      backgroundColor: cardBg,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: border,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
    },
    flightBannerContainer: {
      width: '100%',
      height: 120,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 18,
      position: 'relative',
    },
    flightBannerImage: {
      width: '100%',
      height: '100%',
    },
    flightOverlayBadge: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.82)',
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    liveFlightPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.25)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginBottom: 3,
    },
    greenDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
      marginRight: 6,
    },
    liveFlightText: {
      fontSize: 9,
      fontWeight: '900',
      color: '#10B981',
      letterSpacing: 0.5,
    },
    flightBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    brandContainer: {
      alignItems: 'center',
      marginBottom: 18,
    },
    brandLogo: {
      width: 160,
      height: 160,
      borderRadius: 80,
      marginBottom: 12,
      alignSelf: 'center',
    },
    brandLogoText: {
      fontSize: 28,
      fontWeight: '900',
      color: textMain,
      letterSpacing: -0.5,
    },
    brandSubText: {
      fontSize: 11,
      fontWeight: '600',
      color: textSub,
      marginTop: 4,
      textAlign: 'center',
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#262626' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#D1D5DB',
      borderRadius: 12,
      height: 48,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    googleIconBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#4285F4',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    googleIconLetter: {
      fontSize: 15,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    googleButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: textMain,
    },
    orDividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: border,
    },
    orText: {
      marginHorizontal: 12,
      fontSize: 11,
      fontWeight: '800',
      color: textSub,
    },
    authTabRow: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#262A30' : '#F3F4F6',
      borderRadius: 12,
      padding: 4,
      marginBottom: 20,
    },
    authTabBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
    },
    authTabBtnActive: {
      backgroundColor: isDark ? '#333842' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
    authTabBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: textSub,
    },
    authTabBtnTextActive: {
      color: textMain,
      fontWeight: '900',
    },
    formContainer: {
      width: '100%',
    },
    wizardProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    wizardStepDot: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: isDark ? '#262A30' : '#E5E7EB',
      alignItems: 'center',
      justifyContent: 'center',
    },
    wizardStepDotActive: {
      backgroundColor: primaryGreen,
    },
    wizardStepDotNum: {
      fontSize: 12,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    wizardStepLine: {
      width: 40,
      height: 3,
      backgroundColor: isDark ? '#262A30' : '#E5E7EB',
      marginHorizontal: 6,
      borderRadius: 2,
    },
    wizardStepLineActive: {
      backgroundColor: primaryGreen,
    },
    screenTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: textMain,
      textAlign: 'center',
      marginBottom: 4,
    },
    screenSubtitle: {
      fontSize: 12,
      color: textSub,
      textAlign: 'center',
      marginBottom: 18,
      lineHeight: 16,
    },
    stepBadge: {
      backgroundColor: 'rgba(0, 128, 96, 0.12)',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
      alignSelf: 'center',
      marginBottom: 10,
    },
    stepBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      color: primaryGreen,
      letterSpacing: 0.5,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: textMain,
      marginBottom: 4,
    },
    inputFieldBox: {
      width: '100%',
      backgroundColor: isDark ? '#262A30' : '#F9FAFB',
      borderWidth: 1,
      borderColor: border,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    inputPrefixIcon: {
      fontSize: 16,
      marginRight: 8,
    },
    inputRow: {
      flexDirection: 'row',
      width: '100%',
    },
    textInput: {
      height: 46,
      fontSize: 14,
      color: textMain,
      flex: 1,
    },
    primaryActionButton: {
      width: '100%',
      backgroundColor: primaryGreen,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
      shadowColor: primaryGreen,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    primaryActionText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    completeRegButton: {
      width: '100%',
      backgroundColor: '#10B981',
      height: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },
    completeRegButtonText: {
      fontSize: 15,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
    passwordlessNotice: {
      fontSize: 11,
      color: textSub,
      textAlign: 'center',
      marginTop: 14,
      lineHeight: 16,
    },
    emailPillBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#262A30' : '#EFF6FF',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#BFDBFE',
      marginBottom: 14,
    },
    emailPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1D4ED8',
      flex: 1,
    },
    changeEmailBtn: {
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    changeEmailText: {
      fontSize: 12,
      fontWeight: '800',
      color: accentBlue,
    },
    otpInputContainer: {
      alignItems: 'center',
      marginBottom: 10,
    },
    otpInput: {
      width: '100%',
      height: 54,
      backgroundColor: isDark ? '#262A30' : '#F9FAFB',
      borderWidth: 2,
      borderColor: isDark ? '#3B82F6' : '#2563EB',
      borderRadius: 12,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: 10,
      textAlign: 'center',
      color: textMain,
    },
    expiryInfoRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    expiryText: {
      fontSize: 12,
      color: textSub,
    },
    attemptsText: {
      fontSize: 12,
      color: '#EF4444',
      fontWeight: '700',
      marginLeft: 6,
    },
    inboxNoticeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE',
      padding: 10,
      borderRadius: 12,
      marginBottom: 14,
    },
    inboxNoticeIcon: {
      fontSize: 16,
      marginRight: 8,
    },
    inboxNoticeText: {
      fontSize: 11,
      color: isDark ? '#DBEAFE' : '#1E40AF',
      fontWeight: '600',
      lineHeight: 15,
      flex: 1,
    },
    resendRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
    },
    resendButton: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    resendButtonDisabled: {
      opacity: 0.5,
    },
    resendButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: accentBlue,
    },
    backToLoginBtn: {
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    backToLoginText: {
      fontSize: 12,
      fontWeight: '700',
      color: textSub,
    },
    searchAddressTriggerBtn: {
      width: '100%',
      backgroundColor: isDark ? '#262A30' : '#EEF2FF',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : '#C7D2FE',
      borderRadius: 12,
      paddingVertical: 11,
      alignItems: 'center',
      marginBottom: 14,
    },
    searchAddressTriggerText: {
      fontSize: 13,
      fontWeight: '800',
      color: isDark ? '#A5B4FC' : '#4338CA',
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 10,
    },
    checkboxText: {
      fontSize: 12,
      fontWeight: '600',
      color: textMain,
    },
    adminToggleRow: {
      alignItems: 'center',
      marginTop: 18,
      paddingVertical: 6,
    },
    adminToggleText: {
      fontSize: 12,
      fontWeight: '700',
      color: textSub,
    },
    secondaryButton: {
      width: '100%',
      backgroundColor: isDark ? '#333333' : '#F3F4F6',
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      borderWidth: 1,
      borderColor: border,
    },
    secondaryButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: textMain,
    },
    footerBranding: {
      marginTop: 20,
      alignItems: 'center',
    },
    footerBrandText: {
      fontSize: 10,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: 0.8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 18,
    },
    addressModalCard: {
      width: '100%',
      maxWidth: 450,
      backgroundColor: cardBg,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: border,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    modalTitleText: {
      fontSize: 17,
      fontWeight: '900',
      color: textMain,
    },
    modalCloseBtn: {
      padding: 6,
    },
    modalCloseBtnText: {
      fontSize: 16,
      fontWeight: '900',
      color: textSub,
    },
    modalSubText: {
      fontSize: 12,
      color: textSub,
      marginBottom: 12,
      lineHeight: 16,
    },
    modalSearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#262A30' : '#F9FAFB',
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      paddingHorizontal: 10,
      marginBottom: 12,
    },
    modalSearchInput: {
      height: 42,
      flex: 1,
      fontSize: 13,
      color: textMain,
    },
    presetItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: isDark ? '#262A30' : '#F9FAFB',
      borderWidth: 1,
      borderColor: border,
      marginBottom: 8,
    },
    presetBadge: {
      backgroundColor: primaryGreen,
      paddingVertical: 4,
      paddingHorizontal: 7,
      borderRadius: 6,
      marginRight: 10,
    },
    presetPostalText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#FFFFFF',
    },
    presetAreaText: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    presetStreetText: {
      fontSize: 11,
      color: textSub,
      marginTop: 2,
    },
    presetBuildingText: {
      fontSize: 10,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginTop: 1,
    },
    presetSelectArrow: {
      fontSize: 14,
      fontWeight: '900',
      color: primaryGreen,
      marginLeft: 8,
    },
  });
};
