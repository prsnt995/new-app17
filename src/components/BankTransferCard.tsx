import React, { useState, useEffect } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BankTransferSettings } from '@/types';
import { getBankTransferSettings, DEFAULT_BANK_SETTINGS } from '@/services/bankSettingsService';
import { BankAccountInfo, KOREA_BANK_ACCOUNTS } from '@/data/mockData';

interface BankTransferCardProps {
  orderAmountKRW?: number;
  orderIdPreview?: string;
  senderName: string;
  onChangeSenderName: (name: string) => void;
  transferredAmount?: string;
  onChangeTransferredAmount?: (amount: string) => void;
  paymentScreenshot: string | null;
  onSelectScreenshot: (uri: string | null) => void;
  isDarkMode?: boolean;
  bankSettings?: BankTransferSettings;
  selectedBank?: BankAccountInfo;
  onSelectBank?: (bank: BankAccountInfo) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function BankTransferCard({
  orderAmountKRW = 0,
  orderIdPreview,
  senderName,
  onChangeSenderName,
  transferredAmount = '',
  onChangeTransferredAmount,
  paymentScreenshot,
  onSelectScreenshot,
  isDarkMode = false,
  bankSettings: initialSettings,
  selectedBank,
  onSelectBank,
  isUploading = false,
  uploadProgress = 0,
}: BankTransferCardProps) {
  const [bankSettings, setBankSettings] = useState<BankTransferSettings>(() => {
    if (initialSettings) return initialSettings;
    if (selectedBank) {
      return {
        bankName: `${selectedBank.bankName} (${selectedBank.bankNameKr})`,
        bankNameKr: selectedBank.bankNameKr,
        accountNumber: selectedBank.accountNumber,
        accountHolder: selectedBank.accountHolder,
        bankCode: '020',
        instructions: DEFAULT_BANK_SETTINGS.instructions,
        paymentDeadlineHours: 24,
        enabled: true,
        currency: 'KRW',
      };
    }
    return DEFAULT_BANK_SETTINGS;
  });

  const [activeBankId, setActiveBankId] = useState<string>(() => {
    if (selectedBank?.id) return selectedBank.id;
    return 'woori';
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setBankSettings(initialSettings);
    } else if (selectedBank) {
      setBankSettings({
        bankName: `${selectedBank.bankName} (${selectedBank.bankNameKr})`,
        bankNameKr: selectedBank.bankNameKr,
        accountNumber: selectedBank.accountNumber,
        accountHolder: selectedBank.accountHolder,
        bankCode: '020',
        instructions: DEFAULT_BANK_SETTINGS.instructions,
        paymentDeadlineHours: 24,
        enabled: true,
        currency: 'KRW',
      });
      setActiveBankId(selectedBank.id);
    } else {
      getBankTransferSettings().then((s) => {
        setBankSettings(s);
      });
    }
  }, [initialSettings, selectedBank]);

  const handleSelectBankChip = (b: BankAccountInfo) => {
    setActiveBankId(b.id);
    setBankSettings((prev) => ({
      ...prev,
      bankName: `${b.bankName} (${b.bankNameKr})`,
      bankNameKr: b.bankNameKr,
      accountNumber: b.accountNumber,
      accountHolder: b.accountHolder,
    }));
    if (onSelectBank) {
      onSelectBank(b);
    }
  };

