import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingCancellationService } from '../booking/booking-cancellation.service';
import { AiEmbeddingService } from './ai-embedding.service';

const LLMGATE_DEFAULT_BASE_URL = 'https://llmgate.app/v1';
const LLMGATE_LEGACY_BASE_URLS = new Set([
  'https://api.llmgateway.io/v1',
  'https://api.llmgate.app/v1',
]);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown AI error';
}

type TourCard = { id?: number; name?: string; price?: string; image?: string };

interface AiError { message?: string; status?: number; code?: number }

interface SearchToursArgs { destination?: string; departurePoint?: string; minPrice?: number; maxPrice?: number; tourType?: string; startMonth?: number; partySize?: number }
interface GetTourDetailsArgs { tourId?: number }
interface CheckMyBookingsArgs { status?: string; bookingCode?: string }
interface GetCancellationPolicyArgs { bookingCode?: string }

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
          departurePoint: {
            type: 'string',
            description:
              'Điểm khởi hành của khách (nơi xuất phát), ví dụ: "Hà Nội", "TP.HCM", "Đà Nẵng". Chỉ truyền khi khách nêu rõ nơi khởi hành.',
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
          partySize: {
            type: 'number',
            description:
              'Số khách đi cùng (tổng số người), để chỉ trả về tour còn đủ ghế. Ví dụ: 2 = đi 2 người.',
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
        'Tìm kiếm và lấy thông tin các đơn đặt tour (booking) của người dùng hiện tại đang chat với bạn. Có thể tra theo mã booking cụ thể.',
      parameters: {
        type: 'object',
        properties: {
          bookingCode: {
            type: 'string',
            description:
              'Mã đặt chỗ cụ thể cần tra cứu (ví dụ: "BKG-060626-L7NN"). Truyền khi khách đưa ra một mã booking.',
          },
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
  {
    type: 'function',
    function: {
      name: 'get_cancellation_policy',
      description:
        'Tính chính sách hủy và số tiền hoàn dự kiến cho MỘT booking cụ thể của người dùng đang đăng nhập, tại thời điểm hiện tại. Dùng khi khách hỏi "hủy đơn này được hoàn bao nhiêu", hoặc hỏi về việc hủy một mã booking cụ thể.',
      parameters: {
        type: 'object',
        properties: {
          bookingCode: {
            type: 'string',
            description:
              'Mã đặt chỗ cần tính chính sách hủy (ví dụ: "BKG-060626-L7NN").',
          },
        },
        required: ['bookingCode'],
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
    private readonly bookingCancellationService: BookingCancellationService,
    private readonly embeddingService: AiEmbeddingService,
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
      let tourCard: TourCard | undefined = undefined;

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
  ): Promise<{ reply: string; tourCard?: TourCard; sessionId: string }> {
    let reply = rawText;
    let tourCard: TourCard | undefined = undefined;

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
  // Tách chuỗi điểm đến/tên tour thành các token có nghĩa để khớp linh hoạt.
  private static readonly SEARCH_STOP_WORDS = new Set([
    'tour', 'ngay', 'ngày', 'dem', 'đêm', 'va', 'và', 'cac', 'các', 'di', 'đi',
  ]);
  private toSearchTerms(input: string): string[] {
    const tokens = input
      .split(/[\s\-–—_,/]+/)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token.length >= 2 &&
          !/^\d+$/.test(token) &&
          !AiService.SEARCH_STOP_WORDS.has(token.toLowerCase()),
      );
    return tokens.length > 0 ? tokens : [input.trim()];
  }

  // Lấy ngữ cảnh tour của trang khách đang mở (id + tên) để nhúng vào system prompt.
  private async getCurrentTourContext(
    tourId?: number | null,
  ): Promise<{ id: number; name: string } | null> {
    if (!tourId) return null;
    try {
      const tour = await this.prisma.tour.findFirst({
        where: { id: Number(tourId), deletedAt: null },
        select: { id: true, name: true },
      });
      return tour ?? null;
    } catch {
      return null;
    }
  }

  // Tool: search tours in the database.
  private async executeSearchTours(args: Record<string, unknown>) {
    const { destination, departurePoint, minPrice, maxPrice, tourType, startMonth, partySize } =
      args as SearchToursArgs;
    const party = partySize ? Number(partySize) : null;

    const whereClause: Prisma.TourWhereInput = {
      // partySize: chỉ trả tour còn đủ ghế cho cả nhóm (mặc định chỉ cần còn ghế).
      availableSeats: party ? { gte: party } : { gt: 0 },
      status: 'PUBLISHED',
      deletedAt: null,
    };

    const andConditions: Prisma.TourWhereInput[] = [];

    if (destination) {
      // Mỗi token phải khớp ít nhất một trường (AND giữa các token, OR giữa các trường)
      // → gõ gần đúng tên tour, sai dấu gạch hay thiếu/thừa chữ vẫn tìm ra.
      andConditions.push(
        ...this.toSearchTerms(destination).map((term) => ({
          OR: [
            { name: { contains: term, mode: 'insensitive' as const } },
            { destination: { name: { contains: term, mode: 'insensitive' as const } } },
            { destination: { region: { contains: term, mode: 'insensitive' as const } } },
          ],
        })),
      );
    }

    if (departurePoint) {
      // Lọc theo điểm khởi hành mặc định của tour (Tour.departurePoint).
      andConditions.push(
        ...this.toSearchTerms(departurePoint).map((term) => ({
          departurePoint: { contains: term, mode: 'insensitive' as const },
        })),
      );
    }

    if (andConditions.length > 0) {
      whereClause.AND = andConditions;
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
      const range = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
      // Ưu tiên khớp theo NGÀY KHỞI HÀNH cụ thể (TourDeparture còn đủ ghế),
      // fallback về Tour.startDate cho tour chưa tạo lịch khởi hành chi tiết.
      whereClause.OR = [
        {
          departures: {
            some: {
              isActive: true,
              departureDate: range,
              availableSeats: party ? { gte: party } : { gt: 0 },
            },
          },
        },
        { startDate: range },
      ];
    }

    const tours = await this.prisma.tour.findMany({
      where: whereClause,
      include: { destination: true },
      take: 5,
      orderBy: { price: 'asc' },
    });

    if (tours.length === 0) {
      // Keyword search trả về rỗng → thử semantic search nếu có đủ văn bản truy vấn.
      const semanticQuery = [destination, tourType].filter(Boolean).join(' ');
      if (semanticQuery) {
        const semanticRows = await this.embeddingService.semanticSearch(semanticQuery, party ?? 1);
        if (semanticRows.length > 0) {
          return semanticRows.map((t) => ({
            id: t.id,
            name: t.name,
            destination: t.destinationName || 'Vô định',
            region: t.region || '',
            departurePoint: t.departurePoint || '',
            price: Number(t.price),
            duration: t.duration,
            startDate: new Date(t.startDate).toISOString().split('T')[0],
            availableSeats: Number(t.availableSeats),
            imageUrl: t.imageUrl,
            averageRating: Number(t.averageRating),
            tourType: t.tourType,
            _semanticMatch: true,
          }));
        }
      }
      return { message: 'Không tìm th��y tour nào phù hợp với yêu cầu này.' };
    }

    return tours.map((t) => ({
      id: t.id,
      name: t.name,
      destination: t.destination?.name || 'Vô định',
      region: t.destination?.region || '',
      departurePoint: t.departurePoint || '',
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
  private async executeGetTourDetails(args: Record<string, unknown>) {
    const { tourId } = args as GetTourDetailsArgs;
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
  private async executeCheckMyBookings(args: Record<string, unknown>, userId: number | null) {
    if (!userId) {
      return {
        message:
          'Khách hàng chưa đăng nhập. Vui lòng nhắc họ đăng nhập để kiểm tra đơn đặt tour cá nhân.',
      };
    }

    const { status: statusFilter, bookingCode } = args as CheckMyBookingsArgs;
    const whereClause: Prisma.BookingWhereInput = { userId };
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter as Prisma.BookingWhereInput['status'];
    }

    const trimmedCode = bookingCode?.trim();
    if (trimmedCode) {
      whereClause.bookingCode = { contains: trimmedCode, mode: 'insensitive' };
    }

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      include: { tour: true },
      orderBy: { createdAt: 'desc' },
      take: trimmedCode ? 5 : 8,
    });

    if (bookings.length === 0) {
      return {
        message: trimmedCode
          ? `Không tìm thấy booking mã "${trimmedCode}" trong tài khoản của bạn.`
          : 'Không tìm thấy chuyến đi nào của bạn trong hệ thống.',
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
  // Tool: tính chính sách hủy cho một booking cụ thể của khách đang đăng nhập (đọc-only).
  private async executeGetCancellationPolicy(
    args: Record<string, unknown>,
    userId: number | null,
  ) {
    if (!userId) {
      return {
        message:
          'Khách hàng chưa đăng nhập. Vui lòng nhắc họ đăng nhập để kiểm tra chính sách hủy đơn cá nhân.',
      };
    }

    const { bookingCode } = args as GetCancellationPolicyArgs;
    const trimmedCode = bookingCode?.trim();
    if (!trimmedCode) {
      return { message: 'Vui lòng cung cấp mã booking để kiểm tra chính sách hủy.' };
    }

    const booking = await this.prisma.booking.findFirst({
      where: {
        userId,
        bookingCode: { contains: trimmedCode, mode: 'insensitive' },
        deletedAt: null,
      },
      select: {
        bookingCode: true,
        status: true,
        paymentStatus: true,
        totalPrice: true,
        createdAt: true,
        departureId: true,
        tour: { select: { name: true, startDate: true } },
      },
    });

    if (!booking) {
      return {
        message: `Không tìm thấy booking mã "${trimmedCode}" trong tài khoản của bạn.`,
      };
    }

    const policy =
      await this.bookingCancellationService.getCancellationPolicyForBooking(booking);

    return {
      bookingCode: booking.bookingCode,
      tourName: booking.tour.name,
      status: booking.status,
      canCancel: policy.canCancel,
      cancelUnavailableReason: policy.cancelUnavailableReason,
      refundPercent: policy.refundPercent,
      estimatedRefundAmount: policy.estimatedRefundAmount,
      refundNote: policy.refundNote,
      daysUntilDeparture: policy.daysUntilDeparture,
    };
  }
  // System prompt.
  private buildSystemPrompt(currentTour?: { id: number; name: string } | null): string {
    const today = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const currentTourSection = currentTour
      ? `

NGỮ CẢNH TRANG HIỆN TẠI:
- Khách đang mở trang chi tiết của tour ID=${currentTour.id} (tên: "${currentTour.name}").
- Khi khách nói "tour này", "tour đang xem", hoặc hỏi chi tiết/lịch trình/giá/gói/đặt chỗ mà không nêu rõ một tour khác, hãy hiểu đó là tour ID=${currentTour.id} và gọi tool "get_tour_details" với tourId=${currentTour.id}. KHÔNG dùng "search_tours" cho trường hợp này.`
      : '';
    return `Bạn là "Azure Horizon AI Concierge" - trợ lý tư vấn du lịch của nền tảng đặt tour Azure Horizon.
Hôm nay là ${today}. Khi khách nhắc tới "tháng tới", "cuối năm", "hè này" hay bất kỳ mốc thời gian tương đối nào, hãy tính theo ngày này.${currentTourSection}

PHONG CÁCH TƯ VẤN:
- Trả lời như một nhân viên tư vấn du lịch có kinh nghiệm: tự nhiên, ấm áp, chủ động gợi mở, không máy móc.
- Ưu tiên tiếng Việt nếu khách dùng tiếng Việt. Câu trả lời nên ngắn vừa đủ, dễ quét, có bullet khi đưa nhiều lựa chọn.
- Không ép khách cung cấp quá nhiều dữ liệu trước khi tư vấn. Hãy giúp họ tiến từng bước.

QUY TRÌNH TƯ VẤN ĐIỂM ĐẾN (giống tổng đài du lịch):
- LUÔN ĐỌC LẠI TOÀN BỘ hội thoại trước khi hỏi. Điểm đến thường được khách nêu NGAY Ở TIN NHẮN ĐẦU TIÊN (ví dụ "tôi muốn đi Nhật Bản") → đó chính là destination, phải GHI NHỚ xuyên suốt cuộc trò chuyện. TUYỆT ĐỐI KHÔNG hỏi lại điểm đến nếu khách đã nêu ở bất kỳ tin nhắn nào trước đó.
- Khi khách mới chỉ nêu mong muốn đi một nơi (ví dụ "tôi muốn đi Đà Nẵng") mà chưa cho đủ thông tin, hãy hỏi gọn trong MỘT lượt 3-4 ý quan trọng trước khi liệt kê tour: (1) khởi hành từ đâu, (2) dự kiến đi tháng nào / mấy ngày, (3) đi mấy người, (4) ngân sách dự kiến mỗi người (nếu khách chưa nói). Hỏi ngắn gọn, lịch sự, không hỏi lại thứ khách đã cung cấp.
- Khi đã đủ thông tin (điểm đến đã biết từ tin nhắn trước + điểm khởi hành + thời gian + số người), gọi NGAY "search_tours" với destination lấy từ tin nhắn trước đó — KHÔNG hỏi thêm gì nữa. Liệt kê dạng: tên tour · ngày khởi hành gần nhất · giá/người · thời lượng, kết thúc bằng một câu hỏi mời khách xem chi tiết hoặc xem thêm lựa chọn. Nếu chỉ có ĐÚNG 1 tour phù hợp → bắt buộc đính kèm TOUR_CARD (xem mục ĐỊNH DẠNG TOUR_CARD) để khách bấm xem ngay.
- Nếu khách đã nói rõ ngay từ đầu (đủ điểm khởi hành/thời gian/số người) thì tìm luôn, không hỏi lại.

NGUYÊN TẮC DỮ LIỆU:
- Không bịa tên tour, giá, ngày khởi hành, số ghế, trạng thái booking hoặc chính sách.
- Khi nói về tour/booking có trong hệ thống, phải dựa trên tool.
- Bạn có thể tư vấn ý tưởng du lịch chung, cách chọn điểm đến, cách chia ngân sách, hoặc gợi ý cách tìm lại mà không khẳng định đó là tour có sẵn.

NGÂN SÁCH:
- Giá tour tính bằng VND. Khi khách nói "10 triệu" → maxPrice: 10000000. Khi nói "từ 5 đến 15 triệu" → minPrice: 5000000, maxPrice: 15000000.
- Không tự quy đổi sang USD.

LOẠI TOUR (tourType):
- Các giá trị hợp lệ duy nhất: "Tour Gia Đình", "Tour Cao Cấp", "Nghỉ Dưỡng", "Khám Phá", "Văn Hóa & Lịch Sử", "Tour Ghép Đoàn".
- CHỈ truyền tourType khi khách NÊU RÕ loại hình: "tour gia đình" → "Tour Gia Đình"; "tour biển/nghỉ dưỡng" → "Nghỉ Dưỡng"; "phượt/trekking/thiên nhiên" → "Khám Phá".
- TUYỆT ĐỐI không tự suy đoán tourType chỉ vì điểm đến nổi tiếng về biển/núi (ví dụ: "đi Đà Nẵng" KHÔNG mặc định là "Nghỉ Dưỡng"). Khách chưa nói loại hình thì để trống tourType.

ĐIỂM KHỞI HÀNH (departurePoint):
- Khi khách nêu nơi xuất phát ("khởi hành từ Hà Nội", "em ở TP.HCM") → truyền departurePoint là tên nơi đó ("Hà Nội", "TP.HCM"). Đây là nơi khách BẮT ĐẦU đi, khác với destination (nơi muốn đến).

SỐ KHÁCH (partySize):
- Khi khách nói đi mấy người ("đi 2 người", "gia đình 4 thành viên") → truyền partySize là tổng số người, để chỉ trả tour còn đủ ghế.

THÁNG KHỞI HÀNH (startMonth):
- Khi khách đề cập tháng cụ thể → truyền startMonth là số (1–12).

KHI NÀO GỌI TOOL:
- Khi khách hỏi tìm tour, điểm đến, tour biển, tour gia đình, tour theo ngân sách, hoặc gợi ý tour phù hợp: PHẢI gọi tool "search_tours" trước khi kết luận có tour cụ thể.
- Khi khách chỉ nêu điểm đến (ví dụ "tôi muốn đi Đà Nẵng"): chỉ truyền destination là tên địa danh gọn ("Đà Nẵng"), KHÔNG kèm chữ "tour/đi/du lịch" và KHÔNG tự thêm tourType/minPrice/maxPrice/startMonth khi khách chưa nêu. Tìm rộng trước, lọc sau.
- Khi khách hỏi chi tiết một tour cụ thể hoặc nhắc tới ID tour: PHẢI gọi tool "get_tour_details".
- Khi khách hỏi booking/đơn đặt tour/chuyến đi của tôi/thanh toán của tôi: PHẢI gọi tool "check_my_bookings".
- Khi khách đưa ra một mã booking cụ thể (ví dụ "tra cứu BKG-060626-L7NN"): PHẢI gọi "check_my_bookings" với bookingCode đúng mã đó, KHÔNG kết luận "không thấy" chỉ vì nó không nằm trong danh sách vài đơn gần nhất.
- Khi khách hỏi về việc HỦY một đơn cụ thể ("hủy đơn này được hoàn bao nhiêu", "BKG-… hủy được không"): PHẢI gọi "get_cancellation_policy" với bookingCode đó để lấy số liệu chính xác, KHÔNG tự nhẩm theo trí nhớ.
- Nếu khách chưa đăng nhập mà hỏi booking, giải thích ngắn gọn rằng cần đăng nhập để kiểm tra đơn cá nhân.

KẾT QUẢ SEMANTIC SEARCH (_semanticMatch: true):
- Khi "search_tours" trả về danh sách tour có trường "_semanticMatch: true", đây là kết quả tìm kiếm ngữ nghĩa (không khớp từ khóa chính xác mà khớp theo ý nghĩa gần nhất).
- Hãy trình bày tự nhiên: "Tôi không tìm thấy tour khớp chính xác, nhưng đây là một số tour có thể phù hợp với bạn:" rồi liệt kê như bình thường. Không dùng từ "semantic" hay "vector" với khách.

KHI KHÔNG TÌM THẤY TOUR:
- TRƯỚC KHI kết luận không có: nếu lần tìm vừa rồi có kèm bộ lọc (tourType/giá/tháng), hãy gọi lại "search_tours" CHỈ với destination để chắc chắn. Chỉ khi tìm chỉ-với-destination vẫn rỗng mới nói chưa có.
- Nói rõ hiện chưa tìm thấy tour khớp trong hệ thống.
- Không dừng lại ở câu xin lỗi. Hãy đề xuất 2-4 hướng đi tiếp thực tế: đổi điểm đến, nới ngân sách, chọn kiểu tour khác, đổi thời gian, hoặc hỏi một câu để thu hẹp nhu cầu.
- Nếu câu hỏi quá rộng, hãy đưa ví dụ câu hỏi mẫu mà khách có thể gửi tiếp.

CHÍNH SÁCH HỦY (CANCELLATION):
- Bạn CHỈ giải thích chính sách và tính số tiền hoàn; KHÔNG tự thực hiện hủy. Sau khi tư vấn, hướng khách vào trang chi tiết đơn để bấm "Yêu cầu hủy".
- Quy tắc hoàn tiền (tính theo thời điểm hiện tại):
  • Đơn đã hủy hoặc đang chờ duyệt hủy: không hủy được nữa.
  • Tour khởi hành hôm nay: không hủy online.
  • Chuyến đã hoàn thành (qua ngày khởi hành): không hủy.
  • Chưa thanh toán: hủy được nhưng hoàn 0đ (vì chưa trả tiền).
  • Đã thanh toán: hủy trong 24h kể từ lúc đặt → hoàn 100%; còn ≥ 7 ngày trước khởi hành → hoàn 80%; còn 3 đến dưới 7 ngày → hoàn 50%; dưới 3 ngày → hoàn 0%. (Luật 24h được ưu tiên xét trước.)
- Khi khách hỏi cho MỘT mã đơn cụ thể → gọi "get_cancellation_policy" và trả lời đúng theo số liệu nhận về (canCancel, refundPercent, estimatedRefundAmount, daysUntilDeparture, cancelUnavailableReason). Nếu thiếu mã, hỏi mã hoặc dùng "check_my_bookings" để khách chọn.

ĐỊNH DẠNG TOUR_CARD:
- BẮT BUỘC chèn TOUR_CARD ở cuối câu trả lời mỗi khi bạn nhấn mạnh/giới thiệu ĐÚNG MỘT tour cụ thể — đặc biệt khi "search_tours" chỉ trả về 1 tour phù hợp — để khách bấm xem chi tiết ngay. Vẫn viết phần text mô tả tour như bình thường, rồi đặt block TOUR_CARD ngay sau.
- Lấy "id" và "image" đúng từ dữ liệu tool (image dùng imageUrl của tour, không để trống, không bịa).
<<<TOUR_CARD>>>
{
  "id": <số id tour>,
  "name": "Tên tour đúng trong dữ liệu",
  "price": "Giá hiển thị ngắn gọn",
  "image": "URL ảnh của tour"
}
<<<END_TOUR_CARD>>>

Chỉ KHÔNG dùng TOUR_CARD khi: đang chat thường chưa có tour, hoặc đang liệt kê từ 2 tour trở lên (khi đó để khách chọn 1 tour rồi mới hiện card cho tour đó).`;
  }
  // Fallback to secondary model when the primary model fails.
  private classifyAiError(
    error: unknown,
  ): 'model_not_found' | 'auth' | 'rate_limit' | 'network' | 'unknown' {
    const e = error as AiError;
    const message = (e.message ?? String(error)).toLowerCase();
    const status = Number(e.status ?? e.code ?? 0);
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

  private buildUserFacingErrorMessage(error: unknown): string {
    const type = this.classifyAiError(error);
    if (type === 'rate_limit')
      return 'Trợ lý AI hiện đang bận phục vụ nhiều khách. Vui lòng thử lại sau vài giây nhé!';
    if (type === 'auth')
      return 'Dịch vụ AI chưa được cấu hình quyền truy cập hợp lệ. Vui lòng liên hệ quản trị viên.';
    if (type === 'network')
      return 'Không thể kết nối đến Trợ lý AI. Vui lòng kiểm tra cấu hình endpoint AI và thử lại.';
    return 'Không thể kết nối đến Trợ lý AI. Vui lòng thử lại sau.';
  }

  private logAiErrorContext(stage: string, model: string, error: unknown) {
    const e = error as AiError;
    const type = this.classifyAiError(error);
    const status = e.status ?? e.code ?? 'unknown';
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

  private createChatStream(
    model: string,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
  ) {
    return this.llmClient.chat.completions.create({
      model,
      messages,
      stream: true,
      max_tokens: 1024,
    });
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

  // Trích tín hiệu chất lượng từ kết quả tool để ghi log đo lường.
  private extractToolQuality(toolName: string | undefined, result: unknown): string {
    if (!result || typeof result !== 'object') return 'unknown';
    const r = result as Record<string, unknown>;

    if (toolName === 'search_tours') {
      if (Array.isArray(result)) return `found=${result.length}`;
      return 'empty';
    }
    if (toolName === 'get_tour_details') {
      return r.id ? 'found' : 'not_found';
    }
    if (toolName === 'check_my_bookings') {
      if (Array.isArray(result)) return `found=${result.length}`;
      return 'empty';
    }
    if (toolName === 'get_cancellation_policy') {
      if ('canCancel' in r) return `canCancel=${r.canCancel} refund=${r.refundPercent ?? 0}%`;
      return 'not_found';
    }
    return 'ok';
  }

  private async executeTourTool(
    toolCall: OpenAI.Chat.ChatCompletionMessageToolCall,
    userId: number | null,
  ) {
    const toolName = this.getFunctionToolCall(toolCall)?.name;
    const toolArgs = this.parseToolArguments(toolCall);

    let result: unknown;
    if (toolName === 'search_tours') {
      result = await this.executeSearchTours(toolArgs);
    } else if (toolName === 'check_my_bookings') {
      result = await this.executeCheckMyBookings(toolArgs, userId);
    } else if (toolName === 'get_tour_details') {
      result = await this.executeGetTourDetails(toolArgs);
    } else if (toolName === 'get_cancellation_policy') {
      result = await this.executeGetCancellationPolicy(toolArgs, userId);
    } else {
      this.logger.warn(`[AI] Unknown tool requested: ${toolName || 'unknown'}`);
      return { message: `Tool ${toolName || 'unknown'} is not supported.` };
    }

    const quality = this.extractToolQuality(toolName, result);
    this.logger.log(`[AI] tool=${toolName} result=${quality} args=${JSON.stringify(toolArgs)}`);
    return result;
  }

  // Non-streaming flow: resolve tool calls, then make the final answer call.
  private async runModelChat(
    model: string,
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    userId: number | null,
  ): Promise<string> {
    const resolved = await this.resolveToolCallsOnly(model, messages, userId);
    if (!resolved.needsStream) {
      return resolved.directResponse;
    }

    const finalResponse = await this.executeChatCompletion(model, {
      messages: resolved.messagesForStream,
      max_tokens: 1024,
    });
    return finalResponse.choices[0]?.message?.content || '';
  }

  private async chatWithFallback(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    sessionId: string,
    userId: number | null,
    originalError: unknown,
  ): Promise<{ reply: string; tourCard?: TourCard; sessionId: string }> {
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
    } catch (fallbackError: unknown) {
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
  // Ownership: phiên của user đã đăng nhập khớp theo userId; phiên ẩn danh chỉ
  // truy cập được khi anonId (cookie HttpOnly) khớp đúng người đã tạo ra nó.
  private canAccessSession(
    session: { userId: number | null; anonId: string | null },
    userId: number | null | undefined,
    anonId: string | null | undefined,
  ): boolean {
    if (session.userId !== null) {
      return Boolean(userId) && session.userId === userId;
    }
    return Boolean(anonId) && session.anonId === anonId;
  }

  // Shared session setup used by both chat() and chatStream().
  private async setupChatSession(
    sessionId: string | undefined,
    userId: number | null | undefined,
    anonId: string | null | undefined,
  ): Promise<{ currentSessionId: string; dbHistory: { role: string; content: string }[] }> {
    let currentSessionId = sessionId;
    let dbHistory: { role: string; content: string }[] = [];

    if (currentSessionId) {
      const session = await this.prisma.chatSession.findUnique({
        where: { id: currentSessionId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (session && this.canAccessSession(session, userId, anonId)) {
        dbHistory = session.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      } else {
        currentSessionId = undefined;
      }
    }

    if (!currentSessionId) {
      const newSession = await this.prisma.chatSession.create({
        data: {
          userId: userId || null,
          anonId: userId ? null : anonId || null,
        },
      });
      currentSessionId = newSession.id;
    }

    return { currentSessionId, dbHistory };
  }

  // Build the messages array sent to the LLM from DB history + new user message.
  private buildChatMessages(
    dbHistory: { role: string; content: string }[],
    userMessage: string,
    currentTour?: { id: number; name: string } | null,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return [
      { role: 'system', content: this.buildSystemPrompt(currentTour) },
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
    if (toolsUsed.includes('get_cancellation_policy')) {
      return ['Cách hủy đơn', 'Liên hệ hỗ trợ'];
    }
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

  // Số tin nhắn user tối đa mỗi session trước khi yêu cầu mở cuộc trò chuyện mới.
  // Cấu hình qua env AI_MAX_MESSAGES_PER_SESSION; mặc định 40 (rất đủ để đặt tour).
  private get maxUserMessagesPerSession(): number {
    const val = this.configService.get<string>('AI_MAX_MESSAGES_PER_SESSION');
    const n = val ? parseInt(val, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 40;
  }

  // Resolve/create the session, persist the user message, and assemble the LLM
  // message array. Shared preamble for both chat() and chatStream().
  private async prepareConversation(
    userMessage: string,
    sessionId: string | undefined,
    userId: number | null | undefined,
    currentTourId: number | null | undefined,
    anonId: string | null | undefined,
  ): Promise<
    | { limitExceeded: true; currentSessionId: string }
    | { limitExceeded: false; currentSessionId: string; messages: OpenAI.Chat.ChatCompletionMessageParam[] }
  > {
    const { currentSessionId, dbHistory } = await this.setupChatSession(sessionId, userId, anonId);

    const userMessageCount = dbHistory.filter((m) => m.role === 'user').length;
    if (userMessageCount >= this.maxUserMessagesPerSession) {
      this.logger.warn(`[AI] Session ${currentSessionId} hit message cap (${userMessageCount}/${this.maxUserMessagesPerSession})`);
      return { limitExceeded: true, currentSessionId };
    }

    await this.prisma.chatMessage.create({
      data: { sessionId: currentSessionId, role: 'user', content: userMessage },
    });
    await this.touchChatSession(currentSessionId);

    const currentTour = await this.getCurrentTourContext(currentTourId);
    const messages = this.buildChatMessages(dbHistory, userMessage, currentTour);

    return { limitExceeded: false, currentSessionId, messages };
  }

  // Main chat function using the OpenAI-compatible LLMGate flow.
  async chat(
    userMessage: string,
    sessionId?: string,
    userId?: number | null,
    currentTourId?: number | null,
    anonId?: string | null,
  ): Promise<{ reply: string; tourCard?: TourCard; sessionId?: string }> {
    const prep = await this.prepareConversation(userMessage, sessionId, userId, currentTourId, anonId);

    if (prep.limitExceeded) {
      return {
        reply: 'Cuộc trò chuyện này đã quá dài. Vui lòng bắt đầu cuộc trò chuyện mới để tiếp tục được tư vấn nhé!',
        sessionId: prep.currentSessionId,
      };
    }

    const { currentSessionId, messages } = prep;
    try {
      const rawText = await this.runModelChat(this.primaryModel, messages, userId || null);
      return this.parseAndSaveResponse(rawText, currentSessionId);
    } catch (error: unknown) {
      this.logAiErrorContext('Chat flow', this.primaryModel, error);
      return this.chatWithFallback(messages, currentSessionId, userId || null, error);
    }
  }
  // Streaming chat — yields tokens as they arrive from the LLM.
  async *chatStream(
    userMessage: string,
    sessionId?: string,
    userId?: number | null,
    currentTourId?: number | null,
    anonId?: string | null,
  ): AsyncGenerator<
    | { searching: true }
    | { token: string }
    | { done: true; tourCard?: TourCard; sessionId: string; followUps?: string[] }
    | { error: string; errorType: string }
  > {
    const prep = await this.prepareConversation(userMessage, sessionId, userId, currentTourId, anonId);

    if (prep.limitExceeded) {
      yield { token: 'Cuộc trò chuyện này đã quá dài. Vui lòng bắt đầu cuộc trò chuyện mới để tiếp tục được tư vấn nhé!' };
      yield { done: true, sessionId: prep.currentSessionId };
      return;
    }

    const { currentSessionId, messages } = prep;
    let resolveResult!: Awaited<ReturnType<typeof this.resolveToolCallsOnly>>;
    let resolvedModel = this.primaryModel;
    try {
      resolveResult = await this.resolveToolCallsOnly(this.primaryModel, messages, userId || null);
    } catch (primaryError: unknown) {
      this.logAiErrorContext('Stream tool-resolve primary', this.primaryModel, primaryError);
      resolvedModel = this.fallbackModel;
      try {
        resolveResult = await this.resolveToolCallsOnly(this.fallbackModel, messages, userId || null);
      } catch (fallbackError: unknown) {
        this.logAiErrorContext('Stream tool-resolve fallback', this.fallbackModel, fallbackError);
        yield { error: this.buildUserFacingErrorMessage(fallbackError), errorType: this.classifyAiError(fallbackError) };
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

    // Tool calls resolved — notify client before streaming the final synthesis.
    yield { searching: true };

    // Khởi tạo stream với model dự phòng nếu model chính lỗi lúc mở stream.
    // Nếu resolve đã phải dùng fallback thì model chính coi như đang hỏng → chỉ thử fallback.
    // Lưu ý: lỗi GIỮA stream (sau khi đã phát token) không thể restart an toàn nên chỉ báo lỗi.
    const streamModels =
      resolvedModel === this.fallbackModel
        ? [this.fallbackModel]
        : [this.primaryModel, this.fallbackModel];

    let stream: Awaited<ReturnType<typeof this.createChatStream>> | undefined;
    let createError: unknown;
    for (const model of streamModels) {
      try {
        stream = await this.createChatStream(model, resolveResult.messagesForStream);
        createError = undefined;
        break;
      } catch (err: unknown) {
        createError = err;
        this.logAiErrorContext('Stream create', model, err);
      }
    }

    if (!stream) {
      yield {
        error: this.buildUserFacingErrorMessage(createError),
        errorType: this.classifyAiError(createError),
      };
      return;
    }

    try {
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
    } catch (streamError: unknown) {
      this.logAiErrorContext('Stream final-answer', streamModels[0], streamError);
      yield { error: this.buildUserFacingErrorMessage(streamError), errorType: this.classifyAiError(streamError) };
    }
  }

  // Get chat history by sessionId.
  async getHistory(
    sessionId: string,
    userId?: number | null,
    anonId?: string | null,
  ) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) return { messages: [] };
    if (!this.canAccessSession(session, userId, anonId)) return { messages: [] };

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
    anonId?: string | null,
  ): Promise<{ success: boolean }> {
    try {
      const session = await this.prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { userId: true, anonId: true },
      });
      if (!session) return { success: true };
      if (!this.canAccessSession(session, userId, anonId)) {
        return { success: false };
      }

      await this.prisma.chatSession.delete({ where: { id: sessionId } });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  // Ghi event hành vi từ phía FE (fire-and-forget, không có DB, chỉ cần structured log).
  // Hiện hỗ trợ: 'tour_card_click' | 'retry_after_error'.
  logClientEvent(event: { type: string; sessionId?: string; tourId?: number; userId?: number }) {
    this.logger.log(`[AI:event] type=${event.type} session=${event.sessionId ?? '-'} tour=${event.tourId ?? '-'} user=${event.userId ?? '-'}`);
  }
}

