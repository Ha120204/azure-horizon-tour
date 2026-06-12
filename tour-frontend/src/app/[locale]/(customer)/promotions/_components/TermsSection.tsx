'use client';

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

const getTAndC = (t: TranslationFn) => [
    { title: t('tc1Title'), body: t('tc1Body') },
    { title: t('tc2Title'), body: t('tc2Body') },
    { title: t('tc3Title'), body: t('tc3Body') },
];

export default function TermsSection({ t }: { t: TranslationFn }) {
    const items = getTAndC(t);

    return (
        <section className="bg-[#f5f8ff] px-6 py-20 md:px-10 md:py-24">
            <div className="mx-auto max-w-4xl">
                <div className="mb-10 text-center">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                        {t('offerClarity')}
                    </span>
                    <h2 className="mt-5 font-headline text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
                        {t('termsConditions')}
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                        {t('termsIntro')}
                    </p>
                </div>

                <div className="space-y-4">
                    {items.map((item, idx) => (
                        <details
                            key={idx}
                            className="group overflow-hidden rounded-2xl border border-primary/10 bg-white shadow-sm shadow-primary/5 transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/10 motion-reduce:transform-none"
                        >
                            <summary className="flex cursor-pointer list-none items-center gap-4 p-5 font-headline text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 md:p-6">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary transition-[transform,background-color,color] duration-300 group-open:scale-95 group-open:bg-primary group-open:text-white">
                                    {String(idx + 1).padStart(2, '0')}
                                </span>
                                <span className="min-w-0 flex-1 text-left text-base font-extrabold md:text-lg">
                                    {item.title}
                                </span>
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-primary transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-180 group-open:bg-primary/10">
                                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                </span>
                            </summary>
                            <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:grid-rows-[1fr]">
                                <div className="overflow-hidden">
                                    <div className="px-5 pb-6 pl-[4.75rem] text-sm leading-7 text-slate-600 md:px-6 md:pb-7 md:pl-[5.5rem]">
                                        {item.body}
                                    </div>
                                </div>
                            </div>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
