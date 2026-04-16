import type {NormalizedDoc} from '../core/content';

import {buildStageDeck} from './overflowSplitter';
import type {DocumentModeLink, StageMode} from './types';

export * from './overflowSplitter';
export * from './pretextMeasurer';
export * from './scale';
export * from './types';

export const getDocumentsForStage = (documents: readonly NormalizedDoc[]): NormalizedDoc[] => [...documents];

export const getDocumentModeLinks = (doc: NormalizedDoc, activeMode?: StageMode): DocumentModeLink[] => {
  const links: DocumentModeLink[] = [];

  if (doc.meta.outputs.includes('reader')) {
    links.push({
      label: 'Reader',
      output: 'reader',
      href: `?view=reader&doc=${encodeURIComponent(doc.slug)}`,
      active: activeMode === 'reader',
    });
  }

  links.push({
    label: 'Stage',
    output: 'stage',
    href: `?view=stage&doc=${encodeURIComponent(doc.slug)}`,
    active: activeMode === 'stage',
  });

  if (doc.meta.outputs.includes('newsletter')) {
    links.push({
      label: 'Newsletter',
      output: 'newsletter',
      href: `?view=newsletter&doc=${encodeURIComponent(doc.slug)}`,
      active: activeMode === 'newsletter',
    });
  }

  return links;
};

export {buildStageDeck};
