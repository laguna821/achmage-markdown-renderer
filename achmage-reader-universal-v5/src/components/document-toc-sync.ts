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
