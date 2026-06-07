# 🔥 FIRESTORE DATABASE SETUP

## Tạo Collections & Documents

### 1️⃣ Tạo Collection `settings`

**Bước:**
1. Vào Firebase Console → hmath-exam
2. Vào **Firestore Database**
3. Click **Create collection**
4. Collection name: `settings`
5. Click **Next**

### 2️⃣ Tạo Document `settings/global`

**Bước:**
1. Trong collection `settings`
2. Click **Add document**
3. Document ID: `global`
4. Thêm fields (click **Add field** cho mỗi field):

| Field Name | Type | Value |
|-----------|------|-------|
| `sepayApiKey` | string | `sep_live_xxxxx` (từ Sepay) |
| `sepayBankId` | string | `MSB` |
| `sepayAccountNo` | string | `96886693006504` |
| `sepayAccountName` | string | `PHAM DANG HAI` |
| `vip1MonthPrice` | number | `50000` |
| `vip6MonthPrice` | number | `240000` |
| `vip1YearPrice` | number | `450000` |
| `webhookUrl` | string | `https://thi-hmath.vercel.app/api/webhook/sepay` |
| `webhookSecret` | string | `(webhook secret từ Sepay)` |
| `createdAt` | timestamp | `(current time)` |
| `updatedAt` | timestamp | `(current time)` |

**Ví dụ JSON Structure:**
```json
{
  "sepayApiKey": "sep_live_xxxxxxxxxxxxx",
  "sepayBankId": "MSB",
  "sepayAccountNo": "96886693006504",
  "sepayAccountName": "PHAM DANG HAI",
  "vip1MonthPrice": 50000,
  "vip6MonthPrice": 240000,
  "vip1YearPrice": 450000,
  "webhookUrl": "https://thi-hmath.vercel.app/api/webhook/sepay",
  "webhookSecret": "secret_key_here",
  "createdAt": "2024-06-08T10:00:00Z",
  "updatedAt": "2024-06-08T10:00:00Z"
}
```

### 3️⃣ Tạo Collection `payment_intents`

**Bước:**
1. Click **Create collection**
2. Collection name: `payment_intents`
3. Document ID: auto (click **Auto ID**)

**Document Structure:**
```json
{
  "userId": "student_uid",
  "intentId": "unique_intent_id",
  "memo": "HMATHTHANHQUANG5A2C",
  "amount": 50000,
  "status": "pending",
  "planCode": "vip_1m",
  "days": 30,
  "sepayTxId": "",
  "createdAt": "2024-06-08T10:00:00Z",
  "expiresAt": "2024-06-15T10:00:00Z",
  "fulfilledAt": null,
  "vipExpiry": null
}
```

### 4️⃣ Cập Nhật Collection `users`

**Thêm fields vào mỗi user document:**

| Field Name | Type | Value |
|-----------|------|-------|
| `vipExpiry` | timestamp | `(khi nào hết hạn VIP)` |
| `vipActive` | boolean | `true/false` |
| `lastPaymentId` | string | `intent_id` |

**Ví dụ:**
```json
{
  "uid": "user_uid",
  "fullName": "Thanh Quang",
  "email": "thanh@example.com",
  "vipExpiry": "2025-06-08T10:00:00Z",
  "vipActive": true,
  "lastPaymentId": "intent_12345",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## 🔐 Firestore Security Rules

**Thêm rules để bảo vệ data:**

1. Vào **Firestore Database** → **Rules**
2. Replace tất cả code bằng dưới đây:

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Settings - only admin can read/write
    match /settings/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend via admin SDK
    }
    
    // Payment Intents - users can read own intents
    match /payment_intents/{intent} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if false; // Only backend via admin SDK
    }
    
    // Users - users can read own profile
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

---

## ✅ VERIFICATION CHECKLIST

**Kiểm tra đã tạo đúng:**

- ☐ Collection `settings` được tạo
- ☐ Document `settings/global` được tạo
- ☐ Tất cả fields trong `settings/global` được điền
- ☐ Collection `payment_intents` được tạo
- ☐ Collection `users` có fields `vipExpiry`, `vipActive`
- ☐ Firestore Rules được update
- ☐ Test read `settings/global` từ app

---

## 🧪 TEST FIRESTORE

**Sau khi setup, test như sau:**

### Local Test:
```bash
# 1. Start dev server
npm run dev

# 2. Mở browser console (F12)
# 3. Kiểm tra logs:
# - Nếu có "✓ Settings loaded" → OK
# - Nếu có "✗ Error reading settings" → Check rules/data
```

### Firebase Console Test:
```bash
# 1. Vào Firebase Console
# 2. Firestore Database
# 3. Click "settings" collection
# 4. Click "global" document
# 5. Verify data được hiển thị đúng
```

---

## 📝 NOTES

- **Sepay API Key:** Tuyệt đối bảo mật! Chỉ lưu trong Firestore, không public
- **Webhook Secret:** Nếu có, dùng để verify webhook từ Sepay
- **VIP Prices:** Có thể update mà không cần redeploy
- **Webhook URL:** Phải match với URL trong Sepay Dashboard

---

## ❌ COMMON ERRORS

**Error: "Permission denied"**
- Kiểm tra: Firestore Rules có allow read?
- Fix: Update rules như trên

**Error: "settings/global not found"**
- Kiểm tra: Document được tạo?
- Fix: Tạo document settings/global

**Error: "Invalid API Key"**
- Kiểm tra: sepayApiKey đúng format?
- Fix: Copy lại từ Sepay Dashboard

---

**DONE! Firestore setup hoàn thành! ✅**

Bây giờ chỉ cần:
1. Update `.env` với Firebase Admin credentials
2. Cập nhật Sepay API Key trong `settings/global`
3. Cấu hình webhook trong Sepay
4. Test & deploy!
