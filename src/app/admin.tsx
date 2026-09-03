import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
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
import { supabase } from '@/config/supabase';
import * as ImagePicker from 'expo-image-picker';
import { ScreenLoader, ListSkeleton } from '@/components/ScreenLoader';
import {
  addProductToFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  checkIsAdmin,
} from '@/services/firestore';
import {
  subscribeAllOrdersAdmin,
  updateOrderStatusByAdmin,
  updateParcelStatusByAdmin,
} from '@/services/orderService';
import { subscribeAllUsersAdmin } from '@/services/userService';
import { verifyOrderPayment, rejectOrderPayment } from '@/services/paymentService';
import {
  subscribeToPendingPaymentsAdmin,
  subscribeToPaymentLogsAdmin,
  verifyBankTransferPaymentAdmin,
  rejectBankTransferPaymentAdmin,
  getPaymentVerificationLogs,
  FirestorePayment,
} from '@/services/firestorePaymentService';
import {
  getBankTransferSettings,
  updateBankTransferSettings,
  subscribeBankTransferSettings,
  DEFAULT_BANK_SETTINGS,
} from '@/services/bankSettingsService';
import { uploadProductImage } from '@/services/storage';
import { BankAccountInfo, KOREA_BANK_ACCOUNTS } from '@/data/mockData';
import {
  subscribeAllParcelsAdmin,
  updateParcelStatusAndPriceAdmin,
  subscribeParcelPricing,
  saveParcelPricingAdmin,
  deleteParcelPricingAdmin,
} from '@/services/parcelService';
import {
  subscribeAllItemRequestsAdmin,
  updateItemRequestAdmin,
} from '@/services/itemRequestService';
import { findProductImagesAI } from '@/services/aiImageService';
import {
  FirestoreUser,
  OrderItem,
  OrderStatus,
  Product,
  BankTransferSettings,
  PaymentVerificationLog,
  ParcelBookingRequest,
  ParcelPricingItem,
  ParcelStatus,
  ItemRequestRecord,
  ItemRequestStatus,
  AIImageOption,
} from '@/types';

function useScreenWidth() {
  const { width } = useWindowDimensions();
  return width;
}

// Admin verification: DB checkIsAdmin is source of truth; email list is fallback for instant UX
const ADMIN_EMAILS: string[] = [
  'parshanttanwar995@gmail.com',
  'dineshgodara571@gmail.com',
  'admin@namastemart.com',
];

// ─── PRODUCT CATEGORIES ───────────────────────────────────────────────────
const PRODUCT_CATEGORIES = [
  'Rice', 'Atta', 'Masala', 'Dal', 'Snacks', 'Drinks',
  'Sweets', 'Noodles', 'Festival', 'Jewelry', 'Clothes',
  'Perfumes', 'Pickles', 'Ghee & Oils', 'Papad', 'Other',
];

