import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotes, useDeleteQuote, useDuplicateQuote, useQuoteStats } from '@/hooks/useQuotes';
import type { QuoteStatus } from '@/hooks/useQuotes';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';
import { CreateQuoteDialog } from '@/components/quotes/CreateQuoteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  MoreHorizontal,
  FileEdit,
  Copy,
  Trash2,
  FileText,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
];

export default function QuotesList() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: quotes, isLoading } = useQuotes(
    statusFilter !== 'all' ? (statusFilter as QuoteStatus) : undefined
  );
  const deleteQuote = useDeleteQuote();
  const duplicateQuote = useDuplicateQuote();
  const stats = useQuoteStats();

  const filteredQuotes = (quotes || []).filter(q => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      q.quote_number.toLowerCase().includes(term) ||
      (q.client_name || '').toLowerCase().includes(term) ||
      (q.title || '').toLowerCase().includes(term) ||
      (q.client_address || '').toLowerCase().includes(term)
    );
  });

  const handleDelete = async () => {
    if (deleteId) {
      await deleteQuote.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (quoteId: string) => {
    const newQuote = await duplicateQuote.mutateAsync(quoteId);
    navigate(`/quotes/${newQuote.id}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">
      {/* Page title + New Quote button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Inline stat bar */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground overflow-x-auto">
        <span className="font-mono font-medium text-foreground">{stats.total}</span>
        <span>quotes</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="font-mono font-medium text-foreground">{formatCurrency(stats.totalValue)}</span>
        <span>total</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="font-mono font-medium text-green-600 dark:text-green-400">{stats.accepted}</span>
        <span>accepted</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="font-mono font-medium text-foreground">{stats.sent}</span>
        <span>pending</span>
      </div>

      {/* Filter bar: search + status chips */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            className="pl-10 h-10 rounded-full border-border bg-muted/30 focus:bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                statusFilter === f.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quote rows */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="py-20 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No quotes yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first quote to get started.
          </p>
          <Button onClick={() => setCreateOpen(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredQuotes.map(quote => (
            <div
              key={quote.id}
              className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => navigate(`/quotes/${quote.id}`)}
            >
              {/* Left: quote info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs text-foreground/60">
                    {quote.quote_number}
                  </span>
                  {quote.title && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-sm font-medium text-foreground truncate">
                        {quote.title}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <QuoteStatusBadge status={quote.status} />
                  {quote.client_name && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="truncate">{quote.client_name}</span>
                    </>
                  )}
                  <span className="text-muted-foreground/40">·</span>
                  <span>{format(new Date(quote.created_at), 'dd MMM yyyy')}</span>
                </div>
              </div>

              {/* Right: amount + menu */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(quote.total_amount)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}>
                      <FileEdit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}/preview`); }}>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(quote.id); }}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(quote.id); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateQuoteDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The quote and all its line items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
