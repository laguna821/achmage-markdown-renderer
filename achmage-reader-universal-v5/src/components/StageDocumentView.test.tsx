// @vitest-environment jsdom

import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {NormalizedDoc} from '../core/content';

import {StageDocumentView} from './StageDocumentView';

const makeDoc = (): NormalizedDoc => {
  const longParagraph = `<p>${'Stage paragraph '.repeat(180)}</p>`.repeat(8);

  return {
    filePath: 'C:/vault/stage-ui.md',
    relativePath: 'stage-ui.md',
    sourceRoot: 'C:/vault',
    sourceDir: 'C:/vault',
    slug: 'stage-ui',
    baseDepth: 2,
    headings: [],
    warnings: [],
    meta: {
      title: 'Stage UI Lab',
      docType: 'note',
      outputs: ['reader'],
      theme: 'dark',
      tags: [],
      toc: 'auto',
      tocMaxDepth: 'auto',
      tocTitle: 'TABLE_OF_CONTENTS',
      stage: {
        enabled: true,
        focusMode: true,
        keyboardNav: true,
        revealLists: false,
      },
      rail: {
        showMetadata: true,
        showTags: true,
        showToc: true,
      },
    },
    sections: [
      {
        id: 'lead',
        title: 'Overview',
        depth: 1,
        blocks: [{kind: 'prose', html: '<p>Lead block</p>'}],
      },
      {
        id: 'section-one',
        title: 'Section One',
        depth: 2,
        anchorId: 'section-one',
        blocks: [{kind: 'prose', html: longParagraph}],
      },
      {
        id: 'section-two',
        title: 'Section Two',
        depth: 2,
        anchorId: 'section-two',
        blocks: [{kind: 'prose', html: '<p>Tail section</p>'}],
      },
    ],
  };
};

const mountStageView = async (doc: NormalizedDoc) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onNavigateDoc = vi.fn();

  await act(async () => {
    root.render(<StageDocumentView doc={doc} onNavigateDoc={onNavigateDoc} />);
    await Promise.resolve();
  });

  return {
    container,
    root,
    onNavigateDoc,
  };
};

