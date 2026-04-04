import {buildPretextTargetAttributes, resolveHeaderLayoutHints} from '../core/pretext/hints';
import type {InlineToken, NormalizedDoc, RichBlockContent} from '../core/content';

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
  const metaItems = [
    {label: doc.meta.docType, className: 'doc-header__type'},
    ...(doc.meta.heroLabel ? [{label: doc.meta.heroLabel, className: 'doc-header__hero'}] : []),
    ...(doc.meta.date ? [{label: doc.meta.date, className: 'doc-header__date'}] : []),
  ];
  const metaRich: RichBlockContent | null =
    variant === 'reader' || metaItems.length === 0
      ? null
      : {
          plainText: metaItems.map((item) => item.label).join(' '),
          tokens: metaItems.flatMap((item, index): InlineToken[] =>
            index === 0
              ? [{kind: 'badge', value: item.label}]
              : [{kind: 'text', value: ' '}, {kind: 'badge', value: item.label}],
          ),
        };
  const metaRichPayload = metaRich ? JSON.stringify(metaRich) : undefined;

  return (
    <header
      className={`doc-header doc-header--${variant}`}
      data-mega={doc.meta.docType.toUpperCase()}
      data-pretext-newsletter-cover={variant === 'newsletter' ? 'true' : undefined}
      data-pretext-cover-preferred-lines={variant === 'newsletter' ? String(titleHint?.preferredLines ?? 3) : undefined}
    >
      {metaRich ? (
        <div className="doc-header__meta-shell pretext-rich-shell">
          <div
            className="doc-header__meta pretext-rich-source"
            data-pretext-manual-lines="true"
            data-pretext-rich-source="true"
            data-pretext-rich={metaRichPayload}
          >
            {metaItems.map((item) => (
              <span key={`${item.className}-${item.label}`} className={item.className}>
                {item.label}
              </span>
            ))}
          </div>
          <div className="doc-header__meta pretext-rich-overlay" data-pretext-rich-overlay="true" aria-hidden="true" />
        </div>
      ) : (
        <div className="doc-header__meta">
          {metaItems.map((item) => (
            <span key={`${item.className}-${item.label}`} className={item.className}>
              {item.label}
            </span>
          ))}
        </div>
      )}
      <h1 className="doc-header__title" {...titlePretextAttributes}>
        {doc.meta.title}
      </h1>
      {doc.meta.author ? <p className="doc-header__author">{doc.meta.author}</p> : null}
    </header>
  );
}
