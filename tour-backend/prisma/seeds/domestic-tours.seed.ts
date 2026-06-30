import {
  Prisma,
  PrismaClient,
  TourStatus,
  TransportType,
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
    ticketPolicy?: TicketPolicy;
    transport?: DomesticTransportSeed;
  };
};

const DOMESTIC_SCOPE = 'DOMESTIC' as const;

type TicketPolicy = {
  included?: string[];
  optional?: string[];
  excluded?: string[];
};

type DomesticTransportSeed = {
  type: TransportType;
  vehicleType: string;
  vehicleTypeEn: string;
  operator: string;
  operatorEn: string;
  notes: string;
  notesEn: string;
};

function addDays(days: number): Date {
  const date = new Date();
  date.setHours(8, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function unsplashPhoto(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&q=80&w=1600`;
}

// Ảnh Unsplash riêng cho từng điểm đến (đã xác minh trả về 200, không dùng
// trùng giữa các điểm). Lấy theo từ khóa địa danh để khớp đúng nơi.
const IMAGES = {
  hanoi: [
    unsplashPhoto('photo-1613131145282-9476375618e1'),
    unsplashPhoto('photo-1600869080148-338f85fb17f8'),
    unsplashPhoto('photo-1721222847140-51f6297895c3'),
  ],
  haLong: [
    unsplashPhoto('photo-1643029891412-92f9a81a8c16'),
    unsplashPhoto('photo-1697850084120-4896a446a04d'),
    unsplashPhoto('photo-1625396836163-80c0d3d7eb86'),
  ],
  ninhBinh: [
    unsplashPhoto('photo-1557750255-c76072a7aad1'),
    unsplashPhoto('photo-1656692197297-cb1340b4d538'),
    unsplashPhoto('photo-1725209276479-59220882e9b0'),
  ],
  sapa: [
    unsplashPhoto('photo-1609412058473-c199497c3c5d'),
    unsplashPhoto('photo-1480996408299-fc0e830b5db1'),
    unsplashPhoto('photo-1570366583862-f91883984fde'),
  ],
  haGiang: [
    unsplashPhoto('photo-1603269414002-7f3d2acd0409'),
    unsplashPhoto('photo-1593852181728-bab1ce6c7f28'),
    unsplashPhoto('photo-1721151450713-875275523e96'),
  ],
  quangBinh: [
    unsplashPhoto('photo-1698658989153-a60a73549b4a'),
    unsplashPhoto('photo-1719461208440-ae18bcc471bb'),
    unsplashPhoto('photo-1719461208377-94ec5820e414'),
  ],
  hue: [
    unsplashPhoto('photo-1696147861399-93bdb59749dd'),
    unsplashPhoto('photo-1713685714770-384c5654f6be'),
    unsplashPhoto('photo-1705823637026-92c0ef6d6222'),
  ],
  daNang: [
    unsplashPhoto('photo-1559592413-7cec4d0cae2b'),
    unsplashPhoto('photo-1603852452378-a4e8d84324a2'),
    unsplashPhoto('photo-1555979864-7a8f9b4fddf8'),
  ],
  hoiAn: [
    unsplashPhoto('photo-1563354860-799d15199ac3'),
    unsplashPhoto('photo-1613625695262-98bceeda4bc0'),
    unsplashPhoto('photo-1652731011413-93d4c5aa5c7c'),
  ],
  nhaTrang: [
    unsplashPhoto('photo-1533002832-1721d16b4bb9'),
    unsplashPhoto('photo-1687025846473-9bd391575faa'),
    unsplashPhoto('photo-1503188991764-408493f288b9'),
  ],
  daLat: [
    unsplashPhoto('photo-1678099006439-dba9e4d3f9f5'),
    unsplashPhoto('photo-1626608017817-211d7c48177d'),
    unsplashPhoto('photo-1552310065-aad9ebece999'),
  ],
  phuQuoc: [
    unsplashPhoto('photo-1746292448726-9e75b5f1067d'),
    unsplashPhoto('photo-1693294603830-f44c9511d643'),
    unsplashPhoto('photo-1698809807960-758cf416e96e'),
  ],
  muiNe: [
    unsplashPhoto('photo-1488197047962-b48492212cda'),
    unsplashPhoto('photo-1621795307430-3ff25aa08945'),
    unsplashPhoto('photo-1482881497185-d4a9ddbe4151'),
  ],
  quyNhon: [
    unsplashPhoto('photo-1504457047772-27faf1c00561'),
    unsplashPhoto('photo-1604325099517-d9ff3c837c3c'),
    unsplashPhoto('photo-1606625379124-3882167b827b'),
  ],
  phuYen: [
    unsplashPhoto('photo-1716479852357-a71a74d81537'),
    unsplashPhoto('photo-1646922840884-e50a01c5c97d'),
    unsplashPhoto('photo-1611737730075-be7874d195b5'),
  ],
  canTho: [
    unsplashPhoto('photo-1692640480932-7d33837179de'),
    unsplashPhoto('photo-1529271230144-e8c648ef570d'),
    unsplashPhoto('photo-1689760661317-a839f59b1c32'),
  ],
  hoChiMinh: [
    unsplashPhoto('photo-1583417319070-4a69db38a482'),
    unsplashPhoto('photo-1536086845112-89de23aa4772'),
    unsplashPhoto('photo-1602646994030-464f98de5e5c'),
  ],
  mocChau: [
    unsplashPhoto('photo-1694969775491-a36574e54ffd'),
    unsplashPhoto('photo-1661174803717-49828c8b0066'),
    unsplashPhoto('photo-1633730652897-b3d92a6fd47f'),
  ],
  maiChau: [
    unsplashPhoto('photo-1709064155843-fe1acf2998eb'),
    unsplashPhoto('photo-1745676540962-ed5b0f2514c2'),
    unsplashPhoto('photo-1709064227258-9e1f3a0b8399'),
  ],
  caoBang: [
    unsplashPhoto('photo-1599394502978-556699cdac2d'),
    unsplashPhoto('photo-1746338790243-0fa086169679'),
    unsplashPhoto('photo-1652288509700-233309520f9e'),
  ],
  vungTau: [
    unsplashPhoto('photo-1713845693881-b120cf5aacc8'),
    unsplashPhoto('photo-1623596711744-c10ed15581d9'),
    unsplashPhoto('photo-1689289270364-8c94840201b8'),
  ],
  tayNinh: [
    unsplashPhoto('photo-1651663608811-0d55fdfb0287'),
    unsplashPhoto('photo-1731051983896-1839025c1836'),
    unsplashPhoto('photo-1695745424983-b05a2c4da85b'),
  ],
  catBa: [
    unsplashPhoto('photo-1589291432463-fbddbfd10bbd'),
    unsplashPhoto('photo-1589291539517-2a6a2eda5790'),
    unsplashPhoto('photo-1722471467241-5327b98a4976'),
  ],
  mekong: [
    unsplashPhoto('photo-1543411789-1a67a2ac05c6'),
    unsplashPhoto('photo-1677552926138-f7dbb71b226f'),
    unsplashPhoto('photo-1624937195771-358add2e0d9d'),
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

function includedTicketItems(ticketPolicy?: TicketPolicy) {
  return ticketPolicy?.included?.length
    ? ticketPolicy.included
    : ['Vé tham quan theo lịch trình'];
}

function excludedTicketItems(ticketPolicy?: TicketPolicy) {
  return [
    ...(ticketPolicy?.optional ?? []).map((item) => `${item} nếu khách chọn`),
    ...(ticketPolicy?.excluded ?? []),
  ];
}

function packageData(basePrice: number, ticketPolicy?: TicketPolicy) {
  const includedTickets = includedTicketItems(ticketPolicy);
  const ticketExcludes = excludedTicketItems(ticketPolicy);

  return [
    {
      name: 'Gói Tiêu Chuẩn',
      description:
        'Lựa chọn cân bằng cho khách muốn tối ưu chi phí nhưng vẫn đủ dịch vụ chính.',
      price: basePrice,
      badge: 'BEST VALUE',
      includes: [
        'Xe du lịch theo chương trình',
        'Hướng dẫn viên tiếng Việt',
        ...includedTickets,
        'Bữa ăn tiêu chuẩn theo chương trình',
        'Bảo hiểm du lịch nội địa',
      ],
      excludes: [
        'Chi phí cá nhân',
        'Đồ uống ngoài thực đơn',
        'Phụ thu phòng đơn nếu có',
        ...ticketExcludes,
      ],
      sortOrder: 0,
    },
    {
      name: 'Gói Cao Cấp',
      description:
        'Nâng cấp khách sạn, bữa ăn và trải nghiệm để hành trình thoải mái hơn.',
      price: Math.round(basePrice * 1.28),
      badge: 'POPULAR',
      includes: [
        'Xe du lịch đời mới theo chương trình',
        'Hướng dẫn viên kinh nghiệm',
        ...includedTickets,
        'Khách sạn/retreat tiêu chuẩn cao hơn',
        'Bữa ăn nâng cấp với đặc sản địa phương',
        'Bảo hiểm du lịch nội địa',
      ],
      excludes: [
        'Chi phí cá nhân',
        'Dịch vụ ngoài chương trình',
        'Phụ thu phòng đơn nếu có',
        ...ticketExcludes,
      ],
      sortOrder: 1,
    },
    {
      name: 'Gói Riêng Tư',
      description:
        'Dành cho gia đình hoặc nhóm nhỏ muốn lịch trình linh hoạt và riêng tư hơn.',
      price: Math.round(basePrice * 1.65),
      badge: 'LUXURY',
      includes: [
        'Xe riêng theo lịch trình',
        'Hướng dẫn viên riêng',
        ...includedTickets,
        'Khách sạn/retreat chọn lọc',
        'Bữa ăn riêng theo tư vấn',
        'Hỗ trợ điều chỉnh lịch trình trước khởi hành',
      ],
      excludes: [
        'Chi phí cá nhân',
        'Dịch vụ phát sinh ngoài hợp đồng',
        'Vé máy bay nếu không ghi rõ trong chương trình',
        ...ticketExcludes,
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

type GeneratedTourDay = {
  title: string;
  description: string;
  accommodation?: string;
  transport?: string;
  activities: string[];
  imageUrl?: string;
};

type GeneratedTourOptions = {
  tourCode: string;
  name: string;
  intro: string;
  focus: string;
  suitableFor: string;
  price: number;
  duration: string;
  availableSeats: number;
  tourType: string;
  departurePoint: string;
  highlights: string[];
  gallery: string[];
  itinerary: GeneratedTourDay[];
  faqs?: { question: string; answer: string }[];
  ticketPolicy?: TicketPolicy;
  transport?: DomesticTransportSeed;
};

function rotateGallery(gallery: string[], offset: number) {
  if (gallery.length === 0) return gallery;
  return gallery.map((_, index) => gallery[(index + offset) % gallery.length]);
}

function destinationStay(destinationName: string) {
  return `Khách sạn/homestay ${destinationName} theo gói`;
}

function ticketPolicyAnswer(ticketPolicy?: TicketPolicy) {
  const included = includedTicketItems(ticketPolicy).join(', ');
  const optional = ticketPolicy?.optional?.length
    ? ` Các hạng mục tùy chọn gồm ${ticketPolicy.optional.join(', ')} và sẽ xác nhận khi tư vấn.`
    : '';
  return `Gói tiêu chuẩn đã bao gồm ${included}.${optional}`;
}

function createGeneratedDomesticTour(
  destination: DomesticTourSeed['destination'],
  options: GeneratedTourOptions,
): DomesticTourSeed {
  const gallery =
    options.gallery.length > 0 ? options.gallery : [destination.imageUrl];

  return {
    destination: {
      ...destination,
      imageUrl: destination.imageUrl || gallery[0],
    },
    tour: {
      tourCode: options.tourCode,
      name: options.name,
      description: buildDescription(
        options.intro,
        options.focus,
        options.suitableFor,
      ),
      price: options.price,
      duration: options.duration,
      availableSeats: options.availableSeats,
      imageUrl: gallery[0],
      tourType: options.tourType,
      departurePoint: options.departurePoint,
      highlights: options.highlights,
      gallery,
      itinerary: options.itinerary.map((day, index) => ({
        title: day.title,
        description: day.description,
        accommodation:
          day.accommodation ??
          (options.itinerary.length > 1 && index < options.itinerary.length - 1
            ? destinationStay(destination.name)
            : undefined),
        transport:
          day.transport ??
          options.transport?.vehicleType ??
          'Xe du lịch theo chương trình',
        activities: day.activities,
        imageUrl: day.imageUrl ?? gallery[index % gallery.length],
      })),
      faqs: options.faqs ?? [
        {
          question: `Tour ${destination.name} này phù hợp với ai?`,
          answer:
            'Tour phù hợp khách muốn có thêm lựa chọn cùng điểm đến, lịch trình vừa sức và có thể nâng cấp gói dịch vụ theo nhu cầu.',
        },
        {
          question: 'Giá tour đã bao gồm vé tham quan chưa?',
          answer: ticketPolicyAnswer(options.ticketPolicy),
        },
      ],
      ticketPolicy: options.ticketPolicy,
      transport: options.transport,
    },
  };
}

const tours: DomesticTourSeed[] = [
  {
    destination: {
      name: 'Hà Nội',
      slug: 'ha-noi',
      region: 'Miền Bắc',
      description:
        'Thủ đô nghìn năm văn hiến, nổi bật với phố cổ, di tích lịch sử, ẩm thực đường phố và nhịp sống đô thị giàu bản sắc.',
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
          description:
            'Đón khách tại trung tâm, tham quan các biểu tượng lịch sử, dạo phố cổ và thưởng thức đặc sản địa phương trước khi kết thúc vào cuối chiều.',
          transport: 'Xe du lịch và đi bộ trong phố cổ',
          activities: [
            'Hồ Gươm - phố cổ',
            'Văn Miếu - Hoàng thành Thăng Long',
            'Ẩm thực Hà Nội',
          ],
          imageUrl: IMAGES.hanoi[1],
        },
      ],
      faqs: [
        {
          question: 'Tour có phù hợp với trẻ em không?',
          answer:
            'Có. Lịch trình nhẹ, chủ yếu tham quan trong nội đô và có nhiều điểm nghỉ.',
        },
        {
          question: 'Có cần chuẩn bị trang phục gì đặc biệt?',
          answer:
            'Nên mặc lịch sự khi vào khu di tích, mang giày thoải mái để đi bộ trong phố cổ.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Hạ Long',
      slug: 'ha-long',
      region: 'Miền Bắc',
      description:
        'Điểm đến biển đảo nổi tiếng với cảnh quan núi đá vôi, vịnh xanh, hang động và trải nghiệm du thuyền.',
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
          description:
            'Khởi hành từ Hà Nội, làm thủ tục lên du thuyền, dùng bữa trưa, tham quan hang động hoặc khu vực chèo kayak và nghỉ đêm trên vịnh.',
          accommodation: 'Du thuyền tiêu chuẩn theo gói',
          transport: 'Xe du lịch và du thuyền',
          activities: [
            'Di chuyển Hà Nội - Hạ Long',
            'Chèo kayak hoặc tham quan hang động',
            'Ngắm hoàng hôn trên vịnh',
          ],
          imageUrl: IMAGES.haLong[0],
        },
        {
          title: 'Bình minh trên vịnh - Trở về Hà Nội',
          description:
            'Tập thái cực quyền hoặc thư giãn buổi sáng, dùng brunch trên tàu, trả phòng và trở về Hà Nội.',
          transport: 'Du thuyền và xe du lịch',
          activities: [
            'Ngắm bình minh',
            'Brunch trên du thuyền',
            'Trở về Hà Nội',
          ],
          imageUrl: IMAGES.haLong[1],
        },
      ],
      faqs: [
        {
          question: 'Tour có bao gồm phòng nghỉ trên du thuyền không?',
          answer: 'Có. Hạng phòng phụ thuộc gói khách chọn khi đặt.',
        },
        {
          question: 'Nếu thời tiết xấu thì sao?',
          answer:
            'Lịch tàu phụ thuộc điều phối cảng vụ. Nếu có thay đổi, đội hỗ trợ sẽ thông báo phương án thay thế.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Ninh Bình',
      slug: 'ninh-binh',
      region: 'Miền Bắc',
      description:
        'Vùng đất di sản với Tràng An, Tam Cốc, Hoa Lư và Hang Múa, nổi bật bởi cảnh quan núi đá vôi và sông nước.',
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
          description:
            'Khởi hành từ Hà Nội, tham quan Hoa Lư, dùng bữa trưa, đi thuyền Tràng An và leo Hang Múa trước khi trở về.',
          transport: 'Xe du lịch và thuyền chèo tay',
          activities: ['Cố đô Hoa Lư', 'Thuyền Tràng An', 'Hang Múa'],
          imageUrl: IMAGES.ninhBinh[0],
        },
      ],
      faqs: [
        {
          question: 'Hang Múa có khó leo không?',
          answer:
            'Có khoảng vài trăm bậc đá, khách nên mang giày thoải mái và cân nhắc nếu có vấn đề sức khỏe.',
        },
        {
          question: 'Tour có đón tại khách sạn không?',
          answer:
            'Có hỗ trợ đón trong khu vực trung tâm theo khung giờ xác nhận trước ngày đi.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Sapa',
      slug: 'sapa',
      region: 'Miền Bắc',
      description:
        'Thị trấn vùng cao nổi tiếng với Fansipan, ruộng bậc thang, bản làng và khí hậu mát mẻ quanh năm.',
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
          description:
            'Di chuyển lên Sapa, nhận phòng, dùng bữa trưa và tham quan bản Cát Cát vào buổi chiều.',
          accommodation: 'Khách sạn Sapa theo gói',
          transport: 'Xe limousine hoặc xe du lịch',
          activities: [
            'Di chuyển Hà Nội - Sapa',
            'Bản Cát Cát',
            'Tự do khám phá trung tâm',
          ],
          imageUrl: IMAGES.sapa[0],
        },
        {
          title: 'Fansipan - Nóc nhà Đông Dương',
          description:
            'Khởi hành đi khu cáp treo Fansipan, tham quan quần thể tâm linh và ngắm cảnh núi Hoàng Liên Sơn.',
          accommodation: 'Khách sạn Sapa theo gói',
          transport: 'Xe du lịch và cáp treo tự túc/nâng cấp theo gói',
          activities: ['Fansipan', 'Ẩm thực vùng cao', 'Chợ đêm Sapa'],
          imageUrl: IMAGES.sapa[1],
        },
        {
          title: 'Sapa - Hà Nội',
          description:
            'Ăn sáng, tự do mua đặc sản hoặc cà phê ngắm núi trước khi trở về Hà Nội.',
          transport: 'Xe limousine hoặc xe du lịch',
          activities: ['Tự do mua sắm', 'Trở về Hà Nội'],
          imageUrl: IMAGES.sapa[2],
        },
      ],
      faqs: [
        {
          question: 'Giá tour đã bao gồm vé cáp treo Fansipan chưa?',
          answer:
            'Tùy gói dịch vụ. Gói cao cấp và riêng tư có thể bao gồm hoặc hỗ trợ đặt trước.',
        },
        {
          question: 'Sapa mùa nào đẹp?',
          answer:
            'Mỗi mùa có nét riêng. Mùa lúa và mùa săn mây thường được khách lựa chọn nhiều.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Hà Giang',
      slug: 'ha-giang',
      region: 'Miền Bắc',
      description:
        'Cung đường cao nguyên đá nổi tiếng với đèo Mã Pì Lèng, sông Nho Quế, Đồng Văn và văn hóa vùng biên.',
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
          description:
            'Khởi hành đi Hà Giang, dừng nghỉ trên đường, nhận phòng và chuẩn bị cho cung loop.',
          accommodation: 'Khách sạn/homestay Hà Giang',
          transport: 'Xe du lịch',
          activities: ['Di chuyển Hà Nội - Hà Giang', 'Nghỉ đêm tại Hà Giang'],
          imageUrl: IMAGES.haGiang[0],
        },
        {
          title: 'Quản Bạ - Yên Minh - Đồng Văn',
          description:
            'Đi qua cổng trời Quản Bạ, núi đôi, rừng thông Yên Minh và nghỉ đêm tại Đồng Văn.',
          accommodation: 'Khách sạn/homestay Đồng Văn',
          transport: 'Xe du lịch',
          activities: ['Cổng trời Quản Bạ', 'Yên Minh', 'Phố cổ Đồng Văn'],
          imageUrl: IMAGES.haGiang[1],
        },
        {
          title: 'Mã Pì Lèng - Sông Nho Quế',
          description:
            'Khám phá đoạn đẹp nhất của cung đường với Mã Pì Lèng và trải nghiệm thuyền trên sông Nho Quế.',
          accommodation: 'Khách sạn/homestay Hà Giang',
          transport: 'Xe du lịch và thuyền',
          activities: ['Đèo Mã Pì Lèng', 'Sông Nho Quế', 'Hẻm Tu Sản'],
          imageUrl: IMAGES.haGiang[2],
        },
        {
          title: 'Hà Giang - Hà Nội',
          description:
            'Ăn sáng, trả phòng và trở về Hà Nội, kết thúc hành trình.',
          transport: 'Xe du lịch',
          activities: ['Trở về Hà Nội'],
          imageUrl: IMAGES.haGiang[0],
        },
      ],
      faqs: [
        {
          question: 'Tour có tự lái xe máy không?',
          answer:
            'Seed tour này mặc định di chuyển bằng xe ô tô để an toàn hơn. Có thể tùy biến gói riêng nếu muốn trải nghiệm xe máy.',
        },
        {
          question: 'Hà Giang có phù hợp trẻ nhỏ không?',
          answer:
            'Cung đường dài và nhiều đèo, phù hợp hơn với người có sức khỏe ổn định.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Quảng Bình',
      slug: 'quang-binh',
      region: 'Miền Trung',
      description:
        'Thiên đường hang động với Phong Nha - Kẻ Bàng, động Thiên Đường, sông Chày và các trải nghiệm thiên nhiên.',
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
          description:
            'Đón khách tại Đồng Hới, di chuyển đến Phong Nha, tham quan và nghỉ đêm.',
          accommodation: 'Khách sạn Đồng Hới/Phong Nha',
          transport: 'Xe du lịch',
          activities: ['Đón khách Đồng Hới', 'Phong Nha', 'Ẩm thực địa phương'],
          imageUrl: IMAGES.quangBinh[0],
        },
        {
          title: 'Động Thiên Đường - Sông Chày',
          description:
            'Tham quan động Thiên Đường và trải nghiệm hoạt động ngoài trời tại khu vực sông Chày theo điều kiện thời tiết.',
          accommodation: 'Khách sạn Đồng Hới/Phong Nha',
          transport: 'Xe du lịch',
          activities: ['Động Thiên Đường', 'Sông Chày', 'Hang Tối theo mùa'],
          imageUrl: IMAGES.quangBinh[1],
        },
        {
          title: 'Đồng Hới - Kết thúc',
          description:
            'Tự do nghỉ ngơi, mua đặc sản và tiễn khách tại sân bay/ga Đồng Hới.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.quangBinh[2],
        },
      ],
      faqs: [
        {
          question: 'Tour có trekking nặng không?',
          answer: 'Không. Đây là tour khám phá nhẹ, phù hợp phần lớn du khách.',
        },
        {
          question: 'Có cần mang đồ bơi không?',
          answer:
            'Nên mang đồ bơi hoặc quần áo nhanh khô nếu chọn hoạt động sông Chày - hang Tối.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Huế',
      slug: 'hue',
      region: 'Miền Trung',
      description:
        'Cố đô nổi tiếng với Đại Nội, lăng tẩm, chùa Thiên Mụ, sông Hương và ẩm thực cung đình.',
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
          description:
            'Đón khách, tham quan Đại Nội, chùa Thiên Mụ và trải nghiệm sông Hương vào chiều tối.',
          accommodation: 'Khách sạn Huế theo gói',
          transport: 'Xe du lịch và thuyền rồng',
          activities: ['Đại Nội', 'Chùa Thiên Mụ', 'Sông Hương'],
          imageUrl: IMAGES.hue[0],
        },
        {
          title: 'Lăng vua - Ẩm thực Huế',
          description:
            'Tham quan lăng vua, thưởng thức đặc sản Huế và kết thúc tour.',
          transport: 'Xe du lịch',
          activities: [
            'Lăng Khải Định hoặc Minh Mạng',
            'Ẩm thực Huế',
            'Tiễn khách',
          ],
          imageUrl: IMAGES.hue[1],
        },
      ],
      faqs: [
        {
          question: 'Tour có phù hợp người lớn tuổi không?',
          answer:
            'Có. Lịch trình không quá gấp, nhưng khách nên mang giày thoải mái khi tham quan di tích.',
        },
        {
          question: 'Có bao gồm thuyền sông Hương không?',
          answer:
            'Có trong chương trình tiêu chuẩn, tùy điều kiện vận hành và thời tiết.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Đà Nẵng',
      slug: 'da-nang',
      region: 'Miền Trung',
      description:
        'Thành phố biển năng động với Mỹ Khê, Sơn Trà, Bà Nà Hills và vị trí thuận tiện kết nối Huế - Hội An.',
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
          description:
            'Đón khách, tham quan Sơn Trà, nhận phòng và tự do tắm biển Mỹ Khê.',
          accommodation: 'Khách sạn Đà Nẵng theo gói',
          transport: 'Xe du lịch',
          activities: ['Bán đảo Sơn Trà', 'Biển Mỹ Khê', 'Cầu Rồng buổi tối'],
          imageUrl: IMAGES.daNang[0],
        },
        {
          title: 'Bà Nà Hills',
          description:
            'Di chuyển lên Bà Nà Hills, tham quan Cầu Vàng, làng Pháp và các khu vui chơi theo chương trình.',
          accommodation: 'Khách sạn Đà Nẵng theo gói',
          transport: 'Xe du lịch và cáp treo',
          activities: ['Bà Nà Hills', 'Cầu Vàng', 'Làng Pháp'],
          imageUrl: IMAGES.daNang[1],
        },
        {
          title: 'Tự do mua sắm - Tiễn khách',
          description:
            'Ăn sáng, tự do mua đặc sản và tiễn khách tại sân bay/ga Đà Nẵng.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.daNang[2],
        },
      ],
      faqs: [
        {
          question: 'Vé Bà Nà Hills đã bao gồm chưa?',
          answer:
            'Tùy gói. Seed này cho phép phân biệt rõ gói tiêu chuẩn và gói nâng cấp.',
        },
        {
          question: 'Tour có phù hợp gia đình có trẻ nhỏ không?',
          answer:
            'Có. Lịch trình phổ biến, dịch vụ dễ tiếp cận và thời gian di chuyển không quá dài.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Hội An',
      slug: 'hoi-an',
      region: 'Miền Trung',
      description:
        'Phố cổ di sản nổi tiếng với đèn lồng, kiến trúc giao thương, làng nghề, rừng dừa và ẩm thực địa phương.',
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
          description:
            'Đón khách, trải nghiệm rừng dừa, nhận phòng và dạo phố cổ Hội An buổi tối.',
          accommodation: 'Khách sạn Hội An theo gói',
          transport: 'Xe du lịch và thuyền thúng',
          activities: [
            'Rừng dừa Bảy Mẫu',
            'Phố cổ Hội An',
            'Đèn lồng buổi tối',
          ],
          imageUrl: IMAGES.hoiAn[0],
        },
        {
          title: 'Làng nghề - Tiễn khách',
          description:
            'Tham quan làng nghề, mua quà địa phương và kết thúc chương trình.',
          transport: 'Xe du lịch',
          activities: ['Làng nghề Hội An', 'Ẩm thực địa phương', 'Tiễn khách'],
          imageUrl: IMAGES.hoiAn[1],
        },
      ],
      faqs: [
        {
          question: 'Tour có nhiều thời gian tự do không?',
          answer:
            'Có. Buổi tối tại phố cổ được thiết kế thoáng để khách tự do ăn uống, chụp ảnh và mua sắm.',
        },
        {
          question: 'Có thể khởi hành từ Đà Nẵng không?',
          answer: 'Có. Điểm đón có thể là Đà Nẵng hoặc Hội An tùy lựa chọn.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Nha Trang',
      slug: 'nha-trang',
      region: 'Miền Trung',
      description:
        'Thành phố biển nổi tiếng với đảo, san hô, resort, hải sản và các hoạt động thể thao nước.',
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
          description:
            'Đón khách tại Nha Trang, nhận phòng, tự do tắm biển và thưởng thức hải sản.',
          accommodation: 'Khách sạn/resort Nha Trang theo gói',
          transport: 'Xe du lịch',
          activities: ['Đón khách Nha Trang', 'Tắm biển', 'Ẩm thực hải sản'],
          imageUrl: IMAGES.nhaTrang[0],
        },
        {
          title: 'Tour đảo - San hô',
          description:
            'Tham gia tour đảo, trải nghiệm lặn ngắm san hô hoặc hoạt động biển phù hợp thời tiết.',
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
        {
          question: 'Hoạt động lặn có bắt buộc không?',
          answer:
            'Không. Khách có thể chọn ngồi tàu, tắm biển hoặc tham gia hoạt động nhẹ hơn.',
        },
        {
          question: 'Tour có phù hợp mùa mưa không?',
          answer:
            'Có thể đi, nhưng lịch đảo phụ thuộc thời tiết biển. Đội điều hành sẽ tư vấn trước ngày khởi hành.',
        },
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
      description:
        'Thành phố cao nguyên nổi tiếng với khí hậu mát mẻ, hồ Tuyền Lâm, rừng thông, vườn hoa, nông trại và không gian nghỉ dưỡng lãng mạn.',
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
          description:
            'Đón khách tại Đà Lạt, tham quan hồ Tuyền Lâm, rừng thông và nhận phòng nghỉ ngơi trước khi tự do khám phá trung tâm buổi tối.',
          accommodation: 'Khách sạn Đà Lạt theo gói',
          transport: 'Xe du lịch',
          activities: ['Hồ Tuyền Lâm', 'Rừng thông', 'Chợ đêm Đà Lạt'],
          imageUrl: IMAGES.daLat[0],
        },
        {
          title: 'Vườn hoa - Nông trại - Cà phê ngắm cảnh',
          description:
            'Tham quan các điểm nông trại, vườn hoa theo mùa, dùng bữa trưa địa phương và dừng tại quán cà phê có tầm nhìn cao nguyên.',
          accommodation: 'Khách sạn Đà Lạt theo gói',
          transport: 'Xe du lịch',
          activities: ['Vườn hoa', 'Nông trại', 'Cà phê ngắm cảnh'],
          imageUrl: IMAGES.daLat[1],
        },
        {
          title: 'Mua đặc sản - Tiễn khách',
          description:
            'Tự do mua đặc sản, cà phê, mứt Đà Lạt và tiễn khách tại sân bay hoặc bến xe.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.daLat[2],
        },
      ],
      faqs: [
        {
          question: 'Đà Lạt có cần chuẩn bị áo ấm không?',
          answer:
            'Có. Buổi tối và sáng sớm thường lạnh, khách nên mang áo khoác nhẹ.',
        },
        {
          question: 'Tour có phù hợp gia đình có trẻ nhỏ không?',
          answer:
            'Có. Lịch trình nhẹ, thời gian di chuyển giữa các điểm không quá dài.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Phú Quốc',
      slug: 'phu-quoc',
      region: 'Miền Nam',
      description:
        'Đảo nghỉ dưỡng nổi tiếng với bãi biển, hoàng hôn, hải sản, cáp treo Hòn Thơm, làng chài và các khu vui chơi biển đảo.',
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
          description:
            'Đón khách tại sân bay Phú Quốc, nhận phòng, tự do tắm biển và dùng bữa tối hải sản.',
          accommodation: 'Khách sạn/resort Phú Quốc theo gói',
          transport: 'Xe du lịch',
          activities: ['Đón khách Phú Quốc', 'Tắm biển', 'Hải sản địa phương'],
          imageUrl: IMAGES.phuQuoc[0],
        },
        {
          title: 'Nam Đảo - Làng chài - Hoàng hôn',
          description:
            'Khám phá các điểm nổi bật khu Nam Đảo, ghé làng chài, mua đặc sản và ngắm hoàng hôn ven biển.',
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
        {
          question: 'Tour có bao gồm vé vui chơi không?',
          answer:
            'Tùy gói. Gói cao cấp có thể bao gồm hoặc hỗ trợ đặt vé trước.',
        },
        {
          question: 'Nên đi Phú Quốc mùa nào?',
          answer:
            'Mùa khô thường thuận lợi hơn cho hoạt động biển, nhưng lịch tour vẫn phụ thuộc tình hình thời tiết thực tế.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Mũi Né',
      slug: 'mui-ne',
      region: 'Miền Nam',
      description:
        'Điểm đến biển của Bình Thuận nổi bật với đồi cát, làng chài, suối Tiên, resort ven biển và các hoạt động ngắm bình minh.',
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
          description:
            'Khởi hành từ TP.HCM, đến Mũi Né nhận phòng, tham quan suối Tiên và tự do tắm biển.',
          accommodation: 'Khách sạn/resort Mũi Né theo gói',
          transport: 'Xe du lịch',
          activities: ['Di chuyển TP.HCM - Mũi Né', 'Suối Tiên', 'Tắm biển'],
          imageUrl: IMAGES.muiNe[0],
        },
        {
          title: 'Đồi cát - Làng chài - Trở về',
          description:
            'Dậy sớm ngắm bình minh trên đồi cát, ghé làng chài, dùng bữa trưa và trở về TP.HCM.',
          transport: 'Xe du lịch',
          activities: ['Đồi cát Mũi Né', 'Làng chài', 'Trở về TP.HCM'],
          imageUrl: IMAGES.muiNe[1],
        },
      ],
      faqs: [
        {
          question: 'Có cần dậy sớm để đi đồi cát không?',
          answer:
            'Có. Bình minh là thời điểm đẹp và mát nhất để tham quan đồi cát.',
        },
        {
          question: 'Tour có phù hợp đi cuối tuần không?',
          answer:
            'Có. Đây là tour ngắn ngày, phù hợp khách xuất phát từ TP.HCM.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Quy Nhơn',
      slug: 'quy-nhon',
      region: 'Miền Trung',
      description:
        'Thành phố biển Bình Định nổi tiếng với Kỳ Co, Eo Gió, làng chài, bãi biển xanh và nhịp nghỉ dưỡng yên tĩnh hơn các đô thị biển lớn.',
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
          description:
            'Đón khách tại Quy Nhơn, nhận phòng, tham quan bãi biển trung tâm và thưởng thức hải sản.',
          accommodation: 'Khách sạn Quy Nhơn theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Đón khách Quy Nhơn',
            'Biển trung tâm',
            'Hải sản Bình Định',
          ],
          imageUrl: IMAGES.quyNhon[0],
        },
        {
          title: 'Kỳ Co - Eo Gió',
          description:
            'Khám phá Kỳ Co, Eo Gió, chụp ảnh ven biển và dùng bữa trưa theo chương trình.',
          accommodation: 'Khách sạn Quy Nhơn theo gói',
          transport: 'Xe du lịch và cano/tàu theo điều kiện',
          activities: ['Kỳ Co', 'Eo Gió', 'Làng chài'],
          imageUrl: IMAGES.quyNhon[1],
        },
        {
          title: 'Tự do mua đặc sản - Tiễn khách',
          description:
            'Tự do mua đặc sản Bình Định và tiễn khách tại sân bay/ga.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.quyNhon[2],
        },
      ],
      faqs: [
        {
          question: 'Kỳ Co có phụ thuộc thời tiết biển không?',
          answer:
            'Có. Nếu biển động, đội điều hành sẽ đổi sang điểm tham quan phù hợp và an toàn hơn.',
        },
        {
          question: 'Tour có nhiều thời gian tắm biển không?',
          answer:
            'Có. Lịch trình có thời gian tự do tại bãi biển và khách sạn.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Phú Yên',
      slug: 'phu-yen',
      region: 'Miền Trung',
      description:
        'Vùng biển miền Trung nổi bật với Gành Đá Đĩa, Bãi Xép, Mũi Điện, tháp Nghinh Phong và nhịp du lịch còn nguyên vẻ mộc mạc.',
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
          description:
            'Đón khách tại Tuy Hòa, tham quan Bãi Xép, tháp Nghinh Phong và dùng bữa tối địa phương.',
          accommodation: 'Khách sạn Tuy Hòa theo gói',
          transport: 'Xe du lịch',
          activities: ['Bãi Xép', 'Tháp Nghinh Phong', 'Ẩm thực Phú Yên'],
          imageUrl: IMAGES.phuYen[0],
        },
        {
          title: 'Gành Đá Đĩa - Mũi Điện',
          description:
            'Khám phá Gành Đá Đĩa, Mũi Điện, các điểm biển ven đường và nghỉ đêm tại Tuy Hòa.',
          accommodation: 'Khách sạn Tuy Hòa theo gói',
          transport: 'Xe du lịch',
          activities: ['Gành Đá Đĩa', 'Mũi Điện', 'Biển Phú Yên'],
          imageUrl: IMAGES.phuYen[1],
        },
        {
          title: 'Mua đặc sản - Tiễn khách',
          description:
            'Tự do mua đặc sản, cà phê sáng và tiễn khách tại sân bay/ga Tuy Hòa.',
          transport: 'Xe du lịch',
          activities: ['Mua đặc sản', 'Tiễn khách'],
          imageUrl: IMAGES.phuYen[2],
        },
      ],
      faqs: [
        {
          question: 'Tour Phú Yên có nhiều điểm chụp ảnh không?',
          answer:
            'Có. Các điểm như Gành Đá Đĩa, Bãi Xép, Mũi Điện đều phù hợp chụp ảnh phong cảnh.',
        },
        {
          question: 'Có phù hợp khách lớn tuổi không?',
          answer:
            'Có, nhưng một số điểm ven biển cần đi bộ nhẹ nên khách nên mang giày thoải mái.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Cần Thơ',
      slug: 'can-tho',
      region: 'Miền Nam',
      description:
        'Trung tâm miền Tây nổi tiếng với chợ nổi Cái Răng, sông nước, vườn trái cây, bến Ninh Kiều và ẩm thực Nam Bộ.',
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
          description:
            'Khởi hành đi Cần Thơ, nhận phòng, tham quan điểm miệt vườn hoặc nhà cổ và dạo bến Ninh Kiều.',
          accommodation: 'Khách sạn Cần Thơ theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Di chuyển TP.HCM - Cần Thơ',
            'Miệt vườn',
            'Bến Ninh Kiều',
          ],
          imageUrl: IMAGES.canTho[0],
        },
        {
          title: 'Chợ nổi Cái Răng - Trở về',
          description:
            'Dậy sớm đi thuyền chợ nổi Cái Răng, ăn sáng kiểu miền Tây, mua đặc sản và trở về.',
          transport: 'Xe du lịch và thuyền',
          activities: ['Chợ nổi Cái Răng', 'Ăn sáng trên sông', 'Trở về'],
          imageUrl: IMAGES.canTho[1],
        },
      ],
      faqs: [
        {
          question: 'Vì sao phải đi chợ nổi từ sáng sớm?',
          answer:
            'Chợ nổi nhộn nhịp nhất vào sáng sớm, nếu đi muộn trải nghiệm sẽ kém hơn.',
        },
        {
          question: 'Tour có say sóng không?',
          answer:
            'Hoạt động thuyền chủ yếu trên sông, thường êm hơn biển nhưng khách nhạy cảm vẫn nên chuẩn bị thuốc cá nhân.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'TP.HCM',
      slug: 'tp-ho-chi-minh',
      region: 'Miền Nam',
      description:
        'Đô thị năng động với các công trình lịch sử, phố đi bộ, chợ Bến Thành, ẩm thực đường phố và tuyến tham quan Củ Chi.',
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
          description:
            'Đón khách, tham quan các công trình trung tâm, chợ Bến Thành hoặc phố đi bộ và thưởng thức ẩm thực địa phương.',
          accommodation: 'Khách sạn TP.HCM theo gói',
          transport: 'Xe du lịch',
          activities: ['Dinh Độc Lập', 'Bưu điện Thành phố', 'Chợ Bến Thành'],
          imageUrl: IMAGES.hoChiMinh[0],
        },
        {
          title: 'Địa đạo Củ Chi - Tiễn khách',
          description:
            'Di chuyển đến Củ Chi, tìm hiểu hệ thống địa đạo, dùng bữa trưa và tiễn khách tại trung tâm hoặc sân bay.',
          transport: 'Xe du lịch',
          activities: ['Địa đạo Củ Chi', 'Ăn trưa', 'Tiễn khách'],
          imageUrl: IMAGES.hoChiMinh[1],
        },
      ],
      faqs: [
        {
          question: 'Các điểm trung tâm có phụ thuộc lịch mở cửa không?',
          answer:
            'Có. Nếu một điểm đóng cửa hoặc bảo trì, hướng dẫn viên sẽ điều chỉnh điểm thay thế phù hợp.',
        },
        {
          question: 'Tour Củ Chi có cần đi bộ nhiều không?',
          answer:
            'Có đi bộ nhẹ trong khu tham quan, khách nên mang giày thoải mái.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Mộc Châu',
      slug: 'moc-chau',
      region: 'Miền Bắc',
      description:
        'Cao nguyên Sơn La nổi bật với đồi chè, thung lũng hoa, thác nước, khí hậu mát và các bản làng dân tộc Tây Bắc.',
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
          description:
            'Khởi hành từ Hà Nội, đến Mộc Châu tham quan đồi chè, điểm hoa theo mùa và nghỉ đêm.',
          accommodation: 'Khách sạn/homestay Mộc Châu',
          transport: 'Xe du lịch',
          activities: [
            'Di chuyển Hà Nội - Mộc Châu',
            'Đồi chè',
            'Ẩm thực Tây Bắc',
          ],
          imageUrl: IMAGES.mocChau[0],
        },
        {
          title: 'Thác Dải Yếm - Bản làng - Trở về',
          description:
            'Tham quan thác Dải Yếm hoặc bản làng, mua đặc sản sữa, chè và trở về Hà Nội.',
          transport: 'Xe du lịch',
          activities: ['Thác Dải Yếm', 'Bản làng', 'Trở về Hà Nội'],
          imageUrl: IMAGES.mocChau[1],
        },
      ],
      faqs: [
        {
          question: 'Mộc Châu mùa nào đẹp?',
          answer:
            'Mỗi mùa có cảnh riêng: mùa hoa, mùa mận, mùa chè xanh. Seed này phù hợp chạy quanh năm.',
        },
        {
          question: 'Tour có phù hợp trẻ em không?',
          answer: 'Có, nhưng gia đình nên chuẩn bị áo khoác và giày dễ đi.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Mai Châu',
      slug: 'mai-chau',
      region: 'Miền Bắc',
      description:
        'Thung lũng Hòa Bình yên bình với ruộng lúa, bản Lác, nhà sàn, văn hóa Thái và các cung đường đạp xe nhẹ giữa làng bản.',
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
          description:
            'Khởi hành từ Hà Nội, đến Mai Châu dùng bữa trưa, nhận phòng và dạo bản Lác.',
          accommodation: 'Nhà sàn/homestay Mai Châu theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Di chuyển Hà Nội - Mai Châu',
            'Bản Lác',
            'Ẩm thực địa phương',
          ],
          imageUrl: IMAGES.maiChau[0],
        },
        {
          title: 'Thung lũng Mai Châu - Trở về',
          description:
            'Tự do đạp xe hoặc đi bộ quanh thung lũng, mua quà địa phương và trở về Hà Nội.',
          transport: 'Xe du lịch',
          activities: ['Đạp xe nhẹ', 'Thung lũng lúa', 'Trở về Hà Nội'],
          imageUrl: IMAGES.maiChau[1],
        },
      ],
      faqs: [
        {
          question: 'Tour Mai Châu có nghỉ nhà sàn không?',
          answer:
            'Có thể chọn nhà sàn/homestay hoặc khách sạn tùy gói dịch vụ.',
        },
        {
          question: 'Có bắt buộc đạp xe không?',
          answer:
            'Không. Khách có thể đi bộ nhẹ quanh bản nếu không muốn đạp xe.',
        },
      ],
    },
  },
  {
    destination: {
      name: 'Cao Bằng',
      slug: 'cao-bang',
      region: 'Miền Bắc',
      description:
        'Vùng Đông Bắc nổi tiếng với thác Bản Giốc, suối Lê Nin, động Ngườm Ngao, núi non biên giới và bản làng yên bình.',
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
          description:
            'Khởi hành từ Hà Nội đi Cao Bằng, dừng nghỉ trên đường, nhận phòng và dùng bữa tối địa phương.',
          accommodation: 'Khách sạn Cao Bằng theo gói',
          transport: 'Xe du lịch',
          activities: ['Di chuyển Hà Nội - Cao Bằng', 'Ẩm thực địa phương'],
          imageUrl: IMAGES.caoBang[0],
        },
        {
          title: 'Thác Bản Giốc - Động Ngườm Ngao',
          description:
            'Tham quan thác Bản Giốc, động Ngườm Ngao và các điểm cảnh quan khu vực Trùng Khánh.',
          accommodation: 'Khách sạn Cao Bằng theo gói',
          transport: 'Xe du lịch',
          activities: [
            'Thác Bản Giốc',
            'Động Ngườm Ngao',
            'Cảnh quan Trùng Khánh',
          ],
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
        {
          question: 'Cao Bằng di chuyển có xa không?',
          answer:
            'Có. Tour được thiết kế 3 ngày 2 đêm để giảm áp lực di chuyển và có thời gian nghỉ hợp lý.',
        },
        {
          question: 'Thác Bản Giốc mùa nào đẹp?',
          answer:
            'Mùa nước nhiều thường ấn tượng hơn, nhưng lịch trình vẫn có thể chạy quanh năm tùy thời tiết.',
        },
      ],
    },
  },
];

const TOUR_TICKET_POLICIES: Record<string, TicketPolicy> = {
  'VN-HAN-001': {
    included: ['Vé Văn Miếu hoặc Hoàng thành theo lịch trình'],
    optional: ['Vé xem múa rối nước'],
  },
  'VN-HLG-002': {
    included: ['Vé thắng cảnh vịnh Hạ Long', 'Kayak hoặc thuyền nan theo gói'],
    optional: ['Đồ uống trên du thuyền', 'Phụ thu nâng hạng cabin'],
  },
  'VN-NBI-003': {
    included: ['Vé Tràng An', 'Vé Hang Múa', 'Vé cố đô Hoa Lư'],
    optional: ['Xe điện trong khu tham quan nếu phát sinh'],
  },
  'VN-SPA-004': {
    included: ['Vé bản Cát Cát theo lịch trình'],
    optional: ['Vé cáp treo Fansipan theo hạng vé tại thời điểm đặt'],
  },
  'VN-HGI-005': {
    included: [
      'Vé tham quan các điểm trên cung Hà Giang',
      'Thuyền sông Nho Quế theo chương trình',
    ],
    optional: ['Phụ thu xe máy tự lái hoặc porter nếu khách yêu cầu'],
  },
  'VN-QBI-006': {
    included: ['Vé động Phong Nha hoặc động Thiên Đường theo lịch trình'],
    optional: ['Zipline, kayak hoặc trò chơi Sông Chày - Hang Tối'],
  },
  'VN-HUE-007': {
    included: [
      'Vé Đại Nội hoặc lăng tẩm theo chương trình',
      'Thuyền rồng sông Hương theo lịch trình',
    ],
  },
  'VN-DAD-008': {
    included: ['Vé tham quan Sơn Trà và Ngũ Hành Sơn theo lịch trình'],
    optional: ['Vé cáp treo Bà Nà Hills nếu không ghi rõ trong gói đã chọn'],
  },
  'VN-HANQ-009': {
    included: [
      'Vé phố cổ Hội An hoặc điểm làng nghề theo lịch trình',
      'Thuyền thúng rừng dừa theo gói',
    ],
    optional: ['Vé show Ký Ức Hội An'],
  },
  'VN-NTR-010': {
    included: [
      'Tàu hoặc cano tham quan đảo theo lịch trình',
      'Vé khu bảo tồn biển theo tuyến',
    ],
    optional: ['Lặn bình khí hoặc sea walking'],
  },
  'VN-DLI-011': {
    included: ['Vé nông trại hoặc điểm tham quan Đà Lạt theo lịch trình'],
    optional: ['Máng trượt, xe jeep hoặc trò chơi ngoài chương trình'],
  },
  'VN-PQC-012': {
    included: ['Vé tham quan Nam Đảo theo lịch trình'],
    optional: ['Vé cáp treo Hòn Thơm', 'Vé VinWonders hoặc Safari Phú Quốc'],
  },
  'VN-MNE-013': {
    included: ['Vé đồi cát hoặc điểm tham quan Mũi Né theo lịch trình'],
    optional: ['Xe jeep đồi cát bình minh'],
  },
  'VN-UIH-014': {
    included: [
      'Cano Kỳ Co theo điều kiện thời tiết',
      'Vé Eo Gió theo lịch trình',
    ],
    optional: ['Lặn ngắm san hô nâng cấp'],
  },
  'VN-TBB-015': {
    included: ['Vé Gành Đá Đĩa', 'Vé Mũi Điện theo lịch trình'],
    optional: ['Xe điện hoặc dịch vụ chụp ảnh ngoài chương trình'],
  },
  'VN-VCA-016': {
    included: ['Thuyền chợ nổi Cái Răng', 'Vé miệt vườn theo lịch trình'],
    optional: ['Trải nghiệm làm bánh hoặc đờn ca tài tử riêng'],
  },
  'VN-SGN-017': {
    included: [
      'Vé Dinh Độc Lập hoặc bảo tàng theo điều kiện mở cửa',
      'Vé địa đạo Củ Chi',
    ],
  },
  'VN-MOC-018': {
    included: [
      'Vé thác Dải Yếm hoặc điểm hoa theo mùa',
      'Vé điểm check-in đồi chè theo lịch trình',
    ],
    optional: ['Vé cầu kính hoặc trò chơi ngoài chương trình'],
  },
  'VN-MAI-019': {
    included: ['Phí tham quan bản Lác hoặc bản làng theo lịch trình'],
    optional: ['Thuê xe đạp, xe điện hoặc chương trình văn nghệ riêng'],
  },
  'VN-CBG-020': {
    included: [
      'Vé thác Bản Giốc',
      'Vé động Ngườm Ngao',
      'Vé khu di tích Pác Bó theo lịch trình',
    ],
    optional: ['Thuyền chân thác Bản Giốc nếu khách chọn'],
  },
};

const DEFAULT_DOMESTIC_TRANSPORT: DomesticTransportSeed = {
  type: TransportType.BUS,
  vehicleType: 'Xe du lịch 29-45 chỗ',
  vehicleTypeEn: '29-45 seat tour coach',
  operator: 'Xe điều hành công ty',
  operatorEn: 'Company-operated coach',
  notes:
    'Xe đón tại điểm tập trung đã thông báo. Quý khách có mặt trước 15 phút.',
  notesEn:
    'Pick-up at the designated meeting point. Please arrive 15 minutes early.',
};

const TOUR_TRANSPORTS: Record<string, DomesticTransportSeed> = {
  'VN-HAN-001': {
    type: TransportType.PRIVATE_CAR,
    vehicleType: 'Xe 16-29 chỗ nội đô',
    vehicleTypeEn: '16-29 seat city coach',
    operator: 'Đội xe nội đô Hà Nội',
    operatorEn: 'Hanoi city fleet',
    notes:
      'Lộ trình nội đô có kết hợp đi bộ trong phố cổ. Điểm đón có thể điều chỉnh theo tình hình giao thông.',
    notesEn:
      'City route with walking time in the Old Quarter. Pick-up may be adjusted for traffic.',
  },
  'VN-HLG-002': {
    type: TransportType.COMBO,
    vehicleType: 'Xe limousine/xe du lịch + du thuyền',
    vehicleTypeEn: 'Limousine or coach plus cruise',
    operator: 'Đối tác du thuyền Hạ Long',
    operatorEn: 'Ha Long cruise partner',
    notes:
      'Bao gồm xe Hà Nội - Hạ Long và du thuyền theo hạng gói. Giờ tàu phụ thuộc điều phối cảng vụ.',
    notesEn:
      'Includes Hanoi - Ha Long transfer and cruise by package class. Cruise timing depends on port authority.',
  },
  'VN-NBI-003': {
    type: TransportType.BUS,
    vehicleType: 'Xe du lịch 29-45 chỗ',
    vehicleTypeEn: '29-45 seat tour coach',
    operator: 'Xe tuyến Hà Nội - Ninh Bình',
    operatorEn: 'Hanoi - Ninh Binh coach',
    notes: 'Có thuyền chèo tay tại Tràng An theo chương trình.',
    notesEn: 'Trang An rowing boat is included according to the itinerary.',
  },
  'VN-SPA-004': {
    type: TransportType.COMBO,
    vehicleType: 'Xe limousine giường nằm/xe du lịch + cáp treo tùy gói',
    vehicleTypeEn: 'Sleeper limousine or coach plus optional cable car',
    operator: 'Đối tác vận chuyển Tây Bắc',
    operatorEn: 'Northwest transport partner',
    notes:
      'Chặng Hà Nội - Sapa đi bằng limousine hoặc xe du lịch. Vé Fansipan xác nhận theo gói khách chọn.',
    notesEn:
      'Hanoi - Sapa by limousine or coach. Fansipan ticket is confirmed by selected package.',
  },
  'VN-HGI-005': {
    type: TransportType.COMBO,
    vehicleType: 'Xe du lịch + xe trung chuyển địa phương',
    vehicleTypeEn: 'Tour coach plus local shuttle',
    operator: 'Đối tác vận hành Hà Giang',
    operatorEn: 'Ha Giang local operator',
    notes:
      'Một số cung đường đèo sử dụng xe trung chuyển phù hợp địa hình; không mặc định xe máy tự lái.',
    notesEn:
      'Some mountain passes use terrain-suitable local shuttles; self-drive motorbike is not the default.',
  },
  'VN-QBI-006': {
    type: TransportType.PRIVATE_CAR,
    vehicleType: 'Xe du lịch địa phương 16-29 chỗ',
    vehicleTypeEn: '16-29 seat local coach',
    operator: 'Đội xe Đồng Hới',
    operatorEn: 'Dong Hoi local fleet',
    notes:
      'Đón tại Đồng Hới; lịch hang động có thể thay đổi theo thời tiết và điều kiện khai thác.',
    notesEn:
      'Pick-up in Dong Hoi; cave schedule may change due to weather and site operations.',
  },
  'VN-HUE-007': {
    type: TransportType.COMBO,
    vehicleType: 'Xe du lịch + thuyền rồng',
    vehicleTypeEn: 'Tour coach plus dragon boat',
    operator: 'Đối tác vận chuyển Huế',
    operatorEn: 'Hue transport partner',
    notes: 'Có thuyền rồng sông Hương khi điều kiện vận hành cho phép.',
    notesEn:
      'Perfume River dragon boat is arranged when operating conditions allow.',
  },
  'VN-DAD-008': {
    type: TransportType.COMBO,
    vehicleType: 'Xe du lịch + cáp treo theo gói',
    vehicleTypeEn: 'Tour coach plus package-based cable car',
    operator: 'Đội xe Đà Nẵng',
    operatorEn: 'Da Nang local fleet',
    notes:
      'Vé cáp treo Bà Nà xác nhận theo gói và tình trạng mở bán tại thời điểm đặt.',
    notesEn:
      'Ba Na Hills cable car ticket is confirmed by package and ticket availability at booking time.',
  },
  'VN-HANQ-009': {
    type: TransportType.COMBO,
    vehicleType: 'Xe du lịch + thuyền thúng',
    vehicleTypeEn: 'Tour coach plus basket boat',
    operator: 'Đối tác Hội An',
    operatorEn: 'Hoi An local partner',
    notes:
      'Bao gồm di chuyển Đà Nẵng - Hội An và thuyền thúng khi lịch trình có rừng dừa.',
    notesEn:
      'Includes Da Nang - Hoi An transfer and basket boat when coconut forest is scheduled.',
  },
  'VN-NTR-010': {
    type: TransportType.COMBO,
    vehicleType: 'Xe du lịch + tàu/cano biển đảo',
    vehicleTypeEn: 'Tour coach plus island boat or speedboat',
    operator: 'Đối tác tàu biển Nha Trang',
    operatorEn: 'Nha Trang marine partner',
    notes:
      'Tuyến đảo phụ thuộc thời tiết biển; có thể đổi sang điểm tham quan thay thế khi cảng vụ hạn chế tàu.',
    notesEn:
      'Island route depends on sea conditions; alternatives may be used if port authority restricts boats.',
  },
  'VN-DLI-011': {
    type: TransportType.PRIVATE_CAR,
    vehicleType: 'Xe du lịch 16-29 chỗ',
    vehicleTypeEn: '16-29 seat tour coach',
    operator: 'Đội xe Đà Lạt',
    operatorEn: 'Da Lat local fleet',
    notes:
      'Lịch trình có nhiều điểm dừng ngắn; xe chờ theo khung giờ đã xác nhận.',
    notesEn:
      'The itinerary has multiple short stops; vehicle waits according to confirmed timing.',
  },
  'VN-PQC-012': {
    type: TransportType.PRIVATE_CAR,
    vehicleType: 'Xe du lịch Phú Quốc 16-29 chỗ',
    vehicleTypeEn: '16-29 seat Phu Quoc coach',
    operator: 'Đối tác vận chuyển Phú Quốc',
    operatorEn: 'Phu Quoc transport partner',
    notes:
      'Đón tại Phú Quốc; vé vui chơi Nam Đảo, cáp treo hoặc show hoàng hôn xác nhận theo gói.',
    notesEn:
      'Pick-up in Phu Quoc; South Island attractions, cable car, or sunset show are confirmed by package.',
  },
  'VN-MNE-013': {
    type: TransportType.BUS,
    vehicleType: 'Xe du lịch/limousine TP.HCM - Mũi Né',
    vehicleTypeEn: 'Ho Chi Minh City - Mui Ne coach or limousine',
    operator: 'Đối tác tuyến Phan Thiết - Mũi Né',
    operatorEn: 'Phan Thiet - Mui Ne transport partner',
    notes:
      'Xe đi từ TP.HCM; jeep đồi cát là dịch vụ tùy chọn nếu khách muốn đi khung giờ bình minh.',
    notesEn:
      'Transfer departs from Ho Chi Minh City; sand dune jeep is optional for sunrise timing.',
  },
  'VN-UIH-014': {
    type: TransportType.COMBO,
    vehicleType: 'Xe du lịch + cano Kỳ Co',
    vehicleTypeEn: 'Tour coach plus Ky Co speedboat',
    operator: 'Đối tác biển đảo Quy Nhơn',
    operatorEn: 'Quy Nhon marine partner',
    notes:
      'Cano Kỳ Co phụ thuộc thời tiết biển; nếu biển động sẽ đổi lịch hoặc điểm tham quan phù hợp.',
    notesEn:
      'Ky Co speedboat depends on sea conditions; route may change if the sea is rough.',
  },
  'VN-TBB-015': {
    type: TransportType.PRIVATE_CAR,
    vehicleType: 'Xe du lịch Phú Yên 16-29 chỗ',
    vehicleTypeEn: '16-29 seat Phu Yen coach',
    operator: 'Đội xe Tuy Hòa',
    operatorEn: 'Tuy Hoa local fleet',
    notes:
      'Lộ trình nhiều điểm ven biển; thời gian Mũi Điện có thể điều chỉnh theo thời tiết.',
    notesEn:
      'Coastal itinerary with several stops; Mui Dien timing may adjust for weather.',
  },
  'VN-VCA-016': {
    type: TransportType.COMBO,
    vehicleType: 'Xe du lịch + thuyền chợ nổi',
    vehicleTypeEn: 'Tour coach plus floating market boat',
    operator: 'Đối tác Mekong',
    operatorEn: 'Mekong local partner',
    notes:
      'Thuyền chợ nổi khởi hành sớm; khách cần có mặt đúng giờ để không lỡ phiên chợ.',
    notesEn:
      'Floating market boat leaves early; guests should arrive on time for the market session.',
  },
  'VN-SGN-017': {
    type: TransportType.PRIVATE_CAR,
    vehicleType: 'Xe du lịch nội đô và Củ Chi',
    vehicleTypeEn: 'City and Cu Chi tour coach',
    operator: 'Đội xe TP.HCM',
    operatorEn: 'Ho Chi Minh City fleet',
    notes:
      'Một số điểm trung tâm phụ thuộc lịch mở cửa; xe điều chỉnh tuyến theo tình hình giao thông.',
    notesEn:
      'Some city attractions depend on opening hours; vehicle route may adjust for traffic.',
  },
  'VN-MOC-018': {
    type: TransportType.BUS,
    vehicleType: 'Xe du lịch Hà Nội - Mộc Châu',
    vehicleTypeEn: 'Hanoi - Moc Chau tour coach',
    operator: 'Đối tác tuyến Tây Bắc',
    operatorEn: 'Northwest route partner',
    notes:
      'Có các điểm dừng nghỉ trên cung đường đèo; điểm hoa thay đổi theo mùa.',
    notesEn:
      'Rest stops are arranged on mountain roads; flower sites vary by season.',
  },
  'VN-MAI-019': {
    type: TransportType.BUS,
    vehicleType: 'Xe du lịch Hà Nội - Mai Châu',
    vehicleTypeEn: 'Hanoi - Mai Chau tour coach',
    operator: 'Đối tác tuyến Hòa Bình',
    operatorEn: 'Hoa Binh route partner',
    notes:
      'Xe đón tại Hà Nội; xe đạp quanh bản là dịch vụ tùy chọn theo nhu cầu.',
    notesEn: 'Pick-up in Hanoi; village cycling is optional on request.',
  },
  'VN-CBG-020': {
    type: TransportType.BUS,
    vehicleType: 'Xe du lịch Hà Nội - Cao Bằng',
    vehicleTypeEn: 'Hanoi - Cao Bang tour coach',
    operator: 'Đối tác tuyến Đông Bắc',
    operatorEn: 'Northeast route partner',
    notes:
      'Cung đường dài có điểm nghỉ định kỳ; thuyền chân thác Bản Giốc xác nhận theo mực nước và quy định địa phương.',
    notesEn:
      'Long route with scheduled rest stops; Ban Gioc boat is confirmed by water level and local rules.',
  },
};

const vungTauDestination: DomesticTourSeed['destination'] = {
  name: 'Vũng Tàu',
  slug: 'vung-tau',
  region: 'Miền Nam',
  description:
    'Thành phố biển gần TP.HCM, nổi bật với Bãi Sau, hải đăng, Bạch Dinh, hải sản, Hồ Tràm và các resort nghỉ dưỡng cuối tuần.',
  imageUrl: IMAGES.vungTau[0],
};

const tayNinhDestination: DomesticTourSeed['destination'] = {
  name: 'Tây Ninh',
  slug: 'tay-ninh',
  region: 'Miền Nam',
  description:
    'Điểm đến văn hóa - tâm linh nổi bật với Núi Bà Đen, Tòa Thánh Cao Đài, hồ Dầu Tiếng, Ma Thiên Lãnh và ẩm thực bánh tráng đặc trưng.',
  imageUrl: IMAGES.tayNinh[0],
};

const catBaDestination: DomesticTourSeed['destination'] = {
  name: 'Hải Phòng - Cát Bà',
  slug: 'hai-phong-cat-ba',
  region: 'Miền Bắc',
  description:
    'Cửa ngõ biển đảo miền Bắc với phố cảng Hải Phòng, đảo Cát Bà, vịnh Lan Hạ, rừng quốc gia và trải nghiệm kayak, trekking, hải sản.',
  imageUrl: IMAGES.catBa[0],
};

const mekongDestination: DomesticTourSeed['destination'] = {
  name: 'Miền Tây',
  slug: 'mien-tay',
  region: 'Miền Nam',
  description:
    'Không gian sông nước Mekong với chợ nổi, vườn trái cây, làng nghề, rừng tràm, nhà cổ và nhịp sống miệt vườn Nam Bộ.',
  imageUrl: IMAGES.mekong[0],
};

const newDomesticDestinationTours: DomesticTourSeed[] = [
  createGeneratedDomesticTour(vungTauDestination, {
    tourCode: 'VN-VTG-021',
    name: 'Vũng Tàu Bãi Sau - Hải Đăng - Bạch Dinh 2 Ngày 1 Đêm',
    intro:
      'Chuyến đi Vũng Tàu cuối tuần từ TP.HCM, kết hợp biển Bãi Sau, hải đăng, Bạch Dinh, hải sản và thời gian nghỉ nhẹ bên bờ biển.',
    focus:
      'biển gần thành phố, điểm check-in biểu tượng và bữa ăn hải sản địa phương',
    suitableFor:
      'gia đình, nhóm bạn và khách muốn một chuyến nghỉ ngắn từ TP.HCM',
    price: 1_950_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 85,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'TP.HCM',
    highlights: [
      'Tắm biển Bãi Sau và dạo phố biển Vũng Tàu',
      'Check-in hải đăng, Bạch Dinh và tượng Chúa Kitô theo điều kiện mở cửa',
      'Bữa ăn hải sản địa phương',
      'Lịch trình phù hợp cuối tuần từ TP.HCM',
    ],
    gallery: [...IMAGES.vungTau],
    itinerary: [
      {
        title: 'TP.HCM - Vũng Tàu - Bãi Sau',
        description:
          'Khởi hành từ TP.HCM, đến Vũng Tàu nhận phòng, dùng bữa trưa và tự do tắm biển Bãi Sau vào buổi chiều.',
        activities: [
          'Di chuyển TP.HCM - Vũng Tàu',
          'Bãi Sau',
          'Hải sản địa phương',
        ],
      },
      {
        title: 'Hải đăng - Bạch Dinh - Trở về',
        description:
          'Tham quan các điểm biểu tượng của thành phố biển, mua đặc sản và trở về TP.HCM.',
        activities: ['Hải đăng Vũng Tàu', 'Bạch Dinh', 'Mua đặc sản'],
      },
    ],
    ticketPolicy: {
      included: ['Vé Bạch Dinh hoặc điểm tham quan theo lịch trình'],
      optional: ['Vé tham quan tượng Chúa Kitô nếu điểm mở cửa và khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.BUS,
      vehicleType: 'Xe du lịch/limousine TP.HCM - Vũng Tàu',
      vehicleTypeEn: 'Ho Chi Minh City - Vung Tau coach or limousine',
      operator: 'Đối tác tuyến Vũng Tàu',
      operatorEn: 'Vung Tau route partner',
      notes:
        'Xe khởi hành từ TP.HCM; giờ về có thể điều chỉnh nhẹ theo giao thông cao tốc.',
      notesEn:
        'Transfer departs from Ho Chi Minh City; return time may adjust for highway traffic.',
    },
  }),
  createGeneratedDomesticTour(vungTauDestination, {
    tourCode: 'VN-VTG-022',
    name: 'Hồ Tràm - Bình Châu Nghỉ Dưỡng 2 Ngày 1 Đêm',
    intro:
      'Hành trình nghỉ dưỡng Hồ Tràm - Bình Châu dành cho khách muốn không gian biển yên tĩnh, resort, suối khoáng và nhịp đi chậm.',
    focus: 'resort biển, suối khoáng, hải sản và thời gian thư giãn',
    suitableFor: 'cặp đôi, gia đình và nhóm khách muốn nghỉ dưỡng cuối tuần',
    price: 2_650_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 70,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'TP.HCM',
    highlights: [
      'Nghỉ dưỡng khu vực Hồ Tràm',
      'Tham quan Bình Châu hoặc điểm thư giãn theo gói',
      'Có thời gian tự do tại resort',
      'Phù hợp khách muốn ít di chuyển',
    ],
    gallery: rotateGallery([...IMAGES.vungTau], 1),
    itinerary: [
      {
        title: 'TP.HCM - Hồ Tràm - Nhận phòng',
        description:
          'Di chuyển đến Hồ Tràm, dùng bữa trưa, nhận phòng và thư giãn tại bãi biển hoặc hồ bơi resort.',
        activities: [
          'Di chuyển TP.HCM - Hồ Tràm',
          'Nhận phòng resort',
          'Tự do nghỉ dưỡng',
        ],
      },
      {
        title: 'Bình Châu - Hải sản - Trở về',
        description:
          'Tham quan Bình Châu hoặc điểm thư giãn theo gói, dùng bữa trưa và trở về TP.HCM.',
        activities: ['Bình Châu', 'Hải sản địa phương', 'Trở về TP.HCM'],
      },
    ],
    ticketPolicy: {
      included: ['Vé điểm tham quan Bình Châu theo gói'],
      optional: ['Dịch vụ suối khoáng hoặc spa ngoài gói'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.PRIVATE_CAR,
      vehicleType: 'Xe riêng/limousine Hồ Tràm',
      vehicleTypeEn: 'Private car or limousine to Ho Tram',
      operator: 'Đối tác Hồ Tràm - Bình Châu',
      operatorEn: 'Ho Tram - Binh Chau transport partner',
      notes:
        'Xe đưa đón theo nhóm; điểm dừng có thể điều chỉnh theo resort khách chọn.',
      notesEn: 'Group transfer; stops may adjust by selected resort.',
    },
  }),
  createGeneratedDomesticTour(vungTauDestination, {
    tourCode: 'VN-VTG-023',
    name: 'Vũng Tàu City Tour & Hải Sản 1 Ngày',
    intro:
      'Tour Vũng Tàu trong ngày dành cho khách muốn đổi gió nhanh, tham quan các điểm biểu tượng và thưởng thức hải sản.',
    focus: 'city tour biển, điểm check-in và ẩm thực hải sản',
    suitableFor: 'nhóm bạn, công ty nhỏ và khách có quỹ thời gian hạn chế',
    price: 890_000,
    duration: '1 ngày',
    availableSeats: 90,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'TP.HCM',
    highlights: [
      'Đi Vũng Tàu trong ngày từ TP.HCM',
      'Tham quan hải đăng hoặc Bạch Dinh theo lịch',
      'Thưởng thức hải sản địa phương',
      'Lịch trình gọn, dễ bán cho khách cuối tuần',
    ],
    gallery: rotateGallery([...IMAGES.vungTau], 2),
    itinerary: [
      {
        title: 'TP.HCM - Vũng Tàu - City tour biển',
        description:
          'Khởi hành sớm từ TP.HCM, tham quan điểm biểu tượng, dùng bữa hải sản và có thời gian dạo biển trước khi trở về.',
        transport: 'Xe du lịch/limousine',
        activities: [
          'Bạch Dinh hoặc hải đăng',
          'Bãi Sau',
          'Hải sản địa phương',
        ],
      },
    ],
    ticketPolicy: {
      included: ['Vé điểm tham quan theo lịch trình'],
      optional: ['Chi phí tắm nước ngọt, ghế dù hoặc trò chơi biển'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.BUS,
      vehicleType: 'Xe du lịch/limousine trong ngày',
      vehicleTypeEn: 'Day-trip coach or limousine',
      operator: 'Đối tác tuyến Vũng Tàu',
      operatorEn: 'Vung Tau route partner',
      notes: 'Khởi hành sớm từ TP.HCM; khách nên có mặt trước giờ hẹn 15 phút.',
      notesEn:
        'Early departure from Ho Chi Minh City; please arrive 15 minutes early.',
    },
  }),
  createGeneratedDomesticTour(tayNinhDestination, {
    tourCode: 'VN-TNN-024',
    name: 'Tây Ninh Núi Bà Đen - Tòa Thánh Cao Đài 1 Ngày',
    intro:
      'Tour Tây Ninh trong ngày từ TP.HCM, kết hợp Núi Bà Đen, Tòa Thánh Cao Đài và các món đặc sản địa phương.',
    focus: 'tâm linh, văn hóa Cao Đài, cáp treo núi Bà Đen và ẩm thực Tây Ninh',
    suitableFor: 'khách đi lễ, gia đình và nhóm muốn chuyến đi gọn trong ngày',
    price: 1_050_000,
    duration: '1 ngày',
    availableSeats: 90,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'TP.HCM',
    highlights: [
      'Chinh phục Núi Bà Đen bằng cáp treo theo gói',
      'Tham quan Tòa Thánh Cao Đài',
      'Thưởng thức đặc sản bánh tráng, muối tôm',
      'Lịch trình 1 ngày thuận tiện từ TP.HCM',
    ],
    gallery: [...IMAGES.tayNinh],
    itinerary: [
      {
        title: 'TP.HCM - Núi Bà Đen - Tòa Thánh Cao Đài',
        description:
          'Khởi hành từ TP.HCM, tham quan Núi Bà Đen, dùng bữa trưa, ghé Tòa Thánh Cao Đài và mua đặc sản trước khi trở về.',
        transport: 'Xe du lịch và cáp treo theo gói',
        activities: ['Núi Bà Đen', 'Tòa Thánh Cao Đài', 'Đặc sản Tây Ninh'],
      },
    ],
    ticketPolicy: {
      included: [
        'Vé cáp treo Núi Bà Đen theo gói',
        'Vé điểm tham quan theo lịch trình',
      ],
      optional: ['Chi phí xe điện hoặc dịch vụ lễ riêng'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch TP.HCM - Tây Ninh + cáp treo theo gói',
      vehicleTypeEn: 'Ho Chi Minh City - Tay Ninh coach plus package cable car',
      operator: 'Đối tác tuyến Tây Ninh',
      operatorEn: 'Tay Ninh route partner',
      notes: 'Vé cáp treo xác nhận theo hạng vé tại thời điểm đặt.',
      notesEn: 'Cable car ticket is confirmed by fare class at booking time.',
    },
  }),
  createGeneratedDomesticTour(tayNinhDestination, {
    tourCode: 'VN-TNN-025',
    name: 'Tây Ninh Hồ Dầu Tiếng - Ma Thiên Lãnh 2 Ngày 1 Đêm',
    intro:
      'Phiên bản khám phá Tây Ninh dành cho khách thích cảnh hồ, núi, không gian cắm trại nhẹ và các cung đường ngoài trung tâm.',
    focus: 'thiên nhiên, hồ Dầu Tiếng, Ma Thiên Lãnh và trải nghiệm nhóm nhỏ',
    suitableFor:
      'nhóm bạn trẻ, team building nhỏ và khách thích lịch trình khám phá',
    price: 2_250_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 70,
    tourType: 'Khám Phá',
    departurePoint: 'TP.HCM',
    highlights: [
      'Ngắm hoàng hôn hồ Dầu Tiếng',
      'Khám phá Ma Thiên Lãnh theo điều kiện thời tiết',
      'Bữa tối địa phương hoặc BBQ theo gói',
      'Lịch trình khác biệt so với tour tâm linh phổ thông',
    ],
    gallery: rotateGallery([...IMAGES.tayNinh], 1),
    itinerary: [
      {
        title: 'TP.HCM - Hồ Dầu Tiếng',
        description:
          'Di chuyển đến Tây Ninh, tham quan hồ Dầu Tiếng và nghỉ đêm theo gói homestay/khách sạn.',
        activities: ['Hồ Dầu Tiếng', 'Hoàng hôn ven hồ', 'Bữa tối địa phương'],
      },
      {
        title: 'Ma Thiên Lãnh - Đặc sản - Trở về',
        description:
          'Khám phá Ma Thiên Lãnh theo điều kiện thời tiết, mua đặc sản và trở về TP.HCM.',
        activities: ['Ma Thiên Lãnh', 'Đặc sản Tây Ninh', 'Trở về TP.HCM'],
      },
    ],
    ticketPolicy: {
      included: ['Vé điểm tham quan theo lịch trình'],
      optional: ['Dịch vụ camping hoặc BBQ nâng cấp'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.PRIVATE_CAR,
      vehicleType: 'Xe du lịch/xe riêng Tây Ninh',
      vehicleTypeEn: 'Tay Ninh tour coach or private car',
      operator: 'Đối tác Tây Ninh ngoại ô',
      operatorEn: 'Outer Tay Ninh transport partner',
      notes:
        'Một số đoạn đường hồ và núi có thể đổi điểm dừng nếu thời tiết xấu.',
      notesEn: 'Lake and mountain stops may change in bad weather.',
    },
  }),
  createGeneratedDomesticTour(tayNinhDestination, {
    tourCode: 'VN-TNN-026',
    name: 'Tây Ninh Bà Đen - Chùa Gò Kén - Đặc Sản 2 Ngày 1 Đêm',
    intro:
      'Hành trình Tây Ninh nhẹ nhàng hơn, có thêm thời gian nghỉ, tham quan chùa Gò Kén, thưởng thức đặc sản và mua quà địa phương.',
    focus: 'tâm linh, văn hóa địa phương và ẩm thực đặc sản Tây Ninh',
    suitableFor: 'gia đình, đoàn khách trung niên và nhóm muốn lịch trình nhẹ',
    price: 2_150_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 75,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'TP.HCM',
    highlights: [
      'Tham quan Núi Bà Đen với nhịp chậm hơn',
      'Ghé chùa Gò Kén hoặc điểm văn hóa phù hợp',
      'Thưởng thức bánh canh Trảng Bàng, bánh tráng phơi sương',
      'Có thời gian nghỉ đêm tại Tây Ninh',
    ],
    gallery: rotateGallery([...IMAGES.tayNinh], 2),
    itinerary: [
      {
        title: 'TP.HCM - Núi Bà Đen - Nghỉ đêm Tây Ninh',
        description:
          'Di chuyển đến Tây Ninh, tham quan Núi Bà Đen và nhận phòng nghỉ ngơi sau bữa tối địa phương.',
        activities: ['Núi Bà Đen', 'Ẩm thực Tây Ninh', 'Nghỉ đêm'],
      },
      {
        title: 'Chùa Gò Kén - Đặc sản - Trở về',
        description:
          'Tham quan chùa Gò Kén hoặc điểm văn hóa địa phương, mua đặc sản và kết thúc hành trình.',
        activities: ['Chùa Gò Kén', 'Mua đặc sản', 'Trở về TP.HCM'],
      },
    ],
    ticketPolicy: {
      included: ['Vé cáp treo hoặc điểm tham quan theo gói đã chọn'],
      optional: ['Dịch vụ lễ riêng hoặc xe điện nếu phát sinh'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch + cáp treo theo gói',
      vehicleTypeEn: 'Tour coach plus package cable car',
      operator: 'Đối tác tuyến Tây Ninh',
      operatorEn: 'Tay Ninh route partner',
      notes:
        'Lịch cáp treo phụ thuộc vận hành khu du lịch và hạng vé khách chọn.',
      notesEn:
        'Cable car schedule depends on attraction operations and selected ticket class.',
    },
  }),
  createGeneratedDomesticTour(catBaDestination, {
    tourCode: 'VN-CBA-027',
    name: 'Cát Bà - Vịnh Lan Hạ - Kayak 3 Ngày 2 Đêm',
    intro:
      'Tour Hải Phòng - Cát Bà kết hợp nghỉ đảo, vịnh Lan Hạ, kayak, hải sản và nhịp đi vừa phải từ Hà Nội.',
    focus: 'biển đảo miền Bắc, kayak vịnh Lan Hạ và nghỉ đêm Cát Bà',
    suitableFor: 'nhóm bạn, gia đình và khách muốn tour biển đảo gần Hà Nội',
    price: 3_450_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 80,
    tourType: 'Khám Phá',
    departurePoint: 'Hà Nội',
    highlights: [
      'Nghỉ đêm trên đảo Cát Bà',
      'Đi tàu vịnh Lan Hạ và kayak theo thời tiết',
      'Thưởng thức hải sản Hải Phòng - Cát Bà',
      'Có thời gian tự do dạo thị trấn biển',
    ],
    gallery: [...IMAGES.catBa],
    itinerary: [
      {
        title: 'Hà Nội - Hải Phòng - Cát Bà',
        description:
          'Khởi hành từ Hà Nội, đi Hải Phòng, sang Cát Bà, nhận phòng và tự do dạo biển buổi chiều.',
        activities: [
          'Di chuyển Hà Nội - Cát Bà',
          'Nhận phòng',
          'Dạo thị trấn Cát Bà',
        ],
      },
      {
        title: 'Vịnh Lan Hạ - Kayak',
        description:
          'Đi tàu trên vịnh Lan Hạ, chèo kayak hoặc tham quan làng chài theo điều kiện thời tiết.',
        activities: ['Vịnh Lan Hạ', 'Kayak', 'Hải sản địa phương'],
      },
      {
        title: 'Cát Bà - Hải Phòng - Trở về',
        description: 'Tự do buổi sáng, mua đặc sản Hải Phòng và trở về Hà Nội.',
        activities: ['Tự do dạo biển', 'Mua đặc sản', 'Trở về Hà Nội'],
      },
    ],
    ticketPolicy: {
      included: ['Vé tàu/vịnh Lan Hạ theo lịch trình', 'Kayak theo gói'],
      optional: ['Nâng hạng tàu hoặc phòng view biển'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe Hà Nội - Hải Phòng + tàu/phà Cát Bà',
      vehicleTypeEn: 'Hanoi - Hai Phong coach plus Cat Ba ferry/boat',
      operator: 'Đối tác Cát Bà - Lan Hạ',
      operatorEn: 'Cat Ba - Lan Ha transport partner',
      notes: 'Lịch tàu/phà phụ thuộc thời tiết và điều phối bến.',
      notesEn: 'Ferry/boat schedule depends on weather and pier operations.',
    },
  }),
  createGeneratedDomesticTour(catBaDestination, {
    tourCode: 'VN-CBA-028',
    name: 'Hải Phòng Food Tour - Đồ Sơn - Cát Bà 2 Ngày 1 Đêm',
    intro:
      'Hành trình kết hợp ẩm thực Hải Phòng, biển Đồ Sơn và nghỉ ngắn tại Cát Bà cho khách muốn trải nghiệm phố cảng đa sắc.',
    focus: 'ẩm thực phố cảng, biển Đồ Sơn, Cát Bà và hải sản',
    suitableFor: 'nhóm bạn, gia đình và khách thích ăn uống, check-in nhẹ',
    price: 2_450_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 85,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'Hà Nội',
    highlights: [
      'Thưởng thức bánh đa cua, nem cua bể hoặc món địa phương',
      'Ghé Đồ Sơn hoặc điểm biển theo thời tiết',
      'Nghỉ đêm Cát Bà hoặc Hải Phòng theo gói',
      'Lịch trình dễ đi cho khách cuối tuần',
    ],
    gallery: rotateGallery([...IMAGES.catBa], 1),
    itinerary: [
      {
        title: 'Hà Nội - Hải Phòng Food Tour - Đồ Sơn',
        description:
          'Khởi hành đi Hải Phòng, trải nghiệm các món địa phương, ghé Đồ Sơn và nhận phòng nghỉ.',
        activities: ['Food tour Hải Phòng', 'Đồ Sơn', 'Hải sản địa phương'],
      },
      {
        title: 'Cát Bà hoặc phố cảng - Trở về',
        description:
          'Tham quan Cát Bà hoặc điểm phố cảng phù hợp, mua đặc sản và trở về Hà Nội.',
        activities: ['Cát Bà hoặc phố cảng', 'Mua đặc sản', 'Trở về Hà Nội'],
      },
    ],
    ticketPolicy: {
      included: ['Vé điểm tham quan theo lịch trình'],
      optional: ['Chi phí ăn uống ngoài thực đơn food tour'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.BUS,
      vehicleType: 'Xe du lịch Hà Nội - Hải Phòng',
      vehicleTypeEn: 'Hanoi - Hai Phong tour coach',
      operator: 'Đối tác phố cảng Hải Phòng',
      operatorEn: 'Hai Phong city partner',
      notes: 'Điểm ăn uống có thể thay đổi theo giờ mở cửa và lượng khách.',
      notesEn: 'Food stops may change by opening hours and group size.',
    },
  }),
  createGeneratedDomesticTour(catBaDestination, {
    tourCode: 'VN-CBA-029',
    name: 'Cát Bà Trekking Vườn Quốc Gia - Làng Chài 2 Ngày 1 Đêm',
    intro:
      'Tour Cát Bà thiên về khám phá, trekking vườn quốc gia, làng chài và không gian biển đảo ít vội hơn.',
    focus:
      'trekking nhẹ, thiên nhiên Cát Bà, làng chài và trải nghiệm biển đảo',
    suitableFor:
      'khách trẻ, nhóm yêu thiên nhiên và gia đình thích hoạt động ngoài trời',
    price: 2_850_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 70,
    tourType: 'Khám Phá',
    departurePoint: 'Hà Nội',
    highlights: [
      'Trekking vườn quốc gia Cát Bà theo cung phù hợp',
      'Tham quan làng chài hoặc điểm vịnh theo thời tiết',
      'Nghỉ đêm trên đảo',
      'Có hoạt động ngoài trời vừa sức',
    ],
    gallery: rotateGallery([...IMAGES.catBa], 2),
    itinerary: [
      {
        title: 'Hà Nội - Cát Bà - Làng chài',
        description:
          'Di chuyển đến Cát Bà, tham quan làng chài hoặc điểm vịnh nhẹ và nghỉ đêm trên đảo.',
        activities: ['Di chuyển đến Cát Bà', 'Làng chài', 'Hải sản địa phương'],
      },
      {
        title: 'Vườn quốc gia Cát Bà - Trở về',
        description:
          'Trekking nhẹ trong vườn quốc gia Cát Bà, ăn trưa và trở về Hà Nội.',
        activities: ['Vườn quốc gia Cát Bà', 'Trekking nhẹ', 'Trở về Hà Nội'],
      },
    ],
    ticketPolicy: {
      included: ['Vé vườn quốc gia Cát Bà', 'Vé tàu/phà theo lịch trình'],
      optional: ['Kayak hoặc tàu riêng nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch + tàu/phà Cát Bà',
      vehicleTypeEn: 'Tour coach plus Cat Ba ferry/boat',
      operator: 'Đối tác Cát Bà',
      operatorEn: 'Cat Ba local partner',
      notes: 'Trekking điều chỉnh theo thể lực đoàn và điều kiện thời tiết.',
      notesEn: 'Trekking route adjusts to group fitness and weather.',
    },
  }),
  createGeneratedDomesticTour(mekongDestination, {
    tourCode: 'VN-MKG-030',
    name: 'Mỹ Tho - Bến Tre Sông Nước Mekong 1 Ngày',
    intro:
      'Tour Mekong trong ngày từ TP.HCM, đưa khách trải nghiệm thuyền sông, vườn trái cây, làng nghề và bữa ăn miệt vườn.',
    focus: 'sông nước, vườn trái cây, làng nghề và nhịp sống miệt vườn',
    suitableFor:
      'khách lần đầu đi miền Tây, gia đình và nhóm muốn tour nhẹ trong ngày',
    price: 950_000,
    duration: '1 ngày',
    availableSeats: 95,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'TP.HCM',
    highlights: [
      'Đi thuyền trên sông Mekong',
      'Tham quan vườn trái cây và làng nghề',
      'Bữa trưa miệt vườn',
      'Lịch trình gọn từ TP.HCM',
    ],
    gallery: [...IMAGES.mekong],
    itinerary: [
      {
        title: 'TP.HCM - Mỹ Tho - Bến Tre - TP.HCM',
        description:
          'Khởi hành đi Mỹ Tho/Bến Tre, đi thuyền sông, tham quan làng nghề, dùng bữa trưa và trở về TP.HCM.',
        transport: 'Xe du lịch và thuyền địa phương',
        activities: ['Thuyền sông Mekong', 'Vườn trái cây', 'Làng nghề'],
      },
    ],
    ticketPolicy: {
      included: [
        'Thuyền sông Mekong',
        'Vé điểm vườn/làng nghề theo lịch trình',
      ],
      optional: ['Đờn ca tài tử riêng hoặc trải nghiệm làm bánh'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch + thuyền địa phương',
      vehicleTypeEn: 'Tour coach plus local boat',
      operator: 'Đối tác Mekong Mỹ Tho - Bến Tre',
      operatorEn: 'My Tho - Ben Tre Mekong partner',
      notes: 'Thuyền địa phương hoạt động theo mực nước và điều phối bến.',
      notesEn: 'Local boat operates by water level and pier coordination.',
    },
  }),
  createGeneratedDomesticTour(mekongDestination, {
    tourCode: 'VN-MKG-031',
    name: 'Cần Thơ - Châu Đốc - Rừng Tràm Trà Sư 3 Ngày 2 Đêm',
    intro:
      'Tuyến Mekong 3 ngày kết hợp chợ nổi Cái Răng, Châu Đốc, rừng tràm Trà Sư và văn hóa sông nước miền Tây.',
    focus: 'chợ nổi, rừng tràm, văn hóa Châu Đốc và ẩm thực miền Tây',
    suitableFor: 'khách muốn đi miền Tây sâu hơn, gia đình và nhóm bạn',
    price: 3_250_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 80,
    tourType: 'Khám Phá',
    departurePoint: 'TP.HCM',
    highlights: [
      'Tham quan chợ nổi Cái Răng buổi sớm',
      'Khám phá rừng tràm Trà Sư theo mùa nước',
      'Trải nghiệm Châu Đốc và đặc sản miền Tây',
      'Lịch trình 3 ngày đủ nhịp nghỉ',
    ],
    gallery: rotateGallery([...IMAGES.mekong], 1),
    itinerary: [
      {
        title: 'TP.HCM - Cần Thơ',
        description:
          'Di chuyển đến Cần Thơ, tham quan điểm miệt vườn và nghỉ đêm tại thành phố.',
        activities: [
          'Di chuyển TP.HCM - Cần Thơ',
          'Miệt vườn',
          'Ẩm thực Cần Thơ',
        ],
      },
      {
        title: 'Chợ nổi Cái Răng - Châu Đốc',
        description:
          'Đi chợ nổi buổi sớm, sau đó di chuyển về Châu Đốc và tham quan điểm văn hóa địa phương.',
        activities: ['Chợ nổi Cái Răng', 'Châu Đốc', 'Đặc sản địa phương'],
      },
      {
        title: 'Rừng tràm Trà Sư - Trở về',
        description:
          'Khám phá rừng tràm Trà Sư theo điều kiện mùa nước, dùng bữa trưa và trở về TP.HCM.',
        activities: ['Rừng tràm Trà Sư', 'Ăn trưa miền Tây', 'Trở về TP.HCM'],
      },
    ],
    ticketPolicy: {
      included: [
        'Thuyền chợ nổi Cái Răng',
        'Vé rừng tràm Trà Sư theo lịch trình',
      ],
      optional: ['Thuyền riêng hoặc xe điện trong khu du lịch nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch + thuyền chợ nổi/rừng tràm',
      vehicleTypeEn: 'Tour coach plus floating market and forest boats',
      operator: 'Đối tác Mekong Cần Thơ - Châu Đốc',
      operatorEn: 'Can Tho - Chau Doc Mekong partner',
      notes: 'Chợ nổi đi rất sớm; lịch rừng tràm thay đổi theo mùa nước.',
      notesEn:
        'Floating market starts very early; forest route varies by water season.',
    },
  }),
  createGeneratedDomesticTour(mekongDestination, {
    tourCode: 'VN-MKG-032',
    name: 'Đồng Tháp Sa Đéc - Làng Hoa - Tràm Chim 2 Ngày 1 Đêm',
    intro:
      'Tour Đồng Tháp dành cho khách yêu không gian làng hoa, nhà cổ, ẩm thực miền Tây và cảnh quan Tràm Chim theo mùa.',
    focus: 'làng hoa Sa Đéc, nhà cổ, Tràm Chim và trải nghiệm Đồng Tháp',
    suitableFor:
      'gia đình, nhóm bạn thích chụp ảnh và khách muốn tuyến miền Tây khác biệt',
    price: 2_350_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 78,
    tourType: 'Khám Phá',
    departurePoint: 'TP.HCM',
    highlights: [
      'Check-in làng hoa Sa Đéc',
      'Tham quan nhà cổ hoặc điểm văn hóa địa phương',
      'Khám phá Tràm Chim theo mùa',
      'Ẩm thực Đồng Tháp và đặc sản sen',
    ],
    gallery: rotateGallery([...IMAGES.mekong], 2),
    itinerary: [
      {
        title: 'TP.HCM - Sa Đéc - Làng hoa',
        description:
          'Di chuyển đến Sa Đéc, tham quan làng hoa, nhà cổ hoặc điểm văn hóa địa phương và nghỉ đêm Đồng Tháp.',
        activities: ['Làng hoa Sa Đéc', 'Nhà cổ', 'Ẩm thực Đồng Tháp'],
      },
      {
        title: 'Tràm Chim - Đặc sản sen - Trở về',
        description:
          'Tham quan Tràm Chim theo mùa, dùng bữa trưa với đặc sản địa phương và trở về TP.HCM.',
        activities: ['Tràm Chim', 'Đặc sản sen', 'Trở về TP.HCM'],
      },
    ],
    ticketPolicy: {
      included: [
        'Vé làng hoa hoặc điểm văn hóa theo lịch trình',
        'Vé Tràm Chim theo mùa',
      ],
      optional: ['Thuyền riêng trong Tràm Chim nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch + thuyền theo điểm tham quan',
      vehicleTypeEn: 'Tour coach plus attraction boat when scheduled',
      operator: 'Đối tác Mekong Đồng Tháp',
      operatorEn: 'Dong Thap Mekong partner',
      notes: 'Điểm Tràm Chim phụ thuộc mùa nước và lịch khai thác địa phương.',
      notesEn: 'Tram Chim visit depends on water season and local operations.',
    },
  }),
];

const baseDomesticTourSeeds = [...tours, ...remainingDomesticTours];

function findDestination(slug: string): DomesticTourSeed['destination'] {
  const match = baseDomesticTourSeeds.find(
    (item) => item.destination.slug === slug,
  );
  if (!match) throw new Error(`Không tìm thấy điểm đến với slug: ${slug}`);
  return match.destination;
}

// Tour thật bổ sung cho các điểm đến "hot" — khác biệt theo thời lượng / tuyến /
// chủ đề / điểm khởi hành (không nhân bản). Hạng dịch vụ vẫn do TourPackage lo.
const additionalHeroTours: DomesticTourSeed[] = [
  createGeneratedDomesticTour(findDestination('ha-long'), {
    tourCode: 'VN-HLG-033',
    name: 'Hạ Long - Yên Tử - Vịnh Bái Tử Long 3 Ngày 2 Đêm',
    intro:
      'Hành trình kết hợp non thiêng Yên Tử và vịnh Bái Tử Long hoang sơ, dành cho khách muốn một Hạ Long khác với tuyến du thuyền quen thuộc.',
    focus: 'tâm linh Yên Tử, vịnh Bái Tử Long ít khách và cảnh quan biển đảo',
    suitableFor:
      'gia đình, khách trung niên và nhóm muốn kết hợp hành hương với nghỉ biển',
    price: 3_650_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 70,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'Hà Nội',
    highlights: [
      'Hành hương Yên Tử, lên chùa Đồng bằng cáp treo',
      'Khám phá vịnh Bái Tử Long hoang sơ, ít khách hơn vịnh Hạ Long',
      'Tham quan làng chài và hang động trên vịnh',
      'Nghỉ đêm tại Hạ Long, thưởng thức hải sản địa phương',
    ],
    gallery: [...IMAGES.haLong],
    itinerary: [
      {
        title: 'Hà Nội - Yên Tử - Hạ Long',
        description:
          'Khởi hành đi Yên Tử, lên chùa Đồng bằng cáp treo, sau đó di chuyển ra Hạ Long nhận phòng và nghỉ đêm.',
        transport: 'Xe du lịch và cáp treo Yên Tử',
        activities: ['Chùa Đồng Yên Tử', 'Cáp treo Yên Tử', 'Nhận phòng Hạ Long'],
      },
      {
        title: 'Vịnh Bái Tử Long',
        description:
          'Lên tàu khám phá vịnh Bái Tử Long, ghé hang động, làng chài và tắm biển tại bãi hoang sơ theo thời tiết.',
        activities: ['Tàu vịnh Bái Tử Long', 'Hang động và làng chài', 'Tắm biển'],
      },
      {
        title: 'Hạ Long - Hà Nội',
        description:
          'Tự do buổi sáng, mua đặc sản Quảng Ninh và trở về Hà Nội, kết thúc hành trình.',
        activities: ['Tự do mua sắm', 'Mua đặc sản', 'Trở về Hà Nội'],
      },
    ],
    faqs: [
      {
        question: 'Tour này khác gì tour du thuyền Hạ Long?',
        answer:
          'Tour tập trung vào Yên Tử và vịnh Bái Tử Long hoang sơ, nghỉ tại khách sạn trên bờ thay vì ngủ trên du thuyền.',
      },
      {
        question: 'Leo Yên Tử có vất vả không?',
        answer:
          'Đã có cáp treo cho phần lớn quãng đường, nhưng vẫn có một số đoạn đi bộ nên khách nên mang giày thoải mái.',
      },
    ],
    ticketPolicy: {
      included: ['Vé cáp treo Yên Tử theo gói', 'Vé tàu vịnh Bái Tử Long'],
      optional: ['Phụ thu nâng hạng tàu hoặc phòng view biển'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch Hà Nội - Quảng Ninh + cáp treo + tàu vịnh',
      vehicleTypeEn: 'Hanoi - Quang Ninh coach plus cable car and bay boat',
      operator: 'Đối tác tuyến Quảng Ninh',
      operatorEn: 'Quang Ninh route partner',
      notes: 'Lịch cáp treo và tàu phụ thuộc vận hành khu du lịch và thời tiết.',
      notesEn: 'Cable car and boat schedule depend on operations and weather.',
    },
  }),
  createGeneratedDomesticTour(findDestination('sapa'), {
    tourCode: 'VN-SPA-034',
    name: 'Sapa Trekking Lao Chải - Tả Van 2 Ngày 1 Đêm',
    intro:
      'Tour Sapa thiên về đi bộ đường dài qua các bản làng và ruộng bậc thang, nghỉ homestay để trải nghiệm sâu đời sống vùng cao.',
    focus: 'trekking ruộng bậc thang, văn hóa bản địa và lưu trú homestay',
    suitableFor:
      'khách trẻ, nhóm bạn thích đi bộ và du khách muốn trải nghiệm bản địa thực sự',
    price: 2_750_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 55,
    tourType: 'Khám Phá',
    departurePoint: 'Hà Nội',
    highlights: [
      'Trekking xuyên bản Lao Chải - Tả Van giữa ruộng bậc thang',
      'Nghỉ homestay, ăn tối cùng gia đình người bản địa',
      'Tìm hiểu văn hóa người H’Mông, Dao đỏ',
      'Hướng dẫn viên bản địa đi cùng suốt cung trek',
    ],
    gallery: rotateGallery([...IMAGES.sapa], 1),
    itinerary: [
      {
        title: 'Hà Nội - Sapa - Trek Lao Chải - Tả Van',
        description:
          'Di chuyển lên Sapa, bắt đầu cung trek qua bản Lao Chải - Tả Van, băng ruộng bậc thang và nhận homestay nghỉ đêm.',
        accommodation: 'Homestay bản Tả Van',
        transport: 'Xe limousine và đi bộ đường dài',
        activities: ['Trek Lao Chải', 'Tả Van', 'Homestay bản địa'],
      },
      {
        title: 'Tả Van - Giàng Tả Chải - Hà Nội',
        description:
          'Tiếp tục đi bộ nhẹ qua Giàng Tả Chải, dùng bữa trưa và trở về Hà Nội buổi tối.',
        transport: 'Đi bộ và xe limousine',
        activities: ['Giàng Tả Chải', 'Ẩm thực vùng cao', 'Trở về Hà Nội'],
      },
    ],
    faqs: [
      {
        question: 'Cung trek dài bao nhiêu và có khó không?',
        answer:
          'Khoảng 10-14km chia hai ngày, đường đất ruộng bậc thang vừa sức với người có sức khỏe bình thường, đi giày trek là phù hợp.',
      },
      {
        question: 'Homestay có tiện nghi không?',
        answer:
          'Homestay sạch sẽ, có chăn đệm và khu vệ sinh chung hoặc riêng tùy gói, mang trải nghiệm gần gũi đời sống bản địa.',
      },
    ],
    ticketPolicy: {
      included: ['Phí tham quan bản làng theo lịch trình', 'Hướng dẫn viên bản địa'],
      optional: ['Phụ thu porter mang đồ nếu khách yêu cầu'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.BUS,
      vehicleType: 'Xe limousine Hà Nội - Sapa',
      vehicleTypeEn: 'Hanoi - Sapa limousine',
      operator: 'Đối tác tuyến Sapa',
      operatorEn: 'Sapa route partner',
      notes: 'Cung trek điều chỉnh theo thể lực đoàn và điều kiện thời tiết.',
      notesEn: 'Trekking route adjusts to group fitness and weather.',
    },
  }),
  createGeneratedDomesticTour(findDestination('sapa'), {
    tourCode: 'VN-SPA-035',
    name: 'Sapa Săn Mây & Nghỉ Dưỡng 2 Ngày 1 Đêm',
    intro:
      'Phiên bản Sapa nhẹ nhàng cho khách muốn nghỉ dưỡng khách sạn view núi, săn mây và check-in mà không phải đi bộ nhiều.',
    focus: 'nghỉ dưỡng, săn mây Ô Quy Hồ và các điểm check-in trung tâm Sapa',
    suitableFor: 'cặp đôi, gia đình có trẻ nhỏ và khách thích nhịp chậm',
    price: 3_150_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 60,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'Hà Nội',
    highlights: [
      'Nghỉ khách sạn view thung lũng, săn mây buổi sớm',
      'Check-in đèo Ô Quy Hồ và Cổng Trời',
      'Thời gian tự do dạo trung tâm, cà phê ngắm núi',
      'Lịch trình nhẹ, ít di chuyển, phù hợp gia đình',
    ],
    gallery: rotateGallery([...IMAGES.sapa], 2),
    itinerary: [
      {
        title: 'Hà Nội - Sapa - Ô Quy Hồ',
        description:
          'Di chuyển lên Sapa, nhận phòng khách sạn, chiều tham quan đèo Ô Quy Hồ và Cổng Trời ngắm hoàng hôn.',
        accommodation: 'Khách sạn Sapa view núi theo gói',
        transport: 'Xe limousine',
        activities: ['Đèo Ô Quy Hồ', 'Cổng Trời', 'Nghỉ dưỡng khách sạn'],
      },
      {
        title: 'Săn mây - Tự do - Hà Nội',
        description:
          'Dậy sớm săn mây, tự do khám phá trung tâm Sapa, mua đặc sản trước khi trở về Hà Nội.',
        transport: 'Xe limousine',
        activities: ['Săn mây buổi sớm', 'Tự do trung tâm Sapa', 'Trở về Hà Nội'],
      },
    ],
    faqs: [
      {
        question: 'Mùa nào dễ săn mây nhất?',
        answer:
          'Khoảng tháng 9 đến tháng 4 thường có biển mây đẹp, tuy nhiên còn phụ thuộc thời tiết từng ngày.',
      },
      {
        question: 'Tour có phải đi bộ nhiều không?',
        answer:
          'Không. Đây là tour nghỉ dưỡng, di chuyển chủ yếu bằng xe, phù hợp gia đình có trẻ nhỏ và người lớn tuổi.',
      },
    ],
    ticketPolicy: {
      included: ['Vé các điểm check-in theo lịch trình'],
      optional: ['Vé cáp treo Fansipan nếu khách muốn bổ sung'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.BUS,
      vehicleType: 'Xe limousine Hà Nội - Sapa',
      vehicleTypeEn: 'Hanoi - Sapa limousine',
      operator: 'Đối tác tuyến Sapa',
      operatorEn: 'Sapa route partner',
      notes: 'Điểm săn mây có thể đổi theo điều kiện thời tiết buổi sáng.',
      notesEn: 'Cloud-hunting spot may change with morning weather.',
    },
  }),
  createGeneratedDomesticTour(findDestination('ninh-binh'), {
    tourCode: 'VN-NBI-036',
    name: 'Ninh Bình Bái Đính - Tràng An - Tam Cốc 2 Ngày 1 Đêm',
    intro:
      'Phiên bản Ninh Bình 2 ngày có nghỉ đêm, thêm chùa Bái Đính và Tam Cốc để khách đi thong thả thay vì gói gọn trong ngày.',
    focus: 'tâm linh Bái Đính, di sản Tràng An và cảnh quan Tam Cốc',
    suitableFor:
      'gia đình, đoàn khách trung niên và nhóm muốn lịch trình thư thả có nghỉ đêm',
    price: 2_350_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 75,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'Hà Nội',
    highlights: [
      'Tham quan quần thể chùa Bái Đính lớn nhất Việt Nam',
      'Đi thuyền khám phá Tràng An và hang động',
      'Ngắm Tam Cốc - “Hạ Long trên cạn” theo mùa lúa',
      'Nghỉ đêm tại Ninh Bình, thưởng thức dê núi - cơm cháy',
    ],
    gallery: rotateGallery([...IMAGES.ninhBinh], 1),
    itinerary: [
      {
        title: 'Hà Nội - Bái Đính - Tràng An',
        description:
          'Khởi hành đi Bái Đính tham quan quần thể chùa, chiều đi thuyền Tràng An và nhận phòng nghỉ đêm tại Ninh Bình.',
        accommodation: 'Khách sạn Ninh Bình theo gói',
        transport: 'Xe du lịch và thuyền Tràng An',
        activities: ['Chùa Bái Đính', 'Thuyền Tràng An', 'Nghỉ đêm Ninh Bình'],
      },
      {
        title: 'Tam Cốc - Hang Múa - Hà Nội',
        description:
          'Đi thuyền Tam Cốc, leo Hang Múa ngắm toàn cảnh, dùng đặc sản địa phương và trở về Hà Nội.',
        transport: 'Xe du lịch và thuyền chèo tay',
        activities: ['Thuyền Tam Cốc', 'Hang Múa', 'Đặc sản dê núi'],
      },
    ],
    faqs: [
      {
        question: 'Tour có đi bộ nhiều ở Bái Đính không?',
        answer:
          'Khuôn viên Bái Đính rất rộng, có xe điện hỗ trợ di chuyển; khách nên mang giày thoải mái.',
      },
      {
        question: 'Đi mùa nào ngắm lúa Tam Cốc đẹp?',
        answer:
          'Khoảng cuối tháng 5 đến đầu tháng 6 là mùa lúa chín vàng, cảnh Tam Cốc đẹp nhất trong năm.',
      },
    ],
    ticketPolicy: {
      included: ['Vé Tràng An', 'Vé Tam Cốc', 'Xe điện Bái Đính theo lịch trình'],
      optional: ['Vé Hang Múa nếu khách chọn leo'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.BUS,
      vehicleType: 'Xe du lịch Hà Nội - Ninh Bình',
      vehicleTypeEn: 'Hanoi - Ninh Binh tour coach',
      operator: 'Đối tác tuyến Ninh Bình',
      operatorEn: 'Ninh Binh route partner',
      notes: 'Lịch thuyền phụ thuộc lượng khách và điều phối bến.',
      notesEn: 'Boat schedule depends on group size and pier coordination.',
    },
  }),
  createGeneratedDomesticTour(findDestination('da-nang'), {
    tourCode: 'VN-DAD-037',
    name: 'Đà Nẵng - Hội An - Huế 4 Ngày 3 Đêm Liên Tuyến Di Sản',
    intro:
      'Hành trình liên tuyến ba vùng di sản miền Trung: Đà Nẵng hiện đại, Hội An cổ kính và Huế cố đô, trong một chuyến đi trọn vẹn.',
    focus: 'di sản miền Trung, Bà Nà Hills, phố cổ Hội An và cố đô Huế',
    suitableFor:
      'gia đình, khách yêu văn hóa và du khách muốn đi trọn miền Trung trong một chuyến',
    price: 5_950_000,
    duration: '4 ngày 3 đêm',
    availableSeats: 80,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'Đà Nẵng',
    highlights: [
      'Một ngày vui chơi Bà Nà Hills và Cầu Vàng',
      'Dạo phố cổ Hội An và không gian đèn lồng buổi tối',
      'Vượt đèo Hải Vân ra Huế thăm Đại Nội và lăng tẩm',
      'Trải nghiệm trọn ba di sản trong một hành trình',
    ],
    gallery: [...IMAGES.daNang],
    itinerary: [
      {
        title: 'Đà Nẵng - Sơn Trà - Biển Mỹ Khê',
        description:
          'Đón khách, tham quan bán đảo Sơn Trà, nhận phòng và tự do tắm biển Mỹ Khê, ngắm Cầu Rồng buổi tối.',
        accommodation: 'Khách sạn Đà Nẵng theo gói',
        transport: 'Xe du lịch',
        activities: ['Bán đảo Sơn Trà', 'Biển Mỹ Khê', 'Cầu Rồng'],
      },
      {
        title: 'Bà Nà Hills - Cầu Vàng',
        description:
          'Cả ngày khám phá Bà Nà Hills, Cầu Vàng, làng Pháp và các khu vui chơi, tối về Đà Nẵng nghỉ ngơi.',
        accommodation: 'Khách sạn Đà Nẵng theo gói',
        transport: 'Xe du lịch và cáp treo',
        activities: ['Bà Nà Hills', 'Cầu Vàng', 'Làng Pháp'],
      },
      {
        title: 'Hội An phố cổ',
        description:
          'Di chuyển vào Hội An, dạo phố cổ, chùa Cầu, làng nghề và trải nghiệm đèn lồng, nghỉ đêm tại Hội An hoặc Đà Nẵng.',
        accommodation: 'Khách sạn Hội An/Đà Nẵng theo gói',
        transport: 'Xe du lịch',
        activities: ['Phố cổ Hội An', 'Chùa Cầu', 'Đèn lồng buổi tối'],
      },
      {
        title: 'Đèo Hải Vân - Huế - Tiễn khách',
        description:
          'Vượt đèo Hải Vân ra Huế thăm Đại Nội và một lăng vua, dùng đặc sản Huế và tiễn khách.',
        transport: 'Xe du lịch',
        activities: ['Đèo Hải Vân', 'Đại Nội Huế', 'Lăng vua'],
      },
    ],
    faqs: [
      {
        question: 'Vé Bà Nà Hills đã bao gồm chưa?',
        answer:
          'Tùy gói khách chọn. Gói tiêu chuẩn và nâng cấp được phân biệt rõ vé Bà Nà khi đặt.',
      },
      {
        question: 'Tour có thể đón khách bay từ TP.HCM/Hà Nội không?',
        answer:
          'Có. Tour nhận khách tại Đà Nẵng; vé máy bay có thể bổ sung theo gói nếu khách yêu cầu.',
      },
    ],
    ticketPolicy: {
      included: [
        'Vé Đại Nội Huế và một lăng vua theo lịch trình',
        'Vé tham quan Sơn Trà, Ngũ Hành Sơn',
      ],
      optional: ['Vé cáp treo Bà Nà Hills nếu không ghi rõ trong gói đã chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.PRIVATE_CAR,
      vehicleType: 'Xe du lịch đời mới tuyến Đà Nẵng - Hội An - Huế',
      vehicleTypeEn: 'Modern coach for Da Nang - Hoi An - Hue route',
      operator: 'Đối tác miền Trung',
      operatorEn: 'Central Vietnam partner',
      notes: 'Đoạn đèo Hải Vân có thể đổi sang hầm nếu thời tiết xấu.',
      notesEn: 'Hai Van Pass may switch to the tunnel in bad weather.',
    },
  }),
  createGeneratedDomesticTour(findDestination('da-nang'), {
    tourCode: 'VN-DAD-038',
    name: 'Đà Nẵng - Cù Lao Chàm Lặn Ngắm San Hô 1 Ngày',
    intro:
      'Tour trong ngày từ Đà Nẵng ra đảo Cù Lao Chàm, lặn ngắm san hô và thưởng thức hải sản, dành cho khách thích biển đảo nhanh gọn.',
    focus: 'biển đảo Cù Lao Chàm, lặn ngắm san hô và hải sản',
    suitableFor: 'nhóm bạn, gia đình và khách muốn một ngày biển đảo dễ đi',
    price: 1_150_000,
    duration: '1 ngày',
    availableSeats: 90,
    tourType: 'Khám Phá',
    departurePoint: 'Đà Nẵng',
    highlights: [
      'Cano cao tốc ra đảo Cù Lao Chàm',
      'Lặn ngắm san hô tại khu bảo tồn biển',
      'Tự do tắm biển bãi Chồng, bãi Ông',
      'Bữa trưa hải sản trên đảo',
    ],
    gallery: rotateGallery([...IMAGES.daNang], 2),
    itinerary: [
      {
        title: 'Đà Nẵng - Cù Lao Chàm - Đà Nẵng',
        description:
          'Đón khách, ra bến đi cano tới Cù Lao Chàm, lặn ngắm san hô, tắm biển, dùng bữa trưa hải sản và trở về trong chiều.',
        transport: 'Xe du lịch và cano cao tốc',
        activities: ['Cano Cù Lao Chàm', 'Lặn ngắm san hô', 'Hải sản trên đảo'],
      },
    ],
    faqs: [
      {
        question: 'Không biết bơi có lặn ngắm san hô được không?',
        answer:
          'Được. Khách được trang bị áo phao và kính lặn, có nhân viên hỗ trợ tại khu vực nông an toàn.',
      },
      {
        question: 'Tour có chạy quanh năm không?',
        answer:
          'Cù Lao Chàm phụ thuộc thời tiết biển; mùa biển động cano có thể tạm dừng và sẽ báo trước cho khách.',
      },
    ],
    ticketPolicy: {
      included: [
        'Cano khứ hồi Cù Lao Chàm',
        'Vé khu bảo tồn biển',
        'Dụng cụ lặn ngắm san hô',
      ],
      optional: ['Lặn bình khí nâng cấp nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch + cano cao tốc Cù Lao Chàm',
      vehicleTypeEn: 'Coach plus speedboat to Cu Lao Cham',
      operator: 'Đối tác Cù Lao Chàm',
      operatorEn: 'Cu Lao Cham partner',
      notes: 'Lịch cano phụ thuộc điều kiện sóng và điều phối bến.',
      notesEn: 'Speedboat schedule depends on sea conditions and pier control.',
    },
  }),
  createGeneratedDomesticTour(findDestination('da-nang'), {
    tourCode: 'VN-DAD-045',
    name: 'Đà Nẵng - Hội An - Bà Nà Hills 4 Ngày 3 Đêm (Bay Từ Hà Nội)',
    intro:
      'Trọn gói bay thẳng Hà Nội - Đà Nẵng cùng hành trình di sản miền Trung: Bà Nà Hills, phố cổ Hội An và biển Mỹ Khê, không lo tự đặt vé máy bay.',
    focus: 'Bà Nà Hills, phố cổ Hội An và biển Mỹ Khê, trọn gói bay khứ hồi từ Hà Nội',
    suitableFor:
      'khách miền Bắc muốn trọn gói bay thẳng, gia đình và nhóm bạn ngại tự ghép vé',
    price: 6_490_000,
    duration: '4 ngày 3 đêm',
    availableSeats: 80,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'Hà Nội',
    highlights: [
      'Bay thẳng khứ hồi Hà Nội - Đà Nẵng, xe đón tận sân bay',
      'Một ngày vui chơi Bà Nà Hills và Cầu Vàng',
      'Dạo phố cổ Hội An và không gian đèn lồng buổi tối',
      'Tự do tắm biển Mỹ Khê và thưởng thức hải sản',
    ],
    gallery: [...IMAGES.daNang],
    itinerary: [
      {
        title: 'Hà Nội - Đà Nẵng - Biển Mỹ Khê',
        description:
          'Đón khách tại sân bay Nội Bài, bay vào Đà Nẵng, xe đón về khách sạn, tự do tắm biển Mỹ Khê và ngắm Cầu Rồng buổi tối.',
        accommodation: 'Khách sạn Đà Nẵng theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay Hà Nội - Đà Nẵng', 'Biển Mỹ Khê', 'Cầu Rồng'],
      },
      {
        title: 'Bà Nà Hills - Cầu Vàng',
        description:
          'Cả ngày khám phá Bà Nà Hills, Cầu Vàng, làng Pháp và các khu vui chơi, tối về Đà Nẵng nghỉ ngơi.',
        accommodation: 'Khách sạn Đà Nẵng theo gói',
        transport: 'Xe du lịch và cáp treo',
        activities: ['Bà Nà Hills', 'Cầu Vàng', 'Làng Pháp'],
      },
      {
        title: 'Hội An phố cổ',
        description:
          'Di chuyển vào Hội An, dạo phố cổ, chùa Cầu, làng nghề và trải nghiệm đèn lồng, nghỉ đêm tại Hội An hoặc Đà Nẵng.',
        accommodation: 'Khách sạn Hội An/Đà Nẵng theo gói',
        transport: 'Xe du lịch',
        activities: ['Phố cổ Hội An', 'Chùa Cầu', 'Đèn lồng buổi tối'],
      },
      {
        title: 'Ngũ Hành Sơn - Đà Nẵng - Hà Nội',
        description:
          'Tham quan Ngũ Hành Sơn và làng đá Non Nước, mua đặc sản, xe tiễn ra sân bay Đà Nẵng bay về Hà Nội.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Ngũ Hành Sơn', 'Làng đá Non Nước', 'Bay Đà Nẵng - Hà Nội'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi Hà Nội - Đà Nẵng hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành tùy hãng.',
      },
      {
        question: 'Khách ở tỉnh khác miền Bắc tham gia được không?',
        answer:
          'Được. Khách tự di chuyển tới sân bay Nội Bài tập trung cùng đoàn, hoặc liên hệ để được tư vấn nối chuyến.',
      },
    ],
    ticketPolicy: {
      included: [
        'Vé máy bay khứ hồi Hà Nội - Đà Nẵng',
        'Vé tham quan Ngũ Hành Sơn, Sơn Trà',
      ],
      optional: ['Vé cáp treo Bà Nà Hills nếu không ghi rõ trong gói đã chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi Hà Nội - Đà Nẵng + xe tham quan',
      vehicleTypeEn: 'Round-trip Hanoi - Da Nang flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác miền Trung',
      operatorEn: 'Domestic airline plus Central Vietnam partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Đà Nẵng.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Da Nang airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('da-nang'), {
    tourCode: 'VN-DAD-046',
    name: 'Đà Nẵng - Hội An - Bà Nà Hills 4 Ngày 3 Đêm (Bay Từ TP.HCM)',
    intro:
      'Trọn gói bay thẳng TP.HCM - Đà Nẵng cùng hành trình di sản miền Trung: Bà Nà Hills, phố cổ Hội An và biển Mỹ Khê, không lo tự đặt vé máy bay.',
    focus: 'Bà Nà Hills, phố cổ Hội An và biển Mỹ Khê, trọn gói bay khứ hồi từ TP.HCM',
    suitableFor:
      'khách miền Nam muốn trọn gói bay thẳng, gia đình và nhóm bạn ngại tự ghép vé',
    price: 6_290_000,
    duration: '4 ngày 3 đêm',
    availableSeats: 80,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'TP.HCM',
    highlights: [
      'Bay thẳng khứ hồi TP.HCM - Đà Nẵng, xe đón tận sân bay',
      'Một ngày vui chơi Bà Nà Hills và Cầu Vàng',
      'Dạo phố cổ Hội An và không gian đèn lồng buổi tối',
      'Tự do tắm biển Mỹ Khê và thưởng thức hải sản',
    ],
    gallery: rotateGallery([...IMAGES.daNang], 1),
    itinerary: [
      {
        title: 'TP.HCM - Đà Nẵng - Biển Mỹ Khê',
        description:
          'Đón khách tại sân bay Tân Sơn Nhất, bay vào Đà Nẵng, xe đón về khách sạn, tự do tắm biển Mỹ Khê và ngắm Cầu Rồng buổi tối.',
        accommodation: 'Khách sạn Đà Nẵng theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay TP.HCM - Đà Nẵng', 'Biển Mỹ Khê', 'Cầu Rồng'],
      },
      {
        title: 'Bà Nà Hills - Cầu Vàng',
        description:
          'Cả ngày khám phá Bà Nà Hills, Cầu Vàng, làng Pháp và các khu vui chơi, tối về Đà Nẵng nghỉ ngơi.',
        accommodation: 'Khách sạn Đà Nẵng theo gói',
        transport: 'Xe du lịch và cáp treo',
        activities: ['Bà Nà Hills', 'Cầu Vàng', 'Làng Pháp'],
      },
      {
        title: 'Hội An phố cổ',
        description:
          'Di chuyển vào Hội An, dạo phố cổ, chùa Cầu, làng nghề và trải nghiệm đèn lồng, nghỉ đêm tại Hội An hoặc Đà Nẵng.',
        accommodation: 'Khách sạn Hội An/Đà Nẵng theo gói',
        transport: 'Xe du lịch',
        activities: ['Phố cổ Hội An', 'Chùa Cầu', 'Đèn lồng buổi tối'],
      },
      {
        title: 'Ngũ Hành Sơn - Đà Nẵng - TP.HCM',
        description:
          'Tham quan Ngũ Hành Sơn và làng đá Non Nước, mua đặc sản, xe tiễn ra sân bay Đà Nẵng bay về TP.HCM.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Ngũ Hành Sơn', 'Làng đá Non Nước', 'Bay Đà Nẵng - TP.HCM'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi TP.HCM - Đà Nẵng hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành tùy hãng.',
      },
      {
        question: 'Khách ở tỉnh khác miền Nam tham gia được không?',
        answer:
          'Được. Khách tự di chuyển tới sân bay Tân Sơn Nhất tập trung cùng đoàn, hoặc liên hệ để được tư vấn nối chuyến.',
      },
    ],
    ticketPolicy: {
      included: [
        'Vé máy bay khứ hồi TP.HCM - Đà Nẵng',
        'Vé tham quan Ngũ Hành Sơn, Sơn Trà',
      ],
      optional: ['Vé cáp treo Bà Nà Hills nếu không ghi rõ trong gói đã chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi TP.HCM - Đà Nẵng + xe tham quan',
      vehicleTypeEn: 'Round-trip Ho Chi Minh City - Da Nang flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác miền Trung',
      operatorEn: 'Domestic airline plus Central Vietnam partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Đà Nẵng.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Da Nang airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('hoi-an'), {
    tourCode: 'VN-HANQ-039',
    name: 'Hội An - Thánh Địa Mỹ Sơn - Cù Lao Chàm 3 Ngày 2 Đêm',
    intro:
      'Tour Hội An mở rộng tới thánh địa Mỹ Sơn và đảo Cù Lao Chàm, kết hợp di sản Chăm, biển đảo và phố cổ trong một hành trình.',
    focus: 'di sản Chăm Mỹ Sơn, biển đảo Cù Lao Chàm và phố cổ Hội An',
    suitableFor: 'cặp đôi, gia đình và khách yêu văn hóa lẫn biển đảo',
    price: 3_450_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 75,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'Đà Nẵng',
    highlights: [
      'Khám phá thánh địa Mỹ Sơn - di sản văn hóa Chăm',
      'Cano ra Cù Lao Chàm lặn ngắm san hô',
      'Dạo phố cổ Hội An và không gian đèn lồng',
      'Trải nghiệm rừng dừa Bảy Mẫu bằng thuyền thúng',
    ],
    gallery: [...IMAGES.hoiAn],
    itinerary: [
      {
        title: 'Đà Nẵng - Hội An - Rừng dừa',
        description:
          'Đón khách, trải nghiệm rừng dừa Bảy Mẫu, nhận phòng và dạo phố cổ Hội An buổi tối.',
        accommodation: 'Khách sạn Hội An theo gói',
        transport: 'Xe du lịch và thuyền thúng',
        activities: ['Rừng dừa Bảy Mẫu', 'Phố cổ Hội An', 'Đèn lồng buổi tối'],
      },
      {
        title: 'Thánh địa Mỹ Sơn',
        description:
          'Tham quan thánh địa Mỹ Sơn buổi sáng, xem trình diễn vũ điệu Chăm, chiều tự do nghỉ ngơi tại Hội An.',
        accommodation: 'Khách sạn Hội An theo gói',
        transport: 'Xe du lịch',
        activities: ['Thánh địa Mỹ Sơn', 'Vũ điệu Chăm', 'Tự do Hội An'],
      },
      {
        title: 'Cù Lao Chàm - Tiễn khách',
        description:
          'Cano ra Cù Lao Chàm lặn ngắm san hô và tắm biển, dùng bữa trưa hải sản và tiễn khách.',
        transport: 'Xe du lịch và cano',
        activities: ['Cù Lao Chàm', 'Lặn ngắm san hô', 'Hải sản'],
      },
    ],
    faqs: [
      {
        question: 'Mỹ Sơn cách Hội An bao xa?',
        answer:
          'Khoảng 40km, di chuyển xe khoảng một giờ. Nên đi buổi sáng sớm để tránh nắng và đông khách.',
      },
      {
        question: 'Lịch Cù Lao Chàm có thể thay đổi không?',
        answer:
          'Có, vì phụ thuộc thời tiết biển. Nếu cano không chạy, đội hỗ trợ sẽ sắp xếp phương án thay thế.',
      },
    ],
    ticketPolicy: {
      included: [
        'Vé thánh địa Mỹ Sơn',
        'Cano và vé khu bảo tồn Cù Lao Chàm',
        'Thuyền thúng rừng dừa',
      ],
      optional: ['Vé show Ký Ức Hội An nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch + cano Cù Lao Chàm',
      vehicleTypeEn: 'Coach plus Cu Lao Cham speedboat',
      operator: 'Đối tác Hội An - Quảng Nam',
      operatorEn: 'Hoi An - Quang Nam partner',
      notes: 'Lịch Mỹ Sơn và Cù Lao Chàm sắp xếp theo thời tiết từng ngày.',
      notesEn: 'My Son and Cu Lao Cham timing arranged by daily weather.',
    },
  }),
  createGeneratedDomesticTour(findDestination('nha-trang'), {
    tourCode: 'VN-NTR-040',
    name: 'Nha Trang - Đảo Bình Ba 3 Ngày 2 Đêm',
    intro:
      'Tour kết hợp Nha Trang sôi động và đảo Bình Ba hoang sơ - “đảo tôm hùm”, cho khách muốn một tuyến biển đảo khác lạ hơn tour đảo quen thuộc.',
    focus: 'biển đảo Bình Ba, tôm hùm và các bãi tắm hoang sơ',
    suitableFor: 'nhóm bạn, gia đình và khách thích biển đảo ít thương mại hóa',
    price: 3_250_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 70,
    tourType: 'Khám Phá',
    departurePoint: 'Nha Trang',
    highlights: [
      'Khám phá đảo Bình Ba - thiên đường tôm hùm',
      'Tắm biển Bãi Chướng, Bãi Nồm hoang sơ',
      'Lặn ngắm san hô và câu cá cùng ngư dân',
      'Một ngày dạo phố biển Nha Trang',
    ],
    gallery: rotateGallery([...IMAGES.nhaTrang], 1),
    itinerary: [
      {
        title: 'Nha Trang - City tour',
        description:
          'Đón khách, tham quan Tháp Bà Ponagar, chợ Đầm và tắm biển trung tâm, tối tự do dạo phố biển.',
        accommodation: 'Khách sạn Nha Trang theo gói',
        transport: 'Xe du lịch',
        activities: ['Tháp Bà Ponagar', 'Chợ Đầm', 'Biển trung tâm'],
      },
      {
        title: 'Đảo Bình Ba',
        description:
          'Ra cảng đi tàu tới đảo Bình Ba, tắm biển các bãi hoang sơ, lặn ngắm san hô và thưởng thức tôm hùm.',
        accommodation: 'Homestay đảo Bình Ba theo gói',
        transport: 'Xe du lịch và tàu',
        activities: ['Đảo Bình Ba', 'Lặn ngắm san hô', 'Tôm hùm'],
      },
      {
        title: 'Bình Ba - Nha Trang - Tiễn khách',
        description:
          'Tắm biển buổi sáng, trở về đất liền, mua đặc sản và tiễn khách tại Nha Trang.',
        transport: 'Tàu và xe du lịch',
        activities: ['Tắm biển buổi sáng', 'Mua đặc sản', 'Tiễn khách'],
      },
    ],
    faqs: [
      {
        question: 'Đảo Bình Ba có gì khác đảo trong vịnh Nha Trang?',
        answer:
          'Bình Ba hoang sơ, ít dịch vụ thương mại, nổi tiếng tôm hùm và các bãi tắm vắng, hợp khách thích yên tĩnh.',
      },
      {
        question: 'Lưu trú trên đảo thế nào?',
        answer:
          'Chủ yếu là homestay và nhà nghỉ địa phương, tiện nghi cơ bản nhưng sạch sẽ và gần biển.',
      },
    ],
    ticketPolicy: {
      included: ['Vé tàu ra đảo Bình Ba', 'Lặn ngắm san hô theo lịch trình'],
      optional: ['Câu cá hoặc thuê cano riêng nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch + tàu ra đảo Bình Ba',
      vehicleTypeEn: 'Coach plus boat to Binh Ba island',
      operator: 'Đối tác tuyến Cam Ranh - Bình Ba',
      operatorEn: 'Cam Ranh - Binh Ba partner',
      notes: 'Lịch tàu ra đảo phụ thuộc thời tiết biển và điều phối cảng.',
      notesEn: 'Island boat schedule depends on sea weather and port control.',
    },
  }),
  createGeneratedDomesticTour(findDestination('da-lat'), {
    tourCode: 'VN-DLI-041',
    name: 'Đà Lạt Trekking Langbiang & Săn Mây 3 Ngày 2 Đêm',
    intro:
      'Tour Đà Lạt thiên về vận động: chinh phục Langbiang, săn mây và cắm trại, dành cho khách trẻ thích khám phá thiên nhiên.',
    focus: 'trekking Langbiang, săn mây và trải nghiệm thiên nhiên Đà Lạt',
    suitableFor: 'khách trẻ, nhóm bạn và người yêu hoạt động ngoài trời',
    price: 3_150_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 60,
    tourType: 'Khám Phá',
    departurePoint: 'Đà Lạt',
    highlights: [
      'Trekking chinh phục đỉnh Langbiang',
      'Săn mây buổi sớm tại đồi thông',
      'Cắm trại hoặc đốt lửa trại theo gói',
      'Khám phá thác và rừng thông Đà Lạt',
    ],
    gallery: rotateGallery([...IMAGES.daLat], 1),
    itinerary: [
      {
        title: 'Đà Lạt - Đồi thông - Săn mây',
        description:
          'Đón khách, nhận phòng, chiều khám phá đồi thông và các điểm săn mây, chuẩn bị cho ngày trekking.',
        accommodation: 'Khách sạn/homestay Đà Lạt theo gói',
        transport: 'Xe du lịch',
        activities: ['Đồi thông', 'Điểm săn mây', 'Cà phê ngắm phố'],
      },
      {
        title: 'Trekking Langbiang',
        description:
          'Cả ngày trekking chinh phục Langbiang, ngắm toàn cảnh cao nguyên, picnic trên đường và trở về nghỉ ngơi.',
        accommodation: 'Khách sạn/homestay Đà Lạt theo gói',
        transport: 'Xe du lịch và đi bộ đường dài',
        activities: ['Trekking Langbiang', 'Ngắm toàn cảnh', 'Picnic'],
      },
      {
        title: 'Thác - Tự do - Tiễn khách',
        description:
          'Tham quan thác Đà Lạt, tự do mua đặc sản và tiễn khách kết thúc hành trình.',
        transport: 'Xe du lịch',
        activities: ['Thác Đà Lạt', 'Mua đặc sản', 'Tiễn khách'],
      },
    ],
    faqs: [
      {
        question: 'Trekking Langbiang có cần thể lực tốt không?',
        answer:
          'Cung leo có dốc nên hợp với người sức khỏe ổn định; có hướng dẫn viên đi cùng và điều chỉnh nhịp theo đoàn.',
      },
      {
        question: 'Cắm trại có an toàn không?',
        answer:
          'Có. Khu cắm trại được chọn lọc, có trang bị cơ bản và nhân viên hỗ trợ, tùy gói khách chọn.',
      },
    ],
    ticketPolicy: {
      included: ['Vé khu du lịch Langbiang', 'Vé tham quan thác theo lịch trình'],
      optional: ['Dịch vụ cắm trại hoặc lửa trại nâng cấp'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.PRIVATE_CAR,
      vehicleType: 'Xe du lịch/xe jeep địa hình Đà Lạt',
      vehicleTypeEn: 'Da Lat tour coach or off-road jeep',
      operator: 'Đối tác Đà Lạt',
      operatorEn: 'Da Lat local partner',
      notes: 'Cung trekking và điểm săn mây điều chỉnh theo thời tiết.',
      notesEn: 'Trekking route and cloud-hunting spot adjust to weather.',
    },
  }),
  createGeneratedDomesticTour(findDestination('da-lat'), {
    tourCode: 'VN-DLI-042',
    name: 'Đà Lạt Nghỉ Dưỡng & Check-in 2 Ngày 1 Đêm',
    intro:
      'Phiên bản Đà Lạt nhẹ nhàng, tập trung vào nghỉ dưỡng, vườn hoa, cà phê và các điểm check-in nổi tiếng, ít di chuyển.',
    focus: 'nghỉ dưỡng, vườn hoa và các điểm check-in trung tâm Đà Lạt',
    suitableFor: 'cặp đôi, gia đình và khách muốn chuyến đi thư giãn dễ chịu',
    price: 2_450_000,
    duration: '2 ngày 1 đêm',
    availableSeats: 80,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'Đà Lạt',
    highlights: [
      'Check-in các điểm nổi tiếng: Quảng trường Lâm Viên, vườn hoa',
      'Thưởng thức cà phê và đặc sản Đà Lạt',
      'Tham quan nông trại dâu hoặc vườn hoa cẩm tú cầu theo mùa',
      'Lịch trình thư thả, phù hợp gia đình',
    ],
    gallery: rotateGallery([...IMAGES.daLat], 2),
    itinerary: [
      {
        title: 'Đà Lạt - Vườn hoa - Check-in',
        description:
          'Đón khách, nhận phòng, tham quan vườn hoa thành phố, Quảng trường Lâm Viên và các điểm check-in nổi tiếng.',
        accommodation: 'Khách sạn Đà Lạt theo gói',
        transport: 'Xe du lịch',
        activities: ['Vườn hoa thành phố', 'Quảng trường Lâm Viên', 'Điểm check-in'],
      },
      {
        title: 'Nông trại - Tự do - Tiễn khách',
        description:
          'Tham quan nông trại dâu hoặc vườn theo mùa, tự do cà phê, mua đặc sản và tiễn khách.',
        transport: 'Xe du lịch',
        activities: ['Nông trại dâu', 'Cà phê Đà Lạt', 'Mua đặc sản'],
      },
    ],
    faqs: [
      {
        question: 'Tour có phù hợp người lớn tuổi không?',
        answer:
          'Rất phù hợp. Lịch trình nhẹ, ít leo trèo, di chuyển chủ yếu bằng xe và nghỉ ngơi thoải mái.',
      },
      {
        question: 'Vườn hoa có theo mùa không?',
        answer:
          'Có. Một số vườn theo mùa hoa; nếu trùng mùa, lịch trình sẽ ưu tiên điểm hoa đang đẹp nhất.',
      },
    ],
    ticketPolicy: {
      included: ['Vé vườn hoa và điểm tham quan theo lịch trình'],
      optional: ['Vé nông trại hoặc trò chơi ngoài chương trình'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.BUS,
      vehicleType: 'Xe du lịch Đà Lạt',
      vehicleTypeEn: 'Da Lat tour coach',
      operator: 'Đối tác Đà Lạt',
      operatorEn: 'Da Lat local partner',
      notes: 'Điểm vườn hoa có thể đổi theo mùa để chọn nơi đang đẹp nhất.',
      notesEn: 'Flower-garden stops may change by season for the best bloom.',
    },
  }),
  createGeneratedDomesticTour(findDestination('phu-quoc'), {
    tourCode: 'VN-PQC-043',
    name: 'Phú Quốc Hòn Thơm - VinWonders - Safari 4 Ngày 3 Đêm',
    intro:
      'Tour Phú Quốc thiên về giải trí và gia đình: cáp treo Hòn Thơm, VinWonders, Safari và nghỉ dưỡng biển trong một hành trình trọn gói.',
    focus: 'giải trí, công viên chủ đề, cáp treo Hòn Thơm và nghỉ dưỡng biển',
    suitableFor: 'gia đình có trẻ nhỏ, nhóm bạn và khách thích vui chơi giải trí',
    price: 6_250_000,
    duration: '4 ngày 3 đêm',
    availableSeats: 80,
    tourType: 'Tour Gia Đình',
    departurePoint: 'Phú Quốc',
    highlights: [
      'Cáp treo Hòn Thơm vượt biển dài bậc nhất thế giới',
      'Một ngày tại VinWonders và Safari Phú Quốc',
      'Tắm biển và nghỉ dưỡng resort Nam đảo',
      'Ngắm hoàng hôn Sunset Town và chợ đêm',
    ],
    gallery: [...IMAGES.phuQuoc],
    itinerary: [
      {
        title: 'Phú Quốc - Nhận phòng - Bãi biển',
        description:
          'Đón khách tại sân bay, nhận phòng resort, tự do tắm biển và nghỉ ngơi làm quen nhịp chuyến đi.',
        accommodation: 'Resort Phú Quốc theo gói',
        transport: 'Xe du lịch',
        activities: ['Nhận phòng resort', 'Tắm biển', 'Nghỉ dưỡng'],
      },
      {
        title: 'Hòn Thơm - Sunset Town',
        description:
          'Đi cáp treo Hòn Thơm, vui chơi bãi biển đảo, chiều về Sunset Town ngắm hoàng hôn và chợ đêm.',
        accommodation: 'Resort Phú Quốc theo gói',
        transport: 'Xe du lịch và cáp treo',
        activities: ['Cáp treo Hòn Thơm', 'Bãi biển đảo', 'Sunset Town'],
      },
      {
        title: 'VinWonders - Safari',
        description:
          'Cả ngày vui chơi VinWonders và Safari Phú Quốc với thế giới động vật bán hoang dã và các trò chơi.',
        accommodation: 'Resort Phú Quốc theo gói',
        transport: 'Xe du lịch',
        activities: ['VinWonders', 'Safari Phú Quốc', 'Trò chơi giải trí'],
      },
      {
        title: 'Nam Đảo - Tiễn khách',
        description:
          'Tham quan Nam đảo, nhà thùng nước mắm, mua đặc sản và tiễn khách tại sân bay Phú Quốc.',
        transport: 'Xe du lịch',
        activities: ['Nam đảo', 'Nhà thùng nước mắm', 'Mua đặc sản'],
      },
    ],
    faqs: [
      {
        question: 'Vé VinWonders và Safari đã bao gồm chưa?',
        answer:
          'Tùy gói khách chọn. Seed phân biệt rõ vé công viên giải trí giữa gói tiêu chuẩn và nâng cấp.',
      },
      {
        question: 'Tour có phù hợp trẻ nhỏ không?',
        answer:
          'Rất phù hợp. Đây là tuyến thiên về giải trí gia đình, nhiều hoạt động cho trẻ và thời gian nghỉ dưỡng.',
      },
    ],
    ticketPolicy: {
      included: ['Cáp treo Hòn Thơm theo gói', 'Vé tham quan Nam đảo theo lịch trình'],
      optional: ['Vé VinWonders, Safari nếu không ghi rõ trong gói đã chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.PRIVATE_CAR,
      vehicleType: 'Xe du lịch trên đảo Phú Quốc',
      vehicleTypeEn: 'On-island coach in Phu Quoc',
      operator: 'Đối tác Phú Quốc',
      operatorEn: 'Phu Quoc local partner',
      notes: 'Vé máy bay ra đảo có thể bổ sung theo gói nếu khách yêu cầu.',
      notesEn: 'Flights to the island can be added per package on request.',
    },
  }),
  createGeneratedDomesticTour(findDestination('phu-quoc'), {
    tourCode: 'VN-PQC-044',
    name: 'Phú Quốc Câu Cá & Lặn Ngắm San Hô 4 Đảo 1 Ngày',
    intro:
      'Tour trong ngày khám phá Nam đảo Phú Quốc bằng cano: lặn ngắm san hô, câu cá và tắm biển tại các hòn đảo đẹp nhất.',
    focus: 'biển đảo Nam Phú Quốc, lặn ngắm san hô và câu cá',
    suitableFor: 'nhóm bạn, gia đình và khách muốn một ngày biển đảo năng động',
    price: 1_350_000,
    duration: '1 ngày',
    availableSeats: 90,
    tourType: 'Khám Phá',
    departurePoint: 'Phú Quốc',
    highlights: [
      'Cano khám phá 3-4 hòn đảo Nam Phú Quốc',
      'Lặn ngắm san hô tại Hòn Móng Tay, Hòn Gầm Ghì',
      'Câu cá cùng ngư dân và tắm biển',
      'Bữa trưa hải sản trên cano hoặc trên đảo',
    ],
    gallery: rotateGallery([...IMAGES.phuQuoc], 1),
    itinerary: [
      {
        title: 'Phú Quốc - Tour 4 đảo - Phú Quốc',
        description:
          'Đón khách ra cảng, lên cano khám phá các hòn đảo Nam đảo, lặn ngắm san hô, câu cá, tắm biển và trở về trong chiều.',
        transport: 'Xe du lịch và cano',
        activities: ['Cano 4 đảo', 'Lặn ngắm san hô', 'Câu cá và tắm biển'],
      },
    ],
    faqs: [
      {
        question: 'Không biết bơi có tham gia được không?',
        answer:
          'Được. Khách có áo phao, kính lặn và nhân viên hỗ trợ tại khu vực nông an toàn.',
      },
      {
        question: 'Mang theo gì khi đi tour đảo?',
        answer:
          'Nên mang đồ bơi, kem chống nắng, mũ và máy ảnh chống nước nếu muốn lưu lại khoảnh khắc dưới biển.',
      },
    ],
    ticketPolicy: {
      included: [
        'Cano tham quan các đảo',
        'Dụng cụ lặn ngắm san hô',
        'Dụng cụ câu cá',
      ],
      optional: ['Lặn bình khí hoặc dù bay nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.COMBO,
      vehicleType: 'Xe du lịch + cano tour 4 đảo',
      vehicleTypeEn: 'Coach plus 4-island speedboat tour',
      operator: 'Đối tác Nam đảo Phú Quốc',
      operatorEn: 'Southern Phu Quoc partner',
      notes: 'Lịch cano phụ thuộc điều kiện sóng và điều phối bến.',
      notesEn: 'Speedboat schedule depends on sea conditions and pier control.',
    },
  }),
  // ── Tour bay thẳng từ hub Hà Nội/TP.HCM cho các điểm đến trước đây chỉ khởi
  // hành tại chỗ (Đà Lạt, Phú Quốc, Nha Trang, Quy Nhơn, Huế) ──────────────────
  createGeneratedDomesticTour(findDestination('da-lat'), {
    tourCode: 'VN-DLI-047',
    name: 'Đà Lạt Thành Phố Ngàn Hoa 3 Ngày 2 Đêm (Bay Từ Hà Nội)',
    intro:
      'Trọn gói bay thẳng Hà Nội - Đà Lạt, tận hưởng khí hậu se lạnh, đồi chè, thác nước và những vườn hoa rực rỡ của thành phố ngàn hoa.',
    focus: 'khí hậu mát lạnh, đồi chè Cầu Đất, hồ Xuân Hương và vườn hoa Đà Lạt',
    suitableFor:
      'khách miền Bắc muốn trọn gói bay thẳng, cặp đôi và gia đình thích nghỉ dưỡng',
    price: 5_490_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 70,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'Hà Nội',
    highlights: [
      'Bay thẳng khứ hồi Hà Nội - Đà Lạt, xe đón tại sân bay Liên Khương',
      'Săn mây và ngắm bình minh tại đồi chè Cầu Đất',
      'Dạo hồ Xuân Hương, quảng trường Lâm Viên và vườn hoa thành phố',
      'Khám phá Thung lũng Tình Yêu và thác Datanla',
    ],
    gallery: [...IMAGES.daLat],
    itinerary: [
      {
        title: 'Hà Nội - Đà Lạt - Quảng trường Lâm Viên',
        description:
          'Đón khách tại sân bay Nội Bài, bay vào Liên Khương, xe đón về Đà Lạt nhận phòng, chiều dạo hồ Xuân Hương và quảng trường Lâm Viên.',
        accommodation: 'Khách sạn Đà Lạt theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay Hà Nội - Đà Lạt', 'Hồ Xuân Hương', 'Quảng trường Lâm Viên'],
      },
      {
        title: 'Đồi chè Cầu Đất - Thung lũng Tình Yêu',
        description:
          'Săn mây sớm tại đồi chè Cầu Đất, tham quan Thung lũng Tình Yêu, vườn hoa và các điểm check-in nổi tiếng, tối tự do chợ đêm Đà Lạt.',
        accommodation: 'Khách sạn Đà Lạt theo gói',
        transport: 'Xe du lịch',
        activities: ['Đồi chè Cầu Đất', 'Thung lũng Tình Yêu', 'Chợ đêm Đà Lạt'],
      },
      {
        title: 'Thác Datanla - Đà Lạt - Hà Nội',
        description:
          'Trải nghiệm thác Datanla, mua đặc sản Đà Lạt, xe tiễn ra sân bay Liên Khương bay về Hà Nội.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Thác Datanla', 'Mua đặc sản', 'Bay Đà Lạt - Hà Nội'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi Hà Nội - Đà Lạt (sân bay Liên Khương) hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành.',
      },
      {
        question: 'Đà Lạt thời tiết thế nào, cần mang gì?',
        answer:
          'Đà Lạt mát lạnh quanh năm, buổi sáng và tối khá lạnh; khách nên mang áo ấm nhẹ và giày đi bộ thoải mái.',
      },
    ],
    ticketPolicy: {
      included: ['Vé tham quan Thung lũng Tình Yêu, thác Datanla', 'Xe đưa đón sân bay'],
      optional: ['Vé máng trượt Datanla nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi Hà Nội - Đà Lạt + xe tham quan',
      vehicleTypeEn: 'Round-trip Hanoi - Da Lat flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Đà Lạt',
      operatorEn: 'Domestic airline plus Da Lat partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Liên Khương.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Lien Khuong airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('da-lat'), {
    tourCode: 'VN-DLI-048',
    name: 'Đà Lạt Thành Phố Ngàn Hoa 3 Ngày 2 Đêm (Bay Từ TP.HCM)',
    intro:
      'Trọn gói bay thẳng TP.HCM - Đà Lạt, tận hưởng khí hậu se lạnh, đồi chè, thác nước và những vườn hoa rực rỡ của thành phố ngàn hoa.',
    focus: 'khí hậu mát lạnh, đồi chè Cầu Đất, hồ Xuân Hương và vườn hoa Đà Lạt',
    suitableFor:
      'khách miền Nam muốn trọn gói bay thẳng, cặp đôi và gia đình thích nghỉ dưỡng',
    price: 4_990_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 70,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'TP.HCM',
    highlights: [
      'Bay thẳng khứ hồi TP.HCM - Đà Lạt, xe đón tại sân bay Liên Khương',
      'Săn mây và ngắm bình minh tại đồi chè Cầu Đất',
      'Dạo hồ Xuân Hương, quảng trường Lâm Viên và vườn hoa thành phố',
      'Khám phá Thung lũng Tình Yêu và thác Datanla',
    ],
    gallery: rotateGallery([...IMAGES.daLat], 1),
    itinerary: [
      {
        title: 'TP.HCM - Đà Lạt - Quảng trường Lâm Viên',
        description:
          'Đón khách tại sân bay Tân Sơn Nhất, bay vào Liên Khương, xe đón về Đà Lạt nhận phòng, chiều dạo hồ Xuân Hương và quảng trường Lâm Viên.',
        accommodation: 'Khách sạn Đà Lạt theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay TP.HCM - Đà Lạt', 'Hồ Xuân Hương', 'Quảng trường Lâm Viên'],
      },
      {
        title: 'Đồi chè Cầu Đất - Thung lũng Tình Yêu',
        description:
          'Săn mây sớm tại đồi chè Cầu Đất, tham quan Thung lũng Tình Yêu, vườn hoa và các điểm check-in nổi tiếng, tối tự do chợ đêm Đà Lạt.',
        accommodation: 'Khách sạn Đà Lạt theo gói',
        transport: 'Xe du lịch',
        activities: ['Đồi chè Cầu Đất', 'Thung lũng Tình Yêu', 'Chợ đêm Đà Lạt'],
      },
      {
        title: 'Thác Datanla - Đà Lạt - TP.HCM',
        description:
          'Trải nghiệm thác Datanla, mua đặc sản Đà Lạt, xe tiễn ra sân bay Liên Khương bay về TP.HCM.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Thác Datanla', 'Mua đặc sản', 'Bay Đà Lạt - TP.HCM'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi TP.HCM - Đà Lạt (sân bay Liên Khương) hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành.',
      },
      {
        question: 'Đà Lạt thời tiết thế nào, cần mang gì?',
        answer:
          'Đà Lạt mát lạnh quanh năm, buổi sáng và tối khá lạnh; khách nên mang áo ấm nhẹ và giày đi bộ thoải mái.',
      },
    ],
    ticketPolicy: {
      included: ['Vé tham quan Thung lũng Tình Yêu, thác Datanla', 'Xe đưa đón sân bay'],
      optional: ['Vé máng trượt Datanla nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi TP.HCM - Đà Lạt + xe tham quan',
      vehicleTypeEn: 'Round-trip Ho Chi Minh City - Da Lat flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Đà Lạt',
      operatorEn: 'Domestic airline plus Da Lat partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Liên Khương.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Lien Khuong airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('phu-quoc'), {
    tourCode: 'VN-PQC-049',
    name: 'Phú Quốc Đảo Ngọc 4 Ngày 3 Đêm (Bay Từ Hà Nội)',
    intro:
      'Trọn gói bay thẳng Hà Nội - Phú Quốc, nghỉ dưỡng đảo ngọc với cáp treo Hòn Thơm, Bãi Sao và khu vui chơi Nam đảo.',
    focus: 'biển đảo nghỉ dưỡng, cáp treo Hòn Thơm, Bãi Sao và Grand World',
    suitableFor:
      'khách miền Bắc muốn trọn gói bay thẳng, gia đình và cặp đôi nghỉ dưỡng biển',
    price: 7_990_000,
    duration: '4 ngày 3 đêm',
    availableSeats: 70,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'Hà Nội',
    highlights: [
      'Bay thẳng khứ hồi Hà Nội - Phú Quốc, xe đón tại sân bay',
      'Cáp treo Hòn Thơm vượt biển dài nhất thế giới',
      'Tắm biển Bãi Sao và khám phá Nam đảo',
      'Dạo Grand World và chợ đêm Phú Quốc',
    ],
    gallery: [...IMAGES.phuQuoc],
    itinerary: [
      {
        title: 'Hà Nội - Phú Quốc - Bãi biển',
        description:
          'Đón khách tại sân bay Nội Bài, bay ra Phú Quốc, xe đón về resort nhận phòng, tự do tắm biển và ngắm hoàng hôn.',
        accommodation: 'Resort/khách sạn Phú Quốc theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay Hà Nội - Phú Quốc', 'Tắm biển', 'Hoàng hôn Phú Quốc'],
      },
      {
        title: 'Cáp treo Hòn Thơm - Nam đảo',
        description:
          'Đi cáp treo Hòn Thơm, vui chơi công viên biển, khám phá các điểm Nam đảo và tắm biển Bãi Sao.',
        accommodation: 'Resort/khách sạn Phú Quốc theo gói',
        transport: 'Xe du lịch và cáp treo',
        activities: ['Cáp treo Hòn Thơm', 'Bãi Sao', 'Nam đảo'],
      },
      {
        title: 'Grand World - Tự do',
        description:
          'Tham quan Grand World, tự do nghỉ dưỡng hoặc trải nghiệm thêm các show, tối dạo chợ đêm Phú Quốc.',
        accommodation: 'Resort/khách sạn Phú Quốc theo gói',
        transport: 'Xe du lịch',
        activities: ['Grand World', 'Tự do nghỉ dưỡng', 'Chợ đêm Phú Quốc'],
      },
      {
        title: 'Phú Quốc - Hà Nội',
        description:
          'Tự do mua đặc sản, xe tiễn ra sân bay Phú Quốc bay về Hà Nội.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Mua đặc sản', 'Bay Phú Quốc - Hà Nội'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi Hà Nội - Phú Quốc hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành tùy hãng.',
      },
      {
        question: 'Đi Phú Quốc mùa nào đẹp?',
        answer:
          'Khoảng tháng 11 đến tháng 4 biển êm, nắng đẹp, thuận lợi cho tắm biển và các hoạt động đảo.',
      },
    ],
    ticketPolicy: {
      included: ['Cáp treo Hòn Thơm khứ hồi', 'Vé Grand World', 'Xe đưa đón sân bay'],
      optional: ['Các trò chơi công viên biển nâng cấp nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi Hà Nội - Phú Quốc + xe tham quan',
      vehicleTypeEn: 'Round-trip Hanoi - Phu Quoc flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Phú Quốc',
      operatorEn: 'Domestic airline plus Phu Quoc partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Phú Quốc.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Phu Quoc airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('phu-quoc'), {
    tourCode: 'VN-PQC-050',
    name: 'Phú Quốc Đảo Ngọc 4 Ngày 3 Đêm (Bay Từ TP.HCM)',
    intro:
      'Trọn gói bay thẳng TP.HCM - Phú Quốc, nghỉ dưỡng đảo ngọc với cáp treo Hòn Thơm, Bãi Sao và khu vui chơi Nam đảo.',
    focus: 'biển đảo nghỉ dưỡng, cáp treo Hòn Thơm, Bãi Sao và Grand World',
    suitableFor:
      'khách miền Nam muốn trọn gói bay thẳng, gia đình và cặp đôi nghỉ dưỡng biển',
    price: 6_990_000,
    duration: '4 ngày 3 đêm',
    availableSeats: 70,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'TP.HCM',
    highlights: [
      'Bay thẳng khứ hồi TP.HCM - Phú Quốc, xe đón tại sân bay',
      'Cáp treo Hòn Thơm vượt biển dài nhất thế giới',
      'Tắm biển Bãi Sao và khám phá Nam đảo',
      'Dạo Grand World và chợ đêm Phú Quốc',
    ],
    gallery: rotateGallery([...IMAGES.phuQuoc], 2),
    itinerary: [
      {
        title: 'TP.HCM - Phú Quốc - Bãi biển',
        description:
          'Đón khách tại sân bay Tân Sơn Nhất, bay ra Phú Quốc, xe đón về resort nhận phòng, tự do tắm biển và ngắm hoàng hôn.',
        accommodation: 'Resort/khách sạn Phú Quốc theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay TP.HCM - Phú Quốc', 'Tắm biển', 'Hoàng hôn Phú Quốc'],
      },
      {
        title: 'Cáp treo Hòn Thơm - Nam đảo',
        description:
          'Đi cáp treo Hòn Thơm, vui chơi công viên biển, khám phá các điểm Nam đảo và tắm biển Bãi Sao.',
        accommodation: 'Resort/khách sạn Phú Quốc theo gói',
        transport: 'Xe du lịch và cáp treo',
        activities: ['Cáp treo Hòn Thơm', 'Bãi Sao', 'Nam đảo'],
      },
      {
        title: 'Grand World - Tự do',
        description:
          'Tham quan Grand World, tự do nghỉ dưỡng hoặc trải nghiệm thêm các show, tối dạo chợ đêm Phú Quốc.',
        accommodation: 'Resort/khách sạn Phú Quốc theo gói',
        transport: 'Xe du lịch',
        activities: ['Grand World', 'Tự do nghỉ dưỡng', 'Chợ đêm Phú Quốc'],
      },
      {
        title: 'Phú Quốc - TP.HCM',
        description:
          'Tự do mua đặc sản, xe tiễn ra sân bay Phú Quốc bay về TP.HCM.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Mua đặc sản', 'Bay Phú Quốc - TP.HCM'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi TP.HCM - Phú Quốc hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành tùy hãng.',
      },
      {
        question: 'Đi Phú Quốc mùa nào đẹp?',
        answer:
          'Khoảng tháng 11 đến tháng 4 biển êm, nắng đẹp, thuận lợi cho tắm biển và các hoạt động đảo.',
      },
    ],
    ticketPolicy: {
      included: ['Cáp treo Hòn Thơm khứ hồi', 'Vé Grand World', 'Xe đưa đón sân bay'],
      optional: ['Các trò chơi công viên biển nâng cấp nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi TP.HCM - Phú Quốc + xe tham quan',
      vehicleTypeEn: 'Round-trip Ho Chi Minh City - Phu Quoc flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Phú Quốc',
      operatorEn: 'Domestic airline plus Phu Quoc partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Phú Quốc.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Phu Quoc airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('nha-trang'), {
    tourCode: 'VN-NTR-051',
    name: 'Nha Trang Biển Xanh 3 Ngày 2 Đêm (Bay Từ Hà Nội)',
    intro:
      'Trọn gói bay thẳng Hà Nội - Nha Trang, tận hưởng biển xanh, tour 4 đảo, tắm bùn khoáng và di sản Tháp Bà Ponagar.',
    focus: 'biển đảo Nha Trang, tour 4 đảo, tắm bùn khoáng và Tháp Bà Ponagar',
    suitableFor:
      'khách miền Bắc muốn trọn gói bay thẳng, gia đình và nhóm bạn thích biển',
    price: 5_690_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 70,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'Hà Nội',
    highlights: [
      'Bay thẳng khứ hồi Hà Nội - Nha Trang, xe đón tại sân bay Cam Ranh',
      'Tour 4 đảo và lặn ngắm san hô vịnh Nha Trang',
      'Tắm bùn khoáng nóng thư giãn',
      'Tham quan Tháp Bà Ponagar và nhà thờ Núi',
    ],
    gallery: [...IMAGES.nhaTrang],
    itinerary: [
      {
        title: 'Hà Nội - Nha Trang - Tháp Bà Ponagar',
        description:
          'Đón khách tại sân bay Nội Bài, bay vào Cam Ranh, xe đón về Nha Trang nhận phòng, chiều tham quan Tháp Bà Ponagar và nhà thờ Núi.',
        accommodation: 'Khách sạn Nha Trang theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay Hà Nội - Nha Trang', 'Tháp Bà Ponagar', 'Nhà thờ Núi'],
      },
      {
        title: 'Tour 4 đảo - Tắm bùn',
        description:
          'Đi cano tour 4 đảo, lặn ngắm san hô và tắm biển, chiều trải nghiệm tắm bùn khoáng nóng thư giãn.',
        accommodation: 'Khách sạn Nha Trang theo gói',
        transport: 'Xe du lịch và cano',
        activities: ['Tour 4 đảo', 'Lặn ngắm san hô', 'Tắm bùn khoáng'],
      },
      {
        title: 'Nha Trang - Hà Nội',
        description:
          'Tự do tắm biển buổi sáng, mua đặc sản, xe tiễn ra sân bay Cam Ranh bay về Hà Nội.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Tắm biển', 'Mua đặc sản', 'Bay Nha Trang - Hà Nội'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi Hà Nội - Nha Trang (sân bay Cam Ranh) hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành.',
      },
      {
        question: 'Sân bay Cam Ranh cách trung tâm Nha Trang bao xa?',
        answer:
          'Khoảng 35km, xe đưa đón mất chừng 45 phút theo cung đường ven biển rất đẹp.',
      },
    ],
    ticketPolicy: {
      included: ['Cano tour 4 đảo', 'Vé Tháp Bà Ponagar', 'Xe đưa đón sân bay'],
      optional: ['Vé tắm bùn khoáng nâng cấp nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi Hà Nội - Nha Trang + xe tham quan',
      vehicleTypeEn: 'Round-trip Hanoi - Nha Trang flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Nha Trang',
      operatorEn: 'Domestic airline plus Nha Trang partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Cam Ranh.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Cam Ranh airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('nha-trang'), {
    tourCode: 'VN-NTR-052',
    name: 'Nha Trang Biển Xanh 3 Ngày 2 Đêm (Bay Từ TP.HCM)',
    intro:
      'Trọn gói bay thẳng TP.HCM - Nha Trang, tận hưởng biển xanh, tour 4 đảo, tắm bùn khoáng và di sản Tháp Bà Ponagar.',
    focus: 'biển đảo Nha Trang, tour 4 đảo, tắm bùn khoáng và Tháp Bà Ponagar',
    suitableFor:
      'khách miền Nam muốn trọn gói bay thẳng, gia đình và nhóm bạn thích biển',
    price: 5_190_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 70,
    tourType: 'Nghỉ Dưỡng',
    departurePoint: 'TP.HCM',
    highlights: [
      'Bay thẳng khứ hồi TP.HCM - Nha Trang, xe đón tại sân bay Cam Ranh',
      'Tour 4 đảo và lặn ngắm san hô vịnh Nha Trang',
      'Tắm bùn khoáng nóng thư giãn',
      'Tham quan Tháp Bà Ponagar và nhà thờ Núi',
    ],
    gallery: rotateGallery([...IMAGES.nhaTrang], 1),
    itinerary: [
      {
        title: 'TP.HCM - Nha Trang - Tháp Bà Ponagar',
        description:
          'Đón khách tại sân bay Tân Sơn Nhất, bay vào Cam Ranh, xe đón về Nha Trang nhận phòng, chiều tham quan Tháp Bà Ponagar và nhà thờ Núi.',
        accommodation: 'Khách sạn Nha Trang theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay TP.HCM - Nha Trang', 'Tháp Bà Ponagar', 'Nhà thờ Núi'],
      },
      {
        title: 'Tour 4 đảo - Tắm bùn',
        description:
          'Đi cano tour 4 đảo, lặn ngắm san hô và tắm biển, chiều trải nghiệm tắm bùn khoáng nóng thư giãn.',
        accommodation: 'Khách sạn Nha Trang theo gói',
        transport: 'Xe du lịch và cano',
        activities: ['Tour 4 đảo', 'Lặn ngắm san hô', 'Tắm bùn khoáng'],
      },
      {
        title: 'Nha Trang - TP.HCM',
        description:
          'Tự do tắm biển buổi sáng, mua đặc sản, xe tiễn ra sân bay Cam Ranh bay về TP.HCM.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Tắm biển', 'Mua đặc sản', 'Bay Nha Trang - TP.HCM'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi TP.HCM - Nha Trang (sân bay Cam Ranh) hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành.',
      },
      {
        question: 'Sân bay Cam Ranh cách trung tâm Nha Trang bao xa?',
        answer:
          'Khoảng 35km, xe đưa đón mất chừng 45 phút theo cung đường ven biển rất đẹp.',
      },
    ],
    ticketPolicy: {
      included: ['Cano tour 4 đảo', 'Vé Tháp Bà Ponagar', 'Xe đưa đón sân bay'],
      optional: ['Vé tắm bùn khoáng nâng cấp nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi TP.HCM - Nha Trang + xe tham quan',
      vehicleTypeEn: 'Round-trip Ho Chi Minh City - Nha Trang flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Nha Trang',
      operatorEn: 'Domestic airline plus Nha Trang partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Cam Ranh.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Cam Ranh airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('quy-nhon'), {
    tourCode: 'VN-UIH-053',
    name: 'Quy Nhơn Eo Gió - Kỳ Co 3 Ngày 2 Đêm (Bay Từ Hà Nội)',
    intro:
      'Trọn gói bay thẳng Hà Nội - Quy Nhơn, khám phá Eo Gió, biển Kỳ Co và các điểm check-in hoang sơ của xứ Nẫu.',
    focus: 'biển hoang sơ Eo Gió, Kỳ Co, Tháp Đôi và Ghềnh Ráng Tiên Sa',
    suitableFor:
      'khách miền Bắc muốn trọn gói bay thẳng, nhóm bạn và gia đình thích khám phá',
    price: 5_390_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 65,
    tourType: 'Khám Phá',
    departurePoint: 'Hà Nội',
    highlights: [
      'Bay thẳng khứ hồi Hà Nội - Quy Nhơn, xe đón tại sân bay Phù Cát',
      'Cano ra biển Kỳ Co nước xanh ngọc bích',
      'Check-in Eo Gió - một trong những cung biển đẹp nhất',
      'Tham quan Tháp Đôi và Ghềnh Ráng Tiên Sa',
    ],
    gallery: [...IMAGES.quyNhon],
    itinerary: [
      {
        title: 'Hà Nội - Quy Nhơn - Ghềnh Ráng',
        description:
          'Đón khách tại sân bay Nội Bài, bay vào Phù Cát, xe đón về Quy Nhơn nhận phòng, chiều thăm Ghềnh Ráng Tiên Sa và mộ Hàn Mặc Tử.',
        accommodation: 'Khách sạn Quy Nhơn theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay Hà Nội - Quy Nhơn', 'Ghềnh Ráng Tiên Sa', 'Tháp Đôi'],
      },
      {
        title: 'Eo Gió - Kỳ Co',
        description:
          'Tham quan Eo Gió, đi cano ra biển Kỳ Co tắm biển và lặn ngắm san hô, thưởng thức hải sản địa phương.',
        accommodation: 'Khách sạn Quy Nhơn theo gói',
        transport: 'Xe du lịch và cano',
        activities: ['Eo Gió', 'Biển Kỳ Co', 'Lặn ngắm san hô'],
      },
      {
        title: 'Quy Nhơn - Hà Nội',
        description:
          'Tự do tắm biển buổi sáng, mua đặc sản xứ Nẫu, xe tiễn ra sân bay Phù Cát bay về Hà Nội.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Tắm biển', 'Mua đặc sản', 'Bay Quy Nhơn - Hà Nội'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi Hà Nội - Quy Nhơn (sân bay Phù Cát) hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành.',
      },
      {
        question: 'Biển Kỳ Co di chuyển thế nào?',
        answer:
          'Khách đi cano hoặc đường bộ kết hợp; lịch cano phụ thuộc thời tiết biển và sẽ được sắp xếp linh hoạt.',
      },
    ],
    ticketPolicy: {
      included: ['Cano ra biển Kỳ Co', 'Vé tham quan Eo Gió, Tháp Đôi', 'Xe đưa đón sân bay'],
      optional: ['Trải nghiệm lặn bình khí nâng cấp nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi Hà Nội - Quy Nhơn + xe tham quan',
      vehicleTypeEn: 'Round-trip Hanoi - Quy Nhon flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Quy Nhơn',
      operatorEn: 'Domestic airline plus Quy Nhon partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Phù Cát.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Phu Cat airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('quy-nhon'), {
    tourCode: 'VN-UIH-054',
    name: 'Quy Nhơn Eo Gió - Kỳ Co 3 Ngày 2 Đêm (Bay Từ TP.HCM)',
    intro:
      'Trọn gói bay thẳng TP.HCM - Quy Nhơn, khám phá Eo Gió, biển Kỳ Co và các điểm check-in hoang sơ của xứ Nẫu.',
    focus: 'biển hoang sơ Eo Gió, Kỳ Co, Tháp Đôi và Ghềnh Ráng Tiên Sa',
    suitableFor:
      'khách miền Nam muốn trọn gói bay thẳng, nhóm bạn và gia đình thích khám phá',
    price: 4_890_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 65,
    tourType: 'Khám Phá',
    departurePoint: 'TP.HCM',
    highlights: [
      'Bay thẳng khứ hồi TP.HCM - Quy Nhơn, xe đón tại sân bay Phù Cát',
      'Cano ra biển Kỳ Co nước xanh ngọc bích',
      'Check-in Eo Gió - một trong những cung biển đẹp nhất',
      'Tham quan Tháp Đôi và Ghềnh Ráng Tiên Sa',
    ],
    gallery: rotateGallery([...IMAGES.quyNhon], 1),
    itinerary: [
      {
        title: 'TP.HCM - Quy Nhơn - Ghềnh Ráng',
        description:
          'Đón khách tại sân bay Tân Sơn Nhất, bay vào Phù Cát, xe đón về Quy Nhơn nhận phòng, chiều thăm Ghềnh Ráng Tiên Sa và mộ Hàn Mặc Tử.',
        accommodation: 'Khách sạn Quy Nhơn theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay TP.HCM - Quy Nhơn', 'Ghềnh Ráng Tiên Sa', 'Tháp Đôi'],
      },
      {
        title: 'Eo Gió - Kỳ Co',
        description:
          'Tham quan Eo Gió, đi cano ra biển Kỳ Co tắm biển và lặn ngắm san hô, thưởng thức hải sản địa phương.',
        accommodation: 'Khách sạn Quy Nhơn theo gói',
        transport: 'Xe du lịch và cano',
        activities: ['Eo Gió', 'Biển Kỳ Co', 'Lặn ngắm san hô'],
      },
      {
        title: 'Quy Nhơn - TP.HCM',
        description:
          'Tự do tắm biển buổi sáng, mua đặc sản xứ Nẫu, xe tiễn ra sân bay Phù Cát bay về TP.HCM.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Tắm biển', 'Mua đặc sản', 'Bay Quy Nhơn - TP.HCM'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi TP.HCM - Quy Nhơn (sân bay Phù Cát) hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành.',
      },
      {
        question: 'Biển Kỳ Co di chuyển thế nào?',
        answer:
          'Khách đi cano hoặc đường bộ kết hợp; lịch cano phụ thuộc thời tiết biển và sẽ được sắp xếp linh hoạt.',
      },
    ],
    ticketPolicy: {
      included: ['Cano ra biển Kỳ Co', 'Vé tham quan Eo Gió, Tháp Đôi', 'Xe đưa đón sân bay'],
      optional: ['Trải nghiệm lặn bình khí nâng cấp nếu khách chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi TP.HCM - Quy Nhơn + xe tham quan',
      vehicleTypeEn: 'Round-trip Ho Chi Minh City - Quy Nhon flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Quy Nhơn',
      operatorEn: 'Domestic airline plus Quy Nhon partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Phù Cát.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Phu Cat airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('hue'), {
    tourCode: 'VN-HUE-055',
    name: 'Huế Cố Đô Di Sản 3 Ngày 2 Đêm (Bay Từ Hà Nội)',
    intro:
      'Trọn gói bay thẳng Hà Nội - Huế, khám phá Đại Nội, lăng tẩm các vua Nguyễn, chùa Thiên Mụ và ẩm thực cố đô.',
    focus: 'di sản cố đô Huế, Đại Nội, lăng tẩm và sông Hương',
    suitableFor:
      'khách miền Bắc muốn trọn gói bay thẳng, khách yêu văn hóa và gia đình',
    price: 5_290_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 65,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'Hà Nội',
    highlights: [
      'Bay thẳng khứ hồi Hà Nội - Huế, xe đón tại sân bay Phú Bài',
      'Tham quan Đại Nội - Hoàng thành triều Nguyễn',
      'Viếng lăng Khải Định và lăng Tự Đức',
      'Du thuyền sông Hương nghe ca Huế',
    ],
    gallery: [...IMAGES.hue],
    itinerary: [
      {
        title: 'Hà Nội - Huế - Đại Nội',
        description:
          'Đón khách tại sân bay Nội Bài, bay vào Phú Bài, xe đón về Huế nhận phòng, chiều tham quan Đại Nội và chùa Thiên Mụ.',
        accommodation: 'Khách sạn Huế theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay Hà Nội - Huế', 'Đại Nội', 'Chùa Thiên Mụ'],
      },
      {
        title: 'Lăng tẩm - Ca Huế sông Hương',
        description:
          'Tham quan lăng Khải Định và lăng Tự Đức, chiều tự do, tối du thuyền sông Hương nghe ca Huế.',
        accommodation: 'Khách sạn Huế theo gói',
        transport: 'Xe du lịch và thuyền rồng',
        activities: ['Lăng Khải Định', 'Lăng Tự Đức', 'Ca Huế sông Hương'],
      },
      {
        title: 'Chợ Đông Ba - Huế - Hà Nội',
        description:
          'Dạo chợ Đông Ba mua đặc sản, thưởng thức ẩm thực Huế, xe tiễn ra sân bay Phú Bài bay về Hà Nội.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Chợ Đông Ba', 'Ẩm thực Huế', 'Bay Huế - Hà Nội'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi Hà Nội - Huế (sân bay Phú Bài) hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành.',
      },
      {
        question: 'Có thể ghép thêm Đà Nẵng - Hội An không?',
        answer:
          'Có thể. Huế cách Đà Nẵng khoảng 100km; khách muốn đi liên tuyến có thể liên hệ để được tư vấn nối tour.',
      },
    ],
    ticketPolicy: {
      included: ['Vé Đại Nội', 'Vé lăng Khải Định và lăng Tự Đức', 'Xe đưa đón sân bay'],
      optional: ['Vé du thuyền nghe ca Huế nếu không ghi rõ trong gói đã chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi Hà Nội - Huế + xe tham quan',
      vehicleTypeEn: 'Round-trip Hanoi - Hue flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Huế',
      operatorEn: 'Domestic airline plus Hue partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Phú Bài.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Phu Bai airport.',
    },
  }),
  createGeneratedDomesticTour(findDestination('hue'), {
    tourCode: 'VN-HUE-056',
    name: 'Huế Cố Đô Di Sản 3 Ngày 2 Đêm (Bay Từ TP.HCM)',
    intro:
      'Trọn gói bay thẳng TP.HCM - Huế, khám phá Đại Nội, lăng tẩm các vua Nguyễn, chùa Thiên Mụ và ẩm thực cố đô.',
    focus: 'di sản cố đô Huế, Đại Nội, lăng tẩm và sông Hương',
    suitableFor:
      'khách miền Nam muốn trọn gói bay thẳng, khách yêu văn hóa và gia đình',
    price: 5_490_000,
    duration: '3 ngày 2 đêm',
    availableSeats: 65,
    tourType: 'Văn Hóa & Lịch Sử',
    departurePoint: 'TP.HCM',
    highlights: [
      'Bay thẳng khứ hồi TP.HCM - Huế, xe đón tại sân bay Phú Bài',
      'Tham quan Đại Nội - Hoàng thành triều Nguyễn',
      'Viếng lăng Khải Định và lăng Tự Đức',
      'Du thuyền sông Hương nghe ca Huế',
    ],
    gallery: rotateGallery([...IMAGES.hue], 1),
    itinerary: [
      {
        title: 'TP.HCM - Huế - Đại Nội',
        description:
          'Đón khách tại sân bay Tân Sơn Nhất, bay vào Phú Bài, xe đón về Huế nhận phòng, chiều tham quan Đại Nội và chùa Thiên Mụ.',
        accommodation: 'Khách sạn Huế theo gói',
        transport: 'Máy bay và xe du lịch',
        activities: ['Bay TP.HCM - Huế', 'Đại Nội', 'Chùa Thiên Mụ'],
      },
      {
        title: 'Lăng tẩm - Ca Huế sông Hương',
        description:
          'Tham quan lăng Khải Định và lăng Tự Đức, chiều tự do, tối du thuyền sông Hương nghe ca Huế.',
        accommodation: 'Khách sạn Huế theo gói',
        transport: 'Xe du lịch và thuyền rồng',
        activities: ['Lăng Khải Định', 'Lăng Tự Đức', 'Ca Huế sông Hương'],
      },
      {
        title: 'Chợ Đông Ba - Huế - TP.HCM',
        description:
          'Dạo chợ Đông Ba mua đặc sản, thưởng thức ẩm thực Huế, xe tiễn ra sân bay Phú Bài bay về TP.HCM.',
        transport: 'Xe du lịch và máy bay',
        activities: ['Chợ Đông Ba', 'Ẩm thực Huế', 'Bay Huế - TP.HCM'],
      },
    ],
    faqs: [
      {
        question: 'Giá tour đã gồm vé máy bay chưa?',
        answer:
          'Đã gồm vé máy bay khứ hồi TP.HCM - Huế (sân bay Phú Bài) hạng phổ thông theo đoàn. Giờ bay xác nhận trước ngày khởi hành.',
      },
      {
        question: 'Có thể ghép thêm Đà Nẵng - Hội An không?',
        answer:
          'Có thể. Huế cách Đà Nẵng khoảng 100km; khách muốn đi liên tuyến có thể liên hệ để được tư vấn nối tour.',
      },
    ],
    ticketPolicy: {
      included: ['Vé Đại Nội', 'Vé lăng Khải Định và lăng Tự Đức', 'Xe đưa đón sân bay'],
      optional: ['Vé du thuyền nghe ca Huế nếu không ghi rõ trong gói đã chọn'],
    },
    transport: {
      ...DEFAULT_DOMESTIC_TRANSPORT,
      type: TransportType.FLIGHT,
      vehicleType: 'Vé máy bay khứ hồi TP.HCM - Huế + xe tham quan',
      vehicleTypeEn: 'Round-trip Ho Chi Minh City - Hue flight plus tour coach',
      operator: 'Hãng hàng không nội địa + đối tác Huế',
      operatorEn: 'Domestic airline plus Hue partner',
      notes: 'Giờ bay phụ thuộc xác nhận của hãng; xe đón tại sân bay Phú Bài.',
      notesEn: 'Flight times subject to airline confirmation; pick-up at Phu Bai airport.',
    },
  }),
];

// Điểm khởi hành/đón là hub khi khách xuất phát từ thành phố trung tâm (lái xe
// được); các giá trị khác là thành phố điểm đến (khách bay tới, đón tại chỗ).
const HUB_DEPARTURE_POINTS = new Set(['Hà Nội', 'TP.HCM', 'Nhà hát Lớn Hà Nội']);

const LOCATION_EN: Record<string, string> = {
  'Hà Nội': 'Hanoi',
  'Nhà hát Lớn Hà Nội': 'Hanoi Opera House',
  'TP.HCM': 'Ho Chi Minh City',
  'Đồng Hới': 'Dong Hoi',
  Huế: 'Hue',
  'Đà Nẵng': 'Da Nang',
  'Nha Trang': 'Nha Trang',
  'Đà Lạt': 'Da Lat',
  'Phú Quốc': 'Phu Quoc',
  'Quy Nhơn': 'Quy Nhon',
  'Tuy Hòa': 'Tuy Hoa',
};

function locationEn(vi: string): string {
  return LOCATION_EN[vi] ?? vi;
}

const TRANSPORT_EN: Record<string, string> = {
  'Xe du lịch': 'Tour coach',
  'Xe du lịch theo chương trình': 'Tour coach per itinerary',
  'Xe limousine': 'Limousine',
  'Xe du lịch/limousine': 'Tour coach or limousine',
  'Xe limousine hoặc xe du lịch': 'Limousine or tour coach',
  'Xe du lịch và đi bộ trong phố cổ': 'Tour coach and walking in the Old Quarter',
  'Xe du lịch và đi bộ đường dài': 'Tour coach and trekking',
  'Xe limousine và đi bộ đường dài': 'Limousine and trekking',
  'Đi bộ và xe limousine': 'Trekking and limousine',
  'Xe du lịch và du thuyền': 'Tour coach and cruise',
  'Du thuyền và xe du lịch': 'Cruise and tour coach',
  'Xe du lịch và thuyền': 'Tour coach and boat',
  'Xe du lịch và thuyền chèo tay': 'Tour coach and rowing boat',
  'Xe du lịch và thuyền rồng': 'Tour coach and dragon boat',
  'Xe du lịch và thuyền thúng': 'Tour coach and basket boat',
  'Xe du lịch và thuyền địa phương': 'Tour coach and local boat',
  'Xe du lịch và thuyền Tràng An': 'Tour coach and Trang An boat',
  'Xe du lịch và cáp treo': 'Tour coach and cable car',
  'Xe du lịch và cáp treo theo gói': 'Tour coach and package-based cable car',
  'Xe du lịch và cáp treo Yên Tử': 'Tour coach and Yen Tu cable car',
  'Xe du lịch và cáp treo tự túc/nâng cấp theo gói':
    'Tour coach and cable car (self-paid or upgraded by package)',
  'Xe du lịch và tàu': 'Tour coach and boat',
  'Tàu và xe du lịch': 'Boat and tour coach',
  'Xe du lịch và cano': 'Tour coach and speedboat',
  'Xe du lịch và cano cao tốc': 'Tour coach and high-speed speedboat',
  'Xe du lịch và cano/tàu theo điều kiện':
    'Tour coach and speedboat or boat depending on conditions',
};

// Trả null khi chưa có bản dịch curated → localizer dùng heuristic fallback.
function translateTransport(vi: string): string | null {
  return TRANSPORT_EN[vi] ?? null;
}

function departureData(
  basePrice: number,
  baseSeats: number,
  boardingPoint: string,
  transportSeed: DomesticTransportSeed,
) {
  const offsets = [21, 35, 49, 70];
  return offsets.map((offset, index) => {
    const departureDate = addDays(offset);
    const boardingTime = new Date(departureDate);
    boardingTime.setHours(7, 0, 0, 0);
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
      transport: {
        create: {
          type: transportSeed.type,
          vehicleType: transportSeed.vehicleType,
          vehicleTypeEn: transportSeed.vehicleTypeEn,
          operator: transportSeed.operator,
          operatorEn: transportSeed.operatorEn,
          boardingPoint,
          boardingPointEn: locationEn(boardingPoint),
          boardingTime,
          notes: transportSeed.notes,
          notesEn: transportSeed.notesEn,
        },
      },
    };
  });
}

export async function seedDomesticTours(prisma: PrismaClient) {
  const domesticTourSeeds = [
    ...baseDomesticTourSeeds,
    ...additionalHeroTours,
    ...newDomesticDestinationTours,
  ];

  for (const item of domesticTourSeeds) {
    const transportSeed =
      item.tour.transport ??
      TOUR_TRANSPORTS[item.tour.tourCode] ??
      DEFAULT_DOMESTIC_TRANSPORT;
    const ticketPolicy =
      item.tour.ticketPolicy ?? TOUR_TICKET_POLICIES[item.tour.tourCode];

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

    // Mô hình hub: điểm khởi hành là thành phố trung tâm khách xuất phát, KHÔNG trùng
    // điểm đến. Công ty đặt tại Hà Nội → Miền Bắc & Miền Trung khởi hành từ Hà Nội;
    // Miền Nam từ TP.HCM (đã có sẵn tuyến phía Nam). Tránh dữ liệu "đi Đà Nẵng, khởi
    // hành từ Đà Nẵng" và để bộ lọc theo điểm khởi hành (HN/HCM) hoạt động đúng.
    // Tôn trọng hub mà tour bay thẳng tự khai báo (Hà Nội/TP.HCM) để một điểm đến có
    // thể có nhiều điểm khởi hành (VD: Đà Nẵng/Phú Quốc bay từ cả hai miền). Nếu tour
    // không tự khai hub thì mặc định theo miền của điểm đến.
    const declaredHub =
      item.tour.departurePoint === 'TP.HCM'
        ? { vi: 'TP.HCM', en: 'Ho Chi Minh City' }
        : item.tour.departurePoint === 'Hà Nội'
          ? { vi: 'Hà Nội', en: 'Hanoi' }
          : null;
    const departureHub =
      declaredHub ??
      (item.destination.region === 'Miền Nam'
        ? { vi: 'TP.HCM', en: 'Ho Chi Minh City' }
        : { vi: 'Hà Nội', en: 'Hanoi' });

    // Tour lái xe được từ hub → giữ hub; tour bay tới (điểm khởi hành gốc là
    // thành phố điểm đến) → dùng đúng thành phố đó cho khớp boardingPoint + itinerary.
    const departure = HUB_DEPARTURE_POINTS.has(item.tour.departurePoint)
      ? departureHub
      : { vi: item.tour.departurePoint, en: locationEn(item.tour.departurePoint) };

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
        primaryTransport: transportSeed.type,
        departurePoint: departure.vi,
        departurePointEn: departure.en,
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
        primaryTransport: transportSeed.type,
        departurePoint: departure.vi,
        departurePointEn: departure.en,
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
      ...packageData(item.tour.price, ticketPolicy).map((pkg) =>
        prisma.tourPackage.create({
          data: {
            tourId: tour.id,
            ...pkg,
          },
        }),
      ),
      ...departureData(
        item.tour.price,
        Math.min(item.tour.availableSeats, 40),
        item.tour.departurePoint,
        transportSeed,
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
            transportEn: translateTransport(day.transport),
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
