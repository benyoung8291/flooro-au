import { useParams, useNavigate } from 'react-router-dom';
import { useQuote } from '@/hooks/useQuotes';
import { useQuoteLineItems } from '@/hooks/useQuoteLineItems';
import { useOrganizationBranding } from '@/hooks/useOrganizationBranding';
import { useQuotePdfSettings } from '@/hooks/useQuotePdfSettings';
import { useQuoteOwnerProfile } from '@/hooks/useQuoteOwnerProfile';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';
import { PreviewToolbar } from '@/components/quotes/preview/PreviewToolbar';
import { PreviewItemsTable } from '@/components/quotes/preview/PreviewItemsTable';
import { OptionalGroupSections } from '@/components/quotes/preview/OptionalGroupSections';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function QuotePreview() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
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

  const requiredItems = lineItems.filter(item => !item.is_optional);
  const optionalItems = lineItems.filter(item => item.is_optional);
  const termsText = quote.terms_and_conditions || org?.terms_and_conditions;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ── Screen Header (hidden when printing) ─────────── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/quotes/${quote.id}`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-mono font-semibold text-sm">
            {quote.quote_number}
          </span>
          <QuoteStatusBadge status={quote.status} />

          <div className="ml-auto flex items-center gap-2">
            <PreviewToolbar settings={settings} onUpdate={update} />
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print / PDF
            </Button>
          </div>
        </div>
      </header>

      {/* ── Print-optimized Letterhead Document ──────────── */}
      <main className="quote-print-document">

        {/* ── Letterhead Header ──────────────────────────── */}
        <div className="letterhead-header">
          <div className="letterhead-brand">
            {org?.logo_url && (
              <img src={org.logo_url} alt="Logo" className="letterhead-logo" />
            )}
            <div className="letterhead-info">
              <div className="letterhead-company-name">{org?.name || 'Your Company'}</div>
              {org?.abn && <div className="letterhead-abn">ABN: {org.abn}</div>}
            </div>
          </div>
          <div className="letterhead-contact">
            {org?.address && <span>{org.address}</span>}
            {org?.phone && <span>Ph: {org.phone}</span>}
            {org?.email && <span>{org.email}</span>}
            {org?.website && <span>{org.website}</span>}
          </div>
        </div>

        {/* ── Quote Meta Bar ─────────────────────────────── */}
        <div className="quote-meta-bar">
          <div className="quote-meta-left">
            <div className="quote-meta-label">QUOTE</div>
            <div className="quote-meta-number">{quote.quote_number}</div>
          </div>
          <div className="quote-meta-right">
            <div className="quote-meta-date">
              <span className="meta-label">Date</span>
              <span>{formatDate(quote.created_at)}</span>
            </div>
            {quote.valid_until && (
              <div className="quote-meta-date">
                <span className="meta-label">Valid Until</span>
                <span>{formatDate(quote.valid_until)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Contact Grid ───────────────────────────────── */}
        <div className="contact-grid">
          {quote.client_name && (
            <div className="contact-box">
              <h3>Prepared For</h3>
              <p className="contact-name">{quote.client_name}</p>
              {quote.client_address && <p>{quote.client_address}</p>}
              {quote.client_email && <p>{quote.client_email}</p>}
              {quote.client_phone && <p>Ph: {quote.client_phone}</p>}
            </div>
          )}
          {owner && (
            <div className="contact-box">
              <h3>Your Contact</h3>
              <p className="contact-name">{owner.full_name || 'Team Member'}</p>
              {owner.email && <p>{owner.email}</p>}
              {owner.phone && <p>Ph: {owner.phone}</p>}
            </div>
          )}
        </div>

        {/* ── Letter Body (Scope/Description) ────────────── */}
        {(quote.title || quote.description) && (
          <div className="letter-body">
            {quote.title && <div className="letter-subject">Re: {quote.title}</div>}
            {quote.client_name && (
              <p className="letter-greeting">Dear {quote.client_name},</p>
            )}
            {quote.description && (
              <div
                className="letter-content rich-text-content"
                dangerouslySetInnerHTML={{ __html: quote.description }}
              />
            )}
          </div>
        )}

        {/* ── Required Items ─────────────────────────────── */}
        {requiredItems.length > 0 && (
          <>
            <h2 className="section-heading">Quoted Items</h2>
            <PreviewItemsTable
              items={requiredItems}
              settings={settings}
              showQtyColumn={showQtyColumn}
              showUnitPriceColumn={showUnitPriceColumn}
              showTotalColumn={showTotalColumn}
            />
          </>
        )}

        {/* ── Optional Items ─────────────────────────────── */}
        <OptionalGroupSections
          optionalItems={optionalItems}
          baseSubtotal={quote.subtotal}
          taxRate={quote.tax_rate}
          settings={settings}
          showQtyColumn={showQtyColumn}
          showUnitPriceColumn={showUnitPriceColumn}
          showTotalColumn={showTotalColumn}
        />

        {/* ── Totals ─────────────────────────────────────── */}
        <div className="totals-box">
          <div className="totals-row">
            <span>Subtotal</span>
            <span className="font-mono">{formatCurrency(quote.subtotal)}</span>
          </div>
          {quote.tax_rate > 0 && (
            <div className="totals-row">
              <span>GST ({quote.tax_rate}%)</span>
              <span className="font-mono">{formatCurrency(quote.tax_amount)}</span>
            </div>
          )}
          <div className="totals-row grand-total">
            <span>Total (inc. GST)</span>
            <span className="font-mono">{formatCurrency(quote.total_amount)}</span>
          </div>
        </div>

        {/* ── Notes ──────────────────────────────────────── */}
        {quote.notes && (
          <div className="notes-box">
            <h3>Notes</h3>
            <p>{quote.notes}</p>
          </div>
        )}

        {/* ── Terms ──────────────────────────────────────── */}
        {termsText && (
          <div className="terms-box">
            <h3>Terms & Conditions</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{termsText}</p>
          </div>
        )}

        {/* ── Signature ──────────────────────────────────── */}
        <div className="signature-grid">
          <div className="signature-box">
            <div className="signature-line" />
            <span>Client Signature / Date</span>
          </div>
          <div className="signature-box">
            <div className="signature-line" />
            <span>Company Representative / Date</span>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="document-footer">
          <span>{org?.name || 'Flooro'}</span>
          {org?.abn && <span>ABN: {org.abn}</span>}
          {org?.phone && <span>Ph: {org.phone}</span>}
          {org?.email && <span>{org.email}</span>}
        </div>
      </main>
    </div>
  );
}
