import {useEffect, useMemo, useState} from 'react';

import {resolveAxisTableLayoutHints, resolveBlockLayoutHints, buildPretextTargetAttributes, getHintByKind} from '../core/pretext/hints';
import {resolveMediaEmbed} from '../core/content/media';
import type {DocType, NormalizedBlock, NormalizedDoc, RichBlockContent} from '../core/content';
import {readAssetDataUrl} from '../lib/bridge';

type Variant = 'reader' | 'stage' | 'newsletter';

type BlockRendererProps = {
  block: NormalizedBlock;
  variant: Variant;
  doc: NormalizedDoc;
  sectionId: string;
  blockIndex: number;
};

type HtmlProps = {
  html: string;
  className: string;
} & Record<string, string | undefined>;

function HtmlBlock({html, className, ...attrs}: HtmlProps) {
  return <div className={className} {...attrs} dangerouslySetInnerHTML={{__html: html}} />;
}

function RichHtmlBlock({
  html,
  rich,
  className,
  overlayClassName,
  attrs,
}: {
  html: string;
  rich?: RichBlockContent;
  className: string;
  overlayClassName: string;
  attrs?: Record<string, string | undefined>;
}) {
  if (!rich) {
    return <HtmlBlock html={html} className={className} {...(attrs ?? {})} />;
  }

  return (
    <div className={`${className}-shell pretext-rich-shell`}>
      <div
        className={`${className} pretext-rich-source`}
        data-pretext-manual-lines="true"
        data-pretext-rich-source="true"
        data-pretext-rich={JSON.stringify(rich)}
        {...(attrs ?? {})}
        dangerouslySetInnerHTML={{__html: html}}
      />
      <div className={`${overlayClassName} pretext-rich-overlay`} data-pretext-rich-overlay="true" aria-hidden="true" />
    </div>
  );
}

function ThesisBlock({
  content,
  rich,
  variant,
  docType,
  doc,
  sectionId,
  blockIndex,
}: {
  content: string;
  rich?: RichBlockContent;
  variant: Variant;
  docType: DocType;
  doc: NormalizedDoc;
  sectionId: string;
  blockIndex: number;
}) {
  const hints = resolveBlockLayoutHints('thesis', variant, {docType, pretext: doc.meta.pretext});
  const primaryHint = getHintByKind(hints, 'shrink-wrap');
  const balanceHint = getHintByKind(hints, 'balance-title');
  const pretextAttributes = primaryHint
    ? buildPretextTargetAttributes({
        slug: doc.slug,
        hint: {
          ...primaryHint,
          minLines: balanceHint?.minLines ?? primaryHint.minLines,
          maxLines: balanceHint?.maxLines ?? primaryHint.maxLines,
          preferredLines: balanceHint?.preferredLines ?? primaryHint.preferredLines,
        },
        keySuffix: `section:${sectionId}:block:${blockIndex}:thesis`,
        extras: {
          'data-pretext-apply-closest': '.thesis-block',
          'data-pretext-section-id': sectionId,
          'data-pretext-block-index': String(blockIndex),
        },
      })
    : {};

  return (
    <aside className={`thesis-block thesis-block--${variant}`}>
      <div className="thesis-block__label">THESIS</div>
      <RichHtmlBlock
        html={content}
        rich={rich}
        className="thesis-block__content"
        overlayClassName="thesis-block__content"
        attrs={pretextAttributes}
      />
    </aside>
  );
}

function DocQuoteBlock({
  content,
  rich,
  variant,
  docType,
  doc,
  sectionId,
  blockIndex,
}: {
  content: string;
  rich?: RichBlockContent;
  variant: Variant;
  docType: DocType;
  doc: NormalizedDoc;
  sectionId: string;
  blockIndex: number;
}) {
  const [hint] = resolveBlockLayoutHints('docQuote', variant, {docType, pretext: doc.meta.pretext});
  const pretextAttributes = hint
    ? buildPretextTargetAttributes({
        slug: doc.slug,
        hint,
        keySuffix: `section:${sectionId}:block:${blockIndex}:quote`,
        extras: {
          'data-pretext-apply-closest': '.doc-quote',
          'data-pretext-section-id': sectionId,
          'data-pretext-block-index': String(blockIndex),
        },
      })
    : {};

  return (
    <blockquote className="doc-quote" data-pretext-pull-quote={variant === 'newsletter' ? 'true' : undefined}>
      <RichHtmlBlock
        html={content}
        rich={rich}
        className="doc-quote__content"
        overlayClassName="doc-quote__content"
        attrs={pretextAttributes}
      />
    </blockquote>
  );
}

