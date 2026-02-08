import type { LineItem } from '@/hooks/useQuoteLineItems';
import type { QuotePdfSettings } from '@/hooks/useQuotePdfSettings';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount);
}

interface Props {
  item: LineItem;
  isChild?: boolean;
  settings: QuotePdfSettings;
  showQtyColumn: boolean;
  showUnitPriceColumn: boolean;
  showTotalColumn: boolean;
}

export function PreviewLineItemRow({
  item,
  isChild = false,
  settings,
  showQtyColumn,
  showUnitPriceColumn,
  showTotalColumn,
}: Props) {
  const hasChildren = item.subItems.length > 0;

  // Aggregated total for parents with children
  const aggregatedTotal = hasChildren
    ? item.subItems
        .filter(c => !c.is_optional)
        .reduce((s, c) => s + c.line_total, 0)
    : item.line_total;

  const aggregatedUnitPrice =
    hasChildren && item.quantity > 0
      ? aggregatedTotal / item.quantity
      : item.sell_price;

  // Decide whether to show values or blank cells based on toggles
  const isParent = !isChild;
  const hideQty = isParent ? settings.hideParentQty : settings.hideSubItemQty;
  const hidePricing = isParent
    ? settings.hideParentPricing
    : settings.hideSubItemPricing;

  // For parents with children when sub-items are shown: show aggregated values
  // For parents with children when sub-items are hidden: show own pre-aggregated values
  const displayQty = hasChildren ? (settings.showSubItems ? '' : item.quantity.toFixed(2)) : item.quantity.toFixed(2);
  const displayUnitPrice = hasChildren
    ? settings.showSubItems
      ? ''
      : aggregatedUnitPrice > 0
        ? formatCurrency(aggregatedUnitPrice)
        : ''
    : item.sell_price > 0
      ? formatCurrency(item.sell_price)
      : '';
  const displayTotal = aggregatedTotal > 0 ? formatCurrency(aggregatedTotal) : '—';

  return (
    <>
      <tr
        className={`${isChild ? 'child-row' : 'parent-row'} ${item.is_optional ? 'optional-row' : ''}`}
      >
        <td className={isChild ? 'pl-8' : 'font-semibold'}>
          {item.description}
        </td>
        {showQtyColumn && (
          <td className="text-right font-mono-numbers">
            {hideQty ? '' : displayQty}
          </td>
        )}
        {showUnitPriceColumn && (
          <td className="text-right font-mono-numbers">
            {hidePricing ? '' : displayUnitPrice}
          </td>
        )}
        {showTotalColumn && (
          <td className="text-right font-mono-numbers font-semibold">
            {hidePricing ? '' : displayTotal}
          </td>
        )}
      </tr>
      {settings.showSubItems &&
        item.subItems.map(child => (
          <PreviewLineItemRow
            key={child.id}
            item={child}
            isChild
            settings={settings}
            showQtyColumn={showQtyColumn}
            showUnitPriceColumn={showUnitPriceColumn}
            showTotalColumn={showTotalColumn}
          />
        ))}
    </>
  );
}
