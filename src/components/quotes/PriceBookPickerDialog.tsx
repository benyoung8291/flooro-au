import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Check } from 'lucide-react';
import {
  usePriceBook,
  CATEGORY_LABELS,
  PRICING_TYPE_LABELS,
  type PriceBookItem,
} from '@/hooks/usePriceBook';
import { calculateMarginFromSell } from '@/hooks/useQuoteLineItems';

interface PriceBookPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: {
    description: string;
    cost_price: number;
    sell_price: number;
    margin_percentage: number;
    price_book_item_id: string;
    is_from_price_book: boolean;
    metadata: Record<string, unknown>;
  }) => void;
  /** If provided, adds as sub-item to this parent */
  parentId?: string | null;
}

export function PriceBookPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: PriceBookPickerDialogProps) {
  const { data: items = [], isLoading } = usePriceBook();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, PriceBookItem[]>();
    for (const item of filtered) {
      const cat = item.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handleSelect = (item: PriceBookItem) => {
    const margin = calculateMarginFromSell(item.cost_rate, item.sell_rate);
    onSelect({
      description: item.name,
      cost_price: item.cost_rate,
      sell_price: item.sell_rate,
      margin_percentage: Math.round(margin * 100) / 100,
      price_book_item_id: item.id,
      is_from_price_book: true,
      metadata: {
        pricing_type: item.pricing_type,
        category: item.category,
        source_description: item.description,
      },
    });
    setSelectedIds((prev) => new Set([...prev, item.id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Add from Price Book</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="pl-9 h-9"
            autoFocus
          />
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No items found
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {grouped.map(([category, catItems]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
                  </h4>
                  <div className="space-y-1">
                    {catItems.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-md border border-border hover:bg-muted/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {PRICING_TYPE_LABELS[item.pricing_type] || item.pricing_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                Cost ${item.cost_rate.toFixed(2)} → Sell ${item.sell_rate.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={isSelected ? 'secondary' : 'outline'}
                            className="gap-1 ml-3 shrink-0"
                            onClick={() => handleSelect(item)}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Added
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Add
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
