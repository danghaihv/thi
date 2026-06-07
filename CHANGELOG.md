# Changelog

## [1.1.0] - 2024-06-08

### 🐛 Bug Fixes
- **Fixed: "db.collection is not a function" error in payment creation**
  - Added validation check for Firestore instance in `/api/payment/create.ts`
  - Now properly handles uninitialized or invalid database connections
  - Error message is more descriptive for debugging

- **Fixed: Incomplete webhook transaction processing**
  - Updated `hasProcessedTx()` to check both `payment_intents` and legacy `payments` collections
  - Prevents duplicate payment processing across different data models

- **Fixed: Payment status not updating in UI**
  - Added automatic polling mechanism every 3 seconds
  - UI now properly reflects payment fulfillment status
  - Added console logging for debugging payment flows

### ✨ New Features

#### 1. Payment Status Verification API
- **Endpoint**: `GET /api/payment/verify`
- **Purpose**: Check payment intent status by ID or memo code
- **Features**:
  - Supports both intentId and memo parameters
  - Returns full intent details including expiry date
  - Used by frontend for real-time status updates

#### 2. Automatic Payment Status Polling
- **Component**: `StudentUpgradeHub.tsx`
- **Behavior**: 
  - Polls `/api/payment/verify` every 3 seconds after checkout
  - Auto-updates UI when payment is fulfilled
  - Shows success message with new VIP expiry date
  - Fetches user data after successful payment

#### 3. Enhanced Webhook Logging
- **File**: `/api/webhook/sepay.ts`
- **Added**: Console logging of incoming webhook payloads
- **Benefit**: Easier debugging of Sepay API integrations

#### 4. Test Webhook Script
- **File**: `/test-sepay-webhook.js`
- **Purpose**: Standalone script to test webhook endpoints
- **Usage**: `node test-sepay-webhook.js [url] [memo] [amount] [token]`
- **Features**:
  - Validates webhook responses
  - Tests authentication
  - Reports success/failure

### 📚 Documentation
- **QUICK_START.md**: 5-step setup guide for Sepay integration
- **SEPAY_SETUP.md**: Comprehensive configuration guide
- **API_DOCS.md**: Complete API reference with examples
- **FIXES_SUMMARY.md**: Detailed breakdown of all changes
- **test-sepay-webhook.js**: Webhook testing script

### 🔒 Security Improvements
- Added validation for Firestore instance before database operations
- Improved error messages to prevent information leakage
- Better handling of missing database configuration

### 📊 Database Changes
No schema changes. Uses existing collections:
- `payment_intents` - Created automatically on first payment
- `payments` - Legacy support maintained
- `settings/global` - Configuration storage

### 🚀 Performance
- No performance regressions
- Polling adds ~3KB/s network usage (minimal)
- Webhook processing unchanged

### 🔄 Breaking Changes
None. Fully backward compatible with existing data.

### 📝 Files Changed
- `api/payment/create.ts` - Added validation checks
- `api/payment/_shared.ts` - Improved transaction deduplication
- `api/payment/verify.ts` - **NEW** Payment status verification
- `api/webhook/sepay.ts` - Added logging
- `src/views/StudentUpgradeHub.tsx` - Added auto-polling
- `test-sepay-webhook.js` - **NEW** Webhook test script
- `SEPAY_SETUP.md` - **NEW** Setup guide
- `QUICK_START.md` - **NEW** Quick reference
- `API_DOCS.md` - **NEW** API documentation
- `FIXES_SUMMARY.md` - **NEW** Detailed changelog

---

## [1.0.0] - Initial Release

### Features
- Student account upgrade with VIP plans
- Sepay webhook integration for automatic payment processing
- QR code generation for bank transfers
- Payment intent tracking
- Firestore database integration
- Firebase authentication
- Responsive UI for mobile and desktop

### Known Limitations
- No rate limiting on payment endpoints
- No request signing/HMAC validation
- Basic error handling
- Manual VIP expiry checks (no cron job)

---

## Migration Guide

### From 1.0.0 → 1.1.0

No database migrations needed. Just deploy the new code:

```bash
npm install
npm run build
# Deploy to Vercel or your hosting
```

### Verify After Update

1. Test payment creation:
```bash
curl -X POST https://yourdomain.com/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","packType":"1m","planCode":"vip_1m"}'
```

2. Test payment verification:
```bash
curl https://yourdomain.com/api/payment/verify?intentId=pi_xxx
```

3. Test webhook:
```bash
node test-sepay-webhook.js https://yourdomain.com/api/webhook/sepay HMATHTHANHQUANG5A2C 50000 your_token
```

---

## Upcoming Features (Roadmap)

- [ ] Rate limiting (10 req/min per IP)
- [ ] HMAC-SHA256 request signing
- [ ] IP whitelist for Sepay
- [ ] Audit logging
- [ ] Payment retry mechanism
- [ ] Webhook timeout handling
- [ ] Multi-currency support
- [ ] Subscription management
- [ ] Admin dashboard for payments
- [ ] Email notifications

---

## Support

For issues or questions:
1. Check `QUICK_START.md` for setup help
2. Review `API_DOCS.md` for API usage
3. See `SEPAY_SETUP.md` for troubleshooting
4. Check `FIXES_SUMMARY.md` for technical details

---

**Last Updated**: 2024-06-08
