import type { LineItem } from '@/hooks/useQuoteLineItems';
import type { QuotePdfSettings } from '@/hooks/useQuotePdfSettings';
import { PreviewItemsTable } from './PreviewItemsTable';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount);
}

interface OptionalGroup {
  name: string;
  items: LineItem[];
  subtotal: number;
}

function groupOptionalItems(items: LineItem[]): OptionalGroup[] {
  // Group by parent items as group identifiers
  // Standalone optional items go into their own group
  const groups: OptionalGroup[] = [];

  items.forEach(item => {
    const groupName = item.description || 'Optional Items';
    const subtotal =
      item.subItems.length > 0
        ? item.subItems
            .filter(c => c.is_optional || true) // include all children of optional parent
            .reduce((s, c) => s + c.line_total, 0)
        : item.line_total;

    groups.push({
      name: groupName,
      items: [item],
      subtotal,
    });
  });

  return groups;
}

interface Props {
  optionalItems: LineItem[];
  baseSubtotal: number;
  taxRate: number;
  settings: QuotePdfSettings;
  showQtyColumn: boolean;
  showUnitPriceColumn: boolean;
  showTotalColumn: boolean;
}

export function OptionalGroupSections({
  optionalItems,
  baseSubtotal,
  taxRate,
  settings,
  showQtyColumn,
  showUnitPriceColumn,
  showTotalColumn,
}: Props) {
  if (optionalItems.length === 0) return null;

  const groups = groupOptionalItems(optionalItems);
  const colSpan =
    1 +
    (showQtyColumn ? 1 : 0) +
    (showUnitPriceColumn ? 1 : 0) +
    (showTotalColumn ? 1 : 0);

  return (
    <>
      <h2 className="section-heading">Optional Items</h2>

      {groups.map((group, idx) => {
        const groupWithOption = baseSubtotal + group.subtotal;
        const groupTax = groupWithOption * (taxRate / 100);
        const groupTotal = groupWithOption + groupTax;

        return (
          <div key={idx} className="optional-group">
            {groups.length > 1 && (
              <div className="optional-group-divider">
                {group.name}
              </div>
            )}

            <PreviewItemsTable
              items={group.items}
              settings={settings}
              showQtyColumn={showQtyColumn}
              showUnitPriceColumn={showUnitPriceColumn}
              showTotalColumn={showTotalColumn}
              className="optional-table"
            />

            {/* Group subtotal + "Quote total with option" */}
            <table className="items-table optional-group-totals">
              <tbody>
                <tr className="group-subtotal-row">
                  <td colSpan={colSpan - 1} className="text-right text-xs text-muted-foreground">
                    Option Subtotal
                  </td>
                  <td className="text-right font-mono-numbers font-semibold">
                    {formatCurrency(group.subtotal)}
                  </td>
                </tr>
                {taxRate > 0 && (
                  <tr className="group-subtotal-row">
                    <td
                      colSpan={colSpan - 1}
                      className="text-right text-xs text-muted-foreground"
                    >
                      Quote Total with "{group.name}" (inc. GST)
                    </td>
                    <td className="text-right font-mono-numbers font-semibold">
                      {formatCurrency(groupTotal)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
