/**
 * Payload được extract từ JWT token sau khi validate.
 * Dùng cho request.user trong các controller.
 */
export interface JwtPayload {
  id: number;
  userId: number;
  sub: number;
  email: string;
  role: string;
}

/**
 * Standard paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

/**
 * Standard API response wrapper (dùng trong transform.interceptor).
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}
