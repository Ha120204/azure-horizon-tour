import {
  Prisma,
  PrismaClient,
  TourStatus,
} from '@prisma/client';

type Region = 'Miền Bắc' | 'Miền Trung' | 'Miền Nam';

type DayPlan = {
  title: string;
  description: string;
  accommodation?: string;
  transport: string;
  activities: string[];
  imageUrl: string;
};

type DomesticTourSeed = {
  destination: {
    name: string;
    slug: string;
    region: Region;
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

const DOMESTIC_SCOPE = 'DOMESTIC' as const;

function addDays(days: number): Date {
  const date = new Date();
  date.setHours(8, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function unsplashPhoto(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&q=80&w=1600`;
}

const IMAGES = {
  hanoi: [
    unsplashPhoto('photo-1702118937156-d8f4d86076ac'),
    unsplashPhoto('photo-1689080541115-5acffbf0a083'),
    unsplashPhoto('photo-1702118937156-d8f4d86076ac'),
  ],
  haLong: [
    unsplashPhoto('photo-1737484126640-7381808c768b'),
    unsplashPhoto('photo-1680896444865-e76d81267f94'),
    unsplashPhoto('photo-1737484126640-7381808c768b'),
  ],
  ninhBinh: [
    unsplashPhoto('photo-1626743656249-5d8fa287b941'),
    unsplashPhoto('photo-1557750255-c76072a7aad1'),
    unsplashPhoto('photo-1740232187966-a42e7e4d1e76'),
  ],
  sapa: [
    unsplashPhoto('photo-1758002766412-82897c5e5429'),
    unsplashPhoto('photo-1758004071806-4e6c85984f51'),
    unsplashPhoto('photo-1758002766412-82897c5e5429'),
  ],
  haGiang: [
    unsplashPhoto('photo-1728613902676-1d8b4e10eee5'),
    unsplashPhoto('photo-1536511671359-849531c0a576'),
    unsplashPhoto('photo-1462688681110-15bc88b1497c'),
  ],
  quangBinh: [
    unsplashPhoto('photo-1719461208377-94ec5820e414'),
    unsplashPhoto('photo-1719461208377-94ec5820e414'),
    unsplashPhoto('photo-1719461208377-94ec5820e414'),
  ],
  hue: [
    unsplashPhoto('photo-1720456485611-a266e43e2bca'),
    unsplashPhoto('photo-1705823637026-92c0ef6d6222'),
    unsplashPhoto('photo-1608753529548-3898cb559f48'),
  ],
  daNang: [
    unsplashPhoto('photo-1708776480405-7ae14fe1d4c4'),
    unsplashPhoto('photo-1742033993624-ef07c72b059c'),
    unsplashPhoto('photo-1708776480405-7ae14fe1d4c4'),
  ],
  hoiAn: [
    unsplashPhoto('photo-1716396435819-2a3706cc5f85'),
    unsplashPhoto('photo-1761150285834-7ab9ce6dbfd4'),
    unsplashPhoto('photo-1716396435819-2a3706cc5f85'),
  ],
  nhaTrang: [
    unsplashPhoto('photo-1533002832-1721d16b4bb9'),
    unsplashPhoto('photo-1669783517838-36886de8bbb3'),
    unsplashPhoto('photo-1533002832-1721d16b4bb9'),
  ],
  daLat: [
    unsplashPhoto('photo-1678099006439-dba9e4d3f9f5'),
    unsplashPhoto('photo-1741524427564-0173c980c432'),
    unsplashPhoto('photo-1678099006439-dba9e4d3f9f5'),
  ],
  phuQuoc: [
    unsplashPhoto('photo-1693282814784-649be45a459b'),
    unsplashPhoto('photo-1698809807960-758cf416e96e'),
    unsplashPhoto('photo-1693282814784-649be45a459b'),
  ],
  muiNe: [
    unsplashPhoto('photo-1758805139095-ca82860c7811'),
    unsplashPhoto('photo-1758805139095-ca82860c7811'),
    unsplashPhoto('photo-1758805139095-ca82860c7811'),
  ],
  quyNhon: [
    unsplashPhoto('photo-1722944175475-6bbc2d6812c6'),
    unsplashPhoto('photo-1681183537042-b526fe1ab567'),
    unsplashPhoto('photo-1722944175475-6bbc2d6812c6'),
  ],
  phuYen: [
    unsplashPhoto('photo-1662622600433-f31acfd11e04'),
    unsplashPhoto('photo-1716479852357-a71a74d81537'),
    unsplashPhoto('photo-1662622600433-f31acfd11e04'),
  ],
  canTho: [
    unsplashPhoto('photo-1705589244475-7ebbc0d3a842'),
    unsplashPhoto('photo-1705589244475-7ebbc0d3a842'),
    unsplashPhoto('photo-1705589244475-7ebbc0d3a842'),
  ],
  hoChiMinh: [
    unsplashPhoto('photo-1583417319070-4a69db38a482'),
    unsplashPhoto('photo-1536086845112-89de23aa4772'),
    unsplashPhoto('photo-1602646994030-464f98de5e5c'),
  ],
  mocChau: [
    unsplashPhoto('photo-1764034372439-cf34b61ea0b9'),
    unsplashPhoto('photo-1676557058888-7a785ef135af'),
    unsplashPhoto('photo-1764034372439-cf34b61ea0b9'),
  ],
  maiChau: [
    unsplashPhoto('photo-1752127388714-ea60220f243d'),
    unsplashPhoto('photo-1752127388714-ea60220f243d'),
    unsplashPhoto('photo-1752127388714-ea60220f243d'),
  ],
  caoBang: [
    unsplashPhoto('photo-1713551584377-54729ca32b33'),
    unsplashPhoto('photo-1697015556006-9e767c7187dc'),
    unsplashPhoto('photo-1778381463733-0af6e3cba175'),
  ],
} as const;

function buildDescription(intro: string, focus: string, suitableFor: string) {
  return [
    intro,
    '',
    `Hành trình được thiết kế theo nhịp vừa phải, tập trung vào ${focus}. Du khách có đủ thời gian cho các điểm tham quan chính, bữa ăn địa phương và khoảng nghỉ để chuyến đi không bị quá tải.`,
    '',
    `Tour phù hợp với ${suitableFor}. Lịch trình có hướng dẫn viên, phương tiện theo chương trình, hỗ trợ trước khởi hành và các lựa chọn gói dịch vụ để khách dễ chọn theo ngân sách.`,
  ].join('\n');
}

function packageData(basePrice: number) {
  return [
    {
      name: 'Gói Tiêu Chuẩn',
      description: 'Lựa chọn cân bằng cho khách muốn tối ưu chi phí nhưng vẫn đủ dịch vụ chính.',
      price: basePrice,
      badge: 'BEST VALUE',
      includes: [
        'Xe du lịch theo chương trình',
        'Hướng dẫn viên tiếng Việt',
        'Vé tham quan theo lịch trình',
        'Bữa ăn tiêu chuẩn theo chương trình',
        'Bảo hiểm du lịch nội địa',
      ],
      excludes: [
        'Chi phí cá nhân',
        'Đồ uống ngoài thực đơn',
        'Phụ thu phòng đơn nếu có',
      ],
      sortOrder: 0,
    },
    {
      name: 'Gói Cao Cấp',
      description: 'Nâng cấp khách sạn, bữa ăn và trải nghiệm để hành trình thoải mái hơn.',
      price: Math.round(basePrice * 1.28),
      badge: 'POPULAR',
      includes: [
        'Xe du lịch đời mới theo chương trình',
        'Hướng dẫn viên kinh nghiệm',
        'Vé tham quan theo lịch trình',
        'Khách sạn/retreat tiêu chuẩn cao hơn',
        'Bữa ăn nâng cấp với đặc sản địa phương',
        'Bảo hiểm du lịch nội địa',
      ],
      excludes: [
        'Chi phí cá nhân',
        'Dịch vụ ngoài chương trình',
        'Phụ thu phòng đơn nếu có',
      ],
      sortOrder: 1,
    },
    {
      name: 'Gói Riêng Tư',
      description: 'Dành cho gia đình hoặc nhóm nhỏ muốn lịch trình linh hoạt và riêng tư hơn.',
      price: Math.round(basePrice * 1.65),
      badge: 'LUXURY',
      includes: [
        'Xe riêng theo lịch trình',
        'Hướng dẫn viên riêng',
        'Vé tham quan theo lịch trình',
        'Khách sạn/retreat chọn lọc',
        'Bữa ăn riêng theo tư vấn',
        'Hỗ trợ điều chỉnh lịch trình trước khởi hành',
      ],
      excludes: [
        'Chi phí cá nhân',
        'Dịch vụ phát sinh ngoài hợp đồng',
        'Vé máy bay nếu không ghi rõ trong chương trình',
      ],
      sortOrder: 2,
    },
  ];
}

function buildTimeline(day: DayPlan): Prisma.InputJsonValue {
  return [
    { time: '07:30', activity: 'Đón khách và khởi hành' },
    { time: '09:30', activity: day.activities[0] ?? 'Tham quan điểm chính' },
    { time: '12:00', activity: 'Ăn trưa theo chương trình' },
    { time: '14:00', activity: day.activities[1] ?? 'Tiếp tục tham quan' },
    { time: '18:00', activity: 'Ăn tối và nghỉ ngơi' },
  ];
}

const tours: DomesticTourSeed[] = [
  {
    destination: {
      name: 'Hà Nội',
      slug: 'ha-noi',
      region: 'Miền Bắc',
      description: 'Thủ đô nghìn năm văn hiến, nổi bật với phố cổ, di tích lịch sử, ẩm thực đường phố và nhịp sống đô thị giàu bản sắc.',
      imageUrl: IMAGES.hanoi[0],
    },
    tour: {
      tourCode: 'VN-HAN-001',
      name: 'Hà Nội Di Sản & Ẩm Thực 1 Ngày',
      description: buildDescription(
        'Khám phá Hà Nội qua những lát cắt đặc trưng nhất: Hồ Gươm, phố cổ, Văn Miếu, Hoàng thành Thăng Long và các hương vị đường phố.',
        'văn hóa, lịch sử và ẩm thực Hà Nội',
        'khách lần đầu đến Hà Nội, nhóm bạn, gia đình và khách công tác có ít thời gian',
      ),
      price: 850_000,
      duration: '1 ngày',
      availableSeats: 80,
      imageUrl: IMAGES.hanoi[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'Nhà hát Lớn Hà Nội',
      highlights: [
        'Tham quan Hồ Gươm, phố cổ và các tuyến phố nghề đặc trưng',
        'Tìm hiểu Văn Miếu - Quốc Tử Giám và Hoàng thành Thăng Long',
        'Trải nghiệm ẩm thực Hà Nội với phở, bún chả hoặc cà phê trứng',
        'Lịch trình gọn trong ngày, phù hợp khách ít thời gian',
      ],
      gallery: [...IMAGES.hanoi],
      itinerary: [
        {
          title: 'Một ngày chạm vào nhịp sống Hà Nội',
          description: 'Đón khách tại trung tâm, tham quan các biểu tượng lịch sử, dạo phố cổ và thưởng thức đặc sản địa phương trước khi kết thúc vào cuối chiều.',
          transport: 'Xe du lịch và đi bộ trong phố cổ',
          activities: ['Hồ Gươm - phố cổ', 'Văn Miếu - Hoàng thành Thăng Long', 'Ẩm thực Hà Nội'],
          imageUrl: IMAGES.hanoi[1],
        },
      ],
      faqs: [
        { question: 'Tour có phù hợp với trẻ em không?', answer: 'Có. Lịch trình nhẹ, chủ yếu tham quan trong nội đô và có nhiều điểm nghỉ.' },
        { question: 'Có cần chuẩn bị trang phục gì đặc biệt?', answer: 'Nên mặc lịch sự khi vào khu di tích, mang giày thoải mái để đi bộ trong phố cổ.' },
      ],
    },
  },
  {
    destination: {
      name: 'Hạ Long',
      slug: 'ha-long',
      region: 'Miền Bắc',
      description: 'Điểm đến biển đảo nổi tiếng với cảnh quan núi đá vôi, vịnh xanh, hang động và trải nghiệm du thuyền.',
      imageUrl: IMAGES.haLong[0],
    },
    tour: {
      tourCode: 'VN-HLG-002',
      name: 'Du Thuyền Hạ Long 2 Ngày 1 Đêm',
      description: buildDescription(
        'Hành trình du thuyền trên vịnh Hạ Long với hang động, kayak, ngắm hoàng hôn và nghỉ đêm trên tàu.',
        'cảnh quan vịnh, nghỉ dưỡng trên du thuyền và hoạt động nhẹ trên mặt nước',
        'cặp đôi, gia đình, nhóm bạn và khách muốn trải nghiệm biểu tượng du lịch Việt Nam',
      ),
      price: 2_950_000,
      duration: '2 ngày 1 đêm',
      availableSeats: 100,
      imageUrl: IMAGES.haLong[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Hà Nội',
      highlights: [
        'Nghỉ đêm trên du thuyền giữa vịnh',
        'Chèo kayak hoặc thuyền nan tại khu vực hang nước',
        'Ngắm hoàng hôn và bình minh trên boong tàu',
        'Bữa ăn hải sản theo chương trình',
      ],
      gallery: [...IMAGES.haLong],
      itinerary: [
        {
          title: 'Hà Nội - Hạ Long - Lên du thuyền',
          description: 'Khởi hành từ Hà Nội, làm thủ tục lên du thuyền, dùng bữa trưa, tham quan hang động hoặc khu vực chèo kayak và nghỉ đêm trên vịnh.',
          accommodation: 'Du thuyền tiêu chuẩn theo gói',
          transport: 'Xe du lịch và du thuyền',
          activities: ['Di chuyển Hà Nội - Hạ Long', 'Chèo kayak hoặc tham quan hang động', 'Ngắm hoàng hôn trên vịnh'],
          imageUrl: IMAGES.haLong[0],
        },
        {
          title: 'Bình minh trên vịnh - Trở về Hà Nội',
          description: 'Tập thái cực quyền hoặc thư giãn buổi sáng, dùng brunch trên tàu, trả phòng và trở về Hà Nội.',
          transport: 'Du thuyền và xe du lịch',
          activities: ['Ngắm bình minh', 'Brunch trên du thuyền', 'Trở về Hà Nội'],
          imageUrl: IMAGES.haLong[1],
        },
      ],
      faqs: [
        { question: 'Tour có bao gồm phòng nghỉ trên du thuyền không?', answer: 'Có. Hạng phòng phụ thuộc gói khách chọn khi đặt.' },
        { question: 'Nếu thời tiết xấu thì sao?', answer: 'Lịch tàu phụ thuộc điều phối cảng vụ. Nếu có thay đổi, đội hỗ trợ sẽ thông báo phương án thay thế.' },
      ],
    },
  },
  {
    destination: {
      name: 'Ninh Bình',
      slug: 'ninh-binh',
      region: 'Miền Bắc',
      description: 'Vùng đất di sản với Tràng An, Tam Cốc, Hoa Lư và Hang Múa, nổi bật bởi cảnh quan núi đá vôi và sông nước.',
      imageUrl: IMAGES.ninhBinh[0],
    },
    tour: {
      tourCode: 'VN-NBI-003',
      name: 'Ninh Bình Tràng An - Hoa Lư - Hang Múa 1 Ngày',
      description: buildDescription(
        'Tour Ninh Bình trong ngày từ Hà Nội, kết hợp cố đô Hoa Lư, đi thuyền Tràng An và ngắm toàn cảnh từ Hang Múa.',
        'di sản, cảnh quan núi đá vôi và trải nghiệm thuyền sông',
        'khách muốn đi trong ngày, nhóm bạn thích chụp ảnh và gia đình muốn lịch trình vừa sức',
      ),
      price: 1_150_000,
      duration: '1 ngày',
      availableSeats: 90,
      imageUrl: IMAGES.ninhBinh[0],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Tham quan cố đô Hoa Lư',
        'Đi thuyền trong quần thể Tràng An',
        'Leo Hang Múa ngắm toàn cảnh Tam Cốc',
        'Ăn trưa đặc sản dê núi Ninh Bình',
      ],
      gallery: [...IMAGES.ninhBinh],
      itinerary: [
        {
          title: 'Hà Nội - Hoa Lư - Tràng An - Hang Múa',
          description: 'Khởi hành từ Hà Nội, tham quan Hoa Lư, dùng bữa trưa, đi thuyền Tràng An và leo Hang Múa trước khi trở về.',
          transport: 'Xe du lịch và thuyền chèo tay',
          activities: ['Cố đô Hoa Lư', 'Thuyền Tràng An', 'Hang Múa'],
          imageUrl: IMAGES.ninhBinh[0],
        },
      ],
      faqs: [
        { question: 'Hang Múa có khó leo không?', answer: 'Có khoảng vài trăm bậc đá, khách nên mang giày thoải mái và cân nhắc nếu có vấn đề sức khỏe.' },
        { question: 'Tour có đón tại khách sạn không?', answer: 'Có hỗ trợ đón trong khu vực trung tâm theo khung giờ xác nhận trước ngày đi.' },
      ],
    },
  },
  {
    destination: {
      name: 'Sapa',
      slug: 'sapa',
      region: 'Miền Bắc',
      description: 'Thị trấn vùng cao nổi tiếng với Fansipan, ruộng bậc thang, bản làng và khí hậu mát mẻ quanh năm.',
      imageUrl: IMAGES.sapa[0],
    },
    tour: {
      tourCode: 'VN-SPA-004',
      name: 'Sapa Fansipan & Bản Làng 3 Ngày 2 Đêm',
      description: buildDescription(
        'Hành trình Sapa kết hợp chinh phục Fansipan bằng cáp treo, tham quan bản Cát Cát và trải nghiệm nhịp sống vùng cao.',
        'thiên nhiên núi rừng, văn hóa bản địa và khí hậu nghỉ dưỡng',
        'gia đình, cặp đôi và khách muốn kết hợp tham quan với nghỉ dưỡng vùng cao',
      ),
      price: 3_450_000,
      duration: '3 ngày 2 đêm',
      availableSeats: 80,
      imageUrl: IMAGES.sapa[0],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Chinh phục Fansipan bằng cáp treo',
        'Dạo bản Cát Cát và tìm hiểu văn hóa địa phương',
        'Thưởng thức đặc sản vùng cao',
        'Lịch trình có thời gian tự do tại trung tâm Sapa',
      ],
      gallery: [...IMAGES.sapa],
      itinerary: [
        {
          title: 'Hà Nội - Sapa - Bản Cát Cát',
          description: 'Di chuyển lên Sapa, nhận phòng, dùng bữa trưa và tham quan bản Cát Cát vào buổi chiều.',
          accommodation: 'Khách sạn Sapa theo gói',
          transport: 'Xe limousine hoặc xe du lịch',
          activities: ['Di chuyển Hà Nội - Sapa', 'Bản Cát Cát', 'Tự do khám phá trung tâm'],
          imageUrl: IMAGES.sapa[0],
        },
        {
          title: 'Fansipan - Nóc nhà Đông Dương',
          description: 'Khởi hành đi khu cáp treo Fansipan, tham quan quần thể tâm linh và ngắm cảnh núi Hoàng Liên Sơn.',
          accommodation: 'Khách sạn Sapa theo gói',
          transport: 'Xe du lịch và cáp treo tự túc/nâng cấp theo gói',
          activities: ['Fansipan', 'Ẩm thực vùng cao', 'Chợ đêm Sapa'],
          imageUrl: IMAGES.sapa[1],
        },
        {
          title: 'Sapa - Hà Nội',
          description: 'Ăn sáng, tự do mua đặc sản hoặc cà phê ngắm núi trước khi trở về Hà Nội.',
          transport: 'Xe limousine hoặc xe du lịch',
          activities: ['Tự do mua sắm', 'Trở về Hà Nội'],
          imageUrl: IMAGES.sapa[2],
        },
      ],
      faqs: [
        { question: 'Giá tour đã bao gồm vé cáp treo Fansipan chưa?', answer: 'Tùy gói dịch vụ. Gói cao cấp và riêng tư có thể bao gồm hoặc hỗ trợ đặt trước.' },
        { question: 'Sapa mùa nào đẹp?', answer: 'Mỗi mùa có nét riêng. Mùa lúa và mùa săn mây thường được khách lựa chọn nhiều.' },
      ],
    },
  },
  {
    destination: {
      name: 'Hà Giang',
      slug: 'ha-giang',
      region: 'Miền Bắc',
      description: 'Cung đường cao nguyên đá nổi tiếng với đèo Mã Pì Lèng, sông Nho Quế, Đồng Văn và văn hóa vùng biên.',
      imageUrl: IMAGES.haGiang[0],
    },
    tour: {
      tourCode: 'VN-HGI-005',
      name: 'Hà Giang Loop 4 Ngày 3 Đêm',
      description: buildDescription(
        'Cung đường Hà Giang dành cho du khách yêu thiên nhiên hùng vĩ, văn hóa vùng cao và những khúc cua biểu tượng của miền Bắc.',
        'cảnh quan núi đá, cung đường đèo và trải nghiệm bản địa',
        'khách trẻ, nhóm bạn, người thích khám phá và du khách muốn trải nghiệm tuyến đường nổi bật nhất miền núi phía Bắc',
      ),
      price: 4_250_000,
      duration: '4 ngày 3 đêm',
      availableSeats: 70,
      imageUrl: IMAGES.haGiang[0],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Check-in đèo Mã Pì Lèng và sông Nho Quế',
        'Khám phá Đồng Văn, Quản Bạ, Yên Minh',
        'Trải nghiệm văn hóa cao nguyên đá',
        'Lịch trình xe ô tô an toàn, hạn chế tự lái đường đèo',
      ],
      gallery: [...IMAGES.haGiang],
      itinerary: [
        {
          title: 'Hà Nội - Hà Giang',
          description: 'Khởi hành đi Hà Giang, dừng nghỉ trên đường, nhận phòng và chuẩn bị cho cung loop.',
          accommodation: 'Khách sạn/homestay Hà Giang',
          transport: 'Xe du lịch',
          activities: ['Di chuyển Hà Nội - Hà Giang', 'Nghỉ đêm tại Hà Giang'],
          imageUrl: IMAGES.haGiang[0],
        },
        {
          title: 'Quản Bạ - Yên Minh - Đồng Văn',
          description: 'Đi qua cổng trời Quản Bạ, núi đôi, rừng thông Yên Minh và nghỉ đêm tại Đồng Văn.',
          accommodation: 'Khách sạn/homestay Đồng Văn',
          transport: 'Xe du lịch',
          activities: ['Cổng trời Quản Bạ', 'Yên Minh', 'Phố cổ Đồng Văn'],
          imageUrl: IMAGES.haGiang[1],
        },
        {
          title: 'Mã Pì Lèng - Sông Nho Quế',
          description: 'Khám phá đoạn đẹp nhất của cung đường với Mã Pì Lèng và trải nghiệm thuyền trên sông Nho Quế.',
          accommodation: 'Khách sạn/homestay Hà Giang',
          transport: 'Xe du lịch và thuyền',
          activities: ['Đèo Mã Pì Lèng', 'Sông Nho Quế', 'Hẻm Tu Sản'],
          imageUrl: IMAGES.haGiang[2],
        },
        {
          title: 'Hà Giang - Hà Nội',
          description: 'Ăn sáng, trả phòng và trở về Hà Nội, kết thúc hành trình.',
          transport: 'Xe du lịch',
          activities: ['Trở về Hà Nội'],
          imageUrl: IMAGES.haGiang[0],
        },
      ],
      faqs: [
        { question: 'Tour có tự lái xe máy không?', answer: 'Seed tour này mặc định di chuyển bằng xe ô tô để an toàn hơn. Có thể tùy biến gói riêng nếu muốn trải nghiệm xe máy.' },
        { question: 'Hà Giang có phù hợp trẻ nhỏ không?', answer: 'Cung đường dài và nhiều đèo, phù hợp hơn với người có sức khỏe ổn định.' },
      ],
    },
  },
  {
    destination: {
      name: 'Quảng Bình',
      slug: 'quang-binh',
      region: 'Miền Trung',
      description: 'Thiên đường hang động với Phong Nha - Kẻ Bàng, động Thiên Đường, sông Chày và các trải nghiệm thiên nhiên.',
      imageUrl: IMAGES.quangBinh[0],
    },
    tour: {
      tourCode: 'VN-QBI-006',
      name: 'Quảng Bình Phong Nha - Thiên Đường 3 Ngày 2 Đêm',
      description: buildDescription(
        'Tour Quảng Bình tập trung vào hệ thống hang động, sông xanh và cảnh quan Phong Nha - Kẻ Bàng.',
        'thiên nhiên, hang động và hoạt động khám phá nhẹ',
        'gia đình, nhóm bạn và du khách yêu cảnh quan tự nhiên',
      ),
      price: 3_250_000,
      duration: '3 ngày 2 đêm',
      availableSeats: 75,
      imageUrl: IMAGES.quangBinh[0],
      tourType: 'Khám Phá',
      departurePoint: 'Đồng Hới',
      highlights: [
        'Tham quan động Phong Nha hoặc động Thiên Đường',
        'Khám phá cảnh quan Phong Nha - Kẻ Bàng',
        'Trải nghiệm sông Chày - hang Tối theo mùa',
        'Ẩm thực địa phương Quảng Bình',
      ],
      gallery: [...IMAGES.quangBinh],
      itinerary: [
        {
          title: 'Đồng Hới - Phong Nha',
          description: 'Đón khách tại Đồng Hới, di chuyển đến Phong Nha, tham quan và nghỉ đêm.',
          accommodation: 'Khách sạn Đồng Hới/Phong Nha',
          transport: 'Xe du lịch',
          activities: ['Đón khách Đồng Hới', 'Phong Nha', 'Ẩm thực địa phương'],
          imageUrl: IMAGES.quangBinh[0],
        },
        {
          title: 'Động Thiên Đường - Sông Chày',
          description: 'Tham quan động Thiên Đường và trải nghiệm hoạt động ngoài trời tại khu vực sông Chày theo điều kiện thời tiết.',
          accommodation: 'Khách sạn Đồng Hới/Phong Nha',
          transport: 'Xe du lịch',
          activities: ['Động Thiên Đường', 'Sông Chày', 'Hang Tối theo mùa'],
          imageUrl: IMAGES.quangBinh[1],
        },
        {
          title: 'Đồng Hới - Kết thúc',
          description: 'Tự do nghỉ ngơi, mua đặc sản và tiễn khách tại sân bay/ga Đồng Hới.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.quangBinh[2],
        },
      ],
      faqs: [
        { question: 'Tour có trekking nặng không?', answer: 'Không. Đây là tour khám phá nhẹ, phù hợp phần lớn du khách.' },
        { question: 'Có cần mang đồ bơi không?', answer: 'Nên mang đồ bơi hoặc quần áo nhanh khô nếu chọn hoạt động sông Chày - hang Tối.' },
      ],
    },
  },
  {
    destination: {
      name: 'Huế',
      slug: 'hue',
      region: 'Miền Trung',
      description: 'Cố đô nổi tiếng với Đại Nội, lăng tẩm, chùa Thiên Mụ, sông Hương và ẩm thực cung đình.',
      imageUrl: IMAGES.hue[0],
    },
    tour: {
      tourCode: 'VN-HUE-007',
      name: 'Huế Cố Đô & Sông Hương 2 Ngày 1 Đêm',
      description: buildDescription(
        'Hành trình Huế dành cho khách yêu lịch sử, kiến trúc cung đình và nhịp sống chậm bên sông Hương.',
        'di sản cố đô, kiến trúc lăng tẩm và ẩm thực Huế',
        'gia đình, khách yêu văn hóa, nhóm học sinh sinh viên và du khách muốn tìm hiểu lịch sử',
      ),
      price: 2_150_000,
      duration: '2 ngày 1 đêm',
      availableSeats: 85,
      imageUrl: IMAGES.hue[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'Huế',
      highlights: [
        'Tham quan Đại Nội Huế',
        'Chùa Thiên Mụ và du thuyền sông Hương',
        'Lăng Khải Định hoặc Minh Mạng',
        'Thưởng thức ẩm thực Huế',
      ],
      gallery: [...IMAGES.hue],
      itinerary: [
        {
          title: 'Đại Nội - Chùa Thiên Mụ - Sông Hương',
          description: 'Đón khách, tham quan Đại Nội, chùa Thiên Mụ và trải nghiệm sông Hương vào chiều tối.',
          accommodation: 'Khách sạn Huế theo gói',
          transport: 'Xe du lịch và thuyền rồng',
          activities: ['Đại Nội', 'Chùa Thiên Mụ', 'Sông Hương'],
          imageUrl: IMAGES.hue[0],
        },
        {
          title: 'Lăng vua - Ẩm thực Huế',
          description: 'Tham quan lăng vua, thưởng thức đặc sản Huế và kết thúc tour.',
          transport: 'Xe du lịch',
          activities: ['Lăng Khải Định hoặc Minh Mạng', 'Ẩm thực Huế', 'Tiễn khách'],
          imageUrl: IMAGES.hue[1],
        },
      ],
      faqs: [
        { question: 'Tour có phù hợp người lớn tuổi không?', answer: 'Có. Lịch trình không quá gấp, nhưng khách nên mang giày thoải mái khi tham quan di tích.' },
        { question: 'Có bao gồm thuyền sông Hương không?', answer: 'Có trong chương trình tiêu chuẩn, tùy điều kiện vận hành và thời tiết.' },
      ],
    },
  },
  {
    destination: {
      name: 'Đà Nẵng',
      slug: 'da-nang',
      region: 'Miền Trung',
      description: 'Thành phố biển năng động với Mỹ Khê, Sơn Trà, Bà Nà Hills và vị trí thuận tiện kết nối Huế - Hội An.',
      imageUrl: IMAGES.daNang[0],
    },
    tour: {
      tourCode: 'VN-DAD-008',
      name: 'Đà Nẵng Biển Mỹ Khê - Sơn Trà - Bà Nà 3 Ngày 2 Đêm',
      description: buildDescription(
        'Tour Đà Nẵng kết hợp nghỉ dưỡng biển, bán đảo Sơn Trà và một ngày vui chơi tại Bà Nà Hills.',
        'biển, city break và trải nghiệm giải trí',
        'gia đình, cặp đôi, nhóm bạn và khách muốn một chuyến nghỉ ngắn ngày dễ đi',
      ),
      price: 3_650_000,
      duration: '3 ngày 2 đêm',
      availableSeats: 100,
      imageUrl: IMAGES.daNang[0],
      tourType: 'Tour Gia Đình',
      departurePoint: 'Đà Nẵng',
      highlights: [
        'Tắm biển Mỹ Khê',
        'Tham quan bán đảo Sơn Trà',
        'Một ngày tại Bà Nà Hills',
        'Tự do khám phá cầu Rồng và ẩm thực Đà Nẵng',
      ],
      gallery: [...IMAGES.daNang],
      itinerary: [
        {
          title: 'Đà Nẵng - Sơn Trà - Biển Mỹ Khê',
          description: 'Đón khách, tham quan Sơn Trà, nhận phòng và tự do tắm biển Mỹ Khê.',
          accommodation: 'Khách sạn Đà Nẵng theo gói',
          transport: 'Xe du lịch',
          activities: ['Bán đảo Sơn Trà', 'Biển Mỹ Khê', 'Cầu Rồng buổi tối'],
          imageUrl: IMAGES.daNang[0],
        },
        {
          title: 'Bà Nà Hills',
          description: 'Di chuyển lên Bà Nà Hills, tham quan Cầu Vàng, làng Pháp và các khu vui chơi theo chương trình.',
          accommodation: 'Khách sạn Đà Nẵng theo gói',
          transport: 'Xe du lịch và cáp treo',
          activities: ['Bà Nà Hills', 'Cầu Vàng', 'Làng Pháp'],
          imageUrl: IMAGES.daNang[1],
        },
        {
          title: 'Tự do mua sắm - Tiễn khách',
          description: 'Ăn sáng, tự do mua đặc sản và tiễn khách tại sân bay/ga Đà Nẵng.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.daNang[2],
        },
      ],
      faqs: [
        { question: 'Vé Bà Nà Hills đã bao gồm chưa?', answer: 'Tùy gói. Seed này cho phép phân biệt rõ gói tiêu chuẩn và gói nâng cấp.' },
        { question: 'Tour có phù hợp gia đình có trẻ nhỏ không?', answer: 'Có. Lịch trình phổ biến, dịch vụ dễ tiếp cận và thời gian di chuyển không quá dài.' },
      ],
    },
  },
  {
    destination: {
      name: 'Hội An',
      slug: 'hoi-an',
      region: 'Miền Trung',
      description: 'Phố cổ di sản nổi tiếng với đèn lồng, kiến trúc giao thương, làng nghề, rừng dừa và ẩm thực địa phương.',
      imageUrl: IMAGES.hoiAn[0],
    },
    tour: {
      tourCode: 'VN-HANQ-009',
      name: 'Hội An Phố Cổ - Rừng Dừa - Làng Nghề 2 Ngày 1 Đêm',
      description: buildDescription(
        'Tour Hội An tập trung vào trải nghiệm phố cổ, làng nghề, rừng dừa Bảy Mẫu và không khí đèn lồng buổi tối.',
        'văn hóa phố cổ, trải nghiệm thủ công và ẩm thực miền Trung',
        'cặp đôi, gia đình, khách yêu văn hóa và du khách muốn lịch trình nhẹ nhàng',
      ),
      price: 2_350_000,
      duration: '2 ngày 1 đêm',
      availableSeats: 80,
      imageUrl: IMAGES.hoiAn[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'Đà Nẵng',
      highlights: [
        'Dạo phố cổ Hội An buổi tối',
        'Trải nghiệm rừng dừa Bảy Mẫu',
        'Tham quan làng nghề và không gian đèn lồng',
        'Thưởng thức cao lầu, mì Quảng hoặc đặc sản địa phương',
      ],
      gallery: [...IMAGES.hoiAn],
      itinerary: [
        {
          title: 'Rừng dừa - Phố cổ Hội An',
          description: 'Đón khách, trải nghiệm rừng dừa, nhận phòng và dạo phố cổ Hội An buổi tối.',
          accommodation: 'Khách sạn Hội An theo gói',
          transport: 'Xe du lịch và thuyền thúng',
          activities: ['Rừng dừa Bảy Mẫu', 'Phố cổ Hội An', 'Đèn lồng buổi tối'],
          imageUrl: IMAGES.hoiAn[0],
        },
        {
          title: 'Làng nghề - Tiễn khách',
          description: 'Tham quan làng nghề, mua quà địa phương và kết thúc chương trình.',
          transport: 'Xe du lịch',
          activities: ['Làng nghề Hội An', 'Ẩm thực địa phương', 'Tiễn khách'],
          imageUrl: IMAGES.hoiAn[1],
        },
      ],
      faqs: [
        { question: 'Tour có nhiều thời gian tự do không?', answer: 'Có. Buổi tối tại phố cổ được thiết kế thoáng để khách tự do ăn uống, chụp ảnh và mua sắm.' },
        { question: 'Có thể khởi hành từ Đà Nẵng không?', answer: 'Có. Điểm đón có thể là Đà Nẵng hoặc Hội An tùy lựa chọn.' },
      ],
    },
  },
  {
    destination: {
      name: 'Nha Trang',
      slug: 'nha-trang',
      region: 'Miền Trung',
      description: 'Thành phố biển nổi tiếng với đảo, san hô, resort, hải sản và các hoạt động thể thao nước.',
      imageUrl: IMAGES.nhaTrang[0],
    },
    tour: {
      tourCode: 'VN-NTR-010',
      name: 'Nha Trang Biển Đảo & Lặn San Hô 3 Ngày 2 Đêm',
      description: buildDescription(
        'Hành trình Nha Trang dành cho khách yêu biển đảo, kết hợp nghỉ dưỡng, tham quan vịnh và trải nghiệm lặn ngắm san hô.',
        'biển đảo, hải sản và hoạt động dưới nước',
        'gia đình, nhóm bạn và cặp đôi muốn nghỉ dưỡng biển dễ tiếp cận',
      ),
      price: 3_350_000,
      duration: '3 ngày 2 đêm',
      availableSeats: 95,
      imageUrl: IMAGES.nhaTrang[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Nha Trang',
      highlights: [
        'Tour đảo Nha Trang trong ngày',
        'Lặn ngắm san hô hoặc đi tàu đáy kính theo điều kiện',
        'Thưởng thức hải sản địa phương',
        'Thời gian tự do nghỉ dưỡng bên biển',
      ],
      gallery: [...IMAGES.nhaTrang],
      itinerary: [
        {
          title: 'Đón khách - Nghỉ dưỡng biển',
          description: 'Đón khách tại Nha Trang, nhận phòng, tự do tắm biển và thưởng thức hải sản.',
          accommodation: 'Khách sạn/resort Nha Trang theo gói',
          transport: 'Xe du lịch',
          activities: ['Đón khách Nha Trang', 'Tắm biển', 'Ẩm thực hải sản'],
          imageUrl: IMAGES.nhaTrang[0],
        },
        {
          title: 'Tour đảo - San hô',
          description: 'Tham gia tour đảo, trải nghiệm lặn ngắm san hô hoặc hoạt động biển phù hợp thời tiết.',
          accommodation: 'Khách sạn/resort Nha Trang theo gói',
          transport: 'Xe du lịch và tàu',
          activities: ['Tour đảo', 'Lặn ngắm san hô', 'Ăn trưa hải sản'],
          imageUrl: IMAGES.nhaTrang[1],
        },
        {
          title: 'Tự do mua sắm - Tiễn khách',
          description: 'Tự do nghỉ ngơi, mua đặc sản và tiễn khách.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.nhaTrang[2],
        },
      ],
      faqs: [
        { question: 'Hoạt động lặn có bắt buộc không?', answer: 'Không. Khách có thể chọn ngồi tàu, tắm biển hoặc tham gia hoạt động nhẹ hơn.' },
        { question: 'Tour có phù hợp mùa mưa không?', answer: 'Có thể đi, nhưng lịch đảo phụ thuộc thời tiết biển. Đội điều hành sẽ tư vấn trước ngày khởi hành.' },
      ],
    },
  },
];

const remainingDomesticTours: DomesticTourSeed[] = [
  {
    destination: {
      name: 'Đà Lạt',
      slug: 'da-lat',
      region: 'Miền Trung',
      description: 'Thành phố cao nguyên nổi tiếng với khí hậu mát mẻ, hồ Tuyền Lâm, rừng thông, vườn hoa, nông trại và không gian nghỉ dưỡng lãng mạn.',
      imageUrl: IMAGES.daLat[0],
    },
    tour: {
      tourCode: 'VN-DLI-011',
      name: 'Đà Lạt Rừng Thông - Hồ Tuyền Lâm - Nông Trại 3 Ngày 2 Đêm',
      description: buildDescription(
        'Hành trình Đà Lạt kết hợp nghỉ dưỡng cao nguyên, hồ Tuyền Lâm, vườn hoa, nông trại và những điểm ngắm cảnh đặc trưng của thành phố sương mù.',
        'khí hậu cao nguyên, cảnh quan rừng thông, nông trại và trải nghiệm nghỉ dưỡng nhẹ nhàng',
        'cặp đôi, gia đình, nhóm bạn và khách muốn một chuyến đi thư giãn có nhiều điểm chụp ảnh',
      ),
      price: 3_250_000,
      duration: '3 ngày 2 đêm',
      availableSeats: 90,
      imageUrl: IMAGES.daLat[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Đà Lạt',
      highlights: [
        'Dạo hồ Tuyền Lâm và rừng thông',
        'Tham quan vườn hoa, nông trại và khu cà phê ngắm cảnh',
        'Trải nghiệm ẩm thực cao nguyên',
        'Lịch trình chậm, phù hợp nghỉ dưỡng và chụp ảnh',
      ],
      gallery: [...IMAGES.daLat],
      itinerary: [
        {
          title: 'Đón khách - Hồ Tuyền Lâm - Trung tâm Đà Lạt',
          description: 'Đón khách tại Đà Lạt, tham quan hồ Tuyền Lâm, rừng thông và nhận phòng nghỉ ngơi trước khi tự do khám phá trung tâm buổi tối.',
          accommodation: 'Khách sạn Đà Lạt theo gói',
          transport: 'Xe du lịch',
          activities: ['Hồ Tuyền Lâm', 'Rừng thông', 'Chợ đêm Đà Lạt'],
          imageUrl: IMAGES.daLat[0],
        },
        {
          title: 'Vườn hoa - Nông trại - Cà phê ngắm cảnh',
          description: 'Tham quan các điểm nông trại, vườn hoa theo mùa, dùng bữa trưa địa phương và dừng tại quán cà phê có tầm nhìn cao nguyên.',
          accommodation: 'Khách sạn Đà Lạt theo gói',
          transport: 'Xe du lịch',
          activities: ['Vườn hoa', 'Nông trại', 'Cà phê ngắm cảnh'],
          imageUrl: IMAGES.daLat[1],
        },
        {
          title: 'Mua đặc sản - Tiễn khách',
          description: 'Tự do mua đặc sản, cà phê, mứt Đà Lạt và tiễn khách tại sân bay hoặc bến xe.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.daLat[2],
        },
      ],
      faqs: [
        { question: 'Đà Lạt có cần chuẩn bị áo ấm không?', answer: 'Có. Buổi tối và sáng sớm thường lạnh, khách nên mang áo khoác nhẹ.' },
        { question: 'Tour có phù hợp gia đình có trẻ nhỏ không?', answer: 'Có. Lịch trình nhẹ, thời gian di chuyển giữa các điểm không quá dài.' },
      ],
    },
  },
  {
    destination: {
      name: 'Phú Quốc',
      slug: 'phu-quoc',
      region: 'Miền Nam',
      description: 'Đảo nghỉ dưỡng nổi tiếng với bãi biển, hoàng hôn, hải sản, cáp treo Hòn Thơm, làng chài và các khu vui chơi biển đảo.',
      imageUrl: IMAGES.phuQuoc[0],
    },
    tour: {
      tourCode: 'VN-PQC-012',
      name: 'Phú Quốc Biển Đảo - Nam Đảo - Hoàng Hôn 3 Ngày 2 Đêm',
      description: buildDescription(
        'Tour Phú Quốc tập trung vào nghỉ dưỡng biển, khám phá Nam Đảo, làng chài, hải sản và không gian hoàng hôn đặc trưng của đảo ngọc.',
        'biển đảo, nghỉ dưỡng, ẩm thực hải sản và trải nghiệm vui chơi nhẹ',
        'gia đình, cặp đôi và nhóm bạn muốn lịch trình biển đảo dễ đi, dịch vụ đầy đủ',
      ),
      price: 3_950_000,
      duration: '3 ngày 2 đêm',
      availableSeats: 100,
      imageUrl: IMAGES.phuQuoc[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Phú Quốc',
      highlights: [
        'Tắm biển và ngắm hoàng hôn Phú Quốc',
        'Khám phá Nam Đảo, làng chài và điểm check-in biển',
        'Thưởng thức hải sản địa phương',
        'Có thời gian tự do nghỉ dưỡng tại resort/khách sạn',
      ],
      gallery: [...IMAGES.phuQuoc],
      itinerary: [
        {
          title: 'Đón khách - Nghỉ dưỡng biển',
          description: 'Đón khách tại sân bay Phú Quốc, nhận phòng, tự do tắm biển và dùng bữa tối hải sản.',
          accommodation: 'Khách sạn/resort Phú Quốc theo gói',
          transport: 'Xe du lịch',
          activities: ['Đón khách Phú Quốc', 'Tắm biển', 'Hải sản địa phương'],
          imageUrl: IMAGES.phuQuoc[0],
        },
        {
          title: 'Nam Đảo - Làng chài - Hoàng hôn',
          description: 'Khám phá các điểm nổi bật khu Nam Đảo, ghé làng chài, mua đặc sản và ngắm hoàng hôn ven biển.',
          accommodation: 'Khách sạn/resort Phú Quốc theo gói',
          transport: 'Xe du lịch',
          activities: ['Nam Đảo', 'Làng chài', 'Ngắm hoàng hôn'],
          imageUrl: IMAGES.phuQuoc[1],
        },
        {
          title: 'Tự do nghỉ dưỡng - Tiễn khách',
          description: 'Tự do nghỉ ngơi, mua đặc sản và tiễn khách ra sân bay.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.phuQuoc[2],
        },
      ],
      faqs: [
        { question: 'Tour có bao gồm vé vui chơi không?', answer: 'Tùy gói. Gói cao cấp có thể bao gồm hoặc hỗ trợ đặt vé trước.' },
        { question: 'Nên đi Phú Quốc mùa nào?', answer: 'Mùa khô thường thuận lợi hơn cho hoạt động biển, nhưng lịch tour vẫn phụ thuộc tình hình thời tiết thực tế.' },
      ],
    },
  },
  {
    destination: {
      name: 'Mũi Né',
      slug: 'mui-ne',
      region: 'Miền Nam',
      description: 'Điểm đến biển của Bình Thuận nổi bật với đồi cát, làng chài, suối Tiên, resort ven biển và các hoạt động ngắm bình minh.',
      imageUrl: IMAGES.muiNe[0],
    },
    tour: {
      tourCode: 'VN-MNE-013',
      name: 'Mũi Né Đồi Cát - Làng Chài - Resort Biển 2 Ngày 1 Đêm',
      description: buildDescription(
        'Hành trình Mũi Né dành cho khách muốn kết hợp nghỉ dưỡng biển ngắn ngày với bình minh trên đồi cát, làng chài và ẩm thực hải sản.',
        'đồi cát, biển, làng chài và nghỉ dưỡng ven biển',
        'nhóm bạn, gia đình và khách xuất phát từ TP.HCM muốn chuyến đi cuối tuần gọn nhẹ',
      ),
      price: 2_450_000,
      duration: '2 ngày 1 đêm',
      availableSeats: 90,
      imageUrl: IMAGES.muiNe[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'TP.HCM',
      highlights: [
        'Ngắm bình minh tại đồi cát',
        'Tham quan làng chài Mũi Né và suối Tiên',
        'Nghỉ dưỡng tại khách sạn/resort ven biển',
        'Thưởng thức hải sản Bình Thuận',
      ],
      gallery: [...IMAGES.muiNe],
      itinerary: [
        {
          title: 'TP.HCM - Mũi Né - Suối Tiên',
          description: 'Khởi hành từ TP.HCM, đến Mũi Né nhận phòng, tham quan suối Tiên và tự do tắm biển.',
          accommodation: 'Khách sạn/resort Mũi Né theo gói',
          transport: 'Xe du lịch',
          activities: ['Di chuyển TP.HCM - Mũi Né', 'Suối Tiên', 'Tắm biển'],
          imageUrl: IMAGES.muiNe[0],
        },
        {
          title: 'Đồi cát - Làng chài - Trở về',
          description: 'Dậy sớm ngắm bình minh trên đồi cát, ghé làng chài, dùng bữa trưa và trở về TP.HCM.',
          transport: 'Xe du lịch',
          activities: ['Đồi cát Mũi Né', 'Làng chài', 'Trở về TP.HCM'],
          imageUrl: IMAGES.muiNe[1],
        },
      ],
      faqs: [
        { question: 'Có cần dậy sớm để đi đồi cát không?', answer: 'Có. Bình minh là thời điểm đẹp và mát nhất để tham quan đồi cát.' },
        { question: 'Tour có phù hợp đi cuối tuần không?', answer: 'Có. Đây là tour ngắn ngày, phù hợp khách xuất phát từ TP.HCM.' },
      ],
    },
  },
  {
    destination: {
      name: 'Quy Nhơn',
      slug: 'quy-nhon',
      region: 'Miền Trung',
      description: 'Thành phố biển Bình Định nổi tiếng với Kỳ Co, Eo Gió, làng chài, bãi biển xanh và nhịp nghỉ dưỡng yên tĩnh hơn các đô thị biển lớn.',
      imageUrl: IMAGES.quyNhon[0],
    },
    tour: {
      tourCode: 'VN-UIH-014',
      name: 'Quy Nhơn Kỳ Co - Eo Gió - Biển Xanh 3 Ngày 2 Đêm',
      description: buildDescription(
        'Tour Quy Nhơn đưa khách đến các điểm biển nổi bật như Kỳ Co, Eo Gió, kết hợp hải sản và thời gian nghỉ dưỡng tại trung tâm thành phố.',
        'biển xanh, cảnh quan ven bờ, làng chài và ẩm thực Bình Định',
        'gia đình, cặp đôi và nhóm bạn muốn một điểm đến biển đẹp nhưng không quá đông đúc',
      ),
      price: 3_450_000,
      duration: '3 ngày 2 đêm',
      availableSeats: 85,
      imageUrl: IMAGES.quyNhon[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Quy Nhơn',
      highlights: [
        'Check-in Kỳ Co và Eo Gió',
        'Tắm biển, ăn hải sản và nghỉ dưỡng tại Quy Nhơn',
        'Tham quan làng chài hoặc điểm văn hóa Bình Định',
        'Lịch trình cân bằng giữa tham quan và nghỉ ngơi',
      ],
      gallery: [...IMAGES.quyNhon],
      itinerary: [
        {
          title: 'Đón khách - Biển Quy Nhơn',
          description: 'Đón khách tại Quy Nhơn, nhận phòng, tham quan bãi biển trung tâm và thưởng thức hải sản.',
          accommodation: 'Khách sạn Quy Nhơn theo gói',
          transport: 'Xe du lịch',
          activities: ['Đón khách Quy Nhơn', 'Biển trung tâm', 'Hải sản Bình Định'],
          imageUrl: IMAGES.quyNhon[0],
        },
        {
          title: 'Kỳ Co - Eo Gió',
          description: 'Khám phá Kỳ Co, Eo Gió, chụp ảnh ven biển và dùng bữa trưa theo chương trình.',
          accommodation: 'Khách sạn Quy Nhơn theo gói',
          transport: 'Xe du lịch và cano/tàu theo điều kiện',
          activities: ['Kỳ Co', 'Eo Gió', 'Làng chài'],
          imageUrl: IMAGES.quyNhon[1],
        },
        {
          title: 'Tự do mua đặc sản - Tiễn khách',
          description: 'Tự do mua đặc sản Bình Định và tiễn khách tại sân bay/ga.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.quyNhon[2],
        },
      ],
      faqs: [
        { question: 'Kỳ Co có phụ thuộc thời tiết biển không?', answer: 'Có. Nếu biển động, đội điều hành sẽ đổi sang điểm tham quan phù hợp và an toàn hơn.' },
        { question: 'Tour có nhiều thời gian tắm biển không?', answer: 'Có. Lịch trình có thời gian tự do tại bãi biển và khách sạn.' },
      ],
    },
  },
  {
    destination: {
      name: 'Phú Yên',
      slug: 'phu-yen',
      region: 'Miền Trung',
      description: 'Vùng biển miền Trung nổi bật với Gành Đá Đĩa, Bãi Xép, Mũi Điện, tháp Nghinh Phong và nhịp du lịch còn nguyên vẻ mộc mạc.',
      imageUrl: IMAGES.phuYen[0],
    },
    tour: {
      tourCode: 'VN-TBB-015',
      name: 'Phú Yên Gành Đá Đĩa - Bãi Xép - Mũi Điện 3 Ngày 2 Đêm',
      description: buildDescription(
        'Hành trình Phú Yên kết hợp những cảnh quan biểu tượng như Gành Đá Đĩa, Bãi Xép, Mũi Điện và ẩm thực biển địa phương.',
        'cảnh quan biển, địa chất ven bờ, làng chài và nhịp du lịch chậm',
        'khách thích chụp ảnh, gia đình và nhóm bạn muốn khám phá miền Trung ít xô bồ',
      ),
      price: 3_250_000,
      duration: '3 ngày 2 đêm',
      availableSeats: 80,
      imageUrl: IMAGES.phuYen[0],
      tourType: 'Khám Phá',
      departurePoint: 'Tuy Hòa',
      highlights: [
        'Tham quan Gành Đá Đĩa và Bãi Xép',
        'Check-in Mũi Điện, tháp Nghinh Phong theo lịch trình',
        'Thưởng thức hải sản Phú Yên',
        'Lịch trình phù hợp khách thích ảnh phong cảnh',
      ],
      gallery: [...IMAGES.phuYen],
      itinerary: [
        {
          title: 'Tuy Hòa - Bãi Xép - Tháp Nghinh Phong',
          description: 'Đón khách tại Tuy Hòa, tham quan Bãi Xép, tháp Nghinh Phong và dùng bữa tối địa phương.',
          accommodation: 'Khách sạn Tuy Hòa theo gói',
          transport: 'Xe du lịch',
          activities: ['Bãi Xép', 'Tháp Nghinh Phong', 'Ẩm thực Phú Yên'],
          imageUrl: IMAGES.phuYen[0],
        },
        {
          title: 'Gành Đá Đĩa - Mũi Điện',
          description: 'Khám phá Gành Đá Đĩa, Mũi Điện, các điểm biển ven đường và nghỉ đêm tại Tuy Hòa.',
          accommodation: 'Khách sạn Tuy Hòa theo gói',
          transport: 'Xe du lịch',
          activities: ['Gành Đá Đĩa', 'Mũi Điện', 'Biển Phú Yên'],
          imageUrl: IMAGES.phuYen[1],
        },
        {
          title: 'Mua đặc sản - Tiễn khách',
          description: 'Tự do mua đặc sản, cà phê sáng và tiễn khách tại sân bay/ga Tuy Hòa.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.phuYen[2],
        },
      ],
      faqs: [
        { question: 'Tour Phú Yên có nhiều điểm chụp ảnh không?', answer: 'Có. Các điểm như Gành Đá Đĩa, Bãi Xép, Mũi Điện đều phù hợp chụp ảnh phong cảnh.' },
        { question: 'Có phù hợp khách lớn tuổi không?', answer: 'Có, nhưng một số điểm ven biển cần đi bộ nhẹ nên khách nên mang giày thoải mái.' },
      ],
    },
  },
  {
    destination: {
      name: 'Cần Thơ',
      slug: 'can-tho',
      region: 'Miền Nam',
      description: 'Trung tâm miền Tây nổi tiếng với chợ nổi Cái Răng, sông nước, vườn trái cây, bến Ninh Kiều và ẩm thực Nam Bộ.',
      imageUrl: IMAGES.canTho[0],
    },
    tour: {
      tourCode: 'VN-VCA-016',
      name: 'Cần Thơ Chợ Nổi Cái Răng - Miệt Vườn 2 Ngày 1 Đêm',
      description: buildDescription(
        'Tour Cần Thơ đưa khách trải nghiệm chợ nổi Cái Răng vào sáng sớm, miệt vườn, bến Ninh Kiều và ẩm thực miền Tây.',
        'sông nước, chợ nổi, miệt vườn và văn hóa Nam Bộ',
        'gia đình, nhóm bạn và khách muốn trải nghiệm miền Tây trong thời gian ngắn',
      ),
      price: 2_150_000,
      duration: '2 ngày 1 đêm',
      availableSeats: 85,
      imageUrl: IMAGES.canTho[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'TP.HCM',
      highlights: [
        'Đi thuyền chợ nổi Cái Răng buổi sáng',
        'Tham quan vườn trái cây hoặc nhà cổ theo mùa',
        'Dạo bến Ninh Kiều buổi tối',
        'Thưởng thức món miền Tây',
      ],
      gallery: [...IMAGES.canTho],
      itinerary: [
        {
          title: 'TP.HCM - Cần Thơ - Bến Ninh Kiều',
          description: 'Khởi hành đi Cần Thơ, nhận phòng, tham quan điểm miệt vườn hoặc nhà cổ và dạo bến Ninh Kiều.',
          accommodation: 'Khách sạn Cần Thơ theo gói',
          transport: 'Xe du lịch',
          activities: ['Di chuyển TP.HCM - Cần Thơ', 'Miệt vườn', 'Bến Ninh Kiều'],
          imageUrl: IMAGES.canTho[0],
        },
        {
          title: 'Chợ nổi Cái Răng - Trở về',
          description: 'Dậy sớm đi thuyền chợ nổi Cái Răng, ăn sáng kiểu miền Tây, mua đặc sản và trở về.',
          transport: 'Xe du lịch và thuyền',
          activities: ['Chợ nổi Cái Răng', 'Ăn sáng trên sông', 'Trở về'],
          imageUrl: IMAGES.canTho[1],
        },
      ],
      faqs: [
        { question: 'Vì sao phải đi chợ nổi từ sáng sớm?', answer: 'Chợ nổi nhộn nhịp nhất vào sáng sớm, nếu đi muộn trải nghiệm sẽ kém hơn.' },
        { question: 'Tour có say sóng không?', answer: 'Hoạt động thuyền chủ yếu trên sông, thường êm hơn biển nhưng khách nhạy cảm vẫn nên chuẩn bị thuốc cá nhân.' },
      ],
    },
  },
  {
    destination: {
      name: 'TP.HCM',
      slug: 'tp-ho-chi-minh',
      region: 'Miền Nam',
      description: 'Đô thị năng động với các công trình lịch sử, phố đi bộ, chợ Bến Thành, ẩm thực đường phố và tuyến tham quan Củ Chi.',
      imageUrl: IMAGES.hoChiMinh[0],
    },
    tour: {
      tourCode: 'VN-SGN-017',
      name: 'Sài Gòn City Tour - Địa Đạo Củ Chi 2 Ngày 1 Đêm',
      description: buildDescription(
        'Hành trình kết hợp các biểu tượng trung tâm Sài Gòn với chuyến tham quan địa đạo Củ Chi, phù hợp khách muốn hiểu lịch sử và nhịp sống đô thị.',
        'lịch sử, kiến trúc đô thị, ẩm thực đường phố và trải nghiệm Củ Chi',
        'khách lần đầu đến TP.HCM, nhóm học sinh sinh viên, gia đình và khách công tác có thêm thời gian tham quan',
      ),
      price: 2_650_000,
      duration: '2 ngày 1 đêm',
      availableSeats: 90,
      imageUrl: IMAGES.hoChiMinh[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'TP.HCM',
      highlights: [
        'Tham quan Dinh Độc Lập, Nhà thờ Đức Bà, Bưu điện Thành phố theo điều kiện mở cửa',
        'Khám phá chợ Bến Thành hoặc phố đi bộ',
        'Tìm hiểu địa đạo Củ Chi',
        'Trải nghiệm ẩm thực đường phố Sài Gòn',
      ],
      gallery: [...IMAGES.hoChiMinh],
      itinerary: [
        {
          title: 'City tour trung tâm Sài Gòn',
          description: 'Đón khách, tham quan các công trình trung tâm, chợ Bến Thành hoặc phố đi bộ và thưởng thức ẩm thực địa phương.',
          accommodation: 'Khách sạn TP.HCM theo gói',
          transport: 'Xe du lịch',
          activities: ['Dinh Độc Lập', 'Bưu điện Thành phố', 'Chợ Bến Thành'],
          imageUrl: IMAGES.hoChiMinh[0],
        },
        {
          title: 'Địa đạo Củ Chi - Tiễn khách',
          description: 'Di chuyển đến Củ Chi, tìm hiểu hệ thống địa đạo, dùng bữa trưa và tiễn khách tại trung tâm hoặc sân bay.',
          transport: 'Xe du lịch',
          activities: ['Địa đạo Củ Chi', 'Ăn trưa', 'Tiễn khách'],
          imageUrl: IMAGES.hoChiMinh[1],
        },
      ],
      faqs: [
        { question: 'Các điểm trung tâm có phụ thuộc lịch mở cửa không?', answer: 'Có. Nếu một điểm đóng cửa hoặc bảo trì, hướng dẫn viên sẽ điều chỉnh điểm thay thế phù hợp.' },
        { question: 'Tour Củ Chi có cần đi bộ nhiều không?', answer: 'Có đi bộ nhẹ trong khu tham quan, khách nên mang giày thoải mái.' },
      ],
    },
  },
  {
    destination: {
      name: 'Mộc Châu',
      slug: 'moc-chau',
      region: 'Miền Bắc',
      description: 'Cao nguyên Sơn La nổi bật với đồi chè, thung lũng hoa, thác nước, khí hậu mát và các bản làng dân tộc Tây Bắc.',
      imageUrl: IMAGES.mocChau[0],
    },
    tour: {
      tourCode: 'VN-MOC-018',
      name: 'Mộc Châu Đồi Chè - Thác Dải Yếm - Bản Làng 2 Ngày 1 Đêm',
      description: buildDescription(
        'Tour Mộc Châu đưa khách khám phá đồi chè, thác Dải Yếm, thung lũng hoa theo mùa và không gian bản làng Tây Bắc.',
        'cao nguyên, nông nghiệp chè, bản làng và cảnh quan theo mùa',
        'nhóm bạn, gia đình và khách muốn chuyến đi gần Hà Nội nhưng có không khí núi rừng rõ nét',
      ),
      price: 2_350_000,
      duration: '2 ngày 1 đêm',
      availableSeats: 80,
      imageUrl: IMAGES.mocChau[0],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Check-in đồi chè Mộc Châu',
        'Tham quan thác Dải Yếm hoặc điểm mùa hoa',
        'Trải nghiệm ẩm thực Tây Bắc',
        'Lịch trình ngắn ngày, dễ đi từ Hà Nội',
      ],
      gallery: [...IMAGES.mocChau],
      itinerary: [
        {
          title: 'Hà Nội - Mộc Châu - Đồi chè',
          description: 'Khởi hành từ Hà Nội, đến Mộc Châu tham quan đồi chè, điểm hoa theo mùa và nghỉ đêm.',
          accommodation: 'Khách sạn/homestay Mộc Châu',
          transport: 'Xe du lịch',
          activities: ['Di chuyển Hà Nội - Mộc Châu', 'Đồi chè', 'Ẩm thực Tây Bắc'],
          imageUrl: IMAGES.mocChau[0],
        },
        {
          title: 'Thác Dải Yếm - Bản làng - Trở về',
          description: 'Tham quan thác Dải Yếm hoặc bản làng, mua đặc sản sữa, chè và trở về Hà Nội.',
          transport: 'Xe du lịch',
          activities: ['Thác Dải Yếm', 'Bản làng', 'Trở về Hà Nội'],
          imageUrl: IMAGES.mocChau[1],
        },
      ],
      faqs: [
        { question: 'Mộc Châu mùa nào đẹp?', answer: 'Mỗi mùa có cảnh riêng: mùa hoa, mùa mận, mùa chè xanh. Seed này phù hợp chạy quanh năm.' },
        { question: 'Tour có phù hợp trẻ em không?', answer: 'Có, nhưng gia đình nên chuẩn bị áo khoác và giày dễ đi.' },
      ],
    },
  },
  {
    destination: {
      name: 'Mai Châu',
      slug: 'mai-chau',
      region: 'Miền Bắc',
      description: 'Thung lũng Hòa Bình yên bình với ruộng lúa, bản Lác, nhà sàn, văn hóa Thái và các cung đường đạp xe nhẹ giữa làng bản.',
      imageUrl: IMAGES.maiChau[0],
    },
    tour: {
      tourCode: 'VN-MAI-019',
      name: 'Mai Châu Bản Lác - Thung Lũng Lúa - Nhà Sàn 2 Ngày 1 Đêm',
      description: buildDescription(
        'Tour Mai Châu phù hợp khách muốn rời thành phố, trải nghiệm thung lũng lúa, nhà sàn, văn hóa Thái và nhịp sống bản làng.',
        'thung lũng, bản làng, văn hóa dân tộc và nghỉ dưỡng nhẹ',
        'gia đình, nhóm bạn, khách nước ngoài và người muốn một chuyến đi gần Hà Nội, ít áp lực lịch trình',
      ),
      price: 2_150_000,
      duration: '2 ngày 1 đêm',
      availableSeats: 75,
      imageUrl: IMAGES.maiChau[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Hà Nội',
      highlights: [
        'Dạo bản Lác và thung lũng Mai Châu',
        'Nghỉ nhà sàn/homestay hoặc khách sạn theo gói',
        'Trải nghiệm bữa ăn địa phương',
        'Có thể đạp xe nhẹ quanh bản',
      ],
      gallery: [...IMAGES.maiChau],
      itinerary: [
        {
          title: 'Hà Nội - Mai Châu - Bản Lác',
          description: 'Khởi hành từ Hà Nội, đến Mai Châu dùng bữa trưa, nhận phòng và dạo bản Lác.',
          accommodation: 'Nhà sàn/homestay Mai Châu theo gói',
          transport: 'Xe du lịch',
          activities: ['Di chuyển Hà Nội - Mai Châu', 'Bản Lác', 'Ẩm thực địa phương'],
          imageUrl: IMAGES.maiChau[0],
        },
        {
          title: 'Thung lũng Mai Châu - Trở về',
          description: 'Tự do đạp xe hoặc đi bộ quanh thung lũng, mua quà địa phương và trở về Hà Nội.',
          transport: 'Xe du lịch',
          activities: ['Đạp xe nhẹ', 'Thung lũng lúa', 'Trở về Hà Nội'],
          imageUrl: IMAGES.maiChau[1],
        },
      ],
      faqs: [
        { question: 'Tour Mai Châu có nghỉ nhà sàn không?', answer: 'Có thể chọn nhà sàn/homestay hoặc khách sạn tùy gói dịch vụ.' },
        { question: 'Có bắt buộc đạp xe không?', answer: 'Không. Khách có thể đi bộ nhẹ quanh bản nếu không muốn đạp xe.' },
      ],
    },
  },
  {
    destination: {
      name: 'Cao Bằng',
      slug: 'cao-bang',
      region: 'Miền Bắc',
      description: 'Vùng Đông Bắc nổi tiếng với thác Bản Giốc, suối Lê Nin, động Ngườm Ngao, núi non biên giới và bản làng yên bình.',
      imageUrl: IMAGES.caoBang[0],
    },
    tour: {
      tourCode: 'VN-CBG-020',
      name: 'Cao Bằng Thác Bản Giốc - Động Ngườm Ngao 3 Ngày 2 Đêm',
      description: buildDescription(
        'Tour Cao Bằng đưa khách đến thác Bản Giốc, động Ngườm Ngao, suối Lê Nin và các cung đường Đông Bắc giàu cảnh quan.',
        'thác nước, hang động, núi non biên giới và văn hóa bản địa',
        'khách yêu thiên nhiên, nhóm bạn thích khám phá và gia đình muốn trải nghiệm Đông Bắc',
      ),
      price: 3_850_000,
      duration: '3 ngày 2 đêm',
      availableSeats: 70,
      imageUrl: IMAGES.caoBang[0],
      tourType: 'Khám Phá',
      departurePoint: 'Hà Nội',
      highlights: [
        'Tham quan thác Bản Giốc',
        'Khám phá động Ngườm Ngao và suối Lê Nin',
        'Trải nghiệm cung đường Đông Bắc',
        'Ẩm thực địa phương Cao Bằng',
      ],
      gallery: [...IMAGES.caoBang],
      itinerary: [
        {
          title: 'Hà Nội - Cao Bằng',
          description: 'Khởi hành từ Hà Nội đi Cao Bằng, dừng nghỉ trên đường, nhận phòng và dùng bữa tối địa phương.',
          accommodation: 'Khách sạn Cao Bằng theo gói',
          transport: 'Xe du lịch',
          activities: ['Di chuyển Hà Nội - Cao Bằng', 'Ẩm thực địa phương'],
          imageUrl: IMAGES.caoBang[0],
        },
        {
          title: 'Thác Bản Giốc - Động Ngườm Ngao',
          description: 'Tham quan thác Bản Giốc, động Ngườm Ngao và các điểm cảnh quan khu vực Trùng Khánh.',
          accommodation: 'Khách sạn Cao Bằng theo gói',
          transport: 'Xe du lịch',
          activities: ['Thác Bản Giốc', 'Động Ngườm Ngao', 'Cảnh quan Trùng Khánh'],
          imageUrl: IMAGES.caoBang[1],
        },
        {
          title: 'Suối Lê Nin - Trở về Hà Nội',
          description: 'Tham quan suối Lê Nin, mua đặc sản và trở về Hà Nội.',
          transport: 'Xe du lịch',
          activities: ['Suối Lê Nin', 'Mua đặc sản', 'Trở về Hà Nội'],
          imageUrl: IMAGES.caoBang[2],
        },
      ],
      faqs: [
        { question: 'Cao Bằng di chuyển có xa không?', answer: 'Có. Tour được thiết kế 3 ngày 2 đêm để giảm áp lực di chuyển và có thời gian nghỉ hợp lý.' },
        { question: 'Thác Bản Giốc mùa nào đẹp?', answer: 'Mùa nước nhiều thường ấn tượng hơn, nhưng lịch trình vẫn có thể chạy quanh năm tùy thời tiết.' },
      ],
    },
  },
];

function departureData(basePrice: number, baseSeats: number) {
  const offsets = [21, 35, 49, 70];
  return offsets.map((offset, index) => {
    const departureDate = addDays(offset);
    return {
      departureDate,
      price: basePrice,
      availableSeats: Math.max(12, baseSeats - index * 5),
      maxSeats: baseSeats,
      note:
        index === 0
          ? 'Ưu đãi đặt sớm'
          : index === 2
            ? 'Flash sale số lượng giới hạn'
            : 'Lịch khởi hành định kỳ',
      category: null,
      flashSaleEndsAt: null,
      isActive: true,
      sortOrder: index,
    };
  });
}

export async function seedDomesticTours(prisma: PrismaClient) {
  const domesticTourSeeds = [...tours, ...remainingDomesticTours];

  for (const item of domesticTourSeeds) {
    const destination = await prisma.destination.upsert({
      where: { name: item.destination.name },
      update: {
        slug: item.destination.slug,
        description: item.destination.description,
        imageUrl: item.destination.imageUrl,
        region: item.destination.region,
        travelScope: DOMESTIC_SCOPE,
        countryCode: 'VN',
      },
      create: {
        name: item.destination.name,
        slug: item.destination.slug,
        description: item.destination.description,
        imageUrl: item.destination.imageUrl,
        region: item.destination.region,
        travelScope: DOMESTIC_SCOPE,
        countryCode: 'VN',
      },
    });

    const tour = await prisma.tour.upsert({
      where: { tourCode: item.tour.tourCode },
      update: {
        name: item.tour.name,
        description: item.tour.description,
        price: item.tour.price,
        destinationId: destination.id,
        startDate: addDays(21),
        duration: item.tour.duration,
        availableSeats: item.tour.availableSeats,
        imageUrl: item.tour.imageUrl,
        averageRating: 4.8,
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
        startDate: addDays(21),
        duration: item.tour.duration,
        availableSeats: item.tour.availableSeats,
        imageUrl: item.tour.imageUrl,
        averageRating: 4.8,
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
      ...departureData(item.tour.price, Math.min(item.tour.availableSeats, 40)).map(
        (departure) =>
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
                ? 'auto_awesome'
                : index === 1
                  ? 'landscape'
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
      tourCode: { in: domesticTourSeeds.map((item) => item.tour.tourCode) },
      deletedAt: null,
    },
  });
  const seededDestinations = await prisma.destination.count({
    where: {
      slug: { in: domesticTourSeeds.map((item) => item.destination.slug) },
      travelScope: DOMESTIC_SCOPE,
    },
  });

  console.table([
    { group: 'Domestic destinations', count: seededDestinations },
    { group: 'Domestic tours', count: seededTours },
  ]);
}
