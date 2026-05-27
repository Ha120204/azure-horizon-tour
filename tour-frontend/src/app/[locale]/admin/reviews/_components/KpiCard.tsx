export function KpiCard({
    icon, label, value, sub, gradient, iconBg, iconColor, onClick, active,
}: {
    icon: string; label: string; value: string | number; sub: string;
    gradient: string; iconBg: string; iconColor: string;
    onClick?: () => void; active?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative text-left bg-surface-container-lowest rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden group outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? 'border-primary/50 ring-2 ring-primary/15' : 'border-outline-variant/10'}`}
        >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8 bg-gradient-to-br ${gradient} opacity-[0.07] group-hover:opacity-[0.13] transition-opacity`} />
            <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-xl ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                </div>
                {onClick && <span className={`material-symbols-outlined text-[18px] ${active ? 'text-primary' : 'text-on-surface-variant/35'}`}>filter_alt</span>}
            </div>
            <p className="text-2xl font-extrabold text-on-surface leading-tight">{value}</p>
            <p className="text-xs font-semibold text-on-surface-variant mt-1">{label}</p>
            <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{sub}</p>
        </button>
    );
}
