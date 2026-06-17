import {
  Prisma,
  PrismaClient,
  TourStatus,
  TransportType,
} from '@prisma/client';

type Region = 'Đông Nam Á' | 'Đông Bắc Á' | 'Trung Đông' | 'Châu Âu';

type DayPlan = {
  title: string;
  description: string;
  accommodation?: string;
  transport: string;
  activities: string[];
  imageUrl: string;
};

type InternationalTourSeed = {
  destination: {
    name: string;
    slug: string;
    region: Region;
    countryCode: string;
    description: string;
    imageUrl: string;
  };
  tour: {
    tourCode: string;
    name: string;
    description: string;
    price: number;
    duration: string;
    availableSeats: number;
    imageUrl: string;
    tourType: string;
    departurePoint: string;
    highlights: string[];
    gallery: string[];
    itinerary: DayPlan[];
    faqs: { question: string; answer: string }[];
  };
};

const INTERNATIONAL_SCOPE = 'INTERNATIONAL' as const;

function addDays(days: number): Date {
  const date = new Date();
  date.setHours(7, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function unsplashPhoto(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&q=80&w=1600`;
}

const IMAGES = {
  bangkokPattaya: [
    unsplashPhoto('photo-1768392810963-017c92313d79'),
    unsplashPhoto('photo-1690535707954-597ff9dbcdc3'),
    unsplashPhoto('photo-1648709740777-ce10a874ada7'),
  ],
  singaporeMalaysia: [
    unsplashPhoto('photo-1507474031918-389ee3d940ba'),
    unsplashPhoto('photo-1472017053394-b29fded587cd'),
    unsplashPhoto('photo-1561095055-8f00361ee860'),
  ],
  bali: [
    unsplashPhoto('photo-1760947585876-8018a42ef327'),
    unsplashPhoto('photo-1557093793-d149a38a1be8'),
    unsplashPhoto('photo-1555400038-a088c772c8cd'),
  ],
  taiwan: [
    unsplashPhoto('photo-1572716402589-c1a2cf470502'),
    unsplashPhoto('photo-1572716402589-c1a2cf470502'),
    unsplashPhoto('photo-1572716402589-c1a2cf470502'),
  ],
  hongKongMacau: [
    unsplashPhoto('photo-1555331446-0ff637678740'),
    unsplashPhoto('photo-1747582437820-c510396d5cec'),
    unsplashPhoto('photo-1770321119436-177fd8aa8588'),
  ],
  seoulNami: [
    unsplashPhoto('photo-1758384077255-b53dc9e171a0'),
    unsplashPhoto('photo-1765243947181-43a39f4a9466'),
    unsplashPhoto('photo-1651836173046-e02e7627b9a6'),
  ],
  tokyoFuji: [
    unsplashPhoto('photo-1526481280693-3bfa7568e0f3'),
    unsplashPhoto('photo-1564083573637-ec42bdf05148'),
    unsplashPhoto('photo-1741230127615-8334deb6b463'),
  ],
  osakaKyoto: [
    unsplashPhoto('photo-1546781788-6d251f25273e'),
    unsplashPhoto('photo-1748525591515-9a8ea6ce5434'),
    unsplashPhoto('photo-1764271835414-f44328c0f273'),
  ],
  dubaiAbuDhabi: [
    unsplashPhoto('photo-1546412414-272690cb5cb3'),
    unsplashPhoto('photo-1508724547755-22fa72fcbe24'),
    unsplashPhoto('photo-1511091734515-e50d46c37240'),
  ],
  europeClassic: [
    unsplashPhoto('photo-1524396309943-e03f5249f002'),
    unsplashPhoto('photo-1572886071978-7c60b5b3e506'),
    unsplashPhoto('photo-1723152720678-da4ee06f4505'),
  ],
} as const;

function buildDescription(intro: string, focus: string, suitableFor: string) {
  return [
    intro,
    '',
    `Hành trình được thiết kế theo nhịp vừa phải, tập trung vào ${focus}. Lịch trình ưu tiên các điểm biểu tượng, thời gian nghỉ hợp lý, bữa ăn theo chương trình và hướng dẫn viên theo đoàn.`,
    '',
    `Tour phù hợp với ${suitableFor}. Giá tour đã bao gồm các dịch vụ chính theo từng gói, có nhiều ngày khởi hành để lựa chọn, hỗ trợ thủ tục trước chuyến đi và quy trình thanh toán rõ ràng.`,
  ].join('\n');
}

function packageData(basePrice: number) {
  return [
    {
      name: 'Gói Tiêu Chuẩn',
      description:
        'Gói cân bằng chi phí, phù hợp khách muốn lịch trình trọn gói với dịch vụ cơ bản rõ ràng.',
      price: basePrice,
      badge: 'BEST VALUE',
      includes: [
        'Vé máy bay khứ hồi theo chương trình',
        'Khách sạn tiêu chuẩn 3 sao hoặc tương đương',
        'Xe đưa đón và tham quan theo lịch trình',
        'Hướng dẫn viên tiếng Việt theo đoàn',
        'Bữa ăn và vé tham quan theo chương trình',
        'Bảo hiểm du lịch quốc tế cơ bản',
      ],
      excludes: [
        'Hộ chiếu và chi phí cá nhân',
        'Visa nếu chương trình không ghi bao gồm',
        'Hành lý quá cước, tiền tip và dịch vụ ngoài lịch trình',
      ],
      sortOrder: 0,
    },
    {
      name: 'Gói Cao Cấp',
      description:
        'Nâng cấp khách sạn, bữa ăn và hỗ trợ thủ tục để hành trình thoải mái hơn.',
      price: Math.round(basePrice * 1.25),
      badge: 'POPULAR',
      includes: [
        'Vé máy bay khứ hồi giờ bay đẹp hơn theo tình trạng chỗ',
        'Khách sạn tiêu chuẩn 4 sao hoặc tương đương',
        'Xe đưa đón và tham quan theo lịch trình',
        'Hướng dẫn viên kinh nghiệm',
        'Bữa ăn nâng cấp và vé tham quan theo chương trình',
        'Hỗ trợ hồ sơ visa nếu cần',
        'Bảo hiểm du lịch quốc tế mức cao hơn',
      ],
      excludes: [
        'Hộ chiếu và chi phí cá nhân',
        'Dịch vụ ngoài chương trình',
        'Phụ thu phòng đơn nếu có',
      ],
      sortOrder: 1,
    },
    {
      name: 'Gói Riêng Tư',
      description:
        'Dịch vụ linh hoạt hơn cho gia đình hoặc nhóm nhỏ muốn riêng tư và chủ động thời gian.',
      price: Math.round(basePrice * 1.62),
      badge: 'LUXURY',
      includes: [
        'Vé máy bay khứ hồi theo tư vấn riêng',
        'Khách sạn 4-5 sao tùy điểm đến',
        'Xe riêng trong lịch trình tham quan',
        'Hướng dẫn viên riêng tại điểm đến nếu phù hợp',
        'Hỗ trợ điều chỉnh lịch trình trước khởi hành',
        'Bảo hiểm du lịch quốc tế mức cao',
      ],
      excludes: [
        'Hộ chiếu và chi phí cá nhân',
        'Dịch vụ phát sinh ngoài hợp đồng',
        'Nâng hạng vé máy bay nếu khách yêu cầu',
      ],
      sortOrder: 2,
    },
  ];
}

function buildTimeline(day: DayPlan): Prisma.InputJsonValue {
  return [
    { time: '07:00', activity: 'Dùng bữa sáng và chuẩn bị khởi hành' },
    { time: '09:00', activity: day.activities[0] ?? 'Tham quan điểm chính' },
    { time: '12:00', activity: 'Dùng bữa trưa theo chương trình' },
    { time: '14:00', activity: day.activities[1] ?? 'Tiếp tục tham quan' },
    { time: '19:00', activity: 'Dùng bữa tối và nghỉ ngơi' },
  ];
}

const internationalTours: InternationalTourSeed[] = [
  {
    destination: {
      name: 'Bangkok - Pattaya',
      slug: 'bangkok-pattaya',
      region: 'Đông Nam Á',
      countryCode: 'TH',
      description:
        'Tuyến Thái Lan phổ biến với chùa Wat Arun, city tour Bangkok, mua sắm, Pattaya và các hoạt động giải trí ven biển.',
      imageUrl: IMAGES.bangkokPattaya[0],
    },
    tour: {
      tourCode: 'INT-THA-001',
      name: 'Thái Lan Bangkok - Pattaya 5 Ngày 4 Đêm',
      description: buildDescription(
        'Tour Thái Lan kinh điển cho khách Việt, kết hợp Bangkok, Pattaya, chùa Wat Arun, mua sắm và các điểm giải trí nổi bật.',
        'văn hóa Thái Lan, city tour, mua sắm và nghỉ dưỡng ngắn ngày',
        'gia đình, nhóm bạn, khách lần đầu đi nước ngoài và khách muốn tour giá dễ tiếp cận',
      ),
      price: 9_900_000,
      duration: '5 ngày 4 đêm',
      availableSeats: 120,
      imageUrl: IMAGES.bangkokPattaya[0],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Tham quan chùa Wat Arun và các điểm biểu tượng Bangkok',
        'Trải nghiệm Pattaya và không gian biển Thái Lan',
        'Có thời gian mua sắm tại các trung tâm lớn',
        'Lịch trình de di, phù hợp khách lần đầu di tour nước ngoài',
      ],
      gallery: [...IMAGES.bangkokPattaya],
      itinerary: [
        {
          title: 'Việt Nam - Bangkok',
          description:
            'Làm thủ tục bay sang Bangkok, đón khách tại sân bay, dung bữa tối và nhận phòng nghỉ ngơi.',
          accommodation: 'Khách sạn Bangkok theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay Việt Nam - Bangkok', 'Dùng bữa tối Thái Lan'],
          imageUrl: IMAGES.bangkokPattaya[0],
        },
        {
          title: 'Bangkok city tour',
          description:
            'Tham quan chùa Wat Arun, các điểm trung tâm Bangkok và tự do mua sắm theo lịch trình.',
          accommodation: 'Khách sạn Bangkok theo gói',
          transport: 'Xe du lịch',
          activities: ['Wat Arun', 'City tour Bangkok', 'Mua sắm'],
          imageUrl: IMAGES.bangkokPattaya[1],
        },
        {
          title: 'Bangkok - Pattaya',
          description:
            'Di chuyển đếnPattaya, tham quan điểm giải trí, nghỉ đêm tại thảnh phổ biến.',
          accommodation: 'Khách sạn Pattaya theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Di chuyển Bangkok - Pattaya',
            'Biển Pattaya',
            'Tự do buổi tối',
          ],
          imageUrl: IMAGES.bangkokPattaya[2],
        },
        {
          title: 'Pattaya - Bangkok',
          description:
            'Trả phòng, mua đặc sản và quay lại Bangkok nghỉ đêm trước khi về nước.',
          accommodation: 'Khách sạn Bangkok theo gói',
          transport: 'Xe du lịch',
          activities: ['Trả phòng Pattaya', 'Mua đặc sản', 'Nghỉ đêm Bangkok'],
          imageUrl: IMAGES.bangkokPattaya[0],
        },
        {
          title: 'Bangkok - Việt Nam',
          description:
            'Ăn sáng, ra sân bay Suvarnabhumi và bay về Việt Nam, kết thúc hành trình.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Sân bay Suvarnabhumi', 'Bay về Việt Nam'],
          imageUrl: IMAGES.bangkokPattaya[2],
        },
      ],
      faqs: [
        {
          question: 'Tour Thái Lan có cần visa không?',
          answer:
            'Khách Việt Nam du lịch ngắn ngày tại Thái Lan thường không cần visa, tuy nhiên hộ chiếu phải còn hạn theo quy định.',
        },
        {
          question: 'Giá đã bao gồm vé máy bay chưa?',
          answer:
            'Đây là tour trọn gói, vé máy bay đã nằm trong danh sách bao gồm của từng gói.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Singapore - Malaysia',
      slug: 'singapore-malaysia',
      region: 'Đông Nam Á',
      countryCode: 'SG-MY',
      description:
        'Tuyến liên tuyến phổ biến kết hợp Singapore hiện đại với Kuala Lumpur, Genting và Malacca của Malaysia.',
      imageUrl: IMAGES.singaporeMalaysia[0],
    },
    tour: {
      tourCode: 'INT-SGMY-002',
      name: 'Singapore - Malaysia 5 Ngày 4 Đêm',
      description: buildDescription(
        'Hành trình Singapore - Malaysia kết hợp Marina Bay, Gardens by the Bay, Kuala Lumpur, Petronas Towers và cao nguyên Genting.',
        'đô thị hiện đại, công trình biểu tượng, mua sắm và giải trí gia đình',
        'gia đình, nhóm bạn, khách muốn một tour Đông Nam Á sạch đẹp và nhiều điểm check-in',
      ),
      price: 14_500_000,
      duration: '5 ngày 4 đêm',
      availableSeats: 100,
      imageUrl: IMAGES.singaporeMalaysia[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Hà Nội',
      highlights: [
        'Check-in Marina Bay và Gardens by the Bay',
        'Tham quan Petronas Towers tại Kuala Lumpur',
        'Trải nghiệm Genting hoặc Malacca theo lịch trình',
        'Liên tuyến 2 quốc gia, phù hợp tour gia đình',
      ],
      gallery: [...IMAGES.singaporeMalaysia],
      itinerary: [
        {
          title: 'Việt Nam - Singapore',
          description:
            'Bay đến Singapore, tham quan khu Marina Bay, Merlion và nghỉ đêm tại Singapore.',
          accommodation: 'Khách sạn Singapore theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Marina Bay', 'Merlion Park', 'Singapore về đêm'],
          imageUrl: IMAGES.singaporeMalaysia[0],
        },
        {
          title: 'Singapore city tour',
          description:
            'Tham quan Gardens by the Bay, khu trung tâm và các điểm mua sắm nổi bật.',
          accommodation: 'Khách sạn Singapore theo gói',
          transport: 'Xe du lịch',
          activities: ['Gardens by the Bay', 'City tour Singapore', 'Mua sắm'],
          imageUrl: IMAGES.singaporeMalaysia[0],
        },
        {
          title: 'Singapore - Kuala Lumpur',
          description:
            'Di chuyển sang Malaysia, tham quan Kuala Lumpur và Petronas Towers.',
          accommodation: 'Khách sạn Kuala Lumpur theo gói',
          transport: 'Xe du lịch',
          activities: ['Kuala Lumpur', 'Petronas Towers', 'Ẩm thực Malaysia'],
          imageUrl: IMAGES.singaporeMalaysia[1],
        },
        {
          title: 'Genting hoặc Malacca',
          description:
            'Tham quan cao nguyên Genting hoặc phố cổ Malacca theo chương trình, trở về Kuala Lumpur nghỉ đêm.',
          accommodation: 'Khách sạn Kuala Lumpur theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Genting hoặc Malacca',
            'Mua đặc sản Malaysia',
            'Trở về Kuala Lumpur',
          ],
          imageUrl: IMAGES.singaporeMalaysia[2],
        },
        {
          title: 'Kuala Lumpur - Việt Nam',
          description:
            'Ăn sáng, tự do mua đặc sản cuối chuyến tại Kuala Lumpur và ra sân bay KLIA bay về Việt Nam.',
          transport: 'Xe du lịch và máy bay',
          activities: [
            'Mua đặc sản Malaysia',
            'Sân bay KLIA',
            'Bay về Việt Nam',
          ],
          imageUrl: IMAGES.singaporeMalaysia[0],
        },
      ],
      faqs: [
        {
          question: 'Tour qua biên giới Singapore - Malaysia bằng gì?',
          answer:
            'Thông thường đi bằng xe du lịch theo đoàn, hướng dẫn viên hỗ trợ thủ tục xuất nhập cảnh.',
        },
        {
          question: 'Có cần visa Singapore/Malaysia không?',
          answer:
            'Khách Việt Nam du lịch ngắn ngày thường không cần visa, cần hộ chiếu còn hạn và đáp ứng quy định nhập cảnh.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Bali',
      slug: 'bali',
      region: 'Đông Nam Á',
      countryCode: 'ID',
      description:
        'Dao nghỉ dưỡng Indonesia nổi tiếng với đền Hindu, ruộng bậc thang Ubud, biển, resort và không gian honeymoon.',
      imageUrl: IMAGES.bali[0],
    },
    tour: {
      tourCode: 'INT-IDN-003',
      name: 'Bali Ubud - Đền Ulun Danu - Nghỉ Dưỡng Biển 4 Ngày 3 Đêm',
      description: buildDescription(
        'Tour Bali dảnh cho khách yêu nghỉ dưỡng, kết hợp Ubud, đền Ulun Danu, ruộng bậc thang và thời gian thư giãn ben biển.',
        'nghỉ dưỡng dao, văn hóa Hindu Bali, ruộng bậc thang và resort biển',
        'cặp đôi, khách honeymoon, gia đình và nhóm bạn muốn lịch trình đẹp nhưng không qua gap',
      ),
      price: 16_900_000,
      duration: '4 ngày 3 đêm',
      availableSeats: 80,
      imageUrl: IMAGES.bali[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'TP.HCM',
      highlights: [
        'Tham quan đền Ulun Danu và cảnh quan Bali',
        'Trải nghiệm Ubud và ruộng bậc thang',
        'Có thời gian nghỉ dưỡng biển',
        'Phù hợp honeymoon và khách thich resort',
      ],
      gallery: [...IMAGES.bali],
      itinerary: [
        {
          title: 'Việt Nam - Bali',
          description:
            'Bay đến Bali, đón khách tại sân bay, nhận phòng và nghỉ ngơi tại resort/khách sạn.',
          accommodation: 'Khách sạn/resort Bali theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Bali', 'Nhận phòng nghỉ dưỡng'],
          imageUrl: IMAGES.bali[0],
        },
        {
          title: 'Đền Ulun Danu - Ubud',
          description:
            'Tham quan đền Ulun Danu, khu Ubud và các điểm văn hóa dac trung của Bali.',
          accommodation: 'Khách sạn/resort Bali theo gói',
          transport: 'Xe du lịch',
          activities: ['Đền Ulun Danu', 'Ubud', 'Ẩm thực Bali'],
          imageUrl: IMAGES.bali[0],
        },
        {
          title: 'Ruộng bậc thang - Nghỉ dưỡng biển',
          description:
            'Check-in ruộng bậc thang, tự do nghỉ dưỡng, tam biển hoặc dung dịch vụ resort.',
          accommodation: 'Khách sạn/resort Bali theo gói',
          transport: 'Xe du lịch',
          activities: ['Ruộng bậc thang', 'Nghỉ dưỡng biển', 'Tự do thư giãn'],
          imageUrl: IMAGES.bali[1],
        },
        {
          title: 'Bali - Việt Nam',
          description: 'Tự do mua sắm, trả phòng và bay về Việt Nam.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Mua qua địa phương', 'Bay về Việt Nam'],
          imageUrl: IMAGES.bali[2],
        },
      ],
      faqs: [
        {
          question: 'Bali có cần visa không?',
          answer:
            'Quy định visa có thể thay đổi theo thời điểm. Khách cần được kiểm tra hộ chiếu và quy định nhập cảnh trước ngày khởi hành.',
        },
        {
          question: 'Tour có phù hợp honeymoon không?',
          answer:
            'Có. Lịch trình có nhiều thời gian nghỉ dưỡng và các điểm chụp ảnh đẹp.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Đài Loan',
      slug: 'dai-loan',
      region: 'Đông Bắc Á',
      countryCode: 'TW',
      description:
        'Điểm đến đông bắc A được ưa chuộng với Đài Bắc 101, chợ đêm, Cửu Phần, Đài Trung, Cao Hùng và ẩm thực đường phố.',
      imageUrl: IMAGES.taiwan[0],
    },
    tour: {
      tourCode: 'INT-TWN-004',
      name: 'Đài Loan Đài Bắc - Đài Trung - Cao Hùng 5 Ngày 4 Đêm',
      description: buildDescription(
        'Tour Đài Loan kết hợp Đài Bắc 101, chợ đêm, Cửu Phần, Đài Trung, Cao Hùng và các điểm city tour phổ biến.',
        'city tour, ẩm thực chợ đêm, mua sắm và cảnh quan đông bắc A',
        'khách trẻ, gia đình, nhóm bạn và khách muốn tour gần Việt Nam với chi phí vừa phải',
      ),
      price: 17_900_000,
      duration: '5 ngày 4 đêm',
      availableSeats: 90,
      imageUrl: IMAGES.taiwan[0],
      tourType: 'Khám Phá',
      departurePoint: 'TP.HCM',
      highlights: [
        'Check-in Taipei 101',
        'Trải nghiệm chợ đêm và ẩm thực Đài Loan',
        'Tham quan Cửu Phần/Đài Trung/Cao Hùng theo lịch',
        'Tuyến tour phổ biến, dễ lựa chọn cho khách Việt',
      ],
      gallery: [...IMAGES.taiwan],
      itinerary: [
        {
          title: 'Việt Nam - Đài Bắc',
          description:
            'Bay đến Đài Bắc, nhận phòng và trải nghiệm chợ đêm theo thời gian đến.',
          accommodation: 'Khách sạn Đài Bắc theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Đài Bắc', 'Chợ đêm Đài Loan'],
          imageUrl: IMAGES.taiwan[0],
        },
        {
          title: 'Đài Bắc city tour',
          description:
            'Tham quan Taipei 101, các điểm trung tâm và khu mua sắm.',
          accommodation: 'Khách sạn Đài Bắc theo gói',
          transport: 'Xe du lịch',
          activities: ['Taipei 101', 'City tour Đài Bắc', 'Mua sắm'],
          imageUrl: IMAGES.taiwan[1],
        },
        {
          title: 'Cửu Phần - Đài Trung',
          description:
            'Khám phá phố cổ Cửu Phần hoặc điểm phù hợp thời tiết, di chuyển đếnĐài Trung.',
          accommodation: 'Khách sạn Đài Trung theo gói',
          transport: 'Xe du lịch',
          activities: ['Cửu Phần', 'Đài Trung', 'Ẩm thực địa phương'],
          imageUrl: IMAGES.taiwan[2],
        },
        {
          title: 'Cao Hùng',
          description:
            'Tham quan Cao Hùng, cảng Pier 2 Arts Center, chợ Lục Hợp và mua đặc sản Đài Loan.',
          accommodation: 'Khách sạn Cao Hùng theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Pier 2 Arts Center',
            'Chợ Lục Hợp',
            'Mua đặc sản Đài Loan',
          ],
          imageUrl: IMAGES.taiwan[0],
        },
        {
          title: 'Đài Loan - Việt Nam',
          description:
            'Ăn sáng, trả phòng và ra sân bay bay về Việt Nam, kết thúc hành trình.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Sân bay Cao Hùng/Đài Bắc', 'Bay về Việt Nam'],
          imageUrl: IMAGES.taiwan[1],
        },
      ],
      faqs: [
        {
          question: 'Tour Đài Loan có cần visa không?',
          answer:
            'Tùy hồ sơ khách và quy định tại thời điểm đặt tour. Quý khách nên được tư vấn visa trước khởi hành.',
        },
        {
          question: 'Chợ đêm có nằm trong lịch trình không?',
          answer:
            'Có. Một số buổi tối có thời gian cho khách trải nghiệm chợ đêm và ẩm thực địa phương.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Hong Kong - Macau',
      slug: 'hong-kong-macau',
      region: 'Đông Bắc Á',
      countryCode: 'HK-MO',
      description:
        'Liên tuyến đô thị nổi tiếng với skyline Hong Kong, Victoria Harbour, mua sắm và di sản Ruins of St. Paul tại Macau.',
      imageUrl: IMAGES.hongKongMacau[0],
    },
    tour: {
      tourCode: 'INT-HKMO-005',
      name: 'Hong Kong - Macau 4 Ngày 3 Đêm',
      description: buildDescription(
        'Tour Hong Kong - Macau kết hợp Victoria Harbour, các khu mua sắm, city tour Hong Kong và di sản Ruins of St. Paul tại Macau.',
        'đô thị chau A, mua sắm, ẩm thực Quang Dong và di sản Macau',
        'khách thich city break, mua sắm, gia đình và nhóm bạn muốn tour ngắn ngày',
      ),
      price: 18_900_000,
      duration: '4 ngày 3 đêm',
      availableSeats: 80,
      imageUrl: IMAGES.hongKongMacau[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Hà Nội',
      highlights: [
        'Ngam skyline Hong Kong và Victoria Harbour',
        'Tham quan các khu mua sắm nổi bật',
        'Di chuyển sang Macau và check-in Ruins of St. Paul',
        'Lịch trình ngan, phù hợp kỳ nghỉ ngắn ngày',
      ],
      gallery: [...IMAGES.hongKongMacau],
      itinerary: [
        {
          title: 'Việt Nam - Hong Kong',
          description:
            'Bay đến Hong Kong, đón khách, nhận phòng và tự do khám phá khu trung tâm.',
          accommodation: 'Khách sạn Hong Kong theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Hong Kong', 'Victoria Harbour'],
          imageUrl: IMAGES.hongKongMacau[0],
        },
        {
          title: 'Hong Kong city tour',
          description:
            'Tham quan các điểm biểu tượng, khu mua sắm và điểm ngắm cảnh theo chương trình.',
          accommodation: 'Khách sạn Hong Kong theo gói',
          transport: 'Xe du lịch',
          activities: ['City tour Hong Kong', 'Mua sắm', 'Ẩm thực Quang Dong'],
          imageUrl: IMAGES.hongKongMacau[0],
        },
        {
          title: 'Hong Kong - Macau',
          description:
            'Di chuyển sang Macau, tham quan Ruins of St. Paul và các điểm di sản nổi bật.',
          accommodation: 'Khách sạn Macau/Hong Kong theo gói',
          transport: 'Xe du lịch và tàu/cầu đường biển',
          activities: ['Macau', 'Ruins of St. Paul', 'Di sản Macau'],
          imageUrl: IMAGES.hongKongMacau[1],
        },
        {
          title: 'Macau/Hong Kong - Việt Nam',
          description: 'Mua đặc sản, trả phòng và bay về Việt Nam.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Mua đặc sản', 'Bay về Việt Nam'],
          imageUrl: IMAGES.hongKongMacau[2],
        },
      ],
      faqs: [
        {
          question: 'Tour có di ca Hong Kong và Macau không?',
          answer:
            'Có. Lịch trình có đầy đủ hai điểm đến, có thể điều chỉnh số đêm tùy sản phẩm thực tế.',
        },
        {
          question: 'Có cần visa không?',
          answer:
            'Quy định nhập cảnh cần được kiểm tra theo hộ chiếu và thời điểm khởi hành.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Seoul - Nami',
      slug: 'seoul-nami',
      region: 'Đông Bắc Á',
      countryCode: 'KR',
      description:
        'Tuyến Hàn Quốc phổ biến với Seoul, Gyeongbokgung, dao Nami, mua sắm, ẩm thực và cong vien giải trí theo mùa.',
      imageUrl: IMAGES.seoulNami[0],
    },
    tour: {
      tourCode: 'INT-KOR-006',
      name: 'Hàn Quốc Seoul - Nami - Everland 5 Ngày 4 Đêm',
      description: buildDescription(
        'Tour Hàn Quốc kết hợp cung điện Gyeongbokgung, dao Nami, mua sắm Seoul và Everland hoặc điểm thay the theo mùa.',
        'văn hóa Hàn Quốc, cảnh quan theo mùa, mua sắm và trải nghiệm giải trí',
        'gia đình, khách trẻ, nhóm bạn và khách yêu K-culture',
      ),
      price: 22_900_000,
      duration: '5 ngày 4 đêm',
      availableSeats: 100,
      imageUrl: IMAGES.seoulNami[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'TP.HCM',
      highlights: [
        'Tham quan Gyeongbokgung và trung tâm Seoul',
        'Check-in dao Nami theo mùa',
        'Trải nghiệm Everland hoặc điểm giải trí phù hợp',
        'Mua sắm mỹ phẩm, nhân sâm và đặc sản Hàn Quốc',
      ],
      gallery: [...IMAGES.seoulNami],
      itinerary: [
        {
          title: 'Việt Nam - Seoul',
          description: 'Bay đến Seoul, đón khách, nhận phòng và nghỉ ngơi.',
          accommodation: 'Khách sạn Seoul theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Seoul', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.seoulNami[0],
        },
        {
          title: 'Gyeongbokgung - Seoul city tour',
          description:
            'Tham quan cung điện Gyeongbokgung, khu trung tâm và các điểm văn hóa Seoul.',
          accommodation: 'Khách sạn Seoul theo gói',
          transport: 'Xe du lịch',
          activities: ['Gyeongbokgung', 'City tour Seoul', 'Ẩm thực Hàn Quốc'],
          imageUrl: IMAGES.seoulNami[1],
        },
        {
          title: 'Đảo Nami - Everland',
          description:
            'Di dao Nami, tiếp tục Everland hoặc điểm thay the theo thời tiết và mua.',
          accommodation: 'Khách sạn Seoul theo gói',
          transport: 'Xe du lịch',
          activities: ['Đảo Nami', 'Everland', 'Mua sắm'],
          imageUrl: IMAGES.seoulNami[2],
        },
        {
          title: 'Mua sắm cuối chuyến - Myeongdong',
          description:
            'Tự do mua sắm mỹ phẩm, nhân sâm, quà lưu niệm tại Myeongdong hoặc Dongdaemun và thưởng thức ẩm thực đường phố Seoul.',
          accommodation: 'Khách sạn Seoul theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Myeongdong',
            'Mua sắm mỹ phẩm Hàn Quốc',
            'Ẩm thực đường phố Seoul',
          ],
          imageUrl: IMAGES.seoulNami[1],
        },
        {
          title: 'Seoul - Việt Nam',
          description:
            'Ăn sáng, trả phòng và ra sân bay Incheon bay về Việt Nam, kết thúc hành trình.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Sân bay Incheon', 'Bay về Việt Nam'],
          imageUrl: IMAGES.seoulNami[0],
        },
      ],
      faqs: [
        {
          question: 'Tour Hàn Quốc có cần visa không?',
          answer:
            'Thường cần visa hoặc điều kiện nhập cảnh phù hợp. Khách cần nộp hồ sơ theo hướng dẫn trước ngày khởi hành.',
        },
        {
          question: 'Đảo Nami mua nao đẹp?',
          answer:
            'Xuân, thu và đông đều có nét hấp dẫn riêng, phù hợp khởi hành quanh năm.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Tokyo - Fuji',
      slug: 'tokyo-fuji',
      region: 'Đông Bắc Á',
      countryCode: 'JP',
      description:
        'Tuyến Nhật Bản kinh điển với Tokyo, núi Phú Sĩ, Hakone, mua sắm và trải nghiệm văn hóa đô thị Nhật.',
      imageUrl: IMAGES.tokyoFuji[0],
    },
    tour: {
      tourCode: 'INT-JPN-007',
      name: 'Nhật Bản Tokyo - Fuji - Hakone 5 Ngày 4 Đêm',
      description: buildDescription(
        'Tour Nhật Bản tuyến Tokyo - Fuji - Hakone, phù hợp khách lần đầu đếnNhật với các điểm biểu tượng và thời gian mua sắm.',
        'núi Phú Sĩ, đô thị Tokyo, văn hóa Nhật và mua sắm',
        'gia đình, cặp đôi, nhóm bạn và khách muốn sản phẩm Nhật Bản kinh điển',
      ),
      price: 32_900_000,
      duration: '5 ngày 4 đêm',
      availableSeats: 90,
      imageUrl: IMAGES.tokyoFuji[0],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Ngam núi Phú Sĩ và khu Hakone/Fuji Five Lakes',
        'City tour Tokyo với các khu phố biểu tượng',
        'Trải nghiệm ẩm thực và mua sắm Nhật Bản',
        'Tuyến tour tiêu biểu cho phân khúc giá cao',
      ],
      gallery: [...IMAGES.tokyoFuji],
      itinerary: [
        {
          title: 'Việt Nam - Tokyo',
          description: 'Bay đến Tokyo, đón khách và nghỉ ngơi tại khách sạn.',
          accommodation: 'Khách sạn Tokyo theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Tokyo', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.tokyoFuji[2],
        },
        {
          title: 'Tokyo city tour',
          description:
            'Tham quan các khu phố biểu tượng, đền chùa/noi mua sắm theo lịch trình.',
          accommodation: 'Khách sạn Tokyo theo gói',
          transport: 'Xe du lịch',
          activities: ['City tour Tokyo', 'Mua sắm', 'Ẩm thực Nhật'],
          imageUrl: IMAGES.tokyoFuji[0],
        },
        {
          title: 'Fuji - Hakone',
          description:
            'Di chuyển khu núi Phú Sĩ, tham quan điểm ngắm cảnh và nghỉ ngơi.',
          accommodation: 'Khách sạn khu Fuji/Hakone theo gói',
          transport: 'Xe du lịch',
          activities: ['Núi Phú Sĩ', 'Hakone', 'Cảnh quan Nhật Bản'],
          imageUrl: IMAGES.tokyoFuji[1],
        },
        {
          title: 'Akihabara - Asakusa - Mua sắm Tokyo',
          description:
            'Tự do mua sắm điện tử tại Akihabara, đồ lưu niệm tại Asakusa hoặc thưởng thức ẩm thực tại Shibuya và Shinjuku.',
          accommodation: 'Khách sạn Tokyo theo gói',
          transport: 'Xe du lịch',
          activities: ['Akihabara', 'Asakusa', 'Mua sắm Tokyo'],
          imageUrl: IMAGES.tokyoFuji[0],
        },
        {
          title: 'Tokyo - Việt Nam',
          description:
            'Ăn sáng, trả phòng và ra sân bay Narita hoặc Haneda bay về Việt Nam.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Sân bay Narita/Haneda', 'Bay về Việt Nam'],
          imageUrl: IMAGES.tokyoFuji[2],
        },
      ],
      faqs: [
        {
          question: 'Tour Nhật Bản có cần visa không?',
          answer:
            'Thông thường cần visa Nhật Bản. Khách cần hộ chiếu còn hạn và hồ sơ theo yêu cầu.',
        },
        {
          question: 'Có đảm bảo thay núi Phú Sĩ không?',
          answer:
            'Cảnh núi Phú Sĩ phụ thuộc thời tiết. Nếu sương/mưa, lịch trình vẫn giữ điểm tham quan nhưng tầm nhìn có thể hạn chế.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Osaka - Kyoto',
      slug: 'osaka-kyoto',
      region: 'Đông Bắc Á',
      countryCode: 'JP',
      description:
        'Tuyến Kansai nổi bật với Osaka Castle, Kyoto, Arashiyama, đền chùa, ẩm thực và những điểm văn hóa cổ kính của Nhật Bản.',
      imageUrl: IMAGES.osakaKyoto[0],
    },
    tour: {
      tourCode: 'INT-JPN-008',
      name: 'Nhật Bản Osaka - Kyoto - Nara 5 Ngày 4 Đêm',
      description: buildDescription(
        'Tour Kansai kết hợp Osaka, Kyoto, Nara với Osaka Castle, Arashiyama, đền chùa và các khu phố ẩm thực nổi tiếng.',
        'văn hóa cổ đô Nhật Bản, thành phố Osaka, đền chùa và ẩm thực Kansai',
        'khách yêu văn hóa Nhật, gia đình và nhóm bạn muốn tuyến Nhật khác Tokyo',
      ),
      price: 34_500_000,
      duration: '5 ngày 4 đêm',
      availableSeats: 90,
      imageUrl: IMAGES.osakaKyoto[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'Hà Nội',
      highlights: [
        'Tham quan Osaka Castle',
        'Khám phá Kyoto và rừng tre Arashiyama',
        'Trải nghiệm Nara hoặc đền chùa theo lịch trình',
        'Thưởng thức ẩm thực Kansai',
      ],
      gallery: [...IMAGES.osakaKyoto],
      itinerary: [
        {
          title: 'Việt Nam - Osaka',
          description: 'Bay đến Osaka, đón khách và nhận phòng nghỉ ngơi.',
          accommodation: 'Khách sạn Osaka theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Osaka', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.osakaKyoto[1],
        },
        {
          title: 'Osaka city tour',
          description:
            'Tham quan Osaka Castle, khu trung tâm và điểm ẩm thực theo chương trình.',
          accommodation: 'Khách sạn Osaka theo gói',
          transport: 'Xe du lịch',
          activities: ['Osaka Castle', 'Dotonbori', 'Ẩm thực Kansai'],
          imageUrl: IMAGES.osakaKyoto[1],
        },
        {
          title: 'Kyoto - Arashiyama',
          description:
            'Khám phá Kyoto, rừng tre Arashiyama và các điểm văn hóa cổ kính.',
          accommodation: 'Khách sạn Osaka/Kyoto theo gói',
          transport: 'Xe du lịch',
          activities: ['Kyoto', 'Arashiyama Bamboo Grove', 'Đền chùa Nhật Bản'],
          imageUrl: IMAGES.osakaKyoto[0],
        },
        {
          title: 'Nara - Đền Todai-ji',
          description:
            'Tham quan Nara, đền Todai-ji và công viên hươu nổi tiếng, sau đó trở về Osaka nghỉ đêm.',
          accommodation: 'Khách sạn Osaka theo gói',
          transport: 'Xe du lịch',
          activities: ['Nara', 'Đền Todai-ji', 'Công viên hươu Nara'],
          imageUrl: IMAGES.osakaKyoto[2],
        },
        {
          title: 'Osaka - Việt Nam',
          description:
            'Ăn sáng, tự do mua đặc sản Osaka và ra sân bay Kansai bay về Việt Nam.',
          transport: 'Xe du lịch và máy bay',
          activities: [
            'Mua đặc sản Osaka',
            'Sân bay Kansai',
            'Bay về Việt Nam',
          ],
          imageUrl: IMAGES.osakaKyoto[1],
        },
      ],
      faqs: [
        {
          question: 'Tour Osaka - Kyoto khác Tokyo - Fuji như thế nào?',
          answer:
            'Tuyến Kansai nghieng ve văn hóa cổ đô, đền chùa và ẩm thực; Tokyo - Fuji nghieng ve đô thị hiện đại và núi Phú Sĩ.',
        },
        {
          question: 'Có cần visa Nhật Bản không?',
          answer:
            'Có. Khách cần chuẩn bị hồ sơ visa theo yêu cầu trước ngày khởi hành.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Dubai - Abu Dhabi',
      slug: 'dubai-abu-dhabi',
      region: 'Trung Đông',
      countryCode: 'AE',
      description:
        'Tuyến Trung Đông cao cap với Burj Khalifa, Dubai Mall, sa mạc, Abu Dhabi và Sheikh Zayed Grand Mosque.',
      imageUrl: IMAGES.dubaiAbuDhabi[0],
    },
    tour: {
      tourCode: 'INT-UAE-009',
      name: 'Dubai - Abu Dhabi 5 Ngày 4 Đêm',
      description: buildDescription(
        'Tour Dubai - Abu Dhabi kết hợp công trình hiện đại, sa mạc, mua sắm và đại thánh đường Sheikh Zayed tại Abu Dhabi.',
        'kiến trúc hiện đại, desert safari, mua sắm và trải nghiệm Trung Đông',
        'khách cao cấp, gia đình, nhóm bạn và khách muốn điểm đến khác biệt ở phân khúc giá cao',
      ),
      price: 29_900_000,
      duration: '5 ngày 4 đêm',
      availableSeats: 80,
      imageUrl: IMAGES.dubaiAbuDhabi[0],
      tourType: 'Tour Cao Cấp',
      departurePoint: 'Hà Nội',
      highlights: [
        'Check-in Burj Khalifa và Dubai skyline',
        'Trải nghiệm desert safari theo chương trình',
        'Tham quan Sheikh Zayed Grand Mosque tại Abu Dhabi',
        'Mua sắm tại Dubai Mall hoặc các khu thường mai lon',
      ],
      gallery: [...IMAGES.dubaiAbuDhabi],
      itinerary: [
        {
          title: 'Việt Nam - Dubai',
          description: 'Bay đến Dubai, đón khách, nhận phòng và nghỉ ngơi.',
          accommodation: 'Khách sạn Dubai theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Dubai', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.dubaiAbuDhabi[0],
        },
        {
          title: 'Dubai city tour',
          description:
            'Tham quan Burj Khalifa, Dubai Mall và các điểm biểu tượng của Dubai.',
          accommodation: 'Khách sạn Dubai theo gói',
          transport: 'Xe du lịch',
          activities: ['Burj Khalifa', 'Dubai Mall', 'Dubai skyline'],
          imageUrl: IMAGES.dubaiAbuDhabi[0],
        },
        {
          title: 'Desert safari',
          description:
            'Trải nghiệm sa mạc theo chương trình, dung bữa tối và thưởng thức hoạt động giải trí địa phương.',
          accommodation: 'Khách sạn Dubai theo gói',
          transport: 'Xe du lịch/chuyen dung theo lịch',
          activities: [
            'Desert safari',
            'Bữa tối sa mạc',
            'Giải trí địa phương',
          ],
          imageUrl: IMAGES.dubaiAbuDhabi[2],
        },
        {
          title: 'Abu Dhabi - Sheikh Zayed Grand Mosque',
          description:
            'Di chuyển đến Abu Dhabi, tham quan Sheikh Zayed Grand Mosque và Corniche, trở về Dubai nghỉ đêm.',
          accommodation: 'Khách sạn Dubai theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Sheikh Zayed Grand Mosque',
            'Corniche Abu Dhabi',
            'Trở về Dubai',
          ],
          imageUrl: IMAGES.dubaiAbuDhabi[1],
        },
        {
          title: 'Dubai - Việt Nam',
          description:
            'Ăn sáng, mua sắm tự do tại Dubai Mall và ra sân bay DXB bay về Việt Nam, kết thúc hành trình.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Mua đặc sản', 'Sân bay Dubai DXB', 'Bay về Việt Nam'],
          imageUrl: IMAGES.dubaiAbuDhabi[0],
        },
      ],
      faqs: [
        {
          question: 'Tour Dubai có cần visa không?',
          answer:
            'Tùy hộ chiếu và quy định tại thời điểm khởi hành. Nhà tổ chức cần tư vấn visa trước khi xác nhận booking.',
        },
        {
          question: 'Desert safari có bắt buộc không?',
          answer:
            'Không. Khách có vấn đề sức khỏe có thể được tư vấn hoạt động thay thế phù hợp.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Paris - Brussels - Amsterdam',
      slug: 'paris-brussels-amsterdam',
      region: 'Châu Âu',
      countryCode: 'FR-BE-NL',
      description:
        'Tuyến châu Âu kinh điển kết hợp Paris, Brussels và Amsterdam với tháp Eiffel, phố cổ châu Âu, kênh đào và văn hóa Tây Âu.',
      imageUrl: IMAGES.europeClassic[0],
    },
    tour: {
      tourCode: 'INT-EUR-010',
      name: 'Châu Âu Paris - Brussels - Amsterdam 8 Ngày 7 Đêm',
      description: buildDescription(
        'Tour châu Âu kinh điển cho khách Việt, kết hợp Paris, Brussels, Amsterdam, các công trình biểu tượng và trải nghiệm đô thị Tây Âu.',
        'kiến trúc châu Âu, city tour, văn hóa Tây Âu và mua sắm',
        'khách có ngân sách cao, gia đình, cặp đôi và khách muốn sản phẩm châu Âu ở phân khúc cao cấp hơn',
      ),
      price: 59_900_000,
      duration: '8 ngày 7 đêm',
      availableSeats: 70,
      imageUrl: IMAGES.europeClassic[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'TP.HCM',
      highlights: [
        'Check-in tháp Eiffel và các điểm biểu tượng Paris',
        'Tham quan Brussels và không gian phố cổ châu Âu',
        'Trải nghiệm Amsterdam với kênh đào và city tour',
        'Sản phẩm phù hợp phân khúc tour xa, giá trị cao',
      ],
      gallery: [...IMAGES.europeClassic],
      itinerary: [
        {
          title: 'Việt Nam - Paris',
          description:
            'Bay đến Paris, đón khách tại sân bay CDG, nhận phòng và tự do nghỉ ngơi sau chuyến bay dài.',
          accommodation: 'Khách sạn Paris theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Paris', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.europeClassic[0],
        },
        {
          title: 'Paris city tour - Tháp Eiffel',
          description:
            'Tham quan tháp Eiffel, Khải Hoàn Môn, Champs-Élysées và dạo phố mua sắm trung tâm Paris.',
          accommodation: 'Khách sạn Paris theo gói',
          transport: 'Xe du lịch',
          activities: ['Tháp Eiffel', 'Champs-Élysées', 'Mua sắm Paris'],
          imageUrl: IMAGES.europeClassic[0],
        },
        {
          title: 'Paris - Cung điện Versailles',
          description:
            'Tham quan cung điện Versailles nổi tiếng và khu vườn hoàng gia, buổi tối trở về Paris tự do.',
          accommodation: 'Khách sạn Paris theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Cung điện Versailles',
            'Vườn hoàng gia Versailles',
            'Montmartre buổi tối',
          ],
          imageUrl: IMAGES.europeClassic[1],
        },
        {
          title: 'Paris - Brussels',
          description:
            'Di chuyển đến Brussels bằng tàu cao tốc, tham quan Grand Place, Atomium và thưởng thức chocolate/waffle Bỉ.',
          accommodation: 'Khách sạn Brussels theo gói',
          transport: 'Xe du lịch hoặc tàu theo lịch',
          activities: ['Grand Place Brussels', 'Atomium', 'Ẩm thực Bỉ'],
          imageUrl: IMAGES.europeClassic[1],
        },
        {
          title: 'Brussels - Amsterdam',
          description:
            'Di chuyển đến Amsterdam, tham quan khu kênh đào, Nhà Anne Frank và bảo tàng Van Gogh.',
          accommodation: 'Khách sạn Amsterdam theo gói',
          transport: 'Xe du lịch hoặc tàu theo lịch',
          activities: [
            'Kênh đào Amsterdam',
            'Nhà Anne Frank',
            'Bảo tàng Van Gogh',
          ],
          imageUrl: IMAGES.europeClassic[2],
        },
        {
          title: 'Amsterdam - Volendam - Zaanse Schans',
          description:
            'Tham quan làng chài Volendam và khu cối xay gió Zaanse Schans, trải nghiệm văn hóa Hà Lan truyền thống.',
          accommodation: 'Khách sạn Amsterdam theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Làng chài Volendam',
            'Cối xay gió Zaanse Schans',
            'Trải nghiệm Hà Lan',
          ],
          imageUrl: IMAGES.europeClassic[0],
        },
        {
          title: 'Tự do Amsterdam - Khởi hành',
          description:
            'Tự do buổi sáng mua đặc sản Hà Lan, buổi chiều ra sân bay Schiphol khởi hành chuyến bay đêm về Việt Nam.',
          transport: 'Xe du lịch và máy bay',
          activities: [
            'Mua đặc sản Hà Lan',
            'Sân bay Schiphol Amsterdam',
            'Khởi hành về Việt Nam',
          ],
          imageUrl: IMAGES.europeClassic[2],
        },
        {
          title: 'Về đến Việt Nam',
          description:
            'Máy bay hạ cánh tại Việt Nam, kết thúc hành trình Châu Âu 8 ngày.',
          transport: 'Máy bay',
          activities: ['Về đến Việt Nam', 'Kết thúc hành trình'],
          imageUrl: IMAGES.europeClassic[0],
        },
      ],
      faqs: [
        {
          question: 'Tour châu Âu có cần visa Schengen không?',
          answer:
            'Có. Khách cần hồ sơ visa Schengen và thời gian xử lý đủ trước ngày khởi hành.',
        },
        {
          question: 'Giá có thể thay đổi theo vé máy bay không?',
          answer:
            'Có. Tour xa phụ thuộc nhiều vào giá vé, tỷ giá và tình trạng phòng khách sạn.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Bangkok - Pattaya',
      slug: 'bangkok-pattaya',
      region: 'Đông Nam Á',
      countryCode: 'TH',
      description:
        'Tuyến Thái Lan phổ biến với chùa Wat Arun, city tour Bangkok, mua sắm, Pattaya và các hoạt động giải trí ven biển.',
      imageUrl: IMAGES.bangkokPattaya[0],
    },
    tour: {
      tourCode: 'INT-THA-011',
      name: 'Thái Lan Bangkok - Safari World - Pattaya 4 Ngày 3 Đêm',
      description: buildDescription(
        'Tour Thái Lan rút gọn 4 ngày thiên về giải trí gia đình, kết hợp Safari World, đảo Coral và các điểm vui chơi nổi bật của Bangkok - Pattaya.',
        'giải trí gia đình, công viên Safari World, biển đảo Pattaya và mua sắm',
        'gia đình có trẻ nhỏ, nhóm bạn và khách muốn chuyến đi ngắn ngày dễ đi',
      ),
      price: 8_900_000,
      duration: '4 ngày 3 đêm',
      availableSeats: 110,
      imageUrl: IMAGES.bangkokPattaya[1],
      tourType: 'Tour Gia Đình',
      departurePoint: 'Hà Nội',
      highlights: [
        'Khám phá công viên Safari World và Marine Park',
        'Cano ra đảo Coral tắm biển và chơi thể thao nước',
        'Tham quan chùa Phật Vàng và chợ Asiatique',
        'Lịch trình ngắn ngày, phù hợp gia đình có trẻ nhỏ',
      ],
      gallery: [...IMAGES.bangkokPattaya],
      itinerary: [
        {
          title: 'Việt Nam - Bangkok',
          description:
            'Bay sang Bangkok, đón khách tại sân bay, tham quan chùa Phật Vàng và dạo chợ đêm Asiatique ven sông.',
          accommodation: 'Khách sạn Bangkok theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay Việt Nam - Bangkok', 'Chùa Phật Vàng', 'Asiatique'],
          imageUrl: IMAGES.bangkokPattaya[0],
        },
        {
          title: 'Safari World - Marine Park',
          description:
            'Cả ngày vui chơi tại Safari World và Marine Park với thế giới động vật hoang dã và các show trình diễn.',
          accommodation: 'Khách sạn Bangkok theo gói',
          transport: 'Xe du lịch',
          activities: ['Safari World', 'Marine Park', 'Show cá heo'],
          imageUrl: IMAGES.bangkokPattaya[1],
        },
        {
          title: 'Bangkok - Pattaya - Đảo Coral',
          description:
            'Di chuyển đến Pattaya, đi cano ra đảo Coral tắm biển, chơi thể thao nước và nghỉ đêm tại thành phố biển.',
          accommodation: 'Khách sạn Pattaya theo gói',
          transport: 'Xe du lịch và cano',
          activities: ['Đảo Coral', 'Thể thao nước', 'Biển Pattaya'],
          imageUrl: IMAGES.bangkokPattaya[2],
        },
        {
          title: 'Pattaya - Bangkok - Việt Nam',
          description:
            'Mua đặc sản, ra sân bay Suvarnabhumi và bay về Việt Nam, kết thúc hành trình.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Mua đặc sản', 'Sân bay Suvarnabhumi', 'Bay về Việt Nam'],
          imageUrl: IMAGES.bangkokPattaya[0],
        },
      ],
      faqs: [
        {
          question: 'Tour có phù hợp với trẻ nhỏ không?',
          answer:
            'Rất phù hợp. Đây là tuyến thiên về giải trí gia đình với Safari World và biển đảo, nhịp di chuyển nhẹ nhàng.',
        },
        {
          question: 'Tour Thái Lan có cần visa không?',
          answer:
            'Khách Việt Nam du lịch ngắn ngày tại Thái Lan thường không cần visa, hộ chiếu cần còn hạn theo quy định.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Seoul - Nami',
      slug: 'seoul-nami',
      region: 'Đông Bắc Á',
      countryCode: 'KR',
      description:
        'Tuyến Hàn Quốc phổ biến với Seoul, Gyeongbokgung, đảo Nami, mua sắm, ẩm thực và công viên giải trí theo mùa.',
      imageUrl: IMAGES.seoulNami[0],
    },
    tour: {
      tourCode: 'INT-KOR-012',
      name: 'Hàn Quốc Seoul - Nami - Trượt Tuyết 5 Ngày 4 Đêm',
      description: buildDescription(
        'Tour Hàn Quốc mùa đông kết hợp trải nghiệm trượt tuyết, đảo Nami phủ tuyết, Seoul và Lotte World cho khách yêu không khí lạnh và tuyết trắng.',
        'trượt tuyết, cảnh quan mùa đông, văn hóa Hàn Quốc và giải trí',
        'khách trẻ, gia đình và nhóm bạn muốn trải nghiệm mùa đông Hàn Quốc',
      ),
      price: 24_900_000,
      duration: '5 ngày 4 đêm',
      availableSeats: 90,
      imageUrl: IMAGES.seoulNami[1],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Trải nghiệm trượt tuyết tại khu resort mùa đông',
        'Đảo Nami phủ tuyết và hàng cây biểu tượng',
        'Vui chơi Lotte World và tháp Namsan',
        'Mua sắm mỹ phẩm, nhân sâm tại Myeongdong',
      ],
      gallery: [...IMAGES.seoulNami],
      itinerary: [
        {
          title: 'Việt Nam - Seoul',
          description: 'Bay đến Seoul, đón khách, nhận phòng và nghỉ ngơi.',
          accommodation: 'Khách sạn Seoul theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Seoul', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.seoulNami[0],
        },
        {
          title: 'Trượt tuyết tại ski resort',
          description:
            'Cả ngày trải nghiệm trượt tuyết tại khu resort mùa đông, có huấn luyện viên và thuê đồ theo nhu cầu.',
          accommodation: 'Khách sạn Seoul theo gói',
          transport: 'Xe du lịch',
          activities: ['Trượt tuyết', 'Thuê dụng cụ trượt', 'Vui chơi trên tuyết'],
          imageUrl: IMAGES.seoulNami[1],
        },
        {
          title: 'Đảo Nami - Tháp Namsan',
          description:
            'Tham quan đảo Nami với hàng cây phủ tuyết, chiều về tháp Namsan ngắm toàn cảnh Seoul.',
          accommodation: 'Khách sạn Seoul theo gói',
          transport: 'Xe du lịch',
          activities: ['Đảo Nami', 'Tháp Namsan', 'Ẩm thực Hàn Quốc'],
          imageUrl: IMAGES.seoulNami[2],
        },
        {
          title: 'Lotte World - Myeongdong',
          description:
            'Vui chơi Lotte World, sau đó tự do mua sắm mỹ phẩm và đặc sản tại Myeongdong.',
          accommodation: 'Khách sạn Seoul theo gói',
          transport: 'Xe du lịch',
          activities: ['Lotte World', 'Myeongdong', 'Mua sắm mỹ phẩm'],
          imageUrl: IMAGES.seoulNami[0],
        },
        {
          title: 'Seoul - Việt Nam',
          description:
            'Ăn sáng, trả phòng và ra sân bay Incheon bay về Việt Nam, kết thúc hành trình.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Sân bay Incheon', 'Bay về Việt Nam'],
          imageUrl: IMAGES.seoulNami[1],
        },
      ],
      faqs: [
        {
          question: 'Không biết trượt tuyết có tham gia được không?',
          answer:
            'Được. Khu resort có khu vực cho người mới và huấn luyện viên hỗ trợ, khách có thể trải nghiệm ở mức cơ bản an toàn.',
        },
        {
          question: 'Đi mùa đông cần chuẩn bị gì?',
          answer:
            'Khách nên mang áo ấm, găng tay, mũ len và giày chống trượt; nhiệt độ mùa đông Hàn Quốc có thể xuống dưới 0 độ.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Singapore - Malaysia',
      slug: 'singapore-malaysia',
      region: 'Đông Nam Á',
      countryCode: 'SG-MY',
      description:
        'Tuyến liên tuyến phổ biến kết hợp Singapore hiện đại với Kuala Lumpur, Genting và Malacca của Malaysia.',
      imageUrl: IMAGES.singaporeMalaysia[0],
    },
    tour: {
      tourCode: 'INT-SGMY-013',
      name: 'Singapore Sentosa - Universal Studios 4 Ngày 3 Đêm',
      description: buildDescription(
        'Tour Singapore rút gọn tập trung vào đảo Sentosa, Universal Studios và các biểu tượng hiện đại, dành cho khách muốn một chuyến giải trí gia đình gọn gàng.',
        'đảo Sentosa, Universal Studios, công trình biểu tượng và mua sắm',
        'gia đình có trẻ nhỏ, cặp đôi và nhóm bạn muốn tour ngắn ngày tiện lợi',
      ),
      price: 13_900_000,
      duration: '4 ngày 3 đêm',
      availableSeats: 100,
      imageUrl: IMAGES.singaporeMalaysia[1],
      tourType: 'Tour Gia Đình',
      departurePoint: 'TP.HCM',
      highlights: [
        'Vui chơi Universal Studios trên đảo Sentosa',
        'Check-in Marina Bay Sands và Gardens by the Bay',
        'Trải nghiệm cáp treo và các điểm trên đảo Sentosa',
        'Tự do mua sắm tại đại lộ Orchard',
      ],
      gallery: [...IMAGES.singaporeMalaysia],
      itinerary: [
        {
          title: 'Việt Nam - Singapore',
          description:
            'Bay đến Singapore, tham quan khu Marina Bay, Merlion và ngắm Singapore về đêm.',
          accommodation: 'Khách sạn Singapore theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Marina Bay', 'Merlion Park', 'Singapore về đêm'],
          imageUrl: IMAGES.singaporeMalaysia[0],
        },
        {
          title: 'Đảo Sentosa - Universal Studios',
          description:
            'Cả ngày vui chơi tại Universal Studios và các điểm giải trí trên đảo Sentosa.',
          accommodation: 'Khách sạn Singapore theo gói',
          transport: 'Xe du lịch và cáp treo',
          activities: ['Universal Studios', 'Đảo Sentosa', 'Cáp treo Sentosa'],
          imageUrl: IMAGES.singaporeMalaysia[1],
        },
        {
          title: 'Gardens by the Bay - Mua sắm',
          description:
            'Tham quan Gardens by the Bay, khu trung tâm và tự do mua sắm tại đại lộ Orchard.',
          accommodation: 'Khách sạn Singapore theo gói',
          transport: 'Xe du lịch',
          activities: ['Gardens by the Bay', 'Đại lộ Orchard', 'Mua sắm'],
          imageUrl: IMAGES.singaporeMalaysia[2],
        },
        {
          title: 'Singapore - Việt Nam',
          description:
            'Ăn sáng, tự do mua đặc sản và ra sân bay Changi bay về Việt Nam.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Mua đặc sản', 'Sân bay Changi', 'Bay về Việt Nam'],
          imageUrl: IMAGES.singaporeMalaysia[0],
        },
      ],
      faqs: [
        {
          question: 'Vé Universal Studios đã bao gồm chưa?',
          answer:
            'Tùy gói khách chọn. Gói tiêu chuẩn và nâng cấp được phân biệt rõ vé Universal Studios khi đặt.',
        },
        {
          question: 'Tour có cần visa Singapore không?',
          answer:
            'Khách Việt Nam du lịch ngắn ngày thường không cần visa Singapore, hộ chiếu cần còn hạn và đáp ứng quy định nhập cảnh.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Đài Loan',
      slug: 'dai-loan',
      region: 'Đông Bắc Á',
      countryCode: 'TW',
      description:
        'Điểm đến Đông Bắc Á được ưa chuộng với Đài Bắc 101, chợ đêm, Cửu Phần, Đài Trung, Cao Hùng và ẩm thực đường phố.',
      imageUrl: IMAGES.taiwan[0],
    },
    tour: {
      tourCode: 'INT-TWN-014',
      name: 'Đài Loan Đài Bắc - Alishan - Nhật Nguyệt Đàm 5 Ngày 4 Đêm',
      description: buildDescription(
        'Tour Đài Loan thiên về thiên nhiên, kết hợp rừng Alishan, hồ Nhật Nguyệt Đàm và Đài Bắc cho khách muốn một tuyến khác với city tour quen thuộc.',
        'thiên nhiên Alishan, hồ Nhật Nguyệt Đàm, văn hóa và ẩm thực Đài Loan',
        'khách yêu thiên nhiên, gia đình và nhóm bạn muốn tuyến Đài Loan khác biệt',
      ),
      price: 18_900_000,
      duration: '5 ngày 4 đêm',
      availableSeats: 85,
      imageUrl: IMAGES.taiwan[0],
      tourType: 'Khám Phá',
      departurePoint: 'TP.HCM',
      highlights: [
        'Ngắm bình minh và rừng cây cổ thụ Alishan',
        'Du thuyền hồ Nhật Nguyệt Đàm',
        'Check-in Đài Bắc 101 và phố cổ Cửu Phần',
        'Trải nghiệm tàu lửa rừng Alishan',
      ],
      gallery: [...IMAGES.taiwan],
      itinerary: [
        {
          title: 'Việt Nam - Đài Bắc',
          description:
            'Bay đến Đài Bắc, nhận phòng và trải nghiệm chợ đêm theo thời gian đến.',
          accommodation: 'Khách sạn Đài Bắc theo gói',
          transport: 'Máy bay và xe du lịch',
          activities: ['Bay đến Đài Bắc', 'Chợ đêm Đài Loan'],
          imageUrl: IMAGES.taiwan[0],
        },
        {
          title: 'Đài Bắc 101 - Cửu Phần',
          description:
            'Tham quan Đài Bắc 101, phố cổ Cửu Phần và các điểm văn hóa nổi bật.',
          accommodation: 'Khách sạn Đài Bắc theo gói',
          transport: 'Xe du lịch',
          activities: ['Đài Bắc 101', 'Cửu Phần', 'Ẩm thực địa phương'],
          imageUrl: IMAGES.taiwan[1],
        },
        {
          title: 'Đài Trung - Hồ Nhật Nguyệt Đàm',
          description:
            'Di chuyển đến Đài Trung, du thuyền hồ Nhật Nguyệt Đàm và tham quan đền chùa ven hồ.',
          accommodation: 'Khách sạn Đài Trung/Gia Nghĩa theo gói',
          transport: 'Xe du lịch và thuyền',
          activities: ['Hồ Nhật Nguyệt Đàm', 'Đền Văn Vũ', 'Du thuyền'],
          imageUrl: IMAGES.taiwan[2],
        },
        {
          title: 'Rừng Alishan',
          description:
            'Đi tàu lửa rừng Alishan, ngắm bình minh, rừng cây cổ thụ và biển mây theo thời tiết.',
          accommodation: 'Khách sạn Đài Trung theo gói',
          transport: 'Xe du lịch và tàu lửa rừng',
          activities: ['Rừng Alishan', 'Tàu lửa rừng', 'Bình minh Alishan'],
          imageUrl: IMAGES.taiwan[0],
        },
        {
          title: 'Đài Bắc - Việt Nam',
          description:
            'Ăn sáng, mua đặc sản và ra sân bay bay về Việt Nam, kết thúc hành trình.',
          transport: 'Xe du lịch và máy bay',
          activities: ['Mua đặc sản Đài Loan', 'Sân bay Đào Viên', 'Bay về Việt Nam'],
          imageUrl: IMAGES.taiwan[1],
        },
      ],
      faqs: [
        {
          question: 'Tour Đài Loan này khác tuyến city tour thế nào?',
          answer:
            'Tuyến này tập trung vào thiên nhiên như Alishan và hồ Nhật Nguyệt Đàm, thay vì chỉ city tour và mua sắm.',
        },
        {
          question: 'Thời tiết Alishan thế nào?',
          answer:
            'Alishan ở vùng núi cao, sáng sớm khá lạnh và có thể có sương; khách nên mang áo ấm để ngắm bình minh.',
        },
      ],
    },
  },
];

type FlightConfig = {
  airline: string;
  airlineEn: string;
  flightCode: string;
  returnFlightCode: string;
  departureAirport: string;
  arrivalAirport: string;
  departureHour: number;
  flightDurationHours: number;
  flightClass: string;
  tourDays: number; // used to compute return day offset
};

// tourCode → flight config
const FLIGHT_CONFIGS: Record<string, FlightConfig> = {
  'INT-THA-001': {
    airline: 'Vietnam Airlines',
    airlineEn: 'Vietnam Airlines',
    flightCode: 'VN-570',
    returnFlightCode: 'VN-571',
    departureAirport: 'HAN',
    arrivalAirport: 'BKK',
    departureHour: 7,
    flightDurationHours: 2.5,
    flightClass: 'Economy',
    tourDays: 5,
  },
  'INT-SGMY-002': {
    airline: 'Vietnam Airlines',
    airlineEn: 'Vietnam Airlines',
    flightCode: 'VN-630',
    returnFlightCode: 'VN-631',
    departureAirport: 'HAN',
    arrivalAirport: 'SIN',
    departureHour: 8,
    flightDurationHours: 3.5,
    flightClass: 'Economy',
    tourDays: 5,
  },
  'INT-IDN-003': {
    airline: 'Vietjet Air',
    airlineEn: 'Vietjet Air',
    flightCode: 'VJ-780',
    returnFlightCode: 'VJ-781',
    departureAirport: 'SGN',
    arrivalAirport: 'DPS',
    departureHour: 6,
    flightDurationHours: 3,
    flightClass: 'Economy',
    tourDays: 4,
  },
  'INT-TWN-004': {
    airline: 'Vietjet Air',
    airlineEn: 'Vietjet Air',
    flightCode: 'VJ-850',
    returnFlightCode: 'VJ-851',
    departureAirport: 'SGN',
    arrivalAirport: 'TPE',
    departureHour: 7,
    flightDurationHours: 3.5,
    flightClass: 'Economy',
    tourDays: 5,
  },
  'INT-HKMO-005': {
    airline: 'Vietnam Airlines',
    airlineEn: 'Vietnam Airlines',
    flightCode: 'VN-590',
    returnFlightCode: 'VN-591',
    departureAirport: 'HAN',
    arrivalAirport: 'HKG',
    departureHour: 7,
    flightDurationHours: 2.5,
    flightClass: 'Economy',
    tourDays: 4,
  },
  'INT-KOR-006': {
    airline: 'Vietnam Airlines',
    airlineEn: 'Vietnam Airlines',
    flightCode: 'VN-410',
    returnFlightCode: 'VN-411',
    departureAirport: 'SGN',
    arrivalAirport: 'ICN',
    departureHour: 8,
    flightDurationHours: 5,
    flightClass: 'Economy',
    tourDays: 5,
  },
  'INT-JPN-007': {
    airline: 'Vietnam Airlines',
    airlineEn: 'Vietnam Airlines',
    flightCode: 'VN-310',
    returnFlightCode: 'VN-311',
    departureAirport: 'HAN',
    arrivalAirport: 'NRT',
    departureHour: 7,
    flightDurationHours: 5,
    flightClass: 'Economy',
    tourDays: 5,
  },
  'INT-JPN-008': {
    airline: 'Vietnam Airlines',
    airlineEn: 'Vietnam Airlines',
    flightCode: 'VN-340',
    returnFlightCode: 'VN-341',
    departureAirport: 'HAN',
    arrivalAirport: 'KIX',
    departureHour: 7,
    flightDurationHours: 5,
    flightClass: 'Economy',
    tourDays: 5,
  },
  'INT-UAE-009': {
    airline: 'Emirates',
    airlineEn: 'Emirates',
    flightCode: 'EK-392',
    returnFlightCode: 'EK-393',
    departureAirport: 'HAN',
    arrivalAirport: 'DXB',
    departureHour: 0,
    flightDurationHours: 8,
    flightClass: 'Economy',
    tourDays: 5,
  },
  'INT-EUR-010': {
    airline: 'Air France',
    airlineEn: 'Air France',
    flightCode: 'AF-259',
    returnFlightCode: 'AF-258',
    departureAirport: 'SGN',
    arrivalAirport: 'CDG',
    departureHour: 22,
    flightDurationHours: 12,
    flightClass: 'Economy',
    tourDays: 8,
  },
  'INT-THA-011': {
    airline: 'Vietnam Airlines',
    airlineEn: 'Vietnam Airlines',
    flightCode: 'VN-610',
    returnFlightCode: 'VN-611',
    departureAirport: 'HAN',
    arrivalAirport: 'BKK',
    departureHour: 8,
    flightDurationHours: 2.5,
    flightClass: 'Economy',
    tourDays: 4,
  },
  'INT-KOR-012': {
    airline: 'Vietnam Airlines',
    airlineEn: 'Vietnam Airlines',
    flightCode: 'VN-416',
    returnFlightCode: 'VN-417',
    departureAirport: 'HAN',
    arrivalAirport: 'ICN',
    departureHour: 0,
    flightDurationHours: 5,
    flightClass: 'Economy',
    tourDays: 5,
  },
  'INT-SGMY-013': {
    airline: 'Vietjet Air',
    airlineEn: 'Vietjet Air',
    flightCode: 'VJ-635',
    returnFlightCode: 'VJ-636',
    departureAirport: 'SGN',
    arrivalAirport: 'SIN',
    departureHour: 9,
    flightDurationHours: 2,
    flightClass: 'Economy',
    tourDays: 4,
  },
  'INT-TWN-014': {
    airline: 'Vietjet Air',
    airlineEn: 'Vietjet Air',
    flightCode: 'VJ-855',
    returnFlightCode: 'VJ-856',
    departureAirport: 'SGN',
    arrivalAirport: 'TPE',
    departureHour: 8,
    flightDurationHours: 3.5,
    flightClass: 'Economy',
    tourDays: 5,
  },
};

function buildFlightCreate(cfg: FlightConfig, departureDate: Date) {
  const depTime = new Date(departureDate);
  depTime.setHours(cfg.departureHour, 0, 0, 0);

  const arrTime = new Date(
    depTime.getTime() + cfg.flightDurationHours * 3_600_000,
  );

  const retDepTime = new Date(departureDate);
  retDepTime.setDate(retDepTime.getDate() + cfg.tourDays - 1);
  retDepTime.setHours(14, 0, 0, 0);

  const retArrTime = new Date(
    retDepTime.getTime() + cfg.flightDurationHours * 3_600_000,
  );

  return {
    type: TransportType.FLIGHT,
    airline: cfg.airline,
    airlineEn: cfg.airlineEn,
    flightCode: cfg.flightCode,
    departureAirport: cfg.departureAirport,
    arrivalAirport: cfg.arrivalAirport,
    departureTime: depTime,
    arrivalTime: arrTime,
    flightClass: cfg.flightClass,
    returnAirline: cfg.airline,
    returnAirlineEn: cfg.airlineEn,
    returnFlightCode: cfg.returnFlightCode,
    returnDepartureAirport: cfg.arrivalAirport,
    returnArrivalAirport: cfg.departureAirport,
    returnDepartureTime: retDepTime,
    returnArrivalTime: retArrTime,
    returnFlightClass: cfg.flightClass,
    notes:
      'Vé máy bay đã bao gồm trong giá tour. Hành lý ký gửi theo quy định hãng bay.',
    notesEn:
      'Airfare included in tour price. Checked baggage subject to airline policy.',
  };
}

function departureData(basePrice: number, baseSeats: number, tourCode: string) {
  const flightCfg = FLIGHT_CONFIGS[tourCode];
  const offsets = [30, 45, 60, 90];
  return offsets.map((offset, index) => {
    const departureDate = addDays(offset);
    return {
      departureDate,
      price: basePrice,
      availableSeats: Math.max(10, baseSeats - index * 4),
      maxSeats: baseSeats,
      note: 'Lịch khởi hành định kỳ',
      category: null,
      flashSaleEndsAt: null,
      isActive: true,
      sortOrder: index,
      transport: flightCfg
        ? { create: buildFlightCreate(flightCfg, departureDate) }
        : undefined,
    };
  });
}

export async function seedInternationalTours(prisma: PrismaClient) {
  for (const item of internationalTours) {
    const destination = await prisma.destination.upsert({
      where: { slug: item.destination.slug },
      update: {
        slug: item.destination.slug,
        description: item.destination.description,
        imageUrl: item.destination.imageUrl,
        region: item.destination.region,
        travelScope: INTERNATIONAL_SCOPE,
        countryCode: item.destination.countryCode,
      },
      create: {
        name: item.destination.name,
        slug: item.destination.slug,
        description: item.destination.description,
        imageUrl: item.destination.imageUrl,
        region: item.destination.region,
        travelScope: INTERNATIONAL_SCOPE,
        countryCode: item.destination.countryCode,
      },
    });

    const tour = await prisma.tour.upsert({
      where: { tourCode: item.tour.tourCode },
      update: {
        name: item.tour.name,
        description: item.tour.description,
        price: item.tour.price,
        destinationId: destination.id,
        startDate: addDays(30),
        duration: item.tour.duration,
        availableSeats: item.tour.availableSeats,
        imageUrl: item.tour.imageUrl,
        averageRating: 4.7,
        tourType: item.tour.tourType,
        departurePoint: item.tour.departurePoint,
        status: TourStatus.PUBLISHED,
        publishedAt: new Date(),
        deletedAt: null,
        reviewNote: null,
      },
      create: {
        tourCode: item.tour.tourCode,
        name: item.tour.name,
        description: item.tour.description,
        price: item.tour.price,
        destinationId: destination.id,
        startDate: addDays(30),
        duration: item.tour.duration,
        availableSeats: item.tour.availableSeats,
        imageUrl: item.tour.imageUrl,
        averageRating: 4.7,
        tourType: item.tour.tourType,
        departurePoint: item.tour.departurePoint,
        status: TourStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await prisma.$transaction([
      prisma.tourPackage.deleteMany({ where: { tourId: tour.id } }),
      prisma.tourDeparture.deleteMany({ where: { tourId: tour.id } }),
      prisma.tourItinerary.deleteMany({ where: { tourId: tour.id } }),
      prisma.tourHighlight.deleteMany({ where: { tourId: tour.id } }),
      prisma.tourFAQ.deleteMany({ where: { tourId: tour.id } }),
      prisma.tourImage.deleteMany({ where: { tourId: tour.id } }),
    ]);

    await prisma.$transaction([
      ...packageData(item.tour.price).map((pkg) =>
        prisma.tourPackage.create({
          data: {
            tourId: tour.id,
            ...pkg,
          },
        }),
      ),
      ...departureData(
        item.tour.price,
        Math.min(item.tour.availableSeats, 36),
        item.tour.tourCode,
      ).map((departure) =>
        prisma.tourDeparture.create({
          data: {
            tourId: tour.id,
            ...departure,
          },
        }),
      ),
      ...item.tour.itinerary.map((day, index) =>
        prisma.tourItinerary.create({
          data: {
            tourId: tour.id,
            dayNumber: index + 1,
            title: day.title,
            description: day.description,
            mealsBreakfast: index > 0,
            mealsLunch: true,
            mealsDinner: index < item.tour.itinerary.length - 1,
            accommodation: day.accommodation ?? null,
            transport: day.transport,
            activities: day.activities,
            imageUrl: day.imageUrl,
            timeline: buildTimeline(day),
          },
        }),
      ),
      ...item.tour.highlights.map((content, index) =>
        prisma.tourHighlight.create({
          data: {
            tourId: tour.id,
            content,
            icon:
              index === 0
                ? 'flight_takeoff'
                : index === 1
                  ? 'location_city'
                  : index === 2
                    ? 'restaurant'
                    : 'verified',
            sortOrder: index,
          },
        }),
      ),
      ...item.tour.gallery.map((url, index) =>
        prisma.tourImage.create({
          data: {
            tourId: tour.id,
            url,
            altText: `${item.tour.name} - ảnh ${index + 1}`,
            sortOrder: index,
          },
        }),
      ),
      ...item.tour.faqs.map((faq, index) =>
        prisma.tourFAQ.create({
          data: {
            tourId: tour.id,
            question: faq.question,
            answer: faq.answer,
            sortOrder: index,
          },
        }),
      ),
    ]);
  }

  const seededTours = await prisma.tour.count({
    where: {
      tourCode: { in: internationalTours.map((item) => item.tour.tourCode) },
      deletedAt: null,
    },
  });
  const seededDestinations = await prisma.destination.count({
    where: {
      slug: { in: internationalTours.map((item) => item.destination.slug) },
      travelScope: INTERNATIONAL_SCOPE,
    },
  });

  console.table([
    { group: 'International destinations', count: seededDestinations },
    { group: 'International tours', count: seededTours },
  ]);
}
