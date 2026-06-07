# SETUP CHECKLIST - Hệ thống Thanh toán HMATH

> Theo dõi progress setup từng bước. Đánh dấu ✅ khi hoàn thành.

---

## PHASE 1: Thu thập thông tin (5-10 phút)

### Firebase Client Config
- [ ] **Lấy Firebase Client Config:**
  - Vào https://console.firebase.google.com/
  - Chọn project "hmath-exam"
  - Settings (⚙️) → Project Settings
  - Copy "firebaseConfig"
  - **Gửi cho tôi hoặc note lại:**
    ```
    apiKey: ___________________
    projectId: ___________________
    authDomain: ___________________
    appId: ___________________
    storageBucket: ___________________
    messagingSenderId: ___________________
    ```

### Firebase Admin Credentials
- [ ] **Lấy Service Account:**
  - Vào https://console.firebase.google.com/
  - Project Settings → Service Accounts tab
  - Click "Generate New Private Key"
  - Download file `.json`
  - **Gửi cho tôi file này (giữ an toàn, không commit)**

### Sepay Configuration
- [ ] **Lấy Sepay API Key:**
  - Vào https://my.sepay.vn
  - Settings → API Keys
  - Copy API Key
  - **Note lại:**
    ```
    SEPAY_API_KEY: ___________________
    ```

- [ ] **Lấy Webhook Secret:**
  - Sepay Dashboard → Webhooks
  - Copy "Secret Key"
  - **Note lại:**
    ```
    SEPAY_WEBHOOK_SECRET: ___________________
    ```

### Domain Info
- [ ] **Note lại domain:**
  - Production domain: `https://___________________`
  - Vercel project name: `___________________`

---

## PHASE 2: Setup Local Development (5 phút)

### Environment Variables
- [ ] **Tạo file `.env` tại root:**
  ```bash
  touch .env
  ```

- [ ] **Copy template này vào `.env`:**
  ```
  # Firebase Client Config
  VITE_FIREBASE_API_KEY="YOUR_API_KEY"
  VITE_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
  VITE_FIREBASE_PROJECT_ID="hmath-exam"
  VITE_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
  VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_SENDER_ID"
  VITE_FIREBASE_APP_ID="YOUR_APP_ID"

  # Firebase Admin (Backend)
  FIREBASE_ADMIN_PROJECT_ID="hmath-exam"
  FIREBASE_ADMIN_CLIENT_EMAIL="FROM_SERVICE_ACCOUNT"
  FIREBASE_ADMIN_PRIVATE_KEY="FROM_SERVICE_ACCOUNT"

  # Sepay Config
  SEPAY_WEBHOOK_SECRET="YOUR_SECRET"
  SEPAY_API_KEY="YOUR_API_KEY"
  SEPAY_WEBHOOK_TOKEN="YOUR_API_KEY"
  PAYMENT_CODE_PREFIX="HMATH"

  # App Config
  APP_URL="http://localhost:5173"
  NODE_ENV="development"
  PORT=5173
  ```

- [ ] **Thay thế YOUR_* bằng thông tin thực:**
  - Từ firebase-applet-config.json (client)
  - Từ service-account.json (admin)
  - Từ Sepay Dashboard

- [ ] **Verify .env file:**
  ```bash
  cat .env
  ```

### Dependencies
- [ ] **Cài npm packages:**
  ```bash
  npm install
  ```

- [ ] **Verify lint (no errors):**
  ```bash
  npm run lint
  ```

---

## PHASE 3: Setup Firebase Database (10-15 phút)

### Create Collections & Documents

#### 3.1 Settings Collection
- [ ] **Vào Firebase Console:**
  - Chọn project "hmath-exam"
  - Firestore Database tab
  - Click "+ Create collection"

- [ ] **Create collection "settings":**
  - Collection ID: `settings`
  - Document ID: `global`
  - Add fields:

| Field | Type | Value |
|-------|------|-------|
| bankName | string | `Vietcombank` (hoặc ngân hàng của bạn) |
| accountNo | string | `XXXXXXXX` (tài khoản của bạn) |
| accountHolder | string | `Tên chủ tài khoản` |
| enabled | boolean | `true` |

- [ ] **Verify:** Document "settings/global" có 4 fields

#### 3.2 Update Users Collection
- [ ] **Mở user document bất kỳ:**
  - Collection "users"
  - Click user ID
  - Add fields:

| Field | Type | Value |
|-------|------|-------|
| vipExpiry | timestamp | `2024-12-31 00:00:00 UTC` (sample) |
| subscription | string | `free` |
| lastPaymentId | string | `` (để trống) |
| totalSpent | number | `0` |

