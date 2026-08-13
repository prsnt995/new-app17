# NamasteMart - Product Requirements Document

**Version:** 1.0  
**Last Updated:** August 2026  
**Status:** In Development  
**Target Platforms:** iOS, Android, Web

---

## 1. Executive Summary

NamasteMart is a cross-border logistics platform that enables seamless shipping of goods from South Korea to India and Nepal. The platform simplifies the process of international shipping by providing an intuitive mobile-first experience, transparent pricing, real-time tracking, and multiple payment options.

**Target Users:** 
- Individuals sending packages from South Korea to family/friends in India/Nepal
- Small businesses exporting products to South Asian markets
- Expats managing international parcels

---

## 2. Problem Statement

- Existing international shipping is complex, with multiple intermediaries and unclear pricing
- No single platform simplifies the end-to-end South Korea to India/Nepal shipping process
- Users need transparent, real-time information about costs, delivery times, and package status
- Limited payment flexibility for international users

---

## 3. Vision & Goals

### Vision
To become the preferred logistics partner for seamless cross-border shipping between South Korea and South Asia.

### Goals (12 months)
- Launch MVP with 1000+ monthly active users
- Achieve 95% on-time delivery rate
- Support 5+ payment methods
- Expand to at least 2 additional South Asian countries
- Maintain 4.5+ app store rating

---

## 4. Scope & MVP Features

### 4.1 Core MVP Features (Phase 1)

#### A. Sender Address (South Korea) - Fixed/Predefined
- **Purpose:** Simplify onboarding by using a fixed collection point
- **Features:**
  - Display pickup/collection point address in South Korea (e.g., major cities like Seoul, Busan)
  - Allow selection of preferred collection location if multiple exist
  - Show collection time slots (e.g., morning, afternoon, evening)
  - Display any size/weight restrictions for collection point

#### B. Recipient Address (India/Nepal) - User Input
- **Purpose:** Capture final delivery destination
- **Features:**
  - Multi-step address form with autocomplete (integrate with Google Maps/local services)
  - Address type: Home, Office, Other
  - Save address for future shipments (Saved Addresses feature)
  - Validate address completeness and deliverability
  - Display service availability by postal code/area
  - Handle areas with/without postal codes

#### C. Product Selection & Catalog
- **Purpose:** Define shipment contents
- **Features:**
  - Add multiple products in single shipment
  - Product input: Category, Description, Quantity, Value (in KRW/INR), HSN Code
  - Quick-add categories: Electronics, Clothing, Home Goods, Cosmetics, Books, Other
  - Weight input per product (grams/kg)
  - Automatic total weight calculation
  - Hazardous goods checker (restrict/warn on prohibited items)
  - Photo upload for valuable items (future enhancement)

#### D. Weight & Dimensions
- **Purpose:** Calculate accurate shipping costs
- **Features:**
  - Total weight calculation
  - Dimension input (L × W × H in cm) - optional for MVP
  - Weight validation (minimum: 250g, maximum: 30kg)
  - Volumetric weight calculation
  - Dimensionless shipment option for standard packages

#### E. Dynamic Pricing Engine
- **Purpose:** Real-time transparent cost calculation
- **Formula:** `Base Rate + (Weight × Weight Rate) + (Distance × Distance Rate) + (Handling Fee) + (Taxes)`
- **Features:**
  - Real-time price quote before payment
  - Breakdown: Weight cost, Distance cost, Service fee, Taxes
  - Price varies by destination country/region
  - Express (1-2 weeks) vs Standard (2-4 weeks) options
  - Display exchange rate used (KRW to INR/NPR)

#### F. Payment Gateway Integration
- **Supported Methods:**
  - Credit/Debit Cards (Visa, Mastercard, American Express)
  - Mobile Wallets: Apple Pay, Google Pay
  - UPI (for India customers)
  - Regional options: Kakao Pay (for Korea), PayTm (India)
  - Stripe/Razorpay integration for multi-region support

#### G. User Authentication & Accounts
- **Features:**
  - Email/phone signup with OTP verification
  - Social login: Google, Apple
  - User profile with KYC verification (optional for MVP)
  - Multiple recipient addresses storage
  - Order history with detailed tracking

