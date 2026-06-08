# ✅ PRE-DEPLOYMENT CHECKLIST

## 📋 Kiểm Tra Trước Khi Push GitHub

### 🔧 CODE QUALITY

- [ ] Chạy lint: `npm run lint`
- [ ] Không có TypeScript errors
- [ ] Không có console.log debug (ngoài [v0])
- [ ] Tất cả imports valid
- [ ] Không có commented code

### 🔐 SECURITY

- [ ] `.env` file **KHÔNG** được push lên GitHub
- [ ] `service-account.json` **KHÔNG** được push
- [ ] Private keys chỉ ở `.env.local` hoặc Vercel env vars
- [ ] Không có credentials trong code
- [ ] `.gitignore` include: `.env`, `.env.local`, `service-account.json`

### 📦 DEPENDENCIES

- [ ] `npm install` chạy thành công
- [ ] Không có outdated packages
- [ ] Không có security vulnerabilities: `npm audit`
- [ ] Tất cả packages được lock (package-lock.json)

### 🗄️ DATABASE

- [ ] Firebase project: `hmath-exam` selected
- [ ] Collection `settings` được tạo
- [ ] Document `settings/global` được tạo với đầy đủ fields
- [ ] Collection `payment_intents` được tạo
- [ ] Firestore Rules được update (security)
- [ ] Database connection test thành công

### 🌐 API ENDPOINTS

- [ ] POST `/api/payment/create` - tạo hóa đơn
- [ ] GET `/api/payment/verify` - kiểm tra trạng thái
- [ ] POST `/api/webhook/sepay` - nhận webhook

Kiểm tra bằng:
```bash
# Terminal 1
npm run dev

# Terminal 2 - Test create
curl -X POST http://localhost:5173/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","packType":"1m"}'

# Terminal 2 - Test webhook
node test-sepay-webhook.js http://localhost:5173/api/webhook/sepay HMATHTHANHQUANG5A2C 50000 token
```

### 🎯 UI/UX

- [ ] Payment modal hiển thị đúng
- [ ] QR code hiển thị
- [ ] Transfer info hiển thị (bank, account, memo)
- [ ] Auto-polling thực thi (mỗi 3 giây)
- [ ] Success message hiển thị khi thanh toán
- [ ] Error message rõ ràng

### ⚙️ CONFIGURATION

**Firebase:**
- [ ] `VITE_FIREBASE_API_KEY` được set
- [ ] `VITE_FIREBASE_PROJECT_ID=hmath-exam`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` correct

**Backend:**
- [ ] `FIREBASE_ADMIN_PROJECT_ID` được set
- [ ] `FIREBASE_ADMIN_CLIENT_EMAIL` được set
- [ ] `FIREBASE_ADMIN_PRIVATE_KEY` được set

**Sepay:**
- [ ] `SEPAY_API_KEY` được set
- [ ] `SEPAY_BANK_ID=MSB`
- [ ] `SEPAY_ACCOUNT_NO=96886693006504`
- [ ] `SEPAY_ACCOUNT_NAME=PHAM DANG HAI`
- [ ] `WEBHOOK_URL=https://thi-hmath.vercel.app/api/webhook/sepay`

### 🧪 LOCAL TESTING

- [ ] `npm run dev` starts without errors
- [ ] Frontend loads correctly
- [ ] Can create payment intent
- [ ] API returns correct format
- [ ] Webhook can be triggered (test script)
- [ ] No console errors (F12)

### 📊 VERCEL SETUP

- [ ] Project connected: `thi-hmath`
- [ ] Environment variables set in Vercel Dashboard
- [ ] Build command correct: `npm run build`
- [ ] Output directory: `dist`

### 📝 FILES READY

Code files:
- [ ] `/api/payment/create.ts` - ✅
- [ ] `/api/payment/verify.ts` - ✅
- [ ] `/api/webhook/sepay.ts` - ✅
- [ ] `/src/views/StudentUpgradeHub.tsx` - ✅
- [ ] `/api/payment/_shared.ts` - ✅
- [ ] `/api/payment/_admin.ts` - ✅

Configuration:
- [ ] `.env` - Ready
- [ ] `firebase-applet-config.json` - ✅
- [ ] `.gitignore` - Updated

Documentation:
- [ ] `FINAL_SETUP_GUIDE.md` - ✅
- [ ] `FIRESTORE_SETUP.md` - ✅
- [ ] `API_DOCS.md` - ✅
- [ ] `QUICK_START.md` - ✅

---

## 🚀 DEPLOYMENT PROCESS

### Step 1: Final Code Check
```bash
cd /vercel/share/v0-project
npm run lint
npm run build
```

### Step 2: Git Commit
```bash
git add -A
git commit -m "feat: complete payment system with sepay webhooks

- Fixed db.collection error in payment creation
- Added payment verification API endpoint
- Integrated Sepay webhook processing
- Added auto-polling for payment status
- Configured Firebase Admin & Sepay credentials
- Updated Firestore collections & rules
- Added comprehensive documentation"
```

### Step 3: Push to GitHub
```bash
git push origin v0/pdanghaimmo-1016-175f4cd7
```

### Step 4: Vercel Auto-Deploy
- Vercel will auto-deploy when push detected
- Check deployment status in Vercel Dashboard

### Step 5: Verify Production
- Visit: https://thi-hmath.vercel.app
- Test payment flow
- Check logs in Vercel

---

## 📋 VERIFICATION CHECKLIST BEFORE "READY TO PUSH"

**Read each section above and check all items:**

- [ ] CODE QUALITY - All items checked
- [ ] SECURITY - All items checked  
- [ ] DEPENDENCIES - All items checked
- [ ] DATABASE - All items checked
- [ ] API ENDPOINTS - All items checked
- [ ] UI/UX - All items checked
- [ ] CONFIGURATION - All items checked
- [ ] LOCAL TESTING - All items checked
- [ ] VERCEL SETUP - All items checked
- [ ] FILES READY - All items checked

---

## 🎉 IF ALL ITEMS CHECKED

**You can push to GitHub with confidence! ✅**

```bash
# Final push
git push origin v0/pdanghaimmo-1016-175f4cd7

# Then tell me:
# "V0, checklist complete! Ready to deploy! 🚀"
```

---

## ❌ IF ANY ITEM NOT CHECKED

**DO NOT PUSH YET!**

1. Go back to that section
2. Fix the issue
3. Test again
4. Check the item
5. Continue to next item

---

## 📞 NEED HELP?

- Check error message carefully
- Search in documentation files
- Ask me with exact error/issue
- I'll help you fix it!

---

**LAST STEP: Run this command before push:**

```bash
npm run build && npm run lint
```

**If both succeed → READY TO PUSH! 🚀**
