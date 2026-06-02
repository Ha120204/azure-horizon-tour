import { Prisma, PrismaClient, TourStatus } from '@prisma/client';

type Region =
  | 'Dong Nam A'
  | 'Dong Bac A'
  | 'Trung Dong'
  | 'Chau Au';

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
    `Hanh trinh duoc thiet ke theo nhip vua phai, tap trung vao ${focus}. Lich trinh uu tien cac diem bieu tuong, thoi gian nghi hop ly, bua an theo chuong trinh va huong dan vien theo doan.`,
    '',
    `Tour phu hop voi ${suitableFor}. Gia seed co the hien thi tot cho demo dat tour, so sanh goi dich vu, ngay khoi hanh, voucher va quy trinh thanh toan.`,
  ].join('\n');
}

function packageData(basePrice: number) {
  return [
    {
      name: 'Gói Tiêu Chuẩn',
      description:
        'Goi can bang chi phi, phu hop khach muon lich trinh tron goi voi dich vu co ban ro rang.',
      price: basePrice,
      badge: 'BEST VALUE',
      includes: [
        'Ve may bay khu hoi theo chuong trinh',
        'Khach san tieu chuan 3 sao hoac tuong duong',
        'Xe dua don va tham quan theo lich trinh',
        'Huong dan vien tieng Viet theo doan',
        'Bua an va ve tham quan theo chuong trinh',
        'Bao hiem du lich quoc te co ban',
      ],
      excludes: [
        'Ho chieu va chi phi ca nhan',
        'Visa neu chuong trinh khong ghi bao gom',
        'Hanh ly qua cuoc, tien tip va dich vu ngoai lich trinh',
      ],
      sortOrder: 0,
    },
    {
      name: 'Gói Cao Cấp',
      description:
        'Nang cap khach san, bua an va ho tro thu tuc de hanh trinh thoai mai hon.',
      price: Math.round(basePrice * 1.25),
      badge: 'POPULAR',
      includes: [
        'Ve may bay khu hoi gio bay dep hon theo tinh trang cho',
        'Khach san tieu chuan 4 sao hoac tuong duong',
        'Xe dua don va tham quan theo lich trinh',
        'Huong dan vien kinh nghiem',
        'Bua an nang cap va ve tham quan theo chuong trinh',
        'Ho tro ho so visa neu can',
        'Bao hiem du lich quoc te muc cao hon',
      ],
      excludes: [
        'Ho chieu va chi phi ca nhan',
        'Dich vu ngoai chuong trinh',
        'Phu thu phong don neu co',
      ],
      sortOrder: 1,
    },
    {
      name: 'Gói Riêng Tư',
      description:
        'Dich vu linh hoat hon cho gia dinh hoac nhom nho muon rieng tu va chu dong thoi gian.',
      price: Math.round(basePrice * 1.62),
      badge: 'LUXURY',
      includes: [
        'Ve may bay khu hoi theo tu van rieng',
        'Khach san 4-5 sao tuy diem den',
        'Xe rieng trong lich trinh tham quan',
        'Huong dan vien rieng tai diem den neu phu hop',
        'Ho tro dieu chinh lich trinh truoc khoi hanh',
        'Bao hiem du lich quoc te muc cao',
      ],
      excludes: [
        'Ho chieu va chi phi ca nhan',
        'Dich vu phat sinh ngoai hop dong',
        'Nang hang ve may bay neu khach yeu cau',
      ],
      sortOrder: 2,
    },
  ];
}

function buildTimeline(day: DayPlan): Prisma.InputJsonValue {
  return [
    { time: '07:00', activity: 'Dung bua sang va chuan bi khoi hanh' },
    { time: '09:00', activity: day.activities[0] ?? 'Tham quan diem chinh' },
    { time: '12:00', activity: 'Dung bua trua theo chuong trinh' },
    { time: '14:00', activity: day.activities[1] ?? 'Tiep tuc tham quan' },
    { time: '19:00', activity: 'Dung bua toi va nghi ngoi' },
  ];
}

