import { expect, test } from '@playwright/test';

import { getLegacyHarnessState, runLegacyScenarioTwice } from './legacy-harness';

test.describe('Golden Master da administração legada', () => {
  test('captura a abertura e salvamento da configuração administrativa', async ({ page }, testInfo) => {
    // Mudança que este teste deve capturar: a administração deixa de carregar a
    // fixture de prompt ou de emitir sua atualização.
    await runLegacyScenarioTwice(page, testInfo, 'admin', async (legacyPage) => {
      await legacyPage.getByRole('button', { name: /Config\. da IA/ }).click();
      await legacyPage.locator('#prompt-txt').fill('Prompt Golden atualizado.');
      await legacyPage.getByRole('button', { name: 'Salvar Alterações' }).click();
    });

    expect(getLegacyHarnessState(page).socket.emissions).toEqual([
      { name: 'salvar-config-prompt', payload: 'Prompt Golden atualizado.', order: 1 },
    ]);
    await expect(page).toHaveScreenshot('legacy-admin.png', { animations: 'disabled' });
  });
});
