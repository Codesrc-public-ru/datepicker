import React, { useState } from 'react';
import cn from 'classnames';

import { DatePicker } from './DatePicker';
import styles from './styles.module.css';

export function App(): React.ReactElement {
  const [value, setValue] = useState<Date | null>(new Date(2026, 0, 1));

  return (
    <div className={cn(styles.ibmPlexMonoRegular, styles.content)}>
        <DatePicker
          locale="ru-RU"
          value={value}
          onChange={(date) => setValue(date)}
          minDate={new Date(2020, 0, 1)}
          maxDate={new Date()}
          disabledDates={[new Date(2026,3,1)]}
        />
    </div>
  );
};