import React, { useCallback, useState } from 'react';
import {
  Image,
  RefreshControl,
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
import { CLOTHING_CATEGORIES } from '@/data/mockData';

export default function ClothesScreen() {
  const router = useRouter();
  const {
    products,
    cartCount,
    wishlist,
    addToCart,
    toggleWishlist,
    formatPrice,
    isDarkMode,
  } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const [selectedSubCat, setSelectedSubCat] = useState('all');
  const [selectedOrigin, setSelectedOrigin] = useState<'ALL' | 'India' | 'Nepal' | 'Korea'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Filter only clothing products
  const clothingProducts = products.filter((p) => {
    const isCloth = p.category === 'Clothes';
    const q = searchQuery.trim().toLowerCase();

    const matchesBasic =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);

    const matchesKeywords =
      !q ||
      (p.keywords?.KR && p.keywords.KR.some((k) => k.toLowerCase().includes(q))) ||
      (p.keywords?.HI && p.keywords.HI.some((k) => k.toLowerCase().includes(q))) ||
      (p.keywords?.NE && p.keywords.NE.some((k) => k.toLowerCase().includes(q))) ||
      (p.keywords?.EN && p.keywords.EN.some((k) => k.toLowerCase().includes(q)));

    const matchesSearch = matchesBasic || matchesKeywords;
    const matchesOrigin = selectedOrigin === 'ALL' || p.origin === selectedOrigin;

    let matchesCategory = true;
    if (selectedSubCat === 'women') {
      matchesCategory = p.name.includes('Saree') || p.name.includes('Kurti') || (p.keywords?.KR?.includes('사리') ?? false);
    } else if (selectedSubCat === 'men') {
      matchesCategory = p.name.includes('Kurta') || p.name.includes('Shirt') || (p.keywords?.KR?.includes('쿠르타') ?? false);
    } else if (selectedSubCat === 'winter') {
      matchesCategory = p.name.includes('Jacket') || p.name.includes('Parka') || (p.keywords?.KR?.includes('패딩') ?? false);
    } else if (selectedSubCat === 'shawls') {
      matchesCategory = p.name.includes('Shawl') || p.name.includes('Topi') || p.name.includes('Cardigan');
    }

    return isCloth && matchesSearch && matchesOrigin && matchesCategory;
  });

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#121212' : '#F8F7F3'}
      />
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
            <Text style={styles.headerTitle}>Fashion & Apparel Store</Text>
            <Text style={styles.headerSubtitle}>
              Authentic Indian, Nepali & Korean Clothing
            </Text>
          </View>


        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#C88D2B']}
              tintColor="#C88D2B"
              title="Updating fashion catalog..."
              titleColor={isDarkMode ? '#A0A0A0' : '#8A857A'}
            />
          }
        >
          {/* RUNNING CLOTHING VIDEO AD & SHOWCASE REEL */}
          <View style={styles.videoAdCard}>
            <View style={styles.videoAdHeader}>
              <View style={styles.liveAdBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveAdText}>FASHION REEL • LIVE 2026</Text>
              </View>
              <TouchableOpacity
                style={styles.videoControlBtn}
                onPress={() => setIsVideoPlaying((v) => !v)}
              >
                <Text style={styles.videoControlText}>
                  {isVideoPlaying ? '⏸ Pause' : '▶ Play Reel'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.videoAdMediaContainer}>
              <Image
                source={{
                  uri: isVideoPlaying
                    ? 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000'
                    : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1000',
                }}
                style={styles.videoAdCover}
              />
              <View style={styles.videoGradientOverlay}>
                <View style={styles.adPromoTag}>
                  <Text style={styles.adPromoTagText}>NEW FESTIVE & WINTER DROP</Text>
                </View>
                <Text style={styles.videoAdTitle}>
                  Royal Silk Sarees, Dhaka Shawls & Korean Down Parkas
                </Text>
                <Text style={styles.videoAdSubtitle}>
                  Direct Air Freight to India & Nepal • Standard Courier Rate ₩15,000/kg
                </Text>
              </View>

              {isVideoPlaying && (
                <View style={styles.videoProgressBar}>
                  <View style={styles.videoProgressFill} />
                </View>
              )}
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Sarees, Kurtas, Jackets, Shawls..."
              placeholderTextColor="#A2A2A2"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={{ fontSize: 14, color: '#8A857A' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CATEGORY CHIPS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsContainer}
          >
            {CLOTHING_CATEGORIES.map((cat) => {
              const isSelected = selectedSubCat === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedSubCat(cat.id)}
                >
                  <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ORIGIN REGION SELECTOR */}
          <View style={styles.originSelectorRow}>
            {[
              { id: 'ALL', label: 'All Regions 🌍' },
              { id: 'India', label: '🇮🇳 India Handloom' },
              { id: 'Nepal', label: '🇳🇵 Nepal Handwoven' },
              { id: 'Korea', label: '🇰🇷 Korea Thermal' },
            ].map((orig) => {
              const isSelected = selectedOrigin === orig.id;
              return (
                <TouchableOpacity
                  key={orig.id}
                  style={[
                    styles.originChip,
                    isSelected && styles.originChipActive,
                  ]}
                  onPress={() => setSelectedOrigin(orig.id as any)}
                >
                  <Text
                    style={[
                      styles.originChipText,
                      isSelected && styles.originChipTextActive,
                    ]}
                  >
                    {orig.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* PRODUCTS COUNT BAR */}
          <View style={styles.countBar}>
            <Text style={styles.countText}>
              Showing <Text style={{ fontWeight: '800', color: '#212121' }}>{clothingProducts.length}</Text> premium apparel items
            </Text>
            <TouchableOpacity
              style={styles.parcelRateInfo}
              onPress={() => router.push('/send-parcel')}
            >
              <Text style={styles.parcelRateText}>✈️ Parcel: ₩15,000/kg</Text>
            </TouchableOpacity>
          </View>

          {/* CLOTHING PRODUCTS GRID */}
          <View style={styles.productsGrid}>
            {clothingProducts.map((product) => {
              const isFav = wishlist.includes(product.id);
              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productImageWrapper}>
                    <Image
                      source={{ uri: product.image }}
                      style={styles.productImage}
                    />

                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        {product.discount}
                      </Text>
                    </View>

                    <View style={styles.originBadge}>
                      <Text style={styles.originBadgeText}>
                        {product.origin === 'Korea'
                          ? '🇰🇷 Korea'
                          : product.origin === 'Nepal'
                          ? '🇳🇵 Nepal'
                          : '🇮🇳 India'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.heartBtn,
                        isFav && styles.heartBtnActive,
                      ]}
                      onPress={() => toggleWishlist(product.id)}
                    >
                      <Text style={[styles.heartIcon, isFav && styles.heartIconActive]}>
                        {isFav ? '♥' : '♡'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>

                    <Text style={styles.sizeInfo}>
                      Size: {product.size || `${product.weightKg} kg`} • {product.weightKg < 1 ? `${Math.round(product.weightKg*1000)} g` : `${product.weightKg} kg`}
                    </Text>

                    <View style={styles.ratingRow}>
                      <Text style={{ color: '#FFA000', fontSize: 11 }}>★</Text>
                      <Text style={styles.ratingScore}>{product.rating}</Text>
                      <Text style={styles.reviewCount}>({product.reviews})</Text>
                    </View>

                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.priceCurrent}>
                          {formatPrice(product.priceKRW)}
                        </Text>
                        <Text style={styles.priceOld}>
                          {formatPrice(product.oldPriceKRW)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.addToCartBtn}
                        activeOpacity={0.85}
                        onPress={() => addToCart(product.id)}
                      >
                        <Text style={styles.addToCartText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* EMPTY STATE */}
          {clothingProducts.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 36 }}>👗</Text>
              <Text style={styles.emptyTitle}>No matching apparel found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or region filters to see all available clothes.
              </Text>
              <TouchableOpacity
                style={styles.resetFiltersBtn}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedSubCat('all');
                  setSelectedOrigin('ALL');
                }}
              >
                <Text style={styles.resetFiltersText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* BOTTOM NAV */}
        <BottomNav />
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
    fontSize: 16,
    fontWeight: '800',
    color: textMain,
  },
  headerSubtitle: {
    fontSize: 10,
    color: textSub,
    marginTop: 2,
  },
  cartButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: accent,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: cardBg,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  videoAdCard: {
    backgroundColor: '#212121',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#38322B',
  },
  videoAdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  liveAdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  liveAdText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoControlBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  videoControlText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  videoAdMediaContainer: {
    height: 180,
    position: 'relative',
  },
  videoAdCover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 14,
  },
  adPromoTag: {
    backgroundColor: accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  adPromoTagText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  videoAdTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  videoAdSubtitle: {
    color: '#D4CEBF',
    fontSize: 10,
    marginTop: 2,
  },
  videoProgressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  videoProgressFill: {
    width: '65%',
    height: '100%',
    backgroundColor: accent,
  },
  searchBox: {
    backgroundColor: cardBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: border,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    color: textSub,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: textMain,
    padding: 0,
  },
  categoryChipsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cardBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: accent,
    borderColor: accent,
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: textSub,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  originSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  originChip: {
    backgroundColor: isDark ? '#262626' : '#F8F7F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border,
  },
  originChipActive: {
    backgroundColor: activeTint,
    borderColor: accent,
  },
  originChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: textSub,
  },
  originChipTextActive: {
    color: accent,
  },
  countBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countText: {
    fontSize: 11,
    color: textSub,
  },
  parcelRateInfo: {
    backgroundColor: activeTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  parcelRateText: {
    fontSize: 9,
    fontWeight: '800',
    color: accent,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageWrapper: {
    height: 140,
    position: 'relative',
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
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  originBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: isDark ? '#2A2A2A' : 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: isDark ? 1 : 0,
    borderColor: '#444444',
  },
  originBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: textMain,
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: isDark ? '#2A2A2A' : 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isDark ? 1 : 0,
    borderColor: '#444444',
  },
  heartBtnActive: {
    backgroundColor: isDark ? '#421C1C' : '#FFEBEE',
  },
  heartIcon: {
    fontSize: 14,
    color: textSub,
  },
  heartIconActive: {
    color: '#E53935',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 11,
    fontWeight: '700',
    color: textMain,
    lineHeight: 15,
    minHeight: 30,
  },
  sizeInfo: {
    fontSize: 9,
    color: textSub,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  ratingScore: {
    fontSize: 10,
    fontWeight: '700',
    color: textMain,
  },
  reviewCount: {
    fontSize: 8,
    color: textSub,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#2A2A2A' : '#F5F5F5',
  },
  priceCurrent: {
    fontSize: 12,
    fontWeight: '800',
    color: accent,
  },
  priceOld: {
    fontSize: 9,
    color: textSub,
    textDecorationLine: 'line-through',
  },
  addToCartBtn: {
    backgroundColor: isDark ? accent : '#212121',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addToCartText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: border,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: textMain,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: textSub,
    textAlign: 'center',
    marginTop: 4,
  },
  resetFiltersBtn: {
    backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  resetFiltersText: {
    color: accent,
    fontSize: 11,
    fontWeight: '800',
  },
});
};
