---
description: Lưu context dự án sau mỗi phiên làm việc để load nhanh lần sau
---

# Save Context Workflow

Sau khi hoàn thành công việc trong phiên, chạy workflow này để cập nhật file `.project-context.md` ở root dự án.

## Các bước thực hiện

### 1. Đọc file context hiện tại
// turbo
Đọc file `/home/tvconss/Workspace/aliconcon-ecommerce/.project-context.md` để biết trạng thái hiện tại.

### 2. Cập nhật file `.project-context.md`

Cập nhật file với các thông tin sau (giữ nguyên format):

- **Latest Changes**: Thêm mục mới nhất lên đầu danh sách (giữ tối đa 10 mục). Format:
  ```
  ### [YYYY-MM-DD HH:mm] Tiêu đề ngắn
  **Files:** danh sách file đã thay đổi
  **What:** mô tả ngắn gọn đã làm gì
  **Status:** ✅ Done / 🔄 In Progress / ⚠️ Need Fix
  ```

- **Current State**: Cập nhật trạng thái hiện tại của từng module (client-customer, client-shop, client-admin, server, server-mcp, client-mcp)

- **Active Issues**: Cập nhật các bug/issue đang mở

- **Next Steps**: Cập nhật các việc cần làm tiếp

### 3. Stage file context (optional)
```bash
cd /home/tvconss/Workspace/aliconcon-ecommerce && git add .project-context.md
```

## Lưu ý
- Chỉ ghi những gì **thực sự đã làm**, không ghi dự định
- Giữ mô tả **ngắn gọn**, mỗi mục không quá 2 dòng
- Xóa các mục cũ hơn 10 entries trong Latest Changes
- File này nằm trong `.gitignore` nên không ảnh hưởng repo
