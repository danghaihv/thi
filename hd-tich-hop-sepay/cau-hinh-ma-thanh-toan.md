# Cấu hình mã thanh toán cho Webhook SePay

## Cấu hình mã thanh toán Webhook SePay tại my.sepay.vn: tiền tố và độ dài hậu tố để hệ thống tự bóc tách trường code từ nội dung giao dịch và lọc webhook theo mã.

Cấu hình mã thanh toán định nghĩa các mẫu tiền tố và độ dài hậu tố mà SePay dùng để bóc tách trường `code` từ nội dung chuyển khoản của giao dịch ngân hàng. Khi mẫu khớp, `code` được gắn vào payload webhook và áp dụng được cho bộ lọc **Chỉ gửi khi có mã thanh toán** và **Lọc theo mã thanh toán** trên từng webhook.

<Callout type="info" title="Tóm tắt">
Vị trí: 
Cấu hình Công ty
 → 
Cấu hình chung
 → 
Cấu trúc mã thanh toán
Bật/tắt nhận diện mã thanh toán toàn cục cho tài khoản công ty
Mỗi tài khoản công ty có nhiều mẫu mã; mẫu đầu tiên là mặc định, không xoá được
Áp dụng cho mọi giao dịch ngân hàng thật và mọi webhook đang hoạt động
</Callout>

## Mở trang Cấu hình chung

Vào **my.sepay.vn** → **Cấu hình Công ty** → **Cấu hình chung**. Cuộn xuống phần **Nhận diện mã thanh toán** và **Cấu trúc mã thanh toán**.

<Callout type="tip" title="Truy cập nhanh qua tìm kiếm">
Mở thanh tìm kiếm (
`Cmd K`
 / 
`Ctrl K`
) trên 
my.sepay.vn
, gõ 
`mã thanh toán`
 rồi chọn kết quả 
Cấu trúc mã thanh toán
 để nhảy thẳng tới phần cấu hình mà không cần đi qua menu.
</Callout>

<Image src="/images/webhooks/truy-cap-nhanh-cau-truc-ma-thanh-toan.png" alt="Tìm kiếm Cấu trúc mã thanh toán bằng phím tắt trên my.sepay.vn" caption="Gõ mã thanh toán trong thanh tìm kiếm để mở nhanh trang Cấu trúc mã thanh toán" />

<Image src="/images/webhooks/trang-cau-hinh-ma-thanh-toan.png" alt="Trang Cấu hình chung phần Cấu trúc mã thanh toán trên my.sepay.vn" caption="Phần Nhận diện mã thanh toán và danh sách Cấu trúc mã thanh toán" />

## Bật nhận diện mã thanh toán

Phần **Nhận diện mã thanh toán** có hai lựa chọn:

| Trạng thái                                                     | Tác dụng                                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| <span style={{whiteSpace: 'nowrap'}}>**Bật** (mặc định)</span> | SePay quét nội dung chuyển khoản theo các mẫu đang hoạt động; trường `code` trong payload webhook được điền nếu khớp |
| <span style={{whiteSpace: 'nowrap'}}>**Tắt**</span>            | SePay không quét; `code` luôn rỗng dù nội dung có chứa mã hợp lệ                                                     |

Bộ lọc webhook **Chỉ gửi khi có mã thanh toán** và **Lọc theo mã thanh toán** chỉ có ý nghĩa khi mục này đang **Bật**.

## Trường trong mỗi mẫu mã

Mỗi mẫu là một thẻ có 4 trường + một công tắc trạng thái:

| Trường                                                              | Bắt buộc | Mô tả                                                                                                  |
| ------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| <span style={{whiteSpace: 'nowrap'}}>Tiền tố</span>                 | Có       | Phần đầu của mã (ví dụ `DH`, `HD`). Tối thiểu 2, tối đa 5 ký tự. Hệ thống tự đổi sang chữ hoa khi lưu. |
| <span style={{whiteSpace: 'nowrap'}}>Độ dài hậu tố tối thiểu</span> | Có       | Số ký tự tối thiểu sau tiền tố. Khoảng 1-30. Mặc định 6.                                               |
| <span style={{whiteSpace: 'nowrap'}}>Độ dài hậu tố tối đa</span>    | Có       | Số ký tự tối đa sau tiền tố. Khoảng 1-30, phải ≥ giá trị tối thiểu. Mặc định 8.                        |
| <span style={{whiteSpace: 'nowrap'}}>Loại ký tự</span>              | Có       | **Số nguyên** (chỉ chữ số 0-9) hoặc **Số và chữ** (chữ số và chữ cái A-Z).                             |
| <span style={{whiteSpace: 'nowrap'}}>Trạng thái</span>              | Không    | Công tắc **Đang hoạt động** / **Ngưng hoạt động**. Chỉ mẫu đang hoạt động được dùng để nhận diện.      |

