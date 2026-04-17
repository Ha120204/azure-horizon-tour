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

    /**
     * Tool: Kiểm tra đơn hàng của user
     */
    private async executeCheckMyBookings(args: any, userId: number | null) {
        if (!userId) {
            return { message: "Khách hàng chưa đăng nhập. Vui lòng nhắc họ đăng nhập để kiểm tra đơn đặt tour cá nhân." };
        }

        const statusFilter = args.status; // Optional

        let whereClause: any = { userId };
        if (statusFilter && statusFilter !== 'ALL') {
             whereClause.status = statusFilter;
        }

        const bookings = await this.prisma.booking.findMany({
            where: whereClause,
            include: { tour: true },
            orderBy: { createdAt: 'desc' },
            take: 3
        });

        if (bookings.length === 0) {
            return { message: "Không tìm thấy chuyến đi nào của bạn trong hệ thống." };
        }

        return bookings.map(b => ({
            bookingCode: b.bookingCode,
            tourName: b.tour.name,
            departureDate: b.tour.startDate.toISOString().split('T')[0],
            numberOfPeople: b.numberOfPeople,
            totalPrice: b.totalPrice,
            status: b.status,
            paymentStatus: b.paymentStatus
        }));
    }

    private buildSystemPrompt(): string {
        return `Bạn là "Azure Horizon AI Concierge" — trợ lý du lịch cao cấp của nền tảng đặt tour Azure Horizon.

NHIỆM VỤ CỐT LÕI:
- Tư vấn du lịch, gợi ý tour phù hợp dựa trên sở thích, ngân sách và lịch trình của khách.
- Khách hàng có thể là đang ẩn danh, hoặc đã đăng nhập. Bạn có ngữ cảnh lịch sử trò chuyện.
- Khi khách hỏi tìm tour, hãy CHỦ ĐỘNG GỌI TOOL "search_tours" để truy xuất dữ liệu từ hệ thống!
- Khi khách hỏi về lịch trình CHUYẾN ĐI CỦA HỌ, hãy CHỦ ĐỘNG GỌI TOOL "check_my_bookings" để tra cứu đơn đặt tour cá nhân.
- Tuyệt đối không bịa ra thông tin.

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

    async chat(userMessage: string, sessionId?: string, userId?: number | null): Promise<{ reply: string, tourCard?: any, sessionId?: string }> {
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
            },
            {
                functionDeclarations: [
                    {
                        name: "check_my_bookings",
                        description: "Tìm kiếm và lấy thông tin các đơn đặt tour (booking) của người dùng hiện tại đang chat với bạn.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                status: {
                                    type: "STRING",
                                    description: "Lọc theo trạng thái đơn hàng (ví dụ: 'CONFIRMED', 'PENDING', 'CANCELLED', hoặc 'ALL'). Mặc định là 'ALL'."
                                }
                            }
                        }
                    }
                ]
            }
        ];

        let currentSessionId = sessionId;

        // Lưu / Lấy lịch sử chat
        let dbHistory: any[] = [];
        if (currentSessionId) {
            const session = await this.prisma.chatSession.findUnique({
                where: { id: currentSessionId },
                include: { messages: { orderBy: { createdAt: 'asc' } } }
            });
            if (session) {
                dbHistory = session.messages.map(msg => ({
                    role: msg.role === 'model' ? 'model' : 'user',
                    text: msg.content
                }));
            } else {
                currentSessionId = undefined; // Session ID không tồn tại
            }
        }

        if (!currentSessionId) {
            const newSession = await this.prisma.chatSession.create({
                data: { userId: userId || null }
            });
            currentSessionId = newSession.id;
        }

        // Lưu câu hỏi của User vào DB
        await this.prisma.chatMessage.create({
            data: {
                sessionId: currentSessionId,
                role: 'user',
                content: userMessage
            }
        });

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
                const historyClean: any[] = dbHistory
                    .filter(msg => msg.text && msg.text.trim() !== '')
                    .map(msg => ({
                        role: msg.role === 'model' ? 'model' : 'user',
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
                    } else if (functionCall.name === 'check_my_bookings') {
                        fnResult = await this.executeCheckMyBookings(functionCall.args, userId || null);
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

                // Lưu câu trả lời của AI vào DB
                await this.prisma.chatMessage.create({
                    data: {
                        sessionId: currentSessionId,
                        role: 'model',
                        content: rawText // Lưu nguyên bản có cả thẻ TOUR_CARD
                    }
                });

                return { reply: reply || 'Xin lỗi, tôi không thể trả lời lúc này.', tourCard, sessionId: currentSessionId };

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
                    return { reply: '⏳ Trợ lý AI hiện đang sử dụng phiên bản API miễn phí và đã đạt giới hạn truy vấn của Google. Vui lòng chờ vài phút rồi nhắn lại nhé!', sessionId: currentSessionId };
                }

                console.error('[AI] Lỗi kết nối Gemini API:', errorMsg);
                // Nếu lỗi khác (không phải 429), trả về lỗi ngay không retry
                return { reply: '❌ Không thể kết nối đến Trợ lý AI. Vui lòng thử lại sau.', sessionId: currentSessionId };
            }
        }
        
        return { reply: '❌ Đã có lỗi không xác định xảy ra.', sessionId: currentSessionId };
    }

    async getHistory(sessionId: string) {
        const session = await this.prisma.chatSession.findUnique({
            where: { id: sessionId },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        });
        if (!session) return { messages: [] };
        
        return {
            messages: session.messages.map(msg => {
                let text = msg.content;
                let tourCard = undefined;
                
                if (msg.role === 'model') {
                    const cardMatch = text.match(/<<<TOUR_CARD>>>([\s\S]*?)<<<END_TOUR_CARD>>>/);
                    if (cardMatch && cardMatch[1]) {
                        try {
                            tourCard = JSON.parse(cardMatch[1].trim());
                            text = text.replace(cardMatch[0], '').trim();
                        } catch (e) {
                            console.error('Lỗi parse json trong getHistory:', e);
                        }
                    }
                }
                
                return {
                    id: msg.id.toString(),
                    role: msg.role === 'model' ? 'ai' : 'user',
                    text: text,
                    tourCard: tourCard
                };
            })
        };
    }
}
