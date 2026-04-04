import {type ElementType} from 'react';

import {buildPretextTargetAttributes, getHintByKind, resolveSectionLayoutHints} from '../core/pretext/hints';
import type {NormalizedDoc} from '../core/content';

import {BlockRenderer} from './BlockRenderer';

type DocumentSectionsProps = {
  doc: NormalizedDoc;
  variant: 'reader' | 'stage' | 'newsletter';
};

export function DocumentSections({doc, variant}: DocumentSectionsProps) {
  return (
    <article className={`doc-article doc-article--${variant}`}>
      {doc.sections.map((section) => {
        const sectionId = section.anchorId ?? section.id;
        const headingLevel = Math.min(Math.max(section.depth || 2, 1), 6);
        const sectionHints = section.id !== 'lead' ? resolveSectionLayoutHints(variant, doc.meta) : [];
        const sectionBalanceHint = getHintByKind(sectionHints, 'balance-title');
        const sectionFitHint = getHintByKind(sectionHints, 'fit-screen');
        const sectionPretextAttributes =
          section.id !== 'lead' && sectionFitHint
            ? {
                'data-pretext-section-cover': 'true',
                'data-pretext-section-id': sectionId,
                'data-pretext-max-viewport-ratio': String(sectionFitHint.maxViewportRatio ?? 0.82),
                'data-section-fit': 'stage-fit-ok',
              }
            : {};
        const sectionTitlePretextAttributes =
          section.id !== 'lead' && sectionBalanceHint
            ? buildPretextTargetAttributes({
                slug: doc.slug,
                hint: sectionBalanceHint,
                keySuffix: `section:${sectionId}:title`,
                extras: {
                  'data-pretext-section-id': sectionId,
                  'data-pretext-apply-closest': '.doc-section__title',
                },
              })
            : {};
        const HeadingTag = `h${Math.max(1, Math.min(headingLevel, 6))}` as ElementType;

        return (
          <section
            key={sectionId}
            className={`doc-section${section.id === 'lead' ? ' doc-section--lead' : ''}${Object.keys(sectionPretextAttributes).length > 0 ? ' doc-section--cover' : ''}`}
            data-stage-target={section.id !== 'lead' ? 'true' : 'false'}
            data-section-id={sectionId}
            data-mega={section.id !== 'lead' ? section.title : undefined}
            {...sectionPretextAttributes}
          >
            {section.id !== 'lead' ? (
              <HeadingTag className="doc-section__title" id={sectionId} {...sectionTitlePretextAttributes}>
                {section.title}
              </HeadingTag>
            ) : null}
            <div className="doc-section__blocks">
              {section.blocks.map((block, blockIndex) => (
                <BlockRenderer
                  key={`${sectionId}-${block.kind}-${blockIndex}`}
                  block={block}
                  variant={variant}
                  doc={doc}
                  sectionId={sectionId}
                  blockIndex={blockIndex}
                />
              ))}
            </div>
          </section>
        );
      })}
    </article>
  );
}
