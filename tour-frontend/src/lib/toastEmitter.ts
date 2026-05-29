/**
 * toastEmitter — Lightweight event bus để bắn toast notification
 * từ bất kỳ đâu (service, lib, hook, component) mà không cần React Context.
 *
 * Cách dùng:
 *   import { toastEmitter } from '@/lib/toastEmitter';
 *   toastEmitter.error('Lỗi kết nối mạng');
 *   toastEmitter.success('Lưu thành công!');
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastEvent {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastListener = (event: ToastEvent) => void;

class ToastEmitter {
  private listeners: Set<ToastListener> = new Set();

  /** Đăng ký nhận sự kiện (gọi trong useEffect của subscriber component) */
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Nội bộ: phát event đến tất cả listener */
  private emit(event: ToastEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  /** Hiển thị toast lỗi */
  error(title: string, message?: string, duration?: number) {
    this.emit({ type: 'error', title, message, duration });
  }

  /** Hiển thị toast thành công */
  success(title: string, message?: string, duration?: number) {
    this.emit({ type: 'success', title, message, duration });
  }

  /** Hiển thị toast thông tin */
  info(title: string, message?: string, duration?: number) {
    this.emit({ type: 'info', title, message, duration });
  }

  /** Hiển thị toast cảnh báo */
  warning(title: string, message?: string, duration?: number) {
    this.emit({ type: 'warning', title, message, duration });
  }
}

/** Singleton — dùng trên toàn app */
export const toastEmitter = new ToastEmitter();
