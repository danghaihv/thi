# SePay Webhook Setup Guide

## 🔧 Các bước setup webhook SePay với MySQL

### 1. Tạo Database

```bash
# Đăng nhập MySQL
mysql -u root -p

# Chạy script SQL
mysql -u root -p < db-schema.sql
```

Hoặc copy-paste nội dung [db-schema.sql](./db-schema.sql) vào MySQL Workbench.

### 2. Cài Dependency

```bash
npm install mysql2
```

Đã cài trong package.json.

### 3. Cấu Hình Environment

Copy `.env.example` → `.env` và điền thông tin:

```env
# SePay Webhook API Key (từ SePay Dashboard)
SEPAY_WEBHOOK_TOKEN="your_api_key_here"
# hoặc
SEPAY_API_KEY="your_api_key_here"

# Database Connection
DB_HOST="localhost"
DB_USER="db_user"
DB_PASS="password"
DB_NAME="sepay_webhook"
```

### 4. Lấy API Key từ SePay Dashboard

1. Đăng nhập **SePay Dashboard**
2. Vào **Webhooks** → **Thêm Webhook Mới**
3. Điền:
   - **Tên**: SePay Webhook Node.js
   - **URL**: `https://yourdomain.com/api/webhook/sepay` 
     - Nếu dùng Vercel: `https://yourdomain.vercel.app/api/webhook/sepay`
     - Local test: Dùng **ngrok** để expose: `ngrok http 3000`
   - **Loại sự kiện**: `Tiền vào` (hoặc cả hai)
   - **Xác thực**: **API Key**
4. **Copy API Key** (chỉ hiện 1 lần!) → Lưu vào `.env` dòng `SEPAY_WEBHOOK_TOKEN` hoặc `SEPAY_API_KEY`

Ví dụ trong `.env` của project:

```env
SEPAY_API_KEY="KRXWHCJONGVWGZTOB8XYT4QIKHSUHDV5LEFWUAPDBHLN21ST3Y7YRGGOO98QZA0Y"
SEPAY_WEBHOOK_TOKEN="KRXWHCJONGVWGZTOB8XYT4QIKHSUHDV5LEFWUAPDBHLN21ST3Y7YRGGOO98QZA0Y"
```

### 5. Test Webhook

**Local test với ngrok:**

```bash
# Terminal 1: Chạy server
npm run dev

# Terminal 2: Expose localhost 3000 ra Internet
ngrok http 3000
# Sẽ hiện: https://xxx.ngrok-free.app

# Dùng URL này cho SePay Webhook: https://xxx.ngrok-free.app/api/webhook/sepay
```

**Test từ SePay Dashboard:**

1. SePay Dashboard → Webhooks → ⋮ (menu) → **Gửi Thử**
2. Chọn tài khoản + payload mẫu
3. Xem kết quả HTTP trong response

### 6. Flow Webhook

```
SePay (có giao dịch)
    ↓
POST /api/webhook/sepay + headers:
  - x-sepay-signature: sha256=...
  - x-sepay-timestamp: 1234567890
    body: JSON payload
    ↓
[Your Server]
    ├─ 1. Kiểm tra timestamp (chống replay, max 5 phút)
    ├─ 2. Xác thực HMAC-SHA256 signature
    ├─ 3. Parse JSON payload
    ├─ 4. INSERT IGNORE transactions (chống trùng)
    ├─ 5. Nếu insert thành công:
    │   └─ UPDATE orders SET status='paid'
    └─ 6. Trả success=true
```

### 7. Database Schema

**transactions**: Lưu tất cả giao dịch từ SePay (deduplication key: `sepay_id`)

**orders**: Các đơn hàng chờ thanh toán

**payment_attempts**: Log các lần thanh toán thử

### ⚠️ Lưu ý Quan Trọng

1. **API Key**
   - Dùng `Authorization: Apikey ...` hoặc `x-sepay-token`
   - File `api/webhook/sepay.ts` kiểm tra key trước khi xử lý

2. **UNIQUE sepay_id**
   - Chống webhook retry (SePay có thể gửi lại nếu không nhận ACK)
   - `INSERT IGNORE` sẽ bỏ qua bản ghi trùng thay vì lỗi

3. **Business Logic chỉ 1 lần**
   - UPDATE orders chỉ khi `affectedRows > 0`
   - Đảm bảo không trùng lặp khi webhook retry

4. **Timestamp Validation**
   - Chống replay attack (max 5 phút)
   - Nếu quá hạn, từ chối + trả 401

### 🔗 Kết Hợp Firebase và MySQL

Hiện tại hệ thống dùng **Firebase**. Bạn có thể:

**Option A**: Giữ cả hai (Firebase + MySQL)
- Firebase: User profiles, settings
- MySQL: Transactions log

**Option B**: Chuyển sang MySQL hoàn toàn
- Cập nhật `api/payment/` routes
- Lấy order info từ MySQL thay vì Firebase

## Troubleshooting

### "Invalid signature" khi gửi từ SePay

✓ Kiểm tra `SEPAY_WEBHOOK_SECRET` trong `.env`
✓ Secret phải giống 100% (không có space/newline)
✓ Webhook URL phải HTTPS (SePay không gửi cho HTTP)

### "Transaction already processed" mỗi khi retry

✓ Bình thường! UNIQUE sepay_id chắc chắn không trùng lặp

### Database connection error

✓ Kiểm tra DB_HOST, DB_USER, DB_PASS
✓ MySQL daemon có đang chạy không: `mysql -u root -p`

## Referencing

- SePay Webhook Docs: https://sepay.vn/docs/webhooks
- HMAC-SHA256: https://nodejs.org/api/crypto.html#crypto_class_hmac
- MySQL Pool: https://github.com/mysqljs/mysql2#using-connection-pools
