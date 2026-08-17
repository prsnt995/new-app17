import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';

export default function WishlistScreen() {
  const router = useRouter();
  const {
    products,
    wishlist,
    toggleWishlist,
    addToCart,
    formatPrice,
    t,
    isDarkMode,
  } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));
  const suggestedProducts = products.filter((p) => !wishlist.includes(p.id)).slice(0, 4);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleMoveAllToCart = () => {
    if (wishlistProducts.length === 0) return;
    wishlistProducts.forEach((p) => addToCart(p.id));
    Alert.alert(
      'Added to Cart',
      `All ${wishlistProducts.length} items have been added to your cart!`,
      [
        { text: 'Go to Cart', onPress: () => router.push('/cart') },
        { text: 'Stay on Wishlist', style: 'cancel' },
      ]
    );
  };

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
            <Text style={styles.headerTitle}>{t('wishlistTitle')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('wishlistSubtitle')}
            </Text>
          </View>

          {wishlistProducts.length > 0 && (
            <TouchableOpacity
              style={styles.moveAllBtn}
              onPress={handleMoveAllToCart}
            >
              <Text style={styles.moveAllText}>{t('addAllToCart')}</Text>
            </TouchableOpacity>
          )}
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
              title="Updating wishlist..."
              titleColor="#8A857A"
            />
          }
        >
          {wishlistProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>♥</Text>
              <Text style={styles.emptyTitle}>{t('emptyWishlist')}</Text>
              <Text style={styles.emptySubtitle}>
                Save your favorite Indian and Nepali groceries, sweets, and snacks here for quick re-ordering.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.exploreBtnText}>{t('exploreProducts')} →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              {wishlistProducts.map((product) => (
                <View key={product.id} style={styles.card}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: product.image }}
                      style={styles.productImage}
                    />

                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{product.discount}</Text>
                    </View>

                    <View style={styles.originBadge}>
                      <Text style={styles.originText}>
                        {product.origin === 'Nepal' ? '🇳🇵 Nepal' : '🇮🇳 India'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => toggleWishlist(product.id)}
                    >
                      <Text style={styles.heartActive}>♥</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>

                    <Text style={styles.productSize}>
                      {product.size} • {product.weightKg} kg
                    </Text>

                    <View style={styles.ratingRow}>
                      <Text style={styles.star}>★</Text>
                      <Text style={styles.rating}>{product.rating}</Text>
                      <Text style={styles.reviews}>({product.reviews})</Text>
                    </View>

                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.price}>{formatPrice(product.priceKRW)}</Text>
                        <Text style={styles.oldPrice}>{formatPrice(product.oldPriceKRW)}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.addBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          addToCart(product.id);
                          Alert.alert('Added to Cart', `${product.name} added to your cart.`);
                        }}
                      >
                        <Text style={styles.addBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* SUGGESTED ITEMS SECTION */}
          {suggestedProducts.length > 0 && (
            <View style={styles.suggestionsSection}>
              <View style={styles.suggestionsHeader}>
                <Text style={styles.suggestionsTitle}>You May Also Like</Text>
                <TouchableOpacity onPress={() => router.replace('/')}>
                  <Text style={styles.seeAllText}>See All →</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.suggestedList}>
                {suggestedProducts.map((p) => (
                  <View key={p.id} style={styles.suggestedCard}>
                    <Image source={{ uri: p.image }} style={styles.suggestedImg} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.suggestedName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.suggestedPrice}>
                        {formatPrice(p.priceKRW)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.suggestedAddBtn}
                      onPress={() => addToCart(p.id)}
                    >
                      <Text style={styles.suggestedAddText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* BOTTOM NAV */}
        <BottomNav currentTab="wishlist" />
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
  const borderLight = isDark ? '#262626' : '#F5F5F5';

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
    fontSize: 17,
    fontWeight: '800',
    color: textMain,
  },
  headerSubtitle: {
    fontSize: 11,
    color: textSub,
    marginTop: 2,
  },
  moveAllBtn: {
    backgroundColor: accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moveAllText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: cardBg,
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: isDark ? 1 : 0,
    borderColor: border,
  },
  emptyIcon: {
    fontSize: 54,
    color: '#E53935',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: textMain,
  },
  emptySubtitle: {
    fontSize: 12,
    color: textSub,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreBtn: {
    backgroundColor: isDark ? accent : '#212121',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreBtnText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.04,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: border,
  },
  imageContainer: {
    height: 135,
    width: '100%',
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
  discountText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  originBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  originText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: isDark ? '#3E1F1F' : '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartActive: {
    fontSize: 16,
    color: '#E53935',
  },
  cardBody: {
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
    fontSize: 10,
    color: textSub,
    marginTop: 4,
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
    fontSize: 11,
    fontWeight: '700',
    color: textMain,
  },
  reviews: {
    fontSize: 10,
    color: textSub,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontSize: 13,
    fontWeight: '900',
    color: accent,
  },
  oldPrice: {
    fontSize: 9,
    color: textSub,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    backgroundColor: isDark ? accent : '#212121',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addBtnText: {
    color: isDark ? '#121212' : '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  suggestionsSection: {
    marginTop: 24,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: textMain,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: accent,
  },
  suggestedList: {
    gap: 10,
  },
  suggestedCard: {
    backgroundColor: cardBg,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: border,
  },
  suggestedImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: cardBgElevated,
  },
  suggestedName: {
    fontSize: 12,
    fontWeight: '700',
    color: textMain,
  },
  suggestedPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: accent,
    marginTop: 2,
  },
  suggestedAddBtn: {
    backgroundColor: isDark ? '#2D271E' : '#F5EEDC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  suggestedAddText: {
    color: accent,
    fontSize: 11,
    fontWeight: '800',
  },
});
};
