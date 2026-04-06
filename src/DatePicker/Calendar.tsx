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
 * Рендер делегирует атомарным компонентам NavButton и DayButton. */
import React, { KeyboardEvent, useEffect, useId, useRef } from 'react';
import { DayButton } from './DayButton';
import { NavButton } from './NavButton';
import { useCalendarGrid } from './useCalendarGrid';
import { useFocusTrap } from './useFocusTrap';
import type { CalendarCell } from './types';
import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  endOfWeek,
  startOfWeek,
} from './utils/dateUtils';
import { getFirstDayOfWeek, getUiString } from './utils/intlUtils';
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
  /** Ref to the trigger button — excluded from click-outside detection to
   *  prevent the pointerdown→close race with the trigger's own click handler. */
  triggerRef: React.RefObject<HTMLButtonElement>;
  /** Extra class applied to the dialog root — used by the parent to drive
   *  enter/leave CSS animations without unmounting the component early. */
  dialogClassName?: string;
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
    triggerRef,
    dialogClassName,
  } = props;

  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);
  const monthChangedByNavRef = useRef(false);
  const [liveText, setLiveText] = React.useState('');
  const isMountRef = useRef(true);

  const i18n = {
    prevMonth: getUiString(locale, 'prevMonth'),
    nextMonth: getUiString(locale, 'nextMonth'),
  };

  useFocusTrap(dialogRef, true);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent): void {
      const target = e.target as Node;
      if (
        dialogRef.current &&
        !dialogRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        onClose(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose, triggerRef]);

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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={handleDialogKeyDown}
      className={[styles.dialog, dialogClassName].filter(Boolean).join(' ')}
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
                    onKeyDown={(e) => handleGridKeyDown(e, cell)}
                    onConfirm={onConfirm}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
