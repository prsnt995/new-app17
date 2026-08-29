# NamasteMart - API Specification

**Version:** 1.0  
**Last Updated:** August 2026  
**Base URL:** `https://api.namastemart.com/v1` (Production)  
**Status Codes:** Standard HTTP (200, 201, 400, 401, 404, 500)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Common Patterns](#common-patterns)
3. [Authentication Endpoints](#authentication-endpoints)
4. [User Endpoints](#user-endpoints)
5. [Address Endpoints](#address-endpoints)
6. [Shipment Endpoints](#shipment-endpoints)
7. [Order Endpoints](#order-endpoints)
8. [Payment Endpoints](#payment-endpoints)
9. [Tracking Endpoints](#tracking-endpoints)
10. [Error Handling](#error-handling)

---

## Authentication

### Bearer Token
All authenticated endpoints require an `Authorization` header:
```
Authorization: Bearer <access_token>
```

### Token Refresh
Tokens expire after 24 hours. Use refresh token to get new access token.

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_value"
}
```

**Response:**
```json
{
  "accessToken": "new_access_token",
  "expiresIn": 86400
}
```

---

## Common Patterns

### Request Format
```http
Method /v1/resource HTTP/1.1
Host: api.namastemart.com
Content-Type: application/json
Authorization: Bearer <token>

{
  "data": "value"
}
```

### Response Format
All responses follow this structure:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2026-08-14T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2026-08-14T10:30:00Z"
}
```

### Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 45,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Authentication Endpoints

### 1. User Signup
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "phoneCountryCode": "+82",
  "phone": "1012345678",
  "firstName": "Parshant",
  "lastName": "tanwar",
  "password": "SecurePassword123!"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "accessToken": "token",
    "refreshToken": "refresh_token",
    "expiresIn": 86400
  }
}
```

### 2. Request OTP
```http
POST /auth/request-otp
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "otpSent": true,
    "expiresIn": 600
  },
  "message": "OTP sent to email"
}
```

### 3. Verify OTP
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "token",
    "refreshToken": "refresh_token",
    "expiresIn": 86400
  }
}
```

### 4. Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "accessToken": "token",
    "refreshToken": "refresh_token",
    "expiresIn": 86400
  }
}
```

### 5. Social Login
```http
POST /auth/social-login
Content-Type: application/json

{
  "provider": "google",
  "idToken": "google_id_token_value"
}
```

**Response:** `200 OK` or `201 Created`
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "accessToken": "token",
    "refreshToken": "refresh_token",
    "isNewUser": true
  }
}
```

### 6. Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## User Endpoints

### 1. Get User Profile
```http
GET /users/me
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "phone": "+821012345678",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": "https://...",
    "kycVerified": false,
    "createdAt": "2026-08-01T10:00:00Z",
    "updatedAt": "2026-08-14T10:00:00Z"
  }
}
```

### 2. Update User Profile
```http
PUT /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jonathan",
  "lastName": "Smith",
  "phone": "+821087654321"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "firstName": "Jonathan",
    "lastName": "Smith",
    "phone": "+821087654321",
    "updatedAt": "2026-08-14T10:30:00Z"
  }
}
```

### 3. Change Password
```http
POST /users/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 4. Upload Profile Picture
```http
POST /users/profile-picture
Authorization: Bearer <token>
Content-Type: multipart/form-data

[binary image data]
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "profilePicture": "https://cdn.namastemart.com/users/user-uuid/profile.jpg"
  }
}
```

---

## Address Endpoints

### 1. Create Address
```http
POST /addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "country": "India",
  "addressType": "home",
  "recipientName": "Rajesh Kumar",
  "street": "123 Main Street",
  "city": "New Delhi",
  "state": "Delhi",
  "postalCode": "110001",
  "phoneCountryCode": "+91",
  "phone": "9876543210",
  "isSaved": true,
  "isDefault": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "addressId": "address-uuid",
    "userId": "user-uuid",
    "country": "India",
    "addressType": "home",
    "recipientName": "Rajesh Kumar",
    "fullAddress": "123 Main Street, New Delhi, Delhi 110001, India",
    "isSaved": true,
    "isDefault": true,
    "createdAt": "2026-08-14T10:30:00Z"
  }
}
```

### 2. Get Addresses
```http
GET /addresses?page=1&pageSize=10&country=India
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "addressId": "address-uuid-1",
      "country": "India",
      "addressType": "home",
      "recipientName": "Rajesh Kumar",
      "fullAddress": "123 Main Street, New Delhi, Delhi 110001, India",
      "isSaved": true,
      "isDefault": true
    },
    {
      "addressId": "address-uuid-2",
      "country": "Nepal",
      "addressType": "office",
      "recipientName": "Akshay Singh",
      "fullAddress": "456 Business Ave, Kathmandu, Nepal",
      "isSaved": true,
      "isDefault": false
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

### 3. Update Address
```http
PUT /addresses/{addressId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientName": "Rajesh Kumar Singh",
  "phone": "9876543211"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "addressId": "address-uuid",
    "recipientName": "Rajesh Kumar Singh",
    "phone": "9876543211",
    "updatedAt": "2026-08-14T10:35:00Z"
  }
}
```

### 4. Delete Address
```http
DELETE /addresses/{addressId}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

### 5. Validate Address
```http
POST /addresses/validate
Content-Type: application/json

{
  "country": "India",
  "postalCode": "110001",
  "city": "New Delhi"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "deliveryAvailable": true,
    "estimatedDeliveryDays": 5
  }
}
```

---

## Shipment Endpoints

### 1. Create Shipment (Multi-step)
```http
POST /shipments
Authorization: Bearer <token>
Content-Type: application/json

