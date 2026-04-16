'use client';

// Override console.error at module level — runs BEFORE React hydration
if (typeof window !== 'undefined') {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
        const msg = typeof args[0] === 'string' ? args[0] : '';
        if (
            msg.includes('bis_skin_checked') ||
            msg.includes('bis_register') ||
            msg.includes('__processed_') ||
            msg.includes('A tree hydrated but some attributes') ||
            msg.includes('Hydration failed') ||
            msg.includes('hydration mismatch') ||
            msg.includes("server rendered HTML didn't match")
        ) {
            return;
        }
        originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
        const msg = typeof args[0] === 'string' ? args[0] : '';
        if (
            msg.includes('bis_skin_checked') ||
            msg.includes('A tree hydrated but some attributes') ||
            msg.includes("server rendered HTML didn't match")
        ) {
            return;
        }
        originalWarn.apply(console, args);
    };
}

export default function SuppressHydrationWarning() {
    return null;
}
