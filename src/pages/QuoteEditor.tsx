import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useUpdateQuote, type QuoteStatus, type UpdateQuoteInput } from '@/hooks/useQuotes';
import { useQuoteLineItems } from '@/hooks/useQuoteLineItems';
import { QuoteLineItemsTable } from '@/components/quotes/QuoteLineItemsTable';
import { QuoteClientCard } from '@/components/quotes/QuoteClientCard';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';
import { QuoteEditorTotals } from '@/components/quotes/QuoteEditorTotals';
import { QuoteEditorNotesTab } from '@/components/quotes/QuoteEditorNotesTab';
import { PriceBookPickerDialog } from '@/components/quotes/PriceBookPickerDialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Save,
  FileText,
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  ChevronDown,
  List,
  User,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

  const statusActions = useMemo(() => {
    if (!quote) return [];
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
  }, [quote?.status]);

  if (quoteLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">Quote not found</p>
        <Button onClick={() => navigate('/quotes')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quotes
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Quote header bar */}
      <div className="px-4 lg:px-6 py-4 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={() => navigate('/quotes')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono font-semibold text-sm">{quote.quote_number}</span>
                <QuoteStatusBadge status={quote.status} />
                {hasUnsavedChanges && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" title="Unsaved changes" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(new Date(quote.created_at), 'dd MMM yyyy')}</span>
                {quote.valid_until && (
                  <>
                    <span>·</span>
                    <span>Valid until {format(new Date(quote.valid_until), 'dd MMM yyyy')}</span>
                  </>
                )}
                {quote.client_name && (
                  <>
                    <span>·</span>
                    <span className="truncate">{quote.client_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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
                      onClick={() => handleStatusChange(status)}
                      className={className}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
      </div>

      {/* Tabbed content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
          <Tabs defaultValue="line-items" className="space-y-4">
            <TabsList>
              <TabsTrigger value="line-items" className="gap-1.5">
                <List className="w-3.5 h-3.5" />
                Line Items
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-1.5">
                <User className="w-3.5 h-3.5" />
                Details
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="line-items" className="space-y-6">
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

              {/* Inline totals */}
              <QuoteEditorTotals
                lineItems={lineItems}
                taxRate={quote.tax_rate}
                onUpdateTaxRate={(rate) => handleUpdateQuote({ tax_rate: rate })}
              />
            </TabsContent>

            <TabsContent value="details">
              <QuoteClientCard
                clientName={quote.client_name}
                clientEmail={quote.client_email}
                clientPhone={quote.client_phone}
                clientAddress={quote.client_address}
                title={quote.title}
                description={quote.description}
                onUpdate={handleUpdateQuote}
              />
            </TabsContent>

            <TabsContent value="notes">
              <QuoteEditorNotesTab
                quote={quote}
                onUpdateQuote={handleUpdateQuote}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PriceBookPickerDialog
        open={priceBookOpen}
        onOpenChange={setPriceBookOpen}
        parentId={priceBookParentId}
        onSelect={handlePriceBookSelect}
      />
    </div>
  );
}
