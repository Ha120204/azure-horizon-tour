-- Audit cho ghi chú nội bộ: lưu người sửa + thời điểm sửa gần nhất
ALTER TABLE "Booking" ADD COLUMN "adminNoteById" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "adminNoteUpdatedAt" TIMESTAMP(3);