- [ ] **Verify:** User document có 4 fields mới

#### 3.3 Create payment_intents Collection
- [ ] **Create collection "payment_intents":**
  - Collection ID: `payment_intents`
  - Lưu ý: Không cần add document ngay, API sẽ tự create

- [ ] **Verify:** Collection "payment_intents" tồn tại

### Firestore Rules (Optional)
- [ ] **Cập nhật Firestore Rules (nếu cần):**
  - Firebase Console → Firestore Database → Rules tab
  - Replace với rules ở REQUIREMENTS.md

---

## PHASE 4: Local Testing (15 phút)

### Start Dev Server
- [ ] **Start server:**
  ```bash
  npm run dev
  ```

- [ ] **Verify server running:**
  - Mở browser: http://localhost:5173
  - Trang HMATH load thành công

### Test Payment API
- [ ] **Test create payment:**
  ```bash
  curl -X POST http://localhost:5173/api/payment/create \
    -H "Content-Type: application/json" \
    -d '{
      "userId":"test-user-123",
      "packType":"1m",
      "planCode":"vip_1m"
    }'
  ```

  Expected response:
  ```json
  {
    "success": true,
    "intentId": "xxxxx",
    "paymentMemo": "HMATH...",
    "amount": 50000,
    "bankInfo": {...}
  }
  ```

- [ ] **Check Firestore:**
  - Mở Firebase Console → Firestore
  - Collection "payment_intents" → phải có 1 document mới
  - Verify fields: userId, status, paymentMemo, amount

### Test Verify API
- [ ] **Test verify payment (chưa thanh toán):**
  ```bash
  curl "http://localhost:5173/api/payment/verify?intentId=INTENT_ID_FROM_ABOVE"
  ```

  Expected: status = "pending"

### Test Webhook
- [ ] **Test webhook (giả lập Sepay):**
  ```bash
  node test-sepay-webhook.js \
    http://localhost:5173/api/webhook/sepay \
    HMATHTHANHQUANG5A2C \
    50000 \
    test_token
  ```

  Expected: Status 200, "success": true

- [ ] **Check Firestore:**
  - Verify payment_intents document được update
  - Verify status = "fulfilled" hoặc "completed"
  - Verify user vipExpiry được cập nhật

---

## PHASE 5: UI Testing (10 phút)

### E2E Test Flow
- [ ] **Login vào app:**
  - Mở http://localhost:5173
  - Login tài khoản học sinh

- [ ] **Click "Nâng cấp":**
  - Chọn gói 1 tháng
  - Verify modal hiển thị

- [ ] **Verify thông tin chuyển khoản:**
  - [ ] QR code hiển thị
  - [ ] Tên ngân hàng: Vietcombank
  - [ ] Số tài khoản: (từ settings)
  - [ ] Payment memo: HMATH...
  - [ ] Số tiền: 50,000 VND
  - [ ] Countdown timer

- [ ] **Giả lập thanh toán:**
  - Chạy webhook test script (bước trên)
  - **Hoặc** chuyển khoản thực tế
  - Verify UI tự động update (mỗi 3 giây)
  - Verify message "✓ Nâng cấp thành công!"

- [ ] **Verify user được update:**
  - Refresh page
  - Verify vip badge/status thay đổi
  - Verify "VIP hết hạn: ..." hiển thị

---

## PHASE 6: Production Setup (Vercel) (10 phút)

### Vercel Environment Variables
- [ ] **Vào Vercel Dashboard:**
  - https://vercel.com/dashboard
  - Chọn project HMATH

- [ ] **Settings → Environment Variables:**
  - Add tất cả variables từ `.env` file:
    ```
    VITE_FIREBASE_API_KEY
    VITE_FIREBASE_AUTH_DOMAIN
    VITE_FIREBASE_PROJECT_ID
    VITE_FIREBASE_STORAGE_BUCKET
    VITE_FIREBASE_MESSAGING_SENDER_ID
    VITE_FIREBASE_APP_ID
    FIREBASE_ADMIN_PROJECT_ID
    FIREBASE_ADMIN_CLIENT_EMAIL
    FIREBASE_ADMIN_PRIVATE_KEY (\\n instead of \n)
    SEPAY_WEBHOOK_SECRET
    SEPAY_API_KEY
    SEPAY_WEBHOOK_TOKEN
    PAYMENT_CODE_PREFIX
    APP_URL (your production domain)
    ```

- [ ] **Verify variables:**
  - Tất cả variables được add
  - FIREBASE_ADMIN_PRIVATE_KEY có escaping đúng (\\n)

