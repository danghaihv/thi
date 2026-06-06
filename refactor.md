# Prompt cho Claude Code — Phân tích & Tái cấu trúc Student Flow

> Dán toàn bộ nội dung này vào Claude Code. Không cần chỉnh sửa gì thêm.

---

## Nhiệm vụ

Dự án này là nền tảng luyện đề toán THCS (Next.js + Firebase) đã được triển khai nhưng cấu trúc student flow chưa rõ ràng, thiếu nhất quán. Tôi cần bạn **phân tích toàn bộ code hiện tại trước**, sau đó **đề xuất kế hoạch tái cấu trúc**, rồi **chờ tôi xác nhận trước khi thay đổi bất kỳ file nào**.

---

## Bước 1 — Phân tích codebase (KHÔNG sửa gì, chỉ đọc)

Hãy thực hiện các lệnh sau để lập bản đồ codebase:

```bash
# 1. Cấu trúc thư mục toàn dự án
find . -type f -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | sort

# 2. Tất cả các route hiện có
find . -path "*/app/*" -name "page.tsx" | grep -v node_modules | sort

# 3. Các component đang tồn tại
find . -path "*/components/*" -name "*.tsx" | grep -v node_modules | sort

# 4. Các file trong lib/ hoặc utils/
find . -path "*/lib/*" -o -path "*/utils/*" | grep -v node_modules | grep "\.ts$" | sort

# 5. Kiểm tra Firebase collections đang dùng
grep -r "collection(" --include="*.ts" --include="*.tsx" -h | grep -v node_modules | sort -u
```

Sau khi chạy xong, hãy đọc nội dung từng file quan trọng sau (nếu tồn tại):
- Tất cả `page.tsx` trong route group liên quan đến học sinh
- Tất cả component có tên chứa: `Exam`, `Quiz`, `Question`, `Result`, `Dashboard`, `Student`
- Tất cả file trong `lib/` hoặc `utils/`
- File `types/index.ts` hoặc bất kỳ file định nghĩa TypeScript types nào

---

## Bước 2 — Báo cáo phân tích (KHÔNG sửa gì)

Sau khi đọc xong, hãy trình bày báo cáo theo đúng cấu trúc này:

### A. Cấu trúc route hiện tại
Liệt kê tất cả route của student flow theo dạng cây, ghi rõ file nào đang xử lý route đó.

### B. Luồng học sinh hiện tại (flowchart dạng text)
Mô tả luồng thực tế từ: Vào trang → Chọn đề → Làm bài → Kết quả → Dashboard
Ghi rõ bước nào bị gián đoạn, thiếu redirect, hoặc logic không nhất quán.

### C. Vấn đề cụ thể phát hiện được
Liệt kê từng vấn đề, ví dụ:
- File X và file Y đang làm trùng logic chấm điểm
- Route `/de/[id]` không có loading state
- Component `ExamPlayer` đang fetch data trực tiếp thay vì qua custom hook
- Types định nghĩa rải rác ở nhiều file
- v.v.

### D. Danh sách file cần tái cấu trúc
Bảng: Tên file hiện tại | Vấn đề | Hành động đề xuất (giữ/di chuyển/tách/gộp/viết lại)

---

## Bước 3 — Đề xuất kế hoạch (KHÔNG sửa gì)

Sau báo cáo, hãy đề xuất cấu trúc mục tiêu cho student flow theo mẫu sau:

### Cấu trúc route mục tiêu
```
app/
  (student)/
    page.tsx                        — Trang chủ / chọn lớp
    lop/[grade]/page.tsx            — Danh sách chủ đề theo lớp
    lop/[grade]/[topic]/page.tsx    — Danh sách đề theo chủ đề
    de/[examId]/page.tsx            — Màn hình làm bài
    ket-qua/[sessionId]/page.tsx    — Trang kết quả + lời giải
    hoc-sinh/
      dashboard/page.tsx            — Tổng quan tiến độ
      lich-su/page.tsx              — Lịch sử làm bài
      phan-tich/page.tsx            — Phân tích điểm yếu
      tai-khoan/page.tsx            — Thông tin tài khoản
```
(Điều chỉnh nếu cấu trúc hiện tại của dự án khác — đừng áp đặt cứng nhắc)

### Cấu trúc component mục tiêu
Đề xuất dựa trên những gì đã có, chỉ thêm/tách những gì thực sự cần thiết.

### Thứ tự thực hiện
Chia thành các bước nhỏ, mỗi bước độc lập, không làm hỏng tính năng đang chạy.
Ví dụ:
- Bước 1: Di chuyển types rải rác về `types/index.ts`
- Bước 2: Tạo custom hooks `useExam`, `useAuth`, `useTimer`
- Bước 3: Refactor component X
- v.v.

---

## Bước 4 — Chờ xác nhận

Sau khi trình bày xong báo cáo và kế hoạch, hãy dừng lại và hỏi:

> "Tôi đã phân tích xong. Bạn có muốn điều chỉnh gì trong kế hoạch trên không?
> Nếu đồng ý, tôi sẽ bắt đầu từ Bước 1: [tên bước đầu tiên].
> Xác nhận để tiếp tục."

**Không được tự ý bắt đầu sửa code trước khi có xác nhận.**

---

## Ràng buộc quan trọng

- **Không xóa** bất kỳ file nào — chỉ di chuyển hoặc refactor
- **Không thay đổi** Firebase schema (collection names, field names) trừ khi tôi yêu cầu
- **Không thay đổi** logic chấm điểm nếu đang hoạt động đúng
- Mỗi bước refactor phải **build thành công** trước khi sang bước tiếp theo
- Sau mỗi bước, báo cáo: file nào đã thay đổi, file nào chưa, bước tiếp theo là gì
- Nếu phát hiện bug trong lúc đọc code, **ghi chú lại** nhưng không sửa — để riêng thành danh sách "Bug phát hiện thêm" cuối báo cáo
