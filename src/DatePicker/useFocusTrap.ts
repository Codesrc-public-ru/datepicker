import { RefObject, useEffect } from 'react';

/**
 * Traps keyboard focus within `containerRef` while `isActive` is true.
 *
 * Tab cycles forward through focusable elements; Shift+Tab cycles backward.
 * Because the calendar grid uses roving tabindex, only the active day button
 * enters the tab sequence at any time.
 *
 * Effective tab order inside the dialog:
 *   prevMonthBtn → nextMonthBtn → activeDayBtn → (wrap)
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
): void {
  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    function getFocusable(): HTMLElement[] {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([aria-hidden="true"]), ' +
            'input:not([disabled]), ' +
            '[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.tabIndex >= 0);
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}
