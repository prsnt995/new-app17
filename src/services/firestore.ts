/**
 * NamasteMart Firestore Service
 * Central data layer for real-time Firestore operations.
 * Handles products, orders, categories, banners, reviews, and analytics.
 */

import {
  db,
  COLLECTIONS,
  collection,
  doc,
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
import { Banner, Category, OrderItem, OrderStatus, Product, Review } from '@/types';

// ─── TYPE: UNSUBSCRIBE FUNCTION ───────────────────────────────────────────────
type Unsubscribe = () => void;

// ─── FIRESTORE AVAILABILITY CHECK ────────────────────────────────────────────
// Firestore may be unavailable if Firebase project is not configured.
let firestoreAvailable = true;

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Subscribe to real-time product updates from Firestore.
 * Falls back gracefully if Firestore is unavailable.
 */
export const subscribeToProducts = (
  callback: (products: Product[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCTS),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const products = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Product[];
        firestoreAvailable = true;
        callback(products);
      },
      (error) => {
        console.log('Firestore products listener notice:', error.message);
        firestoreAvailable = false;
        onError?.(error);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.log('Firestore subscribe error:', error.message);
    onError?.(error);
    return () => {};
  }
};

export const addProductToFirestore = async (product: Omit<Product, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
    ...product,
    stock: product.stock ?? 100,
    isHidden: product.isHidden ?? false,
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
  await updateDoc(doc(db, COLLECTIONS.PRODUCTS, id), {
    ...updates,
    updatedAt: Date.now(),
  });
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
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
};

/**
 * Atomically decrement stock for multiple products when an order is placed.
 */
export const decrementStockForOrder = async (
  items: { productId: string; quantity: number }[]
): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      for (const item of items) {
        const productRef = doc(db, COLLECTIONS.PRODUCTS, item.productId);
        const snap = await transaction.get(productRef);
        if (snap.exists()) {
          const currentStock = (snap.data().stock as number) ?? 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          transaction.update(productRef, { stock: newStock, updatedAt: Date.now() });
        }
      }
    });
  } catch (error: any) {
    console.log('Stock decrement notice:', error.message);
  }
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
      // Admin sees all orders, latest first
      q = query(
        collection(db, COLLECTIONS.ORDERS),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
    } else if (customerUid) {
      // Customer sees only their own orders
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
        console.log('Firestore orders listener notice:', error.message);
      }
    );
  } catch (error: any) {
    console.log('Orders subscribe error:', error.message);
    return () => {};
  }
};

export const addOrderToFirestore = async (order: Omit<OrderItem, 'id'>): Promise<string> => {
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
  additionalData?: Partial<OrderItem>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), {
    status,
    ...additionalData,
    updatedAt: Date.now(),
  });
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
        console.log('Categories listener notice:', error.message);
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
        console.log('Banners listener notice:', error.message);
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
        console.log('Reviews listener notice:', error.message);
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
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      pushToken: token,
      updatedAt: Date.now(),
    });
  } catch (error: any) {
    // User doc may not exist yet, create it
    try {
      await setDoc(doc(db, COLLECTIONS.USERS, uid), { pushToken: token, updatedAt: Date.now() }, { merge: true });
    } catch (e: any) {
      console.log('Push token save notice:', e.message);
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export const checkIsAdmin = async (uid: string): Promise<boolean> => {
  try {
    const snap = await getDocs(
      query(collection(db, COLLECTIONS.ADMINS), where('uid', '==', uid))
    );
    return !snap.empty;
  } catch (error: any) {
    console.log('Admin check notice:', error.message);
    // Fallback: check hardcoded admin email list
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DEFAULT DATA (run once to populate Firestore from mockData)
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

export { firestoreAvailable };
