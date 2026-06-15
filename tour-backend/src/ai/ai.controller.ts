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
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { AiService } from './ai.service';
import { AiTranslationService } from './ai-translation.service';
import type { TourTranslationRequest, ArticleTranslationRequest } from './ai-translation.service';
import { ChatRequestDto } from './dto/chat-request.dto';

type AuthenticatedRequest = {
  user?: {
    userId?: number;
  };
};

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiTranslationService: AiTranslationService,
  ) {}

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
  chat(@Body() body: ChatRequestDto, @Req() req: AuthenticatedRequest) {
    return this.aiService.chat(body.message.trim(), body.sessionId, req.user?.userId, body.currentTourId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(OptionalJwtGuard)
  @Post('chat/stream')
  async streamChat(
    @Body() body: ChatRequestDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const userId = req.user?.userId ?? null;
    try {
      for await (const event of this.aiService.chatStream(body.message.trim(), body.sessionId, userId, body.currentTourId)) {
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

  @UseGuards(OptionalJwtGuard)
  @Get('chat/:sessionId')
  getHistory(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.getHistory(sessionId, req.user?.userId);
  }

  @UseGuards(OptionalJwtGuard)
  @Delete('chat/:sessionId')
  clearSession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.clearSession(sessionId, req.user?.userId);
  }
}
