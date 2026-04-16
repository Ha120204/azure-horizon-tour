'use client';

import { useLocale } from '@/app/context/LocaleContext';

export default function Footer() {
    const { t } = useLocale();

    return (
        <footer className="bg-slate-900 text-slate-100 pt-20 pb-12 px-8 mt-auto">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-20">
                    <div className="col-span-1 md:col-span-1">
                        <span className="text-2xl font-headline font-black tracking-tight mb-8 block">Azure Horizon</span>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            {t('footer.tagline')}
                        </p>
                    </div>
                    <div>
                        <h4 className="font-headline font-bold mb-6">{t('footer.discover')}</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a className="hover:text-white transition-colors" href="/destinations">{t('footer.destinations')}</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">{t('footer.experiences')}</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">{t('footer.groupTours')}</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">{t('footer.privateCharters')}</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-headline font-bold mb-6">{t('footer.support')}</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a className="hover:text-white transition-colors" href="#">{t('footer.travelInsurance')}</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">{t('footer.visaAssistance')}</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">{t('footer.contactConcierge')}</a></li>
                            <li><a className="hover:text-white transition-colors" href="#">{t('footer.faqs')}</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-headline font-bold mb-6">{t('footer.journal')}</h4>
                        <p className="text-sm text-slate-400 mb-4">{t('footer.journalDesc')}</p>
                        <div className="flex">
                            <input className="bg-white/10 border-none rounded-l-lg px-4 py-3 w-full text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary" placeholder={t('footer.emailPlaceholder')} type="email" />
                            <button className="bg-primary px-5 py-3 rounded-r-lg hover:bg-primary-container transition-colors">
                                <span className="material-symbols-outlined text-sm">send</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-xs text-slate-500">{t('footer.copyright')}</p>
                    <div className="flex gap-6">
                        <a className="text-slate-500 hover:text-white transition-colors" href="#"><span className="material-symbols-outlined text-lg">public</span></a>
                        <a className="text-slate-500 hover:text-white transition-colors" href="#"><span className="material-symbols-outlined text-lg">camera_alt</span></a>
                        <a className="text-slate-500 hover:text-white transition-colors" href="#"><span className="material-symbols-outlined text-lg">movie</span></a>
                    </div>
                </div>
            </div>
        </footer>
    );
}