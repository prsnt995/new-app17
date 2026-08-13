# NamasteMart - Wireframes & UI/UX Mockups

**Version:** 1.0  
**Last Updated:** August 2026  
**Device:** Mobile-first (iOS/Android), Web responsive

---

## 1. Onboarding Flow

### Screen 1.1: Splash Screen
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│          🙏 NamasteMart             │
│                                     │
│    Ship from Korea to Home          │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘

Status: Loading with animated icon (spinning)
Duration: 2-3 seconds
Action: Auto-navigate to Login
```

### Screen 1.2: Login/Signup Screen
```
┌─────────────────────────────────────┐
│  < Back                             │
│                                     │
│       Welcome to NamasteMart        │
│                                     │
│  Your trusted shipping partner      │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Email Address                 │  │
│  │ [_________________________]    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [GET OTP]                     │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔵 Continue with Google       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔵 Continue with Apple        │  │
│  └───────────────────────────────┘  │
│                                     │
│  By continuing, you agree to our    │
│  Terms & Privacy Policy             │
│                                     │
└─────────────────────────────────────┘
```

### Screen 1.3: OTP Verification
```
┌─────────────────────────────────────┐
│  < Back                             │
│                                     │
│  Verify Your Email                  │
│                                     │
│  Enter the 6-digit code sent to:    │
│  user@example.com                   │
│                                     │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐          │
│  │_│ │_│ │_│ │_│ │_│ │_│          │
│  └─┘ └─┘ └─┘ └─┘ └─┘ └─┘          │
│                                     │
│  ⏱ Resend code in 30s               │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [VERIFY]                      │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Screen 1.4: Profile Setup (First Time)
```
┌─────────────────────────────────────┐
│  < Back               Skip      >   │
│                                     │
│       Complete Your Profile         │
│                                     │
│           👤 Add Photo              │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ First Name                    │  │
│  │ [_________________________]    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Last Name                     │  │
│  │ [_________________________]    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Phone (+82)                   │  │
│  │ [_________________________]    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [CONTINUE]                    │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## 2. Main Shipment Flow

### Screen 2.1: Home/Dashboard
```
┌─────────────────────────────────────┐
│  ☰ Menu          👤 Account         │
│                                     │
│  🙏 Welcome Back, Parshant!         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ⭐ Active Shipments: 2        │  │
│  │ ↓                            │  │
│  │ Order #NM20260814001         │  │
│  │ 📦 Seoul → Delhi             │  │
│  │ Status: In Transit (2d left) │  │
│  │ Weight: 2.5 kg               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ + [CREATE NEW SHIPMENT]       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Recent Orders                │  │
│  │ 📦 Order #NM20260810002      │  │
│  │    Seoul → Kathmandu (✓ Done)│  │
│  │ 📦 Order #NM20260801001      │  │
│  │    Seoul → Mumbai (✓ Done)   │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Screen 2.2: Sender Address (South Korea - Fixed)
```
┌─────────────────────────────────────┐
│  < Back          Shipment Step 1/5  │
│                                     │
│  Pickup Location (South Korea)      │
│                                     │
│  Select your preferred pickup:      │
│                                     │
│  ○ Seoul Main Hub                   │
│    📍 123 Gangnam-gu, Seoul         │
│    Available slots: 5               │
│                                     │
│  ● Busan Hub                        │
│    📍 456 Seo-gu, Busan             │
│    Available slots: 8               │
│                                     │
│  ○ Incheon Hub                      │
│    📍 789 Jung-gu, Incheon          │
│    Available slots: 3               │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [CONTINUE]                    │  │
│  └───────────────────────────────┘  │
│                                     │
│  [SKIP LOCATION - USE POSTAL]       │
│                                     │
└─────────────────────────────────────┘
```

