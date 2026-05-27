export function DetailInfoCard({ icon, label, value, isWarning = false }: { icon: string; label: string; value: string; isWarning?: boolean }) {
    return (
        <div className={`p-4 rounded-2xl border ${isWarning ? 'border-red-500/20 bg-red-50' : 'border-outline-variant/15 bg-surface-container-lowest'}`}>
            <div className="flex items-center gap-3 mb-1">
                <span className={`material-symbols-outlined text-[18px] ${isWarning ? 'text-red-500' : 'text-on-surface-variant'}`} aria-hidden="true">{icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</span>
            </div>
            <p className={`text-sm font-semibold pl-8 ${isWarning ? 'text-red-700' : 'text-on-surface'}`}>{value}</p>
        </div>
    );
}
