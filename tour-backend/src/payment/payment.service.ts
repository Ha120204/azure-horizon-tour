import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import moment from 'moment';
import qs from 'qs';
import 'dotenv/config';

@Injectable()
export class PaymentService {

    createPaymentUrl(bookingCode: string, amount: number, ipAddr: string): string {
        const tmnCode = process.env.VNP_TMNCODE;
        const secretKey = process.env.VNP_HASHSECRET || '';
        let vnpUrl = process.env.VNP_URL || '';
        const returnUrl = process.env.VNP_RETURNURL || '';

        const date = new Date();
        const createDate = moment(date).format('YYYYMMDDHHmmss');

        // Gắn giờ-phút-giây vào sau mã Booking (VD: BKG-290326-X8A2_143025)
        const txnRef = `${bookingCode}_${moment(date).format('HHmmss')}`;

        const exchangeRate = 10000;
        const amountVND = Math.round(amount * exchangeRate);
        const vnp_Params: Record<string, any> = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Locale: 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: txnRef,
            vnp_OrderInfo: `Thanh toan don dat tour ${bookingCode}`,
            vnp_OrderType: 'other',
            // Truyền số tiền đã quy đổi VNĐ nhân 100 vào VNPAY
            vnp_Amount: amountVND * 100,
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr || '127.0.0.1',
            vnp_CreateDate: createDate,
        };

        // 1. Sắp xếp các tham số theo bảng chữ cái
        const sortedParams = this.sortObject(vnp_Params);

        // 2. Ép kiểu thành chuỗi Query String
        const signData = qs.stringify(sortedParams, { encode: false });

        // 3. Băm chữ ký điện tử bằng thuật toán SHA512
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        // 4. Nhét chữ ký vào URL và trả về
        sortedParams['vnp_SecureHash'] = signed;
        vnpUrl += '?' + qs.stringify(sortedParams, { encode: false });

        return vnpUrl;
    }

    // Hàm xác thực URL trả về từ VNPAY (GIỮ NGUYÊN)
    verifyReturnUrl(vnpayParams: any): boolean {
        const secureHash = vnpayParams['vnp_SecureHash'];
        delete vnpayParams['vnp_SecureHash'];
        delete vnpayParams['vnp_SecureHashType'];

        const secretKey = process.env.VNP_HASHSECRET || '';
        const sortedParams = this.sortObject(vnpayParams);
        const signData = qs.stringify(sortedParams, { encode: false });

        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        return secureHash === signed;
    }

    // Hàm phụ trợ: Sắp xếp Object (GIỮ NGUYÊN)
    private sortObject(obj: Record<string, any>): Record<string, string> {
        const sorted: Record<string, string> = {};
        const str: string[] = [];
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                str.push(encodeURIComponent(key));
            }
        }
        str.sort();
        for (let i = 0; i < str.length; i++) {
            sorted[str[i]] = encodeURIComponent(obj[str[i]]).replace(/%20/g, '+');
        }
        return sorted;
    }
}