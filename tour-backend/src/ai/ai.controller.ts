import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

class ChatDto {
    message: string;
    history: { role: string; text: string }[];
}

@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    /**
     * POST /ai/chat
     * Body: { message: "string", history: [{ role: "user"|"ai", text: "..." }] }
     * Response: { reply: "string" }
     */
    @Post('chat')
    async chat(@Body() body: ChatDto) {
        const { message, history = [] } = body;

        if (!message || !message.trim()) {
            return { reply: 'Vui lòng nhập tin nhắn.' };
        }

        const result = await this.aiService.chat(message, history);
        return result;
    }
}
