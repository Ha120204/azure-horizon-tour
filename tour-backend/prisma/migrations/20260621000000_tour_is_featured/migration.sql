-- Thêm cờ tour nổi bật (hiển thị ưu tiên trên trang chủ).
ALTER TABLE "Tour" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
