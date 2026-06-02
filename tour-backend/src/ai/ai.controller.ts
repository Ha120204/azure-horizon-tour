import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OptionalJwtGuard } from '../auth/guards/optional-jwt.guard';
import { AiService } from './ai.service';
import type { TourTranslationRequest } from './ai.service';

type ChatRequestBody = {
  message?: string;
  sessionId?: string;
};

type AuthenticatedRequest = {
  user?: {
    userId?: number;
  };
};

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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

  @UseGuards(OptionalJwtGuard)
  @Post('chat')
  chat(@Body() body: ChatRequestBody, @Req() req: AuthenticatedRequest) {
    const message = body.message?.trim();
    if (!message) {
      throw new BadRequestException('Message is required');
    }

    return this.aiService.chat(message, body.sessionId, req.user?.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'STAFF')
  @Post('translate/tour')
  translateTourDraft(@Body() body: TourTranslationRequest) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Tour draft content is required');
    }

    return this.aiService.translateTourDraft(body);
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
