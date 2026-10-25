import type { Locale } from 'date-fns';
// Per-locale imports so Metro doesn't bundle every date-fns locale
import { enUS } from 'date-fns/locale/en-US';
import { tr } from 'date-fns/locale/tr';
import { ja } from 'date-fns/locale/ja';
import { ru } from 'date-fns/locale/ru';
import { de } from 'date-fns/locale/de';
import { ar } from 'date-fns/locale/ar';
import { es } from 'date-fns/locale/es';
import { pt } from 'date-fns/locale/pt';
import { id } from 'date-fns/locale/id';
import { hi } from 'date-fns/locale/hi';
import { fr } from 'date-fns/locale/fr';
import { it } from 'date-fns/locale/it';
import { pl } from 'date-fns/locale/pl';
import { vi } from 'date-fns/locale/vi';
import { th } from 'date-fns/locale/th';

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, tr, ja, ru, de, ar, es, pt, id, hi, fr, it, pl, vi, th };

/** date-fns locale for an app language code (falls back to English). */
export const getDateFnsLocale = (language: string): Locale => DATE_FNS_LOCALES[language] || enUS;

/** Local calendar date as `YYYY-MM-DD` — a stable key that changes at local midnight. */
export const toLocalDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/** Unix-second bounds (inclusive) of the local day that contains `date`. */
export const getLocalDayBounds = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    return {
        start: Math.floor(start.getTime() / 1000),
        end: Math.floor(end.getTime() / 1000),
    };
};

export const getUtcOffsetString = (date: Date = new Date()): string => {
    const offset = date.getTimezoneOffset();
    if (offset === 0) return 'UTC';

    const sign = offset < 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;

    if (minutes === 0) {
        return `UTC${sign}${hours}`;
    }
    return `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`;
};
