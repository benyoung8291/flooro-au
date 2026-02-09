import { Loader2, Printer } from 'lucide-react';
import { useQuote } from '@/hooks/useQuotes';
import { useQuoteLineItems } from '@/hooks/useQuoteLineItems';
import { useOrganizationBranding } from '@/hooks/useOrganizationBranding';
import { useQuoteOwnerProfile } from '@/hooks/useQuoteOwnerProfile';
import { useQuotePdfSettings } from '@/hooks/useQuotePdfSettings';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PreviewToolbar } from './PreviewToolbar';
import { QuotePdfDocument } from './QuotePdfDocument';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string | undefined;
}

export function QuotePdfSidebar({ open, onOpenChange, quoteId }: Props) {
  const { data: quote, isLoading: quoteLoading } = useQuote(quoteId);
  const { lineItems, isLoading: itemsLoading } = useQuoteLineItems(quoteId);
  const { data: org } = useOrganizationBranding();
  const { data: owner } = useQuoteOwnerProfile(quote?.created_by);
  const {
    settings,
    update,
    showQtyColumn,
    showUnitPriceColumn,
    showTotalColumn,
  } = useQuotePdfSettings();

  const isLoading = quoteLoading || itemsLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[540px] w-full p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">PDF Preview</SheetTitle>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="w-3.5 h-3.5" />
              Download
            </Button>
          </div>
          <SheetDescription className="sr-only">
            Preview and download the quote as PDF
          </SheetDescription>
        </SheetHeader>

        {/* Inline toggles toolbar */}
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
          <PreviewToolbar settings={settings} onUpdate={update} />
        </div>

        {/* Scrollable document area */}
        <div className="flex-1 overflow-y-auto bg-muted/40 pdf-sidebar-scroll">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !quote ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground text-sm">Quote not found</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="pdf-paper-wrapper">
                <QuotePdfDocument
                  quote={quote}
                  lineItems={lineItems}
                  org={org ?? null}
                  owner={owner ?? null}
                  settings={settings}
                  showQtyColumn={showQtyColumn}
                  showUnitPriceColumn={showUnitPriceColumn}
                  showTotalColumn={showTotalColumn}
                />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
