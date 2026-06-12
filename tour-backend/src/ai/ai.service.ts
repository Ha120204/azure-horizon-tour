/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

const LLMGATE_DEFAULT_BASE_URL = 'https://llmgate.app/v1';
const LLMGATE_LEGACY_BASE_URLS = new Set([
  'https://api.llmgateway.io/v1',
  'https://api.llmgate.app/v1',
]);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown AI error';
}

type TranslationTimelineEntry = {
  time?: string;
  activity?: string;
};

type IndexedTranslationItem = {
  index?: number;
};

export type TourTranslationRequest = {
  name?: string;
  description?: string;
  departurePoint?: string;
  duration?: string;
  packages?: (IndexedTranslationItem & {
    name?: string;
    description?: string;
    includes?: string[];
    excludes?: string[];
  })[];
  departures?: (IndexedTranslationItem & {
    note?: string;
  })[];
  highlights?: (IndexedTranslationItem & {
    content?: string;
  })[];
  faqs?: (IndexedTranslationItem & {
    question?: string;
    answer?: string;
  })[];
  itinerary?: (IndexedTranslationItem & {
    title?: string;
    description?: string;
    accommodation?: string;
    transport?: string;
    activities?: string[];
    timeline?: TranslationTimelineEntry[];
  })[];
};

export type TourTranslationResponse = {
  nameEn?: string;
  descriptionEn?: string;
  departurePointEn?: string;
  durationEn?: string;
  packages?: (IndexedTranslationItem & {
    nameEn?: string;
    descriptionEn?: string;
    includesEn?: string[];
    excludesEn?: string[];
  })[];
  departures?: (IndexedTranslationItem & {
    noteEn?: string;
  })[];
  highlights?: (IndexedTranslationItem & {
    contentEn?: string;
  })[];
  faqs?: (IndexedTranslationItem & {
    questionEn?: string;
    answerEn?: string;
  })[];
  itinerary?: (IndexedTranslationItem & {
    titleEn?: string;
    descriptionEn?: string;
    accommodationEn?: string;
    transportEn?: string;
    activitiesEn?: string[];
    timelineEn?: TranslationTimelineEntry[];
  })[];
};

export type ArticleTranslationRequest = {
  title?: string;
  excerpt?: string;
  content?: string;
};

export type ArticleTranslationResponse = {
  titleEn?: string;
  excerptEn?: string;
  contentEn?: string;
};

