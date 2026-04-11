import { IsInt, Min } from 'class-validator';

export class CreateBookingDto {
    @IsInt()
    tourId: number;

    @IsInt()
    @Min(1, { message: 'Số người đi phải ít nhất là 1' })
    numberOfPeople: number;
}