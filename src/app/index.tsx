import React, { useState } from 'react';
import {
  Image,
  Modal,
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
import { BottomNav } from '@/components/BottomNav';
import { CurrencyCode, LanguageCode } from '@/types';

const categories = [
  { name: 'All', icon: '✨', count: 'All items' },
  { name: 'Rice', icon: '🍚', count: 'Basmati & Sona' },
  { name: 'Atta', icon: '🌾', count: 'Chakki Fresh' },
  { name: 'Masala', icon: '🌶️', count: 'Spices & Herbs' },
  { name: 'Dal', icon: '🫘', count: 'Pulses & Lentils' },
  { name: 'Snacks', icon: '🍿', count: 'Namkeen & Sweets' },
  { name: 'Drinks', icon: '🥤', count: 'Tea & Beverages' },
];

export default function HomeScreen() {
  const router = useRouter();
  const {
    products,
    cartCount,
    wishlist,
    addToCart,
    toggleWishlist,
    formatPrice,
    user,
    language,
    setLanguage,
    setCurrency,
    t,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || product.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleSelectLanguage = (lang: LanguageCode, curr: CurrencyCode) => {
    setLanguage(lang);
    setCurrency(curr);
    setIsLanguageModalOpen(false);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F7F3" />

      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcome}>
                {t('welcomeBack')}, {user.name.split(' ')[0].toUpperCase()}
              </Text>
              <Text style={styles.logo}>
                NAMASTE <Text style={styles.logoGold}>MART</Text>
              </Text>
              <Text style={styles.tagline}>
                {t('subHeader')}
              </Text>
            </View>

            <View style={styles.headerRight}>
              {/* CART BUTTON */}
              <TouchableOpacity
                style={styles.cartButton}
                activeOpacity={0.8}
                onPress={() => router.push('/cart')}
              >
                <Text style={styles.cartIcon}>🛒</Text>
                {cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* TRANSLATE / LANGUAGE SWITCHER BUTTON (REPLACING LOGOUT) */}
              <TouchableOpacity
                style={styles.langButton}
                activeOpacity={0.85}
                onPress={() => setIsLanguageModalOpen(true)}
              >
                <Text style={styles.langButtonFlag}>
                  {language === 'KR'
                    ? '🇰🇷'
                    : language === 'HI'
                    ? '🇮🇳'
                    : language === 'NE'
                    ? '🇳🇵'
                    : '🌐'}
                </Text>
                <Text style={styles.langButtonText}>
                  {language === 'KR'
                    ? '한국어'
                    : language === 'HI'
                    ? 'हिंदी'
                    : language === 'NE'
                    ? 'नेपाली'
                    : 'EN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* LOCATION */}
          <TouchableOpacity
            style={styles.locationCard}
            activeOpacity={0.85}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.locationCircle}>
              <Text style={{ fontSize: 18 }}>📍</Text>
            </View>

            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>{t('deliveringTo')}</Text>
              <Text style={styles.location}>
                Seoul Gangnam Hub ➔ India & Nepal
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* SEARCH */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor="#A2A2A2"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* HERO BANNER */}
          <View style={styles.hero}>
            <View style={styles.heroLeft}>
              <View style={styles.offerBadge}>
                <Text style={styles.offerText}>{t('heroBadge')}</Text>
              </View>

              <Text style={styles.heroTitle}>
                {t('heroTitle')}
              </Text>

              <Text style={styles.heroSubtitle}>
                {t('heroSubtitle')}
              </Text>

              <TouchableOpacity
                style={styles.heroButton}
                activeOpacity={0.85}
                onPress={() => router.push('/send-parcel')}
              >
                <Text style={styles.heroButtonText}>{t('sendParcelBtn')}</Text>
                <Text style={styles.heroArrow}>→</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroRight}>
              <Text style={styles.heroEmoji}>📦 ✈️</Text>
              <Text style={styles.heroFlag}>🇰🇷 ➔ 🇮🇳 🇳🇵</Text>
            </View>

            <View style={styles.decorCircleOne} />
            <View style={styles.decorCircleTwo} />
          </View>

          {/* SPECIAL PROMO OFFER */}
          <View style={styles.specialOffer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.specialSmall}>{t('promoSmall')}</Text>
              <Text style={styles.specialTitle}>{t('promoTitle')}</Text>
              <Text style={styles.specialText}>
                {t('promoText')}
              </Text>

              <TouchableOpacity
                style={styles.specialButton}
                activeOpacity={0.85}
                onPress={() => router.push('/cart')}
              >
                <Text style={styles.specialButtonText}>{t('claimOffer')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.deliveryEmoji}>🚚</Text>
          </View>

          {/* QUICK VALUE PROPS */}
          <View style={styles.benefitRow}>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>✈️</Text>
              <View>
                <Text style={styles.benefitTitle}>{t('expressAir')}</Text>
                <Text style={styles.benefitText}>Direct Seoul to Delhi/KTM</Text>
              </View>
            </View>

            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>🛡️</Text>
              <View>
                <Text style={styles.benefitTitle}>{t('customsCleared')}</Text>
                <Text style={styles.benefitText}>100% Guaranteed delivery</Text>
              </View>
            </View>
          </View>

          {/* CATEGORIES SECTION */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{t('categories')}</Text>
              <Text style={styles.sectionSubtitle}>
                Everything you love from home
              </Text>
            </View>

            {selectedCategory !== 'All' && (
              <TouchableOpacity onPress={() => setSelectedCategory('All')}>
                <Text style={styles.seeAll}>Reset (Show All)</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryContainer}
          >
            {categories.map((category) => {
              const isSelected = selectedCategory === category.name;
              return (
                <TouchableOpacity
                  key={category.name}
                  style={[styles.categoryCard, isSelected && styles.categoryCardActive]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategory(category.name)}
                >
                  <View style={[styles.categoryImage, isSelected && styles.categoryImageActive]}>
                    <Text style={styles.categoryEmoji}>{category.icon}</Text>
                  </View>

                  <Text style={[styles.categoryName, isSelected && styles.categoryNameActive]}>
                    {category.name}
                  </Text>

                  <Text style={styles.categoryCount}>{category.count}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* BEST SELLERS SECTION */}
          <View style={styles.sectionHeader}>
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.sectionTitle}>
                  {selectedCategory === 'All' ? t('popularProducts') : `${selectedCategory} Collection`}
                </Text>
                <Text style={styles.fire}>🔥</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                {filteredProducts.length} items available for immediate shipping
              </Text>
            </View>

            <TouchableOpacity onPress={() => router.push('/wishlist')}>
              <Text style={styles.seeAll}>Wishlist ({wishlist.length}) →</Text>
            </TouchableOpacity>
          </View>

          {/* PRODUCTS GRID */}
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => {
              const isFav = wishlist.includes(product.id);
              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  activeOpacity={0.9}
                >
                  <View style={styles.productImageContainer}>
                    <Image
                      source={{ uri: product.image }}
                      style={styles.productImage}
                    />

                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{product.discount}</Text>
                    </View>

                    <View style={styles.originTag}>
                      <Text style={styles.originText}>
                        {product.origin === 'Nepal' ? '🇳🇵 Nepal' : '🇮🇳 India'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.heartButton, isFav && styles.heartButtonActive]}
                      onPress={() => toggleWishlist(product.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.heart, isFav && styles.heartActive]}>
                        {isFav ? '♥' : '♡'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.productDetails}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>

                    <Text style={styles.productSize}>
                      Size: {product.size} • Weight: {product.weightKg} kg
                    </Text>

                    <View style={styles.ratingRow}>
                      <Text style={styles.star}>★</Text>
                      <Text style={styles.rating}>{product.rating}</Text>
                      <Text style={styles.review}>({product.reviews})</Text>
                    </View>

                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.price}>{formatPrice(product.priceKRW)}</Text>
                        <Text style={styles.oldPrice}>{formatPrice(product.oldPriceKRW)}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.addButton}
                        activeOpacity={0.8}
                        onPress={() => addToCart(product.id)}
                      >
                        <Text style={styles.plus}>{t('addBtn')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredProducts.length === 0 && (
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchIcon}>🔎</Text>
              <Text style={styles.emptySearchTitle}>No items found</Text>
              <Text style={styles.emptySearchText}>
                Try searching for Basmati, Atta, Masala, or clear your filters.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
              >
                <Text style={styles.resetBtnText}>Clear Search & Filters</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TRUST / WHY CHOOSE */}
          <View style={styles.trustSection}>
            <Text style={styles.trustTitle}>{t('whyChoose')}</Text>

            <View style={styles.trustGrid}>
              <View style={styles.trustItem}>
                <Text style={styles.trustIcon}>🇮🇳 🇳🇵</Text>
                <Text style={styles.trustItemTitle}>{t('halalVeg')}</Text>
                <Text style={styles.trustItemText}>Imported quality products</Text>
              </View>

              <View style={styles.trustItem}>
                <Text style={styles.trustIcon}>⚡</Text>
                <Text style={styles.trustItemTitle}>{t('liveTracking')}</Text>
                <Text style={styles.trustItemText}>Live tracking with SMS/GPS</Text>
              </View>

              <View style={styles.trustItem}>
                <Text style={styles.trustIcon}>🔒</Text>
                <Text style={styles.trustItemTitle}>Secure Payment</Text>
                <Text style={styles.trustItemText}>KakaoPay, Cards, UPI & COD</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ============================================================ */}
        {/* LANGUAGE & KRW TRANSLATION SELECTION MODAL                   */}
        {/* ============================================================ */}
        <Modal
          visible={isLanguageModalOpen}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.langModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🌐 Language & Currency</Text>
                <TouchableOpacity onPress={() => setIsLanguageModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Select your preferred language and display currency:
              </Text>

              <View style={styles.langOptionsList}>
                {/* 1. KOREAN / KRW (Primary) */}
                <TouchableOpacity
                  style={[
                    styles.langOptionCard,
                    language === 'KR' && styles.langOptionCardActive,
                  ]}
                  onPress={() => handleSelectLanguage('KR', 'KRW')}
                >
                  <Text style={styles.langFlag}>🇰🇷</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.langOptionTitle}>한국어 (Korean)</Text>
                    <Text style={styles.langOptionSub}>화폐: ₩ KRW (대한민국 원)</Text>
                  </View>
                  {language === 'KR' && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>

                {/* 2. ENGLISH */}
                <TouchableOpacity
                  style={[
                    styles.langOptionCard,
                    language === 'EN' && styles.langOptionCardActive,
                  ]}
                  onPress={() => handleSelectLanguage('EN', 'KRW')}
                >
                  <Text style={styles.langFlag}>🌐</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.langOptionTitle}>English</Text>
                    <Text style={styles.langOptionSub}>Currency: ₩ KRW / Global</Text>
                  </View>
                  {language === 'EN' && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>

                {/* 3. HINDI / INR */}
                <TouchableOpacity
                  style={[
                    styles.langOptionCard,
                    language === 'HI' && styles.langOptionCardActive,
                  ]}
                  onPress={() => handleSelectLanguage('HI', 'INR')}
                >
                  <Text style={styles.langFlag}>🇮🇳</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.langOptionTitle}>हिंदी (Hindi)</Text>
                    <Text style={styles.langOptionSub}>मुद्रा: ₹ INR (भारतीय रुपया)</Text>
                  </View>
                  {language === 'HI' && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>

                {/* 4. NEPALI / NPR */}
                <TouchableOpacity
                  style={[
                    styles.langOptionCard,
                    language === 'NE' && styles.langOptionCardActive,
                  ]}
                  onPress={() => handleSelectLanguage('NE', 'NPR')}
                >
                  <Text style={styles.langFlag}>🇳🇵</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.langOptionTitle}>नेपाली (Nepali)</Text>
                    <Text style={styles.langOptionSub}>मुद्रा: रू NPR (नेपाली रुपैयाँ)</Text>
                  </View>
                  {language === 'NE' && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setIsLanguageModalOpen(false)}
              >
                <Text style={styles.closeModalBtnText}>CONFIRM / 확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* BOTTOM NAV */}
        <BottomNav currentTab="home" />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7F3',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A857A',
    letterSpacing: 1,
  },
  logo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#212121',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  logoGold: {
    color: '#C88D2B',
  },
  tagline: {
    fontSize: 11,
    color: '#8A857A',
    marginTop: 2,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
  },
  cartIcon: {
    fontSize: 18,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#C88D2B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  langButtonFlag: {
    fontSize: 15,
    marginRight: 4,
  },
  langButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#212121',
  },
  locationCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  locationCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EEDC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  locationLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C88D2B',
    letterSpacing: 0.5,
  },
  location: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: '#C88D2B',
    fontWeight: '700',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    color: '#8A857A',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#212121',
    padding: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: '#8A857A',
    padding: 4,
  },
  hero: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#23201C',
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
  },
  heroLeft: {
    flex: 1,
    zIndex: 2,
  },
  offerBadge: {
    backgroundColor: 'rgba(200, 141, 43, 0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  offerText: {
    color: '#F0BA5A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    color: '#D4CEBF',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  heroButton: {
    marginTop: 14,
    backgroundColor: '#C88D2B',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroArrow: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  heroRight: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    paddingLeft: 8,
  },
  heroEmoji: {
    fontSize: 34,
  },
  heroFlag: {
    fontSize: 11,
    marginTop: 6,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  decorCircleOne: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(200, 141, 43, 0.1)',
    top: -40,
    right: -40,
  },
  decorCircleTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    bottom: -60,
    right: 40,
  },
  specialOffer: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#FFF9ED',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3E1BA',
  },
  specialSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C88D2B',
    letterSpacing: 0.5,
  },
  specialTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
    marginTop: 2,
  },
  specialText: {
    fontSize: 11,
    color: '#666155',
    marginTop: 3,
    lineHeight: 16,
  },
  codeHighlight: {
    color: '#C88D2B',
    fontWeight: '800',
  },
  specialButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  specialButtonText: {
    color: '#C88D2B',
    fontSize: 11,
    fontWeight: '800',
  },
  deliveryEmoji: {
    fontSize: 36,
    marginLeft: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    gap: 10,
  },
  benefit: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  benefitTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#212121',
  },
  benefitText: {
    fontSize: 9,
    color: '#8A857A',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#212121',
    letterSpacing: 0.2,
  },
  fire: {
    fontSize: 14,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#8A857A',
    marginTop: 2,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C88D2B',
  },
  categoryContainer: {
    paddingLeft: 20,
    paddingRight: 8,
    gap: 12,
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    width: 96,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  categoryCardActive: {
    borderColor: '#C88D2B',
    backgroundColor: '#FFFBF3',
  },
  categoryImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F7F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryImageActive: {
    backgroundColor: '#F5EEDC',
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#C88D2B',
  },
  categoryCount: {
    fontSize: 8,
    color: '#8A857A',
    marginTop: 2,
    textAlign: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 12,
  },
  productCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  productImageContainer: {
    position: 'relative',
    height: 130,
    backgroundColor: '#F8F7F3',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#C88D2B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  originTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  originText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#212121',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButtonActive: {
    backgroundColor: '#FFEBEE',
  },
  heart: {
    fontSize: 16,
    color: '#8A857A',
  },
  heartActive: {
    color: '#E53935',
  },
  productDetails: {
    padding: 10,
  },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
    lineHeight: 16,
    minHeight: 32,
  },
  productSize: {
    fontSize: 9,
    color: '#8A857A',
    marginTop: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  star: {
    color: '#FFA000',
    fontSize: 11,
  },
  rating: {
    fontSize: 10,
    fontWeight: '700',
    color: '#212121',
  },
  review: {
    fontSize: 9,
    color: '#8A857A',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C88D2B',
  },
  oldPrice: {
    fontSize: 9,
    color: '#8A857A',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  addButton: {
    backgroundColor: '#212121',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  plus: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptySearch: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 18,
    marginTop: 10,
  },
  emptySearchIcon: {
    fontSize: 36,
  },
  emptySearchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#212121',
    marginTop: 8,
  },
  emptySearchText: {
    fontSize: 11,
    color: '#8A857A',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  resetBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#F5EEDC',
    borderRadius: 8,
  },
  resetBtnText: {
    color: '#C88D2B',
    fontSize: 11,
    fontWeight: '800',
  },
  trustSection: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212121',
    marginBottom: 12,
  },
  trustGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F7F3',
    padding: 10,
    borderRadius: 12,
  },
  trustIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  trustItemTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#212121',
    textAlign: 'center',
  },
  trustItemText: {
    fontSize: 8,
    color: '#8A857A',
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  langModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  modalSubtitle: {
    fontSize: 11,
    color: '#8A857A',
    marginBottom: 14,
  },
  langOptionsList: {
    gap: 8,
    marginBottom: 16,
  },
  langOptionCard: {
    backgroundColor: '#F8F7F3',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EFEBE4',
  },
  langOptionCardActive: {
    borderColor: '#C88D2B',
    backgroundColor: '#FFFBF3',
  },
  langFlag: {
    fontSize: 24,
  },
  langOptionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#212121',
  },
  langOptionSub: {
    fontSize: 10,
    color: '#8A857A',
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#C88D2B',
    marginLeft: 8,
  },
  closeModalBtn: {
    backgroundColor: '#212121',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});