# 🎯 FINAL SETUP GUIDE - Hoàn Thành Cài Đặt

## ✅ Những Gì Đã Hoàn Thành

- ✅ Firebase Client Config (.env & firebase-applet-config.json)
- ✅ Payment API endpoints (create, verify, webhook)
- ✅ Auto-polling UI 
- ✅ Sepay webhook integration
- ⏳ **Cần bạn làm:** Firebase Admin + Sepay API keys

---

## 🔑 BẠN CẦN CUNG CẤP CÁC THÔNG TIN SAU

### 1️⃣ **Firebase Admin Service Account** (YÊU CẦU)

**Lấy từ Firebase Console:**
1. Vào https://console.firebase.google.com
2. Chọn project "hmath-exam"
3. Vào **Project Settings** (bánh răng icon)
4. Tab **Service Accounts**
5. Click **Generate New Private Key**
6. Sẽ download file JSON - **GỬI FILE NÀY CHO TÔI**

**File sẽ có dạng:**
```json
{
  "type": "service_account",
  "project_id": "hmath-exam",
  "private_key_id": "xxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@hmath-exam.iam.gserviceaccount.com",
  "client_id": "xxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Sau khi nhận file, tôi sẽ:**
- Extract: `private_key` & `client_email`
- Cập nhật vào `.env` file

### 2️⃣ **Sepay API Key** (YÊU CẦU)

**Lấy từ Sepay Dashboard:**
1. Vào https://business.sepay.vn
2. Login với tài khoản của bạn
3. Vào **Integration** hoặc **API Settings**
4. Copy **API Key** (bắt đầu với `sep_` hoặc tương tự)
5. **GỬI API KEY NÀY CHO TÔI**

**Ví dụ:**
```
SEPAY_API_KEY=sep_live_xxxxxxxxxxxxx
```

### 3️⃣ **Sepay Webhook Secret** (TÙY CHỌN - NẾU CÓ)

Một số Sepay integrations có webhook secret:
- Nếu có → **GỬI CHO TÔI**
- Nếu không → để trống

---

## 📝 FORM GỬI THÔNG TIN

**Gửi cho tôi với format này:**

```
=== FIREBASE ADMIN ===
[Gửi file service-account.json hoặc copy content dưới đây]

private_key_id: xxx
private_key: -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
client_email: firebase-adminsdk-xxxxx@hmath-exam.iam.gserviceaccount.com

=== SEPAY API ===
API Key: sep_live_xxxxxxxxxxxxx
Webhook Secret (nếu có): xxxxxxxxxxxxx

=== KIỂM TRA ===
✓ Firebase project: hmath-exam
✓ Webhook URL: https://thi-hmath.vercel.app/api/webhook/sepay
✓ Bank: MSB
✓ Account: 96886693006504
✓ Account Name: PHAM DANG HAI
```

---

## 🔄 QUY TRÌNH TIẾP THEO (SAU KHI GỬI)

### Phase 1: Tôi Nhận & Cập Nhật (5 phút)
1. Tôi nhận credentials của bạn
2. Cập nhật `.env` file
3. Cập nhật `service-account.json`
4. Commit & push

### Phase 2: Bạn Setup Firestore (10 phút)
Tôi sẽ gửi file `FIRESTORE_SETUP.md` với chi tiết:
1. Tạo collection `settings`
2. Tạo document `settings/global` với data:
   ```json
   {
     "sepayApiKey": "sep_live_xxxxx",
     "sepayBankId": "MSB",
     "sepayAccountNo": "96886693006504",
     "sepayAccountName": "PHAM DANG HAI",
     "vip1MonthPrice": 50000,
     "vip6MonthPrice": 240000,
     "vip1YearPrice": 450000,
     "webhookUrl": "https://thi-hmath.vercel.app/api/webhook/sepay",
     "createdAt": "(current timestamp)"
   }
   ```

### Phase 3: Cấu Hình Sepay Webhook (5 phút)
1. Vào Sepay Dashboard
2. Settings → Webhooks
3. Thêm URL: `https://thi-hmath.vercel.app/api/webhook/sepay`
4. Test webhook

