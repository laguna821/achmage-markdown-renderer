import type {NormalizedDoc, OutputMode} from '../core/content';
import {getDocumentModeLinks} from '../stage';

type ThemeState = {
  label: string;
  state: string;
};

type SiteHeaderProps = {
  appName: string;
  doc?: NormalizedDoc;
  modeLabel: string;
  activeOutput?: OutputMode;
  themeState: ThemeState;
  themeLocked: boolean;
  onThemeToggle: () => void;
  onHome: () => void;
  onOpenDoc: (output: OutputMode, slug: string, anchor?: string) => void;
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
  appName,
  doc,
  modeLabel,
  activeOutput,
  themeState,
  themeLocked,
  onThemeToggle,
  onHome,
  onOpenDoc,
  onSelectVault,
  onRescan,
  selectedVaultPath,
}: SiteHeaderProps) {
  const modeLinks = doc ? getDocumentModeLinks(doc, activeOutput) : [];
  const currentAnchor =
    typeof window !== 'undefined' && window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : undefined;

  return (
    <header className="site-header">
      <div className="site-header__brand">
        <button className="site-header__brand-button" type="button" onClick={onHome}>
          {appName}
        </button>
      </div>
      <div className="site-header__context">
        {doc ? (
          <div className="mode-switch" data-mode-switch="true" aria-label="Document modes">
            {modeLinks.map((link) => (
              <button
                key={`${doc.slug}-${link.output}`}
                type="button"
                className={`mode-switch__button${link.active ? ' mode-switch__button--active' : ''}`}
                aria-pressed={link.active}
                disabled={link.active}
                onClick={() => onOpenDoc(link.output, doc.slug, currentAnchor)}
              >
                {link.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="site-header__mode">{modeLabel}</span>
        )}
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