#### H. Order Confirmation & Receipt
- **Features:**
  - Order confirmation with tracking ID
  - Digital receipt with itemized breakdown
  - Pickup schedule confirmation
  - Email/SMS notifications

#### I. Real-Time Tracking
- **Features:**
  - Track shipment status: Submitted → Picked Up → In Transit → Out for Delivery → Delivered
  - Estimated delivery date
  - Live map tracking (if available)
  - Status notifications via email/SMS/push
  - Download tracking details

### 4.2 Additional MVP Features

#### A. Saved Addresses
- Store up to 5 recipient addresses
- One-click selection for repeat customers
- Address verification and edit capabilities

#### B. Multiple Shipments in Single Order
- Add multiple packages in one transaction
- Each package can have different destinations or contents
- Combined billing and single checkout
- Batch shipment ID for reference

#### C. Pickup Scheduling
- Select preferred pickup date (next 7 days)
- Time slot selection (morning 8AM-12PM, afternoon 12PM-6PM, evening 6PM-8PM)
- Special instructions for delivery personnel
- SMS/Email reminder before pickup

#### D. Order History
- View all past orders with search/filter
- Reorder previous shipments with one click
- Download invoices and tracking details
- Archive or delete orders

---

## 5. User Journey - MVP Flow

```
Start
  ↓
Login/Signup (Email + OTP or Social)
  ↓
Select/Confirm South Korea Pickup Address
  ↓
Select Collection Time Slot
  ↓
Enter Recipient Address (India/Nepal)
  ↓
Add Products (Multiple)
  ↓
Input Weight
  ↓
Review & Get Real-time Quote
  ↓
Choose Shipping Speed (Express/Standard)
  ↓
Proceed to Payment
  ↓
Select Payment Method (Card, UPI, Wallet)
  ↓
Payment Processing
  ↓
Order Confirmation + Tracking ID
  ↓
Order History & Tracking Dashboard
```

---

## 6. Technical Architecture

### 6.1 Frontend (Current)
- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Routing:** Expo Router
- **UI Components:** @expo/ui, custom components
- **State Management:** TBD (Redux/Context API)
- **Animation:** react-native-reanimated
- **Maps Integration:** react-native-maps (future)

### 6.2 Backend (TBD)
- **API Framework:** Node.js (Express) or Python (FastAPI)
- **Database:** PostgreSQL
- **Authentication:** JWT + OTP service
- **Caching:** Redis
- **File Storage:** AWS S3 / Google Cloud Storage

### 6.3 Third-party Integrations
- **Payments:** Stripe, Razorpay
- **SMS/Email:** Twilio, SendGrid
- **Maps:** Google Maps API
- **Verification:** Aadhar/NID verification APIs (future)
- **Logistics:** Tracking API partners

### 6.4 Data Models (MVP)

**User**
```
- id
- email
- phone
- password_hash
- first_name
- last_name
- profile_picture
- kyc_verified
- created_at
- updated_at
```

**Address**
```
- id
- user_id
- country
- postal_code
- street
- city
- state
- full_address
- address_type (home/office/other)
- is_saved
- is_default
- created_at
```

**Order**
```
- id
- user_id
- tracking_id (unique)
- sender_address (South Korea - fixed)
- recipient_address_id
- status
- shipping_speed
- total_weight
- total_cost
- currency
- payment_status
- payment_method
- created_at
- pickup_date
- pickup_time_slot
- estimated_delivery_date
- actual_delivery_date
```

**OrderItem**
```
- id
- order_id
- product_name
- category
- description
- quantity
- weight
- value
- hsn_code
```

**Payment**
```
- id
- order_id
- user_id
- amount
- currency
- method
- status
- transaction_id
- gateway_response
- created_at
```

---

## 7. Feature Breakdown by Phase

### Phase 1: MVP (Weeks 1-12)
✅ User Authentication  
✅ Address Management (Sender fixed, Recipient input)  
✅ Product Catalog & Selection  
✅ Weight Input & Calculation  
✅ Pricing Engine  
✅ Payment Gateway  
✅ Order Confirmation  
✅ Basic Tracking  
✅ Order History  
✅ Saved Addresses  

