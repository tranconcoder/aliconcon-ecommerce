# Database Seeders

Scripts để seed dữ liệu vào database.

## Cách sử dụng

### Run seeder đơn lẻ

```bash
npm run seed <seeder-name>
```

**Các seeder có sẵn:**
- `rbac` - Seed roles và permissions
- `media` - Seed media files cho categories
- `category` - Seed product categories
- `location` - Seed provinces, districts, wards

**Ví dụ:**
```bash
npm run seed rbac
npm run seed category
npm run seed location
```

### Run tất cả seeders theo thứ tự

```bash
npm run seed:all
```

Script này sẽ chạy tất cả seeders theo đúng thứ tự:
1. RBAC (roles & permissions)
2. Media (category icons)
3. Category (product categories)
4. Location (provinces, districts, wards)

## Lưu ý

- Tất cả seeders sử dụng `findOneAndReplace` với `upsert: true`, nên có thể chạy nhiều lần mà không tạo duplicate data
- Database connection sẽ tự động được mở và đóng khi chạy script
- Nếu có lỗi, script sẽ exit với code 1 và hiển thị error message
