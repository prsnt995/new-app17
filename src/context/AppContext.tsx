import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import {
  AVAILABLE_COUPONS,
  EXCHANGE_RATES,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_USER,
} from '@/data/mockData';
import {
  Address,
  CartItem,
  Coupon,
  CurrencyCode,
  LanguageCode,
  OrderItem,
  OrderStatus,
  Product,
  UserProfile,
} from '@/types';

interface AppContextType {
  products: Product[];
  cart: CartItem[];
  wishlist: string[];
  orders: OrderItem[];
  user: UserProfile;
  selectedCurrency: CurrencyCode;
  language: LanguageCode;
  appliedCoupon: Coupon | null;
  cartCount: number;
  cartTotalWeightKg: number;
  cartSubtotalKRW: number;
  cartDiscountKRW: number;
  cartShippingFeeKRW: number;
  cartTotalKRW: number;
  isDarkMode: boolean;

  // Actions
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  createOrder: (orderPayload: {
    originHub: string;
    destinationCity: string;
    destinationCountry: 'South Korea' | 'India' | 'Nepal';
    shippingMethod: 'Standard' | 'Express';
    recipient: OrderItem['recipient'];
    paymentMethod: string;
    customItems?: CartItem[];
    customSubtotalKRW?: number;
    customShippingKRW?: number;
    customDiscountKRW?: number;
    customTotalKRW?: number;
    bankAccount?: {
      bankName: string;
      accountNumber: string;
      accountHolder: string;
    };
    senderName?: string;
    paymentScreenshot?: string;
  }) => OrderItem;
  reorder: (orderId: string) => boolean;
  setCurrency: (currency: CurrencyCode) => void;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  addAddress: (address: Omit<Address, 'id'>) => void;
  updateAddress: (id: string, updates: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  formatPrice: (amountKRW: number) => string;
  addProduct: (newProd: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  toggleDarkMode: () => void;
}

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  KR: {
    // Navigation
    navHome: '홈',
    navParcel: '택배 보내기',
    navCart: '장바구니',
    navOrders: '주문 내역',
    navWishlist: '찜 목록',
    navProfile: '프로필',

    // Home
    welcomeBack: '환영합니다',
    subHeader: '인도 & 네팔의 맛 🇮🇳 🇳🇵',
    deliveringTo: '배송지',
    searchPlaceholder: '바스마티 쌀, 아타, 마살라, 차 검색...',
    heroBadge: '한국 ➔ 인도/네팔 직배송',
    heroTitle: '국제 택배 & 식료품.\n집 앞까지 안전 배송.',
    heroSubtitle: '인도와 네팔 전역으로 빠르고 안전하게 배송됩니다.',
    sendParcelBtn: '택배 보내기 ✈️',
    promoSmall: '기간 한정 프로모션',
    promoTitle: '무료 국제 배송',
    promoText: '₩50,000 이상 주문 시 또는 코드 FREESHIP 사용',
    claimOffer: '혜택 받기 →',
    categories: '카테고리별 쇼핑',
    allCategories: '전체 상품',
    popularProducts: '인기 상품 & 필수품',
    whyChoose: '나마스테마트를 선택해야 하는 이유',
    addBtn: '+ 담기',
    inCart: '담김 ✓',
    expressAir: '특급 항공 배송 (3-5일)',
    customsCleared: '100% 통관 보장',
    fastDelivery: '빠른 배송 (3~5일)',
    halalVeg: '100% 정품 보장',
    translateBtn: '🇰🇷 한국어',
    // Delivery Location
    changeAddress: '변경',
    selectDeliveryAddress: '배송지 선택',
    addNewKoreanAddress: '+ 새 한국 주소 추가',
    noKoreanAddress: '한국 배송지가 없습니다',
    deliveryAddressSet: '배송지가 설정되었습니다',
    // Promo Cards
    fashionFromHome: '고향의 패션',
    fashionSubtitle: '전통 & 현대 의류',
    fashionDesc: '인도 & 네팔 패션 쇼핑',
    shopNow: '쇼핑하기 →',
    fragranceCollection: '향수 컬렉션',
    fragranceDesc: '프리미엄 인도, 아랍 & 한국 향수',
    exploreNow: '탐색하기 →',

    // Send Parcel
    sendParcelTitle: '국제 택배 보내기',
    sendParcelSubtitle: '한국 ➔ 직송 특급 항공 화물',
    step1Title: '무엇을 보내시겠습니까?',
    step1Subtitle: '품목 카테고리를 선택하여 국제 배송 요금을 확인하세요',
    step2Title: '어디로 배송할까요?',
    step2Subtitle: '인도 또는 네팔 배송지 정보를 입력하세요',
    deliverToIndia: '인도 배송 🇮🇳',
    deliverToNepal: '네팔 배송 🇳🇵',
    recipientNameLabel: '받는 분 성함 *',
    recipientPhoneLabel: '받는 분 연락처 *',
    streetAddressLabel: '배송지 상세 주소 *',
    cityLabel: '도시 *',
    postalLabel: '우편번호',
    koreaPickupPoint: '한국 픽업 / 접수 지점:',
    pickupDate: '픽업 날짜:',
    timeWindow: '희망 시간대:',
    paymentOption: '결제 방식 선택',
    paymentNow: '💳 지금 바로 결제 (온라인/카드/KakaoPay)',
    paymentNowSub: '카드, 카카오페이 또는 계좌이체로 즉시 결제',
    paymentAfter: '💵 택배 수령 후 결제 (착불 현금)',
    paymentAfterSub: '택배 수령 시 배송 기사에게 현금 결제',
    parcelQuote: '투명한 배송비 견적',
    totalParcelWeight: '총 택배 무게',
    categoryFreight: '품목 운임',
    estimatedTotal: '최종 결제 예정 금액',
    confirmAndBook: '국제 택배 예약하기 ✈️',
    addToParcelBox: '+ 택배 상자에 담기',
    itemsInBox: '📦 택배 상자 내 품목',

    // Cart & Checkout
    cartTitle: '장바구니 & 주문 결제',
    cartEmpty: '장바구니가 비어 있습니다',
    startShopping: '쇼핑하러 가기',
    freeDeliveryMeter: '무료 배송 혜택 게이지',
    freeShipUnlocked: '🎉 무료 국제 배송 적용 완료!',
    routeSelection: '국제 배송 경로 선택',
    applyCoupon: '할인 쿠폰 적용',
    billSummary: '결제 금액 상세',
    subtotal: '상품 합계',
    shippingFee: '국제 항공 배송비',
    discount: '할인 금액',
    totalAmount: '최종 결제 금액',
    proceedCheckout: '주문 결제하기 ✈️',

    // Orders & Tracking
    ordersTitle: '주문 내역 & 배송 현황',
    ordersSubtitle: '한국 ➔ 인도/네팔 국제 항공 배송 상태',
    filterAll: '전체 주문',
    filterActive: '배송 중 ✈️',
    filterDelivered: '배송 완료 ✓',
    airwayBill: '운송장 번호 (AWB)',
    shipmentDetailsBtn: '📋 배송 상세',
    invoiceBtn: '🧾 영수증 확인',
    reorderBtn: '🔁 재주문',
    noOrders: '주문 내역이 없습니다',

    // Wishlist
    wishlistTitle: '찜한 상품 목록',
    wishlistSubtitle: '나중에 주문할 저장된 상품',
    addAllToCart: '+ 전체 장바구니 담기',
    emptyWishlist: '찜한 상품이 없습니다',
    exploreProducts: '인기 상품 둘러보기',

    // Profile
    profileTitle: '프로필 & 계정 설정',
    editProfile: '프로필 수정',
    totalOrders: '총 주문 건수',
    totalSpent: '총 구매 금액',
    totalSaved: '총 절약 금액',
    savedAddresses: '등록된 배송지 목록',
    addAddress: '+ 새 배송지 추가',
    displayCurrency: '통화 설정',
    customsGuide: '통관 및 반입 금지 품목 안내',
    supportHelpline: '24시간 고객센터 지원',
    logout: '로그아웃',
  },
  EN: {
    // Navigation
    navHome: 'Home',
    navParcel: 'Send Parcel',
    navCart: 'Cart',
    navOrders: 'Orders',
    navWishlist: 'Wishlist',
    navProfile: 'Profile',

    // Home
    welcomeBack: 'WELCOME BACK',
    subHeader: 'Taste of India & Nepal 🇮🇳 🇳🇵',
    deliveringTo: 'DELIVERING TO',
    searchPlaceholder: 'Search Basmati, Atta, Masala, Tea...',
    heroBadge: 'Direct Korea ➔ South Asia',
    heroTitle: 'Courier & Groceries.\nDelivered To Your Home.',
    heroSubtitle: 'Authentic goods & parcels shipped fast across India & Nepal.',
    sendParcelBtn: 'SEND PARCEL NOW',
    promoSmall: 'LIMITED TIME PROMO',
    promoTitle: 'Free International Delivery',
    promoText: 'On all shipments above ₩50,000 or use code FREESHIP',
    claimOffer: 'CLAIM OFFER →',
    categories: 'Shop by Category',
    allCategories: 'All Products',
    popularProducts: 'Popular Products & Essentials',
    whyChoose: 'Why Choose NamasteMart?',
    addBtn: '+ Add',
    inCart: 'In Cart ✓',
    expressAir: 'Air Express (3-5d)',
    customsCleared: 'Customs Cleared',
    fastDelivery: 'Fast Delivery (3-5d)',
    halalVeg: '100% Authentic Goods',
    translateBtn: '🌐 English',
    // Delivery Location
    changeAddress: 'Change',
    selectDeliveryAddress: 'Select Delivery Address',
    addNewKoreanAddress: '+ Add New Korean Address',
    noKoreanAddress: 'No Korean address saved',
    deliveryAddressSet: 'Delivery address updated',
    // Promo Cards
    fashionFromHome: 'FASHION FROM HOME',
    fashionSubtitle: 'Traditional & Modern Clothes',
    fashionDesc: 'Shop Indian & Nepali Fashion',
    shopNow: 'Shop Now →',
    fragranceCollection: 'FRAGRANCE COLLECTION',
    fragranceDesc: 'Premium Indian, Arabic & Korean Fragrances',
    exploreNow: 'Explore →',

    // Send Parcel
    sendParcelTitle: 'Send Parcel Home',
    sendParcelSubtitle: 'Korea ➔ Direct Express Air Cargo',
    step1Title: 'What do you want to send home?',
    step1Subtitle: 'Select item category to apply standard cross-border pricing rules',
    step2Title: 'Where to send your parcel?',
    step2Subtitle: 'Provide delivery destination details in India or Nepal',
    deliverToIndia: 'Deliver to India 🇮🇳',
    deliverToNepal: 'Deliver to Nepal 🇳🇵',
    recipientNameLabel: 'Recipient Full Name *',
    recipientPhoneLabel: 'Recipient Phone Number *',
    streetAddressLabel: 'Delivery Street Address *',
    cityLabel: 'City / Town *',
    postalLabel: 'Postal / PIN Code',
    koreaPickupPoint: 'Korea Pickup / Drop-off Point:',
    pickupDate: 'Pickup Date:',
    timeWindow: 'Time Window:',
    paymentOption: 'Payment Option',
    paymentNow: '💳 Payment Now (Online)',
    paymentNowSub: 'Pay instantly via KakaoPay, Credit/Debit Card, or UPI',
    paymentAfter: '💵 Payment After Parcel Received (Cash on Delivery)',
    paymentAfterSub: 'Recipient pays cash when the courier hands over parcel',
    parcelQuote: 'Transparent Parcel Quote',
    totalParcelWeight: 'Total Parcel Weight',
    categoryFreight: 'Category Freight',
    estimatedTotal: 'Estimated Total',
    confirmAndBook: 'CONFIRM & BOOK PARCEL NOW ✈️',
    addToParcelBox: '+ ADD TO PARCEL BOX',
    itemsInBox: '📦 Items in your Parcel Box',

    // Cart & Checkout
    cartTitle: 'Shopping Cart & Checkout',
    cartEmpty: 'Your Cart is Empty',
    startShopping: 'Start Shopping',
    freeDeliveryMeter: 'Free Delivery Meter',
    freeShipUnlocked: '🎉 Free International Delivery Unlocked!',
    routeSelection: 'Cross-Border Logistics Route',
    applyCoupon: 'Apply Coupon Code',
    billSummary: 'Order Summary',
    subtotal: 'Items Subtotal',
    shippingFee: 'International Air Freight',
    discount: 'Discount Applied',
    totalAmount: 'Final Total',
    proceedCheckout: 'PROCEED TO CHECKOUT ✈️',

    // Orders & Tracking
    ordersTitle: 'Orders & Shipments',
    ordersSubtitle: 'Cross-border airway courier status',
    filterAll: 'All Orders',
    filterActive: 'In Transit ✈️',
    filterDelivered: 'Delivered ✓',
    airwayBill: 'Airway Bill (AWB)',
    shipmentDetailsBtn: '📋 Shipment Details',
    invoiceBtn: '🧾 View Invoice',
    reorderBtn: '🔁 Reorder',
    noOrders: 'No orders found',

    // Wishlist
    wishlistTitle: 'Wishlist & Saved',
    wishlistSubtitle: 'Items saved for future shipment',
    addAllToCart: '+ Add All to Cart',
    emptyWishlist: 'Your wishlist is empty',
    exploreProducts: 'Explore Popular Products',

    // Profile
    profileTitle: 'Profile & Account Settings',
    editProfile: 'Edit Profile',
    totalOrders: 'Total Orders',
    totalSpent: 'Total Spent',
    totalSaved: 'Total Saved',
    savedAddresses: 'Saved Addresses',
    addAddress: '+ Add New Address',
    displayCurrency: 'App Display Currency',
    customsGuide: 'Customs & Prohibited Items Guide',
    supportHelpline: '24/7 Helpline & Support',
    logout: 'Logout',
  },
  HI: {
    // Navigation
    navHome: 'होम',
    navParcel: 'पार्सल भेजें',
    navCart: 'कार्ट',
    navOrders: 'ऑर्डर',
    navWishlist: 'विशलिस्ट',
    navProfile: 'प्रोफाइल',

    // Home
    welcomeBack: 'नमस्ते',
    subHeader: 'भारत और नेपाल का स्वाद 🇮🇳 🇳🇵',
    deliveringTo: 'डिलीवरी पता',
    searchPlaceholder: 'बासमती, आटा, मसाले, चाय खोजें...',
    heroBadge: 'कोरिया ➔ दक्षिण एशिया सीधी सेवा',
    heroTitle: 'कूरियर और किराने का सामान.\nसीधे आपके घर तक।',
    heroSubtitle: 'भारत और नेपाल में तेज और सुरक्षित डिलीवरी।',
    sendParcelBtn: 'पार्सल भेजें ✈️',
    promoSmall: 'सीमित समय ऑफर',
    promoTitle: 'मुफ्त अंतर्राष्ट्रीय डिलीवरी',
    promoText: '₩50,000 से अधिक के ऑर्डर पर या कोड FREESHIP लगाएं',
    claimOffer: 'ऑफर पाएं →',
    categories: 'श्रेणी के अनुसार खरीदारी',
    allCategories: 'सभी उत्पाद',
    popularProducts: 'लोकप्रिय उत्पाद और आवश्यक वस्तुएं',
    whyChoose: 'नमस्तेमार्ट क्यों चुनें?',
    addBtn: '+ जोड़ें',
    inCart: 'कार्ट में ✓',
    expressAir: 'एयर एक्सप्रेस (3-5 दिन)',
    customsCleared: 'कस्टम क्लीयरेंस गारंटी',
    fastDelivery: 'तेज़ डिलीवरी (3-5 दिन)',
    halalVeg: '100% असली सामान',
    translateBtn: '🇮🇳 हिंदी',
    // Delivery Location
    changeAddress: 'बदलें',
    selectDeliveryAddress: 'डिलीवरी पता चुनें',
    addNewKoreanAddress: '+ नया कोरिया पता जोड़ें',
    noKoreanAddress: 'कोई कोरिया पता सहेजा नहीं है',
    deliveryAddressSet: 'डिलीवरी पता अपडेट किया गया',
    // Promo Cards
    fashionFromHome: 'घर से फैशन',
    fashionSubtitle: 'पारंपरिक और आधुनिक कपड़े',
    fashionDesc: 'भारतीय और नेपाली फैशन खरीदें',
    shopNow: 'अभी खरीदें →',
    fragranceCollection: 'खुशबू संग्रह',
    fragranceDesc: 'प्रीमियम भारतीय, अरबी और कोरियाई इत्र',
    exploreNow: 'एक्सप्लोर करें →',

    // Send Parcel
    sendParcelTitle: 'घर पार्सल भेजें',
    sendParcelSubtitle: 'कोरिया ➔ भारत/नेपाल सीधी एयर कार्गो सेवा',
    step1Title: 'आप घर क्या भेजना चाहते हैं?',
    step1Subtitle: 'पार्सल श्रेणी चुनें और शुल्क देखें',
    step2Title: 'पार्सल कहां भेजना है?',
    step2Subtitle: 'भारत या नेपाल का डिलीवरी पता दर्ज करें',
    deliverToIndia: 'भारत में डिलीवरी 🇮🇳',
    deliverToNepal: 'नेपाल में डिलीवरी 🇳🇵',
    recipientNameLabel: 'प्राप्तकर्ता का नाम *',
    recipientPhoneLabel: 'प्राप्तकर्ता का फोन नंबर *',
    streetAddressLabel: 'डिलीवरी का पूरा पता *',
    cityLabel: 'शहर *',
    postalLabel: 'पिन कोड',
    koreaPickupPoint: 'कोरिया पिकअप पॉइंट:',
    pickupDate: 'पिकअप तारीख:',
    timeWindow: 'समय:',
    paymentOption: 'भुगतान विकल्प',
    paymentNow: '💳 अभी भुगतान करें (ऑनलाइन / कार्ड / UPI)',
    paymentNowSub: 'कार्ड या यूपीआई द्वारा तत्काल भुगतान',
    paymentAfter: '💵 पार्सल मिलने पर भुगतान (कैश ऑन डिलीवरी)',
    paymentAfterSub: 'पार्सल मिलने पर डिलीवरी एजेंट को नकद दें',
    parcelQuote: 'पार्सल बिल विवरण',
    totalParcelWeight: 'कुल पार्सल वजन',
    categoryFreight: 'श्रेणी भाड़ा',
    estimatedTotal: 'कुल अनुमानित राशि',
    confirmAndBook: 'पार्सल बुक करें ✈️',
    addToParcelBox: '+ पार्सल बॉक्स में जोड़ें',
    itemsInBox: '📦 पार्सल बॉक्स में सामान',

    // Cart & Checkout
    cartTitle: 'शॉपिंग कार्ट और चेकआउट',
    cartEmpty: 'आपकी कार्ट खाली है',
    startShopping: 'खरीदारी शुरू करें',
    freeDeliveryMeter: 'मुफ्त डिलीवरी मीटर',
    freeShipUnlocked: '🎉 मुफ्त अंतर्राष्ट्रीय डिलीवरी लागू!',
    routeSelection: 'शिपिंग मार्ग चुनें',
    applyCoupon: 'कूपन कोड लगाएं',
    billSummary: 'बिल विवरण',
    subtotal: 'सामान का मूल्य',
    shippingFee: 'अंतर्राष्ट्रीय एयर भाड़ा',
    discount: 'लागू छूट',
    totalAmount: 'कुल देय राशि',
    proceedCheckout: 'चेकआउट करें ✈️',

    // Orders & Tracking
    ordersTitle: 'ऑर्डर और शिपमेंट',
    ordersSubtitle: 'कोरिया ➔ भारत/नेपाल पार्सल स्थिति',
    filterAll: 'सभी ऑर्डर',
    filterActive: 'रास्ते में ✈️',
    filterDelivered: 'डिलीवर हुआ ✓',
    airwayBill: 'एयरवे बिल नंबर',
    shipmentDetailsBtn: '📋 शिपमेंट विवरण',
    invoiceBtn: '🧾 रसीद देखें',
    reorderBtn: '🔁 पुनः ऑर्डर',
    noOrders: 'कोई ऑर्डर नहीं मिला',

    // Wishlist
    wishlistTitle: 'पसंदीदा सूची (विशलिस्ट)',
    wishlistSubtitle: 'सहेजे गए उत्पाद',
    addAllToCart: '+ सभी कार्ट में जोड़ें',
    emptyWishlist: 'आपकी विशलिस्ट खाली है',
    exploreProducts: 'उत्पाद खोजें',

    // Profile
    profileTitle: 'प्रोफ़ाइल और सेटिंग्स',
    editProfile: 'प्रोफ़ाइल बदलें',
    totalOrders: 'कुल ऑर्डर',
    totalSpent: 'कुल खर्च',
    totalSaved: 'कुल बचत',
    savedAddresses: 'सहेजे गए पते',
    addAddress: '+ नया पता जोड़ें',
    displayCurrency: 'मुद्रा प्राथमिकता',
    customsGuide: 'कस्टम दिशानिर्देश',
    supportHelpline: '24/7 हेल्पलाइन सहायता',
    logout: 'लॉगआउट',
  },
  NE: {
    // Navigation
    navHome: 'गृह',
    navParcel: 'पार्सल',
    navCart: 'कार्ट',
    navOrders: 'अर्डर',
    navWishlist: 'इच्छासूची',
    navProfile: 'प्रोफाइल',

    // Home
    welcomeBack: 'नमस्ते',
    subHeader: 'नेपाल र भारतको स्वाद 🇳🇵 🇮🇳',
    deliveringTo: 'डेलिभरी ठेगाना',
    searchPlaceholder: 'बासमती, चामल, मसला, चिया खोज्नुहोस्...',
    heroBadge: 'कोरियाबाट सिधा नेपाल पार्सल',
    heroTitle: 'कुरियर र खाद्यान्न सामान.\nसिधै घरको ढोकासम्म।',
    heroSubtitle: 'नेपालभर छिटो र सुरक्षित डेलिभरी सेवा।',
    sendParcelBtn: 'पार्सल पठाउनुहोस् ✈️',
    promoSmall: 'विशेष छुट',
    promoTitle: 'नि:शुल्क अन्तर्राष्ट्रिय डेलिभरी',
    promoText: '₩50,000 भन्दा बढीको अर्डरमा वा कोड FREESHIP प्रयोग गर्नुहोस्',
    claimOffer: 'छुट लिनुहोस् →',
    categories: 'सामानका प्रकारहरू',
    allCategories: 'सबै सामान',
    popularProducts: 'लोकप्रिय र आवश्यक सामानहरू',
    whyChoose: 'नमस्तेमार्ट किन रोज्ने?',
    addBtn: '+ थप्नुहोस्',
    inCart: 'कार्टमा ✓',
    expressAir: 'एयर एक्सप्रेस (३-५ दिन)',
    customsCleared: '१००% भन्सार पास ग्यारेन्टी',
    fastDelivery: 'छिटो डेलिभरी (३-५ दिन)',
    halalVeg: '१००% शुद्ध र ताजा',
    translateBtn: '🇳🇵 नेपाली',
    // Delivery Location
    changeAddress: 'परिवर्तन',
    selectDeliveryAddress: 'डेलिभरी ठेगाना छान्नुहोस्',
    addNewKoreanAddress: '+ नयाँ कोरिया ठेगाना थप्नुहोस्',
    noKoreanAddress: 'कोरियाको ठेगाना सुरक्षित गरिएको छैन',
    deliveryAddressSet: 'डेलिभरी ठेगाना अपडेट भयो',
    // Promo Cards
    fashionFromHome: 'घरको फेसन',
    fashionSubtitle: 'परम्परागत र आधुनिक लुगा',
    fashionDesc: 'भारतीय र नेपाली फेसन किन्नुहोस्',
    shopNow: 'अहिले किन्नुहोस् →',
    fragranceCollection: 'सुगन्ध संग्रह',
    fragranceDesc: 'प्रिमियम भारतीय, अरबी र कोरियाली सुगन्ध',
    exploreNow: 'हेर्नुहोस् →',

    // Send Parcel
    sendParcelTitle: 'घर पार्सल पठाउनुहोस्',
    sendParcelSubtitle: 'कोरिया ➔ नेपाल/भारत सिधा एयर कार्गो',
    step1Title: 'घर के पठाउन चाहनुहुन्छ?',
    step1Subtitle: 'सामानको प्रकार छानेर ढुवानी दर हेर्नुहोस्',
    step2Title: 'पार्सल कहाँ पठाउने?',
    step2Subtitle: 'नेपाल वा भारतको ठेगाना भर्नुहोस्',
    deliverToIndia: 'भारतमा डेलिभरी 🇮🇳',
    deliverToNepal: 'नेपालमा डेलिभरी 🇳🇵',
    recipientNameLabel: 'प्राप्तकर्ताको नाम *',
    recipientPhoneLabel: 'प्राप्तकर्ताको फोन नम्बर *',
    streetAddressLabel: 'डेलिभरीको पूरा ठेगाना *',
    cityLabel: 'शहर *',
    postalLabel: 'हुलाक कोड',
    koreaPickupPoint: 'कोरिया पिकअप पोइन्ट:',
    pickupDate: 'पिकअप मिति:',
    timeWindow: 'समय:',
    paymentOption: 'भुक्तानी विकल्प',
    paymentNow: '💳 अहिले नै भुक्तानी (अनलाइन/कार्ड/eSewa)',
    paymentNowSub: 'कार्ड वा ईसेवाबाट तत्काल भुक्तानी गर्नुहोस्',
    paymentAfter: '💵 पार्सल पाएपछि भुक्तानी (क्यास अन डेलिभरी)',
    paymentAfterSub: 'पार्सल प्राप्त भएपछि डेलिभरी राइडरलाई नगद दिनुहोस्',
    parcelQuote: 'पार्सल बिल विवरण',
    totalParcelWeight: 'कुल पार्सल तौल',
    categoryFreight: 'सामान भाडा',
    estimatedTotal: 'कुल अनुमानित रकम',
    confirmAndBook: 'पार्सल बुक गर्नुहोस् ✈️',
    addToParcelBox: '+ पार्सल बक्समा थप्नुहोस्',
    itemsInBox: '📦 पार्सल बक्समा सामानहरू',

    // Cart & Checkout
    cartTitle: 'सपिङ कार्ट र चेकआउट',
    cartEmpty: 'तपाईंको कार्ट खाली छ',
    startShopping: 'किनमेल सुरु गर्नुहोस्',
    freeDeliveryMeter: 'नि:शुल्क डेलिभरी मिटर',
    freeShipUnlocked: '🎉 नि:शुल्क अन्तर्राष्ट्रिय डेलिभरी लागू भयो!',
    routeSelection: 'ढुवानी मार्ग छान्नुहोस्',
    applyCoupon: 'कुपन प्रयोग गर्नुहोस्',
    billSummary: 'बिल विवरण',
    subtotal: 'सामानको मूल्य',
    shippingFee: 'अन्तर्राष्ट्रिय एयर भाडा',
    discount: 'लागू छुट',
    totalAmount: 'कुल रकम',
    proceedCheckout: 'अर्डर पूरा गर्नुहोस् ✈️',

    // Orders & Tracking
    ordersTitle: 'अर्डर र शिपमेन्ट',
    ordersSubtitle: 'कोरिया ➔ नेपाल अन्तर्राष्ट्रिय पार्सल स्थिति',
    filterAll: 'सबै अर्डर',
    filterActive: 'बाटोमा ✈️',
    filterDelivered: 'डेलिभर भयो ✓',
    airwayBill: 'एयरवे बिल (AWB)',
    shipmentDetailsBtn: '📋 शिपमेन्ट विवरण',
    invoiceBtn: '🧾 रसिद हेर्नुहोस्',
    reorderBtn: '🔁 पुनः अर्डर',
    noOrders: 'कुनै अर्डर फेला परेन',

    // Wishlist
    wishlistTitle: 'इच्छासूची (मन परेका सामान)',
    wishlistSubtitle: 'पछि किन्न सुरक्षित गरिएका सामानहरू',
    addAllToCart: '+ सबै कार्टमा थप्नुहोस्',
    emptyWishlist: 'तपाईंको इच्छासूची खाली छ',
    exploreProducts: 'सामानहरू खोज्नुहोस्',

    // Profile
    profileTitle: 'प्रोफाइल र सेटिङहरू',
    editProfile: 'प्रोफाइल सम्पादन',
    totalOrders: 'कुल अर्डर',
    totalSpent: 'कुल खर्च',
    totalSaved: 'कुल बचत',
    savedAddresses: 'सुरक्षित ठेगानाहरू',
    addAddress: '+ नयाँ ठेगाना थप्नुहोस्',
    displayCurrency: 'मुद्रा छनौट',
    customsGuide: 'भन्सार नियम तथा दिशानिर्देश',
    supportHelpline: '२४/७ ग्राहक सेवा सहायता',
    logout: 'लगआउट',
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([
    { product: INITIAL_PRODUCTS[0], quantity: 1 },
    { product: INITIAL_PRODUCTS[3], quantity: 2 },
  ]);
  const [wishlist, setWishlist] = useState<string[]>(['2', '6']);
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS);
  const [user, setUser] = useState<UserProfile>(INITIAL_USER);
  const [currency, setCurrencyState] = useState<CurrencyCode>('KRW');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('EN');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Cart Totals
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartTotalWeightKg = useMemo(() => {
    return Number(
      cart.reduce((sum, item) => sum + item.product.weightKg * item.quantity, 0).toFixed(2)
    );
  }, [cart]);

  const cartSubtotalKRW = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.priceKRW * item.quantity, 0);
  }, [cart]);

  const cartDiscountKRW = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.code === 'FREESHIP') return 0;
    if (cartSubtotalKRW < appliedCoupon.minOrderKRW) return 0;

    if (appliedCoupon.fixedDiscountKRW && appliedCoupon.fixedDiscountKRW > 0) {
      return appliedCoupon.fixedDiscountKRW;
    }

    const calculated = (cartSubtotalKRW * appliedCoupon.discountPercent) / 100;
    return Math.min(calculated, appliedCoupon.maxDiscountKRW);
  }, [appliedCoupon, cartSubtotalKRW]);

  const cartShippingFeeKRW = useMemo(() => {
    if (cart.length === 0) return 0;
    if (cartSubtotalKRW >= 50000 || appliedCoupon?.code === 'FREESHIP') {
      return 0; // Free delivery above ₩50,000 or with FREESHIP
    }
    // Base shipping calculation (8000 KRW base + 500 per extra kg above 2kg)
    const extraWeight = Math.max(0, cartTotalWeightKg - 2);
    return 8000 + Math.ceil(extraWeight) * 500;
  }, [cart.length, cartSubtotalKRW, appliedCoupon, cartTotalWeightKg]);

  const cartTotalKRW = useMemo(() => {
    return Math.max(0, cartSubtotalKRW + cartShippingFeeKRW - cartDiscountKRW);
  }, [cartSubtotalKRW, cartShippingFeeKRW, cartDiscountKRW]);

  // Actions
  // Product Management (Admin Real-Time Sync)
  const addProduct = (newProd: Omit<Product, 'id'>): Product => {
    const created: Product = {
      ...newProd,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [created, ...prev]);
    return created;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    // Sync with Cart items in real-time
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === id
          ? { ...item, product: { ...item.product, ...updates } }
          : item
      )
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    // Purge from Cart & Wishlist in real-time
    setCart((prev) => prev.filter((item) => item.product.id !== id));
    setWishlist((prev) => prev.filter((pid) => pid !== id));
  };

  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus
  ) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status,
        };
      })
    );
  };

  const addToCart = (productId: string, quantity = 1) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing) {
        return prev.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const isInWishlist = (productId: string) => {
    return wishlist.includes(productId);
  };

  const applyCoupon = (code: string) => {
    const trimmed = code.trim().toUpperCase();

    // Dynamic lucky coupon support (₩1,000 ~ ₩3,000 OFF based on order size)
    if (trimmed.startsWith('LUCKY')) {
      let luckyAmount = 2000;
      const parsedNum = parseInt(trimmed.replace('LUCKY', '').replace('-', ''), 10);
      if (!isNaN(parsedNum) && parsedNum >= 1000 && parsedNum <= 3000) {
        luckyAmount = parsedNum;
      } else {
        // Calculate based on order size:
        if (cartSubtotalKRW >= 70000) {
          luckyAmount = Math.floor(Math.random() * 6) * 100 + 2500; // ₩2,500 ~ ₩3,000
        } else if (cartSubtotalKRW >= 40000) {
          luckyAmount = Math.floor(Math.random() * 8) * 100 + 1500; // ₩1,500 ~ ₩2,200
        } else {
          luckyAmount = Math.floor(Math.random() * 6) * 100 + 1000; // ₩1,000 ~ ₩1,500
        }
      }

      const luckyCoupon: Coupon = {
        code: `LUCKY-${luckyAmount}`,
        title: `🎲 Lucky Random Discount (₩${luckyAmount.toLocaleString('en-KR')} OFF)`,
        discountPercent: 0,
        fixedDiscountKRW: luckyAmount,
        minOrderKRW: 10000,
        maxDiscountKRW: luckyAmount,
      };

      setAppliedCoupon(luckyCoupon);
      return {
        success: true,
        message: `🎉 Lucky Discount Applied! ₩${luckyAmount.toLocaleString('en-KR')} OFF your order.`,
      };
    }

    const coupon = AVAILABLE_COUPONS.find((c) => c.code === trimmed);

    if (!coupon) {
      return { success: false, message: 'Invalid coupon code.' };
    }
    if (cartSubtotalKRW < coupon.minOrderKRW) {
      return {
        success: false,
        message: `Min order of ₩${coupon.minOrderKRW.toLocaleString()} required for this coupon.`,
      };
    }

    setAppliedCoupon(coupon);
    return { success: true, message: `Coupon ${coupon.code} applied successfully!` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const createOrder = (orderPayload: {
    originHub: string;
    destinationCity: string;
    destinationCountry: 'South Korea' | 'India' | 'Nepal';
    shippingMethod: 'Standard' | 'Express';
    recipient: OrderItem['recipient'];
    paymentMethod: string;
    customItems?: CartItem[];
    customSubtotalKRW?: number;
    customShippingKRW?: number;
    customDiscountKRW?: number;
    customTotalKRW?: number;
    bankAccount?: {
      bankName: string;
      accountNumber: string;
      accountHolder: string;
    };
    senderName?: string;
    paymentScreenshot?: string;
  }): OrderItem => {
    const newOrderId = `order-${Date.now()}`;
    const trackingNum =
      orderPayload.destinationCountry === 'South Korea'
        ? `KR-CJ${Math.floor(10000000 + Math.random() * 90000000)}`
        : `KR${Math.floor(10000000 + Math.random() * 90000000)}${
            orderPayload.destinationCountry === 'Nepal' ? 'NP' : 'IN'
          }`;
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const isExpress = orderPayload.shippingMethod === 'Express';
    const itemsToOrder = orderPayload.customItems && orderPayload.customItems.length > 0
      ? orderPayload.customItems
      : [...cart];

    const subtotal = orderPayload.customSubtotalKRW !== undefined
      ? orderPayload.customSubtotalKRW
      : cartSubtotalKRW;

    const shippingFee = orderPayload.customShippingKRW !== undefined
      ? orderPayload.customShippingKRW
      : (isExpress ? cartShippingFeeKRW + 8000 : cartShippingFeeKRW);

    const discount = orderPayload.customDiscountKRW !== undefined
      ? orderPayload.customDiscountKRW
      : cartDiscountKRW;

    const finalTotal = orderPayload.customTotalKRW !== undefined
      ? orderPayload.customTotalKRW
      : Math.max(0, subtotal + shippingFee - discount);

    const totalWeight = Number(
      itemsToOrder.reduce((sum, it) => sum + it.product.weightKg * it.quantity, 0).toFixed(2)
    );

    const isKoreaLocal = orderPayload.destinationCountry === 'South Korea';

    const newOrder: OrderItem = {
      id: newOrderId,
      orderNumber: `NM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: dateFormatted,
      items: itemsToOrder,
      subtotalKRW: subtotal,
      shippingFeeKRW: shippingFee,
      discountKRW: discount,
      totalKRW: finalTotal,
      totalWeightKg: totalWeight,
      status: 'ORDER_PLACED',
      originHub: orderPayload.originHub,
      destinationCity: orderPayload.destinationCity,
      destinationCountry: orderPayload.destinationCountry,
      shippingMethod: orderPayload.shippingMethod,
      estimatedDelivery: isKoreaLocal
        ? (isExpress ? 'Tomorrow by 8 PM' : 'In 1-2 days (CJ Express)')
        : (isExpress ? 'In 3-5 days' : 'In 10-14 days'),
      recipient: orderPayload.recipient,
      paymentMethod: orderPayload.paymentMethod,
      bankAccount: orderPayload.bankAccount,
      senderName: orderPayload.senderName,
      paymentScreenshot: orderPayload.paymentScreenshot,
      trackingNumber: `AWB${Math.floor(100000000 + Math.random() * 900000000)}`,
      timeline: [
        {
          title: 'Order Placed',
          location: orderPayload.originHub,
          timestamp: dateFormatted,
          description: 'Payment verified and package registered',
          completed: true,
          current: true,
        },
        {
          title: 'Picked Up',
          location: orderPayload.originHub,
          timestamp: '',
          description: 'Carrier sorting pending',
          completed: false,
        },
      ],
    };

    setOrders((prev) => [newOrder, ...prev]);
    setUser((prev) => ({
      ...prev,
      totalShipments: prev.totalShipments + 1,
      totalSavedKRW: prev.totalSavedKRW + discount,
    }));

    // If only specific items were ordered, remove only those from cart
    if (orderPayload.customItems && orderPayload.customItems.length > 0) {
      const orderedIds = new Set(orderPayload.customItems.map((it) => it.product.id));
      setCart((prev) => prev.filter((item) => !orderedIds.has(item.product.id)));
    } else {
      clearCart();
    }

    return newOrder;
  };

  const reorder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    setCart(order.items);
    return true;
  };

  const setCurrency = (currency: CurrencyCode) => {
    setCurrencyState(currency);
    setUser((prev) => ({ ...prev, preferredCurrency: currency }));
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const addAddress = (address: Omit<Address, 'id'>) => {
    const newAddr: Address = {
      ...address,
      id: `addr-${Date.now()}`,
    };
    setUser((prev) => {
      const addresses = address.isDefault
        ? prev.savedAddresses.map((a) => ({ ...a, isDefault: false }))
        : prev.savedAddresses;
      return {
        ...prev,
        savedAddresses: [...addresses, newAddr],
      };
    });
  };

  const updateAddress = (id: string, updates: Partial<Address>) => {
    setUser((prev) => {
      let addresses = prev.savedAddresses.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      if (updates.isDefault) {
        addresses = addresses.map((a) =>
          a.id === id ? { ...a, isDefault: true } : { ...a, isDefault: false }
        );
      }
      return {
        ...prev,
        savedAddresses: addresses,
      };
    });
  };

  const deleteAddress = (id: string) => {
    setUser((prev) => ({
      ...prev,
      savedAddresses: prev.savedAddresses.filter((a) => a.id !== id),
    }));
  };

  const setDefaultAddress = (id: string) => {
    setUser((prev) => ({
      ...prev,
      savedAddresses: prev.savedAddresses.map((a) => ({
        ...a,
        isDefault: a.id === id,
      })),
    }));
  };

  const formatPrice = (amountKRW: number): string => {
    if (currency === 'INR') {
      const inr = Math.round(amountKRW * EXCHANGE_RATES.INR);
      return `₹${inr.toLocaleString('en-IN')}`;
    }
    if (currency === 'NPR') {
      const npr = Math.round(amountKRW * EXCHANGE_RATES.NPR);
      return `रू ${npr.toLocaleString('en-NP')}`;
    }
    return `₩${amountKRW.toLocaleString('en-KR')}`;
  };

  const t = (key: string): string => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.KR;
    return langDict[key] || TRANSLATIONS.EN[key] || key;
  };

  return (
    <AppContext.Provider
      value={{
        products,
        cart,
        wishlist,
        orders,
        user,
        selectedCurrency: currency,
        language,
        appliedCoupon,
        cartCount,
        cartTotalWeightKg,
        cartSubtotalKRW,
        cartDiscountKRW,
        cartShippingFeeKRW,
        cartTotalKRW,
        isDarkMode,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        toggleWishlist,
        isInWishlist,
        applyCoupon,
        removeCoupon,
        createOrder,
        reorder,
        setCurrency,
        setLanguage,
        t,
        updateUserProfile,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        formatPrice,
        addProduct,
        updateProduct,
        deleteProduct,
        updateOrderStatus,
        toggleDarkMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
