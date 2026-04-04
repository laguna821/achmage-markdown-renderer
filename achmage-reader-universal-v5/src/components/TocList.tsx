import type {TocItem} from '../core/content';

type TocListProps = {
  items: TocItem[];
};

export function TocList({items}: TocListProps) {
  return (
    <ul className="toc-list">
      {items.map((item) => (
        <li key={`${item.slug}-${item.level}`} className={`toc-list__item toc-list__item--level-${item.level}`}>
          <a href={`#${item.slug}`} data-toc-item={item.slug}>
            {item.text}
          </a>
          {item.children && item.children.length > 0 ? <TocList items={item.children} /> : null}
        </li>
      ))}
    </ul>
  );
}
