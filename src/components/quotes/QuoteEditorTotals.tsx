import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { LineItem } from '@/hooks/useQuoteLineItems';

interface QuoteEditorTotalsProps {
  lineItems: LineItem[];
  taxRate: number;
  onUpdateTaxRate: (rate: number) => void;
}

function computeTotals(items: LineItem[]) {
  let totalCost = 0;
  let totalSell = 0;

  for (const parent of items) {
    if (parent.is_optional) continue;
    if (parent.subItems.length > 0) {
      for (const child of parent.subItems) {
        if (child.is_optional) continue;
        totalCost += (child.quantity || 0) * (child.cost_price || 0);
        totalSell += (child.quantity || 0) * (child.sell_price || 0);
      }
    } else {
      totalCost += (parent.quantity || 0) * (parent.cost_price || 0);
      totalSell += (parent.quantity || 0) * (parent.sell_price || 0);
    }
  }

  const margin = totalCost > 0 ? ((totalSell - totalCost) / totalCost) * 100 : 0;
  return { totalCost, totalSell, margin };
}

export function QuoteEditorTotals({ lineItems, taxRate, onUpdateTaxRate }: QuoteEditorTotalsProps) {
  const { totalCost, totalSell, margin } = useMemo(() => computeTotals(lineItems), [lineItems]);
  const rate = taxRate || 10;
  const taxAmount = totalSell * (rate / 100);
  const grandTotal = totalSell + taxAmount;

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-xs space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-mono font-medium">${totalSell.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Margin</span>
          <span className="font-mono">{margin.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">GST</span>
            <Input
              type="number"
              value={rate}
              onChange={(e) => onUpdateTaxRate(parseFloat(e.target.value) || 0)}
              className="h-6 w-14 text-xs font-mono px-1.5 text-center"
            />
            <span className="text-muted-foreground text-xs">%</span>
          </div>
          <span className="font-mono">${taxAmount.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total</span>
          <span className="font-mono font-bold text-lg">${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
