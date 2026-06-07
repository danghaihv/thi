# Hướng dẫn cấu hình Sepay Webhook cho thanh toán tự động

## 1. Cấu hình tài khoản ngân hàng trong hệ thống

Đăng nhập vào tài khoản Admin, vào **Cài đặt hệ thống** (Settings) và cấu hình:

```
- Mã ngân hàng SePay: ví dụ "970" (ACB), "970" (VCB), "970" (Vietcombank)
- Số tài khoản: số tài khoản nhận tiền
- Chủ tài khoản: tên người thụ hưởng
- API Key SePay: lấy từ Sepay.vn
```

Lưu các giá trị vào Firestore: `settings/global`:
```javascript
{
  sepayBankId: "970",
  sepayAccountNo: "1234567890",
  sepayAccountName: "Trần Văn A",
  sepayApiKey: "your_sepay_api_key",
  sepayWebhookToken: "your_webhook_secret_token",
  vip1MonthPrice: 50000,
  vip6MonthPrice: 240000,
  vip1YearPrice: 450000
}
```

## 2. Tạo Webhook trên Sepay.vn

Truy cập [https://sepay.vn/](https://sepay.vn/) -> Webhooks (Cổng phía sau):

### Cấu hình webhook
- **URL**: `https://yourdomain.com/api/webhook/sepay`
- **Method**: POST
- **Content-Type**: application/json
- **Secret Token**: `your_webhook_secret_token` (phải khớp với `sepayWebhookToken`)

### Sự kiện lắng nghe
- ✅ Transfer received (Nhận tiền)
- ✅ Transaction completed (Giao dịch hoàn tất)

### Payload Format
Sepay sẽ gửi POST request với body:
```json
{
  "id": "tx_12345",
  "content": "HMATH...",
  "transferAmount": 50000,
  "transactionDate": "2024-06-08T10:30:00",
  "senderAccount": "1234567890",
  "referenceCode": "SEPAY123456"
}
```

## 3. Cách hoạt động tự động

### Flow thanh toán:
1. **Học sinh click "Nâng cấp"** → Hệ thống tạo hóa đơn với memo duy nhất
2. **Hiển thị mã QR** → Học sinh quét và chuyển khoản
3. **Webhook nhận tiền** → `/api/webhook/sepay` xử lý
4. **Tự động xác nhận** → Cập nhật `vipExpiry` trong profile học sinh
5. **Thông báo thành công** → UI update tự động

### Memo Format
```
HMATH<TEN_HOC_SINH><RANDOM_CODE>
Ví dụ: HMATHTHANHQUANG5A2C
```

## 4. Environment Variables cần thiết

```env
# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=your_project
FIREBASE_ADMIN_CLIENT_EMAIL=your_email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Sepay
SEPAY_WEBHOOK_TOKEN=your_webhook_secret_token
SEPAY_API_KEY=your_sepay_api_key

# Payment
PAYMENT_CODE_PREFIX=HMATH
```

## 5. Kiểm tra kết nối

### Test webhook:
```bash
curl -X POST https://yourdomain.com/api/webhook/sepay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_webhook_secret_token" \
  -d '{
    "id": "test_123",
    "content": "HMATHTHANHQUANG5A2C",
    "transferAmount": 50000,
    "transactionDate": "2024-06-08T10:30:00"
  }'
```

Phản hồi thành công:
```json
{
  "success": true,
  "message": "Đã xử lý webhook và nâng cấp VIP thành công."
}
```

### Test tạo hóa đơn:
```bash
curl -X POST http://localhost:5173/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "packType": "1m",
    "planCode": "vip_1m"
  }'
```

Phản hồi:
```json
{
  "success": true,
  "intentId": "pi_1234567890_abcdef",
  "memo": "HMATHTHANHQUANG5A2C",
  "amount": 50000,
  "bankId": "970",
  "accountNo": "1234567890",
  "accountName": "Trần Văn A"
}
```

## 6. Xử lý lỗi

### Lỗi: "db.collection is not a function"
- ✅ **Đã sửa** trong `api/payment/create.ts`
- Kiểm tra Firebase Admin initialization

### Lỗi: "Không tìm thấy hóa đơn chờ xử lý"
- Memo không khớp giữa hóa đơn và webhook
- Kiểm tra `settingsData.sepayApiKey` được cấu hình

### Lỗi: "Số tiền nhận được nhỏ hơn hóa đơn"
- Học sinh chuyển thiếu tiền
- Webhook sẽ tự động reject

## 7. Kiểm tra logs

### Server logs:
```bash
tail -f logs/server.log | grep "SePay"
```

### Console logs (trong browser):
- Mở DevTools → Console tab
- Tìm messages với prefix `[v0]`

## 8. Tài liệu tham khảo

- [SePay Documentation](https://docs.sepay.vn/)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Vercel Deployment](https://vercel.com/docs)

---

**Lưu ý**: Đảm bảo webhook URL công khai và trả về HTTP 200 để Sepay biết đã nhận thành công.
