import { Controller, Post, Body, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';

// Controller thanh toán riêng (hiện tại logic chính nằm trong BookingController)
// Giữ lại module này để export PaymentService cho các module khác sử dụng
@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }
}