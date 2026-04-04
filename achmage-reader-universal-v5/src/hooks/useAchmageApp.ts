import {useCallback, useEffect, useMemo, useState} from 'react';

import {normalizeVaultSnapshot, type NormalizedDoc, type SourceDocument, type VaultSnapshot} from '../core/content';
import {
  getVaultState,
  isTauriRuntime,
  loadAppSettings,
  readVaultSnapshot,
  saveAppSettings,
  selectVaultDirectory,
  type AppSettings,
  withRecentVault,
} from '../lib/bridge';

type UseAchmageAppResult = {
  settings: AppSettings | null;
  snapshot: VaultSnapshot | null;
  sourceDocuments: SourceDocument[];
  documents: NormalizedDoc[];
  loading: boolean;
  error: string | null;
  selectVault: () => Promise<void>;
  refreshVault: (rootPath?: string | null) => Promise<void>;
  persistSettings: (updater: (current: AppSettings) => AppSettings) => Promise<void>;
};

export const useAchmageApp = (): UseAchmageAppResult => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [snapshot, setSnapshot] = useState<VaultSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistSettings = useCallback(async (updater: (current: AppSettings) => AppSettings) => {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      const next = updater(current);
      void saveAppSettings(next);
      return next;
    });
  }, []);

  const refreshVault = useCallback(async (rootPath?: string | null) => {
    const targetRoot = rootPath ?? settings?.selectedVaultPath ?? null;
    if (!targetRoot) {
      setSnapshot(null);
      return;
    }

    try {
      setError(null);
      const nextSnapshot = await readVaultSnapshot(targetRoot);
      setSnapshot(nextSnapshot);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to refresh vault.');
    }
  }, [settings?.selectedVaultPath]);

  const selectVault = useCallback(async () => {
    const selected = await selectVaultDirectory();
    if (!selected) {
      return;
    }

    const baseSettings = settings ?? {
      selectedVaultPath: null,
      recentVaults: [],
      preferredTheme: 'light',
      lastOpenDoc: null,
      windowState: null,
    };
    const nextSettings = withRecentVault(baseSettings, selected);

    setSettings(nextSettings);
    await saveAppSettings(nextSettings);
    await refreshVault(selected);
  }, [refreshVault, settings]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);
        const initialSettings = await loadAppSettings();
        if (cancelled) {
          return;
        }

        setSettings(initialSettings);
        if (initialSettings.selectedVaultPath) {
          const nextSnapshot = await readVaultSnapshot(initialSettings.selectedVaultPath);
          if (!cancelled) {
            setSnapshot(nextSnapshot);
          }
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : 'Failed to load Achmage Markdown Renderer.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime() || !settings?.selectedVaultPath || !snapshot) {
      return;
    }

    const pollId = window.setInterval(() => {
      void getVaultState(settings.selectedVaultPath as string)
        .then((nextState) => {
          if (nextState.signature === snapshot.state.signature) {
            return;
          }

          return readVaultSnapshot(settings.selectedVaultPath as string).then((nextSnapshot) => {
            setSnapshot(nextSnapshot);
            window.dispatchEvent(new CustomEvent('vault_changed', {detail: nextSnapshot.state}));
          });
        })
        .catch(() => {
          // Keep the previous snapshot visible when polling fails.
        });
    }, 1500);

    return () => {
      window.clearInterval(pollId);
    };
  }, [settings?.selectedVaultPath, snapshot]);

  const normalized = useMemo(() => {
    if (!snapshot) {
      return {
        sourceDocuments: [] as SourceDocument[],
        normalizedDocuments: [] as NormalizedDoc[],
      };
    }

    return normalizeVaultSnapshot(snapshot);
  }, [snapshot]);

  return {
    settings,
    snapshot,
    sourceDocuments: normalized.sourceDocuments,
    documents: normalized.normalizedDocuments,
    loading,
    error,
    selectVault,
    refreshVault,
    persistSettings,
  };
};
