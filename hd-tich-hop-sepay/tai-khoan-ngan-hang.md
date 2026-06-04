# Ngân hàng nào hỗ trợ webhook SePay?

## Danh sách ngân hàng hỗ trợ webhook SePay (ACB, BIDV, MBBank, VPBank...), tính năng VA, tiền vào/ra và cách kết nối, chọn tài khoản cho webhook.

Webhook chỉ chạy được nếu tài khoản ngân hàng đã liên kết với SePay và ngân hàng hỗ trợ loại giao dịch đó. Bên dưới là danh sách ngân hàng nào làm được gì và cách cấu hình từng loại.

## Hai loại VA

**VA chính thức**: ngân hàng cấp cho bạn một số tài khoản VA riêng. Khách chuyển tiền trực tiếp vào số VA đó, ngân hàng và SePay nhận diện giao dịch theo số đó.

**VA nội dung (TKP)**: không có số tài khoản riêng. Khách chuyển vào tài khoản chính của bạn, kèm mã TKP trong nội dung chuyển khoản. SePay đối soát theo nội dung để biết giao dịch thuộc về đâu.

| Loại                  | Có số tài khoản VA riêng? | Cách nhận diện giao dịch              |
| --------------------- | ------------------------- | ------------------------------------- |
| **VA chính thức**     | Có (mỗi VA một số)        | Theo số tài khoản VA khách chuyển vào |
| **VA nội dung (TKP)** | Không                     | Theo nội dung chuyển khoản            |

Cả hai loại đều cấu hình tại chi tiết tài khoản ngân hàng trên Dashboard. TKP là viết tắt của "Tài khoản phụ", dùng khi cần phân bổ giao dịch theo đơn hàng hoặc chi nhánh mà ngân hàng không cấp VA chính thức. Mã TKP nằm đâu trong nội dung chuyển khoản cũng được, miễn khớp với TKP đã cấu hình.

Ở phía webhook, cả hai loại đều nằm ở trường `subAccount` trong payload, server của bạn xử lý y hệt nhau.

## Ngân hàng hỗ trợ

| Ngân hàng    | VA chính thức | Tiền vào | Tiền ra | Ghi chú                                             |
| ------------ | ------------- | -------- | ------- | --------------------------------------------------- |
| ACB          | Có            | Có       | Không   |                                                     |
| BIDV         | Có (bắt buộc) | Có       | Không   | Không có tài khoản chính, phải qua VA               |
| MBBank       | Có            | Có       | Không   |                                                     |
| MSB          | Có (bắt buộc) | Có       | Không   | Không có tài khoản chính, phải qua VA               |
| KienlongBank | Có (bắt buộc) | Có       | Không   | Không có tài khoản chính, phải qua VA               |
| OCB          | Có (bắt buộc) | Có       | Không   | Không có tài khoản chính, phải qua VA               |
| Sacombank    | Không         | Có       | Có      | Không cấp VA chính thức, dùng TKP                   |
| TPBank       | Không         | Có       | Có      | Không cấp VA chính thức, dùng TKP                   |
| VietinBank   | Có (chỉ DN)   | Có       | Có      | Tài khoản cá nhân không cấp VA chính thức, dùng TKP |
| VPBank       | Không         | Có       | Không   | Chỉ đồng bộ tiền vào                                |

