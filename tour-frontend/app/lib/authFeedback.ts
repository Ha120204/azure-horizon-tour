export const LOGOUT_TOAST_STORAGE_KEY = 'az_logout_success';

export function queueLogoutSuccessToast() {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(LOGOUT_TOAST_STORAGE_KEY, '1');
}

export function consumeLogoutSuccessToast() {
    if (typeof window === 'undefined') return false;

    const shouldShowToast = window.sessionStorage.getItem(LOGOUT_TOAST_STORAGE_KEY) === '1';
    if (shouldShowToast) {
        window.sessionStorage.removeItem(LOGOUT_TOAST_STORAGE_KEY);
    }

    return shouldShowToast;
}
