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
import { PERFUME_CATEGORIES } from '@/data/mockData';

export default function PerfumesScreen() {
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
  const [isPerfumeVideoPlaying, setIsPerfumeVideoPlaying] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Filter perfume products
  const perfumeProducts = products.filter((p) => {
    const isPerfume = p.category === 'Perfumes';
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
    if (selectedSubCat === 'attar') {
      matchesCategory = p.name.includes('Attar') || p.name.includes('Elixir') || (p.keywords?.KR?.includes('아타르') ?? false);
    } else if (selectedSubCat === 'oudh') {
      matchesCategory = p.name.includes('Oudh') || p.name.includes('Agarwood') || (p.keywords?.KR?.includes('오드') ?? false);
    } else if (selectedSubCat === 'himalayan') {
      matchesCategory = p.name.includes('Himalayan') || p.name.includes('Cedarwood') || p.name.includes('Incense');
    } else if (selectedSubCat === 'mist') {
      matchesCategory = p.name.includes('Mist') || p.name.includes('Blossom') || (p.keywords?.KR?.includes('미스트') ?? false);
    }

    return isPerfume && matchesSearch && matchesOrigin && matchesCategory;
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
            <Text style={styles.headerTitle}>Luxury Perfumes & Attars</Text>
            <Text style={styles.headerSubtitle}>
              100% Pure Indian, Nepali & Korean Fragrances
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
              title="Updating fragrances..."
              titleColor={isDarkMode ? '#A0A0A0' : '#8A857A'}
            />
          }
        >
          {/* LUXURY FRAGRANCE VIDEO REEL & SHOWCASE CARD */}
          <View style={styles.videoAdCard}>
            <View style={styles.videoAdHeader}>
              <View style={styles.liveAdBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveAdText}>ROYAL SCENTS • 2026 EDITION</Text>
              </View>
              <TouchableOpacity
                style={styles.videoControlBtn}
                onPress={() => setIsPerfumeVideoPlaying((v) => !v)}
              >
                <Text style={styles.videoControlText}>
                  {isPerfumeVideoPlaying ? '⏸ Reel' : '▶ Play'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.videoAdMediaContainer}>
              <Image
                source={{
                  uri: isPerfumeVideoPlaying
                    ? 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1000'
                    : 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=1000',
                }}
                style={styles.videoAdCover}
              />
              <View style={styles.videoGradientOverlay}>
                <View style={styles.adPromoTag}>
                  <Text style={styles.adPromoTagText}>100% ALCOHOL-FREE & NATURAL</Text>
                </View>
                <Text style={styles.videoAdTitle}>
                  Kannauj Rose Attar, Himalayan Musk & Royal Oudh
                </Text>
                <Text style={styles.videoAdSubtitle}>
                  24h+ Long Lasting • Secure Air Parcel Delivery to India & Nepal
                </Text>
              </View>

              {isPerfumeVideoPlaying && (
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
              placeholder="Search Attars, Oudh, Rose, Sandalwood, Mists..."
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
            {PERFUME_CATEGORIES.map((cat) => {
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

          {/* REGION SELECTOR */}
          <View style={styles.originSelectorRow}>
            {[
              { id: 'ALL', label: 'All Fragrances 🌍' },
              { id: 'India', label: '🇮🇳 Kannauj & Mysore Attar' },
              { id: 'Nepal', label: '🇳🇵 Himalayan Musk & Cedar' },
              { id: 'Korea', label: '🇰🇷 Seoul Luxury Mist' },
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

          {/* PERFUME COUNT BAR */}
          <View style={styles.countBar}>
            <Text style={styles.countText}>
              Showing <Text style={{ fontWeight: '800', color: '#212121' }}>{perfumeProducts.length}</Text> luxury fragrances
            </Text>
            <View style={styles.longevityBadge}>
              <Text style={styles.longevityText}>⏳ 24h Longevity Guarantee</Text>
            </View>
          </View>

          {/* PERFUME PRODUCTS GRID */}
          <View style={styles.productsGrid}>
            {perfumeProducts.map((product) => {
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
                      Volume: {product.size}
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
          {perfumeProducts.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 36 }}>✨</Text>
              <Text style={styles.emptyTitle}>No matching perfumes found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or region filters to see all available fragrances.
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
    backgroundColor: '#1E1B18',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    color: '#F0BA5A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoControlBtn: {
    backgroundColor: 'rgba(200, 141, 43, 0.3)',
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 14,
  },
  adPromoTag: {
    backgroundColor: '#C88D2B',
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
    width: '80%',
    height: '100%',
    backgroundColor: '#C88D2B',
  },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEBE4',
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    color: '#8A857A',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#212121',
    padding: 0,
  },
  categoryChipsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEBE4',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#212121',
    borderColor: '#212121',
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666155',
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
    backgroundColor: '#F8F7F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  originChipActive: {
    backgroundColor: '#FFF9ED',
    borderColor: '#C88D2B',
  },
  originChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A857A',
  },
  originChipTextActive: {
    color: '#C88D2B',
  },
  countBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countText: {
    fontSize: 11,
    color: '#8A857A',
  },
  longevityBadge: {
    backgroundColor: '#FFF9ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  longevityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C88D2B',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEBE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageWrapper: {
    height: 140,
    position: 'relative',
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  originBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#212121',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtnActive: {
    backgroundColor: '#FFEBEE',
  },
  heartIcon: {
    fontSize: 14,
    color: '#8A857A',
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
    color: '#212121',
    lineHeight: 15,
    minHeight: 30,
  },
  sizeInfo: {
    fontSize: 9,
    color: '#8A857A',
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
    color: '#212121',
  },
  reviewCount: {
    fontSize: 8,
    color: '#8A857A',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  priceCurrent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C88D2B',
  },
  priceOld: {
    fontSize: 9,
    color: '#8A857A',
    textDecorationLine: 'line-through',
  },
  addToCartBtn: {
    backgroundColor: '#212121',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#212121',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#8A857A',
    textAlign: 'center',
    marginTop: 4,
  },
  resetFiltersBtn: {
    backgroundColor: '#F5EEDC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  resetFiltersText: {
    color: '#C88D2B',
    fontSize: 11,
    fontWeight: '800',
  },
});
};
