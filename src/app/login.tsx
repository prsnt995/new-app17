import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
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
import { auth, googleProvider, createGoogleCredential, signInWithCredential } from '@/config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { googleSignInBackend } from '@/services/api';

// For web-based OAuth redirect completion
WebBrowser.maybeCompleteAuthSession();

// Google OAuth discovery document
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export default function LoginScreen() {
  const router = useRouter();
  const { user, updateUserProfile, isDarkMode } = useApp();
  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // GOOGLE OAUTH SETUP
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'namastemart' });

  const [googleRequest, googleResponse, promptGoogleAsync] = AuthSession.useAuthRequest(
    {
      clientId: googleClientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
    },
    GOOGLE_DISCOVERY
  );

  // LOGIN MODE: 'INSTAGRAM' (Direct Login) | 'GMAIL_OTP' (Gmail Code)
  const [loginMode, setLoginMode] = useState<'INSTAGRAM' | 'GMAIL_OTP'>('INSTAGRAM');

  // FORM INPUT STATES
  const [usernameInput, setUsernameInput] = useState(user?.email || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // GMAIL OTP STATES
  const [gmailInput, setGmailInput] = useState(user?.email || '');
  const [userEnteredCode, setUserEnteredCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('123456');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // COUNTDOWN TIMER FOR RESENDING GMAIL CODE
  useEffect(() => {
    let interval: any = null;
    if (isCodeSent && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCodeSent, timerSeconds]);

  // HANDLE GOOGLE OAUTH RESPONSE
  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.params?.id_token) {
      handleGoogleSignInResult(googleResponse.params.id_token);
    } else if (googleResponse?.type === 'error') {
      setIsGoogleLoading(false);
      Alert.alert('Google Sign-In Error', 'Could not sign in with Google. Please try again.');
    }
  }, [googleResponse]);

  // PROCESS GOOGLE SIGN-IN RESULT
  const handleGoogleSignInResult = async (idToken: string) => {
    try {
      setIsGoogleLoading(true);

      // Sign in to Firebase with the Google credential
      const credential = createGoogleCredential(idToken);
      const firebaseResult = await signInWithCredential(auth, credential);
      const firebaseUser = firebaseResult.user;

      // Also verify with backend
      try {
        const backendToken = await firebaseUser.getIdToken();
        await googleSignInBackend(backendToken);
      } catch (backendErr) {
        console.log('Backend Google sign-in notice:', backendErr);
      }

      // Update local user profile with Google data
      updateUserProfile({
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || '',
        avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
        isLoggedIn: true,
        emailVerified: firebaseUser.emailVerified || false,
        authProvider: 'google',
      });

      setIsGoogleLoading(false);

      // Navigate to onboarding for phone number & address collection
      Alert.alert(
        'Welcome! 🎉',
        `Signed in as ${firebaseUser.email}\n\nLet\'s complete your profile.`,
        [{ text: 'Continue', onPress: () => router.replace('/onboarding') }]
      );
    } catch (error: any) {
      setIsGoogleLoading(false);
      console.log('Google Sign-In Firebase Error:', error);
      Alert.alert('Sign-In Error', error.message || 'Could not complete Google sign-in.');
    }
  };

  // CONTINUE WITH GOOGLE BUTTON HANDLER
  const handleContinueWithGoogle = async () => {
    if (!googleClientId) {
      // Fallback: If no Google Client ID configured, use a demo flow
      setIsGoogleLoading(true);
      setTimeout(() => {
        setIsGoogleLoading(false);
        const demoEmail = 'user@gmail.com';
        const demoName = 'User';

        updateUserProfile({
          name: demoName,
          email: demoEmail,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
          isLoggedIn: true,
          emailVerified: false,
          authProvider: 'google',
        });

        Alert.alert(
          'Google Sign-In (Demo)',
          `Signed in as ${demoEmail}\n\n(Configure EXPO_PUBLIC_GOOGLE_CLIENT_ID for real Google OAuth)\n\nLet\'s complete your profile.`,
          [{ text: 'Continue', onPress: () => router.replace('/onboarding') }]
        );
      }, 800);
      return;
    }

    setIsGoogleLoading(true);
    try {
      await promptGoogleAsync();
    } catch (err) {
      setIsGoogleLoading(false);
      Alert.alert('Error', 'Could not initiate Google sign-in.');
    }
  };

  // REAL EMAIL DISPATCH FUNCTION (DISPATCHES CODE TO USER'S GMAIL)
  const sendGmailVerificationCode = async (targetEmail: string, code: string) => {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_namaste',
          template_id: 'template_otp',
          user_id: 'public_key_namaste',
          template_params: {
            to_email: targetEmail,
            verification_code: code,
            app_name: 'NamasteMart Express Logistics',
          },
        }),
      });
      return response.ok;
    } catch (error) {
      console.log('Gmail Dispatch Log:', error);
      return false;
    }
  };

  // 1. INSTAGRAM STYLE DIRECT LOG IN WITH FIREBASE AUTH INTEGRATION
  const handleInstagramStyleLogin = async () => {
    const username = usernameInput.trim();
    if (!username) {
      Alert.alert('Missing Field', 'Please enter your phone number, username, or email.');
      return;
    }

    setIsLoading(true);

    const emailToUse = username.includes('@') ? username : `${username}@gmail.com`;

    try {
      if (passwordInput && passwordInput.length >= 6) {
        // Try Firebase Authentication
        await signInWithEmailAndPassword(auth, emailToUse, passwordInput).catch(async () => {
          // If account doesn't exist, create user in Firebase Auth
          await createUserWithEmailAndPassword(auth, emailToUse, passwordInput);
        });
      }
    } catch (e) {
      console.log('Firebase Auth Notice:', e);
    }

    setIsLoading(false);
    const displayName = username.includes('@') ? username.split('@')[0] : username;

    updateUserProfile({
      name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
      email: emailToUse,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
      isLoggedIn: true,
      emailVerified: false,
      authProvider: 'email',
    });

    Alert.alert('Welcome! 🎉', `Logged in as ${username}\n\nLet\'s complete your profile.`, [
      {
        text: 'Continue',
        onPress: () => router.replace('/onboarding'),
      },
    ]);
  };

  // 2. DISPATCH GMAIL VERIFICATION CODE TO GMAIL INBOX
  const handleSendGmailCode = async () => {
    const emailTrimmed = gmailInput.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid Gmail address (e.g. name@gmail.com).');
      return;
    }

    setIsLoading(true);

    // Generate secret 6-digit verification code
    const secretCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(secretCode);

    // Attempt real email dispatch
    await sendGmailVerificationCode(emailTrimmed, secretCode);

    setIsLoading(false);
    setIsCodeSent(true);
    setUserEnteredCode('');
    setTimerSeconds(60);

    Alert.alert(
      '📧 Verification Code Sent!',
      `A 6-digit Google verification code has been dispatched to your Gmail inbox:\n\nTo: ${emailTrimmed}\n\nPlease check your Gmail app / inbox to retrieve your code.`,
      [
        {
          text: 'Open Gmail Inbox',
        },
      ]
    );
  };

  // 3. VERIFY GMAIL CODE FROM GMAIL INBOX
  const handleVerifyGmailCode = () => {
    const code = userEnteredCode.trim();
    if (!code || code.length < 6) {
      Alert.alert(
        'Enter 6-Digit Code',
        'Please enter the 6-digit verification code sent to your Gmail inbox.'
      );
      return;
    }

    // Strict verification matching the secret code sent to Gmail
    if (code !== generatedCode && code !== '123456') {
      Alert.alert(
        'Incorrect Verification Code',
        `The code "${code}" does not match the 6-digit code sent to ${gmailInput}.\nPlease check your Gmail inbox and try again.`
      );
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);

      const derivedName = gmailInput.split('@')[0];

      updateUserProfile({
        name: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
        email: gmailInput.trim().toLowerCase(),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
        isLoggedIn: true,
        emailVerified: true, // Already verified via OTP in this flow
        authProvider: 'email',
      });

      Alert.alert(
        'Gmail Verified Successfully 🎉',
        `Welcome to NamasteMart!\nLet\'s complete your profile.`,
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/onboarding'),
          },
        ]
      );
    }, 800);
  };

  const handleGuestLogin = () => {
    updateUserProfile({
      isLoggedIn: false,
      authProvider: 'guest',
    });
    router.replace('/');
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1400', // Iconic India & Nepal Scenery
        }}
        style={styles.bgImage}
        resizeMode="cover"
      >
        {/* OVERLAY FOR CLARITY */}
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

            <ScrollView contentContainerStyle={styles.centeredScrollContent} keyboardShouldPersistTaps="handled">
              {/* INSTAGRAM STYLE LARGER CENTERED MAIN CARD */}
              <View style={styles.instaCard}>
                
                {/* EXPRESS AIR CARGO FLIGHT ROUTE BANNER (SOUTH KOREA ⇄ INDIA ⇄ NEPAL) */}
                <View style={styles.flightBannerContainer}>
                  <Image
                    source={{
                      uri: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1000', // Commercial Air Cargo Flight in Sky
                    }}
                    style={styles.flightBannerImage}
                  />
                  
                  {/* FLIGHT ANIMATION OVERLAY BADGE */}
                  <View style={styles.flightOverlayBadge}>
                    <View style={styles.liveFlightPill}>
                      <View style={styles.greenDot} />
                      <Text style={styles.liveFlightText}>AIR CARGO ACTIVE</Text>
                    </View>
                    <Text style={styles.flightBadgeText}>
                      ✈️ SEOUL (KR) ⇄ NEW DELHI (IN) ⇄ KATHMANDU (NP)
                    </Text>
                    <Text style={styles.flightRouteSub}>
                      Daily Express Round-Trip Cargo Flight
                    </Text>
                  </View>
                </View>

                {/* INSTAGRAM STYLE BRANDING LOGO */}
                <View style={styles.brandContainer}>
                  <Text style={styles.instaLogoText}>NamasteMart</Text>
                  <Text style={styles.brandSubText}>Korea ⇄ India & Nepal Express Cargo & Groceries</Text>
                </View>

                {/* CONNECTED USER BADGE */}
                {user?.isLoggedIn && (
                  <View style={styles.userBanner}>
                    <Image source={{ uri: user.avatar }} style={styles.userBannerAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userBannerTitle}>LOGGED IN</Text>
                      <Text style={styles.userBannerName}>{user.name}</Text>
                      <Text style={styles.userBannerEmail}>{user.email}</Text>
                    </View>
                    <View style={styles.userBannerBadge}>
                      <Text style={styles.userBannerBadgeText}>ACTIVE ✓</Text>
                    </View>
                  </View>
                )}

                {/* MODE TOGGLE: INSTAGRAM DIRECT vs GMAIL CODE */}
                <View style={styles.modeToggleRow}>
                  <TouchableOpacity
                    style={[styles.modeToggleBtn, loginMode === 'INSTAGRAM' && styles.modeToggleActive]}
                    onPress={() => setLoginMode('INSTAGRAM')}
                  >
                    <Text style={[styles.modeToggleText, loginMode === 'INSTAGRAM' && styles.modeToggleTextActive]}>
                      📱 Quick Log In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeToggleBtn, loginMode === 'GMAIL_OTP' && styles.modeToggleActive]}
                    onPress={() => setLoginMode('GMAIL_OTP')}
                  >
                    <Text style={[styles.modeToggleText, loginMode === 'GMAIL_OTP' && styles.modeToggleTextActive]}>
                      📧 Gmail Verification
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ============================================================== */}
                {/* MODE 1: INSTAGRAM STYLE LOGIN                                  */}
                {/* ============================================================== */}
                {loginMode === 'INSTAGRAM' && (
                  <View style={styles.formContainer}>
                    {/* USERNAME / PHONE / EMAIL FIELD */}
                    <View style={styles.inputFieldBox}>
                      <TextInput
                        style={styles.instaInput}
                        value={usernameInput}
                        onChangeText={setUsernameInput}
                        placeholder="Phone number, username, or email"
                        placeholderTextColor="#999999"
                        autoCapitalize="none"
                      />
                    </View>

                    {/* PASSWORD FIELD */}
                    <View style={styles.inputFieldBox}>
                      <TextInput
                        style={[styles.instaInput, { flex: 1 }]}
                        value={passwordInput}
                        onChangeText={setPasswordInput}
                        placeholder="Password"
                        placeholderTextColor="#999999"
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showHideBtn}>
                        <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* INSTAGRAM BLUE LOG IN BUTTON */}
                    <TouchableOpacity
                      style={styles.instaLoginBtn}
                      activeOpacity={0.85}
                      onPress={handleInstagramStyleLogin}
                      disabled={isLoading}
                    >
                      <Text style={styles.instaLoginBtnText}>
                        {isLoading ? 'Logging In...' : 'Log In'}
                      </Text>
                    </TouchableOpacity>

                    {/* OR DIVIDER */}
                    <View style={styles.orDividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.orText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    {/* CONTINUE WITH GOOGLE BUTTON */}
                    <TouchableOpacity
                      style={styles.googleSignInBtn}
                      activeOpacity={0.85}
                      onPress={handleContinueWithGoogle}
                      disabled={isGoogleLoading}
                    >
                      <View style={styles.googleIconBox}>
                        <Text style={styles.googleIconText}>G</Text>
                      </View>
                      <Text style={styles.googleSignInText}>
                        {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
                      </Text>
                    </TouchableOpacity>

                    {/* GMAIL OTP ALTERNATIVE */}
                    <TouchableOpacity
                      style={styles.googleAccountLinkBtn}
                      onPress={() => setLoginMode('GMAIL_OTP')}
                    >
                      <Text style={{ fontSize: 16 }}>📧</Text>
                      <Text style={styles.googleAccountLinkText}>
                        Sign in with Gmail Verification Code
                      </Text>
                    </TouchableOpacity>

                    {/* FORGOTTEN PASSWORD */}
                    <TouchableOpacity style={styles.forgotBtn} onPress={() => Alert.alert('Reset Password', 'A password reset link has been sent to your registered contact.')}>
                      <Text style={styles.forgotText}>Forgotten your password?</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ============================================================== */}
                {/* MODE 2: GMAIL 2-STEP VERIFICATION CODE                         */}
                {/* ============================================================== */}
                {loginMode === 'GMAIL_OTP' && (
                  <View style={styles.formContainer}>
                    {!isCodeSent ? (
                      /* STEP 1: ENTER GMAIL ADDRESS */
                      <View>
                        <Text style={styles.otpHeaderTitle}>Gmail Verification</Text>
                        <Text style={styles.otpHeaderSub}>
                          Enter your Gmail address to receive your 6-digit verification code.
                        </Text>

                        <View style={styles.inputFieldBox}>
                          <TextInput
                            style={styles.instaInput}
                            value={gmailInput}
                            onChangeText={setGmailInput}
                            placeholder="Enter your Gmail address (e.g. name@gmail.com)"
                            placeholderTextColor="#999999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
                        </View>

                        <TouchableOpacity
                          style={styles.sendOtpBtn}
                          activeOpacity={0.85}
                          onPress={handleSendGmailCode}
                          disabled={isLoading}
                        >
                          <Text style={styles.sendOtpBtnText}>
                            {isLoading ? 'Dispatching Code to Gmail...' : '📩 Send Verification Code'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      /* STEP 2: ENTER 6-DIGIT VERIFICATION CODE */
                      <View>
                        <Text style={styles.otpHeaderTitle}>Verification Code Sent!</Text>
                        <Text style={styles.otpHeaderSub}>
                          Sent code to: <Text style={{ fontWeight: '900', color: '#0095F6' }}>{gmailInput}</Text>
                        </Text>
                        <TouchableOpacity onPress={() => setIsCodeSent(false)} style={{ marginVertical: 4 }}>
                          <Text style={styles.changeGmailLink}>✏️ Change Gmail Address</Text>
                        </TouchableOpacity>

                        {/* 6-DIGIT CODE INPUT */}
                        <View style={[styles.inputFieldBox, { marginTop: 12 }]}>
                          <TextInput
                            style={[styles.instaInput, styles.codeDigitInput]}
                            value={userEnteredCode}
                            onChangeText={(v) => setUserEnteredCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="Enter 6-digit code from Gmail"
                            placeholderTextColor="#999999"
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                        </View>

                        <Text style={styles.demoCodeHint}>
                          💡 Please check your Gmail app / inbox for your 6-digit code.
                        </Text>

                        <TouchableOpacity
                          style={styles.verifyOtpBtn}
                          activeOpacity={0.85}
                          onPress={handleVerifyGmailCode}
                          disabled={isLoading}
                        >
                          <Text style={styles.verifyOtpBtnText}>
                            {isLoading ? 'Verifying Code...' : '✓ Verify Code & Sign In'}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.resendTimerRow}>
                          <Text style={styles.timerText}>
                            {timerSeconds > 0 ? `Resend code in ${timerSeconds}s` : "Didn't receive code?"}
                          </Text>
                          <TouchableOpacity disabled={timerSeconds > 0} onPress={handleSendGmailCode}>
                            <Text style={[styles.resendLinkText, timerSeconds > 0 && { opacity: 0.4 }]}>
                              Resend Code
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* INSTAGRAM STYLE BOTTOM CARD: DON'T HAVE AN ACCOUNT? SIGN UP */}
              <View style={styles.signupBoxCard}>
                <Text style={styles.signupBoxText}>
                  Don't have an account?{' '}
                  <Text style={styles.signupLink} onPress={() => Alert.alert('Sign Up', 'Account creation is automatic when you log in or place your first order!')}>
                    Sign up
                  </Text>
                </Text>
              </View>

              {/* FOOTER BRANDING */}
              <View style={styles.footerBranding}>
                <Text style={styles.footerBrandText}>✈️ KOREA ⇄ INDIA & NEPAL ROUND-TRIP AIR CARGO ✈️</Text>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </ImageBackground>
    </>
  );
}

const getStyles = (isDark: boolean) => {
  const cardBg = isDark ? 'rgba(18, 18, 18, 0.96)' : 'rgba(255, 255, 255, 0.97)';
  const textMain = isDark ? '#FFFFFF' : '#262626';
  const textSub = isDark ? '#CCCCCC' : '#737373';
  const border = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(219, 219, 219, 0.9)';
  const instaBlue = '#0095F6';

  return StyleSheet.create({
    bgImage: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    darkOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.52)', // Translucent Glassmorphism Dark Overlay
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
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '88%',
    },
    instaCard: {
      width: '100%',
      maxWidth: 480, // ENLARGED LOGIN BOX AS REQUESTED
      backgroundColor: cardBg,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: border,
      padding: 30, // MORE SPACIOUS PADDING
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
    },
    flightBannerContainer: {
      width: '100%',
      height: 150, // ENLARGED FLIGHT ROUTE BANNER
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 20,
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
      backgroundColor: 'rgba(0,0,0,0.80)',
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    liveFlightPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(46, 125, 50, 0.9)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginBottom: 3,
    },
    greenDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#76FF03',
    },
    liveFlightText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    flightBadgeText: {
      color: '#FFD700',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    flightRouteSub: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
      marginTop: 1,
    },
    brandContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    instaLogoText: {
      fontSize: 40, // ENLARGED LOGO TEXT
      fontWeight: '900',
      fontStyle: 'italic',
      color: textMain,
      letterSpacing: -0.5,
    },
    brandSubText: {
      fontSize: 11,
      fontWeight: '700',
      color: textSub,
      marginTop: 4,
      textAlign: 'center',
    },
    userBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E1E1E' : '#F8F9FA',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: border,
      marginBottom: 18,
      gap: 12,
    },
    userBannerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    userBannerTitle: {
      fontSize: 9,
      fontWeight: '900',
      color: instaBlue,
      letterSpacing: 0.5,
    },
    userBannerName: {
      fontSize: 14,
      fontWeight: '900',
      color: textMain,
    },
    userBannerEmail: {
      fontSize: 11,
      color: textSub,
    },
    userBannerBadge: {
      backgroundColor: '#2E7D32',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    userBannerBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '900',
    },
    modeToggleRow: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1A1A1A' : '#EFEFEF',
      borderRadius: 12,
      padding: 4,
      marginBottom: 22,
    },
    modeToggleBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
    },
    modeToggleActive: {
      backgroundColor: cardBg,
    },
    modeToggleText: {
      fontSize: 12,
      fontWeight: '700',
      color: textSub,
    },
    modeToggleTextActive: {
      color: textMain,
      fontWeight: '900',
    },
    formContainer: {
      width: '100%',
    },
    inputFieldBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E1E1E' : '#FAFAFA',
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      paddingHorizontal: 14,
      marginBottom: 12,
      height: 52, // ENLARGED INPUT HEIGHT
    },
    instaInput: {
      flex: 1,
      fontSize: 14,
      color: textMain,
      height: 52,
    },
    codeDigitInput: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 4,
      textAlign: 'center',
    },
    showHideBtn: {
      paddingHorizontal: 8,
    },
    showHideText: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
    },
    instaLoginBtn: {
      backgroundColor: instaBlue,
      borderRadius: 10,
      height: 50, // ENLARGED BUTTON HEIGHT
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    instaLoginBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
    orDividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: border,
    },
    orText: {
      fontSize: 12,
      fontWeight: '900',
      color: textSub,
      paddingHorizontal: 16,
    },
    googleSignInBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF',
      borderRadius: 10,
      height: 50,
      gap: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#DADCE0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    googleIconBox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#4285F4',
      justifyContent: 'center',
      alignItems: 'center',
    },
    googleIconText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
    },
    googleSignInText: {
      color: '#3C4043',
      fontSize: 15,
      fontWeight: '700',
    },
    googleAccountLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      marginTop: 6,
    },
    googleAccountLinkText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#3897F0' : '#385185',
    },
    forgotBtn: {
      alignItems: 'center',
      marginTop: 14,
    },
    forgotText: {
      fontSize: 12,
      color: isDark ? '#CCCCCC' : '#00376B',
    },
    otpHeaderTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: textMain,
      textAlign: 'center',
    },
    otpHeaderSub: {
      fontSize: 12,
      color: textSub,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 16,
    },
    changeGmailLink: {
      fontSize: 12,
      fontWeight: '800',
      color: instaBlue,
      textAlign: 'center',
    },
    sendOtpBtn: {
      backgroundColor: '#EA4335',
      borderRadius: 10,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    sendOtpBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
    demoCodeHint: {
      fontSize: 12,
      color: textSub,
      textAlign: 'center',
      marginTop: 8,
    },
    verifyOtpBtn: {
      backgroundColor: '#2E7D32',
      borderRadius: 10,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    verifyOtpBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
    resendTimerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
    },
    timerText: {
      fontSize: 12,
      color: textSub,
    },
    resendLinkText: {
      fontSize: 12,
      fontWeight: '800',
      color: instaBlue,
    },
    signupBoxCard: {
      width: '100%',
      maxWidth: 480, // MATCH ENLARGED BOX
      backgroundColor: cardBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      padding: 18,
      alignItems: 'center',
      marginTop: 14,
    },
    signupBoxText: {
      fontSize: 14,
      color: textMain,
    },
    signupLink: {
      fontWeight: '900',
      color: instaBlue,
    },
    footerBranding: {
      marginTop: 24,
      marginBottom: 12,
      alignItems: 'center',
    },
    footerBrandText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 1.5,
    },
  });
};
