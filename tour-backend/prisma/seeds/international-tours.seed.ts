import { Prisma, PrismaClient, TourStatus } from '@prisma/client';

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
    `Hành trình duoc thiet ke theo nhip vừa phải, tap trung vao ${focus}. Lịch trình uu tien cac điểm biểu tượng, thời gian nghi hop ly, bua an theo chương trình va hướng dẫn viên theo đoàn.`,
    '',
    `Tour phù hợp voi ${suitableFor}. Gia seed có thể hien thi tot cho demo đặt tour, so sảnh goi dịch vụ, ngày khởi hành, voucher va quy trinh thảnh toan.`,
  ].join('\n');
}

function packageData(basePrice: number) {
  return [
    {
      name: 'Gói Tiêu Chuẩn',
      description:
        'Gói cân bằng chi phí, phù hợp khach muon lịch trình trọn gói voi dịch vụ co ban ro rang.',
      price: basePrice,
      badge: 'BEST VALUE',
      includes: [
        'Vé máy bay khu hoi theo chương trình',
        'Khách sạn tieu chuan 3 sao hoac tuong duong',
        'Xe dua don va tham quan theo lịch trình',
        'Hướng dẫn viên tieng Viet theo đoàn',
        'Bua an va ve tham quan theo chương trình',
        'Bảo hiểm du lịch quoc te co ban',
      ],
      excludes: [
        'Hộ chiếu va chi phí ca nhan',
        'Visa neu chương trình khong ghi bao gồm',
        'Hành lý qua cuoc, tiền tip va dịch vụ ngoai lịch trình',
      ],
      sortOrder: 0,
    },
    {
      name: 'Gói Cao Cấp',
      description:
        'Nâng cấp khách sạn, bua an va hỗ trợ thủ tục de hành trình thoai mai hon.',
      price: Math.round(basePrice * 1.25),
      badge: 'POPULAR',
      includes: [
        'Vé máy bay khu hoi gio bay đẹp hon theo tinh trang cho',
        'Khách sạn tieu chuan 4 sao hoac tuong duong',
        'Xe dua don va tham quan theo lịch trình',
        'Hướng dẫn viên kinh nghiem',
        'Bua an nâng cấp va ve tham quan theo chương trình',
        'Hỗ trợ hồ sơ visa neu can',
        'Bảo hiểm du lịch quoc te muc cao hon',
      ],
      excludes: [
        'Hộ chiếu va chi phí ca nhan',
        'Dịch vụ ngoai chương trình',
        'Phụ thu phong don neu co',
      ],
      sortOrder: 1,
    },
    {
      name: 'Gói Riêng Tư',
      description:
        'Dịch vụ linh hoạt hon cho gia đình hoac nhom nho muon rieng tu va chu dong thời gian.',
      price: Math.round(basePrice * 1.62),
      badge: 'LUXURY',
      includes: [
        'Vé máy bay khu hoi theo tư vấn rieng',
        'Khách sạn 4-5 sao tuy điểm đến',
        'Xe rieng trong lịch trình tham quan',
        'Hướng dẫn viên rieng tai điểm đến neu phù hợp',
        'Hỗ trợ điều chỉnh lịch trình truoc khởi hành',
        'Bảo hiểm du lịch quoc te muc cao',
      ],
      excludes: [
        'Hộ chiếu va chi phí ca nhan',
        'Dịch vụ phat sinh ngoai hop dong',
        'Nang hang ve máy bay neu khach yêu cầu',
      ],
      sortOrder: 2,
    },
  ];
}

