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
  cancelledAt?: string;
  processedCount?: number;
  sentCount?: number;
  failedCount?: number;
  errorMessage?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
}

export interface BackendMarketingCampaign {
  id: string;
  campaignName: string;
  type?: string;
  subject: string;
  previewText?: string;
  body: string;
  audience: AudienceType;
  audienceFilter?: { status?: SubscriberStatus; search?: string; recipientIds?: number[] };
  recipientIds?: number[];
  scheduledAt?: string;
  status: CampaignDraft['status'];
  recipientEstimate: number;
  processedCount?: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  cancelledAt?: string;
  errorMessage?: string;
}

export interface CampaignCounts {
  active: number;
  sent: number;
  closed: number;
  all: number;
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