### Screen 2.3: Pickup Time Slot
```
┌─────────────────────────────────────┐
│  < Back     Pickup Scheduling       │
│                                     │
│  When should we pickup?             │
│                                     │
│  📅 Select Date:                    │
│  [Thu, Aug 14] [Fri, Aug 15] >      │
│                                     │
│  📍 Busan Hub                       │
│  456 Seo-gu, Busan                  │
│                                     │
│  Time Slot Selection:               │
│                                     │
│  ○ 8:00 AM - 12:00 PM               │
│    (Morning)                        │
│                                     │
│  ● 12:00 PM - 6:00 PM               │
│    (Afternoon)                      │
│    ✓ Recommended                    │
│                                     │
│  ○ 6:00 PM - 8:00 PM                │
│    (Evening)                        │
│                                     │
│  Special Instructions:              │
│  ┌───────────────────────────────┐  │
│  │ [Ring bell, door is unlocked]│  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [CONTINUE]                    │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Screen 2.4: Recipient Address (India/Nepal)
```
┌─────────────────────────────────────┐
│  < Back      Shipment Step 2/5      │
│                                     │
│  Delivery Address                   │
│                                     │
│  📍 Where should we deliver?        │
│                                     │
│  ○ Use Saved Address                │
│  [▼ Select saved address]           │
│                                     │
│  ● Enter New Address                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Country *                     │  │
│  │ [▼ India        ]             │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Full Address *                │  │
│  │ [_________________________]    │  │
│  │ (With Google Maps autocomplete)  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Postal Code *                 │  │
│  │ [_________________________]    │  │
│  └───────────────────────────────┘  │
│                                     │
│  Address Type:                      │
│  ○ Home  ● Office  ○ Other          │
│                                     │
│  ☑ Save this address for later      │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [CONTINUE]                    │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Screen 2.5: Add Products (Multiple)
```
┌─────────────────────────────────────┐
│  < Back      Shipment Step 3/5      │
│                                     │
│  What are you sending?              │
│  (Total Weight: 2.5 kg)             │
│                                     │
│  📦 Product 1                       │
│  Category: Electronics              │
│  Description: iPhone 15 Pro         │
│  Qty: 1 | Value: ₩1,200,000        │
│  Weight: 200g                       │
│  [× Remove] [✎ Edit]                │
│                                     │
│  📦 Product 2                       │
│  Category: Clothing                 │
│  Description: Winter Jacket         │
│  Qty: 2 | Value: ₩150,000          │
│  Weight: 1.2 kg                     │
│  [× Remove] [✎ Edit]                │
│                                     │
│  📦 Product 3                       │
│  Category: Home Goods               │
│  Description: Pillow Set            │
│  Qty: 1 | Value: ₩80,000           │
│  Weight: 1.1 kg                     │
│  [× Remove] [✎ Edit]                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [+ ADD MORE PRODUCTS]         │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [CONTINUE]                    │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Screen 2.5.1: Add Product Modal
```
┌─────────────────────────────────────┐
│  ✕ Add Product                      │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Category *                    │  │
│  │ [▼ Electronics      ]         │  │
│  │ - Electronics                 │  │
│  │ - Clothing                    │  │
│  │ - Home Goods                  │  │
│  │ - Cosmetics                   │  │
│  │ - Books                       │  │
│  │ - Food Items                  │  │
│  │ - Other                       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Product Description *         │  │
│  │ [_________________________]    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Quantity *                    │  │
│  │ [_]  (default: 1)             │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Estimated Value (₩) *         │  │
│  │ [_________________________]    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Weight (kg) *                 │  │
│  │ [_________________________]    │  │
│  │ ⓘ Min: 0.25kg, Max: 30kg      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ HS Code (Optional)            │  │
│  │ [_________________________]    │  │
│  │ ⓘ For customs declaration     │  │
│  └───────────────────────────────┘  │
│                                     │
│  ☑ Hazardous? (Explosives, etc)     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [CANCEL] [ADD PRODUCT]        │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Screen 2.6: Weight & Dimensions Review
```
┌─────────────────────────────────────┐
│  < Back      Shipment Step 4/5      │
│                                     │
│  Package Summary                    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Total Weight                  │  │
│  │ 2.5 kg                        │  │
│  │ ⓘ Max allowed: 30 kg          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Dimensions (Optional)         │  │
│  │                               │  │
│  │ Length (cm): [____]           │  │
│  │ Width (cm):  [____]           │  │
│  │ Height (cm): [____]           │  │
│  │                               │  │
│  │ Volumetric Weight: N/A        │  │
│  └───────────────────────────────┘  │
│                                     │
│  ⚠ Items Validation:                │
│  ✓ No prohibited items detected     │
│  ✓ All items within limits          │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [CONTINUE]                    │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Screen 2.7: Shipping Options & Quote
```
┌─────────────────────────────────────┐
│  < Back      Shipment Step 5/5      │
│                                     │
│  Shipping Options & Quote           │
│                                     │
│  From: 🇰🇷 Busan Hub                │
│  To:   🇮🇳 Delhi, India             │
│  Weight: 2.5 kg                     │
│                                     │
│  ● EXPRESS DELIVERY                 │
│    🚀 Fastest (5-7 business days)   │
│    Pickup: Tomorrow (Aug 15)        │
│                                     │
│    Price Breakdown:                 │
│    Base Rate:        ₹500           │
│    Weight (2.5kg):   ₹375 (1.5x)   │
│    Distance charge:  ₹300           │
│    Handling fee:     ₹100           │
│    Taxes (5%):       ₹108           │
│    ─────────────────────────        │
│    Total:            ₹1,383         │
│                                     │
│  ○ STANDARD DELIVERY                │
│    📦 Economical (10-15 days)       │
│    Pickup: Next 3 days              │
│                                     │
│    Price Breakdown:                 │
│    Base Rate:        ₹350           │
│    Weight (2.5kg):   ₹250 (1.0x)   │
│    Distance charge:  ₹200           │
│    Handling fee:     ₹75            │
│    Taxes (5%):       ₹74            │
│    ─────────────────────────        │
│    Total:            ₹949           │
│                                     │
│  Exchange Rate: 1 KRW = 0.062 INR   │
│  Updated: 2 mins ago                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [PROCEED TO PAYMENT]          │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## 3. Payment Flow

