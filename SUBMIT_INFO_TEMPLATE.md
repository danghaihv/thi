# Template: Thông tin cần gửi cho V0

> Gửi thông tin này cho v0 sau khi đã gather từng item

---

## 📋 Firebase Configuration

### Client Config (Từ firebase-applet-config.json hoặc Firebase Console)
```
apiKey: ___________________________________
projectId: ___________________________________
authDomain: ___________________________________
appId: ___________________________________
storageBucket: ___________________________________
messagingSenderId: ___________________________________
```

### Admin Service Account (Từ Firebase Console → Service Accounts)
```
ATTACH FILE: service-account.json

HOẶC paste các field này:

project_id: ___________________________________
private_key_id: ___________________________________
private_key: ___________________________________
client_email: ___________________________________
```

---

## 🔑 Sepay Credentials (Từ Sepay Dashboard)

### API Configuration
```
SEPAY_API_KEY: ___________________________________
SEPAY_WEBHOOK_SECRET: ___________________________________
SEPAY_WEBHOOK_TOKEN: ___________________________________
```

### Bank Account Info
```
Tên ngân hàng: ___________________________________
Số tài khoản: ___________________________________
Tên chủ tài khoản: ___________________________________
```

---

## 🌐 Domain Info

```
Production Domain: ___________________________________
Vercel Project Name: ___________________________________
GitHub Repo: danghaihv/thi
GitHub Branch: v0/payment-automation-c83c2f88
```

---

## ✅ Verification Checklist

Trước khi gửi, verify:

- [ ] Firebase client config complete (7 fields)
- [ ] Firebase admin service account valid
- [ ] Sepay API key valid
- [ ] Sepay webhook secret valid
- [ ] Bank account info correct
- [ ] Domain name correct

---

## 📝 Ghi chú thêm

```
Ghi chú:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 🚀 Cách gửi

**Option 1: Copy-paste trực tiếp**
- Copy template này
- Điền đầy đủ thông tin
- Gửi cho v0 trong chat

**Option 2: Gửi files**
- Gửi service-account.json (GIỮ AN TOÀN)
- Gửi screenshot Sepay config
- Gửi domain info

---

## ⚠️ SECURITY REMINDER

❌ **KHÔNG:**
- Commit .env file
- Commit service-account.json
- Share private keys publicly
- Use real bank account với payment code prefix dễ đoán

✅ **LÀM:**
- Giữ private key an toàn
- Chỉ share thông tin cần thiết
- Set webhook secret mạnh
- Review Firestore rules

---

**Khi hoàn thành template này, báo cho tôi để cập nhật project!**
