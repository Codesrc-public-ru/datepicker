/**
 * Proxy Component — паттерн «Прокси-компонент».
 *
 * Фиксирует обязательные атрибуты кнопки навигации по месяцу
 * (type, aria-label, disabled) и делегирует остальное потребителю.
 * Потребитель не обязан помнить про type="button" или aria-label.
 */
import React from 'react';
import styles from './Calendar.module.css';

const PREV_PATH =
  'M10.354 3.646a.5.5 0 0 1 0 .708L6.707 8l3.647 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0z';
const NEXT_PATH =
  'M5.646 3.646a.5.5 0 0 0 0 .708L9.293 8 5.646 11.646a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708 0z';

interface NavButtonProps {
  direction: 'prev' | 'next';
  label: string;
  disabled: boolean;
  onClick: () => void;
}

export function NavButton({ direction, label, disabled, onClick }: NavButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={styles.navButton}
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d={direction === 'prev' ? PREV_PATH : NEXT_PATH} />
      </svg>
    </button>
  );
}
