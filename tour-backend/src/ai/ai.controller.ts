import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { randomUUID } from 'crypto';
import type { CookieOptions, Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { AiService } from './ai.service';
import { AiTranslationService } from './ai-translation.service';
import { AiEmbeddingService } from './ai-embedding.service';
import type { TourTranslationRequest, ArticleTranslationRequest } from './ai-translation.service';
import { ChatRequestDto } from './dto/chat-request.dto';

type AuthenticatedRequest = {
  user?: {
    userId?: number;
  };
  cookies?: Record<string, string>;
};

const ANON_COOKIE = 'ah_anon';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiTranslationService: AiTranslationService,
    private readonly aiEmbeddingService: AiEmbeddingService,
  ) {}

  private getAnonId(req: AuthenticatedRequest): string | undefined {
    return req.cookies?.[ANON_COOKIE];
  }

  // Cấp định danh khách vãng lai (cookie HttpOnly) nếu chưa có, để gắn quyền sở
  // hữu phiên chat ẩn danh. Phải gọi trước khi response flush headers.
  private ensureAnonId(req: AuthenticatedRequest, res: Response): string {
    const existing = req.cookies?.[ANON_COOKIE];
    if (existing) return existing;

    const anonId = randomUUID();
    const isProd = process.env.NODE_ENV === 'production';
    const options: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 180 * 24 * 60 * 60 * 1000,
    };
    res.cookie(ANON_COOKIE, anonId, options);
    return anonId;
  }

  @Get('status')
  getStatus() {
    return this.aiService.getStatus();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('chat/me/latest')
  getMyLatestHistory(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Login is required');
    }

    return this.aiService.getLatestHistoryForUser(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('chat/sessions')
  getMySessions(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Login is required');
    }

    return this.aiService.getSessionsForUser(userId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(OptionalJwtGuard)
  @Post('chat')
  chat(
    @Body() body: ChatRequestDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const anonId = req.user?.userId ? undefined : this.ensureAnonId(req, res);
    return this.aiService.chat(body.message.trim(), body.sessionId, req.user?.userId, body.currentTourId, anonId, body.language, body.currency);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(OptionalJwtGuard)
  @Post('chat/stream')
  async streamChat(
    @Body() body: ChatRequestDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user?.userId ?? null;
    const anonId = userId ? undefined : this.ensureAnonId(req, res);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.aiService.chatStream(body.message.trim(), body.sessionId, userId, body.currentTourId, anonId, body.language, body.currency)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch {
      res.write(`data: ${JSON.stringify({ error: 'Stream failed', errorType: 'unknown' })}\n\n`);
    } finally {
      res.end();
    }
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post('translate/tour')
  translateTourDraft(@Body() body: TourTranslationRequest) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Tour draft content is required');
    }

    return this.aiTranslationService.translateTourDraft(body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post('translate/article')
  translateArticleDraft(@Body() body: ArticleTranslationRequest) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Article draft content is required');
    }
    if (!body.title?.trim() && !body.excerpt?.trim() && !body.content?.trim()) {
      throw new BadRequestException('Cần có nội dung tiếng Việt để dịch');
    }

    return this.aiTranslationService.translateArticleDraft(body);
  }

  // Backfill embeddings cho tất cả PUBLISHED tour chưa có embedding.
  // Chạy một lần sau deploy hoặc sau khi publish nhiều tour mới.
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('embeddings/backfill')
  backfillEmbeddings() {
    return this.aiEmbeddingService.backfillPublished();
  }

  // Embed lại một tour cụ thể — dùng sau khi chỉnh sửa nội dung tour đã PUBLISHED.
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('embeddings/tour/:tourId')
  embedTour(@Param('tourId') tourId: string) {
    return this.aiEmbeddingService.embedTour(Number(tourId));
  }

  // Event tracking từ FE — fire-and-forget, luôn trả 204 để FE không chờ.
  @UseGuards(OptionalJwtGuard)
  @Post('event')
  logEvent(@Body() body: { type?: string; sessionId?: string; tourId?: number }, @Req() req: AuthenticatedRequest) {
    const allowedTypes = new Set(['tour_card_click', 'retry_after_error']);
    if (!body?.type || !allowedTypes.has(body.type)) return;
    this.aiService.logClientEvent({
      type: body.type,
      sessionId: body.sessionId,
      tourId: body.tourId,
      userId: req.user?.userId,
    });
  }

  @UseGuards(OptionalJwtGuard)
  @Get('chat/:sessionId')
  getHistory(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.getHistory(sessionId, req.user?.userId, this.getAnonId(req));
  }

  @UseGuards(OptionalJwtGuard)
  @Delete('chat/:sessionId')
  clearSession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.clearSession(sessionId, req.user?.userId, this.getAnonId(req));
  }
}
