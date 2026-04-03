import { useMemo } from 'react';
import type { CalendarCell, CalendarGridData } from './types';
import {
  buildCalendarGrid,
  isDateDisabled,
  isSameDay,
  isToday,
} from './utils/dateUtils';
import {
  formatFullDate,
  formatMonthYear,
  getFirstDayOfWeek,
  getUiString,
  getWeekdayHeaders,
} from './utils/intlUtils';

interface UseCalendarGridParams {
  viewYear: number;
  viewMonth: number; // 0-indexed
  selectedDate: Date | undefined;
  /** The date that currently holds tabIndex=0 (roving tabindex target). */
  focusedDate: Date;
  locale: string;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
}

/**
 * Pure-computation hook.
 * Returns fully annotated CalendarGridData — ready to render with no further
 * logic in the component. All heavy work is memoised.
 */
export function useCalendarGrid(params: UseCalendarGridParams): CalendarGridData {
  const {
    viewYear,
    viewMonth,
    selectedDate,
    focusedDate,
    locale,
    minDate,
    maxDate,
    disabledDates,
  } = params;

  const firstDayOfWeek = useMemo(
    () => getFirstDayOfWeek(locale),
    [locale],
  );

  const weekdayHeaders = useMemo(
    () => getWeekdayHeaders(locale),
    [locale],
  );

  const monthYearLabel = useMemo(
    () => formatMonthYear(new Date(viewYear, viewMonth), locale),
    [viewYear, viewMonth, locale],
  );

  const rows = useMemo(() => {
    const rawGrid = buildCalendarGrid(viewYear, viewMonth, firstDayOfWeek);

    return rawGrid.map((rawRow) =>
      rawRow.map((rawCell): CalendarCell => {
        const isSelected = selectedDate ? isSameDay(rawCell.date, selectedDate) : false;
        const isDisabled = isDateDisabled(rawCell.date, minDate, maxDate, disabledDates);
        const labelParts = [
          formatFullDate(rawCell.date, locale),
          isSelected ? getUiString(locale, 'selected') : null,
          isDisabled ? getUiString(locale, 'unavailable') : null,
        ].filter(Boolean);

        return {
          date: rawCell.date,
          isCurrentMonth: rawCell.isCurrentMonth,
          isToday: isToday(rawCell.date),
          isSelected,
          isDisabled,
          isFocused: isSameDay(rawCell.date, focusedDate),
          ariaLabel: labelParts.join(', '),
        };
      }),
    );
  }, [
    viewYear,
    viewMonth,
    firstDayOfWeek,
    selectedDate,
    focusedDate,
    locale,
    minDate,
    maxDate,
    disabledDates,
  ]);

  return { rows, weekdayHeaders, monthYearLabel };
}
