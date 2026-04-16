// @vitest-environment jsdom

import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {NormalizedDoc, ThemeMode} from '../core/content';

import {StageDocumentView} from './StageDocumentView';

const makeDoc = ({
  title = 'Stage UI Lab',
  theme = 'dark',
  sections,
}: {
  title?: string;
  theme?: ThemeMode;
  sections?: NormalizedDoc['sections'];
} = {}): NormalizedDoc => {
  const longParagraph = `<p>${'Stage paragraph '.repeat(180)}</p>`.repeat(8);
  const defaultSections: NormalizedDoc['sections'] = [
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
  ];

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
      title,
      docType: 'note',
      outputs: ['reader'],
      theme,
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
    sections: sections ?? defaultSections,
  };
};

const mountStageView = async (doc: NormalizedDoc, options: {theme?: ThemeMode; width?: number; height?: number} = {}) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const onNavigateDoc = vi.fn();
  const theme = options.theme ?? doc.meta.theme;
  const width = options.width ?? 1440;
  const height = options.height ?? 980;

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  });
  document.documentElement.dataset.theme = theme;
  document.body.className = 'mode-stage';

  await act(async () => {
    root.render(<StageDocumentView doc={doc} theme={theme} onNavigateDoc={onNavigateDoc} />);
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
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders stage as a full-viewport canvas without the status dock or paper shell', async () => {
    const mounted = await mountStageView(
      makeDoc({
        title:
          'A very long stage section title that should render inside the shared stage canvas instead of a left dock',
      }),
      {width: 1500},
    );
    root = mounted.root;

    const stageRoot = document.querySelector<HTMLElement>('[data-stage-root="true"]');
    const stageCanvas = document.querySelector<HTMLElement>('[data-stage-canvas="true"]');
    const controlsBar = document.querySelector<HTMLElement>('[data-stage-controls-bar="true"]');

    expect(stageRoot).toBeTruthy();
    expect(stageCanvas).toBeTruthy();
    expect(stageRoot?.dataset.stageScalePreset).toBe('standard');
    expect(stageCanvas?.dataset.stageScalePreset).toBe('standard');
    expect(document.querySelector('[data-stage-status-dock="true"]')).toBeNull();
    expect(document.querySelector('.stage-paper')).toBeNull();
    expect(document.querySelector('[data-stage-surface="true"]')).toBeTruthy();
    expect(controlsBar).toBeTruthy();
    expect(document.querySelector('[data-stage-group-counter="true"]')?.textContent).toBe('1 / 3');
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
    expect(document.querySelector('.stage-surface__title')?.textContent).toContain('Section One');
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
    expect(document.querySelector('[data-stage-continued-inline="true"]')?.textContent).toBe('(cont.)');

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
    expect(document.querySelector('.stage-surface__title')?.textContent).toContain('Section Two');

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

  it('renders light-theme stage section titles above the divider line', async () => {
    const mounted = await mountStageView(makeDoc({theme: 'light'}), {theme: 'light'});
    root = mounted.root;

    const nextGroupButton = document.querySelector<HTMLButtonElement>('button[aria-label="Next stage group"]');
    if (!nextGroupButton) {
      throw new Error('next group button not found');
    }

    await act(async () => {
      nextGroupButton.click();
      await Promise.resolve();
    });

    const heading = document.querySelector<HTMLElement>('[data-stage-heading-style="title-above-rule"]');
    const title = heading?.querySelector('.stage-surface__title');
    const rule = heading?.querySelector('.stage-section-heading__rule');

    expect(heading).toBeTruthy();
    expect(title?.textContent).toContain('Section One');
    expect(rule).toBeTruthy();
    if (!title || !rule) {
      throw new Error('light theme stage heading nodes not found');
    }
    expect(Boolean(title.compareDocumentPosition(rule) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('renders lead frames inside the shared stage surface without doc-section shells', async () => {
    const mounted = await mountStageView(
      makeDoc({
        title: 'Header Only Lead',
        sections: [{id: 'lead', title: 'Overview', depth: 1, blocks: []}],
      }),
    );
    root = mounted.root;

    expect(document.querySelector('.stage-lead-header')).toBeTruthy();
    expect(document.querySelector('[data-stage-lead-shell="true"]')).toBeTruthy();
    expect(document.querySelector('[data-stage-surface="true"]')).toBeTruthy();
    expect(document.querySelector('.doc-section')).toBeNull();
    expect(document.querySelector('[data-stage-frame-has-body="false"]')).toBeTruthy();
  });

  it('renders non-lead frames as stage surfaces instead of doc-section shells', async () => {
    const sparseDoc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {
          id: 'toc-like',
          title: 'Contents',
          depth: 2,
          blocks: [{kind: 'prose', html: '<ul><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>'}],
        },
        {
          id: 'image-group',
          title: 'Image Group',
          depth: 2,
          blocks: [{kind: 'image', src: '/assets/sparse-image.png', alt: 'Sparse image', caption: 'Image caption'}],
        },
      ],
    });

    const mounted = await mountStageView(sparseDoc);
    root = mounted.root;

    const nextGroupButton = document.querySelector<HTMLButtonElement>('button[aria-label="Next stage group"]');
    if (!nextGroupButton) {
      throw new Error('next group button not found');
    }

    await act(async () => {
      nextGroupButton.click();
      await Promise.resolve();
    });

    const sparseSurface = document.querySelector<HTMLElement>('[data-stage-surface="true"]');
    const sparseBody = document.querySelector<HTMLElement>('[data-stage-surface-body="true"]');
    expect(document.querySelector('.doc-section')).toBeNull();
    expect(sparseSurface?.dataset.stageLayoutIntent).toBe('section-text');
    expect(sparseSurface?.dataset.stageFrameHasBody).toBe('true');
    expect(sparseSurface?.dataset.stageAvailableHeight).toBeTruthy();
    expect(sparseBody).toBeTruthy();

    await act(async () => {
      nextGroupButton.click();
      await Promise.resolve();
    });

    const imageSurface = document.querySelector<HTMLElement>('[data-stage-surface="true"]');
    const imageViewport = document.querySelector<HTMLElement>('.image-block__stage-viewport');
    const imageFigure = document.querySelector<HTMLElement>('.image-block--stage');

    expect(document.querySelector('.doc-section')).toBeNull();
    expect(imageSurface?.dataset.stageLayoutIntent).toBe('media');
    expect(imageViewport?.dataset.stageImageViewport).toBe('true');
    expect(imageFigure?.dataset.stageImageShape).toBe('unknown');
  });

  it('renders summary and quote frames as stage-native surfaces while keeping stage block hooks', async () => {
    const doc = makeDoc({
      sections: [
        {id: 'lead', title: 'Overview', depth: 1, blocks: []},
        {
          id: 'summary',
          title: 'Summary or Key Trigger',
          depth: 2,
          blocks: [{kind: 'callout', calloutType: 'summary', title: '3줄 요약', content: '<p>짧은 핵심 요약.</p>'}],
        },
        {
          id: 'quote',
          title: 'Quote',
          depth: 2,
          blocks: [{kind: 'docQuote', content: '<p>짧은 인용문.</p>'}],
        },
      ],
    });

    const mounted = await mountStageView(doc);
    root = mounted.root;

    const nextGroupButton = document.querySelector<HTMLButtonElement>('button[aria-label="Next stage group"]');
    if (!nextGroupButton) {
      throw new Error('next group button not found');
    }

    await act(async () => {
      nextGroupButton.click();
      await Promise.resolve();
    });

    const summaryFrame = document.querySelector<HTMLElement>('.stage-frame');
    const summarySurface = document.querySelector<HTMLElement>('[data-stage-surface="true"]');
    const summaryBody = document.querySelector<HTMLElement>('[data-stage-surface-body="true"]');
    const summaryCallout = document.querySelector<HTMLElement>('.callout-block--stage');

    expect(summaryFrame?.dataset.stageLayoutIntent).toBe('section-text');
    expect(summaryFrame?.dataset.stageScalePreset).toBe('standard');
    expect(summaryFrame?.dataset.stageFocusScale).toBeTruthy();
    expect(summaryFrame?.dataset.stageSoloBlockKind).toBe('callout');
    expect(summarySurface?.dataset.stageLayoutIntent).toBe('section-text');
    expect(summarySurface?.dataset.stageSoloBlockKind).toBe('callout');
    expect(summaryBody).toBeTruthy();
    expect(document.querySelector('.doc-section')).toBeNull();
    expect(summaryCallout?.dataset.stageBlockKind).toBe('callout');

    await act(async () => {
      nextGroupButton.click();
      await Promise.resolve();
    });

    const quoteFrame = document.querySelector<HTMLElement>('.stage-frame');
    const quoteBlock = document.querySelector<HTMLElement>('.doc-quote--stage');

    expect(quoteFrame?.dataset.stageLayoutIntent).toBe('section-text');
    expect(quoteFrame?.dataset.stageSoloBlockKind).toBe('docQuote');
    expect(document.querySelector<HTMLElement>('[data-stage-surface="true"]')).toBeTruthy();
    expect(quoteBlock?.dataset.stageBlockKind).toBe('docQuote');
  });

  it('marks stage prose blocks with stage-specific hooks while keeping theme preset stable', async () => {
    const mounted = await mountStageView(
      makeDoc({
        sections: [
          {id: 'lead', title: 'Overview', depth: 1, blocks: []},
          {id: 'toc-like', title: 'Contents', depth: 2, blocks: [{kind: 'prose', html: '<ul><li>Alpha</li><li>Beta</li></ul>'}]},
        ],
      }),
      {theme: 'cyber_sanctuary', width: 1600},
    );
    root = mounted.root;

    const nextGroupButton = document.querySelector<HTMLButtonElement>('button[aria-label="Next stage group"]');
    if (!nextGroupButton) {
      throw new Error('next group button not found');
    }

    await act(async () => {
      nextGroupButton.click();
      await Promise.resolve();
    });

    const stageRoot = document.querySelector<HTMLElement>('[data-stage-root="true"]');
    const proseBlock = document.querySelector<HTMLElement>('.prose-block--stage');

    expect(stageRoot?.dataset.stageScalePreset).toBe('standard');
    expect(proseBlock?.dataset.stageBlockKind).toBe('prose');
  });

  it('uses centered stage balance for underfilled section-text frames', async () => {
    const mounted = await mountStageView(
      makeDoc({
        sections: [
          {id: 'lead', title: 'Overview', depth: 1, blocks: []},
          {
            id: 'underfilled',
            title: 'Underfilled',
            depth: 2,
            blocks: [{kind: 'prose', html: '<p>Short stage paragraph.</p>'}],
          },
        ],
      }),
      {width: 1600, height: 980},
    );
    root = mounted.root;

    const nextGroupButton = document.querySelector<HTMLButtonElement>('button[aria-label="Next stage group"]');
    if (!nextGroupButton) {
      throw new Error('next group button not found');
    }

    await act(async () => {
      nextGroupButton.click();
      await Promise.resolve();
    });

    const stageFrame = document.querySelector<HTMLElement>('.stage-frame');
    const stageSurface = document.querySelector<HTMLElement>('[data-stage-surface="true"]');
    const stageBody = document.querySelector<HTMLElement>('[data-stage-surface-body="true"]');

    expect(stageFrame?.dataset.stageVerticalBalance).toBe('center');
    expect(stageSurface?.dataset.stageVerticalBalance).toBe('center');
    expect(stageBody?.dataset.stageVerticalBalance).toBe('center');
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
    const lastFrameDot = frameDots[frameDots.length - 1];
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
