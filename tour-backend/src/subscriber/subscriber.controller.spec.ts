import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SubscriberController } from './subscriber.controller';
import { SubscriberService } from './subscriber.service';

describe('SubscriberController', () => {
  let controller: SubscriberController;
  const subscriberService = {
    getUnsubscribeDetails: jest.fn(),
    unsubscribe: jest.fn(),
    createDraft: jest.fn(),
    updateDraft: jest.fn(),
    scheduleCampaign: jest.fn(),
    cancelCampaign: jest.fn(),
    deleteDraft: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriberController],
      providers: [{ provide: SubscriberService, useValue: subscriberService }],
    }).compile();

    controller = module.get<SubscriberController>(SubscriberController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('checks an unsubscribe token without changing subscriber state', async () => {
    subscriberService.getUnsubscribeDetails.mockResolvedValue({ email: 'tr***@example.com', isActive: true });

    await expect(controller.getUnsubscribeDetails(' valid-token ')).resolves.toEqual({
      email: 'tr***@example.com',
      isActive: true,
    });
    expect(subscriberService.getUnsubscribeDetails).toHaveBeenCalledWith('valid-token');
  });

  it('submits unsubscribe confirmation separately from the GET check', async () => {
    subscriberService.unsubscribe.mockResolvedValue({ success: true });

    await expect(controller.unsubscribe({ token: ' valid-token ', reason: 'EMAIL_LINK' })).resolves.toEqual({
      success: true,
    });
    expect(subscriberService.unsubscribe).toHaveBeenCalledWith('valid-token', 'EMAIL_LINK');
  });

  it('creates a draft with the authenticated admin id', async () => {
    subscriberService.createDraft.mockResolvedValue({ id: 'campaign-1', status: 'DRAFT' });
    const dto = { campaignName: 'Hè', subject: 'Ưu đãi', body: 'Nội dung', audience: 'ALL_ACTIVE' } as any;

    await expect(controller.createCampaign(dto, { user: { userId: 7 } })).resolves.toEqual({
      id: 'campaign-1',
      status: 'DRAFT',
    });
    expect(subscriberService.createDraft).toHaveBeenCalledWith(dto, 7);
  });

  it('updates a draft by trimmed id', async () => {
    subscriberService.updateDraft.mockResolvedValue({ id: 'campaign-1' });
    const dto = { subject: 'Tiêu đề mới' } as any;

    await expect(controller.updateCampaign(' campaign-1 ', dto)).resolves.toEqual({ id: 'campaign-1' });
    expect(subscriberService.updateDraft).toHaveBeenCalledWith('campaign-1', dto);
  });

  it('schedules a draft by trimmed id and scheduledAt', async () => {
    subscriberService.scheduleCampaign.mockResolvedValue({ id: 'campaign-1', status: 'SCHEDULED' });

    await expect(controller.scheduleCampaign(' campaign-1 ', { scheduledAt: '2026-07-01T09:00:00.000Z' })).resolves.toEqual({
      id: 'campaign-1',
      status: 'SCHEDULED',
    });
    expect(subscriberService.scheduleCampaign).toHaveBeenCalledWith('campaign-1', '2026-07-01T09:00:00.000Z');
  });

  it('cancels a scheduled campaign by id', async () => {
    subscriberService.cancelCampaign.mockResolvedValue({ id: 'campaign-1', status: 'CANCELLED' });

    await expect(controller.cancelCampaign(' campaign-1 ')).resolves.toEqual({
      id: 'campaign-1',
      status: 'CANCELLED',
    });
    expect(subscriberService.cancelCampaign).toHaveBeenCalledWith('campaign-1');
  });

  it('deletes a draft by trimmed id', async () => {
    subscriberService.deleteDraft.mockResolvedValue({ success: true });

    await expect(controller.deleteCampaign(' campaign-1 ')).resolves.toEqual({ success: true });
    expect(subscriberService.deleteDraft).toHaveBeenCalledWith('campaign-1');
  });

  it.each([
    'getAll',
    'getStats',
    'getCampaigns',
    'createCampaign',
    'updateCampaign',
    'scheduleCampaign',
    'cancelCampaign',
    'deleteCampaign',
    'setStatus',
    'sendCampaignTest',
    'remove',
  ] as const)('limits %s to ADMIN and SUPER_ADMIN', (methodName) => {
    const reflector = new Reflector();
    expect(
      reflector.get<string[]>('roles', SubscriberController.prototype[methodName]),
    ).toEqual(['ADMIN', 'SUPER_ADMIN']);
  });
});
