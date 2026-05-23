import type { QuickContact, PromptSuggestion } from './types';

export const QUICK_CONTACTS: QuickContact[] = [
    {
        label: 'Call Azure Horizon',
        href: 'tel:+84386761856',
        icon: 'call',
        className: 'bg-primary text-white hover:bg-primary-container',
    },
    {
        label: 'Facebook',
        href: 'https://www.facebook.com/daothanhha120204',
        textIcon: 'f',
        className: 'bg-[#1877F2] text-white hover:bg-[#0f66d6]',
    },
    {
        label: 'Zalo',
        href: 'https://zalo.me/0386761856',
        textIcon: 'Zalo',
        className: 'bg-white text-[#0068ff] ring-1 ring-[#0068ff]/20 hover:bg-[#eef5ff]',
    },
];

export const getPromptSuggestions = (hasAccessToken: boolean): PromptSuggestion[] => [
    { textKey: 'conciergeApp.prompt1', icon: 'beach_access', tone: 'primary' },
    { textKey: 'conciergeApp.prompt2', icon: 'payments', tone: 'secondary' },
    {
        textKey: hasAccessToken ? 'conciergeApp.prompt3' : 'conciergeApp.prompt4',
        icon: hasAccessToken ? 'confirmation_number' : 'explore',
        tone: 'secondary',
    },
];
