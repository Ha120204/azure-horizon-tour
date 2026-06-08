import Link from 'next/link';

export function BookingListSkeleton({ loadingLabel }: { loadingLabel: string }) {
    return (
        <div role="status" aria-label={loadingLabel} className="space-y-5">
            {[0, 1].map(index => (
                <div
                    key={index}
                    className="grid animate-pulse overflow-hidden rounded-lg border border-outline-variant/15 bg-white motion-reduce:animate-none md:grid-cols-[220px_minmax(0,1fr)]"
                >
                    <div className="aspect-[16/9] bg-slate-200 md:aspect-auto md:min-h-[300px]" />
                    <div className="flex flex-col gap-5 p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 space-y-3">
                                <div className="h-3 w-40 rounded bg-slate-200" />
                                <div className="h-7 max-w-md rounded bg-slate-200" />
                            </div>
                            <div className="h-8 w-28 shrink-0 rounded-md bg-slate-200" />
                        </div>
                        <div className="h-4 w-56 rounded bg-slate-100" />
                        <div className="grid gap-4 border-y border-outline-variant/10 py-5 sm:grid-cols-3">
                            {[0, 1, 2].map(item => (
                                <div key={item} className="flex gap-3">
                                    <div className="size-5 shrink-0 rounded bg-slate-200" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-2.5 w-20 rounded bg-slate-200" />
                                        <div className="h-4 w-full rounded bg-slate-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-auto flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                            <div className="grid flex-1 grid-cols-2 gap-5 sm:grid-cols-3">
                                {[0, 1, 2].map(item => (
                                    <div key={item} className="space-y-2">
                                        <div className="h-2.5 w-16 rounded bg-slate-200" />
                                        <div className="h-4 w-20 rounded bg-slate-100" />
                                    </div>
                                ))}
                            </div>
                            <div className="h-11 w-full rounded-lg bg-slate-200 sm:w-36" />
                        </div>
                    </div>
                </div>
            ))}
            <span className="sr-only">{loadingLabel}</span>
        </div>
    );
}

type EmptyProps = {
    icon: string;
    title: string;
    description: string;
    primaryLabel: string;
    primaryHref?: string;
    onPrimaryAction?: () => void;
};

export function BookingEmptyState({
    icon,
    title,
    description,
    primaryLabel,
    primaryHref,
    onPrimaryAction,
}: EmptyProps) {
    const actionClass =
        'group/action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100';

    return (
        <div className="border-y border-outline-variant/15 bg-white/60 px-5 py-16 text-center sm:py-20">
            <span className="material-symbols-outlined text-5xl text-primary/45" aria-hidden="true">
                {icon}
            </span>
            <h2 className="mt-5 font-headline text-2xl font-extrabold text-on-surface">{title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">{description}</p>
            <div className="mt-6">
                {primaryHref ? (
                    <Link href={primaryHref} className={actionClass}>
                        {primaryLabel}
                        <span className="material-symbols-outlined text-lg transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/action:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/action:translate-x-0" aria-hidden="true">arrow_forward</span>
                    </Link>
                ) : (
                    <button type="button" onClick={onPrimaryAction} className={actionClass}>
                        {primaryLabel}
                        <span className="material-symbols-outlined text-lg transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/action:-rotate-6 motion-reduce:transition-none motion-reduce:group-hover/action:rotate-0" aria-hidden="true">filter_alt_off</span>
                    </button>
                )}
            </div>
        </div>
    );
}

export function BookingErrorState({
    title,
    description,
    retryLabel,
    onRetry,
}: {
    title: string;
    description: string;
    retryLabel: string;
    onRetry: () => void;
}) {
    return (
        <div role="alert" className="border-y border-red-200 bg-red-50/60 px-5 py-14 text-center sm:py-16">
            <span className="material-symbols-outlined text-5xl text-red-500" aria-hidden="true">
                cloud_off
            </span>
            <h2 className="mt-4 font-headline text-xl font-extrabold text-red-950">{title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-800/80">{description}</p>
            <button
                type="button"
                onClick={onRetry}
                className="group/retry mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-bold text-white transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:bg-red-800 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
            >
                <span className="material-symbols-outlined text-lg transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/retry:rotate-90 motion-reduce:transition-none motion-reduce:group-hover/retry:rotate-0" aria-hidden="true">refresh</span>
                {retryLabel}
            </button>
        </div>
    );
}
