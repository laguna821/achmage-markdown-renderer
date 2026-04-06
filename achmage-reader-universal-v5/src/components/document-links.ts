import type {OutputMode} from '../core/content';

export type ArticleLinkAction =
  | {type: 'external'; href: string}
  | {type: 'hash'; id: string}
  | {type: 'doc-route'; output: OutputMode; slug: string; anchor?: string};

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
