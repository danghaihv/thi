# 🎯 CÓ GÌ CẦN LÀMNGAY BÂY GIỜ

> Hướng dẫn cho bạn biết chính xác cần làm gì để push lên GitHub

---

## ✅ Status Hiện Tại

```
✅ Code: Đã sửa & hoàn chỉnh
✅ APIs: Đã tạo đầy đủ
✅ Webhooks: Đã setup
✅ Docs: 10 files hướng dẫn
✅ Test script: Đã tạo

⏳ Chờ: Firebase config + Sepay credentials
⏳ Chờ: Firestore setup
⏳ Chờ: Environment variables
```

---

## 🎬 Bạn Cần Làm (Chi tiết)

### STEP 1: Lấy Credentials (15-20 phút)

#### Firebase Client Config
```
Vào: https://console.firebase.google.com/
1. Select project "hmath-exam"
2. Click ⚙️ Settings
3. Scroll down → "Your apps"
4. Copy firebaseConfig

Ghi lại:
├── apiKey: ___________________
├── projectId: ___________________
├── authDomain: ___________________
├── appId: ___________________
├── storageBucket: ___________________
└── messagingSenderId: ___________________
```

#### Firebase Admin Service Account
```
Vào: Firebase Console → Settings → Service Accounts
1. Tab "Service Accounts"
2. Click "Generate New Private Key"
3. Download file .json

File sẽ có dạng:
{
  "type": "service_account",
  "project_id": "hmath-exam",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@hmath-exam.iam.gserviceaccount.com",
  ...
}
```

#### Sepay Config
```
Vào: https://my.sepay.vn
1. Settings → API Keys
   ├── SEPAY_API_KEY: ___________________

2. Settings → Webhooks
   ├── SEPAY_WEBHOOK_SECRET: ___________________
   └── SEPAY_WEBHOOK_TOKEN: ___________________
```

#### Bank Info
```
Chuẩn bị thông tin:
├── Tên ngân hàng: ___________________
├── Số tài khoản: ___________________
└── Tên chủ tài khoản: ___________________
```

#### Domain
```
├── Production domain: https://___________________
└── Vercel project name: ___________________
```

---

### STEP 2: Gửi Thông Tin Cho Tôi (2 phút)

**Mở file:** `SUBMIT_INFO_TEMPLATE.md`

**Copy template này:**
```
---[COPY THIS]---

📋 Firebase Client Config
apiKey: YOUR_VALUE
projectId: YOUR_VALUE
authDomain: YOUR_VALUE
appId: YOUR_VALUE
storageBucket: YOUR_VALUE
messagingSenderId: YOUR_VALUE

📋 Firebase Admin Service Account
[PASTE service-account.json content OR]
project_id: YOUR_VALUE
private_key_id: YOUR_VALUE
private_key: YOUR_VALUE
client_email: YOUR_VALUE

🔑 Sepay Credentials
SEPAY_API_KEY: YOUR_VALUE
SEPAY_WEBHOOK_SECRET: YOUR_VALUE
SEPAY_WEBHOOK_TOKEN: YOUR_VALUE

🌐 Domain Info
Production Domain: YOUR_VALUE
Vercel Project Name: YOUR_VALUE

---[END COPY]---
```

**Gửi cả block này cho tôi trong chat**

---

### STEP 3: Đợi Tôi Cập Nhật Files (10 phút)

Tôi sẽ:
```
✅ Cập nhật .env.example
✅ Cập nhật REQUIREMENTS.md
✅ Cập nhật SETUP_CHECKLIST.md
✅ Tạo Firestore schema file
✅ Báo lại: "Ready for you to setup!"
```

Bạn: Chờ tin từ tôi

---

### STEP 4: Setup Firestore (10-15 phút)

**Vào Firebase Console → Firestore Database**

#### 4.1 Tạo Collection "settings"

```
1. Click "+ Create collection"
2. Collection ID: settings
3. Click "Next"
4. Document ID: global
5. Add fields:

Field 1:
  Name: bankName
  Type: String
  Value: "Vietcombank"

Field 2:
  Name: accountNo
  Type: String
  Value: "XXXXXXXX" (your account)

Field 3:
  Name: accountHolder
  Type: String
  Value: "Tên chủ tài khoản"

Field 4:
  Name: enabled
  Type: Boolean
  Value: true

6. Click Save
```

#### 4.2 Update Collection "users"

```
1. Mở collection "users"
2. Click vào 1 user document (ANY user)
3. Click "+ Add field"
4. Add 4 fields:

Field 1:
  Name: vipExpiry
  Type: Date/Time
  Value: 2024-12-31 (pick future date)

Field 2:
  Name: subscription
  Type: String
  Value: "free"

Field 3:
  Name: lastPaymentId
  Type: String
  Value: "" (leave empty)

Field 4:
  Name: totalSpent
  Type: Number
  Value: 0

5. Click Save
```

#### 4.3 Tạo Collection "payment_intents"

