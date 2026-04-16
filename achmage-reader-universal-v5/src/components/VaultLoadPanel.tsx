import type {VaultLoadState, VaultValidationError} from '../core/content';

type VaultLoadPanelProps = {
  loadState: VaultLoadState;
  loadErrors: VaultValidationError[];
  onRetry: () => void;
  onSelectVault: () => void;
};

const renderHeading = (phase: VaultLoadState['phase']): string => {
  switch (phase) {
    case 'scanning':
      return 'Scanning vault metadata';
    case 'validating':
      return 'Validating vault contents';
    case 'blocked':
      return 'Vault validation blocked';
    case 'failed':
      return 'Vault loading failed';
    default:
      return 'Vault status';
  }
};

const renderSummary = (loadState: VaultLoadState): string => {
  switch (loadState.phase) {
    case 'scanning':
      return 'The desktop app is discovering markdown files before it exposes the vault.';
    case 'validating':
      return 'The desktop app is validating notes in strict mode before it opens the document list.';
    case 'blocked':
      return 'One or more notes failed strict validation. Fix the reported files or switch to another vault.';
    case 'failed':
      return 'The vault could not be loaded because the desktop pipeline failed before validation completed.';
    default:
      return 'Vault status is unavailable.';
  }
};

export function VaultLoadPanel({loadState, loadErrors, onRetry, onSelectVault}: VaultLoadPanelProps) {
  const visibleErrors = loadState.firstFatalErrors.length > 0 ? loadState.firstFatalErrors : loadErrors.slice(0, 20);
  const actionable = loadState.phase === 'blocked' || loadState.phase === 'failed';

  return (
    <main className="home-shell">
      <section
        className={`vault-status${actionable ? ' vault-status--actionable' : ''}`}
        data-vault-status-panel="true"
        data-vault-phase={loadState.phase}
      >
        <div className="vault-status__eyebrow">Desktop Vault Loader</div>
        <h1>{renderHeading(loadState.phase)}</h1>
        <p className="vault-status__lede">{renderSummary(loadState)}</p>

        <dl className="vault-status__meta">
          <div>
            <dt>Vault path</dt>
            <dd>{loadState.vaultPath ?? 'No vault selected'}</dd>
          </div>
          <div>
            <dt>Discovered markdown count</dt>
            <dd>{loadState.totalFiles}</dd>
          </div>
          <div>
            <dt>Current phase</dt>
            <dd>{loadState.phase}</dd>
          </div>
          <div>
            <dt>Validated files</dt>
            <dd>
              {loadState.validatedFiles} / {loadState.totalFiles}
            </dd>
          </div>
          <div>
            <dt>Current file</dt>
            <dd>{loadState.currentRelativePath ?? 'Waiting for the next batch'}</dd>
          </div>
          <div>
            <dt>Fatal summary</dt>
            <dd>{loadState.fatalCount > 0 ? `${loadState.fatalCount} fatal issue(s)` : 'No fatal issues recorded'}</dd>
          </div>
        </dl>

        {loadState.error ? <p className="vault-status__error">{loadState.error}</p> : null}

        {visibleErrors.length > 0 ? (
          <div className="vault-status__errors">
            <h2>First fatal issues</h2>
            <ol>
              {visibleErrors.map((error, index) => (
                <li key={`${error.relativePath}-${error.stage}-${index}`}>
                  <strong>
                    [{error.stage}] {error.relativePath}
                  </strong>{' '}
                  {error.message}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="vault-status__actions">
          {actionable ? (
            <button className="home-search__clear" type="button" onClick={onRetry}>
              Retry validation
            </button>
          ) : null}
          <button className="home-search__clear" type="button" onClick={onSelectVault}>
            Switch vault
          </button>
        </div>
      </section>
    </main>
  );
}
