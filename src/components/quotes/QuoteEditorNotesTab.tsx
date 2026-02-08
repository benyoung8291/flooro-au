import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebouncedField } from '@/hooks/useDebouncedField';
import type { Quote, UpdateQuoteInput } from '@/hooks/useQuotes';

interface QuoteEditorNotesTabProps {
  quote: Quote;
  onUpdateQuote: (updates: UpdateQuoteInput) => void;
}

export function QuoteEditorNotesTab({ quote, onUpdateQuote }: QuoteEditorNotesTabProps) {
  const notesField = useDebouncedField(
    quote.notes,
    useCallback((v: string | null) => onUpdateQuote({ notes: v }), [onUpdateQuote])
  );
  const internalNotesField = useDebouncedField(
    quote.internal_notes,
    useCallback((v: string | null) => onUpdateQuote({ internal_notes: v }), [onUpdateQuote])
  );
  const termsField = useDebouncedField(
    quote.terms_and_conditions,
    useCallback((v: string | null) => onUpdateQuote({ terms_and_conditions: v }), [onUpdateQuote])
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <Label className="text-xs text-muted-foreground">GST Rate (%)</Label>
          <Input
            type="number"
            value={quote.tax_rate}
            onChange={(e) => onUpdateQuote({ tax_rate: parseFloat(e.target.value) || 0 })}
            className="h-9 text-sm font-mono"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Client Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notesField.value}
            onChange={(e) => notesField.onChange(e.target.value)}
            onBlur={notesField.flush}
            placeholder="Visible on the quote PDF..."
            className="text-sm min-h-[100px] resize-none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={internalNotesField.value}
            onChange={(e) => internalNotesField.onChange(e.target.value)}
            onBlur={internalNotesField.flush}
            placeholder="Private notes, not shown on the quote..."
            className="text-sm min-h-[100px] resize-none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={termsField.value}
            onChange={(e) => termsField.onChange(e.target.value)}
            onBlur={termsField.flush}
            placeholder="Terms and conditions for this quote..."
            className="text-sm min-h-[100px] resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
}
