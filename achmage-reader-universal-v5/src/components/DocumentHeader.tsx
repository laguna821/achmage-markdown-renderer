import {buildPretextTargetAttributes, resolveHeaderLayoutHints} from '../core/pretext/hints';
import type {NormalizedDoc} from '../core/content';

import {deriveDocumentInsights} from '../lib/document-insights';

type DocumentHeaderProps = {
  doc: NormalizedDoc;
  variant: 'reader' | 'stage' | 'newsletter';
};

export function DocumentHeader({doc, variant}: DocumentHeaderProps) {
  const [titleHint] = resolveHeaderLayoutHints(variant, doc.meta);
  const titlePretextAttributes = titleHint
    ? buildPretextTargetAttributes({
        slug: doc.slug,
        hint: titleHint,
        keySuffix: 'header:title',
      })
    : {};
  const insights = deriveDocumentInsights(doc);

  if (variant === 'stage') {
    return (
      <header
        className="stage-lead-header"
        data-mega={doc.meta.docType.toUpperCase()}
        data-doc-type={doc.meta.docType}
        data-stage-header="true"
      >
        <div className="stage-lead-header__meta-top" aria-label="Document metadata">
          {insights.metaTrail.map((item, index) => (
            <span key={`${item}-${index}`} className="stage-lead-header__meta-item">
              {item}
            </span>
          ))}
        </div>
        <div className="stage-lead-header__kicker">{insights.kicker}</div>
        <h1 className="stage-lead-header__title" {...titlePretextAttributes}>
          {doc.meta.title}
        </h1>
        {insights.standfirst ? <p className="stage-lead-header__standfirst">{insights.standfirst}</p> : null}
        {doc.meta.author ? <p className="stage-lead-header__author">by {doc.meta.author}</p> : null}
      </header>
    );
  }

  return (
    <header
      className={`doc-header doc-header--${variant}`}
      data-mega={doc.meta.docType.toUpperCase()}
      data-doc-type={doc.meta.docType}
      data-pretext-newsletter-cover={variant === 'newsletter' ? 'true' : undefined}
      data-pretext-cover-preferred-lines={variant === 'newsletter' ? String(titleHint?.preferredLines ?? 3) : undefined}
    >
      <div className="doc-header__meta-top" aria-label="Document metadata">
        {insights.metaTrail.map((item, index) => (
          <span key={`${item}-${index}`} className="doc-header__meta-item">
            {item}
          </span>
        ))}
      </div>
      <div className="doc-header__kicker">{insights.kicker}</div>
      <h1 className="doc-header__title" {...titlePretextAttributes}>
        {doc.meta.title}
      </h1>
      {insights.standfirst ? <p className="doc-header__standfirst">{insights.standfirst}</p> : null}
      {doc.meta.author ? <p className="doc-header__author">by {doc.meta.author}</p> : null}
    </header>
  );
}
