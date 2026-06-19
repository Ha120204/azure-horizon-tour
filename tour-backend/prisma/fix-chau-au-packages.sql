-- Fix tiếng Việt cho các gói tour "Châu Âu Paris – Brussels – Amsterdam"
-- Chạy: npx prisma db execute --file prisma/fix-chau-au-packages.sql

DO $$
DECLARE
  v_tour_id INTEGER;
  v_count   INTEGER;
BEGIN
  SELECT id INTO v_tour_id
  FROM "Tour"
  WHERE name ILIKE '%Paris%Brussels%Amsterdam%'
     OR name ILIKE '%Châu Âu%Paris%Brussels%'
  LIMIT 1;

  IF v_tour_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy tour Paris-Brussels-Amsterdam';
  END IF;

  RAISE NOTICE 'Đang cập nhật tour ID: %', v_tour_id;

  UPDATE "TourPackage"
  SET
    includes = ARRAY[
      'Vé máy bay khứ hồi theo chương trình',
      'Khách sạn tiêu chuẩn 3 sao hoặc tương đương',
      'Xe đưa đón và tham quan theo lịch trình',
      'Hướng dẫn viên tiếng Việt theo đoàn',
      'Bữa ăn và vé tham quan theo chương trình',
      'Bảo hiểm du lịch quốc tế cơ bản'
    ],
    excludes = ARRAY[
      'Hộ chiếu và chi phí cá nhân',
      'Visa nếu chương trình không ghi bao gồm',
      'Hành lý quá cước, tiền tip và dịch vụ ngoài lịch trình'
    ],
    "updatedAt" = NOW()
  WHERE "tourId" = v_tour_id AND name = 'Gói Tiêu Chuẩn';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Gói Tiêu Chuẩn: % dòng', v_count;

  UPDATE "TourPackage"
  SET
    includes = ARRAY[
      'Vé máy bay khứ hồi giờ bay đẹp hơn theo tình trạng chỗ',
      'Khách sạn tiêu chuẩn 4 sao hoặc tương đương',
      'Xe đưa đón và tham quan theo lịch trình',
      'Hướng dẫn viên kinh nghiệm',
      'Bữa ăn nâng cấp và vé tham quan theo chương trình',
      'Hỗ trợ hồ sơ visa nếu cần',
      'Bảo hiểm du lịch quốc tế mức cao hơn'
    ],
    excludes = ARRAY[
      'Hộ chiếu và chi phí cá nhân',
      'Dịch vụ ngoài chương trình',
      'Phụ thu phòng đơn nếu có'
    ],
    "updatedAt" = NOW()
  WHERE "tourId" = v_tour_id AND name = 'Gói Cao Cấp';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Gói Cao Cấp: % dòng', v_count;

  UPDATE "TourPackage"
  SET
    includes = ARRAY[
      'Vé máy bay khứ hồi theo tư vấn riêng',
      'Khách sạn 4-5 sao tùy điểm đến',
      'Xe riêng trong lịch trình tham quan',
      'Hướng dẫn viên riêng tại điểm đến nếu phù hợp',
      'Hỗ trợ điều chỉnh lịch trình trước khi khởi hành',
      'Bảo hiểm du lịch quốc tế mức cao'
    ],
    excludes = ARRAY[
      'Hộ chiếu và chi phí cá nhân',
      'Dịch vụ phát sinh ngoài hợp đồng',
      'Nâng hạng vé máy bay nếu khách yêu cầu'
    ],
    "updatedAt" = NOW()
  WHERE "tourId" = v_tour_id AND name = 'Gói Riêng Tư';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Gói Riêng Tư: % dòng', v_count;

END $$;
