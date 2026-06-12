'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';
import { fetchOptionalAuth } from '@/lib/auth/authSession';

/**
 * Kiểm tra user hiện tại có đủ điều kiện viết đánh giá cho tour không.
 *
 * Nguồn sự thật là endpoint `/tour/:id/reviews/can-review` (yêu cầu cookie auth):
 * đã có booking CONFIRMED + PAID, chuyến đã hoàn tất, và chưa từng đánh giá.
 * Không phụ thuộc localStorage — khách chưa đăng nhập nhận 401 → eligible = false.
 *
 * Trả về `setCanReview` để consumer tự hạ cờ sau khi gửi đánh giá thành công.
 */
export function useCanReview(tourId: string | number) {
    const [canReview, setCanReview] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchOptionalAuth(`${API_BASE_URL}/tour/${tourId}/reviews/can-review`)
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (cancelled) return;
                const eligible = json?.data?.eligible ?? json?.eligible ?? false;
                setCanReview(Boolean(eligible));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [tourId]);

    return { canReview, setCanReview };
}
