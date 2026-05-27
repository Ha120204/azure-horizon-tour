export function SkeletonCard() {
    return (
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 animate-pulse space-y-4">
            <div className="flex gap-4 items-center">
                <div className="w-11 h-11 rounded-full bg-surface-container-high shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-36 bg-surface-container-high rounded" />
                    <div className="h-3 w-24 bg-surface-container rounded" />
                </div>
                <div className="h-4 w-20 bg-surface-container-high rounded" />
            </div>
            <div className="space-y-2">
                <div className="h-3 w-full bg-surface-container-high rounded" />
                <div className="h-3 w-4/5 bg-surface-container rounded" />
                <div className="h-3 w-3/5 bg-surface-container rounded" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-outline-variant/10">
                <div className="h-8 w-20 bg-surface-container-high rounded-lg" />
                <div className="h-8 w-16 bg-surface-container-high rounded-lg" />
                <div className="h-8 w-16 bg-surface-container-high rounded-lg" />
            </div>
        </div>
    );
}