{
  "senderAddress": {
    "country": "South Korea",
    "pickupHub": "busan-hub",
    "pickupDate": "2026-08-15",
    "pickupTimeSlot": "afternoon"
  },
  "recipientAddressId": "address-uuid",
  "items": [
    {
      "productName": "iPhone 15 Pro",
      "category": "electronics",
      "description": "Latest Apple iPhone",
      "quantity": 1,
      "weight": 0.2,
      "value": 1200000,
      "currency": "KRW",
      "hsCode": "8517.62.20"
    },
    {
      "productName": "Winter Jacket",
      "category": "clothing",
      "description": "Cotton winter jacket",
      "quantity": 2,
      "weight": 0.6,
      "value": 150000,
      "currency": "KRW",
      "hsCode": "6203.49.20"
    }
  ],
  "totalWeight": 2.5,
  "shippingSpeed": "express",
  "specialInstructions": "Ring bell twice"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "shipmentId": "shipment-uuid",
    "trackingId": "NM20260814001",
    "status": "draft",
    "totalWeight": 2.5,
    "shippingSpeed": "express",
    "estimatedDelivery": "2026-08-21",
    "quote": {
      "baseCost": 500,
      "weightCharge": 375,
      "distanceCharge": 300,
      "handlingFee": 100,
      "taxes": 108,
      "totalCost": 1383,
      "currency": "INR",
      "exchangeRate": 0.062
    },
    "createdAt": "2026-08-14T10:30:00Z"
  }
}
```

### 2. Get Shipment
```http
GET /shipments/{shipmentId}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "shipmentId": "shipment-uuid",
    "trackingId": "NM20260814001",
    "userId": "user-uuid",
    "status": "picked_up",
    "senderAddress": {
      "country": "South Korea",
      "hub": "Busan Hub",
      "address": "456 Seo-gu, Busan"
    },
    "recipientAddress": {
      "country": "India",
      "recipientName": "Rajesh Kumar",
      "address": "123 Main Street, New Delhi, Delhi 110001"
    },
    "items": [...],
    "totalWeight": 2.5,
    "shippingSpeed": "express",
    "estimatedDelivery": "2026-08-21",
    "actualDelivery": null,
    "statusTimeline": [
      {
        "status": "submitted",
        "timestamp": "2026-08-14T10:30:00Z"
      },
      {
        "status": "picked_up",
        "timestamp": "2026-08-14T15:45:00Z"
      }
    ]
  }
}
```

### 3. List Shipments
```http
GET /shipments?page=1&pageSize=10&status=in_transit&country=India
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "shipmentId": "shipment-uuid-1",
      "trackingId": "NM20260814001",
      "status": "in_transit",
      "totalWeight": 2.5,
      "totalCost": 1383,
      "currency": "INR",
      "estimatedDelivery": "2026-08-21"
    },
    {
      "shipmentId": "shipment-uuid-2",
      "trackingId": "NM20260810002",
      "status": "delivered",
      "totalWeight": 1.8,
      "totalCost": 980,
      "currency": "INR",
      "actualDelivery": "2026-08-12"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 45
  }
}
```

### 4. Update Shipment
```http
PUT /shipments/{shipmentId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientAddressId": "address-uuid-new",
  "specialInstructions": "Updated instructions"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "shipmentId": "shipment-uuid",
    "recipientAddressId": "address-uuid-new",
    "specialInstructions": "Updated instructions",
    "updatedAt": "2026-08-14T10:45:00Z"
  }
}
```

### 5. Cancel Shipment
```http
POST /shipments/{shipmentId}/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Changed my mind"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "shipmentId": "shipment-uuid",
    "status": "cancelled",
    "cancellationReason": "Changed my mind",
    "refundAmount": 1383,
    "refundCurrency": "INR",
    "cancelledAt": "2026-08-14T10:50:00Z"
  }
}
```

---

## Order Endpoints

### 1. Create Order (From Shipment)
```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "shipmentId": "shipment-uuid",
  "paymentMethodId": "payment-method-uuid"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "trackingId": "NM20260814001",
    "shipmentId": "shipment-uuid",
    "status": "pending_payment",
    "totalAmount": 1383,
    "currency": "INR",
    "paymentStatus": "pending",
    "createdAt": "2026-08-14T10:30:00Z"
  }
}
```

### 2. Get Order
```http
GET /orders/{orderId}
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "trackingId": "NM20260814001",
    "status": "confirmed",
    "totalAmount": 1383,
    "currency": "INR",
    "paymentStatus": "paid",
    "shipmentDetails": {...},
    "timeline": [
      {
        "event": "Order Created",
        "timestamp": "2026-08-14T10:30:00Z"
      },
      {
        "event": "Payment Received",
        "timestamp": "2026-08-14T10:35:00Z"
      },
      {
        "event": "Picked Up",
        "timestamp": "2026-08-14T15:45:00Z"
      }
    ]
  }
}
```

### 3. List Orders
```http
GET /orders?page=1&pageSize=10&status=confirmed
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "orderId": "order-uuid-1",
      "trackingId": "NM20260814001",
      "status": "confirmed",
      "totalAmount": 1383,
      "currency": "INR",
      "createdAt": "2026-08-14T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 25
  }
}
```

### 4. Get Order Receipt
```http
GET /orders/{orderId}/receipt
Authorization: Bearer <token>
Accept: application/pdf
```

**Response:** `200 OK` (PDF file)

---

## Payment Endpoints

### 1. Get Payment Quote
```http
GET /payments/quote?shipmentId=shipment-uuid
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "shipmentId": "shipment-uuid",
    "baseCost": 500,
    "weightCharge": 375,
    "distanceCharge": 300,
    "handlingFee": 100,
    "subtotal": 1275,
    "taxes": 108,
    "totalCost": 1383,
    "currency": "INR",
    "exchangeRate": 0.062,
    "updatedAt": "2026-08-14T10:30:00Z"
  }
}
```

### 2. Initiate Payment
```http
POST /payments/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order-uuid",
  "amount": 1383,
  "currency": "INR",
  "paymentMethod": "upi",
  "metadata": {
    "trackingId": "NM20260814001"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "transactionId": "txn-uuid",
    "orderId": "order-uuid",
    "amount": 1383,
    "currency": "INR",
    "status": "pending",
    "paymentUrl": "https://payment.namastemart.com/pay/txn-uuid",
    "expiresAt": "2026-08-14T10:40:00Z"
  }
}
```

### 3. Verify Payment
```http
POST /payments/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionId": "txn-uuid",
  "paymentGatewayId": "razorpay_payment_id"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "transactionId": "txn-uuid",
    "orderId": "order-uuid",
    "status": "completed",
    "amount": 1383,
    "currency": "INR",
    "confirmedAt": "2026-08-14T10:35:00Z"
  }
}
```

### 4. Get Payment Methods
```http
GET /payments/methods
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "paymentMethodId": "pm-uuid-1",
      "type": "card",
      "last4": "4242",
      "brand": "visa",
      "isDefault": true,
      "expiryMonth": 12,
      "expiryYear": 2027
    },
    {
      "paymentMethodId": "pm-uuid-2",
      "type": "upi",
      "upiId": "user@googlepay",
      "isDefault": false
    }
  ]
}
```

### 5. Add Payment Method
```http
POST /payments/methods
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "card",
  "cardNumber": "4242424242424242",
  "expiryMonth": 12,
  "expiryYear": 2027,
  "cvv": "123",
  "cardholderName": "John Doe",
  "isDefault": false
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "paymentMethodId": "pm-uuid",
    "type": "card",
    "last4": "4242",
    "brand": "visa",
    "createdAt": "2026-08-14T10:30:00Z"
  }
}
```

---

## Tracking Endpoints

### 1. Get Real-time Tracking
```http
GET /tracking/{trackingId}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "trackingId": "NM20260814001",
    "shipmentId": "shipment-uuid",
    "status": "in_transit",
    "currentLocation": {
      "latitude": 32.5,
      "longitude": 125.3,
      "description": "Over East China Sea",
      "updatedAt": "2026-08-16T12:00:00Z"
    },
    "route": {
      "origin": "Busan, South Korea",
      "destination": "Delhi, India",
      "waypoints": [
        "Busan Port",
        "East China Sea",
        "Mumbai Port"
      ]
    },
    "timeline": [
      {
        "status": "submitted",
        "timestamp": "2026-08-14T10:30:00Z",
        "location": "Seoul, South Korea"
      },
      {
        "status": "picked_up",
        "timestamp": "2026-08-14T15:45:00Z",
        "location": "Busan Hub, South Korea"
      },
      {
        "status": "in_transit",
        "timestamp": "2026-08-15T09:00:00Z",
        "location": "Busan Port, South Korea"
      },
      {
        "status": "in_transit",
        "timestamp": "2026-08-16T12:00:00Z",
        "location": "East China Sea"
      }
    ],
    "estimatedDelivery": "2026-08-21",
    "nextUpdate": "2026-08-16T14:00:00Z"
  }
}
```

### 2. Track by Tracking ID (Public)
```http
GET /tracking/{trackingId}
Content-Type: application/json

