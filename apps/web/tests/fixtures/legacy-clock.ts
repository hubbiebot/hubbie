import type { Page } from '@playwright/test';

export const LEGACY_CLOCK_ISO = '2026-08-12T12:00:00-03:00';

/** Freezes the browser-visible clock before any legacy script can execute. */
export async function freezeLegacyClock(page: Page): Promise<void> {
  await page.addInitScript(({ clock }) => {
    const NativeDate = Date;
    const fixedTime = NativeDate.parse(clock);

    class FixedDate extends NativeDate {
      constructor(...args: ConstructorParameters<DateConstructor>) {
        super(...(args.length === 0 ? [fixedTime] : args));
      }

      static now(): number {
        return fixedTime;
      }
    }

    Object.setPrototypeOf(FixedDate, NativeDate);
    window.Date = FixedDate;
  }, { clock: LEGACY_CLOCK_ISO });
}
