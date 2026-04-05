import type {TocItem} from '../core/content';

type LiveHeadingLike = {
  id: string;
  tagName: string;
  textContent: string | null;
  getBoundingClientRect: () => {top: number};
};

export type TocDebugHeading = {
  id: string;
  tagName: string;
  top: number;
  text: string;
  isInToc: boolean;
};

export type TocSyncTrigger =
  | 'init'
  | 'scroll'
  | 'resize'
  | 'hashchange'
  | 'load'
  | 'resource'
  | 'reveal'
  | 'toc-click';

type ResolveVisibleHeadingIndexOptions = {
  currentIndex: number;
  targetIndex: number;
  scrollChanged: boolean;
  trigger: TocSyncTrigger;
};

export const flattenTocIds = (items: readonly TocItem[]): string[] => {
  const ids: string[] = [];

  const visit = (entries: readonly TocItem[]) => {
    entries.forEach((entry) => {
      ids.push(entry.slug);
      if (entry.children && entry.children.length > 0) {
        visit(entry.children);
      }
    });
  };

  visit(items);
  return ids;
};

export const buildLiveHeadingSnapshot = (
  headings: Iterable<LiveHeadingLike>,
  tocHeadingIds: ReadonlySet<string>,
): {
  candidates: Array<{id: string; top: number}>;
  debugHeadings: TocDebugHeading[];
} => {
  const candidates: Array<{id: string; top: number}> = [];
  const debugHeadings: TocDebugHeading[] = [];

  for (const heading of headings) {
    if (!heading.id) {
      continue;
    }

    const top = heading.getBoundingClientRect().top;
    const isInToc = tocHeadingIds.has(heading.id);
    debugHeadings.push({
      id: heading.id,
      tagName: heading.tagName.toUpperCase(),
      top,
      text: heading.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      isInToc,
    });

    if (!isInToc) {
      continue;
    }

    candidates.push({
      id: heading.id,
      top,
    });
  }

  return {candidates, debugHeadings};
};

export const resolveVisibleHeadingIndex = ({
  currentIndex,
  targetIndex,
  scrollChanged,
  trigger,
}: ResolveVisibleHeadingIndexOptions): number => {
  if (targetIndex < 0) {
    return currentIndex;
  }

  if (trigger === 'toc-click') {
    return targetIndex;
  }

  if (currentIndex < 0) {
    return targetIndex;
  }

  if (currentIndex === targetIndex) {
    return currentIndex;
  }

  if (!scrollChanged) {
    return currentIndex;
  }

  return targetIndex > currentIndex ? currentIndex + 1 : currentIndex - 1;
};
