# Bắt đầu nhanh với SePay Webhooks

## Tích hợp SePay Webhooks trong vài phút: tạo webhook đầu tiên, viết endpoint xử lý payload và kiểm tra bằng một giao dịch ngân hàng thật.

<Callout type="info" title="Cần test trước?">
Dùng 
Test mode
 để thử webhook bằng giao dịch mô phỏng mà không cần chuyển tiền thật.
</Callout>

SePay gửi HTTP POST đến URL của bạn mỗi khi có giao dịch. Endpoint của bạn nhận request, xử lý xong rồi trả status `200`.

## 1. Viết endpoint nhận webhook

### Tổng quan luồng tích hợp

<!-- No code tabs available -->

Deploy code lên một URL thực tế (có thể truy cập được từ Internet). Bắt buộc HTTPS khi chạy production, còn nếu chỉ test thì HTTP vẫn được.

## 2. Tạo webhook

Dashboard → **[Webhooks](https://my.sepay.vn/webhooks)** → **Thêm webhook**:

| Trường               | Giá trị             |
| -------------------- | ------------------- |
| Tên                  | Tuỳ ý               |
| URL                  | Endpoint vừa deploy |
| Loại giao dịch       | Tất cả              |
| Tài khoản ngân hàng  | Tất cả tài khoản    |
| Phương thức xác thực | Không xác thực      |

Sau khi lưu, mở menu **⋮** trên dòng webhook vừa tạo rồi bấm **Gửi thử**. Nếu kết quả là **Thành công** nghĩa là URL của bạn đã nhận được webhook.

## 3. Test với giao dịch thật

Chuyển một số tiền nhỏ (ví dụ 10.000₫) vào tài khoản ngân hàng bạn đã liên kết SePay. SePay gửi webhook đến endpoint của bạn trong vài giây.

Mở **Lịch sử gửi** rồi bấm dòng log mới nhất. Nếu Status hiện **Thành công** nghĩa là endpoint đã nhận webhook xong xuôi. Chuyển sang tab **Request** để xem payload (dữ liệu thực tế SePay gửi):

<Response title="Payload">
```json
{
  "id": 92704,
  "gateway": "Vietcombank",
  "transactionDate": "2024-07-02 11:08:33",
  "accountNumber": "1017588888",
  "subAccount": "",
  "code": null,
  "content": "NGUYEN VAN A chuyen tien",
  "transferType": "in",
  "transferAmount": 10000,
  "accumulated": 105010000,
  "referenceCode": "FT24012345678"
}
```
</Response>

Giải thích đầy đủ từng field: [Tích hợp webhook](./tich-hop-webhook#payload).

<Callout type="warn" title="Trước khi chạy production">
Bật xác thực HMAC-SHA256, chống trùng lặp dùng trường 
`id`
, và kiểm tra 
`transferAmount`
 trước khi xử lý. Xem 
Tích hợp webhook
 để biết đầy đủ.
</Callout>

## Tiếp theo

* [Tài khoản ngân hàng](./tai-khoan-ngan-hang): ngân hàng hỗ trợ, VA, tiền vào/ra
* [Tích hợp webhook](./tich-hop-webhook): payload đầy đủ, phản hồi hợp lệ, chống trùng lặp, code mẫu MySQL
* [Xác thực](./xac-thuc): HMAC-SHA256, API Key, OAuth 2.0
* [Webhook không gửi?](./xu-ly-loi#chan-doan-webhook-khong-gui): checklist chẩn đoán
* [Đối soát giao dịch](./doi-soat-giao-dich): không bỏ sót giao dịch nào