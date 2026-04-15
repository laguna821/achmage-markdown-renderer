import {useEffect, useMemo, useRef, useState} from 'react';

import {parseHomeSearchState, type HomeSearchState, type OutputMode} from './core/content';
import {SiteHeader} from './components/SiteHeader';
import {DocumentView} from './components/DocumentView';
import {HomeView} from './components/HomeView';
import {StageDocumentView} from './components/StageDocumentView';
import {useAchmageApp} from './hooks/useAchmageApp';
import {APP_DISPLAY_NAME, clearLastOpenDoc, getInitialRestoreRoute, type AppRoute} from './lib/app-shell';

const themeOrder = ['light', 'dark', 'aurora', 'cyber_sanctuary'] as const;
const themeMeta = {
  light: {
    label: 'LIGHT MODE',
    state: '1 / 4',
  },
  dark: {
    label: 'DARK MODE',
    state: '2 / 4',
  },
  aurora: {
    label: 'AURORA GLOW',
    state: '3 / 4',
  },
  cyber_sanctuary: {
    label: 'CYBER SANCTUARY',
    state: '4 / 4',
  },
} as const;

const isSupportedTheme = (value: string | null | undefined): value is keyof typeof themeMeta =>
  Boolean(value) && themeOrder.includes(value as keyof typeof themeMeta);

const parseRouteFromLocation = (): AppRoute => {
  const params = new URLSearchParams(window.location.search);
  const output = params.get('view');
  const slug = params.get('doc');
  const anchor = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : undefined;

  if ((output === 'reader' || output === 'stage' || output === 'newsletter') && slug) {
    return {
      screen: 'doc',
      output,
      slug,
      anchor,
    };
  }

  return {screen: 'home'};
};

