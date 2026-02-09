import { Loader2, Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuote } from '@/hooks/useQuotes';
import { useQuoteLineItems } from '@/hooks/useQuoteLineItems';
import { useOrganizationBranding } from '@/hooks/useOrganizationBranding';
import { useQuoteOwnerProfile } from '@/hooks/useQuoteOwnerProfile';
import { useQuotePdfSettings } from '@/hooks/useQuotePdfSettings';
import { Button } from '@/components/ui/button';
import { PreviewToolbar } from './PreviewToolbar';
import { QuotePdfDocument } from './QuotePdfDocument';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string | undefined;
}

const ZOOM_LEVELS = [0.4, 0.5, 0.6, 0.7, 0.8] as const;
const DEFAULT_ZOOM_INDEX = 1;

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

  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const zoom = ZOOM_LEVELS[zoomIndex];

  const isLoading = quoteLoading || itemsLoading;

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  // Render via portal to document.body so print CSS can properly hide
  // everything else and show only the quote document
  return createPortal(
    <>
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm pdf-sidebar-backdrop"
        onClick={handleClose}
      />

      {/* Sidebar panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[620px] md:w-[680px] bg-background border-l border-border shadow-2xl pdf-sidebar-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-tight">PDF Preview</h2>
            {quote && (
              <span className="text-xs text-muted-foreground font-mono">{quote.quote_number}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 mr-2 border border-border rounded-md">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={zoomIndex === 0}
                onClick={() => setZoomIndex(i => Math.max(0, i - 1))}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[11px] font-mono text-muted-foreground w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                onClick={() => setZoomIndex(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              variant="default"
              className="gap-1.5 h-8"
              onClick={() => window.print()}
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2 border-b border-border bg-muted/30 shrink-0">
          <PreviewToolbar settings={settings} onUpdate={update} />
        </div>

        {/* Document preview area */}
        <div className="flex-1 overflow-auto bg-muted/50 pdf-sidebar-scroll">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !quote ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-muted-foreground text-sm">Quote not found</p>
            </div>
          ) : (
            <div className="flex justify-center py-6 px-4">
              <div
                className="pdf-paper-wrapper"
                style={{ transform: `scale(${zoom})` }}
              >
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
      </div>
    </>,
    document.body,
  );
}
