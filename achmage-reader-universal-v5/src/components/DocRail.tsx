import type {NormalizedDoc} from '../core/content';

import {TocList} from './TocList';

type DocRailProps = {
  doc: NormalizedDoc;
};

export function DocRail({doc}: DocRailProps) {
  return (
    <aside className="doc-rail" aria-label="Document rail" data-toc-scroll-root="desktop">
      {doc.meta.rail.showToc && doc.headings.length > 0 ? (
        <section className="doc-rail__panel doc-rail__panel--toc">
          <h2>{doc.meta.tocTitle}</h2>
          <TocList items={doc.headings} />
        </section>
      ) : null}

      {doc.meta.rail.showMetadata ? (
        <section className="doc-rail__panel">
          <h2>METADATA</h2>
          <dl className="doc-rail__meta">
            <div>
              <dt>Type</dt>
              <dd>{doc.meta.docType}</dd>
            </div>
            {doc.meta.author ? (
              <div>
                <dt>Author</dt>
                <dd>{doc.meta.author}</dd>
              </div>
            ) : null}
            {doc.meta.date ? (
              <div>
                <dt>Date</dt>
                <dd>{doc.meta.date}</dd>
              </div>
            ) : null}
            <div>
              <dt>Outputs</dt>
              <dd>{doc.meta.outputs.join(', ')}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {doc.meta.rail.showTags && doc.meta.tags.length > 0 ? (
        <section className="doc-rail__panel">
          <h2>TAGS</h2>
          <div className="tag-strip">
            {doc.meta.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
