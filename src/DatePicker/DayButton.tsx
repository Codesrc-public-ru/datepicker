/**
 * Style Component — паттерн «Компонент-стиль».
 *
 * Инкапсулирует всю визуальную логику ячейки дня: вычисление CSS-классов,
 * aria-атрибуты и aria-label с локализованной пометкой «недоступно».
 * Родительский компонент передаёт только данные и обработчики —
 * и не знает ни про CSS-классы, ни про структуру aria-label.
 */
import React, { KeyboardEvent } from 'react';
import type { CalendarCell } from './types';
import styles from './Calendar.module.css';

interface DayButtonProps {
  cell: CalendarCell;
  unavailableLabel: string;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  onConfirm: (date: Date) => void;
}

export function DayButton({ cell, unavailableLabel, onKeyDown, onConfirm }: DayButtonProps): React.ReactElement {
  const className = [
    styles.dayButton,
    cell.isToday && styles.dayButtonToday,
    cell.isSelected && styles.dayButtonSelected,
    cell.isDisabled && styles.dayButtonDisabled,
  ]
    .filter(Boolean)
    .join(' ');

  const ariaLabel = cell.isDisabled
    ? `${cell.ariaLabel}, ${unavailableLabel}`
    : cell.ariaLabel;

  return (
    <button
      type="button"
      tabIndex={cell.isFocused ? 0 : -1}
      aria-disabled={cell.isDisabled ? true : undefined}
      aria-label={ariaLabel}
      data-date={cell.date.toISOString()}
      onKeyDown={onKeyDown}
      onClick={() => !cell.isDisabled && onConfirm(cell.date)}
      className={className}
    >
      {cell.date.getDate()}
    </button>
  );
}
