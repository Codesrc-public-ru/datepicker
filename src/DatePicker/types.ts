export interface DatePickerProps {
  value?: Date | null;
  /** Called with null when the user clears the input. */
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  /** Caller should memoize this array to avoid unnecessary re-renders */
  disabledDates?: Date[];
  /** BCP 47 locale tag, e.g. 'en-US', 'ru-RU'. Defaults to 'en-US'. */
  locale?: string;
}

/** One cell in the calendar grid */
export interface CalendarCell {
  date: Date;
  /** false = overflow day from prev/next month */
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  /** true when date is outside [minDate, maxDate] or in disabledDates */
  isDisabled: boolean;
  /** true on the single cell that holds tabIndex=0 (roving tabindex) */
  isFocused: boolean;
  /** Full locale date string for screen reader aria-label */
  ariaLabel: string;
}

/** One row in the calendar grid — always exactly 7 cells */
export type CalendarRow = CalendarCell[];

export interface WeekdayHeader {
  /** 0 = Sun, 1 = Mon … 6 = Sat (absolute, not locale-rotated) */
  dayIndex: number;
  /** e.g. "Sun" / "пн" */
  short: string;
  /** e.g. "S" / "П" — used as visible cell content */
  narrow: string;
  /** e.g. "Sunday" / "понедельник" — used in <th abbr> */
  long: string;
}

/** Return type of useCalendarGrid */
export interface CalendarGridData {
  rows: CalendarRow[];
  weekdayHeaders: WeekdayHeader[];
  /** e.g. "March 2025" — rendered in <h2 aria-live="polite"> */
  monthYearLabel: string;
}
