import {beforeEach, describe, expect, it, vi} from 'vitest';

const {invokeMock, openDialogMock, openUrlMock} = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  openDialogMock: vi.fn(),
  openUrlMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: openDialogMock,
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: openUrlMock,
}));

import {openExternal} from './bridge';

describe('openExternal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('window', {
      open: vi.fn(),
    });
  });

  it('opens in a browser window outside of Tauri', async () => {
    await openExternal('https://example.com');

    expect(openUrlMock).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
  });

  it('prefers the Tauri opener when available', async () => {
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
      open: vi.fn(),
    });

    await openExternal('https://example.com');

    expect(openUrlMock).toHaveBeenCalledWith('https://example.com');
    expect(window.open).not.toHaveBeenCalled();
  });

  it('falls back to browser opening when the Tauri opener rejects', async () => {
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {},
      open: vi.fn(),
    });
    openUrlMock.mockRejectedValueOnce(new Error('blocked'));

    await openExternal('https://example.com');

    expect(openUrlMock).toHaveBeenCalledWith('https://example.com');
    expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
  });
});
