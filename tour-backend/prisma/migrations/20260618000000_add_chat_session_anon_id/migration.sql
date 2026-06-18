-- Gắn phiên chat ẩn danh với định danh khách vãng lai (cookie HttpOnly),
-- để chỉ trình duyệt tạo ra phiên mới đọc/xóa được lịch sử ẩn danh đó.
ALTER TABLE "ChatSession" ADD COLUMN "anonId" TEXT;
