/**
 * Container Component — паттерн «Компонент-контейнер».
 *
 * Отвечает за всю нетривиальную логику диалога:
 *  - управление фокусом (mount → dialog → grid cell)
 *  - live-регион для объявления смены месяца скринридером
 *  - закрытие по клику вне области
 *  - обработка клавиатуры (Event Switch)
 *  - вычисление данных грида через useCalendarGrid
 *
 * Рендер делегирует атомарным компонентам NavButton и DayButton.
 */
import React, {
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
} from 'react';
import { useCalendarGrid } from './useCalendarGrid';
import { useFocusTrap } from './useFocusTrap';
import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  endOfWeek,
  startOfWeek,
} from './utils/dateUtils';
import { getFirstDayOfWeek, getUiString } from './utils/intlUtils';
import { NavButton } from './NavButton';
import { DayButton } from './DayButton';
import type { CalendarCell } from './types';
import styles from './Calendar.module.css';

export interface CalendarProps {
  viewYear: number;
  viewMonth: number;
  selectedDate: Date | undefined;
  focusedDate: Date;
  locale: string;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  isPrevMonthDisabled: boolean;
  isNextMonthDisabled: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onFocusedDateChange: (date: Date) => void;
  onConfirm: (date: Date) => void;
  onClose: (commit: boolean) => void;
}

