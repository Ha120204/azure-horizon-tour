import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default async function ArticleNotFound() {
    const t = await getTranslations('journal');

    return (
        <>
            <Header />
            <main className="min-h-screen bg-slate-50 pt-24">
                <div className="flex flex-col items-center justify-center py-40 text-slate-500">
                    <span className="material-symbols-outlined text-6xl mb-4">article</span>
                    <p className="text-xl font-semibold">{t('notFound')}</p>
                    <Link
                        href="/journal"
                        className="mt-6 text-primary font-bold hover:underline underline-offset-4 flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        {t('backToJournal')}
                    </Link>
                </div>
            </main>
            <Footer />
        </>
    );
}
