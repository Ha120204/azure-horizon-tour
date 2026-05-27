import {getRequestConfig} from 'next-intl/server';
import {routing} from '@/i18n/routing';

type AppLocale = (typeof routing.locales)[number];

function isAppLocale(locale: string): locale is AppLocale {
  return routing.locales.includes(locale as AppLocale);
}

export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;
 
  // Ensure that a valid locale is used
  if (!locale || !isAppLocale(locale)) {
    locale = routing.defaultLocale;
  }
 
  const [common, home, auth, profile, checkout, tour, content] = await Promise.all([
    import(`../../messages/${locale}/common.json`),
    import(`../../messages/${locale}/home.json`),
    import(`../../messages/${locale}/auth.json`),
    import(`../../messages/${locale}/profile.json`),
    import(`../../messages/${locale}/checkout.json`),
    import(`../../messages/${locale}/tour.json`),
    import(`../../messages/${locale}/content.json`),
  ]);

  return {
    locale,
    messages: {
      ...common.default,
      ...home.default,
      ...auth.default,
      ...profile.default,
      ...checkout.default,
      ...tour.default,
      ...content.default,
    }
  };
});
