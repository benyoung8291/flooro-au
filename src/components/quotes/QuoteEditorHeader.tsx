import { useCallback } from 'react';
import { useDebouncedField } from '@/hooks/useDebouncedField';
import type { UpdateQuoteInput } from '@/hooks/useQuotes';

interface QuoteEditorHeaderProps {
  quote: {
    title: string | null;
    client_name: string | null;
    client_email: string | null;
    client_address: string | null;
  };
  onUpdate: (updates: UpdateQuoteInput) => void;
}

export function QuoteEditorHeader({ quote, onUpdate }: QuoteEditorHeaderProps) {
  const titleField = useDebouncedField(
    quote.title,
    useCallback((v: string | null) => onUpdate({ title: v }), [onUpdate])
  );

  const summaryParts = [
    quote.client_name,
    quote.client_email,
    quote.client_address,
  ].filter(Boolean);

  return (
    <div className="space-y-1">
      <input
        value={titleField.value}
        onChange={(e) => titleField.onChange(e.target.value)}
        onBlur={titleField.flush}
        placeholder="Untitled Quote"
        className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 focus:placeholder:text-muted-foreground/60"
      />
      {summaryParts.length > 0 && (
        <p className="text-sm text-muted-foreground truncate">
          {summaryParts.join(' · ')}
        </p>
      )}
    </div>
  );
}
