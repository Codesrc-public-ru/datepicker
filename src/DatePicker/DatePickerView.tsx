/**
 * Presentational Component — паттерн «Компонент-представление».
 *
 * Получает все данные и обработчики через props. Не содержит никакого
 * состояния и побочных эффектов — только JSX. Тестируется изолированно
 * без моков хуков или контекста.
 */
import React, { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react';
import cn from 'classnames';
import { Calendar } from './Calendar';
import type { CalendarProps } from './Calendar';
import styles from './DatePicker.module.css';
import calStyles from './Calendar.module.css';
import globalStyles from '../styles.module.css';

const CLOSE_DURATION_MS = 150;

export interface DatePickerViewProps {
  // IDs
  inputId: string;
  hintId: string;

  // Localised text
  dateLabel: string;
  formatHint: string;
  triggerAriaLabel: string;

  // Refs
  inputRef: RefObject<HTMLInputElement>;
  triggerRef: RefObject<HTMLButtonElement>;

  // Input
  inputValue: string;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onInputBlur: () => void;

  // Trigger toggle
  isOpen: boolean;
  onTriggerClick: () => void;

  // Calendar — present only when isOpen
  calendarProps?: CalendarProps;
}

export function DatePickerView({
  inputId,
  hintId,
  dateLabel,
  formatHint,
  triggerAriaLabel,
  inputRef,
  triggerRef,
  inputValue,
  onInputChange,
  onInputBlur,
  isOpen,
  onTriggerClick,
  calendarProps,
}: DatePickerViewProps): React.ReactElement {
  // Keep Calendar mounted during the closing animation.
  // `visible` = CSS class that plays fadeIn; once isOpen flips to false we
  // switch to the fadeOut class and remove from DOM after the transition ends.
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(isOpen);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Cancel any in-progress close animation.
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setMounted(true);
      // One rAF so the element is in the DOM before we add the visible class.
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      closeTimerRef.current = setTimeout(() => {
        setMounted(false);
        closeTimerRef.current = null;
      }, CLOSE_DURATION_MS);
    }
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    };
  }, [isOpen]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {dateLabel}
        </label>
        <span id={hintId} className={styles.hint}>
          {formatHint}
        </span>
      </div>
      <div className={styles.inputRow}>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          inputMode="text"
          value={inputValue}
          onChange={onInputChange}
          onBlur={onInputBlur}
          aria-describedby={hintId}
          autoComplete="off"
          className={cn(styles.input, globalStyles.ibmPlexMonoRegular)}
        />

        <button
          ref={triggerRef}
          type="button"
          aria-label={triggerAriaLabel}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={onTriggerClick}
          className={styles.triggerButton}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM2 2a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1H2zm13 3H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5z" />
          </svg>
        </button>
      </div>
      {mounted && calendarProps && (
        <Calendar
          {...calendarProps}
          dialogClassName={visible ? calStyles.dialogVisible : calStyles.dialogHidden}
        />
      )}
    </div>
  );
}
