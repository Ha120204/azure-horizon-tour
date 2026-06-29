import { API_BASE_URL } from '../http/constants';

export type PublicSettings = {
    company_name: string;
    company_address: string;
    company_address_en: string;
    company_phone: string;
    company_email: string;
    company_description: string;
    booking_max_people: number;
    booking_min_people: number;
    passenger_info_deadline_days: number;
    staff_assist_min_people: number;
};

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
    company_name: 'Azure Horizon',
    company_address: '123 Horizon Avenue, District 1, Ho Chi Minh City',
    company_address_en: '123 Horizon Avenue, District 1, Ho Chi Minh City',
    company_phone: '+84 1900 1234',
    company_email: 'hello@azurehorizon.com',
    company_description: 'Pioneering premium travel experiences.',
    booking_max_people: 20,
    booking_min_people: 1,
    passenger_info_deadline_days: 3,
    staff_assist_min_people: 6,
};

export async function fetchPublicSettings(signal?: AbortSignal): Promise<PublicSettings> {
    try {
        const response = await fetch(`${API_BASE_URL}/settings/public`, {
            cache: 'no-store',
            signal,
        });

        if (!response.ok) return DEFAULT_PUBLIC_SETTINGS;

        const json = await response.json().catch(() => null);
        return {
            ...DEFAULT_PUBLIC_SETTINGS,
            ...(json?.data ?? json ?? {}),
        };
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }

        return DEFAULT_PUBLIC_SETTINGS;
    }
}
