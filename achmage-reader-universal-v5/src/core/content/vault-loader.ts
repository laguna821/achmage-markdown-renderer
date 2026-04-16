import {applyObsidianPreprocessing, findDuplicateSlugGroups, parseSourceFile} from './ingest';
import {normalizeDocument} from './normalize';
import type {
  NormalizedDoc,
  SourceDocument,
  VaultFileBatch,
  VaultFileSnapshot,
  VaultLoadReport,
  VaultLoadState,
  VaultScan,
  VaultValidationError,
} from './types';

export const DEFAULT_VAULT_BATCH_SIZE = 100;
const MAX_VISIBLE_FATAL_ERRORS = 20;

type LoadVaultDocumentsOptions = {
  rootPath: string;
  scan: VaultScan;
  readVaultBatch: (rootPath: string, relativePaths: string[]) => Promise<VaultFileBatch>;
  batchSize?: number;
  onProgress?: (state: VaultLoadState, errors: VaultValidationError[]) => void;
};

export type LoadVaultDocumentsResult = {
  sourceDocuments: SourceDocument[];
  documents: NormalizedDoc[];
  errors: VaultValidationError[];
  loadState: VaultLoadState;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
};

export const createIdleVaultLoadState = (vaultPath: string | null = null): VaultLoadState => ({
  phase: 'idle',
  vaultPath,
  totalFiles: 0,
  validatedFiles: 0,
  fatalCount: 0,
  firstFatalErrors: [],
  error: null,
  signature: null,
});

export const buildVaultLoadReport = (
  loadState: VaultLoadState,
  errors: VaultValidationError[],
  generatedAt = new Date().toISOString(),
): VaultLoadReport => ({
  ...loadState,
  generatedAt,
  errors,
});

const createBaseState = (vaultPath: string, scan: VaultScan): VaultLoadState => ({
  phase: 'scanning',
  vaultPath,
  totalFiles: scan.files.length,
  validatedFiles: 0,
  fatalCount: 0,
  firstFatalErrors: [],
  error: null,
  signature: scan.state.signature,
});

const withErrors = (state: VaultLoadState, errors: VaultValidationError[]): VaultLoadState => ({
  ...state,
  fatalCount: errors.length,
  firstFatalErrors: errors.slice(0, MAX_VISIBLE_FATAL_ERRORS),
});

const chunk = <T,>(values: readonly T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }
  return batches;
};

export const loadVaultDocuments = async ({
  rootPath,
  scan,
  readVaultBatch,
  batchSize = DEFAULT_VAULT_BATCH_SIZE,
  onProgress,
}: LoadVaultDocumentsOptions): Promise<LoadVaultDocumentsResult> => {
  const errors: VaultValidationError[] = [];
  const metadataByRelativePath = new Map(scan.files.map((file) => [file.relativePath, file] as const));
  const sourceDocuments: SourceDocument[] = [];

  let loadState = createBaseState(rootPath, scan);
  onProgress?.(loadState, errors);

  loadState = {
    ...loadState,
    phase: 'validating',
  };
  onProgress?.(loadState, errors);

  const batches = chunk(scan.files, Math.max(1, batchSize));
  for (const batch of batches) {
    const relativePaths = batch.map((file) => file.relativePath);
    const currentRelativePath = relativePaths[relativePaths.length - 1];

    try {
      const batchContents = await readVaultBatch(rootPath, relativePaths);
      const contentByRelativePath = new Map(batchContents.files.map((file) => [file.relativePath, file.content] as const));

      for (const relativePath of relativePaths) {
        const metadata = metadataByRelativePath.get(relativePath);
        const content = contentByRelativePath.get(relativePath);

        if (!metadata || content === undefined) {
          errors.push({
            relativePath,
            stage: 'snapshot',
            message: `Failed to read a markdown payload for ${relativePath}.`,
          });
          continue;
        }

        try {
          const snapshotFile: VaultFileSnapshot = {
            ...metadata,
            content,
          };
          sourceDocuments.push(parseSourceFile(snapshotFile, rootPath));
        } catch (error) {
          errors.push({
            relativePath,
            stage: 'frontmatter',
            message: toErrorMessage(error),
          });
        }
      }
    } catch (error) {
      const message = toErrorMessage(error);
      relativePaths.forEach((relativePath) => {
        errors.push({
          relativePath,
          stage: 'snapshot',
          message,
        });
      });
    }

    loadState = withErrors(
      {
        ...loadState,
        currentRelativePath,
        validatedFiles: Math.min(scan.files.length, loadState.validatedFiles + batch.length),
      },
      errors,
    );
    onProgress?.(loadState, errors);
  }

  const duplicateGroups = findDuplicateSlugGroups(sourceDocuments);
  duplicateGroups.forEach((group) => {
    const message = group.hasExplicitSlug
      ? `Explicit slug collision detected for "${group.slug}" across: ${group.relativePaths.join(', ')}`
      : `Auto-generated slug collision detected for "${group.slug}" across: ${group.relativePaths.join(', ')}.`;

    group.relativePaths.forEach((relativePath) => {
      errors.push({
        relativePath,
        stage: 'slug',
        message,
      });
    });
  });

  if (errors.length > 0) {
    loadState = withErrors(
      {
        ...loadState,
        phase: 'blocked',
      },
      errors,
    );
    onProgress?.(loadState, errors);
    return {
      sourceDocuments: [],
      documents: [],
      errors,
      loadState,
    };
  }

  applyObsidianPreprocessing(sourceDocuments);

  const normalizedDocuments: NormalizedDoc[] = [];
  for (const sourceDocument of sourceDocuments) {
    try {
      normalizedDocuments.push(normalizeDocument(sourceDocument));
    } catch (error) {
      errors.push({
        relativePath: sourceDocument.relativePath,
        stage: 'markdown',
        message: toErrorMessage(error),
      });
    }
  }

  if (errors.length > 0) {
    loadState = withErrors(
      {
        ...loadState,
        phase: 'blocked',
      },
      errors,
    );
    onProgress?.(loadState, errors);
    return {
      sourceDocuments: [],
      documents: [],
      errors,
      loadState,
    };
  }

  loadState = {
    ...loadState,
    phase: 'ready',
    fatalCount: 0,
    firstFatalErrors: [],
    error: null,
  };
  onProgress?.(loadState, errors);

  return {
    sourceDocuments,
    documents: normalizedDocuments,
    errors,
    loadState,
  };
};
