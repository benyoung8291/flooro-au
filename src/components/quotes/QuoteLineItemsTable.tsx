import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen } from 'lucide-react';
import { QuoteLineItemRow } from './QuoteLineItemRow';
import { DeleteParentDialog } from './DeleteParentDialog';
import { calculateAggregatedValues } from '@/hooks/useQuoteLineItems';
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
  onReorderParent: (parentId: string, direction: 'up' | 'down') => void;
  onReorderSubItem: (parentId: string, childId: string, direction: 'up' | 'down') => void;
  onUngroupParent: (parentId: string) => void;
  onPromoteSubItem: (childId: string) => void;
  onGroupIntoParent: (itemId: string, parentId: string) => void;
  onCreateGroupFromItem: (itemId: string) => void;
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
  onReorderParent,
  onReorderSubItem,
  onUngroupParent,
  onPromoteSubItem,
  onGroupIntoParent,
  onCreateGroupFromItem,
}: QuoteLineItemsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; description: string; childCount: number } | null>(null);

  // Build flat rows from hierarchy
  const rows = useMemo(() => {
    const result: {
      item: LineItem;
      isChild: boolean;
      parentId: string | null;
      parentExpanded: boolean;
      hasChildren: boolean;
      parentIndex: number;
      childIndex: number;
      totalParents: number;
      totalSiblings: number;
      aggregated?: ReturnType<typeof calculateAggregatedValues>;
    }[] = [];

    for (let pi = 0; pi < lineItems.length; pi++) {
      const parent = lineItems[pi];
      const hasChildren = parent.subItems.length > 0;
      const aggregated = hasChildren ? calculateAggregatedValues(parent) : undefined;

      result.push({
        item: parent,
        isChild: false,
        parentId: null,
        parentExpanded: parent._isExpanded ?? true,
        hasChildren,
        parentIndex: pi,
        childIndex: -1,
        totalParents: lineItems.length,
        totalSiblings: 0,
        aggregated,
      });

      if (parent._isExpanded !== false) {
        for (let ci = 0; ci < parent.subItems.length; ci++) {
          result.push({
            item: parent.subItems[ci],
            isChild: true,
            parentId: parent.id,
            parentExpanded: true,
            hasChildren: false,
            parentIndex: pi,
            childIndex: ci,
            totalParents: lineItems.length,
            totalSiblings: parent.subItems.length,
          });
        }
      }
    }
    return result;
  }, [lineItems]);

  // Available parents for grouping: all top-level items that are not the current item
  // (includes both groups with children and standalone items that could become groups)
  const availableParentGroups = useMemo(() => {
    return lineItems
      .filter(p => p.subItems.length > 0) // only show existing groups
      .map(p => ({ id: p.id, description: p.description }));
  }, [lineItems]);

  const handleDeleteWithConfirm = useCallback((id: string) => {
    const parent = lineItems.find(p => p.id === id);
    if (parent && parent.subItems.length > 0) {
      setDeleteTarget({
        id,
        description: parent.description,
        childCount: parent.subItems.length,
      });
    } else {
      onRemove(id);
    }
  }, [lineItems, onRemove]);

  const handleDeleteAll = useCallback(() => {
    if (deleteTarget) {
      onRemove(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onRemove]);

  const handleKeepChildren = useCallback(() => {
    if (deleteTarget) {
      onUngroupParent(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onUngroupParent]);

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-12" />
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
                <th className="w-20 text-right py-2.5 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Hours
                </th>
                <th className="w-28 text-right py-2.5 px-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Total
                </th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, isChild, parentId, hasChildren, parentIndex, childIndex, totalParents, totalSiblings, aggregated }) => (
                <QuoteLineItemRow
                  key={item.id}
                  item={item}
                  isChild={isChild}
                  isExpanded={item._isExpanded}
                  hasChildren={hasChildren}
                  aggregated={aggregated}
                  onUpdate={onUpdate}
                  onUpdatePricing={onUpdatePricing}
                  onAddSubItem={onAddSubItem}
                  onRemove={onRemove}
                  onDuplicate={onDuplicate}
                  onToggleExpand={onToggleExpand}
                  onMoveUp={
                    isChild && parentId
                      ? () => onReorderSubItem(parentId, item.id, 'up')
                      : () => onReorderParent(item.id, 'up')
                  }
                  onMoveDown={
                    isChild && parentId
                      ? () => onReorderSubItem(parentId, item.id, 'down')
                      : () => onReorderParent(item.id, 'down')
                  }
                  canMoveUp={isChild ? childIndex > 0 : parentIndex > 0}
                  canMoveDown={isChild ? childIndex < totalSiblings - 1 : parentIndex < totalParents - 1}
                  onUngroup={!isChild && hasChildren ? () => onUngroupParent(item.id) : undefined}
                  onPromote={isChild ? () => onPromoteSubItem(item.id) : undefined}
                  onDeleteWithConfirm={handleDeleteWithConfirm}
                  onGroupInto={!isChild && !hasChildren ? onGroupIntoParent : undefined}
                  onCreateGroup={!isChild && !hasChildren ? onCreateGroupFromItem : undefined}
                  availableParents={!isChild && !hasChildren
                    ? availableParentGroups.filter(p => p.id !== item.id)
                    : undefined
                  }
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
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

      {/* Delete confirmation dialog */}
      <DeleteParentDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        description={deleteTarget?.description || ''}
        childCount={deleteTarget?.childCount || 0}
        onDeleteAll={handleDeleteAll}
        onKeepChildren={handleKeepChildren}
      />
    </>
  );
}
