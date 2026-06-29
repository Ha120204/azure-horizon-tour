-- Ngôn ngữ khách gửi ticket hỗ trợ (gợi ý chiều dịch cho admin/khách).
ALTER TABLE "SupportTicket" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'vi';
