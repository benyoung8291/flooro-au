import { useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LineItem } from '@/hooks/useQuoteLineItems';

interface QuoteLineItemRowProps {
  item: LineItem;
  isChild?: boolean;
  isExpanded?: boolean;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onUpdatePricing: (id: string, field: 'cost' | 'sell' | 'margin', value: number) => void;
  onAddSubItem: (parentId: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleExpand?: (id: string) => void;
  childCount?: number;
}

export function QuoteLineItemRow({
  item,
  isChild = false,
  isExpanded = true,
  onUpdate,
  onUpdatePricing,
  onAddSubItem,
  onRemove,
  onDuplicate,
  onToggleExpand,
  childCount = 0,
}: QuoteLineItemRowProps) {
  const descRef = useRef<HTMLInputElement>(null);

  const handleNumberChange = useCallback(
    (field: string, raw: string) => {
      const val = parseFloat(raw) || 0;

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

  const parentTotal =
    !isChild && childCount > 0
      ? undefined // will be computed in table
      : item.line_total;

  return (
    <tr
      className={cn(
        'group border-b border-border/50 transition-colors hover:bg-muted/30',
        isChild && 'bg-muted/10',
        item.is_optional && 'opacity-60 italic',
        item._isNew && 'animate-slide-up'
      )}
    >
      {/* Drag handle + expand */}
      <td className="w-10 px-1 py-1.5 text-center">
        {!isChild ? (
          <div className="flex items-center gap-0.5">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 cursor-grab" />
            {childCount > 0 && onToggleExpand && (
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
          <span className="block w-3.5 h-px bg-border ml-4" />
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
      <td className="w-20 py-1.5 px-1">
        <Input
          type="number"
          step="0.01"
          value={item.quantity || ''}
          onChange={(e) => handleNumberChange('quantity', e.target.value)}
          className="h-8 text-sm text-right font-mono border-transparent bg-transparent hover:border-input focus:border-input"
        />
      </td>

      {/* Cost */}
      <td className="w-24 py-1.5 px-1">
        <Input
          type="number"
          step="0.01"
          value={item.cost_price || ''}
          onChange={(e) => handleNumberChange('cost_price', e.target.value)}
          className="h-8 text-sm text-right font-mono border-transparent bg-transparent hover:border-input focus:border-input"
        />
      </td>

      {/* Margin % */}
      <td className="w-20 py-1.5 px-1">
        <Input
          type="number"
          step="0.5"
          value={item.margin_percentage || ''}
          onChange={(e) => handleNumberChange('margin_percentage', e.target.value)}
          className="h-8 text-sm text-right font-mono border-transparent bg-transparent hover:border-input focus:border-input"
        />
      </td>

      {/* Sell */}
      <td className="w-24 py-1.5 px-1">
        <Input
          type="number"
          step="0.01"
          value={item.sell_price || ''}
          onChange={(e) => handleNumberChange('sell_price', e.target.value)}
          className="h-8 text-sm text-right font-mono border-transparent bg-transparent hover:border-input focus:border-input"
        />
      </td>

      {/* Total */}
      <td className="w-28 py-1.5 px-2 text-right font-mono text-sm font-medium">
        ${(parentTotal ?? 0).toFixed(2)}
      </td>

      {/* Actions */}
      <td className="w-28 py-1.5 px-1">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isChild && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAddSubItem(item.id)}
              title="Add sub-item"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() =>
              onUpdate(item.id, { is_optional: !item.is_optional })
            }
            title={item.is_optional ? 'Mark as included' : 'Mark as optional'}
          >
            {item.is_optional ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </Button>
          {!isChild && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDuplicate(item.id)}
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onRemove(item.id)}
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
