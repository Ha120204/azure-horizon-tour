type LocalizedDestination = {
    name: string;
    nameEn?: string | null;
    region?: string | null;
    regionEn?: string | null;
};

const DESTINATION_ENGLISH_NAMES: Record<string, string> = {
    'ba na': 'Ba Na Hills',
    'ba na hills': 'Ba Na Hills',
    'cat ba': 'Cat Ba',
    'con dao': 'Con Dao',
    'da lat': 'Da Lat',
    'da nang': 'Da Nang',
    'ha long': 'Ha Long',
    'ha noi': 'Hanoi',
    'hanoi': 'Hanoi',
    'hoi an': 'Hoi An',
    'hue': 'Hue',
    'mui ne': 'Mui Ne',
    'nha trang': 'Nha Trang',
    'phu quoc': 'Phu Quoc',
    'sapa': 'Sapa',
    'sa pa': 'Sapa',
};

const REGION_ENGLISH_NAMES: Record<string, string> = {
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

export const normalizeVietnameseText = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const stripVietnameseMarks = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'D')
        .replace(/(^|\s)d/g, (match) => match.toUpperCase());

export function getDestinationDisplayName(name: string, language: string) {
    if (language !== 'en') return name;
    const normalizedName = normalizeVietnameseText(name);
    return DESTINATION_ENGLISH_NAMES[normalizedName] ?? stripVietnameseMarks(name);
}

export function getRegionDisplayName(region: string | null | undefined, language: string) {
    if (!region) return region;
    if (language !== 'en') return region;
    const normalizedRegion = normalizeVietnameseText(region);
    return REGION_ENGLISH_NAMES[normalizedRegion] ?? stripVietnameseMarks(region);
}

export function getDestinationDisplay<T extends LocalizedDestination>(destination: T, language: string) {
    return {
        name:
            language === 'en' && destination.nameEn
                ? destination.nameEn
                : getDestinationDisplayName(destination.name, language),
        region:
            language === 'en' && destination.regionEn
                ? destination.regionEn
                : getRegionDisplayName(destination.region, language),
    };
}
