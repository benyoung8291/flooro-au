import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatArea, formatLength } from '@/lib/reports/calculations';
import { DollarSign, Square, Ruler } from 'lucide-react';

interface CostSummaryCardProps {
  totalCost: number;
  totalNetArea: number;
  totalGrossArea: number;
  totalPerimeter: number;
}

export function CostSummaryCard({
  totalCost,
  totalNetArea,
  totalGrossArea,
  totalPerimeter,
}: CostSummaryCardProps) {
  return (
    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 opacity-80" />
          <span className="text-xs font-medium opacity-80">Total Estimate</span>
        </div>
        <div className="text-2xl font-bold font-mono mb-3">
          {formatCurrency(totalCost)}
        </div>
        
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-primary-foreground/20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Square className="w-3 h-3 opacity-60" />
            </div>
            <div className="text-xs opacity-70">Net Area</div>
            <div className="text-sm font-mono font-medium">{formatArea(totalNetArea)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Square className="w-3 h-3 opacity-60" />
            </div>
            <div className="text-xs opacity-70">Gross</div>
            <div className="text-sm font-mono font-medium">{formatArea(totalGrossArea)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Ruler className="w-3 h-3 opacity-60" />
            </div>
            <div className="text-xs opacity-70">Perimeter</div>
            <div className="text-sm font-mono font-medium">{formatLength(totalPerimeter)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
