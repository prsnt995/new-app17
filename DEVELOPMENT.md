# NamasteMart - Development Guide

**Version:** 1.0  
**Last Updated:** August 2026  
**Tech Stack:** React Native + Expo, TypeScript, Node.js

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Available Scripts](#available-scripts)
5. [Coding Standards](#coding-standards)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Testing Guidelines](#testing-guidelines)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### Prerequisites

- **Node.js:** v18.x or higher
- **npm:** v9.x or higher
- **Expo CLI:** Latest version
- **Git:** v2.30 or higher
- **Xcode:** (macOS, for iOS development)
- **Android Studio:** (for Android development)

### Initial Setup

#### 1. Clone Repository
```bash
git clone https://github.com/prsnt995/namaste-mart-new.git
cd NamasteMart
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Install Expo CLI (if not already installed)
```bash
npm install -g expo-cli
```

#### 4. Create Environment Files

Create `.env.local` in the root directory:
```env
# API Configuration
REACT_APP_API_BASE_URL=http://localhost:3000/api
REACT_APP_API_VERSION=v1

# Third-party Services
REACT_APP_STRIPE_KEY=pk_test_xxxxxxxxxxxxx
REACT_APP_RAZORPAY_KEY=rzp_test_xxxxxxxxxxxxx
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyxxxxxxxxxxxxxxxx
REACT_APP_FIREBASE_CONFIG={"apiKey":"xxx"}

# Environment
REACT_APP_ENV=development
REACT_APP_LOG_LEVEL=debug
```

Create `.env.staging`:
```env
REACT_APP_API_BASE_URL=https://staging-api.namastemart.com/api
REACT_APP_ENV=staging
```

Create `.env.production`:
```env
REACT_APP_API_BASE_URL=https://api.namastemart.com/api
REACT_APP_ENV=production
```

#### 5. Setup iOS (macOS only)
```bash
cd ios
pod install
cd ..
```

#### 6. Verify Setup
```bash
npm run lint
```

---

## Project Structure

```
NamasteMart/
├── src/
│   ├── app/
│   │   ├── index.tsx              # Main app entry point
│   │   ├── (auth)/               # Authentication screens
│   │   │   ├── login.tsx
│   │   │   ├── signup.tsx
│   │   │   ├── otp-verify.tsx
│   │   │   └── profile-setup.tsx
│   │   ├── (main)/               # Main app screens
│   │   │   ├── home.tsx
│   │   │   ├── create-shipment/  # Shipment flow (multi-step)
│   │   │   │   ├── step-1-pickup.tsx
│   │   │   │   ├── step-2-recipient.tsx
│   │   │   │   ├── step-3-products.tsx
│   │   │   │   ├── step-4-weight.tsx
│   │   │   │   └── step-5-payment.tsx
│   │   │   ├── tracking/
│   │   │   │   ├── order-details.tsx
│   │   │   │   ├── live-tracking.tsx
│   │   │   │   └── order-history.tsx
│   │   │   ├── account/
│   │   │   │   ├── profile.tsx
│   │   │   │   ├── saved-addresses.tsx
│   │   │   │   ├── payment-methods.tsx
│   │   │   │   └── settings.tsx
│   │   │   └── support/
│   │   │       ├── help-center.tsx
│   │   │       └── chat.tsx
│   │   └── _layout.tsx            # Main layout/navigation
│   │
│   ├── components/
│   │   ├── common/                # Reusable components
│   │   │   ├── button.tsx
│   │   │   ├── text-input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── error-boundary.tsx
│   │   │   └── notification.tsx
│   │   ├── forms/
│   │   │   ├── address-form.tsx
│   │   │   ├── product-form.tsx
│   │   │   └── payment-form.tsx
│   │   ├── tracking/
│   │   │   ├── tracking-map.tsx
│   │   │   ├── status-timeline.tsx
│   │   │   └── tracking-header.tsx
│   │   └── auth/
│   │       ├── login-form.tsx
│   │       └── otp-input.tsx
│   │
│   ├── services/
│   │   ├── api.ts                 # API client setup
│   │   ├── auth-service.ts        # Auth APIs
│   │   ├── shipment-service.ts    # Shipment APIs
│   │   ├── tracking-service.ts    # Tracking APIs
│   │   ├── payment-service.ts     # Payment APIs
│   │   └── user-service.ts        # User APIs
│   │
│   ├── hooks/
│   │   ├── use-auth.ts            # Auth context hook
│   │   ├── use-shipment.ts        # Shipment context hook
│   │   ├── use-form.ts            # Form handling
│   │   ├── use-tracking.ts        # Real-time tracking
│   │   └── use-local-storage.ts   # Local storage
│   │
│   ├── store/                     # State management (Redux/Zustand)
│   │   ├── slices/
│   │   │   ├── auth-slice.ts
│   │   │   ├── shipment-slice.ts
│   │   │   ├── order-slice.ts
│   │   │   └── ui-slice.ts
│   │   ├── store.ts               # Store configuration
│   │   └── thunks/
│   │       ├── auth-thunks.ts
│   │       └── shipment-thunks.ts
│   │
│   ├── constants/
│   │   ├── theme.ts               # Colors, spacing, typography
│   │   ├── api.ts                 # API endpoints
│   │   ├── validation.ts          # Form validation rules
│   │   └── shipping-rates.ts      # Pricing configuration
│   │
│   ├── utils/
│   │   ├── validators.ts          # Input validation functions
│   │   ├── formatters.ts          # Date, currency formatting
│   │   ├── storage.ts             # AsyncStorage utilities
│   │   ├── logger.ts              # Logging utility
│   │   └── errors.ts              # Error handling
│   │
│   ├── types/
│   │   ├── index.ts               # Main type exports
│   │   ├── auth.ts                # Auth types
│   │   ├── shipment.ts            # Shipment types
│   │   ├── order.ts               # Order types
│   │   ├── user.ts                # User types
│   │   └── payment.ts             # Payment types
│   │
│   ├── contexts/
│   │   ├── auth-context.tsx       # Auth context provider
│   │   ├── theme-context.tsx      # Theme context (light/dark)
│   │   └── notification-context.tsx
│   │
│   ├── global.css                 # Global styles
│   └── index.tsx                  # Entry point
│
├── assets/
│   ├── images/                    # Images
│   ├── icons/                     # Icon sprites
│   └── fonts/                     # Custom fonts
│
├── scripts/
│   ├── reset-project.js           # Reset script (provided)
│   ├── setup-env.js               # Environment setup
│   └── generate-types.js          # TypeScript generation
│
├── tests/
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── e2e/                       # E2E tests (Detox)
│
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI/CD pipeline
│       ├── test.yml               # Testing
│       └── deploy.yml             # Deployment
│
├── .env.example                   # Environment template
├── .gitignore
├── app.json                       # Expo configuration
├── package.json
├── tsconfig.json                  # TypeScript config
├── PRD.md                         # Product requirements
├── WIREFRAMES.md                  # UI mockups
├── API_SPEC.md                    # API documentation
└── README.md
```

---

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/feature-name
# or for bug fixes:
git checkout -b bugfix/bug-name
```

### 2. Make Changes
```bash
# Edit files, add features, write tests
```

### 3. Commit Changes
```bash
# Use conventional commit messages
git add .
git commit -m "feat: add shipment creation flow

- Implement multi-step form
- Add weight calculation
- Integrate pricing API"
```

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 4. Push and Create Pull Request
```bash
git push origin feature/feature-name
```

### 5. Code Review & Merge
- At least 1 approval required
- All CI checks must pass
- Squash and merge on main

---

## Available Scripts

### Development
```bash
# Start development server (iOS)
npm run ios

# Start development server (Android)
npm run android

# Start development server (Web)
npm run web

# Start dev server (interactive menu)
npm run start
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- services/api.test.ts

# Run E2E tests
npm run test:e2e
```

### Code Quality
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix

# Type check
npm run type-check

# Format code
npm run format

# Check types and lint
npm run check
```

### Build & Release
```bash
# Build for production (web)
npm run build:web

# Build for production (iOS)
npm run build:ios

# Build for production (Android)
npm run build:android

# Create EAS build
eas build --platform ios
eas build --platform android

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

### Other
```bash
# Clean cache
npm run reset-project

# Generate TypeScript types
npm run generate-types

# Setup environment
npm run setup:env
```

---

## Coding Standards

### TypeScript

1. **Always use TypeScript** - No `any` types
```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  name: string;
}

const getUser = async (id: string): Promise<User> => {
  // implementation
};

// ❌ Bad
const getUser = async (id) => {
  // missing types
};
```

2. **Define Types Explicitly**
```typescript
// ✅ Good
type ShipmentStatus = 'pending' | 'picked_up' | 'in_transit' | 'delivered';

interface Shipment {
  id: string;
  status: ShipmentStatus;
  weight: number;
  estimatedDelivery: Date;
}

// ❌ Bad
const shipment = {
  id: 'xyz',
  status: 'pending', // string without type definition
  weight: 2.5,
};
```

### React/React Native Components

1. **Functional Components with Hooks**
```typescript
// ✅ Good
const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handlePress = useCallback(() => {
    onPress(order.id);
  }, [order.id, onPress]);
  
  return <Pressable onPress={handlePress} />;
};

// ❌ Bad (Class components)
class OrderCard extends React.Component {
  render() {
    return <View />;
  }
}
```

2. **Use Custom Hooks for Logic**
```typescript
// ✅ Good
const useShipmentForm = (initialData?: Shipment) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const validate = useCallback((): boolean => {
    // validation logic
    return true;
  }, [formData]);
  
  return { formData, errors, validate };
};

const ShipmentForm = ({ initialData }) => {
  const { formData, errors, validate } = useShipmentForm(initialData);
  // component logic
};
```

3. **Extract Styles to Modules**
```typescript
// ✅ Good (ShipmentForm.module.css)
.container {
  padding: 16px;
  backgroundColor: #f2f2f7;
}

// ✅ Good (ShipmentForm.tsx)
import styles from './ShipmentForm.module.css';

const ShipmentForm = () => (
  <View className={styles.container} />
);

// ❌ Bad (inline styles everywhere)
<View style={{ paddingTop: 16, backgroundColor: '#f2f2f7' }} />
```

### File Naming

- **Components:** PascalCase (`OrderCard.tsx`)
- **Hooks:** camelCase with `use` prefix (`useShipment.ts`)
- **Services:** camelCase with `-service` suffix (`api-service.ts`)
- **Types:** Use `.d.ts` or include in file (`types/shipment.ts`)
- **Tests:** Same name as file with `.test.ts` suffix (`OrderCard.test.tsx`)

### Import Organization

```typescript
// 1. External dependencies
import React, { useState, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import axios from 'axios';

// 2. Local components
import { Button } from '@/components/common/button';
import { OrderCard } from '@/components/order-card';

// 3. Hooks
import { useShipment } from '@/hooks/use-shipment';

// 4. Services
import { shipmentService } from '@/services/shipment-service';

// 5. Types
import type { Shipment, Order } from '@/types';

// 6. Utils
import { formatCurrency, validateEmail } from '@/utils';

// 7. Constants
import { SHIPMENT_STATUSES } from '@/constants';

// 8. Styles
import styles from './OrderHistory.module.css';
```

### Error Handling

```typescript
// ✅ Good
try {
  const shipment = await shipmentService.getShipment(id);
  return shipment;
} catch (error) {
  if (error instanceof NotFoundError) {
    logger.warn(`Shipment ${id} not found`);
    throw new UserFacingError('Shipment not found');
  } else if (error instanceof NetworkError) {
    logger.error('Network error fetching shipment', error);
    throw new UserFacingError('Network error. Please check connection.');
  } else {
    logger.error('Unexpected error', error);
    throw error;
  }
}

// ❌ Bad
try {
  const shipment = await shipmentService.getShipment(id);
} catch (error) {
  console.log(error); // Poor error handling
}
```

### Comments & Documentation

```typescript
/**
 * Calculates shipping cost based on weight, distance, and destination
 * @param weight - Package weight in kg
 * @param origin - Pickup location (South Korea)
 * @param destination - Delivery location (India/Nepal)
 * @returns Calculated cost in destination currency
 * @throws {ValidationError} if weight exceeds 30kg or is less than 0.25kg
 * 
 * @example
 * const cost = calculateShippingCost(2.5, 'Seoul', 'Delhi');
 * // returns { baseCost: 500, weightCost: 375, ... }
 */
const calculateShippingCost = (
  weight: number,
  origin: string,
  destination: string
): ShippingCost => {
  // implementation
};
```

---

## State Management

### Using Redux Toolkit (Recommended)

#### 1. Setup Store
```typescript
// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth-slice';
import shipmentReducer from './slices/shipment-slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    shipment: shipmentReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### 2. Create Slices
```typescript
// store/slices/auth-slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setUser, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
```

#### 3. Use in Components
```typescript
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/store';
import { setUser } from '@/store/slices/auth-slice';

const LoginScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  
  const handleLogin = async (email: string, password: string) => {
    dispatch(setLoading(true));
    try {
      const user = await authService.login(email, password);
      dispatch(setUser(user));
    } catch (error) {
      // handle error
    } finally {
      dispatch(setLoading(false));
    }
  };
  
  return (
    // JSX
  );
};
```

---

## API Integration

### 1. Setup API Client

```typescript
// services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

class APIClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add request interceptor for auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle token expiry
          await this.refreshToken();
        }
        return Promise.reject(error);
      }
    );
  }
  
  private async refreshToken() {
    // Implementation for token refresh
  }
  
  public get<T>(url: string, config?: any) {
    return this.client.get<T>(url, config);
  }
  
  public post<T>(url: string, data?: any, config?: any) {
    return this.client.post<T>(url, data, config);
  }
  
  // Add put, patch, delete methods...
}