### Phase 2: Enhanced Experience (Weeks 13-24)
🔄 Real-time GPS Tracking with Map  
🔄 Multiple Pickup Locations in South Korea  
🔄 Insurance Options  
🔄 Special Handling (Fragile, Temperature-controlled)  
🔄 Estimated Delivery Time Refinement  
🔄 Customer Support Chat/Ticket System  
🔄 Rating & Review System  
🔄 Promo Codes & Discounts  

### Phase 3: Platform Expansion (Weeks 25-52)
🔄 Expand to Thailand, Vietnam, Malaysia  
🔄 Business/B2B Accounts with Bulk Pricing  
🔄 API Integration for Business Partners  
🔄 Advanced Analytics Dashboard  
🔄 KYC Verification Integration  
🔄 Return/Refund Management  
🔄 Customs Documentation Auto-generation  
🔄 Subscription Models (Monthly Discounts)  

---

## 8. Future Features & Roadmap (Beyond MVP)

### Short-term (3-6 months post-launch)
1. **Advanced Tracking**
   - Real-time GPS tracking with live map
   - Proof of Delivery (POD) with photo/signature
   - Delivery attempt notifications

2. **Enhanced Payment Options**
   - Buy now, pay later (BNPL)
   - Bank transfer/Wire transfer
   - Cryptocurrency payments

3. **Customer Support**
   - In-app chat support
   - Ticketing system
   - FAQ & Knowledge base
   - Video call support (premium)

4. **Insurance & Protection**
   - Package insurance (1-5% of order value)
   - Loss/damage claims process
   - Premium protection plans

### Medium-term (6-12 months)
1. **Expansion to More Countries**
   - Thailand, Vietnam, Malaysia, Bangladesh
   - Localized pricing and regulations

2. **Business Features**
   - B2B/Bulk shipping accounts
   - Volume-based discounts
   - API for business integration
   - Automated invoicing and reconciliation

3. **Sustainability**
   - Carbon offset tracking
   - Green shipping options
   - Eco-friendly packaging

4. **Advanced Analytics**
   - Shipment history analytics
   - Spending reports
   - Preferred routes/destinations
   - Cost optimization recommendations

### Long-term (12+ months)
1. **AI & Personalization**
   - ML-based delivery time prediction
   - Smart package recommendations
   - Personalized pricing strategies
   - Chatbot for customer service

2. **Marketplace Integration**
   - Connect with e-commerce platforms (Shopee, Lazada)
   - Direct shipping from online stores
   - Inventory management for sellers

3. **Subscription Services**
   - Monthly subscription (unlimited free shipping + discounts)
   - Tiered membership (Silver, Gold, Platinum)
   - Priority support and special handling

4. **Pickup Partner Network**
   - Partner with local stores for pickup points
   - Multiple collection locations in South Korea
   - Franchise pickup centers

5. **Customs & Regulatory**
   - Automated customs documentation
   - HS code intelligent suggestions
   - Duty calculator
   - Pre-clearance services

6. **White-label Solution**
   - Enable other businesses to use platform
   - Custom branding options
   - Commission-based revenue model

---

## 9. Non-Functional Requirements

### Performance
- App startup time: < 2 seconds
- Page load time: < 1 second
- API response time: < 500ms (p95)
- 99.9% platform uptime

### Security
- End-to-end encryption for payment data
- PCI-DSS compliance
- SSL/TLS for all communications
- Regular security audits
- GDPR/Local data privacy compliance

### Scalability
- Support 100,000+ concurrent users
- Handle 10,000+ transactions per day
- Auto-scaling infrastructure
- CDN for global content delivery

### Accessibility
- WCAG 2.1 Level AA compliance
- Support for multiple languages (English, Korean, Hindi, Nepali)
- Offline mode for basic features
- Text-to-speech support

---

## 10. Success Metrics & KPIs

### User Metrics
- Monthly Active Users (MAU)
- User Acquisition Cost (UAC)
- Customer Lifetime Value (CLV)
- Churn Rate
- Net Promoter Score (NPS)

### Business Metrics
- Total Shipments per Month
- Average Order Value (AOV)
- Revenue per User
- Gross Margin
- Customer Retention Rate

### Operational Metrics
- On-time Delivery Rate (target: 95%+)
- Successful Payment Rate (target: 98%+)
- Average Delivery Time
- Customer Support Response Time (target: < 2 hours)
- Order Cancellation Rate (target: < 2%)

