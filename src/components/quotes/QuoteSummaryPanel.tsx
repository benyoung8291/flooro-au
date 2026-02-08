import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Settings2,
} from 'lucide-react';
import type { Quote, QuoteStatus, UpdateQuoteInput } from '@/hooks/useQuotes';
import type { LineItem } from '@/hooks/useQuoteLineItems';

interface QuoteSummaryPanelProps {
  quote: Quote;
  lineItems: LineItem[];
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onUpdateQuote: (updates: UpdateQuoteInput) => void;
  onStatusChange: (status: QuoteStatus) => void;
  onNavigatePreview: () => void;
}

function computeTotals(items: LineItem[]) {
  let totalCost = 0;
  let totalSell = 0;
  let totalHours = 0;

  for (const parent of items) {
    if (parent.is_optional) continue;
    if (parent.subItems.length > 0) {
      for (const child of parent.subItems) {
        if (child.is_optional) continue;
        totalCost += (child.quantity || 0) * (child.cost_price || 0);
        totalSell += (child.quantity || 0) * (child.sell_price || 0);
        totalHours += child.estimated_hours || 0;
      }
    } else {
      totalCost += (parent.quantity || 0) * (parent.cost_price || 0);
      totalSell += (parent.quantity || 0) * (parent.sell_price || 0);
      totalHours += parent.estimated_hours || 0;
    }
  }

  const margin = totalCost > 0 ? ((totalSell - totalCost) / totalCost) * 100 : 0;
  return { totalCost, totalSell, margin, totalHours };
}

export function QuoteSummaryPanel({
  quote,
  lineItems,
  isSaving,
  hasUnsavedChanges,
  onSave,
  onUpdateQuote,
  onStatusChange,
  onNavigatePreview,
}: QuoteSummaryPanelProps) {
  const { totalCost, totalSell, margin, totalHours } = useMemo(
    () => computeTotals(lineItems),
    [lineItems]
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const taxRate = quote.tax_rate || 10;
  const taxAmount = totalSell * (taxRate / 100);
  const grandTotal = totalSell + taxAmount;

  const statusActions = useMemo(() => {
    const actions: { label: string; status: QuoteStatus; icon: React.ElementType; className: string }[] = [];
    if (quote.status === 'draft') {
      actions.push({ label: 'Mark Sent', status: 'sent', icon: Send, className: '' });
    }
    if (quote.status === 'draft' || quote.status === 'sent') {
      actions.push({ label: 'Accepted', status: 'accepted', icon: CheckCircle2, className: 'text-green-600' });
    }
    if (quote.status === 'sent') {
      actions.push({ label: 'Declined', status: 'declined', icon: XCircle, className: 'text-destructive' });
    }
    return actions;
  }, [quote.status]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm shadow-[0_-4px_20px_-4px_hsl(var(--foreground)/0.08)] print:hidden">
      <div className="px-4 lg:px-6">
        {/* Main summary row */}
        <div className="flex items-center gap-4 h-14 overflow-x-auto">
          {/* Totals */}
          <div className="flex items-center gap-4 sm:gap-6 text-sm shrink-0">
            <div>
              <span className="text-muted-foreground text-xs block leading-none mb-0.5">Subtotal</span>
              <span className="font-mono font-medium">${totalSell.toFixed(2)}</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-muted-foreground text-xs block leading-none mb-0.5">Margin</span>
              <span className="font-mono">{margin.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block leading-none mb-0.5">
                GST ({taxRate}%)
              </span>
              <span className="font-mono">${taxAmount.toFixed(2)}</span>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <span className="text-muted-foreground text-xs block leading-none mb-0.5">Total</span>
              <span className="font-mono font-bold text-base">${grandTotal.toFixed(2)}</span>
            </div>
            {totalHours > 0 && (
              <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {totalHours.toFixed(1)}h
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Details toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 hidden sm:flex"
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Details
            </Button>

            {/* Status dropdown */}
            {statusActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    Status
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {statusActions.map(({ label, status, icon: Icon, className }) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onStatusChange(status)}
                      className={className}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button variant="outline" size="sm" className="gap-1.5" onClick={onNavigatePreview}>
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
          </div>
        </div>

        {/* Expandable details panel */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleContent>
            <div className="pb-4 pt-2 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Valid Until</Label>
                <Input
                  type="date"
                  value={quote.valid_until || ''}
                  onChange={(e) => onUpdateQuote({ valid_until: e.target.value || null })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  GST Rate (%)
                </Label>
                <Input
                  type="number"
                  value={quote.tax_rate}
                  onChange={(e) => onUpdateQuote({ tax_rate: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label className="text-xs text-muted-foreground">Client Notes</Label>
                <Textarea
                  value={quote.notes || ''}
                  onChange={(e) => onUpdateQuote({ notes: e.target.value || null })}
                  placeholder="Visible on quote..."
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label className="text-xs text-muted-foreground">Internal Notes</Label>
                <Textarea
                  value={quote.internal_notes || ''}
                  onChange={(e) => onUpdateQuote({ internal_notes: e.target.value || null })}
                  placeholder="Private notes..."
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Terms & Conditions</Label>
                <Textarea
                  value={quote.terms_and_conditions || ''}
                  onChange={(e) => onUpdateQuote({ terms_and_conditions: e.target.value || null })}
                  placeholder="Terms and conditions..."
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
