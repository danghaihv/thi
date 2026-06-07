# 📚 API Documentation

## 1. Create Payment Intent

**Endpoint**: `POST /api/payment/create`

Tạo hóa đơn thanh toán VIP mới.

### Request
```json
{
  "userId": "user_123",
  "packType": "1m",
  "planCode": "vip_1m"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| userId | string | ✅ | Firebase UID của học sinh |
| packType | string | ✅ | `1m`, `6m`, `1y` |
| planCode | string | ✅ | `vip_1m`, `vip_6m`, `vip_1y` |

### Response (Success - 200)
```json
{
  "success": true,
  "intentId": "pi_1717883467289_d4b3f7e0",
  "memo": "HMATHTHANHQUANG5A2C",
  "paymentMemo": "HMATHTHANHQUANG5A2C",
  "amount": 50000,
  "days": 30,
  "label": "VIP 1 tháng",
  "bankId": "970",
  "accountNo": "1234567890",
  "accountName": "Trần Văn A"
}
```

### Response (Error)
```json
{
  "error": "Thiếu userId hoặc packType/planCode."
}
```

| Status | Error Message | Solution |
|--------|---------------|----------|
| 400 | Thiếu userId hoặc packType/planCode | Kiểm tra request body |
| 400 | Gói VIP không hợp lệ | packType phải là 1m, 6m, hoặc 1y |
| 400 | Hệ thống chưa thiết lập cài đặt thanh toán | Tạo settings/global trong Firestore |
| 400 | Giáo viên chưa kết nối cổng SePay API | Thêm sepayApiKey vào settings/global |
| 404 | Không tìm thấy tài khoản học sinh | userId không tồn tại trong Firestore |
| 500 | Lỗi tạo hóa đơn: ... | Xem server logs |

### Example
```bash
curl -X POST http://localhost:5173/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "packType": "1m",
    "planCode": "vip_1m"
  }'
```

---

## 2. Verify Payment Intent

**Endpoint**: `GET /api/payment/verify`

Kiểm tra trạng thái hóa đơn.

### Query Parameters
```
?intentId=pi_xxx         // Hoặc
?memo=HMATHTHANHQUANG5A2C
```

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| intentId | string | Optional | ID hóa đơn từ response create |
| memo | string | Optional | Mã chuyển khoản |

### Response (Success - 200)
```json
{
  "success": true,
  "intent": {
    "id": "pi_1717883467289_d4b3f7e0",
    "status": "fulfilled",
    "memo": "HMATHTHANHQUANG5A2C",
    "amount": 50000,
    "days": 30,
    "createdAt": "2024-06-08T10:30:00.000Z",
    "fulfilledAt": "2024-06-08T10:35:00.000Z",
    "vipExpiry": "2024-07-08T10:35:00.000Z"
  }
}
```

### Intent Status
| Status | Meaning | Notes |
|--------|---------|-------|
| awaiting_payment | Chờ thanh toán | Hóa đơn mới được tạo |
| paid | Đã thanh toán | Webhook nhận tiền |
| fulfilled | Đã nâng cấp | VIP được kích hoạt |
| expired | Hết hạn | Hóa đơn >30 phút |
| canceled | Đã hủy | Người dùng hủy |

### Response (Error)
```json
{
  "error": "Không tìm thấy hóa đơn."
}
```

| Status | Error | Solution |
|--------|-------|----------|
| 400 | Thiếu intentId hoặc memo | Cung cấp một trong hai |
| 404 | Không tìm thấy hóa đơn | Kiểm tra intentId/memo đúng không |
| 500 | Lỗi kiểm tra hóa đơn: ... | Xem server logs |

### Example
```bash
# Bằng intentId
curl http://localhost:5173/api/payment/verify?intentId=pi_1717883467289_d4b3f7e0

# Bằng memo
curl http://localhost:5173/api/payment/verify?memo=HMATHTHANHQUANG5A2C
```

---

## 3. Sepay Webhook

**Endpoint**: `POST /api/webhook/sepay`

Sepay gửi tín hiệu thanh toán đến endpoint này.

### Request Headers
```
Authorization: Bearer <webhook_token>
x-sepay-token: <webhook_token>
Content-Type: application/json
```

### Request Body (từ Sepay)
```json
{
  "id": "tx_12345",
  "content": "HMATHTHANHQUANG5A2C",
  "transferAmount": 50000,
  "transactionDate": "2024-06-08T10:35:00Z",
  "senderAccount": "1111111111",
  "referenceCode": "SEPAY12345"
}
```

| Field | Type | Notes |
|-------|------|-------|
| id | string | Transaction ID từ Sepay |
| content | string | Mã chuyển khoản (memo) |
| transferAmount | number | Số tiền VND |
| transactionDate | string | ISO 8601 date |
| senderAccount | string | Tài khoản người gửi |
| referenceCode | string | Reference từ Sepay |

### Response (Success - 200)
```json
{
  "success": true,
  "message": "Đã xử lý webhook và nâng cấp VIP thành công.",
  "vipExpiry": "2024-07-08T10:35:00.000Z"
}
```

### Response (Error)
```json
{
  "success": false,
  "message": "Lỗi: ..."
}
```

| Status | Error Message | Meaning |
|--------|---------------|---------|
| 200 | Transaction đã được xử lý trước đó | Duplicate (đã xử lý) |
| 400 | Webhook thiếu thông tin memo/amount/transaction id | Payload không hợp lệ |
| 400 | Số tiền nhận được nhỏ hơn hóa đơn yêu cầu | amount < amountExpected |
| 401 | Unauthorized webhook API key | Secret token sai |
| 404 | Không tìm thấy hóa đơn chờ xử lý theo memo | Memo không match |
| 404 | Dữ liệu hóa đơn không hợp lệ | Intent bị thiếu fields |
| 405 | Method not allowed | Phải POST |
| 500 | Lỗi xử lý webhook SePay: ... | Server error |

### Test Webhook
```bash
# Test script
node test-sepay-webhook.js \
  http://localhost:5173/api/webhook/sepay \
  HMATHTHANHQUANG5A2C \
  50000 \
  your_webhook_token

