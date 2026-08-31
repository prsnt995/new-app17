/**
 * NamasteMart Supabase Service
 * Complete data layer for all Supabase operations.
 * Covers: products, users, orders, carts, wishlists, categories, banners, reviews.
 */

import { supabase, TABLES } from '@/config/supabase';
import {
  Banner,
  Category,
  DeliveryAddress,
  FirestoreCartItem,
  FirestoreUser,
  OrderItem,
  OrderItemSnapshot,
  OrderStatus,
  Product,
  Review,
  Address,
} from '@/types';

type Unsubscribe = () => void;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export const validateProduct = (product: Partial<Product>): string | null => {
  if (!product.name || product.name.trim().length === 0) return 'Product name is required.';
  if (product.priceKRW !== undefined && product.priceKRW < 0) return 'Price cannot be negative.';
  if (product.discountPercent !== undefined && (product.discountPercent < 0 || product.discountPercent > 100))
    return 'Discount must be between 0 and 100.';
  if (product.stock !== undefined && product.stock < 0) return 'Stock must be 0 or greater.';
  return null;
};

export const calculateFinalPrice = (price: number, discountPercent: number): number => {
  if (discountPercent <= 0) return price;
  return Math.round(price - (price * discountPercent) / 100);
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

export const subscribeToProducts = (
  callback: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.PRODUCTS },
        async () => {
          const { data, error } = await supabase
            .from(TABLES.PRODUCTS)
            .select('*')
            .order('createdAt', { ascending: false });

          if (error) {
            console.log('Supabase products query error:', error.message);
            onError?.(new Error(error.message));
            return;
          }

          callback((data || []) as Product[]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          supabase
            .from(TABLES.PRODUCTS)
            .select('*')
            .order('createdAt', { ascending: false })
            .then(({ data, error }) => {
              if (error) {
                console.log('Supabase products initial load error:', error.message);
                onError?.(new Error(error.message));
                return;
              }
              callback((data || []) as Product[]);
            });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error: any) {
    console.log('Supabase subscribe error:', error.message);
    onError?.(error);
    return () => {};
  }
};

export const addProductToFirestore = async (product: Omit<Product, 'id'>): Promise<string> => {
  const error = validateProduct(product);
  if (error) throw new Error(error);

  const discountPercent = product.discountPercent ?? 0;
  const finalPrice = calculateFinalPrice(product.priceKRW, discountPercent);

  const { data, error: insertError } = await supabase
    .from(TABLES.PRODUCTS)
    .insert({
      ...product,
      discountPercent,
      finalPrice,
      stock: product.stock ?? 0,
      available: product.available ?? true,
      isHidden: product.isHidden ?? false,
      images: product.images ?? [],
      rating: product.rating ?? 0,
      reviews: product.reviews ?? 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return data!.id;
};

export const updateProductInFirestore = async (
  id: string,
  updates: Partial<Product>
): Promise<void> => {
  const error = validateProduct(updates);
  if (error) throw new Error(error);

  const finalUpdates: any = { ...updates, updatedAt: Date.now() };

  if (updates.priceKRW !== undefined || updates.discountPercent !== undefined) {
    const { data: current } = await supabase
      .from(TABLES.PRODUCTS)
      .select('priceKRW, discountPercent')
      .eq('id', id)
      .single();

    if (current) {
      const price = updates.priceKRW ?? current.priceKRW;
      const discountPct = updates.discountPercent ?? current.discountPercent ?? 0;
      finalUpdates.finalPrice = calculateFinalPrice(price, discountPct);
    }
  }

  const { error: updateError } = await supabase
    .from(TABLES.PRODUCTS)
    .update(finalUpdates)
    .eq('id', id);

  if (updateError) throw updateError;
};

export const deleteProductFromFirestore = async (id: string): Promise<void> => {
  const { error } = await supabase.from(TABLES.PRODUCTS).delete().eq('id', id);
  if (error) throw error;
};

export const duplicateProductInFirestore = async (product: Product): Promise<string> => {
  const { id, ...rest } = product;

  const { data, error } = await supabase
    .from(TABLES.PRODUCTS)
    .insert({
      ...rest,
      name: `${rest.name} (Copy)`,
      stock: 0,
      available: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return data!.id;
};

/**
 * Atomically decrement stock for multiple products when an order is placed.
 * Uses Supabase RPC for atomic operations.
 * Returns false if any product has insufficient stock.
 */
export const decrementStockForOrder = async (
  items: { productId: string; quantity: number }[]
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('decrement_stock', {
      items: items.map((item) => ({
        p_product_id: item.productId,
        p_quantity: item.quantity,
      })),
    });

    if (error) {
      console.log('Stock decrement error:', error.message);
      throw error;
    }

    return true;
  } catch (error: any) {
    console.log('Stock decrement error:', error.message);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create or update a user document on login.
 * Never overwrites existing addresses — only sets name/email if doc is new.
 */
export const createOrUpdateUser = async (
  uid: string,
  userData: { name: string; email: string; phone?: string; avatar?: string }
): Promise<void> => {
  const { data: existing, error: fetchError } = await supabase
    .from(TABLES.PROFILES)
    .select('id')
    .eq('id', uid)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (!existing) {
    const { error: insertError } = await supabase
      .from(TABLES.PROFILES)
      .insert({
        id: uid,
        uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        avatar: userData.avatar || '',
        addresses: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

    if (insertError) throw insertError;
  } else {
    const { error: updateError } = await supabase
      .from(TABLES.PROFILES)
      .update({
        name: userData.name,
        email: userData.email,
        ...(userData.avatar ? { avatar: userData.avatar } : {}),
        updatedAt: Date.now(),
      })
      .eq('id', uid);

    if (updateError) throw updateError;
  }
};

/**
 * Get user profile from Supabase.
 */
export const getUserProfile = async (uid: string): Promise<FirestoreUser | null> => {
  const { data, error } = await supabase
    .from(TABLES.PROFILES)
    .select('*')
    .eq('id', uid)
    .single();

  if (error || !data) return null;
  return data as FirestoreUser;
};

/**
 * Subscribe to user profile changes in real-time.
 */
export const subscribeToUserProfile = (
  uid: string,
  callback: (user: FirestoreUser | null) => void
): Unsubscribe => {
  const channel = supabase
    .channel(`user-profile-${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLES.PROFILES, filter: `id=eq.${uid}` },
      async () => {
        const { data, error } = await supabase
          .from(TABLES.PROFILES)
          .select('*')
          .eq('id', uid)
          .single();

        if (error || !data) {
          callback(null);
          return;
        }

        callback(data as FirestoreUser);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        supabase
          .from(TABLES.PROFILES)
          .select('*')
          .eq('id', uid)
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              callback(null);
              return;
            }
            callback(data as FirestoreUser);
          });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Update user addresses in Supabase.
 */
export const updateUserAddresses = async (uid: string, addresses: any[]): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.PROFILES)
    .update({ addresses, updatedAt: Date.now() })
    .eq('id', uid);

  if (error) throw error;
};

/**
 * Update user profile fields.
 */
export const updateUserProfileInFirestore = async (
  uid: string,
  updates: Partial<FirestoreUser>
): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.PROFILES)
    .update({ ...updates, updatedAt: Date.now() })
    .eq('id', uid);

  if (error) throw error;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

export const subscribeToOrders = (
  callback: (orders: OrderItem[]) => void,
  adminMode = false,
  customerUid?: string
): Unsubscribe => {
  try {
    const channelName = adminMode ? 'orders-admin' : `orders-${customerUid || 'none'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.ORDERS,
          ...(adminMode ? {} : { filter: `customerUid=eq.${customerUid}` }),
        },
        async () => {
          let query = supabase
            .from(TABLES.ORDERS)
            .select('*')
            .order('createdAt', { ascending: false });

          if (!adminMode && customerUid) {
            query = query.eq('customerUid', customerUid);
          }

          if (adminMode) {
            query = query.limit(500);
          }

          const { data, error } = await query;

          if (error) {
            console.log('Supabase orders query error:', error.message);
            return;
          }

          callback((data || []) as OrderItem[]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          let query = supabase
            .from(TABLES.ORDERS)
            .select('*')
            .order('createdAt', { ascending: false });

          if (!adminMode && customerUid) {
            query = query.eq('customerUid', customerUid);
          }

          if (adminMode) {
            query = query.limit(500);
          }

          query.then(({ data, error }) => {
            if (error) {
              console.log('Supabase orders initial load error:', error.message);
              return;
            }
            callback((data || []) as OrderItem[]);
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error: any) {
    console.log('Orders subscribe error:', error.message);
    return () => {};
  }
};

export const addOrderToFirestore = async (order: any): Promise<string> => {
  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .insert({
      ...order,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return data!.id;
};

export const updateOrderStatusInFirestore = async (
  orderId: string,
  status: OrderStatus,
  additionalData?: Record<string, any>
): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.ORDERS)
    .update({
      status,
      ...additionalData,
      updatedAt: Date.now(),
    })
    .eq('id', orderId);

  if (error) throw error;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTS (per-user persistence)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save cart to Supabase for persistence across sessions.
 */
export const syncCartToFirestore = async (
  uid: string,
  items: FirestoreCartItem[]
): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TABLES.CARTS)
      .upsert(
        { id: uid, uid, items, updatedAt: Date.now() },
        { onConflict: 'id' }
      );

    if (error) console.log('Cart sync notice:', error.message);
  } catch (error: any) {
    console.log('Cart sync notice:', error.message);
  }
};

/**
 * Load cart from Supabase.
 */
export const loadCartFromFirestore = async (
  uid: string
): Promise<FirestoreCartItem[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.CARTS)
      .select('items')
      .eq('id', uid)
      .single();

    if (error || !data) return [];
    return (data.items || []) as FirestoreCartItem[];
  } catch (error: any) {
    console.log('Cart load notice:', error.message);
    return [];
  }
};

/**
 * Subscribe to cart changes in real-time.
 */
export const subscribeToCart = (
  uid: string,
  callback: (items: FirestoreCartItem[]) => void
): Unsubscribe => {
  const channel = supabase
    .channel(`cart-${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLES.CARTS, filter: `id=eq.${uid}` },
      async () => {
        const { data, error } = await supabase
          .from(TABLES.CARTS)
          .select('items')
          .eq('id', uid)
          .single();

        if (error || !data) {
          callback([]);
          return;
        }

        callback((data.items || []) as FirestoreCartItem[]);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        supabase
          .from(TABLES.CARTS)
          .select('items')
          .eq('id', uid)
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              callback([]);
              return;
            }
            callback((data.items || []) as FirestoreCartItem[]);
          });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// WISHLISTS (per-user persistence)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save wishlist to Supabase.
 */
export const syncWishlistToFirestore = async (
  uid: string,
  productIds: string[]
): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TABLES.WISHLISTS)
      .upsert(
        { id: uid, uid, productIds, updatedAt: Date.now() },
        { onConflict: 'id' }
      );

    if (error) console.log('Wishlist sync notice:', error.message);
  } catch (error: any) {
    console.log('Wishlist sync notice:', error.message);
  }
};

/**
 * Load wishlist from Supabase.
 */
export const loadWishlistFromFirestore = async (
  uid: string
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.WISHLISTS)
      .select('productIds')
      .eq('id', uid)
      .single();

    if (error || !data) return [];
    return (data.productIds || []) as string[];
  } catch (error: any) {
    console.log('Wishlist load notice:', error.message);
    return [];
  }
};

/**
 * Subscribe to wishlist changes in real-time.
 */
export const subscribeToWishlist = (
  uid: string,
  callback: (productIds: string[]) => void
): Unsubscribe => {
  const channel = supabase
    .channel(`wishlist-${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLES.WISHLISTS, filter: `id=eq.${uid}` },
      async () => {
        const { data, error } = await supabase
          .from(TABLES.WISHLISTS)
          .select('productIds')
          .eq('id', uid)
          .single();

        if (error || !data) {
          callback([]);
          return;
        }

        callback((data.productIds || []) as string[]);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        supabase
          .from(TABLES.WISHLISTS)
          .select('productIds')
          .eq('id', uid)
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              callback([]);
              return;
            }
            callback((data.productIds || []) as string[]);
          });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export const subscribeToCategories = (
  callback: (categories: Category[]) => void
): Unsubscribe => {
  try {
    const channel = supabase
      .channel('categories-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.CATEGORIES },
        async () => {
          const { data, error } = await supabase
            .from(TABLES.CATEGORIES)
            .select('*')
            .order('displayOrder', { ascending: true });

          if (error) {
            console.log('Supabase categories query error:', error.message);
            return;
          }

          callback((data || []) as Category[]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          supabase
            .from(TABLES.CATEGORIES)
            .select('*')
            .order('displayOrder', { ascending: true })
            .then(({ data, error }) => {
              if (error) return;
              callback((data || []) as Category[]);
            });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error: any) {
    return () => {};
  }
};

export const addCategoryToFirestore = async (cat: Omit<Category, 'id'>): Promise<string> => {
  const { data, error } = await supabase
    .from(TABLES.CATEGORIES)
    .insert(cat)
    .select('id')
    .single();

  if (error) throw error;
  return data!.id;
};

export const updateCategoryInFirestore = async (
  id: string,
  updates: Partial<Category>
): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.CATEGORIES)
    .update(updates)
    .eq('id', id);

  if (error) throw error;
};

export const deleteCategoryFromFirestore = async (id: string): Promise<void> => {
  const { error } = await supabase.from(TABLES.CATEGORIES).delete().eq('id', id);
  if (error) throw error;
};

// ═══════════════════════════════════════════════════════════════════════════════
// BANNERS
// ═══════════════════════════════════════════════════════════════════════════════

export const subscribeToBanners = (callback: (banners: Banner[]) => void): Unsubscribe => {
  try {
    const channel = supabase
      .channel('banners-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.BANNERS },
        async () => {
          const { data, error } = await supabase
            .from(TABLES.BANNERS)
            .select('*')
            .eq('isActive', true)
            .order('displayOrder', { ascending: true });

          if (error) {
            console.log('Supabase banners query error:', error.message);
            return;
          }

          callback((data || []) as Banner[]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          supabase
            .from(TABLES.BANNERS)
            .select('*')
            .eq('isActive', true)
            .order('displayOrder', { ascending: true })
            .then(({ data, error }) => {
              if (error) return;
              callback((data || []) as Banner[]);
            });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error: any) {
    return () => {};
  }
};

export const addBannerToFirestore = async (banner: Omit<Banner, 'id'>): Promise<string> => {
  const { data, error } = await supabase
    .from(TABLES.BANNERS)
    .insert(banner)
    .select('id')
    .single();

  if (error) throw error;
  return data!.id;
};

export const updateBannerInFirestore = async (
  id: string,
  updates: Partial<Banner>
): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.BANNERS)
    .update(updates)
    .eq('id', id);

  if (error) throw error;
};

export const deleteBannerFromFirestore = async (id: string): Promise<void> => {
  const { error } = await supabase.from(TABLES.BANNERS).delete().eq('id', id);
  if (error) throw error;
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════════════════════

export const subscribeToProductReviews = (
  productId: string,
  callback: (reviews: Review[]) => void
): Unsubscribe => {
  try {
    const channel = supabase
      .channel(`reviews-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.REVIEWS,
          filter: `productId=eq.${productId}`,
        },
        async () => {
          const { data, error } = await supabase
            .from(TABLES.REVIEWS)
            .select('*')
            .eq('productId', productId)
            .order('createdAt', { ascending: false })
            .limit(50);

          if (error) {
            console.log('Supabase reviews query error:', error.message);
            return;
          }

          callback((data || []) as Review[]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          supabase
            .from(TABLES.REVIEWS)
            .select('*')
            .eq('productId', productId)
            .order('createdAt', { ascending: false })
            .limit(50)
            .then(({ data, error }) => {
              if (error) return;
              callback((data || []) as Review[]);
            });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error: any) {
    return () => {};
  }
};

export const addReviewToFirestore = async (review: Omit<Review, 'id'>): Promise<string> => {
  const { data, error: insertError } = await supabase
    .from(TABLES.REVIEWS)
    .insert(review)
    .select('id')
    .single();

  if (insertError) throw insertError;
  const reviewId = data!.id;

  // Update product average rating
  try {
    const { data: allReviews } = await supabase
      .from(TABLES.REVIEWS)
      .select('rating')
      .eq('productId', review.productId);

    if (allReviews && allReviews.length > 0) {
      const avgRating =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await supabase
        .from(TABLES.PRODUCTS)
        .update({
          rating: Math.round(avgRating * 10) / 10,
          reviews: allReviews.length,
          updatedAt: Date.now(),
        })
        .eq('id', review.productId);
    }
  } catch (ratingError: any) {
    console.log('Rating update notice:', ratingError.message);
  }

  return reviewId;
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER PUSH TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export const saveUserPushToken = async (uid: string, token: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from(TABLES.PROFILES)
      .upsert(
        { id: uid, pushToken: token, updatedAt: Date.now() },
        { onConflict: 'id' }
      );

    if (error) console.log('Push token save notice:', error.message);
  } catch (e: any) {
    console.log('Push token save notice:', e.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export const checkIsAdmin = async (uid: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ADMINS)
      .select('id')
      .eq('id', uid)
      .single();

    return !error && !!data;
  } catch (error: any) {
    console.log('Admin check notice:', error.message);
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DEFAULT DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const seedDefaultCategories = async (): Promise<void> => {
  const defaultCategories: Omit<Category, 'id'>[] = [
    { name: 'All', icon: '✨', displayOrder: 0, isActive: true },
    { name: 'Rice', icon: '🍚', description: 'Basmati & Sona', displayOrder: 1, isActive: true },
    { name: 'Atta', icon: '🌾', description: 'Chakki Fresh', displayOrder: 2, isActive: true },
    { name: 'Masala', icon: '🌶️', description: 'Spices & Herbs', displayOrder: 3, isActive: true },
    { name: 'Dal', icon: '🫘', description: 'Pulses & Lentils', displayOrder: 4, isActive: true },
    { name: 'Snacks', icon: '🍿', description: 'Namkeen & Chips', displayOrder: 5, isActive: true },
    { name: 'Drinks', icon: '🥤', description: 'Tea & Beverages', displayOrder: 6, isActive: true },
    { name: 'Sweets', icon: '🍬', description: 'Mithai & Desserts', displayOrder: 7, isActive: true },
    { name: 'Noodles', icon: '🍜', description: 'Instant & Fresh', displayOrder: 8, isActive: true },
    { name: 'Festival', icon: '🪔', description: 'Festival Specials', displayOrder: 9, isActive: true },
    { name: 'Jewelry', icon: '💎', description: 'Gold & Kundan', displayOrder: 10, isActive: true },
    { name: 'Clothes', icon: '👗', description: 'Sarees & Apparel', displayOrder: 11, isActive: true },
  ];

  const { data: existing } = await supabase
    .from(TABLES.CATEGORIES)
    .select('id')
    .limit(1);

  if (!existing || existing.length === 0) {
    const { error } = await supabase.from(TABLES.CATEGORIES).insert(defaultCategories);
    if (!error) console.log('✅ Default categories seeded to Supabase');
  }
};

export const seedDefaultBanners = async (): Promise<void> => {
  const defaultBanners: Omit<Banner, 'id'>[] = [
    {
      imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200',
      title: '🎉 Festival Season Sale',
      subtitle: 'Up to 30% off on all Indian groceries',
      linkTarget: 'Masala',
      displayOrder: 0,
      isActive: true,
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200',
      title: '✈️ Express Delivery to India & Nepal',
      subtitle: 'Seoul → New Delhi in 3-5 days',
      linkTarget: 'Rice',
      displayOrder: 1,
      isActive: true,
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200',
      title: '🍚 Premium Basmati Collection',
      subtitle: 'Authentic Himalayan & Indian rice',
      linkTarget: 'Rice',
      displayOrder: 2,
      isActive: true,
    },
  ];

  const { data: existing } = await supabase
    .from(TABLES.BANNERS)
    .select('id')
    .limit(1);

  if (!existing || existing.length === 0) {
    const { error } = await supabase.from(TABLES.BANNERS).insert(defaultBanners);
    if (!error) console.log('✅ Default banners seeded to Supabase');
  }
};

/**
 * Validate stock availability before checkout.
 * Returns a list of items with insufficient stock.
 */
export const validateStockForCheckout = async (
  items: { productId: string; quantity: number }[]
): Promise<{ productId: string; name: string; available: number; requested: number }[]> => {
  const issues: { productId: string; name: string; available: number; requested: number }[] = [];

  for (const item of items) {
    try {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select('name, stock')
        .eq('id', item.productId)
        .single();

      if (!error && data) {
        const currentStock = (data.stock as number) ?? 0;
        if (currentStock < item.quantity) {
          issues.push({
            productId: item.productId,
            name: data.name,
            available: currentStock,
            requested: item.quantity,
          });
        }
      }
    } catch (e: any) {
      console.log('Stock validation error:', e.message);
    }
  }

  return issues;
};

// ─── RE-EXPORT MODULAR SERVICES ──────────────────────────────────────────────
export * from './userService';
export * from './addressService';
export * from './paymentService';
export * from './orderService';
export * from './authService';
