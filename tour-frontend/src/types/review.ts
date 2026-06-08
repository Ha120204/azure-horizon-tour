import type { User } from './user';

export interface Review {
  id: number;
  tourId: number;
  userId: number;
  rating: number;
  content: string;
  adminReply?: string;
  imageUrls?: string[];
  createdAt: string;
  user?: Pick<User, 'fullName' | 'avatarUrl'>;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
}
