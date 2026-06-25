-- [PHASE 3] Khách yêu cầu nhân viên nhập hộ thông tin hành khách.
ALTER TABLE "Booking" ADD COLUMN "staffAssistRequested" BOOLEAN NOT NULL DEFAULT false;