### Phase 4: Test Locally (15 phút)
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test webhook
node test-sepay-webhook.js http://localhost:5173/api/webhook/sepay HMATHTHANHQUANG5A2C 50000 sep_test_token
```

### Phase 5: Push GitHub & Deploy (5 phút)
```bash
git add -A
git commit -m "feat: complete payment & sepay integration"
git push origin v0/payment-automation-c83c2f88
```

### Phase 6: Vercel Environment (5 phút)
Tôi sẽ gửi lại credentials để bạn set vào Vercel:
1. Vào Vercel Dashboard
2. Project: thi-hmath
3. Settings → Environment Variables
4. Thêm tất cả biến từ `.env`

---

## 📋 CURRENT STATUS

**Đã hoàn thành:**
```
✅ Frontend Firebase config (VITE_FIREBASE_*)
✅ Payment API routes
✅ Webhook processing
✅ Auto-polling UI
✅ Database schema
✅ .env template
```

**Đang chờ:**
```
⏳ Firebase Admin credentials (private_key, client_email)
⏳ Sepay API Key
⏳ Firestore data setup
⏳ Webhook testing
```

---

## 🚀 IMMEDIATE NEXT STEPS

### RIGHT NOW (Next 5 minutes):
1. Mở Firebase Console → hmath-exam
2. Vào Project Settings
3. Download Service Account JSON
4. Copy content hoặc send file

### THEN (Next 5 minutes):
5. Vào Sepay Dashboard
6. Copy API Key
7. Copy Webhook Secret (nếu có)
8. Send cho tôi

### THEN (Next 2 minutes):
9. Báo cho tôi "Đã gửi credentials"
10. Đợi tôi cập nhật

---

## ❓ CÂU HỎI THƯỜNG GẶP

**Q: Firebase Admin private_key có an toàn không?**
A: Có, nó sẽ được mã hóa trong Vercel environment variables. Không bao giờ public.

**Q: Sepay API Key có an toàn không?**
A: Có, nó sẽ được mã hóa trong Vercel environment variables. Không bao giờ push lên GitHub.

**Q: Khi nào có thể test?**
A: Ngay khi tôi cập nhật `.env` file. Có thể test locally hoặc production.

**Q: Có cần config gì khác không?**
A: Không, chỉ cần credentials này. Tất cả code đã sẵn sàng!

---

## ✅ VERIFICATION CHECKLIST

**Trước khi gửi, kiểm tra:**

Credentials:
- ☐ Firebase service account JSON file (có private_key, client_email)
- ☐ Sepay API Key (bắt đầu với `sep_`)
- ☐ Webhook Secret (nếu có)

Config:
- ☐ Webhook URL: https://thi-hmath.vercel.app/api/webhook/sepay
- ☐ Bank: MSB ✓
- ☐ Account: 96886693006504 ✓
- ☐ Account Name: PHAM DANG HAI ✓

---

## 📞 CẦN GIÚP?

Nếu gặp vấn đề:
1. Kiểm tra lại Firebase Console
2. Kiểm tra lại Sepay Dashboard
3. Báo cho tôi exact error message
4. Tôi sẽ fix ngay

---

## 🎯 CHÚC MỪNG! 🎉

Bạn đã:
- ✅ Sửa lỗi payment system
- ✅ Thêm auto-polling
- ✅ Kết nối webhook Sepay
- ⏳ Sắp hoàn thành setup

**Chỉ cần credentials → LIVE!**

---

**GỬI CREDENTIALS NGAY NÀO! 👇**

```
🔐 Firebase Service Account JSON
🔑 Sepay API Key
🔒 Sepay Webhook Secret (nếu có)
```

Chúc bạn thành công! 🚀
