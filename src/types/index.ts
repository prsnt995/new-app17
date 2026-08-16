export type CurrencyCode = 'KRW' | 'INR' | 'NPR';
export type LanguageCode = 'KR' | 'EN' | 'HI' | 'NE';

export interface Product {
  id: string;
  name: string;
  category: string;
  size: string;
  priceKRW: number;
  oldPriceKRW: number;
  rating: number;
  reviews: number;
  discount: string;
  image: string;
  weightKg: number;
  origin: string;
  description: string;
  isBestSeller?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customNote?: string;
}

export type OrderStatus =
  | 'ORDER_PLACED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'CUSTOMS_CLEARANCE'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface TrackingStep {
  title: string;
  location: string;
  timestamp: string;
  description: string;
  completed: boolean;
  current?: boolean;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  date: string;
  items: CartItem[];
  subtotalKRW: number;
  shippingFeeKRW: number;
  discountKRW: number;
  totalKRW: number;
  totalWeightKg: number;
  status: OrderStatus;
  originHub: string;
  destinationCity: string;
  destinationCountry: 'India' | 'Nepal';
  shippingMethod: 'Standard' | 'Express';
  estimatedDelivery: string;
  trackingNumber: string;
  timeline: TrackingStep[];
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
}

export interface Address {
  id: string;
  title: string;
  type: 'HOME' | 'OFFICE' | 'HUB';
  recipientName: string;
  phone: string;
  fullAddress: string;
  city: string;
  postalCode: string;
  country: 'South Korea' | 'India' | 'Nepal';
  isDefault: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  memberTier: 'Gold Member' | 'Silver Member';
  savedAddresses: Address[];
  totalShipments: number;
  totalSavedKRW: number;
  preferredCurrency: CurrencyCode;
  preferredLanguage: string;
  notificationsEnabled: boolean;
}

export interface Coupon {
  code: string;
  title: string;
  discountPercent: number;
  minOrderKRW: number;
  maxDiscountKRW: number;
}
