import { Controller, Post, Body, Req, Res, Get, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import type { Request, Response } from 'express';

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    // 1. API nhận tiền từ Frontend và trả về Link VNPAY
    @Post('create-url')
    createPaymentUrl(@Body() body: any, @Req() req: Request) {
        // Tạm thời random ID đơn hàng (Thực tế BA sẽ yêu cầu lưu DB trước rồi lấy ID ra)
        const bookingCode = `BKG-TEST-${Math.floor(Math.random() * 100000)}`;

        // Tiền từ giao diện gửi xuống (Nhớ nhân tỷ giá nếu Frontend gửi tiền Đô, ở đây giả sử quy đổi 1$ = 25,000 VND)
        const amountInVND = body.amount * 25000;

        // Lấy IP của khách hàng (VNPAY bắt buộc có)
        const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

        // Gọi Service để tạo link
        const paymentUrl = this.paymentService.createPaymentUrl(bookingCode, amountInVND, ipAddr as string);

        // Trả link về cho thẻ <button> bên Frontend chuyển hướng
        return { paymentUrl };
    }

    // 2. API đón khách hàng quay về sau khi quẹt thẻ xong ở VNPAY
    @Get('vnpay-return')
    vnpayReturn(@Query() query: any, @Res() res: Response) {
        // Kiểm tra xem có đúng là VNPAY trả về không, hay do hacker giả mạo
        const isValid = this.paymentService.verifyReturnUrl(query);

        if (isValid) {
            // Chữ ký chuẩn -> Đá khách hàng về trang Vé Điện Tử (Success) của Next.js
            return res.redirect('http://localhost:3001/success');
        } else {
            // Chữ ký sai -> Đá về trang Checkout kèm thông báo lỗi
            return res.redirect('http://localhost:3001/checkout?error=invalid_signature');
        }
    }
}