function buildTimeline(day: DayPlan): Prisma.InputJsonValue {
  return [
    { time: '07:00', activity: 'Dung bữa sáng va chuan bi khởi hành' },
    { time: '09:00', activity: day.activities[0] ?? 'Tham quan điểm chính' },
    { time: '12:00', activity: 'Dung bữa trưa theo chương trình' },
    { time: '14:00', activity: day.activities[1] ?? 'Tiếp tục tham quan' },
    { time: '19:00', activity: 'Dung bữa tối va nghỉ ngơi' },
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
        'Tuyến Thái Lan phổ biến voi chua Wat Arun, city tour Bangkok, mua sắm, Pattaya va cac hoat dong giải trí ven biển.',
      imageUrl: IMAGES.bangkokPattaya[0],
    },
    tour: {
      tourCode: 'INT-THA-001',
      name: 'Thái Lan Bangkok - Pattaya 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Thái Lan kinh dien cho khach Viet, kết hợp Bangkok, Pattaya, chua Wat Arun, mua sắm va cac diem giải trí nổi bật.',
        'văn hóa Thái Lan, city tour, mua sắm va nghỉ dưỡng ngắn ngày',
        'gia đình, nhóm bạn, khach lần đầu di nuoc ngoai va khach muon tour giá dễ tiep can',
      ),
      price: 9_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 120,
      imageUrl: IMAGES.bangkokPattaya[0],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Tham quan chua Wat Arun va cac điểm biểu tượng Bangkok',
        'Trải nghiệm Pattaya va khong gian biển Thái Lan',
        'Co thời gian mua sắm tai cac trung tâm lon',
        'Lịch trình de di, phù hợp khach lần đầu di tour nuoc ngoai',
      ],
      gallery: [...IMAGES.bangkokPattaya],
      itinerary: [
        {
          title: 'Việt Nam - Bangkok',
          description:
            'Lam thủ tục bay sang Bangkok, đón khách tai sân bay, dung bữa tối va nhận phòng nghỉ ngơi.',
          accommodation: 'Khách sạn Bangkok theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Bay Việt Nam - Bangkok', 'Dung bữa tối Thái Lan'],
          imageUrl: IMAGES.bangkokPattaya[0],
        },
        {
          title: 'Bangkok city tour',
          description:
            'Tham quan chua Wat Arun, cac diem trung tâm Bangkok va tự do mua sắm theo lịch trình.',
          accommodation: 'Khách sạn Bangkok theo goi',
          transport: 'Xe du lịch',
          activities: ['Wat Arun', 'City tour Bangkok', 'Mua sắm'],
          imageUrl: IMAGES.bangkokPattaya[1],
        },
        {
          title: 'Bangkok - Pattaya',
          description:
            'Di chuyển den Pattaya, tham quan diem giải trí, nghi dem tai thảnh phổ biến.',
          accommodation: 'Khách sạn Pattaya theo goi',
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
            'Trả phòng, mua đặc sản, quay lai Bangkok va chuan bi hành trình ve Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: ['Mua đặc sản', 'Bay về Việt Nam'],
          imageUrl: IMAGES.bangkokPattaya[0],
        },
      ],
      faqs: [
        {
          question: 'Tour Thái Lan co can visa khong?',
          answer:
            'Khach Việt Nam du lịch ngắn ngày tai Thái Lan thuong khong can visa, tuy nhien hộ chiếu phai còn hạn theo quy định.',
        },
        {
          question: 'Gia da bao gồm ve máy bay chua?',
          answer:
            'Seed nay thiet ke theo tour trọn gói, ve máy bay nam trong dảnh sach bao gồm cua tung goi.',
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
        'Tuyến lien tuyến phổ biến kết hợp Singapore hien dai voi Kuala Lumpur, Genting va Malacca cua Malaysia.',
      imageUrl: IMAGES.singaporeMalaysia[0],
    },
    tour: {
      tourCode: 'INT-SGMY-002',
      name: 'Singapore - Malaysia 5 Ngay 4 Dem',
      description: buildDescription(
        'Hành trình Singapore - Malaysia kết hợp Marina Bay, Gardens by the Bay, Kuala Lumpur, Petronas Towers va cao nguyên Genting.',
        'do thi hien dai, công trình biểu tượng, mua sắm va giải trí gia đình',
        'gia đình, nhóm bạn, khach muon mot tour Đông Nam Á sach đẹp, de demo va nhieu điểm check-in',
      ),
      price: 14_500_000,
      duration: '5 ngay 4 dem',
      availableSeats: 100,
      imageUrl: IMAGES.singaporeMalaysia[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Hà Nội',
      highlights: [
        'Check-in Marina Bay va Gardens by the Bay',
        'Tham quan Petronas Towers tai Kuala Lumpur',
        'Trải nghiệm Genting hoac Malacca theo lịch trình',
        'Lien tuyến 2 quoc gia, phù hợp tour gia đình',
      ],
      gallery: [...IMAGES.singaporeMalaysia],
      itinerary: [
        {
          title: 'Việt Nam - Singapore',
          description:
            'Bay đến Singapore, tham quan khu Marina Bay, Merlion va nghi dem tai Singapore.',
          accommodation: 'Khách sạn Singapore theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Marina Bay', 'Merlion Park', 'Singapore ve dem'],
          imageUrl: IMAGES.singaporeMalaysia[0],
        },
        {
          title: 'Singapore city tour',
          description:
            'Tham quan Gardens by the Bay, khu trung tâm va cac diem mua sắm nổi bật.',
          accommodation: 'Khách sạn Singapore theo goi',
          transport: 'Xe du lịch',
          activities: ['Gardens by the Bay', 'City tour Singapore', 'Mua sắm'],
          imageUrl: IMAGES.singaporeMalaysia[0],
        },
        {
          title: 'Singapore - Kuala Lumpur',
          description:
            'Di chuyển sang Malaysia, tham quan Kuala Lumpur va Petronas Towers.',
          accommodation: 'Khách sạn Kuala Lumpur theo goi',
          transport: 'Xe du lịch',
          activities: ['Kuala Lumpur', 'Petronas Towers', 'Ẩm thực Malaysia'],
          imageUrl: IMAGES.singaporeMalaysia[1],
        },
        {
          title: 'Genting/Malacca - Việt Nam',
          description:
            'Tham quan cao nguyên Genting hoac Malacca theo chương trình, sau do bay về Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: [
            'Genting hoac Malacca',
            'Mua đặc sản',
            'Bay về Việt Nam',
          ],
          imageUrl: IMAGES.singaporeMalaysia[2],
        },
      ],
      faqs: [
        {
          question: 'Tour co qua biển gioi Singapore - Malaysia bang gi?',
          answer:
            'Thong thuong di bang xe du lịch theo đoàn, hướng dẫn viên hỗ trợ thủ tục xuất nhập cảnh.',
        },
        {
          question: 'Co can visa Singapore/Malaysia khong?',
          answer:
            'Khach Việt Nam du lịch ngắn ngày thuong khong can visa, can hộ chiếu còn hạn va dap ung quy định nhập cảnh.',
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
        'Dao nghỉ dưỡng Indonesia nổi tiếng voi đền Hindu, ruộng bậc thang Ubud, biển, resort va khong gian honeymoon.',
      imageUrl: IMAGES.bali[0],
    },
    tour: {
      tourCode: 'INT-IDN-003',
      name: 'Bali Ubud - Den Ulun Danu - Nghi Duong Biển 4 Ngay 3 Dem',
      description: buildDescription(
        'Tour Bali dảnh cho khach yeu nghỉ dưỡng, kết hợp Ubud, den Ulun Danu, ruộng bậc thang va thời gian thư giãn ben biển.',
        'nghỉ dưỡng dao, văn hóa Hindu Bali, ruộng bậc thang va resort biển',
        'cặp đôi, khach honeymoon, gia đình va nhóm bạn muon lịch trình đẹp nhung khong qua gap',
      ),
      price: 16_900_000,
      duration: '4 ngay 3 dem',
      availableSeats: 80,
      imageUrl: IMAGES.bali[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'TP.HCM',
      highlights: [
        'Tham quan den Ulun Danu va cảnh quan Bali',
        'Trải nghiệm Ubud va ruộng bậc thang',
        'Co thời gian nghỉ dưỡng biển',
        'Phù hợp honeymoon va khach thich resort',
      ],
      gallery: [...IMAGES.bali],
      itinerary: [
        {
          title: 'Việt Nam - Bali',
          description:
            'Bay đến Bali, đón khách tai sân bay, nhận phòng va nghỉ ngơi tai resort/khách sạn.',
          accommodation: 'Khách sạn/resort Bali theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Bay đến Bali', 'Nhận phòng nghỉ dưỡng'],
          imageUrl: IMAGES.bali[0],
        },
        {
          title: 'Den Ulun Danu - Ubud',
          description:
            'Tham quan den Ulun Danu, khu Ubud va cac diem văn hóa dac trung cua Bali.',
          accommodation: 'Khách sạn/resort Bali theo goi',
          transport: 'Xe du lịch',
          activities: ['Den Ulun Danu', 'Ubud', 'Ẩm thực Bali'],
          imageUrl: IMAGES.bali[0],
        },
        {
          title: 'Ruộng bậc thang - Nghỉ dưỡng biển',
          description:
            'Check-in ruộng bậc thang, tự do nghỉ dưỡng, tam biển hoac dung dịch vụ resort.',
          accommodation: 'Khách sạn/resort Bali theo goi',
          transport: 'Xe du lịch',
          activities: ['Ruộng bậc thang', 'Nghỉ dưỡng biển', 'Tự do thư giãn'],
          imageUrl: IMAGES.bali[1],
        },
        {
          title: 'Bali - Việt Nam',
          description: 'Tự do mua sắm, trả phòng va bay về Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: ['Mua qua địa phương', 'Bay về Việt Nam'],
          imageUrl: IMAGES.bali[2],
        },
      ],
      faqs: [
        {
          question: 'Bali co can visa khong?',
          answer:
            'Quy định visa có thể thay doi theo thời điểm. Khach can duoc kiem tra hộ chiếu va quy định nhập cảnh trước ngày khởi hành.',
        },
        {
          question: 'Tour co phù hợp honeymoon khong?',
          answer:
            'Co. Lịch trình co nhieu thời gian nghỉ dưỡng va cac diem chup ảnh đẹp.',
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
        'Điểm đến dong bac A duoc ua chuong voi Đài Bắc 101, cho dem, Cửu Phần, Đài Trung, Cao Hùng va ẩm thực duong pho.',
      imageUrl: IMAGES.taiwan[0],
    },
    tour: {
      tourCode: 'INT-TWN-004',
      name: 'Đài Loan Đài Bắc - Đài Trung - Cao Hùng 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Đài Loan kết hợp Đài Bắc 101, cho dem, Cửu Phần, Đài Trung, Cao Hùng va cac diem city tour phổ biến.',
        'city tour, ẩm thực cho dem, mua sắm va cảnh quan dong bac A',
        'khách trẻ, gia đình, nhóm bạn va khach muon tour gan Việt Nam voi chi phí vừa phải',
      ),
      price: 17_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 90,
      imageUrl: IMAGES.taiwan[0],
      tourType: 'Khám Phá',
      departurePoint: 'TP.HCM',
      highlights: [
        'Check-in Taipei 101',
        'Trải nghiệm cho dem va ẩm thực Đài Loan',
        'Tham quan Cửu Phần/Đài Trung/Cao Hùng theo lich',
        'Tuyến tour phổ biến, de ban cho khach Viet',
      ],
      gallery: [...IMAGES.taiwan],
      itinerary: [
        {
          title: 'Việt Nam - Đài Bắc',
          description:
            'Bay đến Đài Bắc, nhận phòng va trải nghiệm cho dem theo thời gian den.',
          accommodation: 'Khách sạn Đài Bắc theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Bay đến Đài Bắc', 'Cho dem Đài Loan'],
          imageUrl: IMAGES.taiwan[0],
        },
        {
          title: 'Đài Bắc city tour',
          description:
            'Tham quan Taipei 101, cac diem trung tâm va khu mua sắm.',
          accommodation: 'Khách sạn Đài Bắc theo goi',
          transport: 'Xe du lịch',
          activities: ['Taipei 101', 'City tour Đài Bắc', 'Mua sắm'],
          imageUrl: IMAGES.taiwan[1],
        },
        {
          title: 'Cửu Phần - Đài Trung',
          description:
            'Khám phá phố cổ Cửu Phần hoac diem phù hợp thời tiết, di chuyển den Đài Trung.',
          accommodation: 'Khách sạn Đài Trung theo goi',
          transport: 'Xe du lịch',
          activities: ['Cửu Phần', 'Đài Trung', 'Ẩm thực địa phương'],
          imageUrl: IMAGES.taiwan[2],
        },
        {
          title: 'Cao Hùng - Việt Nam',
          description: 'Tham quan Cao Hùng, mua đặc sản va bay về Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: ['Cao Hùng', 'Mua đặc sản', 'Bay về Việt Nam'],
          imageUrl: IMAGES.taiwan[0],
        },
      ],
      faqs: [
        {
          question: 'Tour Đài Loan co can visa khong?',
          answer:
            'Tuy hồ sơ khach va quy định tai thời điểm đặt tour. He thong seed nen ghi ro can tư vấn visa truoc khởi hành.',
        },
        {
          question: 'Cho dem co nam trong lịch trình khong?',
          answer:
            'Co. Mot so buổi tối co thời gian cho khach trải nghiệm cho dem va ẩm thực địa phương.',
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
        'Lien tuyến do thi nổi tiếng voi skyline Hong Kong, Victoria Harbour, mua sắm va di sản Ruins of St. Paul tai Macau.',
      imageUrl: IMAGES.hongKongMacau[0],
    },
    tour: {
      tourCode: 'INT-HKMO-005',
      name: 'Hong Kong - Macau 4 Ngay 3 Dem',
      description: buildDescription(
        'Tour Hong Kong - Macau kết hợp Victoria Harbour, cac khu mua sắm, city tour Hong Kong va di sản Ruins of St. Paul tai Macau.',
        'do thi chau A, mua sắm, ẩm thực Quang Dong va di sản Macau',
        'khach thich city break, mua sắm, gia đình va nhóm bạn muon tour ngắn ngày',
      ),
      price: 18_900_000,
      duration: '4 ngay 3 dem',
      availableSeats: 80,
      imageUrl: IMAGES.hongKongMacau[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Hà Nội',
      highlights: [
        'Ngam skyline Hong Kong va Victoria Harbour',
        'Tham quan cac khu mua sắm nổi bật',
        'Di chuyển sang Macau va check-in Ruins of St. Paul',
        'Lịch trình ngan, phù hợp kỳ nghỉ ngắn ngày',
      ],
      gallery: [...IMAGES.hongKongMacau],
      itinerary: [
        {
          title: 'Việt Nam - Hong Kong',
          description:
            'Bay đến Hong Kong, đón khách, nhận phòng va tự do khám phá khu trung tâm.',
          accommodation: 'Khách sạn Hong Kong theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Bay đến Hong Kong', 'Victoria Harbour'],
          imageUrl: IMAGES.hongKongMacau[0],
        },
        {
          title: 'Hong Kong city tour',
          description:
            'Tham quan cac điểm biểu tượng, khu mua sắm va điểm ngắm cảnh theo chương trình.',
          accommodation: 'Khách sạn Hong Kong theo goi',
          transport: 'Xe du lịch',
          activities: ['City tour Hong Kong', 'Mua sắm', 'Ẩm thực Quang Dong'],
          imageUrl: IMAGES.hongKongMacau[0],
        },
        {
          title: 'Hong Kong - Macau',
          description:
            'Di chuyển sang Macau, tham quan Ruins of St. Paul va cac diem di sản nổi bật.',
          accommodation: 'Khách sạn Macau/Hong Kong theo goi',
          transport: 'Xe du lịch va tau/cau duong biển',
          activities: ['Macau', 'Ruins of St. Paul', 'Di sản Macau'],
          imageUrl: IMAGES.hongKongMacau[1],
        },
        {
          title: 'Macau/Hong Kong - Việt Nam',
          description: 'Mua đặc sản, trả phòng va bay về Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: ['Mua đặc sản', 'Bay về Việt Nam'],
          imageUrl: IMAGES.hongKongMacau[2],
        },
      ],
      faqs: [
        {
          question: 'Tour co di ca Hong Kong va Macau khong?',
          answer:
            'Co. Lịch trình seed co day du hai diem, có thể điều chỉnh số đêm tuy san phẩm thực te.',
        },
        {
          question: 'Co can visa khong?',
          answer:
            'Quy định nhập cảnh can duoc kiem tra theo hộ chiếu va thời điểm khởi hành.',
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
        'Tuyến Hàn Quốc phổ biến voi Seoul, Gyeongbokgung, dao Nami, mua sắm, ẩm thực va cong vien giải trí theo mùa.',
      imageUrl: IMAGES.seoulNami[0],
    },
    tour: {
      tourCode: 'INT-KOR-006',
      name: 'Hàn Quốc Seoul - Nami - Everland 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Hàn Quốc kết hợp cung điện Gyeongbokgung, dao Nami, mua sắm Seoul va Everland hoac diem thay the theo mùa.',
        'văn hóa Hàn Quốc, cảnh quan theo mùa, mua sắm va trải nghiệm giải trí',
        'gia đình, khách trẻ, nhóm bạn va khach yeu K-culture',
      ),
      price: 22_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 100,
      imageUrl: IMAGES.seoulNami[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'TP.HCM',
      highlights: [
        'Tham quan Gyeongbokgung va trung tâm Seoul',
        'Check-in dao Nami theo mùa',
        'Trải nghiệm Everland hoac diem giải trí phù hợp',
        'Mua sắm mỹ phẩm, nhân sâm va đặc sản Hàn Quốc',
      ],
      gallery: [...IMAGES.seoulNami],
      itinerary: [
        {
          title: 'Việt Nam - Seoul',
          description: 'Bay đến Seoul, đón khách, nhận phòng va nghỉ ngơi.',
          accommodation: 'Khách sạn Seoul theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Bay đến Seoul', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.seoulNami[0],
        },
        {
          title: 'Gyeongbokgung - Seoul city tour',
          description:
            'Tham quan cung điện Gyeongbokgung, khu trung tâm va cac diem văn hóa Seoul.',
          accommodation: 'Khách sạn Seoul theo goi',
          transport: 'Xe du lịch',
          activities: ['Gyeongbokgung', 'City tour Seoul', 'Ẩm thực Hàn Quốc'],
          imageUrl: IMAGES.seoulNami[1],
        },
        {
          title: 'Đảo Nami - Everland',
          description:
            'Di dao Nami, tiếp tục Everland hoac diem thay the theo thời tiết va mua.',
          accommodation: 'Khách sạn Seoul theo goi',
          transport: 'Xe du lịch',
          activities: ['Đảo Nami', 'Everland', 'Mua sắm'],
          imageUrl: IMAGES.seoulNami[2],
        },
        {
          title: 'Seoul - Việt Nam',
          description: 'Mua sắm đặc sản, hoan tat thủ tục va bay về Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: ['Mua sắm', 'Bay về Việt Nam'],
          imageUrl: IMAGES.seoulNami[0],
        },
      ],
      faqs: [
        {
          question: 'Tour Hàn Quốc co can visa khong?',
          answer:
            'Thuong can visa hoac dieu kien nhập cảnh phù hợp. Khach can nop hồ sơ theo huong dan trước ngày khởi hành.',
        },
        {
          question: 'Đảo Nami mua nao đẹp?',
          answer:
            'Xuan, thu va dong deu co diem hap dan rieng; seed phù hợp demo quảnh nam.',
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
        'Tuyến Nhật Bản kinh dien voi Tokyo, núi Phú Sĩ, Hakone, mua sắm va trải nghiệm văn hóa do thi Nhat.',
      imageUrl: IMAGES.tokyoFuji[0],
    },
    tour: {
      tourCode: 'INT-JPN-007',
      name: 'Nhật Bản Tokyo - Fuji - Hakone 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Nhật Bản tuyến Tokyo - Fuji - Hakone, phù hợp khach lần đầu den Nhat voi cac điểm biểu tượng va thời gian mua sắm.',
        'núi Phú Sĩ, do thi Tokyo, văn hóa Nhat va mua sắm',
        'gia đình, cặp đôi, nhóm bạn va khach muon sản phẩm Nhật Bản kinh dien',
      ),
      price: 32_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 90,
      imageUrl: IMAGES.tokyoFuji[0],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Ngam núi Phú Sĩ va khu Hakone/Fuji Five Lakes',
        'City tour Tokyo voi cac khu pho biểu tượng',
        'Trải nghiệm ẩm thực va mua sắm Nhật Bản',
        'Tuyến tour de demo phân khúc giá cảo',
      ],
      gallery: [...IMAGES.tokyoFuji],
      itinerary: [
        {
          title: 'Việt Nam - Tokyo',
          description: 'Bay đến Tokyo, đón khách va nghỉ ngơi tai khách sạn.',
          accommodation: 'Khách sạn Tokyo theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Bay đến Tokyo', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.tokyoFuji[2],
        },
        {
          title: 'Tokyo city tour',
          description:
            'Tham quan cac khu pho biểu tượng, đền chùa/noi mua sắm theo lịch trình.',
          accommodation: 'Khách sạn Tokyo theo goi',
          transport: 'Xe du lịch',
          activities: ['City tour Tokyo', 'Mua sắm', 'Ẩm thực Nhat'],
          imageUrl: IMAGES.tokyoFuji[0],
        },
        {
          title: 'Fuji - Hakone',
          description:
            'Di chuyển khu núi Phú Sĩ, tham quan điểm ngắm cảnh va nghỉ ngơi.',
          accommodation: 'Khách sạn khu Fuji/Hakone theo goi',
          transport: 'Xe du lịch',
          activities: ['Núi Phú Sĩ', 'Hakone', 'Cảnh quan Nhật Bản'],
          imageUrl: IMAGES.tokyoFuji[1],
        },
        {
          title: 'Tokyo - Việt Nam',
          description: 'Mua sắm, trả phòng va bay về Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: ['Mua sắm', 'Bay về Việt Nam'],
          imageUrl: IMAGES.tokyoFuji[2],
        },
      ],
      faqs: [
        {
          question: 'Tour Nhật Bản co can visa khong?',
          answer:
            'Thong thuong can visa Nhật Bản. Khach can hộ chiếu còn hạn va hồ sơ theo yêu cầu.',
        },
        {
          question: 'Co dam bao thay núi Phú Sĩ khong?',
          answer:
            'Cảnh núi Phú Sĩ phụ thuộc thời tiết. Neu suong/mua, lịch trình van giu điểm tham quan nhung tam nhin có thể han che.',
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
        'Tuyến Kansai nổi bật voi Osaka Castle, Kyoto, Arashiyama, đền chùa, ẩm thực va nhung diem văn hóa co kinh cua Nhật Bản.',
      imageUrl: IMAGES.osakaKyoto[0],
    },
    tour: {
      tourCode: 'INT-JPN-008',
      name: 'Nhật Bản Osaka - Kyoto - Nara 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Kansai kết hợp Osaka, Kyoto, Nara voi Osaka Castle, Arashiyama, đền chùa va cac khu pho ẩm thực nổi tiếng.',
        'văn hóa cổ đô Nhật Bản, thành phố Osaka, đền chùa va ẩm thực Kansai',
        'khach yeu văn hóa Nhat, gia đình va nhóm bạn muon tuyến Nhat khac Tokyo',
      ),
      price: 34_500_000,
      duration: '5 ngay 4 dem',
      availableSeats: 90,
      imageUrl: IMAGES.osakaKyoto[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'Hà Nội',
      highlights: [
        'Tham quan Osaka Castle',
        'Khám phá Kyoto va rừng tre Arashiyama',
        'Trải nghiệm Nara hoac đền chùa theo lịch trình',
        'Thuong thuc ẩm thực Kansai',
      ],
      gallery: [...IMAGES.osakaKyoto],
      itinerary: [
        {
          title: 'Việt Nam - Osaka',
          description: 'Bay đến Osaka, đón khách va nhận phòng nghỉ ngơi.',
          accommodation: 'Khách sạn Osaka theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Bay đến Osaka', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.osakaKyoto[1],
        },
        {
          title: 'Osaka city tour',
          description:
            'Tham quan Osaka Castle, khu trung tâm va diem ẩm thực theo chương trình.',
          accommodation: 'Khách sạn Osaka theo goi',
          transport: 'Xe du lịch',
          activities: ['Osaka Castle', 'Dotonbori', 'Ẩm thực Kansai'],
          imageUrl: IMAGES.osakaKyoto[1],
        },
        {
          title: 'Kyoto - Arashiyama',
          description:
            'Khám phá Kyoto, rừng tre Arashiyama va cac diem văn hóa co kinh.',
          accommodation: 'Khách sạn Osaka/Kyoto theo goi',
          transport: 'Xe du lịch',
          activities: ['Kyoto', 'Arashiyama Bamboo Grove', 'Đền chùa Nhật Bản'],
          imageUrl: IMAGES.osakaKyoto[0],
        },
        {
          title: 'Nara - Việt Nam',
          description:
            'Tham quan Nara hoac diem thay the theo mùa, mua sắm va bay về Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: ['Nara', 'Mua sắm', 'Bay về Việt Nam'],
          imageUrl: IMAGES.osakaKyoto[2],
        },
      ],
      faqs: [
        {
          question: 'Tour Osaka - Kyoto khac Tokyo - Fuji nhu the nao?',
          answer:
            'Tuyến Kansai nghieng ve văn hóa cổ đô, đền chùa va ẩm thực; Tokyo - Fuji nghieng ve do thi hien dai va núi Phú Sĩ.',
        },
        {
          question: 'Co can visa Nhật Bản khong?',
          answer:
            'Co. Khach can chuan bi hồ sơ visa theo yêu cầu trước ngày khởi hành.',
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
        'Tuyến Trung Đông cao cap voi Burj Khalifa, Dubai Mall, sa mạc, Abu Dhabi va Sheikh Zayed Grand Mosque.',
      imageUrl: IMAGES.dubaiAbuDhabi[0],
    },
    tour: {
      tourCode: 'INT-UAE-009',
      name: 'Dubai - Abu Dhabi 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Dubai - Abu Dhabi kết hợp công trình hien dai, sa mạc, mua sắm va đại thánh đường Sheikh Zayed tai Abu Dhabi.',
        'kiến trúc hien dai, desert safari, mua sắm va trải nghiệm Trung Đông',
        'khach cao cap, gia đình, nhóm bạn va khach muon điểm đến khac biet de demo phân khúc giá cảo',
      ),
      price: 29_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 80,
      imageUrl: IMAGES.dubaiAbuDhabi[0],
      tourType: 'Tour Cao Cấp',
      departurePoint: 'Hà Nội',
      highlights: [
        'Check-in Burj Khalifa va Dubai skyline',
        'Trải nghiệm desert safari theo chương trình',
        'Tham quan Sheikh Zayed Grand Mosque tai Abu Dhabi',
        'Mua sắm tai Dubai Mall hoac cac khu thuong mai lon',
      ],
      gallery: [...IMAGES.dubaiAbuDhabi],
      itinerary: [
        {
          title: 'Việt Nam - Dubai',
          description: 'Bay đến Dubai, đón khách, nhận phòng va nghỉ ngơi.',
          accommodation: 'Khách sạn Dubai theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Bay đến Dubai', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.dubaiAbuDhabi[0],
        },
        {
          title: 'Dubai city tour',
          description:
            'Tham quan Burj Khalifa, Dubai Mall va cac điểm biểu tượng cua Dubai.',
          accommodation: 'Khách sạn Dubai theo goi',
          transport: 'Xe du lịch',
          activities: ['Burj Khalifa', 'Dubai Mall', 'Dubai skyline'],
          imageUrl: IMAGES.dubaiAbuDhabi[0],
        },
        {
          title: 'Desert safari',
          description:
            'Trải nghiệm sa mạc theo chương trình, dung bữa tối va thuong thuc hoat dong giải trí địa phương.',
          accommodation: 'Khách sạn Dubai theo goi',
          transport: 'Xe du lịch/chuyen dung theo lich',
          activities: [
            'Desert safari',
            'Bữa tối sa mạc',
            'Giải trí địa phương',
          ],
          imageUrl: IMAGES.dubaiAbuDhabi[2],
        },
        {
          title: 'Abu Dhabi - Việt Nam',
          description:
            'Tham quan Sheikh Zayed Grand Mosque tai Abu Dhabi, sau do bay về Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: [
            'Abu Dhabi',
            'Sheikh Zayed Grand Mosque',
            'Bay về Việt Nam',
          ],
          imageUrl: IMAGES.dubaiAbuDhabi[1],
        },
      ],
      faqs: [
        {
          question: 'Tour Dubai co can visa khong?',
          answer:
            'Tuy hộ chiếu va quy định tai thời điểm khởi hành. Nhà tổ chức can tư vấn visa trước khi xac nhan booking.',
        },
        {
          question: 'Desert safari co bat buoc khong?',
          answer:
            'Khong. Khach co van de suc khoe có thể duoc tu văn hóat dong thay the phù hợp.',
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
        'Tuyến chau Au kinh dien kết hợp Paris, Brussels va Amsterdam voi tháp Eiffel, phố cổ chau Au, kênh đào va văn hóa Tay Au.',
      imageUrl: IMAGES.europeClassic[0],
    },
    tour: {
      tourCode: 'INT-EUR-010',
      name: 'Châu Âu Paris - Brussels - Amsterdam 8 Ngay 7 Dem',
      description: buildDescription(
        'Tour chau Au kinh dien cho khach Viet, kết hợp Paris, Brussels, Amsterdam, cac công trình biểu tượng va trải nghiệm do thi Tay Au.',
        'kiến trúc chau Au, city tour, văn hóa Tay Au va mua sắm',
        'khach co ngân sách cao, gia đình, cặp đôi va khach muon sản phẩm chau Au de demo cap do phuc tap hon',
      ),
      price: 59_900_000,
      duration: '8 ngay 7 dem',
      availableSeats: 70,
      imageUrl: IMAGES.europeClassic[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'TP.HCM',
      highlights: [
        'Check-in tháp Eiffel va cac điểm biểu tượng Paris',
        'Tham quan Brussels va khong gian phố cổ chau Au',
        'Trải nghiệm Amsterdam voi kênh đào va city tour',
        'Sản phẩm phù hợp phân khúc tour xa, giá trị cao',
      ],
      gallery: [...IMAGES.europeClassic],
      itinerary: [
        {
          title: 'Việt Nam - Paris',
          description:
            'Bay đến Paris, đón khách va nghỉ ngơi sau chang bay dai.',
          accommodation: 'Khách sạn Paris theo goi',
          transport: 'Máy bay va xe du lịch',
          activities: ['Bay đến Paris', 'Nhận phòng nghỉ ngơi'],
          imageUrl: IMAGES.europeClassic[0],
        },
        {
          title: 'Paris city tour',
          description:
            'Tham quan tháp Eiffel, cac dai lo va điểm biểu tượng Paris theo lịch trình.',
          accommodation: 'Khách sạn Paris theo goi',
          transport: 'Xe du lịch',
          activities: ['Tháp Eiffel', 'City tour Paris', 'Mua sắm'],
          imageUrl: IMAGES.europeClassic[0],
        },
        {
          title: 'Paris - Brussels',
          description:
            'Di chuyển den Brussels, tham quan trung tâm va khong gian phố cổ chau Au.',
          accommodation: 'Khách sạn Brussels theo goi',
          transport: 'Xe du lịch hoac tau theo lich',
          activities: ['Brussels', 'Phố cổ chau Au', 'Ẩm thực địa phương'],
          imageUrl: IMAGES.europeClassic[1],
        },
        {
          title: 'Brussels - Amsterdam',
          description:
            'Tiếp tục den Amsterdam, tham quan thành phố kênh đào va nghi dem.',
          accommodation: 'Khách sạn Amsterdam theo goi',
          transport: 'Xe du lịch hoac tau theo lich',
          activities: ['Amsterdam', 'Kênh đào', 'City tour'],
          imageUrl: IMAGES.europeClassic[2],
        },
        {
          title: 'Amsterdam - Việt Nam',
          description: 'Mua sắm, trả phòng va bay về Việt Nam.',
          transport: 'Xe du lịch va máy bay',
          activities: ['Mua sắm', 'Bay về Việt Nam'],
          imageUrl: IMAGES.europeClassic[0],
        },
      ],
      faqs: [
        {
          question: 'Tour chau Au co can visa Schengen khong?',
          answer:
            'Co. Khach can hồ sơ visa Schengen va thời gian xu ly du trước ngày khởi hành.',
        },
        {
          question: 'Gia có thể thay doi theo ve máy bay khong?',
          answer:
            'Co. Tour xa phụ thuộc nhieu vao gia ve, ty gia va tinh trang phong khách sạn.',
        },
      ],
    },
  },
];

function departureData(basePrice: number, baseSeats: number) {
  const offsets = [30, 45, 60, 90];
  return offsets.map((offset, index) => {
    const departureDate = addDays(offset);
    return {
      departureDate,
      price: basePrice,
      availableSeats: Math.max(10, baseSeats - index * 4),
      maxSeats: baseSeats,
      note: 'Lich khởi hành dinh ky',
      category: null,
      flashSaleEndsAt: null,
      isActive: true,
      sortOrder: index,
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