export const apiClient = new APIClient();
```

### 2. Create Service Layer

```typescript
// services/shipment-service.ts
import { apiClient } from './api';
import type { Shipment, CreateShipmentRequest } from '@/types';

class ShipmentService {
  async createShipment(data: CreateShipmentRequest): Promise<Shipment> {
    const response = await apiClient.post<Shipment>('/shipments', data);
    return response.data;
  }
  
  async getShipment(id: string): Promise<Shipment> {
    const response = await apiClient.get<Shipment>(`/shipments/${id}`);
    return response.data;
  }
  
  async updateShipment(id: string, data: Partial<Shipment>): Promise<Shipment> {
    const response = await apiClient.put<Shipment>(`/shipments/${id}`, data);
    return response.data;
  }
  
  async listShipments(filters?: ShipmentFilters): Promise<Shipment[]> {
    const response = await apiClient.get<Shipment[]>('/shipments', {
      params: filters,
    });
    return response.data;
  }
  
  async trackShipment(trackingId: string): Promise<ShipmentTracking> {
    const response = await apiClient.get<ShipmentTracking>(
      `/shipments/track/${trackingId}`
    );
    return response.data;
  }
}

export const shipmentService = new ShipmentService();
```

### 3. Use in Components

```typescript
const OrderDetails = ({ orderId }: { orderId: string }) => {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchShipment = async () => {
      try {
        setIsLoading(true);
        const data = await shipmentService.getShipment(orderId);
        setShipment(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchShipment();
  }, [orderId]);
  
  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!shipment) return <NotFound />;
  
  return <ShipmentDetails shipment={shipment} />;
};
```

---

## Testing Guidelines

### Unit Tests

```typescript
// services/shipment-service.test.ts
import { shipmentService } from './shipment-service';
import { apiClient } from './api';