export function Calendar(props: CalendarProps): React.ReactElement {
  const {
    viewYear,
    viewMonth,
    selectedDate,
    focusedDate,
    locale,
    minDate,
    maxDate,
    disabledDates,
    isPrevMonthDisabled,
    isNextMonthDisabled,
    onPrevMonth,
    onNextMonth,
    onFocusedDateChange,
    onConfirm,
    onClose,
  } = props;

  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);
  const monthChangedByNavRef = useRef(false);
  const [liveText, setLiveText] = React.useState('');

  const i18n = {
    prevMonth: getUiString(locale, 'prevMonth'),
    nextMonth: getUiString(locale, 'nextMonth'),
    ok: getUiString(locale, 'ok'),
    cancel: getUiString(locale, 'cancel'),
    unavailable: getUiString(locale, 'unavailable'),
  };

  useFocusTrap(dialogRef, true);

  // Закрытие по клику вне диалога.
  useEffect(() => {
    function handlePointerDown(e: PointerEvent): void {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose]);

  // Управление фокусом:
  //   mount  → сначала на диалог (AT объявляет «dialog: [месяц год]»),
  //            затем requestAnimationFrame → на кнопку ячейки.
  //   далее  → на кнопку сразу при смене focusedDate.
  const isMountRef = useRef(true);

  useEffect(() => {
    if (isMountRef.current) {
      isMountRef.current = false;
      dialogRef.current?.focus();
      requestAnimationFrame(() => {
        tbodyRef.current
          ?.querySelector<HTMLElement>('button[tabindex="0"]')
          ?.focus();
      });
      return;
    }
    tbodyRef.current
      ?.querySelector<HTMLElement>('button[tabindex="0"]')
      ?.focus();
  }, [focusedDate]);

  const gridData = useCalendarGrid({
    viewYear,
    viewMonth,
    selectedDate,
    focusedDate,
    locale,
    minDate,
    maxDate,
    disabledDates,
  });

  // Live-регион срабатывает только при клике на кнопки навигации,
  // но не при переходе через границу месяца стрелкой клавиатуры.
  useEffect(() => {
    if (monthChangedByNavRef.current) {
      monthChangedByNavRef.current = false;
      setLiveText(gridData.monthYearLabel);
    }
  }, [gridData.monthYearLabel]);

  const firstDayOfWeek = getFirstDayOfWeek(locale);

  // ─── Event Switch — клавиатурная навигация грида ──────────────────────────
  function handleGridKeyDown(
    e: KeyboardEvent<HTMLButtonElement>,
    cell: CalendarCell,
  ): void {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose(false);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onFocusedDateChange(clampDate(addDays(focusedDate, -1), minDate, maxDate));
        break;
      case 'ArrowRight':
        e.preventDefault();
        onFocusedDateChange(clampDate(addDays(focusedDate, 1), minDate, maxDate));
        break;
      case 'ArrowUp':
        e.preventDefault();
        onFocusedDateChange(clampDate(addDays(focusedDate, -7), minDate, maxDate));
        break;
      case 'ArrowDown':
        e.preventDefault();
        onFocusedDateChange(clampDate(addDays(focusedDate, 7), minDate, maxDate));
        break;
      case 'Home':
        e.preventDefault();
        onFocusedDateChange(
          clampDate(startOfWeek(focusedDate, firstDayOfWeek), minDate, maxDate),
        );
        break;
      case 'End':
        e.preventDefault();
        onFocusedDateChange(
          clampDate(endOfWeek(focusedDate, firstDayOfWeek), minDate, maxDate),
        );
        break;
      case 'PageUp':
        e.preventDefault();
        onFocusedDateChange(
          clampDate(
            e.shiftKey ? addYears(focusedDate, -1) : addMonths(focusedDate, -1),
            minDate,
            maxDate,
          ),
        );
        break;
      case 'PageDown':
        e.preventDefault();
        onFocusedDateChange(
          clampDate(
            e.shiftKey ? addYears(focusedDate, 1) : addMonths(focusedDate, 1),
            minDate,
            maxDate,
          ),
        );
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!cell.isDisabled) onConfirm(cell.date);
        break;
      default:
        break;
    }
  }

  function handleDialogKeyDown(e: KeyboardEvent<HTMLElement>): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose(false);
    }
  }

  function handlePrevMonth(): void {
    monthChangedByNavRef.current = true;
    onPrevMonth();
  }

  function handleNextMonth(): void {
    monthChangedByNavRef.current = true;
    onNextMonth();
  }

  const focusedCellDisabled =
    gridData.rows.flat().find((c) => c.isFocused)?.isDisabled ?? false;

  function handleOk(): void {
    if (!focusedCellDisabled) onConfirm(focusedDate);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
      className={styles.dialog}
    >
      {/* Скрытый assertive live-регион: объявляет смену месяца только
          при клике на кнопки навигации. */}
      <span role="status" aria-live="assertive" aria-atomic="true" className={styles.srOnly}>
        {liveText}
      </span>

      <div className={styles.header}>
        <NavButton
          direction="prev"
          label={i18n.prevMonth}
          disabled={isPrevMonthDisabled}
          onClick={handlePrevMonth}
        />

        <h2 id={titleId} className={styles.monthYearHeading}>
          {gridData.monthYearLabel}
        </h2>

        <NavButton
          direction="next"
          label={i18n.nextMonth}
          disabled={isNextMonthDisabled}
          onClick={handleNextMonth}
        />
      </div>

      <table role="grid" aria-labelledby={titleId} className={styles.table}>
        <thead>
          <tr>
            {gridData.weekdayHeaders.map((h) => (
              <th key={h.dayIndex} scope="col" abbr={h.long} className={styles.th}>
                {h.narrow}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={tbodyRef}>
          {/* Array as Children — паттерн «Массив как дочерние элементы» */}
          {gridData.rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell) => (
                <td
                  key={cell.date.toISOString()}
                  role="gridcell"
                  aria-selected={cell.isSelected}
                  aria-disabled={cell.isDisabled ? true : undefined}
                  aria-current={cell.isToday ? 'date' : undefined}
                  className={[
                    styles.td,
                    !cell.isCurrentMonth && styles.tdOutside,
                  ].filter(Boolean).join(' ')}
                >
                  <DayButton
                    cell={cell}
                    unavailableLabel={i18n.unavailable}
                    onKeyDown={(e) => handleGridKeyDown(e, cell)}
                    onConfirm={onConfirm}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.footer}>
        <button
          type="button"
          onClick={handleOk}
          disabled={focusedCellDisabled}
          className={styles.okButton}
        >
          {i18n.ok}
        </button>
        <button
          type="button"
          onClick={() => onClose(false)}
          className={styles.cancelButton}
        >
          {i18n.cancel}
        </button>
      </div>
    </div>
  );
}
