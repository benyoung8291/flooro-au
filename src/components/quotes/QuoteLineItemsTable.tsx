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
import { QuoteLineItemRow, FormattedNumberInput } from './QuoteLineItemRow';
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
  hours: 'Hours',
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
      else if (field === 'estimated_hours') onUpdate(id, { estimated_hours: val });
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
          /* ═══════════ MOBILE: Card-based view ═══════════ */
          <div className="space-y-3">
            {lineItems.map((parent, parentIndex) => {
              const hasChildren = parent.subItems.length > 0;
              const aggregated = hasChildren ? calculateAggregatedValues(parent) : undefined;
              const isReadOnly = hasChildren;
              const highlights = parent._highlightFields || new Set<string>();
              const displayTotal = aggregated ? aggregated.line_total : parent.line_total;
              const displayCost = aggregated ? aggregated.cost_price : parent.cost_price;
              const displaySell = aggregated ? aggregated.sell_price : parent.sell_price;
              const displayMargin = aggregated ? aggregated.margin_percentage : parent.margin_percentage;
              const displayHours = aggregated ? aggregated.estimated_hours : parent.estimated_hours;
              const canMoveUp = parentIndex > 0;
              const canMoveDown = parentIndex < lineItems.length - 1;

              return (
                <div
                  key={parent.id}
                  className={cn(
                    'rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden',
                    parent.is_optional && 'opacity-60 italic',
                    parent._isNew && 'animate-slide-up'
                  )}
                >
                  {/* Parent header */}
                  <div className={cn(
                    'p-3',
                    hasChildren && 'bg-muted/20 border-b border-border/40'
                  )}>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 shrink-0">
                        <div className="flex flex-col">
                          <button
                            onClick={() => onReorderParent(parent.id, 'up')}
                            disabled={!canMoveUp}
                            className="p-0 h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => onReorderParent(parent.id, 'down')}
                            disabled={!canMoveDown}
                            className="p-0 h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        {hasChildren && (
                          <button
                            onClick={() => onToggleExpand(parent.id)}
                            className="p-1 rounded hover:bg-muted"
                          >
                            {(parent._isExpanded !== false) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </div>

                      <input
                        value={parent.description}
                        onChange={(e) => onUpdate(parent.id, { description: e.target.value })}
                        className="flex-1 min-w-0 h-11 px-2 text-sm rounded-md border border-transparent bg-transparent font-medium hover:border-input focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Item description"
                      />

                      <span className="font-mono text-sm font-medium shrink-0 tabular-nums">
                        ${displayTotal.toFixed(2)}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
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

                    {/* Number fields — 2-column grid for better tap targets */}
                    {!isReadOnly && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Qty</label>
                          <FormattedNumberInput
                            value={parent.quantity || ''}
                            onChange={(v) => handleMobileNumberChange(parent.id, 'quantity', v)}
                            className="h-11"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Sell</label>
                          <FormattedNumberInput
                            value={parent.sell_price || ''}
                            onChange={(v) => handleMobileNumberChange(parent.id, 'sell_price', v)}
                            highlight={highlights.has('sell_price')}
                            className="h-11"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Cost</label>
                          <FormattedNumberInput
                            value={parent.cost_price || ''}
                            onChange={(v) => handleMobileNumberChange(parent.id, 'cost_price', v)}
                            highlight={highlights.has('cost_price')}
                            className="h-11"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Margin %</label>
                          <FormattedNumberInput
                            value={parent.margin_percentage || ''}
                            onChange={(v) => handleMobileNumberChange(parent.id, 'margin_percentage', v)}
                            highlight={highlights.has('margin_percentage')}
                            className="h-11"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Hours</label>
                          <FormattedNumberInput
                            value={parent.estimated_hours || ''}
                            onChange={(v) => handleMobileNumberChange(parent.id, 'estimated_hours', v)}
                            className="h-11"
                          />
                        </div>
                      </div>
                    )}

                    {/* Read-only aggregated for parent groups */}
                    {isReadOnly && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground font-mono">
                        <span>Cost ${displayCost.toFixed(2)}</span>
                        <span>Margin {displayMargin.toFixed(1)}%</span>
                        <span>Sell ${displaySell.toFixed(2)}</span>
                        {displayHours > 0 && <span>{displayHours.toFixed(1)}h</span>}
                      </div>
                    )}
                  </div>

                  {/* Children */}
                  {hasChildren && parent._isExpanded !== false && (
                    <div className="divide-y divide-border/30">
                      {parent.subItems.map((child, childIndex) => {
                        const childHighlights = child._highlightFields || new Set<string>();
                        const canChildMoveUp = childIndex > 0;
                        const canChildMoveDown = childIndex < parent.subItems.length - 1;

                        return (
                          <div
                            key={child.id}
                            className={cn(
                              'p-3 pl-4 bg-background/50 border-l-2 border-primary/10 ml-3',
                              child.is_optional && 'opacity-60 italic',
                              child._isNew && 'animate-slide-up'
                            )}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="flex flex-col shrink-0">
                                <button
                                  onClick={() => onReorderSubItem(parent.id, child.id, 'up')}
                                  disabled={!canChildMoveUp}
                                  className="p-0 h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                                >
                                  <ArrowUp className="w-3 h-3 text-muted-foreground" />
                                </button>
                                <button
                                  onClick={() => onReorderSubItem(parent.id, child.id, 'down')}
                                  disabled={!canChildMoveDown}
                                  className="p-0 h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                                >
                                  <ArrowDown className="w-3 h-3 text-muted-foreground" />
                                </button>
                              </div>

                              <input
                                value={child.description}
                                onChange={(e) => onUpdate(child.id, { description: e.target.value })}
                                className="flex-1 min-w-0 h-11 px-2 text-sm rounded-md border border-transparent bg-transparent hover:border-input focus:border-input focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="Sub-item"
                              />

                              <span className="font-mono text-sm font-medium shrink-0 tabular-nums">
                                ${child.line_total.toFixed(2)}
                              </span>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                    <MoreHorizontal className="w-4 h-4" />
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

                            {/* Child number fields — 2-column */}
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div>
                                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Qty</label>
                                <FormattedNumberInput
                                  value={child.quantity || ''}
                                  onChange={(v) => handleMobileNumberChange(child.id, 'quantity', v)}
                                  className="h-11"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Sell</label>
                                <FormattedNumberInput
                                  value={child.sell_price || ''}
                                  onChange={(v) => handleMobileNumberChange(child.id, 'sell_price', v)}
                                  highlight={childHighlights.has('sell_price')}
                                  className="h-11"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Cost</label>
                                <FormattedNumberInput
                                  value={child.cost_price || ''}
                                  onChange={(v) => handleMobileNumberChange(child.id, 'cost_price', v)}
                                  highlight={childHighlights.has('cost_price')}
                                  className="h-11"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Margin %</label>
                                <FormattedNumberInput
                                  value={child.margin_percentage || ''}
                                  onChange={(v) => handleMobileNumberChange(child.id, 'margin_percentage', v)}
                                  highlight={childHighlights.has('margin_percentage')}
                                  className="h-11"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Hours</label>
                                <FormattedNumberInput
                                  value={child.estimated_hours || ''}
                                  onChange={(v) => handleMobileNumberChange(child.id, 'estimated_hours', v)}
                                  className="h-11"
                                />
                              </div>
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
          /* ═══════════ DESKTOP: Clean flat table ═══════════ */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <colgroup>
                <col style={{ width: 48 }} />
                <col />
                <col style={{ width: 80 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 44 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border">
                  <th className="w-12" />
                  <th className="text-left py-2.5 px-1 font-medium text-muted-foreground text-xs">
                    Description
                  </th>
                  {(['qty', 'cost', 'margin', 'sell', 'hours', 'total'] as const).map(col => (
                    <th
                      key={col}
                      className="text-right py-2.5 px-1 font-medium text-muted-foreground text-xs"
                    >
                      {COL_LABELS[col]}
                    </th>
                  ))}
                  <th />
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
                    <td colSpan={9} className="text-center py-16 text-muted-foreground">
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
