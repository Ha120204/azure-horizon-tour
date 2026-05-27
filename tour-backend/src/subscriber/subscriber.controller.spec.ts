import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SubscriberController } from './subscriber.controller';
import { SubscriberService } from './subscriber.service';

describe('SubscriberController', () => {
  let controller: SubscriberController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriberController],
      providers: [{ provide: SubscriberService, useValue: {} }],
    }).compile();

    controller = module.get<SubscriberController>(SubscriberController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it.each([
    'getAll',
    'getStats',
    'getCampaigns',
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
