-- Tách ghi chú nội bộ admin/staff thành cột riêng (trước đây nhét trong contactInfo JSON)

-- 1. Thêm cột mới
ALTER TABLE "Booking" ADD COLUMN "adminNote" TEXT;

-- 2. Backfill dữ liệu cũ từ contactInfo -> cột mới
UPDATE "Booking"
SET "adminNote" = NULLIF("contactInfo"->>'adminNote', '')
WHERE jsonb_typeof("contactInfo") = 'object'
  AND "contactInfo" ? 'adminNote';

-- 3. Gỡ các khóa đã chuyển khỏi contactInfo để chỉ còn một nguồn sự thật
UPDATE "Booking"
SET "contactInfo" = "contactInfo" - 'adminNote' - 'adminNoteUpdatedAt' - 'adminNoteById'
WHERE jsonb_typeof("contactInfo") = 'object'
  AND "contactInfo" ?| ARRAY['adminNote', 'adminNoteUpdatedAt', 'adminNoteById'];
