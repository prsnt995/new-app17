import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { subscribeToProductReviews } from '@/services/firestore';
import { Review } from '@/types';

const GREEN = '#3B82F6';
const GOLD = '#D97706';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, addToCart, toggleWishlist, isInWishlist, formatPrice, isDarkMode } = useApp();
  const { width } = useWindowDimensions();
  const S = React.useMemo(() => getStyles(isDarkMode, width), [isDarkMode, width]);

  const isDesktop = width > 768;
  const product = products.find((p) => p.id === id);
  const otherProducts = products.filter((p) => p.id !== id && !p.isHidden);
  const itemCardWidth: any = isDesktop ? '23.5%' : '48%';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFav, setIsFav] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsFav(isInWishlist(id));
    setSelectedImageIndex(0);
    setQuantity(1);
    const unsub = subscribeToProductReviews(id, setReviews);
    return () => unsub();
  }, [id]);

  if (!product) {
    return (
      <SafeAreaView style={S.container}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 48 }}>😕</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: isDarkMode ? '#FFF' : '#111' }}>Product not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: GREEN, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>← Go Back</Text>
          </TouchableOpacity>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  const isOutOfStock = (product.stock !== undefined && product.stock <= 0) || product.available === false;
  const isLowStock = !isOutOfStock && (product.stock ?? 100) > 0 && (product.stock ?? 100) <= 10;
  const hasDiscount = (product.discountPercent ?? 0) > 0;
  const currentPrice = product.finalPrice ?? product.priceKRW;
  const originalPrice = product.oldPriceKRW ?? product.priceKRW;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : product.rating ?? 0;

  const allImages: string[] = [];
  if (product.images && product.images.length > 0) {
    allImages.push(...product.images);
  } else if (product.image) {
    allImages.push(product.image);
  }
  const mainImage = allImages[selectedImageIndex] ?? product.image;
  const descIsLong = (product.description ?? '').length > 200;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) addToCart(product.id, 1);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) addToCart(product.id, 1);
    router.push('/cart');
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
    setIsFav(!isFav);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: product.name,
        message: `Check out ${product.name} on Namaste Mart!`,
      });
    } catch (_) {}
  };

  const renderStars = (rating: number, size = 14) => (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={{ fontSize: size, color: s <= Math.round(rating) ? '#FBBF24' : '#D1D5DB' }}>★</Text>
      ))}
    </View>
  );

  const InfoPanel = () => (
    <View style={S.infoPanel}>
      {product.isBestSeller && !isOutOfStock && (
        <View style={S.badge}>
          <Text style={S.badgeText}>🔥 BEST SELLER</Text>
        </View>
      )}
      {!product.isBestSeller && hasDiscount && !isOutOfStock && (
        <View style={[S.badge, { backgroundColor: '#EF4444' }]}>
          <Text style={S.badgeText}>🏷 SALE</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        <View style={S.catChip}><Text style={S.catChipText}>{product.category}</Text></View>
        {product.origin ? (
          <Text style={S.subText}>{product.origin === 'Nepal' ? '🇳🇵' : '🇮🇳'} {product.origin}</Text>
        ) : null}
      </View>

      <Text style={S.title}>{product.name}</Text>
      {product.brand ? <Text style={S.brandText}>by {product.brand}</Text> : null}

      <View style={S.ratingRow}>
        {renderStars(avgRating, 15)}
        <Text style={S.ratingNum}>{avgRating.toFixed(1)}</Text>
        <Text style={S.subText}>· {reviews.length || product.reviews || 0} reviews</Text>
      </View>

      <View style={S.priceBlock}>
        {hasDiscount && (
          <View style={S.discountPill}>
            <Text style={S.discountPillText}>{product.discount || `${product.discountPercent}% OFF`}</Text>
          </View>
        )}
        <Text style={S.currentPrice}>{formatPrice(currentPrice)}</Text>
        {hasDiscount && originalPrice > 0 && (
          <Text style={S.oldPrice}>{formatPrice(originalPrice)}</Text>
        )}
      </View>

      <View style={S.actionRow}>
        <TouchableOpacity style={[S.actionBtn, isFav && S.actionBtnActive]} onPress={handleToggleWishlist} activeOpacity={0.8}>
          <Text style={{ fontSize: 16 }}>{isFav ? '❤️' : '🤍'}</Text>
          <Text style={[S.actionBtnText, isFav && { color: '#EF4444' }]}>{isFav ? 'Saved' : 'Wishlist'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.actionBtn} onPress={handleShare} activeOpacity={0.8}>
          <Text style={{ fontSize: 16 }}>↗</Text>
          <Text style={S.actionBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={S.divider} />

      <Text style={S.descLabel}>About this Product</Text>
      <Text style={S.desc} numberOfLines={showFullDesc ? undefined : 4}>
        {product.description}
      </Text>
      {descIsLong && (
        <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)}>
          <Text style={S.readMore}>{showFullDesc ? 'Show Less ▲' : 'Read More ▼'}</Text>
        </TouchableOpacity>
      )}

      {product.tags && product.tags.length > 0 && (
        <View style={S.tagsRow}>
          {product.tags.map((tag) => (
            <View key={tag} style={S.tag}><Text style={S.tagText}>#{tag}</Text></View>
          ))}
        </View>
      )}

      <View style={S.divider} />

      {product.size ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <Text style={S.labelText}>Pack Size:</Text>
          <View style={S.sizeChip}><Text style={S.sizeChipText}>{product.size}</Text></View>
          {product.weightKg ? (
            <View style={S.sizeChip}><Text style={S.sizeChipText}>{product.weightKg} kg</Text></View>
          ) : null}
        </View>
      ) : null}

      {!isOutOfStock && (
        <View style={S.qtyRow}>
          <Text style={S.labelText}>Quantity</Text>
          <View style={S.qtyControl}>
            <TouchableOpacity style={S.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))} activeOpacity={0.7}>
              <Text style={S.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={S.qtyValue}>{quantity}</Text>
            <TouchableOpacity style={S.qtyBtn} onPress={() => setQuantity(Math.min(product.stock ?? 99, quantity + 1))} activeOpacity={0.7}>
              <Text style={S.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isOutOfStock ? (
        <View style={S.stockBadgeOut}>
          <Text style={S.stockBadgeOutText}>❌ Out of Stock</Text>
        </View>
      ) : isLowStock ? (
        <Text style={S.lowStockText}>⚠️ Only {product.stock} left in stock — order soon!</Text>
      ) : (
        <Text style={S.inStockText}>✓ In Stock · Ready to ship</Text>
      )}

      <View style={S.ctaRow}>
        <TouchableOpacity
          style={[S.addCartBtn, isOutOfStock && S.btnDisabled, addedToCart && S.addCartBtnSuccess]}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          activeOpacity={0.85}
        >
          <Text style={S.ctaBtnText}>
            {isOutOfStock ? '❌ Out of Stock' : addedToCart ? '✅ Added to Cart!' : '🛒 Add to Cart'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.buyNowBtn, isOutOfStock && S.btnDisabled]}
          onPress={handleBuyNow}
          disabled={isOutOfStock}
          activeOpacity={0.85}
        >
          <Text style={S.buyNowBtnText}>Buy Now →</Text>
        </TouchableOpacity>
      </View>

      <View style={S.divider} />

      <View style={S.deliveryBox}>
        <View style={S.deliveryRow}>
          <Text style={{ fontSize: 18 }}>🚚</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={S.deliveryTitle}>Fast Delivery</Text>
            <Text style={S.deliverySub}>Delivery across South Korea · 3–7 business days</Text>
          </View>
        </View>

      </View>
    </View>
  );

  return (
    <SafeAreaView style={S.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={S.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.7}>
          <Text style={S.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={S.navTitle} numberOfLines={1}>{product.name}</Text>
        <TouchableOpacity onPress={handleToggleWishlist} style={S.navWish} activeOpacity={0.7}>
          <Text style={{ fontSize: 22 }}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>

        <View style={S.breadcrumb}>
          <TouchableOpacity onPress={() => router.push('/')}><Text style={S.breadcrumbLink}>Home</Text></TouchableOpacity>
          <Text style={S.breadcrumbSep}> › </Text>
          <TouchableOpacity onPress={() => router.push('/')}><Text style={S.breadcrumbLink}>Products</Text></TouchableOpacity>
          <Text style={S.breadcrumbSep}> › </Text>
          <TouchableOpacity onPress={() => router.push('/')}><Text style={S.breadcrumbLink}>{product.category}</Text></TouchableOpacity>
          <Text style={S.breadcrumbSep}> › </Text>
          <Text style={S.breadcrumbCurrent} numberOfLines={1}>{product.name}</Text>
        </View>

        {isDesktop ? (
          <View style={S.desktopRow}>
            <View style={S.imagePanel}>
              <View style={S.mainImageBox}>
                <Image source={{ uri: mainImage }} style={S.mainImage} resizeMode="contain" />
                {isOutOfStock && (
                  <View style={S.outOverlay}>
                    <Text style={S.outOverlayText}>OUT OF STOCK</Text>
                  </View>
                )}
              </View>
              {allImages.length > 1 && (
                <View style={S.thumbnailRow}>
                  {allImages.map((img, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedImageIndex(idx)}
                      style={[S.thumbnail, idx === selectedImageIndex && S.thumbnailActive]}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: img }} style={S.thumbnailImg} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={S.rightCol}>
              <InfoPanel />
            </View>
          </View>
        ) : (
          <View>
            <View style={S.mainImageBoxMobile}>
              <Image source={{ uri: mainImage }} style={S.mainImageMobile} resizeMode="contain" />
              {isOutOfStock && (
                <View style={S.outOverlay}>
                  <Text style={S.outOverlayText}>OUT OF STOCK</Text>
                </View>
              )}
            </View>
            {allImages.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.thumbScrollMobile} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                {allImages.map((img, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedImageIndex(idx)}
                    style={[S.thumbnail, idx === selectedImageIndex && S.thumbnailActive]}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: img }} style={S.thumbnailImg} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <View style={{ paddingHorizontal: 16 }}>
              <InfoPanel />
            </View>
          </View>
        )}

        <View style={S.trustStrip}>
          {[
            { icon: '🚚', title: 'Fast Delivery', sub: 'Across South Korea', url: '' },
            { icon: '🔒', title: 'Secure Payment', sub: '100% Safe Checkout', url: '' },
          ].map((item) => (
            <TouchableOpacity
              key={item.title}
              style={S.trustItem}
              activeOpacity={item.url ? 0.7 : 1}
              onPress={item.url ? async () => { try { await Linking.openURL(item.url); } catch (_) {} } : undefined}
            >
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              <Text style={S.trustTitle}>{item.title}</Text>
              <Text style={S.trustSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>⭐ Reviews ({reviews.length})</Text>
          {reviews.length === 0 ? (
            <View style={S.noReviews}>
              <Text style={S.noReviewsText}>No reviews yet for this product.</Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={S.reviewCard}>
                <View style={S.reviewHeader}>
                  <Image
                    source={{ uri: review.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }}
                    style={S.reviewAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={S.reviewName}>{review.userName}</Text>
                      {review.isVerifiedPurchase && (
                        <View style={S.verifiedBadge}><Text style={S.verifiedBadgeText}>✅ Verified</Text></View>
                      )}
                    </View>
                    {renderStars(review.rating, 12)}
                  </View>
                  <Text style={S.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={S.reviewText}>{review.text}</Text>
                {review.photoUrl && (
                  <Image source={{ uri: review.photoUrl }} style={S.reviewPhoto} resizeMode="cover" />
                )}
              </View>
            ))
          )}
        </View>

        {otherProducts.length > 0 && (
          <View style={S.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <View>
                <Text style={S.sectionTitle}>You May Also Like 🛍️</Text>
                <Text style={S.sectionSub}>Discover other authentic items from Namaste Mart</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/')}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: GREEN }}>View All →</Text>
              </TouchableOpacity>
            </View>
            <View style={S.recGrid}>
              {otherProducts.map((p) => {
                const pFav = isInWishlist(p.id);
                const pOut = (p.stock !== undefined && p.stock <= 0) || p.available === false;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[S.recCard, { width: itemCardWidth }]}
                    activeOpacity={0.88}
                    onPress={() => router.push({ pathname: '/product-detail', params: { id: p.id } })}
                  >
                    <View style={S.recImgBox}>
                      <Image source={{ uri: p.image }} style={S.recImg} resizeMode="cover" />
                      {pOut && (
                        <View style={S.recStockOverlay}><Text style={S.recStockText}>OUT OF STOCK</Text></View>
                      )}
                      {(p.discountPercent ?? 0) > 0 && !pOut && (
                        <View style={S.recDiscBadge}><Text style={S.recDiscText}>{p.discount || `${p.discountPercent}% OFF`}</Text></View>
                      )}
                      <TouchableOpacity
                        style={S.recWishBtn}
                        onPress={(e) => { e.stopPropagation(); toggleWishlist(p.id); }}
                      >
                        <Text style={{ fontSize: 12 }}>{pFav ? '❤️' : '🤍'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={S.recBody}>
                      <Text style={S.recCat} numberOfLines={1}>{p.category}</Text>
                      <Text style={S.recName} numberOfLines={2}>{p.name}</Text>
                      <Text style={S.recSize}>{p.size}</Text>
                      <View style={S.recPriceRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={S.recPrice}>{formatPrice(p.finalPrice ?? p.priceKRW)}</Text>
                          {(p.discountPercent ?? 0) > 0 && (
                            <Text style={S.recOldPrice}>{formatPrice(p.oldPriceKRW || p.priceKRW)}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[S.recAddBtn, pOut && { opacity: 0.45 }]}
                          disabled={pOut}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (!pOut) {
                              addToCart(p.id, 1);
                              Alert.alert('🛒 Added!', `${p.name} added to cart.`);
                            }
                          }}
                        >
                          <Text style={S.recAddBtnText}>+ Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={S.viewAllBtn} onPress={() => router.push('/')} activeOpacity={0.85}>
              <Text style={S.viewAllBtnText}>🛍️ View All Products →</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean, screenWidth: number) => {
  const isDesktop = screenWidth > 768;
  const bg = isDark ? '#0A0A0F' : '#F5FFF7';
  const cardBg = isDark ? '#141A14' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#0A1A0A';
  const textSub = isDark ? '#8A9A8A' : '#4A6A4A';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,128,0,0.1)';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    scroll: { flexGrow: 1 },
    navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: isDark ? '#0A0A0F' : '#FFFFFF' },
    backBtn: { paddingRight: 12, paddingVertical: 4 },
    backBtnText: { fontSize: 14, fontWeight: '800', color: GREEN },
    navTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: textMain, textAlign: 'center' },
    navWish: { paddingLeft: 12 },
    breadcrumb: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: isDark ? '#111' : '#F0FFF4' },
    breadcrumbLink: { fontSize: 12, color: GREEN, fontWeight: '700' },
    breadcrumbSep: { fontSize: 12, color: textSub },
    breadcrumbCurrent: { fontSize: 12, color: textSub, fontWeight: '600', maxWidth: 180 },
    desktopRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 24, gap: 32 },
    imagePanel: { width: isDesktop ? '45%' : '100%' },
    mainImageBox: { width: '100%', aspectRatio: 1, backgroundColor: isDark ? '#1A1A2A' : '#FFFFFF', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: border, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    mainImage: { width: '100%', height: '100%' },
    mainImageBoxMobile: { width: '100%', height: 320, backgroundColor: isDark ? '#1A1A2A' : '#FFFFFF', position: 'relative' },
    mainImageMobile: { width: '100%', height: '100%' },
    outOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    outOverlayText: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 3 },
    thumbnailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    thumbScrollMobile: { marginTop: 10 },
    thumbnail: { width: 64, height: 64, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: border },
    thumbnailActive: { borderColor: GREEN, borderWidth: 2.5 },
    thumbnailImg: { width: '100%', height: '100%' },
    rightCol: { flex: 1, minWidth: 0 },
    infoPanel: { paddingBottom: 8 },
    badge: { alignSelf: 'flex-start', backgroundColor: '#FBBF24', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10 },
    badgeText: { fontSize: 11, fontWeight: '900', color: '#1A1A1A', letterSpacing: 0.5 },
    catChip: { backgroundColor: GREEN + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
    catChipText: { fontSize: 11, fontWeight: '800', color: GREEN },
    subText: { fontSize: 12, color: textSub },
    title: { fontSize: isDesktop ? 26 : 22, fontWeight: '900', color: textMain, marginTop: 8, marginBottom: 4, lineHeight: isDesktop ? 34 : 28 },
    brandText: { fontSize: 13, color: textSub, marginBottom: 8, fontStyle: 'italic' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
    ratingNum: { fontSize: 14, fontWeight: '900', color: '#FBBF24' },
    priceBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
    discountPill: { backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    discountPillText: { fontSize: 12, fontWeight: '900', color: '#FFF' },
    currentPrice: { fontSize: isDesktop ? 32 : 28, fontWeight: '900', color: textMain },
    oldPrice: { fontSize: 16, color: textSub, textDecorationLine: 'line-through' },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: cardBg },
    actionBtnActive: { borderColor: '#EF4444' },
    actionBtnText: { fontSize: 13, fontWeight: '800', color: textSub },
    divider: { height: 1, backgroundColor: border, marginVertical: 16 },
    descLabel: { fontSize: 13, fontWeight: '800', color: textSub, textTransform: 'uppercase', marginBottom: 6 },
    desc: { fontSize: 14, color: textSub, lineHeight: 22 },
    readMore: { fontSize: 13, fontWeight: '800', color: GREEN, marginTop: 6 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    tag: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
    tagText: { fontSize: 11, color: textSub },
    labelText: { fontSize: 13, fontWeight: '800', color: textMain },
    sizeChip: { borderWidth: 1, borderColor: border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: cardBg },
    sizeChipText: { fontSize: 12, fontWeight: '700', color: textMain },
    qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: border, marginBottom: 12 },
    qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GREEN + '20', justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { fontSize: 22, fontWeight: '900', color: GREEN, lineHeight: 28 },
    qtyValue: { fontSize: 18, fontWeight: '900', color: textMain, minWidth: 28, textAlign: 'center' },
    stockBadgeOut: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 12 },
    stockBadgeOutText: { fontSize: 13, fontWeight: '800', color: '#EF4444' },
    lowStockText: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 12 },
    inStockText: { fontSize: 13, fontWeight: '700', color: GREEN, marginBottom: 12 },
    ctaRow: { gap: 10, marginBottom: 16 },
    addCartBtn: { backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    addCartBtnSuccess: { backgroundColor: '#059669' },
    buyNowBtn: { backgroundColor: GOLD, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: GOLD, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    btnDisabled: { backgroundColor: '#6B7280', shadowOpacity: 0 },
    ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    buyNowBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    deliveryBox: { backgroundColor: isDark ? '#0D1A14' : '#F0FFF4', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: isDark ? '#1A3A2A' : '#BBF7D0' },
    deliveryRow: { flexDirection: 'row', alignItems: 'center' },
    deliveryTitle: { fontSize: 13, fontWeight: '800', color: textMain },
    deliverySub: { fontSize: 12, color: textSub, marginTop: 1 },
    trustStrip: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: cardBg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: border, marginTop: 24, paddingVertical: 16, paddingHorizontal: 8, gap: 8 },
    trustItem: { flex: 1, minWidth: isDesktop ? 120 : 80, alignItems: 'center', gap: 4, paddingVertical: 8 },
    trustTitle: { fontSize: 11, fontWeight: '900', color: textMain, textAlign: 'center' },
    trustSub: { fontSize: 10, color: textSub, textAlign: 'center' },
    section: { marginHorizontal: 16, marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: border },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: textMain, marginBottom: 4 },
    sectionSub: { fontSize: 12, color: textSub, marginBottom: 12 },
    noReviews: { paddingVertical: 20, alignItems: 'center' },
    noReviewsText: { fontSize: 14, color: textSub },
    reviewCard: { backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: border },
    reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
    reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
    reviewName: { fontSize: 13, fontWeight: '800', color: textMain },
    reviewDate: { fontSize: 11, color: textSub },
    reviewText: { fontSize: 14, color: textSub, lineHeight: 20 },
    reviewPhoto: { width: '100%', height: 160, borderRadius: 10, marginTop: 10 },
    verifiedBadge: { backgroundColor: '#10B98120', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
    verifiedBadgeText: { fontSize: 10, fontWeight: '800', color: '#10B981' },
    recGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    recCard: { backgroundColor: cardBg, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: border, marginBottom: 4 },
    recImgBox: { width: '100%', height: 130, position: 'relative', backgroundColor: isDark ? '#1F1F1F' : '#F3F4F6' },
    recImg: { width: '100%', height: '100%' },
    recStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    recStockText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    recDiscBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    recDiscText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
    recWishBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: isDark ? '#2A2A2A' : 'rgba(255,255,255,0.9)', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    recBody: { padding: 10 },
    recCat: { fontSize: 10, fontWeight: '800', color: GREEN, marginBottom: 2, textTransform: 'uppercase' },
    recName: { fontSize: 13, fontWeight: '800', color: textMain, lineHeight: 17, minHeight: 34 },
    recSize: { fontSize: 11, color: textSub, marginBottom: 6 },
    recPriceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
    recPrice: { fontSize: 14, fontWeight: '900', color: textMain },
    recOldPrice: { fontSize: 10, color: textSub, textDecorationLine: 'line-through' },
    recAddBtn: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    recAddBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
    viewAllBtn: { backgroundColor: GREEN + '15', borderWidth: 1, borderColor: GREEN + '40', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    viewAllBtnText: { color: GREEN, fontSize: 14, fontWeight: '900' },
  });
};
