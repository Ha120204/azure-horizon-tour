export const getTranslatedVoucher = (voucher: any, language: string) => {
    if (!voucher) return voucher;

    const EN_MAP: Record<string, {label: string, desc: string}> = {
        'AZURE10': { label: 'Hello Summer 10%', desc: '10% off for all tours. No minimum order value.' },
        'WELCOME15': { label: 'New User 15%', desc: 'Exclusive for first-time bookers.' },
        'SUMMER20': { label: 'Summer Vibes 20%', desc: 'Summer special – 20% off for tours from $250.' },
        'FAMILY25': { label: 'Fun Family 25%', desc: '25% off for family tours from $500.' },
        'LUXURY30': { label: 'Luxury Elite 30%', desc: 'Special 30% discount for premium tours from $1000.' },
        'EARLYBIRD': { label: 'Early Bird 12%', desc: 'Book 30 days in advance to get 12% off.' },
        'COUPLE18': { label: 'Romantic Couple 18%', desc: '18% off for couple tours from $350.' },
        'VIP35': { label: 'VIP Member 35%', desc: 'For VIP members, 35% off tours over $1500.' },
        'FLASH5': { label: 'Flash Sale 5%', desc: 'Weekend flash sale, instant 5% off without conditions.' },
        'AUTUMN22': { label: 'Golden Autumn 22%', desc: 'Ideal autumn travel – 22% off from $400.' },
        'SAVE200K': { label: 'Instant $10 Off', desc: 'Fixed $10 off for any order from $100.' },
        'SAVE500K': { label: '$25 Off', desc: '$25 off for tours from $250.' },
        'SAVE1M': { label: '$50 Off', desc: 'Save $50 instantly for tours from $400.' },
        'SAVE2M': { label: '$100 Off', desc: '$100 off for premium tours from $750.' },
        'SAVE3M': { label: 'Mega Sale $150', desc: 'Deep discount of $150 for tours from $1200.' },
        'SAVE5M': { label: 'Premium Escape $250', desc: '$250 off for resort tours from $2000.' },
        'BIRTHDAY': { label: 'Birthday Gift -$15', desc: 'Birthday present – $15 off, applicable to all tours.' },
        'REFERRAL': { label: 'Referral -$25', desc: '$25 off when booking a tour through a friend\'s invite.' },
        'NEWYR1M': { label: 'New Year 2026 -$50', desc: 'Happy New Year – $50 off for tours from $500.' },
        'XMAS500': { label: 'Christmas -$25', desc: 'Christmas gift – $25 off for end-of-year resort tours.' }
    };

    if (language === 'en') {
        const tr = EN_MAP[voucher.code];
        if (tr) {
            return {
                ...voucher,
                label: tr.label,
                description: tr.desc
            };
        }
    }
    
    return voucher;
};

