import { IsInt, IsOptional, IsString, Min, IsNumber, IsObject, IsArray, IsBoolean } from 'class-validator';
import { Prisma } from '@prisma/client';

export type PassengerDto = {
    type?: string;
    [key: string]: Prisma.JsonValue | undefined;
};

export type ContactInfoDto = Record<string, Prisma.JsonValue>;

export class CreateBookingDto {
    @IsInt()
    tourId!: number;

    @IsInt()
    @Min(1, { message: 'Số người đi phải ít nhất là 1' })
    numberOfPeople!: number;

    /**
     * Số ghế thực sự cần giữ (= adult + child, KHÔNG tính infant).
     * Infant ngồi lòng người lớn nên không chiếm ghế.
     * Nếu không gửi, fallback về numberOfPeople để backward-compatible.
     */
    @IsOptional()
    @IsInt()
    @Min(1)
    seatCount?: number;

    @IsOptional()
    @IsString()
    voucherCode?: string;

    @IsInt({ message: 'Vui lòng chọn gói dịch vụ trước khi đặt tour' })
    packageId!: number;

    @IsOptional()
    @IsInt()
    departureId?: number;  // ID của TourDeparture đã chọn

    @IsOptional()
    @IsNumber()
    totalAmount?: number;

    @IsOptional()
    @IsObject()
    contactInfo?: ContactInfoDto;

    @IsOptional()
    @IsArray()
    passengers?: PassengerDto[];

    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @IsOptional()
    @IsBoolean()
    staffAssistRequested?: boolean;
}