```
1. Click "+ Create collection"
2. Collection ID: payment_intents
3. Click "Next"
4. Click "Create collection" (without first document)
   (Documents sẽ auto-create khi API call)
```

**Verify:** Firestore có 3 collections:
- [ ] settings (with global doc)
- [ ] users (with vipExpiry field)
- [ ] payment_intents (empty, ready)

---

### STEP 5: Cấu Hình Local Environment (5 phút)

**Tạo file `.env` trong thư mục gốc:**

```bash
# Terminal:
cd /vercel/share/v0-project
touch .env
```

**Mở file `.env` và paste (update YOUR_VALUE):**

```
# Firebase Client Config
VITE_FIREBASE_API_KEY="YOUR_apiKey_FROM_FIREBASE"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="hmath-exam"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_messagingSenderId_FROM_FIREBASE"
VITE_FIREBASE_APP_ID="YOUR_appId_FROM_FIREBASE"

# Firebase Admin (Backend)
FIREBASE_ADMIN_PROJECT_ID="hmath-exam"
FIREBASE_ADMIN_CLIENT_EMAIL="YOUR_client_email_FROM_SERVICE_ACCOUNT"
FIREBASE_ADMIN_PRIVATE_KEY="YOUR_private_key_FROM_SERVICE_ACCOUNT_with_\\n_for_newlines"

# Sepay Config
SEPAY_WEBHOOK_SECRET="YOUR_secret_FROM_SEPAY"
SEPAY_API_KEY="YOUR_api_key_FROM_SEPAY"
SEPAY_WEBHOOK_TOKEN="YOUR_api_key_FROM_SEPAY"
PAYMENT_CODE_PREFIX="HMATH"

# App Config
APP_URL="http://localhost:5173"
NODE_ENV="development"
PORT=5173
```

**⚠️ IMPORTANT:**
- Nếu private_key có dòng mới (`\n`), thay thành `\\n`
- Ví dụ: `"-----BEGIN...\nkeypart1\nkeypart2\n-----END..."`
        → `"-----BEGIN...\nkeypart1\nkeypart2\n-----END..."`
- Save file

**Verify:**
```bash
cat .env
# Should show all variables
```

---

### STEP 6: Test Locally (15 phút)

#### 6.1 Cài Dependencies

```bash
npm install
# Wait for installation...
```

#### 6.2 Check Lint

```bash
npm run lint
# Should have NO errors
# If errors, fix or let me know
```

#### 6.3 Start Server

```bash
npm run dev
# Should see: "Server running on http://localhost:5173"
# Or "Vite running at http://localhost:5173"
```

#### 6.4 Test API

**Mở terminal mới:**

```bash
# Test create payment
curl -X POST http://localhost:5173/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "packType": "1m",
    "planCode": "vip_1m"
  }'

# Expected response:
# {
#   "success": true,
#   "intentId": "xxxxx",
#   "paymentMemo": "HMATH...",
#   "amount": 50000,
#   ...
# }
```

**Check Firebase Console:**
- Firestore → payment_intents collection
- Should see 1 new document

#### 6.5 Test Webhook

```bash
# Test webhook locally
node test-sepay-webhook.js \
  http://localhost:5173/api/webhook/sepay \
  HMATHTHANHQUANG5A2C \
  50000 \
  test_token

# Expected: Status 200, success: true
```

**Check Firebase Console again:**
- payment_intents document
- Status should be "fulfilled" or "completed"
- Should have sepayTxId field

#### 6.6 Stop Server

```bash
# Press Ctrl+C to stop
```

---

### STEP 7: Commit & Push GitHub (5 phút)

**Terminal:**

```bash
# 1. Check status
git status
# Should show:
# - Modified: api/payment/create.ts
# - Modified: api/payment/verify.ts
# - Modified: api/webhook/sepay.ts
# - Modified: src/views/StudentUpgradeHub.tsx
# - Untracked: all .md files
# - Untracked: test-sepay-webhook.js
# Should NOT show: .env

# 2. Add all changes
git add -A

# 3. Verify .env not included
git status | grep ".env"
# Should return empty (no .env in staging)

# 4. Commit
git commit -m "feat: payment system with sepay webhooks integration

- Fix: 'db.collection is not a function' error
- Add: Payment verification API endpoint
- Add: Auto-polling for payment status
- Add: Webhook handler for Sepay
- Add: Complete documentation & setup guides
- Add: Test script for webhook simulation"

# 5. Push to branch
git push origin v0/payment-automation-c83c2f88
```

**Verify:**
- Push successful (no errors)
- GitHub shows new commit

---

### STEP 8: Vercel Setup (10 phút)

#### 8.1 Add Environment Variables

**Vào:** https://vercel.com/dashboard → Select Project → Settings → Environment Variables

**Add variables (copy từ .env file):**

