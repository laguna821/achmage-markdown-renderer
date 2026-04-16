import {useCallback, useEffect, useRef, useState} from 'react';

import {
  buildVaultLoadReport,
  createIdleVaultLoadState,
  loadVaultDocuments,
  type NormalizedDoc,
  type SourceDocument,
  type VaultLoadState,
  type VaultValidationError,
} from '../core/content';
import {
  getVaultState,
  isTauriRuntime,
  loadAppSettings,
  readVaultBatch,
  saveVaultLoadReport,
  saveAppSettings,
  scanVault,
  selectVaultDirectory,
  type AppSettings,
  withRecentVault,
} from '../lib/bridge';

type UseAchmageAppResult = {
  settings: AppSettings | null;
  sourceDocuments: SourceDocument[];
  documents: NormalizedDoc[];
  loadState: VaultLoadState;
  loadErrors: VaultValidationError[];
  loading: boolean;
  error: string | null;
  selectVault: () => Promise<void>;
  refreshVault: (rootPath?: string | null) => Promise<void>;
  persistSettings: (updater: (current: AppSettings) => AppSettings) => Promise<void>;
};

let appSettingsSaveQueue: Promise<void> = Promise.resolve();

export const enqueueAppSettingsSave = async (
  settings: AppSettings,
  saver: (settings: AppSettings) => Promise<void> = saveAppSettings,
): Promise<void> => {
  const task = appSettingsSaveQueue.catch(() => undefined).then(() => saver(settings));
  appSettingsSaveQueue = task.catch(() => undefined);
  return task;
};

export const __resetAppSettingsSaveQueueForTest = (): void => {
  appSettingsSaveQueue = Promise.resolve();
};

export const useAchmageApp = (): UseAchmageAppResult => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>([]);
  const [documents, setDocuments] = useState<NormalizedDoc[]>([]);
  const [loadState, setLoadState] = useState<VaultLoadState>(createIdleVaultLoadState());
  const [loadErrors, setLoadErrors] = useState<VaultValidationError[]>([]);
  const loadRunIdRef = useRef(0);

  const persistSettings = useCallback(async (updater: (current: AppSettings) => AppSettings) => {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      const next = updater(current);
      void enqueueAppSettingsSave(next);
      return next;
    });
  }, []);

  const publishLoadState = useCallback(
    (runId: number, nextState: VaultLoadState, errors: VaultValidationError[] = []) => {
      if (loadRunIdRef.current != runId) {
        return;
      }

      setLoadState(nextState);
      setLoadErrors(errors);
      void saveVaultLoadReport(buildVaultLoadReport(nextState, errors));
    },
    [],
  );

  const runVaultLoad = useCallback(
    async (rootPath: string | null) => {
      const runId = loadRunIdRef.current + 1;
      loadRunIdRef.current = runId;

      if (!rootPath) {
        setSourceDocuments([]);
        setDocuments([]);
        publishLoadState(runId, createIdleVaultLoadState());
        return null;
      }

      setSourceDocuments([]);
      setDocuments([]);
      publishLoadState(runId, {
        ...createIdleVaultLoadState(rootPath),
        phase: 'scanning',
      });

      try {
        const scan = await scanVault(rootPath);
        if (loadRunIdRef.current != runId) {
          return null;
        }

        const result = await loadVaultDocuments({
          rootPath,
          scan,
          readVaultBatch,
          onProgress: (nextState, errors) => {
            publishLoadState(runId, nextState, errors);
          },
        });

        if (loadRunIdRef.current != runId) {
          return null;
        }

        if (result.loadState.phase === 'ready') {
          setSourceDocuments(result.sourceDocuments);
          setDocuments(result.documents);
        } else {
          setSourceDocuments([]);
          setDocuments([]);
        }

        publishLoadState(runId, result.loadState, result.errors);
        return result;
      } catch (caughtError) {
        if (loadRunIdRef.current != runId) {
          return null;
        }

        setSourceDocuments([]);
        setDocuments([]);
        publishLoadState(runId, {
          phase: 'failed',
          vaultPath: rootPath,
          totalFiles: 0,
          validatedFiles: 0,
          fatalCount: 0,
          firstFatalErrors: [],
          error: caughtError instanceof Error ? caughtError.message : 'Failed to load the selected vault.',
          signature: null,
        });
        return null;
      }
    },
    [publishLoadState],
  );

  const refreshVault = useCallback(async (rootPath?: string | null) => {
    const targetRoot = rootPath ?? settings?.selectedVaultPath ?? null;
    await runVaultLoad(targetRoot);
  }, [runVaultLoad, settings?.selectedVaultPath]);

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
    await enqueueAppSettingsSave(nextSettings);
    await runVaultLoad(selected);
  }, [runVaultLoad, settings]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const initialSettings = await loadAppSettings();
        if (cancelled) {
          return;
        }

        setSettings(initialSettings);
        if (initialSettings.selectedVaultPath) {
          await runVaultLoad(initialSettings.selectedVaultPath);
        } else {
          const runId = loadRunIdRef.current + 1;
          loadRunIdRef.current = runId;
          publishLoadState(runId, createIdleVaultLoadState(null));
        }
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        const runId = loadRunIdRef.current + 1;
        loadRunIdRef.current = runId;
        publishLoadState(runId, {
          phase: 'failed',
          vaultPath: null,
          totalFiles: 0,
          validatedFiles: 0,
          fatalCount: 0,
          firstFatalErrors: [],
          error: caughtError instanceof Error ? caughtError.message : 'Failed to load Achmage Markdown Renderer.',
          signature: null,
        });
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      loadRunIdRef.current += 1;
    };
  }, [publishLoadState, runVaultLoad]);

  useEffect(() => {
    if (
      !isTauriRuntime()
      || !settings?.selectedVaultPath
      || !loadState.signature
      || loadState.phase === 'scanning'
      || loadState.phase === 'validating'
    ) {
      return;
    }

    const pollId = window.setInterval(() => {
      void getVaultState(settings.selectedVaultPath as string)
        .then((nextState) => {
          if (nextState.signature === loadState.signature) {
            return;
          }

          return runVaultLoad(settings.selectedVaultPath as string).then((result) => {
            if (result) {
              window.dispatchEvent(new CustomEvent('vault_changed', {detail: nextState}));
            }
          });
        })
        .catch(() => {
          // Keep the previous load state visible when polling fails.
        });
    }, 1500);

    return () => {
      window.clearInterval(pollId);
    };
  }, [loadState.phase, loadState.signature, runVaultLoad, settings?.selectedVaultPath]);

  const loading = loadState.phase === 'scanning' || loadState.phase === 'validating';
  const error = loadState.phase === 'failed' ? loadState.error : null;

  return {
    settings,
    sourceDocuments,
    documents,
    loadState,
    loadErrors,
    loading,
    error,
    selectVault,
    refreshVault,
    persistSettings,
  };
};