const EN_TOUR_MAP: Record<number, {name: string, description: string, departurePoint: string}> = {
    "1": {
        "name": "Phu Quoc VIP Family Estate 7D6N",
        "description": "Private villa 4 bedrooms, private transfer, private chef, Vinwonders VIP và activities for kids.",
        "departurePoint": "Ho Chi Minh City"
    },
    "2": {
        "name": "Phu Quoc Honeymoon All-Inclusive",
        "description": "Honeymoon package: villa ocean view, couples spa, sunset cruise riêng, breakfast in bed.",
        "departurePoint": "Ho Chi Minh City"
    },
    "3": {
        "name": "Phu Quoc Fun Family 4D3N",
        "description": "Vinwonders, Aquatopia Water Park, animal safari, fire show và nghỉ Vinpearl Resort coastal.",
        "departurePoint": "Ho Chi Minh City"
    },
    "4": {
        "name": "Phu Quoc Premium 5D4N",
        "description": "Resort 5 sao beach Kem, scuba diving Hòn Thơm, safari Vinpearl, spa hot spring và gala dinner.",
        "departurePoint": "Ho Chi Minh City"
    },
    "5": {
        "name": "Phu Quoc Basic 3D2N",
        "description": "Khám phá island Phu Quoc – beach Sao, night market, prison Phu Quoc và show Vinwonders.",
        "departurePoint": "Ho Chi Minh City"
    },
    "6": {
        "name": "Nha Trang Yacht & Scuba 6D5N",
        "description": "Autumnê du thuyền riêng 6 ngày, course PADI scuba diving, tour island riêng và chef personal.",
        "departurePoint": "Ho Chi Minh City"
    },
    "7": {
        "name": "Nha Trang Spa & Diving 5D4N",
        "description": "Resort stay resort 5 sao, course lặn scuba diving, mud bath VIP và sunset cruise.",
        "departurePoint": "Ho Chi Minh City"
    },
    "8": {
        "name": "Nha Trang Blue Sea 3D2N",
        "description": "Coral diving Hòn Mun, visit Vinpearl, mud bath khoáng và đêm seafood BBQ.",
        "departurePoint": "Ho Chi Minh City"
    },
    "9": {
        "name": "Da Lat Romantic Couple 4D3N",
        "description": "Exclusive journey for couples: church Con Gà, Autumnng Lũng Vàng, cable car và candlelight dinner.",
        "departurePoint": "Ho Chi Minh City"
    },
    "10": {
        "name": "Da Lat Strawberries & Waterfalls",
        "description": "Khám phá strawberry garden, waterfall Datanla, Langbiang và enjoy café Da Lat.",
        "departurePoint": "Ho Chi Minh City"
    },
    "11": {
        "name": "Discovery Da Lat 2D1N",
        "description": "2-day journey to experience the city of a thousand flowers – thung lũng tình yêu, lake Tuyền Lâm và flower garden Mê Linh.",
        "departurePoint": "Ho Chi Minh City"
    },
    "12": {
        "name": "Hoi An - Da Nang Combo 4D3N",
        "description": "All-inclusive combo: Bà Nà Hills, ancient town Hoi An, Mỹ Sơn, swimming Mỹ Khê và local cuisine.",
        "departurePoint": "Ho Chi Minh City"
    },
    "13": {
        "name": "Hoi An Ancient Town 1 Day",
        "description": "Khám phá ancient town Hoi An, releasing flower lanterns và enjoy cao lầu, banh mi Phượng huyền thoại.",
        "departurePoint": "Da Nang"
    },
    "14": {
        "name": "Ha Long Seaplane & Cruise 4D3N",
        "description": "Watch Ha Long from a seaplane, cruise 5 sao Emperor Junk, visit island Cát Bà và floating fishing village.",
        "departurePoint": "Hanoi"
    },
    "15": {
        "name": "Ha Long Luxury Cruise 3D2N",
        "description": "5-star cruise Ha Long – tour SUP paddling, cooking class seafood, float swimming jacuzzi on the bay.",
        "departurePoint": "Hanoi"
    },
    "16": {
        "name": "Ha Long Bay Discovery 2D1N",
        "description": "Du thuyền Ha Long – kayaking cave Sáng Tối, visit cave Thiên Cung, sleep overnight on the bay.",
        "departurePoint": "Hanoi"
    },
    "17": {
        "name": "Sapa Luxury Private Trek 4D3N",
        "description": "Private trekking với porter và chef, sleep glamping on top Fansipan, dinner under the stars.",
        "departurePoint": "Hanoi"
    },
    "18": {
        "name": "Sapa - Bắc Hà 6D5N",
        "description": "Northeast arc journey: Sapa, Bắc Hà ethnic market, Y Tý, Mường Khương và ruộng bậc tcave.",
        "departurePoint": "Hanoi"
    },
    "19": {
        "name": "Sapa Luxury Trek 3D2N",
        "description": "Premium trekking Sapa – Y Tý – Village Phùng, sleep homestay ethnic, ngắm ruộng bậc tcave most beautiful.",
        "departurePoint": "Hanoi"
    },
    "20": {
        "name": "Sapa Trek Basic",
        "description": "Trekking 2 ngày through village Cát Cát, ruộng bậc tcave Mường Hoa with local guide.",
        "departurePoint": "Hanoi"
    },
    "21": {
        "name": "Da Nang - Hoi An Prestige 5D4N",
        "description": "Intercontinental Danang Sun Peninsula, private beach, michelin dining, thuê xe sang và golf.",
        "departurePoint": "Ho Chi Minh City"
    },
    "22": {
        "name": "Da Nang - Bà Nà Premium 4D3N",
        "description": "Resort InterContinental Danang, Bà Nà Hills VIP pass, cable car kỷ lục và gala dinner beach biển.",
        "departurePoint": "Ho Chi Minh City"
    },
    "23": {
        "name": "Da Nang City Tour",
        "description": "Cầu Vàng – Bà Nà Hills – Ngũ Hành Sơn – Chợ Hàn – trọn vẹn trong 1 ngày.",
        "departurePoint": "Da Nang"
    },
    "24": {
        "name": "Mui Ne Sunrise Eco",
        "description": "Tour sáng sớm chụp ảnh bình minh đồi cát, visit làng chài và enjoy seafood.",
        "departurePoint": "Ho Chi Minh City"
    },
    "25": {
        "name": "Mui Ne Cát Vàng Cuối Tuần",
        "description": "Tour 2 ngày swimming, trượt cát đồi lakeng, đồi trắng và enjoy seafood tươi ngon.",
        "departurePoint": "Ho Chi Minh City"
    },
    "26": {
        "name": "Con Dao Six Senses Retreat 5D4N",
        "description": "Trải nghiệm đẳng cấp Six Senses: detox spa, yoga, scuba diving riêng tư, fine dining và butlter service.",
        "departurePoint": "Ho Chi Minh City"
    },
    "27": {
        "name": "Con Dao Eco Luxury 4D3N",
        "description": "Resort Six Senses Con Dao, lặn rạn san hô, xem rùa biển đẻ trứng và yoga beach biển.",
        "departurePoint": "Ho Chi Minh City"
    },
    "28": {
        "name": "Con Dao Pristine 3D2N",
        "description": "Khám phá Con Dao hoang sơ – lặn ngắm san hô, viếng nghĩa trang Hàng Dương, xem rùa đẻ trứng.",
        "departurePoint": "Ho Chi Minh City"
    },
    "29": {
        "name": "Hue - Hoi An Heritage 5D4N",
        "description": "Hành trình di sản: Đại Nội Hue, thánh địa Mỹ Sơn, ancient town Hoi An, thuyền rồng sông Hương.",
        "departurePoint": "Ho Chi Minh City"
    },
    "30": {
        "name": "Hue Ancient Capital 1 Days",
        "description": "Tham quan Đại Nội, lăng Tự Đức, chùa Thiên Mụ và enjoy cơm vua Hue.",
        "departurePoint": "Da Nang"
    },
    "31": {
        "name": "Phu Quoc Last Minute – Couple Suite",
        "description": "Couple suite ocean view còn 1 phòng – 4 ngày spa, scuba diving, sunset cruise riêng.",
        "departurePoint": "Ho Chi Minh City"
    },
    "32": {
        "name": "Phu Quoc Early Bird – Vinwonders VIP",
        "description": "Vinwonders + Vinpearl Safari + show Aquatopia – đặt trước 45 ngày giảm 20%.",
        "departurePoint": "Ho Chi Minh City"
    },
    "33": {
        "name": "Phu Quoc Flash Sale – Summer 2025",
        "description": "Combo resort 4★ beach Sao + lặn san hô Hòn Thơm + night market – đặt ngay kẻo hết!",
        "departurePoint": "Ho Chi Minh City"
    },
    "34": {
        "name": "Nha Trang Early Bird – Year-End",
        "description": "Resort 5★ Nha Trang, spa hot spring, lặn scuba + cooking class seafood – ưu đãi đặt sớm.",
        "departurePoint": "Ho Chi Minh City"
    },
    "35": {
        "name": "Nha Trang Flash – Mud Bath & Beach",
        "description": "Resort 4★ Nha Trang, mud bath khoáng Tháp Bà, lặn ngắm san hô – flash sale cuối tuần.",
        "departurePoint": "Ho Chi Minh City"
    },
    "36": {
        "name": "Da Lat Last Minute – This Weekend",
        "description": "Chuyến đi 2 ngày 1 đêm Da Lat – cable car, waterfall Datanla, flower garden và cà phê Mê Linh.",
        "departurePoint": "Ho Chi Minh City"
    },
    "37": {
        "name": "Hoi An Early Bird – Mùa Golden Autumn",
        "description": "Phố cổ Hoi An mùa thu – thuyền rồng, làng rau Trà Quế, xưởng gốm Thanh Hà và ẩm thực.",
        "departurePoint": "Ho Chi Minh City"
    },
    "38": {
        "name": "Ha Long Last Minute – Cabin Còn 2",
        "description": "Du thuyền 3★ còn 2 cabin – khởi hành ngay tuần này, giá giảm 40% so với niêm yết.",
        "departurePoint": "Hanoi"
    },
    "39": {
        "name": "Ha Long Flash Sale – Night on the Bay",
        "description": "Du thuyền 2 sao Ha Long – kayaking cave Luồn, ngắm bình minh từ boong tàu, seafood BBQ.",
        "departurePoint": "Hanoi"
    },
    "40": {
        "name": "Sapa Early Bird – Ripe Rice Season",
        "description": "Watch ruộng bậc tcave vàng rực tháng 9 – Sapa, Mù Cang Chải, Tú Lệ – book sớm giá tốt.",
        "departurePoint": "Hanoi"
    },
    "41": {
        "name": "Sapa Flash – Trekking Mùa Summer",
        "description": "Trekking Cát Cát – Tả Van – Y Linh Hồ, sleep homestay người H'Mông, ngắm ruộng bậc tcave xanh mướt.",
        "departurePoint": "Hanoi"
    },
    "42": {
        "name": "Da Nang Flash – Sun World Bà Nà",
        "description": "Vé VIP Bà Nà Hills, visit Chùa Linh Ứng, cầu Vàng checkin và đêm ancient town Hoi An.",
        "departurePoint": "Hanoi"
    },
    "43": {
        "name": "Mui Ne Last Minute – Only 3 Slots Left",
        "description": "Giá từ phòng khách sạn hủy – 2 ngày cát vàng, thuyền thúng, làng chài và hoàng hôn biển.",
        "departurePoint": "Ho Chi Minh City"
    },
    "44": {
        "name": "Con Dao Early Bird – Autumn 2025",
        "description": "All-inclusive combo Con Dao: resort coastal, lặn ngắm san hô, viếng nghĩa trang Hàng Dương và safari rùa.",
        "departurePoint": "Ho Chi Minh City"
    },
    "45": {
        "name": "Hue Last Minute – Canceled Room Rate",
        "description": "Tour Hue gấp từ phòng hủy: Đại Nội, lăng Tự Đức, thuyền rồng + bữa trưa cơm vua.",
        "departurePoint": "Da Nang"
    },
    "46": {
        "name": "Phu Quoc Last Minute – Couple Suite",
        "description": "Couple suite ocean view còn 1 phòng – 4 ngày spa, scuba diving, sunset cruise riêng.",
        "departurePoint": "Ho Chi Minh City"
    },
    "47": {
        "name": "Phu Quoc Early Bird – Vinwonders VIP",
        "description": "Vinwonders + Vinpearl Safari + show Aquatopia – đặt trước 45 ngày giảm 20%.",
        "departurePoint": "Ho Chi Minh City"
    },
    "48": {
        "name": "Phu Quoc Flash Sale – Summer 2025",
        "description": "Combo resort 4★ beach Sao + lặn san hô Hòn Thơm + night market – đặt ngay kẻo hết!",
        "departurePoint": "Ho Chi Minh City"
    },
    "49": {
        "name": "Nha Trang Early Bird – Year-End",
        "description": "Resort 5★ Nha Trang, spa hot spring, lặn scuba + cooking class seafood – ưu đãi đặt sớm.",
        "departurePoint": "Ho Chi Minh City"
    },
    "50": {
        "name": "Nha Trang Flash – Mud Bath & Beach",
        "description": "Resort 4★ Nha Trang, mud bath khoáng Tháp Bà, lặn ngắm san hô – flash sale cuối tuần.",
        "departurePoint": "Ho Chi Minh City"
    },
    "51": {
        "name": "Da Lat Last Minute – This Weekend",
        "description": "Chuyến đi 2 ngày 1 đêm Da Lat – cable car, waterfall Datanla, flower garden và cà phê Mê Linh.",
        "departurePoint": "Ho Chi Minh City"
    },
    "52": {
        "name": "Hoi An Early Bird – Mùa Golden Autumn",
        "description": "Phố cổ Hoi An mùa thu – thuyền rồng, làng rau Trà Quế, xưởng gốm Thanh Hà và ẩm thực.",
        "departurePoint": "Ho Chi Minh City"
    },
    "53": {
        "name": "Ha Long Last Minute – Cabin Còn 2",
        "description": "Du thuyền 3★ còn 2 cabin – khởi hành ngay tuần này, giá giảm 40% so với niêm yết.",
        "departurePoint": "Hanoi"
    },
    "54": {
        "name": "Ha Long Flash Sale – Night on the Bay",
        "description": "Du thuyền 2 sao Ha Long – kayaking cave Luồn, ngắm bình minh từ boong tàu, seafood BBQ.",
        "departurePoint": "Hanoi"
    },
    "55": {
        "name": "Sapa Early Bird – Ripe Rice Season",
        "description": "Watch ruộng bậc tcave vàng rực tháng 9 – Sapa, Mù Cang Chải, Tú Lệ – book sớm giá tốt.",
        "departurePoint": "Hanoi"
    },
    "56": {
        "name": "Sapa Flash – Trekking Mùa Summer",
        "description": "Trekking Cát Cát – Tả Van – Y Linh Hồ, sleep homestay người H'Mông, ngắm ruộng bậc tcave xanh mướt.",
        "departurePoint": "Hanoi"
    },
    "57": {
        "name": "Da Nang Flash – Sun World Bà Nà",
        "description": "Vé VIP Bà Nà Hills, visit Chùa Linh Ứng, cầu Vàng checkin và đêm ancient town Hoi An.",
        "departurePoint": "Hanoi"
    },
    "58": {
        "name": "Mui Ne Last Minute – Only 3 Slots Left",
        "description": "Giá từ phòng khách sạn hủy – 2 ngày cát vàng, thuyền thúng, làng chài và hoàng hôn biển.",
        "departurePoint": "Ho Chi Minh City"
    },
    "59": {
        "name": "Con Dao Early Bird – Autumn 2025",
        "description": "All-inclusive combo Con Dao: resort coastal, lặn ngắm san hô, viếng nghĩa trang Hàng Dương và safari rùa.",
        "departurePoint": "Ho Chi Minh City"
    },
    "60": {
        "name": "Hue Last Minute – Canceled Room Rate",
        "description": "Tour Hue gấp từ phòng hủy: Đại Nội, lăng Tự Đức, thuyền rồng + bữa trưa cơm vua.",
        "departurePoint": "Da Nang"
    }
};

export const getTranslatedTour = (tour: any, language: string) => {
    if (!tour) return tour;
    
    if (language === 'en') {
        const tr = EN_TOUR_MAP[tour.id];
        if (tr) {
            return {
                ...tour,
                name: tr.name || tour.name,
                description: tr.description || tour.description,
                departurePoint: tr.departurePoint || tour.departurePoint
            };
        }
    }
    
    return tour;
};
