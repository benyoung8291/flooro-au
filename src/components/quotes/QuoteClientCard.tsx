import { Label } from '@/components/ui/label';
import { RichTextEditor } from './RichTextEditor';
import type { UpdateQuoteInput } from '@/hooks/useQuotes';

interface QuoteClientCardProps {
  description: string | null;
  onUpdate: (updates: UpdateQuoteInput) => void;
}

export function QuoteClientCard({
  description,
  onUpdate,
}: QuoteClientCardProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Scope / Description</Label>
      <div className="bg-white dark:bg-card rounded-lg border border-border/40 p-4">
        <RichTextEditor
          value={description}
          onChange={(html) => onUpdate({ description: html })}
          placeholder="Add a scope or description..."
        />
      </div>
    </div>
  );
}
