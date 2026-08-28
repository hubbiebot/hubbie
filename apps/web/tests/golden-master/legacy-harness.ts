import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import axe from 'axe-core';
import type { Page, TestInfo } from '@playwright/test';

import { freezeLegacyClock } from '../fixtures/legacy-clock';
import { LEGACY_SCENARIO_EVENTS, type LegacyScenario } from '../fixtures/legacy-data';
import { LegacySocketFixture, type LegacySocketEmission } from '../fixtures/legacy-socket';

const LEGACY_ORIGIN = 'https://legacy.hubbie.test';
// npm runs workspace scripts from apps/web, independently of the shell cwd.
const workspaceRoot = resolve(process.cwd(), '../..');

export interface LegacyObservation {
  essentialText: string;
  finalFocus: string;
  ariaLive: string[];
  accessibilityViolations: Array<{ id: string; impact: string | null; targets: string[][] }>;
  emitted: LegacySocketEmission[];
  screenshotHash: string;
}

export interface LegacyHarnessState {
  socket: LegacySocketFixture;
  blockedRequests: string[];
}

const states = new WeakMap<Page, LegacyHarnessState>();

export async function openLegacyPage(page: Page, scenario: LegacyScenario): Promise<void> {
  if (states.has(page)) throw new Error('Each legacy page must be opened only once per deterministic scenario.');

  const state: LegacyHarnessState = { socket: new LegacySocketFixture(), blockedRequests: [] };
  states.set(page, state);
  await freezeLegacyClock(page);
  await state.socket.attach(page);
  await installAnimationFreeze(page);
  await installNoNetworkRoutes(page, state);

  const legacyFile = scenario === 'login' ? 'login.html' : 'index.html';
  await page.goto(`${LEGACY_ORIGIN}/${legacyFile}`, { waitUntil: 'load' });
  for (const [name, payload] of LEGACY_SCENARIO_EVENTS[scenario]) {
    await state.socket.receive(name, payload);
  }
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));

  if (state.blockedRequests.length > 0) {
    throw new Error(`Legacy page attempted undeclared requests: ${state.blockedRequests.join(', ')}`);
  }
}

export function getLegacyHarnessState(page: Page): LegacyHarnessState {
  const state = states.get(page);
  if (!state) throw new Error('Call openLegacyPage before reading the legacy harness state.');
  return state;
}

export async function runLegacyScenarioTwice(
  page: Page,
  testInfo: TestInfo,
  scenario: LegacyScenario,
  exercise: (legacyPage: Page) => Promise<void> = async () => undefined,
): Promise<LegacyObservation> {
  await openLegacyPage(page, scenario);
  await exercise(page);
  expectNoUndeclaredRequests(page);
  const first = await observeLegacyPage(page, testInfo, `${scenario}-first`);

  const repeatedPage = await page.context().newPage();
  try {
    await openLegacyPage(repeatedPage, scenario);
    await exercise(repeatedPage);
    expectNoUndeclaredRequests(repeatedPage);
    const repeated = await observeLegacyPage(repeatedPage, testInfo, `${scenario}-second`);
    const firstComparable = JSON.stringify(first);
    const repeatedComparable = JSON.stringify(repeated);
    if (firstComparable !== repeatedComparable) {
      throw new Error(`Non-deterministic ${scenario} golden master:\nfirst=${firstComparable}\nsecond=${repeatedComparable}`);
    }
  } finally {
    await repeatedPage.close();
  }

  return first;
}

export async function observeLegacyPage(page: Page, testInfo: TestInfo, name: string): Promise<LegacyObservation> {
  const screenshot = await page.screenshot({ animations: 'disabled' });
  const observation: LegacyObservation = {
    essentialText: normalizeText(await page.locator('body').innerText()),
    finalFocus: await page.evaluate(() => {
      const element = document.activeElement;
      return element ? `${element.tagName.toLowerCase()}#${element.id}` : 'none';
    }),
    ariaLive: await page.locator('[aria-live]').allTextContents(),
    accessibilityViolations: await collectAccessibilityViolations(page),
    emitted: getLegacyHarnessState(page).socket.emissions,
    screenshotHash: createHash('sha256').update(screenshot).digest('hex'),
  };

  await writeFile(testInfo.outputPath(`${name}.observation.json`), `${JSON.stringify(observation, null, 2)}\n`);
  return observation;
}

async function collectAccessibilityViolations(page: Page): Promise<Array<{ id: string; impact: string | null; targets: string[][] }>> {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const axeWindow = window as typeof window & {
      axe: { run(document: Document): Promise<{ violations: Array<{ id: string; impact: string | null; nodes: Array<{ target: string[] }> }> }> };
    };
    const results = await axeWindow.axe.run(document);
    return results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target),
    }));
  });
}

export function expectNoUndeclaredRequests(page: Page): void {
  const { blockedRequests } = getLegacyHarnessState(page);
  if (blockedRequests.length > 0) {
    throw new Error(`Undeclared legacy network requests: ${blockedRequests.join(', ')}`);
  }
}

async function installAnimationFreeze(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.append(style), { once: true });
    window.confirm = () => true;
    window.alert = () => undefined;
  });
}

async function installNoNetworkRoutes(page: Page, state: LegacyHarnessState): Promise<void> {
  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const localPath = requestUrl.pathname;

    if (requestUrl.origin === LEGACY_ORIGIN && (localPath === '/index.html' || localPath === '/login.html')) {
      const content = await readFile(resolve(workspaceRoot, localPath.slice(1)), 'utf8');
      await route.fulfill({ contentType: 'text/html; charset=utf-8', body: content });
      return;
    }

    if (isDeclaredExternalFixture(requestUrl)) {
      await route.fulfill({
        contentType: requestUrl.pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8',
        body: externalFixtureSource(requestUrl),
      });
      return;
    }

    state.blockedRequests.push(requestUrl.toString());
    await route.abort('blockedbyclient');
  });
}

function isDeclaredExternalFixture(url: URL): boolean {
  return (
    (url.hostname === 'cdnjs.cloudflare.com' && url.pathname.includes('font-awesome')) ||
    (url.hostname === 'cdnjs.cloudflare.com' && url.pathname.includes('qrious')) ||
    (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('emoji-picker-element')) ||
    (url.hostname === 'cdn.socket.io' && url.pathname.includes('socket.io')) ||
    (url.hostname === 'legacy.hubbie.test' && url.pathname === '/socket.io/socket.io.js')
  );
}

function externalFixtureSource(url: URL): string {
  if (url.pathname.includes('qrious')) {
    return 'window.QRious = class QRious { constructor(options) { this.options = options; } };';
  }
  return '';
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
