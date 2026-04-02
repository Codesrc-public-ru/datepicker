import React, { useState } from 'react';
import { DatePicker } from './DatePicker';

export function App(): React.ReactElement {
  const [value, setValue] = useState<Date | null>(new Date());

  return (
    <DatePicker
      locale="ru-RU"
      value={value}
      onChange={(date) => setValue(date)}
      minDate={new Date(2020, 0, 1)}
      maxDate={new Date()}
    />
  );
};