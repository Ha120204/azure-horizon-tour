import { IsArray } from 'class-validator';
import { PassengerDto } from './create-booking.dto';

export class UpdateBookingPassengersDto {
    @IsArray()
    passengers!: PassengerDto[];
}
