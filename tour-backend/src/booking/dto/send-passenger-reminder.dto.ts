import { IsIn } from 'class-validator';
import type { PassengerReminderChannel } from '../types';

export class SendPassengerReminderDto {
    @IsIn(['EMAIL', 'ZALO', 'CALL'])
    channel!: PassengerReminderChannel;
}
