# DatePicker

Полностью доступный компонент выбора даты на React + TypeScript, реализованный строго по паттерну [WAI-ARIA APG «Date Picker Dialog»](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/).

---

## Что это

`DatePicker` — управляемый компонент ввода даты. Состоит из текстового поля и всплывающего диалога с календарём. Пользователь может вводить дату вручную или выбрать её в сетке календаря.

Компонент не использует сторонних зависимостей: вся математика с датами — нативный `Date`, форматирование — `Intl`.

---

## Особенности

### Доступность (a11y)
- Полностью соответствует **WCAG 2.1/2.2 Level AA**.
- Диалог имеет `role="dialog"` и `aria-modal="true"` — экранный читатель объявляет контекст при открытии.
- Заголовок месяца связан с диалогом через `aria-labelledby`.
- Отдельный скрытый `aria-live="assertive"` регион объявляет смену месяца при навигации кнопками — не мешает объявлению ячеек при навигации стрелками.
- Каждая ячейка дня — `<button>` внутри `<td role="gridcell">` с полным `aria-label` (например, «суббота, 15 марта 2025 г., недоступно»).
- Недоступные даты: `aria-disabled="true"` + пометка в `aria-label`.
- Сегодняшняя дата: `aria-current="date"`.

### Клавиатурная навигация
| Клавиша | Действие |
|---|---|
| `←` / `→` | Предыдущий / следующий день |
| `↑` / `↓` | Та же дата неделей назад / вперёд |
| `Home` | Начало недели |
| `End` | Конец недели |
| `PageUp` | Предыдущий месяц |
| `PageDown` | Следующий месяц |
| `Shift + PageUp` | Предыдущий год |
| `Shift + PageDown` | Следующий год |
| `Enter` / `Пробел` | Выбрать дату |
| `Escape` | Закрыть без выбора |
| `Tab` / `Shift+Tab` | Фокус-ловушка внутри диалога |

### Локализация
Поддерживаются любые BCP 47 локали. Компонент автоматически определяет:
- первый день недели,
- формат отображения даты в поле ввода,
- названия месяцев, дней недели, UI-строки (ОК, Отмена и др.) — встроены для `en`, `ru`, `de`, `fr`.

### Архитектура
Код построен по React-паттернам: Container/Presentational split, Proxy Component (`NavButton`), Style Component (`DayButton`), Event Switch, Array as Children. Стили — CSS Modules, все цвета проверены на контрастность ≥ 4.5:1.

---

## Установка и запуск

```bash
npm install
npm start      # dev-сервер
npm test       # тесты
npm run build  # production-сборка
```

---

## Использование

```tsx
import { useState } from 'react';
import { DatePicker } from './src/DatePicker';

function App() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <DatePicker
      value={date}
      onChange={setDate}
    />
  );
}
```

### С ограничениями диапазона

```tsx
const min = new Date(2025, 0, 1);   // 1 января 2025
const max = new Date(2025, 11, 31); // 31 декабря 2025

<DatePicker
  value={date}
  onChange={setDate}
  minDate={min}
  maxDate={max}
/>
```

### С отключёнными датами и локализацией

```tsx
import { useMemo, useState } from 'react';

function App() {
  const [date, setDate] = useState<Date | null>(null);

  // Мемоизируйте массив, чтобы избежать лишних ре-рендеров
  const holidays = useMemo(() => [
    new Date(2025, 0, 1),  // Новый год
    new Date(2025, 0, 7),  // Рождество
  ], []);

  return (
    <DatePicker
      value={date}
      onChange={(d) => {
        if (d === null) {
          console.log('Дата очищена');
        } else {
          console.log('Выбрана дата:', d);
        }
        setDate(d);
      }}
      disabledDates={holidays}
      locale="ru-RU"
    />
  );
}
```

---

## Пропсы

| Проп | Тип | Обязателен | По умолчанию | Описание |
|---|---|---|---|---|
| `value` | `Date \| null \| undefined` | — | `undefined` | Текущая выбранная дата. `null` означает, что поле пустое. |
| `onChange` | `(date: Date \| null) => void` | да | — | Вызывается при выборе даты или очистке поля ввода. При очистке передаёт `null`. |
| `minDate` | `Date` | — | — | Нижняя граница допустимого диапазона. Даты раньше будут недоступны. |
| `maxDate` | `Date` | — | — | Верхняя граница допустимого диапазона. Даты позже будут недоступны. |
| `disabledDates` | `Date[]` | — | — | Список конкретных недоступных дат. **Мемоизируйте массив**, чтобы не вызывать лишних ре-рендеров. |
| `locale` | `string` | — | `'en-US'` | BCP 47 тег локали: `'en-US'`, `'ru-RU'`, `'de-DE'`, `'fr-FR'` и др. Влияет на формат даты, первый день недели и все UI-строки. |
