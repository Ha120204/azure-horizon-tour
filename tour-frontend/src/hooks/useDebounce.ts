import { useState, useEffect } from 'react';

/**
 * Trì hoãn cập nhật giá trị cho đến khi user ngừng nhập trong `delay` ms.
 * Dùng để tránh gọi API liên tục khi đang gõ ở ô tìm kiếm.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}
