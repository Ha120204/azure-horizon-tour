export function StatBadge({ label, value, color = 'blue' }: { label: string; value: string | number; color?: string }) {
    const c: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        rose: 'bg-rose-50 text-rose-700 border-rose-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
    };
    return (
        <div className={`flex flex-col items-center p-4 rounded-xl border ${c[color] || c.blue}`}>
            <span className="text-2xl font-bold font-headline">{value}</span>
            <span className="text-xs font-medium mt-1 opacity-70 text-center leading-tight">{label}</span>
        </div>
    );
}
