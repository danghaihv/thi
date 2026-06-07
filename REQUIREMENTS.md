# Yêu cầu cài đặt cho hệ thống thanh toán HMATH

## Phần 1: Cài đặt cơ bản

### 1.1 Dependencies (Package.json)
✅ **ĐÃ CÓ** - Tất cả dependencies cần thiết đã được cài:
```json
{
  "firebase": "^12.13.0",
  "firebase-admin": "^13.10.0",
  "express": "^4.21.2",
  "dotenv": "^17.2.3"
}
```

**Cách cài đặt:**
```bash
cd /vercel/share/v0-project
npm install
```

---

## Phần 2: Firebase Configuration

### 2.1 Firebase Client Config (YÊU CẦU TỪ BẠN)
File: `/vercel/share/v0-project/firebase-applet-config.json`

**Thông tin cần:**
```json
{
  "projectId": "YOUR_FIREBASE_PROJECT_ID",
  "appId": "YOUR_FIREBASE_APP_ID",
  "apiKey": "YOUR_FIREBASE_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "storageBucket": "YOUR_PROJECT_ID.firebasestorage.app",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
  "measurementId": ""
}
```

**Cách lấy:**
1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project HMATH của bạn
3. Click Settings (⚙️) → Project Settings
4. Scroll down → Tìm mục "Your apps"
5. Copy config dưới phần "firebaseConfig"

**Bạn có sẵn file này chưa? Cần tôi cập nhật không?**

---

### 2.2 Firebase Admin Credentials (YÊU CẦU TỪ BẠN - QUAN TRỌNG)

**Bạn có 3 cách cấu hình:**

#### Cách 1: Environment Variables (KHUYẾN NGHỊ cho Vercel)
```bash
FIREBASE_ADMIN_PROJECT_ID="your-project-id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

#### Cách 2: Service Account File (cho localhost)
File: `service-account.json` hoặc đặt path trong `GOOGLE_APPLICATION_CREDENTIALS`

#### Cách 3: Automatic (nếu chạy trên Firebase Hosting/Functions)
Tự động lấy từ environment

**Cách lấy Firebase Admin Credentials:**
1. Vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn project HMATH
3. Click Settings (⚙️) → Service Accounts
4. Tab "Service Accounts"
5. Click "Generate New Private Key"
6. Sẽ download file `.json` - **GIỮ AN TOÀN, KHÔNG COMMIT VÀO GIT**

**Dòng lệnh để get credentials:**
```bash
# Chỉ copy phần "private_key" từ file service account, replace \n thành \\n
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END PRIVATE KEY-----\n"
```

---

## Phần 3: Sepay Configuration (YÊU CẦU TỪ BẠN)

### 3.1 Sepay Webhook Secret
```bash
SEPAY_WEBHOOK_SECRET="your_webhook_secret_from_sepay_dashboard"
```

**Cách lấy:**
1. Vào [Sepay Dashboard](https://my.sepay.vn)
2. Vào Settings → Webhooks
3. Copy **"Secret Key"** hoặc **"API Secret"**

### 3.2 Sepay API Key
```bash
SEPAY_API_KEY="your_sepay_api_key"
SEPAY_WEBHOOK_TOKEN="your_sepay_webhook_token"
```

**Cách lấy:**
1. Vào Sepay Dashboard
2. Vào Settings → API Keys
3. Copy API Key

### 3.3 Payment Code Prefix
```bash
PAYMENT_CODE_PREFIX="HMATH"
```
(Giữ nguyên hoặc change theo format của bạn)

---

## Phần 4: Firestore Database Setup (YÊU CẦU)

### 4.1 Collections & Indexes cần tạo

**Collection 1: `settings` (cầu hình thanh toán)**
```
Document: "global"
Fields:
  - bankName: string = "Vietcombank" (hoặc ngân hàng của bạn)
  - accountNo: string = "XXXXXXXX"
  - accountHolder: string = "Tên chủ tài khoản"
  - sepayToken: string = "token_from_sepay"
  - qrCodeUrl: string = "" (để trống, generate tự động)
  - enabled: boolean = true
  - updatedAt: timestamp
