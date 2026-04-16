// @vitest-environment jsdom

import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {AppSettings} from '../lib/bridge';

const bridgeMocks = vi.hoisted(() => ({
  loadAppSettings: vi.fn(),
  saveAppSettings: vi.fn(),
  saveVaultLoadReport: vi.fn(),
  selectVaultDirectory: vi.fn(),
  getVaultState: vi.fn(),
  scanVault: vi.fn(),
  readVaultBatch: vi.fn(),
  isTauriRuntime: vi.fn(),
  withRecentVault: vi.fn((settings: AppSettings, rootPath: string) => ({
    ...settings,
    selectedVaultPath: rootPath,
    recentVaults: [rootPath, ...settings.recentVaults.filter((entry) => entry !== rootPath)].slice(0, 8),
    lastOpenDoc: null,
  })),
}));

vi.mock('../lib/bridge', () => bridgeMocks);

import {useAchmageApp} from './useAchmageApp';

type ProbeState = {
  phase: string;
  docs: number;
  validatedFiles: number;
  fatalCount: number;
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return {promise, resolve};
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const bootstrapSettings: AppSettings = {
  selectedVaultPath: 'C:/vault',
  recentVaults: ['C:/vault'],
  preferredTheme: 'light',
  lastOpenDoc: null,
  windowState: null,
};

const idleSettings: AppSettings = {
  selectedVaultPath: null,
  recentVaults: [],
  preferredTheme: 'light',
  lastOpenDoc: null,
  windowState: null,
};

const scanResult = {
  state: {
    rootPath: 'C:/vault',
    docCount: 1,
    lastIndexedAt: '1',
    watchStatus: 'polling',
    signature: 'sig',
  },
  files: [
    {
      filePath: 'C:/vault/notes/alpha.md',
      relativePath: 'notes/alpha.md',
      size: 1,
      mtimeMs: 1,
    },
  ],
};

const readyBatch = {
  files: [
    {
      relativePath: 'notes/alpha.md',
      content: `---
title: Alpha
docType: note
outputs: [reader]
---

## Overview

Ready`,
    },
  ],
};

describe('useAchmageApp vault loading', () => {
  let root: Root | null = null;
  let latestApp: ReturnType<typeof useAchmageApp> | null = null;
  const states: ProbeState[] = [];

  const lastState = (): ProbeState | undefined => states[states.length - 1];

  function Probe() {
    const app = useAchmageApp();
    latestApp = app;
    states.push({
      phase: app.loadState.phase,
      docs: app.documents.length,
      validatedFiles: app.loadState.validatedFiles,
      fatalCount: app.loadState.fatalCount,
    });
    return null;
  }

  beforeEach(() => {
    states.length = 0;
    latestApp = null;
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    bridgeMocks.loadAppSettings.mockReset();
    bridgeMocks.saveAppSettings.mockReset();
    bridgeMocks.saveVaultLoadReport.mockReset();
    bridgeMocks.selectVaultDirectory.mockReset();
    bridgeMocks.getVaultState.mockReset();
    bridgeMocks.scanVault.mockReset();
    bridgeMocks.readVaultBatch.mockReset();
    bridgeMocks.isTauriRuntime.mockReset();
    bridgeMocks.withRecentVault.mockClear();
    bridgeMocks.isTauriRuntime.mockReturnValue(false);
  });

  afterEach(async () => {
    if (root) {
      const mountedRoot = root;
      await act(async () => {
        mountedRoot.unmount();
      });
      root = null;
    }
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('moves through scanning, validating, and ready phases during bootstrap', async () => {
    const scanDeferred = createDeferred<typeof scanResult>();
    const batchDeferred = createDeferred<typeof readyBatch>();

    bridgeMocks.loadAppSettings.mockResolvedValue(bootstrapSettings);
    bridgeMocks.scanVault.mockReturnValue(scanDeferred.promise);
    bridgeMocks.readVaultBatch.mockReturnValue(batchDeferred.promise);

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<Probe />);
      await flush();
    });

    expect(lastState()?.phase).toBe('scanning');

    await act(async () => {
      scanDeferred.resolve(scanResult);
      await flush();
    });

    expect(states.some((state) => state.phase === 'validating')).toBe(true);

    await act(async () => {
      batchDeferred.resolve(readyBatch);
      await flush();
    });

    expect(lastState()).toEqual({
      phase: 'ready',
      docs: 1,
      validatedFiles: 1,
      fatalCount: 0,
    });
  });

  it('ends in blocked phase when validation finds a fatal file', async () => {
    bridgeMocks.loadAppSettings.mockResolvedValue(bootstrapSettings);
    bridgeMocks.scanVault.mockResolvedValue(scanResult);
    bridgeMocks.readVaultBatch.mockResolvedValue({
      files: [
        {
          relativePath: 'notes/alpha.md',
          content: `---
title: Alpha
docType: note
outputs: [reader
---

Broken`,
        },
      ],
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<Probe />);
      await flush();
      await flush();
    });

    expect(lastState()).toEqual({
      phase: 'blocked',
      docs: 0,
      validatedFiles: 1,
      fatalCount: 1,
    });
  });

  it('uses the same loading pipeline for selectVault and refreshVault', async () => {
    bridgeMocks.loadAppSettings.mockResolvedValue(idleSettings);
    bridgeMocks.selectVaultDirectory.mockResolvedValue('C:/vault');
    bridgeMocks.scanVault.mockResolvedValue(scanResult);
    bridgeMocks.readVaultBatch.mockResolvedValue(readyBatch);

    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<Probe />);
      await flush();
    });

    expect(lastState()?.phase).toBe('idle');

    await act(async () => {
      await latestApp?.selectVault();
      await flush();
    });

    expect(bridgeMocks.scanVault).toHaveBeenCalledTimes(1);
    expect(lastState()?.phase).toBe('ready');

    await act(async () => {
      await latestApp?.refreshVault();
      await flush();
    });

    expect(bridgeMocks.scanVault).toHaveBeenCalledTimes(2);
    expect(lastState()?.phase).toBe('ready');
  });
});
