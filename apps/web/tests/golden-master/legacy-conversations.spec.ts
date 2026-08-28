import { expect, test } from '@playwright/test';

import { LEGACY_CONTACT_ID } from '../fixtures/legacy-data';
import { getLegacyHarnessState, runLegacyScenarioTwice } from './legacy-harness';

test.describe('Golden Master das conversas legadas', () => {
  test('captura status operacional, seleção e envio de texto', async ({ page }, testInfo) => {
    // Mudança que este teste deve capturar: a seleção deixa de iniciar a
    // conversa manualmente ou o envio deixa de preservar o payload legado.
    await runLegacyScenarioTwice(page, testInfo, 'conversations', async (legacyPage) => {
      await legacyPage.getByText('Cliente Golden', { exact: true }).click();
      await legacyPage.locator('#manual-msg-input').fill('Mensagem Golden');
      await legacyPage.locator('#manual-msg-input').press('Enter');
    });

    await expect(page.getByText('WhatsApp: Conectado')).toBeVisible();
    await expect(page.locator('#chat-header-name')).toHaveText('Cliente Golden');
    expect(getLegacyHarnessState(page).socket.emissions).toEqual([
      { name: 'iniciar-conversa-manual', payload: LEGACY_CONTACT_ID, order: 1 },
      {
        name: 'enviar-mensagem-manual',
        payload: { id: LEGACY_CONTACT_ID, mensagem: 'Mensagem Golden' },
        order: 2,
      },
    ]);
    await expect(page).toHaveScreenshot('legacy-conversations.png', { animations: 'disabled' });
  });

  test('captura arquivamento e reabertura da conversa', async ({ page }, testInfo) => {
    // Mudança que este teste deve capturar: arquivar ou reabrir deixa de emitir
    // o evento legado para a conversa selecionada.
    await runLegacyScenarioTwice(page, testInfo, 'conversations', async (legacyPage) => {
      await legacyPage.getByText('Cliente Golden', { exact: true }).click();
      await legacyPage.getByRole('button', { name: /Arquivar/ }).click();
      await getLegacyHarnessState(legacyPage).socket.receive('atualizar-arquivadas', [LEGACY_CONTACT_ID]);
      await legacyPage.getByRole('button', { name: /Arquivadas/ }).click();
      await legacyPage.getByText('Cliente Golden', { exact: true }).click();
    });

    expect(getLegacyHarnessState(page).socket.emissions.map(({ name, payload }) => ({ name, payload }))).toEqual([
      { name: 'iniciar-conversa-manual', payload: LEGACY_CONTACT_ID },
      { name: 'arquivar-conversa', payload: LEGACY_CONTACT_ID },
      { name: 'reabrir-conversa', payload: LEGACY_CONTACT_ID },
      { name: 'iniciar-conversa-manual', payload: LEGACY_CONTACT_ID },
    ]);
    await expect(page.getByText('Conversas Ativas')).toBeVisible();
  });
});
