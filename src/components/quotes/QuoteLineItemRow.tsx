import { useCallback, useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Ungroup,
  ArrowUpRight,
  FolderInput,
  FolderPlus,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LineItem } from '@/hooks/useQuoteLineItems';

// ─── Formatted Number Input ──────────────────────────────────────────

export function FormattedNumberInput({
  value,
  onChange,
  className,
  highlight,
  step,
  ...props
}: {
  value: number | '';
  onChange: (val: number) => void;
  className?: string;
  highlight?: boolean;
  step?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [displayValue, setDisplayValue] = useState(value === 0 || value === '' ? '' : String(value));

  useEffect(() => {
    // Only update display if external value changed (not during editing)
    if (!document.activeElement || document.activeElement !== inputRef.current) {
      setDisplayValue(value === 0 || value === '' ? '' : Number(value).toFixed(2));
    }
  }, [value]);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Only allow digits and single decimal point
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
    setDisplayValue(raw);
    const num = parseFloat(raw) || 0;
    onChange(num);
  };

  const handleBlur = () => {
    const num = parseFloat(displayValue) || 0;
    setDisplayValue(num === 0 ? '' : num.toFixed(2));
    onChange(num);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={cn(
        'flex h-8 w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-right font-mono transition-all',
        'hover:border-input focus:border-input focus:outline-none focus:ring-1 focus:ring-ring',
        highlight && 'bg-primary/10 ring-1 ring-primary/30',
        className
      )}
      {...props}
    />
  );
}

// ─── Row Component ───────────────────────────────────────────────────

