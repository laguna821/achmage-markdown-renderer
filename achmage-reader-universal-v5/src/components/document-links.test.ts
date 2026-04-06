import {describe, expect, it} from 'vitest';

import {resolveArticleLinkAction} from './document-links';

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
});