```

**Collection 2: `payment_intents` (hóa đơn)**
```
Document auto-generated
Fields:
  - userId: string (ID của học sinh)
  - packType: string ("1m" | "6m" | "1y")
  - planCode: string ("vip_1m" | "vip_6m" | "vip_1y")
  - amount: number
  - currency: string = "VND"
  - status: string ("pending" | "fulfilled" | "expired" | "cancelled")
  - paymentMemo: string = "HMATH{studentname}{randomcode}"
  - sepayTxId: string (ghi lại ID transaction từ Sepay)
  - bankInfo: object {
      bankName: string
      accountNo: string
      accountHolder: string
    }
  - vipExpiry: timestamp (hết hạn VIP)
  - createdAt: timestamp
  - updatedAt: timestamp
  - webhookReceived: boolean = false
  - webhookData: object (dữ liệu từ Sepay webhook)
  - expiresAt: timestamp (auto cleanup nếu chưa thanh toán)
```

**Collection 3: `users` (cập nhật)**
```
Thêm fields vào user document:
  - vipExpiry: timestamp (ngày VIP hết hạn)
  - subscription: string ("free" | "vip_1m" | "vip_6m" | "vip_1y")
  - lastPaymentId: string
  - totalSpent: number
```

### 4.2 Firestore Rules (tùy chọn - để mở nếu không dùng RLS)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cho phép đọc payment_intents của user
    match /payment_intents/{document=**} {
      allow read: if request.auth.uid != null;
    }
    // Chỉ admin được cập nhật settings
    match /settings/{document=**} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

---

## Phần 5: Environment Variables Setup (YÊU CẦU TỪ BẠN)

### 5.1 Local Development (.env file)
Tạo file `.env` tại root project:

```bash
# Firebase Client Config
VITE_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="hmath-exam"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"

# Firebase Admin (Backend only)
FIREBASE_ADMIN_PROJECT_ID="hmath-exam"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@hmath-exam.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END PRIVATE KEY-----\n"

# Sepay Config
SEPAY_WEBHOOK_SECRET="your_webhook_secret"
SEPAY_API_KEY="your_api_key"
SEPAY_WEBHOOK_TOKEN="your_webhook_token"
PAYMENT_CODE_PREFIX="HMATH"

# App Config
APP_URL="http://localhost:5173"
NODE_ENV="development"
PORT=5173
```

### 5.2 Production (Vercel)
Vào Vercel Dashboard → Project Settings → Environment Variables, thêm:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY (với \n escaped là \\n)
SEPAY_WEBHOOK_SECRET
SEPAY_API_KEY
SEPAY_WEBHOOK_TOKEN
PAYMENT_CODE_PREFIX
APP_URL (production domain)
```

---

## Phần 6: Sepay Webhook Configuration (YÊU CẦU)

