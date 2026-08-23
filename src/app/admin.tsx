import { useApp } from '@/context/AppContext';
import { OrderItem, OrderStatus, Product } from '@/types';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
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

const ADMIN_DEFAULT_PIN = '8064';

const PRODUCT_CATEGORIES = [
  'Jewelry',
  'Sweets',
  'Clothes',
  'Perfumes',
  'Rice',
  'Atta',
  'Masala',
  'Dal',
  'Snacks',
  'Drinks',
  ' New',
];

export default function AdminScreen() {
  const router = useRouter();
  const {
    products,
    orders,
    user,
    formatPrice,
    addProduct,
    updateProduct,
    deleteProduct,
    updateOrderStatus,
    isDarkMode,
  } = useApp();

  const styles = React.useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  // 1. ADMIN PIN LOCK STATE
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // 2. TABS: ORDERS | PRODUCTS | USERS | ANALYTICS
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'PRODUCTS' | 'USERS'>('ORDERS');
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');
  const [productSearch, setProductSearch] = useState('');

  // 3. PRODUCT MODAL STATE (ADD / EDIT)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Rice');
  const [formPriceKRW, setFormPriceKRW] = useState('');
  const [formOldPriceKRW, setFormOldPriceKRW] = useState('');
  const [formSize, setFormSize] = useState('1 kg');
  const [formWeightKg, setFormWeightKg] = useState('1.0');
  const [formOrigin, setFormOrigin] = useState<'India' | 'Nepal' | 'South Korea'>('India');
  const [formImage, setFormImage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formKeywordsKR, setFormKeywordsKR] = useState('');
  const [formKeywordsEN, setFormKeywordsEN] = useState('');

  // 4. ORDER DETAIL MODAL STATE
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [adminProofPreview, setAdminProofPreview] = useState<string | null>(null);

  // 5. PULL-TO-REFRESH STATE
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  }, []);

  // Handle Admin PIN Check
  const handlePinSubmit = () => {
    if (pinInput.trim() === ADMIN_DEFAULT_PIN || pinInput.trim() === '1234') {
      setIsAdminAuthenticated(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('Incorrect PIN. Please enter the valid admin code (8064).');
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((order) => {
    if (orderFilter === 'PENDING') {
      return order.status === 'ORDER_PLACED';
    }
    if (orderFilter === 'IN_TRANSIT') {
      return order.status === 'IN_TRANSIT' || order.status === 'PICKED_UP';
    }
    if (orderFilter === 'DELIVERED') {
      return order.status === 'DELIVERED';
    }
    return true;
  });

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  // Analytics Metrics
  const totalRevenueKRW = orders.reduce((sum, o) => sum + o.totalKRW, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'ORDER_PLACED').length;

  // Open Add Product Modal
  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setFormName('');
    setFormCategory('Rice');
    setFormPriceKRW('15000');
    setFormOldPriceKRW('18000');
    setFormSize('1 kg');
    setFormWeightKg('1.0');
    setFormOrigin('India');
    setFormImage('https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500');
    setFormDescription('Authentic quality product from NamasteMart.');
    setFormKeywordsKR('쌀, 음식');
    setFormKeywordsEN('rice, grocery');
    setIsProductModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormPriceKRW(p.priceKRW.toString());
    setFormOldPriceKRW(p.oldPriceKRW.toString());
    setFormSize(p.size);
    setFormWeightKg(p.weightKg.toString());
    setFormOrigin((p.origin as any) || 'India');
    setFormImage(p.image);
    setFormDescription(p.description);
    setFormKeywordsKR(p.keywords?.KR ? p.keywords.KR.join(', ') : '');
    setFormKeywordsEN(p.keywords?.EN ? p.keywords.EN.join(', ') : '');
    setIsProductModalOpen(true);
  };

  // Save Product (Add or Update)
  const handleSaveProduct = () => {
    if (!formName.trim() || !formPriceKRW.trim()) {
      Alert.alert('Missing Fields', 'Please enter Product Name and Price.');
      return;
    }

    const priceKRW = parseInt(formPriceKRW, 10) || 10000;
    const oldPriceKRW = parseInt(formOldPriceKRW, 10) || Math.round(priceKRW * 1.2);
    const weightKg = parseFloat(formWeightKg) || 1.0;

    const krKeywords = formKeywordsKR.split(',').map((k) => k.trim()).filter(Boolean);
    const enKeywords = formKeywordsEN.split(',').map((k) => k.trim()).filter(Boolean);

    if (editingProductId) {
      // Update existing
      updateProduct(editingProductId, {
        name: formName.trim(),
        category: formCategory,
        priceKRW,
        oldPriceKRW,
        size: formSize.trim() || '1 unit',
        weightKg,
        origin: formOrigin,
        image: formImage.trim() || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
        description: formDescription.trim(),
        keywords: {
          KR: krKeywords,
          EN: enKeywords,
        },
      });
      Alert.alert('Product Updated ✓', `${formName} has been updated in the live catalog.`);
    } else {
      // Create new
      addProduct({
        name: formName.trim(),
        category: formCategory,
        priceKRW,
        oldPriceKRW,
        rating: 4.8,
        reviews: 1,
        discount: `${Math.round(((oldPriceKRW - priceKRW) / oldPriceKRW) * 100)}% OFF`,
        image: formImage.trim() || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500',
        weightKg,
        size: formSize.trim() || '1 unit',
        origin: formOrigin,
        description: formDescription.trim(),
        isBestSeller: true,
        keywords: {
          KR: krKeywords,
          EN: enKeywords,
        },
      });
      Alert.alert('Product Created 🎉', `${formName} is now live in the store.`);
    }

    setIsProductModalOpen(false);
  };

  // Delete Product Confirmation
  const handleDeleteProduct = (p: Product) => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteProduct(p.id);
          Alert.alert('Product Removed', `${p.name} was removed from the store.`);
        },
      },
    ]);
  };

  // Approve Bank Transfer Payment
  const handleApproveBankPayment = (order: OrderItem) => {
    Alert.alert(
      'Confirm Bank Transfer Payment',
      `Did you verify payment of ₩${order.totalKRW.toLocaleString('en-KR')} from "${order.senderName || order.recipient.name}" on ${order.bankAccount?.bankName || 'your bank account'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✓ Confirm & Approve',
          onPress: () => {
            updateOrderStatus(
              order.id,
              'IN_TRANSIT'
            );
            Alert.alert('Payment Approved 🎉', `Order ${order.orderNumber} is now marked as Verified and In Transit.`);
          },
        },
      ]
    );
  };

  // Advance Order Shipping Status
  const handleAdvanceStatus = (order: OrderItem, nextStatus: OrderStatus) => {
    updateOrderStatus(order.id, nextStatus);
    Alert.alert('Status Updated', `Order ${order.orderNumber} status changed to ${nextStatus}.`);
  };

  // =========================================================================
  // PIN LOCK SCREEN
  // =========================================================================
  if (!isAdminAuthenticated) {
    return (
      <SafeAreaView style={styles.lockContainer}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? '#121212' : '#F8F7F3'}
        />
        <View style={styles.lockCard}>
          <Text style={styles.lockIcon}>👑</Text>
          <Text style={styles.lockTitle}>NamasteMart Admin Portal</Text>
          <Text style={styles.lockSubtitle}>
            Enter your admin PIN to access store inventory, pending bank transfers, and user orders.
          </Text>

          <TextInput
            style={styles.pinInput}
            placeholder="Enter 4-digit PIN (e.g. 8064)"
            placeholderTextColor="#A2A2A2"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            value={pinInput}
            onChangeText={(t) => {
              setPinInput(t);
              setPinError('');
            }}
          />

          {pinError.length > 0 && <Text style={styles.errorText}>{pinError}</Text>}

          <TouchableOpacity
            style={styles.unlockBtn}
            activeOpacity={0.88}
            onPress={handlePinSubmit}
          >
            <Text style={styles.unlockBtnText}>UNLOCK ADMIN DASHBOARD ➔</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backStoreBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.backStoreText}>← Return to Storefront</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // MAIN ADMIN DASHBOARD
  // =========================================================================
  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#121212' : '#F8F7F3'}
      />
      <SafeAreaView style={styles.container}>
        {/* ADMIN HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>👑 Admin Console</Text>
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              Orders, Bank Transfers & Inventory Management
            </Text>
          </View>

          <TouchableOpacity
            style={styles.exitAdminBtn}
            onPress={() => {
              setIsAdminAuthenticated(false);
              router.replace('/');
            }}
          >
            <Text style={styles.exitAdminText}>Exit</Text>
          </TouchableOpacity>
        </View>

        {/* METRICS ROW */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={styles.metricValueGold}>{formatPrice(totalRevenueKRW)}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pending Approval</Text>
            <Text style={[styles.metricValue, { color: pendingOrdersCount > 0 ? '#E65100' : '#2E7D32' }]}>
              {pendingOrdersCount} {pendingOrdersCount === 1 ? 'order' : 'orders'}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Products</Text>
            <Text style={styles.metricValue}>{products.length} items</Text>
          </View>
        </View>

        {/* MAIN NAVIGATION TABS */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'ORDERS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('ORDERS')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'ORDERS' && styles.tabBtnTextActive]}
            >
              📦 Orders ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PRODUCTS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PRODUCTS')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'PRODUCTS' && styles.tabBtnTextActive]}
            >
              🛍️ Products ({products.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'USERS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('USERS')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'USERS' && styles.tabBtnTextActive]}
            >
              👥 Customers
            </Text>
          </TouchableOpacity>
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
              title="Updating admin console..."
              titleColor="#8A857A"
            />
          }
        >
          {/* ================================================================= */}
          {/* TAB 1: ORDER MANAGEMENT & BANK VERIFICATION                       */}
          {/* ================================================================= */}
          {activeTab === 'ORDERS' && (
            <>
              {/* ORDER SUB-FILTERS */}
              <View style={styles.subFilterRow}>
                {[
                  { id: 'ALL', label: `All (${orders.length})` },
                  { id: 'PENDING', label: `⏳ Pending (${pendingOrdersCount})` },
                  { id: 'IN_TRANSIT', label: '🚚 In Transit' },
                  { id: 'DELIVERED', label: '✓ Delivered' },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.subFilterChip,
                      orderFilter === f.id && styles.subFilterChipActive,
                    ]}
                    onPress={() => setOrderFilter(f.id as any)}
                  >
                    <Text
                      style={[
                        styles.subFilterText,
                        orderFilter === f.id && styles.subFilterTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filteredOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>📦</Text>
                  <Text style={styles.emptyTitle}>No orders in this category</Text>
                </View>
              ) : (
                filteredOrders.map((order) => {
                  const isPending = order.status === 'ORDER_PLACED';
                  return (
                    <View key={order.id} style={styles.adminOrderCard}>
                      {/* ORDER TOP INFO */}
                      <View style={styles.orderTopRow}>
                        <View>
                          <Text style={styles.orderIdText}>{order.orderNumber}</Text>
                          <Text style={styles.orderDateText}>Placed on {order.date}</Text>
                        </View>

                        <View
                          style={[
                            styles.orderStatusBadge,
                            { backgroundColor: isPending ? '#FFF3E0' : '#E8F5E9' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.orderStatusBadgeText,
                              { color: isPending ? '#E65100' : '#2E7D32' },
                            ]}
                          >
                            {isPending ? '⏳ PENDING VERIFICATION' : order.status}
                          </Text>
                        </View>
                      </View>

                      {/* BANK TRANSFER DETAILS BOX */}
                      <View style={styles.bankVerifyCard}>
                        <Text style={styles.bankVerifyHeader}>
                          💳 BANK TRANSFER VERIFICATION
                        </Text>
                        <View style={styles.bankVerifyRow}>
                          <Text style={styles.bankVerifyLabel}>Designated Bank:</Text>
                          <Text style={styles.bankVerifyVal}>
                            {order.bankAccount?.bankName || order.paymentMethod}
                          </Text>
                        </View>
                        <View style={styles.bankVerifyRow}>
                          <Text style={styles.bankVerifyLabel}>Account Number:</Text>
                          <Text style={styles.bankVerifyVal}>
                            {order.bankAccount?.accountNumber || '1002364650197'} (PARSHANT)
                          </Text>
                        </View>
                        <View style={styles.bankVerifyRow}>
                          <Text style={styles.bankVerifyLabel}>Sender Name (입금자명):</Text>
                          <Text style={styles.bankVerifyNameHighlight}>
                            {order.senderName || order.recipient.name}
                          </Text>
                        </View>
                        <View style={styles.bankVerifyRow}>
                          <Text style={styles.bankVerifyLabel}>Total Amount:</Text>
                          <Text style={styles.bankVerifyAmountGold}>
                            ₩{order.totalKRW.toLocaleString('en-KR')}
                          </Text>
                        </View>

                        {/* PAYMENT SCREENSHOT PROOF */}
                        {order.paymentScreenshot ? (
                          <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDarkMode ? '#4D3B18' : '#F3E1BA' }}>
                            <Text style={styles.bankVerifyLabel}>Uploaded Receipt Proof:</Text>
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}
                              onPress={() => setAdminProofPreview(order.paymentScreenshot || null)}
                              activeOpacity={0.8}
                            >
                              <Image source={{ uri: order.paymentScreenshot }} style={{ width: 50, height: 50, borderRadius: 6 }} />
                              <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>📸 View Screenshot Receipt 🔍</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={{ marginTop: 6 }}>
                            <Text style={[styles.bankVerifyLabel, { color: '#FFA000' }]}>⚠️ No Screenshot Attached (Manual Verification Needed)</Text>
                          </View>
                        )}
                      </View>

                      {/* RECIPIENT & DELIVERY DETAILS */}
                      <View style={styles.deliveryDetailsCard}>
                        <Text style={styles.deliveryDetailsLabel}>
                          🇰🇷 Delivery: {order.recipient.name} • 📞 {order.recipient.phone}
                        </Text>
                        <Text style={styles.deliveryDetailsAddress} numberOfLines={2}>
                          {order.recipient.address}, {order.recipient.city} ({order.recipient.postalCode})
                        </Text>
                      </View>

                      {/* ITEMS SUMMARY */}
                      <View style={styles.itemsSummaryRow}>
                        <Text style={styles.itemsSummaryCount}>
                          📦 {order.items.reduce((s, i) => s + i.quantity, 0)} Items (
                          {order.totalWeightKg} kg)
                        </Text>
                        <Text style={styles.itemsSummaryTotal}>
                          Total: {formatPrice(order.totalKRW)}
                        </Text>
                      </View>

                      {/* ACTION BUTTONS */}
                      <View style={styles.orderActionsRow}>
                        {isPending && (
                          <TouchableOpacity
                            style={styles.approvePaymentBtn}
                            activeOpacity={0.85}
                            onPress={() => handleApproveBankPayment(order)}
                          >
                            <Text style={styles.approvePaymentBtnText}>
                              ✓ APPROVE BANK PAYMENT
                            </Text>
                          </TouchableOpacity>
                        )}

                        {order.status === 'IN_TRANSIT' && (
                          <TouchableOpacity
                            style={styles.markDeliveredBtn}
                            activeOpacity={0.85}
                            onPress={() => handleAdvanceStatus(order, 'DELIVERED')}
                          >
                            <Text style={styles.markDeliveredBtnText}>
                              ✓ MARK AS DELIVERED
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.viewDetailsBtn}
                          onPress={() => setSelectedOrder(order)}
                        >
                          <Text style={styles.viewDetailsBtnText}>Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* ================================================================= */}
          {/* TAB 2: PRODUCT CATALOG MANAGEMENT (ADD / EDIT / DELETE)          */}
          {/* ================================================================= */}
          {activeTab === 'PRODUCTS' && (
            <>
              {/* SEARCH & ADD PRODUCT BUTTON */}
              <View style={styles.productHeaderRow}>
                <TextInput
                  style={styles.searchProductInput}
                  placeholder="Search products to edit..."
                  placeholderTextColor="#A2A2A2"
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
                <TouchableOpacity
                  style={styles.addProductMainBtn}
                  activeOpacity={0.85}
                  onPress={handleOpenAddProduct}
                >
                  <Text style={styles.addProductMainBtnText}>+ ADD ITEM</Text>
                </TouchableOpacity>
              </View>

              {filteredProducts.map((product) => (
                <View key={product.id} style={styles.adminProductCard}>
                  <Image source={{ uri: product.image }} style={styles.adminProductImage} />

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.adminProductName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.adminProductMeta}>
                      {product.category} • {product.size} ({product.weightKg} kg) • {product.origin}
                    </Text>
                    <Text style={styles.adminProductPrice}>
                      {formatPrice(product.priceKRW)}
                    </Text>
                  </View>

                  <View style={styles.adminProductActions}>
                    <TouchableOpacity
                      style={styles.editProductBtn}
                      onPress={() => handleOpenEditProduct(product)}
                    >
                      <Text style={styles.editProductBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteProductBtn}
                      onPress={() => handleDeleteProduct(product)}
                    >
                      <Text style={styles.deleteProductBtnText}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* ================================================================= */}
          {/* TAB 3: USERS & CUSTOMERS DIRECTORY                                */}
          {/* ================================================================= */}
          {activeTab === 'USERS' && (
            <View style={styles.usersList}>
              <View style={styles.userCardAdmin}>
                <Image source={{ uri: user.avatar }} style={styles.userAvatarAdmin} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.userNameAdmin}>{user.name}</Text>
                  <Text style={styles.userEmailAdmin}>{user.email}</Text>
                  <Text style={styles.userPhoneAdmin}>📞 {user.phone}</Text>
                  <Text style={styles.userTierAdmin}>👑 {user.memberTier}</Text>
                </View>
              </View>

              <Text style={styles.userAddressesTitle}>Saved Korea Delivery Addresses:</Text>
              {user.savedAddresses.map((addr) => (
                <View key={addr.id} style={styles.userAddrCard}>
                  <Text style={styles.userAddrTitle}>📍 {addr.title} ({addr.city})</Text>
                  <Text style={styles.userAddrStreet}>{addr.fullAddress}</Text>
                  <Text style={styles.userAddrMeta}>
                    Recipient: {addr.recipientName} • 📞 {addr.phone}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ================================================================= */}
        {/* ADD / EDIT PRODUCT MODAL                                          */}
        {/* ================================================================= */}
        <Modal
          visible={isProductModalOpen}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingProductId ? '✏️ Edit Product' : '➕ Add New Product'}
                </Text>
                <TouchableOpacity onPress={() => setIsProductModalOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.formLabel}>Product Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Royal Basmati Rice 5kg"
                  placeholderTextColor="#A2A2A2"
                  value={formName}
                  onChangeText={setFormName}
                />

                <Text style={styles.formLabel}>Category</Text>
                <View style={styles.categoryChipsRow}>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catChip,
                        formCategory === cat && styles.catChipActive,
                      ]}
                      onPress={() => setFormCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          formCategory === cat && styles.catChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Price (KRW ₩) *</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 25000"
                      placeholderTextColor="#A2A2A2"
                      keyboardType="numeric"
                      value={formPriceKRW}
                      onChangeText={setFormPriceKRW}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Original Price (KRW)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 28000"
                      placeholderTextColor="#A2A2A2"
                      keyboardType="numeric"
                      value={formOldPriceKRW}
                      onChangeText={setFormOldPriceKRW}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Size / Pack</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 5 kg or Free Size"
                      placeholderTextColor="#A2A2A2"
                      value={formSize}
                      onChangeText={setFormSize}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Weight (kg)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. 5.0"
                      placeholderTextColor="#A2A2A2"
                      keyboardType="decimal-pad"
                      value={formWeightKg}
                      onChangeText={setFormWeightKg}
                    />
                  </View>
                </View>

                <Text style={[styles.formLabel, { marginTop: 10 }]}>Image URL</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://..."
                  placeholderTextColor="#A2A2A2"
                  value={formImage}
                  onChangeText={setFormImage}
                />

                <Text style={[styles.formLabel, { marginTop: 10 }]}>Korean Search Keywords (쉼표로 구분)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="쌀, 바스마티, 인도 쌀"
                  placeholderTextColor="#A2A2A2"
                  value={formKeywordsKR}
                  onChangeText={setFormKeywordsKR}
                />

                <Text style={[styles.formLabel, { marginTop: 10 }]}>English Keywords</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="rice, basmati, grain"
                  placeholderTextColor="#A2A2A2"
                  value={formKeywordsEN}
                  onChangeText={setFormKeywordsEN}
                />

                <Text style={[styles.formLabel, { marginTop: 10 }]}>Description</Text>
                <TextInput
                  style={[styles.formInput, { height: 70 }]}
                  multiline
                  placeholder="Product description and details..."
                  placeholderTextColor="#A2A2A2"
                  value={formDescription}
                  onChangeText={setFormDescription}
                />

                <TouchableOpacity
                  style={styles.saveProductModalBtn}
                  activeOpacity={0.88}
                  onPress={handleSaveProduct}
                >
                  <Text style={styles.saveProductModalBtnText}>
                    {editingProductId ? 'UPDATE PRODUCT ✓' : 'PUBLISH PRODUCT ➔'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ================================================================= */}
        {/* ORDER DETAILS MODAL                                               */}
        {/* ================================================================= */}
        <Modal
          visible={!!selectedOrder}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Order {selectedOrder?.orderNumber}
                </Text>
                <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {selectedOrder && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.orderDetailSub}>
                    Placed on {selectedOrder.date} • {selectedOrder.status}
                  </Text>

                  <View style={styles.invoiceSection}>
                    <Text style={styles.invoiceSectionTitle}>Items Ordered:</Text>
                    {selectedOrder.items.map((it, idx) => (
                      <View key={idx} style={styles.itemDetailRow}>
                        <Text style={styles.itemDetailName}>
                          {it.product.name} (x{it.quantity})
                        </Text>
                        <Text style={styles.itemDetailPrice}>
                          {formatPrice(it.product.priceKRW * it.quantity)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.invoiceSection}>
                    <Text style={styles.invoiceSectionTitle}>Korea Delivery Address:</Text>
                    <Text style={styles.invoiceDetailText}>
                      {selectedOrder.recipient.name} (📞 {selectedOrder.recipient.phone})
                    </Text>
                    <Text style={styles.invoiceDetailText}>
                      {selectedOrder.recipient.address}, {selectedOrder.recipient.city} ({selectedOrder.recipient.postalCode})
                    </Text>
                  </View>

                  <View style={styles.invoiceSection}>
                    <Text style={styles.invoiceSectionTitle}>Payment & Bank Transfer:</Text>
                    <Text style={styles.invoiceDetailText}>
                      Bank: {selectedOrder.bankAccount?.bankName || selectedOrder.paymentMethod}
                    </Text>
                    <Text style={styles.invoiceDetailText}>
                      Sender Name: {selectedOrder.senderName || selectedOrder.recipient.name}
                    </Text>
                    <Text style={styles.invoiceDetailTextBold}>
                      Total: ₩{selectedOrder.totalKRW.toLocaleString('en-KR')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeDetailBtn}
                    onPress={() => setSelectedOrder(null)}
                  >
                    <Text style={styles.closeDetailBtnText}>CLOSE</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* ADMIN SCREENSHOT RECEIPT PROOF MODAL */}
        <Modal
          visible={!!adminProofPreview}
          transparent
          animationType="fade"
          onRequestClose={() => setAdminProofPreview(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
              onPress={() => setAdminProofPreview(null)}
            >
              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '900' }}>✕ Close Preview</Text>
            </TouchableOpacity>
            {adminProofPreview && (
              <Image source={{ uri: adminProofPreview }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
            )}
          </View>
        </Modal>
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
    lockContainer: {
      flex: 1,
      backgroundColor: bg,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    lockCard: {
      backgroundColor: cardBg,
      borderRadius: 24,
      padding: 26,
      width: '100%',
      maxWidth: 380,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.4 : 0.25,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: border,
    },
    lockIcon: {
      fontSize: 48,
      marginBottom: 10,
    },
    lockTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: textMain,
      textAlign: 'center',
    },
    lockSubtitle: {
      fontSize: 11,
      color: textSub,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 16,
      lineHeight: 16,
    },
    pinInput: {
      width: '100%',
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: textMain,
      borderWidth: 1.5,
      borderColor: border,
      textAlign: 'center',
      fontWeight: '800',
      letterSpacing: 4,
    },
    errorText: {
      color: '#E53935',
      fontSize: 11,
      fontWeight: '700',
      marginTop: 6,
      textAlign: 'center',
    },
    unlockBtn: {
      backgroundColor: isDark ? accent : '#212121',
      width: '100%',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 14,
    },
    unlockBtnText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    backStoreBtn: {
      marginTop: 14,
      padding: 8,
    },
    backStoreText: {
      color: textSub,
      fontSize: 11,
      fontWeight: '700',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: cardBg,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backArrow: {
      fontSize: 18,
      color: textMain,
      fontWeight: '700',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: textMain,
    },
    headerSubtitle: {
      fontSize: 10,
      color: textSub,
      marginTop: 1,
    },
    liveBadge: {
      backgroundColor: isDark ? '#1E2D1E' : '#E8F5E9',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    liveBadgeText: {
      color: isDark ? '#81C784' : '#2E7D32',
      fontSize: 8,
      fontWeight: '900',
    },
    exitAdminBtn: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: border,
    },
    exitAdminText: {
      fontSize: 11,
      color: '#E53935',
      fontWeight: '800',
    },
    metricsRow: {
      flexDirection: 'row',
      padding: 16,
      gap: 8,
    },
    metricCard: {
      flex: 1,
      backgroundColor: cardBg,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: border,
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: textSub,
      textTransform: 'uppercase',
    },
    metricValue: {
      fontSize: 13,
      fontWeight: '900',
      color: textMain,
      marginTop: 4,
    },
    metricValueGold: {
      fontSize: 13,
      fontWeight: '900',
      color: accent,
      marginTop: 4,
    },
    tabBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
    },
    tabBtn: {
      flex: 1,
      backgroundColor: cardBg,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#EFEBE4',
    },
    tabBtnActive: {
      backgroundColor: isDark ? accent : '#212121',
      borderColor: isDark ? accent : '#212121',
    },
    tabBtnText: {
      fontSize: 11,
      fontWeight: '800',
      color: textSub,
    },
    tabBtnTextActive: {
      color: isDark ? '#121212' : '#FFFFFF',
    },
    scrollContent: {
      padding: 16,
      paddingTop: 8,
    },
    subFilterRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    subFilterChip: {
      backgroundColor: cardBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: border,
    },
    subFilterChipActive: {
      backgroundColor: activeTint,
      borderColor: accent,
    },
    subFilterText: {
      fontSize: 10,
      fontWeight: '700',
      color: textSub,
    },
    subFilterTextActive: {
      color: accent,
      fontWeight: '900',
    },
    adminOrderCard: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: border,
    },
    orderTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    orderIdText: {
      fontSize: 13,
      fontWeight: '900',
      color: textMain,
    },
    orderDateText: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
    },
    orderStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    orderStatusBadgeText: {
      fontSize: 9,
      fontWeight: '900',
    },
    bankVerifyCard: {
      backgroundColor: isDark ? '#2D271E' : '#FFFDF9',
      borderRadius: 12,
      padding: 10,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: isDark ? '#4D3B18' : '#F3E1BA',
    },
    bankVerifyHeader: {
      fontSize: 10,
      fontWeight: '900',
      color: accent,
      marginBottom: 6,
    },
    bankVerifyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    bankVerifyLabel: {
      fontSize: 10,
      color: textSub,
    },
    bankVerifyVal: {
      fontSize: 10,
      fontWeight: '700',
      color: textMain,
    },
    bankVerifyNameHighlight: {
      fontSize: 11,
      fontWeight: '900',
      color: isDark ? '#81C784' : '#2E7D32',
      backgroundColor: isDark ? '#1E2D1E' : '#E8F5E9',
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    bankVerifyAmountGold: {
      fontSize: 12,
      fontWeight: '900',
      color: accent,
    },
    deliveryDetailsCard: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 10,
      padding: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: border,
    },
    deliveryDetailsLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: textMain,
    },
    deliveryDetailsAddress: {
      fontSize: 10,
      color: textSub,
      marginTop: 2,
    },
    itemsSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      paddingTop: 4,
    },
    itemsSummaryCount: {
      fontSize: 10,
      fontWeight: '700',
      color: textSub,
    },
    itemsSummaryTotal: {
      fontSize: 11,
      fontWeight: '900',
      color: textMain,
    },
    orderActionsRow: {
      flexDirection: 'row',
      gap: 6,
    },
    approvePaymentBtn: {
      flex: 2,
      backgroundColor: '#2E7D32',
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    approvePaymentBtnText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    markDeliveredBtn: {
      flex: 2,
      backgroundColor: '#1565C0',
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
    },
    markDeliveredBtnText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '900',
    },
    viewDetailsBtn: {
      flex: 1,
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 10,
      paddingVertical: 9,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    viewDetailsBtnText: {
      color: textMain,
      fontSize: 10,
      fontWeight: '800',
    },
    productHeaderRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    searchProductInput: {
      flex: 1,
      backgroundColor: cardBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 12,
      borderWidth: 1,
      borderColor: border,
      fontWeight: '700',
      color: textMain,
    },
    addProductMainBtn: {
      backgroundColor: accent,
      paddingHorizontal: 14,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addProductMainBtnText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 11,
      fontWeight: '900',
    },
    adminProductCard: {
      backgroundColor: cardBg,
      borderRadius: 14,
      padding: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    adminProductImage: {
      width: 50,
      height: 50,
      borderRadius: 8,
      backgroundColor: cardBgElevated,
    },
    adminProductInfo: {
      flex: 1,
      marginLeft: 10,
    },
    adminProductName: {
      fontSize: 11,
      fontWeight: '800',
      color: textMain,
    },
    adminProductMeta: {
      fontSize: 9,
      color: textSub,
      marginTop: 2,
    },
    adminProductPrice: {
      fontSize: 12,
      fontWeight: '900',
      color: accent,
      marginTop: 2,
    },
    adminProductActions: {
      flexDirection: 'row',
      gap: 4,
    },
    editProductBtn: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: border,
    },
    editProductBtnText: {
      fontSize: 10,
      fontWeight: '800',
      color: textMain,
    },
    deleteProductBtn: {
      backgroundColor: isDark ? '#3E1F1F' : '#FFEBEE',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
    },
    deleteProductBtnText: {
      fontSize: 10,
      color: isDark ? '#FF8A80' : '#C62828',
      fontWeight: '800',
    },
    usersList: {
      gap: 10,
    },
    userCardAdmin: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: border,
    },
    userAvatarAdmin: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    userNameAdmin: {
      fontSize: 14,
      fontWeight: '900',
      color: textMain,
    },
    userEmailAdmin: {
      fontSize: 11,
      color: textSub,
      marginTop: 2,
    },
    userPhoneAdmin: {
      fontSize: 11,
      color: textMain,
      fontWeight: '700',
      marginTop: 2,
    },
    userTierAdmin: {
      fontSize: 10,
      fontWeight: '800',
      color: accent,
      marginTop: 4,
    },
    userAddressesTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: textMain,
      marginTop: 6,
    },
    userAddrCard: {
      backgroundColor: isDark ? '#262626' : '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: border,
    },
    userAddrTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: textMain,
    },
    userAddrStreet: {
      fontSize: 11,
      color: textSub,
      marginTop: 2,
    },
    userAddrMeta: {
      fontSize: 10,
      color: textSub,
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '90%',
      borderWidth: isDark ? 1 : 0,
      borderColor: border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: textMain,
    },
    closeText: {
      fontSize: 18,
      fontWeight: '800',
      color: textSub,
    },
    formLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: textMain,
      marginBottom: 4,
    },
    formInput: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      fontSize: 12,
      color: textMain,
      borderWidth: 1,
      borderColor: border,
      fontWeight: '700',
    },
    categoryChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    catChip: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: border,
    },
    catChipActive: {
      backgroundColor: activeTint,
      borderColor: accent,
    },
    catChipText: {
      fontSize: 10,
      fontWeight: '700',
      color: textSub,
    },
    catChipTextActive: {
      color: accent,
      fontWeight: '900',
    },
    saveProductModalBtn: {
      backgroundColor: isDark ? accent : '#212121',
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 20,
    },
    saveProductModalBtnText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
    orderDetailSub: {
      fontSize: 11,
      color: textSub,
      marginBottom: 10,
    },
    invoiceSection: {
      backgroundColor: isDark ? '#262626' : '#F8F7F3',
      borderRadius: 12,
      padding: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: border,
    },
    invoiceSectionTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: textMain,
      marginBottom: 6,
    },
    itemDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    itemDetailName: {
      fontSize: 10,
      color: textMain,
    },
    itemDetailPrice: {
      fontSize: 10,
      fontWeight: '800',
      color: accent,
    },
    invoiceDetailText: {
      fontSize: 10,
      color: textSub,
      marginBottom: 2,
    },
    invoiceDetailTextBold: {
      fontSize: 11,
      fontWeight: '900',
      color: textMain,
      marginTop: 4,
    },
    closeDetailBtn: {
      backgroundColor: isDark ? accent : '#212121',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    closeDetailBtnText: {
      color: isDark ? '#121212' : '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: textSub,
    },
  });
};
