/**
 * NamasteMart Firestore Service
 * Complete data layer for all Firestore operations.
 * Covers: products, users, orders, carts, wishlists, categories, banners, reviews.
 */

import {
  db,
  COLLECTIONS,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  increment,
  runTransaction,
} from '@/config/firebase';
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
    const q = query(collection(db, COLLECTIONS.PRODUCTS));

    return onSnapshot(
      q,
      (snapshot) => {
        const products = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Product[];
        products.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(products);
      },
      (error) => {
        console.log('Firestore products listener:', error.message);
        onError?.(error);
      }
    );
  } catch (error: any) {
    console.log('Firestore subscribe error:', error.message);
    onError?.(error);
    return () => {};
  }
};

export const addProductToFirestore = async (product: Omit<Product, 'id'>): Promise<string> => {
  const error = validateProduct(product);
  if (error) throw new Error(error);

  const discountPercent = product.discountPercent ?? 0;
  const finalPrice = calculateFinalPrice(product.priceKRW, discountPercent);

  const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
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
  });
  return docRef.id;
};

export const updateProductInFirestore = async (
  id: string,
  updates: Partial<Product>
): Promise<void> => {
  const error = validateProduct(updates);
  if (error) throw new Error(error);

  // Recalculate finalPrice if price or discount changed
  const finalUpdates: any = { ...updates, updatedAt: Date.now() };

  if (updates.priceKRW !== undefined || updates.discountPercent !== undefined) {
    // Need to fetch current values to calculate
    const snap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, id));
    if (snap.exists()) {
      const current = snap.data() as Product;
      const price = updates.priceKRW ?? current.priceKRW;
      const discountPct = updates.discountPercent ?? current.discountPercent ?? 0;
      finalUpdates.finalPrice = calculateFinalPrice(price, discountPct);
    }
  }

  await updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), finalUpdates);
};

export const deleteProductFromFirestore = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
};

export const duplicateProductInFirestore = async (product: Product): Promise<string> => {
  const { id, ...rest } = product;
  const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
    ...rest,
    name: `${rest.name} (Copy)`,
    stock: 0,
    available: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
};

/**
 * Atomically decrement stock for multiple products when an order is placed.
 * Returns false if any product has insufficient stock.
 */
