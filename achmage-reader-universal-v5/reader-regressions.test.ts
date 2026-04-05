import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {describe, expect, it} from 'vitest';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src');

const readSource = (...segments: string[]) =>
  readFileSync(path.join(rootDir, ...segments), 'utf8').replace(/\r\n/g, '\n');

describe('reader regressions', () => {
  it('keeps the ToC sync effect aligned with live article headings and explicit reveal events', () => {
    const source = readSource('components', 'DocumentView.tsx');
    expect(source).toContain("window.addEventListener('toc:reveal-active'");
    expect(source).toContain("window.removeEventListener('toc:reveal-active'");
    expect(source).toContain("window.dispatchEvent(new Event('toc:reveal-active'))");
    expect(source).toContain("findActiveHeadingId(");
    expect(source).toContain("article.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')");
    expect(source).toContain('const tocHeadingIds = new Set(flattenTocIds(doc.headings));');
    expect(source).not.toContain(".map((id) => document.getElementById(id))");
    expect(source).toContain('window.__ACHMAGE_TOC_DEBUG__');
    expect(source).toContain("const activate = (id: string): boolean => {");
    expect(source).toContain("const changed = activeId !== id;");
    expect(source).toContain("link.classList.toggle('is-active', link.getAttribute('data-toc-item') === id)");
    expect(source).not.toMatch(
      /const activate = \(id: string\) => \{[\s\S]*?revealActiveLinks\(id\);[\s\S]*?\n\s+\};/,
    );
    expect(source).toContain("const onRevealActive = () => {");
    expect(source).toContain("revealActiveLinks(activeId, true);");
  });

  it('uses the rail as the desktop ToC scroll root and keeps the ToC panel itself non-scrollable', () => {
    const railSource = readSource('components', 'DocRail.tsx');
    const baseCss = readSource('styles', 'base.css');
    const tocPanelBlock = baseCss.match(/\.doc-rail__panel--toc \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(railSource).toContain('<aside className="doc-rail" aria-label="Document rail" data-toc-scroll-root="desktop">');
    expect(railSource).not.toContain('doc-rail__panel--toc" data-rail-kind="toc" data-toc-scroll-root="desktop"');
    expect(tocPanelBlock).toContain('min-height: fit-content;');
    expect(tocPanelBlock).not.toContain('max-height:');
    expect(tocPanelBlock).not.toContain('overflow-y: auto;');
    expect(tocPanelBlock).not.toContain('overscroll-behavior: contain;');
    expect(tocPanelBlock).not.toContain('scrollbar-gutter: stable;');
    expect(tocPanelBlock).not.toContain('scroll-behavior: auto;');
  });

  it('keeps code blocks free of inline code highlight fills in prose and log blocks', () => {
    const proseCss = readSource('styles', 'prose.css');
    const blocksCss = readSource('styles', 'blocks.css');

    expect(proseCss).toContain(":root[data-theme='dark'] .prose-block pre > code");
    expect(proseCss).toContain(":root[data-theme='light'] .prose-block pre > code");
    expect(blocksCss).toContain('.log-block pre > code');
  });
});
