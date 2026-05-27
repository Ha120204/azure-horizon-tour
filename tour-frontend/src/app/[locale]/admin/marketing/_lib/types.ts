export type SubscriberStatus = 'all' | 'active' | 'inactive';
export type CampaignType = 'PROMOTION' | 'TRAVEL_STORY' | 'NEWSLETTER';
export type AudienceType = 'ALL_ACTIVE' | 'CURRENT_FILTER' | 'MANUAL_SELECTION';

export interface Subscriber {
  id: number;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface SubscriberStats {
  total: number;
  active: number;
  inactive: number;
  thisMonth: number;
}

export interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export interface CampaignDraft {
  id: string;
  name: string;
  type: CampaignType;
  subject: string;
  previewText: string;
  body: string;
  audience: AudienceType;
  audienceFilter?: { status?: SubscriberStatus; search?: string; recipientIds?: number[] };
  selectedSubscriberIds?: number[];
  selectedSubscriberEmails?: string[];
  recipientEstimate: number;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  sentAt?: string;
  sentCount?: number;
  failedCount?: number;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
}

export interface CampaignForm {
  name: string;
  type: CampaignType;
  subject: string;
  previewText: string;
  body: string;
  audience: AudienceType;
  selectedSubscriberIds: number[];
  selectedSubscriberEmails: string[];
}

export interface CampaignErrors {
  name?: string;
  subject?: string;
  body?: string;
  audience?: string;
  testEmail?: string;
}
