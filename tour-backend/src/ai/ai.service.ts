import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Tool: Tìm kiếm tour du lịch trong Database
     */
    private async executeSearchTours(args: any) {
        const { destination, maxPrice } = args;
        const whereClause: any = { availableSeats: { gt: 0 } };

        // Tìm theo tên tour, tên điểm đến hoặc vùng miền
        if (destination) {
            whereClause.OR = [
                { name: { contains: destination, mode: 'insensitive' } },
                { destination: { name: { contains: destination, mode: 'insensitive' } } },
                { destination: { region: { contains: destination, mode: 'insensitive' } } },
            ];
        }

        if (maxPrice) {
            whereClause.price = { lte: maxPrice };
        }

        const tours = await this.prisma.tour.findMany({
            where: whereClause,
            include: { destination: true },
            take: 5, // Chỉ trả về top 5 kết quả cho AI đọc
            orderBy: { price: 'asc' }
        });

        if (tours.length === 0) {
            return { message: "Không tìm thấy tour nào phù hợp với yêu cầu này." };
        }

        return tours.map(t => ({
            id: t.id,
            name: t.name,
            destination: t.destination?.name || 'Vô định',
            price: t.price, // số tiền USD
            duration: t.duration,
            startDate: t.startDate.toISOString().split('T')[0],
            availableSeats: t.availableSeats,
            imageUrl: t.imageUrl,
        }));
    }

    private buildSystemPrompt(): string {
        return `Bạn là "Azure Horizon AI Concierge" — trợ lý du lịch cao cấp của nền tảng đặt tour Azure Horizon.

NHIỆM VỤ CỐT LÕI:
- Tư vấn du lịch, gợi ý tour phù hợp dựa trên sở thích, ngân sách và lịch trình của khách.
- Khi khách hỏi tìm tour, hãy CHỦ ĐỘNG GỌI TOOL "search_tours" để truy xuất dữ liệu từ hệ thống! Tuyệt đối không bịa ra thông tin.

ĐỊNH DẠNG TRẢ LỜI CÓ CHỨA "THẺ TOUR" (RICH UI):
Nếu bạn tìm thấy 1 tour rất phù hợp và muốn "Chốt" giới thiệu nó cho khách, hãy chèn thêm 1 đoạn mã JSON với cấu trúc chính xác như sau vào cuối câu trả lời của bạn:
<<<TOUR_CARD>>>
{
  "name": "Tên Tour đúng như trong dữ liệu",
  "nameKey": "Để trống nếu không có",
  "price": "$Giá",
  "image": "URL ảnh của tour"
}
<<<END_TOUR_CARD>>>

Ví dụ: 
Tuyệt vời! Tôi có một tour đi Hạ Long rất hợp với bạn.
<<<TOUR_CARD>>>
{
  "name": "Hạ Long Bay Cruise",
  "nameKey": "",
  "price": "$150",
  "image": "https://..."
}
<<<END_TOUR_CARD>>>

LƯU Ý: 
- Chỉ dùng định dạng này khi bạn THỰC SỰ muốn hiển thị bảng giá đẹp. 
- Nếu chỉ chat thông thường hoặc xin thêm thông tin thì không hiện thẻ này.
- Giữ câu trả lời văn bản ngắn gọn, thân thiện (tiếng Việt hoặc English tùy khách dùng).`;
    }

    async chat(userMessage: string, conversationHistory: { role: string; text: string }[]): Promise<{ reply: string, tourCard?: any }> {
        const tools: any = [
            {
                functionDeclarations: [
                    {
                        name: "search_tours",
                        description: "Tìm kiếm các tour du lịch trong hệ thống dựa trên yêu cầu của khách.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                destination: {
                                    type: "STRING",
                                    description: "Tên điểm đến, địa danh, hoặc từ khóa (ví dụ: london, đà lạt, biển, châu âu)."
                                },
                                maxPrice: {
                                    type: "NUMBER",
                                    description: "Ngân sách tối đa của khách (tính bằng USD)."
                                }
                            }
                        }
                    }
                ]
            }
        ];

        const MAX_RETRIES = 1;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const systemPrompt = this.buildSystemPrompt();

                const model = this.genAI.getGenerativeModel({
                    model: 'gemini-2.0-flash',
                    systemInstruction: systemPrompt,
                    tools: tools,
                });

                // Lọc ra các text null/undefined để tránh API throw error
                const historyClean: any[] = conversationHistory
                    .filter(msg => msg.text && msg.text.trim() !== '')
                    .map(msg => ({
                        role: msg.role === 'ai' ? 'model' : 'user',
                        parts: [{ text: msg.text }],
                    }));

                const contents: any[] = [
                    ...historyClean,
                    { role: 'user', parts: [{ text: userMessage }] }
                ];

                let response = await model.generateContent({ contents });
                const call = response.response.functionCalls();

                // Nếu AI yêu cầu gọi Tool
                if (call && call.length > 0) {
                    const functionCall = call[0];
                    let fnResult: any = [];

                    if (functionCall.name === 'search_tours') {
                        fnResult = await this.executeSearchTours(functionCall.args);
                    }

                    // Chèn thêm content Model call
                    if (response.response.candidates && response.response.candidates.length > 0) {
                        contents.push(response.response.candidates[0].content);
                    }

                    // Chèn thêm content user gửi trả kết quả Tool về
                    contents.push({
                        role: 'user',
                        parts: [{
                            functionResponse: {
                                name: functionCall.name,
                                response: { result: fnResult }
                            }
                        }]
                    });

                    // Gọi lần 2 để AI lấy kết quả Tool và tổng hợp câu trả lời
                    response = await model.generateContent({ contents });
                }

                const rawText = response.response.text();

                let reply = rawText;
                let tourCard = undefined;

                // Dùng regex để bóc tách JSON Tour Card do AI gửi ra
                const cardMatch = rawText.match(/<<<TOUR_CARD>>>([\s\S]*?)<<<END_TOUR_CARD>>>/);
                if (cardMatch && cardMatch[1]) {
                    try {
                        tourCard = JSON.parse(cardMatch[1].trim());
                        // Loại bỏ đoạn JSON khỏi text hiển thị cho người dùng
                        reply = rawText.replace(cardMatch[0], '').trim();
                    } catch (e) {
                        console.error('Lỗi phân tích JSON TourCard từ AI:', e);
                    }
                }

                return { reply: reply || 'Xin lỗi, tôi không thể trả lời lúc này.', tourCard };

            } catch (error: any) {
                const errorMsg = error?.message || String(error);

                // Nếu bị rate limit (429) hoặc hết Quota
                if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests') || errorMsg.includes('quota')) {
                    console.warn(`[AI] Quota/Rate limited (lần ${attempt + 1}/${MAX_RETRIES + 1}).`);

                    if (attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, 3000)); // Chờ 3s rồi retry thử
                        continue;
                    }

                    // Hết lần retry
                    return { reply: '⏳ Trợ lý AI hiện đang sử dụng phiên bản API miễn phí và đã đạt giới hạn truy vấn của Google. Vui lòng chờ vài phút rồi nhắn lại nhé!' };
                }

                console.error('[AI] Lỗi kết nối Gemini API:', errorMsg);
                // Nếu lỗi khác (không phải 429), trả về lỗi ngay không retry
                return { reply: '❌ Không thể kết nối đến Trợ lý AI. Vui lòng thử lại sau.' };
            }
        }
        
        return { reply: '❌ Đã có lỗi không xác định xảy ra.' };
    }
}
