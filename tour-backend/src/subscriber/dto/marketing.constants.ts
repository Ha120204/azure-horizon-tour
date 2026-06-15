export const CAMPAIGN_TYPES = ['PROMOTION', 'TRAVEL_STORY', 'NEWSLETTER'] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_AUDIENCES = ['ALL_ACTIVE', 'CURRENT_FILTER', 'MANUAL_SELECTION'] as const;
export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];

export const SUBSCRIBER_STATUSES = ['active', 'inactive', 'all'] as const;
export type SubscriberStatusFilter = (typeof SUBSCRIBER_STATUSES)[number];

// Giới hạn độ dài để chặn payload email quá khổ
export const CAMPAIGN_NAME_MAX = 120;
export const CAMPAIGN_SUBJECT_MAX = 200;
export const CAMPAIGN_PREVIEW_MAX = 300;
export const CAMPAIGN_BODY_MAX = 20000;
export const CAMPAIGN_SEARCH_MAX = 200;
