/**
 * Container Component — паттерн «Компонент-контейнер».
 *
 * Единственная ответственность — получить данные из useDatePicker
 * и сформировать props для DatePickerView. Не содержит JSX-разметки
 * с визуальными деталями.
 */
import React, { useMemo, useId, useCallback } from 'react';
import type { DatePickerProps } from './types';
import { useDatePicker } from './useDatePicker';
import { DatePickerView } from './DatePickerView';
import { getFormatHint, getUiString } from './utils/intlUtils';

export function DatePicker(props: DatePickerProps): React.ReactElement {
  const locale = props.locale ?? 'en-US';

  const uid = useId();
  const inputId = `${uid}-input`;
  const hintId = `${uid}-hint`;

  const state = useDatePicker({ ...props, locale });

  const formatHint = useMemo(() => getFormatHint(locale), [locale]);
  const dateLabel = useMemo(() => getUiString(locale, 'dateLabel'), [locale]);

  const onTriggerClick = useCallback(() => {
    state.isOpen ? state.closeDialog(false) : state.openDialog();
  }, [state]);

  return (
    <DatePickerView
      inputId={inputId}
      hintId={hintId}
      dateLabel={dateLabel}
      formatHint={formatHint}
      triggerAriaLabel={state.triggerAriaLabel}
      inputRef={state.inputRef}
      triggerRef={state.triggerRef}
      inputValue={state.inputValue}
      onInputChange={state.handleInputChange}
      onInputBlur={state.handleInputBlur}
      isOpen={state.isOpen}
      onTriggerClick={onTriggerClick}
      calendarProps={state.isOpen ? {
        viewYear: state.viewYear,
        viewMonth: state.viewMonth,
        selectedDate: state.selectedDate,
        focusedDate: state.focusedDate,
        locale,
        minDate: props.minDate,
        maxDate: props.maxDate,
        disabledDates: props.disabledDates,
        isPrevMonthDisabled: state.isPrevMonthDisabled,
        isNextMonthDisabled: state.isNextMonthDisabled,
        onPrevMonth: state.navigatePrevMonth,
        onNextMonth: state.navigateNextMonth,
        onFocusedDateChange: state.updateFocusedDate,
        onConfirm: state.confirmDate,
        onClose: state.closeDialog,
      } : undefined}
    />
  );
}
