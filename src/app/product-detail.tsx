import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { BottomNav } from '@/components/BottomNav';
import { addReviewToFirestore, subscribeToProductReviews } from '@/services/firestore';
import { Review } from '@/types';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, addToCart, toggleWishlist, isInWishlist, formatPrice, user, orders, isDarkMode } = useApp();
  const S = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const product = products.find((p) => p.id === id);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isInWishlistState, setIsInWishlistState] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewPhoto, setReviewPhoto] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Check if user has purchased this product (for verified purchase badge)
  const hasOrdered = orders.some((o) =>
    o.items.some((item) => item.product.id === id) && o.status === 'DELIVERED'
  );

  useEffect(() => {
    if (!id) return;
    setIsInWishlistState(isInWishlist(id));

    // Subscribe to reviews
    const unsub = subscribeToProductReviews(id, (firestoreReviews) => {
      setReviews(firestoreReviews);
    });
    return () => unsub();
  }, [id]);

  if (!product) {
    return (
      <SafeAreaView style={S.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 40 }}>😕</Text>
          <Text style={{ color: S.title.color as string, fontSize: 16, marginTop: 12 }}>Product not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: '#00C851', fontWeight: '800' }}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOutOfStock = (product.stock ?? 1) === 0;
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : product.rating;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) {
      addToCart(product.id, 1);
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.id);
    setIsInWishlistState(!isInWishlistState);
  };

  const handleSubmitReview = async () => {
    if (!user?.isLoggedIn) {
      Alert.alert('Sign In Required', 'Please sign in to leave a review.');
      return;
    }
    if (reviewText.trim().length < 10) {
      Alert.alert('Too Short', 'Please write at least 10 characters for your review.');
      return;
    }
    setReviewLoading(true);
    try {
      await addReviewToFirestore({
        productId: product.id,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        rating: reviewRating,
        text: reviewText.trim(),
        photoUrl: reviewPhoto.trim() || undefined,
        isVerifiedPurchase: hasOrdered,
        createdAt: Date.now(),
      });
      setReviewText('');
      setReviewPhoto('');
      setReviewRating(5);
      setShowReviewForm(false);
      Alert.alert('✅ Review Submitted', 'Thank you for your review!');
    } catch (error: any) {
      Alert.alert('Error', 'Could not submit review. Please try again.');
    }
    setReviewLoading(false);
  };

  const renderStars = (rating: number, size = 16, interactive = false) => {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={interactive ? () => setReviewRating(star) : undefined}
            disabled={!interactive}
          >
            <Text style={{ fontSize: size, color: star <= Math.round(rating) ? '#FBBF24' : '#D1D5DB' }}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={S.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Back & Wishlist Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <Text style={S.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleWishlist} style={S.wishlistBtn}>
          <Text style={{ fontSize: 24 }}>{isInWishlistState ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Product Image */}
          <View style={S.imageContainer}>
            <Image source={{ uri: product.image }} style={S.productImage} resizeMode="cover" />
            {isOutOfStock && (
              <View style={S.outOfStockOverlay}>
                <Text style={S.outOfStockOverlayText}>OUT OF STOCK</Text>
              </View>
            )}
            {product.isBestSeller && !isOutOfStock && (
              <View style={S.bestSellerBadge}>
                <Text style={S.bestSellerText}>🏆 BEST SELLER</Text>
              </View>
            )}
          </View>

          <View style={S.content}>
            {/* Category & Origin */}
            <View style={S.metaRow}>
              <View style={S.categoryChip}>
                <Text style={S.categoryChipText}>{product.category}</Text>
              </View>
              <Text style={S.origin}>📍 {product.origin}</Text>
              {product.brand && <Text style={S.brand}>by {product.brand}</Text>}
            </View>

            {/* Product Name */}
            <Text style={S.title}>{product.name}</Text>
            <Text style={S.size}>{product.size}</Text>

            {/* Rating */}
            <View style={S.ratingRow}>
              {renderStars(avgRating)}
              <Text style={S.ratingText}>{avgRating.toFixed(1)} ({reviews.length || product.reviews} reviews)</Text>
            </View>

            {/* Price */}
            <View style={S.priceRow}>
              <Text style={S.price}>{formatPrice(product.priceKRW)}</Text>
              {product.oldPriceKRW > product.priceKRW && (
                <Text style={S.oldPrice}>{formatPrice(product.oldPriceKRW)}</Text>
              )}
              {product.discount ? (
                <View style={S.discountBadge}>
                  <Text style={S.discountText}>{product.discount}</Text>
                </View>
              ) : null}
            </View>

            {/* Stock */}
            {!isOutOfStock && (product.stock ?? 100) > 0 && (product.stock ?? 100) <= 10 && (
              <Text style={S.lowStockText}>⚠️ Only {product.stock} left in stock!</Text>
            )}

            {/* Description */}
            <View style={S.section}>
              <Text style={S.sectionTitle}>About this Product</Text>
              <Text style={S.description}>{product.description}</Text>
            </View>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <View style={S.tagsRow}>
                {product.tags.map((tag) => (
                  <View key={tag} style={S.tag}>
                    <Text style={S.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Quantity Picker */}
            {!isOutOfStock && (
              <View style={S.qtyRow}>
                <Text style={S.qtyLabel}>Quantity</Text>
                <View style={S.qtyControl}>
                  <TouchableOpacity style={S.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Text style={S.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={S.qtyValue}>{quantity}</Text>
                  <TouchableOpacity style={S.qtyBtn} onPress={() => setQuantity(Math.min((product.stock ?? 99), quantity + 1))}>
                    <Text style={S.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Add to Cart */}
            <TouchableOpacity
              style={[S.addToCartBtn, isOutOfStock && S.addToCartBtnDisabled, addedToCart && S.addToCartBtnSuccess]}
              onPress={handleAddToCart}
              disabled={isOutOfStock}
            >
              <Text style={S.addToCartBtnText}>
                {isOutOfStock ? '❌ Out of Stock' : addedToCart ? '✅ Added to Cart!' : `🛒 Add ${quantity} to Cart`}
              </Text>
            </TouchableOpacity>

            {/* ────────────────── REVIEWS SECTION ────────────────── */}
            <View style={S.section}>
              <View style={S.reviewsHeader}>
                <Text style={S.sectionTitle}>⭐ Reviews ({reviews.length})</Text>
                {user?.isLoggedIn && (
                  <TouchableOpacity onPress={() => setShowReviewForm(!showReviewForm)} style={S.writeReviewBtn}>
                    <Text style={S.writeReviewBtnText}>
                      {showReviewForm ? '✕ Cancel' : '✏️ Write Review'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Review Form */}
              {showReviewForm && (
                <View style={S.reviewForm}>
                  <Text style={S.reviewFormLabel}>Your Rating</Text>
                  {renderStars(reviewRating, 28, true)}
                  <Text style={[S.reviewFormLabel, { marginTop: 12 }]}>Your Review *</Text>
                  <TextInput
                    style={S.reviewTextInput}
                    value={reviewText}
                    onChangeText={setReviewText}
                    placeholder="Share your experience with this product..."
                    placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={[S.reviewFormLabel, { marginTop: 8 }]}>Photo URL (optional)</Text>
                  <TextInput
                    style={S.reviewPhotoInput}
                    value={reviewPhoto}
                    onChangeText={setReviewPhoto}
                    placeholder="https://..."
                    placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
                  />
                  {hasOrdered && (
                    <View style={S.verifiedBadge}>
                      <Text style={S.verifiedBadgeText}>✅ Verified Purchase</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={S.submitReviewBtn}
                    onPress={handleSubmitReview}
                    disabled={reviewLoading}
                  >
                    <Text style={S.submitReviewBtnText}>
                      {reviewLoading ? 'Submitting...' : 'Submit Review'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <View style={S.noReviews}>
                  <Text style={S.noReviewsText}>No reviews yet. Be the first to review!</Text>
                </View>
              ) : (
                reviews.map((review) => (
                  <View key={review.id} style={S.reviewCard}>
                    <View style={S.reviewHeader}>
                      <Image source={{ uri: review.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }} style={S.reviewAvatar} />
                      <View style={{ flex: 1 }}>
                        <View style={S.reviewNameRow}>
                          <Text style={S.reviewUserName}>{review.userName}</Text>
                          {review.isVerifiedPurchase && (
                            <View style={S.verifiedBadge}>
                              <Text style={S.verifiedBadgeText}>✅ Verified</Text>
                            </View>
                          )}
                        </View>
                        {renderStars(review.rating, 13)}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNav />
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => {
  const bg = isDark ? '#0A0A0F' : '#F5FFF7';
  const cardBg = isDark ? '#141A14' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#0A1A0A';
  const textSub = isDark ? '#8A9A8A' : '#4A6A4A';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,128,0,0.1)';
  const inputBg = isDark ? '#111A11' : '#F0FFF4';
  const GREEN = '#00C851';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backBtnText: { fontSize: 14, fontWeight: '800', color: GREEN },
    wishlistBtn: { padding: 4 },
    imageContainer: { width: '100%', height: 300, backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0', position: 'relative' },
    productImage: { width: '100%', height: '100%' },
    outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    outOfStockOverlayText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 3 },
    bestSellerBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#FBBF24', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
    bestSellerText: { fontSize: 11, fontWeight: '900', color: '#1A1A1A' },
    content: { padding: 16, paddingBottom: 120 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    categoryChip: { backgroundColor: GREEN + '20', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    categoryChipText: { fontSize: 12, fontWeight: '800', color: GREEN },
    origin: { fontSize: 12, color: textSub },
    brand: { fontSize: 12, color: textSub, fontStyle: 'italic' },
    title: { fontSize: 22, fontWeight: '900', color: textMain, marginBottom: 4 },
    size: { fontSize: 14, color: textSub, marginBottom: 8 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    ratingText: { fontSize: 13, color: textSub },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    price: { fontSize: 26, fontWeight: '900', color: textMain },
    oldPrice: { fontSize: 16, color: textSub, textDecorationLine: 'line-through' },
    discountBadge: { backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    discountText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
    lowStockText: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 8 },
    section: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: border },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: textMain, marginBottom: 10 },
    description: { fontSize: 14, color: textSub, lineHeight: 22 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    tag: { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    tagText: { fontSize: 12, color: textSub },
    qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, backgroundColor: cardBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: border },
    qtyLabel: { fontSize: 14, fontWeight: '800', color: textMain },
    qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GREEN + '20', justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { fontSize: 20, fontWeight: '900', color: GREEN },
    qtyValue: { fontSize: 18, fontWeight: '900', color: textMain, minWidth: 28, textAlign: 'center' },
    addToCartBtn: { backgroundColor: GREEN, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 16, shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    addToCartBtnDisabled: { backgroundColor: '#6B7280', shadowOpacity: 0 },
    addToCartBtnSuccess: { backgroundColor: '#059669' },
    addToCartBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
    reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    writeReviewBtn: { backgroundColor: GREEN + '20', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    writeReviewBtnText: { fontSize: 12, fontWeight: '800', color: GREEN },
    reviewForm: { backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: border },
    reviewFormLabel: { fontSize: 12, fontWeight: '800', color: textSub, marginBottom: 8, textTransform: 'uppercase' },
    reviewTextInput: { backgroundColor: inputBg, borderWidth: 1, borderColor: border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: textMain, minHeight: 100 },
    reviewPhotoInput: { backgroundColor: inputBg, borderWidth: 1, borderColor: border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: textMain },
    verifiedBadge: { backgroundColor: '#10B98120', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginVertical: 8 },
    verifiedBadgeText: { fontSize: 11, fontWeight: '800', color: '#10B981' },
    submitReviewBtn: { backgroundColor: GREEN, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
    submitReviewBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
    noReviews: { paddingVertical: 20, alignItems: 'center' },
    noReviewsText: { fontSize: 14, color: textSub },
    reviewCard: { backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: border },
    reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
    reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
    reviewNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    reviewUserName: { fontSize: 13, fontWeight: '800', color: textMain },
    reviewDate: { fontSize: 11, color: textSub },
    reviewText: { fontSize: 14, color: textSub, lineHeight: 20 },
    reviewPhoto: { width: '100%', height: 160, borderRadius: 10, marginTop: 10 },
  });
};