export const decrementStockForOrder = async (
  items: { productId: string; quantity: number }[]
): Promise<boolean> => {
  try {
    return await runTransaction(db, async (transaction) => {
      // First pass: read all products and validate stock
      const productSnapshots: { ref: any; data: any; quantity: number }[] = [];

      for (const item of items) {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
        const snap = await transaction.get(productRef);
        if (!snap.exists()) {
          throw new Error(`Product ${item.productId} not found.`);
        }
        const data = snap.data();
        const currentStock = (data.stock as number) ?? 0;
        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for "${data.name}". Available: ${currentStock}, Requested: ${item.quantity}`);
        }
        productSnapshots.push({ ref: productRef, data, quantity: item.quantity });
      }

      // Second pass: decrement all stocks
      for (const snap of productSnapshots) {
        const newStock = Math.max(0, (snap.data.stock ?? 0) - snap.quantity);
        transaction.update(snap.ref, {
          stock: newStock,
          available: newStock > 0 ? (snap.data.available ?? true) : false,
          updatedAt: Date.now(),
        });
      }

      return true;
    });
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
  const userRef = doc(db, COLLECTIONS.USERS, uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // New user — create document
    await setDoc(userRef, {
      uid,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      avatar: userData.avatar || '',
      addresses: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } else {
    // Existing user — update only name/email/avatar if changed, never touch addresses
    await updateDoc(userRef, {
      name: userData.name,
      email: userData.email,
      ...(userData.avatar ? { avatar: userData.avatar } : {}),
      updatedAt: Date.now(),
    });
  }
};

/**
 * Get user profile from Firestore.
 */
export const getUserProfile = async (uid: string): Promise<FirestoreUser | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return null;
  return snap.data() as FirestoreUser;
};

/**
 * Subscribe to user profile changes in real-time.
 */
export const subscribeToUserProfile = (
  uid: string,
  callback: (user: FirestoreUser | null) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, COLLECTIONS.USERS, uid),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as FirestoreUser);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.log('User profile listener:', error.message);
    }
  );
};

/**
 * Update user addresses in Firestore.
 */
export const updateUserAddresses = async (uid: string, addresses: any[]): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    addresses,
    updatedAt: Date.now(),
  });
};

/**
 * Update user profile fields.
 */
export const updateUserProfileInFirestore = async (
  uid: string,
  updates: Partial<FirestoreUser>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...updates,
    updatedAt: Date.now(),
  });
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
    let q;
    if (adminMode) {
      q = query(
        collection(db, COLLECTIONS.ORDERS),
        orderBy('createdAt', 'desc'),
        limit(500)
      );
    } else if (customerUid) {
      q = query(
        collection(db, COLLECTIONS.ORDERS),
        where('customerUid', '==', customerUid),
        orderBy('createdAt', 'desc')
      );
    } else {
      return () => {};
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as OrderItem[];
        callback(orders);
      },
      (error) => {
        console.log('Firestore orders listener:', error.message);
      }
    );
  } catch (error: any) {
    console.log('Orders subscribe error:', error.message);
    return () => {};
  }
};

export const addOrderToFirestore = async (order: any): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), {
    ...order,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
};

export const updateOrderStatusInFirestore = async (
  orderId: string,
  status: OrderStatus,
  additionalData?: Record<string, any>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    status,
    ...additionalData,
    updatedAt: Date.now(),
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARTS (per-user persistence)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save cart to Firestore for persistence across sessions.
 */
export const syncCartToFirestore = async (
  uid: string,
  items: FirestoreCartItem[]
): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.CARTS, uid), {
      items,
      updatedAt: Date.now(),
    });
  } catch (error: any) {
    console.log('Cart sync notice:', error.message);
  }
};

/**
 * Load cart from Firestore.
 */
export const loadCartFromFirestore = async (
  uid: string
): Promise<FirestoreCartItem[]> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.CARTS, uid));
    if (snap.exists()) {
      return (snap.data().items || []) as FirestoreCartItem[];
    }
  } catch (error: any) {
    console.log('Cart load notice:', error.message);
  }
  return [];
};

/**
 * Subscribe to cart changes in real-time.
 */
export const subscribeToCart = (
  uid: string,
  callback: (items: FirestoreCartItem[]) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, COLLECTIONS.CARTS, uid),
    (snap) => {
      if (snap.exists()) {
        callback((snap.data().items || []) as FirestoreCartItem[]);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.log('Cart listener notice:', error.message);
    }
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// WISHLISTS (per-user persistence)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save wishlist to Firestore.
 */
export const syncWishlistToFirestore = async (
  uid: string,
  productIds: string[]
): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.WISHLISTS, uid), {
      productIds,
      updatedAt: Date.now(),
    });
  } catch (error: any) {
    console.log('Wishlist sync notice:', error.message);
  }
};

/**
 * Load wishlist from Firestore.
 */
export const loadWishlistFromFirestore = async (
  uid: string
): Promise<string[]> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.WISHLISTS, uid));
    if (snap.exists()) {
      return (snap.data().productIds || []) as string[];
    }
  } catch (error: any) {
    console.log('Wishlist load notice:', error.message);
  }
  return [];
};

/**
 * Subscribe to wishlist changes in real-time.
 */
export const subscribeToWishlist = (
  uid: string,
  callback: (productIds: string[]) => void
): Unsubscribe => {
  return onSnapshot(
    doc(db, COLLECTIONS.WISHLISTS, uid),
    (snap) => {
      if (snap.exists()) {
        callback((snap.data().productIds || []) as string[]);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.log('Wishlist listener notice:', error.message);
    }
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export const subscribeToCategories = (
  callback: (categories: Category[]) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CATEGORIES),
      orderBy('displayOrder', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const cats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Category[];
        callback(cats);
      },
      (error) => {
        console.log('Categories listener:', error.message);
      }
    );
  } catch (error: any) {
    return () => {};
  }
};

export const addCategoryToFirestore = async (cat: Omit<Category, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTIONS.CATEGORIES), cat);
  return docRef.id;
};

export const updateCategoryInFirestore = async (
  id: string,
  updates: Partial<Category>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.CATEGORIES, id), updates);
};

export const deleteCategoryFromFirestore = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
};

// ═══════════════════════════════════════════════════════════════════════════════
// BANNERS
// ═══════════════════════════════════════════════════════════════════════════════

export const subscribeToBanners = (callback: (banners: Banner[]) => void): Unsubscribe => {
  try {
    const q = query(
      collection(db, COLLECTIONS.BANNERS),
      where('isActive', '==', true),
      orderBy('displayOrder', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const banners = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Banner[];
        callback(banners);
      },
      (error) => {
        console.log('Banners listener:', error.message);
      }
    );
  } catch (error: any) {
    return () => {};
  }
};

export const addBannerToFirestore = async (banner: Omit<Banner, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTIONS.BANNERS), banner);
  return docRef.id;
};

export const updateBannerInFirestore = async (
  id: string,
  updates: Partial<Banner>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.BANNERS, id), updates);
};

export const deleteBannerFromFirestore = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.BANNERS, id));
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════════════════════

export const subscribeToProductReviews = (
  productId: string,
  callback: (reviews: Review[]) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, COLLECTIONS.REVIEWS),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const reviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Review[];
        callback(reviews);
      },
      (error) => {
        console.log('Reviews listener:', error.message);
      }
    );
  } catch (error: any) {
    return () => {};
  }
};

export const addReviewToFirestore = async (review: Omit<Review, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTIONS.REVIEWS), review);

  // Update product average rating
  try {
    const reviewsSnap = await getDocs(
      query(collection(db, COLLECTIONS.REVIEWS), where('productId', '==', review.productId))
    );
    const allReviews = reviewsSnap.docs.map((d) => d.data() as Review);
    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await updateDoc(doc(db, COLLECTIONS.PRODUCTS, review.productId), {
      rating: Math.round(avgRating * 10) / 10,
      reviews: allReviews.length,
      updatedAt: Date.now(),
    });
  } catch (ratingError: any) {
    console.log('Rating update notice:', ratingError.message);
  }

  return docRef.id;
};

// ═══════════════════════════════════════════════════════════════════════════════
// USER PUSH TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export const saveUserPushToken = async (uid: string, token: string): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, uid), { pushToken: token, updatedAt: Date.now() }, { merge: true });
  } catch (e: any) {
    console.log('Push token save notice:', e.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export const checkIsAdmin = async (uid: string): Promise<boolean> => {
  try {
    const adminRef = doc(db, COLLECTIONS.ADMINS, uid);
    const snap = await getDoc(adminRef);
    return snap.exists();
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

  const existing = await getDocs(collection(db, COLLECTIONS.CATEGORIES));
  if (existing.empty) {
    for (const cat of defaultCategories) {
      await addDoc(collection(db, COLLECTIONS.CATEGORIES), cat);
    }
    console.log('✅ Default categories seeded to Firestore');
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

  const existing = await getDocs(collection(db, COLLECTIONS.BANNERS));
  if (existing.empty) {
    for (const banner of defaultBanners) {
      await addDoc(collection(db, COLLECTIONS.BANNERS), banner);
    }
    console.log('✅ Default banners seeded to Firestore');
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
      const snap = await getDoc(doc(db, COLLECTIONS.PRODUCTS, item.productId));
      if (snap.exists()) {
        const data = snap.data() as Product;
        const currentStock = data.stock ?? 0;
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

