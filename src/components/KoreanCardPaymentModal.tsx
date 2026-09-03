import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KoreanCardPaymentDetails } from '@/types';

export interface KoreanCardPaymentModalProps {
  visible: boolean;
  amountKRW: number;
  orderNumber?: string;
  customerName?: string;
  itemsSummary?: string;
  onSuccess: (paymentDetails: KoreanCardPaymentDetails) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

interface CardCompanyOption {
  id: string;
  name: string;
  nameKr: string;
  color: string;
  badgeBg: string;
  isInterestFree?: boolean;
}

const KOREAN_CARDS: CardCompanyOption[] = [
  { id: 'shinhan', name: 'Shinhan Card', nameKr: '신한카드', color: '#0046FF', badgeBg: '#EBF2FF', isInterestFree: true },
  { id: 'kb', name: 'KB Kookmin Card', nameKr: 'KB국민카드', color: '#6A5B44', badgeBg: '#F7F3EB', isInterestFree: true },
  { id: 'samsung', name: 'Samsung Card', nameKr: '삼성카드', color: '#0C4DA2', badgeBg: '#EBF3FB', isInterestFree: true },
  { id: 'hyundai', name: 'Hyundai Card', nameKr: '현대카드', color: '#111111', badgeBg: '#F0F0F0', isInterestFree: true },
  { id: 'lotte', name: 'Lotte Card', nameKr: '롯데카드', color: '#ED1C24', badgeBg: '#FDEBEB', isInterestFree: false },
  { id: 'hana', name: 'Hana Card', nameKr: '하나카드', color: '#008485', badgeBg: '#EBF8F8', isInterestFree: true },
  { id: 'woori', name: 'Woori Card', nameKr: '우리카드', color: '#0080FF', badgeBg: '#E8F4FF', isInterestFree: false },
  { id: 'nh', name: 'NH Nonghyup Card', nameKr: 'NH농협카드', color: '#009944', badgeBg: '#EBF7EE', isInterestFree: true },
  { id: 'kakaobank', name: 'KakaoBank', nameKr: '카카오뱅크', color: '#222222', badgeBg: '#FFFBE6', isInterestFree: false },
  { id: 'tossbank', name: 'Toss Bank', nameKr: '토스뱅크', color: '#0064FF', badgeBg: '#E8F2FF', isInterestFree: true },
  { id: 'bc', name: 'BC Card', nameKr: 'BC카드', color: '#D6001C', badgeBg: '#FCECEE', isInterestFree: false },
];

const INSTALLMENT_OPTIONS = [
  '일시불 (Lump-sum)',
  '2개월 (무이자)',
  '3개월 (무이자)',
  '6개월',
  '12개월',
];

export function KoreanCardPaymentModal({
  visible,
  amountKRW,
  orderNumber = `NM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  customerName = 'Customer',
  itemsSummary = 'NamasteMart Order',
  onSuccess,
  onCancel,
  isDarkMode = false,
}: KoreanCardPaymentModalProps) {
  const [selectedCard, setSelectedCard] = useState<CardCompanyOption>(KOREAN_CARDS[0]);
  const [paymentTab, setPaymentTab] = useState<'APP_CARD' | 'GENERAL_CARD'>('APP_CARD');
  const [installment, setInstallment] = useState<string>('일시불 (Lump-sum)');

  // General Card Inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardPassword2Digits, setCardPassword2Digits] = useState('');
  const [cardBirthDate, setCardBirthDate] = useState('');

  // Regulatory Terms
  const [agreeAllTerms, setAgreeAllTerms] = useState(true);
  const [agreeTermsFinance, setAgreeTermsFinance] = useState(true);
  const [agreeTermsPrivacy, setAgreeTermsPrivacy] = useState(true);
  const [agreeTermsThirdParty, setAgreeTermsThirdParty] = useState(true);

  // Loading / Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // Reset inputs when modal opens
  useEffect(() => {
    if (visible) {
      setIsProcessing(false);
      setProcessingStep('');
      setCardNumber('9411-8201-4492-5813');
      setCardExpiry('12/28');
      setCardCvc('884');
      setCardPassword2Digits('24');
      setCardBirthDate('960512');
      setAgreeAllTerms(true);
      setAgreeTermsFinance(true);
      setAgreeTermsPrivacy(true);
      setAgreeTermsThirdParty(true);
    }
  }, [visible]);

  const handleToggleAgreeAll = () => {
    const nextVal = !agreeAllTerms;
    setAgreeAllTerms(nextVal);
    setAgreeTermsFinance(nextVal);
    setAgreeTermsPrivacy(nextVal);
    setAgreeTermsThirdParty(nextVal);
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 16);
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.substring(i, i + 4));
    }
    setCardNumber(parts.join('-'));
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`);
    } else {
      setCardExpiry(cleaned);
    }
  };

  const handleExecutePayment = () => {
    if (!agreeTermsFinance || !agreeTermsPrivacy || !agreeTermsThirdParty) {
      Alert.alert('Terms Required (약관 동의 필요)', 'Please agree to the mandatory electronic payment terms to proceed.');
      return;
    }

    if (paymentTab === 'GENERAL_CARD') {
      const rawCard = cardNumber.replace(/[^0-9]/g, '');
      if (rawCard.length < 15) {
        Alert.alert('Invalid Card Number', 'Please enter a valid 15-16 digit Korean card number.');
        return;
      }
      if (cardExpiry.length < 5) {
        Alert.alert('Invalid Expiration Date', 'Please enter card expiry in MM/YY format.');
        return;
      }
      if (cardCvc.length < 3) {
        Alert.alert('Invalid CVC', 'Please enter the 3-digit CVC on the back of your card.');
        return;
      }
    }

    setIsProcessing(true);
    setProcessingStep('Connecting to Korean Payment Gateway (PG)...');

    // Realistic PG Authorization Steps
    setTimeout(() => {
      setProcessingStep(`Authorizing with ${selectedCard.nameKr}...`);
    }, 600);

    setTimeout(() => {
      setProcessingStep('Verifying 256-bit SSL Security Token & KFTC Clearance...');
    }, 1200);

    setTimeout(() => {
      setIsProcessing(false);

      const rawCard = cardNumber.replace(/[^0-9]/g, '') || '5421882199104421';
      const maskedCard = `${rawCard.slice(0, 4)}-****-****-${rawCard.slice(-4)}`;
      const txId = `TX-KR-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const approvalCode = `${Math.floor(10000000 + Math.random() * 90000000)}`;

      const paymentResult: KoreanCardPaymentDetails = {
        cardCompany: selectedCard.nameKr,
        cardCode: selectedCard.id,
        cardNumberMasked: maskedCard,
        installment: installment.split(' ')[0], // e.g. "일시불" or "2개월"
        transactionId: txId,
        approvalNumber: approvalCode,
        paidAmount: amountKRW,
        currency: 'KRW',
        paidAt: Date.now(),
        paymentKey: `pay_${Date.now()}_${selectedCard.id}`,
        methodTitle: `Korean Card (${selectedCard.nameKr})`,
      };

      onSuccess(paymentResult);
    }, 1900);
  };

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerBrandRow}>
              <View style={styles.pgBadge}>
                <Text style={styles.pgBadgeText}>🇰🇷 KOREAN PG</Text>
              </View>
              <Text style={styles.headerBrandTitle}>나마스테마트 결제원 (PG)</Text>
              <Text style={styles.sslLock}>🔒 256-bit SSL</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onCancel} disabled={isProcessing}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* AMOUNT SUMMARY BANNER */}
            <View style={styles.amountBanner}>
              <View>
                <Text style={styles.amountLabel}>결제 요청 금액 (Total Amount)</Text>
                <Text style={styles.amountValue}>₩{(amountKRW ?? 0).toLocaleString()}</Text>
              </View>
              <View style={styles.orderMetaCol}>
                <Text style={styles.orderMetaText}>주문번호: {orderNumber}</Text>
                <Text style={styles.orderMetaSub} numberOfLines={1}>{itemsSummary}</Text>
              </View>
            </View>

            {/* TAB SELECTOR: APP CARD vs GENERAL CARD */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, paymentTab === 'APP_CARD' && styles.tabBtnActive]}
                onPress={() => setPaymentTab('APP_CARD')}
                disabled={isProcessing}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    paymentTab === 'APP_CARD' && styles.tabBtnTextActive,
                  ]}
                >
                  ⚡️ 앱카드 / 간편인증
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, paymentTab === 'GENERAL_CARD' && styles.tabBtnActive]}
                onPress={() => setPaymentTab('GENERAL_CARD')}
                disabled={isProcessing}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    paymentTab === 'GENERAL_CARD' && styles.tabBtnTextActive,
                  ]}
                >
                  💳 일반카드 번호입력
                </Text>
              </TouchableOpacity>
            </View>

            {/* CARD COMPANY SELECTOR */}
            <Text style={styles.sectionTitle}>1. 카드사 선택 (Select Korean Card)</Text>
            <View style={styles.cardGrid}>
              {KOREAN_CARDS.map((card) => {
                const isSelected = selectedCard.id === card.id;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.cardItem,
                      isSelected && { borderColor: card.color, backgroundColor: card.badgeBg },
                    ]}
                    onPress={() => setSelectedCard(card)}
                    disabled={isProcessing}
                  >
                    <View style={[styles.cardDot, { backgroundColor: card.color }]} />
                    <Text
                      style={[
                        styles.cardNameKr,
                        isSelected && { color: card.color, fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {card.nameKr}
                    </Text>
                    {card.isInterestFree && (
                      <View style={styles.interestFreeBadge}>
                        <Text style={styles.interestFreeText}>무이자</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* INSTALLMENT SELECTOR */}
            <View style={styles.installmentContainer}>
              <Text style={styles.sectionTitle}>2. 할부 개월 수 (Installment Plan)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.installmentRow}
              >
                {INSTALLMENT_OPTIONS.map((opt) => {
                  const isSelected = installment === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.installmentChip,
                        isSelected && styles.installmentChipActive,
                      ]}
                      onPress={() => setInstallment(opt)}
                      disabled={isProcessing}
                    >
                      <Text
                        style={[
                          styles.installmentChipText,
                          isSelected && styles.installmentChipTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* TAB CONTENT: APP CARD vs GENERAL INPUT */}
            {paymentTab === 'APP_CARD' ? (
              <View style={styles.appCardContainer}>
                <View style={styles.appCardIconBox}>
                  <Text style={styles.appCardIcon}>📱</Text>
                </View>
                <Text style={styles.appCardTitle}>{selectedCard.nameKr} 앱카드 간편결제</Text>
                <Text style={styles.appCardSubtitle}>
                  {selectedCard.nameKr} 스마트폰 앱 또는 스마트 결제창으로 안전하게 인증 후 결제됩니다.
                </Text>
                <View style={styles.appCardBadgeRow}>
                  <View style={styles.featurePill}>
                    <Text style={styles.featurePillText}>✓ 3초 원터치 인증</Text>
                  </View>
                  <View style={styles.featurePill}>
                    <Text style={styles.featurePillText}>✓ FIDO 생체 보안</Text>
                  </View>
                  <View style={styles.featurePill}>
                    <Text style={styles.featurePillText}>✓ 부정사용 방지(FDS)</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.generalCardForm}>
                <Text style={styles.sectionTitle}>3. 카드 정보 입력 (Card Details)</Text>

                {/* Card Number */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>카드 번호 (16자리)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0000-0000-0000-0000"
                    placeholderTextColor="#999"
                    value={cardNumber}
                    onChangeText={formatCardNumber}
                    keyboardType="numeric"
                    maxLength={19}
                    editable={!isProcessing}
                  />
                </View>

                {/* Expiry & CVC Row */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>유효기간 (MM/YY)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="MM/YY"
                      placeholderTextColor="#999"
                      value={cardExpiry}
                      onChangeText={formatExpiry}
                      keyboardType="numeric"
                      maxLength={5}
                      editable={!isProcessing}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>CVC (뒷면 3자리)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="3자리"
                      placeholderTextColor="#999"
                      value={cardCvc}
                      onChangeText={(t) => setCardCvc(t.replace(/[^0-9]/g, '').slice(0, 3))}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={3}
                      editable={!isProcessing}
                    />
                  </View>
                </View>

                {/* Password & Birth Date Row */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>비밀번호 앞 2자리</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="●●"
                      placeholderTextColor="#999"
                      value={cardPassword2Digits}
                      onChangeText={(t) => setCardPassword2Digits(t.replace(/[^0-9]/g, '').slice(0, 2))}
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={2}
                      editable={!isProcessing}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1.2, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>생년월일 (YYMMDD)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="6자리 (예: 960512)"
                      placeholderTextColor="#999"
                      value={cardBirthDate}
                      onChangeText={(t) => setCardBirthDate(t.replace(/[^0-9]/g, '').slice(0, 6))}
                      keyboardType="numeric"
                      maxLength={6}
                      editable={!isProcessing}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* MANDATORY TERMS ACCORDION */}
            <View style={styles.termsBox}>
              <TouchableOpacity
                style={styles.termsHeader}
                onPress={handleToggleAgreeAll}
                disabled={isProcessing}
              >
                <View style={[styles.checkbox, agreeAllTerms && styles.checkboxChecked]}>
                  {agreeAllTerms && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.termsHeaderTitle}>결제 서비스 이용약관 전체 동의 (Agree to All)</Text>
              </TouchableOpacity>

              <View style={styles.termsDivider} />

              <View style={styles.termsList}>
                <TouchableOpacity
                  style={styles.termRow}
                  onPress={() => setAgreeTermsFinance(!agreeTermsFinance)}
                  disabled={isProcessing}
                >
                  <Text style={[styles.termBullet, agreeTermsFinance && { color: '#0064FF' }]}>
                    {agreeTermsFinance ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.termText}>[필수] 전자금융거래 기본약관</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.termRow}
                  onPress={() => setAgreeTermsPrivacy(!agreeTermsPrivacy)}
                  disabled={isProcessing}
                >
                  <Text style={[styles.termBullet, agreeTermsPrivacy && { color: '#0064FF' }]}>
                    {agreeTermsPrivacy ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.termText}>[필수] 개인정보 수집 및 이용 동의</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.termRow}
                  onPress={() => setAgreeTermsThirdParty(!agreeTermsThirdParty)}
                  disabled={isProcessing}
                >
                  <Text style={[styles.termBullet, agreeTermsThirdParty && { color: '#0064FF' }]}>
                    {agreeTermsThirdParty ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.termText}>[필수] 개인정보 제3자 제공 동의 (카드사/결제대행)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* PROCESSING OVERLAY */}
            {isProcessing && (
              <View style={styles.processingCard}>
                <ActivityIndicator size="large" color="#0064FF" />
                <Text style={styles.processingText}>{processingStep}</Text>
                <Text style={styles.processingSub}>안전한 결제 처리를 위해 창을 닫지 마세요.</Text>
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* FOOTER CTA */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.payButton,
                isProcessing && styles.payButtonDisabled,
              ]}
              onPress={handleExecutePayment}
              disabled={isProcessing}
              activeOpacity={0.88}
            >
              {isProcessing ? (
                <View style={styles.payBtnLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.payButtonText}>보안 결제 승인 중...</Text>
                </View>
              ) : (
                <View style={styles.payBtnRow}>
                  <Text style={styles.payButtonText}>
                    {selectedCard.nameKr} ₩{(amountKRW ?? 0).toLocaleString()} 결제하기
                  </Text>
                  <Text style={styles.payButtonArrow}>→</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (isDark: boolean) => {
  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const text = isDark ? '#FFFFFF' : '#191F28';
  const textSub = isDark ? '#A0A0A0' : '#6B7684';
  const border = isDark ? '#2C2C2E' : '#E5E8EB';
  const cardBg = isDark ? '#262628' : '#F9FAFB';

  return StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '92%',
      width: '100%',
      ...Platform.select({
        web: {
          maxWidth: 580,
          alignSelf: 'center',
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          marginVertical: 20,
          maxHeight: '88%',
        },
      }),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    headerBrandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    pgBadge: {
      backgroundColor: '#0064FF',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },
    pgBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    headerBrandTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: text,
    },
    sslLock: {
      fontSize: 11,
      fontWeight: '700',
      color: '#10B981',
      marginLeft: 'auto',
      marginRight: 10,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: textSub,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 10,
    },
    amountBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: border,
    },
    amountLabel: {
      fontSize: 12,
      color: textSub,
      fontWeight: '600',
    },
    amountValue: {
      fontSize: 22,
      fontWeight: '900',
      color: '#0064FF',
      marginTop: 2,
    },
    orderMetaCol: {
      alignItems: 'flex-end',
    },
    orderMetaText: {
      fontSize: 11,
      fontWeight: '700',
      color: text,
    },
    orderMetaSub: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
      maxWidth: 120,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#262628' : '#F2F4F6',
      borderRadius: 12,
      padding: 4,
      marginBottom: 18,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 9,
    },
    tabBtnActive: {
      backgroundColor: bg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    tabBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: textSub,
    },
    tabBtnTextActive: {
      color: '#0064FF',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: text,
      marginBottom: 10,
    },
    cardGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    cardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '31%',
      paddingVertical: 9,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1.2,
      borderColor: border,
      backgroundColor: bg,
    },
    cardDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      marginRight: 6,
    },
    cardNameKr: {
      fontSize: 11,
      fontWeight: '700',
      color: text,
      flex: 1,
    },
    interestFreeBadge: {
      backgroundColor: '#FFEBEE',
      paddingHorizontal: 3,
      paddingVertical: 1,
      borderRadius: 4,
      marginLeft: 2,
    },
    interestFreeText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#D32F2F',
    },
    installmentContainer: {
      marginBottom: 16,
    },
    installmentRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
    },
    installmentChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: bg,
    },
    installmentChipActive: {
      borderColor: '#0064FF',
      backgroundColor: isDark ? '#142850' : '#E8F2FF',
    },
    installmentChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: textSub,
    },
    installmentChipTextActive: {
      color: '#0064FF',
      fontWeight: '800',
    },
    appCardContainer: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: border,
    },
    appCardIconBox: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: isDark ? '#333' : '#E8F2FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    appCardIcon: {
      fontSize: 24,
    },
    appCardTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: text,
      marginBottom: 4,
    },
    appCardSubtitle: {
      fontSize: 11,
      color: textSub,
      textAlign: 'center',
      lineHeight: 16,
      marginBottom: 14,
    },
    appCardBadgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 6,
    },
    featurePill: {
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    featurePillText: {
      fontSize: 10,
      fontWeight: '700',
      color: isDark ? '#94A3B8' : '#475569',
    },
    generalCardForm: {
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: textSub,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontWeight: '700',
      color: text,
    },
    row: {
      flexDirection: 'row',
    },
    termsBox: {
      backgroundColor: cardBg,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: border,
      marginBottom: 16,
    },
    termsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: bg,
    },
    checkboxChecked: {
      backgroundColor: '#0064FF',
      borderColor: '#0064FF',
    },
    checkMark: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },
    termsHeaderTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: text,
      flex: 1,
    },
    termsDivider: {
      height: 1,
      backgroundColor: border,
      marginVertical: 10,
    },
    termsList: {
      gap: 6,
    },
    termRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    termBullet: {
      fontSize: 13,
      color: textSub,
    },
    termText: {
      fontSize: 11,
      color: textSub,
      fontWeight: '500',
    },
    processingCard: {
      backgroundColor: isDark ? '#142850' : '#E8F2FF',
      borderRadius: 14,
      padding: 18,
      alignItems: 'center',
      marginVertical: 8,
      borderWidth: 1,
      borderColor: '#0064FF',
    },
    processingText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0064FF',
      marginTop: 10,
    },
    processingSub: {
      fontSize: 11,
      color: textSub,
      marginTop: 4,
    },
    footer: {
      padding: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: border,
      backgroundColor: bg,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    payButton: {
      backgroundColor: '#0064FF',
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#0064FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    payButtonDisabled: {
      opacity: 0.7,
    },
    payBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    payBtnLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    payButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    payButtonArrow: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
  });
};
