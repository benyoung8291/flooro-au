import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useUpdateQuote, type QuoteStatus, type UpdateQuoteInput } from '@/hooks/useQuotes';
import { useQuoteLineItems } from '@/hooks/useQuoteLineItems';
import { useSyncQuoteFromProject, type OrphanedRoomInfo } from '@/hooks/useSyncQuoteFromProject';
import { OrphanedRoomsDialog, type OrphanedRoom } from '@/components/quotes/OrphanedRoomsDialog';
import { QuoteLineItemsTable } from '@/components/quotes/QuoteLineItemsTable';
import { QuoteClientCard } from '@/components/quotes/QuoteClientCard';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';
import { QuoteEditorTotals } from '@/components/quotes/QuoteEditorTotals';
import { QuoteEditorNotesTab } from '@/components/quotes/QuoteEditorNotesTab';
import { QuotePdfSidebar } from '@/components/quotes/preview/QuotePdfSidebar';
import { PriceBookPickerDialog } from '@/components/quotes/PriceBookPickerDialog';
import { QuoteEditorHeader } from '@/components/quotes/QuoteEditorHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  Save,
  Eye,
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  ChevronDown,
  List,
  StickyNote,
  Plus,
  BookOpen,
  RefreshCw,
  Ruler,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useOrganizationBranding } from '@/hooks/useOrganizationBranding';
import { useQuoteOwnerProfile } from '@/hooks/useQuoteOwnerProfile';
import { exportQuoteToExcel } from '@/lib/quotes/exportQuoteToExcel';

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
  const [pdfOpen, setPdfOpen] = useState(false);
  const [orphanedRooms, setOrphanedRooms] = useState<OrphanedRoom[]>([]);
  const [orphanDialogOpen, setOrphanDialogOpen] = useState(false);
  const { syncQuote, isSyncing, removeOrphanedRooms, isRemoving } = useSyncQuoteFromProject();
  const { data: orgBranding } = useOrganizationBranding();
  const { data: ownerProfile } = useQuoteOwnerProfile(quote?.created_by);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = useCallback(async () => {
    if (!quote) return;
    setIsExporting(true);
    try {
      await exportQuoteToExcel({
        quote,
        lineItems,
        org: orgBranding ?? null,
        owner: ownerProfile ?? null,
      });
      toast.success('Excel exported successfully');
    } catch (err) {
      console.error('Excel export failed:', err);
      toast.error('Failed to export Excel');
    } finally {
      setIsExporting(false);
    }
  }, [quote, lineItems, orgBranding, ownerProfile]);

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
            {/* View Takeoff navigation */}
            {quote.project_id && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 hidden sm:flex"
                onClick={() => navigate(`/projects/${quote.project_id}`)}
              >
                <Ruler className="w-3.5 h-3.5" />
                Takeoff
              </Button>
            )}

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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setPdfOpen(true)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview PDF</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={handleExportExcel}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export Excel</TooltipContent>
            </Tooltip>
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

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 space-y-4">
          {/* Always-visible title and client summary */}
          <QuoteEditorHeader quote={quote} onUpdate={handleUpdateQuote} />

          <Tabs defaultValue="line-items" className="space-y-4">
            <TabsList>
              <TabsTrigger value="line-items" className="gap-1.5">
                <List className="w-3.5 h-3.5" />
                Line Items
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                Details
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="line-items" className="space-y-4">
              {/* Toolbar above table */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => addLineItem()} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPriceBookParentId(null);
                    setPriceBookOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  From Price Book
                </Button>

                {/* Sync from Takeoff - only for project-linked quotes */}
                {quote.project_id && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={isSyncing || quote.status !== 'draft'}
                          onClick={async () => {
                            if (!quoteId) return;
                            const result = await syncQuote(quoteId);
                            if (result.orphanedRooms.length > 0) {
                              setOrphanedRooms(result.orphanedRooms.map(r => ({
                                parentId: r.parentId,
                                description: r.description,
                                childIds: r.childIds,
                              })));
                              setOrphanDialogOpen(true);
                            }
                          }}
                        >
                          {isSyncing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Sync from Takeoff
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {quote.status !== 'draft' && (
                      <TooltipContent>Only draft quotes can be synced</TooltipContent>
                    )}
                  </Tooltip>
                )}
              </div>

              {/* White table container */}
              <div className="bg-white dark:bg-card rounded-lg border border-border/40">
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

              {/* Totals outside the white box */}
              <QuoteEditorTotals
                lineItems={lineItems}
                taxRate={quote.tax_rate}
                onUpdateTaxRate={(rate) => handleUpdateQuote({ tax_rate: rate })}
              />
            </TabsContent>

            <TabsContent value="details">
              <QuoteClientCard
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

      <QuotePdfSidebar
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        quoteId={quoteId}
      />

      <OrphanedRoomsDialog
        open={orphanDialogOpen}
        onOpenChange={setOrphanDialogOpen}
        orphanedRooms={orphanedRooms}
        isRemoving={isRemoving}
        onRemoveSelected={async (parentIds) => {
          if (!quoteId) return;
          const selectedOrphans = orphanedRooms.filter(r => parentIds.includes(r.parentId));
          const allChildIds = selectedOrphans.flatMap(r => r.childIds);
          await removeOrphanedRooms(quoteId, parentIds, allChildIds);
          setOrphanDialogOpen(false);
          setOrphanedRooms([]);
        }}
      />
    </div>
  );
}