Query: No authentication required
```

**Response:** `200 OK` (Limited data)
```json
{
  "success": true,
  "data": {
    "trackingId": "NM20260814001",
    "status": "in_transit",
    "currentLocation": "East China Sea",
    "estimatedDelivery": "2026-08-21",
    "lastUpdate": "2026-08-16T12:00:00Z"
  }
}
```

### 3. Get Tracking History
```http
GET /tracking/{trackingId}/history
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-08-14T10:30:00Z",
      "status": "submitted",
      "location": "Seoul, South Korea",
      "details": "Shipment submitted"
    },
    {
      "timestamp": "2026-08-14T15:45:00Z",
      "status": "picked_up",
      "location": "Busan Hub, South Korea",
      "details": "Package picked up from Busan Hub"
    }
  ]
}
```

### 4. Subscribe to Tracking Updates (WebSocket)
```
Connection: ws://api.namastemart.com/tracking/{trackingId}?token=<access_token>
```

**Message Format:**
```json
{
  "type": "status_update",
  "data": {
    "trackingId": "NM20260814001",
    "status": "in_transit",
    "location": "Mumbai Port, India",
    "timestamp": "2026-08-17T06:30:00Z"
  }
}
```

---

## Error Handling

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | User lacks permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT` | 429 | Rate limit exceeded |
| `SERVER_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Example Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "weight",
        "message": "Weight must be between 0.25 and 30 kg"
      },
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2026-08-14T10:30:00Z"
}
```