### Screen 3.1: Payment Method Selection
```
┌─────────────────────────────────────┐
│  < Back          Payment Method     │
│                                     │
│  Amount to Pay: ₹1,383              │
│                                     │
│  Select Payment Method:             │
│                                     │
│  ● CREDIT/DEBIT CARD                │
│    Visa, Mastercard, American Exp   │
│                                     │
│  ○ UPI (India Only)                 │
│    Google Pay, PhonePe, Paytm       │
│                                     │
│  ○ MOBILE WALLET                    │
│    Apple Pay, Google Pay            │
│                                     │
│  ○ REGIONAL PAYMENT                 │
│    Kakao Pay (Korea), Paytm (India) │
│                                     │
│  ○ BANK TRANSFER                    │
│    Direct bank deposit (slower)     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [CONTINUE]                    │  │
│  └───────────────────────────────┘  │
│                                     │
│  🔒 All payments are encrypted      │
│  and secure                         │
│                                     │
└─────────────────────────────────────┘
```

### Screen 3.2: Card Payment
```
┌─────────────────────────────────────┐
│  < Back      Enter Card Details     │
│                                     │
│  Amount: ₹1,383                     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Card Number *                 │  │
│  │ [____] [____] [____] [____]   │  │
│  │ Visa                          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────┬───────────────────┐  │
│  │ Expiry *  │ CVV *             │  │
│  │ [__/____] │ [___]             │  │
│  └───────────┴───────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Cardholder Name *             │  │
│  │ [_________________________]    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ☑ Save this card for future use    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [PAY ₹1,383]                  │  │
│  └───────────────────────────────┘  │
│                                     │
│  🔒 Secured by Stripe               │
│  PCI-DSS Compliant                  │
│                                     │
└─────────────────────────────────────┘
```

