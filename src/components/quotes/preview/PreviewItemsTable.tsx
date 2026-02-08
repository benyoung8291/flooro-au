import type { LineItem } from '@/hooks/useQuoteLineItems';
import type { QuotePdfSettings } from '@/hooks/useQuotePdfSettings';
import { PreviewLineItemRow } from './PreviewLineItemRow';

interface Props {
  items: LineItem[];
  settings: QuotePdfSettings;
  showQtyColumn: boolean;
  showUnitPriceColumn: boolean;
  showTotalColumn: boolean;
  className?: string;
}

export function PreviewItemsTable({
  items,
  settings,
  showQtyColumn,
  showUnitPriceColumn,
  showTotalColumn,
  className = '',
}: Props) {
  if (items.length === 0) return null;

  return (
    <table className={`items-table ${className}`}>
      <thead>
        <tr>
          <th>Description</th>
          {showQtyColumn && <th className="text-right">Qty</th>}
          {showUnitPriceColumn && <th className="text-right">Unit Price</th>}
          {showTotalColumn && <th className="text-right">Total</th>}
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <PreviewLineItemRow
            key={item.id}
            item={item}
            settings={settings}
            showQtyColumn={showQtyColumn}
            showUnitPriceColumn={showUnitPriceColumn}
            showTotalColumn={showTotalColumn}
          />
        ))}
      </tbody>
    </table>
  );
}
