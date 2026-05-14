import { redirect } from '@/i18n/routing';

export default async function SupportPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    redirect({ href: '/support/track', locale });
}
