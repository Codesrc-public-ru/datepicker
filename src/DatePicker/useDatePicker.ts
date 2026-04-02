import {
  ChangeEvent,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { DatePickerProps } from './types';
import {
  addMonths,
  clampDate,
  isPrevMonthDisabled as calcPrevDisabled,
  isNextMonthDisabled as calcNextDisabled,
  toMidnight,
} from './utils/dateUtils';
import {
  applyDateMask,
  formatShortDate,
  formatTriggerAriaLabel,
  getDateSeparator,
  getFirstDayOfWeek,
  parseShortDate,
} from './utils/intlUtils';

export interface UseDatePickerReturn {
  selectedDate: Date | undefined;
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: (commit: boolean) => void;

  viewYear: number;
  viewMonth: number;
  navigatePrevMonth: () => void;
  navigateNextMonth: () => void;
  navigatePrevYear: () => void;
  navigateNextYear: () => void;

  focusedDate: Date;
  /** Update the roving-tabindex target.  Auto-syncs the view month. */
  updateFocusedDate: (date: Date) => void;

  confirmDate: (date: Date) => void;

  triggerRef: RefObject<HTMLButtonElement>;
  inputRef: RefObject<HTMLInputElement>;

  inputValue: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleInputBlur: () => void;

  isPrevMonthDisabled: boolean;
  isNextMonthDisabled: boolean;

  triggerAriaLabel: string;

  /** firstDayOfWeek needed by Calendar for keyboard Home/End calculation */
  firstDayOfWeek: 0 | 1;
}

export function useDatePicker(props: DatePickerProps): UseDatePickerReturn {
  const {
    value,
    onChange,
    minDate,
    maxDate,
    locale = 'en-US',
  } = props;

  const today = useMemo(() => toMidnight(new Date()), []);

  // ─── Stable refs ────────────────────────────────────────────────────────────
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Always reflects the latest inputValue without being a closure dependency.
  // Prevents handleInputBlur from reading a stale value when the blur fires
  // in the same tick as the last onChange (before React re-renders).
  const inputValueRef = useRef('');

  // ─── Core state ─────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);

  const [viewYear, setViewYear] = useState(
    () => (value ?? today).getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    () => (value ?? today).getMonth(),
  );
  const [focusedDate, _setFocusedDate] = useState<Date>(
    () => toMidnight(value ?? today),
  );
  const [inputValue, setInputValue] = useState(
    () => (value ? formatShortDate(value, locale) : ''),
  );
  // Keep ref in sync so handleInputBlur always reads the latest value.
  inputValueRef.current = inputValue;

  // Track the "pending" date while the dialog is open (separate from the
  // committed `value` prop so Escape can discard changes).
  const [pendingDate, setPendingDate] = useState<Date | undefined>(
    () => (value ? toMidnight(value) : undefined),
  );

  // ─── Sync when controlled `value` changes ──────────────────────────────────
  // Use the numeric timestamp as the effect dependency so that a parent
  // passing `new Date(sameTimestamp)` on every render does NOT re-run the
  // effect and overwrite what the user typed in the input.
  const valueTime = value ? toMidnight(value).getTime() : null;
  useEffect(() => {
    if (valueTime !== null) {
      const v = new Date(valueTime);
      setInputValue(formatShortDate(v, locale));
      _setFocusedDate(v);
      setViewYear(v.getFullYear());
      setViewMonth(v.getMonth());
      setPendingDate(v);
    } else {
      setInputValue('');
      setPendingDate(undefined);
    }
  }, [valueTime, locale]);

  // ─── Return focus to trigger after dialog closes ────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      // Use a microtask so that the Calendar has unmounted first.
      Promise.resolve().then(() => triggerRef.current?.focus());
    }
  }, [isOpen]);

  // ─── Navigation helpers ──────────────────────────────────────────────────────

  const setView = useCallback((year: number, month: number) => {
    setViewYear(year);
    setViewMonth(month);
  }, []);

  const navigatePrevMonth = useCallback(() => {
    const prev = addMonths(new Date(viewYear, viewMonth, 1), -1);
    setView(prev.getFullYear(), prev.getMonth());
  }, [viewYear, viewMonth, setView]);

  const navigateNextMonth = useCallback(() => {
    const next = addMonths(new Date(viewYear, viewMonth, 1), 1);
    setView(next.getFullYear(), next.getMonth());
  }, [viewYear, viewMonth, setView]);

  const navigatePrevYear = useCallback(() => {
    setView(viewYear - 1, viewMonth);
  }, [viewYear, viewMonth, setView]);

  const navigateNextYear = useCallback(() => {
    setView(viewYear + 1, viewMonth);
  }, [viewYear, viewMonth, setView]);

  // ─── Roving tabindex target ──────────────────────────────────────────────────

  const updateFocusedDate = useCallback(
    (date: Date) => {
      const clamped = clampDate(date, minDate, maxDate);
      _setFocusedDate(clamped);
      // Sync the view when the focused date crosses a month boundary.
      if (
        clamped.getMonth() !== viewMonth ||
        clamped.getFullYear() !== viewYear
      ) {
        setView(clamped.getFullYear(), clamped.getMonth());
      }
    },
    [minDate, maxDate, viewMonth, viewYear, setView],
  );

  // ─── Open / close ────────────────────────────────────────────────────────────

  const openDialog = useCallback(() => {
    // Show the value's actual month WITHOUT clamping, so an out-of-range
    // programmatic value shows that month with disabled cells instead of
    // jumping to the nearest valid month.
    const base = value ? toMidnight(value) : toMidnight(today);
    _setFocusedDate(base);
    // Use the raw state setters (not the setView callback) to guarantee
    // no stale-closure skew between focusedDate and the view.
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setPendingDate(value ? base : undefined);
    setIsOpen(true);
  }, [value, today, setViewYear, setViewMonth]);

  const closeDialogStable = useCallback(
    (commit: boolean) => {
      setIsOpen(false);
      if (commit && pendingDate) {
        onChange(pendingDate);
        setInputValue(formatShortDate(pendingDate, locale));
      }
    },
    [pendingDate, onChange, locale],
  );

  const confirmDate = useCallback(
    (date: Date) => {
      const d = toMidnight(date);
      setPendingDate(d);
      setIsOpen(false);
      onChange(d);
      setInputValue(formatShortDate(d, locale));
    },
    [onChange, locale],
  );

  // ─── Text input ──────────────────────────────────────────────────────────────

  const sep = useMemo(() => getDateSeparator(locale), [locale]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // When the user is deleting (raw is shorter than current value), pass
      // through unchanged so backspace doesn't fight the mask.
      const prev = inputValueRef.current;
      const masked =
        raw.length < prev.length ? raw : applyDateMask(raw, sep);
      setInputValue(masked);
    },
    [sep],
  );

  const handleInputBlur = useCallback(() => {
    const trimmed = inputValueRef.current.trim();

    // Empty input → clear the date.
    if (trimmed === '') {
      onChange(null);
      setInputValue('');
      return;
    }

    const parsed = parseShortDate(trimmed, locale);
    if (parsed) {
      const clamped = clampDate(parsed, minDate, maxDate);
      onChange(clamped);
      setInputValue(formatShortDate(clamped, locale));
      _setFocusedDate(clamped);
      setViewYear(clamped.getFullYear());
      setViewMonth(clamped.getMonth());
    } else {
      // Unparseable input — revert to last known good value.
      setInputValue(value ? formatShortDate(value, locale) : '');
    }
  }, [locale, minDate, maxDate, onChange, value, setViewYear, setViewMonth]);

  // ─── Derived values ──────────────────────────────────────────────────────────

  const prevDisabled = calcPrevDisabled(viewYear, viewMonth, minDate);
  const nextDisabled = calcNextDisabled(viewYear, viewMonth, maxDate);

  const triggerAriaLabel = useMemo(
    () => formatTriggerAriaLabel(value, locale),
    [value, locale],
  );

  const firstDayOfWeek = useMemo(() => getFirstDayOfWeek(locale), [locale]);

  return {
    selectedDate: value ?? undefined,
    isOpen,
    openDialog,
    closeDialog: closeDialogStable,

    viewYear,
    viewMonth,
    navigatePrevMonth,
    navigateNextMonth,
    navigatePrevYear,
    navigateNextYear,

    focusedDate,
    updateFocusedDate,

    confirmDate,

    triggerRef,
    inputRef,

    inputValue,
    handleInputChange,
    handleInputBlur,

    isPrevMonthDisabled: prevDisabled,
    isNextMonthDisabled: nextDisabled,

    triggerAriaLabel,
    firstDayOfWeek,
  };
}
