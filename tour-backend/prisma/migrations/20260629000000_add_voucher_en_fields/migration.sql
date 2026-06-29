-- Bản dịch tiếng Anh cho nhãn và mô tả voucher (hiển thị trang public EN).
ALTER TABLE "Voucher" ADD COLUMN "labelEn" TEXT;
ALTER TABLE "Voucher" ADD COLUMN "descriptionEn" TEXT;
