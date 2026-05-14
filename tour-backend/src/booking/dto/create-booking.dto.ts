import { IsInt, IsOptional, IsString, Min, IsNumber, IsObject, IsArray } from 'class-validator';
import { Prisma } from '@prisma/client';

export type PassengerDto = {
    type?: string;
    [key: string]: Prisma.JsonValue | undefined;
};

export type ContactInfoDto = Record<string, Prisma.JsonValue>;

export class CreateBookingDto {
    @IsInt()
    tourId: number;

    @IsInt()
    @Min(1, { message: 'Số người đi phải ít nhất là 1' })
    numberOfPeople: number;

    @IsOptional()
    @IsString()
    voucherCode?: string;

    @IsOptional()
    @IsInt()
    packageId?: number;

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
}
