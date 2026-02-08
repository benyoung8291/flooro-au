import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen } from 'lucide-react';
import { QuoteLineItemRow } from './QuoteLineItemRow';
import type { LineItem } from '@/hooks/useQuoteLineItems';

interface QuoteLineItemsTableProps {
  lineItems: LineItem[];
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onUpdatePricing: (id: string, field: 'cost' | 'sell' | 'margin', value: number) => void;
  onAddLineItem: () => void;
  onAddSubItem: (parentId: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onOpenPriceBook: () => void;
}

export function QuoteLineItemsTable({
  lineItems,
  onUpdate,
  onUpdatePricing,
  onAddLineItem,
  onAddSubItem,
  onRemove,
  onDuplicate,
  onToggleExpand,
  onOpenPriceBook,
}: QuoteLineItemsTableProps) {
  // Build flat rows from hierarchy
  const rows = useMemo(() => {
    const result: { item: LineItem; isChild: boolean; parentExpanded: boolean; childCount: number }[] = [];
    for (const parent of lineItems) {
      result.push({
        item: parent,
        isChild: false,
        parentExpanded: parent._isExpanded ?? true,
        childCount: parent.subItems.length,
      });
      if (parent._isExpanded !== false) {
        for (const child of parent.subItems) {
          result.push({ item: child, isChild: true, parentExpanded: true, childCount: 0 });
        }
      }
    }
    return result;
  }, [lineItems]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10" />
              <th className="text-left py-2.5 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Description
              </th>
              <th className="w-20 text-right py-2.5 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Qty
              </th>
              <th className="w-24 text-right py-2.5 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Cost
              </th>
              <th className="w-20 text-right py-2.5 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Margin %
              </th>
              <th className="w-24 text-right py-2.5 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Sell
              </th>
              <th className="w-28 text-right py-2.5 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Total
              </th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, isChild, childCount }) => (
              <QuoteLineItemRow
                key={item.id}
                item={item}
                isChild={isChild}
                isExpanded={item._isExpanded}
                childCount={childCount}
                onUpdate={onUpdate}
                onUpdatePricing={onUpdatePricing}
                onAddSubItem={onAddSubItem}
                onRemove={onRemove}
                onDuplicate={onDuplicate}
                onToggleExpand={onToggleExpand}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  No line items yet. Add an item or import from Price Book.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 p-3 border-t border-border bg-muted/20">
        <Button variant="outline" size="sm" onClick={onAddLineItem} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenPriceBook} className="gap-1.5">
          <BookOpen className="w-3.5 h-3.5" />
          From Price Book
        </Button>
      </div>
    </div>
  );
}
