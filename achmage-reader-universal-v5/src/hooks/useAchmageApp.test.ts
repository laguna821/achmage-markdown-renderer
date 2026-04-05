import {describe, expect, it} from 'vitest';

import type {AppSettings} from '../lib/bridge';

import {__resetAppSettingsSaveQueueForTest, enqueueAppSettingsSave} from './useAchmageApp';

const makeSettings = (slug: string): AppSettings => ({
  selectedVaultPath: 'C:/vault',
  recentVaults: ['C:/vault'],
  preferredTheme: 'light',
  lastOpenDoc: {
    slug,
    outputMode: 'reader',
  },
  windowState: null,
});

describe('useAchmageApp settings persistence', () => {
  it('serializes overlapping settings writes', async () => {
    __resetAppSettingsSaveQueueForTest();

    const saved: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const saver = async (settings: AppSettings) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const delay = settings.lastOpenDoc?.slug === 'first' ? 20 : 0;
      await new Promise((resolve) => setTimeout(resolve, delay));
      saved.push(settings.lastOpenDoc?.slug ?? 'none');
      inFlight -= 1;
    };

    await Promise.all([
      enqueueAppSettingsSave(makeSettings('first'), saver),
      enqueueAppSettingsSave(makeSettings('second'), saver),
      enqueueAppSettingsSave(makeSettings('third'), saver),
    ]);

    expect(maxInFlight).toBe(1);
    expect(saved).toEqual(['first', 'second', 'third']);
  });

  it('continues processing later saves after a failure', async () => {
    __resetAppSettingsSaveQueueForTest();

    const saved: string[] = [];

    const saver = async (settings: AppSettings) => {
      const slug = settings.lastOpenDoc?.slug ?? 'none';
      saved.push(slug);
      if (slug === 'broken') {
        throw new Error('write failed');
      }
    };

    await expect(enqueueAppSettingsSave(makeSettings('broken'), saver)).rejects.toThrow('write failed');
    await expect(enqueueAppSettingsSave(makeSettings('healthy'), saver)).resolves.toBeUndefined();

    expect(saved).toEqual(['broken', 'healthy']);
  });
});
