import type { Tour } from './tour';
import type { User } from './user';

export interface Booking {
  id: number;
  tourId: number;
  userId: number;
  totalPrice: number;
  numberOfPeople: number;
  paymentStatus: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  createdAt: string;
  tour?: Tour;
  user?: User;
}
