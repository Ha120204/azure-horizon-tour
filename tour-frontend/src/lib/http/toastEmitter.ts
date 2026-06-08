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

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ToastEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  error(title: string, message?: string, duration?: number) {
    this.emit({ type: 'error', title, message, duration });
  }

  success(title: string, message?: string, duration?: number) {
    this.emit({ type: 'success', title, message, duration });
  }

  info(title: string, message?: string, duration?: number) {
    this.emit({ type: 'info', title, message, duration });
  }

  warning(title: string, message?: string, duration?: number) {
    this.emit({ type: 'warning', title, message, duration });
  }
}

export const toastEmitter = new ToastEmitter();