### Rate Limiting
- **Limit:** 1000 requests per hour per user
- **Header:** `X-RateLimit-Remaining: 999`
- **Retry After:** `Retry-After: 60` (seconds)

---

## Data Types & Formats

### DateTime
```
Format: ISO 8601
Example: "2026-08-14T10:30:00Z"
```

### Currency
```
{
  "amount": 1383,
  "currency": "INR"
}
```

### Address
```json
{
  "country": "India",
  "street": "123 Main Street",
  "city": "New Delhi",
  "state": "Delhi",
  "postalCode": "110001"
}
```

### Shipment Status
```
pending → picked_up → in_transit → out_for_delivery → delivered
          cancelled (at any point before delivery)
```

---

## Webhooks (Future Enhancement)

### Supported Events
- `shipment.created`
- `shipment.picked_up`
- `shipment.in_transit`
- `shipment.delivered`
- `shipment.cancelled`
- `payment.completed`
- `payment.failed`

### Webhook Format
```json
{
  "id": "webhook-id",
  "event": "shipment.picked_up",
  "data": {
    "shipmentId": "shipment-uuid",
    "trackingId": "NM20260814001",
    "timestamp": "2026-08-14T15:45:00Z"
  },
  "timestamp": "2026-08-14T15:45:05Z"
}
```

---

## Rate Limits & Quotas

| Endpoint | Limit |
|----------|-------|
| `/auth/*` | 5 requests/minute |
| `/shipments` | 100 requests/hour |
| `/tracking/*` | 1000 requests/hour |
| `/payments/*` | 50 requests/hour |
| Upload endpoints | 10 MB max file size |

---

## Sandbox/Testing

### Sandbox URLs
- **Base:** `https://sandbox-api.namastemart.com/v1`
- **Payment Gateway:** Use test cards

### Test Payment Cards
```
Visa: 4242 4242 4242 4242
Mastercard: 5555 5555 5555 4444
Amex: 3782 822463 10005
```

---

## API Versioning

- **Current Version:** v1
- **Next Version:** v2 (Q1 2027)
- **Support Duration:** Minimum 12 months after new version

---

## Documentation Updates

This API specification is maintained and updated regularly. For real-time changes, refer to the API dashboard.

---

**Last Updated:** August 2026  
**API Version:** 1.0  
**Environment:** Sandbox & Production
