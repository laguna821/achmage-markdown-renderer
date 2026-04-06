import {describe, expect, it} from 'vitest';

import {findClosestArticleAnchor, resolveArticleLinkAction} from './document-links';

const createAnchor = (href = '?view=reader&doc=target-note') =>
  ({
    tagName: 'A',
    getAttribute: (name: string) => (name === 'href' ? href : null),
    closest: () => null,
  }) as unknown as HTMLAnchorElement;

const createElement = (tagName: string, anchor: HTMLAnchorElement | null) =>
  ({
    tagName,
    closest: (selector: string) => (selector === 'a[href]' ? anchor : null),
  }) as unknown as Element;

const createTextNode = (parentElement: Element | null) =>
  ({
    parentElement,
  }) as unknown as Text;

describe('document link resolution', () => {
  const currentHref = 'http://localhost:1420/?view=reader&doc=current-note';

  it('resolves internal note routes with encoded anchors', () => {
    expect(resolveArticleLinkAction('?view=reader&doc=Markdown%20is%20all%20you%20need#Section%202', currentHref)).toEqual({
      type: 'doc-route',
      output: 'reader',
      slug: 'Markdown is all you need',
      anchor: 'Section 2',
    });
  });

  it('resolves relative note routes without depending on a raw prefix check', () => {
    expect(resolveArticleLinkAction('./?view=newsletter&doc=weekly-note', currentHref)).toEqual({
      type: 'doc-route',
      output: 'newsletter',
      slug: 'weekly-note',
      anchor: undefined,
    });
  });

  it('resolves in-document hash links', () => {
    expect(resolveArticleLinkAction('#Zoubeir%20Jlasssi', currentHref)).toEqual({
      type: 'hash',
      id: 'Zoubeir Jlasssi',
    });
  });

  it('keeps external links as external actions', () => {
    expect(resolveArticleLinkAction('https://example.com/docs', currentHref)).toEqual({
      type: 'external',
      href: 'https://example.com/docs',
    });
    expect(resolveArticleLinkAction('mailto:test@example.com', currentHref)).toEqual({
      type: 'external',
      href: 'mailto:test@example.com',
    });
  });

  it('ignores non-routable local href values', () => {
    expect(resolveArticleLinkAction('not-a-real-link', currentHref)).toBeNull();
  });

  it('finds anchors when the click target is text inside the link', () => {
    const anchor = createAnchor();
    const span = createElement('SPAN', anchor);
    const textNode = createTextNode(span);

    expect(findClosestArticleAnchor(textNode)).toBe(anchor);
  });

  it('finds anchors when the click target is a nested element inside the link', () => {
    const anchor = createAnchor();
    const strong = createElement('STRONG', anchor);

    expect(findClosestArticleAnchor(strong)).toBe(anchor);
  });

  it('falls back to composedPath entries when the direct target does not resolve', () => {
    const anchor = createAnchor('https://example.com');
    const directTarget = {tagName: 'SPAN', closest: () => null} as unknown as Element;

    expect(findClosestArticleAnchor(directTarget, [directTarget, anchor])).toBe(anchor);
  });

  it('returns null when no anchor exists in the target or composed path', () => {
    const span = createElement('SPAN', null);

    expect(findClosestArticleAnchor(span, [span])).toBeNull();
  });
});
