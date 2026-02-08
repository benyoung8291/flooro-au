import { useParams, useNavigate } from 'react-router-dom';
import { useQuote } from '@/hooks/useQuotes';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function QuoteEditor() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useQuote(quoteId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Quote not found</p>
        <Button onClick={() => navigate('/quotes')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotes
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-mono font-semibold">{quote.quote_number}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground truncate">{quote.title || 'Untitled Quote'}</span>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Quote editor — full implementation coming in Phase 3.</p>
      </main>
    </div>
  );
}
