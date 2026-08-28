import { LEGACY_CLOCK_ISO } from './legacy-clock';

export const LEGACY_VIEWPORT = { width: 1440, height: 900 } as const;
export const LEGACY_LOCALE = 'pt-BR';
export const LEGACY_TIMEZONE = 'America/Sao_Paulo';
export const LEGACY_CONTACT_ID = '5511999990000@c.us';

export type LegacyScenario = 'login' | 'conversations' | 'admin';

export const LEGACY_SNAPSHOT_MANIFEST = {
  login: {
    viewport: LEGACY_VIEWPORT,
    locale: LEGACY_LOCALE,
    timezone: LEGACY_TIMEZONE,
    clock: LEGACY_CLOCK_ISO,
    data: 'login-ready-v1',
  },
  conversations: {
    viewport: LEGACY_VIEWPORT,
    locale: LEGACY_LOCALE,
    timezone: LEGACY_TIMEZONE,
    clock: LEGACY_CLOCK_ISO,
    data: 'conversation-fixture-v1',
  },
  admin: {
    viewport: LEGACY_VIEWPORT,
    locale: LEGACY_LOCALE,
    timezone: LEGACY_TIMEZONE,
    clock: LEGACY_CLOCK_ISO,
    data: 'admin-fixture-v1',
  },
} as const;

export const LEGACY_SCENARIO_EVENTS: Record<LegacyScenario, ReadonlyArray<readonly [string, unknown]>> = {
  login: [
    ['ready', undefined],
  ],
  conversations: [
    ['connect', undefined],
    ['config-atual', { ligado: true }],
    ['whatsapp-status', { estado: 'Conectado', detalhe: 'Fixture local ativa' }],
    ['atualizar-arquivadas', []],
    ['atualizar-fixados', []],
    ['atualizar-pausados', []],
    ['atualizar-tags-geral', {}],
    ['atualizar-cores-tags', {}],
    ['nova-msg', {
      id: LEGACY_CONTACT_ID,
      from: 'Cliente Golden',
      body: 'Olá, preciso de atendimento.',
      timestamp: '2026-08-12T14:59:00.000Z',
      isHuman: false,
      isIA: false,
    }],
  ],
  admin: [
    ['connect', undefined],
    ['config-atual', { ligado: true }],
    ['whatsapp-status', { estado: 'Conectado', detalhe: 'Fixture local ativa' }],
    ['carregar-config-prompt', 'Responder em português com dados confirmados.'],
    ['atualizar-estoque-tabela', [{
      cod: 'GM-001',
      nome: 'Produto Golden',
      preco: '25,00',
      quantidade: 8,
      minimo: 2,
      validade: '2026-08-20',
      semValidade: false,
    }]],
  ],
};