// Tool definitions in OpenAI-compatible format for LLMGate.
const TOUR_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_tours',
      description:
        'Tìm kiếm các tour du lịch trong hệ thống dựa trên yêu cầu của khách.',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description:
              'Tên điểm đến, địa danh, hoặc từ khóa (ví dụ: london, đà lạt, biển, châu âu).',
          },
          minPrice: {
            type: 'number',
            description:
              'Ngân sách tối thiểu của khách (tính bằng VND, ví dụ: 5000000 = 5 triệu).',
          },
          maxPrice: {
            type: 'number',
            description:
              'Ngân sách tối đa của khách (tính bằng VND, ví dụ: 10000000 = 10 triệu).',
          },
          tourType: {
            type: 'string',
            description:
              'Loại tour. Các giá trị hợp lệ: "Tour Gia Đình", "Tour Cao Cấp", "Nghỉ Dưỡng", "Khám Phá", "Văn Hóa & Lịch Sử", "Tour Ghép Đoàn".',
          },
          startMonth: {
            type: 'number',
            description: 'Tháng khởi hành (1–12). Ví dụ: 8 = tháng 8.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_my_bookings',
      description:
        'Tìm kiếm và lấy thông tin các đơn đặt tour (booking) của người dùng hiện tại đang chat với bạn.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description:
              "Lọc theo trạng thái đơn hàng (ví dụ: 'CONFIRMED', 'PENDING', 'CANCELLED', hoặc 'ALL'). Mặc định là 'ALL'.",
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_tour_details',
      description:
        'Lấy thông tin chi tiết của một tour cụ thể theo ID, bao gồm lịch trình, gói tour và FAQ.',
      parameters: {
        type: 'object',
        properties: {
          tourId: {
            type: 'number',
            description: 'ID của tour cần tra cứu.',
          },
        },
        required: ['tourId'],
      },
    },
  },
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private llmClient: OpenAI;
  private provider: 'llmgate' | 'openai';
  private primaryModel: string;
  private fallbackModel: string;
  private baseURL?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.provider = (
      this.configService.get<string>('AI_PROVIDER') || 'llmgate'
    ).toLowerCase() as 'llmgate' | 'openai';

    const llmgateApiKey =
      this.configService.get<string>('LLMGATE_API_KEY') || '';
    const llmgateBaseUrl = this.configService.get<string>('LLMGATE_BASE_URL');
    const llmgatePrimaryModel =
      this.configService.get<string>('LLMGATE_MODEL');
    const llmgateFallbackModel = this.configService.get<string>(
      'LLMGATE_FALLBACK_MODEL',
    );

    const genericApiKey = this.configService.get<string>('AI_API_KEY') || '';
    const apiKey =
      this.provider === 'llmgate'
        ? llmgateApiKey || genericApiKey
        : genericApiKey || llmgateApiKey;
    const configuredBaseURL =
      this.provider === 'llmgate'
        ? llmgateBaseUrl ||
          this.configService.get<string>('AI_BASE_URL') ||
          LLMGATE_DEFAULT_BASE_URL
        : this.configService.get<string>('AI_BASE_URL');
    this.baseURL =
      this.provider === 'llmgate'
        ? this.normalizeLlmgateBaseUrl(configuredBaseURL)
        : configuredBaseURL || undefined;
    this.primaryModel =
      this.provider === 'llmgate'
        ? this.normalizeLlmgateModel(
            llmgatePrimaryModel ||
              this.configService.get<string>('AI_PRIMARY_MODEL'),
            'gpt-5.4-mini',
          )
        : this.configService.get<string>('AI_PRIMARY_MODEL') ||
          llmgatePrimaryModel ||
          'gpt-5.4-mini';
    this.fallbackModel =
      this.provider === 'llmgate'
        ? this.normalizeLlmgateModel(
            llmgateFallbackModel ||
              this.configService.get<string>('AI_FALLBACK_MODEL'),
            'gpt-5.5',
          )
        : this.configService.get<string>('AI_FALLBACK_MODEL') ||
          llmgateFallbackModel ||
          'gpt-5.5';

    if (!this.primaryModel || !this.fallbackModel) {
      throw new Error(
        '[AI] Missing model configuration: AI_PRIMARY_MODEL / AI_FALLBACK_MODEL',
      );
    }
    if (!apiKey) {
      throw new Error('[AI] Missing API key configuration: AI_API_KEY');
    }

    const clientOptions: { apiKey: string; baseURL?: string } = { apiKey };
    if (this.baseURL) {
      clientOptions.baseURL = this.baseURL;
    }
    this.llmClient = new OpenAI(clientOptions);

    this.logger.log(
      `[AI] Initialized provider=${this.provider}, primary=${this.primaryModel}, fallback=${this.fallbackModel}, baseURL=${this.baseURL || 'default'}`,
    );
  }

  private normalizeLlmgateBaseUrl(baseURL?: string): string {
    const normalized = (baseURL || LLMGATE_DEFAULT_BASE_URL).replace(/\/+$/, '');
    if (LLMGATE_LEGACY_BASE_URLS.has(normalized)) {
      this.logger.warn(
        `[AI] Replacing deprecated LLMGate baseURL=${normalized} with ${LLMGATE_DEFAULT_BASE_URL}`,
      );
      return LLMGATE_DEFAULT_BASE_URL;
    }
    if (normalized === 'https://llmgate.app') {
      return LLMGATE_DEFAULT_BASE_URL;
    }
    return normalized;
  }

  private normalizeLlmgateModel(model: string | undefined, fallback: string) {
    if (!model || model === 'gpt-5.3-codex') {
      return fallback;
    }
    return model;
  }

  getStatus() {
    return {
      provider: this.provider,
      baseURL: this.baseURL || 'default',
      primaryModel: this.primaryModel,
      fallbackModel: this.fallbackModel,
      apiKeyConfigured: true,
    };
  }

  private formatHistoryMessages(
    messages: { id: number; role: string; content: string }[],
  ) {
    return messages.map((msg) => {
      let text = msg.content;
      let tourCard: any = undefined;

      if (msg.role === 'model') {
        const cardMatch = text.match(
          /<<<TOUR_CARD>>>([\s\S]*?)<<<END_TOUR_CARD>>>/,
        );
        if (cardMatch?.[1]) {
          try {
            tourCard = JSON.parse(cardMatch[1].trim());
            text = text.replace(cardMatch[0], '').trim();
          } catch (e) {
            console.error('[AI] Failed to parse TOUR_CARD in history:', getErrorMessage(e));
          }
        }
      }

      return {
        id: msg.id.toString(),
        role: msg.role === 'model' ? 'ai' : 'user',
        text,
        tourCard,
      };
    });
  }

  private async touchChatSession(sessionId: string) {
    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
  }

  private buildSessionSummary(session: {
    id: string;
    updatedAt: Date;
    createdAt: Date;
    messages: { role: string; content: string }[];
  }) {
    const firstUserMessage = session.messages.find(
      (msg) => msg.role === 'user' && msg.content.trim(),
    );
    const latestMessage = [...session.messages]
      .reverse()
      .find((msg) => msg.content.trim());
    const fallbackTitle = 'Cuộc trò chuyện mới';
    const rawTitle = firstUserMessage?.content || fallbackTitle;
    const rawPreview = latestMessage?.content || rawTitle;

    return {
      id: session.id,
      title:
        rawTitle.length > 48 ? `${rawTitle.substring(0, 48).trim()}...` : rawTitle,
      preview: this.stripTourCard(rawPreview)
        .replace(/\s+/g, ' ')
        .substring(0, 96)
        .trim(),
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      messageCount: session.messages.length,
    };
  }

  // Strip TOUR_CARD blocks before sending chat history back to the model.
  private stripTourCard(content: string): string {
    return content
      .replace(/<<<TOUR_CARD>>>[\s\S]*?<<<END_TOUR_CARD>>>/g, '')
      .trim();
  }
  // Extract TOUR_CARD JSON, persist the raw AI response, and return clean text.
  private async parseAndSaveResponse(
    rawText: string,
    sessionId: string,
  ): Promise<{ reply: string; tourCard?: any; sessionId: string }> {
    let reply = rawText;
    let tourCard: any = undefined;

    // Extract JSON Tour Card from response.
    const cardMatch = rawText.match(
      /<<<TOUR_CARD>>>([\s\S]*?)<<<END_TOUR_CARD>>>/,
    );
    if (cardMatch?.[1]) {
      try {
        tourCard = JSON.parse(cardMatch[1].trim());
        reply = rawText.replace(cardMatch[0], '').trim();
      } catch (e) {
        console.error('[AI] Failed to parse JSON TourCard:', getErrorMessage(e));
      }
    }

    // Store the original response, including TOUR_CARD, so history can restore it.
    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'model', content: rawText },
    });
    await this.touchChatSession(sessionId);

    return {
      reply: reply || 'Xin lỗi, tôi không thể trả lời lúc này.',
      tourCard,
      sessionId,
    };
  }
  // Tool: search tours in the database.
  private async executeSearchTours(args: any) {
    const { destination, minPrice, maxPrice, tourType, startMonth } = args;
    const whereClause: any = {
      availableSeats: { gt: 0 },
      status: 'PUBLISHED',
      deletedAt: null,
    };

    if (destination) {
      whereClause.OR = [
        { name: { contains: destination, mode: 'insensitive' } },
        {
          destination: { name: { contains: destination, mode: 'insensitive' } },
        },
        {
          destination: {
            region: { contains: destination, mode: 'insensitive' },
          },
        },
      ];
    }

    if (minPrice || maxPrice) {
      whereClause.price = {
        ...(minPrice ? { gte: Number(minPrice) } : {}),
        ...(maxPrice ? { lte: Number(maxPrice) } : {}),
      };
    }

    if (tourType) {
      whereClause.tourType = { contains: String(tourType), mode: 'insensitive' };
    }

    if (startMonth) {
      const month = Number(startMonth);
      const now = new Date();
      const year = now.getMonth() + 1 > month ? now.getFullYear() + 1 : now.getFullYear();
      whereClause.startDate = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }

    const tours = await this.prisma.tour.findMany({
      where: whereClause,
      include: { destination: true },
      take: 5,
      orderBy: { price: 'asc' },
    });

    if (tours.length === 0) {
      return {
        message: 'Không tìm thấy tour nào phù hợp với yêu cầu này.',
      };
    }

    return tours.map((t) => ({
      id: t.id,
      name: t.name,
      destination: t.destination?.name || 'Vô định',
      region: t.destination?.region || '',
      price: t.price,
      duration: t.duration,
      startDate: t.startDate.toISOString().split('T')[0],
      availableSeats: t.availableSeats,
      imageUrl: t.imageUrl,
      averageRating: t.averageRating,
      tourType: t.tourType,
    }));
  }
  // Tool: get tour details by ID.
  private async executeGetTourDetails(args: any) {
    const { tourId } = args;
    if (!tourId) return { message: 'Thiếu Tour ID.' };

    const tour = await this.prisma.tour.findFirst({
      where: { id: Number(tourId), deletedAt: null },
      include: {
        destination: true,
        itinerary: { orderBy: { dayNumber: 'asc' }, take: 5 },
        packages: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          take: 3,
        },
        faqs: { orderBy: { sortOrder: 'asc' }, take: 5 },
        highlights: { orderBy: { sortOrder: 'asc' }, take: 5 },
      },
    });

    if (!tour) return { message: `Không tìm thấy tour với ID ${tourId}.` };

    return {
      id: tour.id,
      name: tour.name,
      destination: tour.destination?.name,
      price: tour.price,
      duration: tour.duration,
      startDate: tour.startDate.toISOString().split('T')[0],
      availableSeats: tour.availableSeats,
      imageUrl: tour.imageUrl,
      averageRating: tour.averageRating,
      description: tour.description?.substring(0, 300) + '...',
      itinerary: tour.itinerary.map((d) => ({
        day: d.dayNumber,
        title: d.title,
      })),
      packages: tour.packages.map((p) => ({
        name: p.name,
        price: p.price,
        badge: p.badge,
      })),
      highlights: tour.highlights.map((h) => h.content),
      faqs: tour.faqs.map((f) => ({
        q: f.question,
        a: f.answer.substring(0, 150),
      })),
    };
  }
  // Tool: check current user bookings.
  private async executeCheckMyBookings(args: any, userId: number | null) {
    if (!userId) {
      return {
        message:
          'Khách hàng chưa đăng nhập. Vui lòng nhắc họ đăng nhập để kiểm tra đơn đặt tour cá nhân.',
      };
    }

    const statusFilter = args.status;
    const whereClause: any = { userId };
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      include: { tour: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    if (bookings.length === 0) {
      return {
        message: 'Không tìm thấy chuyến đi nào của bạn trong hệ thống.',
      };
    }

    return bookings.map((b) => ({
      bookingCode: b.bookingCode,
      tourName: b.tour.name,
      departureDate: b.tour.startDate.toISOString().split('T')[0],
      numberOfPeople: b.numberOfPeople,
      totalPrice: b.totalPrice,
      status: b.status,
      paymentStatus: b.paymentStatus,
    }));
  }
  // System prompt.
  private buildSystemPrompt(): string {
    const today = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `Bạn là "Azure Horizon AI Concierge" - trợ lý tư vấn du lịch của nền tảng đặt tour Azure Horizon.
Hôm nay là ${today}. Khi khách nhắc tới "tháng tới", "cuối năm", "hè này" hay bất kỳ mốc thời gian tương đối nào, hãy tính theo ngày này.

PHONG CÁCH TƯ VẤN:
- Trả lời như một nhân viên tư vấn du lịch có kinh nghiệm: tự nhiên, ấm áp, chủ động gợi mở, không máy móc.
- Ưu tiên tiếng Việt nếu khách dùng tiếng Việt. Câu trả lời nên ngắn vừa đủ, dễ quét, có bullet khi đưa nhiều lựa chọn.
- Nếu khách hỏi mơ hồ, hãy vừa đưa một hướng gợi ý ban đầu vừa hỏi thêm tối đa 1-2 thông tin quan trọng, ví dụ: ngân sách, thời gian đi, nhóm đi, kiểu trải nghiệm.
- Không ép khách cung cấp quá nhiều dữ liệu trước khi tư vấn. Hãy giúp họ tiến từng bước.

NGUYÊN TẮC DỮ LIỆU:
- Không bịa tên tour, giá, ngày khởi hành, số ghế, trạng thái booking hoặc chính sách.
- Khi nói về tour/booking có trong hệ thống, phải dựa trên tool.
- Bạn có thể tư vấn ý tưởng du lịch chung, cách chọn điểm đến, cách chia ngân sách, hoặc gợi ý cách tìm lại mà không khẳng định đó là tour có sẵn.

NGÂN SÁCH:
- Giá tour tính bằng VND. Khi khách nói "10 triệu" → maxPrice: 10000000. Khi nói "từ 5 đến 15 triệu" → minPrice: 5000000, maxPrice: 15000000.
- Không tự quy đổi sang USD.

LOẠI TOUR (tourType):
- Các giá trị hợp lệ duy nhất: "Tour Gia Đình", "Tour Cao Cấp", "Nghỉ Dưỡng", "Khám Phá", "Văn Hóa & Lịch Sử", "Tour Ghép Đoàn".
- Khi khách nói "tour biển" hoặc "nghỉ dưỡng" → tourType: "Nghỉ Dưỡng". Khi nói "tour gia đình" → tourType: "Tour Gia Đình". Khi nói "phượt/trekking/thiên nhiên" → tourType: "Khám Phá".

THÁNG KHỞI HÀNH (startMonth):
- Khi khách đề cập tháng cụ thể → truyền startMonth là số (1–12).

KHI NÀO GỌI TOOL:
- Khi khách hỏi tìm tour, điểm đến, tour biển, tour gia đình, tour theo ngân sách, hoặc gợi ý tour phù hợp: PHẢI gọi tool "search_tours" trước khi kết luận có tour cụ thể.
- Khi khách hỏi chi tiết một tour cụ thể hoặc nhắc tới ID tour: PHẢI gọi tool "get_tour_details".
- Khi khách hỏi booking/đơn đặt tour/chuyến đi của tôi/thanh toán của tôi: PHẢI gọi tool "check_my_bookings".
- Nếu khách chưa đăng nhập mà hỏi booking, giải thích ngắn gọn rằng cần đăng nhập để kiểm tra đơn cá nhân.

KHI KHÔNG TÌM THẤY TOUR:
- Nói rõ hiện chưa tìm thấy tour khớp trong hệ thống.
- Không dừng lại ở câu xin lỗi. Hãy đề xuất 2-4 hướng đi tiếp thực tế: đổi điểm đến, nới ngân sách, chọn kiểu tour khác, đổi thời gian, hoặc hỏi một câu để thu hẹp nhu cầu.
- Nếu câu hỏi quá rộng, hãy đưa ví dụ câu hỏi mẫu mà khách có thể gửi tiếp.

ĐỊNH DẠNG TOUR_CARD:
Chỉ khi tool trả về một tour thật sự phù hợp và bạn muốn giới thiệu nổi bật đúng 1 tour, chèn JSON ở cuối câu trả lời:
<<<TOUR_CARD>>>
{
  "id": <số id tour>,
  "name": "Tên tour đúng trong dữ liệu",
  "price": "Giá hiển thị ngắn gọn",
  "image": "URL ảnh của tour"
}
<<<END_TOUR_CARD>>>

Không dùng TOUR_CARD khi chỉ chat thường, khi chưa có dữ liệu tour, hoặc khi liệt kê nhiều tour.`;
  }
  // Fallback to secondary model when the primary model fails.
  private classifyAiError(
    error: any,
  ): 'model_not_found' | 'auth' | 'rate_limit' | 'network' | 'unknown' {
    const message = (error?.message || String(error)).toLowerCase();
    const status = Number(error?.status || error?.code || 0);
    if (
      message.includes('connection error') ||
      message.includes('network') ||
      message.includes('ssl') ||
      message.includes('tls') ||
      message.includes('trust relationship')
    )
      return 'network';
    if (
      status === 404 ||
      message.includes('404') ||
      message.includes('model not found')
    )
      return 'model_not_found';
    if (
      status === 401 ||
      status === 403 ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    )
      return 'auth';
    if (
      status === 429 ||
      message.includes('429') ||
      message.includes('quota') ||
      message.includes('resource_exhausted') ||
      message.includes('too many requests')
    )
      return 'rate_limit';
    return 'unknown';
  }

  private buildUserFacingErrorMessage(error: any): string {
    const type = this.classifyAiError(error);
    if (type === 'rate_limit')
      return 'Trợ lý AI hiện đang bận phục vụ nhiều khách. Vui lòng thử lại sau vài giây nhé!';
    if (type === 'auth')
      return 'Dịch vụ AI chưa được cấu hình quyền truy cập hợp lệ. Vui lòng liên hệ quản trị viên.';
    if (type === 'network')
      return 'Không thể kết nối đến Trợ lý AI. Vui lòng kiểm tra cấu hình endpoint AI và thử lại.';
    return 'Không thể kết nối đến Trợ lý AI. Vui lòng thử lại sau.';
  }

  private logAiErrorContext(stage: string, model: string, error: any) {
    const type = this.classifyAiError(error);
    const status = error?.status || error?.code || 'unknown';
    this.logger.error(
      `[AI] ${stage} failed (type=${type}, status=${status}, provider=${this.provider}, model=${model}, baseURL=${this.baseURL || 'default'})`,
    );
  }

  private async executeChatCompletion(
    model: string,
    payload: Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'model'>,
  ) {
    return this.llmClient.chat.completions.create({
      model,
      stream: false,
      ...payload,
    });
  }

  private truncateForTranslation(value: unknown, maxLength = 1200): string {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed.length > maxLength
      ? `${trimmed.slice(0, maxLength).trim()}...`
      : trimmed;
  }

  private compactTranslationRequest(
    payload: TourTranslationRequest,
  ): TourTranslationRequest {
    const cleanList = <T extends IndexedTranslationItem>(
      items: T[] | undefined,
      mapper: (item: T, index: number) => T,
    ) => (Array.isArray(items) ? items.map(mapper) : []);

    return {
      name: this.truncateForTranslation(payload.name, 180),
      description: this.truncateForTranslation(payload.description, 1800),
      departurePoint: this.truncateForTranslation(payload.departurePoint, 180),
      duration: this.truncateForTranslation(payload.duration, 80),
      packages: cleanList(payload.packages, (pkg, index) => ({
        index: Number(pkg.index ?? index),
        name: this.truncateForTranslation(pkg.name, 120),
        description: this.truncateForTranslation(pkg.description, 400),
        includes: Array.isArray(pkg.includes)
          ? pkg.includes.map((item) => this.truncateForTranslation(item, 160)).filter(Boolean)
          : [],
        excludes: Array.isArray(pkg.excludes)
          ? pkg.excludes.map((item) => this.truncateForTranslation(item, 160)).filter(Boolean)
          : [],
      })),
      departures: cleanList(payload.departures, (departure, index) => ({
        index: Number(departure.index ?? index),
        note: this.truncateForTranslation(departure.note, 240),
      })),
      highlights: cleanList(payload.highlights, (highlight, index) => ({
        index: Number(highlight.index ?? index),
        content: this.truncateForTranslation(highlight.content, 240),
      })),
      faqs: cleanList(payload.faqs, (faq, index) => ({
        index: Number(faq.index ?? index),
        question: this.truncateForTranslation(faq.question, 240),
        answer: this.truncateForTranslation(faq.answer, 800),
      })),
      itinerary: cleanList(payload.itinerary, (day, index) => ({
        index: Number(day.index ?? index),
        title: this.truncateForTranslation(day.title, 180),
        description: this.truncateForTranslation(day.description, 1200),
        accommodation: this.truncateForTranslation(day.accommodation, 180),
        transport: this.truncateForTranslation(day.transport, 180),
        activities: Array.isArray(day.activities)
          ? day.activities.map((item) => this.truncateForTranslation(item, 180)).filter(Boolean)
          : [],
        timeline: Array.isArray(day.timeline)
          ? day.timeline.map((item) => ({
              time: this.truncateForTranslation(item.time, 40),
              activity: this.truncateForTranslation(item.activity, 240),
            }))
          : [],
      })),
    };
  }

  private parseTranslationJson(rawText: string): TourTranslationResponse {
    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1] ?? rawText;
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      throw new Error('AI response did not contain a JSON object');
    }
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as TourTranslationResponse;
  }

  private async runTourTranslation(
    model: string,
    input: TourTranslationRequest,
  ): Promise<TourTranslationResponse> {
    const response = await this.executeChatCompletion(model, {
      messages: [
        {
          role: 'system',
          content:
            'You are a senior travel copy translator. Translate Vietnamese tour draft content into natural, concise English for a travel booking website. Preserve numbers, prices, dates, hotel ratings, and place names unless they have a common English name. Return only valid JSON. Keep every array item aligned by its index.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            instructions:
              'Translate the provided fields from Vietnamese to English. Omit fields that have no source text. For timeline items, keep the same time and translate only activity.',
            outputShape: {
              nameEn: 'string',
              descriptionEn: 'string',
              departurePointEn: 'string',
              durationEn: 'string',
              packages: [
                {
                  index: 0,
                  nameEn: 'string',
                  descriptionEn: 'string',
                  includesEn: ['string'],
                  excludesEn: ['string'],
                },
              ],
              departures: [{ index: 0, noteEn: 'string' }],
              highlights: [{ index: 0, contentEn: 'string' }],
              faqs: [{ index: 0, questionEn: 'string', answerEn: 'string' }],
              itinerary: [
                {
                  index: 0,
                  titleEn: 'string',
                  descriptionEn: 'string',
                  accommodationEn: 'string',
                  transportEn: 'string',
                  activitiesEn: ['string'],
                  timelineEn: [{ time: 'string', activity: 'string' }],
                },
              ],
            },
            input,
          }),
        },
      ],
      max_tokens: 2500,
      temperature: 0.2,
    });

    return this.parseTranslationJson(response.choices[0]?.message?.content || '');
  }

  async translateTourDraft(
    payload: TourTranslationRequest,
  ): Promise<TourTranslationResponse> {
    const compactInput = this.compactTranslationRequest(payload);
    try {
      return await this.runTourTranslation(this.primaryModel, compactInput);
    } catch (error) {
      this.logAiErrorContext('Tour translation primary model', this.primaryModel, error);
      try {
        return await this.runTourTranslation(this.fallbackModel, compactInput);
      } catch (fallbackError) {
        this.logAiErrorContext(
          'Tour translation fallback model',
          this.fallbackModel,
          fallbackError,
        );
        throw new ServiceUnavailableException(
          'Không thể tạo bản tiếng Anh tự động lúc này. Vui lòng thử lại sau.',
        );
      }
    }
  }

  async translateArticleDraft(
    payload: ArticleTranslationRequest,
  ): Promise<ArticleTranslationResponse> {
    const input: ArticleTranslationRequest = {
      title: this.truncateForTranslation(payload.title, 200),
      excerpt: this.truncateForTranslation(payload.excerpt, 500),
      content: this.truncateForTranslation(payload.content, 8000),
    };
    try {
      return await this.runArticleTranslation(this.primaryModel, input);
    } catch (error) {
      this.logAiErrorContext('Article translation primary model', this.primaryModel, error);
      try {
        return await this.runArticleTranslation(this.fallbackModel, input);
      } catch (fallbackError) {
        this.logAiErrorContext(
          'Article translation fallback model',
          this.fallbackModel,
          fallbackError,
        );
        throw new ServiceUnavailableException(
          'Không thể tạo bản tiếng Anh tự động lúc này. Vui lòng thử lại sau.',
        );
      }
    }
  }

  private async runArticleTranslation(
    model: string,
    input: ArticleTranslationRequest,
  ): Promise<ArticleTranslationResponse> {
    const response = await this.executeChatCompletion(model, {
      messages: [
        {
          role: 'system',
          content:
            'You are a senior travel-magazine translator. Translate Vietnamese blog article content into natural, fluent English for a travel journal. The "content" field is HTML — translate only the human-readable text and keep ALL HTML tags, attributes, and structure exactly intact (do not add, remove, or reorder tags). Preserve place names, numbers, and proper nouns unless they have a common English form. Return only valid JSON.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            instructions:
              'Translate title, excerpt and content from Vietnamese to English. Omit any field that has no source text. Do not change the HTML markup in content.',
            outputShape: {
              titleEn: 'string',
              excerptEn: 'string',
              contentEn: 'string (same HTML markup, English text)',
            },
            input,
          }),
        },
      ],
      max_tokens: 4000,
      temperature: 0.2,
    });

    const rawText = response.choices[0]?.message?.content || '';
    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1] ?? rawText;
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace < 0 || lastBrace <= firstBrace) {
      throw new Error('AI response did not contain a JSON object');
    }
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as ArticleTranslationResponse;
  }

  private getFunctionToolCall(
    toolCall: OpenAI.Chat.ChatCompletionMessageToolCall,
  ): { name?: string; arguments?: string } | null {
    if (toolCall.type !== 'function' || !('function' in toolCall)) {
      return null;
    }
    return toolCall.function;
  }

  private parseToolArguments(
    toolCall: OpenAI.Chat.ChatCompletionMessageToolCall,
  ): Record<string, unknown> {
    const functionCall = this.getFunctionToolCall(toolCall);
    const rawArguments = functionCall?.arguments || '{}';
    try {
      const parsed: unknown = JSON.parse(rawArguments);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      this.logger.warn(`[AI] Invalid tool arguments for ${functionCall?.name || 'unknown'}`);
      return {};
    }
  }

  private async executeTourTool(
    toolCall: OpenAI.Chat.ChatCompletionMessageToolCall,
    userId: number | null,
  ) {
    const toolName = this.getFunctionToolCall(toolCall)?.name;
    const toolArgs = this.parseToolArguments(toolCall);

    this.logger.log(`[AI] Tool called: ${toolName}`);

    if (toolName === 'search_tours') {
      return this.executeSearchTours(toolArgs);
    }
    if (toolName === 'check_my_bookings') {
      return this.executeCheckMyBookings(toolArgs, userId);
    }
    if (toolName === 'get_tour_details') {
      return this.executeGetTourDetails(toolArgs);
    }

    this.logger.warn(`[AI] Unknown tool requested: ${toolName || 'unknown'}`);
    return { message: `Tool ${toolName || 'unknown'} is not supported.` };
  }

  private async runModelChat(
    model: string,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    userId: number | null,
  ): Promise<string> {
    const response = await this.executeChatCompletion(model, {
      messages,
      tools: TOUR_TOOLS,
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    const choice = response.choices[0];
    if (!choice) return '';

    const toolCalls = choice.message?.tool_calls || [];
    if (choice.finish_reason === 'tool_calls' && toolCalls.length > 0) {
      messages.push(choice.message);

      for (const toolCall of toolCalls) {
        const fnResult = await this.executeTourTool(toolCall, userId);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(fnResult),
        });
      }

      const finalResponse = await this.executeChatCompletion(model, {
        messages,
        max_tokens: 1024,
      });

      return finalResponse.choices[0]?.message?.content || '';
    }

    return choice.message?.content || '';
  }

  private async chatWithFallback(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    sessionId: string,
    userId: number | null,
    originalError: any,
  ): Promise<{ reply: string; tourCard?: any; sessionId: string }> {
    this.logAiErrorContext('Primary model', this.primaryModel, originalError);
    this.logger.warn(`[AI] Switching to fallback model: ${this.fallbackModel}`);
    try {
      const rawText = await this.runModelChat(
        this.fallbackModel,
        messages,
        userId,
      );
      this.logger.log('[AI] Fallback model responded successfully.');
      return this.parseAndSaveResponse(rawText, sessionId);
    } catch (fallbackError: any) {
      this.logAiErrorContext(
        'Fallback model',
        this.fallbackModel,
        fallbackError,
      );
      return {
        reply: this.buildUserFacingErrorMessage(fallbackError),
        sessionId,
      };
    }
  }
  // Shared session setup used by both chat() and chatStream().
  private async setupChatSession(
    sessionId: string | undefined,
    userId: number | null | undefined,
  ): Promise<{ currentSessionId: string; dbHistory: { role: string; content: string }[] }> {
    let currentSessionId = sessionId;
    let dbHistory: { role: string; content: string }[] = [];

    if (currentSessionId) {
      const session = await this.prisma.chatSession.findUnique({
        where: { id: currentSessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (session) {
        if (userId && session.userId && session.userId !== userId) {
          currentSessionId = undefined;
        } else if (userId && !session.userId) {
          await this.prisma.chatSession.update({
            where: { id: currentSessionId },
            data: { userId },
          });
        }
        if (currentSessionId) {
          dbHistory = session.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));
        }
      } else {
        currentSessionId = undefined;
      }
    }

    if (!currentSessionId) {
      const newSession = await this.prisma.chatSession.create({
        data: { userId: userId || null },
      });
      currentSessionId = newSession.id;
    }

    return { currentSessionId, dbHistory };
  }

  // Build the messages array sent to the LLM from DB history + new user message.
  private buildChatMessages(
    dbHistory: { role: string; content: string }[],
    userMessage: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return [
      { role: 'system', content: this.buildSystemPrompt() },
      ...dbHistory
        .filter((msg) => msg.content?.trim())
        .slice(-20) // Giữ 20 messages gần nhất, tránh vượt context window và giảm chi phí.
        .map((msg): OpenAI.Chat.ChatCompletionMessageParam => ({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.role === 'model' ? this.stripTourCard(msg.content) : msg.content,
        })),
      { role: 'user', content: userMessage },
    ];
  }

  private buildFollowUpSuggestions(toolsUsed: string[]): string[] {
    if (toolsUsed.includes('search_tours')) {
      return ['Xem thêm lựa chọn khác', 'Tìm tour gia đình', 'Lọc theo ngân sách'];
    }
    if (toolsUsed.includes('check_my_bookings')) {
      return ['Liên hệ hỗ trợ', 'Tìm tour mới'];
    }
    if (toolsUsed.includes('get_tour_details')) {
      return ['Xem tour tương tự', 'So sánh giá các gói'];
    }
    return ['Gợi ý tour theo sở thích', 'Điểm đến phổ biến nhất'];
  }

  // Run first LLM call + tool resolution. Returns resolved messages ready for a streaming
  // final-answer call, or a directResponse string if no tools were invoked.
  private async resolveToolCallsOnly(
    model: string,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    userId: number | null,
  ): Promise<
    | { needsStream: true; messagesForStream: OpenAI.Chat.ChatCompletionMessageParam[]; toolsUsed: string[] }
    | { needsStream: false; directResponse: string; toolsUsed: string[] }
  > {
    const response = await this.executeChatCompletion(model, {
      messages,
      tools: TOUR_TOOLS,
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    const choice = response.choices[0];
    const toolCalls = choice?.message?.tool_calls || [];

    if (choice?.finish_reason === 'tool_calls' && toolCalls.length > 0) {
      const toolsUsed = toolCalls
        .map((tc) => this.getFunctionToolCall(tc)?.name)
        .filter((n): n is string => Boolean(n));
      const updatedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [...messages, choice.message];
      for (const toolCall of toolCalls) {
        const fnResult = await this.executeTourTool(toolCall, userId);
        updatedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(fnResult),
        });
      }
      return { needsStream: true, messagesForStream: updatedMessages, toolsUsed };
    }

    return { needsStream: false, directResponse: choice?.message?.content || '', toolsUsed: [] };
  }

  // Main chat function using the OpenAI-compatible LLMGate flow.
  async chat(
    userMessage: string,
    sessionId?: string,
    userId?: number | null,
  ): Promise<{ reply: string; tourCard?: any; sessionId?: string }> {
    const { currentSessionId, dbHistory } = await this.setupChatSession(sessionId, userId);

    await this.prisma.chatMessage.create({
      data: { sessionId: currentSessionId, role: 'user', content: userMessage },
    });
    await this.touchChatSession(currentSessionId);

    const messages = this.buildChatMessages(dbHistory, userMessage);

    try {
      const rawText = await this.runModelChat(
        this.primaryModel,
        messages,
        userId || null,
      );
      return this.parseAndSaveResponse(rawText, currentSessionId);
    } catch (error: any) {
      this.logAiErrorContext('Chat flow', this.primaryModel, error);
      return this.chatWithFallback(
        messages,
        currentSessionId,
        userId || null,
        error,
      );
    }
  }
  // Streaming chat — yields tokens as they arrive from the LLM.
  async *chatStream(
    userMessage: string,
    sessionId?: string,
    userId?: number | null,
  ): AsyncGenerator<
    | { searching: true }
    | { token: string }
    | { done: true; tourCard?: any; sessionId: string; followUps?: string[] }
    | { error: string }
  > {
    const { currentSessionId, dbHistory } = await this.setupChatSession(sessionId, userId);

    await this.prisma.chatMessage.create({
      data: { sessionId: currentSessionId, role: 'user', content: userMessage },
    });
    await this.touchChatSession(currentSessionId);

    const messages = this.buildChatMessages(dbHistory, userMessage);

    yield { searching: true };

    let resolveResult!: Awaited<ReturnType<typeof this.resolveToolCallsOnly>>;
    try {
      resolveResult = await this.resolveToolCallsOnly(this.primaryModel, messages, userId || null);
    } catch (primaryError: any) {
      this.logAiErrorContext('Stream tool-resolve primary', this.primaryModel, primaryError);
      try {
        resolveResult = await this.resolveToolCallsOnly(this.fallbackModel, messages, userId || null);
      } catch (fallbackError: any) {
        this.logAiErrorContext('Stream tool-resolve fallback', this.fallbackModel, fallbackError);
        yield { error: this.buildUserFacingErrorMessage(fallbackError) };
        return;
      }
    }

    // No tool calls — emit direct response and finish (no second LLM call needed).
    if (!resolveResult.needsStream) {
      const result = await this.parseAndSaveResponse(resolveResult.directResponse, currentSessionId);
      if (result.reply) yield { token: result.reply };
      yield { done: true, tourCard: result.tourCard, sessionId: currentSessionId, followUps: this.buildFollowUpSuggestions([]) };
      return;
    }

    // Tool calls resolved — stream the final synthesis.
    // Track emitted characters to stop yielding once <<<TOUR_CARD>>> begins.
    const modelForStream = this.primaryModel;
    try {
      const stream = await this.llmClient.chat.completions.create({
        model: modelForStream,
        messages: resolveResult.messagesForStream,
        stream: true,
        max_tokens: 1024,
      });

      let fullText = '';
      let emittedChars = 0;

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (!token) continue;
        fullText += token;

        const cardStart = fullText.indexOf('<<<TOUR_CARD>>>');
        const safeUpTo = cardStart === -1 ? fullText.length : cardStart;
        if (safeUpTo > emittedChars) {
          yield { token: fullText.slice(emittedChars, safeUpTo) };
          emittedChars = safeUpTo;
        }
      }

      const result = await this.parseAndSaveResponse(fullText, currentSessionId);
      const followUps = this.buildFollowUpSuggestions(resolveResult.toolsUsed);
      yield { done: true, tourCard: result.tourCard, sessionId: currentSessionId, followUps };
    } catch (streamError: any) {
      this.logAiErrorContext('Stream final-answer', modelForStream, streamError);
      yield { error: this.buildUserFacingErrorMessage(streamError) };
    }
  }

  // Get chat history by sessionId.
  async getHistory(sessionId: string, userId?: number | null) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) return { messages: [] };
    if (session.userId && session.userId !== userId) return { messages: [] };

    return {
      sessionId: session.id,
      messages: this.formatHistoryMessages(session.messages),
    };
  }

  // Get the latest chat history for the authenticated user.
  async getLatestHistoryForUser(userId: number) {
    const session = await this.prisma.chatSession.findFirst({
      where: { userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (!session) return { sessionId: undefined, messages: [] };

    return {
      sessionId: session.id,
      messages: this.formatHistoryMessages(session.messages),
    };
  }

  // Get all chat sessions for the authenticated user.
  async getSessionsForUser(userId: number) {
    const sessions = await this.prisma.chatSession.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });

    return {
      sessions: sessions.map((session) => this.buildSessionSummary(session)),
    };
  }

  // Clear a session and start a new conversation.
  async clearSession(
    sessionId: string,
    userId?: number | null,
  ): Promise<{ success: boolean }> {
    try {
      const session = await this.prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { userId: true },
      });
      if (!session) return { success: true };
      if (session.userId && session.userId !== userId) {
        return { success: false };
      }

      await this.prisma.chatSession.delete({ where: { id: sessionId } });
      return { success: true };
    } catch {
      return { success: false };
    }
  }
}

