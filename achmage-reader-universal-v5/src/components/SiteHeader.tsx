import type {NormalizedDoc} from '../core/content';

type ThemeState = {
  label: string;
  state: string;
};

type SiteHeaderProps = {
  doc?: NormalizedDoc;
  modeLabel: string;
  themeState: ThemeState;
  themeLocked: boolean;
  onThemeToggle: () => void;
  onHome: () => void;
  onSelectVault: () => void;
  onRescan: () => void;
  selectedVaultPath: string | null;
};

const renderShortPath = (value: string | null): string => {
  if (!value) {
    return 'No vault selected';
  }

  const normalized = value.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  return segments.slice(-3).join(' / ') || normalized;
};

export function SiteHeader({
  doc,
  modeLabel,
  themeState,
  themeLocked,
  onThemeToggle,
  onHome,
  onSelectVault,
  onRescan,
  selectedVaultPath,
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__brand">
        <button className="site-header__brand-button" type="button" onClick={onHome}>
          Achmage Reader
        </button>
      </div>
      <div className="site-header__context">
        <span className="site-header__mode">{modeLabel}</span>
        <span className="site-header__title">{doc ? doc.meta.title : renderShortPath(selectedVaultPath)}</span>
        <button className="theme-toggle" type="button" onClick={onThemeToggle} disabled={themeLocked} data-theme-toggle>
          <span className="theme-toggle__orb" aria-hidden="true" />
          <span className="theme-toggle__label" data-theme-label>
            {themeState.label}
          </span>
          <span className="theme-toggle__state" data-theme-state>
            {themeState.state}
          </span>
        </button>
        <button className="home-search__clear" type="button" onClick={onSelectVault}>
          {selectedVaultPath ? 'Switch vault' : 'Select vault'}
        </button>
        {selectedVaultPath ? (
          <button className="home-search__clear" type="button" onClick={onRescan}>
            Rescan
          </button>
        ) : null}
      </div>
    </header>
  );
}
