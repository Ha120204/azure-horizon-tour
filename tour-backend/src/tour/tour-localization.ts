export type SupportedLocale = 'vi' | 'en';
type UnknownRecord = Record<string, unknown>;

export const normalizeLocale = (locale?: string): SupportedLocale =>
  locale === 'en' ? 'en' : 'vi';

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const asRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;

const arrayValue = (record: UnknownRecord, key: string): unknown[] | undefined =>
  Array.isArray(record[key]) ? record[key] : undefined;

const recordValue = (record: UnknownRecord, key: string): UnknownRecord | undefined =>
  asRecord(record[key]);

const destinationNameValue = (tour: UnknownRecord) =>
  recordValue(tour, 'destination')?.name ?? tour.name;

const stripVietnameseMarks = (value: unknown) =>
  hasText(value)
    ? value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd')
        .replace(/\u0110/g, 'D')
    : '';

const normalizeTextKey = (value: unknown) =>
  stripVietnameseMarks(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const cleanSpaces = (value: string) =>
  value.replace(/\s+/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();

const sentenceCase = (value: string) => {
  const cleaned = cleanSpaces(value);
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const withPeriod = (value: string) => {
  const cleaned = cleanSpaces(value);
  if (!cleaned) return '';
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
};

const REGION_FALLBACKS: Record<string, string> = {
  'mien bac': 'Northern Vietnam',
  'mien nam': 'Southern Vietnam',
  'mien trung': 'Central Vietnam',
  'tay bac': 'Northwest Vietnam',
  'dong bac': 'Northeast Vietnam',
  'tay nguyen': 'Central Highlands',
  'dong bang song cuu long': 'Mekong Delta',
  'dong bang song hong': 'Red River Delta',
  'nam trung bo': 'South Central Coast',
  'bac trung bo': 'North Central Coast',
};

const NAME_TRANSLATIONS: Record<string, string> = {
  'ha noi': 'Hanoi',
  'nha hat lon ha noi': 'Hanoi Opera House',
  'ha long': 'Ha Long Bay',
  'ninh binh': 'Ninh Binh',
  sapa: 'Sapa',
  'ha giang': 'Ha Giang',
  'quang binh': 'Quang Binh',
  hue: 'Hue',
  'da nang': 'Da Nang',
  'hoi an': 'Hoi An',
  'nha trang': 'Nha Trang',
  'da lat': 'Da Lat',
  'phu quoc': 'Phu Quoc',
  'mui ne': 'Mui Ne',
  'quy nhon': 'Quy Nhon',
  'phu yen': 'Phu Yen',
  'can tho': 'Can Tho',
  'tp hcm': 'Ho Chi Minh City',
  'sai gon': 'Saigon',
  'moc chau': 'Moc Chau',
  'mai chau': 'Mai Chau',
  'cao bang': 'Cao Bang',
  'thai lan': 'Thailand',
  'han quoc': 'South Korea',
  'nhat ban': 'Japan',
  'dai loan': 'Taiwan',
  'dai bac': 'Taipei',
  'dai trung': 'Taichung',
  'cao hung': 'Kaohsiung',
  'chau au': 'Europe',
};

const TOUR_NAME_TRANSLATIONS: Record<string, string> = {
  'ha noi di san am thuc 1 ngay': 'Hanoi Heritage and Food Day Tour',
  'du thuyen ha long 2 ngay 1 dem': 'Ha Long Bay Overnight Cruise 2 Days 1 Night',
  'ninh binh trang an hoa lu hang mua 1 ngay':
    'Ninh Binh Trang An - Hoa Lu - Hang Mua Day Tour',
  'sapa fansipan ban lang 3 ngay 2 dem': 'Sapa Fansipan and Villages 3 Days 2 Nights',
  'ha giang loop 4 ngay 3 dem': 'Ha Giang Loop 4 Days 3 Nights',
  'quang binh phong nha thien duong 3 ngay 2 dem':
    'Quang Binh Phong Nha - Paradise Cave 3 Days 2 Nights',
  'hue co do song huong 2 ngay 1 dem': 'Hue Imperial City and Perfume River 2 Days 1 Night',
  'da nang bien my khe son tra ba na 3 ngay 2 dem':
    'Da Nang My Khe Beach - Son Tra - Ba Na Hills 3 Days 2 Nights',
  'hoi an pho co rung dua lang nghe 2 ngay 1 dem':
    'Hoi An Ancient Town - Coconut Forest - Craft Villages 2 Days 1 Night',
  'nha trang bien dao lan san ho 3 ngay 2 dem':
    'Nha Trang Islands and Snorkeling 3 Days 2 Nights',
  'da lat rung thong ho tuyen lam nong trai 3 ngay 2 dem':
    'Da Lat Pine Forest - Tuyen Lam Lake - Farms 3 Days 2 Nights',
  'phu quoc bien dao nam dao hoang hon 3 ngay 2 dem':
    'Phu Quoc Islands - South Island - Sunset 3 Days 2 Nights',
  'mui ne doi cat lang chai resort bien 2 ngay 1 dem':
    'Mui Ne Sand Dunes - Fishing Village - Beach Resort 2 Days 1 Night',
  'quy nhon ky co eo gio bien xanh 3 ngay 2 dem':
    'Quy Nhon Ky Co - Eo Gio - Blue Coast 3 Days 2 Nights',
  'phu yen ganh da dia bai xep mui dien 3 ngay 2 dem':
    'Phu Yen Ganh Da Dia - Bai Xep - Mui Dien 3 Days 2 Nights',
  'can tho cho noi cai rang miet vuon 2 ngay 1 dem':
    'Can Tho Cai Rang Floating Market and Orchards 2 Days 1 Night',
  'sai gon city tour dia dao cu chi 2 ngay 1 dem':
    'Saigon City Tour and Cu Chi Tunnels 2 Days 1 Night',
  'moc chau doi che thac dai yem ban lang 2 ngay 1 dem':
    'Moc Chau Tea Hills - Dai Yem Waterfall - Villages 2 Days 1 Night',
  'mai chau ban lac thung lung lua nha san 2 ngay 1 dem':
    'Mai Chau Lac Village - Rice Valley - Stilt House 2 Days 1 Night',
  'cao bang thac ban gioc dong nguom ngao 3 ngay 2 dem':
    'Cao Bang Ban Gioc Waterfall - Nguom Ngao Cave 3 Days 2 Nights',
  'thai lan bangkok pattaya 5 ngay 4 dem': 'Thailand Bangkok - Pattaya 5 Days 4 Nights',
  'singapore malaysia 5 ngay 4 dem': 'Singapore - Malaysia 5 Days 4 Nights',
  'bali ubud den ulun danu nghi duong bien 4 ngay 3 dem':
    'Bali Ubud - Ulun Danu Temple - Beach Retreat 4 Days 3 Nights',
  'dai loan dai bac dai trung cao hung 5 ngay 4 dem':
    'Taiwan Taipei - Taichung - Kaohsiung 5 Days 4 Nights',
  'hong kong macau 4 ngay 3 dem': 'Hong Kong - Macau 4 Days 3 Nights',
  'han quoc seoul nami everland 5 ngay 4 dem':
    'South Korea Seoul - Nami - Everland 5 Days 4 Nights',
  'nhat ban tokyo fuji hakone 5 ngay 4 dem': 'Japan Tokyo - Fuji - Hakone 5 Days 4 Nights',
  'nhat ban osaka kyoto nara 5 ngay 4 dem': 'Japan Osaka - Kyoto - Nara 5 Days 4 Nights',
  'dubai abu dhabi 5 ngay 4 dem': 'Dubai - Abu Dhabi 5 Days 4 Nights',
  'chau au paris brussels amsterdam 8 ngay 7 dem':
    'Europe Paris - Brussels - Amsterdam 8 Days 7 Nights',
};

const PACKAGE_NAME_FALLBACKS: Record<string, string> = {
  'goi tieu chuan': 'Standard Package',
  'goi cao cap': 'Premium Package',
  'goi luxury': 'Luxury Package',
  'goi gia dinh': 'Family Package',
  'goi cap doi': 'Couple Package',
  'goi qua tang': 'Gift Package',
  'goi nhom': 'Group Package',
  'goi rieng tu': 'Private Journey Package',
  'goi private': 'Private Journey Package',
  'goi premium': 'Premium Package',
  'goi standard': 'Standard Package',
};

const EXACT_TEXT_TRANSLATIONS: Record<string, string> = {
  'goi tieu chuan': 'Standard Package',
  'goi cao cap': 'Premium Package',
  'goi rieng tu': 'Private Journey Package',
  'goi private': 'Private Journey Package',
  'goi premium': 'Premium Package',
  'goi standard': 'Standard Package',
  'lua chon can bang cho khach muon toi uu chi phi nhung van du dich vu chinh':
    'A balanced option for travelers who want to optimize cost while keeping the core services.',
  'nang cap khach san bua an va trai nghiem de hanh trinh thoai mai hon':
    'Upgraded hotels, meals, and experiences for a more comfortable journey.',
  'danh cho gia dinh hoac nhom nho muon lich trinh linh hoat va rieng tu hon':
    'Designed for families or small groups who want a more flexible and private itinerary.',
  'xe du lich theo chuong trinh': 'Tourist vehicle by itinerary',
  'huong dan vien tieng viet': 'Vietnamese-speaking guide',
  've tham quan theo lich trinh': 'Scheduled attraction tickets',
  'bua an tieu chuan theo chuong trinh': 'Standard meals by itinerary',
  'bao hiem du lich noi dia': 'Domestic travel insurance',
  'xe du lich doi moi theo chuong trinh': 'Modern tourist vehicle by itinerary',
  'huong dan vien kinh nghiem': 'Experienced guide',
  'khach san retreat tieu chuan cao hon': 'Higher-standard hotel or retreat',
  'bua an nang cap voi dac san dia phuong': 'Upgraded meals with local specialties',
  'xe rieng theo lich trinh': 'Private vehicle by itinerary',
  'huong dan vien rieng': 'Private guide',
  'khach san retreat chon loc': 'Selected hotel or retreat',
  'bua an rieng theo tu van': 'Private meals by consultation',
  'ho tro dieu chinh lich trinh truoc khoi hanh':
    'Pre-departure itinerary adjustment support',
  'chi phi ca nhan': 'Personal expenses',
  'do uong ngoai thuc don': 'Drinks outside the set menu',
  'phu thu phong don neu co': 'Single-room surcharge if applicable',
  'dich vu ngoai chuong trinh': 'Services outside the itinerary',
  'dich vu phat sinh ngoai hop dong': 'Additional services outside the contract',
  've may bay neu khong ghi ro trong chuong trinh':
    'Flights unless clearly included in the program',
  'goi can bang chi phi phu hop khach muon lich trinh tron goi voi dich vu co ban ro rang':
    'A cost-balanced package for travelers who want a complete itinerary with clear core services.',
  'nang cap khach san bua an va ho tro thu tuc de hanh trinh thoai mai hon':
    'Upgraded hotels, meals, and travel-document support for a more comfortable journey.',
  'dich vu linh hoat hon cho gia dinh hoac nhom nho muon rieng tu va chu dong thoi gian':
    'More flexible services for families or small groups who want privacy and control over timing.',
  've may bay khu hoi theo chuong trinh': 'Round-trip flights by itinerary',
  'khach san tieu chuan 3 sao hoac tuong duong': 'Standard 3-star hotel or equivalent',
  'xe dua don va tham quan theo lich trinh': 'Transfers and sightseeing vehicle by itinerary',
  'huong dan vien tieng viet theo doan': 'Vietnamese-speaking tour leader',
  'bua an va ve tham quan theo chuong trinh': 'Meals and attraction tickets by itinerary',
  'bao hiem du lich quoc te co ban': 'Basic international travel insurance',
  'ho chieu va chi phi ca nhan': 'Passport fees and personal expenses',
  'visa neu chuong trinh khong ghi bao gom': 'Visa fees unless clearly included',
  'hanh ly qua cuoc tien tip va dich vu ngoai lich trinh':
    'Excess baggage, tips, and services outside the itinerary',
  've may bay khu hoi gio bay dep hon theo tinh trang cho':
    'Round-trip flights with better timings subject to availability',
  'khach san tieu chuan 4 sao hoac tuong duong': 'Standard 4-star hotel or equivalent',
  'bua an nang cap va ve tham quan theo chuong trinh':
    'Upgraded meals and attraction tickets by itinerary',
  'ho tro ho so visa neu can': 'Visa-document support if required',
  'bao hiem du lich quoc te muc cao hon': 'Higher-tier international travel insurance',
  've may bay khu hoi theo tu van rieng': 'Round-trip flights arranged by private consultation',
  'khach san 4 5 sao tuy diem den': '4- to 5-star hotels depending on destination',
  'xe rieng trong lich trinh tham quan': 'Private vehicle for the sightseeing itinerary',
  'huong dan vien rieng tai diem den neu phu hop':
    'Private local guide at the destination when suitable',
  'bao hiem du lich quoc te muc cao': 'High-tier international travel insurance',
  'nang hang ve may bay neu khach yeu cau': 'Flight upgrades requested by guests',
  'uu dai dat som': 'Early-booking offer',
  'lich khoi hanh dinh ky': 'Regular departure',
  'flash sale so luong gioi han': 'Limited-seat flash sale',
  'an trua theo chuong trinh': 'Lunch according to the itinerary',
  'an toi va nghi ngoi': 'Dinner and rest',
  'dung bua sang va chuan bi khoi hanh': 'Breakfast and departure preparation',
  'dung bua trua theo chuong trinh': 'Lunch according to the itinerary',
  'dung bua toi va nghi ngoi': 'Dinner and rest',
  'xe du lich va cap treo tuy goi': 'Tourist vehicle and cable car depending on package',
  'khach san sapa theo goi': 'Sapa hotel by selected package',
  'khach san hue theo goi': 'Hue hotel by selected package',
  'khach san da nang theo goi': 'Da Nang hotel by selected package',
  'khach san hoi an theo goi': 'Hoi An hotel by selected package',
  'khach san can tho theo goi': 'Can Tho hotel by selected package',
  'khach san tp hcm theo goi': 'Ho Chi Minh City hotel by selected package',
  'khach san cao bang theo goi': 'Cao Bang hotel by selected package',
  'khach san bangkok theo goi': 'Bangkok hotel by selected package',
  'khach san hong kong theo goi': 'Hong Kong hotel by selected package',
  'khach san seoul theo goi': 'Seoul hotel by selected package',
  'khach san tokyo theo goi': 'Tokyo hotel by selected package',
  'khach san osaka theo goi': 'Osaka hotel by selected package',
  'khach san dubai theo goi': 'Dubai hotel by selected package',
  'khach san paris theo goi': 'Paris hotel by selected package',
  'khach san resort nha trang theo goi': 'Nha Trang hotel or resort by selected package',
  'khach san resort phu quoc theo goi': 'Phu Quoc hotel or resort by selected package',
  'khach san resort mui ne theo goi': 'Mui Ne hotel or resort by selected package',
  'khach san resort bali theo goi': 'Bali hotel or resort by selected package',
  'nha san homestay mai chau theo goi': 'Mai Chau stilt-house homestay by selected package',
  'bay viet nam bangkok': 'Fly from Vietnam to Bangkok',
  'dung bua toi thai lan': 'Thai dinner',
  'bay den hong kong': 'Fly to Hong Kong',
  'bay den bali': 'Fly to Bali',
  'bay den dai bac': 'Fly to Taipei',
  'bay den seoul': 'Fly to Seoul',
  'bay den tokyo': 'Fly to Tokyo',
  'bay den osaka': 'Fly to Osaka',
  'bay den dubai': 'Fly to Dubai',
  'bay den paris': 'Fly to Paris',
  'tham quan ho guom pho co va cac tuyen pho nghe dac trung':
    'Explore Hoan Kiem Lake, the Old Quarter, and traditional craft streets',
  'tim hieu van mieu quoc tu giam va hoang thanh thang long':
    'Learn about the Temple of Literature and Thang Long Imperial Citadel',
  'trai nghiem am thuc ha noi voi pho bun cha hoac ca phe trung':
    'Experience Hanoi cuisine with pho, bun cha, or egg coffee',
  'lich trinh gon trong ngay phu hop khach it thoi gian':
    'Compact day itinerary for travelers with limited time',
  'mot ngay cham vao nhip song ha noi': 'A day immersed in Hanoi local rhythm',
  'ho guom pho co': 'Hoan Kiem Lake and the Old Quarter',
  'van mieu hoang thanh thang long': 'Temple of Literature and Thang Long Imperial Citadel',
  'am thuc ha noi': 'Hanoi cuisine',
  'don khach tai trung tam tham quan cac bieu tuong lich su dao pho co va thuong thuc dac san dia phuong truoc khi ket thuc vao cuoi chieu':
    'Meet in the city center, visit historic landmarks, walk through the Old Quarter, and enjoy local specialties before finishing in the late afternoon.',
  'lan ngam san ho': 'Snorkeling',
  'tour dao': 'Island tour',
  'an trua hai san': 'Seafood lunch',
  'tam bien my khe': 'Swim at My Khe Beach',
  'tham quan ban dao son tra': 'Visit Son Tra Peninsula',
  'mot ngay tai ba na hills': 'A full day at Ba Na Hills',
  'tu do kham pha cau rong va am thuc da nang':
    'Free time for Dragon Bridge and Da Nang cuisine',
  'ban dao son tra': 'Son Tra Peninsula',
  'bien my khe': 'My Khe Beach',
  'cau rong buoi toi': 'Dragon Bridge in the evening',
  'da nang son tra bien my khe': 'Da Nang - Son Tra - My Khe Beach',
  'don khach tham quan son tra nhan phong va tu do tam bien my khe':
    'Guest pickup, Son Tra sightseeing, hotel check-in, and free time at My Khe Beach.',
  'tam bien va ngam hoang hon phu quoc': 'Beach time and Phu Quoc sunset views',
  'kham pha nam dao lang chai va diem check in bien':
    'Explore South Island, fishing villages, and coastal photo stops',
  'thuong thuc hai san dia phuong': 'Enjoy local seafood',
  'co thoi gian tu do nghi duong tai resort khach san':
    'Free leisure time at the selected resort or hotel',
  'don khach phu quoc': 'Phu Quoc pickup',
  'tam bien': 'Beach time',
  'hai san dia phuong': 'Local seafood',
  'am thuc phu yen': 'Phu Yen cuisine',
  'nam dao lang chai hoang hon': 'South Island - Fishing Village - Sunset',
  'don khach nghi duong bien': 'Arrival and beach leisure',
  'tu do nghi duong tien khach': 'Free leisure time and guest drop-off',
  'flash sale phu quoc mua nghi duong': 'Phu Quoc resort-season flash sale',
  'thap nghinh phong': 'Nghinh Phong Tower',
  'bai xep thap nghinh phong': 'Bai Xep and Nghinh Phong Tower',
  'photo stop mui dien thap nghinh phong theo lich trinh':
    'Photo stops at Mui Dien and Nghinh Phong Tower by itinerary',
  'check in mui dien thap nghinh phong theo lich trinh':
    'Photo stops at Mui Dien and Nghinh Phong Tower by itinerary',
  'thuong thuc hai san phu yen': 'Enjoy Phu Yen seafood',
  'ca phe ngam canh': 'Scenic cafe stop',
  'vuon hoa nong trai ca phe ngam canh': 'Flower gardens, farms, and a scenic cafe stop',
  'check in ky co va eo gio': 'Photo stops at Ky Co and Eo Gio',
  'tam bien an hai san va nghi duong tai quy nhon':
    'Beach time, seafood, and leisure in Quy Nhon',
  'tham quan lang chai hoac diem van hoa binh dinh':
    'Visit a fishing village or Binh Dinh cultural stop',
  'lich trinh can bang giua tham quan va nghi ngoi':
    'Balanced itinerary between sightseeing and leisure',
  'bien trung tam': 'Central beach',
  'hai san binh dinh': 'Binh Dinh seafood',
  'ruong bac thang nghi duong bien': 'Terraced rice fields and beach leisure',
  'nghi duong bien': 'Beach leisure',
  'dat som nhat ban tokyo fuji de co thoi gian xu ly visa':
    'Book Japan Tokyo - Fuji early to allow time for visa processing',
  'check in marina bay va gardens by the bay':
    'Photo stops at Marina Bay and Gardens by the Bay',
  'tham quan petronas towers tai kuala lumpur':
    'Visit Petronas Towers in Kuala Lumpur',
  'trai nghiem genting hoac malacca theo lich trinh':
    'Experience Genting or Malacca by itinerary',
  'lien tuyen 2 quoc gia phu hop tour gia dinh':
    'Two-country itinerary suited to family travelers',
  'viet nam singapore': 'Vietnam - Singapore',
  'singapore city tour': 'Singapore city tour',
  'singapore kuala lumpur': 'Singapore - Kuala Lumpur',
  'genting malacca viet nam': 'Genting or Malacca - Vietnam',
  'singapore ve dem': 'Singapore by night',
  'am thuc malaysia': 'Malaysian cuisine',
  'genting hoac malacca': 'Genting or Malacca',
  'ngam nui phu si va khu hakone fuji five lakes':
    'View Mount Fuji and the Hakone or Fuji Five Lakes area',
  'city tour tokyo voi cac khu pho bieu tuong':
    'Tokyo city tour through landmark neighborhoods',
  'trai nghiem am thuc va mua sam nhat ban':
    'Experience Japanese cuisine and shopping',
  'tuyen tour de demo phan khuc gia cao':
    'Premium long-haul itinerary for higher-value tour segments',
  'viet nam tokyo': 'Vietnam - Tokyo',
  'tokyo city tour': 'Tokyo city tour',
  'fuji hakone': 'Fuji - Hakone',
  'tokyo viet nam': 'Tokyo - Vietnam',
  'am thuc nhat': 'Japanese cuisine',
  'nui phu si': 'Mount Fuji',
  'canh quan nhat ban': 'Japanese landscapes',
  'check in thap eiffel va cac diem bieu tuong paris':
    'Photo stops at the Eiffel Tower and Paris landmarks',
  'tham quan brussels va khong gian pho co chau au':
    'Visit Brussels and its old European town atmosphere',
  'trai nghiem amsterdam voi kenh dao va city tour':
    'Experience Amsterdam canals and city sightseeing',
  'san pham phu hop phan khuc tour xa gia tri cao':
    'Long-haul, high-value itinerary for premium travelers',
  'viet nam paris': 'Vietnam - Paris',
  'paris city tour': 'Paris city tour',
  'paris brussels': 'Paris - Brussels',
  'brussels amsterdam': 'Brussels - Amsterdam',
  'amsterdam viet nam': 'Amsterdam - Vietnam',
  'thap eiffel': 'Eiffel Tower',
  'pho co chau au': 'European old town',
  'kenh dao': 'Canals',
  'mua dac san': 'Shopping for local specialties',
  'tien khach': 'Guest drop-off',
  'tro ve ha noi': 'Return to Hanoi',
  'tro ve tp hcm': 'Return to Ho Chi Minh City',
  'tro ve': 'Return transfer',
  'tu do mua sam': 'Free time for shopping',
  'tu do thu gian': 'Free time to relax',
  'tu do kham pha trung tam': 'Free time to explore the town center',
  'nhan phong nghi ngoi': 'Hotel check-in and rest',
  'nhan phong nghi duong': 'Resort check-in',
  'bay ve viet nam': 'Flight back to Vietnam',
  'mua sam': 'Shopping',
  'city tour': 'City tour',
  'tham quan co do hoa lu': 'Visit Hoa Lu ancient capital',
  'di thuyen trong quan the trang an': 'Boat tour through the Trang An scenic complex',
  'leo hang mua ngam toan canh tam coc': 'Climb Hang Mua for panoramic Tam Coc views',
  'an trua dac san de nui ninh binh': 'Lunch with Ninh Binh mountain-goat specialties',
  'ha noi hoa lu trang an hang mua': 'Hanoi - Hoa Lu - Trang An - Hang Mua',
  'co do hoa lu': 'Hoa Lu ancient capital',
  'thuyen trang an': 'Trang An boat ride',
  'hang mua': 'Hang Mua',
  'tour ninh binh trong ngay tu ha noi ket hop co do hoa lu di thuyen trang an va ngam toan canh tu hang mua':
    'A Ninh Binh day tour from Hanoi combining Hoa Lu ancient capital, a Trang An boat ride, and panoramic views from Hang Mua.',
  'hanh trinh duoc thiet ke theo nhip vua phai tap trung vao di san canh quan nui da voi va trai nghiem thuyen song du khach co du thoi gian cho cac diem tham quan chinh bua an dia phuong va khoang nghi de chuyen di khong bi qua tai':
    'The journey is paced comfortably, focusing on heritage sites, limestone landscapes, and river scenery. Travelers have enough time for the main stops, a local meal, and rest breaks so the day never feels rushed.',
  'tour phu hop voi khach muon di trong ngay nhom ban thich chup anh va gia dinh muon lich trinh vua suc lich trinh co huong dan vien phuong tien theo chuong trinh ho tro truoc khoi hanh va cac lua chon goi dich vu de khach de chon theo ngan sach':
    'This tour suits day-trip travelers, groups of friends who enjoy photography, and families who want an easy-paced itinerary. It includes a guide, scheduled transportation, pre-departure support, and package options for different budgets.',
  'khoi hanh tu ha noi tham quan hoa lu dung bua trua di thuyen trang an va leo hang mua truoc khi tro ve':
    'Depart from Hanoi, visit Hoa Lu, have lunch, take a Trang An boat ride, and climb Hang Mua before returning.',
  'hang mua co kho leo khong': 'Is Hang Mua difficult to climb?',
  'co khoang vai tram bac da khach nen mang giay thoai mai va can nhac neu co van de suc khoe':
    'There are several hundred stone steps, so guests should wear comfortable shoes and consider their health condition before climbing.',
  'tour co don tai khach san khong': 'Does the tour include hotel pickup?',
  'co ho tro don trong khu vuc trung tam theo khung gio xac nhan truoc ngay di':
    'Yes. Pickup is supported in the central area according to the time confirmed before departure.',
  'nghi dem tren du thuyen giua vinh': 'Overnight cruise stay on the bay',
  'cheo kayak hoac thuyen nan tai khu vuc hang nuoc':
    'Kayaking or bamboo-boat ride near the cave area',
  'ngam hoang hon va binh minh tren boong tau':
    'Sunset and sunrise views from the cruise deck',
  'bua an hai san theo chuong trinh': 'Included seafood meals',
  'tour co bao gom phong nghi tren du thuyen khong':
    'Does the tour include a cabin on the cruise?',
  'co hang phong phu thuoc goi khach chon khi dat':
    'Yes. The cabin category depends on the package selected at booking.',
  'co the di ha long mua mua khong': 'Can I visit Ha Long during the rainy season?',
  'lich tau co the dieu chinh theo thoi tiet de dam bao an toan doi van hanh se thong bao neu co thay doi':
    'The cruise schedule may be adjusted for safety based on weather conditions. The operations team will notify guests if there are changes.',
  'chinh phuc fansipan bang cap treo': 'Reach Fansipan by cable car',
  'dao ban cat cat va tim hieu van hoa dia phuong':
    'Stroll through Cat Cat Village and learn about local culture',
  'thuong thuc dac san vung cao': 'Enjoy highland specialties',
  'lich trinh co thoi gian tu do tai trung tam sapa':
    'Free time in central Sapa is included in the itinerary',
  'di chuyen ha noi sapa': 'Transfer from Hanoi to Sapa',
  'ban cat cat': 'Cat Cat Village',
  'check in deo ma pi leng va song nho que':
    'Photo stops at Ma Pi Leng Pass and the Nho Que River',
  'kham pha cong troi quan ba yen minh dong van':
    'Explore Quan Ba Heaven Gate, Yen Minh, and Dong Van',
  'kham pha cong troi quan ba yen minh va dong van':
    'Explore Quan Ba Heaven Gate, Yen Minh, and Dong Van',
  'kham pha dong van quan ba yen minh': 'Explore Dong Van, Quan Ba, and Yen Minh',
  'trai nghiem van hoa cao nguyen da': 'Experience the culture of the rock plateau',
  'lich trinh xe o to an toan han che tu lai duong deo':
    'Travel by car for safer mountain-pass routing',
  'di chuyen ha noi ha giang': 'Transfer from Hanoi to Ha Giang',
  'nghi dem tai ha giang': 'Overnight stay in Ha Giang',
  'deo ma pi leng': 'Ma Pi Leng Pass',
  'tham quan chua wat arun va cac diem bieu tuong bangkok':
    'Visit Wat Arun and Bangkok landmarks',
  'trai nghiem pattaya va khong gian bien thai lan':
    'Experience Pattaya and Thailand beach atmosphere',
  'co thoi gian mua sam tai trung tam lon': 'Time for shopping at major centers',
  'co thoi gian mua sam tai cac trung tam lon': 'Time for shopping at major centers',
  'lich trinh de di phu hop khach lan dau di tour nuoc ngoai':
    'Easy-paced itinerary for first-time outbound travelers',
  'ngam skyline hong kong va victoria harbour':
    'Take in the Hong Kong skyline and Victoria Harbour',
  'tham quan cac khu mua sam noi bat': 'Visit signature shopping districts',
  'di chuyen sang macau va check in ruins of st paul':
    "Transfer to Macau and visit the Ruins of St. Paul's",
  'lich trinh ngan phu hop ky nghi ngan ngay':
    'Short itinerary suited to brief getaways',
  'tham quan dong phong nha hoac dong thien duong':
    'Visit Phong Nha Cave or Paradise Cave',
  'kham pha canh quan phong nha ke bang':
    'Explore the landscapes of Phong Nha - Ke Bang',
  'trai nghiem song chay hang toi theo mua':
    'Seasonal Chay River and Dark Cave experience',
  'am thuc dia phuong quang binh': 'Quang Binh local cuisine',
  'gia tour da bao gom ve cap treo fansipan chua':
    'Does the tour price include the Fansipan cable-car ticket?',
  'tuy goi dich vu goi cao cap va rieng tu co the bao gom hoac ho tro dat truoc':
    'It depends on the selected package. Premium and private packages may include it or support advance booking.',
  'tour co tu lai xe may khong': 'Does this tour include self-driving by motorbike?',
  'seed tour nay mac dinh di chuyen bang xe o to de an toan hon co the tuy bien goi rieng neu muon trai nghiem xe may':
    'This tour defaults to car travel for better safety. A private package can be customized if guests want a motorbike experience.',
  'tour co trekking nang khong': 'Does this tour involve difficult trekking?',
  'khong day la tour kham pha nhe phu hop phan lon du khach':
    'No. This is a light exploration tour suitable for most travelers.',
  'tour thai lan co can visa khong': 'Do Vietnamese travelers need a visa for Thailand?',
  'khach viet nam du lich ngan ngay tai thai lan thuong khong can visa tuy nhien ho chieu phai con han theo quy dinh':
    'Vietnamese travelers usually do not need a visa for short Thailand trips, but passports must meet the current validity rules.',
  'tour co di ca hong kong va macau khong': 'Does the tour include both Hong Kong and Macau?',
  'co lich trinh seed co day du hai diem co the dieu chinh so dem tuy san pham thuc te':
    'Yes. The itinerary includes both destinations, and the number of nights can be adjusted by the final product configuration.',
};

const PHRASE_TRANSLATIONS: Array<[RegExp, string]> = [
  [/\bho chi minh city\b/g, 'Ho Chi Minh City'],
  [/\btp hcm\b/g, 'Ho Chi Minh City'],
  [/\bha noi\b/g, 'Hanoi'],
  [/\bha long\b/g, 'Ha Long Bay'],
  [/\bninh binh\b/g, 'Ninh Binh'],
  [/\btrang an\b/g, 'Trang An'],
  [/\btam coc\b/g, 'Tam Coc'],
  [/\bhoa lu\b/g, 'Hoa Lu'],
  [/\bhang mua\b/g, 'Hang Mua'],
  [/\bban cat cat\b/g, 'Cat Cat Village'],
  [/\bfansipan\b/g, 'Fansipan'],
  [/\bcat cat\b/g, 'Cat Cat'],
  [/\bma pi leng\b/g, 'Ma Pi Leng Pass'],
  [/\bnho que\b/g, 'Nho Que River'],
  [/\bquan ba\b/g, 'Quan Ba'],
  [/\byen minh\b/g, 'Yen Minh'],
  [/\bdong van\b/g, 'Dong Van'],
  [/\bphong nha ke bang\b/g, 'Phong Nha - Ke Bang'],
  [/\bsong chay\b/g, 'Chay River'],
  [/\bhang toi\b/g, 'Dark Cave'],
  [/\bdong hoi\b/g, 'Dong Hoi'],
  [/\bphong nha\b/g, 'Phong Nha'],
  [/\bthien duong\b/g, 'Paradise Cave'],
  [/\bson tra\b/g, 'Son Tra'],
  [/\bba na\b/g, 'Ba Na Hills'],
  [/\bcau vang\b/g, 'Golden Bridge'],
  [/\bcau rong\b/g, 'Dragon Bridge'],
  [/\bmy khe\b/g, 'My Khe'],
  [/\bban dao son tra\b/g, 'Son Tra Peninsula'],
  [/\bdai noi\b/g, 'Imperial City'],
  [/\bchua thien mu\b/g, 'Thien Mu Pagoda'],
  [/\bsong huong\b/g, 'Perfume River'],
  [/\blang khai dinh\b/g, 'Khai Dinh Tomb'],
  [/\blang minh mang\b/g, 'Minh Mang Tomb'],
  [/\bhoi an\b/g, 'Hoi An'],
  [/\brung dua bay mau\b/g, 'Bay Mau Coconut Forest'],
  [/\bhon mun\b/g, 'Hon Mun'],
  [/\bhon tam\b/g, 'Hon Tam'],
  [/\bho tuyen lam\b/g, 'Tuyen Lam Lake'],
  [/\bcho dem da lat\b/g, 'Da Lat Night Market'],
  [/\bnam dao\b/g, 'South Island'],
  [/\bhon thom\b/g, 'Hon Thom'],
  [/\bsuoi tien\b/g, 'Fairy Stream'],
  [/\bky co\b/g, 'Ky Co'],
  [/\beo gio\b/g, 'Eo Gio'],
  [/\bganh da dia\b/g, 'Ganh Da Dia'],
  [/\bbai xep\b/g, 'Bai Xep'],
  [/\bmui dien\b/g, 'Mui Dien'],
  [/\btuy hoa\b/g, 'Tuy Hoa'],
  [/\bcai rang\b/g, 'Cai Rang'],
  [/\bben ninh kieu\b/g, 'Ninh Kieu Wharf'],
  [/\bdinh doc lap\b/g, 'Independence Palace'],
  [/\bbuu dien thanh pho\b/g, 'Central Post Office'],
  [/\bcho ben thanh\b/g, 'Ben Thanh Market'],
  [/\bcu chi\b/g, 'Cu Chi'],
  [/\bthac dai yem\b/g, 'Dai Yem Waterfall'],
  [/\bban lac\b/g, 'Lac Village'],
  [/\bthac ban gioc\b/g, 'Ban Gioc Waterfall'],
  [/\bdong nguom ngao\b/g, 'Nguom Ngao Cave'],
  [/\bsuoi le nin\b/g, 'Le Nin Stream'],
  [/\btrung khanh\b/g, 'Trung Khanh'],
  [/\bnha trang\b/g, 'Nha Trang'],
  [/\bda lat\b/g, 'Da Lat'],
  [/\bphu quoc\b/g, 'Phu Quoc'],
  [/\bmui ne\b/g, 'Mui Ne'],
  [/\bquy nhon\b/g, 'Quy Nhon'],
  [/\bphu yen\b/g, 'Phu Yen'],
  [/\bcan tho\b/g, 'Can Tho'],
  [/\bmoc chau\b/g, 'Moc Chau'],
  [/\bmai chau\b/g, 'Mai Chau'],
  [/\bcao bang\b/g, 'Cao Bang'],
  [/\bthai lan\b/g, 'Thailand'],
  [/\bhan quoc\b/g, 'South Korea'],
  [/\bnhat ban\b/g, 'Japan'],
  [/\bdai loan\b/g, 'Taiwan'],
  [/\bdai bac\b/g, 'Taipei'],
  [/\bdai trung\b/g, 'Taichung'],
  [/\bcao hung\b/g, 'Kaohsiung'],
  [/\bchau au\b/g, 'Europe'],
  [/\bviet nam\b/g, 'Vietnam'],
  [/\bbangkok\b/g, 'Bangkok'],
  [/\bpattaya\b/g, 'Pattaya'],
  [/\bwat arun\b/g, 'Wat Arun'],
  [/\bmarina bay\b/g, 'Marina Bay'],
  [/\bmerlion park\b/g, 'Merlion Park'],
  [/\bgardens by the bay\b/g, 'Gardens by the Bay'],
  [/\bkuala lumpur\b/g, 'Kuala Lumpur'],
  [/\bpetronas towers\b/g, 'Petronas Towers'],
  [/\bgenting\b/g, 'Genting'],
  [/\bmalacca\b/g, 'Malacca'],
  [/\bulun danu\b/g, 'Ulun Danu'],
  [/\bubud\b/g, 'Ubud'],
  [/\btaipei 101\b/g, 'Taipei 101'],
  [/\bcuu phan\b/g, 'Jiufen'],
  [/\bhong kong\b/g, 'Hong Kong'],
  [/\bmacau\b/g, 'Macau'],
  [/\bvictoria harbour\b/g, 'Victoria Harbour'],
  [/\bruins of st paul\b/g, "Ruins of St. Paul's"],
  [/\bgyeongbokgung\b/g, 'Gyeongbokgung Palace'],
  [/\bdao nami\b/g, 'Nami Island'],
  [/\bnami\b/g, 'Nami Island'],
  [/\beverland\b/g, 'Everland'],
  [/\bnui phu si\b/g, 'Mount Fuji'],
  [/\bfuji\b/g, 'Fuji'],
  [/\bhakone\b/g, 'Hakone'],
  [/\bosaka castle\b/g, 'Osaka Castle'],
  [/\bdotonbori\b/g, 'Dotonbori'],
  [/\barashiyama bamboo grove\b/g, 'Arashiyama Bamboo Grove'],
  [/\bkyoto\b/g, 'Kyoto'],
  [/\bnara\b/g, 'Nara'],
  [/\bburj khalifa\b/g, 'Burj Khalifa'],
  [/\bdubai mall\b/g, 'Dubai Mall'],
  [/\bdesert safari\b/g, 'desert safari'],
  [/\bsheikh zayed grand mosque\b/g, 'Sheikh Zayed Grand Mosque'],
  [/\bthap eiffel\b/g, 'Eiffel Tower'],
  [/\bbrussels\b/g, 'Brussels'],
  [/\bamsterdam\b/g, 'Amsterdam'],
  [/\bco do\b/g, 'ancient capital'],
  [/\bpho co\b/g, 'ancient town'],
  [/\bdi san\b/g, 'heritage'],
  [/\bam thuc duong pho\b/g, 'street food'],
  [/\bam thuc dia phuong\b/g, 'local cuisine'],
  [/\bam thuc hai san\b/g, 'seafood cuisine'],
  [/\bam thuc\b/g, 'cuisine'],
  [/\bdac san dia phuong\b/g, 'local specialties'],
  [/\bdac san\b/g, 'local specialties'],
  [/\bhai san\b/g, 'seafood'],
  [/\btham quan\b/g, 'visit'],
  [/\bkham pha\b/g, 'explore'],
  [/\bchinh phuc\b/g, 'reach'],
  [/\bbang cap treo\b/g, 'by cable car'],
  [/\btim hieu\b/g, 'learn about'],
  [/\bthuong thuc\b/g, 'enjoy'],
  [/\bcheck in\b/g, 'photo stop at'],
  [/\bdi qua\b/g, 'travel through'],
  [/\bdung nghi tren duong\b/g, 'rest stops along the way'],
  [/\bdao quanh\b/g, 'walk around'],
  [/\btrai nghiem\b/g, 'experience'],
  [/\bdi thuyen\b/g, 'take a boat trip'],
  [/\bcheo kayak\b/g, 'go kayaking'],
  [/\bthuyen nan\b/g, 'bamboo-boat ride'],
  [/\bleo\b/g, 'climb'],
  [/\bngam toan canh\b/g, 'enjoy panoramic views of'],
  [/\bngam hoang hon\b/g, 'watch the sunset'],
  [/\bngam binh minh\b/g, 'watch the sunrise'],
  [/\bhoang hon\b/g, 'sunset'],
  [/\bbinh minh\b/g, 'sunrise'],
  [/\btren boong tau\b/g, 'on the cruise deck'],
  [/\bthuyen song\b/g, 'river boat experiences'],
  [/\bdu thuyen\b/g, 'cruise'],
  [/\bhang dong\b/g, 'caves'],
  [/\bhang\b/g, 'cave'],
  [/\bdong\b/g, 'cave'],
  [/\bsong\b/g, 'river'],
  [/\bbien dao\b/g, 'islands and beaches'],
  [/\bbien\b/g, 'beach'],
  [/\bdao\b/g, 'island'],
  [/\blang chai\b/g, 'fishing village'],
  [/\bban lang\b/g, 'villages'],
  [/\blang nghe\b/g, 'craft villages'],
  [/\bcho noi\b/g, 'floating market'],
  [/\bmiet vuon\b/g, 'orchards'],
  [/\bdoi che\b/g, 'tea hills'],
  [/\bdoi cat\b/g, 'sand dunes'],
  [/\brung dua\b/g, 'coconut forest'],
  [/\brung thong\b/g, 'pine forest'],
  [/\bvuon hoa\b/g, 'flower gardens'],
  [/\bnong trai\b/g, 'farms'],
  [/\bthung lung lua\b/g, 'rice valley'],
  [/\bnha san\b/g, 'stilt house'],
  [/\bdia dao\b/g, 'tunnels'],
  [/\bcung duong\b/g, 'route'],
  [/\bcanh quan\b/g, 'landscapes'],
  [/\bnui da voi\b/g, 'limestone mountains'],
  [/\bsong nuoc\b/g, 'river scenery'],
  [/\bcao nguyen da\b/g, 'rock plateau'],
  [/\bvung cao\b/g, 'highland'],
  [/\bvan hoa dia phuong\b/g, 'local culture'],
  [/\bvan hoa ban dia\b/g, 'local culture'],
  [/\bvan hoa\b/g, 'culture'],
  [/\bbieu tuong\b/g, 'landmarks'],
  [/\bcac diem bieu tuong\b/g, 'landmarks'],
  [/\bcac diem trung tam\b/g, 'central landmarks'],
  [/\bkhu trung tam\b/g, 'city center'],
  [/\btrung tam lon\b/g, 'major centers'],
  [/\btrung tam\b/g, 'center'],
  [/\bkhu mua sam\b/g, 'shopping districts'],
  [/\bkhu pho\b/g, 'neighborhoods'],
  [/\bskyline\b/g, 'skyline'],
  [/\bkhong gian bien\b/g, 'beach setting'],
  [/\bkhong gian pho co\b/g, 'old-town atmosphere'],
  [/\bnoi bat\b/g, 'signature'],
  [/\bde di\b/g, 'easy-paced'],
  [/\bky nghi ngan ngay\b/g, 'short breaks'],
  [/\bngan ngay\b/g, 'short trip'],
  [/\btour nuoc ngoai\b/g, 'overseas tour'],
  [/\bbua trua\b/g, 'lunch'],
  [/\bbua toi\b/g, 'dinner'],
  [/\bbua sang\b/g, 'breakfast'],
  [/\bdung bua trua\b/g, 'have lunch'],
  [/\ban trua\b/g, 'lunch'],
  [/\ban sang\b/g, 'breakfast'],
  [/\ban toi\b/g, 'dinner'],
  [/\btheo chuong trinh\b/g, 'by itinerary'],
  [/\btheo lich trinh\b/g, 'by itinerary'],
  [/\btruoc khoi hanh\b/g, 'before departure'],
  [/\bkhoi hanh tu\b/g, 'depart from'],
  [/\bkhoi hanh di\b/g, 'depart for'],
  [/\bkhoi hanh\b/g, 'departure'],
  [/\bdi chuyen\b/g, 'transfer'],
  [/\bdi chuyen sang\b/g, 'transfer to'],
  [/\bbay den\b/g, 'fly to'],
  [/\bbay ve\b/g, 'fly back to'],
  [/\bbay\b/g, 'fly'],
  [/\bdung bua toi\b/g, 'have dinner'],
  [/\bdung bua trua\b/g, 'have lunch'],
  [/\bdung bua sang\b/g, 'have breakfast'],
  [/\bdon khach tai\b/g, 'pickup at'],
  [/\bdon khach\b/g, 'guest pickup'],
  [/\btien khach tai\b/g, 'drop-off at'],
  [/\btien khach\b/g, 'guest drop-off'],
  [/\bnhan phong\b/g, 'check in'],
  [/\btra phong\b/g, 'check out'],
  [/\bnghi dem\b/g, 'overnight stay'],
  [/\btu do\b/g, 'free time'],
  [/\bmua qua dia phuong\b/g, 'shop for local gifts'],
  [/\bmua dac san\b/g, 'shop for local specialties'],
  [/\bmua sam\b/g, 'shopping'],
  [/\bve tham quan\b/g, 'attraction tickets'],
  [/\bhuong dan vien rieng\b/g, 'private guide'],
  [/\bhuong dan vien kinh nghiem\b/g, 'experienced guide'],
  [/\bhuong dan vien tieng viet\b/g, 'Vietnamese-speaking guide'],
  [/\bhuong dan vien\b/g, 'guide'],
  [/\bxe rieng\b/g, 'private vehicle'],
  [/\bxe du lich doi moi\b/g, 'modern tourist vehicle'],
  [/\bxe du lich\b/g, 'tourist vehicle'],
  [/\bbao hiem du lich noi dia\b/g, 'domestic travel insurance'],
  [/\bbao hiem du lich\b/g, 'travel insurance'],
  [/\buu dai dat som\b/g, 'early-booking offer'],
  [/\blich khoi hanh dinh ky\b/g, 'regular departure'],
  [/\bflash sale so luong gioi han\b/g, 'limited-seat flash sale'],
  [/\bchi phi ca nhan\b/g, 'personal expenses'],
  [/\bdo uong ngoai thuc don\b/g, 'drinks outside the set menu'],
  [/\bphu thu phong don neu co\b/g, 'single-room surcharge if applicable'],
  [/\bdich vu ngoai chuong trinh\b/g, 'services outside the itinerary'],
  [/\bve may bay\b/g, 'flights'],
  [/\bgia dinh\b/g, 'families'],
  [/\bnhom nho\b/g, 'small groups'],
  [/\bnhom ban\b/g, 'groups of friends'],
  [/\bkhach muon\b/g, 'travelers who want'],
  [/\bkhach lan dau\b/g, 'first-time travelers'],
  [/\bkhach tre\b/g, 'younger travelers'],
  [/\bkhach viet nam\b/g, 'Vietnamese travelers'],
  [/\bkhach viet\b/g, 'Vietnamese travelers'],
  [/\bkhach cong tac\b/g, 'business travelers'],
  [/\bphan lon du khach\b/g, 'most travelers'],
  [/\bdu khach co du thoi gian\b/g, 'travelers have enough time'],
  [/\bdu khach\b/g, 'travelers'],
  [/\bco du thoi gian\b/g, 'have enough time'],
  [/\bkhoang nghi\b/g, 'rest breaks'],
  [/\bkhong bi qua tai\b/g, 'does not feel rushed'],
  [/\bhanh trinh\b/g, 'the journey'],
  [/\bnhip vua phai\b/g, 'a comfortable pace'],
  [/\bvua suc\b/g, 'easy-paced'],
  [/\bthich chup anh\b/g, 'who enjoy photography'],
  [/\blic h trinh\b/g, 'itinerary'],
  [/\blich trinh\b/g, 'itinerary'],
  [/\blinh hoat\b/g, 'flexible'],
  [/\brieng tu\b/g, 'private'],
  [/\bkhach san\b/g, 'hotel'],
  [/\bretreat\b/g, 'retreat'],
  [/\bnang cap\b/g, 'upgraded'],
  [/\btieu chuan\b/g, 'standard'],
  [/\bchon loc\b/g, 'selected'],
  [/\bthoai mai\b/g, 'comfortable'],
  [/\btour phu hop voi\b/g, 'A tour suited for'],
  [/\bphu hop voi\b/g, 'suited for'],
  [/\bphu hop\b/g, 'suitable'],
  [/\bduoc thiet ke\b/g, 'is designed'],
  [/\btap trung vao\b/g, 'focused on'],
  [/\bcac diem tham quan chinh\b/g, 'the main attractions'],
  [/\blua chon goi dich vu\b/g, 'package options'],
  [/\bde khach de chon theo ngan sach\b/g, 'for different budgets'],
  [/\bphuong tien\b/g, 'transportation'],
  [/\bde khach de chon theo ngan sach\b/g, 'so travelers can choose by budget'],
  [/\bho tro\b/g, 'support'],
  [/\bbao gom\b/g, 'include'],
  [/\bchua\b/g, 'not yet'],
  [/\btuy goi dich vu\b/g, 'depending on the selected package'],
  [/\btuy bien\b/g, 'customize'],
  [/\bmac dinh\b/g, 'default'],
  [/\ban toan\b/g, 'safety'],
  [/\bxe may\b/g, 'motorbike'],
  [/\bxe o to\b/g, 'car'],
  [/\btu lai\b/g, 'self-drive'],
  [/\bduong deo\b/g, 'mountain pass roads'],
  [/\bnghi hop ly\b/g, 'reasonable rest time'],
  [/\bthoi gian nghi\b/g, 'rest time'],
  [/\bthoi gian\b/g, 'time'],
  [/\bso dem\b/g, 'number of nights'],
  [/\bsan pham thuc te\b/g, 'final product setup'],
  [/\bquy dinh\b/g, 'rules'],
  [/\bcon han\b/g, 'remain valid'],
  [/\bho so\b/g, 'documents'],
  [/\bthu tuc\b/g, 'procedures'],
  [/\bket hop\b/g, 'combining'],
  [/\btrong ngay\b/g, 'day trip'],
  [/\bcuoi chieu\b/g, 'late afternoon'],
  [/\bbuoi sang\b/g, 'morning'],
  [/\bbuoi chieu\b/g, 'afternoon'],
  [/\bbuoi toi\b/g, 'evening'],
  [/\btheo mua\b/g, 'seasonal'],
  [/\btheo dieu kien thoi tiet\b/g, 'depending on weather conditions'],
  [/\bco the\b/g, 'can'],
  [/\bvisa\b/g, 'visa'],
  [/\bho chieu\b/g, 'passport'],
];

const DAY_NIGHT_LABELS: Record<string, string> = {
  ngay: 'Day',
  dem: 'Night',
};

const translateNameValue = (value: unknown, fallback = 'Tour') => {
  const key = normalizeTextKey(value);
  if (TOUR_NAME_TRANSLATIONS[key]) return TOUR_NAME_TRANSLATIONS[key];
  if (NAME_TRANSLATIONS[key]) return NAME_TRANSLATIONS[key];

  let text = stripVietnameseMarks(value).trim();
  if (!text) return fallback;

  text = text
    .replace(/\bTP\.?\s*HCM\b/gi, 'Ho Chi Minh City')
    .replace(/\bHa Noi\b/gi, 'Hanoi')
    .replace(/\bHa Long\b/gi, 'Ha Long Bay')
    .replace(/\bThai Lan\b/gi, 'Thailand')
    .replace(/\bHan Quoc\b/gi, 'South Korea')
    .replace(/\bNhat Ban\b/gi, 'Japan')
    .replace(/\bDai Loan\b/gi, 'Taiwan')
    .replace(/\bDai Bac\b/gi, 'Taipei')
    .replace(/\bDai Trung\b/gi, 'Taichung')
    .replace(/\bCao Hung\b/gi, 'Kaohsiung')
    .replace(/\bChau Au\b/gi, 'Europe')
    .replace(/\bCo Do\b/gi, 'Ancient Capital')
    .replace(/\bDia Dao\b/gi, 'Tunnels')
    .replace(/\bDen\b/gi, 'Temple')
    .replace(/\bNghi Duong Bien\b/gi, 'Beach Retreat')
    .replace(/\bBien Dao\b/gi, 'Islands and Beaches')
    .replace(/\b(\d+)\s*Ngay\s*(\d+)\s*Dem\b/gi, (_, days, nights) => {
      const dayLabel = Number(days) === 1 ? DAY_NIGHT_LABELS.ngay : `${DAY_NIGHT_LABELS.ngay}s`;
      const nightLabel =
        Number(nights) === 1 ? DAY_NIGHT_LABELS.dem : `${DAY_NIGHT_LABELS.dem}s`;
      return `${days} ${dayLabel} ${nights} ${nightLabel}`;
    })
    .replace(/\b(\d+)\s*Ngay\b/gi, (_, days) => {
      const dayLabel = Number(days) === 1 ? DAY_NIGHT_LABELS.ngay : `${DAY_NIGHT_LABELS.ngay}s`;
      return `${days} ${dayLabel}`;
    });

  return cleanSpaces(text) || fallback;
};

export const toEnglishTextFallback = (value: unknown, fallback = ''): string => {
  if (!hasText(value)) return fallback;
  const raw = value.trim();

  if (/\n/.test(raw)) {
    const paragraphs = raw
      .split(/\n+/)
      .map((paragraph) => toEnglishTextFallback(paragraph))
      .filter(hasText);
    return paragraphs.join('\n\n') || fallback;
  }

  const key = normalizeTextKey(raw);
  const exact = EXACT_TEXT_TRANSLATIONS[key] ?? TOUR_NAME_TRANSLATIONS[key] ?? NAME_TRANSLATIONS[key];
  if (exact) return exact;

  let text = key;
  for (const [pattern, replacement] of PHRASE_TRANSLATIONS) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/\b(\d+)\s*ngay\s*(\d+)\s*dem\b/g, (_, days, nights) => {
      const dayLabel = Number(days) === 1 ? 'day' : 'days';
      const nightLabel = Number(nights) === 1 ? 'night' : 'nights';
      return `${days} ${dayLabel} ${nights} ${nightLabel}`;
    })
    .replace(/\b(\d+)\s*ngay\b/g, (_, days) => `${days} ${Number(days) === 1 ? 'day' : 'days'}`);

  text = text
    .replace(/\bva\b/g, 'and')
    .replace(/\bhoac\b/g, 'or')
    .replace(/\bvoi\b/g, 'with')
    .replace(/\btai\b/g, 'at')
    .replace(/\btu\b/g, 'from')
    .replace(/\bden\b/g, 'to')
    .replace(/\btrong\b/g, 'in')
    .replace(/\btren\b/g, 'on')
    .replace(/\bgiua\b/g, 'among')
    .replace(/\bcua\b/g, 'of')
    .replace(/\bcac\b/g, '')
    .replace(/\bdiem\b/g, 'sites')
    .replace(/\bkhu vuc\b/g, 'area')
    .replace(/\bchu yeu\b/g, 'mainly')
    .replace(/\bvan\b/g, 'still')
    .replace(/\bneu\b/g, 'if')
    .replace(/\btheo\b/g, 'by');

  const translated = sentenceCase(text);
  return translated ? withPeriod(translated) : fallback;
};

const looksWeakEnglish = (value: string) => {
  const key = value.toLowerCase();
  return (
    /\b(khach|hanh trinh|lich trinh|du khach|bua|diem|chuong trinh|phuong tien|vung|nhip|nghi|dung|dac san|khoi hanh|tham quan|mua dac san|tien khach|chinh phuc|tim hieu|thuong thuc|trung tam|noi bat|phu hop|dich vu|goi|quy dinh|san pham|thuc te|mac dinh|seed|chua|ngam|ngan|han che|chuan bi|cung|deo|khong gian|thap|nha tho|pho di bo|dia phuong|cao nguyen|miet vuon|ban lang|ruong|kenh|my pham|nhan sam|phan khuc|tuyen tour|not yet|still|tuyen pho|quang cave|hoat cave|ngoai troi|khu thuong mai|dai lo|rung tre|ve dem|lich su|truoc khi|ket thuc|ban island|mot ngay|tam beach|tam bien|lien tuyen|quoc gia|khu marina|khu hakone|sites landmarks|sites photo|ho guom|am thuc)\b/.test(
      key,
    ) ||
    /^vietnam\s+[a-z]+/.test(key) ||
    /\b(to|from|at|with|by|or)\s+(ulun|not|giam|goi)\b/.test(key) ||
    /\bseafood\s+(phu|binh|nha|quy)\b/.test(key) ||
    /\bcuisine\s+(hanoi|da nang|and shopping)\b/.test(key) ||
    /\b(ca phe|bun cha|free time explore|beach resort pickup)\b/.test(key) ||
    /\b(hotel|resort|homestay)\s+[a-z]+ by goi\b/.test(key) ||
    /\bcuisine\s+(ha|phu|quang|nha|hue|bali|japan|kansai|south)\b/.test(key) ||
    /\bbeach\s+(my|phu|nha|quy|center)\b/.test(key) ||
    /\bcity tour\s+(tokyo|seoul|hong|paris|taipei)\b/.test(key) ||
    /\b[A-Z]?[a-z]+\s+sapa\b/.test(value)
  );
};

export const isUsableEnglishText = (value: unknown): value is string =>
  hasText(value) && !looksWeakEnglish(value);

const englishTourDescriptionFallback = (tour: UnknownRecord) => {
  const translated = toEnglishTextFallback(tour.description);
  if (translated && !looksWeakEnglish(translated)) return translated;

  const tourName = translateNameValue(tour.name, 'This tour');
  const destinationName = translateNameValue(
    destinationNameValue(tour) ?? tour.departurePoint,
    'the destination',
  );
  const duration = toEnglishDurationFallback(tour.duration).toLowerCase();
  return `${tourName} is a ${duration} itinerary designed for travelers who want a smooth guided experience in ${destinationName}. The trip includes scheduled transportation, curated stops, local meal arrangements, pre-departure support, and package options for different budgets.`;
};

const englishItineraryDescriptionFallback = (day: UnknownRecord, tour: UnknownRecord) => {
  const translated = toEnglishTextFallback(day.description);
  if (translated && !looksWeakEnglish(translated)) return translated;

  const activities = englishActivitiesFallback(day, tour).slice(0, 3);
  if (activities.length > 0) {
    return `Follow the planned route for this day, with ${activities.join(', ')} and scheduled meal or rest stops.`;
  }
  return 'Follow the planned route for this day with guided sightseeing and scheduled service stops.';
};

const englishAccommodationFallback = (value: unknown, tour: UnknownRecord) => {
  if (!hasText(value)) return '';
  const translated = toEnglishTextFallback(value);
  if (translated && !looksWeakEnglish(translated)) return translated;

  const destinationName = translateNameValue(destinationNameValue(tour) ?? tour.name, 'destination');
  const raw = normalizeTextKey(value);
  if (raw.includes('resort') || raw.includes('nghi duong')) {
    return `${destinationName} hotel or resort by selected package`;
  }
  if (raw.includes('homestay') || raw.includes('nha san')) {
    return `${destinationName} homestay by selected package`;
  }
  return `${destinationName} hotel by selected package`;
};

const englishTransportFallback = (value: unknown) => {
  if (!hasText(value)) return '';
  const translated = toEnglishTextFallback(value);
  if (translated && !looksWeakEnglish(translated)) return translated;

  const raw = normalizeTextKey(value);
  if (raw.includes('cap treo')) return 'Tourist vehicle and cable car depending on package';
  if (raw.includes('thuyen')) return 'Tourist vehicle and boat by itinerary';
  if (raw.includes('may bay') || raw.includes('bay')) return 'Flight and ground transfers by itinerary';
  if (raw.includes('xe rieng')) return 'Private vehicle by itinerary';
  return 'Scheduled tourist vehicle';
};

const englishTitleFallback = (day: UnknownRecord, tour: UnknownRecord) => {
  const translated = toEnglishTextFallback(day.title);
  if (translated && !looksWeakEnglish(translated)) return translated;

  const destinationName = translateNameValue(destinationNameValue(tour) ?? tour.name, 'Destination');
  const dayNumber = Number(day.dayNumber ?? 0);
  if (dayNumber > 0) return `Day ${dayNumber}: ${destinationName} Highlights`;
  return `${destinationName} Highlights`;
};

const englishActivityItemFallback = (value: unknown) => {
  if (!hasText(value)) return '';

  const key = normalizeTextKey(value);
  const exact = EXACT_TEXT_TRANSLATIONS[key] ?? NAME_TRANSLATIONS[key];
  if (exact && !looksWeakEnglish(exact)) return exact.replace(/[.!?]$/, '');

  const name = translateNameValue(value, '');
  if (name && !looksWeakEnglish(name)) return name.replace(/[.!?]$/, '');

  const translated = toEnglishTextFallback(value);
  if (translated && !looksWeakEnglish(translated)) return translated.replace(/[.!?]$/, '');

  return '';
};

const englishActivitiesFallback = (day: UnknownRecord, tour: UnknownRecord) => {
  const activitiesEn = arrayValue(day, 'activitiesEn');
  const activitiesVi = arrayValue(day, 'activities');
  const source = activitiesEn &&
    activitiesEn.length > 0 &&
    activitiesEn.every(isUsableEnglishText)
    ? activitiesEn
    : activitiesVi
      ? activitiesVi
      : [];

  const activities = source
    .map(englishActivityItemFallback)
    .filter(hasText)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 4);

  if (activities.length > 0) return activities;

  const destinationName = translateNameValue(destinationNameValue(tour) ?? tour.name, 'destination');
  return [
    `${destinationName} sightseeing`,
    'Local experience',
    'Scheduled meal stop',
  ];
};

const englishTimelineFallback = (day: UnknownRecord) => {
  const fallbackActivities = [
    'Guest pickup and departure',
    'Main sightseeing stop',
    'Lunch according to the itinerary',
    'Afternoon experience',
    'Dinner and rest',
  ];
  const source =
    arrayValue(day, 'timelineEn') && arrayValue(day, 'timelineEn')!.length > 0
      ? arrayValue(day, 'timelineEn')!
      : arrayValue(day, 'timeline')
        ? arrayValue(day, 'timeline')!
        : [];

  return source.map((item, index) => {
    const timelineItem = asRecord(item);
    if (!timelineItem) return { activity: 'Scheduled activity' };
    const fallback = fallbackActivities[index] ?? 'Scheduled activity';
    const translated = englishActivityItemFallback(timelineItem.activity) || fallback;
    return {
      ...timelineItem,
      activity: translated,
    };
  });
};

const englishHighlightFallback = (
  highlight: UnknownRecord,
  index: number,
  tour: UnknownRecord,
) => {
  const translated = toEnglishTextFallback(highlight.content);
  if (translated && !looksWeakEnglish(translated)) return translated;

  const destinationName = translateNameValue(destinationNameValue(tour) ?? tour.name, 'the destination');
  const genericHighlights = [
    `Signature sightseeing in ${destinationName}`,
    'Local culture and scenic experiences',
    'Included meals or selected local specialties',
    'Guided itinerary with scheduled support',
  ];
  return genericHighlights[index % genericHighlights.length];
};

const englishFaqFallback = (
  faq: UnknownRecord,
  index: number,
  tour: UnknownRecord,
) => {
  const question = toEnglishTextFallback(faq.question);
  const answer = toEnglishTextFallback(faq.answer);
  if (question && answer && !looksWeakEnglish(`${question} ${answer}`)) {
    return { question, answer };
  }

  const rawQuestionKey = normalizeTextKey(faq.question);
  if (rawQuestionKey.includes('visa')) {
    return {
      question: 'Do travelers need a visa for this tour?',
      answer:
        'Visa requirements depend on nationality and current entry rules. Our team will advise the required documents before confirmation.',
    };
  }
  if (rawQuestionKey.includes('tre em') || rawQuestionKey.includes('gia dinh')) {
    return {
      question: 'Is this tour suitable for families with children?',
      answer:
        'Yes, the itinerary is designed at a comfortable pace. Families should review the activity level and selected package before booking.',
    };
  }
  if (
    rawQuestionKey.includes('di bo') ||
    rawQuestionKey.includes('leo') ||
    rawQuestionKey.includes('trekking')
  ) {
    return {
      question: 'How demanding is the activity level?',
      answer:
        'The activity level depends on the route and selected stops. Guests should bring comfortable shoes and tell the team about any mobility concerns.',
    };
  }
  if (rawQuestionKey.includes('don') || rawQuestionKey.includes('khach san')) {
    return {
      question: 'Is hotel pickup available?',
      answer:
        'Pickup availability depends on the departure point and confirmed schedule. The team will confirm the exact time before departure.',
    };
  }

  const destinationName = translateNameValue(destinationNameValue(tour) ?? tour.name, 'this destination');
  const fallbacks = [
    {
      question: `What should I confirm before booking ${destinationName}?`,
      answer:
        'Final inclusions depend on the selected package and departure date. Please review the package details before payment.',
    },
    {
      question: 'Can the itinerary be adjusted?',
      answer:
        'Private and premium packages may allow more flexible timing, subject to supplier availability and seasonal conditions.',
    },
  ];
  return fallbacks[index % fallbacks.length];
};

export const toEnglishNameFallback = translateNameValue;

export const toEnglishDurationFallback = (value: unknown) => {
  const normalized = normalizeTextKey(value);
  const dayNight = normalized.match(/^(\d+)\s*ngay\s*(\d+)\s*dem$/);
  if (dayNight) {
    return `${dayNight[1]} ${dayNight[1] === '1' ? 'Day' : 'Days'} ${dayNight[2]} ${
      dayNight[2] === '1' ? 'Night' : 'Nights'
    }`;
  }
  const daysOnly = normalized.match(/^(\d+)\s*ngay$/);
  if (daysOnly) {
    return `${daysOnly[1]} ${daysOnly[1] === '1' ? 'Day' : 'Days'}`;
  }
  return translateNameValue(value, 'Contact for duration');
};

export const toEnglishArrayFallback = (primary: unknown, fallback: unknown) => {
  if (
    Array.isArray(primary) &&
    primary.length > 0 &&
    primary.every(isUsableEnglishText)
  ) {
    return primary.filter(isUsableEnglishText);
  }
  if (!Array.isArray(fallback)) return [];
  return fallback
    .map((item) => {
      const translated = toEnglishTextFallback(item);
      return translated && !looksWeakEnglish(translated)
        ? translated
        : translateNameValue(item, '');
    })
    .filter(hasText);
};

export const toEnglishTimelineFallback = (primary: unknown, fallback: unknown) => {
  const hasPrimary = Array.isArray(primary) && primary.length > 0;
  const source = hasPrimary ? primary : Array.isArray(fallback) ? fallback : [];
  return source.map((item) => {
    const timelineItem = asRecord(item);
    if (!timelineItem) return { activity: 'Scheduled activity' };
    const activity = hasPrimary && isUsableEnglishText(timelineItem.activity)
      ? timelineItem.activity
      : toEnglishTextFallback(timelineItem.activity);
    return {
      ...timelineItem,
      activity: isUsableEnglishText(activity) ? activity : 'Scheduled activity',
    };
  });
};

const englishPackageNameFallback = (value: unknown, index?: number) => {
  const key = normalizeTextKey(value);
  return PACKAGE_NAME_FALLBACKS[key] ?? `Package ${index != null ? index + 1 : ''}`.trim();
};

const englishPackageDescriptionFallback = (pkg: UnknownRecord, index?: number) => {
  const translated = toEnglishTextFallback(pkg.description);
  if (translated && !looksWeakEnglish(translated)) return translated;

  const packageName = englishPackageNameFallback(pkg.name, index).toLowerCase();
  if (packageName.includes('private')) {
    return 'Flexible private pacing with selected services for families or small groups.';
  }
  if (packageName.includes('premium')) {
    return 'Enhanced services for a more comfortable and complete journey.';
  }
  return 'Core services for a balanced and reliable tour experience.';
};

const englishDepartureNoteFallback = (departure: UnknownRecord) => {
  if (hasText(departure.note)) {
    const translated = toEnglishTextFallback(departure.note);
    if (translated && !looksWeakEnglish(translated)) return translated;
  }
  const category = departure.category;
  if (category === 'FLASH_SALE') return 'Flash sale departure';
  if (category === 'EARLY_BIRD') return 'Early bird departure';
  if (category === 'LAST_MINUTE') return 'Last-minute departure';
  return 'Regular departure';
};

export const localizeDestination = <T extends UnknownRecord | null | undefined>(
  destination: T,
  locale: SupportedLocale,
): T => {
  if (!destination || locale !== 'en') return destination;
  return {
    ...destination,
    name: isUsableEnglishText(destination.nameEn)
      ? destination.nameEn
      : translateNameValue(destination.name, 'Destination'),
    region: isUsableEnglishText(destination.regionEn)
      ? destination.regionEn
      : (REGION_FALLBACKS[normalizeTextKey(destination.region)] ??
        translateNameValue(
          destination.region,
          hasText(destination.region) ? destination.region : 'Region',
        )),
  };
};

export const localizePackage = <T extends UnknownRecord>(
  pkg: T,
  locale: SupportedLocale,
  index?: number,
): T => {
  if (locale !== 'en') return pkg;
  return {
    ...pkg,
    name: isUsableEnglishText(pkg.nameEn) ? pkg.nameEn : englishPackageNameFallback(pkg.name, index),
    description: isUsableEnglishText(pkg.descriptionEn)
      ? pkg.descriptionEn
      : englishPackageDescriptionFallback(pkg, index),
    includes: toEnglishArrayFallback(pkg.includesEn, pkg.includes),
    excludes: toEnglishArrayFallback(pkg.excludesEn, pkg.excludes),
  };
};

export const localizeDeparture = <T extends UnknownRecord>(
  departure: T,
  locale: SupportedLocale,
): T => {
  if (locale !== 'en') return departure;
  return {
    ...departure,
    note: isUsableEnglishText(departure.noteEn)
      ? departure.noteEn
      : englishDepartureNoteFallback(departure),
  };
};

export const localizeTour = <T extends UnknownRecord>(
  tour: T,
  locale: SupportedLocale,
): T => {
  if (locale !== 'en') return tour;

  return {
    ...tour,
    name: isUsableEnglishText(tour.nameEn) ? tour.nameEn : translateNameValue(tour.name, 'Tour'),
    description: isUsableEnglishText(tour.descriptionEn)
      ? tour.descriptionEn
      : englishTourDescriptionFallback(tour),
    duration: isUsableEnglishText(tour.durationEn)
      ? tour.durationEn
      : toEnglishDurationFallback(tour.duration),
    departurePoint: isUsableEnglishText(tour.departurePointEn)
      ? tour.departurePointEn
      : translateNameValue(tour.departurePoint, 'Contact for details'),
    destination: localizeDestination(recordValue(tour, 'destination'), locale),
    itinerary: Array.isArray(tour.itinerary)
      ? tour.itinerary.map((rawDay) => {
          const day = asRecord(rawDay) ?? {};
          return {
            ...day,
            title: isUsableEnglishText(day.titleEn)
              ? day.titleEn
              : englishTitleFallback(day, tour),
            description: isUsableEnglishText(day.descriptionEn)
              ? day.descriptionEn
              : englishItineraryDescriptionFallback(day, tour),
            accommodation: isUsableEnglishText(day.accommodationEn)
              ? day.accommodationEn
              : englishAccommodationFallback(day.accommodation, tour),
            transport: isUsableEnglishText(day.transportEn)
              ? day.transportEn
              : englishTransportFallback(day.transport),
            activities: englishActivitiesFallback(day, tour),
            timeline: englishTimelineFallback(day),
          };
        })
      : tour.itinerary,
    highlights: Array.isArray(tour.highlights)
      ? tour.highlights.map((rawHighlight, index: number) => {
          const highlight = asRecord(rawHighlight) ?? {};
          return {
            ...highlight,
            content: isUsableEnglishText(highlight.contentEn)
              ? highlight.contentEn
              : englishHighlightFallback(highlight, index, tour),
          };
        })
      : tour.highlights,
    faqs: Array.isArray(tour.faqs)
      ? tour.faqs.map((rawFaq, index: number) => {
          const faq = asRecord(rawFaq) ?? {};
          const fallback = englishFaqFallback(faq, index, tour);
          return {
            ...faq,
            question: isUsableEnglishText(faq.questionEn) ? faq.questionEn : fallback.question,
            answer: isUsableEnglishText(faq.answerEn) ? faq.answerEn : fallback.answer,
          };
        })
      : tour.faqs,
    packages: Array.isArray(tour.packages)
      ? tour.packages.map((rawPkg, index: number) =>
          {
            const pkg = asRecord(rawPkg) ?? {};
            return localizePackage(pkg, locale, index);
          },
        )
      : tour.packages,
    departures: Array.isArray(tour.departures)
      ? tour.departures.map((rawDeparture) => {
          const departure = asRecord(rawDeparture) ?? {};
          return localizeDeparture(departure, locale);
        })
      : tour.departures,
  };
};
