# 🚀 Quick Start - Cấu hình thanh toán Sepay

## 1️⃣ Bước 1: Cấu hình Firestore (5 phút)

Đăng nhập Firebase Console → Firestore → Tạo document:

**Collection**: `settings`  
**Document**: `global`

```json
{
  "sepayBankId": "970",                    // Mã ngân hàng (VietcomBank)
  "sepayAccountNo": "1234567890",          // Số tài khoản
  "sepayAccountName": "Trần Văn A",        // Tên chủ tài khoản
  "sepayApiKey": "abc123xyz789",           // API Key từ Sepay.vn
  "sepayWebhookToken": "secret_token_123", // Secret cho webhook
  "vip1MonthPrice": 50000,                 // Giá VIP 1 tháng (VND)
  "vip6MonthPrice": 240000,                // Giá VIP 6 tháng
  "vip1YearPrice": 450000                  // Giá VIP 1 năm
}
```

**Lấy API Key & Webhook Token**:
1. Truy cập [Sepay.vn](https://sepay.vn) → Đăng nhập
2. Vào **API Settings** → Copy **API Key** & **Webhook Secret**
3. Paste vào Firestore như trên

---

## 2️⃣ Bước 2: Set Environment Variables (2 phút)

Trên Vercel hoặc localhost, thêm các biến:

### Vercel Dashboard:
Settings → Environment Variables

```
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_email@iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
SEPAY_WEBHOOK_TOKEN=secret_token_123
SEPAY_API_KEY=abc123xyz789
PAYMENT_CODE_PREFIX=HMATH
```

### Localhost (.env.local):
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
FIREBASE_ADMIN_SERVICE_ACCOUNT={"type":"service_account",...}
SEPAY_WEBHOOK_TOKEN=secret_token_123
SEPAY_API_KEY=abc123xyz789
```

---

## 3️⃣ Bước 3: Cấu hình Webhook trên Sepay (3 phút)

1. Truy cập [Sepay.vn](https://sepay.vn) → Dashboard
2. **Webhooks** → **Thêm webhook mới**
3. Điền thông tin:

| Field | Value |
|-------|-------|
| **URL** | `https://yourdomain.com/api/webhook/sepay` |
| **Method** | POST |
| **Content-Type** | application/json |
| **Secret Token** | `secret_token_123` (khớp với `sepayWebhookToken`) |
| **Events** | ✅ Transfer received, ✅ Transaction completed |

4. Click **Save** → Test webhook

---

## 4️⃣ Bước 4: Test Webhook (2 phút)

Chạy script test:
```bash
node test-sepay-webhook.js \
  https://yourdomain.com/api/webhook/sepay \
  HMATHTHANHQUANG5A2C \
  50000 \
  secret_token_123
```

Phải thấy:
```
✅ Response Status: 200
✅ Response Body:
{
  "success": true,
  "message": "..."
}
🎉 Webhook test PASSED!
```

---

## 5️⃣ Bước 5: Test E2E (5 phút)

### Localhost:
```bash
npm install
npm run dev
# Truy cập http://localhost:5173
```

### Vercel:
```bash
# Push code lên GitHub → Vercel tự deploy
git push origin main
```

### Test flow:
1. Đăng nhập bằng tài khoản học sinh test
2. Click "Nâng cấp tài khoản" → Chọn gói VIP 1 tháng
3. Hiển thị mã QR
4. Quét mã hoặc sao chép thông tin:
   - **Số tài khoản**: 1234567890
   - **Chủ tài khoản**: Trần Văn A
   - **Số tiền**: 50,000 đ
   - **Nội dung**: HMATHTHANHQUANG5A2C
5. Chuyển khoản từ ngân hàng
6. Sau 3-5 giây, sẽ hiển thị: "✓ Nâng cấp thành công!"
7. Kiểm tra Firestore: `users/{uid}` → `vipExpiry` được cập nhật

---

## 🆘 Troubleshooting

### ❌ Lỗi: "Cổng thanh toán chưa sẵn sàng"
→ Firestore chưa có `settings/global` hoặc thiếu `sepayBankId`/`sepayAccountNo`

**Fix**: Thêm/sửa Firestore document (xem Bước 1)

---

### ❌ Lỗi: "Lỗi tạo hóa đơn: db.collection is not a function"
→ Firebase Admin chưa khởi tạo

**Fix**: 
1. Check Environment Variables có `FIREBASE_ADMIN_*` không
2. Hoặc upload file `service-account.json` vào project root

```bash
# Tạo service account:
# Firebase Console → Project Settings → Service Accounts → Create Key
```

---

### ❌ Webhook không nhận tín hiệu từ Sepay
→ URL webhook chưa đúng hoặc server không chạy

**Fix**:
1. Kiểm tra URL: `https://yourdomain.com/api/webhook/sepay` (https, không http)
2. Test webhook từ Sepay dashboard: **Test Webhook** button
3. Kiểm tra logs: Vercel dashboard → Logs tab

```bash
# Localhost: check terminal output
npm run dev
# Tìm: "[v0] SePay webhook received:"
```

---

### ❌ Mã QR không hiển thị
→ Thiếu `sepayBankId` hoặc `sepayAccountNo`

**Fix**: Kiểm tra Firestore `settings/global` có đủ fields không (xem Bước 1)

---

### ❌ Thanh toán thành công nhưng VIP chưa update
→ Webhook đã xử lý nhưng UI chưa refresh

**Fix**: Tải lại trang (F5) hoặc đợi 5-10 giây

```bash
# Debug: mở DevTools → Console
# Tìm: "[v0] Check payment status error:"
```

---

## 📊 Kiểm tra logs

### Console (Vercel):
```bash
# View logs
vercel logs
# Hoặc: Vercel Dashboard → Deployments → Logs
```

### Browser Console (F12):
```javascript
// Tìm messages với prefix [v0]:
[v0] Payment create response: {...}
[v0] SePay webhook received: {...}
[v0] Check payment status error: {...}
```

---

## 💡 Tips & Tricks

### Memo format:
```
HMATH<TEN><RANDOM>
Ví dụ: HMATHTHANHQUANG5A2C
```
- **HMATH**: prefix (from PAYMENT_CODE_PREFIX)
- **THANHQUANG**: tên học sinh (8 ký tự đầu, alphanumeric)
- **5A2C**: random (4 ký tự)

### Test tiền chuyển nhỏ hơn:
Nếu webhook test thành công nhưng tiền chuyển < amountExpected, webhook sẽ reject:
```
"Số tiền nhận được nhỏ hơn hóa đơn yêu cầu."
```

### Kiểm tra payment_intents:
Firestore → `payment_intents` collection:
- Mỗi khi tạo hóa đơn, tạo document mới
- Status: `awaiting_payment` → `fulfilled`
- Kiểm tra `sepayTxId` để confirm webhook đã xử lý

---

## 📞 Hỗ trợ

- Sepay API: https://docs.sepay.vn
- Firebase: https://firebase.google.com/docs/firestore
- Issues: Xem SEPAY_SETUP.md hoặc FIXES_SUMMARY.md

---

**Chúc bạn thành công! 🎉**

Sau khi hoàn thành 5 bước trên, hệ thống thanh toán sẽ hoàn toàn tự động.
