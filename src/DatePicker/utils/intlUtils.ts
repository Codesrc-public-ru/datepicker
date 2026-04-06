/**
 * Locale-sensitive formatting helpers.
 * Every function accepts a BCP 47 locale string and uses native Intl APIs.
 * Falls back gracefully on engines that lack newer Intl features.
 */

import type { WeekdayHeader } from '../types';

// ─── Week start day ──────────────────────────────────────────────────────────

/**
 * Returns 0 (Sunday) or 1 (Monday) for the locale's first day of week.
 * Uses Intl.Locale getWeekInfo() / weekInfo with fallback to Monday.
 */
export function getFirstDayOfWeek(locale: string): 0 | 1 {
  try {
    const loc = new Intl.Locale(locale);
    // Modern: getWeekInfo() method
    type LocaleWithWeekInfo = typeof loc & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const extended = loc as LocaleWithWeekInfo;
    const firstDay =
      extended.getWeekInfo?.().firstDay ?? extended.weekInfo?.firstDay;
    if (firstDay !== undefined) {
      // ISO: 7 = Sunday, 1 = Monday
      return firstDay === 7 ? 0 : 1;
    }
  } catch {
    // ignore
  }
  // Safe international default: Monday
  return 1;
}

// ─── Column headers ──────────────────────────────────────────────────────────

/**
 * Returns 7 WeekdayHeader objects ordered so the first entry matches the
 * locale's first day of week.
 *
 * Reference Sunday: 2025-01-05 (a known Sunday in local time).
 */
export function getWeekdayHeaders(locale: string): WeekdayHeader[] {
  const firstDow = getFirstDayOfWeek(locale);

  const formatters = {
    short: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    narrow: new Intl.DateTimeFormat(locale, { weekday: 'narrow' }),
    long: new Intl.DateTimeFormat(locale, { weekday: 'long' }),
  };

  // Build raw array indexed by absolute day (0 = Sun)
  const all: WeekdayHeader[] = [];
  for (let i = 0; i < 7; i++) {
    // 2025-01-05 is Sunday; adding i gives Mon through Sat
    const refDate = new Date(2025, 0, 5 + i);
    all.push({
      dayIndex: refDate.getDay(),
      short: formatters.short.format(refDate),
      narrow: formatters.narrow.format(refDate),
      long: formatters.long.format(refDate),
    });
  }

  // Rotate so that firstDow comes first
  const offset = firstDow; // 0 = Sun already first; 1 = Mon needs rotation
  return [...all.slice(firstDow), ...all.slice(0, firstDow)];
}

// ─── Date formatting ─────────────────────────────────────────────────────────

/** "March 2025" / "март 2025 г." */
export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Full date string for td aria-label.
 * e.g. "Saturday, March 15, 2025" / "суббота, 15 марта 2025 г."
 */
export function formatFullDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Short display format for the text input.
 * e.g. "03/15/2025" (en-US) / "15.03.2025" (ru-RU)
 */
export function formatShortDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// ─── Format hint ─────────────────────────────────────────────────────────────

/**
 * Returns a placeholder pattern string derived from the locale's short format.
 * e.g. "MM/DD/YYYY" for en-US, "DD.MM.YYYY" for ru-RU.
 */
export function getFormatHint(locale: string): string {
  const knownDate = new Date(2001, 2, 4); // 04 Mar 2001 — day & month are unambiguous
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(knownDate);
  type DateFormatPart = 'year' | 'month' | 'day';
  const partsNames: Record<DateFormatPart, string> = locale === 'ru-RU' ? {
    year: 'ГГГГ',
    month: 'ММ',
    day: 'ДД',
  } : {
    year: 'YYYY',
    month: 'MM',
    day: 'DD',
  };
  const isDatePart = (type: string): type is DateFormatPart => [
    'year',
    'month',
    'day',
  ].includes(type);

  return parts
    .map((p) => isDatePart(p.type) ? partsNames[p.type] : p.value)
    .join('');
}

// ─── Input parsing ────────────────────────────────────────────────────────────

/**
 * Parse a user-typed string that matches the locale's short date format.
 * Returns a Date at local midnight or null if the string is invalid.
 */
