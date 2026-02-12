---
description: Load context dự án khi bắt đầu phiên làm việc mới
---

# Load Context Workflow

Khi bắt đầu phiên làm việc mới, chạy workflow này để load context nhanh thay vì đọc toàn bộ codebase.

## Các bước thực hiện

### 1. Đọc file project context
// turbo
Đọc file `/home/tvconss/Workspace/aliconcon-ecommerce/.project-context.md` để hiểu:
- Dự án đang ở trạng thái nào
- Những thay đổi gần nhất
- Các issue đang mở
- Việc cần làm tiếp

### 2. Tóm tắt cho user
Sau khi đọc xong, tóm tắt ngắn gọn cho user:
- **Trạng thái**: dự án đang ở đâu
- **Lần cuối**: đã làm gì lần cuối
- **Tiếp theo**: suggest việc cần làm tiếp
- **Issues**: nếu có bug/issue nào cần xử lý

### 3. Sẵn sàng làm việc
Bây giờ đã có đủ context, sẵn sàng nhận task từ user mà không cần scan lại toàn bộ codebase.

## Lưu ý
- **KHÔNG** đọc tất cả file trong dự án
- **CHỈ** đọc thêm file khi user yêu cầu hoặc khi cần thiết cho task cụ thể
- Nếu file `.project-context.md` không tồn tại, chạy `/save-context` trước
