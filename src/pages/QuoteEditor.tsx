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
import { ArrowLeft, Loader2, Save, FileText } from 'lucide-react';
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
      // handled in hook
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
      } else {
        const newId = addLineItem(item.description);
        if (newId) {
          updateLineItem(newId, {
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            margin_percentage: item.margin_percentage,
            price_book_item_id: item.price_book_item_id,
            is_from_price_book: item.is_from_price_book,
            line_total: item.sell_price,
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
    <div className="min-h-screen bg-background pb-20">
      {/* ── Minimal sticky header ─────────────────────────── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/quotes')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="font-mono font-semibold text-sm">{quote.quote_number}</span>
            <QuoteStatusBadge status={quote.status} />
            {hasUnsavedChanges && (
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" title="Unsaved changes" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => navigate(`/quotes/${quoteId}/preview`)}
              title="Preview PDF"
            >
              <FileText className="w-4 h-4" />
            </Button>
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
        </div>
      </header>

      {/* ── Content — single column ─────────────────────── */}
      <main className="px-4 lg:px-6 py-6 space-y-6 max-w-5xl mx-auto">
        {/* Title + Client (collapsible) */}
        <QuoteClientCard
          clientName={quote.client_name}
          clientEmail={quote.client_email}
          clientPhone={quote.client_phone}
          clientAddress={quote.client_address}
          title={quote.title}
          description={quote.description}
          onUpdate={handleUpdateQuote}
        />

        {/* Line items — full width */}
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
      </main>

      {/* ── Bottom summary bar ──────────────────────────── */}
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

      <PriceBookPickerDialog
        open={priceBookOpen}
        onOpenChange={setPriceBookOpen}
        parentId={priceBookParentId}
        onSelect={handlePriceBookSelect}
      />
    </div>
  );
}
