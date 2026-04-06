import {invoke} from '@tauri-apps/api/core';
import {open as openDialog} from '@tauri-apps/plugin-dialog';
import {openUrl} from '@tauri-apps/plugin-opener';

import type {VaultSnapshot, VaultState} from '../core/content';
import {SAMPLE_APP_SETTINGS, SAMPLE_VAULT_SNAPSHOT} from '../mocks/sampleVault';

export type LastOpenDoc = {
  slug: string;
  outputMode: 'reader' | 'stage' | 'newsletter';
};

export type WindowState = {
  width: number;
  height: number;
};

export type AppSettings = {
  selectedVaultPath: string | null;
  recentVaults: string[];
  preferredTheme: string | null;
  lastOpenDoc: LastOpenDoc | null;
  windowState: WindowState | null;
};

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

const normalizePath = (value: string): string => value.replace(/\\/g, '/');

export const isTauriRuntime = (): boolean =>
  typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';

export const loadAppSettings = async (): Promise<AppSettings> => {
  if (!isTauriRuntime()) {
    return {
      ...SAMPLE_APP_SETTINGS,
      recentVaults: [...SAMPLE_APP_SETTINGS.recentVaults],
    };
  }

  return invoke<AppSettings>('load_app_settings');
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke('save_app_settings', {settings});
};

export const selectVaultDirectory = async (): Promise<string | null> => {
  if (!isTauriRuntime()) {
    return SAMPLE_VAULT_SNAPSHOT.state.rootPath;
  }

  const selected = await openDialog({
    directory: true,
    multiple: false,
    title: 'Select Obsidian Vault',
  });

  return typeof selected === 'string' ? normalizePath(selected) : null;
};

export const getVaultState = async (rootPath: string): Promise<VaultState> => {
  if (!isTauriRuntime()) {
    return SAMPLE_VAULT_SNAPSHOT.state;
  }

  return invoke<VaultState>('get_vault_state', {rootPath});
};

export const readVaultSnapshot = async (rootPath: string): Promise<VaultSnapshot> => {
  if (!isTauriRuntime()) {
    return SAMPLE_VAULT_SNAPSHOT;
  }

  return invoke<VaultSnapshot>('read_vault_snapshot', {rootPath});
};

export const readAssetDataUrl = async (
  rootPath: string,
  documentPath: string,
  assetPath: string,
): Promise<string> => {
  if (/^(https?:)?\/\//i.test(assetPath) || assetPath.startsWith('data:') || assetPath.startsWith('/')) {
    return assetPath;
  }

  if (!isTauriRuntime()) {
    return assetPath;
  }

  return invoke<string>('read_asset_data_url', {
    rootPath,
    documentPath,
    assetPath,
  });
};

export const openExternal = async (url: string): Promise<void> => {
  const openInBrowser = (): boolean => {
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }

    return false;
  };

  if (!isTauriRuntime()) {
    openInBrowser();
    return;
  }

  try {
    await openUrl(url);
  } catch (error) {
    if (!openInBrowser()) {
      throw error;
    }
  }
};

export const withRecentVault = (settings: AppSettings, rootPath: string): AppSettings => {
  const normalizedRoot = normalizePath(rootPath);
  const recentVaults = [normalizedRoot, ...settings.recentVaults.filter((entry) => normalizePath(entry) !== normalizedRoot)];
  const sameVault =
    settings.selectedVaultPath !== null && normalizePath(settings.selectedVaultPath) === normalizedRoot;

  return {
    ...settings,
    selectedVaultPath: normalizedRoot,
    recentVaults: recentVaults.slice(0, 8),
    lastOpenDoc: sameVault ? settings.lastOpenDoc : null,
  };
};
