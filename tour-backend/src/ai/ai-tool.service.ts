import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookingCancellationService } from '../booking/booking-cancellation.service';
import { AiEmbeddingService } from './ai-embedding.service';

interface SearchToursArgs { destination?: string; departurePoint?: string; minPrice?: number; maxPrice?: number; tourType?: string; startMonth?: number; startMonthFrom?: number; partySize?: number }
interface GetTourDetailsArgs { tourId?: number }
interface CheckMyBookingsArgs { status?: string; bookingCode?: string }
interface GetCancellationPolicyArgs { bookingCode?: string }

/**
 * Lớp thực thi function-calling (RAG tools) cho AiService.
 * Toàn bộ là thao tác đọc dữ liệu thuần (Prisma) — không đụng LLM client/streaming/session.
 * Orchestrator (AiService) gọi qua 2 method public: executeTourTool, getFunctionToolCall.
 */
@Injectable()
export class AiToolService {
  private readonly logger = new Logger(AiToolService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingCancellationService: BookingCancellationService,
    private readonly embeddingService: AiEmbeddingService,
  ) {}

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
          !AiToolService.SEARCH_STOP_WORDS.has(token.toLowerCase()),
      );
    return tokens.length > 0 ? tokens : [input.trim()];
  }

  // Dựng điều kiện truy vấn tour. opts cho phép TẮT từng bộ lọc phụ (giá/loại/tháng)
  // để nới dần khi không có kết quả khớp đúng. Điểm đến + điểm khởi hành + đủ ghế
  // luôn được giữ (đó là ý định cốt lõi của khách).
  private buildTourWhere(
    args: SearchToursArgs,
    opts: { price: boolean; tourType: boolean; month: boolean },
  ): Prisma.TourWhereInput {
    const { destination, departurePoint, minPrice, maxPrice, tourType, startMonth, startMonthFrom, partySize } = args;
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

    if (opts.price && (minPrice || maxPrice)) {
      whereClause.price = {
        ...(minPrice ? { gte: Number(minPrice) } : {}),
        ...(maxPrice ? { lte: Number(maxPrice) } : {}),
      };
    }

    if (opts.tourType && tourType) {
      whereClause.tourType = { contains: String(tourType), mode: 'insensitive' };
    }

    // Lọc tháng khởi hành: hoặc ĐÚNG một tháng (startMonth), hoặc TỪ một tháng trở đi
    // không chặn trên (startMonthFrom — cho yêu cầu "từ tháng X đổ đi").
    if (opts.month && (startMonth || startMonthFrom)) {
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let range: { gte: Date; lt?: Date };
      if (startMonthFrom) {
        const month = Number(startMonthFrom);
        // Lấy đầu tháng X năm nay; nếu tháng đó đã qua thì tính từ đầu tháng hiện tại.
        const candidate = new Date(now.getFullYear(), month - 1, 1);
        range = { gte: candidate < startOfThisMonth ? startOfThisMonth : candidate };
      } else {
        const month = Number(startMonth);
        const year = now.getMonth() + 1 > month ? now.getFullYear() + 1 : now.getFullYear();
        range = { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) };
      }
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

    return whereClause;
  }

  private queryTours(where: Prisma.TourWhereInput) {
    return this.prisma.tour.findMany({
      where,
      include: { destination: true },
      take: 5,
      orderBy: { price: 'asc' },
    });
  }

  private mapTour(t: Prisma.TourGetPayload<{ include: { destination: true } }>) {
    return {
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
    };
  }

  // Tool: search tours in the database.
  private async executeSearchTours(args: Record<string, unknown>) {
    const a = args as SearchToursArgs;
    const party = a.partySize ? Number(a.partySize) : null;

    // 1) Tìm với đầy đủ bộ lọc khách đưa.
    const tours = await this.queryTours(this.buildTourWhere(a, { price: true, tourType: true, month: true }));
    if (tours.length > 0) {
      return tours.map((t) => this.mapTour(t));
    }

    // 2) Không khớp đúng → tự nới dần bộ lọc phụ thay vì bắt khách gõ lại.
    //    Thứ tự ưu tiên bỏ: ngân sách → loại tour → thời gian (giữ điểm đến + đủ ghế).
    const priceGiven = Boolean(a.minPrice || a.maxPrice);
    const typeGiven = Boolean(a.tourType);
    const monthGiven = Boolean(a.startMonth || a.startMonthFrom);
    const dropOrder: Array<{ key: 'price' | 'tourType' | 'month'; label: string; given: boolean }> = [
      { key: 'price', label: 'ngân sách', given: priceGiven },
      { key: 'tourType', label: 'loại tour', given: typeGiven },
      { key: 'month', label: 'thời gian', given: monthGiven },
    ];

    if (dropOrder.some((f) => f.given)) {
      const keep = { price: priceGiven, tourType: typeGiven, month: monthGiven };
      const dropped: string[] = [];
      for (const filter of dropOrder) {
        if (!filter.given) continue;
        keep[filter.key] = false;
        dropped.push(filter.label);
        const relaxed = await this.queryTours(this.buildTourWhere(a, keep));
        if (relaxed.length > 0) {
          return relaxed.map((t) => ({ ...this.mapTour(t), _relaxed: true, _relaxedFilters: [...dropped] }));
        }
      }
    }

    // 3) Vẫn rỗng → thử semantic search nếu có đủ văn bản truy vấn.
    const semanticQuery = [a.destination, a.tourType].filter(Boolean).join(' ');
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

    // 4) Thực sự không có tour nào.
    return { message: 'Không tìm thấy tour nào phù hợp với yêu cầu này.' };
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

  getFunctionToolCall(
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
      if ('canCancel' in r) return `canCancel=${Boolean(r.canCancel)} refund=${Number(r.refundPercent ?? 0)}%`;
      return 'not_found';
    }
    return 'ok';
  }

  async executeTourTool(
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
}
