import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/golden-master',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  snapshotPathTemplate: '{testDir}/snapshots/{testFileName}-{arg}{ext}',
  use: {
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'dark',
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
});
