import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { ProductGridSkeleton } from '@/components/ScreenLoader';
import { CurrencyCode, LanguageCode } from '@/types';

const categories = [
  { name: 'All', icon: '✨', count: 'All items' },
  { name: 'Jewelry', icon: '💎', count: 'Gold & Kundan' },
  { name: 'Sweets', icon: '🍬', count: 'Mithai & Desserts' },
  { name: 'Rice', icon: '🍚', count: 'Basmati & Sona' },
  { name: 'Atta', icon: '🌾', count: 'Chakki Fresh' },
  { name: 'Masala', icon: '🌶️', count: 'Spices & Herbs' },
  { name: 'Dal', icon: '🫘', count: 'Pulses & Lentils' },
  { name: 'Snacks', icon: '🍿', count: 'Namkeen & Chips' },
  { name: 'Drinks', icon: '🥤', count: 'Tea & Beverages' },
  { name: 'Clothes', icon: '👗', count: 'Sarees & Apparel' },
  { name: 'Perfumes', icon: '🪔', count: 'Attar & Oils' },
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
    addAddress,
    setDefaultAddress,
    t,
    isDarkMode,
    toggleDarkMode,
    banners,
    isProductsLoading,
  } = useApp();

  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const cardWidthStyle = isDesktop ? '23.5%' : '48.5%';
  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isPerfumeVideoPlaying, setIsPerfumeVideoPlaying] = useState(true);
  const [isCourierVideoPlaying, setIsCourierVideoPlaying] = useState(true);
  const [flightPos, setFlightPos] = useState(10);

  const [courierImgError, setCourierImgError] = useState(false);
  const [clothesImgError, setClothesImgError] = useState(false);
  const [perfumeImgError, setPerfumeImgError] = useState(false);

  useEffect(() => {
    if (!isCourierVideoPlaying) return;
    const interval = setInterval(() => {
      setFlightPos((prev) => (prev >= 80 ? 10 : prev + 14));
    }, 700);
    return () => clearInterval(interval);
  }, [isCourierVideoPlaying]);
  const [newAddrTitle, setNewAddrTitle] = useState('');
  const [newAddrFull, setNewAddrFull] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrPostal, setNewAddrPostal] = useState('');
  const [newAddrPhone, setNewAddrPhone] = useState('');

  // ─── FEATURED HIGHLIGHTS SLIDE CAROUSEL DATA ────────────────────────────────
  const [parcelSlideIndex, setParcelSlideIndex] = useState(0);
  const [sweetsSlideIndex, setSweetsSlideIndex] = useState(0);

  const parcelSlides = React.useMemo(() => [
    {
      country: 'INDIA',
      flag: '🇮🇳',
      image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=800',
    },
    {
      country: 'NEPAL',
      flag: '🇳🇵',
      image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=800',
    },
    {
      country: 'KOREA',
      flag: '🇰🇷',
      image: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&q=80&w=800',
    },
  ], []);

  const sweetsSlides = React.useMemo(() => [
    {
      name: 'Laddoo',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=800',
    },
    {
      name: 'Kaju Katli & Barfi',
      image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&q=80&w=800',
    },
    {
      name: 'Gulab Jamun',
      image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=800',
    },
    {
      name: 'Rasgulla',
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=800',
    },
  ], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setParcelSlideIndex((prev) => (prev + 1) % parcelSlides.length);
      setSweetsSlideIndex((prev) => (prev + 1) % sweetsSlides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [parcelSlides.length, sweetsSlides.length]);

  const handlePrevHighlight = () => {
    setParcelSlideIndex((prev) => (prev - 1 + parcelSlides.length) % parcelSlides.length);
    setSweetsSlideIndex((prev) => (prev - 1 + sweetsSlides.length) % sweetsSlides.length);
  };

  const handleNextHighlight = () => {
    setParcelSlideIndex((prev) => (prev + 1) % parcelSlides.length);
    setSweetsSlideIndex((prev) => (prev + 1) % sweetsSlides.length);
  };

  // Get Korean addresses from user's saved addresses
  const koreanAddresses = user.savedAddresses.filter(
    (addr) => addr.country === 'South Korea'
  );
  const selectedKoreanAddress =
    koreanAddresses.find((a) => a.isDefault) || koreanAddresses[0];

  const handleSelectKoreanAddress = (addrId: string) => {
    setDefaultAddress(addrId);
    setIsLocationModalOpen(false);
  };

  const handleAddNewKoreanAddress = () => {
    if (!newAddrTitle.trim() || !newAddrFull.trim() || !newAddrCity.trim()) {
      Alert.alert('Missing Info', 'Please fill in title, address and city.');
      return;
    }
    addAddress({
      title: newAddrTitle.trim(),
      type: 'HOME',
      recipientName: user.name,
      phone: newAddrPhone.trim() || user.phone,
      fullAddress: newAddrFull.trim(),
      city: newAddrCity.trim(),
      postalCode: newAddrPostal.trim(),
      country: 'South Korea',
      isDefault: koreanAddresses.length === 0,
    });
    setNewAddrTitle('');
    setNewAddrFull('');
    setNewAddrCity('');
    setNewAddrPostal('');
    setNewAddrPhone('');
    setIsAddAddressOpen(false);
  };

  const filteredProducts = products.filter((product) => {
    if (product.isHidden) return false; // Admin-hidden products not shown
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(search.toLowerCase())) ||
      (product.tags && product.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
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
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#121212' : '#F8F7F3'}
      />

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
              {user?.isLoggedIn ? (
                <TouchableOpacity
                  style={styles.langButton}
                  activeOpacity={0.85}
                  onPress={() => router.push('/profile')}
                >
                  <Text style={styles.langButtonText}>
                    {user.name ? user.name.split(' ')[0] : 'My Account'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.langButton}
                  activeOpacity={0.85}
                  onPress={() => router.push('/login')}
                >
                  <Text style={styles.langButtonText}>Login</Text>
                </TouchableOpacity>
              )}

              {/* TRANSLATE / LANGUAGE SWITCHER BUTTON */}
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
            onPress={() => setIsLocationModalOpen(true)}
          >
            <View style={styles.locationCircle}>
              <Text style={{ fontSize: 18 }}>📍</Text>
            </View>

            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>{t('deliveringTo')}</Text>
              <Text style={styles.location} numberOfLines={1}>
                {selectedKoreanAddress
                  ? `${selectedKoreanAddress.city}, ${selectedKoreanAddress.fullAddress.split(',').pop()?.trim() || ''}`
                  : t('noKoreanAddress')}
              </Text>
            </View>

            <View style={styles.changeAddressPill}>
              <Text style={styles.changeAddressText}>{t('changeAddress')}</Text>
            </View>
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

          {/* FEATURED HIGHLIGHTS (2 LARGE ROUNDED CARDS SIDE BY SIDE) */}
          <View style={styles.featuredSectionContainer}>
            <View style={styles.featuredHeaderRow}>
              <Text style={styles.featuredHeaderTitle}>✨ Featured Highlights</Text>
              <View style={styles.arrowControlsRow}>
                <TouchableOpacity style={styles.arrowButton} onPress={handlePrevHighlight} activeOpacity={0.7}>
                  <Text style={styles.arrowButtonText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.arrowButton} onPress={handleNextHighlight} activeOpacity={0.7}>
                  <Text style={styles.arrowButtonText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.featuredCardsGrid}>
              {/* CARD 1 (LEFT): AIR CARGO / PARCEL */}
              <TouchableOpacity
                style={styles.featuredHighlightCard}
                activeOpacity={0.92}
                onPress={() => router.push('/send-parcel')}
              >
                <Image
                  source={{ uri: parcelSlides[parcelSlideIndex].image }}
                  style={styles.featuredCardBgImage}
                />
                <View style={styles.featuredCardGradientOverlay}>
                  {/* Top Row: Country Flag Badge */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.countryPillBadge}>
                      <Text style={styles.countryPillFlag}>{parcelSlides[parcelSlideIndex].flag}</Text>
                      <Text style={styles.countryPillText}>{parcelSlides[parcelSlideIndex].country}</Text>
                    </View>
                  </View>

                  {/* Middle Content */}
                  <View style={styles.cardCenterContent}>
                    <View style={styles.tagBadgeOrange}>
                      <Text style={styles.tagBadgeIcon}>✈️</Text>
                      <Text style={styles.tagBadgeText}>AIR CARGO</Text>
                    </View>
                    <Text style={styles.cardMainTitle}>Send Parcel to Home</Text>
                    <Text style={styles.cardSubtitle}>Direct Express Air Cargo</Text>
                  </View>

                  {/* Bottom Action Row */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.orangeActionBtn}>
                      <Text style={styles.orangeActionBtnText}>Send Now ✈</Text>
                    </View>
                    <View style={styles.deliveryBadgePill}>
                      <Text style={styles.deliveryBadgeText}>3–5 Days Delivery</Text>
                    </View>
                  </View>

                  {/* Bottom Center Dots */}
                  <View style={styles.paginationDotsRow}>
                    {parcelSlides.map((_, i) => (
                      <View
                        key={i}
                        style={[styles.dotIndicator, i === parcelSlideIndex && styles.dotIndicatorActive]}
                      />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>

              {/* CARD 2 (RIGHT): REQUEST ITEMS TO KOREA */}
              <TouchableOpacity
                style={styles.featuredHighlightCard}
                activeOpacity={0.92}
                onPress={() => router.push('/request-item')}
              >
                <Image
                  source={{ uri: sweetsSlides[sweetsSlideIndex].image }}
                  style={styles.featuredCardBgImage}
                />
                <View style={styles.featuredCardGradientOverlay}>
                  {/* Top Row: Tag Badge */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.tagBadgeOrange}>
                      <Text style={styles.tagBadgeIcon}>🛍️</Text>
                      <Text style={styles.tagBadgeText}>ITEM SOURCING</Text>
                    </View>
                  </View>

                  {/* Middle Content */}
                  <View style={styles.cardCenterContent}>
                    <Text style={styles.cardMainTitle}>Request Items to Korea</Text>
                    <Text style={styles.cardSubtitle}>India / Nepal ➔ South Korea Sourcing</Text>
                  </View>

                  {/* Bottom Action Row */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.orangeActionBtn}>
                      <Text style={styles.orangeActionBtnText}>Request Items 🛍️</Text>
                    </View>
                    <View style={styles.deliveryBadgePill}>
                      <Text style={styles.deliveryBadgeText}>Custom Orders</Text>
                    </View>
                  </View>

                  {/* Bottom Center Dots */}
                  <View style={styles.paginationDotsRow}>
                    {sweetsSlides.map((_, i) => (
                      <View
                        key={i}
                        style={[styles.dotIndicator, i === sweetsSlideIndex && styles.dotIndicatorActive]}
                      />
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
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

          {/* BEST SELLERS / POPULAR PRODUCTS SECTION */}
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
          {isProductsLoading ? (
            <ProductGridSkeleton count={6} />
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map((product) => {
                const isFav = wishlist.includes(product.id);
                const isOutOfStock = (product.stock !== undefined && product.stock <= 0) || product.available === false;
                const hasDiscount = (product.discountPercent ?? 0) > 0;
                const displayDiscount = product.discount || (hasDiscount ? `${product.discountPercent}% OFF` : '');

                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productCard, { width: cardWidthStyle }]}
                    activeOpacity={0.9}
                    onPress={() => router.push({ pathname: '/product-detail', params: { id: product.id } })}
                  >
                    <View style={styles.productImageContainer}>
                      {(() => { const supaUri = (product.image || '').includes('supabase.co/storage') ? product.image : undefined; return supaUri ? (
                        <Image source={{ uri: supaUri }} style={styles.productImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.productImage, { backgroundColor: '#F0ECE1', justifyContent: 'center', alignItems: 'center' }]} />
                      );})()}

                      {isOutOfStock ? (
                        <View style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.55)',
                          justifyContent: 'center',
                          alignItems: 'center',
                          zIndex: 3,
                          borderRadius: 12,
                        }}>
                          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }}>
                            OUT OF STOCK
                          </Text>
                        </View>
                      ) : hasDiscount ? (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>{displayDiscount}</Text>
                        </View>
                      ) : null}

                      <View style={styles.originTag}>
                        <Text style={styles.originText}>
                          {product.origin === 'Nepal' ? '🇳🇵 Nepal' : '🇮🇳 India'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.heartButton, isFav && styles.heartButtonActive]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          toggleWishlist(product.id);
                        }}
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
                        Size: {product.size || (product.weightKg ? (product.weightKg < 1 ? `${Math.round(product.weightKg*1000)} g` : `${product.weightKg} kg`) : '1 Pack')} • {product.brand || 'Authentic'}
                      </Text>

                      <View style={styles.ratingRow}>
                        <Text style={styles.star}>★</Text>
                        <Text style={styles.rating}>{product.rating || 4.8}</Text>
                        <Text style={styles.review}>({product.reviews || 12})</Text>
                      </View>

                      <View style={styles.priceRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.price}>{formatPrice(product.finalPrice ?? product.priceKRW)}</Text>
                          {hasDiscount && (product.oldPriceKRW || 0) > 0 && (
                            <Text style={styles.oldPrice}>{formatPrice(product.oldPriceKRW || product.priceKRW)}</Text>
                          )}
                        </View>

                        <TouchableOpacity
                          style={[styles.addButton, isOutOfStock && { backgroundColor: '#9CA3AF' }]}
                          activeOpacity={0.8}
                          disabled={isOutOfStock}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            if (!isOutOfStock) addToCart(product.id);
                          }}
                        >
                          <Text style={[styles.plus, isOutOfStock && { fontSize: 10 }]}>
                            {isOutOfStock ? 'Sold Out' : t('addBtn')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* VIEW ALL PRODUCTS BUTTON AT THE BOTTOM OF THIS SECTION */}
          {!isProductsLoading && filteredProducts.length > 0 && (
            <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: isDarkMode ? '#272017' : '#FFFBEB',
                  borderWidth: 1.5,
                  borderColor: '#D97706',
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.85}
                onPress={() => setSelectedCategory('All')}
              >
                <Text style={{ color: '#D97706', fontSize: 14, fontWeight: '900' }}>
                  🛍️ View All Products ({products.length} Items) →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isProductsLoading && filteredProducts.length === 0 && (
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
                <Text style={styles.trustIcon}>🚀</Text>
                <Text style={styles.trustItemTitle}>{t('fastDelivery')}</Text>
                <Text style={styles.trustItemText}>Express air cargo service</Text>
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

        {/* ============================================================ */}
        {/* DELIVERY ADDRESS SELECTION MODAL                             */}
        {/* ============================================================ */}
        <Modal
          visible={isLocationModalOpen}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.locationModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📍 {t('selectDeliveryAddress')}</Text>
                <TouchableOpacity onPress={() => { setIsLocationModalOpen(false); setIsAddAddressOpen(false); }}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                {language === 'KR'
                  ? '한국 내 배송 받을 주소를 선택하세요'
                  : language === 'HI'
                  ? 'कोरिया में डिलीवरी का पता चुनें'
                  : language === 'NE'
                  ? 'कोरियामा डेलिभरी ठेगाना छान्नुहोस्'
                  : 'Select your delivery address in Korea'}
              </Text>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {koreanAddresses.length === 0 && !isAddAddressOpen && (
                  <View style={styles.emptyAddrCard}>
                    <Text style={styles.emptyAddrIcon}>🏠</Text>
                    <Text style={styles.emptyAddrText}>{t('noKoreanAddress')}</Text>
                  </View>
                )}

                {koreanAddresses.map((addr) => {
                  const isSelected = selectedKoreanAddress?.id === addr.id;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={[styles.addrOptionCard, isSelected && styles.addrOptionCardActive]}
                      onPress={() => handleSelectKoreanAddress(addr.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.addrOptionLeft}>
                        <Text style={styles.addrOptionIcon}>
                          {addr.type === 'OFFICE' ? '🏢' : '🏠'}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.addrOptionTitle}>{addr.title}</Text>
                        <Text style={styles.addrOptionAddress} numberOfLines={2}>
                          {addr.fullAddress}, {addr.city} {addr.postalCode}
                        </Text>
                        <Text style={styles.addrOptionPhone}>{addr.phone}</Text>
                      </View>
                      {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}

                {/* ADD NEW ADDRESS SECTION */}
                {!isAddAddressOpen ? (
                  <TouchableOpacity
                    style={styles.addNewAddrBtn}
                    onPress={() => setIsAddAddressOpen(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addNewAddrText}>{t('addNewKoreanAddress')}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.newAddrForm}>
                    <Text style={styles.newAddrFormTitle}>
                      {language === 'KR' ? '새 한국 주소 추가' : 'Add New Korean Address'}
                    </Text>
                    <TextInput
                      style={styles.newAddrInput}
                      placeholder={language === 'KR' ? '주소 이름 (예: 집, 회사)' : 'Address title (e.g. Home, Office)'}
                      placeholderTextColor="#A2A2A2"
                      value={newAddrTitle}
                      onChangeText={setNewAddrTitle}
                    />
                    <TextInput
                      style={styles.newAddrInput}
                      placeholder={language === 'KR' ? '상세 주소 *' : 'Full address *'}
                      placeholderTextColor="#A2A2A2"
                      value={newAddrFull}
                      onChangeText={setNewAddrFull}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.newAddrInput, { flex: 1 }]}
                        placeholder={language === 'KR' ? '도시 *' : 'City *'}
                        placeholderTextColor="#A2A2A2"
                        value={newAddrCity}
                        onChangeText={setNewAddrCity}
                      />
                      <TextInput
                        style={[styles.newAddrInput, { flex: 1 }]}
                        placeholder={language === 'KR' ? '우편번호' : 'Postal code'}
                        placeholderTextColor="#A2A2A2"
                        value={newAddrPostal}
                        onChangeText={setNewAddrPostal}
                        keyboardType="numeric"
                      />
                    </View>
                    <TextInput
                      style={styles.newAddrInput}
                      placeholder={language === 'KR' ? '연락처' : 'Phone number'}
                      placeholderTextColor="#A2A2A2"
                      value={newAddrPhone}
                      onChangeText={setNewAddrPhone}
                      keyboardType="phone-pad"
                    />
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <TouchableOpacity
                        style={styles.newAddrCancelBtn}
                        onPress={() => setIsAddAddressOpen(false)}
                      >
                        <Text style={styles.newAddrCancelText}>
                          {language === 'KR' ? '취소' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.newAddrSaveBtn}
                        onPress={handleAddNewKoreanAddress}
                      >
                        <Text style={styles.newAddrSaveText}>
                          {language === 'KR' ? '저장' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => { setIsLocationModalOpen(false); setIsAddAddressOpen(false); }}
              >
                <Text style={styles.closeModalBtnText}>
                  {language === 'KR' ? '확인' : 'DONE'}
                </Text>
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

const getStyles = (isDark: boolean) => {
  const bg = isDark ? '#121212' : '#F8F7F3';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const cardBgElevated = isDark ? '#262626' : '#F8F7F3';
  const textMain = isDark ? '#FFFFFF' : '#212121';
  const textSub = isDark ? '#A0A0A0' : '#8A857A';
  const border = isDark ? '#333333' : '#EFEBE4';
  const accent = isDark ? '#D4AF37' : '#C88D2B';
  const activeTint = isDark ? '#2D271E' : '#FFFBF3';
  const activeTintOrange = isDark ? '#2D271E' : '#FFF5E0';
  
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bg,
  },
  specialOffer: {
    backgroundColor: isDark ? activeTintOrange : '#FFEED4',
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? '#4D3B18' : '#FFD085',
  },
  specialSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specialTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: textMain,
    marginTop: 2,
  },
  specialText: {
    fontSize: 10,
    color: textSub,
    marginTop: 4,
    lineHeight: 14,
  },
  specialButton: {
    backgroundColor: isDark ? accent : '#212121',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  specialButtonText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  deliveryEmoji: {
    fontSize: 48,
    marginLeft: 10,
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
    color: textSub,
    letterSpacing: 1,
  },
  logo: {
    fontSize: 22,
    fontWeight: '900',
    color: textMain,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  logoGold: {
    color: accent,
  },
  tagline: {
    fontSize: 11,
    color: textSub,
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
    backgroundColor: cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  cartIcon: {
    fontSize: 18,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: cardBg,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cardBg,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: border,
  },
  langButtonFlag: {
    fontSize: 15,
    marginRight: 4,
  },
  langButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: textMain,
  },
  authHeaderBtn: {
    backgroundColor: isDark ? accent : '#212121',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  authHeaderBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: isDark ? '#121212' : '#FFFFFF',
    letterSpacing: 0.5,
  },
  locationCard: {
    marginHorizontal: 20,
    backgroundColor: cardBg,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  locationCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
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
    color: accent,
    letterSpacing: 0.5,
  },
  location: {
    fontSize: 13,
    fontWeight: '700',
    color: textMain,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: accent,
    fontWeight: '700',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: cardBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: border,
  },
  searchIcon: {
    fontSize: 16,
    color: textSub,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: textMain,
    padding: 0,
  },
  clearSearch: {
    fontSize: 14,
    color: textSub,
    padding: 4,
  },
  searchSuggestionsWrapper: {
    marginHorizontal: 20,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchSuggestionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: textSub,
    marginRight: 6,
  },
  searchSuggestionsScroll: {
    paddingRight: 10,
    gap: 6,
  },
  searchChip: {
    backgroundColor: cardBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border,
  },
  searchChipActive: {
    backgroundColor: activeTintOrange,
    borderColor: accent,
  },
  searchChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: textSub,
  },
  searchChipTextActive: {
    color: accent,
    fontWeight: '800',
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
    borderWidth: isDark ? 1 : 0,
    borderColor: '#3D3425',
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
    backgroundColor: accent,
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
  clothingAdBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#1E1B18',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#38322B',
  },
  adHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  adLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  adLiveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adPlayToggle: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adPlayToggleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  adMediaWrapper: {
    height: 165,
    position: 'relative',
  },
  adMediaImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  adGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.68)',
    padding: 12,
  },
  // ── Featured Highlights (2 Large Rounded Cards) ──
  featuredSectionContainer: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  featuredHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  featuredHeaderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: isDark ? '#F3F4F6' : '#1F2937',
    letterSpacing: -0.3,
  },
  arrowControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: isDark ? '#4B5563' : '#E5E7EB',
    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#E5E7EB' : '#374151',
    marginTop: -2,
  },
  featuredCardsGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  featuredHighlightCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 320 : 280,
    minHeight: 260,
    height: 270,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E1E1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: isDark ? 1 : 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featuredCardBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredCardGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    padding: 18,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
  countryPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 6,
  },
  countryPillFlag: {
    fontSize: 14,
  },
  countryPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardCenterContent: {
    marginVertical: 'auto',
  },
  tagBadgeOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    marginBottom: 8,
  },
  tagBadgeIcon: {
    fontSize: 11,
  },
  tagBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  cardMainTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  orangeActionBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  orangeActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  deliveryBadgePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  deliveryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  paginationDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotIndicatorActive: {
    width: 18,
    backgroundColor: '#D97706',
    borderRadius: 4,
  },
  adTagPill: {
    backgroundColor: accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  adTagPillText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  adMainTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  adSubtitle: {
    color: '#E0DDD5',
    fontSize: 10,
    marginTop: 2,
  },
  shopClothesActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  shopClothesButton: {
    backgroundColor: accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shopClothesBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  shopClothesBtnArrow: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  adTapHint: {
    color: '#D4CEBF',
    fontSize: 9,
    fontWeight: '600',
  },
  adProgressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  adProgressBarActive: {
    width: '70%',
    height: '100%',
    backgroundColor: accent,
  },
  flightRouteOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  flightOriginBadge: {
    backgroundColor: '#1E2D1E',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#81C784',
  },
  flightFlagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  flightTrackLineContainer: {
    flex: 1,
    marginHorizontal: 8,
    height: 18,
    justifyContent: 'center',
    position: 'relative',
  },
  flightTrackDottedLine: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    borderWidth: 1,
    borderColor: '#FFD54F',
    borderStyle: 'dashed',
  },
  airplaneContainer: {
    position: 'absolute',
    top: -2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  airplaneEmoji: {
    fontSize: 16,
  },
  flightDestBadgeGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  flightDestBadge: {
    backgroundColor: '#1E2838',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  benefitRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    gap: 10,
  },
  benefit: {
    flex: 1,
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: border,
  },
  benefitIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  benefitTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: textMain,
  },
  benefitText: {
    fontSize: 9,
    color: textSub,
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
    color: textMain,
    letterSpacing: 0.2,
  },
  fire: {
    fontSize: 14,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: textSub,
    marginTop: 2,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: accent,
  },
  categoryContainer: {
    paddingLeft: 20,
    paddingRight: 8,
    gap: 12,
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 16,
    padding: 12,
    width: 96,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: border,
  },
  categoryCardActive: {
    borderColor: accent,
    backgroundColor: activeTint,
  },
  categoryImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryImageActive: {
    backgroundColor: isDark ? '#3D3425' : '#F5EEDC',
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: textMain,
    textAlign: 'center',
  },
  categoryNameActive: {
    color: accent,
  },
  categoryCount: {
    fontSize: 8,
    color: textSub,
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
    backgroundColor: cardBg,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: border,
  },
  productImageContainer: {
    position: 'relative',
    height: 130,
    backgroundColor: cardBgElevated,
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
    backgroundColor: accent,
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
    backgroundColor: isDark ? '#2A2A2A' : 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: isDark ? 1 : 0,
    borderColor: '#444444',
  },
  originText: {
    fontSize: 9,
    fontWeight: '700',
    color: textMain,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? '#2A2A2A' : 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: '#444444',
  },
  heartButtonActive: {
    backgroundColor: isDark ? '#421C1C' : '#FFEBEE',
  },
  heart: {
    fontSize: 16,
    color: textSub,
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
    color: textMain,
    lineHeight: 16,
    minHeight: 32,
  },
  productSize: {
    fontSize: 9,
    color: textSub,
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
    color: textMain,
  },
  review: {
    fontSize: 9,
    color: textSub,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#2A2A2A' : '#F5F5F5',
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: accent,
  },
  oldPrice: {
    fontSize: 9,
    color: textSub,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  addButton: {
    backgroundColor: isDark ? accent : textMain,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  plus: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptySearch: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: cardBg,
    marginHorizontal: 20,
    borderRadius: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: border,
  },
  emptySearchIcon: {
    fontSize: 36,
  },
  emptySearchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: textMain,
    marginTop: 8,
  },
  emptySearchText: {
    fontSize: 11,
    color: textSub,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  resetBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
    borderRadius: 8,
  },
  resetBtnText: {
    color: accent,
    fontSize: 11,
    fontWeight: '800',
  },
  trustSection: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: cardBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: border,
  },
  trustTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: textMain,
    marginBottom: 12,
  },
  trustGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: isDark ? '#262626' : bg,
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
    color: textMain,
    textAlign: 'center',
  },
  trustItemText: {
    fontSize: 8,
    color: textSub,
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
    backgroundColor: cardBg,
    borderRadius: 22,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
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
    color: textMain,
  },
  closeText: {
    fontSize: 18,
    color: textSub,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    color: textSub,
    marginBottom: 14,
  },
  langOptionsList: {
    gap: 8,
    marginBottom: 16,
  },
  langOptionCard: {
    backgroundColor: isDark ? '#262626' : bg,
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
  langFlag: {
    fontSize: 24,
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
  closeModalBtn: {
    backgroundColor: isDark ? accent : textMain,
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

  // ── Change Address Pill ──
  changeAddressPill: {
    backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  changeAddressText: {
    fontSize: 10,
    fontWeight: '800',
    color: accent,
  },

  // ── Promo Cards (Clothes) ──
  promoCardClothes: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#23201C',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    position: 'relative' as const,
    borderWidth: isDark ? 1 : 0,
    borderColor: '#3D3425',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.4 : 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  promoCardInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    zIndex: 2,
  },
  promoTagPill: {
    backgroundColor: 'rgba(200, 141, 43, 0.25)',
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  promoTagText: {
    color: '#F0BA5A',
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  promoCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900' as const,
    lineHeight: 20,
  },
  promoCardDesc: {
    color: '#D4CEBF',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  promoCardButton: {
    marginTop: 12,
    backgroundColor: accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start' as const,
  },
  promoCardBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
  promoCardEmojiWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingLeft: 12,
  },
  promoCardEmoji: {
    fontSize: 42,
  },
  promoCardSubEmoji: {
    fontSize: 10,
    marginTop: 4,
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  promoDecoCircle1: {
    position: 'absolute' as const,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(200, 141, 43, 0.08)',
    top: -30,
    right: -20,
  },

  // ── Promo Cards (Perfumes) ──
  promoCardPerfumes: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: isDark ? '#1E1A16' : '#2C2319',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    position: 'relative' as const,
    borderWidth: 1,
    borderColor: isDark ? '#4D3B18' : '#3D3425',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.4 : 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  promoTagPillPerfume: {
    backgroundColor: 'rgba(180, 120, 60, 0.3)',
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  promoCardTitlePerfume: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800' as const,
    lineHeight: 19,
  },
  promoCardButtonPerfume: {
    marginTop: 12,
    backgroundColor: '#B47838',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start' as const,
  },
  promoDecoCircle2: {
    position: 'absolute' as const,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(180, 120, 56, 0.06)',
    bottom: -40,
    right: -30,
  },

  // ── Location Modal ──
  locationModalContent: {
    backgroundColor: cardBg,
    borderRadius: 22,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  emptyAddrCard: {
    alignItems: 'center' as const,
    paddingVertical: 24,
    backgroundColor: isDark ? '#262626' : bg,
    borderRadius: 14,
    marginBottom: 10,
  },
  emptyAddrIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyAddrText: {
    fontSize: 12,
    color: textSub,
    fontWeight: '600' as const,
  },
  addrOptionCard: {
    backgroundColor: isDark ? '#262626' : bg,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: border,
    marginBottom: 8,
  },
  addrOptionCardActive: {
    borderColor: accent,
    backgroundColor: activeTint,
  },
  addrOptionLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  addrOptionIcon: {
    fontSize: 18,
  },
  addrOptionTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: textMain,
  },
  addrOptionAddress: {
    fontSize: 10,
    color: textSub,
    marginTop: 2,
    lineHeight: 14,
  },
  addrOptionPhone: {
    fontSize: 10,
    color: textSub,
    marginTop: 2,
  },
  addNewAddrBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: accent,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center' as const,
    marginTop: 4,
    marginBottom: 12,
  },
  addNewAddrText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: accent,
  },

  // ── New Address Form ──
  newAddrForm: {
    backgroundColor: isDark ? '#262626' : bg,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: border,
  },
  newAddrFormTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: textMain,
    marginBottom: 10,
  },
  newAddrInput: {
    backgroundColor: cardBg,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    color: textMain,
    marginBottom: 8,
  },
  newAddrCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border,
    alignItems: 'center' as const,
  },
  newAddrCancelText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: textSub,
  },
  newAddrSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: isDark ? accent : textMain,
    alignItems: 'center' as const,
  },
  newAddrSaveText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
});
};