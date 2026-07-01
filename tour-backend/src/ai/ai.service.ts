import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { AiToolService } from './ai-tool.service';

const LLMGATE_DEFAULT_BASE_URL = 'https://llmgate.app/v1';
const LLMGATE_LEGACY_BASE_URLS = new Set([
  'https://api.llmgateway.io/v1',
  'https://api.llmgate.app/v1',
]);


type TourCard = { id?: number; name?: string; price?: string; image?: string };

function extractTourCards(text: string): { cards: TourCard[]; cleaned: string } {
  const cards: TourCard[] = [];
  const rx = /<<<TOUR_CARD>>>([\s\S]*?)<<<END_TOUR_CARD>>>/g;
  let cleaned = text;
  let match: RegExpExecArray | null;
  while ((match = rx.exec(text)) !== null) {
    try { cards.push(JSON.parse(match[1].trim())); } catch { /* skip malformed */ }
  }
  if (cards.length) cleaned = text.replace(/<<<TOUR_CARD>>>[\s\S]*?<<<END_TOUR_CARD>>>/g, '').trim();
  return { cards, cleaned };
}


interface AiError { message?: string; status?: number; code?: number }

// ══════════════════════════════════════════════════════════════════════════════
// [AI - FUNCTION CALLING] Khai báo 4 "tool" (công cụ) cho LLM.
// Đây là cốt lõi chống-bịa (RAG): LLM KHÔNG tự nghĩ ra dữ liệu, mà khi cần nó "xin
// gọi" một trong các tool này; backend chạy tool (đọc DB thật) rồi đưa kết quả lại.
// Mỗi tool khai báo name + description + parameters theo chuẩn OpenAI để LLM biết
// KHI NÀO gọi và truyền THAM SỐ gì.
// ══════════════════════════════════════════════════════════════════════════════
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
            description: 'Tháng khởi hành ĐÚNG MỘT tháng cụ thể (1–12). Ví dụ: 8 = chỉ tháng 8.',
          },
          startMonthFrom: {
            type: 'number',
            description:
              'Tháng khởi hành SỚM NHẤT khi khách muốn "từ tháng X trở đi / đổ đi / khoảng tháng X về sau" (1–12), không giới hạn tháng trên. Ví dụ: 7 = từ tháng 7 trở đi. Dùng cái này thay cho startMonth khi khách nói "đổ đi/trở đi".',
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
    private readonly aiToolService: AiToolService,
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
      let tourCards: TourCard[] | undefined = undefined;
      if (msg.role === 'model') {
        const { cards, cleaned } = extractTourCards(text);
        if (cards.length) { tourCards = cards; text = cleaned; }
      }

      return {
        id: msg.id.toString(),
        role: msg.role === 'model' ? 'ai' : 'user',
        text,
        tourCards,
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
  ): Promise<{ reply: string; tourCards?: TourCard[]; sessionId: string }> {
    const { cards, cleaned } = extractTourCards(rawText);
    const reply = cleaned || 'Xin lỗi, tôi không thể trả lời lúc này.';

    // Store the original response, including TOUR_CARD, so history can restore it.
    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'model', content: rawText },
    });
    await this.touchChatSession(sessionId);

    return {
      reply,
      tourCards: cards.length ? cards : undefined,
      sessionId,
    };
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

  // ════════════════════════════════════════════════════════════════════════════
  // [AI - SYSTEM PROMPT] "Luật chơi" nhồi vào đầu mỗi cuộc chat (prompt engineering).
  // Vì hành vi LLM điều khiển bằng chỉ dẫn ngôn ngữ (không phải code), đoạn này quy
  // định: trả lời đúng ngôn ngữ khách, CẤM bịa tên/giá/ngày, khi nào gọi tool nào,
  // cách quy đổi tiền, và định dạng thẻ tour (TOUR_CARD). Đây là lớp "grounding".
  // ════════════════════════════════════════════════════════════════════════════
  private buildSystemPrompt(
    currentTour?: { id: number; name: string } | null,
    language?: string | null,
    currency?: string | null,
  ): string {
    const uiLangLabel = language === 'en' ? 'English (tiếng Anh)' : 'tiếng Việt';
    const uiCurrency = currency === 'USD' ? 'USD' : 'VND';
    // Tỷ giá quy đổi USD→VND (khớp với VND_TO_USD_RATE ở frontend LocaleContext).
    const VND_PER_USD = 26331;
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

QUY TẮC NGÔN NGỮ — ƯU TIÊN CAO NHẤT, GHI ĐÈ MỌI QUY TẮC KHÁC:
- Trả lời bằng ĐÚNG ngôn ngữ của tin nhắn GẦN NHẤT của khách: khách viết tiếng Anh → trả lời HOÀN TOÀN bằng tiếng Anh; viết tiếng Việt → trả lời bằng tiếng Việt. Áp dụng kể cả khi khách đổi ngôn ngữ giữa chừng.
- TUYỆT ĐỐI BỎ QUA ngôn ngữ của system prompt này VÀ của KẾT QUẢ TOOL (ví dụ message nội bộ "Không tìm thấy tour nào phù hợp...", nhãn bộ lọc "ngân sách"/"thời gian" — đều bằng tiếng Việt). Đó CHỈ là dữ liệu, KHÔNG quyết định ngôn ngữ trả lời. Hãy tự dịch sang ngôn ngữ của khách (ví dụ khách hỏi tiếng Anh thì viết "I couldn't find any matching tours...").
- KHI TRẢ LỜI TIẾNG ANH: các trường mô tả trong kết quả tool cũng phải DỊCH sang tiếng Anh, KHÔNG để lẫn tiếng Việt:
  + Thời lượng ("duration"): "3 ngày 2 đêm" → "3 days 2 nights"; "1 ngày" → "1 day".
  + Đơn vị giá: theo mục NGÂN SÁCH (hiện USD, không dùng "triệu/người").
  + Tên tour/điểm đến là DANH TỪ RIÊNG → GIỮ NGUYÊN tiếng Việt (ví dụ "Đà Nẵng - Hội An - Huế"), không dịch.
- Nếu tin nhắn của khách không đủ để xác định ngôn ngữ (chỉ có tên địa danh/số/mã booking), dùng ngôn ngữ giao diện: ${uiLangLabel}.

PHONG CÁCH TƯ VẤN:
- Trả lời như một nhân viên tư vấn du lịch có kinh nghiệm: tự nhiên, ấm áp, chủ động gợi mở, không máy móc.
- Câu trả lời nên ngắn vừa đủ, dễ quét, có bullet khi đưa nhiều lựa chọn.
- Không ép khách cung cấp quá nhiều dữ liệu trước khi tư vấn. Hãy giúp họ tiến từng bước.

QUY TRÌNH TƯ VẤN ĐIỂM ĐẾN (giống tổng đài du lịch):
- LUÔN ĐỌC LẠI TOÀN BỘ hội thoại trước khi hỏi. Điểm đến thường được khách nêu NGAY Ở TIN NHẮN ĐẦU TIÊN (ví dụ "tôi muốn đi Nhật Bản") → đó chính là destination, phải GHI NHỚ xuyên suốt cuộc trò chuyện. TUYỆT ĐỐI KHÔNG hỏi lại điểm đến nếu khách đã nêu ở bất kỳ tin nhắn nào trước đó.
- Khi khách mới chỉ nêu mong muốn đi một nơi (ví dụ "tôi muốn đi Đà Nẵng") mà chưa cho đủ thông tin, hãy hỏi gọn trong MỘT lượt 3-4 ý quan trọng trước khi liệt kê tour: (1) khởi hành từ đâu, (2) dự kiến đi tháng nào / mấy ngày, (3) đi mấy người, (4) ngân sách dự kiến mỗi người (nếu khách chưa nói). Hỏi ngắn gọn, lịch sự, không hỏi lại thứ khách đã cung cấp.
- Khi đã đủ thông tin (điểm đến đã biết từ tin nhắn trước + điểm khởi hành + thời gian + số người), gọi NGAY "search_tours" với destination lấy từ tin nhắn trước đó — KHÔNG hỏi thêm gì nữa. Liệt kê dạng: tên tour · ngày khởi hành gần nhất · giá/người · thời lượng, kết thúc bằng một câu hỏi mời khách xem chi tiết hoặc xem thêm lựa chọn. Nếu chỉ có ĐÚNG 1 tour phù hợp → bắt buộc đính kèm TOUR_CARD (xem mục ĐỊNH DẠNG TOUR_CARD) để khách bấm xem ngay.
- VÍ DỤ BẮT BUỘC PHẢI LÀM ĐÚNG: Khách nhắn "tôi muốn đi Đà Nẵng" (tin 1) → bạn hỏi thêm thông tin → khách trả lời "khởi hành Hà Nội, tháng 7, 2 người, 5 triệu" (tin 2) → phải gọi NGAY search_tours với destination="Đà Nẵng" (lấy từ tin 1). TUYỆT ĐỐI KHÔNG hỏi "bạn muốn đi đâu?" vì điểm đến đã có ở tin trước.
- Nếu khách trả lời "tất cả điểm khởi hành" hoặc không nêu điểm xuất phát → bỏ trống departurePoint (không lọc), tìm rộng tất cả. KHÔNG nhầm "tất cả điểm khởi hành" là điểm đến.
- Nếu khách đã nói rõ ngay từ đầu (đủ điểm khởi hành/thời gian/số người) thì tìm luôn, không hỏi lại.

PHẠM VI HỖ TRỢ — QUAN TRỌNG:
- Bạn CHỈ hỗ trợ các chủ đề liên quan đến du lịch và dịch vụ của Azure Horizon: tìm tour, đặt tour, booking, thanh toán, hủy tour, gợi ý điểm đến, lịch trình, ngân sách du lịch.
- Khi khách hỏi bất cứ điều gì NGOÀI phạm vi trên (chuyện ăn uống cá nhân, tình cảm, sức khỏe, chính trị, giải trí, hỏi thăm AI có cảm xúc không, v.v.) → từ chối nhẹ nhàng, vui vẻ, rồi hướng khách về các dịch vụ du lịch. KHÔNG đi sâu vào chủ đề ngoài lề dù khách hỏi thêm.
- Format BẮT BUỘC cho câu trả lời ngoài lề: một câu từ chối vui vẻ (có emoji), rồi danh sách gạch đầu dòng các việc bạn hỗ trợ, rồi một câu mời hành động. Ví dụ đúng:

Mình không ăn cơm được đâu 😄 Nhưng mình luôn sẵn sàng hỗ trợ bạn về **tour du lịch**.

Bạn muốn:
- Tìm tour
- Xem chi tiết tour
- Tra cứu booking
- Kiểm tra chính sách hủy

Chỉ cần nhắn điểm đến hoặc mã booking là mình hỗ trợ ngay.

NGUYÊN TẮC DỮ LIỆU:
- Không bịa tên tour, giá, ngày khởi hành, số ghế, trạng thái booking hoặc chính sách.
- Khi nói về tour/booking có trong hệ thống, phải dựa trên tool.
- Bạn có thể tư vấn ý tưởng du lịch chung, cách chọn điểm đến, cách chia ngân sách, hoặc gợi ý cách tìm lại mà không khẳng định đó là tour có sẵn.

NGÂN SÁCH (đơn vị tiền khách đang dùng: ${uiCurrency}):
- Giá tour trong hệ thống và tham số minPrice/maxPrice LUÔN tính bằng VND.
- Khách CÓ THỂ nêu ngân sách bằng VND hoặc USD — chấp nhận cả hai, KHÔNG bắt khách đổi sang VND.
  + VND: "10 triệu" → maxPrice: 10000000; "từ 5 đến 15 triệu" → minPrice: 5000000, maxPrice: 15000000.
  + USD ("$200", "200 đô", "over 190$"): QUY ĐỔI sang VND theo tỷ giá 1 USD = ${VND_PER_USD} VND rồi mới đặt minPrice/maxPrice. Ví dụ "under $200" → maxPrice ≈ ${200 * VND_PER_USD}; "over $190" → minPrice ≈ ${190 * VND_PER_USD}.
- Khi HIỂN THỊ giá tour hoặc gợi ý mức ngân sách, đơn vị tiền phải khớp NGÔN NGỮ câu trả lời (không phải chỉ theo cài đặt giao diện):
  + Trả lời TIẾNG ANH → luôn hiện USD, quy đổi từ VND theo tỷ giá 1 USD = ${VND_PER_USD} VND. Ví dụ tour 3.450.000 VND → "≈ $131/person". TUYỆT ĐỐI KHÔNG viết "triệu", "người", "đồng" hay bất kỳ từ tiếng Việt nào trong câu tiếng Anh.
  + Trả lời TIẾNG VIỆT → hiện VND kiểu "3,45 triệu/người", "5–7 triệu".
- Nếu tin nhắn khách không đủ để xác định ngôn ngữ (chỉ có địa danh/số) → dùng đơn vị tiền theo giao diện: ${uiCurrency}.
- Tuyệt đối KHÔNG yêu cầu khách nhập lại ngân sách bằng VND.

LOẠI TOUR (tourType):
- Các giá trị hợp lệ duy nhất: "Tour Gia Đình", "Tour Cao Cấp", "Nghỉ Dưỡng", "Khám Phá", "Văn Hóa & Lịch Sử", "Tour Ghép Đoàn".
- CHỈ truyền tourType khi khách NÊU RÕ loại hình: "tour gia đình" → "Tour Gia Đình"; "tour biển/nghỉ dưỡng" → "Nghỉ Dưỡng"; "phượt/trekking/thiên nhiên" → "Khám Phá".
- TUYỆT ĐỐI không tự suy đoán tourType chỉ vì điểm đến nổi tiếng về biển/núi (ví dụ: "đi Đà Nẵng" KHÔNG mặc định là "Nghỉ Dưỡng"). Khách chưa nói loại hình thì để trống tourType.

ĐIỂM KHỞI HÀNH (departurePoint):
- Khi khách nêu nơi xuất phát ("khởi hành từ Hà Nội", "em ở TP.HCM") → truyền departurePoint là tên nơi đó ("Hà Nội", "TP.HCM"). Đây là nơi khách BẮT ĐẦU đi, khác với destination (nơi muốn đến).

SỐ KHÁCH (partySize):
- Khi khách nói đi mấy người ("đi 2 người", "gia đình 4 thành viên") → truyền partySize là tổng số người, để chỉ trả tour còn đủ ghế.

THÁNG KHỞI HÀNH (startMonth / startMonthFrom):
- Khi khách đề cập ĐÚNG MỘT tháng ("đi tháng 8", "khởi hành tháng 8") → truyền startMonth là số (1–12).
- Khi khách nói "TỪ tháng X trở đi / đổ đi / tháng X về sau / khoảng tháng X trở lên" → truyền startMonthFrom = X (KHÔNG truyền startMonth). Đây là mốc sớm nhất, hệ thống sẽ lấy mọi tháng từ X về sau.

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

KẾT QUẢ ĐÃ NỚI LỌC (_relaxed: true):
- Khi "search_tours" trả về tour có "_relaxed: true", nghĩa là KHÔNG có tour khớp đúng toàn bộ yêu cầu; hệ thống đã tự nới các tiêu chí liệt kê trong "_relaxedFilters" (ví dụ: ngân sách, loại tour, thời gian) để tìm lựa chọn gần nhất.
- Hãy nói rõ và trung thực TRƯỚC khi liệt kê, ví dụ: "Mình chưa thấy tour khớp đúng [ghi đúng các tiêu chí trong _relaxedFilters], nhưng đây là vài lựa chọn gần nhất:" rồi liệt kê như bình thường. TUYỆT ĐỐI không nói là khớp hoàn toàn. Không cần khách gõ lại yêu cầu.

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
- BẮT BUỘC chèn TOUR_CARD cho TỪNG tour ngay sau phần text mô tả khi "search_tours" trả về kết quả (1 đến 4 tour). Mỗi tour một block riêng biệt, đặt tất cả các block liên tiếp ở cuối câu trả lời.
- Lấy "id" và "image" đúng từ dữ liệu tool (image dùng imageUrl của tour, không để trống, không bịa).
- Ví dụ khi có 2 tour:
<<<TOUR_CARD>>>
{
  "id": 1,
  "name": "Tên tour A",
  "price": "3,65 triệu/người",
  "image": "https://..."
}
<<<END_TOUR_CARD>>>
<<<TOUR_CARD>>>
{
  "id": 2,
  "name": "Tên tour B",
  "price": "5,95 triệu/người",
  "image": "https://..."
}
<<<END_TOUR_CARD>>>

Chỉ KHÔNG dùng TOUR_CARD khi: đang chat thường chưa có tour trong kết quả, hoặc kết quả từ tool rỗng.`;
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
      reasoning_effort: 'low',
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
      reasoning_effort: 'low',
      max_tokens: 1024,
    });
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
  ): Promise<{ reply: string; tourCards?: TourCard[]; sessionId: string }> {
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
    language?: string | null,
    currency?: string | null,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return [
      { role: 'system', content: this.buildSystemPrompt(currentTour, language, currency) },
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

  // ════════════════════════════════════════════════════════════════════════════
  // [AI - LƯỢT 1 LLM] Bước cốt lõi của function calling.
  // Gọi LLM lần 1 kèm danh sách tool + tool_choice:'auto' (để LLM TỰ quyết có cần
  // dữ liệu không). Nếu LLM "xin gọi tool" → backend THỰC THI tool (đọc DB thật) rồi
  // nhét kết quả vào hội thoại, trả về để LƯỢT 2 tổng hợp thành câu trả lời.
  // Nếu không cần tool (chào hỏi/tư vấn chung) → trả thẳng câu trả lời, khỏi lượt 2.
  // ════════════════════════════════════════════════════════════════════════════
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
        .map((tc) => this.aiToolService.getFunctionToolCall(tc)?.name)
        .filter((n): n is string => Boolean(n));
      const updatedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [...messages, choice.message];
      for (const toolCall of toolCalls) {
        const fnResult = await this.aiToolService.executeTourTool(toolCall, userId);
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
    language?: string | null,
    currency?: string | null,
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
    const messages = this.buildChatMessages(dbHistory, userMessage, currentTour, language, currency);

    return { limitExceeded: false, currentSessionId, messages };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [AI - LUỒNG KHÔNG STREAMING] Trả về CẢ câu một lần (dùng cho POST /ai/chat).
  // Trình tự: prepareConversation (tạo/khôi phục phiên + lưu tin nhắn + dựng messages)
  // → runModelChat (lượt 1 chọn tool + lượt 2 tổng hợp) → parseAndSaveResponse (tách
  // thẻ tour + lưu). Lỗi model chính → chatWithFallback (đổi sang model dự phòng).
  // ════════════════════════════════════════════════════════════════════════════
  async chat(
    userMessage: string,
    sessionId?: string,
    userId?: number | null,
    currentTourId?: number | null,
    anonId?: string | null,
    language?: string | null,
    currency?: string | null,
  ): Promise<{ reply: string; tourCards?: TourCard[]; sessionId?: string }> {
    const prep = await this.prepareConversation(userMessage, sessionId, userId, currentTourId, anonId, language, currency);

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
  // ════════════════════════════════════════════════════════════════════════════
  // [AI - LUỒNG STREAMING / SSE] Trả lời NHỎ GIỌT từng chữ (dùng cho POST /ai/chat/stream).
  // Là async generator: `yield` từng sự kiện cho controller đẩy xuống client:
  //   { searching:true } → đang tra cứu (sau lượt 1, trước lượt 2)
  //   { token:'...' }    → từng mẩu chữ của câu trả lời
  //   { done:true, tourCards, followUps } → kết thúc, kèm thẻ tour + gợi ý câu hỏi tiếp
  // Phần dưới có xử lý HOLD_BACK: giữ lại 14 ký tự cuối để marker <<<TOUR_CARD>>> không
  // bị phát ra màn hình khi bị cắt ngang giữa 2 chunk stream.
  // ════════════════════════════════════════════════════════════════════════════
  async *chatStream(
    userMessage: string,
    sessionId?: string,
    userId?: number | null,
    currentTourId?: number | null,
    anonId?: string | null,
    language?: string | null,
    currency?: string | null,
  ): AsyncGenerator<
    | { searching: true }
    | { token: string }
    | { done: true; tourCards?: TourCard[]; sessionId: string; followUps?: string[] }
    | { error: string; errorType: string }
  > {
    const prep = await this.prepareConversation(userMessage, sessionId, userId, currentTourId, anonId, language, currency);

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
      yield { done: true, tourCards: result.tourCards, sessionId: currentSessionId, followUps: this.buildFollowUpSuggestions([]) };
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
      const CARD_MARKER = '<<<TOUR_CARD>>>';
      const HOLD_BACK = CARD_MARKER.length - 1; // 14 chars — đủ để phát hiện marker bị vỡ chunk

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (!token) continue;
        fullText += token;

        const cardStart = fullText.indexOf(CARD_MARKER);
        if (cardStart !== -1) {
          // Marker đầy đủ — emit đến trước marker rồi dừng
          if (cardStart > emittedChars) {
            yield { token: fullText.slice(emittedChars, cardStart) };
            emittedChars = cardStart;
          }
        } else {
          // Chưa thấy marker đầy đủ — giữ lại HOLD_BACK ký tự cuối
          // phòng trường hợp chúng là phần đầu của marker bị vỡ chunk
          const safeUpTo = Math.max(emittedChars, fullText.length - HOLD_BACK);
          if (safeUpTo > emittedChars) {
            yield { token: fullText.slice(emittedChars, safeUpTo) };
            emittedChars = safeUpTo;
          }
        }
      }

      // Flush phần text bị giữ lại (HOLD_BACK) ở cuối stream. Không có bước này thì
      // ~14 ký tự cuối của câu trả lời không bao giờ được gửi → câu bị cụt chữ.
      // Nếu có TOUR_CARD thì chỉ flush tới trước marker (phần card không stream dạng text).
      const finalCardStart = fullText.indexOf(CARD_MARKER);
      const flushEnd = finalCardStart !== -1 ? finalCardStart : fullText.length;
      if (flushEnd > emittedChars) {
        yield { token: fullText.slice(emittedChars, flushEnd) };
        emittedChars = flushEnd;
      }

      const result = await this.parseAndSaveResponse(fullText, currentSessionId);
      const followUps = this.buildFollowUpSuggestions(resolveResult.toolsUsed);
      yield { done: true, tourCards: result.tourCards, sessionId: currentSessionId, followUps };
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

