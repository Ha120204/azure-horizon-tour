import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  const mockPrisma = {
    chatSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
    },
  } as any;

  const mockBookingCancellationService = {
    getCancellationPolicyForBooking: jest.fn(),
  } as any;

  const baseConfig = {
    AI_PROVIDER: 'llmgate',
    AI_API_KEY: 'test-key',
    AI_BASE_URL: 'https://llmgate.app/v1',
    AI_PRIMARY_MODEL: 'primary-model',
    AI_FALLBACK_MODEL: 'fallback-model',
  };

  const createService = (overrides: Record<string, string> = {}) => {
    const configService = {
      get: jest.fn((key: string) => ({ ...baseConfig, ...overrides })[key]),
    } as unknown as ConfigService;
    const mockEmbeddingService = { semanticSearch: jest.fn().mockResolvedValue([]) } as any;
    return new AiService(configService, mockPrisma, mockBookingCancellationService, mockEmbeddingService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.chatSession.findUnique.mockResolvedValue(null);
    mockPrisma.chatSession.findFirst.mockResolvedValue(null);
    mockPrisma.chatSession.findMany.mockResolvedValue([]);
    mockPrisma.chatSession.create.mockResolvedValue({ id: 'session-1' });
    mockPrisma.chatSession.update.mockResolvedValue({});
    mockPrisma.chatMessage.create.mockResolvedValue({});
  });

  it('uses provider from env', () => {
    const service = createService({ AI_PROVIDER: 'openai', AI_BASE_URL: '' });
    expect((service as any).provider).toBe('openai');
  });

  it('returns primary model response when primary succeeds', async () => {
    const service = createService();
    (service as any).executeChatCompletion = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'primary ok' }, finish_reason: 'stop' }],
    });

    const result = await service.chat('hello');

    expect((service as any).executeChatCompletion).toHaveBeenCalledWith(
      'primary-model',
      expect.objectContaining({ max_tokens: 1024 }),
    );
    expect(result.reply).toBe('primary ok');
  });

  it('falls back when primary returns model_not_found', async () => {
    const service = createService();
    (service as any).executeChatCompletion = jest
      .fn()
      .mockRejectedValueOnce({ message: '404 model not found', status: 404 })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'fallback ok' } }],
      });

    const result = await service.chat('hello');

    expect((service as any).executeChatCompletion).toHaveBeenNthCalledWith(
      1,
      'primary-model',
      expect.any(Object),
    );
    expect((service as any).executeChatCompletion).toHaveBeenNthCalledWith(
      2,
      'fallback-model',
      expect.any(Object),
    );
    expect(result.reply).toBe('fallback ok');
  });

  it('returns standardized error when primary and fallback fail', async () => {
    const service = createService();
    (service as any).executeChatCompletion = jest
      .fn()
      .mockRejectedValueOnce({ message: '404 model not found', status: 404 })
      .mockRejectedValueOnce({ message: 'still failing', status: 500 });

    const result = await service.chat('hello');

    expect(result.reply).toContain('Vui');
  });
});
