'use client';

import { useLocale, Locale } from '@/app/i18n/LocaleProvider';

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  return (
    <select
      className="border rounded px-2 py-1 text-sm"
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      <option value="en">English</option>
      <option value="es">Español</option>
    </select>
  );
}