# Hoặc curl
curl -X POST http://localhost:5173/api/webhook/sepay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_webhook_token" \
  -d '{
    "id": "tx_test_123",
    "content": "HMATHTHANHQUANG5A2C",
    "transferAmount": 50000,
    "transactionDate": "2024-06-08T10:35:00Z"
  }'
```

---

## 4. Get Pricing

**Endpoint**: `GET /api/payment/pricing`

Lấy thông tin giá VIP.

### Response (200)
```json
{
  "vip1MonthPrice": 50000,
  "vip6MonthPrice": 240000,
  "vip1YearPrice": 450000,
  "sepayBankId": "970",
  "sepayAccountNo": "1234567890",
  "sepayAccountName": "Trần Văn A"
}
```

### Example
```bash
curl http://localhost:5173/api/payment/pricing
```

---

## Database Schema

### Collection: payment_intents
```typescript
interface PaymentIntent {
  intentId: string;           // Unique ID
  userId: string;             // Firebase UID
  planCode: string;           // vip_1m, vip_6m, vip_1y
  amountExpected: number;     // VND
  days: number;               // 30, 180, 365
  currency: string;           // VND
  memo: string;               // HMATH...
  status: IntentStatus;       // awaiting_payment, paid, fulfilled, expired, canceled
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
  expiresAt: string;          // ISO 8601 (30 min default)
  
  // Set when paid
  sepayTxId?: string;         // Sepay transaction ID
  amountReceived?: number;    // Actual amount received
  paidAt?: string;            // ISO 8601
  
  // Set when fulfilled
  fulfilledAt?: string;       // ISO 8601
  fulfilledVipExpiry?: string; // ISO 8601
}
```

### Collection: payments (Legacy)
```typescript
interface Payment {
  id: string;                 // memo
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  days: number;
  planCode: string;
  memo: string;
  status: 'completed' | 'pending' | ...;
  createdAt: string;
  
  // When webhook processed
  sepayTxId?: string;
  vipExpiry?: string;
  intentId?: string;
}
```

### Collection: settings/global
```typescript
interface Settings {
  // Bank account
  sepayBankId: string;        // VietcomBank: 970
  sepayAccountNo: string;     // XXXXXXXX
  sepayAccountName: string;   // Full name
  
  // API
  sepayApiKey: string;        // API key
  sepayWebhookToken: string;  // Secret token
  
  // Pricing
  vip1MonthPrice: number;     // VND
  vip6MonthPrice: number;
  vip1YearPrice: number;
}
```

### Users document
```typescript
interface User {
  // ... other fields
  vipExpiry?: string;         // ISO 8601
  vipType?: string;           // "30 ngày", "180 ngày", ...
  vipUpdatedAt?: string;      // ISO 8601
}
```

---

## Error Handling

### Common Errors & Solutions

```
❌ "db.collection is not a function"
→ Firebase Admin chưa khởi tạo
→ Fix: Set FIREBASE_ADMIN_* env vars

❌ "Unauthorized webhook API key"
→ Secret token sai
→ Fix: Kiểm tra SEPAY_WEBHOOK_TOKEN

❌ "Không tìm thấy hóa đơn"
→ Memo không match
→ Fix: Kiểm tra memo format: HMATH<NAME><RANDOM>

❌ "Số tiền nhận được nhỏ hơn"
→ Người dùng chuyển thiếu tiền
→ Fix: Webhook tự động reject, yêu cầu chuyển lại
```

---

## Rate Limiting

Hiện tại **không có rate limiting**. 

Khuyến nghị:
- Giới hạn 10 requests/phút per IP cho payment endpoints
- Giới hạn retry webhook đến 5 lần (Sepay sẽ retry)

---

## Security Notes

✅ Webhook token verification (Bearer + x-sepay-token)
✅ Amount validation (amount >= amountExpected)
✅ Duplicate transaction check (hasProcessedTx)
✅ Intent status validation (no reprocessing)
✅ Firebase RLS recommended (per-user queries)

❌ **TODO**:
- Add rate limiting
- Add request signing (HMAC-SHA256)
- Add IP whitelist for Sepay
- Add audit logging

---

## Monitoring & Alerts

### Key Metrics
- Payment success rate
- Webhook latency (target: < 3s)
- Failed webhook attempts
- Duplicate transaction detections

### Logs to watch
```
[v0] Payment create response:
[v0] SePay webhook received:
[v0] Check payment status error:
```

---

**Last Updated**: 2024-06-08  
**Version**: 1.0.0