### Screen 3.3: UPI Payment
```
┌─────────────────────────────────────┐
│  < Back      UPI Payment            │
│                                     │
│  Amount: ₹1,383                     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Your UPI ID *                 │  │
│  │ [_________________________]@   │  │
│  │ Example: yourname@googlepay   │  │
│  └───────────────────────────────┘  │
│                                     │
│  Or Quick UPI Apps:                 │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔵 Google Pay                 │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔵 PhonePe                    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔵 Paytm                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [PAY ₹1,383 VIA UPI]          │  │
│  └───────────────────────────────┘  │
│                                     │
│  🔒 Secured by Razorpay             │
│                                     │
└─────────────────────────────────────┘
```

### Screen 3.4: Payment Processing
```
┌─────────────────────────────────────┐
│                                     │
│  Processing Payment...              │
│                                     │
│  ⟳ (Loading spinner)                │
│                                     │
│  Amount: ₹1,383                     │
│  Payment Method: Visa ****1234      │
│                                     │
│  Do not close this window            │
│                                     │
│                                     │
│  (On UPI - opens device default      │
│   UPI app for authentication)        │
│                                     │
└─────────────────────────────────────┘
```

### Screen 3.5: Payment Success
```
┌─────────────────────────────────────┐
│                                     │
│           ✅ Payment Successful!    │
│                                     │
│  Transaction ID: TXN20260814001234  │
│  Amount: ₹1,383                     │
│  Timestamp: Aug 14, 2:30 PM IST     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ SHIPMENT CONFIRMED!           │  │
│  │ Order ID: #NM20260814001      │  │
│  │                               │  │
│  │ 📦 2.5 kg Package             │  │
│  │ 🇰🇷 Seoul → 🇮🇳 Delhi       │  │
│  │ 🚀 Express (5-7 days)         │  │
│  │                               │  │
│  │ Pickup: Tomorrow, 12-6 PM     │  │
│  │ Est. Delivery: Aug 21, 2026   │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [VIEW TRACKING]               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [DOWNLOAD RECEIPT]            │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [HOME]                        │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## 4. Tracking & Order Management

### Screen 4.1: Live Tracking
```
┌─────────────────────────────────────┐
│  < Back      Order #NM20260814001   │
│                                     │
│  📍 LIVE TRACKING                   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  [MAP VIEW - GPS Location]    │  │
│  │                               │  │
│  │  🚚 Current: Over East China   │  │
│  │  Sea (Lat: 32.5, Lon: 125.3) │  │
│  │                               │  │
│  │  ← Zoom In/Out Controls       │  │
│  └───────────────────────────────┘  │
│                                     │
│  Shipment Status Timeline:          │
│                                     │
│  ✅ Picked Up - Aug 14, 3:45 PM     │
│     Busan Hub, Korea                │
│                                     │
│  ✅ In Transit - Aug 15, 9:00 AM    │
│     Left Busan Terminal              │
│                                     │
│  🔵 In Transit - Aug 16, 12:00 PM   │
│     At Mumbai Port                   │
│     Expected: Aug 18, 6 PM          │
│                                     │
│  ⭕ Out for Delivery                │
│     Expected: Aug 21, 2026          │
│                                     │
│  ⭕ Delivered                       │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔔 [NOTIFY ME]  💬 [CONTACT]  │  │
│  └───────────────────────────────┘  │
│                                     │
│  Est. Delivery: Aug 21 (5 days)     │
│                                     │
└─────────────────────────────────────┘
```

### Screen 4.2: Order Details
```
┌─────────────────────────────────────┐
│  < Back      Order #NM20260814001   │
│                                     │
│  ORDER DETAILS                      │
│                                     │
│  📦 SHIPMENT INFO                   │
│  ├─ Total Weight: 2.5 kg            │
│  ├─ Service: Express (5-7 days)     │
│  ├─ Status: In Transit              │
│  └─ Tracking: NM20260814001         │
│                                     │
│  🇰🇷 FROM (Pickup)                  │
│  Busan Hub                          │
│  456 Seo-gu, Busan, Korea           │
│  Pickup: Aug 14, 2-6 PM             │
│                                     │
│  🇮🇳 TO (Delivery)                  │
│  Rajesh Kumar                       │
│  New Delhi, India - 110001          │
│  Est. Delivery: Aug 21, 2026        │
│                                     │
│  💰 PAYMENT SUMMARY                 │
│  Base Rate:      ₹500               │
│  Weight Charge:  ₹375               │
│  Distance:       ₹300               │
│  Handling:       ₹100               │
│  Taxes:          ₹108               │
│  ────────────────────────           │
│  TOTAL:          ₹1,383             │
│  Status:         ✅ PAID            │
│                                     │
│  📋 ITEMS (3)                       │
│  1. iPhone 15 Pro (1x, ₹1.2M)       │
│  2. Winter Jacket (2x, ₹150K)       │
│  3. Pillow Set (1x, ₹80K)           │
│                                     │
│  [PRINT LABEL] [CONTACT SUPPORT]    │
│                                     │
└─────────────────────────────────────┘
```

### Screen 4.3: Order History
```
┌─────────────────────────────────────┐
│  ☰ Menu          👤 Account         │
│                                     │
│  ORDER HISTORY                      │
│                                     │
│  Filter: [All ▼] [Date ▼]           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📦 #NM20260814001            │  │
│  │ 🔵 In Transit (2d left)      │  │
│  │ Aug 14 → Delhi               │  │
│  │ Weight: 2.5 kg | ₹1,383      │  │
│  │ [TRACK] [VIEW DETAILS]       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📦 #NM20260810002            │  │
│  │ ✅ Delivered (Aug 12)        │  │
│  │ Aug 10 → Kathmandu           │  │
│  │ Weight: 1.8 kg | ₹980        │  │
│  │ [TRACK] [REORDER]            │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📦 #NM20260801001            │  │
│  │ ✅ Delivered (Aug 1)         │  │
│  │ Jul 28 → Mumbai              │  │
│  │ Weight: 3.2 kg | ₹1,520      │  │
│  │ [TRACK] [REORDER]            │  │
│  └───────────────────────────────┘  │
│                                     │
│  Load More...                       │
│                                     │
└─────────────────────────────────────┘
```

---

## 5. Account & Settings

### Screen 5.1: Account Settings
```
┌─────────────────────────────────────┐
│  < Back          My Account         │
│                                     │
│           👤 Parshant Kumar         │
│          parshant@email.com         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📍 SAVED ADDRESSES            │  │
│  │ → Manage your addresses       │  │
│  │ (3 saved)                     │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 💳 PAYMENT METHODS            │  │
│  │ → Manage cards & wallets      │  │
│  │ (2 saved)                     │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 📋 ORDER HISTORY              │  │
│  │ → View all shipments          │  │
│  │ (45 total)                    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🎟️ PROMO CODES               │  │
│  │ → Apply discount codes        │  │
│  │ (3 active)                    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ ⚙️ SETTINGS                   │  │
│  │ → Notifications, Privacy      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🆘 SUPPORT & HELP             │  │
│  │ → Contact us, FAQ             │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [LOGOUT]                      │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Screen 5.2: Saved Addresses
```
┌─────────────────────────────────────┐
│  < Back      Saved Addresses (3)    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏠 HOME (Default)             │  │
│  │ Rajesh Kumar                  │  │
│  │ New Delhi, India - 110001     │  │
│  │ [✎ Edit] [× Delete]           │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🏢 OFFICE                     │  │
│  │ Akshay Singh                  │  │
│  │ Bangalore, India - 560001     │  │
│  │ [✎ Edit] [× Delete]           │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🤝 FAMILY                     │  │
│  │ Priya Sharma                  │  │
│  │ Kathmandu, Nepal - 44600      │  │
│  │ [✎ Edit] [× Delete]           │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [+ ADD NEW ADDRESS]           │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## 6. Admin/Support Features (Future)

### Screen 6.1: Customer Support Chat
```
┌─────────────────────────────────────┐
│  < Back      Support Chat           │
│                                     │
│  🤖 NamasteMart Support             │
│  Online                             │
│                                     │
│  Hi! How can we help you today?     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🔘 Track Shipment           │    │
│  │ 🔘 Pricing Questions        │    │
│  │ 🔘 Report Issue             │    │
│  │ 🔘 Refund/Return            │    │
│  │ 🔘 Other                    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Message...  [Send] [Attach]   │  │
│  └───────────────────────────────┘  │
│                                     │
│  💬 Chat history available          │
│                                     │
│  Response time: Avg 2 mins          │
│                                     │
└─────────────────────────────────────┘
```

---

## 7. Navigation Structure

### Bottom Tab Navigation
```
┌─────────────────────────────────────┐
│  [Content Area]                     │
│                                     │
│  ├─────────────────────────────────┤
│  │🏠 Home │ ➕ New  │ 📦 Orders │ 👤 Account
│  └─────────────────────────────────┘
```

### Drawer Navigation (Hamburger Menu)
```
☰ NamasteMart
├── 🏠 Home
├── ➕ Create Shipment
├── 📦 Order History
├── 📍 Saved Addresses
├── 💳 Payment Methods
├── 🎟️ Promo Codes
├── ⚙️ Settings
├── 🆘 Help & Support
├── 📞 Contact Us
├── ℹ️ About Us
└── 🚪 Logout
```

---

## 8. Design Specifications

### Color Palette
```
Primary Blue:     #007AFF (Action buttons)
Success Green:    #34C759 (Confirmations, delivered)
Warning Orange:   #FF9500 (In transit, alerts)
Danger Red:       #FF3B30 (Errors, cancellations)
Neutral Gray:     #8E8E93 (Secondary text)
Background:       #F2F2F7 (Light mode)
Card Background:  #FFFFFF (Light mode)
```

### Typography
```
Heading 1:  SF Pro Display / 28px / Bold
Heading 2:  SF Pro Display / 22px / Semibold
Body Text:  SF Pro Text / 16px / Regular
Small Text: SF Pro Text / 14px / Regular
```

### Spacing
```
Margin/Padding: 8px, 12px, 16px, 24px, 32px
Border Radius:  8px (buttons), 12px (cards)
Button Height:  48px (touch targets)
```

### Icons
- Pickup: 📍 / 🏢
- In Transit: 🚚 / ⟳
- Delivered: ✅
- Error: ⚠️ / ❌

---

## 9. User Flows (Visual Text Representation)

### Complete Shipping Flow
```
Start → Login → Home → Create Shipment
  → Select Pickup (SK) → Select Time Slot
  → Enter Recipient (India/Nepal) → Add Products
  → Review Weight → Select Shipping Speed
  → Get Quote → Choose Payment Method
  → Process Payment → Order Confirmation
  → View Tracking → Order History