  const handleCopyAccount = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(bankSettings.accountNumber);
      } else {
        const Clipboard = await import('expo-clipboard').then(m => m).catch(() => null);
        if (Clipboard?.setStringAsync) await Clipboard.setStringAsync(bankSettings.accountNumber);
      }
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
      Alert.alert(
        '계좌번호 복사 완료 (Copied!)',
        `[${bankSettings.bankName}]\n계좌번호: ${bankSettings.accountNumber}\n예금주: ${bankSettings.accountHolder}`
      );
    } catch {
      Alert.alert('Account Number', bankSettings.accountNumber);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Needed / 권한 필요',
          'Please allow photo library access to upload payment screenshot (사진 접근 권한이 필요합니다).'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // 5MB Size Validation
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            'File Too Large / 파일 크기 초과',
            'Image exceeds 5 MB limit. Please choose a smaller image file (최대 5MB 이하의 이미지만 업로드 가능합니다).'
          );
          return;
        }

        onSelectScreenshot(asset.uri);
      }
    } catch (e: any) {
      console.warn('Image picker notice:', e.message);
      Alert.alert(
        'Attach Receipt Proof',
        'Attach sample payment receipt proof?',
        [
          {
            text: 'Attach Sample Proof',
            onPress: () =>
              onSelectScreenshot(
                'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'
              ),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  // Compare transferred amount with expected order amount
  const parsedTransferred = Number(transferredAmount.replace(/[^0-9]/g, '')) || 0;
  const isAmountMismatch = parsedTransferred > 0 && orderAmountKRW > 0 && parsedTransferred !== orderAmountKRW;

  const styles = getStyles(isDarkMode);

  return (
    <View style={styles.cardContainer}>
      {/* 1. BANK TRANSFER INSTRUCTION BANNER */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Text style={{ fontSize: 22 }}>🏦</Text>
          <View>
            <Text style={styles.cardHeaderTitle}>Bank Transfer (계좌이체)</Text>
            <Text style={styles.cardHeaderSub}>Direct Transfer to Store Account</Text>
          </View>
        </View>
        <View style={styles.deadlineBadge}>
          <Text style={styles.deadlineBadgeText}>
            ⏱️ {bankSettings.paymentDeadlineHours || 24}H Deadline
          </Text>
        </View>
      </View>

      {/* 2. BANK SELECTION CHIPS */}
      <Text style={styles.selectorSectionTitle}>Select Bank (입금 은행 선택):</Text>
      <View style={styles.bankChipsContainer}>
        {KOREA_BANK_ACCOUNTS.map((b) => {
          const isSelected =
            activeBankId === b.id || bankSettings.accountNumber === b.accountNumber;
          return (
            <TouchableOpacity
              key={b.id}
              style={[
                styles.bankSelectChip,
                isSelected && styles.bankSelectChipActive,
                isSelected && { borderColor: b.color },
              ]}
              onPress={() => handleSelectBankChip(b)}
              activeOpacity={0.85}
            >
              <Text style={styles.bankSelectLogo}>{b.logo}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.bankSelectNameKr,
                    isSelected && { color: b.color, fontWeight: '900' },
                  ]}
                  numberOfLines={1}
                >
                  {b.bankNameKr}
                </Text>
                <Text style={styles.bankSelectAccNum} numberOfLines={1}>
                  {b.accountNumber}
                </Text>
              </View>
              {isSelected && (
                <View style={[styles.bankSelectedDot, { backgroundColor: b.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. OFFICIAL BANK DETAILS BOX */}
      <View style={styles.bankBox}>
        {/* Transfer Amount Target */}
        <View style={styles.amountHighlightBox}>
          <Text style={styles.amountHighlightLabel}>Amount to Transfer (입금할 금액):</Text>
          <Text style={styles.amountHighlightValue}>₩{orderAmountKRW.toLocaleString()}</Text>
        </View>

        {/* Bank & Holder */}
        <View style={styles.bankInfoRow}>
          <Text style={styles.bankFieldLabel}>Bank (입금은행):</Text>
          <Text style={styles.bankFieldValueBold}>{bankSettings.bankName}</Text>
        </View>

        <View style={styles.bankInfoRow}>
          <Text style={styles.bankFieldLabel}>Account Holder (예금주):</Text>
          <Text style={[styles.bankFieldValueBold, { color: '#2563EB' }]}>
            {bankSettings.accountHolder}
          </Text>
        </View>

        {/* Account Number & Copy Button */}
        <View style={styles.accountNumberCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountCardLabel}>Account Number (계좌번호):</Text>
            <Text style={styles.accountNumberDigits} selectable>
              {bankSettings.accountNumber}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.copyBtn, copiedNotification && styles.copyBtnSuccess]}
            onPress={handleCopyAccount}
            activeOpacity={0.8}
          >
            <Text style={styles.copyBtnText}>
              {copiedNotification ? '✓ Copied (복사완료)' : '📋 Copy Account Number (계좌번호 복사)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionBanner}>
          <Text style={styles.instructionIcon}>💡</Text>
          <Text style={styles.instructionText}>
            {bankSettings.instructions ||
              'Please transfer the exact amount and upload your payment screenshot below. Your order will be confirmed after admin verification.'}
          </Text>
        </View>
      </View>

      {/* 4. SENDER NAME INPUT */}
      <View style={styles.inputSection}>
        <Text style={styles.fieldLabel}>
          Sender Name (입금자명) <Text style={{ color: '#EF4444' }}>*</Text>
        </Text>
        <TextInput
          style={styles.textInput}
          value={senderName}
          onChangeText={onChangeSenderName}
          placeholder="e.g. PARSHANT / HONG GILDONG"
          placeholderTextColor="#A0A0A0"
        />
        <Text style={styles.fieldHint}>
          Please enter the exact depositor name shown on your bank statement.
        </Text>
      </View>

      {/* 5. TRANSFERRED AMOUNT INPUT */}
      {onChangeTransferredAmount && (
        <View style={styles.inputSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.fieldLabel}>
              Transferred Amount (실제 입금한 금액) <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            {orderAmountKRW > 0 && (
              <TouchableOpacity
                onPress={() => onChangeTransferredAmount(String(orderAmountKRW))}
                style={styles.quickSetBtn}
              >
                <Text style={styles.quickSetBtnText}>Set Exact (₩{orderAmountKRW.toLocaleString()})</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencyPrefix}>₩</Text>
            <TextInput
              style={[styles.amountInput, isAmountMismatch && styles.amountInputWarning]}
              value={transferredAmount}
              onChangeText={onChangeTransferredAmount}
              placeholder={String(orderAmountKRW || '50000')}
              placeholderTextColor="#A0A0A0"
              keyboardType="numeric"
            />
          </View>

          {isAmountMismatch ? (
            <View style={styles.mismatchWarningBox}>
              <Text style={styles.mismatchWarningText}>
                ⚠️ Transferred amount (₩{parsedTransferred.toLocaleString()}) does not match the order total (₩{orderAmountKRW.toLocaleString()}).
              </Text>
            </View>
          ) : (
            <Text style={styles.fieldHint}>
              Enter the exact amount transferred from your bank app.
            </Text>
          )}
        </View>
      )}

      {/* 6. PAYMENT SCREENSHOT PROOF UPLOADER */}
      <View style={styles.uploadSection}>
        <View style={styles.uploadHeaderRow}>
          <Text style={styles.fieldLabel}>
            Upload Payment Screenshot (입금 확인증) <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <Text style={styles.formatTag}>Max 5MB • JPG, PNG, WEBP</Text>
        </View>

        {paymentScreenshot ? (
          <View style={styles.screenshotPreviewCard}>
            <TouchableOpacity onPress={() => setIsPreviewOpen(true)} activeOpacity={0.9}>
              <Image source={{ uri: paymentScreenshot }} style={styles.screenshotImage} />
              <View style={styles.zoomBadge}>
                <Text style={styles.zoomBadgeText}>🔍 Zoom</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.screenshotInfo}>
              <View style={styles.attachedBadge}>
                <Text style={styles.attachedBadgeText}>✓ Screenshot Uploaded</Text>
              </View>
              <Text style={styles.tapToViewText}>Tap thumbnail to preview full image</Text>

              {isUploading ? (
                <View style={styles.uploadProgressRow}>
                  <ActivityIndicator size="small" color="#D4AF37" />
                  <Text style={styles.uploadProgressText}>
                    Uploading to secure Firebase Storage ({uploadProgress}%)...
                  </Text>
                </View>
              ) : (
                <View style={styles.screenshotActions}>
                  <TouchableOpacity
                    style={styles.changeBtn}
                    onPress={handlePickImage}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.changeBtnText}>📷 Replace (변경)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => onSelectScreenshot(null)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.removeBtnText}>🗑 Remove (삭제)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadBoxBtn}
            onPress={handlePickImage}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 36 }}>📸</Text>
            <Text style={styles.uploadBoxTitle}>
              Upload Payment Screenshot / 입금 확인증 업로드
            </Text>
            <Text style={styles.uploadBoxSub}>
              Attach a clear screenshot of your bank transfer confirmation screen
            </Text>
            <View style={styles.uploadBadgePill}>
              <Text style={styles.uploadBadgePillText}>+ Choose Image File (사진 선택)</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* 7. FULLSCREEN IMAGE PREVIEW MODAL */}
      <Modal
        visible={isPreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPreviewOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setIsPreviewOpen(false)}
          >
            <Text style={styles.closeModalText}>✕ Close Preview</Text>
          </TouchableOpacity>
          {paymentScreenshot && (
            <Image
              source={{ uri: paymentScreenshot }}
              style={styles.fullModalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (isDark: boolean) => {
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#1A1A1A';
  const textSub = isDark ? '#A0A0A0' : '#6B7280';
  const border = isDark ? '#333333' : '#E5E7EB';
  const accent = isDark ? '#D4AF37' : '#C88D2B';
  const primary = isDark ? '#60A5FA' : '#2563EB';

  return StyleSheet.create({
    cardContainer: {
      backgroundColor: cardBg,
      borderRadius: 18,
      padding: 16,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    titleWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardHeaderTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: textMain,
    },
    cardHeaderSub: {
      fontSize: 11,
      fontWeight: '600',
      color: textSub,
      marginTop: 1,
    },
    deadlineBadge: {
      backgroundColor: isDark ? '#2D271E' : '#FFFBEB',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: accent,
    },
    deadlineBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: accent,
    },
    selectorSectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: textMain,
      marginBottom: 8,
    },
    bankChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    bankSelectChip: {
      flex: 1,
      minWidth: '47%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 12,
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderWidth: 1.5,
      borderColor: isDark ? '#3E3E3E' : '#E5E7EB',
    },
    bankSelectChipActive: {
      backgroundColor: isDark ? '#1F2937' : '#EFF6FF',
    },
    bankSelectLogo: {
      fontSize: 18,
    },
    bankSelectNameKr: {
      fontSize: 12,
      fontWeight: '700',
      color: textMain,
    },
    bankSelectAccNum: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
      fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    },
    bankSelectedDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    bankBox: {
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: isDark ? '#3E3E3E' : '#E5E7EB',
      marginBottom: 14,
    },
    amountHighlightBox: {
      backgroundColor: isDark ? '#172554' : '#EFF6FF',
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? '#1E40AF' : '#BFDBFE',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    amountHighlightLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: isDark ? '#93C5FD' : '#1E40AF',
    },
    amountHighlightValue: {
      fontSize: 18,
      fontWeight: '900',
      color: isDark ? '#60A5FA' : '#1D4ED8',
    },
    bankInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    bankFieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: textSub,
    },
    bankFieldValueBold: {
      fontSize: 13,
      fontWeight: '900',
      color: textMain,
    },
    accountNumberCard: {
      backgroundColor: isDark ? '#171717' : '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? '#333333' : '#D1D5DB',
      flexDirection: 'column',
      gap: 8,
    },
    accountCardLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: textSub,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    accountNumberDigits: {
      fontSize: 18,
      fontWeight: '900',
      color: primary,
      letterSpacing: 1.2,
      marginVertical: 2,
    },
    copyBtn: {
      backgroundColor: primary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyBtnSuccess: {
      backgroundColor: '#10B981',
    },
    copyBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    instructionBanner: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#2B261D' : '#FEF3C7',
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: isDark ? '#554124' : '#FDE68A',
      gap: 8,
      alignItems: 'flex-start',
    },
    instructionIcon: {
      fontSize: 14,
      marginTop: 1,
    },
    instructionText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
      color: isDark ? '#FDE68A' : '#92400E',
    },
    inputSection: {
      marginBottom: 14,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: textMain,
      marginBottom: 6,
    },
    quickSetBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: isDark ? '#2D271E' : '#FEF3C7',
    },
    quickSetBtnText: {
      fontSize: 10,
      fontWeight: '800',
      color: accent,
    },
    amountInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 12,
    },
    currencyPrefix: {
      fontSize: 16,
      fontWeight: '900',
      color: accent,
      marginRight: 6,
    },
    amountInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 15,
      fontWeight: '800',
      color: textMain,
    },
    amountInputWarning: {
      color: '#EF4444',
    },
    mismatchWarningBox: {
      backgroundColor: isDark ? '#3E1F1F' : '#FEE2E2',
      padding: 8,
      borderRadius: 8,
      marginTop: 4,
      borderWidth: 1,
      borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
    },
    mismatchWarningText: {
      fontSize: 11,
      fontWeight: '700',
      color: isDark ? '#FCA5A5' : '#DC2626',
    },
    textInput: {
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 13,
      fontWeight: '700',
      color: textMain,
      borderWidth: 1,
      borderColor: border,
    },
    fieldHint: {
      fontSize: 10,
      color: textSub,
      marginTop: 4,
    },
    uploadSection: {
      marginTop: 6,
    },
    uploadHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    formatTag: {
      fontSize: 10,
      fontWeight: '700',
      color: textSub,
    },
    uploadBoxBtn: {
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 14,
      borderWidth: 2,
      borderColor: isDark ? '#444444' : '#D1D5DB',
      borderStyle: 'dashed',
      padding: 20,
      alignItems: 'center',
    },
    uploadBoxTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
      marginTop: 8,
      textAlign: 'center',
    },
    uploadBoxSub: {
      fontSize: 11,
      color: textSub,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 12,
      paddingHorizontal: 10,
    },
    uploadBadgePill: {
      backgroundColor: accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    uploadBadgePillText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },
    screenshotPreviewCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#262626' : '#F9FAFB',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: border,
      gap: 12,
      alignItems: 'center',
    },
    screenshotImage: {
      width: 80,
      height: 80,
      borderRadius: 10,
      backgroundColor: '#000',
    },
    zoomBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    zoomBadgeText: {
      color: '#FFF',
      fontSize: 8,
      fontWeight: '800',
    },
    screenshotInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    attachedBadge: {
      backgroundColor: '#059669',
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    attachedBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    tapToViewText: {
      fontSize: 10,
      color: textSub,
      marginTop: 4,
    },
    uploadProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    uploadProgressText: {
      fontSize: 11,
      fontWeight: '700',
      color: accent,
    },
    screenshotActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    changeBtn: {
      backgroundColor: accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    changeBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    removeBtn: {
      backgroundColor: isDark ? '#3E1F1F' : '#FEE2E2',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    removeBtnText: {
      color: '#DC2626',
      fontSize: 11,
      fontWeight: '800',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    closeModalBtn: {
      position: 'absolute',
      top: 50,
      right: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      zIndex: 10,
    },
    closeModalText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    fullModalImage: {
      width: '100%',
      height: '80%',
      borderRadius: 12,
    },
  });
};