function CalloutBlock({calloutType, title, content}: {calloutType: string; title: string; content: string}) {
  const normalizedType =
    calloutType
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'note';
  const iconMap: Record<string, string> = {
    abstract: 'A',
    bug: '!',
    check: 'V',
    danger: '!',
    example: 'E',
    fail: '!',
    help: '?',
    important: '!',
    info: 'i',
    note: 'i',
    question: '?',
    quote: '"',
    success: 'V',
    summary: 'S',
    tip: '+',
    todo: 'T',
    warning: '!',
  };

  return (
    <aside className="callout-block" data-callout-type={normalizedType}>
      <div className="callout-block__title">
        <span className="callout-block__icon" aria-hidden="true">
          {iconMap[normalizedType] ?? 'i'}
        </span>
        <span className="callout-block__title-text">{title}</span>
      </div>
      <HtmlBlock html={content} className="callout-block__body prose-block" />
    </aside>
  );
}

function ImageBlock({src, alt, caption, doc}: {src: string; alt?: string; caption?: string; doc: NormalizedDoc}) {
  const embed = useMemo(() => resolveMediaEmbed(src, alt ?? caption), [alt, caption, src]);
  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    let cancelled = false;

    if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('/')) {
      setResolvedSrc(src);
      return () => {
        cancelled = true;
      };
    }

    void readAssetDataUrl(doc.sourceRoot, doc.filePath, src)
      .then((nextSrc) => {
        if (!cancelled) {
          setResolvedSrc(nextSrc);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedSrc(src);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [doc.filePath, doc.sourceRoot, src]);

  const captionText = caption ?? alt;

  if (embed) {
    return (
      <figure className="image-block embed-block" data-embed-provider={embed.provider}>
        <div className="embed-block__frame">
          <iframe
            src={embed.embedUrl}
            title={embed.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <figcaption className="embed-block__caption">
          <a href={embed.url} target="_blank" rel="noreferrer">
            {embed.title}
          </a>
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="image-block">
      <img src={resolvedSrc} alt={alt ?? ''} loading="lazy" />
      {captionText ? <figcaption>{captionText}</figcaption> : null}
    </figure>
  );
}

function AxisTable({
  headers,
  rows,
  variant,
  doc,
  sectionId,
  blockIndex,
}: {
  headers: string[];
  rows: string[][];
  variant: Variant;
  doc: NormalizedDoc;
  sectionId: string;
  blockIndex: number;
}) {
  const hasPretext = resolveAxisTableLayoutHints(variant, doc.meta).length > 0;

  return (
    <div
      className="axis-table__wrap"
      data-pretext-axis-table={hasPretext ? 'true' : undefined}
      data-pretext-section-id={hasPretext ? sectionId : undefined}
      data-pretext-block-index={hasPretext ? String(blockIndex) : undefined}
      data-axis-table-view="table"
    >
      <table className="axis-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                className={`axis-table__head${index === 0 ? ' axis-table__head--axis' : ''}`}
                dangerouslySetInnerHTML={{__html: header}}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className={`axis-table__cell${cellIndex === 0 ? ' axis-table__cell--axis' : ''}`}
                  dangerouslySetInnerHTML={{__html: cell}}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="axis-table-cards">
        {rows.map((row, rowIndex) => (
          <article key={`card-${rowIndex}`} className="axis-table-card">
            <h3 className="axis-table-card__title" dangerouslySetInnerHTML={{__html: row[0] ?? headers[0] ?? 'Axis'}} />
            <dl className="axis-table-card__grid">
              {row.slice(1).map((cell, index) => (
                <div key={`card-cell-${rowIndex}-${index}`}>
                  <dt dangerouslySetInnerHTML={{__html: headers[index + 1] ?? `Column ${index + 2}`}} />
                  <dd dangerouslySetInnerHTML={{__html: cell}} />
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function EvidenceGrid({
  items,
  variant,
  doc,
  sectionId,
  blockIndex,
}: {
  items: Array<{id?: string; title: string; body: string; tag?: string}>;
  variant: Variant;
  doc: NormalizedDoc;
  sectionId: string;
  blockIndex: number;
}) {
  const [hint] = resolveBlockLayoutHints('evidenceGrid', variant, doc.meta);
  const pretextAttributes = hint
    ? buildPretextTargetAttributes({
        slug: doc.slug,
        hint,
        keySuffix: `section:${sectionId}:block:${blockIndex}:evidence-grid`,
        extras: {
          'data-pretext-section-id': sectionId,
          'data-pretext-block-index': String(blockIndex),
        },
      })
    : {};

  return (
    <section className={`evidence-grid${variant === 'newsletter' ? ' evidence-grid--newsletter' : ''}`} {...pretextAttributes}>
      {items.map((item) => (
        <article key={`${item.id ?? item.title}`} className="evidence-card">
          {item.tag ? <div className="evidence-card__tag">{item.tag}</div> : null}
          <h3 id={item.id} className="evidence-card__title">
            {item.title}
          </h3>
          <div className="evidence-card__body" dangerouslySetInnerHTML={{__html: item.body}} />
        </article>
      ))}
    </section>
  );
}

function EvidencePanel({item}: {item: {id?: string; title: string; body: string; tag?: string}}) {
  return (
    <article className="evidence-panel">
      {item.tag ? <div className="evidence-panel__tag">{item.tag}</div> : null}
      <h3 id={item.id} className="evidence-panel__title">
        {item.title}
      </h3>
      <div className="evidence-panel__body" dangerouslySetInnerHTML={{__html: item.body}} />
    </article>
  );
}

function QuestionReset({items}: {items: Array<{id?: string; title: string; body: string}>}) {
  return (
    <section className="question-reset">
      {items.map((item, index) => (
        <article key={`${item.id ?? item.title}-${index}`} className="question-reset__card">
          <div className="question-reset__index">{index === 0 ? 'BEFORE' : 'REFRAME'}</div>
          <h3 id={item.id} className="question-reset__title">
            {item.title}
          </h3>
          <div className="question-reset__body" dangerouslySetInnerHTML={{__html: item.body}} />
        </article>
      ))}
    </section>
  );
}

function ProvenancePanel({ai}: {ai: NonNullable<NormalizedDoc['meta']['ai']>}) {
  return (
    <aside className="provenance-panel">
      <div className="provenance-panel__eyebrow">AI PROVENANCE</div>
      <dl className="provenance-panel__grid">
        <div>
          <dt>Assisted</dt>
          <dd>{ai.assisted ? 'Yes' : 'No'}</dd>
        </div>
        {ai.model ? (
          <div>
            <dt>Model</dt>
            <dd>{ai.model}</dd>
          </div>
        ) : null}
        {ai.generatedAt ? (
          <div>
            <dt>Generated</dt>
            <dd>{ai.generatedAt}</dd>
          </div>
        ) : null}
        {ai.sourceConfidence ? (
          <div>
            <dt>Confidence</dt>
            <dd>{ai.sourceConfidence}</dd>
          </div>
        ) : null}
        {ai.basedOn && ai.basedOn.length > 0 ? (
          <div className="provenance-panel__sources">
            <dt>Sources</dt>
            <dd>{ai.basedOn.join(', ')}</dd>
          </div>
        ) : null}
      </dl>
    </aside>
  );
}

function LogBlock({language = 'log', code}: {language?: string; code: string}) {
  return (
    <section className="log-block">
      <div className="log-block__label">{language.toUpperCase()}</div>
      <pre>
        <code>{code}</code>
      </pre>
    </section>
  );
}

export function BlockRenderer({block, variant, doc, sectionId, blockIndex}: BlockRendererProps) {
  switch (block.kind) {
    case 'thesis':
      return (
        <ThesisBlock
          content={block.content}
          rich={block.rich}
          variant={variant}
          docType={doc.meta.docType}
          doc={doc}
          sectionId={sectionId}
          blockIndex={blockIndex}
        />
      );
    case 'callout':
      return <CalloutBlock calloutType={block.calloutType} title={block.title} content={block.content} />;
    case 'questionReset':
      return <QuestionReset items={block.items} />;
    case 'evidenceGrid':
      return <EvidenceGrid items={block.items} variant={variant} doc={doc} sectionId={sectionId} blockIndex={blockIndex} />;
    case 'evidencePanel':
      return <EvidencePanel item={block.item} />;
    case 'axisTable':
      return <AxisTable headers={block.headers} rows={block.rows} variant={variant} doc={doc} sectionId={sectionId} blockIndex={blockIndex} />;
    case 'docQuote':
      return (
        <DocQuoteBlock
          content={block.content}
          rich={block.rich}
          variant={variant}
          docType={doc.meta.docType}
          doc={doc}
          sectionId={sectionId}
          blockIndex={blockIndex}
        />
      );
    case 'log':
      return <LogBlock language={block.language} code={block.code} />;
    case 'provenance':
      return <ProvenancePanel ai={block.ai} />;
    case 'prose':
      return <HtmlBlock html={block.html} className="prose-block" />;
    case 'image':
      return <ImageBlock src={block.src} alt={block.alt} caption={block.caption} doc={doc} />;
    default:
      return null;
  }
}