const applyRouteToLocation = (route: AppRoute, searchState: HomeSearchState, replace = false): void => {
  const url = new URL(window.location.href);

  if (route.screen === 'doc') {
    url.searchParams.set('view', route.output);
    url.searchParams.set('doc', route.slug);
    url.searchParams.delete('q');
    url.searchParams.delete('tags');
    url.hash = route.anchor ? `#${route.anchor}` : '';
  } else {
    url.searchParams.delete('view');
    url.searchParams.delete('doc');
    if (searchState.query.trim()) {
      url.searchParams.set('q', searchState.query.trim());
    } else {
      url.searchParams.delete('q');
    }

    if (searchState.tags.length > 0) {
      url.searchParams.set('tags', searchState.tags.join(','));
    } else {
      url.searchParams.delete('tags');
    }
    url.hash = '';
  }

  if (replace) {
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  } else {
    window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
};

function App() {
  const {settings, documents, sourceDocuments, loading, error, selectVault, refreshVault, persistSettings} = useAchmageApp();
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window === 'undefined' ? {screen: 'home'} : parseRouteFromLocation(),
  );
  const [homeSearchState, setHomeSearchState] = useState<HomeSearchState>(() =>
    typeof window === 'undefined' ? {query: '', tags: []} : parseHomeSearchState(window.location.search),
  );
  const [themeName, setThemeName] = useState<keyof typeof themeMeta>('light');
  const hasAttemptedInitialRestore = useRef(false);

  useEffect(() => {
    const syncFromLocation = () => {
      setRoute(parseRouteFromLocation());
      setHomeSearchState(parseHomeSearchState(window.location.search));
    };

    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);

    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('hashchange', syncFromLocation);
    };
  }, []);

  const activeDoc = useMemo(() => {
    if (route.screen !== 'doc') {
      return null;
    }

    return documents.find((document) => document.slug === route.slug) ?? null;
  }, [documents, route]);

  useEffect(() => {
    if (loading || hasAttemptedInitialRestore.current) {
      return;
    }

    const nextRoute = getInitialRestoreRoute({
      hasAttemptedInitialRestore: hasAttemptedInitialRestore.current,
      hasExplicitDocRoute: new URLSearchParams(window.location.search).get('view') !== null,
      route,
      settings,
      documents,
    });

    hasAttemptedInitialRestore.current = true;
    if (!nextRoute) {
      return;
    }

    setRoute(nextRoute);
    applyRouteToLocation(nextRoute, homeSearchState, true);
  }, [documents, homeSearchState, loading, route, settings]);

  useEffect(() => {
    if (!activeDoc || !settings || route.screen !== 'doc') {
      return;
    }

    void persistSettings((current) => ({
      ...current,
      lastOpenDoc: {
        slug: activeDoc.slug,
        outputMode: route.output,
      },
    }));
  }, [activeDoc, persistSettings, route, settings]);

  useEffect(() => {
    const preferredTheme =
      (settings?.preferredTheme && isSupportedTheme(settings.preferredTheme) ? settings.preferredTheme : null)
      ?? (typeof window !== 'undefined' && isSupportedTheme(window.localStorage.getItem('achmage-theme'))
        ? (window.localStorage.getItem('achmage-theme') as keyof typeof themeMeta)
        : 'light');

    setThemeName(preferredTheme);
  }, [settings?.preferredTheme]);

  const effectiveTheme = activeDoc && activeDoc.meta.theme !== 'auto' ? activeDoc.meta.theme : themeName;
  const themeLocked = Boolean(activeDoc && activeDoc.meta.theme !== 'auto');

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.dataset.theme = effectiveTheme;
    root.dataset.themeDefault = effectiveTheme;
    root.dataset.themeLocked = String(themeLocked);
    root.style.colorScheme = effectiveTheme === 'dark' || effectiveTheme === 'cyber_sanctuary' ? 'dark' : 'light';

    body.className = route.screen === 'doc' ? `mode-${route.output}` : 'mode-home';
    body.dataset.outputMode = route.screen === 'doc' ? route.output : 'home';
    body.dataset.docSlug = activeDoc?.slug ?? '';
    body.dataset.pretextEnabled = route.screen === 'doc' ? 'true' : 'false';
  }, [activeDoc?.slug, effectiveTheme, route, themeLocked]);

  const themeState = themeMeta[effectiveTheme];

  const onThemeToggle = () => {
    if (themeLocked) {
      return;
    }

    const currentIndex = themeOrder.indexOf(themeName);
    const nextTheme = themeOrder[(currentIndex + 1 + themeOrder.length) % themeOrder.length];
    setThemeName(nextTheme);
    window.localStorage.setItem('achmage-theme', nextTheme);

    if (settings) {
      void persistSettings((current) => ({
        ...current,
        preferredTheme: nextTheme,
      }));
    }
  };

  const navigateHome = () => {
    hasAttemptedInitialRestore.current = true;
    const nextRoute: AppRoute = {screen: 'home'};
    setRoute(nextRoute);
    applyRouteToLocation(nextRoute, homeSearchState);
    if (settings?.lastOpenDoc) {
      void persistSettings((current) => clearLastOpenDoc(current));
    }
  };

  const navigateDoc = (output: OutputMode, slug: string, anchor?: string) => {
    const nextRoute: AppRoute = {screen: 'doc', output, slug, anchor};
    setRoute(nextRoute);
    applyRouteToLocation(nextRoute, homeSearchState);
  };

  const onSearchStateChange = (nextState: HomeSearchState) => {
    setHomeSearchState(nextState);
    if (route.screen === 'home') {
      applyRouteToLocation({screen: 'home'}, nextState, true);
    }
  };

  const modeLabel = route.screen === 'doc' ? route.output.toUpperCase() : 'HOME';

  return (
    <>
      <SiteHeader
        appName={APP_DISPLAY_NAME}
        doc={activeDoc ?? undefined}
        modeLabel={modeLabel}
        activeOutput={route.screen === 'doc' ? route.output : undefined}
        themeState={themeState}
        themeLocked={themeLocked}
        onThemeToggle={onThemeToggle}
        onHome={navigateHome}
        onOpenDoc={navigateDoc}
        onSelectVault={selectVault}
        onRescan={() => void refreshVault()}
        selectedVaultPath={settings?.selectedVaultPath ?? null}
      />
      {error ? (
        <main className="home-shell">
          <section className="home-search__empty">
            <p>{error}</p>
            <button type="button" onClick={() => void refreshVault()}>
              Retry
            </button>
          </section>
        </main>
      ) : null}
      {!error && route.screen === 'doc' && activeDoc ? (
        route.output === 'stage' ? (
          <StageDocumentView doc={activeDoc} onNavigateDoc={navigateDoc} />
        ) : (
          <DocumentView doc={activeDoc} output={route.output} onNavigateDoc={navigateDoc} />
        )
      ) : null}
      {!error && (route.screen === 'home' || !activeDoc) ? (
        <HomeView
          docs={documents}
          sourceDocuments={sourceDocuments}
          selectedVaultPath={settings?.selectedVaultPath ?? null}
          loading={loading}
          searchState={homeSearchState}
          onSearchStateChange={onSearchStateChange}
          onOpenDoc={navigateDoc}
          onSelectVault={selectVault}
          onRescan={() => void refreshVault()}
        />
      ) : null}
    </>
  );
}

export default App;
