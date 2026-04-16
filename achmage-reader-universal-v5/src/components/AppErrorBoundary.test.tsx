// @vitest-environment jsdom

import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {AppErrorBoundary} from './AppErrorBoundary';

function CrashOnRender(): never {
  throw new Error('render failed');
}

describe('AppErrorBoundary', () => {
  let root: Root | null = null;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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

  it('shows a fallback diagnostic panel instead of leaving the root blank', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(
        <AppErrorBoundary>
          <CrashOnRender />
        </AppErrorBoundary>,
      );
    });

    expect(container.textContent).toContain('Unexpected application error');
    expect(container.textContent).toContain('render failed');
    consoleError.mockRestore();
  });
});
