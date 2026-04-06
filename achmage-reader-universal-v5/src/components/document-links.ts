import type {OutputMode} from '../core/content';

export type ArticleLinkAction =
  | {type: 'external'; href: string}
  | {type: 'hash'; id: string}
  | {type: 'doc-route'; output: OutputMode; slug: string; anchor?: string};

export type ArticleLinkDebugEntry = {
  targetKind: string | null;
  href: string | null;
  actionType: ArticleLinkAction['type'] | 'unresolved' | null;
  prevented: boolean;
  slug?: string;
};

type HandleArticleLinkClickOptions = {
  event: MouseEvent;
  currentHref: string;
  onDocRoute: (output: OutputMode, slug: string, anchor?: string) => void;
  onHash: (id: string, anchor: HTMLAnchorElement) => void;
  onExternal: (href: string) => void;
  onDebug?: (entry: ArticleLinkDebugEntry) => void;
};

const EXTERNAL_PROTOCOL_PATTERN = /^(https?:|mailto:)/i;

const isOutputMode = (value: string | null): value is OutputMode =>
  value === 'reader' || value === 'stage' || value === 'newsletter';

const safeParseUrl = (href: string, currentHref?: string): URL | null => {
  try {
    return currentHref ? new URL(href, currentHref) : new URL(href);
  } catch {
    return null;
  }
};

const hasClosest = (value: unknown): value is {closest: (selector: string) => unknown} =>
  typeof value === 'object' && value !== null && 'closest' in value && typeof value.closest === 'function';

const hasParentElement = (value: unknown): value is {parentElement: {closest: (selector: string) => unknown} | null} =>
  typeof value === 'object' && value !== null && 'parentElement' in value;

const isAnchorElement = (value: unknown): value is HTMLAnchorElement =>
  typeof value === 'object' &&
  value !== null &&
  'tagName' in value &&
  typeof value.tagName === 'string' &&
  value.tagName.toLowerCase() === 'a' &&
  'getAttribute' in value &&
  typeof value.getAttribute === 'function';

const resolveAnchorCandidate = (value: unknown): HTMLAnchorElement | null => {
  if (isAnchorElement(value)) {
    return value;
  }

  if (hasClosest(value)) {
    const closest = value.closest('a[href]');
    if (isAnchorElement(closest)) {
      return closest;
    }
  }

  if (hasParentElement(value) && value.parentElement && hasClosest(value.parentElement)) {
    const closest = value.parentElement.closest('a[href]');
    if (isAnchorElement(closest)) {
      return closest;
    }
  }

  return null;
};

const getTargetKind = (value: EventTarget | null): string | null => {
  if (!value) {
    return null;
  }

  if (typeof Text !== 'undefined' && value instanceof Text) {
    return '#text';
  }

  if (typeof Element !== 'undefined' && value instanceof Element) {
    return value.tagName.toLowerCase();
  }

  return value.constructor?.name ?? typeof value;
};

export const findClosestArticleAnchor = (
  target: EventTarget | null,
  composedPath?: readonly EventTarget[],
): HTMLAnchorElement | null => {
  const directMatch = resolveAnchorCandidate(target);
  if (directMatch) {
    return directMatch;
  }

  if (!composedPath) {
    return null;
  }

  for (const entry of composedPath) {
    const candidate = resolveAnchorCandidate(entry);
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

export const resolveArticleLinkAction = (href: string, currentHref: string): ArticleLinkAction | null => {
  const trimmedHref = href.trim();
  if (!trimmedHref) {
    return null;
  }

  const usesExternalProtocol = EXTERNAL_PROTOCOL_PATTERN.test(trimmedHref);

  if (trimmedHref.startsWith('#')) {
    return {
      type: 'hash',
      id: decodeURIComponent(trimmedHref.slice(1)),
    };
  }

  const currentUrl = safeParseUrl(currentHref);
  const url = safeParseUrl(trimmedHref, currentHref);
  if (!url) {
    return null;
  }

  const output = url.searchParams.get('view');
  const slug = url.searchParams.get('doc');
  if (isOutputMode(output) && slug) {
    return {
      type: 'doc-route',
      output,
      slug,
      anchor: url.hash ? decodeURIComponent(url.hash.slice(1)) : undefined,
    };
  }

  if (
    currentUrl &&
    url.origin === currentUrl.origin &&
    url.pathname === currentUrl.pathname &&
    url.search === currentUrl.search &&
    url.hash
  ) {
    return {
      type: 'hash',
      id: decodeURIComponent(url.hash.slice(1)),
    };
  }

  if (usesExternalProtocol || (currentUrl && url.origin !== currentUrl.origin)) {
    return {
      type: 'external',
      href: usesExternalProtocol ? trimmedHref : url.toString(),
    };
  }

  return null;
};

export const handleArticleLinkClick = ({
  event,
  currentHref,
  onDocRoute,
  onHash,
  onExternal,
  onDebug,
}: HandleArticleLinkClickOptions): boolean => {
  const composedPath = typeof event.composedPath === 'function' ? event.composedPath() : undefined;
  const anchor = findClosestArticleAnchor(event.target, composedPath);
  const debugEntry: ArticleLinkDebugEntry = {
    targetKind: getTargetKind(event.target),
    href: anchor?.getAttribute('href') ?? null,
    actionType: null,
    prevented: false,
  };

  if (!anchor || event.defaultPrevented || event.button !== 0) {
    onDebug?.(debugEntry);
    return false;
  }

  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || anchor.hasAttribute('download')) {
    onDebug?.(debugEntry);
    return false;
  }

  const href = anchor.getAttribute('href') ?? '';
  if (!href) {
    onDebug?.(debugEntry);
    return false;
  }

  const action = resolveArticleLinkAction(href, currentHref);
  if (!action) {
    onDebug?.({
      ...debugEntry,
      href,
      actionType: 'unresolved',
    });
    return false;
  }

  debugEntry.href = href;
  debugEntry.actionType = action.type;

  if (action.type === 'external') {
    event.preventDefault();
    debugEntry.prevented = event.defaultPrevented;
    onDebug?.(debugEntry);
    onExternal(action.href);
    return true;
  }

  if (action.type === 'doc-route') {
    event.preventDefault();
    debugEntry.prevented = event.defaultPrevented;
    debugEntry.slug = action.slug;
    onDebug?.(debugEntry);
    onDocRoute(action.output, action.slug, action.anchor);
    return true;
  }

  const targetElement = document.getElementById(action.id);
  if (!targetElement) {
    onDebug?.(debugEntry);
    return false;
  }

  event.preventDefault();
  debugEntry.prevented = event.defaultPrevented;
  onDebug?.(debugEntry);
  onHash(action.id, anchor);
  return true;
};
