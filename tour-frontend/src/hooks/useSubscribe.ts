'use client';

import { useState, type FormEvent } from 'react';
import { API_BASE_URL } from '@/lib/http/constants';

export type SubscribeStatus = 'idle' | 'loading' | 'success' | 'exists' | 'error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Logic đăng ký nhận bản tin dùng chung cho mọi form newsletter
 * (Footer, VIP, trang Journal...). Mỗi nơi tự render UI riêng.
 */
export function useSubscribe() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<SubscribeStatus>('idle');

    const handleSubscribe = async (e: FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        if (!EMAIL_REGEX.test(value)) {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 4000);
            return;
        }

        setStatus('loading');
        try {
            const res = await fetch(`${API_BASE_URL}/subscriber/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: value }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                setStatus('error');
                return;
            }
            if (data?.message === 'already_exists') {
                setStatus('exists');
            } else {
                setStatus('success');
                setEmail('');
            }
        } catch {
            setStatus('error');
        } finally {
            setTimeout(() => setStatus('idle'), 4000);
        }
    };

    return { email, setEmail, status, handleSubscribe };
}
