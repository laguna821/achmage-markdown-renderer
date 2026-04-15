import {loadNormalizedDocuments} from '../content';
import type {NormalizedDoc} from '../content';

import {buildStageDeck} from './pagination';
import type {DocumentModeLink, StageMode} from './types';

export * from './pagination';
export * from './types';

export const getDocumentsForStage = (documents: NormalizedDoc[] = loadNormalizedDocuments()): NormalizedDoc[] => documents;

export const getDocumentModeLinks = (doc: NormalizedDoc, activeMode?: StageMode): DocumentModeLink[] => {
  const links: DocumentModeLink[] = [];

  if (doc.meta.outputs.includes('reader')) {
    links.push({
      label: 'Reader',
      href: `/reader/${doc.slug}`,
      active: activeMode === 'reader',
    });
  }

  links.push({
    label: 'Stage',
    href: `/stage/${doc.slug}`,
    active: activeMode === 'stage',
  });

  if (doc.meta.outputs.includes('newsletter')) {
    links.push({
      label: 'Newsletter',
      href: `/newsletter/${doc.slug}`,
      active: activeMode === 'newsletter',
    });
  }

  return links;
};

export {buildStageDeck};
