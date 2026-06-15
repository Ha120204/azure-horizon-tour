export function getDateRange(days: number) {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
    };
}

export function getGranularity(days: number): 'daily' | 'weekly' | 'monthly' {
    if (days <= 14) return 'daily';
    if (days <= 90) return 'weekly';
    return 'monthly';
}

export const formatVND = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
        .format(Math.round(n))
        .replace('₫', 'đ');

export const formatAxisVND = (n: number) => {
    if (n >= 1_000_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n / 1_000_000_000)} tỷ`;
    if (n >= 1_000_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n / 1_000_000)} tr`;
    if (n >= 1_000) return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n / 1_000)}k`;
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n);
};

export const formatDate = (value: string) => new Date(value).toLocaleDateString('vi-VN');