interface QuoteLineItemRowProps {
  item: LineItem;
  isChild?: boolean;
  isExpanded?: boolean;
  hasChildren: boolean;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onUpdatePricing: (id: string, field: 'cost' | 'sell' | 'margin', value: number) => void;
  onAddSubItem: (parentId: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleExpand?: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onUngroup?: () => void;
  onPromote?: () => void;
  onDeleteWithConfirm?: (id: string) => void;
  onGroupInto?: (itemId: string, parentId: string) => void;
  onCreateGroup?: (itemId: string) => void;
  availableParents?: { id: string; description: string }[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  aggregated?: {
    cost_price: number;
    sell_price: number;
    margin_percentage: number;
    line_total: number;
    estimated_hours: number;
  };
}

export function QuoteLineItemRow({
  item,
  isChild = false,
  isExpanded = true,
  hasChildren,
  onUpdate,
  onUpdatePricing,
  onAddSubItem,
  onRemove,
  onDuplicate,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onUngroup,
  onPromote,
  onDeleteWithConfirm,
  onGroupInto,
  onCreateGroup,
  availableParents,
  canMoveUp,
  canMoveDown,
  aggregated,
}: QuoteLineItemRowProps) {
  const descRef = useRef<HTMLInputElement>(null);
  const isReadOnly = !isChild && hasChildren;
  const highlights = item._highlightFields || new Set<string>();

  const handleNumberChange = useCallback(
    (field: string, val: number) => {
      if (field === 'cost_price') {
        onUpdatePricing(item.id, 'cost', val);
      } else if (field === 'sell_price') {
        onUpdatePricing(item.id, 'sell', val);
      } else if (field === 'margin_percentage') {
        onUpdatePricing(item.id, 'margin', val);
      } else if (field === 'quantity') {
        onUpdate(item.id, { quantity: val });
      } else if (field === 'estimated_hours') {
        onUpdate(item.id, { estimated_hours: val });
      }
    },
    [item.id, onUpdate, onUpdatePricing]
  );

  const displayTotal = aggregated ? aggregated.line_total : item.line_total;
  const displayCost = aggregated ? aggregated.cost_price : item.cost_price;
  const displaySell = aggregated ? aggregated.sell_price : item.sell_price;
  const displayMargin = aggregated ? aggregated.margin_percentage : item.margin_percentage;
  const displayHours = aggregated ? aggregated.estimated_hours : item.estimated_hours;

  const handleDelete = () => {
    if (!isChild && hasChildren && onDeleteWithConfirm) {
      onDeleteWithConfirm(item.id);
    } else {
      onRemove(item.id);
    }
  };

  return (
    <tr
      className={cn(
        'group border-b border-border/50 transition-colors hover:bg-muted/30',
        isChild && 'bg-muted/10',
        item.is_optional && 'opacity-60 italic',
        item._isNew && 'animate-slide-up'
      )}
    >
      {/* Reorder + expand */}
      <td className="px-1 py-1.5 text-center">
        {!isChild ? (
          <div className="flex items-center gap-0.5">
            <div className="flex flex-col">
              <button
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="p-0 h-3.5 w-3.5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                title="Move up"
              >
                <ArrowUp className="w-3 h-3 text-muted-foreground" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="p-0 h-3.5 w-3.5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                title="Move down"
              >
                <ArrowDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            {hasChildren && onToggleExpand && (
              <button
                onClick={() => onToggleExpand(item.id)}
                className="p-0.5 rounded hover:bg-muted"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-0.5 ml-3">
            <div className="flex flex-col">
              <button
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="p-0 h-3.5 w-3.5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                title="Move up"
              >
                <ArrowUp className="w-3 h-3 text-muted-foreground" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="p-0 h-3.5 w-3.5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-20"
                title="Move down"
              >
                <ArrowDown className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <span className="block w-3 h-px bg-border" />
          </div>
        )}
      </td>

      {/* Description */}
      <td className={cn('py-1.5 pr-2', isChild ? 'pl-8' : 'pl-1')}>
        <Input
          ref={descRef}
          value={item.description}
          onChange={(e) => onUpdate(item.id, { description: e.target.value })}
          className={cn(
            'h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input',
            !isChild && 'font-medium'
          )}
          placeholder={isChild ? 'Sub-item description' : 'Group name'}
        />
      </td>

      {/* Qty */}
      <td className="py-1.5 px-1">
        {isReadOnly ? (
          <span className="block text-right text-sm font-mono text-muted-foreground px-2">—</span>
        ) : (
          <FormattedNumberInput
            value={item.quantity || ''}
            onChange={(val) => handleNumberChange('quantity', val)}
          />
        )}
      </td>

      {/* Cost */}
      <td className="py-1.5 px-1">
        {isReadOnly ? (
          <span className="block text-right text-sm font-mono text-muted-foreground px-2">
            ${displayCost.toFixed(2)}
          </span>
        ) : (
          <FormattedNumberInput
            value={item.cost_price || ''}
            onChange={(val) => handleNumberChange('cost_price', val)}
            highlight={highlights.has('cost_price')}
          />
        )}
      </td>

      {/* Margin % */}
      <td className="py-1.5 px-1">
        {isReadOnly ? (
          <span className="block text-right text-sm font-mono text-muted-foreground px-2">
            {displayMargin.toFixed(1)}%
          </span>
        ) : (
          <FormattedNumberInput
            value={item.margin_percentage || ''}
            onChange={(val) => handleNumberChange('margin_percentage', val)}
            highlight={highlights.has('margin_percentage')}
          />
        )}
      </td>

      {/* Sell */}
      <td className="py-1.5 px-1">
        {isReadOnly ? (
          <span className="block text-right text-sm font-mono text-muted-foreground px-2">
            ${displaySell.toFixed(2)}
          </span>
        ) : (
          <FormattedNumberInput
            value={item.sell_price || ''}
            onChange={(val) => handleNumberChange('sell_price', val)}
            highlight={highlights.has('sell_price')}
          />
        )}
      </td>

      {/* Hours */}
      <td className="py-1.5 px-1">
        {isReadOnly ? (
          <span className="block text-right text-sm font-mono text-muted-foreground px-2">
            {displayHours > 0 ? displayHours.toFixed(1) : '—'}
          </span>
        ) : (
          <FormattedNumberInput
            value={item.estimated_hours || ''}
            onChange={(val) => handleNumberChange('estimated_hours', val)}
          />
        )}
      </td>

      {/* Total */}
      <td className="py-1.5 px-2 text-right font-mono text-sm font-medium">
        ${displayTotal.toFixed(2)}
      </td>

      {/* Actions — dropdown menu */}
      <td className="py-1.5 px-1 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
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
            <DropdownMenuItem
              onClick={() => onUpdate(item.id, { is_optional: !item.is_optional })}
            >
              {item.is_optional ? (
                <Eye className="w-4 h-4 mr-2" />
              ) : (
                <EyeOff className="w-4 h-4 mr-2" />
              )}
              {item.is_optional ? 'Mark as included' : 'Mark as optional'}
            </DropdownMenuItem>
            {!isChild && hasChildren && onUngroup && (
              <DropdownMenuItem onClick={onUngroup}>
                <Ungroup className="w-4 h-4 mr-2" />
                Ungroup children
              </DropdownMenuItem>
            )}
            {isChild && onPromote && (
              <DropdownMenuItem onClick={onPromote}>
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Promote to standalone
              </DropdownMenuItem>
            )}
            {!isChild && !hasChildren && onCreateGroup && (
              <DropdownMenuItem onClick={() => onCreateGroup(item.id)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Create group
              </DropdownMenuItem>
            )}
            {!isChild &&
              !hasChildren &&
              onGroupInto &&
              availableParents &&
              availableParents.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Move into group
                  </div>
                  {availableParents.map((parent) => (
                    <DropdownMenuItem
                      key={parent.id}
                      onClick={() => onGroupInto(item.id, parent.id)}
                    >
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
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
