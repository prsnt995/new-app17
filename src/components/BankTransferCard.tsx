import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BankAccountInfo, KOREA_BANK_ACCOUNTS, getRandomBankAccount } from '@/data/mockData';

interface BankTransferCardProps {
  selectedBank: BankAccountInfo;
  onSelectBank: (bank: BankAccountInfo) => void;
  senderName: string;
  onChangeSenderName: (name: string) => void;
  paymentScreenshot: string | null;
  onSelectScreenshot: (uri: string | null) => void;
  isDarkMode?: boolean;
}

export function BankTransferCard({
  selectedBank,
  onSelectBank,
  senderName,
  onChangeSenderName,
  paymentScreenshot,
  onSelectScreenshot,
  isDarkMode = false,
}: BankTransferCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleCopyAccount = () => {
    Alert.alert(
      'Account Number Copied!',
      `${selectedBank.bankNameKr} (${selectedBank.bankName})\nAccount: ${selectedBank.accountNumber}\nHolder: ${selectedBank.accountHolder}`
    );
  };

  const handleRandomizeBank = () => {
    const nextBank = getRandomBankAccount();
    onSelectBank(nextBank);
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permission Needed', 'Please allow access to photos to upload your payment screenshot.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelectScreenshot(result.assets[0].uri);
      }
    } catch (e) {
      // Fallback for web or non-supported platforms: pick sample screenshot demo
      Alert.alert(
        'Upload Receipt Screenshot',
        'Sample payment receipt proof attached successfully.',
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

  const styles = getStyles(isDarkMode);

  return (
    <View style={styles.cardContainer}>
      {/* RANDOM ASSIGNMENT HEADER BADGE */}
      <View style={styles.headerRow}>
        <View style={styles.randomBadge}>
          <Text style={styles.randomBadgeText}>🎲 SYSTEM ASSIGNED BANK</Text>
        </View>
        <TouchableOpacity style={styles.randomizeBtn} onPress={handleRandomizeBank}>
          <Text style={styles.randomizeBtnText}>🔄 Pick Random</Text>
        </TouchableOpacity>
      </View>

      {/* SELECTED BANK INFO BOX */}
      <View style={[styles.bankBox, { borderColor: selectedBank.color }]}>
        <View style={styles.bankTopRow}>
          <View style={styles.bankIconCircle}>
            <Text style={{ fontSize: 24 }}>{selectedBank.logo}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={styles.bankTitleRow}>
              <Text style={styles.bankNameKr}>{selectedBank.bankNameKr}</Text>
              <Text style={styles.bankNameEn}>({selectedBank.bankName})</Text>
            </View>
            <Text style={styles.accountHolderText}>
              예금주 (Account Holder): <Text style={styles.holderBold}>{selectedBank.accountHolder}</Text>
            </Text>
          </View>
        </View>

        {/* ACCOUNT NUMBER HIGHLIGHT & COPY */}
        <View style={styles.accountDisplayRow}>
          <View>
            <Text style={styles.accountLabel}>Account Number (계좌번호):</Text>
            <Text style={styles.accountNumberText}>{selectedBank.accountNumber}</Text>
          </View>

          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyAccount}>
            <Text style={styles.copyBtnText}>📋 Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ALL 4 BANK ACCOUNTS SELECTOR CHIPS */}
      <Text style={styles.selectorLabel}>Or Select Preferred Korean Bank:</Text>
      <View style={styles.bankChipsRow}>
        {KOREA_BANK_ACCOUNTS.map((bank) => {
          const isSelected = selectedBank.id === bank.id;
          return (
            <TouchableOpacity
              key={bank.id}
              style={[
                styles.bankChip,
                isSelected && { borderColor: bank.color, backgroundColor: isDarkMode ? '#2A241A' : '#FFF9ED' },
              ]}
              onPress={() => onSelectBank(bank)}
            >
              <Text style={{ fontSize: 13 }}>{bank.logo}</Text>
              <Text style={[styles.bankChipText, isSelected && { color: bank.color, fontWeight: '900' }]}>
                {bank.bankNameKr}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SENDER NAME INPUT */}
      <View style={styles.inputSection}>
        <Text style={styles.fieldLabel}>Sender Name for Verification (입금자명) *</Text>
        <TextInput
          style={styles.textInput}
          value={senderName}
          onChangeText={onChangeSenderName}
          placeholder="e.g. PARSHANT / SENDER NAME"
          placeholderTextColor="#A0A0A0"
        />
        <Text style={styles.fieldHint}>
          Please make sure this matches your bank transfer deposit name.
        </Text>
      </View>

      {/* PAYMENT SCREENSHOT UPLOADER */}
      <View style={styles.uploadSection}>
        <Text style={styles.fieldLabel}>Proof of Payment / Screenshot (입금 영수증 스크린샷)</Text>
        
        {paymentScreenshot ? (
          <View style={styles.screenshotPreviewCard}>
            <TouchableOpacity onPress={() => setIsPreviewOpen(true)} activeOpacity={0.9}>
              <Image source={{ uri: paymentScreenshot }} style={styles.screenshotImage} />
            </TouchableOpacity>
            
            <View style={styles.screenshotInfo}>
              <View style={styles.attachedBadge}>
                <Text style={styles.attachedBadgeText}>✓ Screenshot Attached</Text>
              </View>
              <Text style={styles.tapToViewText}>Tap image to expand preview</Text>
              
              <View style={styles.screenshotActions}>
                <TouchableOpacity style={styles.changeBtn} onPress={handlePickImage}>
                  <Text style={styles.changeBtnText}>📷 Change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeBtn} onPress={() => onSelectScreenshot(null)}>
                  <Text style={styles.removeBtnText}>🗑 Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBoxBtn} onPress={handlePickImage} activeOpacity={0.8}>
            <Text style={{ fontSize: 32 }}>📸</Text>
            <Text style={styles.uploadBoxTitle}>Attach Payment Screenshot</Text>
            <Text style={styles.uploadBoxSub}>
              Upload receipt or bank transfer screenshot to confirm order fast
            </Text>
            <View style={styles.uploadBadgePill}>
              <Text style={styles.uploadBadgePillText}>+ Choose File / Image</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* FULLSCREEN IMAGE PREVIEW MODAL */}
      <Modal visible={isPreviewOpen} transparent animationType="fade" onRequestClose={() => setIsPreviewOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setIsPreviewOpen(false)}>
            <Text style={styles.closeModalText}>✕ Close Preview</Text>
          </TouchableOpacity>
          {paymentScreenshot && (
            <Image source={{ uri: paymentScreenshot }} style={styles.fullModalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (isDark: boolean) => {
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#212121';
  const textSub = isDark ? '#A0A0A0' : '#706D65';
  const border = isDark ? '#333333' : '#EFEBE4';
  const accent = isDark ? '#D4AF37' : '#C88D2B';

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
      marginBottom: 12,
    },
    randomBadge: {
      backgroundColor: isDark ? '#2D271E' : '#FFF5E6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: accent,
    },
    randomBadgeText: {
      fontSize: 9,
      fontWeight: '900',
      color: accent,
      letterSpacing: 0.5,
    },
    randomizeBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? '#2B2B2B' : '#F2EFE9',
    },
    randomizeBtnText: {
      fontSize: 10,
      fontWeight: '700',
      color: textMain,
    },
    bankBox: {
      backgroundColor: isDark ? '#262626' : '#F9F8F5',
      borderRadius: 14,
      padding: 14,
      borderWidth: 2,
      marginBottom: 12,
    },
    bankTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bankIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? '#333' : '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    bankTitleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    bankNameKr: {
      fontSize: 17,
      fontWeight: '900',
      color: textMain,
    },
    bankNameEn: {
      fontSize: 12,
      fontWeight: '700',
      color: textSub,
    },
    accountHolderText: {
      fontSize: 11,
      color: textSub,
      marginTop: 2,
    },
    holderBold: {
      fontWeight: '900',
      color: accent,
    },
    accountDisplayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
      padding: 12,
      borderRadius: 10,
      marginTop: 12,
      borderWidth: 1,
      borderColor: border,
    },
    accountLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: textSub,
      textTransform: 'uppercase',
    },
    accountNumberText: {
      fontSize: 17,
      fontWeight: '900',
      color: textMain,
      letterSpacing: 1,
      marginTop: 2,
    },
    copyBtn: {
      backgroundColor: accent,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    copyBtnText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },
    selectorLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: textSub,
      marginBottom: 8,
    },
    bankChipsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 16,
    },
    bankChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: isDark ? '#262626' : '#F3F0EA',
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    bankChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: textMain,
    },
    inputSection: {
      marginBottom: 14,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: textMain,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
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
      marginTop: 4,
    },
    uploadBoxBtn: {
      backgroundColor: isDark ? '#262626' : '#F9F8F5',
      borderRadius: 14,
      borderWidth: 2,
      borderColor: border,
      borderStyle: 'dashed',
      padding: 18,
      alignItems: 'center',
    },
    uploadBoxTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textMain,
      marginTop: 6,
    },
    uploadBoxSub: {
      fontSize: 10,
      color: textSub,
      textAlign: 'center',
      marginTop: 3,
      marginBottom: 10,
    },
    uploadBadgePill: {
      backgroundColor: accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    uploadBadgePillText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },
    screenshotPreviewCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: border,
      gap: 12,
    },
    screenshotImage: {
      width: 70,
      height: 70,
      borderRadius: 8,
      backgroundColor: '#000',
    },
    screenshotInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    attachedBadge: {
      backgroundColor: '#2E7D32',
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    attachedBadgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '900',
    },
    tapToViewText: {
      fontSize: 10,
      color: textSub,
      marginTop: 4,
    },
    screenshotActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    changeBtn: {
      backgroundColor: accent,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    changeBtnText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    removeBtn: {
      backgroundColor: isDark ? '#3E1F1F' : '#FFEBEE',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    removeBtnText: {
      color: '#E53935',
      fontSize: 10,
      fontWeight: '800',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
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
      borderRadius: 20,
      zIndex: 10,
    },
    closeModalText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    fullModalImage: {
      width: '100%',
      height: '80%',
    },
  });
};