jest.mock('./api');

describe('ShipmentService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createShipment', () => {
    it('should create shipment with valid data', async () => {
      const mockData = {
        origin: 'Seoul',
        destination: 'Delhi',
        weight: 2.5,
      };
      
      const mockResponse = { id: '123', ...mockData, status: 'pending' };
      
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: mockResponse,
      });
      
      const result = await shipmentService.createShipment(mockData);
      
      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith('/shipments', mockData);
    });
    
    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      (apiClient.post as jest.Mock).mockRejectedValue(mockError);
      
      await expect(
        shipmentService.createShipment({} as any)
      ).rejects.toThrow('API Error');
    });
  });
});
```

### Component Tests

```typescript
// components/order-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { OrderCard } from './order-card';

describe('OrderCard', () => {
  const mockOrder = {
    id: '123',
    trackingId: 'NM123',
    status: 'in_transit',
    weight: 2.5,
  };
  
  it('should render order details', () => {
    render(<OrderCard order={mockOrder} onPress={jest.fn()} />);
    
    expect(screen.getByText('NM123')).toBeOnTheScreen();
    expect(screen.getByText('In Transit')).toBeOnTheScreen();
  });
  
  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    render(<OrderCard order={mockOrder} onPress={onPress} />);
    
    fireEvent.press(screen.getByTestId('order-card-button'));
    
    expect(onPress).toHaveBeenCalledWith(mockOrder.id);
  });
});
```

### E2E Tests (Detox)

```typescript
// tests/e2e/shipment-flow.e2e.ts
describe('Shipment Creation Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });
  
  beforeEach(async () => {
    await device.reloadReactNative();
  });
  
  it('should complete shipment flow', async () => {
    // Login
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('login-button')).multiTap();
    
    // Create shipment
    await element(by.id('new-shipment-button')).tap();
    
    // Fill pickup location
    await element(by.id('pickup-select')).multiTap();
    await element(by.text('Busan Hub')).tap();
    
    // Continue through flow...
    await element(by.id('continue-button')).tap();
    
    // Verify success
    await expect(element(by.text('Payment Successful'))).toBeVisible();
  });
});
```

---

## Deployment

### Web Deployment

#### 1. Build for Production
```bash
npm run build:web
```

#### 2. Deploy to Firebase Hosting
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Initialize Firebase
firebase init

# Deploy
firebase deploy
```