```

### Tracking Flow
```
Home → View Active Order → Live Tracking
  → View Full Details → Download Receipt
  → Contact Support (if needed)
```

### Account Management Flow
```
Account → Saved Addresses / Payment Methods
  → Order History → Settings → Support
```

---

## 10. Responsive Design Notes

### Mobile (320px - 428px)
- Full-screen layouts
- Bottom navigation for main sections
- Touch-friendly button sizes (min 48px)
- Vertical scrolling for content

### Tablet (768px - 1024px)
- Split view: Navigation sidebar + Content
- Larger cards and spacing
- Horizontal form layouts

### Web (1024px+)
- Desktop layout with full sidebar
- Multi-column layouts
- Hover states for interactive elements
- Keyboard navigation support

---

## 11. Animation & Interactions

### Loading States
- Animated spinner during payment processing
- Skeleton loading for order history
- Progress indicators for multi-step forms

### Transitions
- Slide from right for modal screens
- Fade-in for successful payment
- Slide-up for bottom sheets
- Cross-fade between tab screens

### Micro-interactions
- Button press feedback (0.2s scale animation)
- Success checkmark animation
- Pull-to-refresh on order history
- Card elevation on hover (web)

---

**Notes for Development:**
- Use Expo for cross-platform (iOS, Android, Web)
- Implement responsive design with Flexbox/Grid
- Test all flows on actual devices
- Optimize animations for performance (60fps)
- Ensure accessibility (WCAG 2.1 AA)

---

*Last Updated: August 2026*
*Design System v1.0*
