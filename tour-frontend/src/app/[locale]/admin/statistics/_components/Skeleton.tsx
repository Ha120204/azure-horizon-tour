export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`bg-slate-100 rounded-xl animate-pulse ${className}`} />;
}