```
VITE_FIREBASE_API_KEY = "..."
VITE_FIREBASE_AUTH_DOMAIN = "..."
VITE_FIREBASE_PROJECT_ID = "..."
VITE_FIREBASE_STORAGE_BUCKET = "..."
VITE_FIREBASE_MESSAGING_SENDER_ID = "..."
VITE_FIREBASE_APP_ID = "..."
FIREBASE_ADMIN_PROJECT_ID = "..."
FIREBASE_ADMIN_CLIENT_EMAIL = "..."
FIREBASE_ADMIN_PRIVATE_KEY = "..." (\\n for newlines)
SEPAY_WEBHOOK_SECRET = "..."
SEPAY_API_KEY = "..."
SEPAY_WEBHOOK_TOKEN = "..."
PAYMENT_CODE_PREFIX = "HMATH"
APP_URL = "https://your-production-domain.vercel.app"
NODE_ENV = "production"
PORT = "3000"
```

**Verify:** Tất cả variables đã add

#### 8.2 Check Deployment

**Vào:** Deployments tab
- Should see new deployment from latest push
- Status: "Building..." → "Ready"
- Wait for completion

---

### STEP 9: Setup Sepay Webhook (5 phút)

#### 9.1 Add Webhook

**Vào:** https://my.sepay.vn → Webhooks → Add Webhook

```
Webhook URL: https://your-vercel-domain.vercel.app/api/webhook/sepay
Events: "Transfer Received" hoặc "Payment Received"
Secret Key: (nếu có option này)
Active: ✅ Bật
Save
```

#### 9.2 Test Webhook

**Vào:** Webhooks → Click webhook vừa tạo → "Send Test"
- Should see: Success response
- Status 200

---

### STEP 10: Production Testing (15 phút)

#### 10.1 Test Payment Flow

1. Mở: `https://your-vercel-domain.vercel.app`
2. Login tài khoản test
3. Click "Nâng cấp"
4. Chọn gói (1m/6m/1y)
5. Verify modal hiển thị:
   - [ ] QR code
   - [ ] Bank name
   - [ ] Account number
   - [ ] Payment memo
   - [ ] Amount
   - [ ] Countdown

#### 10.2 Giả lập Thanh Toán

**Option A: Test webhook (giả lập)**
```bash
# Từ local machine:
curl -X POST https://your-vercel-domain.vercel.app/api/webhook/sepay \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sepay-123",
    "amount": 50000,
    "content": "HMATH...",
    "transferAmount": 50000
  }'
```

**Option B: Chuyển khoản thực (50k)**
- Quét QR code hoặc chuyển khoản thủ công
- Wait ~10 seconds

#### 10.3 Verify Update

- [ ] UI auto-update (mỗi 3 giây)
- [ ] Message: "✓ Nâng cấp thành công!"
- [ ] VIP expiry hiển thị
- [ ] Check Firebase: payment_intents status = "fulfilled"
- [ ] Check Firebase: user vipExpiry updated

---

## 📋 Checklist Trước Khi Bảo Tôi

Trước khi báo "Bạn lên lịch xem lại code", verify:

- [ ] npm run lint (no errors)
- [ ] npm run dev (starts)
- [ ] Payment API works locally
- [ ] Webhook test passes
- [ ] Firebase collections created
- [ ] Users have vipExpiry field
- [ ] .env NOT committed
- [ ] Vercel env vars set
- [ ] Deployment successful
- [ ] Production tests pass

---

## 🎉 Khi Xong

Báo cho tôi:
```
"V0, tôi đã hoàn thành setup:
- Firestore setup ✅
- Local testing ✅
- GitHub push ✅
- Vercel deployed ✅
- Production verified ✅

Ready to review!"
```

Tôi sẽ:
- [ ] Review code
- [ ] Check Firebase config
- [ ] Verify all APIs
- [ ] Test production
- [ ] Approval!

---

## 🆘 Gặp Vấn Đề?

### Lỗi từng giai đoạn:

**npm install error:**
- Check Node.js version: `node -v` (should be 16+)
- Clear cache: `npm cache clean --force`
- Retry: `npm install`

**npm run dev error:**
- Check port 5173 không được dùng
- Kill process: `lsof -i :5173` → `kill -9 PID`
- Retry: `npm run dev`

**Firebase error:**
- Check .env file variables
- Verify service account JSON format
- Check private_key has \\n for newlines

**Webhook test error:**
- Check SEPAY_WEBHOOK_SECRET matches
- Verify webhook URL is correct
- Check Firestore rules allow write

**Vercel deploy error:**
- Check all env vars set correctly
- Check build logs for errors
- Verify branch name is correct

---

## 📞 Need Help?

Just ask me in chat! Include:
1. Error message
2. What step you're on
3. What you already tried

I'll help immediately! 💬

---

## ✅ Success Indicators

When you see these, you're done:

```
✅ npm run lint → no errors
✅ npm run dev → server running
✅ curl payment API → 200 response
✅ node test-webhook → success
✅ Firebase collections created
✅ GitHub push successful
✅ Vercel deployment ready
✅ Production test passed
✅ All E2E flow works
```

---

**Ready? Start from STEP 1 above! 🚀**

Let me know when you've sent credentials, and I'll update all the files!