#### 3. Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Mobile App Deployment

#### 1. Prepare Environment
```bash
# Create EAS account
npm run eas:login

# Initialize EAS (one-time)
npm run eas:init
```

#### 2. Build for App Stores
```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both
eas build --platform all
```

#### 3. Submit to App Stores
```bash
# Submit to Apple App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

#### 4. Configure App Store Credentials
```bash
# Update iOS credentials
eas credentials --platform ios

# Update Android credentials
eas credentials --platform android
```

---

## Troubleshooting

### Common Issues

#### 1. Expo Metro Bundler Issues
```bash
# Clear cache and restart
npm run reset-project
npm start
```

#### 2. Pod Install Fails (iOS)
```bash
cd ios
rm -rf Pods
rm Podfile.lock
pod install
cd ..
```

#### 3. Android Gradle Issues
```bash
cd android
./gradlew clean
cd ..
```

#### 4. Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

#### 5. TypeScript Errors
```bash
# Regenerate types
npm run generate-types

# Type check
npm run type-check
```

### Debug Mode

```typescript
// Enable debug logging
import { enableDebugMode } from '@/utils/logger';

if (__DEV__) {
  enableDebugMode();
}
```

### Network Issues

Check if backend is running:
```bash
curl http://localhost:3000/api/health
```

---

## Performance Optimization

### Code Splitting
- Use dynamic imports for large components
- Lazy load screens with Expo Router

### Image Optimization
- Optimize images to < 100KB
- Use WebP format when possible
- Implement lazy loading for lists

### Bundle Size
```bash
# Analyze bundle size
npm run analyze:bundle
```

---

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Redux Toolkit Docs](https://redux-toolkit.js.org/)

---

*Last Updated: August 2026*
*Version: 1.0*
