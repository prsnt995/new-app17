import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { auth, signInWithEmailAndPassword } from '@/config/firebase';
import {
  addProductToFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  duplicateProductInFirestore,
  updateOrderStatusInFirestore,
  addCategoryToFirestore,
  updateCategoryInFirestore,
  deleteCategoryFromFirestore,
  addBannerToFirestore,
  updateBannerInFirestore,
  deleteBannerFromFirestore,
  checkIsAdmin,
} from '@/services/firestore';
import { notifyOrderStatusChange } from '@/services/notifications';
import { Banner, Category, OrderItem, OrderStatus, Product } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── ADMIN EMAIL WHITELIST ─────────────────────────────────────────────────
const ADMIN_EMAILS = [
  'admin@namastemart.com',
  'parshant@namastemart.com',
  'namaste.mart.admin@gmail.com',
];

// ─── PRODUCT CATEGORIES ───────────────────────────────────────────────────
const PRODUCT_CATEGORIES = [
  'Rice', 'Atta', 'Masala', 'Dal', 'Snacks', 'Drinks',
  'Sweets', 'Noodles', 'Festival', 'Jewelry', 'Clothes',
  'Perfumes', 'Pickles', 'Ghee & Oils', 'Papad', 'Other',
];

// ─── STATUS CONFIG ────────────────────────────────────────────────────────
const ORDER_STATUSES: { value: OrderStatus; label: string; emoji: string; color: string }[] = [
  { value: 'ORDER_PLACED', label: 'Order Placed', emoji: '📋', color: '#6366F1' },
  { value: 'PACKED', label: 'Packed', emoji: '📦', color: '#F59E0B' },
  { value: 'PICKED_UP', label: 'Picked Up', emoji: '🚚', color: '#0EA5E9' },
  { value: 'IN_TRANSIT', label: 'In Transit', emoji: '✈️', color: '#8B5CF6' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', emoji: '🏃', color: '#F97316' },
  { value: 'DELIVERED', label: 'Delivered', emoji: '✅', color: '#10B981' },
  { value: 'CANCELLED', label: 'Cancelled', emoji: '❌', color: '#EF4444' },
];

type AdminTab = 'DASHBOARD' | 'ORDERS' | 'PRODUCTS' | 'CATEGORIES' | 'BANNERS';
type OrderFilter = 'ALL' | 'ORDER_PLACED' | 'PACKED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────
export default function AdminScreen() {
  const router = useRouter();
  const { products, orders, categories: ctxCategories, banners: ctxBanners,
    updateUserProfile, isDarkMode, addProduct, updateProduct, deleteProduct, updateOrderStatus } = useApp();
  const S = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // ── AUTH STATE ──────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // ── TABS ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');

  // ── REFRESH ─────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // ── ORDERS ──────────────────────────────────────────────────────────────
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  // ── PRODUCTS ────────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Product form fields
  const [fName, setFName] = useState('');
  const [fCategory, setFCategory] = useState('Rice');
  const [fPriceKRW, setFPriceKRW] = useState('');
  const [fOldPriceKRW, setFOldPriceKRW] = useState('');
  const [fMRP, setFMRP] = useState('');
  const [fSize, setFSize] = useState('1 kg');
  const [fWeightKg, setFWeightKg] = useState('1.0');
  const [fOrigin, setFOrigin] = useState<'India' | 'Nepal' | 'South Korea'>('India');
  const [fBrand, setFBrand] = useState('');
  const [fTags, setFTags] = useState('');
  const [fImage, setFImage] = useState('');
  const [fVideoUrl, setFVideoUrl] = useState('');
  const [fDescription, setFDescription] = useState('');
  const [fStock, setFStock] = useState('100');
  const [fIsHidden, setFIsHidden] = useState(false);
  const [fIsBestSeller, setFIsBestSeller] = useState(false);
  const [fKeywordsEN, setFKeywordsEN] = useState('');
  const [fKeywordsKR, setFKeywordsKR] = useState('');
  const [productLoading, setProductLoading] = useState(false);

  // ── CATEGORIES ──────────────────────────────────────────────────────────
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [fCatName, setFCatName] = useState('');
  const [fCatIcon, setFCatIcon] = useState('🛒');
  const [fCatDesc, setFCatDesc] = useState('');
  const [fCatOrder, setFCatOrder] = useState('0');
  const [fCatActive, setFCatActive] = useState(true);

  // ── BANNERS ─────────────────────────────────────────────────────────────
  const [bannerModalVisible, setBannerModalVisible] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [fBannerImage, setFBannerImage] = useState('');
  const [fBannerTitle, setFBannerTitle] = useState('');
  const [fBannerSubtitle, setFBannerSubtitle] = useState('');
  const [fBannerLink, setFBannerLink] = useState('');
  const [fBannerOrder, setFBannerOrder] = useState('0');
  const [fBannerActive, setFBannerActive] = useState(true);

  // ── ANALYTICS ───────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenueKRW = orders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalKRW, 0);
    const outOfStockCount = products.filter((p) => (p.stock ?? 1) === 0).length;
    const pendingCount = orders.filter((o) => o.status === 'ORDER_PLACED' || o.status === 'PACKED').length;
    const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;

    // Last 7 days sales
    const now = Date.now();
    const dailySales = Array.from({ length: 7 }, (_, i) => {
      const dayStart = now - (6 - i) * 86400000;
      const dayEnd = dayStart + 86400000;
      const dayOrders = orders.filter(
        (o) => (o.createdAt || 0) >= dayStart && (o.createdAt || 0) < dayEnd
      );
      const date = new Date(dayStart).toLocaleDateString('en', { weekday: 'short' });
      return {
        date,
        revenueKRW: dayOrders.reduce((s, o) => s + o.totalKRW, 0),
        orders: dayOrders.length,
      };
    });

    // Revenue by product
    const productRevMap: Record<string, { name: string; soldCount: number; rev: number }> = {};
    orders.filter((o) => o.status !== 'CANCELLED').forEach((order) => {
      order.items.forEach((item) => {
        const pid = item.product.id;
        if (!productRevMap[pid]) {
          productRevMap[pid] = { name: item.product.name, soldCount: 0, rev: 0 };
        }
        productRevMap[pid].soldCount += item.quantity;
        productRevMap[pid].rev += item.product.priceKRW * item.quantity;
      });
    });
    const topProducts = Object.entries(productRevMap)
      .map(([id, d]) => ({ productId: id, name: d.name, soldCount: d.soldCount, revenueKRW: d.rev }))
      .sort((a, b) => b.revenueKRW - a.revenueKRW)
      .slice(0, 5);

    return { totalOrders, totalRevenueKRW, outOfStockCount, pendingCount, deliveredCount, dailySales, topProducts };
  }, [orders, products]);

  // ── MAX BAR VALUE FOR CHART ──────────────────────────────────────────────
  const maxDailyRevenue = Math.max(...analytics.dailySales.map((d) => d.revenueKRW), 1);

  // ═══════════════════════════════════════════════════════════════════════
  // AUTH HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const handleAdminLogin = async () => {
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setAuthError('Please enter email and password.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    try {
      const userCred = await signInWithEmailAndPassword(auth, adminEmail.trim().toLowerCase(), adminPassword);
      const email = userCred.user.email || '';

      // Check whitelist
      const isAllowed = ADMIN_EMAILS.includes(email) || email.endsWith('@namastemart.com');
      const isAdminInFirestore = await checkIsAdmin(userCred.user.uid).catch(() => false);

      if (!isAllowed && !isAdminInFirestore) {
        await auth.signOut();
        setAuthError('Access denied. This account does not have admin privileges.');
        setAuthLoading(false);
        return;
      }

      updateUserProfile({ isAdmin: true, isLoggedIn: true });
      setIsAuthenticated(true);
    } catch (error: any) {
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      setAuthError(errorMessages[error.code] || error.message || 'Login failed.');

      // Dev fallback: allow demo admin access
      if (adminEmail.toLowerCase() === 'admin' && adminPassword === 'admin123') {
        updateUserProfile({ isAdmin: true, isLoggedIn: true });
        setIsAuthenticated(true);
      }
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of admin?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          auth.signOut().catch(() => {});
          setIsAuthenticated(false);
          setAdminEmail('');
          setAdminPassword('');
        },
      },
    ]);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // ORDER HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchFilter = orderFilter === 'ALL' || o.status === orderFilter;
      const q = orderSearch.trim().toLowerCase();
      const matchSearch = !q || o.orderNumber.toLowerCase().includes(q) ||
        o.recipient.name.toLowerCase().includes(q) || o.recipient.phone.includes(q);
      return matchFilter && matchSearch;
    });
  }, [orders, orderFilter, orderSearch]);

  const handleUpdateOrderStatus = async (order: OrderItem, newStatus: OrderStatus) => {
    Alert.alert(
      'Update Order Status',
      `Change "${order.orderNumber}" to "${newStatus.replace(/_/g, ' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              // Update in context (immediate UI)
              updateOrderStatus(order.id, newStatus);

              // Update in Firestore
              await updateOrderStatusInFirestore(order.id, newStatus);

              // Send push notification
              await notifyOrderStatusChange(order.orderNumber, newStatus);

              // If customer has push token, send via Expo
              if (order.customerPushToken) {
                const { sendExpoPushNotification, getOrderStatusNotification } = await import('@/services/notifications');
                const { title, body } = getOrderStatusNotification(order.orderNumber, newStatus);
                await sendExpoPushNotification(order.customerPushToken, title, body, {
                  orderId: order.id,
                  status: newStatus,
                });
              }

              setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
            } catch (error: any) {
              Alert.alert('Update Failed', error.message || 'Could not update order status.');
            }
          },
        },
      ]
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PRODUCT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.trim().toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchCat = productCategoryFilter === 'All' || p.category === productCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, productSearch, productCategoryFilter]);

  const resetProductForm = () => {
    setFName(''); setFCategory('Rice'); setFPriceKRW(''); setFOldPriceKRW('');
    setFMRP(''); setFSize('1 kg'); setFWeightKg('1.0'); setFOrigin('India');
    setFBrand(''); setFTags(''); setFImage(''); setFVideoUrl(''); setFDescription('');
    setFStock('100'); setFIsHidden(false); setFIsBestSeller(false);
    setFKeywordsEN(''); setFKeywordsKR('');
    setEditingProductId(null);
  };

  const openAddProduct = () => {
    resetProductForm();
    setProductModalVisible(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setFName(p.name); setFCategory(p.category);
    setFPriceKRW(p.priceKRW.toString()); setFOldPriceKRW(p.oldPriceKRW.toString());
    setFMRP(p.mrp?.toString() || ''); setFSize(p.size); setFWeightKg(p.weightKg.toString());
    setFOrigin((p.origin as any) || 'India'); setFBrand(p.brand || '');
    setFTags(p.tags?.join(', ') || ''); setFImage(p.image); setFVideoUrl(p.videoUrl || '');
    setFDescription(p.description); setFStock((p.stock ?? 100).toString());
    setFIsHidden(p.isHidden || false); setFIsBestSeller(p.isBestSeller || false);
    setFKeywordsEN(p.keywords?.EN?.join(', ') || '');
    setFKeywordsKR(p.keywords?.KR?.join(', ') || '');
    setProductModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!fName.trim() || !fPriceKRW.trim()) {
      Alert.alert('Missing Fields', 'Please enter Product Name and Selling Price (KRW).');
      return;
    }
    setProductLoading(true);

    const priceKRW = parseInt(fPriceKRW, 10) || 10000;
    const oldPriceKRW = parseInt(fOldPriceKRW, 10) || Math.round(priceKRW * 1.2);
    const stock = parseInt(fStock, 10) || 0;
    const discountPct = Math.round(((oldPriceKRW - priceKRW) / oldPriceKRW) * 100);

    const productData: Omit<Product, 'id'> = {
      name: fName.trim(),
      category: fCategory,
      priceKRW,
      oldPriceKRW,
      mrp: parseInt(fMRP, 10) || undefined,
      discount: discountPct > 0 ? `${discountPct}% OFF` : '',
      size: fSize.trim() || '1 unit',
      weightKg: parseFloat(fWeightKg) || 1.0,
      origin: fOrigin,
      brand: fBrand.trim() || undefined,
      tags: fTags ? fTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      image: fImage.trim() || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
      videoUrl: fVideoUrl.trim() || undefined,
      description: fDescription.trim() || 'Quality product from NamasteMart.',
      stock,
      isHidden: fIsHidden,
      isBestSeller: fIsBestSeller,
      rating: 0,
      reviews: 0,
      keywords: {
        EN: fKeywordsEN ? fKeywordsEN.split(',').map((k) => k.trim()).filter(Boolean) : [],
        KR: fKeywordsKR ? fKeywordsKR.split(',').map((k) => k.trim()).filter(Boolean) : [],
      },
    };

    try {
      if (editingProductId) {
        await updateProductInFirestore(editingProductId, productData).catch(() => {});
        updateProduct(editingProductId, productData);
        Alert.alert('✅ Updated', `${fName} has been updated.`);
      } else {
        const newId = await addProductToFirestore(productData).catch(() => `local-${Date.now()}`);
        addProduct({ ...productData, id: newId } as any);
        Alert.alert('✅ Added', `${fName} has been added to the catalog.`);
      }
      setProductModalVisible(false);
      resetProductForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save product.');
    }
    setProductLoading(false);
  };

  const handleDeleteProduct = (p: Product) => {
    Alert.alert('Delete Product', `Delete "${p.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          deleteProduct(p.id);
          await deleteProductFromFirestore(p.id).catch(() => {});
        },
      },
    ]);
  };

  const handleDuplicateProduct = async (p: Product) => {
    const newId = await duplicateProductInFirestore(p).catch(() => `copy-${Date.now()}`);
    addProduct({ ...p, id: newId, name: `${p.name} (Copy)`, stock: 0 } as any);
    Alert.alert('✅ Duplicated', `A copy of "${p.name}" has been created.`);
  };

  const handleToggleHidden = async (p: Product) => {
    const newHidden = !p.isHidden;
    updateProduct(p.id, { ...p, isHidden: newHidden });
    await updateProductInFirestore(p.id, { isHidden: newHidden }).catch(() => {});
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CATEGORY HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const categories: Category[] = ctxCategories?.length
    ? ctxCategories
    : PRODUCT_CATEGORIES.map((name, i) => ({
        id: `cat-${i}`, name, icon: '🛒', displayOrder: i, isActive: true,
      }));

  const openAddCategory = () => {
    setEditingCategoryId(null); setFCatName(''); setFCatIcon('🛒');
    setFCatDesc(''); setFCatOrder('0'); setFCatActive(true);
    setCategoryModalVisible(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id); setFCatName(cat.name); setFCatIcon(cat.icon);
    setFCatDesc(cat.description || ''); setFCatOrder(cat.displayOrder.toString());
    setFCatActive(cat.isActive);
    setCategoryModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!fCatName.trim()) { Alert.alert('Required', 'Category name is required.'); return; }
    const data: Omit<Category, 'id'> = {
      name: fCatName.trim(), icon: fCatIcon || '🛒',
      description: fCatDesc.trim(), displayOrder: parseInt(fCatOrder) || 0, isActive: fCatActive,
    };
    try {
      if (editingCategoryId) {
        await updateCategoryInFirestore(editingCategoryId, data).catch(() => {});
      } else {
        await addCategoryToFirestore(data).catch(() => {});
      }
      Alert.alert('✅ Saved', `Category "${fCatName}" has been saved.`);
      setCategoryModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert('Delete Category', `Delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteCategoryFromFirestore(cat.id).catch(() => {}),
      },
    ]);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // BANNER HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const banners: Banner[] = ctxBanners || [];

  const openAddBanner = () => {
    setEditingBannerId(null); setFBannerImage(''); setFBannerTitle('');
    setFBannerSubtitle(''); setFBannerLink(''); setFBannerOrder('0'); setFBannerActive(true);
    setBannerModalVisible(true);
  };

  const openEditBanner = (b: Banner) => {
    setEditingBannerId(b.id); setFBannerImage(b.imageUrl); setFBannerTitle(b.title || '');
    setFBannerSubtitle(b.subtitle || ''); setFBannerLink(b.linkTarget || '');
    setFBannerOrder(b.displayOrder.toString()); setFBannerActive(b.isActive);
    setBannerModalVisible(true);
  };

  const handleSaveBanner = async () => {
    if (!fBannerImage.trim()) { Alert.alert('Required', 'Banner image URL is required.'); return; }
    const data: Omit<Banner, 'id'> = {
      imageUrl: fBannerImage.trim(), title: fBannerTitle.trim(), subtitle: fBannerSubtitle.trim(),
      linkTarget: fBannerLink.trim(), displayOrder: parseInt(fBannerOrder) || 0, isActive: fBannerActive,
    };
    try {
      if (editingBannerId) {
        await updateBannerInFirestore(editingBannerId, data).catch(() => {});
      } else {
        await addBannerToFirestore(data).catch(() => {});
      }
      Alert.alert('✅ Saved', 'Banner has been saved.');
      setBannerModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDERS
  // ═══════════════════════════════════════════════════════════════════════

  if (!isAuthenticated) {
    return <AdminLoginScreen
      S={S} isDarkMode={isDarkMode}
      adminEmail={adminEmail} setAdminEmail={setAdminEmail}
      adminPassword={adminPassword} setAdminPassword={setAdminPassword}
      showPassword={showPassword} setShowPassword={setShowPassword}
      authLoading={authLoading} authError={authError}
      handleAdminLogin={handleAdminLogin}
    />;
  }

  return (
    <SafeAreaView style={S.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <View>
          <Text style={S.headerTitle}>🏪 NamasteMart Admin</Text>
          <Text style={S.headerSub}>
            {analytics.totalOrders} orders · ₩{analytics.totalRevenueKRW.toLocaleString()} revenue
          </Text>
        </View>
        <TouchableOpacity style={S.logoutBtn} onPress={handleLogout}>
          <Text style={S.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB BAR ────────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabBar} contentContainerStyle={S.tabBarContent}>
        {(['DASHBOARD', 'ORDERS', 'PRODUCTS', 'CATEGORIES', 'BANNERS'] as AdminTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[S.tabBtn, activeTab === tab && S.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[S.tabBtnText, activeTab === tab && S.tabBtnTextActive]}>
              {tab === 'DASHBOARD' && '📊 '}
              {tab === 'ORDERS' && '🛒 '}
              {tab === 'PRODUCTS' && '📦 '}
              {tab === 'CATEGORIES' && '🏷️ '}
              {tab === 'BANNERS' && '🖼️ '}
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* DASHBOARD TAB                                                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'DASHBOARD' && (
        <ScrollView
          style={S.scrollArea}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C851" />}
        >
          {/* Stat Cards */}
          <View style={S.statsGrid}>
            <StatCard S={S} emoji="🛒" label="Total Orders" value={analytics.totalOrders.toString()} color="#6366F1" />
            <StatCard S={S} emoji="💰" label="Revenue (KRW)" value={`₩${(analytics.totalRevenueKRW / 1000).toFixed(0)}K`} color="#10B981" />
            <StatCard S={S} emoji="⏳" label="Pending" value={analytics.pendingCount.toString()} color="#F59E0B" />
            <StatCard S={S} emoji="⚠️" label="Out of Stock" value={analytics.outOfStockCount.toString()} color="#EF4444" />
            <StatCard S={S} emoji="✅" label="Delivered" value={analytics.deliveredCount.toString()} color="#0EA5E9" />
            <StatCard S={S} emoji="📦" label="Products" value={products.length.toString()} color="#8B5CF6" />
          </View>

          {/* Sales Bar Chart — Last 7 Days */}
          <View style={S.sectionCard}>
            <Text style={S.sectionTitle}>📈 Last 7 Days Revenue</Text>
            <View style={S.barChart}>
              {analytics.dailySales.map((day, i) => {
                const barH = maxDailyRevenue > 0 ? (day.revenueKRW / maxDailyRevenue) * 100 : 0;
                return (
                  <View key={i} style={S.barColumn}>
                    <Text style={S.barValue}>
                      {day.revenueKRW > 0 ? `₩${(day.revenueKRW / 1000).toFixed(0)}K` : ''}
                    </Text>
                    <View style={[S.bar, { height: Math.max(barH, 4), backgroundColor: barH > 50 ? '#00C851' : '#00C85166' }]} />
                    <Text style={S.barLabel}>{day.date}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Top Products */}
          <View style={S.sectionCard}>
            <Text style={S.sectionTitle}>🏆 Top 5 Products by Revenue</Text>
            {analytics.topProducts.length === 0 ? (
              <Text style={S.emptyText}>No orders yet</Text>
            ) : (
              analytics.topProducts.map((p, i) => (
                <View key={p.productId} style={S.topProductRow}>
                  <Text style={S.topProductRank}>#{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={S.topProductName} numberOfLines={1}>{p.name}</Text>
                    <Text style={S.topProductSub}>{p.soldCount} sold</Text>
                  </View>
                  <Text style={S.topProductRev}>₩{p.revenueKRW.toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>

          {/* Out of Stock Alert */}
          {analytics.outOfStockCount > 0 && (
            <View style={[S.sectionCard, { borderLeftWidth: 4, borderLeftColor: '#EF4444' }]}>
              <Text style={S.sectionTitle}>⚠️ Out of Stock ({analytics.outOfStockCount})</Text>
              {products.filter((p) => (p.stock ?? 1) === 0).map((p) => (
                <View key={p.id} style={S.outOfStockRow}>
                  <Text style={S.outOfStockName} numberOfLines={1}>{p.name}</Text>
                  <TouchableOpacity
                    style={S.restockBtn}
                    onPress={() => openEditProduct(p)}
                  >
                    <Text style={S.restockBtnText}>Restock</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ORDERS TAB                                                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ORDERS' && (
        <View style={{ flex: 1 }}>
          {/* Search */}
          <View style={S.searchRow}>
            <TextInput
              style={S.searchInput}
              value={orderSearch}
              onChangeText={setOrderSearch}
              placeholder="Search by order #, customer..."
              placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
            />
          </View>

          {/* Status Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.filterRow}>
            {(['ALL', 'ORDER_PLACED', 'PACKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as OrderFilter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[S.filterChip, orderFilter === f && S.filterChipActive]}
                onPress={() => setOrderFilter(f)}
              >
                <Text style={[S.filterChipText, orderFilter === f && S.filterChipTextActive]}>
                  {f.replace(/_/g, ' ')} ({f === 'ALL' ? orders.length : orders.filter((o) => o.status === f).length})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C851" />}
            contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
            ListEmptyComponent={<Text style={S.emptyText}>No orders found</Text>}
            renderItem={({ item: order }) => {
              const statusCfg = ORDER_STATUSES.find((s) => s.value === order.status);
              return (
                <TouchableOpacity
                  style={S.orderCard}
                  onPress={() => { setSelectedOrder(order); setOrderModalVisible(true); }}
                  activeOpacity={0.8}
                >
                  <View style={S.orderCardHeader}>
                    <Text style={S.orderNumber}>{order.orderNumber}</Text>
                    <View style={[S.statusBadge, { backgroundColor: (statusCfg?.color || '#999') + '20' }]}>
                      <Text style={[S.statusBadgeText, { color: statusCfg?.color || '#999' }]}>
                        {statusCfg?.emoji} {statusCfg?.label || order.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={S.orderCustomer}>👤 {order.recipient.name} · {order.recipient.phone}</Text>
                  <Text style={S.orderAddress} numberOfLines={1}>
                    📍 {order.recipient.address}, {order.recipient.city}
                  </Text>
                  <View style={S.orderFooter}>
                    <Text style={S.orderTotal}>₩{order.totalKRW.toLocaleString()}</Text>
                    <Text style={S.orderDate}>{order.date}</Text>
                    <Text style={S.orderItems}>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* PRODUCTS TAB                                                     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'PRODUCTS' && (
        <View style={{ flex: 1 }}>
          <View style={S.searchRow}>
            <TextInput
              style={[S.searchInput, { flex: 1 }]}
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search products..."
              placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
            />
            <TouchableOpacity style={S.addBtn} onPress={openAddProduct}>
              <Text style={S.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.filterRow}>
            {['All', ...PRODUCT_CATEGORIES].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[S.filterChip, productCategoryFilter === cat && S.filterChipActive]}
                onPress={() => setProductCategoryFilter(cat)}
              >
                <Text style={[S.filterChipText, productCategoryFilter === cat && S.filterChipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C851" />}
            contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
            ListEmptyComponent={<Text style={S.emptyText}>No products found</Text>}
            renderItem={({ item: product }) => {
              const isOutOfStock = (product.stock ?? 1) === 0;
              return (
                <View style={[S.productCard, product.isHidden && { opacity: 0.5 }]}>
                  <Image source={{ uri: product.image }} style={S.productCardImage} />
                  <View style={S.productCardBody}>
                    <View style={S.productCardHeader}>
                      <Text style={S.productCardName} numberOfLines={2}>{product.name}</Text>
                      {isOutOfStock && <View style={S.oosTag}><Text style={S.oosTagText}>OUT OF STOCK</Text></View>}
                      {product.isHidden && <View style={S.hiddenTag}><Text style={S.hiddenTagText}>HIDDEN</Text></View>}
                    </View>
                    <Text style={S.productCardMeta}>
                      {product.category} · ₩{product.priceKRW.toLocaleString()} · Stock: {product.stock ?? '?'}
                    </Text>
                    <View style={S.productCardActions}>
                      <TouchableOpacity style={S.actionBtn} onPress={() => openEditProduct(product)}>
                        <Text style={S.actionBtnText}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={S.actionBtn} onPress={() => handleToggleHidden(product)}>
                        <Text style={S.actionBtnText}>{product.isHidden ? '👁️ Show' : '🚫 Hide'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={S.actionBtn} onPress={() => handleDuplicateProduct(product)}>
                        <Text style={S.actionBtnText}>📋 Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[S.actionBtn, { backgroundColor: '#EF444420' }]} onPress={() => handleDeleteProduct(product)}>
                        <Text style={[S.actionBtnText, { color: '#EF4444' }]}>🗑️ Del</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* CATEGORIES TAB                                                   */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'CATEGORIES' && (
        <View style={{ flex: 1 }}>
          <View style={[S.searchRow, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity style={S.addBtn} onPress={openAddCategory}>
              <Text style={S.addBtnText}>+ Add Category</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
            {categories.map((cat) => (
              <View key={cat.id} style={S.categoryRow}>
                <Text style={S.catIcon}>{cat.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.catName}>{cat.name}</Text>
                  {cat.description ? <Text style={S.catDesc}>{cat.description}</Text> : null}
                </View>
                <View style={[S.activeDot, { backgroundColor: cat.isActive ? '#10B981' : '#EF4444' }]} />
                <TouchableOpacity style={S.catEditBtn} onPress={() => openEditCategory(cat)}>
                  <Text style={S.catEditText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.catEditBtn, { backgroundColor: '#EF444420' }]} onPress={() => handleDeleteCategory(cat)}>
                  <Text style={[S.catEditText, { color: '#EF4444' }]}>Del</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* BANNERS TAB                                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'BANNERS' && (
        <View style={{ flex: 1 }}>
          <View style={[S.searchRow, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity style={S.addBtn} onPress={openAddBanner}>
              <Text style={S.addBtnText}>+ Add Banner</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
            {banners.length === 0 && <Text style={S.emptyText}>No banners yet. Add your first hero banner!</Text>}
            {banners.map((banner) => (
              <View key={banner.id} style={S.bannerCard}>
                <Image source={{ uri: banner.imageUrl }} style={S.bannerCardImage} resizeMode="cover" />
                <View style={S.bannerCardBody}>
                  <Text style={S.bannerCardTitle}>{banner.title || 'No Title'}</Text>
                  <Text style={S.bannerCardSub} numberOfLines={1}>{banner.subtitle || ''}</Text>
                  <Text style={S.bannerCardLink}>→ {banner.linkTarget || 'No link'}</Text>
                  <View style={S.productCardActions}>
                    <TouchableOpacity style={S.actionBtn} onPress={() => openEditBanner(banner)}>
                      <Text style={S.actionBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={S.actionBtn}
                      onPress={() => updateBannerInFirestore(banner.id, { isActive: !banner.isActive }).catch(() => {})}
                    >
                      <Text style={S.actionBtnText}>{banner.isActive ? '🚫 Hide' : '👁️ Show'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[S.actionBtn, { backgroundColor: '#EF444420' }]}
                      onPress={() => Alert.alert('Delete', 'Delete this banner?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteBannerFromFirestore(banner.id).catch(() => {}) },
                      ])}
                    >
                      <Text style={[S.actionBtnText, { color: '#EF4444' }]}>🗑️ Del</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ORDER DETAIL MODAL                                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal visible={orderModalVisible} animationType="slide" onRequestClose={() => setOrderModalVisible(false)}>
        <SafeAreaView style={S.modalContainer}>
          <View style={S.modalHeader}>
            <TouchableOpacity onPress={() => setOrderModalVisible(false)} style={S.modalCloseBtn}>
              <Text style={S.modalCloseBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={S.modalTitle}>Order Details</Text>
            <View style={{ width: 60 }} />
          </View>

          {selectedOrder && (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
              <Text style={S.modalOrderNum}>{selectedOrder.orderNumber}</Text>
              <Text style={S.modalOrderDate}>{selectedOrder.date}</Text>

              {/* Customer Info */}
              <View style={S.modalSection}>
                <Text style={S.modalSectionTitle}>👤 Customer Details</Text>
                <Text style={S.modalInfoText}>Name: {selectedOrder.recipient.name}</Text>
                <Text style={S.modalInfoText}>Phone: {selectedOrder.recipient.phone}</Text>
                <Text style={S.modalInfoText}>Address: {selectedOrder.recipient.address}</Text>
                <Text style={S.modalInfoText}>City: {selectedOrder.recipient.city}</Text>
                <Text style={S.modalInfoText}>Postal: {selectedOrder.recipient.postalCode}</Text>
                <Text style={S.modalInfoText}>Country: {selectedOrder.recipient.country}</Text>
                {selectedOrder.paymentMethod && (
                  <Text style={S.modalInfoText}>Payment: {selectedOrder.paymentMethod}</Text>
                )}
              </View>

              {/* Items */}
              <View style={S.modalSection}>
                <Text style={S.modalSectionTitle}>📦 Order Items</Text>
                {selectedOrder.items.map((item, i) => (
                  <View key={i} style={S.modalItemRow}>
                    <Image source={{ uri: item.product.image }} style={S.modalItemImage} />
                    <View style={{ flex: 1 }}>
                      <Text style={S.modalItemName} numberOfLines={2}>{item.product.name}</Text>
                      <Text style={S.modalItemMeta}>Qty: {item.quantity} · ₩{(item.product.priceKRW * item.quantity).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Payment Summary */}
              <View style={S.modalSection}>
                <Text style={S.modalSectionTitle}>💰 Payment Summary</Text>
                <View style={S.payRow}><Text style={S.payLabel}>Subtotal</Text><Text style={S.payValue}>₩{selectedOrder.subtotalKRW.toLocaleString()}</Text></View>
                <View style={S.payRow}><Text style={S.payLabel}>Shipping</Text><Text style={S.payValue}>₩{selectedOrder.shippingFeeKRW.toLocaleString()}</Text></View>
                {selectedOrder.discountKRW > 0 && <View style={S.payRow}><Text style={[S.payLabel, { color: '#10B981' }]}>Discount</Text><Text style={[S.payValue, { color: '#10B981' }]}>-₩{selectedOrder.discountKRW.toLocaleString()}</Text></View>}
                <View style={[S.payRow, { borderTopWidth: 1, borderTopColor: isDarkMode ? '#333' : '#eee', marginTop: 8, paddingTop: 8 }]}>
                  <Text style={[S.payLabel, { fontWeight: '900' }]}>Total</Text>
                  <Text style={[S.payValue, { fontWeight: '900', fontSize: 18 }]}>₩{selectedOrder.totalKRW.toLocaleString()}</Text>
                </View>
              </View>

              {/* Status Update */}
              <View style={S.modalSection}>
                <Text style={S.modalSectionTitle}>🔄 Update Status</Text>
                <View style={S.statusGrid}>
                  {ORDER_STATUSES.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={[S.statusBtn, selectedOrder.status === s.value && { backgroundColor: s.color + '30', borderColor: s.color }]}
                      onPress={() => handleUpdateOrderStatus(selectedOrder, s.value)}
                    >
                      <Text style={S.statusBtnEmoji}>{s.emoji}</Text>
                      <Text style={[S.statusBtnText, selectedOrder.status === s.value && { color: s.color }]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* PRODUCT MODAL                                                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <Modal visible={productModalVisible} animationType="slide" onRequestClose={() => setProductModalVisible(false)}>
        <SafeAreaView style={S.modalContainer}>
          <View style={S.modalHeader}>
            <TouchableOpacity onPress={() => setProductModalVisible(false)} style={S.modalCloseBtn}>
              <Text style={S.modalCloseBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={S.modalTitle}>{editingProductId ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity style={S.modalSaveBtn} onPress={handleSaveProduct} disabled={productLoading}>
              <Text style={S.modalSaveBtnText}>{productLoading ? '...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
              <ProductFormField label="Product Name *" value={fName} onChangeText={setFName} placeholder="e.g. India Gate Basmati Rice" S={S} />
              <ProductFormField label="Description" value={fDescription} onChangeText={setFDescription} placeholder="Describe the product..." S={S} multiline />
              <ProductFormField label="Brand" value={fBrand} onChangeText={setFBrand} placeholder="e.g. India Gate, Aashirvaad" S={S} />
              <ProductFormField label="Tags (comma-separated)" value={fTags} onChangeText={setFTags} placeholder="rice, basmati, indian" S={S} />

              {/* Category */}
              <Text style={S.fieldLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <TouchableOpacity key={cat} style={[S.catChip, fCategory === cat && S.catChipActive]} onPress={() => setFCategory(cat)}>
                    <Text style={[S.catChipText, fCategory === cat && S.catChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Origin */}
              <Text style={S.fieldLabel}>Origin *</Text>
              <View style={S.chipRow}>
                {(['India', 'Nepal', 'South Korea'] as const).map((o) => (
                  <TouchableOpacity key={o} style={[S.catChip, fOrigin === o && S.catChipActive]} onPress={() => setFOrigin(o)}>
                    <Text style={[S.catChipText, fOrigin === o && S.catChipTextActive]}>{o}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Prices */}
              <View style={S.fieldRow}>
                <View style={{ flex: 1 }}>
                  <ProductFormField label="Selling Price KRW *" value={fPriceKRW} onChangeText={setFPriceKRW} placeholder="15000" S={S} keyboardType="number-pad" />
                </View>
                <View style={{ width: 8 }} />
                <View style={{ flex: 1 }}>
                  <ProductFormField label="Old Price KRW" value={fOldPriceKRW} onChangeText={setFOldPriceKRW} placeholder="18000" S={S} keyboardType="number-pad" />
                </View>
              </View>

              <View style={S.fieldRow}>
                <View style={{ flex: 1 }}>
                  <ProductFormField label="MRP (₹/रू)" value={fMRP} onChangeText={setFMRP} placeholder="Optional" S={S} keyboardType="number-pad" />
                </View>
                <View style={{ width: 8 }} />
                <View style={{ flex: 1 }}>
                  <ProductFormField label="Stock Qty *" value={fStock} onChangeText={setFStock} placeholder="100" S={S} keyboardType="number-pad" />
                </View>
              </View>

              <View style={S.fieldRow}>
                <View style={{ flex: 1 }}>
                  <ProductFormField label="Size / Unit" value={fSize} onChangeText={setFSize} placeholder="1 kg" S={S} />
                </View>
                <View style={{ width: 8 }} />
                <View style={{ flex: 1 }}>
                  <ProductFormField label="Weight (kg)" value={fWeightKg} onChangeText={setFWeightKg} placeholder="1.0" S={S} keyboardType="decimal-pad" />
                </View>
              </View>

              <ProductFormField label="Image URL *" value={fImage} onChangeText={setFImage} placeholder="https://..." S={S} />
              <ProductFormField label="Video URL (optional)" value={fVideoUrl} onChangeText={setFVideoUrl} placeholder="https://..." S={S} />
              <ProductFormField label="Keywords EN (comma-sep)" value={fKeywordsEN} onChangeText={setFKeywordsEN} placeholder="rice, basmati" S={S} />
              <ProductFormField label="Keywords KR (comma-sep)" value={fKeywordsKR} onChangeText={setFKeywordsKR} placeholder="쌀, 바스마티" S={S} />

              {/* Toggles */}
              <View style={S.toggleRow}>
                <Text style={S.toggleLabel}>🏆 Best Seller</Text>
                <Switch value={fIsBestSeller} onValueChange={setFIsBestSeller} trackColor={{ false: '#767577', true: '#00C851' }} />
              </View>
              <View style={S.toggleRow}>
                <Text style={S.toggleLabel}>🚫 Hide from Store</Text>
                <Switch value={fIsHidden} onValueChange={setFIsHidden} trackColor={{ false: '#767577', true: '#EF4444' }} />
              </View>

              {/* Preview */}
              {fImage ? (
                <View style={S.imagePreview}>
                  <Text style={S.fieldLabel}>Image Preview</Text>
                  <Image source={{ uri: fImage }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
                </View>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal visible={categoryModalVisible} animationType="slide" onRequestClose={() => setCategoryModalVisible(false)}>
        <SafeAreaView style={S.modalContainer}>
          <View style={S.modalHeader}>
            <TouchableOpacity onPress={() => setCategoryModalVisible(false)} style={S.modalCloseBtn}>
              <Text style={S.modalCloseBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={S.modalTitle}>{editingCategoryId ? 'Edit Category' : 'Add Category'}</Text>
            <TouchableOpacity style={S.modalSaveBtn} onPress={handleSaveCategory}>
              <Text style={S.modalSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <ProductFormField label="Category Name *" value={fCatName} onChangeText={setFCatName} placeholder="e.g. Masala" S={S} />
            <ProductFormField label="Icon Emoji" value={fCatIcon} onChangeText={setFCatIcon} placeholder="🌶️" S={S} />
            <ProductFormField label="Description" value={fCatDesc} onChangeText={setFCatDesc} placeholder="Spices & Herbs" S={S} />
            <ProductFormField label="Display Order" value={fCatOrder} onChangeText={setFCatOrder} placeholder="0" S={S} keyboardType="number-pad" />
            <View style={S.toggleRow}>
              <Text style={S.toggleLabel}>Active / Visible</Text>
              <Switch value={fCatActive} onValueChange={setFCatActive} trackColor={{ false: '#767577', true: '#00C851' }} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* BANNER MODAL */}
      <Modal visible={bannerModalVisible} animationType="slide" onRequestClose={() => setBannerModalVisible(false)}>
        <SafeAreaView style={S.modalContainer}>
          <View style={S.modalHeader}>
            <TouchableOpacity onPress={() => setBannerModalVisible(false)} style={S.modalCloseBtn}>
              <Text style={S.modalCloseBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={S.modalTitle}>{editingBannerId ? 'Edit Banner' : 'Add Banner'}</Text>
            <TouchableOpacity style={S.modalSaveBtn} onPress={handleSaveBanner}>
              <Text style={S.modalSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <ProductFormField label="Image URL *" value={fBannerImage} onChangeText={setFBannerImage} placeholder="https://..." S={S} />
            {fBannerImage ? (
              <Image source={{ uri: fBannerImage }} style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }} resizeMode="cover" />
            ) : null}
            <ProductFormField label="Title" value={fBannerTitle} onChangeText={setFBannerTitle} placeholder="🎉 Festival Sale" S={S} />
            <ProductFormField label="Subtitle" value={fBannerSubtitle} onChangeText={setFBannerSubtitle} placeholder="Up to 30% off" S={S} />
            <ProductFormField label="Link Target (category/product)" value={fBannerLink} onChangeText={setFBannerLink} placeholder="Masala" S={S} />
            <ProductFormField label="Display Order" value={fBannerOrder} onChangeText={setFBannerOrder} placeholder="0" S={S} keyboardType="number-pad" />
            <View style={S.toggleRow}>
              <Text style={S.toggleLabel}>Active / Visible</Text>
              <Switch value={fBannerActive} onValueChange={setFBannerActive} trackColor={{ false: '#767577', true: '#00C851' }} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function AdminLoginScreen({ S, isDarkMode, adminEmail, setAdminEmail, adminPassword, setAdminPassword,
  showPassword, setShowPassword, authLoading, authError, handleAdminLogin }: any) {
  return (
    <SafeAreaView style={S.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
          <View style={S.loginCard}>
            <View style={S.loginIconCircle}>
              <Text style={{ fontSize: 40 }}>🏪</Text>
            </View>
            <Text style={S.loginTitle}>NamasteMart Admin</Text>
            <Text style={S.loginSub}>Secure admin access only</Text>

            <Text style={S.fieldLabel}>Admin Email</Text>
            <TextInput
              style={S.loginInput}
              value={adminEmail}
              onChangeText={setAdminEmail}
              placeholder="admin@namastemart.com"
              placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={S.fieldLabel}>Password</Text>
            <View style={S.passwordRow}>
              <TextInput
                style={[S.loginInput, { flex: 1, marginBottom: 0 }]}
                value={adminPassword}
                onChangeText={setAdminPassword}
                placeholder="Enter password"
                placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
                secureTextEntry={!showPassword}
                onSubmitEditing={handleAdminLogin}
              />
              <TouchableOpacity style={S.showPassBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={S.showPassText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {authError ? <Text style={S.authErrorText}>{authError}</Text> : null}

            <TouchableOpacity style={S.loginBtn} onPress={handleAdminLogin} disabled={authLoading}>
              <Text style={S.loginBtnText}>{authLoading ? 'Signing In...' : '🔐 Sign In to Admin'}</Text>
            </TouchableOpacity>

            <Text style={S.loginHint}>Demo: email = "admin" · password = "admin123"</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatCard({ S, emoji, label, value, color }: any) {
  return (
    <View style={[S.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={S.statEmoji}>{emoji}</Text>
      <Text style={[S.statValue, { color }]}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

function ProductFormField({ S, label, value, onChangeText, placeholder, multiline, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={S.fieldLabel}>{label}</Text>
      <TextInput
        style={[S.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const getStyles = (isDark: boolean) => {
  const bg = isDark ? '#0A0A0F' : '#F0FFF4';
  const cardBg = isDark ? 'rgba(18,24,18,0.98)' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#0A1A0A';
  const textSub = isDark ? '#8A9A8A' : '#4A6A4A';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,128,0,0.1)';
  const inputBg = isDark ? '#111A11' : '#F0FFF4';
  const GREEN = '#00C851';
  const DARK_GREEN = '#007A30';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: isDark ? '#0D1A0D' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: border },
    headerTitle: { fontSize: 18, fontWeight: '900', color: GREEN },
    headerSub: { fontSize: 12, color: textSub, marginTop: 2 },
    logoutBtn: { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    logoutText: { fontSize: 12, fontWeight: '800', color: '#EF4444' },
    // Tabs
    tabBar: { maxHeight: 46, backgroundColor: isDark ? '#0D1A0D' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: border },
    tabBarContent: { paddingHorizontal: 12, alignItems: 'center', gap: 6, paddingVertical: 6 },
    tabBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'transparent' },
    tabBtnActive: { backgroundColor: isDark ? 'rgba(0,200,81,0.15)' : 'rgba(0,200,81,0.1)', borderWidth: 1, borderColor: GREEN },
    tabBtnText: { fontSize: 12, fontWeight: '700', color: textSub },
    tabBtnTextActive: { color: GREEN },
    // Scroll
    scrollArea: { flex: 1 },
    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 },
    statCard: { flex: 1, minWidth: '30%', backgroundColor: cardBg, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: border },
    statEmoji: { fontSize: 22, marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: '900' },
    statLabel: { fontSize: 11, color: textSub, textAlign: 'center', marginTop: 2 },
    // Chart
    sectionCard: { margin: 12, marginTop: 4, backgroundColor: cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: border },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: textMain, marginBottom: 12 },
    barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 6, justifyContent: 'space-between' },
    barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    bar: { width: '100%', borderRadius: 4, minHeight: 4 },
    barLabel: { fontSize: 9, color: textSub, marginTop: 4, fontWeight: '700' },
    barValue: { fontSize: 8, color: textSub, marginBottom: 2 },
    // Top Products
    topProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: border, gap: 8 },
    topProductRank: { fontSize: 16, fontWeight: '900', color: GREEN, width: 28 },
    topProductName: { fontSize: 13, fontWeight: '700', color: textMain },
    topProductSub: { fontSize: 11, color: textSub },
    topProductRev: { fontSize: 13, fontWeight: '800', color: GREEN },
    // Out of Stock
    outOfStockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
    outOfStockName: { flex: 1, fontSize: 13, color: textMain },
    restockBtn: { backgroundColor: GREEN + '20', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
    restockBtnText: { fontSize: 12, fontWeight: '800', color: GREEN },
    // Orders
    searchRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
    searchInput: { flex: 1, backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: textMain, borderWidth: 1, borderColor: border },
    filterRow: { paddingHorizontal: 12, paddingBottom: 8, maxHeight: 46 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: inputBg, marginRight: 6, borderWidth: 1, borderColor: border },
    filterChipActive: { backgroundColor: GREEN + '20', borderColor: GREEN },
    filterChipText: { fontSize: 11, fontWeight: '700', color: textSub },
    filterChipTextActive: { color: GREEN },
    orderCard: { backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: border },
    orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    orderNumber: { fontSize: 15, fontWeight: '900', color: textMain },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusBadgeText: { fontSize: 11, fontWeight: '800' },
    orderCustomer: { fontSize: 13, color: textSub, marginBottom: 2 },
    orderAddress: { fontSize: 12, color: textSub, marginBottom: 8 },
    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderTotal: { fontSize: 15, fontWeight: '900', color: GREEN },
    orderDate: { fontSize: 11, color: textSub },
    orderItems: { fontSize: 11, color: textSub },
    addBtn: { backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
    // Products
    productCard: { flexDirection: 'row', backgroundColor: cardBg, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: border, overflow: 'hidden' },
    productCardImage: { width: 90, height: 90 },
    productCardBody: { flex: 1, padding: 10 },
    productCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
    productCardName: { flex: 1, fontSize: 13, fontWeight: '800', color: textMain },
    productCardMeta: { fontSize: 11, color: textSub, marginBottom: 8 },
    productCardActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    actionBtn: { backgroundColor: inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    actionBtnText: { fontSize: 11, fontWeight: '700', color: textSub },
    oosTag: { backgroundColor: '#EF444420', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    oosTagText: { fontSize: 9, fontWeight: '900', color: '#EF4444' },
    hiddenTag: { backgroundColor: '#F59E0B20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    hiddenTagText: { fontSize: 9, fontWeight: '900', color: '#F59E0B' },
    // Categories
    categoryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: cardBg, borderRadius: 12, padding: 12, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: border },
    catIcon: { fontSize: 24 },
    catName: { fontSize: 14, fontWeight: '800', color: textMain },
    catDesc: { fontSize: 12, color: textSub },
    activeDot: { width: 8, height: 8, borderRadius: 4 },
    catEditBtn: { backgroundColor: inputBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    catEditText: { fontSize: 12, fontWeight: '700', color: textSub },
    // Banners
    bannerCard: { backgroundColor: cardBg, borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: border },
    bannerCardImage: { width: '100%', height: 120 },
    bannerCardBody: { padding: 12 },
    bannerCardTitle: { fontSize: 15, fontWeight: '800', color: textMain, marginBottom: 2 },
    bannerCardSub: { fontSize: 12, color: textSub, marginBottom: 4 },
    bannerCardLink: { fontSize: 11, color: GREEN, marginBottom: 8 },
    emptyText: { textAlign: 'center', color: textSub, fontSize: 14, marginTop: 40 },
    // Modal
    modalContainer: { flex: 1, backgroundColor: bg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: border },
    modalCloseBtn: { padding: 4 },
    modalCloseBtnText: { fontSize: 14, fontWeight: '700', color: GREEN },
    modalTitle: { fontSize: 16, fontWeight: '900', color: textMain },
    modalSaveBtn: { backgroundColor: GREEN, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6 },
    modalSaveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
    // Order Modal
    modalOrderNum: { fontSize: 22, fontWeight: '900', color: textMain, marginBottom: 4 },
    modalOrderDate: { fontSize: 13, color: textSub, marginBottom: 16 },
    modalSection: { backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: border },
    modalSectionTitle: { fontSize: 14, fontWeight: '900', color: textMain, marginBottom: 10 },
    modalInfoText: { fontSize: 13, color: textSub, marginBottom: 4 },
    modalItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    modalItemImage: { width: 60, height: 60, borderRadius: 8 },
    modalItemName: { fontSize: 13, fontWeight: '700', color: textMain },
    modalItemMeta: { fontSize: 12, color: textSub, marginTop: 2 },
    payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    payLabel: { fontSize: 14, color: textSub },
    payValue: { fontSize: 14, fontWeight: '700', color: textMain },
    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: border, backgroundColor: inputBg },
    statusBtnEmoji: { fontSize: 16 },
    statusBtnText: { fontSize: 12, fontWeight: '700', color: textSub },
    // Product Form
    fieldLabel: { fontSize: 11, fontWeight: '800', color: textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldInput: { backgroundColor: inputBg, borderWidth: 1, borderColor: border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: textMain },
    fieldRow: { flexDirection: 'row', gap: 8 },
    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: inputBg, borderWidth: 1.5, borderColor: 'transparent', marginRight: 6 },
    catChipActive: { backgroundColor: GREEN + '20', borderColor: GREEN },
    catChipText: { fontSize: 13, fontWeight: '700', color: textSub },
    catChipTextActive: { color: GREEN },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border, marginBottom: 4 },
    toggleLabel: { fontSize: 14, fontWeight: '700', color: textMain },
    imagePreview: { marginTop: 12 },
    // Login
    loginCard: { width: '100%', maxWidth: 400, backgroundColor: cardBg, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: GREEN + '40', shadowColor: GREEN, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    loginIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: GREEN + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    loginTitle: { fontSize: 24, fontWeight: '900', color: textMain, marginBottom: 4 },
    loginSub: { fontSize: 13, color: textSub, marginBottom: 24 },
    loginInput: { width: '100%', backgroundColor: inputBg, borderWidth: 1, borderColor: border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: textMain, marginBottom: 12 },
    passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, width: '100%' },
    showPassBtn: { padding: 10 },
    showPassText: { fontSize: 20 },
    authErrorText: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12, fontWeight: '600' },
    loginBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 15, width: '100%', alignItems: 'center', shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
    loginHint: { fontSize: 11, color: textSub, marginTop: 16, textAlign: 'center' },
  });
};
