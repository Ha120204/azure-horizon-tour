export type Message = {
    id: string;
    role: 'user' | 'ai';
    text?: string;
    textKey?: string;
    tourCard?: {
        id?: number;
        name?: string;
        price: string;
        image: string;
    };
};

export type PromptSuggestion = {
    textKey: string;
    icon: string;
    tone: 'primary' | 'secondary';
};

export type ChatSessionSummary = {
    id: string;
    title: string;
    preview: string;
    updatedAt: string;
    messageCount: number;
};

export type QuickContact = {
    label: string;
    href: string;
    icon?: string;
    textIcon?: string;
    className: string;
};
