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
    expect(source).toContain("window.addEventListener('keydown', onScrollKeyDown)");
    expect(source).toContain("window.removeEventListener('keydown', onScrollKeyDown)");
    expect(source).toContain('const SCROLL_BURST_IDLE_MS = 140;');
    expect(source).toContain('pendingAdvanceBudget = 1;');
    expect(source).toContain("window.addEventListener('toc:activate-target'");
    expect(source).toContain("window.removeEventListener('toc:activate-target'");
    expect(source).toContain("new CustomEvent<string>('toc:activate-target'");
    expect(source).toContain("findActiveHeadingId(");
    expect(source).toContain("resolveVisibleHeadingIndex({");
    expect(source).toContain("article.querySelectorAll<HTMLElement>('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')");
    expect(source).toContain('const tocHeadingIds = new Set(flattenTocIds(doc.headings));');
    expect(source).not.toContain(".map((id) => document.getElementById(id))");
    expect(source).toContain('window.__ACHMAGE_TOC_DEBUG__');
    expect(source).toContain('absoluteTargetId');
    expect(source).toContain('visibleActiveId');
    expect(source).toContain('const scrollChanged = scrollTop !== lastScrollTop;');
    expect(source).toContain("scrollElementIntoViewWithOffset(target, 'auto');");
    expect(source).toContain("scrollElementIntoViewWithOffset(targetElement, 'smooth');");
    expect(source).toContain("window.history.pushState(null, '', `#${encodeURIComponent(targetId)}`);");
    expect(source).not.toContain("target.scrollIntoView({behavior: 'smooth', block: 'start'})");
    expect(source).toContain("const activate = (id: string): boolean => {");
    expect(source).toContain("const changed = activeId !== id;");
    expect(source).toContain("link.classList.toggle('is-active', link.getAttribute('data-toc-item') === id)");
    expect(source).not.toMatch(
      /const activate = \(id: string\) => \{[\s\S]*?revealActiveLinks\(id\);[\s\S]*?\n\s+\};/,
    );
    expect(source).toContain("const onRevealActive = () => {");
    expect(source).toContain("revealActiveLinks(activeId, true);");
    expect(source).not.toContain('needsAnotherFrame');
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

  it('keeps anchor jumps below the sticky header and dark surfaces close to the cmdspace reference', () => {
    const baseCss = readSource('styles', 'base.css');
    const blocksCss = readSource('styles', 'blocks.css');
    const tokensCss = readSource('styles', 'tokens.css');
    const darkBlocksSection =
      blocksCss.match(/:root\[data-theme='dark'\] \.thesis-block,[\s\S]*?:root\[data-theme='dark'\] \.log-block \{[\s\S]*?\n\}/)?.[0] ??
      '';

    expect(baseCss).toContain('.doc-article :is(h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]) {');
    expect(baseCss).toContain('scroll-margin-top: calc(5rem + var(--space-4));');
    expect(tokensCss).toContain("--color-canvas: #020302;");
    expect(tokensCss).toContain("--color-surface: #070905;");
    expect(tokensCss).toContain("--color-surface-muted: #0b0e08;");
    expect(tokensCss).toContain("--color-border: #243004;");
    expect(tokensCss).toContain("--color-border-strong: #596909;");
    expect(darkBlocksSection).toContain(":root[data-theme='dark'] .thesis-block,");
    expect(darkBlocksSection).toContain('linear-gradient(180deg, rgba(204, 254, 3, 0.028), rgba(204, 254, 3, 0) 42%),');
    expect(baseCss).toContain(":root[data-theme='dark'] .doc-paper {");
    expect(baseCss).toContain('linear-gradient(180deg, rgba(204, 254, 3, 0.022), rgba(204, 254, 3, 0) 16%),');
  });
});
