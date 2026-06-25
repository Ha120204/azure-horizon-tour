-- [PHASE 3] Nhắc bổ sung thông tin HK đa kênh + chống spam thông báo.
ALTER TABLE "Booking" ADD COLUMN "passengerReminderChannel" TEXT;
ALTER TABLE "Booking" ADD COLUMN "passengerReminders" JSONB;
ALTER TABLE "Booking" ADD COLUMN "passengerInfoNotifiedAt" TIMESTAMP(3);
