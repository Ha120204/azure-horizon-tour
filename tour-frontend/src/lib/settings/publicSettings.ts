import { API_BASE_URL } from '../http/constants';

export type PublicSettings = {
    company_name: string;
    company_address: string;
    company_phone: string;
    company_email: string;
    company_description: string;
};

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
    company_name: 'Azure Horizon',
    company_address: '123 Horizon Avenue, District 1, Ho Chi Minh City',
    company_phone: '+84 1900 1234',
    company_email: 'hello@azurehorizon.com',
    company_description: 'Pioneering premium travel experiences.',
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
