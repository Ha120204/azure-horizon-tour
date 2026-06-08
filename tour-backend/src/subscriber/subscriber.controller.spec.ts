import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SubscriberController } from './subscriber.controller';
import { SubscriberService } from './subscriber.service';

describe('SubscriberController', () => {
  let controller: SubscriberController;
  const subscriberService = {
    getUnsubscribeDetails: jest.fn(),
    unsubscribe: jest.fn(),
    cancelCampaign: jest.fn(),
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

  it('cancels a scheduled campaign by id', async () => {
    subscriberService.cancelCampaign.mockResolvedValue({ id: 'campaign-1', status: 'CANCELLED' });

    await expect(controller.cancelCampaign(' campaign-1 ')).resolves.toEqual({
      id: 'campaign-1',
      status: 'CANCELLED',
    });
    expect(subscriberService.cancelCampaign).toHaveBeenCalledWith('campaign-1');
  });

  it.each([
    'getAll',
    'getStats',
    'getCampaigns',
    'cancelCampaign',
    'setStatus',
    'sendCampaignTest',
    'scheduleCampaign',
    'remove',
  ] as const)('limits %s to ADMIN and SUPER_ADMIN', (methodName) => {
    const reflector = new Reflector();
    expect(
      reflector.get<string[]>('roles', SubscriberController.prototype[methodName]),
    ).toEqual(['ADMIN', 'SUPER_ADMIN']);
  });
});
