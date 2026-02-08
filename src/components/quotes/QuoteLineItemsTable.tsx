import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
import { QuoteLineItemRow, FormattedNumberInput } from './QuoteLineItemRow';
import { DeleteParentDialog } from './DeleteParentDialog';
import { calculateAggregatedValues } from '@/hooks/useQuoteLineItems';
import type { LineItem } from '@/hooks/useQuoteLineItems';

// ─── Hooks ────────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

// ─── Column resize config ──────────────────────────────────────────────

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  qty: 80,
  cost: 96,
  margin: 80,
  sell: 96,
  hours: 80,
  total: 112,
};

const MIN_COL_WIDTHS: Record<string, number> = {
  qty: 50,
  cost: 60,
  margin: 50,
  sell: 60,
  hours: 50,
  total: 70,
};

const RESIZABLE_COLS = ['qty', 'cost', 'margin', 'sell', 'hours', 'total'] as const;

const COL_LABELS: Record<string, string> = {
  qty: 'Qty',
  cost: 'Cost',
  margin: 'Margin %',
  sell: 'Sell',
  hours: 'Hours',
  total: 'Total',
};

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
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
  const tableRef = useRef<HTMLTableElement>(null);

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

  // ── Column resize handlers ──

  const handleResizeStart = useCallback((colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey];

    document.body.classList.add('col-resizing');

    const onMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      const min = MIN_COL_WIDTHS[colKey] || 50;
      setColWidths(prev => ({
        ...prev,
        [colKey]: Math.max(min, startWidth + diff),
      }));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('col-resizing');
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [colWidths]);

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
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isMobile ? (
          /* ═══════════ MOBILE: Card-based view ═══════════ */
          <div className="divide-y divide-border/50">
            {rows.map(({ item, isChild, parentId, hasChildren, parentIndex, childIndex, totalParents, totalSiblings, aggregated }) => {
              const isReadOnly = !isChild && hasChildren;
              const highlights = item._highlightFields || new Set<string>();
              const displayTotal = aggregated ? aggregated.line_total : item.line_total;
              const displayCost = aggregated ? aggregated.cost_price : item.cost_price;
              const displaySell = aggregated ? aggregated.sell_price : item.sell_price;
              const displayMargin = aggregated ? aggregated.margin_percentage : item.margin_percentage;
              const displayHours = aggregated ? aggregated.estimated_hours : item.estimated_hours;

              const canMoveUp = isChild ? childIndex > 0 : parentIndex > 0;
              const canMoveDown = isChild ? childIndex < totalSiblings - 1 : parentIndex < totalParents - 1;

              return (
                <div
                  key={item.id}
                  className={cn(
                    'p-3 transition-colors',
                    isChild && 'pl-8 bg-muted/10',
                    item.is_optional && 'opacity-60 italic',
                    item._isNew && 'animate-slide-up'
                  )}
                >
                  {/* Top row: reorder + description + total + actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Reorder + expand */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <div className="flex flex-col">
                        <button
                          onClick={
                            isChild && parentId
                              ? () => onReorderSubItem(parentId, item.id, 'up')
                              : () => onReorderParent(item.id, 'up')
                          }
                          disabled={!canMoveUp}
                          className="p-0 h-4 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                        >
                          <ArrowUp className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button
                          onClick={
                            isChild && parentId
                              ? () => onReorderSubItem(parentId, item.id, 'down')
                              : () => onReorderParent(item.id, 'down')
                          }
                          disabled={!canMoveDown}
                          className="p-0 h-4 w-4 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                        >
                          <ArrowDown className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                      {!isChild && hasChildren && (
                        <button
                          onClick={() => onToggleExpand(item.id)}
                          className="p-0.5 rounded hover:bg-muted"
                        >
                          {(item._isExpanded !== false) ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      {isChild && <span className="block w-2 h-px bg-border" />}
                    </div>

                    {/* Description */}
                    <input
                      value={item.description}
                      onChange={(e) => onUpdate(item.id, { description: e.target.value })}
                      className={cn(
                        'flex-1 min-w-0 h-9 px-2 text-sm rounded-md border border-transparent bg-transparent',
                        'hover:border-input focus:border-input focus:outline-none focus:ring-1 focus:ring-ring',
                        !isChild && 'font-medium'
                      )}
                      placeholder={isChild ? 'Sub-item' : 'Group name'}
                    />

                    {/* Total */}
                    <span className="font-mono text-sm font-medium shrink-0 tabular-nums">
                      ${displayTotal.toFixed(2)}
                    </span>

                    {/* Actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {!isChild && (
                          <DropdownMenuItem onClick={() => onAddSubItem(item.id)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add sub-item
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onUpdate(item.id, { is_optional: !item.is_optional })}>
                          {item.is_optional ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                          {item.is_optional ? 'Mark as included' : 'Mark as optional'}
                        </DropdownMenuItem>
                        {!isChild && hasChildren && (
                          <DropdownMenuItem onClick={() => onUngroupParent(item.id)}>
                            <Ungroup className="w-4 h-4 mr-2" />
                            Ungroup children
                          </DropdownMenuItem>
                        )}
                        {isChild && (
                          <DropdownMenuItem onClick={() => onPromoteSubItem(item.id)}>
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            Promote to standalone
                          </DropdownMenuItem>
                        )}
                        {!isChild && !hasChildren && (
                          <DropdownMenuItem onClick={() => onCreateGroupFromItem(item.id)}>
                            <FolderPlus className="w-4 h-4 mr-2" />
                            Create group
                          </DropdownMenuItem>
                        )}
                        {!isChild && !hasChildren && availableParentGroups.filter(p => p.id !== item.id).length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Move into group
                            </div>
                            {availableParentGroups
                              .filter(p => p.id !== item.id)
                              .map(parent => (
                                <DropdownMenuItem key={parent.id} onClick={() => onGroupIntoParent(item.id, parent.id)}>
                                  <FolderInput className="w-4 h-4 mr-2" />
                                  {parent.description || 'Untitled'}
                                </DropdownMenuItem>
                              ))}
                          </>
                        )}
                        {!isChild && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDuplicate(item.id)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (!isChild && hasChildren) handleMobileDelete(item, true);
                            else onRemove(item.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Number fields — editable grid */}
                  {!isReadOnly && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Qty</label>
                        <FormattedNumberInput
                          value={item.quantity || ''}
                          onChange={(v) => handleMobileNumberChange(item.id, 'quantity', v)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Cost</label>
                        <FormattedNumberInput
                          value={item.cost_price || ''}
                          onChange={(v) => handleMobileNumberChange(item.id, 'cost_price', v)}
                          highlight={highlights.has('cost_price')}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Sell</label>
                        <FormattedNumberInput
                          value={item.sell_price || ''}
                          onChange={(v) => handleMobileNumberChange(item.id, 'sell_price', v)}
                          highlight={highlights.has('sell_price')}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Margin %</label>
                        <FormattedNumberInput
                          value={item.margin_percentage || ''}
                          onChange={(v) => handleMobileNumberChange(item.id, 'margin_percentage', v)}
                          highlight={highlights.has('margin_percentage')}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Hours</label>
                        <FormattedNumberInput
                          value={item.estimated_hours || ''}
                          onChange={(v) => handleMobileNumberChange(item.id, 'estimated_hours', v)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  )}

                  {/* Read-only aggregated values for parent groups */}
                  {isReadOnly && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground font-mono pl-6">
                      <span>Cost ${displayCost.toFixed(2)}</span>
                      <span>Margin {displayMargin.toFixed(1)}%</span>
                      <span>Sell ${displaySell.toFixed(2)}</span>
                      {displayHours > 0 && <span>{displayHours.toFixed(1)}h</span>}
                    </div>
                  )}
                </div>
              );
            })}

            {rows.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No line items yet. Add an item or import from Price Book.
              </div>
            )}
          </div>
        ) : (
          /* ═══════════ DESKTOP: Table with resizable columns ═══════════ */
          <div className="overflow-x-auto">
            <table ref={tableRef} className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 48 }} />
                <col />
                {RESIZABLE_COLS.map(col => (
                  <col key={col} style={{ width: colWidths[col] }} />
                ))}
                <col style={{ width: 44 }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-12" />
                  <th className="text-left py-2.5 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Description
                  </th>
                  {RESIZABLE_COLS.map(col => (
                    <th
                      key={col}
                      className="text-right py-2.5 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wider relative"
                    >
                      {COL_LABELS[col]}
                      <div
                        className="col-resize-handle"
                        onMouseDown={(e) => handleResizeStart(col, e)}
                      />
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
                    <td colSpan={9} className="text-center py-12 text-muted-foreground">
                      No line items yet. Add an item or import from Price Book.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

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
