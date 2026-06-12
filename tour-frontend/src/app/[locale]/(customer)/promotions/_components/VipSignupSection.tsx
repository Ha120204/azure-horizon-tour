'use client';

import { useSubscribe } from '@/hooks/useSubscribe';

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

export default function VipSignupSection({ t }: { t: TranslationFn }) {
    const { email, setEmail, status: subscribeStatus, handleSubscribe } = useSubscribe();

    const vipPerks = [t('vipPerk1'), t('vipPerk2'), t('vipPerk3')];

    return (
        <section className="relative overflow-hidden bg-[#08245c] px-6 py-20 md:px-10 md:py-24">
            <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
                <div>
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-100">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified</span>
                        VIP Access
                    </div>
                    <h2 className="max-w-xl font-headline text-4xl font-extrabold leading-[1.02] tracking-tight text-white md:text-5xl">{t('unlockVIP')}</h2>
                    <p className="mt-5 max-w-xl text-base leading-8 text-blue-100/85 md:text-lg">{t('unlockVIPDesc')}</p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                        {vipPerks.map((perk) => (
                            <div key={perk} className="flex items-center gap-2 rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/10">
                                <span className="material-symbols-outlined text-[18px] text-[#ffd8b5]" aria-hidden="true">check_circle</span>
                                <span>{perk}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute inset-x-8 -top-5 h-10 rounded-t-[2rem] bg-[#ffd8b5]" aria-hidden="true" />
                    <div className="relative rounded-[1.5rem] bg-white p-5 shadow-[0_18px_44px_rgba(3,18,45,0.28)] md:p-6">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Inner Circle</p>
                                <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                                    {t('innerCircleTitle')}
                                </p>
                            </div>
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <span className="material-symbols-outlined" aria-hidden="true">confirmation_number</span>
                            </div>
                        </div>
                        <form onSubmit={handleSubscribe} noValidate className="space-y-3">
                            <label htmlFor="vip-email" className="sr-only">{t('emailPlaceholder')}</label>
                            <div className="flex flex-col gap-3 lg:flex-row">
                            <input id="vip-email" disabled={subscribeStatus === 'loading'} className="min-h-14 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-semibold text-slate-900 outline-none transition-[background-color,border-color,box-shadow] placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10 disabled:opacity-50" placeholder={t('emailPlaceholder')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <button disabled={subscribeStatus === 'loading'} className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-sm font-extrabold text-white shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-primary-container hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none" type="submit">
                                {subscribeStatus === 'loading' ? <span className="material-symbols-outlined animate-spin text-[18px]" aria-hidden="true">progress_activity</span> : <>{t('subscribe')}<span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true">arrow_forward</span></>}
                            </button>
                            </div>
                        </form>
                        <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1.5">{t('noSpam')}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1.5">{t('unsubscribeAnytime')}</span>
                        </div>
                        <div aria-live="polite">
                        {subscribeStatus === 'success' && (
                            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 animate-fade-slide-up">
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
                                {t('welcomeAboard')}
                            </p>
                        )}
                        {subscribeStatus === 'exists' && (
                            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 animate-fade-slide-up">
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
                                {t('alreadySubscribed')}
                            </p>
                        )}
                        {subscribeStatus === 'error' && (
                            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 animate-fade-slide-up">
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
                                {t('subscribeError')}
                            </p>
                        )}
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </section>
    );
}