// ─── ORDER STATUSES PER SPEC ──────────────────────────────────────────────
const ORDER_STATUS_LIST = [
  'PAID (결제완료)',
  'Payment Pending',
  'Payment Submitted',
  'Payment Confirmed',
  'Order Confirmed',
  'Preparing Order',
  'Ready for Dispatch',
  'Parcel Received',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

// ─── PARCEL STATUSES PER SPEC ─────────────────────────────────────────────
const PARCEL_STATUS_LIST = [
  'Waiting for Parcel Processing',
  'Parcel Received',
  'Preparing for Dispatch',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

// ─── TABS ─────────────────────────────────────────────────────────────────
type AdminTab =
  | 'DASHBOARD'
  | 'PAYMENT_VERIFICATION'
  | 'PRODUCTS'
  | 'ADD_PRODUCT'
  | 'ORDERS'
  | 'PENDING_ORDERS'
  | 'PARCELS'
  | 'PARCEL_PRICING'
  | 'ITEM_REQUESTS'
  | 'CUSTOMERS'
  | 'ANALYTICS'
  | 'INVENTORY'
  | 'DISCOUNTS'
  | 'SETTINGS';

interface SidebarItem {
  id: AdminTab;
  label: string;
  icon: string;
  badge?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AdminScreen() {
  const router = useRouter();
  const { products, user, updateUserProfile, isDarkMode, addProduct, updateProduct, deleteProduct } = useApp();
  // @ts-ignore - isProductsLoading added to AppContextType but tsc cache may be stale
  const isProductsLoading: boolean = (useApp() as any).isProductsLoading ?? false;

  const S = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // ── AUTH STATE ──────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // ── ACTIVE TAB & RESPONSIVE DRAWER ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDesktop = useScreenWidth() >= 900;

  // ── REAL-TIME FIRESTORE DATA ────────────────────────────────────────────
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);
  const [allCustomers, setAllCustomers] = useState<FirestoreUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // ── CONFIGURABLE SETTINGS ───────────────────────────────────────────────
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [storeCurrency] = useState<string>('KRW (₩)');
  const [bankSettings, setBankSettings] = useState<BankTransferSettings>(DEFAULT_BANK_SETTINGS);
  const [isSavingBankSettings, setIsSavingBankSettings] = useState(false);

  // ── PAYMENT VERIFICATION & AUDIT TRAIL STATES ───────────────────────────
  const [firestorePendingPayments, setFirestorePendingPayments] = useState<FirestorePayment[]>([]);
  const [verificationLogs, setVerificationLogs] = useState<PaymentVerificationLog[]>([]);
  const [paymentVerificationSearch, setPaymentVerificationSearch] = useState('');
  const [paymentVerificationSubTab, setPaymentVerificationSubTab] = useState<'PENDING' | 'AUDIT_LOGS'>('PENDING');
  const [rejectModalOrder, setRejectModalOrder] = useState<OrderItem | FirestorePayment | any | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('입금자명 또는 입금액 불일치 (Sender name or amount mismatch)');
  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [newPaymentAlert, setNewPaymentAlert] = useState<string | null>(null);
  const [receivedAmountMap, setReceivedAmountMap] = useState<Record<string, string>>({});

  // ── SEARCH & FILTER STATES ──────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [productSortBy, setProductSortBy] = useState<'NAME' | 'PRICE_ASC' | 'PRICE_DESC' | 'STOCK_LOW' | 'SOLD_DESC'>('NAME');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  const [pendingSearch, setPendingSearch] = useState('');
  const [parcelSearch, setParcelSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [discountFilter, setDiscountFilter] = useState<'ALL' | 'DISCOUNTED'>('ALL');

  // ── ITEM REQUESTS SYSTEM STATES ─────────────────────────────────────────
  const [allItemRequests, setAllItemRequests] = useState<ItemRequestRecord[]>([]);
  const [hasNewPendingItemReq, setHasNewPendingItemReq] = useState(false);
  const [itemReqSearch, setItemReqSearch] = useState('');
  const [allParcelRequests, setAllParcelRequests] = useState<ParcelBookingRequest[]>([]);
  const [hasNewPendingParcel, setHasNewPendingParcel] = useState(false);
  const [pricingItemsAdmin, setPricingItemsAdmin] = useState<ParcelPricingItem[]>([]);
  const [selectedAdminParcel, setSelectedAdminParcel] = useState<ParcelBookingRequest | null>(null);
  const [confirmPriceInput, setConfirmPriceInput] = useState('');
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [editingPricingItem, setEditingPricingItem] = useState<ParcelPricingItem | null>(null);

  // Pricing Item Form
  const [pTitle, setPTitle] = useState('');
  const [pCategory, setPCategory] = useState('general');
  const [pIcon, setPIcon] = useState('📦');
  const [pUnitPrice, setPUnitPrice] = useState('10000');
  const [pUnit, setPUnit] = useState<'per_item' | 'per_kg'>('per_item');
  const [pDesc, setPDesc] = useState('');
  const [pWeight, setPWeight] = useState('1.0');
  const [pActive, setPActive] = useState(true);

  // ── MODAL STATES ────────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // ── ADD / EDIT PRODUCT FORM STATES ──────────────────────────────────────
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [fName, setFName] = useState('');
  const [fBrand, setFBrand] = useState('');
  const [fCategory, setFCategory] = useState('Rice');
  const [fDescription, setFDescription] = useState('');
  const [fImage, setFImage] = useState('');
  const [fPriceKRW, setFPriceKRW] = useState('10000');
  const [fDiscountPercent, setFDiscountPercent] = useState('0');
  const [fStock, setFStock] = useState('50');
  const [fAvailable, setFAvailable] = useState(true);
  const [productLoading, setProductLoading] = useState(false);

  // ── AI PRODUCT IMAGE FINDER STATES ──────────────────────────────────────
  const [aiImageOptions, setAiImageOptions] = useState<AIImageOption[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Auto-calculated final price based on original price and discount percentage
  const basePriceNum = parseInt(fPriceKRW, 10) || 0;
  const discountPctNum = Math.min(100, Math.max(0, parseFloat(fDiscountPercent) || 0));
  const calculatedFinalPrice = discountPctNum > 0
    ? Math.max(0, Math.round(basePriceNum - (basePriceNum * discountPctNum) / 100))
    : basePriceNum;

  // ── AUTO AUTH CHECK ON MOUNT ────────────────────────────────────────────
  useEffect(() => {
    const isUserAdmin =
      user?.isAdmin ||
      user?.role === 'admin' ||
      ADMIN_EMAILS.includes(user?.email || '');

    if (isUserAdmin) {
      setIsAuthenticated(true);
      return;
    }

    // Also check Supabase admins table (covers any email inserted via SQL)
    if (user?.isLoggedIn && user?.id && user.id !== 'guest') {
      supabase.auth.getUser().then(({ data }) => {
        const uid = data?.user?.id;
        if (uid) {
          checkIsAdmin(uid).then((isAdmin) => {
            if (isAdmin) setIsAuthenticated(true);
          }).catch(() => {});
        }
      });
    }
  }, [user]);

  // ── SUBSCRIBE TO ORDERS ACROSS ALL USERS IN REAL TIME ───────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeAllOrdersAdmin((orders) => {
      setAllOrders(orders);
    });
    return () => unsub();
  }, [isAuthenticated]);

  // ── SUBSCRIBE TO REGISTERED USERS IN REAL TIME ──────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeAllUsersAdmin((users) => {
      setAllCustomers(users);
    });
    return () => unsub();
  }, [isAuthenticated]);

  // ── SUBSCRIBE TO ITEM REQUESTS (India/Nepal -> Korea) IN REAL TIME ───────
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeAllItemRequestsAdmin((requests, hasPending) => {
      setAllItemRequests(requests);
      setHasNewPendingItemReq(hasPending);
    });
    return () => unsub();
  }, [isAuthenticated]);

  // ── SUBSCRIBE TO PARCEL BOOKINGS IN REAL TIME ───────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeAllParcelsAdmin((parcels, hasNewPending) => {
      setAllParcelRequests(parcels);
      setHasNewPendingParcel(hasNewPending);
    });
    return () => unsub();
  }, [isAuthenticated]);

  // ── SUBSCRIBE TO PARCEL PRICING IN REAL TIME ────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeParcelPricing((items) => {
      setPricingItemsAdmin(items);
    });
    return () => unsub();
  }, [isAuthenticated]);

  // ── SUBSCRIBE TO PENDING BANK TRANSFER PAYMENTS IN REAL TIME ────────────
  const prevPaymentCountRef = useRef<number>(0);
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeToPendingPaymentsAdmin((payments) => {
      setFirestorePendingPayments(payments);
      if (payments.length > prevPaymentCountRef.current && prevPaymentCountRef.current > 0) {
        const latest = payments[0];
        setNewPaymentAlert(
          `🔔 New Payment Verification Request: Order #${latest.orderNumber || latest.orderId} (₩${(latest.expectedAmount || latest.uploadedAmount || 0).toLocaleString()}) from ${latest.customerName || latest.senderName || 'Customer'}`
        );
      }
      prevPaymentCountRef.current = payments.length;
    });
    return () => unsub();
  }, [isAuthenticated]);

  // ── SUBSCRIBE TO VERIFICATION LOGS IN REAL TIME ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeToPaymentLogsAdmin((logs) => {
      setVerificationLogs(logs);
    });
    return () => unsub();
  }, [isAuthenticated]);

  // ── PULL TO REFRESH ─────────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS STATS & METRICS CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthStr = now.toISOString().slice(0, 7);

    // Filter non-cancelled orders for revenue
    const validOrders = allOrders.filter(
      (o) => o.status !== 'Cancelled' && o.status !== 'cancelled'
    );

    // Today's stats
    const todayOrders = validOrders.filter((o) => {
      const d = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : '';
      return d === todayStr;
    });
    const todaySalesAmount = todayOrders.reduce((s, o) => s + (o.totalAmount || o.totalKRW || 0), 0);
    const todayProductsSold = todayOrders.reduce(
      (s, o) => s + (o.items || []).reduce((is, i) => is + (i.quantity || 1), 0),
      0
    );

    // This month's stats
    const thisMonthOrders = validOrders.filter((o) => {
      const d = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 7) : '';
      return d === thisMonthStr;
    });
    const monthSalesAmount = thisMonthOrders.reduce((s, o) => s + (o.totalAmount || o.totalKRW || 0), 0);
    const monthProductsSold = thisMonthOrders.reduce(
      (s, o) => s + (o.items || []).reduce((is, i) => is + (i.quantity || 1), 0),
      0
    );

    // Pending orders
    const pendingOrdersList = allOrders.filter(
      (o) =>
        o.status !== 'Delivered' &&
        o.status !== 'delivered' &&
        o.status !== 'Cancelled' &&
        o.status !== 'cancelled'
    );
    const waitingPayment = allOrders.filter(
      (o) =>
        o.status === 'Payment Pending' ||
        o.status === 'payment_pending' ||
        o.status === 'Payment Submitted' ||
        o.status === 'payment_uploaded' ||
        (o.payment && !o.payment.verified)
    );
    const waitingParcel = allOrders.filter(
      (o) =>
        o.status === 'Payment Confirmed' ||
        o.status === 'payment_verified' ||
        o.status === 'Order Confirmed' ||
        o.status === 'Preparing Order' ||
        o.status === 'Ready for Dispatch'
    );

    // Additional Stats
    const deliveredCount = allOrders.filter((o) => o.status === 'Delivered' || o.status === 'delivered').length;
    const cancelledCount = allOrders.filter((o) => o.status === 'Cancelled' || o.status === 'cancelled').length;
    const pendingParcelsCount = allOrders.filter(
      (o) => !o.parcelStatus || o.parcelStatus === 'Waiting for Parcel Processing' || o.parcelStatus === 'Preparing for Dispatch'
    ).length;
    const receivedParcelsCount = allOrders.filter((o) => o.parcelStatus === 'Parcel Received').length;

    // Inventory counts
    const lowStockCount = products.filter(
      (p) => (p.stock ?? 10) > 0 && (p.stock ?? 10) <= lowStockThreshold
    ).length;
    const outOfStockCount = products.filter(
      (p) => (p.stock ?? 10) <= 0 || p.available === false
    ).length;

    // 7-day sales breakdown for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      const dStr = d.toISOString().slice(0, 10);
      const dayOrders = validOrders.filter((o) => {
        const od = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : '';
        return od === dStr;
      });
      const dayRev = dayOrders.reduce((s, o) => s + (o.totalAmount || o.totalKRW || 0), 0);
      return {
        label: d.toLocaleDateString('en', { weekday: 'short' }),
        revenue: dayRev,
        count: dayOrders.length,
      };
    });
    const maxDayRev = Math.max(...last7Days.map((d) => d.revenue), 1);

    // Top selling products leaderboard
    const salesMap: Record<string, { name: string; image: string; units: number; revenue: number }> = {};
    validOrders.forEach((order) => {
      (order.items || []).forEach((item: any) => {
        const pid = item.productId || item.product?.id || item.name || 'item';
        if (!salesMap[pid]) {
          salesMap[pid] = {
            name: item.name || item.product?.name || 'Product',
            image: item.imageUrl || item.product?.image || item.product?.imageUrl || '',
            units: 0,
            revenue: 0,
          };
        }
        const qty = item.quantity || 1;
        const price = item.finalPrice || item.originalPrice || item.product?.priceKRW || 0;
        salesMap[pid].units += qty;
        salesMap[pid].revenue += price * qty;
      });
    });
    const topSelling = Object.values(salesMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    return {
      todayOrdersCount: todayOrders.length,
      todaySalesAmount,
      todayProductsSold,
      pendingOrdersCount: pendingOrdersList.length,
      waitingPaymentCount: waitingPayment.length,
      waitingParcelCount: waitingParcel.length,
      monthOrdersCount: thisMonthOrders.length,
      monthSalesAmount,
      monthProductsSold,
      deliveredCount,
      cancelledCount,
      pendingParcelsCount,
      receivedParcelsCount,
      lowStockCount,
      outOfStockCount,
      last7Days,
      maxDayRev,
      topSelling,
    };
  }, [allOrders, products, lowStockThreshold]);

  // ═══════════════════════════════════════════════════════════════════════
  // AUTHENTICATION HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const handleAdminLogin = async () => {
    const inputId = adminEmail.trim().toLowerCase();
    const inputPass = adminPassword.trim();

    if (!inputId || !inputPass) {
      setAuthError('Please enter Login ID and password.');
      return;
    }
    if (!inputId.includes('@')) {
      setAuthError('Please enter a valid admin email address. Hardcoded credentials are disabled.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: inputId,
        password: inputPass,
      });

      if (authError) throw authError;

      const isAdminOk = await checkIsAdmin(authData.user.id).catch(() => false);
      if (!isAdminOk) {
        await supabase.auth.signOut();
        setAuthError('Access denied. This account is not in the admins table.');
        setAuthLoading(false);
        return;
      }

      updateUserProfile({
        isAdmin: true,
        isLoggedIn: true,
        role: 'admin',
        name: authData.user.user_metadata?.name || 'Master Admin',
      });
      setIsAuthenticated(true);
    } catch (error: any) {
      const errorMessages: Record<string, string> = {
        'Invalid login credentials': 'Invalid email or password.',
        'Email not confirmed': 'Please verify your email first.',
      };
      setAuthError(errorMessages[error.message] || error.message || 'Login failed.');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to exit the Admin Dashboard?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut().catch(() => {});
          updateUserProfile({ isAdmin: false });
          setIsAuthenticated(false);
          router.replace('/');
        },
      },
    ]);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // PRODUCT MANAGEMENT ACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  const openAddProductModal = () => {
    setEditingProduct(null);
    setFName('');
    setFBrand('');
    setFCategory('Rice');
    setFDescription('');
    setFImage('https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500');
    setFPriceKRW('10000');
    setFDiscountPercent('0');
    setFStock('50');
    setFAvailable(true);
    setAiImageOptions([]);
    setAiError(null);
    setActiveTab('ADD_PRODUCT');
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setFName(product.name);
    setFBrand(product.brand || '');
    setFCategory(product.category);
    setFDescription(product.description || '');
    setFImage(product.image || product.imageUrl || '');
    setFPriceKRW(product.priceKRW.toString());
    setFDiscountPercent((product.discountPercent ?? 0).toString());
    setFStock((product.stock ?? 50).toString());
    setFAvailable(product.available !== false);
    setAiImageOptions([]);
    setAiError(null);
    setActiveTab('ADD_PRODUCT');
  };

  const handleAiFindImage = async () => {
    if (!fName.trim() && !fCategory.trim()) {
      Alert.alert('Product Name Required', 'Please enter a product name (e.g. Kurkure, Ladoo, Wai Wai Noodles) before finding AI images.');
      return;
    }

    try {
      setAiLoading(true);
      setAiError(null);
      const options = await findProductImagesAI({
        name: fName,
        brand: fBrand,
        category: fCategory,
        description: fDescription,
      });
      setAiImageOptions(options);
    } catch (err: any) {
      console.log('AI Image Search error:', err.message);
      setAiError('No suitable image found. Please upload an image manually.');
      setAiImageOptions([]);
    } finally {
      setAiLoading(false);
    }
  };

  const handlePickProductImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant photo library access to upload product pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const localUri = result.assets[0].uri;
      setFImage(localUri);
      try {
        setProductLoading(true);
        const uploaded = await uploadProductImage(localUri, fName || 'product');
        setFImage(uploaded.downloadUrl);
        Alert.alert('Image Ready', 'Product image uploaded to Firebase Storage.');
      } catch (err: any) {
        console.log('Image upload notice:', err.message);
      } finally {
        setProductLoading(false);
      }
    }
  };

  const handleSaveProduct = async () => {
    if (!fName.trim()) {
      Alert.alert('Missing Name', 'Please enter a product name.');
      return;
    }
    const price = parseInt(fPriceKRW, 10);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price in KRW.');
      return;
    }
    const discount = Math.min(100, Math.max(0, parseFloat(fDiscountPercent) || 0));
    const stock = Math.max(0, parseInt(fStock, 10) || 0);
    const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

    setProductLoading(true);
    try {
      let finalImageUrl = fImage;
      const isLocalUri = finalImageUrl && (
        finalImageUrl.startsWith('file:') ||
        finalImageUrl.startsWith('content:') ||
        finalImageUrl.startsWith('ph:') ||
        finalImageUrl.startsWith('blob:')
      );

      if (isLocalUri) {
        try {
          const uploadRes = await uploadProductImage(finalImageUrl, fName.trim() || 'product');
          finalImageUrl = uploadRes.downloadUrl;
          setFImage(finalImageUrl);
        } catch (uploadErr: any) {
          console.log('Failed to upload image before save:', uploadErr.message);
          Alert.alert('Upload Error', `Failed to upload image to Firebase Storage: ${uploadErr.message}`);
          setProductLoading(false);
          return;
        }
      }

      const defaultFallback = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500';
      const resolvedImg = finalImageUrl || defaultFallback;

      const payload: Partial<Product> = {
        name: fName.trim(),
        brand: fBrand.trim() || undefined,
        category: fCategory,
        description: fDescription.trim(),
        image: resolvedImg,
        imageUrl: resolvedImg,
        images: [resolvedImg],
        priceKRW: price,
        oldPriceKRW: discount > 0 ? price : 0,
        discountPercent: discount,
        discount: discount > 0 ? `${discount}% OFF` : '',
        finalPrice,
        stock,
        available: fAvailable && stock > 0,
        origin: 'India / Nepal',
        size: '1 Pack',
        weightKg: 1,
        rating: editingProduct?.rating || 4.8,
        reviews: editingProduct?.reviews || 12,
      };

      if (editingProduct) {
        await updateProductInFirestore(editingProduct.id, payload);
        updateProduct(editingProduct.id, payload);
        Alert.alert('Product Updated 🎉', `"${fName}" has been successfully updated.`);
        setActiveTab('PRODUCTS');
      } else {
        const newId = await addProductToFirestore(payload as any);
        addProduct({ ...payload, id: newId } as any);
        Alert.alert('Product Created 🎉', `"${fName}" is now live on Namaste Mart.`);
        setActiveTab('PRODUCTS');
      }
    } catch (err: any) {
      Alert.alert('Save Error', `${err.message || 'Could not save product.'}\n\nDetails: ${err.details || err.hint || ''}`);
    } finally {
      setProductLoading(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    if (isProcessingAction) return;

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isProcessingAction) return;
            try {
              setIsProcessingAction(true);
              setProductLoading(true);

              // 1. Delete from Firebase/Firestore, Supabase, and Storage
              await deleteProductFromFirestore(product.id, product);

              // 2. Immediately update local Admin & Customer UI state
              deleteProduct(product.id);

              Alert.alert('Success ✅', 'Product deleted successfully.');
            } catch (err: any) {
              console.error('Delete product error:', err);
              Alert.alert('Delete Error ❌', err.message || 'Failed to delete product from database.');
            } finally {
              setIsProcessingAction(false);
              setProductLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleQuickStockUpdate = async (product: Product, delta: number) => {
    const newStock = Math.max(0, (product.stock ?? 0) + delta);
    try {
      await updateProductInFirestore(product.id, {
        stock: newStock,
        available: newStock > 0,
      });
      updateProduct(product.id, { stock: newStock, available: newStock > 0 });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleQuickDiscountUpdate = async (product: Product, discountPct: number) => {
    const finalPrice = discountPct > 0
      ? Math.round(product.priceKRW * (1 - discountPct / 100))
      : product.priceKRW;
    try {
      await updateProductInFirestore(product.id, {
        discountPercent: discountPct,
        discount: discountPct > 0 ? `${discountPct}% OFF` : '',
        finalPrice,
      });
      updateProduct(product.id, {
        discountPercent: discountPct,
        discount: discountPct > 0 ? `${discountPct}% OFF` : '',
        finalPrice,
      });
      Alert.alert('Discount Updated', `Applied ${discountPct}% discount to ${product.name}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // ORDER & PARCEL STATUS ACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatusByAdmin(orderId, newStatus as OrderStatus);
      Alert.alert('Status Updated', `Order #${orderId.slice(-6)} set to "${newStatus}".`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as OrderStatus });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleUpdateParcelStatus = async (orderId: string, newParcelStatus: string) => {
    try {
      await updateParcelStatusByAdmin(orderId, newParcelStatus);
      Alert.alert('Parcel Updated', `Parcel status set to "${newParcelStatus}".`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const loadVerificationLogs = useCallback(async () => {
    try {
      const logs = await getPaymentVerificationLogs(50);
      setVerificationLogs(logs);
    } catch (e) {
      console.warn('Error loading logs:', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadVerificationLogs();
    }
  }, [isAuthenticated, loadVerificationLogs]);

  const handleVerifyPayment = async (
    orderId: string,
    amount?: number,
    custName?: string,
    oNum?: string,
    paymentId?: string,
    txId?: string,
    adminNote?: string
  ) => {
    try {
      setIsProcessingAction(true);
      const targetOrder = allOrders.find((o) => o.id === orderId);
      const targetPayment = firestorePendingPayments.find(
        (p) => p.orderId === orderId || p.paymentId === paymentId
      );

      const finalAmount =
        amount ||
        targetPayment?.expectedAmount ||
        targetOrder?.totalAmount ||
        targetOrder?.totalKRW ||
        0;
      const finalCustName =
        custName ||
        targetPayment?.customerName ||
        targetOrder?.customerName ||
        targetOrder?.customer?.name ||
        'Customer';
      const finalOrderNumber =
        oNum || targetPayment?.orderNumber || targetOrder?.orderNumber || orderId;
      const finalPaymentId =
        paymentId || targetPayment?.paymentId || (targetOrder as any)?.paymentId || `pay_${orderId}`;

      await verifyBankTransferPaymentAdmin({
        paymentId: finalPaymentId,
        orderId,
        receivedAmount: finalAmount,
        adminUid: user?.id || 'admin',
        adminEmail: user?.email || 'admin@namastemart.com',
        transactionId: txId || `TX-${Date.now()}`,
        note: adminNote || 'Bank transaction verified by store admin',
      });

      // Optimistically update local orders
      setAllOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                paymentStatus: 'paid' as any,
                status: 'Payment Confirmed' as any,
                orderStatus: 'confirmed' as any,
                payment: {
                  ...o.payment,
                  verified: true,
                  status: 'paid' as any,
                  verifiedAt: Date.now(),
                  verifiedBy: user?.id || 'admin',
                } as any,
              }
            : o
        )
      );

      // Optimistically filter out from pending payments
      setFirestorePendingPayments((prev) =>
        prev.filter((p) => p.orderId !== orderId && p.paymentId !== finalPaymentId)
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                paymentStatus: 'paid' as any,
                status: 'Payment Confirmed' as any,
                orderStatus: 'confirmed' as any,
                payment: {
                  ...prev.payment,
                  verified: true,
                  status: 'paid' as any,
                  verifiedAt: Date.now(),
                  verifiedBy: user?.id || 'admin',
                } as any,
              }
            : null
        );
      }

      loadVerificationLogs();
      setIsProcessingAction(false);
      Alert.alert(
        'Payment Verified ✅',
        `Order ${finalOrderNumber} has been verified and confirmed.`
      );
    } catch (err: any) {
      setIsProcessingAction(false);
      Alert.alert('Verification Notice', err.message || 'Failed to verify payment.');
    }
  };

  const handleOpenRejectModal = (orderOrPayment: any) => {
    setRejectModalOrder(orderOrPayment);
    setRejectReasonText('입금자명 또는 입금액 불일치 (Sender name or amount mismatch)');
  };

  const handleRejectPayment = (orderId: string) => {
    const order = allOrders.find((o) => o.id === orderId);
    const payment = firestorePendingPayments.find((p) => p.orderId === orderId);
    handleOpenRejectModal(order || payment || { id: orderId, orderId });
  };

  const handleConfirmRejection = async () => {
    if (!rejectModalOrder) return;
    const orderId = rejectModalOrder.orderId || rejectModalOrder.id;
    const paymentId =
      rejectModalOrder.paymentId ||
      (rejectModalOrder as any).payment?.paymentId ||
      `pay_${orderId}`;
    const reason =
      rejectReasonText.trim() || '입금 확인증 식별 불가 (Screenshot illegible / Invalid proof)';

    try {
      setIsProcessingAction(true);
      await rejectBankTransferPaymentAdmin({
        paymentId,
        orderId,
        adminUid: user?.id || 'admin',
        adminEmail: user?.email || 'admin@namastemart.com',
        reason,
      });

      // Optimistically update local orders
      setAllOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                paymentStatus: 'rejected' as any,
                paymentRejectionReason: reason,
                status: 'Payment Rejected' as any,
                orderStatus: 'awaiting_payment' as any,
                payment: {
                  ...o.payment,
                  verified: false,
                  status: 'rejected' as any,
                  rejectionReason: reason,
                  rejectedAt: Date.now(),
                  rejectedBy: user?.id || 'admin',
                } as any,
              }
            : o
        )
      );

      // Remove from pending queue
      setFirestorePendingPayments((prev) =>
        prev.filter((p) => p.orderId !== orderId && p.paymentId !== paymentId)
      );

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                paymentStatus: 'rejected' as any,
                paymentRejectionReason: reason,
                status: 'Payment Rejected' as any,
                orderStatus: 'awaiting_payment' as any,
              }
            : null
        );
      }

      loadVerificationLogs();
      setRejectModalOrder(null);
      setIsProcessingAction(false);
      Alert.alert(
        'Payment Rejected ❌',
        `Order payment marked as rejected with reason: "${reason}".`
      );
    } catch (err: any) {
      setIsProcessingAction(false);
      Alert.alert('Rejection Error', err.message || 'Failed to reject payment.');
    }
  };

  const handleSaveBankSettings = async (newSettings: BankTransferSettings) => {
    try {
      setIsSavingBankSettings(true);
      await updateBankTransferSettings(newSettings, user?.id || 'admin');
      setBankSettings(newSettings);
      setIsSavingBankSettings(false);
      Alert.alert('Settings Saved 🏦', 'Bank transfer receiving account details have been updated.');
    } catch (err: any) {
      setIsSavingBankSettings(false);
      Alert.alert('Save Error', err.message || 'Failed to update bank transfer settings.');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FILTERED DATASETS
  // ═══════════════════════════════════════════════════════════════════════

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          productSearch === '' ||
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.category.toLowerCase().includes(productSearch.toLowerCase());
        const matchesCat =
          productCategoryFilter === 'ALL' || p.category === productCategoryFilter;
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => {
        if (productSortBy === 'PRICE_ASC') return a.priceKRW - b.priceKRW;
        if (productSortBy === 'PRICE_DESC') return b.priceKRW - a.priceKRW;
        if (productSortBy === 'STOCK_LOW') return (a.stock ?? 0) - (b.stock ?? 0);
        return a.name.localeCompare(b.name);
      });
  }, [products, productSearch, productCategoryFilter, productSortBy]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const q = orderSearch.toLowerCase();
      const cName = (order.customer?.name || order.recipient?.name || order.senderName || '').toLowerCase();
      const cEmail = (order.customer?.email || '').toLowerCase();
      const cPhone = (order.customer?.phoneNumber || order.customer?.phone || order.recipient?.phone || '').toLowerCase();
      const oid = (order.id || order.orderNumber || '').toLowerCase();
      const matchesSearch =
        orderSearch === '' ||
        cName.includes(q) ||
        cEmail.includes(q) ||
        cPhone.includes(q) ||
        oid.includes(q);

      const isPaidOrder =
        order.status?.toLowerCase() === 'paid' ||
        order.status?.toLowerCase() === 'payment confirmed' ||
        order.paymentStatus === 'paid' ||
        order.payment?.status === 'paid' ||
        order.payment?.verified === true;

      const matchesStatus =
        orderStatusFilter === 'ALL' ||
        (orderStatusFilter === 'PAID (결제완료)' && isPaidOrder) ||
        (orderStatusFilter === 'Payment Confirmed' && isPaidOrder) ||
        order.status?.toLowerCase() === orderStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [allOrders, orderSearch, orderStatusFilter]);

  // Filtered Pending Orders
  const pendingOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const st = (order.status || '').toLowerCase();
      const isPending =
        st !== 'delivered' &&
        st !== 'cancelled';
      if (!isPending) return false;

      if (!pendingSearch) return true;
      const q = pendingSearch.toLowerCase();
      const cName = (order.customer?.name || order.recipient?.name || '').toLowerCase();
      const oid = (order.id || '').toLowerCase();
      return cName.includes(q) || oid.includes(q);
    });
  }, [allOrders, pendingSearch]);

  // Parcels Dataset
  const parcelItems = useMemo(() => {
    return allOrders.map((order) => {
      const totalQty = (order.items || []).reduce((s, i: any) => s + (i.quantity || 1), 0);
      const itemsSummary = (order.items || []).map((i: any) => `${i.name || i.product?.name || 'Item'} (x${i.quantity || 1})`).join(', ');
      return {
        id: `KR-${(order.orderNumber || order.id || '').slice(-8).toUpperCase()}`,
        orderId: order.id,
        customerName: order.customer?.name || order.recipient?.name || order.senderName || 'Customer',
        phone: order.customer?.phoneNumber || order.customer?.phone || order.recipient?.phone || 'N/A',
        email: order.customer?.email || 'N/A',
        deliveryAddress:
          order.deliveryAddress?.address ||
          order.recipient?.address ||
          order.destinationCity ||
          'South Korea',
        itemsSummary,
        totalQuantity: totalQty,
        totalAmount: order.totalAmount || order.totalKRW || 0,
        orderDate: order.createdAt || Date.now(),
        parcelStatus: order.parcelStatus || mapOrderStatusToParcel(order.status),
      };
    }).filter((p) => {
      if (!parcelSearch) return true;
      const q = parcelSearch.toLowerCase();
      return (
        p.customerName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.phone.includes(q)
      );
    });
  }, [allOrders, parcelSearch]);

  // Customer Management Dataset
  const customerList = useMemo(() => {
    return allCustomers.map((userDoc) => {
      const userOrders = allOrders.filter(
        (o) => o.userId === userDoc.uid || o.customerUid === userDoc.uid
      );
      const totalSpent = userOrders.reduce((sum, o) => sum + (o.totalAmount || o.totalKRW || 0), 0);
      const firstAddr = (userDoc.addresses && userDoc.addresses[0]) || null;
      return {
        ...userDoc,
        orderCount: userOrders.length,
        totalSpent,
        primaryAddress: firstAddr
          ? `${(firstAddr as any).streetAddress || firstAddr.address || ''} ${firstAddr.detailAddress || ''}`
          : 'No address saved yet',
      };
    }).filter((c) => {
      if (!customerSearch) return true;
      const q = customerSearch.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phoneNumber || '').includes(q)
      );
    });
  }, [allCustomers, allOrders, customerSearch]);

  // Pending Bank Payment Verification Orders Dataset
  const pendingPaymentOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const isBankTransfer =
        order.paymentMethod === 'BANK_TRANSFER' ||
        order.paymentMethod?.includes('Bank') ||
        order.paymentMethod?.includes('계좌이체') ||
        order.payment?.paymentType === 'BANK_TRANSFER';

      const isPendingVerification =
        order.paymentStatus === 'PENDING_VERIFICATION' ||
        order.payment?.status === 'PENDING_VERIFICATION' ||
        order.payment?.status === 'uploaded' ||
        order.status === 'Payment Submitted' ||
        order.status === 'payment_uploaded' ||
        (!order.payment?.verified && order.paymentStatus !== 'PAID' && order.paymentStatus !== 'REJECTED' && order.status !== 'Cancelled');

      if (!isBankTransfer || !isPendingVerification) return false;

      if (!paymentVerificationSearch) return true;
      const q = paymentVerificationSearch.toLowerCase();
      const oNum = (order.orderNumber || order.orderId || order.id || '').toLowerCase();
      const cName = (order.customerName || order.customer?.name || order.recipient?.name || '').toLowerCase();
      const sName = (order.senderName || '').toLowerCase();
      const phone = (order.customerPhone || order.customer?.phoneNumber || order.deliveryAddress?.phoneNumber || '').toLowerCase();
      return oNum.includes(q) || cName.includes(q) || sName.includes(q) || phone.includes(q);
    });
  }, [allOrders, paymentVerificationSearch]);

  // ═══════════════════════════════════════════════════════════════════════
  // SIDEBAR NAVIGATION ITEMS DEFINITION
  // ═══════════════════════════════════════════════════════════════════════

  const SIDEBAR_ITEMS: SidebarItem[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: '📊' },
    {
      id: 'PAYMENT_VERIFICATION',
      label: 'Payment Verification (입금 확인)',
      icon: '💳',
      badge: pendingPaymentOrders.length > 0 ? pendingPaymentOrders.length : undefined,
    },
    { id: 'PRODUCTS', label: 'Products / Items', icon: '📦' },
    { id: 'ADD_PRODUCT', label: 'Add New Product', icon: '➕' },
    { id: 'ORDERS', label: 'Orders', icon: '🛍️', badge: allOrders.length },
    { id: 'PENDING_ORDERS', label: 'Pending Orders', icon: '⏳', badge: stats.pendingOrdersCount },
    { id: 'PARCELS', label: 'Parcel Management', icon: '🚚', badge: stats.pendingParcelsCount },
    { id: 'PARCEL_PRICING', label: 'Parcel Pricing Settings', icon: '⚙️' },
    {
      id: 'ITEM_REQUESTS',
      label: 'Item Requests to Korea',
      icon: '🛍️',
      badge: allItemRequests.filter((r) => r.status === 'Pending Review' || r.status === 'pending').length || undefined,
    },
    { id: 'CUSTOMERS', label: 'Customers', icon: '👥', badge: allCustomers.length },
    { id: 'ANALYTICS', label: 'Sales & Analytics', icon: '📈' },
    { id: 'INVENTORY', label: 'Inventory / Stock', icon: '🏭', badge: stats.lowStockCount > 0 ? stats.lowStockCount : undefined },
    { id: 'DISCOUNTS', label: 'Discounts', icon: '🏷️' },
    { id: 'SETTINGS', label: 'Settings', icon: '⚙️' },
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // ACCESS CONTROL GATE
  // ═══════════════════════════════════════════════════════════════════════

  if (!isAuthenticated) {
    // If a normal logged-in customer attempts to view /admin without admin privileges
    if (user?.isLoggedIn && !user?.isAdmin && user?.role !== 'admin' && !ADMIN_EMAILS.includes(user?.email || '')) {
      return (
        <SafeAreaView style={S.container}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <View style={S.accessDeniedCard}>
            <Text style={{ fontSize: 56 }}>🚫</Text>
            <Text style={S.accessDeniedTitle}>Access Denied</Text>
            <Text style={S.accessDeniedSub}>
              This Admin Dashboard is restricted to authorized personnel only.{'\n'}
              Your account ({user.email}) does not have administrative permissions.
            </Text>
            <TouchableOpacity style={S.primaryBtn} onPress={() => router.replace('/')}>
              <Text style={S.primaryBtnText}>🏠 Return to Namaste Mart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.secondaryBtn, { marginTop: 12 }]}
              onPress={() => {
                updateUserProfile({ isLoggedIn: false, isAdmin: false });
                setIsAuthenticated(false);
              }}
            >
              <Text style={S.secondaryBtnText}>🔐 Sign In as Administrator</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    // Default Admin Login Screen
    return (
      <AdminLoginScreen
        S={S}
        isDarkMode={isDarkMode}
        adminEmail={adminEmail}
        setAdminEmail={setAdminEmail}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        authLoading={authLoading}
        authError={authError}
        handleAdminLogin={handleAdminLogin}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER MAIN DASHBOARD WITH SIDEBAR NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={S.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <View style={S.dashboardLayout}>
        {/* ── DESKTOP SIDEBAR OR MOBILE MODAL DRAWER ─────────────────────── */}
        {isDesktop ? (
          <SidebarNav
            S={S}
            isDarkMode={isDarkMode}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            items={SIDEBAR_ITEMS}
            onLogout={handleLogout}
            adminName={user?.name || 'Master Admin'}
          />
        ) : (
          <Modal visible={mobileMenuOpen} animationType="slide" transparent>
            <View style={S.mobileDrawerOverlay}>
              <View style={S.mobileDrawerContent}>
                <View style={S.mobileDrawerHeader}>
                  <Text style={S.sidebarBrandTitle}>🏪 Namaste Mart</Text>
                  <TouchableOpacity onPress={() => setMobileMenuOpen(false)}>
                    <Text style={{ fontSize: 20, color: '#999' }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <SidebarNav
                  S={S}
                  isDarkMode={isDarkMode}
                  activeTab={activeTab}
                  setActiveTab={(tab: AdminTab) => {
                    setActiveTab(tab);
                    setMobileMenuOpen(false);
                  }}
                  items={SIDEBAR_ITEMS}
                  onLogout={handleLogout}
                  adminName={user?.name || 'Master Admin'}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* ── MAIN CONTENT AREA ─────────────────────────────────────────── */}
        <View style={S.mainContentArea}>
          {/* TOP BAR */}
          <View style={S.topHeaderBar}>
            {!isDesktop && (
              <TouchableOpacity
                style={S.menuToggleBtn}
                onPress={() => setMobileMenuOpen(true)}
              >
                <Text style={S.menuToggleIcon}>☰</Text>
                <Text style={S.menuToggleText}>Menu</Text>
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }}>
              <Text style={S.topHeaderTitle}>
                {SIDEBAR_ITEMS.find((i) => i.id === activeTab)?.label || 'Admin Panel'}
              </Text>
              <Text style={S.topHeaderSub}>Namaste Mart Enterprise Operations</Text>
            </View>

            <View style={S.topHeaderRight}>
              <TouchableOpacity
                style={S.quickAddBtn}
                onPress={openAddProductModal}
              >
                <Text style={S.quickAddText}>+ Add Product</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.logoutIconBtn} onPress={handleLogout}>
                <Text style={S.logoutIconText}>🚪</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SCROLLABLE VIEW BODY */}
          <ScrollView
            style={S.scrollContainer}
            contentContainerStyle={S.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {activeTab === 'DASHBOARD' && (
              <DashboardOverviewSection
                S={S}
                stats={stats}
                isDarkMode={isDarkMode}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'PAYMENT_VERIFICATION' && (
              <PaymentVerificationSection
                S={S}
                orders={pendingPaymentOrders}
                firestorePayments={firestorePendingPayments}
                logs={verificationLogs}
                subTab={paymentVerificationSubTab}
                setSubTab={setPaymentVerificationSubTab}
                search={paymentVerificationSearch}
                setSearch={setPaymentVerificationSearch}
                onVerifyPayment={handleVerifyPayment}
                onOpenRejectModal={handleOpenRejectModal}
                onSelectOrder={setSelectedOrder}
                onPreviewScreenshot={setScreenshotModalUrl}
                isProcessing={isProcessingAction}
                isDarkMode={isDarkMode}
                newPaymentAlert={newPaymentAlert}
                onDismissAlert={() => setNewPaymentAlert(null)}
                receivedAmounts={receivedAmountMap}
                setReceivedAmounts={setReceivedAmountMap}
                stats={stats}
              />
            )}

            {activeTab === 'PRODUCTS' && (
              <ProductsManagementSection
                S={S}
                products={filteredProducts}
                search={productSearch}
                setSearch={setProductSearch}
                categoryFilter={productCategoryFilter}
                setCategoryFilter={setProductCategoryFilter}
                sortBy={productSortBy}
                setSortBy={setProductSortBy}
                onAdd={openAddProductModal}
                onEdit={openEditProductModal}
                onDelete={handleDeleteProduct}
                onToggleStock={(p: Product) => handleQuickStockUpdate(p, (p.stock ?? 0) > 0 ? -(p.stock ?? 0) : 50)}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'ADD_PRODUCT' && (
              <AddProductSection
                S={S}
                isEditing={!!editingProduct}
                name={fName}
                setName={setFName}
                brand={fBrand}
                setBrand={setFBrand}
                category={fCategory}
                setCategory={setFCategory}
                desc={fDescription}
                setDesc={setFDescription}
                image={fImage}
                setImage={setFImage}
                price={fPriceKRW}
                setPrice={setFPriceKRW}
                discountPct={fDiscountPercent}
                setDiscountPct={setFDiscountPercent}
                calculatedFinalPrice={calculatedFinalPrice}
                stock={fStock}
                setStock={setFStock}
                available={fAvailable}
                setAvailable={setFAvailable}
                loading={productLoading}
                aiOptions={aiImageOptions}
                aiLoading={aiLoading}
                aiError={aiError}
                onAiFindImage={handleAiFindImage}
                onPickImage={handlePickProductImage}
                onSave={handleSaveProduct}
                onCancel={() => setActiveTab('PRODUCTS')}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'ORDERS' && (
              <OrdersManagementSection
                S={S}
                orders={filteredOrders}
                search={orderSearch}
                setSearch={setOrderSearch}
                statusFilter={orderStatusFilter}
                setStatusFilter={setOrderStatusFilter}
                onSelectOrder={setSelectedOrder}
                onUpdateStatus={handleUpdateOrderStatus}
                onVerifyPayment={handleVerifyPayment}
                onRejectPayment={handleRejectPayment}
                onPreviewScreenshot={setScreenshotPreview}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'PENDING_ORDERS' && (
              <PendingOrdersSection
                S={S}
                orders={pendingOrders}
                search={pendingSearch}
                setSearch={setPendingSearch}
                onUpdateStatus={handleUpdateOrderStatus}
                onVerifyPayment={handleVerifyPayment}
                onSelectOrder={setSelectedOrder}
                onPreviewScreenshot={setScreenshotPreview}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'PARCELS' && (
              <ParcelManagementSection
                S={S}
                parcels={allParcelRequests}
                search={parcelSearch}
                setSearch={setParcelSearch}
                onUpdateParcelStatus={updateParcelStatusAndPriceAdmin}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'PARCEL_PRICING' && (
              <ParcelPricingSection
                S={S}
                pricingItems={pricingItemsAdmin}
                onSavePricing={saveParcelPricingAdmin}
                onDeletePricing={deleteParcelPricingAdmin}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'ITEM_REQUESTS' && (
              <ItemRequestsManagementSection
                S={S}
                requests={allItemRequests}
                search={itemReqSearch}
                setSearch={setItemReqSearch}
                onUpdateItemRequest={updateItemRequestAdmin}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'CUSTOMERS' && (
              <CustomerManagementSection
                S={S}
                customers={customerList}
                search={customerSearch}
                setSearch={setCustomerSearch}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'ANALYTICS' && (
              <SalesAnalyticsSection
                S={S}
                stats={stats}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'INVENTORY' && (
              <InventoryManagementSection
                S={S}
                products={products}
                filter={inventoryFilter}
                setFilter={setInventoryFilter}
                threshold={lowStockThreshold}
                onAdjustStock={handleQuickStockUpdate}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'DISCOUNTS' && (
              <DiscountsManagementSection
                S={S}
                products={products}
                filter={discountFilter}
                setFilter={setDiscountFilter}
                onApplyDiscount={handleQuickDiscountUpdate}
                isDarkMode={isDarkMode}
              />
            )}

            {activeTab === 'SETTINGS' && (
              <SettingsSection
                S={S}
                lowStockThreshold={lowStockThreshold}
                setLowStockThreshold={setLowStockThreshold}
                storeCurrency={storeCurrency}
                isDarkMode={isDarkMode}
                adminEmail={user?.email || 'admin@namastemart.com'}
                bankSettings={bankSettings}
                onSaveBankSettings={handleSaveBankSettings}
                isSavingBankSettings={isSavingBankSettings}
              />
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>

      {/* ── ORDER DETAILS MODAL ────────────────────────────────────────── */}
      {selectedOrder && (
        <Modal visible transparent animationType="slide">
          <View style={S.modalOverlay}>
            <View style={S.orderModalContent}>
              <View style={S.modalHeader}>
                <View>
                  <Text style={S.modalTitle}>
                    Order #{selectedOrder.orderNumber || selectedOrder.id.slice(-6)}
                  </Text>
                  <Text style={S.modalSubtitle}>
                    Placed on {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                  <Text style={{ fontSize: 22, color: '#999' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 500 }}>
                {/* Customer Snapshot */}
                <View style={S.modalSection}>
                  <Text style={S.modalSectionTitle}>👤 Customer Details</Text>
                  <Text style={S.modalText}>Name: {selectedOrder.customer?.name || selectedOrder.recipient?.name || 'Customer'}</Text>
                  <Text style={S.modalText}>Email: {selectedOrder.customer?.email || 'N/A'}</Text>
                  <Text style={S.modalText}>
                    Phone: {selectedOrder.customer?.phoneNumber || selectedOrder.customer?.phone || selectedOrder.recipient?.phone || 'N/A'}
                  </Text>
                </View>

                {/* South Korean Delivery Address */}
                <View style={S.modalSection}>
                  <Text style={S.modalSectionTitle}>🇰🇷 South Korean Delivery Address</Text>
                  <Text style={S.modalText}>
                    Recipient: {selectedOrder.deliveryAddress?.recipientName || selectedOrder.recipient?.name || 'Customer'}
                  </Text>
                  <Text style={S.modalText}>
                    Address: {selectedOrder.deliveryAddress?.address || selectedOrder.recipient?.address || 'N/A'}
                  </Text>
                  {selectedOrder.deliveryAddress?.detailAddress ? (
                    <Text style={S.modalText}>Detail: {selectedOrder.deliveryAddress.detailAddress}</Text>
                  ) : null}
                  <Text style={S.modalText}>Postal Code: {selectedOrder.deliveryAddress?.postalCode || selectedOrder.recipient?.postalCode || 'N/A'}</Text>
                  <Text style={S.modalText}>Country: South Korea (대한민국)</Text>
                </View>

                {/* Items Snapshot */}
                <View style={S.modalSection}>
                  <Text style={S.modalSectionTitle}>📦 Ordered Items</Text>
                  {(selectedOrder.items || []).map((item: any, idx: number) => {
                    const iName = item.name || item.product?.name || 'Product';
                    const iImg = item.imageUrl || item.product?.image || item.product?.imageUrl || 'https://via.placeholder.com/60';
                    const iPrice = item.finalPrice || item.originalPrice || item.product?.priceKRW || 0;
                    const iQty = item.quantity || 1;
                    return (
                      <View key={idx} style={S.modalItemRow}>
                        <Image source={{ uri: iImg }} style={S.modalItemImg} />
                        <View style={{ flex: 1 }}>
                          <Text style={S.modalItemName}>{iName}</Text>
                          <Text style={S.modalItemSub}>
                            Qty: {iQty} × ₩{iPrice.toLocaleString()}
                          </Text>
                        </View>
                        <Text style={S.modalItemTotal}>
                          ₩{(iPrice * iQty).toLocaleString()}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={S.modalTotalRow}>
                    <Text style={S.modalTotalLabel}>Total Amount:</Text>
                    <Text style={S.modalTotalValue}>
                      ₩{(selectedOrder.totalAmount || selectedOrder.totalKRW || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Payment Screenshot & Verification */}
                <View style={S.modalSection}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={S.modalSectionTitle}>💳 Payment Details</Text>
                    {selectedOrder.payment?.verified || selectedOrder.status === 'Payment Confirmed' || selectedOrder.paymentStatus === 'paid' ? (
                      <View style={{ backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>PAID (결제완료) ✅</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={S.modalText}>Method: {selectedOrder.paymentMethod || 'Credit/Debit Card'}</Text>
                  <Text style={S.modalText}>Order Status: {selectedOrder.status}</Text>

                  {/* Structured Korean Card Payment Receipt */}
                  {selectedOrder.payment?.cardDetails ? (
                    <View style={{ backgroundColor: isDarkMode ? '#142850' : '#E8F2FF', padding: 12, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#0064FF' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0064FF', marginBottom: 4 }}>
                        💳 전자 결제 영수증 (Korean Card PG Receipt)
                      </Text>
                      <Text style={S.modalText}>카드사: {selectedOrder.payment.cardDetails.cardCompany}</Text>
                      <Text style={S.modalText}>카드번호: {selectedOrder.payment.cardDetails.cardNumberMasked}</Text>
                      <Text style={S.modalText}>할부: {selectedOrder.payment.cardDetails.installment}</Text>
                      <Text style={S.modalText}>승인번호: {selectedOrder.payment.cardDetails.approvalNumber}</Text>
                      <Text style={S.modalText}>거래 ID: {selectedOrder.payment.cardDetails.transactionId}</Text>
                      <Text style={[S.modalText, { fontWeight: '800', color: '#0064FF', marginTop: 4 }]}>
                        결제금액: ₩{(selectedOrder.payment.cardDetails.paidAmount || selectedOrder.totalAmount || 0).toLocaleString()} (승인완료)
                      </Text>
                    </View>
                  ) : null}

                  {selectedOrder.payment?.screenshotUrl || selectedOrder.paymentScreenshot ? (
                    <View style={{ marginTop: 8 }}>
                      <Text style={S.modalText}>Receipt Screenshot (Tap to expand):</Text>
                      <TouchableOpacity
                        onPress={() =>
                          setScreenshotPreview(
                            selectedOrder.payment?.screenshotUrl || selectedOrder.paymentScreenshot || null
                          )
                        }
                      >
                        <Image
                          source={{
                            uri: selectedOrder.payment?.screenshotUrl || selectedOrder.paymentScreenshot,
                          }}
                          style={S.modalScreenshotThumb}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : !selectedOrder.payment?.cardDetails ? (
                    <Text style={[S.modalText, { color: '#EF4444', marginTop: 4 }]}>
                      ⚠️ No payment screenshot uploaded yet.
                    </Text>
                  ) : null}
                </View>
              </ScrollView>

              {/* Status Update Actions */}
              <View style={S.modalActionsRow}>
                <TouchableOpacity
                  style={[S.actionBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => handleVerifyPayment(selectedOrder.id)}
                >
                  <Text style={S.actionBtnText}>✅ Verify Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.actionBtn, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleRejectPayment(selectedOrder.id)}
                >
                  <Text style={S.actionBtnText}>❌ Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.actionBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={() => handleUpdateOrderStatus(selectedOrder.id, 'Shipped')}
                >
                  <Text style={S.actionBtnText}>🚚 Mark Shipped</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── REJECT REASON MODAL ────────────────────────────────────────── */}
      {rejectModalOrder && (
        <Modal visible transparent animationType="fade">
          <View style={S.modalOverlay}>
            <View style={[S.orderModalContent, { maxWidth: 500 }]}>
              <View style={S.modalHeader}>
                <View>
                  <Text style={[S.modalTitle, { color: '#EF4444' }]}>
                    ❌ Reject Payment Proof (입금 반려)
                  </Text>
                  <Text style={S.modalSubtitle}>
                    Order #{rejectModalOrder.orderNumber || rejectModalOrder.id.slice(-6)} · {rejectModalOrder.customerName || rejectModalOrder.customer?.name || 'Customer'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRejectModalOrder(null)}>
                  <Text style={{ fontSize: 20, color: '#999' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#CCC' : '#374151', marginTop: 12, marginBottom: 6 }}>
                Select Rejection Reason (반려 사유 선택):
              </Text>

              {/* Quick preset chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {[
                  '입금자명 불일치 (Sender name mismatch)',
                  '입금액 부족/불일치 (Incorrect amount)',
                  '영수증 식별 불가 (Screenshot illegible)',
                  '은행 입금 내역 미확인 (No deposit found in bank)',
                  '중복 영수증 제출 (Duplicate proof submitted)',
                ].map((reasonChip) => (
                  <TouchableOpacity
                    key={reasonChip}
                    style={{
                      backgroundColor: rejectReasonText === reasonChip ? '#EF4444' : (isDarkMode ? '#333' : '#F3F4F6'),
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: rejectReasonText === reasonChip ? '#EF4444' : (isDarkMode ? '#444' : '#E5E7EB'),
                    }}
                    onPress={() => setRejectReasonText(reasonChip)}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: rejectReasonText === reasonChip ? '#FFFFFF' : (isDarkMode ? '#DDD' : '#374151'),
                      }}
                    >
                      {reasonChip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#CCC' : '#374151', marginBottom: 4 }}>
                Detailed Reason / Note to Customer:
              </Text>
              <TextInput
                style={[S.formInput, { height: 60, textAlignVertical: 'top' }]}
                value={rejectReasonText}
                onChangeText={setRejectReasonText}
                multiline
                placeholder="Enter specific explanation for customer..."
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[S.secondaryBtn, { flex: 1 }]}
                  onPress={() => setRejectModalOrder(null)}
                >
                  <Text style={S.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#EF4444',
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isProcessingAction ? 0.6 : 1,
                  }}
                  disabled={isProcessingAction}
                  onPress={handleConfirmRejection}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
                    {isProcessingAction ? 'Processing...' : 'Confirm Rejection (반려 확정)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── FULL SCREENSHOT ZOOM MODAL ─────────────────────────────────── */}
      {(screenshotPreview || screenshotModalUrl) && (
        <Modal visible transparent animationType="fade">
          <View style={S.zoomModalOverlay}>
            <TouchableOpacity
              style={S.zoomCloseBtn}
              onPress={() => {
                setScreenshotPreview(null);
                setScreenshotModalUrl(null);
              }}
            >
              <Text style={{ fontSize: 24, color: '#FFFFFF' }}>✕</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: screenshotPreview || screenshotModalUrl || '' }}
              style={S.zoomImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-SECTIONS (ORGANIZED MODULAR PANELS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 1. DASHBOARD OVERVIEW
 */
function DashboardOverviewSection({ S, stats, isDarkMode, setActiveTab }: any) {
  return (
    <View style={S.panelContainer}>
      {/* 1. Today's Sales Cards */}
      <Text style={S.panelHeading}>📅 Today Sales</Text>
      <View style={S.statsGrid}>
        <MetricCard S={S} emoji="🛒" label="Orders Received Today" value={stats.todayOrdersCount.toString()} color="#3B82F6" />
        <MetricCard S={S} emoji="💰" label="Total Sales Today" value={`₩${stats.todaySalesAmount.toLocaleString()}`} color="#10B981" />
        <MetricCard S={S} emoji="📦" label="Products Sold Today" value={stats.todayProductsSold.toString()} color="#8B5CF6" />
      </View>

      {/* 2. Pending Orders Cards */}
      <Text style={[S.panelHeading, { marginTop: 18 }]}>⏳ Pending Action Required</Text>
      <View style={S.statsGrid}>
        <MetricCard S={S} emoji="⚠️" label="Total Pending Orders" value={stats.pendingOrdersCount.toString()} color="#F59E0B" />
        <MetricCard S={S} emoji="💳" label="Waiting Payment Confirm" value={stats.waitingPaymentCount.toString()} color="#EF4444" />
        <MetricCard S={S} emoji="🚚" label="Waiting Parcel Dispatch" value={stats.waitingParcelCount.toString()} color="#0EA5E9" />
      </View>

      {/* 3. This Month's Sales */}
      <Text style={[S.panelHeading, { marginTop: 18 }]}>📊 This Month Performance</Text>
      <View style={S.statsGrid}>
        <MetricCard S={S} emoji="📈" label="Total Orders (Month)" value={stats.monthOrdersCount.toString()} color="#6366F1" />
        <MetricCard S={S} emoji="💵" label="Total Revenue (Month)" value={`₩${stats.monthSalesAmount.toLocaleString()}`} color="#10B981" />
        <MetricCard S={S} emoji="🛍️" label="Products Sold (Month)" value={stats.monthProductsSold.toString()} color="#EC4899" />
      </View>

      {/* 4. Additional Operations Stats */}
      <Text style={[S.panelHeading, { marginTop: 18 }]}>📋 Operational Metrics</Text>
      <View style={S.statsGrid}>
        <MetricCard S={S} emoji="✅" label="Delivered Orders" value={stats.deliveredCount.toString()} color="#10B981" />
        <MetricCard S={S} emoji="❌" label="Cancelled Orders" value={stats.cancelledCount.toString()} color="#EF4444" />
        <MetricCard S={S} emoji="📦" label="Pending Parcels" value={stats.pendingParcelsCount.toString()} color="#F59E0B" />
        <MetricCard S={S} emoji="📥" label="Received Parcels" value={stats.receivedParcelsCount.toString()} color="#3B82F6" />
        <MetricCard S={S} emoji="⚡" label="Low Stock Items" value={stats.lowStockCount.toString()} color="#F97316" />
        <MetricCard S={S} emoji="🚫" label="Out of Stock Items" value={stats.outOfStockCount.toString()} color="#EF4444" />
      </View>

      {/* 5. 7-Day Revenue Trend Bar Chart */}
      <View style={[S.card, { marginTop: 20 }]}>
        <Text style={S.cardTitle}>📈 7-Day Revenue Trend (KRW)</Text>
        <View style={S.barChartRow}>
          {stats.last7Days.map((d: any, i: number) => {
            const barHeight = Math.max(12, (d.revenue / stats.maxDayRev) * 110);
            return (
              <View key={i} style={S.barCol}>
                <Text style={S.barValueText}>₩{Math.round(d.revenue / 1000)}k</Text>
                <View style={[S.barVisual, { height: barHeight, backgroundColor: d.revenue > 0 ? '#10B981' : '#444' }]} />
                <Text style={S.barDayText}>{d.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 6. Top 5 Best-Selling Products */}
      <View style={[S.card, { marginTop: 16 }]}>
        <Text style={S.cardTitle}>🏆 Top 5 Best-Selling Products</Text>
        {stats.topSelling.length === 0 ? (
          <Text style={S.emptyHint}>No sales data yet. Start receiving orders to see ranking.</Text>
        ) : (
          stats.topSelling.map((p: any, idx: number) => (
            <View key={idx} style={S.topProductItem}>
              <Text style={S.topRankBadge}>#{idx + 1}</Text>
              <Image source={{ uri: p.image || 'https://via.placeholder.com/50' }} style={S.topProductThumb} />
              <View style={{ flex: 1 }}>
                <Text style={S.topProductName}>{p.name}</Text>
                <Text style={S.topProductSub}>{p.units} units sold</Text>
              </View>
              <Text style={S.topProductRev}>₩{p.revenue.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

/**
 * 2. PRODUCTS / ITEMS MANAGEMENT
 */
function ProductsManagementSection({
  S, products, search, setSearch, categoryFilter, setCategoryFilter,
  sortBy, setSortBy, onAdd, onEdit, onDelete, onToggleStock, isDarkMode,
}: any) {
  return (
    <View style={S.panelContainer}>
      <View style={S.panelHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={S.panelHeading}>Product Catalog ({products.length})</Text>
          <Text style={S.panelSub}>Manage items, live pricing, stock, and availability</Text>
        </View>
        <TouchableOpacity style={S.actionAddBtn} onPress={onAdd}>
          <Text style={S.actionAddBtnText}>+ Add New Product</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={S.searchBox}>
        <Text style={S.searchIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder="Search products by name or category..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.categoryChipsRow}>
        {['ALL', ...PRODUCT_CATEGORIES].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[S.filterChip, categoryFilter === cat && S.filterChipActive]}
            onPress={() => setCategoryFilter(cat)}
          >
            <Text style={[S.filterChipText, categoryFilter === cat && S.filterChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Products Table / Cards */}
      {(useApp() as any).isProductsLoading ? (
        <ListSkeleton count={4} />
      ) : products.length === 0 ? (
        <View style={S.emptyStateBox}>
          <Text style={{ fontSize: 40 }}>📦</Text>
          <Text style={S.emptyTitle}>No Products Found</Text>
          <Text style={S.emptySub}>Try adjusting your search or category filter.</Text>
        </View>
      ) : (
        products.map((p: Product) => (
          <View key={p.id} style={S.productCard}>
            <Image source={{ uri: p.image || p.imageUrl }} style={S.productCardImg} />
            <View style={{ flex: 1 }}>
              <View style={S.productHeaderRow}>
                <Text style={S.productName}>{p.name}</Text>
                <View style={[S.stockBadge, (p.stock ?? 0) <= 0 ? S.stockBadgeOut : (p.stock ?? 0) < 5 ? S.stockBadgeLow : S.stockBadgeIn]}>
                  <Text style={S.stockBadgeText}>
                    {(p.stock ?? 0) <= 0 ? 'Out of Stock' : (p.stock ?? 0) < 5 ? `Low Stock (${p.stock})` : `In Stock (${p.stock})`}
                  </Text>
                </View>
              </View>

              <Text style={S.productCategory}>Category: {p.category}</Text>

              <View style={S.priceRow}>
                <Text style={S.finalPriceText}>₩{(p.finalPrice || p.priceKRW).toLocaleString()}</Text>
                {p.discountPercent && p.discountPercent > 0 ? (
                  <>
                    <Text style={S.originalPriceText}>₩{p.priceKRW.toLocaleString()}</Text>
                    <Text style={S.discountTag}>{p.discountPercent}% OFF</Text>
                  </>
                ) : null}
              </View>

              <View style={S.productActionsRow}>
                <TouchableOpacity style={S.editBtn} onPress={() => onEdit(p)}>
                  <Text style={S.editBtnText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.toggleStockBtn, { backgroundColor: (p.stock ?? 0) > 0 ? '#F59E0B20' : '#10B98120' }]}
                  onPress={() => onToggleStock(p)}
                >
                  <Text style={[S.toggleStockText, { color: (p.stock ?? 0) > 0 ? '#F59E0B' : '#10B981' }]}>
                    {(p.stock ?? 0) > 0 ? 'Mark Out of Stock' : 'Mark In Stock (50)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.deleteBtn} onPress={() => onDelete(p)}>
                  <Text style={S.deleteBtnText}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

/**
 * 3. ADD / EDIT PRODUCT SECTION (With AI Automatic Product Image Finder)
 */
function AddProductSection({
  S, isEditing, name, setName, brand, setBrand, category, setCategory, desc, setDesc,
  image, setImage, price, setPrice, discountPct, setDiscountPct,
  calculatedFinalPrice, stock, setStock, available, setAvailable,
  loading, aiOptions, aiLoading, aiError, onAiFindImage, onPickImage, onSave, onCancel, isDarkMode,
}: any) {
  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>{isEditing ? '✏️ Edit Product' : '➕ Add New Product'}</Text>
      <Text style={S.panelSub}>Fill out the form below to update or publish to the Namaste Mart catalog</Text>

      <View style={[S.card, { marginTop: 14 }]}>
        {/* Product Name */}
        <Text style={S.formLabel}>Product Name *</Text>
        <TextInput
          style={S.formInput}
          placeholder="e.g. Kurkure Masala Munch, Wai Wai Noodles, Ladoo"
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={name}
          onChangeText={setName}
        />

        {/* Brand / Manufacturer */}
        <Text style={S.formLabel}>Brand / Manufacturer (Optional)</Text>
        <TextInput
          style={S.formInput}
          placeholder="e.g. Haldiram, Kurkure, Wai Wai, Amul, Lays"
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={brand}
          onChangeText={setBrand}
        />

        {/* Category */}
        <Text style={S.formLabel}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {PRODUCT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[S.filterChip, category === cat && S.filterChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[S.filterChipText, category === cat && S.filterChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Description */}
        <Text style={S.formLabel}>Product Description</Text>
        <TextInput
          style={[S.formInput, { height: 75, textAlignVertical: 'top' }]}
          placeholder="Detailed description, ingredients, weight, origin..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={desc}
          onChangeText={setDesc}
          multiline
        />

        {/* Product Photo Header & AI Find Image Button */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 8 }}>
          <Text style={[S.formLabel, { marginBottom: 0 }]}>Product Photo *</Text>

          <TouchableOpacity
            style={[
              {
                backgroundColor: '#D97706',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              },
              aiLoading && { opacity: 0.6 },
            ]}
            onPress={onAiFindImage}
            disabled={aiLoading}
            activeOpacity={0.8}
          >
            {aiLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={{ fontSize: 13 }}>✨</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>AI Find Image</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* AI Candidates Options Drawer / Grid (3-4 Choices) */}
        {aiLoading && (
          <View style={{ backgroundColor: isDarkMode ? '#2D271E' : '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' }}>
            <ActivityIndicator color="#D97706" size="small" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309', marginTop: 6 }}>
              ✨ AI is searching suitable images for "{name || category}"...
            </Text>
          </View>
        )}

        {aiError && !aiLoading && (
          <View style={{ backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FCA5A5' }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#991B1B' }}>⚠️ {aiError}</Text>
            <TouchableOpacity
              style={{ marginTop: 6, backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, alignSelf: 'flex-start' }}
              onPress={onAiFindImage}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Retry AI Search 🔄</Text>
            </TouchableOpacity>
          </View>
        )}

        {aiOptions && aiOptions.length > 0 && !aiLoading && (
          <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#F9FAFB', borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#D97706' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: isDarkMode ? '#FFF' : '#111' }}>
                ✨ AI Found {aiOptions.length} Image Options (Select One):
              </Text>
              <TouchableOpacity onPress={onAiFindImage}>
                <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '800' }}>Retry 🔄</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {aiOptions.map((opt: AIImageOption) => {
                const isSelected = image === opt.url;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      {
                        width: 120,
                        backgroundColor: isDarkMode ? '#262626' : '#FFFFFF',
                        borderRadius: 12,
                        padding: 6,
                        borderWidth: 2,
                        borderColor: isSelected ? '#10B981' : isDarkMode ? '#444' : '#E5E7EB',
                        alignItems: 'center',
                      },
                      isSelected && { backgroundColor: isDarkMode ? '#14382B' : '#ECFDF5' },
                    ]}
                    onPress={() => setImage(opt.url)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: opt.url }} style={{ width: 106, height: 90, borderRadius: 8, resizeMode: 'cover' }} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: isDarkMode ? '#EEE' : '#333', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                      {opt.title}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#D97706', marginTop: 1 }} numberOfLines={1}>
                      {opt.source}
                    </Text>
                    <View style={[{ marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: isSelected ? '#10B981' : '#D97706' }]}>
                      <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '900' }}>
                        {isSelected ? 'SELECTED ✓' : 'Select ✅'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Selected Image Preview & Control Box */}
        <View style={S.photoUploadRow}>
          <View style={{ position: 'relative' }}>
            <Image source={{ uri: image || 'https://via.placeholder.com/100' }} style={S.photoPreview} />
            {image ? (
              <TouchableOpacity
                style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => setImage('')}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '900' }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ flex: 1, gap: 8 }}>
            <TouchableOpacity style={S.photoPickBtn} onPress={onPickImage}>
              <Text style={S.photoPickBtnText}>📷 Upload from Device</Text>
            </TouchableOpacity>

            <TextInput
              style={[S.formInput, { marginBottom: 0 }]}
              placeholder="Or paste image URL"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              value={image}
              onChangeText={setImage}
            />

            {image ? (
              <TouchableOpacity style={{ alignSelf: 'flex-start' }} onPress={() => setImage('')}>
                <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '800' }}>Clear/Remove Image 🗑️</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Price & Discount */}
        <View style={S.rowFields}>
          <View style={{ flex: 1 }}>
            <Text style={S.formLabel}>Original Price (₩ KRW) *</Text>
            <TextInput
              style={S.formInput}
              placeholder="10000"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.formLabel}>Discount (%)</Text>
            <TextInput
              style={S.formInput}
              placeholder="0 to 100"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              value={discountPct}
              onChangeText={setDiscountPct}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Automatic Price Calculation Display */}
        <View style={S.liveCalcBanner}>
          <Text style={S.liveCalcTitle}>⚡ Live Price Calculation</Text>
          <Text style={S.liveCalcDetail}>
            Original: ₩{parseInt(price || '0', 10).toLocaleString()} · Discount: {discountPct || 0}%
          </Text>
          <Text style={S.liveCalcResult}>
            Final Selling Price: <Text style={{ color: '#10B981', fontWeight: '900' }}>₩{calculatedFinalPrice.toLocaleString()}</Text>
          </Text>
        </View>

        {/* Stock Quantity */}
        <Text style={S.formLabel}>Available Stock Quantity *</Text>
        <TextInput
          style={S.formInput}
          placeholder="50"
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={stock}
          onChangeText={setStock}
          keyboardType="numeric"
        />

        {/* Available Toggle */}
        <View style={S.switchRow}>
          <View>
            <Text style={S.switchLabel}>In Stock & Available for Purchase</Text>
            <Text style={S.switchSub}>Controls visibility on customer store</Text>
          </View>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ false: '#444', true: '#10B981' }}
          />
        </View>

        {/* Submit & Cancel Buttons */}
        <View style={S.formBtnRow}>
          <TouchableOpacity style={S.cancelBtn} onPress={onCancel}>
            <Text style={S.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.submitBtn} onPress={onSave} disabled={loading}>
            <Text style={S.submitBtnText}>{loading ? 'Saving...' : isEditing ? 'Update Product' : '➕ Create Product'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/**
 * 4. COMPLETE ORDERS MANAGEMENT
 */
function OrdersManagementSection({
  S, orders, search, setSearch, statusFilter, setStatusFilter,
  onSelectOrder, onUpdateStatus, onVerifyPayment, onRejectPayment, onPreviewScreenshot, isDarkMode,
}: any) {
  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>Order Management ({orders.length})</Text>
      <Text style={S.panelSub}>Complete customer order details, South Korean addresses, and payment receipts</Text>

      {/* Search Input */}
      <View style={S.searchBox}>
        <Text style={S.searchIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder="Search by customer, email, phone, or order ID..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.categoryChipsRow}>
        {['ALL', ...ORDER_STATUS_LIST].map((st) => (
          <TouchableOpacity
            key={st}
            style={[S.filterChip, statusFilter === st && S.filterChipActive]}
            onPress={() => setStatusFilter(st)}
          >
            <Text style={[S.filterChipText, statusFilter === st && S.filterChipTextActive]}>{st}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Order Cards */}
      {orders.length === 0 ? (
        <View style={S.emptyStateBox}>
          <Text style={{ fontSize: 40 }}>🛍️</Text>
          <Text style={S.emptyTitle}>No Orders Found</Text>
          <Text style={S.emptySub}>All customer orders will appear here automatically.</Text>
        </View>
      ) : (
        orders.map((order: OrderItem) => (
          <View key={order.id} style={S.orderCard}>
            <View style={S.orderTopHeader}>
              <View>
                <Text style={S.orderIdText}>Order #{order.orderNumber || order.id.slice(-6)}</Text>
                <Text style={S.orderDateText}>
                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Recent'}
                </Text>
              </View>
              {order.payment?.verified || order.status === 'Payment Confirmed' || order.status === 'PAID' || order.paymentStatus === 'paid' ? (
                <View style={[S.statusBadgePill, { backgroundColor: '#10B981' }]}>
                  <Text style={[S.statusBadgePillText, { color: '#FFFFFF', fontWeight: '900' }]}>
                    💳 PAID (결제완료)
                  </Text>
                </View>
              ) : (
                <View style={S.statusBadgePill}>
                  <Text style={S.statusBadgePillText}>{order.status}</Text>
                </View>
              )}
            </View>

            {/* Customer & Address Summary */}
            <View style={S.orderCustomerBox}>
              <Text style={S.orderCustomerName}>
                👤 {order.customer?.name || order.recipient?.name || order.senderName || 'Customer'}
              </Text>
              <Text style={S.orderCustomerSub}>
                📞 {order.customer?.phoneNumber || order.customer?.phone || order.recipient?.phone || 'N/A'} · 📧 {order.customer?.email || 'N/A'}
              </Text>
              <Text style={S.orderAddressText}>
                📍 {order.deliveryAddress?.address || order.recipient?.address || 'South Korea'}
              </Text>
            </View>

            {/* Korean Card Payment Badge if present */}
            {order.payment?.cardDetails ? (
              <View style={{ backgroundColor: isDarkMode ? '#142850' : '#E8F2FF', padding: 8, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: '#0064FF' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0064FF' }}>
                    💳 {order.payment.cardDetails.cardCompany} 결제완료 (PAID)
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>
                    {order.payment.cardDetails.installment}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: isDarkMode ? '#93C5FD' : '#4B6B94', marginTop: 2 }}>
                  승인: {order.payment.cardDetails.approvalNumber} · 카드: {order.payment.cardDetails.cardNumberMasked} · TX: {order.payment.cardDetails.transactionId}
                </Text>
              </View>
            ) : null}

            {/* Order Items Summary */}
            <Text style={S.orderItemCount}>
              🛍️ {(order.items || []).length} items · Total: <Text style={{ fontWeight: '900', color: '#10B981' }}>₩{(order.totalAmount || order.totalKRW || 0).toLocaleString()}</Text>
            </Text>

            {/* Payment Proof Preview if present */}
            {order.payment?.screenshotUrl || order.paymentScreenshot ? (
              <View style={S.screenshotRow}>
                <TouchableOpacity onPress={() => onPreviewScreenshot(order.payment?.screenshotUrl || order.paymentScreenshot)}>
                  <Image source={{ uri: order.payment?.screenshotUrl || order.paymentScreenshot }} style={S.thumbSmall} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={S.screenshotHint}>Payment proof uploaded</Text>
                  <Text style={{ fontSize: 11, color: order.payment?.verified ? '#10B981' : '#F59E0B' }}>
                    {order.payment?.verified ? '✅ Verified' : '⏳ Pending verification'}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* WhatsApp Notification Status Badge & Manual Retry Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8, justifyContent: 'space-between', backgroundColor: isDarkMode ? '#222' : '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: (order as any).whatsappNotificationSent ? '#10B981' : '#EF4444' }}>
                {(order as any).whatsappNotificationSent ? '🟢 WhatsApp Sent (+91 9485703011)' : '🔴 WhatsApp Pending'}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                onPress={async () => {
                  const { retryWhatsAppOrderBackend } = await import('@/services/api');
                  const res = await retryWhatsAppOrderBackend(order.id);
                  if (res.success) {
                    Alert.alert('WhatsApp Retried', 'Order notification dispatched to WhatsApp Business!');
                  } else {
                    Alert.alert('Retry Notice', res.message || 'Notification queued.');
                  }
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>📲 Send WhatsApp</Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={S.orderActionsBar}>
              <TouchableOpacity style={S.viewDetailsBtn} onPress={() => onSelectOrder(order)}>
                <Text style={S.viewDetailsBtnText}>🔍 Full Details</Text>
              </TouchableOpacity>
              {order.payment?.verified ? null : (
                <TouchableOpacity style={S.quickVerifyBtn} onPress={() => onVerifyPayment(order.id)}>
                  <Text style={S.quickVerifyBtnText}>✅ Verify</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={S.quickStatusBtn}
                onPress={() => onUpdateStatus(order.id, 'Shipped')}
              >
                <Text style={S.quickStatusBtnText}>🚚 Ship</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

/**
 * 5. PENDING ORDERS SECTION
 */
function PendingOrdersSection({
  S, orders, search, setSearch, onUpdateStatus, onVerifyPayment, onSelectOrder, onPreviewScreenshot, isDarkMode,
}: any) {
  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>Pending Orders ({orders.length})</Text>
      <Text style={S.panelSub}>Orders awaiting payment verification, preparation, or parcel dispatch</Text>

      <View style={S.searchBox}>
        <Text style={S.searchIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder="Search pending orders..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {orders.length === 0 ? (
        <View style={S.emptyStateBox}>
          <Text style={{ fontSize: 40 }}>🎉</Text>
          <Text style={S.emptyTitle}>All Caught Up!</Text>
          <Text style={S.emptySub}>No pending orders waiting for action.</Text>
        </View>
      ) : (
        orders.map((order: OrderItem) => (
          <View key={order.id} style={S.orderCard}>
            <View style={S.orderTopHeader}>
              <Text style={S.orderIdText}>Order #{order.orderNumber || order.id.slice(-6)}</Text>
              <View style={[S.statusBadgePill, { backgroundColor: '#F59E0B20' }]}>
                <Text style={[S.statusBadgePillText, { color: '#F59E0B' }]}>{order.status}</Text>
              </View>
            </View>

            <Text style={S.orderCustomerName}>
              👤 {order.customer?.name || order.recipient?.name || 'Customer'} · 📞 {order.customer?.phoneNumber || order.customer?.phone || 'N/A'}
            </Text>
            <Text style={S.orderAddressText}>
              📍 {order.deliveryAddress?.address || order.recipient?.address || 'South Korea'}
            </Text>
            <Text style={S.orderItemCount}>
              Total: ₩{(order.totalAmount || order.totalKRW || 0).toLocaleString()}
            </Text>

            {/* Quick action buttons per prompt */}
            <View style={S.pendingBtnGrid}>
              <TouchableOpacity style={S.pendingActionBtn} onPress={() => onVerifyPayment(order.id)}>
                <Text style={S.pendingActionText}>✅ Confirm Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.pendingActionBtn} onPress={() => onUpdateStatus(order.id, 'Order Confirmed')}>
                <Text style={S.pendingActionText}>🤝 Confirm Order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.pendingActionBtn} onPress={() => onUpdateStatus(order.id, 'Preparing Order')}>
                <Text style={S.pendingActionText}>⚙️ Start Preparing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.pendingActionBtn} onPress={() => onUpdateStatus(order.id, 'Ready for Dispatch')}>
                <Text style={S.pendingActionText}>📦 Ready for Parcel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.pendingActionBtn} onPress={() => onUpdateStatus(order.id, 'Shipped')}>
                <Text style={S.pendingActionText}>🚚 Mark Shipped</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.pendingActionBtn, { backgroundColor: '#EF444420' }]}
                onPress={() => onUpdateStatus(order.id, 'Cancelled')}
              >
                <Text style={[S.pendingActionText, { color: '#EF4444' }]}>❌ Cancel Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

/**
 * 6. PARCEL MANAGEMENT SYSTEM (📦 Parcel Orders & Admin Controls)
 */
function ParcelManagementSection({ S, parcels, search, setSearch, onUpdateParcelStatus, isDarkMode }: any) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedParcel, setSelectedParcel] = useState<ParcelBookingRequest | null>(null);
  const [priceInputMap, setPriceInputMap] = useState<Record<string, string>>({});
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const filteredParcels = useMemo(() => {
    return parcels.filter((p: ParcelBookingRequest) => {
      const q = (search || '').toLowerCase();
      const pId = (p.parcelId || '').toLowerCase();
      const cName = (p.customer?.name || '').toLowerCase();
      const cPhone = (p.customer?.phone || '').toLowerCase();
      const rName = (p.recipient?.name || '').toLowerCase();
      const rCity = (p.recipient?.city || '').toLowerCase();

      const matchesSearch =
        !q ||
        pId.includes(q) ||
        cName.includes(q) ||
        cPhone.includes(q) ||
        rName.includes(q) ||
        rCity.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'PENDING') return p.status === 'Pending Review' || p.status === 'pending';
      if (statusFilter === 'PRICE_CONFIRMED') return p.status === 'Price Confirmed';
      if (statusFilter === 'PAYMENT_PENDING') return p.status === 'Payment Pending' || p.status === 'submitted';
      if (statusFilter === 'IN_TRANSIT') return p.status === 'Shipped' || p.status === 'In Transit';
      if (statusFilter === 'DELIVERED') return p.status === 'Delivered';

      return true;
    });
  }, [parcels, search, statusFilter]);

  const handleConfirmPrice = async (parcelId: string) => {
    const enteredPrice = parseInt(priceInputMap[parcelId] || '0', 10);
    if (!enteredPrice || enteredPrice <= 0) {
      Alert.alert('Price Required', 'Please enter a valid final confirmed price in KRW.');
      return;
    }

    try {
      await onUpdateParcelStatus(parcelId, {
        finalConfirmedPriceKRW: enteredPrice,
        status: 'Price Confirmed',
        paymentStatus: 'payment_pending',
      });
      Alert.alert('Price Confirmed ✅', `Final price of ₩${enteredPrice.toLocaleString()} confirmed for ${parcelId}. Customer can now proceed to payment.`);
    } catch (e: any) {
      Alert.alert('Update Error', e.message || 'Could not update price.');
    }
  };

  const handleQuickStatusChange = async (parcelId: string, newStatus: ParcelStatus) => {
    try {
      await onUpdateParcelStatus(parcelId, { status: newStatus });
      Alert.alert('Status Updated', `Parcel ${parcelId} status changed to "${newStatus}".`);
    } catch (e: any) {
      Alert.alert('Update Error', e.message || 'Could not update status.');
    }
  };

  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>📦 Parcel Orders Management ({parcels.length})</Text>
      <Text style={S.panelSub}>Real-time review of customer parcel requests, price confirmations, and status updates</Text>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 }}>
        {[
          { id: 'ALL', label: 'All Parcels' },
          { id: 'PENDING', label: 'Pending Review ⏳' },
          { id: 'PRICE_CONFIRMED', label: 'Price Confirmed 🎉' },
          { id: 'PAYMENT_PENDING', label: 'Payment Pending 💳' },
          { id: 'IN_TRANSIT', label: 'In Transit ✈️' },
          { id: 'DELIVERED', label: 'Delivered ✓' },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: isDarkMode ? '#262626' : '#F3F4F6' },
              statusFilter === f.id && { backgroundColor: '#D97706' },
            ]}
            onPress={() => setStatusFilter(f.id)}
          >
            <Text style={[{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#D1D5DB' : '#4B5563' }, statusFilter === f.id && { color: '#FFFFFF', fontWeight: '800' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={S.searchBox}>
        <Text style={S.searchIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder="Search by Parcel ID, customer name, recipient or phone..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {filteredParcels.length === 0 ? (
        <View style={S.emptyStateBox}>
          <Text style={{ fontSize: 40 }}>📦</Text>
          <Text style={S.emptyTitle}>No Parcel Orders Found</Text>
          <Text style={S.emptySub}>No submitted parcel requests match your current search or filter.</Text>
        </View>
      ) : (
        filteredParcels.map((parcel: ParcelBookingRequest) => {
          const isPendingReview = parcel.status === 'Pending Review' || parcel.status === 'pending';
          const currentPriceInput = priceInputMap[parcel.parcelId] ?? (parcel.finalConfirmedPriceKRW ? String(parcel.finalConfirmedPriceKRW) : String(parcel.estimatedPriceKRW || ''));

          return (
            <View key={parcel.parcelId} style={S.parcelCard}>
              {/* Header */}
              <View style={S.parcelHeaderRow}>
                <View>
                  <Text style={S.parcelIdTitle}>📦 Parcel ID: {parcel.parcelId}</Text>
                  <Text style={S.parcelDateSub}>
                    Submitted: {new Date(parcel.createdAt).toLocaleString()} • {parcel.destinationCountry === 'India' ? 'India 🇮🇳' : 'Nepal 🇳🇵'}
                  </Text>
                </View>
                <View style={[S.parcelBadgePill, isPendingReview && { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[S.parcelBadgePillText, isPendingReview && { color: '#B45309' }]}>
                    {parcel.status}
                  </Text>
                </View>
              </View>

              {/* Customer & Recipient Grid */}
              <View style={S.parcelDetailsBox}>
                <Text style={S.parcelDetailRow}>
                  <Text style={S.bold}>Sender (Korea 🇰🇷):</Text> {parcel.customer?.name} ({parcel.customer?.phone})
                </Text>
                <Text style={S.parcelDetailRow}>
                  <Text style={S.bold}>Korea Pickup Addr:</Text> {parcel.customer?.koreaAddress}
                </Text>
                <Text style={S.parcelDetailRow}>
                  <Text style={S.bold}>Recipient ({parcel.destinationCountry}):</Text> {parcel.recipient?.name} ({parcel.recipient?.phone})
                </Text>
                <Text style={S.parcelDetailRow}>
                  <Text style={S.bold}>Recipient Address:</Text> {parcel.recipient?.address}, {parcel.recipient?.city} (Postal: {parcel.recipient?.postalCode})
                </Text>
                {parcel.customerNotes ? (
                  <Text style={S.parcelDetailRow}>
                    <Text style={S.bold}>Customer Notes:</Text> "{parcel.customerNotes}"
                  </Text>
                ) : null}
              </View>

              {/* Items Breakdown */}
              <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF', borderRadius: 10, padding: 10, marginVertical: 6, borderWidth: 1, borderColor: isDarkMode ? '#333' : '#E5E7EB' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#FFF' : '#111', marginBottom: 6 }}>
                  Parcel Items ({parcel.items?.length || 0}) • Total Weight: {parcel.totalWeightKg} kg
                </Text>
                {parcel.items?.map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    {item.photoUrl && (
                      <TouchableOpacity onPress={() => setPreviewPhotoUrl(item.photoUrl || null)}>
                        <Image source={{ uri: item.photoUrl }} style={{ width: 36, height: 36, borderRadius: 6 }} />
                      </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#EEE' : '#333' }}>{item.name}</Text>
                      <Text style={{ fontSize: 10, color: isDarkMode ? '#AAA' : '#666' }}>
                        Qty: {item.quantity} • Weight: {item.weightKg} kg {item.description ? `• "${item.description}"` : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>
                      {item.calculatedPriceKRW > 0 ? `₩${item.calculatedPriceKRW.toLocaleString()}` : 'Price Pending'}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Admin Price Control Box */}
              <View style={{ backgroundColor: isDarkMode ? '#2D271E' : '#FFFBEB', borderRadius: 10, padding: 12, marginVertical: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309', marginBottom: 6 }}>
                  ⚙️ Admin Price Confirmation Control
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: isDarkMode ? '#D1D5DB' : '#78350F', fontWeight: '700' }}>
                      Confirm Final Price (KRW ₩)
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#D97706',
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        fontSize: 13,
                        fontWeight: '800',
                        color: isDarkMode ? '#FFFFFF' : '#111827',
                        marginTop: 4,
                      }}
                      keyboardType="numeric"
                      value={currentPriceInput}
                      onChangeText={(val) => setPriceInputMap((prev) => ({ ...prev, [parcel.parcelId]: val }))}
                      placeholder="e.g. 275000"
                    />
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#D97706', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginTop: 16 }}
                    onPress={() => handleConfirmPrice(parcel.parcelId)}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Confirm Price ✅</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 10, color: '#92400E', marginTop: 4 }}>
                  Estimated Charge: ₩{(parcel.estimatedPriceKRW || 0).toLocaleString()} | Confirmed: {parcel.finalConfirmedPriceKRW ? `₩${parcel.finalConfirmedPriceKRW.toLocaleString()}` : 'Awaiting Confirmation'}
                </Text>
              </View>

              {/* Status Update Quick Grid */}
              <Text style={S.parcelActionLabel}>Update Parcel Lifecycle Status:</Text>
              <View style={S.parcelActionsGrid}>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(parcel.parcelId, 'Price Confirmed')}>
                  <Text style={S.parcelBtnText}>🎉 Price Confirmed</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(parcel.parcelId, 'Payment Pending')}>
                  <Text style={S.parcelBtnText}>💳 Payment Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(parcel.parcelId, 'Parcel Received')}>
                  <Text style={S.parcelBtnText}>📥 Parcel Received</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(parcel.parcelId, 'Packed')}>
                  <Text style={S.parcelBtnText}>🎁 Packed</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(parcel.parcelId, 'Shipped')}>
                  <Text style={S.parcelBtnText}>🚚 Shipped</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(parcel.parcelId, 'In Transit')}>
                  <Text style={S.parcelBtnText}>✈️ In Transit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.parcelBtn, { backgroundColor: '#10B98120' }]} onPress={() => handleQuickStatusChange(parcel.parcelId, 'Delivered')}>
                  <Text style={[S.parcelBtnText, { color: '#10B981' }]}>✅ Delivered</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Item Photo Preview Modal */}
      <Modal visible={!!previewPhotoUrl} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          {previewPhotoUrl && <Image source={{ uri: previewPhotoUrl }} style={{ width: '90%', height: 350, borderRadius: 16, resizeMode: 'contain' }} />}
          <TouchableOpacity style={{ marginTop: 16, backgroundColor: '#D97706', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }} onPress={() => setPreviewPhotoUrl(null)}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Close Preview</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

/**
 * 6.5 PARCEL PRICING CONTROL SECTION (⚙️ Admin Parcel Pricing)
 */
function ParcelPricingSection({ S, pricingItems, onSavePricing, onDeletePricing, isDarkMode }: any) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [icon, setIcon] = useState('📦');
  const [unitPrice, setUnitPrice] = useState('10000');
  const [unit, setUnit] = useState<'per_item' | 'per_kg'>('per_item');
  const [rateDesc, setRateDesc] = useState('');
  const [defaultWeight, setDefaultWeight] = useState('1.0');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setCategory('general');
    setIcon('📦');
    setUnitPrice('10000');
    setUnit('per_item');
    setRateDesc('');
    setDefaultWeight('1.0');
    setActive(true);
    setModalVisible(true);
  };

  const openEditModal = (item: ParcelPricingItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setIcon(item.icon);
    setUnitPrice(String(item.unitPriceKRW));
    setUnit(item.pricingUnit);
    setRateDesc(item.rateDescription || '');
    setDefaultWeight(String(item.defaultWeightKg || 1));
    setActive(item.active !== false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !unitPrice.trim()) {
      Alert.alert('Missing Fields', 'Please provide a title and unit price.');
      return;
    }

    try {
      setSaving(true);
      await onSavePricing({
        id: editingId || undefined,
        title: title.trim(),
        category: category.trim(),
        icon: icon.trim() || '📦',
        unitPriceKRW: parseInt(unitPrice, 10) || 10000,
        pricingUnit: unit,
        rateDescription: rateDesc.trim(),
        defaultWeightKg: parseFloat(defaultWeight) || 1.0,
        defaultName: title.trim(),
        active,
      });

      Alert.alert('Saved ✅', `Parcel pricing item "${title}" updated.`);
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Could not save pricing.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    Alert.alert('Delete Pricing Item', `Are you sure you want to delete "${itemTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await onDeletePricing(id);
            Alert.alert('Deleted', 'Pricing item removed.');
          } catch (e: any) {
            Alert.alert('Delete Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={S.panelContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <View>
          <Text style={S.panelHeading}>⚙️ Parcel Pricing Settings ({pricingItems.length})</Text>
          <Text style={S.panelSub}>Dynamic shipping rates for predefined items & cargo weight</Text>
        </View>

        <TouchableOpacity style={{ backgroundColor: '#D97706', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }} onPress={openAddModal}>
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>+ Add Pricing Item</Text>
        </TouchableOpacity>
      </View>

      {pricingItems.length === 0 ? (
        <View style={S.emptyStateBox}>
          <Text style={{ fontSize: 40 }}>⚙️</Text>
          <Text style={S.emptyTitle}>No Custom Pricing Items</Text>
          <Text style={S.emptySub}>Default pricing will be used automatically.</Text>
        </View>
      ) : (
        pricingItems.map((item: ParcelPricingItem) => (
          <View key={item.id} style={{ backgroundColor: isDarkMode ? '#262626' : '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: isDarkMode ? '#333' : '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 28 }}>{item.icon}</Text>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: isDarkMode ? '#FFF' : '#111' }}>{item.title}</Text>
                <View style={{ backgroundColor: item.active !== false ? '#DCFCE7' : '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: item.active !== false ? '#15803D' : '#991B1B' }}>
                    {item.active !== false ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#D97706', marginTop: 2 }}>
                ₩{item.unitPriceKRW.toLocaleString()} {item.pricingUnit === 'per_kg' ? '/ kg' : '/ item'}
              </Text>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#AAA' : '#666', marginTop: 2 }}>
                {item.rateDescription || 'Standard rate'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={{ backgroundColor: isDarkMode ? '#374151' : '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }} onPress={() => openEditModal(item)}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#FFF' : '#333' }}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ backgroundColor: '#EF444420', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }} onPress={() => handleDelete(item.id, item.title)}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Add / Edit Pricing Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF', borderRadius: 20, padding: 20, width: '100%', maxWidth: 420 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: isDarkMode ? '#FFF' : '#111', marginBottom: 14 }}>
              {editingId ? 'Edit Parcel Pricing Item' : 'Add New Parcel Pricing Item'}
            </Text>

            <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#AAA' : '#666', marginBottom: 4 }}>Item Title *</Text>
            <TextInput style={{ backgroundColor: isDarkMode ? '#262626' : '#F9FAFB', borderWidth: 1, borderColor: isDarkMode ? '#444' : '#DDD', borderRadius: 8, padding: 8, fontSize: 13, color: isDarkMode ? '#FFF' : '#111', marginBottom: 10 }} value={title} onChangeText={setTitle} placeholder="e.g. Phone, Laptop, Clothes" />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#AAA' : '#666', marginBottom: 4 }}>Icon Emoji</Text>
                <TextInput style={{ backgroundColor: isDarkMode ? '#262626' : '#F9FAFB', borderWidth: 1, borderColor: isDarkMode ? '#444' : '#DDD', borderRadius: 8, padding: 8, fontSize: 13, color: isDarkMode ? '#FFF' : '#111' }} value={icon} onChangeText={setIcon} placeholder="📱" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#AAA' : '#666', marginBottom: 4 }}>Category</Text>
                <TextInput style={{ backgroundColor: isDarkMode ? '#262626' : '#F9FAFB', borderWidth: 1, borderColor: isDarkMode ? '#444' : '#DDD', borderRadius: 8, padding: 8, fontSize: 13, color: isDarkMode ? '#FFF' : '#111' }} value={category} onChangeText={setCategory} placeholder="mobile" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#AAA' : '#666', marginBottom: 4 }}>Price KRW (₩) *</Text>
                <TextInput style={{ backgroundColor: isDarkMode ? '#262626' : '#F9FAFB', borderWidth: 1, borderColor: isDarkMode ? '#444' : '#DDD', borderRadius: 8, padding: 8, fontSize: 13, color: isDarkMode ? '#FFF' : '#111' }} keyboardType="numeric" value={unitPrice} onChangeText={setUnitPrice} placeholder="70000" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#AAA' : '#666', marginBottom: 4 }}>Pricing Unit</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity style={[{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D97706', alignItems: 'center' }, unit === 'per_item' && { backgroundColor: '#D97706' }]} onPress={() => setUnit('per_item')}>
                    <Text style={[{ fontSize: 10, fontWeight: '800' }, unit === 'per_item' ? { color: '#FFF' } : { color: '#D97706' }]}>Per Item</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D97706', alignItems: 'center' }, unit === 'per_kg' && { backgroundColor: '#D97706' }]} onPress={() => setUnit('per_kg')}>
                    <Text style={[{ fontSize: 10, fontWeight: '800' }, unit === 'per_kg' ? { color: '#FFF' } : { color: '#D97706' }]}>Per KG</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#AAA' : '#666', marginBottom: 4 }}>Rate Description</Text>
            <TextInput style={{ backgroundColor: isDarkMode ? '#262626' : '#F9FAFB', borderWidth: 1, borderColor: isDarkMode ? '#444' : '#DDD', borderRadius: 8, padding: 8, fontSize: 13, color: isDarkMode ? '#FFF' : '#111', marginBottom: 14 }} value={rateDesc} onChangeText={setRateDesc} placeholder="Air express duty included..." />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#999' }} onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#FFF' : '#333' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ backgroundColor: '#D97706', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }} onPress={handleSave} disabled={saving}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Save Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * 6.8 ITEM REQUESTS MANAGEMENT SYSTEM (🛍️ India/Nepal -> Korea Requests)
 */
function ItemRequestsManagementSection({ S, requests, search, setSearch, onUpdateItemRequest, isDarkMode }: any) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [itemCostMap, setItemCostMap] = useState<Record<string, string>>({});
  const [shippingCostMap, setShippingCostMap] = useState<Record<string, string>>({});
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    return requests.filter((r: ItemRequestRecord) => {
      const q = (search || '').toLowerCase();
      const rId = (r.requestId || '').toLowerCase();
      const cName = (r.customer?.name || '').toLowerCase();
      const cPhone = (r.customer?.phone || '').toLowerCase();
      const recName = (r.koreaDeliveryAddress?.recipientName || '').toLowerCase();
      const recCity = (r.koreaDeliveryAddress?.city || '').toLowerCase();

      const matchesSearch =
        !q ||
        rId.includes(q) ||
        cName.includes(q) ||
        cPhone.includes(q) ||
        recName.includes(q) ||
        recCity.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'PENDING') return r.status === 'Pending Review' || r.status === 'pending';
      if (statusFilter === 'PRICE_CONFIRMED') return r.status === 'Price Confirmed';
      if (statusFilter === 'PAYMENT_SUBMITTED') return r.status === 'Payment Submitted' || r.paymentStatus === 'submitted';
      if (statusFilter === 'PURCHASED') return r.status === 'Purchased / Sourced';
      if (statusFilter === 'DELIVERED') return r.status === 'Delivered';
      if (statusFilter === 'REJECTED') return r.status === 'Rejected';

      return true;
    });
  }, [requests, search, statusFilter]);

  const handleConfirmPricing = async (requestId: string) => {
    const itemCost = parseInt(itemCostMap[requestId] || '0', 10);
    const shipCost = parseInt(shippingCostMap[requestId] || '0', 10);

    if (!itemCost || itemCost <= 0) {
      Alert.alert('Item Cost Required', 'Please enter a valid item cost in KRW.');
      return;
    }

    try {
      const totalCost = itemCost + shipCost;
      await onUpdateItemRequest(requestId, {
        itemCostKRW: itemCost,
        shippingCostKRW: shipCost,
        finalConfirmedPriceKRW: totalCost,
        status: 'Price Confirmed',
        paymentStatus: 'payment_pending',
      });
      Alert.alert('Price Confirmed ✅', `Confirmed total of ₩${totalCost.toLocaleString()} (Item ₩${itemCost.toLocaleString()} + Shipping ₩${shipCost.toLocaleString()}) for ${requestId}.`);
    } catch (e: any) {
      Alert.alert('Update Error', e.message || 'Could not update pricing.');
    }
  };

  const handleQuickStatusChange = async (requestId: string, newStatus: ItemRequestStatus) => {
    try {
      await onUpdateItemRequest(requestId, { status: newStatus });
      Alert.alert('Status Updated', `Request ${requestId} status updated to "${newStatus}".`);
    } catch (e: any) {
      Alert.alert('Update Error', e.message || 'Could not update status.');
    }
  };

  const handleReject = async (requestId: string) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this item request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await onUpdateItemRequest(requestId, { status: 'Rejected', paymentStatus: 'failed' });
            Alert.alert('Rejected', `Item Request ${requestId} marked as Rejected.`);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>🛍️ Item Requests to Korea ({requests.length})</Text>
      <Text style={S.panelSub}>Review product sourcing requests from India & Nepal, set prices, and manage shipments</Text>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 }}>
        {[
          { id: 'ALL', label: 'All Requests' },
          { id: 'PENDING', label: 'Pending Review ⏳' },
          { id: 'PRICE_CONFIRMED', label: 'Price Confirmed 🎉' },
          { id: 'PAYMENT_SUBMITTED', label: 'Payment Submitted 💳' },
          { id: 'PURCHASED', label: 'Purchased 🛍️' },
          { id: 'DELIVERED', label: 'Delivered ✓' },
          { id: 'REJECTED', label: 'Rejected ❌' },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: isDarkMode ? '#262626' : '#F3F4F6' },
              statusFilter === f.id && { backgroundColor: '#D97706' },
            ]}
            onPress={() => setStatusFilter(f.id)}
          >
            <Text style={[{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#D1D5DB' : '#4B5563' }, statusFilter === f.id && { color: '#FFFFFF', fontWeight: '800' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={S.searchBox}>
        <Text style={S.searchIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder="Search by Request ID, customer name, recipient or phone..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {filteredRequests.length === 0 ? (
        <View style={S.emptyStateBox}>
          <Text style={{ fontSize: 40 }}>🛍️</Text>
          <Text style={S.emptyTitle}>No Item Requests Found</Text>
          <Text style={S.emptySub}>No customer sourcing requests match your search or filter.</Text>
        </View>
      ) : (
        filteredRequests.map((req: ItemRequestRecord) => {
          const isPending = req.status === 'Pending Review' || req.status === 'pending';
          const currItemCost = itemCostMap[req.requestId] ?? (req.itemCostKRW ? String(req.itemCostKRW) : '');
          const currShipCost = shippingCostMap[req.requestId] ?? (req.shippingCostKRW ? String(req.shippingCostKRW) : '15000');

          return (
            <View key={req.requestId} style={S.parcelCard}>
              {/* Header */}
              <View style={S.parcelHeaderRow}>
                <View>
                  <Text style={S.parcelIdTitle}>🛍️ Request ID: {req.requestId}</Text>
                  <Text style={S.parcelDateSub}>
                    Created: {new Date(req.createdAt).toLocaleString()} • Origin: {req.originCountry === 'India' ? 'India 🇮🇳' : 'Nepal 🇳🇵'}
                  </Text>
                </View>
                <View style={[S.parcelBadgePill, isPending && { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[S.parcelBadgePillText, isPending && { color: '#B45309' }]}>
                    {req.status}
                  </Text>
                </View>
              </View>

              {/* Customer & Korea Address */}
              <View style={S.parcelDetailsBox}>
                <Text style={S.parcelDetailRow}>
                  <Text style={S.bold}>Customer:</Text> {req.customer?.name} ({req.customer?.phone} • {req.customer?.email})
                </Text>
                <Text style={S.parcelDetailRow}>
                  <Text style={S.bold}>Delivery Recipient (Korea 🇰🇷):</Text> {req.koreaDeliveryAddress?.recipientName} ({req.koreaDeliveryAddress?.phone})
                </Text>
                <Text style={S.parcelDetailRow}>
                  <Text style={S.bold}>Korea Address:</Text> {req.koreaDeliveryAddress?.fullAddress}, {req.koreaDeliveryAddress?.city} ({req.koreaDeliveryAddress?.postalCode})
                </Text>
                <Text style={S.parcelDetailRow}>
                  <Text style={S.bold}>Tracking AWB:</Text> {req.trackingNumber}
                </Text>
              </View>

              {/* Requested Items List */}
              <View style={{ backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF', borderRadius: 10, padding: 10, marginVertical: 6, borderWidth: 1, borderColor: isDarkMode ? '#333' : '#E5E7EB' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#FFF' : '#111', marginBottom: 6 }}>
                  Requested Items ({req.items?.length || 0})
                </Text>
                {req.items?.map((item, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, borderBottomWidth: idx < req.items.length - 1 ? 1 : 0, borderBottomColor: isDarkMode ? '#2A2A2A' : '#F3F4F6', paddingBottom: 6 }}>
                    {item.photoUrl && (
                      <TouchableOpacity onPress={() => setPreviewPhotoUrl(item.photoUrl || null)}>
                        <Image source={{ uri: item.photoUrl }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                      </TouchableOpacity>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: isDarkMode ? '#EEE' : '#111' }}>{item.name}</Text>
                      <Text style={{ fontSize: 11, color: isDarkMode ? '#AAA' : '#666' }}>
                        Qty: {item.quantity} {item.brand ? `• Brand: ${item.brand}` : ''} {item.sizeColor ? `• ${item.sizeColor}` : ''}
                      </Text>
                      {item.productLink ? (
                        <Text style={{ fontSize: 10, color: '#2563EB', marginTop: 1 }} numberOfLines={1}>
                          🔗 {item.productLink}
                        </Text>
                      ) : null}
                      {item.notes ? (
                        <Text style={{ fontSize: 10, color: isDarkMode ? '#888' : '#777', fontStyle: 'italic', marginTop: 1 }}>
                          "{item.notes}"
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>

              {/* Payment Receipt Screenshot Preview if Submitted */}
              {req.paymentScreenshot && (
                <View style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F0F9FF', borderRadius: 10, padding: 10, marginVertical: 4, borderWidth: 1, borderColor: '#BAE6FD' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0369A1', marginBottom: 4 }}>
                    💳 Customer Payment Proof Uploaded ({req.senderName ? `Sender: ${req.senderName}` : 'Submitted'})
                  </Text>
                  <TouchableOpacity onPress={() => setPreviewPhotoUrl(req.paymentScreenshot || null)}>
                    <Image source={{ uri: req.paymentScreenshot }} style={{ width: '100%', height: 120, borderRadius: 8, resizeMode: 'cover' }} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Admin Price Control & Approval Box */}
              <View style={{ backgroundColor: isDarkMode ? '#2D271E' : '#FFFBEB', borderRadius: 10, padding: 12, marginVertical: 6, borderWidth: 1, borderColor: '#FDE68A' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309', marginBottom: 6 }}>
                  ⚙️ Admin Sourcing Pricing & Approval
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: isDarkMode ? '#D1D5DB' : '#78350F', fontWeight: '700' }}>
                      Item Sourcing Cost (₩)
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#D97706',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        fontSize: 12,
                        fontWeight: '800',
                        color: isDarkMode ? '#FFFFFF' : '#111827',
                        marginTop: 2,
                      }}
                      keyboardType="numeric"
                      value={currItemCost}
                      onChangeText={(val) => setItemCostMap((prev) => ({ ...prev, [req.requestId]: val }))}
                      placeholder="e.g. 45000"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: isDarkMode ? '#D1D5DB' : '#78350F', fontWeight: '700' }}>
                      Shipping Charge (₩)
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#D97706',
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        fontSize: 12,
                        fontWeight: '800',
                        color: isDarkMode ? '#FFFFFF' : '#111827',
                        marginTop: 2,
                      }}
                      keyboardType="numeric"
                      value={currShipCost}
                      onChangeText={(val) => setShippingCostMap((prev) => ({ ...prev, [req.requestId]: val }))}
                      placeholder="e.g. 15000"
                    />
                  </View>

                  <TouchableOpacity
                    style={{ backgroundColor: '#D97706', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, marginTop: 14 }}
                    onPress={() => handleConfirmPricing(req.requestId)}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Confirm Price ✅</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 10, color: '#92400E', marginTop: 4 }}>
                  Item Cost: ₩{(req.itemCostKRW || 0).toLocaleString()} | Shipping: ₩{(req.shippingCostKRW || 0).toLocaleString()} | Total: ₩{(req.finalConfirmedPriceKRW || 0).toLocaleString()}
                </Text>
              </View>

              {/* Status Update Actions */}
              <Text style={S.parcelActionLabel}>Update Lifecycle Status:</Text>
              <View style={S.parcelActionsGrid}>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(req.requestId, 'Price Confirmed')}>
                  <Text style={S.parcelBtnText}>🎉 Price Confirmed</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(req.requestId, 'Payment Pending')}>
                  <Text style={S.parcelBtnText}>💳 Payment Pending</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(req.requestId, 'Payment Received')}>
                  <Text style={S.parcelBtnText}>✅ Payment Received</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(req.requestId, 'Purchased / Sourced')}>
                  <Text style={S.parcelBtnText}>🛍️ Purchased / Sourced</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(req.requestId, 'Shipped from Origin')}>
                  <Text style={S.parcelBtnText}>✈️ Shipped from Origin</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.parcelBtn} onPress={() => handleQuickStatusChange(req.requestId, 'Arrived in Korea')}>
                  <Text style={S.parcelBtnText}>🇰🇷 Arrived in Korea</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.parcelBtn, { backgroundColor: '#10B98120' }]} onPress={() => handleQuickStatusChange(req.requestId, 'Delivered')}>
                  <Text style={[S.parcelBtnText, { color: '#10B981' }]}>✅ Mark Delivered</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.parcelBtn, { backgroundColor: '#EF444420' }]} onPress={() => handleReject(req.requestId)}>
                  <Text style={[S.parcelBtnText, { color: '#EF4444' }]}>❌ Reject Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Photo Preview Modal */}
      <Modal visible={!!previewPhotoUrl} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          {previewPhotoUrl && <Image source={{ uri: previewPhotoUrl }} style={{ width: '90%', height: 380, borderRadius: 16, resizeMode: 'contain' }} />}
          <TouchableOpacity style={{ marginTop: 16, backgroundColor: '#D97706', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }} onPress={() => setPreviewPhotoUrl(null)}>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Close Preview</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

/**
 * 7. CUSTOMER MANAGEMENT SECTION
 */
function CustomerManagementSection({ S, customers, search, setSearch, isDarkMode }: any) {
  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>Customer Management ({customers.length})</Text>
      <Text style={S.panelSub}>Registered customers, South Korean addresses, order counts, and lifetime value</Text>

      <View style={S.searchBox}>
        <Text style={S.searchIcon}>🔍</Text>
        <TextInput
          style={S.searchInput}
          placeholder="Search by customer name, email, or phone..."
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {customers.length === 0 ? (
        <View style={S.emptyStateBox}>
          <Text style={{ fontSize: 40 }}>👥</Text>
          <Text style={S.emptyTitle}>No Customers Found</Text>
          <Text style={S.emptySub}>Registered users from Firestore will appear here.</Text>
        </View>
      ) : (
        customers.map((c: any) => (
          <View key={c.uid} style={S.customerCard}>
            <Image source={{ uri: c.avatar || 'https://via.placeholder.com/50' }} style={S.customerAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={S.customerName}>{c.name || 'Namaste Mart Customer'}</Text>
              <Text style={S.customerSub}>
                📧 {c.email || 'No email'} · {c.emailVerified ? '✅ Verified Email' : '⚠️ Unverified Email'}
              </Text>
              <Text style={S.customerSub}>📞 {c.phoneNumber || 'No phone'}</Text>
              <Text style={S.customerAddress}>📍 {c.primaryAddress}</Text>
              <View style={S.customerStatsRow}>
                <Text style={S.customerStatPill}>🛍️ {c.orderCount} Orders</Text>
                <Text style={S.customerStatPill}>💰 ₩{c.totalSpent.toLocaleString()} Spent</Text>
                <Text style={S.customerStatPill}>🏡 {c.addresses?.length || (c.primaryAddress !== 'No address saved yet' ? 1 : 0)} Address(es)</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

/**
 * 8. SALES AND ANALYTICS SECTION
 */
function SalesAnalyticsSection({ S, stats, isDarkMode }: any) {
  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>Sales & Business Analytics</Text>
      <Text style={S.panelSub}>Comprehensive revenue tracking, order volumes, and sales charts</Text>

      {/* Overview Cards */}
      <View style={S.statsGrid}>
        <MetricCard S={S} emoji="📅" label="Today's Revenue" value={`₩${stats.todaySalesAmount.toLocaleString()}`} color="#10B981" />
        <MetricCard S={S} emoji="📆" label="Monthly Revenue" value={`₩${stats.monthSalesAmount.toLocaleString()}`} color="#3B82F6" />
        <MetricCard S={S} emoji="📦" label="Units Sold Today" value={stats.todayProductsSold.toString()} color="#8B5CF6" />
      </View>

      {/* 7-Day Chart */}
      <View style={[S.card, { marginTop: 16 }]}>
        <Text style={S.cardTitle}>📊 Daily Sales Breakdown (Past 7 Days)</Text>
        <View style={S.barChartRow}>
          {stats.last7Days.map((d: any, idx: number) => {
            const barHeight = Math.max(12, (d.revenue / stats.maxDayRev) * 110);
            return (
              <View key={idx} style={S.barCol}>
                <Text style={S.barValueText}>₩{Math.round(d.revenue / 1000)}k</Text>
                <View style={[S.barVisual, { height: barHeight, backgroundColor: d.revenue > 0 ? '#3B82F6' : '#444' }]} />
                <Text style={S.barDayText}>{d.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Top 5 Products */}
      <View style={[S.card, { marginTop: 16 }]}>
        <Text style={S.cardTitle}>🏆 Top Revenue Generating Products</Text>
        {stats.topSelling.length === 0 ? (
          <Text style={S.emptyHint}>No sales recorded yet.</Text>
        ) : (
          stats.topSelling.map((p: any, idx: number) => (
            <View key={idx} style={S.topProductItem}>
              <Text style={S.topRankBadge}>#{idx + 1}</Text>
              <Image source={{ uri: p.image || 'https://via.placeholder.com/50' }} style={S.topProductThumb} />
              <View style={{ flex: 1 }}>
                <Text style={S.topProductName}>{p.name}</Text>
                <Text style={S.topProductSub}>{p.units} units sold</Text>
              </View>
              <Text style={S.topProductRev}>₩{p.revenue.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

/**
 * 9. INVENTORY MANAGEMENT SECTION
 */
function InventoryManagementSection({ S, products, filter, setFilter, threshold, onAdjustStock, isDarkMode }: any) {
  const filtered = useMemo(() => {
    return products.filter((p: Product) => {
      const s = p.stock ?? 0;
      if (filter === 'LOW') return s > 0 && s <= threshold;
      if (filter === 'OUT') return s <= 0;
      return true;
    });
  }, [products, filter, threshold]);

  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>Inventory & Stock Control ({filtered.length})</Text>
      <Text style={S.panelSub}>Monitor live inventory levels, low stock warnings, and quick adjustments</Text>

      {/* Filter Tabs */}
      <View style={S.tabRowButtons}>
        <TouchableOpacity style={[S.tabChip, filter === 'ALL' && S.tabChipActive]} onPress={() => setFilter('ALL')}>
          <Text style={[S.tabChipText, filter === 'ALL' && S.tabChipTextActive]}>All Items</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.tabChip, filter === 'LOW' && S.tabChipActive]} onPress={() => setFilter('LOW')}>
          <Text style={[S.tabChipText, filter === 'LOW' && S.tabChipTextActive]}>⚠️ Low Stock (&lt;{threshold})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.tabChip, filter === 'OUT' && S.tabChipActive]} onPress={() => setFilter('OUT')}>
          <Text style={[S.tabChipText, filter === 'OUT' && S.tabChipTextActive]}>🚫 Out of Stock</Text>
        </TouchableOpacity>
      </View>

      {filtered.map((p: Product) => (
        <View key={p.id} style={S.inventoryCard}>
          <Image source={{ uri: p.image || p.imageUrl }} style={S.inventoryThumb} />
          <View style={{ flex: 1 }}>
            <Text style={S.inventoryName}>{p.name}</Text>
            <Text style={S.inventorySub}>Current Stock: <Text style={{ fontWeight: '900', color: (p.stock ?? 0) <= 0 ? '#EF4444' : (p.stock ?? 0) < threshold ? '#F59E0B' : '#10B981' }}>{p.stock ?? 0} units</Text></Text>
            <View style={S.stockAdjustRow}>
              <TouchableOpacity style={S.adjustBtn} onPress={() => onAdjustStock(p, -5)}>
                <Text style={S.adjustBtnText}>-5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.adjustBtn} onPress={() => onAdjustStock(p, -1)}>
                <Text style={S.adjustBtnText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.adjustBtn} onPress={() => onAdjustStock(p, 1)}>
                <Text style={S.adjustBtnText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.adjustBtn} onPress={() => onAdjustStock(p, 5)}>
                <Text style={S.adjustBtnText}>+5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.adjustBtn} onPress={() => onAdjustStock(p, 10)}>
                <Text style={S.adjustBtnText}>+10</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 10. DISCOUNTS MANAGEMENT SECTION
 */
function DiscountsManagementSection({ S, products, filter, setFilter, onApplyDiscount, isDarkMode }: any) {
  const filtered = useMemo(() => {
    return products.filter((p: Product) => {
      if (filter === 'DISCOUNTED') return (p.discountPercent ?? 0) > 0;
      return true;
    });
  }, [products, filter]);

  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>Discounts Management</Text>
      <Text style={S.panelSub}>Set product-specific discounts, edit discount percentages, and view live prices</Text>

      <View style={S.tabRowButtons}>
        <TouchableOpacity style={[S.tabChip, filter === 'ALL' && S.tabChipActive]} onPress={() => setFilter('ALL')}>
          <Text style={[S.tabChipText, filter === 'ALL' && S.tabChipTextActive]}>All Products</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.tabChip, filter === 'DISCOUNTED' && S.tabChipActive]} onPress={() => setFilter('DISCOUNTED')}>
          <Text style={[S.tabChipText, filter === 'DISCOUNTED' && S.tabChipTextActive]}>🏷️ Discounted Only</Text>
        </TouchableOpacity>
      </View>

      {filtered.map((p: Product) => (
        <View key={p.id} style={S.discountCard}>
          <Image source={{ uri: p.image || p.imageUrl }} style={S.inventoryThumb} />
          <View style={{ flex: 1 }}>
            <Text style={S.inventoryName}>{p.name}</Text>
            <View style={S.priceRow}>
              <Text style={S.finalPriceText}>₩{(p.finalPrice || p.priceKRW).toLocaleString()}</Text>
              {(p.discountPercent ?? 0) > 0 ? (
                <>
                  <Text style={S.originalPriceText}>₩{p.priceKRW.toLocaleString()}</Text>
                  <Text style={S.discountTag}>{p.discountPercent}% OFF</Text>
                </>
              ) : (
                <Text style={{ fontSize: 11, color: '#888' }}>No discount active</Text>
              )}
            </View>

            {/* Discount Presets */}
            <View style={S.discountPresetsRow}>
              {[0, 10, 15, 20, 25, 30, 50].map((pct) => (
                <TouchableOpacity
                  key={pct}
                  style={[S.discountChipBtn, p.discountPercent === pct && S.discountChipBtnActive]}
                  onPress={() => onApplyDiscount(p, pct)}
                >
                  <Text style={[S.discountChipText, p.discountPercent === pct && S.discountChipTextActive]}>
                    {pct === 0 ? 'Clear' : `${pct}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 2. PAYMENT VERIFICATION SECTION (DEDICATED QUEUE & AUDIT TRAIL)
 */
function PaymentVerificationSection({
  S,
  orders,
  firestorePayments,
  logs,
  subTab,
  setSubTab,
  search,
  setSearch,
  onVerifyPayment,
  onOpenRejectModal,
  onSelectOrder,
  onPreviewScreenshot,
  isProcessing,
  isDarkMode,
  newPaymentAlert,
  onDismissAlert,
  receivedAmounts,
  setReceivedAmounts,
  stats,
}: any) {
  // Merge orders and firestorePayments without duplicates
  const unifiedPendingItems = useMemo(() => {
    const list: any[] = [];
    const seenOrderIds = new Set<string>();

    // Add orders that are pending verification
    (orders || []).forEach((order: OrderItem) => {
      seenOrderIds.add(order.id);
      if (order.orderNumber) seenOrderIds.add(order.orderNumber);
      list.push({
        id: order.id,
        orderId: order.id,
        orderNumber: order.orderNumber || order.id.slice(-8),
        customerName:
          order.customerName ||
          order.customer?.name ||
          order.recipient?.name ||
          'Customer',
        customerPhone:
          order.customerPhone ||
          order.customer?.phoneNumber ||
          order.recipient?.phone ||
          order.deliveryAddress?.phoneNumber ||
          'N/A',
        customerEmail: order.customer?.email || 'N/A',
        deliveryAddress:
          order.deliveryAddress?.address ||
          order.recipient?.address ||
          'South Korea',
        detailAddress: order.deliveryAddress?.detailAddress || '',
        senderName:
          order.senderName ||
          order.customerName ||
          order.customer?.name ||
          'Customer',
        expectedAmount: order.totalAmount || order.totalKRW || 0,
        uploadedAmount:
          (order.payment as any)?.uploadedAmount ||
          order.totalAmount ||
          order.totalKRW ||
          0,
        screenshotUrl:
          order.paymentProofUrl ||
          order.payment?.screenshotUrl ||
          order.paymentScreenshot,
        createdAt: order.createdAt || Date.now(),
        items: order.items || [],
        paymentId: (order.payment as any)?.paymentId || (order as any).paymentId || `pay_${order.id}`,
        status: order.status || 'Payment Submitted',
        source: 'order',
      });
    });

    // Add firestore payments if not already included
    (firestorePayments || []).forEach((payment: FirestorePayment) => {
      if (!seenOrderIds.has(payment.orderId) && !seenOrderIds.has(payment.paymentId)) {
        list.push({
          id: payment.paymentId,
          orderId: payment.orderId,
          orderNumber: payment.orderNumber || payment.orderId,
          customerName: payment.customerName || 'Customer',
          customerPhone: payment.customerPhone || 'N/A',
          customerEmail: payment.customerEmail || 'N/A',
          deliveryAddress: (payment as any).deliveryAddress || 'South Korea',
          detailAddress: '',
          senderName: payment.senderName || payment.customerName || 'Customer',
          expectedAmount: payment.expectedAmount || 0,
          uploadedAmount: payment.uploadedAmount || payment.expectedAmount || 0,
          screenshotUrl: payment.screenshotUrl,
          createdAt: payment.createdAt || Date.now(),
          items: [],
          paymentId: payment.paymentId,
          status: 'under_review',
          source: 'payment',
        });
      }
    });

    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item) =>
        (item.orderNumber || '').toLowerCase().includes(q) ||
        (item.customerName || '').toLowerCase().includes(q) ||
        (item.senderName || '').toLowerCase().includes(q) ||
        (item.customerPhone || '').toLowerCase().includes(q)
    );
  }, [orders, firestorePayments, search]);

  const todayVerifiedCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (logs || []).filter(
      (l: PaymentVerificationLog) =>
        l.action === 'VERIFIED' &&
        l.timestamp &&
        new Date(l.timestamp).toISOString().slice(0, 10) === today
    ).length;
  }, [logs]);

  return (
    <View style={S.panelContainer}>
      {/* ── REAL-TIME NEW PAYMENT ALERT BANNER ──────────────────────────── */}
      {newPaymentAlert && (
        <View
          style={{
            backgroundColor: '#1E40AF',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#3B82F6',
            shadowColor: '#1E40AF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 13 }}>
                Live Firestore Notification
              </Text>
              <Text style={{ color: '#E0E7FF', fontSize: 12, marginTop: 2 }}>
                {newPaymentAlert}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onDismissAlert}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 6,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Dismiss ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── SECTION HEADER & METRIC SUMMARY CARDS ───────────────────────── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={S.panelHeading}>Payment Verification Dashboard</Text>
          <Text style={S.panelSub}>
            Inspect customer bank transfer screenshots & verify deposits before order confirmation
          </Text>
        </View>
        <View
          style={[
            S.statusBadgePill,
            { backgroundColor: unifiedPendingItems.length > 0 ? '#F59E0B' : '#10B981' },
          ]}
        >
          <Text style={[S.statusBadgePillText, { color: '#FFFFFF', fontWeight: '900' }]}>
            {unifiedPendingItems.length} PENDING
          </Text>
        </View>
      </View>

      {/* 4 SUMMARY STAT CARDS */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 8 }}>
        <View
          style={{
            flex: 1,
            minWidth: 140,
            backgroundColor: isDarkMode ? '#222' : '#FEF3C7',
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#F59E0B',
          }}
        >
          <Text style={{ fontSize: 11, color: isDarkMode ? '#F59E0B' : '#92400E', fontWeight: '800' }}>
            ⏳ Pending Verification
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: isDarkMode ? '#FFF' : '#B45309', marginTop: 4 }}>
            {unifiedPendingItems.length} orders
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 140,
            backgroundColor: isDarkMode ? '#222' : '#ECFDF5',
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#10B981',
          }}
        >
          <Text style={{ fontSize: 11, color: '#047857', fontWeight: '800' }}>
            💳 Today's Verified
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: isDarkMode ? '#FFF' : '#047857', marginTop: 4 }}>
            {todayVerifiedCount} verified
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 140,
            backgroundColor: isDarkMode ? '#222' : '#EFF6FF',
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#3B82F6',
          }}
        >
          <Text style={{ fontSize: 11, color: '#1D4976', fontWeight: '800' }}>
            💰 Today's Sales (KRW)
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: isDarkMode ? '#FFF' : '#1D4ED8', marginTop: 4 }}>
            ₩{(stats?.todaySalesAmount || 0).toLocaleString()}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 140,
            backgroundColor: isDarkMode ? '#222' : '#F8FAFC',
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#CBD5E1',
          }}
        >
          <Text style={{ fontSize: 11, color: isDarkMode ? '#CCC' : '#475569', fontWeight: '800' }}>
            📦 Total Orders
          </Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: isDarkMode ? '#FFF' : '#0F172A', marginTop: 4 }}>
            {(orders || []).length} total
          </Text>
        </View>
      </View>

      {/* Sub-tab Switcher: Pending Queue vs Audit Logs */}
      <View style={[S.categoryChipsRow, { marginTop: 12, marginBottom: 8 }]}>
        <TouchableOpacity
          style={[S.filterChip, subTab === 'PENDING' && S.filterChipActive]}
          onPress={() => setSubTab('PENDING')}
        >
          <Text style={[S.filterChipText, subTab === 'PENDING' && S.filterChipTextActive]}>
            ⏳ Pending Verification Queue ({unifiedPendingItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.filterChip, subTab === 'AUDIT_LOGS' && S.filterChipActive]}
          onPress={() => setSubTab('AUDIT_LOGS')}
        >
          <Text style={[S.filterChipText, subTab === 'AUDIT_LOGS' && S.filterChipTextActive]}>
            📋 Verification Audit Trail ({logs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {subTab === 'PENDING' ? (
        <>
          {/* Search Box */}
          <View style={S.searchBox}>
            <Text style={S.searchIcon}>🔍</Text>
            <TextInput
              style={S.searchInput}
              placeholder="Search by order number, sender name, customer name, or phone..."
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Pending Queue Orders */}
          {unifiedPendingItems.length === 0 ? (
            <View style={S.emptyStateBox}>
              <Text style={{ fontSize: 44 }}>🎉</Text>
              <Text style={S.emptyTitle}>All Bank Payments Verified</Text>
              <Text style={S.emptySub}>
                There are no bank transfer orders awaiting verification right now.
              </Text>
            </View>
          ) : (
            unifiedPendingItems.map((item: any) => {
              const itemKey = item.id || item.orderId;
              const expectedAmount = item.expectedAmount || 0;
              const uploadedAmount = item.uploadedAmount || expectedAmount;

              // Current admin received input value (defaults to string of expectedAmount)
              const adminReceivedStr =
                receivedAmounts[itemKey] !== undefined
                  ? receivedAmounts[itemKey]
                  : String(expectedAmount);
              const adminReceivedNum = parseInt(adminReceivedStr, 10) || 0;

              const isMatch = adminReceivedNum === expectedAmount;
              const isCustomerAmountDifferent = uploadedAmount !== expectedAmount;

              return (
                <View
                  key={itemKey}
                  style={[
                    S.orderCard,
                    {
                      borderLeftWidth: 5,
                      borderLeftColor: isMatch ? '#10B981' : '#EF4444',
                      marginBottom: 16,
                    },
                  ]}
                >
                  {/* Card Header */}
                  <View style={S.orderTopHeader}>
                    <View>
                      <Text style={S.orderIdText}>Order #{item.orderNumber}</Text>
                      <Text style={S.orderDateText}>
                        Placed:{' '}
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent'}
                      </Text>
                    </View>
                    <View
                      style={[
                        S.statusBadgePill,
                        {
                          backgroundColor: '#FEF3C7',
                          borderWidth: 1,
                          borderColor: '#F59E0B',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#92400E' }}>
                        🟡 Under Review (입금 확인 대기)
                      </Text>
                    </View>
                  </View>

                  {/* Customer and Depositor Info */}
                  <View style={S.orderCustomerBox}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={S.orderCustomerName}>
                        👤 Customer: {item.customerName}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#2563EB' }}>
                        입금자명 (Sender): {item.senderName}
                      </Text>
                    </View>
                    <Text style={S.orderCustomerSub}>
                      📞 {item.customerPhone} · 📧 {item.customerEmail}
                    </Text>
                    <Text style={S.orderAddressText}>
                      📍 {item.deliveryAddress}{' '}
                      {item.detailAddress ? `(${item.detailAddress})` : ''}
                    </Text>
                  </View>

                  {/* ── THREE-WAY AMOUNT COMPARISON & VALIDATION SECTION ── */}
                  <View
                    style={{
                      backgroundColor: isDarkMode ? '#222' : '#F8FAFC',
                      padding: 12,
                      borderRadius: 10,
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#333' : '#E2E8F0',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '900',
                        color: isDarkMode ? '#FFF' : '#1E293B',
                        marginBottom: 8,
                      }}
                    >
                      💰 Amount Validation & Comparison:
                    </Text>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#AAA' : '#64748B' }}>
                        1. Expected Order Total:
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>
                        ₩{expectedAmount.toLocaleString()}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#AAA' : '#64748B' }}>
                        2. Customer Reported Amount:
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '800',
                          color: isCustomerAmountDifferent ? '#EF4444' : '#2563EB',
                        }}
                      >
                        ₩{uploadedAmount.toLocaleString()}{' '}
                        {isCustomerAmountDifferent ? '⚠️' : '✓'}
                      </Text>
                    </View>

                    {/* Admin editable input for actual bank received amount */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 4,
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: isDarkMode ? '#333' : '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#EEE' : '#1E293B' }}>
                        3. Actual Bank Received (₩):
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: isDarkMode ? '#111' : '#FFFFFF',
                          borderWidth: 1.5,
                          borderColor: isMatch ? '#10B981' : '#EF4444',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          fontSize: 14,
                          fontWeight: '900',
                          color: isMatch ? '#10B981' : '#EF4444',
                          minWidth: 120,
                          textAlign: 'right',
                        }}
                        keyboardType="numeric"
                        value={adminReceivedStr}
                        onChangeText={(text) =>
                          setReceivedAmounts({
                            ...receivedAmounts,
                            [itemKey]: text.replace(/[^0-9]/g, ''),
                          })
                        }
                      />
                    </View>

                    {/* Live Comparison Status Pill */}
                    <View
                      style={{
                        marginTop: 8,
                        padding: 8,
                        borderRadius: 6,
                        backgroundColor: isMatch ? (isDarkMode ? '#064E3B' : '#ECFDF5') : (isDarkMode ? '#7F1D1D' : '#FEF2F2'),
                        borderWidth: 1,
                        borderColor: isMatch ? '#10B981' : '#EF4444',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '800',
                          color: isMatch ? '#047857' : '#B91C1C',
                        }}
                      >
                        {isMatch
                          ? `✓ Amount Matches: Expected (₩${expectedAmount.toLocaleString()}) == Received (₩${adminReceivedNum.toLocaleString()})`
                          : `⚠️ Amount Mismatch: Expected ₩${expectedAmount.toLocaleString()} vs Actual Bank ₩${adminReceivedNum.toLocaleString()}`}
                      </Text>
                    </View>
                  </View>

                  {/* Payment Proof Screenshot Box */}
                  <View
                    style={{
                      marginTop: 10,
                      backgroundColor: isDarkMode ? '#1E1E1E' : '#F9FAFB',
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isDarkMode ? '#333' : '#E5E7EB',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: isDarkMode ? '#E5E7EB' : '#374151',
                        marginBottom: 6,
                      }}
                    >
                      📸 Customer Payment Screenshot / Transfer Proof:
                    </Text>
                    {item.screenshotUrl ? (
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => onPreviewScreenshot(item.screenshotUrl)}>
                          <Image
                            source={{ uri: item.screenshotUrl }}
                            style={{
                              width: 90,
                              height: 90,
                              borderRadius: 8,
                              backgroundColor: '#000',
                            }}
                          />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>
                            ✓ Proof attached from customer
                          </Text>
                          <TouchableOpacity
                            style={{
                              backgroundColor: '#2563EB',
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 6,
                              alignSelf: 'flex-start',
                              marginTop: 8,
                            }}
                            onPress={() => onPreviewScreenshot(item.screenshotUrl)}
                          >
                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                              🔍 View Full Screenshot (확대)
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View
                        style={{
                          padding: 10,
                          alignItems: 'center',
                          backgroundColor: isDarkMode ? '#2D1F1F' : '#FEF2F2',
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700' }}>
                          ⚠️ No screenshot attached with this payment
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* ── ACTION BUTTONS: VERIFY OR REJECT ── */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#059669',
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isProcessing ? 0.6 : 1,
                      }}
                      disabled={isProcessing}
                      onPress={() => {
                        if (!isMatch) {
                          Alert.alert(
                            'Amount Mismatch Warning',
                            `The entered bank received amount (₩${adminReceivedNum.toLocaleString()}) does not match the expected order total (₩${expectedAmount.toLocaleString()}).\n\nDo you still want to proceed?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Force Verify',
                                style: 'destructive',
                                onPress: () =>
                                  onVerifyPayment(
                                    item.orderId,
                                    adminReceivedNum,
                                    item.senderName,
                                    item.orderNumber,
                                    item.paymentId
                                  ),
                              },
                            ]
                          );
                          return;
                        }

                        Alert.alert(
                          'Confirm Bank Transfer Verification',
                          `Confirm that ₩${adminReceivedNum.toLocaleString()} was received into your bank account from "${item.senderName}"?\n\nThis will mark the payment as VERIFIED and confirm Order #${item.orderNumber}.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: '✅ Confirm & Verify',
                              onPress: () =>
                                onVerifyPayment(
                                  item.orderId,
                                  adminReceivedNum,
                                  item.senderName,
                                  item.orderNumber,
                                  item.paymentId
                                ),
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
                        ✅ Verify Payment (입금 확인 완료)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        backgroundColor: isDarkMode ? '#3E1F1F' : '#FEE2E2',
                        borderWidth: 1,
                        borderColor: '#DC2626',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isProcessing ? 0.6 : 1,
                      }}
                      disabled={isProcessing}
                      onPress={() => onOpenRejectModal(item)}
                    >
                      <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '900' }}>
                        ❌ Reject (입금 반려)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </>
      ) : (
        /* AUDIT TRAIL LOGS VIEW */
        <View style={{ marginTop: 8 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: isDarkMode ? '#FFF' : '#111',
              marginBottom: 8,
            }}
          >
            Payment Verification History & Audit Trail ({logs.length} entries)
          </Text>
          {logs.length === 0 ? (
            <View style={S.emptyStateBox}>
              <Text style={{ fontSize: 36 }}>📜</Text>
              <Text style={S.emptyTitle}>No Verification Logs Yet</Text>
              <Text style={S.emptySub}>
                All verify and reject actions by administrators are logged here in real time.
              </Text>
            </View>
          ) : (
            logs.map((log: PaymentVerificationLog) => (
              <View
                key={log.id}
                style={{
                  backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: isDarkMode ? '#333' : '#E5E7EB',
                  borderLeftWidth: 4,
                  borderLeftColor: log.action === 'VERIFIED' ? '#10B981' : '#EF4444',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '900',
                      color: log.action === 'VERIFIED' ? '#10B981' : '#EF4444',
                    }}
                  >
                    {log.action === 'VERIFIED'
                      ? '✅ PAYMENT VERIFIED (승인)'
                      : '❌ PAYMENT REJECTED (반려)'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: isDarkMode ? '#EEE' : '#1F2937',
                    marginTop: 4,
                  }}
                >
                  Order: #{log.orderNumber || log.orderId} · Customer:{' '}
                  {log.customerName || 'N/A'} · Amount: ₩{(log.amount || 0).toLocaleString()}
                </Text>
                <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                  Admin: {log.adminEmail || log.adminUserId}
                </Text>
                {log.reason && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#EF4444',
                      fontWeight: '700',
                      marginTop: 4,
                    }}
                  >
                    Reason: {log.reason}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

/**
 * 11. SETTINGS SECTION (WITH DYNAMIC BANK ACCOUNT CONFIGURATION)
 */
function SettingsSection({
  S,
  lowStockThreshold,
  setLowStockThreshold,
  storeCurrency,
  isDarkMode,
  adminEmail,
  bankSettings,
  onSaveBankSettings,
  isSavingBankSettings,
}: any) {
  const [bankName, setBankName] = useState(bankSettings?.bankName || 'Woori Bank (우리은행)');
  const [accountNumber, setAccountNumber] = useState(bankSettings?.accountNumber || '1002340390276');
  const [accountHolder, setAccountHolder] = useState(bankSettings?.accountHolder || '박기삼');
  const [instructions, setInstructions] = useState(
    bankSettings?.instructions || 'Please transfer the exact amount to 박기삼 (우리은행: 1002340390276) and upload your payment screenshot below.'
  );
  const [deadlineHours, setDeadlineHours] = useState((bankSettings?.paymentDeadlineHours || 24).toString());
  const [enabled, setEnabled] = useState(bankSettings?.enabled !== false);

  useEffect(() => {
    if (bankSettings) {
      setBankName(bankSettings.bankName || 'Woori Bank (우리은행)');
      setAccountNumber(bankSettings.accountNumber || '1002340390276');
      setAccountHolder(bankSettings.accountHolder || '박기삼');
      setInstructions(bankSettings.instructions || '');
      setDeadlineHours((bankSettings.paymentDeadlineHours || 24).toString());
      setEnabled(bankSettings.enabled !== false);
    }
  }, [bankSettings]);

  const handleSaveBank = () => {
    onSaveBankSettings({
      bankName: bankName.trim(),
      bankNameKr: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim(),
      instructions: instructions.trim(),
      paymentDeadlineHours: parseInt(deadlineHours, 10) || 24,
      enabled,
    });
  };

  const handleApplyPreset = (preset: BankAccountInfo) => {
    setBankName(`${preset.bankName} (${preset.bankNameKr})`);
    setAccountNumber(preset.accountNumber);
    setAccountHolder(preset.accountHolder);
  };

  return (
    <View style={S.panelContainer}>
      <Text style={S.panelHeading}>Admin Settings & Configurations</Text>
      <Text style={S.panelSub}>Configure store parameters, inventory alerts, and banking details</Text>

      {/* BANK TRANSFER SETTINGS CARD */}
      <View style={[S.card, { marginTop: 14, borderLeftWidth: 4, borderLeftColor: '#2563EB' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[S.cardTitle, { color: '#2563EB' }]}>🏦 Bank Transfer Payment Settings (계좌이체 설정)</Text>
            <Text style={S.settingSub}>Active Bank Accounts for PARSHANT</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: enabled ? '#10B981' : '#EF4444' }}>
              {enabled ? 'Active' : 'Disabled'}
            </Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#767577', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* QUICK PRESET CHIPS */}
        <Text style={[S.settingLabel, { marginTop: 12 }]}>⚡ Quick Select Account for PARSHANT:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 8 }}>
          {KOREA_BANK_ACCOUNTS.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: isDarkMode ? '#222' : '#F3F4F6',
                borderWidth: 1,
                borderColor: b.accountNumber === accountNumber ? b.color : (isDarkMode ? '#444' : '#E5E7EB'),
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
              onPress={() => handleApplyPreset(b)}
            >
              <Text style={{ fontSize: 14 }}>{b.logo}</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#FFF' : '#111' }}>
                {b.bankNameKr}
              </Text>
              <Text style={{ fontSize: 10, color: '#6B7280', fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }) }}>
                {b.accountNumber}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[S.settingLabel, { marginTop: 12 }]}>Bank Name (은행명):</Text>
        <TextInput
          style={S.formInput}
          value={bankName}
          onChangeText={setBankName}
          placeholder="e.g. Hana Bank (하나은행)"
        />

        <Text style={[S.settingLabel, { marginTop: 10 }]}>Account Number (계좌번호):</Text>
        <TextInput
          style={S.formInput}
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="e.g. 123-456789-01005"
        />

        <Text style={[S.settingLabel, { marginTop: 10 }]}>Account Holder Name (예금주):</Text>
        <TextInput
          style={S.formInput}
          value={accountHolder}
          onChangeText={setAccountHolder}
          placeholder="e.g. NAMASTE MART (나마스테마트)"
        />

        <Text style={[S.settingLabel, { marginTop: 10 }]}>Payment Instructions (입금 안내문구):</Text>
        <TextInput
          style={[S.formInput, { height: 70, textAlignVertical: 'top' }]}
          value={instructions}
          onChangeText={setInstructions}
          multiline
          placeholder="e.g. Please transfer exact amount within 24 hours..."
        />

        <Text style={[S.settingLabel, { marginTop: 10 }]}>Payment Deadline in Hours (입금 기한 시간):</Text>
        <TextInput
          style={S.formInput}
          value={deadlineHours}
          onChangeText={setDeadlineHours}
          keyboardType="numeric"
          placeholder="24"
        />

        <TouchableOpacity
          style={{
            backgroundColor: '#2563EB',
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 14,
            opacity: isSavingBankSettings ? 0.6 : 1,
          }}
          disabled={isSavingBankSettings}
          onPress={handleSaveBank}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
            {isSavingBankSettings ? 'Saving Settings...' : '💾 Save Bank Transfer Settings (계좌 설정 저장)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* STORE SETTINGS */}
      <View style={[S.card, { marginTop: 14 }]}>
        <Text style={S.cardTitle}>⚠️ Inventory Low-Stock Alert Threshold</Text>
        <Text style={S.settingSub}>
          Products with stock less than or equal to this number will trigger a Low Stock alert.
        </Text>
        <TextInput
          style={S.formInput}
          value={lowStockThreshold.toString()}
          onChangeText={(v) => setLowStockThreshold(Math.max(1, parseInt(v || '1', 10)))}
          keyboardType="numeric"
        />

        <Text style={[S.cardTitle, { marginTop: 16 }]}>💰 Currency & Country Lock</Text>
        <Text style={S.settingSub}>Operating Country: South Korea (대한민국)</Text>
        <Text style={S.settingSub}>Active Currency: {storeCurrency}</Text>

        <Text style={[S.cardTitle, { marginTop: 16 }]}>👑 Active Administrator</Text>
        <Text style={S.settingSub}>Email: {adminEmail}</Text>
        <Text style={S.settingSub}>Role: Master Admin (namaste-mart-28c93)</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function SidebarNav({ S, isDarkMode, activeTab, setActiveTab, items, onLogout, adminName }: any) {
  return (
    <View style={S.sidebarContainer}>
      <View style={S.sidebarHeader}>
        <Text style={S.sidebarBrandTitle}>🏪 Namaste Mart</Text>
        <Text style={S.sidebarBrandSub}>👑 {adminName}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {items.map((item: SidebarItem) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[S.sidebarItem, isActive && S.sidebarItemActive]}
              onPress={() => setActiveTab(item.id)}
            >
              <Text style={S.sidebarItemIcon}>{item.icon}</Text>
              <Text style={[S.sidebarItemLabel, isActive && S.sidebarItemLabelActive]}>
                {item.label}
              </Text>
              {item.badge !== undefined && item.badge > 0 ? (
                <View style={S.sidebarBadge}>
                  <Text style={S.sidebarBadgeText}>{item.badge}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={[S.sidebarItem, { marginTop: 14 }]} onPress={onLogout}>
          <Text style={S.sidebarItemIcon}>🚪</Text>
          <Text style={[S.sidebarItemLabel, { color: '#EF4444' }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={S.sidebarFooter}>
        <Text style={S.sidebarFooterText}>NamasteMart v2.4 Admin</Text>
      </View>
    </View>
  );
}

function MetricCard({ S, emoji, label, value, color }: any) {
  return (
    <View style={[S.metricCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={S.metricEmoji}>{emoji}</Text>
      <Text style={[S.metricValue, { color }]}>{value}</Text>
      <Text style={S.metricLabel}>{label}</Text>
    </View>
  );
}

function AdminLoginScreen({
  S, isDarkMode, adminEmail, setAdminEmail, adminPassword, setAdminPassword,
  showPassword, setShowPassword, authLoading, authError, handleAdminLogin,
}: any) {
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

            <Text style={S.fieldLabel}>Admin Login ID / Email</Text>
            <TextInput
              style={S.loginInput}
              value={adminEmail}
              onChangeText={setAdminEmail}
              placeholder="admin email (e.g. admin@namastemart.com)"
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

            <Text style={S.loginHint}>Sign in with your admin-authorized email (must be in admins table).</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

function mapOrderStatusToParcel(status?: string): string {
  if (!status) return 'Waiting for Parcel Processing';
  const s = status.toLowerCase();
  if (s.includes('deliver')) return 'Delivered';
  if (s.includes('out') || s.includes('transit')) return 'Out for Delivery';
  if (s.includes('ship')) return 'Shipped';
  if (s.includes('prepar') || s.includes('pack')) return 'Preparing for Dispatch';
  if (s.includes('confirm') || s.includes('verif')) return 'Parcel Received';
  return 'Waiting for Parcel Processing';
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSIVE PROFESSIONAL STYLES
// ═══════════════════════════════════════════════════════════════════════════

const getStyles = (isDark: boolean) => {
  const bg = isDark ? '#0A0C10' : '#F4F6F9';
  const cardBg = isDark ? '#141820' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? '#9CA3AF' : '#6B7280';
  const border = isDark ? '#262D3D' : '#E5E7EB';
  const inputBg = isDark ? '#1C2230' : '#FFFFFF';
  const primary = '#10B981';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    dashboardLayout: { flex: 1, flexDirection: 'row' },

    // ── SIDEBAR STYLES ──
    sidebarContainer: {
      width: 250,
      backgroundColor: isDark ? '#0F131C' : '#FFFFFF',
      borderRightWidth: 1,
      borderRightColor: border,
      paddingVertical: 18,
      paddingHorizontal: 12,
    },
    sidebarHeader: {
      paddingBottom: 16,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    sidebarBrandTitle: { fontSize: 18, fontWeight: '900', color: primary },
    sidebarBrandSub: { fontSize: 11, color: textSub, marginTop: 3, fontWeight: '600' },
    sidebarItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 4,
    },
    sidebarItemActive: {
      backgroundColor: isDark ? '#1B2433' : '#ECFDF5',
      borderLeftWidth: 3,
      borderLeftColor: primary,
    },
    sidebarItemIcon: { fontSize: 16, marginRight: 10 },
    sidebarItemLabel: { fontSize: 13, fontWeight: '600', color: textSub, flex: 1 },
    sidebarItemLabelActive: { color: primary, fontWeight: '800' },
    sidebarBadge: {
      backgroundColor: primary,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    sidebarBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
    sidebarFooter: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: border,
      alignItems: 'center',
    },
    sidebarFooterText: { fontSize: 10, color: textSub },

    // ── MOBILE DRAWER ──
    mobileDrawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row' },
    mobileDrawerContent: { width: 280, backgroundColor: isDark ? '#0F131C' : '#FFFFFF', height: '100%' },
    mobileDrawerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },

    // ── MAIN CONTENT AREA ──
    mainContentArea: { flex: 1 },
    topHeaderBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: isDark ? '#0F131C' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: border,
      gap: 12,
    },
    menuToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      borderRadius: 8,
      gap: 6,
    },
    menuToggleIcon: { fontSize: 16, color: textMain },
    menuToggleText: { fontSize: 12, fontWeight: '700', color: textMain },
    topHeaderTitle: { fontSize: 18, fontWeight: '900', color: textMain },
    topHeaderSub: { fontSize: 11, color: textSub },
    topHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    quickAddBtn: {
      backgroundColor: primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    quickAddText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
    logoutIconBtn: {
      padding: 8,
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      borderRadius: 8,
    },
    logoutIconText: { fontSize: 16 },

    // ── SCROLL CONTENT ──
    scrollContainer: { flex: 1 },
    scrollContent: { padding: 18 },
    panelContainer: { width: '100%' },
    panelHeading: { fontSize: 18, fontWeight: '900', color: textMain },
    panelSub: { fontSize: 12, color: textSub, marginTop: 2, marginBottom: 14 },
    panelHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    actionAddBtn: {
      backgroundColor: primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    actionAddBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

    // ── CARDS & METRICS ──
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metricCard: {
      flex: 1,
      minWidth: 140,
      backgroundColor: cardBg,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    metricEmoji: { fontSize: 24, marginBottom: 4 },
    metricValue: { fontSize: 18, fontWeight: '900' },
    metricLabel: { fontSize: 11, color: textSub, textAlign: 'center', marginTop: 4 },
    card: {
      backgroundColor: cardBg,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: border,
    },
    cardTitle: { fontSize: 14, fontWeight: '800', color: textMain, marginBottom: 8 },

    // ── CHARTS ──
    barChartRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 140,
      gap: 8,
      paddingTop: 10,
      justifyContent: 'space-between',
    },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    barVisual: { width: '100%', borderRadius: 6, minHeight: 6 },
    barDayText: { fontSize: 10, fontWeight: '700', color: textSub, marginTop: 6 },
    barValueText: { fontSize: 9, color: textSub, marginBottom: 4 },

    // ── TOP PRODUCTS ──
    topProductItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: border,
      gap: 10,
    },
    topRankBadge: { fontSize: 14, fontWeight: '900', color: primary, width: 28 },
    topProductThumb: { width: 42, height: 42, borderRadius: 8 },
    topProductName: { fontSize: 13, fontWeight: '700', color: textMain },
    topProductSub: { fontSize: 11, color: textSub },
    topProductRev: { fontSize: 13, fontWeight: '900', color: primary },

    // ── SEARCH & FILTERS ──
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: inputBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 12,
    },
    searchIcon: { fontSize: 14, marginRight: 8 },
    searchInput: { flex: 1, fontSize: 13, color: textMain },
    categoryChipsRow: { marginBottom: 14 },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: inputBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: border,
      marginRight: 6,
    },
    filterChipActive: { backgroundColor: primary, borderColor: primary },
    filterChipText: { fontSize: 11, fontWeight: '700', color: textSub },
    filterChipTextActive: { color: '#FFFFFF' },

    // ── PRODUCT CARDS ──
    productCard: {
      flexDirection: 'row',
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      padding: 12,
      marginBottom: 10,
      gap: 12,
    },
    productCardImg: { width: 80, height: 80, borderRadius: 10 },
    productHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    productName: { fontSize: 14, fontWeight: '800', color: textMain, flex: 1 },
    productCategory: { fontSize: 11, color: textSub, marginTop: 2 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    finalPriceText: { fontSize: 14, fontWeight: '900', color: primary },
    originalPriceText: { fontSize: 11, color: textSub, textDecorationLine: 'line-through' },
    discountTag: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
    stockBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    stockBadgeIn: { backgroundColor: '#10B98120' },
    stockBadgeLow: { backgroundColor: '#F59E0B20' },
    stockBadgeOut: { backgroundColor: '#EF444420' },
    stockBadgeText: { fontSize: 10, fontWeight: '800', color: textMain },
    productActionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    editBtn: { backgroundColor: isDark ? '#1C2230' : '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
    editBtnText: { fontSize: 11, fontWeight: '700', color: textMain },
    toggleStockBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
    toggleStockText: { fontSize: 11, fontWeight: '700' },
    deleteBtn: { backgroundColor: '#EF444415', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
    deleteBtnText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },

    // ── ADD / EDIT PRODUCT FORM ──
    formLabel: { fontSize: 12, fontWeight: '700', color: textMain, marginBottom: 6 },
    formInput: {
      backgroundColor: inputBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 12,
      height: 44,
      fontSize: 13,
      color: textMain,
      marginBottom: 12,
    },
    rowFields: { flexDirection: 'row', gap: 10 },
    photoUploadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    photoPreview: { width: 68, height: 68, borderRadius: 10, borderWidth: 1, borderColor: border },
    photoPickBtn: {
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
    },
    photoPickBtnText: { fontSize: 12, fontWeight: '700', color: textMain },
    liveCalcBanner: {
      backgroundColor: isDark ? '#13211B' : '#E6F9F0',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: primary,
      marginBottom: 14,
    },
    liveCalcTitle: { fontSize: 12, fontWeight: '800', color: primary },
    liveCalcDetail: { fontSize: 11, color: textSub, marginTop: 2 },
    liveCalcResult: { fontSize: 13, fontWeight: '700', color: textMain, marginTop: 4 },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    switchLabel: { fontSize: 13, fontWeight: '700', color: textMain },
    switchSub: { fontSize: 11, color: textSub },
    formBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    cancelBtn: {
      flex: 1,
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 13, fontWeight: '700', color: textMain },
    submitBtn: {
      flex: 2,
      backgroundColor: primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    submitBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },

    // ── ORDERS & PENDING ORDERS ──
    orderCard: {
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      padding: 14,
      marginBottom: 12,
    },
    orderTopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderIdText: { fontSize: 14, fontWeight: '800', color: textMain },
    orderDateText: { fontSize: 10, color: textSub, marginTop: 2 },
    statusBadgePill: {
      backgroundColor: '#10B98120',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusBadgePillText: { fontSize: 10, fontWeight: '800', color: primary },
    orderCustomerBox: { marginVertical: 8 },
    orderCustomerName: { fontSize: 12, fontWeight: '700', color: textMain },
    orderCustomerSub: { fontSize: 11, color: textSub, marginTop: 2 },
    orderAddressText: { fontSize: 11, color: textSub, marginTop: 2 },
    orderItemCount: { fontSize: 12, color: textMain, marginTop: 4 },
    screenshotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    thumbSmall: { width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: border },
    screenshotHint: { fontSize: 11, fontWeight: '700', color: textMain },
    orderActionsBar: { flexDirection: 'row', gap: 8, marginTop: 10 },
    viewDetailsBtn: {
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    viewDetailsBtnText: { fontSize: 11, fontWeight: '700', color: textMain },
    quickVerifyBtn: { backgroundColor: '#10B98120', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
    quickVerifyBtnText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
    quickStatusBtn: { backgroundColor: '#3B82F620', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
    quickStatusBtnText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
    pendingBtnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    pendingActionBtn: {
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    pendingActionText: { fontSize: 10, fontWeight: '700', color: textMain },

    // ── PARCELS ──
    parcelCard: {
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      padding: 14,
      marginBottom: 12,
    },
    parcelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    parcelIdTitle: { fontSize: 13, fontWeight: '800', color: textMain },
    parcelDateSub: { fontSize: 10, color: textSub },
    parcelBadgePill: { backgroundColor: '#3B82F620', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
    parcelBadgePillText: { fontSize: 10, fontWeight: '800', color: '#3B82F6' },
    parcelDetailsBox: { marginVertical: 8 },
    parcelDetailRow: { fontSize: 11, color: textSub, marginBottom: 2 },
    bold: { fontWeight: '700', color: textMain },
    parcelActionLabel: { fontSize: 10, fontWeight: '800', color: textSub, marginTop: 6, marginBottom: 4 },
    parcelActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    parcelBtn: {
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    parcelBtnText: { fontSize: 10, fontWeight: '700', color: textMain },

    // ── CUSTOMERS ──
    customerCard: {
      flexDirection: 'row',
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      padding: 12,
      marginBottom: 10,
      gap: 12,
    },
    customerAvatar: { width: 50, height: 50, borderRadius: 25 },
    customerName: { fontSize: 13, fontWeight: '800', color: textMain },
    customerSub: { fontSize: 11, color: textSub, marginTop: 1 },
    customerAddress: { fontSize: 11, color: textSub, marginTop: 3 },
    customerStatsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    customerStatPill: {
      fontSize: 10,
      fontWeight: '700',
      color: textMain,
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },

    // ── INVENTORY & DISCOUNTS ──
    tabRowButtons: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tabChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: border,
    },
    tabChipActive: { backgroundColor: primary, borderColor: primary },
    tabChipText: { fontSize: 11, fontWeight: '700', color: textSub },
    tabChipTextActive: { color: '#FFFFFF' },
    inventoryCard: {
      flexDirection: 'row',
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      padding: 12,
      marginBottom: 8,
      gap: 12,
    },
    inventoryThumb: { width: 60, height: 60, borderRadius: 8 },
    inventoryName: { fontSize: 13, fontWeight: '800', color: textMain },
    inventorySub: { fontSize: 11, color: textSub, marginTop: 2 },
    stockAdjustRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
    adjustBtn: {
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    adjustBtnText: { fontSize: 11, fontWeight: '800', color: textMain },
    discountCard: {
      flexDirection: 'row',
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      padding: 12,
      marginBottom: 10,
      gap: 12,
    },
    discountPresetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    discountChipBtn: {
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    discountChipBtnActive: { backgroundColor: '#EF4444' },
    discountChipText: { fontSize: 10, fontWeight: '800', color: textMain },
    discountChipTextActive: { color: '#FFFFFF' },

    // ── SETTINGS ──
    settingSub: { fontSize: 12, color: textSub, marginBottom: 8 },
    bankSettingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    bankSettingName: { fontSize: 12, fontWeight: '700', color: textMain },
    bankSettingAcc: { fontSize: 11, color: textSub },

    // ── MODALS ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    orderModalContent: {
      width: '100%',
      maxWidth: 580,
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: border,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    modalTitle: { fontSize: 16, fontWeight: '900', color: textMain },
    modalSubtitle: { fontSize: 11, color: textSub },
    modalSection: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: border, paddingBottom: 10 },
    modalSectionTitle: { fontSize: 12, fontWeight: '800', color: primary, marginBottom: 6 },
    modalText: { fontSize: 11, color: textSub, marginBottom: 2 },
    modalItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    modalItemImg: { width: 36, height: 36, borderRadius: 6 },
    modalItemName: { fontSize: 11, fontWeight: '700', color: textMain },
    modalItemSub: { fontSize: 10, color: textSub },
    modalItemTotal: { fontSize: 11, fontWeight: '800', color: textMain },
    modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: border },
    modalTotalLabel: { fontSize: 12, fontWeight: '800', color: textMain },
    modalTotalValue: { fontSize: 14, fontWeight: '900', color: primary },
    modalScreenshotThumb: { width: 140, height: 140, borderRadius: 10, marginTop: 6 },
    modalActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    actionBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
    zoomModalOverlay: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
    zoomCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
    zoomImage: { width: '90%', height: '80%' },

    // ── ACCESS DENIED & LOGIN ──
    accessDeniedCard: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      maxWidth: 460,
      alignSelf: 'center',
    },
    accessDeniedTitle: { fontSize: 22, fontWeight: '900', color: '#EF4444', marginTop: 14 },
    accessDeniedSub: { fontSize: 13, color: textSub, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    primaryBtn: {
      backgroundColor: primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginTop: 20,
      width: '100%',
      alignItems: 'center',
    },
    primaryBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    secondaryBtn: {
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 24,
      width: '100%',
      alignItems: 'center',
    },
    secondaryBtnText: { fontSize: 13, fontWeight: '700', color: textMain },
    loginCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: border,
      alignItems: 'center',
    },
    loginIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? '#13211B' : '#E6F9F0',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    loginTitle: { fontSize: 20, fontWeight: '900', color: textMain },
    loginSub: { fontSize: 12, color: textSub, marginBottom: 18 },
    fieldLabel: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', color: textMain, marginBottom: 4 },
    loginInput: {
      width: '100%',
      height: 46,
      backgroundColor: inputBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: border,
      paddingHorizontal: 12,
      fontSize: 13,
      color: textMain,
      marginBottom: 12,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: 12,
    },
    showPassBtn: { position: 'absolute', right: 12 },
    showPassText: { fontSize: 16 },
    authErrorText: { color: '#EF4444', fontSize: 12, marginBottom: 10, textAlign: 'center' },
    loginBtn: {
      width: '100%',
      height: 46,
      backgroundColor: primary,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 6,
    },
    loginBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
    autoFillBtn: {
      marginTop: 12,
      padding: 10,
      backgroundColor: isDark ? '#1C2230' : '#F3F4F6',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: border,
      alignItems: 'center',
      width: '100%',
    },
    autoFillBtnText: { fontSize: 11, fontWeight: '800', color: isDark ? '#D4AF37' : '#C88D2B' },
    loginHint: { fontSize: 10, color: textSub, marginTop: 10 },
    emptyStateBox: { alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: textMain, marginTop: 8 },
    emptySub: { fontSize: 12, color: textSub, marginTop: 2, textAlign: 'center' },
    emptyHint: { fontSize: 12, color: textSub, textAlign: 'center', padding: 20 },
  });
};
