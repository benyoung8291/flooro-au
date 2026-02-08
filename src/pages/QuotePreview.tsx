import { useParams, useNavigate } from 'react-router-dom';
import { useQuote } from '@/hooks/useQuotes';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function QuotePreview() {
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
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/quotes/${quote.id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-mono font-semibold">{quote.quote_number}</span>
          <span className="text-muted-foreground">— Preview</span>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-muted-foreground">Quote preview — full implementation coming in Phase 5.</p>
      </main>
    </div>
  );
}