export function parseShortDate(str: string, locale: string): Date | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Determine field order + separator from a known date.
  const knownDate = new Date(2001, 2, 4);
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(knownDate);

  // Collect literal separators and field order
  const fields: Array<'year' | 'month' | 'day'> = [];
  const separators: string[] = [];

  for (const p of parts) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day') {
      fields.push(p.type);
    } else if (p.type === 'literal') {
      separators.push(p.value.replace(/\s+/g, '\\s*'));
    }
  }

  if (fields.length !== 3) return null;

  // Build a regex: 3 numeric groups separated by the locale's separators.
  const sep0 = separators[0] ?? '[./-]';
  const sep1 = separators[1] ?? '[./-]';
  const pattern = new RegExp(
    `^(\\d{1,4})${sep0}(\\d{1,2})${sep1}(\\d{1,4})$`,
  );
  const match = trimmed.match(pattern);
  if (!match) return null;

  const g1 = parseInt(match[1]!, 10);
  const g2 = parseInt(match[2]!, 10);
  const g3 = parseInt(match[3]!, 10);

  const vals: Record<'year' | 'month' | 'day', number> = {
    year: 0,
    month: 0,
    day: 0,
  };
  vals[fields[0]!] = g1;
  vals[fields[1]!] = g2;
  vals[fields[2]!] = g3;

  const { year, month, day } = vals;
  if (year < 1000 || year > 9999) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  // Guard against rollovers (e.g. Feb 30 → Mar 2)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

// ─── Input mask helpers ───────────────────────────────────────────────────────

/**
 * Returns the literal separator character used in the locale's short date
 * format (e.g. "." for ru-RU/de-DE, "/" for en-US/fr-FR).
 */
export function getDateSeparator(locale: string): string {
  const knownDate = new Date(2001, 2, 4);
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(knownDate);
  return parts.find((p) => p.type === 'literal')?.value ?? '.';
}

/**
 * Applies an auto-formatting mask to a raw input value.
 * Strips all non-digits, keeps at most 8, then inserts `sep` after positions 2 and 4.
 * Works uniformly for DD.MM.YYYY and MM/DD/YYYY layouts.
 */
export function applyDateMask(raw: string, sep: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}${sep}${digits.slice(2)}`;
  return `${digits.slice(0, 2)}${sep}${digits.slice(2, 4)}${sep}${digits.slice(4)}`;
}

// ─── Trigger aria-label ───────────────────────────────────────────────────────

/**
 * Returns the dynamic aria-label for the calendar trigger button.
 * e.g. "Choose date, current date is Saturday, March 15, 2025"
 *       "Выбрать дату" (when no date selected, locale ru-RU)
 */
export function formatTriggerAriaLabel(
  date: Date | null | undefined,
  locale: string,
): string {
  if (!date) return getUiString(locale, 'chooseDate');
  const formatted = formatFullDate(date, locale);
  return `${getUiString(locale, 'chooseDate')}, ${getUiString(locale, 'currentDate')} ${formatted}`;
}

// ─── Locale-aware UI strings ──────────────────────────────────────────────────

type UiStringKey =
  | 'dateLabel'
  | 'chooseDate'
  | 'currentDate'
  | 'prevMonth'
  | 'nextMonth'
  | 'ok'
  | 'cancel'
  | 'selected'
  | 'unavailable';

/**
 * Returns a localised UI string for the given key.
 * Falls back to English when the locale is not in the built-in table.
 *
 * Extend this map to support additional languages.
 */
export function getUiString(locale: string, key: UiStringKey): string {
  const lang = locale.split('-')[0]?.toLowerCase() ?? 'en';
  const strings: Record<string, Record<UiStringKey, string>> = {
    en: {
      dateLabel: 'Date',
      chooseDate: 'Choose date',
      currentDate: 'current date is',
      prevMonth: 'Previous month',
      nextMonth: 'Next month',
      ok: 'OK',
      cancel: 'Cancel',
      selected: 'selected',
      unavailable: 'unavailable',
    },
    ru: {
      dateLabel: 'Дата',
      chooseDate: 'Выбрать дату',
      currentDate: 'текущая дата',
      prevMonth: 'Предыдущий месяц',
      nextMonth: 'Следующий месяц',
      ok: 'ОК',
      cancel: 'Отмена',
      selected: 'выбрано',
      unavailable: 'недоступно',
    },
    de: {
      dateLabel: 'Datum',
      chooseDate: 'Datum auswählen',
      currentDate: 'aktuelles Datum',
      prevMonth: 'Vorheriger Monat',
      nextMonth: 'Nächster Monat',
      ok: 'OK',
      cancel: 'Abbrechen',
      selected: 'ausgewählt',
      unavailable: 'nicht verfügbar',
    },
    fr: {
      dateLabel: 'Date',
      chooseDate: 'Choisir une date',
      currentDate: 'date actuelle',
      prevMonth: 'Mois précédent',
      nextMonth: 'Mois suivant',
      ok: 'OK',
      cancel: 'Annuler',
      selected: 'sélectionnée',
      unavailable: 'indisponible',
    },
  };
  return (strings[lang] ?? strings['en']!)[key];
}