const internationalTours: InternationalTourSeed[] = [
  {
    destination: {
      name: 'Bangkok - Pattaya',
      slug: 'bangkok-pattaya',
      region: 'Dong Nam A',
      countryCode: 'TH',
      description:
        'Tuyen Thai Lan pho bien voi chua Wat Arun, city tour Bangkok, mua sam, Pattaya va cac hoat dong giai tri ven bien.',
      imageUrl: IMAGES.bangkokPattaya[0],
    },
    tour: {
      tourCode: 'INT-THA-001',
      name: 'Thai Lan Bangkok - Pattaya 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Thai Lan kinh dien cho khach Viet, ket hop Bangkok, Pattaya, chua Wat Arun, mua sam va cac diem giai tri noi bat.',
        'van hoa Thai Lan, city tour, mua sam va nghi duong ngan ngay',
        'gia dinh, nhom ban, khach lan dau di nuoc ngoai va khach muon tour gia de tiep can',
      ),
      price: 9_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 120,
      imageUrl: IMAGES.bangkokPattaya[0],
      tourType: 'Khám Phá',
      departurePoint: 'Ha Noi',
      highlights: [
        'Tham quan chua Wat Arun va cac diem bieu tuong Bangkok',
        'Trai nghiem Pattaya va khong gian bien Thai Lan',
        'Co thoi gian mua sam tai cac trung tam lon',
        'Lich trinh de di, phu hop khach lan dau di tour nuoc ngoai',
      ],
      gallery: [...IMAGES.bangkokPattaya],
      itinerary: [
        {
          title: 'Viet Nam - Bangkok',
          description:
            'Lam thu tuc bay sang Bangkok, don khach tai san bay, dung bua toi va nhan phong nghi ngoi.',
          accommodation: 'Khach san Bangkok theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Bay Viet Nam - Bangkok', 'Dung bua toi Thai Lan'],
          imageUrl: IMAGES.bangkokPattaya[0],
        },
        {
          title: 'Bangkok city tour',
          description:
            'Tham quan chua Wat Arun, cac diem trung tam Bangkok va tu do mua sam theo lich trinh.',
          accommodation: 'Khach san Bangkok theo goi',
          transport: 'Xe du lich',
          activities: ['Wat Arun', 'City tour Bangkok', 'Mua sam'],
          imageUrl: IMAGES.bangkokPattaya[1],
        },
        {
          title: 'Bangkok - Pattaya',
          description:
            'Di chuyen den Pattaya, tham quan diem giai tri, nghi dem tai thanh pho bien.',
          accommodation: 'Khach san Pattaya theo goi',
          transport: 'Xe du lich',
          activities: ['Di chuyen Bangkok - Pattaya', 'Bien Pattaya', 'Tu do buoi toi'],
          imageUrl: IMAGES.bangkokPattaya[2],
        },
        {
          title: 'Pattaya - Bangkok',
          description:
            'Tra phong, mua dac san, quay lai Bangkok va chuan bi hanh trinh ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Mua dac san', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.bangkokPattaya[0],
        },
      ],
      faqs: [
        { question: 'Tour Thai Lan co can visa khong?', answer: 'Khach Viet Nam du lich ngan ngay tai Thai Lan thuong khong can visa, tuy nhien ho chieu phai con han theo quy dinh.' },
        { question: 'Gia da bao gom ve may bay chua?', answer: 'Seed nay thiet ke theo tour tron goi, ve may bay nam trong danh sach bao gom cua tung goi.' },
      ],
    },
  },
  {
    destination: {
      name: 'Singapore - Malaysia',
      slug: 'singapore-malaysia',
      region: 'Dong Nam A',
      countryCode: 'SG-MY',
      description:
        'Tuyen lien tuyen pho bien ket hop Singapore hien dai voi Kuala Lumpur, Genting va Malacca cua Malaysia.',
      imageUrl: IMAGES.singaporeMalaysia[0],
    },
    tour: {
      tourCode: 'INT-SGMY-002',
      name: 'Singapore - Malaysia 5 Ngay 4 Dem',
      description: buildDescription(
        'Hanh trinh Singapore - Malaysia ket hop Marina Bay, Gardens by the Bay, Kuala Lumpur, Petronas Towers va cao nguyen Genting.',
        'do thi hien dai, cong trinh bieu tuong, mua sam va giai tri gia dinh',
        'gia dinh, nhom ban, khach muon mot tour Dong Nam A sach dep, de demo va nhieu diem check-in',
      ),
      price: 14_500_000,
      duration: '5 ngay 4 dem',
      availableSeats: 100,
      imageUrl: IMAGES.singaporeMalaysia[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Ha Noi',
      highlights: [
        'Check-in Marina Bay va Gardens by the Bay',
        'Tham quan Petronas Towers tai Kuala Lumpur',
        'Trai nghiem Genting hoac Malacca theo lich trinh',
        'Lien tuyen 2 quoc gia, phu hop tour gia dinh',
      ],
      gallery: [...IMAGES.singaporeMalaysia],
      itinerary: [
        {
          title: 'Viet Nam - Singapore',
          description:
            'Bay den Singapore, tham quan khu Marina Bay, Merlion va nghi dem tai Singapore.',
          accommodation: 'Khach san Singapore theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Marina Bay', 'Merlion Park', 'Singapore ve dem'],
          imageUrl: IMAGES.singaporeMalaysia[0],
        },
        {
          title: 'Singapore city tour',
          description:
            'Tham quan Gardens by the Bay, khu trung tam va cac diem mua sam noi bat.',
          accommodation: 'Khach san Singapore theo goi',
          transport: 'Xe du lich',
          activities: ['Gardens by the Bay', 'City tour Singapore', 'Mua sam'],
          imageUrl: IMAGES.singaporeMalaysia[0],
        },
        {
          title: 'Singapore - Kuala Lumpur',
          description:
            'Di chuyen sang Malaysia, tham quan Kuala Lumpur va Petronas Towers.',
          accommodation: 'Khach san Kuala Lumpur theo goi',
          transport: 'Xe du lich',
          activities: ['Kuala Lumpur', 'Petronas Towers', 'Am thuc Malaysia'],
          imageUrl: IMAGES.singaporeMalaysia[1],
        },
        {
          title: 'Genting/Malacca - Viet Nam',
          description:
            'Tham quan cao nguyen Genting hoac Malacca theo chuong trinh, sau do bay ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Genting hoac Malacca', 'Mua dac san', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.singaporeMalaysia[2],
        },
      ],
      faqs: [
        { question: 'Tour co qua bien gioi Singapore - Malaysia bang gi?', answer: 'Thong thuong di bang xe du lich theo doan, huong dan vien ho tro thu tuc xuat nhap canh.' },
        { question: 'Co can visa Singapore/Malaysia khong?', answer: 'Khach Viet Nam du lich ngan ngay thuong khong can visa, can ho chieu con han va dap ung quy dinh nhap canh.' },
      ],
    },
  },
  {
    destination: {
      name: 'Bali',
      slug: 'bali',
      region: 'Dong Nam A',
      countryCode: 'ID',
      description:
        'Dao nghi duong Indonesia noi tieng voi den Hindu, ruong bac thang Ubud, bien, resort va khong gian honeymoon.',
      imageUrl: IMAGES.bali[0],
    },
    tour: {
      tourCode: 'INT-IDN-003',
      name: 'Bali Ubud - Den Ulun Danu - Nghi Duong Bien 4 Ngay 3 Dem',
      description: buildDescription(
        'Tour Bali danh cho khach yeu nghi duong, ket hop Ubud, den Ulun Danu, ruong bac thang va thoi gian thu gian ben bien.',
        'nghi duong dao, van hoa Hindu Bali, ruong bac thang va resort bien',
        'cap doi, khach honeymoon, gia dinh va nhom ban muon lich trinh dep nhung khong qua gap',
      ),
      price: 16_900_000,
      duration: '4 ngay 3 dem',
      availableSeats: 80,
      imageUrl: IMAGES.bali[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'TP.HCM',
      highlights: [
        'Tham quan den Ulun Danu va canh quan Bali',
        'Trai nghiem Ubud va ruong bac thang',
        'Co thoi gian nghi duong bien',
        'Phu hop honeymoon va khach thich resort',
      ],
      gallery: [...IMAGES.bali],
      itinerary: [
        {
          title: 'Viet Nam - Bali',
          description:
            'Bay den Bali, don khach tai san bay, nhan phong va nghi ngoi tai resort/khach san.',
          accommodation: 'Khach san/resort Bali theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Bay den Bali', 'Nhan phong nghi duong'],
          imageUrl: IMAGES.bali[0],
        },
        {
          title: 'Den Ulun Danu - Ubud',
          description:
            'Tham quan den Ulun Danu, khu Ubud va cac diem van hoa dac trung cua Bali.',
          accommodation: 'Khach san/resort Bali theo goi',
          transport: 'Xe du lich',
          activities: ['Den Ulun Danu', 'Ubud', 'Am thuc Bali'],
          imageUrl: IMAGES.bali[0],
        },
        {
          title: 'Ruong bac thang - Nghi duong bien',
          description:
            'Check-in ruong bac thang, tu do nghi duong, tam bien hoac dung dich vu resort.',
          accommodation: 'Khach san/resort Bali theo goi',
          transport: 'Xe du lich',
          activities: ['Ruong bac thang', 'Nghi duong bien', 'Tu do thu gian'],
          imageUrl: IMAGES.bali[1],
        },
        {
          title: 'Bali - Viet Nam',
          description:
            'Tu do mua sam, tra phong va bay ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Mua qua dia phuong', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.bali[2],
        },
      ],
      faqs: [
        { question: 'Bali co can visa khong?', answer: 'Quy dinh visa co the thay doi theo thoi diem. Khach can duoc kiem tra ho chieu va quy dinh nhap canh truoc ngay khoi hanh.' },
        { question: 'Tour co phu hop honeymoon khong?', answer: 'Co. Lich trinh co nhieu thoi gian nghi duong va cac diem chup anh dep.' },
      ],
    },
  },
  {
    destination: {
      name: 'Dai Loan',
      slug: 'dai-loan',
      region: 'Dong Bac A',
      countryCode: 'TW',
      description:
        'Diem den dong bac A duoc ua chuong voi Dai Bac 101, cho dem, Cuu Phan, Dai Trung, Cao Hung va am thuc duong pho.',
      imageUrl: IMAGES.taiwan[0],
    },
    tour: {
      tourCode: 'INT-TWN-004',
      name: 'Dai Loan Dai Bac - Dai Trung - Cao Hung 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Dai Loan ket hop Dai Bac 101, cho dem, Cuu Phan, Dai Trung, Cao Hung va cac diem city tour pho bien.',
        'city tour, am thuc cho dem, mua sam va canh quan dong bac A',
        'khach tre, gia dinh, nhom ban va khach muon tour gan Viet Nam voi chi phi vua phai',
      ),
      price: 17_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 90,
      imageUrl: IMAGES.taiwan[0],
      tourType: 'Khám Phá',
      departurePoint: 'TP.HCM',
      highlights: [
        'Check-in Taipei 101',
        'Trai nghiem cho dem va am thuc Dai Loan',
        'Tham quan Cuu Phan/Dai Trung/Cao Hung theo lich',
        'Tuyen tour pho bien, de ban cho khach Viet',
      ],
      gallery: [...IMAGES.taiwan],
      itinerary: [
        {
          title: 'Viet Nam - Dai Bac',
          description:
            'Bay den Dai Bac, nhan phong va trai nghiem cho dem theo thoi gian den.',
          accommodation: 'Khach san Dai Bac theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Bay den Dai Bac', 'Cho dem Dai Loan'],
          imageUrl: IMAGES.taiwan[0],
        },
        {
          title: 'Dai Bac city tour',
          description:
            'Tham quan Taipei 101, cac diem trung tam va khu mua sam.',
          accommodation: 'Khach san Dai Bac theo goi',
          transport: 'Xe du lich',
          activities: ['Taipei 101', 'City tour Dai Bac', 'Mua sam'],
          imageUrl: IMAGES.taiwan[1],
        },
        {
          title: 'Cuu Phan - Dai Trung',
          description:
            'Kham pha pho co Cuu Phan hoac diem phu hop thoi tiet, di chuyen den Dai Trung.',
          accommodation: 'Khach san Dai Trung theo goi',
          transport: 'Xe du lich',
          activities: ['Cuu Phan', 'Dai Trung', 'Am thuc dia phuong'],
          imageUrl: IMAGES.taiwan[2],
        },
        {
          title: 'Cao Hung - Viet Nam',
          description:
            'Tham quan Cao Hung, mua dac san va bay ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Cao Hung', 'Mua dac san', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.taiwan[0],
        },
      ],
      faqs: [
        { question: 'Tour Dai Loan co can visa khong?', answer: 'Tuy ho so khach va quy dinh tai thoi diem dat tour. He thong seed nen ghi ro can tu van visa truoc khoi hanh.' },
        { question: 'Cho dem co nam trong lich trinh khong?', answer: 'Co. Mot so buoi toi co thoi gian cho khach trai nghiem cho dem va am thuc dia phuong.' },
      ],
    },
  },
  {
    destination: {
      name: 'Hong Kong - Macau',
      slug: 'hong-kong-macau',
      region: 'Dong Bac A',
      countryCode: 'HK-MO',
      description:
        'Lien tuyen do thi noi tieng voi skyline Hong Kong, Victoria Harbour, mua sam va di san Ruins of St. Paul tai Macau.',
      imageUrl: IMAGES.hongKongMacau[0],
    },
    tour: {
      tourCode: 'INT-HKMO-005',
      name: 'Hong Kong - Macau 4 Ngay 3 Dem',
      description: buildDescription(
        'Tour Hong Kong - Macau ket hop Victoria Harbour, cac khu mua sam, city tour Hong Kong va di san Ruins of St. Paul tai Macau.',
        'do thi chau A, mua sam, am thuc Quang Dong va di san Macau',
        'khach thich city break, mua sam, gia dinh va nhom ban muon tour ngan ngay',
      ),
      price: 18_900_000,
      duration: '4 ngay 3 dem',
      availableSeats: 80,
      imageUrl: IMAGES.hongKongMacau[0],
      tourType: 'Nghỉ Dưỡng',
      departurePoint: 'Ha Noi',
      highlights: [
        'Ngam skyline Hong Kong va Victoria Harbour',
        'Tham quan cac khu mua sam noi bat',
        'Di chuyen sang Macau va check-in Ruins of St. Paul',
        'Lich trinh ngan, phu hop ky nghi ngan ngay',
      ],
      gallery: [...IMAGES.hongKongMacau],
      itinerary: [
        {
          title: 'Viet Nam - Hong Kong',
          description:
            'Bay den Hong Kong, don khach, nhan phong va tu do kham pha khu trung tam.',
          accommodation: 'Khach san Hong Kong theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Bay den Hong Kong', 'Victoria Harbour'],
          imageUrl: IMAGES.hongKongMacau[0],
        },
        {
          title: 'Hong Kong city tour',
          description:
            'Tham quan cac diem bieu tuong, khu mua sam va diem ngam canh theo chuong trinh.',
          accommodation: 'Khach san Hong Kong theo goi',
          transport: 'Xe du lich',
          activities: ['City tour Hong Kong', 'Mua sam', 'Am thuc Quang Dong'],
          imageUrl: IMAGES.hongKongMacau[0],
        },
        {
          title: 'Hong Kong - Macau',
          description:
            'Di chuyen sang Macau, tham quan Ruins of St. Paul va cac diem di san noi bat.',
          accommodation: 'Khach san Macau/Hong Kong theo goi',
          transport: 'Xe du lich va tau/cau duong bien',
          activities: ['Macau', 'Ruins of St. Paul', 'Di san Macau'],
          imageUrl: IMAGES.hongKongMacau[1],
        },
        {
          title: 'Macau/Hong Kong - Viet Nam',
          description:
            'Mua dac san, tra phong va bay ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Mua dac san', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.hongKongMacau[2],
        },
      ],
      faqs: [
        { question: 'Tour co di ca Hong Kong va Macau khong?', answer: 'Co. Lich trinh seed co day du hai diem, co the dieu chinh so dem tuy san pham thuc te.' },
        { question: 'Co can visa khong?', answer: 'Quy dinh nhap canh can duoc kiem tra theo ho chieu va thoi diem khoi hanh.' },
      ],
    },
  },
  {
    destination: {
      name: 'Seoul - Nami',
      slug: 'seoul-nami',
      region: 'Dong Bac A',
      countryCode: 'KR',
      description:
        'Tuyen Han Quoc pho bien voi Seoul, Gyeongbokgung, dao Nami, mua sam, am thuc va cong vien giai tri theo mua.',
      imageUrl: IMAGES.seoulNami[0],
    },
    tour: {
      tourCode: 'INT-KOR-006',
      name: 'Han Quoc Seoul - Nami - Everland 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Han Quoc ket hop cung dien Gyeongbokgung, dao Nami, mua sam Seoul va Everland hoac diem thay the theo mua.',
        'van hoa Han Quoc, canh quan theo mua, mua sam va trai nghiem giai tri',
        'gia dinh, khach tre, nhom ban va khach yeu K-culture',
      ),
      price: 22_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 100,
      imageUrl: IMAGES.seoulNami[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'TP.HCM',
      highlights: [
        'Tham quan Gyeongbokgung va trung tam Seoul',
        'Check-in dao Nami theo mua',
        'Trai nghiem Everland hoac diem giai tri phu hop',
        'Mua sam my pham, nhan sam va dac san Han Quoc',
      ],
      gallery: [...IMAGES.seoulNami],
      itinerary: [
        {
          title: 'Viet Nam - Seoul',
          description:
            'Bay den Seoul, don khach, nhan phong va nghi ngoi.',
          accommodation: 'Khach san Seoul theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Bay den Seoul', 'Nhan phong nghi ngoi'],
          imageUrl: IMAGES.seoulNami[0],
        },
        {
          title: 'Gyeongbokgung - Seoul city tour',
          description:
            'Tham quan cung dien Gyeongbokgung, khu trung tam va cac diem van hoa Seoul.',
          accommodation: 'Khach san Seoul theo goi',
          transport: 'Xe du lich',
          activities: ['Gyeongbokgung', 'City tour Seoul', 'Am thuc Han Quoc'],
          imageUrl: IMAGES.seoulNami[1],
        },
        {
          title: 'Dao Nami - Everland',
          description:
            'Di dao Nami, tiep tuc Everland hoac diem thay the theo thoi tiet va mua.',
          accommodation: 'Khach san Seoul theo goi',
          transport: 'Xe du lich',
          activities: ['Dao Nami', 'Everland', 'Mua sam'],
          imageUrl: IMAGES.seoulNami[2],
        },
        {
          title: 'Seoul - Viet Nam',
          description:
            'Mua sam dac san, hoan tat thu tuc va bay ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Mua sam', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.seoulNami[0],
        },
      ],
      faqs: [
        { question: 'Tour Han Quoc co can visa khong?', answer: 'Thuong can visa hoac dieu kien nhap canh phu hop. Khach can nop ho so theo huong dan truoc ngay khoi hanh.' },
        { question: 'Dao Nami mua nao dep?', answer: 'Xuan, thu va dong deu co diem hap dan rieng; seed phu hop demo quanh nam.' },
      ],
    },
  },
  {
    destination: {
      name: 'Tokyo - Fuji',
      slug: 'tokyo-fuji',
      region: 'Dong Bac A',
      countryCode: 'JP',
      description:
        'Tuyen Nhat Ban kinh dien voi Tokyo, nui Phu Si, Hakone, mua sam va trai nghiem van hoa do thi Nhat.',
      imageUrl: IMAGES.tokyoFuji[0],
    },
    tour: {
      tourCode: 'INT-JPN-007',
      name: 'Nhat Ban Tokyo - Fuji - Hakone 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Nhat Ban tuyen Tokyo - Fuji - Hakone, phu hop khach lan dau den Nhat voi cac diem bieu tuong va thoi gian mua sam.',
        'nui Phu Si, do thi Tokyo, van hoa Nhat va mua sam',
        'gia dinh, cap doi, nhom ban va khach muon san pham Nhat Ban kinh dien',
      ),
      price: 32_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 90,
      imageUrl: IMAGES.tokyoFuji[0],
      tourType: 'Khám Phá',
      departurePoint: 'Ha Noi',
      highlights: [
        'Ngam nui Phu Si va khu Hakone/Fuji Five Lakes',
        'City tour Tokyo voi cac khu pho bieu tuong',
        'Trai nghiem am thuc va mua sam Nhat Ban',
        'Tuyen tour de demo phan khuc gia cao',
      ],
      gallery: [...IMAGES.tokyoFuji],
      itinerary: [
        {
          title: 'Viet Nam - Tokyo',
          description:
            'Bay den Tokyo, don khach va nghi ngoi tai khach san.',
          accommodation: 'Khach san Tokyo theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Bay den Tokyo', 'Nhan phong nghi ngoi'],
          imageUrl: IMAGES.tokyoFuji[2],
        },
        {
          title: 'Tokyo city tour',
          description:
            'Tham quan cac khu pho bieu tuong, den chua/noi mua sam theo lich trinh.',
          accommodation: 'Khach san Tokyo theo goi',
          transport: 'Xe du lich',
          activities: ['City tour Tokyo', 'Mua sam', 'Am thuc Nhat'],
          imageUrl: IMAGES.tokyoFuji[0],
        },
        {
          title: 'Fuji - Hakone',
          description:
            'Di chuyen khu nui Phu Si, tham quan diem ngam canh va nghi ngoi.',
          accommodation: 'Khach san khu Fuji/Hakone theo goi',
          transport: 'Xe du lich',
          activities: ['Nui Phu Si', 'Hakone', 'Canh quan Nhat Ban'],
          imageUrl: IMAGES.tokyoFuji[1],
        },
        {
          title: 'Tokyo - Viet Nam',
          description:
            'Mua sam, tra phong va bay ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Mua sam', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.tokyoFuji[2],
        },
      ],
      faqs: [
        { question: 'Tour Nhat Ban co can visa khong?', answer: 'Thong thuong can visa Nhat Ban. Khach can ho chieu con han va ho so theo yeu cau.' },
        { question: 'Co dam bao thay nui Phu Si khong?', answer: 'Canh nui Phu Si phu thuoc thoi tiet. Neu suong/mua, lich trinh van giu diem tham quan nhung tam nhin co the han che.' },
      ],
    },
  },
  {
    destination: {
      name: 'Osaka - Kyoto',
      slug: 'osaka-kyoto',
      region: 'Dong Bac A',
      countryCode: 'JP',
      description:
        'Tuyen Kansai noi bat voi Osaka Castle, Kyoto, Arashiyama, den chua, am thuc va nhung diem van hoa co kinh cua Nhat Ban.',
      imageUrl: IMAGES.osakaKyoto[0],
    },
    tour: {
      tourCode: 'INT-JPN-008',
      name: 'Nhat Ban Osaka - Kyoto - Nara 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Kansai ket hop Osaka, Kyoto, Nara voi Osaka Castle, Arashiyama, den chua va cac khu pho am thuc noi tieng.',
        'van hoa co do Nhat Ban, thanh pho Osaka, den chua va am thuc Kansai',
        'khach yeu van hoa Nhat, gia dinh va nhom ban muon tuyen Nhat khac Tokyo',
      ),
      price: 34_500_000,
      duration: '5 ngay 4 dem',
      availableSeats: 90,
      imageUrl: IMAGES.osakaKyoto[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'Ha Noi',
      highlights: [
        'Tham quan Osaka Castle',
        'Kham pha Kyoto va rung tre Arashiyama',
        'Trai nghiem Nara hoac den chua theo lich trinh',
        'Thuong thuc am thuc Kansai',
      ],
      gallery: [...IMAGES.osakaKyoto],
      itinerary: [
        {
          title: 'Viet Nam - Osaka',
          description:
            'Bay den Osaka, don khach va nhan phong nghi ngoi.',
          accommodation: 'Khach san Osaka theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Bay den Osaka', 'Nhan phong nghi ngoi'],
          imageUrl: IMAGES.osakaKyoto[1],
        },
        {
          title: 'Osaka city tour',
          description:
            'Tham quan Osaka Castle, khu trung tam va diem am thuc theo chuong trinh.',
          accommodation: 'Khach san Osaka theo goi',
          transport: 'Xe du lich',
          activities: ['Osaka Castle', 'Dotonbori', 'Am thuc Kansai'],
          imageUrl: IMAGES.osakaKyoto[1],
        },
        {
          title: 'Kyoto - Arashiyama',
          description:
            'Kham pha Kyoto, rung tre Arashiyama va cac diem van hoa co kinh.',
          accommodation: 'Khach san Osaka/Kyoto theo goi',
          transport: 'Xe du lich',
          activities: ['Kyoto', 'Arashiyama Bamboo Grove', 'Den chua Nhat Ban'],
          imageUrl: IMAGES.osakaKyoto[0],
        },
        {
          title: 'Nara - Viet Nam',
          description:
            'Tham quan Nara hoac diem thay the theo mua, mua sam va bay ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Nara', 'Mua sam', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.osakaKyoto[2],
        },
      ],
      faqs: [
        { question: 'Tour Osaka - Kyoto khac Tokyo - Fuji nhu the nao?', answer: 'Tuyen Kansai nghieng ve van hoa co do, den chua va am thuc; Tokyo - Fuji nghieng ve do thi hien dai va nui Phu Si.' },
        { question: 'Co can visa Nhat Ban khong?', answer: 'Co. Khach can chuan bi ho so visa theo yeu cau truoc ngay khoi hanh.' },
      ],
    },
  },
  {
    destination: {
      name: 'Dubai - Abu Dhabi',
      slug: 'dubai-abu-dhabi',
      region: 'Trung Dong',
      countryCode: 'AE',
      description:
        'Tuyen Trung Dong cao cap voi Burj Khalifa, Dubai Mall, sa mac, Abu Dhabi va Sheikh Zayed Grand Mosque.',
      imageUrl: IMAGES.dubaiAbuDhabi[0],
    },
    tour: {
      tourCode: 'INT-UAE-009',
      name: 'Dubai - Abu Dhabi 5 Ngay 4 Dem',
      description: buildDescription(
        'Tour Dubai - Abu Dhabi ket hop cong trinh hien dai, sa mac, mua sam va dai thanh duong Sheikh Zayed tai Abu Dhabi.',
        'kien truc hien dai, desert safari, mua sam va trai nghiem Trung Dong',
        'khach cao cap, gia dinh, nhom ban va khach muon diem den khac biet de demo phan khuc gia cao',
      ),
      price: 29_900_000,
      duration: '5 ngay 4 dem',
      availableSeats: 80,
      imageUrl: IMAGES.dubaiAbuDhabi[0],
      tourType: 'Tour Cao Cấp',
      departurePoint: 'Ha Noi',
      highlights: [
        'Check-in Burj Khalifa va Dubai skyline',
        'Trai nghiem desert safari theo chuong trinh',
        'Tham quan Sheikh Zayed Grand Mosque tai Abu Dhabi',
        'Mua sam tai Dubai Mall hoac cac khu thuong mai lon',
      ],
      gallery: [...IMAGES.dubaiAbuDhabi],
      itinerary: [
        {
          title: 'Viet Nam - Dubai',
          description:
            'Bay den Dubai, don khach, nhan phong va nghi ngoi.',
          accommodation: 'Khach san Dubai theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Bay den Dubai', 'Nhan phong nghi ngoi'],
          imageUrl: IMAGES.dubaiAbuDhabi[0],
        },
        {
          title: 'Dubai city tour',
          description:
            'Tham quan Burj Khalifa, Dubai Mall va cac diem bieu tuong cua Dubai.',
          accommodation: 'Khach san Dubai theo goi',
          transport: 'Xe du lich',
          activities: ['Burj Khalifa', 'Dubai Mall', 'Dubai skyline'],
          imageUrl: IMAGES.dubaiAbuDhabi[0],
        },
        {
          title: 'Desert safari',
          description:
            'Trai nghiem sa mac theo chuong trinh, dung bua toi va thuong thuc hoat dong giai tri dia phuong.',
          accommodation: 'Khach san Dubai theo goi',
          transport: 'Xe du lich/chuyen dung theo lich',
          activities: ['Desert safari', 'Bua toi sa mac', 'Giai tri dia phuong'],
          imageUrl: IMAGES.dubaiAbuDhabi[2],
        },
        {
          title: 'Abu Dhabi - Viet Nam',
          description:
            'Tham quan Sheikh Zayed Grand Mosque tai Abu Dhabi, sau do bay ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Abu Dhabi', 'Sheikh Zayed Grand Mosque', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.dubaiAbuDhabi[1],
        },
      ],
      faqs: [
        { question: 'Tour Dubai co can visa khong?', answer: 'Tuy ho chieu va quy dinh tai thoi diem khoi hanh. Nha to chuc can tu van visa truoc khi xac nhan booking.' },
        { question: 'Desert safari co bat buoc khong?', answer: 'Khong. Khach co van de suc khoe co the duoc tu van hoat dong thay the phu hop.' },
      ],
    },
  },
  {
    destination: {
      name: 'Paris - Brussels - Amsterdam',
      slug: 'paris-brussels-amsterdam',
      region: 'Chau Au',
      countryCode: 'FR-BE-NL',
      description:
        'Tuyen chau Au kinh dien ket hop Paris, Brussels va Amsterdam voi thap Eiffel, pho co chau Au, kenh dao va van hoa Tay Au.',
      imageUrl: IMAGES.europeClassic[0],
    },
    tour: {
      tourCode: 'INT-EUR-010',
      name: 'Chau Au Paris - Brussels - Amsterdam 8 Ngay 7 Dem',
      description: buildDescription(
        'Tour chau Au kinh dien cho khach Viet, ket hop Paris, Brussels, Amsterdam, cac cong trinh bieu tuong va trai nghiem do thi Tay Au.',
        'kien truc chau Au, city tour, van hoa Tay Au va mua sam',
        'khach co ngan sach cao, gia dinh, cap doi va khach muon san pham chau Au de demo cap do phuc tap hon',
      ),
      price: 59_900_000,
      duration: '8 ngay 7 dem',
      availableSeats: 70,
      imageUrl: IMAGES.europeClassic[0],
      tourType: 'Văn Hóa & Lịch Sử',
      departurePoint: 'TP.HCM',
      highlights: [
        'Check-in thap Eiffel va cac diem bieu tuong Paris',
        'Tham quan Brussels va khong gian pho co chau Au',
        'Trai nghiem Amsterdam voi kenh dao va city tour',
        'San pham phu hop phan khuc tour xa, gia tri cao',
      ],
      gallery: [...IMAGES.europeClassic],
      itinerary: [
        {
          title: 'Viet Nam - Paris',
          description:
            'Bay den Paris, don khach va nghi ngoi sau chang bay dai.',
          accommodation: 'Khach san Paris theo goi',
          transport: 'May bay va xe du lich',
          activities: ['Bay den Paris', 'Nhan phong nghi ngoi'],
          imageUrl: IMAGES.europeClassic[0],
        },
        {
          title: 'Paris city tour',
          description:
            'Tham quan thap Eiffel, cac dai lo va diem bieu tuong Paris theo lich trinh.',
          accommodation: 'Khach san Paris theo goi',
          transport: 'Xe du lich',
          activities: ['Thap Eiffel', 'City tour Paris', 'Mua sam'],
          imageUrl: IMAGES.europeClassic[0],
        },
        {
          title: 'Paris - Brussels',
          description:
            'Di chuyen den Brussels, tham quan trung tam va khong gian pho co chau Au.',
          accommodation: 'Khach san Brussels theo goi',
          transport: 'Xe du lich hoac tau theo lich',
          activities: ['Brussels', 'Pho co chau Au', 'Am thuc dia phuong'],
          imageUrl: IMAGES.europeClassic[1],
        },
        {
          title: 'Brussels - Amsterdam',
          description:
            'Tiep tuc den Amsterdam, tham quan thanh pho kenh dao va nghi dem.',
          accommodation: 'Khach san Amsterdam theo goi',
          transport: 'Xe du lich hoac tau theo lich',
          activities: ['Amsterdam', 'Kenh dao', 'City tour'],
          imageUrl: IMAGES.europeClassic[2],
        },
        {
          title: 'Amsterdam - Viet Nam',
          description:
            'Mua sam, tra phong va bay ve Viet Nam.',
          transport: 'Xe du lich va may bay',
          activities: ['Mua sam', 'Bay ve Viet Nam'],
          imageUrl: IMAGES.europeClassic[0],
        },
      ],
      faqs: [
        { question: 'Tour chau Au co can visa Schengen khong?', answer: 'Co. Khach can ho so visa Schengen va thoi gian xu ly du truoc ngay khoi hanh.' },
        { question: 'Gia co the thay doi theo ve may bay khong?', answer: 'Co. Tour xa phu thuoc nhieu vao gia ve, ty gia va tinh trang phong khach san.' },
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
      note: 'Lich khoi hanh dinh ky',
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
      where: { name: item.destination.name },
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
      ...departureData(item.tour.price, Math.min(item.tour.availableSeats, 36)).map(
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
            altText: `${item.tour.name} - anh ${index + 1}`,
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