Ngân hàng không có trong bảng thì chưa hỗ trợ webhook. Danh sách cập nhật mới nhất ở Dashboard → **[Tài khoản ngân hàng](https://my.sepay.vn/bankaccount)** → **Thêm tài khoản**.

Cột **VA chính thức** cho biết ngân hàng có cấp Virtual Account (VA) hay không. Nếu ngân hàng không cấp VA, bạn vẫn đối soát được bằng TKP (qua nội dung chuyển khoản).

## Liên kết tài khoản với SePay

Mỗi tài khoản cần liên kết trước khi webhook dùng được. Vào Dashboard → **[Tài khoản ngân hàng](https://my.sepay.vn/bankaccount)** → **Thêm tài khoản**.

**Bước 1**: Chọn ngân hàng, chọn loại (cá nhân hoặc doanh nghiệp), nhập số tài khoản.

**Bước 2**: Kết nối API. Điền thông tin đăng nhập internet banking hoặc kết nối qua OAuth (tuỳ ngân hàng). SePay chạy bước kiểm tra, thành công thì tài khoản chuyển sang trạng thái Hoạt động.

**Bước 3**: Tạo VA (nếu cần). Với BIDV, MSB, KienlongBank, OCB (cá nhân): bắt buộc ít nhất 1 VA. Ngân hàng khác chỉ tạo VA khi cần phân bổ giao dịch.

**Bước 4**: Kiểm tra. Trạng thái tài khoản phải là **Hoạt động** (chấm xanh). Chuyển số tiền nhỏ vào tài khoản, vào **Giao dịch** kiểm tra SePay có nhận được không.

<Callout type="warn" title="Tài khoản chưa kích hoạt thì không có webhook">
Tài khoản tạm ngưng hoặc mất kết nối sẽ không tạo giao dịch. Lúc này webhook không gửi không phải do webhook lỗi. Kiểm tra trạng thái tài khoản trước.
</Callout>

## Chọn tài khoản cho webhook

Khi tạo webhook, chọn 1 trong 2 chế độ:

**Tất cả tài khoản**: webhook nhận mọi giao dịch từ mọi tài khoản bạn đã liên kết. Thêm tài khoản mới sau này, webhook tự nhận luôn.

**Chọn cụ thể**: bạn chọn tài khoản nào gắn vào webhook. Giao diện gồm 2 cột, bên trái là những tài khoản chưa chọn, bên phải là tài khoản đã thêm. Bấm để thêm hoặc bấm **✕** để bỏ. Mở rộng một tài khoản đã chọn sẽ hiện phần cấu hình VA.

<Image src="/images/webhooks/bank-tree-selector.png" alt="Chọn tài khoản" caption="Giao diện chọn nhiều tài khoản ngân hàng" />

### Cấu hình VA cho từng ngân hàng

Mở rộng tài khoản đã chọn, bạn thấy:

<Image src="/images/webhooks/bank-tree-selector-expanded.png" alt="Cấu hình VA mở rộng" caption="Checkbox Tài khoản chính và danh sách VA trong tài khoản đã chọn" />

**Checkbox Tài khoản chính**: nếu bật thì webhook nhận mọi giao dịch trên tài khoản, kể cả những giao dịch không qua VA. Nếu tắt, webhook chỉ nhận khi giao dịch khớp với VA đã tick phía dưới.

**Danh sách VA**: tick từng VA cần theo dõi. Webhook chỉ gửi khi `subAccount` của giao dịch trùng VA đã chọn.

Với BIDV, MSB, KienlongBank, OCB: checkbox Tài khoản chính tự khoá (vì ngân hàng chỉ hỗ trợ VA), bắt buộc chọn ít nhất 1 VA.

<Callout type="info" title="Kết hợp linh hoạt">
Trong cùng một webhook, Ngân hàng A có thể nhận hết, còn Ngân hàng B chỉ nhận qua VA. Không cần tạo 2 webhook riêng.
</Callout>

## Lưu ý khi chọn Chỉ tiền ra

Loại **Tất cả** và **Chỉ tiền vào** dùng cho mọi ngân hàng. Riêng **Chỉ tiền ra** có hai điều kiện:

* **Ngân hàng**: chỉ Sacombank, TPBank, VietinBank hỗ trợ.
* **VA**: không dùng được VA chính thức, phải chuyển sang TKP.

Giao diện sẽ chặn và báo nếu bạn cố lưu cấu hình không hợp lệ.

## Ví dụ cấu hình

Công ty có 3 tài khoản: **Vietcombank** (VCB), **BIDV** và **Techcombank** (TCB). Yêu cầu:

* VCB: nhận mọi giao dịch.
* BIDV: chỉ nhận VA mã `ORDER001`.
* TCB: bỏ qua hoàn toàn.

Các bước:

1. Chế độ chọn: **Chọn cụ thể**.
2. Thêm VCB và BIDV vào cột đã chọn. Không thêm TCB.
3. Mở rộng VCB: bật **Tài khoản chính**.
4. Mở rộng BIDV: Tài khoản chính tự khoá (BIDV chỉ hỗ trợ VA), tick VA `ORDER001`.

Kết quả:

| Giao dịch                       | Webhook gửi?                  |
| ------------------------------- | ----------------------------- |
| Tiền vào VCB không qua VA       | Có                            |
| Tiền vào VCB qua VA bất kỳ      | Có                            |
| Tiền vào BIDV qua VA `ORDER001` | Có                            |
| Tiền vào BIDV qua VA `ORDER002` | Không                         |
| Tiền vào TCB                    | Không (không trong danh sách) |

## Tiếp theo

* [Tạo webhook](./tao-webhook): form 4 bước, bộ lọc và gửi thử
* [Tích hợp webhook](./tich-hop-webhook): payload và phản hồi hợp lệ
* [Webhook không gửi?](./xu-ly-loi): checklist chẩn đoán

<Callout type="warn">
Thay đổi cấu hình tài khoản có hiệu lực ngay với giao dịch tiếp theo. Giao dịch đã gửi trước đó không bị ảnh hưởng.
</Callout>