### 6.1 Setup Webhook URL tại Sepay Dashboard
1. Vào [Sepay Dashboard](https://my.sepay.vn)
2. Webhooks → Add Webhook
3. **Webhook URL:** `https://yourdomain.com/api/webhook/sepay`
   - Local: `http://localhost:5173/api/webhook/sepay`
   - Production: `https://your-vercel-domain.vercel.app/api/webhook/sepay`
4. **Events:** Chọn "Transfer Received" hoặc "Payment Received"
5. **Secret Key:** Copy từ đây → Lưu vào `SEPAY_WEBHOOK_SECRET`
6. **Active:** Bật "Active"
7. Save

### 6.2 Test Webhook
Chạy script test:
```bash
node test-sepay-webhook.js \
  http://localhost:5173/api/webhook/sepay \
  HMATHTHANHQUANG5A2C \
  50000 \
  test_token
```

---

## Phần 7: Database Structure Verification

### 7.1 Firestore Collections Checklist
- [ ] `settings/global` - Bank info
- [ ] `payment_intents` - Hóa đơn
- [ ] `users` - Tài khoản học sinh + vipExpiry
- [ ] `webhookLogs` (tùy chọn) - Debug webhook

### 7.2 Fields trong Users
- [ ] vipExpiry (timestamp)
- [ ] subscription (string)
- [ ] lastPaymentId (string)
- [ ] totalSpent (number)

---

## Phần 8: API Routes (ĐÃ CÓ)

Các endpoint đã được cài đặt:

| Endpoint | Method | Mục đích |
|----------|--------|---------|
| `/api/payment/create` | POST | Tạo hóa đơn |
| `/api/payment/verify` | GET | Kiểm tra trạng thái |
| `/api/webhook/sepay` | POST | Nhận callback từ Sepay |
| `/api/payment/pricing` | GET | Bảng giá |

---

## Phần 9: Testing Checklist

### 9.1 Local Testing
```bash
# 1. Cài dependencies
npm install

# 2. Check lint
npm run lint

# 3. Start server
npm run dev

# 4. Test API
curl -X POST http://localhost:5173/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"testuser","packType":"1m","planCode":"vip_1m"}'

# 5. Test webhook
node test-sepay-webhook.js \
  http://localhost:5173/api/webhook/sepay \
  HMATHTESTUSER123 \
  50000 \
  test_token
```

### 9.2 E2E Testing
1. [ ] Login tài khoản học sinh
2. [ ] Click "Nâng cấp"
3. [ ] Chọn gói (1m/6m/1y)
4. [ ] Hiển thị QR code + thông tin chuyển khoản
5. [ ] Chuyển khoản từ app ngân hàng
6. [ ] UI tự động update (check console)
7. [ ] Firestore payment_intents được cập nhật
8. [ ] User vipExpiry được update
9. [ ] Hiển thị "✓ Nâng cấp thành công!"

---

## Phần 10: Deployment (Vercel)

### 10.1 Pre-deployment
- [ ] Test tất cả locally
- [ ] Commit code: `git add -A && git commit -m "fix: payment system"`
- [ ] Push: `git push origin main`

### 10.2 Vercel Deployment
- [ ] Vercel auto-deploy khi push
- [ ] Set environment variables trong Vercel Dashboard
- [ ] Verify deployment status

### 10.3 Post-deployment
- [ ] Update Sepay webhook URL: `https://yourdomain.vercel.app/api/webhook/sepay`
- [ ] Test payment từ production
- [ ] Kiểm tra Firestore logs

---

## Tóm tắt: Thực hiện từng bước

### Bước 1: Cung cấp thông tin cho tôi (5 phút)
Gửi cho tôi:
1. Firebase Client Config (từ firebase-applet-config.json hoặc console)
2. Firebase Admin Service Account (file .json)
3. Sepay API Key & Webhook Secret
4. Domain hiện tại của HMATH

### Bước 2: Tôi cập nhật files (10 phút)
- Cập nhật .env.example
- Tạo file hướng dẫn cấu hình chi tiết
- Cập nhật README

### Bước 3: Bạn setup Firestore (10 phút)
- Tạo collections
- Thêm fields vào users
- Thêm settings/global

### Bước 4: Bạn setup environment variables (5 phút)
- Local: Tạo .env file
- Vercel: Set vars trong Dashboard

### Bước 5: Test (15 phút)
- Local testing
- Webhook testing
- E2E testing

### Bước 6: Deploy (5 phút)
- Push GitHub
- Vercel auto-deploy
- Update Sepay webhook URL

**Tổng cộng: ~50 phút setup**

---

## Next Steps

Hãy gửi cho tôi:

1. **Firebase credentials:**
   - apiKey
   - projectId
   - authDomain
   - appId
   - Firebase Admin Service Account JSON file (GIỮ AN TOÀN)

2. **Sepay credentials:**
   - API Key
   - Webhook Secret
   - Webhook Token

3. **Domain info:**
   - Production domain (Vercel URL)
   - Local dev URL

4. **Database:**
   - Có tạo payment_intents collection chưa?
   - Có tạo settings/global document chưa?

---

**Khi bạn gửi các thông tin trên, tôi sẽ:**
- Cập nhật `.env.example`
- Tạo file `.env` mẫu
- Cập nhật SEPAY_SETUP.md
- Sẵn sàng để push lên GitHub