describe('StageDocumentView', () => {
  let root: Root | null = null;

  beforeEach(() => {
    document.body.innerHTML = '<header class="site-header" style="height: 72px"></header>';
    vi.stubGlobal('scrollTo', vi.fn());
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => ({
        font: '',
        measureText: (text: string) => ({
          width: text.length * 12,
          actualBoundingBoxAscent: 24,
          actualBoundingBoxDescent: 8,
        }),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
      })),
    });
  });

  afterEach(async () => {
    if (root) {
      const mountedRoot = root;
      await act(async () => {
        mountedRoot.unmount();
      });
      root = null;
    }
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('uses the right-side rail for frame navigation and the bottom bar for logical groups', async () => {
    const mounted = await mountStageView(makeDoc());
    root = mounted.root;

    const groupCounter = () => document.querySelector('[data-stage-group-counter="true"]')?.textContent;
    const frameCounter = () => document.querySelector('[data-stage-frame-counter="true"]')?.textContent ?? null;
    const frameRail = () => document.querySelector<HTMLElement>('[data-stage-frame-rail="true"]');
    const frameDots = () => [...document.querySelectorAll<HTMLButtonElement>('.stage-shell__frame-dot')];

    expect(document.querySelector('[data-stage-root="true"]')).toBeTruthy();
    expect(document.querySelector('.doc-rail')).toBeNull();
    expect(document.querySelector('.mobile-toc')).toBeNull();
    expect(groupCounter()).toBe('1 / 3');
    expect(frameCounter()).toBeNull();
    expect(frameRail()?.hidden).toBe(true);

    const nextGroupButton = document.querySelector<HTMLButtonElement>('button[aria-label="Next stage group"]');
    if (!nextGroupButton) {
      throw new Error('next group button not found');
    }

    await act(async () => {
      nextGroupButton.click();
      await Promise.resolve();
    });

    expect(groupCounter()).toBe('2 / 3');
    expect(frameCounter()).toBe('2-1');
    expect(document.querySelector('.doc-section__title')?.textContent).toContain('Section One');
    expect(frameRail()?.hidden).toBe(false);
    expect(frameDots()).toHaveLength(Number(frameRail()?.dataset.stageFrameCount ?? '0'));

    const nextFrameButton = document.querySelector<HTMLButtonElement>('button[aria-label="Next stage frame"]');
    if (!nextFrameButton) {
      throw new Error('next frame button not found');
    }

    await act(async () => {
      nextFrameButton.click();
      await Promise.resolve();
    });

    expect(groupCounter()).toBe('2 / 3');
    expect(frameCounter()).toBe('2-2');
    expect(document.querySelector('.stage-frame__continued')?.textContent).toBe('CONT.');

    const nextBottomGroupButton = document.querySelector<HTMLButtonElement>('button[aria-label="Next stage group"]');
    if (!nextBottomGroupButton) {
      throw new Error('next bottom group button not found');
    }

    await act(async () => {
      nextBottomGroupButton.click();
      await Promise.resolve();
    });

    expect(groupCounter()).toBe('3 / 3');
    expect(frameCounter()).toBeNull();
    expect(frameRail()?.hidden).toBe(true);
    expect(document.querySelector('.doc-section__title')?.textContent).toContain('Section Two');

    const previousGroupButton = document.querySelector<HTMLButtonElement>('button[aria-label="Previous stage group"]');
    if (!previousGroupButton) {
      throw new Error('previous group button not found');
    }

    await act(async () => {
      previousGroupButton.click();
      await Promise.resolve();
    });

    expect(groupCounter()).toBe('2 / 3');
    expect(frameCounter()).toBe('2-1');
    expect(frameRail()?.hidden).toBe(false);
  });

  it('matches ultra-v3 keyboard semantics for logical groups and continued frames', async () => {
    const mounted = await mountStageView(makeDoc());
    root = mounted.root;

    const groupCounter = () => document.querySelector('[data-stage-group-counter="true"]')?.textContent;
    const frameCounter = () => document.querySelector('[data-stage-frame-counter="true"]')?.textContent ?? null;
    const frameRail = () => document.querySelector<HTMLElement>('[data-stage-frame-rail="true"]');

    const clickButton = async (label: string) => {
      const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
      if (!button) {
        throw new Error(`${label} button not found`);
      }

      await act(async () => {
        button.click();
        await Promise.resolve();
      });
    };

    const pressKey = async (key: string) => {
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}));
        await Promise.resolve();
      });
    };

    await clickButton('Next stage group');

    expect(groupCounter()).toBe('2 / 3');
    expect(frameCounter()).toBe('2-1');
    expect(frameRail()?.hidden).toBe(false);

    await pressKey('ArrowDown');
    expect(groupCounter()).toBe('2 / 3');
    expect(frameCounter()).toBe('2-2');

    await pressKey('ArrowUp');
    expect(groupCounter()).toBe('2 / 3');
    expect(frameCounter()).toBe('2-1');

    await pressKey('ArrowDown');
    expect(frameCounter()).toBe('2-2');

    await pressKey('ArrowLeft');
    expect(groupCounter()).toBe('2 / 3');
    expect(frameCounter()).toBe('2-1');

    const frameDots = [...document.querySelectorAll<HTMLButtonElement>('.stage-shell__frame-dot')];
    const lastFrameDot = frameDots.at(-1);
    if (!lastFrameDot) {
      throw new Error('last frame dot not found');
    }

    await act(async () => {
      lastFrameDot.click();
      await Promise.resolve();
    });

    expect(groupCounter()).toBe('2 / 3');
    expect(frameCounter()).toBe(`2-${frameDots.length}`);

    await pressKey('ArrowDown');
    expect(groupCounter()).toBe('3 / 3');
    expect(frameCounter()).toBeNull();

    await pressKey('PageUp');
    expect(groupCounter()).toBe('2 / 3');
    expect(frameCounter()).toBe('2-1');

    await pressKey('Home');
    expect(groupCounter()).toBe('1 / 3');
    expect(frameCounter()).toBeNull();

    await pressKey('End');
    expect(groupCounter()).toBe('3 / 3');
    expect(frameCounter()).toBeNull();
  });
});
