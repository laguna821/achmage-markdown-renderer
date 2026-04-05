import type {NormalizedDoc} from '../core/content';
import {deriveDocumentInsights} from '../lib/document-insights';

import {TocList} from './TocList';

type DocRailProps = {
  doc: NormalizedDoc;
};

export function DocRail({doc}: DocRailProps) {
  const insights = deriveDocumentInsights(doc);

  return (
    <aside className="doc-rail" aria-label="Document rail" data-toc-scroll-root="desktop">
      {insights.thesis ? (
        <section className="doc-rail__panel doc-rail__panel--thesis" data-rail-kind="thesis">
          <h2>{insights.thesisLabel}</h2>
          <p className="doc-rail__thesis">{insights.thesis}</p>
        </section>
      ) : null}

      {doc.meta.rail.showToc && doc.headings.length > 0 ? (
        <section className="doc-rail__panel doc-rail__panel--toc" data-rail-kind="toc">
          <h2>Index</h2>
          <TocList items={doc.headings} />
        </section>
      ) : null}

      {insights.keyLine ? (
        <section className="doc-rail__panel doc-rail__panel--keyline" data-rail-kind="keyline">
          <h2>Key Line</h2>
          <p className="doc-rail__thesis">{insights.keyLine}</p>
        </section>
      ) : null}

      {insights.sources.length > 0 ? (
        <section className="doc-rail__panel doc-rail__panel--sources" data-rail-kind="sources">
          <h2>Sources</h2>
          <div className="doc-rail__sources">
            {insights.sources.map((source) => (
              <a key={source.href} href={source.href} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {doc.meta.rail.showMetadata ? (
        <section className="doc-rail__panel" data-rail-kind="metadata">
          <h2>Metadata</h2>
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
        <section className="doc-rail__panel" data-rail-kind="tags">
          <h2>Tags</h2>
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
