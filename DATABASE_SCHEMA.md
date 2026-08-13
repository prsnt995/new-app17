# NamasteMart - Database Schema & ERD

**Version:** 1.0  
**Last Updated:** August 2026  
**Database:** PostgreSQL 14+  
**ORM:** Prisma or TypeORM

---

## Table of Contents

1. [Entity Relationship Diagram](#entity-relationship-diagram)
2. [Database Tables](#database-tables)
3. [Schema SQL](#schema-sql)
4. [Indexes & Performance](#indexes--performance)
5. [Data Relationships](#data-relationships)
6. [Constraints & Validations](#constraints--validations)

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│      USERS          │
├─────────────────────┤
│ id (PK)             │
│ email (UNIQUE)      │
│ phone               │
│ first_name          │
│ last_name           │
│ password_hash       │
│ profile_picture_url │
│ kyc_verified        │
│ kyc_document_url    │
│ created_at          │
│ updated_at          │
│ deleted_at          │
└────────┬────────────┘
         │
         │ 1:N
         │
    ┌────┴──────────────────┬────────────────────┐
    │                       │                    │
    │                       │                    │
┌───┴──────────┐  ┌────────┴────────┐  ┌───────┴────────┐
│  ADDRESSES   │  │  ORDERS         │  │ PAYMENT_METHODS│
├──────────────┤  ├─────────────────┤  ├─────────────────┤
│ id (PK)      │  │ id (PK)         │  │ id (PK)        │
│ user_id (FK) │  │ user_id (FK)    │  │ user_id (FK)   │
│ country      │  │ shipment_id (FK)│  │ type           │
│ street       │  │ tracking_id     │  │ card_last4     │
│ city         │  │ status          │  │ brand          │
│ state        │  │ total_amount    │  │ expiry_month   │
│ postal_code  │  │ currency        │  │ expiry_year    │
│ address_type │  │ payment_status  │  │ upi_id         │
│ is_saved     │  │ created_at      │  │ is_default     │
│ is_default   │  │ updated_at      │  │ created_at     │
│ recipient_name
│ phone        │  └────────┬────────┘  └─────────────────┘
│ created_at   │           │
│ updated_at   │           │ 1:N
│ deleted_at   │           │
└──────────────┘      ┌─────┴──────────────┐
                      │                    │
                  ┌───┴────────┐  ┌────────┴────────┐
                  │ SHIPMENTS  │  │ PAYMENTS       │
                  ├────────────┤  ├─────────────────┤
                  │ id (PK)    │  │ id (PK)         │
                  │ user_id(FK)│  │ order_id (FK)   │
                  │ tracking_id│  │ user_id (FK)    │
                  │ origin_hub │  │ amount          │
                  │ destination│  │ currency        │
                  │ status     │  │ method          │
                  │ weight     │  │ status          │
                  │ total_cost │  │ transaction_id  │
                  │ pickup_date│  │ gateway_response
                  │ pickup_slot│  │ created_at      │
                  │ est_delivery
                  │ actual_del │  └─────────────────┘
                  │ created_at │
                  │ updated_at │
                  └────────┬───┘
                           │
                           │ 1:N
                           │
                  ┌────────┴────────────┐
                  │   ORDER_ITEMS      │
                  ├────────────────────┤
                  │ id (PK)            │
                  │ shipment_id (FK)   │
                  │ product_name       │
                  │ category           │
                  │ description        │
                  │ quantity           │
                  │ weight             │
                  │ value              │
                  │ currency           │
                  │ hs_code            │
                  │ created_at         │
                  └────────────────────┘

┌──────────────────┐
│ TRACKING_LOGS    │
├──────────────────┤
│ id (PK)          │
│ shipment_id (FK) │
│ status           │
│ location         │
│ latitude         │
│ longitude        │
│ description      │
│ timestamp        │
│ created_at       │
└──────────────────┘

┌──────────────────┐
│ PROMO_CODES      │
├──────────────────┤
│ id (PK)          │
│ code             │
│ discount_type    │
│ discount_value   │
│ valid_from       │
│ valid_until      │
│ usage_limit      │
│ used_count       │
│ is_active        │
│ created_at       │
└──────────────────┘
```

---

## Database Tables

### 1. USERS
Stores user account information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_country_code VARCHAR(5),
  phone VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  
  -- KYC Verification
  kyc_verified BOOLEAN DEFAULT FALSE,
  kyc_document_url TEXT,
  kyc_verification_date TIMESTAMP,
  
  -- Account Status
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_created_at (created_at)
);
```

**Fields:**
- `id`: Unique identifier (UUID)
- `email`: User email (unique, required)
- `phone_country_code`: Country code (e.g., +82, +91)
- `phone`: Phone number
- `first_name`, `last_name`: User name
- `password_hash`: Bcrypt hashed password
- `profile_picture_url`: S3/CDN URL
- `kyc_verified`: KYC status
- `is_active`: Account status
- `last_login_at`: Last login timestamp

---

### 2. ADDRESSES
Stores delivery addresses for users.

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Address Details
  country VARCHAR(100) NOT NULL,
  street VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20) NOT NULL,
  
  -- Recipient Info
  recipient_name VARCHAR(255) NOT NULL,
  phone_country_code VARCHAR(5),
  phone VARCHAR(20) NOT NULL,
  
  -- Address Type
  address_type ENUM('home', 'office', 'other') DEFAULT 'home',
  
  -- Address Management
  is_saved BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_country (country),
  INDEX idx_postal_code (postal_code),
  UNIQUE KEY unique_default_address (user_id, is_default) WHERE is_default = TRUE
);
```

**Fields:**
- `id`: Unique identifier
- `user_id`: Foreign key to USERS
- `country`: Delivery country (India/Nepal)
- `street`, `city`, `state`, `postal_code`: Address components
- `recipient_name`: Recipient's full name
- `phone`: Recipient's phone number
- `address_type`: Home/Office/Other
- `is_saved`: Whether address is saved for future use
- `is_default`: Default address for this user

---

### 3. SHIPMENTS
Stores shipment/order information.

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_address_id UUID NOT NULL REFERENCES addresses(id),
  
  -- Tracking
  tracking_id VARCHAR(50) UNIQUE NOT NULL,
  
  -- Pickup Details
  origin_hub VARCHAR(100) NOT NULL,
  origin_country VARCHAR(50) DEFAULT 'South Korea',
  pickup_date DATE NOT NULL,
  pickup_time_slot ENUM('morning', 'afternoon', 'evening') NOT NULL,
  
  -- Shipment Details
  total_weight DECIMAL(5,2) NOT NULL,
  total_volume_weight DECIMAL(5,2),
  shipping_speed ENUM('express', 'standard') NOT NULL,
  
  -- Status & Timeline
  status ENUM(
    'draft',
    'submitted',
    'confirmed',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'cancelled'
  ) DEFAULT 'draft',
  
  pickup_datetime TIMESTAMP,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Cost
  total_cost DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  
  -- Special Instructions
  special_instructions TEXT,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_tracking_id (tracking_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_pickup_date (pickup_date),
  INDEX idx_estimated_delivery (estimated_delivery_date)
);
```

---

### 4. ORDER_ITEMS
Stores individual products in a shipment.

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  
  -- Product Details
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Quantity & Weight
  quantity INTEGER NOT NULL DEFAULT 1,
  weight DECIMAL(5,2) NOT NULL,
  
  -- Valuation
  item_value DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'KRW',
  
  -- Customs
  hs_code VARCHAR(12),
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_shipment_id (shipment_id),
  INDEX idx_category (category)
);
```

---

### 5. PAYMENT_METHODS
Stores user payment methods.

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Payment Type
  type ENUM('card', 'upi', 'wallet') NOT NULL,
  
  -- Card Details (encrypted)
  card_number_encrypted VARCHAR(255),
  card_last4 VARCHAR(4),
  card_brand VARCHAR(50),
  expiry_month INTEGER,
  expiry_year INTEGER,
  cardholder_name VARCHAR(255),
  
  -- UPI Details
  upi_id VARCHAR(255),
  
  -- Wallet Details
  wallet_provider VARCHAR(50),
  wallet_account_id VARCHAR(255),
  
  -- Management
  is_default BOOLEAN DEFAULT FALSE,
  gateway_customer_id VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  UNIQUE KEY unique_default_payment (user_id, is_default) WHERE is_default = TRUE
);
```

---

### 6. ORDERS
Represents a completed shipment order.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  
  -- Tracking
  tracking_id VARCHAR(50) UNIQUE NOT NULL,
  
  -- Order Status
  status ENUM(
    'pending_payment',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  ) DEFAULT 'pending_payment',
  
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  
  -- Amount
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_tracking_id (tracking_id),
  INDEX idx_status (status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_created_at (created_at)
);
```

---

### 7. PAYMENTS
Stores payment transaction records.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES payment_methods(id),
  
  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  
  -- Status
  status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  
  -- Gateway Details
  transaction_id VARCHAR(255) UNIQUE,
  gateway_name VARCHAR(50),
  gateway_response JSONB,
  
  -- Timestamps
  initiated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

---

### 8. TRACKING_LOGS
Stores real-time tracking location updates.

```sql
CREATE TABLE tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(50) NOT NULL,
  
  -- Location
  location_description VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metadata
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_shipment_id (shipment_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

---

### 9. PROMO_CODES
Stores promotional/discount codes.

```sql
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Code
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Discount
  discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage',
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount_amount DECIMAL(10,2),
  
  -- Validity
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  
  -- Usage Limits
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  usage_per_user INTEGER DEFAULT 1,
  
  -- Conditions
  min_order_value DECIMAL(10,2),
  applicable_countries VARCHAR(500),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_code (code),
  INDEX idx_is_active (is_active),
  INDEX idx_valid_until (valid_until)
);
```

---

### 10. USER_PROMO_CODE_USAGE
Tracks which users have used which promo codes.

```sql
CREATE TABLE user_promo_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  
  -- Usage Details
  discount_applied DECIMAL(10,2),
  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_promo_code_id (promo_code_id),
  INDEX idx_order_id (order_id),
  UNIQUE KEY unique_usage (user_id, order_id)
);
```

---

### 11. AUDIT_LOG
Tracks all important actions for compliance.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action Details
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_entity_id (entity_id),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
);
```

---

## Schema SQL

### Create All Tables
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'support', 'user');
CREATE TYPE address_type_enum AS ENUM ('home', 'office', 'other');
CREATE TYPE shipment_status AS ENUM (
  'draft', 'submitted', 'confirmed', 'picked_up', 
  'in_transit', 'out_for_delivery', 'delivered', 'cancelled'
);
CREATE TYPE shipping_speed_enum AS ENUM ('express', 'standard');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method_type AS ENUM ('card', 'upi', 'wallet');
CREATE TYPE discount_type_enum AS ENUM ('percentage', 'fixed');

-- [Insert table creation statements here]
-- See individual table definitions above
```

---

## Indexes & Performance

### Critical Indexes
```sql
-- User queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Address lookups
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_country ON addresses(country);
CREATE INDEX idx_addresses_postal_code ON addresses(postal_code);

-- Shipment queries
CREATE INDEX idx_shipments_user_id ON shipments(user_id);
CREATE INDEX idx_shipments_tracking_id ON shipments(tracking_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_created_at ON shipments(created_at);

-- Payment queries
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Tracking queries
CREATE INDEX idx_tracking_logs_shipment_id ON tracking_logs(shipment_id);
CREATE INDEX idx_tracking_logs_created_at ON tracking_logs(created_at);
```

### Query Optimization
```sql
-- For dashboard queries
CREATE INDEX idx_shipments_user_status_date ON shipments(user_id, status, created_at);

-- For tracking searches
CREATE INDEX idx_shipments_tracking_status ON shipments(tracking_id, status);

-- For analytics
CREATE INDEX idx_payments_created_at_status ON payments(created_at, status);
```

---

## Data Relationships

### Key Relationships

1. **USERS → ADDRESSES** (1:N)
   - One user can have multiple addresses
   - Addresses are linked to users via `user_id`
   - Cascade delete addresses when user is deleted

2. **USERS → SHIPMENTS** (1:N)
   - One user creates multiple shipments
   - Each shipment belongs to one user

3. **SHIPMENTS → ORDER_ITEMS** (1:N)
   - One shipment contains multiple items
   - Items are deleted when shipment is deleted

4. **ORDERS ← SHIPMENTS** (1:1)
   - Each shipment becomes one order after payment
   - One-to-one relationship

5. **ORDERS → PAYMENTS** (1:N)
   - One order can have multiple payment attempts
   - Track retry attempts and failures

6. **USERS → PAYMENT_METHODS** (1:N)
   - One user can have multiple payment methods
   - At most one default payment method per user

7. **SHIPMENTS → TRACKING_LOGS** (1:N)
   - One shipment has many tracking updates
   - Latest update shows current status

---

## Constraints & Validations

### Business Rules

1. **Weight Constraints**
   ```sql
   ALTER TABLE shipments
   ADD CONSTRAINT check_weight_range
   CHECK (total_weight >= 0.25 AND total_weight <= 30);
   ```

2. **Postal Code Validation**
   ```sql
   ALTER TABLE addresses
   ADD CONSTRAINT check_postal_code_format
   CHECK (postal_code ~ '^\d{3,10}$');
   ```

3. **Default Address Uniqueness**
   ```sql
   CREATE UNIQUE INDEX idx_unique_default_address
   ON addresses(user_id) WHERE is_default = TRUE;
   ```

4. **Date Constraints**
   ```sql
   ALTER TABLE shipments
   ADD CONSTRAINT check_pickup_before_delivery
   CHECK (pickup_date <= estimated_delivery_date);
   ```

5. **Cost Constraints**
   ```sql
   ALTER TABLE shipments
   ADD CONSTRAINT check_positive_cost
   CHECK (total_cost > 0);
   ```

### Foreign Key Constraints
```sql
ALTER TABLE addresses
ADD CONSTRAINT fk_addresses_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE shipments
ADD CONSTRAINT fk_shipments_user_id
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE shipments
ADD CONSTRAINT fk_shipments_recipient_address_id
FOREIGN KEY (recipient_address_id) REFERENCES addresses(id);
```

---

## Migration Strategy (Prisma)

### Initial Setup
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  phone             String?
  firstName          String
  lastName           String
  passwordHash      String
  profilePictureUrl String?
  kycVerified       Boolean   @default(false)
  
  addresses         Address[]
  shipments         Shipment[]
  orders            Order[]
  paymentMethods    PaymentMethod[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
  
  @@index([email])
  @@index([createdAt])
}

// ... other models
```

### Run Migrations
```bash
# Create migration
npx prisma migrate dev --name initial_schema

# Apply migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

---

## Backup & Recovery

### Backup Strategy
```bash
# Daily automated backups
pg_dump -U postgres -h localhost namastemart > backup_$(date +%Y%m%d).sql

# Point-in-time recovery
pg_basebackup -D /var/lib/postgresql/backup -Fp -Xs
```

### Recovery Process
```bash
# Restore from backup
psql -U postgres -h localhost namastemart < backup_20260814.sql

# Verify integrity
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM shipments;
```

---

**Database Design Guidelines:**
- Use UUID for all primary keys (not auto-increment)
- Always include `created_at`, `updated_at`, `deleted_at`
- Use JSONB for flexible metadata storage
- Enable row-level security (RLS) for multi-tenancy
- Regular VACUUM and ANALYZE for performance

---

*Last Updated: August 2026*
*Schema Version: 1.0*
