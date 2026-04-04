import {describe, expect, it} from 'vitest';

import {clearLastOpenDoc, getInitialRestoreRoute, type AppRoute, APP_DISPLAY_NAME} from './app-shell';
import type {AppSettings} from './bridge';

const baseSettings: AppSettings = {
  selectedVaultPath: 'C:/vault',
  recentVaults: ['C:/vault'],
  preferredTheme: 'dark',
  lastOpenDoc: {
    slug: 'why-obsidian',
    outputMode: 'reader',
  },
  windowState: null,
};

describe('app shell state', () => {
  it('restores the last open document on initial boot', () => {
    const route = getInitialRestoreRoute({
      hasAttemptedInitialRestore: false,
      hasExplicitDocRoute: false,
      route: {screen: 'home'},
      settings: baseSettings,
      documents: [{slug: 'why-obsidian'}],
    });

    expect(route).toEqual<AppRoute>({
      screen: 'doc',
      output: 'reader',
      slug: 'why-obsidian',
    });
  });

  it('does not reopen the last document after an explicit home navigation', () => {
    const route = getInitialRestoreRoute({
      hasAttemptedInitialRestore: true,
      hasExplicitDocRoute: false,
      route: {screen: 'home'},
      settings: baseSettings,
      documents: [{slug: 'why-obsidian'}],
    });

    expect(route).toBeNull();
  });

  it('clears the persisted last-open document when returning home', () => {
    expect(clearLastOpenDoc(baseSettings)).toEqual<AppSettings>({
      ...baseSettings,
      lastOpenDoc: null,
    });
  });

  it('uses the renderer product name everywhere', () => {
    expect(APP_DISPLAY_NAME).toBe('Achmage Markdown Renderer');
  });
});
