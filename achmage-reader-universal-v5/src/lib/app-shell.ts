import type {OutputMode} from '../core/content';
import type {AppSettings} from './bridge';

export const APP_DISPLAY_NAME = 'Achmage Markdown Renderer';
export const APP_RELEASE_TITLE = 'Achmage Markdown Renderer v5 Universal Beta';

export type AppRoute =
  | {screen: 'home'}
  | {screen: 'doc'; output: OutputMode; slug: string; anchor?: string};

type RestoreRouteOptions = {
  hasAttemptedInitialRestore: boolean;
  hasExplicitDocRoute: boolean;
  route: AppRoute;
  settings: Pick<AppSettings, 'lastOpenDoc'> | null;
  documents: Array<{slug: string}>;
};

export const getInitialRestoreRoute = ({
  hasAttemptedInitialRestore,
  hasExplicitDocRoute,
  route,
  settings,
  documents,
}: RestoreRouteOptions): AppRoute | null => {
  if (hasAttemptedInitialRestore || hasExplicitDocRoute || route.screen !== 'home') {
    return null;
  }

  const lastOpenDoc = settings?.lastOpenDoc;
  if (!lastOpenDoc) {
    return null;
  }

  const matchingDoc = documents.find((document) => document.slug === lastOpenDoc.slug);
  if (!matchingDoc) {
    return null;
  }

  return {
    screen: 'doc',
    output: lastOpenDoc.outputMode,
    slug: lastOpenDoc.slug,
  };
};

export const clearLastOpenDoc = (settings: AppSettings): AppSettings => ({
  ...settings,
  lastOpenDoc: null,
});
