import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { QuoteStatusBadge } from './QuoteStatusBadge';
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

  const taxRate = quote.tax_rate || 10;
  const taxAmount = totalSell * (taxRate / 100);
  const grandTotal = totalSell + taxAmount;

  return (
    <div className="space-y-4">
      {/* Totals */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Quote Summary</CardTitle>
            <QuoteStatusBadge status={quote.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Total Cost</span>
              <span className="font-mono">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal (Sell)</span>
              <span className="font-mono font-medium">${totalSell.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Margin</span>
              <span className="font-mono">{margin.toFixed(1)}%</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">GST</span>
                <Input
                  type="number"
                  value={quote.tax_rate}
                  onChange={(e) =>
                    onUpdateQuote({ tax_rate: parseFloat(e.target.value) || 0 })
                  }
                  className="h-6 w-14 text-xs text-right font-mono border-transparent bg-transparent hover:border-input focus:border-input"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <span className="font-mono text-sm">${taxAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="font-mono">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {totalHours > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{totalHours.toFixed(1)} estimated hours</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Valid Until */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Valid Until</Label>
            <Input
              type="date"
              value={quote.valid_until || ''}
              onChange={(e) => onUpdateQuote({ valid_until: e.target.value || null })}
              className="h-8 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Client Notes</Label>
            <Textarea
              value={quote.notes || ''}
              onChange={(e) => onUpdateQuote({ notes: e.target.value || null })}
              placeholder="Notes visible on the quote..."
              className="text-sm min-h-[60px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Internal Notes</Label>
            <Textarea
              value={quote.internal_notes || ''}
              onChange={(e) => onUpdateQuote({ internal_notes: e.target.value || null })}
              placeholder="Private notes (not on PDF)..."
              className="text-sm min-h-[60px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Terms */}
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Terms & Conditions</Label>
            <Textarea
              value={quote.terms_and_conditions || ''}
              onChange={(e) =>
                onUpdateQuote({ terms_and_conditions: e.target.value || null })
              }
              placeholder="Terms and conditions..."
              className="text-sm min-h-[80px] resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="w-full gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
        </Button>

        <Button variant="outline" className="w-full gap-2" onClick={onNavigatePreview}>
          <FileText className="w-4 h-4" />
          Preview PDF
        </Button>

        <Separator />

        <div className="grid grid-cols-2 gap-2">
          {quote.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onStatusChange('sent')}
            >
              <Send className="w-3.5 h-3.5" />
              Mark Sent
            </Button>
          )}
          {(quote.status === 'draft' || quote.status === 'sent') && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-success border-success/30 hover:bg-success/10"
              onClick={() => onStatusChange('accepted')}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Accepted
            </Button>
          )}
          {(quote.status === 'sent') && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => onStatusChange('declined')}
            >
              <XCircle className="w-3.5 h-3.5" />
              Declined
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