### Quality Metrics
- App Store Rating (target: 4.5+)
- Bug Report Rate
- Performance Metrics (Load time, crashes)
- User Satisfaction Score

---

## 11. Monetization Strategy

### Phase 1 (MVP): Commission-based
- **Revenue Model:** Take 15-20% commission on shipping charges
- Transparent pricing: Customers see full breakdown
- No hidden fees

### Phase 2: Multiple Revenue Streams
- Insurance products (5-8% markup)
- Premium features (subscription)
- Advertising to logistics partners

### Phase 3: Diversified Revenue
- B2B API licensing
- White-label solution licensing
- Partnership commissions
- Data/Analytics services (anonymized)

---

## 12. Risk Analysis & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|-----------|
| Regulatory changes in shipping laws | High | Medium | Regular legal compliance reviews; partnerships with local experts |
| Payment gateway failures | High | Low | Redundant payment processors; fallback systems |
| Delivery partner reliability | High | Medium | Diversify logistics partners; performance contracts |
| Currency fluctuations | Medium | High | Daily rate updates; dynamic pricing model |
| High customer churn | High | Medium | Excellent support; loyalty programs; regular feature updates |
| Data breaches | High | Low | Robust security; regular audits; insurance |
| Market competition | Medium | High | First-mover advantage; strong UX; local partnerships |

---

## 13. Timeline & Milestones

### Q3 2026 (Immediate - 12 weeks)
- ✅ Core MVP development
- ✅ Payment integration
- ✅ Tracking system
- ✅ Alpha testing with closed users
- **Milestone:** MVP Ready for Beta

### Q4 2026 (12-24 weeks)
- Beta launch in India/Nepal
- User feedback iteration
- Performance optimization
- **Milestone:** Public App Store Launch

### Q1 2027 (24-36 weeks)
- Scale infrastructure
- Add Phase 2 features
- Expand support channels
- **Milestone:** 10,000 MAU

### Q2 2027 (36-52 weeks)
- Multi-country expansion
- Business features launch
- Advanced analytics
- **Milestone:** 50,000 MAU & Profitability

---

## 14. Resource Requirements

### Engineering Team
- 2 Full-stack engineers (React Native + Backend)
- 1 Backend engineer (APIs, Databases)
- 1 QA engineer
- 1 DevOps engineer (part-time)

### Design & Product
- 1 Product Manager
- 1 UI/UX Designer
- 1 Content Writer

### Operations
- 1 Business Development Manager
- 1 Customer Support Lead (+ contractors as needed)
- 1 Data Analyst (part-time)

### Initial Budget Estimate
- Development: $150,000 - $200,000
- Infrastructure & Tools: $10,000/month
- Marketing: $50,000 - $100,000
- Operations: $30,000/month

---

## 15. Appendix

### A. Glossary
- **HSN Code:** Harmonized System of Nomenclature - international product classification
- **KYC:** Know Your Customer - identity verification
- **UPI:** Unified Payments Interface - Indian digital payment system
- **OTP:** One-Time Password for verification
- **POD:** Proof of Delivery

### B. Similar Competitors
- Sendswift, SendCaller (Asia focus)
- easypost (Global APIs)
- Wise (Currency transfer)

### C. Technology Stack Details

**Frontend Stack:**
```
React Native 0.86.2
Expo 57.0
Expo Router (Navigation)
React 19.2.3
TypeScript 6.0.3
react-native-reanimated (Animations)
react-native-gesture-handler (Gestures)
```

**State Management (Proposed):**
- Redux Toolkit or Zustand
- Async Thunk for side effects
- Redux Persist for offline support

**Testing:**
- Jest + React Native Testing Library (Frontend)
- Jest + Supertest (Backend)
- E2E: Detox (React Native) or Cypress (Web)

### D. Development Setup Instructions (Future)
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed setup
- Docker setup for local development
- Git workflow and branch strategy

---

## 16. Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | TBD | - | - |
| Engineering Lead | TBD | - | - |
| Executive Sponsor | TBD | - | - |

---

**Document Owner:** Product Team  
**Last Review:** August 2026  
**Next Review Date:** October 2026

---
