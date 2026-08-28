import { expect, test } from '@playwright/test';

import { runLegacyScenarioTwice } from './legacy-harness';
import { LEGACY_SNAPSHOT_MANIFEST } from '../fixtures/legacy-data';

test.describe('Golden Master do login legado', () => {
  test('congela a tela conectada com o relógio e ambiente do manifesto', async ({ page }, testInfo) => {
    // Mudança que este teste deve capturar: o legado deixa de mostrar o estado
    // operacional conectado para a fixture fixa de login.
    await runLegacyScenarioTwice(page, testInfo, 'login');

    await expect(page.getByText('Sistema Conectado!')).toBeVisible();
    await expect(page).toHaveScreenshot('legacy-login.png', { animations: 'disabled' });
    expect(LEGACY_SNAPSHOT_MANIFEST.login.clock).toBe('2026-08-12T12:00:00-03:00');
  });
});
