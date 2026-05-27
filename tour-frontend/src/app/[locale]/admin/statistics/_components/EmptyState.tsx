export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
    return (
        <div className="flex h-full min-h-48 flex-col items-center justify-center text-center text-slate-300">
            <span className="material-symbols-outlined mb-2 text-5xl">{icon}</span>
            <p className="text-sm font-semibold text-slate-400">{title}</p>
            {hint && <p className="mt-1 max-w-sm text-xs text-slate-300">{hint}</p>}
        </div>
    );
}
