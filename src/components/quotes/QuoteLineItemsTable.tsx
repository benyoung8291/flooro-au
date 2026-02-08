import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  BookOpen,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Ungroup,
  ArrowUpRight,
  FolderInput,
  FolderPlus,
  Copy,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { QuoteLineItemRow } from './QuoteLineItemRow';
import { MobileTapToEditValue } from './MobileTapToEditValue';
import { DeleteParentDialog } from './DeleteParentDialog';
import { calculateAggregatedValues } from '@/hooks/useQuoteLineItems';
import type { LineItem } from '@/hooks/useQuoteLineItems';

// ─── Props ──────────────────────────────────────────────────────────

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

// ─── Column config ─────────────────────────────────────────────────

const COL_LABELS: Record<string, string> = {
  qty: 'Qty',
  cost: 'Cost',
  margin: 'Margin %',
  sell: 'Sell',
  total: 'Total',
};

// ─── Component ──────────────────────────────────────────────────────

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
  const isMobile = useIsMobile();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; description: string; childCount: number } | null>(null);

  // ── Build flat rows from hierarchy ──

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

    let flatIndex = 0;
    for (let pi = 0; pi < lineItems.length; pi++) {
      const parent = lineItems[pi];
      const hasChildren = parent.subItems.length > 0;
      const aggregated = hasChildren ? calculateAggregatedValues(parent) : undefined;

      result.push({
        item: { ...parent, _flatIndex: flatIndex++ } as any,
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
            item: { ...parent.subItems[ci], _flatIndex: flatIndex++ } as any,
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

  // ── Available parents for grouping ──

  const availableParentGroups = useMemo(() => {
    return lineItems
      .filter(p => p.subItems.length > 0)
      .map(p => ({ id: p.id, description: p.description }));
  }, [lineItems]);

  // ── Delete handlers ──

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

  // ── Mobile number change handler ──

  const handleMobileNumberChange = useCallback(
    (id: string, field: string, val: number) => {
      if (field === 'cost_price') onUpdatePricing(id, 'cost', val);
      else if (field === 'sell_price') onUpdatePricing(id, 'sell', val);
      else if (field === 'margin_percentage') onUpdatePricing(id, 'margin', val);
      else if (field === 'quantity') onUpdate(id, { quantity: val });
    },
    [onUpdate, onUpdatePricing]
  );

  // ── Mobile delete handler ──

  const handleMobileDelete = useCallback(
    (item: LineItem, hasChildren: boolean) => {
      if (hasChildren) {
        setDeleteTarget({
          id: item.id,
          description: item.description,
          childCount: item.subItems?.length || 0,
        });
      } else {
        onRemove(item.id);
      }
    },
    [onRemove]
  );

  return (
    <>
      <div>
        {isMobile ? (
          /* ═══════════ MOBILE: Compact card-based view ═══════════ */
          <div className="space-y-2">
            {lineItems.map((parent, parentIndex) => {
              const hasChildren = parent.subItems.length > 0;
              const aggregated = hasChildren ? calculateAggregatedValues(parent) : undefined;
              const isReadOnly = hasChildren;
              const displayTotal = aggregated ? aggregated.line_total : parent.line_total;
              const displayCost = aggregated ? aggregated.cost_price : parent.cost_price;
              const displaySell = aggregated ? aggregated.sell_price : parent.sell_price;
              const displayMargin = aggregated ? aggregated.margin_percentage : parent.margin_percentage;
              const canMoveUp = parentIndex > 0;
              const canMoveDown = parentIndex < lineItems.length - 1;

              return (
                <div
                  key={parent.id}
                  className={cn(
                    'rounded-lg border border-border bg-card shadow-sm overflow-hidden',
                    hasChildren && 'border-l-4 border-l-primary',
                    parent.is_optional && 'opacity-60 italic',
                    parent._isNew && 'animate-slide-up'
                  )}
                >
                  {/* ── Parent header row ── */}
                  <div className="flex items-center gap-1 px-2 py-2">
                    {/* Reorder + expand compact */}
                    <div className="flex items-center gap-0 shrink-0">
                      <div className="flex flex-col">
                        <button
                          onClick={() => onReorderParent(parent.id, 'up')}
                          disabled={!canMoveUp}
                          className="p-0 h-4 w-4 flex items-center justify-center disabled:opacity-20"
                        >
                          <ArrowUp className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => onReorderParent(parent.id, 'down')}
                          disabled={!canMoveDown}
                          className="p-0 h-4 w-4 flex items-center justify-center disabled:opacity-20"
                        >
                          <ArrowDown className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                      {hasChildren && (
                        <button
                          onClick={() => onToggleExpand(parent.id)}
                          className="p-0.5 rounded"
                        >
                          {(parent._isExpanded !== false) ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Description */}
                    <input
                      value={parent.description}
                      onChange={(e) => onUpdate(parent.id, { description: e.target.value })}
                      className={cn(
                        'flex-1 min-w-0 h-9 px-1.5 text-sm rounded border border-transparent bg-transparent',
                        'focus:border-input focus:outline-none focus:ring-1 focus:ring-ring',
                        hasChildren && 'font-semibold'
                      )}
                      placeholder="Item description"
                    />

                    {/* Total */}
                    <span className="font-mono text-sm font-semibold shrink-0 tabular-nums">
                      ${displayTotal.toFixed(2)}
                    </span>

                    {/* Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onAddSubItem(parent.id)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add sub-item
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdate(parent.id, { is_optional: !parent.is_optional })}>
                          {parent.is_optional ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                          {parent.is_optional ? 'Mark as included' : 'Mark as optional'}
                        </DropdownMenuItem>
                        {hasChildren && (
                          <DropdownMenuItem onClick={() => onUngroupParent(parent.id)}>
                            <Ungroup className="w-4 h-4 mr-2" />
                            Ungroup children
                          </DropdownMenuItem>
                        )}
                        {!hasChildren && (
                          <DropdownMenuItem onClick={() => onCreateGroupFromItem(parent.id)}>
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Create group
                          </DropdownMenuItem>
                        )}
                        {!hasChildren && availableParentGroups.filter(p => p.id !== parent.id).length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Move into group
                            </div>
                            {availableParentGroups
                              .filter(p => p.id !== parent.id)
                              .map(pg => (
                                <DropdownMenuItem key={pg.id} onClick={() => onGroupIntoParent(parent.id, pg.id)}>
                                  <FolderInput className="w-4 h-4 mr-2" />
                                  {pg.description || 'Untitled'}
                                </DropdownMenuItem>
                              ))}
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDuplicate(parent.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleMobileDelete(parent, hasChildren)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* ── Compact data chips ── */}
                  {!isReadOnly && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2.5 text-xs">
                      <MobileTapToEditValue
                        label="Qty"
                        value={parent.quantity}
                        onChange={(v) => handleMobileNumberChange(parent.id, 'quantity', v)}
                      />
                      <MobileTapToEditValue
                        label="Cost"
                        value={parent.cost_price}
                        prefix="$"
                        onChange={(v) => handleMobileNumberChange(parent.id, 'cost_price', v)}
                      />
                      <MobileTapToEditValue
                        label="Sell"
                        value={parent.sell_price}
                        prefix="$"
                        onChange={(v) => handleMobileNumberChange(parent.id, 'sell_price', v)}
                      />
                      <span className="text-foreground font-mono tabular-nums">
                        Margin {displayMargin.toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {/* Read-only aggregated for parent groups */}
                  {isReadOnly && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2.5 text-xs text-muted-foreground font-mono tabular-nums">
                      <span>Cost ${displayCost.toFixed(2)}</span>
                      <span>Sell ${displaySell.toFixed(2)}</span>
                      <span>Margin {displayMargin.toFixed(1)}%</span>
                    </div>
                  )}

                  {/* ── Children ── */}
                  {hasChildren && parent._isExpanded !== false && (
                    <div className="border-t border-border">
                      {parent.subItems.map((child, childIndex) => {
                        const canChildMoveUp = childIndex > 0;
                        const canChildMoveDown = childIndex < parent.subItems.length - 1;

                        return (
                          <div
                            key={child.id}
                            className={cn(
                              'px-3 py-2 ml-3 border-l-2 border-primary/30 border-b border-border/60 last:border-b-0',
                              child.is_optional && 'opacity-60 italic',
                              child._isNew && 'animate-slide-up'
                            )}
                          >
                            {/* Child header */}
                            <div className="flex items-center gap-1">
                              <div className="flex flex-col shrink-0">
                                <button
                                  onClick={() => onReorderSubItem(parent.id, child.id, 'up')}
                                  disabled={!canChildMoveUp}
                                  className="p-0 h-3.5 w-3.5 flex items-center justify-center disabled:opacity-20"
                                >
                                  <ArrowUp className="w-2.5 h-2.5 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => onReorderSubItem(parent.id, child.id, 'down')}
                                  disabled={!canChildMoveDown}
                                  className="p-0 h-3.5 w-3.5 flex items-center justify-center disabled:opacity-20"
                                >
                                  <ArrowDown className="w-2.5 h-2.5 text-muted-foreground" />
                                </button>
                              </div>

                              <input
                                value={child.description}
                                onChange={(e) => onUpdate(child.id, { description: e.target.value })}
                                className="flex-1 min-w-0 h-8 px-1.5 text-sm rounded border border-transparent bg-transparent focus:border-input focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground"
                                placeholder="Sub-item"
                              />

                              <span className="font-mono text-xs font-medium shrink-0 tabular-nums">
                                ${child.line_total.toFixed(2)}
                              </span>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => onUpdate(child.id, { is_optional: !child.is_optional })}>
                                    {child.is_optional ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                                    {child.is_optional ? 'Mark as included' : 'Mark as optional'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onPromoteSubItem(child.id)}>
                                    <ArrowUpRight className="w-4 h-4 mr-2" />
                                    Promote to standalone
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => onRemove(child.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Child compact data chips */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs pl-4">
                              <MobileTapToEditValue
                                label="Qty"
                                value={child.quantity}
                                onChange={(v) => handleMobileNumberChange(child.id, 'quantity', v)}
                              />
                              <MobileTapToEditValue
                                label="Cost"
                                value={child.cost_price}
                                prefix="$"
                                onChange={(v) => handleMobileNumberChange(child.id, 'cost_price', v)}
                              />
                              <MobileTapToEditValue
                                label="Sell"
                                value={child.sell_price}
                                prefix="$"
                                onChange={(v) => handleMobileNumberChange(child.id, 'sell_price', v)}
                              />
                              <span className="text-foreground font-mono tabular-nums">
                                {child.margin_percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {lineItems.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">No line items yet.</p>
                <p className="text-xs mt-1">Add an item or import from Price Book.</p>
              </div>
            )}
          </div>
        ) : (
          /* ═══════════ DESKTOP: Clean flat table with zebra striping ═══════════ */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: 48 }} />
                <col />
                <col style={{ width: 80 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 44 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-white dark:bg-card">
                  <th className="w-12" />
                  <th className="text-left py-3 px-1 font-semibold text-foreground text-xs tracking-wide">
                    Description
                  </th>
                  {(['qty', 'cost', 'margin', 'sell', 'total'] as const).map(col => (
                    <th
                      key={col}
                      className={cn(
                        'text-right py-3 px-1 font-semibold text-foreground text-xs tracking-wide',
                        col === 'total' && 'pr-2'
                      )}
                    >
                      {COL_LABELS[col]}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, isChild, parentId, hasChildren, parentIndex, childIndex, totalParents, totalSiblings, aggregated }, idx) => (
                  <QuoteLineItemRow
                    key={item.id}
                    item={item}
                    isChild={isChild}
                    isExpanded={item._isExpanded}
                    hasChildren={hasChildren}
                    rowIndex={idx}
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
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      No line items yet. Add an item or import from Price Book.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center gap-2 py-3 mt-2">
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
