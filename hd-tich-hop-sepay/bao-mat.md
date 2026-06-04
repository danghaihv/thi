# Bảo mật webhook SePay thế nào?

## Checklist bảo mật endpoint webhook SePay: HTTPS, whitelist IP, xác thực HMAC-SHA256, chống replay attack và validate dữ liệu trước khi xử lý.

## Checklist

* [ ] Dùng HTTPS
* [ ] Bật xác thực HMAC-SHA256
* [ ] Whitelist [IP SePay](/vi/dia-chi-ip)
* [ ] Kiểm tra trùng lặp giao dịch
* [ ] Validate số tiền, tài khoản
* [ ] [Đối soát định kỳ](./doi-soat-giao-dich)

## Yêu cầu URL

Webhook URL phải gọi được từ Internet công khai:

* Bắt buộc dùng HTTPS, không chấp nhận HTTP
* Domain phải phân giải DNS ra IP public
* Không chấp nhận IP nội bộ (`localhost`, `127.0.0.1`, `10.x`, `172.16-31.x`, `192.168.x`) hay các dải IP reserved

URL không đạt sẽ bị từ chối khi lưu webhook.

Dùng chứng chỉ SSL hợp lệ (có thể xin miễn phí qua Let's Encrypt). Không nên dùng chứng chỉ self-signed. CA chain (chuỗi chứng chỉ trung gian) phải đầy đủ.

## Xác thực chữ ký

Luôn kiểm tra chữ ký ở mọi request. Khuyến nghị dùng [HMAC-SHA256](/vi/sepay-webhooks/xac-thuc#hmac-sha256). Tối thiểu cũng phải có [API Key](/vi/sepay-webhooks/xac-thuc#api-key).

<Callout type="warn">
Không nên chấp nhận webhook mà không xác thực. Bất kỳ ai biết URL đều có thể gửi payload giả.
</Callout>

## IP Whitelist

Chỉ cho phép request từ IP SePay. Danh sách IP xem tại [Địa chỉ IP](/vi/dia-chi-ip). Cấu hình ở firewall hoặc middleware.

## Chống replay attack

Nếu dùng HMAC-SHA256, kiểm tra thêm `X-SePay-Timestamp`. Từ chối request có timestamp cách hiện tại quá 5 phút để chặn kẻ tấn công gửi lại request cũ. Đồng hồ server lệch quá nhiều thì bật NTP để đồng bộ tự động.

## Validate dữ liệu

Trước khi xác nhận thanh toán, hãy kiểm tra:

* `transferAmount` có đúng số tiền đơn hàng không
* `accountNumber` có phải tài khoản của bạn không
* `code` có khớp mã thanh toán đơn hàng không

Cần chắc chắn hơn thì gọi [API giao dịch](/vi/sepay-api/v2/giao-dich/danh-sach) để đối chiếu.

## Lưu raw payload

Lưu toàn bộ payload gốc vào database trước khi xử lý. Sau này cần debug, audit, hay đối soát đều có sẵn dữ liệu.

## Đối soát định kỳ

Webhook có thể mất nếu endpoint sập quá 5 giờ. Nên chạy cron 15-30 phút một lần, gọi API lấy giao dịch, so với database, bổ sung giao dịch thiếu. Chi tiết xem [Đối soát giao dịch](/vi/sepay-webhooks/doi-soat-giao-dich).

## Tiếp theo

* [Giám sát](./giam-sat): lịch sử gửi, cảnh báo, sự cố
* [Xử lý lỗi](./xu-ly-loi): lịch retry và chẩn đoán khi webhook không gửi
* [Đối soát giao dịch](./doi-soat-giao-dich): backup khi webhook mất