Ô **Ví dụ** ngay trong thẻ tự cập nhật theo cấu hình hiện tại (ví dụ tiền tố `DH` + hậu tố 6 ký tự **Số nguyên** sinh ví dụ `DH111111`).

<Image src="/images/webhooks/vi-du-tao-tien-to-ma-thanh-toan.png" alt="Thẻ cấu hình một mẫu mã thanh toán trên my.sepay.vn" caption="Thẻ mẫu mã thanh toán mặc định với tiền tố DH" />

## Thêm, sửa, xoá mẫu mã

| Thao tác                                                  | Cách thực hiện                                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| <span style={{whiteSpace: 'nowrap'}}>Thêm mẫu mới</span>  | Chọn **+ Thêm mẫu mã** ở cuối danh sách. Thẻ mới mở rộng sẵn để điền.                                       |
| <span style={{whiteSpace: 'nowrap'}}>Sửa mẫu</span>       | Mở rộng thẻ, sửa các trường, chọn **Lưu lại** ở cuối trang để áp dụng.                                      |
| <span style={{whiteSpace: 'nowrap'}}>Xoá mẫu</span>       | Chọn biểu tượng xoá ở góc thẻ. **Mẫu đầu tiên (huy hiệu Mẫu mặc định) không xoá được**, chỉ có thể tắt.     |
| <span style={{whiteSpace: 'nowrap'}}>Tạm ngưng mẫu</span> | Tắt công tắc **Đang hoạt động** trong thẻ rồi chọn **Lưu lại**. Mẫu vẫn còn nhưng không tham gia nhận diện. |

Sau khi sửa, bấm **Lưu lại** ở cuối trang. Hệ thống hiển thị thông báo "Lưu cấu hình thành công" khi xong.

## Cách SePay nhận diện mã từ nội dung giao dịch

Khi giao dịch ngân hàng về, hệ thống quét nội dung chuyển khoản theo các mẫu đang hoạt động, theo thứ tự khai báo. Quy trình:

1. Lấy mẫu đầu tiên (đang hoạt động).
2. Tìm trong nội dung chuỗi khớp với `<tiền tố><số ký tự từ tối thiểu đến tối đa thuộc loại ký tự>`. Tiền tố không phân biệt hoa/thường.
3. Nếu khớp, gắn chuỗi đó vào trường `code` của payload webhook và dừng.
4. Nếu không khớp, thử mẫu tiếp theo. Hết mẫu mà không khớp → `code` rỗng.

| Cấu hình mẫu                            | Nội dung chuyển khoản          | `code` trích được          |
| --------------------------------------- | ------------------------------ | -------------------------- |
| Tiền tố `DH`, hậu tố 6-8, **Số nguyên** | `DH123456 thanh toan don hang` | `DH123456`                 |
| Tiền tố `DH`, hậu tố 6-8, **Số nguyên** | `dh999999 thanh toan`          | `DH999999`                 |
| Tiền tố `DH`, hậu tố 6-8, **Số nguyên** | `DH123 thanh toan`             | (rỗng — hậu tố ngắn hơn 6) |
| Tiền tố `DH`, hậu tố 6-8, **Số nguyên** | `Chuyen tien sinh hoat`        | (rỗng)                     |
| Tiền tố `HD`, hậu tố 4-6, **Số và chữ** | `HD12AB chuyen khoan`          | `HD12AB`                   |

## Áp dụng cho bộ lọc webhook

Khi tạo webhook, có hai bộ lọc dựa vào trường `code`:

| Bộ lọc                           | Tác dụng                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| **Chỉ gửi khi có mã thanh toán** | Webhook bỏ qua giao dịch không có `code` (nội dung không khớp mẫu nào)                       |
| **Lọc theo mã thanh toán**       | Webhook chỉ gửi khi `code` bắt đầu bằng một trong các tiền tố đã chọn (lấy từ danh sách mẫu) |

Chi tiết: [Tạo webhook](./tao-webhook).

## Test trước khi áp dụng

Cấu hình mã thanh toán Live và Test mode tách biệt. Khi muốn thử nghiệm một mẫu mới mà chưa muốn áp dụng cho giao dịch thật:

1. Bật Test mode trên sidebar
2. Vào [Cấu hình Test mode](/vi/tien-ich-khac/test-mode/cau-hinh) tạo mẫu giống cấu hình dự kiến
3. Mô phỏng giao dịch với nội dung mẫu để kiểm tra `code` trong payload webhook
4. Sau khi thoả mãn, copy cấu hình sang Live

## Tiếp theo

* [Tạo webhook](./tao-webhook): bộ lọc **Chỉ gửi khi có mã thanh toán** và **Lọc theo mã thanh toán**
* [Tích hợp webhook](./tich-hop-webhook): trường `code` trong payload và cách dùng để khớp đơn hàng
* [Cấu hình mã thanh toán Test mode](/vi/tien-ich-khac/test-mode/cau-hinh): thử nghiệm trước khi áp dụng cho Live