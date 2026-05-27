import type { CampaignDraft, CampaignForm, CampaignType, SubscriberStats, SubscriberStatus } from './types';

export const EMPTY_STATS: SubscriberStats = { total: 0, active: 0, inactive: 0, thisMonth: 0 };

export const CAMPAIGN_DRAFTS_KEY = 'azure_horizon_campaign_drafts';

export const EMPTY_CAMPAIGN_FORM: CampaignForm = {
  name: '',
  type: 'PROMOTION',
  subject: '',
  previewText: '',
  body: '',
  audience: 'ALL_ACTIVE',
  selectedSubscriberIds: [],
  selectedSubscriberEmails: [],
};

export const statusOptions: { value: SubscriberStatus; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang nhận tin' },
  { value: 'inactive', label: 'Đã tạm dừng' },
];

export const campaignTypeConfig: Record<CampaignType, { label: string; icon: string; tone: string }> = {
  PROMOTION: { label: 'Khuyến mãi', icon: 'local_offer', tone: 'bg-amber-50 text-amber-700' },
  TRAVEL_STORY: { label: 'Câu chuyện du lịch', icon: 'auto_stories', tone: 'bg-blue-50 text-blue-700' },
  NEWSLETTER: { label: 'Bản tin tổng hợp', icon: 'newspaper', tone: 'bg-violet-50 text-violet-700' },
};

export const campaignStatusConfig: Record<CampaignDraft['status'], { label: string; tone: string }> = {
  DRAFT: { label: 'BẢN NHÁP', tone: 'bg-slate-100 text-slate-600' },
  SCHEDULED: { label: 'ĐÃ LÊN LỊCH', tone: 'bg-blue-50 text-blue-700' },
  SENDING: { label: 'ĐANG GỬI', tone: 'bg-amber-50 text-amber-700' },
  SENT: { label: 'ĐÃ GỬI', tone: 'bg-emerald-50 text-emerald-700' },
  FAILED: { label: 'LỖI GỬI', tone: 'bg-rose-50 text-rose-700' },
};
