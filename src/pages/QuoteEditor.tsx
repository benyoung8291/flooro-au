import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useUpdateQuote, type QuoteStatus, type UpdateQuoteInput } from '@/hooks/useQuotes';
import { useQuoteLineItems } from '@/hooks/useQuoteLineItems';
import { QuoteLineItemsTable } from '@/components/quotes/QuoteLineItemsTable';
import { QuoteSummaryPanel } from '@/components/quotes/QuoteSummaryPanel';
import { QuoteClientCard } from '@/components/quotes/QuoteClientCard';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';
import { PriceBookPickerDialog } from '@/components/quotes/PriceBookPickerDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function QuoteEditor() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { data: quote, isLoading: quoteLoading } = useQuote(quoteId);
  const updateQuote = useUpdateQuote();

  const {
    lineItems,
    isLoading: itemsLoading,
    isSaving,
    hasUnsavedChanges,
    updateLineItem,
    updateLineItemPricing,
    addLineItem,
    addSubItem,
    removeLineItem,
    duplicateLineItem,
    toggleExpanded,
    reorderParent,
    reorderSubItem,
    ungroupParent,
    promoteSubItem,
    groupIntoParent,
    createGroupFromItem,
    saveLineItems,
  } = useQuoteLineItems(quoteId);

  const [priceBookOpen, setPriceBookOpen] = useState(false);
  const [priceBookParentId, setPriceBookParentId] = useState<string | null>(null);

  // Unsaved changes warning
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const handleUpdateQuote = useCallback(
    (updates: UpdateQuoteInput) => {
      if (!quoteId) return;
      updateQuote.mutate({ id: quoteId, updates });
    },
    [quoteId, updateQuote]
  );

  const handleStatusChange = useCallback(
    (status: QuoteStatus) => {
      if (!quoteId) return;
      const updates: UpdateQuoteInput = { status };
      if (status === 'sent') updates.sent_at = new Date().toISOString();
      if (status === 'accepted') updates.approved_at = new Date().toISOString();
      if (status === 'declined') updates.rejected_at = new Date().toISOString();
      updateQuote.mutate(
        { id: quoteId, updates },
        { onSuccess: () => toast.success(`Quote marked as ${status}`) }
      );
    },
    [quoteId, updateQuote]
  );

  const handleSave = useCallback(async () => {
    try {
      await saveLineItems();
    } catch {
      // Error toast handled in hook
    }
  }, [saveLineItems]);

  const handlePriceBookSelect = useCallback(
    (item: {
      description: string;
      cost_price: number;
      sell_price: number;
      margin_percentage: number;
      price_book_item_id: string;
      is_from_price_book: boolean;
      metadata: Record<string, unknown>;
    }) => {
      if (priceBookParentId) {
        addSubItem(priceBookParentId, item.description);
        // We need to update the sub-item after it's created
        // The addSubItem creates with defaults, so we update via the table
      } else {
        const newId = addLineItem(item.description);
        if (newId) {
          updateLineItem(newId, {
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            margin_percentage: item.margin_percentage,
            price_book_item_id: item.price_book_item_id,
            is_from_price_book: item.is_from_price_book,
            line_total: item.sell_price, // qty defaults to 1
            metadata: item.metadata,
          });
        }
      }
    },
    [priceBookParentId, addLineItem, addSubItem, updateLineItem]
  );

  if (quoteLoading || itemsLoading) {
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
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/quotes')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono font-semibold text-sm">{quote.quote_number}</span>
            <span className="text-muted-foreground hidden sm:inline">—</span>
            <span className="text-muted-foreground text-sm truncate hidden sm:inline">
              {quote.title || 'Untitled Quote'}
            </span>
            <QuoteStatusBadge status={quote.status} />
            {hasUnsavedChanges && (
              <span className="w-2 h-2 rounded-full bg-warning shrink-0" title="Unsaved changes" />
            )}
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="gap-1.5 shrink-0"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save
          </Button>
        </div>
      </header>

      {/* Body — two-column layout */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column — 70% */}
          <div className="flex-1 lg:max-w-[70%] space-y-4">
            <QuoteClientCard
              clientName={quote.client_name}
              clientEmail={quote.client_email}
              clientPhone={quote.client_phone}
              clientAddress={quote.client_address}
              title={quote.title}
              description={quote.description}
              onUpdate={handleUpdateQuote}
            />

            <QuoteLineItemsTable
              lineItems={lineItems}
              onUpdate={updateLineItem}
              onUpdatePricing={updateLineItemPricing}
              onAddLineItem={() => addLineItem()}
              onAddSubItem={addSubItem}
              onRemove={removeLineItem}
              onDuplicate={duplicateLineItem}
              onToggleExpand={toggleExpanded}
              onReorderParent={reorderParent}
              onReorderSubItem={reorderSubItem}
              onUngroupParent={ungroupParent}
              onPromoteSubItem={promoteSubItem}
              onGroupIntoParent={groupIntoParent}
              onCreateGroupFromItem={createGroupFromItem}
              onOpenPriceBook={() => {
                setPriceBookParentId(null);
                setPriceBookOpen(true);
              }}
            />
          </div>

          {/* Right column — 30% */}
          <aside className="lg:w-[30%] lg:min-w-[280px]">
            <div className="lg:sticky lg:top-20">
              <QuoteSummaryPanel
                quote={quote}
                lineItems={lineItems}
                isSaving={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
                onSave={handleSave}
                onUpdateQuote={handleUpdateQuote}
                onStatusChange={handleStatusChange}
                onNavigatePreview={() => navigate(`/quotes/${quoteId}/preview`)}
              />
            </div>
          </aside>
        </div>
      </main>

      {/* Price Book Picker */}
      <PriceBookPickerDialog
        open={priceBookOpen}
        onOpenChange={setPriceBookOpen}
        parentId={priceBookParentId}
        onSelect={handlePriceBookSelect}
      />
    </div>
  );
}
