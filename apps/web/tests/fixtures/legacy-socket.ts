import type { Page } from '@playwright/test';

export interface LegacySocketEmission {
  name: string;
  payload: unknown;
  order: number;
}

type LegacySocketHandler = (payload: unknown) => void;

interface BrowserLegacySocket {
  receive(name: string, payload: unknown): void;
}

/**
 * Socket.IO substitute used by the untouched legacy documents. It records
 * client emissions in source order and can inject deterministic server events.
 */
export class LegacySocketFixture {
  readonly emissions: LegacySocketEmission[] = [];

  private readonly handlers = new Map<string, Set<LegacySocketHandler>>();
  private page: Page | undefined;

  on(name: string, handler: LegacySocketHandler): this {
    const listeners = this.handlers.get(name) ?? new Set<LegacySocketHandler>();
    listeners.add(handler);
    this.handlers.set(name, listeners);
    return this;
  }

  off(name: string, handler?: LegacySocketHandler): this {
    if (handler) {
      this.handlers.get(name)?.delete(handler);
    } else {
      this.handlers.delete(name);
    }
    return this;
  }

  emit(name: string, payload: unknown): this {
    const emission = { name, payload, order: this.emissions.length + 1 };
    this.emissions.push(emission);
    this.handlers.get(name)?.forEach((handler) => handler(payload));
    return this;
  }

  async attach(page: Page): Promise<void> {
    this.page = page;
    await page.exposeBinding('__legacySocketEmit', (_source, name: string, payload: unknown) => {
      this.emit(name, payload);
    });

    await page.addInitScript(() => {
      type Handler = (payload: unknown) => void;
      const listeners = new Map<string, Set<Handler>>();
      const legacyWindow = window as typeof window & {
        __legacySocket?: BrowserLegacySocket;
        __legacySocketEmit(name: string, payload: unknown): void;
        io?: () => unknown;
      };

      const socket = {
        on(name: string, handler: Handler) {
          const handlers = listeners.get(name) ?? new Set<Handler>();
          handlers.add(handler);
          listeners.set(name, handlers);
          return socket;
        },
        off(name: string, handler?: Handler) {
          if (handler) listeners.get(name)?.delete(handler);
          else listeners.delete(name);
          return socket;
        },
        emit(name: string, payload: unknown) {
          legacyWindow.__legacySocketEmit(name, payload);
          return socket;
        },
        receive(name: string, payload: unknown) {
          listeners.get(name)?.forEach((handler) => handler(payload));
        },
      };

      legacyWindow.__legacySocket = socket;
      legacyWindow.io = () => socket;
    });
  }

  async receive(name: string, payload: unknown): Promise<void> {
    if (!this.page) throw new Error('LegacySocketFixture must be attached before receiving events.');

    await this.page.evaluate(({ name: eventName, payload: eventPayload }) => {
      const legacyWindow = window as typeof window & { __legacySocket: BrowserLegacySocket };
      legacyWindow.__legacySocket.receive(eventName, eventPayload);
    }, { name, payload });
  }
}