### Git & Deployment
- [ ] **Commit code:**
  ```bash
  git add -A
  git commit -m "feat: payment system with sepay webhooks integration"
  git push origin main
  ```

- [ ] **Verify Vercel deployment:**
  - Vào Vercel Dashboard
  - Check deployment status (xanh = success)
  - Check build logs (không error)

- [ ] **Verify production:**
  - Mở https://yourdomain.vercel.app
  - Verify app load thành công

---

## PHASE 7: Sepay Webhook Configuration (5 phút)

### Setup Webhook URL
- [ ] **Vào Sepay Dashboard:**
  - https://my.sepay.vn
  - Webhooks → Add Webhook

- [ ] **Configure webhook:**
  - Webhook URL: `https://yourdomain.vercel.app/api/webhook/sepay`
  - Events: "Transfer Received" hoặc "Payment Received"
  - Secret Key: (đã copy ở trên)
  - Active: ✅ (bật)
  - Save

- [ ] **Test webhook:**
  - Sepay Dashboard → Webhooks → Click webhook vừa tạo
  - Click "Send Test"
  - Verify success

---

## PHASE 8: Final Testing (10 phút)

### Production Payment Test
- [ ] **Login production app:**
  - https://yourdomain.vercel.app
  - Login tài khoản test

- [ ] **Test payment flow:**
  - Click "Nâng cấp"
  - Chọn gói
  - Verify QR & transfer info display
  - **Option A:** Chuyển khoản thực tế (~50k)
  - **Option B:** Dùng Sepay test mode (nếu có)
  - Verify webhook được gọi
  - Verify payment_intents updated
  - Verify user vipExpiry updated

- [ ] **Verify Firestore:**
  - Firebase Console → Firestore
  - Check collection "payment_intents"
  - Verify latest payment có status="fulfilled"

- [ ] **Check logs:**
  - Vercel Dashboard → Deployments → View Logs
  - Xem có error gì không
  - Verify webhook logs

---

## PHASE 9: Cleanup & Security (5 phút)

### Local Files
- [ ] **Delete `.env` trước khi commit:**
  ```bash
  rm .env
  git status  # Verify .env không appears
  ```

- [ ] **Verify `.env` trong `.gitignore`:**
  ```bash
  cat .gitignore | grep ".env"
  ```

### Security Check
- [ ] **Verify sensitive data:**
  - [ ] service-account.json NOT in repo
  - [ ] .env NOT in repo
  - [ ] private key NOT in git history
  - [ ] API keys only in Vercel env vars

- [ ] **Verify Firestore Rules:**
  - [ ] payment_intents only readable by owner
  - [ ] settings only readable (if needed)

---

## PHASE 10: Documentation (5 phút)

### README Update
- [ ] **Update project README:**
  - Add payment feature to documentation
  - Link to QUICK_START.md
  - Link to SEPAY_SETUP.md

### Team Documentation
- [ ] **Gửi cho team:**
  - QUICK_START.md - cách xài
  - API_DOCS.md - API reference
  - SEPAY_SETUP.md - troubleshooting

---

## 🎉 DONE - All Checklist Complete!

Khi tất cả items trên được check ✅:

1. **Hệ thống sẵn sàng production**
2. **Webhook tự động từ Sepay**
3. **Payment hoàn toàn tự động**
4. **Có thể scale lên**

---

## Troubleshooting Quick Links

Gặp vấn đề? Kiểm tra:
- [ ] REQUIREMENTS.md → Phần cấu hình
- [ ] QUICK_START.md → Troubleshooting
- [ ] SEPAY_SETUP.md → Error handling
- [ ] API_DOCS.md → Response formats
- [ ] Browser console (F12) → Tìm `[v0]` messages
- [ ] Vercel logs → Build & runtime errors

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Gather Info | 5-10 min | ⏳ |
| Phase 2: Local Dev | 5 min | ⏳ |
| Phase 3: Firebase DB | 10-15 min | ⏳ |
| Phase 4: Local Test | 15 min | ⏳ |
| Phase 5: UI Test | 10 min | ⏳ |
| Phase 6: Vercel Setup | 10 min | ⏳ |
| Phase 7: Webhook Config | 5 min | ⏳ |
| Phase 8: Production Test | 10 min | ⏳ |
| Phase 9: Security | 5 min | ⏳ |
| Phase 10: Docs | 5 min | ⏳ |
| **TOTAL** | **~90 min** | ⏳ |

---

**Hãy follow checklist này từng bước, gửi progress cho tôi, và bao giờ bạn sẵn sàng thì báo để push lên GitHub!**
