import { Controller, Post, Body, Req, Get, Param } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

class ChatDto {
    message: string;
    sessionId?: string; // Tùy chọn, để duy trì cuộc hội thoại
}

@Controller('ai')
export class AiController {
    constructor(
        private readonly aiService: AiService,
        private readonly jwtService: JwtService
    ) { }

    /**
     * POST /ai/chat
     * Body: { message: "string", sessionId?: "..." }
     * Header: Authorization: Bearer <token> (Optional)
     * Response: { reply: "string", sessionId: "...", tourCard?: {...} }
     */
    @Post('chat')
    async chat(@Body() body: ChatDto, @Req() request: Request) {
        const { message, sessionId } = body;

        if (!message || !message.trim()) {
            return { reply: 'Vui lòng nhập tin nhắn.' };
        }

        let userId: number | null = null;

        // Trích xuất JWT token để nhận diện người dùng
        const authHeader = request.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = this.jwtService.verify(token);
                userId = decoded.sub || decoded.userId;
            } catch (error) {
                console.warn('[AI] Invalid JWT token, treating as anonymous guest.', error.message);
            }
        }

        const result = await this.aiService.chat(message, sessionId, userId);
        return result;
    }

    @Get('chat/:sessionId')
    async getHistory(@Param('sessionId') sessionId: string) {
        return this.aiService.getHistory(sessionId);
    }
}
